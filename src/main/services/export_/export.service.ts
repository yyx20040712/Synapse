/**
 * [SR-SVC-06] export.service —— 导出编排（工单：done / weak）
 *
 * ── 行为层 ──
 * - buildBibtex(paperIds)：papers.listSummariesByIds → makeCitationKey +
 *   serializeBibtex（无 venue 的条目 type 兜底 misc）；ids 顺序保持调用方顺序
 * - buildCsv(paperIds)：UTF-8 BOM + 表头 Title,Authors,Year,Venue,DOI,AddedAt；
 *   字段双引号包裹、内嵌双引号翻倍、换行替换为空格（Excel 友好）
 * - buildReport(paperId)：papers.detailById + annotations.listByPaper +
 *   notes.findByPaper → buildReadingReport；不存在抛 NOT_FOUND
 * - writeToFile(path, content)：fs 写入 UTF-8，失败抛 IO_ERROR（DomainError 形状）
 *
 * ── 接口层 ──
 * - export interface ExportService {
 *     buildBibtex(paperIds: string[]): Promise<string>
 *     buildCsv(paperIds: string[]): Promise<string>
 *     buildReport(paperId: string): Promise<string>
 *     writeToFile(path: string, content: string): Promise<void>
 *   }
 * - export function createExportService(deps: { repos: Repos }): ExportService
 *
 * ── 架构层 ──
 * - 序列化纯函数在 bibtex.serializer / markdown.report（各自独立工单）；本层只做
 *   取数与拼装；保存对话框在 ipc 层（UI 胶水）
 *
 * ── 生命周期层 ──
 * - 不做：导出到剪贴板（v2 预留：ipc 加通道）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/services/export.service.test.ts（已锁定，repos 桩）
 */
import { writeFile } from 'node:fs/promises'
import type { AppErrorCode } from '../../../shared/app-error'
import type { PaperDetail } from '../../../shared/models/paper'
import type { Repos } from '../../db/repos'
import {
  makeCitationKey,
  serializeBibtex,
  type BibtexEntryData
} from './bibtex.serializer'
import { buildReadingReport } from './markdown.report'

/** 域错误：NOT_FOUND（报告目标不存在）与 IO_ERROR（写盘失败）载体 */
class ExportDomainError extends Error {
  readonly code: AppErrorCode

  constructor(code: AppErrorCode, message: string) {
    super(message)
    this.name = 'ExportDomainError'
    this.code = code
  }
}

export interface ExportService {
  buildBibtex(paperIds: string[]): Promise<string>
  buildCsv(paperIds: string[]): Promise<string>
  buildReport(paperId: string): Promise<string>
  writeToFile(path: string, content: string): Promise<void>
}

/** CSV 字段：双引号包裹，内嵌双引号翻倍，换行压空格 */
function csvCell(s: string): string {
  return `"${s.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`
}

export function createExportService(deps: { repos: Repos }): ExportService {
  const { papers, annotations, notes } = deps.repos

  /** 按 id 逐个取全量详情（BibTeX/CSV 需要的字段在 detail 上；缺失的 id 跳过） */
  function detailsOf(paperIds: string[]): PaperDetail[] {
    const out: PaperDetail[] = []
    for (const id of paperIds) {
      const d = papers.detailById(id)
      if (d !== null) {
        out.push(d)
      }
    }
    return out
  }

  return {
    async buildBibtex(paperIds) {
      const entries: BibtexEntryData[] = detailsOf(paperIds).map((d) => ({
        key: makeCitationKey(d.title, d.year, d.authors[0] ?? 'anon'),
        type: d.venue === '' ? 'misc' : 'article',
        title: d.title,
        authors: d.authors,
        year: d.year,
        venue: d.venue,
        doi: d.doi
      }))
      return serializeBibtex(entries)
    },

    async buildCsv(paperIds) {
      const head = 'Title,Authors,Year,Venue,DOI,AddedAt'
      const rows = detailsOf(paperIds).map((d) =>
        [
          d.title,
          d.authors.join('; '),
          d.year === null ? '' : String(d.year),
          d.venue,
          d.doi ?? '',
          d.addedAt
        ]
          .map(csvCell)
          .join(',')
      )
      return `\uFEFF${[head, ...rows].join('\n')}\n`
    },

    async buildReport(paperId) {
      const detail = papers.detailById(paperId)
      if (detail === null) {
        throw new ExportDomainError('NOT_FOUND', `文献不存在：${paperId}`)
      }
      return buildReadingReport({
        paper: detail,
        annotations: annotations.listByPaper(paperId),
        note: notes.findByPaper(paperId)
      })
    },

    async writeToFile(path, content) {
      try {
        await writeFile(path, content, 'utf-8')
      } catch (e) {
        throw new ExportDomainError(
          'IO_ERROR',
          `导出写盘失败：${e instanceof Error ? e.message : String(e)}`
        )
      }
    }
  }
}
