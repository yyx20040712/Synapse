# P7D-01 批一 ·门一审材料包（Kimi 链,零仓库接触）

你是门一对抗审查员。审 P7D-01 批一：design token 三轴机械迁移（动效 duration 32 处→--dur-* 7 token/间距 inline 12 处→tailwind class/弹层 z 四值→--z-* 4 token 语义命名）——**甲式机械迁移,验收=零视觉差**。你拿不到仓库,只审本包材料。

## 0. 上游（在档,不重审）

用户裁决 2026-09-03「乙字号+甲其余」：字号轴（批二,在场轮,mockup 逐档裁）走语义刻度;动效/间距/层级轴（本票批一,闲时可动）走甲式机械迁移零视觉差（无头截图 diff 验收）。底数盘点=docs/design/2026-09-03_p7d01-token-candidates.md（主控已按计数纪律脚本复核,简报数字为准）。

## 1. 审查任务（工单 A~E）

- **A 母本符合度**：diff vs 简报（附后）——③主控裁决逐条（token 定义代码逐字照抄?32 处 duration/12 处 z class/12 处间距的迁移表逐行兑现?animation 时长 5s/2.8s/6s/0.16s 零改?`marginLeft:'auto'` 保留?page-layer-z.ts 仅头注?）。
- **B 宪法红线**：受锁流程（theme.test.ts 唯一受锁触碰件,unlock→改→apply,manifest 282 恒定）;禁新依赖;文件行数;测试纪律（新测试 always-active,恒真断言排查——尤其「在场锚」3 条的鉴别力）。
- **C 代码与测试质量**（含 **CSS 皮肤类强制审项：hover/selected/disabled 特异性显式推演**）：
  - 间距 inline→tailwind class 的层叠语义变化推演——inline style 恒压一切,迁 class 后 theme.css **非 @layer 规则恒压 tailwind utilities 层**（unlayered>layered）:12 处消费元素是否存在被 unlayered CSS 规则（theme.css 三域样式）竞争同属性（padding/margin/gap）的元素?主控预裁③声明已核查零竞争——请对抗验证（逐元素推演或推翻）;
  - `z-(--z-pop)` v4 CSS 变量简写形态的编译风险与特异性推演（同 utilities 层同特异性 vs 旧 z-50——层叠解析等价?）;
  - 负锚断言质量：值面计数 21 三元组（regex 全字面计数边界——0.2s vs 0.22s）;层级形态锁/间距形态锁的 regex 漏洞（`marginLeft:'auto'` 放行/`var(...)` 值放行?多文件合并串的绕过面?）;在场锚精确子串形态（自裁②）是否引入脆断言（重构 className 顺序即红=可接受?）;
  - 变异红证 3 个鉴别力（token 值红/层级值红/间距形态红——覆盖三轴各一?）。
- **D 报告诚实性**：自裁①~⑤逐条 vs diff 对账（①SelectionToolbar 头注同步=负锚必然?②在场锚断言形态强化?③元组类型注解必要?④首红 30/31 红一条假绿披露?⑤0.2s regex 边界）;疑虑①②移交主控的处置记录在案（主控已亲处置:确定性脚本删除+探针期望改计算值形态——见 §3）。
- **E 接缝与后续单**：批二字号轴的预留正确性（token 命名体系与 --fs-* 扩展兼容?）;INV 登记延后至批二的正当性（票面明示「同族 token 单源面一并登记」——半条 INV 风险?）;SelectionToolbar 头注 z-10→z-(--z-float) 与其「层叠序最顶」语义描述的准确性（page-layer-z.ts:17 注释同问——页内比较域 vs 弹层域措辞）。

## 2. 实现者声明摘要（报告全文要点,报告在仓库不可达——以本节+diff 对账）

- 三轴全落地:32 duration+14 z（12 class+2 raw z-index）+12 间距;token 定义插位 --radius-l 后 --font-display 前。
- TDD:首红 31 failed|54 passed (85) exit=1（含 0.3s 计数一条现状恰绿——自裁④披露）;绿=theme.test.ts 85/85+全量 **155 文件/1395 用例 exit=0**（基线 1357+38）;变异红证 3（--dur-fast 0.14→0.15s:2F/--z-pop 50→51:1F/还原 paddingLeft:6:1F——cp 备份法,RESTORED-CLEAN×3,禁 git checkout 合规）。
- verify 首跑 exit=1 红点=主控在档产物 determinism-check.cjs require() 触发 lint（实现面单独 lint/typecheck/test/build 全 exit=0 落盘）;locks 282 恒定。
- 探针首跑 [COMPARE] FAIL 仅 tokens 序列化形态（0.08s→"80ms"/".12s" 去前导零——Chromium <time> 归一;png×8 逐字节+sweeps 逐键已全同）。

## 3. 主控已亲验/已预裁项（可攻击,推翻需更强依据）

**主控亲验（verify-before-completion,不信转述）**：
- `npm run verify` 亲跑 exit=0（155 文件/1395 用例/locks 282/lint/typecheck/build 全绿,raw=p7d01-b1-verify2.raw.txt）;
- 探针主控亲跑 [COMPARE] PASS exit=0（11 token 计算值精确匹配+8 态截图 sha256 逐字节相同+全 DOM 计算样式 transition/zIndex 逐键相同,raw=p7d01-b1-probe2.raw.txt）;
- 探针确定性前提=基线双跑 DETERMINISM PASS（8 图逐字节相同,raw=p7d01-determinism.raw.txt）;
- 两个实现者疑虑已主控亲处置：①determinism-check.cjs 取证后删除（lint 红点消除,verify 复跑绿）②探针 EXPECT_TOKENS 期望值改 Chromium 计算值序列化形态（'80ms'/'.12s'…——仪器期望面,源码字面仍由 theme.test.ts TOKENS 锁'0.08s;',两锁互补;非放宽:仍精确断言,断言面=计算值）。

**预裁声明**：
- 三轴值域=现状值逐位保持（票面钉死 token 值=迁移前 grep 实测收敛值——机械迁移零视觉差由探针三重证据锁）;
- 12 处间距消费元素零 unlayered CSS 竞争同属性（主控逐文件核查 theme.css 三域样式选择器面）;
- animation 时长不属「7 档」债面（盘点口径:transition duration）,零改正确;
- INV 登记延后批二（同族 --fs-* 轴落地时一并登记「design token 单源」——避免半条不变量）。

## 4. 票面简报全文

# P7D-01 批一实现者简报——design token 三轴机械迁移（动效 --dur-*/间距清扫/弹层 --z-*）

> 主控=GLM-5.3；实现者=子代理（**GLM5.3flash 定档申报**,环境统一档欠账披露——
> Agent 工具面无 model 参数,账本如实记）。
> 票：P7D-01 批一（registry:245——用户裁决 2026-09-03「乙字号+甲其余」,批一=甲式
> 机械迁移零视觉差,闲时可动）。上游底数=docs/design/2026-09-03_p7d01-token-candidates.md §1/§2
> （主控本场已按 DoD 计数纪律脚本复核——以下数字为准）。

## ① 身份与禁令

禁 git add/commit/push；禁翻 tickets/registry。控制面（docs/invariants.md/ADR/
prompts）**零改**——本票不登记 INV（弹层 z 档/时长档与批二字号轴同族,「design
token 单源」INV 留批二字号轴落地时一并登记,票面明示）。卡点=BLOCKED 停手不自裁。

## ② 必读序

1. `AGENTS.md`（宪法——测试纪律/受锁流程/行数）。
2. `docs/design/2026-09-03_p7d01-token-candidates.md`（§1/§2 底数+裁决语境）。
3. `src/renderer/shared/theme.css` **全文**（:root token 块/各 .syn-* 皮肤——
   token 定义落点+16 处 duration 消费面+B1 教训头注「静态+hover 同层」）。
4. `src/renderer/features/workspaces/workspace.css`（7 处）+`src/renderer/features/
   library/library.css`（9 处）——duration 消费面。
5. 弹层 9 消费件：`src/renderer/shared/ui/Dialog.tsx`+`Toast.tsx`+`src/renderer/
   features/reader/AnnotationMenu.tsx`+`AnnotationEditor.tsx`+`SelectionToolbar.tsx`
   +`src/renderer/features/tags/TagLifecycleMenu.tsx`+`src/renderer/features/lineage/
   LineageToolbar.tsx`+`LineageNodeMenu.tsx`+`LineageBoard.tsx`（各 1~2 处 z-10/20/40/50）。
6. 间距 6 消费件：`src/renderer/features/lineage/`下 LineageNodeCard.tsx（2 处）/
   LineageNodeMeta.tsx（4 处）/LineageSideAiNotes.tsx（1 处）/LineageSideManualNote.tsx
   （1 处）/LineageSidePanel.tsx（1 处）/LineageSideTags.tsx（3 处）。
7. `src/renderer/features/reader/page-layer-z.ts`（头注第 17 行提及「菜单 z-20/编辑器
   z-20/工具条 z-10」——**仅头注措辞更新**接缝归责,数值零改）。
8. `tests/unit/renderer/theme.test.ts`（**受锁**——TOKENS 数组+负锚形态先例,B1 形态锁
   describe 为间距清扫的形态面先例）。
9. `scripts/audits/p7d01-visual-probe.mjs`（**主控验收工具,禁改**——读头注知其原理即可）。

## ③ 主控裁决（实现者不再自裁）

### 轴 1：动效时长 32 处→7 token（值不变仅载体变）

theme.css `:root` 增（放 --radius-l 之后、--font-display 之前,带分节注释）：

```css
/* ── 动效时长（P7D-01 批一：7 档收敛——值即现状,零视觉差）── */
--dur-press: 0.08s;  /* 按压瞬态（active transform 微缩/下沉——游戏钮瞬态） */
--dur-tint: 0.12s;   /* 滤镜/浸染快变（filter/titlebar 底色） */
--dur-fast: 0.14s;   /* 标准快（background/border/color 类） */
--dur-base: 0.18s;   /* 基准（hover 综合态含 box-shadow） */
--dur-lazy: 0.2s;    /* 缓变（dropzone 描边/影） */
--dur-rise: 0.22s;   /* 卡片升腾（文献卡 hover 三通道+角饰 opacity） */
--dur-flow: 0.3s;    /* 渐变流动（primary background-position 平移） */
```

逐值替换（transition 声明内裸值→`var(--dur-*)`）：theme.css 16 处
（0.08×4/0.14×6/0.12×3/0.18×2/0.3×1）+workspace.css 7 处（0.18×2/0.08×2/0.12×1/
0.14×2）+library.css 9 处（0.22×4/0.14×2/0.08×1/0.2×2）=32 处。
**animation 时长（syn-pan-* 5s/2.8s/6s）不在本票面——零改**。

### 轴 2：弹层 z 序语义命名（4 值→4 token+12 class 改写）

theme.css `:root` 增：

```css
/* ── 弹层 z 序四档（P7D-01 批一语义命名——值不变零视觉差；
   页内 0~3 层单源=page-layer-z.ts,不在此）── */
--z-float: 10;       /* 画布/页面浮动控件（工具条/提示条/适应钮）+顶栏抬升 */
--z-anchor-pop: 20;  /* 页内锚定弹层（阅读器标注菜单/编辑器） */
--z-pop-veil: 40;    /* 弹层透明捕捉层（菜单 backdrop） */
--z-pop: 50;         /* 弹层主体（模态/toast/菜单面板） */
```

- theme.css :92 `.app-header` 与 :552 `.lineage-fit-btn` 的 `z-index: 10`→
  `z-index: var(--z-float)`；
- 12 处 tailwind class 改写（**v4 CSS 变量简写形态**）：`z-10`→`z-(--z-float)`、
  `z-20`→`z-(--z-anchor-pop)`、`z-40`→`z-(--z-pop-veil)`、`z-50`→`z-(--z-pop)`
  （9 文件 12 处——Dialog 1/Toast 1/AnnotationEditor 1/AnnotationMenu 1/
  SelectionToolbar 1/TagLifecycleMenu 2/LineageNodeMenu 2/LineageToolbar 1/
  LineageBoard 1）；
- page-layer-z.ts:17 头注措辞「菜单 z-20/编辑器 z-20/工具条 z-10」→新 class 名——
  **仅注释,四常量数值零改**。

### 轴 3：间距 inline 12 处→tailwind class（B1 形态：静态皮肤住类）

px 值→class 映射（tailwind v4 动态 0.25 刻度）：4→`-1`、3→`-0.75`、6→`-1.5`、8→`-2`。

| # | 位置 | 现状（style 内） | 迁移（className 追加） |
| --- | --- | --- | --- |
| 1 | LineageNodeCard.tsx:51 | `paddingTop: 8`（TITLE_STYLE 内） | 消费处 `pt-2` |
| 2 | LineageNodeCard.tsx:147 | `gap: 4`（footer style 块内） | `gap-1` |
| 3 | LineageNodeMeta.tsx:34 | `padding: '0 4px'` | `px-1` |
| 4 | LineageNodeMeta.tsx:47 | `gap: 3` | `gap-0.75` |
| 5 | LineageNodeMeta.tsx:48 | `padding: '0 3px'` | `px-0.75` |
| 6 | LineageNodeMeta.tsx:82 | `paddingLeft: 4` | `pl-1`（`marginLeft:'auto'` 非数值间距,**保留 inline**） |
| 7 | LineageSideAiNotes.tsx:72 | `paddingLeft: 6` | `pl-1.5` |
| 8 | LineageSideManualNote.tsx:58 | `paddingLeft: 6` | `pl-1.5` |
| 9 | LineageSidePanel.tsx:112 | `paddingLeft: 6`（H4_ACCENT 内） | `pl-1.5` |
| 10 | LineageSideTags.tsx:19 | `gap: 3` | `gap-0.75` |
| 11 | LineageSideTags.tsx:20 | `padding: '0 4px'` | `px-1` |
| 12 | LineageSideTags.tsx:48 | `paddingLeft: 6` | `pl-1.5` |

形态：style 对象/常量**只删该间距属性**,其余（color/borderLeft/fontSize/flex 等）
原样保留；消费元素 className 追加对应 class（元素无 className 则新建）。
**接缝前提（主控已核查）**：12 元素均无 unlayered CSS 规则竞争同属性
（theme.css 非 @layer 规则恒压 tailwind utilities 层——若有竞争则迁移改变生效值,
探针必红）。

### 测试面（TDD——theme.test.ts 受锁扩展,唯一受锁触碰件）

改前 `npm run locks:unlock`,改完即时 `npm run locks:apply`（locks 条目数不变=282）：

1. TOKENS 数组追加 11 条（`['--dur-press','0.08s']`…`['--z-float','10']`…）+
   分节注释「P7D-01 批一：token 收敛值（registry 裁决——非 mockup :root 面）」；
2. 新 describe「P7D-01 批一 token 收敛防线（三轴形态锁）」：
   - **值面负锚**：7 个 duration 字面量在 3 CSS 文件出现次数==定义处数
     （theme.css 各 1 次/workspace.css 0/library.css 0——`it.each` 21 三元组）；
   - **层级形态锁**：theme.css `not.toMatch(/z-index:\s*(10|20|40|50)\b/)`；
     9 弹层 tsx 合并串 `not.toMatch(/\bz-(10|20|40|50)\b/)`；
   - **间距形态锁**：6 lineage tsx 合并串无「数值间距属性」（regex 须放行
     `marginLeft: 'auto'`/`var(...)` 值——主控建议
     `/(padding|margin|gap)(Top|Bottom|Left|Right)?:\s*('[\d-]|[\d])/`）；
   - **class 在场锚**：≥3 处新 class 名在对应文件在场（如 NodeCard 含 pt-2、
     SideTags 含 pl-1.5——防「全删不补」假绿）。

## ④ 纪律

- TDD：先红（TOKENS 11+新 describe 全套对现状红）→迁移→绿→**变异红证 ≥3**
  （①token 值 0.14s→0.15s 红/②z 值 50→51 红/③还原一处 paddingLeft:6 间距
  形态锁红——**未提交实现禁 git checkout 还原,用 cp 备份法**,宪法测试纪律条）；
  首红与每次变异原始输出**各自落盘** `.raw.txt`（scripts/audits/
  p7d01-b1-first-red.raw.txt/-mutation-{1,2,3}.raw.txt）。
- `npm run test` 禁裸 npx vitest；**收口 `npm run verify` 真退出码落盘**
  （scripts/audits/p7d01-b1-verify.raw.txt,末行 echo exit=$?）。
- **视觉零差验收（票面条款,主控工具）**：`npm run build` 后
  `node scripts/audits/p7d01-visual-probe.mjs after > scripts/audits/p7d01-b1-probe.raw.txt 2>&1`
  ——console 须 `[COMPARE] PASS`+exit=0（8 态截图逐字节相同+全 DOM 计算样式
  transition/zIndex 逐键相同+11 token 期望值精确匹配；基线已由主控双跑
  确定性验证在档 p7d01-out/determinism-check.cjs 输出）。探针脚本禁改——
  对比失败=实现缺陷,禁调仪器。
- 多断言禁与行尾注释同置；禁新依赖；UTF-8；受锁新件无（探针已由主控入锁）。
- 自裁申报：票面外一切决定（含删减面）报告逐条列。

## ⑤ 基线数字（自检参照）

- verify=155 文件/**1357 用例**/locks **282**（探针入锁后新基线）/e2e 42（本票
  不触碰 e2e 面——主控已核查 tests/ 零断言被迁移形态）。
- 用例数增量预估=11（TOKENS）+21（值面负锚）+2（层级形态）+1（间距形态）+
  1~3（在场锚）≈36~38 →预期 ~1393~1395（以实际为准,报告精确数）。

## ⑥ 报告契约

全文落 `scripts/audits/p7d01-b1-impl.report.md`：实现摘要/文件清单/首红+变异
红证引证（raw 路径）/verify 真退出码/探针 COMPARE 结果/locks 实录（unlock→apply
全程）/自裁申报/疑虑。回复五行内。

## 5. 完整 diff（21 文件,203+/68-;locks/manifest.json 含主控探针入锁面）

```diff
diff --git a/locks/manifest.json b/locks/manifest.json
index 2ee6c2efbe..22d5b298ab 100644
--- a/locks/manifest.json
+++ b/locks/manifest.json
@@ -1,5 +1,5 @@
 {
-    "generatedAt":  "2026-09-04T05:11:34.9049630Z",
+    "generatedAt":  "2026-09-04T14:45:57.6532680Z",
     "files":  [
                   {
                       "path":  ".github/workflows/ci.yml",
@@ -245,6 +245,10 @@
                       "path":  "scripts/audits/f-v2-diag.mjs",
                       "sha256":  "40b9bb27655f7ec1d4d6144d316c9ac70a4ab04dfb59fb07fb4a9dba21316b78"
                   },
+                  {
+                      "path":  "scripts/audits/p7d01-visual-probe.mjs",
+                      "sha256":  "b2a0209de657105f1f75f35830295a443ddc74a8b9dfa93fb8d4fd72e82004a9"
+                  },
                   {
                       "path":  "scripts/audits/r2-f11-forensics.mjs",
                       "sha256":  "ec75b92a1d153c2716bab0360adaaa64cfd793a5c4683ea93d7049b34d4bc560"
@@ -927,7 +931,7 @@
                   },
                   {
                       "path":  "tests/unit/renderer/theme.test.ts",
-                      "sha256":  "85091a76d7788fece76ad899c9d4b6dc5eff4952647fdfe96d931005f2bb0d6f"
+                      "sha256":  "6218c9799491c2519ec3925fb2f1c20743dd90cad0e1822beeaf881742913ecf"
                   },
                   {
                       "path":  "tests/unit/renderer/toast.test.tsx",
diff --git a/src/renderer/features/library/library.css b/src/renderer/features/library/library.css
index 1536278916..f15e1ee558 100644
--- a/src/renderer/features/library/library.css
+++ b/src/renderer/features/library/library.css
@@ -29,7 +29,7 @@
   background-clip: padding-box;
   box-shadow: var(--shadow-1), inset 0 1px 0 rgba(255, 255, 255, 0.9);
   cursor: pointer;
-  transition: box-shadow 0.22s ease, border-color 0.22s ease, transform 0.22s ease;
+  transition: box-shadow var(--dur-rise) ease, border-color var(--dur-rise) ease, transform var(--dur-rise) ease;
 }
 .lib-card:hover {
   box-shadow: var(--shadow-2);
@@ -68,7 +68,7 @@
   border: 1px solid transparent;
   opacity: 0;
   pointer-events: none;
-  transition: opacity 0.22s ease;
+  transition: opacity var(--dur-rise) ease;
 }
 .lib-corner-tl {
   top: -1px;
@@ -163,9 +163,9 @@
   background: var(--panel-glass);
   box-shadow: var(--shadow-1);
   transition:
-    color 0.14s ease,
-    border-color 0.14s ease,
-    transform 0.08s ease;
+    color var(--dur-fast) ease,
+    border-color var(--dur-fast) ease,
+    transform var(--dur-press) ease;
 }
 /* active chip（回炉 W2）：镜像 mockup .chip.on——accent-soft 底+accent 描边 */
 .lib-chip-on {
@@ -187,7 +187,7 @@
   border: 1px dashed var(--border-gold);
   border-radius: var(--radius-l);
   background: transparent;
-  transition: box-shadow 0.2s ease, border-color 0.2s ease;
+  transition: box-shadow var(--dur-lazy) ease, border-color var(--dur-lazy) ease;
 }
 .lib-dropzone-dragging {
   border-color: var(--gold);
diff --git a/src/renderer/features/lineage/LineageBoard.tsx b/src/renderer/features/lineage/LineageBoard.tsx
index a418c3127b..7311943249 100644
--- a/src/renderer/features/lineage/LineageBoard.tsx
+++ b/src/renderer/features/lineage/LineageBoard.tsx
@@ -154,7 +154,7 @@ export function LineageBoard(props: {
           白底 accent 描边，行为零变） */}
       {pendingLink !== null && (
         <div
-          className="absolute left-1/2 top-2 z-10 flex -translate-x-1/2 items-center gap-2 rounded border px-3 py-1 text-xs"
+          className="absolute left-1/2 top-2 z-(--z-float) flex -translate-x-1/2 items-center gap-2 rounded border px-3 py-1 text-xs"
           style={{ borderColor: 'var(--accent)', background: 'var(--panel)', color: 'var(--accent)' }}
           data-testid="lineage-pending-link"
         >
diff --git a/src/renderer/features/lineage/LineageNodeCard.tsx b/src/renderer/features/lineage/LineageNodeCard.tsx
index 22bf39f9ae..6c47d51bac 100644
--- a/src/renderer/features/lineage/LineageNodeCard.tsx
+++ b/src/renderer/features/lineage/LineageNodeCard.tsx
@@ -48,7 +48,6 @@ import { LineageNodeMeta } from './LineageNodeMeta'
  * ——minHeight 0 显式声明为防御）。
  */
 const TITLE_STYLE = {
-  paddingTop: 8,
   flex: 1,
   minHeight: 0,
   fontSize: '12.5px',
@@ -131,20 +130,20 @@ export function LineageNodeCard(props: {
           实现保断言」先例执行）；HTML 属性值不入 textContent 单源保持 */}
       <foreignObject x={-w / 2 + 12} y={-h / 2} width={w - 24} height={h}>
         <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
-          <div ref={titleRef} style={TITLE_STYLE} title={n.title}>
+          <div ref={titleRef} className="pt-2" style={TITLE_STYLE} title={n.title}>
             {n.title}
           </div>
           {/* 底行信息区（F-LG13 锚：恒 24px；F-LG14 填充=LineageNodeMeta——
               含金量+标签组+年份三段，高度含在统一高 110 内（主控裁决 6）） */}
           <div
             data-card-footer
+            className="gap-1"
             style={{
               height: 24,
               flexShrink: 0,
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
-              gap: 4,
               fontSize: '12px',
               color: 'var(--text-dim)'
             }}
diff --git a/src/renderer/features/lineage/LineageNodeMenu.tsx b/src/renderer/features/lineage/LineageNodeMenu.tsx
index 03c8a2836c..d58d51f97c 100644
--- a/src/renderer/features/lineage/LineageNodeMenu.tsx
+++ b/src/renderer/features/lineage/LineageNodeMenu.tsx
@@ -46,12 +46,12 @@ export function LineageNodeMenu(props: LineageNodeMenuProps): JSX.Element {
   return (
     <>
       {/* 透明遮罩：点击任意处关闭（菜单本体 stopPropagation） */}
-      <div className="fixed inset-0 z-40" onClick={props.onClose} />
+      <div className="fixed inset-0 z-(--z-pop-veil)" onClick={props.onClose} />
       <div
         data-testid="lineage-node-menu"
         role="menu"
         aria-label={`节点菜单：${node.title}`}
-        className="fixed z-50 w-40 rounded border py-1 shadow-lg"
+        className="fixed z-(--z-pop) w-40 rounded border py-1 shadow-lg"
         style={{
           left: anchor.x,
           top: anchor.y,
diff --git a/src/renderer/features/lineage/LineageNodeMeta.tsx b/src/renderer/features/lineage/LineageNodeMeta.tsx
index 7d031c98dd..97553eed22 100644
--- a/src/renderer/features/lineage/LineageNodeMeta.tsx
+++ b/src/renderer/features/lineage/LineageNodeMeta.tsx
@@ -31,7 +31,6 @@ const TAG_CHIP_STYLE = {
   flexShrink: 0,
   fontSize: '10px',
   lineHeight: '16px',
-  padding: '0 4px',
   borderRadius: 3,
   color: 'var(--danger)',
   background: 'rgba(179, 64, 58, 0.08)',
@@ -44,8 +43,6 @@ const TAG_BOX_STYLE = {
   height: 18,
   display: 'flex',
   alignItems: 'center',
-  gap: 3,
-  padding: '0 3px',
   border: '1px solid #dfa84a',
   borderRadius: 4,
   overflowX: 'auto',
@@ -69,9 +66,9 @@ export function LineageNodeMeta(props: {
         </span>
       )}
       {tags.length > 0 && (
-        <div data-card-tags style={{ ...TAG_BOX_STYLE, flex: '0 1 auto' }}>
+        <div data-card-tags className="gap-0.75 px-0.75" style={{ ...TAG_BOX_STYLE, flex: '0 1 auto' }}>
           {tags.map((t) => (
-            <span key={t} data-card-tag style={TAG_CHIP_STYLE}>
+            <span key={t} data-card-tag className="px-1" style={TAG_CHIP_STYLE}>
               {t}
             </span>
           ))}
@@ -79,7 +76,8 @@ export function LineageNodeMeta(props: {
       )}
       <span
         data-card-year
-        style={{ flexShrink: 0, marginLeft: 'auto', paddingLeft: 4, whiteSpace: 'nowrap' }}
+        className="pl-1"
+        style={{ flexShrink: 0, marginLeft: 'auto', whiteSpace: 'nowrap' }}
       >
         {n.year === null ? '未知年份' : String(n.year)}
       </span>
diff --git a/src/renderer/features/lineage/LineageSideAiNotes.tsx b/src/renderer/features/lineage/LineageSideAiNotes.tsx
index cf0d0d6810..53fa4a7fd7 100644
--- a/src/renderer/features/lineage/LineageSideAiNotes.tsx
+++ b/src/renderer/features/lineage/LineageSideAiNotes.tsx
@@ -68,8 +68,8 @@ export function LineageSideAiNotes(props: {
   return (
     <section data-testid="lineage-side-ai-notes" className="flex flex-col gap-1">
       <h4
-        className="m-0 font-medium"
-        style={{ color: 'var(--text-dim)', borderLeft: '3px solid var(--accent)', paddingLeft: 6 }}
+        className="m-0 pl-1.5 font-medium"
+        style={{ color: 'var(--text-dim)', borderLeft: '3px solid var(--accent)' }}
       >
         AI 笔记
       </h4>
diff --git a/src/renderer/features/lineage/LineageSideManualNote.tsx b/src/renderer/features/lineage/LineageSideManualNote.tsx
index d27764a17e..d743e0afd5 100644
--- a/src/renderer/features/lineage/LineageSideManualNote.tsx
+++ b/src/renderer/features/lineage/LineageSideManualNote.tsx
@@ -54,8 +54,8 @@ export function LineageSideManualNote(props: { paperId: string }): JSX.Element {
   return (
     <section data-testid="lineage-side-manual-note" className="flex flex-col gap-1">
       <h4
-        className="m-0 font-medium"
-        style={{ color: 'var(--text-dim)', borderLeft: '3px solid var(--accent)', paddingLeft: 6 }}
+        className="m-0 pl-1.5 font-medium"
+        style={{ color: 'var(--text-dim)', borderLeft: '3px solid var(--accent)' }}
       >
         人工笔记
       </h4>
diff --git a/src/renderer/features/lineage/LineageSidePanel.tsx b/src/renderer/features/lineage/LineageSidePanel.tsx
index 4ffb2a3a57..e140f0d4ba 100644
--- a/src/renderer/features/lineage/LineageSidePanel.tsx
+++ b/src/renderer/features/lineage/LineageSidePanel.tsx
@@ -108,8 +108,7 @@ const SIDE_GLASS: CSSProperties = {
 /** 分组 h4（核心 idea）accent 左缘条（R2-LG11 浅色板） */
 const H4_ACCENT: CSSProperties = {
   color: 'var(--text-dim)',
-  borderLeft: '3px solid var(--accent)',
-  paddingLeft: 6
+  borderLeft: '3px solid var(--accent)'
 }
 
 /** 锚存在判定（quote 不足 2 字符且无页码=无锚——locateAnchor 验证阈值同源） */
@@ -178,7 +177,7 @@ export function LineageSidePanel(props: {
         </p>
       </section>
       <section data-testid="lineage-side-idea">
-        <h4 className="m-0 font-medium" style={H4_ACCENT}>核心 idea</h4>
+        <h4 className="m-0 pl-1.5 font-medium" style={H4_ACCENT}>核心 idea</h4>
         <p className="m-0 whitespace-pre-wrap" style={{ color: 'var(--text)' }}>
           {node.coreIdea === '' ? '（未填写）' : node.coreIdea}
         </p>
diff --git a/src/renderer/features/lineage/LineageSideTags.tsx b/src/renderer/features/lineage/LineageSideTags.tsx
index 3b12c29931..64bdeb52f8 100644
--- a/src/renderer/features/lineage/LineageSideTags.tsx
+++ b/src/renderer/features/lineage/LineageSideTags.tsx
@@ -16,8 +16,6 @@ import type { LineageNode } from '@shared/models/lineage'
 const SIDE_TAG_CHIP: CSSProperties = {
   display: 'inline-flex',
   alignItems: 'center',
-  gap: 3,
-  padding: '0 4px',
   borderRadius: 3,
   fontSize: 11,
   color: 'var(--danger)',
@@ -45,12 +43,12 @@ export function LineageSideTags(props: {
 
   return (
     <section data-testid="lineage-side-tags">
-      <h4 className="m-0 font-medium" style={{ borderLeft: '3px solid var(--accent)', paddingLeft: 6, color: 'var(--text-dim)' }}>
+      <h4 className="m-0 pl-1.5 font-medium" style={{ borderLeft: '3px solid var(--accent)', color: 'var(--text-dim)' }}>
         标签
       </h4>
       <div className="flex flex-wrap items-center gap-1">
         {tags.map((t) => (
-          <span key={t} data-testid="lineage-tag-chip" style={SIDE_TAG_CHIP}>
+          <span key={t} data-testid="lineage-tag-chip" className="gap-0.75 px-1" style={SIDE_TAG_CHIP}>
             {t}
             <button
               type="button"
diff --git a/src/renderer/features/lineage/LineageToolbar.tsx b/src/renderer/features/lineage/LineageToolbar.tsx
index 244525d73f..efdf014e30 100644
--- a/src/renderer/features/lineage/LineageToolbar.tsx
+++ b/src/renderer/features/lineage/LineageToolbar.tsx
@@ -18,7 +18,7 @@ export function LineageToolbar(props: {
 }): JSX.Element {
   const { saveStatus, lastWriteError } = props
   return (
-    <div className="lineage-toolbar absolute left-2 top-2 z-10">
+    <div className="lineage-toolbar absolute left-2 top-2 z-(--z-float)">
       <button
         type="button"
         data-testid="lineage-add-node"
diff --git a/src/renderer/features/reader/AnnotationEditor.tsx b/src/renderer/features/reader/AnnotationEditor.tsx
index bbe2f45220..ce4170974d 100644
--- a/src/renderer/features/reader/AnnotationEditor.tsx
+++ b/src/renderer/features/reader/AnnotationEditor.tsx
@@ -31,7 +31,7 @@ export function AnnotationEditor(props: {
   return (
     <div
       data-testid="annotation-editor"
-      className="absolute z-20 flex w-72 flex-col gap-2 rounded border p-2 text-xs"
+      className="absolute z-(--z-anchor-pop) flex w-72 flex-col gap-2 rounded border p-2 text-xs"
       style={{
         // 左沿贴命中矩形并夹取，避免右侧溢出页根
         left: `${Math.min(rect.x * 100, 55)}%`,
diff --git a/src/renderer/features/reader/AnnotationMenu.tsx b/src/renderer/features/reader/AnnotationMenu.tsx
index 7d69b9ef7e..1e869523e7 100644
--- a/src/renderer/features/reader/AnnotationMenu.tsx
+++ b/src/renderer/features/reader/AnnotationMenu.tsx
@@ -55,7 +55,7 @@ export function AnnotationMenu(props: {
   return (
     <div
       data-testid="annotation-menu"
-      className="absolute z-20 flex gap-1 rounded border p-1 text-xs"
+      className="absolute z-(--z-anchor-pop) flex gap-1 rounded border p-1 text-xs"
       style={{
         // 左沿贴命中矩形并夹取，避免右侧溢出页根（对齐 AnnotationEditor 先例）
         left: `${Math.min(rect.x * 100, 55)}%`,
diff --git a/src/renderer/features/reader/SelectionToolbar.tsx b/src/renderer/features/reader/SelectionToolbar.tsx
index fbd5433e77..6777ce4bef 100644
--- a/src/renderer/features/reader/SelectionToolbar.tsx
+++ b/src/renderer/features/reader/SelectionToolbar.tsx
@@ -3,7 +3,7 @@
  * renderer 组件 250 行上限强制；DOM 形状/testid/交互零变化）
  *
  * - 定位=SelectionLayer evaluate 产出的挂载盒相对落点（props.x/y 透传）；
- *   z-10=层叠序最顶（完整推演见 SelectionLayer.tsx 头注 F-07）
+ *   z-(--z-float)=层叠序最顶（完整推演见 SelectionLayer.tsx 头注 F-07）
  * - 容器 mousedown 阻止默认（防抢焦点/坍缩选区）——按钮 click 才是动作语义；
  *   containerRef 由 SelectionLayer 持有（mouseup 命中工具条时不评估选区）
  * - 颜色按钮=per-tab 选择器状态（props.color/onColor——useReaderStore 订阅
@@ -34,7 +34,7 @@ export function SelectionToolbar(props: {
     <div
       ref={containerRef}
       data-testid="selection-toolbar"
-      className="absolute z-10 flex items-center gap-1 rounded border px-1.5 py-1 text-xs"
+      className="absolute z-(--z-float) flex items-center gap-1 rounded border px-1.5 py-1 text-xs"
       style={{
         left: x,
         top: y,
diff --git a/src/renderer/features/reader/page-layer-z.ts b/src/renderer/features/reader/page-layer-z.ts
index 1bff69b042..03c5959fdc 100644
--- a/src/renderer/features/reader/page-layer-z.ts
+++ b/src/renderer/features/reader/page-layer-z.ts
@@ -14,8 +14,8 @@
  *    灰块视觉在色块上）。
  *
  * 比较域：PageBox 页内容容器（h-fit）isolation:isolate——四层比较封闭在
- * 单页内，跨页互扰不可能。弹层（菜单 z-20/编辑器 z-20/工具条 z-10）在页盒
- * 兄弟位，天然高于本域诸层。
+ * 单页内，跨页互扰不可能。弹层（菜单 z-(--z-anchor-pop)/编辑器
+ * z-(--z-anchor-pop)/工具条 z-(--z-float)）在页盒兄弟位，天然高于本域诸层。
  */
 export const PAGE_LAYER_Z = {
   /** 官方 text-layer.css 的 z0（内联同值显式化——序单源防漂移） */
diff --git a/src/renderer/features/tags/TagLifecycleMenu.tsx b/src/renderer/features/tags/TagLifecycleMenu.tsx
index 305eb2932f..f7c30c0dff 100644
--- a/src/renderer/features/tags/TagLifecycleMenu.tsx
+++ b/src/renderer/features/tags/TagLifecycleMenu.tsx
@@ -34,12 +34,12 @@ export function TagLifecycleMenu(props: {
   return (
     <>
       {/* 透明遮罩：点击任意处关闭（菜单本体 stopPropagation） */}
-      <div className="fixed inset-0 z-40" onClick={props.onClose} />
+      <div className="fixed inset-0 z-(--z-pop-veil)" onClick={props.onClose} />
       <div
         data-testid="tag-menu"
         role="menu"
         aria-label={`标签菜单：${tag.name}`}
-        className="fixed z-50 w-40 rounded border py-1 shadow-lg"
+        className="fixed z-(--z-pop) w-40 rounded border py-1 shadow-lg"
         style={{
           left: anchor.x,
           top: anchor.y,
diff --git a/src/renderer/features/workspaces/workspace.css b/src/renderer/features/workspaces/workspace.css
index 9e445260a0..d16989e459 100644
--- a/src/renderer/features/workspaces/workspace.css
+++ b/src/renderer/features/workspaces/workspace.css
@@ -24,10 +24,10 @@
   cursor: pointer;
   box-shadow: var(--shadow-1);
   transition:
-    border-color 0.18s ease,
-    box-shadow 0.18s ease,
-    transform 0.08s ease,
-    filter 0.12s ease;
+    border-color var(--dur-base) ease,
+    box-shadow var(--dur-base) ease,
+    transform var(--dur-press) ease,
+    filter var(--dur-tint) ease;
 }
 .ws-trigger:hover {
   border-color: var(--accent);
@@ -93,9 +93,9 @@
   text-align: left;
   cursor: pointer;
   transition:
-    background 0.14s ease,
-    color 0.14s ease,
-    transform 0.08s ease;
+    background var(--dur-fast) ease,
+    color var(--dur-fast) ease,
+    transform var(--dur-press) ease;
 }
 .ws-item:hover {
   background: var(--accent-soft);
diff --git a/src/renderer/shared/theme.css b/src/renderer/shared/theme.css
index 73db089d2e..c40786e03b 100644
--- a/src/renderer/shared/theme.css
+++ b/src/renderer/shared/theme.css
@@ -31,6 +31,20 @@
   --radius-s: 8px;
   --radius-m: 12px;
   --radius-l: 16px;
+  /* ── 动效时长（P7D-01 批一：7 档收敛——值即现状,零视觉差）── */
+  --dur-press: 0.08s;  /* 按压瞬态（active transform 微缩/下沉——游戏钮瞬态） */
+  --dur-tint: 0.12s;   /* 滤镜/浸染快变（filter/titlebar 底色） */
+  --dur-fast: 0.14s;   /* 标准快（background/border/color 类） */
+  --dur-base: 0.18s;   /* 基准（hover 综合态含 box-shadow） */
+  --dur-lazy: 0.2s;    /* 缓变（dropzone 描边/影） */
+  --dur-rise: 0.22s;   /* 卡片升腾（文献卡 hover 三通道+角饰 opacity） */
+  --dur-flow: 0.3s;    /* 渐变流动（primary background-position 平移） */
+  /* ── 弹层 z 序四档（P7D-01 批一语义命名——值不变零视觉差；
+     页内 0~3 层单源=page-layer-z.ts,不在此）── */
+  --z-float: 10;       /* 画布/页面浮动控件（工具条/提示条/适应钮）+顶栏抬升 */
+  --z-anchor-pop: 20;  /* 页内锚定弹层（阅读器标注菜单/编辑器） */
+  --z-pop-veil: 40;    /* 弹层透明捕捉层（菜单 backdrop） */
+  --z-pop: 50;         /* 弹层主体（模态/toast/菜单面板） */
   --font-display: Georgia, 'Times New Roman', 'Songti SC', SimSun, serif;
   --ink: #1b2333;
   --ink-hi: #232d44;
@@ -89,7 +103,7 @@ body,
   height: 56px;
   padding: 0 12px;
   position: relative;
-  z-index: 10;
+  z-index: var(--z-float);
   background: var(--panel);
   border-bottom: 1px solid var(--border);
   -webkit-app-region: drag;
@@ -164,8 +178,8 @@ body,
   cursor: pointer;
   padding: 0;
   transition:
-    background 0.12s ease,
-    color 0.12s ease;
+    background var(--dur-tint) ease,
+    color var(--dur-tint) ease;
 }
 .titlebar-btn svg {
   width: 10px;
@@ -235,7 +249,7 @@ body,
   text-align: left;
   cursor: pointer;
   position: relative;
-  transition: all 0.18s ease;
+  transition: all var(--dur-base) ease;
 }
 .app-nav-item svg {
   width: 17px;
@@ -312,10 +326,10 @@ body,
   box-shadow: inset 0 0 0 1px rgba(201, 168, 106, 0.45), var(--shadow-1);
   clip-path: polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px);
   transition:
-    background-position 0.3s ease,
-    box-shadow 0.18s ease,
-    transform 0.08s ease,
-    filter 0.12s ease;
+    background-position var(--dur-flow) ease,
+    box-shadow var(--dur-base) ease,
+    transform var(--dur-press) ease,
+    filter var(--dur-tint) ease;
 }
 .syn-btn-primary:not(:disabled):hover {
   box-shadow: inset 0 0 0 1px rgba(227, 201, 143, 0.7), var(--shadow-2);
@@ -335,9 +349,9 @@ body,
   color: var(--text);
   border-color: var(--border);
   transition:
-    background 0.14s ease,
-    border-color 0.14s ease,
-    transform 0.08s ease;
+    background var(--dur-fast) ease,
+    border-color var(--dur-fast) ease,
+    transform var(--dur-press) ease;
 }
 .syn-btn-secondary:not(:disabled):active {
   background: var(--accent-soft);
@@ -350,9 +364,9 @@ body,
   color: var(--danger);
   border-color: var(--danger);
   transition:
-    background 0.14s ease,
-    border-color 0.14s ease,
-    transform 0.08s ease;
+    background var(--dur-fast) ease,
+    border-color var(--dur-fast) ease,
+    transform var(--dur-press) ease;
 }
 .syn-btn-danger:not(:disabled):active {
   background: rgba(179, 64, 58, 0.12);
@@ -364,9 +378,9 @@ body,
   color: var(--text);
   border: none;
   transition:
-    background 0.14s ease,
-    color 0.14s ease,
-    transform 0.08s ease;
+    background var(--dur-fast) ease,
+    color var(--dur-fast) ease,
+    transform var(--dur-press) ease;
 }
 .syn-btn-ghost:not(:disabled):hover {
   color: var(--gold);
@@ -549,7 +563,7 @@ body,
   position: absolute;
   right: 12px;
   bottom: 12px;
-  z-index: 10;
+  z-index: var(--z-float);
   padding: 4px 12px;
   border-radius: 999px;
   background: rgba(255, 255, 255, 0.88);
diff --git a/src/renderer/shared/ui/Dialog.tsx b/src/renderer/shared/ui/Dialog.tsx
index 848e10a280..bba2e990e7 100644
--- a/src/renderer/shared/ui/Dialog.tsx
+++ b/src/renderer/shared/ui/Dialog.tsx
@@ -40,7 +40,7 @@ export function Dialog(props: {
   }
   return (
     <div
-      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
+      className="fixed inset-0 z-(--z-pop) flex items-center justify-center bg-black/40 p-4"
       // 点遮罩关闭；卡片内部（含表单）阻止冒泡防误关
       onClick={onClose}
       onMouseDown={(e) => e.stopPropagation()}
diff --git a/src/renderer/shared/ui/Toast.tsx b/src/renderer/shared/ui/Toast.tsx
index f6fd9380fc..7a63a5096a 100644
--- a/src/renderer/shared/ui/Toast.tsx
+++ b/src/renderer/shared/ui/Toast.tsx
@@ -44,7 +44,7 @@ export function ToastHost(): JSX.Element {
   return (
     // 容器穿透（pointer-events-none）：右上 320px 常驻区域不得拦截底层 UI 的点击
     // （此前无卡片处也挡），卡片自身恢复可交互（× 关闭按钮）
-    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-80 flex-col gap-2">
+    <div className="pointer-events-none fixed right-4 top-4 z-(--z-pop) flex w-80 flex-col gap-2">
       {list.map((item) => (
         <ToastCard key={item.id} item={item} onClose={() => dismiss(item.id)} />
       ))}
diff --git a/tests/unit/renderer/theme.test.ts b/tests/unit/renderer/theme.test.ts
index b3108ca7c1..9c69f16077 100644
--- a/tests/unit/renderer/theme.test.ts
+++ b/tests/unit/renderer/theme.test.ts
@@ -71,7 +71,19 @@ const TOKENS: Array<[string, string]> = [
   ['--annotation-green', '#86efac'],
   ['--annotation-blue', '#93c5fd'],
   ['--annotation-red', '#fca5a5'],
-  ['--annotation-purple', '#d8b4fe']
+  ['--annotation-purple', '#d8b4fe'],
+  // ── P7D-01 批一：token 收敛值（registry 裁决——非 mockup :root 面）──
+  ['--dur-press', '0.08s'],
+  ['--dur-tint', '0.12s'],
+  ['--dur-fast', '0.14s'],
+  ['--dur-base', '0.18s'],
+  ['--dur-lazy', '0.2s'],
+  ['--dur-rise', '0.22s'],
+  ['--dur-flow', '0.3s'],
+  ['--z-float', '10'],
+  ['--z-anchor-pop', '20'],
+  ['--z-pop-veil', '40'],
+  ['--z-pop', '50']
 ]
 
 describe('R3-TH1 theme token 冒烟（mockup :root 防漂移锁）', () => {
@@ -169,3 +181,114 @@ describe('R2-SH2 决5——衬线消费清零+gold-night 别名退役（源码
     )
   })
 })
+
+describe('P7D-01 批一 token 收敛防线（三轴形态锁）', () => {
+  /**
+   * 批一迁移（registry 裁决「甲式机械迁移零视觉差」）：动效时长 32 处→7 个
+   * --dur-* token+弹层 z 序四值→4 个 --z-* 语义 token+lineage inline 数值
+   * 间距 12 处→tailwind class——值不变仅载体变（无头截图 diff 验收=p7d01-
+   * visual-probe）。形态锁防回退：duration 字面量消费后仅存定义处；弹层
+   * tsx 禁 z-(10|20|40|50) 裸值 class 与 theme.css z-index 裸值；lineage
+   * 六件禁数值间距属性（marginLeft:'auto'/var() 值放行——非数值间距）。
+   */
+  const wsCss = readFileSync(
+    fileURLToPath(new URL('../../../src/renderer/features/workspaces/workspace.css', import.meta.url)),
+    'utf8'
+  )
+  const readSrc = (rel: string): string =>
+    readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8')
+  const POPUP_TSX = [
+    '../../../src/renderer/shared/ui/Dialog.tsx',
+    '../../../src/renderer/shared/ui/Toast.tsx',
+    '../../../src/renderer/features/reader/AnnotationMenu.tsx',
+    '../../../src/renderer/features/reader/AnnotationEditor.tsx',
+    '../../../src/renderer/features/reader/SelectionToolbar.tsx',
+    '../../../src/renderer/features/tags/TagLifecycleMenu.tsx',
+    '../../../src/renderer/features/lineage/LineageToolbar.tsx',
+    '../../../src/renderer/features/lineage/LineageNodeMenu.tsx',
+    '../../../src/renderer/features/lineage/LineageBoard.tsx'
+  ]
+    .map(readSrc)
+    .join('\n')
+  const LINEAGE_SPACING_TSX = [
+    '../../../src/renderer/features/lineage/LineageNodeCard.tsx',
+    '../../../src/renderer/features/lineage/LineageNodeMeta.tsx',
+    '../../../src/renderer/features/lineage/LineageSideAiNotes.tsx',
+    '../../../src/renderer/features/lineage/LineageSideManualNote.tsx',
+    '../../../src/renderer/features/lineage/LineageSidePanel.tsx',
+    '../../../src/renderer/features/lineage/LineageSideTags.tsx'
+  ]
+    .map(readSrc)
+    .join('\n')
+  const countLiteral = (text: string, literal: string): number =>
+    (text.match(new RegExp(literal.replaceAll('.', '\\.'), 'g')) ?? []).length
+  const DURATION_COUNTS: Array<[string, string, number]> = [
+    ['0.08s', css, 1],
+    ['0.08s', wsCss, 0],
+    ['0.08s', libCss, 0],
+    ['0.12s', css, 1],
+    ['0.12s', wsCss, 0],
+    ['0.12s', libCss, 0],
+    ['0.14s', css, 1],
+    ['0.14s', wsCss, 0],
+    ['0.14s', libCss, 0],
+    ['0.18s', css, 1],
+    ['0.18s', wsCss, 0],
+    ['0.18s', libCss, 0],
+    ['0.2s', css, 1],
+    ['0.2s', wsCss, 0],
+    ['0.2s', libCss, 0],
+    ['0.22s', css, 1],
+    ['0.22s', wsCss, 0],
+    ['0.22s', libCss, 0],
+    ['0.3s', css, 1],
+    ['0.3s', wsCss, 0],
+    ['0.3s', libCss, 0]
+  ]
+
+  it.each(DURATION_COUNTS)('duration 字面量 %s 消费后仅存 token 定义处（出现 %s 次）', (literal, text, expected) => {
+    expect(countLiteral(text, literal)).toBe(expected)
+  })
+
+  it('theme.css 禁 z-index 裸值四档（弹层 z 序收敛到 --z-* token）', () => {
+    expect(css).not.toMatch(/z-index:\s*(10|20|40|50)\b/)
+  })
+
+  it('弹层九 tsx 禁 z-(10|20|40|50) 裸值 class（v4 变量简写形态锁）', () => {
+    expect(POPUP_TSX).not.toMatch(/\bz-(10|20|40|50)\b/)
+  })
+
+  it('lineage 六件禁数值间距属性（inline 间距清扫到 tailwind class）', () => {
+    expect(LINEAGE_SPACING_TSX).not.toMatch(
+      /(padding|margin|gap)(Top|Bottom|Left|Right)?:\s*('[\d-]|[\d])/
+    )
+  })
+
+  it('LineageNodeCard 间距 class 在场（pt-2/gap-1——防「全删不补」假绿）', () => {
+    const card = readSrc('../../../src/renderer/features/lineage/LineageNodeCard.tsx')
+    expect(card).toContain('className="pt-2"')
+    expect(card).toContain('className="gap-1"')
+  })
+
+  it('LineageNodeMeta 间距 class 在场（px-1/gap-0.75/px-0.75/pl-1）', () => {
+    const meta = readSrc('../../../src/renderer/features/lineage/LineageNodeMeta.tsx')
+    expect(meta).toContain('className="px-1"')
+    expect(meta).toContain('className="gap-0.75 px-0.75"')
+    expect(meta).toContain('className="pl-1"')
+  })
+
+  it('侧板/标签间距 class 在场（pl-1.5 载体——三件 h4+SideTags 面全覆盖）', () => {
+    const tags = readSrc('../../../src/renderer/features/lineage/LineageSideTags.tsx')
+    expect(tags).toContain('m-0 pl-1.5 font-medium')
+    expect(tags).toContain('className="gap-0.75 px-1"')
+    expect(readSrc('../../../src/renderer/features/lineage/LineageSidePanel.tsx')).toContain(
+      'pl-1.5'
+    )
+    expect(readSrc('../../../src/renderer/features/lineage/LineageSideAiNotes.tsx')).toContain(
+      'pl-1.5'
+    )
+    expect(readSrc('../../../src/renderer/features/lineage/LineageSideManualNote.tsx')).toContain(
+      'pl-1.5'
+    )
+  })
+})
```
