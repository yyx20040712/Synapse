/**
 * [SR-DB-05] collections.repo —— collections 表仓储（工单：done / weak；
 * [F-FOLDER-01] 改造：paper_collections M2M 退役，attach/namesByPaper 删除）。
 *
 * ── 行为层 ──
 * - 按名 upsert（导入文件夹时子目录名→文件夹，幂等）
 * - 列表（position 升序）
 *
 * ── 接口层 ──
 * - export interface CollectionsRepo：
 *     upsertByName(name: string, position: number): Collection   // 同名幂等（position 不覆盖）
 *     list(): Collection[]                                       // position 升序
 *
 * ── 架构层 ──
 * - 依赖：db/connection、shared/models/collection
 * - 文件夹名与磁盘子目录名的对应关系由 import.service 维护，本层只存名字；
 *   [F-FOLDER-01] 文件夹域 CRUD 编排面=folders.repo（同表分置、方法零交叠——
 *   findById 等存在性/计数面全在 folders.repo；本件收缩为导入/只读历史面
 *   [回炉码 9：原 findById 票内零消费已删——死代码即删]）
 *
 * ── 生命周期层 ──
 * - 不做：嵌套文件夹/拖拽排序（负面清单）；folder 删除（folders.repo 职责）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/db/repos/collections.repo.test.ts（[F-FOLDER-01] 随迁收缩）
 */
import { randomUUID } from 'node:crypto'
import type { Collection } from '../../../shared/models/collection'
import type { SqliteDb } from '../connection'

export interface CollectionsRepo {
  upsertByName(name: string, position: number): Collection
  list(): Collection[]
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
    }
  }
}
