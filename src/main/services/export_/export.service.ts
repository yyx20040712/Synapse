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
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { AppErrorCode } from '../../../shared/app-error'
import type { PaperDetail } from '../../../shared/models/paper'
import type { Repos } from '../../db/repos'
import {
  makeCitationKey,
  serializeBibtex,
  type BibtexEntryData
} from './bibtex.serializer'
import { assembleCorpusMd } from './corpus.assemble'
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

export interface CorpusSetEntry {
  paperId: string
  content: string
}

export interface CorpusSetResult {
  entries: CorpusSetEntry[]
  /** 单篇取数失败清单（不中断全库——消费方 toast 承载可见性，INV-02） */
  skipped: Array<{ paperId: string; reason: string }>
}

export interface ExportService {
  buildBibtex(paperIds: string[]): Promise<string>
  buildCsv(paperIds: string[]): Promise<string>
  buildReport(paperId: string): Promise<string>
  /** 单篇 corpus md（C-02：装配纯函数单源=corpus.assemble.ts——R12 条款） */
  buildCorpus(paperId: string): Promise<string>
  /** 全库语料（listAllIds 逐篇；失败篇入 skipped 不中断） */
  buildCorpusSet(): Promise<CorpusSetResult>
  /** 集合落盘：mkdir corpus/ 前置+逐篇写 <dir>/corpus/<paperId>.md，返回成功数 */
  writeCorpusSet(dir: string, entries: CorpusSetEntry[]): Promise<number>
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

    async buildCorpus(paperId) {
      const detail = papers.detailById(paperId)
      if (detail === null) {
        throw new ExportDomainError('NOT_FOUND', `文献不存在：${paperId}`)
      }
      return assembleCorpusMd({
        paper: detail,
        note: notes.findByPaper(paperId),
        annotations: annotations.listByPaper(paperId)
      })
    },

    async buildCorpusSet() {
      const entries: CorpusSetEntry[] = []
      const skipped: Array<{ paperId: string; reason: string }> = []
      const ids = papers.listAllIds()
      for (let i = 0; i < ids.length; i += 1) {
        const id = ids[i]
        if (id === undefined) continue
        // 每 25 篇让出事件循环（better-sqlite3 同步取数+装配，大库不卡 main——deepseek W1）
        if (i > 0 && i % 25 === 0) {
          await new Promise<void>((resolve) => setImmediate(resolve))
        }
        try {
          const detail = papers.detailById(id)
          if (detail === null) {
            throw new ExportDomainError('NOT_FOUND', `文献不存在：${id}`)
          }
          entries.push({
            paperId: id,
            content: assembleCorpusMd({
              paper: detail,
              note: notes.findByPaper(id),
              annotations: annotations.listByPaper(id)
            })
          })
        } catch (e) {
          // 仅业务性跳过（NOT_FOUND）入 skipped；程序缺陷（转义/类型等意外异常）
          // 上抛失败可见——不把 bug 静默折叠成「跳过」（deepseek W3）
          if (e instanceof ExportDomainError) {
            skipped.push({ paperId: id, reason: e.message })
          } else {
            throw e
          }
        }
      }
      return { entries, skipped }
    },

    async writeCorpusSet(dir, entries) {
      const corpusDir = join(dir, 'corpus')
      try {
        await mkdir(corpusDir, { recursive: true })
        for (const e of entries) {
          // paperId 消防消毒（id 由 import.service 生成本可信——纵深防御，
          // deepseek N6：异常 id 不越出 corpus 目录）
          const safeId = e.paperId.replace(/[^a-zA-Z0-9_-]/g, '_')
          await writeFile(join(corpusDir, `${safeId}.md`), e.content, 'utf8')
        }
      } catch (e) {
        throw new ExportDomainError(
          'IO_ERROR',
          `语料导出写盘失败（已写入的部分文件保留，重跑导出将覆盖）：${e instanceof Error ? e.message : String(e)}`
        )
      }
      return entries.length
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
