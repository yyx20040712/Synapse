/**
 * IPC 装配桶（SR-INFRA-17，已完成）——把服务/对话框/事件等环境能力拼成 ApiHandlers。
 * 各域装配在 ipc/<域>.ts（各自工单）；本文件只做接线与依赖形状定义。
 */
import type { ApiHandlers } from '../../shared/ipc/api-surface'
export type { IpcDeps } from './ipc-deps'
import type { IpcDeps } from './ipc-deps'
import { createLibraryIpc } from './library'
import { createReaderIpc } from './reader'
import { createNotesIpc } from './notes'
import { createTagsIpc } from './tags'
import { createImportIpc } from './import_'
import { createEnrichIpc } from './enrich'
import { createExportIpc } from './export_'
import { createAiSensorIpc } from './ai_sensor'
import { createLineageIpc } from './lineage'
import { createSettingsIpc } from './settings'
import { createSystemIpc } from './system'

export function createIpcHandlers(deps: IpcDeps): ApiHandlers {
  return {
    library: createLibraryIpc(deps),
    reader: createReaderIpc(deps),
    notes: createNotesIpc(deps),
    tags: createTagsIpc(deps),
    import_: createImportIpc(deps),
    enrich: createEnrichIpc(deps),
    export_: createExportIpc(deps),
    ai_sensor: createAiSensorIpc(deps),
    lineage: createLineageIpc(deps),
    settings: createSettingsIpc(deps),
    system: createSystemIpc(deps)
  }
}
