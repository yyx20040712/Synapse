// b3: P7-H
/**
 * [SR2-LG-05] 脉络图 e2e 全链（工单：open / strong——实现时展开）
 *
 * ── 行为层（验收面，蓝图 N3+ROADMAP P7-H 验收行）──
 * - 全链用例组：①脉络页 UI 添加文献节点→
 *   画布渲染**真实文本**（节点标题/年份可见——宪法 e2e 纪律；[F-BAKRET-01]
 *   原导入草稿链随退役改述，用户裁决 2026-09-30——ADR-0022）；②
 *   滚动容器锚（[T3-P6] pan/zoom 随 SVG 画布退役——scrollTo 后节点文本仍可断言）；
 *   ③时间线真文本 reload 持久；④加边树拒绝 toast（多父场景真实
 *   文本）；⑤节点单击→侧板 AI 分节分色呈现；⑥AI 条目双击→阅读器
 *   打开+锚定位（data-ai-note-id exact 层——AI-09 延展消费）；⑦
 *   自动保存失败路径→退出拦截弹窗（聚合面）——**mock 实现路径注
 *   （门一 N8）：contextIsolation 下 renderer 不可 mock contextBridge；
 *   须 electronApp.evaluate 在 main 侧 patch 写通道 handler，禁静默降级
 *   删用例**；⑧主题节点添加+编辑 core_idea→reload 持久
 * - 环境：SYNAPSE_USER_DATA 隔离（e2e-env 既有机制——08/10 同型）；
 *   [F-BAKRET-01] 种子链=launch 前子进程直写库（e2e-env.seedLineageGraph
 *   ——seedPaperRow 同型基建）+T1 用真实产品路径（脉络页「添加节点」/
 *   右键「连线到…」——行为规约种子三路之路①）
 *
 * ── 文化层 ──
 * - **e2e 原生守卫（双条件，门一 W2 处置）**：skip=自身工单未 done
 *   **或**依赖组（SR2-LG-01~04）任一未 done。翻 done 时占位 test
 *   必须已被全链用例替换——**防作弊闭合=主控收口亲验**。
 * - **受锁流程（门一 W3）**：本文件已入 locks manifest——改动必经
 *   locks:unlock→批内改→locks:apply+[locked-change] 尾注提交。
 * - 完成后：npm run verify 绿 → 人工审查 git diff → 翻 registry
 *
 * ── 实现注（LG-05 交付，主控简报六段裁决落点；[F-BAKRET-01] 种子链改述）──
 * - **守卫修订（主控裁定 5）**：skip 条件从「依赖组∪自身」收敛为**仅依赖组**。
 * - **用例组映射（裁决 1）**：T1=①UI 添加文献节点渲染真实文本+②滚动容器锚；
 *   T2=③时间线真文本 reload 持久+⑧主题节点添加/编辑 core_idea reload
 *   持久（同一 launch 两轮 reload）；T3=④多父加边树拒绝 toast+⑦写通道
 *   patch 失败→保存失败指示条→真聚合脏态→close 拦截两态；T4=⑤侧板
 *   分节分色+⑥AI 条目双击跳阅读器+锚定位。
 * - **种子链（[F-BAKRET-01] 改述）**：papers 经 e2e-env.seedPaperRow
 *   （甲=真实 PDF 供⑥跳转与⑤产物重锚；根/乙=幽灵行+year 元数据）；
 *   T1 走脉络页 UI 添加节点+右键连线（产品路径①——空态文案锚随链保活）；
 *   T2-T10/T-P1b=launch 前 seedLineageGraph 直写库（month/slot/综述形态
 *   由种子载荷精确控制——UI 链无法表达的月组场景）。AI 笔记走 08 先例
 *   预置链不变。
 * - **⑦ mock**：app.evaluate 于 main 侧 ipcMain.removeHandler+handle 重注册
 *   'lineage/upsert-node' 抛错；退出拦截走**真聚合链**，close/断言形态=
 *   reader-text.spec.ts:285 退出拦截先例同型。
 * - **写落地证据**：编辑后 poll 落点/序到位（store 回填在 await unwrap
 *   之后）再 reload，不用裸 sleep。
 */
import { test, expect, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { isTicketDone } from '../../tickets/registry'
import { createTinyPdf, PDF_KNOWN_TEXT } from '../utils/pdf-factory'
import {
  bootstrapMigrations,
  launch,
  seedLineageGraph,
  seedPaperRow,
  type LineageSeedEdge,
  type LineageSeedNode
} from './e2e-env'

/** 守卫=仅依赖组（主控裁定 5：自身条件收敛，见文件头实现注） */
const DEPS = ['SR2-LG-01', 'SR2-LG-02', 'SR2-LG-03', 'SR2-LG-04'] as const

/** fixture 三篇：根/甲/乙（甲=真实 PDF；根/乙=幽灵行——不打开） */
const PAPERS = [
  { id: 'e2e-lg-root', title: '脉络根文献', year: 2020, real: false },
  { id: 'e2e-lg-a', title: '脉络甲文献', year: 2022, real: true },
  { id: 'e2e-lg-b', title: '脉络乙文献', year: 2023, real: false }
] as const
const THEME_TITLE = '研究阶段一主题（e2e）'
const THEME_IDEA = '主题节点的核心想法（e2e 持久锚）'

/** R2-LG12 T5 第四篇：综述题名（isSurveyTitle 命中「综述」关键词；幽灵行） */
const SURVEY_PAPER = { id: 'e2e-lg-survey', title: '领域综述：扩散模型全景（e2e）', year: 2021 } as const

/** [T3-P6 回炉 T6] 砖砌锚两篇（幽灵行——月组种子载荷直写） */
const BRICK_PAPERS = [
  { id: 'e2e-lg-brick-a', title: '砖砌文献甲（e2e）' },
  { id: 'e2e-lg-brick-b', title: '砖砌文献乙（e2e）' }
] as const

/** 种子载荷：标准树（根→甲/乙——④的多父场景=对乙再加边被拒） */
function chainSeed(): { nodes: LineageSeedNode[]; edges: LineageSeedEdge[] } {
  return {
    nodes: PAPERS.map((p) => ({
      paperId: p.id,
      title: p.title,
      year: p.year,
      coreIdea: p.id === 'e2e-lg-a' ? '脉络甲的核心 idea（e2e）' : ''
    })),
    edges: [
      { from: 'e2e-lg-root', to: 'e2e-lg-a', label: '继承甲' },
      { from: 'e2e-lg-root', to: 'e2e-lg-b', label: '' }
    ]
  }
}

/** 种子载荷：同树+孤立综述节点（4 节点 2 树边——综述右列由 isSurvey 判定） */
function surveySeed(): { nodes: LineageSeedNode[]; edges: LineageSeedEdge[] } {
  return {
    nodes: [
      ...PAPERS.map((p) => ({ paperId: p.id, title: p.title, year: p.year, coreIdea: '' })),
      { paperId: SURVEY_PAPER.id, title: SURVEY_PAPER.title, year: SURVEY_PAPER.year, coreIdea: '' }
    ],
    edges: [
      { from: 'e2e-lg-root', to: 'e2e-lg-a', label: '继承甲' },
      { from: 'e2e-lg-root', to: 'e2e-lg-b', label: '' }
    ]
  }
}

/** 时间线节点小卡（DOM .tl-card）——按内含标题文本过滤
 *  [T3-P6] SVG g[data-node-id]→.tl-card[data-node-id]（同名 id 接缝沿承） */
function nodeG(win: Page, title: string) {
  return win.locator('.tl-card[data-node-id]').filter({ hasText: title })
}

/** 建库迁移第一跳（reader-text 同型：不 import src 内部模块） */
async function firstHop(userData: string): Promise<void> {
  await bootstrapMigrations(userData)
}

/** 种子三篇（甲真实 PDF+year 元数据——T1 UI 添加节点取元数据；根/乙幽灵行） */
async function seedLineagePapers(userData: string): Promise<void> {
  for (const p of PAPERS) {
    if (!p.real) {
      const ghostSha = createHash('sha256').update(`lg-ghost-${p.id}`).digest('hex')
      const ghostRef = `${ghostSha.slice(0, 2)}/${ghostSha.slice(2, 4)}/${ghostSha}.pdf`
      await seedPaperRow(userData, ghostRef, ghostSha, p.title, p.id, { year: p.year })
      continue
    }
    const bytes = createTinyPdf(`${p.title} ${PDF_KNOWN_TEXT}`)
    const sha = createHash('sha256').update(bytes).digest('hex')
    const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
    const abs = join(userData, 'files', ...fileRef.split('/'))
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, bytes)
    await seedPaperRow(userData, fileRef, sha, p.title, p.id, { year: p.year })
  }
}

/** 综述幽灵行种子（T5/T8——surveySeed 载荷的 papers 前置） */
async function seedSurveyPaper(userData: string): Promise<void> {
  const ghostSha = createHash('sha256').update(`lg-ghost-${SURVEY_PAPER.id}`).digest('hex')
  const ghostRef = `${ghostSha.slice(0, 2)}/${ghostSha.slice(2, 4)}/${ghostSha}.pdf`
  await seedPaperRow(userData, ghostRef, ghostSha, SURVEY_PAPER.title, SURVEY_PAPER.id, {
    year: SURVEY_PAPER.year
  })
}

/**
 * [F-BAKRET-01] T1 产品路径种子链：脉络页「添加节点」文献型（搜索选取→
 * 添加）——行为规约种子三路之路①（title/year 取 papers 元数据）。
 */
async function addPaperNodeViaUi(win: Page, title: string): Promise<void> {
  await win.getByTestId('lineage-add-node').click()
  await win.getByTestId('add-node-search').fill(title)
  const item = win.getByRole('dialog').locator('li button').filter({ hasText: title }).first()
  await expect(item).toBeVisible({ timeout: 10_000 })
  await item.click()
  await win.getByRole('dialog').getByRole('button', { name: '添加', exact: true }).click()
  await expect(nodeG(win, title)).toBeVisible({ timeout: 10_000 })
}

/** [F-BAKRET-01] T1 产品路径连线链：右键源卡「连线到…」→点目标卡 */
async function linkNodesViaUi(win: Page, fromTitle: string, toTitle: string): Promise<void> {
  const from = nodeG(win, fromTitle)
  await from.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  await from.click({ button: 'right' })
  await win.getByTestId('lineage-node-menu').getByRole('menuitem', { name: '连线到…' }).click()
  await expect(win.getByTestId('lineage-pending-link')).toBeVisible()
  await nodeG(win, toTitle).click()
}

/** reload 后回脉络视图并等画布 ready（store 模块随 reload 重置→重 load） */
async function reloadToLineage(win: Page): Promise<void> {
  await win.reload()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByRole('button', { name: '脉络', exact: true }).click()
  await expect(nodeG(win, '脉络根文献')).toBeVisible({ timeout: 10_000 })
}

test.describe('脉络图 e2e 全链（导入/渲染/编辑保存/侧板跳转）', () => {
  const pending = DEPS.filter((d) => !isTicketDone(d))
  test.skip(pending.length > 0, `延期：依赖工单未完成 [${pending.join(', ')}]`)

  /**
   * T1=验收面①②：脉络页 UI 添加文献节点→时间线渲染真实文本（年份头/月
   * 标签/小卡题名/骑缝号——宪法 e2e 红线；[F-BAKRET-01] 原导入链改述为
   * 添加节点产品路径）+空态先行+滚动容器锚。
   */
  test('T1 UI 添加文献节点→时间线渲染真实文本→滚动容器锚后节点仍可断言', async () => {
    const userData = await mkdtemp(join(tmpdir(), 'synapse-lg05-t1-'))
    await firstHop(userData)
    await seedLineagePapers(userData)

    const app = await launch(userData)
    const win = await app.firstWindow()
    await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })

    // 空图空态文案（真实文本——[F-BAKRET-01] 随导入退役改述）
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await expect(win.getByText('暂无脉络图——添加节点')).toBeVisible({ timeout: 10_000 })
    // 侧板空态（04 交付面顺带锚）
    await expect(win.getByTestId('lineage-side-panel')).toHaveText('单击节点查看详情')

    // ①UI 添加三节点（产品路径①）+两树边（根→甲/乙，跨年=绕行折线族）——
    //   卡片/连线即时渲染（store 写回填）；骑缝号 .c-no=graph 通道 pubNos
    //   派生表（INV-92），UI 增量写不重取整图——编号断言置于段末 reload 后
    //   （冷读全图载荷——与原导入链「导入后 store 重取」等价数据面）
    for (const p of PAPERS) {
      await addPaperNodeViaUi(win, p.title)
    }
    await linkNodesViaUi(win, '脉络根文献', '脉络甲文献')
    await linkNodesViaUi(win, '脉络根文献', '脉络乙文献')
    await expect(win.getByText('脉络根文献')).toBeVisible()
    // [T3-P7A] 连线出现锚（渲染恢复承诺兑现）：2 条树边（根→甲/乙，
    // 跨年=绕行折线族）→ svg.tl-edges 可见 path ≥1；边端点在场校验=两路径
    // 各自挂 data-edge-id（结构真渲染非空 svg）
    const edgePaths = win.locator('svg.tl-edges path.tl-edge')
    await expect(edgePaths).toHaveCount(2, { timeout: 10_000 })
    expect(await win.locator('.tl-legend').textContent()).toContain('继承')

    // ②滚动容器锚（pan/zoom INV-43/44 退役→滚动定位语义）：fixture 三
    //   节点内容不满视口——先注入临时高度制造可滚面（evaluate 测试手段
    //   非产品面，probe 先例），再验 scrollTop 真推进+首年份头滚出容器顶
    //   （d1-W3 回炉：防「容器不可滚也绿」恒真面）+节点文本仍可断言
    await win.locator('.tl-content').evaluate((el) => {
      el.style.minHeight = '2000px'
    })
    // [T3-P7A 回炉 1 W4] 滚动前基准：path 与卡 boundingBox y 差（内嵌内容
    // 坐标随文档流零跟随的几何证据——滚动后差值恒定）
    const rootCard = nodeG(win, '脉络根文献')
    const yDiffOf = async (): Promise<number> => {
      const pb = await edgePaths.first().boundingBox()
      const cb = await rootCard.boundingBox()
      return pb!.y - cb!.y
    }
    const yDiffBefore = await yDiffOf()
    const timeline = win.locator('.timeline')
    const scrolledTop = await timeline.evaluate((el) => {
      el.scrollTo(0, 300)
      return el.scrollTop
    })
    expect(scrolledTop).toBeGreaterThan(0)
    const firstYearBox = await win.locator('.tl-year').first().boundingBox()
    const timelineBox = await timeline.boundingBox()
    expect(firstYearBox!.y).toBeLessThan(timelineBox!.y)
    await expect(win.getByText('脉络甲文献')).toBeVisible()
    await expect(win.getByText('脉络乙文献')).toBeVisible()
    // [T3-P7A] 滚动后连线仍可断言（D-2 内嵌内容坐标随文档流——滚动零跟随）
    await expect(edgePaths.first()).toBeVisible()
    // [回炉 2 ④] 图例视口级恒可见锚（W7 修复验证面——挂 .timeline 随滚动区
    // 视口定位，滚动后仍在场）
    await expect(win.locator('.timeline .tl-legend')).toBeVisible()
    // [回炉 1 W4] 滚动前后 y 差恒定（错位即红——路径与卡同文档流证据）
    expect(await yDiffOf()).toBeCloseTo(yDiffBefore, 1)

    // reload 冷读全图载荷→时间线真实文本三锚（宪法 e2e 红线）：年份头纯数字
    // （mockup 形态）+未定月月标签+骑缝编号（INV-92 pubNos——lineageOrder
    // 全序 2020→2022→2023）
    await reloadToLineage(win)
    expect(await win.locator('.tl-year-num').allTextContents()).toEqual(['2020', '2022', '2023'])
    expect(await win.locator('.month-tag').allTextContents()).toEqual([
      '未定月 · 1 篇',
      '未定月 · 1 篇',
      '未定月 · 1 篇'
    ])
    expect(await win.locator('.c-no').allTextContents()).toEqual(['#001', '#002', '#003'])

    await app.close()
  })

  /**
   * T2=验收面③⑧：时间线真文本 reload 持久（[T3-P6 主控裁决] 拖拽 x/y
   * 持久随自由拖拽退役——P8 槽位重排接缝；持久锚=年份头/月标签/小卡
   * 题名）；主题节点添加+编辑 core_idea→reload 持久。同一 launch 两轮 reload。
   */
  test('T2 时间线真文本 reload 持久+主题节点添加编辑 core_idea reload 持久', async () => {
    test.slow() // 两轮 reload+四段写链
    const userData = await mkdtemp(join(tmpdir(), 'synapse-lg05-t2-'))
    await firstHop(userData)
    await seedLineagePapers(userData)
    await seedLineageGraph(userData, chainSeed())

    const app = await launch(userData)
    const win = await app.firstWindow()
    await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await expect(nodeG(win, '脉络根文献')).toBeVisible({ timeout: 10_000 })

    // ③[退役改写] 拖拽 x/y 持久段随自由拖拽退役（P8 槽位重排接缝）→
    //   时间线真文本持久锚：reload→年份头/月标签/小卡题名仍在
    await reloadToLineage(win)
    expect(await win.locator('.tl-year-num').allTextContents()).toEqual(['2020', '2022', '2023'])
    await expect(win.locator('.month-tag').first()).toHaveText('未定月 · 1 篇')
    await expect(win.getByText('脉络根文献')).toBeVisible()

    // ⑧添加主题节点（阶段分组语义——虚线框 data-kind=theme）
    await win.getByTestId('lineage-add-node').click()
    await win.getByTestId('add-node-mode-theme').click()
    await win.getByTestId('add-node-title').fill(THEME_TITLE)
    await win.getByRole('button', { name: '添加', exact: true }).click()
    const themeG = nodeG(win, THEME_TITLE)
    await expect(themeG).toBeVisible({ timeout: 10_000 })
    await expect(themeG).toHaveAttribute('data-kind', 'theme')

    // 主题节点侧板：主题绑定态+无笔记空态
    await themeG.click()
    await expect(win.getByTestId('lineage-side-meta')).toHaveAttribute('data-binding', 'theme')
    await expect(win.getByText('主题节点无笔记')).toBeVisible()

    // 右键→编辑核心想法→保存（自动保存落库）；[T3-P7B] 工具条入流后内容
    // 下移——右键前滚卡至视口中心（fixed 菜单锚点防下缘溢出视口）
    await themeG.evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await themeG.click({ button: 'right' })
    await win.getByTestId('lineage-node-menu').getByRole('menuitem', { name: '编辑核心想法' }).click()
    await win.getByTestId('core-idea-input').fill(THEME_IDEA)
    await win.getByRole('button', { name: '保存', exact: true }).click()
    await expect(win.getByTestId('lineage-side-idea')).toContainText(THEME_IDEA)

    // reload→主题节点+core_idea 持久
    await reloadToLineage(win)
    const themeG2 = nodeG(win, THEME_TITLE)
    await expect(themeG2).toBeVisible()
    await expect(themeG2).toHaveAttribute('data-kind', 'theme')
    await themeG2.click()
    await expect(win.getByTestId('lineage-side-idea')).toContainText(THEME_IDEA)

    await app.close()
  })

  /**
   * T3=验收面④⑦：多父加边→树守卫 CONFLICT toast（真实中文 reason）；
   * 写通道 main 侧 patch 抛错（N8）→保存失败指示条→真聚合脏态→close
   * 拦截两态（取消保持/确认 destroy）。
   */
  test('T3 多父加边树拒绝 toast+保存失败→脏态退出拦截两态', async () => {
    test.slow() // 退出拦截 close 两态+poll
    const userData = await mkdtemp(join(tmpdir(), 'synapse-lg05-t3-'))
    await firstHop(userData)
    await seedLineagePapers(userData)
    await seedLineageGraph(userData, chainSeed())

    const app = await launch(userData)
    const win = await app.firstWindow()
    await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await expect(nodeG(win, '脉络根文献')).toBeVisible({ timeout: 10_000 })

    // ④根→乙 已有边；右键甲「连线到…」→点乙→乙第二父被拒（INV-27 运行时守卫）
    const aG = nodeG(win, '脉络甲文献')
    await aG.click({ button: 'right' })
    await win.getByTestId('lineage-node-menu').getByRole('menuitem', { name: '连线到…' }).click()
    await expect(win.getByTestId('lineage-pending-link')).toBeVisible()
    await expect(win.getByText('连线模式：点击目标节点（源 → 目标，目标成为子节点）')).toBeVisible()
    await nodeG(win, '脉络乙文献').click()
    await expect(win.getByText(/多父边拒绝：节点 .+ 已有父节点/)).toBeVisible({ timeout: 10_000 })
    // 拒绝型动作被丢弃不卡队列——保存态回 saved（无失败指示条）
    await expect(win.getByTestId('lineage-save-status')).toHaveCount(0)
    // 图数据不变锚：连线视觉面已退役（P7 恢复），守卫 toast 即 service 读
    // 面证据（上行拒绝 reason 来自「乙已有父」的库内既有边）

    // ⑦ main 侧 patch 写通道 handler 抛错（系统型——票面 N8 注字面）
    await app.evaluate((electronMod) => {
      const ipcMain = (
        electronMod as unknown as {
          ipcMain: {
            removeHandler(channel: string): void
            handle(channel: string, handler: () => Promise<never>): void
          }
        }
      ).ipcMain
      ipcMain.removeHandler('lineage/upsert-node')
      ipcMain.handle('lineage/upsert-node', async () => {
        throw new Error('模拟写库失败（e2e 桩）')
      })
    })

    // 写失败触发=[T3-P6 适配] 拖拽退役→编辑 core_idea 写通道（同一
    //   upsert-node 失败面：handler 已 patch 抛错→error 保存态）
    await nodeG(win, '脉络根文献').click({ button: 'right' })
    await win.getByTestId('lineage-node-menu').getByRole('menuitem', { name: '编辑核心想法' }).click()
    await win.getByTestId('core-idea-input').fill('写失败探针（e2e 桩）')
    await win.getByRole('button', { name: '保存', exact: true }).click()
    const statusBar = win.getByTestId('lineage-save-status')
    await expect(statusBar).toBeVisible({ timeout: 10_000 })
    await expect(statusBar).toHaveText(/保存失败：/)
    await expect(win.getByTestId('lineage-retry-save')).toBeVisible()

    // 退出拦截（真聚合链：store error→useLineageDirty→App effect→main 缓存；
    // effect+IPC 往返毫秒级，1s 缓冲后 close——reader-text.spec 同型两态）
    await win.waitForTimeout(1_000)
    const aliveWindows = (): Promise<number> =>
      app
        .evaluate((electronMod) =>
          (electronMod as unknown as { BrowserWindow: { getAllWindows(): Array<{ isDestroyed(): boolean }> } })
            .BrowserWindow.getAllWindows()
            .filter((w) => !w.isDestroyed()).length
        )
        .catch(() => -1) // -1=主进程已退出（比窗口归零更强的终局信号）
    const closeMain = (): Promise<unknown> =>
      app.evaluate((electronMod) => {
        ;(
          electronMod as unknown as {
            BrowserWindow: { getAllWindows(): Array<{ close(): void }> }
          }
        ).BrowserWindow.getAllWindows()[0]?.close()
      })
    // 取消（response 1）：preventDefault 生效——窗口保持
    await app.evaluate((electronMod) => {
      ;(electronMod.dialog as unknown as { showMessageBox: () => Promise<{ response: number }> })
        .showMessageBox = async () => ({ response: 1 })
    })
    await closeMain()
    await expect.poll(aliveWindows).toBe(1)
    // 确认（response 0）：destroy 强制关闭——窗口归零
    await app.evaluate((electronMod) => {
      ;(electronMod.dialog as unknown as { showMessageBox: () => Promise<{ response: number }> })
        .showMessageBox = async () => ({ response: 0 })
    })
    await closeMain()
    await expect.poll(aliveWindows).toBeLessThan(1)
    await app.close().catch(() => undefined)
  })

  /**
   * T4=验收面⑤⑥：AI 笔记导入（08 预置链+真 07 导入器）→节点单击→侧板
   * 分节分色→AI 条目双击→阅读器打开+锚定位（data-ai-note-id 可见性——
   * exact 层 AI-09 延展消费）。
   */
  test('T4 AI 笔记导入→侧板分节分色→双击跳阅读器锚定位', async () => {
    // F-02 批 2：跳页兼容（exact 层经目标页盒文本层验证）——逐测守卫（describe
    // 级 DEPS 之外单列，T1~T3 不被 F-02 绑架）
    const pendingF02 = ['SR2-F-02'].filter((d) => !isTicketDone(d))
    test.skip(pendingF02.length > 0, `延期：依赖工单未完成 [${pendingF02.join(', ')}]`)
    test.slow() // AI 面板 5s 轮询消费 fixture+PDF 加载+跳转链
    const userData = await mkdtemp(join(tmpdir(), 'synapse-lg05-t4-'))
    const sensorRoot = join(userData, 'ai-sensor')
    await firstHop(userData)
    await seedLineagePapers(userData)
    await seedLineageGraph(userData, chainSeed())

    const app = await launch(userData)
    const win = await app.firstWindow()
    await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })

    // 先开阅读器（AI 面板宿主）：双击甲→笔记 tab（08 先例）
    await win.getByText('脉络甲文献').first().dblclick()
    await expect(win.getByText(PDF_KNOWN_TEXT).first()).toBeVisible({ timeout: 20_000 })
    await win.locator('[data-testid="reader-aside"]').getByRole('tab', { name: '笔记' }).click()
    await expect(win.getByRole('button', { name: 'AI 读文献' })).toBeVisible({ timeout: 10_000 })

    // 产物预置（工具完成语义：corpus-ai 落盘+status 空闲——真 07 导入器消费）
    // quote=PDF 已渲染真实文本（exact 重锚充要输入）；两 question=两组分节
    mkdirSync(join(sensorRoot, 'corpus-ai'), { recursive: true })
    writeFileSync(
      join(sensorRoot, 'corpus-ai', 'e2e-lg-a.json'),
      JSON.stringify([
        {
          role: 'first-read',
          question: 'Q1',
          model: 'e2e-lg-model',
          quote_text: PDF_KNOWN_TEXT,
          prefix_text: '',
          suffix_text: '',
          anchor_page: 1,
          content_md: '脉络侧板 AI 一读笔记（e2e 真实文本锚）'
        },
        {
          role: 'adjudicate',
          question: 'divergence',
          model: 'e2e-lg-model',
          quote_text: '',
          prefix_text: '',
          suffix_text: '',
          anchor_page: null,
          content_md: '脉络侧板裁决分节条目（e2e）'
        }
      ])
    )
    const now = new Date().toISOString()
    writeFileSync(
      join(sensorRoot, 'status.json'),
      JSON.stringify({ state: '空闲', currentPaper: null, role: null, updatedAt: now, heartbeatAt: now })
    )
    // 状态行轮询（5s 周期——12s 余量同 08）→导入（真 07 导入器→真 DB）
    await expect(win.getByTestId('ai-status-line')).toHaveText('AI 已读完，待导入', { timeout: 12_000 })
    await win.getByRole('button', { name: '导入 AI 笔记' }).click()
    await expect(win.getByText('AI 笔记导入完成：导入 1 篇，跳过 0 篇')).toBeVisible({ timeout: 10_000 })

    // 回脉络→单击甲节点（[F-BAKRET-01] 图已种子——无导入动作）
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await nodeG(win, '脉络甲文献').click()

    // ⑤侧板分节分色+真实文本（question 组分节×组内 role 标签×QUESTION_COLOR 分色单源）
    await expect(win.getByTestId('lineage-side-meta')).toHaveAttribute('data-binding', 'paper')
    await expect(win.getByText('已绑定文献')).toBeVisible()
    // [T3-P6 适配] core_idea 双渲染面（时间线卡 .c-idea+侧板）——getByText
    // 严格模式双元素冲突，断言收窄到侧板（T2 lineage-side-idea 同锚）
    await expect(win.getByTestId('lineage-side-idea')).toContainText('脉络甲的核心 idea（e2e）')
    const aiSection = win.getByTestId('lineage-side-ai-notes')
    await expect(aiSection.getByRole('heading', { name: '第一问：核心 idea 是什么' })).toBeVisible({ timeout: 10_000 })
    await expect(aiSection.getByRole('heading', { name: '分歧报告' })).toBeVisible()
    const q1Entry = aiSection.locator('div[data-question="Q1"] div[data-ai-note-id]').first()
    await expect(q1Entry).toHaveAttribute('data-ai-note-id', /.+/)
    // 分色：Q1 色块=annotation-yellow；divergence 色块=danger（两色相异即分色证据）
    await expect(q1Entry.locator('span[aria-hidden]')).toHaveAttribute(
      'style',
      /--annotation-yellow/
    )
    const divEntry = aiSection.locator('div[data-question="divergence"] div[data-ai-note-id]').first()
    await expect(divEntry.locator('span[aria-hidden]')).toHaveAttribute('style', /--danger/)
    // 条目真实文本（渲染出真实文本红线）
    await expect(win.getByText('脉络侧板 AI 一读笔记（e2e 真实文本锚）')).toBeVisible()
    await expect(win.getByText('脉络侧板裁决分节条目（e2e）')).toBeVisible()

    // ⑥双击 Q1 条目→总线→App 切阅读器→PDF 加载→exact 层锚目标可见
    // （data-ai-note-id 与被双击条目一致——可见性选项，头注 flash 竞态声明）
    const noteId = await q1Entry.getAttribute('data-ai-note-id')
    expect(noteId).not.toBeNull()
    await q1Entry.dblclick()
    await expect(win.getByText(PDF_KNOWN_TEXT).first()).toBeVisible({ timeout: 20_000 })
    await expect(
      win.locator(`[data-testid="ai-note-rect"][data-ai-note-id="${noteId}"]`)
    ).toBeVisible({ timeout: 10_000 })

    await app.close()
  })

  /**
   * T5=R2-LG12 参考边全链（用户裁决 A）：综述节点右键「添加参考连接」（仅
   * 综述文献节点呈现）→点目标文献（已有 tree 父=豁免面）→[T3-P7A] ref 边
   * 点线视觉锚恢复（stroke-dasharray 非 none——INV-06 计算样式口径）→
   * reload 数据持久锚=同端点对重复添加被 service 守卫拒（真实中文 reason
   * ——读面证据=图内既有边）。
   */
  test('T5 综述参考连接：右键添加 ref 边→reload 数据持久（守卫面证）', async () => {
    test.slow()
    const userData = await mkdtemp(join(tmpdir(), 'synapse-lg12-t5-'))
    await firstHop(userData)
    await seedLineagePapers(userData)
    await seedSurveyPaper(userData)
    await seedLineageGraph(userData, surveySeed())

    const app = await launch(userData)
    const win = await app.firstWindow()
    await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await expect(nodeG(win, '脉络根文献')).toBeVisible({ timeout: 10_000 })
    await expect(nodeG(win, SURVEY_PAPER.title)).toBeVisible({ timeout: 10_000 })

    // 菜单项级限定负锚：非综述节点（甲）菜单不呈现「添加参考连接」
    await nodeG(win, '脉络甲文献').click({ button: 'right' })
    await expect(
      win.getByTestId('lineage-node-menu').getByRole('menuitem', { name: '添加参考连接' })
    ).toHaveCount(0)
    await win.mouse.click(10, 10) // 点遮罩关菜单

    // 综述右键→「添加参考连接」→连线模式提示→点目标甲（已有 tree 父=豁免）
    await nodeG(win, SURVEY_PAPER.title).click({ button: 'right' })
    await win.getByTestId('lineage-node-menu').getByRole('menuitem', { name: '添加参考连接' }).click()
    await expect(win.getByTestId('lineage-pending-link')).toBeVisible()
    await nodeG(win, '脉络甲文献').click()

    // [T3-P7A] ref 边视觉锚恢复（T3-P6 退役注记承诺兑现——D-18 点线映射）：
    // store 写回填 edges→EdgeOverlay 重算→ref path 计算样式 stroke-dasharray
    // 非 none（点线 2 3；基础型类样式=--faint 色——色纹双证取纹面，色面由
    // theme-lineage.css 文本锁承载）
    const refPath = win.locator('svg.tl-edges path.tl-edge[data-kind="ref"]')
    await expect(refPath).toHaveCount(1, { timeout: 10_000 })
    const refDash = await refPath.first().evaluate((el) => getComputedStyle(el).strokeDasharray)
    expect(refDash).not.toBe('none')

    // 写落地门=
    // 会话内同端点对重复添加被 service 守卫拒（守卫读 DB=首写已落库证据；
    // 真实中文 reason「该逻辑线已存在」）
    await nodeG(win, SURVEY_PAPER.title).click({ button: 'right' })
    await win.getByTestId('lineage-node-menu').getByRole('menuitem', { name: '添加参考连接' }).click()
    await expect(win.getByTestId('lineage-pending-link')).toBeVisible()
    await nodeG(win, '脉络甲文献').click()
    await expect(win.getByText(/该逻辑线已存在（.+），重复边被拒绝/)).toBeVisible({ timeout: 10_000 })

    // reload→ref 边数据持久锚：冷读后同守卫复证（图内既有边=持久证据）
    await reloadToLineage(win)
    await expect(nodeG(win, SURVEY_PAPER.title)).toBeVisible({ timeout: 10_000 })
    await expect(nodeG(win, '脉络甲文献')).toBeVisible({ timeout: 10_000 })
    await nodeG(win, SURVEY_PAPER.title).click({ button: 'right' })
    await win.getByTestId('lineage-node-menu').getByRole('menuitem', { name: '添加参考连接' }).click()
    await expect(win.getByTestId('lineage-pending-link')).toBeVisible()
    await nodeG(win, '脉络甲文献').click()
    await expect(win.getByText(/该逻辑线已存在（.+），重复边被拒绝/)).toBeVisible({ timeout: 10_000 })
    // 拒绝型丢弃不卡队列——保存态回 saved
    await expect(win.getByTestId('lineage-save-status')).toHaveCount(0)

    await app.close()
  })

  /**
   * T6=[F-LINEAGE-02 ①a/P-15] 瀑布错位真机锚（.rowshift 62px 交替退役）：
   * 默认视口一行容多卡不换行（T1-T5 单卡每框=零判别力）——窄窗 720px
   * （侧板 288px 挤压月框内容区≈244px→每行 1 卡）+5 卡同月 fixture→5 行；
   * 断言各卡 inline margin-left 实值=(R×82) mod 148（R=行号 0..4→
   * [无,82,16,98,32]——手推独立期望）+跨行 y 递增+零 rowshift 残留
   * （不动点迭代收敛后的稳定态证据；非收敛/乱序即红）。
   */
  test('T6 瀑布错位：窄窗 5 卡同月→五行+margin-left=(R×82)mod148 实值+零 rowshift', async () => {
    const userData = await mkdtemp(join(tmpdir(), 'synapse-lg05-t6-'))
    await firstHop(userData)
    await seedLineagePapers(userData)
    // 追加 2 篇幽灵行（月组种子载荷直写）
    for (const p of BRICK_PAPERS) {
      const sha = createHash('sha256').update(`lg-ghost-${p.id}`).digest('hex')
      const ref = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
      await seedPaperRow(userData, ref, sha, p.title, p.id)
    }
    // 5 卡同月（2020-05）：PAPERS 三篇改同年同月+砖砌两篇（slot=种子序）
    await seedLineageGraph(userData, {
      nodes: [
        ...PAPERS.map((p) => ({ paperId: p.id, title: p.title, year: 2020, month: 5, coreIdea: '' })),
        ...BRICK_PAPERS.map((p) => ({ paperId: p.id, title: p.title, year: 2020, month: 5, coreIdea: '' }))
      ],
      edges: []
    })

    const app = await launch(userData)
    const win = await app.firstWindow()
    await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
    await win.setViewportSize({ width: 720, height: 800 })
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await expect(nodeG(win, '脉络根文献')).toBeVisible({ timeout: 10_000 })

    // 单月框 5 卡+月标签计数
    const frame = win.locator('.month-frame').first()
    expect(await frame.locator('.tl-card').count()).toBe(5)
    await expect(win.getByText('5 月 · 5 篇')).toBeVisible()

    // 瀑布：按实测分行断言（窄窗下侧板 288px 挤压月框内容区≈244px→每行
    // 1 卡、5 行；行容量不钉死——以「unique offsetTop 升序=行号」推导期望
    // 错位集，与组件 rowsFromOffsetTops+waterfallOffsets 同型）。[三过
    // d1-W2 加固] 几何量测置于 margin 稳定态之后（过渡中期读几何=非确定红面）
    const cards = frame.locator('.tl-card')
    const ids = await cards.evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.nodeId ?? ''))
    const ys = await cards.evaluateAll((els) => els.map((e) => (e as HTMLElement).offsetTop))
    const rowTops = [...new Set(ys)].sort((a, b) => a - b)
    expect(rowTops.length).toBeGreaterThan(1) // 确证换行（≥2 行）——一行放得下则此锚红
    // 期望=offset(R)=(R×82) mod 148 手推（R=年内连续行号：0/1/2/3/4→
    // 0/82/16/98/32；R=0 无 inline）
    const expected = new Map(ids.map((id, i) => [id, `${(rowTops.indexOf(ys[i]!) * 82) % 148}px`]))
    // margin-left：过渡动画 .25s 中读值为中间态——poll 至稳定态（同时锁
    // 「transition 后真到位」的时间维度语义；几何断言随之稳定）
    await expect
      .poll(
        async () =>
          await cards.evaluateAll(
            (els, pairs) => {
              const want = new Map(pairs)
              return els.filter((e) => getComputedStyle(e).marginLeft === (want.get((e as HTMLElement).dataset.nodeId ?? '') ?? '0px')).length
            },
            [...expected.entries()]
          ),
        { timeout: 3000 }
      )
      .toBe(5)
    // 零 rowshift 残留负锚（类退役——在场即红）
    expect(await frame.locator('.tl-card.rowshift').count()).toBe(0)
    // 跨行实证：末行卡 y 严格大于首行卡（换行真发生——非同行右移）
    const lastRowY = (await cards.nth(ids.length - 1).boundingBox())!.y
    const firstRowY = (await cards.first().boundingBox())!.y
    expect(lastRowY).toBeGreaterThan(firstRowY)

    await app.close()
  })

  /**
   * T7=[T3-P7B] 编辑线型全流：edit→点边（命中层）→popover→新建线型表单
   * （D-10 轮转/D-P7B-4 确定性）→确定（saveLineTypes→自动选中 applyEdgeLine）
   * →reload 持久+computed style sub 色（INV-06 计算样式口径）→基础型回退
   * （D-P7B-3 sub=null）→reload 再证。
   * 命中层点击=dispatchEvent 探针（真机命中层 stroke 8px 与卡 z 序叠放——
   * 合成点击落点不稳定，坐标面已由单测承载；e2e 锁全流语义）。
   */
  test('T7 编辑线型全流：点边→新建线型→选 sub→reload 持久+sub 色+基础型回退', async () => {
    test.slow()
    const userData = await mkdtemp(join(tmpdir(), 'synapse-lg05-t7-'))
    await firstHop(userData)
    await seedLineagePapers(userData)
    await seedLineageGraph(userData, chainSeed())

    const app = await launch(userData)
    const win = await app.firstWindow()
    await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await expect(nodeG(win, '脉络根文献')).toBeVisible({ timeout: 10_000 })

    // edit 态：模式栏编辑键（[F-LGRAPH-01①U3] 编辑 toggle 退役——三模式栏
    // 替代）+editing 类+linkbtn 显（D-21）
    await win.getByTestId('lineage-mode-edit').click()
    await expect(win.getByTestId('lineage-mode-edit')).toHaveClass(/on/)
    await expect(win.locator('.timeline.editing')).toHaveCount(1)
    await expect(win.getByTestId('lineage-link-btn')).toBeVisible()

    // 点边（命中层）→popover=edit（h4 无「新建连线」后缀）
    const hit = win.locator('svg.tl-edges path.tl-edge-hit').first()
    await hit.evaluate((el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 300, clientY: 300 })))
    await expect(win.getByTestId('edge-pop')).toBeVisible()
    await expect(win.getByTestId('edge-pop').locator('h4')).toHaveText('线 型')
    // 恒四组手风琴+计数（P5 种子恒四组空 subs——「0 型」）
    await expect(win.getByTestId('edge-pop').locator('.acc-head[data-base="tree"] .cnt')).toHaveText('2 条 · 0 型')

    // 新建线型：默认名「线型 1」（空组 subs.length+1）→确定=整批写+自动选中
    await win.getByTestId('edge-pop-newsub').click()
    await expect(win.getByTestId('edge-pop-newsub-name')).toHaveValue('线型 1')
    await win.getByTestId('edge-pop-newsub-confirm').click()
    await expect(win.getByText('已新建子线型：继承 · 线型 1')).toBeVisible({ timeout: 10_000 })
    // 弹层保持开+新 sub chip 自动选中（.on）
    await expect(win.getByTestId('edge-pop')).toBeVisible()
    await expect(win.getByTestId('edge-pop').locator('.schip[data-sub="tree-s1"]')).toHaveClass(/on/)
    // 写完成（队列 lineTypes→edge 串行落库）后 reload
    await expect(win.getByTestId('lineage-save-status')).toHaveCount(0, { timeout: 10_000 })
    await reloadToLineage(win)

    // reload 持久：sub 应用面=computed stroke-width 1.7（PALETTE[0] 恰=--accent
    // 同色 rgb(58,91,217) 无判别力——宽度面 1.7 vs 基础型 1.6 为判别锚）
    const styled = win.locator('svg.tl-edges path.tl-edge').first()
    await expect(styled).toBeVisible({ timeout: 10_000 })
    await expect
      .poll(async () => await styled.evaluate((el) => getComputedStyle(el).strokeWidth))
      .toBe('1.7px')

    // 基础型回退（D-P7B-3）：再入 edit→点同边→基础型 chip（sub=null）→回退
    await win.getByTestId('lineage-mode-edit').click()
    await win
      .locator('svg.tl-edges path.tl-edge-hit')
      .first()
      .evaluate((el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 300, clientY: 300 })))
    await expect(win.getByTestId('edge-pop')).toBeVisible()
    await win.getByTestId('edge-pop').locator('.schip[data-sub="base"]').click()
    await expect(win.getByText('线型已切换：继承 · 基础型')).toBeVisible({ timeout: 10_000 })
    await win.keyboard.press('Escape') // 关弹层（外点/Esc 通道同语义）
    await expect(win.getByTestId('lineage-save-status')).toHaveCount(0, { timeout: 10_000 })
    await reloadToLineage(win)

    // 回退持久：computed stroke-width 回落基础型 1.6（宽度判别锚——同上）
    const reverted = win.locator('svg.tl-edges path.tl-edge').first()
    await expect(reverted).toBeVisible({ timeout: 10_000 })
    await expect
      .poll(async () => await reverted.evaluate((el) => getComputedStyle(el).strokeWidth))
      .toBe('1.6px')

    await app.close()
  })

  /**
   * T8=[T3-P7B] 新建连线全流：拾取两卡（link-src 高亮+拾取态点卡不转发选中）
   * →自环/重复预检 toast（D-P7B-6 停 target 不回 idle）→create（linkWithLine）
   * →reload 持久；Esc 分支：拾取中 Esc→picker 归位→点卡无连线动作。
   */
  test('T8 新建连线全流：拾取→自环/重复 toast→create→reload 持久+Esc 分支', async () => {
    test.slow()
    const userData = await mkdtemp(join(tmpdir(), 'synapse-lg05-t8-'))
    await firstHop(userData)
    await seedLineagePapers(userData)
    await seedSurveyPaper(userData)
    // 综述版种子（T5 同族）：综述节点孤立无父=tree 边合法落点（根/甲/乙互连
    // 全撞单父或环守卫——三节点版无合法 create 目标）
    await seedLineageGraph(userData, surveySeed())

    const app = await launch(userData)
    const win = await app.firstWindow()
    await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await expect(nodeG(win, '脉络根文献')).toBeVisible({ timeout: 10_000 })
    await expect(nodeG(win, SURVEY_PAPER.title)).toBeVisible({ timeout: 10_000 })
    const edgeCount = win.locator('svg.tl-edges path.tl-edge')

    // Esc 分支先行（拾取中 Esc→点卡无动作——票面 Esc 优先序 picker 面）
    await win.getByTestId('lineage-mode-edit').click()
    await win.getByTestId('lineage-link-btn').click()
    await expect(win.getByText('新建连线：点击源卡片')).toBeVisible()
    await nodeG(win, '脉络甲文献').click()
    await expect(nodeG(win, '脉络甲文献')).toHaveClass(/link-src/)
    await win.keyboard.press('Escape')
    await expect(win.locator('.timeline.link-pick')).toHaveCount(0) // picker 归位
    await nodeG(win, '脉络乙文献').click() // picker=idle——普通选中，零连线写
    await expect(win.getByTestId('edge-pop')).toHaveCount(0)
    await expect(win.getByTestId('lineage-save-status')).toHaveCount(0)
    expect(await edgeCount.count()).toBe(2)

    // 正式全流：linkbtn→源=甲（.link-pick+link-src）
    await win.getByTestId('lineage-link-btn').click()
    await nodeG(win, '脉络甲文献').click()
    await expect(win.getByText('再点击目标卡片')).toBeVisible()
    await expect(nodeG(win, '脉络甲文献')).toHaveClass(/link-src/)
    // [R1·回炉 1] computed 判别断言（真机 Chromium）：源卡 outline-width∈[2,3]
    // ——`.timeline.editing .tl-card` 基线 (0,3,0) 曾压栈 `.tl-card.link-src`
    // (0,2,0) 致高亮恒不可视（文本在场≠计算样式生效——类名断言无判别力）。
    // [R9·回炉 2] 容差域 [2,3]：DPR≈1.25 设备像素吸附使字面值漂移（首红
    // 实收 0.8px=1px/1.25 吸附指纹——字面全等跨机可假红）；基线 1px×DPR
    // 吸附值全域 ≈0.8/1.0 远低于 2——判别力保持
    await expect
      .poll(
        async () => {
          const v = await nodeG(win, '脉络甲文献').evaluate((el) => getComputedStyle(el).outlineWidth)
          const n = parseFloat(v)
          return n >= 2 && n <= 3
        },
        { timeout: 5_000 }
      )
      .toBe(true)
    // 自环分支：再点甲→toast+停 target（不回 idle——高亮保持）
    await nodeG(win, '脉络甲文献').click()
    await expect(win.getByText('不能与自身连线（自环）')).toBeVisible({ timeout: 10_000 })
    await expect(nodeG(win, '脉络甲文献')).toHaveClass(/link-src/)
    // 重复分支：点根（既有 根→甲 任一方向）→toast+停 target
    await nodeG(win, '脉络根文献').click()
    await expect(win.getByText('两节点间已存在连线')).toBeVisible({ timeout: 10_000 })
    await expect(nodeG(win, '脉络甲文献')).toHaveClass(/link-src/)
    // 合法目标：综述（孤立无父——tree 边落点合法）→popover=create（源高亮摘除+h4 后缀）
    await nodeG(win, SURVEY_PAPER.title).click()
    await expect(win.getByTestId('edge-pop')).toBeVisible()
    await expect(win.getByTestId('edge-pop').locator('h4')).toHaveText('线 型 · 新建连线')
    await expect(nodeG(win, '脉络甲文献')).not.toHaveClass(/link-src/)
    // 创建连线（kind=tree 基础型缺省）→成功 toast+弹层关
    await win.getByTestId('edge-pop-act-create').click()
    await expect(win.getByText('父子连线已保存')).toBeVisible({ timeout: 10_000 })
    await expect(win.getByTestId('edge-pop')).toHaveCount(0)
    // 图内即时+1（store 回填→EdgeOverlay 重算）
    await expect(edgeCount).toHaveCount(3, { timeout: 10_000 })
    await expect(win.getByTestId('lineage-save-status')).toHaveCount(0)

    // reload 持久：3 条边仍在
    await reloadToLineage(win)
    await expect(edgeCount).toHaveCount(3, { timeout: 10_000 })

    await app.close()
  })

  /**
   * T-P1b=[T3-P7A 裁决部首日兑现；回炉 R4 走廊断言复锚] resize 不错位真机
   * 直证：setViewportSize 两档（1280→1000）→ResizeObserver 重算→（a）车道
   * x 随 contentW 变化（首树边根→甲实态=corridor——回炉探针实证 laneX=
   * contentW−48+9×lane：月标注入框后终落竖段受阻，跨年边落走廊；两档差=
   * 视口差）；（b）线-卡 y 相对关系恒定（纵向布局零变化）。
   * [回炉 R4] 首版收窄时弱化 poll 丢陈旧路径守卫（收窄后 path 未重算即量=
   * 假不动）——走廊参数族谓词既是断言面也是 stale 守卫，原式恢复。
   */
  test('T-P1b resize 直证：两档视口→车道 x 随 contentW 变化+线-卡 y 相对关系恒定', async () => {
    const userData = await mkdtemp(join(tmpdir(), 'synapse-lg05-p1b-'))
    await firstHop(userData)
    await seedLineagePapers(userData)
    await seedLineageGraph(userData, chainSeed())

    const app = await launch(userData)
    const win = await app.firstWindow()
    await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
    await win.setViewportSize({ width: 1280, height: 860 })
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await expect(nodeG(win, '脉络根文献')).toBeVisible({ timeout: 10_000 })

    // 首条树边（根→甲）实态=corridor（回炉探针实证：横臂至 laneX=
    // contentW−48+9×lane——月标入框阻终落竖段所致）——bbox 右缘=laneX。
    // 量测单 evaluate 原子取（viewport 坐标三值同拍——path bbox/content 左缘/
    // 宽度混算坐标系即错位，P7B 首跑实证 off 含 content 左缘偏移）
    const measure = async (): Promise<{ laneX: number; contentLeft: number; contentW: number; relY: number }> =>
      win.evaluate(() => {
        const path = document.querySelector('svg.tl-edges path.tl-edge') as SVGPathElement | null
        const ct = document.querySelector('.tl-content') as HTMLElement | null
        const card = document.querySelector('.tl-card') as HTMLElement | null
        if (path === null || ct === null || card === null) {
          return { laneX: -1, contentLeft: -1, contentW: -1, relY: 0 }
        }
        const pr = path.getBoundingClientRect()
        const cr = ct.getBoundingClientRect()
        const kr = card.getBoundingClientRect()
        return {
          laneX: pr.x + pr.width,
          contentLeft: cr.left,
          contentW: cr.width,
          relY: pr.y - kr.y
        }
      })
    // 稳定面：poll 至几何自洽（laneX−contentW−contentLeft=−48+9×lane ∈[−48,−21]
    // ——走廊参数族；content 左缘为 viewport 偏移须同拍扣除）
    await expect
      .poll(async () => {
        const m = await measure()
        const off = m.laneX - m.contentLeft - m.contentW
        return off >= -48.5 && off <= -20.5 && Math.abs((off + 48) % 9) < 0.5
      })
      .toBe(true)
    const m1 = await measure()
    // 第二档：收窄 280px——ResizeObserver+rAF 重算后车道左移同量。稳定面同
    // 谓词再 poll（CSS 宽同步先变、rAF 重算晚帧——只 poll contentW 会取到
    // 陈旧路径坐标，P7B 首跑实证 m2.laneX===m1.laneX 假绿面——[回炉 R4] 该
    // 谓词即陈旧路径守卫，弱化即翻车实证）
    await win.setViewportSize({ width: 1000, height: 860 })
    await expect
      .poll(async () => {
        const m = await measure()
        const off = m.laneX - m.contentLeft - m.contentW
        return (
          m.contentW < m1.contentW - 200 &&
          off >= -48.5 &&
          off <= -20.5 &&
          Math.abs((off + 48) % 9) < 0.5
        )
      })
      .toBe(true)
    const m2 = await measure()
    // (a) 车道 x 随 contentW 变化（差值≈视口差）
    expect(m2.laneX).toBeLessThan(m1.laneX)
    expect(Math.abs(m1.laneX - m2.laneX - 280)).toBeLessThan(3)
    // (b) 卡/线 bbox 相对关系恒定：laneX 对内容盒右缘偏移两档全等（走廊参数不变）
    expect(m2.laneX - m2.contentLeft - m2.contentW).toBeCloseTo(m1.laneX - m1.contentLeft - m1.contentW, 1)
    // (c) 纵向相对关系恒定（线-卡 y 差不变——错位即红）
    expect(m2.relY).toBeCloseTo(m1.relY, 1)

    await app.close()
  })

  /**
   * T9=[T3-P8] 拖拽调序全流：edit 态驱动（[F-LGRAPH-01①] 三模式闸——拖卡=
   * edit 专属，browse 默认态被闸拒）pointerdown 5px 阈值激活→占位槽「置 入」
   * 在场→月内移位→松手 settle→DOM 序=新序（store 回填重排）→reload 持久
   * （INV-75 slot 全序）→跨月拒绝 toast+落当前槽。几何断言经 win.mouse
   * 原生指针链。
   */
  test('T9 拖拽调序全流：拖→置入槽→松手→DOM 序=新序+reload 持久+跨月拒绝 toast+edit 态驱动', async () => {
    test.slow()
    const userData = await mkdtemp(join(tmpdir(), 'synapse-lg05-t9-'))
    await firstHop(userData)
    await seedLineagePapers(userData)
    // 同月双卡（2020-05：根+甲）+他月单卡（2020-06：乙）——月内重排与跨月面
    // （slot 显式=INV-75 组内全序——null 末序会颠倒 reload 后组内呈现）
    await seedLineageGraph(userData, {
      nodes: [
        { paperId: 'e2e-lg-root', title: '脉络根文献', year: 2020, month: 5, slot: 1, coreIdea: '' },
        { paperId: 'e2e-lg-a', title: '脉络甲文献', year: 2020, month: 5, slot: 2, coreIdea: '' },
        { paperId: 'e2e-lg-b', title: '脉络乙文献', year: 2020, month: 6, slot: 1, coreIdea: '' }
      ],
      edges: []
    })

    const app = await launch(userData)
    const win = await app.firstWindow()
    await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
    await win.setViewportSize({ width: 1280, height: 860 })
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await expect(nodeG(win, '脉络根文献')).toBeVisible({ timeout: 10_000 })
    // [F-LGRAPH-01①] 拖卡=edit 专属（三模式闸）——进编辑模式再拖
    await win.getByTestId('lineage-mode-edit').click()

    // data-node-id=节点行 UUID（非 paperId）——断言载体=卡内标题映射序
    const frameTitles = async (i: number): Promise<string[]> =>
      await win.locator('.month-frame').nth(i).locator('.tl-card').evaluateAll(
        (els, titles) =>
          els.map((e) => titles.find((t) => (e.textContent ?? '').includes(t)) ?? ''),
        ['脉络根文献', '脉络甲文献', '脉络乙文献']
      )
    const cardBox = async (title: string) => {
      const b = await nodeG(win, title).boundingBox()
      if (b === null) throw new Error(`卡不可见：${title}`)
      return b
    }
    // edit 态驱动：甲→根左半（指针 x=根中心−30px）→插位=根前
    const rootBox = await cardBox('脉络根文献')
    const aBox = await cardBox('脉络甲文献')
    await win.mouse.move(aBox.x + aBox.width / 2, aBox.y + aBox.height / 2)
    await win.mouse.down()
    // 过 5px 阈值激活+占位槽在场（B1 候选文献位）
    await win.mouse.move(rootBox.x + rootBox.width * 0.25, rootBox.y + rootBox.height / 2, { steps: 6 })
    await expect(win.locator('.drag-slot')).toHaveText('置 入', { timeout: 5_000 })
    await win.mouse.up()
    // settle .32s+写落定→DOM 序=新序（甲前根后——store lineageOrder 回填重排）
    await expect
      .poll(async () => await frameTitles(0), { timeout: 10_000 })
      .toEqual(['脉络甲文献', '脉络根文献'])
    // settle 清场信号：拖卡 inline 样式清空=transitionend finish（写已排队）
    // ——后续拖拽的 pointerdown 不落 settle 期（忽略面竞态防御）
    await expect
      .poll(
        async () =>
          await nodeG(win, '脉络甲文献').evaluate(
            (el) => el.getAttribute('style') === null || el.getAttribute('style') === ''
          ),
        { timeout: 10_000 }
      )
      .toBe(true)
    await expect(win.getByTestId('lineage-save-status')).toHaveCount(0)

    // 跨月拒绝：拖乙（2020-06 框）落 2020-05 框→toast+落当前槽（乙仍在原框）
    const bBox = await cardBox('脉络乙文献')
    const aBox2 = await cardBox('脉络甲文献')
    await win.mouse.move(bBox.x + bBox.width / 2, bBox.y + bBox.height / 2)
    await win.mouse.down()
    await win.mouse.move(aBox2.x + aBox2.width / 2, aBox2.y + aBox2.height / 2, { steps: 6 })
    await win.mouse.up()
    await expect(
      win.getByText('不能跨月拖动——请进入编辑模式，点卡片月标修改月份')
    ).toBeVisible({ timeout: 10_000 })
    await expect
      .poll(async () => await frameTitles(1), { timeout: 10_000 })
      .toEqual(['脉络乙文献'])

    // reload 持久：slot 全序=新序（甲 slot0/根 slot1）
    await reloadToLineage(win)
    await expect
      .poll(async () => await frameTitles(0), { timeout: 10_000 })
      .toEqual(['脉络甲文献', '脉络根文献'])

    await app.close()
  })

  /**
   * T10=[T3-P8] 改月全流：edit→月标 .c-ym→month-pop（月份列表+篇数）→选月
   * →toast 已移至+飞行落位→reload 持久 slot 尾部（服务端组变 max+1 归一）。
   */
  test('T10 改月全流：edit→月标→month-pop→选月→toast+reload 持久 slot 尾部', async () => {
    test.slow()
    const userData = await mkdtemp(join(tmpdir(), 'synapse-lg05-t10-'))
    await firstHop(userData)
    await seedLineagePapers(userData)
    // 同月双卡+他月单卡（T9 同族——slot 显式=INV-75 组内全序，改月后 reload
    // 组内序=服务端 max+1 归一可锚）
    await seedLineageGraph(userData, {
      nodes: [
        { paperId: 'e2e-lg-root', title: '脉络根文献', year: 2020, month: 5, slot: 1, coreIdea: '' },
        { paperId: 'e2e-lg-a', title: '脉络甲文献', year: 2020, month: 5, slot: 2, coreIdea: '' },
        { paperId: 'e2e-lg-b', title: '脉络乙文献', year: 2020, month: 6, slot: 1, coreIdea: '' }
      ],
      edges: []
    })

    const app = await launch(userData)
    const win = await app.firstWindow()
    await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
    await win.setViewportSize({ width: 1280, height: 860 })
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await expect(nodeG(win, '脉络根文献')).toBeVisible({ timeout: 10_000 })

    // edit 态：甲卡月标「2020.5」在场（CSS display:none↔block）→点击开弹层
    await win.getByTestId('lineage-mode-edit').click()
    const ym = nodeG(win, '脉络甲文献').locator('.c-ym')
    await expect(ym).toHaveText('2020.5')
    await ym.click()
    const pop = win.getByTestId('month-pop')
    await expect(pop).toBeVisible()
    await expect(pop.locator('h4')).toHaveText('移 动 到 月 份')
    await expect(pop.locator('.ws-item .nm').first()).toHaveText('2020 年 5 月')
    await expect(pop.locator('.ws-item .ct').first()).toHaveText('2 篇')
    // 当前月 on 态（dot ok 色）
    await expect(pop.locator('.ws-item.on').first()).toHaveText(/2020 年 5 月/)
    // 选 2020-06：toast+飞行落位（预演→settle→写落定真迁）
    await pop.locator('.ws-item[data-ym="2020|6"]').click()
    await expect(win.getByText('已移至 2020 年 6 月')).toBeVisible({ timeout: 10_000 })
    await expect(pop).toHaveCount(0)
    // data-node-id=UUID——标题映射序（同 T9）
    const frameTitles = async (i: number): Promise<string[]> =>
      await win.locator('.month-frame').nth(i).locator('.tl-card').evaluateAll(
        (els, titles) =>
          els.map((e) => titles.find((t) => (e.textContent ?? '').includes(t)) ?? ''),
        ['脉络根文献', '脉络甲文献', '脉络乙文献']
      )
    await expect
      .poll(async () => await frameTitles(1), { timeout: 10_000 })
      .toEqual(['脉络乙文献', '脉络甲文献']) // slot 尾部（乙前甲后）
    // 月标签计数随组迁移（5 月 1 篇/6 月 2 篇）——预演面即时
    await expect(win.getByText('5 月 · 1 篇')).toBeVisible()
    await expect(win.getByText('6 月 · 2 篇')).toBeVisible()
    // 数据落定信号：.flash 高亮驻留至 store 回填对齐（预演清除=写已完成）
    // ——reload 前必等（飞行 .32s+写错峰；preview 面早于此，裸 reload 丢写）
    await expect(win.locator('.month-frame.flash')).toHaveCount(0, { timeout: 10_000 })
    await expect(win.getByTestId('lineage-save-status')).toHaveCount(0)

    // reload 持久：甲仍在 2020-06 尾部（服务端组变 max+1 归一+lineageOrder）
    await reloadToLineage(win)
    await expect
      .poll(async () => await frameTitles(1), { timeout: 10_000 })
      .toEqual(['脉络乙文献', '脉络甲文献'])

    await app.close()
  })
})
