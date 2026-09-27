// b3: T3-P7A
/**
 * [T3-P7A] EdgeOverlay —— 连线 SVG overlay（LineageTimeline 子组件——D-22）。
 *
 * - 载体=svg.tl-edges（absolute inset:0 overflow:visible——D-1/D-2：挂
 *   .tl-content 内覆盖全内容高，与卡同文档流滚动零跟随；z 低于卡=连线
 *   永不遮卡）。每边两 path：tl-edge 可见（D-18 色纹按 data-kind 类映射，
 *   sub 覆盖=P5 lineTypes 数据纯消费）+tl-edge-hit 透明命中层（stroke 8
 *   ——D-15；**P7a 期 pointer-events:none**，编辑交互 P7b 开启）。
 * - buildSnapshot(contentEl)=本组件唯一不纯点（D-2 内容坐标 elRect−
 *   contentRect；.month-tag 入 labels、.month-frame+year 入 frames）——
 *   路由层 lineage-routing 零 DOM import。
 * - 重算触发 rAF 合并（D-22+回炉 1 W1/W6）：shiftedIds/groups（P6 砖砌
 *   收敛=终态信号）+ResizeObserver(.tl-content)+edges/nodes 引用变化
 *   +**routeEpoch**（LineageTimeline 不动点收敛/守卫分支 bump——React 子
 *   effect 先于父：收敛轮父组件不再 setState，子组件需显式再触发）；
 *   测量冻结期（.tl-measure 在场）不采集——CSS 同帧置 opacity:0
 *   （--dur-tint 过渡）防闪跳。
 * - routeAll 降级 onWarn=console.warn（回炉 1 W2/k1-N5——生产不静默）；
 *   paths 按 edgeId Map 配对渲染（回炉 1 W5——禁下标 zip）。
 */
import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { LineageEdge, LineageNode, LineTypeGroup } from '@shared/models/lineage'
import type { TimelineYearGroup } from './lineage-timeline'
import type { EdgeGeomInput, LayoutSnapshot, RoutedPath } from './lineage-routing'
import { defaultCorridor, routeAll } from './lineage-routing'

interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** 布局快照采集（唯一不纯点——驻本组件；跨年判定输入=closest('[data-year]')） */
function buildSnapshot(content: HTMLElement): LayoutSnapshot {
  const base = content.getBoundingClientRect()
  const toBox = (el: Element): Box => {
    const r = el.getBoundingClientRect()
    return { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height }
  }
  const cards = new Map<string, Box>()
  for (const el of Array.from(content.querySelectorAll<HTMLElement>('.tl-card[data-node-id]'))) {
    cards.set(el.dataset.nodeId ?? '', toBox(el))
  }
  const labels = Array.from(content.querySelectorAll('.month-tag')).map(toBox)
  const frames = Array.from(content.querySelectorAll('.month-frame')).map((el) => {
    const raw = el.closest('[data-year]')?.getAttribute('data-year') ?? 'null'
    return { ...toBox(el), year: raw === 'null' ? null : Number(raw) }
  })
  return { cards, labels, frames, contentW: base.width, corridor: defaultCorridor(base.width) }
}

/** sub 样式覆盖（P5 数据纯消费——D-18：sub=null 或失配=基础型类样式零覆盖） */
function subStyle(edge: LineageEdge, lineTypes: readonly LineTypeGroup[]): CSSProperties | undefined {
  if (edge.sub === null) return undefined
  const sub = (lineTypes.find((g) => g.base === edge.kind)?.subs ?? []).find((s) => s.id === edge.sub)
  if (sub === undefined) return undefined
  return { stroke: sub.color, strokeDasharray: sub.dash === '' ? 'none' : sub.dash, strokeWidth: sub.w }
}

export function EdgeOverlay(props: {
  nodes: LineageNode[]
  edges: LineageEdge[]
  lineTypes: LineTypeGroup[]
  shiftedIds: ReadonlySet<string>
  groups: TimelineYearGroup[]
  /** 回炉 1 W1/W6：父组件不动点收敛/守卫分支 bump——子 effect 再触发信号 */
  routeEpoch: number
}): JSX.Element {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [paths, setPaths] = useState<RoutedPath[]>([])
  // 端点在场的边才路由（写过渡态悬空边不渲染——nodes=防御消费面）
  const live = useMemo(() => {
    const ids = new Set(props.nodes.map((n) => n.id))
    const edges = props.edges.filter((e) => ids.has(e.fromNode) && ids.has(e.toNode))
    const inputs: EdgeGeomInput[] = edges.map((e) => ({
      edgeId: e.id,
      sourceId: e.fromNode,
      targetId: e.toNode,
      kind: e.kind,
      subId: e.sub ?? undefined
    }))
    return { edges, inputs }
  }, [props.nodes, props.edges])
  // 回炉 1 W5：paths 按.edgeId 配对（Map 查找替下标 zip）
  const edgeById = useMemo(() => new Map(live.edges.map((e) => [e.id, e] as const)), [live])

  useLayoutEffect(() => {
    const content = svgRef.current?.parentElement
    if (!(content instanceof HTMLElement)) return
    let raf = 0
    const run = (): void => {
      raf = 0
      if (content.classList.contains('tl-measure')) return // 冻结期旧路径由 CSS 隐去
      setPaths(routeAll(live.inputs, buildSnapshot(content), (msg) => console.warn(msg)))
    }
    raf = requestAnimationFrame(run)
    const ro =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            if (raf !== 0) cancelAnimationFrame(raf)
            raf = requestAnimationFrame(run)
          })
    ro?.observe(content)
    return () => {
      if (raf !== 0) cancelAnimationFrame(raf)
      ro?.disconnect()
    }
  }, [live, props.shiftedIds, props.groups, props.routeEpoch])

  return (
    <svg className="tl-edges" ref={svgRef} data-testid="tl-edges">
      {paths.map((p) => {
        const e = edgeById.get(p.edgeId)
        if (e === undefined) return null
        return (
          <g key={p.edgeId}>
            <path
              className="tl-edge"
              data-edge-id={p.edgeId}
              data-kind={e.kind}
              d={p.d}
              style={subStyle(e, props.lineTypes)}
            />
            <path className="tl-edge-hit" data-edge-id={p.edgeId} d={p.d} />
          </g>
        )
      })}
    </svg>
  )
}
