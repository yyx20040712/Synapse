/**
 * [前端四期 B2] ThemeChoices —— 外观分类「界面主题」两卡选择（v2
 * theme-choices/theme-choice/theme-preview 结构）。
 *
 * ── 行为层 ──
 * - 两卡=light「正常模式/清亮中性色」、sepia「护眼模式/牛皮纸暖米色」
 *   （主标 THEME_LABEL 单源，副标=v2 文案逐字）
 * - aria-pressed 选中态；点击=更新本地选中（上抛 onPick——行为语义保持
 *   现状：保存后持久化生效，App effect 写 data-theme 链不动）
 * - 迷你界面预览=纯 CSS 画（侧栏/顶栏/文行线条——皮肤住 settings.css
 *   .settings-theme-demo 双岛钉住各自主题族 token 值）
 *
 * ── 接口层 ──
 * - export function ThemeChoices(props: { value: AppSettings['theme'];
 *   onPick(theme: AppSettings['theme']): void }): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 主题演示画布色值单源声明驻 settings.css（同名 token 局部重绑）——
 *   tsx 面零颜色字面量（eslint B-5）
 * - 测试：tests/unit/renderer/settings-categories.test.tsx（aria-pressed+
 *   文案+保存载荷）；e2e theme-trio.spec.ts（真渲色经 data-theme 链）
 */
import { THEME_LABEL } from '../../shared/ui-constants'
import type { AppSettings } from '@shared/ipc/schemas'

/** 两卡副标（v2 theme-choice-copy span 文案逐字） */
const THEME_SUB: Record<AppSettings['theme'], string> = {
  light: '清亮中性色',
  sepia: '牛皮纸暖米色'
}

/** 卡序=v2（light 在前） */
const THEME_ORDER: Array<AppSettings['theme']> = ['light', 'sepia']

export function ThemeChoices(props: {
  value: AppSettings['theme']
  onPick: (theme: AppSettings['theme']) => void
}): JSX.Element {
  return (
    <div className="settings-theme-choices" role="group" aria-label="界面主题">
      {THEME_ORDER.map((theme) => (
        <button
          key={theme}
          type="button"
          className={`settings-theme-card${props.value === theme ? ' active' : ''}`}
          aria-pressed={props.value === theme}
          onClick={() => props.onPick(theme)}
        >
          {/* 迷你界面预览（非交互纯演示——aria-hidden 对读屏隐没，主题名由
              卡文案承载）；demo--light/sepia 双岛钉住各自族 token（CSS 单源） */}
          <span
            className={`settings-theme-demo settings-theme-demo--${theme}`}
            aria-hidden="true"
          >
            <i className="settings-theme-demo-side" />
            <i className="settings-theme-demo-top" />
            <span className="settings-theme-demo-lines">
              <i />
              <i />
              <i />
            </span>
          </span>
          <span className="settings-theme-copy">
            <strong>{THEME_LABEL[theme]}</strong>
            <span>{THEME_SUB[theme]}</span>
          </span>
        </button>
      ))}
    </div>
  )
}
