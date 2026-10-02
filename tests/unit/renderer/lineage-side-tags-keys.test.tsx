// @vitest-environment jsdom
/**
 * [F-UIRES-02 批 A R8] LineageSideTags 常驻添加输入三路范式（丙类对齐
 * TagEditor：Enter/失焦/＋钮提交+Esc 清空；lineage-tag-edit.test 姊妹件
 * ——受锁既有件零改动）。
 *
 * - 失焦=提交（序 B 补提交——组词中失焦拒绝、compositionend 后到补提交
 *   取 DOM 定案文本；空名/同名静默短路既有维持）。
 * - Esc=清空输入（常驻输入取消语义）。
 * - ＋钮 mousedown preventDefault（防点击夺焦触发 blur 双发——TagEditor:213
 *   先例）。
 * always-active 裸 describe（K3）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LineageNode } from '../../../src/shared/models/lineage'
import { LineageSideTags } from '../../../src/renderer/features/lineage/LineageSideTags'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

function nodeOf(tags: string[] | null): LineageNode {
  return {
    id: 'A',
    paperId: 'paper-A',
    title: '节点A',
    coreIdea: '',
    year: 2020,
    x: null,
    y: null,
    month: null,
    slot: null,
    folderId: '__main__',
    createdAt: 't',
    updatedAt: 't',
    tags
  }
}

let root: Root | null = null
let host: HTMLDivElement | null = null

beforeEach(() => {
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

function mountWithSpy(tags: string[] | null): ReturnType<typeof vi.fn> {
  const onSetTags = vi.fn()
  act(() => {
    root?.render(<LineageSideTags node={nodeOf(tags)} onSetTags={onSetTags} />)
  })
  return onSetTags
}

function tagInput(): HTMLInputElement {
  const el = host?.querySelector('[data-testid="lineage-tag-input"]')
  if (!(el instanceof HTMLInputElement)) throw new Error('标签输入框不在场')
  return el
}

function addBtn(): HTMLButtonElement {
  const b = [...(host?.querySelectorAll('button') ?? [])].find((x) => x.textContent === '+')
  if (!(b instanceof HTMLButtonElement)) throw new Error('＋钮不在场')
  return b
}

function setInput(value: string): void {
  const el = tagInput()
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  act(() => {
    setter.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function keydown(key: string, isComposing = false): void {
  act(() => {
    tagInput().dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, isComposing })
    )
  })
}

function compose(type: 'compositionstart' | 'compositionend'): void {
  act(() => {
    tagInput().dispatchEvent(new CompositionEvent(type, { bubbles: true }))
  })
}

describe('F-UIRES-02 R8 侧板标签输入三路提交+Esc 清空', () => {
  it('失焦=提交：输入+blur → onSetTags 合并数组（资源管理器语义）', async () => {
    const onSetTags = mountWithSpy(['综述'])
    act(() => {
      tagInput().focus()
    })
    setInput('新方法')
    act(() => {
      tagInput().blur()
    })
    expect(onSetTags).toHaveBeenCalledTimes(1)
    expect(onSetTags).toHaveBeenCalledWith('A', ['综述', '新方法'])
    expect(tagInput().value, '提交后输入清空').toBe('')
  })

  it('空名失焦=静默零派发；同名失焦=静默零派发（既有短路维持）', async () => {
    const onSetTags = mountWithSpy(['综述'])
    act(() => {
      tagInput().focus()
    })
    setInput('   ')
    act(() => {
      tagInput().blur()
    })
    expect(onSetTags, '空名零派发').not.toHaveBeenCalled()
    act(() => {
      tagInput().focus()
    })
    setInput('综述')
    act(() => {
      tagInput().blur()
    })
    expect(onSetTags, '同名零派发').not.toHaveBeenCalled()
  })

  it('Esc=清空输入（常驻输入取消语义=清空非卸载）', async () => {
    const onSetTags = mountWithSpy([])
    setInput('半途输入')
    keydown('Escape')
    expect(tagInput().value).toBe('')
    expect(onSetTags).not.toHaveBeenCalled()
  })

  it('IME 组词期 Enter（isComposing）→ 零派发', async () => {
    const onSetTags = mountWithSpy([])
    setInput('组词标签')
    keydown('Enter', true)
    expect(onSetTags).not.toHaveBeenCalled()
  })

  it('组词中失焦→拒提交；失焦后 compositionend=序 B 补提交定案文本', async () => {
    const onSetTags = mountWithSpy([])
    act(() => {
      tagInput().focus()
    })
    setInput('组词中新')
    compose('compositionstart')
    act(() => {
      tagInput().blur()
    })
    // 组词中 blur 被拒（组词中文本非定案）
    expect(onSetTags).not.toHaveBeenCalled()
    // DOM 定案文本（state 滞后场景——补提交取 DOM 值）
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    act(() => {
      setter.call(tagInput(), '定案标签')
    })
    compose('compositionend')
    expect(onSetTags).toHaveBeenCalledTimes(1)
    expect(onSetTags).toHaveBeenCalledWith('A', ['定案标签'])
  })

  it('＋钮 mousedown preventDefault（防点击夺焦触发 blur 双发）', async () => {
    const onSetTags = mountWithSpy([])
    setInput('按钮路标签')
    const md = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    act(() => {
      addBtn().dispatchEvent(md)
    })
    expect(md.defaultPrevented, 'mousedown 已 preventDefault（input 不失焦）').toBe(true)
    act(() => {
      addBtn().click()
    })
    expect(onSetTags).toHaveBeenCalledTimes(1)
    expect(onSetTags).toHaveBeenCalledWith('A', ['按钮路标签'])
  })
})
