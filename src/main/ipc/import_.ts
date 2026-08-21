/**
 * [SR-IPC-05] ipc/import_ —— 导入域装配（工单：open / weak）
 *
 * ── 行为层 ──
 * - fromDialog：deps.dialogs.pickPdfFiles() → null（用户取消）返回空结果
 *   { imported: [], duplicates: [], failed: [] }；有路径→ deps.services.import_.importFiles(paths)
 * - fromFolder：pickFolder() 同上 → importFolder(folder)
 * - 进度推送已由 bootstrap 注入 services 桶（services.sendProgress → webContents.send），
 *   本层是纯薄分发，不碰 sendProgress、不重建 service 实例
 *
 * ── 接口层 ──
 * - export function createImportIpc(deps: IpcDeps): ApiHandlers['import_']
 *
 * ── 架构层 ──
 * - 对话框取消不是错误（返回空 ImportResult）；import 的失败明细在 failed 数组
 *
 * ── 生命周期层 ──
 * - 不做：拖拽路径（renderer 的 webUtils.getPathForFile 在 preload 暴露——v2）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/ipc/import_.test.ts（已锁定，dialogs/services 桩）
 */
import { unimplementedObject } from '../../shared/app-error'
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { IpcDeps } from './index'

export function createImportIpc(_deps: IpcDeps): ApiHandlers['import_'] {
  return unimplementedObject<ApiHandlers['import_']>('SR-IPC-05', 'ipc.import_')
}
