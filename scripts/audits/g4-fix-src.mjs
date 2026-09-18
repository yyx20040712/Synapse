// g4 改写探针 2：src 消费面——reader 留驻件 `./x`->`./state/x`（十模块）+ 跨域 2 行
// 仅替换带引号的模块说明符（闭引号紧跟模块名，防 tab-dirty-x 类误配）
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
if (!root.endsWith('Synapse_remake')) throw new Error(`cwd 异常: ${root}`)

const mods = [
  'reader\\.store', 'tab-dirty', 'useActiveTab', 'annotation-undo', 'page-layer-z',
  'ai-notes\\.store', 'ai-notes-phase', 'PdfDocProvider', 'CorpusExtractor', 'scroll-converge'
]
const re = new RegExp(`(['"])\\./(${mods.join('|')})\\1`, 'g')

function walk(dir, acc) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) {
      // state/ = 本票共迁目录：其域内 `./x` 互引不变，禁入
      if (e === 'state') continue
      walk(p, acc)
    } else if (/\.(ts|tsx)$/.test(e)) acc.push(p)
  }
  return acc
}

let total = 0
const files = walk(join(root, 'src/renderer/features/reader'), [])
for (const f of files) {
  const content = readFileSync(f, 'utf-8')
  const lines = content.split('\n')
  let touched = 0
  const out = lines.map((line, i) => {
    let nl = line
    nl = nl.replace(re, (m, q, mod) => {
      touched++
      console.log(`${f.replaceAll('\\', '/')}:${i + 1}  './${mod}' -> './state/${mod}'`)
      return `${q}./state/${mod}${q}`
    })
    return nl
  })
  if (touched > 0) {
    writeFileSync(f, out.join('\n'), 'utf-8')
    total += touched
  }
}

// 跨域 2 行（精确串，各命中 1 次防漂移）
const cross = [
  ['src/renderer/app/App.tsx', "'../features/reader/tab-dirty'", "'../features/reader/state/tab-dirty'"],
  ['src/renderer/features/settings/useExportCorpusEvents.ts', "'../reader/CorpusExtractor'", "'../reader/state/CorpusExtractor'"]
]
for (const [file, from, to] of cross) {
  const p = `${root}/${file}`
  const content = readFileSync(p, 'utf-8')
  const count = content.split(from).length - 1
  if (count !== 1) throw new Error(`${file} 旧串命中 ${count} 次（预期 1）——中止不写`)
  const lineNo = content.slice(0, content.indexOf(from)).split('\n').length
  writeFileSync(p, content.replace(from, to), 'utf-8')
  console.log(`${file}:${lineNo}  ${from} -> ${to}`)
  total++
}
console.log(`=== SRC FIX DONE: ${total} lines (machine-measured) ===`)
