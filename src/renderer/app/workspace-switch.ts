/**
 * [B4-A R2 §2.5 #38/§11.1] workspace-switch —— 课题切换全量 flush 编排
 * （app 组合层：确认通过后、api.switch 之前的唯一准备段）。
 *
 * ── 行为层（§2.5 #38）──
 * - 全量 flush：notes 全量立存（flushAllNow）→ 批注/总评挂载句柄全量 flush
 *   （并行 await；终态查态——fulfilled≠落库）→ 悬浮笔记草稿 fire-first commit
 *   → [B4 L2] lineage=全 registry：拖拽两态有界收口→取消 idle timer→有未落定写
 *   的会话各自 await save()（写队列正道——不旁路队列；等待名单=Q∨在途 F——
 *   [回炉 W-B2·R-B3] history-unit/和解读在途的会话必在其中，#38「全量 flush 成功」
 *   含在途链任务落定；[B5 设计稿 §7 C2=B] 相位不入：Q0/F0 的 error 会话不进等待
 *   名单、不中止切换——告警状态在 reset 前仍存在，成功后的全域 reset 清内存错误）。
 * - reader 各打开 tab 的写链 drain（tab-write-lane）：在途 history-unit 与普通写
 *   属 IO（§2.5 #38「全量 flush 成功」含在途链任务）——清史前落定，在途 undo/redo
 *   的回显先写回原 tab；
 * - 查态（IO 单源——U 不参与）：任一面仍 IO 脏 → false（留旧课题：不 switch、
 *   不清任何历史/草稿——失败零副作用，可重试）。[回炉 W-B2b] 编辑器已卸载的草稿残留
 *   （无收口句柄）在 ③ 之后经内部 settle 写路径落库（lineage-note-draft-settle）——
 *   否则残留会让本段恒返回 false 而用户在课题页看不到任何提示。[B5 设计稿 §7 C2=B]
 *   lineage 面只看 Q∨F：Q0/F0 的 error 不单独把会话判脏（清史时机不变）。
 * - 全 IO clean → 清全部内存历史（reader 两层历史+操作栈+U、lineage 全 registry
 *   会话——历史/U/queue/focusSet 随 resetWorkspace 全清，§2.5 #38「清全部
 *   H/R/U/focusSet」——reload 前归零），返回 true；随后调用方
 *   （workspace.store.switchTo）release→switch→reload。
 *
 * ── 接口层 ──
 * - export async function prepareWorkspaceSwitch(): Promise<boolean>
 *
 * ── 架构层 ──
 * - app 组合根件（quit-flush 同层先例——可跨 feature 聚合）。
 */
import { useNotesStore } from '../features/notes/notes.store'
import { useReaderStore } from '../features/reader/state/reader.store'
import { lineageRegistry } from '../features/lineage/lineage-session-registry'
import { ioUnsettled } from '../features/lineage/lineage-io-phase'
import { useWorkspaceStore } from '../features/workspaces/workspace.store'
import {
  allDraftFlushHandles,
  hasPendingAnnotationDrafts
} from '../features/reader/interact/annotation-draft-registry'
import { fireLineageNoteCommit, hasNoteDraftFlushHandle, noteDraftPending } from '../features/lineage/lineage-note-draft'
import { settleNoteDraftResidual } from '../features/lineage/lineage-note-draft-settle'
import { laneDrain } from '../shared/tab-write-lane'

/** 挂载句柄全量 flush（异常归 'failed'——查态面统一） */
async function flushAllDraftHandles(): Promise<boolean> {
  const states = await Promise.all(
    allDraftFlushHandles().map((flush) =>
      Promise.resolve()
        .then(flush)
        .then((s) => (typeof s === 'string' ? s : 'failed'), () => 'failed')
    )
  )
  return !states.some((s) => s !== 'saved' && s !== 'clean')
}

/** 收口后查态（IO 单源——U 不入）：任一面仍 IO 脏即 false */
function allIoClean(): boolean {
  const notes = useNotesStore.getState().noteByPaper
  const notesDirty = Object.values(notes).some((d) => d.pending || d.saveFailed)
  if (notesDirty) return false
  const reader = useReaderStore.getState()
  if (reader.order.some((id) => reader.tabs[id]?.dirty === true)) return false
  if (hasPendingAnnotationDrafts()) return false
  if (lineageRegistry.ioDirty()) return false
  if (noteDraftPending()) return false
  return true
}

/**
 * 课题切换准备段：全量 flush 成功且全部 IO clean 后清全部内存历史/focusSet。
 * 返回 true=可以 switch（release→switch→reload 由 workspace.store 接续）；
 * false=留旧课题（零副作用——不 discard 不清史，用户可重试）。
 */
export async function prepareWorkspaceSwitch(): Promise<boolean> {
  // ① notes 全量立存（串行逐篇——flushAllNow）
  await useNotesStore.getState().flushAllNow()
  // ② 批注/总评挂载句柄全量 flush（clean 编辑器 no-op；failed=收口失败）
  const handlesClean = await flushAllDraftHandles()
  if (!handlesClean) return false
  // ③ 悬浮笔记编辑草稿 fire-first commit（入队后由 ④ 正道落库）
  fireLineageNoteCommit()
  // [回炉 W-B2b] 编辑器已卸载的草稿残留（无收口句柄——③ no-op）：经内部 settle 写路径落库后再查态
  if (!hasNoteDraftFlushHandle()) await settleNoteDraftResidual()
  // ④ [B4 L2] lineage 全 registry 收口：两态有界先行→取消 idle timer→各会话正道 flush
  await Promise.all(lineageRegistry.sessions().map((entry) => lineageRegistry.awaitDragSettle(entry.key)))
  lineageRegistry.cancelAllIdle()
  // 等待名单=实际待写的会话（Q∨F——[B5 C2=B] 相位不入）——[回炉 W-B2·R-B3] 含 history-unit/和解读在途（F）
  await Promise.all(
    lineageRegistry
      .sessions()
      .filter((entry) => ioUnsettled(entry.data))
      .map((entry) => entry.lane.save())
  )
  // ⑤ reader 各打开 tab 的写链 drain：在途 history/普通写属 IO——清史前落定
  //    （§2.5 #38；各 tab 链互不阻塞，并行等待）
  await Promise.all(useReaderStore.getState().order.map((id) => laneDrain(id)))
  // ⑥ 查态：任一面仍 IO 脏 → 留旧课题（失败零副作用）
  if (!allIoClean()) return false
  // ⑦ 清全部内存历史/U/focusSet（§2.5 #38；reload 前归零——成功路径独占）：
  //    [B4 L2] lineage=全 registry reset（全部会话历史/U/queue/focusSet 清+owner
  //    发布面由 prepareRecoveryWorkspaceSwitch 归 null——§8.4 行 10）
  useReaderStore.getState().close()
  lineageRegistry.resetWorkspace(useWorkspaceStore.getState().currentId)
  return true
}
