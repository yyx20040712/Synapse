/**
 * [F-VISFB-42] figure-store 服务件（派生图表资产合同——repo+file-store 编排）。
 *
 * 覆盖：提取会话生命周期（begin→store×N→complete：pending/ready+excess+
 * failedCount 落账——failed≠empty 可区分）；重提取清旧行；storeFigure 守卫族
 * （digest 完整性/IPC 单笔 ≤4MB/paper 缺席 NOT_FOUND/重复 digest 幂等/
 * 每篇上限 24 拒）；资产原子写（落盘字节一致——验收锚）；failExtraction 终态；
 * removePaperAssets 硬删+幂等。always-active（不经 guardedDescribe）。
 */
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { SqliteDb } from '../../../src/main/db/connection'
import { createRepos } from '../../../src/main/db/repos'
import { DomainError } from '../../../src/main/services/shared/domain-error'
import { createFigureStoreService } from '../../../src/main/services/figure-store.service'
import { createFileStore } from '../../../src/main/services/import_/file-store'
import {
  FIGURE_IPC_MAX_BYTES,
  FIGURE_MAX_PER_PAPER
} from '../../../src/shared/constants'
import { createTestDb } from '../../utils/fixtures'

function sha(b: Uint8Array): string {
  return createHash('sha256').update(b).digest('hex')
}

function seedPaper(db: SqliteDb, id: string): void {
  db.prepare(
    `INSERT INTO papers (id, file_ref, sha256, title, abstract, authors_json, source, enrich_status,
     added_at, updated_at, folder_id) VALUES (?, ?, ?, ?, '摘要', '[]', 'manual', 'manual', 't0', 't0', '__main__')`
  ).run(id, `f/${id}.pdf`, `sha-${id}`, `题-${id}`)
}

function asset(digest: string, bytes: Uint8Array) {
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

/** PNG 魔数（89 50 4E 47 0D 0A 1A 0A）——storeFigure PNG-only 守卫的夹具底座
 *  〔回炉①B-1〕：一切合法路径字节以魔数为前缀 */
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

function bytesOf(n: number): Uint8Array {
  return new Uint8Array([...PNG_MAGIC, n])
}

let root: string
let db: SqliteDb
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'figstore-'))
  db = createTestDb()
})
afterEach(async () => {
  db.close()
  await rm(root, { recursive: true, force: true })
})

function makeService() {
  const repos = createRepos(db)
  const fileStore = createFileStore(root)
  return createFigureStoreService({ repos, fileStore })
}

describe('F-VISFB-42 figure-store 提取会话生命周期', () => {
  it('begin→store×2→complete：ready+excess+failedCount 落账（failed≠empty 可区分）', async () => {
    seedPaper(db, 'p-1')
    const svc = makeService()
    svc.beginExtraction('p-1')
    expect(svc.getJob('p-1')?.status).toBe('pending')
    const b1 = bytesOf(1)
    const b2 = bytesOf(2)
    const r1 = await svc.storeFigure('p-1', asset(sha(b1), b1))
    const r2 = await svc.storeFigure('p-1', asset(sha(b2), b2))
    expect(r1.fileRef).toBe(`figures/p-1/${sha(b1)}.png`)
    expect(r2.fileRef).toBe(`figures/p-1/${sha(b2)}.png`)
    svc.completeExtraction('p-1', { excess: 3, failedCount: 1 })
    const job = svc.getJob('p-1')
    expect(job?.status).toBe('ready')
    expect(job?.excess).toBe(3)
    expect(job?.failedCount).toBe(1)
    expect(svc.listFigures('p-1')).toHaveLength(2)
  })

  it('重提取：complete 后再 begin→旧行清空+job 回 pending', async () => {
    seedPaper(db, 'p-1')
    const svc = makeService()
    svc.beginExtraction('p-1')
    const b1 = bytesOf(1)
    await svc.storeFigure('p-1', asset(sha(b1), b1))
    svc.completeExtraction('p-1', { excess: 0, failedCount: 0 })
    svc.beginExtraction('p-1')
    expect(svc.getJob('p-1')?.status).toBe('pending')
    expect(svc.listFigures('p-1')).toEqual([])
  })

  it('failExtraction：整批失败终态（与零资产 ready 区分——job 行在场）', async () => {
    seedPaper(db, 'p-1')
    const svc = makeService()
    svc.beginExtraction('p-1')
    svc.failExtraction('p-1')
    const job = svc.getJob('p-1')
    expect(job?.status).toBe('failed')
    expect(svc.listFigures('p-1')).toEqual([])
  })

  it('资产原子写验收锚：落盘字节与输入逐字节一致', async () => {
    seedPaper(db, 'p-1')
    const svc = makeService()
    svc.beginExtraction('p-1')
    const bytes = new Uint8Array([...PNG_MAGIC, ...new Array<number>(2040).fill(7)])
    const r = await svc.storeFigure('p-1', asset(sha(bytes), bytes))
    const onDisk = new Uint8Array(await readFile(join(root, r.fileRef)))
    expect(onDisk).toEqual(bytes)
  })
})

describe('F-VISFB-42 figure-store storeFigure 守卫族', () => {
  it('digest 完整性：bytes 与 digest 不符→INVALID_REQUEST', async () => {
    seedPaper(db, 'p-1')
    const svc = makeService()
    svc.beginExtraction('p-1')
    const b1 = bytesOf(1)
    const lie = sha(bytesOf(2))
    await expect(svc.storeFigure('p-1', asset(lie, b1))).rejects.toMatchObject({
      code: 'INVALID_REQUEST'
    })
    expect(() => sha(b1)).not.toThrow()
  })

  it('IPC 单笔上限：4MB+1 拒（INVALID_REQUEST，常量单源驱动）', async () => {
    seedPaper(db, 'p-1')
    const svc = makeService()
    svc.beginExtraction('p-1')
    const big = new Uint8Array(FIGURE_IPC_MAX_BYTES + 1)
    big.set(PNG_MAGIC, 0)
    await expect(svc.storeFigure('p-1', asset(sha(big), big))).rejects.toMatchObject({
      code: 'INVALID_REQUEST'
    })
    expect(FIGURE_IPC_MAX_BYTES).toBe(4 * 1024 * 1024)
  })

  it('PNG 魔数校验〔回炉①B-1〕：非 PNG 字节拒（digest 按真实字节算过 digest 支后撞魔数支）', async () => {
    seedPaper(db, 'p-1')
    const svc = makeService()
    svc.beginExtraction('p-1')
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46])
    await expect(svc.storeFigure('p-1', asset(sha(jpeg), jpeg))).rejects.toMatchObject({
      code: 'INVALID_REQUEST'
    })
    const tiny = new Uint8Array([0x89, 0x50, 0x4e])
    await expect(svc.storeFigure('p-1', asset(sha(tiny), tiny))).rejects.toMatchObject({
      code: 'INVALID_REQUEST'
    })
    expect(svc.listFigures('p-1')).toEqual([])
  })

  it('paper 缺席→NOT_FOUND（FK 前置校验——begin 同步抛/store 异步拒）', async () => {
    const svc = makeService()
    const b1 = bytesOf(1)
    let syncCode: string | undefined
    try {
      svc.beginExtraction('ghost')
    } catch (e) {
      syncCode = (e as DomainError).code
    }
    expect(syncCode).toBe('NOT_FOUND')
    await expect(svc.storeFigure('ghost', asset(sha(b1), b1))).rejects.toMatchObject({
      code: 'NOT_FOUND'
    })
  })

  it('重复 digest 幂等：同 figureId 复用+不重复计数', async () => {
    seedPaper(db, 'p-1')
    const svc = makeService()
    svc.beginExtraction('p-1')
    const b1 = bytesOf(1)
    const r1 = await svc.storeFigure('p-1', asset(sha(b1), b1))
    const r2 = await svc.storeFigure('p-1', asset(sha(b1), b1))
    expect(r2.figureId).toBe(r1.figureId)
    expect(svc.listFigures('p-1')).toHaveLength(1)
  })

  it('每篇上限 24：第 25 资产拒（INVALID_REQUEST——渲染端截断契约的服务端防线）', async () => {
    seedPaper(db, 'p-1')
    const svc = makeService()
    svc.beginExtraction('p-1')
    for (let i = 0; i < FIGURE_MAX_PER_PAPER; i++) {
      const b = bytesOf(i + 1)
      await svc.storeFigure('p-1', asset(sha(b), b))
    }
    expect(svc.listFigures('p-1')).toHaveLength(FIGURE_MAX_PER_PAPER)
    const over = bytesOf(255)
    await expect(svc.storeFigure('p-1', asset(sha(over), over))).rejects.toMatchObject({
      code: 'INVALID_REQUEST'
    })
    expect(FIGURE_MAX_PER_PAPER).toBe(24)
  })
})

describe('F-VISFB-42 figure-store 删除链与读面', () => {
  it('removePaperAssets：目录硬删+幂等', async () => {
    seedPaper(db, 'p-1')
    const svc = makeService()
    svc.beginExtraction('p-1')
    const b1 = bytesOf(1)
    await svc.storeFigure('p-1', asset(sha(b1), b1))
    await svc.removePaperAssets('p-1')
    await expect(stat(join(root, 'figures', 'p-1'))).rejects.toThrow()
    await expect(svc.removePaperAssets('p-1')).resolves.toBeUndefined()
  })

  it('figureFileRef：协议查表读法（命中/错 paperId/缺席）', async () => {
    seedPaper(db, 'p-1')
    seedPaper(db, 'p-2')
    const svc = makeService()
    svc.beginExtraction('p-1')
    const b1 = bytesOf(1)
    const r = await svc.storeFigure('p-1', asset(sha(b1), b1))
    expect(svc.figureFileRef('p-1', r.figureId)).toBe(r.fileRef)
    expect(svc.figureFileRef('p-2', r.figureId)).toBeNull()
    expect(svc.figureFileRef('p-1', 'fig-none')).toBeNull()
  })

  it('DomainError 载体：守卫错误为服务层域错误', async () => {
    seedPaper(db, 'p-1')
    const svc = makeService()
    svc.beginExtraction('p-1')
    const b1 = bytesOf(1)
    const lie = sha(bytesOf(2))
    const err = await svc.storeFigure('p-1', asset(lie, b1)).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(DomainError)
  })
})
