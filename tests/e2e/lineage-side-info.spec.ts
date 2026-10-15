import { test, expect, type ElectronApplication, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { bootstrapMigrations, launch, seedLineageGraph, seedPaperRow } from './e2e-env'

/**
 * [F-UIRES-04 批 3b] 脉络侧板标签行+论文信息区 e2e（设计书 §4.12 验收判据
 * 映射——R8 票面授权新 spec 面）：
 * - 判据①（真实文本）+④（机构禁用位文案在场）：选中文献节点→侧板渲染
 *   作者子串/摘要前 N 字/标签名（M1 detail 链 paperInfoStore→api.library.
 *   detail；标签行=头部 TagsRow 自持订阅）；
 * - 判据②（空态机检）：无标签文献→标签行整行不存在（缺席省略——先断言
 *   信息区在场证明 M1 ready，再断言缺席，防「未加载即缺席」假阴性）；
 * - 判据③（滚动承载机检）：长摘要展开后 scrollHeight>clientHeight 且头部
 *   操作行（.side-jumps——滚动容器 .insp-scroll 之外）滚动前后 y 不变；
 * - 判据⑤（strip 降级面）：seed 无真 PDF 文件→M2 自建 getDocument 失败
 *   （app-file 404）→strip 省略+重试微钮在场（I4 降级不挡主件——作者文本
 *   仍在场）。真 PDF 提取面挂视检/CI 后续票（票面降级申报）。
 * 种子=seedPaperRow 双行+seedLineageGraph 双节点（A=标签/作者/长摘要，
 * B=作者无标签）；authors/abstract 经 seed-lineage.mjs 信息区种子面 UPDATE
 * （papers 既有列）。夹具协议沿承 lineage-sidebar.spec（1280×860/20s 首屏）。
 */

const A = { id: 'e2e-uires04-b3b-a', title: '信息区主论文', year: 2024 } as const
const B = { id: 'e2e-uires04-b3b-b', title: '无标签对照论文', year: 2023 } as const
const AUTHORS_A = ['张三丰', '李四光', '王二三']
const ABSTRACT_A = '信息区摘要锚句起首：面向智慧水务场景的长文综述。'.concat(
  '水处理与膜分离耦合工艺在给水与再生水场景的能效权衡研究持续深化。'.repeat(80)
)

async function seedFixture(userData: string): Promise<void> {
  for (const p of [A, B]) {
    const sha = createHash('sha256').update(`uires04-b3b-${p.id}`).digest('hex')
    await seedPaperRow(
      userData,
      `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`,
      sha,
      p.title,
      p.id,
      { year: p.year }
    )
  }
  await seedLineageGraph(userData, {
    nodes: [
      {
        paperId: A.id,
        title: A.title,
        year: A.year,
        libraryTags: ['水处理', '膜分离'],
        authors: [...AUTHORS_A],
        abstract: ABSTRACT_A
      },
      { paperId: B.id, title: B.title, year: B.year, authors: ['王五'] }
    ],
    edges: []
  })
}

/** 播种+启动+进脉络+选中指定卡（P-13 点卡产品路径——返回 app/win 供断言与收尾） */
async function openPanelOn(
  userData: string,
  title: string
): Promise<{ app: ElectronApplication; win: Page }> {
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.setViewportSize({ width: 1280, height: 860 })
  await win.getByRole('button', { name: '脉络', exact: true }).click()
  await win.locator('.tl-card[data-node-id]').filter({ hasText: title }).click()
  return { app, win }
}

test('选中文献节点→信息区渲染真实文本（作者/摘要/标签）+机构禁用位在场', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-uires04-b3b-'))
  await bootstrapMigrations(userData)
  await seedFixture(userData)
  const { app, win } = await openPanelOn(userData, A.title)

  // 判据①：M1 ready 后信息区在场+三件真实文本（作者子串/摘要前 N 字/标签名）
  await expect(win.getByTestId('paper-info-section')).toBeVisible({ timeout: 10_000 })
  await expect(win.getByTestId('paper-info-authors')).toContainText('张三丰')
  await expect(win.getByTestId('paper-info-abstract')).toContainText('信息区摘要锚句起首')
  const tagsRow = win.getByTestId('lineage-side-tags')
  await expect(tagsRow).toBeVisible()
  await expect(tagsRow).toContainText('水处理')
  await expect(tagsRow).toContainText('膜分离')
  // 判据④：机构禁用位文案在场（呈裁 A(c) 禁用呈现——星标 P-11 先例同款）
  await expect(win.getByText('机构信息待数据库升级后开放')).toBeVisible()

  await app.close()
})

test('无标签文献→标签行整行省略（空态机检）', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-uires04-b3b-'))
  await bootstrapMigrations(userData)
  await seedFixture(userData)
  const { app, win } = await openPanelOn(userData, B.title)

  // M1 ready 证明（B 作者在场=信息区已就绪）→标签行缺席非「未加载」假阴性
  await expect(win.getByTestId('paper-info-authors')).toContainText('王五', { timeout: 10_000 })
  await expect(win.getByTestId('lineage-side-tags')).toHaveCount(0)

  await app.close()
})

test('信息区随笔记区同滚动承载（内容超高+头部操作行不滚）', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-uires04-b3b-'))
  await bootstrapMigrations(userData)
  await seedFixture(userData)
  const { app, win } = await openPanelOn(userData, A.title)
  await expect(win.getByTestId('paper-info-section')).toBeVisible({ timeout: 10_000 })

  // 摘要展开（M3 本地态）→全文撑高滚动容器
  await win.getByTestId('paper-info-abstract-toggle').click()
  const scroll = win.locator('.insp-scroll')
  await expect
    .poll(async () => scroll.evaluate((el) => el.scrollHeight - el.clientHeight))
    .toBeGreaterThan(0)

  // 头部不滚：side-jumps 在滚动容器外，容器滚动前后视口 y 不变
  const jumpsBefore = await win.locator('.side-jumps').boundingBox()
  await scroll.evaluate((el) => {
    el.scrollTop = 120
  })
  expect(await scroll.evaluate((el) => el.scrollTop)).toBeGreaterThan(0)
  const jumpsAfter = await win.locator('.side-jumps').boundingBox()
  expect(jumpsAfter!.y).toBe(jumpsBefore!.y)

  await app.close()
})

test('无真 PDF 场图片提取失败→strip 省略+重试微钮在场（I4 降级不挡主件）', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-uires04-b3b-'))
  await bootstrapMigrations(userData)
  await seedFixture(userData)
  const { app, win } = await openPanelOn(userData, A.title)
  await expect(win.getByTestId('paper-info-section')).toBeVisible({ timeout: 10_000 })

  // M2 自建提取失败（seed 只种 papers 行不落 PDF 文件→app-file 404）→error：
  // strip 省略+重试微钮在场；主件（作者文本）不受降级影响
  await expect(win.getByTestId('paper-info-strip-retry')).toBeVisible({ timeout: 10_000 })
  await expect(win.getByTestId('paper-info-strip')).toHaveCount(0)
  await expect(win.getByTestId('paper-info-authors')).toContainText('张三丰')

  await app.close()
})
