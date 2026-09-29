/**
 * 标签（Tag）模型 —— 扁平标签，无层级（契约，已冻结）。
 * [F-TAGS-01] color：标签颜色身份（zotero 式）——#rrggbb 六位小写 hex 或
 * null（=默认 accent，三面渲染单源见 INV-86）；迁移 011 列可空无默认，
 * wire 真相=repo SELECT 恒携带（必携可空——消费面不得假省略）。
 */
import { z } from 'zod'

/** 标签颜色：六位小写 hex（service 层正规化小写）或 null（恢复默认） */
export const tagColorSchema = z.string().regex(/^#[0-9a-f]{6}$/).nullable()

export const tagSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).max(50),
    color: tagColorSchema
  })
  .strict()
export type Tag = z.infer<typeof tagSchema>
