/**
 * [F-DBCAMP-01 DB-2 U2b-2b] ai-search.repo —— 文献域检索读面（§3.b P7-P9）。
 *
 * ── 行为层 ──
 * - 检索域三列=papers.title+papers.abstract+notes.content_md（notes.title 死置列
 *   INV-104——语句保留列位为 notes_fts 索引镜像，命中面恒空）。core_idea 已退役
 *   不检索；authors 在 papers_fts 但经 **papers 腿列过滤前缀**排除出检索域
 *   〔r1 R-B1——FTS5 裸 MATCH 为全列检索（authors-only 行会命中，探针实证）；
 *   papers 腿绑定值加静态前缀 `{title abstract}:` 强制列域——前缀进绑定参数值
 *   （禁 SQL 文本拼接，k1 建议的 SQL || 形不采）；notes 腿保持裸 MATCH
 *   （notes_fts title/content 两列均属检索域）〕。
 * - 两腿（P8）：
 *   papers 腿 match=papers_fts MATCH JOIN papers ON rowid+图内过滤+ORDER BY
 *   rank,p.rowid LIMIT 5；like=(title LIKE OR abstract LIKE)+同过滤+ORDER BY
 *   p.id ASC LIMIT 5（ESCAPE '\'）。
 *   notes 腿 match=notes_fts MATCH JOIN notes→papers+同过滤+ORDER BY rank,
 *   nt.rowid LIMIT 5；like=(nt.title LIKE OR nt.content_md LIKE)+ORDER BY
 *   p.id ASC, nt.rowid ASC LIMIT 5（第二决胜键——P13 单笔记不变量破时可重
 *   复；〔r1 R-N1〕）。
 *   图内过滤=p.id IN (SELECT paper_id FROM lineage_nodes WHERE folder_id=? AND
 *   paper_id IS NOT NULL)——文件夹内论文但非图节点→排除；paper_id NULL 纯主题
 *   节点不 whitelist 任何论文。
 * - 合并（P8）：papers 腿序在前+notes 腿 paperId 去重接续+取 top-5——合并落
 *   本 repo（自裁申报：service 零合并逻辑，读面单源）。noteContentMd=命中论文
 *   的笔记行 content_md（papers 腿 LEFT JOIN notes——P13 单笔记模型下无行扇出；
 *   无笔记=null；notes 腿=命中行本体）。
 * - 入参形态（P9）：q 为**服务层构造的绑定值**——like 路=%escapeLike(q)% 成品
 *   pattern；match 路=escapeFtsQuery(q) 成品短语（escapeLike/escapeFtsQuery 单源
 *   在服务层复用，本层禁重写）。route='empty' 由服务层不调本 repo 承载。
 * - LIMIT 5=LITERATURE_TOP_K 镜像（常量单源在 ai-tail.service 服务层——db 层
 *   禁反向 import 服务层，SQL 字面量与共 **5 处**：两腿 match LIMIT×2+两腿
 *   like LIMIT×2+合并循环 `if (out.length >= 5) break`——与常量互为指针镜像
 *   〔INV-116 同型声明性登记〕，变更须双侧同批〔r1 R-N5 补第 5 处〕）。
 *
 * ── 文化层 ──
 * - 全语句 db.prepare 预编译+参数绑定（禁拼接）；读面零写零事务。
 * - 测试：tests/unit/db/repos/ai-search.repo.test.ts（always-active 真库夹具）。
 */
import type { SqliteDb } from '../connection'

export interface LiteratureHit {
  paperId: string
  title: string
  year: number | null
  abstract: string
  noteContentMd: string | null
}

interface RawHitRow {
  paper_id: string
  title: string
  year: number | null
  abstract: string
  note_content_md: string | null
}

/** 图内过滤子句（两腿共用——常量内联进预编译文本） */
const IN_GRAPH = `p.id IN (SELECT paper_id FROM lineage_nodes WHERE folder_id = ? AND paper_id IS NOT NULL)`

/**
 * papers 腿列过滤前缀（r1 R-B1——FTS5 裸 MATCH=全列检索会把 authors-only 行
 * 拉进命中集；前缀把 MATCH 列域钉死在 title+abstract=检索域三列声明）。
 * 进绑定参数值（SQL 文本零拼接）；notes 腿不适用（notes_fts 两列均属检索域）。
 */
const PAPERS_COL_FILTER = '{title abstract}:'

export interface AiSearchRepo {
  /**
   * 文献域检索（两腿合并 top-5）。
   * q=服务层构造绑定值：like 路=pattern（%…% 成品）/match 路=ftsQuery（短语成品）。
   */
  searchLiterature(folderId: string, q: string, route: 'like' | 'match'): LiteratureHit[]
}

export function createAiSearchRepo(db: SqliteDb): AiSearchRepo {
  const papersMatchStmt = db.prepare(
    `SELECT p.id AS paper_id, p.title, p.year, p.abstract, nt.content_md AS note_content_md
       FROM papers_fts JOIN papers p ON p.rowid = papers_fts.rowid
       LEFT JOIN notes nt ON nt.paper_id = p.id
      WHERE ${IN_GRAPH} AND papers_fts MATCH ?
      ORDER BY papers_fts.rank, p.rowid LIMIT 5`
  )
  // [r1 R-N1 防御注] papers 两腿 LEFT JOIN notes：P13 单笔记模型（repo upsert
  // per paper 恒 1 行）下无行扇出；不变量破（手工多行/存量脏数据）→同论文多行
  // 挤占 LIMIT 5——已知防御面登记不修行为（消费面=ai-tail 单篇块，去重归并循环）
  const papersLikeStmt = db.prepare(
    `SELECT p.id AS paper_id, p.title, p.year, p.abstract, nt.content_md AS note_content_md
       FROM papers p LEFT JOIN notes nt ON nt.paper_id = p.id
      WHERE (p.title LIKE ? ESCAPE '\\' OR p.abstract LIKE ? ESCAPE '\\') AND ${IN_GRAPH}
      ORDER BY p.id ASC LIMIT 5`
  )
  const notesMatchStmt = db.prepare(
    `SELECT p.id AS paper_id, p.title, p.year, p.abstract, nt.content_md AS note_content_md
       FROM notes_fts JOIN notes nt ON nt.rowid = notes_fts.rowid
       JOIN papers p ON p.id = nt.paper_id
      WHERE ${IN_GRAPH} AND notes_fts MATCH ?
      ORDER BY notes_fts.rank, nt.rowid LIMIT 5`
  )
  const notesLikeStmt = db.prepare(
    `SELECT p.id AS paper_id, p.title, p.year, p.abstract, nt.content_md AS note_content_md
       FROM notes nt JOIN papers p ON p.id = nt.paper_id
      WHERE (nt.title LIKE ? ESCAPE '\\' OR nt.content_md LIKE ? ESCAPE '\\') AND ${IN_GRAPH}
      ORDER BY p.id ASC, nt.rowid ASC LIMIT 5`
  )

  function toHit(r: RawHitRow): LiteratureHit {
    return {
      paperId: r.paper_id,
      title: r.title,
      year: r.year,
      abstract: r.abstract,
      noteContentMd: r.note_content_md
    }
  }

  return {
    searchLiterature(folderId, q, route) {
      // papers 腿 match：绑定值带列过滤前缀（r1 R-B1——authors 列排除出检索域）
      const papersLeg = (
        route === 'match'
          ? papersMatchStmt.all(folderId, PAPERS_COL_FILTER + q)
          : papersLikeStmt.all(q, q, folderId)
      ) as RawHitRow[]
      const notesLeg = (
        route === 'match' ? notesMatchStmt.all(folderId, q) : notesLikeStmt.all(q, q, folderId)
      ) as RawHitRow[]
      // 合并：papers 腿序在前+notes 腿 paperId 去重接续+取 top-5
      const seen = new Set<string>()
      const out: LiteratureHit[] = []
      for (const raw of [...papersLeg, ...notesLeg]) {
        if (out.length >= 5) break
        if (seen.has(raw.paper_id)) continue
        seen.add(raw.paper_id)
        out.push(toHit(raw))
      }
      return out
    }
  }
}
