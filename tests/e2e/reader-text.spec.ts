import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test'
import { spawn } from 'node:child_process'
import { copyFile, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { isTicketDone } from '../../tickets/registry'
import { createTinyPdf, PDF_KNOWN_TEXT } from '../utils/pdf-factory'

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
async function seedPaperRow(userData: string, fileRef: string, sha: string, title: string): Promise<void> {
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
      SEED_TITLE: title
    } as NodeJS.ProcessEnv)
  } finally {
    await writeFile(releaseBinding, electronBinding)
  }
}

test('打开文献后页面渲染出已知文本', async () => {
  skipIfPending(DEPS)
  const userData = await mkdtemp(join(tmpdir(), 'synapse-reader-'))

  // 第一跳：让应用自己完成建库迁移（不 import src 内部模块——Playwright 不认 ?raw）
  const seedApp = await launch(userData)
  await (await seedApp.firstWindow()).waitForTimeout(500)
  await seedApp.close()

  // 受管文件（绕过 UI 导入——导入流程由 smoke/单测覆盖）
  const bytes = createTinyPdf(`智慧水务 e2e 测试文献 ${PDF_KNOWN_TEXT}`)
  const sha = createHash('sha256').update(bytes).digest('hex')
  const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
  const abs = join(userData, 'files', ...fileRef.split('/'))
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, bytes)
  await seedPaperRow(userData, fileRef, sha, '智慧水务 e2e 测试文献')

  // 第二跳：真实断言
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })

  await win.getByText('智慧水务 e2e 测试文献').first().dblclick()
  await expect(win.getByText(PDF_KNOWN_TEXT).first()).toBeVisible({ timeout: 20_000 })
  await app.close()
})

test('划选高亮后重开仍在原位；批注编辑与删除可用', async () => {
  skipIfPending(ANNOTATION_DEPS)
  const userData = await mkdtemp(join(tmpdir(), 'synapse-annot-'))

  // 第一跳：让应用自己完成建库迁移（不 import src 内部模块——Playwright 不认 ?raw）
  const seedApp = await launch(userData)
  await (await seedApp.firstWindow()).waitForTimeout(500)
  await seedApp.close()

  // 受管文件 + 种子落库（与上一测同一配方；标题带"标注链"区分）
  const title = '智慧水务 e2e 标注链文献'
  const bytes = createTinyPdf(`${title} ${PDF_KNOWN_TEXT}`)
  const sha = createHash('sha256').update(bytes).digest('hex')
  const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
  const abs = join(userData, 'files', ...fileRef.split('/'))
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, bytes)
  await seedPaperRow(userData, fileRef, sha, title)

  // 第一程：划选 → 工具条 → 高亮 → 色块出现并记取位置
  const app = await launch(userData)
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

  // 点击色块 → 批注编辑弹层 → 删除（confirm 自动接受）→ 色块消失
  win2.on('dialog', (d) => {
    void d.accept()
  })
  await rect2.first().click()
  const editor = win2.getByTestId('annotation-editor')
  await expect(editor).toBeVisible()
  await editor.getByRole('button', { name: '删除' }).click()
  await expect(win2.getByTestId('annotation-rect')).toHaveCount(0)
  await app2.close()
})
