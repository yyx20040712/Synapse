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
import { lineageNodeSchema, lineageEdgeSchema, lineageEdgeKindSchema } from '../models/lineage'

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
  .object({
    paperId: z.string().min(1),
    page: z.number().int().min(0)
    // [F-TIME-02] 阅读时长搭车载荷 secondsDelta 已随 2026-09-19 用户裁决移除
    // （strict 拒未知字段=旧载荷客户端会被拒；renderer 面同批已改，无跨版本
    // 混跑面——Electron 本地单机应用无服务端兼容义务）
  })
  .strict()
export const trueAckSchema = z.object({ ok: z.literal(true) }).strict()

// ── import_（对话框/拖拽桥分别在 main/preload 侧产生路径，renderer 代码不传路径）──
/**
 * 拖拽导入请求（P7E-02）：paths 由 preload webUtils 桥（apiDrag.importDropped）
 * 解析产生——renderer 不可构造本请求（通道对 renderer 隐藏，INV-07 修订/INV-54）。
 * min(1)/max(100) 是 schema 层第二道数量门（第一道=preload planDroppedImports）。
 */
export const importPathsReqSchema = z
  .object({ paths: z.array(z.string().min(1)).min(1).max(100) })
  .strict()
export type ImportPathsReq = z.infer<typeof importPathsReqSchema>

export const importResultSchema = z
  .object({
    imported: z.array(paperSummarySchema),
    duplicates: z.array(z.string()), // 文件名
    failed: z.array(z.object({ fileName: z.string(), reason: z.string() }).strict())
  })
  .strict()
export type ImportResult = z.infer<typeof importResultSchema>

/** 导入进度事件（main→renderer 单向推送）。sessionId=会话身份（F-D4，INV-52）：
 *  每次 importFiles/importFolder 调用入口生成一次，该次调用内全部事件同 id——
 *  renderer 订阅回调跨会话迟到过滤锚点（先例=exportProgressEventSchema） */
export const importProgressEventSchema = z
  .object({
    phase: z.enum(['scanning', 'copying', 'extracting', 'done']),
    current: z.number().int().min(0),
    total: z.number().int().min(0),
    fileName: z.string(),
    sessionId: z.string().min(1)
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

/** P7E-04 剪贴板导出请求：format 枚举单通道（bibtex/csv 同一构建器单源——
 *  INV-56 禁复制第二份序列化）；paperIds min(1)=空选集第二道门（E3） */
export const clipboardReqSchema = z
  .object({ format: z.enum(['bibtex', 'csv']), paperIds: z.array(z.string().min(1)).min(1) })
  .strict()

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

/** F-LG14 含金量摘要（lineage/graph 逐文献节点）：citedByCount null=从未抓到
 *  （渲染「引 —」）；venueTier null=未映射（渲染「未定」）；0=值非缺（判别 === null）。
 *  venueTier 值域=VenueTier 三档（映射单源 shared/venue-tier.ts，受锁常量零改） */
export const lineagePaperMetricsSchema = z
  .object({
    citedByCount: z.number().int().nullable(),
    venueTier: z.enum(['T1', 'T2', 'T3']).nullable()
  })
  .strict()
export type LineagePaperMetrics = z.infer<typeof lineagePaperMetricsSchema>

/** lineage/graph 响应：全图单读+含金量 join（库空=空数组/空表，合法态非错误；
 *  模型单源=shared/models/lineage——paperMetrics 键=paperId，主题节点不入表
 *  [F-LG14 载荷扩展：加字段向后兼容]） */
export const lineageGraphResSchema = z
  .object({
    nodes: z.array(lineageNodeSchema),
    edges: z.array(lineageEdgeSchema),
    paperMetrics: z.record(z.string(), lineagePaperMetricsSchema)
  })
  .strict()
export type LineageGraphRes = z.infer<typeof lineageGraphResSchema>

// ── lineage 写四通道（LG-03 交互编辑：autosave-first，每编辑动作即写）────
/** lineage/upsert-node 请求：应用面 camelCase 输入（模型单源派生语义——id 缺省=新建；
 *  paperId 省略/null=主题节点；x/y 省略/null=自动布局（JSON Canvas 覆盖语义的反向清空）；
 *  消费方须知=整行 upsert：编辑部分字段须带全量（store 语义化动作收口，防半更新清字段）；
 *  tags 省略/null=清空标签（F-LG14——整行全量语义同款反向清空） */
export const lineageUpsertNodeReqSchema = z
  .object({
    id: z.string().min(1).optional(),
    paperId: z.string().min(1).nullable().optional(),
    title: z.string().min(1),
    coreIdea: z.string(),
    year: z.number().int().nullable(),
    x: z.number().nullable().optional(),
    y: z.number().nullable().optional(),
    tags: z.array(z.string()).nullable().optional()
  })
  .strict()
export type LineageUpsertNodeReq = z.infer<typeof lineageUpsertNodeReqSchema>

/** remove-node/remove-edge 共用形（tags attach/detach 复用同 schema 先例） */
export const lineageIdReqSchema = z.object({ id: z.string().min(1) }).strict()
export type LineageIdReq = z.infer<typeof lineageIdReqSchema>

/** lineage/upsert-edge 请求：{from,to,label?,kind?,id?}（树守卫宿主=LG-01 service
 * upsertEdge——IPC 只透传零守卫，拒绝 reason 经 CONFLICT 域错误透传 renderer
 * toast；kind 可选缺省 'tree'（R2-LG12——ref=综述参考边/manual=人工补父边
 * F-LG15 不限条数，service 三 kind 守卫）；id 可选=F-LG15 label 后编辑更新
 * 语义（缺省=新建——既有新建载荷形状不变） */
export const lineageUpsertEdgeReqSchema = z
  .object({
    id: z.string().min(1).optional(),
    from: z.string().min(1),
    to: z.string().min(1),
    label: z.string().optional(),
    kind: lineageEdgeKindSchema.optional()
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
/** P7E-01 标签生命周期三请求（delete） */
export const tagIdReqSchema = z.object({ tagId: z.string().min(1) }).strict()
/** P7E-01 rename（name 与 upsert 同界：min(1) 拦不住纯空格，service 层再 trim 判空） */
export const renameTagReqSchema = z
  .object({ tagId: z.string().min(1), name: z.string().min(1).max(50) })
  .strict()
/** P7E-01 merge（source===target 的业务拒绝在 service——zod 表达不了跨字段） */
export const mergeTagReqSchema = z
  .object({ sourceId: z.string().min(1), targetId: z.string().min(1) })
  .strict()

// ── notes ───────────────────────────────────────────────────────
export const noteGetResSchema = noteSchema.nullable()
/** 笔记标题长度上限（INV-11 单一真相源：schema 校验与面板 maxLength 同源消费，禁止两处字面量对齐） */
export const NOTE_TITLE_MAX = 200
export const noteSaveReqSchema = z
  .object({ paperId: z.string().min(1), title: z.string().max(NOTE_TITLE_MAX), contentMd: z.string() })
  .strict()
export const noteIdReqSchema = z.object({ noteId: z.string().min(1) }).strict()

// ── workspaces（R1-WS1 课题域——ADR-0018 库级分目录；路径永不跨 IPC）────
// [T3-P2] paperCount=课题文献计数（课题弹层「N 篇」+状态条数据源——一课题一库，
// main 侧逐课题库 COUNT 注入 list 返回）
export const workspaceItemSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    createdAt: z.string().min(1),
    paperCount: z.number().int().min(0)
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
/** 界面缩放三档（R2-SET1）：small=100% 现状零迁移；数值映射单源=UI_SCALE（CSS 变量 --ui-scale 消费） */
export const uiScaleSchema = z.enum(['small', 'medium', 'large'])
export type UiScale = z.infer<typeof uiScaleSchema>
export const UI_SCALE: Record<UiScale, number> = { small: 1, medium: 1.1, large: 1.25 }

export const appSettingsSchema = z
  .object({
    contactEmail: z.string().email(), // 开放 API 礼貌池标识
    // T3-P1 主题三族：'system' 退役（A6 不跟随系统）——枚举 light/dark/sepia，
    // 默认白天；存量 settings.json theme:'system' 由 settings.service 读侧迁移
    theme: z.enum(['light', 'dark', 'sepia']).default('light'),
    uiScale: uiScaleSchema.default('small')
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

// ── system window-control（R2-SH3 frameless 标题栏：action 枚举只住此处——
//    renderer 经 api-surface 类型推导复用，禁手写第二份）────────────────
export const windowControlActionSchema = z.enum(['minimize', 'maximize-toggle', 'close', 'get-state'])
export type WindowControlAction = z.infer<typeof windowControlActionSchema>

export const windowControlReqSchema = z.object({ action: windowControlActionSchema }).strict()
export type WindowControlReq = z.infer<typeof windowControlReqSchema>

/** maximize 状态推送（main→renderer 单向：win.on('maximize'/'unmaximize') 沿） */
export const windowStateEventSchema = z.object({ maximized: z.boolean() }).strict()
export type WindowStateEvent = z.infer<typeof windowStateEventSchema>

export const windowControlResSchema = z.object({ ok: z.literal(true), maximized: z.boolean() }).strict()
export type WindowControlRes = z.infer<typeof windowControlResSchema>
