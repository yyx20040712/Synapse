# F-GEOM-01-G2 受锁面先行对账表（设计书 §2.4 先行对账义务——动手前落盘）

> 产物地位：registry 票面「受锁面先行对账义务=立案时先出断言对账表（§5.2 风险 1）」的兑现件。
> 基线：HEAD=efcedd14fd（batch 13 收口）。指纹门口径（门二 P1-1 更正）：基线 JSON
> stats=183 文件/1757 用例/5334 断言；本票开工时工作树 cur=187/1790/5417（设计书 §5.1
> 时点数）；本票后 cur=187/1789/5411（−1 用例=rectsFromRange、−6 断言）；vitest 运行域
> 170 文件/1744 用例。
> 侦察口径：主控逐文件亲读（selection-layer/selection-item-chain/selection-evaluate/
> selection-paint/annotation-anchor.test）+ locks manifest 逐项核对（受锁 6 件）。
> 关键事实：selection-layer.test.tsx 14 用例**零 page-items 桩**（与设计书 grep 实测一致）
> ——jsdom 下 itemChainFor 恒 null → 现行全量评估一律走 DOM 回退臂挂 pending → 保存门
> 落地后所有「工具条在场」用例必红，补桩=票面指定修法。

## A. tests/unit/renderer/selection-layer.test.tsx（14 用例；受锁）

| # | 用例 | 现行路径 | 保存门后 | 处置 |
|---|------|----------|----------|------|
| 1 | closestPageRoot 纯函数 | 不经 evaluate | 不变 | **零改** |
| 2 | pageIndexOf 纯函数 | 不经 evaluate | 不变 | **零改** |
| 3 | P1 挂载盒≠选区页（防抖工具条+坐标÷zoom） | item=null→DOM 回退挂 pending | 补桩→项族 pending | **补桩页 2，断言零改**（left/top 由 rangeRect 桩+toolbarMountPos 驱动，与产链族无关） |
| 4 | P2 跨页 mouseup 拒绝+toast | 守卫拦截 | 不变 | **零改** |
| 5 | P2b 跨页防抖不 toast | 守卫拦截 | 不变 | **零改** |
| 6 | P3 mouseup 即时出条 | DOM 回退挂 pending | 补桩 | **补桩页 2** |
| 7 | F-12a 误触不出条 | F-12 位移门 | 不变 | **零改** |
| 8 | F-12b 真拖选出条 | DOM 回退挂 pending | 补桩 | **补桩页 2** |
| 9 | F-12c 无 mousedown 放行 | DOM 回退挂 pending | 补桩 | **补桩页 2** |
| 10 | P4 保存页动态推导+onSaved 回流 | DOM 回退挂 pending→保存 | 补桩→项族 pending→保存 | **补桩页 2，断言零改**（仅断言 page=1/onSaved/工具条收——无 rects 族断言） |
| 11 | P5 Escape 清 | DOM 回退挂 pending | 补桩 | **补桩页 2** |
| 12 | P6 承载页卸载收工具条 | DOM 回退挂 pending | 补桩 | **补桩页 2** |
| 13 | P7 页外静默收起 | 守卫拦截 | 不变 | **零改** |
| 14 | F-A4 pending 态自绘层在场 | DOM 回退 paint+pending | 补桩→项族 | **补桩页 2，断言零改**（≥1 块，项族同样满足） |

小计：零改 6＋补桩断言零改 8。**指纹门 C 面：零变化**（标题/断言不动，纯夹具桩增）。
桩法 crib selection-item-chain.test.tsx：`usePageItemsStore.getState().clear()` 入
beforeEach＋seedRegistry(2, mkText([mkItem('page two gamma delta', 72, 700)]))——
fixture 页 2 文本 'page two gamma delta'，选区 span2[0..4]；对账前提=items 拼接==DOM 全文。
**夹具必要件补记（门一 N3 处置，实现时发现）**：该夹具 textLayer 需盒桩
`rects.set(<textLayer>, <同页盒值>)` ×2 行——缺桩则 pixelBoxOf 兜底 1×1→项盒越界
→G2 健康门误拦项链（8 用例假红）；属「补桩页 2，断言零改」处置的物理前提（门一
独立裁定=合理延伸非越权）。

## B. tests/unit/renderer/selection-item-chain.test.tsx（6 用例；受锁）

| # | 用例 | 处置 |
|---|------|------|
| 1 | 通道生效 | **零改**（自带桩，主链成功路径） |
| 2 | 保存链同源（INV-58 前半） | **零改** |
| 3 | zoom 现读 | **零改** |
| 4 | 回退①页项缺失 | **改写（本票 TDD 红锚）**：现行断言「+零功能损失（工具条在）」＝保存门要闭合的接缝真身。新语义（设计书 §2.1 行 3/§2.4）：rect 在场（DOM 形状 top≈25.25% 视觉连续）＋**工具条 null（保存门＝无保存入口）**＋warn 不静默。标题与断言随新语义改写（旧标题含「工具条在」失实，禁保留） |
| 5 | 回退②偏移对账失败 | **零改**（无 pending/工具条断言；paint DOM 回退照渲+warm 断言保持成立） |
| 6 | G2 降级门 | **零改**（抑制路径与保存门正交） |

小计：改写 1。**指纹门 C 面：豁免条目 1**（旧标题从 C_after 消失——条目见文末）。

## C. tests/unit/renderer/selection-paint.test.tsx（17 用例；受锁——票面未点名、主控侦察补入）

| # | 用例 | 处置 |
|---|------|------|
| 1 | S1 拖选防抖自绘层（跨 3 行重叠） | **零改**（paint-only：DOM 回退 paint 照渲，保存门不动 visualOnly 路） |
| 2 | S1b 零反馈回归（t=216 工具条） | **补桩页 1，断言零改**（t=150/t=216 工具条时序与产链族无关） |
| 3 | S1c 帧随动 | **零改**（paint-only） |
| 4 | S2 所见即所存（保存 rects≡自绘块） | **补桩页 1，断言零改**（比较式断言：项族下 pending.anchor.rects 与 paint 同源，同源性保持——item-chain 保存链同源例已证 band.top≡rect.y） |
| 5 | S5 Escape 工具条收/自绘留 | **补桩页 1** |
| 6~9 | b 面 4 例（rectStyle/bandFromMetrics） | **零改**（纯函数，不经 SelectionLayer evaluate） |
| 10 | AnnotationLayer 挂 B 接线 | **零改**（不经 selection evaluate） |
| 11~13 | c 面 3 例（归一/近顶翻转/视口夹取） | **补桩页 1，断言零改**（工具条定位由 rangeRect 桩+toolbarMountPos 驱动） |
| 14~15 | a1/a2 band 单源自绘 | **零改**（paint-only，band/span 桩驱动） |
| 16~17 | c1/c2 层序 | **零改**（c1 paint-only；c2 纯常量） |

小计：零改 11＋补桩断言零改 6。**指纹门 C 面：零变化**。

## D. tests/unit/renderer/annotation-anchor.test.ts（受锁——死面删除③对账）

- rectsFromRange 直测用例（:73-85，1 用例 6 断言）**整例删除**＋import 面 `rectsFromRange`
  同步移除（src 导出面删除后 import 悬空=编译红——删除序：先删 src 导出证红，再删用例复绿）。
- 其余用例（verifyQuote/selectionToAnchor/collectSpans 系）**零改**。
- **指纹门 C 面：豁免条目 2**。

## E. 指纹门豁免清单条目（scripts/test-surface.exemptions.json，+2 条≤10 无需呈裁）

1. file=`tests/unit/renderer/selection-item-chain.test.tsx`，caseTitle=旧标题原文（基线
   JSON 精确串）：`回退①页项缺失：注册表空 → DOM 量测链兜底（span 量测盒 top≈25.25%=200/792≠项链 10.61%——判别性）+console.warn 不静默+零功能损失（工具条在）`
   ——reason：F-GEOM-01-G2 保存门行为变更（设计书 §2.4/§2.1 行 3）：回退态=仅显示不入库，
   工具条（保存入口）断言翻转，标题随新语义改写。rulingLink=设计书锚点 `#2.4`（与
   exemptions.json 实值一致——门一 N4 措辞对齐）。
2. file=`tests/unit/renderer/annotation-anchor.test.ts`，caseTitle=`rectsFromRange：返回归一化矩形（0..1）`
   ——reason：F-GEOM-01-G2 死面收敛③（设计书 §3.5 逐项清单①）：rectsFromRange src 零消费，
   唯一直测面随导出删除（死代码即删宪法条，候选项经双门裁）。rulingLink=设计书锚点 `#3.5`
   （同上对齐）。

## F. 受锁文件清单（locks manifest 核对，6 件）

tests/unit/renderer/{selection-layer,selection-item-chain,selection-paint,annotation-anchor}.test.*
＋docs/invariants.md＋scripts/test-surface.exemptions.json——锁链=unlock→改→generate+apply
（apply 锚点=门审处置毕后最后一次）。src 三件（selection-evaluate/anchor-serialize/
annotation-anchor）不在 manifest，零锁义务。

## G. 对账结论

- 票面点名 14 例之外，主控侦察补入两文件：selection-item-chain 回退①（票面「保存流用例」
  语义的真身所在——其断言翻转即本票红锚）＋selection-paint 6 例（同因：零桩+工具条/保存
  流依赖）。三文件合计改写/补桩 16 用例，其余 22 用例零改。
- 断言面变化=2 例（回退①改写+rectsFromRange 删除），其余 14 例纯桩增零断言变
  ——「断言面按项族产物更新」的实际面=回退①（P4/S2 比较式断言在项族下自洽无需改数）。
