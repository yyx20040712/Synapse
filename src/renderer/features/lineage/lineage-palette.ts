// b3: T3-P7A
/**
 * [T3-P7A] 子线型轮转调色板——用户数据常量（D-17）。
 *
 * hex 值=**用户数据面**（graph.lineTypes.color 持久值的预设候选，非组件
 * chrome 色——渲染 chrome 色仍全 token，边界见 D-17/check-quality 口径：
 * 色值字面量负锚域=CSS 消费面+tsx inline 面，本件为 .ts 数据常量不入锚）。
 * 消费方=P7b EdgeTypePopover「＋新建线型」预览轮转：索引 i=组内
 * subs.length（D-10 按组单调；删除后色复用=接受备案）。
 */
export const PALETTE = [
  '#3a5bd9',
  '#0f8a6d',
  '#c07a2a',
  '#8a4fbf',
  '#d4495c',
  '#2a7bd4',
  '#6d7a0f',
  '#7a5c2e'
] as const

/** 线纹轮转（实线/虚线/点线——与基础型 D-18 三线型同族值） */
export const DASH_ROT = ['', '6 3', '2 3'] as const
