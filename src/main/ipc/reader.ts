/**
 * [SR-IPC-02] ipc/reader —— 阅读器域装配（工单：done / weak）
 *
 * ── 行为层 ──
 * - 纯委托 services.reader 的六个方法（open/标注增改删列/进度）
 *
 * ── 接口层 ──
 * - export function createReaderIpc(deps: IpcDeps): ApiHandlers['reader']
 *
 * ── 架构层 ── / ── 生命周期层 ──
 * - 同 ipc/library；无本地状态
 *
 * ── 文化层 ──
 * - 测试：tests/unit/ipc/reader.test.ts（已锁定，services 桩）
 * - service 抛错（ReaderDomainError NOT_FOUND 等）在本层原样上抛，由 register 折叠为 Result
 */
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { IpcDeps } from './index'

export function createReaderIpc(deps: IpcDeps): ApiHandlers['reader'] {
  return {
    open: (req) => deps.services.reader.open(req),
    saveAnnotation: (req) => deps.services.reader.saveAnnotation(req),
    updateAnnotation: (req) => deps.services.reader.updateAnnotation(req),
    deleteAnnotation: (req) => deps.services.reader.deleteAnnotation(req),
    listAnnotations: (req) => deps.services.reader.listAnnotations(req),
    saveProgress: (req) => deps.services.reader.saveProgress(req)
  }
}
