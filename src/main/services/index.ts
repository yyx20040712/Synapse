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
import {
  createAiSensorService,
  type AiSensorService
} from './ai_sensor/ai-sensor.service'
import {
  createAiNotesImportService,
  type AiNotesImportService
} from './ai_sensor/ai-notes-import.service'
import {
  createZcodeLinkService,
  type ZcodeLinkService
} from './ai_sensor/zcode-link.service'
import {
  createLineageService,
  type LineageService
} from './lineage/lineage.service'
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
  /** AI 伴随进程协议根（=userData/ai-sensor——bootstrap 解析注入，AI-06） */
  aiSensorRootDir: string
  /** zcode 基目录（prod=os.homedir()——AI-10 detect/install 目标父；bootstrap 注入） */
  zcodeBaseDir: string
  /** AI-10 技能模板源（resolveTemplateDir 产物——bootstrap 注入） */
  templateDir: string
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
  /** AI-06/07：ai_sensor 域服务交并（2026-08-27 用户裁决——自 export_ 并域迁出） */
  export_: ExportService & CorpusExportService
  ai_sensor: AiSensorService & AiNotesImportService & ZcodeLinkService
  /** LG-01 脉络图：service 四写方法全建（IPC 写通道注册归 LG-03） */
  lineage: LineageService
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
    },
    ai_sensor: (() => {
      const aiSensor = createAiSensorService({ rootDir: deps.aiSensorRootDir })
      return {
        ...aiSensor,
        ...createAiNotesImportService({
          rootDir: deps.aiSensorRootDir,
          repo: deps.repos.aiNotes,
          paperExists: (id) => deps.repos.papers.findById(id) !== null
        }),
        ...createZcodeLinkService({
          zcodeBaseDir: deps.zcodeBaseDir,
          templateDir: deps.templateDir,
          readStatus: () => aiSensor.readStatus() // 06 单源消费（running 不双写）
        })
      }
    })(),
    lineage: createLineageService({
      repo: deps.repos.lineage,
      paperExists: (id) => deps.repos.papers.findById(id) !== null, // AI-07 同型
      withTransaction: deps.repos.withTransaction // 清面+重灌原子边界
    })
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
