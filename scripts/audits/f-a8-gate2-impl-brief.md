# F-A8 门 2 主链切换票实现者简报——S0~S6 状态机上线+DOM 链降回退+INV 登记

> 主控=GLM5.3；实现者=子代理（GLM5.3flash 定档,环境统一档欠账披露）。
> 票：F-A8 门 2（主链切换——设计书 §2 改动面+§1 态空间+终裁节 CR1/CR2+
> 增补节放行基准）。上游=门 0（纯函数域）/门 1+1b（取证+修补+分层口径）。

## ① 身份与禁令

禁 git add/commit/push;禁翻 registry。**控制面开放面=docs/invariants.md 指定
四条**（INV-58 扩域/INV-47 适用面收缩注记/INV-59 新增/INV-60 新增——条款草案
在设计书 §4,实现者按实现终态落笔）;其余 docs 面（ADR/prompts/设计书）零改。
卡点=BLOCKED 停手。

## ② 必读序

1. `AGENTS.md`。
2. `docs/design/2026-09-04_f-seam-reanchor-design.md` **全文**（终裁节+增补节
   尤其——S0~S6 态空间/CR1 订阅重入/L1~L4 口径/门 2 放行基准）。
3. `src/renderer/features/reader/annotation-resolve.ts`——resolveAnnotationRects
   （现 DOM 链——**改名 resolveAnnotationRectsDom 函数体零改**）+
   resolveAnnotationRectsItem（门 0 纯域版——本票接线主链）。
4. `src/renderer/features/reader/AnnotationLayer.tsx`——resolve 闭包/MutationObserver
   接线（本票改三层编排:项几何→DOM→存量）。
5. `src/renderer/features/reader/AiAnnotationLayer.tsx`——verifyQuote 重锚同链
   （本票同构接线——read 它的 resolve 形态后对齐改）。
6. `src/renderer/features/reader/page-items.store.ts`——usePageItemsStore 双形态
   （react 订阅=CR1 重入通道;getState() 直读）。
7. `src/renderer/features/reader/pdf-item-geometry.ts`——reconcileItemsWithDom
   （S1 DOM 对账——接线时 textLayer 全文 vs items 拼接）+selectionHealth（S6 判定）。
8. `tests/unit/renderer/annotation-resolve.test.ts` 或既有标注域测试+`tests/e2e/
   reader-text.spec.ts` 标注面（「划选高亮后重开仍在原位」INV-51 稳态口径）——
   受锁回归面。

## ③ 主控裁决（实现者不再自裁）

1. **三层编排（AnnotationLayer/AiAnnotationLayer 共形）**：resolve 触发时——
   ①读 usePageItemsStore.getState().pages[page]（S0）;②entry 在手→
   reconcileItemsWithDom(entry.text.items, fullTextOf(textLayer))（S1——
   textLayer 已在场时对账;失败→S4 DOM 链）;③通过→resolveAnnotationRectsItem
   （S2/S3a——产物 resolved）;④条目缺席（S3b）→**该条回退**：存量 rects+
   bandsNearRects（现状语义）;⑤页级回退 S4=resolveAnnotationRectsDom（改名件,
   函数体零改）;⑥**S6**：S4 产物经 selectionHealth 判定（boxes=项几何
   rectsForOffsetRange 全项盒,blocks=DOM 链产物 px 域——门 1 取证三形态之
   healthDom 口径）unhealthy→**抑制 DOM 产物显示**（直显存量 rects,bands 走
   缺省路径——F-11 分数路径）+warn 单源。
2. **CR1 store 订阅重入**：AnnotationLayer（与 Ai 同构面）加 usePageItemsStore
   react 订阅（selector=pages[page] 条目变化）→触发 resolve 重调度——store
   晚于 textLayer 就绪竞态由订阅兜（MutationObserver 只覆盖 DOM 面）;**竞态
   fixture 单测**（先挂组件 store 空→S4 回退→注入 entry→订阅触发重 resolve=
   项几何产物）必写。
3. **CR3 页上下文**：resolve 读数以当前 page prop 为键（pages[page]）——文档
   切换=store clear 重填（写者契约）,DOM 必变 observer 必触发,无旧文档命中。
4. **resolved 增域标记**（运行时,不入库）：ResolvedAnnotation 增可选
   source: 'item' | 'dom'——INV-60 登记的显示覆盖语义锚（调试面+单测断言面;
   渲染行为零差——色块样式不区分源）。
5. **fallbackBands 语义不变**：重锚失败条目仍走 bandsNearRects（存量语义
   逐位保持——S3b）。
6. **INV 登记四条**（invariants.md,条款草案=设计书 §4,按实现终态校正落笔）：
   INV-58 扩域（适用域+Annotation/AiAnnotation 重锚链;DOM 量测仅显式回退层
   且产物标域）;INV-47 适用面收缩注记（mergeLineRects 退出重锚主链——适用面
   =DOM 回退层+存量读时归并;受锁⑪断言数值面不变[回退层函数体零改保证]）;
   INV-59 新增（重锚同族配对令——主链消 R1,回退格 S3b/S5 显式持有跨族配对
   =已知边界）;INV-60 新增（重锚显示覆盖登记——仅显示不回写+域标记运行时
   不入库）。锚定方式列按册式（单测/e2e/取证引证）。
7. **测试面**：单测新 describe（S0 空映射/S1 对账失败回退/S2 项几何产物/
   S3b 条目回退/S4 页级回退/S6 抑制+竞态 fixture+域标记断言——AnnotationLayer
   挂载级,jsdom）;受锁既有标注域测试回归绿预期（DOM 链行为逐位保持[改名+调用
   点改]——若既有测试 import resolveAnnotationRects 断裂→改名同步 import[受锁
   流程]);e2e=既有「划选高亮后重开仍在原位」（INV-51 稳态采样口径）跑绿+
   主动跑全量 reader-text;变异红证 ≥3（删 store 订阅→竞态 fixture 红/删 S6
   抑制→S6 格红/主链换 DOM[跳过项几何]→域标记断言红）。
8. **真机面**：f-a8-gate1-diag.mjs 复跑一次（门 1 探针——链 B 接线后与真组件
   行为一致性抽查;数据落 f-a8-gate2-out/ 不入 git;数字与门 1b 档对比一致性
   申报——同代码应同数字量级[轮次噪声内]）。

## ④ 纪律

TDD 先红（新 describe 先红:门 2 改造前 S0/S6/竞态等格不可能过）;变异红证;
npm run test/verify 真退出码;受锁流程 unlock→改→apply;证据 .raw.txt;多断言
禁行尾注释;≤500 行（AnnotationLayer 接近红线时编排逻辑拆 annotation-resolve
域新件——resolveAnnotationRectsLayered 编排器,组件只消费）;UTF-8。基线=
**155 文件/1347 用例/locks 281/e2e 42**（新用例数实测）;npm run build 后
全量 e2e（F-ARCH4-M1 偶红第 1 现记录指纹继续,第 2 现 BLOCKED）。

## ⑤ 报告契约

全文落 `scripts/audits/f-a8-gate2-impl.report.md`：实现摘要/文件清单/首红/
变异/verify+e2e 退出码/locks/INV 登记四条落笔摘要/复跑一致性/自裁申报/疑虑。
回复五行内。

## 修改文件清单（超出即 BLOCKED 申报）

1. `src/renderer/features/reader/annotation-resolve.ts`——改名 …Dom+新编排器
   resolveAnnotationRectsLayered（或同域新件）+resolved source 标记。
2. `src/renderer/features/reader/AnnotationLayer.tsx`+`AiAnnotationLayer.tsx`
   ——三层编排接线+CR1 store 订阅。
3. `src/renderer/features/reader/page-items.store.ts`——预计零改（订阅用现成
   形态）;若需扩订阅 selector 面则最小改+申报。
4. `docs/invariants.md`——四条登记（③-6 指定面）。
5. `tests/unit/renderer/<annotation-layer 或新件>.test.tsx`（受锁——新 describe
   +既有 import 改名同步）。
6. `tests/e2e/reader-text.spec.ts`（受锁）——预计零改（既有小票回归）;若断言
   需域标记扩展则最小改+申报。
