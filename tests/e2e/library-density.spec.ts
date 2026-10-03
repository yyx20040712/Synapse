import { test, expect } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { bootstrapMigrations, launch, seedPaperRow } from './e2e-env'

/**
 * [T3-P3] 文献库密度列表 e2e（always-active，无工单门）。
 *
 * 链路：种子两篇（甲=全值行：年份/venue 命中 T1 档/引用缓存 17；乙=缺值行：
 * 全 NULL → 年月/引用「—」）→五列表头在场+行内真实文本（题名/引用数/
 * 缺值占位；档次列 F-LIBUI-01 退役、序号 # 前缀删）→点击行出规格表抽屉
 * （四格指标真实文本+fld 键值行+关联节退役）→动作区两列 grid 计算样式锚
 * （F-LIBUI-01 ⑥）→选中行挂 sel 类。断言=真实文本+类锚+getComputedStyle
 * （INV-06 口径——禁截图比对）。
 * [libfix2] 五列形态断言分档：开头升 1285，实测内容宽 ≥1274 断全形态；CI
 * 虚拟屏 1024 钳制态断降级档（「标签」hidden+main ≥100+标题 visible）。
 */
test('文献库密度列表：五列表头+行五列真实文本+抽屉四格+动作区 grid+选中态', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-t3p3-'))

  // 第一跳：应用自建库表（tag-lifecycle.spec 同配方——不 import src 内部模块）
  await bootstrapMigrations(userData)

  const shaA = 'a'.repeat(64)
  const shaB = 'b'.repeat(64)
  await seedPaperRow(
    userData,
    `${shaA.slice(0, 2)}/${shaA.slice(2, 4)}/${shaA}.pdf`,
    shaA,
    'T3P3 甲文献：管网漏损定位',
    'e2e-t3p3-a',
    { year: 2023, venue: 'Nature Water', cited: 17 }
  )
  await seedPaperRow(
    userData,
    `${shaB.slice(0, 2)}/${shaB.slice(2, 4)}/${shaB}.pdf`,
    shaB,
    'T3P3 乙文献：缺值对照',
    'e2e-t3p3-b'
  )

  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })

  // —— [libfix2·RR1] 五列形态断言前置：升 1285 正常宽档（本机/宽屏走全形态；
  //    CI 虚拟屏 1024 钳制态走降级档=「标签」列收 0 锁 libfix1 语义）。
  //    resize throw 守卫同窄窗用例形态；表头「标签」分档=**语义断言**（实测
  //    .lib-c-tags 列宽 >0 断可见/=0 断 hidden——门一双审 W1：1274 是 main≥140
  //    的线、标签可见语义线=1134，阈值耦合留 (1134,1274) 假红死区，实测列宽
  //    自适应消死区）；行级降级锁=无条件（塌 0 回归任何视口都该红——W2 同批
  //    收紧：标签列在场断言闭合「列被移除恒绿」盲区）——
  await app.evaluate(({ BrowserWindow }) => {
    const main = BrowserWindow.getAllWindows()[0]
    if (main === undefined) throw new Error('主窗口不在 BrowserWindow.getAllWindows() 中')
    main.setContentSize(1285, 800)
  })

  // —— 五列表头在场（编号/题名 · 期刊/年月/引用两态共用——定宽列窄视口下
  //    hidden=溢出裁剪非收缩，CI 四列断言实测绿维持原断言；档次列 F-LIBUI-01 退役）——
  const cols = win.locator('.lib-cols')
  await expect(cols).toBeVisible()
  for (const head of ['编号', '题名 · 期刊', '年月', '引用']) {
    await expect(cols.getByText(head, { exact: true })).toBeVisible()
  }
  // [libfix2·RR1-W2] 标签表头列在场（列被移除=toHaveCount(0) 即红——toBeHidden
  // 对「未渲染」与「渲染但收 0」同真，在场锚区分两者）
  await expect(cols.locator('.lib-c-tags')).toHaveCount(1)
  const tagsHeadW = async (): Promise<number> =>
    cols.locator('.lib-c-tags').evaluate((el) => el.getBoundingClientRect().width)
  if ((await tagsHeadW()) > 0) {
    await expect(cols.getByText('标签', { exact: true })).toBeVisible()
  } else {
    await expect(cols.getByText('标签', { exact: true })).toBeHidden()
  }
  await expect(cols.locator('.lib-c-tier')).toHaveCount(0)

  // —— 甲行（全值）：真实题名+期刊副行+年份+引用数（档次徽章已退役）——
  // 序号锚：[F-FOLDER-01 收口亲修] INV-92 pubNo=库级全序派生（year ASC,
  // month ASC NULLS LAST, added_at ASC——PUBNO_ORDER 单源）替旧 catalogNo
  // 图序：甲 year=2023 在前=001，乙缺年 NULLS LAST 殿后=002（probe 实测恒定）
  const rowA = win.locator('.lib-row', { hasText: 'T3P3 甲文献' })
  await expect(rowA).toBeVisible({ timeout: 10_000 })
  // [libfix2·RR1-W1] 行级塌 0 回归锁=无条件（main 列保底 ≥100+标题文本
  // visible——libfix1 语义，正常宽 151.6 与钳制态 120 两态皆真）
  await expect
    .poll(async () => (await rowA.locator('.lib-r-main').boundingBox())?.width ?? 0)
    .toBeGreaterThanOrEqual(100)
  await expect(win.getByText('T3P3 甲文献：管网漏损定位')).toBeVisible({ timeout: 10_000 })
  await expect(rowA.locator('.lib-r-id')).toHaveText('001')
  await expect(rowA.locator('.lib-r-title')).toHaveText('T3P3 甲文献：管网漏损定位')
  await expect(rowA.locator('.lib-r-j')).toHaveText('Nature Water')
  await expect(rowA.locator('.lib-r-year')).toHaveText('2023')
  await expect(rowA.locator('.lib-r-cite')).toHaveText('17')
  await expect(rowA.locator('.lib-tier')).toHaveCount(0)

  // —— 乙行（缺值对照）：缺年 NULLS LAST 殿后=002+年月/引用两占位「—」 ——
  const rowB = win.locator('.lib-row', { hasText: 'T3P3 乙文献' })
  await expect(rowB).toBeVisible()
  await expect(rowB.locator('.lib-r-id')).toHaveText('002')
  await expect(rowB.locator('.lib-r-year')).toHaveText('—')
  await expect(rowB.locator('.lib-r-cite')).toHaveText('—')

  // —— 点击甲行：规格表抽屉出场（四格指标真实文本+键值行+选中态类）——
  await rowA.click()
  await expect(rowA).toHaveClass(/sel/)
  const drawer = win.locator('.lib-drawer')
  await expect(drawer).toBeVisible()
  const metrics = drawer.locator('.lib-dr-metrics')
  await expect(metrics).toBeVisible()
  await expect(metrics.getByText('引用', { exact: true })).toBeVisible()
  await expect(metrics.locator('.lib-dr-v.acc')).toHaveText('17')
  await expect(metrics.getByText('通读', { exact: true })).toBeVisible()
  await expect(metrics.getByText('标注', { exact: true })).toBeVisible()
  await expect(metrics.getByText('笔记', { exact: true })).toBeVisible()
  // 头区：短号+入库状态点（pending=「待增强」）
  await expect(drawer.locator('.lib-dr-id')).toContainText('e2e-t3p3')
  await expect(drawer.locator('.lib-dr-id')).toContainText('待增强')
  // 键值行：VENUE 真实文本；关联节已退役（无脉络行/AI 评估行——F-LIBUI-01 ⑤）
  await expect(drawer.locator('.lib-fld', { hasText: 'VENUE' })).toContainText('Nature Water')
  await expect(drawer.locator('.lib-dr-sec')).toHaveText('标 签')
  await expect(drawer.locator('.lib-postpone')).toHaveCount(0)

  // —— F-LIBUI-01 ⑥ 动作区两列 grid（真 Chromium 计算样式锚——⑤h③）——
  // primary 首行跨两列（宽≈容器内容宽）；ghost 半行宽
  const gridInfo = await win.evaluate(() => {
    const actions = document.querySelector('.lib-dr-actions')!
    const acs = getComputedStyle(actions)
    const primary = actions.querySelector('.lib-dr-btn-primary') as HTMLElement
    const ghost = actions.querySelector('.lib-dr-btn-ghost') as HTMLElement
    return {
      display: acs.display,
      tracks: acs.gridTemplateColumns.split(' ').filter((t) => t !== '').length,
      actionsWidth: actions.getBoundingClientRect().width,
      primaryWidth: primary.getBoundingClientRect().width,
      ghostWidth: ghost.getBoundingClientRect().width
    }
  })
  expect(gridInfo.display, 'grid 双轨（flex-wrap 退役）').toBe('grid')
  expect(gridInfo.tracks, '两条等宽轨道').toBe(2)
  expect(gridInfo.primaryWidth, 'primary 跨两列首行').toBeGreaterThan(gridInfo.actionsWidth * 0.85)
  expect(gridInfo.ghostWidth, 'ghost 半行宽（双轨对照锚）').toBeLessThan(gridInfo.actionsWidth * 0.6)

  await app.close()
})

/**
 * [B案首修批 runId=20261003-libfix1] 窄窗标题列塌 0 回归锁（always-active）。
 *
 * 窗口 <1134px 时 .lib-r-main（flex:1+min-width:0）被 rail72+fnav224+抽屉
 * 316+行内五列固定 522 挤塌至 0 → .lib-r-title 空 box 恒不可见（CI 35 红中
 * 34 例同根因）。修复契约：.lib-r-main 保底 120px + .lib-r-tags 先收缩
 * （flex: 0 1 180px）——本用例在 1024 窄窗锁「标题列可见」反向断言（修复前
 * ②实值 0、③ not visible 必红），复原 1285 锁「正常宽度视觉零变」（探针
 * 基线 ≈151.6，禁精确值断言防环境漂移）。单行种子防 .lib-list 纵向滚动条
 * 吃行宽（overflow-x:hidden 下无横滚条扰动）。resize 前置直证 getContentSize
 * （d1-W1：防 setContentSize 静默 no-op 假绿）；复原档 CI 虚拟屏钳制自适应
 * （d1-W2：1285 被钳回 ≤1024 时按窄窗等值档断言，两分支皆硬断言）。
 */
test('文献库窄窗 1024：标题列保底可见+复原 1285 视觉零变（libfix1 塌 0 回归锁）', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-libfix1-'))

  // 同测 1 配方：应用自建库表+单行全值种子
  await bootstrapMigrations(userData)
  const sha = 'c'.repeat(64)
  const title = 'libfix1 窄窗种子：管网漏损定位'
  await seedPaperRow(
    userData,
    `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`,
    sha,
    title,
    'e2e-libfix1-a',
    { year: 2023 }
  )

  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })

  // 行渲染在场（沿用测 1 等待形态——无 waitForTimeout）
  const rowA = win.locator('.lib-row', { hasText: 'libfix1 窄窗种子' })
  await expect(rowA).toBeVisible({ timeout: 10_000 })

  // —— 窄窗 1024（CI runner 虚拟屏口径）——resize 直证（d1-W1：throw 守卫只防
  //    窗口缺失，不防 setContentSize 静默 no-op——no-op 态停 1280 默认宽会假绿）：
  //    内容宽实测到 1024 再进布局断言 ——
  await app.evaluate(({ BrowserWindow }) => {
    const main = BrowserWindow.getAllWindows()[0]
    if (main === undefined) throw new Error('主窗口不在 BrowserWindow.getAllWindows() 中')
    main.setContentSize(1024, 768)
  })
  await expect
    .poll(async () =>
      app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.getContentSize()[0] ?? 0)
    )
    .toBe(1024)
  // main 列保底 ≥100（预期实值 120，留取整/边框裕量；修复前实值 0 此 poll 必红）
  await expect
    .poll(async () => (await rowA.locator('.lib-r-main').boundingBox())?.width ?? 0)
    .toBeGreaterThanOrEqual(100)
  // 标题可见性反向锁（CI 失败形态=getByText resolve 但恒不可见——修复前必红）
  await expect(win.getByText(title)).toBeVisible({ timeout: 10_000 })

  // —— 复原 1285（正常宽度档）——resize 直证+d1-W2 钳制自适应：CI 虚拟屏 1024
  //    下 setContentSize(1285) 可能被钳制，按实测内容宽分支断言（两分支皆硬
  //    断言禁静默跳过；钳制态=窄窗等值锁仍锁「不塌 0」）——
  await app.evaluate(({ BrowserWindow }) => {
    const main = BrowserWindow.getAllWindows()[0]
    if (main === undefined) throw new Error('主窗口不在 BrowserWindow.getAllWindows() 中')
    main.setContentSize(1285, 800)
  })
  const readContentW = async (): Promise<number> =>
    app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.getContentSize()[0] ?? 0)
  await expect.poll(readContentW).toBeGreaterThan(0)
  const wideW = await readContentW()
  // 真复原档（≥1274）锁视觉零变（探针基线 ≈151.6→≥140；判定线=main≥140
  // 所需最小总宽 1273.4 上取整——k1-W-RR1-1：1260 会留 [1260,1273.4) 假红窗）
  const wideMin = wideW >= 1274 ? 140 : 100
  await expect
    .poll(async () => (await rowA.locator('.lib-r-main').boundingBox())?.width ?? 0)
    .toBeGreaterThanOrEqual(wideMin)

  await app.close()
})
