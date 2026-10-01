// b3: P7-H
/**
 * [F-LGRAPH-01①U3] LineageModeBar —— 顶部三模式分段控件（mockup §3.1）。
 *
 * - 三键 segmented：编辑（笔）/浏览（手掌）/聚焦（焦点框）——图标+文字；
 *   当前态 accent 底白字（.lg-mode.on——色值归 theme-lineage.css）。
 * - setMode 单源=lineage-view.store（P-1 缺省 browse/P-3 退出聚焦清 focusSet
 *   /T1 再点聚焦 no-op——迁移语义全驻 store，本件纯受控渲染）。
 * - 聚焦计数角标：focus 模式且集非空→「聚焦 N」（集大小实时——mockup §3.7）。
 * - 右侧=当前图名 mono 小字（graphName 由编排注入——图名单源=文件夹名，
 *   取数链=LineageNavPane[U4]；缺省不渲染）。
 */
import { useLineageViewStore, type LineageViewMode } from './lineage-view.store'

/** 模式图标（13×13 线框——笔/手掌/焦点框；stroke=currentColor 随按钮态着色） */
function ModeIcon({ kind }: { kind: LineageViewMode }): JSX.Element {
  if (kind === 'edit') {
    return (
      <svg viewBox="0 0 13 13" aria-hidden="true">
        <path d="M2.5 10.5l.7-2.6 5.4-5.4 1.9 1.9-5.4 5.4-2.6.7z" fill="none" stroke="currentColor" strokeWidth="1.1" />
        <path d="M8.2 2.9l1.9 1.9" stroke="currentColor" strokeWidth="1.1" />
      </svg>
    )
  }
  if (kind === 'browse') {
    return (
      <svg viewBox="0 0 13 13" aria-hidden="true">
        <path
          d="M4 6V3.4a1 1 0 0 1 2 0V6m0-.6V2.4a1 1 0 0 1 2 0V6m0-.3V3.4a1 1 0 0 1 2 0V8c0 2-1.4 3.2-3.2 3.2C4.8 11.2 4 9.8 4 8.6V6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 13 13" aria-hidden="true">
      <path
        d="M1.5 4V1.5H4M9 1.5h2.5V4M11.5 9v2.5H9M4 11.5H1.5V9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <circle cx="6.5" cy="6.5" r="1.6" fill="none" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  )
}

const MODES: Array<{ kind: LineageViewMode; label: string }> = [
  { kind: 'edit', label: '编辑' },
  { kind: 'browse', label: '浏览' },
  { kind: 'focus', label: '聚焦' }
]

export function LineageModeBar(props: { graphName?: string }): JSX.Element {
  const mode = useLineageViewStore((s) => s.mode)
  const focusCount = useLineageViewStore((s) => s.focusSet.length)
  const setMode = useLineageViewStore((s) => s.setMode)

  return (
    <div className="lg-modebar" data-testid="lineage-mode-bar">
      <div className="lg-mode-seg" role="group" aria-label="脉络模式">
        {MODES.map((m) => (
          <button
            key={m.kind}
            type="button"
            className={mode === m.kind ? 'lg-mode on' : 'lg-mode'}
            data-testid={`lineage-mode-${m.kind}`}
            aria-pressed={mode === m.kind}
            onClick={() => setMode(m.kind)}
          >
            <ModeIcon kind={m.kind} />
            {m.label}
          </button>
        ))}
      </div>
      {mode === 'focus' && focusCount > 0 && (
        <span className="lg-focus-count" data-testid="lineage-focus-count">{`聚焦 ${focusCount}`}</span>
      )}
      {props.graphName !== undefined && (
        <span className="lg-graph-name mono" data-testid="lineage-graph-title">
          {props.graphName}
        </span>
      )}
    </div>
  )
}
