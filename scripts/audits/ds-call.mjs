/**
 * deepseek 行内调用器(v11 §3 异基座一审制度化——形态②:API 行内调用)。
 * 从 ~/.zcode/v2/config.json 读 deepseek provider(deepseek-v4-flash),
 * 不落盘密钥。用法:node ds-call.mjs <prompt文件> [输出文件]
 * 退避:429/5xx 指数退避 3 次;超时 10min/次。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const cfg = JSON.parse(readFileSync(join(homedir(), '.zcode', 'v2', 'config.json'), 'utf8'))
const prov = cfg.provider['8ad55776-2296-4f1a-bc46-05755c8f1300']
if (!prov) throw new Error('deepseek provider 未配置')
const baseURL = prov.options.baseURL.replace(/\/$/, '')
const apiKey = prov.options.apiKey
const model = Object.keys(prov.models)[0]

const promptPath = process.argv[2]
const outPath = process.argv[3]
if (!promptPath) throw new Error('用法: node ds-call.mjs <prompt文件> [输出文件]')
const prompt = readFileSync(promptPath, 'utf8')

for (let attempt = 0; attempt < 4; attempt++) {
  try {
    const res = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: '你是一名对抗式代码审查员(门一)。你的职责是找出实现与票面规约的偏差、边界缺陷、静默失败与测试盲区。只报告有代码证据支撑的问题,每条给出文件:行号或代码摘录。不确定的明确说不确定。用中文输出。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 32768
      }),
      signal: AbortSignal.timeout(600_000)
    })
    if (res.status === 429 || res.status >= 500) {
      const wait = 5000 * 2 ** attempt
      console.error(`[ds] HTTP ${res.status},退避 ${wait}ms(第 ${attempt + 1} 次)`)
      await new Promise(r => setTimeout(r, wait))
      continue
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`)
    const data = await res.json()
    const msg = data.choices?.[0]?.message || {}
    const finish = data.choices?.[0]?.finish_reason
    let text = msg.content || ''
    if (!text && msg.reasoning_content) text = '[仅推理无正文,finish=' + finish + ']\n' + msg.reasoning_content
    if (!text) throw new Error('空响应 finish=' + finish + ' usage=' + JSON.stringify(data.usage))
    if (outPath) writeFileSync(outPath, text, 'utf8')
    console.log(text)
    process.exit(0)
  } catch (e) {
    if (attempt === 3) { console.error('[ds] 失败:', e.message); process.exit(1) }
    const wait = 5000 * 2 ** attempt
    console.error(`[ds] ${e.message},退避 ${wait}ms`)
    await new Promise(r => setTimeout(r, wait))
  }
}
