# SR2-LG-02 门二终审报告

日期：2026-08-27 ｜ 审者：门二终审子代理（独立于实现者与门一）｜ 只读铁律遵守：仓库唯一写入=本文件；独立验算沿门一先例（esbuild→node 系统临时目录，验后已清理，仓库零改动）；未运行任何 npm/test/git 改动性命令。

**技能清点（开工纪律）**：用 code-review-excellence（终审对抗审查本体，已加载）；用 verification-before-completion（核心原则「先亲验后裁决」——全部结论基于工作树现态亲读+日志亲核+独立数值验算，不采信任何单方自报）；不用 systematic-debugging（无调试迭代面）、不用 TDD（不写实现，只验红证链）、不用 git 工作流类（只读铁律禁改动性 git 命令）、其余领域技能与本审面无关。配置自查：门二与门一/回炉复核同源模型同配置。

输入：票面 lineage-layout.ts 头注（现态 262 行）、ADR-0014、lg02-diff.patch（8 文件，回炉前快照）、lg02-impl.report.md（含回炉记录节）、lg02-gate1.md 全文（初审+回炉复核）、五日志、locks/manifest.json、工作树现态全部交付文件与受锁测试。

## 终审结论：**PASS（0 阻塞 / 0 处置级新发现 / 2 备案级备注）**

回炉 1 轮后收口无阻。门一 2W/2N 全部 ADDRESSED 且经本审独立复核；宪法红线零违例；母本（ADR-0014 E3+E4）逐项符合；机器面（82/573/locks 127/e2e 16+1）数理自洽；主控预裁七项全部维持。

---

## ① 处置核对（门一 2W/2N+回炉记录 vs 终态实物）

### W1（同年异深 x 重叠）——ADDRESSED，本审独立验算通过

- **修复面 diff 级核对（lineage-layout.ts 现态 262 行）**：Frame 从深度索引数组改为「年份层序 Map<layer,{lo,hi}> spans」（:103-106）；层序表 `layerIdx=year→层位`（:119-120，与层带构造 :109-118 同源同序）；兄弟约束=所有**共享年份层**上 max（前树该层右缘+SIBLING_GAP−本树该层左缘）（:198-214）——不共享层子树可交错保紧凑；父占位并入自身年份层、与子孙同层（非单调数据）时右推防护（:225-243）；森林游标按帧全层总宽+TREE_GAP 推进（:254-259，跨树全层分离）。票面头注实现注已同步改写并标注「回炉 1 轮 W1」（:77-81）。
- **回归用例在锁**：lineage-layout.test.ts:102-118「W1 回归（门一复现参数——年份严格单调仍触发）」断言 |B.x−A2.x|≥NODE_W+SIBLING_GAP（等宽卡中心距≥卡宽+间隙 ⟺ x 区间分离）；:120-127「W1 延伸（父子同年非单调）」同型断言。均 always-active。
- **本审独立数值验算**（esbuild→node 临时目录，非采信门一/实现者任一方）：
  - 门一复现参数 P(2020)→A(2021)→{A1(2022),A2(2023)}、P→B(2023)：|B.x−A2.x|=**220 恰=NODE_W+SIBLING_GAP**（约束边界满足；初轮该参数重叠 70px）PASS；
  - 压力扫描（8 节点：森林双树+孤立点+叔侄同年+**父子同年**）：全树「同年层两两自动节点中心距≥220」逐一 PASS（最小值恰 220）；父子同年 R1a/R1a1 分离=220 PASS；
  - 纯函数性质（两次调用深相等）PASS；覆盖根断链子树提升（O.x=123 原样、子 C.x=90=NODE_W/2 自成根）PASS。
- 语义裁定维持：**同年层内全树全部分离+异年层 x 允许交错**=年份分层语义的正确实现——异年卡在不同水平带（LAYER_GAP=140>NODE_H=64，带间净隙 76）x 交错无视觉相交；主控对回炉指令措辞的修正（同年层语义）在案，本审维持。边界备案（非缺陷）：y 覆盖节点帧占位记其 year 层但渲染 y=覆盖值，落他层时可视觉重叠——属票面「覆盖节点 v1 不做碰撞避让」已声明豁免面。

### W2（空态早退→转场 pan/zoom 永久失灵）——ADDRESSED

- **早退删除核对（LineageCanvas.tsx 现态 179 行）**：全文无 `nodes.length===0` 早退分支；svg 无条件常驻（:96-102），空态=svg 内 text 层叠加（:104-109，注释「空态不短路挂载结构（回炉 W2）」），data-viewport g 条件渲染（:110-176）——条件在 svg **子节点**层，React 跨空→非空转场复用同一 svg 元素，两个 effect([]) 首挂载即绑定且常活。
- **回归用例在锁**：lineage-canvas.test.tsx:125-153——空挂载→空态文案→同根 rerender 填充→真实文本→pan 断 translate(40,10)→wheel 断 scale 非 1，恰锁「转场后 listener 可用」（行为级断言；rework-red.log 红证 [3/3] received 'translate(0, 0) scale(1)' 即旧实现失绑症状）。INV-14 成对清理用例未动且 verify 全绿（listener 常驻不破坏卸载配对）。

### N1/N2（顺修）——ADDRESSED

- N1：回炉节更正初轮 15/13（总 28）+终态 17/14（总 31）；本审 grep 实测 it 用例 **17/14** 吻合 ✓。
- N2：五日志退出码亲核——red.log 尾「EXIT:1（…15 failed/542 passed）」补记行、mutation.log 尾「M1 EXIT:1 / M2 EXIT:1 / M3 EXIT:1」补记行、rework-red.log 尾 `EXIT=1` 原生行、green.log 尾 `EXIT:0`、verify.log 尾「=== 回炉 1 轮 verify（W1/W2 修复后）EXIT:0 ===」原生行，全在 ✓。

## ② 母本符合度（票面五层 vs ADR-0014 E3/E4）

- **y=年份分层**（ADR「纵向=年份分层，y 天然分层免算法」）：层带构造 year 升序+null 末位（:109-118）；y 一律取层带值或 y 覆盖值（:160）✓。
- **x=RT 零依赖**（ADR「Reingold-Tilford tidy tree，线性两趟，零依赖手写，D3 禁引」）：place() 后序轮廓合并+assign() 前序绝对化两趟字面；全仓 grep d3 仅票面注释一处；package.json 不在工作树改动面（git status M 仅 manifest/App/lineage-layout）——零新依赖 ✓。
- **JSON Canvas 覆盖优先**（ADR「节点 x/y 直存，NULL=自动布局」）：x/y 非 null 用覆盖值；x 覆盖断链+子树提升为森林成员（断点不丢节点，本审 D 项验算）；覆盖节点仍计入层带（归属按 year）✓。
- **E4 第四视图**：App.tsx ViewId 扩 'lineage'（:15）+NAV 第四项「脉络」（:17-22，主控字面位次）+渲染分支（:104）+头注「四入口」✓。
- **INV-14/INV-27/INV-02**：wheel/pointerdown 挂 svg+pointermove/up 挂 window 成对清理（配对断言）；INV-27 防御第二道四型剔除非崩溃不丢节点+一次汇总 warn；error=列表型瞬态+重试 ✓。
- 主控预裁七项逐一亲验维持：①布局形状 LayoutResult{positions 中心点语义, layers}（票面「形状实现定」面内）②RT 两趟 ③覆盖优先 ④zoom 钳制 [0.25,4]（M3 变异红证）⑤App 挂载三处 ⑥store loading/ready/error 三态+stale-guard+03/04 禁双取双向锚定（store 头注与 LineagePage 头注互指，与 03/04 STUB 票面无互斥）⑦空态文案「暂无脉络图——导入草稿或添加节点」+零按钮断言（canvas 测试 :119-123）✓。
- 接缝归责：store 头注「04 的 ai_notes/list、notes/get 属不同数据域不在本约」与 04 票面口径一致；「节点上按下不 pan（编辑面归 03）」声明在 Canvas 头注——两处接缝声明无互斥 ✓。

## ③ 宪法红线终审（全部通过）

- **行数**（wc 实测）：lineage-layout.ts 262 ≤500；LineageCanvas.tsx 179 ≤250；LineagePage.tsx 59 ≤250；lineage.store.ts 57 ≤250；App.tsx 110 ✓。
- **分层单向/安全禁令**：lineage 文件零 electron/fs/path/node: 导入（grep 空）；store 只经 `../../api/client`（window.api 面）；布局纯函数仅 type import 零 DOM/window 引用（console.warn 为票面文化层字面声明）；无 eval/无字符串 SQL/无绝对路径面 ✓。
- **受锁 127 一致**：manifest 实数 **127** 条（含新增 lineage-layout.test.ts+lineage-canvas.test.tsx 两路径，:305/:309）；verify 双轮 locks:check 均「127 个受锁文件与 manifest 一致」；回炉动了受锁测试经 unlock→改→apply（manifest 为工作树 M 面，sha 同步由 locks:check 机检背书，[locked-change] 尾注归收口提交）✓。
- **UTF-8/占位**：quality 双轮「无占位标记/无乱码/无跨域引用」；本审 grep TODO|FIXME|placeholder 于票面全部文件=空；中文全文亲读可读 ✓。
- **死代码**：LINEAGE_LAYOUT_STUB 无（现导出即真实现）；新文件全部被引用（Page←App:9、Canvas←Page:13、store←Page:12、常量←Canvas+测试）✓。
- **TDD 四档+回炉红证链**（时序与数理自洽）：
  1. 初轮红：red.log 15 failed/542 passed（557 总），全因「layoutLineage is not a function」构造级红+canvas 模块加载失败（0 test），EXIT:1——实现缺失致红，非断言缺陷 ✓；
  2. 初轮绿：green.log 82 文件/570 用例 EXIT:0（542+28）；
  3. 变异红证 M1/M2/M3：2/568、1/569、1/569，三轮 RESTORE-DIFF-EMPTY+EXIT:1（cp 备份法，非 git checkout）；
  4. 初轮 verify：quality+tickets+locks 127+lint+typecheck+test 82/570+build，EXIT:0；
  5. **回炉红**：rework-red.log 3 failed/570 passed（573 总）EXIT:1——**恰为三新回归用例红**（W1 回归 expected 110≥220 / W1 延伸 expected 0≥220 / W2 回归 expected 'translate(0, 0) scale(1)'），基线 570 零回归——「修前红恰中新用例」成立 ✓；
  6. 回炉绿+verify：green 82/573 EXIT:0；verify 第二轮（同日志追加段）全关卡+build，「=== 回炉 1 轮 verify（W1/W2 修复后）EXIT:0 ===」✓。
  - **三条流程改进在案**：①cp 备份法替代 git checkout（未提交实现的变异还原安全——UBS 同族实证引用）；②npm 真退出码机器行（echo EXIT:$?——本单 N2 落地）；③受锁测试改动后必须全量 verify（vitest 经 esbuild 不查类型，tsc 关卡拦索引/类型缺陷——报告 #8 中途 lint/typecheck 两拦实录）。
- **测试纪律**：两测试文件均为新增受锁（本单自带，无「改既有测试让代码通过」面）；断言抽查均为行为级（坐标区间算术/transform 精确值/textContent 真实文本/调用计数/配对断言），未发现恒真断言；always-active 不经 guardedDescribe（两文件 describe 均裸用，头注声明 ADR-0017 裁决 3）✓。

## ④ 机器面核对

- **82/573 数理**：文件 80 基线+2 新=82 ✓；用例 542 基线+28 初轮（15 layout+13 canvas）+3 回炉（2 W1+1 W2）=573 ✓（red 15+542=557 → green 570 → rework-red 3+570=573 → verify 573，四日志计数链闭合）。
- **locks 127 不变**：回炉只改既有受锁文件内容不加路径数（初轮 125→127，回炉后仍 127）✓。
- **registry 翻 done 预演（grep）**：SR2-LG-02 全号全仓仅四处——票面文件 lineage-layout.ts:3（票面原文，合法）、tickets/registry.ts:197（待翻条目本身）、tests/e2e/lineage.spec.ts:38（LG-05 的 DEPS 依赖门数组——设计内引用非残留，该 spec 以 test.skip(pending) 门控在 01~05 全 done 前跳过）、scripts/audits/*（审计文书）。**票面文件外无违规残留，翻 done 无阻塞** ✓。新文件头注一律 LG-02 短式（check-tickets 规则 2，tickets:check 双轮过）✓。
- **e2e 面申明（16+1 skipped 不变）**：tests/e2e 七 spec 顶层 test 计数=1+4+8+1+1+2=17，lineage.spec 唯一占位 test 经 test.skip 门控（依赖未全 done）→ 16 active+1 skipped；本单零触碰 e2e（git status M 面与 diff 8 文件均无 tests/e2e）——申明成立 ✓（e2e 全链归 LG-05，占位替换+主控亲验防作弊闭合在 LG-05 票面已锁）。
- **范围自查（本审独立）**：git status=M{manifest.json, App.tsx, lineage-layout.ts}+未跟踪{Canvas/Page/store/两测试+audit 文书}；diff.patch 8 文件与之吻合；LineageBoard.tsx/LineageSidePanel.tsx（LG-03/04 STUB）未被触碰 ✓。

## ⑤ 成本账本行（门二终审子代理 usage 自估）

- 输入 ~1.5×10^5 tok（含 red/rework-red 两日志大文件部分读入+全部交付文件/测试/日志/manifest）；输出 ~1.7×10^4 tok（含本报告与验算脚本）；时长 ~35 min；零仓库写入除本文件，验算临时文件已清理。

## 备案（不阻塞，供主控收口参考）

1. **报告数字漂移族**：摘要节行数「242/183」为初轮快照（终态 262/179，回炉节已声明改动但未重申行数）——门一回炉复核已备案，限额内无风险，收口交接书顺手更正即可。
2. **dist_new/ 未跟踪残留**：2026-08-23 前历史残留（报告 #9+LG-01 同声明，本单未触碰）——非本单范围，建议列入仓库卫生清单择期清理。

**门二终审：PASS——建议主控按收口流程走（亲验 verify 真退出码+locks:apply 状态+diff 范围→翻 registry→[locked-change] 提交）。**
