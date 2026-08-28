import { describe, expect, it, afterAll } from 'vitest'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openDatabase, type SqliteDb } from '../../../src/main/db/connection'
import { migrate, readUserVersion } from '../../../src/main/db/migrate'
import { createRepos, type PaperRow } from '../../../src/main/db/repos'
import { createFileStore } from '../../../src/main/services/import_/file-store'
import type { ServiceBundle } from '../../../src/main/services/index'
import {
  DEFAULT_WS_ID,
  DEFAULT_WS_NAME,
  POINTER_FILE_NAME,
  WORKSPACES_DIR_NAME
} from '../../../src/main/services/workspaces/workspace.fs'
import { createWorkspaceService } from '../../../src/main/services/workspaces/workspace.service'
import { ensureWorkspaceLayout, initWorkspaceDb } from '../../../src/main/workspace-layout'
import { createDataLayerContainer } from '../../../src/main/data-layer.container'

/**
 * [R1-WS1] workspaces 域单测（ADR-0018 库级分目录）——真临时目录+真 SQLite。
 * always-active（三屋纪律：新测试不经 guardedDescribe）。
 * 覆盖：遗留迁移+幂等+崩溃断点续迁 / 全新首启 L0（e2e 种子配方兼容）/
 * 指针缺省与损坏降级 / list/create/rename/switch/currentName / busy 串行守卫 /
 * 数据层容器 facade 热换（ipc/index 零改动的机制面）。
 */
const tmpDirs: string[] = []

async function mkUserData(prefix: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), prefix))
  tmpDirs.push(dir)
  return dir
}

afterAll(async () => {
  for (const dir of tmpDirs) await rm(dir, { recursive: true, force: true })
})

function legacyRow(id: string): PaperRow {
  return {
    id,
    file_ref: 'ab/cd/legacy.pdf',
    sha256: `sha-${id}`,
    title: '遗留布局种子文献',
    authors_json: '[]',
    year: 2025,
    venue: '',
    doi: null,
    arxiv_id: null,
    abstract: '',
    source: 'local',
    enrich_status: 'pending',
    added_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    last_read_page: 0
  }
}

/** 造一份「旧版应用」遗留布局：userData 根下 synapse.db（含真实行）+files/+wal/shm */
async function seedLegacyLayout(u: string): Promise<void> {
  const db = openDatabase(join(u, 'synapse.db'))
  migrate(db)
  createRepos(db).papers.insert(legacyRow('p-legacy'))
  db.close()
  await mkdir(join(u, 'files', 'ab', 'cd'), { recursive: true })
  await writeFile(join(u, 'files', 'ab', 'cd', 'legacy.pdf'), '%PDF-1.4 遗留受管文件')
  await writeFile(join(u, 'synapse.db-wal'), '')
  await writeFile(join(u, 'synapse.db-shm'), '')
}

async function readPointer(u: string): Promise<{ currentId?: unknown }> {
  return JSON.parse(await readFile(join(u, POINTER_FILE_NAME), 'utf-8')) as { currentId?: unknown }
}

function openMigrated(dbPath: string): SqliteDb {
  const db = openDatabase(dbPath)
  migrate(db)
  return db
}

/**
 * L0 会话夹具（门一 W1/W2 回炉）：真库在 userData 根（含行 p0）+ service 注入
 * 记录器（close 计数/装配目录序列/下一次装配注入失败开关）。
 */
async function l0Session(prefix: string): Promise<{
  u: string
  svc: ReturnType<typeof createWorkspaceService>
  cur: { db: SqliteDb | null }
  closeCalls: () => number
  assembledDirs: () => string[]
  failNextAssemble: () => void
}> {
  const u = await mkUserData(prefix)
  await ensureWorkspaceLayout(u)
  const db = openMigrated(join(u, 'synapse.db'))
  createRepos(db).papers.insert(legacyRow('p0'))
  const ref = { db: db as SqliteDb | null }
  let closes = 0
  let failNext = false
  const dirs: string[] = []
  const svc = createWorkspaceService({
    userDataDir: u,
    initWorkspaceDb,
    closeCurrent: () => {
      ref.db?.close()
      ref.db = null
      closes++
    },
    assembleInto: async (dir) => {
      if (failNext) {
        failNext = false
        throw new Error('装配失败：模拟课题库被占用')
      }
      dirs.push(dir)
      ref.db = openMigrated(join(dir, 'synapse.db'))
    }
  })
  return {
    u,
    svc,
    cur: ref,
    closeCalls: () => closes,
    assembledDirs: () => [...dirs],
    failNextAssemble: () => {
      failNext = true
    }
  }
}

describe('ensureWorkspaceLayout —— 遗留迁移/幂等/指针降级/全新首启', () => {
  it('遗留布局整体迁入 default：库数据不丢+wal/shm/files 随迁+指针=default', async () => {
    const u = await mkUserData('synapse-ws-mig-')
    await seedLegacyLayout(u)
    const layout = await ensureWorkspaceLayout(u)
    const defDir = join(u, WORKSPACES_DIR_NAME, DEFAULT_WS_ID)
    expect(layout.mode).toBe('workspace')
    expect(layout.currentId).toBe(DEFAULT_WS_ID)
    expect(layout.dataDir).toBe(defDir)
    expect(existsSync(join(defDir, 'synapse.db'))).toBe(true)
    expect(existsSync(join(defDir, 'synapse.db-wal'))).toBe(true)
    expect(existsSync(join(defDir, 'synapse.db-shm'))).toBe(true)
    expect(existsSync(join(defDir, 'files', 'ab', 'cd', 'legacy.pdf'))).toBe(true)
    expect(existsSync(join(u, 'synapse.db'))).toBe(false)
    expect(existsSync(join(u, 'files'))).toBe(false)
    expect(await readPointer(u)).toEqual({ currentId: DEFAULT_WS_ID })
    const db = openMigrated(join(defDir, 'synapse.db'))
    expect(createRepos(db).papers.findById('p-legacy')?.title).toBe('遗留布局种子文献')
    db.close()
  })

  it('迁移幂等：已迁移后二次调用不动（default 库已在=跳过，行仍在）', async () => {
    const u = await mkUserData('synapse-ws-idem-')
    await seedLegacyLayout(u)
    const first = await ensureWorkspaceLayout(u)
    const second = await ensureWorkspaceLayout(u)
    expect(second.dataDir).toBe(first.dataDir)
    expect(second.currentId).toBe(DEFAULT_WS_ID)
    const db = openMigrated(join(first.dataDir, 'synapse.db'))
    expect(createRepos(db).papers.findById('p-legacy')).not.toBeNull()
    db.close()
  })

  it('崩溃断点续迁：workspaces/default 已建但库未移入 → 仍完成迁移（防孤儿库）', async () => {
    const u = await mkUserData('synapse-ws-resume-')
    await seedLegacyLayout(u)
    // 模拟迁移中途崩溃：root/default 已 mkdir、files/ 已移、db 未移
    const defDir = join(u, WORKSPACES_DIR_NAME, DEFAULT_WS_ID)
    await mkdir(defDir, { recursive: true })
    await mkdir(join(u, WORKSPACES_DIR_NAME), { recursive: true })
    const { rename } = await import('node:fs/promises')
    await rename(join(u, 'files'), join(defDir, 'files'))
    const layout = await ensureWorkspaceLayout(u)
    expect(layout.mode).toBe('workspace')
    expect(layout.currentId).toBe(DEFAULT_WS_ID)
    const db = openMigrated(join(defDir, 'synapse.db'))
    expect(createRepos(db).papers.findById('p-legacy')).not.toBeNull()
    db.close()
    expect(existsSync(join(u, 'synapse.db'))).toBe(false)
  })

  it('全新首启=legacy-fresh：不建 workspaces/（受锁 e2e 种子配方兼容）', async () => {
    const u = await mkUserData('synapse-ws-fresh-')
    const layout = await ensureWorkspaceLayout(u)
    expect(layout.mode).toBe('legacy-fresh')
    expect(layout.currentId).toBe(DEFAULT_WS_ID)
    expect(layout.dataDir).toBe(u)
    expect(existsSync(join(u, WORKSPACES_DIR_NAME))).toBe(false)
  })

  it('指针缺省/损坏=降级目录序第一，不崩溃', async () => {
    const u = await mkUserData('synapse-ws-ptr-')
    await seedLegacyLayout(u)
    await ensureWorkspaceLayout(u)
    const svc = createWorkspaceService({
      userDataDir: u,
      initWorkspaceDb,
      closeCurrent: () => undefined,
      assembleInto: async () => undefined
    })
    const created = await svc.create({ name: '课题乙' })
    await rm(join(u, POINTER_FILE_NAME))
    const noPointer = await ensureWorkspaceLayout(u)
    expect(noPointer.currentId).toBe(DEFAULT_WS_ID) // 'default' 字典序先于 'ws-*'
    await writeFile(join(u, POINTER_FILE_NAME), '不是 JSON', 'utf-8')
    const corrupt = await ensureWorkspaceLayout(u)
    expect(corrupt.currentId).toBe(DEFAULT_WS_ID)
    const listed = await svc.list({})
    expect(listed.currentId).toBe(DEFAULT_WS_ID)
    expect(listed.items.map((i) => i.id).sort()).toEqual([DEFAULT_WS_ID, created.id].sort())
  })

  it('workspaces/ 在但零有效目录 → 建 default 空课题（库已迁移可开）', async () => {
    const u = await mkUserData('synapse-ws-empty-')
    await mkdir(join(u, WORKSPACES_DIR_NAME), { recursive: true })
    const layout = await ensureWorkspaceLayout(u)
    expect(layout.mode).toBe('workspace')
    expect(layout.currentId).toBe(DEFAULT_WS_ID)
    const db = openMigrated(join(layout.dataDir, 'synapse.db'))
    expect(readUserVersion(db)).toBeGreaterThan(0)
    db.close()
  })
})

describe('workspace.service —— list/create/rename/switch/currentName', () => {
  it('L0 会话：list 合成 default；create 物化遗留（旧数据入 default）+新课题空库已迁移', async () => {
    const u = await mkUserData('synapse-ws-l0-')
    await ensureWorkspaceLayout(u)
    const db = openMigrated(join(u, 'synapse.db'))
    createRepos(db).papers.insert(legacyRow('p0'))
    let cur: SqliteDb = db
    const svc = createWorkspaceService({
      userDataDir: u,
      initWorkspaceDb,
      closeCurrent: () => cur.close(),
      assembleInto: async (dir) => {
        cur = openMigrated(join(dir, 'synapse.db'))
      }
    })
    const listed = await svc.list({})
    expect(listed.currentId).toBe(DEFAULT_WS_ID)
    expect(listed.items).toHaveLength(1)
    const first = listed.items[0]
    if (first === undefined) throw new Error('L0 list 应合成 default 条目')
    expect(first).toMatchObject({ id: DEFAULT_WS_ID, name: DEFAULT_WS_NAME })
    expect(typeof first.createdAt).toBe('string')
    expect(first.createdAt.length).toBeGreaterThan(0)
    expect(await svc.currentName()).toBe(DEFAULT_WS_NAME)

    const created = await svc.create({ name: '课题乙' })
    expect(created.id).toMatch(/^[a-z0-9-]{1,64}$/)
    expect(created.id).not.toBe(DEFAULT_WS_ID)
    // 物化：遗留库（含会话内数据）整体入 default
    const defDb = openMigrated(join(u, WORKSPACES_DIR_NAME, DEFAULT_WS_ID, 'synapse.db'))
    expect(createRepos(defDb).papers.findById('p0')).not.toBeNull()
    defDb.close()
    // 新课题空库已迁移
    const newDb = openMigrated(join(u, WORKSPACES_DIR_NAME, created.id, 'synapse.db'))
    expect(readUserVersion(newDb)).toBeGreaterThan(0)
    newDb.close()
    // create 不切指针：当前仍是 default
    expect(await readPointer(u)).toEqual({ currentId: DEFAULT_WS_ID })
    const after = await svc.list({})
    expect(after.items.map((i) => i.id)).toContain(created.id)
    expect(after.currentId).toBe(DEFAULT_WS_ID)
    cur.close() // Windows 文件锁：句柄不关则 afterAll 清理 EBUSY
  })

  it('rename 生效且 list 反映；ghost id 抛中文 NOT_FOUND', async () => {
    const u = await mkUserData('synapse-ws-ren-')
    await seedLegacyLayout(u)
    await ensureWorkspaceLayout(u)
    const svc = createWorkspaceService({
      userDataDir: u,
      initWorkspaceDb,
      closeCurrent: () => undefined,
      assembleInto: async () => undefined
    })
    await expect(svc.rename({ id: 'ghost', name: '不存在' })).rejects.toMatchObject({
      code: 'NOT_FOUND'
    })
    await expect(svc.rename({ id: 'ghost', name: '不存在' })).rejects.toThrow(/课题不存在/)
    const ack = await svc.rename({ id: DEFAULT_WS_ID, name: '课题甲改名' })
    expect(ack).toEqual({ ok: true })
    const listed = await svc.list({})
    expect(listed.items.find((i) => i.id === DEFAULT_WS_ID)?.name).toBe('课题甲改名')
    expect(await svc.currentName()).toBe('课题甲改名')
  })

  it('switch：ghost NOT_FOUND；真切换=关旧库→指针→装配新库（真 SQLite 句柄失效断言）', async () => {
    const u = await mkUserData('synapse-ws-sw-')
    await seedLegacyLayout(u)
    const layout = await ensureWorkspaceLayout(u)
    let cur: SqliteDb = openMigrated(join(layout.dataDir, 'synapse.db'))
    const assembled: string[] = []
    const svc = createWorkspaceService({
      userDataDir: u,
      initWorkspaceDb,
      closeCurrent: () => cur.close(),
      assembleInto: async (dir) => {
        assembled.push(dir)
        cur = openMigrated(join(dir, 'synapse.db'))
      }
    })
    const created = await svc.create({ name: '课题乙' })
    await expect(svc.switch({ id: 'ghost' })).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect(await readPointer(u)).toEqual({ currentId: DEFAULT_WS_ID }) // 失败切换不动指针

    const ack = await svc.switch({ id: created.id })
    expect(ack).toEqual({ ok: true })
    expect(() => cur.prepare('SELECT 1')).not.toThrow() // 新句柄可用
    const listed = await svc.list({})
    expect(listed.currentId).toBe(created.id)
    expect(await readPointer(u)).toEqual({ currentId: created.id })
    expect(assembled.at(-1)).toBe(join(u, WORKSPACES_DIR_NAME, created.id))
    const before = cur
    await svc.switch({ id: DEFAULT_WS_ID })
    expect(() => before.prepare('SELECT 1')).toThrow() // 旧句柄已关
    cur.close() // Windows 文件锁：收尾关当前句柄
  })

  it('busy 串行守卫：切换进行中并发 switch 抛中文 CONFLICT', async () => {
    const u = await mkUserData('synapse-ws-busy-')
    await seedLegacyLayout(u)
    await ensureWorkspaceLayout(u)
    let cur: SqliteDb | null = openMigrated(join(u, WORKSPACES_DIR_NAME, DEFAULT_WS_ID, 'synapse.db'))
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const svc = createWorkspaceService({
      userDataDir: u,
      initWorkspaceDb,
      closeCurrent: () => {
        cur?.close()
        cur = null
      },
      assembleInto: async (dir) => {
        await gate
        cur = openMigrated(join(dir, 'synapse.db'))
      }
    })
    const created = await svc.create({ name: '课题乙' })
    const first = svc.switch({ id: created.id })
    await expect(svc.switch({ id: created.id })).rejects.toMatchObject({ code: 'CONFLICT' })
    await expect(svc.switch({ id: created.id })).rejects.toThrow(/切换/)
    release()
    await expect(first).resolves.toEqual({ ok: true })
    // 守卫释放后可再切
    await expect(svc.switch({ id: DEFAULT_WS_ID })).resolves.toEqual({ ok: true })
    cur?.close() // Windows 文件锁：收尾关当前句柄
  })

  it('W1-a L0 链：list 只见 default → switch 回 default=物化+提前返回（不二段重建）', async () => {
    const { u, svc, closeCalls, assembledDirs, cur } = await l0Session('synapse-ws-w1a-')
    const listed = await svc.list({})
    expect(listed.items.map((i) => i.id)).toEqual([DEFAULT_WS_ID]) // L0 只见 default
    await expect(svc.switch({ id: DEFAULT_WS_ID })).resolves.toEqual({ ok: true })
    // 物化落位：根库整体入 default（行不丢），指针=default，根库清空
    const defDb = openMigrated(join(u, WORKSPACES_DIR_NAME, DEFAULT_WS_ID, 'synapse.db'))
    expect(createRepos(defDb).papers.findById('p0')).not.toBeNull()
    defDb.close()
    expect(existsSync(join(u, 'synapse.db'))).toBe(false)
    expect(await readPointer(u)).toEqual({ currentId: DEFAULT_WS_ID })
    // 提前返回分支：恰一次 close+恰一次装配（均在物化内），无第二段重建
    expect(closeCalls()).toBe(1)
    expect(assembledDirs()).toEqual([join(u, WORKSPACES_DIR_NAME, DEFAULT_WS_ID)])
    expect(() => cur.db?.prepare('SELECT 1')).not.toThrow() // 会话句柄=物化重建产物，活
    cur.db?.close()
  })

  it('W1-b L0 链：create(B)+switch(B)=物化(default)+切换二合一（default 行完整+根库清空）', async () => {
    const { u, svc, closeCalls, assembledDirs, cur } = await l0Session('synapse-ws-w1b-')
    const b = await svc.create({ name: '课题B' })
    expect(await readPointer(u)).toEqual({ currentId: DEFAULT_WS_ID }) // create 段不切指针
    const defaultHandle = cur.db
    await expect(svc.switch({ id: b.id })).resolves.toEqual({ ok: true })
    // default 库行完整（rename 入位后数据不动）+ 根库不存在
    const defDb = openMigrated(join(u, WORKSPACES_DIR_NAME, DEFAULT_WS_ID, 'synapse.db'))
    expect(createRepos(defDb).papers.findById('p0')).not.toBeNull()
    defDb.close()
    expect(existsSync(join(u, 'synapse.db'))).toBe(false)
    // 切换段：default 旧句柄失效 → 指针=B → 装配恰二段 [default(物化), B(切换)]
    expect(() => defaultHandle?.prepare('SELECT 1')).toThrow()
    expect(await readPointer(u)).toEqual({ currentId: b.id })
    expect(assembledDirs()).toEqual([
      join(u, WORKSPACES_DIR_NAME, DEFAULT_WS_ID),
      join(u, WORKSPACES_DIR_NAME, b.id)
    ])
    expect(closeCalls()).toBe(2)
    expect(() => cur.db?.prepare('SELECT 1')).not.toThrow() // B 库句柄活
    cur.db?.close()
  })

  it('W2 switch 装配失败：中文错误上抛 → busy 已释 → 重试成功且指针终态一致', async () => {
    const { u, svc, assembledDirs, cur, failNextAssemble } = await l0Session('synapse-ws-w2-')
    const b = await svc.create({ name: '课题B' }) // 物化完成=W 态
    const handleBefore = cur.db
    failNextAssemble()
    await expect(svc.switch({ id: b.id })).rejects.toThrow(/装配失败/)
    // busy 已释：重试不被 CONFLICT 拒，走完整流程成功（指针终态一致+装配恢复后可用）
    await expect(svc.switch({ id: b.id })).resolves.toEqual({ ok: true })
    expect(await readPointer(u)).toEqual({ currentId: b.id })
    expect(() => handleBefore?.prepare('SELECT 1')).toThrow() // 首败前的旧句柄已关
    expect(assembledDirs().at(-1)).toBe(join(u, WORKSPACES_DIR_NAME, b.id))
    expect(() => cur.db?.prepare('SELECT 1')).not.toThrow() // 容器等价句柄可用
    cur.db?.close()
  })
})

describe('data-layer.container —— 稳定 facade 热换（ipc/协议层零改动的机制面）', () => {
  it('services/fileStore 经 facade 活指向当前课题；重建关旧库；papersFileRef 间接取', async () => {
    const root = await mkUserData('synapse-ws-ctr-')
    const dirA = join(root, 'ws-a')
    const dirB = join(root, 'ws-b')
    const opened: SqliteDb[] = []
    const container = createDataLayerContainer({
      assemble: async (dir) => {
        await mkdir(join(dir, 'files'), { recursive: true })
        const db = openMigrated(join(dir, 'synapse.db'))
        opened.push(db)
        return {
          db,
          repos: createRepos(db),
          fileStore: createFileStore(join(dir, 'files')),
          services: { marker: dir } as unknown as ServiceBundle
        }
      }
    })
    await container.assembleInto(dirA)
    expect((container.services as unknown as { marker: string }).marker).toBe(dirA)
    expect(container.fileStore.resolveManagedPath('ab/cd/x.pdf')).toContain(join(dirA, 'files'))
    expect(await container.papersFileRef('p1')).toBeNull()

    // 热换=service.switch 的容器侧等价序：关旧库 → 装配新课题（指针归 service）
    container.closeCurrent()
    await container.assembleInto(dirB)
    const layerA = opened[0]!
    expect(() => layerA.prepare('SELECT 1')).toThrow() // 旧库已关
    expect((container.services as unknown as { marker: string }).marker).toBe(dirB) // services facade 活指向新课题
    expect(container.fileStore.resolveManagedPath('ab/cd/x.pdf')).toContain(join(dirB, 'files'))
    // 新课题插入行后经容器间接取到（协议回调活指向）
    createRepos(opened.at(-1)!).papers.insert({ ...legacyRow('p1'), file_ref: 'ab/cd/new.pdf' })
    expect(await container.papersFileRef('p1')).toBe('ab/cd/new.pdf')

    container.closeCurrent()
    expect(() => opened.at(-1)!.prepare('SELECT 1')).toThrow()
    // N5 空态防线：closeCurrent 后经 facade 访问=显式中文错误（不静默 undefined，INV-02 族）
    expect(() => (container.services as unknown as { marker: string }).marker).toThrow(
      /课题数据层未装配/
    )
  })
})
