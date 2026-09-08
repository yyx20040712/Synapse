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
