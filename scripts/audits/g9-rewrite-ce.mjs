// G9 C面（tests 30 行/16 件纯路径改写）+ E面（eslint.config.js:90-91 两行）
// 模块说明符带闭合引号整串替换：'…/reader/X' -> '…/reader/view/X'（覆盖 import from 与 vi.mock 两形态）
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = 'E:/class/智慧水务/Synapse_remake'
const T = (f) => join(ROOT, 'tests/unit/renderer', f)

// [file, moduleName, expectCount]
const tests = [
  ['reader-search-text.test.tsx', 'PdfPageCanvas', 1],
  ['text-layer.test.tsx', 'TextLayer', 1],
  ['text-layer.test.tsx', 'PdfPageCanvas', 1],
  ['page-column.test.tsx', 'PageColumn', 1],
  ['page-column.test.tsx', 'page-column-geometry', 1],
  ['anchor-item-verify.test.tsx', 'PdfPageCanvas', 1],
  ['pdf-item-geometry.test.tsx', 'PdfPageCanvas', 1],
  ['pdf-page-canvas.test.tsx', 'PdfPageCanvas', 1],
  ['pdf-page-canvas.test.tsx', 'PageBox', 1],
  ['reader-double-page.test.tsx', 'PageColumn', 1],
  ['reader-double-page.test.tsx', 'page-column-geometry', 1],
  ['reader-page-open-race.test.tsx', 'PageColumn', 1], // vi.mock
  ['annotation-popups-autosave.test.tsx', 'AnnotationPopups', 1],
  ['annotation-layer.test.tsx', 'AnnotationLayer', 1],
  ['annotation-layer.test.tsx', 'PdfPageCanvas', 1],
  ['ai-annotation-layer.test.tsx', 'AiAnnotationLayer', 1],
  ['ai-annotation-layer.test.tsx', 'PdfPageCanvas', 1],
  ['scroll-progress.test.tsx', 'scroll-progress', 1],
  ['scroll-progress.test.tsx', 'page-column-geometry', 1],
  ['pages-overlay.test.tsx', 'PdfPageCanvas', 1],
  ['pages-overlay.test.tsx', 'PageColumn', 1], // vi.mock
  ['pages-overlay.test.tsx', 'TextLayer', 1], // vi.mock
  ['pages-overlay.test.tsx', 'AnnotationLayer', 1], // vi.mock
  ['pages-overlay.test.tsx', 'AiAnnotationLayer', 1], // vi.mock
  ['pages-overlay.test.tsx', 'PagesOverlay', 1],
  ['selection-mode.test.tsx', 'AnnotationLayer', 1],
  ['selection-mode.test.tsx', 'AiAnnotationLayer', 1],
  ['band-calibration.test.tsx', 'AnnotationLayer', 1],
  ['band-calibration.test.tsx', 'PdfPageCanvas', 1],
  ['selection-paint.test.tsx', 'AnnotationLayer', 1],
]

let total = 0
for (const [f, mod, expect] of tests) {
  const p = T(f)
  let src = readFileSync(p, 'utf8')
  const oldStr = `'../../../src/renderer/features/reader/${mod}'`
  const newStr = `'../../../src/renderer/features/reader/view/${mod}'`
  const parts = src.split(oldStr)
  const hits = parts.length - 1
  if (hits !== expect) {
    console.error(`HIT_MISMATCH ${f} ${mod}: expected ${expect} got ${hits}`)
    process.exit(1)
  }
  src = parts.join(newStr)
  if (src.includes(oldStr)) {
    console.error(`RESIDUE ${f}: ${mod}`)
    process.exit(1)
  }
  writeFileSync(p, src)
  total += hits
}

// E 面：eslint.config.js:90-91（:89/:92 已迁态勿动）
const ep = join(ROOT, 'eslint.config.js')
let es = readFileSync(ep, 'utf8')
for (const mod of ['PdfPageCanvas.tsx', 'TextLayer.tsx']) {
  const o = `'src/renderer/features/reader/${mod}'`
  const n = `'src/renderer/features/reader/view/${mod}'`
  if (!es.includes(o)) {
    console.error(`E_MISS eslint.config.js: ${mod}`)
    process.exit(1)
  }
  es = es.split(o).join(n)
}
writeFileSync(ep, es)
console.log(`TOTAL_C_EDITS=${total}`)
console.log('TOTAL_E_EDITS=2')
if (total !== 30) {
  console.error(`COUNT_MISMATCH C expected 30 got ${total}`)
  process.exit(1)
}
console.log('REWRITE_CE_OK')
