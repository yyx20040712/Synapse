// b3: P7-H
/**
 * LineageNodeCard —— 单节点卡面渲染（R2-LG11 浅色严谨板整件重制，
 * LineageCanvas 拆件——组件 ≤250 行红线）。
 *
 * - 白卡严谨板（决1/决5+U2a）：rect rx=8+fill #ffffff（无渐变无填充
 *   纹理）+细边框编码；L 形金角饰/渐变面/选中外光全删（方案切换=删旧）。
 * - **边框编码矩阵（决1 A 线型×色阶，测试逐格断言）**：
 *   文献·核心（props.core——Canvas 经 classify.isCore 预计算）=
 *   var(--accent) 1.5 实线；文献·普通=var(--node-branch) 1 实线；
 *   主题（paperId null）与综述（isSurvey(title)）=branch 1 虚线 6 4。
 *   选中态任一类 strokeWidth+0.75（核心 2.25/其余 1.75）+data-selected。
 * - **题名换行（U2a 根修）**：foreignObject 内 HTML div（零依赖红线）
 *   ——题名 12.5px/18px/-webkit-line-clamp:3/-webkit-box-orient:vertical/
 *   overflow:hidden；全文 tooltip=题名 div title 属性（HTML 原生——SVG <title> 与题名文本同名双元素撞 e2e strict，T1 实录）；年份行=
 *   12px var(--text-dim) UI 字体（决5——去衬线与 letterSpacing），year
 *   null 仍渲染「未知年份」。
 * - 卡几何：宽=nodeWidth(title)（INV-36）/高=nodeHeight(title)（INV-38
 *   高度单源——1/2/3 行=64/82/100）；foreignObject 骨架 x=-w/2+12、
 *   width=w-24、y=-h/2、height=h；内 div flex column（题名区自顶
 *   padding 10px flex:1+年份行卡底 padding 12px 居中）。
 * - data-kind 四值：theme/paper/survey（综述=isSurvey 判定，卡内自算
 *   ——与 classify 单源）；既有 theme/paper 值零变（e2e T2/T4 断言面）。
 * - 结构红线（e2e lineage.spec）：g[data-node-id]/transform 串格式/
 *   内含标题与纯数字年份文本全保留；**不渲染「已绑定文献」badge**
 *   （e2e T4 getByText strict 单源在侧板）。
 */
import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from 'react'
import type { LineageNode } from '@shared/models/lineage'
import { nodeHeight, nodeWidth } from './lineage-layout'
import { isSurvey } from './lineage-classify'

/** 题名区样式（line-clamp 三行——Chromium -webkit-box 组合实测） */
const TITLE_STYLE = {
  paddingTop: 10,
  flex: 1,
  fontSize: '12.5px',
  lineHeight: '18px',
  color: 'var(--text)',
  display: '-webkit-box',
  WebkitLineClamp: 3,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden'
} as const

export function LineageNodeCard(props: {
  node: LineageNode
  pos: { x: number; y: number }
  /** 拖拽期实时跟随偏移（null=静止） */
  offset: { dx: number; dy: number } | null
  selected: boolean
  /** 核心档（决2 D1'——Canvas 预计算传入，卡内不自算） */
  core: boolean
  onPointerDown: (e: ReactPointerEvent<SVGGElement>) => void
  onContextMenu: (e: ReactMouseEvent<SVGGElement>) => void
}): JSX.Element {
  const { node: n, selected: sel } = props
  const theme = n.paperId === null
  const survey = !theme && isSurvey(n.title)
  const w = nodeWidth(n.title)
  const h = nodeHeight(n.title)
  const dashed = theme || survey
  const strokeWidth = (props.core ? 1.5 : 1) + (sel ? 0.75 : 0)
  return (
    <g
      data-node-id={n.id}
      data-kind={theme ? 'theme' : survey ? 'survey' : 'paper'}
      transform={`translate(${props.pos.x + (props.offset?.dx ?? 0)}, ${props.pos.y + (props.offset?.dy ?? 0)})`}
      onPointerDown={props.onPointerDown}
      onContextMenu={props.onContextMenu}
    >
      <rect
        x={-w / 2}
        y={-h / 2}
        width={w}
        height={h}
        rx={8}
        fill="#ffffff"
        stroke={props.core ? 'var(--accent)' : 'var(--node-branch)'}
        strokeWidth={strokeWidth}
        strokeDasharray={dashed ? '6 4' : undefined}
        data-selected={sel}
      />
      {/* 全文 tooltip=HTML title 属性（foreignObject 截断后全文可达）。不用
          SVG <title> 元素：其文本入 DOM 树与题名 div 构成同名双元素，e2e
          getByText strict violation 必红（T1 实录——NodeCard 头注「优先调整
          实现保断言」先例执行）；HTML 属性值不入 textContent 单源保持 */}
      <foreignObject x={-w / 2 + 12} y={-h / 2} width={w - 24} height={h}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={TITLE_STYLE} title={n.title}>
            {n.title}
          </div>
          <div
            style={{
              paddingBottom: 12,
              textAlign: 'center',
              fontSize: '12px',
              color: 'var(--text-dim)'
            }}
          >
            {n.year === null ? '未知年份' : String(n.year)}
          </div>
        </div>
      </foreignObject>
    </g>
  )
}
