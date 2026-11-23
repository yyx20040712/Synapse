/**
 * [B4-A R2 §2.5 #38/§11.1] workspace-switch —— 课题切换全量 flush 编排
 * （app 组合层：确认通过后、api.switch 之前的唯一准备段）。
 *
 * ── 行为层（§2.5 #38）──
 * - 全量 flush：notes 全量立存（flushAllNow）→ 批注/总评挂载句柄全量 flush
 *   （并行 await；终态查态——fulfilled≠落库）→ 悬浮笔记草稿 fire-first commit
 *   → lineage 写队列正道收口（saveStatus≠clean 才 await save()——不旁路队列）。
 * - reader 各打开 tab 的写链 drain（tab-write-lane）：在途 history-unit 与普通写
 *   属 IO（§2.5 #38「全量 flush 成功」含在途链任务）——清史前落定，在途 undo/redo
 *   的回显先写回原 tab；
 * - 查态（IO 单源——U 不参与）：任一面仍 IO 脏 → false（留旧课题：不 switch、
 *   不清任何历史/草稿——失败零副作用，可重试）。
 * - 全 IO clean → 清全部内存历史（reader 两层历史+操作栈+U、lineage 快照栈）
 *   与 focusSet（§2.5 #38「清全部 H/R/U/focusSet」——reload 前归零），返回
 *   true；随后调用方（workspace.store.switchTo）release→switch→reload。
 * - lineage 侧本阶段只有单图旧机制（L2 再扩 per-folder registry——编排按
 *   单图版接：saveStatus/快照栈/focusSet 单槽）。
 *
 * ── 接口层 ──
 * - export async function prepareWorkspaceSwitch(): Promise<boolean>
 *
 * ── 架构层 ──
 * - app 组合根件（quit-flush 同层先例——可跨 feature 聚合）。
 */
import { useNotesStore } from '../features/notes/notes.store'
import { useReaderStore } from '../features/reader/state/reader.store'
import { useLineageStore } from '../features/lineage/lineage.store'
import { useLineageViewStore } from '../features/lineage/lineage-view.store'
import {
  allDraftFlushHandles,
  hasPendingAnnotationDrafts
} from '../features/reader/interact/annotation-draft-registry'
import { fireLineageNoteCommit, noteDraftPending } from '../features/lineage/lineage-note-draft'
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
  if (useLineageStore.getState().saveStatus !== 'clean') return false
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
  // ④ lineage 写队列正道收口（≠clean 才发起；不旁路队列）
  const lineageBefore = useLineageStore.getState()
  if (lineageBefore.saveStatus !== 'clean') {
    await lineageBefore.save()
  }
  // ⑤ reader 各打开 tab 的写链 drain：在途 history/普通写属 IO——清史前落定
  //    （§2.5 #38；各 tab 链互不阻塞，并行等待）
  await Promise.all(useReaderStore.getState().order.map((id) => laneDrain(id)))
  // ⑥ 查态：任一面仍 IO 脏 → 留旧课题（失败零副作用）
  if (!allIoClean()) return false
  // ⑦ 清全部内存历史/U/focusSet（§2.5 #38；reload 前归零——成功路径独占）
  useReaderStore.getState().close()
  useLineageStore.setState({ undoStack: [], redoStack: [] })
  useLineageViewStore.getState().clearFocus()
  return true
}
