# F-CSS-03 补审·片一（Kimi 位）——关卡落地+测试断言面

你是门一对抗审查员（补审轮分片①/②）。背景：F-CSS-03（颜色 token 化战役
+颜色负锚双关卡）已收口提交；首轮门一 131K 审包超 Kimi 网关窗 504×6 耗尽
落 deepseek 兜底（同源欠账）——本次补审=你（Kimi）对同一票独立对抗。
分片说明：①=关卡+测试面（本文件）；②=迁移面（另发）。两片各自独立出
[B|W|N]+统计+总评，主控拼装。

铁律：只读本文件内材料；唯一可写=审计报告；禁 npm/test/git。只报告有代码
证据支撑的问题，每条 file:line/摘录；不确定明说。中文输出全文入档。

## 材料一：票面摘要+设计真相源 §0/§1

票面：F-CSS-03=50 值颜色 token 化（48 新+2 既有消费）+C-4/B-5/W3 三关卡
+INV-11 升格。用户双裁决=零视觉差口径（值原样+同值合并）+语义命名优先。
验收=像素差分零带+关卡上线即绿存量零命中+INV-11 升格+verify 全链。
实现=上轮实现者迁移+本轮实现者（GLM5.3flash）关卡落地+主控亲改 6 测试件
12 断言改点（[locked-change] 域——test 8 红=受锁断言咬旧字面量 vs 已迁
var() 载体，主控处置选项 a：断言随载体迁移+变异锚保活）。

## 0. 三跳裁决记录

| 上游项 | 终裁 | 理由 |
| --- | --- | --- |
| 选型 B+C 组合、A 否决 | **维持** | 双源背书一致；A 跨节点断言不可表达 |
| CR1 C-8 正则单源提取（主控预裁案被双源 endorse） | **采纳+强化** | 提取失败=关卡硬红（哨兵）；零正则复制 |
| CR2 B-1 移出 MVP | **采纳** | 2/100/0.2s 假阳面+eslint 单文件 lint 隔离模型下跨文件 state 需前置设计（攻击面 6）——降扩展面 warn 试运行 |
| CR3a C-4 token 清单提取 | **改简**：检测面=「CSS 颜色字面量**消费**负锚」——豁免=行级 `--name:` 定义行（token 定义即字面量合法所在地），**零 token 名清单依赖**——比两轮外跳案都简且无清单漂移面 | 终裁权行使：原案「清单豁免」解决的是伪问题（消费面检测不需要知道 token 名，只需要排除定义行） |
| CR3b B-6 同名豁免（Props/State/T 通用名+tests/ 面） | 采纳（扩展面生效时） | React 组件文件同名 type Props 本能合法 |
| 攻击面 1 CSS-in-JS | **显式 out-of-scope 登记** | 本仓架构=纯 CSS 文件+inline style（AGENTS），无 styled-components 形态 |
| 攻击面 2 七件数组完整性哨兵 | **不动作** | C-8 全量关卡（lint 红先于测试弱化暴露）+七件数组=纵深防御并存；删数组=用例数变化必过门审 |
| 攻击面 3 spacing/z-index/duration 双源 | **备案池不扩本票** | spacing token 体系不存在——负锚前先有 token 化战役（新票候选 F-CSS-03） |
| 攻击面 4 !important/media 重定义 | 不动作 | 假想敌面（现状零形态）；INV 注记边界一句 |
| 攻击面 5 空集哨兵 | **采纳（厘清版）** | 哨兵只哨「工具失能」态：提取失败/walk 零文件=红；「检查结果零命中」=正常绿态不哨 |
| 攻击面 6 B-1 并发缓存 | 随 B-1 降级注记 | 扩展面立项时设计（独立聚合 pass） |

## 1. MVP 终态（本票实现面——三项）

### C-8 全量 CSS 字号负锚关卡（check-quality.mjs）

- **正则单源**：readFileSync(tests/unit/renderer/theme.test.ts) 文本提取
  `/FS_DECL = \/(.+)\/gi/`→new RegExp(capture,'gi')；**读文件失败或提取
  null=关卡硬红**（「FS_DECL 提取失败——theme.test.ts 变更加哨兵」）。
- walk `src/**/*.css`（**零文件=硬红**——结构失能哨兵）；每文件 match 计数
  >0=红（文件名+匹配样例前 3）。
- 效果：F-CSS-02 W1 通道闭合（新增第八件 CSS 自动入锚）；与 theme.test.ts
  七件测试锚=纵深防御（lint 全量+测试深检），互不替代。

### C-4 CSS 颜色字面量消费负锚（check-quality.mjs）

- 同一 walk 循环内：行级豁免 `/^\s*--[\w-]+\s*:/`（token 定义行——颜色
  字面量合法所在地）；命中 `/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/` 的行
  =红（文件:行号+样例）。
- `content: "#"` 类不咬（# 后非 hex 字符）；注释内示例=W4 同族严格性非
  缺陷（知悉面）。
- 零 token 名清单依赖（见 §0 CR3a 改简）。

### B-5 tsx inline style 颜色负锚（eslint.config.js 内联本地 rule）

- **内联不另立文件**（终裁：零新文件零 import 耦合；eslint.config.js
  已受锁单件变更）。
- flat config `plugins: { synapse: { rules: { 'no-inline-color': … } } }`；
  files 限 `src/renderer/**/*.tsx`；severity error。
- AST：JSXAttribute[name='style']→JSXExpressionContainer→ObjectExpression
  →Property.value=Literal 命中 C-4 同款颜色正则→report（node+样例）。
  var() 载体 Literal 值不命中颜色正则天然豁免；模板串/表达式值不检
  （单文件态面）。

### MVP 验收（票面）

1. **先红证四支**（植入反例→各关卡红→还原，cp 备份法）：
   ①新 CSS 第八件含 `font-size: 12px`→C-8 红；②既有 CSS 非 定义行含
   `color: #aabbcc`→C-4 红；③tsx inline style `style={{ color: '#fff' }}`
   →B-5 红；④**哨兵支**：临时改 theme.test.ts FS_DECL 行（如重命名常量）
   →C-8 提取失败红（防「空集绿灯」退化）。
2. **存量零误报**：全仓现状全绿（verify 全链）。
3. verify 全链绿+locks apply。

## 2. 扩展面（本票不实现——registry/invariants 注记备案）

## 材料二：实现者报告关键段（摘要/红证变异索引/卡点+自裁申报；附录命名表在片二）

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


## 材料三：红证四支+变异三支关键行（raw 尾部=哨兵/exit 真值）

── red1-c4 ──
dup-constants：扫描 215 文件 / 143 声明——红层 8 组 baseline 待收敛（F-LINT-03 候选）、新增 0 组、warn 3 组（异名同文案不卡 CI）
quality 检查未通过：
  - src/renderer/shared/theme-buttons.css:115: CSS 颜色字面量消费（单源=--* token）：.f-css03-red-probe { color: #aabbcc; }
exit=1
── red2-b5 ──

✖ 1 problem (1 error, 0 warnings)

exit=1
── red3-w3 ──
dup-constants：扫描 215 文件 / 143 声明——红层 8 组 baseline 待收敛（F-LINT-03 候选）、新增 0 组、warn 3 组（异名同文案不卡 CI）
quality 检查未通过：
  - 哨兵：theme.test.ts FS_DECL 多处（2 处）歧义——哨兵[W3]：静默取第一处风险，人工消歧（F-CSS-03）
exit=1
── red4-c8sentinel ──
dup-constants：扫描 215 文件 / 143 声明——红层 8 组 baseline 待收敛（F-LINT-03 候选）、新增 0 组、warn 3 组（异名同文案不卡 CI）
quality 检查未通过：
  - 哨兵：theme.test.ts FS_DECL 提取失败（match null）——哨兵正则或常量行变更（F-LINT-01 C-8）
exit=1
── mut1-c4 ──
dup-constants：扫描 215 文件 / 143 声明——红层 8 组 baseline 待收敛（F-LINT-03 候选）、新增 0 组、warn 3 组（异名同文案不卡 CI）
quality 检查未通过：
  - src/renderer/shared/theme-buttons.css:115: CSS 颜色字面量消费（单源=--* token）：.f-css03-red-probe { color: #aabbcc; }
exit(restored-gate+probe-still)=1
── mut2-b5 ──

✖ 1 problem (1 error, 0 warnings)

exit(restored-rule+probe-still)=1
── mut3-w3 ──
dup-constants：扫描 215 文件 / 143 声明——红层 8 组 baseline 待收敛（F-LINT-03 候选）、新增 0 组、warn 3 组（异名同文案不卡 CI）
quality 检查未通过：
  - 哨兵：theme.test.ts FS_DECL 多处（2 处）歧义——哨兵[W3]：静默取第一处风险，人工消歧（F-CSS-03）
exit(restored-w3+probe-still)=1

## 材料四：快照后事实补编（收口终态——供更新判断）

1. 像素差分已完成：八态截图 sha256 逐字节相同+COMPARE PASS+visual-diff
   全八态 0 差分带（settings 首采瞬态差异 1 次复采零差=非确定不计案）。
2. verify 全链 exit=0 真值回读（160 文件/1562 用例/locks 311）。
3. 票已提交（含本片 diff 内全部改动）。

## 材料五：本片 diff（关卡+测试面 11 文件——check-quality/eslint/invariants/
7 测试件/PdfPageCanvas 裁决 1）

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

## 片一工单（对抗审）
A **关卡母本符合度**：C-4/W3（check-quality diff）+B-5（eslint diff）vs
   设计 §1 原文逐点（行级豁免正则/COLOR_RE 文本/AST 面/哨兵形态）；蓝本
   偏离处逐条。
B **宪法红线**：受锁面（tests/scripts/eslint/invariants）改动在 [locked-change]
   授权叙事内？主控亲改 6 测试件 12 改点的合规性（「发现测试问题报告人类
   走 [locked-change]」——票面即载体迁移战役+尾注+门审覆盖）；安全禁令
   （eval/Node API/出网零触碰确认）；行数 ≤500。
C **关卡质量推演**：C-4 正则误报/漏报面（url(#hex)/content:"#"/变量名含
   hex）；行级豁免边界；B-5 AST 面（嵌套对象/条件展开/SplitPane 渐变
   Literal/常量引用）；W3 matchAll 与 .match 主正则口径差。
D **测试断言迁移诚实性**：12 改点逐条「锁的值/载体前后对照」——有无放松
   （toContain 范围/正则改窄/toBe 弱化）；2 处 not.toBe 变异锚随迁保活的
   正确性（lineage-canvas-visual:236 与 lineage-manual-edit:188——不随迁
   则优先级翻转变异锚静默失效）；补编事实下 B-1（像素差分）成立性重审。
E **接缝**：关卡上线对将来开发的负担面/误报预期。

## 输出格式
逐条 [B|W|N]+证据→统计→片一总评（放行/回炉建议）。全文中文。
