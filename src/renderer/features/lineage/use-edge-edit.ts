/**
 * [F-LGRAPH-01②U5] useEdgeEdit —— 手动调线编辑态状态机（mockup §2.5/§3.6；
 * 编辑代数=edge-edit.ts 纯函数单源）。
 *
 * ── 态空间（宪法状态纪律）──
 * idle → selected（单击线）→ dragging{vertex|segment}（pointerdown 手柄/段）
 * → selected（pointerup 落定=一编辑单元 setEdgeVia）；selected → reconnect
 * （拖端点圆柄——via 保留+L 重正交预览）→ selected（换端 reconnectEdge/同卡
 * setEdgeVia）；点空白/Esc/切模式/切图=idle（收尾转移 W-5）。
 *
 * - dragging 中断（pointercancel/指针移出画布失焦）=abort：via 回拖前定态
 *   不入撤销栈（[RR2] pointercancel 接 abort——§2.5 定案中断=不成立）；
 *   reconnect 中断=端点回原锚。
 * - [RR 补批 RR13] no-op 短路对称语义（R19 先例）：reconnect 落点==拖始锚
 *   +拖放 commit via 等值（回原位）=零编辑单元（不 beginUnit 不 dirty 不入队）。
 * - 自动线（无 via）拖段/加点=物化首 via（routed pts 内点）转 manual-override。
 * - 磁吸±6（先横后竖取近）+穿卡警示（PAD=4）=dragging/selected 渲染态零持久化。
 * - 右键反馈：pointerdown(button=2) 命中对象瞬选（线=selected 高亮+手柄集），
 *   菜单开期间保持、关闭即撤（selectedViaMenu → closeMenu 即 idle）。
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { LineageViaPoint } from '@shared/models/lineage'
import type { Pt, Rect, Side } from './routing/anchors'
import { selectAnchor } from './routing/anchors'
import type { RoutedPath } from './lineage-routing'
import {
  addPointOnSegment,
  channelSnap,
  crossCardSegments,
  dragVertex,
  reconnectEnd,
  segmentDrag,
  segmentViaIdx,
  viaEquals,
  type EditPolyline
} from './edge-edit'
import { nearestAnchorCard, channelsFrom, nearestSegmentIdx } from './edge-edit-geom'
import { runDocDragSession } from './edge-drag-session'
import { useLineageStore } from './lineage.store'
import { contentScale, toContentPt } from './timeline-zoom'
import type { EdgeMenuTarget } from './EdgeMenu'

export type EdgeEditState =
  | { phase: 'idle' }
  | { phase: 'selected'; edgeId: string }
  | {
      phase: 'dragging'
      edgeId: string
      kind: 'vertex' | 'segment'
      idx: number
      startVia: LineageViaPoint[]
      workVia: LineageViaPoint[]
      startPt: Pt
      snap: { axis: 'h' | 'v'; line: number } | null
    }
  | {
      phase: 'reconnect'
      edgeId: string
      end: 'from' | 'to'
      startVia: LineageViaPoint[]
      workVia: LineageViaPoint[]
      anchor: { nodeId: string; pt: Pt; side: Side } | null
    }

/** 全图 12 锚命中（±SNAP_R 内容坐标——nearestAnchor 与 useDrawLine 同式；带 side） */

export function useEdgeEdit(args: {
  enabled: boolean
  pathsRef: React.MutableRefObject<RoutedPath[]>
  /** 宿主元素（svg——parentElement=.tl-content；卡 rect 采集+坐标换算锚） */
  hostRef: React.RefObject<SVGSVGElement | null>
  /** [RR8] 卡 rect/换算器重采集键（布局/路由变化信号——deps 收敛：原无 deps
   *  逐渲染采集，拖拽会话期每次 move 重查全卡 rect） */
  recomputeKey: unknown
}): {
  state: EdgeEditState
  menu: EdgeMenuTarget | null
  /** 警示命中段（全链段序——selected/dragging 态；INV-79 手动分句零持久化） */
  warnSegs: number[]
  /** 磁吸指示线（null=无） */
  snapLine: { axis: 'h' | 'v'; line: number } | null
  /** 手柄几何（working via——dragging/reconnect=workVia；selected=库 via） */
  handlesPl: EditPolyline | null
  /** 拖动中虚影（拖前 via 链——前后对照） */
  ghostPl: EditPolyline | null
  /** 磁吸锚点（指示线中心=被拖手柄位） */
  snapAt: Pt | null
  /** [回炉 R19] 被拖顶点序号（.magnet 实心仅被拖柄——null=非 vertex 拖拽） */
  activeVertexIdx: number | null
  select(edgeId: string): void
  closeMenu(): void
  onEdgeHitClick(edgeId: string): void
  onEdgeHitDbl(edgeId: string, pt: Pt): void
  onEdgeHitDown(edgeId: string, pt: Pt, button: number, clientX: number, clientY: number): void
  onVertexDown(idx: number, button: number, pt: Pt): void
  onVertexContext(idx: number, clientX: number, clientY: number): void
  onEndDown(end: 'from' | 'to', button: number): void
  onSegDown(pt: Pt, button: number): void
  /** 视口→内容坐标注入（EdgeOverlay 挂载置入——z 逆变换 timeline-zoom 单源） */
  setPointConverter(fn: (clientX: number, clientY: number) => Pt): void
} {
  const [state, setState] = useState<EdgeEditState>({ phase: 'idle' })
  const [menu, setMenu] = useState<EdgeMenuTarget | null>(null)
  // [②U5] 内容坐标卡 rect（锚/磁吸/穿卡判定源）+视口→内容换算器（host 承载）
  // [RR8] deps 收敛：采集键=布局/路由变化（原无 deps 逐渲染采集——会话期
  // 每次 move 重查全卡 rect）；换算器 z 走默认参判定时点取值（缩放后不滞留）
  const cardsRef = useRef<Array<{ nodeId: string; rect: Rect }>>([])
  useEffect(() => {
    const content = args.hostRef.current?.parentElement
    if (!(content instanceof HTMLElement)) return
    const base = content.getBoundingClientRect()
    const z = contentScale()
    cardsRef.current = Array.from(content.querySelectorAll<HTMLElement>('.tl-card[data-node-id]')).map((el) => {
      const r = el.getBoundingClientRect()
      return { nodeId: el.dataset.nodeId ?? '', rect: { x: (r.left - base.left) / z, y: (r.top - base.top) / z, w: r.width / z, h: r.height / z } }
    })
    setPointConverter((cx, cy) => toContentPt(base, cx, cy))
  }, [args.hostRef, args.recomputeKey])
  const stateRef = useRef(state)
  stateRef.current = state
  const menuRef = useRef(menu)
  menuRef.current = menu
  /** [RR7] transient 菜单开前选中（null=idle）——关闭撤瞬态高亮时恢复 */
  const priorSelRef = useRef<string | null>(null)

  const store = useLineageStore.getState
  const enabledRef = useRef(args.enabled)
  enabledRef.current = args.enabled

  /** 当前边工作形（selected/dragging 通用：锚=selectAnchor 派生自卡 rect） */
  const polylineOf = useCallback(
    (edgeId: string, via: LineageViaPoint[] | undefined): EditPolyline | null => {
      const e = store().edges.find((x) => x.id === edgeId)
      if (e === undefined) return null
      const cards = cardsRef.current
      const src = cards.find((c) => c.nodeId === e.fromNode)
      const tgt = cards.find((c) => c.nodeId === e.toNode)
      if (via === undefined || via.length === 0 || src === undefined || tgt === undefined) {
        // 自动线/端点缺席：取路由骨架（routed pts——物化与手柄几何源）
        const p = args.pathsRef.current.find((x) => x.edgeId === edgeId)
        if (p === undefined || p.pts.length < 2) return null
        return { anchorA: p.pts[0]!, anchorB: p.pts[p.pts.length - 1]!, via: p.pts.slice(1, -1) as LineageViaPoint[] }
      }
      const first = via[0]
      const last = via[via.length - 1]
      if (first === undefined || last === undefined) return null
      const a = selectAnchor(src.rect, first)
      const b = selectAnchor(tgt.rect, last)
      return { anchorA: a.pt, anchorB: b.pt, via: via.map((v) => ({ ...v })) }
    },
    [store, cardsRef, args.pathsRef]
  )

  /** 点到全链最近段序（dblclick 加点/段拖拽命中） */
  const nearestSegment = useCallback((pl: EditPolyline, p: Pt): number => nearestSegmentIdx(pl, p), [])

  const select = useCallback((edgeId: string): void => {
    if (!enabledRef.current) return
    setState({ phase: 'selected', edgeId })
  }, [])

  const closeMenu = useCallback((): void => {
    const m = menuRef.current
    setMenu(null)
    // 右键线身来源（瞬选：按下即高亮）随菜单关闭撤销；[回炉 R19 来源标记]
    // 左键选中/顶点菜单来源=选中先于菜单在场，关闭保 selected。
    // [RR7] 撤瞬态高亮仅当选中仍是瞬态目标：恢复菜单开前选中（prior——
    // 先在选中不随关闭清空）；菜单开着点另一线=换选落定（不撤）。函数式
    // updater 取队列后最新态（外点关菜单与换选 setState 同批——直读
    // stateRef 恒见换选前旧态误撤）
    if (m !== null && m.kind === 'edge' && m.transient === true) {
      setState((s) => {
        if (s.phase !== 'selected' || s.edgeId !== m.edgeId) return s
        const prior = priorSelRef.current
        return prior === null ? { phase: 'idle' } : { phase: 'selected', edgeId: prior }
      })
    }
  }, [])

  const onEdgeHitClick = useCallback(
    (edgeId: string): void => {
      if (!enabledRef.current) return
      const cur = stateRef.current
      // [回炉 R11③] 选中态左键点另一线=换选；同边=no-op（原 phase!==idle
      // return 使换选不可达）
      if (cur.phase === 'selected') {
        if (cur.edgeId !== edgeId) select(edgeId)
        return
      }
      if (cur.phase !== 'idle') return
      select(edgeId)
    },
    [select, enabledRef]
  )

  /** 加点/物化（双击段——§2.3-3；自动线=首 via 落位转 manual-override） */
  const onEdgeHitDbl = useCallback(
    (edgeId: string, pt: Pt): void => {
      if (!enabledRef.current) return
      const e = store().edges.find((x) => x.id === edgeId)
      const pl = polylineOf(edgeId, e?.via)
      if (e === undefined || pl === null) return
      const seg = nearestSegment(pl, pt)
      const out = addPointOnSegment(pl, seg)
      store().setEdgeVia(edgeId, out.via)
      setState({ phase: 'selected', edgeId })
    },
    [store, polylineOf, nearestSegment, enabledRef]
  )

  /** 右键 pointerdown（button=2）瞬态高亮=瞬选（mockup §3.6 二轮批复④）；
   *  transient=true=瞬选来源标记（closeMenu 撤高亮——[回炉 R19]）；
   *  [RR7] 开菜单记录 priorSelected（关闭撤瞬态高亮但保先在选中） */
  const onEdgeHitDown = useCallback(
    (edgeId: string, _pt: Pt, button: number, clientX: number, clientY: number): void => {
      if (!enabledRef.current || button !== 2) return
      priorSelRef.current = stateRef.current.phase === 'selected' ? stateRef.current.edgeId : null
      select(edgeId)
      const e = store().edges.find((x) => x.id === edgeId)
      setMenu({ kind: 'edge', edgeId, label: e?.label ?? '', x: clientX, y: clientY, transient: true })
    },
    [select, store, enabledRef, stateRef]
  )

  const onVertexContext = useCallback((idx: number, clientX: number, clientY: number): void => {
    if (stateRef.current.phase !== 'selected') return
    setMenu({ kind: 'vertex', edgeId: stateRef.current.edgeId, idx, x: clientX, y: clientY })
  }, [])

  /** 手柄/段/端点 pointerdown——document 级 move/up 会话（中断=abort 回拖前态） */
  const onVertexDown = useCallback(
    (idx: number, button: number, pt: Pt): void => {
      const cur = stateRef.current
      if (cur.phase !== 'selected' || button !== 0) return
      const e = store().edges.find((x) => x.id === cur.edgeId)
      const pl = polylineOf(cur.edgeId, e?.via)
      if (e === undefined || pl === null) return
      const startVia = pl.via
      if (startVia.length === 0) return
      // 物化面：自动线选中拖顶点不达（无手柄）；拖段路径见 onEdgeHitDown 外的
      // segment 面（下方 move 内判定）
      const onMove = (ev: PointerEvent | MouseEvent): void => {
        const cards = cardsRef.current
        // 落点=内容坐标（EdgeOverlay 注入换算器——z 逆变换）
        const target = ptHook.current(ev.clientX, ev.clientY)
        let work = dragVertex({ anchorA: pl.anchorA, anchorB: pl.anchorB, via: startVia }, idx, target)
        // 磁吸（先横后竖取近）
        const ch = channelsFrom(cards)
        const snap = channelSnap(target, ch)
        let snapInfo: { axis: 'h' | 'v'; line: number } | null = null
        if (snap.snapped) {
          snapInfo = { axis: snap.axis!, line: snap.axis === 'h' ? snap.p.y : snap.p.x }
          work = dragVertex({ anchorA: pl.anchorA, anchorB: pl.anchorB, via: startVia }, idx, snap.p)
        }
        setState({
          phase: 'dragging',
          edgeId: cur.edgeId,
          kind: 'vertex',
          idx,
          startVia,
          workVia: work.via,
          startPt: pt,
          snap: snapInfo
        })
      }
      runDragSession(onMove, () => {
        // pointerup=落定提交（一编辑单元）；中断=abort 不提交（W-5）
        const s = stateRef.current
        if (s.phase !== 'dragging' || s.kind !== 'vertex') {
          setState({ phase: 'selected', edgeId: cur.edgeId })
          return
        }
        // [RR 补批 RR13] via 等值短路：拖放回原位=no-op（不 beginUnit 不 dirty
        // 不入队——R19「重置 no-op 不入栈」对称语义）
        if (!viaEquals(s.startVia, s.workVia)) {
          store().setEdgeVia(cur.edgeId, s.workVia.length > 0 ? s.workVia : undefined)
        }
        setState({ phase: 'selected', edgeId: cur.edgeId })
      })
    },
    [store, polylineOf, stateRef, cardsRef]
  )

  /** 端点圆柄 pointerdown——reconnect 拖拽（换锚/跨卡换端） */
  const onEndDown = useCallback(
    (end: 'from' | 'to', button: number): void => {
      const cur = stateRef.current
      if (cur.phase !== 'selected' || button !== 0) return
      const e = store().edges.find((x) => x.id === cur.edgeId)
      const pl = polylineOf(cur.edgeId, e?.via)
      if (e === undefined || pl === null) return
      const startVia = pl.via
      const onMove = (ev: PointerEvent | MouseEvent): void => {
        const cards = cardsRef.current
        const target = ptHook.current(ev.clientX, ev.clientY)
        const anchor = nearestAnchorCard(cards, target)
        let workVia = startVia
        if (anchor !== null) {
          const fixed = end === 'from' ? pl.anchorB : pl.anchorA
          // [回炉 R11②] 自动线（空 via）换锚=物化种子点（被拖端原锚位）走
          // reconnectEnd 生成 L corner（不整体跳过）；manual 线（via≥1）直接
          // L 重正交（via 全保留）
          const seedVia = startVia.length > 0 ? startVia : [end === 'from' ? pl.anchorA : pl.anchorB]
          const base: EditPolyline =
            end === 'from'
              ? { anchorA: anchor.pt, anchorB: fixed, via: seedVia }
              : { anchorA: fixed, anchorB: anchor.pt, via: seedVia }
          workVia = reconnectEnd(base, end, anchor.pt, anchor.side).via
        }
        setState({ phase: 'reconnect', edgeId: cur.edgeId, end, startVia, workVia, anchor })
      }
      runDragSession(onMove, () => {
        const s = stateRef.current
        if (s.phase !== 'reconnect' || s.anchor === null) {
          setState({ phase: 'selected', edgeId: cur.edgeId }) // 中断/无锚=回原锚
          return
        }
        const edge = store().edges.find((x) => x.id === cur.edgeId)
        if (edge === undefined) return
        // [RR 补批 RR13] 落点==拖始锚=no-op 短路（同端节点+同锚位——零编辑
        // 单元零 dirty；manual 线 L 重正交幽灵 +1 点同径消解）
        const home = end === 'from' ? { n: edge.fromNode, p: pl.anchorA } : { n: edge.toNode, p: pl.anchorB }
        if (s.anchor.nodeId === home.n && s.anchor.pt.x === home.p.x && s.anchor.pt.y === home.p.y) {
          setState({ phase: 'selected', edgeId: cur.edgeId })
          return
        }
        // [回炉 R11①] 收尾 via 归一：length>0?via:undefined（空数组禁穿透
        // IPC——自动路由语义）
        const via = s.workVia.length > 0 ? s.workVia : undefined
        const newFrom = s.end === 'from' ? s.anchor.nodeId : edge.fromNode
        const newTo = s.end === 'to' ? s.anchor.nodeId : edge.toNode
        if (newFrom === edge.fromNode && newTo === edge.toNode) {
          store().setEdgeVia(cur.edgeId, via) // 同卡换锚=锚位随 via 首点承载
        } else {
          store().reconnectEdge(cur.edgeId, newFrom, newTo, via)
        }
        setState({ phase: 'selected', edgeId: cur.edgeId })
      })
    },
    [store, polylineOf, stateRef]
  )

  /** 段拖拽（selected 态按住命中层拖动——kind=segment；自动线=物化首 via） */
  const onSegDown = useCallback(
    (pt: Pt, button: number): void => {
      const cur = stateRef.current
      if (cur.phase !== 'selected' || button !== 0) return
      const e = store().edges.find((x) => x.id === cur.edgeId)
      const pl = polylineOf(cur.edgeId, e?.via)
      if (e === undefined || pl === null) return
      const segIdx = nearestSegment(pl, pt)
      // 仅 via 内点对段可拖（§2.3-2 锚端短桩不参与）——自动线（无 via）拖段=
      // 物化首 via：以段中点预置（§2.5 自动线转换条款）
      if (pl.via.length === 0) {
        const materialized = addPointOnSegment(pl, segIdx).via
        if (materialized !== undefined && materialized.length > 0) {
          store().setEdgeVia(cur.edgeId, materialized)
        }
        return
      }
      // [回炉 R4] 全链段序→via 内点对序：锚 A 短桩（0）/锚 B 短桩（末）均
      // 不参与（return——原 Math.min 钳位使锚 B 短桩误拖末对）
      const vi = segmentViaIdx(pl, segIdx)
      if (vi === null) return
      const base = { anchorA: pl.anchorA, anchorB: pl.anchorB, via: pl.via }
      const startPt = pt
      const onMove = (ev: PointerEvent | MouseEvent): void => {
        const target = ptHook.current(ev.clientX, ev.clientY)
        const ch = channelsFrom(cardsRef.current)
        // [回炉 R3] 法向投影（水平段仅 dy/竖直段仅 dx——斜段零位移）+磁吸
        // 输入点=被拖段几何（段中点）+吸附位移=snap 点对段原位差（单源代数）
        const { via, snap } = segmentDrag(base, vi, target.x - startPt.x, target.y - startPt.y, ch)
        setState({ phase: 'dragging', edgeId: cur.edgeId, kind: 'segment', idx: vi, startVia: pl.via, workVia: via, startPt, snap })
      }
      runDragSession(onMove, () => {
        const s = stateRef.current
        if (s.phase !== 'dragging' || s.kind !== 'segment') {
          setState({ phase: 'selected', edgeId: cur.edgeId })
          return
        }
        // [RR 补批 RR13] via 等值短路（vertex 同式——回原位=no-op 零单元）
        if (!viaEquals(s.startVia, s.workVia)) store().setEdgeVia(cur.edgeId, s.workVia)
        setState({ phase: 'selected', edgeId: cur.edgeId })
      })
    },
    [store, polylineOf, nearestSegment, stateRef, cardsRef]
  )

  // ── 拖拽会话基建（document 级 move/up+中断 abort——[回炉轮 2 拆件
  // edge-drag-session.runDocDragSession：use-edge-edit ≤500 行红线]）─────
  const ptHook = useRef<(x: number, y: number) => Pt>(() => ({ x: 0, y: 0 }))
  const setPointConverter = useCallback((fn: (clientX: number, clientY: number) => Pt): void => {
    ptHook.current = fn
  }, [])
  /** 中断收尾（[RR2] pointercancel/blur 同路——§2.5 定案中断=不成立） */
  const abortDrag = useCallback((): void => {
    setState((s) => (s.phase === 'selected' ? s : { phase: 'idle' }))
  }, [])
  const runDragSession = (onMove: (ev: PointerEvent | MouseEvent) => void, onUp: () => void): void => {
    runDocDragSession({ onMove, onUp, onAbort: abortDrag })
  }

  // Esc/点空白：selected/dragging 收尾+菜单关闭；切模式=态清空（W-5）
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      if (menuRef.current !== null) {
        closeMenu()
        return
      }
      setState({ phase: 'idle' })
    }
    const onDown = (e: PointerEvent | MouseEvent): void => {
      const t = e.target
      // 空白去选守卫：连线两 svg（可见 .tl-edges+命中 .tl-edge-hits——②批拆
      // 双层后类名分立，旧守卫漏命中层=选中态被每次 pointerdown 误清）与菜单
      // 域外才算空白
      if (t instanceof Element && (t.closest('svg') !== null || t.closest('[data-testid="edge-menu"]') !== null)) return
      if (stateRef.current.phase !== 'idle') setState({ phase: 'idle' })
      if (menuRef.current !== null) closeMenu()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [closeMenu])

  // 非 edit/非 select 工具=收尾转移（W-5：切模式/切图中止）
  useEffect(() => {
    if (!args.enabled) setState({ phase: 'idle' })
  }, [args.enabled])

  // 边消失（删除/切图）=selected 态失效防御
  // [RR8] 响应式订阅（原 deps getState().edges 渲染期直读=静态 props 挂载下
  // 边删除不触发重渲染——选中悬挂；订阅后 store 写即时驱动）
  const selId = state.phase === 'idle' ? null : state.edgeId
  const storeEdges = useLineageStore((s) => s.edges)
  useEffect(() => {
    if (selId === null) return
    if (!storeEdges.some((e) => e.id === selId)) setState({ phase: 'idle' })
  }, [selId, storeEdges])

  // 穿卡警示命中段（selected/dragging 态渲染——零持久化）
  const warnSegs =
    selId === null
      ? []
      : (() => {
          const s = stateRef.current
          const via =
            s.phase === 'dragging' || s.phase === 'reconnect' ? s.workVia : store().edges.find((e) => e.id === selId)?.via
          const pl = polylineOf(selId, via)
          if (pl === null) return []
          const e = store().edges.find((x) => x.id === selId)
          if (e === undefined) return []
          const cards = cardsRef.current
          const src = cards.find((c) => c.nodeId === e.fromNode)?.rect
          const tgt = cards.find((c) => c.nodeId === e.toNode)?.rect
          const excl = [src, tgt].filter((r): r is Rect => r !== undefined)
          return crossCardSegments(pl, cards.map((c) => c.rect), excl)
        })()

  const snapLine =
    state.phase === 'dragging' && state.snap !== null ? { axis: state.snap.axis, line: state.snap.line } : null

  // 手柄/虚影几何（render 期由 state+库 via 派生）
  const handlesPl = (() => {
    if (selId === null) return null
    const s = stateRef.current
    const via =
      s.phase === 'dragging' || s.phase === 'reconnect' ? s.workVia : store().edges.find((e) => e.id === selId)?.via
    return polylineOf(selId, via)
  })()
  const ghostPl =
    state.phase === 'dragging' || state.phase === 'reconnect'
      ? polylineOf(state.edgeId, state.startVia)
      : null
  const snapAt =
    state.phase === 'dragging' && state.snap !== null ? (state.workVia[state.idx] ?? state.startPt) : null
  /** [回炉 R19] 磁吸实心（.magnet）仅被拖柄：dragging-vertex 拖动序号 */
  const activeVertexIdx = state.phase === 'dragging' && state.kind === 'vertex' ? state.idx : null

  return {
    state,
    menu,
    warnSegs,
    snapLine,
    handlesPl,
    ghostPl,
    snapAt,
    activeVertexIdx,
    select,
    closeMenu,
    onEdgeHitClick,
    onEdgeHitDbl,
    onEdgeHitDown,
    onVertexDown,
    onVertexContext,
    onEndDown,
    onSegDown,
    setPointConverter
  }
}
