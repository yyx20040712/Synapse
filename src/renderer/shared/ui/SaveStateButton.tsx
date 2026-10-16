/**
 * [F-VISFB-13] SaveStateButton —— 四态保存钮（共享元件，工单：F-VISFB-13 / strong）。
 *
 * ── 行为层 ──
 * - 消费方：AnnotationEditor（批注弹层）+ ReaderNotesPanel（笔记面板）——
 *   Rule of Three 两消费方（票面钦点共享钮）；落位 renderer/shared/ui 与
 *   save-status.ts 推导单源同层（主控裁决 ④.1 候选二落地，申报见批次报告）。
 * - 四态（§0-2 锁定裁决，呈现单源=save-status.ts deriveSaveButtonView——本件
 *   零 if-else 态逻辑）：dirty=彩色可点（点击即存，等价 saveNow 语义——动作
 *   由消费方注入）/saved=灰色 disabled（check 图标）/saving=spinner 禁用/
 *   failed=红+短文本「重试」可点（重试=消费方保存动作再派发）。
 * - 双编码（§0-2 禁仅颜色区分）：每态图形编码=icon/spinner 形状互异+文本
 *   编码=态语（dirty/saving/saved sr-only〔A4：删「已保存」类可见字样，
 *   textContent/accessible name 双面保活〕；failed 可见「重试」）。
 * - busy 透传：消费方在途手动链（保存/删除）互斥——busy=true 呈现 saving
 *   格（disabled+spinner）；与 state='saving' 同型归一。
 * - 无障碍：title/aria-label 恒同源单值（F-UIRES-02 批 B 同源条款；failed
 *   =RETRY_A11Y 可见文字「重试」开头形——WCAG 2.5.3 label-in-name）；钮面
 *   aria-live=polite（态语文本变化即 AT 播报状态迁移——四态迁移与态语一一
 *   对应）；type=button（Tab 聚焦/Enter/Space 触发=原生 button 语义；disabled
 *   态浏览器原生不可聚焦不可激活）。
 *
 * ── 接口层 ──
 * - export function SaveStateButton(props: { state: SaveUiState; busy?: boolean;
 *     testId?: string; className?: string; onClick(): void }): JSX.Element
 *
 * ── 架构层 ──
 * - 皮肤走 theme-buttons.css .syn-btn-<variant> 类（静态+hover 同层先例）+
 *   .syn-icon-btn（svg 规格 16px/stroke currentColor）；颜色一律 var(--*)
 *   经变体类，禁内联硬编码。
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 组件级测试 tests/unit/renderer/save-state-button.test.tsx ②③（always-active：
 *   四态全格/disabled 不可操作/editor 集成 A1·A4·A5·busy/N-1 逃生径）。
 */
import { ICON_CHECK, ICON_RETRY, ICON_SAVE } from '../icons'
import { deriveSaveButtonView, type SaveUiState } from '../save-status'

/** 图标名→JSX（模块级单例常量——icons.tsx 形态同源） */
const ICONS: Record<'save' | 'check' | 'retry', JSX.Element> = {
  save: ICON_SAVE,
  check: ICON_CHECK,
  retry: ICON_RETRY
}

export function SaveStateButton(props: {
  /** 四态规范态（save-status.ts 单源推导——消费方不得自行拼装视图） */
  state: SaveUiState
  /** 消费方在途手动链互斥（busy=true→saving 格呈现） */
  busy?: boolean
  /** 锚位（消费方 testid 透传，如 annotation-editor-save） */
  testId?: string
  /** 布局类透传（如 ml-auto 右对齐——皮肤类由态单源，禁经此注入颜色） */
  className?: string
  onClick(): void
}): JSX.Element {
  const { state, busy = false, testId, className, onClick } = props
  const view = deriveSaveButtonView(busy ? 'saving' : state)
  return (
    <button
      type="button"
      data-testid={testId}
      disabled={view.disabled}
      title={view.title}
      aria-label={view.title}
      aria-live="polite"
      className={`syn-btn-${view.variant} syn-icon-btn rounded border px-2 py-0.5 text-xs disabled:cursor-not-allowed disabled:opacity-50${className !== undefined ? ` ${className}` : ''}`}
      onClick={onClick}
    >
      {view.spinner && (
        <span aria-hidden="true" className="inline-block animate-spin">
          ⟳
        </span>
      )}
      {!view.spinner && ICONS[view.icon]}
      <span className={view.visibleText ? '' : 'sr-only'}>{view.text}</span>
    </button>
  )
}
