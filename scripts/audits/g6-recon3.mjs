#!/usr/bin/env node
/**
 * g6-recon3.mjs —— F-GEOM-01-G6 实现者独立全边复核探针（零改动，只读）。
 * 目的：对简报清单（B~H 段）做独立对账，捕捉侦察遗漏（动态 import/字符串路径/配置面）。
 * 输出：分类计数 + 「票面清单外命中」明细（应为空——非空即停工申报素材）。
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, basename, extname } from 'node:path'

const root = process.cwd()
const READER = join(root, 'src', 'renderer', 'features', 'reader')

const MOVED = [
  'pdf-item-geometry', 'annotation-anchor', 'annotation-merge', 'annotation-resolve',
  'annotation-resolve-layered', 'annotation-band-calibrate', 'anchor-serialize',
  'anchor-blank-snap', 'anchor-locate', 'page-items.store', 'open-paper-anchor',
  'annotation-style', 'ai-note-style', 'geometry-types'
]
const MOVED_SET = new Set(MOVED)

// 扫描面：代码+配置（docs/ 归档不扫——非编译面）
function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (['node_modules', 'out', 'dist', '.git', 'coverage', 'audits', 'locks'].includes(name)) continue
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, acc)
    else if (/\.(ts|tsx|js|mjs|cjs|json)$/.test(extname(p))) acc.push(p)
  }
  return acc
}
const files = [
  ...walk(join(root, 'src')),
  ...walk(join(root, 'tests')),
  ...walk(join(root, 'scripts')),
  join(root, 'package.json'), join(root, 'eslint.config.js'), join(root, 'vitest.config.ts'),
  join(root, 'playwright.config.ts'), join(root, 'electron.vite.config.ts'),
  join(root, 'tsconfig.json'), join(root, 'tsconfig.node.json'), join(root, 'tsconfig.web.json')
].filter((p) => { try { return statSync(p).isFile() } catch { return false } })

// import/export/require/import() 说明符抽取（含 type import 与 export-from）
const SPEC_RE = /(?:import|export)\s+(?:type\s+)?[\s\S]*?from\s+['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)|\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)|\bvi\.mock\s*\(\s*['"]([^'"]+)['"]/g

function specifiers(text) {
  const out = []
  let m
  SPEC_RE.lastIndex = 0
  while ((m = SPEC_RE.exec(text)) !== null) {
    out.push(m[1] || m[2] || m[3] || m[4])
  }
  return out
}

// 简报票面清单（file:line → 类别），用于对账"清单外命中"
const TICKET = new Set()
// C 段（reader 根消费 35 处）
const C = {
  'FragmentNotesList.tsx': [12], 'AiNoteGroupList.tsx': [37], 'PagesOverlay.tsx': [54],
  'AiAnnotationLayer.tsx': [70, 71, 72, 73, 75], 'SelectionToolbar.tsx': [17],
  'AnnotationLayer.tsx': [42, 43, 44, 45, 46], 'AiNotesSection.tsx': [50],
  'ReaderToolbar.tsx': [42], 'AnnotationEditor.tsx': [15], 'AnnotationMenu.tsx': [41],
  'release-affinity.ts': [80, 81], 'OutlineAside.tsx': [46],
  'PdfPageCanvas.tsx': [33, 34, 39], 'reader-search.store.ts': [41],
  'selection-evaluate.ts': [72, 73, 74, 75, 76, 77, 78], 'selection-paint.tsx': [35, 36],
  'ReaderPage.tsx': [49]
}
for (const [f, ls] of Object.entries(C)) for (const l of ls) TICKET.add(`src/renderer/features/reader/${f}:${l}:C`)
// D 段
TICKET.add('src/renderer/features/lineage/LineageSideAiNotes.tsx:22:D')
// E 段（tests 34 行）
const E = {
  'ai-note-style.test.ts': [14], 'annotation-merge.test.ts': [15],
  'anchor-item-verify.test.tsx': [28, 29, 30, 31, 32], 'pdf-item-geometry.test.tsx': [30],
  'anchor-blank-snap.test.ts': [4, 5], 'release-affinity.test.ts': [5, 6],
  'ai-notes-section.test.tsx': [21, 42, 51], 'anchor-locate.test.ts': [15],
  'band-calibration.test.tsx': [31, 32, 33], 'lineage-side-panel.test.tsx': [47, 61, 63],
  'selection-evaluate.test.tsx': [32], 'annotation-layer.test.tsx': [20],
  'ai-annotation-layer.test.tsx': [20, 22, 24], 'selection-item-chain.test.tsx': [22],
  'annotation-anchor.test.ts': [7, 11], 'selection-paint.test.tsx': [33, 34, 36],
  'selection-layer.test.tsx': [27]
}
for (const [f, ls] of Object.entries(E)) for (const l of ls) TICKET.add(`tests/unit/renderer/${f}:${l}:E`)
// F 段
TICKET.add('scripts/check-quality.mjs:99:F')
// H 段（e2e 注释——非 import 行，单列核对）

const hits = []      // 全部对 14 件名之一的引用命中（file:line:spec:类别）
const extras = []    // 票面清单外命中
let intraEdges = 0   // 域内互引（14 件之间）

for (const f of files) {
  const rel = relative(root, f).replaceAll('\\', '/')
  const text = readFileSync(f, 'utf-8')
  const lines = text.split(/\r?\n/)
  const specs = specifiers(text)
  // 逐行粗扫（import 行 + vi.mock 行 + check-quality 白名单行 + e2e 注释提名行）
  lines.forEach((line, i) => {
    const ln = i + 1
    const matched = MOVED.filter((b) => line.includes(`/${b}'`) || line.includes(`/${b}"`) ||
      line.includes(`'./${b}'`) || line.includes(`"./${b}"`) ||
      (line.includes(b) && /\.(ts|tsx|mjs|js)$/.test(extname(f)) && /['"]/.test(line) &&
        new RegExp(`(^|[^\\w./-])${b.replace('.', '\\.')}(['"]|$)`).test(line)))
    if (matched.length === 0) return
    // 只记真正指向 reader 域（相对 './x'、'../reader/x'、'...reader/x' 或 check-quality 白名单 'reader/x'）
    const pointing = matched.some((b) =>
      new RegExp(`(\\./|/reader/|reader/|'\\./)${b.replace('.', '\\.')}(\\.|['"])`).test(line) ||
      line.includes(`'./${b}'`) || line.includes(`reader/${b}`))
    if (!pointing) return
    const key = `${rel}:${ln}`
    const ticketed = [...TICKET].some((t) => t.startsWith(`${key}:`))
    const inMovedFile = rel.startsWith('src/renderer/features/reader/') &&
      MOVED_SET.has(basename(rel).replace(/\.tsx?$/, ''))
    hits.push({ key, line: line.trim(), matched, ticketed, inMovedFile, rel })
    if (ticketed) return
    if (inMovedFile) { intraEdges++; return } // 域内互引（票面 25 处零改写）
    extras.push({ key, line: line.trim().slice(0, 160), matched })
  })
  void specs
}

// 域内互引独立计数：14 件内 './sibling' 指向 14 件之一的 import 说明符
let intraBySpec = 0
for (const b of MOVED) {
  const f = join(READER, b + (statSync(join(READER, b + '.ts')).isFile() ? '.ts' : '.tsx'))
  const text = readFileSync(f, 'utf-8')
  for (const s of specifiers(text)) {
    if (s.startsWith('./')) {
      const target = s.slice(2).replace(/\.(ts|tsx)$/, '')
      if (MOVED_SET.has(target)) intraBySpec++
    }
  }
}

const cCount = hits.filter((h) => h.ticketed && h.key.includes(':C'.replace(':C', '')) && [...TICKET].some((t) => t.startsWith(`${h.key}:C`))).length
const eCount = hits.filter((h) => [...TICKET].some((t) => t.startsWith(`${h.key}:E`))).length

console.log('=== G6 recon3 独立复核 ===')
console.log(`扫描文件数: ${files.length}`)
console.log(`票面 C 段命中: ${[...TICKET].filter((t) => t.endsWith(':C')).length} 登记 / ${cCount} 实命中`)
console.log(`票面 D 段命中: ${[...TICKET].filter((t) => t.endsWith(':D')).length} 登记 / ${hits.filter((h) => [...TICKET].some((t) => t.startsWith(`${h.key}:D`))).length} 实命中`)
console.log(`票面 E 段命中: ${[...TICKET].filter((t) => t.endsWith(':E')).length} 登记 / ${eCount} 实命中`)
console.log(`域内互引（行级计）: ${intraEdges}；说明符级计: ${intraBySpec}（票面=25）`)
console.log(`清单外命中（应分类复核）: ${extras.length}`)
for (const x of extras) console.log(`  EXTRA ${x.key}: ${x.line}`)
// F 段白名单行核对（check-quality :99 + :87 注释行形态）
const cq = readFileSync(join(root, 'scripts', 'check-quality.mjs'), 'utf-8').split(/\r?\n/)
console.log(`F 段 check-quality.mjs:87 => ${cq[86].trim().slice(0, 100)}`)
console.log(`F 段 check-quality.mjs:99 => ${cq[98].trim().slice(0, 100)}`)
// H 段 e2e 注释提名核对
const e2e = readFileSync(join(root, 'tests', 'e2e', 'z-wg1-probe.spec.ts'), 'utf-8').split(/\r?\n/)
console.log(`H 段 z-wg1-probe.spec.ts:7 含旧径提名 => ${e2e[6].includes('annotation-resolve.ts:224')}`)
