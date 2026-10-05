// @vitest-environment jsdom
/**
 * [F-UIRES-02 批 A R9] EdgeMenu 命名输入失焦=提交+document Esc isComposing
 * 守卫（lineage-edge-edit-menu.test 姊妹件——受锁既有件零改动；装配面直挂
 * EdgeMenu 纯件，非 Timeline 装配）。
 *
 * - 失焦从丢弃改提交（点外=确认——资源管理器语义；空名静默零写契约由
 *   EdgeMenuHost label!=='' 守卫维持，本面断言 onRename 透传）。
 * - document 级 Esc 监听补 isComposing 守卫（原全域唯一守卫真空——组词期
 *   Esc=取消候选词非关闭意图）。
 * - 序 B：组词中失焦拒绝→compositionend 后到补提交（useComposingCommit）。
 * always-active 裸 describe（K3）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EdgeMenu } from '../../../src/renderer/features/lineage/EdgeMenu'
import type { EdgeMenuTarget } from '../../../src/renderer/features/lineage/EdgeMenu'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const EDGE_TARGET: EdgeMenuTarget = {
  kind: 'edge',
  edgeId: 'e1',
  label: '原名',
  x: 50,
  y: 50
}

let root: Root | null = null
let host: HTMLDivElement | null = null
let onRename: ReturnType<typeof vi.fn>
let onClose: ReturnType<typeof vi.fn>

beforeEach(() => {
  onRename = vi.fn()
  onClose = vi.fn()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  host?.remove()
  root = null
  host = null
})

function renderMenu(): void {
  // 宿主卸载建模（RR1-1）：onClose=撤菜单（真实宿主 setState 卸载——
  // effect cleanup 摘 document 监听，后继 click 不再计），spy 计数=1 锚
  const close = (): void => {
    onClose()
    act(() => {
      root?.render(null)
    })
  }
  act(() => {
    root?.render(
      <EdgeMenu
        target={EDGE_TARGET}
        dashed={false}
        color="#1e3a8a"
        onRename={onRename}
        onLineStyle={() => undefined}
        onReset={() => undefined}
        onDelete={() => undefined}
        onDeleteVertex={() => undefined}
        onClose={close}
      />
    )
  })
}

/** 进入命名编辑态并返回输入框 */
function openRename(): HTMLInputElement {
  renderMenu()
  const item = [...document.querySelectorAll('[data-testid="edge-menu"] [role="menuitem"]')].find(
    (b) => b.textContent === '命名'
  )
  if (item === undefined) throw new Error('命名入口不在场')
  act(() => {
    item.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  const input = document.querySelector('[data-testid="edge-rename-input"]')
  if (!(input instanceof HTMLInputElement)) throw new Error('命名输入框不在场')
  return input
}

function setInput(el: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  act(() => {
    setter.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('F-UIRES-02 R9 EdgeMenu 命名失焦=提交', () => {
  it('输入+失焦 → onRename(trim 值)+onClose（点外=确认——原丢弃改提交）', async () => {
    const input = openRename()
    act(() => {
      input.focus()
    })
    setInput(input, '失焦命名')
    act(() => {
      input.blur()
    })
    expect(onRename).toHaveBeenCalledTimes(1)
    expect(onRename).toHaveBeenCalledWith('失焦命名')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('空名失焦 → onRename 空串透传（零写契约=宿主 label 守卫维持）', async () => {
    const input = openRename()
    act(() => {
      input.focus()
    })
    setInput(input, '   ')
    act(() => {
      input.blur()
    })
    expect(onRename).toHaveBeenCalledWith('')
  })

  it('组词中失焦→拒提交；失焦后 compositionend=序 B 补提交定案文本', async () => {
    const input = openRename()
    act(() => {
      input.focus()
    })
    setInput(input, '组词中')
    act(() => {
      input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    })
    act(() => {
      input.blur()
    })
    // 组词中 blur 被拒（组词中文本非定案）
    expect(onRename).not.toHaveBeenCalled()
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    act(() => {
      setter.call(input, '定案名')
    })
    act(() => {
      input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))
    })
    expect(onRename).toHaveBeenCalledTimes(1)
    expect(onRename).toHaveBeenCalledWith('定案名')
  })

  it('点外=提交且关闭（RR1-1——真实时序 mousedown 移焦→blur 提交→click 关菜单）', async () => {
    const input = openRename()
    act(() => {
      input.focus()
    })
    setInput(input, '点外确认名')
    // 真实时序建模：blur（提交）先到，document click（点外关闭）后到
    act(() => {
      input.blur()
    })
    act(() => {
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onRename, '点外=确认提交').toHaveBeenCalledTimes(1)
    expect(onRename).toHaveBeenCalledWith('点外确认名')
    expect(onClose, '点外=关闭菜单').toHaveBeenCalledTimes(1)
  })

  it('组词中点外整链（RR1-1）：blur 拒绝→序 B 补提交 DOM 定案值→click 关闭', async () => {
    const input = openRename()
    act(() => {
      input.focus()
    })
    setInput(input, '组词中')
    act(() => {
      input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    })
    // 点外第一步：blur（组词拒绝+复位 ref）
    act(() => {
      input.blur()
    })
    expect(onRename).not.toHaveBeenCalled()
    // DOM 定案文本（state 滞后场景）→ compositionend（序 B 补提交）
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    act(() => {
      setter.call(input, '点外定案名')
    })
    act(() => {
      input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))
    })
    // 点外第二步：document click 关菜单
    act(() => {
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onRename, '整链终点=定案文本提交').toHaveBeenCalledTimes(1)
    expect(onRename).toHaveBeenCalledWith('点外定案名')
    expect(onClose, '整链终点=菜单关闭').toHaveBeenCalledTimes(1)
  })
})

describe('F-UIRES-02 R9 document Esc 监听 isComposing 守卫（守卫真空补全）', () => {
  it('document Esc（非组合）→ onClose（既有行为保持）', async () => {
    renderMenu()
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('document Esc（isComposing=true）→ 不关闭（组词期 Esc=取消候选词）', async () => {
    renderMenu()
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, isComposing: true })
      )
    })
    expect(onClose).not.toHaveBeenCalled()
    expect(document.querySelector('[data-testid="edge-menu"]'), '菜单在场').not.toBeNull()
  })
})
