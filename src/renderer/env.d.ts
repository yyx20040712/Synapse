import type { PreloadApi } from '../shared/ipc/api-surface'
import type { ImportProgressEvent } from '../shared/ipc/schemas'

declare global {
  interface Window {
    api: PreloadApi
    apiEvents: {
      onImportProgress(cb: (e: ImportProgressEvent) => void): () => void
    }
  }
}

export {}
