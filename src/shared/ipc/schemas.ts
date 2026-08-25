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
