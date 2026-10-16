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
 *   ：(i) sel 空/坍缩→setPaint(null)；(ii) 跨页→
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
 *   覆盖（边界差额由此吸收——已知边界①/①'）。锚=selection-evaluate.test
 *   快慢等价 it+同帧覆盖 it（票面强制）。
 * - [F-A6-b2] rects 产链切换（R-迁移主链+DOM 量测回退双路结构）：主链=
 *   pdf-item-geometry.itemSelectionGeometry（基线分组并块+归一化
 *   pixelBoxOf(textLayer) 同盒 INV-37+mergeRects 终裁；bands 同步切
 *   bandsFromItems——C5 禁 rect 项源×band DOM 量测混用）；锚定三元组仍产自
 *   selectionToAnchor（偏移/quote/prefix/suffix 零变，rects 字段切换来源——
 *   pending.anchor.rects 与 paint 同源=保存链与视觉同一来源，INV-58 前半）。
 *   **回退（三因）＝仅显示不入库（F-GEOM-01-G2 保存门）**：paint 照渲 DOM
 *   量测产物（视觉连续）+pending=null 无保存入口+warn 单源（itemChainFor 三因）
 * - **G2 降级门挂点**（active：真实健康页偏离率 0~0.12% 永不误伤，合成病理页
 *   复现时确实拦——「仅新增复现证据时启用」的落地形态）：拖选期抑制渲染
 *   （setPaint(null)）+mouseup 时刻 toast 拒绝（INV-02 禁静默；门一 W2 口径
 *   =fromMouseUp 门，对齐跨页拒绝形态——settle 防抖路径静默防拖选中途刷屏）
 * - **通道**：页项 {items,styles,geometry} 经 page-items.store（PagesOverlay
 *   写/本域 evaluate 时刻 getState 直读——zoom 现读、viewport 现构，项几何
 *   不随 zoom 缓存=缩放不变零重算）
 * - AnnotationLayer 重锚主链自 F-A8 门 2 起已项几何族（存量 rects S3b 回退
 *   +显式回退层语义=INV-58/档 2 登记）；本行旧「票外边界」自述随 G2 消除
 *   （设计书 §2.6 交互点 5）
 * - **[F-VISFB-53] 闪烁收口（统一快慢 effective boundary+同签名禁重复
 *   paint——W-4 三面）**：①统一=effectiveRangeOf（snapVisualBoundary 末行
 *   下方吸附+docOrderPair——visual 与 settle/mouseup 全量共用单源）——全量
 *   锚定经 rangeToAnchor（anchor-serialize 拆面）消费 eff 边界 Range，
 *   quote/paint/anchor 三通道同源；无标记命中形态 eff=raw 行为零变。乱序
 *   transform 形态下 raw 边界经 snapBlankBoundary('end') 栏分流可解到次行
 *   行首（丢行）=双几何交替源（d1 归因实证）。②同签名禁重复 paint=visual/
 *   settle 两路各自记录 canonical signature（52 号四元组域单源导出面
 *   canonicalSignatureOf/Equals）；同签名重复 selectionchange 零 paint 零
 *   校准重排；分路径缓存=同帧覆盖语义保持（full 首见恒执行——zoom 差分
 *   形态覆盖快帧）；fromMouseUp=true 恒执行（终局权威：跨页/G2 toast 门与
 *   工具条单一出口）。③失效点=save 清选区+mousedown 新会话（invalidate——
 *   52 回炉 B-1 纪隔离同精神，跨会话旧签名零残留）
 *
 * ── 接口层 ── / ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - export function createEvaluate(ctx)：工厂返回 {visual, full} 双路径闭包
 *   （ctx=组件状态写口+挂载盒+文献 id——纯函数域件零 React 依赖）；
 *   PaintSelection/PendingSelection 类型随迁（SelectionLayer 消费）
 * - [F-RDR-01 B] module-level 导出三函数 markAffinityShortcutFlushed/
 *   shouldSkipVisual/clearAffinityShortcut（S5 短路窗——SelectionLayer mouseup
 *   mark/mousedown clear 接线消费）+docOrderPair（eff 边界文档序定序纯函数
 *   ——W-4 回炉单测消费面）；A 吸附经 anchor-blank-snap.
 *   snapVisualBoundary（interact→anchors 方向既有）
 * - 依赖单向：本件→anchor-serialize/annotation-anchor/annotation-resolve/
 *   pdf-item-geometry/page-items.store/reader.store/selection-geometry（零环）
 * - probeTextLength 消费自 anchor-serialize 导出面单源（F-GEOM-01-G2 收敛，
 *   本域复刻已删）
 * - tests/unit/renderer/selection-layer.test.tsx（既有行为面——G2 起含页项桩
 *   〔对账表 A——回退态不挂工具条〕）+
 *   selection-item-chain.test.tsx（F-A6-b2 接线面）+selection-evaluate.test.tsx
 *   （F-A6-c 快慢等价/同帧覆盖/快路径守卫三锚）+selection-geometry.test.ts
 *   （调度器直测——rAF 合帧去重/防抖保持/cancel）
 */
import type { AnnotationRect } from '@shared/models/annotation'
import { showToast } from '../../../shared/ui/Toast'
import { probeTextLength, rangeToAnchor, type SelectionAnchor } from '../anchors/anchor-serialize'
import { findRangeAtOffset, fullTextOf, pixelBoxOf } from '../anchors/annotation-anchor'
import { bandsForTextNodes, type RowBand } from '../anchors/annotation-resolve'
import { calibrateBandsWithSpans } from '../anchors/annotation-band-calibrate'
import { snapVisualBoundary } from '../anchors/anchor-blank-snap'
import { clampScale, itemSelectionGeometry, reconcileItemsWithDom } from '../anchors/pdf-item-geometry'
import type { ItemSelectionGeometry } from '../anchors/pdf-item-geometry'
import { usePageItemsStore } from '../anchors/page-items.store'
import { useReaderStore } from '../state/reader.store'
import { canonicalSignatureEquals, canonicalSignatureOf, type CanonicalSignature } from './selection-drag-controller'
import { closestPageRoot, pageIndexOf, toolbarMountPos } from './selection-geometry'

/** 跨页/跨出页盒选区的拒绝提示（F-02 主控裁决：INV-02 可见，禁静默） */
const CROSS_PAGE_HINT = '选区跨页，不支持创建标注'

/** [F-A6-b2] G2 降级门拒绝提示（偏离率 ≥5%/右溢 >2px——异常 PDF 文本层几何；
 *  真实健康页 0~0.12% 永不触发，INV-02 禁静默） */
const GEOMETRY_REJECT_HINT = '选区几何异常，无法创建标注'

/** [F-RDR-01 B] S5 冗余重绘短路窗（毫秒）：mouseup 的 full(true) 已同帧渲染
 *  正确帧（S4），其后异步排队的 selectionchange→visual 属同态冗余重绘——
 *  visual 快路径对末行下方空白标记边界的几何差即「mouseup 后弹回闪烁」源。
 *  TTL 窗=S4 帧保持期（经验值 100ms；R1 校准条款：探针实测 selectionchange
 *  迟到 >100ms 时仅调本常量不动结构）。释放两径=TTL 到期兜底+mousedown 硬清 */
const AFFINITY_SHORTCUT_TTL_MS = 100

/** 短路基准时刻（null=窗口外/已清）。module-level：SelectionLayer→本件依赖
 *  方向既有（头注接口层），无反向依赖 */
let affinityFlushedAt: number | null = null

/** [F-RDR-01 B] S4 正确帧落地标记：mouseup 写回后、full(true) 前调用（恒等
 *  写回时 full 亦画正确帧——mark 无害，免缓存方案不设 prevFocus 快照） */
export function markAffinityShortcutFlushed(): void {
  affinityFlushedAt = performance.now()
}

/** [F-RDR-01 B] visual 入口短路判定：TTL 窗内（含 100ms 边界）→丢弃本次
 *  冗余重绘（保留 S4 帧，零绘制零 setPaint） */
export function shouldSkipVisual(): boolean {
  return affinityFlushedAt !== null && performance.now() - affinityFlushedAt <= AFFINITY_SHORTCUT_TTL_MS
}

/** [F-RDR-01 B] 短路窗硬清：mousedown（新拖选会话）时刻释放 */
export function clearAffinityShortcut(): void {
  affinityFlushedAt = null
}

/** [F-RDR-01 A] eff 边界文档序定序：anchor/focus 无向（snapVisualBoundary 双侧
 *  同钳位目标），而 probe 探测位 start/end 有向（文档序）——映回文档序
 *  （无吸附时与 range.start/end 同源同值=行为零变）。[W-4 回炉③] 包含关系
 *  （元素槽位边界 vs 其后代文本节点）compareDocumentPosition 只定节点树序
 *  不定槽位（祖先恒「先于」后代，槽位实际可在后代之后）——该形态经
 *  Range.compareBoundaryPoints 点对点精确比较；非包含态 FOLLOWING/PRECEDING
 *  即文档序（规范语义），同节点按 offset。导出面=W-4 回炉单测消费
 *  （纯函数域件，几何域函数导出同 selection-geometry 先例） */
export function docOrderPair(
  a: { node: Node; offset: number },
  b: { node: Node; offset: number }
): [{ node: Node; offset: number }, { node: Node; offset: number }] {
  if (a.node === b.node) {
    return a.offset <= b.offset ? [a, b] : [b, a]
  }
  const pos = a.node.compareDocumentPosition(b.node)
  if ((pos & (Node.DOCUMENT_POSITION_CONTAINS | Node.DOCUMENT_POSITION_CONTAINED_BY)) === 0) {
    return (pos & Node.DOCUMENT_POSITION_FOLLOWING) !== 0 ? [a, b] : [b, a]
  }
  // 包含形态：节点树序不定槽位——Range 点对点比较（jsdom/Chromium 同语义）
  const pa = document.createRange()
  pa.setStart(a.node, a.offset)
  pa.setEnd(a.node, a.offset)
  const pb = document.createRange()
  pb.setStart(b.node, b.offset)
  pb.setEnd(b.node, b.offset)
  return pa.compareBoundaryPoints(Range.START_TO_START, pb) <= 0 ? [a, b] : [b, a]
}

/** [F-A4 a 面] 自绘并集层状态（页盒+归并 rects+F-A5 行簇字形带；清除=层卸载） */
export interface PaintSelection {
  root: HTMLElement
  rects: AnnotationRect[]
  bands: RowBand[]
}

/** [F-VISFB-53] 统一快慢 effective boundary 的 eff 边界 Range（两路共用单源）：
 *  snapVisualBoundary 末行下方吸附（双侧，null=原始边界 fallback）→
 *  docOrderPair 文档序定序 → Range。visual 快路径与 settle/mouseup 全量锚定
 *  同消费本函数——快慢边界同源=闪烁根治主面（d1 归因：回退 DOM 家族+校准
 *  时机双几何交替——乱序 transform 形态下 raw 边界把行尾解到次行行首） */
function effectiveRangeOf(sel: Selection): Range {
  const aSnap = snapVisualBoundary(sel.anchorNode!, sel.anchorOffset, 'anchor')
  const fSnap = snapVisualBoundary(sel.focusNode!, sel.focusOffset, 'focus')
  const effAnchor = aSnap ?? { node: sel.anchorNode!, offset: sel.anchorOffset }
  const effFocus = fSnap ?? { node: sel.focusNode!, offset: sel.focusOffset }
  const [startB, endB] = docOrderPair(effAnchor, effFocus)
  const range = document.createRange()
  range.setStart(startB.node, startB.offset)
  range.setEnd(endB.node, endB.offset)
  return range
}

/** [回炉轮1 W2] 签名缓存槽位：真实签名 | 空选区 null | 未评估哨兵（三分） */
type SignatureSlot = CanonicalSignature | null | typeof UNEVALUATED

/** [回炉轮1 W2] 未评估哨兵（模块级唯一符号——恒不等任何真实签名含 null） */
const UNEVALUATED: unique symbol = Symbol('f-visfb-53-unevaluated')

/** 待确认的划选（锚定结果+选区所在页 0 基+工具条挂载盒本地落点） */
export interface PendingSelection {
  anchor: SelectionAnchor
  pageNo: number
  x: number
  y: number
}

/** evaluate 的组件状态写口（工厂 ctx——SelectionLayer 挂载 effect 在 pageRoot
 *  非空守卫后传入，故挂载盒类型收窄为非空） */
export interface EvaluateContext {
  pageRoot: HTMLElement
  paperId: string
  setPaint(p: PaintSelection | null): void
  setPending(p: PendingSelection | null): void
}

/** [F-A6-b2] 项几何链（R-迁移主链）：页项注册表按选区所在页动态取（evaluate
 *  时刻 getState 直读——zoom 现读/viewport 现构，项几何不随 zoom 缓存）。
 *  回退触发面（收敛后三因）：页项缺失/偏移对账失败/计算异常——null=回退
 *  DOM 量测链；回退不静默（console.warn——真实装配中 textLayer 在场蕴含
 *  注册表条目在场[同源]，warn 只在异常态出现） */
function itemChainFor(pageNo: number, paperId: string, start: number, end: number, textLayer: HTMLElement): ItemSelectionGeometry | null {
  const entry = usePageItemsStore.getState().pages[pageNo + 1]
  if (entry === undefined) {
    console.warn('[SelectionLayer] 项几何链回退：页项数据缺失（page-items 注册表无该页条目）')
    return null
  }
  if (!reconcileItemsWithDom(entry.text.items, fullTextOf(textLayer))) {
    console.warn('[SelectionLayer] 项几何链回退：偏移对账失败（items 拼接≠DOM 全文）')
    return null
  }
  try {
    const zoom = useReaderStore.getState().tabs[paperId]?.zoom ?? 1
    return itemSelectionGeometry({
      items: entry.text.items,
      styles: entry.text.styles,
      viewport: {
        scale: clampScale(zoom),
        rotate: entry.geometry.rotate,
        view: entry.geometry.view
      },
      start,
      end,
      base: pixelBoxOf(textLayer)
    })
  } catch (e) {
    console.warn('[SelectionLayer] 项几何链回退：计算异常', e)
    return null
  }
}

/** [F-A6-c] evaluate 双路径句柄：visual=拖选期快路径（rAF 帧点消费——项几何链
 *  直取 INV-58 后半）；full=settle/mouseup 全量（保存与最终视觉的单一权威）；
 *  invalidate=[F-VISFB-53] 签名缓存失效（save 清选区/mousedown 新会话——跨
 *  会话域零残留） */
export interface EvaluateHandle {
  visual(): void
  full(fromMouseUp: boolean): void
  invalidate(): void
}

/** evaluate 工厂：评估选区（动态锚定根）——快路径+四守卫+产链双路+G2 门+工具条落点 */
export function createEvaluate(ctx: EvaluateContext): EvaluateHandle {
  const { pageRoot, paperId, setPaint, setPending } = ctx

  // [F-VISFB-53] 同签名禁重复 paint（W-4）：visual/settle 两路各自记录已评估的
  // canonical signature（52 号四元组域单源）；同签名重复到达的 selectionchange
  // 零 paint 零校准重排。分路径缓存=同帧覆盖语义保持（zoom 差分形态 full 首见
  // 恒执行覆盖快帧）；fromMouseUp=true 恒执行（终局权威——跨页/G2 toast 门
  // 与工具条落地的单一出口）。
  // [回炉轮1 W2] 未评估哨兵（模块级唯一——永不等于任何真实签名含 null）：
  // null 双义修复——「尚未评估」与「空选区签名 null」分离，invalidate 后到达
  // 的空选区事件走守卫路径正常清 paint/pending（旧帧/旧工具条残留窗消除）
  let lastVisualSig: SignatureSlot = UNEVALUATED
  let lastFullSig: SignatureSlot = UNEVALUATED

  /** 命中判定：哨兵恒不命中（空选区 null 与未评估区分） */
  function absorbed(slot: SignatureSlot, sig: CanonicalSignature | null): boolean {
    return slot !== UNEVALUATED && canonicalSignatureEquals(slot, sig)
  }

  /** [F-A6-c] 快路径：项几何链直取。四道守卫前置（裁决 2-§5①）→轻量 probe→
   *  page-items.store 直读→项几何→setPaint；失败（probe/页项/对账/计算/退化
   * 区间）回退=全量视觉评估（evaluateCore(false,true)——DOM 量测回退链在位，
   * 不动 pending）。守卫与 G2 命中均 setPaint(null)（跨页/G2 拖选期静默——
   * toast 门=fromMouseUp 属全量路，S5/G2 既有形态）。
   * [F-RDR-01] 插桩序（终裁修正 1）：B 守卫在前（S5 短路——TTL 窗内直接
   * return 保留 S4 帧，零绘制）→四道守卫→A 吸附在后（末行下方 eff 边界
   * 替换原始边界进几何计算） */
  function visual(): void {
    // [F-RDR-01 B] S5 冗余重绘短路：TTL 窗（=S4 帧保持期）内直接丢弃——
    // 窗内 A 不执行=设计意图（S4 正确帧无需重算）
    if (shouldSkipVisual()) return
    // [F-VISFB-53] 同签名禁重复 paint：echo/重复事件同签名零重排
    // （[回炉轮1 W2] absorbed 哨兵判定——空选区 null 与未评估分离）
    const sig = canonicalSignatureOf(window.getSelection())
    if (absorbed(lastVisualSig, sig)) return
    lastVisualSig = sig
    const sel = window.getSelection()
    // 守卫 (i)：sel 空/rangeCount 0/坍缩
    if (sel === null || sel.rangeCount === 0 || sel.isCollapsed) {
      setPaint(null)
      return
    }
    // 守卫 (ii)：跨页/跨出页盒——静默收层（无守卫时跨页偏移会被归一化进单页
    // 项几何=新 D1 同族错乱源，裁决 2-§5① 强制条款）
    const anchorRoot = closestPageRoot(sel.anchorNode)
    const focusRoot = closestPageRoot(sel.focusNode)
    if (anchorRoot !== focusRoot) {
      setPaint(null)
      return
    }
    // 守卫 (iii)：页外/textLayer 缺
    const pageNo = anchorRoot === null ? null : pageIndexOf(anchorRoot)
    const textLayer = anchorRoot?.querySelector('.textLayer') as HTMLElement | null
    if (pageNo === null || textLayer === null) {
      setPaint(null)
      return
    }
    const range = sel.getRangeAt(0)
    // 守卫 (iv)：零宽盒（零文本/纯元素选区）
    const box = range.getBoundingClientRect()
    if (box.width === 0 && box.height === 0) {
      setPaint(null)
      return
    }
    // [F-RDR-01 A→F-VISFB-53] eff 边界（末行下方吸附+文档序定序——快慢共用
    // 单源 effectiveRangeOf）：替换原始边界进几何计算（空守卫 fallback=原始
    // 边界；双侧同钳位目标，方向对称由 docOrderPair 承担）
    const effRange = effectiveRangeOf(sel)
    // 轻量偏移 probe（Range.toString ×2 O(页文本)——join/quote/prefix/suffix
    // 切片与 rectsBetweenPoints/medianFontSize 全量几何量测链全省）
    const lead = probeTextLength(textLayer, effRange.startContainer, effRange.startOffset, 'start')
    const tail = lead === null ? null : probeTextLength(textLayer, effRange.endContainer, effRange.endOffset, 'end')
    const entry = usePageItemsStore.getState().pages[pageNo + 1]
    let item: ItemSelectionGeometry | null = null
    if (lead !== null && tail !== null && entry !== undefined) {
      const domText = fullTextOf(textLayer)
      if (reconcileItemsWithDom(entry.text.items, domText)) {
        const start = lead
        const end = domText.length - tail
        if (end > start) {
          try {
            const zoom = useReaderStore.getState().tabs[paperId]?.zoom ?? 1
            item = itemSelectionGeometry({
              items: entry.text.items,
              styles: entry.text.styles,
              viewport: { scale: clampScale(zoom), rotate: entry.geometry.rotate, view: entry.geometry.view },
              start,
              end,
              base: pixelBoxOf(textLayer)
            })
          } catch {
            item = null // 计算异常→回退（诊断单源=evaluateCore 链内 warn）
          }
        }
      }
    }
    if (item === null) {
      // 快路径失败→回退=全量视觉评估（层级声明见头注；不动 pending）
      evaluateCore(false, true)
      return
    }
    // G2 同门：拖选期抑制渲染（静默——拖选中途不刷屏，INV-02 只挂完成时刻）
    if (item.health.unhealthy) {
      setPaint(null)
      return
    }
    // [F-A9] 预览带垂直几何渲染时刻校准（方案 A——DOM span 盒实测；量测退化/
    // 窗不命中=派生 band 原样，img1 灰带偏移消）
    setPaint({ root: anchorRoot!, rects: item.rects, bands: calibrateBandsWithSpans(textLayer, item.bands, pixelBoxOf(textLayer)) })
  }

  /** 全量（settle/mouseup 路——现行逻辑零变，visualOnly 仅剩快路径回退一个活调用方）。
   *  [F-VISFB-53] settle 路（fromMouseUp=false）同签名幂等；mouseup 终局
   *  （fromMouseUp=true）恒执行 */
  function full(fromMouseUp: boolean): void {
    const sig = canonicalSignatureOf(window.getSelection())
    if (!fromMouseUp && absorbed(lastFullSig, sig)) return
    lastFullSig = sig
    // [回炉轮1 B→微回炉 W-1] 终局与 settle 两路完成后均同步 visual 签名缓存：
    // full 产物=该签名的权威渲染——mouseup 的 releaseAffinity/enforce 改写使终局
    // 签名 A≠拖选期 visual 已评估的 R 时（终局面），以及 S5 窗内改选 B 被
    // shouldSkipVisual 吞而 settle full(false) 完成 B 渲染时（settle 面，W-1），
    // 后续窗外同签名 echo 在 visual 路命中吸收（否则快路径重画覆盖权威帧、
    // settle 路又被 lastFullSig 吸收无法纠正）。复审论证无害：lastFullSig 本就
    // 独立记录、同步不致 full 首见自吸收（sig 读取在 absorbed 判定之后）
    lastVisualSig = sig
    evaluateCore(fromMouseUp, false)
  }

  /** [F-VISFB-53] 签名缓存失效：save 清选区时刻（SelectionLayer.save）与
   *  mousedown 新会话（selection-events——52 回炉 B-1 纪隔离同精神）；
   *  [回炉轮1 W2] 置未评估哨兵（非 null——invalidate 后空选区事件不被吞） */
  function invalidate(): void {
    lastVisualSig = UNEVALUATED
    lastFullSig = UNEVALUATED
  }

  function evaluateCore(fromMouseUp: boolean, visualOnly: boolean): void {
    const sel = window.getSelection()
    if (sel === null || sel.rangeCount === 0 || sel.isCollapsed) {
      if (!visualOnly) setPending(null)
      setPaint(null)
      return
    }
    const anchorRoot = closestPageRoot(sel.anchorNode)
    const focusRoot = closestPageRoot(sel.focusNode)
    if (anchorRoot !== focusRoot) {
      // 跨页/跨出页盒：不创建+toast（INV-02 禁静默——仅挂 mouseup 时刻，
      // 防抖路径静默防拖选中途刷屏）
      if (fromMouseUp) showToast(CROSS_PAGE_HINT, 'info')
      if (!visualOnly) setPending(null)
      setPaint(null)
      return
    }
    // 两边界同盒（同为 null=页外选区——静默收起，与页列无关）
    const pageNo = anchorRoot === null ? null : pageIndexOf(anchorRoot)
    const textLayer = anchorRoot?.querySelector('.textLayer') as HTMLElement | null
    // [F-VISFB-53] 统一快慢 effective boundary：全量锚定消费 eff 边界 Range
    // （effectiveRangeOf——与 visual 快路径同一吸附链）→ quote/paint/anchor
    // 三通道同源（双栏哨兵面）；无标记命中形态 eff=raw 边界（行为零变）
    const effRange = pageNo === null || textLayer === null ? null : effectiveRangeOf(sel)
    const anchor = effRange === null || textLayer === null ? null : rangeToAnchor(textLayer, effRange)
    // textLayer 非空由 anchor 非空蕴含——并列检查保留防御语义
    if (anchor === null || textLayer === null) {
      if (!visualOnly) setPending(null)
      setPaint(null)
      return
    }
    const box = sel.getRangeAt(0).getBoundingClientRect()
    if (box.width === 0 && box.height === 0) {
      if (!visualOnly) setPending(null)
      setPaint(null)
      return
    }
    // [F-A6-b2] rects 产链切换：项几何链为主（R-迁移）——rects/bands 同由项
    // 声明几何+styles 派生（C5）；失败（null）回退现行 DOM 量测链原样
    // （rects=anchor.rects[mLR 链]、bands=[F-A5 a/b] 节点口径——选区自身
    // textNodes，免疫 CSS 行盒整体偏移错绑上一行；退化空数组=行盒原样回退）
    const item = itemChainFor(pageNo!, paperId, anchor.start, anchor.end, textLayer)
    if (item !== null && item.health.unhealthy) {
      // G2 降级门（active——头注声明）：拖选期抑制渲染；toast 门=fromMouseUp
      // （门一 W2 口径——对齐跨页拒绝既有形态：settle 防抖路径静默防拖选中途
      // 刷屏，完成时刻可见=INV-02；pending 清面保持 !visualOnly 不动）
      setPaint(null)
      if (!visualOnly) setPending(null)
      if (fromMouseUp) showToast(GEOMETRY_REJECT_HINT, 'info')
      return
    }
    if (item !== null) {
      // [F-A9] 同 visual 快路径——预览带渲染时刻校准（快慢两路同款=INV-58 快慢等价保持）
      setPaint({ root: anchorRoot!, rects: item.rects, bands: calibrateBandsWithSpans(textLayer, item.bands, pixelBoxOf(textLayer)) })
    } else {
      // [F-GEOM-01-G2 保存门] item 链失败＝仅显示不入库（设计书 §2.4）：paint 照渲
      // DOM 回退形状（视觉连续）；pending=null 不挂工具条＝无保存入口（「所见≠所存
      // 时不给保存入口」）；诊断单源＝itemChainFor 三因 warn（零新增 warn 位）
      const range = findRangeAtOffset(textLayer, anchor.start, anchor.end)
      setPaint({ root: anchorRoot!, rects: anchor.rects, bands: range !== null ? bandsForTextNodes(range.textNodes.map((t) => t.node), pixelBoxOf(textLayer)) : [] })
      if (!visualOnly) setPending(null)
      return
    }
    if (visualOnly) {
      return
    }
    // [F-A4 c 面] 工具条挂载盒本地落点（翻转+夹取+÷有效 zoom——geometry 域）；
    // [F-A6-b2] pending.anchor.rects 切项几何链产物=保存链与视觉同一来源
    // （save() 落库 rects 即 pending.anchor.rects——INV-58 前半；G2 保存门后本段
    // 仅项链成功可达——pending.anchor.rects 恒为项族形状）
    const { x, y } = toolbarMountPos(pageRoot, { x: box.x, y: box.y, width: box.width, height: box.height })
    setPending({ anchor: { ...anchor, rects: item.rects }, pageNo: pageNo!, x, y })
  }

  return { visual, full, invalidate }
}
