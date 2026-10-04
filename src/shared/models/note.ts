/**
 * 笔记（Note）模型 —— 每篇文献一篇 Markdown 长笔记（契约，已冻结）。
 * [A2 F-CONTRACTA-01 2026-10-04] title 停用：应用面退役（DDL 列死置
 * NOT NULL DEFAULT ''——新代码零消费；清列归 D 批 DB 战役）。
 */
import { z } from 'zod'

export const noteSchema = z
  .object({
    id: z.string().min(1),
    paperId: z.string().min(1),
    contentMd: z.string(),
    createdAt: z.string(),
    updatedAt: z.string()
  })
  .strict()
export type Note = z.infer<typeof noteSchema>

export const noteInputSchema = noteSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .strict()
export type NoteInput = z.infer<typeof noteInputSchema>
