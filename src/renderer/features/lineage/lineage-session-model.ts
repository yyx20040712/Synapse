/**
 * [B4 L1 / 设计稿 §2.1-§2.2/§2.4/§10.1/§10.4/§11.2] lineage-session-model —— 脉络
 * 会话的 IO/历史/交互类型与纯投影（L1 单图：一份活动会话；per-folder registry
 * 属 L2——本件接口按会话对象参数化，不读全局；[B4 L2] 宿主=per-folder registry：
 * lineage-session-registry，本件仍只有类型与纯函数；[回炉 W-D2a·T-B05] 命令状态纯
 * 投影 isLineageBusy/lineageIoPhase/lineageCommandState 及其输入类型外移=
 * lineage-command-state-model（本件行数超预算上限；本件留 re-export，既有导入面零
 * 改动，类型不双写））。
 *
 * ── 行为层 ──
 * - IO 轴（§2.1「IO」）：保存对象的实际写状态——相位 idle/saving/error × 待写
 *   队列 × 当前在途写。saveStatus 四态=相位×Q 的既有投影（clean=idle/Q0、
 *   dirty=idle/Q≥1、saving=在途、error=失败——普通写队首保留，history／和解失败
 *   可 Q0：[B5 C2=B] 相位只用于呈现，未落定判据只看 Q/F）；flushing ⇔ 在途写
 *   在场（F≠0）。
 * - inflight kind（§2.2）：write=普通写在途（不置 busy）/flush=显式保存定稿步/
 *   history=history-unit/reconcile=权威和解读。busy=finalize·history·reconcile
 *   在途（§10.4「普通写 saving 不置 busy」）。
 * - unfinalized（U 轴）：自最近一次显式保存后有新编辑/undo/redo 即真；
 *   idle-flush 与 reconcile 不动；仅成功 finalize 按 editRevision 清（§2.5 #20-23）。
 * - 历史项 LineageHistoryEntry（§5.1 主控终裁 1）：受影响实体的可逆命令对
 *   （changes=redo 顺向、undo 逆向）；undo/redo 各≤HISTORY_DEPTH_MAX（10）。
 * - 命令状态（§10.4 HistoryCommandState）=[回炉 W-D2a·T-B05] 纯函数驻
 *   lineage-command-state-model（自本件外移，行为注释随代码迁驻该件头注）。
 * - LineageStore：活动会话的状态形状+公开动作签名（13 编辑入口经 EditCommands/
 *   NoteOps 混入；实现=lineage.store 装配位——本件只有类型）。
 *
 * ── 接口层 ──
 * - 类型：LineageSaveStatus/LineageIoPhase/LineageInflight/LineageHistoryEntry/
 *   LineageInteraction/LineageDragTarget/LineageStore
 * - 纯函数：lineageIoInFlight/makeHistoryEntry（isLineageBusy/lineageIoPhase/
 *   lineageCommandState 驻 lineage-command-state-model——本件 re-export 保活）
 *
 * ── 架构层 ──
 * - 只依赖 shared 与域内类型（EditCommands/NoteOps 为 type-only import——零运行时环）；
 *   命令状态三个纯函数 re-export 自 lineage-command-state-model（该件对本件 type-only
 *   import——零环）。
 */
import { HISTORY_DEPTH_MAX } from '@shared/constants'
import type {
  LineageEditCommandKind,
  LineageEntityDelta,
  LineageHistoryDirection
} from '@shared/ipc/lineage-history.schemas'
import type { LineagePaperMetrics } from '@shared/ipc/schemas'
import type { FloatingNote, LineageEdge, LineageNode } from '@shared/models/lineage'
import type { LineageRecoveryPayload, WriteAction } from '@shared/recovery/schemas'
import type { EditCommands } from './lineage-edit-commands'
import type { NoteOps } from './lineage-note-ops'
import type { LineageStaleHistory } from './lineage-history-stale'
// [B5 §6.1] 写失败来源类型单源=lineage-write-failure（本件只消费——type-only import，零运行时环）
import type { LineageWriteErrorSource } from './lineage-write-failure'

// [回炉 W-D2a·T-B05] 命令状态纯投影驻 lineage-command-state-model（本件 re-export 保活既有导入面，类型不双写）
export { isLineageBusy, lineageCommandState, lineageIoPhase } from './lineage-command-state-model'
export type { LineageCommandStateInput } from './lineage-command-state-model'

/** [§2.4] IO 相位×Q 的四态投影（既有消费面：quitDirty/lineagePending/nav/状态条）。
 *  [F-LGRAPH-01②U1] 保存态四态（mockup §2.2——saveStatus 枚举语义反转申报：'saved'→'clean'） */
export type LineageSaveStatus = 'clean' | 'dirty' | 'saving' | 'error'
export type LineageIoPhase = 'idle' | 'saving' | 'error'

/** [§2.2] 当前在途写（null=无在途——相位不得停留在 saving） */
export type LineageInflight =
  | { kind: 'write' }
  | { kind: 'flush' }
  | { kind: 'history'; unitId: string; direction: LineageHistoryDirection }
  | { kind: 'reconcile'; epoch: number }

/** [§5.1] 历史项：受影响实体的可逆命令对 */
export interface LineageHistoryEntry {
  id: string
  folderId: string
  command: LineageEditCommandKind
  changes: LineageEntityDelta[]
}

/** [B4 L2 §9.3] 拖拽两态：dragging=已激活未松手（无 FlightJob——有界 settle 出口按
 *  lastClient 落位）；settleFlight=FlightJob 已建后的可等待句柄（600ms 兜底承诺域，
 *  finishOnce 触发 resolve）；layoutActive=B3 布局屏障激活起→终局止（只继续 B3 指针
 *  与重算屏障）。两态均阻塞同会话保存/历史命令起步。句柄驻 registry（不进响应式快照） */
export interface LineageInteraction {
  dragging: boolean
  settleFlight: Promise<void> | null
  layoutActive: boolean
}

/** [B4 L2 §9.3] 拖拽写归属身份（useCardDrag 回调捕获——组件卸载后兜底写仍只到原会话） */
export interface LineageDragTarget {
  folderId: string
  generation: number
  dragId: string
}

/** [§11.2] 历史深度上限（@shared/constants 单源——与 reader 两层同值） */
export const LINEAGE_HISTORY_DEPTH_MAX = HISTORY_DEPTH_MAX

/** 会话 IO 在途（F≠0）——交互门/编辑锁判据（W2：三件交互件读本函数） */
export function lineageIoInFlight(s: { inflight: LineageInflight | null }): boolean {
  return s.inflight !== null
}

/** 历史项工厂（id=unitId 回显去重键；folderId=会话归属——L2 keyed 身份之一） */
export function makeHistoryEntry(
  folderId: string,
  command: LineageEditCommandKind,
  changes: LineageEntityDelta[],
  nextId: () => string = (): string => crypto.randomUUID()
): LineageHistoryEntry {
  return { id: nextId(), folderId, command, changes }
}

export type LineageStatus = 'loading' | 'ready' | 'error'

/** 活动会话状态形状+公开动作签名（实现=lineage.store；L2 registry 化后=单会话形状） */
export interface LineageStore extends EditCommands, NoteOps {
  nodes: LineageNode[]
  edges: LineageEdge[]
  /** F-LG14 含金量摘要（键=paperId） */
  paperMetrics: Record<string, LineagePaperMetrics>
  /** [F-FOLDER-01] pubNo 表（INV-92 库级派生编号，键=paperId） */
  pubNos: Record<string, number>
  /** [A1a] 文献库标签名组表（键=paperId） */
  /** 值=名序标签名；卡标签行数据源[换源]；无标签文献无键 */
  tagNames: Record<string, string[]>
  /** [B4 L1 D2] 当前 folder 的六行色行名（graph 单读随行） */
  lineTypeNames: string[]
  /** [F-VISFB-61] 悬浮笔记图域行集（folderId 域隔离） */
  /** graph 单读随行；62 号 UI 消费面；会话写走 write-queue 同族〔可等待+undo〕 */
  floatingNotes: FloatingNote[]
  status: LineageStatus
  error: string | null
  /** [F-LGRAPH-01①U4] 当前图作用域：恒有值（主图 __main__ 兜底不可删） */
  /** 并集退役——每图只显示自身；消费面=load 载荷（恒显式 folderId）+导航窗格图/文件夹下拉；
   *  IPC/main 侧 folderId 可选性保留（历史兼容，不收紧 schema） */
  folderId: string
  /** IO 轴四态投影（clean=idle/Q0、dirty=idle/Q≥1、saving=在途、error=失败） */
  saveStatus: LineageSaveStatus
  /** 最近一次系统型写失败消息（行内错误呈现；成功清空） */
  lastWriteError: string | null
  /** [B5 §6.1] 最近一次失败的来源（消息元数据——与 lastWriteError、saveStatus 在同一 patch 写入或清除；
   *  告警呈现与重试入口只看它：save 才有保存重试，history 指引重按原方向命令，缺源 fail closed） */
  lastWriteErrorSource: LineageWriteErrorSource
  /** 暂存动作队列（仅实际待落库普通编辑——历史项不入队，§6.2） */
  queue: WriteAction[]
  /** 在途写在场（F≠0）——同会话 saving 编辑锁判据 */
  flushing: boolean
  inflight: LineageInflight | null
  /** [INV-175] 图态与库态偏离待和解（清位=权威应用分支+discardSession） */
  needsReload: boolean
  /** [回炉 W-B2c] 恢复待令：恢复载入后、本会话写链尚无任务起步（会话字段——定义见 lineage-session-registry
   *  头注「恢复待令」）；活动投影读点=LineagePage 挂载效应 */
  restoredAwaitingCommand: boolean
  /** [回炉 W-B3·R-D1] 过期历史标记：history-unit 以 CONFLICT 拒绝的方向栈顶历史项（方向＋历史项 id＋拒因与
   *  消息——定义与适用性判据=lineage-history-stale）。出口须用户在保存错误行点击并确认，不静默跳过 */
  staleHistory: LineageStaleHistory | null
  /** [§2.3] 失效代际（恢复替换/弃会话推进；和解读捕获值≠当前=旧读不可应用） */
  invalidationEpoch: number
  /** [§5.1] 历史：受影响实体的可逆命令对（各≤10；页面切换与 flush 保留） */
  undoStack: LineageHistoryEntry[]
  redoStack: LineageHistoryEntry[]
  /** U 轴：自最近一次显式保存后有新编辑/undo/redo（灰点轴——不表示 queue 非空） */
  unfinalized: boolean
  /** 每次用户新编辑/undo/redo 同步递增（finalize 成功回执比对——§2.5 #22） */
  editRevision: number
  /** 权威取数（挂载/重试/切图；已有会话刷新不清历史与 U） */
  load(): Promise<void>
  /** [B5 设计稿 §2.2/§5.2] 活动投影同步口（LineagePage 同图 ready 重挂消费面——零 graph IPC）：对活动集合做
   *  恒等防御剪枝（合法集合同值同引用，既有死 id 才移除）；不覆写 mode、不重置工具态 */
  syncActiveSession(): void
  /** [B4 L2] 当前会话代际（恢复替换/删除重建递增——迟到响应身份键之一） */
  sessionGeneration: number
  /** [B4 L2 §2.5 #32/§8.1] 切图：flush-first（取消 timer→A 未落定写即发落库，不等回执、
   *  不弹弃改框）→activeFolder 同步切；每图 U/历史/focusSet 驻留；saving 不阻切 */
  setFolder(folderId: string): void
  /** [B4 L2 §9.3] 拖放落位写（身份=拖拽激活时捕获的 folder+generation+drag id）：经内部 settle 写路径
   *  串行入原会话写链（不经用户编辑闸）；true=已被写链接纳，false=目标会话已失效（丢弃并提示） */
  reorderMonthSlots(target: LineageDragTarget, nodeIds: string[]): boolean
  /** IO 收口（不定稿）：退出握手/课题切换/恢复落定消费面——[F-VISFB-14] 可等待 */
  /** 退出握手走 save() 正道消费，不旁路队列；flushing 中让位早退=调用方收口后查 saveStatus，INV-141 fulfilled≠已落库 */
  save(): Promise<void>
  /** 显式保存（§2.5 #20-#23）：drain 成功后 finalize——清 redo+U，undo 保留；
   *  true=已定稿（gate 拒绝/预 flush 失败/CONFLICT/和解失败=false） */
  saveActiveFolder(): Promise<boolean>
  /** 撤销/重做（flush-then-unit；true=完整动作成功——#12 no-op/失败=false） */
  undo(): Promise<boolean>
  redo(): Promise<boolean>
  /** [B4 L2 §6.1 O2] 已恢复会话放弃副本的目标会话清理（queue/IO/历史/U/needsReload
   *  清——不落库）；缺省=活动会话 */
  discardSession(folderId?: string): void
  /** error 态重试=再次显式保存（[B5 §6.1] source guard：只有 save 来源才 finalize，history／缺源=no-op） */
  retrySave(): void
  /** [回炉 W-B3·R-D1] 丢弃过期历史（保存错误行出口——用户确认后调用；不写数据库）：只移除该方向栈顶的过期项，
   *  清该次失败的错误态；needsReload 保留。项已不在栈顶或写链在途＝不适用（零副作用） */
  discardStaleHistory(): void
  /** [F-VISFB-65] 恢复载入：queue 恢复（重放幂等）+U 置真+历史清+needsReload */
  applyRecoverySession(payload: LineageRecoveryPayload): void
  /** [F-VISFB-65 回炉 W1] 恢复后派生面合并（载荷不含派生数据） */
  applyDerivedFields(derived: {
    paperMetrics: Record<string, LineagePaperMetrics>
    pubNos: Record<string, number>
    tagNames: Record<string, string[]>
  }): void
  /** [F-DBCAMP-01 DB-4 / F-STAR-01 A3] 节点星标切换（非图结构面：不入队列/历史
   *  ——直写库通道 papers/set-starred；乐观本地翻转+失败回滚 toast） */
  /** 载荷=调用面节点快照（卡/侧板 props 节点——与 store 节点面解耦：store 未含该 id 仍可切，本地补丁按 id 命中面） */
  toggleNodeStar(node: { id: string; paperId: string; isStarred?: boolean }): Promise<void>
}
