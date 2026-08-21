/**
 * 标注（Annotation）模型 —— 位置采用 W3C Web Annotation Data Model 思路（契约，已冻结）。
 *
 * 定位三要素（重开文档后高亮必须回到原位的依据）：
 * - quote/prefix/suffix：文本引文定位器（textQuote），排版变化也能恢复
 * - startOffset/endOffset：文本层偏移定位器（textPosition，页内序）
 * - rects：归一化矩形（0..1，相对页高宽），负责视觉渲染
 * - sortKey：文档序排序键（格式 "页码:序号"，同页多标注稳定排序）
 */
import { z } from 'zod'
import { ANNOTATION_COLORS } from '../constants'

export const annotationKindSchema = z.enum(['highlight', 'underline', 'note'])
export type AnnotationKind = z.infer<typeof annotationKindSchema>

export const annotationColorSchema = z.enum(ANNOTATION_COLORS)
export type AnnotationColor = z.infer<typeof annotationColorSchema>

export const annotationRectSchema = z
  .object({
    page: z.number().int().min(0),
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    w: z.number().min(0).max(1),
    h: z.number().min(0).max(1)
  })
  .strict()
export type AnnotationRect = z.infer<typeof annotationRectSchema>

export const annotationSchema = z
  .object({
    id: z.string().min(1),
    paperId: z.string().min(1),
    page: z.number().int().min(0),
    kind: annotationKindSchema,
    color: annotationColorSchema,
    quoteText: z.string(),
    prefixText: z.string(),
    suffixText: z.string(),
    startOffset: z.number().int().min(0),
    endOffset: z.number().int().min(0),
    rects: z.array(annotationRectSchema),
    comment: z.string(),
    createdAt: z.string(),
    updatedAt: z.string()
  })
  .strict()
export type Annotation = z.infer<typeof annotationSchema>

/** 新建标注输入（id/paperId/时间戳由 repo 生成；paperId 是 insert 的独立参数） */
export const annotationInputSchema = annotationSchema
  .omit({ id: true, paperId: true, createdAt: true, updatedAt: true })
  .strict()
export type AnnotationInput = z.infer<typeof annotationInputSchema>
