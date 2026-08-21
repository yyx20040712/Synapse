/**
 * [SR-DB-05] collections.repo —— collections / paper_collections 仓储（工单：open / weak）
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
import { unimplementedObject } from '../../../shared/app-error'
import type { Collection } from '../../../shared/models/collection'
import type { SqliteDb } from '../connection'

export interface CollectionsRepo {
  upsertByName(name: string, position: number): Collection
  list(): Collection[]
  attach(paperId: string, collectionId: string): void
  namesByPaper(paperId: string): string[]
}

export function createCollectionsRepo(_db: SqliteDb): CollectionsRepo {
  return unimplementedObject<CollectionsRepo>('SR-DB-05', 'collections.repo')
}
