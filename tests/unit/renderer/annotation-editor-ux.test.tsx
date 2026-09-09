// @vitest-environment jsdom
/**
 * [F-A11] 笔记编辑 UX 双缺组件测试（新建，always-active——ADR-0017 裁决 3）。
 *
 * 锁两个缺项：
 * ① 自动保存反馈——输入停顿 800ms 触发 onAutosave（防抖合并、与已存值相同
 *   不触发），resolve true→「已保存」标记 / false→「保存失败」标记；
 *   保存中续输的跨格序列（宪法状态机前置：结果不作废 dirty 态）。
 * ② 撤销/重做值栈——按钮对（栈空 disabled）+ 键盘 Ctrl+Z/Ctrl+Y/
 *   Ctrl+Shift+Z 拦截接值栈 + 100 步上限 + IME composition 整段一步。
 * AnnotationPopups 接线面（含 [W-A 门二] busy 串行竞态）在
 * annotation-popups-autosave.test.tsx（门二轮拆件——本件曾超 max-lines 500）。
 * React act 环境对齐 annotation-layer.test.tsx 既有形态；输入模拟对齐
 * lineage-tag-edit.test.tsx（native value setter + input 事件）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Annotation, AnnotationRect } from '../../../src/shared/models/annotation'
import { AnnotationEditor } from '../../../src/renderer/features/reader/AnnotationEditor'

/** 完整形态最小标注（comment 可覆写——lastSaved 语义用例需非空初值） */
function makeAnnotation(comment = ''): Annotation {
  return {
    id: 'anno-1',
    paperId: 'paper-1',
    page: 0,
    kind: 'highlight',
    color: 'yellow',
    quoteText: '被标注的引文内容',
    prefixText: '前',
    suffixText: '后',
    startOffset: 1,
    endOffset: 10,
    rects: [{ page: 0, x: 0.1, y: 0.2, w: 0.3, h: 0.05 }],
    comment,
    createdAt: '2026-08-23T00:00:00Z',
    updatedAt: '2026-08-23T00:00:00Z'
  }
}

const RECT: AnnotationRect = { page: 0, x: 0.1, y: 0.2, w: 0.3, h: 0.05 }

let root: Root | null = null
let host: HTMLDivElement | null = null

beforeEach(() => {
  vi.useFakeTimers()
  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  document.body.innerHTML = ''
  vi.useRealTimers()
  vi.clearAllMocks()
})

/** textarea 输入（lineage-tag-edit 同款：native setter + input 事件） */
function typeInto(el: HTMLTextAreaElement, text: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
  act(() => {
    setter?.call(el, text)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

/** textarea 上派发 keydown（cancelable——断言 defaultPrevented 用） */
function pressKey(el: Element, init: KeyboardEventInit): void {
  act(() => {
    el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }))
  })
}

/** 可控 promise（保存中续输的跨格序列用） */
function deferred<T>(): { promise: Promise<T>; resolve: (v: T) => void } {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

function renderEditor(
  props: Partial<Parameters<typeof AnnotationEditor>[0]> = {}
): { onAutosave: ReturnType<typeof vi.fn>; onCancel: ReturnType<typeof vi.fn> } {
  const onAutosave = vi.fn(() => Promise.resolve(true))
  const onCancel = vi.fn()
  act(() => {
    root!.render(
      <AnnotationEditor
        annotation={makeAnnotation()}
        rect={RECT}
        busy={false}
        onCancel={onCancel}
        onSave={vi.fn()}
        onDelete={vi.fn()}
        onAutosave={onAutosave}
        {...props}
      />
    )
  })
  return { onAutosave, onCancel }
}

function textarea(): HTMLTextAreaElement {
  const el = host!.querySelector('textarea')
  expect(el).not.toBeNull()
  return el as HTMLTextAreaElement
}

function undoBtn(): HTMLButtonElement {
  return host!.querySelector<HTMLButtonElement>('[data-testid="annotation-editor-undo"]')!
}

function redoBtn(): HTMLButtonElement {
  return host!.querySelector<HTMLButtonElement>('[data-testid="annotation-editor-redo"]')!
}

function savedFlag(): Element | null {
  return host!.querySelector('[data-testid="annotation-saved-flag"]')
}

describe('F-A11 ① 自动保存反馈 —— AnnotationEditor', () => {
  it('初始态：无已保存标记、撤销/重做均禁用、800ms 后未输入不触发自动保存', async () => {
    const { onAutosave } = renderEditor()
    expect(savedFlag()).toBeNull()
    expect(undoBtn().disabled).toBe(true)
    expect(redoBtn().disabled).toBe(true)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600)
    })
    expect(onAutosave).not.toHaveBeenCalled()
  })

  it('输入停顿 800ms → onAutosave 收值且 resolve true → 「已保存」标记在场', async () => {
    const { onAutosave } = renderEditor()
    typeInto(textarea(), '我是奶龙')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700)
    })
    expect(onAutosave).not.toHaveBeenCalled()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })
    expect(onAutosave).toHaveBeenCalledTimes(1)
    expect(onAutosave).toHaveBeenCalledWith('我是奶龙')
    expect(savedFlag()?.textContent).toBe('已保存')
  })

  it('防抖窗口内续输合并：只调一次、值=最后值', async () => {
    const { onAutosave } = renderEditor()
    typeInto(textarea(), '奶')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400)
    })
    typeInto(textarea(), '我是奶龙')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(onAutosave).toHaveBeenCalledTimes(1)
    expect(onAutosave).toHaveBeenCalledWith('我是奶龙')
  })

  it('resolve false → 「保存失败」标记', async () => {
    renderEditor({ onAutosave: vi.fn(() => Promise.resolve(false)) })
    typeInto(textarea(), 'x')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(savedFlag()?.textContent).toBe('保存失败')
  })

  it('保存中续输（跨格序列）：在途结果不作废 dirty → 下一轮存新值后才显「已保存」', async () => {
    const d1 = deferred<boolean>()
    const d2 = deferred<boolean>()
    const onAutosave = vi.fn((c: string) => (c === 'a' ? d1.promise : d2.promise))
    renderEditor({ onAutosave })
    typeInto(textarea(), 'a')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(onAutosave).toHaveBeenCalledTimes(1)
    typeInto(textarea(), 'ab')
    await act(async () => {
      d1.resolve(true)
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(savedFlag()).toBeNull()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(onAutosave).toHaveBeenCalledTimes(2)
    expect(onAutosave).toHaveBeenLastCalledWith('ab')
    await act(async () => {
      d2.resolve(true)
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(savedFlag()?.textContent).toBe('已保存')
  })

  it('在途保存×期间回退 lastSaved（W-1 跨格）：resolve 后防抖重挂 → 第二次收当前值落盘', async () => {
    const d1 = deferred<boolean>()
    const onAutosave = vi.fn((c: string) => (c === 'x' ? d1.promise : Promise.resolve(true)))
    renderEditor({ annotation: makeAnnotation('orig'), onAutosave })
    typeInto(textarea(), 'x')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(onAutosave).toHaveBeenCalledTimes(1)
    // 在途（saving(x) 未 resolve）时 undo 回初始值=lastSaved → clean 分支撤 timer
    act(() => {
      undoBtn().click()
    })
    expect(textarea().value).toBe('orig')
    await act(async () => {
      d1.resolve(true)
      await vi.advanceTimersByTimeAsync(0)
    })
    // lastSaved 已随 resolve 前进为 x，当前值 orig≠x——无标记且必须重挂防抖
    expect(savedFlag()).toBeNull()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(onAutosave).toHaveBeenCalledTimes(2)
    expect(onAutosave).toHaveBeenNthCalledWith(2, 'orig')
    expect(savedFlag()?.textContent).toBe('已保存')
  })

  it('failed 闭环（W-2）：失败标记 → 再输入 dirty 无标记 → 再存 true → 已保存', async () => {
    const outcomes = [false, true]
    const onAutosave = vi.fn(() => Promise.resolve(outcomes.shift() ?? true))
    renderEditor({ onAutosave })
    typeInto(textarea(), 'a')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(savedFlag()?.textContent).toBe('保存失败')
    typeInto(textarea(), 'ab')
    expect(savedFlag()).toBeNull()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(onAutosave).toHaveBeenNthCalledWith(2, 'ab')
    expect(savedFlag()?.textContent).toBe('已保存')
  })

  it('回退到初始值也再存（lastSaved 语义）：存 x 后 undo 回初始 → 第二次调用收初始值', async () => {
    const { onAutosave } = renderEditor({ annotation: makeAnnotation('orig') })
    typeInto(textarea(), 'x')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(onAutosave).toHaveBeenNthCalledWith(1, 'x')
    act(() => {
      undoBtn().click()
    })
    expect(textarea().value).toBe('orig')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(onAutosave).toHaveBeenNthCalledWith(2, 'orig')
  })

  it('卸载时清防抖：到期后不调 onAutosave 不抛错', async () => {
    const { onAutosave } = renderEditor()
    typeInto(textarea(), 'x')
    act(() => {
      root?.unmount()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600)
    })
    expect(onAutosave).not.toHaveBeenCalled()
  })

  it('Escape 原语义保留：textarea keydown → onCancel 一次', () => {
    const { onCancel } = renderEditor()
    pressKey(textarea(), { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('失败轮在途回退已存值（N-A）：resolve false 后零写零标记，再输入重试链正常', async () => {
    const d1 = deferred<boolean>()
    const outcomes = [d1.promise, Promise.resolve(true)]
    const onAutosave = vi.fn(() => outcomes.shift() ?? Promise.resolve(true))
    renderEditor({ annotation: makeAnnotation('orig'), onAutosave })
    typeInto(textarea(), 'x')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(onAutosave).toHaveBeenCalledTimes(1)
    // 失败轮在途：undo 回初始值=已存值（clean 撤 timer）
    act(() => {
      undoBtn().click()
    })
    expect(textarea().value).toBe('orig')
    await act(async () => {
      d1.resolve(false)
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(savedFlag()).toBeNull()
    // 值已回退到已存值：不再重试不再空写
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600)
    })
    expect(onAutosave).toHaveBeenCalledTimes(1)
    // 再输入：重试链恢复正常
    typeInto(textarea(), 'y')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(onAutosave).toHaveBeenNthCalledWith(2, 'y')
    expect(savedFlag()?.textContent).toBe('已保存')
  })
})

describe('F-A11 ② 撤销/重做值栈 —— AnnotationEditor', () => {
  it('按钮对逐步回退/复原：三步输入 → 撤两步 → 重做一步，disabled 态随栈变化', () => {
    renderEditor()
    const ta = textarea()
    typeInto(ta, 'a')
    typeInto(ta, 'ab')
    typeInto(ta, 'abc')
    expect(undoBtn().disabled).toBe(false)
    act(() => {
      undoBtn().click()
    })
    expect(ta.value).toBe('ab')
    act(() => {
      undoBtn().click()
    })
    expect(ta.value).toBe('a')
    expect(redoBtn().disabled).toBe(false)
    act(() => {
      redoBtn().click()
    })
    expect(ta.value).toBe('ab')
    act(() => {
      undoBtn().click()
    })
    expect(ta.value).toBe('a')
    act(() => {
      undoBtn().click()
    })
    expect(ta.value).toBe('')
    expect(undoBtn().disabled).toBe(true)
  })

  it('键盘拦截接值栈：ctrl+z 回退、ctrl+y / ctrl+shift+z 重做，均 preventDefault', () => {
    renderEditor()
    const ta = textarea()
    typeInto(ta, 'a')
    typeInto(ta, 'ab')
    const undoEvt = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true })
    act(() => {
      ta.dispatchEvent(undoEvt)
    })
    expect(ta.value).toBe('a')
    expect(undoEvt.defaultPrevented).toBe(true)
    pressKey(ta, { key: 'y', ctrlKey: true })
    expect(ta.value).toBe('ab')
    pressKey(ta, { key: 'z', ctrlKey: true })
    expect(ta.value).toBe('a')
    pressKey(ta, { key: 'Z', ctrlKey: true, shiftKey: true })
    expect(ta.value).toBe('ab')
  })

  it('栈上限 100：105 步输入后撤 100 步达第 5 值且撤销禁用，重做可复 1 步', () => {
    renderEditor()
    const ta = textarea()
    for (let i = 1; i <= 105; i++) {
      typeInto(ta, String(i).padStart(3, '0'))
    }
    for (let i = 0; i < 100; i++) {
      act(() => {
        undoBtn().click()
      })
    }
    expect(ta.value).toBe('005')
    expect(undoBtn().disabled).toBe(true)
    act(() => {
      redoBtn().click()
    })
    expect(ta.value).toBe('006')
  })

  it('IME composition（N-6）：两片段期间不入栈，end 后整段一步——undo 一步回退整段', () => {
    renderEditor()
    const ta = textarea()
    act(() => {
      ta.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    })
    typeInto(ta, '我是')
    typeInto(ta, '我是奶龙')
    // 组词期间：片段不入栈（undo 禁用）
    expect(undoBtn().disabled).toBe(true)
    act(() => {
      ta.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))
    })
    expect(undoBtn().disabled).toBe(false)
    act(() => {
      undoBtn().click()
    })
    expect(ta.value).toBe('')
    expect(undoBtn().disabled).toBe(true)
    act(() => {
      redoBtn().click()
    })
    expect(ta.value).toBe('我是奶龙')
  })

  it('IME end 后同值 change（N-B）：幂等不入栈——undo 仍一步整段回退', () => {
    renderEditor()
    const ta = textarea()
    act(() => {
      ta.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    })
    typeInto(ta, '我是')
    typeInto(ta, '我是奶龙')
    act(() => {
      ta.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))
    })
    // 浏览器序变体：end 后再派发携带终值的 input/onChange
    typeInto(ta, '我是奶龙')
    act(() => {
      undoBtn().click()
    })
    expect(ta.value).toBe('')
    expect(undoBtn().disabled).toBe(true)
    act(() => {
      redoBtn().click()
    })
    expect(ta.value).toBe('我是奶龙')
  })
})
