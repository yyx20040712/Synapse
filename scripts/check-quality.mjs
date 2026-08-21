#!/usr/bin/env node
/**
 * check-quality.mjs —— 质量扫描关卡（受锁文件）。
 * 检查：占位标记 / 乱码特征 / renderer features 跨域互引。
 * 退出码 1 = CI 红。规则依据 AGENTS.md（文档无强制等于没写）。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'

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
const featuresRoot = join(root, 'src', 'renderer', 'features')
for (const f of srcFiles.filter((p) => p.startsWith(featuresRoot))) {
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
      readdirSync(featuresRoot).some((d) => d === firstSeg && statSync(join(featuresRoot, d)).isDirectory())
    ) {
      violations.push(`${relative(root, f)}: 跨 feature 引用 ${m[1]}（共享代码下沉 renderer/shared）`)
    }
  }
}

if (violations.length > 0) {
  console.error('quality 检查未通过：')
  for (const v of violations) console.error('  - ' + v)
  process.exit(1)
}
console.log('quality 检查通过：无占位标记 / 无乱码 / 无跨域引用')
