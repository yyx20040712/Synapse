/**
 * [F-DBCAMP-01 DB-4 / F-STAR-01 A3+A4] StarGlyphs —— 星标图标对+星标切换
 * span（卡面/侧板共享单源——第三处复制出现即复查抽源纪律 INV-11 精神）。
 *
 * - StarGlyph：书页线框（未标记缺省形态——P-11 原静态占位形态保持）
 * - StarGlyphOn：accent 实心星（已标记高亮形态——.c-star.on/.panel-star.on 配对）
 * - StarToggleSpan：星标域交互面（role=button+tabIndex+aria-pressed+title
 *   星标/取消星标+Enter/Space 键盘+click/keydown stopPropagation 隔离卡身
 *   ——卡面/侧板两消费面同构收口）
 */
export function StarToggleSpan(props: {
  isStarred: boolean
  /** 基类名（on 态自动追加 ' on'） */
  className: string
  testid?: string
  /** 可选文字标签（侧板「星标」字样——卡面缺省纯图标） */
  label?: string
  onActivate(): void
}): JSX.Element {
  const on = props.isStarred === true
  return (
    <span
      className={`${props.className}${on ? ' on' : ''}`}
      {...(props.testid !== undefined ? { 'data-testid': props.testid } : {})}
      role="button"
      tabIndex={0}
      aria-pressed={on}
      title={on ? '取消星标' : '星标'}
      onClick={(e) => {
        e.stopPropagation()
        props.onActivate()
      }}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return
        e.preventDefault()
        e.stopPropagation()
        props.onActivate()
      }}
    >
      {on ? <StarGlyphOn /> : <StarGlyph />}
      {props.label !== undefined && props.label}
    </span>
  )
}
export function StarGlyph(): JSX.Element {
  return (
    <svg viewBox="0 0 9 10" width="9" height="10" aria-hidden="true">
      <path
        d="M1 1.2h7v7.6l-3.5-2-3.5 2z"
        fill="none"
        stroke="var(--faint)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function StarGlyphOn(): JSX.Element {
  return (
    <svg viewBox="0 0 10 10" width="9" height="10" aria-hidden="true">
      <path
        d="M5 0.8l1.2 2.6 2.8 0.3-2.1 1.9 0.6 2.8L5 7l-2.5 1.4 0.6-2.8L1 3.7l2.8-0.3z"
        fill="var(--accent)"
        stroke="var(--accent)"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}
