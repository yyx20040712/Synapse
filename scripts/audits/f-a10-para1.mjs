/** F-A10 诊断：para1（Smart cities…Mohanty 2016).）全部 item 与 DOM 子序对照（证据档） */
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { readFileSync } from 'node:fs'
const buf = readFileSync(process.argv[2])
const doc = await getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise
const page = await doc.getPage(2)
const tc = await page.getTextContent()
let full = ''
const marks = []
for (const it of tc.items) {
  if (it.str === '') continue
  marks.push({ off: full.length, str: it.str, x: it.transform[4], y: it.transform[5] })
  full += it.str
}
console.log('CTX[600..1470]:')
for (const m of marks) {
  if (m.off <= 1470 && m.off + m.str.length >= 600) {
    console.log(JSON.stringify({ off: m.off, x: Math.round(m.x), y: Math.round(m.y), str: m.str.slice(0, 66) }))
  }
}
