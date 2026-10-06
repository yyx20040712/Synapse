import { test, expect } from '@playwright/test'
import { createHash } from 'node:crypto'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { bootstrapMigrations, launch, seedLineageGraph, seedPaperRow } from './e2e-env'

/**
 * [F-UIRES-03 B4③] 脉络右侧详情栏 resizer/收起 e2e —— 断言锚真实几何
 * （boundingBox 实测宽，非 CSS 字符串）：
 * - 拖右缘手柄超上限 → 480 钳；拖超下限 → 200 钳（useSidebarPane clamp）；
 * - [F-UIRES-03 B5② v1.15 第五轮③] 键盘调宽（APG separator）：手柄聚焦后
 *   End 直达 480 / ArrowLeft −16 / Home 直达 200+aria-valuenow 随动（四键
 *   全域=单测族承载，e2e 代表键直证接线）；
 * - reload 后宽保持（synapse:sidebar:width 持久恢复）；
 * - 头部收起钮 → 48px 窄条（点击任意处展开）→ 展开回记忆宽。
 * 手柄在右缘=右移变宽；超上限拖拽目标出视口——CDP 合成坐标可达（真鼠标
 * 出窗路径同源）。种子=幽灵行+单节点直写（保证 ready 态有内容——空图路径
 * 由单测族承载）。
 */

const P = { id: 'e2e-uires03-sb', title: '侧栏尺寸论文', year: 2023 } as const

test('详情栏拖拽调宽夹取 200–480+reload 持久+收起窄条往返', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-uires03-sb-'))
  await bootstrapMigrations(userData)
  const ghostSha = createHash('sha256').update(`uires03-${P.id}`).digest('hex')
  await seedPaperRow(
    userData,
    `${ghostSha.slice(0, 2)}/${ghostSha.slice(2, 4)}/${ghostSha}.pdf`,
    ghostSha,
    P.title,
    P.id,
    { year: P.year }
  )
  await seedLineageGraph(userData, {
    nodes: [{ paperId: P.id, title: P.title, year: P.year }],
    edges: []
  })

  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.setViewportSize({ width: 1280, height: 860 })
  await win.getByRole('button', { name: '脉络', exact: true }).click()

  const sidebar = win.getByTestId('lineage-sidebar')
  const panel = win.getByTestId('lineage-side-panel')
  await expect(panel).toBeVisible({ timeout: 10_000 })
  // 选中节点（收起钮驻「节点详情」头区——空态无头区；点卡=产品路径 P-13）
  await win.locator('.tl-card[data-node-id]').filter({ hasText: P.title }).click()
  await expect(win.getByTestId('lineage-sidebar-collapse')).toBeVisible({ timeout: 10_000 })
  // 初始缺省 252（JS 态行内承载——CSS .lg-inspector 252 为无 JS 回退）
  expect((await sidebar.boundingBox())!.width).toBeCloseTo(252, 0)

  /** 自手柄当前位置拖 dx（手柄=aside 右缘：右移变宽） */
  const dragBy = async (dx: number): Promise<void> => {
    const h = (await win.getByTestId('lineage-sidebar-resizer').boundingBox())!
    const x = h.x + h.width / 2
    const y = h.y + 120
    await win.mouse.move(x, y)
    await win.mouse.down()
    await win.mouse.move(x + dx, y, { steps: 6 })
    await win.mouse.up()
  }
  // 拖超上限 → 480 钳
  await dragBy(700)
  expect((await sidebar.boundingBox())!.width).toBeCloseTo(480, 0)
  // 拖超下限 → 200 钳
  await dragBy(-1200)
  expect((await sidebar.boundingBox())!.width).toBeCloseTo(200, 0)

  // [F-UIRES-03 B5②] 键盘调宽（APG separator——tabIndex=0 聚焦可达）：
  // End 直达 480 / ArrowLeft −16 → 464 / Home 直达 200；aria-valuenow 随动
  // （左右键对侧 +16+钳制全域=use-sidebar-pane 单测族承载，e2e 代表键直证接线。
  // 断言序=先 toHaveAttribute 自动重试锚 React commit 落定、再单读 bbox——
  // press 后 commit 异步，裸读宽有竞态〔探针实证〕）
  const rz = win.getByTestId('lineage-sidebar-resizer')
  await rz.focus()
  await expect(rz).toBeFocused()
  expect(await rz.getAttribute('aria-valuenow')).toBe('200')
  await win.keyboard.press('End')
  await expect(rz).toHaveAttribute('aria-valuenow', '480')
  expect((await sidebar.boundingBox())!.width).toBeCloseTo(480, 0)
  await win.keyboard.press('ArrowLeft')
  await expect(rz).toHaveAttribute('aria-valuenow', '464')
  expect((await sidebar.boundingBox())!.width).toBeCloseTo(464, 0)
  await win.keyboard.press('Home')
  await expect(rz).toHaveAttribute('aria-valuenow', '200')
  expect((await sidebar.boundingBox())!.width).toBeCloseTo(200, 0)

  // 收起→48px 窄条（钮承载全条点击面=点任意处展开）→展开回记忆宽 200
  await win.getByTestId('lineage-sidebar-collapse').click()
  await expect(win.getByTestId('lineage-sidebar-rail')).toBeVisible()
  expect((await sidebar.boundingBox())!.width).toBeCloseTo(48, 0)
  await win.getByTestId('lineage-sidebar-rail').click()
  await expect(panel).toBeVisible()
  expect((await sidebar.boundingBox())!.width).toBeCloseTo(200, 0)

  // reload 持久恢复：宽 200 保持（synapse:sidebar:width）
  await win.reload()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByRole('button', { name: '脉络', exact: true }).click()
  await expect(win.getByTestId('lineage-side-panel')).toBeVisible({ timeout: 10_000 })
  expect((await win.getByTestId('lineage-sidebar').boundingBox())!.width).toBeCloseTo(200, 0)

  await app.close()
})
