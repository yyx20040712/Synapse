# F-A8 门 0 前置票 ·门一审材料包（Kimi 链,零仓库接触）

你是门一对抗审查员。审 F-A8 门 0：重锚项几何族前置票（locateQuote 核提取+verifyQuoteItem+resolveAnnotationRectsItem 纯域版）。你拿不到仓库,只审本包材料。

## 0. 上游（已审在档,不重审）

F-A8=AnnotationLayer 重锚域同族化（F-A6-b2 门二 seam_ruling 排期项）。设计链三跳毕：Kimi K3 拟定（A+C1）→deepseek ENDORSE_WITH_CHANGES（CR1~CR4）→GLM5.3 终裁（终裁版设计书在票面）。门 0=阶段门 0~3 的前置票：纯函数域+oracle 单测,不接组件（门 2 接线）。

## 1. 审查任务（工单 A~E）

- **A 母本符合度**：diff vs 票面（简报附后）——修改文件清单 4 项（第 4 项备而未用=申报合规）;主控裁决①~⑥逐条（尤其裁决②「buildItemOffsets 拼接」被自裁①偏离为自持拼接——偏离正当性）;终裁版设计书 §3 构造的兑现度。
- **B 宪法红线**：verifyQuote 行为零变的证据力度（受锁基准 28 用例绿+什么形态的锁）;TS6142 阻断自裁的真实性（自持拼接=Rule of Three 第 2 次合规?第 3 处上抽触发条件头注在案?）;受锁流程;新测试文件 locks:generate。
- **C 代码与测试质量**：locateQuote 提取的核迁移保真（diff 显示仅删 fullTextOf 行+参数化——足够吗）;verifyQuoteItem 空串拼接与 buildItemOffsets 偏移表口径等价性的锁定强度（oracle 三态+空串穿插用例）;resolveAnnotationRectsItem 的 scale 反推数学（box.w/domWidth,rotate 90/270 交换——归一化缩放不变论证）;变异红证 3 个鉴别力;首红=桩 throw 的形态与 fixture 修正过程的诚实性（自裁⑥:首轮 3 红=fixture 期望错误）。
- **D 报告诚实性**：自裁①~⑦逐条 vs diff 对账;疑虑申报（tsconfig.node 配置债）。
- **E 接缝与后续单**：门 2 接线面的预留正确性（S1 对账省略的信任声明——store 写者唯一性契约）;S3b 缺席语义与接线层回退的边界;INV/设计书无需本票更新的边界。

## 2. 实现者声明摘要

- verify 155 文件/1341 用例/locks 278 exit=0（基线 154/1329/277+新测试件吻合）。
- 首红=桩 throw 12/12 红（行为红形态）;fixture 修正过程如实记录（首轮 3 红=期望错误非实现缺陷——修正后 40/40——含变异前后全量）;变异红证 3（打分权重翻转 1 红/拼接序破坏 7 红/三态之一破坏 1 红——cp 备份还原 diff 空）。
- oracle：jsdom DOM root 与同文本 items 双跑 verifyQuote vs verifyQuoteItem 三态逐位一致+空串项穿插等价锁定。

## 3. 主控已预裁项（可攻击,推翻需更强依据）

- locateQuote 提取=单源非复制（两消费点即抽）;verifyQuote 薄壳化行为零变。
- 自持拼接（map/filter/join）与 buildItemOffsets（剔空串 span 表）偏移口径严格一致——主控已核源码（buildItemOffsets 剔空串同判跳过,span 零偏移消耗,join 零贡献——三重零贡献等价）。
- scale 反推=纯函数域无 zoom 参的等价物（归一化 scale/base 自洽约除=缩放不变）;畸形守卫（非有限或 ≤0 →整体空映射）。
- TS6142 阻断实测（anchor-serialize 经受锁 .ts 测试可达 tsconfig.node 程序——type 链触 .tsx 即红）;绕行=结构最小面+自持拼接,头注申报完整。

## 4. 票面简报全文

# F-A8 门 0 前置票实现者简报——verifyQuoteItem+locateQuote 核提取+resolveAnnotationRectsItem 纯域版

> 主控=GLM5.3；实现者=子代理（GLM5.3flash 定档,环境无 model 参数=统一档欠账披露）。
> 票：F-A8（registry open）门 0——设计书 docs/design/2026-09-04_f-seam-reanchor-design.md
> （终裁版,主控终裁节 7 条=预裁依据）。

## ① 身份与禁令

你是实现者子代理,领 F-A8 门 0 前置票。**禁 git add/commit/push;禁翻 tickets/registry.ts;
禁碰 docs/invariants.md/ADR/交接书（控制面归主控）**。卡点=BLOCKED 停手报告。

## ② 必读序

1. `AGENTS.md`（宪法）。
2. `docs/design/2026-09-04_f-seam-reanchor-design.md`——设计书（含终裁节与 Kimi 原文
   §3 verifyQuoteItem 构造——你的任务书核心）。
3. `src/renderer/features/reader/anchor-serialize.ts`——verifyQuote/matchAt/打分循环
   (:50-100)——locateQuote 提取源;selectionToAnchor 切片语义。
4. `src/renderer/features/reader/pdf-item-geometry.ts`——buildItemOffsets(:164)/
   rectsForOffsetRange(:278)/bandsFromItems(:369)/reconcileItemsWithDom(:182) 导出面。
5. `src/renderer/features/reader/page-items.store.ts`——PageItemEntry 类型（text/geometry/box）。
6. `src/renderer/features/reader/annotation-resolve.ts`——重锚域宿主（resolveAnnotationRects
   现状=DOM 链,本票零改它;新函数驻本域或同域新件——见裁决③）。
7. `tests/unit/renderer/annotation-anchor.test.ts`——verifyQuote 既有测试（受锁,行为零变
   的对照基准）。

## ③ 主控裁决（实现者不再自裁）

1. **locateQuote 核提取（单源非复制）**：anchor-serialize.ts 内把 verifyQuote 的
   「原位校验+indexOf 全出现扫描+prefix(2)+suffix(1) 打分+同级距原偏移最近」核提为
   模块内共享函数 `locateQuote(text, selector): number | null`（私有即可,若新件需要
   则导出——两消费点即抽,禁复制粘贴）。**verifyQuote 行为零变**（受锁
   annotation-anchor.test 消费面不动——它 import verifyQuote;matchAt 私有保持）。
2. **verifyQuoteItem**：驻 anchor-serialize.ts（与 verifyQuote 同件=核单源）。
   签名 `verifyQuoteItem(items: PdfTextItem[], selector: { prefix; quote; suffix; start }): number | null`
   ——buildItemOffsets(items).spans 拼页全文→locateQuote。偏移口径=页内文本序
   （两族共有——DOM 拼接 fullTextOf 与 items 拼接的系统性差由 S1 reconcile 守卫拦截,
   b2 r3a 同构防线;本函数不负责口径转换）。
3. **resolveAnnotationRectsItem 纯域版**：驻 annotation-resolve.ts（重锚域宿主）。
   签名 `resolveAnnotationRectsItem(entry: PageItemEntry | null, annotations: Annotation[], page: number): ResolvedRects`
   ——entry null→{}（S0 缺席格）;reconcileItemsWithDom(items, domText) false→{}（S4 由
   接线层走 DOM 链,纯函数不编排回退）;通过→逐条 verifyQuoteItem→校正 start→
   rectsForOffsetRange+bandsFromItems 产 {rects,bands}（归一化——参照 selection 链
   itemSelectionGeometry 的归一化数学,**直接复用其内部形态或导出面,禁第二份归一化实现**）。
   reconcile 的 domText 参数：本票纯函数域无 DOM——**domText 由 entry.text（PdfTextContent）
   的 items 拼接替代不可行（自我对账恒真）**——裁决：reconcile 接线留门 2（接线时有
   textLayer DOM）;门 0 版对账=省略 reconcile（entry 在手即视为 S1 过——纯函数域无 DOM
   可对账）,**头注明示「S1 DOM 对账=门 2 接线面,本域 entry 信任=store 写者唯一性
   （PagesOverlay handlePageRender 回报——写者契约在 store 头注）」**。
   zoom/viewport：PageItemEntry.geometry（rotate/view）+box——viewport 现构参照
   selection 快路径（getState() 现读同款数学,clampScale 单源）。
4. **AiAnnotationLayer 域零涉及**（门 2 接线票面）。
5. **测试三态 fixture**（oracle+行为）：
   - oracle：jsdom DOM root（挂 spans 文本）与 items（同文本构造 PdfTextItem 数组）
     双跑 verifyQuote(root,sel) vs verifyQuoteItem(items,sel)——三态：原位命中/前部
     增删漂移重定位（prefix 锚校正）/失败 null——逐位一致断言。
   - resolveAnnotationRectsItem：entry null→{};正常→rects/bands 产出（块数与
     itemSelectionGeometry 同族一致——可对照断言）;verifyQuoteItem 失败条目→该条
     缺席（S3b 语义=接线层回退存量,纯函数只缺席）。
6. **新测试文件**：tests/unit/renderer/ 下新件（如 anchor-item-verify.test.ts——
   名自定,受锁=新路径诞生即 locks:generate+apply）。

## ④ 纪律

TDD 先红（新函数缺席=TS 编译红或断言红——**首红形态若为编译红须申报定性**;行为红
优先：先写测试+函数桩（throw）跑红再实现）;变异红证 ≥2（locateQuote 打分权重翻转/
verifyQuoteItem 文本源拼接序破坏→oracle 红）;受锁流程 unlock→改→apply（改
anchor-serialize.ts 本身**非受锁**——确认 locks manifest 后处理;新测试文件 locks:generate）;
npm run test 真退出码;证据 .raw.txt;多断言禁行尾注释;≤500 行;UTF-8。
verify 基线 **154 文件/1329 用例/locks 277**（门 0 后预期 +1~2 文件+若干用例,数字实测）。
e2e 本票零涉及（纯函数域,门 2 才有装配面）。

## ⑤ 报告契约

全文落 `scripts/audits/f-a8-gate0-impl.report.md`：实现摘要/文件清单/首红/变异红证/
verify 退出码/locks 实录/自裁申报（含删减面）/疑虑。回复五行内。

## 修改文件清单（超出即 BLOCKED）

1. `src/renderer/features/reader/anchor-serialize.ts`——locateQuote 提取+verifyQuoteItem。
2. `src/renderer/features/reader/annotation-resolve.ts`——resolveAnnotationRectsItem 纯域版。
3. `tests/unit/renderer/<新件>.test.ts`（新受锁路径——locks:generate+apply）。
4. 若 itemSelectionGeometry 归一化需导出复用：`src/renderer/features/reader/pdf-item-geometry.ts`
   仅加 export（逻辑零改）。


## 5. 实现者报告自裁节+疑虑节全文

## 8. 自裁申报（超票面/近票面决定全列）

1. **verifyQuoteItem 拼接实现偏离票面字面**：票面「buildItemOffsets(items)
   .spans 拼页全文」→ 实现为模块内自持「map str→filter 空串→join」。
   产出与 spans 拼接**逐字节等价**（空串项 join 零贡献；oracle「空串项
   穿插」用例锁定）。理由（阻断性）：anchor-serialize 经受锁
   annotation-anchor.test.ts（.ts）可达 tsconfig.node 程序（include
   tests 目录 .ts 文件、无 jsx 选项），import pdf-item-geometry（其 type
   import PdfPageCanvas.tsx）即触发 TS6142 → verify 红。Rule of Three
   第 2 次保持重复（与 pdf-item-geometry.itemsTextOf 同式）合规；头注
   架构层在案（第 3 处出现时上抽共享件并届时一并解配置缺陷）。
2. **verifyQuoteItem 参数类型=结构最小面** `ReadonlyArray<{ str: string }>`
   而非 PdfTextItem[]（PdfTextItem[] 结构兼容传入，annotation-resolve 传
   entry.text.items 零断言）：同 TS6142 理由——不 import PdfPageCanvas
   类型链。依赖倒置式最小消费面声明，非类型复写（头注申报）。
3. **测试文件扩展名 .tsx**（票面示例名 anchor-item-verify.test.ts）：
   .ts 进 node 程序、自身 import PdfPageCanvas/pdf-item-geometry/
   page-items.store（type 链触 .tsx）即 TS6142。域内先例=
   pdf-item-geometry.test.tsx（同因选 .tsx）。内容零 JSX。
4. **resolveAnnotationRectsItem 返回类型**=域内既有
   `Record<string, ResolvedAnnotation>`（票面写 ResolvedRects——域内无此
   名，按现 resolveAnnotationRects 同返回形态对齐，语义同构）。签名按
   票面位置参数 `(entry, annotations, page)`。
5. **viewport scale 自 entry.box 反推**（box.w÷view 跨度；rotate 90/270
   宽高互换）而非「getState() 现读 zoom」：纯函数域无 paperId/zoom 可读
   （票面签名无此参）。数学等价性：box=PdfPageCanvas 以 clampScale(zoom)
   渲染的 canvas CSS 盒回报（PagesOverlay 写者契约）→ 反推值=夹取后真值；
   scale/base 自洽约除 → 归一化缩放不变且**消**取整差（比快路径
   [精确 scale+取整 base] 离散差更小）——selection 快路径同款数学的纯域
   等价物，同族精度带内。页级守卫：scale 非有限/≤0→整体 {}（畸形 box
   防线，票面未明说，S0 同判据面）。
6. **fixture 手算误修正过程**（如实记录）：首轮 3 红=测试期望值错误非实现
   缺陷——权重用例偏移误写 11（正确 8）；行为用例 quote 未真跨 item 边界
   （'段正文' 单 item 内 1 块 vs 直调 2 块）。修正 fixture（quote 改
   '段中段正文' 4..9 跨 item1/item2）后 40/40 绿。首红（桩 throw）在前、
   此 3 红在其后——非首红形态篡改。
7. **删减面**：pdf-item-geometry.ts 零改（清单 4 未动用）；无其他删减。

## 9. 疑虑（供主控/门审裁量）

1. **tsconfig.node.json 无 jsx 但 include tests 目录 .ts 文件**（测试经相对
   import 跟随解析 renderer 源码）=潜在配置债：未来任何 .ts 测试触 .tsx
   链都会 TS6142。本票踩破后以「结构最小面+自持拼接+.tsx 测试」绕行，
   未修配置（受锁+超修改清单）。建议后续单独立票（[locked-change] 一行
   `"jsx": "react-jsx"` 或收紧 include）。
2. oracle 未单列「同分双出现取距原偏移最近」分支用例（构造夹逼 fixture
   较绕；该分支为 verifyQuote 既有行为+受锁消费面不动，oracle 双跑一致
   传递覆盖）。可后续补强。
3. 类型环声明：pdf-item-geometry→annotation-resolve（RowBand，既有
   type-only）+annotation-resolve→anchor-serialize（值）+本轮 anchor-
   serialize 不再依赖 pdf-item-geometry（自裁 1 的副作用=环彻底消失）。
4. 提交纪律归主控：本轮含 locks manifest 变更，提交须 [locked-change]
   尾注；staging 显式列文件（scripts/audits 下历场未跟踪残留多，勿扫入）。

## 10. 成本账本

实现者子代理：GLM5.3flash 档（环境无 model 参数=统一档欠账披露）；会话约
09:15–09:45（30 分钟），含 TS6142 排查一轮+fixture 手算误修正一轮+最终态
变异红证重做一轮。证据文件 14 份（*.raw.txt）随本报告存档。

## 6. diff 全文（2 src+manifest,145+/8-）

```diff
diff --git a/locks/manifest.json b/locks/manifest.json
index 9e29c3ccbf..a3259f5019 100644
--- a/locks/manifest.json
+++ b/locks/manifest.json
@@ -1,5 +1,5 @@
 {
-    "generatedAt":  "2026-09-04T00:52:25.1570619Z",
+    "generatedAt":  "2026-09-04T01:27:34.8029371Z",
     "files":  [
                   {
                       "path":  ".github/workflows/ci.yml",
@@ -633,6 +633,10 @@
                       "path":  "tests/unit/renderer/ai-note-style.test.ts",
                       "sha256":  "fe0f12d47c3ac80c7b082997359faa4e5ceb836aa5473fa8950f74f5afc6a88c"
                   },
+                  {
+                      "path":  "tests/unit/renderer/anchor-item-verify.test.tsx",
+                      "sha256":  "259947635a1e992c92b675e6f9e69f47a827a9442babe8618e781f4865a00cd5"
+                  },
                   {
                       "path":  "tests/unit/renderer/anchor-locate.test.ts",
                       "sha256":  "ca53352aae1b96d0120a20f7fea46da60225401631da8992b20770f92611efcc"
diff --git a/src/renderer/features/reader/anchor-serialize.ts b/src/renderer/features/reader/anchor-serialize.ts
index 34d3396e2b..9279806324 100644
--- a/src/renderer/features/reader/anchor-serialize.ts
+++ b/src/renderer/features/reader/anchor-serialize.ts
@@ -9,16 +9,25 @@
  *   容器统一成立）；prefix/suffix 按 CONTEXT_CHARS=32 截取（WADM 惯例）
  * - verifyQuote：前缀/引文/后缀校验 start 偏移是否仍有效；失效时 textQuote
  *   自愈重定位——原位校验优先，重定位打分 score=prefix 2+suffix 1，同级取距
- *   原偏移最近者
- * - 偏移约定：verifyQuote 的 start 与返回值均指 quote 首字符的页内偏移（页内
- *   全文拼接口径在 annotation-anchor）；rects 的 page 恒为 0——实际页码由
- *   调用方在持久化时改写
+ *   原偏移最近者。定位核 locateQuote=纯文本函数（DOM/items 两域共享单源，
+ *   F-A8 门0 提取——verifyQuote 行为零变）
+ * - verifyQuoteItem [F-A8 门0]：verifyQuote 的 items 域等价物——页项文本
+ *   （剔空串项逐项 str 拼接，与 buildItemOffsets 偏移表同口径——空串项零宽
+ *   不入拼接，产出逐字节相同）上同核校验/自愈；偏移口径=页内文本序（两族
+ *   共有——DOM/items 拼接系统性差由 S1 reconcile 守卫拦截，本函数不做口径
+ *   转换）
+ * - 偏移约定：verifyQuote/verifyQuoteItem 的 start 与返回值均指 quote 首字符
+ *   的页内偏移（DOM 侧页内全文拼接口径在 annotation-anchor，items 侧=剔空串
+ *   逐项拼接）；rects 的 page 恒为 0——实际页码由调用方在持久化时改写
  *
  * ── 接口层 ──
  * - export interface SelectionAnchor
  * - export function selectionToAnchor(root, selection): SelectionAnchor | null
  * - export function verifyQuote(root, selector): number | null
- * - matchAt/probeTextLength/CONTEXT_CHARS 保持模块私有
+ * - export function verifyQuoteItem(items, selector): number | null [F-A8 门0]
+ *   （items 参数=结构最小面 {str:string}——消费方传 PdfTextItem[] 结构兼容；
+ *   不 import PdfPageCanvas 类型链的缘由见架构层）
+ * - matchAt/locateQuote/probeTextLength/CONTEXT_CHARS 保持模块私有
  * - 几何与遍历原语消费自 annotation-anchor 公共面（collectSpans/fullTextOf/
  *   offsetToPoint/rectsBetweenPoints/pixelBoxOf）——类型单一真相源，本模块
  *   零类型复写
@@ -27,6 +36,12 @@
  * - 依赖单向 anchor-serialize→annotation-anchor→annotation-merge（零环）；
  *   本模块=锚定格式与校验域，未来锚定格式扩展的增长点；锚定计算域（DOM 文本
  *   遍历/偏移互转/几何管线）仍在 annotation-anchor
+ * - **不 import pdf-item-geometry/PdfPageCanvas**（含 type）：本模块经受锁
+ *   annotation-anchor.test.ts 可达 tsconfig.node 程序（tests 目录 .ts 文件
+ *   include，无 jsx 选项），任一触 PdfPageCanvas.tsx 的边都触发 TS6142；故
+ *   items 拼接就地自持（剔空串 filter+join，与 pdf-item-geometry.itemsTextOf
+ *   同式——Rule of Three 第 2 次保持重复，第 3 处出现时上抽共享件并届时
+ *   一并解 tsconfig.node jsx 缺陷）
  * - 文本枚举唯一发生在 annotation-anchor；本模块仅借 Range 做长度探测
  *   （probeTextLength 的 Range.toString 非遍历）
  *
@@ -50,12 +65,44 @@ import {
 export function verifyQuote(
   root: HTMLElement,
   selector: { prefix: string; quote: string; suffix: string; start: number }
+): number | null {
+  return locateQuote(fullTextOf(root), selector)
+}
+
+/**
+ * [F-A8 门0] items 域引文对账：页项文本（剔空串项逐项 str 拼接——与
+ * buildItemOffsets 偏移表同口径，空串项零宽不入拼接产出逐字节相同；与 DOM
+ * fullTextOf 同域的页内文本序）上执行与 verifyQuote 同核的定位校验。偏移口径
+ * =页内文本序（两族共有——DOM 拼接与 items 拼接的系统性差由 S1 reconcile
+ * 守卫拦截[b2 r3a 同构防线]，本函数不负责口径转换）。items 参数=结构最小面
+ * {str:string}（PdfTextItem[] 结构兼容；不 import PdfPageCanvas 类型链的缘由
+ * 见头注架构层）
+ */
+export function verifyQuoteItem(
+  items: ReadonlyArray<{ str: string }>,
+  selector: { prefix: string; quote: string; suffix: string; start: number }
+): number | null {
+  const text = items
+    .map((it) => it.str)
+    .filter((s) => s.length > 0)
+    .join('')
+  return locateQuote(text, selector)
+}
+
+/**
+ * 引文定位核（纯文本——DOM/items 两域共享单源，F-A8 门0 自 verifyQuote 提取，
+ * 行为零变）：原位校验优先（前缀/引文/后缀在 start 处全部吻合直接返回原偏移）；
+ * 失效时 textQuote 自愈重定位——引文全出现扫描，打分 score=prefix 2+suffix 1，
+ * 同级取距原偏移最近者
+ */
+function locateQuote(
+  text: string,
+  selector: { prefix: string; quote: string; suffix: string; start: number }
 ): number | null {
   const { prefix, quote, suffix, start } = selector
   if (quote.length === 0) {
     return null
   }
-  const text = fullTextOf(root)
   // 原位校验：前缀/引文/后缀在 start 处全部吻合则直接返回原偏移
   if (matchAt(text, start, prefix, quote, suffix)) {
     return start
diff --git a/src/renderer/features/reader/annotation-resolve.ts b/src/renderer/features/reader/annotation-resolve.ts
index 912ad03989..1314229e2b 100644
--- a/src/renderer/features/reader/annotation-resolve.ts
+++ b/src/renderer/features/reader/annotation-resolve.ts
@@ -6,6 +6,11 @@
  * - resolveAnnotationRects：verifyQuote 校正偏移（自愈排版漂移）→
  *   findRangeAtOffset 重算 rects——逐条等价自 AnnotationLayer 原 resolve
  *   闭包迁出（行为零变：失败回退存量，仅显示层不回写库）；
+ * - resolveAnnotationRectsItem [F-A8 门0]：重锚纯域版（项几何族）——
+ *   entry（page-items.store 页项）+annotations → verifyQuoteItem 逐条对账
+ *   校偏 → itemSelectionGeometry 产 {rects,bands}；entry null→{}、失败条目
+ *   缺席（S3b 语义=接线层回退存量，纯函数只缺席）。门 2 接线前零消费方
+ *   （门 0=纯函数域前置票）；
  * - [F-A4 b②] 行盒自适应字形带：重锚 range.textNodes 的 span 实测盒
  *   （gBCR）+canvas 字体度量（measureText 的 actualBoundingBox Ascent/
  *   Descent=墨带实界+fontBoundingBox=回退字体布局带）→ 推算字形带
@@ -41,8 +46,10 @@
  *   AnnotationLayer 挂 B 接线）+ F-A5 段（bandsNearRects 三消费点）。
  */
 import type { Annotation, AnnotationRect } from '@shared/models/annotation'
-import { verifyQuote } from './anchor-serialize'
+import { verifyQuote, verifyQuoteItem } from './anchor-serialize'
 import { findRangeAtOffset, pixelBoxOf, type PixelBox } from './annotation-anchor'
+import { itemSelectionGeometry, type ItemViewport } from './pdf-item-geometry'
+import type { PageItemEntry } from './page-items.store'
 
 /** 行簇字形带（归一化域；center=带中心——渲染块匹配键；x0/x1=行簇 span
  *  实际端点——F-A5 a 面自绘块水平界夹取源，缺省=该带无端点量测） */
@@ -293,6 +300,85 @@ export function resolveAnnotationRects(args: {
   return next
 }
 
+/**
+ * [F-A8 门0] 重锚纯域版（项几何族——S0–S3a 状态机的纯函数核，设计书
+ * docs/design/2026-09-04_f-seam-reanchor-design.md §1.1/§3）：
+ * - S0：entry null → {}（页项缺席——接线层走 DOM 回退链，纯函数不编排回退）；
+ * - S1 DOM 对账=门 2 接线面（接线时有 textLayer DOM 可对账），本域 entry
+ *   信任=store 写者唯一性（PagesOverlay handlePageRender 回报——写者契约在
+ *   page-items.store 头注）；
+ * - S2：逐条 verifyQuoteItem 校正偏移（textQuote 自愈——与 DOM 版同核
+ *   locateQuote 单源）→ itemSelectionGeometry 产 {rects,bands}（归一化数学
+ *   直复用 selection 链管线导出面，禁第二份归一化实现）；
+ * - S3b：对账失败/空串引文/他页条目 → 该条缺席（接线层回退存量，纯函数只
+ *   缺席）；计算异常（畸形 rotate/几何非有限）逐条 try 缺席（selection 快
+ *   路径 itemChainFor 同款 try 先例）。
+ * viewport 现构=selection 快路径同款数学（rotate/view 来自 entry.geometry，
+ * 调用即构不缓存——缩放不变）；scale 自 entry.box 反推（box=PdfPageCanvas
+ * clampScale(zoom) 渲染的 canvas CSS 盒回报——PagesOverlay 写者契约，反推值
+ * =夹取后真值，scale/base 自洽约除 → 归一化缩放不变）。base 盒本地帧
+ * （itemSelectionGeometry 头注：归一化只消费盒宽高，原点不参与）。
+ */
+export function resolveAnnotationRectsItem(
+  entry: PageItemEntry | null,
+  annotations: Annotation[],
+  page: number
+): Record<string, ResolvedAnnotation> {
+  if (entry === null) {
+    return {}
+  }
+  const viewport = itemViewportOf(entry)
+  if (!Number.isFinite(viewport.scale) || viewport.scale <= 0) {
+    return {}
+  }
+  const base: PixelBox = { x: 0, y: 0, w: entry.box.w, h: entry.box.h }
+  const next: Record<string, ResolvedAnnotation> = {}
+  for (const a of annotations) {
+    if (a.page !== page || a.quoteText.length === 0) {
+      continue
+    }
+    const at = verifyQuoteItem(entry.text.items, {
+      prefix: a.prefixText,
+      quote: a.quoteText,
+      suffix: a.suffixText,
+      start: a.startOffset
+    })
+    if (at === null) {
+      continue
+    }
+    try {
+      const geo = itemSelectionGeometry({
+        items: entry.text.items,
+        styles: entry.text.styles,
+        viewport,
+        start: at,
+        end: at + a.quoteText.length,
+        base
+      })
+      if (geo !== null) {
+        next[a.id] = { rects: geo.rects, bands: geo.bands }
+      }
+    } catch {
+      // 畸形 rotate 等计算异常——该条缺席（S3b 同判据，快路径 try 先例）
+    }
+  }
+  return next
+}
+
+/** 页项条目 → viewport（rotate=90/270 时 canvas 宽对应 view 高——宽高互换；
+ *  box 反推 scale=Math.round 后 CSS 盒/跨度，与 clampScale(zoom) 真值差 <1px
+ *  取整粒度且被归一化约除——同族精度带内） */
+function itemViewportOf(entry: PageItemEntry): ItemViewport {
+  const [x0, y0, x1, y1] = entry.geometry.view
+  const rot = ((entry.geometry.rotate % 360) + 360) % 360
+  const domWidth = rot === 90 || rot === 270 ? y1 - y0 : x1 - x0
+  return {
+    scale: domWidth > 0 ? entry.box.w / domWidth : Number.NaN,
+    rotate: entry.geometry.rotate,
+    view: entry.geometry.view
+  }
+}
+
 /** textLayer 行高（归一化域——挂 B mergeRects lineH；span 字号中位数/盒高）。
  *  量测退化（盒高兜 1 的 jsdom 桩面）→undefined 旧行为。 */
 export function normalizedLineHeight(textLayer: HTMLElement): number | undefined {

```
