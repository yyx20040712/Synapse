// g4 改写探针 3：tests 受锁面——`src/renderer/features/reader/<mod>` 插入 state/ 段
// 兼容 ../../../（tests/unit/**）与 ../../（tests/utils/**）两种前缀；期望合计 41 行
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
if (!root.endsWith('Synapse_remake')) throw new Error(`cwd 异常: ${root}`)

const mods = [
  'reader\\.store', 'tab-dirty', 'useActiveTab', 'annotation-undo', 'page-layer-z',
  'ai-notes\\.store', 'ai-notes-phase', 'PdfDocProvider', 'CorpusExtractor', 'scroll-converge'
]
const re = new RegExp(`(src/renderer/features/reader)/(${mods.join('|')})(['"])`, 'g')

function walk(dir, acc) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) walk(p, acc)
    else if (/\.(ts|tsx)$/.test(e)) acc.push(p)
  }
  return acc
}

let total = 0
let fileCount = 0
const files = walk(join(root, 'tests'), [])
for (const f of files) {
  const content = readFileSync(f, 'utf-8')
  if (!re.test(content)) { re.lastIndex = 0; continue }
  re.lastIndex = 0
  const lines = content.split('\n')
  let touched = 0
  const out = lines.map((line, i) => {
    let nl = line
    nl = nl.replace(re, (m, base, mod, q) => {
      touched++
      console.log(`${f.replaceAll('\\', '/')}:${i + 1}  ...reader/${mod} -> ...reader/state/${mod}`)
      return `${base}/state/${mod}${q}`
    })
    return nl
  })
  if (touched > 0) {
    writeFileSync(f, out.join('\n'), 'utf-8')
    total += touched
    fileCount++
  }
}
console.log(`=== TESTS FIX DONE: ${fileCount} files / ${total} lines (recon expectation: 30 files / 41 lines) ===`)
