// b3: P7-E
/**
 * [SR-DB-04] tags.repo —— tags / paper_tags 仓储（工单：已实现）
 *
 * ── 行为层 ──
 * - 按名 upsert（域内同名直接返回既有行，幂等——[F-TAGS-02/DB-1 U4] 域化：
 *   冲突键=(folder_id, name)，UNIQUE(folder_id,name)〔019〕）
 * - 带计数列表（域内）/ 挂接 / 摘除
 * - 标签生命周期（P7E-01）：findByName（域内 rename 冲突预检）/ renameTag /
 *   mergeTags（三步事务：迁挂接→清源挂接→删源标签行）/ deleteTag（两步事务）
 * - [F-TAGS-02/DB-1 U4] findById（id→行+域读取单源——service 对 id 类操作的
 *   存在性与域来源；域化后无全量面，原「存在性预检经 listWithCounts 全量 id」
 *   注记作废）/ detachAllByPaper（moveFolder 摘挂接专用——INV-126 机制面②）
 *
 * ── 接口层 ──
 * - export interface TagsRepo：
 *     upsertByName(folderId: string, name: string): Tag      // 域内同名幂等
 *     listWithCounts(folderId: string): Array<Tag & { paperCount: number }>
 *                                                            // paperCount 降序，再按名字典序（域内）
 *     attach(paperId: string, tagId: string): void          // INSERT OR IGNORE（域不一致由 019 触发器 ABORT）
 *     detach(paperId: string, tagId: string): void
 *     namesByPaper(paperId: string): string[]               // 名字典序（表级域一致=免域过滤）
 *     findByName(folderId: string, name: string): Tag | undefined  // 域内按名查
 *     findById(tagId: string): (Tag & { folderId: string }) | undefined // id+域读取单源
 *     detachAllByPaper(paperId: string): void               // moveFolder 摘挂接
 *     renameTag(id: string, name: string): boolean          // P7E-01 UPDATE，changes>0
 *     mergeTags(sourceId: string, targetId: string): void   // P7E-01 三步事务
 *     deleteTag(id: string): void                           // P7E-01 两步事务
 *
 * ── 架构层 ──
 * - 依赖：db/connection、shared/models/tag
 * - [F-TAGS-02/DB-1 U4] 表级不变量承载域语义（INV-126：∀paper_tags 行
 *   tags.folder_id=papers.folder_id——019 触发器+moveFolder 摘挂接步守卫）：
 *   id/挂接键类操作（namesByPaper/tagNamesByIds/attach/detach/renameTag/
 *   setColor/mergeTags/deleteTag）不加域参——挂接恒同域=读面免域过滤、写面
 *   由触发器/服务域同检守卫，多余域参=可与行真值冲突的冗余失败面
 * - 孤儿标签（无任何文献引用）由 listWithCounts 自然呈现 paperCount=0；
 *   物理清理由 deleteTag 承担（P7E-01 起可清）
 * - 全部语句在工厂内 db.prepare 预编译一次，参数一律绑定（禁止拼接）；
 *   [A1a] 例外面=动态 IN 批查 tagNamesByIds——占位符个数为唯一动态面
 *   （papers.repo 语句缓存同型：按个数缓存预编译，值一律绑定）
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
 *   + tests/unit/services/tags-domain-limits.service.test.ts（U4 触发器透传）
 * - UUID 用 crypto.randomUUID()；tags 表无时间戳列
 */
import type Database from 'better-sqlite3'
import type { Tag } from '../../../shared/models/tag'
import type { SqliteDb } from '../connection'

/** tags 表行形状（id + name + color——011 起含颜色身份列，可空） */
interface TagRow {
  id: string
  name: string
  color: string | null
}

/** [F-TAGS-02/DB-1 U4] findById 行形状（+folder_id 域列——019 起；repo 层
 * 类型不入 IPC wire：Tag wire 形状 {id,name,color} 零变，folderId 不入 wire） */
interface TagDomainRow extends TagRow {
  folder_id: string
}

/** listWithCounts 的聚合行：COUNT 输出列以别名 paper_count 返回 */
interface TagCountRow extends TagRow {
  paper_count: number
}

/** namesByPaper 的窄查询行 */
interface TagNameRow {
  name: string
}

/** [A1a] tagNamesByIds 的窄查询行（别名列直出——零映射） */
interface TagNameByIdsRow {
  paperId: string
  name: string
}

export interface TagsRepo {
  upsertByName(folderId: string, name: string): Tag
  listWithCounts(folderId: string): Array<Tag & { paperCount: number }>
  attach(paperId: string, tagId: string): void
  detach(paperId: string, tagId: string): void
  namesByPaper(paperId: string): string[]
  /** [A1a] 批量名查（graph 通道 tagNames 伴生 map 装配源——动态 IN 一次查询
   *  禁逐 id 循环 N+1；序=ORDER BY paper_id, t.name ASC——namesByPaper 名序
   *  同源口径；空 ids=空数组） */
  tagNamesByIds(paperIds: readonly string[]): Array<{ paperId: string; name: string }>
  /** P7E-01：rename 冲突预检（域内按名查行；TagRow 与 Tag 同形） */
  findByName(folderId: string, name: string): Tag | undefined
  /** [F-TAGS-02/DB-1 U4]：id→行+域读取单源（service 对 id 类操作的存在性
   *  与域来源；Tag & { folderId } 不入 IPC wire） */
  findById(tagId: string): (Tag & { folderId: string }) | undefined
  /** [F-TAGS-02/DB-1 U4·回炉轮1 R1]：挂接在场判定（(paperId, tagId) id 键
   *  ——attach 幂等早退判据；名键在跨域同名 tagId 下误判已挂=伪成功逃逸
   *  触发器错误面，双席同中 W1 处置） */
  isAttached(paperId: string, tagId: string): boolean
  /** [F-TAGS-02 乙/DB-1 U4]：摘除该文献全部挂接（moveFolder 专用——INV-126
   *  机制面②：papers.folder_id 变更后其挂接全为原域，摘除保表级域一致） */
  detachAllByPaper(paperId: string): void
  /** P7E-01：改名（UPDATE…WHERE id=?；返回 changes>0——同名幂等时可能为 0，非错） */
  renameTag(id: string, name: string): boolean
  /** [F-TAGS-01]：颜色身份（hex|null=恢复默认；返回 changes>0——存在性预检归 service） */
  setColor(id: string, color: string | null): boolean
  /** P7E-01：合并（三步事务：迁挂接→清源挂接→删源标签行；双挂由 OR IGNORE 吸收；
   *  跨域由 service 域同检先行拒——019 触发器兜底 ABORT） */
  mergeTags(sourceId: string, targetId: string): void
  /** P7E-01：删除（两步事务：清挂接→删标签行） */
  deleteTag(id: string): void
}

export function createTagsRepo(db: SqliteDb): TagsRepo {
  const insertTag = db.prepare<[string, string, string]>(
    'INSERT INTO tags (id, name, folder_id) VALUES (?, ?, ?) ON CONFLICT (folder_id, name) DO NOTHING'
  )
  const tagByName = db.prepare<[string, string], TagRow>(
    'SELECT id, name, color FROM tags WHERE folder_id = ? AND name = ?'
  )
  const tagById = db.prepare<[string], TagDomainRow>(
    'SELECT id, name, color, folder_id FROM tags WHERE id = ?'
  )
  const tagsWithCounts = db.prepare<[string], TagCountRow>(
    `SELECT t.id, t.name, t.color, COUNT(pt.paper_id) AS paper_count
       FROM tags t
       LEFT JOIN paper_tags pt ON pt.tag_id = t.id
      WHERE t.folder_id = ?
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
  // [A1a] 批量名查语句缓存（占位符个数=唯一动态面——papers.repo 缓存同型）。
  // 缓存上界假设：键=占位符个数，条目数上界=图文献节点数级的不同长度组合
  // （有限小集，无逐调用增长面——papers.repo 同型假设）
  const tagNamesByIdsStmts = new Map<number, Database.Statement<unknown[], TagNameByIdsRow>>()
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
  // [F-TAGS-02 乙/DB-1 U4] moveFolder 摘挂接（INV-126 机制面②——单语句纯 DELETE）
  const detachAllByPaperStmt = db.prepare<[string]>('DELETE FROM paper_tags WHERE paper_id = ?')
  // [R1/回炉轮1] 挂接在场判定（id 键——LIMIT 1 存在性快查）
  const attachedExists = db.prepare<[string, string], { one: number }>(
    'SELECT 1 AS one FROM paper_tags WHERE paper_id = ? AND tag_id = ? LIMIT 1'
  )
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
    upsertByName(folderId: string, name: string): Tag {
      // 冲突时忽略插入，随后按 (folder_id, name) 回读：新插入行与既有行统一走同一条 SELECT
      insertTag.run(crypto.randomUUID(), name, folderId)
      const row = tagByName.get(folderId, name)
      if (row === undefined) {
        // 不可达分支：DO NOTHING 后 (folder_id, name) 必有对应行（新插入或域内同名既有）
        throw new Error(`tags.repo.upsertByName：按名回读失败（folderId=${folderId}, name=${name}）`)
      }
      return { id: row.id, name: row.name, color: row.color }
    },

    listWithCounts(folderId: string): Array<Tag & { paperCount: number }> {
      // LEFT JOIN 保证孤儿标签以 paperCount=0 出现（计数=域内挂接数——表级
      // 域一致不变量下自然正确，挂接恒同域免域过滤）
      return tagsWithCounts.all(folderId).map((row) => ({
        id: row.id,
        name: row.name,
        color: row.color,
        paperCount: row.paper_count
      }))
    },

    attach(paperId: string, tagId: string): void {
      // OR IGNORE：重复挂接幂等（复合主键 paper_id+tag_id 冲突被吞掉）；
      // 域不一致由 019 触发器 RAISE(ABORT) 拒——非约束冲突，OR IGNORE 不吞
      attachTag.run(paperId, tagId)
    },

    detach(paperId: string, tagId: string): void {
      detachTag.run(paperId, tagId)
    },

    namesByPaper(paperId: string): string[] {
      return tagNamesByPaper.all(paperId).map((row) => row.name)
    },

    tagNamesByIds(paperIds: readonly string[]): Array<{ paperId: string; name: string }> {
      if (paperIds.length === 0) return []
      // 按占位符个数缓存预编译语句（同长度复用——单次查询禁逐 id N+1）
      let q = tagNamesByIdsStmts.get(paperIds.length)
      if (q === undefined) {
        q = db.prepare<unknown[], TagNameByIdsRow>(
          `SELECT pt.paper_id AS paperId, t.name
             FROM tags t
             JOIN paper_tags pt ON pt.tag_id = t.id
            WHERE pt.paper_id IN (${paperIds.map(() => '?').join(', ')})
            ORDER BY pt.paper_id ASC, t.name ASC`
        )
        tagNamesByIdsStmts.set(paperIds.length, q)
      }
      return q.all(...paperIds)
    },

    findByName(folderId: string, name: string): Tag | undefined {
      return tagByName.get(folderId, name) ?? undefined
    },

    findById(tagId: string): (Tag & { folderId: string }) | undefined {
      const row = tagById.get(tagId)
      return row === undefined ? undefined : { id: row.id, name: row.name, color: row.color, folderId: row.folder_id }
    },

    detachAllByPaper(paperId: string): void {
      detachAllByPaperStmt.run(paperId)
    },

    isAttached(paperId: string, tagId: string): boolean {
      return attachedExists.get(paperId, tagId) !== undefined
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
