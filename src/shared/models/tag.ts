/**
 * 标签（Tag）模型 —— 扁平标签，无层级（契约，已冻结）。
 * [F-TAGS-01] color：标签颜色身份（zotero 式）——#rrggbb 六位小写 hex 或
 * null（=默认 accent，三面渲染单源见 INV-86）；迁移 011 列可空无默认，
 * wire 真相=repo SELECT 恒携带（必携可空——消费面不得假省略）。
 */
import { z } from 'zod'

/** 标签颜色：六位小写 hex（service 层正规化小写）或 null（恢复默认） */
export const tagColorSchema = z.string().regex(/^#[0-9a-f]{6}$/).nullable()

/**
 * [T4 小挂账] 标签名长度上限单源常量（先例原 NOTE_TITLE_MAX 同型——该常量
 * 已随 [A2 F-CONTRACTA-01] note.title 停用退役）：schema 校验
 * （tagSchema/tagNameReqSchema/renameTagReqSchema）与渲染层四输入点
 * maxLength 同源消费，禁止两处字面量对齐。
 */
export const TAG_NAME_MAX = 50

export const tagSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).max(TAG_NAME_MAX),
    color: tagColorSchema
  })
  .strict()
export type Tag = z.infer<typeof tagSchema>
