// G9 B面：src 消费面 7 行/3 文件（./X → ./view/X）
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = 'E:/class/智慧水务/Synapse_remake/src/renderer/features/reader'

const edits = [
  // reader-search.ts:32（PdfTextItem type）
  ['reader-search.ts', "from './PdfPageCanvas'", "from './view/PdfPageCanvas'"],
  // PageColumnView.tsx:25/26/27
  ['PageColumnView.tsx', "from './PdfPageCanvas'", "from './view/PdfPageCanvas'"],
  ['PageColumnView.tsx', "from './PageBox'", "from './view/PageBox'"],
  ['PageColumnView.tsx', "from './page-column-geometry'", "from './view/page-column-geometry'"],
  // ReaderPage.tsx:50/54/58
  ['ReaderPage.tsx', "from './PageColumn'", "from './view/PageColumn'"],
  ['ReaderPage.tsx', "from './scroll-progress'", "from './view/scroll-progress'"],
  ['ReaderPage.tsx', "from './ReaderPageView'", "from './view/ReaderPageView'"],
]

let total = 0
for (const [f, o, n] of edits) {
  const p = join(ROOT, f)
  let src = readFileSync(p, 'utf8')
  const first = src.indexOf(o)
  if (first === -1) {
    console.error(`MISS ${f}: ${o}`)
    process.exit(1)
  }
  src = src.slice(0, first) + n + src.slice(first + o.length)
  if (src.includes(o)) {
    console.error(`RESIDUE ${f}: ${o}`)
    process.exit(1)
  }
  writeFileSync(p, src)
  total++
  console.log(`${f}: ${o} -> ${n}`)
}
console.log(`TOTAL_B_EDITS=${total}`)
if (total !== 7) {
  console.error(`COUNT_MISMATCH expected 7 got ${total}`)
  process.exit(1)
}
console.log('REWRITE_B_OK')
