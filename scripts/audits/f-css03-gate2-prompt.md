# F-CSS-03 门二终审（deepseek 位）——四清单+一

你是门二终审官（实证终审）。铁律：只读本文件内材料；唯一可写=终审报告；
禁 npm/test/git。对「说了没改」「申报失实」零容忍——逐条对 diff 核申报
而非对申报审申报。输出：①处置核对②母本符合度③宪法红线④机器面核对
⑤总评（放行/回炉+理由），中文全文将入档。

背景速览：F-CSS-03=颜色 token 化战役+颜色负锚双关卡（F-LINT-01 顺延票）。
用户双裁决=零视觉差口径（值原样 token 化+同值合并）+语义命名优先。
序⑤验收=像素差分零带+关卡存量零命中+INV-11 升格+verify 全链。
实现=上轮实现者迁移（被外部终止于中段）+本轮实现者关卡落地（GLM5.3flash）
+主控亲改 6 测试文件断言载体迁移（[locked-change] 域，test 8 红 BLOCKED 处置）。

═══ 材料一：门一报告全文 ═══

[routing]: run=20260909153906-pu0l source=deepseek model=deepseek-v4-flash switches=2 usage=in=44495,out=25289 latency=235762ms (by ds-call.mjs 链)

# 门一对抗深审报告——F-CSS-03

> 审查范围：本文件内全部材料（票面+设计真相源+31 文件 diff+实现者报告+红证/变异 raw+终态绿证摘要）。
> 铁律遵守：未跑任何命令，仅做静态对抗审。
> 小结：关卡实现与蓝本高度一致，红证/变异证据链自洽；但**票面⑤验收之「像素差分零带」尚未在材料中闭合**，且存在若干负锚盲区值得立案。逐条如下。

---

## [B] 级

### B-1 票面验收「像素差分零带」未执行即宣告「颜色面已锚定」，存在真机渲染静默偏差风险

**证据**
- 票面序⑤：`验收=像素差分零带+关卡上线即绿 存量零命中+INV-11 颜色面升格+verify 全链`。
- 材五终态仅覆盖 `quality/lint/typecheck/test/theme.test.ts/locks`，明确写：`像素差分验收未跑（主控后续面）的风险点预告`。
- 但 docs/invariants.md 已提前宣告：`颜色面已锚定（2026-09-10 F-CSS-03：quality 段 CSS 颜色消费负锚 C-4 + eslint B-5 tsx inline 色…）`。
- 涉及真机差异的代码证据：`LineageNodeCard.tsx` 现为 `fill="var(--panel)"`（SVG presentation attribute 放 var token），`LineageEdges.tsx` 现为 `stroke = 'var(--edge-inferred)'`；`text-layer.css` 中 `text-shadow: 2px 0 var(--panel)…`；`theme.css` 的 `box-shadow`/`background` 均改为 var 载体。对应测试只断言 `getAttribute(...)`/`style` 序列化出来的 var 字符串，**不验证浏览器是否真的将 var 解析成原颜色**（jsdom 不做 computed color 求值）。

**判定理由**
- 本票核心口径是用户双裁决之「**零视觉差**」；像素差分是该口径的唯一机器验收。当前所有单测为「载体字符串锚」，不等于像素锚。
- SVG presentation attribute 使用 `var()` 虽然现代 Chromium 基本支持，但这是「真机渲染」问题；在像素差分未跑之前，任何一行 var 迁移的视觉正确性都不能被证明。
- 不确定项：我无法在此环境实测 SVG attr 对 var() 的支持；但不影响本条的成立——验收缺位本身是流程级必须修复项。

**建议**：主控后续面需补跑像素差分并留 raw；在差分通过前，不应对 docs/invariants.md 写「颜色面已锚定」的完成态。

---

## [W] 级（建议改进/后续立案）

### W-1 B-5 AST 面漏掉「模块级 style 常量对象」——本仓当前就有大量 `const STYLE = {...}` 形态

**证据**
- eslint.config.js B-5 实现只追：
  `JSXAttribute[name=style] → JSXExpressionContainer → ObjectExpression → Property.value=Literal`。
  即只对 JSX 内联字面量对象生效。
- 本仓实际大量颜色是「模块级常量 style 对象」再赋给 `style={X}`。材料二可见：
  - `LineageSideAiNotes.tsx`：`const NOTE_CARD = {...background:'var(--panel)', borderColor:'var(--note-border)'}`；
  - `LineageSideTags.tsx`：`const SIDE_TAG_CHIP = {...background:'var(--danger-a08)'...}`；
  - `LineageSidePanel.tsx`：`const SIDE_GLASS = {...background:'var(--panel-a92)'...}`；
  - `LineageNodeMeta.tsx`：`const TAG_CHIP_STYLE = {...}`。
- 若将来新颜色被写进这些常量对象，AST 入点是 `JSXAttribute` 的 `expression`（Identifier），不是 ObjectExpression，**B-5 完全放行**；且该 .tsx 内联样式负锚的「全部 tsx 颜色消费单源化」断言将被静默破坏。

**说明**
- 设计书明确写「模板串/表达式值不检（单文件态面）」，此处不构成对蓝本的偏差；但对「B-5= tsx inline style 颜色负锚」这一长期关卡的有效性有实质削弱。今日迁移虽把这些常量都 token 化了，关卡却不能防止它们回退。

**建议**：后续可将 B-5 扩为至少两级——`ObjectExpression` 直接入 + 模块级 style 常量名声明（如 `const X: CSSProperties`）的内容面；或登记为已知扩展面。

### W-2 C-4「行级豁免定义行」不拦截「同值重复 token 定义」——与「同值合并共享」约束有缺口

**证据**
- check-quality.mjs C-4：
  ```js
  content.split('\n').forEach((line, i) => {
    if (/^\s*--[\w-]+\s*:/.test(line)) return
    if (COLOR_RE.test(line)) violations.push(...)
  })
  ```
- 该豁免是「凡是 `--name:` 定义行全部放行」，不比较 token 值是否与既有 token 重复。
- 用户裁决口径：`同值合并共享`；INV-11 语义：禁止两份等价声明出现。但若未来 theme.css 内新增 `--panel-b: #ffffff` 或 `--accent-a45: rgba(44, 95, 138, 0.45)`，即使值完全等价于既有 token，C-4 仍绿；C-4「零 token 清单依赖」设计从根上就不拦定义重复。

**说明**
- 本轮 50 值盘点通过人工评审做到了同值合并（#ffffff→--panel 等），所以现状不违规；但这是「评审一次性正确」，关卡面没有长期锁。可以接受为票面外风险，但建议后续在 extension 面加 token 值重复计数守卫。

### W-3 负锚对 CSS 注释/`url(#hex)`/`content:"#hex如"` 的误报面比「content:"#" 不咬」更宽

**证据**
- COLOR_RE：`/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/`。
  - 注释 `/* 示例 #aabbcc */`：会红（设计书把「注释内示例」算 W4 知悉面，接受）。
  - `url(#a1b2)`/`href="#abc"` 形态：`#a1b2` 会被当作 4 位 hex 命中；`content: "色#abcd"` 同理会命中。
  - 真正「不咬」的只有 `#` 后非 hex 的形态，如 `content:"#"`。

**现状**
- 存量零命中已实测，且当前 CSS 无上述形态，不构成存量回炉。但这是把「C-4 = 颜色消费负锚」做成纯文本行正则的已知噪音面；后续新增 SVG filter/URL fragment 的 CSS 时会出现一次假阳性。设计已接受注释面，本项列为知悉式 W。

### W-4 两文件 COLOR_RE 双写由人工纪律维护，无机器强制

**证据**
- eslint.config.js：
  `const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/`
- check-quality.mjs：
  `const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/`
- 只有两处头注互相要求「改一处必同步另一处」。若未来新增颜色形态（如 `lab(`/`color-mix(` 中的裸字面量、或 `#rgba` 4 位 hex 变体），双文件不同步时无哨兵能红。

**建议**：设计书明示此为「§8.6 双写面纪律」，可接受；但可考虑在质量关卡用文本断言比对两个文件中的正则常量文本相同，成本很低。属建议项。

### W-5 测试断言「值锁」迁为「var() 载体锁」后，检测能力从「值面」局部弱化为「载体面」

**证据**
- 12 处断言迁移，如：
  - `pdf-page-canvas.test.tsx`：`sheet.style.background` 由 `rgb(255, 255, 255)` 改为 `var(--panel)`；
  - `selection-paint.test.tsx`：`b.style.background` 由 `rgba(0, 0, 0, 0.2)` 改为 `var(--reader-selection-paint)`；
  - 多处注释明确写「值面由 theme.test.ts TOKENS 正锚独立锁定」。
- theme.test.ts TOKENS 数组确实正锚了每个 token 值，若 token 值变化会红；因此旧断言拆成两层（载体断言+TOKENS 值断言）后，逻辑上能重构出原值。

**但是**——这是「把两处断言合并成两个独立环节」的迁移：
- 若组件源误引用另一个「同值待删 token」或错误 token，载体断言会放行；TOKENS 只锁 token 值不锁消费位是否正确引用。
- 例：源把 `--reader-selection-paint` 写成等值的 `--danger-a08` 或手写 `rgba(0,0,0,0.2)`——前者 B-5/C-4 均绿（值是 token），后者 C-4 不扫 tsx、B-5 咬 Literal 才红，若写在常量对象里则全绿。
- 结论：本轮改动语义基本可恢复，但相比原断言，对「消费点是否真的指向正确 token」的锁变弱。

---

## [N] 级（知悉项/证据链确认）

### N-1 实现者报告第 2 节文件清单未含后续主控修复的 6 个测试文件

- 原始报告中 `test` 仍是 BLOCKED 8 红，随后材五显示测试由主控修复至 1562/1562 绿，涉及 6 个测试文件 12 改点。这些改动不在 f-css03-impl 报告的文件清单内，但材五已在主控复跑摘要中如实呈现。链条无隐瞒。

### N-2 W3 哨兵「0 处走 match null、>1 处红」逻辑与蓝本一致；mut3 证明放行风险有效

- 红证 red3/red4 + mut3 的 exit 序列完整：
  - mut3 变形 `if (declCount > 1)`→`if (false)`，双 FS_DECL 时 exit=0（静默取第一处）；
  - 还原后同探针 exit=1。
- W3 的歧义方向正确；唯一残余是 `.match(/FS_DECL = \/(.+)\/gi/)` 对「注释中也出现 FS_DECL = / 字样」的文本会和 declCount 产生计数口径差，当前 theme.test.ts 无此形态。

---

## 统计

| 分级 | 数量 |
|---|---|
| B = 实质缺陷必须修 | 1 |
| W = 建议/风险 | 5 |
| N = 知悉 | 2 |

## 总评

- **关卡实现质量**：C-4/B-5/W3 与设计真相源 §1/§5 的形态高度一致；红证四支+变异三支 exit 证据链完整；「test 8 红」的归属（7 处上轮遗留+1 处裁决 1 引入）定性准确；主控修测试断言的「载体迁移+TOKENS 值锚」两手做法能保持原值锁。
- **主要问题不在代码实现，而在验收闭合**：票面核心为「零视觉差」，但终态摘要明确未跑像素差分；SVG attr 上的 `var(--panel)`/`var(--edge-inferred)`、canvas `background:'transparent'` 改写、jsdom 只锁序列化字符串等，使真机像素语义目前处于未证明状态。
- **放行建议**：关卡/代码面可以进入后续流程，但在 docs/invariants.md「颜色面已锚定」的措辞下，必须补跑像素差分并留 raw；否则视为票面 ⑤ 验收缺失，不允许收口。

以上，门一隔离审查完毕。
═══ 材料二：主控对门一处置（逐条）═══

- **B-1 处置=已闭合（时序差非缺位）**：门一包为静态快照（派发于像素差分前）；
  门一运行期间主控已完成像素差分验收：`npm run build` exit=0 →
  p7d01-visual-probe after 八态截图+sha256 对比 → 第二次采集 **[COMPARE] PASS
  ——零视觉差铁证成立**（八态逐字节相同+tokens 11 项+compiledRules 11 项+
  sweeps 全同；raw=f-css03-probe-after2.raw.txt）→ visual-diff-locate 全八态
  **0 差分带**（exit=0）。首采 settings.png 哈希不同 1 次（差异带 y=[208,240)
  x=[32,112)——crop 在档 f-css03-settings-crop.png）→ 复采逐字节相同=非确定性
  瞬态（颜色回归是确定性的，若迁移出错两次 after 都差）——按 e2e 非确定
  立案线（同用例 2 次）不计案，指纹留档。门一关切的 SVG attr var() 真机
  渲染面：lineage-canvas/lineage-side/lineage-side-tagged 三态逐字节相同=
  fill="var(--panel)"/stroke="var(--edge-inferred)" 真机渲染与迁移前 baseline
  完全一致；同文件 stroke="var(--accent)" 迁移前已是该形态（diff 可证）。
  INV-11 升格先于像素差分落笔=门一流程批评成立，结果已闭合——提交信息
  注明时序。
- **W-1 处置=备案**：B-5 扩展面（模块级常量 style 对象 AST 面）=后续票候选
  （设计书 §1「模板串/表达式值不检（单文件态面）」知悉面；当前常量全
  token 化）。
- **W-2 处置=备案**：C-4 token 值重复计数守卫=后续票候选（CR3a 零清单依赖
  的已知边界）。
- **W-3 处置=知悉**（设计书 W4 同族——存量零命中实测）。
- **W-4 处置=备案**：COLOR_RE 双写机器哨兵=后续票候选（F-LINT-03 同族；
  本票不加面——超票面决定需新门审闭环，成本收益裁决留后续）。
- **W-5 处置=知悉**：载体锚+TOKENS 值锚两层（门一自认「逻辑上能重构出
  原值」）；「等值待删 token」现状不存在（同值合并毕+W-2 边界知悉）。
- N-1/N-2：确认（主控 6 文件修复在材五+门二材料四；W3 证据链门一已核）。

═══ 材料三：终态绿证与数理 ═══

- quality:check exit=0 / lint exit=0（B-5 上线存量零命中）/ typecheck exit=0
- test **1562/1562** exit=0（1562=基线 1514+48 TOKENS it.each 展开——vitest
  逐数组项计一用例，+48 与新 token 数严格一致）
- theme.test.ts 180/180（48 新 token 正锚+2 处 B1 块断言载体迁移）
- 像素差分：八态 0 差分带+[COMPARE] PASS（材料二详）
- locks 311 基线——中间态未 apply（收口时 apply 同步；本票受锁改面=
  theme.test.ts+6 测试件+check-quality.mjs+eslint.config.js；invariants.md
  在 docs/ 不受锁）
- 红证四支+变异三支 raw 全在档（exit 真值落盘回读——列表见实现者报告 §3/§4）

═══ 材料四：diff 全文（31 文件 554+/123-，含主控 6 测试文件改点）═══

diff --git a/docs/invariants.md b/docs/invariants.md
index 7eb5133f6a..b47e6f6e82 100644
--- a/docs/invariants.md
+++ b/docs/invariants.md
@@ -22,7 +22,7 @@
 | INV-08 | 出网仅白名单 host 且仅手动触发，无后台网络任务 | src/shared/constants.ts + http-client 内强制 | 常量 + 单测 + e2e CSP 断言 | 已锚定 |
 | INV-09 | 渲染层禁止 Node/Electron API 与绝对文件路径 | AGENTS 安全禁令 | ESLint 强制 | 已锚定 |
 | INV-10 | 标注层容器是 stacking context：混合模式必须上容器级（rect 级混合被隔离无效且矩形互相叠乘） | AnnotationLayer.tsx 注释 + 战役报告 | e2e mix-blend 断言 | 已锚定 |
-| INV-11 | 类型/颜色/文案/数值单一真相源（禁止两份等价声明靠注释对齐） | AGENTS 代码组织 | 机器锚定（字号面 quality 段全量 CSS 负锚）+审查（颜色/数值面——颜色 F-CSS-03 立案） | 部分→机器面扩展（2026-09-09 F-LINT-01 C-8：quality 段全量 CSS 字号负锚——新文件自动入锚+提取/零文件哨兵[字号面已锚];颜色消费负锚 C-4/B-5 设计毕[终裁档 §1+§5]因存量 61+6 命中未清[同值多源=真违规子集+一次性字面量=严于字面的 token 化未达]顺延 F-CSS-03 颜色 token 化战役票——清理毕即落;人审残留=结构等价类型/文案双源/泛化魔法值） |
+| INV-11 | 类型/颜色/文案/数值单一真相源（禁止两份等价声明靠注释对齐） | AGENTS 代码组织 | 机器锚定（字号+颜色面——quality 段全量 CSS 负锚+eslint B-5 tsx inline 色）+审查（数值面） | 颜色面已锚定（2026-09-10 F-CSS-03：quality 段 CSS 颜色消费负锚 C-4+eslint B-5 tsx inline 色——迁移毕即落+50 值 token 驻 theme.css :root+theme.test.ts TOKENS 正锚）;字号面已锚（2026-09-09 F-LINT-01 C-8 quality 段全量负锚——新文件自动入锚+提取/零文件哨兵）;人审残留=结构等价类型/文案双源/泛化魔法值 |
 | INV-12 | 受锁文件变更即时 locks:apply（manifest 与提交同步，禁跨提交延迟） | AGENTS 依赖与提交 | CI locks:check | 已锚定 |
 | INV-13 | IPC Result 折叠约定：service 把业务失败折叠为正常返回时（如 enrichStatus:'failed'、幂等删除 ok:true），消费方必须分支处理、不得无条件按成功提示 | enrich 先例（U1 修复）；reader.service 删除幂等语义 | 人审 + 折叠面清点存档 | **部分**（2026-08-23 UBS 折叠面全量清点：7 service+settings ipc+register 共 8 点，全部消费方已分支或幂等语义正当，无 enrich 同型；清点表=docs/reports/2026-08-23_ubs-sweep.md §B1；新增折叠点须随消费方分支一并过审） |
 | INV-14 | 输入接缝注册/注销成对：快捷键（keymap）、滚轮/指针监听、拖拽期 body 样式副作用必须与挂载源同源清理——消费方清理函数与注册同函数对，卸载/重挂不得残留监听或全局样式；**事件订阅同族（2026-08-27 SR2-AI-04 扩面）：apiEvents 事件订阅（onExportCorpus）与 store 订阅的注销同挂载源成对** | SR2-KEY-01/02、SR2-UIK-01 规约（2026-08-23 P7-A 开单引入，B4 防线后首批 SR2 工单）；SR2-AI-04 useExportCorpusEvents（App 层事件桥） | 单测（keymap.test 12 用例：模块级成对/配对面；reader-shortcuts.test 8 用例：快捷键/滚轮消费方级；split-pane.test 11 用例：指针监听+拖拽期 body 样式副作用的会话清理与中途卸载还原（含 pointercancel 同路径）+corpus-export.test.tsx 事件桥消费方级（挂载订阅一次/卸载成对注销））+ 人审（消费方清理同源） | 已锚定（四面全锚：模块级+快捷键/滚轮消费方级+指针/body 样式面=SR2-KEY-01/02/UIK-01，2026-08-24 P7-A 收口；事件订阅消费方级=SR2-AI-04，2026-08-27） |
diff --git a/eslint.config.js b/eslint.config.js
index 72ce11ec3b..6b53a17eeb 100644
--- a/eslint.config.js
+++ b/eslint.config.js
@@ -8,6 +8,10 @@ import tseslint from 'typescript-eslint'
  * 3. renderer 禁 Node/Electron——最小权限（安全 §6.1）
  * 4. 禁 any / eval——弱模型幻觉的第一道闸
  * 5. features 跨域互引由 scripts/check-quality.mjs 静态检查（glob 表达不了的相对路径规则）
+ * 6. [F-CSS-03 B-5 2026-09-10] synapse/no-inline-color——tsx inline style
+ *    颜色字面量负锚（INV-11 颜色消费单源=--* token）。COLOR_RE 与
+ *    scripts/check-quality.mjs 第 6 段 C-4 双写面逐字一致——改一处必同步
+ *    另一处（§8.6 双写面纪律）。
  */
 export default tseslint.config(
   {
@@ -183,6 +187,45 @@ export default tseslint.config(
       ]
     }
   },
+  {
+    // [F-CSS-03 B-5] tsx inline style 颜色字面量负锚（设计=终裁档 §1 B-5，
+    // 2026-09-10 迁移毕落地）。AST 面：JSXAttribute[name='style']→
+    // JSXExpressionContainer→ObjectExpression→Property.value=Literal 命中
+    // COLOR_RE→report；var() 载体 Literal 不命中正则天然豁免；模板串/表达式
+    // 值不检（单文件态面）。COLOR_RE 与 check-quality.mjs C-4 消费正则双写面
+    // 逐字一致+两文件头注互指（§8.6 纪律）
+    files: ['src/renderer/**/*.tsx'],
+    plugins: {
+      synapse: {
+        rules: {
+          'no-inline-color': {
+            create(context) {
+              const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/
+              return {
+                JSXAttribute(node) {
+                  if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'style') return
+                  const v = node.value
+                  if (!v || v.type !== 'JSXExpressionContainer') return
+                  const obj = v.expression
+                  if (!obj || obj.type !== 'ObjectExpression') return
+                  for (const prop of obj.properties) {
+                    if (prop.type !== 'Property') continue
+                    const val = prop.value
+                    if (!val || val.type !== 'Literal') continue
+                    const s = String(val.value)
+                    if (COLOR_RE.test(s)) {
+                      context.report({ node: val, message: `inline style 颜色字面量 "${s}"——颜色消费单源=--* token（INV-11）` })
+                    }
+                  }
+                }
+              }
+            }
+          }
+        }
+      }
+    },
+    rules: { 'synapse/no-inline-color': 'error' }
+  },
   {
     files: ['tests/**/*.ts', '**/*.test.ts'],
     rules: {
diff --git a/scripts/audits/f-css03-impl.report.md b/scripts/audits/f-css03-impl.report.md
new file mode 100644
index 0000000000..8442de7055
--- /dev/null
+++ b/scripts/audits/f-css03-impl.report.md
@@ -0,0 +1,237 @@
+# F-CSS-03 实现者报告——关卡面完成，test 分项 BLOCKED（8 处受锁断言红，[locked-change] 上报）
+
+> 档位：GLM5.3flash（实现者位，主控派发指定统一档，如实记）。
+> 真相源：docs/design/2026-09-09_f-lint01-design-final.md §0 CR3a+§1+§5；
+> 蓝本=scripts/audits/f-lint01-impl.report.md §3 两段代码（已验证可红照落）。
+> 结果一句话：主控裁决 1-6 全部落地（C-4/W3/B-5/INV-11 升格+两处源改），
+> 红证四支+变异三支全取（各 raw 在档含 exit 真值），quality/lint/typecheck
+> 存量全绿；**但 `npm run test` 全量 8 用例红**（7 处上轮迁移遗留受锁断言
+> 断裂+1 处裁决 1 引入）——修复全部落在 tests/**（本票禁令红线+[locked-change]
+> 域），实现者无权处置 → 按纪律停手上报，本报告=卡点清单+已完面弹药。
+
+## 0. 开工记录（技能清点，AGENTS 会话开工纪律）
+
+- `test-driven-development`——**用**：本票核心流程红→绿→变异红证。
+- `verification-before-completion`——**用**：存量绿证四支+exit 真值回读。
+- `systematic-debugging`——**不用**：票面无调试面（纯关卡落地+证据链；test
+  红定位用 raw 归因非调试器面）。
+- `subagent-driven-development`——**不用**：实现者子代理本体，无派发面。
+- 其余技能（前端/浏览器/git workflow 等）——**不用**：无 UI 测试面（票面禁
+  视觉/e2e）、无 git 写操作（禁 commit）、纯 CI 关卡+CSS/TSX 微改。
+- 配置自查：GLM5.3flash 实现档=主控派发指定，一致。
+
+## 1. 实现摘要
+
+- **裁决 1**：PdfPageCanvas.tsx:139 `background: 'rgba(255,255,255,0)'` →
+  `background: 'transparent'`（仅此一行，F-A5 注释「透明底渲染」意图不动）。
+- **裁决 2**：theme.css:91 注释去字面量（`#ffffff→--panel/#e4ded1→--border`
+  →「白→--panel/暖灰描边→--border」）。**延伸面（自裁，见 §7.2）**：dry-run
+  实测另发现 token 段分组注释 5 行含字面量（97/106/107/114/118——
+  `rgb(44,95,138)`/`rgb(201,168,106)`/`rgb(179,64,58)`/`#ffffff` 示例文字），
+  与裁决 2 完全同族（纯注释、零行为面），同法清理（「基色 rgb(...)=--X」→
+  「基色=--X」），C-4 存量绿的前置必要条件。
+- **裁决 3+4**：check-quality.mjs 第 6 关卡段改造——W3 哨兵（matchAll
+  `/FS_DECL = \//g` 计数 >1 处=歧义哨兵红，0 处自然落入既有 match null 支，
+  恰 1 处照旧 `new RegExp(m[1],'gi')`）+C-4 同循环落码（行级豁免
+  `/^\s*--[\w-]+\s*:/`+COLOR_RE 命中行=violations.push，消息格式=票面
+  `${rel}:${行号}: CSS 颜色字面量消费（单源=--* token）：${行 trim 截 80}`）。
+  循环结构按蓝本 §3：`if (!fsDeclRe) break` 改为 `if (fsDeclRe) {…}` 包 C-8、
+  C-4 无条件行扫（提取失败时哨兵已红、C-4 仍工作——C-4 不依赖 FS_DECL 提取）。
+- **裁决 5**：eslint.config.js tests 段前插 B-5 块（plugins.synapse
+  no-inline-color，files 限 `src/renderer/**/*.tsx`，severity error，AST 面
+  =JSXAttribute[name='style']→JSXExpressionContainer→ObjectExpression→
+  Property.value=Literal 命中 COLOR_RE→report）——逐字照蓝本 §3；两文件
+  头注互指+COLOR_RE 正则文本逐字一致（§8.6 纪律）。
+- **裁决 6**：invariants.md:25 INV-11 两列升格（强制方式=机器锚定[字号+
+  颜色面]+审查[数值面]；状态列=主控文案+字号面锚定史保留+人审残留三项——
+  颜色项已移出，见 §7.6）。
+- **裁决 7**：tsx 注释字面量不动（selection-paint.tsx 注释「色 rgba(0,0,0,0.20)」
+  等保持原样——B-5 AST 面只咬 inline style Literal）。
+
+## 2. 文件清单（本轮改动面）
+
+| 文件 | 改动 | 行数 |
+| --- | --- | --- |
+| scripts/check-quality.mjs | 头注+第 6 段 C-4/W3（受锁件） | 215→235 |
+| eslint.config.js | 头注+B-5 块（受锁件） | 192→235 |
+| docs/invariants.md | INV-11 两列（受锁件） | 1 行替换 |
+| src/renderer/features/reader/PdfPageCanvas.tsx | 裁决 1 一行 | 不变 |
+| src/renderer/shared/theme.css | 裁决 2+延伸 5 行注释 | 200→199 |
+| scripts/audits/f-css03-*.raw.txt | 证据 11 件+本报告 | ①桶证据件 |
+
+行数上限核对：235/235/199 均 ≤500（eslint max-lines 同口径）。
+
+## 3. 红证四支索引（各 raw 含 exit 真值，先写文件后 echo exit=$?）
+
+| 支 | raw | 关键行（实测） |
+| --- | --- | --- |
+| ① C-4 红 | f-css03-red1-c4.raw.txt | `src/renderer/shared/theme-buttons.css:115: CSS 颜色字面量消费（单源=--* token）：.f-css03-red-probe { color: #aabbcc; }`（theme-buttons.css 追加探针→file:line 精确断言）exit=1；还原后探针行 grep=0 |
+| ② B-5 红 | f-css03-red2-b5.raw.txt | `184:97  error  inline style 颜色字面量 "#fff"——颜色消费单源=--* token（INV-11）  synapse/no-inline-color` exit=1；还原 grep=0 |
+| ③ W3 哨兵红 | f-css03-red3-w3.raw.txt | `哨兵：theme.test.ts FS_DECL 多处（2 处）歧义——哨兵[W3]：静默取第一处风险，人工消歧（F-CSS-03）` exit=1；还原 grep=0 |
+| ④ 提取失败哨兵红 | f-css03-red4-c8sentinel.raw.txt | `哨兵：theme.test.ts FS_DECL 提取失败（match null）——哨兵正则或常量行变更（F-LINT-01 C-8）` exit=1（W3 改造后原哨兵仍在——验证目的达成）；还原 grep=0 |
+
+## 4. 变异红证三支索引（cp 备份法，全部还原后双零残留 grep 实测）
+
+| 支 | raw | 咬合证明（exit 序列） |
+| --- | --- | --- |
+| mut1 C-4 | f-css03-mut1-c4.raw.txt | C-4 检查体行注释掉+反例植入→`exit(mutated-gate+probe)=0`（放行=关卡有咬合）→还原关卡（反例保留）→`exit(restored-gate+probe-still)=1` |
+| mut2 B-5 | f-css03-mut2-b5.raw.txt | rules 行 error→off+tsx 反例→`exit(mutated-rule+probe)=0`→还原→`exit(restored-rule+probe-still)=1` |
+| mut3 W3 | f-css03-mut3-w3.raw.txt | `if (declCount > 1)`→`if (false)`+双 FS_DECL（探针置声明行**之前**）→`exit(mutated-w3+double-fsdecl)=0`（静默取第一处=放行风险实证）→还原→`exit(restored-w3+probe-still)=1`（W3 哨兵红） |
+
+## 5. 测试证据
+
+| 关 | raw | 结果 |
+| --- | --- | --- |
+| quality:check | f-css03-quality.raw.txt | **exit=0**（C-4/C-8/W3 全上+存量零命中——裁决 1/2+延伸清理毕） |
+| lint | f-css03-lint.raw.txt | **exit=0**（B-5 上+存量零命中） |
+| typecheck | f-css03-typecheck.raw.txt | **exit=0** |
+| test | f-css03-test.raw.txt | **exit=1：8 failed / 1554 passed（1562 总）/160 文件** ——卡点，见 §6 |
+
+用例总数对账：**1562 ≠ 基线 1514，+48**=theme.test.ts TOKENS 数组新增 48
+token 项经 `it.each(TOKENS)` 展开（vitest 逐数组项计一用例）——主控简报 ⑤
+「TOKENS 是数组数据非新增 it()，预期不变」预判与 vitest 计数语义不符，
++48 与新 token 数严格一致=可解释偏差非异常（实测在档）；**非停手项**。
+
+## 6. 卡点（BLOCKED）——test 8 红，修复全在 tests/**（禁令域）
+
+### 6.1 失败清单与归属（5 文件 8 用例）
+
+| # | 测试文件 > 用例 | 断言差异（实测） | 归属 |
+| --- | --- | --- | --- |
+| 1 | pdf-page-canvas.test.tsx > F-A5 c 面 > render 以透明背景调用 | `expected 'transparent' to be 'rgba(255,255,255,0)'` | **裁决 1 引入**（本轮） |
+| 2 | pdf-page-canvas.test.tsx > F-A5 c 面 > PageBox 白纸承底层+isolation | `expected 'var(--panel)' to be 'rgb(255, 255, 255)'` | 上轮迁移遗留 |
+| 3 | selection-paint.test.tsx > F-A4 a 面 > S1 拖选防抖路径…色 | `expected 'var(--reader-selection-paint)' to be 'rgba(0, 0, 0, 0.2)'` | 上轮迁移遗留 |
+| 4 | lineage-side-panel.test.tsx > R2-LG11 侧板浅色化 | `expected 'background: var(--panel-a92); border:…' to contain 'rgba(255, 255, 255, 0.92)'` | 上轮迁移遗留 |
+| 5 | lineage-canvas-visual.test.tsx > R2-LG11 > 白卡边框编码四态 | `expected 'var(--panel)' to be '#ffffff'` | 上轮迁移遗留 |
+| 6 | lineage-canvas-visual.test.tsx > R2-LG11 > 边三型色 | `expected 'var(--edge-inferred)' to be '#8a94a6'` | 上轮迁移遗留 |
+| 7 | library-cards.test.tsx > R3-LIB > 卡片渐变材质 | `.lib-card {…inset 0 1px 0 rgb…` 正则不匹配 var 载体 | 上轮迁移遗留 |
+| 8 | library-cards.test.tsx > R3-LIB 回炉一 > R5 选中卡材质 | `to contain 'inset 0 0 0 1px rgba(201, 168, 106, 0.45)'` | 上轮迁移遗留 |
+
+### 6.2 定性
+
+- **#2-8（7 处）在我接手前已红**：git diff 实证迁移面（PageBox/selection-
+  paint/Lineage 系列/library.css）把字面量改 var() 载体是上轮实现者工作树
+  改动（上轮 M 面 20 文件含全部相关件；PdfPageCanvas.tsx 不在其中=本轮
+  裁决 1 唯一触碰）——上轮被外部终止于「迁移毕、受锁断言未对账」中段。
+  主控简报 ⑤ 只盘点 theme.test.ts（180/180 绿），未跑全量 test。
+- **#1 为裁决 1 的直接后果**：主控裁决 1 依据（透明非视觉色不立 token/
+  CSS 关键字语义清晰/B-5 天然豁免）未覆盖 pdf-page-canvas.test 的
+  F-A5 受锁断言面（断言 render 参数 background==='rgba(255,255,255,0)'
+  字面量）。附带核实：该行是 `pdfPage.render({...})` 参数而非 JSX style
+  属性——**本就不在 B-5 AST 面与 C-4 CSS 面内**，回退裁决 1 不影响任何
+  关卡绿，但也不能救 test（其余 7 处仍红）。
+- 修复选项（主控 [locked-change] 域，实现者不自裁）：
+  a. 8 处断言随 var() 载体迁移改写（token 载体锚——theme-buttons 先例
+     theme.test.ts B1 块已有 `[F-CSS-03] 断言形态随 token 化迁移` 同款改法）；
+  b. 或断言改「transparent 等值」双形态；
+  c. 裁决 1 回退（仅救 #1）。
+
+## 7. 自裁申报（本简报裁决 1-7 逐条+偏差）
+
+1. **裁决 1 照办**：单行替换，未动该文件其他行。后果（test #1 红）非
+   预期but如实上报——不自裁回退（主控指令优先，回退也只救 1/8）。
+2. **裁决 2 照办+延伸 5 行**（§1 已述）：主控 ⑤i「grep 实测仅 91 行 1 行
+   命中」与本轮 C-4 同款逻辑 dry-run 实测不符（另 5 行命中——token 段分组
+   注释的基色示例文字）。同族同法处理（零行为面），若主控不认可可单独
+   revert 这 5 行（不影响其他面，但 C-4 存量会红 5 行）。
+3. **裁决 3 照办**：循环结构 break→if(fsDeclRe) 是蓝本 §3 原文形态（主控
+   「可直接落码」授权面），哨兵+消息格式逐字票面。
+4. **裁决 4 照办**：declCount=0 自然走 match null 支（结构合并，两哨兵
+   互补），W3 文案逐字票面（含「哨兵[W3]：静默取第一处风险，人工消歧」）。
+5. **裁决 5 照办**：B-5 块逐字蓝本+两文件头注互指+COLOR_RE 逐字一致。
+6. **裁决 6 照办+一处保留**：状态列在主控文案后补「字号面已锚（2026-09-09
+   F-LINT-01 C-8…）」简注——INV 册信息完整性（原状态列含该史，整列替换
+   会丢字号锚定记录）；不认可可删该分句。
+7. **裁决 7 照办**：未动任何 tsx 注释。
+8. **工具坑（方法论候选）**：Git Bash→Windows node.exe 的 argv 边界**丢弃
+   含换行的参数**——红证 3 首跑与 mut3 首跑各无效一次（红因=声明行被删
+   /RegExp 构造异常走 catch 支，均非目标哨兵支），改**单行植入法**（行尾
+   追加注释探针/单行替换）重做后有效。无效首跑输出已被有效重跑覆盖
+   （raw 终态=有效形态），教训在此留档。
+9. **mut3 植入位置学**：双 FS_DECL 探针须置声明行**之前**且构造出合法无害
+   正则（`zz9probe`）——同行尾追加会污染 `.+` 贪婪捕获致 RegExp 构造异常
+   （走 catch 支红≠「静默放行」对照）。红证 ③不受此限（W3 在位时计数即红）。
+10. **test 用例 +48**（§5 已述）：主控预判修正项非异常。
+11. **零超票面其他**：未碰 tickets/、未 git 写操作、未跑 verify（票面豁免）、
+    未跑视觉/e2e（主控亲验面）、未动 locks（见 §8）。
+
+## 8. locks 实录
+
+- 本轮**零 locks 操作**（未 unlock/apply/generate）：受锁三件
+  （check-quality.mjs/eslint.config.js/invariants.md）直接可写=主控预
+  unlock 态（简报 ⑥「unlock 态由主控收口 apply」）；manifest 未动，
+  中间态 locks:check 红=已知（主控收口统一 apply——本轮三件+潜在
+  scripts/audits 新增件面一并）。
+
+## 9. 疑虑
+
+1. test 8 红的 [locked-change] 处置方向（§6.2 选项 a/b/c）待主控裁决——
+   建议选项 a（断言随 var() 载体迁移改写，theme.test.ts B1 块先例同构）。
+2. 上轮迁移面中 SplitPane.tsx 渐变串迁移后为
+   `var(--border-gold-a15), var(--border-gold-a50), var(--border-gold-a15)`
+   ——B-5 AST 面**不咬模板串/非 Literal 值**（票面知悉面），但值域上该
+   渐变三端点已 token 化，闭环完整。
+3. `f-css03-appendix-tmp.md` 为附录生成中间件，随本报告并入后删除（见
+   附录）。
+
+## 附录：50 值命名表（theme.css:93 注释引用件）
+
+> 生成法：theme.css F-CSS-03 段 token:值对 + HEAD 态内容规范化（去空白/
+> 小写）检索重建原消费处；3 处缩写/尾零形态（.15/.12/0.20）经 git diff
+> 删行人工补记（标注 ※）。50=48 新 token+2 既有 token 直接消费。
+
+| token | 值 | HEAD 态原消费处 |
+| --- | --- | --- |
+| --accent-a10 | `rgba(44, 95, 138, 0.1)` | shared/theme-shell.css |
+| --accent-a12 | `rgba(44, 95, 138, 0.12)` | features/workspaces/workspace.css |
+| --accent-a15 | `rgba(44, 95, 138, 0.15)` | features/workspaces/workspace.css |
+| --accent-a20 | `rgba(44, 95, 138, 0.2)` | shared/theme-shell.css |
+| --accent-a22 | `rgba(44, 95, 138, 0.22)` | features/workspaces/workspace.css |
+| --accent-a35 | `rgba(44, 95, 138, 0.35)` | shared/theme-shell.css |
+| --accent-a45 | `rgba(44, 95, 138, 0.45)` | features/workspaces/workspace.css |
+| --accent-a55 | `rgba(44, 95, 138, 0.55)` | features/workspaces/workspace.css |
+| --border-gold-a15 | `rgba(201, 168, 106, 0.15)` | shared/ui/SplitPane.tsx（渐变端点 `.15` 缩写 ※） |
+| --border-gold-a28 | `rgba(201, 168, 106, 0.28)` | shared/theme-shell.css |
+| --border-gold-a45 | `rgba(201, 168, 106, 0.45)` | features/library/library.css<br>shared/theme-buttons.css |
+| --border-gold-a50 | `rgba(201, 168, 106, 0.5)` | shared/theme-shell.css<br>shared/ui/SplitPane.tsx（`.5` 缩写 ※） |
+| --gold-bright-a70 | `rgba(227, 201, 143, 0.7)` | shared/theme-buttons.css |
+| --gold-press | `rgba(207, 174, 114, 0.3)` | shared/theme-buttons.css |
+| --danger-a08 | `rgba(179, 64, 58, 0.08)` | features/lineage/LineageNodeMeta.tsx<br>features/lineage/LineageSideTags.tsx |
+| --danger-a12 | `rgba(179, 64, 58, 0.12)` | shared/theme-buttons.css |
+| --danger-a25 | `rgba(179, 64, 58, 0.25)` | features/lineage/LineageSideTags.tsx |
+| --panel-a06 | `rgba(255, 255, 255, 0.06)` | shared/theme-shell.css |
+| --panel-a07 | `rgba(255, 255, 255, 0.07)` | shared/theme-shell.css |
+| --panel-a35 | `rgba(255, 255, 255, 0.35)` | shared/theme.css（纸面丝纹） |
+| --panel-a88 | `rgba(255, 255, 255, 0.88)` | shared/theme-lineage.css |
+| --panel-a90 | `rgba(255, 255, 255, 0.9)` | features/library/library.css |
+| --panel-a92 | `rgba(255, 255, 255, 0.92)` | features/lineage/LineageSidePanel.tsx |
+| --close-red | `#e81123` | shared/theme-shell.css |
+| --close-red-press | `#f1707a` | shared/theme-shell.css |
+| --nav-text | `#cfd5e4` | shared/theme-shell.css |
+| --nav-item-text | `#aeb6ca` | shared/theme-shell.css |
+| --nav-item-text-hover | `#e6eaf4` | shared/theme-shell.css |
+| --nav-item-text-press | `#eaf1fa` | shared/theme-shell.css |
+| --nav-item-text-current | `#f3eddd` | shared/theme-shell.css |
+| --nav-ver-text | `#8d95ad` | shared/theme-shell.css |
+| --nav-ver-border | `rgba(141, 149, 173, 0.4)` | shared/theme-shell.css |
+| --nav-foot-text | `#6d7590` | shared/theme-shell.css |
+| --ink-deep | `#171e2f` | shared/theme-shell.css |
+| --ink-a18 | `rgba(27, 35, 51, 0.18)` | features/workspaces/workspace.css |
+| --accent-hi | `#3a76ab` | shared/theme-buttons.css |
+| --accent-deep | `#234a6d` | shared/theme-buttons.css |
+| --btn-press-tint | `rgba(11, 26, 40, 0.45)` | shared/theme-buttons.css |
+| --lib-paper-hi | `#fffdf9` | features/library/library.css |
+| --lib-paper-lo | `#fdfaf3` | features/library/library.css |
+| --edge-label-text | `#6b7280` | features/lineage/LineageEdges.tsx<br>shared/theme-lineage.css |
+| --edge-inferred | `#8a94a6` | features/lineage/LineageEdges.tsx |
+| --node-meta-border | `#dfa84a` | features/lineage/LineageNodeMeta.tsx |
+| --note-border | `rgba(151, 160, 187, 0.28)` | features/lineage/LineageSideAiNotes.tsx<br>features/lineage/LineageSideManualNote.tsx |
+| --reader-selection-paint | `rgba(0, 0, 0, 0.2)` | features/reader/selection-paint.tsx（`0.20` 尾零 ※） |
+| --shadow-page | `0 1px 4px rgba(0, 0, 0, 0.12)` | features/reader/PageBox.tsx（`.12` 缩写 ※） |
+| --shadow-pop-sm | `0 2px 8px rgba(0, 0, 0, 0.15)` | features/reader/SelectionToolbar.tsx |
+| --shadow-pop-md | `0 2px 12px rgba(0, 0, 0, 0.18)` | features/reader/AnnotationEditor.tsx |
+| --panel（既有） | `#ffffff` | 直接消费既有 token——原 `#ffffff`/`rgb(255,255,255)` 消费处：features/reader/PageBox.tsx、features/lineage/LineageNodeCard.tsx（SVG fill）、features/lineage/LineageSideAiNotes/ManualNotes/Panel/Tags.tsx、shared/theme-buttons.css、shared/theme-shell.css |
+| --border（既有） | `#e4ded1` | 直接消费既有 token——原消费处：features/lineage/LineageSidePanel.tsx |
+
+（本表 48 新 token 计数经脚本实测 `tokens=48`；※ 三处=规范化检索零命中、
+git diff 删行人工补记，值等价仅书写形态差。）
diff --git a/scripts/check-quality.mjs b/scripts/check-quality.mjs
index 67fc9ae493..6869e0a7f2 100644
--- a/scripts/check-quality.mjs
+++ b/scripts/check-quality.mjs
@@ -1,7 +1,9 @@
 #!/usr/bin/env node
 /**
  * check-quality.mjs —— 质量扫描关卡（受锁文件）。
- * 检查：Node 版本守卫 / 占位标记 / 乱码特征 / renderer features 跨域互引。
+ * 检查：Node 版本守卫 / 占位标记 / 乱码特征 / renderer features 跨域互引
+ * / CSS 字号+颜色字面量消费负锚（第 6 段——COLOR_RE 与 eslint.config.js
+ * B-5 内联 rule 双写面逐字一致，改一处必同步另一处）。
  * 退出码 1 = CI 红。规则依据 AGENTS.md（文档无强制等于没写）。
  */
 import { readdirSync, readFileSync, statSync } from 'node:fs'
@@ -169,24 +171,43 @@ for (const { layer, forbids } of layerRules) {
 //    自动入锚；与 theme.test.ts 七件测试锚=纵深防御，互不替代）。正则
 //    单源=受锁 theme.test.ts FS_DECL 行提取（零正则复制）；读失败/提取
 //    null/walk 零 CSS 文件=哨兵硬红（只哨工具失能态——终裁档 §0 攻击面 5）。
-//    颜色消费负锚 C-4/B-5 设计毕（终裁档 §1）因存量 61+6 真违规未清顺延
-//    F-CSS-03 颜色 token 化战役票——清理毕即落（终裁档 §5 修正终裁 1/2）。
+//    [W3 哨兵 2026-09-10 F-CSS-03] 提取前对文本 matchAll(/FS_DECL = \//g)
+//    计数：>1 处=多处歧义哨兵红——单处 .match() 在多 FS_DECL 形态下静默取
+//    第一处，正则漂移即字号锚失明（0 处落入 match null 支双兜底）。
+//    [C-4 CSS 颜色字面量消费负锚 2026-09-10 F-CSS-03 落地] 颜色 token 化
+//    迁移毕（61+6 存量清零——终裁档 §5 立案顺延件兑现）后同循环落码：
+//    行级豁免=--name: 定义行（token 定义即字面量合法所在地，CR3a 改简——
+//    零 token 名清单依赖）；COLOR_RE 命中行=红。COLOR_RE 与 eslint.config.js
+//    B-5 内联 rule（tsx inline style 面）双写面逐字一致——改一处必改另一处。
 const themeTestPath = join(root, 'tests', 'unit', 'renderer', 'theme.test.ts')
 let fsDeclRe = null
 try {
-  const m = readFileSync(themeTestPath, 'utf-8').match(/FS_DECL = \/(.+)\/gi/)
-  if (m) fsDeclRe = new RegExp(m[1], 'gi')
-  else violations.push('哨兵：theme.test.ts FS_DECL 提取失败（match null）——哨兵正则或常量行变更（F-LINT-01 C-8）')
+  const themeTestText = readFileSync(themeTestPath, 'utf-8')
+  const declCount = [...themeTestText.matchAll(/FS_DECL = \//g)].length
+  if (declCount > 1) {
+    violations.push(`哨兵：theme.test.ts FS_DECL 多处（${declCount} 处）歧义——哨兵[W3]：静默取第一处风险，人工消歧（F-CSS-03）`)
+  } else {
+    const m = themeTestText.match(/FS_DECL = \/(.+)\/gi/)
+    if (m) fsDeclRe = new RegExp(m[1], 'gi')
+    else violations.push('哨兵：theme.test.ts FS_DECL 提取失败（match null）——哨兵正则或常量行变更（F-LINT-01 C-8）')
+  }
 } catch (e) {
   violations.push(`哨兵：theme.test.ts 读取失败（${e.message}）——文件缺席即关卡失能（F-LINT-01 C-8）`)
 }
 const cssAll = walk(join(root, 'src'), (p) => p.endsWith('.css'))
-if (cssAll.length === 0) violations.push('哨兵：src 下 walk 零 CSS 文件——结构失能（F-LINT-01 C-8）')
+if (cssAll.length === 0) violations.push('哨兵：src 下 walk 零 CSS 文件——结构失能（F-LINT-01 C-8/C-4）')
+const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/
 for (const f of cssAll) {
-  if (!fsDeclRe) break
   const rel = relative(root, f).replaceAll('\\', '/')
-  const hits = readFileSync(f, 'utf-8').match(fsDeclRe) ?? []
-  if (hits.length > 0) violations.push(`${rel}: CSS 字号字面量 ${hits.length} 处（单源=--fs-* token；样例：${hits.slice(0, 3).join(' / ')}）`)
+  const content = readFileSync(f, 'utf-8')
+  if (fsDeclRe) {
+    const hits = content.match(fsDeclRe) ?? []
+    if (hits.length > 0) violations.push(`${rel}: CSS 字号字面量 ${hits.length} 处（单源=--fs-* token；样例：${hits.slice(0, 3).join(' / ')}）`)
+  }
+  content.split('\n').forEach((line, i) => {
+    if (/^\s*--[\w-]+\s*:/.test(line)) return
+    if (COLOR_RE.test(line)) violations.push(`${rel}:${i + 1}: CSS 颜色字面量消费（单源=--* token）：${line.trim().slice(0, 80)}`)
+  })
 }
 
 // 7) [F-LINT-02] B-1 同值双常量——同名同值跨 ≥2 文件即红（trivial/同文件豁免、
diff --git a/src/renderer/features/library/library.css b/src/renderer/features/library/library.css
index c677f0971c..4f6ac90e6f 100644
--- a/src/renderer/features/library/library.css
+++ b/src/renderer/features/library/library.css
@@ -25,9 +25,9 @@
   border-radius: var(--radius-l);
   /* 渐变+inset 顶高光（mockup .card 材质三件套之二）；背景裁到 padding-box——
      渐变端点与 border 交界处亚像素缝隙锁（设计定稿注意事项②） */
-  background: linear-gradient(168deg, #fffdf9 0%, var(--panel) 40%, #fdfaf3 100%);
+  background: linear-gradient(168deg, var(--lib-paper-hi) 0%, var(--panel) 40%, var(--lib-paper-lo) 100%);
   background-clip: padding-box;
-  box-shadow: var(--shadow-1), inset 0 1px 0 rgba(255, 255, 255, 0.9);
+  box-shadow: var(--shadow-1), inset 0 1px 0 var(--panel-a90);
   cursor: pointer;
   transition: box-shadow var(--dur-rise) ease, border-color var(--dur-rise) ease, transform var(--dur-rise) ease;
 }
@@ -53,8 +53,8 @@
    期金 ring 不被 hover 值覆盖——单一类选择器 (0,1,0) 压不过 (0,2,0)） */
 .lib-card.lib-card-selected {
   border-color: var(--gold);
-  box-shadow: var(--shadow-2), inset 0 0 0 1px rgba(201, 168, 106, 0.45),
-    inset 0 1px 0 rgba(255, 255, 255, 0.9);
+  box-shadow: var(--shadow-2), inset 0 0 0 1px var(--border-gold-a45),
+    inset 0 1px 0 var(--panel-a90);
 }
 .lib-card.lib-card-selected .lib-corner {
   opacity: 0.9;
diff --git a/src/renderer/features/lineage/LineageEdges.tsx b/src/renderer/features/lineage/LineageEdges.tsx
index 4592cb8808..98b389bd36 100644
--- a/src/renderer/features/lineage/LineageEdges.tsx
+++ b/src/renderer/features/lineage/LineageEdges.tsx
@@ -39,7 +39,7 @@ import { EDGE_LABEL_H, EDGE_LABEL_MAX_W } from './edge-label-layout'
 /** 推断边标记（label 含「推断」两字即推断型） */
 const INFERRED_MARK = '推断'
 /** 推断边色（浅色板灰蓝） */
-const INFERRED_STROKE = '#8a94a6'
+const INFERRED_STROKE = 'var(--edge-inferred)'
 
 export function LineageEdges(props: {
   edges: LineageEdge[]
diff --git a/src/renderer/features/lineage/LineageNodeCard.tsx b/src/renderer/features/lineage/LineageNodeCard.tsx
index 5040236eaf..9cba4c857f 100644
--- a/src/renderer/features/lineage/LineageNodeCard.tsx
+++ b/src/renderer/features/lineage/LineageNodeCard.tsx
@@ -118,7 +118,7 @@ export function LineageNodeCard(props: {
         width={w}
         height={h}
         rx={8}
-        fill="#ffffff"
+        fill="var(--panel)"
         stroke={props.core ? 'var(--accent)' : 'var(--node-branch)'}
         strokeWidth={strokeWidth}
         strokeDasharray={dashed ? '6 4' : undefined}
diff --git a/src/renderer/features/lineage/LineageNodeMeta.tsx b/src/renderer/features/lineage/LineageNodeMeta.tsx
index 42dbd09d65..b1de0f4954 100644
--- a/src/renderer/features/lineage/LineageNodeMeta.tsx
+++ b/src/renderer/features/lineage/LineageNodeMeta.tsx
@@ -33,7 +33,7 @@ const TAG_CHIP_STYLE = {
   lineHeight: '16px',
   borderRadius: 3,
   color: 'var(--danger)',
-  background: 'rgba(179, 64, 58, 0.08)',
+  background: 'var(--danger-a08)',
   whiteSpace: 'nowrap'
 } as const
 
@@ -43,7 +43,7 @@ const TAG_BOX_STYLE = {
   height: 18,
   display: 'flex',
   alignItems: 'center',
-  border: '1px solid #dfa84a',
+  border: '1px solid var(--node-meta-border)',
   borderRadius: 4,
   overflowX: 'auto',
   overflowY: 'hidden',
diff --git a/src/renderer/features/lineage/LineageSideAiNotes.tsx b/src/renderer/features/lineage/LineageSideAiNotes.tsx
index 53fa4a7fd7..5deb72221b 100644
--- a/src/renderer/features/lineage/LineageSideAiNotes.tsx
+++ b/src/renderer/features/lineage/LineageSideAiNotes.tsx
@@ -31,8 +31,8 @@ type Phase = 'loading' | 'ready' | 'error'
  */
 /** 条目卡（白底淡描边） */
 const NOTE_CARD = {
-  background: '#ffffff',
-  borderColor: 'rgba(151, 160, 187, 0.28)'
+  background: 'var(--panel)',
+  borderColor: 'var(--note-border)'
 } as const
 
 export function LineageSideAiNotes(props: {
diff --git a/src/renderer/features/lineage/LineageSideManualNote.tsx b/src/renderer/features/lineage/LineageSideManualNote.tsx
index d743e0afd5..cd766cdce3 100644
--- a/src/renderer/features/lineage/LineageSideManualNote.tsx
+++ b/src/renderer/features/lineage/LineageSideManualNote.tsx
@@ -21,8 +21,8 @@ type Phase = 'loading' | 'ready' | 'error'
  * token；testid/文案零改。
  */
 const NOTE_CARD = {
-  background: '#ffffff',
-  borderColor: 'rgba(151, 160, 187, 0.28)'
+  background: 'var(--panel)',
+  borderColor: 'var(--note-border)'
 } as const
 
 export function LineageSideManualNote(props: { paperId: string }): JSX.Element {
diff --git a/src/renderer/features/lineage/LineageSidePanel.tsx b/src/renderer/features/lineage/LineageSidePanel.tsx
index e140f0d4ba..ba6595f67c 100644
--- a/src/renderer/features/lineage/LineageSidePanel.tsx
+++ b/src/renderer/features/lineage/LineageSidePanel.tsx
@@ -98,9 +98,9 @@ import { LineageSideTags } from './LineageSideTags'
  * 卡见两子件。testid/文案/QUESTION_COLOR 左缘条零改（纯 style 层）。
  */
 const SIDE_GLASS: CSSProperties = {
-  background: 'rgba(255, 255, 255, 0.92)',
+  background: 'var(--panel-a92)',
   backdropFilter: 'blur(12px)',
-  border: '1px solid #e4ded1',
+  border: '1px solid var(--border)',
   borderRadius: 12,
   boxShadow: 'var(--shadow-2)'
 }
diff --git a/src/renderer/features/lineage/LineageSideTags.tsx b/src/renderer/features/lineage/LineageSideTags.tsx
index 14053aca23..92c9a1a7bf 100644
--- a/src/renderer/features/lineage/LineageSideTags.tsx
+++ b/src/renderer/features/lineage/LineageSideTags.tsx
@@ -19,8 +19,8 @@ const SIDE_TAG_CHIP: CSSProperties = {
   borderRadius: 3,
   fontSize: 'var(--fs-caption)',
   color: 'var(--danger)',
-  background: 'rgba(179, 64, 58, 0.08)',
-  border: '1px solid rgba(179, 64, 58, 0.25)'
+  background: 'var(--danger-a08)',
+  border: '1px solid var(--danger-a25)'
 }
 
 export function LineageSideTags(props: {
diff --git a/src/renderer/features/reader/AnnotationEditor.tsx b/src/renderer/features/reader/AnnotationEditor.tsx
index 6d785013ce..8f275a691c 100644
--- a/src/renderer/features/reader/AnnotationEditor.tsx
+++ b/src/renderer/features/reader/AnnotationEditor.tsx
@@ -45,7 +45,7 @@ export function AnnotationEditor(props: {
         top: `calc(${(rect.y + rect.h) * 100}% + 6px)`,
         background: 'var(--panel)',
         borderColor: 'var(--border)',
-        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.18)'
+        boxShadow: 'var(--shadow-pop-md)'
       }}
     >
       <p className="line-clamp-2" style={{ color: 'var(--text-dim)' }}>
@@ -119,7 +119,7 @@ export function AnnotationEditor(props: {
         <button
           type="button"
           className={btn}
-          style={{ background: 'var(--accent)', color: '#ffffff', borderColor: 'var(--accent)' }}
+          style={{ background: 'var(--accent)', color: 'var(--panel)', borderColor: 'var(--accent)' }}
           disabled={busy}
           onClick={() => onSave(comment)}
         >
diff --git a/src/renderer/features/reader/PageBox.tsx b/src/renderer/features/reader/PageBox.tsx
index 0ad3471301..e5325f24a7 100644
--- a/src/renderer/features/reader/PageBox.tsx
+++ b/src/renderer/features/reader/PageBox.tsx
@@ -46,14 +46,14 @@ export function PageBox(props: {
       data-page-box={no}
       className="relative shrink-0"
       // [F-06] 页盒 panel 底+柔和阴影（缺陷 B）；渲染/占位同底消色差跳动
-      style={{ width: boxWidth, height: pageBoxHeight(size, zoom), background: 'var(--panel)', boxShadow: '0 1px 4px rgba(0,0,0,.12)' }}
+      style={{ width: boxWidth, height: pageBoxHeight(size, zoom), background: 'var(--panel)', boxShadow: 'var(--shadow-page)' }}
     >
       {rendered ? (
         <div data-page-root={no} className="absolute inset-0 flex justify-center">
           {/* [F-A5 c/ADR-0019 R2] 白纸承底层（canvas 透明底的承白面——暗色主题
               下页纸仍白，PDF 纸面语义）+isolation（层序比较域封闭单页内，跨页
               互扰不可能——页内层序见 page-layer-z 单源） */}
-          <div className="relative h-fit" style={{ background: '#ffffff', isolation: 'isolate' }}>
+          <div className="relative h-fit" style={{ background: 'var(--panel)', isolation: 'isolate' }}>
             <PdfPageCanvas doc={doc!} pageNo={no} zoom={zoom} onPageRender={props.onPageRender} onError={props.onError} />
             {props.renderPage(no)}
           </div>
diff --git a/src/renderer/features/reader/PdfPageCanvas.tsx b/src/renderer/features/reader/PdfPageCanvas.tsx
index 18ff48f7f6..56d9d66f9e 100644
--- a/src/renderer/features/reader/PdfPageCanvas.tsx
+++ b/src/renderer/features/reader/PdfPageCanvas.tsx
@@ -136,7 +136,7 @@ export function PdfPageCanvas(props: {
         canvasContext: ctx,
         viewport,
         transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
-        background: 'rgba(255,255,255,0)'
+        background: 'transparent'
       })
       renderTaskRef.current = task
       await task.promise
diff --git a/src/renderer/features/reader/SelectionToolbar.tsx b/src/renderer/features/reader/SelectionToolbar.tsx
index 6777ce4bef..de031b89fe 100644
--- a/src/renderer/features/reader/SelectionToolbar.tsx
+++ b/src/renderer/features/reader/SelectionToolbar.tsx
@@ -40,7 +40,7 @@ export function SelectionToolbar(props: {
         top: y,
         background: 'var(--panel)',
         borderColor: 'var(--border)',
-        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
+        boxShadow: 'var(--shadow-pop-sm)'
       }}
       // 阻止 mousedown 抢焦点/坍缩选区：按钮 click 才是动作语义
       onMouseDown={(e) => e.preventDefault()}
diff --git a/src/renderer/features/reader/selection-paint.tsx b/src/renderer/features/reader/selection-paint.tsx
index 632b28d2b8..42c151b500 100644
--- a/src/renderer/features/reader/selection-paint.tsx
+++ b/src/renderer/features/reader/selection-paint.tsx
@@ -35,7 +35,7 @@ import { bandVertical, clampedHorizontal } from './annotation-style'
 import { PAGE_LAYER_Z } from './page-layer-z'
 
 /** 自绘并集层灰（F-A4：观感同修前 ::selection rgba(0 0 0 / 0.20)） */
-const PAINT_BG = 'rgba(0, 0, 0, 0.20)'
+const PAINT_BG = 'var(--reader-selection-paint)'
 
 /** [F-A6-c] React.memo+props 稳定化（设计书 §3.3 次因面收敛）：root/rects/bands
  *  均来自 SelectionLayer 的 paint 状态对象——仅在 setPaint 时更换引用，组件
diff --git a/src/renderer/features/reader/text-layer.css b/src/renderer/features/reader/text-layer.css
index c9ca7dbc91..fded0295a9 100644
--- a/src/renderer/features/reader/text-layer.css
+++ b/src/renderer/features/reader/text-layer.css
@@ -13,20 +13,20 @@
  * - [SR2-F-06] ::selection 偏离官方：半透明→不透明近似色（官方重叠 span
  *   叠绘加重缺陷，验收 §2C）。真机实证 Chromium 对 ::selection 不解析
  *   color-mix 行，computed/生效值取级联 fallback 行——故 fallback 行同步改
- *   不透明（官方 rgba(0 0 255 / 0.25) 压白底的合成等效色）。
+ *   不透明（官方蓝 25% 半透明压白底的合成等效色）。
  * - [SR2-F-07] ::selection 再改 transparent（F-06 不透明近似色只对纯白底成立，
  *   页底有黑字即遮字——文本层 span color:transparent，字形由 canvas 渲染在
  *   文本层之下，透字必须靠半透明背景；F-06 原始缺陷 C（重叠 span 逐层叠绘
  *   加重）由划选视觉反馈整体移交 SelectionLayer 自绘选区块解决——单层单绘
  *   天然不叠深，原生高亮不再承担视觉反馈故置透明）。
  * - [SR2-F-08] 反转 F-06/F-07 处置，回退官方半透明（ADR-0019 划选视觉反馈
- *   原生路线）：根因=自绘层 30% accent 合成 rgb(191,207,220) 近乎不可见+
+ *   原生路线）：根因=自绘层 30% accent 合成浅灰蓝（191,207,220）近乎不可见+
  *   拖选期零反馈（视觉通道机制病，非性能/几何）；::selection 恢复官方
- *   rgba(0 0 255 / 0.25) 逐字值（pdfjs-dist web/pdf_viewer.css 678-685 行；
+ *   官方蓝 25% 逐字值（pdfjs-dist web/pdf_viewer.css 678-685 行；
  *   Chromium 不解析 ::selection 的 color-mix——官方第二行不抄）。自绘层
  *   SelectionRects 整体删除（P10 方案切换=删旧方案）。
  * - [SR2-F-09] 选中色蓝→灰（用户令 2026-08-29：仿 WPS——灰色选中/标注纯色）：
- *   rgba(0 0 255 / 0.25)→rgba(0 0 0 / 0.30)（白纸合成≈#B3B3B3，黑字可读）。
+ *   官方蓝 25%→灰 30%（白纸合成≈中灰（179,179,179），黑字可读）。
  *   偏离官方值的显式登记=ADR-0019 补记+INV-37 同步；标注纯色面零改
  *   （AnnotationLayer 纯色板+容器级单次 multiply 已达标——v5 核查像素实证
  *   行界带无叠乘，scripts/audits f1-forensics5 在档）。原生渲染语义不变
@@ -34,10 +34,10 @@
  * - [R2-F-10] 选中叠标注加深减档：alpha 0.30→0.20（用户令 2026-08-29 图二
  *   「灰选中与黄标注重叠处加深难看」）。机制=灰选中(textLayer z:0)在标注
  *   multiply 层(z:5)之下——黄×灰逐通道相乘成暗橄榄；alpha 降至 0.20 后白底
- *   合成 #CCCCCC（仍清晰可辨，F-08「选中不可见」红线不回退），叠黄合成
- *   rgb(202,179,57) 较 0.30 的 rgb(177,157,50) 提亮一档。ADR-0019 补记同步。
+ *   合成浅灰（204,204,204）（仍清晰可辨，F-08「选中不可见」红线不回退），叠黄合成
+ *   暗金绿（202,179,57）较 0.30 的（177,157,50）提亮一档。ADR-0019 补记同步。
  * - [F-A4] ::selection 再改 transparent（ADR-0019 R1 修订——票面 §0a 用户
- *   根治令）：官方 pdf.js 已知缺陷（issue #17561 同族）——文本层逐 span 绘制，
+ *   根治令）：官方 pdf.js 已知缺陷（issue 17561 同族）——文本层逐 span 绘制，
  *   pdf.js span 行盒=CSS 回退字体度量，相邻行垂直重叠处 0.20×2≈0.36 逐层
  *   叠深；CSS 层无解，唯一根治=自绘并集层（SelectionLayer→selection-paint，
  *   归并产物单层单绘，用色即本灰 0.20——R2-F-10 观感随迁）。SR2-F-08 当年
diff --git a/src/renderer/features/workspaces/workspace.css b/src/renderer/features/workspaces/workspace.css
index cb9d97d684..7419dfc58c 100644
--- a/src/renderer/features/workspaces/workspace.css
+++ b/src/renderer/features/workspaces/workspace.css
@@ -2,11 +2,11 @@
    全住类规则，内联 style 只许留功能态（如错误色），否则 :hover/:active
    挂类被内联恒压=静默失效）══
    病灶史：R2-SH2 把切换器从墨青侧栏迁到白顶栏后，触发钮仍用夜面配色
-   （米白字 #efe9da + 5% 白底 + borderColor 无 border 宽度类=边框不渲染）
+   （米白字 + 5% 白底 + borderColor 无 border 宽度类=边框不渲染）
    ——白底贴米白字，用户实锤「几乎不可见」。本皮肤=亮面按钮语法：
    冷色调（accent 墨青蓝）实边框 + 冷调流光渐变 + 按压反馈。token 走
-   theme.css :root 单源（rgba(44,95,138,x)=--accent 透明度族，先例
-   rgba(201,168,106,x)=金族）。 */
+   theme.css :root 单源（--accent 透明度族=--accent-aNN 系，先例
+   金族）。 */
 
 /* 触发钮：冷蓝实边框+白→冷蓝白渐变流光（syn-pan-x 往返，6s 缓拍） */
 .ws-trigger {
@@ -14,9 +14,9 @@
   align-items: center;
   gap: 6px;
   padding: 4px 10px;
-  border: 1px solid rgba(44, 95, 138, 0.55);
+  border: 1px solid var(--accent-a55);
   border-radius: var(--radius-m);
-  background: linear-gradient(120deg, #ffffff 0%, var(--accent-soft) 45%, #ffffff 100%);
+  background: linear-gradient(120deg, var(--panel) 0%, var(--accent-soft) 45%, var(--panel) 100%);
   background-size: 220% 100%;
   animation: syn-pan-x 6s ease-in-out infinite;
   color: var(--text);
@@ -31,14 +31,14 @@
 }
 .ws-trigger:hover {
   border-color: var(--accent);
-  box-shadow: 0 0 0 3px rgba(44, 95, 138, 0.12), var(--shadow-2);
+  box-shadow: 0 0 0 3px var(--accent-a12), var(--shadow-2);
 }
 /* 按压反馈（游戏钮语义）：下沉+微缩+内阴影——「按下去了」的实体读感 */
 .ws-trigger:active {
   border-color: var(--accent);
   filter: brightness(0.96);
   transform: translateY(1px) scale(0.98);
-  box-shadow: inset 0 2px 4px rgba(27, 35, 51, 0.18);
+  box-shadow: inset 0 2px 4px var(--ink-a18);
 }
 .ws-trigger:focus-visible {
   outline: 2px solid var(--accent);
@@ -63,7 +63,7 @@
   gap: 4px;
   min-width: 200px;
   padding: 6px;
-  border: 1px solid rgba(44, 95, 138, 0.45);
+  border: 1px solid var(--accent-a45);
   border-radius: var(--radius-m);
   background: var(--panel);
   color: var(--text);
@@ -102,7 +102,7 @@
   color: var(--accent);
 }
 .ws-item:active {
-  background: rgba(44, 95, 138, 0.22);
+  background: var(--accent-a22);
   color: var(--accent);
   transform: scale(0.97);
 }
@@ -116,7 +116,7 @@
 /* 新建课题输入：冷蓝描边字段，focus 冷蓝描边加浓 */
 .ws-field {
   padding: 4px 8px;
-  border: 1px solid rgba(44, 95, 138, 0.45);
+  border: 1px solid var(--accent-a45);
   border-radius: var(--radius-s);
   background: var(--panel);
   color: var(--text);
@@ -125,7 +125,7 @@
 .ws-field:focus {
   outline: none;
   border-color: var(--accent);
-  box-shadow: 0 0 0 2px rgba(44, 95, 138, 0.15);
+  box-shadow: 0 0 0 2px var(--accent-a15);
 }
 
 /* 无障碍守卫（theme.css 同族）：系统「减少动态效果」时流光与入场动画关 */
diff --git a/src/renderer/shared/theme-buttons.css b/src/renderer/shared/theme-buttons.css
index d24c548ea0..93d8219a77 100644
--- a/src/renderer/shared/theme-buttons.css
+++ b/src/renderer/shared/theme-buttons.css
@@ -11,12 +11,12 @@
    R2-UI1 增量：primary 渐变底+hover 渐变流动（background-position 平移）；
    全族 :active=游戏钮按压反馈（色变+微缩+下沉，瞬态 80~120ms）。 */
 .syn-btn-primary {
-  background: linear-gradient(150deg, #3a76ab 0%, var(--accent) 48%, #234a6d 100%);
+  background: linear-gradient(150deg, var(--accent-hi) 0%, var(--accent) 48%, var(--accent-deep) 100%);
   background-size: 160% 160%;
   background-position: 0% 50%;
-  color: #ffffff;
-  border-color: #234a6d;
-  box-shadow: inset 0 0 0 1px rgba(201, 168, 106, 0.45), var(--shadow-1);
+  color: var(--panel);
+  border-color: var(--accent-deep);
+  box-shadow: inset 0 0 0 1px var(--border-gold-a45), var(--shadow-1);
   clip-path: polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px);
   transition:
     background-position var(--dur-flow) ease,
@@ -25,7 +25,7 @@
     filter var(--dur-tint) ease;
 }
 .syn-btn-primary:not(:disabled):hover {
-  box-shadow: inset 0 0 0 1px rgba(227, 201, 143, 0.7), var(--shadow-2);
+  box-shadow: inset 0 0 0 1px var(--gold-bright-a70), var(--shadow-2);
   /* 渐变流动：hover 期渐变端点平移到亮端（R2-UI1） */
   background-position: 100% 50%;
 }
@@ -34,8 +34,8 @@
   filter: brightness(0.88);
   transform: translateY(1px) scale(0.98);
   box-shadow:
-    inset 0 0 0 1px rgba(227, 201, 143, 0.7),
-    inset 0 2px 6px rgba(11, 26, 40, 0.45);
+    inset 0 0 0 1px var(--gold-bright-a70),
+    inset 0 2px 6px var(--btn-press-tint);
 }
 .syn-btn-secondary {
   background: var(--panel);
@@ -62,7 +62,7 @@
     transform var(--dur-press) ease;
 }
 .syn-btn-danger:not(:disabled):active {
-  background: rgba(179, 64, 58, 0.12);
+  background: var(--danger-a12);
   filter: brightness(0.96);
   transform: translateY(1px) scale(0.98);
 }
@@ -81,7 +81,7 @@
 }
 .syn-btn-ghost:not(:disabled):active {
   color: var(--gold);
-  background: rgba(207, 174, 114, 0.3);
+  background: var(--gold-press);
   transform: scale(0.96);
 }
 
diff --git a/src/renderer/shared/theme-lineage.css b/src/renderer/shared/theme-lineage.css
index b2e21c4bf0..654bab3a57 100644
--- a/src/renderer/shared/theme-lineage.css
+++ b/src/renderer/shared/theme-lineage.css
@@ -20,7 +20,7 @@
   gap: 14px;
   font-size: var(--fs-caption);
   color: var(--text-dim);
-  background: rgba(255, 255, 255, 0.88);
+  background: var(--panel-a88);
   border: 1px solid var(--border);
   border-radius: var(--radius-m);
   padding: 4px 12px;
@@ -60,7 +60,7 @@
   gap: 6px;
   padding: 6px 10px;
   border-radius: 12px;
-  background: rgba(255, 255, 255, 0.88);
+  background: var(--panel-a88);
   backdrop-filter: blur(10px);
   border: 1px solid var(--border);
   box-shadow: var(--shadow-2);
@@ -92,7 +92,7 @@
   z-index: var(--z-float);
   padding: 4px 12px;
   border-radius: 999px;
-  background: rgba(255, 255, 255, 0.88);
+  background: var(--panel-a88);
   backdrop-filter: blur(10px);
   border: 1px solid var(--border);
   color: var(--text-dim);
@@ -111,7 +111,7 @@
 }
 
 /* F-L1-C 边标签（变体 C 窄幅注释——2026-08-30 用户裁决案册定稿）：
-   foreignObject 内 HTML div 自然换行；10px 斜体灰阶 #6b7280 弱于节点
+   foreignObject 内 HTML div 自然换行；10px 斜体灰阶（--edge-label-text）弱于节点
    文字（图注层级）+白晕 text-shadow 四向 2px 截线（线从字后穿行被白晕
    截断）；max-height 3 行×10×1.3=39+overflow hidden（真实溢出内容
    承载滚动语义——非 line-clamp 省略）。悬停滚动交互态驻本类（B1 教训
@@ -125,12 +125,12 @@
   font-size: var(--fs-micro);
   line-height: 1.3;
   font-style: italic;
-  color: #6b7280;
+  color: var(--edge-label-text);
   text-align: center;
   overflow-wrap: break-word;
   max-height: 39px;
   overflow: hidden;
-  text-shadow: 2px 0 #ffffff, -2px 0 #ffffff, 0 2px #ffffff, 0 -2px #ffffff;
+  text-shadow: 2px 0 var(--panel), -2px 0 var(--panel), 0 2px var(--panel), 0 -2px var(--panel);
   pointer-events: auto;
 }
 /* 悬停滚动（用户保证②）：截断文字悬停可滚（scrollHeight 全文高度——
diff --git a/src/renderer/shared/theme-shell.css b/src/renderer/shared/theme-shell.css
index d0ae1ed566..85e560f9f7 100644
--- a/src/renderer/shared/theme-shell.css
+++ b/src/renderer/shared/theme-shell.css
@@ -67,7 +67,7 @@
 }
 
 /* ══ R2-SH3 frameless caption 三键（bilibili 式）：贯通顶栏高的方形热区，
-   hover 浸染；close hover=系统红 #e81123。皮肤住类（B1 教训：禁内联 style
+   hover 浸染；close hover=系统红（--close-red）。皮肤住类（B1 教训：禁内联 style
    承载交互态）；.titlebar-btn svg 覆写上方 .app-header svg 的 22px 默认
    （同特异性源顺序在后胜）══ */
 .titlebar-controls {
@@ -107,23 +107,23 @@
   stroke-width: 1;
 }
 .titlebar-btn:hover {
-  background: rgba(44, 95, 138, 0.1);
+  background: var(--accent-a10);
   color: var(--text);
 }
 .titlebar-btn:active {
-  background: rgba(44, 95, 138, 0.2);
+  background: var(--accent-a20);
   color: var(--accent);
 }
 /* close 红依赖与 .titlebar-btn:hover/:active 同特异性 (0,2,0) 下源顺序在
    后胜——勿在本块之后追加 .titlebar-btn:hover 变体，否则压掉 close 红
    （门一 C6） */
 .titlebar-btn-close:hover {
-  background: #e81123;
-  color: #ffffff;
+  background: var(--close-red);
+  color: var(--panel);
 }
 .titlebar-btn-close:active {
-  background: #f1707a;
-  color: #ffffff;
+  background: var(--close-red-press);
+  color: var(--panel);
 }
 
 /* ══ App 壳侧栏（墨青 + 金——shell-library.html nav 段誊录，App.tsx 消费；
@@ -135,8 +135,8 @@
   flex-direction: column;
   padding: 14px 10px;
   position: relative;
-  color: #cfd5e4;
-  background: linear-gradient(180deg, var(--ink), #171e2f);
+  color: var(--nav-text);
+  background: linear-gradient(180deg, var(--ink), var(--ink-deep));
 }
 /* 右缘金渐隐线（mockup nav::after 语法逐值誊录；R2-UI1 加 220% 纵向渐变
    缓移——金线沿侧栏缘缓慢流淌，UI「活」感的常驻层（reduced-motion 关） */
@@ -147,7 +147,7 @@
   right: 0;
   bottom: 0;
   width: 1px;
-  background: linear-gradient(180deg, transparent, rgba(201, 168, 106, 0.5), transparent);
+  background: linear-gradient(180deg, transparent, var(--border-gold-a50), transparent);
   background-size: 100% 220%;
   animation: syn-pan-y 5s linear infinite;
 }
@@ -162,7 +162,7 @@
   border-radius: var(--radius-m);
   font-family: inherit;
   font-size: var(--fs-strong);
-  color: #aeb6ca;
+  color: var(--nav-item-text);
   text-align: left;
   cursor: pointer;
   position: relative;
@@ -177,20 +177,20 @@
   stroke-width: 1.6;
 }
 .app-nav-item:hover {
-  color: #e6eaf4;
-  background: rgba(255, 255, 255, 0.06);
+  color: var(--nav-item-text-hover);
+  background: var(--panel-a06);
 }
 /* 按压反馈（R2-UI1 游戏钮语义）：冷蓝闪现+微缩——瞬态色变+形变双通道 */
 .app-nav-item:active {
-  color: #eaf1fa;
-  background: rgba(44, 95, 138, 0.35);
+  color: var(--nav-item-text-press);
+  background: var(--accent-a35);
   transform: scale(0.97);
 }
 /* active 态：金左缘条 + ink-hi 底 + inset 金 hairline（mockup .nav-item.active） */
 .app-nav-item-active {
-  color: #f3eddd;
+  color: var(--nav-item-text-current);
   background: var(--ink-hi);
-  box-shadow: inset 0 0 0 1px rgba(201, 168, 106, 0.28);
+  box-shadow: inset 0 0 0 1px var(--border-gold-a28);
 }
 .app-nav-item-active::before {
   content: '';
@@ -208,7 +208,7 @@
 .app-nav-foot {
   margin-top: auto;
   padding: 10px 8px 2px;
-  border-top: 1px solid rgba(255, 255, 255, 0.07);
+  border-top: 1px solid var(--panel-a07);
   display: flex;
   align-items: center;
   gap: 8px;
@@ -216,14 +216,14 @@
 .app-nav-ver {
   font-size: var(--fs-micro);
   letter-spacing: 1px;
-  color: #8d95ad;
-  border: 1px solid rgba(141, 149, 173, 0.4);
+  color: var(--nav-ver-text);
+  border: 1px solid var(--nav-ver-border);
   border-radius: 4px;
   padding: 1px 6px;
 }
 .app-nav-txt {
   font-size: var(--fs-micro);
-  color: #6d7590;
+  color: var(--nav-foot-text);
 }
 
 /* ══ R2-UI1 无障碍守卫：系统「减少动态效果」时常驻渐变动画全关
diff --git a/src/renderer/shared/theme.css b/src/renderer/shared/theme.css
index 2920cb71b7..c5e95fff07 100644
--- a/src/renderer/shared/theme.css
+++ b/src/renderer/shared/theme.css
@@ -13,10 +13,10 @@
    token 终值单一来源 = docs/design/mockups/shell-library.html（亮面 :root）+
    lineage-constellation.html（夜面 :root，R2 消费预留）——逐值誊录，
    防漂移锁 = tests/unit/renderer/theme.test.ts（值漂移即红）。
-   值冲突裁决（票面 P1）：--gold 亮面值占用（夜面 #cfae72 别名 --gold-night
+   值冲突裁决（票面 P1）：--gold 亮面值占用（夜面值别名 --gold-night
    已随 R2-SH2 决5 别名退役删除——LG10 结案：全仓消费=0，死代码即删）；
    --gold-soft 取夜面稿值；annotation 五色保持原值——e2e reader-text.spec 三处
-   rgb(253,224,71) 精确断言锁死（预知必红则不制造红，预裁②口径）。 */
+   黄色精确断言锁死（预知必红则不制造红，预裁②口径）。 */
 :root {
   /* ── 亮面：暖纸白 + 墨青 + 金铜（学术优雅系）── */
   --bg: #f6f4ee;
@@ -87,6 +87,72 @@
   --annotation-blue: #93c5fd;
   --annotation-red: #fca5a5;
   --annotation-purple: #d8b4fe;
+  /* ── F-CSS-03 颜色 token（2026-09-09 用户双裁决零视觉差迁移：值原样入库,
+     同值合并共享单 token;白→--panel/暖灰描边→--border 直接消费既有 token
+     不立第二源;命名规约=基色 alpha 族 <基token>-a<两位alpha>（如 --accent-a45）
+     +单用途取主导用途名+影子复合值沿 --shadow-* 词汇;50 值命名表=
+     scripts/audits/f-css03-impl.report.md 附录;消费负锚=check-quality C-4
+     [CSS 行级,--name: 定义行豁免]+eslint B-5 [tsx inline style];值防漂移=
+     theme.test.ts TOKENS 正锚）── */
+  /* accent 透明度族（基色=--accent）*/
+  --accent-a10: rgba(44, 95, 138, 0.1);
+  --accent-a12: rgba(44, 95, 138, 0.12);
+  --accent-a15: rgba(44, 95, 138, 0.15);
+  --accent-a20: rgba(44, 95, 138, 0.2);
+  --accent-a22: rgba(44, 95, 138, 0.22);
+  --accent-a35: rgba(44, 95, 138, 0.35);
+  --accent-a45: rgba(44, 95, 138, 0.45);
+  --accent-a55: rgba(44, 95, 138, 0.55);
+  /* 金族透明度（基色=--border-gold/--gold-bright;第三基色挂
+     --gold-soft 系语义名）*/
+  --border-gold-a15: rgba(201, 168, 106, 0.15);
+  --border-gold-a28: rgba(201, 168, 106, 0.28);
+  --border-gold-a45: rgba(201, 168, 106, 0.45);
+  --border-gold-a50: rgba(201, 168, 106, 0.5);
+  --gold-bright-a70: rgba(227, 201, 143, 0.7);
+  --gold-press: rgba(207, 174, 114, 0.3);
+  /* danger 透明度族（基色=--danger）*/
+  --danger-a08: rgba(179, 64, 58, 0.08);
+  --danger-a12: rgba(179, 64, 58, 0.12);
+  --danger-a25: rgba(179, 64, 58, 0.25);
+  /* 白透明度族（基色=--panel;--panel-glass 0.72 为既存语义名）*/
+  --panel-a06: rgba(255, 255, 255, 0.06);
+  --panel-a07: rgba(255, 255, 255, 0.07);
+  --panel-a35: rgba(255, 255, 255, 0.35);
+  --panel-a88: rgba(255, 255, 255, 0.88);
+  --panel-a90: rgba(255, 255, 255, 0.9);
+  --panel-a92: rgba(255, 255, 255, 0.92);
+  /* caption 三键（Windows 系统红）*/
+  --close-red: #e81123;
+  --close-red-press: #f1707a;
+  /* 侧栏 nav 墨青域（文本阶梯+结构色）*/
+  --nav-text: #cfd5e4;
+  --nav-item-text: #aeb6ca;
+  --nav-item-text-hover: #e6eaf4;
+  --nav-item-text-press: #eaf1fa;
+  --nav-item-text-current: #f3eddd;
+  --nav-ver-text: #8d95ad;
+  --nav-ver-border: rgba(141, 149, 173, 0.4);
+  --nav-foot-text: #6d7590;
+  --ink-deep: #171e2f;
+  --ink-a18: rgba(27, 35, 51, 0.18);
+  /* syn-btn primary 渐变端点+按压内影色 */
+  --accent-hi: #3a76ab;
+  --accent-deep: #234a6d;
+  --btn-press-tint: rgba(11, 26, 40, 0.45);
+  /* 文献库卡片纸渐变端点 */
+  --lib-paper-hi: #fffdf9;
+  --lib-paper-lo: #fdfaf3;
+  /* 脉络域（边标签/推断边/节点 meta 描边/note 卡描边）*/
+  --edge-label-text: #6b7280;
+  --edge-inferred: #8a94a6;
+  --node-meta-border: #dfa84a;
+  --note-border: rgba(151, 160, 187, 0.28);
+  /* 阅读器（划选自绘层灰+页盒/弹层影——影复合值沿 --shadow-* 词汇）*/
+  --reader-selection-paint: rgba(0, 0, 0, 0.2);
+  --shadow-page: 0 1px 4px rgba(0, 0, 0, 0.12);
+  --shadow-pop-sm: 0 2px 8px rgba(0, 0, 0, 0.15);
+  --shadow-pop-md: 0 2px 12px rgba(0, 0, 0, 0.18);
 }
 
 html,
@@ -102,7 +168,7 @@ body,
   color: var(--text);
   background: var(--bg);
   /* 纸面微纹理：极淡斜向丝纹（shell-library mockup 同款） */
-  background-image: repeating-linear-gradient(115deg, rgba(255, 255, 255, 0.35) 0 2px, transparent 2px 6px);
+  background-image: repeating-linear-gradient(115deg, var(--panel-a35) 0 2px, transparent 2px 6px);
 }
 
 /* [F-CSS-01] 分域拆件 2026-09-05：皮肤段按 ══ 分节拆出 theme-shell/-buttons/
diff --git a/src/renderer/shared/ui/SplitPane.tsx b/src/renderer/shared/ui/SplitPane.tsx
index 3e2735f307..0f45ba2a1b 100644
--- a/src/renderer/shared/ui/SplitPane.tsx
+++ b/src/renderer/shared/ui/SplitPane.tsx
@@ -172,7 +172,7 @@ export function SplitPane(props: {
       className="h-full w-1 shrink-0 cursor-col-resize"
       // R3-TH1：分隔线金化——侧栏右缘金渐隐线同款语法（端点保留 .15 可见度，
       // 全透明端点会削弱拖拽目标发现性）
-      style={{ background: 'linear-gradient(180deg, rgba(201,168,106,.15), rgba(201,168,106,.5), rgba(201,168,106,.15))' }}
+      style={{ background: 'linear-gradient(180deg, var(--border-gold-a15), var(--border-gold-a50), var(--border-gold-a15))' }}
       onPointerDown={onHandleDown}
       onKeyDown={onHandleKey}
       onDoubleClick={() => {
diff --git a/tests/unit/renderer/library-cards.test.tsx b/tests/unit/renderer/library-cards.test.tsx
index 6e00b0bc87..8bd6287dd0 100644
--- a/tests/unit/renderer/library-cards.test.tsx
+++ b/tests/unit/renderer/library-cards.test.tsx
@@ -206,7 +206,8 @@ describe('R3-LIB 菱形分隔线（筛选区与列表之间）', () => {
 describe('R3-LIB library.css 材质文本锁（卡片/网格/分隔——mockup 逐值）', () => {
   it('卡片渐变材质：168° 渐变+inset 顶高光+background-clip:padding-box（亚像素缝隙锁）', () => {
     expect(css, '.lib-card 渐变（mockup .card 逐值）').toMatch(/\.lib-card\s*\{[^}]*linear-gradient\(168deg/)
-    expect(css, 'inset 顶高光').toMatch(/\.lib-card\s*\{[^}]*inset 0 1px 0 rgba\(255, 255, 255, 0\.9\)/)
+    // [F-CSS-03] 断言载体随 token 化迁移（值面由 theme.test.ts TOKENS 正锚独立锁定）
+    expect(css, 'inset 顶高光').toMatch(/\.lib-card\s*\{[^}]*inset 0 1px 0 var\(--panel-a90\)/)
     expect(css, '背景裁到 padding-box（定稿注意事项②）').toMatch(
       /\.lib-card\s*\{[^}]*background-clip: padding-box/
     )
@@ -259,12 +260,12 @@ describe('R3-LIB 回炉一（门一 3B+3W）', () => {
     expect(css, '空态居中').toMatch(/\.lib-detail-empty\s*\{[^}]*align-items: center/)
   })
 
-  it('R5 选中卡材质：渐变不覆盖+金描边+inset 金 ring .45+shadow-2+角饰常显（两档于 hover）', () => {
+  it('R5 选中卡材质：渐变不覆盖+金描边+inset 金 ring a45+shadow-2+角饰常显（两档于 hover）', () => {
     // 渐变保留=.lib-card-selected 段不声明 background（继承 .lib-card 渐变），
     // 锁「不覆盖」形态：段内不得出现 background 覆盖声明
     const seg = css.match(/\.lib-card-selected\s*\{[^}]*\}/)?.[0] ?? ''
     expect(seg).toContain('border-color: var(--gold)')
-    expect(seg).toContain('inset 0 0 0 1px rgba(201, 168, 106, 0.45)')
+    expect(seg).toContain('inset 0 0 0 1px var(--border-gold-a45)')
     expect(seg).toContain('var(--shadow-2)')
     expect(seg, '选中段不得平色覆盖渐变（门一独立裁）').not.toMatch(/background: var\(--accent-soft\)/)
     expect(css, '角饰常显').toMatch(/\.lib-card-selected \.lib-corner\s*\{[^}]*var\(--gold\)/)
diff --git a/tests/unit/renderer/lineage-canvas-visual.test.tsx b/tests/unit/renderer/lineage-canvas-visual.test.tsx
index 6138d493b6..5e965f813f 100644
--- a/tests/unit/renderer/lineage-canvas-visual.test.tsx
+++ b/tests/unit/renderer/lineage-canvas-visual.test.tsx
@@ -97,7 +97,7 @@ describe('R2-LG11 浅色严谨板（浅色宿主/白卡边框编码/foreignObjec
     expect(core?.getAttribute('stroke-width')).toBe('2.25')
     expect(core?.getAttribute('stroke-dasharray')).toBeNull()
     expect(core?.getAttribute('data-selected')).toBe('true')
-    expect(core?.getAttribute('fill')).toBe('#ffffff')
+    expect(core?.getAttribute('fill')).toBe('var(--panel)')
     // 文献·普通：branch 1 实线（未选中）
     const plain = host?.querySelector('[data-node-id="R1"] rect')
     expect(plain?.getAttribute('stroke')).toBe('var(--node-branch)')
@@ -187,7 +187,7 @@ describe('R2-LG11 浅色严谨板（浅色宿主/白卡边框编码/foreignObjec
     expect(host?.textContent).toContain('2020 年')
   })
 
-  it('边三型色（§1.1.3 矩阵）：普通 branch 1.2 实线/推断 #8a94a6 虚线 5 4/综述关联 survey-edge 1.4 虚线 2 3（优先级>推断）', () => {
+  it('边三型色（§1.1.3 矩阵）：普通 branch 1.2 实线/推断 --edge-inferred 虚线 5 4/综述关联 survey-edge 1.4 虚线 2 3（优先级>推断）', () => {
     const nodes = [
       node('A', { year: 2020, title: '源头' }),
       node('B', { year: 2021, title: '承接' }),
@@ -197,7 +197,8 @@ describe('R2-LG11 浅色严谨板（浅色宿主/白卡边框编码/foreignObjec
     const solid: LineageEdge = { ...edge('B', 'C'), label: '实链·继承' }
     mount(<LineageCanvas nodes={nodes} edges={[inferred, solid]} />)
     const p1 = host?.querySelector('[data-edge-id="e-A-B"]')
-    expect(p1?.getAttribute('stroke')).toBe('#8a94a6')
+    // [F-CSS-03] 断言载体随 token 化迁移（值面由 theme.test.ts TOKENS 正锚独立锁定）
+    expect(p1?.getAttribute('stroke')).toBe('var(--edge-inferred)')
     expect(p1?.getAttribute('stroke-width')).toBe('1.2')
     expect(p1?.getAttribute('stroke-dasharray')).toBe('5 4')
     expect(p1?.getAttribute('filter')).toBeNull()
@@ -232,8 +233,8 @@ describe('R2-LG11 浅色严谨板（浅色宿主/白卡边框编码/foreignObjec
     expect(p?.getAttribute('stroke')).toBe('var(--survey-edge)')
     expect(p?.getAttribute('stroke-width')).toBe('1.4')
     expect(p?.getAttribute('stroke-dasharray')).toBe('2 3')
-    // 变异红证锚：优先级翻转（推断先判）会把该边染成 #8a94a6 虚线 5 4
-    expect(p?.getAttribute('stroke')).not.toBe('#8a94a6')
+    // 变异红证锚：优先级翻转（推断先判）会把该边染成 --edge-inferred 虚线 5 4
+    expect(p?.getAttribute('stroke')).not.toBe('var(--edge-inferred)')
   })
 
   it('图例四项真实文本（浅色白卡圆角非交互——data-legend+aria-hidden）', () => {
diff --git a/tests/unit/renderer/lineage-manual-edit.test.tsx b/tests/unit/renderer/lineage-manual-edit.test.tsx
index 62e5c20f6e..3e22e8d91a 100644
--- a/tests/unit/renderer/lineage-manual-edit.test.tsx
+++ b/tests/unit/renderer/lineage-manual-edit.test.tsx
@@ -185,7 +185,8 @@ describe('F-LG15 manual 边渲染（LineageEdges 三方可区分）', () => {
     mount(<LineageCanvas nodes={nodes} edges={[inferred]} />)
     const p = q('[data-edge-id="e-infer"]')
     expect(p?.getAttribute('stroke')).toBe('var(--manual-edge)')
-    expect(p?.getAttribute('stroke')).not.toBe('#8a94a6') // 变异红证锚：优先级翻转即染推断灰
+    // 变异红证锚：优先级翻转即染推断灰（[F-CSS-03] 载体随迁保活）
+    expect(p?.getAttribute('stroke')).not.toBe('var(--edge-inferred)')
   })
 
   it('manual 优先于综述启发（门一 W1）：端点为综述题名节点的 manual 边仍 manual 琥珀不被 surveyIds 吞色', () => {
diff --git a/tests/unit/renderer/lineage-side-panel.test.tsx b/tests/unit/renderer/lineage-side-panel.test.tsx
index 22e4fc5cb6..81e2e69733 100644
--- a/tests/unit/renderer/lineage-side-panel.test.tsx
+++ b/tests/unit/renderer/lineage-side-panel.test.tsx
@@ -308,7 +308,7 @@ it('主题节点：仅前两区+空态文案；笔记通道零调用', async ()
   expect(stubApi.notes.get).not.toHaveBeenCalled()
 })
 
-it('R2-LG11 侧板浅色化：白玻璃底 rgba(255,255,255,0.92)+边 #e4ded1+blur12；h4 accent 左缘条；条目卡白底淡描边（防回退）', async () => {
+it('R2-LG11 侧板浅色化：白玻璃底 --panel-a92+边 --border+blur12；h4 accent 左缘条；条目卡白底淡描边（防回退）', async () => {
   stubApi.ai_sensor.listByPaper.mockResolvedValue({ ok: true, data: [aiNote('a1', { question: 'Q1' })] })
   stubApi.notes.get.mockResolvedValue({ ok: true, data: null })
   mount(<LineageSidePanel node={node('A', { coreIdea: '核心思想甲' })} onJumpToPaper={JUMP} />)
@@ -316,9 +316,11 @@ it('R2-LG11 侧板浅色化：白玻璃底 rgba(255,255,255,0.92)+边 #e4ded1+bl
   // 面板白玻璃底（R2-LG11 浅色严谨板）。backdrop-filter 在 jsdom 不入 style
   // 属性序列化（实证：仅 DOM 属性可读）——经 style.backdropFilter 属性断言
   const rootEl = q('[data-testid="lineage-side-panel"]') as HTMLElement
-  expect(rootEl.getAttribute('style')).toContain('rgba(255, 255, 255, 0.92)')
-  // 边 #e4ded1——border shorthand 经 CSSOM 归一为 rgb() 等价值（jsdom 实证）
-  expect(rootEl.getAttribute('style')).toContain('rgb(228, 222, 209)')
+  // [F-CSS-03] 断言载体随 token 化迁移（值面由 theme.test.ts TOKENS 正锚独立锁定；
+  // var() 载体在 jsdom style 序列化原样保留，无 CSSOM rgb 归一）
+  expect(rootEl.getAttribute('style')).toContain('var(--panel-a92)')
+  // 边 --border（原 #e4ded1——值面由 theme.test.ts 既有 token 正锚锁定）
+  expect(rootEl.getAttribute('style')).toContain('var(--border)')
   expect(rootEl.style.backdropFilter).toBe('blur(12px)')
   // 分组 h4 accent 左缘条（核心 idea/AI 笔记/人工笔记三处齐改——去金夜色）
   const h4s = Array.from(host?.querySelectorAll('h4') ?? [])
@@ -326,11 +328,11 @@ it('R2-LG11 侧板浅色化：白玻璃底 rgba(255,255,255,0.92)+边 #e4ded1+bl
   for (const h of h4s) {
     expect(h.getAttribute('style')).toContain('var(--accent)')
   }
-  // AI 条目卡（白底+沿用淡描边 rgba(151,160,187,0.28)）——hex 经 CSSOM
-  // 归一为 rgb() 等价值（jsdom 实证，同上）
+  // AI 条目卡（白底 --panel+沿用淡描边 --note-border）——[F-CSS-03] 断言载体
+  // 随 token 化迁移（值面由 theme.test.ts TOKENS 正锚独立锁定）
   const card = q('[data-ai-note-id="a1"]')?.getAttribute('style') ?? ''
-  expect(card).toContain('rgb(255, 255, 255)')
-  expect(card).toContain('rgba(151, 160, 187, 0.28)')
+  expect(card).toContain('var(--panel)')
+  expect(card).toContain('var(--note-border)')
   // QUESTION_COLOR 左缘条零改锚（AI-08 分色单源不因换肤回退）
   expect(q('[data-question="Q1"] h5')?.getAttribute('style')).toContain(QUESTION_COLOR.Q1)
 })
diff --git a/tests/unit/renderer/pdf-page-canvas.test.tsx b/tests/unit/renderer/pdf-page-canvas.test.tsx
index 528a050e48..82b1be7aec 100644
--- a/tests/unit/renderer/pdf-page-canvas.test.tsx
+++ b/tests/unit/renderer/pdf-page-canvas.test.tsx
@@ -4,8 +4,9 @@
  * [locked-change] 授权面——主控已 unlock）。
  *
  * 锁三断言（票面 §0c「canvas 透明底+色块垫底」的实现面）：
- * - pdf.js render 以 background 'rgba(255,255,255,0)' 调用（透明底——墨带
- *   之外透出下层色块=背景板语义；pdfjs 默认 #ffffff 填充会把色块全遮死）；
+ * - pdf.js render 以 background 'transparent' 调用（透明底——墨带
+ *   之外透出下层色块=背景板语义；pdfjs 默认白填充会把色块全遮死；
+ *   [F-CSS-03] 原字面 rgba(255,255,255,0) 等价改写为 CSS 关键字）；
  * - canvas 内联 z=PAGE_LAYER_Z.canvas 且 pointer-events:none（墨在色块上，
  *   事件穿透明纸落在标注 rect/文本层——点击与划选手势零回归）；
  * - PageBox 页内容容器（h-fit）白纸承底层+isolation（层序比较域单页内封闭，
@@ -74,14 +75,15 @@ afterEach(() => {
 })
 
 describe('F-A5 c 面 —— 透明底 canvas+层序样式', () => {
-  it('render 以透明背景调用（background rgba(255,255,255,0)——墨外透出下层色块）', async () => {
+  it('render 以透明背景调用（background transparent——墨外透出下层色块）', async () => {
     await act(async () => {
       root!.render(
         <PdfPageCanvas doc={fakeDoc()} pageNo={1} zoom={1} onPageRender={() => undefined} onError={() => undefined} />
       )
     })
     expect(renderCalls.length).toBe(1)
-    expect(renderCalls[0]!.background).toBe('rgba(255,255,255,0)')
+    // [F-CSS-03] rgba(255,255,255,0) 等价改写 CSS 关键字（alpha 0 渲染零差）
+    expect(renderCalls[0]!.background).toBe('transparent')
   })
 
   it('canvas 内联 z=层级常量+pointer-events none（事件穿透——标注 rect/文本层手势零回归）', async () => {
@@ -122,8 +124,9 @@ describe('F-A5 c 面 —— 透明底 canvas+层序样式', () => {
     const pageRoot = host!.querySelector<HTMLElement>('[data-page-root="1"]')
     expect(pageRoot).not.toBeNull()
     const sheet = pageRoot!.firstElementChild as HTMLElement
-    // jsdom 内联色归一化为 rgb 形
-    expect(sheet.style.background).toBe('rgb(255, 255, 255)')
+    // [F-CSS-03] 断言载体随 token 化迁移：白纸承底层消费 --panel（值面由
+    // theme.test.ts 既有 token 正锚锁定）；var() 载体 jsdom 原样保留无归一
+    expect(sheet.style.background).toBe('var(--panel)')
     expect(sheet.style.isolation).toBe('isolate')
   })
 })
diff --git a/tests/unit/renderer/selection-paint.test.tsx b/tests/unit/renderer/selection-paint.test.tsx
index 95c8d3273b..849757c553 100644
--- a/tests/unit/renderer/selection-paint.test.tsx
+++ b/tests/unit/renderer/selection-paint.test.tsx
@@ -134,7 +134,7 @@ afterEach(() => {
 })
 
 describe('F-A4 a 面 —— 自绘并集层（单层单绘不叠深）', () => {
-  it('S1 拖选防抖路径渲染自绘层：跨 3 行重叠输入（行间 4px 垂直重叠）→块数=行数+两两垂直分离+色 rgba(0,0,0,0.2)', async () => {
+  it('S1 拖选防抖路径渲染自绘层：跨 3 行重叠输入（行间 4px 垂直重叠）→块数=行数+两两垂直分离+色 token 载体（--reader-selection-paint）', async () => {
     const { page, span } = makePage('1', { x: 100, y: 200, width: 600, height: 800 }, 'alpha beta gamma delta')
     document.body.appendChild(page)
     await mountLayer(page)
@@ -154,7 +154,8 @@ describe('F-A4 a 面 —— 自绘并集层（单层单绘不叠深）', () => {
     const blocks = paintBlocks()
     expect(blocks.length).toBe(3)
     for (const b of blocks) {
-      expect(b.style.background).toBe('rgba(0, 0, 0, 0.2)')
+      // [F-CSS-03] 断言载体随 token 化迁移（值面由 theme.test.ts TOKENS 正锚独立锁定）
+      expect(b.style.background).toBe('var(--reader-selection-paint)')
     }
     // 归并后行间钳制：按 top 排序两两 bottom ≤ next.top+1e-9（输入重叠被
     // 消除——「重叠部分渲染不加深」的构造性保证）
diff --git a/tests/unit/renderer/theme.test.ts b/tests/unit/renderer/theme.test.ts
index 883f1bcaf7..6202d82c01 100644
--- a/tests/unit/renderer/theme.test.ts
+++ b/tests/unit/renderer/theme.test.ts
@@ -111,7 +111,60 @@ const TOKENS: Array<[string, string]> = [
   ['--fs-body', '12px'],
   ['--fs-strong', '13px'],
   ['--fs-title', '14px'],
-  ['--fs-display', '17px']
+  ['--fs-display', '17px'],
+  // ── F-CSS-03 颜色 token 化（2026-09-09 用户双裁决：零视觉差口径[值原样
+  //    入库,同值合并共享]+语义命名优先[一值一 token,名取主导用途,多用途
+  //    中性名]——50 值=48 新 token+2 既有 token 消费[#ffffff→--panel/
+  //    #e4ded1→--border,不立第二源]；命名表=scripts/audits/f-css03-impl.
+  //    report.md 附录；消费负锚=check-quality C-4+eslint B-5）──
+  ['--accent-a10', 'rgba(44, 95, 138, 0.1)'],
+  ['--accent-a12', 'rgba(44, 95, 138, 0.12)'],
+  ['--accent-a15', 'rgba(44, 95, 138, 0.15)'],
+  ['--accent-a20', 'rgba(44, 95, 138, 0.2)'],
+  ['--accent-a22', 'rgba(44, 95, 138, 0.22)'],
+  ['--accent-a35', 'rgba(44, 95, 138, 0.35)'],
+  ['--accent-a45', 'rgba(44, 95, 138, 0.45)'],
+  ['--accent-a55', 'rgba(44, 95, 138, 0.55)'],
+  ['--border-gold-a15', 'rgba(201, 168, 106, 0.15)'],
+  ['--border-gold-a28', 'rgba(201, 168, 106, 0.28)'],
+  ['--border-gold-a45', 'rgba(201, 168, 106, 0.45)'],
+  ['--border-gold-a50', 'rgba(201, 168, 106, 0.5)'],
+  ['--gold-bright-a70', 'rgba(227, 201, 143, 0.7)'],
+  ['--gold-press', 'rgba(207, 174, 114, 0.3)'],
+  ['--danger-a08', 'rgba(179, 64, 58, 0.08)'],
+  ['--danger-a12', 'rgba(179, 64, 58, 0.12)'],
+  ['--danger-a25', 'rgba(179, 64, 58, 0.25)'],
+  ['--panel-a06', 'rgba(255, 255, 255, 0.06)'],
+  ['--panel-a07', 'rgba(255, 255, 255, 0.07)'],
+  ['--panel-a35', 'rgba(255, 255, 255, 0.35)'],
+  ['--panel-a88', 'rgba(255, 255, 255, 0.88)'],
+  ['--panel-a90', 'rgba(255, 255, 255, 0.9)'],
+  ['--panel-a92', 'rgba(255, 255, 255, 0.92)'],
+  ['--close-red', '#e81123'],
+  ['--close-red-press', '#f1707a'],
+  ['--nav-text', '#cfd5e4'],
+  ['--nav-item-text', '#aeb6ca'],
+  ['--nav-item-text-hover', '#e6eaf4'],
+  ['--nav-item-text-press', '#eaf1fa'],
+  ['--nav-item-text-current', '#f3eddd'],
+  ['--nav-ver-text', '#8d95ad'],
+  ['--nav-ver-border', 'rgba(141, 149, 173, 0.4)'],
+  ['--nav-foot-text', '#6d7590'],
+  ['--ink-deep', '#171e2f'],
+  ['--ink-a18', 'rgba(27, 35, 51, 0.18)'],
+  ['--accent-hi', '#3a76ab'],
+  ['--accent-deep', '#234a6d'],
+  ['--btn-press-tint', 'rgba(11, 26, 40, 0.45)'],
+  ['--lib-paper-hi', '#fffdf9'],
+  ['--lib-paper-lo', '#fdfaf3'],
+  ['--edge-label-text', '#6b7280'],
+  ['--edge-inferred', '#8a94a6'],
+  ['--node-meta-border', '#dfa84a'],
+  ['--note-border', 'rgba(151, 160, 187, 0.28)'],
+  ['--reader-selection-paint', 'rgba(0, 0, 0, 0.2)'],
+  ['--shadow-page', '0 1px 4px rgba(0, 0, 0, 0.12)'],
+  ['--shadow-pop-sm', '0 2px 8px rgba(0, 0, 0, 0.15)'],
+  ['--shadow-pop-md', '0 2px 12px rgba(0, 0, 0, 0.18)']
 ]
 
 describe('R3-TH1 theme token 冒烟（mockup :root 防漂移锁）', () => {
@@ -137,16 +190,18 @@ describe('R3-TH1 回炉 B1——Button 皮肤类防线（内联恒压类选择
    * 本组断言锁两层：皮肤类规则存在（值面）+Button.tsx 不再用内联变体
    * 皮肤（形态面——防回退到内联）。
    */
-  it('primary 静态皮肤在类规则中（CTA：inset 金 hairline .45 + 6px 切角）', () => {
+  it('primary 静态皮肤在类规则中（CTA：inset 金 hairline a45 + 6px 切角）', () => {
     expect(buttonsCss, '.syn-btn-primary 静态类应在场（theme-buttons.css）').toMatch(/\.syn-btn-primary\s*\{/)
-    expect(buttonsCss, 'inset 金 hairline .45（mockup CTA 静态值）').toMatch(
-      /\.syn-btn-primary\s*\{[^}]*rgba\(201, 168, 106, 0\.45\)/
+    // [F-CSS-03] 断言形态随 token 化迁移：rgba 字面量→var() 载体锚
+    // （值面由 TOKENS --border-gold-a45 正锚独立锁定，此处锁「皮肤住类」形态）
+    expect(buttonsCss, 'inset 金 hairline a45（mockup CTA 静态值——F-CSS-03 token 载体）').toMatch(
+      /\.syn-btn-primary\s*\{[^}]*var\(--border-gold-a45\)/
     )
     expect(buttonsCss, '6px 切角 clip-path（定稿注意事项①）').toMatch(/\.syn-btn-primary\s*\{[^}]*clip-path/)
   })
 
-  it('primary hover 提亮 .45→.7 在类规则中', () => {
-    expect(buttonsCss).toMatch(/\.syn-btn-primary:not\(:disabled\):hover\s*\{[^}]*rgba\(227, 201, 143, 0\.7\)/)
+  it('primary hover 提亮 a45→a70 在类规则中', () => {
+    expect(buttonsCss).toMatch(/\.syn-btn-primary:not\(:disabled\):hover\s*\{[^}]*var\(--gold-bright-a70\)/)
   })
 
   it('ghost hover 金铜在类规则中', () => {

═══ 材料五：实现者报告全文 ═══

# F-CSS-03 实现者报告——关卡面完成，test 分项 BLOCKED（8 处受锁断言红，[locked-change] 上报）

> 档位：GLM5.3flash（实现者位，主控派发指定统一档，如实记）。
> 真相源：docs/design/2026-09-09_f-lint01-design-final.md §0 CR3a+§1+§5；
> 蓝本=scripts/audits/f-lint01-impl.report.md §3 两段代码（已验证可红照落）。
> 结果一句话：主控裁决 1-6 全部落地（C-4/W3/B-5/INV-11 升格+两处源改），
> 红证四支+变异三支全取（各 raw 在档含 exit 真值），quality/lint/typecheck
> 存量全绿；**但 `npm run test` 全量 8 用例红**（7 处上轮迁移遗留受锁断言
> 断裂+1 处裁决 1 引入）——修复全部落在 tests/**（本票禁令红线+[locked-change]
> 域），实现者无权处置 → 按纪律停手上报，本报告=卡点清单+已完面弹药。

## 0. 开工记录（技能清点，AGENTS 会话开工纪律）

- `test-driven-development`——**用**：本票核心流程红→绿→变异红证。
- `verification-before-completion`——**用**：存量绿证四支+exit 真值回读。
- `systematic-debugging`——**不用**：票面无调试面（纯关卡落地+证据链；test
  红定位用 raw 归因非调试器面）。
- `subagent-driven-development`——**不用**：实现者子代理本体，无派发面。
- 其余技能（前端/浏览器/git workflow 等）——**不用**：无 UI 测试面（票面禁
  视觉/e2e）、无 git 写操作（禁 commit）、纯 CI 关卡+CSS/TSX 微改。
- 配置自查：GLM5.3flash 实现档=主控派发指定，一致。

## 1. 实现摘要

- **裁决 1**：PdfPageCanvas.tsx:139 `background: 'rgba(255,255,255,0)'` →
  `background: 'transparent'`（仅此一行，F-A5 注释「透明底渲染」意图不动）。
- **裁决 2**：theme.css:91 注释去字面量（`#ffffff→--panel/#e4ded1→--border`
  →「白→--panel/暖灰描边→--border」）。**延伸面（自裁，见 §7.2）**：dry-run
  实测另发现 token 段分组注释 5 行含字面量（97/106/107/114/118——
  `rgb(44,95,138)`/`rgb(201,168,106)`/`rgb(179,64,58)`/`#ffffff` 示例文字），
  与裁决 2 完全同族（纯注释、零行为面），同法清理（「基色 rgb(...)=--X」→
  「基色=--X」），C-4 存量绿的前置必要条件。
- **裁决 3+4**：check-quality.mjs 第 6 关卡段改造——W3 哨兵（matchAll
  `/FS_DECL = \//g` 计数 >1 处=歧义哨兵红，0 处自然落入既有 match null 支，
  恰 1 处照旧 `new RegExp(m[1],'gi')`）+C-4 同循环落码（行级豁免
  `/^\s*--[\w-]+\s*:/`+COLOR_RE 命中行=violations.push，消息格式=票面
  `${rel}:${行号}: CSS 颜色字面量消费（单源=--* token）：${行 trim 截 80}`）。
  循环结构按蓝本 §3：`if (!fsDeclRe) break` 改为 `if (fsDeclRe) {…}` 包 C-8、
  C-4 无条件行扫（提取失败时哨兵已红、C-4 仍工作——C-4 不依赖 FS_DECL 提取）。
- **裁决 5**：eslint.config.js tests 段前插 B-5 块（plugins.synapse
  no-inline-color，files 限 `src/renderer/**/*.tsx`，severity error，AST 面
  =JSXAttribute[name='style']→JSXExpressionContainer→ObjectExpression→
  Property.value=Literal 命中 COLOR_RE→report）——逐字照蓝本 §3；两文件
  头注互指+COLOR_RE 正则文本逐字一致（§8.6 纪律）。
- **裁决 6**：invariants.md:25 INV-11 两列升格（强制方式=机器锚定[字号+
  颜色面]+审查[数值面]；状态列=主控文案+字号面锚定史保留+人审残留三项——
  颜色项已移出，见 §7.6）。
- **裁决 7**：tsx 注释字面量不动（selection-paint.tsx 注释「色 rgba(0,0,0,0.20)」
  等保持原样——B-5 AST 面只咬 inline style Literal）。

## 2. 文件清单（本轮改动面）

| 文件 | 改动 | 行数 |
| --- | --- | --- |
| scripts/check-quality.mjs | 头注+第 6 段 C-4/W3（受锁件） | 215→235 |
| eslint.config.js | 头注+B-5 块（受锁件） | 192→235 |
| docs/invariants.md | INV-11 两列（受锁件） | 1 行替换 |
| src/renderer/features/reader/PdfPageCanvas.tsx | 裁决 1 一行 | 不变 |
| src/renderer/shared/theme.css | 裁决 2+延伸 5 行注释 | 200→199 |
| scripts/audits/f-css03-*.raw.txt | 证据 11 件+本报告 | ①桶证据件 |

行数上限核对：235/235/199 均 ≤500（eslint max-lines 同口径）。

## 3. 红证四支索引（各 raw 含 exit 真值，先写文件后 echo exit=$?）

| 支 | raw | 关键行（实测） |
| --- | --- | --- |
| ① C-4 红 | f-css03-red1-c4.raw.txt | `src/renderer/shared/theme-buttons.css:115: CSS 颜色字面量消费（单源=--* token）：.f-css03-red-probe { color: #aabbcc; }`（theme-buttons.css 追加探针→file:line 精确断言）exit=1；还原后探针行 grep=0 |
| ② B-5 红 | f-css03-red2-b5.raw.txt | `184:97  error  inline style 颜色字面量 "#fff"——颜色消费单源=--* token（INV-11）  synapse/no-inline-color` exit=1；还原 grep=0 |
| ③ W3 哨兵红 | f-css03-red3-w3.raw.txt | `哨兵：theme.test.ts FS_DECL 多处（2 处）歧义——哨兵[W3]：静默取第一处风险，人工消歧（F-CSS-03）` exit=1；还原 grep=0 |
| ④ 提取失败哨兵红 | f-css03-red4-c8sentinel.raw.txt | `哨兵：theme.test.ts FS_DECL 提取失败（match null）——哨兵正则或常量行变更（F-LINT-01 C-8）` exit=1（W3 改造后原哨兵仍在——验证目的达成）；还原 grep=0 |

## 4. 变异红证三支索引（cp 备份法，全部还原后双零残留 grep 实测）

| 支 | raw | 咬合证明（exit 序列） |
| --- | --- | --- |
| mut1 C-4 | f-css03-mut1-c4.raw.txt | C-4 检查体行注释掉+反例植入→`exit(mutated-gate+probe)=0`（放行=关卡有咬合）→还原关卡（反例保留）→`exit(restored-gate+probe-still)=1` |
| mut2 B-5 | f-css03-mut2-b5.raw.txt | rules 行 error→off+tsx 反例→`exit(mutated-rule+probe)=0`→还原→`exit(restored-rule+probe-still)=1` |
| mut3 W3 | f-css03-mut3-w3.raw.txt | `if (declCount > 1)`→`if (false)`+双 FS_DECL（探针置声明行**之前**）→`exit(mutated-w3+double-fsdecl)=0`（静默取第一处=放行风险实证）→还原→`exit(restored-w3+probe-still)=1`（W3 哨兵红） |

## 5. 测试证据

| 关 | raw | 结果 |
| --- | --- | --- |
| quality:check | f-css03-quality.raw.txt | **exit=0**（C-4/C-8/W3 全上+存量零命中——裁决 1/2+延伸清理毕） |
| lint | f-css03-lint.raw.txt | **exit=0**（B-5 上+存量零命中） |
| typecheck | f-css03-typecheck.raw.txt | **exit=0** |
| test | f-css03-test.raw.txt | **exit=1：8 failed / 1554 passed（1562 总）/160 文件** ——卡点，见 §6 |

用例总数对账：**1562 ≠ 基线 1514，+48**=theme.test.ts TOKENS 数组新增 48
token 项经 `it.each(TOKENS)` 展开（vitest 逐数组项计一用例）——主控简报 ⑤
「TOKENS 是数组数据非新增 it()，预期不变」预判与 vitest 计数语义不符，
+48 与新 token 数严格一致=可解释偏差非异常（实测在档）；**非停手项**。

## 6. 卡点（BLOCKED）——test 8 红，修复全在 tests/**（禁令域）

### 6.1 失败清单与归属（5 文件 8 用例）

| # | 测试文件 > 用例 | 断言差异（实测） | 归属 |
| --- | --- | --- | --- |
| 1 | pdf-page-canvas.test.tsx > F-A5 c 面 > render 以透明背景调用 | `expected 'transparent' to be 'rgba(255,255,255,0)'` | **裁决 1 引入**（本轮） |
| 2 | pdf-page-canvas.test.tsx > F-A5 c 面 > PageBox 白纸承底层+isolation | `expected 'var(--panel)' to be 'rgb(255, 255, 255)'` | 上轮迁移遗留 |
| 3 | selection-paint.test.tsx > F-A4 a 面 > S1 拖选防抖路径…色 | `expected 'var(--reader-selection-paint)' to be 'rgba(0, 0, 0, 0.2)'` | 上轮迁移遗留 |
| 4 | lineage-side-panel.test.tsx > R2-LG11 侧板浅色化 | `expected 'background: var(--panel-a92); border:…' to contain 'rgba(255, 255, 255, 0.92)'` | 上轮迁移遗留 |
| 5 | lineage-canvas-visual.test.tsx > R2-LG11 > 白卡边框编码四态 | `expected 'var(--panel)' to be '#ffffff'` | 上轮迁移遗留 |
| 6 | lineage-canvas-visual.test.tsx > R2-LG11 > 边三型色 | `expected 'var(--edge-inferred)' to be '#8a94a6'` | 上轮迁移遗留 |
| 7 | library-cards.test.tsx > R3-LIB > 卡片渐变材质 | `.lib-card {…inset 0 1px 0 rgb…` 正则不匹配 var 载体 | 上轮迁移遗留 |
| 8 | library-cards.test.tsx > R3-LIB 回炉一 > R5 选中卡材质 | `to contain 'inset 0 0 0 1px rgba(201, 168, 106, 0.45)'` | 上轮迁移遗留 |

### 6.2 定性

- **#2-8（7 处）在我接手前已红**：git diff 实证迁移面（PageBox/selection-
  paint/Lineage 系列/library.css）把字面量改 var() 载体是上轮实现者工作树
  改动（上轮 M 面 20 文件含全部相关件；PdfPageCanvas.tsx 不在其中=本轮
  裁决 1 唯一触碰）——上轮被外部终止于「迁移毕、受锁断言未对账」中段。
  主控简报 ⑤ 只盘点 theme.test.ts（180/180 绿），未跑全量 test。
- **#1 为裁决 1 的直接后果**：主控裁决 1 依据（透明非视觉色不立 token/
  CSS 关键字语义清晰/B-5 天然豁免）未覆盖 pdf-page-canvas.test 的
  F-A5 受锁断言面（断言 render 参数 background==='rgba(255,255,255,0)'
  字面量）。附带核实：该行是 `pdfPage.render({...})` 参数而非 JSX style
  属性——**本就不在 B-5 AST 面与 C-4 CSS 面内**，回退裁决 1 不影响任何
  关卡绿，但也不能救 test（其余 7 处仍红）。
- 修复选项（主控 [locked-change] 域，实现者不自裁）：
  a. 8 处断言随 var() 载体迁移改写（token 载体锚——theme-buttons 先例
     theme.test.ts B1 块已有 `[F-CSS-03] 断言形态随 token 化迁移` 同款改法）；
  b. 或断言改「transparent 等值」双形态；
  c. 裁决 1 回退（仅救 #1）。

## 7. 自裁申报（本简报裁决 1-7 逐条+偏差）

1. **裁决 1 照办**：单行替换，未动该文件其他行。后果（test #1 红）非
   预期but如实上报——不自裁回退（主控指令优先，回退也只救 1/8）。
2. **裁决 2 照办+延伸 5 行**（§1 已述）：主控 ⑤i「grep 实测仅 91 行 1 行
   命中」与本轮 C-4 同款逻辑 dry-run 实测不符（另 5 行命中——token 段分组
   注释的基色示例文字）。同族同法处理（零行为面），若主控不认可可单独
   revert 这 5 行（不影响其他面，但 C-4 存量会红 5 行）。
3. **裁决 3 照办**：循环结构 break→if(fsDeclRe) 是蓝本 §3 原文形态（主控
   「可直接落码」授权面），哨兵+消息格式逐字票面。
4. **裁决 4 照办**：declCount=0 自然走 match null 支（结构合并，两哨兵
   互补），W3 文案逐字票面（含「哨兵[W3]：静默取第一处风险，人工消歧」）。
5. **裁决 5 照办**：B-5 块逐字蓝本+两文件头注互指+COLOR_RE 逐字一致。
6. **裁决 6 照办+一处保留**：状态列在主控文案后补「字号面已锚（2026-09-09
   F-LINT-01 C-8…）」简注——INV 册信息完整性（原状态列含该史，整列替换
   会丢字号锚定记录）；不认可可删该分句。
7. **裁决 7 照办**：未动任何 tsx 注释。
8. **工具坑（方法论候选）**：Git Bash→Windows node.exe 的 argv 边界**丢弃
   含换行的参数**——红证 3 首跑与 mut3 首跑各无效一次（红因=声明行被删
   /RegExp 构造异常走 catch 支，均非目标哨兵支），改**单行植入法**（行尾
   追加注释探针/单行替换）重做后有效。无效首跑输出已被有效重跑覆盖
   （raw 终态=有效形态），教训在此留档。
9. **mut3 植入位置学**：双 FS_DECL 探针须置声明行**之前**且构造出合法无害
   正则（`zz9probe`）——同行尾追加会污染 `.+` 贪婪捕获致 RegExp 构造异常
   （走 catch 支红≠「静默放行」对照）。红证 ③不受此限（W3 在位时计数即红）。
10. **test 用例 +48**（§5 已述）：主控预判修正项非异常。
11. **零超票面其他**：未碰 tickets/、未 git 写操作、未跑 verify（票面豁免）、
    未跑视觉/e2e（主控亲验面）、未动 locks（见 §8）。

## 8. locks 实录

- 本轮**零 locks 操作**（未 unlock/apply/generate）：受锁三件
  （check-quality.mjs/eslint.config.js/invariants.md）直接可写=主控预
  unlock 态（简报 ⑥「unlock 态由主控收口 apply」）；manifest 未动，
  中间态 locks:check 红=已知（主控收口统一 apply——本轮三件+潜在
  scripts/audits 新增件面一并）。

## 9. 疑虑

1. test 8 红的 [locked-change] 处置方向（§6.2 选项 a/b/c）待主控裁决——
   建议选项 a（断言随 var() 载体迁移改写，theme.test.ts B1 块先例同构）。
2. 上轮迁移面中 SplitPane.tsx 渐变串迁移后为
   `var(--border-gold-a15), var(--border-gold-a50), var(--border-gold-a15)`
   ——B-5 AST 面**不咬模板串/非 Literal 值**（票面知悉面），但值域上该
   渐变三端点已 token 化，闭环完整。
3. `f-css03-appendix-tmp.md` 为附录生成中间件，随本报告并入后删除（见
   附录）。

## 附录：50 值命名表（theme.css:93 注释引用件）

> 生成法：theme.css F-CSS-03 段 token:值对 + HEAD 态内容规范化（去空白/
> 小写）检索重建原消费处；3 处缩写/尾零形态（.15/.12/0.20）经 git diff
> 删行人工补记（标注 ※）。50=48 新 token+2 既有 token 直接消费。

| token | 值 | HEAD 态原消费处 |
| --- | --- | --- |
| --accent-a10 | `rgba(44, 95, 138, 0.1)` | shared/theme-shell.css |
| --accent-a12 | `rgba(44, 95, 138, 0.12)` | features/workspaces/workspace.css |
| --accent-a15 | `rgba(44, 95, 138, 0.15)` | features/workspaces/workspace.css |
| --accent-a20 | `rgba(44, 95, 138, 0.2)` | shared/theme-shell.css |
| --accent-a22 | `rgba(44, 95, 138, 0.22)` | features/workspaces/workspace.css |
| --accent-a35 | `rgba(44, 95, 138, 0.35)` | shared/theme-shell.css |
| --accent-a45 | `rgba(44, 95, 138, 0.45)` | features/workspaces/workspace.css |
| --accent-a55 | `rgba(44, 95, 138, 0.55)` | features/workspaces/workspace.css |
| --border-gold-a15 | `rgba(201, 168, 106, 0.15)` | shared/ui/SplitPane.tsx（渐变端点 `.15` 缩写 ※） |
| --border-gold-a28 | `rgba(201, 168, 106, 0.28)` | shared/theme-shell.css |
| --border-gold-a45 | `rgba(201, 168, 106, 0.45)` | features/library/library.css<br>shared/theme-buttons.css |
| --border-gold-a50 | `rgba(201, 168, 106, 0.5)` | shared/theme-shell.css<br>shared/ui/SplitPane.tsx（`.5` 缩写 ※） |
| --gold-bright-a70 | `rgba(227, 201, 143, 0.7)` | shared/theme-buttons.css |
| --gold-press | `rgba(207, 174, 114, 0.3)` | shared/theme-buttons.css |
| --danger-a08 | `rgba(179, 64, 58, 0.08)` | features/lineage/LineageNodeMeta.tsx<br>features/lineage/LineageSideTags.tsx |
| --danger-a12 | `rgba(179, 64, 58, 0.12)` | shared/theme-buttons.css |
| --danger-a25 | `rgba(179, 64, 58, 0.25)` | features/lineage/LineageSideTags.tsx |
| --panel-a06 | `rgba(255, 255, 255, 0.06)` | shared/theme-shell.css |
| --panel-a07 | `rgba(255, 255, 255, 0.07)` | shared/theme-shell.css |
| --panel-a35 | `rgba(255, 255, 255, 0.35)` | shared/theme.css（纸面丝纹） |
| --panel-a88 | `rgba(255, 255, 255, 0.88)` | shared/theme-lineage.css |
| --panel-a90 | `rgba(255, 255, 255, 0.9)` | features/library/library.css |
| --panel-a92 | `rgba(255, 255, 255, 0.92)` | features/lineage/LineageSidePanel.tsx |
| --close-red | `#e81123` | shared/theme-shell.css |
| --close-red-press | `#f1707a` | shared/theme-shell.css |
| --nav-text | `#cfd5e4` | shared/theme-shell.css |
| --nav-item-text | `#aeb6ca` | shared/theme-shell.css |
| --nav-item-text-hover | `#e6eaf4` | shared/theme-shell.css |
| --nav-item-text-press | `#eaf1fa` | shared/theme-shell.css |
| --nav-item-text-current | `#f3eddd` | shared/theme-shell.css |
| --nav-ver-text | `#8d95ad` | shared/theme-shell.css |
| --nav-ver-border | `rgba(141, 149, 173, 0.4)` | shared/theme-shell.css |
| --nav-foot-text | `#6d7590` | shared/theme-shell.css |
| --ink-deep | `#171e2f` | shared/theme-shell.css |
| --ink-a18 | `rgba(27, 35, 51, 0.18)` | features/workspaces/workspace.css |
| --accent-hi | `#3a76ab` | shared/theme-buttons.css |
| --accent-deep | `#234a6d` | shared/theme-buttons.css |
| --btn-press-tint | `rgba(11, 26, 40, 0.45)` | shared/theme-buttons.css |
| --lib-paper-hi | `#fffdf9` | features/library/library.css |
| --lib-paper-lo | `#fdfaf3` | features/library/library.css |
| --edge-label-text | `#6b7280` | features/lineage/LineageEdges.tsx<br>shared/theme-lineage.css |
| --edge-inferred | `#8a94a6` | features/lineage/LineageEdges.tsx |
| --node-meta-border | `#dfa84a` | features/lineage/LineageNodeMeta.tsx |
| --note-border | `rgba(151, 160, 187, 0.28)` | features/lineage/LineageSideAiNotes.tsx<br>features/lineage/LineageSideManualNote.tsx |
| --reader-selection-paint | `rgba(0, 0, 0, 0.2)` | features/reader/selection-paint.tsx（`0.20` 尾零 ※） |
| --shadow-page | `0 1px 4px rgba(0, 0, 0, 0.12)` | features/reader/PageBox.tsx（`.12` 缩写 ※） |
| --shadow-pop-sm | `0 2px 8px rgba(0, 0, 0, 0.15)` | features/reader/SelectionToolbar.tsx |
| --shadow-pop-md | `0 2px 12px rgba(0, 0, 0, 0.18)` | features/reader/AnnotationEditor.tsx |
| --panel（既有） | `#ffffff` | 直接消费既有 token——原 `#ffffff`/`rgb(255,255,255)` 消费处：features/reader/PageBox.tsx、features/lineage/LineageNodeCard.tsx（SVG fill）、features/lineage/LineageSideAiNotes/ManualNotes/Panel/Tags.tsx、shared/theme-buttons.css、shared/theme-shell.css |
| --border（既有） | `#e4ded1` | 直接消费既有 token——原消费处：features/lineage/LineageSidePanel.tsx |

（本表 48 新 token 计数经脚本实测 `tokens=48`；※ 三处=规范化检索零命中、
git diff 删行人工补记，值等价仅书写形态差。）

## 门二工单（四清单+一）
① **处置核对**：门一 B-1/W-1~W-5/N-1~N-2 逐条 vs 主控处置（材料二）vs
   终态实物（材料三/四）——「说了没改」 hunting；特别是 B-1 闭合证据链
   （像素差分 raw+0 带输出+settings 非确定性判定逻辑）是否成立。
② **母本符合度**：票面序①-⑤ vs 设计真相源 §1/§5（终裁档在门一包内
   已审——本包材料四 diff 对其逐节）；50 值命名表（实现者报告附录）vs
   theme.css :root 实际 token 逐条对账（数量/值/名）。
③ **宪法红线终审**：分层单向/受锁面（tests+scripts+eslint 改动在
   [locked-change] 授权叙事内？主控亲改 6 测试件的处置是否符合「发现测试
   问题报告人类走 [locked-change]」——本票票面即颜色载体迁移战役+提交
   尾注 [locked-change]+门审覆盖的合规性判断）/安全禁令（CSP/Node API/
   出网面零触碰确认）/文件行数 ≤500/UTF-8/TDD 证据链四档（红→绿→变异
   →还原安全 cp 法）。
④ **机器面核对**：1562=1514+48 数理；+48 的 it.each 语义；locks 311 收口
   面预告；「关卡上线即绿存量零命中」=quality/lint exit=0 的达成；用例数/
   文件数与基线衔接可解释性。
⑤ **总评**：放行收口 / 回炉（给理由与必改清单）。
