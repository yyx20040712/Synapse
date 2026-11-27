// @vitest-environment jsdom
/**
 * [F-A11] 笔记编辑 UX 双缺组件测试（[B4-A R1] 受锁迁移）（新建，always-active——ADR-0017 裁决 3）。
 *
 * 锁两个缺项：
 * ① 自动保存反馈——输入停顿 1.5s 触发 onAutosave（[B4-A R1] IDLE_FLUSH_MS 共享
 *   单源，旧 800ms 退役；窗口内续输合并同一单元、与已存值相同不触发），resolve
 *   true→「已保存」标记 / false→「保存失败」标记；保存中续输的跨格序列（宪法
 *   状态机前置：结果不作废 dirty 态）。
 * ② 撤销/重做值栈——按钮对（栈空 disabled）+ 键盘 Ctrl+Z/Ctrl+Y/Ctrl+Shift+Z
 *   拦截接值栈 + 深度上限 10（[B4-A R1] 旧 100 步退役）+ IME composition 整段一步。
 *   [B4-A R1 受锁迁移] 文本 undo/redo 改异步真实链（关闭单元→预 flush+drain→
 *   反向写→成功才移栈，设计稿 §3）：同步断言迁 await；步进例的「步」=独立单元
 *   （空格/空闲提交边界构造——连续键入合并为一个单元）。
 * 单元边界语义全表（1_499/1_500、空格/回车/粘贴独立、blur、代际失效等）在
 * annotation-editor-units.test.tsx（R1 新增件——本件近 max-lines 500）。
 * AnnotationPopups 接线面（含 [W-A 门二] busy 串行竞态）在
 * annotation-popups-autosave.test.tsx（门二轮拆件——本件曾超 max-lines 500）。
 * React act 环境对齐 annotation-layer.test.tsx 既有形态；输入模拟对齐
 * lineage-tag-edit.test.tsx（native value setter + input 事件）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeAnnotation } from '../../utils/factories'
import { IDLE_FLUSH_MS } from '../../../src/shared/constants'
import type { AnnotationRect } from '../../../src/shared/models/annotation'
import { clearAllTextHistory, TEXT_HISTORY_DEPTH_MAX } from '../../../src/renderer/features/reader/state/reader-text-history'
import { AnnotationEditor } from '../../../src/renderer/features/reader/view/AnnotationEditor'

/** 完整形态最小标注（comment 可覆写——lastSaved 语义用例需非空初值） */
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
  // [B4-A R1] 文本值历史注册表模块态隔离（跨视图驻留语义——用例间按 target 清）
  clearAllTextHistory()
})

/** textarea 输入（lineage-tag-edit 同款：native setter + input 事件） */
function typeInto(el: HTMLTextAreaElement, text: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
  act(() => {
    setter?.call(el, text)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

/** [B4-A R1] 异步 undo/redo 推进（关闭单元→drain→反向写→成功移栈——冲微任务到终态） */
async function settleAsync(): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0)
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
  // [B4-A 回炉 R5 fixture migration] 裸写体端口必选：夹具写体本就不入链，同一桩兼作裸通道
  act(() => {
    root!.render(
      <AnnotationEditor
        annotation={makeAnnotation()}
        rect={RECT}
        busy={false}
        onCancel={onCancel}
        onDelete={vi.fn()}
        onAutosave={onAutosave}
        onAutosaveRaw={props.onAutosave ?? onAutosave}
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
  it('初始态：无已保存标记、撤销/重做均禁用、1.5s 后未输入不触发自动保存', async () => {
    const { onAutosave } = renderEditor()
    expect(savedFlag()).toBeNull()
    expect(undoBtn().disabled).toBe(true)
    expect(redoBtn().disabled).toBe(true)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600)
    })
    expect(onAutosave).not.toHaveBeenCalled()
  })

  it('输入停顿 1.5s（1_499 零写/1_500 恰写一次）→ onAutosave 收值且 resolve true → 「已保存」标记在场', async () => {
    const { onAutosave } = renderEditor()
    typeInto(textarea(), '我是奶龙')
    // [B4-A R1] 合同值以字面量锚定（常量改值时窗口不随常量同移——防边界用例退化为同义反复）
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_499)
    })
    expect(onAutosave).not.toHaveBeenCalled()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
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
    // [B4-A R1] 每次输入重排同一 1.5s 计时（窗口内续输不提前落库）
    await act(async () => {
      await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS - 500)
    })
    expect(onAutosave).not.toHaveBeenCalled()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })
    expect(onAutosave).toHaveBeenCalledTimes(1)
    expect(onAutosave).toHaveBeenCalledWith('我是奶龙')
  })

  it('resolve false → 「保存失败」标记', async () => {
    renderEditor({ onAutosave: vi.fn(() => Promise.resolve(false)) })
    typeInto(textarea(), 'x')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS)
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
      await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS)
    })
    expect(onAutosave).toHaveBeenCalledTimes(1)
    typeInto(textarea(), 'ab')
    await act(async () => {
      d1.resolve(true)
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(savedFlag()).toBeNull()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS)
    })
    expect(onAutosave).toHaveBeenCalledTimes(2)
    expect(onAutosave).toHaveBeenLastCalledWith('ab')
    await act(async () => {
      d2.resolve(true)
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(savedFlag()?.textContent).toBe('已保存')
  })

  it('[B4-A R1 迁移·断言翻转] 在途保存×期间 undo（W-1 跨格）：undo 等在途写落定后反向写——第二发收 orig，终态即「已保存」', async () => {
    const d1 = deferred<boolean>()
    const onAutosave = vi.fn((c: string) => (c === 'x' ? d1.promise : Promise.resolve(true)))
    renderEditor({ annotation: makeAnnotation('orig'), onAutosave })
    typeInto(textarea(), 'x')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS)
    })
    expect(onAutosave).toHaveBeenCalledTimes(1)
    // 在途（saving(x) 未 resolve）时 undo：先 drain 在途写——落定前值不动、零反向写
    act(() => {
      undoBtn().click()
    })
    await settleAsync()
    expect(textarea().value).toBe('x')
    expect(onAutosave).toHaveBeenCalledTimes(1)
    await act(async () => {
      d1.resolve(true)
      await settleAsync()
    })
    // 在途写落定后反向写落库（第二发收 orig——不再是防抖重挂的延迟写）
    expect(onAutosave).toHaveBeenCalledTimes(2)
    expect(onAutosave).toHaveBeenNthCalledWith(2, 'orig')
    expect(textarea().value).toBe('orig')
    expect(savedFlag()?.textContent).toBe('已保存')
  })

  it('failed 闭环（W-2）：失败标记 → 再输入 dirty 无标记 → 再存 true → 已保存', async () => {
    const outcomes = [false, true]
    const onAutosave = vi.fn(() => Promise.resolve(outcomes.shift() ?? true))
    renderEditor({ onAutosave })
    typeInto(textarea(), 'a')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS)
    })
    expect(savedFlag()?.textContent).toBe('保存失败')
    typeInto(textarea(), 'ab')
    expect(savedFlag()).toBeNull()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS)
    })
    expect(onAutosave).toHaveBeenNthCalledWith(2, 'ab')
    expect(savedFlag()?.textContent).toBe('已保存')
  })

  it('[B4-A R1 迁移] 回退到初始值也再存（lastSaved 语义）：存 x 后 undo → 反向写即第二发收初始值', async () => {
    const { onAutosave } = renderEditor({ annotation: makeAnnotation('orig') })
    typeInto(textarea(), 'x')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS)
    })
    expect(onAutosave).toHaveBeenNthCalledWith(1, 'x')
    act(() => {
      undoBtn().click()
    })
    await settleAsync()
    expect(textarea().value).toBe('orig')
    // 反向写已落库（undo 成功即 lastSaved 推进）——无延迟防抖补写
    expect(onAutosave).toHaveBeenNthCalledWith(2, 'orig')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS)
    })
    expect(onAutosave).toHaveBeenCalledTimes(2)
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
      await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS)
    })
    expect(onAutosave).toHaveBeenCalledTimes(1)
    // 失败轮在途：undo 先等在途写（drain）
    act(() => {
      undoBtn().click()
    })
    await settleAsync()
    expect(onAutosave).toHaveBeenCalledTimes(1)
    await act(async () => {
      d1.resolve(false)
      await settleAsync()
    })
    // [B4-A R1 迁移·断言翻转] 预 flush 失败（§2.5 #14）：undo 不执行反向写——值与
    // 栈不动（撤销仍可点），呈现保存失败态
    expect(onAutosave).toHaveBeenCalledTimes(1)
    expect(textarea().value).toBe('x')
    expect(savedFlag()?.textContent).toBe('保存失败')
    expect(undoBtn().disabled).toBe(false)
    // 未落库值不丢写：在途期重挂的空闲计时到期自动重试
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2 * IDLE_FLUSH_MS)
    })
    expect(onAutosave).toHaveBeenNthCalledWith(2, 'x')
    expect(savedFlag()?.textContent).toBe('已保存')
    // 再输入：重试链正常
    typeInto(textarea(), 'y')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS)
    })
    expect(onAutosave).toHaveBeenNthCalledWith(3, 'y')
    expect(savedFlag()?.textContent).toBe('已保存')
  })
})

describe('F-A11 ② 撤销/重做值栈 —— AnnotationEditor', () => {
  it('[B4-A R1 迁移] 按钮对逐步回退/复原：三个独立单元（每步后空闲提交）→ 撤两步 → 重做一步，disabled 态随栈变化', async () => {
    renderEditor()
    const ta = textarea()
    // [B4-A R1] 连续键入合并为一个单元——「步」以空闲提交边界构造
    for (const step of ['a', 'ab', 'abc']) {
      typeInto(ta, step)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS)
      })
    }
    expect(undoBtn().disabled).toBe(false)
    act(() => {
      undoBtn().click()
    })
    await settleAsync()
    expect(ta.value).toBe('ab')
    act(() => {
      undoBtn().click()
    })
    await settleAsync()
    expect(ta.value).toBe('a')
    expect(redoBtn().disabled).toBe(false)
    act(() => {
      redoBtn().click()
    })
    await settleAsync()
    expect(ta.value).toBe('ab')
    act(() => {
      undoBtn().click()
    })
    await settleAsync()
    expect(ta.value).toBe('a')
    act(() => {
      undoBtn().click()
    })
    await settleAsync()
    expect(ta.value).toBe('')
    expect(undoBtn().disabled).toBe(true)
  })

  it('[B4-A R1 迁移] 键盘拦截接值栈：ctrl+z 回退、ctrl+y / ctrl+shift+z 重做，均 preventDefault', async () => {
    renderEditor()
    const ta = textarea()
    for (const step of ['a', 'ab']) {
      typeInto(ta, step)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS)
      })
    }
    const undoEvt = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true })
    act(() => {
      ta.dispatchEvent(undoEvt)
    })
    await settleAsync()
    expect(ta.value).toBe('a')
    expect(undoEvt.defaultPrevented).toBe(true)
    pressKey(ta, { key: 'y', ctrlKey: true })
    await settleAsync()
    expect(ta.value).toBe('ab')
    pressKey(ta, { key: 'z', ctrlKey: true })
    await settleAsync()
    expect(ta.value).toBe('a')
    pressKey(ta, { key: 'Z', ctrlKey: true, shiftKey: true })
    await settleAsync()
    expect(ta.value).toBe('ab')
  })

  it('[B4-A R1 迁移·断言翻转] 栈上限 10：12 个独立单元（空格边界）后撤 10 步达第 2 值且撤销禁用，重做可复 1 步', async () => {
    renderEditor()
    const ta = textarea()
    // 每步=追加「补零序号」+ 一次空格键（真实键入逐字符派发 input——空格并入
    // 当前单元后立即关闭，下一字符开新单元）
    const acc = (n: number): string => Array.from({ length: n }, (_, k) => String(k + 1).padStart(3, '0')).join(' ') + (n > 0 ? ' ' : '')
    for (let i = 1; i <= TEXT_HISTORY_DEPTH_MAX + 2; i++) {
      typeInto(ta, `${acc(i - 1)}${String(i).padStart(3, '0')}`)
      typeInto(ta, acc(i))
    }
    for (let i = 0; i < TEXT_HISTORY_DEPTH_MAX; i++) {
      act(() => {
        undoBtn().click()
      })
      await settleAsync()
    }
    // 最旧两值被 FIFO 截断：撤满 10 步落在第 2 值
    expect(ta.value).toBe(acc(2))
    expect(undoBtn().disabled).toBe(true)
    act(() => {
      redoBtn().click()
    })
    await settleAsync()
    expect(ta.value).toBe(acc(3))
  })

  it('[B4-A R1 迁移] IME composition（N-6）：两片段期间不入栈，end 后整段一步——undo 一步回退整段', async () => {
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
    await settleAsync()
    expect(ta.value).toBe('')
    expect(undoBtn().disabled).toBe(true)
    act(() => {
      redoBtn().click()
    })
    await settleAsync()
    expect(ta.value).toBe('我是奶龙')
  })

  it('[B4-A R1 迁移] IME end 后同值 change（N-B）：幂等不入栈——undo 仍一步整段回退', async () => {
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
    await settleAsync()
    expect(ta.value).toBe('')
    expect(undoBtn().disabled).toBe(true)
    act(() => {
      redoBtn().click()
    })
    await settleAsync()
    expect(ta.value).toBe('我是奶龙')
  })
})

/** 容器/按钮上派发 pointerdown（jsdom 无 PointerEvent 构造器——MouseEvent 同名
 *  形态，split-pane.test ptrAct 先例；React 按事件类型名委托） */
function ptrDown(target: Element): void {
  act(() => {
    target.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true }))
  })
}

describe('F-RDR-02 IME 守卫 + 点击重聚焦 —— AnnotationEditor', () => {
  it('组词期按键不消费（IME 守卫）：Escape 不关弹层、ctrl+z 不打断组词', () => {
    const { onCancel } = renderEditor()
    const ta = textarea()
    // 组词前入栈 'a'（无守卫时 ctrl+z 会回退——红绿判别点）
    typeInto(ta, 'a')
    act(() => {
      ta.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    })
    pressKey(ta, { key: 'Escape', isComposing: true })
    expect(onCancel).not.toHaveBeenCalled()
    const zEvt = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
      isComposing: true,
      bubbles: true,
      cancelable: true
    })
    act(() => {
      ta.dispatchEvent(zEvt)
    })
    expect(zEvt.defaultPrevented).toBe(false)
    expect(ta.value).toBe('a')
  })

  it('D6 点击弹层空白重聚焦输入框；点击按钮不抢焦', () => {
    renderEditor()
    const ta = textarea()
    const editor = host!.querySelector('[data-testid="annotation-editor"]')!
    act(() => {
      ta.blur()
    })
    expect(document.activeElement).not.toBe(ta)
    ptrDown(editor)
    expect(document.activeElement).toBe(ta)
    // 按钮有自己的交互：pointerdown 冒泡到容器也不抢焦（撤销钮先输一字使能）
    typeInto(ta, 'a')
    act(() => {
      ta.blur()
    })
    ptrDown(undoBtn())
    expect(document.activeElement).not.toBe(ta)
  })
})
