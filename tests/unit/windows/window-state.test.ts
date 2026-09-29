import { readFileSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it } from 'vitest'
import {
  boundsToPersist,
  clampBounds,
  DEFAULT_BOUNDS,
  loadBounds,
  saveBounds
} from '../../../src/main/windows/window-state'

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

  it('F-LIBUI-01 workArea 原点钳制：任务栏在左/上（workArea.x/y≠0）——x/y 下限取原点', () => {
    expect(clampBounds({ x: 0, y: 0, width: 800, height: 600 }, { x: 60, y: 40, width: 1860, height: 1040 })).toEqual({
      x: 60,
      y: 40,
      width: 800,
      height: 600
    })
  })

  it('F-LIBUI-01 底边沉任务栏：y+height 超 workArea 底缘拉回（bootstrap 接线契约——y=workArea.height-height）', () => {
    expect(clampBounds({ x: 10, y: 300, width: 1280, height: 800 }, { x: 0, y: 0, width: 1920, height: 1032 })).toEqual({
      x: 10,
      y: 232,
      width: 1280,
      height: 800
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

describe('F-G3 boundsToPersist —— maximized 态关窗持久化取 normal bounds', () => {
  it('maximized：getBounds 是最大化尺寸，持久化取 getNormalBounds（下次启动恢复还原态而非大窗非最大化）', () => {
    const win = {
      getBounds: () => ({ x: 0, y: 0, width: 1920, height: 1040 }),
      getNormalBounds: () => ({ x: 120, y: 60, width: 1280, height: 800 })
    }
    expect(boundsToPersist(win)).toEqual({ x: 120, y: 60, width: 1280, height: 800 })
  })

  it('常态：getNormalBounds 与 getBounds 等值——非最大化路径行为零变旁证', () => {
    const b = { x: 10, y: 20, width: 800, height: 600 }
    const win = { getBounds: () => ({ ...b }), getNormalBounds: () => ({ ...b }) }
    expect(boundsToPersist(win)).toEqual({ x: 10, y: 20, width: 800, height: 600 })
  })
})

describe('F-LIBUI-01 ⑦ 接线锚——bootstrap 窗口创建经 clampBounds 全维钳制（源文本锚）', () => {
  // 门一 k1-W1 回炉：clampBounds 纯函数有单测、接线层无锚——接线若被
  // 还原（x/y 原样透传），既有测试面恒绿（底边沉任务栏回归不可见）。
  // 源文本锚锁接线行（theme.test 读 CSS 同模式）；变异 M-C=接线还原
  // →本锚红（回炉 R1 实录，输出在档 scripts-audits/F-LIBUI-01/）
  const bootstrapSrc = readFileSync(
    fileURLToPath(new URL('../../../src/main/bootstrap.ts', import.meta.url)),
    'utf-8'
  )

  it('createMainWindow 前经 clampBounds(bounds, workArea)——x/y+宽高全维钳制行在场', () => {
    expect(bootstrapSrc, '接线行（底边沉任务栏根因修复）被移除或改形').toContain(
      'const clamped = clampBounds(bounds, workArea)'
    )
  })

  it('消费面锁：createMainWindow 传参取 clamped 四键——半还原形态（计算行保留/传参回退 bounds）恒绿缝隙闭合（复审 k1-W2/d1-W1）', () => {
    expect(bootstrapSrc, '传参回退 bounds.x=⑦ 半还原形态').toContain('x: clamped.x')
    expect(bootstrapSrc, '传参回退 bounds.y=⑦ 半还原形态').toContain('y: clamped.y')
  })
})
