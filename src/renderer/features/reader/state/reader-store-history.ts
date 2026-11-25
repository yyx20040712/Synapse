/**
 * [B4-A R1 §11.1 拆件延续；F-SLIMB4A-01] reader-store-history —— 操作层 undo/redo 的
 * store 同步收口 applyOpHistory（自 reader.store 拆出 2026-11-25——§11.1 拆件：store
 * 薄壳；行为零变=重构保真锚，reader.store.test/undo-race/history-r1 全量零改即绿；
 * reader-store-load 同型：set/get 由宿主 store 注入）。
 *
 * ── 接口层 ──
 * - export function createReaderOpHistory(set, get): { applyOpHistory }
 *
 * ── 架构层 ──
 * - 只 import reader-history-commands 与 toast-store（类型自 annotation-undo/
 *   tab-state）；不 import reader.store（防环——store 薄壳注入 set/get，本件不持
 *   store 实例）。操作层执行驻 reader-history-commands，本件只做「执行结果→store
 *   同步」的收口；行为规格=applyOpHistory 头注（自 reader.store 原样迁入）。
 */
import { undoTabOperations, redoTabOperations, type OpHistoryOutcome } from './reader-history-commands'
import { showToast } from '../../../shared/ui/toast-store'
import type { OpApply } from './annotation-undo'
import type { TabState } from './tab-state'

/** 历史收口消费的 store 切片（宿主 store 的子集——薄壳注入零耦合） */
interface HistoryStoreSlice {
  tabs: Record<string, TabState>
  activeId: string | null
}

type StoreSet = (partial: Partial<HistoryStoreSlice> | ((s: HistoryStoreSlice) => Partial<HistoryStoreSlice>)) => void
type StoreGet = () => HistoryStoreSlice

export function createReaderOpHistory(set: StoreSet, get: StoreGet): {
  /** undo/redo 共用收口：返回完整动作成功（PDF 未 ready 即拒——§2.5 #12） */
  applyOpHistory(direction: 'undo' | 'redo'): Promise<boolean>
} {
  // 操作层 undo/redo 共用收口（paperId await 前捕获——期间切 tab 不误落）：
  // 执行（起步入链复合任务〔裸预 flush→反向写〕+settle+代际失效在 commands）→ store 同步 →
  // 失败 toast；返回完整动作成功
  async function applyOpHistory(direction: 'undo' | 'redo'): Promise<boolean> {
    const before = get()
    const paperId = before.activeId
    // §2.5 #12 no-op 判据：PDF 未 ready（tab 缺席/loading/error）不触历史命令
    if (paperId === null || before.tabs[paperId]?.status !== 'ready') return false
    let outcome: OpHistoryOutcome
    try {
      outcome = direction === 'undo' ? await undoTabOperations(paperId) : await redoTabOperations(paperId)
    } catch (e) {
      // 模块层已捕获 api 面；此处兜底模块自身的意外编程错误
      console.error('[reader.store] 操作历史异常', e)
      showToast('撤销失败，请重试', 'error')
      return false
    }
    if (!outcome.done) {
      // 预 flush 失败（write-failed）的真实写失败已由写路径 toast——不叠发
      if (outcome.reason === 'api-failed') {
        showToast(direction === 'undo' ? '撤销失败，请重试' : '重做失败，请重试', 'error')
      }
      return false
    }
    const { tabs } = get()
    const tab = tabs[paperId]
    // 期间 tab 被关：DB 已撤销/重做，列表随重开对齐，不追写已删 TabState
    if (tab === undefined) return true
    const act: OpApply = outcome.apply
    const next =
      act.type === 'remove'
        ? tab.annotations.filter((x) => x.id !== act.id)
        : tab.annotations.some((x) => x.id === act.annotation.id)
          ? tab.annotations.map((x) => x.id === act.annotation.id ? act.annotation : x)
          : [...tab.annotations, act.annotation]
    // [B4-A R2 §2.5 #16/#17] undo/redo 成功=新编辑事件：U=1、revision++
    set({
      tabs: {
        ...tabs,
        [paperId]: { ...tab, annotations: next, unfinalized: true, editRevision: (tab.editRevision ?? 0) + 1 }
      }
    })
    return true
  }

  return { applyOpHistory }
}
