import { mkdtemp, mkdir, readFile, readdir, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { atomicWriteFile } from '../../../../src/main/services/shared/atomic-write'

/**
 * [F-DEDUP-01] services/shared/atomic-write 直接单测——原子写单源契约。
 * 收敛前 4 处 tmp+rename 副本（file-store copyOrWrite / ai-sensor writeAtomic /
 * workspace.fs atomicWrite / ipc settings atomicWrite）。本件锁定共用行为：
 * string/bytes 双形态、tmp 不残留、ensureDir 深目录、uniqueTmp 并发互不覆盖、
 * cleanOnFail 失败清理。失败注入沿用 corpus.export.test 的「目录占位」确定性
 * 手法（rename 到已存在目录必失败，Windows/Linux 双平台无 chmod 依赖）。
 * 新测试 always-active。
 */

const tempRoots: string[] = []
async function newDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'atomic-write-'))
  tempRoots.push(dir)
  return dir
}
afterAll(async () => {
  const fs = await import('node:fs/promises')
  for (const dir of tempRoots) await fs.rm(dir, { recursive: true, force: true })
})

/** 目录内 .tmp* 残留计数（终局断言的共用取数） */
async function tmpCount(dir: string): Promise<number> {
  const names = await readdir(dir)
  return names.filter((n) => n.includes('.tmp')).length
}

describe('services/shared/atomic-write —— 原子写单源', () => {
  it('string 形态：UTF-8 落盘内容一致（中文无损坏）', async () => {
    const dir = await newDir()
    const target = join(dir, 'a.txt')
    await atomicWriteFile(target, '设置内容：中文\n')
    expect(await readFile(target, 'utf8')).toBe('设置内容：中文\n')
  })

  it('bytes 形态：Uint8Array 直写（不被字符串化）', async () => {
    const dir = await newDir()
    const target = join(dir, 'b.bin')
    const bytes = new Uint8Array([0, 137, 80, 68, 70, 45, 49, 255])
    await atomicWriteFile(target, bytes)
    const back = new Uint8Array(await readFile(target))
    expect(Buffer.from(back).equals(Buffer.from(bytes))).toBe(true)
  })

  it('终名存在且默认 tmp 不残留（固定名 tmp 形态）', async () => {
    const dir = await newDir()
    const target = join(dir, 'c.json')
    await atomicWriteFile(target, '{}')
    expect((await stat(target)).isFile()).toBe(true)
    expect(await tmpCount(dir)).toBe(0)
  })

  it('ensureDir：深目录父链不存在时自动创建', async () => {
    const dir = await newDir()
    const target = join(dir, 'x', 'y', 'z', 'd.json')
    await atomicWriteFile(target, 'deep', { ensureDir: true })
    expect(await readFile(target, 'utf8')).toBe('deep')
  })

  it('ensureDir 缺省不开：深目录缺父链时失败（旧 workspace.fs/settings 裸调语义）', async () => {
    const dir = await newDir()
    const target = join(dir, 'no', 'such', 'dir', 'e.json')
    await expect(atomicWriteFile(target, 'x')).rejects.toThrow()
  })

  it('uniqueTmp：并发双写同一路径互不覆盖——终名完整内容其一且 tmp 零残留', async () => {
    const dir = await newDir()
    const target = join(dir, 'f.bin')
    const first = new Uint8Array(2048).fill(1)
    const second = new Uint8Array(2048).fill(2)
    // allSettled 口径：Windows 对「同目标并发替换」可瞬态拒绝后到者的 rename
    //（平台竞态非本模块契约）；单源要保的是各写手 tmp 独立——终名永远是一方
    // 的完整字节，绝不出现两写手共享 tmp 的字节交错半文件
    const outcomes = await Promise.allSettled([
      atomicWriteFile(target, first, { uniqueTmp: true, cleanOnFail: true }),
      atomicWriteFile(target, second, { uniqueTmp: true, cleanOnFail: true })
    ])
    expect(outcomes.some((o) => o.status === 'fulfilled')).toBe(true)
    const back = new Uint8Array(await readFile(target))
    expect(back.byteLength).toBe(2048)
    const allFirst = back.every((b) => b === 1)
    const allSecond = back.every((b) => b === 2)
    expect(allFirst || allSecond).toBe(true)
    expect(await tmpCount(dir)).toBe(0)
  })

  it('cleanOnFail：写后 rename 失败（目录占位）时 tmp 被清除并上抛', async () => {
    const dir = await newDir()
    const target = join(dir, 'occupied')
    await mkdir(target)
    await expect(atomicWriteFile(target, 'x', { cleanOnFail: true })).rejects.toThrow()
    expect(await tmpCount(dir)).toBe(0)
  })

  it('cleanOnFail 缺省不开：失败后 tmp 残留（开关语义对照面）', async () => {
    const dir = await newDir()
    const target = join(dir, 'occupied2')
    await mkdir(target)
    await expect(atomicWriteFile(target, 'x')).rejects.toThrow()
    expect(await tmpCount(dir)).toBe(1)
  })
})
