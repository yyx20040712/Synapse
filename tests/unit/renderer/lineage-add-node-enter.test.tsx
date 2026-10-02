// @vitest-environment jsdom
/**
 * [F-UIRES-02 批 A R6] LineageAddNodeDialog 主题节点命名 Enter=添加
 * （新键面件；搜索框=戊类豁免零动零测——每字符直发 IPC 既有行为非本票面）。
 *
 * - Enter（isComposing 守卫）=触发添加（confirm 既有链：非空→onAddTheme+
 *   onClose；空名=无操作与按钮禁用同语义）。
 * always-active 裸 describe（K3）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  library: { list: vi.fn() }
})

import { LineageAddNodeDialog } from '../../../src/renderer/features/lineage/LineageAddNodeDialog'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let host: HTMLDivElement | null = null

beforeEach(() => {
  stubApi.library.list.mockReset()
  stubApi.library.list.mockResolvedValue({ ok: true, data: { items: [], total: 0 } })
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

function renderDialog(onAddTheme: () => void, onClose: () => void): void {
  act(() => {
    root?.render(
      <LineageAddNodeDialog open existingPaperIds={[]} onClose={onClose} onAddPaper={() => undefined} onAddTheme={onAddTheme} />
    )
  })
}

/** 切主题模式并返回主题名输入框 */
function themeInput(): HTMLInputElement {
  const modeBtn = host?.querySelector('[data-testid="add-node-mode-theme"]')
  if (!(modeBtn instanceof HTMLButtonElement)) throw new Error('主题模式钮不在场')
  act(() => {
    modeBtn.click()
  })
  const el = host?.querySelector('[data-testid="add-node-title"]')
  if (!(el instanceof HTMLInputElement)) throw new Error('主题名输入框不在场')
  return el
}

function setInput(el: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  act(() => {
    setter.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function keydown(el: Element, key: string, isComposing = false): void {
  act(() => {
    el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, isComposing }))
  })
}

const settle = async (times = 4): Promise<void> => {
  for (let i = 0; i < times; i += 1) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

describe('F-UIRES-02 R6 主题节点命名 Enter=添加', () => {
  it('非空主题名+Enter → onAddTheme+onClose（confirm 既有链）', async () => {
    const onAddTheme = vi.fn()
    const onClose = vi.fn()
    renderDialog(onAddTheme, onClose)
    await settle()
    const input = themeInput()
    setInput(input, '综述阶段')
    keydown(input, 'Enter')
    await settle()
    expect(onAddTheme).toHaveBeenCalledWith('综述阶段')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('空名+Enter → 无操作（与按钮禁用同语义——零回调）', async () => {
    const onAddTheme = vi.fn()
    const onClose = vi.fn()
    renderDialog(onAddTheme, onClose)
    await settle()
    const input = themeInput()
    keydown(input, 'Enter')
    await settle()
    expect(onAddTheme).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('IME 组词期 Enter（isComposing）→ 无操作', async () => {
    const onAddTheme = vi.fn()
    const onClose = vi.fn()
    renderDialog(onAddTheme, onClose)
    await settle()
    const input = themeInput()
    setInput(input, '组词阶段')
    keydown(input, 'Enter', true)
    await settle()
    expect(onAddTheme).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })
})
