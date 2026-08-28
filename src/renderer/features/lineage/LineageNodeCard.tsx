// b3: P7-H
/**
 * LineageNodeCard —— 单节点卡面渲染（R2-LG9 星象板视觉，LineageCanvas
 * 拆件——组件 ≤250 行红线，F-07 SelectionRects 拆件先例）。
 *
 * - 卡面=defs linearGradient 渐变面（lg-node-face 165° 三档——rect 无
 *   多背景，mockup 注意事项 ⑤）+rx 14+金系半透明描边；L 形金角饰两枚
 *   path（data-corner 测试钩——rect 无 ::before 伪元素面）。
 * - 主题节点（paperId null）=虚线银描边+半透明渐变面（lg-node-face-theme）。
 * - 选中态=金描边加粗+外光（复用 svg 顶层 lg-edge-glow 滤器）+data-selected。
 * - 文本：题名 #f5f3ea（提纯白与金年份拉开层级——票面 P2）；年份=
 *   --font-display 15px 金 --gold-bright+letter-spacing（衬线年份仪式感）。
 * - 结构红线（e2e lineage.spec）：g[data-node-id]/data-kind/transform 串
 *   格式/内含标题与纯数字年份文本全保留；**不渲染「已绑定文献」文本
 *   badge**——e2e T4 getByText('已绑定文献') strict 单源在侧板，画布加
 *   同名文本即 strict violation 必红（主控预裁：优先调整实现保断言）。
 */
import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from 'react'
import type { LineageNode } from '@shared/models/lineage'
import { NODE_H, NODE_W } from './lineage-layout'

/** L 形角饰臂长（mockup ::before 12px 逐值） */
const CORNER_ARM = 12
// 角饰骑在 rect 圆角外侧（mockup top:-1px left:-1px 同位语）——SVG path 描边实现
const CORNER_TL = `M ${-NODE_W / 2 - 0.5} ${-NODE_H / 2 + CORNER_ARM} L ${-NODE_W / 2 - 0.5} ${
  -NODE_H / 2 - 0.5
} L ${-NODE_W / 2 + CORNER_ARM} ${-NODE_H / 2 - 0.5}`
const CORNER_BR = `M ${NODE_W / 2 + 0.5} ${NODE_H / 2 - CORNER_ARM} L ${NODE_W / 2 + 0.5} ${
  NODE_H / 2 + 0.5
} L ${NODE_W / 2 - CORNER_ARM} ${NODE_H / 2 + 0.5}`

export function LineageNodeCard(props: {
  node: LineageNode
  pos: { x: number; y: number }
  /** 拖拽期实时跟随偏移（null=静止） */
  offset: { dx: number; dy: number } | null
  selected: boolean
  onPointerDown: (e: ReactPointerEvent<SVGGElement>) => void
  onContextMenu: (e: ReactMouseEvent<SVGGElement>) => void
}): JSX.Element {
  const { node: n, selected: sel } = props
  const theme = n.paperId === null
  return (
    <g
      data-node-id={n.id}
      data-kind={theme ? 'theme' : 'paper'}
      transform={`translate(${props.pos.x + (props.offset?.dx ?? 0)}, ${props.pos.y + (props.offset?.dy ?? 0)})`}
      onPointerDown={props.onPointerDown}
      onContextMenu={props.onContextMenu}
    >
      <rect
        x={-NODE_W / 2}
        y={-NODE_H / 2}
        width={NODE_W}
        height={NODE_H}
        rx={14}
        fill={theme ? 'url(#lg-node-face-theme)' : 'url(#lg-node-face)'}
        stroke={theme ? '#9aa3c0' : 'var(--gold-night)'}
        strokeOpacity={sel ? 1 : theme ? 0.55 : 0.42}
        strokeWidth={sel ? 2.5 : 1}
        strokeDasharray={theme ? '6 4' : undefined}
        filter={sel ? 'url(#lg-edge-glow)' : undefined}
        data-selected={sel}
      />
      {/* L 形金角饰（左上/右下各一） */}
      <path data-corner="tl" d={CORNER_TL} fill="none" stroke="var(--gold-night)" strokeOpacity={0.55} strokeWidth={1.5} />
      <path data-corner="br" d={CORNER_BR} fill="none" stroke="var(--gold-night)" strokeOpacity={0.55} strokeWidth={1.5} />
      <text x={0} y={-8} textAnchor="middle" fontSize={12.5} fill="#f5f3ea">
        {n.title}
      </text>
      <text
        x={0}
        y={16}
        textAnchor="middle"
        fontSize={15}
        fill="var(--gold-bright)"
        style={{ fontFamily: 'var(--font-display)', letterSpacing: '1.5px' }}
      >
        {n.year === null ? '未知年份' : String(n.year)}
      </text>
    </g>
  )
}
