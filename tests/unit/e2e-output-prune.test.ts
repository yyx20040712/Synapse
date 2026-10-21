/**
 * [F-EVCTX-01] test-results/run-* 分 run 产物修剪纯逻辑单测（pruneRunDirs——
 * e2e 取证基建：error-context.md 失败指纹保号多轮保留的磁盘bound面；保留
 * mtime 最新 10 个=立案线「同用例 2 次记失败指纹」取证余量远超）。
 * 夹具=fs.mkdtemp 临时目录+异 mtime 假 run- 目录（utimes 注入）；期望值逐字面
 * 内联（keep=10 翻 9/11 即红——红证留档仓外 scripts-audits/20261021-evctx-detourw/）。
 * always-active 裸 describe（K3）。
 */
import { mkdtemp, mkdir, readdir, rm, utimes } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { pruneRunDirs, PRUNE_KEEP } from '../utils/e2e-output-prune'

/** 临时目录夹具（12 个假 run- 目录 mtime 递增——run-01 最旧……run-12 最新） */
const temps: string[] = []

async function makeFixture(count: number): Promise<{ dir: string; names: string[] }> {
  const dir = await mkdtemp(join(tmpdir(), 'evctx-prune-'))
  temps.push(dir)
  const names: string[] = []
  for (let i = 1; i <= count; i++) {
    const name = `run-${String(i).padStart(2, '0')}`
    const p = join(dir, name)
    await mkdir(p)
    // mtime 注入：i 号=2026-01-01T00:00:i Z 递增（序=mtime 序非字典序依赖）
    await utimes(p, new Date(`2026-01-01T00:00:${String(i).padStart(2, '0')}.000Z`), new Date(`2026-01-01T00:00:${String(i).padStart(2, '0')}.000Z`))
    names.push(name)
  }
  return { dir, names }
}

afterEach(async () => {
  for (const d of temps.splice(0)) await rm(d, { recursive: true, force: true })
})

describe('F-EVCTX-01 pruneRunDirs（run-* mtime 降序保留 keep=10，余者递归删除）', () => {
  it('12 个 run-* 目录 → 保留恰 10 个且为 mtime 最新者（run-03..run-12；run-01/run-02 删）', async () => {
    const { dir } = await makeFixture(12)
    await pruneRunDirs(dir, 10)
    const left = (await readdir(dir)).sort()
    expect(left).toEqual(['run-03', 'run-04', 'run-05', 'run-06', 'run-07', 'run-08', 'run-09', 'run-10', 'run-11', 'run-12'])
    expect(left).toHaveLength(10)
  })

  it('非 run- 前缀条目不动（other-dir/runX/file.txt 保留——只裁 run- 前缀目录）', async () => {
    const { dir } = await makeFixture(11)
    await mkdir(join(dir, 'other-dir'))
    await mkdir(join(dir, 'runX'))
    const { writeFile } = await import('node:fs/promises')
    await writeFile(join(dir, 'file.txt'), 'x')
    await pruneRunDirs(dir, 10)
    const left = (await readdir(dir)).sort()
    // run-01 删（11 个 run-* 裁最旧 1 个）；三个非 run- 前缀条目全留
    expect(left).toEqual(['file.txt', 'other-dir', 'run-02', 'run-03', 'run-04', 'run-05', 'run-06', 'run-07', 'run-08', 'run-09', 'run-10', 'run-11', 'runX'])
  })

  it('目录不存在 → 零抛出零删（e2e 首跑前 test-results/ 缺席态）', async () => {
    const ghost = join(tmpdir(), 'evctx-prune-nonexistent-dir')
    await expect(pruneRunDirs(ghost, 10)).resolves.toBeUndefined()
  })

  it('空目录/不足 keep → 零删（3 个 run-* 全留——keep=10 上界未达不裁）', async () => {
    const { dir } = await makeFixture(3)
    await pruneRunDirs(dir, 10)
    const left = (await readdir(dir)).sort()
    expect(left).toEqual(['run-01', 'run-02', 'run-03'])
  })

  // [RR1-3] PRUNE_KEEP 常量本体钉（设计决策锚——保留 10 依据=helper 头注手算；
  //  翻断言值 9/11 即红=常量悬空缺口闭合）
  it('[RR1-3] PRUNE_KEEP 常量本体钉：===10（保留 10 目录≈5 轮运行指纹——双 stamp 现象在档）', () => {
    expect(PRUNE_KEEP).toBe(10)
  })
})
