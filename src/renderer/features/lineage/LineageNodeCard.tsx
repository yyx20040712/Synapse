// b3: P7-H
/**
 * LineageNodeCard —— 单节点卡面渲染（R2-LG11 浅色严谨板整件重制，
 * LineageCanvas 拆件——组件 ≤250 行红线；F-LG13 统一尺寸+题名滚动改版）。
 *
 * - 白卡严谨板（决1/决5+U2a）：rect rx=8+fill #ffffff（无渐变无填充
 *   纹理）+细边框编码；L 形金角饰/渐变面/选中外光全删（方案切换=删旧）。
 * - **统一卡尺寸（F-LG13，用户令「方框都一样大小」）**：宽=nodeWidth(title)
 *   恒 240（INV-36 修订）/高=nodeHeight(title) 恒 110（INV-38 修订）——
 *   全节点（文献/主题/综述）同宽同高，题名长短不再改卡几何。
 * - **题名滚动区（F-LG13，用户令「信息显示不下给题目加滚动条」）**：
 *   foreignObject 内题名 div overflow-y auto+scrollbar-width thin——完整
 *   文本常驻 DOM（line-clamp 三行截断删除，方案切换=删旧）；全文 tooltip=
 *   题名 div title 属性保持（HTML 原生）。**滚轮归属（主控裁决，票面 §1）**：
 *   g 根原生 wheel 委托（LineageEdges 同款——React 合成 onWheel 委托在
 *   root，时序晚于 svg 原生 zoom listener，stopPropagation 不可达；g 根
 *   原生 bubble 先于 svg 到达）：题名溢出（scrollHeight>clientHeight+1）时
 *   stopPropagation 阻断画布 zoom+preventDefault+主动 scrollTop 钳滚动
 *   （Chromium foreignObject 滚轮路由不确定——INV-41 回炉 1 R2 同款）；
 *   未溢出不吞 zoom（滚轮归画布缩放）。滚动条拖动=原生行为恒归题名
 *   （不产生 wheel 事件，无抢占面）。
 * - **底行信息区（主控裁决 6——F-LG14 填充锚）**：卡底恒 24px 行
 *   （data-card-footer）承载年份；F-LG14 接着填含金量/年份/标签——高度
 *   含在统一高 110 内，14 不再改卡结构常量。
 * - **边框编码矩阵（决1 A 线型×色阶，测试逐格断言）**：
 *   文献·核心（props.core——Canvas 经 classify.isCore 预计算）=
 *   var(--accent) 1.5 实线；文献·普通=var(--node-branch) 1 实线；
 *   主题（paperId null）与综述（isSurvey(title)）=branch 1 虚线 6 4。
 *   选中态任一类 strokeWidth+0.75（核心 2.25/其余 1.75）+data-selected。
 * - 年份行=12px var(--text-dim) UI 字体（决5），year null 仍渲染「未知年份」。
 * - data-kind 四值：theme/paper/survey（综述=isSurvey 判定，卡内自算
 *   ——与 classify 单源）；既有 theme/paper 值零变（e2e T2/T4 断言面）。
 * - 结构红线（e2e lineage.spec）：g[data-node-id]/transform 串格式/
 *   内含标题与纯数字年份文本全保留；**不渲染「已绑定文献」badge**
 *   （e2e T4 getByText strict 单源在侧板）。
 */
import { useEffect, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from 'react'
import type { LineageNode } from '@shared/models/lineage'
import { nodeHeight, nodeWidth } from './lineage-layout'
import { isSurvey } from './lineage-classify'

/**
 * 题名区样式（F-LG13 滚动区：完整文本+overflow-y auto+细滚动条；
 * flex 子项 overflow 非 visible→自动最小尺寸 0，flex:1 收缩后滚动自然生效
 * ——minHeight 0 显式声明为防御）。
 */
const TITLE_STYLE = {
  paddingTop: 8,
  flex: 1,
  minHeight: 0,
  fontSize: '12.5px',
  lineHeight: '18px',
  color: 'var(--text)',
  overflowY: 'auto',
  scrollbarWidth: 'thin',
  overflowWrap: 'break-word'
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
  // 题名滚轮归属（头注：g 根原生 wheel 委托，时序依据 LineageEdges 同款）；
  // INV-14 成对注册成对清理（挂载一次常活，deps []——titleRef 经 ref 取最新）
  const rootRef = useRef<SVGGElement | null>(null)
  const titleRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const g = rootRef.current
    if (g === null) return
    const onWheel = (e: WheelEvent): void => {
      const t = titleRef.current
      if (t === null) return
      // 仅题名溢出时主动滚动+全阻断（hover 该节点隐含于事件命中卡内）；
      // 未溢出不吞 zoom（滚轮归画布缩放——主控裁决交互抢占面）
      if (t.scrollHeight > t.clientHeight + 1) {
        e.stopPropagation()
        e.preventDefault()
        t.scrollTop = Math.max(
          0,
          Math.min(t.scrollTop + e.deltaY, t.scrollHeight - t.clientHeight)
        )
      }
    }
    g.addEventListener('wheel', onWheel)
    return () => g.removeEventListener('wheel', onWheel)
  }, [])
  return (
    <g
      ref={rootRef}
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
      {/* 全文 tooltip=HTML title 属性（题名区滚动后全文可达）。不用
          SVG <title> 元素：其文本入 DOM 树与题名 div 构成同名双元素，e2e
          getByText strict violation 必红（T1 实录——NodeCard 头注「优先调整
          实现保断言」先例执行）；HTML 属性值不入 textContent 单源保持 */}
      <foreignObject x={-w / 2 + 12} y={-h / 2} width={w - 24} height={h}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div ref={titleRef} style={TITLE_STYLE} title={n.title}>
            {n.title}
          </div>
          {/* 底行信息区（F-LG14 填充锚）：恒 24px——本票承载年份居中，
              F-LG14 接着填含金量/年份/标签（主控裁决 6：高度含在统一高内） */}
          <div
            data-card-footer
            style={{
              height: 24,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
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
