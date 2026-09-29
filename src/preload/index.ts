/**
 * Preload 桥（SR-INFRA-13，已完成；P7E-02 增拖拽桥）。
 *
 * 职责：按 shared/ipc/api-surface 的接线表逐通道生成白名单方法，暴露为 window.api
 * （PRELOAD_HIDDEN_METHODS 隐藏面除外）；拖拽导入经 window.apiDrag 单口
 * （File→webUtils 解析→过滤→import/from-paths，路径串不出 preload 堆）。
 * 不泄漏 ipcRenderer；不暴露任意通道 invoke（renderer 不能自由发消息）。
 * 契约：tests/contracts/preload-surface.test.ts 断言运行时暴露面与接线表（减隐藏面）一致。
 */
import { contextBridge, ipcRenderer, webUtils, type IpcRendererEvent } from 'electron'
import {
  API_SURFACE,
  EVENT_CHANNELS,
  PRELOAD_HIDDEN_METHODS,
  type PreloadApi,
  type PreloadDrag,
  type PreloadEvents
} from '../shared/ipc/api-surface'
import type {
  ExportCorpusEvent,
  FoldersChangedEvent,
  ImportProgressEvent,
  ImportResult,
  LineageChangedEvent,
  WindowStateEvent
} from '../shared/ipc/schemas'
import {
  exportCorpusEventSchema,
  importProgressEventSchema,
  foldersChangedEventSchema,
  lineageChangedEventSchema,
  windowStateEventSchema
} from '../shared/ipc/events.schemas'
import { err, type Result } from '../shared/app-error'
import { planDroppedImports } from './drag-import'

function buildApi(): PreloadApi {
  const api: Record<string, Record<string, (req: unknown) => Promise<unknown>>> = {}
  const hidden = PRELOAD_HIDDEN_METHODS as Record<string, readonly string[]>
  for (const [domain, methods] of Object.entries(API_SURFACE)) {
    const group: Record<string, (req: unknown) => Promise<unknown>> = {}
    const hiddenMethods = hidden[domain] ?? []
    for (const [method, ep] of Object.entries(methods)) {
      // P7E-02：隐藏通道不上 window.api（fromPaths 载荷只能由下方拖拽桥组装）
      if (hiddenMethods.includes(method)) continue
      group[method] = (req: unknown) => ipcRenderer.invoke(ep.channel, req)
    }
    api[domain] = group
  }
  return api as unknown as PreloadApi
}

/**
 * 拖拽导入桥（P7E-02，INV-54）：File → 路径解析唯一口。
 * none/too-many 在 preload 堆内即拒（零通道 invoke）；ok 才组装
 * import/from-paths 载荷——renderer 全程不接触路径串。
 */
function buildDrag(): PreloadDrag {
  return {
    importDropped(files: File[]): Promise<Result<ImportResult>> {
      const plan = planDroppedImports(files, (f) => webUtils.getPathForFile(f))
      if (plan.kind === 'none') return Promise.resolve(err('INVALID_REQUEST', '仅支持拖入 PDF 文件'))
      if (plan.kind === 'too-many') return Promise.resolve(err('INVALID_REQUEST', '一次最多拖入 100 个文件'))
      return ipcRenderer.invoke('import/from-paths', { paths: plan.paths })
    }
  }
}

/**
 * 守卫消费的 schema 结构面（safeParse 结果的最小 duck 形状——免依赖 zod
 * 内部导出名与泛型变型；warn 消费面=issues）
 */
type EventGuardSchema<T> = {
  safeParse(
    data: unknown
  ): { success: true; data: T } | { success: false; error: { issues: unknown[] } }
}

/**
 * 事件帧接收侧守卫（D-GOV-4）：事件面 preload 侧兜底——main=
 * 受信生产者不重复校验（镜像入侧单向纪律，零改 main 发送点），接收侧
 * safeParse 失败 = console.warn + 丢弃该帧、订阅存活（三事件均通知/进度类，
 * 丢帧=陈旧一拍自愈；事件流不因单帧死亡——listener 不摘除不抛出）。
 */
function guardedEventForwarder<T>(
  channel: string,
  schema: EventGuardSchema<T>,
  cb: (e: T) => void
): (event: IpcRendererEvent, payload: unknown) => void {
  return (_event, payload) => {
    const parsed = schema.safeParse(payload)
    if (!parsed.success) {
      console.warn(
        `[apiEvents] ${channel} 事件帧校验失败，丢弃该帧（订阅保持存活）`,
        parsed.error.issues
      )
      return
    }
    cb(parsed.data)
  }
}

/**
 * 事件订阅（main→renderer 单向推送），返回退订函数；形状来自 PreloadEvents
 * （单一真相源）。三 listener 经 guardedEventForwarder 接收侧兜底。
 * 导出=测试消费（tests/unit/preload-events-guard.test.ts mock electron 直测；
 * cjs bundle 多挂一个 exports 属性无运行时影响）。
 */
export function buildEvents(): PreloadEvents {
  return {
    onImportProgress(cb: (e: ImportProgressEvent) => void): () => void {
      const listener = guardedEventForwarder(
        EVENT_CHANNELS.importProgress,
        importProgressEventSchema,
        cb
      )
      ipcRenderer.on(EVENT_CHANNELS.importProgress, listener)
      return () => ipcRenderer.removeListener(EVENT_CHANNELS.importProgress, listener)
    },
    onExportCorpus(cb: (e: ExportCorpusEvent) => void): () => void {
      const listener = guardedEventForwarder(EVENT_CHANNELS.exportCorpus, exportCorpusEventSchema, cb)
      ipcRenderer.on(EVENT_CHANNELS.exportCorpus, listener)
      return () => ipcRenderer.removeListener(EVENT_CHANNELS.exportCorpus, listener)
    },
    onWindowState(cb: (e: WindowStateEvent) => void): () => void {
      const listener = guardedEventForwarder(EVENT_CHANNELS.windowState, windowStateEventSchema, cb)
      ipcRenderer.on(EVENT_CHANNELS.windowState, listener)
      return () => ipcRenderer.removeListener(EVENT_CHANNELS.windowState, listener)
    },
    // [F-FOLDER-01] 双失效通知（空载荷——订阅方重拉 folders.list/lineage.graph）
    onFoldersChanged(cb: (e: FoldersChangedEvent) => void): () => void {
      const listener = guardedEventForwarder(
        EVENT_CHANNELS.foldersChanged,
        foldersChangedEventSchema,
        cb
      )
      ipcRenderer.on(EVENT_CHANNELS.foldersChanged, listener)
      return () => ipcRenderer.removeListener(EVENT_CHANNELS.foldersChanged, listener)
    },
    onLineageChanged(cb: (e: LineageChangedEvent) => void): () => void {
      const listener = guardedEventForwarder(
        EVENT_CHANNELS.lineageChanged,
        lineageChangedEventSchema,
        cb
      )
      ipcRenderer.on(EVENT_CHANNELS.lineageChanged, listener)
      return () => ipcRenderer.removeListener(EVENT_CHANNELS.lineageChanged, listener)
    }
  }
}

contextBridge.exposeInMainWorld('api', buildApi())
contextBridge.exposeInMainWorld('apiDrag', buildDrag())
contextBridge.exposeInMainWorld('apiEvents', buildEvents())
