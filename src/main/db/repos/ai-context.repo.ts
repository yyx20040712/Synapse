/**
 * [F-DBCAMP-01 DB-2 U2b-2a] ai-context.repo —— 上下文装配读面聚合仓储
 * （§3.C L1/L2 前缀装配的一切 SQL 单源；service 零 SQL——分层纪律）。
 *
 * ── 行为层 ──
 * - getEpochVector：ctx_ver 单源——固定 10 表序（EPOCH_TABLES）拼接
 *   `t1=e1;t2=e2;...`（表名=物理名；epoch 缺行=0 兜底——UPSERT 自愈下结构性
 *   不触达的防御分支）。EPOCH_TABLES 常量定义在本件（db 层表名知识——
 *   服务层禁反向 import；ai-context.service re-export 供测试同源对账）。
 * - 排序键三型（INV-129——r1 d1-W2 勘误对账口径）：A 型 (updated_at DESC,
 *   id DESC)=片/索引实际消费 A 型序的源 annotations/ai_memory/notes（notes 片
 *   随 r1 d1-W1 补序；papers/collections=主键单行源无排序面）；B 型 (id ASC)=
 *   B 型 3 表 tags/collections/paper_tags；C 型=(updated_at DESC,key DESC)=
 *   lineage_graph_meta（结构性恒空——防御在档）。第四序（三型外特例）：笔记
 *   在档 presence 清单 notesTitlesByFolder=(title ASC,id ASC)——确定性全序。
 *   lineage 节点/边基础序=created_at,rowid（listGraph 口径——业务显示序归
 *   service）。
 * - annotationsForContext/tagNamesForContext 为新语句（与既有 listByPaper
 *   (page,sort_key)/namesByPaper(name ASC) 序不同——消费面零扰动，禁改既有语句）。
 * - lineageGraphByFolder：锚图过滤（folder_id=?）+边两端正交子查询（跨图边
 *   不入——from/to 任一端不在锚图即排除）。
 * - memory 聚合：单语句按 (updated_at DESC, id DESC) 取锚行全集，JS 聚合
 *   （memoryCategoryIndex：分类计数+置顶 top3+最近 3——置顶与最近可重叠，
 *   各自独立取；memoryTop1ByCategory：每类首见行=top-1。条目序=行扫序，
 *   分类定义序重排归 service）。
 * - 锚语义（T1）：paper→papers.id/lineage→collections.id/global=null（
 *   memory 锚谓词经 `? IS NULL OR anchor_id=?` 单语句承载三档）。
 *
 * ── 文化层 ──
 * - 全语句 db.prepare 预编译+参数绑定（禁拼接）；读面零写零事务。
 * - 测试：tests/unit/db/repos/ai-context.repo.test.ts（always-active 真库夹具）。
 */
import type { SqliteDb } from '../connection'
import type { AiScope } from './ai-sessions.repo'
import { toEdge, toNode, type LineageEdgeRow, type LineageNodeRow } from './lineage.repo.rows'
import type { LineageEdge, LineageNode } from '../../../shared/models/lineage'

/** epoch 集合=10 物理表固定序（020 头注 §3.F 实照；INV-J 对账面） */
export const EPOCH_TABLES: readonly string[] = [
  'papers',
  'collections',
  'tags',
  'paper_tags',
  'notes',
  'annotations',
  'lineage_graph_meta',
  'lineage_nodes',
  'lineage_edges',
  'ai_memory'
]

/** L1 paper 档锚摘要窄行（装配消费列——papers.repo PaperRow 的装配投影） */
export interface ContextPaperOverview {
  id: string
  title: string
  authorsJson: string
  year: number | null
  venue: string
  doi: string | null
  arxivId: string | null
  abstract: string
}

export interface ContextAnnotationRow {
  page: number
  kind: string
  quoteText: string
  comment: string
}

/** 记忆索引聚合条目（分类计数+置顶/最近标题——L1 骨架消费形状） */
export interface MemoryCategoryEntry {
  category: string
  count: number
  pinnedTop3: Array<{ id: number; title: string }>
  recent3: Array<{ id: number; title: string }>
}

/** global L2 记忆片源行（top-1：title+content——片公式消费） */
export interface MemoryTop1Entry {
  category: string
  title: string
  content: string
}

interface MemoryScanRow {
  id: number
  category: string
  title: string
  content: string
  pinned: 0 | 1
}

export interface AiContextRepo {
  getEpochVector(): string
  paperOverview(id: string): ContextPaperOverview | null
  folderNameOf(paperId: string): string | null
  collectionName(id: string): string | null
  notesOf(paperId: string): { contentMd: string } | null
  annotationsForContext(paperId: string, limit: number): ContextAnnotationRow[]
  tagNamesForContext(paperId: string, limit: number): string[]
  lineageGraphByFolder(folderId: string): { nodes: LineageNode[]; edges: LineageEdge[] }
  starredIdsInFolder(folderId: string): Set<string>
  tagNamesByFolder(folderId: string): string[]
  notesTitlesByFolder(folderId: string): string[]
  memoryCategoryIndex(scope: AiScope, anchorId: string | null): MemoryCategoryEntry[]
  memoryTop1ByCategory(scope: AiScope, anchorId: string | null): MemoryTop1Entry[]
}

export function createAiContextRepo(db: SqliteDb): AiContextRepo {
  const epochStmt = db.prepare(`SELECT table_name AS name, epoch FROM change_epochs`)
  const paperStmt = db.prepare(
    `SELECT id, title, authors_json, year, venue, doi, arxiv_id, abstract
       FROM papers WHERE id = ?`
  )
  const folderNameStmt = db.prepare(
    `SELECT c.name AS name FROM papers p JOIN collections c ON c.id = p.folder_id
      WHERE p.id = ?`
  )
  const collectionNameStmt = db.prepare(`SELECT name FROM collections WHERE id = ?`)
  // [r1 d1-W1] A 型序显式化：repo 语义=每 paper 恒 1 行（upsert 单笔记），但
  // 语句不依赖该前提——手工多行/存量脏数据下取 A 型首行（updated_at DESC,id DESC）
  const noteStmt = db.prepare(
    `SELECT content_md FROM notes WHERE paper_id = ? ORDER BY updated_at DESC, id DESC LIMIT 1`
  )
  const annotationsStmt = db.prepare(
    `SELECT page, kind, quote_text, comment FROM annotations
      WHERE paper_id = ? ORDER BY updated_at DESC, id DESC LIMIT ?`
  )
  const tagsOfPaperStmt = db.prepare(
    `SELECT t.name AS name FROM tags t JOIN paper_tags pt ON pt.tag_id = t.id
      WHERE pt.paper_id = ? ORDER BY t.id ASC LIMIT ?`
  )
  const nodesByFolderStmt = db.prepare(
    `SELECT * FROM lineage_nodes WHERE folder_id = ? ORDER BY created_at, rowid`
  )
  const edgesInFolderStmt = db.prepare(
    `SELECT * FROM lineage_edges
      WHERE from_node IN (SELECT id FROM lineage_nodes WHERE folder_id = ?)
        AND to_node IN (SELECT id FROM lineage_nodes WHERE folder_id = ?)
      ORDER BY created_at, rowid`
  )
  const starredStmt = db.prepare(
    `SELECT id FROM papers WHERE folder_id = ? AND is_starred = 1`
  )
  const folderTagsStmt = db.prepare(`SELECT name FROM tags WHERE folder_id = ? ORDER BY id ASC`)
  const folderNoteTitlesStmt = db.prepare(
    `SELECT p.title AS title FROM papers p JOIN notes n ON n.paper_id = p.id
      WHERE p.folder_id = ? ORDER BY p.title ASC, p.id ASC`
  )
  // 锚谓词单语句三档：global 传 null（? IS NULL 短路真）——与 ai-memory.repo
  // PREDICATE 常量先例同型，值全绑定
  const memoryScanStmt = db.prepare(
    `SELECT id, category, title, content, pinned FROM ai_memory
      WHERE scope = ? AND (? IS NULL OR anchor_id = ?)
      ORDER BY updated_at DESC, id DESC`
  )

  return {
    getEpochVector() {
      const rows = epochStmt.all() as Array<{ name: string; epoch: number }>
      const byName = new Map(rows.map((r) => [r.name, r.epoch]))
      return EPOCH_TABLES.map((t) => `${t}=${byName.get(t) ?? 0}`).join(';')
    },

    paperOverview(id) {
      const r = paperStmt.get(id) as
        | {
            id: string
            title: string
            authors_json: string
            year: number | null
            venue: string
            doi: string | null
            arxiv_id: string | null
            abstract: string
          }
        | undefined
      if (r === undefined) return null
      return {
        id: r.id,
        title: r.title,
        authorsJson: r.authors_json,
        year: r.year,
        venue: r.venue,
        doi: r.doi,
        arxivId: r.arxiv_id,
        abstract: r.abstract
      }
    },

    folderNameOf(paperId) {
      const r = folderNameStmt.get(paperId) as { name: string } | undefined
      return r === undefined ? null : r.name
    },

    collectionName(id) {
      const r = collectionNameStmt.get(id) as { name: string } | undefined
      return r === undefined ? null : r.name
    },

    notesOf(paperId) {
      const r = noteStmt.get(paperId) as { content_md: string } | undefined
      return r === undefined ? null : { contentMd: r.content_md }
    },

    annotationsForContext(paperId, limit) {
      return (
        annotationsStmt.all(paperId, limit) as Array<{
          page: number
          kind: string
          quote_text: string
          comment: string
        }>
      ).map((r) => ({
        page: r.page,
        kind: r.kind,
        quoteText: r.quote_text,
        comment: r.comment
      }))
    },

    tagNamesForContext(paperId, limit) {
      return (tagsOfPaperStmt.all(paperId, limit) as Array<{ name: string }>).map((r) => r.name)
    },

    lineageGraphByFolder(folderId) {
      const nodes = (nodesByFolderStmt.all(folderId) as LineageNodeRow[]).map(toNode)
      const edges = (edgesInFolderStmt.all(folderId, folderId) as LineageEdgeRow[]).map(toEdge)
      return { nodes, edges }
    },

    starredIdsInFolder(folderId) {
      return new Set((starredStmt.all(folderId) as Array<{ id: string }>).map((r) => r.id))
    },

    tagNamesByFolder(folderId) {
      return (folderTagsStmt.all(folderId) as Array<{ name: string }>).map((r) => r.name)
    },

    notesTitlesByFolder(folderId) {
      return (folderNoteTitlesStmt.all(folderId) as Array<{ title: string }>).map((r) => r.title)
    },

    memoryCategoryIndex(scope, anchorId) {
      const rows = memoryScanStmt.all(scope, anchorId, anchorId) as MemoryScanRow[]
      const byCat = new Map<string, MemoryCategoryEntry>()
      for (const row of rows) {
        let e = byCat.get(row.category)
        if (e === undefined) {
          e = { category: row.category, count: 0, pinnedTop3: [], recent3: [] }
          byCat.set(row.category, e)
        }
        e.count++
        if (e.recent3.length < 3) e.recent3.push({ id: row.id, title: row.title })
        if (row.pinned === 1 && e.pinnedTop3.length < 3) {
          e.pinnedTop3.push({ id: row.id, title: row.title })
        }
      }
      return [...byCat.values()]
    },

    memoryTop1ByCategory(scope, anchorId) {
      const rows = memoryScanStmt.all(scope, anchorId, anchorId) as MemoryScanRow[]
      const seen = new Set<string>()
      const out: MemoryTop1Entry[] = []
      for (const row of rows) {
        if (seen.has(row.category)) continue
        seen.add(row.category)
        out.push({ category: row.category, title: row.title, content: row.content })
      }
      return out
    }
  }
}
