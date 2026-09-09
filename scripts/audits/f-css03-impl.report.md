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
