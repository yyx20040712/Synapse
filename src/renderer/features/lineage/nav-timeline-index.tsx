// b3: P7-H
/**
 * [F-LGRAPH-01①U4] NavTimelineIndex —— 导航窗格时间线索引（mockup §3.2-2：
 * 年[衬线数字]>月[两位数]两级；点击=画布滚动定位对应月框——信号经
 * lineage-view.store.requestFrameScroll，Timeline 侧消费；当前视口所在月=
 * accent 指示条 .on——activeFrameKey 由 Timeline 滚动上报）。
 */
import { useMemo } from 'react'
import type { LineageNode } from '@shared/models/lineage'
import { frameKeyOf, groupTimeline } from './lineage-timeline'
import { useLineageViewStore } from './lineage-view.store'

export function NavTimelineIndex(props: { nodes: LineageNode[] }): JSX.Element {
  const activeFrameKey = useLineageViewStore((s) => s.activeFrameKey)
  const requestFrameScroll = useLineageViewStore((s) => s.requestFrameScroll)
  const groups = useMemo(() => groupTimeline(props.nodes), [props.nodes])

  return (
    <nav className="nav-index" data-testid="lineage-nav-index" aria-label="时间线索引">
      {groups.map((g) => (
        <div className="nav-year" key={g.year === null ? 'null' : String(g.year)}>
          <button
            type="button"
            className="nav-year-btn"
            onClick={() => {
              const first = g.months[0]
              if (first !== undefined) requestFrameScroll(frameKeyOf(g.year, first.month))
            }}
          >
            <span className="nav-year-num">{g.year === null ? '未知' : g.year}</span>
            <span className="nav-year-meta">{g.months.reduce((s, m) => s + m.nodes.length, 0)}</span>
          </button>
          <div className="nav-months">
            {g.months.map((m) => {
              const key = frameKeyOf(g.year, m.month)
              return (
                <button
                  type="button"
                  key={m.month === null ? 'null' : String(m.month)}
                  className={activeFrameKey === key ? 'nav-month on' : 'nav-month'}
                  onClick={() => requestFrameScroll(key)}
                >
                  <span className="nm">{m.month === null ? '未定' : String(m.month).padStart(2, '0')}</span>
                  <span className="ct">{m.nodes.length}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
      {groups.length === 0 && <div className="nav-index-empty">暂无时间线</div>}
    </nav>
  )
}
