// @vitest-environment jsdom
/**
 * [F-UIRES-02 批 A R5] MetaEditDialog 单行字段 Enter=保存（meta-edit-dialog
 * .test.tsx 姊妹件——受锁既有件零改动，mock 配方同型）。
 *
 * - 7 单行 input Enter（isComposing 守卫）=触发保存——与「保存」钮完全同
 *   链路（含校验 toast：非法输入当场拦截零 invoke）。
 * - 摘要 textarea 零动（Enter=换行不保存——乙类豁免面负锚）。
 * - Dialog 壳 Esc 既有不动（dialog-esc-compose.test 已锁，本文件不重复）。
 * always-active 裸 describe（K3）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, toastSpy } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  library: { detail: vi.fn(), list: vi.fn(), updateMeta: vi.fn() }
})

import { MetaEditDialog } from '../../../src/renderer/features/library/MetaEditDialog'
import { makeDetail } from '../../utils/factories'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let host: HTMLDivElement | null = null

beforeEach(() => {
  stubApi.library.updateMeta.mockReset()
  toastSpy.mockClear()
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

function renderDialog(): void {
  act(() => {
    root?.render(
      <MetaEditDialog open detail={makeDetail()} onClose={() => undefined} onSaved={() => undefined} />
    )
  })
}

function inputByLabel(label: string): HTMLInputElement {
  const labels = Array.from(host?.querySelectorAll('label') ?? [])
  const hit = labels.find((l) => l.querySelector('span')?.textContent === label)
  expect(hit, `字段在场：${label}`).toBeDefined()
  return hit!.querySelector('input') as HTMLInputElement
}

function textareaByLabel(label: string): HTMLTextAreaElement {
  const labels = Array.from(host?.querySelectorAll('label') ?? [])
  const hit = labels.find((l) => l.querySelector('span')?.textContent === label)
  expect(hit, `字段在场：${label}`).toBeDefined()
  return hit!.querySelector('textarea') as HTMLTextAreaElement
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

const settle = async (times = 6): Promise<void> => {
  for (let i = 0; i < times; i += 1) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

describe('F-UIRES-02 R5 MetaEditDialog 单行字段 Enter=保存', () => {
  it('单行字段（标题）改值+Enter → updateMeta 与保存钮同链路', async () => {
    renderDialog()
    const title = inputByLabel('标题')
    setInput(title, '新标题')
    keydown(title, 'Enter')
    await settle()
    expect(stubApi.library.updateMeta).toHaveBeenCalledTimes(1)
    const req = stubApi.library.updateMeta.mock.calls[0]![0] as { patch: Record<string, unknown> }
    expect(req.patch.title).toBe('新标题')
  })

  it('校验链同按钮：月份非法+Enter → 中文 toast 零 invoke（Enter 不绕过校验）', async () => {
    renderDialog()
    const month = inputByLabel('月份（1-12，留空=未定月）')
    setInput(month, '13')
    keydown(month, 'Enter')
    await settle()
    expect(stubApi.library.updateMeta).not.toHaveBeenCalled()
    expect(toastSpy).toHaveBeenCalledWith('月份需为 1-12 的整数', 'info')
  })

  it('IME 组词期 Enter（isComposing）→ 不保存（组词确认回车非提交意图）', async () => {
    renderDialog()
    const venue = inputByLabel('期刊/会议')
    setInput(venue, '组词期刊')
    keydown(venue, 'Enter', true)
    await settle()
    expect(stubApi.library.updateMeta).not.toHaveBeenCalled()
  })

  it('摘要 textarea Enter=换行不保存（乙类豁免面负锚——textarea 零动）', async () => {
    renderDialog()
    const abs = textareaByLabel('摘要')
    keydown(abs, 'Enter')
    await settle()
    expect(stubApi.library.updateMeta).not.toHaveBeenCalled()
  })
})
