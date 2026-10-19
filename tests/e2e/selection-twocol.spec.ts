/**
 * [F-VISFB-53] Electron 真机 e2e——双栏拖选闪烁收口（闸③：单元/探针不替代
 * 真机用例；0C fixture=createTwoColumnPdf 双栏页）。
 *
 * 断言面（§7+闸②W-4）：
 *  - 慢拖+>200ms 停顿无空帧：MutationObserver 记录 selection-rects 子树每次
 *    变化后的块数——首个非零记录至 mouseup 之间不出现 0 块记录（settle 全量
 *    清帧再重画=空帧在此红）；
 *  - 停顿无跳变（无双几何交替）：停顿点前后快照（块数+首块四向几何）一致
 *    ——统一快慢 effective boundary 的真机投影；
 *  - paint 域⊆锚栏：拖选左栏（授权栏），每块 left+width 不越中缝（LCOL 行
 *    右缘与 RCOL 行左缘中点为界——0C fixture 缝带 [294,318] 视口缩放后由
 *    两栏 span 实测盒推出，不做视口坐标假设〔F-GEOMASSUME-01 同族防线〕）；
 *  - 终局：工具条在场（settle/mouseup 全量锚定成功）。
 *
 * 真鼠标链（F-CIFLK-01 条款）：拖拽面全部先 scrollIntoViewIfNeeded 锚定。
 * 依赖（标注链 SR-RDR/LIB 六票）均已 done 且 0C fixture 在仓——always-active
 * 直跑（K3 新测试纪律：零 skipIfPending 位——主控集成窗裁决移除死闸）。
 */
import { test, expect, type Page } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { createTwoColumnPdf, PDF_TWOCOL_LEFT, PDF_TWOCOL_RIGHT } from '../utils/pdf-factory'
import { bootstrapMigrations, launch, seedPaperRow } from './e2e-env'
// [F-VISFB-53CI-01 诊断轮] 生产纯函数 Node 侧复算（单源禁复刻——几何判定面
// 与 src 同一份代码；e2e import src 先例=lineage-visfb67-floor/smoke）
import {
  authorizeColumnSpan,
  detectColumnLayout,
  type LineBox
} from '../../src/renderer/features/reader/interact/selection-column-layout'

/** selection-rects 变化观察器（空帧判别面）：每次子树变化记录当时块数 */
async function installFrameObserver(win: Page): Promise<void> {
  await win.evaluate(() => {
    const w = window as unknown as { __sel53?: { counts: number[] } }
    w.__sel53 = { counts: [] }
    const obs = new MutationObserver(() => {
      const n = document.querySelectorAll('[data-testid="selection-rect"]').length
      w.__sel53!.counts.push(n)
    })
    obs.observe(document.body, { childList: true, subtree: true })
  })
}

/** 当前块快照（块数+首块四向几何——停顿跳变判别面） */
async function rectSnapshot(win: Page): Promise<{ count: number; first: string }> {
  return win.evaluate(() => {
    const blocks = Array.from(document.querySelectorAll<HTMLElement>('[data-testid="selection-rect"]'))
    const b = blocks[0]
    return {
      count: blocks.length,
      first: b === undefined ? '' : `${b.style.left}|${b.style.top}|${b.style.width}|${b.style.height}`
    }
  })
}

/** 全块样式序列快照（[回炉轮1 W3] 强化——序列判别面：块数经 join 长度体现，
 *  每块 left/top/width/height 全采样） */
async function rectStylesSnapshot(win: Page): Promise<string> {
  return win.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('[data-testid="selection-rect"]'))
      .map((b) => `${b.style.left}|${b.style.top}|${b.style.width}|${b.style.height}`)
      .join(';')
  )
}

/** [回炉轮1 W3→微回炉 W-2⒝ 改实] 停顿观察窗定时采样：waitForTimeout 间隔
 *  采 samples 次（50ms 粒度覆盖 300ms 停顿窗）——**非逐 rAF 帧级采样**：
 *  采样间隔内的快速往返（<50ms 的 A→B→A）不可排除=本断言面接受边界
 *  （如实申报）；帧级防护由单测 W1/W1b/B 组锚承载 */
async function collectPauseSamples(win: Page, samples: number, intervalMs: number): Promise<string[]> {
  const out: string[] = []
  for (let i = 0; i < samples; i += 1) {
    await win.waitForTimeout(intervalMs)
    out.push(await rectStylesSnapshot(win))
  }
  return out
}

/** [F-VISFB-53CI-01 诊断轮] 预拖段采集：窗环境/命中链/行盒/字体（几何判定面
 *  由 sel53Verdict 以生产纯函数 Node 侧复算——单源禁复刻） */
interface Sel53PreDiag {
  env: { innerWidth: number; innerHeight: number; dpr: number }
  layerCount: number
  targetFound: boolean
  layerBox: { x: number; y: number; w: number; h: number } | null
  hit: { chain: string[]; closestTextLayer: boolean } | null
  fonts: Array<{ fontFamily: string; fontSize: string; lineHeight: string }>
  items: Array<{ x: number; y: number; w: number; h: number; t: string }>
}
async function collectSel53PreDiag(win: Page, sx: number, sy: number): Promise<Sel53PreDiag> {
  return win.evaluate(({ sx, sy }) => {
    const layers = Array.from(document.querySelectorAll('.textLayer'))
    const target = layers.find((l) => (l.textContent ?? '').includes('LCOL SENTINEL ALPHA')) ?? null
    const env = { innerWidth: window.innerWidth, innerHeight: window.innerHeight, dpr: window.devicePixelRatio }
    let hit: { chain: string[]; closestTextLayer: boolean } | null = null
    const el = document.elementFromPoint(sx, sy)
    if (el !== null) {
      const chain: string[] = []
      let n: Element | null = el
      for (let k = 0; k < 8 && n !== null; k++) {
        chain.push(n.tagName + (n.id ? `#${n.id}` : '') + (n.classList.length ? `.${Array.from(n.classList).join('.')}` : ''))
        n = n.parentElement
      }
      hit = { chain, closestTextLayer: el.closest('.textLayer') !== null }
    }
    const fonts: Array<{ fontFamily: string; fontSize: string; lineHeight: string }> = []
    const items: Array<{ x: number; y: number; w: number; h: number; t: string }> = []
    let layerBox: { x: number; y: number; w: number; h: number } | null = null
    if (target !== null) {
      const r = target.getBoundingClientRect()
      layerBox = { x: r.x, y: r.y, w: r.width, h: r.height }
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT)
      for (let n = walker.nextNode() as Text | null; n !== null; n = walker.nextNode() as Text | null) {
        if (n.data.length === 0) continue
        const p = n.parentElement
        if (p === null) continue
        const b = p.getBoundingClientRect()
        items.push({ x: b.left - r.left, y: b.top - r.top, w: b.right - b.left, h: b.bottom - b.top, t: n.data.slice(0, 24) })
        if (fonts.length < 3) {
          const cs = getComputedStyle(p)
          fonts.push({ fontFamily: cs.fontFamily, fontSize: cs.fontSize, lineHeight: cs.lineHeight })
        }
      }
    }
    return { env, layerCount: layers.length, targetFound: target !== null, layerBox, hit, fonts, items }
  }, { sx, sy })
}

/** [F-VISFB-53CI-01 诊断轮] 生产纯函数 Node 复算（px=视口 x−层盒 x——
 * onMouseDown 量测同口径） */
function sel53Verdict(pre: Sel53PreDiag, sx: number): Record<string, unknown> {
  const boxes: LineBox[] = pre.items.map(({ x, y, w, h }) => ({ x, y, w, h }))
  const layout = detectColumnLayout(boxes)
  const px = pre.layerBox !== null ? sx - pre.layerBox.x : null
  const auth = px !== null ? authorizeColumnSpan(layout, { x0: px, x1: px }) : null
  return {
    kind: layout.kind,
    gutter: layout.gutter,
    columns: layout.columns.map((c) => ({ id: c.id, n: c.boxes.length })),
    fullSpanN: layout.fullSpan.length,
    rotatedN: layout.rotated.length,
    pointerLocalX: px,
    auth
  }
}

/** [F-VISFB-53CI-01 诊断轮] 失败现场采集：selection 摘要+rects 全量盒与样式
 *  （可见性判别面：零盒/visibility/display vs 不存在）+变异计数+事件记录
 *  （轮二：__sel53ev——mousedown/selectstart/selectionchange 到达与阻止态） */
async function collectSel53PostDiag(win: Page): Promise<Record<string, unknown>> {
  return win.evaluate(() => {
    const desc = (n: Node | null): string | null => {
      if (n === null) return null
      if (n.nodeType === 3) return `text:${(n as Text).data.slice(0, 20)}`
      const el = n as Element
      const cls = el.classList && el.classList.length ? `.${Array.from(el.classList).join('.')}` : ''
      const kids = el.childElementCount !== undefined ? `(children=${el.childElementCount})` : ''
      return `${el.nodeName}${cls}${kids}`
    }
    const sel = window.getSelection()
    const selection =
      sel === null
        ? null
        : {
            rangeCount: sel.rangeCount,
            isCollapsed: sel.isCollapsed,
            anchorOffset: sel.anchorOffset,
            focusOffset: sel.focusOffset,
            anchorNode: desc(sel.anchorNode),
            focusNode: desc(sel.focusNode),
            text: sel.toString().slice(0, 80)
          }
    const rects = Array.from(document.querySelectorAll<HTMLElement>('[data-testid="selection-rect"]')).map((b) => {
      const r = b.getBoundingClientRect()
      const cs = getComputedStyle(b)
      return {
        styleLeft: b.style.left,
        styleWidth: b.style.width,
        styleHeight: b.style.height,
        box: { x: r.x, y: r.y, w: r.width, h: r.height },
        display: cs.display,
        visibility: cs.visibility,
        opacity: cs.opacity
      }
    })
    const w = window as unknown as { __sel53?: { counts: number[] }; __sel53ev?: { events: unknown[] } }
    return {
      selection,
      rectsCount: rects.length,
      rects,
      counts: w.__sel53?.counts ?? [],
      events: w.__sel53ev?.events ?? [],
      toolbarPresent: document.querySelector('[data-testid="selection-toolbar"]') !== null
    }
  })
}

/** [F-VISFB-53CI-01 诊断轮二] 页面事件记录器（capture+bubble 双相——事件到达/
 *  target/默认阻止四问判别：CI 失败态=坍缩光标在 DIV#13 且整场零扩展——
 *  mousedown 是否到达/target 是否 SPAN/selectstart 是否被阻在录） */
async function installSel53EventRecorder(win: Page): Promise<void> {
  await win.evaluate(() => {
    const w = window as unknown as { __sel53ev?: { events: unknown[] } }
    w.__sel53ev = { events: [] }
    const desc = (t: EventTarget | null): string => {
      if (t instanceof Element) {
        return t.tagName + (t.classList.length ? `.${Array.from(t.classList).join('.')}` : '')
      }
      return t === null ? 'null' : String(t)
    }
    const push = (e: Event, phase: string): void => {
      const ev = w.__sel53ev!.events
      if (ev.length > 120) return
      const me = e as MouseEvent
      if (e.type === 'mousemove' && ev.length > 40) return
      ev.push({ type: e.type, phase, x: me.clientX, y: me.clientY, button: me.button, buttons: me.buttons, target: desc(e.target), prevented: e.defaultPrevented })
    }
    for (const type of ['mousedown', 'mouseup', 'mousemove', 'selectstart'] as const) {
      document.addEventListener(type, (e) => push(e, 'capture'), true)
      document.addEventListener(type, (e) => push(e, 'bubble'), false)
    }
    document.addEventListener('selectionchange', () => {
      const sel = window.getSelection()
      w.__sel53ev!.events.push({
        type: 'selectionchange',
        collapsed: sel?.isCollapsed ?? null,
        rangeCount: sel?.rangeCount ?? null,
        anchor: desc(sel?.anchorNode ?? null),
        offset: sel?.anchorOffset ?? null
      })
    })
  })
}

/** [F-VISFB-53CI-01 诊断轮二] 选区摘要（节点身份带 class+子数——锚 DIV 定位面） */
async function sel53SelectionState(win: Page): Promise<Record<string, unknown>> {
  return win.evaluate(() => {
    const sel = window.getSelection()
    if (sel === null) return { present: false }
    const desc = (n: Node | null): string | null => {
      if (n === null) return null
      if (n.nodeType === 3) return `text:${(n as Text).data.slice(0, 20)}`
      const el = n as Element
      const cls = el.classList && el.classList.length ? `.${Array.from(el.classList).join('.')}` : ''
      const kids = el.childElementCount !== undefined ? `(children=${el.childElementCount})` : ''
      const text = el.textContent === null ? '' : el.textContent.slice(0, 24)
      return `${el.nodeName}${cls}${kids}="${text}"`
    }
    return {
      present: true,
      rangeCount: sel.rangeCount,
      isCollapsed: sel.isCollapsed,
      anchorOffset: sel.anchorOffset,
      focusOffset: sel.focusOffset,
      anchorNode: desc(sel.anchorNode),
      focusNode: desc(sel.focusNode),
      text: sel.toString().slice(0, 60)
    }
  })
}

// 〔F-VISFB-53CI-01 诊断轮 2026-10-19〕撤 2026-10-17 平台门（skipSite 豁免随
// 本批转 retiring）——本地探针两形态（1024×768 CI 几何/1920×1080 默认界）已证
// OnMouseDown 三零块路径结构性不可能：textLayer 行盒 line-height=font-size 钉死
// 盒高（平台不变量）+中缝左界（54+列宽）≫指针 20% 位（cross-gutter 需列宽
// <22px）+哨兵可见保证 items 非空——CI「零块」指纹嫌疑收敛到三下游面：
// ①命中链截断（mousedown target 非 .textLayer 后代）②事件未达 ③rects 存在
// 但零盒/不可见（红在 toBeVisible 非 count——「零块」实为「零可见块」）。
// 本轮=诊断红跑取证（CI 产物仅 failure() 上传=票面任务①口径）：失败现场
// attach 全量诊断 payload；根因修复批随票闭处置本段去留。
test('F-VISFB-53 双栏拖选闪烁收口：慢拖+停顿无空帧无跳变+paint 域⊆锚栏+终局工具条', async ({}, testInfo) => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-sel53-'))
  await bootstrapMigrations(userData)

  const bytes = createTwoColumnPdf()
  const sha = createHash('sha256').update(bytes).digest('hex')
  const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
  const abs = join(userData, 'files', ...fileRef.split('/'))
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, bytes)
  const title = '智慧水务 e2e 双栏选区文献'
  await seedPaperRow(userData, fileRef, sha, title)

  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByText(title).first().dblclick()

  // 双栏两栏哨兵行可见（渲染链就绪）
  const leftRow = win.getByText(PDF_TWOCOL_LEFT).first()
  const rightRow = win.getByText(PDF_TWOCOL_RIGHT).first()
  await expect(leftRow).toBeVisible({ timeout: 20_000 })
  await expect(rightRow).toBeVisible({ timeout: 20_000 })

  // [F-CIFLK-01] 拖拽面滚动锚定（boundingBox+mouse 面必须先锚）
  await leftRow.scrollIntoViewIfNeeded()
  await rightRow.scrollIntoViewIfNeeded()
  const lb = await leftRow.boundingBox()
  const rb = await rightRow.boundingBox()
  expect(lb).not.toBeNull()
  expect(rb).not.toBeNull()
  // 锚栏右界与对侧栏左界的中点（视口实测盒推导——缝带界不做常量假设）
  const gutterMid = (lb!.x + lb!.width + rb!.x) / 2

  await installFrameObserver(win)
  // [F-VISFB-53CI-01 诊断轮二] 事件记录器（拖前装——事件到达/target/阻止态）
  await installSel53EventRecorder(win)

  // 慢拖左栏：行首起 → 逐帧步进右下（栏内）→ 停顿 300ms（>200ms settle 窗）
  // → 续拖小步 → 释放
  // [CI 回执修复 2026-10-17] ①拖拽终点纵向钳入视口（CI windows-latest 1024×768
  // 钳制窗——2.2×行高落点可出下缘，出视口鼠标事件不扩选=停顿前零块首现实录）；
  // ②快照前等待首块可见（慢 runner 上 visual rAF 帧未 flush 即快照=同红面——
  // expect 等待替代即时快照，语义不变：拖选有块才前进）
  const vh = await win.evaluate(() => window.innerHeight)
  const sx = lb!.x + lb!.width * 0.2
  const sy = lb!.y + lb!.height / 2
  const ex = lb!.x + lb!.width * 0.8
  const ey = Math.min(lb!.y + lb!.height * 2.2, vh - 24)
  // [F-VISFB-53CI-01 诊断轮] 预拖采集+授权判定（本地健康基线=items 23/
  // two-column/授权 left——CI payload 与此对比即定位分叉点；探针档=仓外
  // 20261019-sel53ci-probe）
  const sel53Pre = await collectSel53PreDiag(win, sx, sy)
  const sel53VerdictData = sel53Verdict(sel53Pre, sx)
  const sel53PreSel = await sel53SelectionState(win)
  console.log(
    `[sel53-diag] items=${sel53Pre.items.length} layout=${String(sel53VerdictData.kind)} gutter=${JSON.stringify(sel53VerdictData.gutter)} ` +
      `auth=${JSON.stringify(sel53VerdictData.auth)} hitInTextLayer=${sel53Pre.hit === null ? 'null' : sel53Pre.hit.closestTextLayer} ` +
      `preSelection=${JSON.stringify(sel53PreSel)}`
  )
  try {
    await win.mouse.move(sx, sy)
    await win.mouse.down()
    for (let i = 1; i <= 6; i += 1) {
      await win.mouse.move(sx + ((ex - sx) * i) / 6, sy + ((ey - sy) * i) / 6)
      await win.waitForTimeout(80)
    }
    await expect(win.locator('[data-testid="selection-rect"]').first(), '停顿前 visual 帧块在场').toBeVisible({ timeout: 3_000 })
    const beforePause = await rectSnapshot(win)
    expect(beforePause.count, '停顿前 visual 帧块在场').toBeGreaterThanOrEqual(1)
    // [回炉轮1 W3+微回炉 W-2⒜] 停顿窗序列采样（300ms 窗 6 采样×50ms）：断言
    // 首采样==停顿前锚（块数+首块样式——停顿前 A→首采样前变 B 的形态在此红）+
    // 块数恒 ≥1（无空帧）+序列全等（采样粒度内无 A→B→A 交替/无双几何跳变）
    const pauseSamples = await collectPauseSamples(win, 6, 50)
    expect(pauseSamples[0]!.split(';').length, '首采样块数=停顿前锚（停顿前后一致闭合）').toBe(beforePause.count)
    expect(pauseSamples[0]!.split(';')[0]!, '首采样首块样式=停顿前锚').toBe(beforePause.first)
    expect(pauseSamples.every((s) => s.length > 0), `停顿窗块数恒 ≥1（采样序=${pauseSamples.map((s) => s.split(';').length).join(',')}）`).toBe(true)
    expect(new Set(pauseSamples).size, `停顿窗几何序列单调稳定（采样序=${pauseSamples.join(' => ')}）`).toBe(1)
    await win.mouse.move(ex, ey)
    await win.mouse.up()

    // 终局：工具条在场（mouseup 全量锚定成功——anchor 未退化）
    await expect(win.getByTestId('selection-toolbar')).toBeVisible({ timeout: 5_000 })

    // paint 域⊆锚栏：每块不越中缝（视口盒实测域）
    const rectBoxes = await win.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>('[data-testid="selection-rect"]')).map((b) => b.getBoundingClientRect().left + b.getBoundingClientRect().width)
    )
    expect(rectBoxes.length).toBeGreaterThanOrEqual(1)
    for (const right of rectBoxes) {
      expect(right).toBeLessThan(gutterMid)
    }

    // 空帧判别：观察器记录中，首个非零记录之后至 mouseup 不出现 0 块记录
    const counts = await win.evaluate(() => (window as unknown as { __sel53?: { counts: number[] } }).__sel53?.counts ?? [])
    const firstNonZero = counts.findIndex((n) => n > 0)
    expect(firstNonZero, '拖选期至少一次块渲染记录').toBeGreaterThanOrEqual(0)
    const during = counts.slice(firstNonZero)
    expect(during.every((n) => n > 0), `拖选全程无 0 块空帧记录（记录序=${counts.join(',')}）`).toBe(true)
  } catch (err) {
    // [F-VISFB-53CI-01 诊断轮] 失败现场 payload（attach 随 CI failure 产物上传；
    // best-effort——页面已死时仅存预拖面）
    const sel53Post = await collectSel53PostDiag(win).catch((e: unknown) => ({ error: String(e) }))
    const bundle = JSON.stringify(
      { pre: sel53Pre, verdict: sel53VerdictData, preSelection: sel53PreSel, drag: { sx, sy, ex, ey, vh, gutterMid }, post: sel53Post },
      null,
      2
    )
    console.log(`[sel53-diag] 失败现场：${bundle}`)
    await testInfo.attach('sel53-diag', { contentType: 'application/json', body: bundle })
    throw err
  }

  await app.close()
})
