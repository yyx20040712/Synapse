// b3: T3-P6
/**
 * [T3-P6] LineageTimeline —— 脉络纵向「年+月」时间线滚动容器宿主
 * （LineageCanvas[SVG 画布] 退役后的渲染层宿主——方案切换=删旧方案）。
 *
 * - 分组=lineage-timeline.ts groupTimeline 纯函数（year asc null 末→month
 *   asc null 末；组内序=传入序=graph.nodes lineageOrder 全序——INV-75 消费
 *   方不得重排）；计数（年头「N 篇」/月标签「M 月 · N 篇」/「未定月 ·
 *   N 篇」）均自分组结果派生（禁第二实现）。
 * - 骑缝编号=shared lineageCatalogNos 单源（INV-76 第四消费面——useMemo
 *   全图一次计算传卡，禁每卡重算；编号随全序漂移=特性）；「核」徽章=
 *   classify.isCore 预计算 Map 传卡（决2 D1' 单源）；「综述」=isSurveyTitle
 *   （shared 单源经 classify re-export，禁重写）。
 * - rowshift 砖砌行错位（A2/D2）：useLayoutEffect 读各月框内卡 offsetTop→
 *   rowsFromOffsetTops 分行→0 起奇数索引行挂 .rowshift（62px 右移——
 *   主控裁决口径）；依赖=分组结果（重排/改月后自然重算）；分行域=框内
 *   （跨框 offsetTop 基准不同不可比）。
 * - 空图空态文案保活（「暂无脉络图——导入草稿或添加节点」）；交互接缝：
 *   卡 onClick 上抛 onNodeClick（03 编辑层/04 侧板链路零动）、
 *   onContextMenu 上抛（节点菜单锚点）。pan/zoom/视口态（INV-43/44）与
 *   x/y 自由拖拽随本票退役=滚动定位语义；P7 连线系统走 .tl-month 右侧
 *   58px 绕行走廊预留（final-design §2.1）。
 * - 未定月=.tl-month.unknown 且仅月标签级变体（框本体不变体随 dashed
 *   --month-dash——mockup L239）。
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { LineageEdge, LineageNode, LineTypeGroup } from '@shared/models/lineage'
import { lineageCatalogNos } from '@shared/models/lineage'
import type { LineagePaperMetrics } from '@shared/ipc/schemas'
import { isCore } from './lineage-classify'
import { groupTimeline, rowsFromOffsetTops } from './lineage-timeline'
import { EdgeOverlay } from './EdgeOverlay'
import { LineageTimelineCard } from './LineageTimelineCard'

/** [T3-P7A] 图例四基础型（D-18 映射序：accent 实/accent 虚/faint 点/signal 虚） */
const LEGEND_ITEMS = [
  { cls: 'lc', text: '继承' },
  { cls: 'lc i2', text: '推断' },
  { cls: 'lc i3', text: '综述关联' },
  { cls: 'lc i4', text: '人工补线' }
] as const

/** 03 编辑层/04 侧板消费的节点交互回调（全可选——缺省即纯只读） */
export interface TimelineCallbacks {
  /** 单击选中（04 侧板消费面上抛） */
  onNodeClick?: (nodeId: string) => void
  /** 右键节点开菜单（03 节点菜单锚点） */
  onNodeContextMenu?: (nodeId: string, position: { x: number; y: number }) => void
}

export function LineageTimeline(props: {
  nodes: LineageNode[]
  edges: LineageEdge[]
  selectedNodeId?: string | null
  /** F-LG14 含金量摘要表（键=paperId；Board 自 store 分发传入；缺省=空表） */
  paperMetrics?: Record<string, LineagePaperMetrics>
  /** [T3-P7A] 线型组（EdgeOverlay sub 覆盖渲染消费——缺省=空表基础型渲染） */
  lineTypes?: LineTypeGroup[]
} & TimelineCallbacks): JSX.Element {
  const { nodes, edges } = props
  const paperMetrics = props.paperMetrics ?? {}
  const groups = useMemo(() => groupTimeline(nodes), [nodes])
  // INV-76：编号单源全图一次（呈现序=lineageOrder 全序，与组内传入序无关）
  const catalogNos = useMemo(() => lineageCatalogNos(nodes), [nodes])
  // 核心档预计算（决2 D1'——classify 单源；卡内不自算）
  const coreIds = useMemo(
    () => new Map(nodes.map((n) => [n.id, isCore(n, edges)])),
    [nodes, edges]
  )

  // 砖砌行错位：分行域=各月框内；依赖=分组结果+shiftedIds 自身=**不动点迭代**
  // （d1-W1 回炉：shift 改变 flex 换行→单次测量行号≠最终行号）。**测量冻结**
  // （三过 d1-W1 加固）：迭代期间容器挂 .tl-measure 冻结 margin-left 过渡
  // ——否则 transition 使同步复测读到过渡起点布局（旧 margin），迭代退化为
  // 「单轮赋值+空确认」且 shift 引起的行容量变化永不复测；冻结=量测恒为
  // 终态布局，集合相等短路收敛（同数据同终态幂等）。代价=shift 挂摘无平滑
  // 过渡（视觉细调收口轮备案）。真实布局下单调收敛（shift 增宽占用→行数
  // 只增不减）；iterRef 上限 8=振荡守卫（k1-W2：CSS 演进破坏单调性时停）
  const contentRef = useRef<HTMLDivElement | null>(null)
  const iterRef = useRef(0)
  const [shiftedIds, setShiftedIds] = useState<ReadonlySet<string>>(() => new Set())
  // [T3-P7A 回炉 1 W1/W6] 连线层再触发信号：不动点收敛/守卫停的分支父组件
  // 不再 setState（React 子 effect 先于父）——bump routeEpoch 显式通知
  // EdgeOverlay 重算（tl-measure 移除与 bump 同 commit）
  const [routeEpoch, setRouteEpoch] = useState(0)
  useLayoutEffect(() => {
    const content = contentRef.current
    if (content === null) return
    content.classList.add('tl-measure')
    const next = new Set<string>()
    for (const frame of Array.from(content.querySelectorAll('.month-frame'))) {
      const cards = Array.from(frame.querySelectorAll<HTMLElement>('[data-node-id]'))
      const rows = rowsFromOffsetTops(cards.map((c) => c.offsetTop))
      cards.forEach((card, i) => {
        if (rows[i]! % 2 === 1) next.add(card.dataset.nodeId ?? '')
      })
    }
    // 不动点判定：新集合与渲染所用集合相同→布局已稳定，解冻停；否则再测
    let same = next.size === shiftedIds.size
    if (same) {
      for (const id of next) {
        if (!shiftedIds.has(id)) {
          same = false
          break
        }
      }
    }
    if (same || iterRef.current >= 8) {
      iterRef.current = 0
      content.classList.remove('tl-measure')
      setRouteEpoch((v) => v + 1)
      return
    }
    iterRef.current++
    setShiftedIds(next)
  }, [groups, shiftedIds])

  if (nodes.length === 0) {
    // 空态不短路滚动容器结构（沿 Canvas 空态语义：文案常驻、无死按钮）
    return (
      <div className="timeline" data-testid="lineage-timeline">
        <div className="tl-empty">暂无脉络图——导入草稿或添加节点</div>
      </div>
    )
  }
  return (
    <div className="timeline" data-testid="lineage-timeline">
      <div className="tl-content" ref={contentRef}>
        {/* [T3-P7A] 连线层子组件（D-22：shiftedIds/groups=重算触发——砖砌收敛
            即快照采集终态；svg z 低于卡、测量冻结期 CSS 置 opacity:0） */}
        <EdgeOverlay
          nodes={nodes}
          edges={edges}
          lineTypes={props.lineTypes ?? []}
          shiftedIds={shiftedIds}
          groups={groups}
          routeEpoch={routeEpoch}
        />
        {groups.map((g) => {
          const yearCount = g.months.reduce((sum, m) => sum + m.nodes.length, 0)
          return (
            <section
              className="tl-year"
              key={g.year === null ? 'null' : String(g.year)}
              data-year={g.year === null ? 'null' : g.year}
            >
              <div className="tl-year-head">
                {/* 年份头数字无「年」字（mockup 纯数字）；null 年=「未知年份」文案保活 */}
                <span className="tl-year-num">{g.year === null ? '未知年份' : g.year}</span>
                <span className="tl-year-meta">{yearCount} 篇</span>
              </div>
              {g.months.map((m) => (
              <div
                className={m.month === null ? 'tl-month unknown' : 'tl-month'}
                key={m.month === null ? 'null' : String(m.month)}
              >
                {/* 月标签与月框=兄弟（挂 .tl-month 下，同 mockup DOM）——
                    d1-B1 回炉：挂在 .month-frame 内会被其 overflow:hidden 裁掉
                    top:-9px 悬出段；.tl-month 为 position:relative 定位基准 */}
                <span className="month-tag">
                  {m.month === null
                    ? `未定月 · ${m.nodes.length} 篇`
                    : `${m.month} 月 · ${m.nodes.length} 篇`}
                </span>
                <div className="month-frame">
                  {m.nodes.map((n) => (
                    <LineageTimelineCard
                      key={n.id}
                      node={n}
                      no={
                        // 同源 useMemo 必中（catalogNos 与 nodes 同依赖构建）；
                        // ?? 0=防御面（d1-N1：不变量破坏时呈 #000 可辨认非崩）
                        catalogNos.get(n.id) ?? 0
                      }
                      core={coreIds.get(n.id) === true}
                      metrics={n.paperId !== null ? (paperMetrics[n.paperId] ?? null) : null}
                      selected={props.selectedNodeId === n.id}
                      shift={shiftedIds.has(n.id)}
                      onNodeClick={props.onNodeClick}
                      onNodeContextMenu={props.onNodeContextMenu}
                    />
                  ))}
                </div>
              </div>
              ))}
            </section>
          )
        })}
      </div>
      {/* [T3-P7A 回炉 1 W7] 图例挂滚动容器 .timeline（视口级恒可见——内容盒
          会随滚动移出；absolute right/bottom 对 .timeline 定位）。四基础型
          真文本+线样预览 i（mockup L212-217 .lc 族誊录——D-18 映射序） */}
      <div className="tl-legend">
        {LEGEND_ITEMS.map((it) => (
          <span className={it.cls} key={it.text}>
            <i />
            {it.text}
          </span>
        ))}
      </div>
    </div>
  )
}
