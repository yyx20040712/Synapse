// b3: P7-H
/**
 * LineageEdges —— 父子连线+边 label 渲染（R2-LG11 浅色严谨板改版；
 * LineageCanvas 拆件——组件 ≤250 行红线，缺陷 E1 修先例）。
 *
 * - **边四型（§1.1.3 矩阵扩 F-LG15，优先级=综述关联>人工>推断>普通）**：
 *   普通 tree 边=var(--node-branch) 1.2 实线；推断边（label 含「推断」）=
 *   #8a94a6 1.2 虚线 5 4；综述关联边（from/to 任一 ∈ surveyIds 或 kind=ref）=
 *   var(--survey-edge) 1.4 虚线 2 3（决3「很淡的灰色虚线」）；人工补父边
 *   （kind=manual，F-LG15）=var(--manual-edge) 1.4 虚线 7 5（琥珀长虚线——
 *   与 tree 实线/ref 点线三方色型双区分）。glow filter 全撤（浅色板）。
 * - **边 label=F-L1-C 变体 C 窄幅注释**（案册定稿 2026-08-30 用户裁决）：
 *   foreignObject 恒 130×37.05（EDGE_LABEL_MAX_W/H 单源——渲染盒恒上限，
 *   短标签透明空区无视觉影响，FO pointerEvents none）内 HTML div
 *   `lineage-edge-label`（皮肤类驻 theme.css：9.5px 斜体 #6b7280 白晕
 *   text-shadow；自然换行 break-word+max-height 3 行+overflow hidden——
 *   真实溢出内容承载滚动语义）+title 全文 tooltip（U2a 同款）。
 *   锚点=props.slots 槽位（Canvas 从 edge-label-layout 放置器算入，
 *   防重叠+F-L1-C 保证①）；**缺省回退贝塞尔中点**（中点公式 y1/y2/mid/x
 *   与 Canvas slots 构建同式——重复第 2 次保持（Rule of Three），两处互指）。
 * - **悬停滚动（用户保证②）**：`.lineage-edge-label:hover` overflow-y auto
 *   （CSS 类承载交互态——B1 教训禁内联）+g 根一条原生 wheel 委托 listener：
 *   截断标签（scrollHeight>clientHeight+1）上 stopPropagation 阻断画布
 *   zoom（标签内滚动查看截断文字）；未截断不吞 zoom（主控预裁 4）。
 *   **挂原生不挂 React onWheel**：React 合成 wheel 委托在 root，时序晚于
 *   svg 上的原生 zoom listener——stopPropagation 到时 zoom 已发生；g 根
 *   原生 bubble 先于 svg 到达，时序成立（INV-14 成对清理同款 useEffect）。
 *   pointerdown 不拦截（冒泡——标签上起手仍可拖画布；pan 起手面小损
 *   130×37 在档声明）。
 * - 端点 y1/y2=geom 半高（INV-38 nodeHeight 单源经 geom 预构建——
 *   props 形状=Map<id,{x,y,halfH}>，LineageCanvas 布局后一次构建传入，
 *   **禁每边 O(n) 重扫全表**）。
 * - 连线=from 底边中心→to 顶边中心垂直主导贝塞尔（data-edge-id 测试钩）。
 */
import { useEffect, useRef } from 'react'
import type { LineageEdge } from '@shared/models/lineage'
import { EDGE_LABEL_H, EDGE_LABEL_MAX_W } from './edge-label-layout'

/** 推断边标记（label 含「推断」两字即推断型） */
const INFERRED_MARK = '推断'
/** 推断边色（浅色板灰蓝） */
const INFERRED_STROKE = '#8a94a6'

export function LineageEdges(props: {
  edges: LineageEdge[]
  /** 节点几何（中心 x/y+半高——Canvas 从 layout.positions+nodeHeight 预构建） */
  geom: Map<string, { x: number; y: number; halfH: number }>
  /** 综述节点 id 集（Canvas 预计算——综述关联边判定） */
  surveyIds: Set<string>
  /** 标签槽位（F-L1-C 放置器产物——缺省回退贝塞尔中点，组件向后兼容） */
  slots?: Map<string, { x: number; y: number }>
}): JSX.Element {
  // 悬停滚动阻断：g 根一条 wheel 委托（时序依据见头注）；INV-14 成对清理
  const rootRef = useRef<SVGGElement | null>(null)
  useEffect(() => {
    const g = rootRef.current
    if (g === null) return
    const onWheel = (e: WheelEvent): void => {
      const t = e.target instanceof Element ? e.target : null
      const label = t?.closest('.lineage-edge-label') ?? null
      if (label === null) return
      // 仅截断标签（scrollHeight>clientHeight+1）主动滚动+全阻断——未截断
      // 不吞 zoom（主控预裁 4）。回炉 1 R2：Chromium foreignObject 内滚轮
      // 路由到 HTML 滚动盒未证实（探针程序化 scrollTop 可行/wheel 后 0 为
      // 重叠污染读数）——handler 主动 scrollTop（钳 [0, max]）保证滚动语义；
      // stopPropagation 阻断冒泡（svg zoom listener 在祖先链）+preventDefault
      // 禁默认行为（zoom/页面滚全禁，语义强于纯阻断）
      if (label.scrollHeight > label.clientHeight + 1) {
        e.stopPropagation()
        e.preventDefault()
        label.scrollTop = Math.max(
          0,
          Math.min(label.scrollTop + e.deltaY, label.scrollHeight - label.clientHeight)
        )
      }
    }
    g.addEventListener('wheel', onWheel)
    return () => g.removeEventListener('wheel', onWheel)
  }, [])
  return (
    <g ref={rootRef}>
      {props.edges.map((e) => {
        const from = props.geom.get(e.fromNode)
        const to = props.geom.get(e.toNode)
        if (from === undefined || to === undefined) return null
        const y1 = from.y + from.halfH
        const y2 = to.y - to.halfH
        const mid = (y1 + y2) / 2
        // 边四型优先级（R2-LG12 扩+F-LG15 门一 W1 修正）：manual>ref≈综述关联>
        // 推断>普通——manual（F-LG15 人工补父）=琥珀 var(--manual-edge) 1.4 虚线
        // 7 5（与 tree 实线/ref 点线 2 3 三方色型双区分——用户「线的颜色和样式
        // 要有区分度」）**优先于 surveyIds 标题启发**（综述作人工父是合理场景，
        // 启发吞色=区分度丢失——门一 W1 处置）；ref 与综述关联保持同视觉（决3
        // 「很淡的灰色虚线」单语义——var(--survey-edge) 1.4 虚线 2 3）；manual/
        // ref 直读 e.kind（LineageEdge 出口已带 kind——主控预裁 7）
        const manual = e.kind === 'manual'
        const survey =
          !manual &&
          (e.kind === 'ref' || props.surveyIds.has(e.fromNode) || props.surveyIds.has(e.toNode))
        const inferred = e.label.includes(INFERRED_MARK)
        const stroke = survey
          ? 'var(--survey-edge)'
          : manual
            ? 'var(--manual-edge)'
            : inferred
              ? INFERRED_STROKE
              : 'var(--node-branch)'
        const slot = props.slots?.get(e.id)
        const cx = slot?.x ?? (from.x + to.x) / 2
        const cy = slot?.y ?? mid
        return (
          <g key={e.id}>
            <path
              data-edge-id={e.id}
              d={`M ${from.x} ${y1} C ${from.x} ${mid}, ${to.x} ${mid}, ${to.x} ${y2}`}
              fill="none"
              stroke={stroke}
              strokeWidth={survey || manual ? 1.4 : 1.2}
              strokeDasharray={survey ? '2 3' : manual ? '7 5' : inferred ? '5 4' : undefined}
            />
            {e.label !== '' && (
              <foreignObject
                x={cx - EDGE_LABEL_MAX_W / 2}
                y={cy - EDGE_LABEL_H / 2}
                width={EDGE_LABEL_MAX_W}
                height={EDGE_LABEL_H}
                style={{ pointerEvents: 'none' }}
              >
                <div data-edge-label={e.id} className="lineage-edge-label" title={e.label}>
                  {e.label}
                </div>
              </foreignObject>
            )}
          </g>
        )
      })}
    </g>
  )
}
