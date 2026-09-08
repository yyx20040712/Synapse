你是 F-LINT-01 工单（INV-11 lint 机器化——设计链三跳+实现三屋）的门一对抗深审员。只读审计——只看本审计包（票面+终裁档+设计链两跳档摘要+实现者报告+diff+证据摘录）,禁接触仓库/禁跑命令/禁臆测包外事实。铁律：每条 finding 给 [B|W|N]+行号/diff 摘录。中文输出。

本票特殊性=设计链三跳（Kimi 拟定→deepseek 审核→GLM5.3 终裁）后实现期暴露设计前提错误（C-4/B-5 存量零误报验收与存量 61+6 真违规互斥）→主控终裁改向（C-8 照落+颜色面顺延 F-CSS-03 新票）——**改向决策本身在你审计面内**。

工单：A 母本符合度（终裁档 §1 MVP 原文+§5 修正节 vs 实现 diff——C-8 落地形态[提取哨兵/walk 零文件哨兵/单源提取]/C-4+B-5 不落码[eslint.config.js 零改动]/INV-11 修正措辞逐字/扩展面不实现）;B 宪法红线（受锁两件预解锁工作流/UTF-8/check-quality ≤500/票面目标「INV-11 已锚定」与实际达成「部分→机器面扩展」的落差——主控已裁诚实分级+F-CSS-03 立案,你可攻击此处置;C-4/B-5 作废红证保留+头行标注的档案纪律）;C 代码与测试质量——**附加强制审项=关卡哨兵专项**：①提取正则 /FS_DECL = \/(.+)\/gi/ 的稳健性（贪婪匹配/FS_DECL 行形态变更场景/多 FS_DECL 出现场景——match 取第一处,若未来测试文件出现第二处 FS_DECL 声明会提哪处）②`if (!fsDeclRe) break` 跳过循环的行为（哨兵已红时循环跳过=不产生重复违规——行为推演）③walk 面收敛（src 递归 .css——node_modules 不在 src 内无需排除?out/ 呢——out 在仓库根非 src 内）④正则构造 new RegExp(m[1],'gi') 的转义保真（m[1] 从字面正则源文本重建——[/] 与 \s 等序列保真推演）⑤红证①探针文件植入法的等价性（vs 在既有 CSS 植入——实现者自裁「双重覆盖等价」论证核）;D 报告诚实性（BLOCKED 申报如实性/回炉 1 落地清单 vs diff/自裁申报七项/「§1-§7 历史快照保留+C-4/B-5 临时实现留档=F-CSS-03 设计输入」的完整性）;E 接缝与后续单（F-CSS-03 票面要素完备性[61+6 数据/同值分布/token 盘点需求/§6.2 验收成本]——终裁档 §5 是否给了 F-CSS-03 足够设计输入/B-1 扩展面跨文件 state 设计注记/方法论教训候选「设计期存量 dry-run 实证」的表述准确性）。

主控已预裁项（可攻击但推翻需更强依据）：
1. 终裁改向（C-8 独立落地+颜色顺延）——理由=61+6 真违规非误报/颜色 token 化=白天场视觉票/夜间批视觉决策零承担铁律;
2. INV-11 不升「已锚定」诚实分级「部分→机器面扩展」;
3. C-4/B-5 作废红证保留不删（档案纪律）+临时实现留档报告;
4. B-1 降扩展面（eslint 单文件隔离模型——deepseek CR2 采纳）。

输出：[B|W|N] 逐条+证据+统计+总评（PASS/PASS_WITH_WARNINGS/BLOCKED）。

=== 审计包正文 ===
## 票面（registry 摘要）
  { id: 'F-CSS-02', file: 'tests/unit/renderer/theme.test.ts', area: 'ui-kit', owner: 'strong', status: 'done', summary: 'theme.test 负锚升级=正则全域归零（2026-09-08 批二门一 C-2C-3 建议+用户裁决 2026-09-09 立案夜间批——枚举式覆盖<INV-61 登记语义）:FS_LITERALS 负锚矩阵（12 字面量×7 文件 it.each,font-size 声明形态口径）升级为**正则全域「任意数字 font-size 声明归零」**——七 CSS 文件断言 /font-size:\s*[\d.]+px\s*;/ 计数=0（token 定义行 var() 形态不匹配——禁字面量语义全覆盖,新增 13px/任意值/新文件自动被拦,枚举漏新值通道闭合）;**去分号依赖**（现行锚尾分号,`font-size:12px` 无分号形态绕过通道闭合——正则分号可选或行界锚定,实现者现场定+先红证）;tsx 形态锁同步升级（fontSize: 数字 inline 同构归零面评估——票面范围=CSS 七件+四 tsx,升级面与现行 2 形态锁衔接）;受锁流程 unlock→改→apply;验收=先红（临时在皮肤件加 font-size:13.5px 一处→新锚红→还原）+变异红证（现行枚举锚删一组→新锚仍拦=升级不弱化证明）+verify 全链;INV-61 测试列注记同步（锚形态升级回注）;**毕 2026-09-09 夜间批三屋全链**：正则终态 v2=/font-size:[^;{}]*[\d.]+\s*[a-z%]/gi（值段中缀全域——[^;{}]* 不跨声明界+数字后任意单位首字符+i 大小写+无分号依赖;**五通道闭合=枚举外新值/无分号/大小写/非 px 单位/calc 载体**[calc/clamp/min/max 嵌套字面量同拦,calc(var+Npx) 混合咬 Npx 无单位乘算不误咬——门一 R1 W2 发现回炉 1 闭合];font 简写/冒号前空白/无单位零=已知边界入册登记）;用例 84→7（FS_LITERALS/FS_COUNTS 死代码清删,1543→1466 基线推进主控记账）;tsx 评估=现行两锚已全域达标维持+全域 grep 零匹配（第五处零蔓延确认）;门一 Kimi K3 两轮 R1 PWW 0B/4W/9N+W2 calc 通道发现（四通道独立推演含 .5px/1.5e2px 疑似漏洞实闭合确认）→R2 三修全 ADDRESSED+3N（册文绝对化/calc 入册/注释内联——主控直改册文一行收口:值段措辞+五通道+三残余形态边界;W1 新文件通道=票面歧义句按值通道解,文件面转 F-LINT-01 lint 设计输入）+N9 五通道实列;实现者 GLM5.3flash[环境统一档]两轮（含 node -e 多行假绿弯路自曝+grep 拦截重做）;门二统一档同源欠账 PASS 无条件（独立复算七件零匹配+四反例全对+变异 calc 植入恰 1 红还原空+1466 全量亲跑;另 2N=check-tickets F 系盲区既有边界+本注记落笔兑现）;先红+变异 a/b/c 三支证据链在档（f-css02-*.raw.txt 19 件+gate1 两轮+gate2）;INV-61 册文回注五通道口径;locks 287 重锁（两受锁件 sha 更新）;verify 156 文件/1466 用例 exit=0 亲验' },
  { id: 'F-LINT-01', file: 'eslint.config.js', area: 'infra', owner: 'strong', status: 'open', summary: 'INV-11 lint 机器化（类型/颜色/文案/数值单一真相源禁令的机器锚定——v50/v51 两度留用户裁决优先级,2026-09-09 用户裁决纳入夜间批）;**设计链三跳强制**（methodology §4.5 架构/技术路线位）:Kimi K3 拟定设计书（lint 规则设计——What to lint:单源禁令的机检面枚举【已知双源残留清零后防线仍人审——哪些形态可机检:重复字面量魔法值/同值双声明/常量旁落;哪些不可:语义等价两实现——设计书须逐形态裁决可检性+误报面】+规则形态选型【no-restricted-syntax 自定义 selector/AST 遍历插件/文本 grep 关卡——三案对比】+实施分期）→deepseek 对抗审核（ENDORSE/CR×N）→GLM5.3 主控终裁;实现=终裁版落地（eslint.config.js 受锁+[locked-change]或 check-quality 关卡——按设计书终态）;验收=规则先红证（植入双源反例→红→删）+全量 verify 绿（存量零误报——现存代码单源达标面）+INV-11 状态「部分」→「已锚定」升格登记;预算面:设计链外跳两场+实现三屋全链——夜间批压轴位（前置 F-TOOL-01/F-CSS-02 收口后启动;网络断则按闲时纪律顺延留次日）' },

## 终裁档全文（含 §5 修正节——实现唯一真相源）
> 设计链三跳毕：Kimi K3 拟定 v1（f-lint01-design-kimi.md）→deepseek v4flash
> 对抗审核（f-lint01-review-ds.md，ENDORSE_WITH_CHANGES+3CR+6 增量攻击面）
> →GLM5.3 主控终裁（本档=实现唯一真相源；冲突以本档为准）。

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

- B-1 同值双常量（跨文件+白名单+**独立聚合 pass 前置设计**——eslint 单
  文件隔离模型约束）→warn 试运行。
- B-2 常量旁落清单制（首批=已锚常量；清单自校验哨兵随附）。
- B-6/B-9 同名类型跨文件重复（豁免表：Props/State/T 通用名+tests/ 面）。
- C-3 重复字面量计数（N≥3 warn 试运行）。

## 3. 不做面（INV-11 人审残留登记）

结构等价异名类型/文案双源语义判定/泛化魔法值提炼/CSS-in-JS（本仓无此
形态）/*!important 与 media 重定义 token（现状零形态，边界知悉）。

## 4. INV-11 升格措辞（invariants.md 状态列）

> 强制方式=机器锚定+人审残留（lint 段 inline 颜色 rule 内联 eslint.config
> +quality 段全量 CSS 字号/颜色负锚——新文件自动入锚+提取/零文件哨兵；
> 2026-09-09 F-LINT-01）；人审残留面在册=结构等价类型/文案双源/泛化魔法值
> /CSS-in-JS（本仓无形态）。状态=**已锚定（机器面；扩展面备案 registry）**

## 5. 修正节（2026-09-09 实现期主控终裁——范围修正）

**设计前提错误暴露**：§1 MVP 的 C-4/B-5「存量零误报」验收与存量事实互斥
——实现者 BLOCKED 实证（f-lint01-impl.report.md）：CSS 颜色字面量消费存量
61 行（同值多源实锤：#ffffff 11+ 处/rgba(255,255,255,*) 变体群/#e81123×2）
+tsx inline 颜色 6 处。**颜色消费面 token 化迁移从未发生过**（批二清的是
font-size；「已知双源残留清零」仅指数值域 UBS 标题 max(200)）——61+6=真实
INV-11 违规存量，非误报。

**修正终裁**：
1. **C-8 照落**（字号面存量绿实证——红证①④在档）；**C-4/B-5 不落码**，
   其设计与临时实现（报告内全文）=F-CSS-03 设计输入留档；
2. **F-CSS-03 立案**（颜色 token 化战役票——白天场：token 档位盘点/61+6
   迁移/§6.2 定向验收三件套[载体迁移零视觉差面]/清理毕落 C-4+B-5 关卡
   ——本档 §1 C-4/B-5 原文即其设计基线）；
3. **INV-11 升格措辞修正**：不升「已锚定」——「部分（机器面扩展：字号
   全量负锚已锚 2026-09-09；颜色面 61+6 存量违规 F-CSS-03 立案；数值/
   文案/结构人审残留）」诚实分级；
4. **教训（methodology 候选）**：关卡类规则设计期必须先做**存量形态
   dry-run 实证**——「存量零误报」验收项在设计链三跳中均未前置验证
   （Kimi 风险自认/deepseek 误报面推演/主控终裁三方齐漏），实现期才
   暴露=一轮实现成本。终裁档 §1 验收①含「存量全仓零误报」却未要求
   设计期先跑存量统计——验收项存在≠已验证。

## 设计链前两跳摘要（完整档=scripts/audits/f-lint01-design-kimi.md 与 f-lint01-review-ds.md——摘要:Kimi v1 选型 B+C 组合 A 否决/九形态矩阵/分期 MVP 四项含 B-1;deepseek ENDORSE_WITH_CHANGES 3CR[C-8 单源提取采纳/B-1 降级/C-4 token 并集+B-6 豁免]+6 增量攻击面[CSS-in-JS/七件哨兵/spacing 双源/!important/空集哨兵/并发缓存]）

## 实现者报告全文（BLOCKED 轮+回炉 1 轮全档案——含 C-4/B-5 临时实现全文=F-CSS-03 设计输入）
# F-LINT-01 实现者报告——**BLOCKED**（C-4/B-5 存量面不可绿，卡点上报主控重裁）

> 档位：GLM5.3flash（实现者位；本环境 Agent 工具无 model 参数=统一档，如实记）。
> 真相源：docs/design/2026-09-09_f-lint01-design-final.md（终裁档）；
> 执行展开：f-lint01-impl-brief.md（冲突以终裁档为准）。
> 结果一句话：三关卡按预裁逐字临时落码、四支红证全取、关卡真红能力全证；
> 但 C-4 在存量树上命中 **61 行**、B-5 命中 **6 处**——⑤.2「存量绿（零误报）」
> 与③预裁规约**不可兼得**，且改动面锁死恰三文件无法清理存量 → 按纪律
> 「卡点=BLOCKED 停手」处置：**零永久改动**，全部临时植入已还原（diff 空），
> 本报告=卡点+机器实证+处置选项（留主控裁决）。

## 1. 实现摘要（BLOCKED——未落永久码）

- **工作树零改动**：三目标文件（check-quality.mjs / eslint.config.js /
  invariants.md）与 HEAD 逐字节一致（还原后 `diff` 三连空+`git status`
  无跟踪文件改动，实测在档）；INV-11 升格未执行（升格措辞含「颜色负锚」，
  在 C-4/B-5 落地前为失实陈述，见 §6 选项④）。
- **临时植入取证法**（简报④ cp 备份法，反向应用）：cp 备份三文件 →
  按简报③预裁**逐字**植入 C-8/C-4（check-quality.mjs 新第 6 关卡段）+
  B-5（eslint.config.js 内联 rule 块）→ 存量树跑两关取红证 → 四支红证 →
  cp 还原 → diff 空 → 复跑两关绿。临时版行数：check-quality.mjs
  172→202 行、eslint.config.js 192→231 行（编辑增量计算，均远低于 500 限）。
- **关卡本身全部验证通过**：C-8 提取单源/双哨兵/C-4 行级豁免/B-5 AST
  面均按预裁工作（四支红证在档 §4）——**卡点不在关卡实现，在存量树
  与关卡规约的相容性**（§2）。

## 2. 卡点（机器实测——本报告核心）

### 2.1 C-4 存量 61 行命中（quality:check exit=1）

临时植入后 `npm run quality:check` 对**未做任何修改的存量树**输出 61 条
C-4 违规（`f-lint01-blocked-quality.raw.txt`，exit=1）。分文件/分型（探针
实测）：

| 文件 | 命中行数 | 型 |
| --- | --- | --- |
| theme-shell.css | 21 | 声明+注释 |
| workspace.css | 11 | 声明为主 |
| theme-buttons.css | 9 | 全声明 |
| text-layer.css | 7 | 注释为主 |
| theme-lineage.css | 6 | 声明为主 |
| library.css | 4 | 声明 |
| theme.css | 3 | 声明+注释 |
| **合计** | **61** | **54 声明行 + 7 注释行** |

样例（与红证②植入形态**逐字同构**）：theme-buttons.css:17
`color: #ffffff;`、theme-shell.css:121 `background: #e81123;`、
theme-lineage.css:128 `color: #6b7280;`（INV-41 登记的边标签色）、
workspace.css:17 `border: 1px solid rgba(44, 95, 138, 0.55);`。

### 2.2 B-5 存量 6 处命中（lint exit=1）

临时植入后 `npm run lint` 输出 6 个 `synapse/no-inline-color` error
（`f-lint01-blocked-lint.raw.txt`，exit=1）——全部是 JSX style 属性内
Literal 命中 C-4 同款正则：

1. src/renderer/shared/ui/SplitPane.tsx:175（background 渐变含 rgba）
2. src/renderer/features/reader/PageBox.tsx:49（boxShadow rgba）
3. src/renderer/features/reader/PageBox.tsx:56（background '#ffffff'）
4. src/renderer/features/reader/SelectionToolbar.tsx:43（boxShadow rgba）
5. src/renderer/features/reader/AnnotationEditor.tsx:41（boxShadow rgba）
6. src/renderer/features/reader/AnnotationEditor.tsx:63（color '#ffffff'）

（面外确认：LineageSide* 系列的模块级 const 样式对象/SVG fill 属性/
pdfjs render 参数/PAINT_BG 常量均不在 B-5 AST 面内，不计。）

### 2.3 C-8 存量 0 命中（唯一可独立落地项）

FS_DECL 提取（`/FS_DECL = \/(.+)\/gi/` 对 theme.test.ts:425）成功，
`font-size:[^;{}]*[\d.]+\s*[a-z%]` 对全部 8 件存量 CSS match 计数=0
（blocked-quality.raw 中零「字号字面量」条目）——C-8 可独绿。

### 2.4 卡点定性：票面内部自相矛盾（非实现问题）

- 终裁档验收①红证②「既有 CSS 非定义行含 `color: #aabbcc`→C-4 红」——
  存量 theme-buttons.css:17 `color: #ffffff;` 与之**同构**。同一规则
  不可能既咬植入反例又放行存量：**红证②与验收②（存量全绿）在当前仓库
  状态下互斥**。
- 根因（设计链回溯）：Kimi v1 §1 可检性矩阵 #4 假设「token 文件外消费
  全走 var()」（「token 文件（⚠假设存在）豁免」）；deepseek CR 谈的是
  多 `:root` 聚合与提取哨兵（同样假设消费面干净）；终裁 CR3a「改简」
  （豁免=行级 `--name:` 定义行）**三跳均未对存量树实测**——F-CSS-01 的
  token/皮肤域分离架构下，皮肤域五件（theme-buttons/shell/lineage/
  library/workspace）本来就是用一次性字面量做皮肤的地，61 行是**架构
  现状**而非新债务。
- B-5 同病：终裁档「var() 载体 Literal 不命中天然豁免」的假设只对了一半
  ——存量确有 6 处 var() 之外的字面量消费（shadow/渐变/纯白底）。

## 3. 哨兵设计说明（临时版结构——已还原，重裁落码时直接复用）

双哨兵落点（临时版 check-quality.mjs 第 6 关卡段首，还原前结构；行号
按临时版 202 行文件计）：

- **提取失败哨兵（双支）**：①readFileSync 失败 → try/catch push
  「哨兵：theme.test.ts 读取失败（原因）——文件缺席即关卡失能」；
  ②`.match(/FS_DECL = \/(.+)\/gi/)` 捕获 null → push「哨兵：
  theme.test.ts FS_DECL 提取失败（match null）——哨兵正则或常量行变更」。
  红证④实测②支真红（§4）。
- **零文件哨兵**：`walk(join(root,'src'), .css)` 空数组 → push「哨兵：
  src 下 walk 零 CSS 文件——结构失能」。**未单独红证**——触发需删光
  全部 8 件存量 CSS（不可达态），如实注记；规约内建、代码随本报告 §7
  备份可复用。
- 临时版两段代码（重裁后可直接落码——C-4 是否落/以何形态落由主控裁）：

```js
// check-quality.mjs 第 6 关卡段（临时版全文——植入于第 5 关卡与出口之间）
const themeTestPath = join(root, 'tests', 'unit', 'renderer', 'theme.test.ts')
let fsDeclRe = null
try {
  const m = readFileSync(themeTestPath, 'utf-8').match(/FS_DECL = \/(.+)\/gi/)
  if (m) fsDeclRe = new RegExp(m[1], 'gi')
  else violations.push('哨兵：theme.test.ts FS_DECL 提取失败（match null）——哨兵正则或常量行变更（F-LINT-01 C-8）')
} catch (e) {
  violations.push(`哨兵：theme.test.ts 读取失败（${e.message}）——文件缺席即关卡失能（F-LINT-01 C-8）`)
}
const cssAll = walk(join(root, 'src'), (p) => p.endsWith('.css'))
if (cssAll.length === 0) violations.push('哨兵：src 下 walk 零 CSS 文件——结构失能（F-LINT-01 C-8/C-4）')
const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/
for (const f of cssAll) {
  const rel = relative(root, f).replaceAll('\\', '/')
  const content = readFileSync(f, 'utf-8')
  if (fsDeclRe) {
    const hits = content.match(fsDeclRe) ?? []
    if (hits.length > 0) violations.push(`${rel}: CSS 字号字面量 ${hits.length} 处（单源=--fs-* token；样例：${hits.slice(0, 3).join(' / ')}）`)
  }
  content.split('\n').forEach((line, i) => {
    if (/^\s*--[\w-]+\s*:/.test(line)) return
    if (COLOR_RE.test(line)) violations.push(`${rel}:${i + 1}: CSS 颜色字面量消费（单源=--* token）：${line.trim().slice(0, 80)}`)
  })
}
```

```js
// eslint.config.js B-5 块（临时版全文——插于 tests 段之前）
{
  files: ['src/renderer/**/*.tsx'],
  plugins: {
    synapse: {
      rules: {
        'no-inline-color': {
          create(context) {
            const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/
            return {
              JSXAttribute(node) {
                if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'style') return
                const v = node.value
                if (!v || v.type !== 'JSXExpressionContainer') return
                const obj = v.expression
                if (!obj || obj.type !== 'ObjectExpression') return
                for (const prop of obj.properties) {
                  if (prop.type !== 'Property') continue
                  const val = prop.value
                  if (!val || val.type !== 'Literal') continue
                  const s = String(val.value)
                  if (COLOR_RE.test(s)) {
                    context.report({ node: val, message: `inline style 颜色字面量 "${s}"——颜色消费单源=--* token（INV-11）` })
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  rules: { 'synapse/no-inline-color': 'error' }
}
```

## 4. 四支红证清单（各 raw 在档，均 exit=1）

| 支 | raw 文件 | 关键证据行（实测输出） |
| --- | --- | --- |
| ① C-8 红 | f-lint01-red1-c8.raw.txt | 新建 `f-lint01-probe.css`（含 `font-size: 12px`）自动入锚：「CSS 字号字面量 1 处（单源=--fs-* token；样例：font-size: 12p）」——新文件自动入锚实证（样例截断至 12p=FS_DECL 原正则贪婪回溯行为，与受锁测试锚同源一致，非移植缺陷） |
| ② C-4 红 | f-lint01-red2-c4.raw.txt | 「f-lint01-probe.css:1: CSS 颜色字面量消费（单源=--* token）：.f-lint01-probe { color: #aabbcc; }」（本支在哨兵窗内执行——输出首行含哨兵红属预期，C-4 行按消息文本归因；另被 §2.1 存量 61 处现役命中双重覆盖） |
| ③ B-5 红 | f-lint01-red3-b5.raw.txt | 「F-lint01-probe.tsx 2:31 error inline style 颜色字面量 "#fff"——颜色消费单源=--* token（INV-11）synapse/no-inline-color」（另被 §2.2 存量 6 处双重覆盖） |
| ④ 哨兵红 | f-lint01-red4-sentinel.raw.txt | 「哨兵：theme.test.ts FS_DECL 提取失败（match null）——哨兵正则或常量行变更（F-LINT-01 C-8）」（theme.test.ts FS_DECL 临时改名→提取失败支真红；仅跑 quality:check 段，简报④口径） |

## 5. 存量证据（基线绿 ↔ 植入红对照）

| 关 | 基线（干净树） | 植入后（同树） | raw |
| --- | --- | --- | --- |
| quality:check | exit=0 通过 | exit=1（61 条 C-4） | f-lint01-baseline-quality / f-lint01-blocked-quality |
| lint | exit=0 通过 | exit=1（6 error B-5） | f-lint01-baseline-lint / f-lint01-blocked-lint |
| typecheck / test | 未跑 | 未跑 | ——（BLOCKED 于永久实现前，工作树与 HEAD 逐字节一致，两关结果=CI 基线不变；还原后复跑 quality:check/lint 双绿确认还原无残） |

## 6. 处置选项（留主控裁决——实现者不自裁）

1. **存量清理票先行**（建议候选）：F-CSS-03 类新票收编 61 CSS 行+6 tsx
   处（token 化/皮肤域单源化），毕后回本票原样落码（§3 代码可直接复用）。
2. **C-4/B-5 降 warn 试运行**（B-1 先例）：但 quality:check 无 warn 语义
   （violations 数组即 exit 1），需终裁档设计增量定义降级形态。
3. **豁免面重设计**：如皮肤域文件白名单/值域消费白名单（哨兵防漂移随附）
   ——需设计+门审；会实质缩小负锚覆盖面，与「全量负锚」票名相悖，主控权衡。
4. **仅落 C-8+INV-11 部分面**：C-8 独绿已证；但简报③.4 INV-11 措辞含
   「颜色负锚」将失实，措辞需主控重裁后同步收缩。

## 7. 自裁申报

1. **零超票面实现决定**：未落任何永久码、未动 invariants.md、未碰
   locks/git；唯一新增面=本报告+8 个 raw 证据件（scripts/audits 三桶
   口径①桶证据件，随收口由主控处置）。
2. **B-5 落点分歧知悉**（未成永久决定，重裁时留意）：简报③.3「既有段挂」
   与终裁档「files 限 src/renderer/**/*.tsx」字面冲突（renderer 既有段
   files=**/*.{ts,tsx} 非 tsx 专属）——临时实现从终裁档（新配置块）。
3. **红证②③植入法变体**：以「新建探针文件（删除即零残留）」替代「既有
   文件植入」，cp 备份法风险面收窄；既有文件等价形态由存量 61/6 现役
   命中实证覆盖（§2）。
4. **红证②时序注记**：在哨兵窗（theme.test.ts 改名未还原时）执行，输出
   含哨兵行——归因按消息文本区分，raw 原样在档未裁剪。
5. **零文件哨兵未单独红证**：触发需删光全部存量 CSS（不可达态），规约
   内建+代码在档（§3），如实申报。
6. **B-5 正则双写面**：因 BLOCKED 未成永久面；重裁落码时 COLOR_RE 须与
   check-quality.mjs C-4 消费正则文本一致+两文件头注互指（临时实现已按
   此执行，§3 两段代码可查）。
7. **档位如实**：GLM5.3flash 位声明；环境 Agent 工具无 model 参数=
   实际统一档，未冒充定档。

## 8. 回炉 1=范围修正落地（2026-09-09 终裁档 §5——BLOCKED→终裁改向）

**改向**：主控终裁（终裁档 §5 修正节）——§1 BLOCKED 正确（61+6=真违规
非误报：颜色 token 化从未发生）；**C-8 照落+C-4/B-5 不落码**（颜色面=
F-CSS-03 立案顺延——白天场颜色 token 化战役票，清理毕再落；本报告 §3
的 C-4/B-5 临时实现全文=F-CSS-03 设计输入留档不删）。

落地清单结果：

1. **check-quality.mjs**：C-8 段永久落地（第 6 关卡段，+24 行 172→196
   实测）——照搬 §3 临时实现中已验证的 C-8 部分（红证①④同代码），
   去 C-4 消费检查；头注注记 C-4/B-5 顺延 F-CSS-03（终裁档 §5 修正
   终裁 1/2）。哨兵三支（读失败 catch/match null/walk 零文件）全内建。
2. **eslint.config.js**：零改动（HEAD 态——`git diff --name-only` 空证；
   受锁面缩为两件）。
3. **invariants.md :25 INV-11**：两列按主控回炉指令逐字替换——
   强制方式列=「机器锚定（字号面 quality 段全量 CSS 负锚）+审查
   （颜色/数值面——颜色 F-CSS-03 立案）」；状态列=「部分→机器面扩展
   （2026-09-09 F-LINT-01 C-8：…顺延 F-CSS-03 颜色 token 化战役票——
   清理毕即落;人审残留=结构等价类型/文案双源/泛化魔法值）」。
4. **证据重跑（终态口径）**：
   - 终态红证①（新文件植入）：`f-lint01-r1-red1-c8.raw.txt` exit=1
     ——唯一违规=探针 CSS「字号字面量 1 处…font-size: 12p」（新文件
     自动入锚；终态无 C-4，输出干净）；
   - 终态红证④（哨兵支）：`f-lint01-r1-red4-sentinel.raw.txt` exit=1
     ——「哨兵：theme.test.ts FS_DECL 提取失败（match null）」唯一违规；
     theme.test.ts cp 备份法改名→取证→还原 diff 空实测在档；
   - 存量四关全绿：`f-lint01-r1-final-quality.raw.txt`（exit=0，
     C-8 落地后存量零误报）/`f-lint01-r1-final-lint.raw.txt`（exit=0）/
     `f-lint01-r1-final-typecheck.raw.txt`（exit=0）/
     `f-lint01-r1-final-test.raw.txt`（exit=0——156 文件/1466 用例全过，
     与简报⑤.2 口径一致）；
   - 原②③红证文件头已加作废标注行（不删）：f-lint01-red2-c4.raw.txt/
     f-lint01-red3-b5.raw.txt——「作废 2026-09-09 回炉1——C-4/B-5 顺延
     F-CSS-03（终裁档 §5），本红证基于临时全植入版…」。
5. **diff 范围终态**：恰两文件（scripts/check-quality.mjs +24 行、
   docs/invariants.md 1 行替换——`git diff --stat` 实测；eslint.config.js
   零改动）+scripts/audits 证据件（三桶口径①桶）。

### §8 自裁申报（回炉 1 轮增补）

1. **零超票面**：C-8 段照搬已验证临时实现（未重写逻辑）；INV-11 两列
   逐字用主控回炉指令文本（无自撰）。
2. **哨兵支植入法**：FS_DECL 改名经 node 单处 replace（仅命中声明行
   `const FS_DECL = /`——replace 首次匹配语义）+cp 备份法还原 diff 空
   实测；与上轮 Edit 法等价，取单命令原子性。
3. **C-8 段一处防御性写法**（照搬临时版）：`if (!fsDeclRe) break` 守卫
   ——提取失败时跳过文件扫描（哨兵违规已 push 必红），防 null regex
   NPE 崩溃遮蔽哨兵消息；红证④输出=哨兵唯一违规，证明该守卫行为正确。
4. **§1-§7 与 BLOCKED 时点快照保留不改**（历史在档——回炉链完整性；
   §6 选项①被主控采纳为 F-CSS-03 立案）。

## 终态 diff（两文件 25+/1−）
diff --git a/docs/invariants.md b/docs/invariants.md
index ba74dcad94..ce96c027cb 100644
--- a/docs/invariants.md
+++ b/docs/invariants.md
@@ -22,7 +22,7 @@
 | INV-08 | 出网仅白名单 host 且仅手动触发，无后台网络任务 | src/shared/constants.ts + http-client 内强制 | 常量 + 单测 + e2e CSP 断言 | 已锚定 |
 | INV-09 | 渲染层禁止 Node/Electron API 与绝对文件路径 | AGENTS 安全禁令 | ESLint 强制 | 已锚定 |
 | INV-10 | 标注层容器是 stacking context：混合模式必须上容器级（rect 级混合被隔离无效且矩形互相叠乘） | AnnotationLayer.tsx 注释 + 战役报告 | e2e mix-blend 断言 | 已锚定 |
-| INV-11 | 类型/颜色/文案/数值单一真相源（禁止两份等价声明靠注释对齐） | AGENTS 代码组织 | 审查（lint 无对口规则） | **部分**（2026-08-23 UBS：标题 max(200) 收归 NOTE_TITLE_MAX 单源消费——已知双源残留清零；防线仍是人审，机器锚定待 lint 规则设计立项） |
+| INV-11 | 类型/颜色/文案/数值单一真相源（禁止两份等价声明靠注释对齐） | AGENTS 代码组织 | 机器锚定（字号面 quality 段全量 CSS 负锚）+审查（颜色/数值面——颜色 F-CSS-03 立案） | 部分→机器面扩展（2026-09-09 F-LINT-01 C-8：quality 段全量 CSS 字号负锚——新文件自动入锚+提取/零文件哨兵[字号面已锚];颜色消费负锚 C-4/B-5 设计毕[终裁档 §1+§5]因存量 61+6 真违规未清顺延 F-CSS-03 颜色 token 化战役票——清理毕即落;人审残留=结构等价类型/文案双源/泛化魔法值） |
 | INV-12 | 受锁文件变更即时 locks:apply（manifest 与提交同步，禁跨提交延迟） | AGENTS 依赖与提交 | CI locks:check | 已锚定 |
 | INV-13 | IPC Result 折叠约定：service 把业务失败折叠为正常返回时（如 enrichStatus:'failed'、幂等删除 ok:true），消费方必须分支处理、不得无条件按成功提示 | enrich 先例（U1 修复）；reader.service 删除幂等语义 | 人审 + 折叠面清点存档 | **部分**（2026-08-23 UBS 折叠面全量清点：7 service+settings ipc+register 共 8 点，全部消费方已分支或幂等语义正当，无 enrich 同型；清点表=docs/reports/2026-08-23_ubs-sweep.md §B1；新增折叠点须随消费方分支一并过审） |
 | INV-14 | 输入接缝注册/注销成对：快捷键（keymap）、滚轮/指针监听、拖拽期 body 样式副作用必须与挂载源同源清理——消费方清理函数与注册同函数对，卸载/重挂不得残留监听或全局样式；**事件订阅同族（2026-08-27 SR2-AI-04 扩面）：apiEvents 事件订阅（onExportCorpus）与 store 订阅的注销同挂载源成对** | SR2-KEY-01/02、SR2-UIK-01 规约（2026-08-23 P7-A 开单引入，B4 防线后首批 SR2 工单）；SR2-AI-04 useExportCorpusEvents（App 层事件桥） | 单测（keymap.test 12 用例：模块级成对/配对面；reader-shortcuts.test 8 用例：快捷键/滚轮消费方级；split-pane.test 11 用例：指针监听+拖拽期 body 样式副作用的会话清理与中途卸载还原（含 pointercancel 同路径）+corpus-export.test.tsx 事件桥消费方级（挂载订阅一次/卸载成对注销））+ 人审（消费方清理同源） | 已锚定（四面全锚：模块级+快捷键/滚轮消费方级+指针/body 样式面=SR2-KEY-01/02/UIK-01，2026-08-24 P7-A 收口；事件订阅消费方级=SR2-AI-04，2026-08-27） |
diff --git a/scripts/check-quality.mjs b/scripts/check-quality.mjs
index 27f88d81f2..bc63612125 100644
--- a/scripts/check-quality.mjs
+++ b/scripts/check-quality.mjs
@@ -164,6 +164,30 @@ for (const { layer, forbids } of layerRules) {
   }
 }
 
+// 6) [F-LINT-01] C-8 全量 CSS 字号负锚——F-CSS-02 W1 通道闭合（新增 CSS
+//    自动入锚；与 theme.test.ts 七件测试锚=纵深防御，互不替代）。正则
+//    单源=受锁 theme.test.ts FS_DECL 行提取（零正则复制）；读失败/提取
+//    null/walk 零 CSS 文件=哨兵硬红（只哨工具失能态——终裁档 §0 攻击面 5）。
+//    颜色消费负锚 C-4/B-5 设计毕（终裁档 §1）因存量 61+6 真违规未清顺延
+//    F-CSS-03 颜色 token 化战役票——清理毕即落（终裁档 §5 修正终裁 1/2）。
+const themeTestPath = join(root, 'tests', 'unit', 'renderer', 'theme.test.ts')
+let fsDeclRe = null
+try {
+  const m = readFileSync(themeTestPath, 'utf-8').match(/FS_DECL = \/(.+)\/gi/)
+  if (m) fsDeclRe = new RegExp(m[1], 'gi')
+  else violations.push('哨兵：theme.test.ts FS_DECL 提取失败（match null）——哨兵正则或常量行变更（F-LINT-01 C-8）')
+} catch (e) {
+  violations.push(`哨兵：theme.test.ts 读取失败（${e.message}）——文件缺席即关卡失能（F-LINT-01 C-8）`)
+}
+const cssAll = walk(join(root, 'src'), (p) => p.endsWith('.css'))
+if (cssAll.length === 0) violations.push('哨兵：src 下 walk 零 CSS 文件——结构失能（F-LINT-01 C-8）')
+for (const f of cssAll) {
+  if (!fsDeclRe) break
+  const rel = relative(root, f).replaceAll('\\', '/')
+  const hits = readFileSync(f, 'utf-8').match(fsDeclRe) ?? []
+  if (hits.length > 0) violations.push(`${rel}: CSS 字号字面量 ${hits.length} 处（单源=--fs-* token；样例：${hits.slice(0, 3).join(' / ')}）`)
+}
+
 if (violations.length > 0) {
   console.error('quality 检查未通过：')
   for (const v of violations) console.error('  - ' + v)

## 证据摘录（回炉 1 终态）
-- C-8 红证①新 CSS 探针:
  - src/renderer/features/library/f-lint01-probe.css: CSS 字号字面量 1 处（单源=--fs-* token；样例：font-size: 12p）
exit=1
-- 哨兵红证④提取失败:
  - 哨兵：theme.test.ts FS_DECL 提取失败（match null）——哨兵正则或常量行变更（F-LINT-01 C-8）
exit=1
-- 存量四关:
exit=0
exit=0
exit=0
exit=0
f-lint01-r1-final-lint.raw.txt
f-lint01-r1-final-quality.raw.txt
f-lint01-r1-final-test.raw.txt
f-lint01-r1-final-typecheck.raw.txt
f-lint01-r1-red1-c8.raw.txt
f-lint01-r1-red4-sentinel.raw.txt
