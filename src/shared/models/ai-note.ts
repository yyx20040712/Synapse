/**
 * AI 笔记（AiNote）模型 —— ai_notes 表的跨进程单源契约（AI-01 交付面，已锁定）。
 *
 * 一行=一锚定段×一问（N2 粒度，ADR-0015）；自持锚定三元组与 annotations 解耦
 * （D3：AI 语料不污染用户标注 schema）。
 * 接缝锚定（INV-11）：role 枚举真相=迁移 003 DDL CHECK
 * （src/main/db/migrations/003_ai_notes.sql）；本文件 zod 枚举为镜像消费——
 * 两处值集必须一致，扩展 role 需新迁移+[locked-change]。
 * question 取值 'Q1'..'Q7'|'divergence'（七问 v1 冻结，蓝图 §4.2）——DDL 侧
 * 不加 CHECK（扩展性优先），本 zod 层为应用边界校验单源；七问枚举扩展
 * =[locked-change]（本文件受锁）。
 */
import { z } from 'zod'

/** role 枚举镜像（真相=迁移 003 DDL CHECK——见文件头注接缝锚定） */
export const AI_NOTE_ROLES = ['first-read', 'second-read', 'adjudicate'] as const
export type AiNoteRole = (typeof AI_NOTE_ROLES)[number]

/** question 枚举（七问 v1 冻结；divergence=裁决者分歧报告节） */
export const AI_NOTE_QUESTIONS = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'divergence'] as const
export type AiNoteQuestion = (typeof AI_NOTE_QUESTIONS)[number]

export const aiNoteSchema = z
  .object({
    id: z.string().min(1),
    paperId: z.string().min(1),
    /** 可空：挂标注的段级语料 ∥ null=篇级语料（级联语义=annotation 删 SET NULL） */
    annotationId: z.string().min(1).nullable(),
    role: z.enum(AI_NOTE_ROLES),
    question: z.enum(AI_NOTE_QUESTIONS),
    model: z.string().min(1),
    quoteText: z.string(),
    prefixText: z.string(),
    suffixText: z.string(),
    /** AI 报告的页码（1 基，辅助定位——corpus p.N 显示口径同）；可空。
     *  基准接缝（与 INV-24 的 Annotation.page 0 基存储不同源）：anchor_page
     *  仅辅助定位/人读，非排序键——AI 装配段排序规约归 AI-03 工单。 */
    anchorPage: z.number().int().min(1).nullable(),
    contentMd: z.string(),
    createdAt: z.string(),
    updatedAt: z.string()
  })
  .strict()
export type AiNote = z.infer<typeof aiNoteSchema>

export const aiNoteInputSchema = aiNoteSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .strict()
export type AiNoteInput = z.infer<typeof aiNoteInputSchema>
