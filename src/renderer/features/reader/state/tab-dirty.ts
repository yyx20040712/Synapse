// b3: P7-B
/**
 * [SR2-TABS-03] tab-dirty —— 灰点信号聚合（工单：open / strong）
 *
 * ── 行为层 ──
 * - 信号源两写面（B3 裁决 α 双层的 tab 粒度投影）：
 *   ① annotations 面：saveComment/saveAnnotation/deleteAnnotation 的 api 失败
 *     （即时持久化面的失败残留——失败后未重试即 dirty）
 *   ② notes 面：notes.store 的 pendingEdit/saveFailed（论文级总评未落库/保存失败）
 * - 聚合：isTabDirty(paperId, signals) → boolean（纯函数：任一写面 dirty 即真）；
 *   状态归 TabState.dirty（TABS-01 建位）——信号写入点在对应失败路径
 *   （AnnotationLayer 失败分支 / notes.store 状态镜像读取），成功重试后清除
 * - 消费：TabBar.tsx 灰点渲染 + 关闭脏 tab 二次确认（confirm 文案含文献名）+
 *   退出拦截上报（TABS-04 的 dirty 输入=tabs∪lineage：任一 tab dirty ∪
 *   lineage 保存态脏——LG-03 经 useLineageDirty 在 App.tsx 组合根聚合，
 *   本模块行为面零触碰）
 *
 * ── 接口层 ──
 * - export function isTabDirty(...): boolean（纯函数核心）
 * - 聚合钩子：useTabDirtyAggregate()——汇总所有 tab 的 dirty → 单布尔
 *   （TABS-04 退出拦截的上报源）
 *
 * ── 架构层 ──
 * - 纯逻辑模块（可测性）+ 钩子薄层；不 import 组件
 * - 接缝（本工单改动面，file:line）：AnnotationLayer.tsx:138-154（saveComment
 *   失败分支写 TabState.dirty）/ annotations 保存失败同族面（SelectionLayer.tsx
 *   save 失败 :158-161 / AnnotationLayer 删除失败 :169-185）/ notes.store.ts
 *   :176-217（saveSoon 失败状态镜像读取）/ TabBar.tsx 灰点+关闭确认 /
 *   reader.store.ts（TabState.dirty 信号写入路径，字段已由 TABS-01 建位）
 *
 * ── 生命周期层 ──
 * - 预留：P7-C 片段笔记写面并入（第三写面）；不做：脏内容 diff 粒度提示
 *
 * ── 文化层 ──
 * - 灰点不引入手动保存模式（autosave-first 数据安全，显式指示保可见性——
 *   B3/ROADMAP 红线条款）
 * - annotations 面清除语义=乐观清除（任一保存成功即清该面信号——失败 toast
 *   已即时提示，灰点是持续可见性提醒非数据保证，规约记录依据）
 * - notes 面 dirty=noteByPaper[paperId].pending（保存失败不清 pending——
 *   未落库与失败态一并涵盖）
 * - 测试：tests/unit/renderer/tab-dirty.test.tsx（受锁）：两写面各自 dirty/清除、
 *   聚合或语义、成功重试清除 + 组件级灰点渲染与关闭确认（tab-bar.test.tsx 扩展）
 */
import { useReaderStore } from './reader.store'
import { useNotesStore } from '../../notes/notes.store'
import { useShallow } from 'zustand/react/shallow'

/** 两写面信号包（isTabDirty 的纯函数输入） */
export interface TabDirtySignals {
  /** annotations 面保存失败残留（TabState.dirty） */
  annoDirty: boolean
  /** notes 面未落库编辑（含保存失败——失败不清 pending） */
  notesPending: boolean
}

/** 灰点判定：任一写面 dirty 即真（或聚合） */
export function isTabDirty(_paperId: string, signals: TabDirtySignals): boolean {
  return signals.annoDirty || signals.notesPending
}

/** 取某 tab 的两写面实时信号（getState 快照读——非响应式场景用） */
export function tabDirtySignals(paperId: string): TabDirtySignals {
  return {
    annoDirty: useReaderStore.getState().tabs[paperId]?.dirty ?? false,
    notesPending: useNotesStore.getState().noteByPaper[paperId]?.pending ?? false
  }
}

/** 退出拦截上报源：任一**已打开 tab** 任一写面 dirty → true（订阅两 store，响应式）。
 *  notes 面扫描限定在 reader.store 的 tab 键集内——已关闭 tab 的 pending 草稿
 *  残留（noteByPaper 不驱逐）不产生退出误报。
 *  annoAny 布尔 selector 每次 set 重算后经 Object.is 比较——多 dirty 清一仍 true
 *  不重渲染属正确（值未变），非短路陷阱（r2 NIT 注记） */
export function useTabDirtyAggregate(): boolean {
  const tabIds = useReaderStore((s) => s.order)
  const noteByPaper = useNotesStore((s) => s.noteByPaper)
  const annoAny = useReaderStore((s) => s.order.some((id) => s.tabs[id]?.dirty === true))
  return annoAny || tabIds.some((id) => noteByPaper[id]?.pending === true)
}

/** [T3-U1] 已打开 tab 数（响应式）——状态条自动保存槽的「可写面在场」判定
 *  源（App 组合根聚合注入 StatusBar；与 useTabDirtyAggregate 同源订阅 order，
 *  App 经本 reader 域 facade 取 tab 面，不直引 reader.store） */
export function useTabOpenCount(): number {
  return useReaderStore((s) => s.order.length)
}

/**
 * [T3-U1 回炉 R2/W3 终裁] tab dirty 双源分档（响应式）——状态条自动保存槽
 * 的语义拆分源（App 组合根消费；沿 useTabDirtyAggregate 同源订阅与同款
 * notes 面扫描限定=reader.store 的 tab 键集内）：
 * - annoDirty：annotations 面 api 失败残留（TabState.dirty——真失败）→error 档
 * - notePending：notes 面 pendingEdit 镜像（edit 置 true/save 成功清/失败不动
 *   =在途+失败混合，打字防抖窗常 true）→saving 档「保存中…」=未落库统称
 * ——useTabDirtyAggregate（布尔或聚合，quitDirty/TabBar 消费面）零触碰。
 */
export interface TabDirtySignalPair {
  annoDirty: boolean
  notePending: boolean
}

export function useTabDirtySignals(): TabDirtySignalPair {
  const tabIds = useReaderStore((s) => s.order)
  const noteByPaper = useNotesStore((s) => s.noteByPaper)
  const annoDirty = useReaderStore((s) => s.order.some((id) => s.tabs[id]?.dirty === true))
  const notePending = tabIds.some((id) => noteByPaper[id]?.pending === true)
  return { annoDirty, notePending }
}

/** notes 面草稿字典（pending 镜像）的响应式转手——TabBar 等消费方经本聚合器
 * 订阅（本模块是 reader 域唯一 notes.store 引用点，check-quality 白名单例外）。
 *  只投影 pending 布尔并 useShallow 比较：打字期的 contentMd 变化不触发
 *  TabBar 重渲染（pending 值不变即浅等） */
export function useNotesDrafts(): Record<string, boolean> {
  return useNotesStore(
    useShallow((s) =>
      Object.fromEntries(Object.entries(s.noteByPaper).map(([k, d]) => [k, d.pending]))
    )
  )
}

/**
 * 关闭脏 tab 守门（[F-VISFB-14] 起语义=**显式放弃路径**——confirmCloseDirty 由
 * requestCloseTab 的 flush 失败分支调用；clean 直通短路沿承）：clean 直接
 * 放行；dirty 弹 confirm（文案含文献名）——取消不放行/确认放行。
 * 兼任弃改收口点（A3 悬置写修票/INV-35④/INV-50）：守门通过（confirm 返回
 * true 或 clean 直通——两路汇合处）即 discardPendingEdit 弃置该篇 notes
 * 悬置编辑（clean 直通=no-op 幂等），确认丢弃后 ≤1.5s 防抖不得再落笔 DB。
 * **一切 tab 关闭路径必经守门族**（requestCloseDirty→confirmCloseDirty；
 * TabBar 双点两位在案——关闭叉与 Delete 键；未来新增关闭路径同此约束
 * ——接缝归责）。reader.store.closeOne 不直接接：reader.store 无法直引
 * notes.store（白名单外）且反向接会成 import 环，守门内收口=单点覆盖全部
 * 关闭路径。
 */
export function confirmCloseDirty(paperId: string): boolean {
  const tab = useReaderStore.getState().tabs[paperId]
  // 标题与 TabBar tabTitle 同型：title 优先（文献名——缺陷②），空 title 兜底
  // fileName 去扩展名，fileName 亦空（tab 缺失/异常）兜底 paperId
  const fileNameTitle = tab === undefined || tab.fileName === '' ? paperId : tab.fileName.replace(/\.pdf$/i, '')
  const title = tab !== undefined && tab.title !== '' ? tab.title : fileNameTitle
  // clean 直通短路（不弹窗）；dirty 走 confirm——两路在 allow 汇合。
  // [F-VISFB-14 d1 W4③] 失败分支交互文案（同族改值——flush-first 后本框只在
  // 「自动保存失败/门控/annotations 残留」分支出现；重试径=四态钮 failed）
  const allow = !isTabDirty(paperId, tabDirtySignals(paperId)) || window.confirm(`「${title}」有修改未能自动保存。确认关闭并放弃这部分修改？`)
  if (allow) {
    // 弃改收口：守门通过即弃置该篇悬置编辑（含在途 save 的代际守卫打点）
    useNotesStore.getState().discardPendingEdit(paperId)
  }
  return allow
}

/** [F-VISFB-14] 关 tab 异步重入锁（d1 W4②）：值=该篇关闭收口在途（连点关闭
 *  叉第二击防护——单 flush 单收口） */
const closingTabs = new Set<string>()

/**
 * [F-VISFB-14] 关 tab flush-first（C-A3 翻案落法——主控裁决④）：
 * - clean → 放行（discard 幂等收口沿承——A3 语义）；
 * - dirty → flushNow 立存最新值（INV-141①普通 dirty 转可等待立存——防抖
 *   timer 通道不承接关 tab 面）→ 净=放行（**零弹窗**：成功才关闭）；
 * - 仍脏（保存失败/首载门控 INV-141②/annotations 面残留）→ confirmCloseDirty
 *   显式放弃路径：确认=discard+放行/取消=不放行（tab 保持，失败态经四态钮
 *   failed+短文本可点重试呈现——INV-141⑤单源）；
 * - 重入锁：本篇收口在途的第二击立即 false（不二次 flush 不弹窗）。
 * 批注挂载编辑器不经此面（卸载注册承接——12 号；未尝试 dirty 残余=14 票
 * D1 呈报面，见批次报告）。
 */
export async function requestCloseTab(paperId: string): Promise<boolean> {
  if (closingTabs.has(paperId)) return false
  if (!isTabDirty(paperId, tabDirtySignals(paperId))) {
    useNotesStore.getState().discardPendingEdit(paperId)
    return true
  }
  closingTabs.add(paperId)
  try {
    await useNotesStore.getState().flushNow(paperId)
    if (!isTabDirty(paperId, tabDirtySignals(paperId))) return true
    return confirmCloseDirty(paperId)
  } finally {
    closingTabs.delete(paperId)
  }
}
