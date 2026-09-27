// b3: T3-P6
/**
 * [T3-P6] LineageTimeline —— 脉络纵向「年+月」时间线滚动容器宿主
 * （LineageCanvas[SVG 画布] 退役后的渲染层宿主——方案切换=删旧方案）。
 *
 * - 分组=lineage-timeline.ts groupTimeline 纯函数（year asc null 末→month
 *   asc null 末；组内序=传入序=graph.nodes lineageOrder 全序——INV-75 消费
 *   方不得重排）；计数均自分组结果派生（禁第二实现）。骑缝编号=shared
 *   lineageCatalogNos 单源（INV-76）+「核」徽章=isCore 预计算 Map+「综述」
 *   =isSurveyTitle（shared 单源）。年/月/卡渲染体=TimelineYears 拆件
 *   （[T3-P7B] 组件 250 行红线）。
 * - rowshift 砖砌行错位（A2/D2）：useLayoutEffect 不动点迭代+测量冻结
 *   （.tl-measure——d1-W1 三过加固；iterRef 上限 8=振荡守卫 k1-W2）。
 * - [T3-P7B] 编辑交互编排（useEdgeComposer 状态机+工具条换装+弹层挂载）：
 *   .timeline 挂 .editing（mode）/.link-pick（picker≠idle）；mode 态
 *   「view|edit」useState 驻本组件（composer hook 承载）=P8 共用面单源；
 *   命中层点击=EdgeOverlay onEdgeHitClick→composer（与 CSS pointer-events
 *   双闸）；拾取态点卡不转发 onNodeClick 选中；工具条（LineageToolbar
 *   换装 .lg-toolbar sticky）自本票移入渲染树——toolbar/actions props 经
 *   Board 下传（本件不触 store——纯 props 编排可直测）。
 * - 空图空态文案保活；工具条空图在场（导入=bootstrap 路径）。
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { LineageEdge, LineageEdgeKind, LineageNode, LineTypeGroup } from '@shared/models/lineage'
import { lineageCatalogNos } from '@shared/models/lineage'
import type { LineagePaperMetrics } from '@shared/ipc/schemas'
import { isCore } from './lineage-classify'
import { groupTimeline, rowsFromOffsetTops } from './lineage-timeline'
import { EdgeOverlay } from './EdgeOverlay'
import { EdgeTypePopover } from './EdgeTypePopover'
import { TimelineYears } from './TimelineYears'
import { LineageToolbar } from './LineageToolbar'
import { useEdgeComposer, type ClickEventLike } from './useEdgeComposer'

/** [T3-P7A] 图例四基础型（D-18 映射序：accent 实/accent 虚/faint 点/signal 虚） */
const LEGEND_ITEMS = [
  { cls: 'lc', text: '继承' },
  { cls: 'lc i2', text: '推断' },
  { cls: 'lc i3', text: '综述关联' },
  { cls: 'lc i4', text: '人工补线' }
] as const

/** [T3-P7B] 03 编辑层/04 侧板消费的节点交互回调（全可选——缺省即纯只读） */
export interface TimelineCallbacks {
  /** 单击选中（04 侧板消费面上抛；[T3-P7B] 事件透传=拾取定位面） */
  onNodeClick?: (nodeId: string, ev: ClickEventLike) => void
  /** 右键节点开菜单（03 节点菜单锚点） */
  onNodeContextMenu?: (nodeId: string, position: { x: number; y: number }) => void
}

/** [T3-P7B] 工具条 props（Board 下传——P7-H 既有行为面零变） */
export interface TimelineToolbarProps {
  saveStatus: 'saved' | 'saving' | 'error'
  lastWriteError: string | null
  onAddNode(): void
  onImportDraft(): void
  onRetrySave(): void
}

/** [T3-P7B] 线型编辑写路径（store 三 action+removeEdge——Board 自 store 下传） */
export interface EdgeLineActions {
  applyEdgeLine(edgeId: string, kind: LineageEdgeKind, sub: string | null): void
  linkWithLine(from: string, to: string, kind: LineageEdgeKind, sub: string | null): void
  saveLineTypes(groups: LineTypeGroup[]): void
  removeEdge(id: string): void
}

export function LineageTimeline(props: {
  nodes: LineageNode[]
  edges: LineageEdge[]
  selectedNodeId?: string | null
  /** F-LG14 含金量摘要表（键=paperId；Board 自 store 分发传入；缺省=空表） */
  paperMetrics?: Record<string, LineagePaperMetrics>
  /** [T3-P7A] 线型组（EdgeOverlay sub 覆盖渲染+P7B 弹层消费——缺省=空表） */
  lineTypes?: LineTypeGroup[]
  /** [T3-P7B] 工具条（缺省=saved 静默态） */
  toolbar?: TimelineToolbarProps
  /** [T3-P7B] 线型编辑写路径（缺省=零写只读——弹层 acts 走 no-op） */
  actions?: EdgeLineActions
} & TimelineCallbacks): JSX.Element {
  const { nodes, edges } = props
  const paperMetrics = props.paperMetrics ?? {}
  const lineTypes = props.lineTypes ?? []
  const groups = useMemo(() => groupTimeline(nodes), [nodes])
  const catalogNos = useMemo(() => lineageCatalogNos(nodes), [nodes])
  const coreIds = useMemo(
    () => new Map(nodes.map((n) => [n.id, isCore(n, edges)])),
    [nodes, edges]
  )

  // [T3-P7B] 连线编辑状态机（mode 单源驻此——P8 共用面）
  const composer = useEdgeComposer(edges)

  // 砖砌行错位：不动点迭代+测量冻结（d1-W1 三过加固；iterRef 上限 8=k1-W2）
  const contentRef = useRef<HTMLDivElement | null>(null)
  const iterRef = useRef(0)
  const [shiftedIds, setShiftedIds] = useState<ReadonlySet<string>>(() => new Set())
  // [T3-P7A 回炉 1 W1/W6] 连线层再触发信号（收敛/守卫停分支 bump routeEpoch）
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

  const timelineCls = [
    'timeline',
    composer.isEditing ? 'editing' : '',
    composer.isPicking ? 'link-pick' : ''
  ]
    .filter((c) => c !== '')
    .join(' ')

  const handleCardClick = (nodeId: string, ev: ClickEventLike): void => {
    if (composer.handleCardClick(nodeId, ev)) return // 拾取/弹层语义消费——不转发选中
    props.onNodeClick?.(nodeId, ev)
  }

  const pop = composer.popover

  return (
    <div className={timelineCls} data-testid="lineage-timeline">
      {/* [T3-P7B] 工具条换装（.lg-toolbar sticky 挂 .timeline 内——D-P7B-1） */}
      <LineageToolbar
        saveStatus={props.toolbar?.saveStatus ?? 'saved'}
        lastWriteError={props.toolbar?.lastWriteError ?? null}
        onAddNode={() => props.toolbar?.onAddNode()}
        onImportDraft={() => props.toolbar?.onImportDraft()}
        onRetrySave={() => props.toolbar?.onRetrySave()}
        editing={composer.isEditing}
        onToggleEdit={composer.toggleEdit}
        onNewLink={composer.startLinkPick}
      />
      {nodes.length === 0 ? (
        // 空态不短路滚动容器结构+工具条在场（导入=空图 bootstrap 路径）
        <div className="tl-empty">暂无脉络图——导入草稿或添加节点</div>
      ) : (
        <div className="tl-content" ref={contentRef}>
          {/* [T3-P7A] 连线层子组件（D-22）+[T3-P7B] 命中层点击接 composer
              （handler 闸——与 CSS pointer-events 双闸） */}
          <EdgeOverlay
            nodes={nodes}
            edges={edges}
            lineTypes={lineTypes}
            shiftedIds={shiftedIds}
            groups={groups}
            routeEpoch={routeEpoch}
            onEdgeHitClick={(edgeId, ev) => composer.handleEdgeHitClick(edgeId, ev)}
          />
          <TimelineYears
            groups={groups}
            catalogNos={catalogNos}
            coreIds={coreIds}
            paperMetrics={paperMetrics}
            selectedNodeId={props.selectedNodeId ?? null}
            shiftedIds={shiftedIds}
            linkSourceId={composer.picker === 'target' ? composer.sourceId : null}
            onCardClick={handleCardClick}
            onNodeContextMenu={props.onNodeContextMenu}
          />
        </div>
      )}
      {/* [T3-P7A 回炉 1 W7] 图例挂滚动容器 .timeline（视口级恒可见）；非空图才渲染 */}
      {nodes.length > 0 && (
        <div className="tl-legend">
          {LEGEND_ITEMS.map((it) => (
            <span className={it.cls} key={it.text}>
              <i />
              {it.text}
            </span>
          ))}
        </div>
      )}
      {/* [T3-P7B] 线型弹层（position:fixed——.timeline 滚动容器不裁剪） */}
      {pop.kind !== 'closed' && (
        <EdgeTypePopover
          mode={pop.kind}
          edgeId={pop.kind === 'edit' ? pop.edgeId : undefined}
          from={pop.kind === 'create' ? pop.from : undefined}
          to={pop.kind === 'create' ? pop.to : undefined}
          cx={pop.cx}
          cy={pop.cy}
          lineTypes={lineTypes}
          edges={edges}
          saveStatus={props.toolbar?.saveStatus ?? 'saved'}
          onApplyLine={(id, k, s) => props.actions?.applyEdgeLine(id, k, s)}
          onCreateLine={(f, t, k, s) => props.actions?.linkWithLine(f, t, k, s)}
          onRemoveLine={(id) => props.actions?.removeEdge(id)}
          onSaveLineTypes={(g) => props.actions?.saveLineTypes(g)}
          onClose={composer.closePopover}
        />
      )}
    </div>
  )
}
