/**
 * 通道级请求/响应 schema（契约，已冻结）。
 * 命名约定：XxxReq / XxxRes；一律 .strict()；空请求用 VoidReq。
 * 渲染层永不出现在这里出现任何文件路径（安全 §6.3）。
 */
import { z } from 'zod'
import { annotationRectSchema } from '../models/annotation'
import { paperSummarySchema, pagedSchema, paperMetaPatchSchema } from '../models/paper'
import { annotationSchema, annotationInputSchema } from '../models/annotation'
import { noteSchema } from '../models/note'
import { tagSchema } from '../models/tag'
import { collectionSchema } from '../models/collection'
import { lineageNodeSchema, lineageEdgeSchema } from '../models/lineage'

/** 空请求（无参数通道） */
export const voidReqSchema = z.object({}).strict()
export type VoidReq = z.infer<typeof voidReqSchema>

// ── library ─────────────────────────────────────────────────────
export const libraryListResSchema = pagedSchema(paperSummarySchema)

export const paperIdReqSchema = z.object({ paperId: z.string().min(1) }).strict()
export type PaperIdReq = z.infer<typeof paperIdReqSchema>

export const updateMetaReqSchema = z
  .object({ paperId: z.string().min(1), patch: paperMetaPatchSchema })
  .strict()
export type UpdateMetaReq = z.infer<typeof updateMetaReqSchema>

export const collectionListResSchema = z.array(collectionSchema)

// ── reader ──────────────────────────────────────────────────────
export const readerOpenResSchema = z
  .object({
    fileUrl: z.string(), // app-file://<paperId>
    fileName: z.string(),
    // 文献名（PaperDetail.title）——标签页可读名单源（缺陷② 2026-08-27：
    // fileName 是 file_ref 内容寻址哈希基名，不可读）
    title: z.string(),
    lastReadPage: z.number().int().min(0)
  })
  .strict()

export const saveAnnotationReqSchema = z
  .object({ paperId: z.string().min(1), annotation: annotationInputSchema })
  .strict()

export const updateAnnotationReqSchema = z
  .object({ annotation: annotationSchema })
  .strict()

export const annotationIdReqSchema = z
  .object({ annotationId: z.string().min(1) })
  .strict()

export const annotationListResSchema = z.array(annotationSchema)

export const saveProgressReqSchema = z
  .object({ paperId: z.string().min(1), page: z.number().int().min(0) })
  .strict()
export const trueAckSchema = z.object({ ok: z.literal(true) }).strict()

// ── import_（对话框在 main 侧发起，renderer 不传任何路径）─────────────
export const importResultSchema = z
  .object({
    imported: z.array(paperSummarySchema),
    duplicates: z.array(z.string()), // 文件名
    failed: z.array(z.object({ fileName: z.string(), reason: z.string() }).strict())
  })
  .strict()
export type ImportResult = z.infer<typeof importResultSchema>

/** 导入进度事件（main→renderer 单向推送） */
export const importProgressEventSchema = z
  .object({
    phase: z.enum(['scanning', 'copying', 'extracting', 'done']),
    current: z.number().int().min(0),
    total: z.number().int().min(0),
    fileName: z.string()
  })
  .strict()
export type ImportProgressEvent = z.infer<typeof importProgressEventSchema>

// ── enrich ──────────────────────────────────────────────────────
export const enrichReqSchema = z.object({ paperId: z.string().min(1) }).strict()

// ── export_（保存路径由 main 侧系统对话框产生）───────────────────────
export const exportSelectionReqSchema = z
  .object({ paperIds: z.array(z.string().min(1)).min(1).max(1000) })
  .strict()

export const exportResSchema = z
  .object({ filePath: z.string(), count: z.number().int().min(1) })
  .strict()

export const reportReqSchema = z.object({ paperId: z.string().min(1) }).strict()

// ── export_ corpus-item（AI-02：五件套提取回传 renderer→main 常规 invoke）──
/** 逐项回传判别联合（背压：每页/每图一 invoke，await ack 后发下一项） */
export const corpusItemReqSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('fulltext'),
    sessionId: z.string().min(1),
    paperId: z.string().min(1),
    page: z.number().int().min(1),
    payload: z.string()
  }).strict(),
  z.object({
    kind: z.literal('figure'),
    figure: z.enum(['page', 'anno']),
    sessionId: z.string().min(1),
    paperId: z.string().min(1),
    page: z.number().int().min(1),
    annotationId: z.string().min(1).optional(),
    payload: z.string()
  }).strict(),
  z.object({
    kind: z.literal('complete'),
    sessionId: z.string().min(1),
    paperId: z.string().min(1)
  }).strict(),
  z.object({
    kind: z.literal('error'),
    sessionId: z.string().min(1),
    paperId: z.string().min(1),
    reason: z.string()
  }).strict()
])
  .refine(
    (v) =>
      v.kind !== 'figure' ||
      (v.figure === 'anno'
        ? v.annotationId !== undefined
        : v.annotationId === undefined),
    { message: 'anno 图必带 annotationId；page 图不得携带 annotationId' }
  )
export type CorpusItemReq = z.infer<typeof corpusItemReqSchema>

/** 导出会话事件载荷（main→renderer 单向，判别联合；annotations=裁剪数据源随请求下发） */
export const extractRequestEventSchema = z
  .object({
    type: z.literal('extract-request'),
    sessionId: z.string().min(1),
    paperId: z.string().min(1),
    url: z.string().min(1),
    annotations: z
      .array(
        z
          .object({
            id: z.string().min(1),
            rects: z.array(annotationRectSchema)
          })
          .strict()
      )
      .max(5000)
  })
  .strict()
export type ExtractRequestEvent = z.infer<typeof extractRequestEventSchema>

export const exportProgressEventSchema = z
  .object({
    type: z.literal('progress'),
    sessionId: z.string().min(1),
    done: z.number().int().min(0),
    total: z.number().int().min(0),
    phase: z.enum(['preparing', 'streaming', 'finalizing'])
  })
  .strict()
export type ExportProgressEvent = z.infer<typeof exportProgressEventSchema>
export type ExportCorpusEvent = ExtractRequestEvent | ExportProgressEvent

// ── export_ corpus-session（AI-03：五件套导出会话——通道名避开 C-02 的 export/corpus）──
/** 会话发起：paperIds 缺省=全库；目录经 main 侧系统对话框选择（INV-07——ipc 层选，service 收已选 dir） */
export const corpusSessionReqSchema = z
  .object({ paperIds: z.array(z.string().min(1)).min(1).max(1000).optional() })
  .strict()

/** 会话终局 resolve（终局=manifest 已写或明确失败；篇级失败见 errorCount） */
export const corpusSessionResSchema = z
  .object({ dir: z.string(), fileCount: z.number().int().min(0), errorCount: z.number().int().min(0) })
  .strict()
export type CorpusSessionRes = z.infer<typeof corpusSessionResSchema>

// ── ai_sensor（AI-06 伴随进程文件协议 ai-sensor/* + AI-07 回灌导入器
//    ai-notes/*——域归属=ai_sensor 域，2026-08-27 用户裁决 ADR-0017）────────
/** request-read 响应：jobId（幂等：同篇 pending 在则返回既有 jobId） */
export const aiReadJobResSchema = z.object({ jobId: z.string().min(1) }).strict()
export type AiReadJobRes = z.infer<typeof aiReadJobResSchema>

/** status.json 消费面（running=新鲜度判定输出，单源在 ai-sensor.service——消费方不双写阈值） */
export const sensorStatusSchema = z
  .object({
    state: z.string(), // 工具侧自由文本自述，应用永不按值分支（ADR-0015 §1）
    currentPaper: z.string().nullable(),
    role: z.string().nullable(),
    updatedAt: z.string(),
    heartbeatAt: z.string(),
    running: z.boolean()
  })
  .strict()
export type SensorStatus = z.infer<typeof sensorStatusSchema>

/** status 通道响应：null=status.json 不存在=工具从未运行（N06-4） */
export const aiSensorStatusResSchema = sensorStatusSchema.nullable()

/** observe 通道响应：六态状态机判定事实单源（AI-08 票面消费面——主控裁决
 *  方向 B，2026-08-27）。status=null=status.json 不存在（与 aiStatus 语义一致）；
 *  hasPendingJob/productExists/archivedExists=06 服务侧 per-paper fs 事实聚合 */
export const observeResSchema = z
  .object({
    status: sensorStatusSchema.nullable(),
    hasPendingJob: z.boolean(),
    productExists: z.boolean(),
    archivedExists: z.boolean()
  })
  .strict()
export type ObserveRes = z.infer<typeof observeResSchema>

/** ai-notes/import 响应：部分成功三桶（AI-07——消费方 08 按钮 toast 汇总呈现） */
export const aiNotesImportResSchema = z
  .object({
    imported: z.array(z.string()),
    skipped: z.array(z.string()),
    errors: z.array(z.object({ paperId: z.string(), reason: z.string() }).strict())
  })
  .strict()
export type AiNotesImportRes = z.infer<typeof aiNotesImportResSchema>

/** zcode-link/detect 响应（AI-10 设置页联动五态——四呈现态+error）。
 *  status=null=not-found/skill-missing 态（未触协议）或工具从未运行；running
 *  判定单源=06 readStatus；overwrite=技能目录在但 SKILL.md 缺（覆盖型确认事实源）；
 *  reason 仅 error 态（readStatus 损坏上抛或 fs 异常的中文原文） */
export const zcodeLinkDetectResSchema = z
  .object({
    state: z.enum(['zcode-not-found', 'found-skill-missing', 'installed-idle', 'running', 'error']),
    status: sensorStatusSchema.nullable(),
    overwrite: z.boolean(),
    reason: z.string().optional()
  })
  .strict()
export type ZcodeLinkDetectRes = z.infer<typeof zcodeLinkDetectResSchema>

/** zcode-link/install 响应：fileCount=复制落地文件数（目录不计） */
export const zcodeLinkInstallResSchema = z.object({ fileCount: z.number().int().min(1) }).strict()
export type ZcodeLinkInstallRes = z.infer<typeof zcodeLinkInstallResSchema>

// ── lineage（LG-01 脉络图：草稿导入+全图读——dialog 在 ipc 层 INV-07）────
/** lineage/import 响应：判别联合（全有或全无——校验任一失败库不动，errors 行级中文） */
export const lineageImportResSchema = z.union([
  z
    .object({ ok: z.literal(true), nodeCount: z.number().int().min(0), edgeCount: z.number().int().min(0) })
    .strict(),
  z
    .object({
      ok: z.literal(false),
      errors: z.array(z.object({ path: z.string(), reason: z.string() }).strict())
    })
    .strict()
])
export type LineageImportRes = z.infer<typeof lineageImportResSchema>

/** lineage/graph 响应：全图单读（库空=空数组，合法态非错误；模型单源=shared/models/lineage） */
export const lineageGraphResSchema = z
  .object({ nodes: z.array(lineageNodeSchema), edges: z.array(lineageEdgeSchema) })
  .strict()
export type LineageGraphRes = z.infer<typeof lineageGraphResSchema>

// ── lineage 写四通道（LG-03 交互编辑：autosave-first，每编辑动作即写）────
/** lineage/upsert-node 请求：应用面 camelCase 输入（模型单源派生语义——id 缺省=新建；
 *  paperId 省略/null=主题节点；x/y 省略/null=自动布局（JSON Canvas 覆盖语义的反向清空）；
 *  消费方须知=整行 upsert：编辑部分字段须带全量（store 语义化动作收口，防半更新清字段） */
export const lineageUpsertNodeReqSchema = z
  .object({
    id: z.string().min(1).optional(),
    paperId: z.string().min(1).nullable().optional(),
    title: z.string().min(1),
    coreIdea: z.string(),
    year: z.number().int().nullable(),
    x: z.number().nullable().optional(),
    y: z.number().nullable().optional()
  })
  .strict()
export type LineageUpsertNodeReq = z.infer<typeof lineageUpsertNodeReqSchema>

/** remove-node/remove-edge 共用形（tags attach/detach 复用同 schema 先例） */
export const lineageIdReqSchema = z.object({ id: z.string().min(1) }).strict()
export type LineageIdReq = z.infer<typeof lineageIdReqSchema>

/** lineage/upsert-edge 请求：{from,to,label?}（树守卫宿主=LG-01 service upsertEdge——
 *  IPC 只透传零守卫，拒绝 reason 经 CONFLICT 域错误透传 renderer toast） */
export const lineageUpsertEdgeReqSchema = z
  .object({
    from: z.string().min(1),
    to: z.string().min(1),
    label: z.string().optional()
  })
  .strict()
export type LineageUpsertEdgeReq = z.infer<typeof lineageUpsertEdgeReqSchema>

// ── export_ corpus（C-02：md 语料导出——ADR-0011 v1.1 口径）──────────
/** 单篇语料导出（与 reportReq 同形：目标文献 id） */
export const corpusReqSchema = z.object({ paperId: z.string().min(1) }).strict()

/** 全库语料集合导出（v1 无选择语义——空对象） */
export const corpusSetReqSchema = z.object({}).strict()

/** 集合导出专属 Res：skipped 回传取数失败篇（消费方 toast 可见性，INV-02） */
export const corpusSetResSchema = z
  .object({
    filePath: z.string(),
    count: z.number().int().min(1),
    skipped: z.array(z.object({ paperId: z.string(), reason: z.string() }).strict())
  })
  .strict()

// ── tags ────────────────────────────────────────────────────────
export const tagWithCountSchema = tagSchema.extend({ paperCount: z.number().int().min(0) })
export const tagNameReqSchema = z.object({ name: z.string().min(1).max(50) }).strict()
export const attachTagReqSchema = z
  .object({ paperId: z.string().min(1), tagId: z.string().min(1) })
  .strict()
export const detachTagReqSchema = attachTagReqSchema

// ── notes ───────────────────────────────────────────────────────
export const noteGetResSchema = noteSchema.nullable()
/** 笔记标题长度上限（INV-11 单一真相源：schema 校验与面板 maxLength 同源消费，禁止两处字面量对齐） */
export const NOTE_TITLE_MAX = 200
export const noteSaveReqSchema = z
  .object({ paperId: z.string().min(1), title: z.string().max(NOTE_TITLE_MAX), contentMd: z.string() })
  .strict()
export const noteIdReqSchema = z.object({ noteId: z.string().min(1) }).strict()

// ── workspaces（R1-WS1 课题域——ADR-0018 库级分目录；路径永不跨 IPC）────
export const workspaceItemSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    createdAt: z.string().min(1)
  })
  .strict()
export type WorkspaceItem = z.infer<typeof workspaceItemSchema>

/** 课题名长度上限（单一真相源：schema 校验与 WS2 输入框 maxLength 同源消费——NOTE_TITLE_MAX 同型） */
export const WORKSPACE_NAME_MAX = 40

export const workspaceListResSchema = z
  .object({
    items: z.array(workspaceItemSchema),
    currentId: z.string().min(1)
  })
  .strict()

export const workspaceCreateReqSchema = z
  .object({ name: z.string().min(1).max(WORKSPACE_NAME_MAX) })
  .strict()

export const workspaceCreateResSchema = z.object({ id: z.string().min(1) }).strict()

export const workspaceRenameReqSchema = z
  .object({ id: z.string().min(1), name: z.string().min(1).max(WORKSPACE_NAME_MAX) })
  .strict()

export const workspaceSwitchReqSchema = z.object({ id: z.string().min(1) }).strict()

// ── settings ────────────────────────────────────────────────────
export const appSettingsSchema = z
  .object({
    contactEmail: z.string().email(), // 开放 API 礼貌池标识
    theme: z.enum(['light', 'dark', 'system']).default('system')
  })
  .strict()
export type AppSettings = z.infer<typeof appSettingsSchema>

export const netDiagItemSchema = z
  .object({
    host: z.string(),
    ok: z.boolean(),
    latencyMs: z.number().int().min(-1) // -1 表示超时/失败
  })
  .strict()
export const netDiagResSchema = z.array(netDiagItemSchema)

// ── system（外链经守卫后由系统浏览器打开）──────────────────────────
export const openExternalReqSchema = z.object({ url: z.string().min(1).max(2048) }).strict()

/** 退出拦截 dirty 上报（TABS-04：renderer 聚合信号变化沿 push 到 main 缓存） */
export const setQuitDirtyReqSchema = z.object({ dirty: z.boolean() }).strict()
