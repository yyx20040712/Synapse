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
