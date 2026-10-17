// b3: P7-H
/**
 * [F-VISFB-62] lineage-note-geom —— 悬浮笔记 UI 几何/门域辅助件（组件 250
 * 行红线拆件面；LineageFloatingNotes/use-note-drag 两消费方共用单源）。
 * - NOTE_W/NOTE_H：笔记默认占位（own px——inline 宽/最小高+钳制基值；
 *   实际高随内容）；
 * - NOTE_GRIP_H：书签柄高（own px——y 钳制下限计入〔R6 柄贴顶可达：柄悬
 *   于笔记顶缘上方，贴顶 y=0 会被内容域上缘裁剪不可命中〕；单源=本常量
 *   经组件 grip inline top/height 直注，皮肤不落高度字面量〔theme-lineage-
 *   notes .tl-note-grip 注双向锚定——S3 声明统一：CSS 变量法已弃〕）；
 * - notesInteractive：交互门单读（edit 模式+select 工具且非 saving
 *   〔R4：saving 窗口让位防静默 no-op 丢稿〕——view.store+lineage.store
 *   单源，判定时点取值，native 监听/订阅两径共用）；
 * - toOwnPt：视口点→own 域（clientToOwnPt 单源——timeline-zoom 三域律；
 *   content 缺席防御回落原值）；
 * - clampToContent：钳内容域不丢失（[0, contentW−w]×[NOTE_GRIP_H,
 *   max(NOTE_GRIP_H, contentH−h)]——[S2] y 上界先与下限取 max：小内容域
 *   反压形（contentH−h<柄高）不产生 <柄高 落点+竖直死区；content
 *   offsetWidth/Height=own 域 layout 读数〔三域律 C 域，正交缩放〕；offset
 *   族 0=未量测形〔jsdom〕→右/下界不夹持，x≥0/y≥柄高下限恒钳）。
 */
import type { RefObject } from 'react'
import type { Pt } from './routing/anchors'
import { clientToOwnPt } from './timeline-zoom'
import { useLineageStore } from './lineage.store'
import { useLineageViewStore } from './lineage-view.store'

/** 笔记默认占位（own px——宽/最小高 inline 单源+创建钳制基值） */
export const NOTE_W = 220
export const NOTE_H = 96

/** [R6] 书签柄高（own px——y 钳制下限+grip inline top/height 单源；
 *  双向锚定：theme-lineage-notes.css .tl-note-grip 注） */
export const NOTE_GRIP_H = 14

/** 交互门单读（edit+select 且非 saving 才有创建菜单/拖动/编辑/删除交互面） */
export const notesInteractive = (): boolean => {
  const v = useLineageViewStore.getState()
  return v.mode === 'edit' && v.tool === 'select' && useLineageStore.getState().saveStatus !== 'saving'
}

/** 视口点→own 域（clientToOwnPt 单源——右键创建/拖动指针两消费面） */
export const toOwnPt = (contentRef: RefObject<HTMLDivElement | null>, clientX: number, clientY: number): Pt => {
  const c = contentRef.current
  if (c === null) return { x: clientX, y: clientY }
  return clientToOwnPt(c.getBoundingClientRect(), clientX, clientY)
}

/** 钳内容域不丢失（防笔记拖出域外不可寻回；y 下限=柄高〔R6〕；[S2] 上界
 *  先与下限取 max——小内容域反压不破下限不死区） */
export const clampToContent = (
  contentRef: RefObject<HTMLDivElement | null>,
  p: Pt,
  w: number,
  h: number
): Pt => {
  const c = contentRef.current
  const maxX = c !== null && c.offsetWidth > 0 ? Math.max(0, c.offsetWidth - w) : Number.POSITIVE_INFINITY
  // [S2] maxY 先与柄高下限取 max：contentH−h<柄高的反压形钳域单点化保底，
  // 不产生 <柄高 落点（竖直死区由上界抬升面在正常域自然消解）
  const maxY =
    c !== null && c.offsetHeight > 0
      ? Math.max(NOTE_GRIP_H, c.offsetHeight - h)
      : Number.POSITIVE_INFINITY
  return {
    x: Math.min(Math.max(p.x, 0), maxX),
    y: Math.min(Math.max(p.y, NOTE_GRIP_H), maxY)
  }
}
