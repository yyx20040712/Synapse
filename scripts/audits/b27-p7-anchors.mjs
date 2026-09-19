// b27-p7-anchors.mjs — F-DOCGOV-01 M2 探针：退役页 P7 锚段全集核验
// 判定值一律从被验文件实测提取（G11 教训③：禁硬编码预期值通过性断言）：
// ①ROADMAP `^### (P7-X)：` 实测集 ⊇ src 工单头注 `^// b3: P7-X` 唯一集
// ②锚段计数=实测列表长度（与 check-tickets.mjs:247 同 regex 口径——门二 P2-1 勘正）
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const roadmap = readFileSync('docs/ROADMAP.md', 'utf8')
const anchors = [...roadmap.matchAll(/^### (P7-[A-Z])：/gm)].map((m) => m[1])
const anchorSet = new Set(anchors)

const b3Scopes = new Set()
const SRC = 'src'
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) { walk(p); continue }
    if (!/\.(ts|tsx)$/.test(name)) continue
    const content = readFileSync(p, 'utf8')
    const codeStart = /\n\s*(?:import|export|const|let|function|class)\b/.exec(content)
    const header = codeStart === null ? content : content.slice(0, codeStart.index)
    for (const m of header.matchAll(/^\/\/\s*b3:\s*(P7-[A-Z])\s*$/gm)) b3Scopes.add(m[1])
  }
}
walk(SRC)

const missing = [...b3Scopes].filter((s) => !anchorSet.has(s))
console.log(`ROADMAP anchors (${anchors.length}): ${anchors.join('/')}`)
console.log(`src b3 header scopes (${b3Scopes.size}): ${[...b3Scopes].sort().join('/')}`)
if (missing.length > 0) {
  console.error(`FAIL: src scopes missing from ROADMAP anchors: ${missing.join('/')}`)
  process.exit(1)
}
if (anchors.length !== new Set(anchors).size) {
  console.error('FAIL: duplicate anchor headings in ROADMAP')
  process.exit(1)
}
console.log(`PASS: src b3 scopes ⊆ ROADMAP anchors（机器输入完整——退役页保锚段方案 a 兑现）`)
