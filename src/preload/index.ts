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
  ImportProgressEvent,
  ImportResult,
  WindowStateEvent
} from '../shared/ipc/schemas'
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

/** 事件订阅（main→renderer 单向推送），返回退订函数；形状来自 PreloadEvents（单一真相源） */
function buildEvents(): PreloadEvents {
  return {
    onImportProgress(cb: (e: ImportProgressEvent) => void): () => void {
      const listener = (_e: IpcRendererEvent, payload: ImportProgressEvent): void => cb(payload)
      ipcRenderer.on(EVENT_CHANNELS.importProgress, listener)
      return () => ipcRenderer.removeListener(EVENT_CHANNELS.importProgress, listener)
    },
    onExportCorpus(cb: (e: ExportCorpusEvent) => void): () => void {
      const listener = (_e: IpcRendererEvent, payload: ExportCorpusEvent): void => cb(payload)
      ipcRenderer.on(EVENT_CHANNELS.exportCorpus, listener)
      return () => ipcRenderer.removeListener(EVENT_CHANNELS.exportCorpus, listener)
    },
    onWindowState(cb: (e: WindowStateEvent) => void): () => void {
      const listener = (_e: IpcRendererEvent, payload: WindowStateEvent): void => cb(payload)
      ipcRenderer.on(EVENT_CHANNELS.windowState, listener)
      return () => ipcRenderer.removeListener(EVENT_CHANNELS.windowState, listener)
    }
  }
}

contextBridge.exposeInMainWorld('api', buildApi())
contextBridge.exposeInMainWorld('apiDrag', buildDrag())
contextBridge.exposeInMainWorld('apiEvents', buildEvents())
