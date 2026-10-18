// @vitest-environment jsdom
/**
 * [F-VISFB-64] closing gate 真实链判别测试（拆自 quit-gate-sources——文件 ≤500
 * 行红线拆件，门二 P0-2 主控终裁承接）。
 *
 * 覆盖（always-active）：
 * - ②.5 真实同步链判别对（回炉 W-r1-02）：裸 fire closing 下提交会话被闸
 *   （红锚）／runQuitInternal 包裹穿闸提交；
 * - ②.5 全链（runQuitFlush ②.5 穿闸——quit-flush 包裹摘除即红，变异锚）；
 * - SelectionLayer 保存 create 链（回炉 W-r1-03）：冻结期拒绝零 api+选区保持；
 * - 批注草稿值入口（门二 P0-1 主控终裁承接）：applyEdit/undoEdit/redoEdit
 *   typing 值入口冻结期拒绝（值+栈+保存态不变——un-attempted 值不留组件
 *   本地不入④表面；LineageFloatingNotes onChange 对称面）。
 */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'
import { makeAnnotation, mkItem, mkText, seedRegistry } from '../../utils/factories'
import { stubElementRects, stubRangeGBCR, type StubBox } from '../../utils/geometry'

const mocks = vi.hoisted(() => ({
  annoCreate: vi.fn(),
  lineageUpsertNote: vi.fn()
}))
makeApiStub({
  reader: { saveAnnotation: mocks.annoCreate },
  lineage: { upsertFloatingNote: mocks.lineageUpsertNote }
})

import { runQuitInternal, setQuitClosing } from '../../../src/renderer/app/quit-closing-gate'
import { runQuitFlush } from '../../../src/renderer/app/quit-flush'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import { useNotesStore } from '../../../src/renderer/features/notes/notes.store'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import {
  fireLineageNoteCommit,
  noteDraftPending,
  setNoteDraftPending
} from '../../../src/renderer/features/lineage/lineage-note-draft'
import { SelectionLayer } from '../../../src/renderer/features/reader/interact/SelectionLayer'
import { useAnnotationDraft } from '../../../src/renderer/features/reader/interact/use-annotation-draft'
import { LineageFloatingNotes } from '../../../src/renderer/features/lineage/LineageFloatingNotes'
import type { FloatingNote } from '../../../src/shared/models/lineage'

const NOTE: FloatingNote = {
  id: 'fn-1',
  folderId: '__main__',
  x: 10,
  y: 10,
  content: '基线内容',
  createdAt: 't0',
  updatedAt: 't0'
}

let root: Root | null = null
let host: HTMLDivElement | null = null

/** 挂真实 LineageFloatingNotes（edit+select 交互门开——beginEdit/textarea 可达） */
function mountNotes(contentEl: HTMLDivElement): void {
  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root!.render(createElement(LineageFloatingNotes, { contentRef: { current: contentEl } }))
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  setQuitClosing(false)
  useReaderStore.setState({ tabs: {}, order: [], activeId: null })
  for (const k of Object.keys(useNotesStore.getState().noteByPaper)) {
    useNotesStore.getState().discardPendingEdit(k)
  }
  useNotesStore.setState({ noteByPaper: {} })
  useLineageStore.setState({
    floatingNotes: [NOTE],
    nodes: [],
    edges: [],
    saveStatus: 'clean',
    queue: [],
    flushing: false,
    lastWriteError: null,
    undoStack: [],
    redoStack: []
  })
  useLineageViewStore.setState({ mode: 'edit', tool: 'select' })
  setNoteDraftPending(false)
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  host?.remove()
  root = null
  host = null
  setQuitClosing(false)
  setNoteDraftPending(false)
})

describe('quit-gate-realchain —— closing gate 真实链判别（F-VISFB-64）', () => {
  it('[轮2 W-r1-02] ②.5 真实同步链判别对：裸 fire closing 下提交会话被闸（红锚）；runQuitInternal 包裹穿闸提交', () => {
    const contentEl = document.createElement('div')
    document.body.appendChild(contentEl)
    mountNotes(contentEl)
    const noteEl = host!.querySelector<HTMLDivElement>('.tl-note')!
    act(() => {
      noteEl.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    })
    const ta = host!.querySelector<HTMLTextAreaElement>('textarea')
    if (ta === null) throw new Error('编辑会话 textarea 未挂载')
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
    act(() => {
      setter?.call(ta, '轮2 收口输入')
      ta.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(noteDraftPending()).toBe(true)
    try {
      setQuitClosing(true)
      // 裸调（无豁免域，非 quit 收口链调用形）：closeEdit 提交会话整体被闸——
      // 编辑会话+pending 保真（不静默丢稿）、零入队
      fireLineageNoteCommit()
      expect(noteDraftPending()).toBe(true)
      expect(useLineageStore.getState().queue).toEqual([])
      // 包裹（quit-flush ②.5 同形同步豁免域）：穿闸提交成功入队+pending 清
      runQuitInternal(fireLineageNoteCommit)
      expect(noteDraftPending()).toBe(false)
      expect(useLineageStore.getState().queue.length).toBe(1)
    } finally {
      setQuitClosing(false)
      setNoteDraftPending(false)
      contentEl.remove()
    }
  })

  it('[轮2 W-r1-02·全链] closing=true 下 runQuitFlush ②.5 穿闸提交（quit-flush 包裹摘除即红——变异锚）', async () => {
    const contentEl = document.createElement('div')
    document.body.appendChild(contentEl)
    mountNotes(contentEl)
    const noteEl = host!.querySelector<HTMLDivElement>('.tl-note')!
    act(() => {
      noteEl.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    })
    const ta = host!.querySelector<HTMLTextAreaElement>('textarea')
    if (ta === null) throw new Error('编辑会话 textarea 未挂载')
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
    act(() => {
      setter?.call(ta, '轮2 全链输入')
      ta.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(noteDraftPending()).toBe(true)
    mocks.lineageUpsertNote.mockImplementation(async (input: { id?: string; content: string }) => ({
      ok: true as const,
      data: { ...NOTE, id: input.id ?? NOTE.id, content: input.content }
    }))
    try {
      setQuitClosing(true)
      const stillDirty = await runQuitFlush()
      // ②.5 经同步豁免域穿闸提交→③ save 正道落库排空队列→④ 全净
      expect(useLineageStore.getState().queue).toEqual([])
      expect(noteDraftPending()).toBe(false)
      expect(stillDirty).toBe(false)
    } finally {
      setQuitClosing(false)
      setNoteDraftPending(false)
      contentEl.remove()
    }
  })

  it('[门二 P0-1·主控终裁承接] 批注草稿值入口（typing/undo/redo）：冻结期拒绝（值+栈+保存态不变）；closing 外正常迁移', async () => {
    let draft: ReturnType<typeof useAnnotationDraft> | null = null
    function Host(): null {
      draft = useAnnotationDraft('anno-typ-64', 'init', async () => true)
      return null
    }
    ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () => {
      root!.render(createElement(Host))
    })
    // closing 外：typing → dirty（值迁移+保存态）
    act(() => {
      draft!.applyEdit('用户输入')
    })
    expect(draft!.comment).toBe('用户输入')
    expect(draft!.saveState).toBe('dirty')
    expect(draft!.canUndo).toBe(true)
    setQuitClosing(true)
    // 冻结期：typing 拒绝——值/保存态不变（un-attempted 值不留组件本地）
    act(() => {
      draft!.applyEdit('冻结窗输入')
    })
    expect(draft!.comment).toBe('用户输入')
    expect(draft!.saveState).toBe('dirty')
    // 冻结期：undo 拒绝——栈不弹、值不变
    act(() => {
      draft!.undoEdit()
    })
    expect(draft!.comment).toBe('用户输入')
    expect(draft!.canUndo).toBe(true)
    setQuitClosing(false)
    // 解冻后：typing 恢复（红绿分界——闸不残留）
    act(() => {
      draft!.applyEdit('解冻输入')
    })
    expect(draft!.comment).toBe('解冻输入')
    // redo 面（终裁条件——门二 GO_WITH_CONDITIONS 唯一条件）：解冻后 undo 建
    // redo 栈，再冻结 redo 拒绝（栈不弹值不变）、解冻恢复
    act(() => {
      draft!.undoEdit()
    })
    expect(draft!.comment).toBe('用户输入')
    expect(draft!.canRedo).toBe(true)
    setQuitClosing(true)
    act(() => {
      draft!.redoEdit()
    })
    expect(draft!.comment).toBe('用户输入')
    expect(draft!.canRedo).toBe(true)
    setQuitClosing(false)
    act(() => {
      draft!.redoEdit()
    })
    expect(draft!.comment).toBe('解冻输入')
  })

  it('[轮2 W-r1-03] SelectionLayer 保存（create 链）：冻结期拒绝零 api+选区保持；closing 外落库', async () => {
    vi.useFakeTimers()
    let rangeStub: { restore(): void } | null = null
    const page1 = document.createElement('div')
    try {
      page1.setAttribute('data-page-root', '1')
      page1.innerHTML = '<div class="textLayer"><span>page one alpha beta</span></div>'
      document.body.appendChild(page1)
      const rects = new Map<Element, StubBox>()
      rects.set(page1, { x: 0, y: 0, width: 600, height: 800 })
      rects.set(page1.querySelector('.textLayer')!, { x: 0, y: 0, width: 600, height: 800 })
      stubElementRects(rects)
      rangeStub = stubRangeGBCR(() => ({ x: 10, y: 60, width: 200, height: 20 }))
      seedRegistry(1, mkText([mkItem('page one alpha beta', 72, 700)]))
      ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
      host = document.createElement('div')
      document.body.appendChild(host)
      root = createRoot(host)
      const onSaved = vi.fn()
      await act(async () => {
        root!.render(
          createElement(SelectionLayer, { pageRoot: page1, paperId: 'p-1', page: 0, onSaved })
        )
      })
      const span = page1.querySelector('span')!.firstChild!
      const sel = window.getSelection()
      const range = document.createRange()
      range.setStart(span, 0)
      range.setEnd(span, 4)
      sel?.removeAllRanges()
      sel?.addRange(range)
      act(() => {
        document.dispatchEvent(new MouseEvent('mouseup'))
      })
      const bar = host.querySelector<HTMLElement>('[data-testid="selection-toolbar"]')
      if (bar === null) throw new Error('selection-toolbar 未挂载（划选驱动失败）')
      const highlight = (): HTMLButtonElement => {
        const b = Array.from(bar.querySelectorAll<HTMLButtonElement>('button')).find(
          (x) => x.textContent === '高亮'
        )
        if (b === undefined) throw new Error('高亮钮未找到')
        return b
      }
      setQuitClosing(true)
      await act(async () => {
        highlight().click()
        await vi.advanceTimersByTimeAsync(0)
      })
      expect(mocks.annoCreate).not.toHaveBeenCalled()
      expect(
        host.querySelector<HTMLElement>('[data-testid="selection-toolbar"]')
      ).not.toBeNull()
      setQuitClosing(false)
      mocks.annoCreate.mockResolvedValueOnce({
        ok: true as const,
        data: { ...makeAnnotation(''), id: 'anno-created', page: 0 }
      })
      await act(async () => {
        highlight().click()
        await vi.advanceTimersByTimeAsync(0)
      })
      expect(mocks.annoCreate).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
      rangeStub?.restore()
      page1.remove()
    }
  })
})
