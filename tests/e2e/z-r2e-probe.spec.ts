/**
 * [F-R2e 排查票] 探针 spec——「划选高亮重开原位」序列敏感同值 3.45px（立案第 2 现）。
 * 复刻 reader-text.spec:163 用例位形（同 fixture/同交互/同断言序），叠加仪表：
 *   - 原路径测量保持原样（rect.boundingBox 与 canvas.boundingBox 两次独立调用，
 *     且在一切仪表采样之前——保证与原用例 t0 位形等价，仪表不给 resolve 留 settle 时间）
 *   - 原子对照（单 evaluate 同帧取 rect/canvas/textLayer-span/scroller——切分
 *     「测量撕裂」vs「真几何差」两大族）
 *   - rect 时间序列（原路径测完后连续采样——观测 resolve settle 前后几何跳变＝
 *     band 双态（resolved.bands vs fallbackBands，AnnotationLayer:209 双态表达式））
 *   - span 相对 canvas 的 y（rel_span）——切分「textLayer 整体位移」vs「band 口径差」
 * 参数（env）：PROBE_THROTTLE=CPU 节流倍率（默认 1）/PROBE_STABLE=1（稳定门对照组）/
 *   PROBE_INJECT（0=off；1=第二程两测间注入 scrollTop+=3.45；2=同位+37 随机档；
 *   3=第一程测完后注入+3.45——跨程 w/h/x 平移不变对照档）
 * 输出：scripts/audits/f-r2e-out/probe-i<inject>-t<throttle>-<ts>.json（断言前落盘，
 * 红跑也有数据）。注入档断言只记录不判红（红/绿是实验观察值）；其余档断言照抄
 * 原用例（复现即停信号）。
 * 探针面：不入锁清单（审计场惯例——raws/数据件留盘，收口时处置）；不动受锁 spec 本体。
 */
import { test, expect, type ElectronApplication, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { createTinyPdf, PDF_KNOWN_TEXT } from '../utils/pdf-factory'
import { launch, seedPaperRow } from './e2e-env'
import { isTicketDone } from '../../tickets/registry'

const DEPS = ['SR-RDR-02', 'SR-LIB-01', 'SR-LIB-02', 'SR-RDR-04', 'SR-RDR-05', 'SR-RDR-06', 'SR2-F-02'] as const
const THROTTLE = Number(process.env.PROBE_THROTTLE ?? '1')
const INJECT = Number(process.env.PROBE_INJECT ?? '0')
const STABLE = process.env.PROBE_STABLE === '1'
const OUT_DIR = process.env.PROBE_OUT ?? 'scripts/audits/f-r2e-out'

/** 同帧几何快照（evaluate 内单帧采全——撕裂观测的原子对照组） */
interface Atom {
  rx: number | null; ry: number | null; rw: number | null; rh: number | null
  cx: number | null; cy: number | null; cw: number | null; ch: number | null
  sy: number | null; sh: number | null
  scrollY: number | null
  t: number
}

function skipIfPending(deps: readonly string[]): void {
  const pending = deps.filter((d) => !isTicketDone(d))
  test.skip(pending.length > 0, `延期：依赖工单未完成 [${pending.join(', ')}]`)
}

async function atomSample(win: Page): Promise<Atom> {
  return win.evaluate((kt: string) => {
    const rect = document.querySelector('[data-testid="annotation-rect"]')?.getBoundingClientRect() ?? null
    const canvas = document.querySelector('canvas[data-pdf-canvas]')?.getBoundingClientRect() ?? null
    const span = Array.from(document.querySelectorAll('.textLayer span'))
      .find((s) => (s.textContent ?? '').includes(kt))?.getBoundingClientRect() ?? null
    const col = document.querySelector('[data-page-column="ready"]')
    const scroller = col?.closest('.overflow-auto') as HTMLElement | null
    return {
      rx: rect?.x ?? null, ry: rect?.y ?? null, rw: rect?.width ?? null, rh: rect?.height ?? null,
      cx: canvas?.x ?? null, cy: canvas?.y ?? null, cw: canvas?.width ?? null, ch: canvas?.height ?? null,
      sy: span?.y ?? null, sh: span?.height ?? null,
      scrollY: scroller?.scrollTop ?? null,
      t: performance.now()
    }
  }, PDF_KNOWN_TEXT)
}

/** 原路径测完后的时间序列（settle 跳变观测——不影响断言输入） */
async function series(win: Page, n: number, gapMs: number): Promise<Atom[]> {
  const out: Atom[] = []
  for (let i = 0; i < n; i++) {
    out.push(await atomSample(win))
    if (i < n - 1) await win.waitForTimeout(gapMs)
  }
  return out
}

/** CPU 节流（负载态复现杠杆——Emulation.setCPUThrottlingRate） */
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

/** 向页列滚动容器注入 scrollTop 增量（注入实验——撕裂族机制证明/证伪） */
function injectScroll(win: Page, delta: number): Promise<number | null> {
  return win.evaluate((d: number) => {
    const col = document.querySelector('[data-page-column="ready"]')
    const scroller = col?.closest('.overflow-auto') as HTMLElement | null
    if (scroller === null) return null
    scroller.scrollTop += d
    return scroller.scrollTop
  }, delta)
}

/** rect 生命周期记录器（band 双态判别——MutationObserver 观察 annotation-rect
 * 的 style 变化与插入，记录每次变化时点几何；fallback→resolved 跳变若存在
 * 则 y 差=两态恒差，与注入实验的滚动撕裂形成双机制判别） */
interface MutLogPoint { t: number; tag: string; y: number | null; h: number | null; style: string | null }

function startMutLog(win: Page): Promise<void> {
  return win.evaluate(() => {
    const w = window as unknown as { __r2eMutLog?: Array<{ t: number; tag: string; y: number | null; h: number | null; style: string | null }>; __r2eObs?: MutationObserver }
    w.__r2eMutLog = []
    const rec = (tag: string): void => {
      const r = document.querySelector('[data-testid="annotation-rect"]')
      const b = r === null ? null : r.getBoundingClientRect()
      w.__r2eMutLog?.push({
        t: Math.round(performance.now()),
        tag,
        y: b === null ? null : Math.round(b.y * 100) / 100,
        h: b === null ? null : Math.round(b.height * 100) / 100,
        style: r === null ? null : r.getAttribute('style')
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
    w.__r2eObs = obs
  })
}

function collectMutLog(win: Page): Promise<MutLogPoint[]> {
  return win.evaluate(() => {
    const w = window as unknown as { __r2eMutLog?: Array<{ t: number; tag: string; y: number | null; h: number | null; style: string | null }>; __r2eObs?: MutationObserver }
    w.__r2eObs?.disconnect()
    const log = w.__r2eMutLog ?? []
    w.__r2eMutLog = []
    return log
  })
}

/** 稳定门对照组（修法 b——双 rAF+scrollTop 双采样稳定后才测量） */
async function stableGate(win: Page): Promise<void> {
  await win.evaluate(() => new Promise<void>((res) => {
    requestAnimationFrame(() => requestAnimationFrame(() => res()))
  }))
  let prev = await win.evaluate(() => {
    const col = document.querySelector('[data-page-column="ready"]')
    const scroller = col?.closest('.overflow-auto') as HTMLElement | null
    return scroller?.scrollTop ?? -1
  })
  for (let i = 0; i < 5; i++) {
    await win.waitForTimeout(120)
    const cur = await win.evaluate(() => {
      const col = document.querySelector('[data-page-column="ready"]')
      const scroller = col?.closest('.overflow-auto') as HTMLElement | null
      return scroller?.scrollTop ?? -1
    })
    if (cur === prev) break
    prev = cur
  }
}


/** [z-r2e 立案修] 几何稳定门（INV-51 双态收敛——crib reader-text.spec stableRel
 * 已验证配方）：前置观察窗 400ms（fallback→resolved 跳变余量——双采样一致不能
 * 区分「跳变已结束」与「未开始」）+120ms 间隔采样、连续 3 点（2 对相邻一致）
 * 0.1px 内收敛才放行；25 轮穷尽 fail loudly（消息带末次样本——双态瞬态 vs 持续
 * 漂移可判别；静默继续=把假红面留给双态——门二 B-1 同款）。量测口径=**同帧
 * 原子相对几何**（rect 与 canvas 单 evaluate 内取值——参照系位移与 rect 跳变
 * 同窗收敛，终局断言恰比较此相对量，门二 W-A 同帧纪律）。两程量测前各过门：
 * pass1 裸 boundingBox 竞速 resolve 是 2 现立案的根因（z-r2e-flake-case.md），
 * pass2 裸测同险（s2RelY 稳是时序巧合非保证）。**无条件执行**（不经 STABLE
 * 条件——该旗只辖滚动稳定对照组；稳态原位断言语义循原用例 stableRel 同款
 * 无条件，双态时间线仍由 mutLog/series 完整记录，取证语义无损）。 */
async function rectStableGate(win: Page): Promise<void> {
  const measure = (): Promise<{ x: number; y: number; w: number; h: number } | null> =>
    win.evaluate(() => {
      const r = document.querySelector('[data-testid="annotation-rect"]')?.getBoundingClientRect()
      const c = document.querySelector('canvas[data-pdf-canvas]')?.getBoundingClientRect()
      if (r === undefined || c === undefined || r.width <= 0 || r.height <= 0 || c.width <= 0) return null
      return { x: r.x - c.x, y: r.y - c.y, w: r.width, h: r.height }
    })
  await win.waitForTimeout(400)
  let prev = await measure()
  let streak = 0
  for (let i = 0; i < 25; i++) {
    await win.waitForTimeout(120)
    const cur = await measure()
    if (
      cur !== null && prev !== null &&
      Math.abs(cur.x - prev.x) < 0.1 && Math.abs(cur.y - prev.y) < 0.1 &&
      Math.abs(cur.w - prev.w) < 0.1 && Math.abs(cur.h - prev.h) < 0.1
    ) {
      streak += 1
      if (streak >= 2) return
    } else {
      streak = 0
    }
    prev = cur
  }
  throw new Error(
    `annotation-rect 相对几何 25 轮采样未收敛（双态瞬态/漂移超预算——fail loudly）；` +
    `末次样本=${JSON.stringify(prev)}`
  )
}

/** 滚动事件驱动记录器（落帧源定位——scroll 事件捕获阶段全容器覆盖+500ms 兜底
 * 采样；rAF 方案在 Electron 失焦/遮挡窗口下被完全暂停——实测零执行，弃用） */
interface ScrollLogPoint { t: number; tag: string; y: number | null; ch: number | null; sh: number | null }

function startScrollLog(win: Page): Promise<void> {
  return win.evaluate(() => {
    const w = window as unknown as {
      __r2eLog?: Array<{ t: number; tag: string; y: number | null; ch: number | null; sh: number | null }>
      __r2eStop?: boolean
      __r2eHandler?: (e: Event) => void
      __r2eTimer?: ReturnType<typeof setInterval>
    }
    w.__r2eLog = []
    w.__r2eStop = false
    const rec = (tag: string): void => {
      const col = document.querySelector('[data-page-column="ready"]')
      const sc = col === null ? null : col.closest('.overflow-auto') as HTMLElement | null
      w.__r2eLog?.push({
        t: Math.round(performance.now()),
        tag,
        y: sc === null ? null : Math.round(sc.scrollTop * 100) / 100,
        ch: sc === null ? null : sc.clientHeight,
        sh: sc === null ? null : sc.scrollHeight
      })
    }
    w.__r2eHandler = (e: Event): void => {
      if (e.target instanceof HTMLElement && e.target.closest('.overflow-auto') !== null) rec('scroll')
    }
    window.addEventListener('scroll', w.__r2eHandler, true)
    rec('init')
    w.__r2eTimer = setInterval(() => {
      if (w.__r2eStop !== true) rec('tick')
    }, 500)
  })
}

function collectScrollLog(win: Page): Promise<{ log: ScrollLogPoint[]; everStarted: boolean }> {
  return win.evaluate(() => {
    const w = window as unknown as {
      __r2eLog?: ScrollLogPoint[]
      __r2eStop?: boolean
      __r2eHandler?: (e: Event) => void
      __r2eTimer?: ReturnType<typeof setInterval>
    } & Window
    const everStarted = Array.isArray(w.__r2eLog)
    const log = w.__r2eLog ?? []
    w.__r2eStop = true
    if (w.__r2eHandler !== undefined) window.removeEventListener('scroll', w.__r2eHandler, true)
    if (w.__r2eTimer !== undefined) clearInterval(w.__r2eTimer)
    w.__r2eLog = []
    return { log, everStarted }
  })
}

test('F-R2e 探针：划选高亮重开原位——仪表指纹矩阵', async () => {
  skipIfPending(DEPS)
  const title = '智慧水务 e2e 标注链文献 R2E探针'
  const bytes = createTinyPdf(`${title} ${PDF_KNOWN_TEXT}`)
  const userData = await mkdtemp(join(tmpdir(), 'synapse-r2e-'))
  // 第一跳：应用自建库迁移（seedAndLaunch 配方——探针自带副本，不 import spec）
  const seedApp = await launch(userData)
  await (await seedApp.firstWindow()).waitForTimeout(500)
  await seedApp.close()
  const sha = createHash('sha256').update(bytes).digest('hex')
  const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
  mkdirSync(dirname(join(userData, 'files', ...fileRef.split('/'))), { recursive: true })
  writeFileSync(join(userData, 'files', ...fileRef.split('/')), bytes)
  await seedPaperRow(userData, fileRef, sha, title)

  // 第一程：划选 → 高亮 → 原路径测量（原样先行）→ 原子快照 → 时间序列
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  const th1 = await throttle(app, win, THROTTLE)
  await win.getByText(title).first().dblclick()
  const known = win.getByText(PDF_KNOWN_TEXT).first()
  await expect(known).toBeVisible({ timeout: 20_000 })
  await known.selectText()
  await expect(win.getByTestId('selection-toolbar')).toBeVisible()
  await startMutLog(win)
  await win.getByRole('button', { name: '高亮' }).click()
  const rect = win.getByTestId('annotation-rect')
  await expect(rect.first()).toBeVisible()
  await expect(win.getByTestId('annotation-layer')).toHaveCSS('mix-blend-mode', 'normal')
  await expect(rect).toHaveCount(1)
  // [z-r2e 立案修] 几何稳定门先行（pass1 裸测竞速 resolve=2 现根因）
  await rectStableGate(win)
  const box1 = await rect.first().boundingBox()
  const page1 = await win.locator('canvas[data-pdf-canvas]').boundingBox()
  const a1 = await atomSample(win)
  const s1 = await series(win, 4, 250)
  const mut1 = await collectMutLog(win)
  if (INJECT === 3) await injectScroll(win, 3.45)
  await app.close()

  // 第二程：重开 → 可见/样式门（与原用例同序）→ 原路径测量（原样先行——注入档插在两测间）
  const app2 = await launch(userData)
  const win2 = await app2.firstWindow()
  await expect(win2.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  const th2 = await throttle(app2, win2, THROTTLE)
  // 高频 scroll 记录器+rect 生命周期记录器：dblclick 前启动（覆盖加载/恢复链/测量全程）
  await startScrollLog(win2)
  await startMutLog(win2)
  await win2.getByText(title).first().dblclick()
  await expect(win2.getByText(PDF_KNOWN_TEXT).first()).toBeVisible({ timeout: 20_000 })
  const rect2 = win2.getByTestId('annotation-rect')
  await expect(rect2.first()).toBeVisible({ timeout: 10_000 })
  await expect(rect2).toHaveCount(1)
  await expect(win2.getByTestId('annotation-layer')).toHaveCSS('mix-blend-mode', 'normal')
  if (STABLE) await stableGate(win2)
  // [z-r2e 立案修] 几何稳定门（pass2 裸测同险——双程同口径）
  await rectStableGate(win2)
  const box2 = await rect2.first().boundingBox()
  const box2T = Date.now()
  if (INJECT === 1) await injectScroll(win2, 3.45)
  if (INJECT === 2) await injectScroll(win2, 37)
  const page2 = await win2.locator('canvas[data-pdf-canvas]').boundingBox()
  const page2T = Date.now()
  const a2 = await atomSample(win2)
  const hf = await collectScrollLog(win2)
  const hfLog = hf.log
  const mut2 = await collectMutLog(win2)
  const s2 = await series(win2, 8, 250)

  expect(box1).not.toBeNull()
  expect(page1).not.toBeNull()
  expect(box2).not.toBeNull()
  expect(page2).not.toBeNull()
  const rel1 = { x: box1!.x - page1!.x, y: box1!.y - page1!.y }
  const rel2 = { x: box2!.x - page2!.x, y: box2!.y - page2!.y }
  const relSpan = (a: Atom): number | null => (a.sy !== null && a.cy !== null ? a.sy - a.cy : null)
  const relAtomY = (a: Atom): number | null => (a.ry !== null && a.cy !== null ? a.ry - a.cy : null)
  const diffs = {
    dx: rel2.x - rel1.x,
    dy: rel2.y - rel1.y,
    dw: box2!.width - box1!.width,
    dh: box2!.height - box1!.height,
    atomDy: (relAtomY(a2) ?? 0) - (relAtomY(a1) ?? 0),
    spanDy: (relSpan(a2) ?? 0) - (relSpan(a1) ?? 0),
    s2RelY: s2.map((a) => relAtomY(a))
  }
  const verdicts = {
    x: Math.abs(rel1.x - rel2.x) <= 2,
    y: Math.abs(rel1.y - rel2.y) <= 2,
    w: Math.abs(box1!.width - box2!.width) <= 2,
    h: Math.abs(box1!.height - box2!.height) <= 2
  }
  const payload = {
    meta: {
      ts: new Date().toISOString(), pid: process.pid, inject: INJECT,
      throttle: THROTTLE, throttleApplied: [th1, th2], stable: STABLE, title,
      box2WallT: box2T, page2WallT: page2T, hfEverStarted: hf.everStarted
    },
    pass1: { box: box1, page: page1, rel: rel1, atom: a1, series: s1, mutLog: mut1 },
    pass2: { box: box2, page: page2, rel: rel2, atom: a2, series: s2, hfScrollLog: hfLog, mutLog: mut2 },
    diffs, verdicts
  }
  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(join(OUT_DIR, `probe-i${INJECT}-t${THROTTLE}-${Date.now()}.json`), JSON.stringify(payload, null, 2))

  if (INJECT === 0) {
    // 断言照抄原用例（复现即停信号——数据已先落盘）
    expect(Math.abs(rel1.x - rel2.x)).toBeLessThanOrEqual(2)
    expect(Math.abs(rel1.y - rel2.y)).toBeLessThanOrEqual(2)
    expect(Math.abs(box1!.width - box2!.width)).toBeLessThanOrEqual(2)
    expect(Math.abs(box1!.height - box2!.height)).toBeLessThanOrEqual(2)
  }
  await app2.close()
})
