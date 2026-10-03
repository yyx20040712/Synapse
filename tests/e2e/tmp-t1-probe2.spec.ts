// T1 探针 v2（2026-10-04 回炉——临时件跑完即删不入库）
// 首轮缺口补齐：edit 态完整 UI 路径（toolbar 占流位）+head 注入与修复后一致+全几何
import { test, expect, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { createTinyPdf, PDF_KNOWN_TEXT } from '../utils/pdf-factory'
import { bootstrapMigrations, launch, seedPaperRow } from './e2e-env'

const PAPERS = [
  { id: 'e2e-lg-root', title: '脉络根文献', year: 2020, real: false },
  { id: 'e2e-lg-a', title: '脉络甲文献', year: 2022, real: true },
  { id: 'e2e-lg-b', title: '脉络乙文献', year: 2023, real: false }
] as const

function nodeG(win: Page, title: string) {
  return win.locator('.tl-card[data-node-id]').filter({ hasText: title })
}

async function addPaperNodeViaUi(win: Page, title: string): Promise<void> {
  await win.getByTestId('lineage-mode-edit').click()
  await win.getByTestId('lineage-add-node').click()
  await win.getByTestId('add-node-search').fill(title)
  const item = win.getByRole('dialog').locator('li button').filter({ hasText: title }).first()
  await expect(item).toBeVisible({ timeout: 10_000 })
  await item.click()
  await win.getByRole('dialog').getByRole('button', { name: '添加', exact: true }).click()
  await expect(nodeG(win, title)).toBeVisible({ timeout: 10_000 })
}

async function linkNodesViaUi(win: Page, fromTitle: string, toTitle: string): Promise<void> {
  const from = nodeG(win, fromTitle)
  await from.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  await from.click({ button: 'right' })
  await win.getByTestId('lineage-node-menu').getByRole('menuitem', { name: '连线到…' }).click()
  await expect(win.getByTestId('lineage-pending-link')).toBeVisible()
  await nodeG(win, toTitle).click()
}

async function fullGeo(win: Page, tag: string): Promise<void> {
  const data = await win.evaluate(() => {
    const tl = document.querySelector('.timeline') as HTMLElement | null
    const years = [...document.querySelectorAll('.tl-year')].map((y) => {
      const r = y.getBoundingClientRect()
      return { y: r.y, h: r.height, text: (y.textContent || '').slice(0, 12) }
    })
    const content = document.querySelector('.tl-content') as HTMLElement | null
    const toolbar = document.querySelector('.lg-toolbar') as HTMLElement | null
    const contentPrev = content?.previousElementSibling
    return {
      innerW: window.innerWidth,
      innerH: window.innerHeight,
      dpr: window.devicePixelRatio,
      timelineRect: tl ? tl.getBoundingClientRect().toJSON() : null,
      scrollTop: tl?.scrollTop ?? null,
      scrollHeight: tl?.scrollHeight ?? null,
      clientHeight: tl?.clientHeight ?? null,
      computedOverflow: tl ? getComputedStyle(tl).overflowY : null,
      years,
      contentRect: content ? content.getBoundingClientRect().toJSON() : null,
      contentMinH: content ? getComputedStyle(content).minHeight : null,
      contentInlineMinH: content?.style.minHeight ?? null,
      toolbar: toolbar
        ? { y: toolbar.getBoundingClientRect().y, h: toolbar.getBoundingClientRect().height, visible: toolbar.offsetParent !== null }
        : null,
      contentPrev: contentPrev
        ? { tag: contentPrev.tagName, cls: contentPrev.className, h: contentPrev.getBoundingClientRect().height }
        : null
    }
  })
  console.log(`PROBE2 ${tag}: ${JSON.stringify(data)}`)
}

test('T1 几何探针 v2（edit 态 UI 全路径）', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-t1p2-'))
  await bootstrapMigrations(userData)
  for (const p of PAPERS) {
    if (!p.real) {
      const sha = createHash('sha256').update(`lg-ghost-${p.id}`).digest('hex')
      const ref = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
      await seedPaperRow(userData, ref, sha, p.title, p.id, { year: p.year })
      continue
    }
    const bytes = createTinyPdf(`${p.title} ${PDF_KNOWN_TEXT}`)
    const sha = createHash('sha256').update(bytes).digest('hex')
    const ref = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
    const abs = join(userData, 'files', ...ref.split('/'))
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, bytes)
    await seedPaperRow(userData, ref, sha, p.title, p.id, { year: p.year })
  }
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByRole('button', { name: '脉络', exact: true }).click()
  await expect(win.getByText('暂无脉络图——添加节点')).toBeVisible({ timeout: 10_000 })

  for (const p of PAPERS) {
    await addPaperNodeViaUi(win, p.title)
  }
  await linkNodesViaUi(win, '脉络根文献', '脉络甲文献')
  await linkNodesViaUi(win, '脉络根文献', '脉络乙文献')
  await expect(win.getByText('脉络根文献')).toBeVisible()

  await fullGeo(win, 'preInject')
  // head 注入（与 t1race 修复后一致）
  await win.evaluate(() => {
    const style = document.createElement('style')
    style.id = 'e2e-tl-scroll-domain'
    style.textContent = '.tl-content { min-height: 2000px !important }'
    document.head.append(style)
  })
  await fullGeo(win, 'postInject')
  const scrolled = await win.locator('.timeline').evaluate((el) => {
    el.scrollTo(0, 300)
    return el.scrollTop
  })
  console.log(`PROBE2 scrolled300=${scrolled}`)
  await fullGeo(win, 'postScroll300')
  // close 在 edit 态挂起（Windows Electron 已知慢退）——race 兜底，数据已全采
  await Promise.race([app.close(), new Promise((r) => setTimeout(r, 5000))])
})
