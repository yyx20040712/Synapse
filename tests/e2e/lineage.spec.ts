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
 *   每条验收面均有断言）**：T1=①导入渲染真实文本+②pan/zoom 后可
 *   断言；T2=③拖拽 reload 持久+⑧主题节点添加/编辑 core_idea reload
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
import { launch, seedPaperRow } from './e2e-env'

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

/** 画布节点卡片 g（SVG）——按内含标题文本过滤 */
function nodeG(win: Page, title: string) {
  return win.locator('svg g[data-node-id]').filter({ hasText: title })
}

/** 解析节点 g 的 translate(x, y)（自动布局/覆盖位——持久断言用） */
function parseTranslate(s: string | null): { x: number; y: number } | null {
  const m = s?.match(/^translate\((-?[\d.]+), (-?[\d.]+)\)$/)
  return m ? { x: Number(m[1]), y: Number(m[2]) } : null
}

/** 建库迁移第一跳（reader-text 同型：不 import src 内部模块） */
async function firstHop(userData: string): Promise<void> {
  const seedApp = await launch(userData)
  await (await seedApp.firstWindow()).waitForTimeout(500)
  await seedApp.close()
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

/** 落 fixture JSON 到磁盘 tmp（dialog 桩返回该路径） */
async function writeFixture(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'synapse-lg05-draft-'))
  const file = join(dir, 'lineage-draft.json')
  await writeFile(file, draftJson(), 'utf8')
  return file
}

/** 导入链（N8 dialog 桩+confirm 自动接受+真实 toast/画布断言） */
async function importDraftViaUi(app: ElectronApplication, win: Page, fixturePath: string): Promise<void> {
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
  await expect(win.getByText('已导入脉络图：3 个节点，2 条连线')).toBeVisible({ timeout: 10_000 })
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
   * T1=验收面①②：导入草稿→画布渲染真实文本（节点标题/年份——宪法
   * e2e 红线）+空态先行+pan/zoom 交互后节点仍可断言。
   */
  test('T1 导入草稿→画布渲染真实文本→pan/zoom 后节点仍可断言', async () => {
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

    // ①导入→画布真实文本（节点标题+卡片年份；年份层带为「YYYY 年」卡片为纯数字）
    await importDraftViaUi(app, win, fixturePath)
    await expect(win.getByText('脉络根文献')).toBeVisible()
    await expect(win.getByText('2022', { exact: true })).toBeVisible()
    await expect(win.getByText('2023', { exact: true })).toBeVisible()
    await expect(win.getByText('2020 年')).toBeVisible() // 层带标签
    // 边渲染（2 条父子连线 path）
    await expect(win.locator('svg path[data-edge-id]')).toHaveCount(2)

    // ②pan：空白（panbg）拖拽→视口 tx 偏移（起点取左下空白——右上角有
    // 导入成功 toast 卡片盖在 svg 外层，pointerdown 落它会绕过 panbg；层带
    // 横线在布局系 y=0/140/280，左下 y≈height-40 无线无标签）
    const svg = win.getByTestId('lineage-canvas')
    const box = await svg.boundingBox()
    expect(box).not.toBeNull()
    await win.mouse.move(box!.x + 30, box!.y + box!.height - 40)
    await win.mouse.down()
    await win.mouse.move(box!.x + 54, box!.y + box!.height - 24, { steps: 4 })
    await win.mouse.up()
    await expect
      .poll(async () => {
        const t = await win.locator('svg g[data-viewport]').getAttribute('transform')
        return Number(t?.match(/^translate\((-?[\d.]+), /)?.[1] ?? '0')
      })
      .toBeGreaterThan(0)
    // pan 后节点文本仍可断言（可见非 testid 空壳）
    await expect(win.getByText('脉络甲文献')).toBeVisible()

    // ②zoom：滚轮（鼠标锚点缩放）→scale 离开 1（wheel 钳制 [0.25,4]）
    await win.mouse.wheel(0, -240)
    await expect
      .poll(async () => {
        const t = await win.locator('svg g[data-viewport]').getAttribute('transform')
        return Number(t?.match(/scale\(([\d.]+)\)$/)?.[1] ?? '1')
      })
      .toBeGreaterThan(1)
    // zoom 后节点文本与连线仍可断言
    await expect(win.getByText('脉络乙文献')).toBeVisible()
    await expect(win.locator('svg path[data-edge-id]')).toHaveCount(2)

    await app.close()
  })

  /**
   * T2=验收面③⑧：拖拽节点→reload→位置持久（JSON Canvas 覆盖语义）；
   * 主题节点添加+编辑 core_idea→reload 持久。同一 launch 两轮 reload。
   */
  test('T2 拖拽位置 reload 持久+主题节点添加编辑 core_idea reload 持久', async () => {
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

    // ③拖拽根节点 +120/+80（k=1）→transform 到达落点=写回填证据
    const rootG = nodeG(win, '脉络根文献')
    const before = parseTranslate(await rootG.getAttribute('transform'))
    expect(before).not.toBeNull()
    const box = await rootG.boundingBox()
    expect(box).not.toBeNull()
    await win.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
    await win.mouse.down()
    await win.mouse.move(box!.x + box!.width / 2 + 120, box!.y + box!.height / 2 + 80, { steps: 5 })
    await win.mouse.up()
    const target = { x: before!.x + 120, y: before!.y + 80 }
    await expect
      .poll(async () => parseTranslate(await rootG.getAttribute('transform')))
      .toEqual(expect.objectContaining({ x: expect.closeTo(target.x, 2), y: expect.closeTo(target.y, 2) }))

    // reload→覆盖位持久（写已落地再 reload——无裸 sleep）
    await reloadToLineage(win)
    const after = parseTranslate(await nodeG(win, '脉络根文献').getAttribute('transform'))
    expect(after).not.toBeNull()
    expect(Math.abs(after!.x - target.x)).toBeLessThanOrEqual(2)
    expect(Math.abs(after!.y - target.y)).toBeLessThanOrEqual(2)

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
    // 图不变：仍 2 条边
    await expect(win.locator('svg path[data-edge-id]')).toHaveCount(2)

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

    // 拖拽根节点→写失败→error 保存态指示条+重试按钮（INV-04：失败不推进）
    const rootG = nodeG(win, '脉络根文献')
    const box = await rootG.boundingBox()
    expect(box).not.toBeNull()
    await win.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
    await win.mouse.down()
    await win.mouse.move(box!.x + box!.width / 2 + 60, box!.y + box!.height / 2 + 40, { steps: 4 })
    await win.mouse.up()
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
    // quote=PDF 已渲染真实文本（exact 重锚充要输入）；两 role=两组分节
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

    // ⑤侧板分节分色+真实文本（role 中文标签分节×QUESTION_COLOR 分色单源）
    await expect(win.getByTestId('lineage-side-meta')).toHaveAttribute('data-binding', 'paper')
    await expect(win.getByText('已绑定文献')).toBeVisible()
    await expect(win.getByText('脉络甲的核心 idea（e2e）')).toBeVisible()
    const aiSection = win.getByTestId('lineage-side-ai-notes')
    await expect(aiSection.getByRole('heading', { name: '一读' })).toBeVisible({ timeout: 10_000 })
    await expect(aiSection.getByRole('heading', { name: '裁决' })).toBeVisible()
    const q1Entry = aiSection.locator('div[data-role="first-read"] div[data-ai-note-id]').first()
    await expect(q1Entry).toHaveAttribute('data-ai-note-id', /.+/)
    // 分色：Q1 色块=annotation-yellow；divergence 色块=danger（两色相异即分色证据）
    await expect(q1Entry.locator('span[aria-hidden]')).toHaveAttribute(
      'style',
      /--annotation-yellow/
    )
    const divEntry = aiSection.locator('div[data-role="adjudicate"] div[data-ai-note-id]').first()
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
})
