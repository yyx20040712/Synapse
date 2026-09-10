// F-LINT-04 T2 前置 dry-run：全仓 tsx 色值形态基数盘点（终裁档 §2 表前置项）
// 盘点四面（对 src/**/*.tsx，规则面域=src/renderer，基线对照两口径都出）：
//   A 模块常量色值表：VariableDeclarator.init unwrap（as const/satisfies/
//     Object.freeze）后 ObjectExpression，逐属性 Literal 值命中 COLOR_RE
//     ——区分裸对象/as const/satisfies/freeze 四形态（deepseek 硬伤①②面）
//   B 单值色值常量：init=Literal 直接命中（含 '#fff' as const 字符串包裹）
//   C JSX attr 面：任意属性名 Literal 值命中——分三组：
//     C1 已知 SVG camelCase 表（stopColor/floodColor/lightingColor）
//     C2 kebab 同族 JSX 形态（stop-color 等——探针未分组计数；JSXIdentifier
//        实证可含连字符[T2 R11 红证]，规则显式表已纳 kebab 三词）
//     C3 兜底域（fill|stroke|color|*Color 结尾）
//     C4 其他属性名（现行设计不报——盘基数防意外面）
//   D 现行 B-5 style 面基线对照（应=0——存量绿基线）
// 输出：形态基数表+逐处清单（file:line/形态/名/值）
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Linter } from 'eslint'
import tsParser from '@typescript-eslint/parser'
import { COLOR_RE, stripUrlFunctions } from '../color-re.mjs'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const linter = new Linter({ configType: 'flat' })
const hits = { A: [], B: [], C1: [], C3: [], C4: [], D: [] }

function walkTsxFrames(dir) {
  const out = []
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    const st = statSync(p)
    if (st.isDirectory()) out.push(...walkTsxFrames(p))
    else if (e.endsWith('.tsx')) out.push(p)
  }
  return out
}

const hitsLiteral = (val) =>
  val && val.type === 'Literal' && typeof val.value === 'string' &&
  COLOR_RE.test(stripUrlFunctions(val.value))

// init 层 unwrap：TSAsExpression / TSSatisfiesExpression / Object.freeze(Call)
// 递归（Object.freeze({...} as const) 双层）——一层 vs 多层差值单独记
function unwrapInit(node, depth = 0) {
  if (depth > 4) return { node, via: depth ? `unwrap×${depth}` : 'bare' }
  if (node.type === 'TSAsExpression' || node.type === 'TSSatisfiesExpression') {
    return unwrapInit(node.expression, depth + 1)
  }
  if (node.type === 'CallExpression' &&
      node.callee.type === 'MemberExpression' &&
      node.callee.object?.type === 'Identifier' && node.callee.object.name === 'Object' &&
      node.callee.property?.type === 'Identifier' && node.callee.property.name === 'freeze') {
    return unwrapInit(node.arguments[0], depth + 1)
  }
  return { node, via: depth ? (depth === 1 ? 'as-const/satisfies/freeze×1' : `unwrap×${depth}`) : 'bare' }
}

const probe = {
  create(context) {
    return {
      VariableDeclarator(node) {
        const { node: init, via } = unwrapInit(node.init || {})
        if (!init) return
        const name = node.id.type === 'Identifier' ? node.id.name : '(destructured)'
        if (init.type === 'ObjectExpression') {
          for (const prop of init.properties) {
            if (prop.type !== 'Property' || prop.key?.type !== 'Identifier') continue
            if (hitsLiteral(prop.value)) {
              hits.A.push({ file: context.filename, line: node.loc.start.line, form: via,
                varName: name, prop: prop.key.name, value: prop.value.value })
            }
          }
        } else if (init.type === 'Literal' && via !== 'bare') {
          // '#fff' as const 等包裹单值；裸单值常量另记 B-bare
          if (hitsLiteral(init)) hits.B.push({ file: context.filename, line: node.loc.start.line,
            form: via, varName: name, value: init.value })
        } else if (init.type === 'Literal' && via === 'bare') {
          if (hitsLiteral(init)) hits.B.push({ file: context.filename, line: node.loc.start.line,
            form: 'bare', varName: name, value: init.value })
        }
      },
      JSXAttribute(node) {
        if (node.name.type !== 'JSXIdentifier') return
        const attr = node.name.name
        if (!node.value || node.value.type !== 'Literal') return
        const s = String(node.value.value)
        if (!COLOR_RE.test(stripUrlFunctions(s))) return
        const rec = { file: context.filename, line: node.loc.start.line, attr, value: s }
        if (['stopColor', 'floodColor', 'lightingColor'].includes(attr)) hits.C1.push(rec)
        else if (attr === 'fill' || attr === 'stroke' || attr === 'color' || /Color$/.test(attr)) hits.C3.push(rec)
        else hits.C4.push(rec)
        if (attr === 'style') hits.D.push(rec)
      }
    }
  }
}

const files = walkTsxFrames(join(ROOT, 'src'))

// self-check：已知形态样本必须全命中（防规则未加载=假零；命中数错即 exit 1）
;(function selfCheck() {
  const before = { A: hits.A.length, B: hits.B.length, C1: hits.C1.length, C3: hits.C3.length }
  const sample = `const TABLE = { hi: '#ff0000' } as const
const TABLE2 = Object.freeze({ bg: '#abc' })
const SINGLE = '#fff' as const
export const E = () => <svg><rect stopColor="#123456" fill="#abcdef" data-x="#ff0000" /></svg>
export const KEEP = TABLE
`
  linter.verify(sample, {
    files: ['**/*.tsx'],
    languageOptions: { parser: tsParser, ecmaVersion: 'latest', sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { probe: { rules: { dryrun: probe } } },
    rules: { 'probe/dryrun': 'error' }
  }, { filename: 'self-check.tsx' })
  const expect = { A: before.A + 2, B: before.B + 1, C1: before.C1 + 1, C3: before.C3 + 1 }
  const got = { A: hits.A.length, B: hits.B.length, C1: hits.C1.length, C3: hits.C3.length }
  for (const k of Object.keys(expect)) {
    if (expect[k] !== got[k]) {
      console.error(`self-check FAIL: ${k} expect=+${expect[k] - before[k]} got=+${got[k] - before[k]}`)
      console.error(`sample 命中明细：${JSON.stringify(hits[k])}`)
      process.exit(1)
    }
  }
  hits.A.length = before.A; hits.B.length = before.B
  hits.C1.length = before.C1; hits.C3.length = before.C3
  hits.C4.length = 0 // 样本 data-x 属 C4，剥离（C4 仅真实仓基数）
  console.log('self-check OK（A+2/B+1/C1+1/C3+1 全命中——规则实跑证明）')
})()

let rendererFiles = 0
for (const f of files) {
  const rel = relative(ROOT, f).replaceAll('\\', '/')
  const isRenderer = rel.startsWith('src/renderer/')
  if (isRenderer) rendererFiles++
  const code = readFileSync(f, 'utf8')
  const messages = linter.verify(code, {
    files: ['**/*.tsx'],
    languageOptions: { parser: tsParser, ecmaVersion: 'latest', sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true }, filePath: rel } },
    plugins: { probe: { rules: { dryrun: probe } } },
    rules: { 'probe/dryrun': 'error' }
  }, { filename: rel })
  // 探针不 report（只收集），verify 无输出=正常；parser error 才会出 messages
  if (messages.length) console.log(`[parser] ${rel}: ${messages.map(m => m.message).join('; ')}`)
}

const byForm = (arr) => arr.reduce((m, x) => (m[x.form] = (m[x.form] || 0) + 1, m), {})
const sum = (arr) => arr.reduce((s, x) => s + (x.count ?? 1), 0)
console.log(`\n=== F-LINT-04 T2 dry-run（tsx 总数=${files.length}，renderer 面=${rendererFiles}）===`)
console.log(`A 模块常量色值表命中=${hits.A.length} 形态分列=`, JSON.stringify(byForm(hits.A)))
console.log(`B 单值色值常量命中=${hits.B.length} 形态分列=`, JSON.stringify(byForm(hits.B)))
console.log(`C1 已知 SVG camelCase 表=${hits.C1.length}  C3 兜底域=${hits.C3.length}  C4 其他属性=${hits.C4.length}`)
console.log(`D 现行 style 面基线=${hits.D.length}（存量绿=应 0）`)
const dump = (tag, arr) => arr.forEach(x => console.log(`  [${tag}] ${x.file}:${x.line} ${JSON.stringify(x)}`))
dump('A', hits.A); dump('B', hits.B); dump('C1', hits.C1); dump('C3', hits.C3); dump('C4', hits.C4); dump('D', hits.D)
console.log(`sum-check=${sum(hits.A) + sum(hits.B) + hits.C1.length + hits.C3.length + hits.C4.length}`)
