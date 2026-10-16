// @vitest-environment jsdom
/**
 * [F-VISFB-12] 批注草稿/flush 注册表测试（新建，always-active）。
 *
 * 锁三链（票面：卸载后可重试的最新草稿/取消·Escape·切目标先 flush/删除跳过
 * flush 且防迟到写复活）：
 * ① 注册表单件——take 一次性消费/discard+代际/墓碑拒注册拒恢复/等值清；
 * ② AnnotationEditor——失败草稿卸载→重挂载恢复最新值+failed 态可重试（验收
 *   主链）/取消·Escape 先 flush（await 后再收层：写挂起时不收层）/clean·busy
 *   同步收层/saving 卸载注册→重挂载 dirty+timer 自动重试/等值自愈；
 * ③ AnnotationPopups+AnnotationLayer——删除跳过 flush（dirty 零派发）+迟到写
 *   判废零复活（代际守卫）/切目标点击他条即发起立存（fire-first）不阻菜单。
 * 模块态隔离：注册表为模块级（生产语义）——本件各用例一律用互异 annotation id
 * （spread 覆写），不依赖 reset。api/Toast 桩=api-client-mock 工厂；React act
 * 与输入模拟对齐 annotation-editor-ux 既有形态。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'
import { makeAnnotation } from '../../utils/factories'
import type { Annotation, AnnotationRect } from '../../../src/shared/models/annotation'
import { AnnotationLayer } from '../../../src/renderer/features/reader/view/AnnotationLayer'
import { AnnotationPopups } from '../../../src/renderer/features/reader/view/AnnotationPopups'
import { AnnotationEditor } from '../../../src/renderer/features/reader/view/AnnotationEditor'
import {
  annotationDraftSaved,
  annotationWriteGen,
  discardAnnotationDraft,
  flushAnnotationDraft,
  isAnnotationWriteLive,
  markAnnotationDeleted,
  registerDraftFlush,
  saveAnnotationDraft,
  takeAnnotationDraft,
  unregisterDraftFlush
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

/** 可控 promise（在途写挂起用） */
function deferred<T>(): { promise: Promise<T>; resolve: (v: T) => void } {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
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

describe('F-VISFB-12 ① 注册表单件 —— annotation-draft-registry', () => {
  it('take 一次性消费：save → take 得最新值+failed → 再 take 为 null', () => {
    saveAnnotationDraft('f12-u1', '草稿值', true)
    expect(takeAnnotationDraft('f12-u1')).toEqual({ comment: '草稿值', failed: true })
    expect(takeAnnotationDraft('f12-u1')).toBeNull()
  })

  it('删除发起 discard：条目出注册表；代际自增使先捕获的写判废，新写 live', () => {
    saveAnnotationDraft('f12-u2', 'x', false)
    const genBefore = annotationWriteGen('f12-u2')
    discardAnnotationDraft('f12-u2')
    expect(takeAnnotationDraft('f12-u2')).toBeNull()
    expect(isAnnotationWriteLive('f12-u2', genBefore)).toBe(false)
    const genAfter = annotationWriteGen('f12-u2')
    expect(isAnnotationWriteLive('f12-u2', genAfter)).toBe(true)
  })

  it('墓碑（删除成功）：save 拒绝入表、take 恒 null、在途写全判废', () => {
    const id = 'f12-u3'
    const gen = annotationWriteGen(id)
    markAnnotationDeleted(id)
    saveAnnotationDraft(id, 'y', true)
    expect(takeAnnotationDraft(id)).toBeNull()
    expect(isAnnotationWriteLive(id, gen)).toBe(false)
  })

  it('等值清（annotationDraftSaved）：同值条目清除、异值条目保留', () => {
    saveAnnotationDraft('f12-u4', 'v1', false)
    saveAnnotationDraft('f12-u5', 'v2', false)
    annotationDraftSaved('f12-u4', 'v1')
    expect(takeAnnotationDraft('f12-u4')).toBeNull()
    annotationDraftSaved('f12-u5', '他值')
    expect(takeAnnotationDraft('f12-u5')).toEqual({ comment: 'v2', failed: false })
  })

  it('flush 句柄注册表：注册后 flushAnnotationDraft 发起调用，注销后返回 null', async () => {
    const flush = vi.fn(async () => 'clean')
    registerDraftFlush('f12-u6', flush)
    await expect(flushAnnotationDraft('f12-u6')).resolves.toBe('clean')
    expect(flush).toHaveBeenCalledTimes(1)
    unregisterDraftFlush('f12-u6')
    expect(flushAnnotationDraft('f12-u6')).toBeNull()
  })
})

describe('F-VISFB-12 ② AnnotationEditor —— 卸载恢复与取消先 flush', () => {
  it('验收主链：失败草稿卸载入注册表 → 重挂载恢复最新值+failed 态 → 再输入重试成功', async () => {
    const a = annoOf('f12-e1')
    const outcomes = [false, true]
    const onAutosave = vi.fn(() => Promise.resolve(outcomes.shift() ?? true))
    renderEditor(a, { onAutosave })
    typeInto(textarea(), '奶龙草稿')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(savedFlag()?.textContent).toBe('保存失败')
    act(() => {
      root?.render(<div />)
    })
    renderEditor(a, { onAutosave })
    expect(textarea().value).toBe('奶龙草稿')
    expect(savedFlag()?.textContent).toBe('保存失败')
    typeInto(textarea(), '奶龙草稿重试')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(onAutosave).toHaveBeenLastCalledWith('奶龙草稿重试')
    expect(savedFlag()?.textContent).toBe('已保存')
  })

  it('取消先 flush：dirty 点取消 → 立即派发写（不等 800ms）→ 写挂起期间不收层 → resolve 后收层', async () => {
    const d1 = deferred<boolean>()
    const onAutosave = vi.fn(() => d1.promise)
    const { onCancel } = renderEditor(annoOf('f12-e2'), { onAutosave })
    typeInto(textarea(), 'a')
    act(() => {
      buttonByLabel('取消').click()
    })
    expect(onAutosave).toHaveBeenCalledTimes(1)
    expect(onAutosave).toHaveBeenCalledWith('a')
    expect(onCancel).not.toHaveBeenCalled()
    await act(async () => {
      d1.resolve(true)
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('Escape 同路径：flush 在途不收层；resolve false 不收层（B-1 实质查态）→ 真卸载后草稿入注册表可重试', async () => {
    const a = annoOf('f12-e3')
    const d1 = deferred<boolean>()
    const onAutosave = vi.fn(() => d1.promise)
    const { onCancel } = renderEditor(a, { onAutosave })
    typeInto(textarea(), 'b')
    act(() => {
      textarea().dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
      )
    })
    expect(onAutosave).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
    await act(async () => {
      d1.resolve(false)
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(onCancel).not.toHaveBeenCalled()
    expect(savedFlag()?.textContent).toBe('保存失败')
    act(() => {
      root?.render(<div />)
    })
    renderEditor(a)
    expect(textarea().value).toBe('b')
    expect(savedFlag()?.textContent).toBe('保存失败')
  })

  it('clean 取消零跳变：无待存时点取消同步收层、零写派发', () => {
    const onAutosave = vi.fn(() => Promise.resolve(true))
    const { onCancel } = renderEditor(annoOf('f12-e4'), { onAutosave })
    act(() => {
      buttonByLabel('取消').click()
    })
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onAutosave).not.toHaveBeenCalled()
  })

  it('busy 期取消：同步收层零 flush（在途手动写承接，卸载注册面兜底）', () => {
    const onAutosave = vi.fn(() => Promise.resolve(true))
    const { onCancel } = renderEditor(annoOf('f12-e5'), { busy: true, onAutosave })
    typeInto(textarea(), 'c')
    act(() => {
      textarea().dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
      )
    })
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onAutosave).not.toHaveBeenCalled()
  })

  it('saving 卸载注册（failed=false）→ 重挂载恢复 dirty+timer 自动重试', async () => {
    const a = annoOf('f12-e6')
    const d1 = deferred<boolean>()
    const onAutosave = vi.fn(() => d1.promise)
    renderEditor(a, { onAutosave })
    typeInto(textarea(), 'v')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(onAutosave).toHaveBeenCalledTimes(1)
    act(() => {
      root?.render(<div />)
    })
    await act(async () => {
      d1.resolve(false)
      await vi.advanceTimersByTimeAsync(0)
    })
    renderEditor(a, { onAutosave })
    expect(textarea().value).toBe('v')
    expect(savedFlag()).toBeNull()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(onAutosave).toHaveBeenCalledTimes(2)
    expect(onAutosave).toHaveBeenLastCalledWith('v')
  })

  it('等值自愈：条目值==服务器值时恢复为 clean（零标记零 timer 零写）', async () => {
    const a = annoOf('f12-e7', '已落盘值')
    saveAnnotationDraft(a.id, '已落盘值', true)
    const onAutosave = vi.fn(() => Promise.resolve(true))
    renderEditor(a, { onAutosave })
    expect(textarea().value).toBe('已落盘值')
    expect(savedFlag()).toBeNull()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600)
    })
    expect(onAutosave).not.toHaveBeenCalled()
  })

  it('未尝试 dirty 卸载不入注册表（锁定锚语义保持）：重挂载零恢复', async () => {
    const a = annoOf('f12-e8')
    const onAutosave = vi.fn(() => Promise.resolve(true))
    renderEditor(a, { onAutosave })
    typeInto(textarea(), 'z')
    act(() => {
      root?.render(<div />)
    })
    renderEditor(a, { onAutosave })
    expect(textarea().value).toBe('')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600)
    })
    expect(onAutosave).not.toHaveBeenCalled()
  })
})

describe('F-VISFB-12 ③ 删除链与切目标 —— AnnotationPopups/AnnotationLayer', () => {
  /** 直渲染 AnnotationPopups（setBusy/setEditing 不回灌=模拟无 busy 串行的收口面写） */
  function renderPopups(editing: Annotation): ReturnType<typeof vi.fn> {
    const setEditingSpy = vi.fn()
    act(() => {
      root!.render(
        <AnnotationPopups
          menu={null}
          editing={{ annotation: editing, rect: RECT }}
          busy={false}
          setMenu={vi.fn()}
          setEditing={setEditingSpy}
          setBusy={vi.fn()}
          onChanged={vi.fn()}
        />
      )
    })
    return setEditingSpy
  }

  it('删除跳过 flush：dirty 草稿零派发写、条目出注册表、重挂载不复活', async () => {
    const a = annoOf('f12-d1')
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    mocks.apiDelete.mockResolvedValue({ ok: true, data: null })
    const setEditingSpy = renderPopups(a)
    typeInto(textarea(), '待删草稿')
    act(() => {
      buttonByLabel('删除').click()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(mocks.apiDelete).toHaveBeenCalledTimes(1)
    expect(mocks.apiUpdate).not.toHaveBeenCalled()
    expect(mocks.storeRemoveAnnotation).toHaveBeenCalledWith(a.id)
    expect(setEditingSpy).toHaveBeenCalledWith(null)
    act(() => {
      root?.render(<div />)
    })
    renderEditor(a)
    expect(textarea().value).toBe('')
    confirmSpy.mockRestore()
  })

  it('迟到写判废（代际守卫）：删除发起后在途写 resolve → 零 store 同步零复活', async () => {
    const a = annoOf('f12-d2')
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const d1 = deferred<{ ok: boolean; data: Annotation }>()
    const delD = deferred<{ ok: boolean; data: null }>()
    mocks.apiUpdate.mockImplementation(() => d1.promise)
    mocks.apiDelete.mockImplementation(() => delD.promise)
    renderPopups(a)
    typeInto(textarea(), 'w')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(mocks.apiUpdate).toHaveBeenCalledTimes(1)
    act(() => {
      buttonByLabel('删除').click()
    })
    await act(async () => {
      d1.resolve({ ok: true, data: { ...a, comment: 'w' } })
      delD.resolve({ ok: true, data: null })
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(mocks.storeUpdateAnnotation).not.toHaveBeenCalled()
    expect(mocks.storeRemoveAnnotation).toHaveBeenCalledWith(a.id)
    expect(takeAnnotationDraft(a.id)).toBeNull()
    confirmSpy.mockRestore()
  })

  it('切目标先 flush（AnnotationLayer）：编辑 A 中点击他条 B → 立即立存 A 草稿且菜单即开', async () => {
    const a = annoOf('f12-l1')
    const b = annoOf('f12-l2')
    mocks.apiUpdate.mockImplementation(async ({ annotation }: { annotation: Annotation }) => ({
      ok: true,
      data: annotation
    }))
    act(() => {
      root!.render(
        <AnnotationLayer annotations={[a, b]} page={0} pageRoot={null} onChanged={vi.fn()} />
      )
    })
    const rects = (): HTMLElement[] =>
      [...host!.querySelectorAll('[data-testid="annotation-rect"]')] as HTMLElement[]
    act(() => {
      rects()[0]!.click()
    })
    act(() => {
      buttonByLabel('添加笔记').click()
    })
    expect(host!.querySelector('[data-testid="annotation-editor"]')).not.toBeNull()
    typeInto(textarea(), '切目标草稿')
    act(() => {
      rects()[1]!.click()
    })
    expect(mocks.apiUpdate).toHaveBeenCalledTimes(1)
    expect(mocks.apiUpdate.mock.calls[0]![0].annotation.comment).toBe('切目标草稿')
    expect(host!.querySelector('[data-testid="annotation-editor"]')).toBeNull()
    expect(host!.querySelector('[data-testid="annotation-menu"]')).not.toBeNull()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(mocks.storeUpdateAnnotation).toHaveBeenCalledTimes(1)
  })
})
