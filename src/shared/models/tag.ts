/**
 * 标签（Tag）模型 —— 扁平标签，无层级（契约，已冻结）。
 */
import { z } from 'zod'

export const tagSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).max(50)
  })
  .strict()
export type Tag = z.infer<typeof tagSchema>
