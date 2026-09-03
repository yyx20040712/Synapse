/**
 * [F-A6-b2] page-items.store —— 页项注册表（R-迁移下钻通道 C1 的单源宿主）。
 *
 * **通道设计理由（票面 §1-C 头注声明义务）**：选区所在页的
 * {items,styles,geometry,box} 需到达 SelectionLayer 的 evaluate，而两者挂载位
 * 不同构（PagesOverlay=PdfDocProvider 内页列装配；SelectionLayer=ReaderPage
 * 内容级稳定包装盒 N4——滚动中锚定页切换不重挂）。三约束：①单源（不得出现
 * 两份页项注册表）——本模块=唯一注册表，PagesOverlay 的 pageTexts useState
 * **整体迁入**（TextLayer 挂载渲染与 SelectionLayer 读数共用一表，写入点仍
 * 唯一=PagesOverlay handlePageRender）；②SelectionLayer 按选区所在页动态取
 * （evaluate 时刻 getState() 非订阅——zoom 现读、viewport 每次现构，项几何
 * 不随 zoom 缓存=缩放不变零重算）；③不破坏既有挂载语义（PagesOverlay 七件
 * 行为/SelectionLayer N4 稳定盒均零变——本通道只替存储位不改组件拓扑）。
 * 备选方案否决记录：reader.store 加域（页项是 per-文档渲染域，混入 per-tab
 * 状态形状域不亲和）；装配根经 props 回传（PagesOverlay props 面变化会拖动
 * 受锁 pages-overlay.test 的九 props 透传锚，且 drop/clear 双向通知面冗余）。
 *
 * ── 行为层 ──
 * - 形状：pages: Record<页号(1 基), PageItemEntry>；setEntry/drop/clear 三写口
 *  （写者唯 PagesOverlay：回报写入/卸载哨同删/换文献清空——三语义与原
 *  pageTexts useState 完全同构，纯存储位迁移零行为变）
 * - 生命周期对齐原 useState：条目只随渲染页存在（PageFrame 回收哨同删——
 *  INV-30）；换文献（fileUrl 效应）整表清空
 *
 * ── 接口层 ── / ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - export const usePageItemsStore（zustand——react 订阅渲染 + getState()
 *   事件时刻直读双形态单模块）；PageItemEntry 类型单源（原 PagesOverlay
 *  PageText 迁入，字段零变）
 * - 只 import 类型（PdfPageCanvas——INV-16 白名单不扩）；零 DOM/React 组件
 *   依赖；zustand 既有依赖零新增
 * - 单阅读器单实例前提（App 至多一个 PagesOverlay 挂载——多 tab 切换走
 *  fileUrl 清空重填，与原 useState 生命周期等价）
 * - tests/unit/renderer/pages-overlay.test.tsx（注册表行为锁——迁库后语义
 *  零变应全绿）+ selection-item-chain.test.tsx（通道接线面）
 */
import { create } from 'zustand'
import type { PdfPageGeometry, PdfTextContent } from './PdfPageCanvas'

/** 页项条目（原 PagesOverlay.PageText 迁入——成对更新契约字段零变：
 *  页号 1 基 + 文本载荷 + 页几何 + 该页 canvas CSS 盒） */
export interface PageItemEntry {
  page: number
  text: PdfTextContent
  /** F-A6-b1 T1/T9 通道：渲染回报的页几何（rotate/view）——TextLayer 与
   *  项几何 viewport 同源真值 */
  geometry: PdfPageGeometry
  box: { w: number; h: number }
}

interface PageItemsStore {
  pages: Record<number, PageItemEntry>
  setEntry(entry: PageItemEntry): void
  drop(no: number): void
  clear(): void
}

export const usePageItemsStore = create<PageItemsStore>()((set) => ({
  pages: {},
  setEntry: (entry) => set((s) => ({ pages: { ...s.pages, [entry.page]: entry } })),
  drop: (no) =>
    set((s) => {
      if (s.pages[no] === undefined) return s
      const next = { ...s.pages }
      delete next[no]
      return { pages: next }
    }),
  clear: () => set({ pages: {} })
}))
