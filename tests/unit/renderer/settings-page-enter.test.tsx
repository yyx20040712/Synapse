// @vitest-environment jsdom
/**
 * [F-UIRES-02 批 A R7] SettingsPage 联系邮箱 Enter=保存设置（新键面件；
 * mock 配方沿 corpus-export.test SettingsPage 挂载段）。
 *
 * - Enter（isComposing 守卫）=runSave 同按钮校验链（非法邮箱=中文 toast 零
 *   set；合法=set 走 store.save）。
 * always-active 裸 describe（K3）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, toastSpy } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  settings: { get: vi.fn(), set: vi.fn() }
})

import { SettingsPage } from '../../../src/renderer/features/settings/SettingsPage'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let host: HTMLDivElement | null = null

beforeEach(() => {
  stubApi.settings.get.mockReset()
  stubApi.settings.set.mockReset()
  toastSpy.mockClear()
  stubApi.settings.get.mockResolvedValue({
    ok: true,
    data: { contactEmail: 'old@example.com', theme: 'light', uiScale: 'small' }
  })
  stubApi.settings.set.mockResolvedValue({ ok: true, data: { ok: true } })
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

async function renderPage(): Promise<void> {
  await act(async () => {
    root?.render(<SettingsPage />)
  })
  // 水合：settings 首达同步进表单（load 排空）
  for (let i = 0; i < 6; i += 1) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

function emailInput(): HTMLInputElement {
  const el = host?.querySelector('input[aria-label="联系邮箱"]')
  if (!(el instanceof HTMLInputElement)) throw new Error('邮箱输入框不在场')
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

describe('F-UIRES-02 R7 设置页邮箱 Enter=保存', () => {
  it('合法邮箱+Enter → api.settings.set 走保存链（载荷携带新邮箱）', async () => {
    await renderPage()
    expect(emailInput().value, '水合预填既有邮箱').toBe('old@example.com')
    setInput(emailInput(), 'new@example.com')
    keydown(emailInput(), 'Enter')
    for (let i = 0; i < 6; i += 1) {
      await act(async () => {
        await Promise.resolve()
      })
    }
    expect(stubApi.settings.set).toHaveBeenCalledTimes(1)
    const req = stubApi.settings.set.mock.calls[0]![0] as { contactEmail: string }
    expect(req.contactEmail).toBe('new@example.com')
  })

  it('非法邮箱+Enter → 中文 toast 零 set（校验链同按钮）', async () => {
    await renderPage()
    setInput(emailInput(), 'not-an-email')
    keydown(emailInput(), 'Enter')
    for (let i = 0; i < 6; i += 1) {
      await act(async () => {
        await Promise.resolve()
      })
    }
    expect(stubApi.settings.set).not.toHaveBeenCalled()
    expect(toastSpy).toHaveBeenCalledWith('邮箱格式不正确', 'info')
  })

  it('IME 组词期 Enter（isComposing）→ 零 set（组词确认回车非提交意图）', async () => {
    await renderPage()
    setInput(emailInput(), '组词中@example.com')
    keydown(emailInput(), 'Enter', true)
    for (let i = 0; i < 6; i += 1) {
      await act(async () => {
        await Promise.resolve()
      })
    }
    expect(stubApi.settings.set).not.toHaveBeenCalled()
  })
})
