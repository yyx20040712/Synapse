// G9 单向核验探针 v2：修正 win32 路径分隔符（统一 / 化）+ 动态 import 通道限定 14 件名
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = 'E:/class/智慧水务/Synapse_remake'
const rel2fwd = (p) => relative(ROOT, p).replace(/\\/g, '/')
const NAMES = [
  'PageColumn', 'PageBox', 'PagesOverlay', 'PdfPageCanvas', 'TextLayer',
  'page-column-geometry', 'usePageColumnScroll', 'usePageLazyWindow',
  'scroll-progress', 'AnnotationLayer', 'AiAnnotationLayer', 'AnnotationPopups',
  'ReaderPageView', 'text-layer.css',
]
const SPEC_ALT = NAMES.flatMap((n) => (n.endsWith('.css') ? [n] : [n, n + '.tsx', n + '.ts']))
const DOMAINS = ['anchors', 'state', 'panels', 'interact', 'time']
const VIEW_DIR = 'src/renderer/features/reader/view'
const READER_DIR = 'src/renderer/features/reader'

function walk(dir, out) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, out)
    else if (/\.(tsx?|css)$/.test(e)) out.push(p)
  }
  return out
}

const srcFiles = walk(join(ROOT, 'src'), [])
const testFiles = walk(join(ROOT, 'tests'), [])
const cfg = [join(ROOT, 'eslint.config.js')]

// ---- 1) view 出边计数 ----
const viewFiles = srcFiles.filter((p) => rel2fwd(p).startsWith(VIEW_DIR + '/'))
const outEdges = { anchors: 0, state: 0, panels: 0, interact: 0, time: 0, intra: 0, readerRoot: 0, upCross: 0, external: 0 }
for (const f of viewFiles) {
  const src = readFileSync(f, 'utf8')
  const specs = [...src.matchAll(/['"](\.[^'"]+)['"]/g)].map((m) => m[1])
  for (const s of specs) {
    if (s.startsWith('../../')) outEdges.upCross++ // api/client + shared/ui（跨特性上行）
    else if (s.startsWith('../state/')) outEdges.state++
    else if (s.startsWith('../anchors/')) outEdges.anchors++
    else if (s.startsWith('../panels/')) outEdges.panels++
    else if (s.startsWith('../interact/')) outEdges.interact++
    else if (s.startsWith('../time/')) outEdges.time++
    else if (s.startsWith('../')) outEdges.readerRoot++ // reader 根驻留件（M6b）
    else if (s.startsWith('./')) outEdges.intra++
    else { outEdges.external++; console.log('  EXT_SPEC: ' + rel2fwd(f) + ' -> ' + s) }
  }
}
console.log('VIEW_OUT_EDGES=' + JSON.stringify(outEdges))

// ---- 2) 反向边：五域件 import view ----
const revEdges = []
for (const f of srcFiles) {
  const rel = rel2fwd(f)
  const dom = DOMAINS.find((d) => rel.startsWith(`${READER_DIR}/${d}/`))
  if (!dom) continue
  const src = readFileSync(f, 'utf8')
  const specs = [...src.matchAll(/['"](\.[^'"]+)['"]/g)].map((m) => m[1])
  for (const s of specs) {
    if (/^(\.\.\/|\.\/)view\//.test(s)) revEdges.push(`${rel}: ${s}`)
  }
}
console.log('REVERSE_EDGES=' + revEdges.length)
for (const r of revEdges) console.log('  REV: ' + r)

// ---- 3) 旧径残留五通道（全部限定 14 件名；view 负向前瞻排除新径） ----
const nameGroup = SPEC_ALT.join('|').replace(/\./g, '\\.')
const oldPathRe = new RegExp(`(features/reader|features\\\\reader)/(?!view/)(${nameGroup})['"\`]`)
const dotPathRe = new RegExp(`['"]\\./(${nameGroup})['"]`)
const dynImportRe = new RegExp(`import\\(\\s*['"\`][^'"\`]*features/reader/(?!view/)(${nameGroup})['"\`]`)
const viMockRe = new RegExp(`vi\\.mock\\(\\s*['"\`][^'"\`]*features/reader/(?!view/)(${nameGroup})['"\`]`)
const aliasRe = new RegExp(`@(shared|renderer|main)[^'"\`]*features/reader/(?!view/)(${nameGroup})`)

const ch = { oldImport: 0, dotPath: 0, alias: 0, dynImport: 0, viMock: 0 }
const hits = []
for (const f of [...srcFiles, ...testFiles, ...cfg]) {
  const rel = rel2fwd(f)
  const inView = rel.startsWith(VIEW_DIR + '/')
  const inReaderRoot = rel.startsWith(READER_DIR + '/') && !inView
  const src = readFileSync(f, 'utf8')
  const lines = src.split('\n')
  lines.forEach((ln, i) => {
    if (viMockRe.test(ln)) { ch.viMock++; hits.push(`${rel}:${i + 1} viMock`) }
    else if (dynImportRe.test(ln)) { ch.dynImport++; hits.push(`${rel}:${i + 1} dynImport`) }
    if (!inView && oldPathRe.test(ln)) { ch.oldImport++; hits.push(`${rel}:${i + 1} oldImport`) }
    if (inReaderRoot && dotPathRe.test(ln)) { ch.dotPath++; hits.push(`${rel}:${i + 1} dotPath`) }
    if (aliasRe.test(ln)) { ch.alias++; hits.push(`${rel}:${i + 1} alias`) }
  })
}
console.log('RESIDUE_FIVE_CHANNEL=' + JSON.stringify(ch))
for (const h of hits) console.log('  HIT: ' + h)

// ---- 4) registry 旧径（主控收口面，单独计数） ----
const reg = readFileSync(join(ROOT, 'tickets/registry.ts'), 'utf8')
const regRe = new RegExp(`features/reader/(?!view/)(${nameGroup})`, 'g')
const regHits = reg.match(regRe) || []
console.log(`REGISTRY_OLD_PATH_COUNT=${regHits.length} (owner=closeout)`)

const ok = revEdges.length === 0 && Object.values(ch).every((v) => v === 0)
console.log('ONE_WAY_RESULT=' + (ok ? 'PASS' : 'FAIL'))
process.exit(ok ? 0 : 1)
