/**
 * [B1-U1→U2] 选区正确性战役 A1–A5 真机 e2e 用例（2026-11-21；U2 按主控终裁 5
 * 激活——断言面=合成 mousedown 的 defaultPrevented/程序化写，选区状态一律
 * 程序化写）。
 *
 * **输入栈口径（INV-170② 申报）**：三案的输入面是控制器 mousedown 行为本身
 * （非原生拖选扩展），故 mousedown 用**合成事件**（page.evaluate 内
 * dispatchEvent）——CI 合成输入栈可承载，断言面=事件 dispatchEvent 返回值
 * （即 defaultPrevented）与随后程序化写出的选区形态；选区产生一律
 * setBaseAndExtent（INV-170「选区产生程序化写」）。
 *
 * 三案 oracle：
 *  - A4-①（createFormulaPagePdf）：公式行内空隙合成 mousedown → 其后
 *    anchorNode 应为 textLayer 内**文本节点**（坍缩投影位），非 DIV.textLayer
 *    容器元素槽位（探针 F2/F3：槽位文本位与视觉无对应→原生翻转）；
 *  - A2（createTwoColumnGapPdf）：程序化选区覆盖左右栏 → selection-rect
 *    每视觉行 2 块且无块横贯缝带（探针 F9：1 块横贯盖缝）；
 *  - A1（createTwoColumnPdf+种入标注）：常规模式合成 mousedown 落标注矩形
 *    → defaultPrevented=true（单元 2 拦截）+零垃圾选区（探针 F6/F8：S7
 *    toString 3037 字符+46 块灰底 / S5 静默零选区）。
 */
import { test, expect, type ElectronApplication, type Page } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import {
  createFormulaPagePdf,
  createTwoColumnGapPdf,
  createTwoColumnPdf,
  PDF_FORMULA_TAIL,
  PDF_TWOCOL_FOOTER,
  PDF_TWOCOL_HEADER,
  PDF_TWOCOL_LEFT,
  PDF_TWOCOL_TITLE
} from '../utils/pdf-factory'
import { bootstrapMigrations, launch, seedAnnotation, seedPaperRow } from './e2e-env'

/** 各用例打开的 Electron 应用句柄：用例结束显式关闭（单实例锁在默认 userData
 *  域，未关的上一个应用会令下一次 electron.launch 立即退出——flake 台账
 *  FLK-03 同族） */
const openApps: ElectronApplication[] = []
test.afterEach(async () => {
  for (const app of openApps.splice(0)) {
    await app.close().catch(() => undefined)
  }
})

/** 导入 fixture 文献并打开阅读器（selection-twocol.spec 同款装配）；返回首窗 */
async function openSeededPdf(
  bytes: Uint8Array,
  title: string,
  paperId = 'e2e-seed-paper'
): Promise<Page> {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-b1red-'))
  await bootstrapMigrations(userData)
  const sha = createHash('sha256').update(bytes).digest('hex')
  const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
  const abs = join(userData, 'files', ...fileRef.split('/'))
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, bytes)
  await seedPaperRow(userData, fileRef, sha, title, paperId)
  const app = await launch(userData)
  openApps.push(app)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByText(title).first().dblclick()
  return win
}

/** 合成 mousedown（button 0/bubbles/cancelable）落指定选择器命中的元素：
 *  clientX/Y 由调用方给出（视口坐标）；返回 defaultPrevented */
async function synthMouseDown(win: Page, selector: string, x: number, y: number): Promise<boolean> {
  return win.evaluate(
    ({ selector, x, y }) => {
      const el = document.querySelector(selector)
      if (el === null) throw new Error(`synthMouseDown: 未找到 ${selector}`)
      const ev = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        button: 0,
        clientX: x,
        clientY: y
      })
      el.dispatchEvent(ev)
      return ev.defaultPrevented
    },
    { selector, x, y }
  )
}

test('A4-① 公式行内空隙合成 mousedown：anchor 应为文本节点坍缩投影位（非容器元素槽位）', async () => {
  const win = await openSeededPdf(createFormulaPagePdf(), '智慧水务 e2e B1 A4 槽位', 'b1red-a4')
  const tail = win.getByText(PDF_FORMULA_TAIL).first()
  await expect(tail).toBeVisible({ timeout: 20_000 })
  await tail.scrollIntoViewIfNeeded()
  const box = await tail.boundingBox()
  expect(box).not.toBeNull()
  // 公式行内空隙（tail 左侧行内大空隙——无 span 命中点；探针 F10 形态）
  const gapX = box!.x - 12
  const gapY = box!.y + box!.height / 2
  const prevented = await synthMouseDown(win, '.textLayer', gapX, gapY)
  // 授权点（非 span）：不 preventDefault（原生拖选扩展保持启动）
  expect(prevented).toBe(false)
  const anchor = await win.evaluate(() => {
    const sel = window.getSelection()
    return {
      nodeType: sel?.anchorNode?.nodeType ?? -1,
      isElementSlot: sel?.anchorNode?.nodeType === 1 && (sel.anchorNode as Element).classList?.contains('textLayer'),
      collapsed: sel?.isCollapsed ?? null
    }
  })
  // 修复单元 1-①：anchor=文本节点（坍缩投影位）；修前=DIV.textLayer 容器
  // 元素槽位（探针 F2：槽位文本位=某 span 之前，与视觉无对应）
  expect(anchor.isElementSlot).toBe(false)
  // Node.TEXT_NODE=3（Playwright 测试进程无 DOM 全局）
  expect(anchor.nodeType).toBe(3)
  expect(anchor.collapsed).toBe(true)
})

test('A2 跨栏行程序化选区：每视觉行 2 块且无块横贯缝带', async () => {
  const win = await openSeededPdf(createTwoColumnGapPdf(), '智慧水务 e2e B1 A2 缝感知', 'b1red-a2')
  const left = win.getByText('LGAP SENTINEL HEAD', { exact: false }).first()
  await expect(left).toBeVisible({ timeout: 20_000 })
  await left.scrollIntoViewIfNeeded()
  // INV-170：程序化选区（textLayer 全文 setBaseAndExtent——首 span 起至末
  // span 尾），非原生拖选扩展
  await win.evaluate(() => {
    const layer = document.querySelector('.textLayer')
    if (layer === null) return
    const walker = document.createTreeWalker(layer, NodeFilter.SHOW_TEXT)
    let first: Text | null = null
    let last: Text | null = null
    for (let n = walker.nextNode() as Text | null; n !== null; n = walker.nextNode() as Text | null) {
      if (n.data.length === 0) continue
      if (first === null) first = n
      last = n
    }
    if (first !== null && last !== null) {
      window.getSelection()!.setBaseAndExtent(first, 0, last, last.data.length)
    }
  })
  await win.waitForTimeout(400)
  const out = await win.evaluate(() => {
    const layer = document.querySelector('.textLayer')
    if (layer === null) return { count: 0, spanning: 0, gutterOk: false }
    const spans = Array.from(layer.querySelectorAll('span'))
    const boxes = spans.map((s) => s.getBoundingClientRect())
    // 缝带=左栏行右缘最大值至右栏行左缘最小值（fixture 文本前缀单源）
    const leftMax = Math.max(
      ...spans.filter((s) => /^(L|lgap)/.test(s.textContent ?? '')).map((s) => s.getBoundingClientRect().right)
    )
    const rightMin = Math.min(
      ...spans.filter((s) => /^(R|rgap)/.test(s.textContent ?? '')).map((s) => s.getBoundingClientRect().left)
    )
    // 块几何读真实盒（selection-rect 样式为百分比，须换算视口坐标）
    const rects = Array.from(document.querySelectorAll<HTMLElement>('[data-testid="selection-rect"]')).map((r) => {
      const b = r.getBoundingClientRect()
      return { left: b.left, right: b.right }
    })
    return {
      count: rects.length,
      spanning: rects.filter((r) => r.left < leftMax && r.right > rightMin).length,
      gutterOk: boxes.length === 12 && rightMin > leftMax
    }
  })
  // 6 视觉行×左右栏=12 块（修前 6——mergeRects 行内 x 并集盖缝）；缝区横贯块=0
  expect(out.gutterOk).toBe(true)
  expect(out.count).toBe(12)
  expect(out.spanning).toBe(0)
})

test('A1 常规模式合成 mousedown 落标注矩形：preventDefault+零垃圾选区', async () => {
  const bytes = createTwoColumnPdf()
  const userData = await mkdtemp(join(tmpdir(), 'synapse-b1red-'))
  await bootstrapMigrations(userData)
  const sha = createHash('sha256').update(bytes).digest('hex')
  const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
  const abs = join(userData, 'files', ...fileRef.split('/'))
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, bytes)
  const paperId = 'b1red-a1-paper'
  await seedPaperRow(userData, fileRef, sha, '智慧水务 e2e B1 A1 拦截', paperId)
  // 种入盖住左栏哨兵行的标注（F6 形态：常规模式矩形参与命中、无
  // pointer-events:none）。哨兵页内偏移=前序三项（标题/页眉/页脚）拼接长度
  // ——配方内容流同序，原位校验可命中。
  const leftOffset = PDF_TWOCOL_TITLE.length + PDF_TWOCOL_HEADER.length + PDF_TWOCOL_FOOTER.length
  await seedAnnotation(userData, {
    id: 'b1red-a1-anno',
    paperId,
    page: 0,
    kind: 'highlight',
    color: 'green',
    quoteText: PDF_TWOCOL_LEFT,
    prefixText: '',
    suffixText: '',
    startOffset: leftOffset,
    endOffset: leftOffset + PDF_TWOCOL_LEFT.length,
    comment: ''
  })
  const app = await launch(userData)
  openApps.push(app)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByText('智慧水务 e2e B1 A1 拦截').first().dblclick()
  const sentinel = win.getByText(PDF_TWOCOL_LEFT).first()
  await expect(sentinel).toBeVisible({ timeout: 20_000 })
  await sentinel.scrollIntoViewIfNeeded()
  const rectEl = win.locator('[data-testid="annotation-rect"]').first()
  await expect(rectEl).toBeVisible({ timeout: 20_000 })
  const rectBox = await rectEl.boundingBox()
  expect(rectBox).not.toBeNull()
  // 合成 mousedown 落标注矩形：单元 2 拦截（preventDefault+不启动会话）
  const prevented = await synthMouseDown(
    win,
    '[data-testid="annotation-rect"]',
    rectBox!.x + rectBox!.width / 2,
    rectBox!.y + rectBox!.height / 2
  )
  expect(prevented).toBe(true)
  const after = await win.evaluate(() => ({
    len: window.getSelection()?.toString().length ?? 0,
    rects: document.querySelectorAll('[data-testid="selection-rect"]').length
  }))
  // 下游可见形态=零垃圾选区/零灰底（S7 形态 toString 3037 字符+46 块在修前）
  expect(after.len).toBe(0)
  expect(after.rects).toBe(0)
})
