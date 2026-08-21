/**
 * 集合（Collection）模型 —— 用户分组；导入文件夹时子目录自动映射（契约，已冻结）。
 */
import { z } from 'zod'

export const collectionSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).max(100),
    position: z.number().int().min(0)
  })
  .strict()
export type Collection = z.infer<typeof collectionSchema>
