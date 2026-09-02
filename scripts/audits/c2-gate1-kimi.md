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