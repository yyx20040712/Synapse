#!/usr/bin/env node
/**
 * check-locks.mjs —— 受锁文件完整性关卡（受锁文件）。
 * 重算受锁文件 sha256 并与 locks/manifest.json 对账；任何差异即 CI 红。
 * 想合法修改受锁文件：scripts/unlock-protected.ps1 → 修改 → lock-protected.ps1 重新生成
 * manifest → 提交信息带 [locked-change] 尾注。
 */
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = process.cwd()

function walk(dir, filter, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'out' || name === 'dist' || name === '.git' || name === 'coverage') continue
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, filter, acc)
    else if (filter(p)) acc.push(p)
  }
  return acc
}

/** 受锁集合（与 lock-protected.ps1 保持一致——修改需 [locked-change]） */
function protectedFiles() {
  const files = [
    ...walk(join(root, 'tests'), () => true),
    ...walk(join(root, 'src', 'shared'), () => true),
    ...walk(join(root, 'src', 'main', 'db', 'migrations'), () => true),
    ...walk(root, (p) => /\.test\.tsx?$/.test(p)),
    join(root, 'vitest.config.ts'),
    join(root, 'eslint.config.js'),
    join(root, '.github', 'workflows', 'ci.yml'),
    ...walk(join(root, 'scripts'), (p) => p.endsWith('.mjs') || p.endsWith('.ps1'))
  ].filter((p) => existsSync(p))
  return [...new Set(files)].sort()
}

const manifestPath = join(root, 'locks', 'manifest.json')
if (!existsSync(manifestPath)) {
  console.error('locks/manifest.json 不存在——先运行 npm run locks:apply')
  process.exit(1)
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8').replace(/^\uFEFF/, ''))
const recorded = new Map(manifest.files.map((e) => [entryNormalize(entryPath(e)), entryHash(e)]))
function entryPath(e) { return e.path }
function entryHash(e) { return e.sha256 }
function entryNormalize(p) { return p.replaceAll('\\', '/') }

const actual = new Map()
for (const f of protectedFiles()) {
  const rel = relative(root, f).replaceAll('\\', '/')
  actual.set(rel, createHash('sha256').update(readFileSync(f)).digest('hex'))
}

const violations = []
for (const [path, sha] of actual) {
  if (!recorded.has(path)) {
    violations.push(`新增受锁文件未登记：${path}（运行 npm run locks:apply 并带 [locked-change] 提交）`)
  } else if (recorded.get(path) !== sha) {
    violations.push(`受锁文件被修改：${path}（回滚，或走 unlock → 改 → relock → [locked-change] 流程）`)
  }
}
for (const path of recorded.keys()) {
  if (!actual.has(path)) {
    violations.push(`manifest 中的文件已删除：${path}（删受锁文件也需 [locked-change]）`)
  }
}

if (violations.length > 0) {
  console.error('locks 检查未通过：')
  for (const v of violations) console.error('  - ' + v)
  process.exit(1)
}
console.log(`locks 检查通过：${actual.size} 个受锁文件与 manifest 一致`)
