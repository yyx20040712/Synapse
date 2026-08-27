// b3: P7-H
/**
 * [LG-02] LineageCanvas —— 脉络画布（SVG+pan/zoom）+节点交互原语。
 *
 * 行为（票面+主控裁决 4）：
 * - 渲染：layoutLineage 纯函数产出（useMemo 同参缓存）→ 层带横线+年份
 *   标签/节点卡片（rect+标题+年份，主题节点虚线框区分文献节点）/父子
 *   连线贝塞尔（from 底边中心→to 顶边中心）；坐标=卡片中心。
 * - 空图=空态文案「暂无脉络图——导入草稿或添加节点」（导入/添加入口
 *   归 LG-03——本画布只读不留死按钮）。
 * - pan=空白（背景 rect data-panbg）pointer 拖拽平移；节点上按下不 pan
 *   （编辑拖拽面归 03）。zoom=滚轮（鼠标锚点缩放），钳制 [0.25, 4]。
 * - INV-14：wheel/pointerdown 注册 svg、pointermove/up 注册 window，
 *   卸载时同 type 同函数引用成对移除（组件测试配对断言）。
 * - 视口瞬态（tx/ty/k）驻组件 state 不入 store。
 * - **03 编辑接缝（LG-03 扩，可选回调零回调时行为不变）**：节点原语上抛——
 *   onNodeDrag（拖拽落点，布局坐标=自动布局/覆盖位+位移/k，位移阈值内视为
 *   onNodeClick 单击选中）/onNodeContextMenu（右键菜单锚）。拖拽期实时
 *   跟随（dragView 偏移渲染）；写路径（upsert-node）归 Board 编辑层——
 *   本画布不持写通道。
 * - **04 选中视觉态（LG-04 扩，可选 prop 缺省行为不变）**：selectedNodeId
 *   命中节点=accent 描边加粗+data-selected 标记（Board 透传，侧板联动）。
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { LineageEdge, LineageNode } from '@shared/models/lineage'
import { NODE_H, NODE_W, layoutLineage } from './lineage-layout'
const ZOOM = { min: 0.25, max: 4, step: 0.0015 } as const
/** 拖拽/单击分界位移（px）——低于阈值视为单击选中 */
const DRAG_THRESHOLD = 3

type Viewport = { tx: number; ty: number; k: number }

/** 03 编辑层消费的节点交互回调（全可选——缺省即纯只读） */
export interface CanvasEditCallbacks {
  /** 拖拽落点（布局坐标，JSON Canvas 覆盖语义——消费方经 upsert-node 落库） */
  onNodeDrag?: (nodeId: string, x: number, y: number) => void
  /** 单击选中（04 侧板消费面上抛） */
  onNodeClick?: (nodeId: string) => void
  /** 右键节点开菜单（03 节点菜单锚点） */
  onNodeContextMenu?: (nodeId: string, position: { x: number; y: number }) => void
}

export function LineageCanvas(props: {
  nodes: LineageNode[]
  edges: LineageEdge[]
  selectedNodeId?: string | null
} & CanvasEditCallbacks): JSX.Element {
  const { nodes, edges } = props
  const layout = useMemo(() => layoutLineage(nodes, edges), [nodes, edges])
  const [viewport, setViewport] = useState<Viewport>({ tx: 0, ty: 0, k: 1 })
  const svgRef = useRef<SVGSVGElement | null>(null)

  // zoom：非被动 wheel（preventDefault 阻页面滚动）；鼠标锚点缩放（缩放
  // 前后鼠标下的内容点不动）。函数式 set 取最新视口，无闭包过期。
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const onWheel = (e: WheelEvent): void => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      setViewport((v) => {
        const k2 = Math.min(ZOOM.max, Math.max(ZOOM.min, v.k * Math.exp(-e.deltaY * ZOOM.step)))
        return {
          k: k2,
          tx: mx - ((mx - v.tx) / v.k) * k2,
          ty: my - ((my - v.ty) / v.k) * k2
        }
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // pan：背景按下进入拖拽（节点上不触发）；move/up 挂 window（拖出画布
  // 仍跟随）。增量位移（每 move 与上一位置差），卸载三 listener 成对移除。
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    let dragging = false
    let lastX = 0
    let lastY = 0
    const onDown = (e: PointerEvent): void => {
      if (!(e.target instanceof Element) || !e.target.hasAttribute('data-panbg')) return
      dragging = true
      lastX = e.clientX
      lastY = e.clientY
    }
    const onMove = (e: PointerEvent): void => {
      if (!dragging) return
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      lastX = e.clientX
      lastY = e.clientY
      setViewport((v) => ({ ...v, tx: v.tx + dx, ty: v.ty + dy }))
    }
    const onUp = (): void => {
      dragging = false
    }
    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [])

  const { tx, ty, k } = viewport
  // ── 03 编辑接缝：拖拽会话（start 驻 ref，渲染跟随驻 state；回调经 ref 取最新）──
  const dragRef = useRef<{ id: string; sx: number; sy: number; ox: number; oy: number } | null>(null)
  const [dragView, setDragView] = useState<{ id: string; dx: number; dy: number } | null>(null)
  const viewportRef = useRef<Viewport>(viewport)
  const cbRef = useRef<{ drag?: CanvasEditCallbacks['onNodeDrag']; click?: CanvasEditCallbacks['onNodeClick'] }>({})
  useEffect(() => {
    viewportRef.current = viewport
  }, [viewport])
  useEffect(() => {
    cbRef.current = { drag: props.onNodeDrag, click: props.onNodeClick }
  })
  useEffect(() => {
    const onMove = (e: PointerEvent): void => {
      const d = dragRef.current
      if (d === null) return
      setDragView({ id: d.id, dx: e.clientX - d.sx, dy: e.clientY - d.sy })
    }
    const onUp = (e: PointerEvent): void => {
      const d = dragRef.current
      dragRef.current = null
      setDragView(null)
      if (d === null) return
      const dx = e.clientX - d.sx
      const dy = e.clientY - d.sy
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) {
        cbRef.current.click?.(d.id)
        return
      }
      // 屏幕位移→布局坐标（除以缩放 k；pan 平移在落点换算中相消——相对位移语义）
      cbRef.current.drag?.(d.id, d.ox + dx / viewportRef.current.k, d.oy + dy / viewportRef.current.k)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [])
  return (
    <svg
      ref={svgRef}
      data-testid="lineage-canvas"
      className="h-full w-full touch-none select-none"
      style={{ background: 'var(--bg)', cursor: 'grab' }}
    >
      <rect data-panbg x={0} y={0} width="100%" height="100%" fill="transparent" />
      {nodes.length === 0 ? (
        // 空态不短路挂载结构（回炉 W2）：svg 常驻 → pan/zoom listener 一次
        // 绑定常活，空→非空转场（03 添加首节点路径）无需重绑
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fontSize={13} fill="var(--text-dim)">
          暂无脉络图——导入草稿或添加节点
        </text>
      ) : (
      <g data-viewport transform={`translate(${tx}, ${ty}) scale(${k})`}>
        {/* 层带横线+年份标签（含未知年份末带） */}
        {layout.layers.map((l) => (
          <g key={l.year === null ? 'null' : String(l.year)} data-layer-year={l.year === null ? 'null' : l.year}>
            <line
              x1={-200}
              x2={99999}
              y1={l.y}
              y2={l.y}
              stroke="var(--border)"
              strokeDasharray="4 6"
            />
            <text x={-190} y={l.y + NODE_H / 2} fontSize={12} fill="var(--text-dim)">
              {l.year === null ? '未知年份' : `${l.year} 年`}
            </text>
          </g>
        ))}
        {/* 父子连线（from 底边中心→to 顶边中心，垂直主导贝塞尔） */}
        {edges.map((e) => {
          const from = layout.positions.get(e.fromNode)
          const to = layout.positions.get(e.toNode)
          if (from === undefined || to === undefined) return null
          const y1 = from.y + NODE_H / 2
          const y2 = to.y - NODE_H / 2
          const mid = (y1 + y2) / 2
          return (
            <path
              key={e.id}
              data-edge-id={e.id}
              d={`M ${from.x} ${y1} C ${from.x} ${mid}, ${to.x} ${mid}, ${to.x} ${y2}`}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={1.5}
              opacity={0.7}
            />
          )
        })}
        {/* 节点卡片（主题节点=虚线框区分文献节点；拖拽期叠加 dragView 偏移跟随） */}
        {nodes.map((n) => {
          const p = layout.positions.get(n.id)
          if (p === undefined) return null
          const theme = n.paperId === null
          const sel = props.selectedNodeId === n.id
          const off = dragView?.id === n.id ? dragView : null
          return (
            <g
              key={n.id}
              data-node-id={n.id}
              data-kind={theme ? 'theme' : 'paper'}
              transform={`translate(${p.x + (off?.dx ?? 0)}, ${p.y + (off?.dy ?? 0)})`}
              onPointerDown={(e) => {
                dragRef.current = { id: n.id, sx: e.clientX, sy: e.clientY, ox: p.x, oy: p.y }
              }}
              onContextMenu={(e) => {
                e.preventDefault()
                props.onNodeContextMenu?.(n.id, { x: e.clientX, y: e.clientY })
              }}
            >
              <rect
                x={-NODE_W / 2}
                y={-NODE_H / 2}
                width={NODE_W}
                height={NODE_H}
                rx={6}
                fill="var(--panel)"
                stroke={sel || theme ? 'var(--accent)' : 'var(--border)'}
                strokeWidth={sel ? 2.5 : 1}
                strokeDasharray={theme ? '6 4' : undefined}
                data-selected={sel}
              />
              <text x={0} y={-8} textAnchor="middle" fontSize={12} fill="var(--text)">
                {n.title}
              </text>
              <text x={0} y={14} textAnchor="middle" fontSize={11} fill="var(--text-dim)">
                {n.year === null ? '未知年份' : String(n.year)}
              </text>
            </g>
          )
        })}
      </g>
      )}
    </svg>
  )
}
