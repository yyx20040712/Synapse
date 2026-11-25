// b3: B5 wave C
/**
 * [B5 设计稿 §3.1/§3.4/§10.2/§11.4——wave C 2026-11-25] LineagePaneToggles —— 工具栏末段左右侧栏开关
 * （单排顺序：…｜图名｜左导航开关 / 右详情开关）。
 *
 * ── 行为层 ──
 * - 纯受控件：左栏=navCollapsed＋onToggleNav（页面组合层 use-lineage-pane-controls）；右栏=受控 SidebarPane
 *   （collapse/expand）。名称/aria/状态同源——展开态 testid lineage-nav-collapse／lineage-sidebar-collapse，
 *   收起态翻为 lineage-nav-expand／lineage-sidebar-expand（旧侧栏 testid 移到工具栏动态按钮；任一时刻
 *   同一 testid 至多一个，不出现双开关）。右栏收起态不沿用旧 rail 名（rail 已不存在——名实相符）。
 * - 图标语义（沿承原窗格内双钮）：左栏收起=«、展开=»；右栏（在页面右侧）收起=»、展开=«。svg 规格类=
 *   syn-icon-btn、公共收起钮款=collapse-btn（theme-buttons.css）；sr-only 文本=可访问名（title 与
 *   aria-label 同源——[F-UIRES-02 批 B] 小钮图标化条款）。
 * - 原窗格内重复开关退役：NavPane 头部收起钮/窄条展开钮、SideCapRow 收起钮、AsideHost 48px rail 钮
 *   （语义类 nav-collapse-btn/nav-expand-btn/side-collapse-btn 为零消费类名，同删）。
 *
 * ── 接口层 ── export interface LineagePaneTogglesProps；
 *   export function LineagePaneToggles(props: LineagePaneTogglesProps): JSX.Element
 *
 * ── 架构层 ── 直连零 store：全受控；写路径经注入回调（单源=页面组合层）。
 */
import { ICON_CHEVRONS_LEFT, ICON_CHEVRONS_RIGHT } from '../../shared/icons'
import type { SidebarPane } from './use-sidebar-pane'

export interface LineagePaneTogglesProps {
  navCollapsed: boolean
  onToggleNav(): void
  sidebar: SidebarPane
}

export function LineagePaneToggles(props: LineagePaneTogglesProps): JSX.Element {
  const navLabel = props.navCollapsed ? '展开导航窗格' : '收起导航窗格'
  const sideLabel = props.sidebar.collapsed ? '展开详情面板' : '收起详情面板'
  return (
    <span className="lg-pane-toggles">
      <button
        type="button"
        className="collapse-btn syn-icon-btn"
        data-testid={props.navCollapsed ? 'lineage-nav-expand' : 'lineage-nav-collapse'}
        title={navLabel}
        aria-label={navLabel}
        aria-expanded={!props.navCollapsed}
        onClick={props.onToggleNav}
      >
        {props.navCollapsed ? ICON_CHEVRONS_RIGHT : ICON_CHEVRONS_LEFT}
        <span className="sr-only">{navLabel}</span>
      </button>
      <button
        type="button"
        className="collapse-btn syn-icon-btn"
        data-testid={props.sidebar.collapsed ? 'lineage-sidebar-expand' : 'lineage-sidebar-collapse'}
        title={sideLabel}
        aria-label={sideLabel}
        aria-expanded={!props.sidebar.collapsed}
        onClick={props.sidebar.collapsed ? props.sidebar.expand : props.sidebar.collapse}
      >
        {props.sidebar.collapsed ? ICON_CHEVRONS_LEFT : ICON_CHEVRONS_RIGHT}
        <span className="sr-only">{sideLabel}</span>
      </button>
    </span>
  )
}
