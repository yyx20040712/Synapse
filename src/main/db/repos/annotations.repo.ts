/**
 * [SR-DB-02] annotations.repo —— annotations 表仓储（已完成）
 *
 * ── 行为层 ──
 * - 标注 CRUD + 按文献列出（按 page、sort_key 稳定排序）
 * - quote/comment 的 FTS 搜索（阅读器内搜高亮/评论）
 *
 * ── 接口层 ──
 * - export interface AnnotationsRepo：
 *     insert(paperId: string, input: AnnotationInput): Annotation   // id/时间戳在此生成
 *     update(annotation: Annotation): Annotation | null              // 整体替换
 *     delete(id: string): boolean                                    // 影响行数>0
 *     listByPaper(paperId: string): Annotation[]                     // ORDER BY page, sort_key
 *     search(paperId: string | null, q: string): Annotation[]        // FTS；paperId 可选过滤
 *     countByPaper(paperId: string): number
 *
 * ── 架构层 ──
 * - 依赖：db/connection、db/fts 转义、shared/models/annotation
 * - rects 与 DB 列 rects_json 的编解码在此封装（JSON.parse/stringify + zod 校验）
 * - SQL 一律预编译参数化；FTS 输入必须经 escapeFtsQuery
 * - search 策略与 papers.repo 一致：trigram 分词器无法命中 <3 字符的查询
 *   （如 2 字中文"漏损"），故 q.trim().length >= 3 走 FTS MATCH，更短走
 *   LIKE 兜底（% 与 _ 用 ESCAPE '\' 转义，参数绑定）
 *
 * ── 生命周期层 ──
 * - 不做：跨实体级联（外键 ON DELETE CASCADE 已由 schema 保证）；
 *   FTS 索引由 schema 触发器自动同步，仓储层无需手动维护
 *
 * ── 文化层 ──
 * - 测试：tests/unit/db/repos/annotations.repo.test.ts（已锁定）
 * - UUID 用 crypto.randomUUID()；时间戳 new Date().toISOString()（UTC）
 */
import { annotationRectSchema } from '../../../shared/models/annotation'
import type {
  Annotation,
  AnnotationColor,
  AnnotationInput,
  AnnotationKind
} from '../../../shared/models/annotation'
import type { SqliteDb } from '../connection'
import { escapeFtsQuery } from '../fts'

/** 表行形状（rects_json 为原始 JSON 字符串列；kind/color 值域由 CHECK 约束保证） */
interface AnnotationRow {
  id: string
  paper_id: string
  page: number
  kind: AnnotationKind
  color: AnnotationColor
  quote_text: string
  prefix_text: string
  suffix_text: string
  start_offset: number
  end_offset: number
  rects_json: string
  sort_key: string
  comment: string
  created_at: string
  updated_at: string
}

export interface AnnotationsRepo {
  insert(paperId: string, input: AnnotationInput): Annotation
  update(annotation: Annotation): Annotation | null
  delete(id: string): boolean
  listByPaper(paperId: string): Annotation[]
  search(paperId: string | null, q: string): Annotation[]
  countByPaper(paperId: string): number
}

/**
 * sort_key："页码:序号"。序号取页内起始偏移（8 位零填充），字典序即数值序，
 * 同页多标注按文档位置稳定排序，与索引 idx_annotations_paper(paper_id, page, sort_key) 对齐。
 */
function buildSortKey(page: number, startOffset: number): string {
  return `${page}:${String(startOffset).padStart(8, '0')}`
}

/** LIKE 通配符转义（% 与 _ 及转义符自身），配合 ESCAPE '\' 子句使用 */
function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (c) => `\\${c}`)
}

/** 表行 → 领域模型；rects_json 解析后经 zod 校验（损坏数据当场暴露而非静默吞掉） */
function toAnnotation(row: AnnotationRow): Annotation {
  const parsed: unknown = JSON.parse(row.rects_json)
  return {
    id: row.id,
    paperId: row.paper_id,
    page: row.page,
    kind: row.kind,
    color: row.color,
    quoteText: row.quote_text,
    prefixText: row.prefix_text,
    suffixText: row.suffix_text,
    startOffset: row.start_offset,
    endOffset: row.end_offset,
    rects: annotationRectSchema.array().parse(parsed),
    comment: row.comment,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function createAnnotationsRepo(db: SqliteDb): AnnotationsRepo {
  // 全部语句工厂期一次性预编译；SELECT 用显式列名（002 迁移加列不受影响）
  const stmtInsert = db.prepare(`
    INSERT INTO annotations (
      id, paper_id, page, kind, color, quote_text, prefix_text, suffix_text,
      start_offset, end_offset, rects_json, sort_key, comment, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const stmtGetById = db.prepare(`
    SELECT id, paper_id, page, kind, color, quote_text, prefix_text, suffix_text,
           start_offset, end_offset, rects_json, sort_key, comment, created_at, updated_at
    FROM annotations WHERE id = ?
  `)
  const stmtUpdate = db.prepare(`
    UPDATE annotations SET
      paper_id = ?, page = ?, kind = ?, color = ?, quote_text = ?, prefix_text = ?,
      suffix_text = ?, start_offset = ?, end_offset = ?, rects_json = ?, sort_key = ?,
      comment = ?, created_at = ?, updated_at = ?
    WHERE id = ?
  `)
  const stmtDelete = db.prepare('DELETE FROM annotations WHERE id = ?')
  const stmtListByPaper = db.prepare(`
    SELECT id, paper_id, page, kind, color, quote_text, prefix_text, suffix_text,
           start_offset, end_offset, rects_json, sort_key, comment, created_at, updated_at
    FROM annotations WHERE paper_id = ? ORDER BY page, sort_key
  `)
  const stmtCountByPaper = db.prepare(
    'SELECT COUNT(*) AS n FROM annotations WHERE paper_id = ?'
  )
  // FTS 路径（external content 表，rowid 关联源表；quote/comment 由触发器同步）
  const stmtSearchFtsAll = db.prepare(`
    SELECT a.id, a.paper_id, a.page, a.kind, a.color, a.quote_text, a.prefix_text, a.suffix_text,
           a.start_offset, a.end_offset, a.rects_json, a.sort_key, a.comment,
           a.created_at, a.updated_at
    FROM annotations_fts JOIN annotations a ON a.rowid = annotations_fts.rowid
    WHERE annotations_fts MATCH ? ORDER BY a.page, a.sort_key
  `)
  const stmtSearchFtsPaper = db.prepare(`
    SELECT a.id, a.paper_id, a.page, a.kind, a.color, a.quote_text, a.prefix_text, a.suffix_text,
           a.start_offset, a.end_offset, a.rects_json, a.sort_key, a.comment,
           a.created_at, a.updated_at
    FROM annotations_fts JOIN annotations a ON a.rowid = annotations_fts.rowid
    WHERE annotations_fts MATCH ? AND a.paper_id = ? ORDER BY a.page, a.sort_key
  `)
  // LIKE 兜底（短查询走源表 quote_text/comment 子串匹配）
  const stmtSearchLikeAll = db.prepare(`
    SELECT id, paper_id, page, kind, color, quote_text, prefix_text, suffix_text,
           start_offset, end_offset, rects_json, sort_key, comment, created_at, updated_at
    FROM annotations
    WHERE quote_text LIKE ? ESCAPE '\\' OR comment LIKE ? ESCAPE '\\'
    ORDER BY page, sort_key
  `)
  const stmtSearchLikePaper = db.prepare(`
    SELECT id, paper_id, page, kind, color, quote_text, prefix_text, suffix_text,
           start_offset, end_offset, rects_json, sort_key, comment, created_at, updated_at
    FROM annotations
    WHERE (quote_text LIKE ? ESCAPE '\\' OR comment LIKE ? ESCAPE '\\') AND paper_id = ?
    ORDER BY page, sort_key
  `)

  return {
    insert(paperId, input) {
      const id = crypto.randomUUID()
      const now = new Date().toISOString()
      stmtInsert.run(
        id,
        paperId,
        input.page,
        input.kind,
        input.color,
        input.quoteText,
        input.prefixText,
        input.suffixText,
        input.startOffset,
        input.endOffset,
        JSON.stringify(input.rects),
        buildSortKey(input.page, input.startOffset),
        input.comment,
        now,
        now
      )
      return {
        id,
        paperId,
        page: input.page,
        kind: input.kind,
        color: input.color,
        quoteText: input.quoteText,
        prefixText: input.prefixText,
        suffixText: input.suffixText,
        startOffset: input.startOffset,
        endOffset: input.endOffset,
        rects: input.rects.map((r) => ({ ...r })),
        comment: input.comment,
        createdAt: now,
        updatedAt: now
      }
    },

    update(annotation) {
      const result = stmtUpdate.run(
        annotation.paperId,
        annotation.page,
        annotation.kind,
        annotation.color,
        annotation.quoteText,
        annotation.prefixText,
        annotation.suffixText,
        annotation.startOffset,
        annotation.endOffset,
        JSON.stringify(annotation.rects),
        buildSortKey(annotation.page, annotation.startOffset),
        annotation.comment,
        annotation.createdAt,
        annotation.updatedAt,
        annotation.id
      )
      if (result.changes === 0) return null
      const row = stmtGetById.get(annotation.id) as AnnotationRow | undefined
      return row === undefined ? null : toAnnotation(row)
    },

    delete(id) {
      return stmtDelete.run(id).changes > 0
    },

    listByPaper(paperId) {
      return (stmtListByPaper.all(paperId) as AnnotationRow[]).map(toAnnotation)
    },

    search(paperId, q) {
      const trimmed = q.trim()
      if (trimmed === '') return []
      if (trimmed.length >= 3) {
        const match = escapeFtsQuery(trimmed)
        const rows =
          paperId === null
            ? (stmtSearchFtsAll.all(match) as AnnotationRow[])
            : (stmtSearchFtsPaper.all(match, paperId) as AnnotationRow[])
        return rows.map(toAnnotation)
      }
      const pattern = `%${escapeLike(trimmed)}%`
      const rows =
        paperId === null
          ? (stmtSearchLikeAll.all(pattern, pattern) as AnnotationRow[])
          : (stmtSearchLikePaper.all(pattern, pattern, paperId) as AnnotationRow[])
      return rows.map(toAnnotation)
    },

    countByPaper(paperId) {
      const row = stmtCountByPaper.get(paperId) as { n: number }
      return row.n
    }
  }
}
