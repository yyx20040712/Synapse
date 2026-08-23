// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import {
  isEditableTarget,
  registerKeymap,
  unregisterKeymap,
  type KeyBinding
} from '../../../src/renderer/shared/keymap'
import { guardedDescribe } from '../../utils/guard'

/** 在指定目标上派发冒泡 keydown（document 级监听可捕获，target 保留派发元素） */
function press(target: EventTarget, init: KeyboardEventInit): KeyboardEvent {
  const ev = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
  target.dispatchEvent(ev)
  return ev
}

/** 本组测试的注册登记（afterEach 全量注销——模块单例的测试间隔离） */
const registered: string[] = []
function reg(id: string, bindings: KeyBinding[]): void {
  registered.push(id)
  registerKeymap(id, bindings)
}

afterEach(() => {
  for (const id of registered) unregisterKeymap(id)
  registered.length = 0
})

guardedDescribe('SR2-KEY-01', 'keymap —— 键盘快捷键单例', () => {
  it('命中与 ctrl 归一：ctrl 绑定在 ctrlKey 或 metaKey 事件下均触发', () => {
    const h = vi.fn()
    reg('t-hit', [{ key: 'c', ctrl: true, handler: h }])
    press(document, { key: 'c', ctrlKey: true })
    expect(h).toHaveBeenCalledTimes(1)
    press(document, { key: 'c', metaKey: true })
    expect(h).toHaveBeenCalledTimes(2)
  })

  it('覆盖幂等：同 id 重复 register 不叠加（单次事件单次调用）', () => {
    const h = vi.fn()
    const b: KeyBinding[] = [{ key: 'x', handler: h }]
    reg('t-over', b)
    registerKeymap('t-over', b)
    press(document, { key: 'x' })
    expect(h).toHaveBeenCalledTimes(1)
  })

  it('成对注销（行为）：最后一个 unregister 后，后续事件不再触发任何 handler', () => {
    const h = vi.fn()
    reg('t-pair', [{ key: 'y', handler: h }])
    press(document, { key: 'y' })
    expect(h).toHaveBeenCalledTimes(1)
    unregisterKeymap('t-pair')
    press(document, { key: 'y' })
    expect(h).toHaveBeenCalledTimes(1)
  })

  it('成对注销（INV-14 配对）：监听 add/remove 同函数成对——最后一个注销必须真实移除', () => {
    const added: EventListener[] = []
    const removed: EventListener[] = []
    const addSpy = vi
      .spyOn(document, 'addEventListener')
      .mockImplementation((_type, l) => {
        added.push(l as EventListener)
      })
    const rmSpy = vi
      .spyOn(document, 'removeEventListener')
      .mockImplementation((_type, l) => {
        removed.push(l as EventListener)
      })
    try {
      reg('t-pair2', [{ key: 'w', handler: vi.fn() }])
      expect(added).toHaveLength(1)
      expect(removed).toHaveLength(0)
      unregisterKeymap('t-pair2')
      expect(removed).toHaveLength(1)
      expect(removed[0]).toBe(added[0])
    } finally {
      addSpy.mockRestore()
      rmSpy.mockRestore()
    }
  })

  it('跨格序列：register→unregister→register 同 id 无双绑定残留', () => {
    const h = vi.fn()
    const b: KeyBinding[] = [{ key: 'z', handler: h }]
    registerKeymap('t-seq', b)
    unregisterKeymap('t-seq')
    reg('t-seq', b)
    press(document, { key: 'z' })
    expect(h).toHaveBeenCalledTimes(1)
  })

  it('editable 避让：input 焦点目标不消费不阻断', () => {
    const h = vi.fn()
    reg('t-edit', [{ key: 'c', ctrl: true, preventDefault: true, handler: h }])
    const input = document.createElement('input')
    document.body.append(input)
    const ev = press(input, { key: 'c', ctrlKey: true })
    expect(h).not.toHaveBeenCalled()
    expect(ev.defaultPrevented).toBe(false)
  })

  it('preventDefault 显式 true 才阻断（缺省 false 透传）', () => {
    const hPass = vi.fn()
    reg('t-pd1', [{ key: 'a', handler: hPass }])
    const evPass = press(document, { key: 'a' })
    expect(hPass).toHaveBeenCalledTimes(1)
    expect(evPass.defaultPrevented).toBe(false)
    const hBlock = vi.fn()
    reg('t-pd2', [{ key: 'b', preventDefault: true, handler: hBlock }])
    const evBlock = press(document, { key: 'b' })
    expect(hBlock).toHaveBeenCalledTimes(1)
    expect(evBlock.defaultPrevented).toBe(true)
  })

  it('未命中透传：修饰不符或键名不符时不调用', () => {
    const h = vi.fn()
    reg('t-miss', [{ key: 'c', ctrl: true, handler: h }])
    press(document, { key: 'c' })
    press(document, { key: 'v', ctrlKey: true })
    expect(h).not.toHaveBeenCalled()
  })

  it('修饰精确匹配：裸键绑定不吃修饰组合（Ctrl+n 不触发裸 n）', () => {
    const h = vi.fn()
    reg('t-bare', [{ key: 'n', handler: h }])
    press(document, { key: 'n', ctrlKey: true })
    expect(h).not.toHaveBeenCalled()
    press(document, { key: 'n' })
    expect(h).toHaveBeenCalledTimes(1)
  })

  it('shift 修饰：显式 shift 绑定仅在 shift 按下时触发', () => {
    const h = vi.fn()
    reg('t-shift', [{ key: 'x', shift: true, handler: h }])
    press(document, { key: 'x' })
    expect(h).not.toHaveBeenCalled()
    press(document, { key: 'x', shiftKey: true })
    expect(h).toHaveBeenCalledTimes(1)
  })

  it('contenteditable="false" 显式禁用：不视为编辑目标', () => {
    const off = document.createElement('div')
    off.setAttribute('contenteditable', 'false')
    expect(isEditableTarget(off)).toBe(false)
  })

  it('isEditableTarget：input/textarea/contentEditable/普通元素/空目标判定', () => {
    const input = document.createElement('input')
    const ta = document.createElement('textarea')
    const div = document.createElement('div')
    const rich = document.createElement('div')
    rich.setAttribute('contenteditable', 'true')
    expect(isEditableTarget(input)).toBe(true)
    expect(isEditableTarget(ta)).toBe(true)
    expect(isEditableTarget(rich)).toBe(true)
    expect(isEditableTarget(div)).toBe(false)
    expect(isEditableTarget(null)).toBe(false)
  })
})
