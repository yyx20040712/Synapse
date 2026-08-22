/**
 * 标注呈现公共样式 —— 色板变量与中文标签的单一出处。
 *
 * 消费方：ReaderToolbar 色点 / SelectionLayer 工具条 / AnnotationLayer 色块
 * （第 3 处需求触发抽取，Rule of Three）。取色只允许走 theme.css 的
 * --annotation-* 变量（与 shared/constants 的 ANNOTATION_COLORS 一一对应），
 * 禁止散落硬编码色值。
 */
import type { AnnotationColor } from '@shared/models/annotation'

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
