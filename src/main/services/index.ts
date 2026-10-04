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
import { createLibraryService, createPapersService } from './library.service'
import { createFoldersService } from './folders.service'
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
  /** 导入互斥 gate（F-D4 A 面，INV-52）：bootstrap 顶层一次创建注入——容器每层
   *  service 重建但 gate 同一对象；import.service enter/finally exit 配对，
   *  workspace.service 三入口据计数>0 拒绝（拒时零库副作用） */
  importGate: { enter(): void; exit(): void }
  /** 导入进度事件出口（main→renderer 推送），bootstrap 注入 */
  sendProgress?: (e: ImportProgressEvent) => void
  /** AI 语料导出会话事件出口（main→renderer 单向——extract-request/progress） */
  sendExportEvent?: (e: ExportCorpusEvent) => void
  /** [F-FOLDER-01] INV-91 S1 队列闸判定源（renderer 脉络写队列 pending——
   *  bootstrap 注入 main-window lineagePending 缓存读；folders/papers.move/
   *  updateMeta 写入口拒绝） */
  lineagePending?: () => boolean
  /** [F-FOLDER-01] folders.changed 事件出口（main→renderer 失效通知） */
  sendFoldersChanged?: () => void
  /** [F-FOLDER-01] lineage.changed 事件出口（图结构级联变通知） */
  sendLineageChanged?: () => void
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
  /** F-EXPORT-01 桶键平铺（拆交并拼盘——键名与服务件一一对齐；IPC 域归属/
   *  通道名不动=ADR-0017 裁决保持） */
  export_: ExportService
  corpus_export: CorpusExportService
  /** F-SENSOR-01：ai_sensor 域三键平铺（拆交并拼盘——键名与服务件一一对齐；
   *  IPC 域归属/通道名不动=ADR-0017 裁决保持） */
  ai_sensor: AiSensorService
  ai_notes_import: AiNotesImportService
  zcode_link: ZcodeLinkService
  /** LG-01 脉络图：service 四写方法全建（IPC 写通道注册归 LG-03） */
  lineage: LineageService
  /** [F-FOLDER-01] folders 域（CRUD 编排+事件广播+S1 闸） */
  folders: ApiHandlers['folders']
  /** [F-FOLDER-01] papers 域（move-folder 移动/移出事务序——§3.4+W2） */
  papers: ApiHandlers['papers']
}

export function createServices(deps: ServiceDeps): ServiceBundle {
  const aiSensor = createAiSensorService({ rootDir: deps.aiSensorRootDir })
  // [F-FOLDER-01] 共用依赖收口（folders/papers/library 三 service 同源注入）
  const folderDeps = {
    repos: deps.repos,
    lineagePending: deps.lineagePending ?? (() => false),
    sendFoldersChanged: deps.sendFoldersChanged ?? (() => undefined),
    sendLineageChanged: deps.sendLineageChanged ?? (() => undefined)
  }
  const corpusExport = createCorpusExportService({
    repos: deps.repos,
    fileStore: deps.fileStore,
    sendEvent: deps.sendExportEvent ?? (() => undefined),
    // T3-P5 lineage.json 读通道（第六件套装配数据面——lineage.assemble 单源装配）；
    // [F-FOLDER-01] +pubNos map（INV-92 库级派生编号——pub_no 字段数据源）；
    // [F-LGRAPH-01②U8] lineTypes 四组→lineTypeNames 色行名（恰 6）
    lineage: () => {
      const g = deps.repos.lineage.listGraph()
      const paperIds = g.nodes.flatMap((n) => (n.paperId !== null ? [n.paperId] : []))
      return {
        nodes: g.nodes,
        edges: g.edges,
        lineTypeNames: deps.repos.lineage.getLineTypeNames(),
        pubNos: new Map(deps.repos.papers.pubNoByIds(paperIds).map((r) => [r.paperId, r.pubNo]))
      }
    }
  })
  return {
    library: createLibraryService(folderDeps),
    papers: createPapersService(folderDeps),
    folders: createFoldersService(folderDeps),
    reader: createReaderService({ repos: deps.repos }),
    tags: createTagsService({ repos: deps.repos }),
    notes: createNotesService({ repos: deps.repos }),
    import_: createImportService({
      repos: deps.repos,
      fileStore: deps.fileStore,
      extractMeta: extractPdfMeta,
      gate: deps.importGate,
      onProgress: deps.sendProgress
    }),
    enrich: createEnrichService({
      repos: deps.repos,
      providers: buildProviders(deps.http),
      contactEmail: deps.contactEmail
    }),
    export_: createExportService({ repos: deps.repos }),
    corpus_export: corpusExport,
    ai_sensor: aiSensor,
    ai_notes_import: createAiNotesImportService({
      rootDir: deps.aiSensorRootDir,
      repo: deps.repos.aiNotes,
      paperExists: (id) => deps.repos.papers.findById(id) !== null,
      withTransaction: deps.repos.withTransaction // F-AIN-01 回灌事务（lineage 行同型）
    }),
    zcode_link: createZcodeLinkService({
      zcodeBaseDir: deps.zcodeBaseDir,
      templateDir: deps.templateDir,
      readStatus: aiSensor.readStatus // 06 单源消费（running 不双写）——F-SENSOR-01 显式注入
    }),
    lineage: createLineageService({
      repo: deps.repos.lineage,
      // [F-ALIGN-01] paperExists/paperFolderOf/ensurePaperFolder/folderExists/
      // withTransaction 注入随旧节点写通道新建分支退役删除（INV-88 判别/
      // 落笔宿主=papers.repo+import/moveFolder 两调用方，本 service 不再消费）
      paperMetrics: (ids) => deps.repos.papers.listMetricsByIds(ids), // F-LG14 含金量 join 单源
      // [F-FOLDER-01] pubNos 装配（INV-92 库级窗口——pubNoByIds 单源）
      pubNos: (ids) => deps.repos.papers.pubNoByIds(ids),
      // [A1a] 文献库标签伴生 map 装配（tags.tagNamesByIds 单源——卡标签行换源）
      tagNames: (ids) => deps.repos.tags.tagNamesByIds(ids)
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
