/**
 * [SR-IPC-05] ipc/import_ —— 导入域装配（工单：open / weak）
 *
 * ── 行为层 ──
 * - fromDialog：deps.dialogs.pickPdfFiles() → null（用户取消）返回空结果
 *   { imported: [], duplicates: [], failed: [] }；有路径→ deps.services.import_.importFiles(paths)
 * - fromFolder：pickFolder() 同上 → importFolder(folder)
 * - 构造 services.import_ 时把 deps.sendProgress 作为 onProgress 传入
 *   （createImportService({ repos, fileStore, onProgress: deps.sendProgress })——
 *   注意 service 工厂在 services 桶里已建好；实现本工单时改为从 deps.services.import_ 调用，
 *   进度转发由本层用包装实现：onProgress 语义在 services 桶已固定，若需要重建带进度的
 *   service 实例，使用 deps.services.import_ 的方法并在本层放弃进度转发（可接受）或
 *   经 EventChannel 直接由 service 层持有 sendProgress——采用后者时改 services 桶 deps）
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
