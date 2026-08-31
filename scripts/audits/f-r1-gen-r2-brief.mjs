import fs from 'node:fs'
import { execSync } from 'node:child_process'
const rd = (p) => fs.readFileSync(p, 'utf8')
const jsonName = fs.readdirSync('scripts/audits/f-r1-out').filter((f) => f.endsWith('.json'))[0]
const j = JSON.parse(rd('scripts/audits/f-r1-out/' + jsonName))
const brief = [
  '# F-R1 门一 r2 复核材料包',
  '',
  '> 你是门一对抗审查员(r2 轮)。r1 裁决 B:0/W:6/N:3 有条件放行→主控裁 4 点回炉(W1/W3/W4/W5)+2 点澄清(W2/W6)。复核每点是否 ADDRESSED,并查回炉是否引入新问题。',
  '',
  '## 判定契约',
  '',
  '对回炉 4 点+澄清 2 点逐条「ADDRESSED/NOT+证据引用」;新发现按 B/W/N;末行终判(放行/再回炉)。',
  '',
  '## 主控澄清(r1 W2/W6——r1 材料包缺陷,非实现问题)',
  '',
  '- **W2 澄清**:workspace.css 改动=**同场需求 1(用户 2026-08-31 直接下令)主控直做**——课题下拉面板入场动画 translateY(-4px) 上飘改 scale(0.92) 放大(用户观感裁决:贴顶栏上飘出屏难看)。实现者报告「进场即有的他人未提交改动」表述正确(主控=他人)。CSS 注释已含「用户裁决 2026-08-31」声明。非 F-R1 面混入。',
  '- **W6 澄清**:makeLoadingTab 两分支——prev 存在(error 重试)走 `{ ...prev, status: \'loading\' }` 沿 prev 继承 pageLayout;prev 缺席(新建)走字面量显式 `pageLayout: \'single\'`。r1 所引「新增行 pageLayout: single 位于对象字面量」=新建分支,与继承无矛盾;单测①c(error 重试保持 double)绿佐证。源码原文:makeLoadingTab(paperId, prev): if (prev !== undefined) return { ...prev, status: \'loading\' }; return { paperId, ..., pageLayout: \'single\' }。',
  '',
  '## 回炉处置摘要(实现者)',
  '',
  '1. W3:③追加末行专项断言([data-page-row=5] 行内 data-page-box 恰 1+children.length===1+唯一盒宽 700px=末页原始宽×zoom);变异红证:末行右盒改渲染占位空盒→③+⑦ 2 红→还原 diff 空→回绿(f-r1-mut-W3.txt)。2. W4:探针 B 期望值改 DOM 采集全部 20 页盒 sizes→columnWidthFor(sizes,1,double);复验 zoom=133%≈(1625−24)/1202。3. W5:滚动位取同源锚(双页态/100%/当前页行顶双端)816.8→816.8 |Δ|=0;roots 改锁既有不变量 渲染集≤可见×(2·recycleWindow+1)=10 PASS。回炉中诊断两个既有面(非 F-R1 引入,登记台账不并票):a)ui-scale≠1 时 reader 程序滚动漂移 160-450px(单页对照同现);b)扫描式连开 pdfjs stream pump 竞态 pageerror。4. W1:报告 §3 修正为 518 行+tests eslint max-lines off 豁免口径。新测试 16 用例全绿;四件套 50/50;typecheck/lint 0 错;探针 17/17 两轮复跑稳定。',
  '',
  '## r1 裁决原文(截首 6000 字)',
  '',
  rd('scripts/audits/f-r1-gate1-ds.raw.txt').slice(0, 6000),
  '',
  '## 回炉后 diff 全文(工作区终态)',
  '',
  '```diff',
  execSync('git diff', { encoding: 'utf8' }),
  '```',
  '',
  '## 探针 results 终态(17 条)',
  '',
  '```json',
  JSON.stringify(j.results, null, 1),
  '```',
  '',
  '## 输出纪律',
  '',
  '先统计行(六点判定+新发现计数+终判一句);逐条引证据;150 行内;异基座读不了盘——结论只能来自本材料包;不确定写存疑。',
  ''
].join('\n')
fs.writeFileSync('scripts/audits/f-r1-gate1-r2-brief.md', brief)
console.log('written', fs.statSync('scripts/audits/f-r1-gate1-r2-brief.md').size)
