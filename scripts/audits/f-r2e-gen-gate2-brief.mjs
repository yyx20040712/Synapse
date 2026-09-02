/**
 * [F-R2e] 门二 brief 生成器——嵌入门一裁决全文+修票终版 diff+排查报告终版。
 * 用法:node scripts/audits/f-r2e-gen-gate2-brief.mjs(产物=f-r2e-gate2-brief.md)
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const read = (p) => readFileSync(join(dir, p), 'utf8')

const gate1 = read('f-r2e-gate1-kimi.md')
const diff = read('f-r2e-fix2.diff')
const report = read('f-r2e-investigation.md')

const brief = `# F-R2e 排查票门二审任务书(独立终审)

你是门二独立终审员(与门一异构)。对象=F-R2e 排查票**回炉后终态**:机制定性+修票(含门一 B-1/W-4 回炉修复)。你的职责:终审放行判定——修复是否解除 Blocker、报告口径是否如实、有无门一未覆盖的新问题。输出:每条 [B/W/N]+结论;末行给「PASS / 条件 PASS(条件列清)/ FAIL」。

审查要点:
1. 门一 B-1(稳定门穷尽静默返回)的修复形态:25 轮 3s 预算+穷尽 expect(false) 确定红+throw unreachable——是否彻底解除?expect(false,...).toBe(true) 的红形态是否可靠(Playwright expect 语义)?
2. 门一 W-4(零盒假绿)修复:measure 内 r/c 的 w/h<=0 →null(未就绪轮询,穷尽红)——display:none 假绿面是否闭合?注意:若两程恒 display:none,穷尽时 expect(prev).not.toBeNull() 先红(prev=null)——红形态正确性?
3. 修票终版 diff(下附)的其余面:抛 new Error("unreachable") 在 TS 控制流分析的作用(return 语义);25 轮×120ms×2 程时长代价;断言语义四值同源(相对 canvas)的等价性终评。
4. 报告终版(下附)口径:门一 5W/3N 处置是否到位(§0 表/W-G1 暂裁/§3 未证假说/§5 限定/§6 语义如实认定/§9 处置表)。
5. 整体放行判定:排查票交付(定性+修票+探针资产)是否达到收口标准。

## 门一裁决(全文,处置对照基准)

${gate1}

## 修票终版 diff(git diff,100 行)

\`\`\`diff
${diff}
\`\`\`

## 排查报告终版(f-r2e-investigation.md 全文)

${report}
`

writeFileSync(join(dir, 'f-r2e-gate2-brief.md'), brief)
console.log('gate2 brief lines:', brief.split('\n').length)
