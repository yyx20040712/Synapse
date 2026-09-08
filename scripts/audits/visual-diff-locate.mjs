/**
 * visual-diff-locate——像素差分带定位器（F-TOOL-01，methodology §4.1 ⑤h 三件套①固化）。
 *
 * §6.2 三件套使用语境：本工具=①像素差分带对位（变化带逐带归属预期组件区，
 * 意外带=回炉信号）；输出（行带 y/x 像素范围）供②差分区 crop 目检与③DOM
 * 计算样式断言取坐标——②即本工具 --crop 模式，③由调用方另跑探针。
 *
 * 用法（差分）：node scripts/audits/visual-diff-locate.mjs <baselineDir> <afterDir> [s1,s2,...]
 *   态清单缺省=两目录同名 PNG 交集全跑；逐态输出差分行带（y 含端块全界+x 范围），
 *   报告落 JSON（--json 缺省 scripts/audits/visual-diff-report.json）。
 * 用法（crop）：node scripts/audits/visual-diff-locate.mjs <baselineDir> <afterDir> \
 *   --crop <state>,<x>,<y>,<w>,<h> [--out <file>]
 *   读该态两图裁矩形，上=baseline 下=after、中间 2px 分隔线，写 PNG
 *   （缺省 scripts/audits/visual-diff-crop.png）。
 *
 * 算法（v51 配方，票面钉死）：16px 块网格（边缘块按实际尺寸）；差异像素=RGB
 * 任一通道 |a-b|>6（TH6）；块内差异像素计数≥4（cnt≥4）→ 该块计差分块；
 * 连续差分块行合并为行带，带 y=首行块顶..尾行块底（含端块全界），带 x=带内
 * 差分块最小/最大列的块全界，附差分块数。
 * 参数对位表：Node 侧 BLOCK/TH/CNT=16/6/4 ↔ 页内 diffInPage 字面量 16/6/4
 * （序列化不带闭包——改值双写面，两处须同步）。
 *
 * 三坑规避（⑤h 原文内建）：①about:blank 加载 file:// 静默挂死 → launch 后
 * **goto file:// 原源载体页**（HTML 载体页自身经 pathToFileURL）；②file:// 页
 * canvas 污染 → chromium.launch args 带 **--allow-file-access-from-files**；
 * ③本仓路径含中文（智慧水务）→ 一切文件路径（载体页+两图）经 **pathToFileURL**
 * 编码后入页。纯 Node 面零 app 依赖（不 launch electron）。
 *
 * 退出码：差分有带/全零带均 exit 0（带=定位输出非失败，本工具不替人判
 * PASS/FAIL）；参数错/文件缺 exit 2；两图尺寸不等（对比前提破坏）exit 1。
 */
import { chromium } from 'playwright'
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const BLOCK = 16
const TH = 6
const CNT = 4
const DEFAULT_JSON = join(HERE, 'visual-diff-report.json')
const DEFAULT_CROP_PNG = join(HERE, 'visual-diff-crop.png')

// ── CLI ─────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const pos = []
  const opts = { crop: null, out: null, json: null }
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]
    if (a === '--crop' || a === '--out' || a === '--json') {
      const v = argv[i + 1]
      if (v === undefined) fail(2, `参数 ${a} 缺值`)
      opts[a.slice(2)] = v
      i += 1
    } else if (a.startsWith('--')) {
      fail(2, `未知参数 ${a}`)
    } else {
      pos.push(a)
    }
  }
  if (pos.length < 2 || pos.length > 3) {
    fail(2, '用法: node scripts/audits/visual-diff-locate.mjs <baselineDir> <afterDir> [s1,s2,...] [--json f] | --crop <state>,<x>,<y>,<w>,<h> [--out f]')
  }
  if (opts.crop !== null && pos.length === 3) {
    fail(2, 'crop 模式不接受态清单参数（--crop 已指定态）')
  }
  if (opts.crop !== null) {
    const parts = opts.crop.split(',')
    const nums = parts.slice(1).map((n) => Number(n))
    if (parts.length !== 5 || !parts[0] || nums.some((n) => !Number.isInteger(n))) {
      fail(2, `--crop 格式应为 <state>,<x>,<y>,<w>,<h>（整数），实得 "${opts.crop}"`)
    }
    const [x, y, w, h] = nums
    if (x < 0 || y < 0 || w <= 0 || h <= 0) fail(2, `--crop 区域须 x,y>=0 且 w,h>0，实得 (${x},${y},${w},${h})`)
    opts.cropRect = { x, y, w, h }
    opts.cropState = parts[0]
  }
  return { baselineDir: pos[0], afterDir: pos[1], statesArg: pos[2] ?? null, ...opts }
}

function fail(code, msg) {
  console.error(`[visual-diff-locate][FAIL] ${msg}`)
  process.exit(code)
}

/** 页内差分（evaluate 函数——playwright 仅函数类型可带参调用，字符串按表达式求值）。
 *  参数=单对象（playwright 限制多参数须封装）。数字字面量内联（序列化函数不带闭包）：
 *  16=块边长 / 6=TH / 4=CNT——与票面钉死配方一致，改值须同步头注与 meta。
 *  getImageData 可读的前提=launch 带 --allow-file-access-from-files（坑②——否则
 *  file:// 页 canvas 污染抛 SecurityError）。 */
async function diffInPage({ urlA, urlB }) {
  const load = (url) => new Promise((res, rej) => {
    const img = new Image()
    img.onload = () => res(img)
    img.onerror = () => rej(new Error('页内图片加载失败: ' + url))
    img.src = url
  })
  const [ia, ib] = await Promise.all([load(urlA), load(urlB)])
  const w = ia.naturalWidth, h = ia.naturalHeight
  if (ib.naturalWidth !== w || ib.naturalHeight !== h) {
    // urlA=after 图 / urlB=baseline 图（Node 侧调用约定）——尺寸键按此命名防标签颠倒
    return { sizeMismatch: { after: [w, h], baseline: [ib.naturalWidth, ib.naturalHeight] } }
  }
  const grab = (img) => {
    const c = document.createElement('canvas')
    c.width = w; c.height = h
    const x = c.getContext('2d', { willReadFrequently: true })
    x.drawImage(img, 0, 0)
    return x.getImageData(0, 0, w, h).data
  }
  const da = grab(ia), db = grab(ib)
  const gw = Math.ceil(w / 16), gh = Math.ceil(h / 16)
  const blocks = new Uint8Array(gw * gh)
  for (let by = 0; by < gh; by += 1) {
    const y0 = by * 16, y1 = Math.min(y0 + 16, h)
    for (let bx = 0; bx < gw; bx += 1) {
      const x0 = bx * 16, x1 = Math.min(x0 + 16, w)
      let cnt = 0
      hit: for (let y = y0; y < y1; y += 1) {
        let i = (y * w + x0) * 4
        for (let x = x0; x < x1; x += 1, i += 4) {
          const dr = da[i] - db[i], dg = da[i + 1] - db[i + 1], dbl = da[i + 2] - db[i + 2]
          if (dr > 6 || dr < -6 || dg > 6 || dg < -6 || dbl > 6 || dbl < -6) {
            cnt += 1
            if (cnt >= 4) { blocks[by * gw + bx] = 1; break hit }
          }
        }
      }
    }
  }
  return { w, h, gw, gh, blocks: Array.from(blocks) }
}

/** 页内 crop：裁两图同区上下拼接（上=baseline 下=after，中间 2px 分隔线
 *  #ff00ff），返回 PNG dataURL。同样=单对象参数（playwright 限制）。 */
async function cropInPage({ urlBase, urlAfter, x, y, w, h }) {
  const load = (url) => new Promise((res, rej) => {
    const img = new Image()
    img.onload = () => res(img)
    img.onerror = () => rej(new Error('页内图片加载失败: ' + url))
    img.src = url
  })
  const [baseImg, afterImg] = await Promise.all([load(urlBase), load(urlAfter)])
  const W = baseImg.naturalWidth, H = baseImg.naturalHeight
  if (afterImg.naturalWidth !== W || afterImg.naturalHeight !== H) {
    // 与差分模式同构：返回 sizeMismatch 对象由 Node 侧 bail(1)——页内抛普通 Error
    // 会被主 catch 记 2，违反合同「尺寸不等=1」（回炉 2 B-1）
    return { sizeMismatch: { baseline: [W, H], after: [afterImg.naturalWidth, afterImg.naturalHeight] } }
  }
  if (x + w > W || y + h > H) {
    throw new Error('crop 区域越界: (' + x + ',' + y + ',' + w + ',' + h + ') vs 图 ' + W + 'x' + H)
  }
  const out = document.createElement('canvas')
  out.width = w; out.height = h * 2 + 2
  const ctx = out.getContext('2d')
  // 拼接契约（头注）：上=baseline 下=after——按语义参数名直画，禁 urlA/urlB 式间接层
  // （回炉 1 根因：间接层致 ia=after 被画上半而 IHDR 尺寸断言对内容顺序盲）。
  ctx.drawImage(baseImg, x, y, w, h, 0, 0, w, h)
  ctx.fillStyle = '#ff00ff'
  ctx.fillRect(0, h, w, 2)
  ctx.drawImage(afterImg, x, y, w, h, 0, h + 2, w, h)
  return out.toDataURL('image/png')
}

// ── 行带聚合（Node 侧）：连续差分块行 → 带 ──────────────────────────
function aggregateBands(blocks, gw, gh, w, h) {
  const rowHasDiff = (by) => {
    for (let bx = 0; bx < gw; bx += 1) if (blocks[by * gw + bx]) return true
    return false
  }
  const bands = []
  let total = 0
  let by = 0
  while (by < gh) {
    if (!rowHasDiff(by)) { by += 1; continue }
    let end = by
    while (end + 1 < gh && rowHasDiff(end + 1)) end += 1
    let minX = gw, maxX = -1, count = 0
    for (let r = by; r <= end; r += 1) {
      for (let bx = 0; bx < gw; bx += 1) {
        if (!blocks[r * gw + bx]) continue
        count += 1
        if (bx < minX) minX = bx
        if (bx > maxX) maxX = bx
      }
    }
    total += count
    bands.push({
      y0: by * BLOCK,
      y1: Math.min((end + 1) * BLOCK, h),
      x0: minX * BLOCK,
      x1: Math.min((maxX + 1) * BLOCK, w),
      rows: end - by + 1,
      blocks: count
    })
    by = end + 1
  }
  return { bands, totalDiffBlocks: total }
}

// ── 主链 ────────────────────────────────────────────────────────────
const args = parseArgs(process.argv.slice(2))
const absDir = (p, label) => {
  const r = isAbsolute(p) ? p : resolve(process.cwd(), p)
  let st = null
  try { st = statSync(r) } catch { /* 不存在 → st 保持 null */ }
  if (st === null) fail(2, `${label} 目录不存在: ${p}`)
  if (!st.isDirectory()) fail(2, `${label} 不是目录（传了文件路径?）: ${p}`)
  return r
}
const baselineDir = absDir(args.baselineDir, 'baseline')
const afterDir = absDir(args.afterDir, 'after')

const pngStates = async (d) => (await readdir(d)).filter((f) => f.endsWith('.png')).map((f) => f.slice(0, -4)).sort()
let states
if (args.statesArg !== null) {
  states = args.statesArg.split(',').map((s) => s.trim()).filter(Boolean)
  if (!states.length) fail(2, '态清单为空')
} else {
  const baseStates = await pngStates(baselineDir)
  const afterSet = new Set(await pngStates(afterDir))
  states = baseStates.filter((s) => afterSet.has(s))
  if (!states.length) fail(2, `两目录无同名 PNG 交集（${baselineDir} vs ${afterDir}）`)
}
for (const s of states) {
  for (const [d, label] of [[baselineDir, 'baseline'], [afterDir, 'after']]) {
    if (!existsSync(join(d, `${s}.png`))) fail(2, `${label} 缺 ${s}.png（目录 ${d}）`)
  }
}
if (args.crop !== null) {
  for (const [d, label] of [[baselineDir, 'baseline'], [afterDir, 'after']]) {
    if (!existsSync(join(d, `${args.cropState}.png`))) fail(2, `${label} 缺 ${args.cropState}.png（目录 ${d}）`)
  }
}

/** 运行期错误（浏览器已开）——不直接 process.exit（会跳过 finally 清理），经 catch 收退出码。 */
class ToolError extends Error {
  constructor(code, msg) {
    super(msg)
    this.code = code
  }
}
const bail = (code, msg) => { throw new ToolError(code, msg) }

console.log('[visual-diff-locate] 算法: 16px 块网格 / TH6=RGB 任一通道 |a-b|>6 / cnt>=4 → 差分块; 连续差分行合并为带')
console.log(`[visual-diff-locate] 三坑自证: ①goto file:// 载体原源页 ②launch --allow-file-access-from-files ③全部路径 pathToFileURL（仓路径含中文）`)
console.log(`[visual-diff-locate] baseline=${baselineDir}`)
console.log(`[visual-diff-locate] after=${afterDir}`)
console.log(`[visual-diff-locate] states(${states.length})=${states.join(',')}`)

// 载体页（坑①：launch 后 goto file:// 原源页——临时 HTML 自身 pathToFileURL）。
// mkdtemp/launch 全在 try 内+判空清理（回炉 2 W-2：launch 失败不泄漏 tmpDir、
// 不对 null browser 调 close）
let exitCode = 0
let tmpDir = null
let browser = null
try {
  tmpDir = await mkdtemp(join(tmpdir(), 'vd-locate-'))
  browser = await chromium.launch({ headless: true, args: ['--allow-file-access-from-files'] })
  const page = await browser.newPage()
  page.on('pageerror', (e) => console.error(`[visual-diff-locate][页内错误] ${e}`))
  const htmlPath = join(tmpDir, 'carrier.html')
  await writeFile(htmlPath, '<!doctype html><meta charset="utf-8"><title>visual-diff-locate carrier</title><body></body>\n')
  const carrierUrl = pathToFileURL(htmlPath).href
  await page.goto(carrierUrl)
  console.log(`[visual-diff-locate] 载体页就绪: ${carrierUrl}（goto file:// 原源页）`)

  if (args.crop !== null) {
    // ── crop 模式 ──（urlBase/urlAfter 语义命名——与页内直画名一一对应，防顺序再颠倒）
    const { x, y, w, h } = args.cropRect
    const urlBase = pathToFileURL(join(baselineDir, `${args.cropState}.png`)).href
    const urlAfter = pathToFileURL(join(afterDir, `${args.cropState}.png`)).href
    console.log(`[crop] state=${args.cropState} 区域=(${x},${y},${w},${h}) 上=baseline 下=after 分隔=2px#ff00ff`)
    const r = await page.evaluate(cropInPage, { urlBase, urlAfter, x, y, w, h })
    if (r.sizeMismatch !== undefined) {
      bail(1, `crop 两图尺寸不等: baseline=${r.sizeMismatch.baseline[0]}x${r.sizeMismatch.baseline[1]} after=${r.sizeMismatch.after[0]}x${r.sizeMismatch.after[1]}（对比前提破坏）`)
    }
    const dataUrl = r
    const pngPath = args.out !== null ? (isAbsolute(args.out) ? args.out : resolve(process.cwd(), args.out)) : DEFAULT_CROP_PNG
    await writeFile(pngPath, Buffer.from(dataUrl.split(',')[1], 'base64'))
    const ihdrW = readFileSync(pngPath).readUInt32BE(16)
    const ihdrH = readFileSync(pngPath).readUInt32BE(20)
    const wantH = h * 2 + 2
    console.log(`[crop] 输出 ${pngPath} IHDR=${ihdrW}x${ihdrH}（期望 ${w}x${wantH}）`)
    if (ihdrW !== w || ihdrH !== wantH) bail(1, `crop 输出尺寸 ${ihdrW}x${ihdrH} != 期望 ${w}x${wantH}`)
    console.log('[crop] OK')
  } else {
    // ── 差分模式 ──
    const report = {
      meta: {
        tool: 'scripts/audits/visual-diff-locate.mjs',
        date: new Date().toISOString(),
        algorithm: { blockPx: BLOCK, threshold: `RGB 任一通道 |a-b|>${TH}`, minDiffPixels: CNT },
        baselineDir, afterDir, states
      },
      states: {}
    }
    let grandBands = 0
    for (const s of states) {
      const bp = join(baselineDir, `${s}.png`)
      const ap = join(afterDir, `${s}.png`)
      const r = await page.evaluate(diffInPage, { urlA: pathToFileURL(ap).href, urlB: pathToFileURL(bp).href })
      if (r.sizeMismatch) {
        bail(1, `态 ${s} 两图尺寸不等: baseline=${r.sizeMismatch.baseline[0]}x${r.sizeMismatch.baseline[1]} after=${r.sizeMismatch.after[0]}x${r.sizeMismatch.after[1]}（对比前提破坏）`)
      }
      const { bands, totalDiffBlocks } = aggregateBands(r.blocks, r.gw, r.gh, r.w, r.h)
      grandBands += bands.length
      const zero = bands.length === 0 ? ' （零带）' : ''
      console.log(`[state] ${s} ${r.w}x${r.h} grid=${r.gw}x${r.gh} diff-blocks=${totalDiffBlocks} bands=${bands.length}${zero}`)
      for (const [i, b] of bands.entries()) {
        console.log(`  band ${i + 1}: y=[${b.y0},${b.y1}) x=[${b.x0},${b.x1}) rows=${b.rows} blocks=${b.blocks}`)
      }
      report.states[s] = {
        width: r.w, height: r.h, gridW: r.gw, gridH: r.gh,
        diffBlocks: totalDiffBlocks, bandCount: bands.length,
        bands: bands.map((b) => ({ y: [b.y0, b.y1], x: [b.x0, b.x1], rows: b.rows, blocks: b.blocks }))
      }
    }
    const jsonPath = args.json !== null ? (isAbsolute(args.json) ? args.json : resolve(process.cwd(), args.json)) : DEFAULT_JSON
    await writeFile(jsonPath, JSON.stringify(report, null, 2))
    console.log(`[visual-diff-locate] 汇总: ${states.length} 态 / ${grandBands} 差分带 / JSON=${jsonPath}`)
    console.log('[visual-diff-locate] 完成（带=定位输出非判定——对位归调用方，见头注三件套语境）')
  }
} catch (e) {
  exitCode = e instanceof ToolError ? e.code : 2
  console.error(`[visual-diff-locate][FAIL] ${e instanceof ToolError ? e.message : `执行异常: ${e}`}`)
} finally {
  if (browser !== null) await browser.close()
  if (tmpDir !== null) await rm(tmpDir, { recursive: true, force: true })
}
process.exit(exitCode)
