import type { PreloadApi, PreloadEvents } from '../shared/ipc/api-surface'

declare global {
  interface Window {
    api: PreloadApi
    apiEvents: PreloadEvents
  }
}

export {}
