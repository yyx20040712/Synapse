// b3: P7-B
/**
 * [SR2-TABS-03→B4-A R2 §10.1] tab-dirty —— tab IO 信号聚合与灰点 U 选择器
 * （关闭状态机迁 reader-close-tab.ts；灰点输入改 unfinalized 单源）。
 *
 * ── 行为层 ──
 * - 灰点（TabBar 灰点/rail 阅读器角标）= tab.unfinalized（U 轴单源——§10.1
 *   「TabBar 灰点直接读 tab.unfinalized」）；旧「annoDirty||notesPending 双净
 *   即无灰点」语义退役。IO 两信号（annotations 失败残留/notes pending）只作
 *   quitDirty 与状态条输入（IO 轴——U 不入，INV-22/INV-187）。
 * - useTabUnfinalizedAggregate：任一已打开 tab U=1 → true（rail 阅读器角标
 *   输入——App 组合根经 use-save-aggregates 消费）。
 * - useTabAutosaveSignals/useTabOpenCount：状态条自动保存槽的 IO 输入（只显示
 *   IO，不把灰点改成永久「待保存」——§10.1）。
 * - switchTabFlushFirst：切 tab 离场篇 fire-first 立存（§2.5 #31——两 tab 栈
 *   均不动；R1 语义原样）。
 *
 * ── 接口层 ──
 * - export function useTabUnfinalizedAggregate(): boolean
 * - export function useTabOpenCount(): number
 * - export interface TabDirtySignalPair / useTabAutosaveSignals()
 * - export function switchTabFlushFirst(targetId): void
 *
 * ── 架构层 ──
 * - 本模块是 reader 域唯一 notes.store 引用点（check-quality 白名单例外——
 *   组合装配职责）；不 import 组件。
 *
 * ── 文化层 ──
 * - 测试：tests/unit/renderer/tab-dirty.test.tsx（R2 迁移：灰点=U、IO 两源
 *   quitDirty 分列）+app-quit-dirty.test.tsx（IO 聚合）
 */
import { useReaderStore } from './reader.store'
import { useNotesStore } from '../../notes/notes.store'
import { fireAllDraftFlushes } from '../interact/annotation-draft-registry'
import { useShallow } from 'zustand/react/shallow'
import { quitWriteBlocked } from '../../../app/quit-closing-gate'
import { aggregateSaveUiState } from '../../../shared/save-status'
import { tabWriteBlocked } from './tab-closing-gate'
import type { HistoryCommandState } from '../../../shared/history-command'
import { finalizeInFlight } from './reader-save-coordinator'
import { opHistoryInFlight } from './reader-history-commands'
import { redoDepth, stackDepth } from './annotation-undo'

/** [B4-A R2 §10.1] rail 阅读器角标输入：任一已打开 tab unfinalized → true
 *  （订阅 order+tabs 投影——布尔特化，值不变零重渲） */
export function useTabUnfinalizedAggregate(): boolean {
  return useReaderStore((s) => s.order.some((id) => s.tabs[id]?.unfinalized === true))
}

/** [T3-U1] 已打开 tab 数（响应式）——状态条自动保存槽的「可写面在场」判定
 *  源（App 组合根聚合注入 StatusBar；与 useTabUnfinalizedAggregate 同源订阅
 *  order，App 经本 reader 域 facade 取 tab 面，不直引 reader.store） */
export function useTabOpenCount(): number {
  return useReaderStore((s) => s.order.length)
}

/**
 * [T3-U1 回炉 R2/W3 终裁→B4-A R2] tab IO 双源分档（响应式）——状态条自动
 * 保存槽/quitDirty 的 IO 输入（§10.1：只显示 IO；U 不入）：
 * - annoDirty：annotations 面 api 失败残留（TabState.dirty——真失败）→failed 档
 * - notePending：notes 面 pendingEdit 镜像（edit 置 true/save 成功清/失败不动
 *   =在途+失败混合，防抖窗常 true）→saving 档
 * 沿 open tab 键集扫描限定（已关 tab 的 noteByPaper 残留不产生退出误报）。
 */
export interface TabDirtySignalPair {
  annoDirty: boolean
  notePending: boolean
}

export function useTabAutosaveSignals(): TabDirtySignalPair {
  const tabIds = useReaderStore((s) => s.order)
  const annoDirty = useReaderStore((s) => s.order.some((id) => s.tabs[id]?.dirty === true))
  const pendingByTab = useNotesStore(
    useShallow((s) => {
      const out: Record<string, boolean> = {}
      for (const id of tabIds) out[id] = s.noteByPaper[id]?.pending === true
      return out
    })
  )
  const notePending = tabIds.some((id) => pendingByTab[id] === true)
  return { annoDirty, notePending }
}

/**
 * [B4-A R2 §10.4] 活动 tab 命令状态投影（HistoryCommandState 单源装配——
 * reader-save-coordinator 的「协调器 ports」装配点：IO 输入经本模块 notes
 * 白名单取，busy 输入经协调器/历史命令取）：
 * - saveState=aggregateSaveUiState(IO+U)（§10.1 单源）；
 * - busy=finalize/操作层 history 在途（§10.4——普通写 saving 不置）；
 * - canSave=PDF ready ∧ 非冻结 ∧ 非 busy（#20 拒重复命令）；
 * - frozen=全局 quit 门 ∨ 活动 tab 关闭在途（§10.1「closing、quit gate 令保存/
 *   undo/redo 禁用」——与命令入口同判据，按钮禁用不另立口径）；
 * - canUndo/canRedo=操作层栈深度∧非冻结（#12 no-op 判据=栈空/PDF 未 ready/
 *   冻结；canRedo 投影含未提交输入的细粒度面归文本控制器本地——B5 工具栏接线时
 *   随 L1 补全订阅面，本阶段消费方〔ReaderNotesPanel 保存钮〕只读 saveState）。
 * 命令实现=reader-save-coordinator（saveActiveTab/undo/redo——§10.4 布尔
 * 结果=完整动作成功）。
 */
export function useActiveTabCommandState(): HistoryCommandState {
  const activeId = useReaderStore((s) => s.activeId)
  const tab = useReaderStore((s) => {
    const id = s.activeId
    return id === null ? undefined : s.tabs[id]
  })
  const note = useNotesStore((s) => (activeId === null ? undefined : s.noteByPaper[activeId]))
  // §10.4 busy=finalize/history 在途（普通写 saving 不置——命令互斥判据）
  const busy = activeId !== null && (finalizeInFlight(activeId) || opHistoryInFlight(activeId))
  // §10.1 saving=保存对象写机械在途（finalize/flush/history——含在途普通写）
  const writeInFlight = busy || note?.saving === true
  const frozen = quitWriteBlocked() || (activeId !== null && tabWriteBlocked(activeId))
  const ready = tab?.status === 'ready'
  return {
    saveState: aggregateSaveUiState({
      busy: writeInFlight,
      error: tab?.dirty === true || note?.saveFailed === true,
      pending: note?.pending === true,
      unfinalized: tab?.unfinalized === true
    }),
    canSave: activeId !== null && ready && !busy && !frozen,
    canUndo: activeId !== null && !frozen && stackDepth(activeId) > 0,
    canRedo: activeId !== null && !frozen && redoDepth(activeId) > 0,
    busy
  }
}

/**
 * [回炉 B-1] 切 tab flush-first（§2.5 #31）：激活目标 tab 前对**离场篇**定向
 * flushNow 立存（fire-first 不阻切换——切换不卸 notes.store 草稿，写后台完成；
 * 含 1.5s 空闲窗在排态即写）。失败=灰点/pending 镜像可见（不弹窗不阻断，重试
 * 径=四态钮）。[F-VISFB-15 ①面1] 离场篇挂载编辑器（恒属活动篇=departing）同窗
 * fire-first 全量句柄立存（un-attempted dirty 不随编辑器卸载丢值；不阻切换）。
 * §2.5 #31：两 tab 栈/U 均不动（切换不是定稿）。
 */
export function switchTabFlushFirst(targetId: string): void {
  // [F-VISFB-64] closing gate：冻结期切 tab 命令整体拒绝（含激活位变更——
  // 冻结窗 ms 级，用户点击丢失可接受；写面不被离场 flush 触发）
  if (quitWriteBlocked()) return
  const departing = useReaderStore.getState().activeId
  if (departing !== null && departing !== targetId) {
    void useNotesStore.getState().flushNow(departing).catch(() => undefined)
    fireAllDraftFlushes()
  }
  useReaderStore.getState().activateTab(targetId)
}
