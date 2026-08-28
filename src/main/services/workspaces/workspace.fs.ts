/**
 * [R1-WS1] workspace.fs —— 课题目录约定的纯 fs 层（ADR-0018 库级分目录）。
 *
 * ── 行为层 ──
 * - 目录约定：`userData/workspaces/<id>/`（id=生成的短随机 [a-z0-9-]{1,64}，
 *   用户名永不直入路径——Win 路径字符雷）；`<id>/meta.json`={name,createdAt}；
 *   `<id>/synapse.db` + `<id>/files/`。指针=`userData/workspace.json` {currentId}。
 * - 指针三态：有效（id ∈ 目录集）/ 缺省 / 损坏——后两者一律降级「目录序第一」，
 *   不上抛不崩溃（INV-35）。
 * - 遗留迁移搬移序（崩溃断点续迁语义）：mkdir workspaces/default → 移 files/ →
 *   移 -wal → 移 -shm → 移 synapse.db（db 最后=提交点）→ meta.json+指针；
 *   断点后重启时「遗留 db 在且 default 库不在」条件仍真 → 续迁完成，不产生孤儿库。
 *
 * ── 接口层 ──
 * - 常量（WORKSPACES_DIR_NAME/POINTER_FILE_NAME/DEFAULT_WS_ID/DEFAULT_WS_NAME）
 *   只住本域文件——禁入 shared/constants.ts（renderer 不见路径，避免无谓受锁扩容）。
 *
 * ── 架构层 ──
 * - 只 import node:fs/node:path/node:crypto；不触 db、不触 electron（单测纯 fs 可测）。
 * - 协议文件一律 tmp+rename 原子写（settings ipc / INV-26 同型）。
 *
 * ── 生命周期层 ──
 * - 不做：workspace 目录手工编辑的 watch 兼容；meta 版本字段（v1 无 schema 演进面）。
 *
 * ── 文化层 ──
 * - 测试：tests/unit/services/workspace.test.ts（真临时目录+真库，always-active）。
 */
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { DB_FILE_NAME, MANAGED_FILES_DIR } from '../../../shared/constants'

/** 课题目录集根目录名（userData 下） */
export const WORKSPACES_DIR_NAME = 'workspaces'
/** 当前课题指针文件名（userData 下，库外——ADR-0018 字面） */
export const POINTER_FILE_NAME = 'workspace.json'
/** 迁移目标/全新安装的缺省课题 id */
export const DEFAULT_WS_ID = 'default'
/** 缺省课题显示名（meta.json 缺失/L0 合成时） */
export const DEFAULT_WS_NAME = '默认课题'

export interface WorkspaceMeta {
  name: string
  createdAt: string
}

/** 课题 id 合法字符集（与生成器同源；目录扫描时过滤异物目录） */
export function isWorkspaceId(id: string): boolean {
  return /^[A-Za-z0-9-]{1,64}$/.test(id)
}

/** 生成新课题 id（短随机，碰撞=存在即重掷；禁用户输入直入路径） */
export async function generateWorkspaceId(rootDir: string): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const id = `ws-${randomUUID().replaceAll('-', '').slice(0, 8)}`
    if (!existsSync(join(rootDir, id))) return id
  }
  throw new Error('课题 id 生成失败：随机碰撞超过重试上限')
}

/** 原子写（tmp+rename——半截文件永不入目） */
async function atomicWrite(path: string, content: string): Promise<void> {
  const tmp = `${path}.tmp`
  await writeFile(tmp, content, 'utf-8')
  await rename(tmp, path)
}

export function pointerPath(userDataDir: string): string {
  return join(userDataDir, POINTER_FILE_NAME)
}

export function workspacesRoot(userDataDir: string): string {
  return join(userDataDir, WORKSPACES_DIR_NAME)
}

/** 课题目录骨架（纯 fs：目录+meta；空库迁移归调用方注入的 initWorkspaceDb） */
export async function createWorkspaceSkeleton(
  rootDir: string,
  id: string,
  name: string
): Promise<void> {
  await mkdir(join(rootDir, id), { recursive: true })
  await writeMeta(rootDir, id, { name, createdAt: new Date().toISOString() })
}

/** 读指针 id；缺省/损坏一律 null（降级归调用方，INV-35——不上抛不崩溃） */
export async function readPointerId(userDataDir: string): Promise<string | null> {
  try {
    const raw = await readFile(pointerPath(userDataDir), 'utf-8')
    const parsed = JSON.parse(raw) as { currentId?: unknown }
    return typeof parsed.currentId === 'string' && isWorkspaceId(parsed.currentId)
      ? parsed.currentId
      : null
  } catch {
    return null
  }
}

export async function writePointer(userDataDir: string, id: string): Promise<void> {
  await atomicWrite(pointerPath(userDataDir), `${JSON.stringify({ currentId: id }, null, 2)}\n`)
}

/** 目录扫描：workspaces/ 下持 meta.json 的合法 id 目录，字典序（=「目录序」单源） */
export async function listWorkspaceIds(rootDir: string): Promise<string[]> {
  if (!existsSync(rootDir)) return []
  const entries = await readdir(rootDir, { withFileTypes: true })
  const ids: string[] = []
  for (const e of entries) {
    if (!e.isDirectory() || !isWorkspaceId(e.name)) continue
    if (!existsSync(join(rootDir, e.name, 'meta.json'))) continue
    ids.push(e.name)
  }
  return ids.sort()
}

/** meta.json 读取：损坏/缺省=降级（name=缺省名，createdAt=目录 mtime），不抛 */
export async function readMeta(rootDir: string, id: string): Promise<WorkspaceMeta> {
  try {
    const raw = await readFile(join(rootDir, id, 'meta.json'), 'utf-8')
    const parsed = JSON.parse(raw) as { name?: unknown; createdAt?: unknown }
    if (typeof parsed.name === 'string' && parsed.name.length > 0) {
      return {
        name: parsed.name,
        createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : ''
      }
    }
  } catch {
    // 缺省/损坏：降级
  }
  const mtime = (await stat(join(rootDir, id)).catch(() => null))?.mtime
  return { name: DEFAULT_WS_NAME, createdAt: mtime ? mtime.toISOString() : '' }
}

/** meta.json 写（create/rename 落点；createdAt 不变语义由调用方保持） */
export async function writeMeta(rootDir: string, id: string, meta: WorkspaceMeta): Promise<void> {
  await atomicWrite(join(rootDir, id, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`)
}

async function moveIfExists(src: string, dest: string): Promise<void> {
  if (!existsSync(src)) return
  await rename(src, dest)
}

/** 迁移条件（幂等+崩溃断点续迁）：遗留库在 && default 库不在（root 是否已建不参与判定） */
export function needsLegacyMigration(userDataDir: string): boolean {
  return (
    existsSync(join(userDataDir, DB_FILE_NAME)) &&
    !existsSync(join(workspacesRoot(userDataDir), DEFAULT_WS_ID, DB_FILE_NAME))
  )
}

/**
 * 遗留布局整体搬入 workspaces/default（调用前提：needsLegacyMigration 为真，
 * 且 userData/synapse.db 无打开句柄——启动最早段或 closeCurrent 之后）。
 */
export async function migrateLegacyIntoDefault(userDataDir: string): Promise<void> {
  const rootDir = workspacesRoot(userDataDir)
  const defDir = join(rootDir, DEFAULT_WS_ID)
  await mkdir(defDir, { recursive: true })
  // files/ → -wal → -shm → db（db 最后=提交点；半程崩溃由 needsLegacyMigration 续迁）
  await moveIfExists(join(userDataDir, MANAGED_FILES_DIR), join(defDir, MANAGED_FILES_DIR))
  await moveIfExists(
    join(userDataDir, `${DB_FILE_NAME}-wal`),
    join(defDir, `${DB_FILE_NAME}-wal`)
  )
  await moveIfExists(
    join(userDataDir, `${DB_FILE_NAME}-shm`),
    join(defDir, `${DB_FILE_NAME}-shm`)
  )
  await moveIfExists(join(userDataDir, DB_FILE_NAME), join(defDir, DB_FILE_NAME))
  // meta.json 落位（default 入目录集——无 meta 的目录不入 listWorkspaceIds）；
  // createdAt=迁移后库文件 mtime（遗留库的真实诞生时刻代理）
  const mtime = (await stat(join(defDir, DB_FILE_NAME)).catch(() => null))?.mtime
  await writeMeta(rootDir, DEFAULT_WS_ID, {
    name: DEFAULT_WS_NAME,
    createdAt: mtime ? mtime.toISOString() : new Date().toISOString()
  })
  await writePointer(userDataDir, DEFAULT_WS_ID)
}
