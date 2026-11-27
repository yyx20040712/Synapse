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
/** B6 后面板只承载 IO/U 文字态；保存动作统一由工具栏/Ctrl+S 承接 */
function savedText(): string {
  return host?.querySelector('[aria-live="polite"]')?.textContent ?? ''
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

  it('A4 文字态与无钮负锚：clean「已保存」在场；局部保存动作不存在', async () => {
    const { Panel, useReaderStore } = await loadPanel()
    useReaderStore.setState({ tabs: { 'p-1': makeTab('p-1') }, order: ['p-1'], activeId: 'p-1' })
    notesGet.mockResolvedValue({ ok: true, data: null })
    notesSave.mockResolvedValue({ ok: true, data: { id: 'n-1', paperId: 'p-1', contentMd: '', createdAt: 't', updatedAt: 't' } })
    mount(<Panel annotations={[]} onLocate={() => undefined} />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(savedText()).toBe('已保存')
    expect(host?.querySelector('button')).toBeNull()
    expect(notesSave).not.toHaveBeenCalled()
  })

  it('A5 消费方位：IO/U 文字态与「全文笔记」节标同头部行', async () => {
    const { Panel, useReaderStore } = await loadPanel()
    useReaderStore.setState({ tabs: { 'p-1': makeTab('p-1') }, order: ['p-1'], activeId: 'p-1' })
    notesGet.mockResolvedValue({ ok: true, data: null })
    mount(<Panel annotations={[]} onLocate={() => undefined} />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    const title = [...host!.querySelectorAll('span')].find((s) => s.textContent === '全文笔记')
    expect(title).toBeDefined()
    expect(host?.querySelector('[aria-live="polite"]')?.closest('div')).toBe(title!.closest('div'))
  })
})
