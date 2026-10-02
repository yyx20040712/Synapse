// @vitest-environment jsdom
/**
 * [F-UIRES-02 批 A R1] inline-keys 共享件（src/renderer/shared/inline-keys.ts）
 * 行为锁：
 * - inlineKeyDown：Enter=提交+preventDefault / Esc=取消（先 skipBlur 标记）
 *   +preventDefault / isComposing 全守 / 无关键零回调（FolderNavRows 模块私有
 *   提升的签名零变——键面单源）。
 * - useComposingCommit：compositionstart/end 维护 composingRef；compositionend
 *   时 activeElement 判定——聚焦态常规组词确认不提交、失焦后到达（序 B：blur
 *   先被拒→compositionend 后到）补提交（TagEditor/EdgeMenu/LineTypeMenu 三份
 *   手写拷贝合一，受锁 tag-editor 三路矩阵保活=等价迁移验收线，另见该文件）。
 * always-active 裸 describe（K3）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { inlineKeyDown, useComposingCommit } from '../../../src/renderer/shared/inline-keys'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

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

/** inlineKeyDown 测试壳（经 React onKeyDown 委托派发——合成事件构造法） */
function KeyProbe(props: { onEnter(): void; onEsc(): void; skipBlur(): void }): JSX.Element {
  return (
    <input
      data-testid="key-probe"
      onKeyDown={(e) => inlineKeyDown(e, props.onEnter, props.onEsc, props.skipBlur)}
    />
  )
}

function keyInput(): HTMLInputElement {
  const el = host?.querySelector('[data-testid="key-probe"]')
  if (!(el instanceof HTMLInputElement)) throw new Error('key probe 不在场')
  return el
}

/** useComposingCommit 测试壳（消费面同构：blur 组词拒绝分支复位 ref——INV-85⑥） */
function ComposeProbe(props: { onCommit(): void }): JSX.Element {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const c = useComposingCommit(inputRef, props.onCommit)
  return (
    <input
      data-testid="compose-probe"
      ref={inputRef}
      onCompositionStart={c.onCompositionStart}
      onCompositionEnd={c.onCompositionEnd}
      onBlur={() => {
        if (c.composingRef.current) {
          c.composingRef.current = false
          return
        }
        props.onCommit()
      }}
    />
  )
}

function composeInput(): HTMLInputElement {
  const el = host?.querySelector('[data-testid="compose-probe"]')
  if (!(el instanceof HTMLInputElement)) throw new Error('compose probe 不在场')
  return el
}

describe('F-UIRES-02 inlineKeyDown（键面单源——FolderNavRows 提升签名零变）', () => {
  it('Enter：onEnter 调用+preventDefault（默认行为不吃）', () => {
    const onEnter = vi.fn()
    const onEsc = vi.fn()
    const skip = vi.fn()
    act(() => {
      root?.render(<KeyProbe onEnter={onEnter} onEsc={onEsc} skipBlur={skip} />)
    })
    act(() => {
      keyInput().dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
      )
    })
    expect(onEnter).toHaveBeenCalledTimes(1)
    expect(onEsc).not.toHaveBeenCalled()
    expect(skip).not.toHaveBeenCalled()
    // preventDefault 锚（Enter 上吃掉默认提交类行为）
    const ev = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    act(() => {
      keyInput().dispatchEvent(ev)
    })
    expect(ev.defaultPrevented).toBe(true)
  })

  it('Esc：先 skipBlur 标记再 onEsc（Esc 收起防紧随失焦提交）+preventDefault', () => {
    const onEnter = vi.fn()
    const onEsc = vi.fn()
    const skip = vi.fn()
    act(() => {
      root?.render(<KeyProbe onEnter={onEnter} onEsc={onEsc} skipBlur={skip} />)
    })
    const ev = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    act(() => {
      keyInput().dispatchEvent(ev)
    })
    expect(onEsc).toHaveBeenCalledTimes(1)
    expect(skip).toHaveBeenCalledTimes(1)
    // 调用序锚：skipBlur 先于 onEsc（标记先行——FolderNavRows 语义）
    const order: string[] = []
    skip.mockImplementation(() => order.push('skip'))
    onEsc.mockImplementation(() => order.push('esc'))
    act(() => {
      keyInput().dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
      )
    })
    expect(order).toEqual(['skip', 'esc'])
    expect(onEnter).not.toHaveBeenCalled()
    expect(ev.defaultPrevented).toBe(true)
  })

  it('IME 组词期 Enter/Esc（isComposing）→ 全守零回调', () => {
    const onEnter = vi.fn()
    const onEsc = vi.fn()
    const skip = vi.fn()
    act(() => {
      root?.render(<KeyProbe onEnter={onEnter} onEsc={onEsc} skipBlur={skip} />)
    })
    act(() => {
      keyInput().dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, isComposing: true })
      )
      keyInput().dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true, isComposing: true })
      )
    })
    expect(onEnter).not.toHaveBeenCalled()
    expect(onEsc).not.toHaveBeenCalled()
    expect(skip).not.toHaveBeenCalled()
  })

  it('无关键（如方向键/Tab）→ 零回调不拦截', () => {
    const onEnter = vi.fn()
    const onEsc = vi.fn()
    const skip = vi.fn()
    act(() => {
      root?.render(<KeyProbe onEnter={onEnter} onEsc={onEsc} skipBlur={skip} />)
    })
    const ev = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true })
    act(() => {
      keyInput().dispatchEvent(ev)
    })
    expect(onEnter).not.toHaveBeenCalled()
    expect(onEsc).not.toHaveBeenCalled()
    expect(skip).not.toHaveBeenCalled()
    expect(ev.defaultPrevented).toBe(false)
  })
})

describe('F-UIRES-02 useComposingCommit（序 B 补提交合一——三拷贝等价迁移）', () => {
  it('聚焦态常规组词确认（compositionstart+end 未失焦）→ 不提交（Enter/blur 路自负）', () => {
    const onCommit = vi.fn()
    act(() => {
      root?.render(<ComposeProbe onCommit={onCommit} />)
    })
    act(() => {
      composeInput().focus()
      composeInput().dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
      composeInput().dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))
    })
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('序 B：组词中失焦（blur 先拒）→compositionend 后到=补提交一次', () => {
    const onCommit = vi.fn()
    act(() => {
      root?.render(<ComposeProbe onCommit={onCommit} />)
    })
    act(() => {
      composeInput().focus()
      composeInput().dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    })
    act(() => {
      composeInput().blur()
    })
    // 组词中 blur 被消费面拒绝（ref 复位）——blur 路不提交
    expect(onCommit).not.toHaveBeenCalled()
    act(() => {
      composeInput().dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))
    })
    // 失焦后 compositionend 到达=补提交
    expect(onCommit).toHaveBeenCalledTimes(1)
  })

  it('非组词态 compositionend（漏发 start 的孤儿 end）→ 不提交', () => {
    const onCommit = vi.fn()
    act(() => {
      root?.render(<ComposeProbe onCommit={onCommit} />)
    })
    act(() => {
      composeInput().focus()
      composeInput().dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))
    })
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('commit 闭包取最新渲染语义（镜像 ref——多渲染后回调不陈旧）', () => {
    let n = 0
    const spy = vi.fn(() => undefined)
    act(() => {
      root?.render(<ComposeProbe onCommit={() => { n += 1; spy() }} />)
    })
    // 重渲染（commit 闭包重建——hook 内 commitRef 镜像更新）
    act(() => {
      root?.render(<ComposeProbe onCommit={() => { n += 10; spy() }} />)
    })
    act(() => {
      composeInput().focus()
      composeInput().blur()
    })
    expect(n).toBe(10)
    expect(spy).toHaveBeenCalledTimes(1)
  })
})
