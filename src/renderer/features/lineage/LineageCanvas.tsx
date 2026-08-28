// b3: P7-H
/**
 * [LG-02] LineageCanvas —— 脉络画布（SVG+pan/zoom）+节点交互原语。
 * [R2-LG9] 星象板视觉：夜幕星空宿主+渐变节点卡+金微光层带+边辉 defs。
 *
 * 行为（票面+主控裁决 4）：
 * - 渲染：layoutLineage 纯函数产出（useMemo 同参缓存）→ 层带横线+年份
 *   标签/节点卡片（渐变面+角饰+标题+年份，主题节点虚线框区分文献节点）/
 *   父子连线贝塞尔（from 底边中心→to 顶边中心）+边 label 沿贝塞尔中点渲染
 *   （真实文本，空串不渲染——缺陷 E1 修）；坐标=卡片中心。
 * - 空图=空态文案「暂无脉络图——导入草稿或添加节点」（导入/添加入口
 *   归 LG-03——本画布只读不留死按钮）。
 * - pan=空白（背景 rect data-panbg）pointer 拖拽平移；节点上按下不 pan
 *   （编辑拖拽面归 03）。zoom=滚轮（鼠标锚点缩放），钳制 [0.25, 4]。
 * - INV-14：wheel/pointerdown 注册 svg、pointermove/up 注册 window，
 *   卸载时同 type 同函数引用成对移除（组件测试配对断言）。
 * - 视口瞬态（tx/ty/k）驻组件 state 不入 store。
 * - 03 编辑接缝/onNodeDrag/onNodeContextMenu/04 选中视觉态：见原票面
 *   （行为零变——R2-LG9 只换视觉皮肤）。
 * - **R2-LG9 视觉（规范=mockups/lineage-constellation.html）**：夜幕+星云+星空+✦+图例=宿主 div CSS 多层背景+装饰拆件 LineageNightDecor（.lineage-night 族；装饰层一律 data-night-decor+aria-hidden+pointer-events:none——注意事项 ⑥，pan 落点仍达 panbg）；svg 顶 defs=节点渐变（lg-node-face 族）+金辉滤器（lg-edge-glow——节点选中态与边辉共用）；层带=金微光实线+左端菱形刻度+衬线年份标（「YYYY 年」文案逐字保留——e2e getByText 断言面）。
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { LineageEdge, LineageNode } from '@shared/models/lineage'
import { NODE_H, layoutLineage } from './lineage-layout'
import { LineageEdges } from './LineageEdges'
import { LineageNightDecor } from './LineageNightDecor'
import { LineageNodeCard } from './LineageNodeCard'
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
    <div className="lineage-night relative h-full w-full">
      {/* 星空三层+边型图例（拆件 LineageNightDecor——装饰层 pointer-events:
          none 不参与命中，pan 落点仍达 panbg） */}
      <LineageNightDecor />
      <svg
        ref={svgRef}
        data-testid="lineage-canvas"
        className="relative h-full w-full touch-none select-none"
        style={{ cursor: 'grab' }}
      >
        <defs>
          {/* 节点渐变面（165° 向量≈(0.26,1)；三档=node-face-hi→node-face→深端） */}
          <linearGradient id="lg-node-face" x1="0" y1="0" x2="0.26" y2="1">
            <stop offset="0%" stopColor="var(--node-face-hi)" />
            <stop offset="58%" stopColor="var(--node-face)" />
            <stop offset="100%" stopColor="#1e2745" />
          </linearGradient>
          {/* 主题节点半透明面（mockup .node.theme 逐值） */}
          <linearGradient id="lg-node-face-theme" x1="0" y1="0" x2="0.26" y2="1">
            <stop offset="0%" stopColor="rgba(43, 55, 96, 0.6)" />
            <stop offset="100%" stopColor="rgba(30, 39, 69, 0.5)" />
          </linearGradient>
          {/* 金辉滤器（边辉+节点选中外光共用） */}
          <filter id="lg-edge-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation={2.6} result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect data-panbg x={0} y={0} width="100%" height="100%" fill="transparent" />
        {nodes.length === 0 ? (
          // 空态不短路挂载结构（回炉 W2）：svg 常驻 → pan/zoom listener 一次
          // 绑定常活，空→非空转场（03 添加首节点路径）无需重绑
          <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fontSize={13} fill="var(--text-dim-on-night)">
            暂无脉络图——导入草稿或添加节点
          </text>
        ) : (
        <g data-viewport transform={`translate(${tx}, ${ty}) scale(${k})`}>
          {/* 层带：金微光实线+左端菱形刻度+衬线年份标（含未知年份末带；y 与
              节点对齐由 layout 既有精确计算保证——注意事项 ④） */}
          {layout.layers.map((l) => (
            <g key={l.year === null ? 'null' : String(l.year)} data-layer-year={l.year === null ? 'null' : l.year}>
              <rect
                data-band-tick
                width={6}
                height={6}
                transform={`translate(-197, ${l.y - 3}) rotate(45)`}
                fill="var(--gold-night)"
                fillOpacity={0.5}
              />
              <line x1={-200} x2={99999} y1={l.y} y2={l.y} stroke="var(--band-line)" strokeWidth={1} />
              <text
                x={-190}
                y={l.y + NODE_H / 2}
                fontSize={14}
                fill="var(--gold-bright)"
                style={{ fontFamily: 'var(--font-display)', letterSpacing: '2px' }}
              >
                {l.year === null ? '未知年份' : `${l.year} 年`}
              </text>
            </g>
          ))}
          {/* 父子连线+边 label（拆件 LineageEdges——组件行数红线；边 label
              沿贝塞尔中点真实文本渲染，空串不渲染——缺陷 E1 修） */}
          <LineageEdges edges={edges} positions={layout.positions} />
          {/* 节点卡片（拆件 LineageNodeCard——R2-LG9 组件行数红线；拖拽期叠加 dragView 偏移跟随） */}
          {nodes.map((n) => {
            const p = layout.positions.get(n.id)
            if (p === undefined) return null
            return (
              <LineageNodeCard
                key={n.id}
                node={n}
                pos={p}
                offset={dragView?.id === n.id ? dragView : null}
                selected={props.selectedNodeId === n.id}
                onPointerDown={(e) => {
                  dragRef.current = { id: n.id, sx: e.clientX, sy: e.clientY, ox: p.x, oy: p.y }
                }}
                onContextMenu={(e) => {
                  e.preventDefault()
                  props.onNodeContextMenu?.(n.id, { x: e.clientX, y: e.clientY })
                }}
              />
            )
          })}
        </g>
        )}
      </svg>
    </div>
  )
}
