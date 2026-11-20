/**
 * [前端四期 B2] GeneralCategory —— 设置页「通用」分类内容。
 *
 * ── 行为层 ──
 * - 联系邮箱：既有校验/Enter 保存/isComposing 守卫/说明文案原样迁入
 *   （自 SettingsPage 平铺结构——行为零变）
 * - 底部「保存设置」按钮=SettingsPage 同一 runSave 链（props 下注）
 *
 * ── 接口层 ──
 * - export function GeneralCategory(props: {
 *     email: string; onEmailChange(v: string): void;
 *     saving: boolean; onSave(): void
 *   }): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 纯受控件（email/theme 状态与保存链驻 SettingsPage——「通用」与「外观」
 *   两处保存按钮同一 runSave）；皮肤=settings.css setting-group/setting-row
 * - 纯受控件（email/theme 状态与保存链驻 SettingsPage——「通用」与「外观」
 *   两处保存按钮同一 runSave）；皮肤=settings.css setting-group/setting-row
 * - 测试：tests/unit/renderer/settings-page-enter.test.tsx（Enter 保存三用例
 *   ——挂载面经 SettingsPage 默认分类即本件）+settings-categories.test.tsx
 */
import { Button } from '../../shared/ui/Button'
export function GeneralCategory(props: {
  email: string
  onEmailChange: (value: string) => void
  saving: boolean
  onSave: () => void
}): JSX.Element {
  return (
    <>
      <section className="setting-group">
        <h3>联系邮箱</h3>
        <label className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
            联系邮箱（仅用作 CrossRef/OpenAlex 礼貌池标识，附在请求 User-Agent 中）
          </span>
          <input
            aria-label="联系邮箱"
            className="syn-input rounded border px-2 py-1 text-sm"
            style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}
            value={props.email}
            onChange={(e) => props.onEmailChange(e.target.value)}
            // [F-UIRES-02 R7] Enter=保存设置（runSave 同按钮校验链——非法
            // 邮箱 toast 零 set）；isComposing 守卫（组词确认回车非提交意图）
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return
              if (e.key === 'Enter') {
                // [RR1-5] preventDefault 对齐 inlineKeyDown 范式（防御）
                e.preventDefault()
                props.onSave()
              }
            }}
          />
        </label>
      </section>
      <div className="settings-save">
        <Button variant="primary" size="sm" loading={props.saving} onClick={props.onSave}>
          保存设置
        </Button>
      </div>
    </>
  )
}
