// b3: P7-H
/**
 * LineageEdges —— 父子连线+边 label 渲染（R2-LG11 浅色严谨板改版；
 * LineageCanvas 拆件——组件 ≤250 行红线，缺陷 E1 修先例）。
 *
 * - **边三型（§1.1.3 矩阵，优先级=综述关联>推断>普通）**：
 *   普通 tree 边=var(--node-branch) 1.2 实线；推断边（label 含「推断」）=
 *   #8a94a6 1.2 虚线 5 4；综述关联边（from/to 任一 ∈ surveyIds）=
 *   var(--survey-edge) 1.4 虚线 2 3（决3「很淡的灰色虚线」）。glow
 *   filter 全撤（浅色板）。
 * - 边 label=贝塞尔中点真实文本，空串不渲染；halo 胶囊改白底
 *   （stroke #ffffff+文字 #4a5060，paintOrder=stroke 形态保留——SVG
 *   无文本宽度测量原语，stroke linejoin=round 近似胶囊）。
 * - 端点 y1/y2=geom 半高（INV-38 nodeHeight 单源经 geom 预构建——
 *   props 形状=Map<id,{x,y,halfH}>，LineageCanvas 布局后一次构建传入，
 *   **禁每边 O(n) 重扫全表**）。
 * - 连线=from 底边中心→to 顶边中心垂直主导贝塞尔（data-edge-id 测试钩）。
 */
import type { LineageEdge } from '@shared/models/lineage'

/** 推断边标记（label 含「推断」两字即推断型） */
const INFERRED_MARK = '推断'
/** 推断边色（浅色板灰蓝） */
const INFERRED_STROKE = '#8a94a6'
/** 边 label 文字色（浅色板墨灰） */
const LABEL_FILL = '#4a5060'

export function LineageEdges(props: {
  edges: LineageEdge[]
  /** 节点几何（中心 x/y+半高——Canvas 从 layout.positions+nodeHeight 预构建） */
  geom: Map<string, { x: number; y: number; halfH: number }>
  /** 综述节点 id 集（Canvas 预计算——综述关联边判定） */
  surveyIds: Set<string>
}): JSX.Element {
  return (
    <>
      {props.edges.map((e) => {
        const from = props.geom.get(e.fromNode)
        const to = props.geom.get(e.toNode)
        if (from === undefined || to === undefined) return null
        const y1 = from.y + from.halfH
        const y2 = to.y - to.halfH
        const mid = (y1 + y2) / 2
        const survey = props.surveyIds.has(e.fromNode) || props.surveyIds.has(e.toNode)
        const inferred = e.label.includes(INFERRED_MARK)
        const stroke = survey ? 'var(--survey-edge)' : inferred ? INFERRED_STROKE : 'var(--node-branch)'
        return (
          <g key={e.id}>
            <path
              data-edge-id={e.id}
              d={`M ${from.x} ${y1} C ${from.x} ${mid}, ${to.x} ${mid}, ${to.x} ${y2}`}
              fill="none"
              stroke={stroke}
              strokeWidth={survey ? 1.4 : 1.2}
              strokeDasharray={survey ? '2 3' : inferred ? '5 4' : undefined}
            />
            {e.label !== '' && (
              <text
                data-edge-label={e.id}
                x={(from.x + to.x) / 2}
                y={mid}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={10.5}
                fill={LABEL_FILL}
                stroke="#ffffff"
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
