/**
 * [SR-DB-05] collections.repo —— collections / paper_collections 仓储（工单：done / weak）
 *
 * ── 行为层 ──
 * - 按名 upsert（导入文件夹时子目录名→集合，幂等）
 * - 列表 / 挂接 / 按文献取名
 *
 * ── 接口层 ──
 * - export interface CollectionsRepo：
 *     upsertByName(name: string, position: number): Collection   // 同名幂等（position 不覆盖）
 *     list(): Collection[]                                        // position 升序
 *     attach(paperId: string, collectionId: string): void         // INSERT OR IGNORE
 *     namesByPaper(paperId: string): string[]
 *
 * ── 架构层 ──
 * - 依赖：db/connection、shared/models/collection
 * - 集合名与磁盘子目录名的对应关系由 import.service 维护，本层只存名字
 *
 * ── 生命周期层 ──
 * - 不做：嵌套集合/拖拽排序（负面清单）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/db/repos/collections.repo.test.ts（已锁定）
 */
import { randomUUID } from 'node:crypto'
import type { Collection } from '../../../shared/models/collection'
import type { SqliteDb } from '../connection'

export interface CollectionsRepo {
  upsertByName(name: string, position: number): Collection
  list(): Collection[]
  attach(paperId: string, collectionId: string): void
  namesByPaper(paperId: string): string[]
}

/** collections 表行形状（列名与 001_init.sql 一一对应，SELECT 用显式列名） */
interface CollectionRow {
  id: string
  name: string
  position: number
}

/** 表行 → 领域模型（列名同名直传；集中一处，002+ 迁移演进只动这里） */
function toCollection(row: CollectionRow): Collection {
  return { id: row.id, name: row.name, position: row.position }
}

export function createCollectionsRepo(db: SqliteDb): CollectionsRepo {
  // 全部语句在工厂内预编译；SQL 无字符串拼接，值一律参数绑定
  const insertOrIgnore = db.prepare(
    'INSERT OR IGNORE INTO collections (id, name, position) VALUES (?, ?, ?)'
  )
  const selectByName = db.prepare<[string], CollectionRow>(
    'SELECT id, name, position FROM collections WHERE name = ?'
  )
  const selectAllByPosition = db.prepare<[], CollectionRow>(
    'SELECT id, name, position FROM collections ORDER BY position ASC'
  )
  // 联表主键 (paper_id, collection_id)：OR IGNORE 让重复挂接幂等不抛
  const insertLink = db.prepare(
    'INSERT OR IGNORE INTO paper_collections (paper_id, collection_id) VALUES (?, ?)'
  )
  // JOIN 走 002 索引 idx_paper_collections_collection；名序与 list() 同为 position 升序
  const selectNamesByPaper = db.prepare<[string], { name: string }>(
    `SELECT c.name AS name
       FROM paper_collections AS pc
       JOIN collections AS c ON c.id = pc.collection_id
      WHERE pc.paper_id = ?
      ORDER BY c.position ASC`
  )

  return {
    // 幂等语义：同名时 OR IGNORE 丢弃新行，再按名读回既有行（position 不覆盖）。
    // 本方法只写单表，且 better-sqlite3 单连接同步执行——两条语句间无并发窗口，无需事务
    upsertByName(name, position) {
      insertOrIgnore.run(randomUUID(), name, position)
      const row = selectByName.get(name)
      if (row === undefined) {
        // 防御式兜底：INSERT 成功或被忽略后按名必有行，理论不可达
        throw new Error(`集合写入后无法按名读回：${name}`)
      }
      return toCollection(row)
    },
    list() {
      return selectAllByPosition.all().map(toCollection)
    },
    attach(paperId, collectionId) {
      insertLink.run(paperId, collectionId)
    },
    namesByPaper(paperId) {
      return selectNamesByPaper.all(paperId).map((row) => row.name)
    }
  }
}
