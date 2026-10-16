/**
 * [F-VISFB-14] quit-flush —— 退出握手 renderer 侧收口序列（app 组合层面，
 * 可跨 feature 聚合——App.tsx 同层先例；状态机见 evidence/14-impl.report.md
 * §状态机 B3）。
 *
 * 序列（串行 blocks；总时长受 main 侧 QUIT_FLUSH_TIMEOUT_MS 有限超时约束）：
 * ① notes.flushAllNow（逐篇串行立存——INV-141①普通 dirty 转可等待立存；
 *    ②首载门控 gated 篇 no-op 残留 pending，由收口判定呈现）；
 * ② 批注全量挂载句柄 flush（并行——各编辑器独立目标；clean 编辑器 no-op；
 *    句柄返回态 'failed'/'dirty' 计入未落库——INV-141③查态非兑现值）；
 * ③ lineage saveStatus≠clean → await save()（写队列正道——不旁路队列，
 *    硬约束；flushing 中让位早退由 ④ 查态兜住）；
 * ④ 收口后最新 dirty 判定（INV-141：不把任一 Promise fulfilled 直接等同
 *    「最新值已落库」，一律查态）：
 *    notes：noteByPaper 任一 pending∨saveFailed（含已关 tab 残留——退出面
 *    全量收口，不限开 tab 键集，与 useTabDirtyAggregate 的开 tab 限定分野）；
 *    annotations：开 tab TabState.dirty（API 失败残留——关 tab 卸载注册承接
 *    不属本判定）∨ 句柄终态未落库 ∨ 注册表未落盘残留（hasPending）；
 *    lineage：saveStatus≠clean（error/saving 均脏——saving=未知按脏）。
 */
import { useNotesStore } from '../features/notes/notes.store'
import { useReaderStore } from '../features/reader/state/reader.store'
import { useLineageStore } from '../features/lineage/lineage.store'
import {
  allDraftFlushHandles,
  hasPendingAnnotationDrafts
} from '../features/reader/interact/annotation-draft-registry'

/**
 * 退出收口：执行全部写面立存并返回「收口后最新 dirty 判定」。
 * true=仍有未落库/未知态（main 侧走 confirm 降级）；false=全部最新值已落库
 * （main 侧直接 destroy 零确认）。异常上抛由调用方（quit-flush-bridge）按
 * stillDirty=true 承接。
 */
export async function runQuitFlush(): Promise<boolean> {
  // ① notes 全量立存（串行逐篇——flushAllNow）
  await useNotesStore.getState().flushAllNow()
  // ② 批注挂载句柄全量 flush（并行 await；终态收集）
  const states = await Promise.all(
    allDraftFlushHandles().map((flush) => Promise.resolve().then(() => flush()))
  )
  const annotationHandleDirty = states.some((s) => s !== 'saved' && s !== 'clean')
  // ③ lineage 写队列正道收口（≠clean 才发起；await 后查态）
  const lineageBefore = useLineageStore.getState()
  if (lineageBefore.saveStatus !== 'clean') {
    await lineageBefore.save()
  }
  // ④ 收口后最新 dirty 判定（查态——三面或）
  const notes = useNotesStore.getState().noteByPaper
  const notesDirty = Object.values(notes).some((d) => d.pending || d.saveFailed)
  const reader = useReaderStore.getState()
  const tabsAnnoDirty = reader.order.some((id) => reader.tabs[id]?.dirty === true)
  const annotationDirty = annotationHandleDirty || tabsAnnoDirty || hasPendingAnnotationDrafts()
  const lineageDirty = useLineageStore.getState().saveStatus !== 'clean'
  return notesDirty || annotationDirty || lineageDirty
}
