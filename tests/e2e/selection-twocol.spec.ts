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

test('F-VISFB-53 双栏拖选闪烁收口：慢拖+停顿无空帧无跳变+paint 域⊆锚栏+终局工具条', async () => {
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

  // 慢拖左栏：行首起 → 逐帧步进右下（栏内）→ 停顿 300ms（>200ms settle 窗）
  // → 续拖小步 → 释放
  const sx = lb!.x + lb!.width * 0.2
  const sy = lb!.y + lb!.height / 2
  const ex = lb!.x + lb!.width * 0.8
  const ey = lb!.y + lb!.height * 2.2
  await win.mouse.move(sx, sy)
  await win.mouse.down()
  for (let i = 1; i <= 6; i += 1) {
    await win.mouse.move(sx + ((ex - sx) * i) / 6, sy + ((ey - sy) * i) / 6)
    await win.waitForTimeout(80)
  }
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

  await app.close()
})
