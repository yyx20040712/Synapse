// b3: P7-F
/**
 * [SR2-F-04] reader-scroll —— 缩放重定义与收官 e2e（工单：open / strong）
 *
 * ── 行为层 ──
 * - 收官全链单测（渲染真实文本断言——历史 D1/L7：几何绿≠看得见）：
 *   INV-01 三层 overflow / 键位滚动步（PageDown=0.9 屏+防抖页码不翻）/
 *   缩放中心锚（ctrl+wheel 段自 reader-text.spec P7-A 迁移：读数 100%→110%
 *   +视口中心最近页不变）/ fit-width 列宽基准（分母=最宽页，适应后列宽贴合
 *   滚动区内宽）/ 标注原位兼容抽验（划选高亮色块落所属页盒内）/ 离屏回收
 *   （canvas 计数上限，INV-30 e2e 锚）/ 进度恢复（关 tab flush→重开滚回记忆页）。
 * - 战役收官报告：docs/reports/2026-08-28_p7f-campaign.md（四票链+成本账本）。
 *
 * ── 接口层 ──
 * - 消费面：PageColumn 段⑥缩放锚（anchoredScrollTop/columnTotalHeight）+
 *   onReady 列宽基准载荷 + ReaderPage fitWidth 重定义；ReaderToolbar 零 props
 *   改（zoom 数值语义不变）。
 *
 * ── 架构层 ──
 * - 不变量锚：INV-01（三层 overflow 计算样式）/INV-30（canvas 计数上限）/
 *   INV-31（恢复页=视口中心最近页记账）/INV-33（缩放中心保持）。
 *
 * ── 生命周期层 ──
 * - 不做：持续 fit 模式/手势 pinch/页内偏移进度。
 *
 * ── 文化层 ──
 * - 测试：本 spec（收官链）+page-column.test（锚点纯函数与组件修正，已入锁）；
 *   reader-text.spec P7-A 交互的 ctrl+wheel 段已迁移至本文件（方案切换=旧段删除）。
 * - 验收：verify 全绿+e2e 全量（翻 done 后 22 过+0 skip 推演）；用户走查
 *   （滚动阅读体验视检——战役最终验收人=用户）。
 */
import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test'
import { spawn } from 'node:child_process'
import { copyFile, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { isTicketDone } from '../../tickets/registry'
import { createMultiPagePdf, PDF_KNOWN_TEXT } from '../utils/pdf-factory'

/** 双条件守卫（依赖∪自身——LG-05/corpus-export 先例）：全链用例随
 * F-01~03 就绪与 F-04 实现展开 */
const DEPS = ['SR2-F-01', 'SR2-F-02', 'SR2-F-03', 'SR2-F-04']
const pending = DEPS.filter((d) => !isTicketDone(d))

/** 拉起子进程跑 seed-paper.mjs；退出码非 0 即拒绝（错误细节走 stdio 继承） */
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

function launch(userData: string): Promise<ElectronApplication> {
  return electron.launch({
    args: ['out/main/index.js'],
    env: { ...process.env, SYNAPSE_USER_DATA: userData } as Record<string, string>
  })
}

/**
 * 种子落库（better-sqlite3 双 ABI 处理，与 reader-text.spec 同配方——第 2 次
 * 重复保持重复，Rule of Three）：备份 electron 绑定→换 node 绑定→子进程落库
 * →finally 还原（Windows 文件锁：进程内 import 会让还原 EBUSY 毒化 launch）。
 */
async function seedPaperRow(userData: string, fileRef: string, sha: string, title: string, id: string): Promise<void> {
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

test.describe('reader-scroll —— F-04 收官', () => {
  test.skip(pending.length > 0, `延期：依赖或自身工单未完成 [${pending.join(', ')}]`)

  test('收官全链：INV-01 三层/键位滚动步/缩放中心锚（ctrl+wheel 段迁移）/fit-width 列宽基准/标注原位抽验/离屏回收/进度恢复', async () => {
    const userData = await mkdtemp(join(tmpdir(), 'synapse-f04-'))
    // 第一跳：让应用自己完成建库迁移（不 import src 内部模块——Playwright 不认 ?raw）
    const seedApp = await launch(userData)
    await (await seedApp.firstWindow()).waitForTimeout(500)
    await seedApp.close()

    // 6 页受管文件（离屏回收需页数>渲染窗口+缓冲；每页单行 P<n> KNOWN——
    // ASCII 单 run 可被 getByText 单节点命中，批 1 同口径）
    const bytes = createMultiPagePdf(6, PDF_KNOWN_TEXT)
    const sha = createHash('sha256').update(bytes).digest('hex')
    const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
    const abs = join(userData, 'files', ...fileRef.split('/'))
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, bytes)
    await seedPaperRow(userData, fileRef, sha, '智慧水务 e2e F04 收官文献', 'e2e-seed-f04')

    const app = await launch(userData)
    const win = await app.firstWindow()
    await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
    await win.getByText('智慧水务 e2e F04 收官文献').first().dblclick()
    await expect(win.getByText(`P1 ${PDF_KNOWN_TEXT}`).first()).toBeVisible({ timeout: 20_000 })

    // ── 几何读数（批 1/批 3 同口径：页列向上找 overflow-auto 容器）──
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
    /** 视口中心最近页盒（nearest 语义：间隙归属取最近盒中心） */
    const centerPageBox = (): Promise<number> =>
      win.evaluate(() => {
        const scroller = document.querySelector('[data-page-column="ready"]')?.closest('.overflow-auto') as HTMLElement | null
        if (scroller === null) return -1
        const mid = scroller.getBoundingClientRect().top + scroller.clientHeight / 2
        let best = -1
        let bestDist = Infinity
        for (const b of Array.from(scroller.querySelectorAll<HTMLElement>('[data-page-box]'))) {
          const r = b.getBoundingClientRect()
          const d = Math.abs(mid - (r.top + r.bottom) / 2)
          if (d < bestDist) {
            bestDist = d
            best = Number(b.dataset.pageBox)
          }
        }
        return best
      })
    /** 把指定页盒内文本行（距盒顶约 80px）滚到视口中心——缩放锚断言最稳的几何位 */
    const scrollPageLineToCenter = (pageNo: number): Promise<void> =>
      win.evaluate((no) => {
        const scroller = document.querySelector('[data-page-column="ready"]')?.closest('.overflow-auto') as HTMLElement | null
        const box = scroller?.querySelector<HTMLElement>(`[data-page-box="${no}"]`) ?? null
        if (scroller !== null && box !== null) {
          const boxTop = box.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop
          scroller.scrollTop = Math.max(0, boxTop + 80 - scroller.clientHeight / 2)
        }
      }, pageNo)

    // ── 一、INV-01「文档永不滚」终审：html/body/#root 三层 overflow 计算样式全
    // hidden（锁声明形状——几何断言形状不可用，取证注记见 reader-text.spec 批 1）──
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

    // ── 二、键位滚动步（F-03 语义回归）：PageDown → scrollTop 前进 ≈0.9 视口高，
    // 不越一屏；页码回写防抖——窗内页指示不翻 ──
    const top0 = await scrollTop()
    expect(top0).toBeLessThan(50)
    const vh = await clientH()
    expect(vh).toBeGreaterThan(200)
    await win.keyboard.press('PageDown')
    await expect.poll(scrollTop, { timeout: 3_000 }).toBeGreaterThan(top0 + vh * 0.8)
    const stepped = await scrollTop()
    expect(stepped, '滚动步不越一屏（步长=0.9 屏，非整页跳）').toBeLessThan(top0 + vh)
    await expect(win.getByText('当前第 1 页')).toBeVisible()

    // ── 三、缩放中心锚 + ctrl+wheel 段（自 reader-text.spec P7-A 迁移）──
    // 定位：第 3 页文本行置于视口中心
    await scrollPageLineToCenter(3)
    await expect(win.getByText(`P3 ${PDF_KNOWN_TEXT}`).first()).toBeVisible({ timeout: 10_000 })
    const anchorPage = await centerPageBox()
    expect(anchorPage).toBe(3)
    const beforeZoomTop = await scrollTop()
    // ctrl+滚轮缩放全链（ReaderShortcuts→store→ReaderToolbar；data-testid 锚定
    // ——工具栏另有静态「100%」复位按钮，文本类选择器会严格模式双命中）
    const zoomLabel = win.getByTestId('zoom-label')
    await expect(zoomLabel).toHaveText('100%')
    await win.keyboard.down('Control')
    await win.mouse.wheel(0, -120)
    await win.keyboard.up('Control')
    await expect(zoomLabel).toHaveText('110%')
    // INV-33：总高变化后视口中心最近页不变（中心内容不动）+真实文本仍在视口
    await expect.poll(centerPageBox, { timeout: 5_000 }).toBe(anchorPage)
    await expect(win.getByText(`P3 ${PDF_KNOWN_TEXT}`).first()).toBeVisible({ timeout: 10_000 })
    const afterZoomTop = await scrollTop()
    expect(afterZoomTop, '放大后总高更长——中心比保持下 scrollTop 前进（程序修正发生了）').toBeGreaterThan(beforeZoomTop)

    // ── 四、fit-width 列宽基准（F-04 重定义：分母=最宽页）──
    await win.getByRole('button', { name: '适应宽度' }).click()
    const fitDelta = await win.evaluate(() => {
      const col = document.querySelector('[data-page-column="ready"]') as HTMLElement | null
      const scroller = col?.closest('.overflow-auto') as HTMLElement | null
      return col !== null && scroller !== null ? col.getBoundingClientRect().width - (scroller.clientWidth - 24) : -9999
    })
    expect(Math.abs(fitDelta), '适应后列宽贴合滚动区内宽（±2px 容差）').toBeLessThanOrEqual(2)
    // fit 是第二次 zoom 变化——中心锚仍保持（缩放链一致性）
    await expect.poll(centerPageBox, { timeout: 5_000 }).toBe(anchorPage)
    await expect(win.getByText(`P3 ${PDF_KNOWN_TEXT}`).first()).toBeVisible({ timeout: 10_000 })

    // ── 五、标注原位兼容抽验：fit 后当前页划选高亮——色块渲染在所属页盒内 ──
    const known3 = win.getByText(`P3 ${PDF_KNOWN_TEXT}`).first()
    await known3.selectText()
    await expect(win.getByTestId('selection-toolbar')).toBeVisible()
    await win.getByRole('button', { name: '高亮' }).click()
    const rect = win.getByTestId('annotation-rect')
    await expect(rect.first()).toBeVisible()
    await expect(rect).toHaveCount(1)
    const inOwnerPage = await win.evaluate((no) => {
      const r = document.querySelector('[data-testid="annotation-rect"]')?.getBoundingClientRect()
      const b = document.querySelector(`[data-page-box="${no}"]`)?.getBoundingClientRect()
      return r !== undefined && b !== undefined
        ? r.top >= b.top - 2 && r.bottom <= b.bottom + 2 && r.left >= b.left - 2 && r.right <= b.right + 2
        : false
    }, anchorPage)
    expect(inOwnerPage, '标注色块落在所属页盒内（页列世界原位）').toBe(true)

    // ── 六、离屏回收（INV-30 e2e 计数上限）：滚到底——远端页 canvas 必卸载 ──
    await win.evaluate(() => {
      const scroller = document.querySelector('[data-page-column="ready"]')?.closest('.overflow-auto') as HTMLElement | null
      if (scroller !== null) scroller.scrollTop = scroller.scrollHeight
    })
    await expect(win.getByText(`P6 ${PDF_KNOWN_TEXT}`).first()).toBeVisible({ timeout: 10_000 })
    const canvasCount = (): Promise<number> =>
      win.evaluate(() => document.querySelectorAll('canvas[data-pdf-canvas]').length)
    // 渲染窗口=可见±1、回收窗=±2：底部稳态 ≤5（总 6 页——恒 6 即未回收，红）
    await expect.poll(canvasCount, { timeout: 5_000 }).toBeLessThanOrEqual(5)
    expect(await canvasCount()).toBeGreaterThanOrEqual(1)

    // ── 七、进度恢复（收官链尾）：底部中心页记账→关 tab flush→重开滚回记忆页 ──
    const lastPage = await centerPageBox()
    expect(lastPage).toBeGreaterThanOrEqual(5)
    // 高亮保存已置 dirty：关 tab 走 window.confirm 二次确认——自动接受
    win.on('dialog', (d) => {
      void d.accept()
    })
    const tabBar = win.getByRole('tablist', { name: '打开的文献' })
    await tabBar.getByRole('tab').first().getByRole('button').click()
    await expect(tabBar.getByRole('tab')).toHaveCount(0)
    await win.getByRole('button', { name: '文献库' }).click()
    await win.getByText('智慧水务 e2e F04 收官文献').first().dblclick()
    await expect(win.getByText(`P${lastPage} ${PDF_KNOWN_TEXT}`).first()).toBeVisible({ timeout: 20_000 })
    await expect(win.getByText(`当前第 ${lastPage} 页`)).toBeVisible()
    await expect.poll(scrollTop, { timeout: 3_000 }).toBeGreaterThan(100)
    await app.close()
  })
})
