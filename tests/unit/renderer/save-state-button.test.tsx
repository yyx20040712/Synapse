// @vitest-environment jsdom
/**
 * [F-VISFB-13] 四态保存钮测试（新建，always-active）。
 *
 * 锁四链（票面 §5-13：四态图标〔§0-2 锁定裁决——禁仅颜色区分，每态至少
 * 文本/形状/图形双编码〕+A4 删「已保存」类可见字样+A5 按钮重排+键盘与
 * disabled 验收；v207 P2 闸 A1/N-1）：
 * - ① save-status 纯函数新面：deriveSaveUiState 四态优先级（notes 轴三布尔）/
 *   editorSaveUiState 五格映射（批注轴——clean 并入 saved 格）/
 *   deriveSaveButtonView 四格视图模型（钮呈现单源——禁组件内散落 if-else）；
 * - ② SaveStateButton 组件：四态全格（图标 svg+态语文本双编码、sr-only
 *   可见性〔A4〕、spinner、title/aria-label/aria-live=polite）+ disabled
 *   不可操作（.click() 对 disabled 控件零派发=HTML 激活行为面）+ type=button
 *   （Tab 聚焦/Enter/Space 触发=原生 button 语义）；
 * - ③ AnnotationEditor 集成：A5 单行重排（保存/删除右上、取消上移同工具行）/
 *   A1 闸（flush 失败→failed 态呈现→重试可点→点击派发手动保存——禁只接
 *   成功路径）/ dirty 点击=即时手动保存（等价 saveNow 语义）/ A4（saved·
 *   failed 标记 icon+sr-only 零可见字样）/ busy 互斥（saving 呈现）；
 * - ④ P2 闸 N-1 failed 逃生径两径：删除钮逃生（popups 级 api 派发+收层+
 *   草稿零复活）+切目标 fire-first 注册表承接（AnnotationLayer 级立存第二发）。
 * 模块态隔离：批注用互异 id（f13-*，12 号件先例）；api/Toast/store 桩=
 * api-client-mock 工厂（annotation-draft-flush 同形态）。
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
import { SaveStateButton } from '../../../src/renderer/shared/ui/SaveStateButton'
import { takeAnnotationDraft } from '../../../src/renderer/features/reader/interact/annotation-draft-registry'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  deriveSaveButtonView,
  deriveSaveUiState,
  editorSaveUiState
} from '../../../src/renderer/shared/save-status'

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
  // 测试隔离（微回炉 W2 附带发现）：clearAllMocks 只清调用记录不清实现队列
  // ——本件 deferred 形用例中途中断（变异红证态）会遗留未消费的
  // mockImplementationOnce，污染下游用例的 api 派发；定向 reset 收口
  mocks.apiUpdate.mockReset()
  mocks.apiDelete.mockReset()
})

/** textarea 输入（annotation-editor-ux 同款：native setter + input 事件） */
function typeInto(el: HTMLTextAreaElement, text: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
  act(() => {
    setter?.call(el, text)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

/** textarea 上派发 Escape keydown（12 号件同款形态——取消/Escape 同链锚） */
function pressEscape(): void {
  act(() => {
    textarea().dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    )
  })
}

/** 可控 promise（在途写挂起用；reject=失败路径注入——rework 件同形态） */
function deferred<T>(): { promise: Promise<T>; resolve: (v: T) => void; reject: (e: unknown) => void } {
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

function editorSaveBtn(): HTMLButtonElement {
  const btn = host!.querySelector<HTMLButtonElement>('[data-testid="annotation-editor-save"]')
  expect(btn).not.toBeNull()
  return btn!
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
): { onAutosave: ReturnType<typeof vi.fn>; onCancel: ReturnType<typeof vi.fn>; onSave: ReturnType<typeof vi.fn> } {
  const onAutosave = (props.onAutosave ?? vi.fn(() => Promise.resolve(true))) as ReturnType<typeof vi.fn>
  const onCancel = (props.onCancel ?? vi.fn()) as ReturnType<typeof vi.fn>
  const onSave = (props.onSave ?? vi.fn()) as ReturnType<typeof vi.fn>
  act(() => {
    root!.render(
      <AnnotationEditor
        annotation={annotation}
        rect={RECT}
        busy={props.busy ?? false}
        onCancel={onCancel}
        onSave={onSave}
        onDelete={props.onDelete ?? vi.fn()}
        onAutosave={onAutosave}
      />
    )
  })
  return { onAutosave, onCancel, onSave }
}

/** race 挂载器（rework 件同形态；文件域共享——③ A1 闸与 ④ N-1 两消费）：
 *  setEditing 回灌 props 重渲染——收层（setEditing(null)）后编辑器真卸载，
 *  DOM/收层双向断言可锚（直挂编辑器无父级回灌，「编辑器在场」恒过=假绿） */
function renderPopups(editing: Annotation): ReturnType<typeof vi.fn> {
  const props: Parameters<typeof AnnotationPopups>[0] = {
    menu: null,
    editing: { annotation: editing, rect: RECT },
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
  props.setEditing = (v: typeof props.editing): void => {
    setEditingSpy(v)
    props.editing = v
    rerender()
  }
  rerender()
  return setEditingSpy
}

/** 单钮渲染（纯组件四态断言用） */
function mountButton(state: 'dirty' | 'saving' | 'saved' | 'failed', onClick: () => void): HTMLButtonElement {
  act(() => {
    root!.render(<SaveStateButton state={state} onClick={onClick} />)
  })
  const btn = host!.querySelector('button')
  expect(btn).not.toBeNull()
  return btn!
}

/** 态语文本 span（按精确 textContent 定位——sr-only 可见性断言的锚点） */
function stateTextSpan(btn: Element, text: string): HTMLSpanElement {
  const span = [...btn.querySelectorAll('span')].find((s) => s.textContent === text)
  expect(span, `态语 span 存在：${text}`).toBeDefined()
  return span as HTMLSpanElement
}

describe('F-VISFB-13 ① save-status 纯函数 —— 四态推导单源', () => {
  it('deriveSaveUiState 优先级：saving > failed > dirty > saved（六组全枚举）', () => {
    expect(deriveSaveUiState(true, true, true)).toBe('saving')
    expect(deriveSaveUiState(true, false, false)).toBe('saving')
    expect(deriveSaveUiState(false, true, true)).toBe('failed')
    expect(deriveSaveUiState(false, true, false)).toBe('failed')
    expect(deriveSaveUiState(false, false, true)).toBe('dirty')
    expect(deriveSaveUiState(false, false, false)).toBe('saved')
  })

  it('editorSaveUiState 五格映射：clean 并入 saved，余四格直通', () => {
    expect(editorSaveUiState('clean')).toBe('saved')
    expect(editorSaveUiState('dirty')).toBe('dirty')
    expect(editorSaveUiState('saving')).toBe('saving')
    expect(editorSaveUiState('saved')).toBe('saved')
    expect(editorSaveUiState('failed')).toBe('failed')
  })

  it('deriveSaveButtonView dirty 格：彩色可点+保存图标+sr-only 态语+title 立即保存', () => {
    const v = deriveSaveButtonView('dirty')
    expect(v.variant).toBe('primary')
    expect(v.disabled).toBe(false)
    expect(v.spinner).toBe(false)
    expect(v.icon).toBe('save')
    expect(v.text).toBe('保存')
    expect(v.visibleText).toBe(false)
    expect(v.title).toBe('立即保存')
  })

  it('deriveSaveButtonView saving 格：spinner 禁用+sr-only 态语', () => {
    const v = deriveSaveButtonView('saving')
    expect(v.variant).toBe('secondary')
    expect(v.disabled).toBe(true)
    expect(v.spinner).toBe(true)
    expect(v.text).toBe('保存中')
    expect(v.visibleText).toBe(false)
    expect(v.title).toBe('保存中')
  })

  it('deriveSaveButtonView saved 格：灰色禁用+check 图标+sr-only 态语（A4 删可见字样）', () => {
    const v = deriveSaveButtonView('saved')
    expect(v.variant).toBe('secondary')
    expect(v.disabled).toBe(true)
    expect(v.spinner).toBe(false)
    expect(v.icon).toBe('check')
    expect(v.text).toBe('已保存')
    expect(v.visibleText).toBe(false)
    expect(v.title).toBe('已保存')
  })

  it('deriveSaveButtonView failed 格：红+短文本「重试」可点+显式无障碍名', () => {
    const v = deriveSaveButtonView('failed')
    expect(v.variant).toBe('danger')
    expect(v.disabled).toBe(false)
    expect(v.spinner).toBe(false)
    expect(v.icon).toBe('retry')
    expect(v.text).toBe('重试')
    expect(v.visibleText).toBe(true)
    expect(v.title).toBe('重试——上次保存失败')
  })
})

describe('F-VISFB-13 ② SaveStateButton 组件 —— 四态图标与 disabled 验收', () => {
  it('dirty 格：可点+图标 svg 在场+态语 sr-only+primary 皮肤+aria-live=polite+type=button', () => {
    const btn = mountButton('dirty', () => undefined)
    expect(btn.disabled).toBe(false)
    expect(btn.querySelector('svg')).not.toBeNull()
    expect(stateTextSpan(btn, '保存').classList.contains('sr-only')).toBe(true)
    expect(btn.className).toContain('syn-btn-primary')
    expect(btn.getAttribute('title')).toBe('立即保存')
    expect(btn.getAttribute('aria-label')).toBe('立即保存')
    expect(btn.getAttribute('aria-live')).toBe('polite')
    expect(btn.getAttribute('type')).toBe('button')
  })

  it('saving 格：disabled+spinner（.animate-spin）+态语 sr-only（图标=spinner 形状编码）', () => {
    const btn = mountButton('saving', () => undefined)
    expect(btn.disabled).toBe(true)
    expect(btn.querySelector('.animate-spin')).not.toBeNull()
    expect(stateTextSpan(btn, '保存中').classList.contains('sr-only')).toBe(true)
    expect(btn.getAttribute('title')).toBe('保存中')
  })

  it('saved 格：disabled+check 图标在场+态语 sr-only（无可见「已保存」字样）', () => {
    const btn = mountButton('saved', () => undefined)
    expect(btn.disabled).toBe(true)
    expect(btn.querySelector('svg')).not.toBeNull()
    expect(stateTextSpan(btn, '已保存').classList.contains('sr-only')).toBe(true)
    expect(btn.textContent).toBe('已保存')
    expect(btn.getAttribute('title')).toBe('已保存')
    expect(btn.getAttribute('aria-label')).toBe('已保存')
  })

  it('failed 格：可点+retry 图标在场+可见短文本「重试」（态语 span 无 sr-only）+danger 皮肤', () => {
    const btn = mountButton('failed', () => undefined)
    expect(btn.disabled).toBe(false)
    expect(btn.querySelector('svg')).not.toBeNull()
    expect(stateTextSpan(btn, '重试').classList.contains('sr-only')).toBe(false)
    expect(btn.textContent).toBe('重试')
    expect(btn.className).toContain('syn-btn-danger')
    expect(btn.getAttribute('aria-label')).toBe('重试——上次保存失败')
  })

  it('disabled 不可操作：saving/saved 态 .click() 零触发；dirty 态 .click() 触发一次', () => {
    const onClick = vi.fn()
    let btn = mountButton('saving', onClick)
    act(() => {
      btn.click()
    })
    expect(onClick).not.toHaveBeenCalled()
    btn = mountButton('saved', onClick)
    act(() => {
      btn.click()
    })
    expect(onClick).not.toHaveBeenCalled()
    btn = mountButton('dirty', onClick)
    act(() => {
      btn.click()
    })
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

describe('F-VISFB-13 ③ AnnotationEditor —— A5 重排/A1 闸/A4 标记/busy', () => {
  it('A5 单行重排：保存/删除/取消与撤销/重做同工具行（取消上移、无第二按钮行）', () => {
    renderEditor(annoOf('f13-a5'))
    const undoRow = host!.querySelector('[data-testid="annotation-editor-undo"]')!.closest('div')
    expect(editorSaveBtn().closest('div')).toBe(undoRow)
    expect(buttonByLabel('删除').closest('div')).toBe(undoRow)
    expect(buttonByLabel('取消').closest('div')).toBe(undoRow)
    expect(host!.querySelectorAll('[data-testid="annotation-editor"] button').length).toBe(5)
  })

  it('A1 闸 failed 链（popups 级真卸载锚）：取消 flush 失败→不收层+保存钮 failed 可点→点击派发手动保存重试', async () => {
    const a = annoOf('f13-a1')
    const d1 = deferred<{ ok: boolean; data: Annotation }>()
    mocks.apiUpdate.mockImplementation(() => d1.promise)
    const setEditingSpy = renderPopups(a)
    typeInto(textarea(), '重试稿')
    act(() => {
      buttonByLabel('取消').click()
    })
    expect(mocks.apiUpdate).toHaveBeenCalledTimes(1)
    expect(setEditingSpy).not.toHaveBeenCalled()
    await act(async () => {
      d1.reject(new Error('flush 存失败'))
      await vi.advanceTimersByTimeAsync(0)
    })
    // 回炉轮 1 B1：直挂编辑器无父级回灌时「编辑器在场」恒过=假绿——本锚走
    // popups 级（setEditing 回灌真卸载）：failed 终态不得收层
    expect(setEditingSpy).not.toHaveBeenCalledWith(null)
    expect(host!.querySelector('[data-testid="annotation-editor"]')).not.toBeNull()
    const save = editorSaveBtn()
    expect(save.disabled).toBe(false)
    expect(save.textContent).toBe('重试')
    expect(save.getAttribute('aria-label')).toBe('重试——上次保存失败')
    // 重试链：点击保存→手动保存链再派发（apiUpdate 第二发，载荷=草稿值）
    mocks.apiUpdate.mockImplementation(async ({ annotation }: { annotation: Annotation }) => ({ ok: true, data: annotation }))
    act(() => {
      save.click()
    })
    expect(mocks.apiUpdate).toHaveBeenCalledTimes(2)
    expect(mocks.apiUpdate.mock.calls[1]![0].annotation.comment).toBe('重试稿')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(setEditingSpy).toHaveBeenCalledWith(null)
  })

  it('Escape 同链平价锚（W2）：Escape flush 失败→不收层→二次 Escape 再 flush 重试（重试发）', async () => {
    const a = annoOf('f13-e1')
    const d1 = deferred<{ ok: boolean; data: Annotation }>()
    const d2 = deferred<{ ok: boolean; data: Annotation }>()
    mocks.apiUpdate
      .mockImplementationOnce(() => d1.promise)
      .mockImplementationOnce(() => d2.promise)
    const setEditingSpy = renderPopups(a)
    typeInto(textarea(), 'esc 稿')
    pressEscape()
    expect(mocks.apiUpdate).toHaveBeenCalledTimes(1)
    await act(async () => {
      d1.reject(new Error('esc 存失败'))
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(setEditingSpy).not.toHaveBeenCalledWith(null)
    expect(host!.querySelector('[data-testid="annotation-editor"]')).not.toBeNull()
    // 头注子句「二次 Escape=再 flush 重试」的锚：failed 态 Escape 再走
    // requestCancel→flush（与取消钮同链——接线面 keydown Escape）
    pressEscape()
    expect(mocks.apiUpdate).toHaveBeenCalledTimes(2)
    expect(mocks.apiUpdate.mock.calls[1]![0].annotation.comment).toBe('esc 稿')
  })

  it('dirty 点击=即时手动保存（saveNow 等价）：零防抖等待、不混入自动保存链', () => {
    const onAutosave = vi.fn(() => Promise.resolve(true))
    const onSave = vi.fn()
    renderEditor(annoOf('f13-a2'), { onAutosave, onSave })
    typeInto(textarea(), '即存稿')
    act(() => {
      editorSaveBtn().click()
    })
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith('即存稿')
    expect(onAutosave).not.toHaveBeenCalled()
  })

  it('A4 saved 标记：图标在场+「已保存」sr-only（零可见字样、textContent 锚保活）', async () => {
    const onAutosave = vi.fn(() => Promise.resolve(true))
    renderEditor(annoOf('f13-a3'), { onAutosave })
    typeInto(textarea(), 's')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    const flag = savedFlag()
    expect(flag).not.toBeNull()
    expect(flag!.textContent).toBe('已保存')
    expect(flag!.querySelector('svg')).not.toBeNull()
    expect(stateTextSpan(flag!, '已保存').classList.contains('sr-only')).toBe(true)
    // [主控集成窗增锚] viewBox svg 无固有尺寸/描边——可见性靠语境类承载
    //（e2e 真机拦截零盒隐藏实录；jsdom 存在性断言盲区）
    expect(flag!.classList.contains('syn-status-icon')).toBe(true)
    const css = readFileSync(join(process.cwd(), 'src/renderer/shared/theme-buttons.css'), 'utf8')
    expect(css).toMatch(/\.syn-status-icon svg\s*\{[^}]*width:\s*16px/)
    expect(css).toMatch(/\.syn-status-icon svg\s*\{[^}]*stroke:\s*currentColor/)
  })

  it('A4 failed 标记：图标在场+「保存失败」sr-only（零可见字样）', async () => {
    const onAutosave = vi.fn(() => Promise.resolve(false))
    renderEditor(annoOf('f13-a4'), { onAutosave })
    typeInto(textarea(), 'f')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    const flag = savedFlag()
    expect(flag).not.toBeNull()
    expect(flag!.textContent).toBe('保存失败')
    expect(flag!.querySelector('svg')).not.toBeNull()
    expect(stateTextSpan(flag!, '保存失败').classList.contains('sr-only')).toBe(true)
  })

  it('busy 互斥：busy 在途→保存钮禁用+spinner（saving 呈现）', () => {
    renderEditor(annoOf('f13-b1'), { busy: true })
    const save = editorSaveBtn()
    expect(save.disabled).toBe(true)
    expect(save.querySelector('.animate-spin')).not.toBeNull()
    expect(save.textContent).toContain('保存中')
  })
})

describe('F-VISFB-13 ④ P2 闸 N-1 —— failed 态逃生径两径（always-active）', () => {
  it('删除钮逃生：failed 不收层时点删除→api 删除派发+收层+草稿零复活', async () => {
    const a = annoOf('f13-n1')
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    mocks.apiUpdate.mockRejectedValueOnce(new Error('首存失败'))
    mocks.apiDelete.mockResolvedValue({ ok: true, data: null })
    const setEditingSpy = renderPopups(a)
    typeInto(textarea(), '逃生稿')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(savedFlag()?.textContent).toBe('保存失败')
    act(() => {
      buttonByLabel('删除').click()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(mocks.apiDelete).toHaveBeenCalledTimes(1)
    expect(setEditingSpy).toHaveBeenCalledWith(null)
    expect(host!.querySelector('[data-testid="annotation-editor"]')).toBeNull()
    expect(takeAnnotationDraft(a.id)).toBeNull()
    confirmSpy.mockRestore()
  })

  it('切目标 fire-first：failed 态点他条标注→注册表承接立存第二发+菜单即开', async () => {
    const a = annoOf('f13-l1')
    const b = annoOf('f13-l2')
    mocks.apiUpdate
      .mockRejectedValueOnce(new Error('自动存失败'))
      .mockImplementation(async ({ annotation }: { annotation: Annotation }) => ({ ok: true, data: annotation }))
    act(() => {
      root!.render(<AnnotationLayer annotations={[a, b]} page={0} pageRoot={null} onChanged={vi.fn()} />)
    })
    const rects = (): HTMLElement[] =>
      [...host!.querySelectorAll('[data-testid="annotation-rect"]')] as HTMLElement[]
    act(() => {
      rects()[0]!.click()
    })
    act(() => {
      buttonByLabel('添加笔记').click()
    })
    typeInto(textarea(), '切目标稿')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(savedFlag()?.textContent).toBe('保存失败')
    act(() => {
      rects()[1]!.click()
    })
    expect(mocks.apiUpdate).toHaveBeenCalledTimes(2)
    expect(mocks.apiUpdate.mock.calls[1]![0].annotation.comment).toBe('切目标稿')
    expect(host!.querySelector('[data-testid="annotation-editor"]')).toBeNull()
    expect(host!.querySelector('[data-testid="annotation-menu"]')).not.toBeNull()
  })
})
