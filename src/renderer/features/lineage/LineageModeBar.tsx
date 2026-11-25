// b3: P7-H
/**
 * [F-LGRAPH-01①U3] LineageModeBar —— 顶部三模式分段控件（mockup §3.1）。
 *
 * - 三键 segmented：编辑（笔）/浏览（手掌）/聚焦（焦点框）——图标+文字；
 *   当前态 accent 底白字（.lg-mode.on——色值归 theme-lineage.css）。
 * - setMode 单源=lineage-view.store（[B5 设计稿 §2.2 #6-#8、§14] 冷启动缺省 browse；
 *   不同模式切换保 focusSet、同模式点击完全 no-op——原 P-1 进页重置／P-3 退出聚焦
 *   清集退役；迁移语义全驻 store，本件纯受控渲染）。
 * - 聚焦计数角标：focus 模式且集非空→「聚焦 N」（集大小实时——mockup §3.7；集成员
 *   有效性由 registry 图态写点剪枝保证——[B5 §5]）。
 * - 右侧=当前图名 mono 小字（graphName 由编排注入——图名单源=文件夹名，
 *   取数链=LineageNavPane[U4]；缺省不渲染）。
 * - LineageFocusClearButton（[B5 §3.1/§2.3] 同文件导出的清空聚焦子件——父工具栏在规定槽位
 *   渲染，避免为了顺序复制 focus 状态）：唯一用户显式清空当前图的入口。
 */
import { useLineageStore } from './lineage.store'
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

/**
 * [B5 设计稿 §2.2 #12/#13、§2.3] 清空聚焦子件——唯一用户显式清空当前图的入口。
 * - 可用=focus 模式 ∧ 集非空 ∧ 图 ready（其余一律禁用；不把它变成模式切换钮）。
 * - 点击=store.clearFocus：只清当前图、**停留 focus**（空聚焦合法——计数随之消失、本钮转禁用）；
 *   其他图的集合驻留不动。
 * - 可复位：再次聚焦卡片后恢复可用。零本地态——三读点全取 store（受控锚：可访问名「清空聚焦」）。
 */
export function LineageFocusClearButton(): JSX.Element {
  const mode = useLineageViewStore((s) => s.mode)
  const focusCount = useLineageViewStore((s) => s.focusSet.length)
  const clearFocus = useLineageViewStore((s) => s.clearFocus)
  const graphReady = useLineageStore((s) => s.status === 'ready')
  return (
    <button
      type="button"
      className="lg-btn ghost"
      disabled={!(mode === 'focus' && focusCount > 0 && graphReady)}
      title="清空当前图的聚焦（保持在聚焦模式）"
      onClick={clearFocus}
    >
      清空聚焦
    </button>
  )
}
