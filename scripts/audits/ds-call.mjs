/**
 * 门一外部 API 派发器（v18 P0 扩展：deepseek 单源 → Kimi 链多源）。
 * 源序（references/06 §5 状态机，主源不得主动跳过）：
 *   kimi-main → kimi-backup → deepseek（审计兜底，套餐外计价）
 * 三源皆尽 → exit=2 + exhaust 事件（由主控决策"同源审计欠账"回退只读审子代理）。
 * GLM 兜底不可用：builtin GLM 全条目 anthropic 格式且本项目派发器仅双形态
 * （anthropic messages / OpenAI chat-completions），GLM 端点属 zcode 私有路径——
 * 诚实降级，不伪装可用兜底（references/06 §5 端点事实）。
 *
 * 用法：
 *   node ds-call.mjs <prompt文件> [输出文件]              # 链式派发（默认）
 *   node ds-call.mjs --source <alias> <prompt> [输出]     # 单源直调：kimi-main|kimi-backup|deepseek
 *   node ds-call.mjs --list-sources                       # 列源序（零 API）
 *   node ds-call.mjs --dry-run [--source x] <prompt> [输出]  # 打印请求形态（零 API）
 *
 * 事件流水账：scripts/audits/model-routing-log.jsonl（attempt/ok/switch/exhaust/usage，
 * 逐事件一行 JSON）；输出文件首行附 [routing] 头注（审计报告头标注，v18 §2 P0 要求）。
 * 密钥仅内存读取，不落盘。退避：429/5xx/网络错指数退避 3 次后换源；
 * 400/401/403/404（配置/模型名级错误）不退避立即换源。
 * [locked-change] 2026-09-02 P0：单源 deepseek 调用器扩展为 Kimi 链派发器。
 */
import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const LOG_PATH = join(dirname(fileURLToPath(import.meta.url)), 'model-routing-log.jsonl')
const SYS_PROMPT =
  '你是一名对抗式代码审查员(门一)。你的职责是找出实现与票面规约的偏差、边界缺陷、静默失败与测试盲区。' +
  '只报告有代码证据支撑的问题,每条给出文件:行号或代码摘录。不确定的明确说不确定。用中文输出。'
const RETRYABLE = (s) => s === 429 || s >= 500
const NO_RETRY = (s) => s === 400 || s === 401 || s === 403 || s === 404

// ── 源表：uuid 前缀锚定 config.json 条目（条目级校验防 config 重排后静默错源） ──
const SOURCE_DEFS = [
  { alias: 'kimi-main', uuid: 'b2466f8b', expectName: 'Kimi', kind: 'anthropic', note: 'K3 企业版主源' },
  { alias: 'kimi-backup', uuid: '5e1abd9d', expectName: 'zipoo', kind: 'anthropic', note: '第二配额同端点备源' },
  { alias: 'deepseek', uuid: '8ad55776', expectName: '梁圣', kind: 'openai', note: '审计兜底（套餐外按量）' },
]

function loadSources() {
  const cfg = JSON.parse(readFileSync(join(homedir(), '.zcode', 'v2', 'config.json'), 'utf8'))
  return SOURCE_DEFS.map((def) => {
    const [, prov] =
      Object.entries(cfg.provider || {}).find(([id, p]) => id.startsWith(def.uuid) && p && p.name === def.expectName) || []
    if (!prov) return { ...def, ok: false, err: `provider ${def.uuid}(${def.expectName}) 未配置或 name 不符` }
    return {
      ...def,
      ok: true,
      baseURL: prov.options.baseURL.replace(/\/$/, ''),
      apiKey: prov.options.apiKey,
      model: Object.keys(prov.models)[0],
      modelName: Object.values(prov.models)[0]?.name || Object.keys(prov.models)[0],
    }
  })
}

// ── 双形态请求构造（Kimi 条目 kind=anthropic → /v1/messages；deepseek kind=openai → /chat/completions） ──
// anthropic 路径规范化（2026-09-02 用户修复后适配）：config baseURL 两种形态
// （…/coding 或 …/coding/v1）都先剥尾 /v1 再统一拼 /v1/messages——与 zcode
// 客户端对 kind=anthropic 的拼装语义对齐（旧形态 coding/v1 实调过、新形态
// coding+/v1/messages 等价同路径）。
function buildRequest(src, prompt) {
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
      body: {
        model: src.modelName,
        max_tokens: 32768,
        temperature: 0.2,
        system: SYS_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      },
    }
  }
  return {
    url: `${src.baseURL}/chat/completions`,
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: 'Bearer <' + src.apiKey.length + 'chars>' },
    headersReal: { 'Content-Type': 'application/json', Authorization: `Bearer ${src.apiKey}` },
    body: {
      model: src.modelName,
      messages: [
        { role: 'system', content: SYS_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 32768,
    },
  }
}

// ── 双形态响应解析：归一化 {text, usage:{in,out}, finish} ──
function parseResponse(src, data) {
  if (src.kind === 'anthropic') {
    const text = Array.isArray(data.content)
      ? data.content.filter((b) => b.type === 'text').map((b) => b.text).join('')
      : ''
    return { text, usage: { in: data.usage?.input_tokens, out: data.usage?.output_tokens }, finish: data.stop_reason }
  }
  const msg = data.choices?.[0]?.message || {}
  let text = msg.content || ''
  if (!text && msg.reasoning_content) text = '[仅推理无正文,finish=' + data.choices?.[0]?.finish_reason + ']\n' + msg.reasoning_content
  return {
    text,
    usage: { in: data.usage?.prompt_tokens, out: data.usage?.completion_tokens },
    finish: data.choices?.[0]?.finish_reason,
  }
}

// ── 事件流水账（append，逐事件一行；换源/欠账/用量可指认） ──
const runId = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14) + '-' + Math.random().toString(36).slice(2, 6)
function logEvent(event, fields) {
  appendFileSync(
    LOG_PATH,
    JSON.stringify({ ts: new Date().toISOString(), runId, event, ...fields }) + '\n',
    'utf8',
  )
}

// ── 单源调用：源内退避 3 次，耗尽/不可重试 → 抛错由链换源 ──
async function callSource(src, prompt, { record = true } = {}) {
  const req = buildRequest(src, prompt)
  const t0 = Date.now()
  for (let attempt = 0; attempt < 4; attempt++) {
    if (record) logEvent('attempt', { source: src.alias, model: src.modelName, attempt: attempt + 1, promptBytes: Buffer.byteLength(prompt, 'utf8') })
    try {
      const res = await fetch(req.url, {
        method: req.method,
        headers: req.headersReal,
        body: JSON.stringify(req.body),
        signal: AbortSignal.timeout(600_000),
      })
      if (RETRYABLE(res.status)) {
        // 末次守卫（复审 B3 修）：耗尽即抛真实状态码——外层 catch 落 switch 事件
        //（原形态 continue 出循环落到 try 外 'unreachable'，换源漏记+状态码被抹）
        if (attempt === 3) throw new Error(`HTTP ${res.status} 退避 3 次耗尽`)
        const wait = 5000 * 2 ** attempt
        console.error(`[${src.alias}] HTTP ${res.status},退避 ${wait}ms(第 ${attempt + 1} 次)`)
        await new Promise((r) => setTimeout(r, wait))
        continue
      }
      if (!res.ok) {
        const detail = (await res.text()).slice(0, 300)
        if (NO_RETRY(res.status)) throw Object.assign(new Error(`HTTP ${res.status}: ${detail}`), { fatal: true })
        if (attempt === 3) throw new Error(`HTTP ${res.status}: ${detail}`)
        const wait = 5000 * 2 ** attempt
        console.error(`[${src.alias}] HTTP ${res.status},退避 ${wait}ms`)
        await new Promise((r) => setTimeout(r, wait))
        continue
      }
      const data = await res.json()
      const { text, usage, finish } = parseResponse(src, data)
      if (!text) throw Object.assign(new Error('空响应 finish=' + finish + ' usage=' + JSON.stringify(usage)), { fatal: true })
      if (record) logEvent('ok', { source: src.alias, model: src.modelName, usage, latencyMs: Date.now() - t0, finish })
      return { text, usage, latencyMs: Date.now() - t0 }
    } catch (e) {
      if (e.fatal || attempt === 3) {
        if (record) logEvent('switch', { source: src.alias, model: src.modelName, error: e.message.slice(0, 300), latencyMs: Date.now() - t0 })
        throw e
      }
      const wait = 5000 * 2 ** attempt
      console.error(`[${src.alias}] ${e.message},退避 ${wait}ms`)
      await new Promise((r) => setTimeout(r, wait))
    }
  }
  throw new Error('unreachable')
}

// ── CLI ──
const argv = process.argv.slice(2)
const listOnly = argv.includes('--list-sources')
const dryRun = argv.includes('--dry-run')
let onlyAlias = null
if (argv.includes('--source')) {
  onlyAlias = argv[argv.indexOf('--source') + 1]
  // 缺参显式报错（复审 N2 修）：原形态 undefined 静默退化全链
  if (!onlyAlias || onlyAlias.startsWith('--')) {
    throw new Error('--source 需要别名参数：kimi-main | kimi-backup | deepseek')
  }
}
const positional = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--source')

const sources = loadSources()
if (listOnly) {
  console.log('源序（references/06 §5 状态机；主源不得主动跳过）：')
  sources.forEach((s, i) => {
    console.log(
      `  ${i + 1}. ${s.ok ? s.alias : s.alias + '(不可用)'} | ${s.ok ? s.modelName : ''} | ${s.ok ? s.kind + ' @ ' + s.baseURL : s.err} | ${s.note}`,
    )
  })
  process.exit(sources.some((s) => !s.ok) ? 1 : 0)
}

const promptPath = positional[0]
const outPath = positional[1]
if (!promptPath) throw new Error('用法: node ds-call.mjs [--dry-run] [--source <alias>] <prompt文件> [输出文件]')
const prompt = readFileSync(promptPath, 'utf8')

const chain = onlyAlias ? sources.filter((s) => s.alias === onlyAlias) : sources.filter((s) => s.ok)
if (chain.length === 0) throw new Error(onlyAlias ? `未知或不可用源: ${onlyAlias}` : '无可用源')

if (dryRun) {
  console.log(`runId=${runId} 源序=${chain.map((s) => s.alias).join(' → ')}`)
  for (const s of chain) {
    const req = buildRequest(s, prompt)
    const bodyPeek = { ...req.body }
    if (bodyPeek.messages) bodyPeek.messages = `<${req.body.messages.length} 条,首条内容 ${Buffer.byteLength(prompt, 'utf8')}B>`
    if (bodyPeek.system) bodyPeek.system = '<' + SYS_PROMPT.length + ' chars>'
    console.log(`\n── ${s.alias} (${s.kind}) ──\n${req.method} ${req.url}\nheaders=${JSON.stringify(req.headers)}\nbody=${JSON.stringify(bodyPeek)}`)
  }
  console.log(`\n事件流水账=${LOG_PATH}${existsSync(LOG_PATH) ? '（已存在,append）' : '（新建）'}`)
  process.exit(0)
}

let switches = 0
for (let i = 0; i < chain.length; i++) {
  const s = chain[i]
  try {
    console.error(`[routing] run=${runId} 尝试源 ${i + 1}/${chain.length}: ${s.alias}(${s.modelName})`)
    const { text, usage, latencyMs } = await callSource(s, prompt)
    const header = `[routing]: run=${runId} source=${s.alias} model=${s.modelName} switches=${switches} usage=in=${usage.in ?? '?'},out=${usage.out ?? '?'} latency=${latencyMs}ms (by ds-call.mjs 链)\n\n`
    if (outPath) writeFileSync(outPath, header + text, 'utf8')
    console.log(header + text)
    process.exit(0)
  } catch (e) {
    switches++
    if (i === chain.length - 1) {
      logEvent('exhaust', { chain: chain.map((x) => x.alias).join('→'), error: e.message.slice(0, 300) })
      console.error(`[routing] 全源尽(${chain.map((x) => x.alias).join('→')}): ${e.message}——主控按"同源审计欠账"处置`)
      process.exit(2)
    }
    console.error(`[routing] 换源 ${s.alias} → ${chain[i + 1].alias}: ${e.message.slice(0, 200)}`)
  }
}
