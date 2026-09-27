// b3: P7-H
/**
 * [SR2-LG-05] 脉络图 e2e 全链（工单：open / strong——实现时展开）
 *
 * ── 行为层（验收面，蓝图 N3+ROADMAP P7-H 验收行）──
 * - 全链用例组（fixture lineage JSON 种子→脉络视图）：①导入草稿→
 *   画布渲染**真实文本**（节点标题/年份可见——宪法 e2e 纪律）；②
 *   pan/zoom 交互后节点仍可断言；③拖拽节点→重启（reload）→位置
 *   持久（JSON Canvas 覆盖语义）；④加边树拒绝 toast（多父场景真实
 *   文本）；⑤节点单击→侧板 AI 分节分色呈现；⑥AI 条目双击→阅读器
 *   打开+锚定位（data-ai-note-id exact 层——AI-09 延展消费）；⑦
 *   自动保存失败路径→退出拦截弹窗（聚合面）——**mock 实现路径注
 *   （门一 N8）：contextIsolation 下 renderer 不可 mock contextBridge；
 *   须 electronApp.evaluate 在 main 侧 patch 写通道 handler（AI-04
 *   桩 showOpenDialog 同族先例），禁静默降级删用例**；⑧主题节点
 *   添加+编辑 core_idea→reload 持久
 * - 环境：SYNAPSE_USER_DATA 隔离（e2e-env 既有机制——08/10 同型）；
 *   导入 fixture=磁盘 JSON 落地+dialog mock（main 侧 evaluate 桩
 *   showOpenDialog——⑦同族）
 *
 * ── 文化层 ──
 * - **e2e 原生守卫（双条件，门一 W2 处置）**：skip=自身工单未 done
 *   **或**依赖组（SR2-LG-01~04）任一未 done（corpus-export.spec.ts:90
 *   依赖守卫先例+自身条件——guardedDescribe 是 vitest 机制无 e2e 面）。
 *   翻 done 时占位 test 必须已被全链用例替换——**防作弊闭合=主控
 *   收口亲验**（翻 registry 前核对占位恒真 test 已删、spec 为真实
 *   用例；机器面不拦恒真占位，亲验是本单唯一防线，不以「K3 同效」
 *   自居）
 * - **受锁流程（门一 W3）**：本文件已入 locks manifest——实现替换
 *   占位必经 locks:unlock→批内改→locks:apply+[locked-change] 尾注
 *   提交（manifest 与提交同步）
 * - 完成后：npm run verify 绿 → 人工审查 git diff → 翻 registry
 *
 * ── 实现注（LG-05 交付，主控简报六段裁决落点）──
 * - **守卫修订（主控裁定 5，票面文字级修订自裁申报）**：skip 条件
 *   从「依赖组∪自身」收敛为**仅依赖组**——自身条件在实现完成后反而
 *   阻碍验证（skip 全组），自身激活由主控收口亲验+翻 done 时点保证
 *   （门二 W2 已裁亲验是唯一防线）。
 * - **用例组映射（裁决 1：八验收面合并为 4 个 playwright 场景句柄，
 *   每条验收面均有断言）**：T1=①导入渲染真实文本+②滚动容器锚
 *   （[T3-P6] pan/zoom 随 SVG 画布退役——scrollTo 后节点文本仍可断言）；
 *   T2=③时间线真文本 reload 持久（[T3-P6] 拖拽 x/y 持久随自由拖拽
 *   退役——P8 槽位重排接缝）+⑧主题节点添加/编辑 core_idea reload
 *   持久（同一 launch 两轮 reload）；T3=④多父加边树拒绝 toast+⑦
 *   写通道 patch 失败→保存失败指示条→真聚合脏态→close 拦截两态
 *   （取消保持/确认 destroy）；T4=⑤侧板分节分色+⑥AI 条目双击跳
 *   阅读器+锚定位（data-ai-note-id 可见性——票面二选一选项之可见
 *   性侧；locate-flash 类不作硬断言：flashAiNote 对未渲染 rect 静默
 *   return 无重试，AI 层异步渲染竞态下硬断言会 flake）。
 * - **种子链（裁决 2 最小面）**：papers 三篇经 e2e-env.seedPaperRow
 *   （甲=真实 PDF 供⑥跳转与⑤产物重锚；根/乙=幽灵行——脉络不打开
 *   它们，validateDraft 只查 papers 行存在）；AI 笔记走 08 先例预置
 *   链（corpus-ai 产物 fs 直写+status.json 空闲心跳→真 07 导入器 UI
 *   导入→真 DB）——零新种子脚本零受锁基建改动。
 * - **dialog mock（N8 路径）**：app.evaluate 覆写 electron.dialog.
 *   showOpenDialog（corpus-export.spec.ts:132 同族——dialogs.ts
 *   pickJsonFile 调用点动态读该属性，覆写即生效）；confirm=win.on
 *   ('dialog') 自动接受（zcode-link.spec.ts:45 同型）。
 * - **⑦ mock**：app.evaluate 于 main 侧 ipcMain.removeHandler+
 *   handle 重注册 'lineage/upsert-node' 抛错（写通道 handler patch
 *   ——票面 N8 注字面）；退出拦截走**真聚合链**（store error 态→
 *   useLineageDirty→App effect setQuitDirty→main 缓存→close→
 *   showMessageBox 桩两态），close/断言形态=reader-text.spec.ts:285
 *   退出拦截先例同型。
 * - **写落地证据**：拖拽/编辑后 poll 节点 transform 到达落点（store
 *   回填在 await unwrap 之后——transform 更新即写已成功）再 reload，
 *   不用裸 sleep。
 */
import { test, expect, type ElectronApplication, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { isTicketDone } from '../../tickets/registry'
import { createTinyPdf, PDF_KNOWN_TEXT } from '../utils/pdf-factory'
import { bootstrapMigrations, launch, seedPaperRow } from './e2e-env'

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

/** [T3-P6 回炉 T6] 砖砌锚两篇（幽灵行——draft schema paper_id 必填） */
const BRICK_PAPERS = [
  { id: 'e2e-lg-brick-a', title: '砖砌文献甲（e2e）' },
  { id: 'e2e-lg-brick-b', title: '砖砌文献乙（e2e）' }
] as const

/** 草稿 fixture（树形：根→甲/乙——④的多父场景=对乙再加边被拒） */
function draftJson(): string {
  return JSON.stringify({
    nodes: PAPERS.map((p) => ({
      paper_id: p.id,
      title: p.title,
      year: p.year,
      core_idea: p.id === 'e2e-lg-a' ? '脉络甲的核心 idea（e2e）' : ''
    })),
    edges: [
      { from_paper_id: 'e2e-lg-root', to_paper_id: 'e2e-lg-a', label: '继承甲' },
      { from_paper_id: 'e2e-lg-root', to_paper_id: 'e2e-lg-b', label: '' }
    ]
  })
}

/** T5 草稿 fixture：同树+孤立综述节点（4 节点 2 树边——综述右列由 isSurvey 判定） */
function draftJsonWithSurvey(): string {
  return JSON.stringify({
    nodes: [
      ...PAPERS.map((p) => ({ paper_id: p.id, title: p.title, year: p.year, core_idea: '' })),
      { paper_id: SURVEY_PAPER.id, title: SURVEY_PAPER.title, year: SURVEY_PAPER.year, core_idea: '' }
    ],
    edges: [
      { from_paper_id: 'e2e-lg-root', to_paper_id: 'e2e-lg-a', label: '继承甲' },
      { from_paper_id: 'e2e-lg-root', to_paper_id: 'e2e-lg-b', label: '' }
    ]
  })
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

/** 种子三篇（甲真实 PDF；根/乙幽灵行——脉络 graph 不读其文件） */
async function seedLineagePapers(userData: string): Promise<void> {
  for (const p of PAPERS) {
    if (!p.real) {
      const ghostSha = createHash('sha256').update(`lg-ghost-${p.id}`).digest('hex')
      const ghostRef = `${ghostSha.slice(0, 2)}/${ghostSha.slice(2, 4)}/${ghostSha}.pdf`
      await seedPaperRow(userData, ghostRef, ghostSha, p.title, p.id)
      continue
    }
    const bytes = createTinyPdf(`${p.title} ${PDF_KNOWN_TEXT}`)
    const sha = createHash('sha256').update(bytes).digest('hex')
    const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
    const abs = join(userData, 'files', ...fileRef.split('/'))
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, bytes)
    await seedPaperRow(userData, fileRef, sha, p.title, p.id)
  }
}

/** 落 fixture JSON 到磁盘 tmp（dialog 桩返回该路径；T5 传综述版内容） */
async function writeFixture(content: string = draftJson()): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'synapse-lg05-draft-'))
  const file = join(dir, 'lineage-draft.json')
  await writeFile(file, content, 'utf8')
  return file
}

/** 导入链（N8 dialog 桩+confirm 自动接受+真实 toast/画布断言；T5 传 4 节点摘要） */
async function importDraftViaUi(
  app: ElectronApplication,
  win: Page,
  fixturePath: string,
  expectSummary: string = '已导入脉络图：3 个节点，2 条连线'
): Promise<void> {
  await app.evaluate((electronMod, dir) => {
    ;(
      electronMod.dialog as unknown as {
        showOpenDialog: () => Promise<{ canceled: boolean; filePaths: string[] }>
      }
    ).showOpenDialog = async () => ({ canceled: false, filePaths: [dir] })
  }, fixturePath)
  win.on('dialog', (d) => {
    void d.accept()
  })
  await win.getByTestId('lineage-import').click()
  await expect(win.getByText(expectSummary)).toBeVisible({ timeout: 10_000 })
  for (const p of PAPERS) {
    await expect(nodeG(win, p.title)).toBeVisible({ timeout: 10_000 })
  }
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
   * T1=验收面①②：导入草稿→时间线渲染真实文本（年份头/月标签/小卡
   * 题名/骑缝号——宪法 e2e 红线）+空态先行+滚动容器锚（[T3-P6]
   * pan/zoom 退役→scrollTo 后节点仍可断言）。
   */
  test('T1 导入草稿→时间线渲染真实文本→滚动容器锚后节点仍可断言', async () => {
    const userData = await mkdtemp(join(tmpdir(), 'synapse-lg05-t1-'))
    await firstHop(userData)
    await seedLineagePapers(userData)
    const fixturePath = await writeFixture()

    const app = await launch(userData)
    const win = await app.firstWindow()
    await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })

    // 空图空态文案（真实文本）
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await expect(win.getByText('暂无脉络图——导入草稿或添加节点')).toBeVisible({ timeout: 10_000 })
    // 侧板空态（04 交付面顺带锚）
    await expect(win.getByTestId('lineage-side-panel')).toHaveText('单击节点查看详情')

    // ①导入→时间线真实文本（宪法 e2e 红线）：小卡题名+年份头纯数字
    //   （mockup 形态——旧「YYYY 年」层带标签随 SVG 画布退役）+未定月
    //   月标签+骑缝编号（INV-76——lineageOrder 全序 2020→2022→2023）
    await importDraftViaUi(app, win, fixturePath)
    await expect(win.getByText('脉络根文献')).toBeVisible()
    expect(await win.locator('.tl-year-num').allTextContents()).toEqual(['2020', '2022', '2023'])
    // 全体节点 month=null→各年未定月收纳框（月标签真文本；同年末位）
    expect(await win.locator('.month-tag').allTextContents()).toEqual([
      '未定月 · 1 篇',
      '未定月 · 1 篇',
      '未定月 · 1 篇'
    ])
    expect(await win.locator('.c-no').allTextContents()).toEqual(['#001', '#002', '#003'])
    // [T3-P7A] 连线出现锚（渲染恢复承诺兑现）：fixture 2 条树边（根→甲/乙，
    // 跨年=绕行折线族）→ svg.tl-edges 可见 path ≥1；边端点在场校验=两路径
    // 各自挂 data-edge-id（结构真渲染非空 svg）
    const edgePaths = win.locator('svg.tl-edges path.tl-edge')
    await expect(edgePaths.first()).toBeVisible({ timeout: 10_000 })
    expect(await edgePaths.count()).toBeGreaterThanOrEqual(2)
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
    const fixturePath = await writeFixture()

    const app = await launch(userData)
    const win = await app.firstWindow()
    await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await importDraftViaUi(app, win, fixturePath)

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

    // 右键→编辑核心想法→保存（自动保存落库）
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
    const fixturePath = await writeFixture()

    const app = await launch(userData)
    const win = await app.firstWindow()
    await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await importDraftViaUi(app, win, fixturePath)

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
    const fixturePath = await writeFixture()

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

    // 回脉络→导入草稿→单击甲节点
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await importDraftViaUi(app, win, fixturePath)
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
    // 第四篇=综述（幽灵行同 seedLineagePapers 分支——脉络不打开其文件）
    const ghostSha = createHash('sha256').update(`lg-ghost-${SURVEY_PAPER.id}`).digest('hex')
    const ghostRef = `${ghostSha.slice(0, 2)}/${ghostSha.slice(2, 4)}/${ghostSha}.pdf`
    await seedPaperRow(userData, ghostRef, ghostSha, SURVEY_PAPER.title, SURVEY_PAPER.id)
    const fixturePath = await writeFixture(draftJsonWithSurvey())

    const app = await launch(userData)
    const win = await app.firstWindow()
    await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await importDraftViaUi(app, win, fixturePath, '已导入脉络图：4 个节点，2 条连线')
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
   * T6=[T3-P6 回炉 d1-W1/k1-W2] 砖砌行错位真机锚：默认视口一行容 ~9 卡不
   * 换行（T1-T5 单卡每框=零判别力）——窄窗 720px（一行容 4 卡）+5 卡同月
   * fixture→两行；断言 .rowshift 计数+margin-left 62px 实值+跨行 y 差
   * （不动点迭代收敛后的稳定态证据；非收敛/乱序即红）。
   */
  test('T6 砖砌行错位：窄窗 5 卡同月→两行+偶行 rowshift 62px 实值+跨行 y 差', async () => {
    const userData = await mkdtemp(join(tmpdir(), 'synapse-lg05-t6-'))
    await firstHop(userData)
    await seedLineagePapers(userData)
    // 追加 2 篇幽灵行（draft schema paper_id 必填——主题节点不可经 draft 导入）
    for (const p of BRICK_PAPERS) {
      const sha = createHash('sha256').update(`lg-ghost-${p.id}`).digest('hex')
      const ref = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
      await seedPaperRow(userData, ref, sha, p.title, p.id)
    }
    // 5 卡同月（2020-05）：PAPERS 三篇改同年同月+砖砌两篇
    const draft = JSON.stringify({
      nodes: [
        ...PAPERS.map((p) => ({ paper_id: p.id, title: p.title, year: 2020, month: 5, core_idea: '' })),
        ...BRICK_PAPERS.map((p) => ({ paper_id: p.id, title: p.title, year: 2020, month: 5, core_idea: '' }))
      ],
      edges: []
    })
    const fixturePath = await writeFixture(draft)

    const app = await launch(userData)
    const win = await app.firstWindow()
    await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
    await win.setViewportSize({ width: 720, height: 800 })
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await expect(win.getByText('暂无脉络图——导入草稿或添加节点')).toBeVisible({ timeout: 10_000 })

    await importDraftViaUi(app, win, fixturePath, '已导入脉络图：5 个节点，0 条连线')
    // 单月框 5 卡+月标签计数
    const frame = win.locator('.month-frame').first()
    expect(await frame.locator('.tl-card').count()).toBe(5)
    await expect(win.getByText('5 月 · 5 篇')).toBeVisible()

    // 砖砌：按实测分行断言（窄窗下侧板 288px 挤压月框内容区≈244px→每行
    // 1 卡、5 行交替；行容量不钉死——以「unique offsetTop 升序=行号」推导
    // 期望 shift 集合，与组件 rowsFromOffsetTops 同型[第 2 次重现，Rule of
    // Three 前例]——LineageTimeline 头注互指）。[三过 d1-W2 加固] 几何量测
    // 置于 margin 稳定态之后（过渡中期读几何=非确定红面）
    const cards = frame.locator('.tl-card')
    const shifted = frame.locator('.tl-card.rowshift')
    // margin-left 62px：过渡动画 .25s 中读值为中间态——poll 至稳定态（同时
    // 锁「transition 后真到位」的时间维度语义；几何断言随之稳定）
    await expect
      .poll(
        async () => await shifted.first().evaluate((el) => getComputedStyle(el).marginLeft),
        { timeout: 2000 }
      )
      .toBe('62px')
    const ids = await cards.evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.nodeId ?? ''))
    const ys = await cards.evaluateAll((els) => els.map((e) => (e as HTMLElement).offsetTop))
    const rowTops = [...new Set(ys)].sort((a, b) => a - b)
    expect(rowTops.length).toBeGreaterThan(1) // 确证换行（≥2 行）——一行放得下则此锚红
    // 集合等价（非计数等价——d1-W2：同尺寸异集合可绿）
    const expectedShiftedIds = ids.filter((_, i) => rowTops.indexOf(ys[i]!) % 2 === 1)
    const actualShiftedIds = (
      await shifted.evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.nodeId ?? ''))
    ).sort()
    expect([...actualShiftedIds].sort()).toEqual([...expectedShiftedIds].sort())

    // 跨行实证：rowshift 卡 y 严格大于首行卡（换行真发生——非同行右移）
    const secondRowY = (await shifted.first().boundingBox())!.y
    const firstRowY = (await cards.first().boundingBox())!.y
    expect(secondRowY).toBeGreaterThan(firstRowY)

    await app.close()
  })
})
