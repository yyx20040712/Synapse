/**
 * [SR-DB-04] tags.repo —— tags / paper_tags 仓储（工单：open / weak）
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
 *
 * ── 生命周期层 ──
 * - 不做：标签改名/合并（预留：002 迁移 + updateName 方法）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/db/repos/tags.repo.test.ts（已锁定）
 */
import { unimplementedObject } from '../../../shared/app-error'
import type { Tag } from '../../../shared/models/tag'
import type { SqliteDb } from '../connection'

export interface TagsRepo {
  upsertByName(name: string): Tag
  listWithCounts(): Array<Tag & { paperCount: number }>
  attach(paperId: string, tagId: string): void
  detach(paperId: string, tagId: string): void
  namesByPaper(paperId: string): string[]
}

export function createTagsRepo(_db: SqliteDb): TagsRepo {
  return unimplementedObject<TagsRepo>('SR-DB-04', 'tags.repo')
}
