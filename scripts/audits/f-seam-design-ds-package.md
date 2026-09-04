# Seam 设计书对抗审核包（deepseek 审核位——2026-09-04 主控派发）

你是设计书对抗审核者。审对象=下述「AnnotationLayer 重锚域同族化设计书」（Kimi 拟定）;审据=「设计任务书」（含材料边界=库事实八条+源码节选）。你拿不到代码库。

审核五维：
1. **材料边界纪律**：设计书断言是否全部锚定任务书材料（节号/库事实序号）?有无材料外假设未标注「需主控验证」?
2. **推演链**：§0 两投影数值关系→「病理页唯一可信投影=项几何族」→「A 优先 B」——因果是否成立?「健康页 A/B 行为等价」是否反证不足?
3. **态空间完备**：S0~S6 有无缺格（如 store 就绪竞态/双页布局/zoom 中途/G2 判定输入=selectionHealth 的适用性——该检测器设计域=selection 产链,标注域复用是否需要适配）?跨格序列是否覆盖懒渲染/zoom/文档切换外的重要序列?
4. **verifyQuoteItem 构造**：§3 构造是否真的只用材料内积木?「selectionToAnchor 同式切片逻辑可复刻」是否成立（任务书 §1 头注只证明该函数存在与用途,未给函数体）——这是设计书自己标注的假设,评估其风险量级与门0 前置是否足够。
5. **落地风险**：改动面（resolveAnnotationRectsItem 新增+旧链降回退+两组件接线）与 INV 登记（58 扩域/47 适用面/59/60 新立）有无遗漏或过度设计;阶段化门 0~3 判据是否可机器判。

输出 JSON（无围栏）：{"verdict":"ENDORSE" | "ENDORSE_WITH_CHANGES" | "REJECT","changes_required":[{"target":"...","issue":"...","suggestion":"..."}],"changes_optional":[...],"summary":"两三句"}
ENDORSE=设计可进主控终裁;ENDORSE_WITH_CHANGES=需修改后再终裁;REJECT=方向错误重拟。不编造材料外事实。

## 审核对象：设计书全文

# AnnotationLayer 重锚域同族化设计书

（门二 seam_ruling 排期项 · 依据=任务书材料，材料外断言均显式标注）

## 0. 本质推演：两测量系统的投影一致性

持久化坐标系=页归一化分数（anchor.rects）。两套测量系统向该坐标系投影同一文本：

- **PDF 声明几何**（项几何族）：item transform/width/height×viewport 合成——根植于文档自身坐标空间，失真免疫面=渲染管线之外。
- **浏览器渲染量测**（DOM 量测族）：getClientRects/gBCR——根植于 textLayer 实际布局，病理页（text-layer 异常形态，V1/F-A6 取证在档）即失真于此。

**数值关系**（依据 §3-2 selectionHealth 取证）：健康页两投影偏差 0~0.12%（IoU≈1）→ seam 三风险（R1/R2/R3）全部潜伏、不可观测；病理页分叉 25~62.5% → 此时 DOM 投影是错的那一支（声明几何仍锚定文档坐标），于是：R1 跨域配对=正确 rects×失真 bands 互漂错绑；R2 显示覆盖=用失真值常驻覆盖正确库值；R3 verifyQuote 的偏移校正本身合法（排版漂移是真实象），但校正后的**量测动作**落在失真坐标系内=自愈方向错误。结论：健康页上 A/B 行为等价，方案分野只在病理页——而病理页上唯一可信投影是项几何族。**这构成 A 优先于 B 的第一论据**：B（守卫并存）在失真页只能「检测并降级」，无法产出正确值。

## 1. 态空间

### 1.1 重锚管线状态机（每条标注 × 每页）

| 状态 | 进入条件 | 行为 | 出边 |
|---|---|---|---|
| S0 挂载 | pageRoot 就绪 | 读 page-items.store（§3-3 直读先例） | 页项缺席→S4；否则→S1 |
| S1 页项对账 | store 命中 | reconcileItemsWithDom(items, domText)（§3-2 积木已在） | false→S4（warn 不静默，§3-8 先例） |
| S2 引文对账+重锚中 | S1 通过 | verifyQuoteItem 校正偏移（§3 节）→rectsForOffsetRange+bandsFromItems | 成功→S3a；对账失败→S3b |
| S3a resolved（项几何域） | S2 成功 | resolved[id]={rects,bands} 同族同域（消 R1） | 渲染消费（现状接线零改） |
| S3b 单条回退存量 | 该条 quote 对账失败 | 存量 rects+bandsNearRects（现状语义逐位保持） | 渲染消费 |
| S4 页级回退（DOM 量测层） | 页项缺席/对账失败 | 现 DOM 链整体降为回退层（F-A6 三层回退同构，§3-8） | G2 健康→S5；G2 病理→S6 |
| S5 resolved（DOM 域，标记） | S4+G2 健康 | 产物标域='dom'，仅显示不回写（现状语义） | 渲染消费 |
| S6 病理页抑制格 | S4+selectionHealth unhealthy | DOM 投影已证失真→**禁止 DOM 重锚显示**，直显存量 rects+bands 走缺省路径（F-11 分数路径先例，annotation-resolve 头注在案） | 渲染消费 |

G2 判定依据 §1 selection-evaluate 先例「unhealthy→抑制」。S6 为新增格，理由：病理页 DOM 回退产物即 R2 之害本身。

### 1.2 跨格序列

- **懒渲染重挂**：MutationObserver+rAF 合并节奏随宿主不变（F-A1 起不变，annotation-resolve 头注）；重挂即 S0 重入。
- **zoom 变化**：项几何族随 viewport 重合成=天然正确（几何×viewport 定义如此）；DOM 回退层维持现状重算。两族在 zoom 下的行为差=病理分叉之外第二分叉源，佐证同族化必要。
- **文档切换**：observer.disconnect 已有（现码在案）；store 页项随文档切换，S0 重入。

## 2. 方案对比与组合矩阵

C 为独立维度（存量处置），与 A/B 自由组合：

| 组合 | 正确性（病理页） | 复杂度 | 受锁面 | 存量兼容 | 自愈保持 |
|---|---|---|---|---|---|
| A+C1（归并渐净） | **消 R1/R2/R3** | 中（主链换积木，积木已在 §3-2） | INV-58 扩域+INV-47 登记+测试锁 | 读时归并，零迁移（§3-8 F-A4 先例） | verifyQuoteItem 等价（§3 节可构造） |
| A+C2（域标记） | 同上 | 中+模型加字段 | +Annotation 模型锁面（src/shared/**） | 显式但需全链路透传 | 同上 |
| A+C3（迁移脚本） | 同上 | 高 | +DB 受锁面 | 一次性清零但触犯最大锁面 | 同上 |
| B+C* | 仅检测降级，无正确产物 | 低-中 | 守卫登记 | 不变 | 保持但愈向失真系 |
| B 长期化 | — | — | **违宪法「方案切换=删除旧方案」**（§3-7） | — | — |

**推荐：A + C1**。论据：①病理页唯一可信投影=项几何族（§0 推演）；②所需积木全部材料内在档（rectsForOffsetRange/bandsFromItems/reconcileItemsWithDom/store 直读，§3-2/3-3），无库能力假设；③C1 有 F-A4「存量零迁移读时归并渐净」先例（§3-8），受锁面最小；C2/C3 无增量正确性收益仅增锁面，否决；④B 的守卫数学不丢弃——降格为回退层诊断（itemChainFor 单源 warn 先例，§1），不作并存几何方案。

**改动面（模块/函数级）**：
- `annotation-resolve.ts`：新增 `resolveAnnotationRectsItem`（主链：store 读→对账→verifyQuoteItem→rectsForOffsetRange+bandsFromItems）；现 `resolveAnnotationRects` 改名 `…Dom` 整体降为 S4 回退层（函数体零改=INV-47 数值面不动）；`matchBand`/band 单源/消费接线零改。
- `AnnotationLayer.tsx`/`AiAnnotationLayer.tsx`：resolve 闭包改调三层（项几何→DOM→存量），resolved 增域标记字段（仅运行时，不入库=不动模型锁面）。

## 3. verifyQuote 域内等价物（A 的硬前提）

**构造（全部材料内积木）**：`verifyQuoteItem(items, startOffset, endOffset, quoteText, prefix?, suffix?)`——buildItemOffsets(items)→{spans,total} 得页项文本窗（§3-2）；join 项文本后按 selectionToAnchor 同式 quote/prefix/suffix 切片逻辑（§1 头注明载该切片存在于 selectionToAnchor=材料内可复刻）滑窗定位 quoteText→得校正偏移 (s′,e′)；|s′−startOffset|>0 即排版漂移→采校正值走 rectsForOffsetRange。**自愈语义等价成立**：原 verifyQuote=quoteText↔DOM 文本对账校偏移；等价物=quoteText↔items 文本对账校偏移，且校后量测落在可信坐标系=自愈方向转正。

**失败降级语义**：对账失败→该条 S3b（存量显示，仅显示不回写——现状语义逐位保持，R3 不劣化）。
**假设：需主控验证**——verifyQuote 匹配核是否纯文本函数可直接复用；若否，按上段复刻（仍材料内）。页文本 join 每页一次可缓存摊销（**假设：需主控验证**性能预算；对照先例=selectionToAnchor 本就做 O(页文本) join，量级同档）。

## 4. INV 登记（条款草案）

- **INV-58 扩域**：适用域由「selection 产链」扩为「selection 产链+Annotation/AiAnnotation 重锚链」；同族禁令全文不变；DOM 量测仅允许存在于显式回退层且产物必须标域。
- **INV-47 适用面登记**：mergeLineRects 退出重锚主链→适用面收缩为「DOM 回退层+存量读时归并（mergeRects 挂 lineH）」；受锁⑪断言数值面不变（回退层函数体零改保证）；若锁测试断言调用面则需 [locked-change]+locks 流程（§3-7）。
- **新 INV-59（草）「重锚同族配对令」**：resolved.rects 与 bands 必须同族；跨族配对仅允许在 S3b/S5 回退格且须登记为已知边界（消 R1 残余于主链）。
- **新 INV-60（草）「重锚显示覆盖登记」**：重锚成功产物覆盖库值仅显示层、永不回写；域标记随 resolved 走——将 R2 由隐式 seam 转为显式登记语义（INV-37 只覆盖拖选期，不扩其文，另立本条）。

## 5. 测试面

- **单测（先红判据）**：①verifyQuoteItem 纯函数（漂移注入→校正值断言）——旧实现无此函数=红；②主链域断言：mock store 注入页项，断言 resolved 产物=rectsForOffsetRange 输出（旧 DOM 实现=红）；③S6 格：unhealthy→无 DOM 产物；④matchBand 同族配对（INV-59）；⑤回退层级 warn 单源。
- **e2e**：健康页 fixture（新旧产物 IoU 应≈1=回归门）+病理页 fixture（期望=项几何产物贴合 canvas 视觉）。
- **受锁面**：tests/** 新增/改动走 sha256 流程；INV-47 锁测试若涉调用面→[locked-change]。
- **取证面**：复跑 V1/F-A6 病理页集（25~62.5% 分叉档），真机对照重锚前后渲染贴合度——沿用 F-A6「复跑对照」先例。

## 6. 阶段化（决策门）

- **门0 前置**：verifyQuoteItem 纯函数+单测绿；§3 两条「需主控验证」假设裁决。
- **门1 复跑对照**：新旧重锚链同页双跑（不切换显示），健康页 IoU≈1 且病理页项几何产物视觉贴合=放行判据；否则回退门0。
- **门2 主链切换**：S0–S6 状态机上线，DOM 链整层降回退，INV-58/47/59/60 登记同步落档。
- **门3 收口**：观察期后 DOM 回退层去留裁决——F-A6 三层回退先例（§3-8）支持保留为回退层（非并存方案，不触「删除旧方案」）；若主控裁定删除则整体移除。

## 7. 风险表

| 风险 | 缓解 |
|---|---|
| R1 残余（S3b/S5 跨族配对） | INV-59 限定回退格+登记；matchBand 阈值（\|Δcenter\|≤rect.h）仍在 |
| R2 覆盖语义隐式化 | INV-60 显式登记+域标记；永不回写语义现码已在 |
| R3 等价物不成立 | 门0 假设裁决前置；不成立则 A 降级=保留偏移库值直取（不自愈但仍同族），B 守卫兜底诊断 |
| 页项缺席（懒渲染早期） | S4 回退层；store 就绪后 MutationObserver 节奏重入 S0 |
| quote 对账假阳性误校正 | prefix/suffix 双侧锚定（selectionToAnchor 同式）+对账失败即存量回退，零回写 |
| 性能（页文本 join） | 每页一次缓存；量级≤selectionToAnchor 现状（假设已标） |
| INV-47 锁面误触 | 回退层函数体零改；调用面变化走 locks 流程 |

## 审据：设计任务书全文（材料边界）

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

