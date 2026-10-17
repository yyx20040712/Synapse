// @vitest-environment jsdom
/**
 * [F-VISFB-63 回炉轮 1] 悬浮笔记草稿×切图打断族（拆件自
 * lineage-note-draft-flush.test.tsx——500 行红线，F-VISFB-44 拆件先例）。
 * always-active（不经 guardedDescribe）。
 *
 * 覆盖：
 * - 切图打断（nav-graph-picker folder onClick fire 前置——62 号 R2③ 族）：
 *   草稿入队+dirty 确认分支挂起（取消=草稿保留）；R6②「放弃修改」确认分支
 *   （草稿随队列全弃：queue 空+clean+图切换生效）；
 * - R1 folders.changed→load 卸载丢稿链（门一双源 B/W）：重取分支+S4 回退
 *   分支均「发起重载前收口+dirty 跳过」——status 不翻 loading（LineagePage
 *   loading 帧卸载子树=组件态消亡，互锁只护 store 数据不护组件态）；
 * - R3 quit ④ noteDraftPending 独立锚（无挂载句柄+store clean→stillDirty=true）；
 * - R4 fire 吞句柄同步 throw（pending 保真+调用方不炸——不阻路由承诺）；
 * - R6① saving→clean 后立刻 fire（视图离场）——靶心后半段跨格。
 * 模块态隔离：单例逐用例复位（unregister+pending 清）；folders.changed
 * 订阅捕获驱动（stubApiEvents 注入）；量测桩口径同主件（own 域）。
 */
import { makeApiStub, stubApiEvents } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  lineage: { graph: vi.fn(), upsertFloatingNote: vi.fn(), removeFloatingNote: vi.fn() },
  folders: { list: vi.fn() }
})
/** folders.changed 订阅捕获（R1 驱动面——重取/S4 两分支的事件入口） */
let foldersChangedCb: (() => void) | null = null
stubApiEvents({
  onFoldersChanged: (cb: () => void): (() => void) => {
    foldersChangedCb = cb
    return () => undefined
  }
})

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FloatingNote } from '../../../src/shared/models/lineage'
import { runQuitFlush } from '../../../src/renderer/app/quit-flush'
import { switchViewWithFlush } from '../../../src/renderer/app/view-flush'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import {
  noteDraftPending,
  registerNoteDraftFlush,
  setNoteDraftPending,
  unregisterNoteDraftFlush
} from '../../../src/renderer/features/lineage/lineage-note-draft'
import { LineageFloatingNotes } from '../../../src/renderer/features/lineage/LineageFloatingNotes'
import { NavGraphPicker } from '../../../src/renderer/features/lineage/nav-graph-picker'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

function makeNote(over: Partial<FloatingNote> = {}): FloatingNote {
  return {
    id: over.id ?? 'fn-1',
    folderId: '__main__',
    x: 100,
    y: 100,
    content: '基线',
    createdAt: 't0',
    updatedAt: 't0',
    ...over
  }
}

let root: Root | null = null
let host: HTMLDivElement | null = null
let contentEl: HTMLDivElement | null = null

function seedContentEl(): void {
  contentEl = document.createElement('div')
  contentEl.className = 'tl-content'
  host!.appendChild(contentEl)
  contentEl.getBoundingClientRect = () =>
    ({ left: 40, top: 20, right: 1040, bottom: 820, width: 1000, height: 800, x: 40, y: 20 }) as DOMRect
  Object.defineProperty(contentEl, 'offsetWidth', { value: 1000, configurable: true })
  Object.defineProperty(contentEl, 'offsetHeight', { value: 800, configurable: true })
}

/** picker+笔记层共挂（folders 含 __main__ → 无 S4 回退重 load——种子不被冲） */
function mountPickerWithNotes(): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  seedContentEl()
  root = createRoot(host)
  act(() => {
    root?.render(
      <>
        <NavGraphPicker />
        <LineageFloatingNotes contentRef={{ current: contentEl }} />
      </>
    )
  })
}

/** picker 单挂（S2——无笔记层=手动句柄不被桥覆盖） */
function mountPicker(): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(<NavGraphPicker />)
  })
}

/** 直挂组件面（R6①——无 picker 域） */
function mountNotes(): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  seedContentEl()
  root = createRoot(host)
  act(() => {
    root?.render(<LineageFloatingNotes contentRef={{ current: contentEl }} />)
  })
}

const state = () => useLineageStore.getState()
const settle = async (turns = 6): Promise<void> => {
  for (let i = 0; i < turns; i += 1) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}
const noteElOf = (id: string): HTMLElement | null => document.querySelector(`.tl-note[data-note-id="${id}"]`)
const pdown = (el: Element, clientX: number, clientY: number): void => {
  el.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, clientX, clientY }))
}
const typeInto = (ta: HTMLTextAreaElement, value: string): void => {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
  setter.call(ta, value)
  ta.dispatchEvent(new Event('input', { bubbles: true }))
}
/** 进编辑态并输入草稿（pdown 笔记本体 → textarea 打字） */
const editDraft = (id: string, text: string): void => {
  act(() => {
    pdown(noteElOf(id)!, 150, 150)
  })
  act(() => {
    typeInto(noteElOf(id)!.querySelector('textarea')! as HTMLTextAreaElement, text)
  })
}
const openPickerMenu = (): void => {
  act(() => {
    host!.querySelector('[data-testid="lineage-nav-graph"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}
const pickFolder = (id: string): void => {
  act(() => {
    host!
      .querySelector(`[data-testid="lineage-nav-graph-menu"] [data-folder-id="${id}"]`)!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}
const upsQueue = () => state().queue.filter((a) => a.kind === 'upsert-floating-note')
/** folders 两拉序（Once 队列——每次新数组引用驱动 [folders] effect） */
const seedFoldersTwoPulls = (
  first: Array<{ id: string; name: string }>,
  second: Array<{ id: string; name: string }>
): void => {
  stubApi.folders.list
    .mockResolvedValueOnce({ ok: true, data: first.map((f, i) => ({ ...f, position: i, paperCount: 0 })) })
    .mockResolvedValueOnce({ ok: true, data: second.map((f, i) => ({ ...f, position: i, paperCount: 0 })) })
}

beforeEach(() => {
  vi.clearAllMocks()
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.folders.list.mockReset()
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [], edges: [], floatingNotes: [] } })
  stubApi.lineage.upsertFloatingNote.mockImplementation(
    async (req: { id?: string; folderId: string; x: number; y: number; content: string }) =>
      ({ ok: true, data: makeNote({ id: req.id ?? 'fn-new', ...req, createdAt: 't0', updatedAt: 't1' }) })
  )
  stubApi.lineage.removeFloatingNote.mockResolvedValue({ ok: true, data: { ok: true } })
  stubApi.folders.list.mockResolvedValue({
    ok: true,
    data: [
      { id: '__main__', name: '主图', position: 0, paperCount: 0 },
      { id: 'f-2', name: '切换目标图', position: 1, paperCount: 0 }
    ]
  })
  useLineageStore.setState({
    nodes: [],
    edges: [],
    floatingNotes: [],
    lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'],
    status: 'ready',
    error: null,
    saveStatus: 'clean',
    lastWriteError: null,
    queue: [],
    flushing: false,
    undoStack: [],
    redoStack: [],
    folderId: '__main__'
  })
  useLineageViewStore.setState({ mode: 'edit', tool: 'select', zoom: 1 })
  unregisterNoteDraftFlush()
  setNoteDraftPending(false)
  foldersChangedCb = null
  document.documentElement.style.removeProperty('--ui-scale')
})

afterEach(async () => {
  await act(async () => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  contentEl = null
  unregisterNoteDraftFlush()
  setNoteDraftPending(false)
})

describe('切图打断（nav-graph-picker folder onClick fire 前置——62 号 R2③ 族）', () => {
  it('folder 点击：草稿入队+dirty 确认分支挂起+图未切；取消=草稿保留', async () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-p', content: '基线' })] })
    mountPickerWithNotes()
    await settle()
    editDraft('fn-p', '打断草稿')
    openPickerMenu()
    pickFolder('f-2')
    // fire 先行：草稿已入队（确认分支的「取消=保留」语义载体）
    expect(upsQueue()).toHaveLength(1)
    expect(upsQueue()[0]).toMatchObject({ input: { id: 'fn-p', content: '打断草稿' } })
    // dirty 确认分支挂起（fire 后最新态——非闭包旧值）+图未切
    expect(host!.querySelector('[role="dialog"]')).not.toBeNull()
    expect(host!.querySelector('[role="dialog"]')!.textContent).toContain('未保存的修改')
    expect(state().folderId).toBe('__main__')
    // 取消=留守：草稿已入队保留
    const cancel = Array.from(host!.querySelectorAll('button')).find((b) => b.textContent === '取消')
    act(() => {
      cancel!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(host!.querySelector('[role="dialog"]')).toBeNull()
    expect(state().floatingNotes[0]!.content).toBe('打断草稿')
    expect(upsQueue()).toHaveLength(1)
  })

  it('[R6②] picker「放弃修改」确认分支：草稿随队列全弃（queue 空+clean+图切换生效）', async () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-d', content: '基线' })] })
    mountPickerWithNotes()
    await settle()
    editDraft('fn-d', '待弃草稿')
    openPickerMenu()
    pickFolder('f-2')
    expect(host!.querySelector('[role="dialog"]')).not.toBeNull()
    act(() => {
      host!.querySelector('[data-testid="nav-graph-discard-confirm"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(state().queue).toHaveLength(0)
    expect(state().saveStatus).toBe('clean')
    expect(state().folderId).toBe('f-2')
  })
})

describe('回炉轮 1 —— folders.changed×草稿（R1：重载前收口+dirty 跳过）', () => {
  it('[R1①] 编辑中 folders.changed 重取序：草稿先入队+dirty 跳过 load——status 不翻 loading（不卸载子树）', async () => {
    seedFoldersTwoPulls(
      [
        { id: '__main__', name: '主图' },
        { id: 'f-2', name: '切换目标图' }
      ],
      [
        { id: '__main__', name: '主图' },
        { id: 'f-2', name: '切换目标图改' }
      ]
    )
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-c1', content: '基线' })] })
    mountPickerWithNotes()
    await settle()
    editDraft('fn-c1', 'changed 草稿')
    act(() => {
      foldersChangedCb!()
    })
    await settle()
    expect(upsQueue()).toHaveLength(1)
    expect(upsQueue()[0]).toMatchObject({ input: { id: 'fn-c1', content: 'changed 草稿' } })
    expect(state().status).toBe('ready')
    expect(stubApi.lineage.graph).not.toHaveBeenCalled()
    // [S5c] effect 收口后 pending 已清（fire 成功路径）
    expect(noteDraftPending()).toBe(false)
  })

  it('[R1②] S4 回退分支同序：fire 后 dirty 跳过 setFolder(MAIN) 回退——folderId 保持+status 不翻 loading', async () => {
    seedFoldersTwoPulls(
      [
        { id: 'f-gone', name: '将删图' },
        { id: 'f-2', name: '切换目标图' }
      ],
      [
        { id: '__main__', name: '主图' },
        { id: 'f-2', name: '切换目标图' }
      ]
    )
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-c2', content: '基线' })], folderId: 'f-gone' })
    mountPickerWithNotes()
    await settle()
    editDraft('fn-c2', 'S4 草稿')
    act(() => {
      foldersChangedCb!()
    })
    await settle()
    expect(upsQueue()).toHaveLength(1)
    expect(upsQueue()[0]).toMatchObject({ input: { id: 'fn-c2', content: 'S4 草稿' } })
    expect(state().folderId).toBe('f-gone')
    expect(state().status).toBe('ready')
    expect(stubApi.lineage.graph).not.toHaveBeenCalled()
    // [S5c] effect 收口后 pending 已清（fire 成功路径）
    expect(noteDraftPending()).toBe(false)
  })

  it('[S5a] 纯 dirty 无会话（fire no-op）：folders.changed 后 load 仍跳过——暂存图保留', async () => {
    seedFoldersTwoPulls(
      [
        { id: '__main__', name: '主图' },
        { id: 'f-2', name: '切换目标图' }
      ],
      [
        { id: '__main__', name: '主图' },
        { id: 'f-2', name: '切换目标图改' }
      ]
    )
    useLineageStore.setState({ queue: [{ kind: 'remove-edge', id: 'e-x' }], saveStatus: 'dirty' })
    mountPickerWithNotes()
    await settle()
    act(() => {
      foldersChangedCb!()
    })
    await settle()
    expect(state().status).toBe('ready')
    expect(stubApi.lineage.graph).not.toHaveBeenCalled()
    expect(state().queue).toHaveLength(1)
    expect(noteDraftPending()).toBe(false)
  })
})

describe('回炉轮 1 —— R3/R4/R6（④ 独立锚/fire 吞 throw/saving→clean→fire）', () => {
  it('[R3] ④ 独立锚：pending 真无挂载句柄+store clean → stillDirty=true（fire 无句柄不清 pending）', async () => {
    setNoteDraftPending(true)
    let stillDirty = false
    await act(async () => {
      stillDirty = await runQuitFlush()
    })
    expect(stillDirty).toBe(true)
    expect(noteDraftPending()).toBe(true)
  })

  it('[R4] 句柄同步 throw：pending 保真+调用方不炸（switchViewWithFlush 仍切走）', () => {
    registerNoteDraftFlush(() => {
      throw new Error('收口链炸')
    })
    setNoteDraftPending(true)
    const setView = vi.fn()
    expect(() =>
      act(() => {
        switchViewWithFlush('lineage', 'library', setView)
      })
    ).not.toThrow()
    expect(setView).toHaveBeenCalledWith('library')
    expect(noteDraftPending()).toBe(true)
  })

  it('[R6①] saving→clean 后立刻 fire（视图离场）：草稿收口入队+pending 清——靶心后半段跨格', () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-r6', content: '基线' })] })
    mountNotes()
    editDraft('fn-r6', '跨窗终稿')
    act(() => {
      useLineageStore.setState({ flushing: true, saveStatus: 'saving' })
    })
    expect(noteDraftPending()).toBe(true)
    act(() => {
      useLineageStore.setState({ flushing: false, saveStatus: 'clean' })
    })
    act(() => {
      switchViewWithFlush('lineage', 'library', vi.fn())
    })
    expect(upsQueue()).toHaveLength(1)
    expect(upsQueue()[0]).toMatchObject({ input: { id: 'fn-r6', content: '跨窗终稿' } })
    expect(state().floatingNotes[0]!.content).toBe('跨窗终稿')
    expect(noteDraftPending()).toBe(false)
  })

  it('[S2] fire throw 后 pending 保真×picker 守卫：folders.changed 不发起 load+pending 仍真+组件未卸载', async () => {
    // view-flush 路径 throw 残余=声明边界：unmount 后 cleanup 清 pending——
    // 现网无可达 throw 源（commitRef 链同步 store 写），防御纵深
    seedFoldersTwoPulls([{ id: '__main__', name: '主图' }], [{ id: '__main__', name: '主图改' }])
    registerNoteDraftFlush(() => {
      throw new Error('收口链炸')
    })
    setNoteDraftPending(true)
    mountPicker()
    await settle()
    act(() => {
      foldersChangedCb!()
    })
    await settle()
    expect(stubApi.lineage.graph).not.toHaveBeenCalled()
    expect(state().status).toBe('ready')
    expect(noteDraftPending()).toBe(true)
    expect(host!.querySelector('[data-testid="lineage-nav-graph"]')).not.toBeNull()
  })
})
