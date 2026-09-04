# F-A6 设计文档对抗审查报告（三屋设计审核档）

日期：2026-09-03 · 被审对象：docs/design/2026-09-03_f-a6-selection-root-fix.md（起草稿 v1）· 模式：独立对抗审查（零利益关联，只读）· 方法：承重断言逐条对源码核验；计数类数字全部 grep -c/wc -l 实测。

## 轴1 源码断言核验 —— 证实（全部承重断言成立；2 处成本表述小偏差）

- **T1 旋转链——证实，链条完整**：TextLayer.tsx:50-61 duckViewport 确为 rotation:0，rawDims=pageWidth/scale（旋转后 CSS 尺寸÷scale 反推）；限制自认 :46-48（「页旋转（/Rotate 90/180/270）v1 不支持——props 契约无 rotation 通道」）。PdfPageCanvas.tsx:111 确为 pdfPage.getViewport({scale})；pdfjs 语义证实：node_modules/pdfjs-dist/types/src/display/api.d.ts:253-256「rotation … If omitted it defaults to the page rotation」；pdf.mjs:10895 起 class TextLayer 持 #rotation 成员（消费 viewport.rotation=0）——结构性错位闭环。
- includeMarkedContent：PdfPageCanvas.tsx:136-137 注释+'str' in item 过滤逐字在档——DOM 无 markedContent span。endOfContent 反驳更强于设计声称：pdfjs 核心 TextLayer 类不 append endOfContent（仅 viewer 侧引用），应用 DOM 根本无该节点。
- **mergeLineRects「只与末簇比较」——证实**：annotation-anchor.ts:357-381 聚类循环 gi=rowGroups.length-1 恒比末簇；:259-265 注释自认失联+修法；annotation-merge.ts:26-28 先例声明逐字在档，mergeRects :119-142 确与全部簇比中心距。
- **D2 成本表——逐条证实**：collectSpans×2（anchor-serialize.ts:132+annotation-anchor.ts:105）；probe×2+join×3（:137-138,147）；rectsBetweenPoints×2 且第二次纯冗余（probe 偏移→offsetToPoint 往返在同一 span 集上重建相同边界点，两 pixelBoxOf 间零 DOM 写→产物逐位相同，唯一增量=textNodes）；medianFontSizeBetween×2；getClientRects×2；merge×2；pixelBoxOf×3；bandsForTextNodes 每 span 双 getComputedStyle（fontSizeOf:162-165+metricsOf:139）+ctx.font 赋值+measureText+gBCR。
- **受锁测试断言——全部实测证实**：selection-paint.test.tsx 恰 17 it（grep -c）；S1b :165/S1c :190 在场且内容=拖选期节流视觉断言（S1b=leading 即时渲染+工具条 200ms 后弹出 :184-187；S1c=trailing 随动）；vi.stubGlobal rAF 先例逐字在 :324-327；selection-layer.test.tsx 恰 14 it；e2e F-06 test 块 :683-761 且断言面=::selection rgba(0,0,0,0)+selection-rects 在场+rgba(0,0,0,0.2)+toolbar timeout 1_500；INV-58 未占用（现行最大=INV-57）。
- **同盒几何——证实**：PageBox.tsx:55 div.relative.h-fit、TextLayer.tsx:97-104 显式 width/height。补充佐证：textLayer 尺寸链经 PagesOverlay.tsx:93-96 Math.round(canvas gBCR)，ui-scale 由 theme.css:131-136 双 zoom 精确补偿（:126-129 探针在档）——同盒在 ui-scale≠1 下也成立。
- SelectionLayer 现行 wc -l=249（贴 250 红线表述准确）。
- 小偏差（不伤结论）：①「quote/prefix/suffix 切片 O(页文本)」——quote 实为 O(选区长)、prefix/suffix O(32)；②快路径「亚毫秒」为估算（设计已自标）。

## 轴2 态空间完备性 —— 存疑（态表自洽；一处新行为类严重度前后不一）

- S0~S9+Q1~Q9 行号引用全核实（:102-105/:109-115/:117-131/:161-175/:176-179/:185-196/:199-228/:217-220 全对）；Q1-Q9 与现行代码行为一致。
- **快路径→settle 几何跳变面**：§6 已知边界①已申报（元素容器边界差额，且零宽差额 rect 会被 mergeRects W_MIN 滤掉——比预期更窄）；但 §0/§4 对比表「INV-37=保持」无此限定语（WARN-1）。另一跳变源设计只提一半：快路径 textNodes=「Range 子树父元素枚举」vs settle=findRangeAtOffset.textNodes（偏移重构）——两套枚举口径边界处可差一个 span→band 集差→matchBand 绑定差→块垂直几何跳；INV-58 等价 it 只能覆盖文本边界夹具，锁不住该族残余（并入 WARN-1 票面锚）。
- 缓存失效边界覆盖 ✓（zoom 换键/页重建换 span WeakMap 自然失效）；mid-drag zoom 一帧陈旧已申报②。缓存键浮点等值：同批次逐位相同命中成立；ui-scale 补偿浮点残差可致跨批次微膨胀（有界于 span 生命周期）——§6 边界④未含（NIT）。
- rAF 后台/遮挡暂停：影响面=隐藏态程序化选区视觉陈旧（cosmetic，NIT）。S1'×rAF 竞态：mouseup cancel 先于 evaluate 现行在档（:161-175），低风险未显式声明（NIT）。

## 轴3 三案对比公平性 —— 证实（无稻草人化）

- A 非稻草人：致命伤=政策面（推翻 R1 用户根治令+INV-37 已锚定面 docs/invariants.md:51——e2e+单测+真机 12/12 在档）；技术面 CSS 穷尽性有仓库史背书（text-layer.css:12-45 记录 F-06 不透明遮字/F-07 transparent/F-08 半透明叠深/F-09 灰/R2-F-10 降 alpha——两条 CSS 路都试过且失败）；mix-blend-mode 对 ::selection 伪元素不可用（非盒元素）。
- C 非稻草人：「拖选期零 JS 完美」两处如实记格；「切换接缝」技术判断准确（::selection transparent 翻转必须与 paint commit 同帧否则闪变/双渲染），五轮事故同族担忧有仓库史背书。
- 对比表无失真格（唯一措辞问题=INV-37「保持」格，归 WARN-1）。

## 轴4 约束合规 —— 证实为主（两处 WARN）

- locks 纪律与 AGENTS.md 原文一致（「自产 scripts/*.mjs 写完即时 locks:generate+apply——check-locks 的 walk 自动覆盖 scripts 下全部 .mjs/.ps1」）✓。
- **调度器测试锚**：grep tests/ 对 createVisualScheduler/selection-geometry 直接 import 零命中——现行调度器行为锚=selection-paint.test S1b/S1c（组件级），§5.3 的 S1b/S1c 改写即调度器锚，不算漏文件；但「rAF 调度器无直测」未显式声明+新单元「帧内合帧去重」至少一锚（WARN-4）。
- **P10 删旧面**：§5.1「evaluateFull（现行逻辑迁入零变）」会保留 visualOnly 死分支（onVisual 不再调 evaluate(·,true) 后 SelectionLayer.tsx:103/113/123/129/138-139 分支全死）——违反「死代码即删」（WARN-2）。
- 行数预估：annotation-anchor 440→~460 ✓（实测 440）；selection-geometry 144→~180 ✓（实测 144）；**SelectionLayer −55 偏乐观**：evaluate 闭包 :97-144=48 行+import 收缩 ~3−新接线 ~4≈净 −47→~202（WARN-3；红线解除结论不受影响）。
- 受锁配套未漏文件（selection-layer.test 14 it 走 settle/mouseup 路——vitest fake timers 默认 fake rAF、advanceTimersByTimeAsync 即触发，「预计零改」成立）。

## 轴5 内部一致性与风险漏报 —— 存疑（三点）

- 内部矛盾：§0/§4「INV-37=保持」无 caveat vs §6 边界①（WARN-1 承载）。其余数字面全部实测自洽（17/14/249/144/440/683-761/242/INV-58 空位）——计数纪律达标。
- 漏报 rAF×React 并发面：rAF 回调内同步 setPaint 在非 act 环境/并发渲染下交错未申报——测试面可用 :324-327 桩+fake timers 覆盖，票面应写明（WARN-5）。
- 「受锁两文件改写先例四轮在档」计数弱锚（建议给可查锚，NIT）。

## BLOCKING 清单

空。推荐案 B 成立性未被伤及。

## WARN 清单（主控终裁=全部消化入设计稿）

1. INV-37「保持」格加限定语+跳变缓解入 F-A6-c 票面（settle 产物落地同帧覆盖快路径产物断言——现有等价 it 锚不住 textNodes 枚举口径差族）。
2. evaluateFull 迁移须删 visualOnly 死参（:103/113/123/129/138-139）——「零变」表述改「迁移+删 visualOnly 面」（P10 红线）。
3. SelectionLayer −55 预估改 ~200±5（实测测算 −47）。
4. 调度器测试锚显式化（无直测、锚=S1b/S1c 组件级）+「帧内合帧去重」至少一 it。
5. rAF 回调内 setPaint 的 React 并发面申报+测试桩方案（vi.stubGlobal :324-327 先例+fake timers advanceTimersByTimeAsync(≥16)）。

## NIT 清单

①quote 切片 O(选区长)；②「四轮先例」给可查锚；③rAF 后台暂停 cosmetic 申报；④§5.2 补 mouseup cancel-before-evaluate 顺序保持；⑤§6 边界④并入缓存键浮点等值点；⑥A 案补 mix-blend-mode 不适用 ::selection 引注。

## 总裁决

**PASS_WITH_WARNINGS**——源码断言层零失实，三案对比无失真格，推荐案 B 成立性完好；WARN 五项均属票面级修订，落地前应消化（主控已于 2026-09-03 全部消化入设计稿 v2）。
