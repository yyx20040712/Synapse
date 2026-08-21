/**
 * 文献（Paper）模型 —— zod schema 是类型与运行时校验的唯一来源（契约，已冻结）。
 * 所有 schema 一律 .strict()：未知字段拒绝（教训 A2：aquaresearch 曾删类型保护让 bug 闭嘴）。
 */
import { z } from 'zod'

export const paperSourceSchema = z.enum(['local', 'crossref', 'openalex', 'arxiv', 'manual'])
export type PaperSource = z.infer<typeof paperSourceSchema>

export const enrichStatusSchema = z.enum(['pending', 'done', 'failed', 'manual'])
export type EnrichStatus = z.infer<typeof enrichStatusSchema>

/** 列表行：只带列表页需要的字段（防弱模型到处用全量对象） */
export const paperSummarySchema = z
  .object({
    id: z.string().min(1),
    title: z.string(),
    authors: z.array(z.string()),
    year: z.number().int().nullable(),
    venue: z.string(),
    doi: z.string().nullable(),
    tagNames: z.array(z.string()),
    collectionNames: z.array(z.string()),
    annotationCount: z.number().int(),
    noteCount: z.number().int(),
    lastReadPage: z.number().int(),
    addedAt: z.string() // ISO 8601
  })
  .strict()
export type PaperSummary = z.infer<typeof paperSummarySchema>

/** 详情：列表字段 + 阅读与增强所需全量字段 */
export const paperDetailSchema = paperSummarySchema
  .extend({
    abstract: z.string(),
    arxivId: z.string().nullable(),
    source: paperSourceSchema,
    enrichStatus: enrichStatusSchema,
    fileUrl: z.string(), // app-file://<id>
    fileName: z.string(),
    updatedAt: z.string(),
    tags: z.array(z.object({ id: z.string(), name: z.string() }).strict()),
    collections: z.array(z.object({ id: z.string(), name: z.string() }).strict())
  })
  .strict()
export type PaperDetail = z.infer<typeof paperDetailSchema>

/** 人工编辑元数据：仅这些字段允许 update-meta 修改 */
export const paperMetaPatchSchema = z
  .object({
    title: z.string().min(1).optional(),
    authors: z.array(z.string()).optional(),
    year: z.number().int().nullable().optional(),
    venue: z.string().optional(),
    doi: z.string().nullable().optional(),
    abstract: z.string().optional()
  })
  .strict()
export type PaperMetaPatch = z.infer<typeof paperMetaPatchSchema>

export const librarySortSchema = z.enum(['added_desc', 'year_desc', 'title_asc'])
export type LibrarySort = z.infer<typeof librarySortSchema>

export const libraryQuerySchema = z
  .object({
    search: z.string().max(200).optional(), // FTS：标题/摘要/作者
    tagId: z.string().optional(),
    collectionId: z.string().optional(),
    year: z.number().int().optional(),
    sort: librarySortSchema.default('added_desc'),
    offset: z.number().int().min(0).default(0),
    limit: z.number().int().min(1).max(200).default(50)
  })
  .strict()
export type LibraryQuery = z.infer<typeof libraryQuerySchema>

/** 通用分页形状 */
export const pagedSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({ items: z.array(item), total: z.number().int().min(0) }).strict()
export type Paged<T> = { items: T[]; total: number }
