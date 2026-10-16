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
import { createFoldersIpc } from './folders'
import { createPapersIpc } from './papers'
// [F-VISFB-43] 图表提取管线域（5 通道——契约=shared/ipc/schemas.ts figures 段）
import { createFiguresIpc } from './figures'
// [F-DBCAMP-01 DB-2 U2] AI 域六件（13 通道——契约=shared/ipc/ai-schemas.ts）
import { createAiSessionsIpc } from './ai_sessions'
import { createAiMessagesIpc } from './ai_messages'
import { createAiMemoryIpc } from './ai_memory'
import { createAiTasksIpc } from './ai_tasks'
import { createAiAuditIpc } from './ai_audit'
import { createAiCascadeIpc } from './ai_cascade'
// [F-DBCAMP-01 DB-3 U2] 快照导出域（5 通道——契约=shared/ipc/schemas.ts snapshot 段）
import { createSnapshotIpc } from './snapshot'

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
    system: createSystemIpc(deps),
    folders: createFoldersIpc(deps),
    papers: createPapersIpc(deps),
    figures: createFiguresIpc(deps),
    ai_sessions: createAiSessionsIpc(deps),
    ai_messages: createAiMessagesIpc(deps),
    ai_memory: createAiMemoryIpc(deps),
    ai_tasks: createAiTasksIpc(deps),
    ai_audit: createAiAuditIpc(deps),
    ai_cascade: createAiCascadeIpc(deps),
    snapshot: createSnapshotIpc(deps)
  }
}
