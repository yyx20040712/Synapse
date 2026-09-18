// g4 改写探针 1：state/ 十文件深度修正 8 行（简报②精确清单——../ 加深一级）
// 幂等性：每条旧串必须恰好命中 1 次，否则报错退出（防重复/防漏改）
import { readFileSync, writeFileSync } from 'node:fs'

const root = process.cwd()
if (!root.endsWith('Synapse_remake')) throw new Error(`cwd 异常: ${root}`)

const fixes = [
  ['src/renderer/features/reader/state/reader.store.ts', "'../../api/client'", "'../../../api/client'"],
  ['src/renderer/features/reader/state/reader.store.ts', "'../../shared/ui/toast-store'", "'../../../shared/ui/toast-store'"],
  ['src/renderer/features/reader/state/annotation-undo.ts', "'../../api/client'", "'../../../api/client'"],
  ['src/renderer/features/reader/state/ai-notes.store.ts', "'../../api/client'", "'../../../api/client'"],
  ['src/renderer/features/reader/state/CorpusExtractor.ts', "'../../../shared/app-error'", "'../../../../shared/app-error'"],
  ['src/renderer/features/reader/state/CorpusExtractor.ts', "'../../../shared/ipc/schemas'", "'../../../../shared/ipc/schemas'"],
  ['src/renderer/features/reader/state/CorpusExtractor.ts', "'../../../shared/models/annotation'", "'../../../../shared/models/annotation'"],
  ['src/renderer/features/reader/state/tab-dirty.ts', "'../notes/notes.store'", "'../../notes/notes.store'"]
]

let total = 0
const cache = new Map()
for (const [file, from, to] of fixes) {
  if (!cache.has(file)) cache.set(file, readFileSync(`${root}/${file}`, 'utf-8'))
  const content = cache.get(file)
  const count = content.split(from).length - 1
  if (count !== 1) {
    throw new Error(`${file} 旧串 ${from} 命中 ${count} 次（预期 1）——中止不写`)
  }
  const lineNo = content.slice(0, content.indexOf(from)).split('\n').length
  const next = content.replace(from, to)
  cache.set(file, next)
  console.log(`${file}:${lineNo}  ${from} -> ${to}`)
  total++
}
for (const [file, content] of cache) writeFileSync(`${root}/${file}`, content, 'utf-8')
console.log(`=== DEEP FIX DONE: ${total} lines (expected 8) ===`)
