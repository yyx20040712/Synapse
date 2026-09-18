// g4 侦察探针 2：tests 面对十模块的精确引用行（import/vi.mock/动态 import 全形态）
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = process.cwd()
const mods = [
  'reader.store', 'tab-dirty', 'useActiveTab', 'annotation-undo', 'page-layer-z',
  'ai-notes.store', 'ai-notes-phase', 'PdfDocProvider', 'CorpusExtractor', 'scroll-converge'
]

function walk(dir, acc) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, acc)
    else if (/\.(ts|tsx)$/.test(e)) acc.push(p)
  }
  return acc
}

const files = walk(join(root, 'tests'), [])
const perFile = new Map()
for (const f of files) {
  const lines = readFileSync(f, 'utf-8').split('\n')
  const hits = []
  lines.forEach((line, i) => {
    // 引用形态：路径串以 .ts/.tsx 或无扩展结尾，目标=十模块名（词边界防 tab-dirty 误配 tab-dirty-x）
    for (const mod of mods) {
      const re = new RegExp(`(from\\s+|vi\\.mock\\(|import\\(|require\\()['"\`][^'"\`]*\\b${mod.replace('.', '\\.')}(\.tsx?)?['"\`]`)
      if (re.test(line)) hits.push({ mod, line: i + 1, text: line.trim().slice(0, 110) })
    }
  })
  if (hits.length) perFile.set(relative(root, f).replaceAll('\\', '/'), hits)
}

let fileCount = 0, lineCount = 0
const modCount = {}
for (const mod of mods) modCount[mod] = 0
for (const [f, hits] of [...perFile.entries()].sort()) {
  fileCount++
  lineCount += hits.length
  for (const h of hits) modCount[h.mod]++
  console.log(`${f}:`)
  for (const h of hits) console.log(`  :${h.line} [${h.mod}] ${h.text}`)
}
console.log('\n=== SUMMARY ===')
console.log(`test files touched=${fileCount} reference lines=${lineCount}`)
for (const mod of mods) console.log(`  ${mod}: ${modCount[mod]} lines`)
