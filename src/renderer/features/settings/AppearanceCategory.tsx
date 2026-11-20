/**
 * [前端四期 B2] AppearanceCategory —— 设置页「外观」分类内容。
 *
 * ── 行为层 ──
 * - 界面主题：ThemeChoices 两卡（本地选中态上抛——保存后持久化生效，链零变）
 * - 界面缩放：UiScaleSection 自持节原样迁入（三档即存——独立保存通道不动）
 * - 「宽屏默认展开文献详情」只读说明行（v2 形态=setting-row 文案+「响应式
 *   默认」标签，非开关——纯说明二期已实现行为，不新增设置字段）
 * - 底部「保存设置」按钮=与「通用」同一 runSave 链（props 下注）
 *
 * ── 接口层 ──
 * - export function AppearanceCategory(props: {
 *     theme: AppSettings['theme']; onThemePick(theme: AppSettings['theme']): void;
 *     saving: boolean; onSave(): void
 *   }): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 纯受控件（主题选中态驻 SettingsPage 与邮箱同链）；皮肤=settings.css
 *   setting-group/setting-row/settings-theme-*
 * - 测试：tests/unit/renderer/settings-categories.test.tsx（主题卡选中态+
 *   保存载荷+草稿保护回归）；e2e theme-trio/smoke R2-SET1
 */
import type { AppSettings } from '@shared/ipc/schemas'
import { Button } from '../../shared/ui/Button'
import { ThemeChoices } from './ThemeChoices'
import { UiScaleSection } from './UiScaleSection'

export function AppearanceCategory(props: {
  theme: AppSettings['theme']
  onThemePick: (theme: AppSettings['theme']) => void
  saving: boolean
  onSave: () => void
}): JSX.Element {
  return (
    <>
      <section className="setting-group">
        <h3>界面主题</h3>
        <p className="setting-group-note">
          正常模式使用清亮的灰绿中性色；护眼模式将界面与 PDF 纸面统一为较浅的低刺激暖米色。
          选中主题卡后点「保存设置」生效。
        </p>
        <ThemeChoices value={props.theme} onPick={props.onThemePick} />
      </section>

      {/* R2-SET1 界面缩放：自持组件原样迁入（三档 segmented 即时保存——
          行为零变，独立保存通道不动） */}
      <UiScaleSection />

      <section className="setting-group">
        <h3>文献详情</h3>
        <div className="setting-row">
          <div className="setting-row-copy">
            <strong>宽屏默认展开文献详情</strong>
            <span>1280 级窄宽度默认收起，优先显示列表；手动展开后本次会话保持选择</span>
          </div>
          <span className="setting-row-tag">响应式默认</span>
        </div>
      </section>

      <div className="settings-save">
        <Button variant="primary" size="sm" loading={props.saving} onClick={props.onSave}>
          保存设置
        </Button>
      </div>
    </>
  )
}
