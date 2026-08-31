import fs from 'node:fs'
import { execSync } from 'node:child_process'
const rd = (p) => fs.readFileSync(p, 'utf8')
execSync('git add -N scripts/audits/f-a4-verify.mjs scripts/audits/f-a4-ticket.md scripts/audits/f-a4-impl.report.md src/renderer/features/reader tests/unit/renderer/selection-paint.test.tsx', { encoding: 'utf8' })
const raws = fs.readdirSync('scripts/audits').filter((f) => f.startsWith('f-a4') && f.endsWith('.json') || f === 'f-a4-rework1-after.raw.txt')
const probe = rd('scripts/audits/f-a4-rework1-after.raw.txt')
const brief = [
  '# F-A4 门一 r2 复核材料包',
  '',
  '> 你是门一对抗审查员(r2)。r1 裁决 B:1/W:5/N:3 回炉→回炉 1 完成(B1 双路节流/W1 数字订正/W2 双基准正式化+W4 主控处置 INV-39 44→56/W3 s6 补强)。复核每点 ADDRESSED+新问题。',
  '',
  '## 判定契约',
  '',
  '对 B1/W1/W2/W3/W4 逐条「ADDRESSED/NOT+证据引用」;新发现按 B/W/N;末行终判(放行/再回炉)。',
  '',
  '## 回炉处置摘要(实现者+主控)',
  '',
  '- **B1**:selectionchange 拆双路——自绘层 createVisualScheduler 工厂(leading+trailing 节流:首个事件立即渲染,200ms 窗口最多一次);工具条评估保持防抖(弹出语义零变);evaluate 增 visualOnly 参。S1b 守卫测试(连发 selectionchange×5 不 mouseup→自绘立即在场+工具条未弹)对修前**先行红**→绿;MB 变异(节流退化防抖)S1b 红+还原 diff 空+回绿双验。SelectionLayer 282 超 250→调度器+定位装配抽入 selection-geometry,终态 243 行(wc)。',
  '- **W2**:票面 §5② 修订(双基准:灰=行盒并集/黄=字形墨带,有意差声明);探针新增 b/ann-vs-paint-bounded 黄 vs 灰 top/height 差 ≤4px 上界断言,实测 3.88/3.40 入界;黄块贴行两判据(顶 ≤2/底 [−1,+3])保持。',
  '- **W1**:报告订正——主场景 3 块(跨 3 行)/zoom150 会话 4 块分列;行数 wc 复核(SelectionLayer 243/geometry 144/探针 407/测试 391)。',
  '- **W3**:s6/zoom-block-count 块数一致性 |Δn|≤1 接受域(自裁:z150 重选带=高亮带四角与原拖选带行边界含差 ±1 行;3 vs 4 入界,超出 FAIL)+s6/z150-toolbar-near 10.7px<60+s6/z150-ann-align 1.96px≤2。',
  '- **W4(主控)**:docs/invariants.md INV-39 两处「恒 44」已同步 56(含 e2e 锚描述);smoke.spec 三处断言 44→56+复跑 6/6 绿(r1 材料包已含)。',
  '- **N3(主控核)**:theme.test 锚「.app-content-row/[data-page-column] zoom 声明形态」不锚 header 高度——无险。',
  '- 测试:npm run test 118 文件/1001 用例全绿(+S1b);typecheck/lint/build/quality 0;受锁面零新改(S1b 在新建 selection-paint.test.tsx)。',
  '',
  '## 探针 r2 终态全文(f-a4-rework1-after.raw.txt)',
  '',
  '```',
  probe.slice(0, 3000),
  '```',
  '',
  '## r1 裁决原文(截首 7000 字)',
  '',
  rd('scripts/audits/f-a4-gate1-ds.raw.txt').slice(0, 7000),
  '',
  '## 回炉后 diff 全文(工作区终态,add -N 后)',
  '',
  '```diff',
  execSync('git diff', { encoding: 'utf8' }),
  '```',
  '',
  '## 输出纪律',
  '',
  '先统计行(五点判定+新发现计数+终判一句);逐条引证据;150 行内;异基座读不了盘——结论只能来自本材料包;不确定写存疑。',
  ''
].join('\n')
fs.writeFileSync('scripts/audits/f-a4-gate1-r2-brief.md', brief)
console.log('written', fs.statSync('scripts/audits/f-a4-gate1-r2-brief.md').size)
