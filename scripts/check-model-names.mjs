#!/usr/bin/env node
/**
 * check-model-names.mjs —— 模型代号门禁（清洗批 2026-09-16 落盘）。
 *
 * 职责：扫 src/** 的 .ts/.tsx（排除 *.test.* / *.spec.*——tests/ 目录不在扫描
 * 面，测试描述串由 F-TESTREF-00 指纹门自守），注释或字符串中出现 AI 模型
 * 代号（过程痕迹，与"独立开发"口径冲突）即红。词表用字符串拼接构造，
 * 本文件自身不在扫描面（scripts/），无自匹配问题。子串匹配=与基线
 * `git grep -niE` 同口径（实测零误报；如出现同形词误报再收紧词边界）。
 *
 * 供 check-quality.mjs 第 8 段 import 调用（先例=scanDuplicateConstants）；
 * 也可独立运行：node scripts/check-model-names.mjs（exit 1=有命中）。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const MODEL_TOKENS = ['g' + 'lm', 'deep' + 'seek', 'ki' + 'mi']
const TOKEN_RE = new RegExp(MODEL_TOKENS.join('|'), 'gi')

function walkSrc(root, dir = join(root, 'src'), acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'out' || name === 'dist') continue
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walkSrc(root, p, acc)
    else if (/\.(ts|tsx)$/.test(name) && !/\.(test|spec)\./.test(name)) acc.push(p)
  }
  return acc
}

export function scanModelNames(root = process.cwd()) {
  const violations = []
  for (const f of walkSrc(root)) {
    const rel = relative(root, f).replaceAll('\\', '/')
    const lines = readFileSync(f, 'utf-8').split('\n')
    lines.forEach((line, i) => {
      const m = line.match(TOKEN_RE)
      if (m) violations.push(`${rel}:${i + 1}: 模型代号 "${m[0]}"（过程痕迹不入源码——清洗批 2026-09-16 起）`)
    })
  }
  return violations
}

if (process.argv[1].replaceAll('\\', '/').endsWith('check-model-names.mjs')) {
  const hits = scanModelNames()
  for (const h of hits) console.error('  - ' + h)
  if (hits.length > 0) {
    console.error(`model-names 检查未通过：${hits.length} 处命中`)
    process.exit(1)
  }
  console.log('model-names 检查通过：src 下零模型代号')
}
