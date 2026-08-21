/**
 * [SR-IPC-07] ipc/export_ —— 导出域装配（工单：open / weak）
 *
 * ── 行为层 ──
 * - bibtex：services.export_.buildBibtex(paperIds) → dialogs.saveFile(
 *   'synapse-export.bib', [{name:'BibTeX',extensions:['bib']}]) → null 取消则抛
 *   CANCELLED（code）错误；否则 writeToFile → { filePath, count: paperIds.length }
 * - csv：同上（文件名 synapse-export.csv，扩展 csv）
 * - report：buildReport(paperId) → saveFile(`${title安全化}.md`, md) → count 固定 1
 * - 文件名安全化：替换 Windows 非法字符 \\ / : * ? " < > | 为下划线，截断 80 字符
 *
 * ── 接口层 ──
 * - export function createExportIpc(deps: IpcDeps): ApiHandlers['export_']
 * - CANCELLED 错误：本文件定义 class CancelledError extends Error（register 折叠为
 *   AppError CANCELLED——注意 toAppError 只认 NotImplementedError/Error；实现时改抛
 *   带 code 的 DomainError，见 library.service 规约）
 *
 * ── 架构层 ──
 * - 对话框与写文件的顺序：先构建内容再询问路径（构建失败不弹框）
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 测试：tests/unit/ipc/export_.test.ts（已锁定，dialogs/services 桩）
 */
import { unimplementedObject } from '../../shared/app-error'
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { IpcDeps } from './index'

export function createExportIpc(_deps: IpcDeps): ApiHandlers['export_'] {
  return unimplementedObject<ApiHandlers['export_']>('SR-IPC-07', 'ipc.export_')
}
