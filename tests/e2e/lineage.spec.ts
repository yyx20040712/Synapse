// b3: P7-H
/**
 * [SR2-LG-05] 脉络图 e2e 全链（工单：open / strong——实现时展开）
 *
 * ── 行为层（验收面，蓝图 N3+ROADMAP P7-H 验收行）──
 * - 全链用例组：①脉络页时间线渲染**真实文本**（节点标题/年份可见——宪法
 *   e2e 纪律；[F-BAKRET-01] 原导入草稿链随退役改述，用户裁决 2026-09-30
 *   ——ADR-0022；[F-ALIGN-01] UI 添加节点路径退役——T1 节点改种子直写，
 *   UI 交互面=连线/编辑/保存）；②
 *   滚动容器锚（[T3-P6] pan/zoom 随 SVG 画布退役——scrollTo 后节点文本仍可断言）；
 *   ③时间线真文本 reload 持久（core_idea 编辑持久面随 [A3 F-CONTRACTA-01
 *   2026-10-04] core_idea 全退役删除——节点写链 reload 持久由 T10 承载）；
 *   ④加边重复端点对拒绝
 *   toast（②U8 起多父守卫文本）；⑤节点单击→侧板 AI 分节分色呈现；⑥AI 条目
 *   双击→阅读器打开+锚定位（data-ai-note-id exact 层——AI-09 延展消费）；⑦
 *   自动保存失败路径→退出拦截弹窗（聚合面）——**mock 实现路径注
 *   （门一 N8）：contextIsolation 下 renderer 不可 mock contextBridge；
 *   须 electronApp.evaluate 在 main 侧 patch 写通道 handler，禁静默降级
 *   删用例**
 * - 环境：SYNAPSE_USER_DATA 隔离（e2e-env 既有机制——08/10 同型）；
 *   [F-BAKRET-01] 种子链=launch 前子进程直写库（e2e-env.seedLineageGraph
 *   ——seedPaperRow 同型基建）+T1 连线用真实产品路径（右键「连线到…」）
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
 * - **用例组映射（裁决 1）**：T1=①时间线真文本渲染（种子直写）+②滚动容器锚；
 *   T2=③时间线真文本 reload 持久（[A3] core_idea 编辑持久段退役删——
 *   写链持久面由 T10 改月全流承载）；T3=④重复加边拒绝
 *   toast（②U8 迁移面）+⑦写通道 patch 失败→保存失败指示条→真聚合脏态→close
 *   拦截两态；T4=⑤侧板分节分色+⑥AI 条目双击跳阅读器+锚定位。
 * - **种子链（[F-BAKRET-01] 改述+[F-ALIGN-01]）**：papers 经 e2e-env.seedPaperRow
 *   （甲=真实 PDF 供⑥跳转与⑤产物重锚；根/乙=幽灵行+year 元数据）；
 *   T1=launch 前 seedLineageGraph 直写节点+右键连线走产品路径（UI 添加节点
 *   随 [F-ALIGN-01] 退役——节点唯一来源=入库/移动两路）；
 *   T2-T10/T-P1b=launch 前 seedLineageGraph 直写库（month/slot 形态
 *   由种子载荷精确控制——UI 链无法表达的月组场景）。AI 笔记走 08 先例
 *   预置链不变。
 * - **⑦ mock**：app.evaluate 于 main 侧 ipcMain.removeHandler+handle 重注册
 *   'lineage/patch-node' 抛错（[F-ALIGN-01] 通道拆分换名）；退出拦截走
 *   **真聚合链**，close/断言形态=reader-text.spec.ts:285 退出拦截先例同型。
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

/** [T3-P6 回炉 T6] 砖砌锚两篇（幽灵行——月组种子载荷直写） */
const BRICK_PAPERS = [
  { id: 'e2e-lg-brick-a', title: '砖砌文献甲（e2e）' },
  { id: 'e2e-lg-brick-b', title: '砖砌文献乙（e2e）' }
] as const

/** 种子载荷：标准树（根→甲/乙——④的重复拒绝场景=对乙再加同端点对边被拒）；
 *  [A3 F-CONTRACTA-01 2026-10-04] coreIdea 种子键随 core_idea 全退役删除 */
function chainSeed(): { nodes: LineageSeedNode[]; edges: LineageSeedEdge[] } {
  return {
    nodes: PAPERS.map((p) => ({
      paperId: p.id,
      title: p.title,
      year: p.year
    })),
    edges: [
      { from: 'e2e-lg-root', to: 'e2e-lg-a', label: '继承甲' },
      { from: 'e2e-lg-root', to: 'e2e-lg-b', label: '' }
    ]
  }
}

/** [F-ALIGN-01] T1 种子载荷：三节点零边（边走 UI 产品路径——右键连线） */
function nodesOnlySeed(): { nodes: LineageSeedNode[]; edges: LineageSeedEdge[] } {
  return { nodes: chainSeed().nodes, edges: [] }
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

/** [F-BAKRET-01] T1 产品路径连线链：右键源卡「连线到…」→点目标卡 */
async function linkNodesViaUi(win: Page, fromTitle: string, toTitle: string): Promise<void> {
  const from = nodeG(win, fromTitle)
  await from.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  await from.click({ button: 'right' })
  await win.getByTestId('lineage-node-menu').getByRole('menuitem', { name: '连线到…' }).click()
  await expect(win.getByTestId('lineage-pending-link')).toBeVisible()
  await nodeG(win, toTitle).click()
}

/**
 * [RR3/d1-ΔN3] 点画布空白收线型列表（A12：点实线图标=armed+列表展开；
 * 展开列表浮层盖画布顶部带——建点钮删除后工具条几何左移，展开列表恰覆盖
 * 首组卡拖拽起点（RR2 探针实证：down 落 .lg-toolbar 域不达 .tl-content→
 * 画线链断零边；收列表后同几何拖拽边即产生）。点空白=onOutside 收列表+
 * armed 保持（A12 产品语义路径）——对工具条几何去敏感化的用例前置步。
 */
async function collapseLinetypeList(win: Page): Promise<void> {
  const tlBox = await win.getByTestId('lineage-timeline').boundingBox()
  if (tlBox === null) throw new Error('画布不可见')
  await win.mouse.click(tlBox.x + tlBox.width / 2, tlBox.y + tlBox.height * 0.9)
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
   * T1=验收面①②：时间线渲染真实文本（年份头/月标签/小卡题名/骑缝号——
   * 宪法 e2e 红线；[F-BAKRET-01] 原导入链改述；[F-ALIGN-01] UI 添加节点
   * 退役——节点=launch 前种子直写，UI 产品路径面=右键连线）+滚动容器锚。
   */
  test('T1 种子节点时间线渲染真实文本→UI 连线→滚动容器锚后节点仍可断言', async () => {
    const userData = await mkdtemp(join(tmpdir(), 'synapse-lg05-t1-'))
    await firstHop(userData)
    await seedLineagePapers(userData)
    // [F-ALIGN-01] 三节点零边种子（边走 UI 产品路径——右键「连线到…」）
    await seedLineageGraph(userData, nodesOnlySeed())

    const app = await launch(userData)
    const win = await app.firstWindow()
    await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })

    await win.getByRole('button', { name: '脉络', exact: true }).click()
    // 侧板空态（04 交付面顺带锚——无选中态）
    await expect(win.getByTestId('lineage-side-panel')).toHaveText('点击卡片查看详情') // [②U4/P-16] 迁移文案

    // ①种子三节点在场+两树边走 UI 产品路径（根→甲/乙，跨年=绕行折线族）——
    //   卡片/连线即时渲染（store 写回填）；骑缝号 .c-no=graph 通道 pubNos
    //   派生表（INV-92），UI 增量写不重取整图——编号断言置于段末 reload 后
    //   （冷读全图载荷——与原导入链「导入后 store 重取」等价数据面）
    for (const pp of PAPERS) {
      await expect(nodeG(win, pp.title)).toBeVisible({ timeout: 10_000 })
    }
    // [RR2] 补回进 edit 态：保存钮在 edit 工具组（browse=slim 条零 save-btn）
    // ——原 addPaperNodeViaUi 内含的 mode-edit click 随其删除丢失（本地指纹
    // =click 永 waiting；非编辑动作链不受影响：右键连线/乐观渲染无模式门）
    await win.getByTestId('lineage-mode-edit').click()
    await linkNodesViaUi(win, '脉络根文献', '脉络甲文献')
    await linkNodesViaUi(win, '脉络根文献', '脉络乙文献')
    await expect(win.getByText('脉络根文献')).toBeVisible()
    // [T3-P7A] 连线出现锚（渲染恢复承诺兑现）：2 条树边（根→甲/乙，
    // 跨年=绕行折线族）→ svg.tl-edges 可见 path ≥1；边端点在场校验=两路径
    // 各自挂 data-edge-id（结构真渲染非空 svg）
    const edgePaths = win.locator('svg.tl-edges path.tl-edge')
    await expect(edgePaths).toHaveCount(2, { timeout: 10_000 })
    expect(await win.locator('.tl-legend').textContent()).toContain('实线') // [②U8] 图例两型（kind 四值体系退役——形态语义）

    // ②滚动容器锚（pan/zoom INV-43/44 退役→滚动定位语义）：fixture 三
    //   节点内容不满视口——先注入临时高度制造可滚面（evaluate 测试手段
    //   非产品面，probe 先例），再验 scrollTop 真推进+首年份头滚出容器顶
    //   （d1-W3 回炉：防「容器不可滚也绿」恒真面）+节点文本仍可断言
    // [t1race] 注入走 head <style>：探针 run 37141870865 终裁——CI 红
    // 真因=固定滚动量 300 的环境敏感假设（见 [t1race-r2] 注），非样式
    // 清除（head 注入后几何不变=证伪 v1「内联被 React commit 清除」假说）；
    // head 形态保留=防御性稳妥（注入与 React 渲染面隔离，免疫任何样式
    // 清除路径——v1 假说虽证伪，隔离价值独立成立）
    await win.evaluate(() => {
      const style = document.createElement('style')
      style.id = 'e2e-tl-scroll-domain'
      style.textContent = '.tl-content { min-height: 2000px !important }'
      document.head.append(style)
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
    // [t1race-r2] 滚动量=滚到底而非固定 300：固定量假设「首段贴近容器顶+
    // 无滚动残留」，CI 窄窗（windows-latest 默认屏 1024×720→timeline 宽
    // 476）下三重失效——编辑工具条换行高 298.75（本地 70.4）+自然内容
    // 946>610 溢出+连线链 scrollIntoView 残留 scrollTop=336（探针 run
    // 37141870865：y0=396.75，滚 300 后 96.75>80 红）；滚到 maxScroll
    // 的成立域=clientHeight<(scrollHeight−y0)+80（CI 实测门槛≈1982px
    // 视口高上界；注入撑 scrollHeight≥2000，常规视口恒满足、极端高视口
    // 退化态由 scrolledTop>0 守卫响亮红）
    const scrolledTop = await timeline.evaluate((el) => {
      el.scrollTop = el.scrollHeight
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

    // [②U1] 会话语义：两边在暂存→点工具组保存钮批量落库（edit 态；节点=种子直写）
    await win.getByTestId('lineage-save-btn').click()
    await expect(win.getByTestId('lineage-save-error')).toHaveCount(0, { timeout: 10_000 })

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
   * T2=验收面③：时间线真文本 reload 持久（[T3-P6 主控裁决] 拖拽 x/y
   * 持久随自由拖拽退役——P8 槽位重排接缝；持久锚=年份头/月标签/小卡
   * 题名）。同一 launch 两轮 reload。
   * [A3 F-CONTRACTA-01 2026-10-04] core_idea 编辑持久段随 core_idea 全退役
   * 删除（编辑对话框+详情面板 idea 区+写链同批退役——「核心想法」语义由全文
   * 笔记 notes.contentMd 承接）；节点写链 reload 持久面由 T10 改月全流承载。
   */
  test('T2 时间线真文本 reload 持久', async () => {
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

    // [A3] 退役面负锚：节点菜单无「编辑核心想法」项+详情面板（选中态挂载后）
    // 无 idea 区。菜单关闭=透明遮罩点击（ESC 归 Dialog 域不关菜单——NodeMenu
    // 头注口径）；遮罩 fixed inset-0 全屏——右键菜单恰锚在卡片鼠标位上方，
    // 点卡片=点中菜单本体被拦截，须坐标点击画布空白处落遮罩（RR2 主控亲执：
    // executor 首版两击选卡策略被菜单拦截 60s 超时实测）
    const cardA = nodeG(win, '脉络甲文献')
    await cardA.evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await cardA.click({ button: 'right' })
    await expect(win.getByTestId('lineage-node-menu')).toBeVisible()
    await expect(
      win.getByTestId('lineage-node-menu').getByRole('menuitem', { name: '编辑核心想法' })
    ).toHaveCount(0)
    await win.mouse.click(50, 520) // 画布空白落透明遮罩——关菜单
    await expect(win.getByTestId('lineage-node-menu')).toHaveCount(0)
    await cardA.click() // 选中——面板挂载
    await expect(win.getByTestId('lineage-side-panel')).toBeVisible()
    await expect(win.getByTestId('lineage-side-idea')).toHaveCount(0)

    await app.close()
  })

  /**
   * T3=验收面④⑦：重复加边（同端点对）→CONFLICT toast（②U8 多父守卫退役迁移）；
   * 写通道 main 侧 patch 抛错（N8）→保存失败指示条→真聚合脏态→close
   * 拦截两态（取消保持/确认 destroy）。
   */
  test('T3 重复加边拒绝 toast+保存失败→脏态退出拦截两态（②批：多父守卫随 kind 体系退役——拒绝面迁移）', async () => {
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

    // [②U8] 多父守卫随 kind 四值体系退役（manual 不限条数）——拒绝面迁移=
    // 重复端点对：根→乙已有边；右键根「连线到…」→点乙→同端点对被拒（UNIQUE
    // 前置应用层守卫）。[②U1] 会话语义：动作入暂存→点保存→CONFLICT 丢弃+
    // toast+库态重拉（乐观值消解）
    await nodeG(win, '脉络根文献').click({ button: 'right' })
    await win.getByTestId('lineage-node-menu').getByRole('menuitem', { name: '连线到…' }).click()
    await expect(win.getByTestId('lineage-pending-link')).toBeVisible()
    await nodeG(win, '脉络乙文献').click()
    // 工具组保存钮（edit 态——②U2 重做；旧 autosave 已退役：保存驱动）
    await win.getByTestId('lineage-mode-edit').click()
    await win.getByTestId('lineage-save-btn').click()
    await expect(win.getByText(/该逻辑线已存在（.+），重复边被拒绝/)).toBeVisible({ timeout: 10_000 })
    // 拒绝型动作被丢弃不卡队列——会话回 clean（行内错误零残留）
    await expect(win.getByTestId('lineage-save-error')).toHaveCount(0, { timeout: 10_000 })
    // 库态重拉消解乐观边：边数回落种子值（2 条）
    await expect(win.locator('svg.tl-edges path.tl-edge')).toHaveCount(2, { timeout: 10_000 })

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
      // [F-ALIGN-01] 写通道=patch-node（upsert-node 随新建路退役换名）
      ipcMain.removeHandler('lineage/patch-node')
      ipcMain.handle('lineage/patch-node', async () => {
        throw new Error('模拟写库失败（e2e 桩）')
      })
    })

    // 写失败触发=[T3-P6 适配] 拖拽退役→原编辑 core_idea 写通道（[A3
    //   F-CONTRACTA-01 2026-10-04] 对话框随 core_idea 全退役删除）→改月写通道
    //   （同一 patch-node 失败面：handler 已 patch 抛错→error 保存态）
    const ymFail = nodeG(win, '脉络甲文献').locator('.c-ym')
    await ymFail.click()
    const popFail = win.getByTestId('month-pop')
    await expect(popFail).toBeVisible()
    await popFail.locator('.ws-item[data-ym="2023|null"]').click()
    // moveTargetLabel(year, null)=「未定月」（不带年——null 月短路先例）：
    // 甲 2022 未定月→2023 未定月=跨年 override patch 入暂存
    await expect(win.getByText('已移至 未定月')).toBeVisible({ timeout: 10_000 })
    // [②U1] 会话语义：改月入暂存（dirty）→点工具组保存钮→批量落库失败=
    // 行内错误+重试（退役行 4：chip→保存钮行内错误）
    await expect(win.getByTestId('lineage-save-btn')).toBeEnabled()
    await win.getByTestId('lineage-save-btn').click()
    const statusBar = win.getByTestId('lineage-save-error')
    await expect(statusBar).toBeVisible({ timeout: 10_000 })
    await expect(statusBar).toHaveText(/保存失败：/)
    await expect(win.getByTestId('lineage-save-retry')).toBeVisible()

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
    await expect(win.getByTestId('panel-star')).toHaveAttribute('title', '星标功能即将开放') // [②U4/行 9] 已绑定文献徽章随 core UI 消费面退役——星标禁用呈现承接
    // [A3 F-CONTRACTA-01 2026-10-04] core_idea 侧板渲染面随全退役删除——
    // 面板无 idea 区（负锚；原「脉络甲的核心 idea」文本锚消亡）
    await expect(win.getByTestId('lineage-side-idea')).toHaveCount(0)
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
        ...PAPERS.map((p) => ({ paperId: p.id, title: p.title, year: 2020, month: 5 })),
        ...BRICK_PAPERS.map((p) => ({ paperId: p.id, title: p.title, year: 2020, month: 5 }))
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
   * T-P1b=[批 3 迁移；T3-P7A 裁决部首日兑现] resize 不错位真机直证：
   * setViewportSize 两档（1280→1000）→ResizeObserver 重算→（a）首条树边
   * （根→甲）route=band（批 3 终落锚散开：月标封堵首选 slot 后同边 slot
   * 近序散开承接——跨年边不再绕右走廊；观测窗=path[data-route] 可见层
   * 属性，99eacd5e 落）；（b）band 由卡位派生非 contentW 锚定（走廊时代
   * laneX=contentW−48+9×lane 参数族谓词随绕右形态退役）——收窄只削内容
   * 右缘、卡零迁移，故断言面=路径对内容盒左缘偏移两档全等（卡锚定几何
   * 内容坐标不变性——若路径 stale 而卡迁移即错位红）+线-卡 y 相对关系
   * 恒定；（c）跨年边不穿月标（路径段化采样 128 点折线段 vs .month-tag
   * rect 线段-矩形判交——zigzag 路径 bbox 角区与月标恒相交而路径几何
   * 净空，bbox 级判交假阳性，批 3 探针实证 tagHit=true 且路径距月标
   * ≥14px）。
   * [回炉 W3 守卫边界] band 由卡位派生，两档 d 全等为批 3 探针实证——
   * stale 路径区分=contentW poll+route 复核弱守卫；强守卫（收窄触发卡
   * 换行重排）由 T6 瀑布错位用例承载（主控挂账知悉）。
   */
  test('T-P1b resize 直证：两档视口→route=band+路径卡锚定几何两档全等+线-卡 y 相对关系恒定', async () => {
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

    // 量测单 evaluate 原子取（viewport 坐标同拍——path bbox/content 左缘/
    // 宽度/卡 y 混算坐标系即错位，P7B 首跑实证沿承）
    const measure = async (): Promise<{ route: string; bboxX: number; contentLeft: number; contentW: number; relY: number }> =>
      win.evaluate(() => {
        const path = document.querySelector('svg.tl-edges path.tl-edge') as SVGPathElement | null
        const ct = document.querySelector('.tl-content') as HTMLElement | null
        const card = document.querySelector('.tl-card') as HTMLElement | null
        if (path === null || ct === null || card === null) {
          return { route: '', bboxX: -1, contentLeft: -1, contentW: -1, relY: 0 }
        }
        const pr = path.getBoundingClientRect()
        const cr = ct.getBoundingClientRect()
        const kr = card.getBoundingClientRect()
        return {
          route: path.dataset.route ?? '',
          bboxX: pr.x,
          contentLeft: cr.left,
          contentW: cr.width,
          relY: pr.y - kr.y
        }
      })
    // (c) 跨年边不穿月标：[回炉 W4] 段化精确判交——路径沿弧长采样 128 点、
    // 相邻采样点连成折线段，每段对每 .month-tag rect 做线段-矩形判交
    // （Liang-Barsky，与 avoid.ts segHitsRect 同式含边界相触=命中；点采样
    // 漏小目标窗面消除——段距亚像素级、圆角曲率近似误差可忽略）；坐标映射
    // 自校准（getBBox 用户坐标 vs getBoundingClientRect 缩放/平移——不依赖
    // svg 定位假设）
    const pathClearOfTags = async (): Promise<boolean> =>
      win.evaluate(() => {
        const path = document.querySelector('svg.tl-edges path.tl-edge') as SVGPathElement | null
        if (path === null) return false
        const bb = path.getBBox()
        const br = path.getBoundingClientRect()
        const z = bb.width === 0 ? 1 : br.width / bb.width
        const ox = br.left - bb.x * z
        const oy = br.top - bb.y * z
        const tags = Array.from(document.querySelectorAll('.month-tag')).map((t) => t.getBoundingClientRect())
        const segHitsRect = (
          ax: number,
          ay: number,
          bx: number,
          by: number,
          l: number,
          tp: number,
          r: number,
          bm: number
        ): boolean => {
          let t0 = 0
          let t1 = 1
          const dx = bx - ax
          const dy = by - ay
          const edges: Array<[number, number]> = [
            [-dx, ax - l],
            [dx, r - ax],
            [-dy, ay - tp],
            [dy, bm - ay]
          ]
          for (const [den, num] of edges) {
            if (den === 0) {
              if (num < 0) return false
              continue
            }
            const q = num / den
            if (den < 0) {
              if (q > t1) return false
              if (q > t0) t0 = q
            } else {
              if (q < t0) return false
              if (q < t1) t1 = q
            }
          }
          return true
        }
        const total = path.getTotalLength()
        const N = 128
        let prev: { x: number; y: number } | null = null
        for (let k = 0; k <= N; k++) {
          const p = path.getPointAtLength((total * k) / N)
          const px = ox + p.x * z
          const py = oy + p.y * z
          if (prev !== null) {
            for (const tr of tags) {
              if (segHitsRect(prev.x, prev.y, px, py, tr.left, tr.top, tr.right, tr.bottom)) return false
            }
          }
          prev = { x: px, y: py }
        }
        return true
      })
    // (a) 首条树边（根→甲）route=band（批 3 散开承接——corridor 参数族
    // 谓词随绕右形态退役）
    await expect.poll(async () => (await measure()).route).toBe('band')
    const m1 = await measure()
    // (c) 首档不穿月标
    expect(await pathClearOfTags()).toBe(true)
    // 第二档：收窄 280px——ResizeObserver+rAF 重算后 poll（CSS 宽同步先变、
    // rAF 重算晚帧——只 poll contentW 会取到陈旧路径坐标，[回炉 R4] 沿承；
    // route 面随 poll 复核=窄档重算不退 corridor/fallback）
    await win.setViewportSize({ width: 1000, height: 860 })
    await expect
      .poll(async () => {
        const m = await measure()
        return m.contentW < m1.contentW - 200 && m.route === 'band'
      })
      .toBe(true)
    const m2 = await measure()
    // (b) 路径对内容盒左缘偏移两档全等（卡锚定几何不变性——band 由卡位
    // 派生，收窄只削右缘；两档 d 全等为批 3 探针实证）
    expect(m2.bboxX - m2.contentLeft).toBeCloseTo(m1.bboxX - m1.contentLeft, 1)
    // (b) 纵向相对关系恒定（线-卡 y 差不变——错位即红）
    expect(m2.relY).toBeCloseTo(m1.relY, 1)
    // (c) 窄档不穿月标
    expect(await pathClearOfTags()).toBe(true)

    await app.close()
  })

  /**
   * T9=[T3-P8] 拖拽调序全流：edit 态驱动（[F-LGRAPH-01①] 三模式闸——拖卡=
   * edit 专属，browse 默认态被闸拒）pointerdown 5px 阈值激活→占位槽「置 入」
   * 在场→月内移位→松手 settle→DOM 序=新序（store 回填重排）→reload 持久
   * （INV-75 slot 全序）→跨月拒绝 toast+落当前槽。几何断言经 win.mouse
   * 原生指针链。
   */
  test('T9 拖拽调序全流：拖→置入槽→松手→DOM 序=新序+reload 持久+[②U6] 跨月物理域回弹无 toast+edit 态驱动', async () => {
    test.slow()
    const userData = await mkdtemp(join(tmpdir(), 'synapse-lg05-t9-'))
    await firstHop(userData)
    await seedLineagePapers(userData)
    // 同月双卡（2020-05：根+甲）+他月单卡（2020-06：乙）——月内重排与跨月面
    // （slot 显式=INV-75 组内全序——null 末序会颠倒 reload 后组内呈现）
    await seedLineageGraph(userData, {
      nodes: [
        { paperId: 'e2e-lg-root', title: '脉络根文献', year: 2020, month: 5, slot: 1 },
        { paperId: 'e2e-lg-a', title: '脉络甲文献', year: 2020, month: 5, slot: 2 },
        { paperId: 'e2e-lg-b', title: '脉络乙文献', year: 2020, month: 6, slot: 1 }
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
    await expect(win.locator('.drag-slot:not(.cand)')).toHaveText('置 入', { timeout: 5_000 })
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
    await expect(win.getByTestId('lineage-save-error')).toHaveCount(0)

    // [②U6/退役行 7] 跨月=物理域回弹：拖乙（2020-06 框）落 2020-05 框→无 toast
    // （INV-83 子句退役）+回弹原位（乙仍在原框、源月序不受染——no-op 零写）
    const bBox = await cardBox('脉络乙文献')
    const aBox2 = await cardBox('脉络甲文献')
    await win.mouse.move(bBox.x + bBox.width / 2, bBox.y + bBox.height / 2)
    await win.mouse.down()
    await win.mouse.move(aBox2.x + aBox2.width / 2, aBox2.y + aBox2.height / 2, { steps: 6 })
    await win.mouse.up()
    await expect(
      win.getByText('不能跨月拖动——请进入编辑模式，点卡片月标修改月份')
    ).toHaveCount(0, { timeout: 3_000 })
    await expect
      .poll(async () => await frameTitles(1), { timeout: 10_000 })
      .toEqual(['脉络乙文献'])

    // [②U1] 会话语义：调序入暂存→点工具组保存钮批量落库（edit 态在场）
    await win.getByTestId('lineage-save-btn').click()
    await expect(win.getByTestId('lineage-save-error')).toHaveCount(0, { timeout: 10_000 })

    // reload 持久：slot 全序=新序（甲 slot0/根 slot1）
    await reloadToLineage(win)
    await expect
      .poll(async () => await frameTitles(0), { timeout: 10_000 })
      .toEqual(['脉络甲文献', '脉络根文献'])

    // [lnfix2] 月框下拉扩展贯通段：拖甲至 2020-05 框底缘下方（冻结基准下拉带
    // bottom0+40——激活帧 rAF 快照源框稳态底缘）→ .month-frame.stretch 在场
    // +微动（+50）不回框 class 稳定（冻结基准消振荡——实时 rect 已被 stretch
    // padding/腾行推高不反噬判定）→松手组末落位（extend 路径写=框内末位同值，
    // 纯视觉链）。reload 后回 browse——再进 edit（拖卡=edit 专属闸）
    await win.getByTestId('lineage-mode-edit').click()
    const frameBox = await win.locator('.month-frame').first().boundingBox()
    if (frameBox === null) throw new Error('月框不可见：2020-05')
    const aBox3 = await cardBox('脉络甲文献')
    await win.mouse.move(aBox3.x + aBox3.width / 2, aBox3.y + aBox3.height / 2)
    await win.mouse.down()
    await win.mouse.move(frameBox.x + frameBox.width * 0.5, frameBox.y + frameBox.height + 40, { steps: 8 })
    await expect(win.locator('.month-frame.stretch')).toHaveCount(1, { timeout: 5_000 })
    await win.mouse.move(frameBox.x + frameBox.width * 0.5, frameBox.y + frameBox.height + 50, { steps: 2 })
    await expect(win.locator('.month-frame.stretch')).toHaveCount(1, { timeout: 2_000 })
    await win.mouse.up()
    await expect(win.locator('.month-frame.stretch')).toHaveCount(0, { timeout: 5_000 })
    await expect
      .poll(async () => await frameTitles(0), { timeout: 10_000 })
      .toEqual(['脉络根文献', '脉络甲文献'])

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
        { paperId: 'e2e-lg-root', title: '脉络根文献', year: 2020, month: 5, slot: 1 },
        { paperId: 'e2e-lg-a', title: '脉络甲文献', year: 2020, month: 5, slot: 2 },
        { paperId: 'e2e-lg-b', title: '脉络乙文献', year: 2020, month: 6, slot: 1 }
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
    // [②U1] 会话语义：改月入暂存→点工具组保存钮批量落库
    await win.getByTestId('lineage-save-btn').click()
    await expect(win.getByTestId('lineage-save-error')).toHaveCount(0, { timeout: 10_000 })

    // reload 持久：甲仍在 2020-06 尾部（服务端组变 max+1 归一+lineageOrder）
    await reloadToLineage(win)
    await expect
      .poll(async () => await frameTitles(1), { timeout: 10_000 })
      .toEqual(['脉络乙文献', '脉络甲文献'])

    await app.close()
  })

  /**
   * [F-LGRAPH-01②U4] T11=卡三层真实文本+详情面板联动+保存流。
   */
  test('T11 卡三层+详情面板+保存流（②U4：L3 真实文本/面板联动/dirty→clean/核 chip 零残留）', async () => {
    test.slow()
    const userData = await mkdtemp(join(tmpdir(), 'synapse-lg05-t11-'))
    await firstHop(userData)
    const bytesA = createTinyPdf(`脉络甲文献 ${PDF_KNOWN_TEXT}`)
    const shaA = createHash('sha256').update(bytesA).digest('hex')
    const fileRefA = `${shaA.slice(0, 2)}/${shaA.slice(2, 4)}/${shaA}.pdf`
    const absA = join(userData, 'files', ...fileRefA.split('/'))
    mkdirSync(dirname(absA), { recursive: true })
    writeFileSync(absA, bytesA)
    await seedPaperRow(userData, fileRefA, shaA, '脉络甲文献', 'e2e-lg-a', {
      year: 2022, venue: 'Water Res.', cited: 17, impact: 11.2
    })
    for (const pp of [PAPERS[0], PAPERS[2]]) {
      const ghostSha = createHash('sha256').update(`lg-ghost-${pp.id}`).digest('hex')
      await seedPaperRow(
        userData,
        `${ghostSha.slice(0, 2)}/${ghostSha.slice(2, 4)}/${ghostSha}.pdf`,
        ghostSha,
        pp.title,
        pp.id,
        { year: pp.year }
      )
    }
    await seedLineageGraph(userData, {
      nodes: [
        { paperId: 'e2e-lg-root', title: '脉络根文献', year: 2020, month: 5, slot: 1, libraryTags: ['方法', '流域', '调度'] },
        { paperId: 'e2e-lg-a', title: '脉络甲文献', year: 2020, month: 5, slot: 2 },
        { paperId: 'e2e-lg-b', title: '脉络乙文献', year: 2020, month: 6, slot: 1 }
      ],
      edges: []
    })
    const app = await launch(userData)
    const win = await app.firstWindow()
    await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await expect(nodeG(win, '脉络根文献')).toBeVisible({ timeout: 10_000 })
    const root = nodeG(win, '脉络根文献')
    const cardA = nodeG(win, '脉络甲文献')
    await expect(root.getByTestId('card-star')).toHaveAttribute('title', '星标功能即将开放')
    await expect(root.locator('.c-tag')).toHaveCount(2)
    await expect(root.locator('.c-tag-more')).toHaveText('+1')
    await expect(cardA.locator('.c-venue')).toHaveText('Water Res.')
    await expect(cardA.locator('.c-if')).toHaveText('IF 11.2')
    await expect(cardA.locator('.c-cited')).toHaveText('被引 17')
    await expect(root.locator('.c-venue')).toHaveCount(0)
    await expect(root.locator('.mb')).toHaveCount(0)
    await cardA.click()
    await expect(win.getByTestId('lineage-side-panel')).toContainText('Water Res.')
    await expect(win.getByTestId('lineage-side-panel')).toContainText('IF 11.2')
    await expect(win.getByTestId('lineage-side-panel')).toContainText('被引 17')
    await expect(win.getByTestId('lineage-side-panel')).toContainText('双击卡片跳转阅读器')
    await expect(win.getByTestId('panel-star')).toHaveAttribute('title', '星标功能即将开放')
    await cardA.dblclick()
    await expect(win.getByText(PDF_KNOWN_TEXT).first()).toBeVisible({ timeout: 15_000 })
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await expect(cardA).toBeVisible({ timeout: 10_000 })
    await win.getByTestId('lineage-mode-edit').click()
    const aBox = await cardA.boundingBox()
    const rootBox = await root.boundingBox()
    if (aBox === null || rootBox === null) throw new Error('卡不可见')
    await win.mouse.move(aBox.x + aBox.width / 2, aBox.y + aBox.height / 2)
    await win.mouse.down()
    await win.mouse.move(rootBox.x + rootBox.width * 0.25, rootBox.y + rootBox.height / 2, { steps: 6 })
    await win.mouse.up()
    await expect(win.getByTestId('lineage-save-btn')).toBeEnabled({ timeout: 10_000 })
    await win.getByTestId('lineage-save-btn').click()
    await expect(win.getByTestId('lineage-save-btn')).toBeDisabled({ timeout: 10_000 })
    await expect(win.getByTestId('lineage-save-error')).toHaveCount(0)
    await app.close()
  })

  /**
   * [F-LGRAPH-01②U3/U5] T12=画线全链+手动调线+右键菜单（软断言=INV-79 e2e 口径）。
   */
  test('T12 画线全链+手动调线+右键菜单（②U5：手柄/加点/拖顶点/穿卡警示软断言）', async () => {
    test.slow()
    const userData = await mkdtemp(join(tmpdir(), 'synapse-lg05-t12-'))
    await firstHop(userData)
    await seedLineagePapers(userData)
    await seedLineageGraph(userData, {
      nodes: [
        { paperId: 'e2e-lg-root', title: '脉络根文献', year: 2020, month: 5, slot: 1 },
        { paperId: 'e2e-lg-a', title: '脉络甲文献', year: 2020, month: 5, slot: 2 }
      ],
      edges: []
    })
    const app = await launch(userData)
    const win = await app.firstWindow()
    await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await expect(nodeG(win, '脉络根文献')).toBeVisible({ timeout: 10_000 })
    await win.getByTestId('lineage-mode-edit').click()
    await win.getByTestId('lineage-tool-solid').click()
    // [RR2→RR3 helper 化] 点外部收线型列表（几何去敏感化——见 collapseLinetypeList 注记）
    await collapseLinetypeList(win)
    const root = nodeG(win, '脉络根文献')
    const cardA = nodeG(win, '脉络甲文献')
    const rb = await root.boundingBox()
    const ab = await cardA.boundingBox()
    if (rb === null || ab === null) throw new Error('卡不可见')
    await win.mouse.move(rb.x + rb.width - 2, rb.y + rb.height / 2)
    await win.mouse.down()
    await win.mouse.move(ab.x + 2, ab.y + ab.height / 2, { steps: 8 })
    await win.mouse.up()
    await expect(win.getByTestId('lineage-save-btn')).toBeEnabled({ timeout: 10_000 })
    await win.getByTestId('lineage-save-btn').click()
    await expect(win.getByTestId('lineage-save-btn')).toBeDisabled({ timeout: 10_000 })
    const hit = win.locator('.tl-edge-hit').first()
    await hit.click({ force: true })
    await expect(win.getByTestId('edge-handles')).toBeVisible({ timeout: 5_000 })
    await expect(win.locator('[data-testid="edge-handle-end"]')).toHaveCount(2)
    // 线身右键菜单（先于加点——短线加中点柄后中心被顶点柄占据）：标题「● 命中」
    // +四菜单项；Esc 关闭（右键取线中心——无中点柄时段身可达）
    const hbMenu = await hit.boundingBox()
    if (hbMenu === null) throw new Error('命中层不可见')
    await hit.click({ button: 'right', force: true, position: { x: hbMenu.width * 0.5, y: hbMenu.height / 2 } })
    const menu = win.getByTestId('edge-menu')
    await expect(menu).toBeVisible({ timeout: 5_000 })
    await expect(menu.getByTestId('edge-menu-title')).toContainText('● 命中')
    for (const item of ['重置走线', '删除连线']) {
      await expect(menu.getByRole('menuitem', { name: item })).toBeVisible()
    }
    // 线形与颜色=分区标签+色板点（非 menuitem 角色——呈现面断言）
    await expect(menu.getByText('线形与颜色')).toBeVisible()
    await expect(menu.locator('.edge-color-dot').first()).toBeVisible()
    await win.keyboard.press('Escape')
    await expect(menu).toHaveCount(0)
    // 段中点加点：短线（相邻卡 20px 隙）两端圆柄 r≈5 盖住端区——取线中心
    // （端柄 25% 位命中=端点重连拖拽面）
    await hit.click({ force: true, position: { x: hbMenu.width * 0.5, y: hbMenu.height / 2 } })
    await expect(win.getByTestId('edge-handles')).toBeVisible({ timeout: 5_000 })
    await hit.dblclick({ force: true, position: { x: hbMenu.width * 0.5, y: hbMenu.height / 2 } })
    await expect(win.locator('[data-testid="edge-handle-vertex"]')).toHaveCount(1, { timeout: 5_000 })
    const handle = win.locator('[data-testid="edge-handle-vertex"]').first()
    const hb = await handle.boundingBox()
    if (hb === null) throw new Error('手柄不可见')
    await win.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2)
    await win.mouse.down()
    await win.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2 + 30, { steps: 5 })
    await win.mouse.up()
    await expect(win.getByTestId('lineage-save-btn')).toBeEnabled({ timeout: 10_000 })
    await win.getByTestId('lineage-save-btn').click()
    await expect(win.getByTestId('lineage-save-error')).toHaveCount(0, { timeout: 10_000 })
    // 顶点右键=「顶点 #N（方柄）● 命中」+删除顶点（via-1）
    await hit.click({ force: true })
    await expect(win.getByTestId('edge-handles')).toBeVisible({ timeout: 5_000 })
    await win.locator('[data-testid="edge-handle-vertex"]').first().click({ button: 'right', force: true })
    const vmenu = win.getByTestId('edge-menu')
    await expect(vmenu).toBeVisible({ timeout: 5_000 })
    await expect(vmenu.getByTestId('edge-menu-title')).toContainText('（方柄）● 命中')
    await vmenu.getByRole('menuitem', { name: '删除顶点' }).click()
    await expect(win.locator('[data-testid="edge-handle-vertex"]')).toHaveCount(0, { timeout: 5_000 })
    await win.getByTestId('lineage-save-btn').click()
    await expect(win.getByTestId('lineage-save-error')).toHaveCount(0, { timeout: 10_000 })
    await reloadToLineage(win)
    await expect(win.locator('.tl-edge')).toHaveCount(1, { timeout: 10_000 })
    await app.close()
  })

  /**
   * [lnfix1] T12b=画线链三缺口（用户视检定性①）：a) armed 待机锚点指示圆点
   * b) 落点容差 12 边界建边 c) 落空分层反馈（他卡膨胀圈=toast/空白=静默负锚）。
   */
  test('T12b 画线锚点指示+容差边界+落空分层反馈（lnfix1：hint 在场/±10 建边/toast 分层）', async () => {
    test.slow()
    const userData = await mkdtemp(join(tmpdir(), 'synapse-lg05-t12b-'))
    await firstHop(userData)
    await seedLineagePapers(userData)
    await seedLineageGraph(userData, {
      nodes: [
        { paperId: 'e2e-lg-root', title: '脉络根文献', year: 2020, month: 5, slot: 1 },
        { paperId: 'e2e-lg-a', title: '脉络甲文献', year: 2020, month: 5, slot: 2 }
      ],
      edges: []
    })
    const app = await launch(userData)
    const win = await app.firstWindow()
    await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await expect(nodeG(win, '脉络根文献')).toBeVisible({ timeout: 10_000 })
    await win.getByTestId('lineage-mode-edit').click()
    await win.getByTestId('lineage-tool-solid').click()
    // [RR2→RR3 helper 化] 点外部收线型列表（几何去敏感化——见 collapseLinetypeList 注记）
    await collapseLinetypeList(win)
    const root = nodeG(win, '脉络根文献')
    const cardA = nodeG(win, '脉络甲文献')
    const rb = await root.boundingBox()
    const ab = await cardA.boundingBox()
    if (rb === null || ab === null) throw new Error('卡不可见')
    const hint = win.getByTestId('draw-anchor-hint')
    // a) armed hover 近卡缘（右中锚旁 2px）→指示圆点在场+坐标=最近锚内容坐标
    await win.mouse.move(rb.x + rb.width - 2, rb.y + rb.height / 2)
    await expect(hint).toHaveCount(1)
    const pos = await win.evaluate(() => {
      const content = document.querySelector('.tl-content')
      const rootCard = Array.from(document.querySelectorAll('.tl-card[data-node-id]')).find((c) =>
        (c.textContent ?? '').includes('脉络根文献')
      )
      const circle = document.querySelector('[data-testid="draw-anchor-hint"] circle')
      if (!(content instanceof HTMLElement) || rootCard === undefined || circle === null) return null
      const cb = content.getBoundingClientRect()
      const cr = rootCard.getBoundingClientRect()
      return {
        ax: cr.right - cb.left,
        ay: cr.top + cr.height / 2 - cb.top,
        hx: Number(circle.getAttribute('cx')),
        hy: Number(circle.getAttribute('cy'))
      }
    })
    if (pos === null) throw new Error('hint 坐标采集失败')
    expect(Math.abs(pos.hx - pos.ax)).toBeLessThanOrEqual(0.5)
    expect(Math.abs(pos.hy - pos.ay)).toBeLessThanOrEqual(0.5)
    // a 负锚) hover 卡身中心（距最近锚>12）→不在场（60ms=hint 节流窗让位，非断言 sleep）
    await win.waitForTimeout(60)
    await win.mouse.move(rb.x + rb.width / 2, rb.y + rb.height / 2)
    await expect(hint).toHaveCount(0)
    // b) 容差 12 边界：源/落点均锚旁 10px（旧容差 6 不可达）→建边
    await win.mouse.move(rb.x + rb.width - 10, rb.y + rb.height / 2)
    await win.mouse.down()
    await win.mouse.move(ab.x + 10, ab.y + ab.height / 2, { steps: 8 })
    await win.mouse.up()
    await expect(win.locator('svg.tl-edges path.tl-edge')).toHaveCount(1, { timeout: 5_000 })
    await expect(win.getByTestId('lineage-save-btn')).toBeEnabled()
    // d) 空白松手=静默取消（无 toast 负锚+armed 保留）——先于 c 排（c 的 toast 残影防污）
    await win.getByTestId('lineage-tool-solid').click()
    const tlBox = await win.getByTestId('lineage-timeline').boundingBox()
    if (tlBox === null) throw new Error('画布不可见')
    const blankX = tlBox.x + tlBox.width - 40
    const blankY = tlBox.y + tlBox.height - 40
    await win.mouse.move(rb.x + rb.width - 2, rb.y + rb.height / 2)
    await win.mouse.down()
    await win.mouse.move(blankX, blankY, { steps: 6 })
    await win.mouse.up()
    await expect(win.getByText('落点未在连接点上，未创建连线')).toHaveCount(0)
    await expect(win.locator('svg.tl-edges path.tl-edge')).toHaveCount(1)
    // c) 落他卡卡身中心（膨胀圈内非锚）→toast+无边+armed 保留（hint 复在场）
    await win.mouse.move(rb.x + rb.width - 2, rb.y + rb.height / 2)
    await win.mouse.down()
    await win.mouse.move(ab.x + ab.width / 2, ab.y + ab.height / 2, { steps: 8 })
    await win.mouse.up()
    await expect(win.getByText('落点未在连接点上，未创建连线')).toBeVisible({ timeout: 5_000 })
    await expect(win.locator('svg.tl-edges path.tl-edge')).toHaveCount(1)
    await win.waitForTimeout(60)
    await win.mouse.move(rb.x + rb.width - 2, rb.y + rb.height / 2)
    await expect(hint).toHaveCount(1)
    // 收尾保存（quit-dirty 拦截防 close 挂死：b 建边入暂存=dirty，未保存时
    // app.close 被 main preventDefault+确认对话框拦——T12 保存后 close 同型）
    await win.getByTestId('lineage-save-btn').click()
    await expect(win.getByTestId('lineage-save-btn')).toBeDisabled({ timeout: 10_000 })
    await app.close()
  })

  /**
   * [F-LGRAPH-01②U6/U7] T13=聚焦 dim+缩放+拖拽候选槽+退役零残留。
   */
  test('T13 聚焦 dim+缩放+拖拽候选槽+退役零残留（②U6/U7）', async () => {
    test.slow()
    const userData = await mkdtemp(join(tmpdir(), 'synapse-lg05-t13-'))
    await firstHop(userData)
    await seedLineagePapers(userData)
    await seedLineageGraph(userData, {
      nodes: [
        { paperId: 'e2e-lg-root', title: '脉络根文献', year: 2020, month: 5, slot: 1 },
        { paperId: 'e2e-lg-a', title: '脉络甲文献', year: 2020, month: 5, slot: 2 }
      ],
      edges: [{ from: 'e2e-lg-root', to: 'e2e-lg-a', label: '继承甲' }]
    })
    const app = await launch(userData)
    const win = await app.firstWindow()
    await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await expect(nodeG(win, '脉络根文献')).toBeVisible({ timeout: 10_000 })
    const root = nodeG(win, '脉络根文献')
    const cardA = nodeG(win, '脉络甲文献')
    await expect(root.locator('.mb')).toHaveCount(0)
    await expect(win.getByText('新建连线')).toHaveCount(0)
    await expect(win.getByText('保存中…')).toHaveCount(0)
    await expect(win.getByText('综述')).toHaveCount(0)
    await win.getByTestId('lineage-mode-focus').click()
    await root.click()
    await expect(root).toHaveClass(/focused/)
    await expect(cardA).toHaveClass(/dim/)
    await expect(win.locator('.tl-edges')).toHaveClass(/dimmed-focus/)
    await expect(win.getByTestId('lineage-focus-count')).toHaveText('聚焦 1')
    await root.click()
    await expect(cardA).not.toHaveClass(/dim/)
    await win.getByTestId('lineage-mode-browse').click()
    const tl = win.getByTestId('lineage-timeline')
    const tlBox = await tl.boundingBox()
    if (tlBox === null) throw new Error('画布不可见')
    await win.mouse.move(tlBox.x + tlBox.width / 2, tlBox.y + tlBox.height / 3)
    await win.keyboard.down('Control')
    await win.mouse.wheel(0, -120)
    await win.keyboard.up('Control')
    await expect(win.getByTestId('zoom-badge')).toHaveText('110% ▾', { timeout: 5_000 })
    await expect(win.locator('.tl-content')).toHaveCSS('transform', /matrix/)
    await win.getByTestId('zoom-badge').click()
    await expect(win.getByTestId('zoom-badge')).toHaveText('100% ▾', { timeout: 5_000 })
    await win.getByTestId('lineage-mode-edit').click()
    const rb = await root.boundingBox()
    const ab = await cardA.boundingBox()
    if (rb === null || ab === null) throw new Error('卡不可见')
    await win.mouse.move(rb.x + rb.width / 2, rb.y + rb.height / 2)
    await win.mouse.down()
    await win.mouse.move(ab.x + ab.width * 0.25, ab.y + ab.height / 2, { steps: 6 })
    await expect(win.locator('.drag-slot:not(.cand)')).toHaveText('置 入', { timeout: 5_000 })
    await expect(win.locator('.drag-slot.cand').first()).toBeVisible()
    await win.mouse.up()
    await expect(win.getByTestId('lineage-save-error')).toHaveCount(0, { timeout: 10_000 })
    await app.close()
  })
})
