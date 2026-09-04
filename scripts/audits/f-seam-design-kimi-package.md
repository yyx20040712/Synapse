# AnnotationLayer 重锚域同族化设计任务书（Kimi 拟定位——2026-09-04 主控派发）

你是架构设计拟定者。为「AnnotationLayer 重锚域与项几何保存域的 seam」拟定设计书。零仓库接触,一切事实以下述材料为准（材料即事实边界——材料未提的库行为不得假设）。

## 1. 问题定义（b2 门二 seam_ruling 排期项）

F-A6 战役把**划选保存链**迁到项声明几何族（PDF 文本项 transform/width/height×viewport 合成,pdf-item-geometry 单源,INV-58「同几何族禁令」）。但 INV-58 适用域=selection 产链;**AnnotationLayer/AiAnnotationLayer 的存量标注重锚域仍走 DOM 量测族**（findRangeAtOffset→getClientRects→mergeLineRects+span gBCR 字形带推算）——两族并存=seam。

### 三条产链域归属现状

| 产链 | 几何族 | 产物 | 落点 |
| --- | --- | --- | --- |
| 保存链（新,2026-09-04 起） | 项几何族 | itemSelectionGeometry→rects（归一化分数）+bands | 入库 anchor.rects |
| 保存链（存量,迁移前） | DOM 量测族 | getClientRects→mergeLineRects | 入库 anchor.rects（同库混存） |
| 重锚链（AnnotationLayer/AiAnnotationLayer） | DOM 量测族 | resolveAnnotationRects→resolved[id]={rects,bands} | 仅显示不回写 |

### 渲染消费链（AnnotationLayer.tsx 节选）

```tsx
pageAnnotations.map((a) =>
  mergeRects(resolved[a.id]?.rects ?? a.rects, lineH).map((r, i) => (
    <div data-testid="annotation-rect" ... style={rectStyle(a.kind, a.color, r, matchBand(resolved[a.id]?.bands ?? fallbackBands, r))} .../>
  )))
```
resolved（DOM 域重锚产物）优先;缺项回退存量 rects（库值——新旧域混存）;bands 恒 DOM 域（重锚 bands 或 fallbackBands=bandsNearRects）。

### 重锚链（AnnotationLayer.tsx 节选）

```tsx
// 文本层就绪后重锚：verifyQuote 校正偏移（自愈排版漂移）→ findRangeAtOffset 重算 rects
  // +行盒自适应字形带（F-A4 b②——annotation-resolve 域，组件 ≤250 红线拆出）；
  // 失败回退存量，仅显示层不回写库
  useEffect(() => {
    if (pageRoot === null) {
      return
    }
    const textLayer = pageRoot.querySelector('.textLayer') as HTMLElement | null
    if (textLayer === null) {
      return
    }
    let scheduled = false
    const resolve = (): void => {
      scheduled = false
      const next = resolveAnnotationRects({ textLayer, annotations, page })
      setResolved(next)
      setLineH(normalizedLineHeight(textLayer))
      // 重锚失败者存量 rects 过 band 单源（成功者 bands 已在 next——两路同数学）
      const failed = annotations.filter((a) => a.page === page && next[a.id] === undefined && a.rects.length > 0)
      setFallbackBands(failed.length > 0 ? bandsNearRects(textLayer, failed.flatMap((a) => a.rects)) : [])
    }
    // 文本层 span 逐个入 DOM（pdf.js render() 异步）：rAF 合并成每帧一次
    const schedule = (): void => {
      if (!scheduled) {
        scheduled = true
        requestAnimationFrame(resolve)
      }
    }
    resolve()
    const observer = new MutationObserver(schedule)
    observer.observe(textLayer, { childList: true, subtree: true })
    return () => observer.disconnect()

```

### annotation-resolve.ts 头注（重锚域全貌）

```
/**
 * [F-A4] annotation-resolve —— 标注渲染重锚与行盒自适应域（自 AnnotationLayer
 * 拆出——组件 ≤250 行红线预裁；票面 §3 拆件结构）。
 *
 * ── 行为层 ──
 * - resolveAnnotationRects：verifyQuote 校正偏移（自愈排版漂移）→
 *   findRangeAtOffset 重算 rects——逐条等价自 AnnotationLayer 原 resolve
 *   闭包迁出（行为零变：失败回退存量，仅显示层不回写库）；
 * - [F-A4 b②] 行盒自适应字形带：重锚 range.textNodes 的 span 实测盒
 *   （gBCR）+canvas 字体度量（measureText 的 actualBoundingBox Ascent/
 *   Descent=墨带实界+fontBoundingBox=回退字体布局带）→ 推算字形带
 *   [字形顶, 基线+descender 尾]（归一化域）——rectStyle band 消费（顶贴
 *   字形顶缘底贴底缘）。无 canvas 2d/度量缺字段（jsdom）→ 空 bands，
 *   渲染回退 F-11 分数路径（缺省兼容）。
 * - [F-A5 a/b] band 单源三消费点：①自绘选区（SelectionLayer evaluate→
 *   SelectionPaint）②标注存量回退（AnnotationLayer 重锚失败路径）③AI 段
 *   （AiAnnotationLayer）经 **bandsNearRects**（rect 集→重叠 span 行簇带）
 *   消费同一 span→带核心（bandFromMetrics+同行近并）——与重锚路径同基准
 *   （票面 §1「行簇字形带推导单源」）。其中自绘选区/AI 段走**节点口径**
 *   bandsForTextNodes（选区/引文自身的 textNodes——免疫 CSS 行盒整体偏移，
 *   真机实锤：小字号紧排文档行盒偏上 ~9px 使几何匹配错绑上一行）；存量
 *   rects 回退（重锚失败无节点可依）走几何口径 bandsNearRects 尽力而为。
 *   RowBand 增 x0/x1（行簇 span 实际端点——a 面自绘块水平界夹取源）。
 * - normalizedLineHeight：textLayer span 的 computed font-size 中位数/
 *   textLayer 盒高（挂 B mergeRects 行高感知 lineH——存量 rects 读时归并
 *   同口径；量测退化→undefined 旧行为）。
 * - matchBand：渲染块→最近中心带（|band.center−rect.center| ≤ rect.h 才
 *   匹配——跨行带不误配）。
 *
 * ── 接口层 ── / ── 架构层 ── / ── 生命周期层 ──
 * - 依赖单向：本模块→anchor-serialize/annotation-anchor（零环）；DOM 访问
 *   只读（gBCR/getComputedStyle/canvas 量测），文本遍历仍唯经
 *   annotation-anchor（F-ARCH4 契约保持）；纯几何 bandFromMetrics/
 *   matchBand 单测直测。
 * - 性能：量测只发生在与输入 rects 重叠的 span 上（gBCR 预筛——拖选节流
 *   200ms 周期内 ~页级行簇量级）；MutationObserver+rAF 合并节奏随宿主
 *   （F-A1 起不变）。
 *
 * ── 文化层 ──
 * - tests/unit/renderer/selection-paint.test.tsx（bandFromMetrics 纯几何+
 *   AnnotationLayer 挂 B 接线）+ F-A5 段（bandsNearRects 三消费点）。
 */
import type { Annotation, AnnotationRect } from '@shared/models/annotation'
import { verifyQuote } from './anchor-serialize'
import { findRangeAtOffset, pixelBoxOf, type PixelBox } from './annotation-anchor'

/** 行簇字形带（归一化域；center=带中心——渲染块匹配键；x0/x1=行簇 span
 *  实际端点——F-A5 a 面自绘块水平界夹取源，缺省=该带无端点量测） */
export interface RowBand {
  top: number
  bottom: number
  center: number
  x0?: number
  x1?: number
}

/** 重锚结果（id → { rects, bands }；缺项回退存量 rects 由消费方兜底） */
export interface ResolvedAnnotation {
  rects: AnnotationRect[]
  bands: RowBand[]
}

/** span 字体度量（canvas measureText 产物——墨带实界+回退字体布局带） */
export interface SpanMetrics {
  ascent: number
  descent: number
  fontAscent: number
  fontDescent: number
}

/** 纯几何：span 盒+字号+字体度量+归一化基准 → 字形带。
 *  基线=盒顶+半前导+回退 ascent（半前导=(行盒高 fs−布局带高)/2，**负值合法
 *  不钳 0**——line-
```

### selection-evaluate.ts 头注（项几何族产链——对照）

```
/**
 * [F-A6-b2] selection-evaluate —— 划选评估域件（自 SelectionLayer 拆出——组件
 * ≤250 行红线触发[票面预判条款：通道接线使其超行则拆本件]；设计书 §5.1 本有
 * 此件=F-A6-c 快/慢路径宿主，本票提前拆出=evaluate 函数域净迁移+项几何链
 * 切换，行为面经 selection-layer/selection-item-chain 测试锁）。
 *
 * ── 行为层 ──
 * - evaluateFull(fromMouseUp)（settle/mouseup 路）：四道收敛守卫（选区空/跨页/
 *   页外不可锚定/零宽盒→setPaint(null)+setPending(null)）→ 锚定
 *   （selectionToAnchor 三元组）→ [F-A6-b2] rects 产链双路（项几何主链+DOM
 *   量测回退，见下）→ setPaint → 工具条落点（toolbarMountPos）+setPending
 * - **[F-A6-c] evaluateVisual()（拖选期快路径——rAF 帧点消费）**：项几何链直取
 *   （INV-58 后半：快路径与 settle 同族=pdf-item-geometry 项几何族，禁第二几何
 *   口径；clientRects/gCS 链尽消（getClientRects/getComputedStyle 量恒零
 *   ——gBCR/Range.gBCR 残余两项绝对量在场：零宽盒守卫 Range.gBCR×1+
 *   pixelBoxOf 基准盒×1，§12 归一化净面披露在档）。链=轻量偏移 probe（Range.toString
 *   ×2——省 selectionToAnchor 的 O(页文本) join+quote/prefix/suffix 切片与
 *   rectsBetweenPoints/medianFontSizeBetween 全量几何/量测链）→page-items.store
 *   直读页项→rectsForOffsetRange+基线分组+归一化→setPaint；**bands 项几何链
 *   现算不缓存**（bandsFromItems 纯函数 O(被选项) 零布局读零 measureText——
 *   无缓存摊销必要；第四轮取证 §12 tick 实测在档佐证）。四道守卫前置强制
 *   （Kimi 拟定裁决 2-§5①）：(i) sel 空/坍缩→setPaint(null)；(ii) 跨页→
 *   setPaint(null) 静默；(iii) 页外/textLayer 缺→setPaint(null)；(iv) 零宽盒→
 *   setPaint(null)。G2 同门（selectionHealth unhealthy→setPaint(null) 拖选期
 *   抑制）。visual 语义=只 setPaint 不动 pending（工具条弹出语义独属
 *   settle/mouseup 全量，零变）。
 * - **回退层级声明（票面 §1-B）**：快路径失败（probe 失败/页项缺失/偏移对账
 *   失败/计算异常/退化区间）→回退=全量视觉评估（evaluateCore(false,true)——
 *   自带 DOM 量测回退链）；全量的回退链=DOM 量测（b2 已建）——三层：快路径→
 *   全量→DOM 量测。快路径自身零 console.warn（回退诊断单源=evaluateCore 的
 *   itemChainFor，防每帧双 warn 刷屏）。
 * - **INV-58 等价/同帧覆盖**：快路径偏移域=probe 全文偏移（selectionToAnchor
 *   同源同式）→快慢产物同族同链等价；mouseup/settle 全量在快路径最后一帧后
 *   执行（mouseup 形态=cancel 先清 rAF 再同步全量），setPaint 以全量产物同帧
 *   覆盖（边界差额由此吸收——已知边界①/①'）。锚
```

## 2. seam 风险形态（立案依据）

- **R1 跨域配对**：新保存标注（项几何域 rects）重锚失败时→rects（项几何）×fallbackBands（DOM 量测 bandsNearRects）配对——matchBand 中心匹配（|band.center−rect.center|≤rect.h）在两域失真页互相漂移（DOM 量测失真页=V1/F-A6 取证已证的 text-layer 异常形态）。
- **R2 显示覆盖语义**：重锚成功→显示用 DOM 域 resolved.rects 覆盖项几何域库值（仅显示不回写）——「所见≠所存」在标注域无显式登记（INV-37 的弱化口径只覆盖 selection 拖选期;标注域是**常驻显示态**语义不同）。
- **R3 verifyQuote 自愈的域依赖**：verifyQuote（quoteText↔DOM 对账校正偏移——自愈排版漂移）只在 DOM 域定义;项几何域无等价物。
- AiAnnotationLayer（AI 标注）同链同 seam。

## 3. 关键库事实（材料边界内）

1. **Annotation 模型含 startOffset/endOffset**（zod int min0——页内文本层偏移定位器,textPosition 页内序）+quoteText+rects（归一化分数）。
2. **pdf-item-geometry 导出面**（项几何族单源,selection 链已消费）：buildItemOffsets(items)→{spans,total};rectsForOffsetRange(...)——**offset 区间→rect 的直取积木已在**;bandsFromItems(boxes,base,tolPx)→RowBand[];baselineGroupBlocks;reconcileItemsWithDom(items,domText)→bool（items↔DOM 文本对账）;selectionHealth（G2 检测器:偏离率≥5% 判病理性——健康 0~0.12% vs 病理 25~62.5% 取证在档）;clampScale。
3. **page-items.store**（zustand）=页项/页几何下钻注册表单源（selection 快路径 store 直读先例）。
4. **INV-47**（受锁⑪存档断言锁）：mergeLineRects/mergeRects 的 pitch 双门+「缺省=F-A4 原口径逐位不动」——重锚链若不再走 mergeLineRects,INV-47 适用面变化须同步登记。
5. **INV-58**：同几何族禁令现文=「适用域=selection 产链;AnnotationLayer 重锚域=票外（门二 seam_ruling）」——本设计即该票外域的收敛。
6. **INV-37**：拖选期弱化「所见≈所存」+松手/保存时刻严格所见即所存（settle 全量单一权威）。
7. 宪法约束：「方案切换=删除旧方案」（不允许两套几何方案长期并存）;「同类缺陷二次触发即重构」;分层单向;受锁测试面（tests/**+src/shared/** CI sha256）改动须 [locked-change]+locks 流程。
8. 先例池：F-A4 b「存量缺陷态 rects 库数据零迁移,读时归并存量渐净」;F-A6-b2 主链迁移三件套（单源注册表/拆件/守卫前置）;F-A6 三层回退（快→全量→DOM 量测,warn 不静默）;F-V1 紧凑排版 pitch 双门。

## 4. 设计方向候选（可组合,可推翻重来——论据优先）

- **A 重锚域同族化**：resolveAnnotationRects 主链改项几何族（startOffset/endOffset+页项→rectsForOffsetRange+bandsFromItems——与 selection 快路径同族同积木）;DOM 量测降回退（三层回退同构）;verifyQuote 自愈需域内等价物设计（如 quoteText↔items 对账）或显式降级语义。
- **B 域间换算守卫**：两族并存长期化,在配对/覆盖点（matchBand 消费/resolved 应用）加域一致性守卫+超差策略。
- **C 存量数据处置**（正交维度）：存量 rects（DOM 域）与新 rects（项几何域）同库——读时策略（A 先例:归并渐净/域标记/一次性迁移脚本——迁移脚本涉 DB 受锁面）。

## 5. 设计书要求（输出结构）

1. **态空间**：重锚管线状态机（挂载→文本层就绪→重锚中→resolved/失败回退——含页项缺席/对账失败/G2 病理各格）+跨格序列（懒渲染重挂/zoom 变化/文档切换）。
2. **方案对比**：A/B/C 组合的取舍表（正确性/复杂度/受锁面/存量兼容/自愈能力保持）;给出**推荐方案+论据**（明确到模块与函数级改动面）。
3. **verifyQuote 等价物设计**（若推荐含 A）：项几何域的引文对账——材料边界内可行方案（如 quoteText vs buildItemOffsets spans 文本窗对账）与失败降级语义。
4. **INV 登记**：INV-58 扩域/INV-47 适用面/新 INV（若有）的条款草案。
5. **测试面**：单测/e2e/受锁面清单（先红判据）;取证面（若需真机取证）。
6. **阶段化**：决策门设计（F-A6 先例:前置修复→复跑对照→主链迁移）。
7. **风险表**：每风险一条缓解。

输出=完整设计书 markdown（≤4000 汉字当量正文;结构紧凑;所有设计断言标注依据（材料节号/库事实序号）;不得引入材料外假设——必要假设显式标「假设:需主控验证」）。
