import fs from 'node:fs'
import { execSync } from 'node:child_process'
const rd = (p) => fs.readFileSync(p, 'utf8')
execSync('git add -N scripts/audits/f-a4-ticket.md scripts/audits/f-a4-impl.report.md scripts/audits/f-a4-verify.mjs scripts/audits/f-a4-out scripts/audits/f-a4-baseline.raw.txt scripts/audits/f-a4-first-red.raw.txt scripts/audits/f-a4-e2e-first-red.raw.txt src/renderer/features/reader/selection-geometry.ts src/renderer/features/reader/selection-paint.tsx src/renderer/features/reader/annotation-resolve.ts tests/unit/renderer/selection-paint.test.tsx', { encoding: 'utf8' })
const jsonName = fs.readdirSync('scripts/audits/f-a4-out').filter((f) => f.endsWith('.json'))[0]
const j = JSON.parse(rd('scripts/audits/f-a4-out/' + jsonName))
const brief = [
  '# F-A4 门一对抗深审材料包',
  '',
  '> 你是门一对抗审查员(异基座 deepseek)。工单=选区视觉并集自绘+标注贴行自适应+工具条定位归一(三面同链,用户 2026-08-31 复测反馈驱动)。对抗性审查:行为缺陷/测试盲区/票面-实现偏差/取证不充分。每条【B/W/N+证据引用】。',
  '',
  '## 主控裁决记录(审你是否有异议)',
  '',
  '- **R2-SET1 受锁断言修正(主控直改,非实现者面)**:同场需求 1 顶栏增高令(theme.css header 44→56px,主控直做)使 smoke.spec 三处「header 恒 44」断言过时——实现者隔离实验实证(还 HEAD 即绿)。主控改断言 44→56([locked-change] 随用户令)+复跑 smoke 6/6 绿。主控直做时漏查受锁断言面——教训披露:直做改动同样要 grep 受锁面。',
  '- 实现者 7 项自裁(报告 §2):portal 进页盒(票面字面=SelectionLayer 内渲染,实装=portal 进页盒 z2——为锚定页盒坐标系)/上游 mergeLineRects 同修(票面只指 mergeRects)/band 半前导负值修正等——主控预审均合理,你复核。',
  '- ADR-0019 R1 修订(回官方原生→自绘并集):依据=用户根治令「重叠不加深」+native ::selection 无法并集(pdf.js 官方缺陷同型)+当年删除病根(拖选零反馈/30% accent 近不可见)今均已解(selectionchange 200ms 路径在场/灰 0.20 在案)。',
  '',
  '## 审查清单(五问)',
  '',
  '1. 行为:a 面自绘层与 ::selection transparent 的组合——拖选期(selectionchange 200ms 节流)与松手/清除的视觉-状态同步(INV-37 Escape 语义)?portal 进页盒的生命周期(页盒卸载/换页)是否干净?b 面行高感知容差(lineH 可选参)对存量 rects 零迁移是否真成立(挂 B 读时归并路径)?c 面归一比值(守卫≤0→1)在 jsdom(clientWidth=0)与真机的分支行为?',
  '2. 测试:新 selection-paint.test 11 用例+受锁三件改写是否锁死三面行为?先行红证据(3 断言红+1 模块红+e2e 断言红)对 HEAD 的有效性?变异 M1~M5 各锁独立面?',
  '3. 票面-实现偏差:三面修法兑现?§0 矩阵逐格?自裁 7 项是否越票面?',
  '4. 取证:真机 12/12(large 档真鼠标)修前/修后数值(自绘 0→4 块相交 0/并簇 1→3 块顶偏 1.48px/工具条 334.1→9.4px/zoom 漂移 0.67%)是否充分支撑三面闭环?修前基线(baseline.raw)与修后对照的实验设计是否同点位唯一变量?',
  '5. 受锁改写:selection-layer.test(定位断言归一坐标)/annotation-merge.test(INV-40 边界)/reader-text.spec(官方半透明值→自绘断言,0 计数守卫反转为在场断言)——改向是否忠实(改断言让过 vs 语义随令)?smoke.spec 44→56 主控修正是否完备(还有无其他 44 锚)?',
  '',
  '## 证据关键段原文',
  '',
  '### 真机探针 results(修前/修后对照)',
  '',
  '```json',
  JSON.stringify(j.results, null, 1).slice(0, 3500),
  '```',
  '',
  '## 票面全文',
  '',
  rd('scripts/audits/f-a4-ticket.md'),
  '',
  '## 实现报告全文',
  '',
  rd('scripts/audits/f-a4-impl.report.md'),
  '',
  '## diff 全文(add -N 后,含新件+受锁改写+theme.css/workspace.css 同场需求 1 面)',
  '',
  '```diff',
  execSync('git diff', { encoding: 'utf8' }),
  '```',
  '',
  '## 输出纪律(必读)',
  '',
  '先统计行「B:N/W:N/N:N+总评一句」;逐条展开引证据(文件/断言 id/行);末行放行判定(放行/回炉+回炉点);200 行内;异基座读不了盘——结论只能来自本材料包;不确定写存疑。',
  ''
].join('\n')
fs.writeFileSync('scripts/audits/f-a4-gate1-brief.md', brief)
console.log('written', fs.statSync('scripts/audits/f-a4-gate1-brief.md').size)
