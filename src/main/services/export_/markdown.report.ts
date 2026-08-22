/**
 * [SR-SVC-08] markdown.report —— 读书报告生成纯函数（工单：done / weak）
 *
 * ── 行为层 ──
 * - buildReadingReport({ paper, annotations, note })：输出结构——
 *   # {title}
 *   元信息行（作者 / 年份 / 期刊 / DOI / 已读进度）
 *   ## 高亮摘录：每条 "- > {quote}（p.{page+1}）"；评论非空时缩进 4 空格另起一行
 *   ## 笔记：note 的标题与 Markdown 原文（无笔记则省略整节）
 *   末行：生成时间（本地时区 YYYY-MM-DD HH:mm）
 *
 * ── 接口层 ──
 * - export interface ReportData { paper: PaperDetail; annotations: Annotation[];
 *     note: Note | null }
 * - export function buildReadingReport(data: ReportData): string
 *
 * ── 架构层 ──
 * - 纯函数；标注排序：page 升序、同页按 startOffset 升序
 * - 高亮正文超过 300 字符截断加 "…"；评论空则不输出评论行；空标注仍产出骨架
 *
 * ── 生命周期层 ──
 * - 不做：Word/PDF 渲染（v2）；不做引用格式化（那是 CSL 的领域）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/services/markdown.report.test.ts（已锁定，golden 比对）
 */
import type { Annotation } from '../../../shared/models/annotation'
import type { PaperDetail } from '../../../shared/models/paper'
import type { Note } from '../../../shared/models/note'

export interface ReportData {
  paper: PaperDetail
  annotations: Annotation[]
  note: Note | null
}

/** 高亮摘录截断阈值（字符） */
const QUOTE_MAX_CHARS = 300

/** 本地时区 YYYY-MM-DD HH:mm（手拼避免 toLocaleString 的环境差异） */
function localStamp(): string {
  const now = new Date()
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(
    now.getHours()
  )}:${pad(now.getMinutes())}`
}

function truncate(s: string): string {
  return s.length > QUOTE_MAX_CHARS ? `${s.slice(0, QUOTE_MAX_CHARS)}…` : s
}

export function buildReadingReport(data: ReportData): string {
  const { paper, note } = data
  const lines: string[] = [`# ${paper.title}`, '']

  const meta: string[] = [`- 作者：${paper.authors.join('、') || '—'}`]
  meta.push(`- 年份：${paper.year === null ? '—' : String(paper.year)}`)
  if (paper.venue !== '') meta.push(`- 期刊：${paper.venue}`)
  if (paper.doi !== null) meta.push(`- DOI：${paper.doi}`)
  meta.push(`- 已读：第 ${paper.lastReadPage + 1} 页`)
  lines.push(...meta, '')

  lines.push('## 高亮摘录', '')
  const sorted = [...data.annotations].sort(
    (a, b) => a.page - b.page || a.startOffset - b.startOffset
  )
  if (sorted.length === 0) {
    lines.push('（暂无高亮）', '')
  }
  for (const ann of sorted) {
    lines.push(`- > ${truncate(ann.quoteText)}（p.${ann.page + 1}）`)
    if (ann.comment !== '') {
      lines.push(`    ${ann.comment}`)
    }
  }

  if (note !== null) {
    lines.push('', '## 笔记', '')
    if (note.title !== '') {
      lines.push(`### ${note.title}`, '')
    }
    lines.push(note.contentMd)
  }

  lines.push('', `---`, `生成时间：${localStamp()}`)
  return `${lines.join('\n')}\n`
}
