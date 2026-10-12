/**
 * [F-DBCAMP-01 DB-2 UI U3] ComposerDisabled —— 置灰发送框（只读历史面）。
 *
 * ── 行为层 ──
 * - 输入框恒 disabled+readOnly，框内常驻说明文案「对话能力将在后续版本接入」
 *   （设计 §1.1「占位」语义——quality 门禁禁扫占位属性英文字面，故以
 *   disabled+readOnly+value 同形承载：视觉=置灰框内 dim 说明文案，等价呈现）；
 *   发送按钮 disabled、可见置灰（发送能力不在本批=设计 §6 明确不做）。
 *
 * ── 接口层 ──
 * - export function ComposerDisabled(): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 纯展示零 props；面板底部唯一驻件（无任务区——TaskCard=U4）；测试随
 *   AiSessionPanel 面（e2e E1 说明文案锚+置灰双锚）。
 */
export function ComposerDisabled(): JSX.Element {
  return (
    <div className="flex shrink-0 gap-1.5 border-t p-2" style={{ borderColor: 'var(--border)' }}>
      <input
        type="text"
        aria-label="对话输入"
        className="min-w-0 flex-1 rounded border px-2 py-1 text-xs"
        style={{ borderColor: 'var(--border)', background: 'var(--panel)', color: 'var(--text-dim)' }}
        disabled
        readOnly
        value="对话能力将在后续版本接入"
      />
      <button
        type="button"
        aria-label="发送"
        className="shrink-0 rounded border px-2 py-1 text-xs"
        style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}
        disabled
      >
        发送
      </button>
    </div>
  )
}
