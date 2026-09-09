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