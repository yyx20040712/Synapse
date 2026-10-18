// b3: P7-H
/**
 * [F-LGRAPH-01②U3] useDrawLine —— 画线子态机 hook（mockup §2.4 定案；
 * [F-UIRES-03 C1] anchor 维增补+per-kind 色——设计稿 v1.9 §2 C1）。
 *
 * ── 态空间（宪法状态纪律——[F-VISFB-66] 钉定模型 v1.2 §A.1 终裁版）──
 * armed=工具态（view.tool ∈ {draw-solid, draw-dashed}——驻 view.store，页面
 * 内持久：切 select/切模式/切图中止=resetTool 承载）× drag ∈ {idle, dragging}
 * × {from: 源锚, cursor: 指针 own 域点, snap: 吸附命中锚}。
 * from 按下钉定 {cardId, anchor:AnchorRef, pt} **恒定**（[F-ANCHFIX-01 批 1b
 * 规则锚 morph 面随「仅端点钉定，走线仍自动」裁定删除——裁决 D 翻案：
 * 两端锚用户钉定，预览不 morph）；snap=nearestAnchor 命中**他卡**锚（own 域
 * ≤DRAW_SNAP_R——snap 即所按的锚本身（不经路由规则选锚函数）；落边端点=按下锚/
 * 命中锚=所见即所得结构性成立）。[F-VISFB-66 裁定 2] 点两卡连边链（C1/C2·P5
 * 点两卡链锚态族与点卡路由）整体退役删除——唯一建边径=锚点显式拖拽。
 *
 * ── 迁移表（§2.4 逐条+C1 增补）──
 * - armed+pointerdown 近锚（12 锚/卡 ±12 own 单位——[lnfix1] 6→12 容差放宽）
 *   → dragging（预览线+吸附指示
 *   ——**document 级拖拽会话**（[回炉 R1①]
 *   pointermove/up/pointercancel+window blur——use-edge-edit runDragSession
 *   先例：指针离画布仍跟随，中断=取消无残留）
 * - dragging+pointerup 落另一卡近锚 → 建边（drawEdge：manual+dashed=
 *   (tool==='draw-dashed')+color=currentLineColor[kind] **提交时读**（C1
 *   latch delta-W4——在途 DrawPreview 跟随当前色，已落边不可变）+label=当前
 *   色行名快照 P-14）→ idle（**tool 保持 draw-X 连画**——[F-VISFB-21 C2]
 *   §2.4「建边后回 select」旧文偏差，任务书 21 票面裁 2026-10-16：与点两卡
 *   径一致；自环/查重拒绝路径同样不拆工具；退出径=小手钮/Esc/切模式沿承）
 *   +入撤销栈（收尾带 armed 闸[回炉 R1③]——工具已非画线不建边）
 * - [C1] armed+点卡 A（卡身 click——非近锚拖拽域）→ anchor=picked(A)（**禁开
 *   [F-VISFB-66 裁定 2] 点两卡连边链（旧锚态族）退役删除——draw 工具
 *   =纯拖拽工具，点击卡=吞咽（B1a：不 pickCard 不开详情）
 * - dragging+pointerup 空白/同卡 → 取消 → idle（**armed 保留**——tool 不动）；
 *   [lnfix1] 落空分层反馈：落点命中他卡 rect 外扩 DRAW_SNAP_R 膨胀圈（排除源
 *   卡——同卡面沿承静默）=error toast「落点未在连接点上」；空白=静默取消
 * - [lnfix1] armed 待机锚点指示（hint 通道）：armed+idle 时 document
 *   pointermove 数学命中最近锚（≤DRAW_SNAP_R——与可起拖判定同一数学，所见即
 *   可拖）驱动 DrawAnchorHint 渲染；leading 节流 50ms（禁每 move 全卡 rect 采集）
 * - dragging 期 **Esc/pointercancel=取消会话且工具保持**（[回炉 R19 终裁]
 *   ——会话内一次性 keydown capture+IME 守卫+stopImmediatePropagation 封同
 *   目标 document 监听（S4——stopPropagation 不封同目标，防全局退工具）；
 *   原 F10「Esc 零监听」事实基础不完整〔全局 escapeStep 会退工具〕已翻案）。
 * - 切模式/切 select/切图下降沿：dragging 中止=取消（[回炉 R1②] effect 监听
 *   tool/mode/folderId 三源——会话监听同步拆除）；旧锚维同沿清承载已随点两
 *   卡链路退役消亡（本 hook 零锚读写）。
 * - UI 预检（现行语义沿承）：同卡近邻=自环不建；同端点对无向查重=toast 拒绝；
 *   环检测留 service 保存面（CONFLICT 丢弃+toast）
 * - 拖拽抑制：dragging 会话收尾（pointerup 落定/取消）→ 下一 click 吞（防建
 *   边后误触发卡选中；abort 中断不吞——无后续 click）
 * - [回炉 R13] 近锚 pointerdown 消费即 stopPropagation（防 pan 等容器级
 *   并行激活）
 * - [RR 补批 RR17] 多指针重入 phase 闸：dragging 中第二 pointerdown（触屏
 *   二指/笔）忽略（已消费不覆盖会话）+document 会话事件 pointerId 绑定
 *   （他指 move/up/pointercancel 不驱动不收尾不取消本会话——首指 up 正常
 *   收尾；pid 缺省=鼠标/jsdom MouseEvent 型放行）
 *
 * 坐标域：own 域（指针 clientXY−content rect 原点后 ÷s_eff——[F-VISFB-31]
 * 00A 三域律；缩放正交。指针与卡 rect 同律换算=域内自洽保持）。纯几何单源
 * 复用 routing/anchors（anchorPoint+Pt/Rect）。jsdom/测试经 DOM rect mock 驱动。
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { RefObject } from 'react'
import { LINE_TYPE_COLORS } from '@shared/models/lineage'
import { anchorPoint, type Pt, type Rect, type Side } from './routing/anchors'
import { clientToOwnPt, clientToOwnRect } from './timeline-zoom'
import { startAutoScroll, type AutoScrollHandle } from './drag-autoscroll'
import { showToast } from '../../shared/ui/toast-store'
import { useLineageStore } from './lineage.store'
import { useLineageViewStore } from './lineage-view.store'

/** 吸附半径（own 单位——§2.4 近锚；[lnfix1] 6→12：±6 用户实检过严） */
export const DRAW_SNAP_R = 12

/** [lnfix1] armed 待机 hint 扫描节流窗（ms——leading 即时+窗口内丢弃；禁每
 *  move 全卡 rect 采集：50ms 上限采样，rect 近实时=「所见即可拖」偏差极小） */
const HINT_THROTTLE_MS = 50

export interface DrawAnchor {
  nodeId: string
  pt: Pt
  /** [F-VISFB-66] 命中锚身份（side/slot——拖拽双锚载荷源；hint/snap 同形） */
  anchor: { side: Side; slot: number }
}

export interface DrawLineState {
  phase: 'idle' | 'dragging'
  from: DrawAnchor | null
  cursor: Pt | null
  snap: DrawAnchor | null
}

/** 卡 rect 采集（.tl-card[data-node-id] getBoundingClientRect→own 域；
 *  [②U7→F-VISFB-31] 经 ÷s_eff 换算（视口 rect 含 z·u 双缩放——own 域与
 *  DRAW_SNAP_R/预览 SVG 用户单位同系；指针与 rect 同律换算=域内自洽保持
 *  〔00A B↔B 自消律的 C↔C 承接——单侧回退 ÷z 即破〕） */
function cardRects(content: HTMLElement): Array<{ nodeId: string; rect: Rect }> {
  const base = content.getBoundingClientRect()
  const out: Array<{ nodeId: string; rect: Rect }> = []
  for (const el of Array.from(content.querySelectorAll<HTMLElement>('.tl-card[data-node-id]'))) {
    const r = el.getBoundingClientRect()
    out.push({ nodeId: el.dataset.nodeId ?? '', rect: clientToOwnRect(r, base) })
  }
  return out
}

/** 指针→own 域（[②U7→F-VISFB-31] ÷s_eff——与 cardRects 同律） */
function toContentPt(content: HTMLElement, clientX: number, clientY: number): Pt {
  const base = content.getBoundingClientRect()
  return clientToOwnPt(base, clientX, clientY)
}

/** 全图 12 锚最近命中（≤DRAW_SNAP_R）——[side,slot] 遍历取距离最近者 */
function nearestAnchor(
  cards: Array<{ nodeId: string; rect: Rect }>,
  p: Pt,
  excludeNodeId?: string
): DrawAnchor | null {
  let best: DrawAnchor | null = null
  let bestD = DRAW_SNAP_R
  const sides: Side[] = ['top', 'bottom', 'left', 'right']
  for (const { nodeId, rect } of cards) {
    if (excludeNodeId !== undefined && nodeId === excludeNodeId) continue
    for (const side of sides) {
      for (let slot = 0; slot <= 2; slot++) {
        const a = anchorPoint(rect, side, slot)
        const d = Math.hypot(a.x - p.x, a.y - p.y)
        if (d <= bestD) {
          bestD = d
          best = { nodeId, pt: a, anchor: { side, slot } }
        }
      }
    }
  }
  return best
}

export function useDrawLine(args: {
  contentRef: RefObject<HTMLDivElement | null>
}): {
  state: DrawLineState
  /** [lnfix1] armed 待机最近锚指示（idle 态 document move 数学命中——DrawAnchorHint 渲染源） */
  hint: DrawAnchor | null
  /** .tl-content pointerdown（draw 态消费；返回 true=已消费——容器不分发拖拽） */
  handlePointerDown(ev: ReactPointerEvent<HTMLDivElement>): boolean
  /** dragging 收尾后的 click 抑制（一次性——防建边触发卡选中） */
  consumeClickSuppress(): boolean
} {
  const [state, setState] = useState<DrawLineState>({ phase: 'idle', from: null, cursor: null, snap: null })
  const [hint, setHint] = useState<DrawAnchor | null>(null)
  const suppressClickRef = useRef(false)
  const stateRef = useRef(state)
  stateRef.current = state
  /** 拖拽会话监听拆除句柄（下降沿/卸载清理共用——[回炉 R1②]） */
  const sessionCleanupRef = useRef<() => void>(() => undefined)

  const armed = (): boolean => {
    const tool = useLineageViewStore.getState().tool
    return tool === 'draw-solid' || tool === 'draw-dashed'
  }

  const cancel = useCallback((): void => {
    setState({ phase: 'idle', from: null, cursor: null, snap: null })
  }, [])

  // [回炉 R1②] 下降沿清理：切模式/切 select/切图（tool/mode/folderId 任一变化）
  // =dragging 中止（取消无残留+会话监听拆除）
  const tool = useLineageViewStore((s) => s.tool)
  const mode = useLineageViewStore((s) => s.mode)
  const folderId = useLineageStore((s) => s.folderId)
  const armedNow = tool === 'draw-solid' || tool === 'draw-dashed'
  useEffect(() => {
    if (stateRef.current.phase === 'dragging') {
      sessionCleanupRef.current()
      cancel()
      return
    }
  }, [tool, mode, folderId, cancel, armedNow])

  // [lnfix1] armed 待机锚点指示：armed+idle 时 document pointermove 数学命中
  // 最近锚（nearestAnchor 与可起拖判定同一数学——所见即可拖，不引入第二容差）。
  // 性能=leading 节流 50ms（窗口内 move 丢弃）：禁每 move 全卡 getBoundingClientRect
  // 采集（use-edge-edit RR8 重采集键先例的轻量替代——useDrawLine 无布局变化
  // 信号源，节流保 rect 近实时且零新接缝；down 判定仍走实时 cardRects 不受节流）
  // [RR1-2a] trailing 补发：窗内被丢的 move 记 pending 位，窗尾（50ms）补算一次
  // ——窗口续期（新 move 重置 timer）：持续移动不补发、停驻 50ms 后 hint=停驻位，
  // leading 与 trailing 双沿保「停驻位=hint 位」一致；cleanup 清 timer 防泄漏
  useEffect(() => {
    if (!armedNow || state.phase === 'dragging') return
    let lastAt = 0
    let pendingTimer: ReturnType<typeof setTimeout> | null = null
    let pendingPt: { clientX: number; clientY: number } | null = null
    const compute = (clientX: number, clientY: number): void => {
      const c = args.contentRef.current
      if (c === null) return
      const hit = nearestAnchor(cardRects(c), toContentPt(c, clientX, clientY))
      setHint((prev) => (prev?.nodeId === hit?.nodeId && prev?.pt.x === hit?.pt.x && prev?.pt.y === hit?.pt.y ? prev : hit))
    }
    const clearPending = (): void => {
      if (pendingTimer !== null) {
        clearTimeout(pendingTimer)
        pendingTimer = null
      }
      pendingPt = null
    }
    const onMove = (ev: PointerEvent | MouseEvent): void => {
      const now = performance.now()
      if (now - lastAt < HINT_THROTTLE_MS) {
        pendingPt = { clientX: ev.clientX, clientY: ev.clientY }
        if (pendingTimer !== null) clearTimeout(pendingTimer)
        pendingTimer = setTimeout(() => {
          pendingTimer = null
          const p = pendingPt
          pendingPt = null
          if (p === null) return
          lastAt = performance.now()
          compute(p.clientX, p.clientY)
        }, HINT_THROTTLE_MS)
        return
      }
      lastAt = now
      clearPending()
      compute(ev.clientX, ev.clientY)
    }
    document.addEventListener('pointermove', onMove)
    return () => {
      document.removeEventListener('pointermove', onMove)
      clearPending()
      setHint(null)
    }
  }, [armedNow, state.phase, args.contentRef])

  // 卸载清理（会话监听不越界驻留）
  useEffect(() => () => sessionCleanupRef.current(), [])

  // [RR4] suppress 旗同手势消费：document click capture 一次性——落点无论
  // 卡/空白皆就地消费（原仅卡点击点消费=click 落非卡面时旗残留吞下一次卡
  // 点击）；画布内落点止泡（防建边误选卡语义沿承），画布外（工具组等）仅
  // 消费不拦（e2e 保存钮点击不受抑）
  useEffect(() => {
    const onCapture = (ev: MouseEvent): void => {
      if (!suppressClickRef.current) return
      suppressClickRef.current = false
      const t = ev.target
      if (t instanceof Element && t.closest('.tl-content') !== null) ev.stopPropagation()
    }
    document.addEventListener('click', onCapture, { capture: true })
    return () => document.removeEventListener('click', onCapture, { capture: true })
  }, [])

  /** 建边收尾（document pointerup——armed 闸+同卡/空白取消+查重预检） */
  const finish = useCallback(
    (clientX: number, clientY: number): void => {
      const from = stateRef.current.from
      suppressClickRef.current = true // click 抑制（一次性）
      setState({ phase: 'idle', from: null, cursor: null, snap: null })
      if (!armed()) return // [回炉 R1③/S6=U-DL-11] armed 闸：收尾时工具已非画线=不建边
      if (from === null) return
      const content = args.contentRef.current
      if (content === null) return
      const p = toContentPt(content, clientX, clientY)
      const cards = cardRects(content)
      const target = nearestAnchor(cards, p, from.nodeId)
      if (target === null) {
        // [lnfix1] 落空分层反馈：命中他卡 rect 外扩 DRAW_SNAP_R 膨胀圈（排除
        // 源卡——同卡面沿承静默）=error toast；空白=静默取消（负锚沿承）
        const nearCard = cards.some((c) => {
          if (c.nodeId === from.nodeId) return false
          const r = c.rect
          return (
            p.x >= r.x - DRAW_SNAP_R &&
            p.x <= r.x + r.w + DRAW_SNAP_R &&
            p.y >= r.y - DRAW_SNAP_R &&
            p.y <= r.y + r.h + DRAW_SNAP_R
          )
        })
        if (nearCard) showToast('落点未在连接点上，未创建连线', 'error')
        // [RR1-2b] 收尾补算（取消路径）：up 后指针未动 hint 立即恢复——同卡锚
        // 取消时恢复源卡锚位（nearestAnchor 无 exclude——指示面=可起拖全域）。
        // 建边路径不补：[F-VISFB-21 C2] 建边后 armed 保持→hint 监听仍驻留，
        // 下一 pointermove 自行恢复（此处写入=冗余）
        setHint(nearestAnchor(cards, p))
        return
      }
      // 同卡自环面已由 excludeNodeId 排除（target≠from 卡）；查重单点=store
      // drawEdge 结果枚举（§C.3——duplicate 由本层 toast）
      const view = useLineageViewStore.getState()
      // [F-UIRES-03 C1] per-kind 色：kind=当前工具维，color=currentLineColor[kind]
      // **提交时读**（latch delta-W4——在途预览跟随当前色，已落边不可变）
      const kind: 'solid' | 'dashed' = view.tool === 'draw-dashed' ? 'dashed' : 'solid'
      const color = view.currentLineColor[kind]
      const colorIndex = LINE_TYPE_COLORS.indexOf(color as (typeof LINE_TYPE_COLORS)[number])
      const label = useLineageStore.getState().lineTypeNames[colorIndex === -1 ? 0 : colorIndex] ?? ''
      const result = useLineageStore.getState().drawEdge(from.nodeId, target.nodeId, {
        dashed: kind === 'dashed',
        color,
        label,
        // [F-VISFB-66 裁定 ①] 双锚钉定载荷：按下锚=fromAnchor/落点锚=toAnchor
        fromAnchor: { side: from.anchor.side, slot: from.anchor.slot as 0 | 1 | 2 },
        toAnchor: { side: target.anchor.side, slot: target.anchor.slot as 0 | 1 | 2 }
      })
      // [回炉 S3] 三分支：duplicate=重复文案；busy=saving 窄窗静默（连画态
      //  立即重画即成——主控裁定，toast 噪声不值）
      if (!result.ok && result.reason === 'duplicate') showToast('两节点间已存在连线', 'error')
      // [F-VISFB-21 C2] 建边后 tool 保持 draw-X 连画（§2.4「建边后回 select」
      // 旧文偏差——任务书 21 票面裁 2026-10-16；自环已由 excludeNodeId 排除/
      // 查重拒绝路径同样不拆工具——退出径=小手钮/Esc/切模式沿承）
    },
    [args.contentRef]
  )

  const handlePointerDown = useCallback(
    (ev: ReactPointerEvent<HTMLDivElement>): boolean => {
      if (!armed() || ev.button !== 0) return false
      // [RR 补批 RR17] 多指针重入 phase 闸：dragging 中第二指忽略——返回
      // true=已消费（不覆盖会话不触发容器拖拽；首指 up 正常收尾）
      if (stateRef.current.phase === 'dragging') {
        ev.stopPropagation() // [RRB5] 消费即止泡（R13 先例对齐——防容器级并行激活）
        return true
      }
      const content = args.contentRef.current
      if (content === null) return false
      const p = toContentPt(content, ev.clientX, ev.clientY)
      const hit = nearestAnchor(cardRects(content), p)
      if (hit === null) return false
      ev.preventDefault()
      ev.stopPropagation() // [回炉 R13] 消费即止泡（防 pan 等并行激活）
      // [F-VISFB-66] from 按下钉定恒定（含锚身份——建边双锚载荷源）
      setState({ phase: 'dragging', from: hit, cursor: p, snap: null })
      // [RR 补批 RR17] 会话指针绑定：他指事件（pointerId 异于会话主指）不
      // 驱动不收尾不取消；pid 缺省（鼠标/jsdom MouseEvent 型）放行
      const pid = ev.pointerId
      const sameSession = (e: PointerEvent | MouseEvent): boolean => {
        const id = (e as PointerEvent).pointerId
        return id === undefined || id === pid
      }
      // [回炉 R1①] document 级拖拽会话（runDragSession 先例）：move/up 在
      // document 派发（指针离画布仍跟随）；pointercancel/blur=中断取消无残留
      // [F-VISFB-66 裁定 4] 帧协议③④重算单源（move 与自动滚动 onScrollFrame
      // 同路——幂等：光标缓存 client→own 域重算+命中→预览）
      const recompute = (clientX: number, clientY: number): void => {
        const s = stateRef.current
        if (s.phase !== 'dragging') return
        const c = args.contentRef.current
        if (c === null) return
        const pt = toContentPt(c, clientX, clientY)
        const cards = cardRects(c)
        // snap=nearestAnchor 命中他卡锚（own 域——snap 即所按锚本身；未命中=
        // snap null（cursor 跟随沿承）；from 恒定不重算
        const snap = nearestAnchor(cards, pt, s.from?.nodeId)
        setState({ ...s, cursor: pt, snap })
      }
      let lastClient = { x: ev.clientX, y: ev.clientY }
      const move = (e: PointerEvent | MouseEvent): void => {
        if (!sameSession(e)) return // [RR17] 他指 move 忽略
        lastClient = { x: e.clientX, y: e.clientY }
        recompute(e.clientX, e.clientY)
      }
      const up = (e: PointerEvent | MouseEvent): void => {
        if (!sameSession(e)) return // [RR17] 他指 up 不收尾本会话
        cleanup()
        finish(e.clientX, e.clientY)
      }
      const abort = (e: Event): void => {
        if (!sameSession(e as PointerEvent | MouseEvent)) return // [RR17] 他指 cancel 不取消
        cleanup()
        cancel() // [回炉 R1④] 中断=取消无残留（不吞后续 click）
      }
      // [F-VISFB-66 裁定 4] 拖拽自动滚动（managed 泵——容器=.timeline 根；
      // onScrollFrame=帧协议③④重算：滚动时光标内容域坐标随滚动偏移，rAF 帧
      // 重算命中——getCursorClient 读缓存光标）
      // R26：容器获取统一 closest('.timeline')（滚动容器单源）
      const container = content.closest('.timeline') instanceof HTMLElement ? (content.closest('.timeline') as HTMLElement) : content
      const autoScroll: AutoScrollHandle = startAutoScroll({
        container,
        getCursorClient: () => ({ clientX: lastClient.x, clientY: lastClient.y }), // 按下即真坐标采样（R1——恒有效）
        onScrollFrame: () => recompute(lastClient.x, lastClient.y)
      })
      // [回炉 R19] 会话内一次性 Esc（capture 先于单口；IME 守卫；消费即
      // stopPropagation 防全局退工具——取消会话且 tool 保持）
      const onSessionEsc = (e: KeyboardEvent): void => {
        if (e.key !== 'Escape' || e.isComposing) return
        // [回炉 S4] stopImmediatePropagation：封同目标 document 捕获监听
        // （stopPropagation 只断传播链，同节点后续监听仍触发）
        e.stopImmediatePropagation()
        cleanup()
        cancel()
      }
      const cleanup = (): void => {
        document.removeEventListener('pointermove', move)
        document.removeEventListener('pointerup', up)
        document.removeEventListener('pointercancel', abort)
        window.removeEventListener('blur', abort)
        document.removeEventListener('keydown', onSessionEsc, { capture: true } as EventListenerOptions)
        autoScroll.stop()
      }
      document.addEventListener('pointermove', move)
      document.addEventListener('pointerup', up)
      document.addEventListener('pointercancel', abort)
      window.addEventListener('blur', abort)
      document.addEventListener('keydown', onSessionEsc, { capture: true } as EventListenerOptions)
      sessionCleanupRef.current = cleanup
      return true
    },
    [args.contentRef, finish, cancel]
  )

  const consumeClickSuppress = useCallback((): boolean => {
    const v = suppressClickRef.current
    suppressClickRef.current = false
    return v
  }, [])

  return { state, hint, handlePointerDown, consumeClickSuppress }
}
