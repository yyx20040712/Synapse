/**
 * [T3-P3] DrMetrics —— 规格表抽屉四格指标（PaperDetailPanel 250 行红线拆件）。
 *
 * ── 行为层 ──
 * - 四格=引用（citedByCount，acc 色，缺=「—」）/通读（lastReadPage+1+「页」
 *   小字单位）/标注（annotationCount）/笔记（noteCount）——值 mono 16px
 *   tabular-nums（--fs-metric），格间 dashed line（library.css .lib-dr-metrics 族）
 *
 * ── 接口层 ──
 * - export function DrMetrics(props: { detail: PaperDetail }): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 纯展示；皮肤=library.css（mockup .dr-metrics 逐值）
 */
import type { PaperDetail } from '@shared/models/paper'

export function DrMetrics(props: { detail: PaperDetail }): JSX.Element {
  const { detail } = props
  return (
    <div className="lib-dr-metrics">
      <div className="lib-dr-m">
        <div className="lib-dr-v acc">
          {detail.citedByCount === undefined ? '—' : detail.citedByCount}
        </div>
        <div className="lib-dr-ml">引用</div>
      </div>
      <div className="lib-dr-m">
        <div className="lib-dr-v">
          {detail.lastReadPage + 1}
          <span className="lib-dr-vu">页</span>
        </div>
        <div className="lib-dr-ml">通读</div>
      </div>
      <div className="lib-dr-m">
        <div className="lib-dr-v">{detail.annotationCount}</div>
        <div className="lib-dr-ml">标注</div>
      </div>
      <div className="lib-dr-m">
        <div className="lib-dr-v">{detail.noteCount}</div>
        <div className="lib-dr-ml">笔记</div>
      </div>
    </div>
  )
}
