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
 *
 * ── 接口层 ── / ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - export function createEvaluate(ctx)：工厂返回 {visual, full} 双路径闭包
 *   （ctx=组件状态写口+挂载盒+文献 id——纯函数域件零 React 依赖）；
 *   PaintSelection/PendingSelection 类型随迁（SelectionLayer 消费）
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
import { probeTextLength, selectionToAnchor, type SelectionAnchor } from '../anchors/anchor-serialize'
import { findRangeAtOffset, fullTextOf, pixelBoxOf } from '../anchors/annotation-anchor'
import { bandsForTextNodes, type RowBand } from '../anchors/annotation-resolve'
import { calibrateBandsWithSpans } from '../anchors/annotation-band-calibrate'
import { clampScale, itemSelectionGeometry, reconcileItemsWithDom } from '../anchors/pdf-item-geometry'
import type { ItemSelectionGeometry } from '../anchors/pdf-item-geometry'
import { usePageItemsStore } from '../anchors/page-items.store'
import { useReaderStore } from '../state/reader.store'
import { closestPageRoot, pageIndexOf, toolbarMountPos } from './selection-geometry'

/** 跨页/跨出页盒选区的拒绝提示（F-02 主控裁决：INV-02 可见，禁静默） */
const CROSS_PAGE_HINT = '选区跨页，不支持创建标注'

/** [F-A6-b2] G2 降级门拒绝提示（偏离率 ≥5%/右溢 >2px——异常 PDF 文本层几何；
 *  真实健康页 0~0.12% 永不触发，INV-02 禁静默） */
const GEOMETRY_REJECT_HINT = '选区几何异常，无法创建标注'

/** [F-A4 a 面] 自绘并集层状态（页盒+归并 rects+F-A5 行簇字形带；清除=层卸载） */
export interface PaintSelection {
  root: HTMLElement
  rects: AnnotationRect[]
  bands: RowBand[]
}

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
 *  直取 INV-58 后半）；full=settle/mouseup 全量（保存与最终视觉的单一权威） */
export interface EvaluateHandle {
  visual(): void
  full(fromMouseUp: boolean): void
}

/** evaluate 工厂：评估选区（动态锚定根）——快路径+四守卫+产链双路+G2 门+工具条落点 */
export function createEvaluate(ctx: EvaluateContext): EvaluateHandle {
  const { pageRoot, paperId, setPaint, setPending } = ctx

  /** [F-A6-c] 快路径：项几何链直取。四道守卫前置（裁决 2-§5①）→轻量 probe→
   *  page-items.store 直读→项几何→setPaint；失败（probe/页项/对账/计算/退化
   *  区间）回退=全量视觉评估（evaluateCore(false,true)——DOM 量测回退链在位，
   *  不动 pending）。守卫与 G2 命中均 setPaint(null)（跨页/G2 拖选期静默——
   *  toast 门=fromMouseUp 属全量路，S5/G2 既有形态） */
  function visual(): void {
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
    // 轻量偏移 probe（Range.toString ×2 O(页文本)——join/quote/prefix/suffix
    // 切片与 rectsBetweenPoints/medianFontSize 全量几何量测链全省）
    const lead = probeTextLength(textLayer, range.startContainer, range.startOffset, 'start')
    const tail = lead === null ? null : probeTextLength(textLayer, range.endContainer, range.endOffset, 'end')
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

  /** 全量（settle/mouseup 路——现行逻辑零变，visualOnly 仅剩快路径回退一个活调用方） */
  function full(fromMouseUp: boolean): void {
    evaluateCore(fromMouseUp, false)
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
    const anchor = pageNo === null || textLayer === null ? null : selectionToAnchor(textLayer, sel)
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

  return { visual, full }
}
