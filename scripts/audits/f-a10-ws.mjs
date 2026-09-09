/** F-A10 诊断：PDF 页 2 全部 item 的首尾空白盘点（ws 串是否存在——证据档） */
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { readFileSync } from 'node:fs'
const buf = readFileSync(process.argv[2])
const doc = await getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise
const page = await doc.getPage(2)
const tc = await page.getTextContent()
let lead = 0, trail = 0, both = 0, pure = 0, n = 0
const samples = []
for (const it of tc.items) {
  if (it.str === '') continue
  n++
  const l = /^\s/.test(it.str), t = /\s$/.test(it.str), p = /^\s*$/.test(it.str)
  if (l) lead++
  if (t) trail++
  if (l && t) both++
  if (p) pure++
  if ((l || t) && samples.length < 10) samples.push(JSON.stringify({ x: Math.round(it.transform[4]), y: Math.round(it.transform[5]), str: it.str.slice(0, 50) }))
}
console.log(JSON.stringify({ page2Items: n, leadingWs: lead, trailingWs: trail, bothEndsWs: both, pureWs: pure }))
console.log(samples.join('\n'))
