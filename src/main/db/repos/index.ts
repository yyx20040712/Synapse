/**
 * 仓储装配桶（infra，无工单）—— bootstrap 经此构造全部仓储。
 * 新增仓储：在此 import 工厂并加入 Repos 接口（接线处唯一）。
 */
import type { SqliteDb } from '../connection'
import { createPapersRepo, type PaperRow, type PapersRepo } from './papers.repo'
import { createAnnotationsRepo, type AnnotationsRepo } from './annotations.repo'
import { createNotesRepo, type NotesRepo } from './notes.repo'
import { createTagsRepo, type TagsRepo } from './tags.repo'
import { createCollectionsRepo, type CollectionsRepo } from './collections.repo'

export interface Repos {
  papers: PapersRepo
  annotations: AnnotationsRepo
  notes: NotesRepo
  tags: TagsRepo
  collections: CollectionsRepo
}

export function createRepos(db: SqliteDb): Repos {
  return {
    papers: createPapersRepo(db),
    annotations: createAnnotationsRepo(db),
    notes: createNotesRepo(db),
    tags: createTagsRepo(db),
    collections: createCollectionsRepo(db)
  }
}

export type { PaperRow, PapersRepo, AnnotationsRepo, NotesRepo, TagsRepo, CollectionsRepo }
