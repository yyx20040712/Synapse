# 门一对抗深审任务书——F-LINT-04-T4（C-4c var() 语义锚实现跳）

你是门一对抗式代码审查员（隔离一审）。铁律：只读（对以下材料）、禁臆测包外事实、不确定明说。中文输出，逐条 [B|W|N]+材料内行/段证据，末尾统计+总评（放行/放行附条件/回炉）。

## 审项工单 A~E

- A 母本符合度：实现 vs 票面+终裁档 §1.5（白名单单源+弃双向手维护改注释单向指）+Kimi 设计书 2.4 算法（R/D/W 三集+注释剥离+动态注入登记制）逐条对照。
- B 宪法红线：check-quality.mjs 372 行 ≤500/UTF-8/禁新依赖（postcss=既有）/受锁纪律（实现者零 locks 命令）/6b 哨兵面不被本 diff 破坏（哨兵扫描面文件枚举+META_RE 消费未动）。
- C 报告诚实性：报告 §7 自裁 8 项与 §8 疑虑 3 项逐条对 diff 实物；未申报差异。
- D 规则质量与测试盲区：红证矩阵覆盖面；R3 注释剥离/变异红证因果性；存量零误报论证；想票面语义内的绕过通道（如：字符串拼接 var( 名/eval 形态/注释内伪定义进 D 的反向面/他 CSS 文件定义被引用的防漂移红语义是否可达）。
- E 接缝：DYNAMIC_TOKENS 双向互指（白名单条目注注入点 file:line 136/151 vs 注入点注释回指——行号漂移自洽性）；theme.css @theme 重绑自洽；探针 f-t4pre-rdw.mjs 留档与 C-4c 并存关系（差异点=VAR_DEF 不剥注释已加固——注释一致性）。

## 主控已预裁项（可攻击但推翻需更强依据）

1. D=仅 theme.css（token 定义单源机器锚定——他 css 文件定义被引用即红=防漂移）。
2. DYNAMIC_TOKENS 恰两成员（--ui-scale/--scale-factor）。
3. 探针留档不删（独立诊断工具+证据件）。
4. @theme 重绑 var() 消费 R∩D 自洽无需特判。
5. theme-shell.css var(--ui-scale, 1) fallback=动态注入时序容错，维持不清理。

## 背景

前置票 F-LINT-04-T4PRE（同日收口）：--warning token 化（TabBar fallback 清理）→R−D−W=∅ 已实证（探针 改前差集恰 --warning→token 化后 ∅）。T2（同日收口）：B-5 AST 扩展。设计链三跳在 T1 档毕（Kimi 拟定→deepseek 审核→GLM5.3 终裁 docs/design/2026-09-10_f-lint04-design-final.md）。

---

# 票面原文（registry F-LINT-04-T4 行）

F-LINT-04-T4 | file: scripts/check-quality.mjs | area: infra | owner: strong | status: open

summary 要点：T4=④var() 语义锚 C-4c（终裁 §2 表 T4 行；前置毕=T4PRE 收口 R−D−W=∅ 已实证）。check-quality 新段 C-4c（B-1 独立 pass 先例——跨文件聚合超 eslint 单文件隔离模型）。算法=扫 src 全域（.css+.ts+.tsx，注释剥离后）matchAll /var\(\s*(--[\w-]+)/g 取 R；theme.css 定义名集 D（token 定义单源纪律机器锚定——他 css 文件定义 token 被引用即红=防漂移非误报）；R−D−W 非空=红（逐名+引用文件清单）；DYNAMIC_TOKENS 白名单常量驻 C-4c 段首单源（2 条已盘）+逐条注注入点 file:line（App.tsx:135 setProperty/TextLayer.tsx:150 容器 style 注入）+注入点代码侧注释回指白名单常量名（终裁 §1.5 弃双向手维护改注释单向指）；探针 f-t4pre-rdw.mjs 留档不删（VAR_DEF 不剥注释差异点 C-4c 落地时 D 提取剥注释加固）；验收红证=var(--ghost-x) 红+var(--ui-scale) 白名单不红+注释叙述剥离验证+存量 R−D−W=∅ 零误报+verify 全链+[locked-change]（check-quality 受锁+两注入点注释）；不做面：动态拼名（终裁证伪全仓 0）；node_modules 官方 CSS 消费面；tests/ 域外；@theme 重绑 var() 消费

# 终裁档相关节

§1.5：④白名单 doc 由代码生成（DYNAMIC_TOKENS 数组单源驻 check-quality——文档互指改为生成或注释单向指，弃双向手维护）。
§1.6（⑧三面）：fail-open 统一（哨兵/rule/postcss 解析任一异常→push violation 非吞错）+职责定界。
§2 表 T4 行：④var() 语义锚（R−D−W=∅ 上线门槛+DYNAMIC_TOKENS 生成式白名单）｜前置=T4 前置毕。

# Kimi 设计书 2.4（原始设计——终裁修正后有效部分）

算法：扫 src 全域 var\(\s*(--[\w-]+)（含 theme.css 自身 @theme 重绑消费）取引用名集合 R；theme.css 定义名集合 D；R−D−W 非空=红。白名单三形态：动态注入（登记制——白名单常量驻 check-quality+逐条注注入点+注入点代码侧注释回指）；fallback 悬空（已 T4PRE 清理）；注释叙述（引用提取前先剥离注释行）。红证：植入 var(--ghost-x)→红；var(--ui-scale) 白名单放行不红。

---

# 实现者报告全文

（scripts/audits/f-t4-impl.report.md——内联如下）

```markdown
# F-LINT-04-T4 实现者报告——C-4c var() 语义锚（三屋·实现跳）

> 领单：F-LINT-04-T4（tickets/registry.ts open 行=票面）。
> 前置：T4PRE 收口态（R−D−W=∅）开工前亲验：探针 f-t4pre-rdw.mjs
> R=94 / D=110 / W=2 / R−D−W=∅ exit=0（2026-09-10 本场实跑）。
> 技能清点：test-driven-development 用（红→绿→变异红证全链）/
> verification-before-completion 用（verify 真退出码分段亲跑）/
> systematic-debugging 不用（实现票非调试票）/ 其余不用（无 UI/浏览器/数据面）。

## 1. 实现摘要

check-quality.mjs 新增 **6c 段 C-4c var() 语义锚**（跨文件聚合独立 pass——
B-1 check-dup-constants 先例）：扫 src 全域（.css/.ts/.tsx）注释剥离后
`matchAll /var\(\s*(--[\w-]+)/g` 收引用名集 R（Map<名, Set<相对路径>>）；
D=theme.css 定义名集；DYNAMIC_TOKENS 白名单常量驻段首（单源）；
R−D−W 非空=逐名 violations.push（含引用文件清单）。fail-open：读取/
解析异常 push violation 非吞错。注入点侧回指注释双向互指辅链落
App.tsx/TextLayer.tsx。

## 2. 文件清单（本票改动面=3 文件）

| 文件 | 改动 |
| --- | --- |
| scripts/check-quality.mjs | +62 行：头注职责行 + 6c 段（6b 之后段序递增）；312→372 行（≤500） |
| src/renderer/app/App.tsx | 132-133 行注释块融合回指句（+1 行）；205→206 行（≤250）；setProperty 行 135→136 |
| src/renderer/features/reader/TextLayer.tsx | 140 行注释融合回指句（+1 行）；155→156 行（≤250）；'--scale-factor' 行 150→151 |

未跟踪新件=12 证据 raw+本报告（scripts/audits/f-t4-*，收口由主控显式列入库）。
工作树另有 tickets/registry.ts 未提交改动=**主控派发立案行（非本实现者改动**，
git diff 亲验=T4 票行新增，提请收口知悉）。

## 3. TDD 红证矩阵（每支独立临时文件+独立 raw+exit 落盘）

| 支 | 形态 | 预期 | 实测 | raw |
| --- | --- | --- | --- | --- |
| pre-impl | tmp-ghost.tsx `var(--ghost-pre)` 悬空 | 现状不拦 exit=0 | exit=0（检测缺失红） | f-t4-preimpl-red.raw.txt |
| 转 R 红证 | 同上文件 C-4c 落地后 | exit=1 含 --ghost-pre+文件名 | exit=1 ✓ | f-t4-ghost-red.raw.txt |
| R1 | tmp-t4-r1.tsx 代码面 `var(--ghost-x)` | 红 | exit=1，violation 含 --ghost-x+引用文件名 ✓ | f-t4-red-r1.raw.txt |
| R2 | tmp-t4-r2.css CSS 面 `var(--ghost-css)` | 红 | exit=1 ✓ | f-t4-red-r2.raw.txt |
| R3 | tmp-t4-r3.tsx 注释行 `// var(--ghost-note)` | 不红（剥离） | exit=0 ✓ | f-t4-red-r3.raw.txt |
| R4 | tmp-t4-r4.tsx `var(--ui-scale)` | 不红（白名单） | exit=0 ✓ | f-t4-red-r4.raw.txt |
| NR1 | 存量 theme.css @theme 重绑（--fs-body 等） | 不红 | 存量绿检 exit=0 涵盖 ✓ | f-t4-stock-green-quality.raw.txt |
| NR2 | tmp-t4-nr2.tsx style 键 '--scale-factor' 注入形态 | 不红（非 var() 不进 R） | exit=0 ✓ | f-t4-red-nr2.raw.txt |

## 4. 变异红证（cp 备份法——禁 git checkout）

1. cp check-quality.mjs → scripts/audits/f-t4-mutation-backup.dat；
2. 变异=删 ts/tsx 行注释剥离行（`if (!rel.endsWith('.css')) stripped = stripped.replace(/^\s*\/\/.*$/gm, '')`）；
3. R3 临时件在场跑 quality：**exit=1，C-4c violation 含 --ghost-note（注释叙述被误提取翻红）**——剥离逻辑非恒真（f-t4-mutation-red.raw.txt）；
4. cp 还原 → diff 空（backup 与还原件逐字节同）→ 备份即删、R3 临时件删；
5. 复跑 quality exit=0（复绿，计入存量绿检 raw）。

## 5. 存量绿检

- `npm run quality:check` exit=0（R−D−W=∅ 零误报=T4PRE 收口基线；NR1 含于其中）——f-t4-stock-green-quality.raw.txt
- `npm run lint` exit=0——f-t4-stock-green-lint.raw.txt

## 6. verify 真退出码（分段口径——&& 链 locks:check 红断链）

- `npm run verify`：quality ✓ → tickets ✓ → **locks:check 红 exit=1 断链（预期态：主控预解锁 319 文件，收口 apply）**，f-t4-verify.raw.txt 末行 exit=1；
- 断链后补跑 `npm run lint && npm run typecheck && npm run test && npm run build`：**exit=0**（f-t4-verify-rest.raw.txt 末行）；
- 基线核对：Test Files **162 passed (162)** / Tests **1579 passed (1579)**=票面基线吻合。

## 7. 自裁申报（超票面细节，均未先斩后奏项的事后申报面）

1. **段落落位=6b 之后段号 6c**（票面授权自裁）：段序递增自然；6b 哨兵紧随 6 段 COLOR_RE import 消费主题不拆。
2. **D 提取=postcss walkDecls（AST）而非「剥注释+VAR_DEF 正则」**：票面要求「D 提取同样剥注释」——AST 化=注释天然不进树，比正则剥离更彻底（探针差异点的加固强化形态）；@theme 块内定义（--text-xs 等）天然入集；第 6 段已有 postcss 先例零新依赖。
3. **D 解析失败跳过逐名判定（varDefOk flag）**：解析失败 violation 已红（fail-open 关卡红语义保留），跳过仅避免 R 全量 94 名刷屏噪音——非吞错。
4. **CSS 文件只剥 `/* */` 不剥 `//`**（探针蓝本对两域同剥）：CSS 无 // 语法，剥之反伤 url(//host) 形态；ts/tsx 剥行首 //（蓝本口径）。
5. **注入点行号漂移处理**：加注后 setProperty 135→136、'--scale-factor' 150→151（sed 亲验），白名单注释 file:line 写加注后实际值（136/151）保持自洽——票面原文 135/150 系加注前坐标。
6. 注释措辞：回指句按票面模板融合进现有注释块（不新起块）；App.tsx 融入「数据通道单点」块尾、TextLayer 融入 140 行描述句内。
7. 尾行「quality 检查通过」文案未加 C-4c 面：T1 落地先例=该文案不随段增改（4b/5/6 段均不在文案中），维持一致。
8. R3 临时件在 R4/NR2 支跑时保留在场（剥离后零引用=中性，供变异红证复用）；其余支均独立临时件独立跑独立删。

## 8. 疑虑（供门审/主控裁量）

1. **行尾注释残留面**：剥离仅行首 `//` 形态（探针蓝本）——`code; // var(--x)` 行尾注释叙述会入 R 产生假阳（存量零此形态=绿检实证；真遇=注释位置小修即消，非关卡缺陷）。
2. **模板字符串内换行行首 // 文本**会被误剥（字符串字面量内容非代码注释）——极端罕见，蓝本同形态承袭，漏报向（保守面）。
3. registry.ts 工作树未提交改动=主控立案行（§2 已述），本实现者未触 tickets/（git diff 亲验归属）。

```

# diff 全文（check-quality.mjs+App.tsx+TextLayer.tsx）

```diff
diff --git a/scripts/check-quality.mjs b/scripts/check-quality.mjs
index 5b6485cfca..720c511627 100644
--- a/scripts/check-quality.mjs
+++ b/scripts/check-quality.mjs
@@ -5,7 +5,8 @@
  * / CSS 字号+颜色字面量消费负锚（第 6 段——[F-LINT-04 ③ 2026-09-10 起
  * COLOR_RE 单源=scripts/color-re.mjs，本件与 eslint.config.js B-5 均
  * import 该件；双写面物理消失，6b 哨兵段哨内联回退）/ 色值 token 同值
- * 守卫（②）/ 内联回退哨兵（③，6b 段）/ 同值双常量（第 7 段）。
+ * 守卫（②）/ 内联回退哨兵（③，6b 段）/ var() 语义锚（C-4c，6c 段——
+ * R−D−W 悬空引用集空性，DYNAMIC_TOKENS 白名单单源）/ 同值双常量（第 7 段）。
  * 退出码 1 = CI 红。规则依据 AGENTS.md（文档无强制等于没写）。
  */
 import { readdirSync, readFileSync, statSync } from 'node:fs'
@@ -287,6 +288,65 @@ for (const sp of SENTINEL_SCAN_FILES) {
   }
 }
 
+// 6c) [F-LINT-04 T4] C-4c var() 语义锚——跨文件聚合独立 pass（B-1 check-dup-constants
+//     独立 pass 先例——R−D−W 三集聚合超 eslint 单文件隔离模型，载体=check-quality）。
+//     R=src 全域（.css/.ts/.tsx）注释剥离后 matchAll /var\(\s*(--[\w-]+)/g 引用名集
+//     （Map<名, Set<相对路径>>——红时逐名列引用文件）；注释叙述不入 R
+//     （--gold-night 退役史先例，Kimi 设计书 2.4）。CSS 只剥 /* */ 块注释
+//     （CSS 无 // 语法，不误伤 url(//host) 形态）；ts/tsx 加剥行首 // 注释。
+//     D=theme.css 定义名集，postcss walkDecls 提取——AST 天然剥注释（注释内
+//     --name: 伪定义不进 D=探针 f-t4pre-rdw.mjs VAR_DEF 不剥注释已知差异点的
+//     加固，门一 T4PRE N3）；仅 theme.css=token 定义单源纪律机器锚定——他 css
+//     文件定义 token 被引用即红=防漂移非误报。@theme 重绑 var() 消费
+//     （--text-xs: var(--fs-body)）天然 R∩D 自洽不红；theme-shell.css
+//     var(--ui-scale, 1) fallback=动态注入时序容错非色值 token fallback——
+//     捕获组取首参不受影响，维持。扫描任一异常=push violation 非吞错
+//     （fail-open 统一，终裁 §1.6）。
+// DYNAMIC_TOKENS=C-4c 白名单单源——注入点代码侧注释回指本常量名（双向互指辅链）：
+//   --ui-scale     → App.tsx:136（documentElement.style.setProperty 动态注入）
+//   --scale-factor → TextLayer.tsx:151（textLayer 容器 style 键动态注入）
+const DYNAMIC_TOKENS = ['--ui-scale', '--scale-factor']
+const VAR_REF_RE = /var\(\s*(--[\w-]+)/g
+const varRefFiles = walk(join(root, 'src'), (p) => /\.(css|ts|tsx)$/.test(p))
+const varRefMap = new Map() // 引用名 → Set<相对路径>
+for (const f of varRefFiles) {
+  const rel = relative(root, f).replaceAll('\\', '/')
+  let text
+  try {
+    text = readFileSync(f, 'utf-8')
+  } catch (e) {
+    violations.push(`${rel}: C-4c 读取失败（${e.message}）——fail-open 上报非吞错（F-LINT-04 T4）`)
+    continue
+  }
+  let stripped = text.replace(/\/\*[\s\S]*?\*\//g, '')
+  if (!rel.endsWith('.css')) stripped = stripped.replace(/^\s*\/\/.*$/gm, '')
+  for (const m of stripped.matchAll(VAR_REF_RE)) {
+    if (!varRefMap.has(m[1])) varRefMap.set(m[1], new Set())
+    varRefMap.get(m[1]).add(rel)
+  }
+}
+const varDefSet = new Set()
+let varDefOk = true
+try {
+  postcss
+    .parse(readFileSync(join(root, 'src/renderer/shared/theme.css'), 'utf-8'), { from: 'src/renderer/shared/theme.css' })
+    .walkDecls((decl) => {
+      if (decl.prop.startsWith('--')) varDefSet.add(decl.prop)
+    })
+} catch (e) {
+  varDefOk = false
+  violations.push(`C-4c var() 语义锚：theme.css 解析失败（${String(e.message).split('\n')[0]}）——D 集失能 fail-open 上报（F-LINT-04 T4）`)
+}
+if (varDefOk) {
+  for (const [name, files] of varRefMap) {
+    if (!varDefSet.has(name) && !DYNAMIC_TOKENS.includes(name)) {
+      violations.push(
+        `C-4c var() 语义锚：${name} 引用悬空（引用于 ${[...files].join(', ')}）——定义 token 于 theme.css 或登记 DYNAMIC_TOKENS`
+      )
+    }
+  }
+}
+
 // 7) [F-LINT-02] B-1 同值双常量——同名同值跨 ≥2 文件即红（trivial/同文件豁免、
 //    异名同文案 warn 不卡 CI；baseline 棘轮=存量真命中放行待收敛）。判据与边界
 //    矩阵见 scripts/check-dup-constants.mjs 头注（独立跑：npm run lint:dup-constants）。
diff --git a/src/renderer/app/App.tsx b/src/renderer/app/App.tsx
index 66afab424d..54c2a0990e 100644
--- a/src/renderer/app/App.tsx
+++ b/src/renderer/app/App.tsx
@@ -130,7 +130,8 @@ export function App(): JSX.Element {
     settingsLoad().catch(() => undefined)
   }, [settingsLoad])
   // 数据通道单点：档位→CSS 变量（theme-shell.css .app-content-row/[data-page-column]
-  // 消费——皮肤住类 B1；变量属数据通道非内联皮肤）
+  // 消费——皮肤住类 B1；变量属数据通道非内联皮肤；--ui-scale 动态注入——
+  // C-4c 白名单 DYNAMIC_TOKENS 登记 scripts/check-quality.mjs）
   useEffect(() => {
     document.documentElement.style.setProperty('--ui-scale', String(UI_SCALE[uiScale]))
   }, [uiScale])
diff --git a/src/renderer/features/reader/TextLayer.tsx b/src/renderer/features/reader/TextLayer.tsx
index 58d7373b45..dcaff7c657 100644
--- a/src/renderer/features/reader/TextLayer.tsx
+++ b/src/renderer/features/reader/TextLayer.tsx
@@ -137,7 +137,8 @@ export function TextLayer(props: TextLayerProps): JSX.Element {
     return () => layer.cancel()
   }, [textContent, viewportScale, pageWidth, pageHeight, geometry])
 
-  // --scale-factor 供官方 CSS 的 span 字号 calc 使用；宽高=canvas CSS 盒同源量测
+  // --scale-factor 供官方 CSS 的 span 字号 calc 使用（动态注入——C-4c 白名单
+  // DYNAMIC_TOKENS 登记 scripts/check-quality.mjs）；宽高=canvas CSS 盒同源量测
   // （inset:0 之上再显式给定，确保与页面盒对齐）；旋转页（90/270）由
   // rotatedContainerBox 交换为未旋转盒并施加官方等价变换（T1——span 百分比
   // 数学在未旋转空间，容器变换负责与旋转后 canvas 对齐）

```

# 证据链（红证矩阵+变异+存量绿+verify 补跑）

```
=== preimpl-red ===
npm warn Unknown project config "better_sqlite3_binary_host_mirror". This will stop working in the next major version of npm. See `npm help npmrc` for supported config options.
npm warn Unknown project config "electron_mirror". This will stop working in the next major version of npm. See `npm help npmrc` for supported config options.

> synapse@0.1.0 quality:check
> node scripts/check-quality.mjs

  [warn] 异名同文案 'ai-sensor'（2 声明 / 2 文件：AI_SENSOR_DIR_NAME / ZCODE_SKILL_NAME）
  [warn] 异名同文案 '标注保存失败'（2 声明 / 2 文件：UPDATE_FAILED / SAVE_FAILED）
dup-constants：扫描 218 文件 / 133 声明——红层 0 组 baseline 待收敛（F-LINT-03 候选）、新增 0 组、warn 2 组（异名同文案不卡 CI）
quality 检查通过：无占位标记 / 无乱码 / 无跨域引用 / 无同值双常量新增
exit=0
=== ghost-red ===
  [warn] 异名同文案 '标注保存失败'（2 声明 / 2 文件：UPDATE_FAILED / SAVE_FAILED）
dup-constants：扫描 218 文件 / 133 声明——红层 0 组 baseline 待收敛（F-LINT-03 候选）、新增 0 组、warn 2 组（异名同文案不卡 CI）
quality 检查未通过：
  - C-4c var() 语义锚：--ghost-pre 引用悬空（引用于 src/renderer/tmp-ghost.tsx）——定义 token 于 theme.css 或登记 DYNAMIC_TOKENS
exit=1
=== r1 ===
  - C-4c var() 语义锚：--ghost-x 引用悬空（引用于 src/renderer/tmp-t4-r1.tsx）——定义 token 于 theme.css 或登记 DYNAMIC_TOKENS
exit=1
=== r2 ===
  - C-4c var() 语义锚：--ghost-css 引用悬空（引用于 src/renderer/tmp-t4-r2.css）——定义 token 于 theme.css 或登记 DYNAMIC_TOKENS
exit=1
=== r3(注释剥离不红) ===
quality 检查通过：无占位标记 / 无乱码 / 无跨域引用 / 无同值双常量新增
exit=0
=== r4(白名单不红) ===
quality 检查通过：无占位标记 / 无乱码 / 无跨域引用 / 无同值双常量新增
exit=0
=== nr2(注入形态不进R) ===
quality 检查通过：无占位标记 / 无乱码 / 无跨域引用 / 无同值双常量新增
exit=0
=== mutation-red(剥离禁用翻红) ===
  - C-4c var() 语义锚：--ghost-note 引用悬空（引用于 src/renderer/tmp-t4-r3.tsx）——定义 token 于 theme.css 或登记 DYNAMIC_TOKENS
exit=1
=== stock-green-quality ===
quality 检查通过：无占位标记 / 无乱码 / 无跨域引用 / 无同值双常量新增
exit=0
=== verify-rest(断链后四段) ===
[2m../../out/renderer/[22m[36massets/index-Db9oFj0U.js            [39m[1m[33m1,393.06 kB[39m[22m
[32m✓ built in 2.11s[39m
exit=0

```

请输出审计报告。
