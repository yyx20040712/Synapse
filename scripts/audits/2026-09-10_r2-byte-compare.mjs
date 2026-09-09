/**
 * R2 字节比对（回归前置第 2 项）：Synapse 受锁派发器 v1 的内嵌 SYS_PROMPT
 * 与 ai-dev-org 技能角色档案 scripts/roles/gate1-reviewer.md 必须字节级一致
 * （trimEnd 口径——文件尾换行差异豁免）。输出 PASS/FAIL+两侧长度。
 * 证据件：2026-09-10 组织技能化战役（审核链 B4 终裁的判据形态）。
 */
import { readFileSync } from 'node:fs'

const v1 = readFileSync('scripts/audits/ds-call.mjs', 'utf8')
const m = v1.match(/const SYS_PROMPT =\s*\n?\s*'([^']*)'\s*\+\s*\n?\s*'([^']*)'/)
if (!m) {
  console.error('FAIL 无法从 ds-call.mjs 提取 SYS_PROMPT（源形态变更？）')
  process.exit(1)
}
const expect = m[1] + m[2]
const roleFile = readFileSync('C:/Users/Administrator/.zcode/skills/ai-dev-org/scripts/roles/gate1-reviewer.md', 'utf8').trimEnd()
const pass = expect === roleFile
console.log(`${pass ? 'PASS' : 'FAIL'} R2 字节比对：v1=${expect.length}B role-file=${roleFile.length}B`)
if (!pass) {
  console.error('v1   =' + JSON.stringify(expect))
  console.error('role=' + JSON.stringify(roleFile))
}
process.exit(pass ? 0 : 1)
