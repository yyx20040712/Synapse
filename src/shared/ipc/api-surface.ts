/**
 * API 接线表 —— 全项目 IPC 的单一真相源（契约，已冻结）。
 *
 * 三方对账（tests/contracts/api-surface.test.ts 强制）：
 * 1. preload：按本表逐通道生成白名单桥方法
 * 2. main/ipc/register.ts：按本表逐通道注册 zod 校验 + service 分发
 * 3. services：类型 ApiHandlers 由本表推导——漏实现/多实现通道 = 编译错误
 *
 * 规则：新增/修改通道必须走 [locked-change]；通道名 = "<域>/<动作>"，全局唯一。
 */
import { z } from 'zod'
import type { Result } from '../app-error'
import { libraryQuerySchema, paperDetailSchema } from '../models/paper'
import { annotationSchema } from '../models/annotation'
import { noteSchema } from '../models/note'
import { tagSchema } from '../models/tag'
import { aiNoteSchema } from '../models/ai-note'
import * as S from './schemas'

export interface Endpoint {
  /** 通道名，全局唯一 */
  channel: string
  /** 请求 zod schema（strict） */
  Req: z.ZodType
  /** 响应 zod schema（strict） */
  Res: z.ZodType
}

export const API_SURFACE = {
  library: {
    list: { channel: 'library/list', Req: libraryQuerySchema, Res: S.libraryListResSchema },
    detail: { channel: 'library/detail', Req: S.paperIdReqSchema, Res: paperDetailSchema },
    updateMeta: { channel: 'library/update-meta', Req: S.updateMetaReqSchema, Res: paperDetailSchema },
    collections: { channel: 'library/collections', Req: S.voidReqSchema, Res: S.collectionListResSchema }
  },
  reader: {
    open: { channel: 'reader/open', Req: S.paperIdReqSchema, Res: S.readerOpenResSchema },
    saveAnnotation: { channel: 'reader/save-annotation', Req: S.saveAnnotationReqSchema, Res: annotationSchema },
    updateAnnotation: { channel: 'reader/update-annotation', Req: S.updateAnnotationReqSchema, Res: annotationSchema },
    deleteAnnotation: { channel: 'reader/delete-annotation', Req: S.annotationIdReqSchema, Res: S.trueAckSchema },
    listAnnotations: { channel: 'reader/list-annotations', Req: S.paperIdReqSchema, Res: S.annotationListResSchema },
    saveProgress: { channel: 'reader/save-progress', Req: S.saveProgressReqSchema, Res: S.trueAckSchema }
  },
  import_: {
    fromDialog: { channel: 'import/from-dialog', Req: S.voidReqSchema, Res: S.importResultSchema },
    fromFolder: { channel: 'import/from-folder', Req: S.voidReqSchema, Res: S.importResultSchema }
  },
  enrich: {
    fetch: { channel: 'enrich/fetch', Req: S.enrichReqSchema, Res: paperDetailSchema }
  },
  export_: {
    bibtex: { channel: 'export/bibtex', Req: S.exportSelectionReqSchema, Res: S.exportResSchema },
    csv: { channel: 'export/csv', Req: S.exportSelectionReqSchema, Res: S.exportResSchema },
    report: { channel: 'export/report', Req: S.reportReqSchema, Res: S.exportResSchema },
    corpus: { channel: 'export/corpus', Req: S.corpusReqSchema, Res: S.exportResSchema },
    corpusSet: { channel: 'export/corpus-set', Req: S.corpusSetReqSchema, Res: S.corpusSetResSchema },
    corpusItem: { channel: 'export/corpus-item', Req: S.corpusItemReqSchema, Res: S.trueAckSchema },
    corpusSession: { channel: 'export/corpus-session', Req: S.corpusSessionReqSchema, Res: S.corpusSessionResSchema }
  },
  // ai_sensor 域（2026-08-27 用户裁决 ADR-0017）：AI-06 两通道自 export_ 域
  // 迁入（通道名 ai-sensor/* 不变）+ AI-07 回灌导入器两通道（ai-notes/*）
  ai_sensor: {
    requestAiRead: { channel: 'ai-sensor/request-read', Req: S.paperIdReqSchema, Res: S.aiReadJobResSchema },
    aiStatus: { channel: 'ai-sensor/status', Req: S.voidReqSchema, Res: S.aiSensorStatusResSchema },
    importAll: { channel: 'ai-notes/import', Req: S.voidReqSchema, Res: S.aiNotesImportResSchema },
    listByPaper: { channel: 'ai-notes/list', Req: S.paperIdReqSchema, Res: z.array(aiNoteSchema) }
  },
  tags: {
    list: { channel: 'tags/list', Req: S.voidReqSchema, Res: z.array(S.tagWithCountSchema) },
    upsert: { channel: 'tags/upsert', Req: S.tagNameReqSchema, Res: tagSchema },
    attach: { channel: 'tags/attach', Req: S.attachTagReqSchema, Res: S.trueAckSchema },
    detach: { channel: 'tags/detach', Req: S.detachTagReqSchema, Res: S.trueAckSchema }
  },
  notes: {
    get: { channel: 'notes/get', Req: S.paperIdReqSchema, Res: S.noteGetResSchema },
    save: { channel: 'notes/save', Req: S.noteSaveReqSchema, Res: noteSchema },
    remove: { channel: 'notes/remove', Req: S.noteIdReqSchema, Res: S.trueAckSchema }
  },
  settings: {
    get: { channel: 'settings/get', Req: S.voidReqSchema, Res: S.appSettingsSchema },
    set: { channel: 'settings/set', Req: S.appSettingsSchema, Res: S.appSettingsSchema },
    diagNetwork: { channel: 'settings/diag-network', Req: S.voidReqSchema, Res: S.netDiagResSchema }
  },
  system: {
    openExternal: { channel: 'system/open-external', Req: S.openExternalReqSchema, Res: S.trueAckSchema },
    setQuitDirty: { channel: 'system/set-quit-dirty', Req: S.setQuitDirtyReqSchema, Res: S.trueAckSchema }
  }
} satisfies Record<string, Record<string, Endpoint>>

/** main→renderer 单向事件通道 */
export const EVENT_CHANNELS = {
  importProgress: 'import/progress/event',
  exportCorpus: 'export/corpus/event'
} as const

/** 事件桥形状（preload 暴露与 renderer 全局声明的单一类型来源，禁止两处手写） */
export type PreloadEvents = {
  onImportProgress(cb: (e: S.ImportProgressEvent) => void): () => void
  onExportCorpus(cb: (e: S.ExportCorpusEvent) => void): () => void
}

// ── 类型推导（preload 桥 & services 契约都从这里长出来）──────────────
// Ep 用 infer 约束保留精确 schema 类型；直接索引会被泛型擦除。

type Surface = typeof API_SURFACE
type Ep<D extends keyof Surface, M extends keyof Surface[D]> =
  Surface[D][M] extends {
    channel: string
    Req: infer R extends z.ZodType
    Res: infer S extends z.ZodType
  }
    ? { Req: R; Res: S }
    : never

/** main 侧 service 契约：收已校验请求，返回纯数据（异常上抛由 register 统一折叠） */
export type ApiHandlers = {
  [D in keyof Surface]: {
    [M in keyof Surface[D]]: (req: z.output<Ep<D, M>['Req']>) => Promise<z.output<Ep<D, M>['Res']>>
  }
}

/** renderer 可见的 API 形状：入参宽松（默认值可省），返回一律 Result */
export type PreloadApi = {
  [D in keyof Surface]: {
    [M in keyof Surface[D]]: (
      req: z.input<Ep<D, M>['Req']>
    ) => Promise<Result<z.output<Ep<D, M>['Res']>>>
  }
}

/** 展平的通道名列表（注册与对账用） */
export function allChannels(): { domain: string; method: string; channel: string }[] {
  const out: { domain: string; method: string; channel: string }[] = []
  for (const [domain, methods] of Object.entries(API_SURFACE)) {
    for (const [method, ep] of Object.entries(methods)) {
      out.push({ domain, method, channel: ep.channel })
    }
  }
  return out
}
