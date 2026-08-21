/**
 * 笔记（Note）模型 —— 每篇文献一篇 Markdown 长笔记（契约，已冻结）。
 */
import { z } from 'zod'

export const noteSchema = z
  .object({
    id: z.string().min(1),
    paperId: z.string().min(1),
    title: z.string(),
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
