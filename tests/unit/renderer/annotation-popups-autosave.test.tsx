// @vitest-environment jsdom
/**
 * [F-A11] AnnotationPopups 自动保存接线面测试（自 annotation-editor-ux.test.tsx
 * 拆出 2026-09-09 门二轮——该件超 ESLint max-lines 500；本件锁接线行为）。
 *
 * 锁：自动保存=saveComment 静默变体（api 链+store 同步+pushUndo 会话单
 * entry、不 setEditing 收层；失败 markTabDirty+toast）+ [W-A 门二] busy
 * 毫秒级串行互斥（autosave 在途→手动按钮禁用零写；手动在途→autosave 被
 * busyRef 挡、store 终值=手动值）。模块替身：api/client、Toast、reader.store、
 * annotation-undo（unwrap 对齐真实语义 await 后判 ok；ApiClientError 双参）。
 * React act 环境对齐 annotation-layer.test.tsx；输入模拟对齐 lineage-tag-edit。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Annotation, AnnotationRect } from '../../../src/shared/models/annotation'
import { AnnotationPopups } from '../../../src/renderer/features/reader/AnnotationPopups'
import { ApiClientError } from '../../../src/renderer/api/client'

const mocks = vi.hoisted(() => ({
  // AnnotationPopups 接线面的模块替身（api/Toast/store/undo 栈）
  apiUpdate: vi.fn(),
  storeUpdateAnnotation: vi.fn(),
  storeMarkTabDirty: vi.fn(),
  storeClearTabDirty: vi.fn(),
  storeRemoveAnnotation: vi.fn(),
  storeNotifyNoteHighlight: vi.fn(),
  pushUndo: vi.fn(),
  showToast: vi.fn()
}))

vi.mock('../../../src/renderer/api/client', () => ({
  api: { reader: { updateAnnotation: mocks.apiUpdate, deleteAnnotation: vi.fn() } },
  // 对齐真实语义（client.ts unwrap：await call 后判 ok 再返 data）
  unwrap: vi.fn(async (call: Promise<{ ok: boolean; data: unknown }>) => {
    const r = await call
    if (!r.ok) throw new Error('unwrap: !ok')
    return r.data
  }),
  // 对齐真实签名 ApiClientError(code, message)（client.ts）——tsc 按真实类型检查
  ApiClientError: class extends Error {
    constructor(_code: string, message: string) {
      super(message)
    }
  }
}))

vi.mock('../../../src/renderer/shared/ui/Toast', () => ({ showToast: mocks.showToast }))

vi.mock('../../../src/renderer/features/reader/reader.store', () => ({
  useReaderStore: {
    getState: () => ({
      updateAnnotation: mocks.storeUpdateAnnotation,
      markTabDirty: mocks.storeMarkTabDirty,
      clearTabDirty: mocks.storeClearTabDirty,
      removeAnnotation: mocks.storeRemoveAnnotation,
      notifyNoteHighlight: mocks.storeNotifyNoteHighlight
    })
  }
}))

vi.mock('../../../src/renderer/features/reader/annotation-undo', () => ({
  pushUndo: mocks.pushUndo,
  undo: vi.fn(),
  clearStack: vi.fn(),
  stackDepth: vi.fn(() => 0),
  UNDO_DEPTH_MAX: 50
}))

/** 完整形态最小标注（comment 可覆写——终值断言用） */
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

/** 可控 promise（在途写挂起用） */
function deferred<T>(): { promise: Promise<T>; resolve: (v: T) => void } {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

function savedFlag(): Element | null {
  return host!.querySelector('[data-testid="annotation-saved-flag"]')
}

describe('F-A11 接线 —— AnnotationPopups 自动保存（静默变体）', () => {
  it('成功链：api+store 同步、pushUndo 会话单 entry（两轮停顿仅一次）、不收层、标记已保存', async () => {
    const setEditing = vi.fn()
    mocks.apiUpdate.mockImplementation(async ({ annotation }: { annotation: Annotation }) => ({
      ok: true,
      data: annotation
    }))
    act(() => {
      root!.render(
        <AnnotationPopups
          menu={null}
          editing={{ annotation: makeAnnotation(), rect: RECT }}
          busy={false}
          setMenu={vi.fn()}
          setEditing={setEditing}
          setBusy={vi.fn()}
          onChanged={vi.fn()}
        />
      )
    })
    const ta = host!.querySelector('textarea') as HTMLTextAreaElement
    expect(ta).not.toBeNull()
    typeInto(ta, '笔记一')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(mocks.apiUpdate).toHaveBeenCalledTimes(1)
    expect(mocks.apiUpdate.mock.calls[0]![0].annotation.comment).toBe('笔记一')
    expect(mocks.storeUpdateAnnotation).toHaveBeenCalledTimes(1)
    expect(mocks.pushUndo).toHaveBeenCalledTimes(1)
    expect(mocks.pushUndo.mock.calls[0]![1]).toMatchObject({ kind: 'comment-edit' })
    expect(mocks.storeClearTabDirty).toHaveBeenCalledWith('paper-1')
    expect(setEditing).not.toHaveBeenCalled()
    expect(host!.querySelector('[data-testid="annotation-editor"]')).not.toBeNull()
    expect(savedFlag()?.textContent).toBe('已保存')
    typeInto(ta, '笔记一续')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(mocks.apiUpdate).toHaveBeenCalledTimes(2)
    expect(mocks.pushUndo).toHaveBeenCalledTimes(1)
    expect(setEditing).not.toHaveBeenCalled()
  })

  it('失败链：api 抛 ApiClientError → markTabDirty+toast、编辑器在场、「保存失败」', async () => {
    const setEditing = vi.fn()
    const err = new ApiClientError('E_TEST', '保存失败测试')
    mocks.apiUpdate.mockRejectedValue(err)
    act(() => {
      root!.render(
        <AnnotationPopups
          menu={null}
          editing={{ annotation: makeAnnotation(), rect: RECT }}
          busy={false}
          setMenu={vi.fn()}
          setEditing={setEditing}
          setBusy={vi.fn()}
          onChanged={vi.fn()}
        />
      )
    })
    typeInto(host!.querySelector('textarea') as HTMLTextAreaElement, 'x')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(mocks.storeMarkTabDirty).toHaveBeenCalledWith('paper-1')
    expect(mocks.showToast).toHaveBeenCalledWith('保存失败测试', 'error')
    expect(setEditing).not.toHaveBeenCalled()
    expect(host!.querySelector('[data-testid="annotation-editor"]')).not.toBeNull()
    expect(savedFlag()?.textContent).toBe('保存失败')
  })

  /** W-A 竞态用挂载器：setBusy/setEditing 回灌 props 重渲染（模拟宿主 state 往返） */
  async function mountPopupsRace(): Promise<{ setEditingSpy: ReturnType<typeof vi.fn> }> {
    const props: Parameters<typeof AnnotationPopups>[0] = {
      menu: null,
      editing: { annotation: makeAnnotation(), rect: RECT },
      busy: false,
      setMenu: vi.fn(),
      setEditing: vi.fn(),
      setBusy: vi.fn(),
      onChanged: vi.fn()
    }
    const rerender = (): void => {
      act(() => {
        root!.render(<AnnotationPopups {...props} />)
      })
    }
    const setEditingSpy = props.setEditing as unknown as ReturnType<typeof vi.fn>
    props.setBusy = (v: boolean): void => {
      props.busy = v
      rerender()
    }
    props.setEditing = (v: typeof props.editing): void => {
      setEditingSpy(v)
      props.editing = v
      rerender()
    }
    rerender()
    return { setEditingSpy }
  }

  it('W-A 竞态（正向）：autosave 在途置 busy → 手动保存按钮禁用、click 零写', async () => {
    await mountPopupsRace()
    const d1 = deferred<{ ok: boolean; data: Annotation }>()
    mocks.apiUpdate.mockImplementation(() => d1.promise)
    const ta = host!.querySelector('textarea') as HTMLTextAreaElement
    typeInto(ta, '自动值')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(mocks.apiUpdate).toHaveBeenCalledTimes(1)
    const saveBtn = [...host!.querySelectorAll('button')].find((b) => b.textContent === '保存')!
    expect(saveBtn).toBeDefined()
    expect(saveBtn.disabled).toBe(true)
    act(() => {
      saveBtn.click()
    })
    expect(mocks.apiUpdate).toHaveBeenCalledTimes(1)
    await act(async () => {
      d1.resolve({ ok: true, data: { ...makeAnnotation('自动值') } })
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(mocks.apiUpdate).toHaveBeenCalledTimes(1)
    expect(mocks.storeUpdateAnnotation).toHaveBeenCalledTimes(1)
    expect(host!.querySelector('[data-testid="annotation-editor"]')).not.toBeNull()
    expect(savedFlag()?.textContent).toBe('已保存')
  })

  it('W-A 竞态（反向）：手动保存在途 busy → autosave 到期被挡，store 终值=手动值', async () => {
    const { setEditingSpy } = await mountPopupsRace()
    const d1 = deferred<{ ok: boolean; data: Annotation }>()
    mocks.apiUpdate.mockImplementation(() => d1.promise)
    const ta = host!.querySelector('textarea') as HTMLTextAreaElement
    typeInto(ta, '手动值')
    const saveBtn = [...host!.querySelectorAll('button')].find((b) => b.textContent === '保存')!
    expect(saveBtn.disabled).toBe(false)
    act(() => {
      saveBtn.click()
    })
    expect(mocks.apiUpdate).toHaveBeenCalledTimes(1)
    expect(saveBtn.disabled).toBe(true)
    // 手动链在途（busy）期间 autosave 防抖到期——被 busy 挡，不并发写
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600)
    })
    expect(mocks.apiUpdate).toHaveBeenCalledTimes(1)
    await act(async () => {
      d1.resolve({ ok: true, data: { ...makeAnnotation('手动值') } })
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(mocks.apiUpdate).toHaveBeenCalledTimes(1)
    expect(mocks.storeUpdateAnnotation).toHaveBeenCalledTimes(1)
    expect(mocks.storeUpdateAnnotation.mock.calls[0]![0].comment).toBe('手动值')
    expect(setEditingSpy).toHaveBeenCalledWith(null)
    expect(host!.querySelector('[data-testid="annotation-editor"]')).toBeNull()
  })
})
