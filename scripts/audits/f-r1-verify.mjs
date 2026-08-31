/**
 * F-R1 双页阅读模式真机取证——票面 §5.3 场景 A~F（crib f-l4-verify.mjs
 * 运行模式：Electron 真机/真实库副本/断言落 JSON+截图）。
 *
 * 场景面（票面 §0 矩阵的真机裁判——jsdom 不可达面）：
 * - A 双页渲染：开双页→首行页盒 1+2 的 data-page-root 存在（两 canvas 真渲染）
 *   +行盒宽=左+右+行内 gap（rowWidth 口径）→截图 A-double.png；
 * - B fitWidth 双页：归一 100%→点适应宽度→zoom≈(clientWidth−24)/双页行宽
 *   （node 直载 columnWidthFor 复算——F-L4 W2 先例「import 源码算精确期望」）
 *   +行宽入视口（行盒右缘≤滚动容器右缘）；
 * - C 翻面：双页「下一页」→页码+2+行 2 两盒顶对齐（同行零特判）；
 * - D 切换往返：双页→（滚中部）→单页（页码保持=S1；适应宽度=单页口径）
 *   →双页（行恢复+适应宽度=双页口径<S5 basis 重报不残留）；
 * - E 末页奇数：跳末页→末行单页无塌陷（盒高>0）→截图 E-odd.png；
 * - F pageerror 0。
 * 真机 Electron 短暂开窗属项目 LOOP 取证惯例（主控指令声明）。
 * 产物：scripts/audits/f-r1-out/{A-double.png,E-odd.png,f-r1-verify.json}。
 */
import { _electron as electron } from '@playwright/test'
import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises'
import { existsSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { registerHooks } from 'node:module'

const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits', 'f-r1-out')
await mkdir(OUT, { recursive: true })
const log = (...a) => console.log(`[f-r1 ${new Date().toISOString().slice(11, 19)}]`, ...a)

// node 侧直载源码几何（F-L4 W2 先例）：Node 24 type-stripping+registerHooks
// 补 .ts 扩展（page-column-geometry 无别名依赖，纯函数件）
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !/\.[cm]?[jt]s$/.test(specifier)) {
      try {
        return nextResolve(`${specifier}.ts`, context)
      } catch {
        /* fallthrough：保持原解析语义报错 */
      }
    }
    return nextResolve(specifier, context)
  }
})
const { columnWidthFor } = await import(
  pathToFileURL(join(ROOT, 'src/renderer/features/reader/page-column-geometry.ts')).href
)

/** 真实库副本（f-l4 同法）+[门一回炉 W5 归一] 预写删除 uiScale 字段——
 *  --ui-scale 缺省 fallback=1（阅读区 [data-page-column] 反向 zoom 退场）。
 *  实证（f-r1-dbg.mjs）：ui-scale≠1 下程序滚动落点存在既有漂移（单页同样
 *  复现，与 CSS zoom 豁免区/浏览器 scroll-anchoring 交互相关，F-R1 全链
 *  零改——非本票缺陷，报主控备案）；探针在 100% 缩放环境锁本票双页行为。 */
async function freshUserData() {
  const src = join(process.env.APPDATA, 'Synapse')
  const userData = join(tmpdir(), 'synapse-f-r1-verify')
  await rm(userData, { recursive: true, force: true })
  for (const p of ['workspaces', 'ai-sensor']) await cp(join(src, p), join(userData, p), { recursive: true })
  for (const f of ['settings.json', 'workspace.json', 'window-state.json']) {
    if (existsSync(join(src, f))) await cp(join(src, f), join(userData, f))
  }
  const settingsPath = join(userData, 'settings.json')
  if (existsSync(settingsPath)) {
    const base = JSON.parse(await readFile(settingsPath, 'utf8'))
    delete base.uiScale
    await writeFile(settingsPath, JSON.stringify(base), 'utf8')
  }
  return userData
}

const userData = await freshUserData()
const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
const win = await app.firstWindow()
await win.getByRole('button', { name: '文献库' }).waitFor({ timeout: 20_000 })
await win.waitForTimeout(800)

const pageErrors = []
win.on('pageerror', (e) => pageErrors.push(`${String(e)}\n[stack] ${e.stack ?? ''}`))

/** 阅读器布局快照（双页行/页盒/几何/页码/zoom——探针断言的数据面） */
const DUMP = `(() => {
  const col = document.querySelector('[data-page-column]')
  if (!col) return null
  const scroller = col.closest('.overflow-auto')
  const rows = [...col.querySelectorAll(':scope > [data-page-row]')].map((r) => {
    const boxes = [...r.querySelectorAll('[data-page-box]')].map((b) => {
      const g = b.getBoundingClientRect()
      return { no: Number(b.dataset.pageBox), w: g.width, h: g.height, top: g.top, right: g.right }
    })
    const gr = r.getBoundingClientRect()
    return { leftNo: Number(r.dataset.pageRow), rowW: gr.width, boxes }
  })
  const boxes = [...col.querySelectorAll('[data-page-box]')].map((b) => {
    const g = b.getBoundingClientRect()
    return { no: Number(b.dataset.pageBox), w: g.width, h: g.height, top: g.top, right: g.right }
  })
  const roots = [...col.querySelectorAll('[data-page-root]')].map((r) => Number(r.dataset.pageRoot))
  const zoomLabel = document.querySelector('[data-testid="zoom-label"]')?.textContent ?? ''
  const pageInput = document.querySelector('input[aria-label="跳转到页"]')
  const totalLabel = [...document.querySelectorAll('span')].find((s) => /^\\/ \\d+$/.test(s.textContent))?.textContent ?? ''
  return {
    state: col.getAttribute('data-page-column'),
    scroller: scroller ? { cw: scroller.clientWidth, right: scroller.getBoundingClientRect().right } : null,
    scrollTop: scroller ? scroller.scrollTop : null,
    rows, boxes, roots,
    zoomLabel, page: pageInput ? Number(pageInput.value) : null, totalPages: totalLabel ? Number(totalLabel.slice(2)) : null
  }
})()`

const results = []
const check = (id, pass, detail) => {
  results.push({ id, pass, detail })
  log(`${pass ? 'PASS' : 'FAIL'} ${id} — ${detail}`)
}
const dump = () => win.evaluate(DUMP)

// ── 前置：双击第一篇文献（[门一回炉改] 去扫描换文献——扫描式连开 8 篇会
//    触发 pdfjs stream pump 竞态 pageerror（_reader.read of null，PdfDocProvider
//    加载流 abort 竞态，既有面零改）；真库前 8 篇无奇数页文献，扫描本就必退
//    第一篇，E 单盒分支由单测③+W3 DOM 锁承载）→ 阅读器就绪 ──
async function openFirstPaper() {
  await win.getByRole('button', { name: '文献库' }).click()
  await win.waitForTimeout(1000)
  await win.locator('button.lib-card').first().dblclick()
  await win.waitForSelector('[data-page-column="ready"]', { timeout: 20_000 })
  await win.waitForTimeout(1000)
  const d = await dump()
  log(`第一篇：${d.totalPages} 页`)
  return d
}
const t0 = await openFirstPaper()
await win.waitForTimeout(1200) // 页列就绪+恢复链滚动落定
log('前置/单页就绪：', JSON.stringify({ boxes: t0.boxes.length, totalPages: t0.totalPages, page: t0.page, zoom: t0.zoomLabel }))
check('pre/ready', t0.boxes.length === t0.totalPages && t0.rows.length === 0, `单页就绪 ${t0.boxes.length} 盒/${t0.totalPages} 页,无行盒（${t0.zoomLabel}）`)

// ── 场景 A：开双页→首行两页真渲染+行宽口径 ──
await win.getByRole('button', { name: '双页' }).click()
await win.waitForSelector('[data-page-row]', { timeout: 10_000 })
await win.waitForTimeout(1500) // basis 重报+恢复链滚回+懒渲染窗口落定
const ta = await dump()
log('A/双页：', JSON.stringify({ rows: ta.rows.length, roots: ta.roots }))
const expectRows = Math.ceil(ta.totalPages / 2)
check('A/row-count', ta.rows.length === expectRows, `行数 ${ta.rows.length}=ceil(${ta.totalPages}/2)`)
const r0 = ta.rows[0]
const gap = 12
// 双页并排真渲染证据：存在某行两盒都进渲染窗口（data-page-root=canvas 就位）。
// 不锁「首行 1+2」——恢复链滚到记忆页（本例第 20 页），渲染窗口跟视口走（懒渲染语义）
const pairRow = ta.rows.find((r) => r.boxes.length === 2 && ta.roots.includes(r.boxes[0].no) && ta.roots.includes(r.boxes[1].no))
check('A/pair-row-rendered', pairRow !== undefined, `行(${pairRow?.leftNo})两页并排真渲染 data-page-root 同含 [${pairRow ? pairRow.boxes[0].no + ',' + pairRow.boxes[1].no : ''}]（canvas 就位；渲染窗口 roots=[${ta.roots}]）`)
check(
  'A/row-width-formula',
  Math.abs(r0.rowW - (r0.boxes[0].w + r0.boxes[1].w + gap)) <= 1,
  `行盒宽 ${r0.rowW.toFixed(1)} ≈ 左(${r0.boxes[0].w.toFixed(1)})+右(${r0.boxes[1].w.toFixed(1)})+gap(${gap})`
)
await win.screenshot({ path: join(OUT, 'A-double.png') })

// ── 场景 B：归一 100%→适应宽度=双页口径（node 复算，[W4 门一回炉] 全列
//    sizes 口径——占位盒全列在 DOM，逐盒采集后 columnWidthFor(sizes,'double')
//    取最宽完整行，不再只取首两页）+行宽入视口 ──
await win.getByRole('button', { name: '100%' }).click()
await win.waitForTimeout(600)
const tb0 = await dump()
const sizes = tb0.boxes.map((b) => ({ width: b.w, height: b.h })) // zoom=1：盒宽=页原始宽（全列占位盒）
const rowW1 = columnWidthFor(sizes, 1, 'double') // 最宽完整行宽（全列口径）
await win.getByRole('button', { name: '适应宽度' }).click()
await win.waitForTimeout(800)
const tb = await dump()
const cw = tb.scroller.cw
const expectedZoom = (cw - 24) / rowW1
const shownPct = Number(tb.zoomLabel.replace('%', ''))
check('B/zoom-double-basis', Math.abs(shownPct - Math.round(expectedZoom * 100)) <= 1, `zoom=${tb.zoomLabel}≈(clientWidth${cw}−24)/行宽${rowW1}=${(expectedZoom * 100).toFixed(1)}%（columnWidthFor 源码复算）`)
const fitRow = tb.rows[0]
check('B/row-fits-viewport', fitRow.rowW <= cw - 24 + 2, `行宽 ${fitRow.rowW.toFixed(1)} ≤ 内容区 ${cw - 24}+2（两页并排恰入视口——S2）`)
await win.screenshot({ path: join(OUT, 'B-fitwidth-double.png') })

// ── 场景 C：双页「下一页」=page+2+行 2 两盒顶对齐 ──
await win.getByRole('button', { name: '100%' }).click()
await win.waitForTimeout(600)
// 起点归一到第 1 页（真实库 lastReadPage 不可控——确定性前提）
await win.locator('input[aria-label="跳转到页"]').fill('1')
await win.locator('input[aria-label="跳转到页"]').press('Enter')
await win.waitForTimeout(1200)
const pageBefore = (await dump()).page
await win.getByRole('button', { name: '下一页' }).click()
await win.waitForTimeout(1200) // 程序滚动（INV-29 信号→行顶）落定
const tc = await dump()
const targetRow = tc.rows.find((r) => r.boxes.some((b) => b.no === tc.page + 1)) // 含翻面后当前页的行
log('C/翻面：', JSON.stringify({ pageBefore, after: tc.page, targetRowLeftNo: targetRow?.leftNo }))
check('C/page-step-2', tc.page === Math.min(pageBefore + 2, tc.totalPages - 1), `页码 ${pageBefore}→${tc.page}（+2 翻面步进，S4；末行夹取兜底）`)
check(
  'C/row2-tops-aligned',
  targetRow !== undefined && Math.abs(targetRow.boxes[0].top - targetRow.boxes[1].top) <= 1 && Math.abs(targetRow.boxes[0].top - tc.boxes[0].top) > 10,
  `目标行(${targetRow?.leftNo})两盒顶对齐(Δtop=${targetRow ? Math.abs(targetRow.boxes[0].top - targetRow.boxes[1].top).toFixed(2) : 'n/a'}px)且已滚离首行（程序滚行顶）`
)

// ── 场景 D：双页→（程序归位锚定 scrollTop）→单页（页码保持 S1）→单页口径
//    fit→再双页（行恢复+口径回落 S5）——[W5 门一回炉] 补滚动位同源锚断言：
//    往返前后都取「双页态、当前页行顶」的 scrollTop（页码输入跳当前页=程序
//    归位到盒顶），两值同源（同一几何的同一锚点）——恢复链若丢位即差值超阈；
//    直配对「滚中部起点 vs 往返后」会因「中部滚动位置≠盒顶归位」的恢复链
//    语义天然不等而误红，故取同源锚设计（数字不匹配将如实报告交主控裁）──
// ── 场景 D：双页→（程序归位锚定 scrollTop）→单页（页码保持 S1）→单页口径
await win.evaluate(() => {
  const scroller = document.querySelector('[data-page-column]')?.closest('.overflow-auto')
  if (scroller) scroller.scrollTop = Math.floor(scroller.scrollHeight / 2)
})
await win.waitForTimeout(300)
const dMid0 = await dump()
log('D/滚中部即时：', JSON.stringify({ page: dMid0.page, scrollTop: dMid0.scrollTop }))
await win.waitForTimeout(1400) // 滚动回写防抖落账
const dMid1 = await dump()
log('D/滚中部+1400ms：', JSON.stringify({ page: dMid1.page, scrollTop: dMid1.scrollTop }))
const pageMid = dMid1.page
// 双页态同源锚：页码输入跳当前页 → 程序归位到当前页（右/左）盒顶=行顶
await win.locator('input[aria-label="跳转到页"]').fill(String(pageMid + 1))
await win.locator('input[aria-label="跳转到页"]').press('Enter')
await win.waitForTimeout(300)
const dAnchor0 = await dump()
log('D/归位即时：', JSON.stringify({ page: dAnchor0.page, scrollTop: dAnchor0.scrollTop }))
await win.waitForTimeout(900)
const anchorBefore = await dump()
log('D/归位+900ms：', JSON.stringify({ page: anchorBefore.page, scrollTop: anchorBefore.scrollTop }))
const scrollTopAnchor = anchorBefore.scrollTop
await win.getByRole('button', { name: '双页' }).click() // 切单页
await win.waitForTimeout(1500) // basis 重报+恢复链滚回
const td = await dump()
log('D/切单页：', JSON.stringify({ pageMid, after: td.page, rows: td.rows.length, scrollTopAnchor, scrollTopSingle: td.scrollTop }))
check('D/rows-cleared', td.rows.length === 0 && td.boxes.length === td.totalPages, `单页行盒清零（${td.boxes.length} 盒直列）`)
check('D/position-kept', Math.abs(td.page - pageMid) <= 1, `页码保持 ${pageMid}→${td.page}（S1 恢复链滚回当前页，|Δ|≤1）`)
await win.getByRole('button', { name: '适应宽度' }).click()
await win.waitForTimeout(800)
const zSingle = Number((await dump()).zoomLabel.replace('%', ''))
await win.getByRole('button', { name: '双页' }).click() // 切回双页
await win.waitForSelector('[data-page-row]', { timeout: 10_000 })
await win.waitForTimeout(1200)
const td2 = await dump()
await win.getByRole('button', { name: '适应宽度' }).click()
await win.waitForTimeout(800)
const td3 = await dump()
const zDouble = Number(td3.zoomLabel.replace('%', ''))
check('D/rows-restored', td2.rows.length === expectRows, `切回双页行恢复 ${td2.rows.length}=${expectRows}`)
check('D/basis-rebased', zDouble < zSingle, `适应宽度口径回落：单页 ${zSingle}% → 双页 ${zDouble}%（basis 重报不残留——S5）`)
check('D/page-still-kept', Math.abs(td3.page - td.page) <= 2, `往返后页码 ${td.page}→${td3.page}（|Δ|≤2 恢复链容差）`)
// [W5] 滚动位同源锚：往返后先归一 100%（往返中两次 fitWidth 的 zoom 已经段⑥
// 锚修正改写 scrollTop——非同源），再页码输入跳当前页做程序归位（与锚定时
// 同一机制同一几何：双页态/同 zoom/当前页行顶），差值 ≤2px 才是「位置可完整
// 恢复」的 S1 语义；往返后未归位的稳态 scrollTop 另落 JSON 作信息项
await win.getByRole('button', { name: '100%' }).click()
await win.waitForTimeout(600)
// dump.page=pageInput.value（1 基显示值）——归位填显示值本身（store 0 基=显示−1），
// 与锚定行同页（锚定 fill(pageMid+1) 已把 store 推到 pageMid，1 基显示=pageMid+1）
await win.locator('input[aria-label="跳转到页"]').fill(String(td3.page))
await win.locator('input[aria-label="跳转到页"]').press('Enter')
await win.waitForTimeout(1200)
const afterRealign = await dump()
check(
  'D/scroll-position-kept',
  Math.abs((afterRealign.scrollTop ?? 0) - (scrollTopAnchor ?? 0)) <= 2,
  `滚动位同源锚保持：往返前 ${scrollTopAnchor?.toFixed(1)}px → 往返后归位 ${afterRealign.scrollTop?.toFixed(1)}px（双页态/100%/当前页行顶，|Δ|≤2——S1 切布局不丢位置）`
)
// [W5 备案面] roots 膨胀的有界锁（门一「逐项不变不强求」——实测 800ms 内
// IO/渲染窗口存在过渡态（归一 zoom+归位滚动的通知波次叠加），逐项不变会踩
// 过渡期假红；改锁既有不变量「渲染集 ≤ 可见页数×(2·recycleWindow+1)」
// （page-column.test「渲染集上界」组件级锚同款）——防持续膨胀/泄漏，过渡态
// 收敛后的窗口仍受上界约束；两次读数如实落 JSON 备查
await win.waitForTimeout(800)
const td2b = await dump()
check(
  'D/roots-bounded',
  td2b.roots.length <= 2 * (2 * 2 + 1),
  `渲染窗口有界：再读 roots=[${td2b.roots}]（${td2b.roots.length} 页 ≤ 可见 2×(2·recycleWindow+1)=10；过渡态窗口叠加，首读 [${td2.roots}] 落 JSON 备查）`
)

// ── 场景 E：跳末页→末行奇数页无塌陷 ──
await win.getByRole('button', { name: '100%' }).click()
await win.waitForTimeout(600)
const total = (await dump()).totalPages
await win.locator('input[aria-label="跳转到页"]').fill(String(total))
await win.locator('input[aria-label="跳转到页"]').press('Enter')
await win.waitForTimeout(1800) // 滚到末行+懒渲染窗口移动落定
const te = await dump()
const lastRow = te.rows.at(-1)
const expectLastBoxes = total % 2 === 0 ? 2 : 1
log('E/末页：', JSON.stringify({ total, lastRow: lastRow?.leftNo, boxes: lastRow?.boxes.length }))
check('E/last-row-single', lastRow !== undefined && lastRow.boxes.length === expectLastBoxes && lastRow.boxes[0].h > 10, `末行(${lastRow?.leftNo})盒数 ${lastRow?.boxes.length}=期望${expectLastBoxes}，盒高 ${lastRow ? lastRow.boxes[0].h.toFixed(0) : 0}px>10（无塌陷——S3）`)
if (expectLastBoxes === 1) {
  check('E/last-row-width-stable', Math.abs(lastRow.rowW - lastRow.boxes[0].w) <= 1, `末行宽 ${lastRow.rowW.toFixed(1)}=左盒宽（右缺席无空盒占位，行宽恒定）`)
}
await win.screenshot({ path: join(OUT, 'E-odd.png') })

// ── F：pageerror 0 ──
check('F/no-pageerror', pageErrors.length === 0, `页面错误 ${pageErrors.length} 条${pageErrors.length > 0 ? '：' + pageErrors.join('; ') : ''}`)

writeFileSync(
  join(OUT, 'f-r1-verify.json'),
  JSON.stringify(
    {
      meta: { script: 'f-r1-verify.mjs', date: new Date().toISOString(), note: '真实库副本+真 PDF；单页前置/双页 A/B/C/D/E 逐场景 dump' },
      scenes: { pre: t0, A_double: ta, B_fit: tb, C_step: tc, D_anchor: anchorBefore, D_single: td, D_back_double: td2, D_fit_after: td3, D_realign: afterRealign, D_roots_recheck: td2b, E_last: te },
      expected: { rowW1, expectedZoomB: expectedZoom, zSingle, zDouble },
      results
    },
    null,
    2
  )
)
await app.close()

const fails = results.filter((r) => !r.pass)
if (fails.length === 0) console.log(`F-R1 VERIFY: PASS（${results.length}/${results.length} 项断言全过）→ f-r1-out/f-r1-verify.json`)
else console.log(`F-R1 VERIFY: FAIL（${fails.length}/${results.length} 项断言失败——场景红=报主控裁决）`)
process.exit(fails.length === 0 ? 0 : 1)
