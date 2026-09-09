# F-CSS-03 Kimi 补审拼装结论（主控收官档，2026-09-10）

> 背景：首轮门一 131K 审包超 Kimi 网关窗（504×6 两源耗尽）落 deepseek 兜底
> =同源欠账。用户指令补上 Kimi 审计。分片策略（微包探针证实网关活着
> →「输入体量×输出时长」超窗 → U0 diff 四切+材料裁剪+输出精简指令，
> 每片 8-19K）全部过窗成功。
>
> 派发档案：f-css03-kimi-p1~p4-prompt.md（四片包）/f-css03-kimi-p1~p4.md
> （四片回执）/f-css03-ku0-p1~p4.patch（四片 U0 diff）/f-css03-kimi-p*-call
> .raw.txt（路由+usage）。中断实录：f-css03-gate1-kimi-retry-call.raw.txt
> （132K 原包重试 504 中断）+f-css03-kimi-s1-prompt.md（50K 单片策略废弃）。

## 四片总账

| 片 | 面 | B | W | N | 用时/用量 |
| --- | --- | --- | --- | --- | --- |
| p1 | 关卡（C-4/W3/B-5/INV-11） | **1** | 3 | 4 | 124s/in 4.9K/out 3.7K |
| p2 | 测试断言（12 改点+变异锚） | 0 | 3 | 4 | 194s/in 5.0K/out 3.9K |
| p3 | CSS 迁移（48 token 对账） | 0 | 4 | 3 | 196s/in 6.8K/out 6.6K |
| p4 | tsx 迁移（13 文件+var 宿主） | 0 | 4 | 2 | 94s/in 2.4K/out 3.6K |
| 计 | | **1** | 14 | 13 | ~10min/in 19.1K/out 17.8K |

## B 级处置（唯一实质缺陷——已修）

**B-1 [p1] COLOR_RE 缺 `i` 标志——大写 `RGB()/HSL()` 双关卡失明。**
主控核证成立：CSS 函数名 ASCII 大小写不敏感，`color: RGB(255,0,0)` 合法
且渲染生效；原正则 `rgba?\(|hsla?\(` 仅小写=负锚绕过洞；hex 段已含 A-F
加 i 无副作用。
**修复**：check-quality.mjs:199-203+eslint.config.js:203-205 两正则加 `i`
（逐字一致含标志位，注释注明依据）。
**红证**（各 raw 含 exit 真值）：
- f-css03-kimi-b1-red-c4upper.raw.txt：CSS 植入 `color: RGB(1, 2, 3)` →
  quality exit=1+`theme-buttons.css:115` file:line 精确命中 → cp 还原。
- f-css03-kimi-b1-red-b5upper.raw.txt：tsx 探针 `style={{color:"RGB(1,2,3)"}}`
  → lint exit 非 0+`synapse/no-inline-color` 精确命中 → 删探针。
- f-css03-kimi-b1-restored-lint/quality.raw.txt：还原后双关绿（exit=0）。

## W 级核证与处置（14 条）

### 核证后排除（3 条——Kimi 材料受限误判/降级）
- **[p2 W-2补] lineage-manual-edit 变异锚无同域正锚兜底**：核证误判——
  同用例 L187 `toBe('var(--manual-edge)')` 正向锚在场，旧字面回归
  （stroke='#8a94a6'）→正锚红 ✓ 已兜住。降 N。
- **[p4 W-1] PAINT_BG 疑喂 Canvas2D 致 var() 静默失效**：核证误判——
  selection-paint.tsx:76 `background: PAINT_BG` 为 div 的 jsx style 属性
  （DOM 自绘层非 canvas 绘制——文件名误导），var() 合法宿主。降 N。
- **[p3 W4] #efe9da 疑漏网**：核证排除——全仓 grep 零命中（仅存在于
  盘点期已清理的旧注释文字，无消费面）。降 N。

### 已修（1 条）
- **[p3 W1] 注释与实现不符**（「第三基色挂 --gold-soft 系语义名」实际名
  --gold-press）：theme.css 金族段注释改为如实表述（按压用途语义名+同基
  不同 alpha 档按零视觉差口径不合并）——顺带 B-1 补丁提交。注：首改版
  注释曾引入 rgb(207,174,114) 字面量（会被 C-4 咬——已清理形态的复现），
  即时自纠为无字面量表述，quality exit=0 复验。

### 备案（F-LINT 后续票池——门审备案四件之外新增）
- **[p1 W-1] 行级豁免整行放行**（单行多声明 `--x:0; .a{color:#fff}` 绕过）
  ——格式化约定下零形态，minified 拷贝即破；加严需判序重设计。
- **[p1 W-2] url(#face) 类片段引用误报面**（# 后 3-8 hex 字母命中）——
  与首轮 deepseek W-3 同族合并。
- **[p1 W-3] W3 matchAll 含注释字样偏严**——宁红勿绿方向，知悉。
- **[p4 W-4] B-5 常量对象+SVG attr 结构性盲区**——与首轮 W-1/门二风险
  登记合并（后续票主件）。
- **[p4 W-2] SVG attr var() 引擎版本依赖**（Chromium≈117+）——本仓
  Electron 42=Chromium 130+ ✓ 现状安全；Electron 升级线备案观察。

### 知悉（票面裁决面/环境耦合）
- [p2 W-3] jsdom cssstyle var() 直通为版本耦合行为——jsdom 版本受锁面
  （locks）锚定，升级时批量红=预警信号非误报。
- [p3 W2] issue #17561 删 # /精值迁移可追溯性代价——十进规避写法规范
  已在 v56 §2 备案（F-LINT 后续票）。
- [p3 W3][p4 W-3] --panel 跨语义复用（文字色/描边跟随面板色）——用户
  「同值合并不立第二源」裁决的直接结果，换肤耦合为已知取舍；--gold-night
  别名先例在册（届时按需立别名）。

## 与首轮（deepseek 门一）交叉验证

- B-1 为 Kimi 独有发现（deepseek 首轮审 COLOR_RE 时未抓大小写面）——
  异构复审价值实证（同源欠账补位后仍产出新实质缺陷）。
- 常量对象盲区/url(#hex) 误报面两源独立同报——置信度强化。
- 12 断言改点等价性/48 token 对账零偏差——两源一致确认。

## 结论

Kimi 补审闭环：四片过窗（分片配方在档可复用）+B-1 修复红证毕+14 W 全
处置（3 排除/1 已修/5 备案/5 知悉）。F-CSS-03 收口维持（682c646f1e）+
本补丁提交；同源欠账视为已追平。
