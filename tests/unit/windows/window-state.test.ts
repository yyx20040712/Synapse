import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { clampBounds, DEFAULT_BOUNDS, loadBounds, saveBounds } from '../../../src/main/windows/window-state'

const dirs: string[] = []
async function tmpDir(): Promise<string> {
  const d = await mkdtemp(join(tmpdir(), 'win-state-'))
  dirs.push(d)
  return d
}
afterAll(async () => {
  for (const d of dirs) await rm(d, { recursive: true, force: true })
})

describe('windows/window-state —— 窗口位置记忆', () => {
  it('clampBounds：超大窗口夹到屏幕内', () => {
    expect(clampBounds({ width: 9999, height: 9999 }, { width: 1920, height: 1080 })).toEqual({
      x: undefined,
      y: undefined,
      width: 1920,
      height: 1080
    })
  })

  it('clampBounds：出屏坐标拉回，最小尺寸兜底', () => {
    expect(clampBounds({ x: 5000, y: -50, width: 100, height: 100 }, { width: 1920, height: 1080 })).toEqual({
      x: 1920 - 640,
      y: 0,
      width: 640,
      height: 480
    })
  })

  it('loadBounds：无文件返回默认；损坏 JSON 返回默认', async () => {
    const dir = await tmpDir()
    expect(await loadBounds(dir)).toEqual(DEFAULT_BOUNDS)
    await writeFile(join(dir, 'window-state.json'), '{oops', 'utf-8')
    expect(await loadBounds(dir)).toEqual(DEFAULT_BOUNDS)
  })

  it('save→load 往返一致；缺宽高的部分数据回退默认', async () => {
    const dir = await tmpDir()
    await saveBounds(dir, { x: 10, y: 20, width: 800, height: 600 })
    expect(await loadBounds(dir)).toEqual({ x: 10, y: 20, width: 800, height: 600 })
    await writeFile(join(dir, 'window-state.json'), JSON.stringify({ x: 1 }), 'utf-8')
    expect(await loadBounds(dir)).toEqual(DEFAULT_BOUNDS)
  })
})
