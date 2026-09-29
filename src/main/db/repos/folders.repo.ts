/**
 * [F-FOLDER-01] folders.repo —— 文件夹域仓储（collections 表的文件夹语义面；
 * design-final §3.1：CRUD+paperCount 聚合+position 排序；不碰 lineage）。
 *
 * 与 collections.repo 的分置：本件=文件夹域 CRUD 编排面（folders.service 消费）；
 * collections.repo=导入面历史形状（upsertByName/list——import.service/library
 * collections 通道消费）。同表两件、方法零交叠（§3.1 职责分面字面）。
 *
 * 级联语义（DOMAIN_PINS，DDL 承担——012）：folder 删除=papers.folder_id
 * SET NULL+lineage_nodes CASCADE（边随节点二跳 CASCADE）——本层 delete 单语句，
 * 级联由引擎执行。
 * 测试：service 层承载（[回炉码 10] 本票无 repo 独立测试件）——
 * tests/unit/services/folders.service.test.ts（CRUD 编排/桩面）+
 * folders-move-paper.test.ts（真库矩阵：create/listWithCounts 归属计数/
 * remove 级联/存在性预检全覆盖）。
 */
import { randomUUID } from 'node:crypto'
import type { Folder } from '../../../shared/models/folder'
import type { SqliteDb } from '../connection'

export interface FoldersRepo {
  /** 新建（position=现行 max+1 尾插）；name UNIQUE 冲突=SqliteError UNIQUE
   *  上抛（service 预检+域错误收口在先例 tags） */
  create(name: string): Folder
  /** 改名（图名 1:1 跟随——单一真相源=本表 name 列）；未命中 0 changes */
  rename(id: string, name: string): number
  /** 删除（级联 DDL 承担）；未命中 0 changes */
  remove(id: string): number
  /** 列表+paperCount 聚合（LEFT JOIN papers.folder_id 计数——未归档文献不计入任何行） */
  listWithCounts(): Folder[]
  findByName(name: string): Folder | null
  findById(id: string): Folder | null
}

/** 聚合查询行形状（列名蛇形+聚合别名） */
interface FolderCountRow {
  id: string
  name: string
  position: number
  paper_count: number
}

export function createFoldersRepo(db: SqliteDb): FoldersRepo {
  const insertStmt = db.prepare(
    'INSERT INTO collections (id, name, position) VALUES (?, ?, ?)'
  )
  const nextPositionStmt = db.prepare(
    'SELECT COALESCE(MAX(position), -1) + 1 AS next FROM collections'
  )
  const renameStmt = db.prepare('UPDATE collections SET name = ? WHERE id = ?')
  const deleteStmt = db.prepare('DELETE FROM collections WHERE id = ?')
  const listWithCountsStmt = db.prepare<[], FolderCountRow>(
    `SELECT c.id, c.name, c.position, COUNT(p.id) AS paper_count
       FROM collections c
       LEFT JOIN papers p ON p.folder_id = c.id
      GROUP BY c.id
      ORDER BY c.position ASC, c.id ASC`
  )
  const selectByName = db.prepare<[string], FolderCountRow>(
    'SELECT id, name, position, 0 AS paper_count FROM collections WHERE name = ?'
  )
  const selectById = db.prepare<[string], FolderCountRow>(
    'SELECT id, name, position, 0 AS paper_count FROM collections WHERE id = ?'
  )

  const toFolder = (r: FolderCountRow): Folder => ({
    id: r.id,
    name: r.name,
    position: r.position,
    paperCount: r.paper_count
  })

  return {
    // position 尾插（迁移 (1) 主图插入同式——COALESCE(MAX)+1 稳定可复现）
    create(name) {
      const pos = nextPositionStmt.get() as { next: number }
      const id = randomUUID()
      insertStmt.run(id, name, pos.next)
      return { id, name, position: pos.next, paperCount: 0 }
    },
    rename(id, name) {
      return renameStmt.run(name, id).changes
    },
    remove(id) {
      return deleteStmt.run(id).changes
    },
    listWithCounts() {
      return listWithCountsStmt.all().map(toFolder)
    },
    findByName(name) {
      const r = selectByName.get(name)
      return r === undefined ? null : toFolder(r)
    },
    findById(id) {
      const r = selectById.get(id)
      return r === undefined ? null : toFolder(r)
    }
  }
}
