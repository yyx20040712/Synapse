// @vitest-environment jsdom
/**
 * [F-VISFB-15] AnnotationPopups busy 等待复判+删除失败补偿测试（新建，
 * always-active；自 annotation-draft-flush.test.tsx 拆出 2026-10-17——该件超
 * ESLint max-lines 500〔tests 豁免 override 只盖 .test.ts 不盖 .tsx〕，拆件
 * 先例=annotation-popups-autosave 自 annotation-editor-ux 拆出同因）。
 *
 * 锁链（票面②busy 清单 1-4+③W-1 正身）：
 * - ② 手动保存在途×失败：autosave 等待 settle 后复判→真实写→saved 真值
 *   （旧病=busy 期乐观 true→believing-saved 丢值窗）；
 * - ② 删除在途×失败：同族收口（值落库非错像）；删除在途×成功：复判存活→
 *   零写返回 false（复活防线沿承）；
 * - ② quit/切目标 flush 撞 busy（句柄消费形态）：等待 settle→真实写→句柄
 *   真实终态（stillDirty 判定真实——丢稿级面）；
 * - ③ 删除失败：出表前快照回填（恢复面不丢→重挂载恢复可重试）；删除成功：
 *   零回填（现状语义——墓碑拒入双保险）。
 * 真 busy 接线宿主（useState 持 busy/editing/menu——setBusy/setEditing 回灌
 * 重渲染，对齐 annotation-popups-autosave 的 mountPopupsRace 形）。模块态
 * 隔离：注册表模块级——互异 annotation id（annoOf 覆写）。
 */
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'
import { makeAnnotation } from '../../utils/factories'
import type { Annotation, AnnotationRect } from '../../../src/shared/models/annotation'
import { AnnotationPopups, type PopupTarget } from '../../../src/renderer/features/reader/view/AnnotationPopups'
import { AnnotationEditor } from '../../../src/renderer/features/reader/view/AnnotationEditor'
import {
  allDraftFlushHandles,
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
  pushUndo: vi.fn(),
  // [回炉 R2] store 现值复判面：tabs 态注入（undo 回写旧值格模拟——真 store 的
  // annotations 投影；逐用例 beforeEach 重置）
  storeTabs: {} as Record<string, { annotations: Annotation[] }>
}))
makeApiStub({
  reader: { updateAnnotation: mocks.apiUpdate, deleteAnnotation: mocks.apiDelete }
})

vi.mock('../../../src/renderer/features/reader/state/reader.store', () => {
  const storeActions = {
    updateAnnotation: mocks.storeUpdateAnnotation,
    markTabDirty: mocks.storeMarkTabDirty,
    clearTabDirty: mocks.storeClearTabDirty,
    removeAnnotation: mocks.storeRemoveAnnotation,
    notifyNoteHighlight: mocks.storeNotifyNoteHighlight
  }
  return {
    useReaderStore: Object.assign(
      (sel: (s: unknown) => unknown) => sel({ tabs: mocks.storeTabs, activeId: null }),
      { getState: () => ({ ...storeActions, tabs: mocks.storeTabs, activeId: null }) }
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
  // [回炉 R2] store 态注入逐用例重置（clearAllMocks 不清普通对象）
  mocks.storeTabs = {}
  // [W-6 同型] Once 实现队列逐用例 reset（红格未消费 Once 跨用例错位消费——
  // 回炉轮 1 busy-3/4 翻红根因）；常驻实现由各用例自设
  mocks.apiUpdate.mockReset()
  mocks.apiDelete.mockReset()
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

/** textarea 输入（native setter + input 事件——annotation-editor-ux 同款） */
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

/** 覆写 id 的标注（模块态隔离：用例间互异 id） */
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

/** 真 busy 接线宿主：useState 持 busy/editing/menu——setBusy/setEditing 回灌重渲染 */
function LivePopups(props: { annotation: Annotation }): JSX.Element {
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<PopupTarget | null>({ annotation: props.annotation, rect: RECT })
  const [menu, setMenu] = useState<PopupTarget | null>(null)
  return (
    <AnnotationPopups
      menu={menu}
      editing={editing}
      busy={busy}
      setMenu={setMenu}
      setEditing={setEditing}
      setBusy={setBusy}
      onChanged={vi.fn()}
    />
  )
}

/** 菜单态宿主（③删除补偿——注册表条目在场=编辑器未挂载形） */
function LiveMenu(props: { annotation: Annotation }): JSX.Element {
  const [busy, setBusy] = useState(false)
  const [menu, setMenu] = useState<PopupTarget | null>({ annotation: props.annotation, rect: RECT })
  return (
    <AnnotationPopups
      menu={menu}
      editing={null}
      busy={busy}
      setMenu={setMenu}
      setEditing={vi.fn()}
      setBusy={setBusy}
      onChanged={vi.fn()}
    />
  )
}

/** 菜单删除钮（menu 容器内定位——静态编辑器宿主下菜单/编辑器双删除钮并存） */
function menuDeleteButton(): HTMLButtonElement {
  const menu = host!.querySelector('[data-testid="annotation-menu"]')
  const btn = [...(menu?.querySelectorAll('button') ?? [])].find((b) => b.textContent === '删除')
  expect(btn, '菜单删除钮存在').toBeDefined()
  return btn as HTMLButtonElement
}

/**
 * [回炉 R4] 菜单 live+编辑器静态宿主：删除经菜单发起、closeEditing 走 noop——
 * 删除成功后编辑器不随层收起（终态可观测面：等待者返 false→'保存失败'态）
 */
function LiveMenuWithEditor(props: { annotation: Annotation }): JSX.Element {
  const [busy, setBusy] = useState(false)
  const [menu, setMenu] = useState<PopupTarget | null>({ annotation: props.annotation, rect: RECT })
  return (
    <AnnotationPopups
      menu={menu}
      editing={{ annotation: props.annotation, rect: RECT }}
      busy={busy}
      setMenu={setMenu}
      setEditing={vi.fn()}
      setBusy={setBusy}
      onChanged={vi.fn()}
    />
  )
}

/** 四态保存钮（testid 定位——saving 态态语分型，textContent 定位面失效） */
function saveButton(): HTMLButtonElement {
  const btn = host!.querySelector<HTMLButtonElement>('[data-testid="annotation-editor-save"]')
  expect(btn).not.toBeNull()
  return btn!
}

describe('F-VISFB-15 ② busy 等待复判 + ③ 删除失败补偿 —— AnnotationPopups', () => {
  it('②busy-1 手动保存在途×失败：autosave 等待 settle 后复判→真实写→saved 真值（非乐观）', async () => {
    const a = annoOf('f15-b1')
    const d1 = deferred<{ ok: boolean; data?: Annotation; error?: { code: string; message: string } }>()
    mocks.apiUpdate.mockImplementationOnce(() => d1.promise)
    mocks.apiUpdate.mockResolvedValueOnce({ ok: true, data: { ...a, comment: 'x' } })
    act(() => {
      root!.render(<LivePopups annotation={a} />)
    })
    typeInto(textarea(), 'x')
    act(() => {
      saveButton().click()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    // busy 等待中——零并发写（旧病=乐观 true 即 saved 错像）
    expect(mocks.apiUpdate).toHaveBeenCalledTimes(1)
    expect(savedFlag()).toBeNull()
    await act(async () => {
      d1.resolve({ ok: false as const, error: { code: 'E', message: '手动写失败' } })
      await vi.advanceTimersByTimeAsync(0)
    })
    // settle 复判：值未落库→真实写链（第二次写）→真实 saved
    expect(mocks.apiUpdate).toHaveBeenCalledTimes(2)
    expect(mocks.apiUpdate.mock.calls[1]![0].annotation.comment).toBe('x')
    expect(savedFlag()?.textContent).toBe('已保存')
    expect(mocks.storeMarkTabDirty).toHaveBeenCalledWith(a.paperId)
    expect(mocks.storeClearTabDirty).toHaveBeenCalledWith(a.paperId)
  })

  it('②busy-2 删除在途×失败：autosave 等待 settle 后复判存活→真实写（值落库非 believing-saved）', async () => {
    const a = annoOf('f15-b2')
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const delD = deferred<{ ok: boolean; data?: null; error?: { code: string; message: string } }>()
    mocks.apiDelete.mockImplementationOnce(() => delD.promise)
    mocks.apiUpdate.mockResolvedValue({ ok: true, data: { ...a, comment: 'y' } })
    act(() => {
      root!.render(<LivePopups annotation={a} />)
    })
    typeInto(textarea(), 'y')
    act(() => {
      buttonByLabel('删除').click()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(mocks.apiDelete).toHaveBeenCalledTimes(1)
    // busy 等待中——零写
    expect(mocks.apiUpdate).not.toHaveBeenCalled()
    await act(async () => {
      delD.resolve({ ok: false as const, error: { code: 'E', message: '删失败' } })
      await vi.advanceTimersByTimeAsync(0)
    })
    // 删除失败（墓碑未打）→复判 live→真实写→saved 真值
    expect(mocks.apiUpdate).toHaveBeenCalledTimes(1)
    expect(savedFlag()?.textContent).toBe('已保存')
    confirmSpy.mockRestore()
  })

  it('②busy-A6 删除在途×成功：autosave 等待 settle 后复判存活→零写返回 false（不复活）', async () => {
    const a = annoOf('f15-b6')
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const delD = deferred<{ ok: boolean; data?: null; error?: { code: string; message: string } }>()
    mocks.apiDelete.mockImplementationOnce(() => delD.promise)
    act(() => {
      root!.render(<LiveMenuWithEditor annotation={a} />)
    })
    typeInto(textarea(), 'w')
    act(() => {
      menuDeleteButton().click()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(mocks.apiDelete).toHaveBeenCalledTimes(1)
    expect(mocks.apiUpdate).not.toHaveBeenCalled()
    await act(async () => {
      delD.resolve({ ok: true as const, data: null })
      await vi.advanceTimersByTimeAsync(0)
    })
    // 删除成功（墓碑）→等待者零写零 store 同步（复活防线沿承）
    expect(mocks.apiUpdate).not.toHaveBeenCalled()
    expect(mocks.storeRemoveAnnotation).toHaveBeenCalledWith(a.id)
    // [回炉 R4] 终态断言：等待者返 false→编辑器 '保存失败' 态（m1 乐观 true
    // 变异下此格转 '已保存'——必须红）
    expect(savedFlag()?.textContent).toBe('保存失败')
    confirmSpy.mockRestore()
  })

  it('[R2] undo 回写旧值窗：lastPersisted 命中但 store 现值≠请求值——不得短路，真实写落库', async () => {
    const a = annoOf('f15-r2')
    // undo 链（annotation-undo comment-edit 逆操作直写 api+store upsert）已把
    // store 现值回写为旧值——second 写源在场（k1 W-1 实锤面）
    mocks.storeTabs = { 'paper-1': { annotations: [{ ...a, comment: '旧值回写' }] } }
    const d1 = deferred<{ ok: boolean; data?: Annotation; error?: { code: string; message: string } }>()
    mocks.apiUpdate.mockImplementationOnce(() => d1.promise)
    mocks.apiUpdate.mockResolvedValueOnce({ ok: true, data: { ...a, comment: 'v' } })
    act(() => {
      root!.render(<LivePopups annotation={a} />)
    })
    typeInto(textarea(), 'v')
    act(() => {
      saveButton().click()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    // busy 等待中——零并发写
    expect(mocks.apiUpdate).toHaveBeenCalledTimes(1)
    await act(async () => {
      // 手动保存成功：lastPersisted={id,'v'}（值命中面成立——唯 store 现证可否决）
      d1.resolve({ ok: true as const, data: { ...a, comment: 'v' } })
      await vi.advanceTimersByTimeAsync(0)
    })
    // store 现值 '旧值回写'≠'v'→短路被否决→真实写 #2 落库（终态 saved=DB/editor 一致）
    expect(mocks.apiUpdate).toHaveBeenCalledTimes(2)
    expect(mocks.apiUpdate.mock.calls[1]![0].annotation.comment).toBe('v')
  })

  it('②busy-3/4 flush 撞 busy（quit·切目标句柄消费形态）：等待 settle→真实写→句柄真实终态', async () => {
    const a = annoOf('f15-b3')
    const d1 = deferred<{ ok: boolean; data?: Annotation; error?: { code: string; message: string } }>()
    mocks.apiUpdate.mockImplementationOnce(() => d1.promise)
    mocks.apiUpdate.mockResolvedValueOnce({ ok: true, data: { ...a, comment: 'z' } })
    act(() => {
      root!.render(<LivePopups annotation={a} />)
    })
    typeInto(textarea(), 'z')
    act(() => {
      saveButton().click()
    })
    let flushState: string | undefined
    const flushed = (async () => {
      const handles = allDraftFlushHandles()
      flushState = (await handles[0]!()) as string
    })()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    // flush 未 settle（等待 busy——旧代码此格即乐观终态 'saved'=stillDirty 失真→丢稿级）
    expect(flushState).toBeUndefined()
    expect(mocks.apiUpdate).toHaveBeenCalledTimes(1)
    await act(async () => {
      d1.resolve({ ok: false as const, error: { code: 'E', message: '手动写失败' } })
      await flushed
    })
    // settle→真实写→真实终态 saved（仅真实落库后）
    expect(flushState).toBe('saved')
    expect(mocks.apiUpdate).toHaveBeenCalledTimes(2)
  })

  it('③删除失败补偿：出表前快照回填（恢复面不丢）→重挂载恢复可重试', async () => {
    const a = annoOf('f15-d1')
    saveAnnotationDraft(a.id, '残留恢复', true)
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    mocks.apiDelete.mockResolvedValueOnce({ ok: false as const, error: { code: 'E', message: '删失败' } })
    act(() => {
      root!.render(<LiveMenu annotation={a} />)
    })
    act(() => {
      buttonByLabel('删除').click()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(mocks.apiDelete).toHaveBeenCalledTimes(1)
    // 失败回填：快照恢复入表（墓碑未打路径）——take 出表校验后回表续挂载链
    expect(takeAnnotationDraft(a.id)).toEqual({ comment: '残留恢复', failed: true })
    saveAnnotationDraft(a.id, '残留恢复', true)
    // 重挂载恢复链：编辑器挂载消费条目→failed 态可重试
    act(() => {
      root!.render(<div />)
    })
    renderEditor(a)
    expect(textarea().value).toBe('残留恢复')
    expect(savedFlag()?.textContent).toBe('保存失败')
    confirmSpy.mockRestore()
  })

  it('③删除成功：零回填（现状语义——墓碑拒入双保险）', async () => {
    const a = annoOf('f15-d2')
    saveAnnotationDraft(a.id, '成功不留', false)
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    mocks.apiDelete.mockResolvedValueOnce({ ok: true as const, data: null })
    act(() => {
      root!.render(<LiveMenu annotation={a} />)
    })
    act(() => {
      buttonByLabel('删除').click()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(mocks.apiDelete).toHaveBeenCalledTimes(1)
    expect(takeAnnotationDraft(a.id)).toBeNull()
    confirmSpy.mockRestore()
  })
})
