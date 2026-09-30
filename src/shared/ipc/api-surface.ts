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
import { lineageNodeSchema, lineageEdgeSchema } from '../models/lineage'
import { folderSchema } from '../models/folder'
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
    fromFolder: { channel: 'import/from-folder', Req: S.voidReqSchema, Res: S.importResultSchema },
    // P7E-02：拖拽路径通道——main 侧全量注册，但 preload 不暴露（见 PRELOAD_HIDDEN_METHODS）
    fromPaths: { channel: 'import/from-paths', Req: S.importPathsReqSchema, Res: S.importResultSchema }
  },
  enrich: {
    fetch: { channel: 'enrich/fetch', Req: S.enrichReqSchema, Res: paperDetailSchema }
  },
  export_: {
    bibtex: { channel: 'export/bibtex', Req: S.exportSelectionReqSchema, Res: S.exportResSchema },
    csv: { channel: 'export/csv', Req: S.exportSelectionReqSchema, Res: S.exportResSchema },
    // P7E-04：剪贴板导出（main 侧构建 main 侧写——内容不过 renderer）；Res=
    // exportResSchema 的 count 子集（无落盘路径），值位 inline zod 先例=ai_sensor listByPaper
    clipboard: {
      channel: 'export/clipboard',
      Req: S.clipboardReqSchema,
      Res: z.object({ count: z.number().int().min(1) }).strict()
    },
    report: { channel: 'export/report', Req: S.reportReqSchema, Res: S.exportResSchema },
    corpus: { channel: 'export/corpus', Req: S.corpusReqSchema, Res: S.exportResSchema },
    // [F-LIBUI-01 ⑨] corpusSet（export/corpus-set）通道退役（用户 D4 裁决
    // 2026-09-29）——通道三方收窄（本表+schemas+preload 泛型桥自动收窄）
    corpusItem: { channel: 'export/corpus-item', Req: S.corpusItemReqSchema, Res: S.trueAckSchema },
    corpusSession: { channel: 'export/corpus-session', Req: S.corpusSessionReqSchema, Res: S.corpusSessionResSchema }
  },
  // ai_sensor 域（2026-08-27 用户裁决 ADR-0017）：AI-06 两通道自 export_ 域
  // 迁入（通道名 ai-sensor/* 不变）+ AI-07 回灌导入器两通道（ai-notes/*）
  ai_sensor: {
    requestAiRead: { channel: 'ai-sensor/request-read', Req: S.paperIdReqSchema, Res: S.aiReadJobResSchema },
    aiStatus: { channel: 'ai-sensor/status', Req: S.voidReqSchema, Res: S.aiSensorStatusResSchema },
    observe: { channel: 'ai-sensor/observe', Req: S.paperIdReqSchema, Res: S.observeResSchema },
    importAll: { channel: 'ai-notes/import', Req: S.voidReqSchema, Res: S.aiNotesImportResSchema },
    listByPaper: { channel: 'ai-notes/list', Req: S.paperIdReqSchema, Res: z.array(aiNoteSchema) },
    // AI-10：设置页 zcode 联动（通道名 zcode-link/*——域归属 ai_sensor，ADR-0017）
    zcodeDetect: { channel: 'zcode-link/detect', Req: S.voidReqSchema, Res: S.zcodeLinkDetectResSchema },
    zcodeInstall: { channel: 'zcode-link/install', Req: S.voidReqSchema, Res: S.zcodeLinkInstallResSchema }
  },
  // lineage 域（LG-01 立域，ADR-0014）：全图读+写四通道（LG-03 交互编辑接线
  // ——树守卫宿主=service upsertEdge，IPC 零守卫透传）
  // [T3-P5] 6→7 通道：upsertLineTypes 图级线型整体替换（D-P5-4 弃双通道 CRUD）
  // [F-FOLDER-01] graph 入参 +folderId（图切换器子图读——W4 改写面）；
  // upsertNode 载荷 +folderId（节点 DTO/models 侧扩——本表仅随 Res schema 变）
  // [F-BAKRET-01] 7→6 通道：lineage/import 草稿导入退役（用户裁决 2026-09-30）
  lineage: {
    graph: { channel: 'lineage/graph', Req: S.lineageGraphReqSchema, Res: S.lineageGraphResSchema },
    upsertNode: { channel: 'lineage/upsert-node', Req: S.lineageUpsertNodeReqSchema, Res: lineageNodeSchema },
    removeNode: { channel: 'lineage/remove-node', Req: S.lineageIdReqSchema, Res: S.trueAckSchema },
    upsertEdge: { channel: 'lineage/upsert-edge', Req: S.lineageUpsertEdgeReqSchema, Res: lineageEdgeSchema },
    removeEdge: { channel: 'lineage/remove-edge', Req: S.lineageIdReqSchema, Res: S.trueAckSchema },
    upsertLineTypes: {
      channel: 'lineage/upsert-line-types',
      Req: S.lineageUpsertLineTypesReqSchema,
      Res: S.lineageUpsertLineTypesReqSchema
    }
  },
  tags: {
    list: { channel: 'tags/list', Req: S.voidReqSchema, Res: z.array(S.tagWithCountSchema) },
    upsert: { channel: 'tags/upsert', Req: S.tagNameReqSchema, Res: tagSchema },
    attach: { channel: 'tags/attach', Req: S.attachTagReqSchema, Res: S.trueAckSchema },
    detach: { channel: 'tags/detach', Req: S.detachTagReqSchema, Res: S.trueAckSchema },
    // P7E-01 标签生命周期三通道（register/preload 泛型全通道遍历零改）
    rename: { channel: 'tags/rename', Req: S.renameTagReqSchema, Res: tagSchema },
    merge: { channel: 'tags/merge', Req: S.mergeTagReqSchema, Res: S.trueAckSchema },
    delete: { channel: 'tags/delete', Req: S.tagIdReqSchema, Res: S.trueAckSchema },
    // [F-TAGS-01] 标签颜色（单通道：hex|null=恢复默认；Res=更新后 Tag）
    setColor: { channel: 'tags/set-color', Req: S.tagSetColorReqSchema, Res: tagSchema }
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
    setQuitDirty: { channel: 'system/set-quit-dirty', Req: S.setQuitDirtyReqSchema, Res: S.trueAckSchema },
    // R2-SH3 frameless 窗控：单通道四 action（主控预裁①——接线表/契约面最小）
    windowControl: { channel: 'system/window-control', Req: S.windowControlReqSchema, Res: S.windowControlResSchema }
  },
  // workspaces 域（R1-WS1，ADR-0018 课题隔离）：四通道。switch 返回后 renderer
  // reload 归 R1-WS2——本域 handlers 由 bootstrap 组合注入（见 ComposedHandlerDomains）
  workspaces: {
    list: { channel: 'workspaces/list', Req: S.voidReqSchema, Res: S.workspaceListResSchema },
    create: { channel: 'workspaces/create', Req: S.workspaceCreateReqSchema, Res: S.workspaceCreateResSchema },
    rename: { channel: 'workspaces/rename', Req: S.workspaceRenameReqSchema, Res: S.trueAckSchema },
    switch: { channel: 'workspaces/switch', Req: S.workspaceSwitchReqSchema, Res: S.trueAckSchema }
  },
  // folders 域（[F-FOLDER-01] 文件夹×脉络图绑定——design-final §2.1）：四通道。
  // kebab-case 命名门先例=tags/set-color；CRUD 编排+事件广播在 folders.service
  folders: {
    list: { channel: 'folders/list', Req: S.voidReqSchema, Res: z.array(folderSchema) },
    create: { channel: 'folders/create', Req: S.folderCreateReqSchema, Res: folderSchema },
    rename: { channel: 'folders/rename', Req: S.folderRenameReqSchema, Res: S.trueAckSchema },
    delete: { channel: 'folders/delete', Req: S.folderDeleteReqSchema, Res: S.trueAckSchema }
  },
  // papers 域（[F-FOLDER-01] 单通道起步）：move-folder 移动/移出事务序在
  // library.service（§3.4+W2 终裁）——域归属 papers（通道名 papers/*，
  // 与 library 元数据域分域）
  papers: {
    moveFolder: { channel: 'papers/move-folder', Req: S.paperMoveReqSchema, Res: S.trueAckSchema }
  }
} satisfies Record<string, Record<string, Endpoint>>

/** main→renderer 单向事件通道 */
export const EVENT_CHANNELS = {
  importProgress: 'import/progress/event',
  exportCorpus: 'export/corpus/event',
  // R2-SH3：maximize 状态推送（图标态单源=main 侧事件沿）
  windowState: 'system/window-state/event',
  // [F-FOLDER-01] 双失效通知（空载荷——renderer 重拉 folders.list/lineage.graph，
  // 不携带数据防双真相；folders CRUD+papers.move 广播 folders.changed，
  // 图结构变更（移动/删图级联）加播 lineage.changed——S3/S4 联动数据源）
  foldersChanged: 'folders/changed/event',
  lineageChanged: 'lineage/changed/event'
} as const

/** 事件桥形状（preload 暴露与 renderer 全局声明的单一类型来源，禁止两处手写） */
export type PreloadEvents = {
  onImportProgress(cb: (e: S.ImportProgressEvent) => void): () => void
  onExportCorpus(cb: (e: S.ExportCorpusEvent) => void): () => void
  onWindowState(cb: (e: S.WindowStateEvent) => void): () => void
  onFoldersChanged(cb: (e: S.FoldersChangedEvent) => void): () => void
  onLineageChanged(cb: (e: S.LineageChangedEvent) => void): () => void
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

/**
 * bootstrap 组合装配域（R1-WS1 主控裁决：ipc/index.ts+ipc/register.ts 零改动）。
 * 这些域的 handlers 不出自 createIpcHandlers，而由 bootstrap 在 registerIpc 前
 * 组合补齐（表驱动注册不变——registerIpc 仍按本表全量注册+校验）。
 * 代价申报：ApiHandlers 对该域可选=漏组合不再编译期拦截（运行时接线缺失由
 * contracts 枚举+单测/e2e 锚定补偿）；PreloadApi 不受影响（全量映射）。
 */
type ComposedHandlerDomains = 'workspaces'

/**
 * preload 不暴露到 window.api 的方法（P7E-02 主控 Design 裁决）：
 * fromPaths 通道 main 侧照常全量注册，但 renderer 不可达——路径串生命周期限
 * preload 堆内（apiDrag 单口解析，INV-07 修订/INV-54）；被攻陷 renderer 即使
 * 拿到 api 也无法 invoke 任意路径串。const+PreloadApi 的 Exclude 类型双消费
 * 单源（先例=ComposedHandlerDomains 的消费形态）。
 */
export const PRELOAD_HIDDEN_METHODS = {
  import_: ['fromPaths']
} as const

/** main 侧 service 契约：收已校验请求，返回纯数据（异常上抛由 register 统一折叠） */
export type ApiHandlers = {
  [D in Exclude<keyof Surface, ComposedHandlerDomains>]: {
    [M in keyof Surface[D]]: (req: z.output<Ep<D, M>['Req']>) => Promise<z.output<Ep<D, M>['Res']>>
  }
} & {
  [D in ComposedHandlerDomains]?: {
    [M in keyof Surface[D]]: (req: z.output<Ep<D, M>['Req']>) => Promise<z.output<Ep<D, M>['Res']>>
  }
}

/** 域内隐藏方法名并集（域不在 PRELOAD_HIDDEN_METHODS → never，Exclude 恒等） */
type HiddenOf<D extends keyof Surface> = D extends keyof typeof PRELOAD_HIDDEN_METHODS
  ? (typeof PRELOAD_HIDDEN_METHODS)[D][number]
  : never

/** 域内 preload 可见方法键（隐藏面排除——单源消费 PRELOAD_HIDDEN_METHODS） */
type VisibleMethodKeys<D extends keyof Surface> = Exclude<keyof Surface[D], HiddenOf<D>>

/** 单通道的桥签名（Ep 推导收进别名体——mapped key 泛型调用与值位 Ep 索引访问
 *  同现会踩 esbuild 解析缺陷，别名层规避；语义零变） */
type MethodBridge<D extends keyof Surface, M extends keyof Surface[D]> = (
  req: z.input<Ep<D, M>['Req']>
) => Promise<Result<z.output<Ep<D, M>['Res']>>>

/** renderer 可见的 API 形状：入参宽松（默认值可省），返回一律 Result；
 *  隐藏通道（PRELOAD_HIDDEN_METHODS）从暴露面排除——单源消费 */
export type PreloadApi = {
  [D in keyof Surface]: {
    [M in VisibleMethodKeys<D>]: MethodBridge<D, M>
  }
}

/**
 * 拖拽导入桥形状（P7E-02）：File → 路径解析唯一口（webUtils 经 preload），
 * 与 api 同级暴露为 window.apiDrag——非 renderer 直连 ipc。File 类型可用
 * （tsconfig.web / tsconfig.node 两套 lib 均含 DOM）。
 */
export type PreloadDrag = {
  importDropped(files: File[]): Promise<Result<S.ImportResult>>
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
