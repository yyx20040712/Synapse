// b27-relay-move: 把误置于文件尾的 batch 27 日志块移动到「## 批次日志」标题后（新者在上惯例）
// 行前缀/字面量匹配，零正则（b26 教训）
import { readFileSync, writeFileSync, renameSync } from 'node:fs'

const RELAY = 'docs/handoff/relay.md'
const text = readFileSync(RELAY, 'utf8')
const marker = '### batch 27 — 2026-09-19'
const header = '## 批次日志（追加，勿改写）'

const firstIdx = text.indexOf(marker)
if (firstIdx === -1) throw new Error('batch 27 block not found')
const block = text.slice(firstIdx)
const body = text.slice(0, firstIdx).replace(/\n+$/, '\n')

const headerIdx = body.indexOf(header + '\n')
if (headerIdx === -1) throw new Error('batch log header not found')
const insertAt = headerIdx + (header + '\n').length
const out = body.slice(0, insertAt) + '\n' + block.replace(/\n+$/, '\n') + '\n' + body.slice(insertAt)

writeFileSync(RELAY + '.tmp', out)
renameSync(RELAY + '.tmp', RELAY)

const back = readFileSync(RELAY, 'utf8')
const lines = back.split('\n')
const b27pos = lines.findIndex((l) => l.startsWith(marker))
const headerPos = lines.findIndex((l) => l === header)
const nextBatchPos = lines.findIndex((l) => l.startsWith('### batch 26 增补三'))
if (!(b27pos > headerPos && nextBatchPos > b27pos)) throw new Error('move verify failed')
console.log(`MOVE_OK b27@line${b27pos + 1} header@line${headerPos + 1} batch26增补三@line${nextBatchPos + 1}`)
