import { test, expect, type Locator, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import {
  bootstrapMigrations,
  launch,
  liveDbScript,
  seedLineageGraph,
  seedPaperRow,
  switchLineageGraph
} from './e2e-env'
import { createTinyPdf, PDF_KNOWN_TEXT } from '../utils/pdf-factory'

/**
 * [R1-WS2] 课题切换 e2e（验收判据场景，ADR-0018——always-active，无工单门）。
 * [T3-P2] 壳层改版重写：顶栏 WorkspaceSwitcher 退役——新建/切换走 rail 课题
 * 入口。[F-WS-02] 弹层 WsRailPopover 退役：课题钮=路由 workspaces 管理页
 * （卡片列表/新建/改名/切换），设置页课题管理节同批退役；断言锚=课题真实文本
 * （[B5 wave C 2026-11-25] 状态条整删——原「状态条课题名/篇数」锚改管理页当前卡/rail 短名/文献库计数，
 * 见下方替代锚 helper；脉络空态锚改画布在场——见 expectEmptyLineageCanvas）+管理页卡片真实文本。
 *
 * 链路（[F-WS-02] R5 定向锚：点课题按钮→新页在场→新建/改名/切换链）：
 * 旧布局种子（文献直写 userData 根——L0 兼容面，paperCount=1 打破引导态）
 * →启动（ensure 迁移 M→W-pvalid(default)）→rail 课题短名（COUNT 实测由管理页卡承载）
 * →点课题钮→管理页在场（卡片=实名/篇数/色标片/.on）→页内新建课题 B
 * （dirty=false 无确认直切）→location.reload 后文献库空+rail 短名示 B
 * →页内行内改名课题 B→rail 短名就地自新（不 reload）→页内切回 default
 * →种子文献在场（课题隔离=库级分目录的字面验收）。
 *
 * reload 注意：Electron 下 location.reload 重载同 webContents，playwright 的
 * win 句柄仍有效；断言用 auto-retry expect 重同步（不手等 timeout）。
 */
test('课题切换：管理页新建课题 B 后库/脉络整体切换，改名就地生效，切回后文献在场', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-ws-'))

  // 第一跳：应用自建库表（不 import src 内部模块——Playwright 不认 ?raw）
  await bootstrapMigrations(userData)

  // 旧布局种子：文献行直写 userData 根 synapse.db（e2e 种子链零改动兼容面；
  // paperCount=1 → 引导态三条件不成立——rail 全钮可用）
  const sha = 'e'.repeat(64)
  const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
  await seedPaperRow(userData, fileRef, sha, '智慧水务 e2e 课题文献')

  // 第二跳：迁移兼容启动——rail 课题短名+状态条 DOM 零残留（[B5 wave C] 整删）+种子文献在场
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await expect(win.getByText('智慧水务 e2e 课题文献')).toBeVisible()
  await expect(win.locator('.rail-ws .lb')).toHaveText('默认课题', { timeout: 10_000 })
  // [B5 wave C 2026-11-25——用户裁决：App 底部状态条整删（设计稿外）] 原状态条课题名/篇数锚的替代=其余真实 UI 锚：课题名=rail 短名（上一行）；篇数=管理页当前卡「1 篇」（锚①，下文）；状态条 DOM 零残留
  await expect(win.locator('.app-statusbar')).toHaveCount(0)

  // 点课题钮=路由管理页（[F-WS-02] R5 锚①）：卡片=实名/篇数/色标片+当前项 .on
  await win.getByRole('button', { name: '课题', exact: true }).click()
  const page = win.locator('.ws-page')
  await expect(page).toBeVisible({ timeout: 10_000 })
  await expect(page.getByRole('heading', { name: '课题管理' })).toBeVisible()
  const defCard = page.locator('.ws-card', { hasText: '默认课题' })
  await expect(defCard).toBeVisible()
  await expect(defCard).toContainText('1 篇')
  await expect(defCard.locator('.chip')).toBeVisible()
  await expect(defCard).toHaveClass(/\bon\b/)

  // 页内新建课题 B（锚②：创建即切——dirty=false 无确认直切→reload）
  await page.getByLabel('新课题名称').fill('课题 B')
  await page.getByRole('button', { name: '创建并切换' }).click()

  // reload 后重同步：rail 短名示「课题 B」（store load 完成的锚——[B5 wave C] 状态条整删后为唯一课题名锚）
  // [B5 wave C 2026-11-25——用户裁决：App 底部状态条整删（设计稿外）] 原状态条课题名/篇数锚的替代=其余真实 UI 锚：课题名=rail 短名（下一行，20s 重同步）；「0 篇」=锚③管理页当前卡 .ct
  await expect(win.locator('.rail-ws .lb')).toHaveText('课题 B', { timeout: 20_000 })
  // 先锚「列表加载完成」再断缺席（回炉 W2——假绿窗堵口：loading 中 rows 为
  // 空，直接断 toHaveCount(0) 立即通过≠空库证明。「正在加载文献列表…」与
  // papers 同 commit 置/清位（LibraryPage:99-103），其隐藏=加载终态确定信号）
  await expect(win.getByText('正在加载文献列表…')).toBeHidden({ timeout: 10_000 })
  // 文献库空（默认视图即文献库）：种子文献不在新课题库
  await expect(win.getByText('智慧水务 e2e 课题文献')).toHaveCount(0)
  // 脉络空态（真实文本——宪法 e2e 红线）
  await win.getByRole('button', { name: '脉络', exact: true }).click()
  // [B5 §3.3/§3.5] 新课题脉络空库=画布在场零卡（原「暂无脉络图」空态文案锚退役——真实状态）
  await expectEmptyLineageCanvas(win)

  // 页内行内改名（锚③：rename IPC+清单即时改名——不 reload，rail 短名就地
  // 自新；新名前 4 码点≠旧名——短名=name 前 4 码点截断，同名前缀不显迁移）
  await win.getByRole('button', { name: '课题', exact: true }).click()
  const bCard = page.locator('.ws-card', { hasText: '课题 B' })
  await expect(bCard).toBeVisible()
  await expect(bCard).toHaveClass(/\bon\b/)
  await expect(page.locator('.ws-card.on .ct')).toHaveText('0 篇') // [B5 wave C] 原状态条「课题 B · 0 篇」的篇数承接
  await page.locator('.ws-row', { hasText: '课题 B' }).getByRole('button', { name: '重命名' }).click()
  await page.getByLabel('课题名称', { exact: true }).fill('智慧水务课题 B')
  await page.getByRole('button', { name: '确定' }).click()
  await expect(page.locator('.ws-card', { hasText: '智慧水务课题 B' })).toBeVisible()
  await expect(win.locator('.rail-ws .lb')).toHaveText('智慧水务', { timeout: 10_000 })
  // [B5 wave C 2026-11-25——用户裁决：App 底部状态条整删（设计稿外）] 原状态条课题名/篇数锚的替代=其余真实 UI 锚：课题全名+篇数=管理页当前卡（rail 短名=前 4 码点截断，全名只在此处）
  await expect(currentWsCard(win)).toContainText('智慧水务课题 B')
  await expect(currentWsCard(win).locator('.ct')).toHaveText('0 篇')

  // 切回 default（锚④：点卡切换→reload→rail 课题短名自新；篇数由种子文献在场承载）
  await page.locator('.ws-card', { hasText: '默认课题' }).click()
  // [B5 wave C 2026-11-25——用户裁决：App 底部状态条整删（设计稿外）] 原状态条课题名/篇数锚的替代=其余真实 UI 锚：切回 default 的 reload 重同步锚=rail 课题短名（种子文献在场=下一行；篇数=管理页当前卡）
  await expect(win.getByText('智慧水务 e2e 课题文献')).toBeVisible({ timeout: 10_000 })

  await app.close()
})

// ── [B4 L2 / 设计稿 §2.5 #38、§12.3] 有未落库 reader＋多 folder 写时切换 ──

/** 主图文献（真实 PDF——阅读器可打开） */
const L2_PAPER = { id: 'e2e-ws-l2-paper', title: '智慧水务 e2e 课题切换文献', year: 2020 } as const
const L2_FOLDER_A = { id: 'f-ws-a', name: '甲图' } as const
const L2_FOLDER_B = { id: 'f-ws-b', name: '乙图' } as const
const L2_NOTE_A = '甲图切换前的悬浮笔记'
const L2_NOTE_B = '乙图切换前的悬浮笔记'
const L2_REVIEW = '课题切换前的总评正文'
const L2_FAILED_NOTE = '乙图写失败的悬浮笔记'
const L2_NEW_WS = '回炉课题丙'
const L2_NEW_WS_FAIL = '回炉课题丁'
/** [B5 wave C] 原状态条课题锚的替代锚（状态条整删）：管理页当前卡（.ws-card.on——实名+.ct 篇数，需管理页在场） */
const currentWsCard = (win: Page): Locator => win.locator('.ws-page .ws-card.on')
/** [B5 wave C] rail 课题短名（管理页不在场时的课题名锚——name 前 4 码点） */
const railWsName = (win: Page): Locator => win.locator('.rail-ws .lb')
/** [B5 wave C] 文献库「全部文献」导航行计数（篇数锚——课题内文献数，lib-fn-ct 真文本） */
const libraryTotal = (win: Page): Locator =>
  win.locator('.lib-fn-row').filter({ hasText: '全部文献' }).locator('.lib-fn-ct')

/** [B5 设计稿 §3.3/§3.5——wave C 2026-11-25] 空图画布在场（原「暂无脉络图」空态文案锚退役）：
 *  内容层可见、非 loading 占位（aria-busy 不为 true）、零卡、旧文案零残留 */
async function expectEmptyLineageCanvas(win: Page): Promise<void> {
  await expect(win.locator('.tl-content')).toBeVisible({ timeout: 10_000 })
  await expect(win.getByTestId('lineage-timeline')).not.toHaveAttribute('aria-busy', 'true')
  await expect(win.locator('.tl-card')).toHaveCount(0)
  await expect(win.getByText('暂无脉络图')).toHaveCount(0)
}

/**
 * 种子（主 launch 之前）：主图文献带真实 PDF（阅读器面）+两个文件夹各一篇文献与节点——
 * 三个年份各一组，主图删节点不与文件夹节点挤占槽位。
 */
async function seedL2Fixture(userData: string): Promise<void> {
  const bytes = createTinyPdf(`${L2_PAPER.title} ${PDF_KNOWN_TEXT}`)
  const sha = createHash('sha256').update(bytes).digest('hex')
  const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
  const abs = join(userData, 'files', ...fileRef.split('/'))
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, bytes)
  await seedPaperRow(userData, fileRef, sha, L2_PAPER.title, L2_PAPER.id, { year: L2_PAPER.year })
  const ghost = async (id: string, title: string, year: number): Promise<void> => {
    const g = createHash('sha256').update(`ws-l2-${id}`).digest('hex')
    await seedPaperRow(userData, `${g.slice(0, 2)}/${g.slice(2, 4)}/${g}.pdf`, g, title, id, { year })
  }
  await ghost('e2e-ws-l2-pa', '甲图文献', 2021)
  await ghost('e2e-ws-l2-pb', '乙图文献', 2022)
  await seedLineageGraph(userData, {
    folders: [
      { id: L2_FOLDER_A.id, name: L2_FOLDER_A.name },
      { id: L2_FOLDER_B.id, name: L2_FOLDER_B.name }
    ],
    nodes: [
      { paperId: L2_PAPER.id, title: L2_PAPER.title, year: L2_PAPER.year },
      { paperId: 'e2e-ws-l2-pa', title: '甲图文献', year: 2021, folderId: L2_FOLDER_A.id },
      { paperId: 'e2e-ws-l2-pb', title: '乙图文献', year: 2022, folderId: L2_FOLDER_B.id }
    ]
  })
}

/** 右键空白新建悬浮笔记并 blur 收口（入队 upsert——lineage-conflict.spec 同型） */
async function createNote(win: Page, text: string): Promise<void> {
  const content = win.locator('.tl-content')
  const cb = await content.boundingBox()
  if (cb === null) throw new Error('内容层不可见')
  await content.click({ button: 'right', position: { x: cb.width - 60, y: cb.height - 60 } })
  const menu = win.getByTestId('note-anchor-menu')
  await expect(menu).toBeVisible({ timeout: 5_000 })
  await menu.getByRole('menuitem', { name: '新建悬浮笔记' }).click()
  await win.locator('.tl-note-input').fill(text)
  await content.click({ position: { x: 40, y: 40 } })
  await expect(win.locator('.tl-note-text').filter({ hasText: text })).toBeVisible({ timeout: 5_000 })
}

/** 从文献库打开主图文献并切到「笔记」页签；返回笔记面板（载入完成锚=「已保存」在场） */
async function openReaderNotesPanel(win: Page): Promise<Locator> {
  await win.getByRole('button', { name: '文献库' }).click()
  await win.getByText(L2_PAPER.title).first().dblclick()
  await win.getByTestId('reader-research').getByRole('tab', { name: '笔记' }).click()
  const panel = win.getByTestId('reader-notes-panel')
  await expect(panel.getByText('已保存')).toBeVisible({ timeout: 10_000 })
  return panel
}

/** 在「笔记正文」输入（reader 文本单元——1.5s 空闲窗内为未落库写；不显式保存） */
async function typeReaderNote(win: Page, text: string): Promise<void> {
  const panel = await openReaderNotesPanel(win)
  await panel.getByLabel('笔记正文').fill(text)
  await expect(win.getByTestId('reader-toolbar-save')).toBeEnabled()
}

/** 管理页：新建课题并切换（「创建即切」） */
async function createWorkspaceAndSwitch(win: Page, name: string): Promise<void> {
  await win.getByRole('button', { name: '课题', exact: true }).click()
  const page = win.locator('.ws-page')
  await expect(page).toBeVisible({ timeout: 10_000 })
  await page.getByLabel('新课题名称').fill(name)
  await page.getByRole('button', { name: '创建并切换' }).click()
}

/** reload 探针：往 window 挂标记——reload 后 window 重建，标记消失 */
const setMarker = (win: Page): Promise<void> =>
  win.evaluate(() => {
    ;(window as unknown as { __wsSwitchMarker?: string }).__wsSwitchMarker = 'before'
  })
const marker = (win: Page): Promise<string | null> =>
  win.evaluate(() => (window as unknown as { __wsSwitchMarker?: string }).__wsSwitchMarker ?? null)

/**
 * [B4 L2 §2.5 #38 / §12.3] 成功链：切换前主图设聚焦、甲乙两图各建一条悬浮笔记（多 folder 写）、
 * 阅读器笔记正文输入后立即切换。断言：reload 进新课题；旧课题库里三处写全部落库（此时应用
 * 已不在该库上写——行在场=切换完成前落库）；切回旧课题后笔记正文与两条悬浮笔记真实文本在
 * （回读）；内存史与 focusSet 全清（撤销/重做不可用、无聚焦卡）。
 */
test('[B4 L2 §2.5 #38] 有未落库 reader＋多 folder 写时切换：全部落库后 reload 进新课题→旧课题回读文本在→内存史/focusSet 全清', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-ws-l2-'))
  await bootstrapMigrations(userData)
  await seedL2Fixture(userData)
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  // [B5 wave C 2026-11-25——用户裁决：App 底部状态条整删（设计稿外）] 原状态条「课题 默认课题 · 3 篇」的替代=其余真实 UI 锚：课题名=rail 短名；篇数=文献库「全部文献」计数（.lib-fn-ct 真文本）
  await expect(railWsName(win)).toHaveText('默认课题')
  await expect(libraryTotal(win)).toHaveText('3')
  // IO 脏时切换经原生 window.confirm（「有未落库修改，切换前将先保存全部修改。确认切换？」）——
  // Playwright 缺省自动取消；本例接受并记录文案
  const confirms: string[] = []
  win.on('dialog', (d) => {
    confirms.push(d.message())
    void d.accept()
  })

  // 脉络：主图设聚焦（focusSet）；甲、乙两图各建一条悬浮笔记（各自会话的未落库写+历史）
  await win.getByRole('button', { name: '脉络', exact: true }).click()
  const rootCard = win.locator('.tl-card[data-node-id]').filter({ hasText: L2_PAPER.title })
  await expect(rootCard).toBeVisible({ timeout: 10_000 })
  await win.getByTestId('lineage-mode-focus').click()
  await rootCard.click()
  await expect(rootCard).toHaveClass(/focused/)
  await win.getByTestId('lineage-mode-edit').click()
  await win.getByTestId('lineage-tool-select').click()
  await switchLineageGraph(win, L2_FOLDER_A.id, L2_FOLDER_A.name)
  await createNote(win, L2_NOTE_A)
  await switchLineageGraph(win, L2_FOLDER_B.id, L2_FOLDER_B.name)
  await createNote(win, L2_NOTE_B)
  // reader 未落库写：笔记正文输入后即去切换（不显式保存）
  await typeReaderNote(win, L2_REVIEW)

  // 切换：全量 flush 成功→release→switch→reload
  await setMarker(win)
  await createWorkspaceAndSwitch(win, L2_NEW_WS)
  // [B5 wave C 2026-11-25——用户裁决：App 底部状态条整删（设计稿外）] 原状态条课题名/篇数锚的替代=其余真实 UI 锚：reload 完成=rail 课题短名自新（window 重建标记在下一行判定）
  await expect(railWsName(win)).toHaveText(L2_NEW_WS.slice(0, 4), { timeout: 20_000 })
  expect(await marker(win), '已 reload（window 重建，标记消失）').toBeNull()
  for (const message of confirms) expect(message).toContain('切换前将先保存全部修改')
  await expect(win.getByText('正在加载文献列表…')).toBeHidden({ timeout: 10_000 })
  await win.getByRole('button', { name: '脉络', exact: true }).click()
  // [B5 §3.3/§3.5] 新课题空库=画布在场零卡（原「暂无脉络图」空态文案锚退役）
  await expectEmptyLineageCanvas(win)

  // DB 回读（旧课题库——应用此刻已切到新课题库，不再写它）：三处写全部落库
  expect(
    await liveDbScript(userData, 'all', 'SELECT folder_id, content FROM floating_notes ORDER BY folder_id')
  ).toEqual([
    { folder_id: L2_FOLDER_A.id, content: L2_NOTE_A },
    { folder_id: L2_FOLDER_B.id, content: L2_NOTE_B }
  ])
  expect(await liveDbScript(userData, 'all', 'SELECT content_md FROM notes WHERE paper_id = ?', [L2_PAPER.id])).toEqual([
    { content_md: L2_REVIEW }
  ])

  // 切回旧课题：笔记正文回读（真实文本）
  await win.getByRole('button', { name: '课题', exact: true }).click()
  const page = win.locator('.ws-page')
  await page.locator('.ws-card', { hasText: '默认课题' }).click()
  // [B5 wave C 2026-11-25——用户裁决：App 底部状态条整删（设计稿外）] 原状态条课题名/篇数锚的替代=其余真实 UI 锚：reload 重同步锚=rail 课题短名（切回默认课题后）；篇数=文献库「全部文献」计数（下一行）
  await expect(railWsName(win)).toHaveText('默认课题', { timeout: 20_000 })
  await expect(libraryTotal(win)).toHaveText('3') // 篇数=文献库「全部文献」计数（reload 后缺省视图=文献库——管理页卡不在场）
  const panel = await openReaderNotesPanel(win)
  await expect(panel.getByLabel('笔记正文')).toHaveValue(L2_REVIEW)

  // 脉络：两条悬浮笔记真实文本在；内存史全清（撤销/重做不可用——切换前各会话有历史）；focusSet 全清
  await win.getByRole('button', { name: '脉络', exact: true }).click()
  await expect(rootCard).toBeVisible({ timeout: 10_000 })
  await win.getByTestId('lineage-mode-focus').click()
  await expect(win.locator('.tl-card.focused')).toHaveCount(0)
  await expect(win.getByTestId('lineage-focus-count')).toHaveCount(0) // 计数徽标仅在聚焦数>0 时渲染
  await win.getByTestId('lineage-mode-edit').click()
  await expect(win.getByTestId('lineage-undo')).toBeDisabled()
  await expect(win.getByTestId('lineage-redo')).toBeDisabled()
  await switchLineageGraph(win, L2_FOLDER_A.id, L2_FOLDER_A.name)
  await expect(win.locator('.tl-note-text')).toHaveText(L2_NOTE_A)
  await expect(win.getByTestId('lineage-undo')).toBeDisabled()
  await switchLineageGraph(win, L2_FOLDER_B.id, L2_FOLDER_B.name)
  await expect(win.locator('.tl-note-text')).toHaveText(L2_NOTE_B)
  await expect(win.getByTestId('lineage-undo')).toBeDisabled()
  await app.close()
})

/**
 * [B4 L2 §2.5 #38] 失败链：切换前任一写落不了库→留旧课题（不 reload、不清史、不丢弃）。写失败=
 * main 侧把悬浮笔记写通道 lineage/upsert-floating-note 重注册为抛错（lineage.spec T3「写通道 patch
 * 抛错」同型——真实应用内确定性驱动）；主图删节点走未打桩的通道照常落库（多 folder 写一成一败）。
 * 断言：未 reload（标记在）、rail 课题短名仍是旧课题、新课题卡在清单但不为当前；能落的写都落了
 * （主图删节点、reader 笔记正文——DB 回读），落不了的没落（乙图笔记零行）；状态保留（乙图
 * 会话的笔记在场、错误行与重试钮可见）。
 */
test('[B4 L2 §2.5 #38] 切换前全量 flush 失败（乙图悬浮笔记写失败）：留旧课题不 reload、状态保留', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-ws-l2-fail-'))
  await bootstrapMigrations(userData)
  await seedL2Fixture(userData)
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  // [B5 wave C 2026-11-25——用户裁决：App 底部状态条整删（设计稿外）] 原状态条「课题 默认课题 · 3 篇」（启动态=默认课题）的替代=其余真实 UI 锚：课题名=rail 短名；篇数=文献库「全部文献」计数
  await expect(railWsName(win)).toHaveText('默认课题', { timeout: 20_000 })
  await expect(libraryTotal(win)).toHaveText('3')
  win.on('dialog', (d) => void d.accept())
  // 写失败注入：悬浮笔记写通道抛错（系统型失败——写保留可重试）
  await app.evaluate((electronMod) => {
    const ipcMain = (
      electronMod as unknown as {
        ipcMain: { removeHandler(channel: string): void; handle(channel: string, handler: () => Promise<never>): void }
      }
    ).ipcMain
    ipcMain.removeHandler('lineage/upsert-floating-note')
    ipcMain.handle('lineage/upsert-floating-note', async () => {
      throw new Error('模拟写库失败（e2e 桩）')
    })
  })

  // 主图：删节点（未打桩通道）
  await win.getByRole('button', { name: '脉络', exact: true }).click()
  const rootCard = win.locator('.tl-card[data-node-id]').filter({ hasText: L2_PAPER.title })
  await expect(rootCard).toBeVisible({ timeout: 10_000 })
  await win.getByTestId('lineage-mode-edit').click()
  await win.getByTestId('lineage-tool-select').click()
  await rootCard.click({ button: 'right' })
  await expect(win.getByTestId('lineage-node-menu')).toBeVisible()
  await win.getByTestId('lineage-node-menu').getByRole('menuitem', { name: '删除节点' }).click()
  await expect(rootCard).toHaveCount(0, { timeout: 5_000 })
  // 乙图：新建悬浮笔记→入队→idle flush 撞桩→错误可见（写保留）
  await switchLineageGraph(win, L2_FOLDER_B.id, L2_FOLDER_B.name)
  await createNote(win, L2_FAILED_NOTE)
  const errorRow = win.getByTestId('lineage-save-error')
  await expect(errorRow).toBeVisible({ timeout: 10_000 })
  await expect(errorRow).toContainText('保存失败：')
  await expect(errorRow).toContainText('模拟写库失败（e2e 桩）') // 经未过 register 折叠的原始 handler 抛错——Electron 外包一层调用文案
  // reader 写：输入后等它落库再离开（本例的失败源只有乙图那一条——reader 写不在途，不与本例断言混因）
  await typeReaderNote(win, L2_REVIEW)
  await expect
    .poll(() => liveDbScript(userData, 'all', 'SELECT content_md FROM notes WHERE paper_id = ?', [L2_PAPER.id]))
    .toEqual([{ content_md: L2_REVIEW }])

  // 切换：全量 flush 失败→留旧课题
  await setMarker(win)
  await createWorkspaceAndSwitch(win, L2_NEW_WS_FAIL)
  const page = win.locator('.ws-page')
  await expect(page.locator('.ws-card', { hasText: L2_NEW_WS_FAIL })).toBeVisible({ timeout: 10_000 }) // 新课题已建
  // 全量 flush 段把能落库的都落了：主图删节点、reader 笔记正文（DB 回读）
  await expect
    .poll(() => liveDbScript(userData, 'get', 'SELECT COUNT(*) AS c FROM lineage_nodes WHERE paper_id = ?', [L2_PAPER.id]))
    .toEqual({ c: 0 })
  await expect
    .poll(() => liveDbScript(userData, 'all', 'SELECT content_md FROM notes WHERE paper_id = ?', [L2_PAPER.id]))
    .toEqual([{ content_md: L2_REVIEW }])
  // 落不了的没落：乙图笔记零行
  expect(await liveDbScript(userData, 'get', 'SELECT COUNT(*) AS c FROM floating_notes WHERE folder_id = ?', [L2_FOLDER_B.id])).toEqual(
    { c: 0 }
  )
  // 留旧课题：留出一次错误 reload 的窗口后，标记仍在、当前课题不变、管理页仍在
  await win.waitForTimeout(1_000)
  expect(await marker(win), '未 reload（留旧课题）').toBe('before')
  // [B5 wave C] 原状态条「课题 默认课题 · 3 篇」→rail 课题短名（当前课题未变）+管理页当前卡（下一行）
  await expect(railWsName(win)).toHaveText('默认课题')
  await expect(page.locator('.ws-card.on')).toContainText('默认课题')
  await expect(page.locator('.ws-card.on .ct')).toHaveText('3 篇')
  // 状态保留：进脉络页后切到乙图——该会话的笔记（未落库）在场、错误行与重试钮可见
  //（进页缺省打开文献库上下文对应的图=主图——LineagePage 挂载同步的既有行为，与本例无关）
  await win.getByRole('button', { name: '脉络', exact: true }).click()
  await switchLineageGraph(win, L2_FOLDER_B.id, L2_FOLDER_B.name)
  await expect(win.locator('.tl-note-text')).toHaveText(L2_FAILED_NOTE)
  // [B5 设计稿 §6.3 R4——wave C 2026-11-25] 写失败告警挂稳定 Page 外壳、三模式可达：原「先进 edit 才见错误行」
  // 退役——进页缺省 browse 下直接断言错误行与保存重试钮可见（保存重试只随 save 来源——本例失败源=普通写）
  await expect(errorRow).toBeVisible()
  await expect(win.getByTestId('lineage-save-retry')).toBeVisible()
  await app.close()
})
