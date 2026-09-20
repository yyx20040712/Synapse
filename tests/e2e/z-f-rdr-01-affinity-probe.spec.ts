/**
 * [F-RDR-01] 选区末行下拖弹回闪烁探针（z-*-probe 命名=probe project 专属，
 * 默认门不跑——F-TESTREF-W2 拆分口径）。
 *
 * 夹具归一化申报（自裁面——头注明示）：
 * - 本仓合成 PDF（pdf-factory）实测两项不可代表真机：①纯空白 Tj 项被
 *   pdf.js 丢弃（无空白标记 span 产出）；②行 break br 为 textLayer 内联流
 *   按行高堆叠于层顶（盒与所属行完全脱钩——诊断档 2026-09-20 仓外
 *   f-rdr01-diag-*.txt）。真机形态（F-A10 实勘：空白标记 span 有真实字形
 *   盒、位于行尾/末行下方）须由探针归一化供给：注入空文本标记 span（无
 *   text node——collectSpans 零纳入=项几何对账零影响）于末行下方，并在
 *   mouseup 前把 focus 归一化到该标记槽位（真机上浏览器把末行下方释放点
 *   解析进空白标记槽的形态——合成 Chromium 不产出该解析，实证=焦点钉在
 *   上一行文本位）。
 * - 判别面申报：合成件上 A 吸附（快路径视觉钳位）与 B 短路（S5 丢弃）的
 *   像素级判别不可达（无文本标记=raw/snapped 产物同形）——该两面的回归
 *   锁=单测 visual-snap-shortcut（几何判据+TTL 三点+接线态）；本探针锁
 *   真链行为面：S4（mouseup 全量锚定=吸附行尾帧）→S5 窗（B 短路——帧
 *   保持）→settle（+200ms 全量同产物）三段 y 序列稳定无减序+末帧==S4。
 *
 * 判定面（设计定稿 §终裁修正 5/8/9）：
 * - rAF 按帧采样自绘矩形底缘 y 序列：①相邻帧无 y 减序对（容差 1px）；
 *   ②末帧 y==S4（mouseup 后首个有效帧=吸附行尾帧）y±1px（证「弹回」方向）；
 * - 有效帧（selection-rect 在场帧）<10=环境节流漏检 → 整测重跑上限 3 次
 *   后 skip 记档（不假绿——headless rAF 节流容差条款，修正 8）；
 * - W9 记录面：mouseup→selectionchange 到达延迟入档——实测 >100ms 则按
 *   R1 校准条款仅调 TTL 常量不动结构；
 * - 性能基准（修正 6 真链口径）：拖选→mouseup→selectionchange→rAF 链上
 *   回调（visual 分支宿主）时长冷热混合采样，P95/中位数记档（守卫增量≤
 *   分支整体时长的保守上界口径——分支内无内部打点面）。
 */
import { expect, test, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { bootstrapMigrations, launch, seedPaperRow } from './e2e-env'
import { createMultiLinePdf } from '../utils/pdf-factory'

/** 种子受管文献+启动（rdr02 探针同款配方） */
async function seedAndLaunch(title: string): Promise<ReturnType<typeof launch>> {
  const bytes = createMultiLinePdf() // 3 行：ALPHA(顶)/BETA/GAMMA(末行)
  const userData = await import('node:fs').then((m) => m.mkdtempSync(join(tmpdir(), 'f-rdr01-')))
  await bootstrapMigrations(userData)
  const sha = createHash('sha256').update(bytes).digest('hex')
  const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
  const abs = join(userData, 'files', ...fileRef.split('/'))
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, bytes)
  await seedPaperRow(userData, fileRef, sha, title)
  return launch(userData)
}

/** 页内取证仪表：rAF 帧采样（自绘矩形底缘 y）+rAF 回调计时（visual 分支宿主
 *  时长）+selectionchange/mouseup 到达时戳+selection-rects 变更时戳 */
async function installInstrument(win: Page): Promise<void> {
  await win.evaluate(() => {
    const w = window as unknown as {
      __rdr01: {
        frames: Array<{ t: number; y: number | null; n: number }>
        raf: Array<{ t: number; dur: number }>
        changes: number[]
        ups: number[]
        muts: number[]
      }
    }
    w.__rdr01 = { frames: [], raf: [], changes: [], ups: [], muts: [] }
    const D = w.__rdr01
    const origRaf = window.requestAnimationFrame.bind(window)
    window.requestAnimationFrame = (cb: FrameRequestCallback): number =>
      origRaf((ts: number) => {
        const t0 = performance.now()
        try {
          return cb(ts)
        } finally {
          D.raf.push({ t: t0, dur: performance.now() - t0 })
        }
      })
    document.addEventListener('selectionchange', () => {
      D.changes.push(performance.now())
    })
    document.addEventListener('mouseup', () => {
      D.ups.push(performance.now())
    })
    new MutationObserver(() => {
      D.muts.push(performance.now())
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] })
    const sample = (): void => {
      const blocks = document.querySelectorAll('[data-testid="selection-rect"]')
      let y: number | null = null
      let n = 0
      blocks.forEach((b) => {
        const r = (b as HTMLElement).getBoundingClientRect()
        if (y === null || r.bottom > y) y = r.bottom
        n += 1
      })
      D.frames.push({ t: performance.now(), y, n })
      origRaf(sample)
    }
    origRaf(sample)
  })
}

test('F-RDR-01 末行下拖：自绘 y 序列无减序对+末帧=S4 吸附帧（±1px）', async () => {
  const title = 'F-RDR-01 弹回闪烁探针文献'
  const app = await seedAndLaunch(title)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByText(title).first().dblclick()
  await expect(win.getByText('MULTILINE ALPHA ROW').first()).toBeVisible({ timeout: 20_000 })
  await expect(win.getByText('MULTILINE GAMMA ROW').first()).toBeVisible({ timeout: 20_000 })
  await installInstrument(win)

  const geo = await win.evaluate(() => {
    const spans = Array.from(document.querySelectorAll('[data-page-root] .textLayer span')) as HTMLElement[]
    const first = spans.find((s) => s.textContent?.includes('ALPHA')) ?? spans[0]!
    const last = spans.find((s) => s.textContent?.includes('GAMMA')) ?? spans[spans.length - 1]!
    const tl = first.closest('.textLayer') as HTMLElement | null
    const r1 = first.getBoundingClientRect()
    const r3 = last.getBoundingClientRect()
    const tlR = tl !== null ? tl.getBoundingClientRect() : { bottom: Number.POSITIVE_INFINITY }
    // 夹具归一化：注入空文本标记 span（末行下方——无 text node，零对账影响）
    if (tl !== null) {
      const tr = tl.getBoundingClientRect()
      const m = document.createElement('span')
      m.setAttribute('role', 'presentation')
      m.style.position = 'absolute'
      m.style.left = (r3.left - tr.left) + 'px'
      m.style.top = (r3.bottom - tr.top + 10) + 'px'
      m.style.width = '120px'
      m.style.height = '14px'
      tl.appendChild(m)
    }
    return {
      start: { x: r1.left + r1.width * 0.3, y: r1.top + r1.height / 2 },
      lastBottom: r3.bottom,
      tlBottom: tlR.bottom
    }
  })

  /** 单次拖选尝试：拖选越末行→mouseup 前 focus 归一化到标记槽位（真机
   *  浏览器解析形态的合成供给——见头注夹具归一化申报）→mouseup */
  async function dragAttempt(): Promise<void> {
    const dropY = Math.min(geo.lastBottom + 34, geo.tlBottom - 6)
    await win.mouse.move(geo.start.x, geo.start.y)
    await win.mouse.down()
    for (let i = 1; i <= 6; i += 1) {
      const y = geo.start.y + ((dropY - geo.start.y) * i) / 6
      await win.mouse.move(geo.start.x + i * 8, y)
      await win.waitForTimeout(40)
    }
    await win.evaluate(() => {
      const tl = document.querySelector('[data-page-root] .textLayer') as HTMLElement | null
      const sel = window.getSelection()
      if (tl !== null && sel !== null && sel.anchorNode !== null) {
        // focus=末尾标记槽位（GAMMA span 后、标记 span 前；锚定侧原样保持）
        sel.setBaseAndExtent(sel.anchorNode, sel.anchorOffset, tl, tl.childNodes.length - 1)
      }
    })
    await win.mouse.up()
    await win.waitForTimeout(700) // 覆盖 TTL 100ms+防抖 200ms+S5 迟到窗
  }

  const TOL = 1
  let done = false
  const frameCounts: number[] = []
  for (let attempt = 1; attempt <= 3 && !done; attempt += 1) {
    await win.evaluate(() => {
      const D = (window as unknown as { __rdr01: {
        frames: Array<{ t: number; y: number | null; n: number }>
        raf: Array<{ t: number; dur: number }>
        changes: number[]
        ups: number[]
        muts: number[]
      } }).__rdr01
      D.frames.length = 0
      D.raf.length = 0
      D.changes.length = 0
      D.ups.length = 0
      D.muts.length = 0
    })
    await dragAttempt()
    const data = await win.evaluate(() => {
      const D = (window as unknown as { __rdr01: {
        frames: Array<{ t: number; y: number | null; n: number }>
        raf: Array<{ t: number; dur: number }>
        changes: number[]
        ups: number[]
        muts: number[]
      } }).__rdr01
      return { frames: D.frames, raf: D.raf, changes: D.changes, ups: D.ups, muts: D.muts }
    })
    const valid = data.frames.filter((f) => f.n > 0 && f.y !== null)
    frameCounts.push(valid.length)
    if (valid.length < 10) {
      console.log(`[F-RDR-01] attempt ${attempt}: 有效帧 ${valid.length} <10（headless rAF 节流）→重跑`)
      continue
    }
    // S4=mouseup 后首个有效帧（full(true) 同帧渲染的吸附行尾帧）
    const upTs = data.ups.length > 0 ? data.ups[data.ups.length - 1]! : Number.NEGATIVE_INFINITY
    const s4Idx = valid.findIndex((f) => f.t >= upTs - 2)
    // [门二 C1] findIndex 未命中返回 -1，toBeDefined 对 -1 恒真=假绿通道——
    // 强化下界断言（-1 红）；无 post-mouseup 有效帧=断言红（真缺陷信号非跳过）
    expect(s4Idx, 'S4 帧（mouseup 后首个有效帧）在场（findIndex 未命中=-1 红）').toBeGreaterThanOrEqual(0)
    expect(valid.length - Math.max(s4Idx, 0), 'S4 后至少 1 个有效帧（post 序列非空）').toBeGreaterThan(0)
    const s4 = valid[s4Idx]!
    const post = valid.slice(s4Idx)
    // ①S4 起子序列相邻帧无 y 减序对（容差 1px）——本票契约=mouseup 后零弹回。
    // 申报：mid-drag 减序（浏览器对合成 textLayer 的焦点解析混沌——同夹具两跑
    // 分别「钉在上一行」/「达末行后回退」，诊断档在仓外）不属重绘缺陷面，
    // 降级为下方记档诊断非断言
    for (let i = 1; i < post.length; i += 1) {
      expect(
        post[i]!.y! - post[i - 1]!.y!,
        `S4 后帧 ${i - 1}→${i} y 减序：${post[i - 1]!.y}→${post[i]!.y}（弹回闪烁形态）`
      ).toBeGreaterThanOrEqual(-TOL)
    }
    // ②末帧 y==S4 y±1px（证「弹回」方向——S4 帧保持至终态）
    const last = valid[valid.length - 1]!
    expect(Math.abs(last.y! - s4.y!), `末帧 y=${last.y} ≠ S4 y=${s4.y}±1（弹回方向断言）`).toBeLessThanOrEqual(TOL)
    // mid-drag 减序记档（诊断面——浏览器焦点解析混沌，非本票断言面）
    const midDips: string[] = []
    for (let i = 1; i < s4Idx; i += 1) {
      if (valid[i]!.y! - valid[i - 1]!.y! < -TOL) {
        midDips.push(`${(valid[i - 1]!.y ?? 0).toFixed(0)}→${(valid[i]!.y ?? 0).toFixed(0)}`)
      }
    }
    if (midDips.length > 0) {
      console.log(`[F-RDR-01] attempt ${attempt}: mid-drag 减序记档（非断言面）=${JSON.stringify(midDips)}`)
    }
    // W9 记录面：mouseup→selectionchange 到达延迟（>100ms 触发 R1 校准条款）
    const delays = data.changes.filter((t) => t > upTs).map((t) => Math.round(t - upTs))
    console.log(
      `[F-RDR-01] attempt ${attempt}: 有效帧 ${valid.length}，末帧 y=${last.y!.toFixed(1)}，S4 y=${s4!.y!.toFixed(1)}，` +
        `末行 span 底=${geo.lastBottom.toFixed(1)}（|末帧−末行底|=${Math.abs(last.y! - geo.lastBottom).toFixed(1)}px 记档），` +
        `change 延迟(ms)=${JSON.stringify(delays.slice(0, 6))}`
    )
    // 性能基准（修正 6 真链口径——冷热分段：前 3 回调=冷（JIT 预热段）/其余=暖）
    const durs = data.raf.map((r) => r.dur).sort((a, b) => a - b)
    const p95 = durs.length > 0 ? durs[Math.floor(durs.length * 0.95)]! : 0
    const med = durs.length > 0 ? durs[Math.floor(durs.length / 2)]! : 0
    const byTime = [...data.raf].sort((a, b) => a.t - b.t)
    const cold = byTime.slice(0, 3).map((r) => r.dur)
    const warm = byTime.slice(3).map((r) => r.dur)
    const coldMax = cold.length > 0 ? Math.max(...cold) : 0
    const warmMax = warm.length > 0 ? Math.max(...warm) : 0
    console.log(
      `[F-RDR-01] attempt ${attempt}: rAF 回调（visual 分支宿主）n=${durs.length} 中位=${med.toFixed(3)}ms P95=${p95.toFixed(3)}ms` +
        `（冷段[前3]max=${coldMax.toFixed(3)}ms / 暖段max=${warmMax.toFixed(3)}ms；selection-rects 变更 n=${data.muts.length}）`
    )
    // [W-3 回炉·原始采样] 逐次耗时序列（时间序全量数组——供门一复核算术）
    console.log(
      `[F-RDR-01] W-3 原始序列（时间序，ms）：cold=[${cold.map((d) => d.toFixed(3)).join(', ')}] warm=[${warm.map((d) => d.toFixed(3)).join(', ')}]`
    )
    done = true
  }
  if (!done) {
    test.skip(true, `有效帧不足（3 次尝试=${JSON.stringify(frameCounts)}）——headless rAF 节流环境漏检，记档不假绿（修正 8）`)
  }
  await app.close()
})
