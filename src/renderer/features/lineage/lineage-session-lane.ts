/**
 * [B4 L2 / 设计稿 §2.2/§2.3/§2.5 #3-#23/§6.2/§8.1/§9.2/§11.2] lineage-session-lane ——
 * 每 folder 一条串行写命令链（§2.2「lineage 每个 folder 一条串行写命令链」；L1 宿主
 * lineage.store 内联的单链按会话参数化迁出——store 降为活动投影薄壳）。
 *
 * ── 行为层 ──
 * - 组成：write-queue（暂存+串行链）/同步单元 recorder/13 编辑入口/history-unit/
 *   和解链任务/finalize/idle timer——全部读写绑定**发起时所属的 entry**（registry
 *   注入 write/read/isActive），不读活动投影：后台 flush 的回显只回写原会话。
 * - 链内序（§2.2/§6.2）：普通写 →（needsReload=1 时）和解 → history → 定稿清账。
 * - idle-flush timer：[回炉 W-D2a·T-B05/T-W02] 调度（timer 句柄/代际/arm/cancel/到期
 *   分发）外移=lineage-idle-scheduler（自本件外移，行为注释随代码迁驻该件头注）；本件
 *   装配并持有该调度件——编辑单元完成（非 no-op）与活动会话草稿变更沿重排，history/
 *   finalize/save/flushFirst 入链前取消（切图离场与 registry.cancelAllIdle 经导出的
 *   cancelIdle），会话消亡 dispose。
 * - IO 相位（[回炉 W-B2·R-B3] §2.4「有在途必须为 saving」）：runReconcile 与 inflight 同一
 *   写点发布 saving（原只写 inflight——和解读在途期停在 clean），退出统一收 F=0 相位
 *   （settleIoPhase：error 保留、否则按 Q）；reconcileNow 的相位收口沿用同一助手。
 *   [B5 设计稿 §6.1] 和解失败的来源由**发起命令显式传入** runReconcile(source)：history
 *   命令=history-undo／history-redo（经 history-unit 的 reconcile 端口），save／finalize／
 *   普通 flush／reconcileNow='save'——不持可变 currentSource、不靠 inflight 反推；finalize 的
 *   #10 记失败（含 remap 后写存活会话）恒 'save'。
 * - editUnit 闸（#3/#4）：同会话 saving 编辑锁（INV-94）+ quit/recovery/conflict
 *   冻结 + 未完成拖拽两态（§9.3）——拒绝零副作用。settle 域（settleEdit 的 body
 *   同步执行期）免这三道用户闸——同会话不并发由链内串行保证。
 *   闸的挂点来历（[回炉 W-D2a·T-B04] 恢复自 lineage.store HEAD 注释）：[F-VISFB-64] closing
 *   gate 挂点——lineage 用户操作在 enqueue 前经 editUnit 统一入口冻结（undo 逆写=用户动作
 *   同闸——设计 §④ 写源表；原统一入口名=beginUnit）；quit 收口 ②.5 fireLineageNoteCommit 经
 *   runQuitInternal 豁免域放行。[F-VISFB-65] recovery 门（quitWriteBlocked 同型——ws-entry 屏障
 *   frozen 期拒编辑，§6；未装配恒放行——单测/旧路径兼容）；[F-VISFB-65 单元二]
 *   conflictWaitBlocked=modal 挂起期门（§7——flushing 守卫外的显式第二道位）。
 * - 内部 settle 写路径（[回炉 W-B2·R-B2] §9.3 落位数据写、§12.2「内部 flush 放行」）
 *   =settleEdit（见函数头注）。
 * - historyCommand（#12-#19）：no-op 判据→先提交草稿、取消 idle timer（§9.2
 *   「取消旧 idle timer」）→入链 flush-then-unit；finalize（#20-#23）：先取消 idle
 *   timer→drain→和解先行→定稿清账。和解先行遇和解被丢（读到达时应用判据不成立、
 *   位保留）：链在 drain 新 Q 后按当前 epoch 有界续拉（[回炉 W-B3·R-B7]
 *   lineage-reconcile-tail——#20c/#13c）——续拉成功才定稿／才执行 history-unit；续拉
 *   仍未应用＝不定稿／不执行、位保留；续拉前新写失败＝按预 flush 失败处置；孤儿会话
 *   停止。和解失败（#20b/#13b）不续拉——重试留给下一次命令。
 * - flushFirst（§2.5 #32/§8.1 步 2）：切换离场的 fire-and-forget 落库（不等回执；
 *   失败驻本会话 error）；save=IO 收口不定稿（退出握手/课题切换/恢复落定消费面）。
 * - reconcileNow（§2.6 #41/#34）：活动会话 IO clean 时入链单飞和解（F=reconcile）。
 * - 恢复待令标记的清除点（[回炉 W-B2c]；标记定义见 lineage-session-registry 头注）：本会话写链的任一
 *   任务起步=「首次命令入链」。写链的全部入链口在本件，经 chainTask/chainFlush 两个包装入链并在入链
 *   调用点同步清标记（等价于任务起步清：标记为真时本链必空闲，链空闲时入链即同步起步）。被闸拒的
 *   命令（historyCommand/finalize 的早退）不达入链口，标记保持。
 * - 和解准入（[回炉 W-B1·R-B4/R-remap]）：runReconcile 起首复核会话身份——会话已
 *   不存活（恢复替换/删除/改键后的孤儿）不发 keyed 读；本链已 remap 落库则和解由
 *   存活会话承担（返回其落定 Promise——本链的 flush 尾/finalize 等待它，IO 收口
 *   语义不破、恰一次单飞）。finalize 的 #10 记失败在 remap 后写存活会话。
 *
 * ── 接口层 ── export function createSessionLane(deps): SessionLane
 *
 * ── 架构层 ── 纯编排件：会话读写经 deps 注入（registry 单一写路径）；不 import
 * lineage.store/registry（零环）。
 */
import { api, unwrap } from '../../api/client'
import type { LineageEditCommandKind, LineageHistoryDirection } from '@shared/ipc/lineage-history.schemas'
import type { WriteAction } from '@shared/recovery/schemas'
import { quitWriteBlocked } from '../../app/quit-closing-gate'
import { showToast } from '../../shared/ui/toast-store'
import { recoveryBlocked } from './recoveryScheduler'
import { conflictWaitBlocked } from './conflictResolution'
import { fireLineageNoteCommit, fireLineageNoteIdleCommit, hasNoteDraftIdleHandle, noteDraftPending } from './lineage-note-draft'
import { settledIoPhase } from './lineage-io-phase'
import { createWriteQueue, type DrainOutcome, type WriteQueueDeps } from './lineage-write-queue'
import type { ReconcileOutcome } from './lineage-write-conflicts'
import { createSessionRecorder, type EditUnit, type SessionRecorderDeps } from './lineage-session-ops'
import { createEditCommands, type EditCommands } from './lineage-edit-commands'
import { createNoteOps, type NoteOps } from './lineage-note-ops'
import { createHistoryUnit } from './lineage-history-unit'
import { reconcileAtTail } from './lineage-reconcile-tail'
import { createIdleScheduler } from './lineage-idle-scheduler'
import { reanchorHistory, type EntityEcho } from './lineage-history-commands'
import { isLineageBusy } from './lineage-session-model'
import { writeFailure, type LineageWriteErrorSource } from './lineage-write-failure'
import type { LineageSession, SessionEntry, SessionPatch } from './lineage-session-registry'
import type { RemapSurvivor } from './lineage-session-remap'

export interface SessionLaneDeps {
  entry: SessionEntry
  /** 该会话的写入口（registry 单一写路径——孤儿 entry 只落物理账本） */
  write(patch: SessionPatch): void
  /** 活动会话（悬浮笔记草稿只属活动图） */
  isActive(): boolean
  /** 未完成拖拽两态（§9.3——闸面） */
  dragPending(): boolean
  /** keyed 权威和解读（loader——#34/#35/#41/#43） */
  reconcile(): Promise<ReconcileOutcome>
  /** ghost 降级 remap 主图后的会话面收口（清该会话 focusSet） */
  clearFocus(): void
  /** [回炉 W-B1·R-remap] 本会话写链经 ghost remap 落入库（drain 成功收尾：队列空、写 IPC
   *  全部落地）→宿主执行终态迁移；返回存活会话句柄（和解落定＋写入口） */
  onRemapLanded?(to: string): RemapSurvivor | null
  /** 会话仍注册（恢复替换/删除后=false——#19 迟到回显判据） */
  alive(): boolean
}

export interface SessionLane {
  readonly commands: EditCommands
  readonly noteOps: NoteOps
  enqueue(action: WriteAction): void
  /** 同步编辑单元边界（gate 拒绝=false——零副作用） */
  editUnit(command: LineageEditCommandKind, body: (unit: EditUnit) => void): boolean
  /** [回炉 W-B2·R-B2] 内部 settle 写路径：落位数据写串行入本会话写链、不经用户编辑闸（见实现处头注）；
   *  Promise=是否应用（body 抛错=false）——调用方通常不等待，落库由出口紧随其后的 flush 承担 */
  settleEdit(body: () => void): Promise<boolean>
  /** [回炉 W-B2·D-3] 草稿内容变更沿：活动会话重排 idle timer（草稿属活动图） */
  draftChanged(): void
  historyCommand(direction: LineageHistoryDirection): Promise<boolean>
  /** 显式保存（#20-#23）：true=已定稿 */
  finalize(): Promise<boolean>
  /** IO 收口（不定稿）——可等待 */
  save(): Promise<void>
  /** 切换离场 flush-first（fire-and-forget） */
  flushFirst(): void
  /** 活动会话立即单飞和解（#41/#34） */
  reconcileNow(): Promise<ReconcileOutcome>
  cancelIdle(): void
  /** 会话消亡：取消 idle timer（在途链任务自然落定到原 entry） */
  dispose(): void
}

type HostPatch<H> = Partial<H> | ((s: H) => Partial<H>)

export function createSessionLane(deps: SessionLaneDeps): SessionLane {
  const get = (): LineageSession => deps.entry.data
  const write = deps.write
  const hostSet =
    <H extends object>(patch: HostPatch<H>): void =>
      write(patch as unknown as SessionPatch)

  // ── idle-flush 调度（[回炉 W-D2a·T-B05/T-W02] 纯件=lineage-idle-scheduler：timer 句柄/代际/arm/cancel/到期
  //    分发驻该件，行为注释随代码迁驻其头注；本件注入会话读面、草稿注册族与本链 flush 入链口）──
  const idle = createIdleScheduler({
    read: get,
    isActive: deps.isActive,
    draftPending: noteDraftPending,
    commitDraft: fireLineageNoteIdleCommit,
    hasDraftIdleHandle: hasNoteDraftIdleHandle,
    flush: () => chainFlush()
  })

  /** [回炉 W-B2·R-B3] F=0 相位收口（在途任务自身的收尾处调用；链的 finally 清 F 之前/之后
   *  均可——结果只读 Q 与 error）：error 保留，否则按 Q 得 dirty|clean（§2.4「无在途不得停留在 saving」） */
  const settleIoPhase = (): void => {
    const next = settledIoPhase(get())
    if (get().saveStatus !== next) write({ saveStatus: next })
  }
  /** 本链 remap 落库后的存活会话句柄（drain 收尾时捕获——此后本链的和解读与之无关） */
  let remap: RemapSurvivor | null = null
  /** 和解链任务装配位（链内调用——读失败折叠 failed+error，位保留不定稿 #10c）；
   *  [B5 §6.1] source=发起命令的失败来源（和解失败按它记——由各调用点显式传入） */
  const runReconcile = async (source: Exclude<LineageWriteErrorSource, null>): Promise<ReconcileOutcome> => {
    if (remap !== null) return remap.settled // remap 已落库：和解由存活会话承担——本链等待其落定
    if (!deps.alive()) return 'dropped' // 孤儿会话：不再发 keyed 读（迟到响应本就按身份键丢弃）
    // [回炉 W-B2·R-B3] 与 inflight 同一写点发布 saving（§2.4「有在途必须为 saving」——原只写 inflight，
    // 和解读在途期相位停在 drain 收尾留下的 clean）；退出（成功/dropped/失败）统一收 F=0 相位
    write({ inflight: { kind: 'reconcile', epoch: get().invalidationEpoch }, saveStatus: 'saving' })
    try {
      return await deps.reconcile()
    } catch (e) {
      write(writeFailure(e instanceof Error ? e.message : String(e), source)) // 失败三字段同批写入（[B5 §6.1]）
      return 'failed'
    } finally {
      settleIoPhase()
    }
  }
  const wq = createWriteQueue({
    set: hostSet<WriteQueueDeps['set'] extends (patch: infer P) => void ? P : never>,
    get,
    key: () => deps.entry.key,
    onEcho: (echo: EntityEcho) => write((s) => reanchorHistory({ undoStack: s.undoStack, redoStack: s.redoStack }, echo)),
    reconcile: () => runReconcile('save'), // 普通 flush 的链尾和解=save 来源（[B5 §6.1]）
    alive: deps.alive,
    onRemapMain: deps.clearFocus,
    onRemapLanded: (to) => {
      remap = deps.onRemapLanded?.(to) ?? null // [回炉 W-B1·R-remap] 终态迁移落位；句柄留给本链任务体其后段
    }
  })
  /** [回炉 W-B2c] 入链包装（本会话写链两个入链口 chain/flush 的全部调用点经此）：任务起步=本会话首次命令
   *  入链，清恢复待令标记（见头注）。标记为真时本链必空闲，链空闲时入链即同步起步（lineage-write-queue
   *  chain 的 queued===1 → run()），故「入链调用点清」与「任务起步清」是同一同步块 */
  const enterChain = (): void => {
    if (get().restoredAwaitingCommand) write({ restoredAwaitingCommand: false })
  }
  const chainTask = <T>(task: () => Promise<T>): Promise<T> => {
    enterChain()
    return wq.chain(task)
  }
  const chainFlush = (): Promise<void> => {
    enterChain()
    return wq.flush()
  }
  const recorder = createSessionRecorder({ get, set: hostSet<Parameters<SessionRecorderDeps['set']>[0]> })
  const frozen = (): boolean => quitWriteBlocked() || recoveryBlocked() || conflictWaitBlocked()
  /** [回炉 W-B2·R-B2] 内部 settle 域标记：仅 settleEdit 的 body() 同步执行期间为真——其后的
   *  await 期间用户编辑照常受 saving 锁约束（标记不跨 await） */
  let settling = false
  const editUnit = (command: LineageEditCommandKind, body: (unit: EditUnit) => void): boolean => {
    if (!settling && (get().flushing || deps.dragPending() || frozen())) return false // settle 域免用户闸（链内串行已保证同会话不并发）
    const revision = get().editRevision
    recorder.runUnit(command, body)
    if (get().editRevision !== revision) idle.arm() // #3：编辑单元完成（非 no-op）→排 1.5s idle-flush
    return true
  }
  /**
   * [回炉 W-B2·R-B2] 内部 settle 写路径（设计稿 §9.3「落位数据写落原 folder」、§12.2 quit-gate
   * 行「内部 flush 放行」）：拖拽落位的数据写以普通任务类入本会话写链——串行于在途任务之后；
   * 任务体内置 settle 域后同步执行 body：body 仍经 editUnit→同一 recorder（历史项+队列写不另
   * 起一套），settle 域免 quit/recovery/conflict 冻结、拖拽两态与同会话 saving 锁三道用户闸
   * （原缺陷：quit closing 时落位被冻结门静默吞掉，退出握手仍按 clean 回执）。
   * - 不用 'flush' 任务类：写队列的让位早退会让并发的 save() 立即返回而不等本任务。
   * - 不自带 drain：落位写留在暂存（Q=1），落库由出口紧随其后的 flush（退出握手/页面切换的
   *   save()、folder 切换的 flushFirst）或 idle timer 承担；写失败=error+队首保留，由 IO 查态
   *   承接（不静默算 clean）。
   * - 不经 quitWriteBlocked——「豁免域=同步域、不跨 await」红线不动。
   * - body 抛错（节点已不在图——mustNode 在开单元之前，零副作用）→ toast 记录原因。
   * - 相位（§2.4）：链内 enqueue 在 F≠0 期把相位写成 dirty→同一同步块回落 saving；链清 F
   *   之后（landed 兑现晚于链 finally）收 F=0 相位——语义 no-op 的落位不产生单元时，链起步
   *   写入的 saving 不滞留。
   */
  const settleEdit = (body: () => void): Promise<boolean> => {
    const wasError = get().saveStatus === 'error' // 链起步把相位写成 saving——本任务不重试失败写，收尾时还原 error（调用时链空闲才可能为真：链忙时相位是 saving）
    const landed = chainTask(async (): Promise<boolean> => {
      settling = true
      let applied = false
      try {
        body()
        applied = true
      } catch (e) {
        showToast(e instanceof Error ? e.message : String(e), 'error')
      } finally {
        settling = false
      }
      if (get().inflight !== null && get().saveStatus !== 'saving') write({ saveStatus: 'saving' })
      return applied
    })
    return landed.then((applied): boolean => {
      settleIoPhase()
      if (wasError) write({ saveStatus: 'error' })
      return applied
    })
  }
  const commands = createEditCommands({ get, enqueue: wq.enqueue, editUnit })
  const noteOps = createNoteOps({ get, editUnit, enqueue: wq.enqueue })
  const history = createHistoryUnit({
    set: hostSet<Parameters<Parameters<typeof createHistoryUnit>[0]['set']>[0]>,
    get,
    sessionGeneration: () => get().sessionGeneration,
    alive: deps.alive,
    drain: () => wq.drain(),
    reconcile: runReconcile,
    historyUnit: (req) => unwrap(api.lineage.historyUnit(req))
  })

  return {
    commands,
    noteOps,
    enqueue: wq.enqueue,
    editUnit,
    settleEdit,
    async historyCommand(direction) {
      const s = get()
      // [F-VISFB-64] closing gate：undo 逆写=用户动作，入队前冻结（设计 §④）；
      // [F-VISFB-65] recovery 门同闸（屏障 frozen 期拒绝）
      if (s.status !== 'ready' || frozen() || deps.dragPending() || (direction === 'undo' ? s.undoStack : s.redoStack).length === 0) return false
      if (deps.isActive()) fireLineageNoteCommit() // #13：先提交悬浮笔记草稿
      idle.cancel() // §9.2：undo/redo 前 flush——取消旧 idle timer（命令接管写链）
      return chainTask(() => history.run(direction))
    },
    async finalize() {
      const s = get()
      if (s.status !== 'ready' || frozen() || isLineageBusy(s.inflight) || deps.dragPending()) return false // 拒重复命令
      if (deps.isActive()) fireLineageNoteCommit()
      idle.cancel() // #20：显式保存先取消 idle timer（不等 1.5s）
      return chainTask(async () => {
        const finalizeRevision = get().editRevision
        let drained: DrainOutcome = await wq.drain()
        if (!drained.ok) return false // #23 预 flush 失败：redo/U/undo 全保留
        if (get().needsReload) {
          // #20a-#20c 和解先行；[回炉 W-B3·R-B7] 和解被丢→链在 drain 新 Q 后按当前 epoch 有界续拉——续拉成功后才定稿；
          // 续拉仍未应用（或续拉前新写失败）＝不定稿、位保留（不按未和解图清 redo/U）；和解失败来源='save'（[B5 §6.1]）
          const tail = await reconcileAtTail({ reconcile: () => runReconcile('save'), drain: () => wq.drain(), alive: deps.alive })
          if (tail.outcome !== 'applied') return false
          if (tail.followed !== null) {
            // 续拉各轮 drain 的 CONFLICT 丢弃并入本次 finalize 的 #10 记失败判据
            drained = {
              ok: true,
              conflictTouched: drained.conflictTouched || tail.followed.conflictTouched,
              conflictMessage: tail.followed.conflictMessage ?? drained.conflictMessage
            }
          }
        }
        if (drained.conflictTouched) {
          // #10：本次 finalize 记失败（[回炉 W-B1·R-remap] remap 落库后本会话已离场——记存活会话）；
          // [B5 §6.1] 来源恒 'save'（不是 history 拒绝）——message 与 source 同批落到同一会话，不串到别的 folder
          const failed = writeFailure(drained.conflictMessage ?? '', 'save')
          if (remap !== null) remap.write(failed)
          else write(failed)
          return false
        }
        write({
          inflight: { kind: 'flush' },
          redoStack: [], // #21/#22：redo 清；保存期间有新编辑则 U 保持（revision 已前进）
          // [回炉 W-B3·R-D1] redo 清→redo 方向的过期历史标记随之清（标记项已不在栈顶）；undo 方向标记不动
          ...(get().staleHistory?.direction === 'redo' ? { staleHistory: null } : {}),
          ...(get().editRevision === finalizeRevision ? { unfinalized: false } : {})
        })
        return true
      })
    },
    async save() {
      idle.cancel()
      await chainFlush()
    },
    flushFirst() {
      idle.cancel()
      void chainFlush().catch(() => undefined)
    },
    reconcileNow() {
      // [B5 §7.2/§12 E08——主控裁决 A 案 2026-11-25] 自动和解（#41 结构事件触发）不重试失败写：入口相位为
      // error（Q0/F0 的 history 零写失败／和解读失败／finalize 的 CONFLICT 尾）时，和解**未失败**的收尾还原
      // error——runReconcile 起手的 saving 会覆盖它，否则告警与其内的 stale 丢弃出口随一次自动和解消失
      // （§6.1 清除行只列「普通写成功、history 成功」，自动和解成功不在其内）。settleEdit 的 wasError 同型；
      // 还原只写相位、不触 message/source。和解自身失败由 runReconcile 落自己的 save 源＋新 message，不还原。
      const wasError = get().saveStatus === 'error'
      return chainTask(async () => {
        const outcome = get().needsReload ? await runReconcile('save') : 'dropped' // 在途回执已清位=无再读必要（显式和解入口=save 来源）
        settleIoPhase() // 相位收口（含早退径；[回炉 W-B2·R-B3] 与 runReconcile 的退出收口共用同一助手）
        if (wasError && outcome !== 'failed') write({ saveStatus: 'error' })
        return outcome
      })
    },
    cancelIdle: idle.cancel,
    draftChanged: () => {
      if (deps.isActive()) idle.arm()
    },
    dispose: idle.dispose
  }
}
