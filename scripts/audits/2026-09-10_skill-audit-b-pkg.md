# 审查包 B：治理脚本 + 角色档案注册表（终审）

> 背景：ai-dev-org 技能实现面补审（包 B）。对抗式只读审核：[B|W|N]+定位
> +修正案，≤1200 字，末尾放行意见。审查重点：
> ①check-constitution-budget.mjs 正则健壮性（多段/缺 END 标记/大小写/
> CRLF——文件为 LF 但输入 AGENTS.md 可能 CRLF）；
> ②skill-gc.mjs 分类误伤面：REDIRECT_RE=正文含「已退役|退役|重定向|
> retired|redirect to」且 body<2000B 才判 redirect——active 技能正文
> 提及这些词的误判概率与后果；frontmatter 解析边界（description 多行
> YAML/注释/BOM）；--apply 双开关防线与归档回滚完整性；插件缓存只读
> 不动的边界是否真实成立（当前实现根本不扫插件目录——是否算缺口）；
> ③registry.json 路径解析（相对技能根）与缺文件行为；
> ④六份角色档案（系统提示+DoD）与 references/06/07 口径一致性、提示词
> 质量；gate1-reviewer.md 与 v1 SYS_PROMPT 字节等价已机检 PASS（R2，
> 96B=96B），该件免审只审其余。
> 已知事实：技能根=C:/Users/Administrator/.zcode/skills/ai-dev-org；预算
> 上限=600 非空白字符。

=============== 文件 1：scripts/check-constitution-budget.mjs ===============

> 回炉轮 2 处置（ds 初复审 B1/B2/W1~W7+Kimi 初审 4W）：B1=标记配对校验（实测：完整段+悬垂 BEGIN→FAIL BEGIN×2/END×1/段×1）；B2/W2=description 多行/块→unknown 仅报告不入删除集（实测 ml-desc→unknown）+suspect 态（退役词但正文超阈，人审）；W1=字节阈统一 Buffer.byteLength；W3=清单先写后移（写失败零副作用中止）+移动失败回写实移清单；W4=输出首行插件目录口径告警；W5=registry 消费端（loadRole join(SKILL_ROOT,…)）已随 A 包双源审过+base:skill_root 字段在案；W6=references/06/07 随本批 C 包送审；W7=drafter.dod 待澄清边界条款化。

=============== 文件 1（v1.1）：check-constitution-budget.mjs ===============
/**
 * 宪法组织段预算自检（ai-dev-org）：提取 AGENTS.md 中全部 ORG-SEG 标记段，
 * 每段非空白字符数 ≤600 为过；缺段/多段/BEGIN 无 END/超限 → exit 1
 *（立案清单第 0 步强制项）。多段=配置错误（意图单段，防预算分散逃逸）。
 * 用法：node check-constitution-budget.mjs [AGENTS.md 路径（默认 ./AGENTS.md）]
 */
import { readFileSync } from 'node:fs'

const LIMIT = 600
const path = process.argv[2] || 'AGENTS.md'
let md
try {
  md = readFileSync(path, 'utf8')
} catch (e) {
  console.error(`FAIL 读取失败 ${path}: ${e.message}`)
  process.exit(1)
}
md = md.replace(/^\uFEFF/, '')
const re = /<!--\s*ORG-SEG:BEGIN[^>]*-->([\s\S]*?)<!--\s*ORG-SEG:END\s*-->/g
const segs = [...md.matchAll(re)]
// 配对校验（ds-B1 终裁）：任何 BEGIN 无配对 END=FAIL——不只依赖正则产出段数
const beginCount = (md.match(/ORG-SEG:BEGIN/g) || []).length
const endCount = (md.match(/ORG-SEG:END/g) || []).length
if (beginCount !== segs.length || endCount !== segs.length) {
  console.error(`FAIL ORG-SEG 标记不配对（BEGIN×${beginCount}/END×${endCount}/完整段×${segs.length}）——存在未闭合段或悬垂标记`)
  process.exit(1)
}
if (segs.length === 0) {
  console.error(`FAIL 未找到 ORG-SEG 标记段（${path}）——采用组织层的项目必须先插入标记段再立案`)
  process.exit(1)
}
if (segs.length > 1) {
  console.error(`FAIL 检出 ${segs.length} 个 ORG-SEG 段（意图单段——多段=预算分散逃逸面，请合并）`)
  process.exit(1)
}
const count = segs[0][1].replace(/\s/g, '').length
if (count > LIMIT) {
  console.error(`FAIL ORG-SEG 段非空白字符 ${count} > ${LIMIT}——先裁剪（只删措辞不删条款）再派发；事件记账 kind=constitution-overrun`)
  process.exit(1)
}
console.log(`PASS ORG-SEG 段非空白字符 ${count}/${LIMIT}`)

=============== 文件 2（v1.1）：skill-gc.mjs ===============
/**
 * 技能垃圾回收（ai-dev-org 工具件）v1.1——清理无效技能与退役重定向页。
 * 分类口径（回炉轮 2 修订——Kimi/DS 双源审）：
 *   redirect = description 含退役/重定向标记 且 正文字节数 <2000B（字节口径）
 *   suspect  = description 含上述标记 但正文较大（疑似而非确证——仅报告，禁入自动删除集）
 *   invalid  = 缺 frontmatter 或缺 name 字段（硬事实）；description 解析存在
 *              多行/块形态歧义时判 unknown（仅报告）——「无法可靠解析的
 *              frontmatter 只报告、不进可自动删除集合」（ds-B2 终裁）
 *   orphan   = 技能根下无 SKILL.md 的目录（仅报告）
 *   active   = 正常技能
 * 安全设计：默认干跑；--apply 须与 --delete-redirects/--delete-invalid 同用；
 * 清单先写后移（manifest 写失败=中止不移动——归档事务完整性）；同日多次
 * 运行清单合并；删除=移入 _archive/skill-gc-<date>/ 可整目录移回回滚；
 * 插件缓存目录不扫描不动（插件技能若经他机制驻留技能根，统计口径不完整
 * ——见输出告警行）。「未使用」无法机检（无使用遥测），active/suspect 去
 * 留=用户裁决，本件不删。
 * 用法：
 *   node skill-gc.mjs [--root <dir>] [--json]                    # 盘点+可回收估算（干跑）
 *   node skill-gc.mjs --apply --delete-redirects [--delete-invalid]  # 归档+清理
 * 退出码：0=正常；1=参数误用或归档事务失败；2=--apply 未指定删除类。
 */
import { readdirSync, readFileSync, statSync, renameSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const argv = process.argv.slice(2)
const flag = (n) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : null)
const ROOT = flag('--root') || join(homedir(), '.zcode', 'skills')
const APPLY = argv.includes('--apply')
const DEL_REDIRECTS = argv.includes('--delete-redirects')
const DEL_INVALID = argv.includes('--delete-invalid')
const JSON_OUT = argv.includes('--json')
const RETIRED_DESC_RE = /已退役|退役|重定向|retired|redirect/i
const BODY_LIMIT_BYTES = 2000

if (APPLY && !DEL_REDIRECTS && !DEL_INVALID) {
  console.error('--apply 须与 --delete-redirects 和/或 --delete-invalid 同用（防误删）')
  process.exit(2)
}

function classify(dir) {
  const skillPath = join(ROOT, dir, 'SKILL.md')
  if (!existsSync(skillPath)) return { dir, cls: 'orphan', name: dir, descB: 0, bodyB: 0, note: '无 SKILL.md' }
  const raw = readFileSync(skillPath, 'utf8').replace(/^\uFEFF/, '')
  const bodyB = Buffer.byteLength(raw, 'utf8')
  const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!fm) return { dir, cls: 'invalid', name: dir, descB: 0, bodyB, note: '缺 frontmatter' }
  const name = (fm[1].match(/^name:\s*(.+?)\s*$/m) || [])[1]
  if (!name) return { dir, cls: 'invalid', name: dir, descB: 0, bodyB, note: '缺 name 字段' }
  const descLine = (fm[1].match(/^description:\s*(.*?)\s*$/m) || [])[1] ?? ''
  const descMulti = /^description:\s*(\||>|-)?\s*$/m.test(fm[1]) || descLine === ''
  if (descMulti)
    return { dir, cls: 'unknown', name, descB: 0, bodyB, note: 'description 为多行/块形态（跳过 desc 计量，仅报告——不入自动删除集）' }
  if (RETIRED_DESC_RE.test(descLine)) {
    if (bodyB < BODY_LIMIT_BYTES) return { dir, cls: 'redirect', name, descB: Buffer.byteLength(descLine, 'utf8'), bodyB, note: '退役重定向页（description 判据+字节阈内）' }
    return { dir, cls: 'suspect', name, descB: Buffer.byteLength(descLine, 'utf8'), bodyB, note: 'description 含退役词但正文超阈（疑似——仅报告，人审定夺）' }
  }
  return { dir, cls: 'active', name, descB: Buffer.byteLength(descLine, 'utf8'), bodyB, note: '' }
}

const entries = readdirSync(ROOT, { withFileTypes: true })
  .filter((e) => e.isDirectory() && e.name !== '_archive')
  .map((e) => classify(e.name))
  .sort((a, b) => a.cls.localeCompare(b.cls) || a.name.localeCompare(b.name))

const by = (c) => entries.filter((e) => e.cls === c)
const sumDesc = (list) => list.reduce((s, e) => s + e.descB, 0)
const reclaimDesc = sumDesc(by('redirect')) + sumDesc(by('invalid'))
const totalDesc = sumDesc(entries)

if (JSON_OUT) {
  console.log(JSON.stringify({ root: ROOT, total: entries.length, active: by('active').length, redirect: by('redirect').length, suspect: by('suspect').length, invalid: by('invalid').length, unknown: by('unknown').length, orphan: by('orphan').length, always_on_desc_bytes: totalDesc, reclaimable_desc_bytes: reclaimDesc, entries }, null, 2))
} else {
  console.log(`技能根：${ROOT}（统计不含插件系统管理目录——插件技能若经他机制驻留技能根则此口径不完整）`)
  for (const e of [...by('redirect'), ...by('suspect'), ...by('invalid'), ...by('unknown'), ...by('orphan')])
    console.log(`  [${e.cls}] ${e.name} — ${e.note}（desc ${e.descB}B/body ${e.bodyB}B）`)
  console.log(
    `\n合计 ${entries.length} 技能：active ${by('active').length} / redirect ${by('redirect').length} / suspect ${by('suspect').length} / invalid ${by('invalid').length} / unknown ${by('unknown').length} / orphan ${by('orphan').length}`,
  )
  console.log(`常驻 description 总量=${totalDesc}B；本次可回收=${reclaimDesc}B（仅 redirect+invalid；suspect/unknown 恒不自动删）`)
  if (!APPLY) console.log('（干跑——加 --apply --delete-redirects/--delete-invalid 才实际归档清理）')
}

if (APPLY) {
  const targets = entries.filter((e) => (DEL_REDIRECTS && e.cls === 'redirect') || (DEL_INVALID && e.cls === 'invalid'))
  if (!targets.length) {
    console.log('无可清理目标。')
    process.exit(0)
  }
  const ts = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const arcDir = join(ROOT, '_archive', `skill-gc-${ts}`)
  mkdirSync(arcDir, { recursive: true })
  // 归档事务：清单先写（含预期清单），写失败=中止不移动（W3 终裁——防「已移动无清单」）
  const manifestPath = join(arcDir, 'GC-MANIFEST.json')
  let prev = []
  try {
    prev = JSON.parse(readFileSync(manifestPath, 'utf8').replace(/^\uFEFF/, '')).deleted || []
  } catch {}
  const intended = targets.map((t) => ({ dir: t.dir, cls: t.cls, note: t.note }))
  try {
    writeFileSync(manifestPath, JSON.stringify({ date: new Date().toISOString(), deleted: [...prev, ...intended] }, null, 2), 'utf8')
  } catch (e) {
    console.error(`[gc-abort] 归档清单写入失败（未移动任何目录，零副作用退出）: ${e.message}`)
    process.exit(1)
  }
  const moved = []
  for (const t of targets) {
    try {
      renameSync(join(ROOT, t.dir), join(arcDir, t.dir))
      moved.push(t.dir)
      console.log(`已归档清理：${t.dir}（${t.cls}）→ ${arcDir}`)
    } catch (e) {
      console.error(`[gc-warn] 归档移动失败 ${t.dir}: ${e.message}（跳过，其余继续）`)
    }
  }
  if (moved.length !== intended.length)
    writeFileSync(manifestPath, JSON.stringify({ date: new Date().toISOString(), deleted: [...prev, ...intended.filter((t) => moved.includes(t.dir))] }, null, 2), 'utf8')
  console.log(`常驻面回收 ${reclaimDesc}B description；归档清单=${manifestPath}（可整目录移回回滚）`)
}

=============== 文件 3（v1.1）：registry.json ===============
{
  "registry_version": "1.1.0",
  "base": "skill_root",
  "path_note": "各角色档案相对路径一律相对技能根（~/.zcode/skills/ai-dev-org/）解析；缺文件=装载失败 exit 3（无跳过）",
  "roles": {
    "gate1-reviewer": {
      "sys_prompt_file": "scripts/roles/gate1-reviewer.md",
      "dod_file": "scripts/roles/gate1-reviewer.dod.md",
      "package_template": "self-contained-diff",
      "default_source": "chain",
      "role_version": "1.0.0"
    },
    "drafter": {
      "sys_prompt_file": "scripts/roles/drafter.md",
      "dod_file": "scripts/roles/drafter.dod.md",
      "package_template": "self-contained-brief",
      "default_source": "chain",
      "role_version": "1.0.0"
    },
    "auditor-readonly": {
      "sys_prompt_file": "scripts/roles/auditor-readonly.md",
      "dod_file": "scripts/roles/auditor-readonly.dod.md",
      "package_template": "self-contained-package",
      "default_source": "deepseek",
      "role_version": "1.0.0"
    }
  }
}

=============== 文件 4：drafter.dod.md（W7 修订） ===============
# 拟定者 DoD 细则（随系统提示拼入 system 末尾）

- 零仓库接触：只依据任务书自包含内容拟定；引用环境事实必须来自任务书。
- 输出契约：章节完整覆盖任务书请求的每一项；候选≥2+权衡表；无占位符
  （不留需再澄清一轮的空段）；「待澄清」条目必须集中于显式清单段且
  逐条给出获取路径建议——待澄清清单不得作为缺失章节的占位交付（首轮
  已知信息必须已写入正文）；总量≤6000 字（任务书另有约定从其约定）。
- 明确声明：设计书将被送异构对抗审核（只挑错不改写）与主控终裁——
  为审核者预置"已知风险/不确定点"段比隐藏缺陷更符合你的职责。

=============== 文件 5~8：其余角色档案（未改） ===============
--- roles/gate1-reviewer.md ---
你是一名对抗式代码审查员(门一)。你的职责是找出实现与票面规约的偏差、边界缺陷、静默失败与测试盲区。只报告有代码证据支撑的问题,每条给出文件:行号或代码摘录。不确定的明确说不确定。用中文输出。
--- roles/gate1-reviewer.dod.md ---
# 门一 DoD 细则（随系统提示拼入 system 末尾）

- 铁律：只读审计；禁接触仓库、禁跑命令、禁臆测包外事实——结论只允许
  引用包内材料，包内无法裁决的点显式标"不确定"。
- 输入四件（自包含 diff 包）：diff 包路径（主控预生成，禁自跑 git 长命令
  ）/票面或任务书/实现者报告/证据日志路径。
- 输出：[B|W|N] 分级逐条发现+file:line 证据+统计+总评；回复精简、全文
  在档。按票面类型附加强制审项（挂载/事件消费类=事件时间线逐帧推演；
  CSS 皮肤类=hover/selected/disabled 特异性显式推演）。
- 主控已预裁项可攻击但推翻需更强依据。

--- roles/drafter.md ---
你是一名组织与架构设计拟定者(拟定者岗)。你的职责是按任务书拟定可执行的详细设计书：给出不少于两个候选方案并逐项权衡(复杂度/风险/迁移成本/额度成本)，全部细节落到可执行粒度(文件路径/字段名/文案原文/表格)。你不拥有终裁权，不得指挥实现；任务书之外的事实不得假设，缺失信息显式列为"待澄清"。用中文输出。
--- roles/auditor-readonly.md ---
你是一名对抗式审核者(只读审核岗)。你的职责是对送审材料（设计书/方案/报告）挑错：找出内部矛盾、可执行性缺口、与既定约束的冲突、迁移与安全风险。只挑错不改写——每条发现给定位(章节/行)+问题+建议修正案，不重新设计。不确定的明确说不确定。用中文输出。
--- roles/auditor-readonly.dod.md ---
# 只读审核岗 DoD 细则（随系统提示拼入 system 末尾）

- 输出：[B|W|N] 分级（B=阻断实施/W=应修/N=提示）逐条发现，末尾总评与
  放行意见；≤2500 字（任务书另有约定从其约定）。
- 审核重点面按任务书给定（如内部一致性/可执行性/环境冲突/迁移风险/
  schema 健全性/成本现实性）。
- 禁改写被审材料原文语义；建议修正案以"应当如何"表述，不代拟全文。

