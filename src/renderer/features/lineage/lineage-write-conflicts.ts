/**
 * [B4 L1 / 设计稿 §2.5 #10、§2.6 10a-10d/13a-13d/20a-20d/34a-34d、§6.2] lineage-write-
 * conflicts —— 普通写拒绝型失败的处置策略与权威和解链任务（reconcile）。
 *
 * ── 行为层 ──
 * - conflictPolicyOf：CONFLICT 处置策略单点——三联判据（kind+code+reason 全中）
 *   =ghost-folder（悬浮笔记目标夹已删→降级询问），其余=discard（丢弃动作继续队列）。
 * - ghostFolderPatch：降级询问决出后的应用面——remap-main-graph=该 folderId 全部
 *   upsert 动作与乐观笔记行改投主图；discard=一次性丢弃该 folderId 全部 upsert。
 * - 和解链任务（reconcile）：needsReload=1 时一次 keyed graph 权威读，身份匹配时
 *   应用并清位。身份=folderId+读捕获 invalidationEpoch（§2.3）；[B4 L2] 单飞句柄
 *   存取与读身份（generation/loadSeq）经可选 deps 注入——registry 按会话分槽
 *   （loader 首载与和解读复用同一句柄），未注入=模块级单槽（单会话夹具）：
 *   · 等待（10a/13a/20a）：任务由调用方排入每会话串行链——链内序=普通写→和解→
 *     history→定稿清账；在途单飞读可复用（34a：捕获 epoch≥当前才可复用）；
 *   · 成功（10b）：apply 返回 true=已应用（调用方清 needsReload）——和解≠定稿；
 *   · 失败（10c/13b/20b）：读抛错原样上抛（装配位折叠为 'failed' 并置 error），
 *     保留 needsReload、不定稿不弹栈；
 *   · 迟到/被丢（10d/13c/20c/34c/34d）：身份不符或应用判据失败（Q>0、他任务
 *     在途）不写图态、位保留；epoch 已被推进→按当前 epoch 重新单飞（不并发两
 *     读，本任务内有界一次）；否则返回 dropped 交链尾——链在 drain 新 Q 后按当前
 *     epoch 有界续拉（[回炉 W-B3·R-B7] lineage-reconcile-tail；位保留至权威应用）。
 *
 * ── 接口层 ──
 * - export function conflictPolicyOf/ghostFolderPatch
 * - export function createReconcileTask(deps): { run(): Promise<ReconcileOutcome> }
 *
 * ── 架构层 ──
 * - 纯编排件：不直连 api/store——keyed 读与应用经 deps 注入（write-queue 装配位）。
 */
import { MAIN_GRAPH_ID } from '@shared/models/lineage'
import type { LineageGraphRes } from '@shared/ipc/schemas'
import type { WriteAction } from '@shared/recovery/schemas'
import type { GhostFolderChoice } from './conflictResolution'

export type ConflictPolicy = 'discard' | 'ghost-folder'

/** [F-VISFB-65 单元二] 三联判据（B-07）：kind+code+reason 全中→死文件夹降级询问 */
export function conflictPolicyOf(action: WriteAction, error: { code?: string; reason?: string }): ConflictPolicy {
  const ghost =
    action.kind === 'upsert-floating-note' && error.code === 'CONFLICT' && error.reason === 'GHOST_FOLDER'
  return ghost ? 'ghost-folder' : 'discard'
}

/** 降级询问决出后的应用面（宿主 state 补丁——派发中动作未出队，续发即 remapped 版本） */
export function ghostFolderPatch(choice: GhostFolderChoice, deadFolderId: string): {
  queue: (queue: WriteAction[]) => WriteAction[]
  floatingNotes: <T extends { folderId: string }>(notes: T[]) => T[]
  remapToMain: boolean
} {
  const isGhost = (x: WriteAction): boolean => x.kind === 'upsert-floating-note' && x.input.folderId === deadFolderId
  if (choice !== 'remap-main-graph') {
    return {
      queue: (queue) => queue.filter((x) => !isGhost(x)),
      floatingNotes: (notes) => notes,
      remapToMain: false
    }
  }
  return {
    queue: (queue) =>
      queue.map((x) =>
        x.kind === 'upsert-floating-note' && x.input.folderId === deadFolderId
          ? { ...x, input: { ...x.input, folderId: MAIN_GRAPH_ID } }
          : x
      ),
    floatingNotes: (notes) => notes.map((n) => (n.folderId === deadFolderId ? { ...n, folderId: MAIN_GRAPH_ID } : n)),
    remapToMain: true
  }
}

/** failed=和解读失败（任务体抛错，由装配位折叠——#10c/#13b/#20b 置 error 位保留） */
export type ReconcileOutcome = 'applied' | 'dropped' | 'failed'

export interface ReconcileIdentity {
  folderId: string
  epoch: number
}

/** [B4 L2 §2.3] 在途单飞读句柄（Promise 不进响应式快照——registry handles 持有） */
export interface InflightRead {
  identity: ReconcileIdentity
  /** 发起时捕获的会话身份（#43 迟到响应归属；null=单会话夹具不校验） */
  generation: number | null
  loadSeq: number | null
  promise: Promise<LineageGraphRes>
}

/** 单飞句柄存取（registry 每会话一槽；缺省=模块级单槽） */
export interface ReconcileInflightStore {
  get(): InflightRead | null
  set(read: InflightRead | null): void
}

export interface ReconcileDeps {
  get(): { folderId: string; invalidationEpoch: number; sessionGeneration?: number }
  /** keyed graph 权威读（单飞句柄的物理读） */
  read(): Promise<LineageGraphRes>
  /** 身份匹配应用：返回 true=已应用并清位；false=不写图态、位保留 */
  apply(graph: LineageGraphRes, identity: ReconcileIdentity): boolean
  /** [B4 L2] 单飞句柄存取（缺省=模块级单槽） */
  inflight?: ReconcileInflightStore
  /** [B4 L2] 新读发起时捕获会话身份（generation+推进后的 loadSeq） */
  issue?(): { generation: number; loadSeq: number }
  /** [B4 L2] 带读身份的应用判据（#35/#43：generation/loadSeq/epoch 全匹配才写）——
   *  注入后替代 apply（apply 收恰两参——单会话夹具面不变） */
  applyKeyed?(graph: LineageGraphRes, identity: ReconcileIdentity, read: InflightRead): boolean
}

let inflightRead: InflightRead | null = null
const moduleStore: ReconcileInflightStore = {
  get: () => inflightRead,
  set: (read) => {
    inflightRead = read
  }
}

/** 测试/重装配复位（挂起读句柄弃置） */
export function resetInflightRead(): void {
  inflightRead = null
}

export function createReconcileTask(deps: ReconcileDeps): { run(): Promise<ReconcileOutcome> } {
  /** 发起/复用单飞读（34a：在途读捕获 epoch≥当前才可复用；否则按当前 epoch 重新单飞） */
  const store: ReconcileInflightStore = deps.inflight ?? moduleStore
  const startRead = (): InflightRead => {
    const s = deps.get()
    const cur = store.get()
    // 复用判据（34a+#43）：同 folder ∧ 在途读 generation=会话当前 ∧ 读捕获 epoch≥当前
    if (
      cur !== null &&
      cur.identity.folderId === s.folderId &&
      cur.identity.epoch >= s.invalidationEpoch &&
      (s.sessionGeneration === undefined || cur.generation === s.sessionGeneration)
    ) {
      return cur
    }
    const key = deps.issue?.() ?? null
    const read: InflightRead = {
      identity: { folderId: s.folderId, epoch: s.invalidationEpoch },
      generation: key?.generation ?? null,
      loadSeq: key?.loadSeq ?? null,
      promise: deps.read()
    }
    store.set(read)
    const clear = (): void => {
      if (store.get() === read) store.set(null)
    }
    void read.promise.then(clear, clear)
    return read
  }

  return {
    async run(): Promise<ReconcileOutcome> {
      for (let attempt = 0; attempt < 2; attempt++) {
        const read = startRead()
        const graph = await read.promise // 读失败原样上抛（10c）——调用方置 error
        const applied = deps.applyKeyed !== undefined ? deps.applyKeyed(graph, read.identity, read) : deps.apply(graph, read.identity)
        if (applied) return 'applied' // 10b：权威应用分支=needsReload 唯一清位点
        const s = deps.get()
        if (s.folderId !== read.identity.folderId) return 'dropped' // 34c：会话已切离——丢弃
        if (read.identity.epoch === s.invalidationEpoch) return 'dropped' // 34d：位保留，交链尾（lineage-reconcile-tail 有界续拉）
        // epoch 已被推进（#43）：事件前发起的旧读不得应用——按当前 epoch 重新单飞
      }
      return 'dropped'
    }
  }
}
