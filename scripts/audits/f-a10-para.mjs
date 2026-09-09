/** F-A10 诊断：img2 涉及段的段边界 item 结构（证据档） */
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { readFileSync } from 'node:fs'
const buf = readFileSync(process.argv[2])
const doc = await getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise
for (const p of [1, 2]) {
  const page = await doc.getPage(p)
  const tc = await page.getTextContent()
  let full = ''
  const marks = []
  for (const it of tc.items) {
    if (it.str === '') continue
    marks.push({ off: full.length, str: it.str, x: it.transform[4], y: it.transform[5], w: it.width })
    full += it.str
  }
  for (const needle of ['Smart cities represent', 'With regard']) {
    const i = full.indexOf(needle)
    console.log(`PAGE ${p} len=${full.length} "${needle}" hit=${i}`)
    if (i < 0) continue
    for (const m of marks) {
      if (m.off <= i + 80 && m.off + m.str.length >= i - 8) {
        console.log('  ITEM', JSON.stringify({ off: m.off, end: m.off + m.str.length, x: Math.round(m.x), xEnd: Math.round(m.x + m.w), y: Math.round(m.y), str: m.str.slice(0, 78) }))
      }
    }
  }
}
