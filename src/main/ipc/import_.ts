/**
 * [SR-IPC-05] ipc/import_ —— 导入域装配（工单：done / weak）
 *
 * ── 行为层 ──
 * - fromDialog：deps.dialogs.pickPdfFiles() → null（用户取消）返回空结果
 *   { imported: [], duplicates: [], failed: [] }；有路径→ deps.services.import_.importFiles(paths)
 * - fromFolder：pickFolder() 同上 → importFolder(folder)
 * - fromPaths（P7E-02）：一行委托 importFiles(req.paths)——路径由 preload webUtils
 *   桥（apiDrag.importDropped）解析产生，通道对 renderer 隐藏（INV-07 修订/INV-54）
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
 * - 拖拽路径已兑现（P7E-02，原 v2 预留注记）：File 经 preload webUtils 解析 →
 *   apiDrag 单口 → 本通道；路径串生命周期限 preload 堆内
 *
 * ── 文化层 ──
 * - 测试：tests/unit/ipc/import_.test.ts（已锁定，dialogs/services 桩）；
 *   fromPaths 用例在 tests/unit/ipc/import-paths.test.ts（新文件承载）
 */
import type { ImportResult } from '../../shared/ipc/schemas'
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { IpcDeps } from './ipc-deps'

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
    },
    // 拖拽路径（P7E-02）：请求已过 preload 过滤（.pdf 后缀+数量上限）与 schema 双门
    fromPaths: (req) => deps.services.import_.importFiles(req.paths)
  }
}
