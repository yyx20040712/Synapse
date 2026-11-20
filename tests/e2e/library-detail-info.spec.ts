import { test, expect, type ElectronApplication, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { bootstrapMigrations, launch, seedLineageGraph, seedPaperRow } from './e2e-env'

/**
 * [F-UIRES-04 批 3c] 文献库详情面板重排 e2e（设计书 §4.1 library 块+§4.5
 * E 裁决布局+§4.12 判据「两域同构机检/滚动承载机检」行——R5 票面授权新
 * spec 面）：
 * - 例①（真实文本+机构禁用位在场）：文献库选中文→抽屉论文元数据区
 *   （DrPaperInfo 内嵌 PaperInfoSection）渲染作者子串/摘要锚句——seed 复用
 *   authors/abstract 种子面（papers 既有列 UPDATE）；机构禁用位文案在场
 *   （呈裁 A(c)——两域同款）。
 * - 例②（两域同构机检）：同 paperId 库详情面板与脉络侧板渲染同作者文本
 *   （e2e 内两视图先后切换取同文断言——§4.12 判据行字面）。
 * - 例③（滚动承载机检）：长摘要展开→.lib-dr scrollHeight>clientHeight
 *   （E 裁决右侧滚动条——滚动承载自 .lib-dr-body 局部上移 .lib-dr 全区）。
 * - 例④（键值行在场=搬移丢面回归锁）：YEAR-MO/VENUE 行在场（DrKeyVals
 *   拆件后 .lib-fld 族 DOM 锚不变——防拆件丢面）。
 * - 例⑤（[B3] 引用分节全流程）：引用区真实文本可见（GB/T 7714 默认——
 *   作者/题名[J]/期刊/年份段）→切 APA 文本变化（(年份) 段形）→复制→
 *   toast「引用已复制」。
 * 种子=seedPaperRow+seedLineageGraph 单节点（A=作者三人/长摘要/脉络节点
 * ——例②侧板同构面需 A 在脉络图中）；夹具协议沿承 lineage-side-info.spec
 * （1280×860/20s 首屏）。
 */

const A = { id: 'e2e-uires04-b3c-a', title: '库域信息区论文', year: 2024 } as const
const VENUE_A = 'Water Res.'
const AUTHORS_A = ['张三丰', '李四光', '王二三']
const ABSTRACT_A = '库域摘要锚句起首：面向智慧水务场景的长文综述。'.concat(
  '水处理与膜分离耦合工艺在给水与再生水场景的能效权衡研究持续深化。'.repeat(80)
)

async function seedFixture(userData: string): Promise<void> {
  const sha = createHash('sha256').update(`uires04-b3c-${A.id}`).digest('hex')
  await seedPaperRow(
    userData,
    `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`,
    sha,
    A.title,
    A.id,
    { year: A.year, venue: VENUE_A }
  )
  await seedLineageGraph(userData, {
    nodes: [
      {
        paperId: A.id,
        title: A.title,
        year: A.year,
        authors: [...AUTHORS_A],
        abstract: ABSTRACT_A
      }
    ],
    edges: []
  })
}

/** 播种+启动+文献库视图选中指定行（返回 app/win 供断言与收尾） */
async function openDrawerOn(userData: string): Promise<{ app: ElectronApplication; win: Page }> {
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.setViewportSize({ width: 1280, height: 860 })
  // [v2 第二期] 窄窗首进默认收起（≤1320）——抽屉断言面前置展开（行为源=
  // 计划 §4 第二期状态表；既有断言意图不变）
  await win.locator('.lib-detail-toggle').click()
  await win.locator('.lib-row', { hasText: A.title }).click()
  return { app, win }
}

test('文献库选中文→抽屉论文元数据区渲染真实文本+机构禁用位在场', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-uires04-b3c-'))
  await bootstrapMigrations(userData)
  await seedFixture(userData)
  const { app, win } = await openDrawerOn(userData)
  const drawer = win.locator('.lib-drawer')

  // 论文元数据区在场（DrPaperInfo 内嵌 PaperInfoSection）+真实文本两锚
  await expect(drawer.getByTestId('paper-info-section')).toBeVisible({ timeout: 10_000 })
  await expect(drawer.getByTestId('paper-info-authors')).toContainText('张三丰')
  await expect(drawer.getByTestId('paper-info-abstract')).toContainText('库域摘要锚句起首')
  // 机构禁用位文案在场（呈裁 A(c) 禁用呈现——两域同款）
  await expect(drawer.getByText('机构信息待数据库升级后开放')).toBeVisible()

  await app.close()
})

test('两域同构：同 paperId 库详情面板与脉络侧板渲染同作者文本', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-uires04-b3c-'))
  await bootstrapMigrations(userData)
  await seedFixture(userData)
  const { app, win } = await openDrawerOn(userData)
  const drawer = win.locator('.lib-drawer')

  const libAuthors = await drawer.getByTestId('paper-info-authors').textContent()
  expect(libAuthors).toContain('张三丰')

  // 切脉络视图选中同 paperId 卡→侧板信息区（M1 链）渲染同作者文本
  await win.getByRole('button', { name: '脉络', exact: true }).click()
  await win.locator('.tl-card[data-node-id]').filter({ hasText: A.title }).click()
  const sideAuthors = win.getByTestId('paper-info-authors')
  await expect(sideAuthors).toContainText('张三丰', { timeout: 10_000 })
  await expect(sideAuthors).toHaveText(libAuthors ?? '')
  // [r2 d1-W3→F-VISFB-43 换源] 跨页同篇切换终态断言：seed 无真 PDF→零 figures
  // （无导入事件无 job→figures.list 空）→strip 省略+重试微钮随管线退役——
  // 降级终态不因跨页切换丢失（I4 语义沿承：主件作者文本两面板一致）
  await expect(win.getByTestId('paper-info-strip-retry')).toHaveCount(0)
  await expect(win.getByTestId('paper-info-strip')).toHaveCount(0)

  await app.close()
})

test('抽屉滚动承载：长摘要展开→.lib-dr 内容超高（scrollHeight>clientHeight）', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-uires04-b3c-'))
  await bootstrapMigrations(userData)
  await seedFixture(userData)
  const { app, win } = await openDrawerOn(userData)
  await expect(win.locator('.lib-drawer').getByTestId('paper-info-section')).toBeVisible({
    timeout: 10_000
  })

  // 摘要展开（M3 本地态）→全文撑高滚动容器（E 裁决右侧滚动条）
  await win.getByTestId('paper-info-abstract-toggle').click()
  const scroll = win.locator('.lib-dr')
  await expect
    .poll(async () => scroll.evaluate((el) => el.scrollHeight - el.clientHeight))
    .toBeGreaterThan(0)

  await app.close()
})

test('键值行在场：YEAR-MO/VENUE 行在抽屉渲染（DrKeyVals 拆件回归锁）', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-uires04-b3c-'))
  await bootstrapMigrations(userData)
  await seedFixture(userData)
  const { app, win } = await openDrawerOn(userData)
  const drawer = win.locator('.lib-drawer')

  await expect(drawer.getByTestId('paper-info-section')).toBeVisible({ timeout: 10_000 })
  // A 在脉络图（seedLineageGraph 节点）→YEAR-MO 带脉络框括注；部分匹配锚
  await expect(drawer.locator('.lib-fld', { hasText: 'YEAR-MO' })).toContainText('2024')
  await expect(drawer.locator('.lib-fld', { hasText: 'VENUE' })).toContainText(VENUE_A)

  await app.close()
})

test('[B3] 引用分节：三格式真实文本+切换+复制（toast 引用已复制）', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-b3-cit-lib-'))
  await bootstrapMigrations(userData)
  await seedFixture(userData)
  const { app, win } = await openDrawerOn(userData)

  // 默认 GB/T 7714：真实文本（作者三人全列+题名[J]+期刊, 年份——种子无 DOI 段省略）
  const citation = win.getByTestId('dr-citation')
  await expect(citation).toBeVisible({ timeout: 10_000 })
  const text = citation.getByTestId('citation-text')
  // 预览文本本体可见（外层可见≠文本可见——[B3 审查回炉 W-2]）
  await expect(text).toBeVisible()
  await expect(text).toContainText('张三丰, 李四光, 王二三. 库域信息区论文[J]. Water Res., 2024.')
  // 切 APA：文本变化（(2024) 段形+URL 段缺席——种子无 DOI）+切换后仍可见
  await citation.getByRole('button', { name: 'APA' }).click()
  await expect(text).toBeVisible()
  await expect(text).toContainText('张三丰, 李四光, & 王二三 (2024). 库域信息区论文. Water Res.')
  // 复制：renderer 侧 writeText 当前文本+toast
  await citation.getByRole('button', { name: '复制引用' }).click()
  await expect(win.getByText('引用已复制')).toBeVisible({ timeout: 5_000 })
  await app.close()
})
