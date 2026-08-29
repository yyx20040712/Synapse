// b3: P7-F
/**
 * [SR-RDR-05] SelectionLayer —— 文本选择→定位器（工单：done / weak，依赖 annotation-anchor）
 *
 * **F-02 四层多页化收口（工单 open / strong；注册文件=anchor-locate.ts，本文件
 *   为主改面，短式引用口径）——动态锚定根**
 *
 * **F-08 划选视觉=原生 ::selection（工单 open / strong；ADR-0019——R1 路线
 *   落地，取代 SR2-F-07 自绘层）**：拖选全程由浏览器原生 ::selection 提供即时
 *   视觉反馈（text-layer.css 已回官方 rgba(0 0 255 / 0.25) 半透明——canvas
 *   字形透出可读）；mouseup/防抖 evaluate 链仅驱动工具条（≤1.5s 预算，L7）。
 *   自绘选区块（SelectionRects）整体删除——复测站 3 证伪自绘路线（30% accent
 *   合成 rgb(191,207,220) 近乎不可见+拖选期零反馈）。
 * 层叠序（同一 stacking context 内比较——挂载盒/页盒/页框均无 z-index，各
 * 绝对定位层直达公共根）：canvas 字形(非定位，最底) < .textLayer(z-index:0，
 * 自成 stacking context，span 内 z-index:1) < AnnotationLayer(z-index:5,
 * multiply——荧光笔语义) < AiAnnotationLayer(z-index:5，F-07 已去 multiply，
 * 同值 DOM 后绘在上) < 工具条(z-10)。
 *
 * ── 行为层 ──
 * - 监听 selectionchange（200ms 防抖）与 mouseup（即时）：锚定根=选区
 *   anchorNode/focusNode 向上最近页盒（纯函数页盒遍历）——挂载盒（F-01 锚定
 *   页盒落位）≠选区所在页仍正确（F-01 自裁 4 中间态解除）；选区态状态机：
 *   无选区→页内选区→工具条操作→清；跨页/跨出页盒→不创建+toast（mouseup 时刻，
 *   INV-02 禁静默；防抖路径静默防拖选中途刷屏）；选区所在页回收/文本层重建
 *   （zoom 同机制）→选区清→工具条收（防悬空锚）；滚动中选区保持=evaluate
 *   每次动态重找锚定根（跟随选区非固定页）；页外选区（侧栏等）静默收起
 * - 确认后经 annotation-anchor.selectionToAnchor 生成锚定三元组 → 落库（保存页=
 *   pending.pageNo 选区所在页 0 基动态推导，rects.page 同）→ onSaved 刷新层
 *
 * ── 接口层 ── / ── 架构层 ──
 * - props 形状不变=挂载位契约零改（page 不再作锚定/保存页——由动态锚定取代）；
 *   export closestPageRoot(node)（向上最近页盒）/pageIndexOf(root)（1 基→0 基）。
 *   锚定根=选区所在页盒内 .textLayer 动态获取；annotation-anchor 仍是唯一 DOM
 *   遍历点；工具条落点以选区所在页盒为参照系（夹取经页盒 rect——N-C 防层叠
 *   污染），再换算到挂载盒渲染（页列垂直排列页间偏移稳定）
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - mouseup 即时、防抖兜底（程序化选选不触发 mouseup）；翻页/换文献/卸载收起
 *   退订。组件测试：tests/unit/renderer/selection-layer.test.tsx；e2e：
 *   reader-text.spec 后半（F-02 批 2 守卫）
 */
import { useEffect, useRef, useState } from 'react'
import type { Annotation, AnnotationInput, AnnotationKind } from '@shared/models/annotation'
import { api, unwrap, ApiClientError } from '../../api/client'
import { showToast } from '../../shared/ui/Toast'
import { selectionToAnchor, type SelectionAnchor } from './annotation-anchor'
import { pushUndo } from './annotation-undo'
import { SelectionToolbar } from './SelectionToolbar'
import { useReaderStore } from './reader.store'

/** 意外异常（非 ApiClientError）时的兜底中文消息 */
const SAVE_FAILED = '标注保存失败'

/** 跨页/跨出页盒选区的拒绝提示（F-02 主控裁决：INV-02 可见，禁静默） */
const CROSS_PAGE_HINT = '选区跨页，不支持创建标注'

/** 工具条定位：估算宽度（水平夹取）与选区上方留白 */
const TOOLBAR_WIDTH = 180
const TOOLBAR_ABOVE = 42

/** selectionchange 防抖窗口（毫秒） */
const SELECTION_DEBOUNCE_MS = 200

/** F-02：节点向上最近页盒（[data-page-root] 元素——页列渲染窗内页才有；
 *  锚定根动态遍历的纯函数，测试直测） */
export function closestPageRoot(node: Node | null): HTMLElement | null {
  let cur: Node | null = node
  while (cur !== null) {
    if (cur instanceof HTMLElement && cur.hasAttribute('data-page-root')) {
      return cur
    }
    cur = cur.parentNode
  }
  return null
}

/** F-02：页盒页号（data-page-root 值 1 基→0 基页码；缺失/非法值 null） */
export function pageIndexOf(root: HTMLElement): number | null {
  const no = Number(root.getAttribute('data-page-root'))
  return Number.isInteger(no) && no >= 1 ? no - 1 : null
}

/** 待确认的划选（锚定结果 + 选区所在页 0 基 + 工具条相对挂载盒的落点） */
interface PendingSelection {
  anchor: SelectionAnchor
  pageNo: number
  x: number
  y: number
}

export function SelectionLayer(props: {
  pageRoot: HTMLElement | null
  paperId: string
  page: number
  onSaved: (a: Annotation) => void
}): JSX.Element | null {
  const { pageRoot, paperId, onSaved } = props
  const [pending, setPending] = useState<PendingSelection | null>(null)
  const [busy, setBusy] = useState(false)
  // per-tab 选择器（TABS-01）：颜色取 active tab（无 tab 时回退默认黄）
  const color = useReaderStore((s) => s.tabs[s.activeId ?? '']?.color ?? 'yellow')
  const setColor = useReaderStore((s) => s.setColor)
  const toolbarRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (pageRoot === null) return
    let timer: number | null = null

    /** 评估当前选区（F-02 动态锚定根）：选区所在页盒内锚定；跨页拒绝
     *  （mouseup 提示）；页外/不可锚定/零宽选区静默收起 */
    const evaluate = (fromMouseUp: boolean): void => {
      const sel = window.getSelection()
      if (sel === null || sel.rangeCount === 0 || sel.isCollapsed) {
        setPending(null)
        return
      }
      const anchorRoot = closestPageRoot(sel.anchorNode)
      const focusRoot = closestPageRoot(sel.focusNode)
      if (anchorRoot !== focusRoot) {
        // 跨页/跨出页盒：不创建+toast（主控裁决，INV-02 禁静默——仅挂用户完成
        // 拖选的 mouseup 时刻，防抖路径静默防拖选中途刷屏）
        if (fromMouseUp) showToast(CROSS_PAGE_HINT, 'info')
        setPending(null)
        return
      }
      // 两边界同盒（同为 null=页外选区——静默收起，与页列无关）
      const pageNo = anchorRoot === null ? null : pageIndexOf(anchorRoot)
      const textLayer = anchorRoot?.querySelector('.textLayer') as HTMLElement | null
      const anchor = pageNo === null || textLayer === null ? null : selectionToAnchor(textLayer, sel)
      // textLayer 非空由 anchor 非空蕴含——并列检查保留防御语义（F-08 起无几何消费方）
      if (anchor === null || textLayer === null) {
        setPending(null)
        return
      }
      const box = sel.getRangeAt(0).getBoundingClientRect()
      if (box.width === 0 && box.height === 0) {
        setPending(null)
        return
      }
      // 落点以选区所在页盒为参照系（N-C：夹取经页盒 rect 防层叠污染），再换算
      // 到挂载盒（组件渲染容器——页列垂直排列页间偏移布局稳定）
      const selBox = anchorRoot!.getBoundingClientRect()
      const mountBox = pageRoot.getBoundingClientRect()
      const x = Math.min(Math.max(box.x - selBox.x, 0), Math.max(selBox.width - TOOLBAR_WIDTH, 0)) + (selBox.x - mountBox.x)
      const y = Math.max(box.y - selBox.y - TOOLBAR_ABOVE, 0) + (selBox.y - mountBox.y)
      setPending({ anchor, pageNo: pageNo!, x, y })
    }

    const onSelectionChange = (): void => {
      if (timer !== null) window.clearTimeout(timer)
      timer = window.setTimeout(() => evaluate(false), SELECTION_DEBOUNCE_MS)
    }
    const onMouseUp = (e: MouseEvent): void => {
      // 工具条自身的 mouseup 不评估（按钮 mousedown 已阻止选区坍缩，交由 click 处理）
      if (e.target instanceof Node && toolbarRef.current?.contains(e.target) === true) return
      if (timer !== null) {
        window.clearTimeout(timer)
        timer = null
      }
      evaluate(true)
    }
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setPending(null)
    }

    document.addEventListener('selectionchange', onSelectionChange)
    document.addEventListener('mouseup', onMouseUp)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange)
      document.removeEventListener('mouseup', onMouseUp)
      document.removeEventListener('keydown', onKeyDown)
      if (timer !== null) window.clearTimeout(timer)
      setPending(null)
    }
    // 依赖=挂载盒+文献（F-02：page 不再参与——锚定根动态；挂载盒引用变化
    // 已覆盖锚定页切换的重挂清理语义）
  }, [pageRoot, paperId])

  /** 按当前色 + 指定 kind 落库（page=选区所在页 0 基动态推导——F-02）；
   *  成功后清选区并经 onSaved 交由父级刷新 store */
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
      window.getSelection()?.removeAllRanges()
    } catch (e) {
      // 保存失败：tab 灰点置位（失败残留可见——TABS-03 两写面之一）
      useReaderStore.getState().markTabDirty(paperId)
      showToast(e instanceof ApiClientError ? e.message : SAVE_FAILED, 'error')
    } finally {
      setBusy(false)
    }
  }

  if (pending === null) return null

  return (
    // 划选视觉=原生 ::selection（头注 F-08/ADR-0019）——本组件只渲染工具条
    <SelectionToolbar
      containerRef={toolbarRef}
      x={pending.x}
      y={pending.y}
      busy={busy}
      color={color}
      onColor={setColor}
      onSave={(kind) => void save(kind)}
    />
  )
}
