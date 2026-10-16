// @vitest-environment jsdom
/**
 * [F-VISFB-13] ReaderNotesPanel 四态钮消费面增锚（新建，always-active——
 * 与 reader-notes-panel-b3.test.tsx 分件：b3 锁既有四态文案/点击即存/卸载
 * flush 面；本件锁 13 号新增面——A4 可见性〔saved 态语 sr-only〕+disabled
 * 不可操作〔clean 态 .click() 零派发〕+A5 消费方位〔保存钮与节标同头部行〕）。
 *
 * 动态装载形态对齐 b3（vi.resetModules 隔离 notes.store 模块级编辑元数据）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'
import { makeTab } from '../../utils/factories'

const stubApi = makeApiStub({ notes: { get: vi.fn(), save: vi.fn() } })
const notesGet = vi.fn()
stubApi.notes.get = notesGet
const notesSave = vi.fn()
stubApi.notes.save = notesSave

/** 动态装载：vi.resetModules 隔离 notes.store 模块级编辑元数据（b3 同形态） */
async function loadPanel() {
  vi.resetModules()
  const [panelMod, notesMod, readerMod] = await Promise.all([
    import('../../../src/renderer/features/reader/panels/ReaderNotesPanel'),
    import('../../../src/renderer/features/notes/notes.store'),
    import('../../../src/renderer/features/reader/state/reader.store')
  ])
  return {
    Panel: panelMod.ReaderNotesPanel,
    useNotesStore: notesMod.useNotesStore,
    useReaderStore: readerMod.useReaderStore
  }
}

let root: Root | null = null
let host: HTMLDivElement | null = null

function mount(node: JSX.Element): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(node)
  })
}

/** 面板保存钮（annotations=[] 时片段节空态无钮——保存钮即唯一 button，b3 同锚） */
function saveButton(): HTMLButtonElement {
  const btn = host?.querySelector('button') ?? null
  return btn as HTMLButtonElement
}

describe('F-VISFB-13 ReaderNotesPanel 四态钮消费面', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    act(() => {
      root?.unmount()
    })
    root = null
    host?.remove()
    host = null
    vi.useRealTimers()
  })

  it('A4+disabled 验收：clean 态「已保存」sr-only 零可见字样+.click() 零 saveNow 派发', async () => {
    const { Panel, useReaderStore } = await loadPanel()
    useReaderStore.setState({ tabs: { 'p-1': makeTab('p-1') }, order: ['p-1'], activeId: 'p-1' })
    notesGet.mockResolvedValue({ ok: true, data: null })
    notesSave.mockResolvedValue({ ok: true, data: { id: 'n-1', paperId: 'p-1', contentMd: '', createdAt: 't', updatedAt: 't' } })
    mount(<Panel annotations={[]} onLocate={() => undefined} />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    const btn = saveButton()
    expect(btn.disabled).toBe(true)
    const span = [...btn.querySelectorAll('span')].find((s) => s.textContent === '已保存')
    expect(span).toBeDefined()
    expect(span!.classList.contains('sr-only')).toBe(true)
    act(() => {
      btn.click()
    })
    expect(notesSave).not.toHaveBeenCalled()
  })

  it('A5 消费方位：保存钮与「全文笔记」节标同头部行（top-right 一致重排）', async () => {
    const { Panel, useReaderStore } = await loadPanel()
    useReaderStore.setState({ tabs: { 'p-1': makeTab('p-1') }, order: ['p-1'], activeId: 'p-1' })
    notesGet.mockResolvedValue({ ok: true, data: null })
    mount(<Panel annotations={[]} onLocate={() => undefined} />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    const title = [...host!.querySelectorAll('span')].find((s) => s.textContent === '全文笔记')
    expect(title).toBeDefined()
    expect(saveButton().closest('div')).toBe(title!.closest('div'))
  })
})
