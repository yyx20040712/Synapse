// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import {
  useReaderShortcuts,
  SCROLL_STEP_RATIO,
  type ReaderShortcutActions
} from '../../../src/renderer/features/reader/ReaderShortcuts'
import { guardedDescribe } from '../../utils/guard'

vi.mock('../../../src/renderer/shared/ui/Toast', () => ({ showToast: vi.fn() }))
import { showToast } from '../../../src/renderer/shared/ui/Toast'

/** 挂载只调用本 hook 的探针组件；返回卸载句柄 */
function mountShortcuts(actions: ReaderShortcutActions): () => void {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  function Probe(): null {
    useReaderShortcuts(actions)
    return null
  }
  act(() => {
    root.render(<Probe />)
  })
  return () => {
    act(() => {
      root.unmount()
    })
    host.remove()
  }
}

function key(target: EventTarget, init: KeyboardEventInit): KeyboardEvent {
  const ev = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
  target.dispatchEvent(ev)
  return ev
}

function wheel(init: WheelEventInit): WheelEvent {
  const ev = new WheelEvent('wheel', { bubbles: true, cancelable: true, ...init })
  document.dispatchEvent(ev)
  return ev
}

/** 剪贴板桩（jsdom 无 navigator.clipboard 实现） */
const writeText = vi.fn<(t: string) => Promise<void>>()
function installClipboard(): void {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true
  })
}

/** 在 body 放一段选中文本（非 editable 目标选区） */
function selectText(text: string): void {
  const node = document.createTextNode(text)
  document.body.appendChild(node)
  const range = document.createRange()
  range.selectNodeContents(node)
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
}

function makeActions() {
  return {
    prevPage: vi.fn(),
    nextPage: vi.fn(),
    spaceScroll: vi.fn(),
    zoomStep: vi.fn(),
    undo: vi.fn()
  }
}

afterEach(() => {
  window.getSelection()?.removeAllRanges()
  document.body.textContent = ''
  writeText.mockReset()
  vi.mocked(showToast).mockClear()
})

guardedDescribe('SR2-KEY-02', 'ReaderShortcuts —— 阅读器快捷键与滚轮缩放', () => {
  it('翻页键位映射：PageDown/ArrowRight→next，PageUp/ArrowLeft→prev，均阻断原生滚动（防双移动）', () => {
    const a = makeActions()
    const unmount = mountShortcuts(a)
    const pd = key(document, { key: 'PageDown' })
    expect(a.nextPage).toHaveBeenCalledTimes(1)
    expect(pd.defaultPrevented).toBe(true)
    key(document, { key: 'ArrowRight' })
    expect(a.nextPage).toHaveBeenCalledTimes(2)
    const pu = key(document, { key: 'PageUp' })
    expect(a.prevPage).toHaveBeenCalledTimes(1)
    expect(pu.defaultPrevented).toBe(true)
    key(document, { key: 'ArrowLeft' })
    expect(a.prevPage).toHaveBeenCalledTimes(2)
    unmount()
  })

  it('ctrl+z：撤销标注操作栈触发（UNDO-01 键位面；editable 避让由 keymap 层保障——textarea 内为原生 undo）', () => {
    const a = makeActions()
    const unmount = mountShortcuts(a)
    const z = key(document, { key: 'z', ctrlKey: true })
    expect(a.undo).toHaveBeenCalledTimes(1)
    expect(z.defaultPrevented).toBe(true)
    unmount()
  })

  it('ctrl+c：非 editable 选区写入剪贴板', () => {
    installClipboard()
    writeText.mockResolvedValue(undefined)
    const a = makeActions()
    const unmount = mountShortcuts(a)
    selectText('被选中的阅读器文本')
    key(document, { key: 'c', ctrlKey: true })
    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText).toHaveBeenCalledWith('被选中的阅读器文本')
    unmount()
  })

  it('ctrl+c：无选区不写剪贴板（preventDefault 已发但原生空复制为 no-op——等价无害）', () => {
    installClipboard()
    const a = makeActions()
    const unmount = mountShortcuts(a)
    const ev = key(document, { key: 'c', ctrlKey: true })
    expect(writeText).not.toHaveBeenCalled()
    expect(ev.defaultPrevented).toBe(true)
    unmount()
  })

  it('ctrl+c：clipboard 不可用同步抛错时动作型失败 toast（INV-02）', () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true
    })
    const a = makeActions()
    const unmount = mountShortcuts(a)
    selectText('同步异常路径文本')
    key(document, { key: 'c', ctrlKey: true })
    expect(showToast).toHaveBeenCalledWith('复制到剪贴板失败')
    unmount()
  })

  it('ctrl+c：剪贴板拒绝写入时动作型失败 toast（INV-02）', async () => {
    installClipboard()
    writeText.mockRejectedValue(new Error('denied'))
    const a = makeActions()
    const unmount = mountShortcuts(a)
    selectText('将失败复制的文本')
    key(document, { key: 'c', ctrlKey: true })
    await vi.waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('复制到剪贴板失败')
    })
    unmount()
  })

  it('ctrl+滚轮：上滚放大下滚缩小并 preventDefault；无 ctrl 透传', () => {
    const a = makeActions()
    const unmount = mountShortcuts(a)
    const up = wheel({ ctrlKey: true, deltaY: -120 })
    expect(a.zoomStep).toHaveBeenCalledWith(1)
    expect(up.defaultPrevented).toBe(true)
    const down = wheel({ ctrlKey: true, deltaY: 120 })
    expect(a.zoomStep).toHaveBeenCalledWith(-1)
    expect(down.defaultPrevented).toBe(true)
    a.zoomStep.mockClear()
    const plain = wheel({ deltaY: 120 })
    expect(a.zoomStep).not.toHaveBeenCalled()
    expect(plain.defaultPrevented).toBe(false)
    const zero = wheel({ ctrlKey: true, deltaY: 0 })
    expect(a.zoomStep).not.toHaveBeenCalled()
    expect(zero.defaultPrevented).toBe(true)
    unmount()
  })

  it('卸载清理（INV-14 消费方级）：unmount 后键位与滚轮均不再触发', () => {
    const a = makeActions()
    const unmount = mountShortcuts(a)
    unmount()
    key(document, { key: 'PageDown' })
    wheel({ ctrlKey: true, deltaY: -120 })
    expect(a.nextPage).not.toHaveBeenCalled()
    expect(a.zoomStep).not.toHaveBeenCalled()
  })

  it('滚轮监听 add/remove 同函数成对（INV-14 配对面）', () => {
    const added: Array<{ type: string; l: EventListener }> = []
    const removed: Array<{ type: string; l: EventListener }> = []
    const addSpy = vi
      .spyOn(document, 'addEventListener')
      .mockImplementation((t, l) => {
        added.push({ type: t, l: l as EventListener })
      })
    const rmSpy = vi
      .spyOn(document, 'removeEventListener')
      .mockImplementation((t, l) => {
        removed.push({ type: t, l: l as EventListener })
      })
    try {
      const unmount = mountShortcuts(makeActions())
      const wheelAdded = added.filter((x) => x.type === 'wheel')
      expect(wheelAdded).toHaveLength(1)
      unmount()
      const wheelRemoved = removed.filter((x) => x.type === 'wheel')
      expect(wheelRemoved).toHaveLength(1)
      expect(wheelRemoved[0]?.l).toBe(wheelAdded[0]?.l)
    } finally {
      addSpy.mockRestore()
      rmSpy.mockRestore()
    }
  })
})

// ── F-03 键位迁移（滚动步+空格；always-active——ADR-0017 裁决 3）──

describe('ReaderShortcuts F-03 键位迁移（滚动步+空格下滚一屏）', () => {
  it('空格：触发下滚一屏动作+preventDefault（统一滚动步长，阻断原生空格滚动）', () => {
    const a = makeActions()
    const unmount = mountShortcuts(a)
    const ev = key(document, { key: ' ' })
    expect(a.spaceScroll).toHaveBeenCalledTimes(1)
    expect(ev.defaultPrevented).toBe(true)
    unmount()
  })

  it('空格 editable 避让（既有 keymap 层保障）：textarea 内不接管，原生输入透传', () => {
    const a = makeActions()
    const unmount = mountShortcuts(a)
    const ta = document.createElement('textarea')
    document.body.appendChild(ta)
    const ev = key(ta, { key: ' ' })
    expect(a.spaceScroll).not.toHaveBeenCalled()
    expect(ev.defaultPrevented).toBe(false)
    unmount()
  })

  it('滚动步常量：SCROLL_STEP_RATIO=0.9（一屏−一行重叠，票面定值）', () => {
    expect(SCROLL_STEP_RATIO).toBe(0.9)
  })
})
