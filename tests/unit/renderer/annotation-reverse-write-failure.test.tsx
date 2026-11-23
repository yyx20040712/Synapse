// @vitest-environment jsdom
/**
 * [B4-A 回炉三 B → 回归] 批注文本层反向写失败的残留（§2.5 #18、#25-#29、§10.2）。
 *
 * 表征事实（仓外 b4a-rework3/02-probe-anno-fail-residue-before.log）：反向写失败后
 * 控制器保持 clean——反向值不本地应用、显示值=库值，失败写不在任何 pending（注册表
 * 无草稿）；旧实现仍置 TabState.dirty：编辑器卸载后 tabFlushError 滞留「标注写
 * 失败」，finalizeTab 恒 false、关闭「重试」恒回 error 相（无物可重试）。
 * 红绿归属（仓外 b4a-rework3，文件名=日志）：对改动前树与 cut1-no-guard 均红 3 例
 * （22-final-red-vs-prechange.log、23-final-red-vs-cut1-no-guard.log）——「反向写失败：
 * 两栈不动…」「编辑器卸载后无残留…」「反向写在途窗内新输入…」；两棵较早树上均绿
 * 2 例（条件边界对照）——「恢复后重试成功」「普通写失败仍置旗标」。
 * 锁定行为：
 * - 反向写失败不置 tab IO 错误旗标（旗标语义=有修改未能落库——无未落库修改不置位，
 *   总评宿主「无待写草稿的反向写不置错误态」同义）；失败经专用文案 toast 可见（#18）；
 * - 两栈不动：undo 仍可点、redo 不出现；显示值=库值；恢复后重试成功；
 * - 编辑器卸载后无残留：关闭按 U 分流（U=1 进 confirm 二选、U=0 直接关闭——不进
 *   error 相），finalizeTab 成功；
 * - 反向写在途窗内新输入且反向写失败：新输入仍是待写（由控制器落库调度承接并落库），
 *   旗标不因反向写失败置位；
 * - 对照（条件边界）：普通写失败仍置旗标、toast=真实失败原因。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IDLE_FLUSH_MS } from '../../../src/shared/constants'
import { makeApiStub, toastSpy } from '../../utils/api-client-mock'
import { makeAnnotation, makeTab } from '../../utils/factories'
import type { Annotation, AnnotationRect } from '../../../src/shared/models/annotation'

const mocks = vi.hoisted(() => ({ updateAnnotation: vi.fn(), deleteAnnotation: vi.fn() }))
makeApiStub({
  reader: { updateAnnotation: mocks.updateAnnotation, deleteAnnotation: mocks.deleteAnnotation }
})

import { AnnotationPopups } from '../../../src/renderer/features/reader/view/AnnotationPopups'
import {
  allDraftFlushHandles,
  flushAnnotationDraft,
  hasPendingAnnotationDrafts
} from '../../../src/renderer/features/reader/interact/annotation-draft-registry'
import {
  chooseCloseTabDecision,
  requestCloseTab,
  tabFlushError
} from '../../../src/renderer/features/reader/state/reader-close-tab'
import { finalizeTab } from '../../../src/renderer/features/reader/state/reader-save-coordinator'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import { clearStack } from '../../../src/renderer/features/reader/state/annotation-undo'
import {
  canRedoText,
  canUndoText,
  clearAllTextHistory
} from '../../../src/renderer/features/reader/state/reader-text-history'
import { resetTabLanes } from '../../../src/renderer/shared/tab-write-lane'

const P = 'p-reverse-write-failure'
const ANNO = 'anno-reverse-write-failure'
const RECT: AnnotationRect = { page: 0, x: 0.1, y: 0.2, w: 0.3, h: 0.05 }
const KEY = { paperId: P, kind: 'annotation-comment', annotationId: ANNO } as const
const REVERSE_WRITE_FAILED = '标注保存失败，撤销/重做未生效'

let root: Root | null = null
let host: HTMLDivElement | null = null
let editing: { annotation: Annotation; rect: AnnotationRect } | null = null
let annotation: Annotation

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  mocks.updateAnnotation.mockReset()
  resetTabLanes()
  clearAllTextHistory()
  clearStack(P)
  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  annotation = { ...makeAnnotation(''), id: ANNO, paperId: P }
  useReaderStore.setState({
    tabs: { [P]: makeTab(P, { annotations: [annotation] }) },
    order: [P],
    activeId: P
  })
  editing = { annotation, rect: RECT }
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
  editing = null
  document.body.innerHTML = ''
  vi.clearAllTimers()
  vi.useRealTimers()
  resetTabLanes()
  clearStack(P)
  clearAllTextHistory()
  useReaderStore.setState({ tabs: {}, order: [], activeId: null })
})

function render(): void {
  act(() => {
    root!.render(
      <AnnotationPopups
        menu={null}
        editing={editing}
        busy={false}
        setMenu={() => undefined}
        setEditing={() => undefined}
        setBusy={() => undefined}
        onChanged={() => undefined}
      />
    )
  })
}

function textarea(): HTMLTextAreaElement {
  return host!.querySelector('textarea') as HTMLTextAreaElement
}

function undoBtn(): HTMLButtonElement {
  return host!.querySelector<HTMLButtonElement>('[data-testid="annotation-editor-undo"]')!
}

function redoBtn(): HTMLButtonElement {
  return host!.querySelector<HTMLButtonElement>('[data-testid="annotation-editor-redo"]')!
}

function typeInto(text: string): void {
  const el = textarea()
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
  act(() => {
    setter?.call(el, text)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function pressUndo(): Promise<void> {
  await act(async () => {
    textarea().dispatchEvent(
      new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true })
    )
    for (let i = 0; i < 30; i++) await Promise.resolve()
  })
}

async function settle(): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0)
  })
}

async function idle(): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS)
  })
}

/** 在 act 内等待并冲完其后的微任务续体 */
async function awaitAct<T>(p: Promise<T>): Promise<T> {
  let out!: T
  await act(async () => {
    out = await p
    for (let i = 0; i < 30; i++) await Promise.resolve()
  })
  return out
}

/** 编辑器世界：updateAnnotation 桩记录写序（按 comment）并落闭包库；setWriteBody 给定
 *  某些值的自定义回包（返回 Promise=挂起/失败，undefined=即落库） */
function mountWorld(): {
  order: string[]
  db(): string
  setWriteBody(body: (comment: string) => Promise<unknown> | undefined): void
} {
  const order: string[] = []
  let db = ''
  let body: (comment: string) => Promise<unknown> | undefined = () => undefined
  mocks.updateAnnotation.mockImplementation((arg: { annotation: Annotation }) => {
    const { comment } = arg.annotation
    order.push(comment)
    const held = body(comment)
    if (held === undefined) {
      db = comment
      return Promise.resolve({ ok: true, data: arg.annotation })
    }
    return held.then((r) => {
      if ((r as { ok: boolean }).ok === true) db = comment
      return r
    })
  })
  render()
  return {
    order,
    db: () => db,
    setWriteBody: (b) => {
      body = b
    }
  }
}

const FAILED = { ok: false as const, error: { code: 'E', message: '写盘失败' } }

describe('批注文本层反向写失败的残留', () => {
  it('反向写失败：两栈不动、显示值=库值、toast 专用文案可见、tab IO 错误旗标不在场', async () => {
    const w = mountWorld()
    typeInto('a')
    await idle()
    expect(w.db()).toBe('a')
    w.setWriteBody((comment) => (comment === '' ? Promise.resolve(FAILED) : undefined))
    await pressUndo()
    expect(w.order).toEqual(['a', '']) // 反向写已尝试并失败
    // 失败两栈不动：值不变；past 顶仍在（undo 可点）；future 不新增（redo 不可点）
    expect({ db: w.db(), view: textarea().value }).toEqual({ db: 'a', view: 'a' })
    expect({ canUndo: canUndoText(KEY), canRedo: canRedoText(KEY) }).toEqual({ canUndo: true, canRedo: false })
    expect({ undoDisabled: undoBtn().disabled, redoDisabled: redoBtn().disabled }).toEqual({
      undoDisabled: false,
      redoDisabled: true
    })
    // §2.5 #18 失败可见；无未落库修改——IO 错误旗标不置位
    expect(toastSpy).toHaveBeenCalledWith(REVERSE_WRITE_FAILED, 'error')
    expect(useReaderStore.getState().tabs[P]?.dirty).toBe(false)
    expect(tabFlushError(P)).toBeNull()
  })

  it('恢复后重试成功：同一步 undo 落库', async () => {
    const w = mountWorld()
    typeInto('a')
    await idle()
    w.setWriteBody((comment) => (comment === '' ? Promise.resolve(FAILED) : undefined))
    await pressUndo()
    expect(w.db()).toBe('a')
    w.setWriteBody(() => undefined)
    await pressUndo()
    expect(w.order).toEqual(['a', '', ''])
    expect({ db: w.db(), view: textarea().value }).toEqual({ db: '', view: '' })
  })

  it('编辑器卸载后无残留：关闭按 U 分流不进 error 相（U=1 二选、U=0 直接关闭），finalizeTab 成功', async () => {
    const w = mountWorld()
    typeInto('a') // 新输入：U=1
    await idle()
    w.setWriteBody((comment) => (comment === '' ? Promise.resolve(FAILED) : undefined))
    await pressUndo()
    // 切目标卸载（AnnotationLayer 同序：fire-first flush → setEditing(null) → dispose）
    act(() => {
      void flushAnnotationDraft(ANNO)
    })
    editing = null
    render()
    await settle()
    expect({ handles: allDraftFlushHandles().length, registryDraft: hasPendingAnnotationDrafts() }).toEqual({
      handles: 0,
      registryDraft: false // 失败写不在任何 pending
    })
    expect(tabFlushError(P)).toBeNull()
    // U=1：关闭进 confirm 二选（不是 error 相）
    const phases: unknown[] = []
    const unsubscribe = useReaderStore.subscribe((s) => {
      phases.push(s.tabs[P]?.closing?.phase)
    })
    const closing = requestCloseTab(P)
    await settle()
    expect(useReaderStore.getState().tabs[P]?.closing?.phase).toBe('confirm')
    chooseCloseTabDecision(P, false) // 否=留下
    expect(await closing).toBe(false)
    expect(phases).not.toContain('error')
    // 留下后定稿成功（不恒 false）
    expect(await awaitAct(finalizeTab(P))).toBe(true)
    // U=0：再关闭直接放行
    const closing2 = requestCloseTab(P)
    expect(await closing2).toBe(true)
    expect(useReaderStore.getState().tabs[P]?.closing?.phase).toBe('none')
    unsubscribe()
  })

  it('反向写在途窗内新输入且反向写失败：新输入仍是待写并落库；旗标不因反向写失败置位', async () => {
    const w = mountWorld()
    typeInto('a')
    await idle()
    let rejectReverse!: () => void
    w.setWriteBody((comment) =>
      comment === ''
        ? new Promise((_resolve, reject) => {
            rejectReverse = () => reject(new Error('写盘失败'))
          })
        : undefined
    )
    await act(async () => {
      textarea().dispatchEvent(
        new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true })
      )
      for (let i = 0; i < 5; i++) await Promise.resolve()
    })
    typeInto('y') // 反向写在途窗内新输入（未 blur）
    await act(async () => {
      rejectReverse()
      for (let i = 0; i < 30; i++) await Promise.resolve()
    })
    expect({ db: w.db(), view: textarea().value }).toEqual({ db: 'a', view: 'y' })
    expect(tabFlushError(P)).toBeNull()
    // 新输入由控制器空闲计时落库
    await idle()
    expect(w.order).toEqual(['a', '', 'y'])
    expect({ db: w.db(), view: textarea().value }).toEqual({ db: 'y', view: 'y' })
    expect(tabFlushError(P)).toBeNull()
  })

  it('对照（条件边界）：普通写失败仍置旗标、toast=真实失败原因', async () => {
    const w = mountWorld()
    w.setWriteBody(() => Promise.resolve(FAILED))
    typeInto('b')
    await idle()
    expect(w.order).toEqual(['b'])
    expect(useReaderStore.getState().tabs[P]?.dirty).toBe(true)
    expect(tabFlushError(P)).toBe('标注写失败')
    expect(toastSpy).toHaveBeenLastCalledWith('写盘失败', 'error')
  })
})
