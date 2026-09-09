# F-CSS-03 补审·Kimi 分片（U0 diff——零上下文行号锚 @n 形态）

背景：F-CSS-03（颜色 token 化战役+颜色负锚双关卡）已收口提交 682c646f1e。
首轮门一 131K 审包超 Kimi 网关窗 504 耗尽落 deepseek 兜底（同源欠账）——
本补审=Kimi 独立对抗，分四片（关卡/测试断言/CSS 迁移/tsx 迁移），主控拼装。
铁律：只读本文件材料；禁 npm/test/git；只报有代码证据的问题（file:line/
摘录）；不确定明说；中文。
**输出纪律（网关窗约束）**：每条 [B|W|N] 最多 3 行+证据 1 行；总输出控制在
3000 字内；结尾给统计行+一句总评。禁止长篇推演——推演要点化。

终态事实（供判断）：像素差分八态 0 带+sha 逐字节同+COMPARE PASS（settings
首采瞬态 1 次复采零差）；verify 全链 exit=0（160 文件/1562 用例/locks 311）；
主控亲改 6 测试件 12 断言改点（[locked-change] 域——受锁断言随 var() 载体
迁移+2 处 not.toBe 变异锚随迁保活）；实现=上轮迁移+本轮关卡落地（蓝本=
f-lint01-impl 报告 §3 临时实现）+主控测试处置。
## 片三：CSS 迁移面 diff（theme.css :root 48 token+7 CSS 消费面+注释清理）

diff --git a/src/renderer/features/library/library.css b/src/renderer/features/library/library.css
index c677f0971c..4f6ac90e6f 100644
--- a/src/renderer/features/library/library.css
+++ b/src/renderer/features/library/library.css
@@ -28 +28 @@
-  background: linear-gradient(168deg, #fffdf9 0%, var(--panel) 40%, #fdfaf3 100%);
+  background: linear-gradient(168deg, var(--lib-paper-hi) 0%, var(--panel) 40%, var(--lib-paper-lo) 100%);
@@ -30 +30 @@
-  box-shadow: var(--shadow-1), inset 0 1px 0 rgba(255, 255, 255, 0.9);
+  box-shadow: var(--shadow-1), inset 0 1px 0 var(--panel-a90);
@@ -56,2 +56,2 @@
-  box-shadow: var(--shadow-2), inset 0 0 0 1px rgba(201, 168, 106, 0.45),
-    inset 0 1px 0 rgba(255, 255, 255, 0.9);
+  box-shadow: var(--shadow-2), inset 0 0 0 1px var(--border-gold-a45),
+    inset 0 1px 0 var(--panel-a90);
diff --git a/src/renderer/features/reader/text-layer.css b/src/renderer/features/reader/text-layer.css
index c9ca7dbc91..fded0295a9 100644
--- a/src/renderer/features/reader/text-layer.css
+++ b/src/renderer/features/reader/text-layer.css
@@ -16 +16 @@
- *   不透明（官方 rgba(0 0 255 / 0.25) 压白底的合成等效色）。
+ *   不透明（官方蓝 25% 半透明压白底的合成等效色）。
@@ -23 +23 @@
- *   原生路线）：根因=自绘层 30% accent 合成 rgb(191,207,220) 近乎不可见+
+ *   原生路线）：根因=自绘层 30% accent 合成浅灰蓝（191,207,220）近乎不可见+
@@ -25 +25 @@
- *   rgba(0 0 255 / 0.25) 逐字值（pdfjs-dist web/pdf_viewer.css 678-685 行；
+ *   官方蓝 25% 逐字值（pdfjs-dist web/pdf_viewer.css 678-685 行；
@@ -29 +29 @@
- *   rgba(0 0 255 / 0.25)→rgba(0 0 0 / 0.30)（白纸合成≈#B3B3B3，黑字可读）。
+ *   官方蓝 25%→灰 30%（白纸合成≈中灰（179,179,179），黑字可读）。
@@ -37,2 +37,2 @@
- *   合成 #CCCCCC（仍清晰可辨，F-08「选中不可见」红线不回退），叠黄合成
- *   rgb(202,179,57) 较 0.30 的 rgb(177,157,50) 提亮一档。ADR-0019 补记同步。
+ *   合成浅灰（204,204,204）（仍清晰可辨，F-08「选中不可见」红线不回退），叠黄合成
+ *   暗金绿（202,179,57）较 0.30 的（177,157,50）提亮一档。ADR-0019 补记同步。
@@ -40 +40 @@
- *   根治令）：官方 pdf.js 已知缺陷（issue #17561 同族）——文本层逐 span 绘制，
+ *   根治令）：官方 pdf.js 已知缺陷（issue 17561 同族）——文本层逐 span 绘制，
diff --git a/src/renderer/features/workspaces/workspace.css b/src/renderer/features/workspaces/workspace.css
index cb9d97d684..7419dfc58c 100644
--- a/src/renderer/features/workspaces/workspace.css
+++ b/src/renderer/features/workspaces/workspace.css
@@ -5 +5 @@
-   （米白字 #efe9da + 5% 白底 + borderColor 无 border 宽度类=边框不渲染）
+   （米白字 + 5% 白底 + borderColor 无 border 宽度类=边框不渲染）
@@ -8,2 +8,2 @@
-   theme.css :root 单源（rgba(44,95,138,x)=--accent 透明度族，先例
-   rgba(201,168,106,x)=金族）。 */
+   theme.css :root 单源（--accent 透明度族=--accent-aNN 系，先例
+   金族）。 */
@@ -17 +17 @@
-  border: 1px solid rgba(44, 95, 138, 0.55);
+  border: 1px solid var(--accent-a55);
@@ -19 +19 @@
-  background: linear-gradient(120deg, #ffffff 0%, var(--accent-soft) 45%, #ffffff 100%);
+  background: linear-gradient(120deg, var(--panel) 0%, var(--accent-soft) 45%, var(--panel) 100%);
@@ -34 +34 @@
-  box-shadow: 0 0 0 3px rgba(44, 95, 138, 0.12), var(--shadow-2);
+  box-shadow: 0 0 0 3px var(--accent-a12), var(--shadow-2);
@@ -41 +41 @@
-  box-shadow: inset 0 2px 4px rgba(27, 35, 51, 0.18);
+  box-shadow: inset 0 2px 4px var(--ink-a18);
@@ -66 +66 @@
-  border: 1px solid rgba(44, 95, 138, 0.45);
+  border: 1px solid var(--accent-a45);
@@ -105 +105 @@
-  background: rgba(44, 95, 138, 0.22);
+  background: var(--accent-a22);
@@ -119 +119 @@
-  border: 1px solid rgba(44, 95, 138, 0.45);
+  border: 1px solid var(--accent-a45);
@@ -128 +128 @@
-  box-shadow: 0 0 0 2px rgba(44, 95, 138, 0.15);
+  box-shadow: 0 0 0 2px var(--accent-a15);
diff --git a/src/renderer/shared/theme-buttons.css b/src/renderer/shared/theme-buttons.css
index d24c548ea0..93d8219a77 100644
--- a/src/renderer/shared/theme-buttons.css
+++ b/src/renderer/shared/theme-buttons.css
@@ -14 +14 @@
-  background: linear-gradient(150deg, #3a76ab 0%, var(--accent) 48%, #234a6d 100%);
+  background: linear-gradient(150deg, var(--accent-hi) 0%, var(--accent) 48%, var(--accent-deep) 100%);
@@ -17,3 +17,3 @@
-  color: #ffffff;
-  border-color: #234a6d;
-  box-shadow: inset 0 0 0 1px rgba(201, 168, 106, 0.45), var(--shadow-1);
+  color: var(--panel);
+  border-color: var(--accent-deep);
+  box-shadow: inset 0 0 0 1px var(--border-gold-a45), var(--shadow-1);
@@ -28 +28 @@
-  box-shadow: inset 0 0 0 1px rgba(227, 201, 143, 0.7), var(--shadow-2);
+  box-shadow: inset 0 0 0 1px var(--gold-bright-a70), var(--shadow-2);
@@ -37,2 +37,2 @@
-    inset 0 0 0 1px rgba(227, 201, 143, 0.7),
-    inset 0 2px 6px rgba(11, 26, 40, 0.45);
+    inset 0 0 0 1px var(--gold-bright-a70),
+    inset 0 2px 6px var(--btn-press-tint);
@@ -65 +65 @@
-  background: rgba(179, 64, 58, 0.12);
+  background: var(--danger-a12);
@@ -84 +84 @@
-  background: rgba(207, 174, 114, 0.3);
+  background: var(--gold-press);
diff --git a/src/renderer/shared/theme-lineage.css b/src/renderer/shared/theme-lineage.css
index b2e21c4bf0..654bab3a57 100644
--- a/src/renderer/shared/theme-lineage.css
+++ b/src/renderer/shared/theme-lineage.css
@@ -23 +23 @@
-  background: rgba(255, 255, 255, 0.88);
+  background: var(--panel-a88);
@@ -63 +63 @@
-  background: rgba(255, 255, 255, 0.88);
+  background: var(--panel-a88);
@@ -95 +95 @@
-  background: rgba(255, 255, 255, 0.88);
+  background: var(--panel-a88);
@@ -114 +114 @@
-   foreignObject 内 HTML div 自然换行；10px 斜体灰阶 #6b7280 弱于节点
+   foreignObject 内 HTML div 自然换行；10px 斜体灰阶（--edge-label-text）弱于节点
@@ -128 +128 @@
-  color: #6b7280;
+  color: var(--edge-label-text);
@@ -133 +133 @@
-  text-shadow: 2px 0 #ffffff, -2px 0 #ffffff, 0 2px #ffffff, 0 -2px #ffffff;
+  text-shadow: 2px 0 var(--panel), -2px 0 var(--panel), 0 2px var(--panel), 0 -2px var(--panel);
diff --git a/src/renderer/shared/theme-shell.css b/src/renderer/shared/theme-shell.css
index d0ae1ed566..85e560f9f7 100644
--- a/src/renderer/shared/theme-shell.css
+++ b/src/renderer/shared/theme-shell.css
@@ -70 +70 @@
-   hover 浸染；close hover=系统红 #e81123。皮肤住类（B1 教训：禁内联 style
+   hover 浸染；close hover=系统红（--close-red）。皮肤住类（B1 教训：禁内联 style
@@ -110 +110 @@
-  background: rgba(44, 95, 138, 0.1);
+  background: var(--accent-a10);
@@ -114 +114 @@
-  background: rgba(44, 95, 138, 0.2);
+  background: var(--accent-a20);
@@ -121,2 +121,2 @@
-  background: #e81123;
-  color: #ffffff;
+  background: var(--close-red);
+  color: var(--panel);
@@ -125,2 +125,2 @@
-  background: #f1707a;
-  color: #ffffff;
+  background: var(--close-red-press);
+  color: var(--panel);
@@ -138,2 +138,2 @@
-  color: #cfd5e4;
-  background: linear-gradient(180deg, var(--ink), #171e2f);
+  color: var(--nav-text);
+  background: linear-gradient(180deg, var(--ink), var(--ink-deep));
@@ -150 +150 @@
-  background: linear-gradient(180deg, transparent, rgba(201, 168, 106, 0.5), transparent);
+  background: linear-gradient(180deg, transparent, var(--border-gold-a50), transparent);
@@ -165 +165 @@
-  color: #aeb6ca;
+  color: var(--nav-item-text);
@@ -180,2 +180,2 @@
-  color: #e6eaf4;
-  background: rgba(255, 255, 255, 0.06);
+  color: var(--nav-item-text-hover);
+  background: var(--panel-a06);
@@ -185,2 +185,2 @@
-  color: #eaf1fa;
-  background: rgba(44, 95, 138, 0.35);
+  color: var(--nav-item-text-press);
+  background: var(--accent-a35);
@@ -191 +191 @@
-  color: #f3eddd;
+  color: var(--nav-item-text-current);
@@ -193 +193 @@
-  box-shadow: inset 0 0 0 1px rgba(201, 168, 106, 0.28);
+  box-shadow: inset 0 0 0 1px var(--border-gold-a28);
@@ -211 +211 @@
-  border-top: 1px solid rgba(255, 255, 255, 0.07);
+  border-top: 1px solid var(--panel-a07);
@@ -219,2 +219,2 @@
-  color: #8d95ad;
-  border: 1px solid rgba(141, 149, 173, 0.4);
+  color: var(--nav-ver-text);
+  border: 1px solid var(--nav-ver-border);
@@ -226 +226 @@
-  color: #6d7590;
+  color: var(--nav-foot-text);
diff --git a/src/renderer/shared/theme.css b/src/renderer/shared/theme.css
index 2920cb71b7..c5e95fff07 100644
--- a/src/renderer/shared/theme.css
+++ b/src/renderer/shared/theme.css
@@ -16 +16 @@
-   值冲突裁决（票面 P1）：--gold 亮面值占用（夜面 #cfae72 别名 --gold-night
+   值冲突裁决（票面 P1）：--gold 亮面值占用（夜面值别名 --gold-night
@@ -19 +19 @@
-   rgb(253,224,71) 精确断言锁死（预知必红则不制造红，预裁②口径）。 */
+   黄色精确断言锁死（预知必红则不制造红，预裁②口径）。 */
@@ -89,0 +90,66 @@
+  /* ── F-CSS-03 颜色 token（2026-09-09 用户双裁决零视觉差迁移：值原样入库,
+     同值合并共享单 token;白→--panel/暖灰描边→--border 直接消费既有 token
+     不立第二源;命名规约=基色 alpha 族 <基token>-a<两位alpha>（如 --accent-a45）
+     +单用途取主导用途名+影子复合值沿 --shadow-* 词汇;50 值命名表=
+     scripts/audits/f-css03-impl.report.md 附录;消费负锚=check-quality C-4
+     [CSS 行级,--name: 定义行豁免]+eslint B-5 [tsx inline style];值防漂移=
+     theme.test.ts TOKENS 正锚）── */
+  /* accent 透明度族（基色=--accent）*/
+  --accent-a10: rgba(44, 95, 138, 0.1);
+  --accent-a12: rgba(44, 95, 138, 0.12);
+  --accent-a15: rgba(44, 95, 138, 0.15);
+  --accent-a20: rgba(44, 95, 138, 0.2);
+  --accent-a22: rgba(44, 95, 138, 0.22);
+  --accent-a35: rgba(44, 95, 138, 0.35);
+  --accent-a45: rgba(44, 95, 138, 0.45);
+  --accent-a55: rgba(44, 95, 138, 0.55);
+  /* 金族透明度（基色=--border-gold/--gold-bright;第三基色挂
+     --gold-soft 系语义名）*/
+  --border-gold-a15: rgba(201, 168, 106, 0.15);
+  --border-gold-a28: rgba(201, 168, 106, 0.28);
+  --border-gold-a45: rgba(201, 168, 106, 0.45);
+  --border-gold-a50: rgba(201, 168, 106, 0.5);
+  --gold-bright-a70: rgba(227, 201, 143, 0.7);
+  --gold-press: rgba(207, 174, 114, 0.3);
+  /* danger 透明度族（基色=--danger）*/
+  --danger-a08: rgba(179, 64, 58, 0.08);
+  --danger-a12: rgba(179, 64, 58, 0.12);
+  --danger-a25: rgba(179, 64, 58, 0.25);
+  /* 白透明度族（基色=--panel;--panel-glass 0.72 为既存语义名）*/
+  --panel-a06: rgba(255, 255, 255, 0.06);
+  --panel-a07: rgba(255, 255, 255, 0.07);
+  --panel-a35: rgba(255, 255, 255, 0.35);
+  --panel-a88: rgba(255, 255, 255, 0.88);
+  --panel-a90: rgba(255, 255, 255, 0.9);
+  --panel-a92: rgba(255, 255, 255, 0.92);
+  /* caption 三键（Windows 系统红）*/
+  --close-red: #e81123;
+  --close-red-press: #f1707a;
+  /* 侧栏 nav 墨青域（文本阶梯+结构色）*/
+  --nav-text: #cfd5e4;
+  --nav-item-text: #aeb6ca;
+  --nav-item-text-hover: #e6eaf4;
+  --nav-item-text-press: #eaf1fa;
+  --nav-item-text-current: #f3eddd;
+  --nav-ver-text: #8d95ad;
+  --nav-ver-border: rgba(141, 149, 173, 0.4);
+  --nav-foot-text: #6d7590;
+  --ink-deep: #171e2f;
+  --ink-a18: rgba(27, 35, 51, 0.18);
+  /* syn-btn primary 渐变端点+按压内影色 */
+  --accent-hi: #3a76ab;
+  --accent-deep: #234a6d;
+  --btn-press-tint: rgba(11, 26, 40, 0.45);
+  /* 文献库卡片纸渐变端点 */
+  --lib-paper-hi: #fffdf9;
+  --lib-paper-lo: #fdfaf3;
+  /* 脉络域（边标签/推断边/节点 meta 描边/note 卡描边）*/
+  --edge-label-text: #6b7280;
+  --edge-inferred: #8a94a6;
+  --node-meta-border: #dfa84a;
+  --note-border: rgba(151, 160, 187, 0.28);
+  /* 阅读器（划选自绘层灰+页盒/弹层影——影复合值沿 --shadow-* 词汇）*/
+  --reader-selection-paint: rgba(0, 0, 0, 0.2);
+  --shadow-page: 0 1px 4px rgba(0, 0, 0, 0.12);
+  --shadow-pop-sm: 0 2px 8px rgba(0, 0, 0, 0.15);
+  --shadow-pop-md: 0 2px 12px rgba(0, 0, 0, 0.18);
@@ -105 +171 @@ body,
-  background-image: repeating-linear-gradient(115deg, rgba(255, 255, 255, 0.35) 0 2px, transparent 2px 6px);
+  background-image: repeating-linear-gradient(115deg, var(--panel-a35) 0 2px, transparent 2px 6px);
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

工单：①:root 48 token vs 附录命名表对账（数量/名/值）；②消费面迁移完整性
（+行无字面量残留）；③值等价性抽查（缩写 .15/.5/尾零 0.20 等形态差）；
④hover/selected/disabled 特异性推演（值载体迁移不动特异性结构的确认）；
⑤注释清理的可追溯性代价评估。输出 [B|W|N]+统计+总评。
