/**
 * [SR-IPC-07] ipc/export_ —— 导出域装配（工单：done / weak）
 *
 * ── 行为层 ──
 * - bibtex：services.export_.buildBibtex(paperIds) → dialogs.saveFile(
 *   'synapse-export.bib', [{name:'BibTeX',extensions:['bib']}]) → null 取消则抛
 *   CANCELLED（code）错误；否则 writeToFile → { filePath, count: paperIds.length }
 * - csv：同上（文件名 synapse-export.csv，扩展 csv）
 * - report：先取 detail 得标题 → buildReport(paperId) → saveFile(`${title安全化}.md`)
 *   → writeToFile → count 固定 1
 * - 文件名安全化：替换 Windows 非法字符 \\ / : * ? " < > | 与全角冒号为下划线、
 *   空白归一为下划线，截断 80 字符
 *
 * ── 接口层 ──
 * - export function createExportIpc(deps: IpcDeps): ApiHandlers['export_']
 * - 取消错误按域错误惯例抛带 code 的 Error（register 经 toAppError 折叠，见
 *   library.service 规约——.CancelledError 单独子类没有必要）
 *
 * ── 架构层 ──
 * - 对话框与写文件的顺序：先构建内容再询问路径（构建失败不弹框）
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 测试：tests/unit/ipc/export_.test.ts（已锁定，dialogs/services 桩）
 */
import type { AppErrorCode } from '../../shared/app-error'
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { IpcDeps } from './index'

/** 域错误：用户取消保存（CANCELLED）载体 */
class ExportIpcError extends Error {
  readonly code: AppErrorCode

  constructor(code: AppErrorCode, message: string) {
    super(message)
    this.name = 'ExportIpcError'
    this.code = code
  }
}

const BIB_FILTER = [{ name: 'BibTeX', extensions: ['bib'] }]
const CSV_FILTER = [{ name: 'CSV', extensions: ['csv'] }]
const MD_FILTER = [{ name: 'Markdown', extensions: ['md'] }]

/** 报告文件名安全化：非法字符（含全角冒号）与空白 → 下划线，截断 80 字符 */
function safeFileName(title: string): string {
  return title
    .replace(/[\\/:*?"<>|：]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 80)
}

export function createExportIpc(deps: IpcDeps): ApiHandlers['export_'] {
  /** 通用导出流：构建内容 → 询问路径（取消即 CANCELLED）→ 写盘 */
  async function exportTo(
    defaultName: string,
    extFilters: Array<{ name: string; extensions: string[] }>,
    build: () => Promise<string>,
    count: number
  ): Promise<{ filePath: string; count: number }> {
    const content = await build()
    const target = await deps.dialogs.saveFile(defaultName, extFilters)
    if (target === null) {
      throw new ExportIpcError('CANCELLED', '已取消保存')
    }
    await deps.services.export_.writeToFile(target, content)
    return { filePath: target, count }
  }

  return {
    bibtex: (req) =>
      exportTo('synapse-export.bib', BIB_FILTER, () =>
        deps.services.export_.buildBibtex(req.paperIds), req.paperIds.length),

    csv: (req) =>
      exportTo('synapse-export.csv', CSV_FILTER, () =>
        deps.services.export_.buildCsv(req.paperIds), req.paperIds.length),

    report: async (req) => {
      const detail = await deps.services.library.detail({ paperId: req.paperId })
      return exportTo(`${safeFileName(detail.title)}.md`, MD_FILTER, () =>
        deps.services.export_.buildReport(req.paperId), 1)
    }
  }
}
