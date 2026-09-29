import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { createImportService } from '../../../src/main/services/import_/import.service'
import { createFileStore } from '../../../src/main/services/import_/file-store'
import type { Repos, PaperRow } from '../../../src/main/db/repos'
import type { ImportProgressEvent } from '../../../src/shared/ipc/schemas'
import { createTinyPdf, PDF_KNOWN_TEXT } from '../../utils/pdf-factory'
import { guardedDescribe } from '../../utils/guard'
import { createTestDb } from '../../utils/fixtures'
import { createCollectionsRepo } from '../../../src/main/db/repos/collections.repo'
import { createFoldersRepo } from '../../../src/main/db/repos/folders.repo'
import { createLineageRepo } from '../../../src/main/db/repos/lineage.repo'

const dirs: string[] = []
afterAll(async () => {
  for (const d of dirs) await rm(d, { recursive: true, force: true })
})

/** 无操作 gate 桩（互斥计数面由 F-D4 新用例单独验证——gate 为必选 deps） */
const noopGate = { enter: () => undefined, exit: () => undefined }

function makeRepos(db: ReturnType<typeof createTestDb>): Repos {
  // 用真实 repos（SR-DB-05 完成前 guarded 跳过；这是集成性质验收）
  const papers = {
    insert: (row: PaperRow) => {
      db.prepare(
        `INSERT INTO papers (id, file_ref, sha256, title, added_at, updated_at)
         VALUES (?,?,?,?,?,?)`
      ).run(row.id, row.file_ref, row.sha256, row.title, row.added_at, row.updated_at)
    },
    findBySha256: (sha: string) =>
      (db.prepare(`SELECT id FROM papers WHERE sha256=?`).get(sha) as { id: string } | undefined) ?? null,
    // [F-FOLDER-01] 单归属直写（真实 SQL——folder 归属事务面同源）
    setFolderId: (id: string, folderId: string | null) => {
      db.prepare('UPDATE papers SET folder_id=? WHERE id=?').run(folderId, id)
      return null
    }
  }
  return {
    papers: papers as unknown as Repos['papers'],
    collections: createCollectionsRepo(db),
    folders: createFoldersRepo(db), // [F-FOLDER-01]
    annotations: {} as Repos['annotations'],
    aiNotes: {} as Repos['aiNotes'],
    // [回炉码 2] 挂接建节点走真 lineage repo（listGraph/upsertNode——真库）
    lineage: createLineageRepo(db),
    notes: {} as Repos['notes'],
    tags: {} as Repos['tags'],
    withTransaction: <T>(fn: () => T): T => db.transaction(fn)()
  }
}

guardedDescribe('SR-SVC-03', 'import.service —— 导入编排', () => {
  it('importFiles：成功入库（元数据来自抽取器，标题回退文件名）', async () => {
    const db = createTestDb()
    const storeDir = await mkdtemp(join(tmpdir(), 'imp-'))
    dirs.push(storeDir)
    const src = join(storeDir, '论文一.pdf')
    const { writeFile } = await import('node:fs/promises')
    await writeFile(src, createTinyPdf())

    const progress: Array<{ phase: string; total: number }> = []
    const svc = createImportService({
      repos: makeRepos(db),
      fileStore: createFileStore(join(storeDir, 'managed')),
      gate: noopGate,
      extractMeta: async () => ({
        title: '',
        authors: ['张三'],
        year: 2025,
        doi: '10.1/x',
        arxivId: null
      }),
      onProgress: (e) => progress.push({ phase: e.phase, total: e.total })
    })
    const result = await svc.importFiles([src])
    expect(result.imported).toHaveLength(1)
    expect(result.imported[0]?.title).toBe('论文一') // 抽取标题空 → 文件名去扩展
    expect(result.imported[0]?.doi).toBe('10.1/x')
    expect(result.duplicates).toEqual([])
    expect(progress.at(-1)?.phase).toBe('done')
  })

  it('重复 sha256 进 duplicates 不重复入库', async () => {
    const db = createTestDb()
    const storeDir = await mkdtemp(join(tmpdir(), 'dup-'))
    dirs.push(storeDir)
    const { writeFile } = await import('node:fs/promises')
    const a = join(storeDir, 'a.pdf')
    const b = join(storeDir, 'b.pdf')
    await writeFile(a, createTinyPdf())
    await writeFile(b, createTinyPdf())

    const svc = createImportService({
      repos: makeRepos(db),
      fileStore: createFileStore(join(storeDir, 'managed')),
      gate: noopGate,
      extractMeta: async () => ({ title: '', authors: [], year: null, doi: null, arxivId: null })
    })
    const first = await svc.importFiles([a])
    const second = await svc.importFiles([b])
    expect(first.imported).toHaveLength(1)
    expect(second.imported).toHaveLength(0)
    expect(second.duplicates).toEqual(['b.pdf'])
  })

  it('非 PDF 文件进 failed（含中文原因），不中断整批', async () => {
    const db = createTestDb()
    const storeDir = await mkdtemp(join(tmpdir(), 'bad-'))
    dirs.push(storeDir)
    const { writeFile } = await import('node:fs/promises')
    const bad = join(storeDir, 'bad.pdf')
    const good = join(storeDir, 'good.pdf')
    await writeFile(bad, '这不是 PDF')
    await writeFile(good, createTinyPdf())

    const svc = createImportService({
      repos: makeRepos(db),
      fileStore: createFileStore(join(storeDir, 'managed')),
      gate: noopGate,
      extractMeta: async () => ({ title: '', authors: [], year: null, doi: null, arxivId: null })
    })
    const result = await svc.importFiles([bad, good])
    expect(result.imported).toHaveLength(1)
    expect(result.failed).toHaveLength(1)
    expect(result.failed[0]?.fileName).toBe('bad.pdf')
    expect(result.failed[0]?.reason.length).toBeGreaterThan(0)
  })

  it('importFolder：一级子目录名映射为集合并挂接；根文件不挂', async () => {
    const db = createTestDb()
    const storeDir = await mkdtemp(join(tmpdir(), 'folder-'))
    dirs.push(storeDir)
    const { mkdir, writeFile } = await import('node:fs/promises')
    await mkdir(join(storeDir, '第二时代'), { recursive: true })
    await writeFile(join(storeDir, '第二时代', 'a.pdf'), createTinyPdf())
    await writeFile(join(storeDir, 'root.pdf'), createTinyPdf(PDF_KNOWN_TEXT + '2'))

    const svc = createImportService({
      repos: makeRepos(db),
      fileStore: createFileStore(join(storeDir, 'managed')),
      gate: noopGate,
      extractMeta: async () => ({ title: '', authors: [], year: null, doi: null, arxivId: null })
    })
    const result = await svc.importFolder(storeDir)
    expect(result.imported).toHaveLength(2)
    // [F-FOLDER-01] 单归属：一级子目录名→folderId（M2M collectionNames 退役）
    const inCollection = result.imported.find((p) => p.folderId !== null)
    expect(inCollection).toBeTruthy()
    const rootPaper = result.imported.find((p) => p.folderId === null)
    expect(rootPaper).toBeTruthy()
  })

  it('[回炉码 2] 挂接即自动入图：一级子目录文献→节点落其文件夹（folder=归属）+year 取元数据+month=null 缺省组+slot 组末；根文件不建节点', async () => {
    const db = createTestDb()
    const storeDir = await mkdtemp(join(tmpdir(), 'node-'))
    dirs.push(storeDir)
    const { mkdir, writeFile } = await import('node:fs/promises')
    await mkdir(join(storeDir, '合集'), { recursive: true })
    await writeFile(join(storeDir, 'root.pdf'), createTinyPdf())
    await writeFile(join(storeDir, '合集', 'in.pdf'), createTinyPdf(PDF_KNOWN_TEXT + '2'))
    const svc = createImportService({
      repos: makeRepos(db),
      fileStore: createFileStore(join(storeDir, 'managed')),
      gate: noopGate,
      extractMeta: async (bytes: Uint8Array) => ({
        title: '节点文献',
        authors: [],
        year: 2024,
        doi: null,
        arxivId: null,
        _: bytes
      })
    })
    const result = await svc.importFolder(storeDir)
    expect(result.imported).toHaveLength(2)
    const rows = db
      .prepare('SELECT n.paper_id, n.title, n.year, n.month, n.slot, n.folder_id, p.folder_id AS paper_folder FROM lineage_nodes n JOIN papers p ON p.id=n.paper_id')
      .all() as Array<{ paper_id: string; title: string; year: number | null; month: number | null; slot: number | null; folder_id: string; paper_folder: string }>
    expect(rows).toHaveLength(1) // 根文件零节点（矩阵「导入→全部」行）
    const node = rows[0]!
    expect(node.paper_id).toBe(result.imported.find((x) => x.folderId !== null)!.id)
    expect(node.title).toBe('节点文献')
    expect(node.year).toBe(2024)
    expect(node.month).toBeNull()
    expect(node.slot).toBe(1)
    expect(node.folder_id).toBe(node.paper_folder) // INV-88 统一规则：节点=文献归属
  })

  it('挂接失败整体回滚：papers 不得残留行，sha 不被占用（重导可成功）', async () => {
    const db = createTestDb()
    const storeDir = await mkdtemp(join(tmpdir(), 'tx-'))
    dirs.push(storeDir)
    const { mkdir, writeFile } = await import('node:fs/promises')
    await mkdir(join(storeDir, '合集'), { recursive: true })
    await writeFile(join(storeDir, '合集', 'a.pdf'), createTinyPdf())

    // 模拟第二条写入语句失败（SQLITE_BUSY/IO 类）：folder 归属写抛错
    // （[F-FOLDER-01] attach 退役——事务回滚语义同一验证面）
    const brokenRepos: Repos = {
      ...makeRepos(db),
      papers: {
        ...makeRepos(db).papers,
        setFolderId: () => {
          throw new Error('模拟：挂接失败')
        }
      } as unknown as Repos['papers']
    }
    const defaults = { title: '', authors: [], year: null, doi: null, arxivId: null }
    const failed = createImportService({
      repos: brokenRepos,
      fileStore: createFileStore(join(storeDir, 'managed')),
      gate: noopGate,
      extractMeta: async () => defaults
    })
    const r1 = await failed.importFolder(storeDir)
    expect(r1.failed).toHaveLength(1)
    // 核心断言：insert 不得残留（无事务时行已入库且 sha 判重导致永远无法重导）
    const rows = db.prepare('SELECT COUNT(*) AS c FROM papers').get() as { c: number }
    expect(rows.c).toBe(0)

    // 修复语义的实用后果：同一文件重导（attach 正常）必须能成功
    const retry = createImportService({
      repos: makeRepos(db),
      fileStore: createFileStore(join(storeDir, 'managed')),
      gate: noopGate,
      extractMeta: async () => defaults
    })
    const r2 = await retry.importFolder(storeDir)
    expect(r2.imported).toHaveLength(1)
  })
})

/**
 * [F-D4] import 会话身份两合一（INV-52，always-active——三屋纪律不经 guardedDescribe）：
 * ①进度事件全程同 sessionId 且两次调用不同；②gate enter/exit 各恰一次
 * （failed 折叠路径）；③域错误抛出路径也必经 finally exit。
 */
describe('F-D4 import.service —— 会话身份（gate 互斥 + sessionId）', () => {
  it('进度事件全程同 sessionId，两次调用不同（非空字符串）', async () => {
    const db = createTestDb()
    const storeDir = await mkdtemp(join(tmpdir(), 'sid-'))
    dirs.push(storeDir)
    const { writeFile } = await import('node:fs/promises')
    const a = join(storeDir, 'a.pdf')
    const b = join(storeDir, 'b.pdf')
    await writeFile(a, createTinyPdf())
    await writeFile(b, createTinyPdf(PDF_KNOWN_TEXT + '2'))

    const events: ImportProgressEvent[] = []
    const svc = createImportService({
      repos: makeRepos(db),
      fileStore: createFileStore(join(storeDir, 'managed')),
      gate: noopGate,
      extractMeta: async () => ({ title: '', authors: [], year: null, doi: null, arxivId: null }),
      onProgress: (e) => events.push(e)
    })
    await svc.importFiles([a])
    const first = events.map((e) => e.sessionId)
    expect(first.length).toBeGreaterThan(0)
    expect(first.every((id) => typeof id === 'string' && id.length > 0)).toBe(true)
    expect(new Set(first).size).toBe(1)

    const beforeSecond = events.length
    await svc.importFiles([b])
    const second = events.slice(beforeSecond).map((e) => e.sessionId)
    expect(new Set(second).size).toBe(1)
    expect(second[0]).not.toBe(first[0])
  })

  it('gate enter/exit 各恰一次，failed 折叠路径也 exit（finally）', async () => {
    const db = createTestDb()
    const storeDir = await mkdtemp(join(tmpdir(), 'gate-'))
    dirs.push(storeDir)
    const { writeFile } = await import('node:fs/promises')
    const bad = join(storeDir, 'bad.pdf')
    const good = join(storeDir, 'good.pdf')
    await writeFile(bad, '这不是 PDF')
    await writeFile(good, createTinyPdf())

    let enters = 0
    let exits = 0
    const svc = createImportService({
      repos: makeRepos(db),
      fileStore: createFileStore(join(storeDir, 'managed')),
      gate: { enter: () => { enters++ }, exit: () => { exits++ } },
      extractMeta: async () => ({ title: '', authors: [], year: null, doi: null, arxivId: null })
    })
    const result = await svc.importFiles([bad, good])
    expect(result.failed).toHaveLength(1)
    expect(enters).toBe(1)
    expect(exits).toBe(1)
  })

  it('域错误抛出路径也必经 finally：importFolder 读不了文件夹上抛 IO_ERROR 后 exit 恰一次', async () => {
    const db = createTestDb()
    const storeDir = await mkdtemp(join(tmpdir(), 'gderr-'))
    dirs.push(storeDir)
    let enters = 0
    let exits = 0
    const svc = createImportService({
      repos: makeRepos(db),
      fileStore: createFileStore(join(storeDir, 'managed')),
      gate: { enter: () => { enters++ }, exit: () => { exits++ } },
      extractMeta: async () => ({ title: '', authors: [], year: null, doi: null, arxivId: null })
    })
    await expect(svc.importFolder(join(storeDir, '不存在'))).rejects.toMatchObject({
      code: 'IO_ERROR'
    })
    expect(enters).toBe(1)
    expect(exits).toBe(1)
  })
})
