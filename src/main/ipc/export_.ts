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
 * - clipboard（P7E-04）：format 枚举单通道——先构建（buildBibtex/buildCsv 单源
 *   复用，构建失败零剪贴板副作用）后经 deps.clipboard.writeText 写系统剪贴板，
 *   res { count }；无保存对话框 → 无 CANCELLED 分支（与 exportTo 文件导出的
 *   语义差异——取消面不存在，失败面只有构建/写入两种）
 * - 文件名安全化：替换 Windows 非法字符 \\ / : * ? " < > | 与全角冒号为下划线、
 *   空白归一为下划线，截断 80 字符
 *
 * ── 接口层 ──
 * - export function createExportIpc(deps: IpcDeps): ApiHandlers['export_']
 * - 取消错误按域错误惯例抛带 code 的 Error（register 经 toAppError 折叠；
 *   基类单源=services/shared/domain-error，F-DEDUP-01——.CancelledError
 *   单独子类没有必要）
 *
 * ── 架构层 ──
 * - 对话框与写文件的顺序：先构建内容再询问路径（构建失败不弹框）
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 测试：tests/unit/ipc/export_.test.ts（已锁定，dialogs/services 桩）
 * - [F-LIBUI-01 ⑨] corpusSet 通道退役（用户 D4 裁决 2026-09-29）：全库
 *   corpus md 目录导出整链删除；corpus 单篇与 corpusSession 五件套通道零触碰
 */
import { DomainError } from '../services/shared/domain-error'
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { IpcDeps } from './ipc-deps'

/** 域错误：用户取消保存（CANCELLED）载体（基类一行继承——F-DEDUP-01 单源） */
class ExportIpcError extends DomainError {}

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

  /** 剪贴板导出（P7E-04，E7 语义声明：无对话框→无 CANCELLED 分支）：先构建后
   *  写（E5——构建失败零剪贴板副作用）；写口经 deps.clipboard 注入（main 侧
   *  单点，INV-56），构建复用 buildBibtex/buildCsv（单源禁复制第二份序列化） */
  async function exportClipboard(
    format: 'bibtex' | 'csv',
    paperIds: string[]
  ): Promise<{ count: number }> {
    if (deps.clipboard === undefined) {
      throw new Error('剪贴板依赖未装配（bootstrap 接线缺失）')
    }
    const content =
      format === 'bibtex'
        ? await deps.services.export_.buildBibtex(paperIds)
        : await deps.services.export_.buildCsv(paperIds)
    // F-ELE-03：Electron 44 起 writeText 返回 Promise——await 化，写失败
    // console.error 留痕后重抛（错误仍经 IPC 折叠给 renderer，不静默吞）
    try {
      await deps.clipboard.writeText(content)
    } catch (err) {
      console.error('[export_.clipboard] 剪贴板写入失败', err)
      throw err
    }
    return { count: paperIds.length }
  }

  return {
    corpusItem: (req) => deps.services.corpus_export.corpusItem(req),

    corpusSession: async (req) => {
      // INV-07：目录只出自 main 侧系统对话框（C-02 exportTo 同型——dialog 在
      // ipc 层；单飞判定在 service 单例，dialog 期间并发由模态性+BUSY 兜底）
      const dir = await deps.dialogs.pickFolder()
      if (dir === null) {
        throw new ExportIpcError('CANCELLED', '已取消选择导出目录')
      }
      return deps.services.corpus_export.exportCorpusSession({
        dir,
        paperIds: req.paperIds
      })
    },

    bibtex: (req) =>
      exportTo('synapse-export.bib', BIB_FILTER, () =>
        deps.services.export_.buildBibtex(req.paperIds), req.paperIds.length),

    csv: (req) =>
      exportTo('synapse-export.csv', CSV_FILTER, () =>
        deps.services.export_.buildCsv(req.paperIds), req.paperIds.length),

    clipboard: (req) => exportClipboard(req.format, req.paperIds),

    report: async (req) => {
      const detail = await deps.services.library.detail({ paperId: req.paperId })
      return exportTo(`${safeFileName(detail.title)}.md`, MD_FILTER, () =>
        deps.services.export_.buildReport(req.paperId), 1)
    },

    corpus: async (req) => {
      const detail = await deps.services.library.detail({ paperId: req.paperId })
      return exportTo(`${safeFileName(detail.title)}.md`, MD_FILTER, () =>
        deps.services.export_.buildCorpus(req.paperId), 1)
    }
  }
}
