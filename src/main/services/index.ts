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
import type { ImportGate } from '../import-gate'
import type { FileStore, FigureFileStore } from './import_/file-store'
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
import {
  createFloatingNotesService,
  type FloatingNotesService
} from './lineage/floating-notes.service'
import { createEnrichService } from './enrich/enrich.service'
import {
  createCrossrefProvider,
  type EnrichedWork
} from './enrich/providers/crossref'
import { createOpenalexProvider, type OpenalexWork } from './enrich/providers/openalex'
import { createArxivProvider, type ArxivWork } from './enrich/providers/arxiv'
import {
  createAiSessionsService,
  type AiSessionsService
} from './ai/ai-sessions.service'
import {
  createAiMemorySearchService,
  type AiMemorySearchService
} from './ai/ai-memory-search.service'
import { createAiTasksService, type AiTasksService } from './ai/ai-tasks.service'
import {
  createAiMemoryManualService,
  type AiMemoryManualService
} from './ai/ai-memory-manual.service'
import { createAiCascadeService, type AiCascadeService } from './ai/ai-cascade.service'
import {
  createAiContextService,
  type AiContextService
} from './ai/ai-context.service'
import {
  createAiTailService,
  type AiTailService
} from './ai/ai-tail.service'
import {
  createExportSnapshotService,
  type SnapshotService
} from './snapshot/export-snapshot.service'
import {
  createImportSnapshotService,
  type SnapshotImportService
} from './snapshot/import-snapshot.service'
import { createFigureStoreService } from './figure-store.service'
import { createFigureTaskService, type FigureTaskService } from './figure-tasks.service'

export interface HttpFns {
  fetchJson: (url: string, schema: z.ZodType) => Promise<unknown>
  fetchText: (url: string) => Promise<string>
}

export interface ServiceDeps {
  repos: Repos
  /** [F-VISFB-42] 复合型（PDF+figure 两面同根——figure-store 消费 figure 面） */
  fileStore: FileStore & FigureFileStore
  contactEmail: () => string
  http: HttpFns
  /** 导入互斥 gate（F-D4 A 面，INV-52；[F-IMPORTGATE-01] kind 化——INV-133）：
   *  bootstrap 顶层一次创建注入——容器每层 service 重建但 gate 同一对象；
   *  import.service enter/finally exit 配对，workspace.service 三入口据
   *  inFlight()（两 kind 合计）拒绝；papers/folders delete enter('delete')
   *  持 gate（双侧 BUSY 互斥，拒时零库副作用） */
  importGate: ImportGate
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
  /** [F-VISFB-61] 悬浮笔记用例面（lineage 域两通道+graph 装配源消费） */
  floatingNotes: FloatingNotesService
  /** [F-FOLDER-01] folders 域（CRUD 编排+事件广播+S1 闸） */
  folders: ApiHandlers['folders']
  /** [F-FOLDER-01] papers 域（move-folder 移动/移出事务序——§3.4+W2） */
  papers: ApiHandlers['papers']
  /** [F-DBCAMP-01 DB-2 U2a] AI 会话域（50 上限+多态锚——本批零 IPC，
   *  handlers 接线归 U2b/后续票） */
  aiSessions: AiSessionsService
  /** [F-DBCAMP-01 DB-2 U2a] AI 记忆检索路由（码点路由+三档完全隔离——
   *  本批零 IPC） */
  aiMemorySearch: AiMemorySearchService
  /** [F-DBCAMP-01 DB-2 U2b-1] AI 任务系统（9 动作 dispatch+6 态机+审计；
   *  本批零 IPC——main 启动序接线=U2b-2/后续批，recoverInterruptedTasks
   *  供 bootstrap 装配调用） */
  aiTasks: AiTasksService
  /** [F-DBCAMP-01 DB-2 U2b-2a] AI 上下文装配引擎（L1 骨架+L2 片段——对话
   *  管线批消费；本批零 IPC） */
  aiContext: AiContextService
  /** [F-DBCAMP-01 DB-2 U2b-2b] AI L3 尾段现算装配（消息窗/召回/文献/代理四腿
   *  ——对话管线批消费；本批零 IPC） */
  aiTail: AiTailService
  /** [F-DBCAMP-01 DB-2 U2] AI 记忆手动 CRUD 面（ai_memory 域五通道消费） */
  aiMemoryManual: AiMemoryManualService
  /** [F-DBCAMP-01 DB-2 U2] AI 随锚级联预览计数（ai_cascade 域单通道消费——
   *  级联删除本体=020 触发器，本面零删除方法） */
  aiCascade: AiCascadeService
  /** [F-DBCAMP-01 DB-3 U2] 快照导出面（envelope 纯构建+对端密钥面——snapshot
   *  域五通道消费；导入合并六闸归 U3） */
  snapshot: SnapshotService
  /** [F-DBCAMP-01 DB-3 U3] 快照导入合并面（六闸+防复活+A7 行级+拒收可见性
   *  ——snapshot 域第 6 通道 importFromFile 消费） */
  snapshotImport: SnapshotImportService
  /** [F-VISFB-43] 图表提取管线域（figures 五通道——App 提取桥+信息区清单面；
   *  主控六条件⑤：可选键收编必选〔42 时代零 ServiceBundle 键的接线欠账〕） */
  figures: FigureTaskService
}

export function createServices(deps: ServiceDeps): ServiceBundle {
  const aiSensor = createAiSensorService({ rootDir: deps.aiSensorRootDir })
  // [F-VISFB-42] 派生图表资产合同服务（提取会话状态机+资产守卫）——folders/
  //  papers delete 清理出口注入（folderDeps.figureAssets）；[F-VISFB-43] 任务
  //  编排服务消费+figures 域 IPC 入包
  const figureStore = createFigureStoreService({ repos: deps.repos, fileStore: deps.fileStore })
  // [F-VISFB-43] 图表提取任务编排（会话令牌/代际守卫/failed 聚合——串行化
  // 前提头注单源在 figure-tasks.service）；service 实例生命周期=课题容器
  // （workspace 切换重建=旧会话全灭）
  const figureTasks = createFigureTaskService({ repos: deps.repos, figureStore })
  // [F-VISFB-61] 悬浮笔记用例面（lineage.service graph 装配+lineage 域 IPC 消费）
  const floatingNotesSvc = createFloatingNotesService({
    repo: deps.repos.floatingNotes,
    folderExists: (id) => deps.repos.folders.findById(id) !== null
  })
  // [F-FOLDER-01] 共用依赖收口（folders/papers/library 三 service 同源注入）；
  // [F-DBCAMP-01 DB-4] +fileStore（papers/folders delete 文件隔离出口——§5.d②）；
  // [F-IMPORTGATE-01] +importGate（两 delete 互斥面——folderDeps 恒真值注入）
  const folderDeps = {
    repos: deps.repos,
    lineagePending: deps.lineagePending ?? (() => false),
    sendFoldersChanged: deps.sendFoldersChanged ?? (() => undefined),
    sendLineageChanged: deps.sendLineageChanged ?? (() => undefined),
    fileStore: deps.fileStore,
    importGate: deps.importGate,
    figureAssets: figureStore
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
      onProgress: deps.sendProgress,
      // [F-ALIGN-01 D3] 单跳落夹双播出口（原 renderer 后挂接链的 moveFolder
      //  广播面吸收——folderDeps 同源注入）
      sendFoldersChanged: deps.sendFoldersChanged,
      sendLineageChanged: deps.sendLineageChanged,
      // [F-VISFB-43] 导入完成→图表提取建单（幂等 enqueue——已有 job 不覆写）
      onImported: (ids) => figureTasks.enqueue(ids)
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
      tagNames: (ids) => deps.repos.tags.tagNamesByIds(ids),
      // [F-DBCAMP-01 DB-4 / F-STAR-01 A3] 星标批查（papers.starredByIds 单源
      // ——文献节点 isStarred 搭载，卡标记区数据源）
      starred: (ids) => deps.repos.papers.starredByIds(ids),
      // [F-VISFB-61] graph 通道悬浮笔记装配源（folderId 域过滤/undefined 并集）
      floatingNotes: floatingNotesSvc.notesForGraph
    }),
    // [F-VISFB-61] 悬浮笔记用例面（单实例——graph 装配与 lineage 域 IPC 同源）
    floatingNotes: floatingNotesSvc,
    aiSessions: createAiSessionsService({ repos: deps.repos }),
    aiMemorySearch: createAiMemorySearchService({ repos: deps.repos }),
    aiTasks: createAiTasksService({ repos: deps.repos }),
    aiContext: createAiContextService({ repos: deps.repos }),
    aiTail: createAiTailService({ repos: deps.repos }),
    aiMemoryManual: createAiMemoryManualService({ repos: deps.repos }),
    aiCascade: createAiCascadeService({ repos: deps.repos }),
    snapshot: createExportSnapshotService({ repos: deps.repos }),
    snapshotImport: createImportSnapshotService({ repos: deps.repos }),
    figures: figureTasks
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
