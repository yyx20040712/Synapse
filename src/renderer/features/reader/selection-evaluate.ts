/**
 * [F-A6-b2] selection-evaluate —— 划选评估域件（自 SelectionLayer 拆出——组件
 * ≤250 行红线触发[票面预判条款：通道接线使其超行则拆本件]；设计书 §5.1 本有
 * 此件=F-A6-c 快/慢路径宿主，本票提前拆出=evaluate 函数域净迁移+项几何链
 * 切换，行为面经 selection-layer/selection-item-chain 测试锁）。
 *
 * ── 行为层 ──
 * - evaluate(fromMouseUp, visualOnly)：四道收敛守卫（选区空/跨页/页外不可锚定/
 *   零宽盒→setPaint(null)）→ 锚定（selectionToAnchor 三元组）→ [F-A6-b2] rects
 *   产链双路（项几何主链+DOM 量测回退，见下）→ setPaint → 非 visualOnly 时
 *   工具条落点（toolbarMountPos）+setPending
 * - visualOnly=[B1 回炉] 拖选期节流路径——只更新自绘层不动 pending（弹出语义
 *   独属防抖/mouseup 全量评估，零变）
 * - **F-A6-b2 rects 产链切换（R-迁移主链+DOM 量测回退双路结构）**：主链=
 *   pdf-item-geometry.itemSelectionGeometry（基线分组并块+归一化
 *   pixelBoxOf(textLayer) 同盒 INV-37+mergeRects 终裁；bands 同步切
 *   bandsFromItems——C5 禁 rect 项源×band DOM 量测混用）；锚定三元组仍产自
 *   selectionToAnchor（偏移/quote/prefix/suffix 零变，rects 字段切换来源——
 *   pending.anchor.rects 与 paint 同源=保存链与视觉同一来源，INV-58 前半）。
 *   **回退路径**（页项缺失/偏移对账失败/计算异常三因，触发面收敛）：现行 DOM
 *   量测链原样兜底（rects=anchor.rects[mLR 链]+bands=bandsForTextNodes 节点
 *   口径）——回退不静默（console.warn+paint 层照渲零功能损失）
 * - **G2 降级门挂点**（active：真实健康页偏离率 0~0.12% 永不误伤，合成病理页
 *   复现时确实拦——「仅新增复现证据时启用」的落地形态）：拖选期抑制渲染
 *   （setPaint(null)）+mouseup 时刻 toast 拒绝（INV-02 禁静默；门一 W2 口径
 *   =fromMouseUp 门，对齐跨页拒绝形态——settle 防抖路径静默防拖选中途刷屏）
 * - **通道**：页项 {items,styles,geometry} 经 page-items.store（PagesOverlay
 *   写/本域 evaluate 时刻 getState 直读——zoom 现读、viewport 现构，项几何
 *   不随 zoom 缓存=缩放不变零重算）
 *
 * ── 接口层 ── / ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - export function createEvaluate(ctx)：工厂返回 evaluate 闭包（ctx=组件
 *   状态写口+挂载盒+文献 id——纯函数域件零 React 依赖）；PaintSelection/
 *   PendingSelection 类型随迁（SelectionLayer 消费）
 * - 依赖单向：本件→anchor-serialize/annotation-anchor/annotation-resolve/
 *   pdf-item-geometry/page-items.store/reader.store/selection-geometry（零环）
 * - F-A6-c 增量预告：evaluateVisual/evaluateFull 双路径拆分宿主在此
 * - tests/unit/renderer/selection-layer.test.tsx（既有行为面）+
 *   selection-item-chain.test.tsx（F-A6-b2 接线面六用例）
 */
import type { AnnotationRect } from '@shared/models/annotation'
import { showToast } from '../../shared/ui/Toast'
import { selectionToAnchor, type SelectionAnchor } from './anchor-serialize'
import { findRangeAtOffset, fullTextOf, pixelBoxOf } from './annotation-anchor'
import { bandsForTextNodes, type RowBand } from './annotation-resolve'
import { itemSelectionGeometry, reconcileItemsWithDom } from './pdf-item-geometry'
import type { ItemSelectionGeometry } from './pdf-item-geometry'
import { usePageItemsStore } from './page-items.store'
import { useReaderStore } from './reader.store'
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
        scale: Math.min(3, Math.max(0.5, zoom)),
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

/** evaluate 工厂：评估选区（动态锚定根）——四守卫+产链双路+G2 门+工具条落点 */
export function createEvaluate(ctx: EvaluateContext): (fromMouseUp: boolean, visualOnly: boolean) => void {
  const { pageRoot, paperId, setPaint, setPending } = ctx
  return (fromMouseUp: boolean, visualOnly: boolean): void => {
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
      setPaint({ root: anchorRoot!, rects: item.rects, bands: item.bands })
    } else {
      const range = findRangeAtOffset(textLayer, anchor.start, anchor.end)
      setPaint({ root: anchorRoot!, rects: anchor.rects, bands: range !== null ? bandsForTextNodes(range.textNodes.map((t) => t.node), pixelBoxOf(textLayer)) : [] })
    }
    if (visualOnly) {
      return
    }
    // [F-A4 c 面] 工具条挂载盒本地落点（翻转+夹取+÷有效 zoom——geometry 域）；
    // [F-A6-b2] pending.anchor.rects 切项几何链产物=保存链与视觉同一来源
    // （save() 落库 rects 即 pending.anchor.rects——INV-58 前半）
    const { x, y } = toolbarMountPos(pageRoot, { x: box.x, y: box.y, width: box.width, height: box.height })
    setPending({ anchor: item !== null ? { ...anchor, rects: item.rects } : anchor, pageNo: pageNo!, x, y })
  }
}
