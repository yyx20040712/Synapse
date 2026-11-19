/**
 * [R2-C5] 走线压力 e2e——单月 20 文献+36 边固定确定性边表，承载七条不变量
 * 断言（INV-79/110/112/115/119③/SLOTGRID-02 e2e 面；豁免面单源=
 * .zcode/dev-troupe/r2c5-exemptions/report.md 15 形态）。
 *
 * ── 夹具口径 ──
 * - 视口 1280×860（route-slots 同型）；2020-05 单月 20 卡（实测容量 3/2 砖砌
 *   8 行）。边表=36 条固定数组（无随机/无时间依赖；UNIQUE(from,to) 全异有序
 *   对，含双向对 (2,7)/(7,2)、(4,9)/(9,4)；每卡度 ≤8<11 → 12 锚全满回退共享
 *   〔F2/INV-119③〕结构不可达；无钉定/无 via → F1/F3 不触发，占用互斥断言
 *   零豁免面）。
 * - 覆盖形态：同列 direct（邻行净空族）/detour（同列被中卡拦族 (0,10) 等 6
 *   条）、跨行 band 残余簇（band1 四成员互达簇+上行 2 成员簇）、多带长程
 *   band（row0→row4 族——通道竞争）、同行被挡（(0,2)/(5,7)/(10,12)/(15,17)）、
 *   同月邻卡 h-slip（(10,11)/(15,16)/(18,19)）、远跨上行（(19,0)）。
 *
 * ── 断言口径（七不变量）──
 * ① 全覆盖：36 边各恰一渲染产物（path 或 blocked 无几何 g）+20 卡；② 坐标集
 * 封闭（INV-SLOTGRID-02）：采样横/纵段电平 ∈ 锚/桩∪槽位∪外圈车道∪Z-jog 电平
 * ∪残余电平∪detour 夹缝中位槽——期望集由 src 单源 import 公式派生
 * （anchorPoint/stubEnd/slotPositions/midSlotOf/extractGapCells/gridChannelsOf
 * /bandsOf/ringLanesOf/zInterior+PAD/SLOT_* 常量——零镜面）；③ 占用互斥：
 * data-anchors 层（含 blocked）逐锚互斥+data-slot 逐 (cellId,slotIdx) 互斥
 * （豁免面常量表=ANCHOR/SLOT_EXEMPTIONS——夹具设计规避，红即未登记形态）；
 * ④ 容量：每卡锚占用 ≤12、每单元槽位消费 ≤min(n,SLOT_MAX) 且 idx<n、残余
 * |off|≤maxOff（s/cap 由 bandsOf+PAD 公式派生）；⑤ 第三方净空（INV-79/110）：
 * 逐 path 128 点采样 vs 第三方卡∪月标注∪年份头两文本区 ±PAD（源/目标卡按桩
 * 区语义不入第三方集；空卡位非障碍——INV-79；同型探针驻本 spec——geo-probes
 * 单源边界=三类 rect 断言，route-slots 头注申报沿承）；⑥ 平行间距 ≥s（INV-115
 * 登记域=残余簇内分离度；s=bandsOf 单源 Band.s）：x 投影互达残余对 |Δ电平|
 * ≥s，豁免=cap 溢出边界对（INV-115）+overlapExempt 对（INV-112）——豁免对
 * 显式列边 ID 不静默跳过；⑥b 重合对（|Δ|≈0——INV-112 共线面，任意类对）
 * 须一方 data-overlap-exempt=1；⑦ 确定性：切视图往返两次完整渲染，全部边
 * 观测属性序列化逐字节全等。
 *
 * ── 断言域申报（impl-report 未决事项对应）──
 * INV-SLOTGRID-02 正文三源枚举未点名 Z-jog 电平（zapply.zInterior——INV-112
 * 机制）与残余偏移电平（INV-115 机制）及 detour 夹缝中位槽（detour.ts
 * moveYOf——midSlotOf 于阻挡带夹缝区间）三类坐标源；本 spec 以单源公式派生
 * 纳入期望集（夹缝族取障碍缘±PAD 界值对超集——横段判别力弱于纵段，如实
 * 申报）。⑥ 的 s 承诺按 INV-115 登记域（残余簇内）实施；跨机制对（残余 vs
 * 落位槽/桩/jog，实测可 <s）无 INV 承诺载体，不入断言。blocked 边口径=
 * 豁免面报告 §6：锚占用计入（data-anchors 层）/path 几何断言排除。
 */
import { test, expect, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { anchorPoint, stubEnd, type Rect, type Side } from '../../src/renderer/features/lineage/routing/anchors'
import { PAD } from '../../src/renderer/features/lineage/routing/avoid'
import { bandsOf } from '../../src/renderer/features/lineage/routing/bands'
import type { LayoutSnapshot } from '../../src/renderer/features/lineage/routing/chain'
import { gridChannelsOf } from '../../src/renderer/features/lineage/routing/detour'
import { extractGapCells, midSlotOf, quant, SLOT_L_MIN, SLOT_MAX, SLOT_STUB, slotPositions } from '../../src/renderer/features/lineage/routing/gap-cells'
import { ringLanesOf } from '../../src/renderer/features/lineage/routing/outer-ring'
import { zInterior } from '../../src/renderer/features/lineage/routing/zapply'
import { bootstrapMigrations, launch, seedLineageGraph, seedPaperRow } from './e2e-env'
import { assertParallelFamily, inSet, RUN_MIN_EXTENT, TOL, type BandInfo, type ObservedPath, type Run } from './route-stress-assert'

/** 单月卡数（20 文献——压力面） */
const N_CARDS = 20
/** INV-119③「12 锚/卡」（4 边×¼/½/¾ 三序——anchors.ts 12 锚体系结构值） */
const ANCHORS_PER_CARD = 12
/** ⑤ 净空命中上报上限（防 payload 失控——超限首违例仍红） */
const MAX_HITS = 40
/** ③ 豁免面常量表（锚域——夹具规避 F1/F2/F3；violations=未登记形态停呈报） */
const ANCHOR_EXEMPTIONS: ReadonlyArray<string> = ['INV-119③ pin 共享（F1）', 'INV-119③ 12 锚全满回退共享（F2）', 'INV-120 manual 派生显示占用（F3）']
/** ③ 豁免面常量表（槽域——F4-F6 携 data-overlap-exempt=1 观测位） */
const SLOT_EXEMPTIONS: ReadonlyArray<string> = ['INV-112 retain 恰中槽豁免（F4）', 'INV-112 L3 穷尽豁免（F5）', 'INV-112 overlap 兜底（F6）']

const idOf = (i: number): string => `r2c5-a${String(i + 1).padStart(2, '0')}`
const titleOf = (i: number): string => `压${i + 1}`
/** 36 边固定确定性边表（有序对全异；角标=卡序 0..19，网格列族 x12={0,5,10,15}/
 * x212={1,6,11,16}/x412={2,7,12,17}/x112={3,8,13,18}/x312={4,9,14,19}——
 * 文件头覆盖形态；每卡度 ≤8<11） */
const PAIRS: ReadonlyArray<readonly [number, number]> = [
  [0, 5], [1, 6], [3, 8], [4, 9], [5, 10], [7, 12], [13, 18], [14, 19], [12, 17], [8, 13],
  [0, 10], [1, 11], [2, 12], [3, 13], [4, 14], [5, 15],
  [0, 6], [0, 7], [1, 7], [2, 6],
  [0, 11], [1, 12], [2, 10],
  [5, 0], [6, 1],
  [7, 2], [9, 4], [2, 7],
  [0, 2], [5, 7], [10, 12], [15, 17],
  [10, 11], [18, 19], [15, 16],
  [19, 0]
]
const SIDES: readonly Side[] = ['top', 'bottom', 'left', 'right']

interface Obs {
  z: number
  cards: Array<{ id: string; title: string } & Rect>
  labels: Rect[]
  yearHeads: Rect[]
  frames: Array<Rect & { year: number | null }>
  contentW: number
  paths: ObservedPath[]
  blocked: Array<{ edgeId: string; anchors: string }>
  clearanceHits: Array<{ edgeId: string; desc: string }>
}

/** 建库+幽灵行+图种子（route-slots seedFixture/seedGhosts 同型） */
async function seedFixture(userData: string): Promise<void> {
  await bootstrapMigrations(userData)
  for (let i = 0; i < N_CARDS; i++) {
    const sha = createHash('sha256').update(`r2c5-${idOf(i)}`).digest('hex')
    await seedPaperRow(userData, `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`, sha, titleOf(i), idOf(i))
  }
  await seedLineageGraph(userData, {
    nodes: Array.from({ length: N_CARDS }, (_, i) => ({ paperId: idOf(i), title: titleOf(i), year: 2020, month: 5, slot: i + 1 })),
    edges: PAIRS.map(([f, t]) => ({ from: idOf(f), to: idOf(t), label: '' }))
  })
}

/** 进脉络+等首卡（route-slots openLineage 同型） */
async function openLineage(win: Page): Promise<void> {
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.setViewportSize({ width: 1280, height: 860 })
  await win.getByRole('button', { name: '脉络', exact: true }).click()
  await expect(win.locator('.tl-card').first()).toContainText(titleOf(0), { timeout: 10_000 })
}

/** 等渲染稳定（产物计数到位+全体 d 双读全等——rAF 收敛证据） */
async function waitArtifacts(win: Page, total: number): Promise<void> {
  await expect
    .poll(async () => await win.locator('svg.tl-edges path.tl-edge, svg.tl-edges g.tl-edge-blocked').count(), { timeout: 15_000 })
    .toBe(total)
  const ds = (): Promise<string[]> =>
    win.locator('svg.tl-edges path.tl-edge').evaluateAll((els) => els.map((e) => e.getAttribute('d') ?? ''))
  for (let i = 0; i < 20; i++) {
    const a = await ds()
    await win.waitForTimeout(150)
    if (JSON.stringify(a) === JSON.stringify(await ds())) return
  }
  throw new Error('waitArtifacts：20 轮 d 未稳定')
}

/** 全量观测探针：布局快照（own 域=rect÷z）+逐边观测属性+采样 runs+⑤净空判定 */
async function observe(win: Page): Promise<Obs> {
  return win.evaluate(
    (cfg) => {
      const content = document.querySelector('.tl-content') as HTMLElement | null
      if (content === null) throw new Error('observe：.tl-content 不在场')
      const base = content.getBoundingClientRect()
      const zm = /matrix\(([\d.]+),/.exec(getComputedStyle(content).transform)
      const z = zm === null ? 1 : Number(zm[1])
      const own = (el: Element): { x: number; y: number; w: number; h: number } => {
        const r = el.getBoundingClientRect()
        return {
          x: +((r.left - base.left) / z).toFixed(3),
          y: +((r.top - base.top) / z).toFixed(3),
          w: +(r.width / z).toFixed(3),
          h: +(r.height / z).toFixed(3)
        }
      }
      const cardEls = Array.from(document.querySelectorAll('.tl-card[data-node-id]'))
      const cards = cardEls.map((el) => ({
        id: (el as HTMLElement).dataset.nodeId ?? '',
        title: (el.querySelector('.c-title')?.textContent ?? '').trim(),
        ...own(el)
      }))
      const labels = Array.from(document.querySelectorAll('.month-tag')).map(own)
      const yearHeads = Array.from(document.querySelectorAll('.tl-year-num, .tl-year-meta')).map(own)
      const frames = Array.from(document.querySelectorAll('.month-frame')).map((el) => {
        const raw = el.closest('[data-year]')?.getAttribute('data-year') ?? 'null'
        return { ...own(el), year: raw === 'null' ? null : Number(raw) }
      })
      const mf = document.querySelector('.month-frame')
      if (!(mf instanceof HTMLElement)) throw new Error('observe：.month-frame 不在场')
      const cs = getComputedStyle(mf)
      const contentW =
        parseFloat(cs.width) - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) -
        parseFloat(cs.borderLeftWidth) - parseFloat(cs.borderRightWidth)
      const padS = cfg.pad * z
      const segHits = (ax: number, ay: number, bx: number, by: number, l: number, tp: number, r: number, bm: number): boolean => {
        let t0 = 0
        let t1 = 1
        const dx = bx - ax
        const dy = by - ay
        const edges: Array<[number, number]> = [[-dx, ax - l], [dx, r - ax], [-dy, ay - tp], [dy, bm - ay]]
        for (const [den, num] of edges) {
          if (den === 0) {
            if (num < 0) return false
            continue
          }
          const q = num / den
          if (den < 0) {
            if (q > t1) return false
            if (q > t0) t0 = q
          } else {
            if (q < t0) return false
            if (q < t1) t1 = q
          }
        }
        return true
      }
      const cardScreen = new Map(cardEls.map((el) => [((el as HTMLElement).dataset.nodeId ?? ''), el.getBoundingClientRect()]))
      const otherScreen = [
        ...Array.from(document.querySelectorAll('.month-tag')),
        ...Array.from(document.querySelectorAll('.tl-year-num, .tl-year-meta'))
      ].map((el) => ({ r: el.getBoundingClientRect(), desc: el.className }))
      const clearanceHits: Array<{ edgeId: string; desc: string }> = []
      const mkRuns = (p: SVGPathElement): { hRuns: Run[]; vRuns: Run[] } => {
        const total = p.getTotalLength()
        const pts: SVGPoint[] = []
        for (let k = 0; k <= 256; k++) pts.push(p.getPointAtLength((total * k) / 256))
        const collect = (flat: (q: SVGPoint) => number, along: (q: SVGPoint) => number): Run[] => {
          const out: Run[] = []
          let i = 0
          while (i < pts.length) {
            let j = i
            while (j + 1 < pts.length && Math.abs(flat(pts[j + 1]!) - flat(pts[i]!)) < cfg.tol) j++
            if (j > i) {
              const lo = Math.min(along(pts[i]!), along(pts[j]!))
              const hi = Math.max(along(pts[i]!), along(pts[j]!))
              // 电平取 run 中点采样值（首点可落圆角弧——r=6 弧平坦段电平偏差可及 0.6px）
              const mid = pts[Math.floor((i + j) / 2)]!
              if (hi - lo > cfg.minExtent) out.push({ level: +flat(mid).toFixed(2), lo: +lo.toFixed(2), hi: +hi.toFixed(2) })
            }
            i = j + 1
          }
          return out
        }
        return { hRuns: collect((q) => q.y, (q) => q.x), vRuns: collect((q) => q.x, (q) => q.y) }
      }
      const paths: ObservedPath[] = []
      for (const p of Array.from(document.querySelectorAll('svg.tl-edges path.tl-edge')) as SVGPathElement[]) {
        const ds = p.dataset
        const toks = (ds.anchors ?? '').split(',')
        const ends = new Set(toks.map((t) => t.slice(0, t.lastIndexOf(':'))))
        const bb = p.getBBox()
        const br = p.getBoundingClientRect()
        const zP = bb.width === 0 ? 1 : br.width / bb.width
        const ox = br.left - bb.x * zP
        const oy = br.top - bb.y * zP
        const total = p.getTotalLength()
        let prev: { x: number; y: number } | null = null
        for (let k = 0; k <= 128 && clearanceHits.length < cfg.maxHits; k++) {
          const q = p.getPointAtLength((total * k) / 128)
          const px = ox + q.x * zP
          const py = oy + q.y * zP
          if (prev !== null) {
            for (const [id, r] of cardScreen) {
              if (ends.has(id)) continue
              if (segHits(prev.x, prev.y, px, py, r.left - padS, r.top - padS, r.right + padS, r.bottom + padS)) {
                clearanceHits.push({ edgeId: ds.edgeId ?? '', desc: `第三方卡 ${id.slice(0, 8)} rect±PAD` })
                break
              }
            }
            for (const o of otherScreen) {
              if (segHits(prev.x, prev.y, px, py, o.r.left - padS, o.r.top - padS, o.r.right + padS, o.r.bottom + padS)) {
                clearanceHits.push({ edgeId: ds.edgeId ?? '', desc: `${o.desc} rect±PAD` })
                break
              }
            }
          }
          prev = { x: px, y: py }
        }
        paths.push({
          edgeId: ds.edgeId ?? '',
          route: ds.route ?? '',
          anchors: ds.anchors ?? '',
          slot: ds.slot ?? '',
          exempt: ds.overlapExempt === '1',
          fallback: ds.slotFallback === '1',
          d: p.getAttribute('d') ?? '',
          ...mkRuns(p)
        })
      }
      const blocked = Array.from(document.querySelectorAll('svg.tl-edges g.tl-edge-blocked')).map((g) => ({
        edgeId: (g as SVGElement).dataset.edgeId ?? '',
        anchors: (g as SVGElement).dataset.anchors ?? ''
      }))
      return { z, cards, labels, yearHeads, frames, contentW, paths, blocked, clearanceHits } as unknown as Obs
    },
    { pad: PAD, tol: TOL, minExtent: RUN_MIN_EXTENT, maxHits: MAX_HITS }
  )
}

/** 期望坐标全集（②/④/⑥ 单源 import 公式派生——文件头申报面） */
function buildUniverse(obs: Obs): {
  xs: Set<number>
  ys: Set<number>
  landedYs: Set<number>
  fixedYs: Set<number>
  bands: BandInfo[]
  cellSlotCount: Map<number, number>
  seamRects: Rect[]
} {
  const snap: LayoutSnapshot = {
    cards: new Map(obs.cards.map((c) => [c.id, { x: c.x, y: c.y, w: c.w, h: c.h }])),
    labels: obs.labels,
    frames: obs.frames,
    yearHeads: obs.yearHeads,
    contentW: obs.contentW
  }
  const cardRects = [...snap.cards.values()]
  const xs = new Set<number>()
  const ys = new Set<number>()
  const landedYs = new Set<number>()
  const fixedYs = new Set<number>()
  for (const c of cardRects) {
    for (const side of SIDES) {
      for (let k = 0; k < 3; k++) {
        const a = anchorPoint(c, side, k)
        const st = stubEnd(a, side)
        for (const v of [a.x, st.x]) {
          xs.add(quant(v))
        }
        for (const v of [a.y, st.y]) {
          ys.add(quant(v))
          fixedYs.add(quant(v))
        }
      }
    }
  }
  const cells = extractGapCells(snap)
  const cellSlotCount = new Map<number, number>()
  const seamRects: Rect[] = cells.filter((c) => c.axis === 'y').map((c) => c.rect)
  for (const cell of cells) {
    const ps = slotPositions(cell.axis, cell.rect)
    cellSlotCount.set(cell.id, ps.length)
    for (const p of ps) {
      if (cell.axis === 'x') xs.add(p)
      else {
        ys.add(p)
        landedYs.add(p)
      }
    }
    if (ps.length > 0) {
      const a = cell.axis === 'x' ? { x: ps[0]!, y: cell.rect.y } : { x: cell.rect.x, y: ps[0]! }
      const b = cell.axis === 'x' ? { x: ps[0]!, y: cell.rect.y + cell.rect.h } : { x: cell.rect.x + cell.rect.w, y: ps[0]! }
      const z = zInterior(cell, ps[0]!, ps[0]!, a, b)
      if (z !== null) {
        const lv = cell.axis === 'x' ? ys : xs
        const fx = cell.axis === 'x' ? fixedYs : xs
        lv.add(quant(z.jogLo))
        lv.add(quant(z.jogHi))
        fx.add(quant(z.jogLo))
        fx.add(quant(z.jogHi))
      }
    }
  }
  for (const ch of gridChannelsOf(snap)) for (const p of ch.slots) xs.add(p)
  const bands: BandInfo[] = bandsOf(snap, cardRects).map((b) => {
    const rect = { x: 0, y: b.top, w: 0, h: b.bottom - b.top }
    for (const p of slotPositions('y', rect)) {
      ys.add(p)
      landedYs.add(p)
    }
    const cap = Math.max(1, Math.floor((b.bottom - b.top - 2 * PAD) / b.s))
    const maxOff = ((cap - 1) / 2) * b.s
    for (let j = -Math.floor((2 * maxOff) / b.s); j <= Math.floor((2 * maxOff) / b.s); j++) ys.add(quant(b.center + (j * b.s) / 2))
    return { top: b.top, bottom: b.bottom, s: b.s, center: b.center, cap, maxOff }
  })
  // detour 夹缝中位槽族（阻挡带界=障碍缘±PAD∪卡缘±短桩——超集，文件头申报）
  const bounds = new Set<number>()
  for (const o of [...cardRects, ...snap.labels, ...snap.yearHeads]) {
    bounds.add(quant(o.y - PAD))
    bounds.add(quant(o.y + o.h + PAD))
    if ('w' in o) {
      bounds.add(quant(o.y - SLOT_STUB))
      bounds.add(quant(o.y + o.h + SLOT_STUB))
    }
  }
  for (const lo of bounds) {
    for (const hi of bounds) {
      const w = hi - lo
      if (w < 2 * SLOT_STUB + 2 * SLOT_L_MIN) continue
      const mid = midSlotOf('y', { x: 0, y: lo, w: 0, h: w })
      if (mid !== null) {
        ys.add(mid)
        landedYs.add(mid)
      }
    }
  }
  const lanes = ringLanesOf([...cardRects, ...snap.labels, ...snap.yearHeads])
  xs.add(lanes.left)
  xs.add(lanes.right)
  ys.add(lanes.top)
  ys.add(lanes.bottom)
  fixedYs.add(lanes.top)
  fixedYs.add(lanes.bottom)
  return { xs, ys, landedYs, fixedYs, bands, cellSlotCount, seamRects }
}

test.describe('R2-C5 走线压力（单月 20 文献×36 边——七不变量）', () => {
  test('七不变量：全覆盖/坐标集封闭/占用互斥/容量/净空/平行间距/确定性', async () => {
    test.slow()
    const userData = await mkdtemp(join(tmpdir(), 'r2c5-stress-'))
    await seedFixture(userData)
    const app = await launch(userData)
    const win = await app.firstWindow()
    await openLineage(win)
    const total = PAIRS.length
    await waitArtifacts(win, total)
    const obs = await observe(win)
    const byTitle = new Map(obs.cards.map((c) => [c.title, c.id]))
    const artifacts = [...obs.paths, ...obs.blocked]

    // ① 全覆盖：20 卡；36 边各恰一产物；逐种子边按 data-anchors（源,目标序）恰匹配一次
    expect(obs.cards.length, '① 20 卡全渲染').toBe(N_CARDS)
    expect(artifacts.length, '① 渲染产物数=边表数').toBe(total)
    for (const [f, t] of PAIRS) {
      const src = byTitle.get(titleOf(f))
      const tgt = byTitle.get(titleOf(t))
      expect(src, `① 卡 ${titleOf(f)} nodeId 在场`).toBeDefined()
      expect(tgt, `① 卡 ${titleOf(t)} nodeId 在场`).toBeDefined()
      const re = new RegExp(`^${src}:[tblr][012],${tgt}:[tblr][012]$`)
      expect(artifacts.filter((a) => re.test(a.anchors)).length, `① 边 ${f}→${t} 恰一产物（data-anchors 匹配）`).toBe(1)
    }

    // ③ 占用互斥：data-anchors 层（含 blocked）逐锚互斥；data-slot 逐 (cellId,slotIdx) 互斥
    const anchorOwner = new Map<string, string>()
    for (const a of artifacts) {
      expect(a.anchors, '③ data-anchors 非空卫').not.toBe('')
      for (const tok of a.anchors.split(',')) {
        const key = tok.replace(':', '|')
        expect(anchorOwner.has(key), `③ 锚 ${key.slice(0, 14)} 互斥（后到边 ${a.edgeId.slice(0, 8)}；豁免面=${ANCHOR_EXEMPTIONS.join('/')}）`).toBe(false)
        anchorOwner.set(key, a.edgeId)
      }
    }
    const slotOwner = new Map<string, string>()
    for (const p of obs.paths) {
      if (p.slot === '') continue
      for (const mark of p.slot.split(',')) {
        expect(slotOwner.has(mark), `③ 槽 ${mark} 互斥（后到边 ${p.edgeId.slice(0, 8)}；豁免面=${SLOT_EXEMPTIONS.join('/')}）`).toBe(false)
        slotOwner.set(mark, p.edgeId)
      }
    }

    // ④ 容量：每卡锚占用 ≤12；data-slot 单元 ∈实测提取集且 idx<n、消费 ≤min(n,SLOT_MAX)
    const perCard = new Map<string, Set<string>>()
    for (const a of artifacts) {
      for (const tok of a.anchors.split(',')) {
        const id = tok.slice(0, tok.lastIndexOf(':'))
        const set = perCard.get(id) ?? new Set<string>()
        set.add(tok)
        perCard.set(id, set)
      }
    }
    for (const [id, set] of perCard) {
      expect(set.size, `④ 卡 ${id.slice(0, 8)} 锚占用 ≤${ANCHORS_PER_CARD}（INV-119③）`).toBeLessThanOrEqual(ANCHORS_PER_CARD)
    }
    const uni = buildUniverse(obs)
    const perCell = new Map<number, Set<number>>()
    for (const p of obs.paths) {
      if (p.slot === '') continue
      for (const mark of p.slot.split(',')) {
        const [cs, is] = mark.split(':')
        const cell = Number(cs)
        const idx = Number(is)
        const n = uni.cellSlotCount.get(cell)
        expect(n, `④ data-slot 单元 ${cell} ∈实测提取单元集`).toBeDefined()
        expect(idx, `④ 槽 idx≥0（单元 ${cell}）`).toBeGreaterThanOrEqual(0)
        expect(idx, `④ 槽 idx<${n ?? '?'}（单元 ${cell}）`).toBeLessThan(n ?? 0)
        const set = perCell.get(cell) ?? new Set<number>()
        set.add(idx)
        perCell.set(cell, set)
      }
    }
    for (const [cell, set] of perCell) {
      expect(set.size, `④ 单元 ${cell} 槽位消费 ≤min(n,SLOT_MAX=${SLOT_MAX})`).toBeLessThanOrEqual(Math.min(SLOT_MAX, uni.cellSlotCount.get(cell) ?? 0))
    }

    // ⑤ 第三方净空（INV-79/110——探针内判定；源/目标卡不入第三方集、空卡位非障碍）
    expect(obs.clearanceHits, `⑤ path 采样避第三方障碍±PAD（命中=${JSON.stringify(obs.clearanceHits.slice(0, 6))}）`).toEqual([])

    // ② 坐标集封闭：全部 path 采样横段 y/纵段 x ∈期望全集（±TOL）
    const openH = obs.paths.flatMap((p) => p.hRuns.filter((r) => !inSet(r.level, uni.ys)).map((r) => `${p.edgeId.slice(0, 8)}(${p.route}) y=${r.level}`))
    const openV = obs.paths.flatMap((p) => p.vRuns.filter((r) => !inSet(r.level, uni.xs)).map((r) => `${p.edgeId.slice(0, 8)}(${p.route}) x=${r.level}`))
    expect(openH, `② 横段电平全∈坐标集（逃逸=${JSON.stringify(openH.slice(0, 10))}——INV-SLOTGRID-02+jog/残余/夹缝电平申报面）`).toEqual([])
    expect(openV, `② 纵段 x 全∈坐标集（逃逸=${JSON.stringify(openV.slice(0, 10))}——INV-SLOTGRID-02）`).toEqual([])

    // ④b/⑥/⑥b/⑥c 平行间距族断言（route-stress-assert 单源——spec 500 行
    // 上限拆件）：残余 |off|≤maxOff、残余互达对 ≥s（豁免对显式列名）、槽域
    // 内重合须一方 exempt、[用户裁决 C] 全域防贴合 ≥1px（重叠/贴死必红）。
    assertParallelFamily(obs.paths, uni)

    // ⑦ 确定性：切视图往返重渲染，观测属性序列化逐字节全等
    const serialize = (o: Obs): string =>
      JSON.stringify(
        [
          ...o.paths.map((p) => [p.edgeId, p.route, p.d, p.slot, p.anchors, p.exempt, p.fallback]),
          ...o.blocked.map((b) => [b.edgeId, 'blocked', '', '', b.anchors, false, false])
        ].sort()
      )
    const first = serialize(obs)
    await win.getByRole('button', { name: '文献库' }).click()
    await openLineage(win)
    await waitArtifacts(win, total)
    const second = serialize(await observe(win))
    expect(second, '⑦ 两次完整渲染观测属性序列化全等（确定性）').toBe(first)
    await app.close()
  })
})
