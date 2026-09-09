# 复审任务书：审查包 A（派发器 v2.1 + org-config 工具）回炉轮 1

> 原审发现与处置（逐条核对 ADDRESSED/NOT ADDRESSED+修订面新破坏扫描；
> ≤1000 字+放行意见）。代码已升 v2.1.0。
>
> | 原发现（源） | 处置 |
> |---|---|
> | K-B1 角色源路由未走 org-config | 路由改 `merged.roles[roleId]?.source ?? registry 默认`；新增 org-config 声明不存在角色的死配置守卫（exit 3）；--list-roles 双源标注 |
> | K-B2/ds-B2 账本 ENOENT+IO 错入远程重试 | mkdirSync 先建目录；makeSafeAppend 封装（IO 失败=stderr 一次警告，不抛入 callSource 重试语义） |
> | ds-B1 find 回调 `i is not defined` | **REJECTED（机器事实证伪）**：回调解构即 `([i, p])`、引用同为 i，四类实跑（list-sources/dry-run/冒烟/mock 演练×2）全部经过该路径无异常——系误读形参名 |
> | K-W1 mock alias 不校验 | alias 必须 ∈ 本次链，否则 exit 3（实测拦截 bad-alias） |
> | K-W2/ds-N3 mock status<400 路径破损 | 限定 status ∈ [400,599]（实测拦截 200） |
> | K-W3 解构无兜底+host 配置二读 | readHostConfig() 单次读入共用；find 未命中/字段缺失 alias 级错误 exit 3 |
> | K-N1 exit 2 双义 | 配置级=exit 3；exhaust 保持 2；文档同步 |
> | K-N2 masked 死代码+error 泄漏面 | 删除死 masked headers；新增 scrub() 脱敏（长 token 形态掩码）用于日志/账本/错误文本 |
> | K-N3 盘符大小写+绝对 ledger_path | isMain 比较 toLowerCase；isAbsolute(ledger_path) 直用 |
> | K-N4 校验口径 | 保持全集校验（防漂移），错误信息注明「未入链的声明源亦须双校验通过」 |
> | ds-W2 statusCode 非结构化 | HTTP 错误对象附 statusCode；switch/exhaust 事件记结构化字段 |
> | ds-W3 switch/exhaust 重叠 | callSource 不再记 switch/exhaust；外层链按「是否真换源」互斥记录（switch 含 from/to） |
> | ds-W4 roles.source 缺失误导 | validate 先判字段存在性，缺 source 显式报错 |
> | ds-W5 输出写失败触发换源 | 输出写入移出 try（本地 IO 与远程重试语义分离） |
> | ds-W1 v1/v2 禁混无代码机制 | 终裁=主控流程纪律+事件字段 dispatcher_version 可审计，不做代码拦截（单一调用者前提） |
> | ds-N1 数组内 null | canonicalize 数组元素亦剔 null（顺序保留），自测向量+1（共 7） |
> | ds-N2 BOM | readJson() 剥 BOM 封装（四处全用） |
> | ds-N4 runId 毫秒 | 保持现状（唯一性优先，可读性 N 级） |
>
> 机检证据：self-test 7 向量全过；validate 3 源 PASS（cfg:add15c606e1b）；
> mock 换源演练重跑 switches=1 落账正常；bad-alias/200 两守卫路径实测拦截。

=============== 文件 1：scripts/ds-call-v2.mjs（v2.1.0 修订版） ===============
/**
 * 外部 API 派发器 v2（角色档案化）——ai-dev-org 技能件。修订=审查链回炉轮 1
 *（Kimi 2B/3W/4N + deepseek 1B(REJECTED 误读)/4W/4N，处置档=
 * Synapse scripts/audits/2026-09-10_skill-audit-a-*-out.md）：
 *  - 角色源路由=org-config roles.<role>.source 优先，registry default_source 兜底（K-B1）。
 *  - 账本目录自动创建；本地 IO 失败降级 stderr 警告不中断、不入远程重试语义（K-B2/ds-B2——
 *    防「成功响应因落账 ENOENT 被当网络错重试=重复计费」）。
 *  - switch/exhaust 互斥：switch 仅在实际换源时记（外层链），末源失败只记 exhaust（ds-W3）。
 *  - HTTP 错误附结构化 statusCode（ds-W2）；输出文件写失败不再触发换源（ds-W5）。
 *  - mock 校验：alias 必须 ∈ 本次链、status ∈ [400,599]（K-W1/W2）。
 *  - 宿主配置单次读入共用；find 未命中/字段缺失给 alias 级错误（K-W3）。
 *  - JSON 读取剥 BOM（ds-N2）；日志 error 文本脱敏 Bearer/api-key 形态（K-N2）；
 *    ledger_path 支持绝对路径（K-N3）。
 *  - 退出码：3=配置级错误（uuid/name 校验、registry↔org-config 角色交叉失败）；
 *    2=源尽 exhaust；1=用法错误。
 *  - v1/v2 禁混用于同一工单=主控流程纪律（单一调用者+事件字段 dispatcher_version
 *    可审计），不做代码级拦截（ds-W1 终裁）。
 * v1 母本=Synapse scripts/audits/ds-call.mjs（受锁件独立服役）。请求构造/响应解析/
 * 退避策略与 v1 一致（429/5xx/网络错指数退避 3 次换源；400/401/403/404 立即换源；
 * 末次守卫抛真实状态码）。
 * 用法：
 *   node ds-call-v2.mjs --role <id> [--source <alias>] [--project <名>]
 *        [--dry-run] [--mock-source <alias>:<status>] <prompt文件> [输出文件]
 *   node ds-call-v2.mjs --list-roles | --list-sources
 */
import { readFileSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs'
import { join, dirname, resolve, isAbsolute, basename } from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { SKILL_ROOT, loadOrgConfig, cfgHash, validateProviders, readHostConfig, readJson } from './org-config.mjs'

const DISPATCHER_VERSION = '2.1.0'
const LOG_PATH = join(dirname(fileURLToPath(import.meta.url)), 'model-routing-log.jsonl')
const REGISTRY_PATH = join(SKILL_ROOT, 'scripts', 'roles', 'registry.json')
const RETRYABLE = (s) => s === 429 || s >= 500
const NO_RETRY = (s) => s === 400 || s === 401 || s === 403 || s === 404
const SCRUB_RE = /(Bearer\s+)?[A-Za-z0-9_-]{24,}/g // 日志脱敏：长 token 形态一律掩码（K-N2）
const scrub = (s) => String(s).replace(SCRUB_RE, '<redacted>')

const exitConfig = (msg) => {
  console.error(msg)
  process.exit(3)
}

// ── 本地落账安全封装：目录自动建+IO 失败降级警告（不抛入远程重试语义） ──
function makeSafeAppend() {
  let warned = false
  return (path, line) => {
    try {
      appendFileSync(path, line, 'utf8')
    } catch (e) {
      if (!warned) {
        warned = true
        console.error(`[ledger-warn] 本地落账失败（后续仅警告一次，不影响派发与远程语义）：${path}: ${e.message}`)
      }
    }
  }
}

// ── 角色装载（注册表路径相对技能根）+ org-config 角色键交叉校验 ──
function loadRole(roleId, merged) {
  const registry = readJson(REGISTRY_PATH)
  const def = registry.roles[roleId]
  if (!def) throw new Error(`未知角色: ${roleId}（可用角色见 --list-roles）`)
  for (const key of Object.keys(merged.roles || {})) {
    if (!registry.roles[key]) exitConfig(`配置错误：org-config 声明了注册表不存在的角色 ${key}（死配置守卫）`)
  }
  const sysPrompt = readFileSync(join(SKILL_ROOT, def.sys_prompt_file), 'utf8')
  const dod = def.dod_file ? readFileSync(join(SKILL_ROOT, def.dod_file), 'utf8') : ''
  const sig = createHash('sha256').update(sysPrompt + '\n---DOD---\n' + dod).digest('hex').slice(0, 8)
  return { id: roleId, def, sysPrompt: sysPrompt.trimEnd(), dod: dod.trim(), sig, version: def.role_version }
}

// ── 源装载（org-config 驱动；宿主配置单次读入；双校验 fail-fast=exit 3） ──
function loadSources(merged, hostCfg) {
  const errors = validateProviders(merged, hostCfg)
  if (errors.length) errors.forEach((e) => console.error(e)), process.exit(3)
  return (merged.source_chain || []).map((alias) => {
    const def = merged.providers[alias]
    const hit = Object.entries(hostCfg.provider || {}).find(([id, p]) => id.startsWith(def.uuid_prefix) && p && p.name === def.entry_name)
    if (!hit) exitConfig(`源装载失败 alias=${alias}（双校验在 validate 应已拦截——此处为不可达守卫）`)
    const [, prov] = hit
    if (!prov.options?.baseURL || !prov.models || Object.keys(prov.models).length === 0)
      exitConfig(`源装载失败 alias=${alias}：宿主条目缺 options.baseURL 或 models 字段`)
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
      headersReal: { 'content-type': 'application/json', 'x-api-key': src.apiKey, 'anthropic-version': '2023-06-01' },
      body: { model: src.modelName, max_tokens: 32768, temperature: 0.2, system, messages: [{ role: 'user', content: prompt }] },
    }
  }
  return {
    url: `${src.baseURL}/chat/completions`,
    method: 'POST',
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

// ── 双落账：运行流水（含 attempt）+ 项目账本（仅 ok/switch/exhaust）；本地 IO 降级 ──
const runId = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14) + '-' + Math.random().toString(36).slice(2, 6)
function makeLogger(role, merged, project, ledgerPath) {
  const safeAppend = makeSafeAppend()
  const ctx = { role_id: role.id, role_version: role.version, role_sig: role.sig, dispatcher_version: DISPATCHER_VERSION, org_config_hash: cfgHash(merged) }
  return {
    ctx,
    routing: (event, fields) => safeAppend(LOG_PATH, JSON.stringify({ ts: new Date().toISOString(), runId, event, ...ctx, ...fields }) + '\n'),
    ledger: (event, fields) => {
      if (!['ok', 'switch', 'exhaust'].includes(event)) return
      const roleCfg = merged.roles?.[role.id] || {}
      safeAppend(ledgerPath, JSON.stringify({ ts: new Date().toISOString(), project, event, role: role.id, tier: roleCfg.tier || 'unspecified', source: fields.source, cfg_hash: ctx.org_config_hash, usage: fields.usage, outcome: scrub(fields.outcome) }) + '\n')
    },
  }
}

// ── 单源调用：源内退避 3 次；attempt/ok 落账；switch/exhaust 由外层链记（互斥） ──
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
        if (attempt === 3) throw Object.assign(new Error(`HTTP ${res.status} 退避 3 次耗尽${mocked ? '（mock）' : ''}`), { statusCode: res.status })
        const wait = mocked ? 0 : 5000 * 2 ** attempt
        if (wait) console.error(`[${src.alias}] HTTP ${res.status},退避 ${wait}ms(第 ${attempt + 1} 次)`)
        await new Promise((r) => setTimeout(r, wait))
        continue
      }
      if (!res.ok) {
        const detail = scrub((await res.text()).slice(0, 300))
        if (NO_RETRY(res.status)) throw Object.assign(new Error(`HTTP ${res.status}: ${detail}`), { fatal: true, statusCode: res.status })
        if (attempt === 3) throw Object.assign(new Error(`HTTP ${res.status}: ${detail}`), { statusCode: res.status })
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
      if (e.fatal || attempt === 3) throw e // switch/exhaust 由外层按「是否真换源」记（互斥语义）
      const wait = mocked ? 0 : 5000 * 2 ** attempt
      if (wait) console.error(`[${src.alias}] ${scrub(e.message)},退避 ${wait}ms`)
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

const registry = readJson(REGISTRY_PATH)
const { merged } = loadOrgConfig(process.cwd())
const rawLedger = merged.ledger_path || '.zcode/org-ledger.jsonl'
const ledgerPath = isAbsolute(rawLedger) ? rawLedger : join(process.cwd(), rawLedger)
// 注：--project=账本条目名；配置装载恒从 cwd。死配置守卫（org-config 角色↔registry
// 交叉）仅在派发路径 loadRole 生效，org-config validate 不做注册表交叉。

if (listRoles) {
  console.log('角色注册表（registry_version=' + registry.registry_version + '；路径相对技能根；源路由=org-config 优先/registry 兜底）：')
  for (const [id, def] of Object.entries(registry.roles)) {
    const rc = merged.roles?.[id] || {}
    console.log(`  ${id} | source=${rc.source ?? def.default_source}${rc.source ? '（org-config）' : '（registry 兜底）'} tier=${rc.tier || '?'} | ${def.sys_prompt_file}`)
  }
  process.exit(0)
}

const hostCfg = readHostConfig()
const sources = loadSources(merged, hostCfg)
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
const role = loadRole(roleId, merged)
const system = role.dod ? role.sysPrompt + '\n\n' + role.dod : role.sysPrompt
const routeSource = merged.roles?.[roleId]?.source ?? role.def.default_source // org-config 优先（K-B1）

const promptPath = positional[0]
const outPath = positional[1]
if (!promptPath) {
  console.error('用法: node ds-call-v2.mjs --role <id> [...] <prompt文件> [输出文件]')
  process.exit(1)
}
const prompt = readFileSync(promptPath, 'utf8')

const chain = onlyAlias ? sources.filter((s) => s.alias === onlyAlias) : routeSource === 'chain' ? sources : sources.filter((s) => s.alias === routeSource)
if (chain.length === 0) {
  console.error(onlyAlias ? `未知或不可用源: ${onlyAlias}` : `角色 ${roleId} 路由源 ${routeSource} 不可用`)
  process.exit(1)
}

const mock = mockSpec ? ((m) => (m ? { alias: m[1], status: Number(m[2]) } : null))(/^([^:]+):(\d+)$/.exec(mockSpec)) : null
if (mockSpec && (!mock || Number.isNaN(mock.status))) throw new Error('--mock-source 需要 <alias>:<status> 形如 kimi-main:429')
if (mock && !chain.some((s) => s.alias === mock.alias)) exitConfig(`--mock-source 的 alias ${mock.alias} 不在本次链 ${chain.map((s) => s.alias).join('→')} 内（防演练静默真调）`)
if (mock && (mock.status < 400 || mock.status > 599)) exitConfig('--mock-source 的 status 须在 [400,599]（故障注入语义；无成功路径）')

const logger = makeLogger(role, merged, projectName, ledgerPath)
if (dryRun) {
  console.log(
    JSON.stringify(
      {
        runId,
        role: { id: role.id, version: role.version, sig: role.sig, sys_prompt: role.sysPrompt, dod: role.dod, assembled_system: system },
        chain: chain.map((s) => s.alias),
        route_source: routeSource,
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

// 账本目录先建（K-B2/ds-B2）——置于只读分支之后，零副作用命令不建目录（W-1）
try {
  mkdirSync(dirname(ledgerPath), { recursive: true })
} catch (e) {
  exitConfig(`账本目录创建失败 ${dirname(ledgerPath)}: ${e.message}`)
}

let switches = 0
for (let i = 0; i < chain.length; i++) {
  const s = chain[i]
  console.error(`[routing] run=${runId} role=${role.id}@${role.sig} cfg=${cfgHash(merged)} 尝试源 ${i + 1}/${chain.length}: ${s.alias}(${s.modelName})`)
  let result
  try {
    result = await callSource(s, prompt, system, logger, mock)
  } catch (e) {
    const statusCode = e.statusCode
    if (i === chain.length - 1) {
      logger.routing('exhaust', { chain: chain.map((x) => x.alias).join('→'), error: scrub(e.message).slice(0, 300), statusCode })
      logger.ledger('exhaust', { source: chain.map((x) => x.alias).join('→'), outcome: 'exhaust-debt（同源审计欠账，主控回退只读审）' })
      console.error(`[routing] 全源尽(${chain.map((x) => x.alias).join('→')}): ${scrub(e.message)}——主控按「同源审计欠账」处置`)
      process.exit(2)
    }
    switches++
    logger.routing('switch', { from: s.alias, to: chain[i + 1].alias, error: scrub(e.message).slice(0, 300), statusCode })
    logger.ledger('switch', { source: s.alias, outcome: scrub(e.message).slice(0, 200) })
    console.error(`[routing] 换源 ${s.alias} → ${chain[i + 1].alias}: ${scrub(e.message).slice(0, 200)}`)
    continue
  }
  // 输出写入在远程调用与重试语义之外（ds-W5：本地 IO 失败不触发换源/重复调用）
  const header = `[routing]: run=${runId} source=${s.alias} model=${s.modelName} role=${role.id}@${role.sig} cfg=${cfgHash(merged)} switches=${switches} usage=in=${result.usage.in ?? '?'},out=${result.usage.out ?? '?'} latency=${result.latencyMs}ms (by ds-call-v2 链)\n\n`
  const body = header + result.text
  console.log(body) // 先出 stdout（W-2：输出文件写失败时正文已在标准流，产物不丢）
  if (outPath) {
    try {
      writeFileSync(outPath, body, 'utf8')
    } catch (e) {
      console.error(`[out-warn] 输出文件写失败（正文已输出 stdout，可手工重定向保全）: ${e.message}`)
      process.exit(1)
    }
  }
  process.exit(0)
}

=============== 文件 2：scripts/org-config.mjs（修订版） ===============
/**
 * org-config 工具（ai-dev-org）：装载/深合并/规范化哈希/源交叉校验/自测。
 * 深合并语义（审核链 B2 终裁）：对象逐字段递归覆盖，未提及字段沿用默认件；
 * 数组整体替换；显式 null=删除该键。
 * 规范化哈希：递归键排序+剔除 null/undefined（对象键值与数组元素皆剔，
 * 顺序保留）+紧凑 JSON.stringify 后 sha256 前 12 位——与键序/空白无关。
 * 退出码：3=配置校验失败（区别于派发器源尽 exhaust=2）；1=用法错误。
 * 用法：
 *   node org-config.mjs [--project <dir>] resolve   # 打印合并后配置
 *   node org-config.mjs [--project <dir>] hash      # 打印 cfg:<hash12>
 *   node org-config.mjs [--project <dir>] validate  # 与宿主 config.json 交叉校验（不符 exit 3）
 *   node org-config.mjs --self-test                 # 合并/哈希语义自测向量
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { homedir } from 'node:os'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

export const SKILL_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_CFG = join(SKILL_ROOT, 'org-config.default.json')

/** JSON 读取（剥 UTF-8 BOM——Windows 编辑器常见，审核链 ds-N2）。 */
export function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''))
}

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

/** 规范化：递归键排序+剔除 null/undefined（对象键值与数组元素，顺序保留）。 */
export function canonicalize(v) {
  if (Array.isArray(v)) return v.filter((x) => x !== null && x !== undefined).map(canonicalize)
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
  const base = readJson(DEFAULT_CFG)
  const overPath = join(projectDir, '.zcode', 'org-config.json')
  const merged = existsSync(overPath) ? deepMerge(base, readJson(overPath)) : base
  return { merged, hasOverride: existsSync(overPath), overPath }
}

/** 读宿主配置（单点封装，供派发器与校验共用——K-W3 单次读入）。 */
export function readHostConfig() {
  return readJson(join(homedir(), '.zcode', 'v2', 'config.json'))
}

/** 与宿主 config.json 交叉校验：uuid 前缀+条目名双命中。返回错误数组（空=通过）。
 *  校验 providers 全集（未入链的已声明源亦须通过——防漂移，审核链 K-N4 口径）。 */
export function validateProviders(cfg, hostCfg) {
  const hc = hostCfg || readHostConfig()
  const entries = Object.entries(hc.provider || {})
  const errors = []
  for (const [alias, def] of Object.entries(cfg.providers || {})) {
    const hit = entries.find(([id, p]) => id.startsWith(def.uuid_prefix) && p && p.name === def.entry_name)
    if (!hit) {
      const near = entries.find(([id]) => id.startsWith(def.uuid_prefix))
      errors.push(
        `源校验失败 alias=${alias} 期望 uuid前缀=${def.uuid_prefix} name=${def.entry_name} ` +
          `实际=${near ? near[0] + '(name=' + near[1].name + ')' : '无该前缀条目'}（未入链的声明源亦须双校验通过）`,
      )
    }
  }
  for (const alias of cfg.source_chain || []) {
    if (!cfg.providers || !cfg.providers[alias]) errors.push(`source_chain 引用未知 alias=${alias}`)
  }
  for (const [role, def] of Object.entries(cfg.roles || {})) {
    if (def.source === undefined) errors.push(`roles.${role}.source 字段缺失（应显式填 chain 或某 provider alias）`)
    else if (def.source !== 'chain' && (!cfg.providers || !cfg.providers[def.source]))
      errors.push(`roles.${role}.source 引用未知 alias=${def.source}`)
  }
  return errors
}

// ── CLI ──
const isMain =
  process.argv[1] && resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()
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
    t('哈希剔 null（对象键）', cfgHash({ x: 1, y: null }) === cfgHash({ x: 1 }))
    t('哈希剔 null（数组元素，顺序保留）', cfgHash({ s: ['a', null, 'b'] }) === cfgHash({ s: ['a', 'b'] }) && cfgHash({ s: ['b', 'a'] }) !== cfgHash({ s: ['a', 'b'] }))
    console.log(fails === 0 ? 'self-test 全过（7 向量）' : `self-test ${fails} 项失败`)
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
      process.exit(3)
    }
    console.log(`validate PASS（${Object.keys(merged.providers || {}).length} 源双校验通过，cfg:${cfgHash(merged)}）`)
  } else {
    console.error('用法: node org-config.mjs [--project <dir>] resolve|hash|validate|--self-test')
    process.exit(1)
  }
}

=============== 文件 3：org-config.default.json（未改动，原版附参） ===============
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

> 补充：Kimi 复审=17/18 ADDRESSED+1 REJECTED 成立、有条件放行；其新 W-1/W-2/N-3 已再修（mkdir 移只读分支后+exitConfig 化/输出先 stdout 后写文件+写失败保正文/用法错误统一 exit 1），N-1/N-2 以头注文档化；registry 不确定项由包 B 送审闭环。deepseek 你审的=含此再修的终版。
