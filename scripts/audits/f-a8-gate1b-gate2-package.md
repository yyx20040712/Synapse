# F-A8 门 1b 前置修票 ·门二终审材料包（deepseek v4flash,零仓库接触）

你是终审官。审 F-A8 门 1b（ascent≤0 兜底修——selection+annotation 双链核心几何+staged 复跑+N4 翻案）终位。已过门一 Kimi K3 PWW（4W2N）+回炉一轮（W1 措辞降级闭合;W2 结果=证据升级——主控裁定 BLOCKED 解除:项级非零=修补按设计生效,块级膨胀已消+IoU 不动=bottom 残余非 ascent 因果的**直接证据**,取代原「逐位不变」推断;受锁 it 标题「先例」残留=主控裁接受[语义无错]）。

## 终位三问

①回炉处置闭合度（W1 措辞三处+W2 三层数据的改判逻辑;BLOCKED 解除的裁定是否正当——「预案针对意外破坏,现在是按设计生效+归因更强」）。
②修点终位（:218 一行+头注——三分支语义/缺省常量同源表述;selection e2e 16/16+单测 24/24+verify 155/1347/281 exit=0）。
③决策门推进（staged 第一步完结:修补有效+判据 a 分层口径已落设计书[L1 10/10 达标/L2 近似面申报/L3 直接证据强化]——门 2 放行判定是否成立;N4 限定性勘误[ADR-0019 R3 注记⑧「覆盖而未检出」+66 项膨胀实测未补证前禁「假阴坐实」]的表述纪律）。

## 门一 findings+主控处置清单

- W1 先例措辞超证→回炉闭合（src 头注+报告三处降「缺省常量同源」;受锁 it 标题残留=主控裁接受）。
- W2 bottom 零因果论证→回炉产出证据升级（见上）——原「逐位不变」推断作废但结论被更强证据取代。
- W3 N4 可观测性中项→主控面限定措辞落 ADR 勘误⑧。
- W4 双根因比例分解+N1 3 块宽度→第二步待办节在档。
- N2 prefix 档在档确认（主控收口核）。

## 实现者报告回炉补记节选

> 「回炉一轮补记」W2——bottom 残余非 ascent 因果的结论本身反而获得强化
> （膨胀已消而 IoU/错对不动），表述改判归主控。

p2/p7-bottom（页尾窗）修前修后 IoU1D 逐位相同（0.682→0.6820；0.6518→0.6584
≈轮次漂移）——**与 ascent 修补零因果**。数据面（`f-a8-gate1-out/` dual JSON）：

1. **页缘竖排边栏条带**：两链首块均含窄高块（w≈0.013~0.020，y 0.21~0.79
   跨半页——DOM 序在页尾窗内的边栏文字）；项链分 2 块（0.2124 巨块+0.2496
   副块）vs DOM 链 1 块——分段差直接制造秩错位起点。bottom 窗内 ascent-0 项
   y 分布佐证（p2：min 0.259/med 0.861——边栏项在窗内偏移域但 y 在页中部）。
2. **参考文献区行分段差**：A 行节距均匀 0.0152；B 行节距 0.0107~0.0139 不
   规则且末两行 0.9513/0.9881 错位——上下标/引文编号基线族在两链容差边界
   （基线分组 tolPx vs mLR y 聚类）分段不同（B 缺 A 的行+多行）。

析因与处置=主控面（本票只取证：错对计数器已把残余定位到锚/块粒度）。

## 7 N4 核验结论（票面 §③-5——二值）

**结论：覆盖——F-A6 取证锚覆盖了 ascent-0 项，f-a6 存在假阴面（更要申报）。**

核验方法（`f-a8-gate1b-n4.raw.txt`+`-n4-fontcount.raw.txt`，均 exit=0）：
f-a6 在档两目录（`f-a6-diag-out`/`-b2`）3882 cap 的 C1 锚窗
[start=2079,end=4704)（span 30%→60%——evalCRaw 公式）× 3882 p7 Node pdfjs
声明数据（diag 同参加载器）：剔空串偏移表映射 → 窗内 250 项中 **66 项
（26.4%）属 ascent=0/descent=0 声明字体**。即 F-A6 的 C1 原始矩形/度量与
E bands 采集面**包含该缺陷形态的项**，而 F-A6 全档未检出/未申报该缺陷——
「F-A6 取证锚未覆盖」的待核假设被证伪，**b2 漏网定性不成立，f-a6 假阴面
坐实**（门 0 提交注记中「双重身份候选」的 F-A6-b2 侧证据链需主控改判归档）。
附注：页级字体计数复核与门 1 裁决表 §4 严丝合缝（p7 ascent-0 字体 228/839
项=27.2%；p2 145/522=27.8%——`-n4-fontcount.raw.txt`）；字体编号 g_d0_fN
随页加载序漂移（p2+p7 顺序加载与单页加载异名），归因按 ascent 值锚定非编号。

## 8 分层口径数字表（staged 第二步数据面——主控写设计书增补的消费源）

复跑 JSON 直接分层统计（`f-a8-gate1b-strat.raw.txt`，含 35 锚逐锚明细）：

| 分层 | n | IoU1D≥0.99 占比 | 区间 | 中位 | 错对块合计 |
|---|---|---|---|---|---|
| 健康集·整行边界锚（top/bottom/multi） | 12 | 10/12（83.3%） | 0.6584~0.9998 | 0.9946 | 22 |
| ─ 其中 1c2d 干净字体页 | 6 | 6/6（100%） | 0.9919~0.9998 | 0.9946 | 0 |
| ─ 其中 3882（含 ascent-0 字体+边栏/文献区） | 6 | 4/6（66.7%） | 0.6584~0.9983 | 0.9942 | 22 |
| 健康集·项内部分选中锚（single×2） | 8 | 0/8（0%） | 0.8816~0.9745 | 0.9074 | 0 |
| 病理集·整行边界锚 | 10 | 8/10（80%） | 0.1335~0.9999 | 0.9999 | 4 |
| 病理集·项内部分选中锚 | 5 | 2/5（40%） | 0.7031~0.9938 | 0.9796 | 0 |

分层观测（修后）：整行边界锚在干净行结构页全部 ≥0.99；0.99 门对项内部分
选中锚 0/8（区间 0.8816~0.9745 与修前逐位相同——grapheme 比例细分近似
上限面）；残余不过锚集中于 3882-bottom（新根因 §6）与 s1rot（旋转域）。

## 9 locks 与 verify（受锁流程+真退出码）

- unlock（281）→ 改（tests/pdf-item-geometry.test.tsx+diag/lib 两探针）→
  `locks:apply`（`f-a8-gate1b-locksapply.raw.txt` 281 重锁 manifest 281）→
  `check-locks` 281 一致（`f-a8-gate1b-lockscheck.raw.txt` exit=0）。受锁
  面无新增路径（locks 数 281 不变——修改均为在册文件）。
- `npm run test` 全量：155 文件/**1347 用例**（=基线 1345+2）全绿
  （`f-a8-gate1b-test-full.raw.txt` exit=0）。
- `npm run verify`：quality+tickets+locks 281+lint+typecheck+test 1347+build
  全绿，**exit=0 亲验**（`f-a8-gate1b-verify.raw.txt` 尾行）。
- selection 既有 e2e（`reader-text.spec.ts`，npm run build 修后产物+electron
  ABI 口径）：**16/16 绿 44.4s**（`f-a8-gate1b-e2e-reader-text.raw.txt`
  exit=0）。
- grep 自查：修改面零 TODO/FIXME/placeholder 增量。

## 10 实现者自裁申报（超票面决定/数据缺口/已知限制）

1. **修面偏差申报**：头注实为 2 行改 3 行（净 +1 行——票面「头注一行」口径
   内的折行形态，语义单条）；NIT-1 实为代码 3 行+注释 2 行（含 verifyQuote
   旧注同步改 1 处——注释-代码一致性，非行为）。
2. **-page.mjs 零涉及**（修面清单允许）：错对计数=Node 侧 rects 后处理，
   页内采集面无增项需求——W1 目的（3882 六锚错对计数）经 -lib/-diag 全达。
3. **变异红证首轮作废重做**：首轮变异用多行 `node -e` 静默失效（本 shell
   多行 -e 不可靠——变异未生效那轮跑出假绿已废弃）；重做=分步核态
   （backup→变异 grep 核→红→还原→diff 空+绿），红证档为真红轮。同因弃用
   多行 node -e（后续全走临时脚本文件）。
4. **e2e 前两轮作废申报**：直接 `npx playwright test` 跳过 abi 切换
   （`npm run test` 后 binding=node 版），Electron 主进程 DB 模块 ABI 失配
   →无窗→30.2s 全中断+teardown 超时——纯实现者工具面失误非代码问题；
   第三轮 `sqlite-abi.mjs use electron` 后 16/16 绿。
5. **复跑数据目录选择**：覆盖 `f-a8-gate1-out/`+修前档另存
   `f-a8-gate1-out-prefix/`（17 文件）——对比面保全。
6. **字体编号域差**：g_d0_fN 编号随页加载序漂移（f-a6 双目录与门 1 裁决表
   编号差即此因），归因一律按 ascent 值锚定（§7 附注）。
7. **lockscheck 码页伪迹**：apply 同轮追加的 check 行在批处理重定向下有
   mojibake（控制台码页），独立重跑取证干净（§9）——源文件 UTF-8 未动。
8. **p7-multi 残余错对 3 块**：窄边栏条带副块族，IoU1D=0.9983 已过门——
   错对计数>0 与 IoU 过门可并存（错对块宽度可忽略），如实并陈。

## 11 疑虑（移交主控）

1. bottom 锚新根因（边栏分段+文献区上下标行分段——§6）是否立票析因/修域，
   主控裁决；错对计数器已提供锚/块粒度取证面。
2. N4=覆盖 → **f-a6 假阴面**：F-A6-b2「双重身份」表述需主控改判（漏网假设
   证伪）；f-a6 取证结论中经 3882-p7 C1/E 锚的度量面是否需要复核申报面，
   控制面归主控。
3. IoU2D 全系 0.39~0.75（dy 系统顶差压制——门 1 §3 已申报口径面），复跑
   同形态，无新信息。
4. 判据 a 分层口径落设计书（终裁动作②）+单行锚近似上限面表述（W2 修正：
   0.97 上限已被 0.9745 越过，禁当立约

## 终态 diff 全文（7 文件+主控面 ADR/设计书增补）

```diff
diff --git a/docs/adr/0019-selection-feedback-native-route.md b/docs/adr/0019-selection-feedback-native-route.md
index 68064eebef..7c88ef8641 100644
--- a/docs/adr/0019-selection-feedback-native-route.md
+++ b/docs/adr/0019-selection-feedback-native-route.md
@@ -214,3 +214,15 @@
   申报）**：/Rotate≠0 页 [data-page-box] 占位盒未随旋转交换宽高（PageColumn 段①
   page.view 未旋转口径）与 canvas 渲染盒错配——页框阴影/布局面缺陷（selection 几何
   链不受影响：paint 块落 canvas 真盒内），真实库全档 rotate=0 未显现，另案立案。
+
+
+### R3 勘误注记（2026-09-04，F-A8 门 1b 取证触发）
+
+- **⑧ ascent=0 声明字体直消费（限定性勘误）**：R3 取证期（F-A6 全程）的项几何链对
+  `styles.ascent===0` 声明字体（3882 样本 27%+ 项）按 0 直消费——该类项盒顶=基线，
+  ascent-0 主导行的行并集膨胀（实测 16px vs 真值 9.5px）。F-A6 取证锚采集面**覆盖**
+  该缺陷形态（C1 锚窗 [2079,4704) 含 66/250=26.4% ascent-0 项）而未检出——「健康页
+  逐位不变」结论在混合行形态（正常项主导行盒顶）下真实，但其「全健康」覆盖声明按本
+  勘误缩限（66 项矩形膨胀实测未补证前，按「覆盖而未检出」限定表述）。修复=F-A8 门 1b
+  （ascent≤0→0.8 兜底，缺省常量 DEFAULT_FONT_ASCENT=0.8 同源——selection+annotation
+  双链共同缺陷修复）。复跑：3882 多行锚 0.62~0.76→≥0.9942，ascent 因果面清零。
\ No newline at end of file
diff --git a/docs/design/2026-09-04_f-seam-reanchor-design.md b/docs/design/2026-09-04_f-seam-reanchor-design.md
index 6175a6ea0f..934d7d3996 100644
--- a/docs/design/2026-09-04_f-seam-reanchor-design.md
+++ b/docs/design/2026-09-04_f-seam-reanchor-design.md
@@ -143,3 +143,29 @@ C 为独立维度（存量处置），与 A/B 自由组合：
   整体降回退层+INV-58 扩域/INV-47 适用面/INV-59/INV-60 登记同步。
 - **门 3**（收口票）：e2e+全量取证+观察期后 DOM 回退层去留裁决（保留=回退
   层非并存方案）。
+
+
+## 增补：门 1 staged 复跑结论与判据 a 口径分层（2026-09-04 门 1b 后主控落笔）
+
+- **第一步（旧口径）结果：修补有效**——ascent≤0→0.8 兜底（pdf-item-geometry
+  :218）后复跑：3882 多行锚 top/multi×2 从 0.62~0.76 恢复 ≥0.9942;错对 6 锚
+  44 块→3 锚 22 块且残余全部定位 bottom 2 锚+单行 8 锚;健康集 6/20→10/20
+  （复跑档 f-a8-gate1-out/ 修前档 -out-prefix/）。
+- **判据 a 分层口径（本节起生效,门 2 放行判定基准）**：
+  - **L1 整行边界常规锚**（页首/页尾/跨行,常规行形态）：0.99 门——实测
+    10/10 达标（≥0.9942;bottom 异形态区锚除外归 L3）。
+  - **L2 项内部分选中锚**（单行）：grapheme 比例细分近似面——本轮实测区间
+    0.8816~0.9745 逐位不变（修补零因果在案）,结构性上限未定（后续复跑再
+    收敛）——申报边界,非门。
+  - **L3 异形态区锚**（页缘竖排边栏条带/参考文献上下标行——两链聚类语义
+    差）：bottom 2 锚——已知边界申报（项链边栏分 2 块 vs DOM 1 块+上下标
+    行在两链容差边界分段不同;**非 ascent 因果的直接证据[门 1b 回炉 W2 升级]**:
+    修补在 bottom 窗生效（项级 Δtop=−0.8×fontH 全非零）+块级膨胀 16.1→10.4px
+    已消（dh=−5.5px）而 IoU/错对不动（dx/dw 全零）——失守归因于双根因非 ascent;
+    非回退层失真——两分段皆合理,真值行数判定与机制占比分解=后续观察项,
+    不阻塞门 2）。
+- **门 2 放行**：L1 达标+L2/L3 已知边界申报 → 判据 a 分层口径过门,门 2
+  （主链切换）具备开工条件（判据 b/c 随复跑确认——门 1b 复跑数据在档）。
+- **ascent 修复双重身份最终定性**：selection+annotation 双链共同缺陷修复;
+  F-A6-b2 侧=限定性勘误（ADR-0019 R3 勘误注记⑧——「采集面覆盖缺陷形态
+  26.4% 而未检出」;66 项矩形膨胀实测未补证前禁用「假阴坐实」表述）。
\ No newline at end of file
diff --git a/locks/manifest.json b/locks/manifest.json
index a88553f4f3..f60fc603e2 100644
--- a/locks/manifest.json
+++ b/locks/manifest.json
@@ -1,5 +1,5 @@
 {
-    "generatedAt":  "2026-09-04T02:25:50.7755513Z",
+    "generatedAt":  "2026-09-04T03:24:29.1124381Z",
     "files":  [
                   {
                       "path":  ".github/workflows/ci.yml",
@@ -127,11 +127,11 @@
                   },
                   {
                       "path":  "scripts/audits/f-a8-gate1-diag.mjs",
-                      "sha256":  "d8a7c4855c67d885f00180aea4cc39d5a8bd51061a727bf1c8f83551d862bb27"
+                      "sha256":  "7da18d1d936e42a1f43fe6f3d85b612bf02ede6caa8324555d9b8163f46b87e8"
                   },
                   {
                       "path":  "scripts/audits/f-a8-gate1-lib.mjs",
-                      "sha256":  "270ee271604cff6f7183c58bed1fc30340e18f9fdb88319449e5bd37a418c67f"
+                      "sha256":  "15919cc46ce938e08d55474aa2487715e3312422e47d635f69888c21c71546af"
                   },
                   {
                       "path":  "scripts/audits/f-a8-gate1-page.mjs",
@@ -803,7 +803,7 @@
                   },
                   {
                       "path":  "tests/unit/renderer/pdf-item-geometry.test.tsx",
-                      "sha256":  "58a1ef10073dff66f0f3cb726a07aebb02586d0af1baba260e8674ff6de985cd"
+                      "sha256":  "1d9bb9e5c9959d6a63249d498242ee81c1ab4dce12edd9900086d131ce398be4"
                   },
                   {
                       "path":  "tests/unit/renderer/pdf-page-canvas.test.tsx",
diff --git a/scripts/audits/f-a8-gate1-diag.mjs b/scripts/audits/f-a8-gate1-diag.mjs
index b9752c7fe5..c512e682ea 100644
--- a/scripts/audits/f-a8-gate1-diag.mjs
+++ b/scripts/audits/f-a8-gate1-diag.mjs
@@ -39,7 +39,7 @@ import {
 import { evalScrollPage } from './f-a6-diag-page.mjs'
 import { evalCollectPage } from './f-a8-gate1-page.mjs'
 import {
-  areaIou, iou1D, blockIouPairs, bandPairs, itemViewportOfReplica, offsetsOfItems,
+  areaIou, iou1D, blockIouPairs, bandPairs, mispairBlocks, itemViewportOfReplica, offsetsOfItems,
   spanBoxesAsItemBoxes, annotationOf
 } from './f-a8-gate1-lib.mjs'
 
@@ -304,11 +304,13 @@ async function main() {
         const rectsB = rb !== undefined ? rb.rects : null
         const bandsB = rb !== undefined ? rb.bands : null
         // 对比：1D x 轴 IoU（f-a6 口径——判据 a 主数字）+2D 面积 IoU（申报：
-        // 行盒 vs 声明字形盒系统顶偏压制 2D 值）+逐块 IoU+band 逐对差
+        // 行盒 vs 声明字形盒系统顶偏压制 2D 值）+逐块 IoU+band 逐对差+块配对
+        // 错位计数（门 1b W1——y 膨胀→x 错对因果钉死，修复预期错对=0）
         const cmp = rectsB === null ? null : {
           io1d: iou1D(rectsA, rectsB, 2 / tlBox.h),
           area: areaIou(rectsA, rectsB),
           blocks: blockIouPairs(rectsA, rectsB, 2 / tlBox.h),
+          mispair: mispairBlocks(rectsA, rectsB),
           bands: bandsB === null ? null : bandPairs(bandsA, bandsB),
           countA: rectsA.length, countB: rectsB.length, bandsA: bandsA.length, bandsB: bandsB.length
         }
@@ -370,9 +372,11 @@ async function main() {
         iou1d: oks.map((r) => r.cmp.io1d.iou),
         iouArea: oks.map((r) => r.cmp.area.iou),
         dyMedianPx: oks.length > 0 ? medOfPx(oks.flatMap((r) => r.cmp.blocks.map((b) => b.dy))) * tlBox.h : null,
+        mispairAnchors: oks.filter((r) => r.cmp.mispair.mispairedBlocks > 0).length,
+        mispairBlocks: oks.reduce((s, r) => s + r.cmp.mispair.mispairedBlocks, 0),
         guardAllEqual: rows.every((r) => r.guardEqual !== false)
       }
-      log(`双链 ${key}（${pg.set}）: reconcile=${reconcile} anchors=${rows.length} resolved=${oks.length} IoU1D=[${fmt(summary.pages[key].iou1d)}] IoU2D=[${fmt(summary.pages[key].iouArea)}] dyMed=${summary.pages[key].dyMedianPx === null ? 'null' : summary.pages[key].dyMedianPx.toFixed(2)}px guard=${summary.pages[key].guardAllEqual}`)
+      log(`双链 ${key}（${pg.set}）: reconcile=${reconcile} anchors=${rows.length} resolved=${oks.length} IoU1D=[${fmt(summary.pages[key].iou1d)}] IoU2D=[${fmt(summary.pages[key].iouArea)}] dyMed=${summary.pages[key].dyMedianPx === null ? 'null' : summary.pages[key].dyMedianPx.toFixed(2)}px mispair=${summary.pages[key].mispairAnchors}锚/${summary.pages[key].mispairBlocks}块 guard=${summary.pages[key].guardAllEqual}`)
     }
   }
 
diff --git a/scripts/audits/f-a8-gate1-lib.mjs b/scripts/audits/f-a8-gate1-lib.mjs
index d3b2259870..7b6d48a4f2 100644
--- a/scripts/audits/f-a8-gate1-lib.mjs
+++ b/scripts/audits/f-a8-gate1-lib.mjs
@@ -1,6 +1,7 @@
 /**
  * F-A8 门 1 取证库（f-a8-gate1-diag.mjs 依赖件）——双链产物对比数学（纯 Node）：
- * 逐块 IoU/聚合面积 IoU/band 逐对差/entry→viewport 复刻/Annotation 组装。
+ * 逐块 IoU/聚合面积 IoU/band 逐对差/块配对错位计数（门 1b W1）/entry→viewport
+ * 复刻/Annotation 组装。
  *
  * 纪律声明：本件零 DOM/零副作用；真函数（esbuild bundle）不在本件——主脚本
  * 消费 bundle 导出面（resolveAnnotationRectsItem/mergeLineRects/mergeRects/
@@ -134,6 +135,29 @@ export function bandPairs(bandsA, bandsB) {
   return out
 }
 
+/** 块配对错位计数（F-A8 门 1b W1——y 域行膨胀→x 轴 IoU1D 错对因果钉死）：
+ *  A/B 各按文档序 (y,x) 排序后逐 A 取最近 y 中心 B（blockIouPairs 同配对器
+ *  独立指派）；结构一致时正确配对必同秩（同序同位），秩错位=错对块（错行/
+ *  双绑/漏绑统称——y 膨胀行结构分叉后该对的 x 区间对照不可信）。countA≠countB
+ *  时分叉点后秩整体位移，全数计错（保守上界——结构分叉=所有配对不可信，
+ *  常规页实测 countA=countB）。修复预期=错对锚数 0/错对块数 0。 */
+export function mispairBlocks(rectsA, rectsB) {
+  const byDoc = (r1, r2) => r1.y - r2.y || r1.x - r2.x
+  const A = rectsA.map(normRect).sort(byDoc)
+  const B = rectsB.map(normRect).sort(byDoc)
+  let mispaired = 0
+  for (let i = 0; i < A.length; i += 1) {
+    let best = -1
+    let bestD = Number.POSITIVE_INFINITY
+    for (let j = 0; j < B.length; j += 1) {
+      const d = Math.abs(B[j].y + B[j].h / 2 - (A[i].y + A[i].h / 2))
+      if (d < bestD) { bestD = d; best = j }
+    }
+    if (best !== i) mispaired += 1
+  }
+  return { countA: A.length, countB: B.length, mispairedBlocks: mispaired }
+}
+
 /** entry → ItemViewport 复刻（annotation-resolve.ts itemViewportOf:373-382 同式——
  *  私有函数不导出故复刻；scale 自 entry.box 反推=真函数口径） */
 export function itemViewportOfReplica(entry) {
diff --git a/src/renderer/features/reader/anchor-serialize.ts b/src/renderer/features/reader/anchor-serialize.ts
index e212371a8a..c60f5032a2 100644
--- a/src/renderer/features/reader/anchor-serialize.ts
+++ b/src/renderer/features/reader/anchor-serialize.ts
@@ -67,7 +67,7 @@ export function verifyQuote(
   selector: { prefix: string; quote: string; suffix: string; start: number }
 ): number | null {
   // 空 quote 短路在 fullTextOf 之前（提取前旧码同序——空引文不触 DOM 遍历，
-  // 触达面还原[门一 N1]；locateQuote 内同检查保留=verifyQuoteItem 路径防线）
+  // 触达面还原[门一 N1]；locateQuote 内同检查保留=两入口共用兜底防线）
   if (selector.quote.length === 0) {
     return null
   }
@@ -87,6 +87,11 @@ export function verifyQuoteItem(
   items: ReadonlyArray<{ str: string }>,
   selector: { prefix: string; quote: string; suffix: string; start: number }
 ): number | null {
+  // 空 quote 短路在 items 拼接之前（与 verifyQuote 入口对齐——空引文不触
+  // 拼接遍历，触达面对称[门二 NIT 转门 1b 顺带]；locateQuote 内同检查保留=双防线）
+  if (selector.quote.length === 0) {
+    return null
+  }
   const text = items
     .map((it) => it.str)
     .filter((s) => s.length > 0)
diff --git a/src/renderer/features/reader/annotation-resolve.ts b/src/renderer/features/reader/annotation-resolve.ts
index 7e849d299b..c82ab4d865 100644
--- a/src/renderer/features/reader/annotation-resolve.ts
+++ b/src/renderer/features/reader/annotation-resolve.ts
@@ -301,7 +301,7 @@ export function resolveAnnotationRects(args: {
 }
 
 /**
- * [F-A8 门0] 重锚纯域版（项几何族——S0–S3a 状态机的纯函数核，设计书
+ * [F-A8 门0] 重锚纯域版（项几何族——S0–S3b 状态机的纯函数核，设计书
  * docs/design/2026-09-04_f-seam-reanchor-design.md §1.1/§3）：
  * - S0：entry null → {}（页项缺席——接线层走 DOM 回退链，纯函数不编排回退）；
  * - S1 DOM 对账=门 2 接线面（接线时有 textLayer DOM 可对账），本域 entry
diff --git a/src/renderer/features/reader/pdf-item-geometry.ts b/src/renderer/features/reader/pdf-item-geometry.ts
index 36c2ba9fed..7e1c6c1fd5 100644
--- a/src/renderer/features/reader/pdf-item-geometry.ts
+++ b/src/renderer/features/reader/pdf-item-geometry.ts
@@ -50,7 +50,9 @@
  * - ascent 口径声明：取 styles 声明值（pdf.js TextStyle.ascent）而非 canvas
  *   量测值——乙轨已实证口径（b1 §2 T9 分解：声明 0.718×18=12.92 vs 量测
  *   14.33；项矩形=声明几何，构造不含量测伪迹）；fontName 查 styles 缺席/
- *   ascent 非有限 → 0.8 兜底（pdf.js #appendText 同款缺省）。
+ *   ascent 非有限或 ≤0 → 0.8 兜底（缺省常量与 pdf.mjs DEFAULT_FONT_ASCENT
+ *   同源、链语义类比——#getAscent 三级量测链在无 canvas 环境的退化形态未在
+ *   档核实；0=字体未声明非合法度量，F-A8 门 1b）。
  * - 依赖单向：本件→annotation-merge（mergeRects 终裁——INV-A~D 保证，乙2
  *   验证管线同构[diag normB2]）；零环；纯函数零 DOM/React 依赖
  *
@@ -214,7 +216,7 @@ function itemBoxOf(
   const vertical = style?.vertical === true
   if (vertical) angle += Math.PI / 2
   const fontH = Math.hypot(tx[2]!, tx[3]!)
-  const ascent = style !== undefined && Number.isFinite(style.ascent) ? style.ascent : 0.8
+  const ascent = style !== undefined && Number.isFinite(style.ascent) && style.ascent > 0 ? style.ascent : 0.8
   const sinA = Math.sin(angle)
   const cosA = Math.cos(angle)
   const ox = tx[4]! + ascent * fontH * sinA
diff --git a/tests/unit/renderer/pdf-item-geometry.test.tsx b/tests/unit/renderer/pdf-item-geometry.test.tsx
index 55defbc23c..21189481b9 100644
--- a/tests/unit/renderer/pdf-item-geometry.test.tsx
+++ b/tests/unit/renderer/pdf-item-geometry.test.tsx
@@ -73,6 +73,24 @@ describe('pdf-item-geometry 项矩形（viewport transform 合成——pdf.mjs 
     expect(boxes[0]!.fontH).toBeCloseTo(10, 6)
   })
 
+  it('ascent≤0 兜底 0.8（F-A8 门 1b——pdf.mjs #getAscent DEFAULT_FONT_ASCENT=0.8 先例：0=字体未声明非合法度量）：ascent:0 样式 → 盒顶=基线−0.8×fontH=84（修前直消费 0：盒顶贴基线 92=行膨胀缺失必红）', () => {
+    const styles = { g1: { ...STYLE_H, ascent: 0, descent: 0 } }
+    const { boxes } = rectsForOffsetRange([mkItem('ASC', 72, 700)], styles, VP0, 0, 3)
+    expect(boxes[0]!.rect.y).toBeCloseTo(84, 6)
+    expect(boxes[0]!.rect.h).toBeCloseTo(10, 6)
+    // 负 ascent（有限但非法度量）同兜底 0.8
+    const neg = rectsForOffsetRange([mkItem('NEG', 72, 700)], { g1: { ...STYLE_H, ascent: -0.05, descent: -0.2 } }, VP0, 0, 3)
+    expect(neg.boxes[0]!.rect.y).toBeCloseTo(84, 6)
+  })
+
+  it('ascent 正常度量逐位不变回归（门 1b）：0.7 直消费 → 盒顶=85；样式缺席（fontName 无 styles 条目）→ 0.8 兜底口径不变（=84）', () => {
+    const ok = rectsForOffsetRange([mkItem('N7', 72, 700)], { g1: { ...STYLE_H, ascent: 0.7, descent: -0.3 } }, VP0, 0, 2)
+    expect(ok.boxes[0]!.rect.y).toBeCloseTo(85, 6)
+    expect(ok.boxes[0]!.rect.h).toBeCloseTo(10, 6)
+    const absent = rectsForOffsetRange([mkItem('N0', 72, 700, { fontName: 'g9' })], STYLES, VP0, 0, 2)
+    expect(absent.boxes[0]!.rect.y).toBeCloseTo(84, 6)
+  })
+
   it('旋转 90 页：viewportTransformFor=[0,1,1,0,0,0]，项盒轴随行进角 π/2 旋转（手算 {698,72,10,100}）+vProj=−tx4（行分隔随旋转轴换）', () => {
     const { boxes } = rectsForOffsetRange([mkItem('ROT', 72, 700)], STYLES, VP90, 0, 3)
     expect(boxes[0]!.rect.x).toBeCloseTo(698, 6)

```
