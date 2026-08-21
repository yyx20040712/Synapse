/**
 * [SR-IPC-05] ipc/import_ —— 导入域装配（工单：done / weak）
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
import type { ImportResult } from '../../shared/ipc/schemas'
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { IpcDeps } from './index'

/** 空结果字面量每次新建，避免跨调用共享同一可变对象 */
const emptyImportResult = (): ImportResult => ({ imported: [], duplicates: [], failed: [] })

export function createImportIpc(deps: IpcDeps): ApiHandlers['import_'] {
  return {
    // 对话框取消（null）不是错误：返回空结果，不触发导入、不上抛
    fromDialog: async () => {
      const paths = await deps.dialogs.pickPdfFiles()
      return paths === null ? emptyImportResult() : deps.services.import_.importFiles(paths)
    },
    fromFolder: async () => {
      const folder = await deps.dialogs.pickFolder()
      return folder === null ? emptyImportResult() : deps.services.import_.importFolder(folder)
    }
  }
}
