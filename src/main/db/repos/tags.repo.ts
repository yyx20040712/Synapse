/**
 * [SR-DB-04] tags.repo —— tags / paper_tags 仓储（工单：已实现）
 *
 * ── 行为层 ──
 * - 按名 upsert（同名直接返回既有行，幂等）
 * - 带计数列表 / 挂接 / 摘除
 *
 * ── 接口层 ──
 * - export interface TagsRepo：
 *     upsertByName(name: string): Tag                       // 同名幂等
 *     listWithCounts(): Array<Tag & { paperCount: number }> // paperCount 降序，再按名字典序
 *     attach(paperId: string, tagId: string): void          // INSERT OR IGNORE
 *     detach(paperId: string, tagId: string): void
 *     namesByPaper(paperId: string): string[]               // 名字典序
 *
 * ── 架构层 ──
 * - 依赖：db/connection、shared/models/tag
 * - 孤儿标签（无任何文献引用）由 listWithCounts 自然呈现 paperCount=0，不物理删除
 * - 全部语句在工厂内 db.prepare 预编译一次，参数一律绑定（禁止拼接）
 * - 每个方法只写一张表（tags 或 paper_tags），无跨表多写 → 不需要 db.transaction；
 *   better-sqlite3 单连接同步执行，upsert 的"写入后回读"之间不可能被插入其它语句
 * - 挂接引用了不存在的 paper/tag 时由外键约束（foreign_keys=ON）自然抛错，仓储不拦截
 *
 * ── 生命周期层 ──
 * - 不做：标签改名/合并（预留：002 迁移 + updateName 方法）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/db/repos/tags.repo.test.ts（已锁定）
 * - UUID 用 crypto.randomUUID()；tags 表无时间戳列
 */
import type { Tag } from '../../../shared/models/tag'
import type { SqliteDb } from '../connection'

/** tags 表行形状（仅 id + name，见 001_init.sql） */
interface TagRow {
  id: string
  name: string
}

/** listWithCounts 的聚合行：COUNT 输出列以别名 paper_count 返回 */
interface TagCountRow extends TagRow {
  paper_count: number
}

/** namesByPaper 的窄查询行 */
interface TagNameRow {
  name: string
}

export interface TagsRepo {
  upsertByName(name: string): Tag
  listWithCounts(): Array<Tag & { paperCount: number }>
  attach(paperId: string, tagId: string): void
  detach(paperId: string, tagId: string): void
  namesByPaper(paperId: string): string[]
}

export function createTagsRepo(db: SqliteDb): TagsRepo {
  const insertTag = db.prepare<[string, string]>(
    'INSERT INTO tags (id, name) VALUES (?, ?) ON CONFLICT (name) DO NOTHING'
  )
  const tagByName = db.prepare<[string], TagRow>(
    'SELECT id, name FROM tags WHERE name = ?'
  )
  const tagsWithCounts = db.prepare<[], TagCountRow>(
    `SELECT t.id, t.name, COUNT(pt.paper_id) AS paper_count
       FROM tags t
       LEFT JOIN paper_tags pt ON pt.tag_id = t.id
      GROUP BY t.id, t.name
      ORDER BY paper_count DESC, t.name ASC`
  )
  const attachTag = db.prepare<[string, string]>(
    'INSERT OR IGNORE INTO paper_tags (paper_id, tag_id) VALUES (?, ?)'
  )
  const detachTag = db.prepare<[string, string]>(
    'DELETE FROM paper_tags WHERE paper_id = ? AND tag_id = ?'
  )
  const tagNamesByPaper = db.prepare<[string], TagNameRow>(
    `SELECT t.name
       FROM tags t
       JOIN paper_tags pt ON pt.tag_id = t.id
      WHERE pt.paper_id = ?
      ORDER BY t.name ASC`
  )

  return {
    upsertByName(name: string): Tag {
      // 冲突时忽略插入，随后按名回读：新插入行与既有行统一走同一条 SELECT
      insertTag.run(crypto.randomUUID(), name)
      const row = tagByName.get(name)
      if (row === undefined) {
        // 不可达分支：DO NOTHING 后 name 必有对应行（新插入或同名既有）
        throw new Error(`tags.repo.upsertByName：按名回读失败（name=${name}）`)
      }
      return { id: row.id, name: row.name }
    },

    listWithCounts(): Array<Tag & { paperCount: number }> {
      // LEFT JOIN 保证孤儿标签以 paperCount=0 出现
      return tagsWithCounts.all().map((row) => ({
        id: row.id,
        name: row.name,
        paperCount: row.paper_count
      }))
    },

    attach(paperId: string, tagId: string): void {
      // OR IGNORE：重复挂接幂等（复合主键 paper_id+tag_id 冲突被吞掉）
      attachTag.run(paperId, tagId)
    },

    detach(paperId: string, tagId: string): void {
      detachTag.run(paperId, tagId)
    },

    namesByPaper(paperId: string): string[] {
      return tagNamesByPaper.all(paperId).map((row) => row.name)
    }
  }
}
