/**
 * F-LINT-02 设计期存量 dry-run（⑤i 条款首践——设计书必须附存量统计输出）。
 * B-1 跨文件同值双常量存量普查：src/** 生产面模块级 const 声明按字面量值
 * 分组，同值出现在 ≥2 个不同文件 = 候选命中。原始全量输出（白名单过滤=
 * 设计链三跳的裁决面，此处只供数）。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = process.cwd()
function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'out' || name === 'dist' || name === '.git') continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, acc)
    else if (/\.tsx?$/.test(name) && !/\.test\./.test(name)) acc.push(p)
  }
  return acc
}

const files = walk(join(root, 'src'))
// 模块级（缩进 0）const 声明；值=字符串/数字/布尔字面量（数字含 15_000 分隔符形态）
const declRe =
  /^(?:export )?const ([A-Za-z_$][\w$]*)(?:\s*:\s*[^='"]*?)?\s*=\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|-?\d[\d_]*(?:\.[\d_]+)?|true|false)\s*$/gm

const byValue = new Map()
for (const f of files) {
  const rel = relative(root, f).replaceAll('\\', '/')
  const content = readFileSync(f, 'utf8')
  declRe.lastIndex = 0
  let m
  while ((m = declRe.exec(content)) !== null) {
    const v = m[2]
    if (!byValue.has(v)) byValue.set(v, [])
    byValue.get(v).push({ file: rel, name: m[1] })
  }
}

const hits = [...byValue.entries()]
  .filter(([, lst]) => new Set(lst.map((x) => x.file)).size >= 2)
  .sort((a, b) => b[1].length - a[1].length)
const totalDecls = [...byValue.values()].reduce((n, l) => n + l.length, 0)
console.log(`扫描文件：${files.length}（src 生产面，.test. 除外）`)
console.log(`字面量值 const 声明总数：${totalDecls}（去重值 ${byValue.size}）`)
console.log(`同值跨文件组：${hits.length}`)
for (const [v, lst] of hits) {
  const filesOf = [...new Set(lst.map((x) => x.file))]
  console.log(`\n值 ${v}（${filesOf.length} 文件 / ${lst.length} 声明）`)
  for (const x of lst) console.log(`  ${x.file}: ${x.name}`)
}
