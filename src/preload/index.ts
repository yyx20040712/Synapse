/**
 * Preload 桥（SR-INFRA-13，已完成）。
 *
 * 职责：按 shared/ipc/api-surface 的接线表逐通道生成白名单方法，暴露为 window.api。
 * 不泄漏 ipcRenderer；不暴露任意通道 invoke（renderer 不能自由发消息）。
 * 契约：tests/contracts/preload-surface.test.ts 断言运行时暴露面与接线表一致。
 */
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { API_SURFACE, EVENT_CHANNELS, type PreloadApi, type PreloadEvents } from '../shared/ipc/api-surface'
import type { ExportCorpusEvent, ImportProgressEvent } from '../shared/ipc/schemas'

function buildApi(): PreloadApi {
  const api: Record<string, Record<string, (req: unknown) => Promise<unknown>>> = {}
  for (const [domain, methods] of Object.entries(API_SURFACE)) {
    const group: Record<string, (req: unknown) => Promise<unknown>> = {}
    for (const [method, ep] of Object.entries(methods)) {
      group[method] = (req: unknown) => ipcRenderer.invoke(ep.channel, req)
    }
    api[domain] = group
  }
  return api as unknown as PreloadApi
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
    }
  }
}

contextBridge.exposeInMainWorld('api', buildApi())
contextBridge.exposeInMainWorld('apiEvents', buildEvents())
