#!/usr/bin/env node
// g11-inv-anchor-check.mjs —— INV-68 行号锚逐个验证探针（单文件单目的，收官票①）。
// 义务=简报③.1：验证 docs/invariants.md INV-68 全部行号锚（现行文件+行号+应含符号）
// + INV-47/INV-58/INV-68 声明处列全部文件现行存在性。
// 判定：行内含符号=未漂移（未漂勿动）；行内无但全文有=漂移（输出实测新行号供 INV
// 修正）；全文无此符号=缺失（EXIT=1 停工申报）。
// [回炉 #1 补强——门一 B1 根因=本探针 :31-32 硬编码意图态、册面错字零感知]：
// 新增 [0] 册文扫描段——从 docs/invariants.md 文本提取一切 features/reader/<段>
// 路径（正则实测而非意图清单）：段非六域目录且所指文件不存在者=FAIL；六域内路径
// 存在性顺带输出（域内失效不作 FAIL 条件，判定面按门一处置建议字面）。
// 版本：v1 输出档 g11-inv-anchor-check.log 保留勿覆盖（探针版本覆盖=证据灭失，
// G9 教训③）；本版输出落 g11-inv-anchor-check2.log。
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const R = join(process.cwd(), 'src', 'renderer', 'features', 'reader')
const readLines = (rel) => readFileSync(join(R, rel), 'utf8').split('\n')

// 锚表=INV-68 正文全部行号引用（含 #3/#4 收口引用两处）+ 简报③.1 锚清单
const anchors = [
  { file: 'anchors/pdf-item-geometry.ts', line: 366, symbol: 'bandsFromItems', desc: '档1 单源定义' },
  { file: 'anchors/pdf-item-geometry.ts', line: 506, symbol: 'bandsFromItems', desc: 'itemSelectionGeometry 函数体内 bands 产出（锚描述=itemSelectionGeometry:506）' },
  { file: 'interact/selection-evaluate.ts', line: 130, symbol: 'itemSelectionGeometry', desc: '档1 主链消费①（快路径）' },
  { file: 'interact/selection-evaluate.ts', line: 207, symbol: 'itemSelectionGeometry', desc: '档1 主链消费②（全量）' },
  { file: 'anchors/annotation-resolve.ts', line: 209, symbol: 'bandsForTextNodes', desc: '档2 单源定义（DOM 节点口径）' },
  { file: 'anchors/annotation-resolve.ts', line: 237, symbol: 'bandsNearRects', desc: '档3 单源定义（DOM 几何口径）' },
  { file: 'anchors/annotation-resolve.ts', line: 277, symbol: 'resolveAnnotationRectsDom', desc: 'S4 页级回退入口' },
  { file: 'anchors/annotation-resolve.ts', line: 302, symbol: 'bandsForTextNodes', desc: '档2 bands 消费行（S4 内）' },
  { file: 'view/AnnotationLayer.tsx', line: 98, symbol: 'bandsNearRects', desc: '档3 唯一消费（S3b 存量回退）' },
  { file: 'anchors/annotation-band-calibrate.ts', line: 77, symbol: 'calibrateBands', desc: '显示层校准器定义' },
  { file: 'interact/selection-evaluate.ts', line: 43, symbol: '仅显示不入库', desc: '#4 transient 显式声明①（头注）' },
  { file: 'interact/selection-evaluate.ts', line: 292, symbol: '仅显示不入库', desc: '#4 transient 显式声明②（G2 保存门注）' },
  { file: 'interact/selection-evaluate.ts', line: 296, symbol: 'bandsForTextNodes', desc: 'selection 全量显示回退（档2 消费）' },
]

// INV-47/58/68 声明处列文件（G11 加域前缀后的现行径）
const declFiles = {
  'INV-47': ['anchors/annotation-anchor.ts', 'anchors/annotation-merge.ts', 'anchors/annotation-resolve-layered.ts'],
  'INV-58': ['interact/selection-evaluate.ts', 'anchors/pdf-item-geometry.ts', 'interact/SelectionLayer.tsx', 'anchors/page-items.store.ts', 'anchors/annotation-resolve-layered.ts'],
  'INV-68': ['anchors/pdf-item-geometry.ts', 'anchors/annotation-resolve.ts', 'anchors/annotation-resolve-layered.ts', 'interact/selection-evaluate.ts', 'view/AnnotationLayer.tsx'],
}

let missing = 0
let drifted = 0
let pass = 0

// [0] 册文扫描（回炉 #1 补强）：从 invariants.md 文本提取一切 reader 路径实测
const INV_MD = join(process.cwd(), 'docs', 'invariants.md')
const invText = readFileSync(INV_MD, 'utf8')
const DOMAINS = ['anchors', 'state', 'view', 'time', 'interact', 'panels']
const pathRe = /(?:src\/)?renderer\/features\/reader\/([A-Za-z0-9._/-]+)/g
const seen = new Set()
let invPathTotal = 0
let invPathBad = 0
console.log('== [0] 册文 reader 路径扫描（段非六域且文件不存在=FAIL）==')
for (const m of invText.matchAll(pathRe)) {
  const p = m[1].replace(/\/+$/, '')
  if (seen.has(p)) continue
  seen.add(p)
  invPathTotal++
  const seg = p.split('/')[0]
  const inDomain = DOMAINS.includes(seg)
  const abs = join(R, p)
  const exists = existsSync(abs)
  if (!inDomain && !exists) {
    invPathBad++
    missing++
    console.log(`FAIL  册文路径 reader/${p} —— 段「${seg}」非六域且文件不存在（平铺旧径漏刷→回炉）`)
  } else {
    console.log(`PASS  册文路径 reader/${p} —— ${inDomain ? '域内' : '根驻留(文件存在)'}${exists ? '' : ' [域内路径文件缺席——注记非 FAIL]'}`)
  }
}

console.log('== [1] INV-68 行号锚逐个验证 ==')
for (const a of anchors) {
  const lines = readLines(a.file)
  const at = lines[a.line - 1]
  if (at !== undefined && at.includes(a.symbol)) {
    pass++
    console.log(`PASS  ${a.file}:${a.line} 含「${a.symbol}」——${a.desc}`)
    continue
  }
  const hits = []
  lines.forEach((l, i) => {
    if (l.includes(a.symbol)) hits.push(i + 1)
  })
  if (hits.length > 0) {
    drifted++
    console.log(`DRIFT ${a.file}:${a.line} 不含「${a.symbol}」——实测符号行=${hits.join(',')}（${a.desc}）`)
  } else {
    missing++
    console.log(`MISS  ${a.file} 全文无「${a.symbol}」（期望 :${a.line}——${a.desc}）→ 停工申报`)
  }
}

console.log('== [2] INV-47/58/68 声明处文件现行存在性 ==')
for (const [inv, files] of Object.entries(declFiles)) {
  for (const f of files) {
    try {
      readFileSync(join(R, f), 'utf8')
      console.log(`PASS  ${inv} 声明处 ${f} 存在`)
    } catch {
      missing++
      console.log(`MISS  ${inv} 声明处 ${f} 不存在 → 停工申报`)
    }
  }
}

console.log('== [3] 汇总 ==')
console.log(`inv_paths=${invPathTotal} inv_path_bad=${invPathBad} anchors_pass=${pass} drifted=${drifted} missing=${missing} decl_files=${Object.values(declFiles).reduce((s, v) => s + v.length, 0)}`)
const exit = missing > 0 ? 1 : 0
console.log(`EXIT=${exit}`)
process.exit(exit)
