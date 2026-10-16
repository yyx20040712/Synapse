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
import { createSnapshotRepo, type SnapshotRepo } from './snapshot.repo'
import { createImportSnapshotRepo, type ImportSnapshotRepo } from './import-snapshot.repo'
import { createAiSessionsRepo, type AiSessionsRepo } from './ai-sessions.repo'
import { createAiMemoryRepo, type AiMemoryRepo } from './ai-memory.repo'
import { createAiTasksRepo, type AiTasksRepo } from './ai-tasks.repo'
import { createAiContextRepo, type AiContextRepo } from './ai-context.repo'
import { createAiSearchRepo, type AiSearchRepo } from './ai-search.repo'
import { createAiCascadeRepo, type AiCascadeRepo } from './ai-cascade.repo'
import { createFigureRepo, type FigureRepo } from './figure.repo'

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
  /** [F-DBCAMP-01 DB-2 U2b-1] AI 任务仓储（任务行 CRUD+守卫迁移+审计只
   *  INSERT+恢复扫描；消费=ai-tasks.service——本批零 IPC） */
  aiTasks: AiTasksRepo
  /** [F-DBCAMP-01 DB-2 U2b-2a] 上下文装配读面聚合（epoch 向量+L1/L2 源读；
   *  消费=ai-context.service——本批零 IPC） */
  aiContext: AiContextRepo
  /** [F-DBCAMP-01 DB-2 U2b-2b] 文献域检索读面（两腿合并 top-5+图内过滤；
   *  消费=ai-tail.service 文献展开腿——本批零 IPC） */
  aiSearch: AiSearchRepo
  /** [F-DBCAMP-01 DB-2 U2] 随锚级联预览计数（两次确认第一跳计数面——级联删除
   *  本体=020 触发器；消费=ai-cascade.service） */
  aiCascade: AiCascadeRepo
  /** [F-DBCAMP-01 DB-3 U2] envelope 面专用仓储（sync_key ensure/snapshot_seq 计数/
   *  对端密钥/九表导出读面——消费=export-snapshot.service；既有九 repo 零触碰） */
  snapshot: SnapshotRepo
  /** [F-DBCAMP-01 DB-3 U3] 导入合并写面仓储（九表 upsert/防复活/guard 两法/
   *  水位/导入日志/拒收统计/FTS 重建——消费=import-snapshot.service；
   *  列清单单源=snapshot.repo TABLE_SPECS 导出复用） */
  importSnapshot: ImportSnapshotRepo
  /** [F-VISFB-42] 派生图表资产仓储（figure_jobs+paper_figures——消费=
   *  figure-store.service+协议查表+import-snapshot 恢复重提挂点）。
   *  可选键=受锁测试面 Repos 字面量闭合（enrich/import 两测试逐键构造不涉
   *  派生面——生产 createRepos 恒供值，figure-store 工厂 fail-fast 守卫兜） */
  figures?: FigureRepo
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
    aiTasks: createAiTasksRepo(db),
    aiContext: createAiContextRepo(db),
    aiSearch: createAiSearchRepo(db),
    aiCascade: createAiCascadeRepo(db),
    snapshot: createSnapshotRepo(db),
    importSnapshot: createImportSnapshotRepo(db),
    figures: createFigureRepo(db),
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
  AiMemoryRepo,
  AiTasksRepo,
  AiContextRepo,
  AiSearchRepo,
  AiCascadeRepo,
  SnapshotRepo,
  ImportSnapshotRepo,
  FigureRepo
}
