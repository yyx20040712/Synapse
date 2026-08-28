// b3: P7-H
/**
 * LineageEdges —— 父子连线+边 label 渲染（LineageCanvas 拆件——组件
 * ≤250 行红线拆分预案落点，缺陷 E1 修）。
 * [R2-LG9] 边辉：实链=金描边+glow 滤器（svg 顶层 defs#lg-edge-glow）；
 * 推断边（label 含「推断」）=虚线银 #9aa3c0 无辉；边 label=夜色胶囊
 * halo（paintOrder=stroke 底色描边——胶囊近似：SVG 无文本宽度测量
 * 原语，真 rect 胶囊需 DOM 交互破坏纯渲染，以 stroke linejoin=round
 * 近似 mockup .edge-label 玻璃胶囊）。
 *
 * - 连线=from 底边中心→to 顶边中心垂直主导贝塞尔（data-edge-id 测试钩）。
 * - 边 label=贝塞尔中点近似 ((from.x+to.x)/2, mid) 渲染真实文本，空串
 *   不渲染（无 text 节点）；data-edge-label 钩保留。
 * - 坐标=卡片中心（layoutLineage 产出），positions 形状用结构类型不引
 *   LayoutResult（防 layout 模块循环依赖）。
 */
import type { LineageEdge } from '@shared/models/lineage'
import { NODE_H } from './lineage-layout'

/** 推断边标记（mockup 边型语义：label 含「推断」两字即推断型） */
const INFERRED_MARK = '推断'
/** 推断边银（mockup .legend i.dash 边色逐值） */
const INFERRED_STROKE = '#9aa3c0'

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
        const inferred = e.label.includes(INFERRED_MARK)
        return (
          <g key={e.id}>
            <path
              data-edge-id={e.id}
              d={`M ${from.x} ${y1} C ${from.x} ${mid}, ${to.x} ${mid}, ${to.x} ${y2}`}
              fill="none"
              stroke={inferred ? INFERRED_STROKE : 'var(--gold-night)'}
              strokeOpacity={inferred ? 0.6 : 0.8}
              strokeWidth={inferred ? 1.3 : 1.7}
              strokeDasharray={inferred ? '5 4' : undefined}
              filter={inferred ? undefined : 'url(#lg-edge-glow)'}
            />
            {e.label !== '' && (
              <text
                data-edge-label={e.id}
                x={(from.x + to.x) / 2}
                y={mid}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={10.5}
                fill="var(--text-on-night)"
                stroke="var(--night-bg2)"
                strokeWidth={3.5}
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
