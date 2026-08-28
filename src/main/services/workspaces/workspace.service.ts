/**
 * [R1-WS1] workspace.service —— 课题域服务（ADR-0018 库级分目录：一课题一目录
 * 一库一文件仓；切课题=切库）。
 *
 * ── 行为层（状态机前置——态空间+跨格序列，U2 教训单格枚举盖不住跨格）──
 * 会话态（fs 事实推导；初始态由 main 根 workspace-layout.ensureWorkspaceLayout
 * 产出）：
 *
 * | 态 | fs 事实 | 事件 → 迁移 |
 * | --- | --- | --- |
 * | L0 legacy-fresh | workspaces/ 无（本会话库=userData 根 synapse.db+files/，与旧版布局同位） | list=零副作用合成 default；create/rename/switch → 物化（closeCurrent→迁移→重建 default）→ W |
 * | M 迁移进行 | mkdir default → files/ → -wal → -shm → db（提交点）→ meta+指针 | 完成 → W-pvalid(default)；半程崩溃 → 重启 ensure 条件（遗留 db 在 && default 库不在）仍真 → 续迁，无孤儿库 |
 * | W-pvalid | workspaces/ 在 + 指针 id ∈ 目录集 | switch(X)：busy → 关旧库 → 指针=X → 装配 X → W-pvalid(X) |
 * | W-pbad | 指针缺省/损坏/失指 | ensure/list 降级「目录序第一」（不崩——INV-35）；下次写指针自愈 |
 * | W-empty | workspaces/ 在 + 零有效目录 | ensure 建 default 空课题+指针 → W-pvalid |
 * | busy（变更互斥单飞） | service 实例内标志 | 并发 create/rename/switch → CONFLICT 中文；finally 释放 |
 *
 * 跨格序列（审计面）：
 * ① 全新安装：L0(会话1) → 退出 → M(会话2 启动) → W-pvalid(default)
 * ② e2e 种子配方（受锁兼容）：L0(首跳建库于根) → 种子 INSERT/PDF 落旧路径 →
 *    M(二跳启动) → W(default 含种子)——**L0 不建 workspaces/ 是受锁 e2e helper
 *    零改动的硬前提**（种子直写 userData/synapse.db，库无表即崩）
 * ③ L0 内 create：物化(M) → W(default) → 建新课题目录（指针不动仍=default）
 * ④ W 内 switch(X)：busy → 关旧 → 指针 X → 装配 X；并发第二 switch → CONFLICT；
 *    装配失败=当前层已关（后续库调用报错，busy 已释——switch 后 reload 前的
 *    竞窗由 R1-WS2 确认 dirty 流程收口，本单不补）
 * ⑤ M 断点：db 未移即崩 → 重启 ensure 续迁 → W（测试「崩溃断点续迁」锚定）
 *
 * ── 接口层 ──
 * - list/create/rename/switch/currentName——IPC 面形状由 ApiHandlers['workspaces']
 *   接线表推导（bootstrap 组合注入，R1-WS1）；name 长度 1-40 由 schema 锁定
 *
 * ── 架构层 ──
 * - 分层：ipc → services → fs（本文件只编排 workspace.fs 纯 fs 层；空库迁移经
 *   initWorkspaceDb 回调注入——db 直连归 main 根，ESLint 分层禁 services 触
 *   db/connection|migrate）；重建回调（closeCurrent/assembleInto）由 bootstrap
 *   注入=data-layer.container，本文件不 import 容器（可测性：单测注入真库回调）
 * - INV 登记：INV-35（同一时刻至多一课题库+switch 串行+指针降级不崩）
 *
 * ── 生命周期层 ──
 * - 不做：课题删除（破坏性，遗留池）；跨课题检索；切换通知 renderer（WS2 reload）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/services/workspace.test.ts（真临时目录+真 SQLite，always-active）
 */
import { existsSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import { join } from 'node:path'
import { DB_FILE_NAME } from '../../../shared/constants'
import type { AppErrorCode } from '../../../shared/app-error'
import {
  DEFAULT_WS_ID,
  DEFAULT_WS_NAME,
  createWorkspaceSkeleton,
  generateWorkspaceId,
  listWorkspaceIds,
  migrateLegacyIntoDefault,
  readMeta,
  readPointerId,
  workspacesRoot,
  writeMeta,
  writePointer
} from './workspace.fs'

export interface WorkspaceServiceDeps {
  userDataDir: string
  /** 课题空库落位（开库跑迁移即关——main 根注入，services 禁直连 db） */
  initWorkspaceDb: (wsDir: string) => void
  /** 关当前课题库句柄（Win 下 rename 打开句柄的库文件会失败——物化前必关） */
  closeCurrent: () => void
  /** 在目标目录重建数据层并换容器引用（bootstrap 注入=data-layer.container） */
  assembleInto: (dataDir: string) => Promise<void>
}

class WorkspaceDomainError extends Error {
  readonly code: AppErrorCode

  constructor(code: AppErrorCode, message: string) {
    super(message)
    this.name = 'WorkspaceDomainError'
    this.code = code
  }
}

function wsNotFound(id: string): WorkspaceDomainError {
  return new WorkspaceDomainError('NOT_FOUND', `课题不存在：${id}`)
}

function wsBusy(): WorkspaceDomainError {
  return new WorkspaceDomainError('CONFLICT', '课题切换进行中，请稍后再试')
}

export function createWorkspaceService(deps: WorkspaceServiceDeps) {
  const { userDataDir } = deps
  const rootDir = workspacesRoot(userDataDir)
  // 变更互斥单飞标志（per 服务实例——工厂闭包内，禁模块级共享）
  let busy = false

  /** L0 物化：关活句柄 → 迁移 → 重建 default（幂等：非 L0 直接 false） */
  async function materializeLegacy(): Promise<boolean> {
    if (existsSync(rootDir)) return false
    if (!existsSync(join(userDataDir, DB_FILE_NAME))) return false
    deps.closeCurrent()
    await migrateLegacyIntoDefault(userDataDir)
    await deps.assembleInto(join(rootDir, DEFAULT_WS_ID))
    return true
  }

  /** 读侧零副作用的当前课题 id 解析（W 态；与 list 同一降级规则） */
  async function resolveCurrentId(ids: readonly string[]): Promise<string> {
    const pointer = await readPointerId(userDataDir)
    if (pointer !== null && ids.includes(pointer)) return pointer
    return ids[0] ?? DEFAULT_WS_ID
  }

  return {
    async list(_req: unknown) {
      if (!existsSync(rootDir)) {
        // L0：合成 default（不物化——读侧零副作用）
        const mtime = (await stat(join(userDataDir, DB_FILE_NAME)).catch(() => null))?.mtime
        return {
          items: [
            {
              id: DEFAULT_WS_ID,
              name: DEFAULT_WS_NAME,
              createdAt: mtime?.toISOString() ?? '1970-01-01T00:00:00.000Z'
            }
          ],
          currentId: DEFAULT_WS_ID
        }
      }
      const ids = await listWorkspaceIds(rootDir)
      const items = await Promise.all(
        ids.map(async (id) => ({ id, ...(await readMeta(rootDir, id)) }))
      )
      items.sort((a, b) =>
        a.createdAt === b.createdAt ? a.id.localeCompare(b.id) : a.createdAt.localeCompare(b.createdAt)
      )
      return { items, currentId: await resolveCurrentId(ids) }
    },

    async currentName(): Promise<string> {
      if (!existsSync(rootDir)) return DEFAULT_WS_NAME
      const ids = await listWorkspaceIds(rootDir)
      const currentId = await resolveCurrentId(ids)
      if (!ids.includes(currentId)) return DEFAULT_WS_NAME
      return (await readMeta(rootDir, currentId)).name
    },

    async create(req: { name: string }) {
      if (busy) throw wsBusy()
      busy = true
      try {
        await materializeLegacy()
        const id = await generateWorkspaceId(rootDir)
        await createWorkspaceSkeleton(rootDir, id, req.name)
        deps.initWorkspaceDb(join(rootDir, id))
        return { id } // 不切指针：create 后由 renderer 显式 switch（WS2 流程）
      } finally {
        busy = false
      }
    },

    async rename(req: { id: string; name: string }) {
      if (busy) throw wsBusy()
      busy = true
      try {
        await materializeLegacy()
        if (!(await listWorkspaceIds(rootDir)).includes(req.id)) throw wsNotFound(req.id)
        const meta = await readMeta(rootDir, req.id)
        await writeMeta(rootDir, req.id, {
          name: req.name,
          createdAt: meta.createdAt || new Date().toISOString()
        })
        return { ok: true as const }
      } finally {
        busy = false
      }
    },

    async switch(req: { id: string }) {
      if (busy) throw wsBusy()
      busy = true
      try {
        const materialized = await materializeLegacy()
        if (!(await listWorkspaceIds(rootDir)).includes(req.id)) throw wsNotFound(req.id)
        if (materialized && req.id === DEFAULT_WS_ID) {
          return { ok: true as const } // 物化即已完成 default 重建与指针落位
        }
        // 时序（票面 P1 字面）：关旧库 → 指针写入 → 装配新课题 → 换容器引用
        deps.closeCurrent()
        await writePointer(userDataDir, req.id)
        await deps.assembleInto(join(rootDir, req.id))
        return { ok: true as const }
      } finally {
        busy = false
      }
    }
  }
}
