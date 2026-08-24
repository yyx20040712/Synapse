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
 *   退出拦截上报（SR2-TABS-04 的 dirty 输入=任一 tab dirty）
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
import { useNotesStore } from '../notes/notes.store'
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
 *  残留（noteByPaper 不驱逐）不产生退出误报（deepseek 一审 W1 处置）。
 *  annoAny 布尔 selector 每次 set 重算后经 Object.is 比较——多 dirty 清一仍 true
 *  不重渲染属正确（值未变），非短路陷阱（r2 NIT 注记） */
export function useTabDirtyAggregate(): boolean {
  const tabIds = useReaderStore((s) => s.order)
  const noteByPaper = useNotesStore((s) => s.noteByPaper)
  const annoAny = useReaderStore((s) => s.order.some((id) => s.tabs[id]?.dirty === true))
  return annoAny || tabIds.some((id) => noteByPaper[id]?.pending === true)
}

/** notes 面草稿字典（pending 镜像）的响应式转手——TabBar 等消费方经本聚合器
 * 订阅（本模块是 reader 域唯一 notes.store 引用点，check-quality 白名单例外）。
 *  只投影 pending 布尔并 useShallow 比较：打字期的 contentMd 变化不触发
 *  TabBar 重渲染（pending 值不变即浅等——deepseek r2 WARN 处置） */
export function useNotesDrafts(): Record<string, boolean> {
  return useNotesStore(
    useShallow((s) =>
      Object.fromEntries(Object.entries(s.noteByPaper).map(([k, d]) => [k, d.pending]))
    )
  )
}

/**
 * 关闭脏 tab 守门：clean 直接放行；dirty 弹 confirm（文案含文献名）——
 * 取消不放行/确认放行。TabBar 关闭叉的唯一入口。
 */
export function confirmCloseDirty(paperId: string): boolean {
  const tab = useReaderStore.getState().tabs[paperId]
  const title = tab === undefined || tab.fileName === '' ? paperId : tab.fileName.replace(/\.pdf$/i, '')
  if (!isTabDirty(paperId, tabDirtySignals(paperId))) {
    return true
  }
  return window.confirm(`「${title}」有未保存的修改（灰点标记），关闭后将丢失未落库部分。确认关闭？`)
}
