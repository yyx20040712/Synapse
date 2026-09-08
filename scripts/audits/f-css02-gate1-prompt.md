你是 F-CSS-02 工单（theme.test 负锚正则全域化升级）的门一对抗深审员。只读审计——只看本审计包（票面+简报+实现者报告+完整 diff+证据摘录）,禁接触仓库/禁跑命令/禁臆测包外事实。不确定的明确说不确定。铁律：每条 finding 给 [B|W|N]+file:line 或 diff 摘录。中文输出。

工单：A 母本符合度（票面+简报预裁 vs diff——正则形态 /font-size:\s*[\d.]+\s*[a-z%]/gi 四通道闭合论证[枚举外新值/无分号/大小写/非 px 单位]/七件 it.each/FS_TSX 两锚+@theme 正锚原样保留/FS_LITERALS+FS_COUNTS 死代码清理/INV-61 注记回注/describe 头注口径更新）;B 宪法红线（受锁两件=预解锁工作流+票面明文/UTF-8/测试是锁定的合约=[locked-change] 面主控已裁升级方向——实现者不得越预裁改断言语义核对）;C 代码与测试质量——**附加强制审项=正则锚专项**：①正则语义逐项推演（[\d.]+ 对 .5px 无前导零小数/1.5e2 科学计数形态[\d.]+ 会咬到 1.5 后 e 不匹配 [a-z%] 吗——font-size: 1.5e2px 形态覆盖与否+是否现实威胁；\s* 在数字与单位间；i flag 大写；% 单位；**共享 RegExp 常量 FS_DECL 带 g 在 it.each 七次调用间状态污染问题**[String.prototype.match with g 的 lastIndex 语义——实现者注记「match 带 g 不受 lastIndex 污染」是否精确]）②误咬面推演（var(--fs-*) 载体/注释内文字形态如头注自身「font-size: 12px」举例/其他属性名含 font-size 子串者[如 -webkit-font-size? 或 font-size-adjust 属性!]——font-size-adjust: 12px 形态会被 /font-size:\s*[\d.]+/ 咬吗[子串匹配位置在 adjust 中间——font-size 后跟的是 - 不是 \s*[\d.],不咬——请独立推演确认]）③用例数 84→7 的防护等价性（单 it 每件 vs 枚举 84——红消息定位能力/漏文件通道[it.each(FS_CSS) 七件清单与现行 FS_CSS 数组同源,新增 CSS 文件不自动入锚=残留通道,票面是否要求]）④先红证+变异双支证据链逻辑（13.5px 无分号→旧锚模拟带分号不红→新锚红=升级不弱化双段证明结构是否成立;16px 新值红=枚举漏新值闭合）;D 报告诚实性（自裁三项 vs diff/弯路补记 node -e 多行假绿+grep 拦截重做——如实性核对/1543→1466 数理一致）;E 接缝与后续单（library-cards.test.tsx 三断言同型负锚是否同漏通道候选[票面范围外——注记级]/新增 CSS 第八件文件通道/批二 gate2 package 里 FS_LITERALS 相关表述的历史档不受影响的口径）。

主控已预裁项（可攻击但推翻需更强依据）：
1. 正则形态=主控推荐形态实现者原样落地（[\d.]+\s*[a-z%] 数字后任意单位首字符）;
2. tsx 面评估结论=现行两锚已全域达标维持+全域 grep 零匹配证据（mode1/mode2 exit=1=零匹配口径）;
3. 用例数 84→7 基线推进 1543→1466 由主控交接书记账（实现者如实报数）;
4. 受锁流程=主控预 unlock,实现者不碰 locks（locks:check 预期红=工作流预期非缺陷）。

输出：[B|W|N] 逐条+证据+统计+总评（PASS/PASS_WITH_WARNINGS/BLOCKED）。

=== 审计包正文 ===
## 票面（registry 摘要）
  { id: 'F-CSS-02', file: 'tests/unit/renderer/theme.test.ts', area: 'ui-kit', owner: 'strong', status: 'open', summary: 'theme.test 负锚升级=正则全域归零（2026-09-08 批二门一 C-2C-3 建议+用户裁决 2026-09-09 立案夜间批——枚举式覆盖<INV-61 登记语义）:FS_LITERALS 负锚矩阵（12 字面量×7 文件 it.each,font-size 声明形态口径）升级为**正则全域「任意数字 font-size 声明归零」**——七 CSS 文件断言 /font-size:\s*[\d.]+px\s*;/ 计数=0（token 定义行 var() 形态不匹配——禁字面量语义全覆盖,新增 13px/任意值/新文件自动被拦,枚举漏新值通道闭合）;**去分号依赖**（现行锚尾分号,`font-size:12px` 无分号形态绕过通道闭合——正则分号可选或行界锚定,实现者现场定+先红证）;tsx 形态锁同步升级（fontSize: 数字 inline 同构归零面评估——票面范围=CSS 七件+四 tsx,升级面与现行 2 形态锁衔接）;受锁流程 unlock→改→apply;验收=先红（临时在皮肤件加 font-size:13.5px 一处→新锚红→还原）+变异红证（现行枚举锚删一组→新锚仍拦=升级不弱化证明）+verify 全链;INV-61 测试列注记同步（锚形态升级回注）' },
  { id: 'F-LINT-01', file: 'eslint.config.js', area: 'infra', owner: 'strong', status: 'open', summary: 'INV-11 lint 机器化（类型/颜色/文案/数值单一真相源禁令的机器锚定——v50/v51 两度留用户裁决优先级,2026-09-09 用户裁决纳入夜间批）;**设计链三跳强制**（methodology §4.5 架构/技术路线位）:Kimi K3 拟定设计书（lint 规则设计——What to lint:单源禁令的机检面枚举【已知双源残留清零后防线仍人审——哪些形态可机检:重复字面量魔法值/同值双声明/常量旁落;哪些不可:语义等价两实现——设计书须逐形态裁决可检性+误报面】+规则形态选型【no-restricted-syntax 自定义 selector/AST 遍历插件/文本 grep 关卡——三案对比】+实施分期）→deepseek 对抗审核（ENDORSE/CR×N）→GLM5.3 主控终裁;实现=终裁版落地（eslint.config.js 受锁+[locked-change]或 check-quality 关卡——按设计书终态）;验收=规则先红证（植入双源反例→红→删）+全量 verify 绿（存量零误报——现存代码单源达标面）+INV-11 状态「部分」→「已锚定」升格登记;预算面:设计链外跳两场+实现三屋全链——夜间批压轴位（前置 F-TOOL-01/F-CSS-02 收口后启动;网络断则按闲时纪律顺延留次日）' },

## 实现者简报（主控预裁=完整任务书）
# F-CSS-02 实现者简报——theme.test 负锚正则全域化升级

> 档位：GLM5.3flash（实现者位；环境限制统一档如实记）。主控=GLM5.3。
> 票面：tickets/registry.ts F-CSS-02（本简报含主控预裁=完整任务书）。

## ① 任务一句话

tests/unit/renderer/theme.test.ts 的 FS_LITERALS 枚举负锚（12 字面量×7 件
84 用例）升级为**正则全域「任意数字 font-size 声明归零」**（枚举漏新值/
无分号/大小写/非 px 单位通道全闭合），INV-61 测试列注记同步回注。

## ② 必读序（文件清单化）

1. `AGENTS.md`——测试纪律（受锁流程/先红后绿/变异红证还原安全）。
2. `tests/unit/renderer/theme.test.ts` :389-454——现行 describe 块全文
   （FS_CSS 七件/FS_LITERALS 12 值/it.each/FS_TSX 两形态锁/@theme 正锚）。
3. `docs/invariants.md` :77 INV-61 行（测试列注记待回注）。
4. `scripts/audits/visual-diff-locate.mjs` 头注——无关本票，不读。
   （真必读第 4 件=七 CSS 目标文件，先红证植入点：theme-buttons.css 或
   theme-lineage.css 任一块内。）

## ③ 主控预裁（逐条——实现者不再自裁这些点）

1. **正则终态（推荐形态）**：`/font-size:\s*[\d.]+\s*[a-z%]/gi` 计数=0
   ——数字后跟任意单位首字符即拦（px/pt/em/rem/% 全覆盖，批二票面给的
   `[\d.]+px\s*;` 形态的三通道闭合升级：无分号依赖+大小写不敏感+非 px
   单位）。`i` flag 防大写 PX 绕过。允许实现者现场微调（如加负
   lookahead），须论证四通道（新值/无分号/大小写/非 px 单位）闭合且不
   误咬 var() 载体与注释外合法形态——七件现状零匹配是前提（动手前先
   grep 七件确认）。
2. **用例形态**：七 CSS 件各一 it（it.each 七件或七个 it——7 用例），
   断言=正则 match 计数 0，红时消息含匹配样例。**用例数 84→7 基线
   推进（1543→1466 预期）由主控在交接书记账，实现者只如实报数**。
   FS_TSX 两形态锁+@theme 正锚**原样保留**。
3. **tsx 评估面（票面「同步升级评估」的落点）**：现行两锚已是全域正则
   （`/fontSize:\s*['"`]?\d/`+`/text-\[\d/`）——评估结论=CSS 声明面
   已等价达标维持；补一项全域证据：grep 全部 `src/**/*.tsx` 的
   `fontSize:\s*['"`]?\d` 消费（不限四件）——零匹配=范围无蔓延确认；
   有第五处匹配=**申报不自裁**（BLOCKED 报主控，可能是批二漏网）。
4. **先红证（票面钉死）**：临时在皮肤件加 `font-size:13.5px`（13.5=
   现行枚举内值但已删除枚举锚）**无分号形态**一处（块内末声明合法
   CSS）→新锚红→还原（cp 备份法，禁 git checkout——AGENTS 变异还原
   安全）。原始输出落盘。
5. **变异红证双支（升级不弱化证明）**：
   a. 植入 `font-size:13.5px`（无分号）→**旧枚举锚模拟**（临时把新正
   则换回 `font-size:\s*13\.5px\s*;` 带分号形态）→不红（旧锚漏无分号
   通道实锤）→还原新锚→红。各步输出落盘。
   b. 植入 `font-size:16px`（批二枚举外新值+带分号）→新锚红（枚举漏
   新值通道闭合实锤）→还原植入。输出落盘。
6. **受锁流程**：主控已预 unlock（theme.test.ts+invariants.md 可写）
   ——实现者**不碰 locks 命令**；verify 全链 locks:check 段预期红=
   预解锁工作流（批二先例），实现者跑到 test 段绿+typecheck+lint 绿
   即可（verify 可拆跑：npm run test && npm run typecheck && npm run lint），
   locks/apply 与全量 verify=主控收口职责。
7. **INV-61 注记**（invariants.md :77 测试列）：「FS_LITERALS 负锚矩阵
   （font-size 声明形态口径——px 通用值纯文本计数不可行）」→
   「FS 正则全域负锚（任意数字 font-size 声明归零——新值/无分号/大小写/
   非 px 单位通道闭合；2026-09-09 F-CSS-02 升级）」。仅此一段文字，
   INV 其余列不动。
8. **不删 describe 头注的口径注记**——升级后注记需更新（负锚口径注记
   :396-400 段改写为正则全域口径+保留 px 通用值纯文本计数不可行教训）。

## ④ 纪律

- 证据 `.raw.txt` 后缀落盘：先红证/变异双支/tsx 全域 grep/全量 test 绿
  （各含 exit=$?）。
- 改动面=恰两文件（theme.test.ts+invariants.md）+皮肤件临时植入（还原
  后 diff 空）；`git diff` 自查范围（实现者可跑只读 git diff）。
- 测试是锁定的合约——本票本身=受锁测试的[locked-change]面，主控已裁
  升级方向，实现者不得越预裁改断言语义（正则形态微调须③1 论证）。
- 卡点=BLOCKED 停手不自裁。

## ⑤ 验收判据

1. 新锚七件全绿+旧枚举锚删除（FS_LITERALS/FS_COUNTS 结构清理，死代码
   即删）。
2. 先红证+变异双支证据在档（各自原始输出）。
3. 皮肤件还原 diff 空。
4. npm run test 全量绿（1466 用例预期）+typecheck+lint 绿。
5. INV-61 注记回注+describe 头注口径更新。

## ⑥ 报告契约

全文落 `scripts/audits/f-css02-impl.report.md`：实现摘要/正则形态终态+
论证/证据日志清单/tsx 评估结论（含全域 grep 数）/自裁申报。回复五行内。

## 实现者报告全文
# F-CSS-02 实现报告——theme.test 负锚正则全域化升级

> 档位：GLM5.3flash 实现者位（本环境 Agent 工具无 model 参数=统一档，如实记，勿冒充定档）。
> 任务书=scripts/audits/f-css02-impl-brief.md（含主控预裁③，一切以它为准）。
> 开工技能清点：test-driven-development（用——先红证+变异红证面）/verification-
> before-completion（用——全量三关落盘）/javascript-testing-patterns（用——负锚
> 用例形态）/systematic-debugging（用——node -e 多行静默失败排查，见 §5）/
> subagent-driven-development（不用——面向主控派发侧）/其余（不用——纯测试
> 与文档改动无对应面）。

## 1. 实现摘要

- `tests/unit/renderer/theme.test.ts` 批二 describe：FS_LITERALS（12 字面量）+
  FS_COUNTS（flatMap 84 行）+ it.each(FS_COUNTS)（84 用例）删除（死代码即删），
  换为 `FS_DECL` 正则全域负锚 + it.each(FS_CSS) 七用例（每件一 it，断言 match
  计数 0，红时消息含匹配样例）；describe 头注负锚口径注记（:396-400 段）改写为
  正则全域口径（保留「px 通用值纯文本计数不可行」批二教训+四通道闭合论证）；
  FS_TSX 两形态锁与 @theme 正锚原样保留（预裁③2）。文件 455→451 行（≤500）。
- `docs/invariants.md` :77 INV-61 测试列注记按预裁③7 原文替换（「FS_LITERALS
  负锚矩阵（font-size 声明形态口径——px 通用值纯文本计数不可行）」→「FS 正则
  全域负锚（任意数字 font-size 声明归零——新值/无分号/大小写/非 px 单位通道
  闭合；2026-09-09 F-CSS-02 升级）」），INV 其余列零触碰。
- 用例数：theme.test.ts 209→132（−77=84 枚举负锚−7 正则负锚）；全量
  **1543→1466**（−77，与主控交接书预期 1466 分毫不差）；156 文件/1466 用例
  全绿（机器实测，非印象数）。
- 改动面=恰两文件（`git diff --stat`：invariants.md 1 行+theme.test.ts
  17+/20−）；皮肤件三度植入三度还原，末态 git diff 0 行+植入串 grep 零残留。

## 2. 正则形态终态+论证

终态（采纳主控推荐形态**原样**，零微调）：

```js
const FS_DECL = /font-size:\s*[\d.]+\s*[a-z%]/gi
```

四通道闭合论证（预裁③1 判据）：

1. **枚举外新值**：`[\d.]+` 通配任意数字（含小数点），16px/9px 等枚举外值
   同拦——变异 b 红证（16px 带分号植入→红）。
2. **无分号**：模式不含 `;`，块末声明合法无分号形态同拦——先红证+变异 a
   红证（13.5px 无分号植入→新锚红）。
3. **大小写**：`i` flag——`FONT-SIZE:12PX` 形态同拦（`[a-z%]` 随 i 匹配大写
   单位首字符）。
4. **非 px 单位**：`[a-z%]` 匹配任意单位首字符——pt/em/rem/%/vw 等全覆盖。

不误咬论证：七件现状 grep 零匹配（动手前实测）；现存 25 处 font-size 声明
全为 `var(--fs-*)` 载体（值首字符 `v` 非数字，`[\d.]+` 不咬）；token 定义行
由 TOKENS 六正锚独立锁定（防护语义等价：定义正锚+消费负锚）。已知边界申报：
无单位裸零（`font-size:0` 合法 CSS）不在拦截面（单位首字符必在）——非六档
刻度回填向量（零尺寸文本属另一缺陷类），未扩负 lookahead（扩面抬升误咬
注释示例文本风险，预裁未要求）。

## 3. 证据日志清单（均含原始输出+exit 码，scripts/audits/ 下）

| # | 证据件 | 内容 | 结果 |
|---|--------|------|------|
| 1 | f-css02-targeted-green.raw.txt | 新锚 clean tree 靶向跑 | 132 passed，exit=0 |
| 2 | f-css02-red1-13p5-nosemi.raw.txt | 先红证：13.5px 无分号植入→新锚 | 1 failed（theme-buttons.css 用例，消息含样例 `font-size:13.5p`），exit=1 |
| 3 | f-css02-mut-a-oldanchor-green.raw.txt | 变异 a①：同植入+旧枚举锚模拟（`/font-size:\s*13\.5px\s*;/g`=批二生成形态逐字复刻） | **132 passed**（旧锚漏无分号通道实锤），exit=0 |
| 4 | f-css02-mut-a-newanchor-red.raw.txt | 变异 a②：还原新锚（cp 备份还原 diff 空自证）复跑 | 1 failed，exit=1 |
| 5 | f-css02-mut-b-newvalue-red.raw.txt | 变异 b：16px（枚举外+带分号）植入→新锚 | 1 failed（样例 `font-size:16p`），exit=1 |
| 6 | f-css02-tsx-global-grep.raw.txt | tsx 全域评估（§4） | 两模式各零匹配 exit=1×2 |
| 7 | f-css02-full-test.raw.txt | 全量 `npm run test` | 156 文件/1466 用例全绿，exit=0 |
| 8 | f-css02-typecheck.raw.txt | `npm run typecheck` | exit=0 |
| 9 | f-css02-lint.raw.txt | `npm run lint` | exit=0 |

还原安全：皮肤件/测试件变异一律 cp 备份法（/tmp 备份→植入/变异→测→cp
还原→diff 空），禁 git checkout（护未提交实现）；备份件还原毕即删（零驻留），
`git status` 皮肤件零残留。

## 4. tsx 评估结论（票面「同步升级评估」落点——预裁③3）

现行 FS_TSX 两锚已是全域正则（`/fontSize:\s*['"`]?\d/`+`/text-\[\d/`），CSS
声明面本次升级后两通道等价达标——**维持不动**。全域证据（f-css02-tsx-
global-grep.raw.txt）：grep 全部 `src/**/*.tsx`（不限四件）两模式
`fontSize:\s*['"`]?\d` 与 `text-\[\d` 各**零匹配**（exit=1×2）——范围无蔓延
确认，无第五处消费，无 BLOCKED 项。

## 5. 弯路与环境教训（补记）

- **本环境 node -e 多行脚本只执行首行**（最小复现实锤：两行脚本仅 line1
  输出）：首跑先红证的植入静默未发生（vitest 假绿）——跑后 grep 复核
  （13.5px 缺席）拦下，改单行脚本重做。教训：植入类变异必须「植入后 grep
  在场确认」前置，不能只信 exit 码。
- **bash 双引号内 `\\\\` 折叠**吞掉正则反斜杠（旧锚模拟首写变形
  `/font-size:s*13.5pxs*;/g`）：console.log 回显当场拦下，改
  `String.fromCharCode(92)` 构造反斜规避 shell 转义重写。

## 6. 自裁申报

1. **植入点**：theme-buttons.css `.syn-btn-primary` 块末（:26 前）——简报③4
   给了 buttons/lineage 两候选，属票面内现场选择，申报留痕。
2. **红时消息样例形态**：`hits.slice(0,3).join(' / ')`——简报③2「红时消息
   含匹配样例」的最小实现；样例=正则匹配串本身（数字+单位首字符，如
   `font-size:13.5p`），检测语义完整、展示截断于单位首字符=正则形态既定，
   申报此边界。
3. **旧锚模拟形态**：整行替换 FS_DECL 为 `/font-size:\s*13\.5px\s*;/g`——
   与批二 `new RegExp('font-size:\\s*13\\.5px\\s*;','g')` 生成形态逐字一致，
   属预裁③5a 既定动作的忠实执行，非语义自裁。
4. 其余（正则形态/用例结构/INV-61 文字/describe 头注口径）全部按预裁③
   原样执行，无越票面决定；未新增依赖；未触碰 locks 命令与 git 写操作。

## 完整 diff（两文件 35+1 行）
diff --git a/docs/invariants.md b/docs/invariants.md
index 74abefe18f..534e216f62 100644
--- a/docs/invariants.md
+++ b/docs/invariants.md
@@ -74,7 +74,7 @@
 
 | INV-59 | 重锚同族配对令（F-A8 门2，2026-09-04 随主链切换落地登记）：标注/AI 段重锚产物 resolved.rects 与 resolved.bands 必须**同几何族**（项几何主链=rectsForOffsetRange 项盒+bandsFromItems 同源派生；S4 DOM 回退层=findRangeAtOffset 行盒+bandsForTextNodes 节点口径同源）——主链禁跨族配对（消 R1：正确 rects×失真 bands 互漂错绑）；跨族配对仅允许显式回退格且属登记边界：**S3b 条目回退**（存量 rects[库]×bandsNearRects[DOM 量测]——现状语义逐位保持）与 **S5/S6 页级回退**（DOM 产物或其抑制后的存量直显）；matchBand 阈值（\|Δcenter\|≤rect.h）仍在为跨格边界兜底 | src/renderer/features/reader/annotation-resolve.ts（ResolvedAnnotation 域内 rects/bands 成对产出+resolveAnnotationRectsItem 同族管线）+annotation-resolve-layered.ts（三层编排=同族配对的编排保证——主链产物 rect/band 同域，跨族仅在登记回退格） | 单测（annotation-layer.test F-A8 门2 describe：S2 项几何产物 rect/band 同族数值断言（块几何=band 几何同基线）+S3b/S6 回退格跨族配对=登记边界渲染断言；anchor-item-verify.test：resolveAnnotationRectsItem 产物与 itemSelectionGeometry 同参直调逐位一致（rects+bands 双断言）） | 已锚定（单测级 F-A8 门2 本单——证据件 anchor-item-verify.test.tsx 为门 0 遗留未跟踪件,随门 2 收口提交补 git add 后生效[门二 W1 标注]） |
 | INV-60 | 重锚显示覆盖登记（F-A8 门2，2026-09-04 随主链切换落地登记）：重锚成功产物（项几何主链/S4 DOM 回退层）覆盖库值 rects **仅显示层、永不回写**（annotation.rects 库数据零迁移零触碰——重锚是渲染态推导非数据变更；INV-37 只覆盖拖选期不扩其文，本条另立）；产物域标记 source:'item'\|'dom' 随 resolved 运行时走（调试面=渲染块 data-source 属性+单测断言面；**不入库**=Annotation 模型锁面零触碰），渲染行为零差（色块样式不区分源） | src/renderer/features/reader/annotation-resolve.ts（ResolvedAnnotation.source 可选域）+AnnotationLayer.tsx/AiAnnotationLayer.tsx（data-source 调试属性）+annotation-resolve-layered.ts（markSource 唯一标域点） | 单测（annotation-layer.test/ai-annotation-layer.test F-A8 门2 describe：域标记断言（S0/S4='dom'/S2='item'/S3b·S6 抑制=无标记）+M3 主链换 DOM 变异→域标记断言红证在档；e2e reader-text「划选高亮后重开仍在原位」INV-51 稳态口径回归=显示覆盖不回写的端到端面） | 已锚定（单测级 F-A8 门2 本单；e2e 面随全量 reader-text 回归） |
-| INV-61 | 字号六档语义刻度单源：font-size 消费面禁字面量（CSS 声明/inline/arbitrary），tailwind text-xs/text-sm 经 v4 @theme 重绑到 --fs-* token——档位与锚值变更=用户裁决+本册 | P7D-01 批二用户裁决 2026-09-08（docs/design/2026-09-08_p7d01-b2-fontscale-ruling.md）；token 定义=src/renderer/shared/theme.css :root --fs-* 段+@theme 重绑块，消费面=四皮肤件+library.css+workspace.css+四 tsx inline+tailwind 类 | theme.test.ts（TOKENS 六正锚+FS_LITERALS 负锚矩阵（font-size 声明形态口径——px 通用值纯文本计数不可行）+@theme 重绑锁）+library-cards.test.tsx 三断言随迁 token 载体（实现者自裁申报在档） | 已锚定（2026-09-08 批二） |
+| INV-61 | 字号六档语义刻度单源：font-size 消费面禁字面量（CSS 声明/inline/arbitrary），tailwind text-xs/text-sm 经 v4 @theme 重绑到 --fs-* token——档位与锚值变更=用户裁决+本册 | P7D-01 批二用户裁决 2026-09-08（docs/design/2026-09-08_p7d01-b2-fontscale-ruling.md）；token 定义=src/renderer/shared/theme.css :root --fs-* 段+@theme 重绑块，消费面=四皮肤件+library.css+workspace.css+四 tsx inline+tailwind 类 | theme.test.ts（TOKENS 六正锚+FS 正则全域负锚（任意数字 font-size 声明归零——新值/无分号/大小写/非 px 单位通道闭合；2026-09-09 F-CSS-02 升级）+@theme 重绑锁）+library-cards.test.tsx 三断言随迁 token 载体（实现者自裁申报在档） | 已锚定（2026-09-08 批二） |
 
 ## 维护规则
 
diff --git a/tests/unit/renderer/theme.test.ts b/tests/unit/renderer/theme.test.ts
index daaf899cd9..d48893416b 100644
--- a/tests/unit/renderer/theme.test.ts
+++ b/tests/unit/renderer/theme.test.ts
@@ -393,11 +393,14 @@ describe('P7D-01 批二 字号六档语义刻度防线（消费面负锚+@theme
    * 裁决预期非缺陷+17 处仅换载体零视觉差）；tailwind text-xs×131/text-sm×25 经
    * v4 @theme 重绑并入单源（arbitrary 值 text-[10px] 不受重绑——tsx 面单改
    * var 载体）。
-   * 负锚口径注记（与批一 DURATION_COUNTS 的差异）：px 是通用长度单位
-   * （padding/radius/border 同值并存——实测 theme.css '12px' 现状 1 次为
-   * --radius-m 定义行，皮肤件非 font-size 声明同值多见），纯文本计数必误咬；
-   * 故负锚锚定「font-size: <字面量>;」声明形态（七 CSS 全 0），token 定义行
-   * 由 TOKENS 六正锚独立锁定——防护语义等价（定义正锚+消费负锚）。
+   * 负锚口径注记（F-CSS-02 升级 2026-09-09——正则全域形态）：px 是通用长度
+   * 单位（padding/radius/border 同值并存——纯文本计数必误咬，批二教训），
+   * 故负锚不锚文本计数而锚「任意数字 font-size 声明」正则全域归零——
+   * /font-size:\s*[\d.]+\s*[a-z%]/gi：数字后跟任意单位首字符即拦（px/pt/em/
+   * rem/% 全覆盖）；i 防大写变体绕过；不依赖尾分号（块末声明合法无分号
+   * 形态同拦）——较批二字面量枚举矩阵闭合其漏三通道（枚举外新值/无分号/
+   * 大小写与非 px 单位）；var(--fs-*) 载体值首字符 v 非数字不误咬；token
+   * 定义行由 TOKENS 六正锚独立锁定——防护语义等价（定义正锚+消费负锚）。
    */
   const wsFsCss = readFileSync(
     fileURLToPath(new URL('../../../src/renderer/features/workspaces/workspace.css', import.meta.url)),
@@ -412,13 +415,10 @@ describe('P7D-01 批二 字号六档语义刻度防线（消费面负锚+@theme
     ['library.css', libCss],
     ['workspace.css', wsFsCss]
   ]
-  const FS_LITERALS = [
-    '9.5px', '10px', '10.5px', '11px', '11.5px', '12px',
-    '12.5px', '13px', '13.5px', '14px', '15px', '17px'
-  ]
-  const FS_COUNTS: Array<[string, string, string]> = FS_CSS.flatMap(([name, text]) =>
-    FS_LITERALS.map((lit) => [lit, name, text] as [string, string, string])
-  )
+  /** 任意数字 font-size 声明（数字后必跟单位首字符）——七件全域归零负锚
+   *  （F-CSS-02：g 全域计数+i 大小写不敏感+无分号依赖；match 带 g 不受
+   *  lastIndex 跨用例污染） */
+  const FS_DECL = /font-size:\s*[\d.]+\s*[a-z%]/gi
   const FS_TSX = [
     '../../../src/renderer/features/lineage/LineageNodeMeta.tsx',
     '../../../src/renderer/features/lineage/LineageNodeCard.tsx',
@@ -428,13 +428,10 @@ describe('P7D-01 批二 字号六档语义刻度防线（消费面负锚+@theme
     .map((rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8'))
     .join('\n')
 
-  it.each(FS_COUNTS)(
-    'font-size 声明字面量 %s 在 %s 消费后归零（字号单源=--fs-* token）',
-    (lit, name, text) => {
-      const decl = new RegExp(`font-size:\\s*${lit.replaceAll('.', '\\.')}\\s*;`, 'g')
-      expect((text.match(decl) ?? []).length, `${name} 禁 font-size: ${lit} 字面量回填`).toBe(0)
-    }
-  )
+  it.each(FS_CSS)('%s 禁任意数字 font-size 声明（正则全域负锚——字号单源=--fs-* token）', (name, text) => {
+    const hits = text.match(FS_DECL) ?? []
+    expect(hits.length, `${name} 禁数字 font-size 声明回填（匹配样例：${hits.slice(0, 3).join(' / ')}）`).toBe(0)
+  })
 
   it('四 tsx 禁 fontSize 数值字面量（inline 字号消费仅 var(--fs-*) token）', () => {
     expect(FS_TSX, '票面明文形态：单引号数字开头').not.toContain("fontSize: '1")

## 证据摘录
### 先红证（13.5px 无分号植入→1 failed）
[31m[1m[7m FAIL [27m[22m[39m tests/unit/renderer/theme.test.ts[2m > [22mP7D-01 批二 字号六档语义刻度防线（消费面负锚+@theme 重绑锁）[2m > [22mtheme-buttons.css 禁任意数字 font-size 声明（正则全域负锚——字号单源=--fs-* token）
[2m      Tests [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m131 passed[39m[22m[90m (132)[39m
exit=1
### 变异 a 旧锚模拟（带分号——植入无分号 13.5px 不红=旧锚漏通道）

exit=0
### 变异 a 新锚（同植入→红）
[2m      Tests [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m131 passed[39m[22m[90m (132)[39m
exit=1
### 变异 b 新值 16px（枚举外→新锚红）
[2m      Tests [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m131 passed[39m[22m[90m (132)[39m
exit=1
### tsx 全域评估 grep（两模式零匹配）
Wed Sep  9 03:21:11     2026
mode1 exit=1 (1=零匹配)
# 模式2: text-[数字] arbitrary 字号 class
mode2 exit=1 (1=零匹配)
### 全量 test（156 文件/1466 用例）+typecheck+lint
[2m      Tests [22m [1m[32m1466 passed[39m[22m[90m (1466)[39m
exit=0
exit=0
exit=0
