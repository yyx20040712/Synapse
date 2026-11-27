// @vitest-environment jsdom
/**
 * [F-A11] AnnotationPopups 自动保存接线面测试（自 annotation-editor-ux.test.tsx
 * 拆出 2026-09-09 门二轮——该件超 ESLint max-lines 500；本件锁接线行为）。
 *
 * 锁：自动保存=普通写通道（api 链+store 同步+pushUndo 会话单 entry、不
 * setEditing 收层；失败 markTabDirty+toast）+ [W-A 门二] busy 串行互斥
 * （autosave 在途→局部保存入口不在场，后续 idle 定时零并发）。模块替身：
 * api/client、Toast、reader.store、
 * annotation-undo（unwrap 对齐真实语义 await 后判 ok；ApiClientError 双参）。
 * React act 环境对齐 annotation-layer.test.tsx；输入模拟对齐 lineage-tag-edit。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Annotation, AnnotationRect } from '../../../src/shared/models/annotation'
import { makeApiStub, toastSpy } from '../../utils/api-client-mock'
import { makeAnnotation } from '../../utils/factories'
import { IDLE_FLUSH_MS } from '../../../src/shared/constants'
import type * as annotationUndoModule from '../../../src/renderer/features/reader/state/annotation-undo'
import { AnnotationPopups } from '../../../src/renderer/features/reader/view/AnnotationPopups'
import { ApiClientError } from '../../../src/renderer/api/client'
import { resetTabLanes } from '../../../src/renderer/shared/tab-write-lane'

const mocks = vi.hoisted(() => ({
  // AnnotationPopups 接线面的模块替身（api/Toast/store/undo 栈）
  apiUpdate: vi.fn(),
  storeUpdateAnnotation: vi.fn(),
  apiDelete: vi.fn(),
  storeMarkTabDirty: vi.fn(),
  storeMarkTabUnfinalized: vi.fn(),
  storeClearTabDirty: vi.fn(),
  storeRemoveAnnotation: vi.fn(),
  storeNotifyNoteHighlight: vi.fn(),
  pushUndo: vi.fn(),
  // Toast 入口 spy=共享工厂实例（下方顶层语句替换——体内经 mocks.showToast 断言）
  showToast: undefined as unknown as ReturnType<typeof vi.fn>,
  // [F-VISFB-15 回炉 R2] store tabs 投影（生产形现值注入——见 reader.store
  // mock 处注；反向竞态格用已落库现值承载值复判）
  storeTabs: {
    'paper-1': {
      annotations: [{ id: 'anno-1', paperId: 'paper-1', comment: '手动值' }]
    }
  }
}))
mocks.showToast = toastSpy
makeApiStub({ reader: { updateAnnotation: mocks.apiUpdate, deleteAnnotation: mocks.apiDelete } })

vi.mock('../../../src/renderer/features/reader/state/reader.store', () => ({
  useReaderStore: {
    getState: () => ({
      updateAnnotation: mocks.storeUpdateAnnotation,
      markTabDirty: mocks.storeMarkTabDirty,
      // [B4-A R2 fixture migration] U-axis write point (controller edit chain)
      markTabUnfinalized: mocks.storeMarkTabUnfinalized,
      clearTabDirty: mocks.storeClearTabDirty,
      removeAnnotation: mocks.storeRemoveAnnotation,
      notifyNoteHighlight: mocks.storeNotifyNoteHighlight,
      // [F-VISFB-15 回炉 R2] store 现值复判面（annotation-popups-actions 值
      // 复判读 getState().tabs）：生产形 tabs 投影注入——已落库值供反向竞态复判
      tabs: mocks.storeTabs
    })
  }
}))

// [B4-A R1 迁移] annotation-undo 替身改展开型：合并会话记账（recordCommentEdit/
// endCommentEditSession/touchCommentEditAfter）用真实现，pushUndo 保留调用 spy（透传）
vi.mock('../../../src/renderer/features/reader/state/annotation-undo', async (importOriginal) => {
  const real = await importOriginal<typeof annotationUndoModule>()
  return {
    ...real,
    clearStack: vi.fn(),
    pushUndo: (...args: Parameters<typeof real.pushUndo>) => {
      mocks.pushUndo(...args)
      return real.pushUndo(...args)
    },
    // 合并会话：会话内新条目入栈（栈深前进）才计入 pushUndo spy——同会话续写不新建条目
    recordCommentEdit: (...args: Parameters<typeof real.recordCommentEdit>) => {
      const depthBefore = real.stackDepth(args[0])
      const entry = real.recordCommentEdit(...args)
      if (real.stackDepth(args[0]) > depthBefore) mocks.pushUndo(args[0], entry)
      return entry
    }
  }
})

/** 完整形态最小标注（comment 可覆写——终值断言用） */
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
  // [B4-A R1] per-tab lane 模块态隔离（挂起任务不堵后续用例同 tab 入链）
  resetTabLanes()
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
      await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS)
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
      await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS)
    })
    expect(mocks.apiUpdate).toHaveBeenCalledTimes(2)
    expect(mocks.pushUndo).toHaveBeenCalledTimes(1)
    expect(setEditing).not.toHaveBeenCalled()
  })

  it('[B4-A R1 §4.2] blur 结束批注编辑合并会话：blur 后的续写新建 comment-edit（不并入 blur 前条目）', async () => {
    const setEditing = vi.fn()
    mocks.apiUpdate.mockImplementation(async ({ annotation }: { annotation: Annotation }) => ({
      ok: true,
      data: annotation
    }))
    // store 现值随成功写推进（生产形：updateAnnotation 回写 tabs——会话二的 before 取此现值）
    const presetTabs = mocks.storeTabs['paper-1']
    mocks.storeUpdateAnnotation.mockImplementation((a: Annotation) => {
      mocks.storeTabs['paper-1'] = { annotations: [a] }
    })
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
    // 会话一：两轮停顿仅一条 comment-edit
    typeInto(ta, '一')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS)
    })
    typeInto(ta, '一续')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS)
    })
    expect(mocks.pushUndo).toHaveBeenCalledTimes(1)
    // blur（同步关闭单元+立存）= 会话终止
    await act(async () => {
      ta.blur()
      await vi.advanceTimersByTimeAsync(0)
    })
    // 会话二：续写开新操作项（before=会话二开始前的标注现值）
    typeInto(ta, '二')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS)
    })
    expect(mocks.pushUndo).toHaveBeenCalledTimes(2)
    expect(mocks.pushUndo.mock.calls[1]![1]).toMatchObject({
      kind: 'comment-edit',
      before: expect.objectContaining({ comment: '一续' }),
      after: expect.objectContaining({ comment: '二' })
    })
    expect(setEditing).not.toHaveBeenCalled()
    mocks.storeTabs['paper-1'] = presetTabs // 复位（后续用例依赖初值 '手动值'）
    mocks.storeUpdateAnnotation.mockReset()
  })

  it('[B4-A R1 §4.2] delete 项载荷=删除前的标注现值（含本编辑会话已落库批注——undo 重建不丢）', async () => {
    const a = { ...makeAnnotation(''), id: 'anno-del-snap' }
    const preset = mocks.storeTabs['paper-1']
    mocks.storeTabs['paper-1'] = { annotations: [a] }
    mocks.apiUpdate.mockImplementation(async ({ annotation }: { annotation: Annotation }) => ({
      ok: true,
      data: annotation
    }))
    // 生产形 store：写成功回写现值；删除成功真移除现值（快照若晚于移除才取，
    // 现值查无→回退到挂载时的陈旧对象，本会话批注随「删除→undo 重建」丢失）
    mocks.storeUpdateAnnotation.mockImplementation((x: Annotation) => {
      mocks.storeTabs['paper-1'] = { annotations: [x] }
    })
    mocks.storeRemoveAnnotation.mockImplementation((id: string) => {
      const tab = mocks.storeTabs['paper-1']
      if (tab) tab.annotations = tab.annotations.filter((x) => x.id !== id)
    })
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    mocks.apiDelete.mockResolvedValueOnce({ ok: true as const, data: null })
    try {
      act(() => {
        root!.render(
          <AnnotationPopups
            menu={null}
            editing={{ annotation: a, rect: RECT }}
            busy={false}
            setMenu={vi.fn()}
            setEditing={vi.fn()}
            setBusy={vi.fn()}
            onChanged={vi.fn()}
          />
        )
      })
      const ta = host!.querySelector('textarea') as HTMLTextAreaElement
      typeInto(ta, '本会话批注')
      await act(async () => {
        await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS)
      })
      expect(savedFlag()?.textContent).toBe('已保存')
      const del = host!.querySelector<HTMLButtonElement>('button[title="删除"]')!
      await act(async () => {
        del.click()
        await vi.advanceTimersByTimeAsync(0)
      })
      expect(mocks.storeRemoveAnnotation).toHaveBeenCalledTimes(1)
      expect(mocks.pushUndo).toHaveBeenCalledWith('paper-1', {
        kind: 'delete',
        annotation: expect.objectContaining({ id: 'anno-del-snap', comment: '本会话批注' })
      })
    } finally {
      confirmSpy.mockRestore()
      mocks.storeTabs['paper-1'] = preset
      mocks.storeUpdateAnnotation.mockReset()
      mocks.storeRemoveAnnotation.mockReset()
    }
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
      await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS)
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

  it('W-A 竞态（正向）：autosave 在途置 busy → 局部保存入口不在场、零并发写', async () => {
    await mountPopupsRace()
    const d1 = deferred<{ ok: boolean; data: Annotation }>()
    mocks.apiUpdate.mockImplementation(() => d1.promise)
    const ta = host!.querySelector('textarea') as HTMLTextAreaElement
    typeInto(ta, '自动值')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS)
    })
    expect(mocks.apiUpdate).toHaveBeenCalledTimes(1)
    expect(host!.querySelector('[data-testid="annotation-editor-save"]')).toBeNull()
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

  it('W-A 竞态（反向）：idle 写在途 busy → 后续 idle 定时零并发', async () => {
    await mountPopupsRace()
    const d1 = deferred<{ ok: boolean; data: Annotation }>()
    mocks.apiUpdate.mockImplementation(() => d1.promise)
    const ta = host!.querySelector('textarea') as HTMLTextAreaElement
    typeInto(ta, '在途值')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS)
    })
    expect(mocks.apiUpdate).toHaveBeenCalledTimes(1)
    expect(host!.querySelector('[data-testid="annotation-editor-save"]')).toBeNull()
    // 写链在途期间，再次防抖到期也被 busy 挡，不并发写。
    await act(async () => {
      await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS)
    })
    expect(mocks.apiUpdate).toHaveBeenCalledTimes(1)
    await act(async () => {
      d1.resolve({ ok: true, data: { ...makeAnnotation('在途值') } })
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(mocks.apiUpdate).toHaveBeenCalledTimes(1)
    expect(mocks.storeUpdateAnnotation).toHaveBeenCalledTimes(1)
    expect(mocks.storeUpdateAnnotation.mock.calls[0]![0].comment).toBe('在途值')
    expect(host!.querySelector('[data-testid="annotation-editor"]')).not.toBeNull()
  })

})
