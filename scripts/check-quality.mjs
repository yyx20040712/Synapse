#!/usr/bin/env node
/**
 * check-quality.mjs —— 质量扫描关卡（受锁文件）。
 * 检查：Node 版本守卫 / 占位标记 / 乱码特征 / renderer features 跨域互引
 * / CSS 字号+颜色字面量消费负锚（第 6 段——[F-LINT-04 ③ 2026-09-10 起
 * COLOR_RE 单源=scripts/color-re.mjs，本件与 eslint.config.js B-5 均
 * import 该件；双写面物理消失，6b 哨兵段哨内联回退）/ 色值 token 同值
 * 守卫（②）/ 内联回退哨兵（③，6b 段）/ var() 语义锚（C-4c，6c 段——
 * R−D−W 悬空引用集空性，DYNAMIC_TOKENS 白名单单源）/ 同值双常量（第 7 段）
 * / e2e 截图比对负锚（第 9 段——INV-64）。
 * 退出码 1 = CI 红。规则依据 AGENTS.md（文档无强制等于没写）。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import postcss from 'postcss'
import { COLOR_RE, META_RE, stripUrlFunctions } from './color-re.mjs'
import { scanDuplicateConstants, formatDupDetails, clipped } from './check-dup-constants.mjs'
import { scanModelNames } from './check-model-names.mjs'

const root = process.cwd()
const violations = []

// 0) Node 版本守卫（2026-09-02 三波场入锁）：本项目锁定 Node 24（CI
//    ci.yml node-version=24；本地经 Volta 项目 pin——package.json "volta"
//    字段）。他应用曾把 D:\nodejs 静默升到 25.2.1，vitest 2.1.9 在 25 下
//    jsdom localStorage 装载破损（split-pane 11 用例结构性假红——node24
//    对照 11/11 绿实证）。本守卫在 verify 第一步拦截，防假红浪费排查。
//    豁免口：CI 环境自身 node-version=24 恒过；刻意用它版本跑时设
//    SYNAPSE_SKIP_NODE_GUARD=1（自负其责，如 vitest 升级票验证场）。
const NODE_MAJOR_REQUIRED = 24
const nodeMajor = Number(process.versions.node.split('.')[0])
if (process.env.CI !== 'true' && process.env.SYNAPSE_SKIP_NODE_GUARD !== '1' && nodeMajor !== NODE_MAJOR_REQUIRED) {
  violations.push(
    `Node 主版本 ${nodeMajor}≠${NODE_MAJOR_REQUIRED}（CI 口径）——vitest jsdom 将假红（split-pane 11 用例在档）。` +
    `本项目经 Volta pin node@24（新 shell 应自动生效；未生效检查 PATH 前 "C:\\Program Files\\Volta"）；` +
    `确需跳过：SYNAPSE_SKIP_NODE_GUARD=1`
  )
}

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
//    notes.store 留驻 notes 域），tab-dirty 同型受控例外。SR2-AI-04（2026-08-27）：
//    useExportCorpusEvents 是提取管线的 App 层组合根（AI-02 票面明文：生产组装=
//    该 hook 注入 loadPdfDocument+corpusItem——CorpusExtractor 留驻 reader 域因
//    INV-16 pdfjs 白名单锚定其路径），聚合职责即消费提取器——受控例外，settings
//    域其余文件引用 reader 仍是红线。SR2-LG-04（2026-08-27）：LineageSideAiNotes
//    是脉络侧板的 AI 笔记分节（蓝图 N3 四区之一），分色/中文标签消费
//    ai-note-style 单源（INV-11——跨域复用与域内复写二害取轻：白名单受控
//    例外防映射双源；数据面走 window.api 直连不经 reader store，见该域
//    W4 裁决），lineage 域其余文件引用 reader 仍是红线。A3（2026-09-02）：
//    workspace.store 是课题切换弃改收口点（INV-35④ 显式防悬置写兑现——切课题
//    确认后 discardAll notes 悬置编辑，聚合职责即消费 notes.store），
//    workspaces 域其余文件引用 notes 仍是红线
const COMPOSITION_ROOT_ALLOW = new Map([
  ['src/renderer/features/library/PaperDetailPanel.tsx', ['tags/TagEditor']],
  ['src/renderer/features/library/FilterBar.tsx', ['tags/TagFilter']],
  ['src/renderer/features/reader/state/tab-dirty.ts', ['notes/notes.store']],
  ['src/renderer/features/reader/panels/ReaderNotesPanel.tsx', ['notes/notes.store']],
  ['src/renderer/features/settings/useExportCorpusEvents.ts', ['reader/state/CorpusExtractor']],
  ['src/renderer/features/lineage/LineageSideAiNotes.tsx', ['reader/anchors/ai-note-style']],
  ['src/renderer/features/workspaces/workspace.store.ts', ['notes/notes.store']]
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

// 4b) [F-CSS-01] CSS 行数关卡——token/皮肤域分离防回归（theme.css 分域拆件
//     后登记;拆件现状最大件 ~236 行,450 上限留增长余量;同 split('\n') 口径）。
//     独立收集面：不并入 srcFiles（ts/tsx 占位/乱码扫描面不意外扩到 CSS）。
for (const f of walk(join(root, 'src', 'renderer'), (p) => p.endsWith('.css'))) {
  const rel = relative(root, f).replaceAll('\\', '/')
  const lines = readFileSync(f, 'utf-8').split('\n').length
  if (lines > 450) {
    violations.push(`${rel}: CSS 文件 ${lines} 行超上限 450（分域拆件——token/皮肤域分离）`)
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

// 6) [F-LINT-01] C-8 全量 CSS 字号负锚——F-CSS-02 W1 通道闭合（新增 CSS
//    自动入锚；与 theme.test.ts 七件测试锚=纵深防御，互不替代）。正则
//    单源=受锁 theme.test.ts FS_DECL 行提取（零正则复制）；读失败/提取
//    null/walk 零 CSS 文件=哨兵硬红（只哨工具失能态——终裁档 §0 攻击面 5）。
//    [W3 哨兵 2026-09-10 F-CSS-03] 提取前对文本 matchAll(/FS_DECL = \//g)
//    计数：>1 处=多处歧义哨兵红——单处 .match() 在多 FS_DECL 形态下静默取
//    第一处，正则漂移即字号锚失明（0 处落入 match null 支双兜底）。
//    [C-4 CSS 颜色字面量消费负锚 2026-09-10 F-CSS-03 落地] 颜色 token 化
//    迁移毕（61+6 存量清零——终裁档 §5 立案顺延件兑现）后同循环落码。
//    [F-LINT-04 T1 2026-09-10] ③COLOR_RE 单源化（本段与 eslint.config.js
//    B-5 均 import scripts/color-re.mjs——双写面物理消失；import 失败
//    fail-closed 抛错）+⑦url() 剥离（stripUrlFunctions——url(#x)=id 引用
//    非色值）+⑥postcss 化（root.walkDecls 声明粒度替代行扫描：decl.prop
//    以 -- 开头=token 定义豁免色值检查——minified 多声明/引号分号边界/
//    行首豁免三题消解；注释面 walkComments 保持⑤裁决=注释色值同禁——
//    F-CSS-03 曾实清 6 行注释色值，postcss 迁移不弱化该面）+②色值域
//    token 同值守卫（值命中 COLOR_RE 的 token 声明归一分组，同值 ≥2 键
//    =红——@theme var() 重绑值天然不命中 COLOR_RE 出域零假阳；#fff/
//    #ffffff 缩写同色、red/#f00 命名等价、命名色裸词=终裁 §4 明示不检）。
//    postcss 解析异常=push violation 非吞错（fail-open 统一，终裁 §1.6）。
const themeTestPath = join(root, 'tests', 'unit', 'renderer', 'theme.test.ts')
let fsDeclRe = null
try {
  const themeTestText = readFileSync(themeTestPath, 'utf-8')
  const declCount = [...themeTestText.matchAll(/FS_DECL = \//g)].length
  if (declCount > 1) {
    violations.push(`哨兵：theme.test.ts FS_DECL 多处（${declCount} 处）歧义——哨兵[W3]：静默取第一处风险，人工消歧（F-CSS-03）`)
  } else {
    const m = themeTestText.match(/FS_DECL = \/(.+)\/gi/)
    if (m) fsDeclRe = new RegExp(m[1], 'gi')
    else violations.push('哨兵：theme.test.ts FS_DECL 提取失败（match null）——哨兵正则或常量行变更（F-LINT-01 C-8）')
  }
} catch (e) {
  violations.push(`哨兵：theme.test.ts 读取失败（${e.message}）——文件缺席即关卡失能（F-LINT-01 C-8）`)
}
const cssAll = walk(join(root, 'src'), (p) => p.endsWith('.css'))
if (cssAll.length === 0) violations.push('哨兵：src 下 walk 零 CSS 文件——结构失能（F-LINT-01 C-8/C-4）')
// ② 收集器：值（url 剥离后）命中 COLOR_RE 的 token 声明——循环后归一判定
const tokenColorDecls = []
for (const f of cssAll) {
  const rel = relative(root, f).replaceAll('\\', '/')
  const content = readFileSync(f, 'utf-8')
  if (fsDeclRe) {
    const hits = content.match(fsDeclRe) ?? []
    if (hits.length > 0) violations.push(`${rel}: CSS 字号字面量 ${hits.length} 处（单源=--fs-* token；样例：${hits.slice(0, 3).join(' / ')}）`)
  }
  let ast
  try {
    ast = postcss.parse(content, { from: rel })
  } catch (e) {
    violations.push(`${rel}: postcss 解析异常（${e.message.split('\n')[0]}）——fail-open 上报非吞错（F-LINT-04 ⑥）`)
    continue
  }
  ast.walkDecls((decl) => {
    const stripped = stripUrlFunctions(decl.value)
    const line = decl.source.start.line
    if (decl.prop.startsWith('--')) {
      // ⑥ token 定义=字面量合法所在地，豁免色值检查；② 但进同值守卫收集
      if (COLOR_RE.test(stripped)) {
        tokenColorDecls.push({ rel, line, prop: decl.prop, norm: stripped.replace(/\s+/g, '').toLowerCase() })
      }
      return
    }
    if (COLOR_RE.test(stripped)) {
      violations.push(`${rel}:${line}: CSS 颜色字面量消费（单源=--* token）：${decl.prop}: ${decl.value.trim().slice(0, 80)}`)
    }
  })
  ast.walkComments((c) => {
    if (COLOR_RE.test(stripUrlFunctions(c.text))) {
      violations.push(`${rel}:${c.source.start.line}: CSS 注释内颜色字面量（注释=文档面第二源，⑤ 裁决同禁）：${c.text.trim().slice(0, 60)}`)
    }
  })
}
// ② 判定：同值守卫跨文件全局聚合（token 定义散布多文件时同值=第二源同性质）。
// [门一 R1 W-2 2026-09-10] 同名 token 重定义非第二源——:root{--x:#fff}+
// .dark{--x:#fff} 主题切换合法重绑会假阳。聚合改 Map<归一值, Map<prop,
// 声明[]>>（同名合并为一键），判定=同值且不同名键 ≥2 才红（红证
// f-lint04-red6-samename.raw.txt：修前假阳实锤→修后绿+异名红证复跑不弱化）。
// [T3-P2 回炉 1 d1-W6 豁免] 主题恒定 token 与族变 token 的**单族**同值=语义
// 隔离合法共存（--close-red-ink 纯白三族恒定[Windows caption 红底白字观感]
// vs --panel 白天族值恰白[暗/护眼族翻深]——合并共享即语义错绑，T3-P1 后
// 该类假阳首次出现）。豁免面=命名 prop 白名单（聚集判定跳过，其余同值对
// 仍红——通道同 DYNAMIC_TOKENS 先例：枚举单源+注释双向互指）。
// [T3-P3 增补] --accent-ink 同族：accent 底字色纯白三族恒定（密度列表 T1
// 徽章/抽屉主钮——mockup .tier.q1/.btn.primary），与 --panel 白天族同值=
// 同语义隔离判例；theme.css --accent-ink 注释互指本常量。
const SAME_VALUE_EXEMPT_PROPS = new Set(['--close-red-ink', '--accent-ink'])
const tokenByNorm = new Map()
for (const d of tokenColorDecls) {
  if (SAME_VALUE_EXEMPT_PROPS.has(d.prop)) continue
  if (!tokenByNorm.has(d.norm)) tokenByNorm.set(d.norm, new Map())
  const byProp = tokenByNorm.get(d.norm)
  if (!byProp.has(d.prop)) byProp.set(d.prop, [])
  byProp.get(d.prop).push(d)
}
for (const [norm, byProp] of tokenByNorm) {
  if (byProp.size >= 2) {
    const parts = [...byProp.values()].map((ds) => ds.map((d) => `${d.prop}（${d.rel}:${d.line}）`).join('/'))
    violations.push(
      `色值 token 同值守卫：${parts.join(' = ')} 同值 ${norm.slice(0, 40)}——颜色 token 同值第二源，同值合并共享单 token（F-LINT-04 ②）`
    )
  }
}

// 6b) [F-LINT-04 ③哨兵] 内联回退哨——读 eslint.config.js+本件自身文本，
//     matchAll(META_RE)（hex 正则特征形态，单源驻 color-re.mjs）计数>0=红：
//     有人回退内联 hex 正则致单源失能。哨兵行自身以 import 的 META_RE
//     执行，其行文本不含 hex 字符类+量词的无反斜杠形态=不自咬（探针实证
//     2026-09-10）；color-re.mjs 是唯一合法宿主，不在扫描面；W3（FS_DECL
//     哨兵）扫的是 theme.test.ts 字号正则，与本哨兵特征不重叠零互咬。
//     [门一 R1 W-1 语义边界] 本哨兵=逐字副本检测（hex 字符类+{3,8} 量词
//     裸形态的原样复制）——序换/量词变体/字符类简写等变形回退不在覆盖面
//     （T2 候选扩展，勿当完备防线）。新增第三消费文件时必须同步扩
//     SENTINEL_SCAN_FILES 枚举（漏扩=新消费面脱离哨兵监控——义务声明）。
//     [门一 R1 W-3 盲区] walkDecls+walkComments 不覆盖 at-rule prelude
//     （@supports/@import 等行内色值）——存量零命中+形态极罕见，明示
//     盲区不检。
const SENTINEL_SCAN_FILES = [join(root, 'eslint.config.js'), join(root, 'scripts', 'check-quality.mjs')]
for (const sp of SENTINEL_SCAN_FILES) {
  const text = readFileSync(sp, 'utf-8')
  const hits = [...text.matchAll(META_RE)]
  if (hits.length > 0) {
    violations.push(`${relative(root, sp)}: 内联 hex 正则回退 ${hits.length} 处（哨兵[F-LINT-04 ③]：COLOR_RE 单源=scripts/color-re.mjs，禁内联回退/字符串拼正则——单源失能即红）`)
  }
}

// 6c) [F-LINT-04 T4] C-4c var() 语义锚——跨文件聚合独立 pass（B-1 check-dup-constants
//     独立 pass 先例——R−D−W 三集聚合超 eslint 单文件隔离模型，载体=check-quality）。
//     R=src 全域（.css/.ts/.tsx）注释剥离后 matchAll /var\(\s*(--[\w-]+)/g 引用名集
//     （Map<名, Set<相对路径>>——红时逐名列引用文件）；注释叙述不入 R
//     （--gold-night 退役史先例，Kimi 设计书 2.4）。CSS 只剥 /* */ 块注释
//     （CSS 无 // 语法，不误伤 url(//host) 形态）；ts/tsx 加剥行首 // 注释。
//     D=theme.css 定义名集，postcss walkDecls 提取——AST 天然剥注释（注释内
//     --name: 伪定义不进 D=探针 f-t4pre-rdw.mjs VAR_DEF 不剥注释已知差异点的
//     加固，门一 T4PRE N3）；仅 theme.css=token 定义单源纪律机器锚定——他 css
//     文件定义 token 被引用即红=防漂移非误报。@theme 重绑 var() 消费
//     （--text-xs: var(--fs-body)）天然 R∩D 自洽不红；theme-shell.css
//     var(--ui-scale, 1) fallback=动态注入时序容错非色值 token fallback——
//     捕获组取首参不受影响，维持。扫描任一异常=push violation 非吞错
//     （fail-open 统一，终裁 §1.6）。
// DYNAMIC_TOKENS=C-4c 白名单单源——注入点代码侧注释回指本常量名（双向互指辅链）：
//   --ui-scale     → App.tsx:136（documentElement.style.setProperty 动态注入）
//   --scale-factor → TextLayer.tsx:151（textLayer 容器 style 键动态注入）
const DYNAMIC_TOKENS = ['--ui-scale', '--scale-factor']
const VAR_REF_RE = /var\(\s*(--[\w-]+)/g
const varRefFiles = walk(join(root, 'src'), (p) => /\.(css|ts|tsx)$/.test(p))
const varRefMap = new Map() // 引用名 → Set<相对路径>
for (const f of varRefFiles) {
  const rel = relative(root, f).replaceAll('\\', '/')
  let text
  try {
    text = readFileSync(f, 'utf-8')
  } catch (e) {
    violations.push(`${rel}: C-4c 读取失败（${e.message}）——fail-open 上报非吞错（F-LINT-04 T4）`)
    continue
  }
  let stripped = text.replace(/\/\*[\s\S]*?\*\//g, '')
  if (!rel.endsWith('.css')) stripped = stripped.replace(/^\s*\/\/.*$/gm, '')
  for (const m of stripped.matchAll(VAR_REF_RE)) {
    if (!varRefMap.has(m[1])) varRefMap.set(m[1], new Set())
    varRefMap.get(m[1]).add(rel)
  }
}
const varDefSet = new Set()
let varDefOk = true
try {
  postcss
    .parse(readFileSync(join(root, 'src/renderer/shared/theme.css'), 'utf-8'), { from: 'src/renderer/shared/theme.css' })
    .walkDecls((decl) => {
      if (decl.prop.startsWith('--')) varDefSet.add(decl.prop)
    })
} catch (e) {
  varDefOk = false
  violations.push(`C-4c var() 语义锚：theme.css 解析失败（${String(e.message).split('\n')[0]}）——D 集失能 fail-open 上报（F-LINT-04 T4）`)
}
if (varDefOk) {
  for (const [name, files] of varRefMap) {
    if (!varDefSet.has(name) && !DYNAMIC_TOKENS.includes(name)) {
      violations.push(
        `C-4c var() 语义锚：${name} 引用悬空（引用于 ${[...files].join(', ')}）——定义 token 于 theme.css 或登记 DYNAMIC_TOKENS`
      )
    }
  }
}

// 7) [F-LINT-02] B-1 同值双常量——同名同值跨 ≥2 文件即红（trivial/同文件豁免、
//    异名同文案 warn 不卡 CI；baseline 棘轮=存量真命中放行待收敛）。判据与边界
//    矩阵见 scripts/check-dup-constants.mjs 头注（独立跑：npm run lint:dup-constants）。
//    [门一 C-3] 信息性明细（baseline 待收敛+warn）与 CLI 路径同走 clipped 20 行截断；
//    newRed=红走 violations 全量（拦截语义不截断，与各段一致）
const dupResult = scanDuplicateConstants(root)
for (const v of dupResult.newRed) violations.push(`dup-constants: ${v}`)
if (dupResult.corrupt) {
  violations.push('dup-constants: baseline 损坏（解析失败，已按空处理+硬拦截）——检查 scripts/dup-constants.baseline.json')
}
for (const line of clipped(formatDupDetails(dupResult))) console.log('  ' + line)
console.log(
  `dup-constants：扫描 ${dupResult.stats.files} 文件 / ${dupResult.stats.decls} 声明——` +
  `红层 ${dupResult.baselineHits.length} 组 baseline 待收敛（F-LINT-03 候选）、新增 ${dupResult.newRed.length} 组、` +
  `warn ${dupResult.warnGroups.length} 组（异名同文案不卡 CI）`
)

// 8) 模型代号负锚（清洗批 2026-09-16 起）——src 下 .ts/.tsx 出现 AI 模型
//    代号即红（过程痕迹不入源码；词表/扫描面单源=scripts/check-model-names.mjs，
//    import 先例=scanDuplicateConstants）。
for (const v of scanModelNames(root)) violations.push(`model-names: ${v}`)

// 9) e2e 截图比对负锚（[F-TESTREF-W4] 2026-09-18 起，INV-64）——tests/e2e 下
//    .ts/.tsx 出现 toHaveScreenshot 即红：像素 diff 限 scripts/ 工具层
//    （探针取证域，settings.png 先例），e2e「看见」类断言=计算样式+真实文本
//    （INV-06 口径）。现存 0 处=既成事实升格受检不变量（2026-09-11 终裁
//    §4-4 W4 行）。
for (const f of walk(join(root, 'tests', 'e2e'), (p) => /\.(ts|tsx)$/.test(p))) {
  if (/\btoHaveScreenshot\b/.test(readFileSync(f, 'utf8'))) {
    violations.push(`${relative(root, f)}: e2e 含 toHaveScreenshot 截图比对（INV-64——像素 diff 限 scripts/ 工具层；e2e 断言=计算样式+文本）`)
  }
}

if (violations.length > 0) {
  console.error('quality 检查未通过：')
  for (const v of violations) console.error('  - ' + v)
  process.exit(1)
}
console.log('quality 检查通过：无占位标记 / 无乱码 / 无跨域引用 / 无同值双常量新增')
