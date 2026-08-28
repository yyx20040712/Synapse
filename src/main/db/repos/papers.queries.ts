/**
 * papers.queries —— papers 表列表/详情查询件。
 * 从 papers.repo 拆出的查询 SQL 常量+行形状+行映射（repo ≤300 行关卡配套，
 * 纯查询/映射无行为逻辑）；消费面=papers.repo 的 searchSummaries/
 * listSummariesByIds/detailById。ENR-01：DETAIL_SQL 三缓存列与
 * DetailRow 三字段在此维护。
 */
import { escapeFtsQuery } from '../fts'
import type {
  EnrichStatus,
  LibraryQuery,
  LibrarySort,
  PaperSource,
  PaperSummary
} from '../../../shared/models/paper'

/** 排序键 → ORDER BY（附决胜键保证同键时分页稳定） */
export const ORDER_BY: Readonly<Record<LibrarySort, string>> = {
  added_desc: 'p.added_at DESC, p.id DESC',
  year_desc: 'p.year DESC, p.added_at DESC',
  title_asc: 'p.title ASC, p.id ASC'
}

/** 聚合列：标签/集合名用 char(31)（US 分隔符）串接，防名字本身含逗号 */
const AGG_COLS = `
  (SELECT GROUP_CONCAT(t.name, char(31)) FROM paper_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.paper_id = p.id) AS tag_names,
  (SELECT GROUP_CONCAT(c.name, char(31)) FROM paper_collections pc JOIN collections c ON c.id = pc.collection_id WHERE pc.paper_id = p.id) AS coll_names,
  (SELECT COUNT(*) FROM annotations a WHERE a.paper_id = p.id) AS annotation_count,
  (SELECT COUNT(*) FROM notes n WHERE n.paper_id = p.id) AS note_count`

/** 列表页 SELECT：一次往返带回全部聚合字段 */
export const LIST_SQL = `SELECT p.id, p.title, p.authors_json, p.year, p.venue, p.doi, p.added_at, p.last_read_page,
  ${AGG_COLS.trim()}
  FROM papers p`

export const DETAIL_SQL = `SELECT p.file_ref, p.abstract, p.arxiv_id, p.source, p.enrich_status, p.updated_at,
  p.id, p.title, p.authors_json, p.year, p.venue, p.doi, p.added_at, p.last_read_page,
  p.cited_by_count, p.cited_by_fetched_at, p.cited_by_count_source,
  ${AGG_COLS.trim()}
  FROM papers p WHERE p.id = ?`

/** 聚合查询内部行形状（蛇形列 + 聚合别名） */
export interface SummaryRow {
  id: string; title: string; authors_json: string
  year: number | null; venue: string; doi: string | null
  added_at: string; last_read_page: number
  tag_names: string | null; coll_names: string | null
  annotation_count: number; note_count: number
}

export interface DetailRow extends SummaryRow {
  file_ref: string; abstract: string
  arxiv_id: string | null; source: PaperSource
  enrich_status: EnrichStatus; updated_at: string
  cited_by_count: number | null
  cited_by_fetched_at: string | null
  cited_by_count_source: string | null
}

/** LIKE 兜底转义：% _ 与转义符 \ 本身 */
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`)
}

/** 聚合行 → PaperSummary（authors_json 解码、US 分隔串拆数组、驼峰化） */
export function toSummary(r: SummaryRow): PaperSummary {
  return {
    id: r.id, title: r.title,
    authors: JSON.parse(r.authors_json) as string[],
    year: r.year, venue: r.venue, doi: r.doi,
    tagNames: r.tag_names === null ? [] : r.tag_names.split('\u001f'),
    collectionNames: r.coll_names === null ? [] : r.coll_names.split('\u001f'),
    annotationCount: r.annotation_count, noteCount: r.note_count,
    lastReadPage: r.last_read_page, addedAt: r.added_at
  }
}

/** 组装搜索/过滤条件：片段固定、值参数绑定；cond 供拼 SQL 文本（进语句缓存） */
export function buildFilters(q: LibraryQuery): { cond: string; params: unknown[] } {
  const where: string[] = []
  const params: unknown[] = []
  const s = q.search?.trim() ?? ''
  if (s.length >= 3) {
    // trigram 分词器要求查询串 ≥3 字符；整段经 escapeFtsQuery 包成字面短语
    where.push('p.rowid IN (SELECT rowid FROM papers_fts WHERE papers_fts MATCH ?)')
    params.push(escapeFtsQuery(s))
  } else if (s.length > 0) {
    const pat = `%${escapeLike(s)}%`
    where.push("(p.title LIKE ? ESCAPE '\\' OR p.authors_json LIKE ? ESCAPE '\\')")
    params.push(pat, pat)
  }
  if (q.tagId !== undefined) {
    where.push('EXISTS (SELECT 1 FROM paper_tags pt WHERE pt.paper_id = p.id AND pt.tag_id = ?)')
    params.push(q.tagId)
  }
  if (q.collectionId !== undefined) {
    where.push(
      'EXISTS (SELECT 1 FROM paper_collections pc WHERE pc.paper_id = p.id AND pc.collection_id = ?)'
    )
    params.push(q.collectionId)
  }
  if (q.year !== undefined) {
    where.push('p.year = ?')
    params.push(q.year)
  }
  return { cond: where.length === 0 ? '' : ` WHERE ${where.join(' AND ')}`, params }
}
