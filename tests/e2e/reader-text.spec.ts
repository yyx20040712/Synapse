import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test'
import { spawn } from 'node:child_process'
import { copyFile, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { isTicketDone } from '../../tickets/registry'
import { createMultiLinePdf, createMultiPagePdf, createRotatedCropPdf, createTinyPdf, PDF_KNOWN_TEXT, PDF_MULTILINE_TEXT, PDF_ROTATED_CROP_TEXT } from '../utils/pdf-factory'

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
 * [F-R2e 修] 稳态原子测量：标注块相对页面 canvas 的归一几何（x/y/w/h）。
 * 两源瞬态均能造成恰 y 轴假红（排查档 scripts/audits/f-r2e-investigation.md）：
 * ①重锚双态——AnnotationLayer 先渲染存量行盒几何（fallback），resolve 完成后
 * 跳 band 收边几何（MutationObserver 实测 y 差 4.44px、正常负载窗 ~8ms；
 * W-G1 备案 3.45px 同族嫌疑——归属未定死见档 §4）；②两次独立 boundingBox
 * 调用之间的滚动落帧（注入实验 dy=Δ 线性实证）。故先双采样稳定门跨过双态
 * 瞬态，再以单 evaluate 同帧取 rect/canvas 两盒——同帧差值对滚动平移不变。
 * 断言语义=稳态"原位"（初渲染瞬态位不属断言面——内部时序非缺陷）；可见性
 * 守卫保留（零盒=display:none 形态视为未就绪，穷尽即红——门一 W-4）；
 * 穷尽未收敛=fail loudly（静默返回末值会把假红面留给瞬态——门一 B-1）。
 * 相对 canvas 归一消窗口几何漂移（窗口状态恢复取整差——原版同理）；时长
 * 代价两程各 ≤3s（门一 N-3 备案）。
 */
async function stableRel(win: Page): Promise<{ x: number; y: number; w: number; h: number }> {
  const measure = (): Promise<{ x: number; y: number; w: number; h: number } | null> =>
    win.evaluate(() => {
      const r = document.querySelector('[data-testid="annotation-rect"]')?.getBoundingClientRect()
      const c = document.querySelector('canvas[data-pdf-canvas]')?.getBoundingClientRect()
      if (r === undefined || c === undefined) return null
      // 可见性守卫：零盒（display:none/未渲染形态）=未就绪，不当稳定值（W-4）
      if (r.width <= 0 || r.height <= 0 || c.width <= 0 || c.height <= 0) return null
      return { x: r.x - c.x, y: r.y - c.y, w: r.width, h: r.height }
    })
  // 门二 W-A 加固一：前置观察窗（400ms＞双态基线窗 8ms×50）——双采样一致
  // 不能区分「跳变已结束」与「跳变未开始」，前置窗给 fallback→resolved 留余量
  await win.waitForTimeout(400)
  let prev = await measure()
  let streak = 0
  for (let i = 0; i < 25; i++) {
    await win.waitForTimeout(120)
    const cur = await measure()
    if (
      cur !== null && prev !== null &&
      Math.abs(cur.x - prev.x) < 0.1 && Math.abs(cur.y - prev.y) < 0.1 &&
      Math.abs(cur.w - prev.w) < 0.1 && Math.abs(cur.h - prev.h) < 0.1
    ) {
      // 门二 W-A 加固二：连续 3 采样点（2 对相邻一致≈360ms 平台）才返回——
      // 双点一致即返回会在 fallback 平台提前收敛（resolve 推迟则假红通道仍开）
      streak += 1
      if (streak >= 2) {
        return cur
      }
    } else {
      streak = 0
    }
    prev = cur
  }
  expect(prev, '标注块 3s 内未出现（元素缺失或恒不可见）').not.toBeNull()
  // B-1：非收敛必须红——穷尽静默返回末值=断言输入不可靠且恰在负载态位形触发
  expect(false, '标注块几何 25 轮（3s）采样未收敛——双态瞬态/漂移超预算，断言输入不可靠').toBe(true)
  throw new Error('unreachable')
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
  // 可见 ≠ 视觉可见，Playwright toBeVisible 不看 opacity/计算色）
  // [F-A5/ADR-0019 R2] 色块垫底背景板序（用户「背景板」令）：multiply 摘除
  // （normal——canvas 透明底，墨带恒在色块之上文字纯黑）+层序=显式 z 常量
  // 单源（colorBlocks=1，canvas=2 之下——原 multiply/5 守卫随 R2 修订改向）
  await expect(win.getByTestId('annotation-layer')).toHaveCSS('mix-blend-mode', 'normal')
  await expect(win.getByTestId('annotation-layer')).toHaveCSS('z-index', '1')
  await expect(rect.first()).toHaveCSS('background-color', 'rgb(253, 224, 71)')
  await expect(rect.first()).toHaveCSS('opacity', '1')
  // 单行单 span 划选：行级合并后恰 1 矩形（逐 clientRect 透传回归即 >1）
  await expect(rect).toHaveCount(1)
  // [F-R2e 修] 稳态原子测量（stableRel 头注——双态瞬态+滚动撕裂双源假红面）
  const m1 = await stableRel(win)
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
  // [F-A5/ADR-0019 R2] 背景板序第二程同锁（multiply 摘除+z=1）
  await expect(win2.getByTestId('annotation-layer')).toHaveCSS('mix-blend-mode', 'normal')
  await expect(win2.getByTestId('annotation-layer')).toHaveCSS('z-index', '1')
  // [F-R2e 修] 稳态原子测量（第二程同口径——重锚双态窗口在此程）
  const m2 = await stableRel(win2)
  // 同一渲染管线下归一化矩形应一致（相对页面盒比较，≤2px 容差吞字度量测噪声；
  // 尺寸不经窗口几何，直接比）
  expect(Math.abs(m1.x - m2.x)).toBeLessThanOrEqual(2)
  expect(Math.abs(m1.y - m2.y)).toBeLessThanOrEqual(2)
  expect(Math.abs(m1.w - m2.w)).toBeLessThanOrEqual(2)
  expect(Math.abs(m1.h - m2.h)).toBeLessThanOrEqual(2)

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

/** F-03 批 3 依赖：渲染链 + 页列（F-01）+ tab 骨架（关 tab flush）+ 本单 */
const F03_DEPS = [...DEPS, 'SR2-F-01', 'SR2-TABS-01', 'SR2-F-03'] as const

test('F-03 批 3：滚动进度回写恢复+键位滚动步+选区工具条滚动不闪收', async () => {
  skipIfPending(F03_DEPS)
  const userData = await mkdtemp(join(tmpdir(), 'synapse-f03-'))
  // 第一跳：建库迁移
  const seedApp = await launch(userData)
  await (await seedApp.firstWindow()).waitForTimeout(500)
  await seedApp.close()

  // 3 页受管文件（批 1 配方——每页单行 P<n> KNOWN，ASCII 单 run 可 getByText 命中）
  const bytes = createMultiPagePdf(3, PDF_KNOWN_TEXT)
  const sha = createHash('sha256').update(bytes).digest('hex')
  const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
  const abs = join(userData, 'files', ...fileRef.split('/'))
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, bytes)
  await seedPaperRow(userData, fileRef, sha, '智慧水务 e2e F03 进度文献', 'e2e-seed-f03')

  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByText('智慧水务 e2e F03 进度文献').first().dblclick()
  await expect(win.getByText(`P1 ${PDF_KNOWN_TEXT}`).first()).toBeVisible({ timeout: 20_000 })

  // 滚动容器读数（页列就绪后向上找 overflow-auto 容器——批 1 同口径）
  const scrollTop = (): Promise<number> =>
    win.evaluate(() => {
      const col = document.querySelector('[data-page-column="ready"]')
      return (col?.closest('.overflow-auto') as HTMLElement | null)?.scrollTop ?? -1
    })
  const clientH = (): Promise<number> =>
    win.evaluate(() => {
      const col = document.querySelector('[data-page-column="ready"]')
      return (col?.closest('.overflow-auto') as HTMLElement | null)?.clientHeight ?? -1
    })

  // —— 键位滚动步：PageDown → scrollTop 前进 ≈ 视口高 90%（一屏−一行重叠）；
  // 旧 setPage 翻页语义在此红（页码立即翻+盒顶对齐）——迁移后 tab 页码不动，
  // 滚动量=0.9 视口 ——
  const top0 = await scrollTop()
  // 恢复链可能已把页 1 盒顶对齐视口顶（p-3 内边距 12px 计入 scrollTop——合法）
  expect(top0).toBeLessThan(50)
  const vh = await clientH()
  expect(vh).toBeGreaterThan(200)
  await win.keyboard.press('PageDown')
  await expect.poll(scrollTop, { timeout: 3_000 }).toBeGreaterThan(top0 + vh * 0.8)
  const stepped = await scrollTop()
  expect(stepped, '滚动步不越一屏（步长=0.9 屏，非整页跳）').toBeLessThan(top0 + vh)
  // 页码回写是防抖的：窗内 sr-only 页指示不翻（旧语义此刻已翻第 2 页）
  await expect(win.getByText('当前第 1 页')).toBeVisible()

  // —— 滚到第 2 页（IntersectionObserver 懒渲染入视口）——
  await win.evaluate(() => {
    const col = document.querySelector('[data-page-column="ready"]')
    const scroller = col?.closest('.overflow-auto') as HTMLElement | null
    if (scroller !== null) scroller.scrollTop = Math.round(scroller.scrollHeight / 3)
  })
  await expect(win.getByText(`P2 ${PDF_KNOWN_TEXT}`).first()).toBeVisible({ timeout: 10_000 })

  // —— N4（F-02 门一并入）：划选第 2 页 → 工具条出现 → 上滚使锚定页（首可见页）
  // 翻回第 1 页 —— 挂载盒稳定化后工具条不闪收（旧挂载位重挂=工具条消失）——
  const known2 = win.getByText(`P2 ${PDF_KNOWN_TEXT}`).first()
  await known2.selectText()
  const toolbar = win.getByTestId('selection-toolbar')
  await expect(toolbar).toBeVisible()
  await win.evaluate(() => {
    const col = document.querySelector('[data-page-column="ready"]')
    const scroller = col?.closest('.overflow-auto') as HTMLElement | null
    if (scroller !== null) scroller.scrollTop = Math.max(0, scroller.scrollTop - 400)
  })
  await expect(toolbar).toBeVisible({ timeout: 3_000 })

  // —— 滚动→关→重开=恢复页（pending 经关 tab flush 落库；重开走恢复链滚回记忆页）——
  await win.evaluate(() => {
    const col = document.querySelector('[data-page-column="ready"]')
    const scroller = col?.closest('.overflow-auto') as HTMLElement | null
    if (scroller !== null) scroller.scrollTop = Math.round(scroller.scrollHeight / 3)
  })
  await expect(win.getByText(`P2 ${PDF_KNOWN_TEXT}`).first()).toBeVisible({ timeout: 10_000 })
  const tabBar = win.getByRole('tablist', { name: '打开的文献' })
  await tabBar.getByRole('tab').first().getByRole('button').click()
  await expect(tabBar.getByRole('tab')).toHaveCount(0) // 空态回收（TabBar 保留）
  await win.getByRole('button', { name: '文献库' }).click()
  await win.getByText('智慧水务 e2e F03 进度文献').first().dblclick()
  await expect(win.getByText(`P2 ${PDF_KNOWN_TEXT}`).first()).toBeVisible({ timeout: 20_000 })
  await expect(win.getByText('当前第 2 页')).toBeVisible()
  await expect.poll(scrollTop, { timeout: 3_000 }).toBeGreaterThan(100) // 真实滚回非仅标签
  await app.close()
})

/** 种子+首跳建库+受管文件落盘+二次启动（标注链各测共用配方；标题区分文献；
 *  bytes 可换多行 fixture——F-A1 多行划选） */
async function seedAndLaunch(
  title: string,
  bytes: Uint8Array = createTinyPdf(`${title} ${PDF_KNOWN_TEXT}`)
): Promise<{ app: ElectronApplication; userData: string }> {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-annot-'))
  // 第一跳：让应用自己完成建库迁移（不 import src 内部模块——Playwright 不认 ?raw）
  const seedApp = await launch(userData)
  await (await seedApp.firstWindow()).waitForTimeout(500)
  await seedApp.close()
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

test('P7-A 交互：侧栏分隔条拖拽（SplitPane 集成）', async () => {
  skipIfPending(P7A_DEPS)
  const title = '智慧水务 e2e 交互链文献'
  const { app } = await seedAndLaunch(title)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByText(title).first().dblclick()
  await expect(win.getByText(PDF_KNOWN_TEXT).first()).toBeVisible({ timeout: 20_000 })

  // ctrl+滚轮缩放段已随 F-04 迁移 reader-scroll.spec 收官链（缩放中心锚组）——
  // 方案切换=旧段删除；本测保留 SplitPane 拖拽面

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
  // [P7A/locked-change] 剪贴板竞态防线（六场六现+2026-09-02 第七现实锤——系统
  // 剪贴板被外部内容占用时读到外部文本假红，实测值=用户复制的文件名；先红
  // 实证=p7a-red1.raw.txt 注入复刻）：①ctrl+c 前清场标记覆盖外部旧值；
  // ②条件重读 5×200ms——值含期望文本即过；标记值/空串=写入未落盘继续轮询；
  // 超时红且失败信息带末次读值（标记→写入链断；其他→外部再改写，可归因）。
  // 断言锚不放宽（仍必须 toContain 期望文本）。
  await known.selectText()
  await app.evaluate(({ clipboard }) => clipboard.writeText('__p7a_cleared__'))
  await win.keyboard.press('Control+c')
  let clipped = ''
  for (let i = 0; i < 5; i++) {
    clipped = await app.evaluate(({ clipboard }) => clipboard.readText())
    if (clipped.includes(PDF_KNOWN_TEXT)) break
    await win.waitForTimeout(200)
  }
  expect(clipped, `剪贴板末次读值（标记=写入未落盘；其他=外部再改写）：${JSON.stringify(clipped)}`).toContain(PDF_KNOWN_TEXT)
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

/** F-06 视觉小票依赖：渲染链 + 页列（F-01 页盒载体）+ 本单（验收缺陷 B+C） */
const F06_DEPS = [...COLUMN_DEPS, 'SR2-F-06'] as const

test('F-06 视觉小票：页盒 panel 底+阴影页缘可辨；划选视觉=自绘并集层（F-A4/ADR-0019 R1 修订）', async () => {
  skipIfPending(F06_DEPS)
  const userData = await mkdtemp(join(tmpdir(), 'synapse-f06-'))

  // 第一跳：让应用自己完成建库迁移（批 1 配方）
  const seedApp = await launch(userData)
  await (await seedApp.firstWindow()).waitForTimeout(500)
  await seedApp.close()

  // 3 页受管文件（批 1 配方——每页单行 P<n> KNOWN，页间分隔断言需要多页）
  const bytes = createMultiPagePdf(3, PDF_KNOWN_TEXT)
  const sha = createHash('sha256').update(bytes).digest('hex')
  const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
  const abs = join(userData, 'files', ...fileRef.split('/'))
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, bytes)
  await seedPaperRow(userData, fileRef, sha, '智慧水务 e2e F06 视觉文献', 'e2e-seed-f06')

  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByText('智慧水务 e2e F06 视觉文献').first().dblclick()
  await expect(win.getByText(`P1 ${PDF_KNOWN_TEXT}`).first()).toBeVisible({ timeout: 20_000 })

  // 计算样式快照：页盒/滚动容器/文本 span 的 ::selection（缺陷 B+C 两面一次取）
  const visual = await win.evaluate(() => {
    const col = document.querySelector('[data-page-column="ready"]')
    const box = col?.querySelector<HTMLElement>('[data-page-box]') ?? null
    const scroller = col?.closest('.overflow-auto') as HTMLElement | null
    const span = document.querySelector<HTMLElement>('.textLayer span')
    return {
      pageBg: box === null ? 'missing' : getComputedStyle(box).backgroundColor,
      pageShadow: box === null ? 'missing' : getComputedStyle(box).boxShadow,
      scrollBg: scroller === null ? 'missing' : getComputedStyle(scroller).backgroundColor,
      bodyBg: getComputedStyle(document.body).backgroundColor,
      selectionBg: span === null ? 'missing' : getComputedStyle(span, '::selection').backgroundColor
    }
  })
  // —— 缺陷 B：页盒=--panel 不透明白 + 柔和阴影（页缘在阅读区上视觉可辨的两要素；
  //    渲染/占位同底消色差跳动——背景在页盒 div 上与渲染态无关）——
  expect(visual.pageBg, 'B: 页盒背景=var(--panel) 不透明白').toBe('rgb(255, 255, 255)')
  expect(visual.pageShadow, 'B: 页盒阴影非 none').not.toBe('none')
  // 阅读区视觉底：滚动容器自身透明、透出 body --bg（theme.css 单源声明面）
  expect(visual.scrollBg, 'B: 滚动容器透明（视觉底=body --bg）').toBe('rgba(0, 0, 0, 0)')
  // body 背景=--bg（R3-TH1 token v2：暖纸白 #f6f4ee——[locked-change] 同步断言值）
  expect(visual.bodyBg, 'B: body 背景=--bg').toBe('rgb(246, 244, 238)')
  expect(visual.pageBg, 'B: 页盒与阅读区两值可辨').not.toBe(visual.scrollBg)

  // —— 缺陷 C（[F-A4] ADR-0019 R1 修订：SR2-F-08 原生路线的两病根已解——
  //    拖选零反馈→selectionchange 200ms 防抖路径在场驱动自绘层；30% accent
  //    近不可见→观感灰 rgba(0,0,0,0.20) 在案。::selection 背景=transparent
  //    （视觉单通道=SelectionLayer 自绘并集层——native 逐 span 绘制在重叠
  //    行盒处 0.20×2≈0.36 叠深，CSS 层无解；修订依据=F-A4 票面 §0a 用户
  //    根治令）——
  const sel = visual.selectionBg
  expect(sel, 'C: ::selection 背景可查询（文本层 span 在场）').not.toBe('missing')
  expect(
    sel,
    `C: ::selection 背景透明（视觉通道=自绘并集层）：${sel}`
  ).toBe('rgba(0, 0, 0, 0)')

  // 真实选选（程序化 selectText——防抖路径同产 pending）→ 工具条 ≤1.5s 可见
  // （L7：交互反馈预算入验收——程序化选选含 200ms 防抖+evaluate，预算 1.5s）
  const known = win.getByText(`P1 ${PDF_KNOWN_TEXT}`).first()
  await known.selectText()
  await expect(win.getByTestId('selection-toolbar')).toBeVisible({ timeout: 1_500 })
  // [F-A4] 守卫反转：自绘并集层在场（原 ADR-0019「selection-rects 0 计数」
  // 防自绘回归守卫随 R1 修订反转——层经 portal 渲染进选区所在页盒，单层
  // 单绘不叠深；块为归并产物可见实块）
  await expect(
    win.getByTestId('selection-rects'),
    'C: 自绘选区并集层在场（ADR-0019 R1 修订/F-A4）'
  ).toBeVisible()
  const selBlock = win.getByTestId('selection-rect').first()
  await expect(selBlock).toBeVisible()
  // 自绘灰 0.20（R2-F-10 观感在案——计算样式直读，白纸合成≈#CCCCCC 由 alpha 蕴含）
  await expect(selBlock).toHaveCSS('background-color', 'rgba(0, 0, 0, 0.2)')
  await app.close()
})

/**
 * F-A1 标注矩形归并（多行装配级）：程序化跨 3 行选区 → 高亮 → 断言——
 * 渲染面（挂 B）：零宽块 0（全宽 ≥1px）+行块两两垂直不相交（相邻块
 * bottom ≤ top+0.5px 容差吞字度量测噪声）；
 * 保存面（挂 A）：listAnnotations 读库 rects——归一化域块数=行数、
 * 全宽 ≥ W_MIN(1/612)、按 y 序两两分离（bottom ≤ top+1e-9）。
 * 块数=行数断言经首跑取证锁（fixture 3 行单 span；取证输出落
 * scripts/audits/f-a1-e2e-forensic.raw.txt——禁拍脑杂数）。
 */
test('F-A1 多行划选归并：块=行、零宽 0、行块两两垂直分离（INV-A/B/C 装配级）', async () => {
  skipIfPending(F02_DEPS)
  const title = '智慧水务 e2e 多行归并文献'
  const { app } = await seedAndLaunch(title, createMultiLinePdf())
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByText(title).first().dblclick()
  await expect(win.getByText(PDF_MULTILINE_TEXT[0]).first()).toBeVisible({ timeout: 20_000 })

  // 程序化跨 3 行选区（行1首字符→行3末字符——selectionchange 防抖路径；
  // 起止在节点边界：真实划选在行边界产零宽幽灵块的同一机制）
  await win.evaluate(() => {
    const spans = Array.from(document.querySelectorAll('.textLayer span'))
    const rows = spans.filter((s) => (s.textContent ?? '').startsWith('MULTILINE'))
    if (rows.length < 2) {
      throw new Error(`多行 span 不足: ${rows.length}`)
    }
    const first = rows[0]!.firstChild!
    const last = rows[rows.length - 1]!.firstChild!
    const range = document.createRange()
    range.setStart(first, 0)
    range.setEnd(last, (last.textContent ?? '').length)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
    document.dispatchEvent(new Event('selectionchange'))
  })
  await expect(win.getByTestId('selection-toolbar')).toBeVisible()
  await win.getByRole('button', { name: '高亮' }).click()

  const rects = win.getByTestId('annotation-rect')
  await expect(rects.first()).toBeVisible()

  // —— 渲染面块几何（像素域）——
  const boxes = await rects.evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect()
      return { x: r.x, y: r.y, w: r.width, h: r.height }
    })
  )

  // —— 保存面（挂 A：listAnnotations 读库 rects——归一化域）——
  const saved = await win.evaluate(async () => {
    // IPC 响应是 Result<T>（与渲染侧 api client 同款解包）
    const res = await window.api.reader.listAnnotations({ paperId: 'e2e-seed-paper' })
    if (!res.ok) {
      throw new Error(`listAnnotations 失败: ${res.error.message}`)
    }
    return res.data.map((a) => ({ quote: a.quoteText, rects: a.rects }))
  })

  // 划选真实性锚：quote 同时含首末行文本（防只选中单行的假绿）
  expect(saved.length).toBe(1)
  expect(saved[0]!.quote).toContain(PDF_MULTILINE_TEXT[0])
  expect(saved[0]!.quote).toContain(PDF_MULTILINE_TEXT[2])

  // —— INV-C 渲染面：零宽块 0（全宽 ≥1px）——
  for (const b of boxes) {
    expect(b.w).toBeGreaterThanOrEqual(1)
  }
  // —— INV-A 渲染面：行块两两垂直不相交（像素域按 top 排序，0.5px 容差）——
  const byTop = [...boxes].sort((a, b) => a.y - b.y)
  for (let i = 1; i < byTop.length; i += 1) {
    expect(byTop[i - 1]!.y + byTop[i - 1]!.h).toBeLessThanOrEqual(byTop[i]!.y + 0.5)
  }
  // —— INV-B 渲染面：块数=行数（取证实证 2026-08-30：raw clientRects 6 块缺陷
  //    族（2 幽灵+同位重复）经归并后恰 3 块=fixture 行数——scripts/audits/
  //    f-a1-e2e-forensic.raw.txt 在档）——
  expect(boxes.length).toBe(PDF_MULTILINE_TEXT.length)

  // —— 挂 A 保存面：库内 rects 同口径（块数=行数+全宽≥W_MIN+归一化两两分离）——
  const savedRects = saved[0]!.rects
  expect(savedRects.length).toBe(PDF_MULTILINE_TEXT.length)
  const wMin = 1 / 612
  for (const r of savedRects) {
    expect(r.w).toBeGreaterThanOrEqual(wMin)
  }
  const byY = [...savedRects].sort((a, b) => a.y - b.y)
  for (let i = 1; i < byY.length; i += 1) {
    expect(byY[i - 1]!.y + byY[i - 1]!.h).toBeLessThanOrEqual(byY[i]!.y + 1e-9)
  }
  await app.close()
})

/**
 * [F-A6-d] 旋转×CropBox 组合页小票（b1 门一 N3 已知边界兑现——单测各半边
 * 独立锚[tests/unit/renderer/text-layer.test.tsx 旋转态/CropBox 态分列用例]，
 * 组合面=/Rotate 90 × /CropBox [36 36 540 720] 双病理叠加，e2e 收口锚定）：
 * - ①文本层对齐墨带：同页 textLayer span gBCR 与 canvas gBCR 包含度 ≥0.5
 *   （交集面积/span 面积——span 至少半身落渲染盒内；单 evaluate 同帧取两盒，
 *   [W1 回炉判据升级]——duckViewport rotation 通道+rawDims 真值化[TextLayer
 *   容器变换]+项几何主链[b2]的端到端对齐验证；修前形态=s1rot outside 5/8
 *   span 落盒外+s2crop 双向平移 36px，scripts/audits/f-a6-forensic-verdict.md §2/§10）；
 * - ②程序化划选（:790-800 配方）→ selection-toolbar 可见+selection-rects
 *   块数=行真值（单行 fixture=1 块）；
 * - ③关键断言：selection-rect 块 gBCR 落渲染页盒（canvas 盒=pixelBoxOf
 *   归一化同盒）内——旋转+非零原点双病理下不溢出（T1/T9+组合面的 D1 右溢
 *   主链 e2e 级闭合；2px 容差吞百分比渲染亚像素取整）。首跑红证申报：/Rotate≠0
 *   页 [data-page-box] 占位盒未随旋转交换宽高（PageColumn 段① page.view 口径）
 *   与 canvas 错配=票外既有布局缺陷（真实库全档 rotate=0 未显现），本断言以
 *   渲染页真盒为判据域，页框错配另案申报主控立案。
 */
test('F-A6-d 组合页（/Rotate 90×/CropBox 非零原点）：文本层对齐墨带+划选块=行真值且不溢页盒（T1/T9 组合面 e2e 闭合）', async () => {
  skipIfPending(F02_DEPS)
  const title = '智慧水务 e2e 组合页文献'
  const { app } = await seedAndLaunch(title, createRotatedCropPdf())
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByText(title).first().dblclick()
  await expect(win.getByText(PDF_ROTATED_CROP_TEXT).first()).toBeVisible({ timeout: 20_000 })

  // —— ① 文本层对齐墨带（同帧取两盒——包含度=交集面积/span 自身面积：span
  //    至少半身落 canvas 渲染盒内；对「整体出盒」（修前 outside 5/8 形态）与
  //    「中间态失真」（部分越缘）均有鉴别力。旋转页 span 为 90° 旋转盒，gBCR
  //    取渲染域轴对齐包围盒，面积比直接可算[W1 回炉判据升级 2026-09-04]）——
  const align = await win.evaluate(() => {
    const root = document.querySelector('[data-page-root]')
    const span = root?.querySelector('.textLayer span') ?? null
    const canvas = root?.querySelector('canvas[data-pdf-canvas]') ?? null
    if (span === null || canvas === null) return null
    const s = span.getBoundingClientRect()
    const c = canvas.getBoundingClientRect()
    const ow = Math.min(s.right, c.right) - Math.max(s.left, c.left)
    const oh = Math.min(s.bottom, c.bottom) - Math.max(s.top, c.top)
    const inter = ow > 0 && oh > 0 ? ow * oh : 0
    const spanArea = s.width * s.height
    return { ratio: spanArea > 0 ? inter / spanArea : 0, overlapW: ow, overlapH: oh }
  })
  expect(align, '组合页前提成立（span 与 canvas 均在场）').not.toBeNull()
  expect(
    align!.ratio,
    `T1/T9 组合面：文本层 span 与 canvas 墨带包含度 ≥0.5（实测 ${align!.ratio.toFixed(3)}——span 至少半身落渲染盒内）`
  ).toBeGreaterThanOrEqual(0.5)

  // —— ② 程序化划选（单行全选——selectionchange settle 路径产 pending）——
  await win.evaluate(() => {
    const span = document.querySelector('[data-page-root] .textLayer span')
    const node = span?.firstChild
    if (node === null || node === undefined) throw new Error('组合页前提不成立：文本节点缺席')
    const range = document.createRange()
    range.setStart(node, 0)
    range.setEnd(node, (node.textContent ?? '').length)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
    document.dispatchEvent(new Event('selectionchange'))
  })
  await expect(win.getByTestId('selection-toolbar')).toBeVisible({ timeout: 3_000 })
  const rects = win.getByTestId('selection-rect')
  await expect(rects.first()).toBeVisible()
  // 块数=行真值：合成单行文本经项几何链（基线分组并块）恰 1 块
  await expect(rects).toHaveCount(1)

  // —— ③ 关键断言：块 gBCR 落渲染页盒（canvas 盒=textLayer 宿主纸盒——
  //    pixelBoxOf 归一化同盒，D1 右溢判据域）内（同帧取两盒——平移不变）。
  //    参考系申报（F-A6-d 首跑红证发现）：/Rotate≠0 页上 [data-page-box] 占位
  //    盒=page.view 未旋转口径（PageColumn 段①）而 canvas/纸盒=旋转交换口径，
  //    两者错配=票外既有布局缺陷（真实库 46 页全 rotate=0 未显现；本票禁改
  //    src——已申报主控另行立案，本断言以渲染页真盒为判据域）——
  const geo = await win.evaluate(() => {
    const root = document.querySelector('[data-page-root]')
    const canvas = root?.querySelector('canvas[data-pdf-canvas]')?.getBoundingClientRect() ?? null
    const blocks = Array.from(document.querySelectorAll('[data-testid="selection-rect"]')).map((el) => {
      const r = el.getBoundingClientRect()
      return { x: r.x, y: r.y, right: r.right, bottom: r.bottom }
    })
    return { canvas: canvas === null ? null : { x: canvas.x, y: canvas.y, right: canvas.right, bottom: canvas.bottom }, blocks }
  })
  expect(geo.canvas, '渲染页盒在场（canvas）').not.toBeNull()
  expect(geo.blocks.length).toBe(1)
  for (const b of geo.blocks) {
    expect(b.x, '组合页划选块不溢渲染页盒左缘').toBeGreaterThanOrEqual(geo.canvas!.x - 2)
    expect(b.y, '组合页划选块不溢渲染页盒顶缘').toBeGreaterThanOrEqual(geo.canvas!.y - 2)
    expect(b.right, '组合页划选块不溢渲染页盒右缘（D1 右溢主链）').toBeLessThanOrEqual(geo.canvas!.right + 2)
    expect(b.bottom, '组合页划选块不溢渲染页盒底缘').toBeLessThanOrEqual(geo.canvas!.bottom + 2)
  }
  await app.close()
})

/**
 * [F-A6-d] 拖选随动小票（设计书 §5.3 可选项——票面裁量=锚；c 票门二放行条件
 * 的 e2e 面）：程序化连发 selectionchange（3 次、间隔 ~50ms、每轮选区末端 +1
 * 字符——恒定选区下 React diff 无 DOM 变更，a 票 §9-2 实证）→ selection-rects
 * 子树在 300ms 内 ≥2 次变更。rAF 对齐调度的 e2e 级验证：修前 200ms 节流
 * （5Hz 步进）下 3 次 50ms 间隔连发至多 1 次可见变更（首帧 leading），修后
 * rAF（≤16.7ms 排程）每轮各随动。时序容差声明：e2e 环境帧栅格对 50ms 间隔
 * 量化（50/60 交替在档），断言「300ms 窗内 ≥2 次」而非严格帧级（jsdom 级
 * 帧对齐已由 selection-geometry.test C1/C2 锚定）。
 * live range 诱发链不锚 e2e（票面裁量）：生产幂等无害（快/全量同族同产物=
 * INV-58 等价性吸收）+组件级 W1 it 已锚+预渲染隔离在档（c 票门一 W1 处置档）。
 */
test('F-A6-d 拖选随动：连发 selectionchange（3 次×~50ms、每轮+1 字符）→300ms 内 selection-rects 子树 ≥2 次变更（rAF 对齐 e2e 级）', async () => {
  skipIfPending(F02_DEPS)
  const title = '智慧水务 e2e 拖选随动文献'
  const { app } = await seedAndLaunch(title)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByText(title).first().dblclick()
  const known = win.getByText(PDF_KNOWN_TEXT).first()
  await expect(known).toBeVisible({ timeout: 20_000 })

  // 首帧划选在场（部分选区——后续每轮 +1 字符有增长面）
  await win.evaluate(() => {
    const span = Array.from(document.querySelectorAll('.textLayer span'))
      .find((s) => (s.textContent ?? '').includes('SMART'))
    const node = span?.firstChild
    if (node === null || node === undefined) throw new Error('拖选随动前提不成立：文本节点缺席')
    const range = document.createRange()
    range.setStart(node, 0)
    range.setEnd(node, 4)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
    document.dispatchEvent(new Event('selectionchange'))
  })
  await expect(win.getByTestId('selection-rects')).toBeVisible({ timeout: 3_000 })
  // settle 落定（首帧全量产物在场——观察面从稳态起算，末轮 settle 全量若在窗内
  // 落地只增计不改判据）
  await expect(win.getByTestId('selection-toolbar')).toBeVisible({ timeout: 3_000 })

  // 连发 3 轮：每轮选区末端 +1 字符（5→6→7→8）+dispatch selectionchange，
  // 间隔 ~50ms；MutationObserver（childList+subtree+attributes:style）记
  // selection-rects 子树变更时刻；观察窗=自首轮 dispatch 起 300ms
  const stamps = await win.evaluate(async () => {
    const layer = document.querySelector('[data-testid="selection-rects"]')
    const span = Array.from(document.querySelectorAll('.textLayer span'))
      .find((s) => (s.textContent ?? '').includes('SMART'))
    const node = span?.firstChild
    if (layer === null || node === null || node === undefined) {
      throw new Error('拖选随动前提不成立：层/文本节点缺席')
    }
    const t0 = performance.now()
    const times: number[] = []
    const mo = new MutationObserver(() => {
      times.push(performance.now() - t0)
    })
    mo.observe(layer, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] })
    const sel = window.getSelection()
    for (let i = 1; i <= 3; i += 1) {
      const range = document.createRange()
      range.setStart(node, 0)
      range.setEnd(node, 4 + i)
      sel?.removeAllRanges()
      sel?.addRange(range)
      document.dispatchEvent(new Event('selectionchange'))
      await new Promise<void>((resolve) => setTimeout(resolve, 50))
    }
    await new Promise<void>((resolve) => setTimeout(resolve, Math.max(0, 300 - (performance.now() - t0))))
    mo.disconnect()
    return times
  })
  expect(
    stamps.length,
    `rAF 对齐：3 次 50ms 间隔连发在 300ms 窗内产生 ≥2 次块变更（实测时刻=[${stamps.map((t) => t.toFixed(0)).join(', ')}]ms；修前 200ms 节流=5Hz 步进至多 1 次）`
  ).toBeGreaterThanOrEqual(2)
  await app.close()
})

/**
 * [C-2②/F-ARCH4-M1] 跨根选区防线真浏览器定性（三向对照）：
 * - E3 真鼠标跨页拖选（真用户路径+INV-02 锁）→ toast `选区跨页，不支持创建
 *   标注` 可见 + 无 selection-toolbar；
 * - E1 程序化同页跨 textLayer 边界（anchor=页 canvas offset0 / focus=textLayer
 *   文本节点 offset>0——closestPageRoot 同页根、过 SelectionLayer 边界检查；
 *   真 Chromium 语义实验，jsdom 做不到的形态）→ 静默不建锚（无 toast 且无
 *   工具条——selectionToAnchor 内 root.contains 防线拒）；
 * - E0 对照页内有效选区（同 textLayer 两文本节点）→ selection-toolbar 出现
 *   ——证明 E1 的静默是防线拒绝而非夹具失灵。
 * 定性结论（实证落 scripts/audits/c2-impl.report.md E2 变异矩阵）：
 * - 真浏览器不塌缩跨界选区（E1/E3 断言 isCollapsed=false——jsdom 才塌缩，
 *   isCollapsed 先兜在真机不可达）；
 * - 跨页拒绝由 SelectionLayer 的 closestPageRoot 边界检查承担（变异 A 单点
 *   摘除→E3 红：无 toast）；同页跨 textLayer 拒绝归属见变异 B 实测。
 */
test('F-ARCH4-M1 跨根选区防线真浏览器定性：跨页真鼠标=toast 拒绝；同页跨 textLayer 边界=静默不建锚；页内选区=工具条（三向对照）', async () => {
  skipIfPending(F02_DEPS)
  const title = '智慧水务 e2e 跨根防线文献'
  const { app } = await seedAndLaunch(title, createCrossPagePdf())
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByText(title).first().dblclick()
  await expect(win.getByText('P1A SMART WATER TEST DOC').first()).toBeVisible({ timeout: 20_000 })

  // 滚到两页交界：按页盒几何（全长真实占位——P2 文本层未渲染也可算）把
  // 页1 盒底×页2 盒顶的中点对到视口中心
  await win.evaluate(() => {
    const boxes = Array.from(document.querySelectorAll('[data-page-box]'))
    const col = document.querySelector('[data-page-column="ready"]')
    const scroller = col?.closest('.overflow-auto') as HTMLElement | null
    if (boxes.length < 2 || scroller === null) {
      throw new Error(`交界前提不成立: pageBoxes=${boxes.length} scroller=${scroller !== null}`)
    }
    const r1 = boxes[0]!.getBoundingClientRect()
    const r2 = boxes[1]!.getBoundingClientRect()
    const mid = (Math.min(r1.bottom, r2.bottom) + Math.max(r1.top, r2.top)) / 2
    scroller.scrollTop += mid - scroller.clientHeight / 2
  })
  // 条件轮询：两交界行同视口（P2 页懒渲染入窗即就绪——占位盒驱动）
  await win.waitForFunction(
    () => {
      const vis = (prefix: string): boolean => {
        const s = Array.from(document.querySelectorAll('.textLayer span')).find((el) =>
          (el.textContent ?? '').startsWith(prefix)
        )
        if (s === undefined) return false
        const r = s.getBoundingClientRect()
        return r.top > 0 && r.bottom < window.innerHeight - 4 && r.width > 5
      }
      return vis('P1B ') && vis('P2 ')
    },
    undefined,
    { timeout: 10_000, polling: 200 }
  )

  // —— E3：真鼠标跨页拖选（P1B 行→P2 行；crib f-a3-verify dragSelect 的
  //    12 步插值+16ms 步进=手势时序）→ toast 拒绝可见+无工具条 ——
  const e3 = await win.evaluate(() => {
    const spans = Array.from(document.querySelectorAll('.textLayer span'))
    const p1b = spans.find((s) => (s.textContent ?? '').startsWith('P1B '))
    const p2 = spans.find((s) => (s.textContent ?? '').startsWith('P2 '))
    if (p1b === undefined || p2 === undefined) throw new Error('E3 前提不成立（交界 span 缺失）')
    const r1 = p1b.getBoundingClientRect()
    const r2 = p2.getBoundingClientRect()
    return { x1: r1.x + r1.width * 0.3, y1: r1.y + r1.height / 2, x2: r2.x + r2.width * 0.7, y2: r2.y + r2.height / 2 }
  })
  await win.mouse.move(e3.x1, e3.y1)
  await win.mouse.down()
  for (let i = 1; i <= 12; i += 1) {
    await win.evaluate(() => new Promise<void>((resolve) => setTimeout(resolve, 16)))
    await win.mouse.move(e3.x1 + ((e3.x2 - e3.x1) * i) / 12, e3.y1 + ((e3.y2 - e3.y1) * i) / 12)
  }
  await win.mouse.up()
  // toast 可见=mouseup 评估已完成的正向锚（同次 evaluate 内 pending 已清——
  // 工具条缺席断言自此即刻有效，无需观察窗）
  await expect(win.getByText('选区跨页，不支持创建标注')).toBeVisible({ timeout: 3_000 })
  await expect(win.getByTestId('selection-toolbar')).toHaveCount(0)
  // 定性锚：真浏览器不塌缩跨界选区（jsdom 才塌缩——isCollapsed 先兜不可达）
  const e3sel = await win.evaluate(() => {
    const s = window.getSelection()
    return { collapsed: s?.isCollapsed ?? true, len: s !== null && !s.isCollapsed ? s.toString().length : 0 }
  })
  expect(e3sel.collapsed, 'E3 跨页选区在真浏览器不塌缩').toBe(false)
  expect(e3sel.len).toBeGreaterThan(0)
  await win.evaluate(() => window.getSelection()?.removeAllRanges())
  // toast 退场（info 档 3500ms 自动消失——条件轮询等隐；防 E1 的无 toast
  // 断言被 E3 残留卡片误红）
  await expect(win.getByText('选区跨页，不支持创建标注')).toBeHidden({ timeout: 8_000 })

  // —— E1：程序化同页跨 textLayer 边界（canvas anchor×textLayer focus）→
  //    静默不建锚：无 toast 且无工具条 ——
  const e1collapsed = await win.evaluate(() => {
    const root = document.querySelector('[data-page-root]')
    const canvas = root?.querySelector('canvas') ?? null
    const span = Array.from(root?.querySelectorAll('.textLayer span') ?? []).find((s) =>
      (s.textContent ?? '').startsWith('P1A ')
    )
    if (root === null || canvas === null || span === undefined || span.firstChild === null) {
      throw new Error('E1 前提不成立（页根/canvas/P1A span 缺失）')
    }
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.setBaseAndExtent(canvas, 0, span.firstChild, 3)
    document.dispatchEvent(new Event('selectionchange'))
    return sel?.isCollapsed ?? true
  })
  expect(e1collapsed, 'E1 跨 textLayer 选区在真浏览器不塌缩（jsdom 才塌缩）').toBe(false)
  // 防抖 settled 观察窗（票面处方：≥600ms 条件轮询——SELECTION_DEBOUNCE_MS
  // =200 的 trailing 评估余量；时间下限经 poll 表达，非固定 sleep）
  const t0 = await win.evaluate(() => performance.now())
  await expect
    .poll(() => win.evaluate(() => performance.now()), { timeout: 5_000 })
    .toBeGreaterThanOrEqual(t0 + 600)
  await expect(win.getByTestId('selection-toolbar')).toHaveCount(0)
  await expect(win.getByText('选区跨页，不支持创建标注')).toHaveCount(0)
  await win.evaluate(() => window.getSelection()?.removeAllRanges())

  // —— E0 对照：同 textLayer 两文本节点（P1A 行首×P1B 行内）→ 工具条出现 ——
  await win.evaluate(() => {
    const spans = Array.from(document.querySelectorAll('[data-page-root] .textLayer span'))
    const a = spans.find((s) => (s.textContent ?? '').startsWith('P1A '))
    const b = spans.find((s) => (s.textContent ?? '').startsWith('P1B '))
    if (a === undefined || b === undefined || a.firstChild === null || b.firstChild === null) {
      throw new Error('E0 前提不成立（P1A/P1B span 缺失）')
    }
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.setBaseAndExtent(a.firstChild, 0, b.firstChild, 4)
    document.dispatchEvent(new Event('selectionchange'))
  })
  await expect(win.getByTestId('selection-toolbar')).toBeVisible({ timeout: 3_000 })
  await win.evaluate(() => window.getSelection()?.removeAllRanges())
  await app.close()
})

/**
 * [C-2②] 跨页交界 fixture：页1 双行（y=100 上行 P1A=E1/E0 素材/y=72 底行
 * P1B=E3 起点）+页2 顶行（y=720=E3 终点）——两交界行几何距离 ~220px < 视口
 * 高，滚到交界即可同视口（pdf-factory 全高页相邻行距 ~1056px 做不到）。
 * 组装器 crib tests/utils/pdf-factory.ts assemblePdf（受锁不可改——本文件
 * 内联同款，UTF-8 字节口径一致；正文纯 ASCII 无需 esc）。对象布局：
 * 1=Catalog 2=Pages 3/4=Page 5/6=Contents 7=Font。
 */
function createCrossPagePdf(): Uint8Array {
  const stream1 = [
    'BT /F1 18 Tf 72 100 Td (P1A SMART WATER TEST DOC) Tj ET',
    'BT /F1 18 Tf 72 72 Td (P1B SMART WATER TEST DOC) Tj ET'
  ].join('\n')
  const stream2 = 'BT /F1 18 Tf 72 720 Td (P2 SMART WATER TEST DOC) Tj ET'
  const enc = new TextEncoder()
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 7 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 7 0 R >> >> /Contents 6 0 R >>',
    `<< /Length ${enc.encode(stream1).length} >>\nstream\n${stream1}\nendstream`,
    `<< /Length ${enc.encode(stream2).length} >>\nstream\n${stream2}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  ]
  const parts: Uint8Array[] = []
  let byteLen = 0
  const push = (s: string): void => {
    const b = enc.encode(s)
    parts.push(b)
    byteLen += b.length
  }
  push('%PDF-1.4\n')
  const offsets: number[] = []
  objects.forEach((body, i) => {
    offsets.push(byteLen)
    push(`${i + 1} 0 obj\n${body}\nendobj\n`)
  })
  const xrefStart = byteLen
  push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`)
  for (const off of offsets) {
    push(`${String(off).padStart(10, '0')} 00000 n \n`)
  }
  push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`)
  const out = new Uint8Array(byteLen)
  let cursor = 0
  for (const part of parts) {
    out.set(part, cursor)
    cursor += part.length
  }
  return out
}

/** A3 悬置写修票依赖：P7-C 面板链 + tab 骨架 + 灰点关闭确认（弃改收口点） */
const A3_DEPS = [...C_DEPS, 'SR2-TABS-01', 'SR2-TABS-02', 'SR2-TABS-03'] as const

test('A3 复活面端到端：防抖窗内关脏 tab（确认弃改）→重开同文献→笔记=基线', async () => {
  skipIfPending(A3_DEPS)
  const title = '智慧水务 e2e A3 悬置写文献'
  const { app } = await seedAndLaunch(title)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByText(title).first().dblclick()
  await expect(win.getByText(PDF_KNOWN_TEXT).first()).toBeVisible({ timeout: 20_000 })

  // 笔记面板输入（防抖窗内——fill 后立即关 tab，全程须 <1.5s）
  const aside = win.getByTestId('reader-aside')
  await aside.getByRole('tab', { name: '笔记' }).click()
  const panel = win.getByTestId('reader-notes-panel')
  await expect(panel).toBeVisible()
  await panel.getByLabel('笔记正文').fill('A3 悬置写输入')
  // pending 镜像在位（灰点信号即 dirty——关闭必经 confirm 弃改收口）
  await expect(panel.getByText('未保存')).toBeVisible()

  // confirm 自动接受先例（:227 注释删除弹层同款）
  win.on('dialog', (d) => {
    void d.accept()
  })
  // 防抖窗内关脏 tab（reader 视图——TabBar 挂 ReaderPage）：确认接受=弃改收口
  // （清 timer+内存草稿+在途 save 代际守卫）
  await win.getByRole('tablist', { name: '打开的文献' }).getByRole('tab').first().getByRole('button').click()
  await expect(win.getByRole('tablist', { name: '打开的文献' }).getByRole('tab')).toHaveCount(0)

  // 跨过整个防抖窗口：若 timer 未被弃改收口清掉，悬置写必已落 DB
  await win.waitForTimeout(2200)

  // 重开同文献：笔记=基线空串（非输入值——DB 复活面+内存合并回填面双闭）
  await win.getByRole('button', { name: '文献库' }).click()
  await win.getByText(title).first().dblclick()
  await expect(win.getByText(PDF_KNOWN_TEXT).first()).toBeVisible({ timeout: 20_000 })
  await win.getByTestId('reader-aside').getByRole('tab', { name: '笔记' }).click()
  const panel2 = win.getByTestId('reader-notes-panel')
  // 载入完成锚（entry 未落地时 textarea 恒空串——先证 load 已整版落地再断值）
  await expect(panel2.getByText('已保存')).toBeVisible({ timeout: 10_000 })
  const body2 = panel2.getByLabel('笔记正文')
  await expect(body2).toHaveValue('')
  expect(await body2.inputValue()).not.toBe('A3 悬置写输入')
  await app.close()
})
