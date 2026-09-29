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
    annotationCount: z.number().int(),
    noteCount: z.number().int(),
    lastReadPage: z.number().int(),
    addedAt: z.string(), // ISO 8601
    // [F-FOLDER-01] 文件夹单归属（迁移 012 papers.folder_id；null=未归档——
    // 与「未加入脉络」正交，INV-93）。collectionNames 随 paper_collections
    // 退役删除（方案切换=删除旧方案）
    folderId: z.string().nullable(),
    // [F-FOLDER-01] D1 影响因子（手动填写——papers.impact_factor REAL 可空）
    impactFactor: z.number().nullable(),
    // [F-FOLDER-01] pubNo=库级全序派生编号（ROW_NUMBER OVER ORDER BY
    // year/month/added_at——LIST_SQL 窗口列，INV-92 不落库；catalogNo 退役
    // 单一真相源=本字段。可选增量=导入结果行等无窗口语境可省略）
    pubNo: z.number().int().optional(),
    // [T3-P3] 密度列表引用列：ENR-01 含金量缓存快照下探列表行（LIST_SQL
    // 扩列 cited_by_count，toSummary null→整键省略——与 detail 面同语义，
    // 可选增量向后兼容，旧载荷解析不受影响）
    citedByCount: z.number().int().optional(),
    // [F-FOLDER-01] 脉络关联行收缩：节点 year/month（LIST_SQL LEFT JOIN
    // lineage_nodes 单源——INV-89 保证每文献至多一节点）；catalogNo 已随
    // pubNo 单源化退役（零残留断言在档）；未入脉络整键省略
    lineage: z
      .object({
        year: z.number().int().nullable(),
        month: z.number().int().nullable()
      })
      .strict()
      .optional()
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
    // ENR-01 含金量缓存快照（可选字段——ADR-0011 演进规则；三字段由
    // detailById 配对透出，无缓存时省略；ENR-02 装配数据通道）。
    // citedByCount 已随 T3-P3 上提到 summarySchema（列表/详情同列同语义）
    citedByFetchedAt: z.string().optional(), // ISO 8601（缓存抓取时间）
    citedByCountSource: paperSourceSchema.optional(), // 命中的瀑布源
    // [T3-P3] 跨域关联行（service 层组合装配——repo 单一职责不跨表）：
    // paper_id 命中脉络节点则挂；month=null=未定月框（[T3-P5] 真值透传）；
    // [F-FOLDER-01] catalogNo 已随 pubNo 单源化退役（编号=summary.pubNo，
    // INV-92）；未命中整键省略
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

/** 人工编辑元数据：仅这些字段允许 update-meta 修改。
 *  [F-FOLDER-01] +month（节点月框——papers 表无 month 列，落位=service 层
 *  同事务写 lineage_nodes.month，未入脉络文献 patch.month 无落点照实忽略）
 *  +impactFactor（papers.impact_factor——D1 手动字段）。 */
export const paperMetaPatchSchema = z
  .object({
    title: z.string().min(1).optional(),
    authors: z.array(z.string()).optional(),
    year: z.number().int().nullable().optional(),
    venue: z.string().optional(),
    doi: z.string().nullable().optional(),
    abstract: z.string().optional(),
    month: z.number().int().min(1).max(12).nullable().optional(),
    impactFactor: z.number().nullable().optional()
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
    // [F-FOLDER-01] collectionId 过滤随 paper_collections 退役删除；接替=
    // folderScope 判别联合（W5 终裁——三态显式，禁裸 nullable 二义；缺省=全部）
    folderScope: z
      .discriminatedUnion('kind', [
        z.object({ kind: z.literal('all') }).strict(),
        z.object({ kind: z.literal('unfiled') }).strict(),
        z.object({ kind: z.literal('folder'), folderId: z.string().min(1) }).strict()
      ])
      .optional(),
    year: z.number().int().optional(),
    sort: librarySortSchema.default('added_desc'),
    offset: z.number().int().min(0).default(0),
    limit: z.number().int().min(1).max(200).default(50)
  })
  .strict()
export type LibraryQuery = z.infer<typeof libraryQuerySchema>

/** [F-FOLDER-01] folderScope 判别联合独立导出（W5——folder DTO 面共用；
 *  定义单源=libraryQuerySchema 内联字面，此处仅 re-export 防双写） */
export type FolderScope = NonNullable<LibraryQuery['folderScope']>

/** 通用分页形状 */
export const pagedSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({ items: z.array(item), total: z.number().int().min(0) }).strict()
export type Paged<T> = { items: T[]; total: number }
