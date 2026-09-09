# 审查包 A：派发器 v2 + org-config 工具（代码终审）

> 背景：ai-dev-org 技能=loop-engineering 升级替代件（2026-09-10 落地）。
> 架构设计书已经 Kimi 拟定+deepseek 审核通过；以下为**按设计落地的代码终版**，
> 此前仅有机器自检（self-test 6 向量/validate 3 源/dry-run/冒烟真调/mock
> 换源演练），未经模型代码审查——本轮补审。对抗式只读审核：[B|W|N]
> 分级+file:line 定位+建议修正案，只挑错不改写，≤1500 字，末尾放行意见。
> 已知环境事实：宿主=~/.zcode/v2/config.json（uuid 前缀+条目名双校验，
> 不符 exit 2）；v1 母本=Synapse scripts/audits/ds-call.mjs（受锁件，
> 本件不替代它，独立服役）。审查重点：
> ①与 v1 行为等价性：退避（429/5xx 指数 3 次）/4xx 立即换源/末次守卫
> 抛真实状态码/switch 事件落账/exit 码语义——除新增角色与记账外不得
> 有静默行为变更；
> ②org-config 深合并语义实现正确性（对象逐字段覆盖/未提及沿用/数组
> 整体替换/显式 null=删除）与规范化哈希确定性（递归键排序+剔 null）；
> ③fail-fast 校验完备性（uuid/name/链引用/角色源引用）；
> ④--mock-source 语义（不触真实 API/退避归零/事件照记）；
> ⑤密钥仅内存、日志与 dry-run 输出不得泄漏 key；
> ⑥Windows 兼容（路径/编码/无 shell 依赖）。

=============== 文件 1：scripts/ds-call-v2.mjs ===============
/**
 * 外部 API 派发器 v2（角色档案化）——ai-dev-org 技能件。
 * v1 母本=Synapse scripts/audits/ds-call.mjs（受锁件，独立服役至回归
 * R1~R6 全过后按 locked-change 切换；两版禁混用于同一工单）。
 * v2 变更（设计书 F 章+审核链 B3/B4/B5/W4/W5 终裁）：
 *  - --role 必填；系统提示+DoD 自 scripts/roles/registry.json 装载
 *   （注册表内相对路径一律相对技能根）；无任何内嵌系统提示——v1 硬编码
 *    缺陷在 v2.0 归零。DoD 拼接进 system 消息末尾，user 消息保持纯任务包。
 *  - 源表/源序/角色档位来自 org-config（默认件+项目覆盖件深合并）；
 *    uuid 前缀+条目名双校验，不符即 exit 2 并输出 alias/期望/实际，无 fallback。
 *  - 记账字段扩展：role_id/role_version/role_sig/dispatcher_version/
 *    org_config_hash/project；双落账=技能侧 model-routing-log.jsonl（运行
 *    流水，含 attempt）+ 项目侧 org-ledger.jsonl（成本账本，仅 ok/switch/
 *    exhaust）。
 *  - --mock-source <alias>:<status> 故障注入：该源不触真实 API 直接返回
 *    给定状态码（换源演练专用；mock 下退避等待归零）。
 *  - --dry-run 输出结构化 JSON（sys_prompt/dod/assembled_system 分段
 *    ——R2 字节比对判据=sys_prompt 段）。
 * 用法：
 *   node ds-call-v2.mjs --role <id> [--source <alias>] [--project <名>]
 *        [--dry-run] [--mock-source <alias>:<status>] <prompt文件> [输出文件]
 *   node ds-call-v2.mjs --list-roles | --list-sources    # 零 API
 * 退避：429/5xx/网络错指数退避 3 次后换源；400/401/403/404 立即换源；
 * 末次守卫=抛真实状态码并落 switch 事件（v1 复审 B3 修复语义照用）。
 * 三源皆尽 → exit=2 + exhaust 事件（主控按「同源审计欠账」回退只读审）。
 */
import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, dirname, resolve, basename } from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { SKILL_ROOT, loadOrgConfig, cfgHash, validateProviders } from './org-config.mjs'

const DISPATCHER_VERSION = '2.0.0'
const LOG_PATH = join(dirname(fileURLToPath(import.meta.url)), 'model-routing-log.jsonl')
const REGISTRY_PATH = join(SKILL_ROOT, 'scripts', 'roles', 'registry.json')
const RETRYABLE = (s) => s === 429 || s >= 500
const NO_RETRY = (s) => s === 400 || s === 401 || s === 403 || s === 404

// ── 角色装载（注册表路径相对技能根）──
function loadRole(roleId) {
  const registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'))
  const def = registry.roles[roleId]
  if (!def) throw new Error(`未知角色: ${roleId}（可用角色见 --list-roles）`)
  const sysPrompt = readFileSync(join(SKILL_ROOT, def.sys_prompt_file), 'utf8')
  const dod = def.dod_file ? readFileSync(join(SKILL_ROOT, def.dod_file), 'utf8') : ''
  const sig = createHash('sha256').update(sysPrompt + '\n---DOD---\n' + dod).digest('hex').slice(0, 8)
  return { id: roleId, def, sysPrompt: sysPrompt.trimEnd(), dod: dod.trim(), sig, version: def.role_version }
}

// ── 源装载（org-config 驱动；双校验 fail-fast）──
function loadSources(merged) {
  const errors = validateProviders(merged)
  if (errors.length) {
    errors.forEach((e) => console.error(e))
    process.exit(2)
  }
  const hostCfg = JSON.parse(readFileSync(join(homedir(), '.zcode', 'v2', 'config.json'), 'utf8'))
  return (merged.source_chain || []).map((alias) => {
    const def = merged.providers[alias]
    const [id, prov] = Object.entries(hostCfg.provider || {}).find(([i, p]) => i.startsWith(def.uuid_prefix) && p && p.name === def.entry_name)
    return {
      alias,
      kind: def.kind,
      note: def.note || '',
      baseURL: prov.options.baseURL.replace(/\/$/, ''),
      apiKey: prov.options.apiKey,
      model: Object.keys(prov.models)[0],
      modelName: Object.values(prov.models)[0]?.name || Object.keys(prov.models)[0],
    }
  })
}

function buildRequest(src, prompt, system) {
  if (src.kind === 'anthropic') {
    const base = src.baseURL.replace(/\/v1$/, '')
    return {
      url: `${base}/v1/messages`,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': '<' + src.apiKey.length + 'chars>',
        'anthropic-version': '2023-06-01',
      },
      headersReal: { 'content-type': 'application/json', 'x-api-key': src.apiKey, 'anthropic-version': '2023-06-01' },
      body: { model: src.modelName, max_tokens: 32768, temperature: 0.2, system, messages: [{ role: 'user', content: prompt }] },
    }
  }
  return {
    url: `${src.baseURL}/chat/completions`,
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: 'Bearer <' + src.apiKey.length + 'chars>' },
    headersReal: { 'Content-Type': 'application/json', Authorization: `Bearer ${src.apiKey}` },
    body: { model: src.modelName, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }], temperature: 0.2, max_tokens: 32768 },
  }
}

function parseResponse(src, data) {
  if (src.kind === 'anthropic') {
    const text = Array.isArray(data.content) ? data.content.filter((b) => b.type === 'text').map((b) => b.text).join('') : ''
    return { text, usage: { in: data.usage?.input_tokens, out: data.usage?.output_tokens }, finish: data.stop_reason }
  }
  const msg = data.choices?.[0].message || {}
  let text = msg.content || ''
  if (!text && msg.reasoning_content) text = '[仅推理无正文,finish=' + data.choices?.[0].finish_reason + ']\n' + msg.reasoning_content
  return { text, usage: { in: data.usage?.prompt_tokens, out: data.usage?.completion_tokens }, finish: data.choices?.[0]?.finish_reason }
}

// ── 双落账：运行流水（含 attempt）+ 项目账本（仅 ok/switch/exhaust）──
const runId = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14) + '-' + Math.random().toString(36).slice(2, 6)
function makeLogger(role, merged, project, ledgerPath) {
  const ctx = { role_id: role.id, role_version: role.version, role_sig: role.sig, dispatcher_version: DISPATCHER_VERSION, org_config_hash: cfgHash(merged) }
  return {
    routing: (event, fields) => appendFileSync(LOG_PATH, JSON.stringify({ ts: new Date().toISOString(), runId, event, ...ctx, ...fields }) + '\n', 'utf8'),
    ledger: (event, fields) => {
      if (!['ok', 'switch', 'exhaust'].includes(event)) return
      const roleCfg = merged.roles?.[role.id] || {}
      appendFileSync(ledgerPath, JSON.stringify({ ts: new Date().toISOString(), project, event, role: role.id, tier: roleCfg.tier || 'unspecified', source: fields.source, cfg_hash: ctx.org_config_hash, usage: fields.usage, outcome: fields.outcome }) + '\n', 'utf8')
    },
  }
}

// ── 单源调用：源内退避 3 次，耗尽/不可重试 → 抛错由链换源 ──
async function callSource(src, prompt, system, logger, mock) {
  const mocked = mock && mock.alias === src.alias
  const req = buildRequest(src, prompt, system)
  const t0 = Date.now()
  for (let attempt = 0; attempt < 4; attempt++) {
    logger.routing('attempt', { source: src.alias, model: src.modelName, attempt: attempt + 1, promptBytes: Buffer.byteLength(prompt, 'utf8'), mocked: !!mocked })
    try {
      const res = mocked
        ? { status: mock.status, ok: mock.status < 400, text: async () => '[mock-source 故障注入]' }
        : await fetch(req.url, { method: req.method, headers: req.headersReal, body: JSON.stringify(req.body), signal: AbortSignal.timeout(600_000) })
      if (RETRYABLE(res.status)) {
        if (attempt === 3) throw new Error(`HTTP ${res.status} 退避 3 次耗尽${mocked ? '（mock）' : ''}`)
        const wait = mocked ? 0 : 5000 * 2 ** attempt
        if (wait) console.error(`[${src.alias}] HTTP ${res.status},退避 ${wait}ms(第 ${attempt + 1} 次)`)
        await new Promise((r) => setTimeout(r, wait))
        continue
      }
      if (!res.ok) {
        const detail = (await res.text()).slice(0, 300)
        if (NO_RETRY(res.status)) throw Object.assign(new Error(`HTTP ${res.status}: ${detail}`), { fatal: true })
        if (attempt === 3) throw new Error(`HTTP ${res.status}: ${detail}`)
        const wait = mocked ? 0 : 5000 * 2 ** attempt
        if (wait) console.error(`[${src.alias}] HTTP ${res.status},退避 ${wait}ms`)
        await new Promise((r) => setTimeout(r, wait))
        continue
      }
      const data = await res.json()
      const { text, usage, finish } = parseResponse(src, data)
      if (!text) throw Object.assign(new Error('空响应 finish=' + finish + ' usage=' + JSON.stringify(usage)), { fatal: true })
      logger.routing('ok', { source: src.alias, model: src.modelName, usage, latencyMs: Date.now() - t0, finish })
      logger.ledger('ok', { source: src.alias, usage, outcome: 'ok' })
      return { text, usage, latencyMs: Date.now() - t0 }
    } catch (e) {
      if (e.fatal || attempt === 3) {
        logger.routing('switch', { source: src.alias, model: src.modelName, error: e.message.slice(0, 300), latencyMs: Date.now() - t0 })
        logger.ledger('switch', { source: src.alias, outcome: e.message.slice(0, 200) })
        throw e
      }
      const wait = mocked ? 0 : 5000 * 2 ** attempt
      if (wait) console.error(`[${src.alias}] ${e.message},退避 ${wait}ms`)
      await new Promise((r) => setTimeout(r, wait))
    }
  }
  throw new Error('unreachable')
}

// ── CLI ──
const argv = process.argv.slice(2)
const flag = (name) => {
  const i = argv.indexOf(name)
  return i >= 0 ? argv[i + 1] : null
}
const roleId = flag('--role')
const onlyAlias = flag('--source')
const projectName = flag('--project') || basename(process.cwd())
const mockSpec = flag('--mock-source')
const listRoles = argv.includes('--list-roles')
const listSources = argv.includes('--list-sources')
const dryRun = argv.includes('--dry-run')
const positional = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--role' && argv[i - 1] !== '--source' && argv[i - 1] !== '--project' && argv[i - 1] !== '--mock-source')

const registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'))
const { merged } = loadOrgConfig(process.cwd())
const ledgerPath = join(process.cwd(), merged.ledger_path || '.zcode/org-ledger.jsonl')

if (listRoles) {
  console.log('角色注册表（registry_version=' + registry.registry_version + '，路径相对技能根）：')
  for (const [id, def] of Object.entries(registry.roles)) {
    const rc = merged.roles?.[id] || {}
    console.log(`  ${id} | source=${rc.source || def.default_source} tier=${rc.tier || '?'} | ${def.sys_prompt_file}`)
  }
  process.exit(0)
}

const sources = loadSources(merged)
if (listSources) {
  console.log(`源序（org-config source_chain；cfg:${cfgHash(merged)}）：`)
  sources.forEach((s, i) => console.log(`  ${i + 1}. ${s.alias} | ${s.modelName} | ${s.kind} @ ${s.baseURL} | ${s.note}`))
  process.exit(0)
}

if (!roleId) {
  console.error('错误：--role 必填（v1 内嵌系统提示已废止）。可用角色：')
  Object.keys(registry.roles).forEach((id) => console.error('  ' + id))
  console.error('用法: node ds-call-v2.mjs --role <id> [--source <alias>] [--project <名>] [--dry-run] [--mock-source <alias>:<status>] <prompt文件> [输出文件]')
  process.exit(1)
}
const role = loadRole(roleId)
const system = role.dod ? role.sysPrompt + '\n\n' + role.dod : role.sysPrompt

const promptPath = positional[0]
const outPath = positional[1]
if (!promptPath) throw new Error('用法: node ds-call-v2.mjs --role <id> [...] <prompt文件> [输出文件]')
const prompt = readFileSync(promptPath, 'utf8')

const chain = onlyAlias ? sources.filter((s) => s.alias === onlyAlias) : role.def.default_source === 'chain' ? sources : sources.filter((s) => s.alias === role.def.default_source)
if (chain.length === 0) throw new Error(onlyAlias ? `未知或不可用源: ${onlyAlias}` : `角色 ${roleId} 默认源 ${role.def.default_source} 不可用`)

const mock = mockSpec ? (([, alias, status]) => ({ alias, status: Number(status) }))(/^([^:]+):(\d+)$/.exec(mockSpec) || []) : null
if (mockSpec && (!mock || !mock.alias || Number.isNaN(mock.status))) throw new Error('--mock-source 需要 <alias>:<status> 形如 kimi-main:429')

const logger = makeLogger(role, merged, projectName, ledgerPath)
if (dryRun) {
  console.log(
    JSON.stringify(
      {
        runId,
        role: { id: role.id, version: role.version, sig: role.sig, sys_prompt: role.sysPrompt, dod: role.dod, assembled_system: system },
        chain: chain.map((s) => s.alias),
        sources: chain.map((s) => ({ alias: s.alias, url: buildRequest(s, prompt, system).url, model: s.modelName, kind: s.kind })),
        routing_log: LOG_PATH,
        ledger: ledgerPath,
        cfg_hash: cfgHash(merged),
        mock: mock,
      },
      null,
      2,
    ),
  )
  process.exit(0)
}

let switches = 0
for (let i = 0; i < chain.length; i++) {
  const s = chain[i]
  try {
    console.error(`[routing] run=${runId} role=${role.id}@${role.sig} cfg=${cfgHash(merged)} 尝试源 ${i + 1}/${chain.length}: ${s.alias}(${s.modelName})`)
    const { text, usage, latencyMs } = await callSource(s, prompt, system, logger, mock)
    const header = `[routing]: run=${runId} source=${s.alias} model=${s.modelName} role=${role.id}@${role.sig} cfg=${cfgHash(merged)} switches=${switches} usage=in=${usage.in ?? '?'},out=${usage.out ?? '?'} latency=${latencyMs}ms (by ds-call-v2 链)\n\n`
    if (outPath) writeFileSync(outPath, header + text, 'utf8')
    console.log(header + text)
    process.exit(0)
  } catch (e) {
    switches++
    if (i === chain.length - 1) {
      logger.routing('exhaust', { chain: chain.map((x) => x.alias).join('→'), error: e.message.slice(0, 300) })
      logger.ledger('exhaust', { source: chain.map((x) => x.alias).join('→'), outcome: 'exhaust-debt（同源审计欠账，主控回退只读审）' })
      console.error(`[routing] 全源尽(${chain.map((x) => x.alias).join('→')}): ${e.message}——主控按「同源审计欠账」处置`)
      process.exit(2)
    }
    console.error(`[routing] 换源 ${s.alias} → ${chain[i + 1].alias}: ${e.message.slice(0, 200)}`)
  }
}

=============== 文件 2：scripts/org-config.mjs ===============
/**
 * org-config 工具（ai-dev-org）：装载/深合并/规范化哈希/源交叉校验/自测。
 * 深合并语义（审核链 B2 终裁）：对象逐字段递归覆盖，未提及字段沿用默认件；
 * 数组整体替换；显式 null=删除该键。
 * 规范化哈希：递归键排序+剔除 null/undefined+紧凑 JSON.stringify 后
 * sha256 前 12 位——与键序/空白无关，同配置必同哈希。
 * 用法：
 *   node org-config.mjs [--project <dir>] resolve   # 打印合并后配置
 *   node org-config.mjs [--project <dir>] hash      # 打印 cfg:<hash12>
 *   node org-config.mjs [--project <dir>] validate  # 与宿主 config.json 交叉校验（不符 exit 2）
 *   node org-config.mjs --self-test                 # 合并/哈希语义自测向量
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { homedir } from 'node:os'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

export const SKILL_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_CFG = join(SKILL_ROOT, 'org-config.default.json')

const isPlainObject = (v) => v != null && typeof v === 'object' && !Array.isArray(v)

/** 深合并（B2 语义）。over 中显式 null=删除；undefined=不动用 base。 */
export function deepMerge(base, over) {
  const out = {}
  const keys = new Set([...Object.keys(base || {}), ...Object.keys(over || {})])
  for (const k of keys) {
    const b = base ? base[k] : undefined
    const o = over ? over[k] : undefined
    if (o === null) continue // 显式 null=删除（base 侧 null 视同缺失）
    if (o === undefined) {
      if (b !== undefined && b !== null) out[k] = b
      continue
    }
    if (isPlainObject(o) && isPlainObject(b)) out[k] = deepMerge(b, o)
    else out[k] = o // 标量覆盖；数组整体替换
  }
  return out
}

/** 规范化：递归键排序+剔除 null/undefined。 */
export function canonicalize(v) {
  if (Array.isArray(v)) return v.map(canonicalize)
  if (isPlainObject(v)) {
    const o = {}
    for (const k of Object.keys(v).sort()) {
      if (v[k] === null || v[k] === undefined) continue
      o[k] = canonicalize(v[k])
    }
    return o
  }
  return v
}

/** 规范化哈希：sha256 前 12 位。 */
export function cfgHash(cfg) {
  return createHash('sha256').update(JSON.stringify(canonicalize(cfg))).digest('hex').slice(0, 12)
}

/** 装载合并配置：默认件 + <projectDir>/.zcode/org-config.json（存在时）。 */
export function loadOrgConfig(projectDir) {
  const base = JSON.parse(readFileSync(DEFAULT_CFG, 'utf8'))
  const overPath = join(projectDir, '.zcode', 'org-config.json')
  const merged = existsSync(overPath) ? deepMerge(base, JSON.parse(readFileSync(overPath, 'utf8'))) : base
  return { merged, hasOverride: existsSync(overPath), overPath }
}

/** 与宿主 ~/.zcode/v2/config.json 交叉校验：uuid 前缀+条目名双命中。
 *  返回错误数组（空=通过）。 */
export function validateProviders(cfg) {
  const hostCfg = JSON.parse(readFileSync(join(homedir(), '.zcode', 'v2', 'config.json'), 'utf8'))
  const entries = Object.entries(hostCfg.provider || {})
  const errors = []
  for (const [alias, def] of Object.entries(cfg.providers || {})) {
    const hit = entries.find(([id, p]) => id.startsWith(def.uuid_prefix) && p && p.name === def.entry_name)
    if (!hit) {
      const near = entries.find(([id]) => id.startsWith(def.uuid_prefix))
      errors.push(
        `源校验失败 alias=${alias} 期望 uuid前缀=${def.uuid_prefix} name=${def.entry_name} ` +
          `实际=${near ? near[0] + '(name=' + near[1].name + ')' : '无该前缀条目'}`,
      )
    }
  }
  for (const alias of cfg.source_chain || []) {
    if (!cfg.providers || !cfg.providers[alias]) errors.push(`source_chain 引用未知 alias=${alias}`)
  }
  for (const [role, def] of Object.entries(cfg.roles || {})) {
    if (def.source !== 'chain' && (!cfg.providers || !cfg.providers[def.source]))
      errors.push(`roles.${role}.source 引用未知 alias=${def.source}`)
  }
  return errors
}

// ── CLI ──
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const argv = process.argv.slice(2)
  const selfTest = argv.includes('--self-test')
  const projIdx = argv.indexOf('--project')
  const projectDir = projIdx >= 0 ? argv[projIdx + 1] : process.cwd()
  const cmd = argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--project')

  if (selfTest) {
    let fails = 0
    const t = (name, cond) => (console.log(`${cond ? 'PASS' : 'FAIL'} ${name}`), cond || fails++)
    const base = { a: { x: 1, y: 2 }, b: [1, 2], c: 3 }
    t('对象逐字段覆盖+未提及沿用', JSON.stringify(deepMerge(base, { a: { x: 9 } })) === JSON.stringify({ a: { x: 9, y: 2 }, b: [1, 2], c: 3 }))
    t('数组整体替换', JSON.stringify(deepMerge(base, { b: [3] }).b) === '[3]')
    t('显式 null=删除', deepMerge(base, { a: null }).a === undefined)
    t('null 于新增键=不新增', deepMerge(base, { d: null }).d === undefined)
    t('哈希键序无关', cfgHash({ x: 1, y: { b: 2, a: 3 } }) === cfgHash({ y: { a: 3, b: 2 }, x: 1 }))
    t('哈希剔 null', cfgHash({ x: 1, y: null }) === cfgHash({ x: 1 }))
    console.log(fails === 0 ? 'self-test 全过' : `self-test ${fails} 项失败`)
    process.exit(fails === 0 ? 0 : 1)
  }

  const { merged, hasOverride } = loadOrgConfig(projectDir)
  if (cmd === 'resolve') {
    console.log(JSON.stringify(merged, null, 2))
    console.error(`[override] ${hasOverride ? '项目覆盖件已合并' : '无项目覆盖件（纯默认件）'}`)
  } else if (cmd === 'hash') {
    console.log(`cfg:${cfgHash(merged)}`)
  } else if (cmd === 'validate') {
    const errors = validateProviders(merged)
    if (errors.length) {
      errors.forEach((e) => console.error(e))
      process.exit(2)
    }
    console.log(`validate PASS（${Object.keys(merged.providers || {}).length} 源双校验通过，cfg:${cfgHash(merged)}）`)
  } else {
    console.error('用法: node org-config.mjs [--project <dir>] resolve|hash|validate|--self-test')
    process.exit(1)
  }
}

=============== 文件 3：org-config.default.json ===============
{
  "version": "1.0.0",
  "ledger_path": ".zcode/org-ledger.jsonl",
  "providers": {
    "kimi-main": {
      "uuid_prefix": "b2466f8b",
      "entry_name": "Kimi",
      "kind": "anthropic",
      "billing": "enterprise",
      "note": "K3 企业版主源"
    },
    "kimi-backup": {
      "uuid_prefix": "5e1abd9d",
      "entry_name": "zipoo",
      "kind": "anthropic",
      "billing": "second-quota",
      "note": "同端点第二配额备源"
    },
    "deepseek": {
      "uuid_prefix": "8ad55776",
      "entry_name": "梁圣",
      "kind": "openai",
      "billing": "payg",
      "note": "审计兜底（套餐外按量）"
    }
  },
  "source_chain": ["kimi-main", "kimi-backup", "deepseek"],
  "roles": {
    "drafter": {
      "source": "chain",
      "tier": "prime",
      "tier_note": "路线级设计拟定（长上下文+重推理档）"
    },
    "gate1-reviewer": {
      "source": "chain",
      "tier": "audit",
      "tier_note": "门一隔离一审（与实现者异构对抗）"
    },
    "auditor-readonly": {
      "source": "deepseek",
      "tier": "debt-readonly",
      "tier_note": "兜底审/源尽欠账只读审"
    }
  },
  "ration_redlines": {
    "kimi-main": {
      "note": "必保面=路线级拟定+受锁面/安全面/跨模块接缝/数据批/迁移/回炉第二轮起/新依赖；可省面=≤3 文件小批/纯文档批。数字红线由项目覆盖件按订阅事实填。"
    }
  },
  "exhaustion_fallback": "readonly-audit-debt"
}
