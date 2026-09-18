// g4 侦察探针 3：M1 十文件自身的对外 import（置底核验——state 不许依赖其他域）
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const dir = 'src/renderer/features/reader'
const mods = [
  'reader.store.ts', 'tab-dirty.ts', 'useActiveTab.ts', 'annotation-undo.ts', 'page-layer-z.ts',
  'ai-notes.store.ts', 'ai-notes-phase.ts', 'PdfDocProvider.tsx', 'CorpusExtractor.ts', 'scroll-converge.ts'
]
const importRe = /(?:from|import)\s+['"](\.[^'"]+)['"]/g
for (const mod of mods) {
  const content = readFileSync(join(root, dir, mod), 'utf-8')
  const targets = new Set()
  let m
  while ((m = importRe.exec(content)) !== null) targets.add(m[1])
  console.log(`\n=== ${mod} ===`)
  for (const t of [...targets].sort()) console.log(`  ${t}`)
}
