/**
 * [SR-DB-01] papers.repo —— papers 表仓储（工单：done）
 *
 * ── 行为层 ──
 * - 单表 CRUD + FTS 联查列表页查询（搜索/筛选/排序/分页/计数；聚合 JOIN 子查询一次往返）
 *
 * ── 接口层 ──
 * - export interface PaperRow：表行形状（authors_json 等原始列）
 * - export interface PapersRepo：方法签名见下方接口定义，此处只记行为约定
 * - searchSummaries：FTS（≥3 字 escapeFtsQuery）/短串 LIKE 兜底（只搜
 *   title/authors_json，锁定合约见 papers.repo.test）；过滤/排序/total 语义
 *   同锁定测试；listSummariesByIds 保序跳缺；listAllIds=全库 id（added_at
 *   DESC——corpusSet 全库取数，C-02）
 *
 * ── 架构层 ──
 * - 依赖：db/connection 的 SqliteDb、db/fts 的转义函数、shared 模型与常量
 * - 禁止：业务判断（重复检测是 import.service 的事，这里只报 findBySha256）
 * - SQL 一律 db.prepare 预编译 + 参数绑定；FTS 输入必须经 escapeFtsQuery；
 *   动态拼接只出现在固定白名单的列名/排序键/占位符个数上，值一律参数绑定
 *
 * ── 生命周期层 ──
 * - SELECT 用显式列名（不用 SELECT *），防后续迁移加列导致形状漂移
 * - 不做：跨表事务编排（services 负责）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/db/repos/papers.repo.test.ts（已锁定；先读测试再实现）
 * - 时间戳 UTC ISO；id 由上层生成后整行传入；updateMeta/applyEnrichment 同步 updated_at
 */
import { escapeFtsQuery } from '../fts'
import { APP_FILE_SCHEME } from '../../../shared/constants'
import type Database from 'better-sqlite3'
import type { SqliteDb } from '../connection'
import type {
  EnrichStatus,
  LibraryQuery,
  LibrarySort,
  PaperDetail,
  PaperMetaPatch,
  PaperSource,
  PaperSummary,
  Paged
} from '../../../shared/models/paper'

export interface PaperRow {
  id: string
  file_ref: string
  sha256: string
  title: string
  authors_json: string
  year: number | null
  venue: string
  doi: string | null
  arxiv_id: string | null
  abstract: string
  source: PaperSource
  enrich_status: EnrichStatus
  added_at: string
  updated_at: string
  last_read_page: number
}

export interface PapersRepo {
  insert(row: PaperRow): void
  findById(id: string): PaperRow | null
  findBySha256(sha256: string): PaperRow | null
  fileRefById(id: string): string | null
  updateMeta(id: string, patch: PaperMetaPatch): PaperRow | null
  applyEnrichment(
    id: string,
    e: { source: PaperSource; enrichStatus: EnrichStatus; patch: PaperMetaPatch }
  ): PaperRow | null
  updateReadPage(id: string, page: number): void
  searchSummaries(q: LibraryQuery): Paged<PaperSummary>
  listSummariesByIds(ids: string[]): PaperSummary[]
  listAllIds(): string[]
  detailById(id: string): PaperDetail | null
}

/** 预编译语句类型（显式给 unknown[]：ReturnType 推导会被条件类型解析成单参语句） */
type Stmt = Database.Statement<unknown[]>

/** 显式列清单（与 PaperRow 一一对应；insert 绑定顺序以此为准） */
const COLS =
  'id, file_ref, sha256, title, authors_json, year, venue, doi, arxiv_id, ' +
  'abstract, source, enrich_status, added_at, updated_at, last_read_page'

const INSERT_SQL = `INSERT INTO papers (${COLS}) VALUES (${COLS.split(', ').map(() => '?').join(', ')})`

/** PaperMetaPatch 字段 → 表列名（authors 在仓储边界序列化为 authors_json） */
const PATCH_COLS: Readonly<Partial<Record<keyof PaperMetaPatch, string>>> = {
  title: 'title',
  authors: 'authors_json',
  year: 'year',
  venue: 'venue',
  doi: 'doi',
  abstract: 'abstract'
}

/** 排序键 → ORDER BY（附决胜键保证同键时分页稳定） */
const ORDER_BY: Readonly<Record<LibrarySort, string>> = {
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
const LIST_SQL = `SELECT p.id, p.title, p.authors_json, p.year, p.venue, p.doi, p.added_at, p.last_read_page,
  ${AGG_COLS.trim()}
  FROM papers p`

const DETAIL_SQL = `SELECT p.file_ref, p.abstract, p.arxiv_id, p.source, p.enrich_status, p.updated_at,
  p.id, p.title, p.authors_json, p.year, p.venue, p.doi, p.added_at, p.last_read_page,
  ${AGG_COLS.trim()}
  FROM papers p WHERE p.id = ?`

/** 聚合查询内部行形状（蛇形列 + 聚合别名） */
interface SummaryRow {
  id: string; title: string; authors_json: string
  year: number | null; venue: string; doi: string | null
  added_at: string; last_read_page: number
  tag_names: string | null; coll_names: string | null
  annotation_count: number; note_count: number
}

interface DetailRow extends SummaryRow {
  file_ref: string; abstract: string
  arxiv_id: string | null; source: PaperSource
  enrich_status: EnrichStatus; updated_at: string
}

/** LIKE 兜底转义：% _ 与转义符 \ 本身 */
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`)
}

/** 聚合行 → PaperSummary（authors_json 解码、US 分隔串拆数组、驼峰化） */
function toSummary(r: SummaryRow): PaperSummary {
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

/** meta 补丁 → 列名/绑定值（authors 数组在此序列化；未提供的字段不进 SET） */
function patchFragments(patch: PaperMetaPatch): { columns: string[]; values: unknown[] } {
  const columns: string[] = []
  const values: unknown[] = []
  for (const key of Object.keys(patch) as (keyof PaperMetaPatch)[]) {
    const col = PATCH_COLS[key]
    if (col === undefined) continue
    columns.push(col)
    values.push(key === 'authors' ? JSON.stringify(patch[key]) : patch[key])
  }
  return { columns, values }
}

export function createPapersRepo(db: SqliteDb): PapersRepo {
  // 语句缓存（SQL 文本 → 预编译语句）：过滤/补丁的组合只编译一次，重复调用零成本
  const cache = new Map<string, Stmt>()
  const stmt = (sql: string): Stmt => {
    const hit = cache.get(sql)
    if (hit !== undefined) return hit
    const prepared = db.prepare(sql)
    cache.set(sql, prepared)
    return prepared
  }

  const findById = (id: string): PaperRow | null =>
    (stmt(`SELECT ${COLS} FROM papers WHERE id = ?`).get(id) as PaperRow | undefined) ?? null

  /** 按给定列更新（列名来自白名单）并同步 updated_at；未命中返回 null */
  const updateColumns = (id: string, columns: string[], values: unknown[]): PaperRow | null => {
    const sets = [...columns.map((c) => `${c} = ?`), 'updated_at = ?'].join(', ')
    const info = stmt(`UPDATE papers SET ${sets} WHERE id = ?`).run(...values, new Date().toISOString(), id)
    return info.changes === 0 ? null : findById(id)
  }

  /** 组装搜索/过滤条件：片段固定、值参数绑定；cond 供拼 SQL 文本（进语句缓存） */
  const buildFilters = (q: LibraryQuery): { cond: string; params: unknown[] } => {
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

  return {
    insert(row) {
      stmt(INSERT_SQL).run(
        row.id, row.file_ref, row.sha256, row.title, row.authors_json, row.year,
        row.venue, row.doi, row.arxiv_id, row.abstract, row.source, row.enrich_status,
        row.added_at, row.updated_at, row.last_read_page
      )
    },
    findById,
    findBySha256(sha256) {
      const r = stmt(`SELECT ${COLS} FROM papers WHERE sha256 = ?`).get(sha256) as PaperRow | undefined
      return r === undefined ? null : r
    },
    fileRefById(id) {
      const r = stmt('SELECT file_ref FROM papers WHERE id = ?').get(id) as
        | { file_ref: string } | undefined
      return r === undefined ? null : r.file_ref
    },
    updateMeta(id, patch) {
      const f = patchFragments(patch)
      return updateColumns(id, f.columns, f.values)
    },
    applyEnrichment(id, e) {
      const f = patchFragments(e.patch)
      return updateColumns(
        id,
        ['source', 'enrich_status', ...f.columns],
        [e.source, e.enrichStatus, ...f.values]
      )
    },
    updateReadPage(id, page) {
      stmt('UPDATE papers SET last_read_page = ? WHERE id = ?').run(page, id)
    },
    searchSummaries(q) {
      const { cond, params } = buildFilters(q)
      const rows = stmt(`${LIST_SQL}${cond} ORDER BY ${ORDER_BY[q.sort]} LIMIT ? OFFSET ?`)
        .all(...params, q.limit, q.offset) as SummaryRow[]
      const count = stmt(`SELECT COUNT(*) AS n FROM papers p${cond}`).get(...params) as { n: number }
      return { items: rows.map(toSummary), total: count.n }
    },
    listSummariesByIds(ids) {
      if (ids.length === 0) return []
      const marks = ids.map(() => '?').join(', ')
      const rows = stmt(`${LIST_SQL} WHERE p.id IN (${marks})`).all(...ids) as SummaryRow[]
      const byId = new Map(rows.map((r) => [r.id, toSummary(r)]))
      return ids.flatMap((id) => {
        const s = byId.get(id)
        return s === undefined ? [] : [s]
      })
    },
    listAllIds() {
      const rows = stmt('SELECT id FROM papers ORDER BY added_at DESC, id DESC').all() as Array<{ id: string }>
      return rows.map((r) => r.id)
    },
    detailById(id) {
      const r = stmt(DETAIL_SQL).get(id) as DetailRow | undefined
      if (r === undefined) return null
      const tags = stmt(
        'SELECT t.id AS id, t.name AS name FROM paper_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.paper_id = ? ORDER BY t.name'
      ).all(id) as { id: string; name: string }[]
      const collections = stmt(
        'SELECT c.id AS id, c.name AS name FROM paper_collections pc JOIN collections c ON c.id = pc.collection_id WHERE pc.paper_id = ? ORDER BY c.name'
      ).all(id) as { id: string; name: string }[]
      const slashPos = r.file_ref.lastIndexOf('/') + 1 // -1+1=0：无斜杠时取整串
      return {
        ...toSummary(r),
        abstract: r.abstract,
        arxivId: r.arxiv_id,
        source: r.source,
        enrichStatus: r.enrich_status,
        fileUrl: `${APP_FILE_SCHEME}://${r.id}`,
        fileName: r.file_ref.slice(slashPos),
        updatedAt: r.updated_at,
        tags,
        collections
      }
    }
  }
}
