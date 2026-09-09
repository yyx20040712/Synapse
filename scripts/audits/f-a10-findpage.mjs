/** F-A10 诊断：全页搜索 quote 实际所在页与偏移（证据档） */
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { readFileSync } from 'node:fs'
const buf = readFileSync(process.argv[2])
const doc = await getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise
const needle = 'systematic literature review was conducted'
for (let p = 1; p <= Math.min(doc.numPages, 8); p++) {
  const page = await doc.getPage(p)
  const tc = await page.getTextContent()
  let full = ''
  const marks = []
  for (const it of tc.items) {
    if (it.str === '') continue
    marks.push({ off: full.length, str: it.str, x: it.transform[4], y: it.transform[5] })
    full += it.str
  }
  const i = full.indexOf(needle)
  console.log(`PAGE ${p} len=${full.length} hit=${i}`)
  if (i >= 0) {
    console.log('  CTX=', JSON.stringify(full.slice(Math.max(0, i - 40), i + 60)))
    for (const m of marks) {
      if (m.off <= i + 50 && m.off + m.str.length >= i - 50) {
        console.log('  ITEM', JSON.stringify({ off: m.off, end: m.off + m.str.length, x: Math.round(m.x), y: Math.round(m.y), str: m.str.slice(0, 70) }))
      }
    }
  }
}
