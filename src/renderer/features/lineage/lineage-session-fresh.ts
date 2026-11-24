/**
 * [B4 L2 / 设计稿 §2.3 会话注册表字段全表、§11.2] lineage-session-fresh —— 新建会话的初值
 * （自 lineage-session-registry 迁出：[回炉 W-B3·R-D1] 会话增过期历史标记字段，registry 件
 * 已超行数预算——初值随新字段落本件；registry 的 makeEntry 经本件取初值，行为零变）。
 *
 * ── 行为层 ──
 * - freshSession(workspaceId, folderId, sessionGeneration)：§2.3 全部会话字段的「空／未发生」
 *   初值——图四面与派生三面空、读面 loading（取数由 loader 起步）、IO 轴 clean/Q0/F0、
 *   两栈空、U=0、needsReload=0、恢复待令标记假、过期历史标记 null。
 * - 会话被替换（恢复载入／弃会话）、移除后同键再建、课题切换 reset 都经本件取初值：
 *   旧会话的内存态（两栈、U、位、各类标记）不迁入新会话。
 *
 * ── 接口层 ── export const freshSession
 *
 * ── 架构层 ── 纯数据件：只依赖 shared 模型默认值与 registry 的会话类型（type-only import，零环）。
 */
import { defaultLineTypeNames } from '@shared/models/lineage'
import type { LineageSession } from './lineage-session-registry'

/** [§2.3] 新建会话初值（status=loading——首载由 loader 起步） */
export const freshSession = (workspaceId: string, folderId: string, sessionGeneration: number): LineageSession => ({
  workspaceId,
  folderId,
  sessionGeneration,
  nodes: [],
  edges: [],
  lineTypeNames: defaultLineTypeNames(),
  floatingNotes: [],
  paperMetrics: {},
  pubNos: {},
  tagNames: {},
  status: 'loading',
  error: null,
  loadSeq: 0,
  invalidationEpoch: 0,
  queue: [],
  inflight: null,
  flushing: false,
  saveStatus: 'clean',
  lastWriteError: null,
  undoStack: [],
  redoStack: [],
  unfinalized: false,
  editRevision: 0,
  needsReload: false,
  restoredAwaitingCommand: false,
  staleHistory: null,
  focusSet: [],
  deleted: false
})
