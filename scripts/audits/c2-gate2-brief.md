# C-2 弱锚时序补强票——门二终审简报（deepseek 位：亲跑矩阵核验+异质终审）

你是门二终审员。门一（Kimi 链→双源失败→deepseek 兜底承接，switches=2——
异质性损失已如实入账）已审：**有条件放行**（0B/6W/3N；两附条件=INV-42 册面
措辞修正+W1 坐标脆弱点记录，均归主控收口处理非实现者返工）。

你的职责：
1. **亲跑矩阵核验**：下方为**主控刚执行**的三项复跑原始输出（非实现者转述）
   ——核验与实现报告声明的一致性。
2. **终审**：门一 6W 处置是否妥当；有无门一漏判的新问题（重点：①探针 PASS
   面含 styleNone+e_penetrated 的收紧是否充分；②E2 变异矩阵的结论表述；
   ③轮询化 15 处替换的语义等价性——pollUntil 超时静默（W3）风险定级）。

输出：B/W/N+总裁决「PASS/条件 PASS/FAIL」。用中文。

━━━ 主控亲跑输出（2026-09-02 03:18，本轮新执行）━━━
【①f-a3-n6-verify.mjs】
$ node scripts/audits/f-a3-n6-verify.mjs
[f-a3-n6 03:18:20] 场景 AI_n6：真实库副本无 ai-note-rect——aiRectsPresent:false（不算失败）
[f-a3-n6 03:18:20] 场景 C 对照常规点击 {"ariaPressedOk":true,"rectPointerEvents":{"total":9,"computed":["auto"]},"menuShown":true}
F-A3-N6 VERIFY: B-n6(零副作用+穿透)=PASS AI=absent C(对照菜单出现)=PASS overall=PASS
【③f-l4-verify.mjs】
$ node scripts/audits/f-l4-verify.mjs
[f-l4 03:18:23] PASS X/no-pageerror — 页面错误 0 条
F-L4 VERIFY: PASS（13/13 项断言全过）→ f-l4-out/f-l4-verify.json
【②reader-text.spec 全 spec 单文件跑】
$ npx playwright test tests/e2e/reader-text.spec.ts
  ok 12 tests\e2e\reader-text.spec.ts:826:1 › F-ARCH4-M1 跨根选区防线真浏览器定性：跨页真鼠标=toast 拒绝；同页跨 textLayer 边界=静默不建锚；页内选区=工具条（三向对照） (7.1s)
  12 passed (33.0s)

━━━ 门一审全文 ━━━

[routing]: run=20260902023321-npcm source=deepseek model=deepseek-v4-flash switches=2 usage=in=19870,out=21909 latency=173057ms (by ds-call.mjs 链)

# 票 C-2 门一对抗审查简报（Kimi 链必保位：受锁面改动）

## 总裁决：**有条件放行**

**依据摘要**：三个子项的票面验收判据均达成（①PASS 三场景+变异红证+还原 diff 空；②三向对照+变异矩阵红证+全量 30 passed；③grep=0+13/13 PASS）；未发现 B 级（阻断性）偏差。要点 A 与要点 B 的裁决见下。存在 6 项 W 级建议，需主控收口时处理；其中 INV-42 册面措辞修正（W4）建议作为有条件放行的附带条件。

---

## 特别要点 A 裁决：①的变异红证是否有效

### 结论：**构成有效变异红证（断言级归属成立），票面预判证伪的处置妥当**

**证据链**：

1. **变异信号位真实且可观测**。变异将选择模式分支 `pointerEvents: 'none'` 改为 `'auto'` 后，探针捕获两个真实行为变化：
   - `styleNone=false`：computed pointer-events 采样为 `["auto"]`（声明面破坏）；
   - `e_penetrated=false`：hitTest 返回 `DIV·testid=annotation-rect`（事件不再穿透，行为面破坏）。
   两者均为 INV-42 语义「点击穿透零副作用」的组成部分，非无关信号。

2. **红证的证明力成立**。探针在变异下 exit=2（红），还原后 PASS（绿），满足「变异红证=探针非恒真」的验证目的。变异确实改变了行为（点击从穿透变拦截），探针确实感知了该变化。

3. **票面预期「菜单将出现」被证伪是合理的 R5 处置**。`AnnotationLayer` 的 `if (selectionMode) return` 早退守卫对真鼠标同样生效，故 a/b（菜单/编辑器不出现）在变异下保持绿；实现者未放宽断言，反而把 e（穿透证明）从票面「诊断项」升级为 PASS 判定项，并新增样式前提锚（styleNone）。这是对 PASS 面的**收紧**而非放宽，符合 R5「推断不成立→停手如实报告」纪律。

4. **盲区边界清晰**。该探针锚定的是 INV-42 的「pointer-events:none 声明面+穿透行为面」；若未来有人仅删除 onClick 守卫而保持 pointer-events:none，探针不会红——但 INV-42 只承诺「点击穿透零副作用」，不承诺守卫存在，故锚定范围正确，非缺陷。

### W4（随案修正建议）：INV-42 册面描述不完整

- **证据**：实现报告 R5 段「AnnotationLayer onClick 内 `if (selectionMode) return` 早退守卫（注释『守卫兜程序化派发』）对真鼠标同样生效」。
- **问题**：invariants.md 中「onClick 守卫兜程序派发」的表述暗示守卫仅拦截程序化派发，但实测它拦截**一切点击**（真鼠标+程序化）。且 INV-42 实际由两道防线构成：pointer-events:none（声明面）+ onClick 守卫（兜底面），册面未体现该双层结构。
- **建议**：主控收口时修正为「两点防线：①一切渲染 rect pointer-events:none，点击穿透；②onClick 内 `if(selectionMode) return` 拦截一切到达 rect 的点击（含真鼠标与程序化派发）」。

---

## 特别要点 B 裁决：E1 场景构造与三向逻辑闭合性

### 结论：**E1 确实到达 root.contains 防线；三向逻辑闭合**

**证据链**：

1. **路径排除**：
   - E1 的 `setBaseAndExtent(canvas, 0, textNode, 3)` 中，canvas 与 textNode 位于同一 `[data-page-root]`，`closestPageRoot` 同页根，SelectionLayer 边界检查放行（实现报告确认；代码 `tests/e2e/reader-text.spec.ts` 的 E1 构造）。
   - `e1collapsed=false` 断言证明真浏览器不塌缩混合选区（isCollapsed 不先兜），selectionchange 有效派发。
   - 变异 B 单点摘除 `root.contains` → E1 红（工具条出现）；若 root.contains 未被触达（被更早的 probeTextLength 等拒掉），摘除后不会出工具条。实证排除了其他路径副作用。

2. **「决定性防线」归属成立**：变异 B 摘除后 leadLen=0 直通（canvas 在文档序先于 textLayer，跨 textLayer 左侧无文本量），说明 probeTextLength 不拦截此形态——root.contains 是该形态下的唯一拒点。该结论由变异实证支撑，非推断。

3. **三向逻辑闭合**：
   - E3（跨页真鼠标）→ SelectionLayer 检查拒 + toast（变异 A 红证：摘除检查→无 toast）；
   - E1（同页跨 textLayer）→ root.contains 拒 + 静默（变异 B 红证：摘除→工具条出现）；
   - E0（同页同 textLayer）→ 放行 + 工具条（证明夹具非恒拒）。
   三个场景覆盖两条独立防线+一个对照，逻辑闭合无空缺。

4. **N1（建议）**：将「变异 B 后 leadLen=0 直通」的分析写入 anchor-serialize.ts 头注或测试注释，便于未来维护者理解该防线的必要性。

---

## W 级问题（非阻断，建议收口时处理）

### W1：①C 对照使用 B_n6 采样坐标未重新定位

- **证据**：`f-a3-n6-verify.mjs` 中 `C_contrast` 场景 `await realClick(win, qA.x, qA.y)`——qA 是 B_n6 场景下采样的 rect 中心，切回常规模式后未重新采样 rect 位置。
- **风险**：模式切换（aria-pressed 变化）可能触发 AnnotationLayer 重锚/rAF 重定位，rect 位置微移后 qA 可能落于 rect 边缘外，导致对照菜单不出现→误红。
- **建议**：C 对照前重新执行 qA 采样，或对 C 对照的菜单出现断言加宽坐标容差。

### W2：②E1 的「防抖 settled 观察窗」是轮询形式的延时

- **证据**：`reader-text.spec.ts` 中 `expect.poll(() => performance.now(), { timeout: 5_000 }).toBeGreaterThanOrEqual(t0 + 600)`。
- **说明**：形式上是条件轮询，语义上等价于「至少等 600ms」。票面处方原文「条件轮询 ≥600ms 等 SELECTION_DEBOUNCE_MS=200 防抖 settled」即此意图，实现忠实；但建议在代码注释中补充「防抖是时间语义，无条件可轮询，故以时间下限表达观察窗」，避免未来维护者误以为这是绕过禁固定等待的取巧。

### W3：③pollUntil 超时静默可能引发连锁误判

- **证据**：`f-l4-verify.mjs` 中 `pollUntil` 超时返回 false 不抛错；调用方（如 A-resize 处 `pollUntil((prev) => transform !== prev, t2.transform, 8_000)`）在超时后继续执行并采样 t3。
- **风险**：若等待目标是后续代码的「前提」（非断言），超时静默可能导致后续在错误状态下运行，产生非预期红（虽由 check 捕获，但失败归因可能混淆）。
- **建议**：区分「前提等待」（超时应抛错终止）与「断言等待」（超时应红但继续），在 pollUntil 的调用点显式标注语义类型。

### W4：INV-42 册面措辞修正（已列于要点 A，有条件放行的附带条件）

### W5：e2e 首次全量的既有 flaky 失败值得关注

- **证据**：实现报告②「:223 y 轴重锚容差断言 toBeLessThanOrEqual(2) 实收 3.4499…」，重跑单用例绿 2.9s。
- **分析**：符合「非确定失败第 1 次＜立案线 2 次」豁免标准，非本票引入；但该数值敏感性（2px 容差 vs 3.45px 实测）可能在其他慢机环境复现，建议主控知悉并在后续观察是否升级立案。

### W6：③的 json 语义 diff 缺少实证数据

- **证据**：实现报告称「13 项断言结果序列全同、nodeCount 4=4、diagnostic.cssZoomTriggersRO true=true」，但未附 diff 输出。
- **建议**：将 json diff 的摘要（或完整 diff）随报告留档，以便复核。

---

## N 级问题（信息/观察）

- **N1**：变异 B 的 `leadLen=0 直通` 分析应写入代码注释（见要点 B）。
- **N2**：三份变异备份留在 `scripts/audits/` 下是票面指定的留档路径，但属仓库污染——建议主控收口时统一移入归档目录或声明忽略。
- **N3**：verify 的 locks 红中 `f-r3-probe.mjs` 为外部工单残留（mtime 早于本票落盘），与实现者无关，但可能误导后续检查者——建议主控在收口时附说明。

---

## 受锁面改动纪律核验

| 检查项 | 结果 |
| --- | --- |
| src/** 零净改动 | ✅ 三份变异备份还原后 diff 全空；locks:check 的 src 违例为零 |
| e2e 改动后全量 | ✅ 首跑 29/1（flaky 既有用例）→重跑 30 passed；新用例隔离 userData |
| 探针先红后绿 | ✅ ①变异后 exit=2，还原后 PASS；②两变异后单跑红，还原后全量绿；③13/13 保持 |
| 还原 diff 空 | ✅ 实现报告声称三处 ALL_THREE_RESTORED_DIFF_EMPTY（无原始 diff 输出，部分信任） |
| 未跑 git/locks 命令 | ✅ 实现报告明示；locks 4 项违例 3 项为本票预期中间态，1 项外部残留 |
| 等待纪律 | ✅ ①③无 waitForTimeout；②E1 观察窗用 poll；60ms/16ms 手势时序用 setTimeout（票面例外） |
| 自裁申报 | ✅ 7 项自裁均超票面但合理，无放宽断言，无隐藏决策 |

---

## 不确定事项声明

1. **还原 diff 空**：实现报告声称「DIFF_EMPTY 确认」「ALL_THREE_RESTORED_DIFF_EMPTY」，但我未看到原始 diff 输出文件。基于 locks:check 无 src 违例和重跑全绿，可信度高，但严格复核需主控抽查备份文件与终态的 `git status`。
2. **③的 json 语义 diff**：实现报告未附具体数据，13 项断言序列全同的声称无法独立复核。
3. **C 对照的位置稳定性**：我无法确认模式切换是否导致 rect 位置漂移（当前实测 PASS，但未来 UI 变化可能引入误红风险——见 W1）。

---

## 最终裁决

**有条件放行**。条件：

1. **主控收口时修正 INV-42 册面措辞**（W4）：反映「pointer-events:none 声明面 + onClick 守卫兜一切点击」的双层防线结构；
2. **处理 W1（C 对照坐标重采样）或至少记录为已知脆弱点**；
3. **本票 W2/W3/W5/W6 建议纳入主控知悉清单**，不要求实现者返工。

若主控认为 W1 的风险不可接受（C 对照误红会导致探针假失败），可降级为要求实现者补一次 C 对照坐标重采样后重跑；但根据当前证据（实测 PASS 且 C 对照菜单出现），该风险不构成回炉理由。
━━━ 实现报告全文 ━━━
# 票 C-2 实现报告（弱锚时序补强搭车票——AUDIT-C 首波）

> 实现者=票面指定实现者子代理（环境限制统一档）；落盘=2026-09-02。
> 性质=补锚票：零行为实现码改动（三份 src 变异均 cp 备份还原、diff 终态空）。
> 开工技能清点：systematic-debugging/TDD/verification-before-completion/
> e2e-testing-patterns/javascript-testing-patterns=用；browser-use/webapp-testing=
> 不用（全程 Playwright _electron 无头脚本，无内置浏览器）；subagent-driven-
> development=不用（本代理即实现者，无再派发面）。

## ① INV-42 N6：选择模式点击 rect 零副作用——真机直测

**产物**：`scripts/audits/f-a3-n6-verify.mjs`（新建，crib f-a3-verify.mjs 运行模式：
真实库副本 freshUserData+Electron launch+真鼠标）+ `scripts/audits/f-a3-out/f-a3-n6-verify.json`
（+尾态截图 f-a3-n6-final-state.png）。

**三场景结果（json 断言摘要，脚本实测）**：

| 场景 | 结果 | 关键数据 |
| --- | --- | --- |
| B-n6 主断言（选择模式真鼠标单击 rect 中心，move→down→60ms→up） | PASS | ariaPressedOk=true；9 块 rect computed pointerEvents 全 `none`（styleNone=true）；hitTest=SPAN·inTextLayer·isRect=false（穿透）；menuAppeared=false；editorAppeared=false；selectionCollapsed=true/selLen=0；唯一 annotationId 计数 1→1 不变；checks a/b/c/d/e 全 true |
| AI 层同测（条件执行） | aiRectsPresent=false（如实记录，不算失败） | 真实库副本无 `[data-testid="ai-note-rect"]` |
| C 对照（切回常规同点位单击） | PASS | ariaPressedOk=false；rect computed pointerEvents=`auto`；annotation-menu 出现（menuShown=true）——非恒真证明成立 |

探针退出码：PASS=exit 0；任一断言失败=exit 2（实测见变异行）；异常=exit 1。
等待纪律：全条件轮询（waitForFunction/waitForSelector/locator waitFor）；60ms 按压驻留与
dragSelect 16ms 插值步进=票面处方的手势时序（evaluate setTimeout 实现，非 waitForTimeout API）。

**变异红证（cp 备份法，备份=scripts/audits/f-n6-mut-backup-AnnotationLayer.tsx）**：

| 步骤 | 结果 |
| --- | --- |
| 变异：AnnotationLayer.tsx 选择模式分支 `pointerEvents: 'none' } : rectStyle` → `'auto'`（needle 唯一性 node 校验） | — |
| **重要**：必须先 `npm run build` 重打包（探针跑 out/ 构建产物，改 src 不重建不生效——首跑假绿实证） | — |
| 重跑探针 | **B-n6 必红达成：exit=2**（styleNone=false：computed=`["auto"]`；e_penetrated=false：hitTest=DIV·testid=annotation-rect；menuAppeared **仍 false**） |
| cp 还原→diff 确认空→重建→重跑 | DIFF_EMPTY 确认；重跑 overall=PASS exit=0 |

**R5 如实报告——票面括注「（菜单将出现）」的预期被证伪**：AnnotationLayer onClick 内
`if (selectionMode) return` 早退守卫（注释「守卫兜程序化派发」）对真鼠标同样生效——
即使 pointer-events 变异为 'auto'，click 事件到达 rect 后仍被守卫拦截，菜单不出现。
a/b/c/d 四件零副作用在变异下保持绿；变异红证由 e（穿透证明）+样式锚（computed
pointer-events===none）承担。这正是把 e 与样式锚计入探针 PASS 面的自裁依据（见自裁清单 1）。

## ② F-ARCH4-M1：root.contains 真浏览器可达性——e2e 反向选区用例（受锁面）

**产物**：`tests/e2e/reader-text.spec.ts` 末尾追加 test「F-ARCH4-M1 跨根选区防线真浏览器
定性：跨页真鼠标=toast 拒绝；同页跨 textLayer 边界=静默不建锚；页内选区=工具条
（三向对照）」+ 内联 fixture 组装器 `createCrossPagePdf()`（依赖 F02_DEPS，配方
seedAndLaunch(title, bytes)）。

- fixture：页1 双行（y=100 P1A=E1/E0 素材 / y=72 P1B=E3 起点）+页2 顶行（y=720=E3 终点）——
  两交界行几何距离 ~220px，滚到页盒交界即同视口（pdf-factory 全高页相邻行距 ~1056px
  做不到；pdf-factory 受锁不可改，组装器内联同款、UTF-8 字节口径一致，正文纯 ASCII）。
- E3：按页盒几何（全长真实占位）滚到交界→条件轮询两交界 span 同视口（P2 懒渲染入窗）→
  真鼠标 12 步插值拖选（crib f-a3 dragSelect 手势时序）→ toast「选区跨页，不支持创建标注」
  可见 + 无 selection-toolbar + **isCollapsed=false（真浏览器不塌缩跨界选区——定性锚）**→
  toast 退场条件轮询（info 3500ms 自动消失，防 E1 的无 toast 断言被残留误红）。
- E1：程序化 `setBaseAndExtent(canvas, 0, textNode, 3)`（同页根过 SelectionLayer 检查、
  range 边界跨 textLayer）→ 断言 isCollapsed=false + 防抖 settled 观察窗（expect.poll
  时间下限 ≥600ms——票面处方原文）+ 无 toast 且无工具条（静默不建锚）。
- E0：程序化 `setBaseAndExtent(textA, 0, textB, 4)`（同 textLayer 两文本节点）→
  selection-toolbar 出现（轮询）——证明 E1 静默是防线拒绝而非夹具失灵。
- 每步选区操作后 removeAllRanges 复位；用例头注落定性结论。

**E2 变异矩阵（cp 备份法；单跑本用例 `npx playwright test -g "F-ARCH4-M1"`）**：

| 变异 | 单点摘除目标 | 结果 | 归属结论 |
| --- | --- | --- | --- |
| A | SelectionLayer.tsx `if (anchorRoot !== focusRoot)` → `if (false)` | **E3 必红（达成）**：exit=1，:886 toast toBeVisible 失败（无 toast） | 跨页拒绝=SelectionLayer 边界检查独担；摘除即 INV-02 静默（跨页选区随后被 root.contains 静默吞掉，无声无 UI） |
| B | anchor-serialize.ts `if (!root.contains(start/end))` → `if (false)` | **E1 红（如实记录）**：exit=1，:924 selection-toolbar toHaveCount(0) 失败（工具条出现） | root.contains=同页跨 textLayer 的**决定性防线**，非仅纵深防御层：canvas 在文档序先于 textLayer，probeTextLength 的 leadLen=0 直通、不拦截——摘除 root.contains 即建锚出工具条 |

两变异后均 cp 还原、diff 确认空（MUT_A_RESTORE_DIFF_EMPTY / MUT_B_RESTORE_DIFF_EMPTY /
ALL_THREE_RESTORED_DIFF_EMPTY——与 ① 的备份三份全对账）。注意：变异须 `npm run build`
重打包后才对 e2e 生效（同 ① 的构建产物教训）。

**受锁 e2e 改动后全量**：`npx playwright test` 首跑 **29 passed / 1 failed**（失败=既有用例
「划选高亮后重开仍在原位；批注编辑与删除可用」:163——:223 y 轴重锚容差断言
toBeLessThanOrEqual(2) 实收 3.4499…；与本票 diff 无因果：新用例隔离 userData、src 变异已
还原、bundle 由同源重建。非确定失败第 1 次＜立案线 2 次，复跑单用例绿 2.9s——失败指纹
在档：同值断言/单现/重跑绿）；重跑全量 **30 passed (1.5m)，exit=0**。

## ③ f-l4-verify.mjs 固定等待轮询化（受锁面）

**验收判据实测**：改造前 `grep -c waitForTimeout` = **15**（行号 114/116/195/197/199/230/246/
251/284/286/301/305/320/324/331——与票面清单一致）；改造后 = **0**（连注释内的字面量也已
规避）。**重跑探针 13/13 PASS 保持**（F-L4 VERIFY: PASS，exit=0）；产物 json 语义 diff：
13 项断言结果序列全同（全 PASS）、nodeCount 4=4、diagnostic.cssZoomTriggersRO true=true、
wrapper 采样一致；仅原始几何浮点随窗口恢复取整微漂（真实库探针的环境噪声，非语义变化）。

**15 处替换对照表（原行号→机制+条件+超时+理由）**：

| 原行 | 原固定值 | 新条件轮询 | 超时 | 理由 |
| --- | --- | --- | --- | --- |
| 114 | 800 | pollUntil(document.readyState==='complete') | 5s | 启动 settle 的正向条件（React 渲染已由脉络按钮 waitFor 保证） |
| 116 | 1500 | lineageReady()：节点>0+transform 非空+**连续两次采样同值** | 15s | 挂载+取数+fit 完成的稳定判据（见下「翻车与修正」） |
| 195 | 600 | locator waitFor「中 110%」可见 | 8s | 设置页渲染完成=档位钮可见 |
| 197 | 900 | pollUntil(--ui-scale==='1.1') | 8s | settings 真实通道终点观测点（save→settings.json→store→CSS 变量落地） |
| 199 | 1200 | lineageReady() | 15s | 重挂载取数+fit effect+RO observe 初始通知 |
| 230 | 900 | pollUntil(transform 串!==t2 值) | 8s | RO refit 生效正向条件（摘 RO 即超时，红由 A-resize 断言承担不崩脚本） |
| 246 | 400 | pollUntil(transform 串!==t3 值) | 8s | wheel 视口更新落地 |
| 251 | 900 | pollUntil(svg clientWidth!==wheel 后值)+twoFrames() | 8s | 负向等待条件化：布局变化落地（正向）+双 rAF 给 RO（帧前派发）与 React 重渲染执行机会，此后「无变化」采样才有效 |
| 284 | 500 | pollUntil([data-viewport]===null) | 8s | 脉络卸载（页面互斥切换完成）——wrapper 就位窗口 |
| 286 | 1200 | pollUntil(__roRec.instances>0)+lineageReady() | 8s/15s | wrapper 实例就位（mount 即注册）+fit 稳定 |
| 301 | 900 | pollUntil(svg clientWidth!==diagBefore)+twoFrames()（窗口上限 900ms 保持） | 900ms | 诊断观察窗：变化落地即提前采样；不变则窗口耗尽后采样（信息项 cssZoomTriggersRO=false 语义保持） |
| 305 | 600 | pollUntil(--ui-scale===cssOriginal) | 8s | 恢复属性回值（票面点名处） |
| 320 | 900 | pollUntil(__roRec.callbackCount>c0) | 8s | RO 派发计数增加=resize 生效正向条件 |
| 324 | 700 | locator waitFor「中 110%」可见 | 8s | 设置页渲染=脉络 unmount（disconnect 采样前提） |
| 331 | 900 | pollUntil(documentElement.clientHeight!==vhPre)+twoFrames() | 8s | 负向等待条件化；此处脉络已卸载 svg 不在场，改用渲染视口高作布局观测点（首版误用 svg clientHeight——必然超时的实现 bug，自查修正） |

辅助机制：`pollUntil`=waitForFunction 包装（120ms 采样，超时返回 false 不抛错——红交给
后续 check 断言，保持探针 FAIL 语义）；`twoFrames`=双 requestAnimationFrame（帧事件驱动，
非固定 sleep）；dragSelect/手势类无（本票 ③ 无 dragSelect）。

**翻车与修正（如实记录）**：首版 lineageReady 仅判「transform 非空+节点>0」——lineage-viewport
的 useState 初值即 identity `translate(0, 0) scale(1)`，异步取数→nodes 提交→fit effect 二次
提交之间存在中间帧窗口，采样落在窗内即放行：首跑 **11/13（A/transform-updated+
A/transform-equals-fitviewport 两红，t1/t2 均采到 identity）**。加「连续两次采样同值」稳定
判据（每调用重置 window.__fitProbe 防跨挂载串扰）后 **13/13 全过**——该竞态本身即
「固定等待侥幸绿」的实证，反向支撑轮询化必须配稳定判据。

**INV-44 备案③销项建议**（实现者不改 invariants.md，主控收口定夺措辞）：f-l4-verify.mjs
15 处固定等待已全量条件轮询化（grep=0+13/13 保持）；建议备案③措辞更新为「已销项
（2026-09-02 票 C-2③）」，并可补记方法论注记：「就绪轮询须区分*条件成立*与*状态稳定*
——初始值与目标值可区分度不足时（如 transform 初值 identity），须用连续采样一致判据，
否则轮询反引入固定等待不曾有的中间帧竞态（首跑两红实证）」。

## 自裁决定清单（超票面决定，报主控知悉）

1. **①探针把 e（穿透证明）与样式锚（选择模式全 rect computed pointer-events==='none'）
   计入 PASS 面**：票面标 e 为「诊断项」，但 AnnotationLayer onClick 的 selectionMode 早退
   守卫使变异下菜单不可能出现（票面括注「菜单将出现」预期证伪），e+样式锚是变异红证的
   唯一可用信号位。无任何断言放宽，只有加强。
2. **①③变异前须 npm run build 重打包**：探针/e2e 跑 out/ 构建产物，票面未写此步——首跑
   假绿实证后补入流程（还原后同样重建，三份 src diff 终态空）。
3. **②fixture 内联 createCrossPagePdf**：pdf-factory 受锁不可改，全高页交界行距 >视口高，
   收窄交界几何是「两交界行同视口」的唯一无缩放实现；组装器 crib 同款字节口径。
4. **②E1 settled 观察窗=expect.poll 时间下限 ≥600ms**：票面处方原文的实现形式
   （「条件轮询 ≥600ms 等 SELECTION_DEBOUNCE_MS=200 settled，禁固定 waitForTimeout」）。
5. **③负向断言条件化等价物=正向轮询布局落地+twoFrames 双 rAF**：纯负向事件无法条件
   轮询，帧事件驱动的「RO 已获派发机会」是可条件化的最强前提。
6. **③lineageReady 稳定判据**：首跑竞态实锤后自裁加入（见③翻车段）。
7. **①②拖选/按压的 16ms/60ms 步进**：票面处方/例外条款的手势时序，经 evaluate
   setTimeout 实现而非 waitForTimeout API。

## verify（全量真退出码）

`npm run verify` **exit=1**，唯一红=locks:check（quality+tickets 已过——&& 链推进到 locks
即证）；其余链组件单独实测全绿：**lint=0 / typecheck=0 / test=0（vitest 126 files·1081
tests 全过）/ build=0**；e2e 全量 30/30（见②）。locks 关卡 4 项违例归因：
- `受锁文件被修改：scripts/audits/f-l4-verify.mjs`＝③本票改动（票面架构层明示重锁+manifest
  由主控收口办理，实现者禁跑 locks:*/git——预期中间态）；
- `受锁文件被修改：tests/e2e/reader-text.spec.ts`＝②本票改动（同上）；
- `新增受锁文件未登记：scripts/audits/f-a3-n6-verify.mjs`＝①本票新探针（同上，待主控
  locks:apply 登记）；
- `新增受锁文件未登记：scripts/audits/f-r3-probe.mjs`＝**非本票产物**（mtime 09:38 早于
  本票任何落盘，R3 族并行工单残留——报主控归因处置）。

verify 尾行（c2-verify-full.log，完整 4 行违例——首读 tail -3 截断致漏一行，已全量复读）：
`locks 检查未通过：…（4 项如上）`。

## 成本与产物清单

- token 估计（GLM 计费口径粗估）：输入 ~150k / 输出 ~30k；时长 ~70min（含两轮全量 e2e
  1.5m×2、verify 链 8m、探针×5 跑、构建×6）。
- 新建：scripts/audits/f-a3-n6-verify.mjs、f-a3-out/f-a3-n6-verify.json、f-a3-out/
  f-a3-n6-final-state.png、三份变异备份（f-n6-mut-backup-AnnotationLayer.tsx /
  f-arch4-mut-backup-SelectionLayer.tsx / f-arch4-mut-backup-anchor-serialize.ts——还原
  对账凭证，留档）、c2-verify-full.log、c2-verify-rest.log、本报告。
- 修改：scripts/audits/f-l4-verify.mjs（③）、tests/e2e/reader-text.spec.ts（②）。
- src/** 零净改动（三份变异备份 diff 全空）；docs/invariants.md 未触碰；未跑任何 git/locks 命令；
  未新增依赖、未改 package.json。

━━━ 票面全文 ━━━
# 票 C-2：弱锚时序补强搭车票（AUDIT-C 首波——同族搭车一次派发）

> 派发=主控（GLM5.3）；实现者子代理（环境限制统一档，欠账在册）；门一=Kimi 链
> 必保（受锁面）；门二=deepseek 亲跑。来源票面=auditc-ticket-kimi.md §4 C-2+
> auditc-final-ruling.md §2 修订（N-2 同族搭车/C-2③ 全部固定等待轮询化/
> N-3 顺带核 INV-44 备案③）。
> **性质=补锚票：只补测试/探针锚点，不改任何行为实现码**（R5 纪律：直测若
> 推翻既有推断→停手如实报告，不修）。

## 行为层（三个子项的预期行为——全部是**锁定既有行为**，非新行为）

### ① INV-42 N6：选择模式点击 rect 零副作用——真机直测（当前=三层推断）

INV-42 在档语义（docs/invariants.md）：选择模式下用户标注层与 AI 标注层一切
渲染 rect `pointer-events:none`——点击穿透零副作用；常规模式点击标注=出
菜单。弱锚=真机层「选择模式点击 rect 零副作用」未直测。

**新探针** `scripts/audits/f-a3-n6-verify.mjs`（crib 同目录 f-a3-verify.mjs
的运行模式：真实库副本 freshUserData+Electron launch+真鼠标），场景：

1. 前置：打开一篇有文本的文献（f-a3 同法）→ 真鼠标拖选干净面→点「高亮」
   制造一条既有标注（f-a3 场景前置同款，程序化兜底亦可）。
2. **B-n6 主断言**：点「选择模式」按钮（`button:has-text("选择模式")`，
   aria-pressed=true 前提锚）→ 在视口内可见的 `[data-testid="annotation-rect"]`
   （宽>20 整块在视口内，f-a3 qA 采样法）中心**真鼠标单击**（move→down→
   60ms→up，无拖移）→ 断言四件零副作用：
   - a. `[data-testid="annotation-menu"]` 不出现
   - b. `[data-testid="annotation-editor"]` 不出现
   - c. `getSelection()` 无选区（isCollapsed——点击不得成选）
   - d. 唯一 annotationId 计数不变（`[data-testid="annotation-rect"]` 按
     `data-annotation-id` 去重计数前后相等）
   - e. 诊断项：click 点 `document.elementFromPoint` 非 rect 元素（穿透证明）
3. **对照（非恒真证明）**：切回常规模式（aria-pressed=false 前提锚）→ 同点位
   真鼠标单击 → `[data-testid="annotation-menu"]` **出现**——证明点击本身
   有效、零副作用是模式导致而非点击落空。
4. **AI 层同测（如实条件执行）**：若真实库副本中存在 `[data-testid="ai-note-rect"]`
   则同法直测并断言；不存在则 json 里如实记 `aiRectsPresent:false`（不算失败）。
5. 产物：`scripts/audits/f-a3-out/f-a3-n6-verify.json`（三场景数据+断言结果）；
   全过打 PASS，任一断言失败 exit=2。
6. 变异红证（证明探针非恒真）：cp 备份
   `src/renderer/features/reader/AnnotationLayer.tsx`（备份到
   scripts/audits/f-n6-mut-backup-AnnotationLayer.tsx，**禁 git checkout**）→
   临时把选择模式分支的 pointer-events 值改为 'auto'（定位：grep
   pointerEvents/selectionMode 于该文件）→ 重跑探针 → **B-n6 必须红**
   （菜单将出现）→ cp 还原 → diff 确认空 → 重跑回绿。变异只许经备份还原法。

### ② F-ARCH4-M1：root.contains 真浏览器可达性——e2e 反向选区用例（受锁面）

在档背景（docs/audits/audit0-findings.md F-ARCH4 条 + anchor-serialize.ts
头注）：`selectionToAnchor`（src/renderer/features/reader/anchor-serialize.ts:121，
防线行 :129 `root.contains(range.startContainer/endContainer)`）的跨 root
防线在 jsdom 单测层不可达（反向 range 被 jsdom 规范化为 collapsed，由
isCollapsed 先兜）；真浏览器按规范 swap 双边界——**可达性未锚**。SelectionLayer
（SelectionLayer.tsx:107-116）在 selectionToAnchor **之前**有自己的
`closestPageRoot(anchorNode)!==closestPageRoot(focusNode)` 边界检查（跨页/
跨出页盒→toast `选区跨页，不支持创建标注`，toast DOM=右上角 span 文本）。

**新 e2e 用例**（加到 `tests/e2e/reader-text.spec.ts` 末尾，沿用文件内既有
seedAndLaunch/launch/seedPaperRow 配方与既有用例风格）：

test('F-ARCH4-M1 跨根选区防线真浏览器定性：跨页真鼠标=toast 拒绝；同页跨
textLayer 边界=静默不建锚；页内选区=工具条（三向对照）')

1. **E3 真鼠标跨页**（真用户路径+INV-02 锁）：seed 文献打开（连续滚动多页可
   见）→ 滚到两页交界（页1 底部文本 span+页2 顶部文本 span 同视口）→ 真鼠标
   从页1 span 拖到页2 span（move→down→插值 move→up）→ 断言 toast 文本
   `选区跨页，不支持创建标注` 可见 + 无 `[data-testid="selection-toolbar"]`。
   （拖选插值手法 crib f-a3-verify.mjs dragSelect。）
2. **E1 程序化同页跨 textLayer 边界**（真 Chromium 语义实验——setBaseAndExtent
   反向/跨界构造，jsdom 做不到的形态）：`win.evaluate` 里对**同一**可见页的
   canvas 元素（`[data-page-root] canvas`）设 anchor（offset 0）、textLayer
   文本节点设 focus（offset>0）：`sel.setBaseAndExtent(canvasEl,0,textNode,k)`
   ——closestPageRoot 两者同页根（过 SelectionLayer 检查）但 range 边界跨
   textLayer → selectionToAnchor 内被拒 → 断言：**无 toast 且无工具条**
   （条件轮询 ≥600ms 等 SELECTION_DEBOUNCE_MS=200 防抖 settled，禁固定
   waitForTimeout）。
3. **E0 对照页内有效选区**：程序化 `sel.setBaseAndExtent(textA,k1,textB,k2)`
   （同 textLayer 两文本节点）→ 断言 `[data-testid="selection-toolbar"]`
   **出现**（轮询）——证明 E1 的静默是防线拒绝而非夹具失灵。
4. 每步选区操作后 `sel.removeAllRanges()` 复位。
5. **定性结论落测试注释**（E1/E2/E3 结果决定，写进用例头注）：
   - 真浏览器不塌缩跨界选区（isCollapsed 不先兜——jsdom 才塌缩）✓实证
   - 拒绝由谁承担：见 E2 变异矩阵。

**E2 变异矩阵（断言级归属——cp 备份法，禁 git checkout）**，对
`SelectionLayer.tsx`（anchorRoot!==focusRoot 检查）与
`anchor-serialize.ts`（root.contains 检查）各做一次单点摘除变异：
- 变异 A（摘 SelectionLayer 边界检查）→ E3 必红（无 toast）；
- 变异 B（摘 root.contains）→ E1 红与否**如实记录**：红=root.contains 决定
  性可达；不红=更深的 probeTextLength 守卫先拒（root.contains=纵深防御层，
  非唯一防线）——两种结果都是合法机器结论，写入用例头注定性注记+实现报告。
- 每次变异：cp 备份→变异→单跑本用例→cp 还原→diff 空。矩阵结果表入实现报告。

### ③ f-l4-verify.mjs 固定 waitForTimeout 轮询化（受锁面；最低优先——预算触顶先裁）

INV-44 备案③（docs/invariants.md INV-44 锚定栏）：「探针固定 waitForTimeout
脆性（CI 慢机误报风险）」。实测 `scripts/audits/f-l4-verify.mjs` 固定等待
**15 处**（grep 实测行号：114/116/195/197/199/230/246/251/284/286/301/305/
320/324/331——终裁书作废的「6 处」口径已修正）。

- 逐处替换为**条件轮询**（`await win.waitForFunction(条件, null, {timeout,
  polling})` 或 locator waitFor/expect 轮询），条件按各等待点的语义自裁并
  在实现报告逐处列表（条件+超时值+理由）。例：197 行等 settings save 落地
  →轮询按钮 aria-pressed/档位 class 生效；199 行等重挂载取数+fit →轮询
  DUMP 可取且 nodeCount>0；探针尾部恢复 --ui-scale 的 305 行→轮询属性回值。
- **验收判据**：`grep -c "waitForTimeout" scripts/audits/f-l4-verify.mjs` = 0
  （dragSelect 插值步进 16ms 类微延迟若属动作序列而非等待语义，可改
  waitForTimeout→for 循环 sleep 同值保留——在报告说明）+ 重跑探针 13/13
  PASS 全保持（产物 json diff 语义不变）。
- 顺带核 INV-44 备案③：轮询化完成后在实现报告写「备案③销项建议」一段
  （主控收口时定夺 INV 册措辞更新，实现者不改 invariants.md）。

## 接口层

- 新文件：`scripts/audits/f-a3-n6-verify.mjs`（探针①）。
- 修改：`tests/e2e/reader-text.spec.ts`（追加一个 test，②）。
- 修改：`scripts/audits/f-l4-verify.mjs`（轮询化，③）。
- 不改：任何 `src/**` 实现码（变异是临时备份还原，diff 终态空）；
  `docs/invariants.md`；`scripts/audits/f-a3-verify.mjs`（① crib 只读参照）。

## 架构层

- 两处修改文件在 locks 受锁集合内——主控已解锁，实现者直接改；重锁+manifest
  由主控收口办理（实现者禁跑 locks:*/git 任何命令）。
- e2e 遵循 tests/e2e 既有风格（真实文本断言、launch/seed 配方复用、无
  固定 sleep——新用例内一律条件轮询）。
- 探针 crib 声明写在文件头注（f-a3-verify.mjs 同款头注风格）。

## 生命周期层（TDD/验证纪律）

- ②新用例：先写用例→跑（对既有行为应绿）→E2 变异矩阵逐变异红证→还原
  diff 空。受锁 e2e 改动后**必须全量 e2e**（`npm run test:e2e`，esbuild
  不查类型，类型面交给 typecheck——本票不改 ts 但纪律不变）。
- ①探针：PASS 三场景+变异红证+还原 diff 空。
- ③：grep 判据=0+重跑 13/13。
- 全部完成跑 `npm run verify` 全绿（真退出码），报告 verify 尾行输出。
- **环境陷阱（必守）**：本机 PATH 前导 /d/nodejs 是 node v25（ABI 不符）——
  每条命令前 `export PATH=/d/nodejs24:$PATH`；探针/e2e（Electron 面）前
  确认 `node scripts/sqlite-abi.mjs use electron`；裸跑 vitest 前要
  `use node`（一律走 npm run test 兜底）。
- 卡住/推断不成立（如 E1 出工具条、变异不红、探针前置失败）→**停手如实
  报告**，不放宽断言不改实现（R5）。

## 文化层

- 实现报告：三子项逐项结果（含 E2 矩阵表+③的 15 处替换表+①的 json 摘要）
  +自裁决定清单+token/时长；落 `scripts/audits/c2-impl.report.md`
  （主控代存亦可，报告正文随消息返回）。
- 计数类数字（grep 处数/断言数）落笔前脚本实测。
- 不新增依赖；不改 package.json。

━━━ 产物③轮询化 diff（f-l4-verify.mjs）━━━
diff --git a/scripts/audits/f-l4-verify.mjs b/scripts/audits/f-l4-verify.mjs
index 0155dcbfb..340ae0164 100644
--- a/scripts/audits/f-l4-verify.mjs
+++ b/scripts/audits/f-l4-verify.mjs
@@ -110,10 +110,58 @@ async function freshUserData() {
 const userData = await freshUserData()
 const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
 const win = await app.firstWindow()
+
+// [C-2③ INV-44 备案③] 固定等待（waitFor Timeout 族）→条件轮询（CI 慢机误报防线）：
+// - pollUntil：waitForFunction 条件轮询（120ms 采样）；超时不抛错返回 false——
+//   红由后续 check 断言承担（保持探针 FAIL 语义而非脚本崩溃）；
+// - twoFrames：双 rAF——布局变化经 paint 两帧，RO（帧前派发）与 React 重渲染
+//   均已获执行机会，负向断言（「无变化」类）自此采样才有效（等待语义的条件化
+//   等价物，非固定 sleep——由帧事件驱动）。
+async function pollUntil(pageFn, arg, timeout) {
+  try {
+    await win.waitForFunction(pageFn, arg, { timeout, polling: 120 })
+    return true
+  } catch {
+    return false
+  }
+}
+const twoFrames = () =>
+  win.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(null)))))
+/** 脉络图挂载 fit 完成且已稳定：节点>0+transform 非空+连续两次采样同值
+ *  （120ms 间隔——初始态 transform=identity（useState 初值）与 nodes 提交
+ *  →fit effect→二次提交之间存在中间帧窗口，「非空」条件会在 fit 落地前
+ *  放行（2026-09-02 本票实测翻车：t1/t2 采到 identity——A/transform 两红）；
+ *  稳定性判据消除该竞态：fit 值一旦提交即不再变（除非用户交互/resize） */
+const lineageReady = async () => {
+  await win.evaluate(() => {
+    delete window.__fitProbe
+  })
+  return pollUntil(
+    () => {
+      const vp = document.querySelector('[data-viewport]')
+      const t = vp === null ? '' : vp.getAttribute('transform') || ''
+      const s = window.__fitProbe === undefined ? (window.__fitProbe = {}) : window.__fitProbe
+      if (t === '' || document.querySelectorAll('[data-node-id]').length === 0) {
+        s.last = null
+        return false
+      }
+      if (s.last === t) {
+        return true
+      }
+      s.last = t
+      return false
+    },
+    undefined,
+    15_000
+  )
+}
+
 await win.getByRole('button', { name: '脉络' }).waitFor({ timeout: 20_000 })
-await win.waitForTimeout(800)
+// [C-2③] 启动 settle 条件化：页面 load 完成（React 渲染已由按钮 waitFor 保证）
+await pollUntil(() => document.readyState === 'complete', undefined, 5_000)
 await win.getByRole('button', { name: '脉络' }).click()
-await win.waitForTimeout(1500)
+// [C-2③] 固定 1500→轮询脉络挂载 fit 完成
+await lineageReady()
 
 const pageErrors = []
 win.on('pageerror', (e) => pageErrors.push(String(e)))
@@ -192,11 +240,15 @@ const brief = (m) =>
 const t1 = await win.evaluate(DUMP) // small 档挂载 fit
 log('A/small 挂载 fit：', brief(t1))
 await win.getByRole('button', { name: '设置' }).click()
-await win.waitForTimeout(600)
+// [C-2③] 固定 600→locator waitFor 条件轮询：档位钮可见=设置页已渲染
+await win.getByRole('button', { name: '中 110%' }).waitFor({ timeout: 8_000 })
 await win.getByRole('button', { name: '中 110%' }).click()
-await win.waitForTimeout(900) // save 落地→store→--ui-scale（真实通道全程）
+// [C-2③] 固定 900→轮询 settings 真实通道终点（save→settings.json→store→
+// --ui-scale：small=1→medium=1.1——属性值即通道落地观测点）
+await pollUntil(() => document.documentElement.style.getPropertyValue('--ui-scale') === '1.1', undefined, 8_000)
 await win.getByRole('button', { name: '脉络' }).click()
-await win.waitForTimeout(1200) // 重挂载：取数+fit effect+RO observe 初始通知
+// [C-2③] 固定 1200→轮询重挂载（取数+fit effect+RO observe 初始通知）
+await lineageReady()
 const t2 = await win.evaluate(DUMP)
 log('A/medium 换档后：', brief(t2))
 
@@ -227,7 +279,9 @@ check(
 // ── A-resize（RO 端到端裁决点）：挂载中窗口 resize——fit effect deps 未变，refit 只能来自 RO ──
 const bounds0 = await winBounds()
 await resizeBy(-240, -160)
-await win.waitForTimeout(900)
+// [C-2③] 固定 900→轮询 RO refit 生效（transform 离开 t2 值——摘 RO 即超时，
+// 由 A-resize 断言红，不在此崩）
+await pollUntil((prev) => (document.querySelector('[data-viewport]')?.getAttribute('transform') || '') !== prev, t2.transform, 8_000)
 const t3 = await win.evaluate(DUMP)
 log('A-resize/缩窗后：', brief(t3))
 const v3 = parseTransform(t3.transform)
@@ -243,12 +297,17 @@ const bx = t3.gBCR.x + t3.gBCR.w / 2
 const by = t3.gBCR.y + t3.gBCR.h / 2
 await win.mouse.move(bx, by)
 await win.mouse.wheel(0, -240) // 用户接管视口（userInteracted=true）
-await win.waitForTimeout(400)
+// [C-2③] 固定 400→轮询 wheel 视口更新（transform 离开 t3 值）
+await pollUntil((prev) => (document.querySelector('[data-viewport]')?.getAttribute('transform') || '') !== prev, t3.transform, 8_000)
 const wb = await win.evaluate(DUMP)
 const wv = parseTransform(wb.transform)
 check('B/pre/wheel-changed', wv !== null && viewportChanged(wv, v3), `wheel 后视口已变（${JSON.stringify(wv)}≠fit 值——前提锚）`)
 await resizeBy(-200, 0)
-await win.waitForTimeout(900)
+// [C-2③] 负向等待条件化：先正向轮询布局变化落地（svg clientWidth 离开
+// wheel 后值），再双 rAF 给 RO（帧前派发）+React 重渲染执行机会——此刻
+// 采样 transform 不变才构成有效负向断言
+await pollUntil((w) => (document.querySelector('[data-viewport]')?.closest('svg')?.clientWidth ?? -1) !== w, wb.client.w, 8_000)
+await twoFrames()
 const wa = await win.evaluate(DUMP)
 const wv2 = parseTransform(wa.transform)
 check('B/viewport-frozen', wv2 !== null && !viewportChanged(wv2, wv), `resize 后视口保持 wheel 值（${JSON.stringify(wv2)}==${JSON.stringify(wv)}——门语义不抢）`)
@@ -281,9 +340,13 @@ await win.evaluate(() => {
 })
 // 重挂载使新实例经 wrapper（patch 时挂载中的旧实例仍原生——不可观察，无妨）
 await win.getByRole('button', { name: '设置' }).click()
-await win.waitForTimeout(500)
+// [C-2③] 固定 500→轮询脉络卸载（viewport 不在场=页面互斥切换完成）
+await pollUntil(() => document.querySelector('[data-viewport]') === null, undefined, 8_000)
 await win.getByRole('button', { name: '脉络' }).click()
-await win.waitForTimeout(1200)
+// [C-2③] 固定 1200→两段条件轮询：wrapper 实例就位（mount 即注册）→
+// 脉络 fit 稳定（lineageReady 稳定性判据——同 t1 竞态防护）
+await pollUntil(() => window.__roRec !== undefined && window.__roRec.instances.length > 0, undefined, 8_000)
+await lineageReady()
 const ro0 = await win.evaluate(() => ({
   instanceCount: window.__roRec.instances.length,
   callbackCount: window.__roRec.callbackCount,
@@ -298,11 +361,16 @@ const countBefore = await win.evaluate(() => window.__roRec.callbackCount)
 const cssOriginal = await win.evaluate(() => document.documentElement.style.getPropertyValue('--ui-scale') || '1')
 const cssFlipped = cssOriginal === '1' ? '1.1' : '1'
 await win.evaluate(`document.documentElement.style.setProperty('--ui-scale', '${cssFlipped}')`)
-await win.waitForTimeout(900)
+// [C-2③] 诊断观察窗条件化（900ms 上限保持）：轮询布局盒变化落地
+// （clientWidth 离开前值）即提前采样；不变则窗口耗尽后采样
+// （cssZoomTriggersRO=false 语义保持——信息项不断言）
+await pollUntil((w) => (document.querySelector('[data-viewport]')?.closest('svg')?.clientWidth ?? -1) !== w, diagBefore.client.w, 900)
+await twoFrames()
 const diagAfter = await win.evaluate(DUMP)
 const countAfter = await win.evaluate(() => window.__roRec.callbackCount)
 await win.evaluate(`document.documentElement.style.setProperty('--ui-scale', '${cssOriginal}')`) // 恢复
-await win.waitForTimeout(600)
+// [C-2③] 固定 600→轮询 --ui-scale 恢复回值
+await pollUntil((orig) => (document.documentElement.style.getPropertyValue('--ui-scale') || '1') === orig, cssOriginal, 8_000)
 const diagnostic = {
   method: '挂载中直写 --ui-scale（非 settings 通道——真实 App 换档经设置页+重挂载，此路径 UI 不可达，仅供 fallback 裁决取证）',
   cssFlipped,
@@ -317,18 +385,26 @@ log('diagnostic（信息项）：', JSON.stringify(diagnostic))
 //    再 resize→计数不增（回调不再生效）──
 const c0 = await win.evaluate(() => window.__roRec.callbackCount)
 await resizeBy(0, -140)
-await win.waitForTimeout(900)
+// [C-2③] 固定 900→轮询 RO 派发计数增加（resize 生效的正向条件）
+await pollUntil((c0v) => window.__roRec.callbackCount > c0v, c0, 8_000)
 const c1 = await win.evaluate(() => window.__roRec.callbackCount)
 check('C/resize-callback-fired', c1 > c0, `resize 后 RO 派发计数 ${c0}→${c1}（浏览器真派发——sanity 前提锚）`)
 await win.getByRole('button', { name: '设置' }).click()
-await win.waitForTimeout(700)
+// [C-2③] 固定 700→locator waitFor 条件轮询：设置页渲染=脉络 unmount
+// （页面互斥）——disconnect 采样前提
+await win.getByRole('button', { name: '中 110%' }).waitFor({ timeout: 8_000 })
 const roUnmounted = await win.evaluate(() => ({
   disconnected: window.__roRec.instances.every((i) => i.disconnected),
   instanceCount: window.__roRec.instances.length
 }))
 check('C/disconnect-on-unmount', roUnmounted.disconnected, `unmount 后全部 ${roUnmounted.instanceCount} 个 wrapper 实例 disconnect 被调（成对清理）`)
+// [C-2③] 负向等待条件化：resize 前取渲染视口高（脉络已 unmount、svg 不在
+// 场——用 documentElement.clientHeight 作布局观测点），正向轮询视口变化
+// 落地（离开前值）+双 rAF——此后采样计数不增才构成有效负向断言
+const vhPre = await win.evaluate(() => document.documentElement.clientHeight)
 await resizeBy(0, 100)
-await win.waitForTimeout(900)
+await pollUntil((h) => document.documentElement.clientHeight !== h, vhPre, 8_000)
+await twoFrames()
 const c2 = await win.evaluate(() => window.__roRec.callbackCount)
 check('C/no-callback-after-disconnect', c2 === c1, `disconnect 后再 resize 派发计数不增（${c1}→${c2}——回调不再生效，无泄漏）`)
 
