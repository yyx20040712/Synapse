// b3: P7-F
/**
 * [SR-RDR-05] SelectionLayer —— 文本选择→定位器（工单：done / weak，依赖 anchor-serialize——F-ARCH4 拆件后经其间接消费 annotation-anchor）
 *
 * **F-02 四层多页化收口（动态锚定根；注册文件=anchor-locate.ts）**：锚定根=
 * 选区 anchorNode/focusNode 向上最近页盒（纯函数页盒遍历，selection-geometry），
 * 挂载盒≠选区所在页仍正确；选区态状态机：无选区→页内选区→工具条操作→清；
 * 跨页/跨出页盒→不创建+toast（mouseup 时刻，INV-02 禁静默；防抖路径静默防
 * 拖选中途刷屏）；选区所在页回收/文本层重建（zoom 同机制）→选区清→层与
 * 工具条收（防悬空锚）；页外选区静默收起。确认后经
 * anchor-serialize.selectionToAnchor 生成锚定三元组→落库（保存页=选区所在页
 * 0 基动态推导）→onSaved 刷新层；保存成功 removeAllRanges+层随清。
 *
 * **F-A4 划选视觉=自绘并集层（ADR-0019 R1 修订——取代历史原生路线，
 * 修订依据=票面 §0a 用户根治令）**：SelectionPaint（selection-paint.tsx，
 * portal 进选区所在页盒，z2 灰 0.20 在标注 multiply 层之下——R2-F-10 观感
 * 保持）渲染 evaluate 管线归并产物（与保存 rects 同源，所见即所存）；::
 * selection 转 transparent（text-layer.css）。当年删自绘两病根已解（拖选
 * 零反馈→selectionchange 200ms 防抖路径在场；accent 近不可见→观感灰在案）。
 * 层随**选区**真清除而消失（INV-37 修订：Escape 只清 pending/工具条）。
 * 工具条定位 [c 面]：视口差值÷有效 zoom（localScale）归一到挂载盒本地+
 * 滚动容器可视区夹取+选区近顶下翻转（selection-geometry 纯函数——修
 * ui-scale≠1 双重放大+偏远缺陷）。层叠序完整推演见 selection-paint.tsx 头注。
 *
 * ── 接口层 ── / ── 架构层 ──
 * - props 形状不变=挂载位契约零改；closestPageRoot/pageIndexOf 经本文件再
 *   导出（实现在 selection-geometry——F-A4 拆件，导出面零变）。锚定根=
 *   选区所在页盒内 .textLayer 动态获取；annotation-anchor 仍是唯一 DOM
 *   遍历点；工具条/自绘层落点以选区所在页盒为参照系（N-C 防层叠污染）
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - mouseup 即时、防抖兜底（程序化选选不触发 mouseup）；翻页/换文献/卸载
 *   收起退订。测试：selection-layer/selection-paint.test（F-A4 三面）
 */
import { useEffect, useRef, useState } from 'react'
import type { Annotation, AnnotationInput, AnnotationKind, AnnotationRect } from '@shared/models/annotation'
import { api, unwrap, ApiClientError } from '../../api/client'
import { showToast } from '../../shared/ui/Toast'
import { selectionToAnchor, type SelectionAnchor } from './anchor-serialize'
import { findRangeAtOffset, pixelBoxOf } from './annotation-anchor'
import { bandsForTextNodes, type RowBand } from './annotation-resolve'
import { pushUndo } from './annotation-undo'
import { SelectionToolbar } from './SelectionToolbar'
import { SelectionPaint } from './selection-paint'
import { closestPageRoot, pageIndexOf, toolbarMountPos, createVisualScheduler } from './selection-geometry'
import { useReaderStore } from './reader.store'

// 纯函数页盒遍历（F-02）在 selection-geometry.ts——F-A4 拆件，导出面经本文件再导出（票面 §2）
export { closestPageRoot, pageIndexOf } from './selection-geometry'

/** 意外异常（非 ApiClientError）时的兜底中文消息 */
const SAVE_FAILED = '标注保存失败'

/** 跨页/跨出页盒选区的拒绝提示（F-02 主控裁决：INV-02 可见，禁静默） */
const CROSS_PAGE_HINT = '选区跨页，不支持创建标注'

/** selectionchange 窗口（毫秒）：自绘层节流与工具条防抖同值两路（B1） */
const SELECTION_DEBOUNCE_MS = 200

/** F-12 工具条误触发阈值（px）：位移小于此值=单击/双击（含选词）不出条
 *  （用户令「一点就出选项条」；无 mousedown 记录的程序化/键盘选区不设限） */
const DRAG_SELECT_THRESHOLD_PX = 3

/** 待确认的划选（锚定结果+选区所在页 0 基+工具条挂载盒本地落点） */
interface PendingSelection {
  anchor: SelectionAnchor
  pageNo: number
  x: number
  y: number
}

/** [F-A4 a 面] 自绘并集层状态（页盒+归并 rects+F-A5 行簇字形带；清除=层卸载） */
interface PaintSelection {
  root: HTMLElement
  rects: AnnotationRect[]
  bands: RowBand[]
}

export function SelectionLayer(props: {
  pageRoot: HTMLElement | null
  paperId: string
  page: number
  onSaved: (a: Annotation) => void
}): JSX.Element | null {
  const { pageRoot, paperId, onSaved } = props
  const [pending, setPending] = useState<PendingSelection | null>(null)
  const [paint, setPaint] = useState<PaintSelection | null>(null)
  const [busy, setBusy] = useState(false)
  // per-tab 选择器（TABS-01）：active tab 颜色（无 tab 回退默认黄）
  const color = useReaderStore((s) => s.tabs[s.activeId ?? '']?.color ?? 'yellow')
  const setColor = useReaderStore((s) => s.setColor)
  const toolbarRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (pageRoot === null) return

    /** 评估选区（动态锚定根）：页内锚定；跨页拒绝（mouseup 提示）；页外/不可锚定/零宽静默收（层随清）。
     *  visualOnly=[B1 回炉] 拖选期节流路径——只更新自绘层（视觉反馈），不动
     *  pending（工具条弹出语义独属防抖/mouseup 全量评估，零变） */
    const evaluate = (fromMouseUp: boolean, visualOnly: boolean): void => {
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
      // [F-A4 a] 自绘并集层=保存 rects 同源；[F-A5 a/b] bands=行簇字形带
      // **节点口径**（选区自身 textNodes——免疫 CSS 行盒整体偏移错绑上一行，
      // 真机实锤小字号紧排文档行盒偏上 ~9px）；退化空数组=行盒原样回退
      const range = findRangeAtOffset(textLayer, anchor.start, anchor.end)
      setPaint({ root: anchorRoot!, rects: anchor.rects, bands: range !== null ? bandsForTextNodes(range.textNodes.map((t) => t.node), pixelBoxOf(textLayer)) : [] })
      if (visualOnly) {
        return
      }
      // [F-A4 c 面] 工具条挂载盒本地落点（翻转+夹取+÷有效 zoom——geometry 域）
      const { x, y } = toolbarMountPos(pageRoot, { x: box.x, y: box.y, width: box.width, height: box.height })
      setPending({ anchor, pageNo: pageNo!, x, y })
    }

    // [B1 回炉] selectionchange 双路调度（selection-geometry 域工厂）：自绘层
    // =leading+trailing 节流（拖选期持续触发下纯防抖永不落地=历史删自绘轮
    // 的零反馈病根复活，ADR-0019 R1 修订档）；工具条评估=防抖（弹出语义零变）
    const scheduler = createVisualScheduler({
      onVisual: () => evaluate(false, true),
      onSettled: () => evaluate(false, false),
      windowMs: SELECTION_DEBOUNCE_MS
    })
    // F-12：记录最近一次 mousedown 落点（NaN=无记录——程序化事件/未捕获）
    let downX = Number.NaN
    let downY = Number.NaN
    const onMouseDown = (e: MouseEvent): void => {
      ;[downX, downY] = [e.clientX, e.clientY]
    }

    const onMouseUp = (e: MouseEvent): void => {
      // 工具条自身的 mouseup 不评估（按钮 mousedown 已阻止选区坍缩，交由 click 处理）
      if (e.target instanceof Node && toolbarRef.current?.contains(e.target) === true) return
      scheduler.cancel()
      // F-12：位移过小=单击/双击误触不出条（自绘层留待防抖路径随选区坍缩清除）
      if (Number.isFinite(downX)) {
        const moved = Math.hypot(e.clientX - downX, e.clientY - downY)
        downX = downY = Number.NaN
        if (moved < DRAG_SELECT_THRESHOLD_PX) {
          setPending(null)
          return
        }
      }
      evaluate(true, false)
    }
    const onKeyDown = (e: KeyboardEvent): void => {
      // INV-37（F-A4 修订）：Escape 只清组件态；自绘层随**选区**真清除而消失
      if (e.key === 'Escape') setPending(null)
    }

    document.addEventListener('selectionchange', scheduler.handler)
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('mouseup', onMouseUp)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('selectionchange', scheduler.handler)
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('mouseup', onMouseUp)
      document.removeEventListener('keydown', onKeyDown)
      scheduler.cancel()
      setPending(null)
      setPaint(null)
    }
    // 依赖=挂载盒+文献（F-02：page 不再参与——锚定根动态；挂载盒引用变化
    // 已覆盖锚定页切换的重挂清理语义）
  }, [pageRoot, paperId])

  /** 按当前色+kind 落库（page=选区所在页 0 基——F-02）；成功后清选区刷新 store */
  async function save(kind: AnnotationKind): Promise<void> {
    if (pending === null || busy) return
    const input: AnnotationInput = {
      page: pending.pageNo, kind, color,
      quoteText: pending.anchor.quote, prefixText: pending.anchor.prefix,
      suffixText: pending.anchor.suffix, startOffset: pending.anchor.start,
      endOffset: pending.anchor.end,
      rects: pending.anchor.rects.map((r) => ({ ...r, page: pending.pageNo })),
      comment: ''
    }
    setBusy(true)
    try {
      const saved = await unwrap(api.reader.saveAnnotation({ paperId, annotation: input }))
      onSaved(saved)
      // 撤销栈：create 逆=delete（UNDO-01 成功路径入栈）
      pushUndo(paperId, { kind: 'create', annotation: saved })
      // 保存落地即清除该面灰点（TABS-03 乐观清除语义）
      useReaderStore.getState().clearTabDirty(paperId)
      setPending(null)
      // 自绘层随本次 removeAllRanges 同步清除（不等防抖）
      setPaint(null)
      window.getSelection()?.removeAllRanges()
    } catch (e) {
      // 保存失败：tab 灰点置位（失败残留可见——TABS-03 两写面之一）
      useReaderStore.getState().markTabDirty(paperId)
      showToast(e instanceof ApiClientError ? e.message : SAVE_FAILED, 'error')
    } finally {
      setBusy(false)
    }
  }

  if (pending === null && paint === null) return null

  return (
    <>
      {/* 划选视觉=自绘并集层（F-A4/ADR-0019 R1 修订+F-A5 band 对齐——头注）；生命周期=选区 */}
      {paint !== null ? <SelectionPaint root={paint.root} rects={paint.rects} bands={paint.bands} /> : null}
      {pending !== null ? (
        <SelectionToolbar
          containerRef={toolbarRef}
          x={pending.x}
          y={pending.y}
          busy={busy}
          color={color}
          onColor={setColor}
          onSave={(kind) => void save(kind)}
        />
      ) : null}
    </>
  )
}
