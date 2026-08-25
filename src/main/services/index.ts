/**
 * 服务装配桶（SR-INFRA-16，已完成）——构造全部业务服务，依赖在此注入。
 * bootstrap 唯一调用点；ipc 装配桶从这里取服务。
 * 各服务工厂若工单未完成会抛 NotImplementedError（带工单号），不影响装配本身。
 */
import type { z } from 'zod'
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { ExportCorpusEvent, ImportProgressEvent } from '../../shared/ipc/schemas'
import type { PaperDetail } from '../../shared/models/paper'
import type { Repos } from '../db/repos'
import type { FileStore } from './import_/file-store'
import { createImportService, type ImportService } from './import_/import.service'
import { createExportService, type ExportService } from './export_/export.service'
import {
  createCorpusExportService,
  type CorpusExportService
} from './export_/corpus.export.service'
import { extractPdfMeta } from './import_/pdf-meta.extract'
import { createLibraryService } from './library.service'
import { createReaderService } from './reader.service'
import { createTagsService } from './tags.service'
import { createNotesService } from './notes.service'
import { createEnrichService } from './enrich/enrich.service'
import {
  createCrossrefProvider,
  type EnrichedWork
} from './enrich/providers/crossref'
import { createOpenalexProvider, type OpenalexWork } from './enrich/providers/openalex'
import { createArxivProvider, type ArxivWork } from './enrich/providers/arxiv'

export interface HttpFns {
  fetchJson: (url: string, schema: z.ZodType) => Promise<unknown>
  fetchText: (url: string) => Promise<string>
}

export interface ServiceDeps {
  repos: Repos
  fileStore: FileStore
  contactEmail: () => string
  http: HttpFns
  /** 导入进度事件出口（main→renderer 推送），bootstrap 注入 */
  sendProgress?: (e: ImportProgressEvent) => void
  /** AI 语料导出会话事件出口（main→renderer 单向——extract-request/progress） */
  sendExportEvent?: (e: ExportCorpusEvent) => void
}

export interface EnrichServiceShape {
  enrichPaper(paperId: string): Promise<PaperDetail>
}

export interface ServiceBundle {
  library: ApiHandlers['library']
  reader: ApiHandlers['reader']
  tags: ApiHandlers['tags']
  notes: ApiHandlers['notes']
  import_: ImportService
  enrich: EnrichServiceShape
  export_: ExportService & CorpusExportService
}

export function createServices(deps: ServiceDeps): ServiceBundle {
  return {
    library: createLibraryService({ repos: deps.repos }),
    reader: createReaderService({ repos: deps.repos }),
    tags: createTagsService({ repos: deps.repos }),
    notes: createNotesService({ repos: deps.repos }),
    import_: createImportService({
      repos: deps.repos,
      fileStore: deps.fileStore,
      extractMeta: extractPdfMeta,
      onProgress: deps.sendProgress
    }),
    enrich: createEnrichService({
      repos: deps.repos,
      providers: buildProviders(deps.http),
      contactEmail: deps.contactEmail
    }),
    export_: {
      ...createExportService({ repos: deps.repos }),
      ...createCorpusExportService({
        repos: deps.repos,
        fileStore: deps.fileStore,
        sendEvent: deps.sendExportEvent ?? (() => undefined),
      })
    }
  }
}

function buildProviders(http: HttpFns): {
  crossref: { byDoi(doi: string): Promise<EnrichedWork | null>; byTitle(t: string): Promise<EnrichedWork | null> }
  openalex: { byTitle(t: string): Promise<OpenalexWork | null> }
  arxiv: { byId(id: string): Promise<ArxivWork | null> }
} {
  return {
    crossref: createCrossrefProvider({ fetchJson: http.fetchJson }),
    openalex: createOpenalexProvider({ fetchJson: http.fetchJson }),
    arxiv: createArxivProvider({ fetchText: http.fetchText })
  }
}
