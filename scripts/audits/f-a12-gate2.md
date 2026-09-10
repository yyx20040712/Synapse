# F-A12 门二终审（二审实证岗，2026-09-10）

**裁决：PASS 无条件**（R-1/R-2/W5 随档入录不阻断——独立复核认同门一处置）。

## 一、处置核对（门一两轮 5W+4N+R1-R4 vs 实物）

- **W1** 域判别在码：release-affinity.ts L196-201 nearestGroupOf+`upX <= groupRight + 1`（1px 容差）；红证 f-a12-red3.raw.txt=2 failed（W1/W2 各一，对回炉前代码）亲验在档；MW1 变异 f-a12-mutation3.raw.txt=1 failed/13 passed 亲验 ✓。
- **W2** prevTop 上界在码 L191-193（`upY < Math.min(...tops)` 置 x/y 判据前）；MW2 f-a12-mutation4.raw.txt=1 failed 亲验 ✓。
- **W3** 用例在测试件 L239（backward 翻转链，`'AB firstCD se'` 申报口径）——申报=回归锁非红证，与门一 R2 认定一致 ✓。
- **W4** selection-layer-fa12.test.tsx 亲读：三态用例齐（①程序化零触 L104/②moved<3 早退 L114/③真划选重定向 L125），always-active（describe 无 guardedDescribe），断言面=selection 终态 ✓。夹具严谨化 4 处（upX 100/260 在场，red3 档 12 passed 佐证对旧断言中性）。
- **W5/N1-N4**：W5 入档无代码动作 ✓；N4 行数现已可见=237 ≤250 ✓。
- **R-1 独立复核**：nearestGroupOf 与 rowEndOf 内部距离式**同型**（均 g[0].left/g[len-1].right 首尾式——组定位必然一致，比门一 R2 表述更强）；异式仅在 W1 域判别（Math.max right）与距离式之间——组内 right 非单调形态（pdf.js 同行 span 无重叠=罕见）下选组偏差、保守方向，**入档不阻断，认同主控裁决**。**R-2**：代码路径亲验=upX 落双栏间隙/左缘外均经 upX<=groupRight+1 归 null 保守零变，已知边界 ✓。R-3/R-4 推演成立。

## 二、母本符合度

手势态表六态逐态核码：程序化零触（downX NaN→dragged false，SelectionLayer L132）/位移<3 早退（L135）/focus 行盒内零变（upY>=top_f null）/浅探重定向（判据链全）/深点零变（距离主判据+大间隙单测）/四零盒守卫（focusBoxAt+boxOf null）——**六态全覆盖**。真机矩阵抽验在场：G2_SEL focus=(Mohanty span,36)、G1/G2 paint 540.3<542.8、db-query end_offset=1465×2+suffix="With regard to urban water infra"（终点不含下段头实锤）；修复前 1504 实据=f-a10-impl.report.md:67+verify-real2 G2_SEL focus off=39（下段头）在场；第三行 5760=真库旧标注原样（申明一致）。

## 三、宪法红线

- 分层：release-affinity.ts 纯函数零 React（import 仅 annotation-anchor/anchor-blank-snap，单向无环）✓；接线在 SelectionLayer。
- 测试纪律：red 首红（import 失败收集红）/red2（判据微调 1 failed）/red3/mutation1-4 全在档亲验；新测试 always-active ✓。
- 行数实测：210/237/284/257/137 对 300/250/300 红线全过 ✓。
- UTF-8：五文件 U+FFFD=0 ✓；TODO/FIXME/placeholder=0 ✓。
- 受锁面：anchor-blank-snap.ts/SelectionLayer.tsx 不在 manifest（非受锁可直接改 ✓）；manifest 含 4 新件（两测试+两探针 mjs）✓。安全禁令零触（纯 DOM API，无 eval/SQL/路径）。

## 四、机器面亲跑

- `npx vitest run`（node v24.20.0）：**17 passed (17)**——release-affinity 14+selection-layer-fa12 3 ✓。
- `node scripts/check-locks.mjs`：316 一致，exit=0 ✓。
- 用例对账：grep it( 计数 14+3=17；green2 raw=162 文件/1579；1579-1573=6 增量=W1/W2/W3 三+W4 三，11+6=17 闭合 ✓。
- 翻 done 推演：registry L266 file='src/renderer/features/reader/SelectionLayer.tsx' 存在 ✓（状态 open——收口前不翻，正确）。
- verify.raw.txt 末段 `exit=0` 亲验在档（主控补证属实）。

## 五、成本自报

token 约 52k in / 9k out；时长约 35 分钟。

**结论：F-A12 终审通过，建议主控收口。**
