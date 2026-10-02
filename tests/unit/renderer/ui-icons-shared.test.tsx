// @vitest-environment jsdom
/**
 * [F-UIRES-02 批 B] 共享图标常量表 icons.tsx + RetryButton —— 锁定合约
 * （always-active，不经 guardedDescribe——宪法 K3 条款）。
 *
 * 覆盖：
 * - icons.tsx 面：①全部通用图标常量在场且形态合规（svg+aria-hidden+viewBox
 *   24×24——toolbar-icons.tsx D7 形态同源，stroke 走 CSS 类禁内联色）。
 *   （[RR1-4] 原头注②「模块级单例」声明删——该性质无有区分力的单测锁法
 *   （同文件双 import 天然合并=恒真断言），以形态锁+消费面测试承载。）
 * - RetryButton 面：②title 与 aria-label 同源单变量「重试」（票面明文：
 *   aria-label 与悬停提示同源）+sr-only span 保 textContent 恰=「重试」
 *   （受锁 lineage-timeline-page:256 精确 textContent 断言兼容面）；③点击
 *   上抛 onClick；④透传面（className 合并/testId/dataAction——受锁
 *   workspaces-page:292 button.ws-retry/zcode-link:70 data-action="retry"/
 *   lineage-toolbar-session:151 lineage-save-retry 三类既有锚全兼容）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ICON_CHECK,
  ICON_CHEVRON_DOWN,
  ICON_CHEVRON_LEFT,
  ICON_CHEVRON_RIGHT,
  ICON_CHEVRON_UP,
  ICON_CHEVRONS_LEFT,
  ICON_CHEVRONS_RIGHT,
  ICON_HIGHLIGHT,
  ICON_HAND,
  ICON_NOTE,
  ICON_PENCIL,
  ICON_PLUS,
  ICON_REDO,
  ICON_RETRY,
  ICON_SAVE,
  ICON_TRASH,
  ICON_UNDERLINE,
  ICON_UNDO,
  ICON_X
} from '../../../src/renderer/shared/icons'
import { RetryButton } from '../../../src/renderer/shared/ui/RetryButton'

/** 受锁常量清单（R1 全集——缺一即红：误删常量变异红证面） */
const ICON_CONSTANTS: Record<string, unknown> = {
  ICON_X,
  ICON_CHECK,
  ICON_CHEVRON_LEFT,
  ICON_CHEVRON_RIGHT,
  ICON_CHEVRON_UP,
  ICON_CHEVRON_DOWN,
  ICON_CHEVRONS_LEFT,
  ICON_CHEVRONS_RIGHT,
  ICON_PLUS,
  ICON_UNDO,
  ICON_REDO,
  ICON_RETRY,
  ICON_PENCIL,
  ICON_HAND,
  ICON_TRASH,
  ICON_HIGHLIGHT,
  ICON_UNDERLINE,
  ICON_NOTE,
  ICON_SAVE
}

let root: Root | null = null
let host: HTMLDivElement | null = null

function mount(node: JSX.Element): HTMLButtonElement {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(node)
  })
  const btn = host.querySelector('button')
  if (btn === null) throw new Error('RetryButton 未渲染 button')
  return btn
}

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
})

describe('F-UIRES-02 批 B icons.tsx——通用图标常量表', () => {
  it('全 19 常量在场（R1 全集——误删任一常量即红）', () => {
    for (const [name, value] of Object.entries(ICON_CONSTANTS)) {
      expect(value, `${name} 应为已导出常量`).toBeDefined()
    }
  })

  it('形态合规：svg 元素+aria-hidden+viewBox 24×24+无内联色（stroke 走 CSS 类）', () => {
    for (const [name, value] of Object.entries(ICON_CONSTANTS)) {
      const el = value as { type: string; props: Record<string, unknown> }
      expect(el.type, `${name} 根节点应为 svg`).toBe('svg')
      expect(el.props['aria-hidden'], `${name} 应 aria-hidden`).toBe('true')
      expect(el.props.viewBox, `${name} viewBox 24×24`).toBe('0 0 24 24')
      expect(el.props.stroke, `${name} 禁内联 stroke（CSS 类承载）`).toBeUndefined()
      expect(el.props.fill, `${name} 禁内联 fill（CSS 类承载）`).toBeUndefined()
    }
  })
})

describe('F-UIRES-02 批 B RetryButton——共享重试钮', () => {
  it('title 与 aria-label 同源「重试」+sr-only 保 textContent 恰=重试+svg 在场', () => {
    const btn = mount(<RetryButton onClick={() => undefined} />)
    expect(btn.className).toContain('syn-retry')
    expect(btn.getAttribute('title')).toBe('重试')
    expect(btn.getAttribute('aria-label')).toBe('重试')
    expect(btn.textContent).toBe('重试')
    const svg = btn.querySelector('svg')
    expect(svg, 'svg 子元素在场').not.toBeNull()
    expect(svg?.getAttribute('aria-hidden')).toBe('true')
  })

  it('点击上抛 onClick', () => {
    const onClick = vi.fn()
    const btn = mount(<RetryButton onClick={onClick} />)
    act(() => {
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('透传面：className 合并+testId/dataAction 落 data 属性（受锁三锚兼容）', () => {
    const btn = mount(
      <RetryButton onClick={() => undefined} className="ws-retry" testId="lineage-save-retry" dataAction="retry" />
    )
    expect(btn.className).toContain('syn-retry')
    expect(btn.className).toContain('ws-retry')
    expect(btn.getAttribute('data-testid')).toBe('lineage-save-retry')
    expect(btn.getAttribute('data-action')).toBe('retry')
  })
})
