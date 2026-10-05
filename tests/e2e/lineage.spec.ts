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
 *   2026-10-04] core_idea 全退役删除——节点写链 reload 持久由 T9 调序全流承载
 *   ；[F-UIRES-03 C3] T10 改月全流随改月链退役删除 INV-107）；
 *   ④加边重复端点对拒绝
 *   toast（②U8 起多父守卫文本）；⑤节点单击→侧板「AI 评估与建议」分节
 *   分色呈现（[F-UIRES-03 B2] 三节新序：全文笔记→片段笔记→AI 评估与建议；
 *   AI 条目双击链退役负锚）；⑥片段条目双击→阅读器打开+目标页可见
 *   （B2 后全应用唯一保留双击链）；⑦
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
 *   写链持久面由 T9 拖拽调序全流承载）；T3=④重复加边拒绝
 *   toast（②U8 迁移面）+⑦写通道 patch 失败→保存失败指示条→真聚合脏态→close
 *   拦截两态；T4=⑤侧板「AI 评估与建议」分节分色（B2 三节新序+AI 双击退役
 *   负锚）+⑥片段条目双击跳阅读器目标页可见。
 * - **种子链（[F-BAKRET-01] 改述+[F-ALIGN-01]）**：papers 经 e2e-env.seedPaperRow
 *   （甲=真实 PDF 供⑥跳转与⑤产物重锚；根/乙=幽灵行+year 元数据）；
 *   T1=launch 前 seedLineageGraph 直写节点+右键连线走产品路径（UI 添加节点
 *   随 [F-ALIGN-01] 退役——节点唯一来源=入库/移动两路）；
 *   T2-T9/T-P1b=launch 前 seedLineageGraph 直写库（month/slot 形态
 *   由种子载荷精确控制——UI 链无法表达的月组场景）。[F-UIRES-03 B2] AI
 *   评估+片段种子=launch 前经 e2e-env.seedAiNote/seedAnnotation 直写库
 *   （08 传感器预置+07 导入器链随阅读器 AI 区整删退役——INV-105 后唯一
 *   显示面=脉络侧板，种子直写即断言面）。
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
import { createMultiPagePdf, createTinyPdf, PDF_KNOWN_TEXT } from '../utils/pdf-factory'
import { expectRectNear, freezeAnimations, zoomProbe } from './geo-probes'
import {
  bootstrapMigrations,
  launch,
  seedAiNote,
  seedAnnotation,
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
    expect(await win.locator('.c-no').allTextContents()).toEqual(['·001', '·002', '·003'])

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
    // [F-UIRES-03 C3] 种子改局部载荷：甲/乙同月组（2022-05 双卡——写失败触发
    // 段=月内拖拽调序承载，改月写通道随改月链退役 INV-107）；根/乙/边型与
    // chainSeed 等形（重复加边/边数断言不受影响）
    await seedLineageGraph(userData, {
      nodes: [
        { paperId: 'e2e-lg-root', title: '脉络根文献', year: 2020 },
        { paperId: 'e2e-lg-a', title: '脉络甲文献', year: 2022, month: 5, slot: 1 },
        { paperId: 'e2e-lg-b', title: '脉络乙文献', year: 2022, month: 5, slot: 2 }
      ],
      edges: [
        { from: 'e2e-lg-root', to: 'e2e-lg-a', label: '继承甲' },
        { from: 'e2e-lg-root', to: 'e2e-lg-b', label: '' }
      ]
    })

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

    // 写失败触发=[F-UIRES-03 C3] 改月写通道随改月链退役（INV-107）→月内
    //   拖拽调序承载（同一 patch-node 失败面：reorder 落定入暂存→保存→
    //   handler 已 patch 抛错→error 保存态）；[A3 F-CONTRACTA-01] 对话框
    //   写通道同批退役（历史沿革）
    const bBox = await nodeG(win, '脉络乙文献').boundingBox()
    const aBox = await nodeG(win, '脉络甲文献').boundingBox()
    if (bBox === null || aBox === null) throw new Error('调序双卡不可见')
    await win.mouse.move(bBox.x + bBox.width / 2, bBox.y + bBox.height / 2)
    await win.mouse.down()
    await win.mouse.move(aBox.x + aBox.width * 0.25, aBox.y + aBox.height / 2, { steps: 6 })
    await expect(win.locator('.drag-slot:not(.cand)')).toHaveText('置 入', { timeout: 5_000 })
    await win.mouse.up()
    await expect(win.getByTestId('lineage-save-btn')).toBeEnabled({ timeout: 10_000 })
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
   * T4=验收面⑤⑥（[F-UIRES-03 B2] 改写；[RR1-B] 页级维 fixture 化）：种子直写
   * （seedAiNote/seedAnnotation launch 前落库——08 传感器链退役后 AI 评估显示面
   * 唯一=脉络侧板）→节点单击→侧板三节新序+「AI 评估与建议」分节分色→AI 条目
   * 双击退役负锚（不跳）→片段条目双击→阅读器打开+目标页文本层可见（甲=多页
   * fixture〔createMultiPagePdf(3)——每页单行 P<n> 文本〕+annotation page=1。
   * 判别面=总线跳转链（视图切换）+文档加载+多页文本层渲染（P2 行在场=文档
   * 装载证明）；**页级停驻维无判别力**（toBeVisible=CSS 可见非视口相交，跳转
   * 空操作与停驻被覆盖终态同形）——停驻竞争缺陷在案=F-LOCATE-01（registry
   * open），页级判别断言随该票修复回补；seedLineagePapers 固定单页形态束缚
   * 故 T4 自种甲文献）。
   */
  test('T4 侧板三节新序+AI 评估分色→AI 双击退役负锚→片段双击跳阅读器目标页', async () => {
    // F-02 批 2：跳页兼容（exact 层经目标页盒文本层验证）——逐测守卫（describe
    // 级 DEPS 之外单列，T1~T3 不被 F-02 绑架）
    const pendingF02 = ['SR2-F-02'].filter((d) => !isTicketDone(d))
    test.skip(pendingF02.length > 0, `延期：依赖工单未完成 [${pendingF02.join(', ')}]`)
    test.slow() // PDF 加载+双段跳转链
    const userData = await mkdtemp(join(tmpdir(), 'synapse-lg05-t4-'))
    await firstHop(userData)
    // [RR1-B] T4 自种三篇（seedLineagePapers 甲分支固定 createTinyPdf 单页——
    // 页级导航维不可判；甲换 createMultiPagePdf(3) 每页单行「P<n> <text>」页序
    // 可断言；根/乙=幽灵行同 seedLineagePapers 形态）
    for (const p of [PAPERS[0], PAPERS[2]]) {
      const ghostSha = createHash('sha256').update(`lg-ghost-${p.id}`).digest('hex')
      await seedPaperRow(
        userData,
        `${ghostSha.slice(0, 2)}/${ghostSha.slice(2, 4)}/${ghostSha}.pdf`,
        ghostSha,
        p.title,
        p.id,
        { year: p.year }
      )
    }
    const bytesA = createMultiPagePdf(3, PDF_KNOWN_TEXT)
    const shaA = createHash('sha256').update(bytesA).digest('hex')
    const fileRefA = `${shaA.slice(0, 2)}/${shaA.slice(2, 4)}/${shaA}.pdf`
    const absA = join(userData, 'files', ...fileRefA.split('/'))
    mkdirSync(dirname(absA), { recursive: true })
    writeFileSync(absA, bytesA)
    await seedPaperRow(userData, fileRefA, shaA, '脉络甲文献', 'e2e-lg-a', { year: 2022 })
    await seedLineageGraph(userData, chainSeed())
    // [F-UIRES-03 B2] 种子直写（launch 前）：AI 评估两行（Q1 一审=真实 PDF 引文
    // 锚；divergence 裁决=篇级）+片段一行（page=1 即 0 基第 2 页——[RR1-B] 页级
    // 导航断言面：侧板条目显示「p.2 · 高亮」，双击后目标=第 2 页非开篇页）
    await seedAiNote(userData, {
      id: 'e2e-lg-ai-q1',
      paperId: 'e2e-lg-a',
      role: 'first-read',
      question: 'Q1',
      model: 'e2e-lg-model',
      quoteText: PDF_KNOWN_TEXT,
      prefixText: '',
      suffixText: '',
      anchorPage: 1,
      contentMd: '脉络侧板 AI 一读笔记（e2e 真实文本锚）'
    })
    await seedAiNote(userData, {
      id: 'e2e-lg-ai-div',
      paperId: 'e2e-lg-a',
      role: 'adjudicate',
      question: 'divergence',
      model: 'e2e-lg-model',
      quoteText: '',
      prefixText: '',
      suffixText: '',
      anchorPage: null,
      contentMd: '脉络侧板裁决分节条目（e2e）'
    })
    await seedAnnotation(userData, {
      id: 'e2e-lg-ann-1',
      paperId: 'e2e-lg-a',
      page: 1,
      kind: 'highlight',
      color: 'yellow',
      quoteText: PDF_KNOWN_TEXT,
      prefixText: '',
      suffixText: '',
      startOffset: 0,
      endOffset: 8,
      comment: ''
    })

    const app = await launch(userData)
    const win = await app.firstWindow()
    await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
    await win.setViewportSize({ width: 1280, height: 860 })

    // 脉络→单击甲节点（[F-BAKRET-01] 图已种子）
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await nodeG(win, '脉络甲文献').click()

    // ⑤侧板三节新序（DOM 序）+分节分色+真实文本（question 组分节×组内 role
    //    标签×QUESTION_COLOR 分色单源）
    await expect(win.getByTestId('lineage-side-meta')).toHaveAttribute('data-binding', 'paper')
    await expect(win.getByTestId('panel-star')).toHaveAttribute('title', '星标功能即将开放') // [②U4/行 9] 已绑定文献徽章随 core UI 消费面退役——星标禁用呈现承接
    // [A3 F-CONTRACTA-01 2026-10-04] core_idea 侧板渲染面随全退役删除——
    // 面板无 idea 区（负锚；原「脉络甲的核心 idea」文本锚消亡）
    await expect(win.getByTestId('lineage-side-idea')).toHaveCount(0)
    // [B2] 三节新序=DOM 序（h4 标题数组——全文笔记→片段笔记→AI 评估与建议）
    await expect
      .poll(
        async () =>
          await win
            .locator('[data-testid="lineage-side-panel"] h4')
            .evaluateAll((els) => els.map((e) => e.textContent))
      )
      .toEqual(['全文笔记', '片段笔记', 'AI 评估与建议'])
    const aiSection = win.getByTestId('lineage-side-ai-notes')
    await expect(aiSection.getByRole('heading', { name: '第一问：核心 idea 是什么' })).toBeVisible({ timeout: 10_000 })
    await expect(aiSection.getByRole('heading', { name: '分歧报告' })).toBeVisible()
    const q1Entry = aiSection.locator('div[data-question="Q1"] div[data-ai-note-id]').first()
    await expect(q1Entry).toHaveAttribute('data-ai-note-id', 'e2e-lg-ai-q1')
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
    // [B2] AI 条目纯展示（dblClick 不跳——全应用唯一保留双击链=片段条目）。
    // 阅读器未开的判定面=reader-aside 专属 testid（PDF 引文文本不可作负锚——
    // 侧板条目 quote=同一引文，脉络视图内恒在场）
    await q1Entry.dblclick()
    await win.waitForTimeout(500) // 负向观察窗（错实现下跳转链 ~100ms 内切视图）
    await expect(win.getByTestId('reader-aside')).toHaveCount(0)
    await expect(nodeG(win, '脉络甲文献')).toBeVisible() // 仍在脉络视图

    // ⑥片段条目（片段笔记节——真实引文+1 基页码显示：page=1 0 基→「p.2」）
    //   双击→总线→App 切阅读器→PDF 加载→目标页文本层渲染（P2 行在场）。
    //   [RR2-k1-W-RR1-1/d1-W1 如实口径] 判别面=总线跳转链（视图切换）+文档
    //   加载+多页文本层渲染（P2 行在场=文档装载证明）；**页级停驻维无判别
    //   力**（toBeVisible=CSS 可见非视口相交，跳转空操作与停驻被覆盖终态
    //   同形）——停驻竞争缺陷在案=F-LOCATE-01（registry open，RR1 探针指纹
    //   =TabState.page 回写 0+scrollTop 恒 12 为立案证据），页级判别断言随
    //   该票修复回补。
    const fragments = win.getByTestId('lineage-side-fragments')
    const fragEntry = fragments.locator('[data-fragment-id="e2e-lg-ann-1"]').first()
    await expect(fragEntry).toBeVisible({ timeout: 10_000 })
    await expect(fragEntry).toContainText('p.2 · 高亮')
    await expect(fragEntry).toContainText(PDF_KNOWN_TEXT)
    await fragEntry.locator('button').dblclick()
    await expect(win.getByText(`P2 ${PDF_KNOWN_TEXT}`).first()).toBeVisible({ timeout: 20_000 })

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

    // [②U6/退役行 7] 跨月=物理域回弹：拖乙（2020-06 框）落 2020-05 框→回弹
    // 原位（乙仍在原框、源月序不受染——no-op 零写）。[F-UIRES-03 C3] 负锚
    // 改写：历史「不能跨月拖动」toast 文案引用改月路径已随改月链退役
    // （INV-107）——回弹护栏行为保持锁定+改月弹层零在场负锚（结构面）
    const bBox = await cardBox('脉络乙文献')
    const aBox2 = await cardBox('脉络甲文献')
    await win.mouse.move(bBox.x + bBox.width / 2, bBox.y + bBox.height / 2)
    await win.mouse.down()
    await win.mouse.move(aBox2.x + aBox2.width / 2, aBox2.y + aBox2.height / 2, { steps: 6 })
    await win.mouse.up()
    await expect(win.getByTestId('month-pop')).toHaveCount(0, { timeout: 3_000 })
    await expect(win.locator('.c-ym')).toHaveCount(0)
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
    // [F-UIRES-03 C3·v1.7] insp-foot 双击子句退役删（改月子句第一段已删——
    // INV-107）；卡双击跳转链退役→负锚（dblclick 不跳）+两钮新入口承载
    await expect(win.getByTestId('lineage-side-panel')).toContainText('编辑模式：调序 / 画线 / 调线')
    await expect(win.getByTestId('panel-star')).toHaveAttribute('title', '星标功能即将开放')
    await cardA.dblclick()
    await win.waitForTimeout(500) // 负向观察窗（错实现下跳转链 ~100ms 内切视图）
    await expect(win.getByTestId('reader-aside')).toHaveCount(0)
    await expect(cardA).toBeVisible() // 仍在脉络视图（双击退役负锚）
    await cardA.hover()
    await cardA.getByTestId('card-goto-reader').click()
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
   * [F-UIRES-03 T0] 缩放段经 zoomProbe 冒烟迁移（§8.1.2 绿路径——helper
   * 单源；断言文本逐字保真）；拖拽尾段保留原文（弱断言 :1266 驻留——
   * test-surface 按例签名比对使跨例迁移必红，强断言升级面由样板①独立
   * 新例承载，见该例头注）。
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
    // [F-UIRES-03 T0] zoom 段=zoomProbe 冒烟（绿路径——设计稿 §8.1.2）：原
    // Ctrl+wheel/-120 逐句（设置 1.1 档+badge+transform 断言+badge 复位）语义
    // 等价迁移入 helper（设置/等稳/断言/复位四段单源——断言文本逐字保真，
    // test-surface 契约面零变化）；probe 毕复位并等 transform none（原例仅断
    // badge 100%，helper 稳定口径含 computed transform——补强非削弱）。
    // 原 :1258-1267 拖拽尾段（含 :1266 faded 候选弱断言 first 可见）拆分迁入
    // 样板①（T-S1——弱断言语义升级为计数+几何强断言，弱断言原文随迁保留为
    // 强断言套件子项——严格超集，C 面多重集保全）
    await zoomProbe(win, 1.1, async () => {
      await expect(win.getByTestId('zoom-badge')).toHaveText('110% ▾', { timeout: 5_000 })
      await expect(win.locator('.tl-content')).toHaveCSS('transform', /matrix/)
    })
    await expect(win.getByTestId('zoom-badge')).toHaveText('100% ▾', { timeout: 5_000 })
    // [F-UIRES-03 T0 面上申报] 原计划把本拖拽尾段（:1258-1267）并入样板①——
    // 但 test-surface 契约=按例签名比对（跨例迁移不抵扣，实测 3 处
    // MISSING_ASSERT 红），豁免权在主控。合规解=本段原文保留（弱断言
    // :1266 随段驻留为历史子集），样板①以独立新用例承载计数+几何强断言
    // 升级面（纯 NEW delta）——语义升级经新例补强而非原例改写。
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

  /**
   * [F-UIRES-03 T0] 样板①=拖拽候选槽计数几何（设计稿 §8.1.1 中间态三强制
   * 首条；图四症一实锚——C3 修复后去标转绿）。:1266 弱断言（first 可见）的
   * 语义升级独立新例（test-surface 按例签名比对——T13 原例改写必红，弱断言
   * 原文驻留 T13 为历史子集）：拖中（up 前）断言 faded 候选槽族**计数**=
   * 源月框内其余卡数+**几何在场**（每槽宽高>0 且全落源月框 boundingBox
   * 内）。视口 1000=探针实证可用档（720 退化挤压：timeline 172px 卡缩 47px
   * 且 pointerdown 不落卡——拖拽链不激活，探针实证；1000=卡全宽 128+拖拽
   * 激活+候选槽族渲染）。冻结优先（§8.1.3）：拖中指针停住后冻结再断（cand
   * 槽 opacity .2s 过渡在场——几何虽不受 opacity 影响，冻结消时序依赖）。
   */
  // [F-UIRES-03 C3 修复落地·去包装翻转直陈]（原 T0 承载=预期失败包装：强断言
  // 必抛→捕获绿锁定缺陷在场；C3 症一修复=DragCandidates 布局稳定信号重捕获
  // 落地——包装绊线红即翻转为直陈式，缺陷锁销项）。历史红实录（包装前普通
  // test 实跑）：候选槽 0 左上角实测 (385.2,404.0)，距最近插入位 64.4px>容差
  // 2px——候选位捕获自布局过渡中期 rect 且不随布局稳定重算。
  test('样板① 拖拽候选槽计数几何（图四症一实锚：C3 修复后去标转绿）', async () => {
    test.slow()
    const userData = await mkdtemp(join(tmpdir(), 'synapse-lg05-s1-'))
    await firstHop(userData)
    await seedLineagePapers(userData)
    // 3 卡同月（2020-05）：根/甲/乙——源月框内其余卡数=2=候选槽计数期望
    await seedLineageGraph(userData, {
      nodes: [
        { paperId: 'e2e-lg-root', title: '脉络根文献', year: 2020, month: 5, slot: 1 },
        { paperId: 'e2e-lg-a', title: '脉络甲文献', year: 2020, month: 5, slot: 2 },
        { paperId: 'e2e-lg-b', title: '脉络乙文献', year: 2020, month: 5, slot: 3 }
      ],
      edges: []
    })

    const app = await launch(userData)
    const win = await app.firstWindow()
    await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
    await win.setViewportSize({ width: 1000, height: 800 })
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await expect(nodeG(win, '脉络根文献')).toBeVisible({ timeout: 10_000 })
    // edit 态驱动+拖起（指针停于甲左半——插位=根原位前=序不变零写）+
    // 实态槽「置 入」在场（T13 同型段——本例独立复刻驱动链至强断言态）
    await win.getByTestId('lineage-mode-edit').click()
    const root = nodeG(win, '脉络根文献')
    const cardA = nodeG(win, '脉络甲文献')
    const rb = await root.boundingBox()
    const ab = await cardA.boundingBox()
    if (rb === null || ab === null) throw new Error('卡不可见')
    await win.mouse.move(rb.x + rb.width / 2, rb.y + rb.height / 2)
    await win.mouse.down()
    await win.mouse.move(ab.x + ab.width * 0.25, ab.y + ab.height / 2, { steps: 6 })
    await expect(win.locator('.drag-slot:not(.cand)')).toHaveText('置 入', { timeout: 5_000 })
    // 首槽可见（:1266 弱断言同型——强断言套件子项，严格超集）
    await expect(win.locator('.drag-slot.cand').first()).toBeVisible()
    // 计数断言：候选槽族=源月框内其余卡数（甲+乙=2——「first 可见」不封计数）
    const cands = win.locator('.drag-slot.cand')
    await expect(cands).toHaveCount(2, { timeout: 5_000 })
    // 几何断言（冻结优先——§8.1.3）：每槽宽高>0+落源月框 boundingBox 内
    // **∪ 末位换行延伸域**（[C3 修复落地·口径补注] DragCandidates 末位候选
    // 超框宽右界=换行首位（y=尾卡 bottom+20）——候选槽 absolute 不占流，
    // 框不为其腾高=合法落在框下方一行延伸域；T0 时该候选捕获自过渡中期
    // rect 位置恰在框内故未触发，症一修复后槽位=真值即显此口径缺口——下界
    // 断言容许至「尾卡下+20+槽高」的换行延伸一行）
    const restore = await freezeAnimations(win)
    const frameBox = await win.locator('.month-frame[data-frame-key="2020|5"]').boundingBox()
    if (frameBox === null) throw new Error('源月框不可见：2020|5')
    const boxes = await cands.evaluateAll((els) =>
      els.map((e) => {
        const r = e.getBoundingClientRect()
        return { x: r.x, y: r.y, w: r.width, h: r.height }
      })
    )
    expect(boxes.length).toBe(2)
    // 末卡下界（换行延伸域锚——expected 同源式：尾卡 bottom+20）
    const lastBottom = await win.evaluate((frameKey) => {
      const frame = document.querySelector(`.month-frame[data-frame-key="${frameKey}"]`)
      if (!(frame instanceof HTMLElement)) return null
      const others = Array.from(frame.querySelectorAll('.tl-card[data-node-id]:not(.dragging)'))
      const last = others[others.length - 1]
      return last === undefined ? null : last.getBoundingClientRect().bottom
    }, '2020|5')
    if (lastBottom === null) throw new Error('其余卡不可见：2020|5')
    // ±0.5=浮点边界容差（框内判定的 box 边界比较残差——包含类断言，非
    // expectRectNear 语义；出处=RR1-2 口径单源边界声明）
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i]!
      expect(b.w, `候选槽 ${i} 宽度（零盒=不在场）`).toBeGreaterThan(0)
      expect(b.h, `候选槽 ${i} 高度（零盒=不在场）`).toBeGreaterThan(0)
      expect(b.x, `候选槽 ${i} 左界落源框内`).toBeGreaterThanOrEqual(frameBox.x - 0.5)
      expect(b.y, `候选槽 ${i} 上界落源框内`).toBeGreaterThanOrEqual(frameBox.y - 0.5)
      expect(b.x + b.w, `候选槽 ${i} 右界落源框内`).toBeLessThanOrEqual(frameBox.x + frameBox.width + 0.5)
      expect(
        b.y + b.h,
        `候选槽 ${i} 下界落源框内∪末位换行延伸域（框底 ${(frameBox.y + frameBox.height).toFixed(1)} / 延伸底 ${(lastBottom + 20 + b.h).toFixed(1)}+边框 2px 容差）`
      ).toBeLessThanOrEqual(Math.max(frameBox.y + frameBox.height, lastBottom + 20 + b.h) + 2)
    }
    // 槽位语义断言（自裁扩展——用户三轮澄清语义「月份框内部显示候选阵列
    // **位置**」+DragCandidates 契约「候选 k=插入 others[k] 前→槽位=该卡
    // 左上；末位=尾卡右侧 +20 隙/超宽换行」）：每个候选槽左上角须命中
    // 「其余卡**当前稳定**槽位 ∪ 末位派生位」之一（≤2px——命中类断言容差：
    // 依据=亚像素+DPR 残差同 helper 口径[geo-probes 头注]，单射匹配窗）。
    // 超出=陈旧几何实锤——候选位捕获自布局过渡中期 rect 且不随稳定重算
    // （探针实录与卡实位差 64.4px——用户「阵列位置不显示」观察的正身）
    const expected = await win.evaluate((frameKey) => {
      const frame = document.querySelector(`.month-frame[data-frame-key="${frameKey}"]`)
      if (!(frame instanceof HTMLElement)) return null
      const others = Array.from(frame.querySelectorAll('.tl-card[data-node-id]:not(.dragging)'))
      const ob = others.map((c) => c.getBoundingClientRect())
      const last = ob[ob.length - 1]
      const tail =
        last === undefined
          ? []
          : [
              { x: last.right + 20, y: last.y }, // 尾卡右侧 +20 隙（同墙换行判定前的直排位）
              { x: frame.getBoundingClientRect().x + 12, y: last.bottom + 20 } // 超宽换行首 padding 位
            ]
      return [...ob.map((b) => ({ x: b.x, y: b.y })), ...tail]
    }, '2020|5')
    if (expected === null) throw new Error('源月框不可见：2020|5')
    // [C3 修复落地] 槽位命中断言直陈（原预期失败包装已翻转——DragCandidates
    // 稳定重捕获修复后必绿；再红=陈旧几何回归）
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i]!
      const hit = expected.find(
        (e) => Math.abs(e.x - b.x) <= 2 && Math.abs(e.y - b.y) <= 2
      )
      expect(
        hit !== undefined,
        `候选槽 ${i} 左上角 (${b.x.toFixed(1)}, ${b.y.toFixed(1)}) 未命中任何插入位（其余卡稳定槽位∪末位派生位=${JSON.stringify(expected.map((e) => [e.x, e.y]))}——陈旧几何/错位实锤，容差 2px）`
      ).toBe(true)
      if (hit !== undefined) expected.splice(expected.indexOf(hit), 1) // 单射——两槽不共位
    }
    await restore()
    await win.mouse.up()
    await expect(win.getByTestId('lineage-save-error')).toHaveCount(0, { timeout: 10_000 })
    await app.close()
  })

  /**
   * [F-UIRES-03 C3] 插入位多样性（设计稿 §8.1.1 第三强制——症二「只能放到
   * 已有的第一个插入位上」的联动验证例；样板①联动=同一驱动链不同断言面）。
   * 3 卡同月组拖根卡，指针依次落**两个不同插入区**（乙右半=插位 2 / 甲左半
   * =插位 0），各断言实态槽（.drag-slot:not(.cand)）的 DOM 位置随插位真实
   * 变化（previousElementSibling/nextElementSibling 序）——恒首位（症二形态）
   * 即红。insertIdx 更新链核验=pointermove 逐帧重算（card-drag-session
   * onMove→insertIndexFromRects——其余卡实时 rect 派生）+占位槽腾位后的
   * 推挤反馈循环；本例以行为断言封「几何失效恒 0」面。
   */
  test('插入位多样性：拖中≥2 个不同插入区各断言实态槽位置/序变化（图四症二联动验证）', async () => {
    test.slow()
    const userData = await mkdtemp(join(tmpdir(), 'synapse-lg05-c3-idx-'))
    await firstHop(userData)
    await seedLineagePapers(userData)
    await seedLineageGraph(userData, {
      nodes: [
        { paperId: 'e2e-lg-root', title: '脉络根文献', year: 2020, month: 5, slot: 1 },
        { paperId: 'e2e-lg-a', title: '脉络甲文献', year: 2020, month: 5, slot: 2 },
        { paperId: 'e2e-lg-b', title: '脉络乙文献', year: 2020, month: 5, slot: 3 }
      ],
      edges: []
    })

    const app = await launch(userData)
    const win = await app.firstWindow()
    await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
    await win.setViewportSize({ width: 1000, height: 800 })
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await expect(nodeG(win, '脉络根文献')).toBeVisible({ timeout: 10_000 })
    await win.getByTestId('lineage-mode-edit').click()
    const root = nodeG(win, '脉络根文献')
    const cardA = nodeG(win, '脉络甲文献')
    const cardB = nodeG(win, '脉络乙文献')
    const slot = win.locator('.drag-slot:not(.cand)')
    /** 实态槽前后邻卡题名（序断言载体——DOM 序即插入位） */
    const slotNeighbors = async (): Promise<{ prev: string; next: string }> =>
      await slot.evaluate((el) => {
        const title = (e: Element | null): string =>
          e === null ? '' : (e.textContent ?? '').replace(/\s+/g, '')
        return { prev: title(el.previousElementSibling), next: title(el.nextElementSibling) }
      })
    const rb = await root.boundingBox()
    const ab = await cardA.boundingBox()
    const bb = await cardB.boundingBox()
    if (rb === null || ab === null || bb === null) throw new Error('卡不可见')
    await win.mouse.move(rb.x + rb.width / 2, rb.y + rb.height / 2)
    await win.mouse.down()
    // 插入区一：乙右半（指针 x>乙中心）→插位=乙后=组末（实态槽 prev=乙）
    await win.mouse.move(bb.x + bb.width * 0.75, bb.y + bb.height / 2, { steps: 6 })
    await expect(slot).toHaveText('置 入', { timeout: 5_000 })
    const n1 = await slotNeighbors()
    expect(n1.prev, '插入区一（乙右半）实态槽应在乙之后（插位=组末）').toContain('脉络乙文献')
    // 插入区二：甲左半（指针 x<甲中心）→插位=甲前（实态槽 next=甲——序变化断言）
    await win.mouse.move(ab.x + ab.width * 0.25, ab.y + ab.height / 2, { steps: 6 })
    const n2 = await slotNeighbors()
    expect(n2.next, '插入区二（甲左半）实态槽应在甲之前（插位=首位——与插入区一序不同）').toContain('脉络甲文献')
    await win.mouse.up()
    await expect(win.getByTestId('lineage-save-error')).toHaveCount(0, { timeout: 10_000 })
    await app.close()
  })

  /**
   * [F-UIRES-03 C3·v1.7] 卡面两钮（卡双击退役的显式入口——用户裁决）：
   * ①布局回归=hover 卡→按钮行可见+两钮同行排列（y 差≤1+左库右读序）+落卡
   * bbox 内；②「去文献库」=library 视图+所在文件夹过滤+该文选中态（aria-
   * current）；③「去阅读器」=reader 视图（reader-aside 特征）+PDF 文本层
   * 装载（KNOWN_TEXT 可见——文档装载证明）；④编辑态收钮避让=edit 态钮恒隐。
   */
  test('C3 卡面两钮：hover 呈现+同行布局+去文献库（夹过滤+选中）+去阅读器（文本层装载）', async () => {
    test.slow()
    const userData = await mkdtemp(join(tmpdir(), 'synapse-lg05-c3-btn-'))
    await firstHop(userData)
    await seedLineagePapers(userData)
    // 根归夹（去文献库=文件夹过滤面）/甲主图（真实 PDF——去阅读器文本层锚）
    await seedLineageGraph(userData, {
      nodes: [
        { paperId: 'e2e-lg-root', title: '脉络根文献', year: 2020, month: 5, slot: 1, folderId: 'e2e-lg-folder' },
        { paperId: 'e2e-lg-a', title: '脉络甲文献', year: 2020, month: 5, slot: 2 }
      ],
      edges: [],
      folders: [{ id: 'e2e-lg-folder', name: '水处理' }]
    })

    const app = await launch(userData)
    const win = await app.firstWindow()
    await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
    await win.setViewportSize({ width: 1280, height: 860 })
    // 归夹根节点不在主图（每图只显示自身）——先文献库选夹（folderScope 置夹，
    // FolderNav 行点击=既有产品路径）再进脉络（挂载缺省图=folderScope 同步）
    await win.locator('.lib-fn-row').filter({ hasText: '水处理' }).click()
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await expect(nodeG(win, '脉络根文献')).toBeVisible({ timeout: 10_000 })
    const root = nodeG(win, '脉络根文献')
    // ④编辑态收钮避让（机制=CSS .timeline.editing 恒隐——交互期按钮区不扰）
    await win.getByTestId('lineage-mode-edit').click()
    await root.hover()
    await expect(root.getByTestId('card-goto-library')).toBeHidden()
    await win.getByTestId('lineage-mode-browse').click()
    // ①布局回归：hover→按钮行可见+两钮同行+落卡 bbox 内（排列整齐断言）
    await root.hover()
    const libBtn = root.getByTestId('card-goto-library')
    const readBtn = root.getByTestId('card-goto-reader')
    await expect(libBtn).toBeVisible()
    await expect(readBtn).toBeVisible()
    await expect(libBtn).toHaveText('去文献库')
    await expect(readBtn).toHaveText('去阅读器')
    const rb = await root.boundingBox()
    const lb = await libBtn.boundingBox()
    const pb = await readBtn.boundingBox()
    if (rb === null || lb === null || pb === null) throw new Error('卡/钮不可见')
    expect(Math.abs(lb.y - pb.y), '两钮同行排列（y 差≤1）').toBeLessThanOrEqual(1)
    expect(lb.x, '左库右读序（去文献库在左）').toBeLessThan(pb.x)
    expect(lb.x, '钮行落卡 bbox 内（左界）').toBeGreaterThanOrEqual(rb.x)
    expect(pb.x + pb.width, '钮行落卡 bbox 内（右界）').toBeLessThanOrEqual(rb.x + rb.width)
    // ②去文献库：library 视图+夹过滤（根行在场/甲行不在——甲未归夹）+选中态
    await libBtn.click()
    await expect(win.locator('.lib-row', { hasText: '脉络根文献' })).toBeVisible({ timeout: 10_000 })
    await expect(win.locator('.lib-row', { hasText: '脉络甲文献' })).toHaveCount(0)
    await expect(win.locator('.lib-row', { hasText: '脉络根文献' })).toHaveAttribute('aria-current', 'true')
    // ③去阅读器（甲卡——甲归主图）：清夹（「全部文献」导航行=folderScope 清，
    // 既有产品路径）→返脉络（缺省图回主图——甲在场）→甲卡钮→reader 文本层装载
    await win.locator('.lib-fn-row').filter({ hasText: '全部文献' }).click()
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    const cardA = nodeG(win, '脉络甲文献')
    await expect(cardA).toBeVisible({ timeout: 10_000 })
    await cardA.hover()
    await cardA.getByTestId('card-goto-reader').click()
    await expect(win.getByTestId('reader-aside')).toBeVisible({ timeout: 20_000 })
    await expect(win.getByText(PDF_KNOWN_TEXT).first()).toBeVisible({ timeout: 20_000 })
    await app.close()
  })

  /**
   * [F-UIRES-03 T0] 样板②=拖影偏移恒定（设计稿 §8.1.1 第二条+C3 DoD 三档
   * zoom——INV-96 逆变换族 e2e 面）。dragstart 偏移=pointerdown 坐标锚、
   * 激活帧计算（card-drag-session s.ox 同源）+**绝对锚对账**（[RR1-1]——offX 自指反解
   * 防线）；move 到≥2 个不同位置各采样 |ghost 角−(指针−偏移)|≤1px（采样
   * 模式=连续性/跟随性缺陷域，§8.1.3——不冻结）。ghost DOM 载体=**拖卡自身**
   * （card-drag-session onMove 激活段：卡 inline position:absolute+left/top——
   * 无独立 fixed 影元素）。zoom 矩阵 {0.8,1.0,1.5} 经 zoomProbe（超票面扩面
   * 自裁申报）。settle 清场信号（§8.1.5：inline 清空=T9 先例）隔档。
   * **[C3 修复落地·直陈]**（原 T0 预期失败包装已翻转——甲案=containing-block
   * 对齐+hostOffset 补偿后绝对锚必绿）；测量口径=transform 中和法（border box
   * 域——ghost bbox 含 rotate(2deg) scale(1.05) 偏差 ~4px/轴，中和消除，无
   * CSS 硬编码）。两轴残差对账（DoD D）：修复后两轴并测非单轴。
   */
  test('样板② 拖影偏移恒定+dragstart 偏移绝对锚（图四漂移实锚：C3 修复后去包装翻转直陈）', async () => {
    test.slow()
    const userData = await mkdtemp(join(tmpdir(), 'synapse-lg05-s2-'))
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
    await win.setViewportSize({ width: 1280, height: 860 })
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await expect(nodeG(win, '脉络根文献')).toBeVisible({ timeout: 10_000 })
    await win.getByTestId('lineage-mode-edit').click()
    const root = nodeG(win, '脉络根文献')
    const cardA = nodeG(win, '脉络甲文献')
    for (const z of [0.8, 1.0, 1.5]) {
      await zoomProbe(win, z, async () => {
        const rb = await root.boundingBox()
        const ab = await cardA.boundingBox()
        if (rb === null || ab === null) throw new Error(`卡不可见（zoom=${z}）`)
        const sx = rb.x + rb.width / 2
        const sy = rb.y + rb.height / 2
        await win.mouse.move(sx, sy)
        await win.mouse.down()
        await win.mouse.move(sx + 9, sy + 7, { steps: 3 }) // 过 5px 阈值激活
        // dragstart 偏移基准：指针−卡角（激活后首采样——ghost=拖卡自身）。
        // [C3 甲案落地·测量口径] ghost bbox 含 .tl-card.dragging 的 transform
        // （rotate(2deg) scale(1.05)——bbox 左上≠border box 左上，偏差 ~4px/轴）
        // ——锚定口径=transform 中和法：evaluate 内暂清 transform 读 border box
        // 角（同帧恢复；拖拽期 transition='none' 在场，无过渡副作用），偏移与
        // 期望两侧同 border box 域对账（无 CSS 硬编码常量——形态变不须改此断言）
        const g0 = await root.boundingBox()
        if (g0 === null) throw new Error(`拖影不可见（zoom=${z}）`)
        const unshifted = await root.evaluate((el) => {
          const prev = el.style.transform
          el.style.transform = 'none'
          const ub = el.getBoundingClientRect()
          el.style.transform = prev
          return { x: ub.x, y: ub.y }
        })
        const offX = sx + 9 - unshifted.x
        const offY = sy + 7 - unshifted.y
        // [RR1-1] 偏移绝对锚对账（自指防线：offX/offY 从激活后 ghost 反解，实现
        // 若激活即丢抓取偏移[ox=0 形]则反解恒吸收系统偏差→后续采样全绿假绿）。
        // 绝对锚=pointerdown−down 前卡角（card-drag-session 激活帧
        // s.ox=(s.sx−r.left)/z 同源；zoom 不变三档同式成立——k1 席推演）。
        // 容差 1px=亚像素+DPR 残差（设计稿 §2 C3 DoD「|ghost 角−（指针−偏移）|
        // ≤1px」同款口径）。
        // [C3 修复落地·直陈]（原预期失败包装已翻转）历史红实录（T0 批）：dOffX=
        // −50.49/−63.12/−94.68、dOffY=−54.38/−67.98/−101.96（z=0.8/1.0/1.5）——
        // 与源月框原点屏偏移同量级=激活期恒定错位实锤：拖卡 inline left/top 按
        // 内容坐标（.tl-content 基准）数学正确，但包含块=position:relative 的
        // .month-frame——frame 原点双计，拖起瞬间卡向右下跳（图四「向右下漂移」
        // 正身）。C3 甲案（containing-block 对齐+hostOffset 补偿）后必绿；再红=
        // 包含块错位回归。
        expect(
          Math.abs(offX - (sx - rb.x)),
          `zoom=${z} offX 绝对锚对账：实测 ${offX.toFixed(1)} vs 期望 ${sx - rb.x}（pointerdown−down 前卡角；border box 域=transform 中和口径）`
        ).toBeLessThanOrEqual(1)
        expect(
          Math.abs(offY - (sy - rb.y)),
          `zoom=${z} offY 绝对锚对账：实测 ${offY.toFixed(1)} vs 期望 ${sy - rb.y}（pointerdown−down 前卡角；border box 域=transform 中和口径）`
        ).toBeLessThanOrEqual(1)
        // ≥2 个不同位置采样：|ghost 角−(指针−偏移)|≤1px（两轴各断；容差 1px=
        // 设计稿 §2 C3 DoD 字面「|ghost 角−（指针−偏移）|≤1px」；同 border box
        // 域——bbox 偏移常数在差分中消除，此处直接 bbox 采样等价）
        for (const [dx, dy] of [
          [70, 24],
          [-46, 68]
        ] as const) {
          const px = sx + 9 + dx
          const py = sy + 7 + dy
          await win.mouse.move(px, py, { steps: 4 })
          const g = await root.boundingBox()
          if (g === null) throw new Error(`拖影不可见（zoom=${z} 位移 ${dx},${dy}）`)
          const tOff = await root.evaluate((el) => {
            const prev = el.style.transform
            el.style.transform = 'none'
            const ub = el.getBoundingClientRect()
            el.style.transform = prev
            const bb = el.getBoundingClientRect()
            return { x: ub.x - bb.x, y: ub.y - bb.y }
          })
          expect(
            Math.abs(g.x + tOff.x - (px - offX)),
            `zoom=${z} 位移(${dx},${dy}) 拖影 x：实测 ${(g.x + tOff.x).toFixed(1)} vs 期望 ${px - offX}（border box 域；漂移容差 1px=设计稿 §2 C3 DoD 字面）`
          ).toBeLessThanOrEqual(1)
          expect(
            Math.abs(g.y + tOff.y - (py - offY)),
            `zoom=${z} 位移(${dx},${dy}) 拖影 y：实测 ${(g.y + tOff.y).toFixed(1)} vs 期望 ${py - offY}（border box 域；漂移容差 1px=设计稿 §2 C3 DoD 字面）`
          ).toBeLessThanOrEqual(1)
        }
        await win.mouse.up()
        // settle 清场信号：inline 清空（transitionend 后）——下一档新会话前提
        await expect
          .poll(async () => await root.evaluate((el) => (el.getAttribute('style') ?? '') === ''))
          .toBe(true)
      })
    }
    // [RR1-4] 收尾保存步=条件式：末档落点不保证变序——无 dirty 则无 quit-dirty
    // 拦截面（save-btn 禁用态），保存步条件跳过（无条件 click 会禁用态超时假红）
    const saveBtn = win.getByTestId('lineage-save-btn')
    if (await saveBtn.isEnabled()) {
      await saveBtn.click()
      await expect(saveBtn).toBeDisabled({ timeout: 10_000 })
    }
    await app.close()
  })

  /**
   * [F-UIRES-03 T0] 样板③=画线锚点几何（设计稿 §8.1.3/§2 C2——INV-96 锚
   * 渲染面）。进画线模式（lineage-tool-solid+收线型列表——collapseLinetypeList
   * 几何去敏感化先例）+armed hover 近右缘中点锚，断言锚点 DOM（DrawAnchorHint
   * 渲染物=svg.draw-anchor-hint 内 circle）中心 vs 所属卡右缘几何中点
   * |diff|≤1px（expectRectNear 同口径——circle r=3.2 画布 px→屏 r=3.2×z，
   * bbox 四维全断）。冻结优先（静态中间态）。zoom 矩阵 {0.8,1.0,1.5}
   * （§8.1.2——超票面扩面自裁申报）。armed 待机无写链——close 免保存。
   * **T0 实跑态=绿**（三档全过——hint 锚渲染几何精确；「待连接点离卡远」
   * 真域=DrawPreview 端点/预览线渲染链[C2 调查域]，不在本断言面——如实申报，
   * 禁硬造红）。本例驻留为锚渲染几何卫士（C2 重构的回归锚）。
   */
  test('样板③ 画线锚点几何（三档 zoom 卫士——T0 实跑绿：预览端点真域留 C2 调查）', async () => {
    test.slow()
    const userData = await mkdtemp(join(tmpdir(), 'synapse-lg05-s3-'))
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
    await win.setViewportSize({ width: 1280, height: 860 })
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await expect(nodeG(win, '脉络根文献')).toBeVisible({ timeout: 10_000 })
    await win.getByTestId('lineage-mode-edit').click()
    await win.getByTestId('lineage-tool-solid').click()
    await collapseLinetypeList(win)
    const root = nodeG(win, '脉络根文献')
    const hintSvg = win.getByTestId('draw-anchor-hint')
    for (const z of [0.8, 1.0, 1.5]) {
      await zoomProbe(win, z, async () => {
        const rb = await root.boundingBox()
        if (rb === null) throw new Error(`卡不可见（zoom=${z}）`)
        // armed hover 近右缘中点锚（右中锚=最近锚——T12b 先例位形同款）
        await win.mouse.move(rb.x + rb.width - 2, rb.y + rb.height / 2)
        await expect(hintSvg).toHaveCount(1, { timeout: 5_000 })
        const restore = await freezeAnimations(win)
        const r = 3.2 * z
        await expectRectNear(
          hintSvg.locator('circle'),
          {
            x: rb.x + rb.width - r,
            y: rb.y + rb.height / 2 - r,
            width: 2 * r,
            height: 2 * r
          },
          1
        )
        await restore()
      })
    }
    await app.close()
  })
})
