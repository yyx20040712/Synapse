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

/** 标注弹层小按钮类名串（[F-LINT-03] reader 域单源——AnnotationEditor/
 *  AnnotationMenu 两处同值本地声明退役；同一视觉元件族：弹层内动作小按钮） */
export const ANNOTATION_BTN_CLASS = 'rounded border px-2 py-0.5 text-xs disabled:opacity-50'

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

/** [F-A5] band → 垂直几何（top/height 百分比——三消费点同源映射：
 *  rectStyle 标注块/SelectionPaint 自绘块/AiAnnotationLayer AI 段） */
export function bandVertical(band: { top: number; bottom: number }): { top: string; height: string } {
  return { top: pct(band.top), height: pct(band.bottom - band.top) }
}

/** [F-A5 a 面] 自绘块水平界=行簇 span 实际端点：rect 越出簇 [x0,x1] → 左右
 *  夹入（票面 §0a「水平左右越出文字区」根治）；端点缺省/退化 → 原样透传 */
export function clampedHorizontal(
  r: AnnotationRect,
  band?: { x0?: number; x1?: number }
): { left: string; width: string } {
  if (band?.x0 === undefined || band.x1 === undefined || band.x1 <= band.x0) {
    return { left: `${r.x * 100}%`, width: `${r.w * 100}%` }
  }
  const left = Math.max(r.x, band.x0)
  const right = Math.min(r.x + r.w, band.x1)
  if (right <= left) {
    return { left: `${r.x * 100}%`, width: `${r.w * 100}%` }
  }
  return { left: `${left * 100}%`, width: `${(right - left) * 100}%` }
}

/** kind+color+归一化矩形 → 色块样式（自 AnnotationLayer 迁入——组件行数
 *  防线；[F-A5/ADR-0019 R2] 色块=背景板语义：canvas 透明底墨带恒在色块上
 *  （文字纯黑），色块 normal 混合不透明；下划线为收边后底缘 2px 实条）。
 *  band 在场=行盒自适应（F-A4 b②：highlight 顶=band.top/高=band.bottom−
 *  band.top——F-A5 起经 bandVertical 单源；underline 实条贴 band.bottom
 *  上方 2px）；缺省=F-11 分数路径。 */
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
      ...bandVertical(band),
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
