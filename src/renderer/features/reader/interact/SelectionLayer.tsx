// b3: P7-F
/**
 * [SR-RDR-05] SelectionLayer —— 文本选择→定位器（工单：done / weak，依赖 anchor-serialize——F-ARCH4 拆件后经其间接消费 annotation-anchor）
 *
 * **F-02 四层多页化收口（动态锚定根；注册文件=anchor-locate.ts）**：锚定根=
 * 选区 anchorNode/focusNode 向上最近页盒（纯函数页盒遍历，selection-geometry），
 * 挂载盒≠选区所在页仍正确；选区态状态机：无选区→页内选区→工具条操作→清；
 * 跨页/跨出页盒→不创建+toast（mouseup 时刻，INV-02 禁静默；防抖路径静默防
 * 拖选中途刷屏）；选区所在页回收/文本层重建（zoom 同机制）→选区清→层与
 * 工具条收（防悬空锚）；页外选区静默收起。确认后 selectionToAnchor→落库
 * （保存页=0 基动态推导）→onSaved 刷新层；保存成功随清。
 *
 * **F-A4 划选视觉=自绘并集层（ADR-0019 R1 修订——取代历史原生路线，
 * 修订依据=票面 §0a 用户根治令）**：SelectionPaint（selection-paint.tsx，
 * portal 进选区所在页盒，z2 灰 0.20 在标注 multiply 层之下——R2-F-10 观感
 * 保持）渲染 evaluate 管线归并产物（与保存 rects 同源，所见即所存）；::
 * selection 转 transparent（text-layer.css）。层随**选区**真清除而消失
 * （INV-37 修订：Escape 只清 pending/工具条）。工具条定位 [c 面]：视口差值
 * ÷有效 zoom 归一到挂载盒本地+滚动容器可视区夹取+选区近顶下翻转
 * （selection-geometry 纯函数——修 ui-scale≠1 双重放大+偏远缺陷）。层叠序
 * 完整推演见 selection-paint.tsx 头注。
 *
 * **F-A6-b2 rects 产链切换（R-迁移主链+DOM 量测回退双路结构）**：evaluate
 * 域整体拆 selection-evaluate.ts（组件 ≤250 行红线触发——票面预判条款）：
 * 项几何链为主（pdf-item-geometry——基线分组并块+归一化同盒 INV-37+
 * mergeRects 终裁；bands 同源派生 C5；通道=page-items.store 单源注册表、
 * zoom 现读/viewport 现构）；回退三因走现行 DOM 量测链原样兜底+warn 不
 * 静默；G2 降级门 active（拖选期抑制渲染+mouseup 时刻 toast 拒绝——INV-02）。
 * pending.anchor.rects 与 paint 同源=保存链与视觉同一来源（INV-58 前半）。
 * 详见 selection-evaluate.ts 头注。
 *
 * **F-A6-c D2 调度与快路径（rAF 对齐）**：视觉路=首事件即排 rAF+帧内合帧
 * 去重（60Hz 上限——D2a 5Hz 步进根治）+快路径 evaluateVisual（项几何链直取
 * INV-58 后半——gBCR/Range.gBCR 残余两项绝对量在场：详见 selection-evaluate.ts
 * 头注+裁决表 §12）；settle 路=防抖 200ms 与 mouseup 即时全量逐字保持；四道
 * 守卫/跨页 toast/工具条语义零变。**AnnotationLayer 存量重锚域仍 DOM 量测域
 * ——INV-58 票外边界，同族化/域间换算守卫=独立票（门二 seam_ruling 在档）**。
 *
 * **F-A12 划选释放点浅探 affinity（事件层重定向）**：mouseup 真划选（位移≥3px
 * ——程序化零触）且释放点在 focus 行上方间隙、更近上一视觉行 → focus 经
 * release-affinity.releaseAffinity 重定向上一行行尾（锚定侧原样）后 evaluate.full
 * 同帧照常（G2 文本位下探——完整判据/时间线=release-affinity.ts 头注）。
 *
 * **F-VISFB-52 指针授权拖选（态空间/探针结论=selection-drag-controller.ts 头注）**：
 * mousedown 记锚栏（authorizeColumnSpan——中缝/零栏不启动）/mousemove 只写 ref/
 * selectionchange 门（自写回声抑制——canonical signature 精确匹配）/mouseup
 * enforce×2+endSession；visual 与 full 共读 window selection（共用单源）。
 *
 * **F-VISFB-53 闪烁收口（闸①拆件前置）**：事件接线段（selectionchange/
 * mousedown/mouseup/keydown 四监听+evaluate/scheduler/dragCtl 组装）整体迁
 * selection-events.ts（wireSelectionEvents——249/250 行临界拆件，零行为变更）；
 * 本件保留=组件态+save 域+渲染。闪烁根治面（统一快慢 effective boundary+
 * 同签名禁重复 paint）在 selection-evaluate.ts 域件——见其头注 F-VISFB-53 段。
 *
 * ── 接口层 ── / ── 架构层 ──
 * - props 形状不变=挂载位契约零改；closestPageRoot/pageIndexOf 经本文件再导出
 *   （实现在 selection-geometry）；锚定根=选区所在页盒内 .textLayer 动态获取；
 *   annotation-anchor 仍是唯一 DOM 遍历点；工具条/自绘层落点以页盒为参照系
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - mouseup 即时、防抖兜底（程序化选选不触发 mouseup）；翻页/换文献/卸载
 *   收起退订。测试：selection-layer/paint/item-chain.test+selection-layer-f52
 *   （F-VISFB-52 接线面）+selection-flicker.test（F-VISFB-53 闪烁收口面）。
 */
import { useEffect, useRef, useState } from 'react'
import type { Annotation, AnnotationInput, AnnotationKind } from '@shared/models/annotation'
import { api, unwrap, ApiClientError } from '../../../api/client'
import { showToast } from '../../../shared/ui/Toast'
import { pushUndo } from '../state/annotation-undo'
import type { PaintSelection, PendingSelection } from './selection-evaluate'
import { SelectionToolbar } from './SelectionToolbar'
import { SelectionPaint } from './selection-paint'
import { wireSelectionEvents, type SelectionEventsHandle } from './selection-events'
import { useReaderStore } from '../state/reader.store'
import { quitWriteBlocked } from '../../../app/quit-closing-gate'

// 纯函数页盒遍历（F-02）在 selection-geometry.ts——F-A4 拆件，导出面经本文件再导出（票面 §2）
export { closestPageRoot, pageIndexOf } from './selection-geometry'

/** 意外异常（非 ApiClientError）时的兜底中文消息 */
const SAVE_FAILED = '标注保存失败'

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
  // [F-VISFB-53] 事件接线域件句柄（save 侧失效口消费——闸①拆件后 effect 外可达）
  const eventsRef = useRef<SelectionEventsHandle | null>(null)

  useEffect(() => {
    if (pageRoot === null) return
    const events = wireSelectionEvents({ pageRoot, paperId, setPaint, setPending, toolbarRef })
    eventsRef.current = events
    return () => {
      eventsRef.current = null
      events.dispose()
    }
    // 依赖=挂载盒+文献（F-02：page 不再参与——锚定根动态；挂载盒引用变化已覆盖锚定页切换重挂清理）
  }, [pageRoot, paperId])

  /** 按当前色+kind 落库（page=选区所在页 0 基——F-02）；成功后清选区刷新 store */
  async function save(kind: AnnotationKind): Promise<void> {
    // [F-VISFB-64·轮2 W-r1-03] closing gate：create 链用户命令入口（设计 §④
    // 「标注增删改」字面——冻结期拒绝零 api，选区保持）
    if (pending === null || busy || quitWriteBlocked()) return
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
      // [F-VISFB-53] 保存清选区=签名缓存失效（同段再选不被旧签名吞——B4 锚）
      eventsRef.current?.invalidate()
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
