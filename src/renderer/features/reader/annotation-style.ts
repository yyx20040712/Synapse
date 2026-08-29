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
 *  （纯渲染侧），划选保存/重锚两路径同走本单点。 */
const TRIM_TOP = 0.1
const TRIM_BOTTOM = 0.12

/** kind+color+归一化矩形 → 色块样式（自 AnnotationLayer 迁入——组件行数
 * 防线；荧光笔语义：multiply 混合下色块不透明；下划线为收边后底缘 2px 实条） */
export function rectStyle(
  kind: AnnotationKind,
  color: AnnotationColor,
  r: AnnotationRect
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
      top: `calc(${(r.y + r.h * (1 - TRIM_BOTTOM)) * 100}% - 2px)`,
      height: '2px',
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
