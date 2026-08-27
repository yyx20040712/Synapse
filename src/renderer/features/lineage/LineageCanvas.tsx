// b3: P7-H
/**
 * [LG-02] LineageCanvas —— 只读脉络画布（SVG+pan/zoom）。
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
 * - 只读：无任何写交互元素。视口瞬态（tx/ty/k）驻组件 state 不入 store。
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { LineageEdge, LineageNode } from '@shared/models/lineage'
import { NODE_H, NODE_W, layoutLineage } from './lineage-layout'

const ZOOM_MIN = 0.25
const ZOOM_MAX = 4
const ZOOM_STEP = 0.0015

interface Viewport {
  tx: number
  ty: number
  k: number
}

export function LineageCanvas(props: { nodes: LineageNode[]; edges: LineageEdge[] }): JSX.Element {
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
        const k2 = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v.k * Math.exp(-e.deltaY * ZOOM_STEP)))
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
        {/* 节点卡片（主题节点=虚线框区分文献节点） */}
        {nodes.map((n) => {
          const p = layout.positions.get(n.id)
          if (p === undefined) return null
          const theme = n.paperId === null
          return (
            <g key={n.id} data-node-id={n.id} data-kind={theme ? 'theme' : 'paper'} transform={`translate(${p.x}, ${p.y})`}>
              <rect
                x={-NODE_W / 2}
                y={-NODE_H / 2}
                width={NODE_W}
                height={NODE_H}
                rx={6}
                fill="var(--panel)"
                stroke={theme ? 'var(--accent)' : 'var(--border)'}
                strokeWidth={1}
                strokeDasharray={theme ? '6 4' : undefined}
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
