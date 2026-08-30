# F-L1-C 门二终审报告（三屋模式 ADR-0017）

> 审计人：门二终审子代理 · 2026-08-30 · 只读审计（未跑任何 npm/test 命令；仅
> read/grep/wc/git status 类短查）。
> 输入：终态工作区五文件+两测试实物 / f-l1c-ticket.md / f-l1c-impl.report.md（§一~§九）/
> f-l1c-gate1-report.md（主审+复核双段）/ 15 份 raw 证据 / f-l1-out/f-l1c-verify.json+截图。
>
> 开工技能清点：code-review-excellence（**用**——终审核心方法论）；
> verification-before-completion（**用**——落档前四清单全核对）；test-driven-development
> （**部分用**——不写实现，按其纪律审查 TDD 证据链四档）；systematic-debugging/
> browser/git 类（**不用**——本角色铁律只读+禁 npm/test/git 长命令，无调试与执行面）。
> 配置自查：与主控会话同源配置，无思考等级配错迹象。

## 清单 1 处置核对 —— 通过

- **R1 包络扩容**：现场核实 edge-label-layout.ts:80-82——dxs 五档
  `[0, ±(hw+16), ±(hw+16)×2]`（满宽标签第三档 ±166）、dy `i<=10`=±10lh（21 档），
  与回炉令逐字一致；头注注明包络值+f-l1c-verify.json 实测依据（:16-23）✓。
- **R2 主动滚动三连**：LineageEdges.tsx:67-74——截断命中（`scrollHeight >
  clientHeight + 1`）时 stopPropagation+preventDefault+主动
  `scrollTop=clamp(scrollTop+deltaY, 0, max)` 三连，未截断/非标签 return 零扰动 ✓。
  stopPropagation 保留正确（preventDefault 不禁 svg 祖先链原生 zoom listener）。
- **②b/③b/⑤ 夹具**：edge-label-layout.test.ts:63-79（②b 双标签锚节点中心）/
  :92-100（③b 单标签）/:112-118（⑤ 环绕大盒 hw250/hh155 铺满 x±233/y±144 包络
  ——门一复核复算全覆盖必回 anchor，采信）✓。
- **⑧ 改锁非弱化**：lineage-canvas.test.tsx:430-442 新锁「x 差恰 −166+同 y」=
  精确值锁（与旧「恰 +4lh」同等强度），M1R 复跑红（`expected +0 to be close to
  -166`）实证锁仍杀放置器摘除；y 错开性质由 ②/②b 纯函数级 disjoint 承接，无缺口 ✓。
- **§九勘误如实**：坐标系 bug（中心锚 vs 左上角语义）假阳性声明+「1 对标签互叠=
  真缺陷」+取证器修正入档，与 R1 修法自洽（±5lh 对 label-label 场景确实不足）✓。
- **门一遗留 W 处置现状**：复核 W（探针 lint 红+manifest 过期）**已解除**——
  f-l1c-scroll-probe.mjs/hit-probe.mjs 已从工作树删除（目录清单实证）；manifest
  2026-08-30 08:22 重新生成（晚于真机复跑 08:21），三条相关 sha 经本审计独立
  复算（LF 口径）**精确吻合**：lineage-canvas.test.tsx=0e1fd2…、
  edge-label-layout.test.ts=1ac51f…、f-l1c-forensics.mjs=9e9dbb… ✓。
  主审 D-W1（typecheck/build 补证无 raw 档）仍留主控收口亲验（见遗留项）。

## 清单 2 母本符合度 —— 通过

- **变体 C 参数**：FO 恒 130×37.05（LineageEdges.tsx:110-113，
  EDGE_LABEL_MAX_W/H 单源 edge-label-layout.ts:28-30）；theme.css:569-584
  9.5px/line-height 1.3/斜体/#6b7280/text-shadow 四向 2px 白晕/break-word/
  max-height 37.05px+overflow hidden（非 line-clamp）逐项=案册定稿 ✓。
- **放置器**：碰撞盒 est+gap4/37.05+gap4、节点盒外扩 6、严格 < 判交
  （edge-label-layout.ts:55-60）、全占位回 anchor+头注 best-effort 声明 ✓。
- **wheel 语义**：仅截断拦截、未截断放行 zoom（主控预裁 4）✓。
- **FO pointerEvents none + div auto**：LineageEdges.tsx:114（内联静态属性——
  票面行为层字面）+ theme.css:583（div auto 驻类）✓。
- **fitViewport 第 5 参**：lineage-viewport.ts:50-56 缺省 [] 参与包围盒（:71-76）；
  Canvas 传 slots 盒 hw=estimateW/2、hh=18.5（LineageCanvas.tsx:98-106）✓。
- **INV-41**：票面 §3 归主控收口——**已办**（docs/invariants.md +1 行，含回炉
  实测依据+真机取证锚，与实现者 §四建议文案同源更完整）✓。

## 清单 3 宪法红线终审 —— 通过

- **分层单向**：全部改动驻 renderer feature 域+shared theme.css 类，零 ipc/services
  触碰；零新依赖（git status 无 package.json/lockfile）✓。
- **受锁面**：lineage-canvas.test.tsx 相对 HEAD 仅增（+85/-0，diff --stat 无删号；
  旧断言 :179-194 SR2-LG-07 原样在场）；两新测试文件 always-active（顶层 describe，
  无 guardedDescribe）；first-red 924 既有零破+manifest 已重锁 ✓。
- **方案切换=删旧方案**：LineageEdges 41 行删除全部为旧 SVG text label 拆除
  （总 -41 中 audit0-findings 27±为前序工单），无两套方案并存 ✓。
- **行数**：LineageCanvas 232≤250 组件红线 / LineageEdges 126 / edge-label-layout
  99 / lineage-viewport 186 全 ≤500；theme.css 620=既有 CSS 文件延续（票面自估
  591+~14 即超 500，不属本票新增违类，门一已核 lint 域不含 CSS）；
  lineage-canvas.test.tsx 物理 542 行=eslint tests/** max-lines off 豁免 ✓。
- **安全禁令**：无 eval/new Function/无新增出网 host/无 SQL 面/无 renderer 引 Node
  API（纯 SVG+CSS 改动）✓。
- **UTF-8/TODO**：全程工具读取中文可读；六文件面 grep TODO|FIXME|placeholder 零命中 ✓。
- **TDD 证据链四档**：首红（111 文件 110 绿+1 套件级红，924 既有精确零破，
  :3019）→ 二红（⑦⑧⑨⑩ 4 failed/19 passed，:992-993）→ 变异八档全落盘各恰
  1 failed 且红点正确（M1=⑧ 181.475 恒真红/M2=⑨ transform 实变/M3=⑩ 正则不匹配/
  M4=① 289≠130/M5=fit 1.93103≠1.75649/M1R=-166≠0/M2R=transform 变/R2R=scrollTop
  0≠240——本审计逐条抽验原文）→ 还原（文件备份法+diff 空声明，rework1-final-test
  937 全绿反证还原成功）✓。

## 清单 4 机器面核对 —— 通过

- **937=924+13 数理一致**：924 既有+⑦⑧⑨⑩ 4+①~⑥ 6+fit 用例 1（=11 首交付）+
  ②b/③b 2（回炉）=13；rework1-final-test.raw:2989-2994「111 文件/937 passed(937)/
  EXIT=0」实证 ✓。
- **verify 现场预期红仅 locks**：首交付 3 项（forensics.mjs/新测试未登记+受锁
  变更）、rework1 5 项（+hit-probe/scroll-probe 探针未登记——均主控取证产物非
  实现者产物）；终态探针已删+manifest 已重锁，locks:check 面已闭合，归主控收口
  全量 verify 亲验 ✓。
- **e2e**：归主控收口（票面预裁 6；门二未跑——铁律禁）；e2e 锚面门一已核
  （仅 path[data-edge-id]，path 零改）✓。
- **真机取证对账（非平凡通过）**：f-l1c-verify.json——注入 f-l1c-2/f-l1c-3 两条
  碰撞源边后 5 标签/4 节点 labelOverlaps=[]/nodeOverlaps=[]（含穿越边场景=放置器
  真实工作而非空转）；悬停滚动 sh53−ch37=16=scrollTopAfterWheel 恰隐藏量+
  transformUnchanged=true；verdict=PASS 与实现语义逐项对账成立 ✓。
- **门二独立复算**（夹具数学抽验）：⑧ 场景 e1 落锚 (90,200)、e2 首自由
  i=0 档 dx=−166（x 距 166≥134 分离 e1）→ FO x 差=−166 与断言/M1R 红证三方
  吻合；fit 数值 k=440/250.5 与 M5 received 1.9310（忽略盒）反向吻合 ✓。

## 清单 5 成本账本行（主控账本补记）

| 角色 | 轮次 | token | 调用 | 时长 |
| --- | --- | --- | --- | --- |
| 实现者 | 初交付 | 6.87M | 84 | 41.1min |
| 实现者 | 回炉 1 | 3.49M | 25 | 6.3min |
| 门一 | 主审 | 6.04M | 20 | 7.6min |
| 门一 | 复核 | 0.86M | 10 | 4.0min |
| 门二 | 终审（自报） | ~1.6M（无独立计量工具，按读档量估） | 9 | ~14min |

## 门二新发现（均 [N] 级，无裁决影响）

1. **门一复核 R1 段叙述性偏差**：②b/③b「首自由位 +7lh（dx 无关）」与实现偏移序
   不符——实际 i=0 档（dy=0）dx=±166（x 距 166≥分离阈 163）**先**分离（实现者
   §八自裁 3「dy=0 档 dx 第二档先分离」才与实现一致）。因 ②b/③b 断言刻意不锁
   档位（位置无关设计），两种位形下断言均绿（937 全绿实证）——「断言设计正确」
   的结论成立，仅叙述档位有算术序偏差，记档不回炉。
2. **实现者 §二行数表为首交付口径**（93/113/529），回炉终态 99/126/542——增量
   全部来自 R1/R2 回炉自裁面+测试改锁，diff --stat 可对账，非瞒报。
3. **rework1-verify 的 locks 红项**比实现者「同首交付预期红」表述多 2 项探针
   未登记（hit-probe/scroll-probe）——措辞略简，但探针系主控取证产物、归置责任
   在主控且已清置，非实现者诚实性问题。
4. locks/manifest.json 工作副本带 CRLF 提示——.gitattributes 强制 LF，git 提交时
   自动规范化；已验证三条 sha 以 LF 口径吻合，无实质影响，提交时留意即可。

## 遗留项（归主控收口，非门二权限）

1. e2e 29 全量跑（票面预裁 6；build 后 `npm run test:e2e`）。
2. 全量 verify 亲验真退出码（locks 已重锁+探针已删，预期全绿——同时覆盖门一
   D-W1 的 typecheck/build 段补证缺口）。
3. [locked-change] 提交：显式列文件（受锁面 lineage-canvas.test.tsx+两新文件+
   manifest+invariants.md）；staging 防误扫——`docs/audits/audit0-findings.md`
   （前序工单改动）与未跟踪 `docs/audits/2026-08-30_f-a1-retest-guide.md`、
   f-l1-out 证据归置需主控裁决后一并处理。
4. LOOP 票台账翻状态（不在 tickets/registry，按台账规则）。

## 终审裁决

**PASS**。四清单+一全部通过：处置核对（R1/R2/⑧ 改锁/§九勘误逐条落实且门一
复核 W 已实际解除）、母本符合度（变体 C 参数/放置器/wheel 语义/INV-41 逐项吻合）、
宪法红线（分层/受锁面仅增零改/行数/TDD 四档证据链/安全禁令零触碰）、机器面
（937=924+13 数理一致+真机取证非平凡 PASS+manifest sha 独立复算吻合）。四项
[N] 级新发现均无裁决影响；四项遗留归主控收口清单。
