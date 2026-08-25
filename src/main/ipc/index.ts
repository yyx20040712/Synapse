/**
 * IPC 装配桶（SR-INFRA-17，已完成）——把服务/对话框/事件等环境能力拼成 ApiHandlers。
 * 各域装配在 ipc/<域>.ts（各自工单）；本文件只做接线与依赖形状定义。
 */
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { ServiceBundle } from '../services'
import type { Dialogs } from '../dialogs'
import type { ShellLike } from '../security/shell-guard'
import { createLibraryIpc } from './library'
import { createReaderIpc } from './reader'
import { createNotesIpc } from './notes'
import { createTagsIpc } from './tags'
import { createImportIpc } from './import_'
import { createEnrichIpc } from './enrich'
import { createExportIpc } from './export_'
import { createSettingsIpc } from './settings'
import { createSystemIpc } from './system'

export interface IpcDeps {
  services: ServiceBundle
  dialogs: Dialogs
  shell: ShellLike
  /** settings.json 所在目录 */
  userDataDir: string
  /** 网络诊断探活（http-client.pingHost 的包装，探 ALLOWED_REMOTE_HOSTS） */
  ping: (host: string) => Promise<{ ok: boolean; latencyMs: number }>
  /** TABS-04 退出拦截：renderer dirty 上报落点（main-window 模块缓存） */
  setQuitDirty: (dirty: boolean) => void
}

export function createIpcHandlers(deps: IpcDeps): ApiHandlers {
  return {
    library: createLibraryIpc(deps),
    reader: createReaderIpc(deps),
    notes: createNotesIpc(deps),
    tags: createTagsIpc(deps),
    import_: createImportIpc(deps),
    enrich: createEnrichIpc(deps),
    export_: createExportIpc(deps),
    settings: createSettingsIpc(deps),
    system: createSystemIpc(deps)
  }
}
