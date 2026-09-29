// b3: P7-E
/**
 * [SR-DB-04] tags.repo —— tags / paper_tags 仓储（工单：已实现）
 *
 * ── 行为层 ──
 * - 按名 upsert（同名直接返回既有行，幂等）
 * - 带计数列表 / 挂接 / 摘除
 * - 标签生命周期（P7E-01）：findByName（rename 冲突预检）/ renameTag /
 *   mergeTags（三步事务：迁挂接→清源挂接→删源标签行）/ deleteTag（两步事务）
 *
 * ── 接口层 ──
 * - export interface TagsRepo：
 *     upsertByName(name: string): Tag                       // 同名幂等
 *     listWithCounts(): Array<Tag & { paperCount: number }> // paperCount 降序，再按名字典序
 *     attach(paperId: string, tagId: string): void          // INSERT OR IGNORE
 *     detach(paperId: string, tagId: string): void
 *     namesByPaper(paperId: string): string[]               // 名字典序
 *     findByName(name: string): Tag | undefined             // P7E-01 rename 冲突预检
 *     renameTag(id: string, name: string): boolean          // P7E-01 UPDATE，changes>0
 *     mergeTags(sourceId: string, targetId: string): void   // P7E-01 三步事务
 *     deleteTag(id: string): void                           // P7E-01 两步事务
 *
 * ── 架构层 ──
 * - 依赖：db/connection、shared/models/tag
 * - 孤儿标签（无任何文献引用）由 listWithCounts 自然呈现 paperCount=0；
 *   物理清理由 deleteTag 承担（P7E-01 起可清）
 * - 全部语句在工厂内 db.prepare 预编译一次，参数一律绑定（禁止拼接）
 * - 单表方法保持免事务；merge/delete 跨表多写用 db.transaction 包裹
 *   （P7E-01）——同步事务内多语句原子生效，第二步失败则后续不落地；
 *   better-sqlite3 单连接同步执行，upsert 的"写入后回读"之间不可能被插入其它语句
 * - 挂接引用了不存在的 paper/tag 时由外键约束（foreign_keys=ON）自然抛错，仓储不拦截
 *
 * ── 生命周期层 ──
 * - 已实现：标签改名/合并/删除（P7E-01；预留注记「002 迁移 + updateName」
 *   作废——UPDATE 直接改名，name 唯一约束由 service 层 CONFLICT 预检守卫）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/db/repos/tags.repo.test.ts（已锁定）
 *   + tests/unit/db/repos/tags-lifecycle.repo.test.ts（P7E-01，always-active）
 * - UUID 用 crypto.randomUUID()；tags 表无时间戳列
 */
import type { Tag } from '../../../shared/models/tag'
import type { SqliteDb } from '../connection'

/** tags 表行形状（id + name + color——011 起含颜色身份列，可空） */
interface TagRow {
  id: string
  name: string
  color: string | null
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
  /** P7E-01：rename 冲突预检（按名查行；TagRow 与 Tag 同形） */
  findByName(name: string): Tag | undefined
  /** P7E-01：改名（UPDATE…WHERE id=?；返回 changes>0——同名幂等时可能为 0，非错） */
  renameTag(id: string, name: string): boolean
  /** [F-TAGS-01]：颜色身份（hex|null=恢复默认；返回 changes>0——存在性预检归 service） */
  setColor(id: string, color: string | null): boolean
  /** P7E-01：合并（三步事务：迁挂接→清源挂接→删源标签行；双挂由 OR IGNORE 吸收） */
  mergeTags(sourceId: string, targetId: string): void
  /** P7E-01：删除（两步事务：清挂接→删标签行） */
  deleteTag(id: string): void
}

export function createTagsRepo(db: SqliteDb): TagsRepo {
  const insertTag = db.prepare<[string, string]>(
    'INSERT INTO tags (id, name) VALUES (?, ?) ON CONFLICT (name) DO NOTHING'
  )
  const tagByName = db.prepare<[string], TagRow>(
    'SELECT id, name, color FROM tags WHERE name = ?'
  )
  const tagsWithCounts = db.prepare<[], TagCountRow>(
    `SELECT t.id, t.name, t.color, COUNT(pt.paper_id) AS paper_count
       FROM tags t
       LEFT JOIN paper_tags pt ON pt.tag_id = t.id
      GROUP BY t.id, t.name, t.color
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
  // ── P7E-01 生命周期语句 ──
  const renameTagStmt = db.prepare<[string, string]>('UPDATE tags SET name = ? WHERE id = ?')
  // [F-TAGS-01] 颜色身份（hex 小写正规化在 service；null=恢复默认）
  const setColorStmt = db.prepare<[string | null, string]>('UPDATE tags SET color = ? WHERE id = ?')
  // 迁移参数序=(target, source)：SELECT 列位在前（目标），WHERE 在后（源）
  const migrateAttachments = db.prepare<[string, string]>(
    `INSERT OR IGNORE INTO paper_tags (paper_id, tag_id)
     SELECT paper_id, ? FROM paper_tags WHERE tag_id = ?`
  )
  const deleteAttachmentsByTag = db.prepare<[string]>('DELETE FROM paper_tags WHERE tag_id = ?')
  const deleteTagRow = db.prepare<[string]>('DELETE FROM tags WHERE id = ?')
  // 跨表多写用 db.transaction（头注架构层条款）：第二步失败则后续不落地
  const mergeTagsTxn = db.transaction((sourceId: string, targetId: string): void => {
    migrateAttachments.run(targetId, sourceId)
    deleteAttachmentsByTag.run(sourceId)
    deleteTagRow.run(sourceId)
  })
  const deleteTagTxn = db.transaction((tagId: string): void => {
    deleteAttachmentsByTag.run(tagId)
    deleteTagRow.run(tagId)
  })

  return {
    upsertByName(name: string): Tag {
      // 冲突时忽略插入，随后按名回读：新插入行与既有行统一走同一条 SELECT
      insertTag.run(crypto.randomUUID(), name)
      const row = tagByName.get(name)
      if (row === undefined) {
        // 不可达分支：DO NOTHING 后 name 必有对应行（新插入或同名既有）
        throw new Error(`tags.repo.upsertByName：按名回读失败（name=${name}）`)
      }
      return { id: row.id, name: row.name, color: row.color }
    },

    listWithCounts(): Array<Tag & { paperCount: number }> {
      // LEFT JOIN 保证孤儿标签以 paperCount=0 出现
      return tagsWithCounts.all().map((row) => ({
        id: row.id,
        name: row.name,
        color: row.color,
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
    },

    findByName(name: string): Tag | undefined {
      return tagByName.get(name) ?? undefined
    },

    renameTag(id: string, name: string): boolean {
      return renameTagStmt.run(name, id).changes > 0
    },

    setColor(id: string, color: string | null): boolean {
      return setColorStmt.run(color, id).changes > 0
    },

    mergeTags(sourceId: string, targetId: string): void {
      mergeTagsTxn(sourceId, targetId)
    },

    deleteTag(id: string): void {
      deleteTagTxn(id)
    }
  }
}
