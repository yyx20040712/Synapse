import type { PreloadApi, PreloadDrag, PreloadEvents } from '../shared/ipc/api-surface'

declare global {
  interface Window {
    api: PreloadApi
    /** 拖拽导入桥（P7E-02）：File→路径解析唯一口，与 api 同级（INV-54） */
    apiDrag: PreloadDrag
    apiEvents: PreloadEvents
  }
}

export {}
