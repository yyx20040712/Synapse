/**
 * [F-UIRES-02 批 B] RetryButton —— 共享重试钮（工单：F-UIRES-02 / strong）
 *
 * ── 行为层 ──
 * - 全域 13 处文字重试钮的统一图标化形态（Reader 系 2/Library 3/Lineage 5/
 *   Workspaces 1/Settings 1/ErrorBoundary 1——survey §3 簇 1）：圆形箭头
 *   图标+悬停汉字提示；点击上抛 onClick（重试语义由消费面定义）
 *
 * ── 接口层 ──
 * - export function RetryButton(props: { onClick(): void; className?: string;
 *     testId?: string; dataAction?: string }): JSX.Element
 * - 透传面（受锁断言兼容三锚）：className 合并（workspaces-page:292
 *   button.ws-retry）/testId→data-testid（lineage-toolbar-session:151
 *   lineage-save-retry）/dataAction→data-action（zcode-link-section:70
 *   与 lineage-side-panel:387 data-action="retry"）
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - title/aria-label 同源单变量「重试」（LineageNavPane:97 先例——票面明文
 *   同源落法）；sr-only span 保 textContent 恰=「重试」（受锁
 *   lineage-timeline-page:256 精确匹配断言兼容面）
 * - 皮肤=.syn-retry+.syn-icon-btn（theme-buttons.css 批 B 小节单源）；
 *   图标=icons.tsx ICON_RETRY 模块级单例；零新依赖
 * - 测试=tests/unit/renderer/ui-icons-shared.test.tsx（always-active）
 */
import { ICON_RETRY } from '../icons'

/** 同源标签单变量（title+aria-label 双属性同喂——禁两处手写） */
const RETRY_LABEL = '重试'

export function RetryButton(props: {
  onClick(): void
  className?: string
  testId?: string
  dataAction?: string
}): JSX.Element {
  const { onClick, className, testId, dataAction } = props
  return (
    <button
      type="button"
      className={`syn-retry syn-icon-btn${className !== undefined ? ` ${className}` : ''}`}
      title={RETRY_LABEL}
      aria-label={RETRY_LABEL}
      data-testid={testId}
      data-action={dataAction}
      onClick={onClick}
    >
      {ICON_RETRY}
      <span className="sr-only">{RETRY_LABEL}</span>
    </button>
  )
}
