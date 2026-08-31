/**
 * 标注呈现公共样式 —— 色板变量与中文标签的单一出处。
 *
 * 消费方：ReaderToolbar 色点 / SelectionLayer 工具条 / AnnotationLayer 色块
 * （第 3 处需求触发抽取，Rule of Three）。取色只允许走 theme.css 的
 * --annotation-* 变量（与 shared/constants 的 ANNOTATION_COLORS 一一对应），
 * 禁止散落硬编码色值。
 */
import type { AnnotationColor, AnnotationKind, AnnotationRect } from '@shared/models/annotation'
import type { CSSProperties } from 'react'

export const COLOR_SWATCH: Record<AnnotationColor, string> = {
  yellow: 'var(--annotation-yellow)',
  green: 'var(--annotation-green)',
  blue: 'var(--annotation-blue)',
  red: 'var(--annotation-red)',
  purple: 'var(--annotation-purple)'
}

export const COLOR_LABEL: Record<AnnotationColor, string> = {
  yellow: '黄',
  green: '绿',
  blue: '蓝',
  red: '红',
  purple: '紫'
}

/** F-11 下偏修正：顶/底收边比例（占矩形高）——clientRects 行盒贴的是 CSS
 *  回退字体墨带而非 PDF 真实字形带：量测实锤（scripts/audits/r2-f11-out，
 *  真机 6.38px 行）底缘悬至基线下 ~1.5px（回退 sans 的 descent 带=「标注
 *  下偏」真身）、顶缘高出字形顶 ~1.3px。顶收 10%/底收 12% 后高亮带≈
 *  [字形顶, 基线+descender 尾]；下划线底缘同口径。持久化 rects 数据零改
 *  （纯渲染侧），划选保存/重锚两路径同走本单点。
 *  [F-A4 b②] 定值分数=缺省兜底路径：渲染侧行盒自适应 band（该行簇 span
 *  实测盒+canvas 字体度量推算的字形带——annotation-resolve 注入）在场时
 *  顶贴字形顶缘底贴底缘（用户理想状态「矩形高度与位置匹配文字」）；band
 *  缺省（存量 rects/不可量测环境/jsdom）回退本分数语义。 */
const TRIM_TOP = 0.1
const TRIM_BOTTOM = 0.12

/** [F-A4] 行盒自适应字形带（归一化域顶/底——annotation-resolve 产出） */
export interface GlyphBand {
  top: number
  bottom: number
}

/** 百分比串（4 位小数舍入——吞浮点尾差，产干净内联样式值） */
function pct(v: number): string {
  return `${Number((v * 100).toFixed(4))}%`
}

/** kind+color+归一化矩形 → 色块样式（自 AnnotationLayer 迁入——组件行数
 *  防线；荧光笔语义：multiply 混合下色块不透明；下划线为收边后底缘 2px 实条）。
 *  band 在场=行盒自适应（F-A4 b②：highlight 顶=band.top/高=band.bottom−
 *  band.top；underline 实条贴 band.bottom 上方 2px）；缺省=F-11 分数路径。 */
export function rectStyle(
  kind: AnnotationKind,
  color: AnnotationColor,
  r: AnnotationRect,
  band?: GlyphBand
): CSSProperties {
  const base: CSSProperties = {
    left: `${r.x * 100}%`,
    width: `${r.w * 100}%`,
    background: COLOR_SWATCH[color],
    pointerEvents: 'auto',
    cursor: 'pointer'
  }
  if (kind === 'underline') {
    return {
      ...base,
      top: band !== undefined ? `calc(${pct(band.bottom)} - 2px)` : `calc(${(r.y + r.h * (1 - TRIM_BOTTOM)) * 100}% - 2px)`,
      height: '2px',
      opacity: 1
    }
  }
  if (band !== undefined) {
    return {
      ...base,
      top: pct(band.top),
      height: pct(band.bottom - band.top),
      opacity: 1
    }
  }
  return {
    ...base,
    top: `${(r.y + r.h * TRIM_TOP) * 100}%`,
    height: `${r.h * (1 - TRIM_TOP - TRIM_BOTTOM) * 100}%`,
    opacity: 1
  }
}
