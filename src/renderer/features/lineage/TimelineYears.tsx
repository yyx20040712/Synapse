// b3: T3-P7B
/**
 * [T3-P7B] TimelineYears —— 年/月/卡渲染体（LineageTimeline 拆件——组件
 * 250 行红线；纯展示：分组遍历+编号/核徽章/选中/砖砌/拾取源高亮全经 props，
 * 交互回调沿 TimelineCallbacks 透传）。
 */
import type { LineageNode } from '@shared/models/lineage'
import type { LineagePaperMetrics } from '@shared/ipc/schemas'
import type { TimelineYearGroup } from './lineage-timeline'
import { LineageTimelineCard } from './LineageTimelineCard'
import type { TimelineCallbacks } from './LineageTimeline'

export function TimelineYears(props: {
  groups: TimelineYearGroup[]
  /** INV-76 编号单源（Timeline useMemo 全图一次） */
  catalogNos: Map<string, number>
  /** 核心档预计算（classify.isCore 单源） */
  coreIds: Map<string, boolean>
  paperMetrics: Record<string, LineagePaperMetrics>
  selectedNodeId: string | null
  shiftedIds: ReadonlySet<string>
  /** [T3-P7B] 拾取源卡高亮（composer target 相位） */
  linkSourceId: string | null
  onCardClick: NonNullable<TimelineCallbacks['onNodeClick']>
} & Pick<TimelineCallbacks, 'onNodeContextMenu'>): JSX.Element {
  const { groups, catalogNos, coreIds, paperMetrics } = props
  return (
    <>
      {groups.map((g) => {
        const yearCount = g.months.reduce((sum, m) => sum + m.nodes.length, 0)
        return (
          <section
            className="tl-year"
            key={g.year === null ? 'null' : String(g.year)}
            data-year={g.year === null ? 'null' : g.year}
          >
            <div className="tl-year-head">
              {/* 年份头数字无「年」字（mockup 纯数字）；null 年=「未知年份」 */}
              <span className="tl-year-num">{g.year === null ? '未知年份' : g.year}</span>
              <span className="tl-year-meta">{yearCount} 篇</span>
            </div>
            {g.months.map((m) => (
              <div
                className={m.month === null ? 'tl-month unknown' : 'tl-month'}
                key={m.month === null ? 'null' : String(m.month)}
              >
                {/* 月标签与月框=兄弟（d1-B1 回炉：框 overflow:hidden 裁悬出段） */}
                <span className="month-tag">
                  {m.month === null
                    ? `未定月 · ${m.nodes.length} 篇`
                    : `${m.month} 月 · ${m.nodes.length} 篇`}
                </span>
                <div className="month-frame">
                  {m.nodes.map((n: LineageNode) => (
                    <LineageTimelineCard
                      key={n.id}
                      node={n}
                      no={catalogNos.get(n.id) ?? 0}
                      core={coreIds.get(n.id) === true}
                      metrics={n.paperId !== null ? (paperMetrics[n.paperId] ?? null) : null}
                      selected={props.selectedNodeId === n.id}
                      shift={props.shiftedIds.has(n.id)}
                      linkSrc={props.linkSourceId === n.id}
                      onNodeClick={props.onCardClick}
                      onNodeContextMenu={props.onNodeContextMenu}
                    />
                  ))}
                </div>
              </div>
            ))}
          </section>
        )
      })}
    </>
  )
}
