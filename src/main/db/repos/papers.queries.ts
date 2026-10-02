/**
 * papers.queries —— papers 表列表/详情查询件。
 * 从 papers.repo 拆出的查询 SQL 常量+行形状+行映射（repo ≤300 行关卡配套，
 * 纯查询/映射无行为逻辑）；消费面=papers.repo 的 searchSummaries/
 * listSummariesByIds/detailById。ENR-01：DETAIL_SQL 三缓存列与
 * DetailRow 三字段在此维护。[F-TIME-02] reading_seconds 列已随 2026-09-19
 * 用户裁决移除（009 DROP COLUMN——008 加列沿革见迁移件头注）。
 *
 * [F-FOLDER-01] 结构改造（design-final §2.2/INV-92）：
 * - pubNo=库级全序派生（ROW_NUMBER OVER ORDER BY year/month/added_at）——
 *   窗口恒在库级结果集求值（B3 终裁：一切过滤在窗口之后仅过滤显示不改编号，
 *   「全部/未归档/某文件夹」三态下同一文献 pubNo 恒同）；不落库。排序键
 *   year/month 均 NULLS LAST（survey 项 5「无年份文献排尾部」）+added_at ASC
 *   +rowid ASC 决胜（确定性）。month 源=lineage 节点月框（papers 表无 month
 *   列——LEFT JOIN 单值安全：INV-89 部分唯一索引保证每文献至多一节点）。
 * - +folder_id/impact_factor 列（012）；coll_names 聚合随 paper_collections
 *   退役删除；lineage 关联行（节点 year/month）改由 LEFT JOIN 单源直选。
 */
import { escapeFtsQuery } from '../fts'
import type {
  EnrichStatus,
  LibraryQuery,
  LibrarySort,
  PaperMetaPatch,
  PaperSource,
  PaperSummary
} from '../../../shared/models/paper'

/** 排序键 → ORDER BY（附决胜键保证同键时分页稳定；决胜键=rowid 插入序
 *  ——id=随机 uuid 不作决胜键，DESC 序后插在前/ASC 序先插在前） */
export const ORDER_BY: Readonly<Record<LibrarySort, string>> = {
  added_desc: 'p.added_at DESC, p.rowid DESC',
  year_desc: 'p.year DESC, p.added_at DESC, p.rowid DESC',
  title_asc: 'p.title ASC, p.rowid ASC',
  // P7E-07：COALESCE 显式归零——未缓存（NULL）与被引 0 同级垫底，不依赖
  // SQLite NULL 排序默认（探针实录：DESC 下 NULL 虽默认垫底，但 0-vs-NULL
  // 相对序无 COALESCE 时由引擎决定；决胜键 rowid 同上）
  cited_desc: 'COALESCE(p.cited_by_count, 0) DESC, p.rowid DESC'
}

/** 聚合列：标签名用 char(31)（US 分隔符）串接，防名字本身含逗号。
 *  [F-FOLDER-01] coll_names 聚合已随 paper_collections 退役删除。 */
const AGG_COLS = `
  (SELECT GROUP_CONCAT(t.name, char(31)) FROM paper_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.paper_id = p.id) AS tag_names,
  (SELECT COUNT(*) FROM annotations a WHERE a.paper_id = p.id) AS annotation_count,
  (SELECT COUNT(*) FROM notes n WHERE n.paper_id = p.id) AS note_count`

/** [F-FOLDER-01] pubNo 库级全序键（INV-92 单源——LIST/DETAIL 窗口与
 *  pubNoByIds 批查共用，禁双写；别名约定 p0/ln）。[回炉 N7 注记] 窗口
 *  **结构**（p0/ln join 形）存在于两处=WINDOW_SUBQUERY 与 papers.repo
 *  pubNoByIds 内联子查询——改 join 面（如月框源调整）须两处同步，排序键
 *  本体恒经 PUBNO_ORDER 单源 */
export const PUBNO_ORDER = 'p0.year ASC NULLS LAST, ln.month ASC NULLS LAST, p0.added_at ASC, p0.rowid ASC'

/** [F-FOLDER-01] 库级窗口子查询（pubNo 派生+lineage 月框 join 单源）：
 *  内层 p0.* 只进窗口/join 不越外层边界（外层显式列名——repo 纪律「禁
 *  SELECT *」的漂移防护在外层形状仍成立）；rowid 显式透出（外层排序键/
 *  FTS 子查询消费）。lineage_node_id=节点在场判定标记（year/month 双 null
 *  的未定年月节点也挂 lineage 键）。 */
const WINDOW_SUBQUERY = `(
  SELECT p0.rowid, p0.*, ln.id AS lineage_node_id, ln.year AS lineage_year, ln.month AS lineage_month,
    ROW_NUMBER() OVER (ORDER BY ${PUBNO_ORDER}) AS pub_no
  FROM papers p0
  LEFT JOIN lineage_nodes ln ON ln.paper_id = p0.id
)`

/** 列表页 SELECT：一次往返带回全部聚合字段（[T3-P3] +cited_by_count——密度
 *  列表引用列，toSummary null→整键省略；[F-FOLDER-01] 窗口包覆+folder 双列） */
export const LIST_SQL = `SELECT p.id, p.title, p.authors_json, p.year, p.venue, p.doi, p.added_at, p.last_read_page, p.cited_by_count,
  p.folder_id, p.impact_factor, p.pub_no, p.lineage_node_id, p.lineage_year, p.lineage_month,
  ${AGG_COLS.trim()}
  FROM ${WINDOW_SUBQUERY} p`

export const DETAIL_SQL = `SELECT p.file_ref, p.abstract, p.arxiv_id, p.source, p.enrich_status, p.updated_at,
  p.id, p.title, p.authors_json, p.year, p.venue, p.doi, p.added_at, p.last_read_page,
  p.cited_by_count, p.cited_by_fetched_at, p.cited_by_count_source,
  p.folder_id, p.impact_factor, p.pub_no, p.lineage_node_id, p.lineage_year, p.lineage_month,
  ${AGG_COLS.trim()}
  FROM ${WINDOW_SUBQUERY} p WHERE p.id = ?`

/** 聚合查询内部行形状（蛇形列 + 聚合别名；[T3-P3] cited_by_count 可空缓存列；
 *  [F-FOLDER-01] folder 双列+pub_no 窗口列+lineage 三标记列，coll_names 退役） */
export interface SummaryRow {
  id: string; title: string; authors_json: string
  year: number | null; venue: string; doi: string | null
  added_at: string; last_read_page: number
  tag_names: string | null
  annotation_count: number; note_count: number
  cited_by_count: number | null
  folder_id: string | null
  impact_factor: number | null
  pub_no: number
  lineage_node_id: string | null
  lineage_year: number | null
  lineage_month: number | null
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

/** 聚合行 → 列表行（authors_json 解码、US 分隔串拆数组、驼峰化；
 * [T3-P3] cited_by_count null→citedByCount 整键省略——detailById 同语义；
 * [F-FOLDER-01] folderId/impactFactor 直传+pubNo 透出+lineage 关联行
 * （节点在场=year/month——catalogNo 已退役）。Omit 非 PaperSummary：
 * summary/detail 两 lineage 形状不同，宽标注会经 detailById 的 spread
 * 传染形状冲突 */
export function toSummary(r: SummaryRow): Omit<PaperSummary, 'lineage'> {
  return {
    id: r.id, title: r.title,
    authors: JSON.parse(r.authors_json) as string[],
    year: r.year, venue: r.venue, doi: r.doi,
    tagNames: r.tag_names === null ? [] : r.tag_names.split('\u001f'),
    annotationCount: r.annotation_count, noteCount: r.note_count,
    lastReadPage: r.last_read_page, addedAt: r.added_at,
    folderId: r.folder_id,
    impactFactor: r.impact_factor,
    pubNo: r.pub_no,
    ...(r.cited_by_count !== null ? { citedByCount: r.cited_by_count } : {}),
    ...(r.lineage_node_id !== null
      ? { lineage: { year: r.lineage_year, month: r.lineage_month } }
      : {})
  }
}

/** 组装搜索/过滤条件：片段固定、值参数绑定；cond 供拼 SQL 文本（进语句缓存）。
 *  [F-FOLDER-01] collectionId 过滤随 paper_collections 退役删除——接替=
 *  folderScope 判别联合（unfiled=folder_id IS NULL/folder=folder_id=?)；
 *  过滤在窗口之后（B3：不改 pubNo 编号）。 */
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
  // P7E-06 多选标签过滤：逐标签一条 EXISTS，where 数组 AND 拼接=交集语义
  // （任一标签缺失即出局；禁 IN+GROUP BY HAVING——与既有拼接结构不兼容）
  for (const t of q.tagIds ?? []) {
    where.push('EXISTS (SELECT 1 FROM paper_tags pt WHERE pt.paper_id = p.id AND pt.tag_id = ?)')
    params.push(t)
  }
  const scope = q.folderScope
  if (scope?.kind === 'unfiled') {
    where.push('p.folder_id IS NULL')
  } else if (scope?.kind === 'folder') {
    where.push('p.folder_id = ?')
    params.push(scope.folderId)
  }
  if (q.year !== undefined) {
    where.push('p.year = ?')
    params.push(q.year)
  }
  return { cond: where.length === 0 ? '' : ` WHERE ${where.join(' AND ')}`, params }
}

/** 预编译语句取用面（repo stmt 缓存的形态切片——queries 零 db 依赖；
 *  [F-FOLDER-01·回炉 R1 拆件] repo 300 行关卡配套，纯查询/映射随迁至此） */
export interface StmtGetter {
  (sql: string): { all(...args: unknown[]): unknown[]; get(...args: unknown[]): unknown }
}

/** detailById 标签面（paper_tags×tags JOIN——显式列按名序；[F-UIRES-01 批 B]
 *  SQL 原文自 repo 迁入=repo 300 行拆件面 §架构层，语义零变） */
export function tagsOfPaper(id: string, stmt: StmtGetter): Array<{ id: string; name: string }> {
  return stmt(
    'SELECT t.id AS id, t.name AS name FROM paper_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.paper_id = ? ORDER BY t.name'
  ).all(id) as Array<{ id: string; name: string }>
}

/** PaperMetaPatch→表列名（authors 序列化为 authors_json）。[F-FOLDER-01]
 *  +impact_factor；patch.month 不在此——papers 无此列（落位=service 写节点）。
 * [F-UIRES-01 批 B] 自 repo 迁入（repo 300 行拆件——映射子函数与
 * buildFilters 同族面），语义零变 */
const PATCH_COLS: Readonly<Partial<Record<keyof PaperMetaPatch, string>>> = {
  title: 'title',
  authors: 'authors_json',
  year: 'year',
  venue: 'venue',
  doi: 'doi',
  abstract: 'abstract',
  impactFactor: 'impact_factor'
}

/** meta 补丁→列名/绑定值（authors 在此序列化；未提供字段不进 SET） */
export function patchFragments(patch: PaperMetaPatch): { columns: string[]; values: unknown[] } {
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
/** [F-FOLDER-01] 归属纯读（INV-88 统一规则判别源——显式 folderId≠归属拒的
 *  前置读，无副作用）；未命中/未归档=null */
export function folderIdOfQuery(id: string, stmt: StmtGetter): string | null {
  const r = stmt('SELECT folder_id FROM papers WHERE id = ?').get(id) as
    | { folder_id: string | null }
    | undefined
  return r === undefined ? null : r.folder_id
}

/** [F-FOLDER-01] pubNo 批查（库级窗口外过滤 id——B3 不改编号）。[回炉 N7]
 *  p0/ln join 结构与 WINDOW_SUBQUERY 双写——改 join 面须两处同步（排序键
 *  单源=PUBNO_ORDER）；空 ids=空数组 */
export function pubNoByIdsQuery(
  ids: readonly string[],
  stmt: StmtGetter
): Array<{ paperId: string; pubNo: number }> {
  if (ids.length === 0) return []
  const marks = ids.map(() => '?').join(', ')
  return stmt(
    `SELECT id AS paperId, pub_no AS pubNo FROM (
       SELECT p0.id, ROW_NUMBER() OVER (ORDER BY ${PUBNO_ORDER}) AS pub_no
       FROM papers p0 LEFT JOIN lineage_nodes ln ON ln.paper_id = p0.id
     ) WHERE id IN (${marks})`
  ).all(...ids) as Array<{ paperId: string; pubNo: number }>
}
