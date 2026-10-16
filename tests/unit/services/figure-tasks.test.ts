/**
 * [F-VISFB-43 U4] figure-tasks 服务件单测（job 编排：enqueue 建单幂等/begin
 * 会话令牌/store 代际守卫+per-asset DomainError→failed_count 聚合/complete
 * 终态三分）。蓝本=00B failed≠empty 定式+票面「job 携 paperId/pdfSha/workspace
 * 代际防迟到回写」。always-active（不经 guardedDescribe——K3 沿承）。
 */
import { createHash } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { SqliteDb } from '../../../src/main/db/connection'
import { createRepos } from '../../../src/main/db/repos'
import { createFigureStoreService } from '../../../src/main/services/figure-store.service'
import { createFigureTaskService } from '../../../src/main/services/figure-tasks.service'
import { createFileStore } from '../../../src/main/services/import_/file-store'
import { DomainError } from '../../../src/main/services/shared/domain-error'
import { createTestDb } from '../../utils/fixtures'

function sha(b: Uint8Array): string {
  return createHash('sha256').update(b).digest('hex')
}

function seedPaper(db: SqliteDb, id: string, sha256 = `sha-${id}`): void {
  db.prepare(
    `INSERT INTO papers (id, file_ref, sha256, title, abstract, authors_json, source, enrich_status,
     added_at, updated_at, folder_id) VALUES (?, ?, ?, ?, '摘要', '[]', 'manual', 'manual', 't0', 't0', '__main__')`
  ).run(id, `f/${id}.pdf`, sha256, `题-${id}`)
}

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

function pngBytes(n: number): Uint8Array {
  return new Uint8Array([...PNG_MAGIC, n])
}

function assetInput(digest: string, bytes: Uint8Array) {
  return {
    digest,
    bytes,
    page: 1,
    width: 320,
    height: 210,
    ctmX: 10,
    ctmY: 20,
    ctmW: 61,
    ctmH: 52
  }
}

let root: string
let db: SqliteDb

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'figtask-'))
  db = createTestDb()
})

afterEach(async () => {
  db.close()
  await rm(root, { recursive: true, force: true })
})

function makeService() {
  const repos = createRepos(db)
  const fileStore = createFileStore(root)
  const figureStore = createFigureStoreService({ repos, fileStore })
  return createFigureTaskService({ repos, figureStore })
}

describe('[F-VISFB-43 U4] figure-tasks 服务件', () => {
  it('enqueue：新 paper 建 pending 单；缺席 paper 跳过；重复建幂等不覆写（ready 不回 pending）', () => {
    seedPaper(db, 'p-1')
    seedPaper(db, 'p-2')
    const svc = makeService()
    expect(svc.enqueue(['p-1', 'p-ghost', 'p-2'])).toBe(2)
    expect(svc.listForPaper('p-1').job?.status).toBe('pending')
    expect(svc.listPending()).toHaveLength(2)
    svc.beginSession('p-1')
    svc.completeSession({ token: beginTokenOf(svc, 'p-1'), excess: 0, failed: 0 })
    expect(svc.listForPaper('p-1').job?.status).toBe('ready')
    expect(svc.enqueue(['p-1'])).toBe(0)
    expect(svc.listForPaper('p-1').job?.status).toBe('ready')
  })

  it('listPending：携 sha256（桥件提取输入）；ready/failed 不列', () => {
    seedPaper(db, 'p-1', 'sha-A')
    seedPaper(db, 'p-2', 'sha-B')
    const svc = makeService()
    svc.enqueue(['p-1', 'p-2'])
    const pending = svc.listPending()
    expect(pending).toContainEqual({ paperId: 'p-1', sha256: 'sha-A' })
    expect(pending).toContainEqual({ paperId: 'p-2', sha256: 'sha-B' })
    const t1 = beginTokenOf(svc, 'p-1')
    svc.completeSession({ token: t1, excess: 0, failed: 1 })
    expect(svc.listPending().map((j) => j.paperId)).toEqual(['p-2'])
  })

  it('beginSession：pending→{token,sha256}；非 pending/无单→null；再 begin 换代（旧会话失效）', async () => {
    seedPaper(db, 'p-1', 'sha-A')
    const svc = makeService()
    svc.enqueue(['p-1'])
    const s1 = svc.beginSession('p-1')
    expect(s1?.sha256).toBe('sha-A')
    expect(s1?.token).not.toBe('')
    const s2 = svc.beginSession('p-1')
    expect(s2).not.toBeNull()
    expect(s2?.token).not.toBe(s1?.token)
    await expect(svc.storeAsset({ token: s1?.token ?? '', ...assetInput(sha(pngBytes(1)), pngBytes(1)) })).rejects.toThrow(DomainError)
    const t2 = beginTokenOf(svc, 'p-1')
    svc.completeSession({ token: t2, excess: 0, failed: 0 })
    expect(svc.beginSession('p-1')).toBeNull()
    expect(svc.beginSession('p-none')).toBeNull()
  })

  it('storeAsset 正常路径：stored=true+figureId 落库', async () => {
    seedPaper(db, 'p-1')
    const svc = makeService()
    svc.enqueue(['p-1'])
    const token = beginTokenOf(svc, 'p-1')
    const bytes = pngBytes(1)
    const r = await svc.storeAsset({ token, ...assetInput(sha(bytes), bytes) })
    expect(r.stored).toBe(true)
    expect(r.figureId).not.toBeNull()
    expect(svc.listForPaper('p-1').figures).toHaveLength(1)
  })

  it('per-asset DomainError→failed_count 聚合：digest 不符/PNG 魔数缺失两败一成→ready+failedCount=2（单图失败不空整批）', async () => {
    seedPaper(db, 'p-1')
    const svc = makeService()
    svc.enqueue(['p-1'])
    const token = beginTokenOf(svc, 'p-1')
    const good = pngBytes(1)
    const badMagic = new Uint8Array([0x00, 0x01])
    const r1 = await svc.storeAsset({ token, ...assetInput(sha(badMagic), badMagic) })
    const r2 = await svc.storeAsset({ token, ...assetInput('0'.repeat(64), good) })
    const r3 = await svc.storeAsset({ token, ...assetInput(sha(good), good) })
    expect(r1.stored).toBe(false)
    expect(r1.reason).not.toBeNull()
    expect(r2.stored).toBe(false)
    expect(r3.stored).toBe(true)
    const done = svc.completeSession({ token, excess: 0, failed: 0 })
    expect(done.status).toBe('ready')
    const job = svc.listForPaper('p-1').job
    expect(job?.failedCount).toBe(2)
    expect(job?.status).toBe('ready')
  })

  it('complete 终态三分：≥1 stored→ready；全败（0 stored+failed>0）→failed；0/0→ready 零资产（failed≠empty）', async () => {
    seedPaper(db, 'p-1')
    seedPaper(db, 'p-2')
    seedPaper(db, 'p-3')
    const svc = makeService()
    svc.enqueue(['p-1', 'p-2', 'p-3'])
    const t1 = beginTokenOf(svc, 'p-1')
    const bytes = pngBytes(1)
    await svc.storeAsset({ token: t1, ...assetInput(sha(bytes), bytes) })
    const done1 = svc.completeSession({ token: t1, excess: 2, failed: 1 })
    const t2 = beginTokenOf(svc, 'p-2')
    const done2 = svc.completeSession({ token: t2, excess: 0, failed: 3 })
    const t3 = beginTokenOf(svc, 'p-3')
    const done3 = svc.completeSession({ token: t3, excess: 0, failed: 0 })
    expect(done1.status).toBe('ready')
    expect(done2.status).toBe('failed')
    expect(done3.status).toBe('ready')
    expect(svc.listForPaper('p-1').job).toMatchObject({ status: 'ready', excess: 2, failedCount: 1 })
    expect(svc.listForPaper('p-2').job?.status).toBe('failed')
    expect(svc.listForPaper('p-3').job).toMatchObject({ status: 'ready', excess: 0, failedCount: 0 })
    expect(svc.listForPaper('p-3').figures).toHaveLength(0)
  })

  it('renderer 侧失败数并入：complete({failed:2}) 与服务端聚合并存（≥1 stored 落账相加）', async () => {
    seedPaper(db, 'p-1')
    const svc = makeService()
    svc.enqueue(['p-1'])
    const t = beginTokenOf(svc, 'p-1')
    const good = pngBytes(1)
    const badMagic = new Uint8Array([0x00])
    await svc.storeAsset({ token: t, ...assetInput(sha(good), good) })
    await svc.storeAsset({ token: t, ...assetInput(sha(badMagic), badMagic) })
    svc.completeSession({ token: t, excess: 0, failed: 2 })
    const job = svc.listForPaper('p-1').job
    expect(job?.status).toBe('ready')
    expect(job?.failedCount).toBe(3)
  })

  it('代际守卫——workspace 切换：新服务实例（容器重建）对旧 token 拒写', async () => {
    seedPaper(db, 'p-1')
    const svcA = makeService()
    svcA.enqueue(['p-1'])
    const tokenA = beginTokenOf(svcA, 'p-1')
    const svcB = makeService()
    const bytes = pngBytes(1)
    await expect(svcB.storeAsset({ token: tokenA, ...assetInput(sha(bytes), bytes) })).rejects.toThrow(DomainError)
    expect(() => svcB.completeSession({ token: tokenA, excess: 0, failed: 0 })).toThrow(DomainError)
  })

  it('代际守卫——paper 删除（重导入前删除）：store/complete 拒写 NOT_FOUND', async () => {
    seedPaper(db, 'p-1')
    const svc = makeService()
    svc.enqueue(['p-1'])
    const token = beginTokenOf(svc, 'p-1')
    db.prepare('DELETE FROM papers WHERE id = ?').run('p-1')
    const bytes = pngBytes(1)
    await expect(svc.storeAsset({ token, ...assetInput(sha(bytes), bytes) })).rejects.toThrow(DomainError)
    expect(() => svc.completeSession({ token, excess: 0, failed: 0 })).toThrow(DomainError)
  })

  it('代际守卫——sha 换代（快照覆写同 id 异 sha）：store 拒写', async () => {
    seedPaper(db, 'p-1', 'sha-old')
    const svc = makeService()
    svc.enqueue(['p-1'])
    const token = beginTokenOf(svc, 'p-1')
    db.prepare('UPDATE papers SET sha256 = ? WHERE id = ?').run('sha-new', 'p-1')
    const bytes = pngBytes(1)
    await expect(svc.storeAsset({ token, ...assetInput(sha(bytes), bytes) })).rejects.toThrow(DomainError)
  })

  it('会话终态防迟到续写：complete 后同 token 再 store 拒写', async () => {
    seedPaper(db, 'p-1')
    const svc = makeService()
    svc.enqueue(['p-1'])
    const token = beginTokenOf(svc, 'p-1')
    svc.completeSession({ token, excess: 0, failed: 0 })
    const bytes = pngBytes(1)
    await expect(svc.storeAsset({ token, ...assetInput(sha(bytes), bytes) })).rejects.toThrow(DomainError)
  })

  it('listForPaper：figures 清单（协议 URL 消费面）+job 视图；无单篇 job=null', () => {
    seedPaper(db, 'p-1')
    const svc = makeService()
    expect(svc.listForPaper('p-1').job).toBeNull()
    svc.enqueue(['p-1'])
    const token = beginTokenOf(svc, 'p-1')
    void token
    const view = svc.listForPaper('p-1')
    expect(view.figures).toEqual([])
    expect(view.job).toMatchObject({ status: 'pending', excess: 0, failedCount: 0 })
  })
})

/** begin 便捷取 token（测试内单点） */
function beginTokenOf(svc: ReturnType<typeof makeService>, paperId: string): string {
  const s = svc.beginSession(paperId)
  if (s === null) throw new Error(`beginSession(${paperId}) 意外 null`)
  return s.token
}
