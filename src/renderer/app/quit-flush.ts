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
 * ②.5 [F-VISFB-63] 悬浮笔记编辑草稿 fire-first commit（入队后由 ③ 正道
 *    落库；flushing 窗 no-op——pending 保真由 ④ 查态承接）；
 * ③ [B4 L2 §2.5 #37/§9.3] lineage=全 registry flush：拖拽两态有界先行（态一请求
 *    有界 settle→数据写落原会话；态二 await settleFlight 句柄）→取消全部 idle
 *    timer→有未落定写的会话各自 await save()（写队列正道——不旁路队列，硬约束；
 *    等待名单=Q∨在途 F∨error——[回炉 W-B2·R-B3] history-unit/和解读在途的会话必在
 *    其中：save() 排在链的在途任务之后，等到它落定）；
 * ③.5 [B4-A R2 §2.5 #37] reader 各打开 tab 的写链 drain（tab-write-lane）：
 *    在途 history-unit 与普通写属 IO——无人 await 的链任务（快捷键 undo/redo、
 *    切 tab fire-first 立存）在最终查态前落定；失败结果由 ④ 查态承接；
 * ④ 收口后最新 dirty 判定（INV-141：不把任一 Promise fulfilled 直接等同
 *    「最新值已落库」，一律查态；[B4-A R2 §2.5 #37] IO 单源——U/unfinalized
 *    不入 stillDirty：灰点不卡退出，idle-flush 已落库即 clean 回执）：
 *    notes：noteByPaper 任一 pending∨saveFailed（含已关 tab 残留——退出面
 *    全量收口，不限开 tab 键集）；
 *    annotations：开 tab TabState.dirty（API 失败残留——关 tab 卸载注册承接
 *    不属本判定）∨ 句柄终态未落库 ∨ 注册表未落盘残留（hasPending）；
 *    lineage：任一会话 IO 未落定（Q∨在途 F∨error——lineage-io-phase.ioUnsettled 单源；
 *    [回炉 W-B2·R-B3] 直接按 Q/F/error 计算，不以 saveStatus≠clean 代替：相位写点漏同步
 *    时后者漏报在途写）；
 *    noteDraft〔F-VISFB-63〕：noteDraftPending()=未收口草稿残留（②.5 fire
 *    no-op〔flushing 窗〕/句柄同步 throw 面——pending 保真承接）。[回炉 W-B2b] 编辑器
 *    已卸载的残留（无挂载句柄）在 ②.5 之后经内部 settle 写路径落库
 *    （lineage-note-draft-settle）；落不了库的（笔记已不在任何会话/恢复冻结期）仍由
 *    本查态如实呈现。
 */
import { useNotesStore } from '../features/notes/notes.store'
import { useReaderStore } from '../features/reader/state/reader.store'
import { lineageRegistry } from '../features/lineage/lineage-session-registry'
import { ioUnsettled } from '../features/lineage/lineage-io-phase'
import {
  allDraftFlushHandles,
  hasPendingAnnotationDrafts
} from '../features/reader/interact/annotation-draft-registry'
import { fireLineageNoteCommit, hasNoteDraftFlushHandle, noteDraftPending } from '../features/lineage/lineage-note-draft'
import { settleNoteDraftResidual } from '../features/lineage/lineage-note-draft-settle'
import {
  awaitRecoveryQuitSettled,
  strongQuitRecoveryBestEffort
} from '../features/lineage/recoveryScheduler'
import { laneDrain } from '../shared/tab-write-lane'
import { runQuitInternal } from './quit-closing-gate'

/**
 * 退出收口：执行全部写面立存并返回「收口后最新 dirty 判定」。
 * true=仍有未落库/未知态（main 侧走 confirm 降级）；false=全部最新值已落库
 * （main 侧直接 destroy 零确认）。异常上抛由调用方（quit-flush-bridge）按
 * stillDirty=true 承接。
 * [F-VISFB-64·回炉 B1] 豁免域=同步域、不跨 await：跨 await 收口链不再外层
 * 整体包裹——①③ 经收口核心路径（notes dispatchSaveNow/写队列 flush 无用户
 * 入口闸）；唯一命中闸点的跨步链=②.5 fireLineageNoteCommit（同步链：handle→
 * closeEdit→updateFloatingNote 的 beginUnitGated 闸点），在其同步调用处就地
 * 包裹。语义红线=closing=true 时一切非收口链用户写拒绝，不受 flush 在途影响。
 */
export async function runQuitFlush(): Promise<boolean> {
  // ① notes 全量立存（串行逐篇——flushAllNow）
  await useNotesStore.getState().flushAllNow()
  // ② 批注挂载句柄全量 flush（并行 await；终态收集）
  const states = await Promise.all(
    allDraftFlushHandles().map((flush) => Promise.resolve().then(() => flush()))
  )
  const annotationHandleDirty = states.some((s) => s !== 'saved' && s !== 'clean')
  // ②.5 [F-VISFB-63] 悬浮笔记编辑草稿 fire-first commit（挂载编辑会话收口入队
  // ——textarea 卸载无 blur 同链〔62 号 d1 定谳〕，入队后由 ③ save 正道落库；
  // flushing 窗 fire no-op：pending 保真由 ④ 查态承接=main confirm 降级不静默丢）。
  // [F-VISFB-64·回炉 B1] 同步豁免域就地包裹：fire→handle→closeEdit→
  // updateFloatingNote（beginUnitGated 闸点）+setNoteDraftPending(假向) 全同步
  runQuitInternal(fireLineageNoteCommit)
  // [回炉 W-B2b] 编辑器已卸载的草稿残留（无收口句柄——②.5 no-op）：经内部 settle 写路径落库——正文不丢，
  // 也不把一条看不见的草稿以 stillDirty 推给用户确认。编辑器在场而撞落库在途窗的草稿不在内
  // （既有合约 T10：pending 保真→④ 查态→confirm）
  if (!hasNoteDraftFlushHandle()) await settleNoteDraftResidual()
  // ③ [B4 L2] lineage 全 registry 收口：两态有界先行→取消 idle timer→各会话正道 flush
  await Promise.all(lineageRegistry.sessions().map((entry) => lineageRegistry.awaitDragSettle(entry.key)))
  lineageRegistry.cancelAllIdle()
  // 等待名单=IO 未落定的会话（Q∨F∨error）——[回炉 W-B2·R-B3] 含 history-unit/和解读在途（F）
  await Promise.all(
    lineageRegistry
      .sessions()
      .filter((entry) => ioUnsettled(entry.data))
      .map((entry) => entry.lane.save())
  )
  // ③.5 [B4-A R2 §2.5 #37] reader 各打开 tab 的写链 drain——在途 history/普通写
  // 属 IO：最终查态前落定（各 tab 链互不阻塞，并行等待）
  await Promise.all(useReaderStore.getState().order.map((id) => laneDrain(id)))
  // ④ 收口后最新 dirty 判定（查态——四面或；noteDraftPending=②.5 fire no-op
  // 〔flushing 窗〕或无句柄时的未收口草稿残留面）
  const notes = useNotesStore.getState().noteByPaper
  const notesDirty = Object.values(notes).some((d) => d.pending || d.saveFailed)
  const reader = useReaderStore.getState()
  const tabsAnnoDirty = reader.order.some((id) => reader.tabs[id]?.dirty === true)
  const annotationDirty = annotationHandleDirty || tabsAnnoDirty || hasPendingAnnotationDrafts()
  const lineageDirty = lineageRegistry.ioDirty() // 全 registry IO（U 不入——#37）
  const stillDirty = notesDirty || annotationDirty || lineageDirty || noteDraftPending()
  // [F-VISFB-65] 退出窗收口（§4）：clean=flush 收口已触发 release——await 收
  // 束（release 自带 1500ms 硬超时 fail-open）再回执；强退（flush 失败确认
  // 退出路径）=最后 saveNow 尽力**不 release**（副本承载未落库状态）
  if (stillDirty) {
    strongQuitRecoveryBestEffort()
  } else {
    await awaitRecoveryQuitSettled()
  }
  return stillDirty
}
