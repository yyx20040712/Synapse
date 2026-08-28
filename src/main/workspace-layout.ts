/**
 * [R1-WS1] workspace-layout —— 启动期课题布局解析（main 根装配面，ADR-0018）。
 *
 * 为什么在 main 根而非 services/：本文件直接开库跑迁移（db 装配是 bootstrap
 * 同级的职责——ESLint 分层：services 禁直连 db/connection|migrate）；服务层的
 * 空库迁移经 initWorkspaceDb 回调注入（依赖倒置，单测注入同型真实现）。
 *
 * 行为（状态机详见 services/workspaces/workspace.service.ts 头注——本函数产出
 * 其初始态）：迁移检查（needsLegacyMigration）→ 指针解析（降级目录序第一）→
 * 返回本会话数据目录。全新安装返回 legacy-fresh（不建 workspaces/——受锁 e2e
 * 种子配方兼容）。
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { DB_FILE_NAME } from '../shared/constants'
import { openDatabase } from './db/connection'
import { migrate } from './db/migrate'
import {
  DEFAULT_WS_ID,
  DEFAULT_WS_NAME,
  createWorkspaceSkeleton,
  listWorkspaceIds,
  migrateLegacyIntoDefault,
  needsLegacyMigration,
  readPointerId,
  workspacesRoot,
  writePointer
} from './services/workspaces/workspace.fs'

export interface WorkspaceLayout {
  /** 本会话数据层根目录（legacy-fresh=userData；workspace=workspaces/<当前课题 id>） */
  dataDir: string
  mode: 'legacy-fresh' | 'workspace'
  currentId: string
  rootDir: string
}

/** 课题空库落位：开库→跑迁移→关（create 与 W-empty 建目录共用；幂等） */
export function initWorkspaceDb(wsDir: string): void {
  const db = openDatabase(join(wsDir, DB_FILE_NAME))
  try {
    migrate(db)
  } finally {
    db.close()
  }
}

/** 建课题目录+meta+空库（骨架纯 fs+库装配——本文件在 main 根故可直连 db） */
export async function createWorkspaceOnDisk(
  rootDir: string,
  id: string,
  name: string
): Promise<void> {
  await createWorkspaceSkeleton(rootDir, id, name)
  initWorkspaceDb(join(rootDir, id))
}

/** 启动最早段：迁移检查 → 指针解析 → 当前课题数据目录 */
export async function ensureWorkspaceLayout(userDataDir: string): Promise<WorkspaceLayout> {
  const rootDir = workspacesRoot(userDataDir)
  if (needsLegacyMigration(userDataDir)) {
    await migrateLegacyIntoDefault(userDataDir)
  }
  if (!existsSync(rootDir)) {
    return { dataDir: userDataDir, mode: 'legacy-fresh', currentId: DEFAULT_WS_ID, rootDir }
  }
  let ids = await listWorkspaceIds(rootDir)
  const pointerId = await readPointerId(userDataDir)
  let currentId = pointerId !== null && ids.includes(pointerId) ? pointerId : ids[0]
  if (currentId === undefined) {
    await createWorkspaceOnDisk(rootDir, DEFAULT_WS_ID, DEFAULT_WS_NAME)
    await writePointer(userDataDir, DEFAULT_WS_ID)
    currentId = DEFAULT_WS_ID
    ids = [DEFAULT_WS_ID]
  }
  return { dataDir: join(rootDir, currentId), mode: 'workspace', currentId, rootDir }
}
