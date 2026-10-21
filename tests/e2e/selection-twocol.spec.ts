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
// [F-VISFB-53CI-01 诊断轮] 预拖段采集面保留（失败现场 attach=pre 数据）；
// [53CI-02 收尾] sel53Verdict Node 复算函数已删（死代码——诊断结论归档仓外
// 20261019-sel53ci-probe，src import 面同删）

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

/** [回炉轮1 W3→微回炉 W-2⒝ 改实] 停顿观察窗定时采样（50ms 粒度覆盖 300ms 停顿窗
 *  ——非逐 rAF 帧级：间隔内 <50ms 的 A→B→A 不可排除=接受边界；帧级防护由单测承载） */
async function collectPauseSamples(win: Page, samples: number, intervalMs: number): Promise<string[]> {
  const out: string[] = []
  for (let i = 0; i < samples; i += 1) {
    await win.waitForTimeout(intervalMs)
    out.push(await rectStylesSnapshot(win))
  }
  return out
}

/** [F-VISFB-53CI-01 诊断轮] 预拖段采集（几何判定面=失败现场 attach 的 pre 数据承载） */
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

/** [F-VISFB-53CI-01 诊断轮] 失败现场采集：selection 摘要+rects 盒与样式
 *  +变异计数+事件记录（__sel53ev——事件到达/target/阻止态） */
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
 *  target/默认阻止四问判别） */
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
    for (const type of ['mousedown', 'mouseup', 'mousemove', 'selectstart', 'dragstart'] as const) {
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

/** [F-VISFB-53CI-01 修复·A'] 锚位缓存+帧保活（body 恒值 CSS 动画排帧——合成器
 *  零帧=rAF 饥饿对策；升级失效形态=零块红，排查首查本注）。锚侧守卫（d1-W4）：
 *  caret 位不在 textLayer→不缓存；缓存前清旧槽防陈旧锚。 */
async function sel53CacheAnchor(win: Page, x: number, y: number): Promise<void> {
  await win.evaluate(
    ({ x, y }) => {
      const w = window as unknown as {
        __sel53ext?: { anchorNode: Node; anchorOffset: number; skips: number }
        __sel53keep?: Animation
      }
      w.__sel53keep = document.body.animate([{ opacity: '1' }, { opacity: '1' }], { duration: 60_000, iterations: Infinity })
      delete w.__sel53ext
      const doc = document as Document & { caretRangeFromPoint?: (x: number, y: number) => Range | null }
      const r = doc.caretRangeFromPoint?.(x, y) ?? null
      if (r === null) return
      const anchorEl =
        r.startContainer.nodeType === 1
          ? (r.startContainer as Element).closest('.textLayer')
          : r.startContainer.parentElement?.closest('.textLayer') ?? null
      if (anchorEl === null) return
      w.__sel53ext = { anchorNode: r.startContainer, anchorOffset: r.startOffset, skips: 0 }
    },
    { x, y }
  )
}

/** [F-VISFB-53CI-01 修复·A'] 程序化扩展写：caretRangeFromPoint 焦点投影+
 *  setBaseAndExtent 原子写（禁 removeAllRanges+addRange——中间空态污染空帧断言
 *  〔k1-N2 复还〕）；守卫全计入 skips（拖后断言=0）；写→画节拍=每步
 *  80ms 等待+断言轮询，不依赖单帧序（k1-N1）。 */
async function sel53ExtendSelectionTo(win: Page, x: number, y: number): Promise<void> {
  await win.evaluate(
    ({ x, y }) =>
      new Promise<void>((resolve) => {
        const w = window as unknown as { __sel53ext?: { anchorNode: Node; anchorOffset: number; skips: number } }
        const ext = w.__sel53ext
        const settle = (): void => {
          requestAnimationFrame(() => resolve())
          setTimeout(resolve, 500)
        }
        const countSkip = (): void => {
          if (ext !== undefined) ext.skips += 1
          settle()
        }
        const sel = window.getSelection()
        if (ext === undefined || sel === null || !ext.anchorNode.isConnected) {
          countSkip()
          return
        }
        const doc = document as Document & { caretRangeFromPoint?: (x: number, y: number) => Range | null }
        const r = doc.caretRangeFromPoint?.(x, y) ?? null
        const containerEl =
          r === null
            ? null
            : r.startContainer.nodeType === 1
              ? (r.startContainer as Element).closest('.textLayer')
              : r.startContainer.parentElement?.closest('.textLayer') ?? null
        if (r === null || containerEl === null) {
          countSkip()
          return
        }
        try {
          sel.setBaseAndExtent(ext.anchorNode, ext.anchorOffset, r.startContainer, r.startOffset)
        } catch {
          countSkip()
          return
        }
        settle()
      }),
    { x, y }
  )
}

/** [F-VISFB-53CI-01 修复·A' 轮二] 写后静默等待：几何稳定（连续 3 次采样全等）
 *  或预算尽——CI 慢 runner 排空延迟>停顿窗时采样窗内仍在追平（k1-N1：rAF 序
 *  无保证）；采样前静默=停顿契约锚在「真空闲稳定态」。
 *  [53CI-02 裁决部收口 5] 复审触发器：CI runner 换代/停顿窗族再红=复审信号——
 *  几何统一（A1/A2）已落地后本等待仍承载机理①（排空延迟与几何统一无关），
 *  撤销评估=届时复审位。 */
async function sel53WaitQuiescent(win: Page, budgetMs = 1_500): Promise<void> {
  const deadline = Date.now() + budgetMs
  let prev = await rectStylesSnapshot(win)
  let stable = 0
  while (Date.now() < deadline && stable < 3) {
    await win.waitForTimeout(40)
    const cur = await rectStylesSnapshot(win)
    if (cur === prev) {
      stable += 1
    } else {
      stable = 0
    }
    prev = cur
  }
}

// 〔F-VISFB-53CI-01 修复轮 2026-10-19·设计终裁 v2=A'〕根因四轮定谳：windows-latest
// +Electron 44 合成输入栈（CDP Input 全路径）无法产生原生选区扩展——一切鼠标手势
// 退化为「tap 置光标+drag 移光标」（app 零缺陷；Linux 同路径正常）。修复=刺激层 A'：
// 真实 mousedown/mouseup+扩展期程序化选区写（双平台唯一选区源）。覆盖边界（d1-W6）：
// 授权→管线→断言面零削弱；原生拖拽路径 CI 面不再覆盖（本地 Linux 面承载）。
// 「慢拖」契约载体=5+1 步渐进选区变化×80ms+300ms 停顿。断言原文逐字（指纹门）。
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
  // [CI 回执修复 2026-10-17] 拖拽终点纵向钳入视口（CI 1024×768 钳制窗）+快照前
  // 等待首块可见；[F-VISFB-53CI-01 修复·A'] 扩展段=程序化写步进（设计=头注段）
  const vh = await win.evaluate(() => window.innerHeight)
  const sx = lb!.x + lb!.width * 0.2
  const sy = lb!.y + lb!.height / 2
  const ex = lb!.x + lb!.width * 0.8
  const ey = Math.min(lb!.y + lb!.height * 2.2, vh - 24)
  // [F-VISFB-53CI-01] 预拖采集+授权判定（本地健康基线=items 23/two-column/
  // 授权 left——CI payload 对比定位分叉点；探针档=仓外 20261019-sel53ci-probe）
  const sel53Pre = await collectSel53PreDiag(win, sx, sy)
  console.log(
    `[sel53-diag] items=${sel53Pre.items.length} hitInTextLayer=${sel53Pre.hit === null ? 'null' : sel53Pre.hit.closestTextLayer}`
  )
  try {
    await win.mouse.move(sx, sy)
    await win.mouse.down()
    await sel53CacheAnchor(win, sx, sy)
    // [F-VISFB-53CI-01 修复·A' 补] 单步微移（+8,+2）=位移 8.25px 过 F-12 门槛
    // （横 8px≪行宽、纵 2px<行高半=恒落哨兵行盒内〔d1-N1〕——双平台首写前形态安全）
    await win.mouse.move(sx + 8, sy + 2)
    // [F-VISFB-53CI-01 修复·A'] 扩展期停发真实 mousemove（B4/W4——双平台选区
    // 唯一源）；循环 5 步至 5/6 插值点（d1-W1：终点步留停顿后=真渐进）
    for (let i = 1; i <= 5; i += 1) {
      await sel53ExtendSelectionTo(win, sx + ((ex - sx) * i) / 6, sy + ((ey - sy) * i) / 6)
      await win.waitForTimeout(80)
    }
    // [F-VISFB-53CI-01 修复·A' 轮二] 采样前静默（排空+并块迁移落定后快照）
    await sel53WaitQuiescent(win)
    await expect(win.locator('[data-testid="selection-rect"]').first(), '停顿前 visual 帧块在场').toBeVisible({ timeout: 3_000 })
    const beforePause = await rectSnapshot(win)
    expect(beforePause.count, '停顿前 visual 帧块在场').toBeGreaterThanOrEqual(1)
    // [回炉轮1 W3+微回炉 W-2⒜] 停顿窗序列采样（300ms 窗 6 采样×50ms）：首采样==
    // 停顿前锚+块数恒 ≥1+序列全等（无交替/无跳变）
    const pauseSamples = await collectPauseSamples(win, 6, 50)
    expect(pauseSamples[0]!.split(';').length, '首采样块数=停顿前锚（停顿前后一致闭合）').toBe(beforePause.count)
    expect(pauseSamples[0]!.split(';')[0]!, '首采样首块样式=停顿前锚').toBe(beforePause.first)
    expect(pauseSamples.every((s) => s.length > 0), `停顿窗块数恒 ≥1（采样序=${pauseSamples.map((s) => s.split(';').length).join(',')}）`).toBe(true)
    expect(new Set(pauseSamples).size, `停顿窗几何序列单调稳定（采样序=${pauseSamples.join(' => ')}）`).toBe(1)
    // [F-VISFB-53CI-01 修复·A'] 续拖小步=停顿后第 6 步渐进写至终点（d1-W1）；
    // 释放=真实 mouseup 于微移位非终点（d1-W2 释放点在锚行内=零重定向）
    await sel53ExtendSelectionTo(win, ex, ey)
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

    // [F-VISFB-53CI-01 修复] 选区 oracle 四面（追加=指纹门超集合法）：跳写=0/
    // 长度下界/含 'LCOL ROW'/不含 'RCOL'（上界——跨栏写即红）。分工：oracle 验
    // 刺激层定位；app 侧判别由块记录/域断言承载——勿删其一
    const sel53FinalText = await win.evaluate(() => window.getSelection()?.toString() ?? '')
    const sel53Skips = await win.evaluate(
      () => (window as unknown as { __sel53ext?: { skips: number } }).__sel53ext?.skips ?? -1
    )
    expect(sel53Skips, '扩展写零跳写（守卫静默回归红）').toBe(0)
    expect(sel53FinalText.length, '终局选区非空跨行（oracle）').toBeGreaterThanOrEqual(20)
    expect(sel53FinalText.includes('LCOL ROW'), '终局选区覆盖后续行（oracle）').toBe(true)
    expect(sel53FinalText.includes('RCOL'), '终局选区不越栏（oracle 上界）').toBe(false)

    // [F-VISFB-53CI-02 B5/B1] 间隙段：指针 y 落行间间隙偏上行侧+focus 违例（程序化写
    // 至右栏）→ enforce 投影=最近带（上带）行尾（旧「间隙取下带」契约即红）
    await win.keyboard.press('Escape')
    const row2Left = win.getByText('LCOL ROW 01').first()
    await row2Left.scrollIntoViewIfNeeded()
    // [RR2-2 d1-W1] 滚动后重取两栏哨兵盒（stale 坐标防 CI 窄窗滚动错位；本地两域同值）
    const lb2 = await leftRow.boundingBox()
    const rb2 = await rightRow.boundingBox()
    const b2 = await row2Left.boundingBox()
    expect(lb2).not.toBeNull()
    expect(rb2).not.toBeNull()
    expect(b2).not.toBeNull()
    const [sx2, sy2] = [lb2!.x + lb2!.width * 0.2, lb2!.y + lb2!.height / 2]
    const gapY = lb2!.y + lb2!.height + (b2!.y - (lb2!.y + lb2!.height)) * 0.25
    const gapX = rb2!.x - 4
    await win.mouse.move(sx2, sy2)
    await win.mouse.down()
    await sel53CacheAnchor(win, sx2, sy2)
    await win.mouse.move(gapX, gapY)
    await sel53ExtendSelectionTo(win, rb2!.x + rb2!.width / 2, rb2!.y + rb2!.height / 2)
    // [RR1 R1] 独立跳写守卫：CacheAnchor 已重置__sel53ext，skips 仅累计间隙段新写
    const skips2 = await win.evaluate(
      () => (window as unknown as { __sel53ext?: { skips: number } }).__sel53ext?.skips ?? -1
    )
    expect(skips2, '间隙段扩展写零跳写').toBe(0)
    // [RR1 R1] 排空延迟族防线（CI 慢 runner 写→画 rAF 序无保证）：稳定化复用
    await sel53WaitQuiescent(win)
    const gapProbe = await win.evaluate(() => {
      const s = window.getSelection()
      return { focusText: s?.focusNode?.parentElement?.textContent ?? '', selText: s?.toString() ?? '' }
    })
    expect(gapProbe.selText.length, '间隙段选区非空（堵静默 skip 盲区）').toBeGreaterThan(0)
    expect(gapProbe.focusText, '间隙拖动投影=最近带（上带）行——旧契约 focus 落下一行').toContain('ALPHA')
    expect(gapProbe.selText.includes('LCOL ROW 01'), '间隙拖动选区不含下一行（旧「间隙取下带」契约即红）').toBe(false)
    await win.mouse.up()
  } catch (err) {
    // [F-VISFB-53CI-01 修复] 失败现场 payload（attach 随 CI 产物上传；
    // best-effort——页面已死时仅存预拖面；CI 再红时的定性依据）
    const sel53Post = await collectSel53PostDiag(win).catch((e: unknown) => ({ error: String(e) }))
    const bundle = JSON.stringify(
      { pre: sel53Pre, drag: { sx, sy, ex, ey, vh, gutterMid }, post: sel53Post },
      null,
      2
    )
    console.log(`[sel53-diag] 失败现场：${bundle}`)
    await testInfo.attach('sel53-diag', { contentType: 'application/json', body: bundle })
    throw err
  }

  await app.close()
})
