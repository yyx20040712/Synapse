/**
 * [F-ROUTE-02 U4] obstacleAuditProbe——N5 障碍几何全面校准程序（设计稿 §6
 * N5 余量；独立 spec——年份头面 cirefix 批已毕，本件只做对账程序**勿改实现**）。
 *
 * ── 四项（设计 §6 N5 ①-④）──
 * - ① DOM 枚举 .tl-card/.month-tag/.tl-year-num/.tl-year-meta 实测 rect÷zoom
 *   与 buildSnapshot 产物双向对账（容差 1px，漏采/幽灵皆红）。实现申报：
 *   buildSnapshot 驻 renderer bundle 无 window 暴露面（e2e 不可导入）——
 *   **等价重建**=同选择器集+同 ÷z 数学（edge-overlay-geom.ts buildSnapshot
 *   镜像）in-page 复刻，与独立逐元素量测对账（bijection+逐 rect ≤1px）；
 *   z 双源校准（content transform matrix vs 卡宽÷128 已知基准）。对账在
 *   zoom 1.5 档跑（÷z 承重——z=1 恒等式空转无判别力）。
 * - ② 负锚：.month-frame 与 1px 伪元素横线不在 snapshot（重建障碍族无 rect
 *   命中任何月框 rect±1px；yearHead 族无全宽幽灵条目——::after 横线天然
 *   采不到的口径锁定）。
 * - ③ B4 冻结复扫：.month-tag 文本冻结格式（「M 月 · N 篇」/「未定月 · N 篇」
 *   ——设计稿 N5「YYYY-MM 补零」句为陈旧心智模型申报：该格式冻结面=侧板
 *   年月徽章 ymBadge「YYYY-MM padStart(2,'0')」，两处均断）+实测宽=采集宽
 *   （逐 tag 宽 ≤1px）。
 * - ④ .c-no #→·（U+00B7）冻结：首字符 charCodeAt===0xB7+三位补零序号+
 *   .tl-card offsetWidth 不随序号文本变化（单位数 ·001 vs 两位数 ·010 对照）。
 *
 * ── 受锁流程（门一 W3 同型）──
 * - 本文件已入 locks manifest——改动必经 locks:unlock→批内改→locks:apply
 *   +[locked-change] 尾注提交。
 * - 夹具=10 卡单月（换行瀑布五行）+他月单卡+跨年单卡（年份头两处+两位数
 *   骑缝号；探针 p5 校准）。期望几何全实测派生零硬编码。
 */
import { test, expect, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { bootstrapMigrations, launch, seedLineageGraph, seedPaperRow } from './e2e-env'
import { zoomProbe } from './geo-probes'

/** 重建族键（buildSnapshot 三族镜像——cards/labels/yearHeads） */
type Family = 'cards' | 'labels' | 'yearHeads'

interface AuditRect {
  family: Family
  key: string
  x: number
  y: number
  w: number
  h: number
}

/** 独立逐元素量测（重建外二测——对账第二源） */
interface DomMeasure {
  family: Family
  key: string
  x: number
  y: number
  w: number
  h: number
}

/** in-page 采集体：重建（buildSnapshot 镜像）+独立量测+月框/文本/序号面 */
interface AuditDump {
  zMatrix: number
  zCardWidth: number
  rebuild: AuditRect[]
  dom: DomMeasure[]
  frames: Array<{ x: number; y: number; w: number; h: number }>
  tagTexts: string[]
  cNos: Array<{ text: string; offsetWidth: number }>
  contentW: number
}

/** 卡宽基准（P-15 128×72——z 双源校准第二源） */
const CARD_W = 128

async function dumpAudit(win: Page): Promise<AuditDump> {
  return win.evaluate((cardW) => {
    const content = document.querySelector('.tl-content') as HTMLElement | null
    if (content === null) throw new Error('.tl-content 不在场')
    const base = content.getBoundingClientRect()
    const zm = /matrix\(([\d.]+),/.exec(getComputedStyle(content).transform)
    const z = zm === null ? 1 : Number(zm[1])
    const toC = (el: Element): { x: number; y: number; w: number; h: number } => {
      const r = el.getBoundingClientRect()
      return { x: (r.left - base.left) / z, y: (r.top - base.top) / z, w: r.width / z, h: r.height / z }
    }
    // 重建（buildSnapshot 镜像选择器集——edge-overlay-geom.ts 逐选择器同源）
    const rebuild: AuditDump['rebuild'] = []
    for (const el of Array.from(content.querySelectorAll<HTMLElement>('.tl-card[data-node-id]'))) {
      rebuild.push({ family: 'cards', key: el.dataset.nodeId ?? '', ...toC(el) })
    }
    for (const el of Array.from(content.querySelectorAll('.month-tag'))) {
      rebuild.push({ family: 'labels', key: (el.textContent ?? '').slice(0, 12), ...toC(el) })
    }
    for (const el of Array.from(content.querySelectorAll('.tl-year-num, .tl-year-meta'))) {
      rebuild.push({ family: 'yearHeads', key: (el.textContent ?? '').slice(0, 12), ...toC(el) })
    }
    // 独立量测（document 级重查——不经 content 容器引用，第二源）
    const dom: AuditDump['dom'] = []
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('.tl-card[data-node-id]'))) {
      const r = el.getBoundingClientRect()
      dom.push({ family: 'cards', key: el.dataset.nodeId ?? '', x: (r.left - base.left) / z, y: (r.top - base.top) / z, w: r.width / z, h: r.height / z })
    }
    for (const el of Array.from(document.querySelectorAll('.month-tag'))) {
      const r = el.getBoundingClientRect()
      dom.push({ family: 'labels', key: (el.textContent ?? '').slice(0, 12), x: (r.left - base.left) / z, y: (r.top - base.top) / z, w: r.width / z, h: r.height / z })
    }
    for (const el of Array.from(document.querySelectorAll('.tl-year-num, .tl-year-meta'))) {
      const r = el.getBoundingClientRect()
      dom.push({ family: 'yearHeads', key: (el.textContent ?? '').slice(0, 12), x: (r.left - base.left) / z, y: (r.top - base.top) / z, w: r.width / z, h: r.height / z })
    }
    const cardEl = content.querySelector('.tl-card[data-node-id]')
    if (cardEl === null) throw new Error('卡不在场（z 双源校准无基准）')
    return {
      zMatrix: z,
      zCardWidth: cardEl.getBoundingClientRect().width / cardW,
      rebuild,
      dom,
      frames: Array.from(content.querySelectorAll('.month-frame')).map((f) => toC(f)),
      tagTexts: Array.from(content.querySelectorAll('.month-tag')).map((t) => t.textContent ?? ''),
      cNos: Array.from(content.querySelectorAll('.c-no')).map((t) => ({ text: t.textContent ?? '', offsetWidth: (t.closest('.tl-card') as HTMLElement).offsetWidth })),
      contentW: base.width / z
    }
  }, CARD_W)
}


test.describe('F-ROUTE-02 U4 obstacleAuditProbe（N5 障碍几何全面校准）', () => {
  /**
   * ①-④ 一体化对账程序（zoom 1.5 档跑 ①②——÷z 承重；③④档位无关）。
   */
  test('N5 ①②zoom1.5 双向对账+负锚 ③B4 冻结复扫 ④·（U+00B7）冻结', async () => {
    const userData = await mkdtemp(join(tmpdir(), 'u4-audit-'))
    const ids = Array.from({ length: 12 }, (_, i) => `u4a-${i + 1}`)
    const titles = Array.from({ length: 12 }, (_, i) => `审计文献${String(i + 1).padStart(2, '0')}`)
    await bootstrapMigrations(userData)
    for (let i = 0; i < ids.length; i++) {
      const sha = createHash('sha256').update(`u4-audit-${ids[i]}`).digest('hex')
      await seedPaperRow(userData, `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`, sha, titles[i]!, ids[i])
    }
    await seedLineageGraph(userData, {
      nodes: [
        ...Array.from({ length: 10 }, (_, i) => ({ paperId: `u4a-${i + 1}`, title: titles[i]!, year: 2020, month: 5, slot: i + 1 })),
        { paperId: 'u4a-11', title: titles[10]!, year: 2020, month: 8, slot: 1 },
        { paperId: 'u4a-12', title: titles[11]!, year: 2021, month: 1, slot: 1 }
      ],
      edges: []
    })
    const app = await launch(userData)
    const win = await app.firstWindow()
    await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
    await win.setViewportSize({ width: 1280, height: 860 })
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await expect(win.locator('.tl-card').first()).toContainText('审计文献01', { timeout: 10_000 })
    await expect(win.locator('svg.tl-edges')).toBeVisible()

    // ── ①②（zoom 1.5——÷z 承重档）──
    await zoomProbe(win, 1.5, async () => {
      const d = await dumpAudit(win)
      // z 双源校准（content transform matrix vs 卡宽÷128 基准——÷z 数学本体）
      expect(Math.abs(d.zMatrix - d.zCardWidth), `z 双源 ${d.zMatrix} vs ${d.zCardWidth}（±0.01）`).toBeLessThanOrEqual(0.01)
      expect(d.zMatrix).toBeGreaterThan(1.4) // 档位前提锁定（非 1 恒等式空转）
      // 双向对账：族计数全等（漏采/幽灵皆红）+逐 rect 四维 ≤1px
      for (const fam of ['cards', 'labels', 'yearHeads'] as const) {
        const rb = d.rebuild.filter((r) => r.family === fam)
        const dm = d.dom.filter((r) => r.family === fam)
        expect(rb.length, `① ${fam} 族重建计数（漏采/幽灵）`).toBe(dm.length)
        expect(rb.length, `① ${fam} 族非空`).toBeGreaterThan(0)
        const used = new Set<number>()
        for (const r of rb) {
          const j = dm.findIndex((m, idx) => !used.has(idx) && m.family === r.family && Math.abs(m.x - r.x) <= 1 && Math.abs(m.y - r.y) <= 1 && Math.abs(m.w - r.w) <= 1 && Math.abs(m.h - r.h) <= 1)
          expect(j, `① ${fam} 重建项 (${r.x.toFixed(1)},${r.y.toFixed(1)}) 无独立量测对账项（±1px）`).toBeGreaterThanOrEqual(0)
          used.add(j)
        }
      }
      // ② 负锚：月框不入障碍族（重建三族无 rect 命中任何月框 ±1px）
      for (const f of d.frames) {
        const ghost = d.rebuild.some(
          (r) => r.family !== 'cards' && Math.abs(r.x - f.x) <= 1 && Math.abs(r.y - f.y) <= 1 && Math.abs(r.w - f.w) <= 1 && Math.abs(r.h - f.h) <= 1
        )
        expect(ghost, `② 月框 (${f.x.toFixed(1)},${f.y.toFixed(1)},${f.w.toFixed(1)}×${f.h.toFixed(1)}) 泄入障碍族`).toBe(false)
      }
      // ② 负锚：yearHead 族无全宽幽灵（::after 1px 横线不可采——宽度上限锁）
      for (const r of d.rebuild.filter((x) => x.family === 'yearHeads')) {
        expect(r.w, `② yearHead 幽灵全宽条目 (${r.w.toFixed(1)}≥80% contentW=${d.contentW.toFixed(1)})`).toBeLessThan(d.contentW * 0.8)
      }
    })

    // ── ③ B4 冻结复扫（档位无关——zoomProbe 毕已复位 1.0）──
    const d10 = await dumpAudit(win)
    // 月标冻结格式（已知月/未定月两态——TimelineYears 月标渲染面）
    for (const t of d10.tagTexts) {
      expect(t, `③ 月标文本冻结格式（实测 "${t}"）`).toMatch(/^(未定月|\d{1,2} 月) · \d+ 篇$/)
    }
    // 实测宽=采集宽（labels 族重建宽=独立量测宽 ≤1px——逐 tag）
    const labelRb = d10.rebuild.filter((r) => r.family === 'labels')
    const labelDm = d10.dom.filter((r) => r.family === 'labels')
    for (const r of labelRb) {
      const m = labelDm.find((x) => x.key === r.key && Math.abs(x.y - r.y) <= 1)
      expect(m, `③ 月标 "${r.key}" 采集项有独立量测对账`).toBeDefined()
      expect(Math.abs(m!.w - r.w), `③ 月标 "${r.key}" 实测宽 ${m!.w.toFixed(1)}=采集宽 ${r.w.toFixed(1)}（±1px）`).toBeLessThanOrEqual(1)
    }
    // YYYY-MM 补零冻结面=侧板年月徽章（ymBadge——设计 N5 句陈旧面申报）：
    // 点 2020-05 首卡→徽章 "2020-05"；再点 2020-08 卡→"2020-08"（padStart 两证）
    const cardMay = win.locator('.tl-card[data-node-id]').filter({ hasText: '审计文献01' })
    await cardMay.click()
    await expect(win.getByTestId('lineage-side-panel')).toContainText('2020-05')
    const cardAug = win.locator('.tl-card[data-node-id]').filter({ hasText: '审计文献11' })
    await cardAug.evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await cardAug.click()
    await expect(win.getByTestId('lineage-side-panel')).toContainText('2020-08')

    // ── ④ .c-no #→·（U+00B7）冻结 ──
    const nos = d10.cNos
    expect(nos.length, '④ 骑缝号在场（12 卡）').toBe(12)
    for (const n of nos) {
      expect(n.text.charCodeAt(0), `④ 首字符 U+00B7（实测 "${n.text}"）`).toBe(0xb7)
      expect(n.text, `④ 三位补零格式（实测 "${n.text}"）`).toMatch(/^\u00b7\d{3}$/)
    }
    // offsetWidth 不随序号文本变化：单位数（·001）vs 两位数（·010）对照
    const single = nos.find((n) => n.text === '\u00b7001')
    const dbl = nos.find((n) => n.text === '\u00b7010')
    expect(single, '④ 单位数序号卡在场（·001）').toBeDefined()
    expect(dbl, '④ 两位数序号卡在场（·010）').toBeDefined()
    expect(Math.abs(single!.offsetWidth - dbl!.offsetWidth), `④ 卡宽 ${single!.offsetWidth} vs ${dbl!.offsetWidth}（±1px）`).toBeLessThanOrEqual(1)

    await app.close()
  })
})
