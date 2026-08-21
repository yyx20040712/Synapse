/**
 * [SR-DB-01] papers.repo —— papers 表仓储（工单：open / weak）
 *
 * ── 行为层 ──
 * - 单表 CRUD + FTS 联查的列表页查询（搜索/筛选/排序/分页/计数）
 * - 列表聚合（标签名/集合名/标注数/笔记数）由 JOIN 子查询完成，一次往返
 *
 * ── 接口层 ──
 * - export interface PaperRow：表行形状（authors_json 等原始列，见下）
 * - export interface PapersRepo：
 *     insert(row: PaperRow): void
 *     findById(id: string): PaperRow | null
 *     findBySha256(sha256: string): PaperRow | null
 *     fileRefById(id: string): string | null              // 协议层窄查询
 *     updateMeta(id: string, patch: PaperMetaPatch): PaperRow | null   // 同步 updated_at
 *     applyEnrichment(id: string, e: { source: PaperSource; enrichStatus: EnrichStatus;
 *         patch: PaperMetaPatch }): PaperRow | null
 *     updateReadPage(id: string, page: number): void
 *     searchSummaries(q: LibraryQuery): Paged<PaperSummary>
 *     listSummariesByIds(ids: string[]): PaperSummary[]    // 导出选择
 *     detailById(id: string): PaperDetail | null
 * - searchSummaries 搜索策略（FTS 为 trigram 分词器，支持中文子串但查询串须 ≥3 字符）：
 *     · q.trim().length >= 3 → papers_fts MATCH escapeFtsQuery(q)（db/fts.ts）
 *     · 更短（如 2 字中文"漏损"）→ LIKE '%...%' 兜底（对 title/abstract/authors_json，
 *       % 与 _ 用 ESCAPE '\' 转义，参数绑定）
 *   其余过滤：tagId/collectionId/year；sort 对应 added_at DESC / year DESC / title ASC；
 *   total 为过滤后总数（不含分页）
 *
 * ── 架构层 ──
 * - 依赖：db/connection 的 SqliteDb、db/fts 的转义函数、shared 模型
 * - 禁止：业务判断（重复检测是 import.service 的事，这里只报 findBySha256）
 * - SQL 一律 db.prepare 预编译 + 参数绑定；FTS 输入必须经 escapeFtsQuery
 *
 * ── 生命周期层 ──
 * - 预留：002 迁移加列后此处 SELECT 用显式列名（不用 SELECT *）
 * - 不做：跨表事务编排（services 负责）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/db/repos/papers.repo.test.ts（已锁定；先读测试再实现）
 * - UUID 用 crypto.randomUUID()；时间戳 new Date().toISOString()（UTC）
 * - 完成后：删除 NotImplementedError，翻 tickets/registry.ts 状态
 */
import { unimplementedObject } from '../../../shared/app-error'
import type { SqliteDb } from '../connection'
import type {
  EnrichStatus,
  LibraryQuery,
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
  detailById(id: string): PaperDetail | null
}

export function createPapersRepo(_db: SqliteDb): PapersRepo {
  return unimplementedObject<PapersRepo>('SR-DB-01', 'papers.repo')
}
