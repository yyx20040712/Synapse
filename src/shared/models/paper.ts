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
    addedAt: z.string(), // ISO 8601
    // [T3-P3] 密度列表引用列：ENR-01 含金量缓存快照下探列表行（LIST_SQL
    // 扩列 cited_by_count，toSummary null→整键省略——与 detail 面同语义，
    // 可选增量向后兼容，旧载荷解析不受影响）
    citedByCount: z.number().int().optional()
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
    collections: z.array(z.object({ id: z.string(), name: z.string() }).strict()),
    // ENR-01 含金量缓存快照（可选字段——ADR-0011 演进规则；三字段由
    // detailById 配对透出，无缓存时省略；ENR-02 装配数据通道）。
    // citedByCount 已随 T3-P3 上提到 summarySchema（列表/详情同列同语义）
    citedByFetchedAt: z.string().optional(), // ISO 8601（缓存抓取时间）
    citedByCountSource: paperSourceSchema.optional(), // 命中的瀑布源
    // [T3-P3] 跨域关联行（service 层组合装配——repo 单一职责不跨表）：
    // paper_id 命中脉络节点则挂；month 恒 null=P5 month 列落位后自新
    // （final-design §3——lineage v2 模型增量），未命中整键省略
    lineage: z
      .object({
        year: z.number().int().nullable(),
        month: z.number().int().nullable(),
        edgeCount: z.number().int()
      })
      .strict()
      .optional()
    // [F-TIME-02] 阅读时长字段 readingSeconds 已随 2026-09-19 用户裁决移除
    // （列由 009 迁移 DROP；沿革=P7E-05 008 加列→F-TIME-02 009 删列）
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

// P7E-07：+cited_desc（被引降序——加值向后兼容，旧三值全部保留）
export const librarySortSchema = z.enum(['added_desc', 'year_desc', 'title_asc', 'cited_desc'])
export type LibrarySort = z.infer<typeof librarySortSchema>

/**
 * [P7X-01] 标签筛选选中上界：schema 与渲染层 TagFilter toggle 守卫同源消费
 * （单查询爆炸上界——EXISTS 每标签一条；UI 侧提前拦截=提交期报错的 UX 断层消除）。
 */
export const TAG_FILTER_MAX = 20

export const libraryQuerySchema = z
  .object({
    search: z.string().max(200).optional(), // FTS：标题/摘要/作者
    // P7E-06 多选标签过滤（AND 交集）：tagId 单选已删（方案切换=删除旧方案——
    // 单选=单元素特例，UI 面完全覆盖）；空选集由 UI 层收敛 undefined，空数组
    // schema 级拒收=防歧义；上界经 TAG_FILTER_MAX 同源（UI 消费同源——P7X-01）
    tagIds: z.array(z.string().min(1)).min(1).max(TAG_FILTER_MAX).optional(),
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
