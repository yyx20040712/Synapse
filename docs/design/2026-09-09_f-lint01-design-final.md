# F-LINT-01 终裁版设计书——INV-11 lint 机器化（GLM5.3 主控终裁档）

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
61 行+tsx inline 颜色 6 处。命中构成分型（门一 W5 精度修正）：**同值多源
实锤子集=真 INV-11 违规**（#ffffff 11+ 处/rgba(255,255,255,*) 变体群/
#e81123×2）；一次性唯一字面量+7 注释行=**严于 INV-11 字面的 token 化
未达面**（C-4 设计目标本就严于 INV-11 字面）。**颜色消费面 token 化迁移
从未发生过**（批二清的是 font-size；「已知双源残留清零」仅指数值域 UBS
标题 max(200)）——61+6 命中构成颜色 token 化前置缺失的直接证据。

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
