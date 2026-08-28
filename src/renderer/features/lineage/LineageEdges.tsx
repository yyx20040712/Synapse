// b3: P7-H
/**
 * LineageEdges —— 父子连线+边 label 渲染（LineageCanvas 拆件——组件
 * ≤250 行红线拆分预案落点，缺陷 E1 修）。
 *
 * - 连线=from 底边中心→to 顶边中心垂直主导贝塞尔（data-edge-id 测试钩）。
 * - 边 label=贝塞尔中点近似 ((from.x+to.x)/2, mid) 渲染真实文本，空串
 *   不渲染（无 text 节点）；paintOrder=stroke + 底色描边（var(--bg)）保
 *   证跨层带横线/连线可读（样式自裁——票面 P2）。
 * - 坐标=卡片中心（layoutLineage 产出），positions 形状用结构类型不引
 *   LayoutResult（防 layout 模块循环依赖）。
 */
import type { LineageEdge } from '@shared/models/lineage'
import { NODE_H } from './lineage-layout'

export function LineageEdges(props: {
  edges: LineageEdge[]
  positions: Map<string, { x: number; y: number }>
}): JSX.Element {
  return (
    <>
      {props.edges.map((e) => {
        const from = props.positions.get(e.fromNode)
        const to = props.positions.get(e.toNode)
        if (from === undefined || to === undefined) return null
        const y1 = from.y + NODE_H / 2
        const y2 = to.y - NODE_H / 2
        const mid = (y1 + y2) / 2
        return (
          <g key={e.id}>
            <path
              data-edge-id={e.id}
              d={`M ${from.x} ${y1} C ${from.x} ${mid}, ${to.x} ${mid}, ${to.x} ${y2}`}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={1.5}
              opacity={0.7}
            />
            {e.label !== '' && (
              <text
                data-edge-label={e.id}
                x={(from.x + to.x) / 2}
                y={mid}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={11}
                fill="var(--text-dim)"
                stroke="var(--bg)"
                strokeWidth={3}
                strokeLinejoin="round"
                paintOrder="stroke"
              >
                {e.label}
              </text>
            )}
          </g>
        )
      })}
    </>
  )
}
