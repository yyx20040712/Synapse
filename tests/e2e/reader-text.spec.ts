import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test'
import { spawn } from 'node:child_process'
import { copyFile, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { isTicketDone } from '../../tickets/registry'
import { createMultiPagePdf, createTinyPdf, PDF_KNOWN_TEXT } from '../utils/pdf-factory'

/** 拉起子进程跑 seed-paper.cjs；退出码非 0 即拒绝（错误细节走 stdio 继承） */
function runSeedScript(env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(process.cwd(), 'tests', 'e2e', 'seed-paper.mjs')], {
      env,
      stdio: 'inherit'
    })
    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`seed-paper.mjs 退出码 ${code ?? 'null'}`))
      }
    })
    child.on('error', reject)
  })
}

/**
 * 阅读器 e2e：断言渲染出 PDF 里的真实文本。
 * 历史教训 D1/L7：Synapse 52 个测试全绿但文字不可见——运行时视觉验证必须存在。
 * 激活条件：渲染链路的全部依赖工单完成（PdfCanvas 渲染 / 列表 / 页面组装）——
 * 只看 SR-RDR-02 会在依赖未就绪时以「非实现错误」的方式误红。
 */
const DEPS = ['SR-RDR-02', 'SR-LIB-01', 'SR-LIB-02', 'SR-RDR-04'] as const
/** 标注链后半的依赖：渲染链 + 两个标注层（划选保存/渲染命中） */
const ANNOTATION_DEPS = [...DEPS, 'SR-RDR-05', 'SR-RDR-06'] as const
/** F-02 批 2 依赖：四层多页化收口（动态锚定根+跳页兼容——划选链回归承载） */
const F02_DEPS = [...ANNOTATION_DEPS, 'SR2-F-02'] as const

/** 依赖未就绪则整测延期（翻 done 即激活）；逐测声明——标注链不绑架渲染断言 */
function skipIfPending(deps: readonly string[]): void {
  const pending = deps.filter((d) => !isTicketDone(d))
  test.skip(pending.length > 0, `延期：依赖工单未完成 [${pending.join(', ')}]`)
}

function launch(userData: string): Promise<ElectronApplication> {
  return electron.launch({
    args: ['out/main/index.js'],
    env: { ...process.env, SYNAPSE_USER_DATA: userData } as Record<string, string>
  })
}

/**
 * 种子落库（better-sqlite3 双 ABI 处理）：
 * e2e 前构建链已把 build/Release 切到 electron ABI，而本测试进程是 Node——
 * 直接 new Database 会 NODE_MODULE_VERSION 崩溃。做法：备份当前绑定 → 换上
 * abi-cache 里本进程 ABI 的 node 绑定 → 子进程（seed-paper.mjs）落库 →
 * finally 恢复 electron 绑定（后续 electron.launch 依赖它）。
 * 落库必须在子进程：Windows 锁定已加载进当前进程的原生模块文件，进程内
 * import 会让 finally 的还原 EBUSY、build/Release 残留 node 绑定，毒化后续
 * electron.launch（错 ABI 启动即崩）——子进程退出即释放文件锁，还原必然成功。
 * 命令行只有 node 与静态脚本路径，落库值经环境变量传入（不经 argv/shell）。
 */
async function seedPaperRow(
  userData: string,
  fileRef: string,
  sha: string,
  title: string,
  id = 'e2e-seed-paper'
): Promise<void> {
  const pkgDir = join(process.cwd(), 'node_modules', 'better-sqlite3')
  const releaseBinding = join(pkgDir, 'build', 'Release', 'better_sqlite3.node')
  const cacheDir = join(pkgDir, 'abi-cache')
  const wanted = `node-v${process.versions.modules}`
  const dirs = (await readdir(cacheDir)).filter((d) => d.startsWith('node-v'))
  const pick = dirs.includes(wanted) ? wanted : (dirs.sort().at(-1) ?? '')
  if (!pick) throw new Error('abi-cache 缺 node 绑定——先跑 npm ci（postinstall 会 setup）')
  const electronBinding = await readFile(releaseBinding)
  await copyFile(join(cacheDir, pick, 'better_sqlite3.node'), releaseBinding)
  try {
    await runSeedScript({
      ...process.env,
      SEED_DB: join(userData, 'synapse.db'),
      SEED_FILE_REF: fileRef,
      SEED_SHA: sha,
      SEED_TITLE: title,
      SEED_ID: id
    } as NodeJS.ProcessEnv)
  } finally {
    await writeFile(releaseBinding, electronBinding)
  }
}

/** F-01 批 1 依赖：渲染链 + 页列几何/懒渲染（多页可见断言的承载者） */
const COLUMN_DEPS = [...DEPS, 'SR2-F-01'] as const

test('打开文献后页列渲染出多页文本（连续滚动逐页可见+INV-01 保持）', async () => {
  skipIfPending(COLUMN_DEPS)
  const userData = await mkdtemp(join(tmpdir(), 'synapse-reader-mp-'))

  // 第一跳：让应用自己完成建库迁移（不 import src 内部模块——Playwright 不认 ?raw）
  const seedApp = await launch(userData)
  await (await seedApp.firstWindow()).waitForTimeout(500)
  await seedApp.close()

  // 受管文件（3 页——createMultiPagePdf 每页单行 "P<n> <KNOWN>"，ASCII 单 run
  // 可被 getByText 单节点命中；P7B marker 先例同口径）
  const bytes = createMultiPagePdf(3, PDF_KNOWN_TEXT)
  const sha = createHash('sha256').update(bytes).digest('hex')
  const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
  const abs = join(userData, 'files', ...fileRef.split('/'))
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, bytes)
  await seedPaperRow(userData, fileRef, sha, '智慧水务 e2e 多页文献')

  // 第二跳：真实断言
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })

  await win.getByText('智慧水务 e2e 多页文献').first().dblclick()
  // 首屏：第 1 页渲染出已知文本（页列初始引导窗口）
  await expect(win.getByText(`P1 ${PDF_KNOWN_TEXT}`).first()).toBeVisible({ timeout: 20_000 })

  // 连续滚动：滚到中部 → 第 2 页入视口（IntersectionObserver 驱动懒渲染窗口）
  await win.evaluate(() => {
    const col = document.querySelector('[data-page-column="ready"]')
    const scroller = col?.closest('.overflow-auto') as HTMLElement | null
    if (scroller !== null) scroller.scrollTop = Math.round(scroller.scrollHeight / 3)
  })
  await expect(win.getByText(`P2 ${PDF_KNOWN_TEXT}`).first()).toBeVisible({ timeout: 10_000 })

  // 滚到底 → 第 3 页可见（全长真实占位——总高确定，非虚拟滚动）
  await win.evaluate(() => {
    const col = document.querySelector('[data-page-column="ready"]')
    const scroller = col?.closest('.overflow-auto') as HTMLElement | null
    if (scroller !== null) scroller.scrollTop = scroller.scrollHeight
  })
  await expect(win.getByText(`P3 ${PDF_KNOWN_TEXT}`).first()).toBeVisible({ timeout: 10_000 })

  // INV-01「文档永不滚」e2e 锚定（Q1 实锤→U4 上锁）。注：几何断言形状
  // （scrollWidth<=clientWidth）实测不可用——overflow:hidden 只裁剪不收缩内容
  // 度量，锁在位时 documentElement.scrollHeight 仍可 >clientHeight（内部滚动
  // 容器的合法出血被裁掉即可）。故锚机制声明本身：html/body/#root 三层 overflow
  // 计算样式必须全 hidden（theme.css 单点声明的完整形状）——严于行为级（overflow
  // 传播下个别层为 visible 未必产生文档滚动，但任何偏离声明形状的改动都应显式
  // 过 theme.css 评审，在此即红）
  const overflowState = await win.evaluate(() => {
    const of = (el: Element | null): string => (el === null ? 'missing' : getComputedStyle(el).overflow)
    return {
      html: of(document.documentElement),
      body: of(document.body),
      root: of(document.getElementById('root'))
    }
  })
  expect(overflowState.html, 'INV-01: html 必须 overflow:hidden').toBe('hidden')
  expect(overflowState.body, 'INV-01: body 必须 overflow:hidden').toBe('hidden')
  expect(overflowState.root, 'INV-01: #root 必须 overflow:hidden').toBe('hidden')
  await app.close()
})

test('划选高亮后重开仍在原位；批注编辑与删除可用', async () => {
  skipIfPending(F02_DEPS)
  // 受管文件 + 种子落库 + 二次启动（seedAndLaunch 共用配方；标题带"标注链"区分）
  const title = '智慧水务 e2e 标注链文献'
  const { app, userData } = await seedAndLaunch(title)
  // 第一程：划选 → 工具条 → 高亮 → 色块出现并记取位置
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByText(title).first().dblclick()
  const known = win.getByText(PDF_KNOWN_TEXT).first()
  await expect(known).toBeVisible({ timeout: 20_000 })

  // 程序化全选该 span（程序化选选走 selectionchange 防抖路径，mouseUp 由人工路径覆盖）
  await known.selectText()
  await expect(win.getByTestId('selection-toolbar')).toBeVisible()
  await win.getByRole('button', { name: '高亮' }).click()

  const rect = win.getByTestId('annotation-rect')
  await expect(rect.first()).toBeVisible()
  // 计算样式防线（Q3b：opacity 0.35×浅黄在白纸对比度 ~1.1:1 低于感知阈——几何
  // 可见 ≠ 视觉可见，Playwright toBeVisible 不看 opacity/计算色）；mix-blend 上
  // 容器级（z-5 容器是 stacking context，rect 级混合被隔离无效）
  await expect(win.getByTestId('annotation-layer')).toHaveCSS('mix-blend-mode', 'multiply')
  await expect(rect.first()).toHaveCSS('background-color', 'rgb(253, 224, 71)')
  await expect(rect.first()).toHaveCSS('opacity', '1')
  // 单行单 span 划选：行级合并后恰 1 矩形（逐 clientRect 透传回归即 >1）
  await expect(rect).toHaveCount(1)
  const box1 = await rect.first().boundingBox()
  const page1 = await win.locator('canvas[data-pdf-canvas]').boundingBox()
  expect(box1).not.toBeNull()
  expect(page1).not.toBeNull()
  // 位置记取归一到页面盒：窗口绝对坐标会随窗口几何漂移（窗口状态持久化的恢复值
  // 与默认值有取整差、滚动条出现与否影响居中），"原位"语义是相对页面而非相对窗口
  const rel1 = { x: box1!.x - page1!.x, y: box1!.y - page1!.y }
  await app.close()

  // 第二程：重开同一文献，高亮仍渲染在原位（位置断言，不只断言存在）
  const app2 = await launch(userData)
  const win2 = await app2.firstWindow()
  await expect(win2.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win2.getByText(title).first().dblclick()
  await expect(win2.getByText(PDF_KNOWN_TEXT).first()).toBeVisible({ timeout: 20_000 })
  const rect2 = win2.getByTestId('annotation-rect')
  await expect(rect2.first()).toBeVisible({ timeout: 10_000 })
  // 重锚路径（verifyQuote→findRangeAtOffset）同口径：合并后仍 1 矩形、样式仍到位
  await expect(rect2).toHaveCount(1)
  await expect(win2.getByTestId('annotation-layer')).toHaveCSS('mix-blend-mode', 'multiply')
  const box2 = await rect2.first().boundingBox()
  const page2 = await win2.locator('canvas[data-pdf-canvas]').boundingBox()
  expect(box2).not.toBeNull()
  expect(page2).not.toBeNull()
  const rel2 = { x: box2!.x - page2!.x, y: box2!.y - page2!.y }
  // 同一渲染管线下归一化矩形应一致（相对页面盒比较，≤2px 容差吞字度量测噪声；
  // 尺寸不经窗口几何，直接比）
  expect(Math.abs(rel1.x - rel2.x)).toBeLessThanOrEqual(2)
  expect(Math.abs(rel1.y - rel2.y)).toBeLessThanOrEqual(2)
  expect(Math.abs(box1!.width - box2!.width)).toBeLessThanOrEqual(2)
  expect(Math.abs(box1!.height - box2!.height)).toBeLessThanOrEqual(2)

  // 点击色块 → 四选项菜单 → 添加笔记开编辑弹层 → 删除（confirm 自动接受）→ 色块消失
  // （P7-A 菜单前置后编辑器只能经「添加笔记」到达——直开路径已收口）
  win2.on('dialog', (d) => {
    void d.accept()
  })
  await rect2.first().click()
  const menu = win2.getByTestId('annotation-menu')
  await expect(menu).toBeVisible()
  for (const label of ['复制引文', '删除', '添加笔记', '取消']) {
    await expect(menu.getByRole('button', { name: label })).toBeVisible()
  }
  await menu.getByRole('button', { name: '添加笔记' }).click()
  const editor = win2.getByTestId('annotation-editor')
  await expect(editor).toBeVisible()
  await editor.getByRole('button', { name: '删除' }).click()
  await expect(win2.getByTestId('annotation-rect')).toHaveCount(0)
  await app2.close()
})

/** P7-B 三序列依赖：渲染链 + tab 骨架（TABS-01/02）+ 退出拦截（TABS-04） */
const TABS_DEPS = [...DEPS, 'SR2-TABS-01', 'SR2-TABS-02', 'SR2-TABS-04'] as const

test('P7-B 收官三序列：换 tab 状态保持 / 关 tab（含 error tab）/ 退出拦截', async () => {
  skipIfPending(TABS_DEPS)
  const userData = await mkdtemp(join(tmpdir(), 'synapse-p7b-'))
  // 第一跳：建库迁移
  const seedApp = await launch(userData)
  await (await seedApp.firstWindow()).waitForTimeout(500)
  await seedApp.close()

  // 种子三篇：甲/乙真实文件；丙只种行不落文件（error 场景）。正文断言用
  // ASCII 单 run 标记词——CJK 会被 pdfjs 文本层逐字分项，getByText 单节点匹配不到
  const papers = [
    { id: 'e2e-seed-a', title: 'P7B 甲文献', marker: 'P7BA-MARK' },
    { id: 'e2e-seed-b', title: 'P7B 乙文献', marker: 'P7BB-MARK' }
  ] as const
  for (const p of papers) {
    const bytes = createTinyPdf(`${p.marker} ${PDF_KNOWN_TEXT}`)
    const sha = createHash('sha256').update(bytes).digest('hex')
    const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
    const abs = join(userData, 'files', ...fileRef.split('/'))
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, bytes)
    await seedPaperRow(userData, fileRef, sha, p.title, p.id)
  }
  const ghostSha = createHash('sha256').update('P7B-ghost-file').digest('hex')
  const ghostRef = `${ghostSha.slice(0, 2)}/${ghostSha.slice(2, 4)}/${ghostSha}.pdf`
  await seedPaperRow(userData, ghostRef, ghostSha, 'P7B 丙缺失文件', 'e2e-seed-ghost')

  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  // tab 查询限定 TabBar 容器——侧栏目录/缩略图切换器也有 role=tab（域隔离）；
  // tab 标题=title 优先（文献名）/fileName 兜底（2026-08-27 缺陷②随单改为文献名），
  // tab 定位按 order 位置（打开序=甲0/乙1/丙2）；选区工具栏按钮定位已收紧到
  // selection-toolbar 作用域——防 tab 关闭钮 aria-label 含标题字样的子串碰撞
  // （Playwright name 默认子串匹配——2026-08-27 回炉 2）
  const tabBar = win.getByRole('tablist', { name: '打开的文献' })
  const tabAt = (i: number) => tabBar.getByRole('tab').nth(i)

  // —— 序列一：换 tab 状态保持（S1 装配级：per-tab 状态不失忆）——
  await win.getByText('P7B 甲文献').first().dblclick()
  await expect(win.getByText('P7BA-MARK').first()).toBeVisible({ timeout: 20_000 })
  await win.getByRole('button', { name: '文献库' }).click()
  await win.getByText('P7B 乙文献').first().dblclick()
  await expect(win.getByText('P7BB-MARK').first()).toBeVisible({ timeout: 20_000 })
  await expect(tabBar.getByRole('tab')).toHaveCount(2)
  // 切回甲：内容立即可见（切换走 per-tab 状态，非重载）
  await tabAt(0).click()
  await expect(win.getByText('P7BA-MARK').first()).toBeVisible({ timeout: 10_000 })

  // —— 序列二：error tab 可见可切可关（INV-15 装配级：打开失败不 UI 死锁）+ 收缩序 ——
  await win.getByRole('button', { name: '文献库' }).click()
  await win.getByText('P7B 丙缺失文件').first().dblclick()
  const errTab = tabBar.getByRole('tab', { name: /打开失败/ })
  await expect(errTab).toBeVisible({ timeout: 10_000 })
  await expect(tabBar.getByRole('tab')).toHaveCount(3)
  // error tab 可切走再切回（多 tab 失败场景可切回其他 tab——INV-15 完整语义）
  await tabAt(0).click()
  await expect(win.getByText('P7BA-MARK').first()).toBeVisible({ timeout: 10_000 })
  await errTab.click()
  // 关闭 error tab（叉）→ 剩两 tab；再关乙 → 收缩到甲（关 active 取左邻）
  await errTab.getByRole('button').click()
  await expect(tabBar.getByRole('tab')).toHaveCount(2)
  await tabAt(1).click()
  await tabAt(1).getByRole('button').click()
  await expect(tabBar.getByRole('tab')).toHaveCount(1)
  await expect(win.getByText('P7BA-MARK').first()).toBeVisible({ timeout: 10_000 })

  // —— 序列三：退出拦截（TABS-04 装配级，INV-22 收口）——
  // dirty 经通道直发（renderer 聚合效应为单元级已锚；装配级锁 main 全链：
  // 缓存→close 守卫→模态确认→destroy）。app.evaluate 注入 electron 模块（main 为
  // ESM 无 require）；关闭经渲染侧 window.close()（等价触发 close 事件链）。
  const aliveWindows = (): Promise<number> =>
    app
      .evaluate((electron) =>
        electron.BrowserWindow.getAllWindows().filter((w) => !w.isDestroyed()).length
      )
      .catch(() => -1) // -1=主进程已退出（比窗口归零更强的终局信号）
  // dirty 经通道直发并 await 落地（void 早返回会让 window.close() 抢在 main
  // 处理上报前到达——缓存仍 false 直通退出，装配链假阴）
  // 关闭触发走 main 侧（注入 electron 模块；渲染侧 window.close() 的语义差异排除）
  const closeMain = (): Promise<unknown> =>
    app.evaluate((electron) => {
      electron.BrowserWindow.getAllWindows()[0]?.close()
    })
  await win.evaluate(() => window.api.system.setQuitDirty({ dirty: true }))
  await app.evaluate((electron) => {
    ;(electron.dialog as unknown as { showMessageBox: () => Promise<{ response: number }> })
      .showMessageBox = async () => ({ response: 1 })
  })
  await closeMain()
  // 取消：preventDefault 生效，窗口保持
  await expect.poll(aliveWindows).toBe(1)
  // 确认：destroy 强制关闭 → 窗口归零（或主进程随之退出）
  await app.evaluate((electron) => {
    ;(electron.dialog as unknown as { showMessageBox: () => Promise<{ response: number }> })
      .showMessageBox = async () => ({ response: 0 })
  })
  await closeMain()
  await expect.poll(aliveWindows).toBeLessThan(1)
  await app.close().catch(() => undefined)
})

/** 种子+首跳建库+受管文件落盘+二次启动（标注链各测共用配方；标题区分文献） */
async function seedAndLaunch(title: string): Promise<{ app: ElectronApplication; userData: string }> {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-annot-'))
  // 第一跳：让应用自己完成建库迁移（不 import src 内部模块——Playwright 不认 ?raw）
  const seedApp = await launch(userData)
  await (await seedApp.firstWindow()).waitForTimeout(500)
  await seedApp.close()
  const bytes = createTinyPdf(`${title} ${PDF_KNOWN_TEXT}`)
  const sha = createHash('sha256').update(bytes).digest('hex')
  const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
  const abs = join(userData, 'files', ...fileRef.split('/'))
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, bytes)
  await seedPaperRow(userData, fileRef, sha, title)
  return { app: await launch(userData), userData }
}

test('划选下划线后渲染为行盒下沿 2px 实条（INV-06 感知断言）', async () => {
  skipIfPending(ANNOTATION_DEPS)
  const title = '智慧水务 e2e 下划线链文献'
  const { app } = await seedAndLaunch(title)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByText(title).first().dblclick()
  const known = win.getByText(PDF_KNOWN_TEXT).first()
  await expect(known).toBeVisible({ timeout: 20_000 })

  await known.selectText()
  await expect(win.getByTestId('selection-toolbar')).toBeVisible()
  await win.getByTestId('selection-toolbar').getByRole('button', { name: '下划线' }).click()

  const rect = win.getByTestId('annotation-rect')
  await expect(rect.first()).toBeVisible()
  // INV-06：几何可见 ≠ 视觉可见——kind=underline 的渲染形态必须是合并行盒下沿
  // 2px 实条（U3 修复语义），颜色/不透明度到位才谈得上"看得见"
  await expect(rect.first()).toHaveCSS('height', '2px')
  await expect(rect.first()).toHaveCSS('background-color', 'rgb(253, 224, 71)')
  await expect(rect.first()).toHaveCSS('opacity', '1')
  // 「行盒下沿」位置语义：实条底边贴合已知文本 span 的行盒底边（±4px 容差吞
  // 字度量测噪声），宽度覆盖选区（≥80%，防窄条悬空）
  const underlineBox = await rect.first().boundingBox()
  const textBox = await known.boundingBox()
  expect(underlineBox).not.toBeNull()
  expect(textBox).not.toBeNull()
  expect(Math.abs(underlineBox!.y + underlineBox!.height - (textBox!.y + textBox!.height))).toBeLessThanOrEqual(4)
  expect(underlineBox!.width).toBeGreaterThanOrEqual(textBox!.width * 0.8)
  await app.close()
})

test('划选备注后渲染为整行色块（note kind 渲染存在性，INV-06）', async () => {
  skipIfPending(ANNOTATION_DEPS)
  const title = '智慧水务 e2e 备注链文献'
  const { app } = await seedAndLaunch(title)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByText(title).first().dblclick()
  const known = win.getByText(PDF_KNOWN_TEXT).first()
  await expect(known).toBeVisible({ timeout: 20_000 })

  await known.selectText()
  await expect(win.getByTestId('selection-toolbar')).toBeVisible()
  await win.getByTestId('selection-toolbar').getByRole('button', { name: '备注' }).click()

  const rect = win.getByTestId('annotation-rect')
  await expect(rect.first()).toBeVisible()
  // note 呈整行高色块（正向断言：≥8px 的实块高度才谈得上行内可见标记——1px/2px
  // 退化即红；该形态与 underline 的 2px 实条构成 kind 互斥区分度）
  await expect(rect.first()).toHaveCSS('background-color', 'rgb(253, 224, 71)')
  const noteHeight = await rect.first().evaluate((el) => parseFloat(getComputedStyle(el).height))
  expect(noteHeight).toBeGreaterThanOrEqual(8)
  await app.close()
})

/** P7-A 交互基建依赖：快捷键两单 + 菜单 + 分隔条（v2 首批四单） */
const P7A_DEPS = [...ANNOTATION_DEPS, 'SR2-KEY-01', 'SR2-KEY-02', 'SR2-UIK-01'] as const

test('P7-A 交互：ctrl 滚轮缩放与侧栏分隔条拖拽（ReaderToolbar/ReaderShortcuts/SplitPane 集成）', async () => {
  skipIfPending(P7A_DEPS)
  const title = '智慧水务 e2e 交互链文献'
  const { app } = await seedAndLaunch(title)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByText(title).first().dblclick()
  await expect(win.getByText(PDF_KNOWN_TEXT).first()).toBeVisible({ timeout: 20_000 })

  // ctrl+滚轮缩放：工具栏百分比读数 100% → 上滚一步 110%（ReaderShortcuts→store→
  // ReaderToolbar 全链；data-testid 锚定——工具栏另有静态「100%」复位按钮，
  // 文本类选择器会严格模式双命中）
  const zoomLabel = win.getByTestId('zoom-label')
  await expect(zoomLabel).toHaveText('100%')
  await win.keyboard.down('Control')
  await win.mouse.wheel(0, -120)
  await win.keyboard.up('Control')
  await expect(zoomLabel).toHaveText('110%')

  // 分隔条拖拽：pane 计算宽度随拖拽增大（SplitPane 指针会话 → 宽度状态 → 样式）
  const pane = win.getByTestId('split-pane-pane')
  const widthBefore = await pane.evaluate((el) => parseFloat(getComputedStyle(el).width))
  const handleBox = await win.getByRole('separator').boundingBox()
  expect(handleBox).not.toBeNull()
  const hx = handleBox!.x + handleBox!.width / 2
  const hy = handleBox!.y + Math.min(handleBox!.height / 2, 200)
  await win.mouse.move(hx, hy)
  await win.mouse.down()
  await win.mouse.move(hx + 80, hy, { steps: 4 })
  await win.mouse.up()
  const widthAfter = await pane.evaluate((el) => parseFloat(getComputedStyle(el).width))
  expect(widthAfter - widthBefore).toBeGreaterThanOrEqual(70)
  await app.close()
})

test('P7-A 复制：ctrl+c 将文本层选区写入系统剪贴板（ReaderShortcuts 剪贴板集成）', async () => {
  skipIfPending(P7A_DEPS)
  const title = '智慧水务 e2e 复制链文献'
  const { app } = await seedAndLaunch(title)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByText(title).first().dblclick()
  const known = win.getByText(PDF_KNOWN_TEXT).first()
  await expect(known).toBeVisible({ timeout: 20_000 })

  // 程序化选区 + ctrl+c → 主进程 clipboard 模块读回断言（渲染进程 readText 无权限
  // ——NotAllowedError 实证；主进程读取即真实系统剪贴板，集成语义不打折）
  await known.selectText()
  await win.keyboard.press('Control+c')
  const clipped = await app.evaluate(({ clipboard }) => clipboard.readText())
  expect(clipped).toContain(PDF_KNOWN_TEXT)
  await app.close()
})

/** P7-C 收官依赖：渲染链 + 三栏宿主（C-04）+ 笔记面（C-03）+ 定位服务（C-05）+ 库侧下线（C-06） */
const C_DEPS = [...DEPS, 'SR2-C-03', 'SR2-C-04', 'SR2-C-05', 'SR2-C-06'] as const

test('P7-C 收官：侧栏笔记面——片段列表（文档序）+总评 autosave+片段单击定位闪烁+重启持久', async () => {
  skipIfPending(C_DEPS)
  const title = '智慧水务 e2e 笔记面板文献'
  const { app, userData } = await seedAndLaunch(title)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByText(title).first().dblclick()
  const known = win.getByText(PDF_KNOWN_TEXT).first()
  await expect(known).toBeVisible({ timeout: 20_000 })

  // 三栏宿主：目录/缩略图/笔记（e2e 坑③——查询限定 reader-aside 容器）
  const aside = win.getByTestId('reader-aside')
  for (const label of ['目录', '缩略图', '笔记']) {
    await expect(aside.getByRole('tab', { name: label })).toBeVisible()
  }

  // 划选高亮（既有配方）→ 片段层实时出现该条目（TabState.annotations 投影）
  await known.selectText()
  await expect(win.getByTestId('selection-toolbar')).toBeVisible()
  await win.getByRole('button', { name: '高亮' }).click()
  await expect(win.getByTestId('annotation-rect').first()).toBeVisible()

  // 切到笔记 tab：片段列表含划选引文（C-01 文档序消费）；总评层 autosave 四态
  await aside.getByRole('tab', { name: '笔记' }).click()
  const panel = win.getByTestId('reader-notes-panel')
  await expect(panel).toBeVisible()
  await expect(panel.getByTestId('fragment-list')).toBeVisible()
  await expect(panel.locator('[data-fragment-id]')).toHaveCount(1)
  const body = panel.getByLabel('笔记正文')
  await body.fill('e2e 总评内容')
  await expect(panel.getByText('已保存')).toBeVisible({ timeout: 10_000 })

  // 片段单击 → C-05 定位服务：同页 exact → 标注元素滚动+locate-flash 闪烁
  await panel.locator('[data-fragment-id] button').first().click()
  await expect(win.locator('.locate-flash')).toBeVisible({ timeout: 5_000 })
  await app.close()

  // 第二程：重开同一文献——DB 真相源（总评+片段持久；md 投影的真相在库）
  const app2 = await launch(userData)
  const win2 = await app2.firstWindow()
  await expect(win2.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win2.getByText(title).first().dblclick()
  await expect(win2.getByText(PDF_KNOWN_TEXT).first()).toBeVisible({ timeout: 20_000 })
  await win2.getByTestId('reader-aside').getByRole('tab', { name: '笔记' }).click()
  const panel2 = win2.getByTestId('reader-notes-panel')
  await expect(panel2.locator('[data-fragment-id]')).toHaveCount(1, { timeout: 10_000 })
  await expect(panel2.getByLabel('笔记正文')).toHaveValue('e2e 总评内容')
  await app2.close()
})
