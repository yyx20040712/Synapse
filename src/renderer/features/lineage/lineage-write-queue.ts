// b3: P7-H
/**
 * [F-LGRAPH-01②U1] lineage-write-queue —— 脉络编辑会话暂存机制（暂存+批量落库；
 * [B4 L1 / 设计稿 §2.2/§2.4/§2.5/§6.2] 重整：历史与 unfinalized 移出本件——
 * SessionSnapshot 退役，本件只持图态、queue、IO 与串行写链）。
 * （[②U1] 语义翻转：enqueue 即 flush 自动保存→编辑会话暂存——自 lineage.store 拆出；
 * 落库触发面自 [B4 L1] 起=1.5s idle-flush 与显式保存——mockup §2.2/A7 仲裁）。
 *
 * ── 会话态状态机（IO 轴——U 轴与历史驻 lineage.store/lineage-session-ops）──
 * （宪法前置；测试=lineage-session-store.test/lineage-store-write/lineage-store-reorder/write-queue.test）
 * - 态空间：saveStatus ∈ {clean, dirty, saving, error} × queue × inflight。
 * - 迁移：
 *   - clean/error+编辑单元→dirty（乐观应用+入队，**不发 IPC**——A7 单一写路径）
 *   - 链任务起步→saving/F≠0；drain 全部成功→clean（服务器行回填；**不清 undo/
 *     redo、不动 U**——idle-flush≠定稿，§2.5 #8）；出队即存恢复副本。
 *   - saving+系统型失败（非 CONFLICT）→error（**队首保留**+toast+重试——INV-04
 *     同型：失败不推进保存态；U/H/R 全不变，#9；[B5 设计稿 §6.1] 来源='save'——
 *     message 与 source 经 lineage-write-failure 的原子 patch 同批写入，成功同清）
 *   - saving+CONFLICT 拒绝型→**丢弃动作继续队列**（toast reason 透传+needsReload
 *     置位——#10：U 与 redo 不因丢弃自动清，历史保留）；丢弃后队列空→clean+链尾
 *     权威和解任务（§2.6 10a——原 `void load()` fire-and-forget 收口退役）；和解被丢
 *     （读到达时应用判据不成立、位保留）→链在 drain 新 Q 后按当前 epoch 有界续拉
 *     （[回炉 W-B3·R-B7] lineage-reconcile-tail——孤儿会话/续拉前新写失败/达上界停止）
 * - 串行写链（§2.2）：每会话一条——flush/history-unit/finalize 任务按入队序执行，
 *   链内序=普通写→（needsReload=1 时）和解→history/定稿清账；同会话 saving 期
 *   间编辑锁由宿主 beginUnit 读 flushing 拒绝（INV-94）。
 * - lazy 载荷（[T3-P8 R3]）：enqueue 只存 id+差异，执行时点 fullRowInput（最新行）
 *   合成——暂存窗内先行落地的乐观变更自然并入。
 *   [F-UIRES-03 C3] 改月语义轴（override year/month 形）随改月动作退役删除（INV-107——override 生产者收窄=slot 透写）。
 * - [回炉 W-D2a·T-B05] 单条动作的落库执行与实体回显（applyAction 七 kind）外移=
 *   lineage-write-executor（本件行数超预算上限；动作体与注释逐字迁驻该件）；本件只留
 *   融合、drain、chain/flush。
 */
import { ApiClientError } from '../../api/client'
import { showToast } from '../../shared/ui/toast-store'
import { MAIN_GRAPH_ID } from '@shared/models/lineage'
import type { FloatingNote, LineageEdge, LineageNode } from '@shared/models/lineage'
// [F-VISFB-65] writeAction 类型单源迁 shared/recovery/schemas；本件 re-export（WriteAction
// 判别联合=恢复副本载荷 schema 元素型）；兼容既有消费面
import type { WriteAction } from '@shared/recovery/schemas'
import { markRecoveryClean, notifyRecoveryEditUnit, notifyRecoverySaveNow } from './recoveryScheduler'
import { useLineageViewStore } from './lineage-view.store'
// [F-VISFB-65 单元二] GHOST_FOLDER 降级询问（§7）：三联判据命中→flush 挂起
// 待决（conflictResolution 模块单例——ConflictDialog 决出）
import { requestGhostFolderDecision } from './conflictResolution'
import type { LineageInflight, LineageSaveStatus } from './lineage-session-model'
import {
  applyOptimistic,
  normalizeEdgeInput,
  withLocalId,
  type LazyNodePatch,
  type LineageNodePatchBody
} from './lineage-write-actions'
import { conflictPolicyOf, ghostFolderPatch, type ReconcileOutcome } from './lineage-write-conflicts'
import { reconcileAtTail } from './lineage-reconcile-tail'
import type { EntityEcho } from './lineage-history-commands'
import { writeFailure, writeFailureCleared, type LineageWriteErrorSource } from './lineage-write-failure'
import { createWriteExecutor } from './lineage-write-executor'

/** [F-VISFB-65] 写动作（排队单元）=shared 单源 re-export（判别联合迁移锚——
 *  恢复副本载荷与暂存队列同型；[F-VISFB-66 裁定 3] 旧换父标记随三入口退役
 *  删除；[回炉 R9] silentSave=画线动作面；[F-ALIGN-01] 新建节点形态随旧节点
 *  写通道退役删除——INV-NEW-1） */
export type { LineageSaveStatus, LazyNodePatch, LineageNodePatchBody, WriteAction }

/** 写队列宿主状态面（图态+queue+IO；历史与 U 驻宿主但不经本件读写） */
export interface WriteQueueHost {
  nodes: LineageNode[]
  edges: LineageEdge[]
  floatingNotes: FloatingNote[]
  folderId: string
  lineTypeNames: string[]
  saveStatus: LineageSaveStatus
  lastWriteError: string | null
  /** [B5 §6.1] 最近一次失败的来源（与 lastWriteError 同批写入或清除——本件恒 'save'／null） */
  lastWriteErrorSource: LineageWriteErrorSource
  queue: WriteAction[]
  /** 在途写在场（F≠0 ⇔ inflight≠null）——同会话 saving 编辑锁判据 */
  flushing: boolean
  /** [F-VISFB-65 回炉 W7] CONFLICT 面收尾重拉持久标志（Host 面可选——受锁
   *  测试夹具零改；lineage.store 状态面必填） */
  /** [INV-175] 「图态与库态偏离待和解」位（和解任务成功应用=唯一清位点） */
  needsReload?: boolean
  inflight: LineageInflight | null
}

export interface WriteQueueDeps {
  set(
    patch:
      | Partial<WriteQueueHost>
      | ((s: WriteQueueHost) => Partial<WriteQueueHost>)
  ): void
  get(): WriteQueueHost
  /** 写回显锚定（历史项时间戳/色行名再锚——宿主=lineage.store；缺省=无历史面） */
  onEcho?(echo: EntityEcho): void
  /** 权威和解链任务（宿主=lineage-write-conflicts；缺省=位保留不和解） */
  reconcile?(): Promise<ReconcileOutcome>
  /** [回炉 W-B3·R-B7] 会话仍注册（孤儿=false——链尾续拉停止、不再发 keyed 读）；缺省=恒存活，单会话夹具 */
  alive?(): boolean
  /** [B4 L2] 会话键读取（registry Map 键——recovery 触发归属 owner 判定；缺省=单会话夹具无参） */
  key?: () => string | undefined
  /** [B4 L2] ghost 降级 remap 主图后的会话面收口（清该会话 focusSet；缺省=清活动聚焦集） */
  onRemapMain?(): void
  /** [回炉 W-B1·R-remap] ghost remap 落库（drain 成功收尾：队列空、写 IPC 全部落地）→宿主执行终态
   *  迁移（被矫正会话离场、主图会话换代并失效）；to=remap 目标键 */
  onRemapLanded?(to: string): void
}

export interface DrainOutcome {
  /** false=系统型失败停队头（error 态） */
  ok: boolean
  /** 本次 drain 有拒绝型丢弃（needsReload 已置位） */
  conflictTouched: boolean
  /** 末次拒绝型丢弃的服务器 reason（#10：显式保存据此记失败并可见待重试） */
  conflictMessage: string | null
}

export interface WriteQueue {
  /** 编辑动作入暂存（乐观应用+入队——不发 IPC；saveStatus=dirty） */
  enqueue(action: WriteAction): void
  /** 每会话串行写链入队（history-unit/finalize 共链；任务体自管 IO 终态） */
  chain<T>(task: () => Promise<T>): Promise<T>
  /** 普通写 drain（链任务体内调用——不自入链）：成功→clean；系统型失败→error 停队头 */
  drain(): Promise<DrainOutcome>
  /** drain→（conflictTouched∨needsReload）链尾和解任务；和解被丢→drain 新 Q 后按当前 epoch 有界续拉（[回炉 W-B3·R-B7]） */
  flush(): Promise<void>
}

/** 同实体判定（排队合并=最后写胜出）：同 kind 且目标相同（[F-ALIGN-01] 节点
 *  动作恒=patch（id 型）——按 id 判等，新建不合并分支随 input 形态退役删）。
 *  [F-VISFB-66] upsert-edge 合并键 id 化（设计书 §D.4——B-02 终裁）：由
 *  from/to 对判等改 id 判等（与 remove-edge id 兜底、节点 patch id 判等族内
 *  一致）；同 id 合并=后动作整替（元数据 silentSave/isNew 后值胜——与旧同
 *  pair 合并 filter+append 同构，仅判等面收窄）。行为 diff 三格：同 id 同
 *  pair=合并（终态同旧）；同 id 异 pair（换端序列）=旧不合并顺序应用/新合并
 *  整替——终态一致（物化全载荷下两形态同落后值）；异 id=不合并（两态同） */
function sameTarget(a: WriteAction, b: WriteAction): boolean {
  if (a.kind !== b.kind) return false
  if (a.kind === 'patch-node' && b.kind === 'patch-node') return a.id === b.id
  if (a.kind === 'upsert-edge' && b.kind === 'upsert-edge') return a.input.id === b.input.id
  // [F-LGRAPH-01②U8] 色行名整批=单实体（当前 folder 配置）——同类恒合并
  if (a.kind === 'upsert-line-type-names' && b.kind === 'upsert-line-type-names') return true
  // [F-VISFB-61] 悬浮笔记 upsert=id 型判等（remove 走下方 id 兜底分支；
  // upsert×remove 异 kind 不合并——remove-edge 同族）
  if (a.kind === 'upsert-floating-note' && b.kind === 'upsert-floating-note') return a.input.id === b.input.id
  return (a as { id: string }).id === (b as { id: string }).id
}

/** 写失败 toast（[F-VISFB-66] 旧换父前缀面随业务退役删除——统一 reason 透传） */
function writeFailToast(message: string): void {
  showToast(message, 'error')
}

  /** [F-VISFB-65 单元二] 死文件夹级作用域判定：该 folderId 的 upsert 笔记动作 */
const isGhostUpsertOf = (x: WriteAction, folderId: string): boolean =>
  x.kind === 'upsert-floating-note' && x.input.folderId === folderId

export function createWriteQueue(deps: WriteQueueDeps): WriteQueue {
  const { set, get } = deps
  const key = (): string | undefined => deps.key?.() // [B4 L2] recovery 触发的会话归属（缺省=单会话夹具）
  /** 派发中动作引用：enqueue 融合面排除（flight 项已发不融合） */
  let flight: WriteAction | null = null
  /** [回炉 W-B1·R-remap] 本次链内已决出的 ghost remap 目标（降级询问决出时置位）。会话键=data.folderId
   *  恒等——remap 不直置 data.folderId（改键=换新身份，发生在落库后）；色行名请求的 folderId 按它注入 */
  let remappedTo: string | null = null
  /** 串行写链：链空闲时首任务**同步起步**（saving/编辑锁即刻可见——同 tick 的
   *  undo/编辑判定读到 flushing=true，INV-94 同步闸面）；其后任务排在前任务后 */
  let tail: Promise<void> = Promise.resolve()
  let queued = 0
  /** 在途任务类别（flush=IO 收口；command=history/finalize——须严格串行） */
  let running: 'flush' | 'command' | null = null

  /** [R3] lazy 同实体融合：patch 字段级合并（不同字段共存；同字段后值胜）；
   *  override 整替（语义轴互斥） */
  const fuseLazy = (a: LazyNodePatch, b: LazyNodePatch): LazyNodePatch => ({
    kind: 'patch-node',
    id: b.id,
    patch: { ...a.patch, ...b.patch },
    override: b.override ?? a.override
  })
  const isLazyPatch = (x: WriteAction): x is LazyNodePatch => x.kind === 'patch-node'

  const { applyAction } = createWriteExecutor({ set, get, onEcho: deps.onEcho, remappedTo: () => remappedTo }) // 单条落库执行=lineage-write-executor（见其头注）

  const enqueue = (rawAction: WriteAction): void => {
    // [F-VISFB-66] id 必填防御（§D.4-1）：upsert-edge 缺 id=throw。不可达
    // 推演：store 边动作构造层恒全载荷物化（一切边动作构造即携本地 uuid）
    // ——enqueue 正常路径恒有 id；本格仅拦管线外合成动作（防御纵深；原「+withLocalId
    // 兜底补 id」一支随 [回炉 R20] 不可达分支删除）
    if (rawAction.kind === 'upsert-edge' && rawAction.input.id === undefined) {
      throw new Error('upsert-edge 动作缺 id（enqueue 契约：边动作构造层须物化本地 uuid）')
    }
    const action = rawAction.kind === 'upsert-edge' ? { ...rawAction, input: normalizeEdgeInput(rawAction.input) } : rawAction
    const withId = withLocalId(action)
    set((s) => {
      let queue: WriteAction[]
      if (isLazyPatch(withId)) {
        // [R3] 融合仅限**未派发**队列项（saving 派发窗内 flight 项保留原位）
        let hit = false
        queue = s.queue.map((x) => {
          if (x === flight || !isLazyPatch(x) || !sameTarget(x, withId)) return x
          hit = true
          return fuseLazy(x, withId)
        })
        if (!hit) queue = [...s.queue, withId]
      } else {
        queue = [...s.queue.filter((x) => x !== flight && !sameTarget(x, withId)), withId]
      }
      return { queue, saveStatus: 'dirty' }
    })
    applyOptimistic(set, withId)
    // [F-VISFB-65] 编辑单元触发面（enqueue 后——§4 调度器 300ms trailing）
    notifyRecoveryEditUnit(key())
  }

  const drain = async (): Promise<DrainOutcome> => {
    let conflictTouched = false
    let conflictMessage: string | null = null
    while (get().queue.length > 0) {
      const action = get().queue[0]!
      flight = action // [R3] 派发中标记：enqueue 融合面排除
      try {
        await applyAction(action)
        // 按动作身份出队（非 slice(1)：flight 期间同实体动作可能被合并替换，
        // 盲切首位会误删未发送的后值——「最后写胜出」与出队的组合缺陷，测试拦出）
        set((s) => ({ queue: s.queue.filter((x) => x !== action) }))
        notifyRecoverySaveNow(key()) // 出队即存（fire-and-forget 不等回执）
      } catch (e) {
        if (e instanceof ApiClientError && e.code === 'CONFLICT') {
          // 拒绝型：永不成功——丢弃继续（不卡队头不误报脏）
          conflictTouched = true
          conflictMessage = e.message
          set({ needsReload: true }) // [回炉 W7] 持久化（系统型失败提前退出不丢）
          let deadFolderId: string | null = null
          if (conflictPolicyOf(action, e) === 'ghost-folder' && action.kind === 'upsert-floating-note') {
            deadFolderId = action.input.folderId
            const patch = ghostFolderPatch(await requestGhostFolderDecision(deadFolderId), deadFolderId)
            if (patch.remapToMain) {
              // 保存到主图：队列中该 folderId 的全部 upsert remap 主图+乐观图态同行
              // remap；当前动作未出队——续发即 remapped 版本（一询全覆盖）
              // [回炉 W8] 当前图矫正主图；[回炉 W-B1·R-remap] 不直置 data.folderId（键=数据键恒等）：落库后换新身份
              remappedTo = MAIN_GRAPH_ID
              set((s) => ({
                queue: patch.queue(s.queue),
                floatingNotes: patch.floatingNotes(s.floatingNotes)
              }))
              ;(deps.onRemapMain ?? (() => useLineageViewStore.getState().clearFocus()))()
              flight = null
              continue
            }
          }
          writeFailToast(e.message)
           // 放弃这条修改：该 folderId 全部 upsert 一次性走既有 CONFLICT 丢弃路径
          const dead = deadFolderId
          set((s) => ({ queue: dead === null ? s.queue.filter((x) => x !== action) : s.queue.filter((x) => !isGhostUpsertOf(x, dead)) }))
          flight = null
          continue
        }
        // 系统型：动作保留（不丢），error 态+重试（INV-04：失败不推进保存态）；[B5 §6.1] 普通写失败=source 'save'
        const message = e instanceof Error ? e.message : String(e)
        flight = null
        set(writeFailure(message, 'save'))
        writeFailToast(message)
        return { ok: false, conflictTouched, conflictMessage }
      }
      flight = null
    }
    // 成功收尾：clean（U/H/R 全不变——idle-flush≠定稿）；[B5 §6.1] message 与 source 同清
    set(writeFailureCleared())
    markRecoveryClean('clean', key()) // clean 四源之一：flush 全成功→release(clean)〔L2：按会话归属裁决〕
    if (remappedTo !== null) deps.onRemapLanded?.(remappedTo) // [回炉 W-B1·R-remap] remap 落库：队列空、写全部落地→终态迁移
    return { ok: true, conflictTouched, conflictMessage }
  }

  const chain = <T>(task: () => Promise<T>, kind: 'flush' | 'command' = 'command'): Promise<T> => {
    const run = async (): Promise<T> => {
      running = kind
      set({ flushing: true, saveStatus: 'saving', inflight: { kind: 'write' } })
      try {
        return await task()
      } finally {
        set({ flushing: false, inflight: null }) // F=0；相位由任务体落定（clean/error）
        running = null
      }
    }
    queued += 1
    const settle = (): void => {
      queued -= 1
    }
    const result = queued === 1 ? run() : tail.then(run, run)
    tail = result.then(settle, settle)
    return result
  }

  const flush = (): Promise<void> => {
    // 让位早退（[F-VISFB-14] 沿承）：在途任务本身是一次 flush 且链上无其他任务→
    // 其 drain 已覆盖此前入队动作（saving 期不收新编辑），不排第二次；退出握手
    // 不被挂起的降级询问堵住（⑥ quit×conflict-wait）。其余情况严格排队。
    if (queued > 0 && running === 'flush' && queued === 1) return Promise.resolve()
    return chain(async () => {
      const r = await drain()
      // 链尾和解（§2.6 10a）：[回炉 W-B3·R-B7] 和解被丢后 drain 新 Q、按当前 epoch 有界续拉（lineage-reconcile-tail）
      // ——位清归权威应用；续拉仍未应用／续拉前新写失败／孤儿会话＝位保留
      // [回炉 W-D2a·T-B04] 以下理由句恢复自 HEAD 注释（原宿主=fire-and-forget load 收尾，机制已由
      // 链尾和解任务替换——理由不变）：
      // [F-LGRAPH-01②U1] CONFLICT 收尾：乐观残值消解——服务器权威；
      // INV-84 修订申报：乐观写在场，被拒意图经权威回填不在本地残留；
      // [F-VISFB-65 单元二] remap 分支同携——主图新行的权威回填；
    // [回炉 W7] needsReload 持久标志并入判定（上轮 CONFLICT 后系统型失败
    // 提前退出→重试成功的新 flush 收口补拉——幽灵乐观行不残留）；
    // [INV-175 F-RECOV-02 只触发不清位]：flush 成功收尾=干净化点之一——
    // 此处禁清位（fire→落地前竞窗内新编辑会互锁丢弃 load，早清=残值复活面）；
      // 清位唯二=权威应用分支（和解读应用）+discardSession（放弃例外）
      if (r.ok && (r.conflictTouched || get().needsReload === true)) {
        await reconcileAtTail({ reconcile: deps.reconcile, drain, alive: () => deps.alive?.() ?? true })
      }
    }, 'flush')
  }

  return { enqueue, chain, drain, flush }
}
