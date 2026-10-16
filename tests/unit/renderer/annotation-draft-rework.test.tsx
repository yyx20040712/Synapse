// @vitest-environment jsdom
/**
 * [F-VISFB-12 回炉轮 1] 批注草稿域回炉测试（新建，always-active——门一 k2
 * B-2/B-1/W-1/N-1 四下发项；与 annotation-draft-flush.test.tsx 分件=行数关卡）。
 *
 * 锁四链：
 * - S2-busy（B-2 阻断）：busy 在途手动写+取消（H3 同步收层）→草稿显式入
 *   注册表（failed=false——在途结果未知）→写失败（无等值清）→重挂载恢复
 *   dirty+timer 自动重试（S5 同语义）。
 * - S2-failed（B-1）：flush 失败→onCancel 仍被调（await 后收层语义保持）→
 *   注册表 failed=true 条目在场→重挂载恢复 failed 态（三通道呈现：toast/灰点
 *   在写路径链内建、failed 条目在卸载注册、failed 态在重挂载）。
 * - S8（W-1 删除失败序列）：在途写 gen=g→删除确认（gen=g+1+条目出表）→删除
 *   API 失败→在途写成功返回→isWriteLive=false 静默判废（单发成功写的 store
 *   同步丢弃=既定边界——服务器已有值，store 陈旧至下次事件自愈）→目标仍活：
 *   新编辑+保存成功（新 gen 写 live）→store 更新正常。
 * - S9（N-1 StrictMode 实证）：StrictMode 包裹双挂载→恢复携带草稿经模拟卸载
 *   重挂自洽（第二次挂载 take 回草稿+存活位回真——写入链正常出「已保存」）。
 * 模块态隔离：互异 annotation id（spread 覆写）。api/Toast 桩=api-client-mock
 * 工厂；act/输入模拟对齐 annotation-editor-ux 既有形态。
 */
import { StrictMode, act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'
import { makeAnnotation } from '../../utils/factories'
import type { Annotation, AnnotationRect } from '../../../src/shared/models/annotation'
import { AnnotationPopups } from '../../../src/renderer/features/reader/view/AnnotationPopups'
import { AnnotationEditor } from '../../../src/renderer/features/reader/view/AnnotationEditor'
import {
  saveAnnotationDraft,
  takeAnnotationDraft
} from '../../../src/renderer/features/reader/interact/annotation-draft-registry'

const mocks = vi.hoisted(() => ({
  apiUpdate: vi.fn(),
  apiDelete: vi.fn(),
  storeUpdateAnnotation: vi.fn(),
  storeMarkTabDirty: vi.fn(),
  storeClearTabDirty: vi.fn(),
  storeRemoveAnnotation: vi.fn(),
  storeNotifyNoteHighlight: vi.fn(),
  pushUndo: vi.fn()
}))
makeApiStub({
  reader: { updateAnnotation: mocks.apiUpdate, deleteAnnotation: mocks.apiDelete }
})

vi.mock('../../../src/renderer/features/reader/state/reader.store', () => {
  const storeState = { tabs: {}, activeId: null }
  const storeActions = {
    updateAnnotation: mocks.storeUpdateAnnotation,
    markTabDirty: mocks.storeMarkTabDirty,
    clearTabDirty: mocks.storeClearTabDirty,
    removeAnnotation: mocks.storeRemoveAnnotation,
    notifyNoteHighlight: mocks.storeNotifyNoteHighlight
  }
  return {
    useReaderStore: Object.assign(
      (sel: (s: unknown) => unknown) => sel(storeState),
      { getState: () => storeActions }
    )
  }
})

vi.mock('../../../src/renderer/features/reader/state/annotation-undo', () => ({
  pushUndo: mocks.pushUndo,
  undo: vi.fn(),
  clearStack: vi.fn(),
  stackDepth: vi.fn(() => 0),
  UNDO_DEPTH_MAX: 50
}))

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

/** textarea 输入（annotation-editor-ux 同款：native setter + input 事件） */
function typeInto(el: HTMLTextAreaElement, text: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
  act(() => {
    setter?.call(el, text)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

/** 可控 promise（在途写挂起用；reject=失败路径注入） */
function deferred<T>(): {
  promise: Promise<T>
  resolve: (v: T) => void
  reject: (e: unknown) => void
} {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((r, j) => {
    resolve = r
    reject = j
  })
  return { promise, resolve, reject }
}

function textarea(): HTMLTextAreaElement {
  const ta = host!.querySelector('textarea')
  expect(ta).not.toBeNull()
  return ta as HTMLTextAreaElement
}

function savedFlag(): Element | null {
  return host!.querySelector('[data-testid="annotation-saved-flag"]')
}

function buttonByLabel(label: string): HTMLButtonElement {
  const btn = [...host!.querySelectorAll('button')].find((b) => b.textContent === label)
  expect(btn, `按钮存在：${label}`).toBeDefined()
  return btn as HTMLButtonElement
}

/** 覆写 id 的标注（本件模块态隔离：用例间互异 id） */
function annoOf(id: string, comment = ''): Annotation {
  return { ...makeAnnotation(comment), id }
}

function renderEditor(
  annotation: Annotation,
  props: Partial<Parameters<typeof AnnotationEditor>[0]> = {}
): { onAutosave: ReturnType<typeof vi.fn>; onCancel: ReturnType<typeof vi.fn> } {
  const onAutosave = (props.onAutosave ?? vi.fn(() => Promise.resolve(true))) as ReturnType<typeof vi.fn>
  const onCancel = (props.onCancel ?? vi.fn()) as ReturnType<typeof vi.fn>
  act(() => {
    root!.render(
      <AnnotationEditor
        annotation={annotation}
        rect={RECT}
        busy={props.busy ?? false}
        onCancel={onCancel}
        onSave={props.onSave ?? vi.fn()}
        onDelete={props.onDelete ?? vi.fn()}
        onAutosave={onAutosave}
      />
    )
  })
  return { onAutosave, onCancel }
}

describe('F-VISFB-12 回炉轮 1 —— 草稿恢复缺口/查态/删除失败/StrictMode', () => {
  it('S2-busy（B-2）：busy 在途手动写+Escape 同步收层 → 草稿显式入注册表 → 重挂载 dirty+timer 自动重试', async () => {
    const a = annoOf('f12r-b1')
    const onAutosave = vi.fn(() => Promise.resolve(true))
    const { onCancel } = renderEditor(a, { busy: true, onAutosave })
    typeInto(textarea(), 'x')
    act(() => {
      textarea().dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
      )
    })
    expect(onCancel).toHaveBeenCalledTimes(1)
    const entry = takeAnnotationDraft(a.id)
    expect(entry).toEqual({ comment: 'x', failed: false })
    // 写失败=条目不被等值清（生产语义：W3 等值清仅成功路径触发）——回填后验证恢复面
    saveAnnotationDraft(a.id, entry!.comment, entry!.failed)
    renderEditor(a, { onAutosave })
    expect(textarea().value).toBe('x')
    expect(savedFlag()).toBeNull()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(onAutosave).toHaveBeenCalledTimes(1)
    expect(onAutosave).toHaveBeenLastCalledWith('x')
  })

  it('S2-failed（B-1）：flush 失败 → onCancel 仍被调 → 注册表 failed=true 条目在场 → 重挂载恢复 failed 态', async () => {
    const a = annoOf('f12r-b2')
    const d1 = deferred<boolean>()
    const onAutosave = vi.fn(() => d1.promise)
    const { onCancel } = renderEditor(a, { onAutosave })
    typeInto(textarea(), 'f')
    act(() => {
      buttonByLabel('取消').click()
    })
    await act(async () => {
      d1.resolve(false)
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(onCancel).toHaveBeenCalledTimes(1)
    act(() => {
      root?.render(<div />)
    })
    const entry = takeAnnotationDraft(a.id)
    expect(entry).toEqual({ comment: 'f', failed: true })
    saveAnnotationDraft(a.id, entry!.comment, entry!.failed)
    renderEditor(a)
    expect(textarea().value).toBe('f')
    expect(savedFlag()?.textContent).toBe('保存失败')
  })

  it('S8（W-1 删除失败序列）：删除 API 失败后在途写判废静默丢弃，目标仍活新写 live 自愈', async () => {
    const a = annoOf('f12r-d1')
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const d1 = deferred<{ ok: boolean; data: Annotation }>()
    const delD = deferred<unknown>()
    let firstWrite = true
    mocks.apiUpdate.mockImplementation(({ annotation }: { annotation: Annotation }) => {
      if (firstWrite) {
        firstWrite = false
        return d1.promise
      }
      return Promise.resolve({ ok: true, data: annotation })
    })
    mocks.apiDelete.mockImplementation(() => delD.promise)
    const setEditingSpy = vi.fn()
    act(() => {
      root!.render(
        <AnnotationPopups
          menu={null}
          editing={{ annotation: a, rect: RECT }}
          busy={false}
          setMenu={vi.fn()}
          setEditing={setEditingSpy}
          setBusy={vi.fn()}
          onChanged={vi.fn()}
        />
      )
    })
    typeInto(textarea(), 'x')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(mocks.apiUpdate).toHaveBeenCalledTimes(1)
    act(() => {
      buttonByLabel('删除').click()
    })
    await act(async () => {
      delD.reject(new Error('delete failed'))
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(mocks.apiDelete).toHaveBeenCalledTimes(1)
    expect(mocks.storeRemoveAnnotation).not.toHaveBeenCalled()
    expect(mocks.storeMarkTabDirty).toHaveBeenCalledWith(a.paperId)
    expect(setEditingSpy).not.toHaveBeenCalled()
    await act(async () => {
      d1.resolve({ ok: true, data: { ...a, comment: 'x' } })
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(mocks.storeUpdateAnnotation).not.toHaveBeenCalled()
    typeInto(textarea(), 'x2')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(mocks.apiUpdate).toHaveBeenCalledTimes(2)
    expect(mocks.storeUpdateAnnotation).toHaveBeenCalledTimes(1)
    expect(mocks.storeUpdateAnnotation.mock.calls[0]![0].comment).toBe('x2')
    expect(savedFlag()?.textContent).toBe('已保存')
    confirmSpy.mockRestore()
  })

  it('S9（N-1 StrictMode）：双挂载下恢复携带草稿自洽——第二次挂载取回草稿+存活位回真（写入链出「已保存」）', async () => {
    const a = annoOf('f12r-s1')
    saveAnnotationDraft(a.id, 'sm', true)
    const onAutosave = vi.fn(() => Promise.resolve(true))
    act(() => {
      root!.render(
        <StrictMode>
          <AnnotationEditor
            annotation={a}
            rect={RECT}
            busy={false}
            onCancel={vi.fn()}
            onSave={vi.fn()}
            onDelete={vi.fn()}
            onAutosave={onAutosave}
          />
        </StrictMode>
      )
    })
    expect(textarea().value).toBe('sm')
    expect(savedFlag()?.textContent).toBe('保存失败')
    typeInto(textarea(), 'sm2')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(onAutosave).toHaveBeenCalledTimes(1)
    expect(onAutosave).toHaveBeenLastCalledWith('sm2')
    expect(savedFlag()?.textContent).toBe('已保存')
  })
})
