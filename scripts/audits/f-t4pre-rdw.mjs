// F-LINT-04-T4PRE 对账探针：var() 引用集 R − theme.css 定义集 D − 动态注入白名单 W
// （T4 上线门槛=R−D−W=∅——Kimi 设计书 2.4；本探针同时服务 T4PRE 前置证明与
//  T4 主票上线门槛复核，改前/改后各跑一次留档）
// W=DYNAMIC_TOKENS 前身（T4 落地时迁驻 check-quality 单源）：动态注入 2 条已盘
//   --ui-scale/--scale-factor（注入点代码侧注释互指在 T4 票面落地）
// 扫描域：src/**/*.css + src/**/*.{ts,tsx}（CSS 面+代码面 var() 引用）
// 输出：R/D/W 基数+差集逐名+exit（差集空=0/非空=1——可作门槛断言）
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const W = new Set(['--ui-scale', '--scale-factor'])
const VAR_REF = /var\(\s*(--[\w-]+)/g
const VAR_DEF = /^\s*(--[\w-]+)\s*:/gm

function walk(dir, exts, out = []) {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === 'out' || e === 'dist') continue
    const p = join(dir, e)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, exts, out)
    else if (exts.some((x) => e.endsWith(x))) out.push(p)
  }
  return out
}

const R = new Map() // 引用名 → [file:line]
for (const f of walk(join(ROOT, 'src'), ['.css', '.ts', '.tsx'])) {
  const rel = relative(ROOT, f).replaceAll('\\', '/')
  const text = readFileSync(f, 'utf8')
  // 注释剥离（Kimi 2.4：注释叙述不入引用集——--gold-night 退役史先例）
  const stripped = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  for (const line of stripped.split('\n')) {
    for (const m of line.matchAll(VAR_REF)) {
      if (!R.has(m[1])) R.set(m[1], [])
      R.get(m[1]).push(`${rel}`)
    }
  }
}
const D = new Set()
const themePath = join(ROOT, 'src/renderer/shared/theme.css')
for (const m of readFileSync(themePath, 'utf8').matchAll(VAR_DEF)) D.add(m[1])

const diff = [...R.keys()].filter((n) => !D.has(n) && !W.has(n))
console.log(`R(引用)=${R.size}  D(定义)=${D.size}  W(白名单)=${W.size}`)
console.log(`R−D−W=${diff.length ? diff.map((n) => `${n} ← ${R.get(n).join(',')}`).join(' ; ') : '∅'}`)
process.exit(diff.length ? 1 : 0)
