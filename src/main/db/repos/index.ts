/**
 * 仓储装配桶（infra，无工单）—— bootstrap 经此构造全部仓储。
 * 新增仓储：在此 import 工厂并加入 Repos 接口（接线处唯一）。
 */
import type { SqliteDb } from '../connection'
import { createPapersRepo, type PaperRow, type PapersRepo } from './papers.repo'
import { createAnnotationsRepo, type AnnotationsRepo } from './annotations.repo'
import { createNotesRepo, type NotesRepo } from './notes.repo'
import { createAiNotesRepo, type AiNotesRepo } from './ai_notes.repo'
import { createLineageRepo, type LineageRepo } from './lineage.repo'
import { createTagsRepo, type TagsRepo } from './tags.repo'
import { createCollectionsRepo, type CollectionsRepo } from './collections.repo'

export interface Repos {
  papers: PapersRepo
  annotations: AnnotationsRepo
  notes: NotesRepo
  aiNotes: AiNotesRepo
  lineage: LineageRepo
  tags: TagsRepo
  collections: CollectionsRepo
  /** 跨仓储多表写入的原子边界：fn 内任一语句抛错整体回滚（better-sqlite3 同步
   *  事务）。service 层组合多表写入必须经此包裹，防"insert 成功但后续语句失败"
   *  的半写残留——并发无关，缺的是多语句原子性。 */
  withTransaction<T>(fn: () => T): T
}

export function createRepos(db: SqliteDb): Repos {
  return {
    papers: createPapersRepo(db),
    annotations: createAnnotationsRepo(db),
    notes: createNotesRepo(db),
    aiNotes: createAiNotesRepo(db),
    lineage: createLineageRepo(db),
    tags: createTagsRepo(db),
    collections: createCollectionsRepo(db),
    withTransaction: <T>(fn: () => T): T => db.transaction(fn)()
  }
}

export type { PaperRow, PapersRepo, AnnotationsRepo, NotesRepo, AiNotesRepo, LineageRepo, TagsRepo, CollectionsRepo }
