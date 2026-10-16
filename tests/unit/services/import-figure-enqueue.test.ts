/**
 * [F-VISFB-43 U6] import→figures 建单挂点单测（onImported 可选依赖：imported>0
 * 才触发、载荷=新入库 id 集；全重复/全失败零建单）。生产接线=services/index
 * （figureTasks.enqueue 幂等建 pending 单——U4 已锁）。always-active。
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { createTestDb } from '../../utils/fixtures'
import { createTinyPdf } from '../../utils/pdf-factory'
import { createRepos } from '../../../src/main/db/repos'
import { createFileStore } from '../../../src/main/services/import_/file-store'
import { createImportService } from '../../../src/main/services/import_/import.service'

const TARGET_FOLDER = '__main__'
const dirs: string[] = []

afterAll(async () => {
  for (const d of dirs) await rm(d, { recursive: true, force: true })
})

function makeSvc(db: ReturnType<typeof createTestDb>, onImported: (ids: string[]) => void) {
  return createImportService({
    repos: createRepos(db),
    fileStore: createFileStore(join(dirs[dirs.length - 1] ?? tmpdir(), 'managed')),
    gate: { enter() {}, exit() {} },
    extractMeta: async () => ({ title: '', authors: [], year: 2026, doi: null, arxivId: null }),
    onImported
  })
}

async function seedPdf(name: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'figimp-'))
  dirs.push(dir)
  const src = join(dir, name)
  await writeFile(src, createTinyPdf())
  return src
}

describe('[F-VISFB-43 U6] import→figures 建单挂点', () => {
  it('importFiles 新入库 1 篇→onImported 恰一次且载荷=[新 id]', async () => {
    const db = createTestDb()
    const src = await seedPdf('甲.pdf')
    const onImported = vi.fn()
    const result = await makeSvc(db, onImported).importFiles([src], TARGET_FOLDER)
    expect(result.imported).toHaveLength(1)
    expect(onImported).toHaveBeenCalledTimes(1)
    expect(onImported).toHaveBeenCalledWith([result.imported[0]?.id])
  })

  it('同文件二次导入（全重复）→onImported 零调用', async () => {
    const db = createTestDb()
    const src = await seedPdf('乙.pdf')
    const onImported = vi.fn()
    const svc = makeSvc(db, onImported)
    await svc.importFiles([src], TARGET_FOLDER)
    onImported.mockClear()
    const second = await svc.importFiles([src], TARGET_FOLDER)
    expect(second.duplicates).toHaveLength(1)
    expect(onImported).not.toHaveBeenCalled()
  })

  it('importFolder 根目录 1 篇新件→onImported 恰一次（文件夹路径同挂点）', async () => {
    const db = createTestDb()
    const src = await seedPdf('丙.pdf')
    const onImported = vi.fn()
    const result = await makeSvc(db, onImported).importFolder(join(src, '..'), TARGET_FOLDER)
    expect(result.imported).toHaveLength(1)
    expect(onImported).toHaveBeenCalledTimes(1)
    expect(onImported).toHaveBeenCalledWith([result.imported[0]?.id])
  })
})
