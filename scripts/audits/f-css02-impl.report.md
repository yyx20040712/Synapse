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

## 7. 更正节（回炉 1·门一 W3 数理更正——以实测口径为准，历史文字不动）

- **§1 「文件 455→451 行」有误**：theme.test.ts 起点实测 **454** 行
  （`git show HEAD:tests/unit/renderer/theme.test.ts | wc -l`）；首轮实现后
  451 行（454→451 净 −3，单文件 **16+/19−**——与门一实测一致）。
- **§1 「17+/20−」归因含混**：该数为 `git diff --stat` **两文件合计**
  （theme.test.ts 16+/19− + invariants.md 1+/1−），原上下文在叙述 theme.
  test.ts 单文件，应写单文件口径 16+/19−。
- **回炉 1 后终态重述（本节口径以此为准）**：theme.test.ts **455 行**
  （451→455 净 +4=头注扩 3 行+FS_DECL 注释扩 1 行）；`git diff --stat`
  终态=两文件 **21+/20−**（theme.test.ts 20+/19− + invariants.md 1+/1−），
  454→455 与 +20/−19 机器输出自洽；全量用例数 **1466 不变**（it 数结构
  未动，r1 全量绿复核）。
- **报告其余数字复核**（逐项对机）：§1 209→132（−77=84 枚举负锚−7 正则
  负锚）与 1543→1466 均机器输出 ✓；§1/§2「25 处 font-size 声明全 var
  载体」「七件零匹配」grep 实测 ✓；§3 表内全部 pass/fail 数与 exit 码均
  tee 落盘原文 ✓——除上述两项外无其他更正。
- **行号漂移声明**：§1/§6 历史文字中「:396-400」「:26 前」等行号为当轮
  快照，回炉后已漂移，历史文字不动。

## 8. 回炉 1 记录（门一 PWW 0B/4W/9N——主控裁决 3 修+2 不修）

### 8.1 修 1·W2 calc 绕行通道闭合

**正则终态（v2）**：

```js
const FS_DECL = /font-size:[^;{}]*[\d.]+\s*[a-z%]/gi
```

值首字符前缀锚 → 值段中缀全域：`[^;{}]*` 不跨声明界（`;`/`{`/`}` 即停）
而声明内扫全，calc/clamp/min/max 载体内字面量同拦。

**误咬面推演（沙箱 18/18 机器实证=f-css02-r1-regex-sandbox.raw.txt）**：

| 形态 | 判定 | 机理 |
|------|------|------|
| `var(--fs-body)` 纯载体（带/无分号） | 放 ✓ | 六 token 名全字母无数字+现状零 fallback 字面量→值段无「数字+单位」 |
| `calc(var(--fs-body) * 2)` 无单位乘算 | 放 ✓ | `2` 后为 `)`，无单位首字符——合法 token 乘算不咬 |
| `calc(12px + var(--fs-body))` / `calc(var(--fs-body) + 12px)` | 咬 ✓ | 值段中缀扫到 `12px`——混合形态 Npx 被咬（票面要求） |
| `clamp(10px, 3vw, 16px)` | 咬 ✓ | 同上中缀机理 |
| 邻声明 `padding: 12px` / 跨块 | 放 ✓ | `[^;{}]*` 遇 `;`/`}` 停——不越声明界 |
| `transition: font-size 0.2s` | 放 ✓ | 锚为 `font-size:` 字面（含冒号），值内词无冒号 |
| `font-size-adjust:` / `--fs-body: 12px` 定义行 | 放 ✓ | 前缀非 `font-size:`（token 定义由 TOKENS 正锚独立锁） |
| 无分号块末/大小写/枚举外新值/百分比/点开头 | 咬 ✓ | v1 既有四通道保持（回归沙箱+变异重跑） |

前提依赖登记（头注已记）：未来 token 名带数字或 var() fallback 写字面量
→负锚会红=负锚前提变化提醒，语义可辩护。注释内示例文本会被咬——W4 主控
已裁严格性非缺陷，知悉不改。

**c 支先红证（calc 植入）**：植入 `font-size: calc(12px + var(--fs-body));`
于 theme-buttons.css `.syn-btn-primary` 块末→v1 正则（回炉前形态）132 全
绿 exit=0（缺口实锤）→还原 v2（cp 备份法 diff 空自证）→1 failed exit=1
（样例 `font-size: calc(12p`）→还原植入（皮肤件 git diff 0 行）。

### 8.2 修 2·W3 数理更正

即 §7（454→451 起点/单文件口径/回炉后 455 终态重述+其余数字复核结论）。

### 8.3 修 3·N9 头注措辞

「闭合其漏三通道（枚举外新值/无分号/大小写与非 px 单位）」（括号列四称
三）→终态「闭合其漏通道（新值/无分号/大小写/非 px 单位/calc 载体——
五通道）」——按终态实列精确表述，theme.test.ts 头注已改。

### 8.4 不修项知悉（主控已裁）

- W1 新文件通道（FS_CSS 七件硬编码 vs 票面「新文件自动被拦」歧义）——
  落 F-LINT-01 lint 面设计输入+registry 注记，实现者不改。
- W4 注释内示例文本误咬——严格性非缺陷，知悉。

### 8.5 回炉 1 证据件清单（scripts/audits/，均含原始输出+exit 码）

| # | 证据件 | 内容 | 结果 |
|---|--------|------|------|
| 1 | f-css02-r1-regex-sandbox.raw.txt | v2 沙箱 18/18 矩阵+V1 calc 缺口实证+七件 V2 零匹配 | ALL PASS，exit=0 |
| 2 | f-css02-r1-targeted-green.raw.txt | v2 clean tree 靶向跑 | 132 passed，exit=0 |
| 3 | f-css02-r1-c-v1-green.raw.txt | calc 植入+v1 正则 | 132 passed（缺口），exit=0 |
| 4 | f-css02-r1-c-v2-red.raw.txt | calc 植入+v2（还原 diff 空） | 1 failed（样例含 calc），exit=1 |
| 5 | f-css02-r1-mut-a-enum-green.raw.txt | 13.5px 无分号+批二枚举锚模拟 | 132 passed（旧锚漏无分号），exit=0 |
| 6 | f-css02-r1-mut-a-v2-red.raw.txt | 还原 v2 复跑 | 1 failed，exit=1 |
| 7 | f-css02-r1-mut-b-red.raw.txt | 16px（枚举外+带分号） | 1 failed，exit=1 |
| 8 | f-css02-r1-full-test.raw.txt | 全量 `npm run test` | 156 文件/1466 用例绿，exit=0 |
| 9 | f-css02-r1-typecheck.raw.txt | `npm run typecheck` | exit=0 |
| 10 | f-css02-r1-lint.raw.txt | `npm run lint` | exit=0 |

还原安全照旧：皮肤件/测试件 cp 备份法（/tmp→变异→cp 还原→diff 空），
备份还原毕即删（零驻留）；皮肤件终态 git diff 0 行；改动面仍恰两文件
（`git diff --stat`：theme.test.ts 20+/19− + invariants.md 1+/1−）。

