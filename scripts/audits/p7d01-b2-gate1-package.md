# P7D-01 批二门一审计包（主控预生成 2026-09-08）

## 裁决档（真相源）
# P7D-01 批二 · 字号语义刻度用户裁决记录（2026-09-08 在场轮）

> 裁决人=用户（在场轮 AskUserQuestion 四问全落,零异议通过推荐案）。
> 评审载体=mockup 案册 `docs/design/mockups/p7d01-b2-fontscale.html`
> （P1~P6 六面板+页首映射表,100% 实尺寸+2× 放大条;无头截图验证档
> `scripts/audits/p7d01-out/b2-mockup-full.png`——桶②不入库）。
> 上游=docs/design/2026-09-03_p7d01-token-candidates.md（乙字号方向+
> 批二拆分）+registry P7D-01 批二条款。

## 1. 裁决终态（六档刻度）

| 档位 token | 锚值 | 吸收现值（实测） | 变化点 |
| --- | --- | --- | --- |
| --fs-micro | 10px | 9.5×3 · 10×3 | 9.5→10（+0.5 ×3 处） |
| --fs-caption | 11px | 10.5×4 · 11×3 · 11.5×1 | 10.5→11（+0.5 ×4）/ 11.5→11（−0.5 ×1） |
| --fs-body | 12px | 12×5 · 12.5×1 · **text-xs×131** | 12.5→12（−0.5 ×1） |
| --fs-strong | 13px | 13×4 · 13.5×1 | 13.5→13（−0.5 ×1） |
| --fs-title | 14px | 14×1 · 15×3 · **text-sm×25** | 15→14（−1.0 ×3） |
| --fs-display | 17px | 17×1 | 零变化 |

**逐问裁决原文**（AskUserQuestion 回执）：
1. 刻度结构=「6 档（推荐）」（5 档备选被否——13 系 5 处 ±1px 变化面更大）；
2. P2 最大分歧=「→ 11px（推荐）」（10.5 系与 11 系同档 caption;→10 备选被否）；
3. P1/P3/P4 半值四小项=「全按推荐（推荐）」（9.5→10 · 11.5→11 · 12.5→12 · 13.5→13——全向整值收）；
4. P5 最大幅度=「→ 14px（推荐）」（15 系并入 title −1.0;保留第 7 档被否）。

## 2. 变化面总账（§6.2 口径切换的「预期红」清单）

- **13 处视觉变化**：9.5×3 / 10.5×4 / 11.5×1 / 12.5×1 / 13.5×1 / 15×3
  （消费面：脉络边标签+侧栏小字 ×3 / 卡片 meta+图例 ×4 / 侧板节标 /
  节点卡年份 / nav 主字 / 顶栏应用名+详情标题+衬线大字 ×3）；
- **17 处零变化仅换载体**（10×3 / 11×3 / 12×5 / 13×4 / 14×1 / 17×1）；
- **tailwind 156 处零变化**：text-xs×131=12px 恰为 body 锚值、text-sm×25
  =14px 恰为 title 锚值——经 v4 `@theme` 重绑（`--text-xs: var(--fs-body)`
  /`--text-sm: var(--fs-title)`）并入单源,零逐处改写。

## 3. 实现约束（票面条款随裁决落定）

1. token 定义驻 theme.css `:root`（留守件——theme.test.ts TOKENS 路径锚
   零扰动）;消费面=F-CSS-01 四皮肤件+library.css+workspace.css+tsx inline
   ×4+tailwind @theme 重绑;
2. **§6.2 探针口径切换条款生效**：验收≠零视觉差 COMPARE——13 处变化点
   为预期红（裁决即预期）,探针验收=「不变面 17+156 处逐字节相同+变化面
   13 处逐档定向 diff 复核（每处 diff 值=裁决表期望）」;
3. INV「design token 单源」登记（invariants.md 新条目——font-size 消费
   禁字面量,tailwind 经 @theme 重绑入单源;theme.test.ts 负锚=旧字面量
   全禁+TOKENS 六正锚）;
4. B5 缩放复核条款（案册 §B5 注记）：--fs-* 与 --ui-scale 相乘语义复核
   产出核查结论供档,如统一体系会改变面板现状则另行报裁（不预改）。

—— 裁决毕。实现票以此为准（票面=v48 §2-4 预写条款+本档映射表）。

## 验证摘要（主控亲验,§6.2 定向口径）
- 实现者先红证 27 红（TOKENS 6+FS 负锚 18+tsx 形态 2+@theme 1——25 处在场字面量分布可解释）→全量 test 1543/1543 绿 exit=0（基线 1450+93 新用例）;verify exit=1 仅红 locks:check（三受锁件=预解锁工作流预期,主控已 apply 286 重锁）。
- **§6.2 定向 diff 验收三件套（主控位亲跑）**：①探针 after COMPARE FAIL=预期红（13 处值变化致 8 态 PNG 差——sweeps/tokens/compiledRules 全 ok 证非字号面零漂）②像素差分带对位=差分带恰落顶栏/侧栏/卡片 meta/边标签/图例/底部版本号区,内容区差分带与预期变化组件一一对应,无意外差分区;wspanel crop 目检=0 肉眼可见差;③DOM 计算样式定向断言 13/13 ALL PASS（六 token+顶栏 14/nav 13/版本号 10/分组字 10/caret 10+text-xs 12/text-sm 14——@theme 重绑经真机 DOM 生效铁证）。
- 两自裁追认（主控）：负锚声明形态口径（px 纯文本计数被 padding/radius 污染——theme.css '12px' 现状 1 次=--radius-m 定义行,结构性不可行论据成立;声明形态+TOKENS 正锚防护等价）/library-cards.test.tsx 三断言 token 化配套（F-CSS-01 接缝再锚同型,强度同构逐类逐属性 toMatch）。

## 实现者报告全文
# P7D-01 批二 实现者报告——字号六档语义刻度落地

> 档位申报：GLM5.3flash/思考中（平台以实际执行模型为准）。
> 技能清点（开工纪律）：test-driven-development「用」（3d 先红证）；
> verification-before-completion「用」（verify 真退出码+分段落盘）；
> systematic-debugging「暂不用」（新实现非调试，未遇阻）；
> subagent-driven-development「不用」（本人即实现者，无派发面）。

## 1. 实现摘要

裁决档 §1 六档映射表逐行落地：3a token 六档定义（theme.css :root 批一
z 序段后）+3b tailwind v4 @theme 重绑（text-xs→--fs-body/text-sm→
--fs-title）+3c 消费面 30 处硬编码→var(--fs-*)（CSS 25 处+tsx inline
4 处+arbitrary 1 处）+3d theme.test.ts 防线扩展（先红证）+3e INV-61
登记。13 处值变化=用户裁决预期（未「修正」回旧值）。

消费对账（grep 实测）：var(--fs-*) 消费 32 处=30 处替换+2 处 @theme
重绑行；替换后七 CSS font-size 字面量归零（grep "font-size: *[0-9]"
零匹配）。

## 2. 文件清单（git diff --stat 实测 13 文件，零范围蔓延）

| 文件 | 变更 |
| --- | --- |
| src/renderer/shared/theme.css | +17（@theme 重绑块 8 行+:root --fs-* 六档 9 行） |
| src/renderer/shared/theme-shell.css | 4 处（15→title/13.5→strong/9.5→micro ×2） |
| src/renderer/shared/theme-reader.css | 2 处（11.5→caption/13→strong） |
| src/renderer/shared/theme-lineage.css | 5 处（10.5→caption/13→strong ×2/12→body/9.5→micro） |
| src/renderer/features/library/library.css | 10 处（17→display/14→title/11→caption ×2/10.5→caption ×3/12→body/15→title ×2） |
| src/renderer/features/workspaces/workspace.css | 4 处（13→strong/10→micro/12→body ×2） |
| src/renderer/features/lineage/LineageNodeMeta.tsx | fontSize '10px'→'var(--fs-micro)' |
| src/renderer/features/lineage/LineageNodeCard.tsx | '12.5px'/'12px'→'var(--fs-body)' ×2 |
| src/renderer/features/lineage/LineageSideTags.tsx | fontSize 11→'var(--fs-caption)' |
| src/renderer/features/reader/TabBar.tsx | text-[10px]→text-[length:var(--fs-micro)] |
| tests/unit/renderer/theme.test.ts | +77 行 454 行总（<500 达标）；新增 93 用例 |
| tests/unit/renderer/library-cards.test.tsx | 三断言 token 化配套（自裁申报 §4.2） |
| docs/invariants.md | INV-61 登记（文末表格） |

行号核对：简报 3c 表 30 处行号与现场 grep 全吻合，零漂移修正。

## 3. 测试与验证证据

- **先红证**（3c 执行前）：theme.test.ts 单跑 **27 failed | 182 passed，
  exit=1**，raw=scripts/audits/p7d01-b2-first-red.raw.txt。红构成逐项
  可解释：TOKENS 六正锚 6+FS 负锚矩阵 18（=[字面量,文件] 组合，与 25 处
  在场字面量分布一致）+tsx 形态锁 2+@theme 重绑锁 1=27。
- **转绿**：theme.test.ts 209/209（=批一基线 116+新增 93）。
- **全量 test**：npm run test **1543/1543 全绿 exit=0**（=基线 1450+93），
  raw=scripts/audits/p7d01-b2-test-full2.raw.txt（首跑 1 红处置见 §4.2，
  首 跑 raw=p7d01-b2-test-full.raw.txt 在档）。
- **verify 真退出码**：**exit=1，红在 locks:check 段**（三受锁件
  invariants.md/theme.test.ts/library-cards.test.tsx 哈希变更——预解锁
  工作流预期面，locks:apply=主控位我禁跑；quality:check+tickets:check
  在 && 链中已先过），raw=scripts/audits/p7d01-b2-verify.raw.txt。
  其余被截断关卡独立补跑：lint+typecheck+build **exit=0 全绿**，
  raw=scripts/audits/p7d01-b2-lint-type-build.raw.txt（build 产物含
  tailwind v4 编译后 CSS——@theme 重绑经 vite 链验证）。
- 新增用例 93=6（TOKENS 正锚 it.each）+84（FS_COUNTS 12 字面量×7 文件
  it.each）+2（tsx 形态）+1（@theme 重绑锁）。

## 4. 自裁申报

### 4.1 负锚矩阵口径修正：font-size 声明形态（非批一纯文本计数同构）

简报 3d 原口径「DURATION_COUNTS 同构（纯文本计数）：唯 theme.css 每值
恰 1 次」在 px 通用值上**结构性不可行**——实测：theme.css '12px' 现状
1 次为 --radius-m 定义行（token 定义后将=2 次，恰 1 次断言必红）；
theme-shell.css '10px' 9 次全非 font-size 声明（padding/radius 类）。
批一可行前提「时长字面量唯时长消费」在 px 上不成立。修正为：
负锚锚定 `font-size:\s*<字面量>;` 声明形态（七 CSS 全 0），token 定义
行由 TOKENS 六正锚独立锁定——防护语义等价（定义正锚+消费负锚），先红
证仍成立（25 处在场声明形态即红）。已同步注记入测试头注与 INV-61。

### 4.2 library-cards.test.tsx 三断言 token 化配套（超票面编辑）

全量首跑 1 红：library-cards.test.tsx:298-301 既有受锁断言锁定
.lib-card-title/.lib-card-venue/.lib-card-meta 的 font-size 字面量
（14px/11px/10.5px）——与票面 3c（library.css:114 等替换）+3d（负锚
归零）**绝对互斥**（无中间态），属主控派单接缝漏列（全 tests/ 唯一
冲突面，grep 实测）。处置=更新三断言为 var(--fs-*) 载体（**强度不
放宽**：仍逐类逐属性 toMatch 同构；值面转由 TOKENS 六正锚+FS 负锚
双锁），用例名随迁（meta 10.5→11=裁决变化面）。事实依据：该文件
可写（-rw-r--r--，主控预解锁覆盖整个受锁面而非仅 theme.test.ts）；
diff 一键可回退（未提交）。**此编辑请主控门审重点过目**。

### 4.3 其他

- tsx 形态锁在票面两条明文断言（not.toContain("fontSize: '1")/
  not.toContain('text-[10')）之上各增一条通用正则（/fontSize:\s*['"`]?\d/
  覆盖无引号数字形态——SideTags 原状 fontSize: 11 即此形态；/text-\[\d/
  覆盖数字开头 arbitrary，# 开头色值不咬）。
- theme.css token 插入点=批一 z 序段后（--z-pop 行后、--font-display
  前）——「--dur-* 段后」的批一区末尾读法，保持批一 dur/z 两段完整。
- INV-61 锚定方式列含 library-cards 随迁说明+负锚口径注记（与登记
  格式 INV-58~60 同构五列）。

## 5. B5 缩放静态核查（裁决档 §3-4 条款）

--ui-scale 消费面 grep 实测：theme-shell.css 63/66 两处 zoom 声明
（var(--ui-scale,1) 与 calc(1/var(--ui-scale,1)) 反补偿）+App.tsx:135
setProperty 单点写。**--fs-* 六 token 不入任何 zoom/calc 乘算表达式**
（无直接耦合面）；zoom 属布局级缩放（渲染后整体缩放），font-size 无论
字面量或 token 载体同受 zoom 作用——批二仅改取值单源，不改变缩放语义；
13 处值变化点在缩放档位≠1 时与 17 处零变化点同比例呈现。结论：统一
体系（--fs-*×--ui-scale 乘算）现状不存在也无必要，不另行报裁。

## 6. 疑虑

1. **theme-lineage.css:113-119 注释**含「9.5px 斜体」等历史描述字样
   （F-L1-C 裁决档案描述），值变化（9.5→10）后注释失实——按范围纪律
   未动（负锚为声明形态不咬注释），是否顺带更新请主控裁。
2. verify 无法达成整链绿=locks:check 预期红（§3），主控收口
   locks:apply+[locked-change] 提交后即应全绿——请主控亲验。

## 完整 diff
diff --git a/docs/invariants.md b/docs/invariants.md
index e7c132a5cb..74abefe18f 100644
--- a/docs/invariants.md
+++ b/docs/invariants.md
@@ -74,6 +74,7 @@
 
 | INV-59 | 重锚同族配对令（F-A8 门2，2026-09-04 随主链切换落地登记）：标注/AI 段重锚产物 resolved.rects 与 resolved.bands 必须**同几何族**（项几何主链=rectsForOffsetRange 项盒+bandsFromItems 同源派生；S4 DOM 回退层=findRangeAtOffset 行盒+bandsForTextNodes 节点口径同源）——主链禁跨族配对（消 R1：正确 rects×失真 bands 互漂错绑）；跨族配对仅允许显式回退格且属登记边界：**S3b 条目回退**（存量 rects[库]×bandsNearRects[DOM 量测]——现状语义逐位保持）与 **S5/S6 页级回退**（DOM 产物或其抑制后的存量直显）；matchBand 阈值（\|Δcenter\|≤rect.h）仍在为跨格边界兜底 | src/renderer/features/reader/annotation-resolve.ts（ResolvedAnnotation 域内 rects/bands 成对产出+resolveAnnotationRectsItem 同族管线）+annotation-resolve-layered.ts（三层编排=同族配对的编排保证——主链产物 rect/band 同域，跨族仅在登记回退格） | 单测（annotation-layer.test F-A8 门2 describe：S2 项几何产物 rect/band 同族数值断言（块几何=band 几何同基线）+S3b/S6 回退格跨族配对=登记边界渲染断言；anchor-item-verify.test：resolveAnnotationRectsItem 产物与 itemSelectionGeometry 同参直调逐位一致（rects+bands 双断言）） | 已锚定（单测级 F-A8 门2 本单——证据件 anchor-item-verify.test.tsx 为门 0 遗留未跟踪件,随门 2 收口提交补 git add 后生效[门二 W1 标注]） |
 | INV-60 | 重锚显示覆盖登记（F-A8 门2，2026-09-04 随主链切换落地登记）：重锚成功产物（项几何主链/S4 DOM 回退层）覆盖库值 rects **仅显示层、永不回写**（annotation.rects 库数据零迁移零触碰——重锚是渲染态推导非数据变更；INV-37 只覆盖拖选期不扩其文，本条另立）；产物域标记 source:'item'\|'dom' 随 resolved 运行时走（调试面=渲染块 data-source 属性+单测断言面；**不入库**=Annotation 模型锁面零触碰），渲染行为零差（色块样式不区分源） | src/renderer/features/reader/annotation-resolve.ts（ResolvedAnnotation.source 可选域）+AnnotationLayer.tsx/AiAnnotationLayer.tsx（data-source 调试属性）+annotation-resolve-layered.ts（markSource 唯一标域点） | 单测（annotation-layer.test/ai-annotation-layer.test F-A8 门2 describe：域标记断言（S0/S4='dom'/S2='item'/S3b·S6 抑制=无标记）+M3 主链换 DOM 变异→域标记断言红证在档；e2e reader-text「划选高亮后重开仍在原位」INV-51 稳态口径回归=显示覆盖不回写的端到端面） | 已锚定（单测级 F-A8 门2 本单；e2e 面随全量 reader-text 回归） |
+| INV-61 | 字号六档语义刻度单源：font-size 消费面禁字面量（CSS 声明/inline/arbitrary），tailwind text-xs/text-sm 经 v4 @theme 重绑到 --fs-* token——档位与锚值变更=用户裁决+本册 | P7D-01 批二用户裁决 2026-09-08（docs/design/2026-09-08_p7d01-b2-fontscale-ruling.md）；token 定义=src/renderer/shared/theme.css :root --fs-* 段+@theme 重绑块，消费面=四皮肤件+library.css+workspace.css+四 tsx inline+tailwind 类 | theme.test.ts（TOKENS 六正锚+FS_LITERALS 负锚矩阵（font-size 声明形态口径——px 通用值纯文本计数不可行）+@theme 重绑锁）+library-cards.test.tsx 三断言随迁 token 载体（实现者自裁申报在档） | 已锚定（2026-09-08 批二） |
 
 ## 维护规则
 
diff --git a/locks/manifest.json b/locks/manifest.json
index a91672c373..78f037dbb8 100644
--- a/locks/manifest.json
+++ b/locks/manifest.json
@@ -1,5 +1,5 @@
 {
-    "generatedAt":  "2026-09-05T01:01:02.1980857Z",
+    "generatedAt":  "2026-09-08T15:05:15.0527020Z",
     "files":  [
                   {
                       "path":  ".github/workflows/ci.yml",
@@ -7,7 +7,7 @@
                   },
                   {
                       "path":  "docs/invariants.md",
-                      "sha256":  "4c0e7bc1cd764f6fdecebe6f91a36e545f030b89de7b1f639d414e458fefa291"
+                      "sha256":  "af55aa69ae6dea03736d4b659c609349094db1cf78fae3e61728495aecbfc899"
                   },
                   {
                       "path":  "electron.vite.config.ts",
@@ -727,7 +727,7 @@
                   },
                   {
                       "path":  "tests/unit/renderer/library-cards.test.tsx",
-                      "sha256":  "e74d54afa082dccc5314a687a26fa6dfe0b529062be0d417ca1f3826024e8ee9"
+                      "sha256":  "84a3817b929ed177992f813db5489d57125069888f9e8dc59b670a18ce5d6390"
                   },
                   {
                       "path":  "tests/unit/renderer/lineage-board.test.tsx",
@@ -947,7 +947,7 @@
                   },
                   {
                       "path":  "tests/unit/renderer/theme.test.ts",
-                      "sha256":  "9312e70b0a01d79a1ae969717d915ce663352e82faf98f0030dd606604045115"
+                      "sha256":  "639651636327f79105e71f476a9e03d86f1c164e8ec667a8675ab3d53a9eb986"
                   },
                   {
                       "path":  "tests/unit/renderer/toast.test.tsx",
diff --git a/src/renderer/features/library/library.css b/src/renderer/features/library/library.css
index f15e1ee558..c677f0971c 100644
--- a/src/renderer/features/library/library.css
+++ b/src/renderer/features/library/library.css
@@ -97,7 +97,7 @@
 .lib-card-year {
   flex: none;
   min-width: 44px;
-  font-size: 17px;
+  font-size: var(--fs-display);
   color: var(--gold);
 }
 /* 空年份 ◆（回炉 R3）：9px 淡金菱形占位，year 槽 min-width 44px 保对齐 */
@@ -111,7 +111,7 @@
 }
 .lib-card-title {
   min-height: 38px;
-  font-size: 14px;
+  font-size: var(--fs-title);
   line-height: 1.45;
   font-weight: 600;
   display: -webkit-box;
@@ -122,7 +122,7 @@
 .lib-card-venue {
   display: block;
   margin-top: 6px;
-  font-size: 11px;
+  font-size: var(--fs-caption);
   color: var(--text-dim);
   font-style: italic;
 }
@@ -133,7 +133,7 @@
   margin-top: 9px;
 }
 .lib-tag {
-  font-size: 10.5px;
+  font-size: var(--fs-caption);
   color: var(--accent);
   background: var(--accent-soft);
   border-radius: 6px;
@@ -141,7 +141,7 @@
 }
 .lib-card-tagmore {
   align-self: center;
-  font-size: 10.5px;
+  font-size: var(--fs-caption);
   color: var(--text-dim);
 }
 .lib-card-meta {
@@ -149,13 +149,13 @@
   flex-wrap: wrap;
   gap: 10px;
   margin-top: 9px;
-  font-size: 10.5px;
+  font-size: var(--fs-caption);
   color: var(--text-dim);
   font-variant-numeric: tabular-nums;
 }
 /* 筛选 chips：搜索框/下拉统一胶囊语法（mockup .chip/.search） */
 .lib-chip {
-  font-size: 12px;
+  font-size: var(--fs-body);
   color: var(--text);
   border: 1px solid var(--border);
   border-radius: 999px;
@@ -208,17 +208,17 @@
   min-height: 160px;
 }
 .lib-detail-title {
-  font-size: 15px;
+  font-size: var(--fs-title);
   font-weight: 500;
   line-height: 1.5;
 }
 .lib-detail-k {
   color: var(--text-dim);
-  font-size: 11px;
+  font-size: var(--fs-caption);
   letter-spacing: 1px;
 }
 .lib-detail-v-serif {
-  font-size: 15px;
+  font-size: var(--fs-title);
   color: var(--gold);
 }
 .lib-detail-abs {
diff --git a/src/renderer/features/lineage/LineageNodeCard.tsx b/src/renderer/features/lineage/LineageNodeCard.tsx
index 6c47d51bac..5040236eaf 100644
--- a/src/renderer/features/lineage/LineageNodeCard.tsx
+++ b/src/renderer/features/lineage/LineageNodeCard.tsx
@@ -50,7 +50,7 @@ import { LineageNodeMeta } from './LineageNodeMeta'
 const TITLE_STYLE = {
   flex: 1,
   minHeight: 0,
-  fontSize: '12.5px',
+  fontSize: 'var(--fs-body)',
   lineHeight: '18px',
   color: 'var(--text)',
   overflowY: 'auto',
@@ -144,7 +144,7 @@ export function LineageNodeCard(props: {
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
-              fontSize: '12px',
+              fontSize: 'var(--fs-body)',
               color: 'var(--text-dim)'
             }}
           >
diff --git a/src/renderer/features/lineage/LineageNodeMeta.tsx b/src/renderer/features/lineage/LineageNodeMeta.tsx
index 97553eed22..42dbd09d65 100644
--- a/src/renderer/features/lineage/LineageNodeMeta.tsx
+++ b/src/renderer/features/lineage/LineageNodeMeta.tsx
@@ -29,7 +29,7 @@ export function formatMetricsText(m: LineagePaperMetrics | null | undefined): st
 /** 标签小块样式（红示意：红字小片——用户图7「红小块」） */
 const TAG_CHIP_STYLE = {
   flexShrink: 0,
-  fontSize: '10px',
+  fontSize: 'var(--fs-micro)',
   lineHeight: '16px',
   borderRadius: 3,
   color: 'var(--danger)',
diff --git a/src/renderer/features/lineage/LineageSideTags.tsx b/src/renderer/features/lineage/LineageSideTags.tsx
index 64bdeb52f8..14053aca23 100644
--- a/src/renderer/features/lineage/LineageSideTags.tsx
+++ b/src/renderer/features/lineage/LineageSideTags.tsx
@@ -17,7 +17,7 @@ const SIDE_TAG_CHIP: CSSProperties = {
   display: 'inline-flex',
   alignItems: 'center',
   borderRadius: 3,
-  fontSize: 11,
+  fontSize: 'var(--fs-caption)',
   color: 'var(--danger)',
   background: 'rgba(179, 64, 58, 0.08)',
   border: '1px solid rgba(179, 64, 58, 0.25)'
diff --git a/src/renderer/features/reader/TabBar.tsx b/src/renderer/features/reader/TabBar.tsx
index ebfd93f020..e13cb52f69 100644
--- a/src/renderer/features/reader/TabBar.tsx
+++ b/src/renderer/features/reader/TabBar.tsx
@@ -135,7 +135,7 @@ export function TabBar(): JSX.Element | null {
                 title="有未保存修改"
                 aria-label="有未保存修改"
                 data-testid="tab-dirty-dot"
-                className="shrink-0 text-[10px] leading-none"
+                className="shrink-0 text-[length:var(--fs-micro)] leading-none"
                 style={{ color: 'var(--warning, orange)' }}
               >
                 ●
diff --git a/src/renderer/features/workspaces/workspace.css b/src/renderer/features/workspaces/workspace.css
index d16989e459..cb9d97d684 100644
--- a/src/renderer/features/workspaces/workspace.css
+++ b/src/renderer/features/workspaces/workspace.css
@@ -20,7 +20,7 @@
   background-size: 220% 100%;
   animation: syn-pan-x 6s ease-in-out infinite;
   color: var(--text);
-  font-size: 13px;
+  font-size: var(--fs-strong);
   cursor: pointer;
   box-shadow: var(--shadow-1);
   transition:
@@ -46,7 +46,7 @@
 }
 .ws-caret {
   color: var(--accent);
-  font-size: 10px;
+  font-size: var(--fs-micro);
 }
 
 /* 下拉面板：亮面卡+冷蓝描边+shadow-3 浮层；入场 160ms 居中放大一圈渐显
@@ -89,7 +89,7 @@
   border-radius: var(--radius-s);
   background: transparent;
   color: var(--text);
-  font-size: 12px;
+  font-size: var(--fs-body);
   text-align: left;
   cursor: pointer;
   transition:
@@ -120,7 +120,7 @@
   border-radius: var(--radius-s);
   background: var(--panel);
   color: var(--text);
-  font-size: 12px;
+  font-size: var(--fs-body);
 }
 .ws-field:focus {
   outline: none;
diff --git a/src/renderer/shared/theme-lineage.css b/src/renderer/shared/theme-lineage.css
index 6e1cc016f9..0fe3b82bba 100644
--- a/src/renderer/shared/theme-lineage.css
+++ b/src/renderer/shared/theme-lineage.css
@@ -18,7 +18,7 @@
   bottom: 16px;
   display: flex;
   gap: 14px;
-  font-size: 10.5px;
+  font-size: var(--fs-caption);
   color: var(--text-dim);
   background: rgba(255, 255, 255, 0.88);
   border: 1px solid var(--border);
@@ -64,7 +64,7 @@
   backdrop-filter: blur(10px);
   border: 1px solid var(--border);
   box-shadow: var(--shadow-2);
-  font-size: 13px;
+  font-size: var(--fs-strong);
 }
 .lineage-toolbar > button {
   background: transparent;
@@ -73,7 +73,7 @@
   padding: 4px 10px;
   border-radius: 8px;
   cursor: pointer;
-  font-size: 13px;
+  font-size: var(--fs-strong);
 }
 .lineage-toolbar > button:hover {
   color: var(--text);
@@ -96,7 +96,7 @@
   backdrop-filter: blur(10px);
   border: 1px solid var(--border);
   color: var(--text-dim);
-  font-size: 12px;
+  font-size: var(--fs-body);
   cursor: pointer;
 }
 .lineage-fit-btn:hover {
@@ -122,7 +122,7 @@
   width: 100%;
   height: 100%;
   padding: 2px;
-  font-size: 9.5px;
+  font-size: var(--fs-micro);
   line-height: 1.3;
   font-style: italic;
   color: #6b7280;
diff --git a/src/renderer/shared/theme-reader.css b/src/renderer/shared/theme-reader.css
index 87fcf217bf..bb0ab102eb 100644
--- a/src/renderer/shared/theme-reader.css
+++ b/src/renderer/shared/theme-reader.css
@@ -25,7 +25,7 @@
 /* 阅读器侧板节标：h4 金左缘条（R2-SH2 决5：衬线消费清零；夜色只属脉络域——侧板保持亮面） */
 .rdr-aside-h4 {
   margin: 0;
-  font-size: 11.5px;
+  font-size: var(--fs-caption);
   font-weight: 600;
   letter-spacing: 0.5px;
   color: var(--text);
@@ -45,7 +45,7 @@
 }
 .syn-settings h2 {
   margin: 0 0 2px;
-  font-size: 13px;
+  font-size: var(--fs-strong);
   font-weight: 600;
   letter-spacing: 0.5px;
   color: var(--text);
diff --git a/src/renderer/shared/theme-shell.css b/src/renderer/shared/theme-shell.css
index ad0b3c608a..d0ae1ed566 100644
--- a/src/renderer/shared/theme-shell.css
+++ b/src/renderer/shared/theme-shell.css
@@ -31,7 +31,7 @@
   flex: none;
 }
 .app-header-name {
-  font-size: 15px;
+  font-size: var(--fs-title);
   font-weight: 600;
   letter-spacing: 0.5px;
   color: var(--text);
@@ -161,7 +161,7 @@
   background: transparent;
   border-radius: var(--radius-m);
   font-family: inherit;
-  font-size: 13.5px;
+  font-size: var(--fs-strong);
   color: #aeb6ca;
   text-align: left;
   cursor: pointer;
@@ -214,7 +214,7 @@
   gap: 8px;
 }
 .app-nav-ver {
-  font-size: 9.5px;
+  font-size: var(--fs-micro);
   letter-spacing: 1px;
   color: #8d95ad;
   border: 1px solid rgba(141, 149, 173, 0.4);
@@ -222,7 +222,7 @@
   padding: 1px 6px;
 }
 .app-nav-txt {
-  font-size: 9.5px;
+  font-size: var(--fs-micro);
   color: #6d7590;
 }
 
diff --git a/src/renderer/shared/theme.css b/src/renderer/shared/theme.css
index 4ab2da1c2c..2920cb71b7 100644
--- a/src/renderer/shared/theme.css
+++ b/src/renderer/shared/theme.css
@@ -1,5 +1,14 @@
 @import 'tailwindcss';
 
+/* P7D-01 批二：tailwind 字号类并入 --fs-* 单源（v4 @theme 重绑——text-xs×131
+   =--fs-body / text-sm×25=--fs-title,零逐处改写;arbitrary 值 text-[10px]
+   不受重绑,消费面按清单改 var 载体。用户裁决 2026-09-08——docs/design/
+   2026-09-08_p7d01-b2-fontscale-ruling.md） */
+@theme {
+  --text-xs: var(--fs-body);
+  --text-sm: var(--fs-title);
+}
+
 /* 主题变量 v2（R3-TH1 视觉系统基建）：组件统一从这里取色，禁止散落硬编码色值。
    token 终值单一来源 = docs/design/mockups/shell-library.html（亮面 :root）+
    lineage-constellation.html（夜面 :root，R2 消费预留）——逐值誊录，
@@ -45,6 +54,14 @@
   --z-anchor-pop: 20;  /* 页内锚定弹层（阅读器标注菜单/编辑器） */
   --z-pop-veil: 40;    /* 弹层透明捕捉层（菜单 backdrop） */
   --z-pop: 50;         /* 弹层主体（模态/toast/菜单面板） */
+  /* ── 字号六档语义刻度（P7D-01 批二：用户裁决 2026-09-08——docs/design/
+     2026-09-08_p7d01-b2-fontscale-ruling.md;消费面禁字面量,INV-61）── */
+  --fs-micro: 10px;    /* 极小（脉络边标签/侧栏版本号/tab 关闭钮） */
+  --fs-caption: 11px;  /* 注脚（卡片 meta/图例/侧板节标系） */
+  --fs-body: 12px;     /* 正文基准（text-xs 同锚） */
+  --fs-strong: 13px;   /* 强调（nav 主字/侧板标题系） */
+  --fs-title: 14px;    /* 标题（详情标题/顶栏应用名,text-sm 同锚） */
+  --fs-display: 17px;  /* 展示（卡片衬线年份） */
   --font-display: Georgia, 'Times New Roman', 'Songti SC', SimSun, serif;
   --ink: #1b2333;
   --ink-hi: #232d44;
diff --git a/tests/unit/renderer/library-cards.test.tsx b/tests/unit/renderer/library-cards.test.tsx
index 5750c45969..6e00b0bc87 100644
--- a/tests/unit/renderer/library-cards.test.tsx
+++ b/tests/unit/renderer/library-cards.test.tsx
@@ -293,12 +293,16 @@ describe('R3-LIB 回炉一（门一 3B+3W）', () => {
     expect(css).toMatch(/\.lib-chip-on\s*\{[^}]*border-color: var\(--accent\)/)
   })
 
-  it('R1+R2 材质微调：dropzone 透明底落纸面；题名 14px/600、venue 11px、meta 10.5px', () => {
+  // P7D-01 批二（token 化配套——实现者自裁申报）：字号断言载体字面量→
+  // var(--fs-*)（title 14/venue 11 值不变零视觉差；meta 10.5→11=caption 档
+  // 用户裁决变化面）——值面锚随迁 theme.test.ts TOKENS 六正锚+FS 负锚矩阵；
+  // 本断言强度不放宽（逐类逐属性 toMatch 同构）。
+  it('R1+R2 材质微调：dropzone 透明底落纸面；题名 fs-title/600、venue/meta fs-caption（批二 token 化,meta 10.5→11 裁决变化）', () => {
     expect(css).toMatch(/\.lib-dropzone\s*\{[^}]*background: transparent/)
-    expect(css).toMatch(/\.lib-card-title\s*\{[^}]*font-size: 14px/)
+    expect(css).toMatch(/\.lib-card-title\s*\{[^}]*font-size: var\(--fs-title\)/)
     expect(css).toMatch(/\.lib-card-title\s*\{[^}]*font-weight: 600/)
-    expect(css).toMatch(/\.lib-card-venue\s*\{[^}]*font-size: 11px/)
-    expect(css).toMatch(/\.lib-card-meta\s*\{[^}]*font-size: 10\.5px/)
+    expect(css).toMatch(/\.lib-card-venue\s*\{[^}]*font-size: var\(--fs-caption\)/)
+    expect(css).toMatch(/\.lib-card-meta\s*\{[^}]*font-size: var\(--fs-caption\)/)
   })
 
   it('W3 共享位：theme-buttons.css 含 .lib-rule 三段（line-l/line-r/gem 渐隐线语法）', () => {
diff --git a/tests/unit/renderer/theme.test.ts b/tests/unit/renderer/theme.test.ts
index 616d3e9bb1..daaf899cd9 100644
--- a/tests/unit/renderer/theme.test.ts
+++ b/tests/unit/renderer/theme.test.ts
@@ -103,7 +103,15 @@ const TOKENS: Array<[string, string]> = [
   ['--z-float', '10'],
   ['--z-anchor-pop', '20'],
   ['--z-pop-veil', '40'],
-  ['--z-pop', '50']
+  ['--z-pop', '50'],
+  // ── P7D-01 批二：字号六档语义刻度（用户裁决 2026-09-08——docs/design/
+  //    2026-09-08_p7d01-b2-fontscale-ruling.md；负锚见批二 describe）──
+  ['--fs-micro', '10px'],
+  ['--fs-caption', '11px'],
+  ['--fs-body', '12px'],
+  ['--fs-strong', '13px'],
+  ['--fs-title', '14px'],
+  ['--fs-display', '17px']
 ]
 
 describe('R3-TH1 theme token 冒烟（mockup :root 防漂移锁）', () => {
@@ -377,3 +385,70 @@ describe('P7D-01 批一 token 收敛防线（三轴形态锁）', () => {
     )
   })
 })
+
+describe('P7D-01 批二 字号六档语义刻度防线（消费面负锚+@theme 重绑锁）', () => {
+  /**
+   * 批二迁移（用户裁决 2026-09-08——docs/design/2026-09-08_p7d01-b2-fontscale-
+   * ruling.md）：font-size 消费面 30 处硬编码→6 个 --fs-* token（13 处值变化=
+   * 裁决预期非缺陷+17 处仅换载体零视觉差）；tailwind text-xs×131/text-sm×25 经
+   * v4 @theme 重绑并入单源（arbitrary 值 text-[10px] 不受重绑——tsx 面单改
+   * var 载体）。
+   * 负锚口径注记（与批一 DURATION_COUNTS 的差异）：px 是通用长度单位
+   * （padding/radius/border 同值并存——实测 theme.css '12px' 现状 1 次为
+   * --radius-m 定义行，皮肤件非 font-size 声明同值多见），纯文本计数必误咬；
+   * 故负锚锚定「font-size: <字面量>;」声明形态（七 CSS 全 0），token 定义行
+   * 由 TOKENS 六正锚独立锁定——防护语义等价（定义正锚+消费负锚）。
+   */
+  const wsFsCss = readFileSync(
+    fileURLToPath(new URL('../../../src/renderer/features/workspaces/workspace.css', import.meta.url)),
+    'utf8'
+  )
+  const FS_CSS: Array<[string, string]> = [
+    ['theme.css', css],
+    ['theme-shell.css', shellCss],
+    ['theme-buttons.css', buttonsCss],
+    ['theme-reader.css', readerCss],
+    ['theme-lineage.css', lineageCss],
+    ['library.css', libCss],
+    ['workspace.css', wsFsCss]
+  ]
+  const FS_LITERALS = [
+    '9.5px', '10px', '10.5px', '11px', '11.5px', '12px',
+    '12.5px', '13px', '13.5px', '14px', '15px', '17px'
+  ]
+  const FS_COUNTS: Array<[string, string, string]> = FS_CSS.flatMap(([name, text]) =>
+    FS_LITERALS.map((lit) => [lit, name, text] as [string, string, string])
+  )
+  const FS_TSX = [
+    '../../../src/renderer/features/lineage/LineageNodeMeta.tsx',
+    '../../../src/renderer/features/lineage/LineageNodeCard.tsx',
+    '../../../src/renderer/features/lineage/LineageSideTags.tsx',
+    '../../../src/renderer/features/reader/TabBar.tsx'
+  ]
+    .map((rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8'))
+    .join('\n')
+
+  it.each(FS_COUNTS)(
+    'font-size 声明字面量 %s 在 %s 消费后归零（字号单源=--fs-* token）',
+    (lit, name, text) => {
+      const decl = new RegExp(`font-size:\\s*${lit.replaceAll('.', '\\.')}\\s*;`, 'g')
+      expect((text.match(decl) ?? []).length, `${name} 禁 font-size: ${lit} 字面量回填`).toBe(0)
+    }
+  )
+
+  it('四 tsx 禁 fontSize 数值字面量（inline 字号消费仅 var(--fs-*) token）', () => {
+    expect(FS_TSX, '票面明文形态：单引号数字开头').not.toContain("fontSize: '1")
+    expect(FS_TSX, '数值 fontSize 全形态（含无引号数字——SideTags fontSize: 11 形态）')
+      .not.toMatch(/fontSize:\s*['"`]?\d/)
+  })
+
+  it('四 tsx 禁 text-[数字] arbitrary 字号 class（arbitrary 不受 @theme 重绑）', () => {
+    expect(FS_TSX, '票面明文形态：text-[10 前缀').not.toContain('text-[10')
+    expect(FS_TSX, '数字开头 arbitrary（# 开头色值不咬）').not.toMatch(/text-\[\d/)
+  })
+
+  it('@theme 重绑在场（tailwind text-xs/text-sm 并入 --fs-* 单源——漂移即红）', () => {
+    expect(css).toContain('--text-xs: var(--fs-body)')
+    expect(css).toContain('--text-sm: var(--fs-title)')
+  })
+})
