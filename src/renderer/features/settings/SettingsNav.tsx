/**
 * [前端四期 B2] SettingsNav —— 设置页左侧五类导航（竖排全高）。
 *
 * ── 行为层 ──
 * - 五项（id/顺序/名称/图标逐字=v2 settings-nav）：通用 i-settings → 外观
 *   i-sun → 阅读与标注 i-reader → AI 助手 i-ai → 数据与网络 i-database
 * - 当前分类单选：active 类+aria-current="true"（其余不挂）；点击上抛 onPick
 *
 * ── 接口层 ──
 * - export function SettingsNav(props: { active: SettingsCategoryId;
 *   onPick(id: SettingsCategoryId): void }): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 纯展示件（状态驻 SettingsPage/模块会话态）；图标=shared/icons.tsx
 *   B2 五件（v2 symbol 库逐值）；皮肤=settings.css .settings-nav*
 * - 测试：tests/unit/renderer/settings-categories.test.tsx（五类逐字+
 *   aria-current 单选）+tests/e2e/settings-categories.spec.ts（真渲染切换）
 */
import {
  ICON_AI,
  ICON_DATABASE,
  ICON_READER,
  ICON_SETTINGS,
  ICON_SUN
} from '../../shared/icons'
import type { SettingsCategoryId } from './settings-category'

/** 五类导航清单（顺序与名称逐字=v2 nav；图标=v2 symbol 库） */
export const SETTINGS_NAV_ITEMS: Array<{
  id: SettingsCategoryId
  label: string
  icon: JSX.Element
}> = [
  { id: 'general', label: '通用', icon: ICON_SETTINGS },
  { id: 'appearance', label: '外观', icon: ICON_SUN },
  { id: 'reading', label: '阅读与标注', icon: ICON_READER },
  { id: 'ai', label: 'AI 助手', icon: ICON_AI },
  { id: 'data', label: '数据与网络', icon: ICON_DATABASE }
]

export function SettingsNav(props: {
  active: SettingsCategoryId
  onPick: (id: SettingsCategoryId) => void
}): JSX.Element {
  return (
    <nav className="settings-nav" aria-label="设置分类">
      <h1>设置</h1>
      {SETTINGS_NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`settings-nav-item${item.id === props.active ? ' active' : ''}`}
          aria-current={item.id === props.active ? 'true' : undefined}
          onClick={() => props.onPick(item.id)}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
