// @vitest-environment jsdom
/**
 * [F-VISFB-65 回炉 R5] 冻结期编辑器门——LineageFloatingNotes interactive 面
 * 挂 recovery 门：冻结期不开编辑器；已开编辑会话跨冻结窗草稿不丢（组件态
 * 保留——quit 门同款「拒绝而非静默丢」语义）。createRoot/act 惯例。
 * always-active。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  recovery: { peek: vi.fn(), save: vi.fn(), read: vi.fn(), release: vi.fn() },
  lineage: {
    graph: vi.fn(),
    patchNode: vi.fn(),
    removeNode: vi.fn(),
    upsertEdge: vi.fn(),
    removeEdge: vi.fn(),
    upsertLineTypes: vi.fn(),
    upsertFloatingNote: vi.fn(),
    removeFloatingNote: vi.fn()
  }
})

import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { LineageFloatingNotes } from '../../../src/renderer/features/lineage/LineageFloatingNotes'
import {
  enterWorkspaceRecovery,
  initRecoveryScheduler,
  resetRecoveryScheduler
} from '../../../src/renderer/features/lineage/recoveryScheduler'
import { noteDraftSnapshot, setNoteDraftSnapshot, stashRestoreDraft } from '../../../src/renderer/features/lineage/lineage-note-draft'
import type { FloatingNote } from '@shared/models/lineage'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const NOTE: FloatingNote = { id: 'fn-1', folderId: '__main__', x: 100, y: 100, content: '底稿', createdAt: 't', updatedAt: 't' }

let root: Root | null = null
let host: HTMLDivElement | null = null
let contentEl: HTMLDivElement | null = null

function mountNotes(): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  contentEl = document.createElement('div')
  contentEl.className = 'tl-content'
  host.appendChild(contentEl)
  contentEl.getBoundingClientRect = () =>
    ({ left: 40, top: 20, right: 1040, bottom: 820, width: 1000, height: 800, x: 40, y: 20 }) as DOMRect
  Object.defineProperty(contentEl, 'offsetWidth', { value: 1000, configurable: true })
  Object.defineProperty(contentEl, 'offsetHeight', { value: 800, configurable: true })
  root = createRoot(host)
  act(() => {
    root?.render(<LineageFloatingNotes contentRef={{ current: contentEl }} />)
  })
}

const settle = async (turns = 6): Promise<void> => {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}

beforeEach(async () => {
  vi.clearAllMocks()
  resetRecoveryScheduler()
  setNoteDraftSnapshot(null)
  stubApi.recovery.peek.mockResolvedValue({
    ok: true,
    data: { slots: { 'lineage-session': { status: 'empty', epoch: 0 } } }
  })
  stubApi.recovery.save.mockResolvedValue({ ok: true, data: { status: 'saved', token: 't', epoch: 0 } })
  initRecoveryScheduler({
    workspaceId: () => 'ws-1',
    snapshot: () => null,
    loadPayload: () => undefined,
    onRestored: () => undefined,
    openLineageView: () => undefined,
    discardLoadedSession: () => undefined
  })
  useLineageStore.setState({
    floatingNotes: [NOTE],
    saveStatus: 'clean',
    queue: [],
    flushing: false,
    undoStack: [],
    redoStack: [],
    folderId: '__main__',
    needsReload: false,
    status: 'ready'
  })
  useLineageViewStore.setState({ mode: 'edit', focusSet: [], navCollapsed: false, navWidth: 208 })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  resetRecoveryScheduler()
  setNoteDraftSnapshot(null)
  host?.remove()
  root = null
  host = null
})

const openEditor = (): void => {
  act(() => {
    const note = document.querySelector('.tl-note') as HTMLElement
    note.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 150, clientY: 150 }))
  })
}

describe('R5 冻结期编辑器门（recoveryBlocked 挂 interactive）', () => {
  it('冻结期（装配未开门）不开编辑器：edit+select 下无 textarea；开门后可开', async () => {
    mountNotes()
    openEditor()
    expect(document.querySelector('.tl-note-input')).toBeNull() // 冻结——交互门拒
    expect(document.querySelector('.tl-note-text')!.textContent).toBe('底稿') // 只读面在
    await act(async () => {
      await enterWorkspaceRecovery() // peek 空（beforeEach 桩）→开门
      await settle()
    })
    openEditor()
    expect(document.querySelector('.tl-note-input')).not.toBeNull() // 开门后可编辑
  })

  it('已开编辑会话跨冻结窗：草稿保留不静默丢（解冻后 textarea 重现同值）', async () => {
    mountNotes()
    await act(async () => {
      await enterWorkspaceRecovery()
      await settle()
    })
    openEditor()
    const input = document.querySelector('.tl-note-input') as HTMLTextAreaElement
    expect(input).not.toBeNull()
    await act(async () => {
      // React 受控输入：原型 setter（绕 value tracker——直赋值被吞）
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
      setter.call(input, '冻结窗草稿')
      input.dispatchEvent(new Event('input', { bubbles: true }))
      await settle()
    })
    expect((document.querySelector('.tl-note-input') as HTMLTextAreaElement).value).toBe('冻结窗草稿')
    // 再冻结（peek 在途=checking）——textarea 让位只读，组件态保留
    let resolvePeek: (v: unknown) => void = () => undefined
    stubApi.recovery.peek.mockReturnValue(new Promise((r) => (resolvePeek = r)) as never)
    await act(async () => {
      void enterWorkspaceRecovery()
      await settle()
    })
    expect(document.querySelector('.tl-note-input')).toBeNull()
    await act(async () => {
      resolvePeek({ ok: true, data: { slots: { 'lineage-session': { status: 'empty', epoch: 0 } } } })
      await settle()
    })
    const revived = document.querySelector('.tl-note-input') as HTMLTextAreaElement
    expect(revived).not.toBeNull()
    expect(revived.value).toBe('冻结窗草稿') // 不静默丢（R5 主锚）
  })
})

describe('d1-W1 冻结期卸载残留快照页内再水化（主控亲笔）', () => {
  it('残留快照在场笔记：重挂载即再水化（冻结期让位只读——解冻后 textarea 重现正文）', async () => {
    act(() => {
      setNoteDraftSnapshot({ noteId: 'fn-1', text: '残留正文' })
    })
    mountNotes()
    await act(async () => {
      await settle()
    })
    expect(document.querySelector('.tl-note-input')).toBeNull() // 冻结期让位只读（R5 语义）
    await act(async () => {
      await enterWorkspaceRecovery() // peek 空（beforeEach 桩）→开门
      await settle()
    })
    const input = document.querySelector('.tl-note-input') as HTMLTextAreaElement
    expect(input).not.toBeNull() // 无再水化=快照被挂载信号效应清掉（红）
    expect(input.value).toBe('残留正文')
  })

  it('残留快照死笔记 id（gate 开）：走新笔记草稿路径——内容入新建+编辑器', async () => {
    await act(async () => {
      await enterWorkspaceRecovery() // peek 空（beforeEach 桩）→开门（enqueue 可入队）
      await settle()
    })
    act(() => {
      setNoteDraftSnapshot({ noteId: 'gone-1', text: '孤儿正文' })
    })
    mountNotes()
    await act(async () => {
      await settle()
    })
    const notes = useLineageStore.getState().floatingNotes
    expect(notes.length).toBe(2) // createNewNote 新建（无再水化=0——红）
    expect(notes[notes.length - 1]!.content).toBe('孤儿正文')
    const input = document.querySelector('.tl-note-input') as HTMLTextAreaElement
    expect(input).not.toBeNull()
    expect(input.value).toBe('孤儿正文')
  })

  it('B-ADJ-1 格①：冻结+死 id+零既有笔记——快照保真不清（创建被门拒不消费）', async () => {
    act(() => {
      // 冻结窗（未开门）——addFloatingNote 被 beginUnit 拒
      setNoteDraftSnapshot({ noteId: 'gone-1', text: '孤儿正文' })
    })
    mountNotes()
    await act(async () => {
      await settle()
    })
    // 无既有笔记可挂错（before=1 fn-1 在场——本格另测零既有）：先清空在场笔记
    act(() => {
      useLineageStore.setState({ floatingNotes: [] })
    })
    await act(async () => {
      await settle()
    })
    expect(noteDraftSnapshot()).toEqual({ noteId: 'gone-1', text: '孤儿正文' }) // 消费即清=丢稿（红）
    expect(useLineageStore.getState().floatingNotes.length).toBe(0) // 未误建
    // 解冻后重建成立+消费
    await act(async () => {
      await enterWorkspaceRecovery()
      await settle()
    })
    const notes = useLineageStore.getState().floatingNotes
    expect(notes.length).toBe(1)
    expect(notes[0]!.content).toBe('孤儿正文')
    expect(noteDraftSnapshot()).toBeNull() // 重建成功且 draft==content——信号效应正确归零（非未收口态）
  })

  it('B-ADJ-1 格②：冻结+死 id+已有其他笔记——不开错编辑器（.at(-1) 误挂守卫）', async () => {
    act(() => {
      setNoteDraftSnapshot({ noteId: 'gone-1', text: '孤儿正文' })
    })
    mountNotes() // fn-1 在场；冻结未开门
    await act(async () => {
      await settle()
    })
    expect(noteDraftSnapshot()).toEqual({ noteId: 'gone-1', text: '孤儿正文' }) // 保真（红）
    const input = document.querySelector('.tl-note-input') as HTMLTextAreaElement
    expect(input).toBeNull() // 不得把孤儿正文挂到 fn-1 编辑器（红——旧 .at(-1) 会开）
    expect(useLineageStore.getState().floatingNotes[0]!.content).toBe('底稿') // fn-1 未被污染
  })
})

describe('k1-B1 残留分支甄别（正常收口不复活）+W-1 stash 移交', () => {
  const typeText = async (input: HTMLTextAreaElement, text: string): Promise<void> => {
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
      setter.call(input, text)
      input.dispatchEvent(new Event('input', { bubbles: true }))
      await settle()
    })
  }
  const blurInput = async (input: HTMLTextAreaElement): Promise<void> => {
    await act(async () => {
      input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
      await settle()
    })
  }

  it('正常 blur 收口：一次 blur 即关编辑器（不复活）+正文更新', async () => {
    await act(async () => {
      await enterWorkspaceRecovery() // 开门
      await settle()
    })
    mountNotes()
    openEditor()
    const input = document.querySelector('.tl-note-input') as HTMLTextAreaElement
    expect(input).not.toBeNull()
    await typeText(input, '新正文')
    await blurInput(input)
    expect(document.querySelector('.tl-note-input')).toBeNull() // 复活=红（B-1 主锚）
    expect(document.querySelector('.tl-note-text')!.textContent).toBe('新正文')
  })

  it('空稿 blur 回收：笔记删除且无幻影重建', async () => {
    await act(async () => {
      await enterWorkspaceRecovery()
      await settle()
    })
    mountNotes()
    openEditor()
    const input = document.querySelector('.tl-note-input') as HTMLTextAreaElement
    await typeText(input, '')
    await blurInput(input)
    expect(useLineageStore.getState().floatingNotes.length).toBe(0) // 回收（幻影重建=1 红）
    expect(document.querySelector('.tl-note-input')).toBeNull()
  })

  it('W-1：stash asNewNote 消费撞 flushing 拒——移交快照保真（非静默丢）', async () => {
    await act(async () => {
      await enterWorkspaceRecovery() // 开门
      useLineageStore.setState({ flushing: true }) // beginUnit saving 拒窗
      stashRestoreDraft({ noteId: 'gone-9', text: '计划稿', asNewNote: true })
      await settle()
    })
    mountNotes()
    await act(async () => {
      await settle()
    })
    expect(useLineageStore.getState().floatingNotes.length).toBe(1) // 未建（fn-1 原有）
    expect(noteDraftSnapshot()).toEqual({ noteId: 'gone-9', text: '计划稿' }) // 移交承载（静默丢=null 红）
    act(() => {
      // 解除 saving 窗+轻推 notes 身份（flushing 非组件订阅面——真实链路 flush
      // 完结必动 store 触发重渲染，此处等价模拟该重渲染驱动效应重跑）
      const notes = useLineageStore.getState().floatingNotes
      useLineageStore.setState({ flushing: false, floatingNotes: [...notes] })
    })
    await act(async () => {
      await settle()
    })
    const notes = useLineageStore.getState().floatingNotes
    expect(notes.length).toBe(2) // 残留分支重试建立
    expect(notes[notes.length - 1]!.content).toBe('计划稿')
  })
})
