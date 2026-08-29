// b3: P7-H
/**
 * [LG-02] LineageCanvas —— 脉络画布（SVG+pan/zoom）+节点交互原语。
 * [R2-LG11] 浅色严谨板改版：白卡+细边框编码（LineageNodeCard）+边三型
 * （LineageEdges）+浅色层带+图例四项（LineageLegend——夜幕装饰拆件删除）。
 *
 * 行为（票面+主控裁决）：
 * - 渲染：layoutLineage 纯函数产出（useMemo 同参缓存）→ 层带横线+年份
 *   标/节点卡片（白卡 foreignObject 换行）/父子连线贝塞尔+边 label；
 *   坐标=卡片中心。核心档=classify.isCore 预计算传 NodeCard（决2）；
 *   geom（中心+半高）与 surveyIds 布局后一次构建传 LineageEdges
 *   （INV-38 单源消费——禁每边重扫）。
 * - 空图=空态文案「暂无脉络图——导入草稿或添加节点」（svg 常驻——W2）。
 * - pan/zoom/视口瞬态＝拆件 lineage-viewport.ts（INV-14 成对注册/成对
 *   清理原样）；钳制 [0.25, 4]。
 * - 03 编辑接缝/onNodeDrag/onNodeContextMenu/04 选中视觉态：行为零变。
 * - **R2-LG11 视觉（决1/决5+U2a）**：宿主 .lineage-host=var(--bg) 浅底
 *   （夜幕/星空/✦/渐变 defs/glow 全删）；层带=var(--border) 实线+
 *   菱形刻度 node-branch+年份标 UI 字体 13px text-dim（「YYYY 年」/
 *   「未知年份」文案逐字保留——e2e getByText 断言面）；层带线
 *   x1/x2=layout BAND_LEFT/BAND_RIGHT 单源，年份标 y=l.y+LAYER_LABEL_DY
 *   （层带级元素不随卡高）。
 * - **R2-LG10 auto-fit**：拆件 lineage-viewport.ts；「适应视图」按钮
 *   （lineage-fit-view，非空图才渲染）=resetFit 唯一复位口。
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { LineageEdge, LineageNode } from '@shared/models/lineage'
import { BAND_LEFT, BAND_RIGHT, LAYER_LABEL_DY, layoutLineage, nodeHeight } from './lineage-layout'
import { isCore, isSurvey } from './lineage-classify'
import { useViewportController } from './lineage-viewport'
import type { Viewport } from './lineage-viewport'
import { LineageEdges } from './LineageEdges'
import { LineageLegend } from './LineageLegend'
import { LineageNodeCard } from './LineageNodeCard'
/** 拖拽/单击分界位移（px）——低于阈值视为单击选中 */
const DRAG_THRESHOLD = 3

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
  const svgRef = useRef<SVGSVGElement | null>(null)
  // auto-fit/pan/zoom（R2-LG10）：视口域全在 lineage-viewport.ts；本组件只
  // 消费 viewport 值+resetFit 按钮
  const { viewport, resetFit } = useViewportController({ nodes, edges, layout, svgRef })

  // 边几何预构建（INV-38 半高单源消费——positions+nodeHeight 一次成表）
  const geom = useMemo(() => {
    const m = new Map<string, { x: number; y: number; halfH: number }>()
    for (const n of nodes) {
      const p = layout.positions.get(n.id)
      if (p === undefined) continue
      m.set(n.id, { x: p.x, y: p.y, halfH: nodeHeight(n.title) / 2 })
    }
    return m
  }, [nodes, layout])
  // 综述 id 集（决3——Edges 综述关联边判定）
  const surveyIds = useMemo(
    () => new Set(nodes.filter((n) => isSurvey(n.title)).map((n) => n.id)),
    [nodes]
  )
  // 核心档预计算（决2 D1'——classify 单源；NodeCard不自算）
  const coreIds = useMemo(
    () => new Map(nodes.map((n) => [n.id, isCore(n, edges)])),
    [nodes, edges]
  )

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
    <div className="lineage-host relative h-full w-full">
      {/* 边型图例（浅色白卡——装饰层 pointer-events:none 不参与命中） */}
      <LineageLegend />
      <svg
        ref={svgRef}
        data-testid="lineage-canvas"
        className="relative h-full w-full touch-none select-none"
        style={{ cursor: 'grab' }}
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
          {/* 层带：浅色实线+菱形刻度+年份标（含未知年份末带）；年份标 y=
              l.y+LAYER_LABEL_DY（层带级固定偏移——不随卡高） */}
          {layout.layers.map((l) => (
            <g key={l.year === null ? 'null' : String(l.year)} data-layer-year={l.year === null ? 'null' : l.year}>
              <rect
                data-band-tick
                width={6}
                height={6}
                transform={`translate(${BAND_LEFT + 3}, ${l.y - 3}) rotate(45)`}
                fill="var(--node-branch)"
                fillOpacity={0.5}
              />
              <line x1={BAND_LEFT} x2={BAND_RIGHT} y1={l.y} y2={l.y} stroke="var(--border)" strokeWidth={1} />
              <text x={BAND_LEFT + 10} y={l.y + LAYER_LABEL_DY} fontSize={13} fill="var(--text-dim)">
                {l.year === null ? '未知年份' : `${l.year} 年`}
              </text>
            </g>
          ))}
          {/* 父子连线+边 label（三型色——geom/surveyIds 预构建传入） */}
          <LineageEdges edges={edges} geom={geom} surveyIds={surveyIds} />
          {/* 节点卡片（白卡边框编码——core 预计算；拖拽期叠加 dragView 偏移跟随） */}
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
                core={coreIds.get(n.id) === true}
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
      {/* 「适应视图」=userInteracted 显式复位（唯一入口——lineage-viewport.ts
          状态机表；空图不渲染（空态零按钮红线——既有锁定 it 面） */}
      {nodes.length > 0 && (
        <button
          type="button"
          data-testid="lineage-fit-view"
          className="lineage-fit-btn"
          onClick={resetFit}
        >
          适应视图
        </button>
      )}
    </div>
  )
}
