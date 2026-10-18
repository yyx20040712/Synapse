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
import { allDraftFlushHandles, discardAnnotationDraft, fireAllDraftFlushes } from '../interact/annotation-draft-registry'
import type { AnnotationDraftFlush } from '../interact/annotation-draft-registry'
import { useShallow } from 'zustand/react/shallow'
import { quitWriteBlocked } from '../../../app/quit-closing-gate'

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
  // [F-VISFB-64] closing gate：退出握手冻结期 tab 关闭用户命令拒绝（冻结面=
  //   设计 §④「annotations 句柄、tab dirty——挂载/卸载用户命令」）
  if (quitWriteBlocked()) return false
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
    // [回炉 W-3] 完整弃改（INV-50 同族——主控裁定语义）：按篇清批注注册表
    // 残留（12 号删除链「先清册」同语义；tab.annotations id 集=该篇注册键
    // 全集——编辑目标恒出自该清单，addAnnotation 同步进表）
    for (const a of tab?.annotations ?? []) {
      discardAnnotationDraft(a.id)
    }
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
 * [F-VISFB-15 ①面2] ACTIVE tab 关闭扩面：挂载编辑器（恒属活动篇）的
 * un-attempted dirty（<800ms 防抖窗内值——INV-141④ 不入注册表面，14 票 D1
 * 残余面 2）在 flushNow 后 **await** 全量挂载句柄立存（clean 编辑器 no-op；
 * 撞 busy=F-VISFB-15② 等待 settle 后真实终态）；句柄终态非 saved/clean 计入
 * 仍脏（markTabDirty——annotations 面失败残留信号单源）→confirmCloseDirty
 * 显式放弃路径承接；关非活动 tab 零消费（无挂载编辑器——不得被活动篇句柄
 * 失败误入仍脏，D1 残余面 5 现状沿承）。
 */
export async function requestCloseTab(paperId: string): Promise<boolean> {
  // [F-VISFB-64] closing gate：冻结期关 tab 命令整体拒绝（不触发 flush 写面）
  if (quitWriteBlocked()) return false
  if (closingTabs.has(paperId)) return false
  // [F-VISFB-15 ①面2] ACTIVE tab（挂载编辑器所在篇）clean 两写面净也须经
  // 句柄收口（un-attempted dirty 不在两写面信号内）；非活动 tab 无挂载编辑
  // 器——clean 直通短路沿承
  if (!isTabDirty(paperId, tabDirtySignals(paperId)) && useReaderStore.getState().activeId !== paperId) {
    useNotesStore.getState().discardPendingEdit(paperId)
    return true
  }
  closingTabs.add(paperId)
  try {
    try {
      await useNotesStore.getState().flushNow(paperId)
    } catch {
      // [回炉 W-4] flushNow rejection（api 同步抛/未预期异常）=收口失败——按
      // 仍脏走显式放弃路径（禁未处理 rejection；成功分支逻辑零变）
    }
    // [F-VISFB-15 ①面2] 关 consumption 时现判活动位（flushNow 在途窗内可能
    // 已切 tab——彼时句柄属新活动篇，面 1 挂点已承接，不在此误消费）
    if (useReaderStore.getState().activeId === paperId) {
      await flushMountedDraftHandles(paperId)
    }
    if (!isTabDirty(paperId, tabDirtySignals(paperId))) return true
    return confirmCloseDirty(paperId)
  } finally {
    closingTabs.delete(paperId)
  }
}

/**
 * [F-VISFB-15 ①面2·回炉 R1] ACTIVE tab 关闭的挂载句柄 await 收口——**复扫
 * 收敛循环**（一次性快照在 await 窗内漏新编辑目标〔切 Y+<800ms 输入→Y
 * un-attempted 逃逸=丢稿窗〕）：
 * - 每轮快照全量句柄 flush（clean=no-op 零写；全 {saved,clean} 且无新句柄=
 *   稳定止）；
 * - 续轮条件=出现新句柄（await 窗内新编辑目标挂载——按句柄身份对累积 seen
 *   集判新）∨本轮现 dirty/saving 终态（有待写未收敛——下轮重 flush 全量，
 *   clean 编辑器幂等 no-op）；
 * - failed=即停 markTabDirty（仍脏→confirmCloseDirty 显式放弃路径承接）；
 * - 轮上限 3——达顶仍有 dirty/saving/新句柄未收敛→markTabDirty 按仍脏走
 *   显式放弃路径（禁静默放行）；
 * - 句柄异常/同步 throw 归 'failed' 映射（回炉 R3——Promise.resolve().then
 *   形，quit-flush.ts:40 先例）；
 * - [回炉2 k1 W-1] 每轮顶部 activeId 守卫：窗内切走即停（≠paperId 直返——
 *   面1 挂点已消费离场篇；close 不越权消费新活动篇句柄、失败不误归关篇）；
 * - 残余=末轮 await 窗内新输入（毫秒级——收口面无并发输入的工程假设内）。
 */
async function flushMountedDraftHandles(paperId: string): Promise<void> {
  const seen = new Set<AnnotationDraftFlush>()
  for (let round = 0; round < 3; round++) {
    // [回炉2 k1 W-1] 每轮顶部重读活动位：关 A 在途窗内切 Y 时面1 挂点已在
    // 切换刻 fire-first 消费离场篇句柄——close 路径不越权消费新活动篇句柄
    // （已消费轮的失败仍归 A：快照时 active===A⇒句柄属 A；直返而非坠入达顶
    // markTabDirty——在途写的落库/失败归因由写路径自身链承接）
    if (useReaderStore.getState().activeId !== paperId) {
      return
    }
    const handles = allDraftFlushHandles()
    for (const h of handles) {
      seen.add(h)
    }
    const states = await Promise.all(
      handles.map((flush) => Promise.resolve().then(() => flush()).then((s) => s, () => 'failed'))
    )
    if (states.some((s) => s === 'failed')) {
      useReaderStore.getState().markTabDirty(paperId)
      return
    }
    const unsettled = states.some((s) => s === 'dirty' || s === 'saving')
    const fresh = allDraftFlushHandles().some((h) => !seen.has(h))
    if (!unsettled && !fresh) {
      return
    }
  }
  // [轮2补遗 W-1 收尾] post-loop 达顶归因前复检活动位：末轮 await 窗内切走
  // （新句柄 fresh 续轮耗尽形）≠paperId 即直返——A 自身态判定承接不误归因
  // （与轮内守卫同语义；failed 即停路径不动：快照归属正确）
  if (useReaderStore.getState().activeId !== paperId) {
    return
  }
  useReaderStore.getState().markTabDirty(paperId)
}

/**
 * [回炉 B-1] 切 tab flush-first（任务书 §0-1「切 tab/关 tab 未保存内容=立即
 * 保存」票面明文——主控裁定：notes 域切 tab 收口≠D1 残余，D1=批注编辑器
 * 挂载面）：激活目标 tab 前对**离场篇**定向 flushNow 立存（fire-first 不阻
 * 切换——切换不卸 notes.store 草稿，写后台完成；含 600s 防抖在排态即写）。
 * 失败=灰点/pending 镜像可见（不弹窗不阻断，重试径=四态钮）。
 * 重入防护=flushNow 自身在途收敛+串行（并发切回再切走时最新值经「等在途→
 * 仍 pending→saveNow 立存」链覆盖——与关 tab 族同语义；无弹窗/关闭语义，
 * 不设 UI 级锁）。
 * [F-VISFB-15 ①面1] 离场篇挂载编辑器（恒属活动篇=departing）同窗 fire-first
 * 全量句柄立存（D1 残余面 1 收口——un-attempted dirty 不随编辑器卸载丢值；
 * 不阻切换；失败=句柄 failed→卸载注册承接重挂载重试，12 号机制在场）。
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
