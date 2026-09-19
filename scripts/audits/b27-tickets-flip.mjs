// b27-tickets-flip: registry F-DOCGOV-01 open→done（主控收口职责）
// 谓词锚定行首 `{ id: 'F-DOCGOV-01'` 定义形态——b25/G10 谓词盲区教训：
// 票 id 在他票 summary 中被文字提名是 nomination 噪声面，includes() 过宽必误配。
import { readFileSync, writeFileSync, renameSync } from 'node:fs'

const REG = 'tickets/registry.ts'
const lines = readFileSync(REG, 'utf8').split('\n')
const PREFIX = "  { id: 'F-DOCGOV-01', "
let flipped = 0
const out = lines.map((line) => {
  if (line.startsWith(PREFIX) && line.includes("status: 'open'")) {
    flipped += 1
    return line.replace("status: 'open'", "status: 'done'")
  }
  return line
})
if (flipped !== 1) {
  console.error(`FLIP_GUARD_FAILED: expect exactly 1 flip, got ${flipped}`)
  process.exit(1)
}
writeFileSync(`${REG}.tmp`, out.join('\n'))
renameSync(`${REG}.tmp`, REG)
const back = readFileSync(REG, 'utf8')
const doneLine = back.split('\n').find((l) => l.startsWith(PREFIX))
const openLeft = back.split('\n').filter((l) => l.startsWith('  { id: ') && l.includes("status: 'open'")).length
if (!doneLine || !doneLine.includes("status: 'done'")) { console.error('FLIP_VERIFY_FAILED'); process.exit(1) }
console.log(`FLIP_OK FLIP_MOVED=1 RESIDUE_CHECK=open_tickets_left=${openLeft}`)
