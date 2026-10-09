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
import { createFoldersRepo, type FoldersRepo } from './folders.repo'
import { createAppMetaRepo, type AppMetaRepo } from './app-meta.repo'
import { createAiSessionsRepo, type AiSessionsRepo } from './ai-sessions.repo'
import { createAiMemoryRepo, type AiMemoryRepo } from './ai-memory.repo'

export interface Repos {
  papers: PapersRepo
  annotations: AnnotationsRepo
  notes: NotesRepo
  aiNotes: AiNotesRepo
  lineage: LineageRepo
  tags: TagsRepo
  collections: CollectionsRepo
  /** [F-FOLDER-01] 文件夹域 CRUD（collections 表新面——与 collections.repo
   *  同表分置，方法零交叠） */
  folders: FoldersRepo
  /** [F-DBCAMP-01 DB-1 U3] app_meta 键值载体+身份确保（owner uuid+设备
   *  token 本地侧；消费=DB-3 envelope+DB-2 设置页——本批零 IPC） */
  appMeta: AppMetaRepo
  /** [F-DBCAMP-01 DB-2 U2a] AI 会话/消息仓储（50 上限写时淘汰+多态锚校验；
   *  消费=ai-sessions.service——本批零 IPC） */
  aiSessions: AiSessionsRepo
  /** [F-DBCAMP-01 DB-2 U2a] AI 记忆检索原语（LIKE/MATCH 两路+三档完全隔离
   *  谓词；消费=ai-memory-search.service——本批零 IPC） */
  aiMemory: AiMemoryRepo
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
    folders: createFoldersRepo(db),
    appMeta: createAppMetaRepo(db),
    aiSessions: createAiSessionsRepo(db),
    aiMemory: createAiMemoryRepo(db),
    withTransaction: <T>(fn: () => T): T => db.transaction(fn)()
  }
}

export type {
  PaperRow,
  PapersRepo,
  AnnotationsRepo,
  NotesRepo,
  AiNotesRepo,
  LineageRepo,
  TagsRepo,
  CollectionsRepo,
  FoldersRepo,
  AppMetaRepo,
  AiSessionsRepo,
  AiMemoryRepo
}
