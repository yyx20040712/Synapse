/**
 * [W-G1/3.45 攻坚票·方向①] 多行 fixture 判别探针——候选 c「中间轮 resolved」
 * 激活实验（六波场）。已证事实（f-r2e-investigation §4）：单 span fixture 的
 * resolve 链恰一次跳变（fallback→resolved，两态差 4.44/4.97），中间轮不存在；
 * 3.45 与两已知机制数值均不等 → 候选 c（多 span 逐个入 DOM 的 rAF 合并 resolve
 * 中间轮——部分 DOM 下 fallbackBands 只量测在场 span，band 部分适配可产出
 * 中间几何值，annotation-resolve.ts:224 bandsNearRects）待多行判别。
 * 复刻 reader-text.spec F-A1 多行用例位形（同 fixture/同程序化跨 3 行选区/
 * 同高亮链——:775 起），叠加仪表：
 *   - 双记录器（scroll 事件驱动全容器 + rect MutationObserver 逐轮记全部
 *     rect 的 y/h/style 与 spanCount——中间轮判别记录器）
 *   - 原子对照（单 evaluate 同帧取全部 rect 盒/canvas/各行 span 盒/scroller）
 *   - 撕裂面保留（首 rect.boundingBox 与 canvas.boundingBox 两次独立跨进程
 *     调用——与 z-r2e-probe 同款撕裂可达路径，复现捕捉面）
 *   - 两程 rel 指纹（pass1=划选高亮后 / pass2=重开后；per-rect 按 y 序配对）
 * 参数（env）：PROBE_THROTTLE=CPU 节流倍率（默认 1；t4/t8=拉伸渲染窗=
 * span 跨帧落地概率放大——候选 c 的激活杠杆）
 * 输出：scripts/audits/w-g1-out/probe-ml-t<throttle>-<ts>.json（断言前落盘，
 * 红跑也有数据）。断言=rel 容差 ≤2（每 rect 对 + 首矩形撕裂面）。
 * 判别口径：mutLog 轮际 y/h 差族（中间轮→终态/轮→轮）含 |diff|∈[2.95,3.95]
 * （3.45±0.5）即候选 c 高度锚定；无中间轮或差值族不含 → 本 fixture 族证伪。
 */
import { test, expect, type ElectronApplication, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { createMultiLinePdf, PDF_MULTILINE_TEXT } from '../utils/pdf-factory'
import { bootstrapMigrations, launch, seedPaperRow } from './e2e-env'
import { isTicketDone } from '../../tickets/registry'

const DEPS = ['SR-RDR-02', 'SR-LIB-01', 'SR-LIB-02', 'SR-RDR-04', 'SR-RDR-05', 'SR-RDR-06', 'SR2-F-02'] as const
const THROTTLE = Number(process.env.PROBE_THROTTLE ?? '1')
const OUT_DIR = process.env.PROBE_OUT ?? 'scripts/audits/w-g1-out'

/** 同帧快照：全部 rect 盒（y 升序）+canvas+各行 span+scrollY（撕裂免疫对照组） */
interface Atom {
  rects: Array<{ y: number; h: number; w: number; x: number }>
  cx: number | null; cy: number | null; ch: number | null
  spanY: Array<number | null>
  scrollY: number | null
  t: number
}

function skipIfPending(deps: readonly string[]): void {
  const pending = deps.filter((d) => !isTicketDone(d))
  test.skip(pending.length > 0, `延期：依赖工单未完成 [${pending.join(', ')}]`)
}

async function atomSample(win: Page): Promise<Atom> {
  return win.evaluate((rows: readonly string[]) => {
    const r2 = (v: number): number => Math.round(v * 100) / 100
    const rects = Array.from(document.querySelectorAll('[data-testid="annotation-rect"]'))
      .map((el) => el.getBoundingClientRect())
      .map((b) => ({ x: r2(b.x), y: r2(b.y), w: r2(b.width), h: r2(b.height) }))
      .sort((a, b) => a.y - b.y)
    const canvas = document.querySelector('canvas[data-pdf-canvas]')?.getBoundingClientRect() ?? null
    const spanY = rows.map((txt) => {
      const el = Array.from(document.querySelectorAll('.textLayer span'))
        .find((s) => (s.textContent ?? '').includes(txt))
      return el === undefined ? null : r2(el.getBoundingClientRect().y)
    })
    const col = document.querySelector('[data-page-column="ready"]')
    const scroller = col?.closest('.overflow-auto') as HTMLElement | null
    return {
      rects,
      cx: canvas === null ? null : r2(canvas.x),
      cy: canvas === null ? null : r2(canvas.y),
      ch: canvas === null ? null : r2(canvas.height),
      spanY,
      scrollY: scroller === null ? null : r2(scroller.scrollTop),
      t: performance.now()
    }
  }, PDF_MULTILINE_TEXT)
}

/** 程序化跨 3 行选区（照抄 F-A1 用例 :783——行1首字符→行3末字符+selectionchange） */
async function selectAcrossRows(win: Page): Promise<void> {
  await win.evaluate(() => {
    const spans = Array.from(document.querySelectorAll('.textLayer span'))
    const rows = spans.filter((s) => (s.textContent ?? '').startsWith('MULTILINE'))
    if (rows.length < 2) {
      throw new Error(`多行 span 不足: ${rows.length}`)
    }
    const first = rows[0]!.firstChild!
    const last = rows[rows.length - 1]!.firstChild!
    const range = document.createRange()
    range.setStart(first, 0)
    range.setEnd(last, (last.textContent ?? '').length)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
    document.dispatchEvent(new Event('selectionchange'))
  })
}

/** CPU 节流（span 跨帧落地概率放大——候选 c 激活杠杆） */
async function throttle(app: ElectronApplication, win: Page, rate: number): Promise<boolean> {
  if (rate <= 1) return false
  try {
    const session = await app.context().newCDPSession(win)
    await session.send('Emulation.setCPUThrottlingRate', { rate })
    return true
  } catch {
    return false
  }
}

/** 逐轮全 rect 生命周期记录器（中间轮判别——每次 rect 插入/style 变化记全部
 * rect 的 y/h/style+在场 span 数；部分 DOM 轮与几何的相关性同录） */
interface MutRound { t: number; tag: string; spanCount: number; rects: Array<{ y: number; h: number; style: string | null }> }

function startMutLog(win: Page): Promise<void> {
  return win.evaluate(() => {
    const w = window as unknown as { __wg1MutLog?: MutRound[]; __wg1Obs?: MutationObserver }
    type MutRound = { t: number; tag: string; spanCount: number; rects: Array<{ y: number; h: number; style: string | null }> }
    w.__wg1MutLog = []
    const rec = (tag: string): void => {
      const all = Array.from(document.querySelectorAll('[data-testid="annotation-rect"]'))
      w.__wg1MutLog?.push({
        t: Math.round(performance.now()),
        tag,
        spanCount: document.querySelectorAll('.textLayer span').length,
        rects: all.map((el) => {
          const b = el.getBoundingClientRect()
          return {
            y: Math.round(b.y * 100) / 100,
            h: Math.round(b.height * 100) / 100,
            style: el.getAttribute('style')
          }
        })
      })
    }
    const isRectish = (n: Node): boolean =>
      n instanceof HTMLElement && (n.dataset.testid === 'annotation-rect' || n.querySelector('[data-testid="annotation-rect"]') !== null)
    const obs = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === 'childList') {
          for (const n of Array.from(m.addedNodes)) {
            if (isRectish(n)) rec('rect-added')
          }
        } else if (m.target instanceof HTMLElement && m.target.dataset.testid === 'annotation-rect') {
          rec('rect-style')
        }
      }
    })
    obs.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['style'] })
    w.__wg1Obs = obs
  })
}

function collectMutLog(win: Page): Promise<MutRound[]> {
  return win.evaluate(() => {
    const w = window as unknown as { __wg1MutLog?: MutRound[]; __wg1Obs?: MutationObserver }
    type MutRound = { t: number; tag: string; spanCount: number; rects: Array<{ y: number; h: number; style: string | null }> }
    w.__wg1Obs?.disconnect()
    const log = w.__wg1MutLog ?? []
    w.__wg1MutLog = []
    return log
  })
}

/** 滚动事件驱动记录器（z-r2e-probe 同款——落帧/anchoring 判别） */
interface ScrollLogPoint { t: number; tag: string; y: number | null; ch: number | null; sh: number | null }

function startScrollLog(win: Page): Promise<void> {
  return win.evaluate(() => {
    const w = window as unknown as {
      __wg1Scroll?: ScrollLogPoint[]
      __wg1ScrollStop?: boolean
      __wg1ScrollHandler?: (e: Event) => void
      __wg1ScrollTimer?: ReturnType<typeof setInterval>
    }
    type ScrollLogPoint = { t: number; tag: string; y: number | null; ch: number | null; sh: number | null }
    w.__wg1Scroll = []
    w.__wg1ScrollStop = false
    const rec = (tag: string): void => {
      const col = document.querySelector('[data-page-column="ready"]')
      const sc = col === null ? null : col.closest('.overflow-auto') as HTMLElement | null
      w.__wg1Scroll?.push({
        t: Math.round(performance.now()),
        tag,
        y: sc === null ? null : Math.round(sc.scrollTop * 100) / 100,
        ch: sc === null ? null : sc.clientHeight,
        sh: sc === null ? null : sc.scrollHeight
      })
    }
    w.__wg1ScrollHandler = (e: Event): void => {
      if (e.target instanceof HTMLElement && e.target.closest('.overflow-auto') !== null) rec('scroll')
    }
    window.addEventListener('scroll', w.__wg1ScrollHandler, true)
    rec('init')
    w.__wg1ScrollTimer = setInterval(() => {
      if (w.__wg1ScrollStop !== true) rec('tick')
    }, 500)
  })
}

function collectScrollLog(win: Page): Promise<ScrollLogPoint[]> {
  return win.evaluate(() => {
    const w = window as unknown as {
      __wg1Scroll?: ScrollLogPoint[]
      __wg1ScrollStop?: boolean
      __wg1ScrollHandler?: (e: Event) => void
      __wg1ScrollTimer?: ReturnType<typeof setInterval>
    } & Window
    type ScrollLogPoint = { t: number; tag: string; y: number | null; ch: number | null; sh: number | null }
    const log = w.__wg1Scroll ?? []
    w.__wg1ScrollStop = true
    if (w.__wg1ScrollHandler !== undefined) window.removeEventListener('scroll', w.__wg1ScrollHandler, true)
    if (w.__wg1ScrollTimer !== undefined) clearInterval(w.__wg1ScrollTimer)
    w.__wg1Scroll = []
    return log
  })
}

test('W-G1 多行判别探针：跨 3 行划选高亮重开原位——中间轮指纹', async () => {
  test.setTimeout(120_000)
  skipIfPending(DEPS)
  const title = '智慧水务 e2e 多行判别探针文献 W-G1'
  const bytes = createMultiLinePdf()
  const userData = await mkdtemp(join(tmpdir(), 'synapse-wg1-'))
  // 第一跳：应用自建库迁移（e2e-env.ts 单源——W1C 收敛）
  await bootstrapMigrations(userData)
  const sha = createHash('sha256').update(bytes).digest('hex')
  const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
  mkdirSync(dirname(join(userData, 'files', ...fileRef.split('/'))), { recursive: true })
  writeFileSync(join(userData, 'files', ...fileRef.split('/')), bytes)
  await seedPaperRow(userData, fileRef, sha, title)

  // 第一程：跨行划选 → 高亮 → 撕裂面两测（首 rect+canvas 独立调用）→ 原子快照
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  const th1 = await throttle(app, win, THROTTLE)
  await win.getByText(title).first().dblclick()
  await expect(win.getByText(PDF_MULTILINE_TEXT[0]).first()).toBeVisible({ timeout: 20_000 })
  await selectAcrossRows(win)
  await expect(win.getByTestId('selection-toolbar')).toBeVisible()
  await startMutLog(win)
  await win.getByRole('button', { name: '高亮' }).click()
  const rects1 = win.getByTestId('annotation-rect')
  await expect(rects1.first()).toBeVisible()
  await expect(rects1).toHaveCount(3)
  const box1 = await rects1.first().boundingBox()
  const page1 = await win.locator('canvas[data-pdf-canvas]').boundingBox()
  const a1 = await atomSample(win)
  const mut1 = await collectMutLog(win)
  await app.close()

  // 第二程：重开 → 记录器先行（覆盖加载/恢复链/测量全程）→ 同门同测
  const app2 = await launch(userData)
  const win2 = await app2.firstWindow()
  await expect(win2.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  const th2 = await throttle(app2, win2, THROTTLE)
  await startScrollLog(win2)
  await startMutLog(win2)
  await win2.getByText(title).first().dblclick()
  await expect(win2.getByText(PDF_MULTILINE_TEXT[0]).first()).toBeVisible({ timeout: 20_000 })
  const rects2 = win2.getByTestId('annotation-rect')
  await expect(rects2.first()).toBeVisible({ timeout: 10_000 })
  await expect(rects2).toHaveCount(3)
  await expect(win2.getByTestId('annotation-layer')).toHaveCSS('mix-blend-mode', 'normal')
  const box2 = await rects2.first().boundingBox()
  const page2 = await win2.locator('canvas[data-pdf-canvas]').boundingBox()
  const a2 = await atomSample(win2)
  const scroll2 = await collectScrollLog(win2)
  const mut2 = await collectMutLog(win2)

  // —— 指纹与判别量（全部先落盘再断言——红跑也有数据）——
  expect(box1).not.toBeNull()
  expect(box2).not.toBeNull()
  expect(page1).not.toBeNull()
  expect(page2).not.toBeNull()
  const tearDy = (box2!.y - page2!.y) - (box1!.y - page1!.y)
  const pairDiffs = a1.rects.map((r, i): { i: number; dy: number; dh: number; dw: number } | null => {
    const r2 = a2.rects[i]
    if (r2 === undefined) return null
    return {
      i,
      dy: Math.round((r2.y - a2.cy! - (r.y - a1.cy!)) * 100) / 100,
      dh: Math.round((r2.h - r.h) * 100) / 100,
      dw: Math.round((r2.w - r.w) * 100) / 100
    }
  })
  /** 轮际差族：每程 mutLog 相邻轮同位 rect 的 y/h 差（中间轮判别核心） */
  const roundDiffs = (log: MutRound[]): Array<{ from: number; to: number; i: number; dy: number; dh: number; spanFrom: number; spanTo: number }> => {
    const out: Array<{ from: number; to: number; i: number; dy: number; dh: number; spanFrom: number; spanTo: number }> = []
    for (let k = 1; k < log.length; k++) {
      const prev = log[k - 1]!
      const cur = log[k]!
      for (let i = 0; i < Math.min(prev.rects.length, cur.rects.length); i++) {
        out.push({
          from: k - 1, to: k, i,
          dy: Math.round((cur.rects[i]!.y - prev.rects[i]!.y) * 100) / 100,
          dh: Math.round((cur.rects[i]!.h - prev.rects[i]!.h) * 100) / 100,
          spanFrom: prev.spanCount, spanTo: cur.spanCount
        })
      }
    }
    return out
  }
  const rounds1 = roundDiffs(mut1).map((d) => ({ ...d, pass: 1 }))
  const rounds2 = roundDiffs(mut2).map((d) => ({ ...d, pass: 2 }))
  // 3.45 锚定窗（±0.5）扫描：轮际差族+两程 per-rect diff+撕裂面（统一最小形状）
  const scanBase: Array<{ pass: number; i: number; dy: number; dh: number }> = [
    { pass: 4, i: -1, dy: tearDy, dh: 0 },
    ...rounds1.map((d) => ({ pass: d.pass, i: d.i, dy: d.dy, dh: d.dh })),
    ...rounds2.map((d) => ({ pass: d.pass, i: d.i, dy: d.dy, dh: d.dh })),
    ...pairDiffs.filter((d): d is NonNullable<typeof d> => d !== null).map((d) => ({ pass: 3, i: d.i, dy: d.dy, dh: d.dh }))
  ]
  const near345 = scanBase.filter((d) => Math.abs(Math.abs(d.dy) - 3.45) <= 0.5 || Math.abs(Math.abs(d.dh) - 3.45) <= 0.5)
  const payload = {
    meta: {
      ts: new Date().toISOString(), pid: process.pid, throttle: THROTTLE,
      throttleApplied: [th1, th2], title, tearDy,
      rectCount1: a1.rects.length, rectCount2: a2.rects.length
    },
    pass1: { tearPair: { box: box1, page: page1 }, atom: a1, mutLog: mut1 },
    pass2: { tearPair: { box: box2, page: page2 }, atom: a2, mutLog: mut2, scrollLog: scroll2 },
    pairDiffs, rounds1, rounds2, near345
  }
  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(join(OUT_DIR, `probe-ml-t${THROTTLE}-${Date.now()}.json`), JSON.stringify(payload, null, 2))

  // 断言（复现捕捉面——数据已先落盘）：撕裂面+原子面 per-rect 容差 ≤2
  expect(Math.abs(tearDy)).toBeLessThanOrEqual(2)
  for (const d of pairDiffs) {
    if (d === null) continue
    expect(Math.abs(d.dy), `rect[${d.i}] dy`).toBeLessThanOrEqual(2)
    expect(Math.abs(d.dh), `rect[${d.i}] dh`).toBeLessThanOrEqual(2)
  }
  await app2.close()
})
