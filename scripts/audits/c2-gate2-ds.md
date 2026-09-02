[routing]: run=20260902031925-e5rd source=deepseek model=deepseek-v4-flash switches=0 usage=in=14549,out=20365 latency=177579ms (by ds-call.mjs 链)

# 门二终审简报（deepseek 位）

## 一、亲跑矩阵核验结果

| 复跑项 | 主控亲跑输出 | 与实现报告声明比对 | 核验结论 |
| --- | --- | --- | --- |
| ① f-a3-n6-verify.mjs | B-n6 PASS / AI=absent（aiRectsPresent:false）/ C 对照 menuShown=true / overall=PASS | 三场景声明一致；C 对照 computed=["auto"]（9 块全 auto）对应报告 C 列 | ✅ 一致（**一处字段值例外，见 W7**） |
| ② reader-text.spec 单文件 | 12 passed（含 F-ARCH4-M1，7.1s） | 报告「全量 30 passed」中该文件全过 | ✅ 一致 |
| ③ f-l4-verify.mjs | 13/13 PASS、页面错误 0 条 | 报告「13/13 保持」 | ✅ 一致 |

## 二、门一 6W 处置复核

| W | 处置 | 门二复核 |
| --- | --- | --- |
| W1 C 对照坐标未重采样 | 附条件 2（重采样或记录脆弱点） | **妥当**。主控亲跑 C 对照仍 menuShown=true，当前无漂移实证；作为脆弱点记录合理 |
| W2 E1 观察窗形式 | 建议加注释，判语义等价 | **妥当**。票面处方原文即「条件轮询 ≥600ms」，实现（expect.poll 时间下限）忠实 |
| W3 pollUntil 超时静默 | 建议区分前提/断言等待 | **定级恰当，风险面需扩展**（见下） |
| W4 INV-42 册面措辞 | 作为附条件 1（主控收口） | **妥当**。代码注释「守卫兜程序化派发」与实测（拦截一切点击）不符，册面双层结构缺失，确需修正 |
| W5 e2e 既有 flaky | 主控知悉，观察是否升级 | **妥当**。1 次<立案线，重跑绿，归因合理 |
| W6 json diff 缺实证 | 建议留档 | **妥当**。主控亲跑只能验证改造后 13/13，无法验证「与改造前全同」，留档建议有效 |

**W3 补充（风险面扩展，不改变定级）**：超时静默的风险不止门一所述「非预期红（归因混淆）」，在 **行 251、行 331 两处负向等待**存在「非预期绿」理论面——若 resizeBy 因窗口钳制等原因未生效，则正向前置轮询（clientWidth/clientHeight 离开前值）永不满足→超时→后续负向断言（viewport-frozen / no-callback-after-disconnect）碰巧成立→**无效测试被计为 PASS**。两处均配正向布局轮询+twoFrames 双 rAF，「resize 未生效」概率极低，维持 W 级；建议修复方向比门一更具体：pollUntil 返 false 时对负向等待场景跳过后续 check 并标记「前提未达成」。

## 三、门一漏判复核（三个指定方向）

### ① styleNone+e_penetrated 收紧充分性——**确认充分，无漏判**

- 锚定面完整：styleNone 锚「声明面」（computed pointer-events 全 none），e_penetrated 锚「行为面」（hitTest 穿透到 textLayer），a/b/c/d 锚「交互面」（菜单/编辑器/选区/计数）。INV-42「点击穿透零副作用」的语义被三层覆盖。
- 破坏路径全覆盖：仅改 pointer-events→styleNone+e 红；仅删 onClick 守卫→a 红（菜单出现）；双点同时破坏→a 红。**所有单点/双点破坏路径均被探针感知，收紧充分**。
- 非恒真性：C 对照（常规模式 9 块全 auto+菜单出现）亲跑 PASS，证明非恒真。

### ② E2 变异矩阵结论表述——**确认正确，无漏判**

- 变异 B 后「leadLen=0 直通」分析成立：canvas 文档序先于 textLayer，probeTextLength 不拦截该形态；摘除 root.contains 即工具条出现（实证），「决定性防线」归属成立。
- 变异 A 归属正确：toast 唯一来源即 SelectionLayer 边界检查分支，摘除后无 toast 且被 root.contains 静默吞掉（INV-02 语义），层次关系清晰。
- 三向闭合：E3（SelectionLayer 拒+toast）/ E1（root.contains 拒+静默）/ E0（放行+工具条）互不重叠，e1collapsed=false 前提锚证明真浏览器不塌缩混合选区。

### ③ 15 处替换语义等价性——**确认等价乃至更优，无放宽**

- 正向等待（9 处）：均以「目标状态到达」为信号，较固定延时更精准；lineageReady 连续采样判据消除中间帧竞态（首跑 11/13 翻车实证），「稳定判据」设计正确。
- 负向等待（2 处）：行 251、331 均配「布局变化落地正向轮询+twoFrames」，负向断言有效性有前提保障；行 331 首版 svg clientHeight 误用自查修正（svg 不在场时 `?.clientWidth ?? -1` 与 -1 恒等→条件永不满足→必然超时）——说明实现者实际执行并修正过。
- 诊断观察窗（行 301）：900ms 上限保持，信息项语义保持。
- **唯一注意点**：行 301 若 CSS zoom 不触发 RO，clientWidth 不变→pollUntil 耗尽 900ms→采样，diagAfter 与 diagBefore 相同，cssZoomTriggersRO=false 语义保持——正确。

## 四、新发现问题

### W7（新增）：实现报告与主控亲跑在 C 对照 `ariaPressedOk` 字段字面不一致

- **证据**：实现报告①C 对照表格「ariaPressedOk=false」；主控亲跑输出「场景 C 对照常规点击 {"ariaPressedOk":**true**,...,"menuShown":true}」。
- **分析**：该字段与 menuShown=true 并存，暗示字段语义大概率是「断言通过标志（OK）」而非「aria-pressed 实际值」（若为实际值，true 与菜单出现矛盾——选择模式下菜单不可能出现，B-n6 已实证）。若为断言通过标志，两次运行都应 true，实现报告填 false 当为笔误/摘录错误；若为实际值，则有探针读取时序问题待查。
- **影响**：不影响 C 对照实质有效性（menuShown=true 已验证「常规模式点击出菜单」，模式切换生效）；不影响 non-恒真证明（B-n6 菜单不出现 vs C 对照菜单出现的行为差异已被验证）。
- **处置建议**：主控人工核验 f-a3-n6-verify.mjs 中 C 场景该字段定义，修正实现报告或探针日志措辞。**不构成返工理由**。

## 五、总裁决

### **条件 PASS**

**无 B 级问题**。条件沿用门一并新增 W7 确认项：

1. **主控收口修正 INV-42 册面措辞**（W4）：反映「pointer-events:none 声明面 + onClick 守卫兜一切点击」的双层防线结构，并同步修正 AnnotationLayer 代码注释「守卫兜程序化派发」与实际行为（拦截一切点击）不符的问题；
2. **处理 W1**（C 对照坐标重采样或记录为已知脆弱点）；
3. **主控确认 W7**（C 对照 ariaPressedOk 字段语义及实现报告一致性），无需实现者返工；
4. W2/W3/W5/W6 纳入主控知悉清单，W3 建议按「负向等待场景的 pollUntil 超时应跳过 check 并标记前提未达成」方向改进（不要求本票返工）。

**一句话总结**：门一有条件放行成立，三项复跑与声明一致（除 W7 字面矛盾待澄清），三个指定方向复核均无漏判，附条件处置妥当，无阻断性偏差。