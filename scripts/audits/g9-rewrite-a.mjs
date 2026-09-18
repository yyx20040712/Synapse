// G9 A面深度修正：14 迁移件内部相对 import 改写（44 行，每处断言恰 1 次命中）
// 纯路径改写零行为变更；探针纪律=Write 直写后 node 跑（禁 node -e 多行）
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = 'E:/class/智慧水务/Synapse_remake/src/renderer/features/reader/view'
const S = (f) => join(ROOT, f)

// [file, oldStr, newStr] —— 每条预期恰命中 1 次
const edits = [
  // PageColumn: state 1 + reader根驻留 PageColumnView 1
  ['PageColumn.tsx', "from './state/PdfDocProvider'", "from '../state/PdfDocProvider'"],
  ['PageColumn.tsx', "from './PageColumnView'", "from '../PageColumnView'"],
  // PageBox: state 1
  ['PageBox.tsx', "from './state/PdfDocProvider'", "from '../state/PdfDocProvider'"],
  // PagesOverlay: reader根驻留 SearchHighlightLayer 1 + state 1 + anchors 1
  ['PagesOverlay.tsx', "from './SearchHighlightLayer'", "from '../SearchHighlightLayer'"],
  ['PagesOverlay.tsx', "from './state/PdfDocProvider'", "from '../state/PdfDocProvider'"],
  ['PagesOverlay.tsx', "from './anchors/page-items.store'", "from '../anchors/page-items.store'"],
  // PdfPageCanvas: state 1 + anchors 3（import 2 + export from 1）
  ['PdfPageCanvas.tsx', "from './state/page-layer-z'", "from '../state/page-layer-z'"],
  ['PdfPageCanvas.tsx', "from './anchors/pdf-item-geometry'", "from '../anchors/pdf-item-geometry'"],
  ['PdfPageCanvas.tsx', "from './anchors/geometry-types'", "from '../anchors/geometry-types'"],
  ['PdfPageCanvas.tsx', "from './anchors/geometry-types'", "from '../anchors/geometry-types'"],
  // TextLayer: state 1
  ['TextLayer.tsx', "from './state/page-layer-z'", "from '../state/page-layer-z'"],
  // usePageColumnScroll: state 1
  ['usePageColumnScroll.ts', "from './state/scroll-converge'", "from '../state/scroll-converge'"],
  // scroll-progress: state 3 + api/client 1
  ['scroll-progress.ts', "from './state/scroll-converge'", "from '../state/scroll-converge'"],
  ['scroll-progress.ts', "from '../../api/client'", "from '../../../api/client'"],
  ['scroll-progress.ts', "from './state/reader.store'", "from '../state/reader.store'"],
  ['scroll-progress.ts', "from './state/reader.store'", "from '../state/reader.store'"],
  // AnnotationLayer: anchors 5 + state 2
  ['AnnotationLayer.tsx', "from './anchors/annotation-resolve'", "from '../anchors/annotation-resolve'"],
  ['AnnotationLayer.tsx', "from './anchors/annotation-resolve-layered'", "from '../anchors/annotation-resolve-layered'"],
  ['AnnotationLayer.tsx', "from './anchors/page-items.store'", "from '../anchors/page-items.store'"],
  ['AnnotationLayer.tsx', "from './anchors/annotation-merge'", "from '../anchors/annotation-merge'"],
  ['AnnotationLayer.tsx', "from './anchors/annotation-style'", "from '../anchors/annotation-style'"],
  ['AnnotationLayer.tsx', "from './state/page-layer-z'", "from '../state/page-layer-z'"],
  ['AnnotationLayer.tsx', "from './state/reader.store'", "from '../state/reader.store'"],
  // AiAnnotationLayer: anchors 5 + state 3
  ['AiAnnotationLayer.tsx', "from './anchors/annotation-resolve'", "from '../anchors/annotation-resolve'"],
  ['AiAnnotationLayer.tsx', "from './anchors/annotation-resolve-layered'", "from '../anchors/annotation-resolve-layered'"],
  ['AiAnnotationLayer.tsx', "from './anchors/page-items.store'", "from '../anchors/page-items.store'"],
  ['AiAnnotationLayer.tsx', "from './anchors/annotation-style'", "from '../anchors/annotation-style'"],
  ['AiAnnotationLayer.tsx', "from './anchors/ai-note-style'", "from '../anchors/ai-note-style'"],
  ['AiAnnotationLayer.tsx', "from './state/page-layer-z'", "from '../state/page-layer-z'"],
  ['AiAnnotationLayer.tsx', "from './state/ai-notes.store'", "from '../state/ai-notes.store'"],
  ['AiAnnotationLayer.tsx', "from './state/reader.store'", "from '../state/reader.store'"],
  // AnnotationPopups: api/client 1 + shared/ui 1 + state 2 + reader根驻留 2
  ['AnnotationPopups.tsx', "from '../../api/client'", "from '../../../api/client'"],
  ['AnnotationPopups.tsx', "from '../../shared/ui/Toast'", "from '../../../shared/ui/Toast'"],
  ['AnnotationPopups.tsx', "from './state/annotation-undo'", "from '../state/annotation-undo'"],
  ['AnnotationPopups.tsx', "from './AnnotationEditor'", "from '../AnnotationEditor'"],
  ['AnnotationPopups.tsx', "from './AnnotationMenu'", "from '../AnnotationMenu'"],
  ['AnnotationPopups.tsx', "from './state/reader.store'", "from '../state/reader.store'"],
  // ReaderPageView: panels 1 + interact 1 + shared/ui 1 + state 2 + reader根驻留 2
  ['ReaderPageView.tsx', "from './panels/OutlineAside'", "from '../panels/OutlineAside'"],
  ['ReaderPageView.tsx', "from './interact/SelectionLayer'", "from '../interact/SelectionLayer'"],
  ['ReaderPageView.tsx', "from '../../shared/ui/SplitPane'", "from '../../../shared/ui/SplitPane'"],
  ['ReaderPageView.tsx', "from './state/PdfDocProvider'", "from '../state/PdfDocProvider'"],
  ['ReaderPageView.tsx', "from './TabBar'", "from '../TabBar'"],
  ['ReaderPageView.tsx', "from './ReaderToolbar'", "from '../ReaderToolbar'"],
  ['ReaderPageView.tsx', "from './state/reader.store'", "from '../state/reader.store'"],
]

// 同 oldStr 多次出现（reader.store×2 / geometry-types×2）：按序逐个替换
const byFile = new Map()
for (const [f, o, n] of edits) {
  if (!byFile.has(f)) byFile.set(f, [])
  byFile.get(f).push([o, n])
}

let total = 0
const report = []
for (const [f, pairs] of byFile) {
  const p = S(f)
  let src = readFileSync(p, 'utf8')
  let n = 0
  for (const [o, nw] of pairs) {
    const first = src.indexOf(o)
    if (first === -1) {
      console.error(`MISS ${f}: ${o}`)
      process.exit(1)
    }
    src = src.slice(0, first) + nw + src.slice(first + o.length)
    n++
  }
  // 改写后旧串必须零残留（同串多目标已逐个消化）
  for (const [o] of pairs) {
    if (src.includes(o)) {
      console.error(`RESIDUE ${f}: ${o}`)
      process.exit(1)
    }
  }
  writeFileSync(p, src)
  total += n
  report.push(`${f}: ${n} edits`)
}
console.log(report.join('\n'))
console.log(`TOTAL_A_EDITS=${total}`)
if (total !== 44) {
  console.error(`COUNT_MISMATCH expected 44 got ${total}`)
  process.exit(1)
}
console.log('REWRITE_A_OK')
