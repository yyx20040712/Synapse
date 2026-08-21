/**
 * [SR-SVC-08] markdown.report —— 读书报告生成纯函数（工单：open / weak）
 *
 * ── 行为层 ──
 * - buildReadingReport({ paper, annotations, note })：输出结构——
 *   # {title}
 *   元信息行（作者 / 年份 / 期刊 / DOI）
 *   ## 高亮摘录：按页分组；每条 "- > {quoteText}（p.{page+1}）" + 缩进评论行
 *   ## 笔记：note 的 Markdown 原文（无笔记则省略整节）
 *   末行：生成时间（本地时区 YYYY-MM-DD HH:mm）
 *
 * ── 接口层 ──
 * - export interface ReportData { paper: PaperDetail; annotations: Annotation[];
 *     note: Note | null }
 * - export function buildReadingReport(data: ReportData): string
 *
 * ── 架构层 ──
 * - 纯函数；标注排序：page 升序、同页按 startOffset 升序
 * - 高亮正文超过 300 字符截断加 "…"；评论空则不输出评论行
 *
 * ── 生命周期层 ──
 * - 不做：Word/PDF 渲染（v2）；不做引用格式化（那是 CSL 的领域）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/services/markdown.report.test.ts（已锁定，golden 比对）
 */
import { NotImplementedError } from '../../../shared/app-error'
import type { Annotation } from '../../../shared/models/annotation'
import type { PaperDetail } from '../../../shared/models/paper'
import type { Note } from '../../../shared/models/note'

export interface ReportData {
  paper: PaperDetail
  annotations: Annotation[]
  note: Note | null
}

export function buildReadingReport(_data: ReportData): string {
  throw new NotImplementedError('SR-SVC-08', 'markdown 报告生成')
}
