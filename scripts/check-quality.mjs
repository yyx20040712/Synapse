#!/usr/bin/env node
/**
 * check-quality.mjs —— 质量扫描关卡（受锁文件）。
 * 检查：占位标记 / 乱码特征 / renderer features 跨域互引。
 * 退出码 1 = CI 红。规则依据 AGENTS.md（文档无强制等于没写）。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'

const root = process.cwd()
const violations = []

function walk(dir, filter, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'out' || name === 'dist' || name === '.git') continue
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, filter, acc)
    else if (filter(p)) acc.push(p)
  }
  return acc
}

const srcFiles = walk(join(root, 'src'), (p) => /\.(ts|tsx)$/.test(p))
const testFiles = walk(join(root, 'tests'), (p) => /\.(ts|tsx)$/.test(p))

// 1) 占位标记（NotImplementedError 机制除外——那是受控工单占位，由 check-tickets 管）
const PLACEHOLDER_RE = /\b(TODO|FIXME|XXX|HACK)\b|placeholder/i
for (const f of [...srcFiles, ...testFiles]) {
  const content = readFileSync(f, 'utf-8')
  const m = content.match(PLACEHOLDER_RE)
  if (m) violations.push(`${relative(root, f)}: 占位标记 "${m[0]}"（完成或删除，不许留标记）`)
}

// 2) 乱码特征（GBK/UTF-8 双重编码典型串——教训 D1：乱码断言曾让测试永远"通过"）
const MOJIBAKE_RE = /锟斤拷|娌℃湁|鎵撳紑|鏄痑|\uFFFD/
for (const f of [...srcFiles, ...testFiles, join(root, 'AGENTS.md'), join(root, 'README.md')]) {
  try {
    const content = readFileSync(f, 'utf-8')
    if (MOJIBAKE_RE.test(content)) violations.push(`${relative(root, f)}: 检测到乱码特征串`)
  } catch {
    // 文件不存在则跳过
  }
}

// 3) renderer features 跨域互引（依赖只能下沉到 renderer/shared）
//    组合根例外（工单冻结规约明文声明，键=文件正斜杠路径 → 值=允许引用的目标模块
//    相对 features 根的路径）：SR-LIB-04 "由本文件作为组合根引用子组件"、
//    SR-LIB-05 "TagFilter 组件嵌于此"。SR2-TABS-03（2026-08-24）：tab-dirty 是
//    灰点信号的跨域聚合器（B3 裁决 α 双层两写面=reader 的 TabState.dirty +
//    notes 的 pending 镜像），聚合职责即消费 notes.store——受控例外，reader
//    域其余文件引用 notes 仍是红线。SR2-C-03（2026-08-26）：ReaderNotesPanel 是
//    α 双层的阅读器编辑面（B3 裁决 1——总评层消费 notes.store 与库侧同语义，
//    notes.store 留驻 notes 域），tab-dirty 同型受控例外
const COMPOSITION_ROOT_ALLOW = new Map([
  ['src/renderer/features/library/PaperDetailPanel.tsx', ['tags/TagEditor']],
  ['src/renderer/features/library/FilterBar.tsx', ['tags/TagFilter']],
  ['src/renderer/features/reader/tab-dirty.ts', ['notes/notes.store']],
  ['src/renderer/features/reader/ReaderNotesPanel.tsx', ['notes/notes.store']]
])

const featuresRoot = join(root, 'src', 'renderer', 'features')
for (const f of srcFiles.filter((p) => p.startsWith(featuresRoot))) {
  const relFromFile = relative(root, f).replaceAll('\\', '/')
  const allowed = COMPOSITION_ROOT_ALLOW.get(relFromFile) ?? []
  const content = readFileSync(f, 'utf-8')
  const importRe = /from\s+['"](\.[^'"]+)['"]/g
  let m
  while ((m = importRe.exec(content)) !== null) {
    const target = join(dirname(f), m[1]).replaceAll('\\', '/')
    const rel = relative(featuresRoot.replaceAll('\\', '/'), target).replaceAll('\\', '/')
    const firstSeg = rel.split('/')[0] ?? ''
    const myFeature = relative(featuresRoot, f).split('\\')[0] ?? ''
    if (
      !rel.startsWith('..') &&
      firstSeg !== myFeature &&
      !allowed.includes(rel) &&
      readdirSync(featuresRoot).some((d) => d === firstSeg && statSync(join(featuresRoot, d)).isDirectory())
    ) {
      violations.push(`${relFromFile}: 跨 feature 引用 ${m[1]}（共享代码下沉 renderer/shared）`)
    }
  }
}

// 4) 行数分级（全局 ≤500 由 ESLint max-lines error；此处补 AGENTS 的分层上限）
//    repo ≤300 行；renderer 组件（.tsx）≤250 行——弱模型填充期最容易超的就是这两类
for (const f of srcFiles) {
  const rel = relative(root, f).replaceAll('\\', '/')
  const lines = readFileSync(f, 'utf-8').split('\n').length
  if (/^src\/main\/db\/repos\/.*\.repo\.ts$/.test(rel) && lines > 300) {
    violations.push(`${rel}: repo 文件 ${lines} 行超上限 300（拆查询/映射子函数）`)
  }
  if (/^src\/renderer\/.*\.tsx$/.test(rel) && lines > 250) {
    violations.push(`${rel}: 组件文件 ${lines} 行超上限 250（拆子组件）`)
  }
}

// 5) 分层方向（解析后绝对路径判断——ESLint glob 分不清 shared/ipc 契约与 main/ipc 层）
//    services 不得 import main/ipc；db 不得 import services / main/ipc
const layerRules = [
  { layer: join(root, 'src', 'main', 'services'), forbids: [join(root, 'src', 'main', 'ipc')] },
  {
    layer: join(root, 'src', 'main', 'db'),
    forbids: [join(root, 'src', 'main', 'services'), join(root, 'src', 'main', 'ipc')]
  }
]
const relImportRe = /from\s+['"](\.[^'"]+)['"]/g
for (const { layer, forbids } of layerRules) {
  for (const f of srcFiles.filter((p) => p.startsWith(layer))) {
    const content = readFileSync(f, 'utf-8')
    let m
    while ((m = relImportRe.exec(content)) !== null) {
      const target = resolve(dirname(f), m[1])
      for (const bad of forbids) {
        if (target === bad || target.startsWith(bad + sep)) {
          violations.push(
            `${relative(root, f)}: 分层违规，import 了 ${m[1]}（${relative(root, bad).replaceAll('\\', '/')} 是上层，依赖只能单向）`
          )
        }
      }
    }
  }
}

if (violations.length > 0) {
  console.error('quality 检查未通过：')
  for (const v of violations) console.error('  - ' + v)
  process.exit(1)
}
console.log('quality 检查通过：无占位标记 / 无乱码 / 无跨域引用')
