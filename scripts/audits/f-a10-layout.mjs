/**
 * F-A10 诊断探针（纯 node——无 ABI 面）：pdfjs-dist 直接导出真纸第 1 页文本项
 * 布局，定位落库前导空格 quote（start_offset=4692）所在行与空格的行盒归属。
 * 证据档（scripts/audits 留档口径），非产品代码。
 */
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { readFileSync } from 'node:fs'

const pdfPath = process.argv[2]
const focus = Number(process.argv[3] ?? 4692)
const win = Number(process.argv[4] ?? 120)

const buf = readFileSync(pdfPath)
const doc = await getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise
const page = await doc.getPage(1)
const tc = await page.getTextContent()

let full = ''
const marks = []
for (const it of tc.items) {
  if (it.str === '') continue
  marks.push({ off: full.length, str: it.str, x: it.transform[4], y: it.transform[5] })
  full += it.str
}
console.log('TOTAL_LEN', full.length)
console.log(`CTX[${focus - win}..${focus + win}]=`, JSON.stringify(full.slice(focus - win, focus + win)))
console.log('CHAR_AT_FOCUS', JSON.stringify(full[focus]), 'PREV', JSON.stringify(full[focus - 1]))
for (const m of marks) {
  if (m.off <= focus + win && m.off + m.str.length >= focus - win) {
    console.log(JSON.stringify({ off: m.off, end: m.off + m.str.length, x: Math.round(m.x), y: Math.round(m.y), str: m.str.slice(0, 70) }))
  }
}
