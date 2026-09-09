#!/usr/bin/env node
/**
 * check-quality.mjs —— 质量扫描关卡（受锁文件）。
 * 检查：Node 版本守卫 / 占位标记 / 乱码特征 / renderer features 跨域互引
 * / CSS 字号+颜色字面量消费负锚（第 6 段——COLOR_RE 与 eslint.config.js
 * B-5 内联 rule 双写面逐字一致，改一处必同步另一处）。
 * 退出码 1 = CI 红。规则依据 AGENTS.md（文档无强制等于没写）。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { scanDuplicateConstants, formatDupDetails, clipped } from './check-dup-constants.mjs'

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
  ['src/renderer/features/reader/tab-dirty.ts', ['notes/notes.store']],
  ['src/renderer/features/reader/ReaderNotesPanel.tsx', ['notes/notes.store']],
  ['src/renderer/features/settings/useExportCorpusEvents.ts', ['reader/CorpusExtractor']],
  ['src/renderer/features/lineage/LineageSideAiNotes.tsx', ['reader/ai-note-style']],
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
//    迁移毕（61+6 存量清零——终裁档 §5 立案顺延件兑现）后同循环落码：
//    行级豁免=--name: 定义行（token 定义即字面量合法所在地，CR3a 改简——
//    零 token 名清单依赖）；COLOR_RE 命中行=红。COLOR_RE 与 eslint.config.js
//    B-5 内联 rule（tsx inline style 面）双写面逐字一致——改一处必改另一处。
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
const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/
for (const f of cssAll) {
  const rel = relative(root, f).replaceAll('\\', '/')
  const content = readFileSync(f, 'utf-8')
  if (fsDeclRe) {
    const hits = content.match(fsDeclRe) ?? []
    if (hits.length > 0) violations.push(`${rel}: CSS 字号字面量 ${hits.length} 处（单源=--fs-* token；样例：${hits.slice(0, 3).join(' / ')}）`)
  }
  content.split('\n').forEach((line, i) => {
    if (/^\s*--[\w-]+\s*:/.test(line)) return
    if (COLOR_RE.test(line)) violations.push(`${rel}:${i + 1}: CSS 颜色字面量消费（单源=--* token）：${line.trim().slice(0, 80)}`)
  })
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

if (violations.length > 0) {
  console.error('quality 检查未通过：')
  for (const v of violations) console.error('  - ' + v)
  process.exit(1)
}
console.log('quality 检查通过：无占位标记 / 无乱码 / 无跨域引用 / 无同值双常量新增')
