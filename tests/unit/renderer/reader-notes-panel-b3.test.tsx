// @vitest-environment jsdom
/**
 * [F-UIRES-03 B3] ReaderNotesPanel 四态保存钮 + 卸载面 flush —— 组件级契约
 * （always-active，不经 guardedDescribe——INV-106 强制面）。
 *
 * 覆盖：四态钮（clean 禁用「已保存」/dirty 可点「保存」/saving 禁用 spinner
 * 「保存中」/error 可点「重试」）；点击=清防抖+立即落盘；error 点击重试载荷=
 * pending 合并态；卸载三族之关面板族（pending∧error 卸载→立即重试一次）与
 * 切文献族（saving∧pending 在途→flush 等在途完成后立即落盘）。切走切回/
 * 退出两族=notes-store-b3.test.ts（store 级）。
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

/** 动态装载：vi.resetModules 隔离 notes.store 模块级编辑元数据（flush 语义依赖
 *  pendingEdit/timer 干净起点——静态导入跨用例残留） */
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

/** 微任务多轮冲刷（flush 链=await 在途→回调→再派发，跨 4~6 个 tick） */
async function flushMicro(turns = 8): Promise<void> {
  for (let i = 0; i < turns; i++) {
    await Promise.resolve()
  }
}

/** React 受控输入的 jsdom 驱动法：原生 setter+input 事件 */
function typeInto(el: HTMLInputElement | HTMLTextAreaElement, text: string): void {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  setter?.call(el, text)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

function savedData(contentMd: string, updatedAt: string) {
  return { ok: true as const, data: { id: 'n-1', paperId: 'p-1', contentMd, createdAt: 't', updatedAt } }
}

/** 面板唯一按钮（annotations=[] 时片段节空态无钮——保存钮即唯一 button） */
function saveButton(): HTMLButtonElement {
  const btn = host?.querySelector('button') ?? null
  return btn as HTMLButtonElement
}

describe('F-UIRES-03 B3 ReaderNotesPanel 四态保存钮+卸载面', () => {
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

  it('四态钮全格：clean 禁用「已保存」→dirty 可点「保存」→saving 禁用「保存中」→error 可点「重试」', async () => {
    const { Panel, useReaderStore } = await loadPanel()
    useReaderStore.setState({ tabs: { 'p-1': makeTab('p-1') }, order: ['p-1'], activeId: 'p-1' })
    notesGet.mockResolvedValue({ ok: true, data: null })
    let rejectSave!: (e: Error) => void
    notesSave.mockImplementation(() => new Promise((_res, rej) => { rejectSave = rej }))
    mount(<Panel annotations={[]} onLocate={() => undefined} />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    // clean：灰暗禁用「已保存」
    const btn = saveButton()
    expect(btn.disabled).toBe(true)
    expect(btn.textContent).toBe('已保存')
    // [RR1 k1-W3] 状态播报通道：四态钮承载 aria-live=polite（原 role=status
    // span 随钮面文字合一退役——文本变化即 AT 播报；四态迁移↔钮文案一一对应）
    expect(btn.getAttribute('aria-live')).toBe('polite')

    // dirty：主色可点「保存」
    const body = host?.querySelector('textarea[aria-label="笔记正文"]') as HTMLTextAreaElement
    await act(async () => {
      typeInto(body, '草稿')
    })
    expect(btn.disabled).toBe(false)
    expect(btn.textContent).toBe('保存')

    // saving：禁用 spinner+「保存中」（⟳=共享 Button loading 态图标——textContent 含图标符）
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600)
    })
    expect(notesSave).toHaveBeenCalledTimes(1)
    expect(btn.disabled).toBe(true)
    expect(btn.textContent).toContain('保存中')
    expect(btn.querySelector('.animate-spin')).not.toBeNull()

    // error：红描边可点「重试」
    await act(async () => {
      rejectSave(new Error('保存失败'))
      await flushMicro()
    })
    expect(btn.disabled).toBe(false)
    expect(btn.textContent).toBe('重试')
    // [RR1 k1-N2] 无障碍名以可见文字「重试」开头（WCAG 2.5.3 label-in-name；
    // 兼保存失败原因播报——aria-label 覆盖播报文本）
    expect(btn.getAttribute('aria-label')).toBe('重试——上次保存失败')
  })

  it('点击=清防抖+立即落盘：dirty 态点击→未到 1.5s 即派发且 timer 清零', async () => {
    const { Panel, useReaderStore, useNotesStore } = await loadPanel()
    useReaderStore.setState({ tabs: { 'p-1': makeTab('p-1') }, order: ['p-1'], activeId: 'p-1' })
    notesGet.mockResolvedValue({ ok: true, data: null })
    notesSave.mockResolvedValue(savedData('草稿', 't2'))
    mount(<Panel annotations={[]} onLocate={() => undefined} />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    const body = host?.querySelector('textarea[aria-label="笔记正文"]') as HTMLTextAreaElement
    await act(async () => {
      typeInto(body, '草稿')
    })
    expect(vi.getTimerCount()).toBe(1) // 防抖在排

    await act(async () => {
      saveButton().dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(notesSave).toHaveBeenCalledTimes(1) // 立即落盘（未推进定时器）
    expect(notesSave.mock.calls[0]?.[0]).toMatchObject({ paperId: 'p-1', contentMd: '草稿' })
    expect(vi.getTimerCount()).toBe(0) // 点击先清防抖
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(useNotesStore.getState().noteByPaper['p-1']?.pending).toBe(false)
    expect(saveButton().textContent).toBe('已保存') // 落库后 clean
  })

  it('error 态点击→saving（载荷=pending 合并态——消费时点二）', async () => {
    const { Panel, useReaderStore, useNotesStore } = await loadPanel()
    useReaderStore.setState({ tabs: { 'p-1': makeTab('p-1') }, order: ['p-1'], activeId: 'p-1' })
    notesGet.mockResolvedValue({ ok: true, data: null })
    notesSave
      .mockImplementationOnce(async () => ({ ok: false as const, error: { code: 'E', message: '写盘失败' } }))
      .mockImplementationOnce(async () => savedData('草稿', 't3'))
    mount(<Panel annotations={[]} onLocate={() => undefined} />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    const body = host?.querySelector('textarea[aria-label="笔记正文"]') as HTMLTextAreaElement
    await act(async () => {
      typeInto(body, '草稿')
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600) // 防抖到期：失败→error
    })
    expect(saveButton().textContent).toBe('重试')

    await act(async () => {
      saveButton().dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(notesSave).toHaveBeenCalledTimes(2)
    expect(notesSave.mock.calls[1]?.[0]).toMatchObject({ paperId: 'p-1', contentMd: '草稿' }) // 合并态载荷
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(useNotesStore.getState().noteByPaper['p-1']?.pending).toBe(false) // 重试成功→clean
    expect(saveButton().textContent).toBe('已保存')
  })

  it('序列族·关面板：pending∧error 卸载→卸载前以 pending 合并态立即重试落盘一次', async () => {
    const { Panel, useReaderStore, useNotesStore } = await loadPanel()
    useReaderStore.setState({ tabs: { 'p-1': makeTab('p-1') }, order: ['p-1'], activeId: 'p-1' })
    notesGet.mockResolvedValue({ ok: true, data: null })
    notesSave
      .mockImplementationOnce(async () => ({ ok: false as const, error: { code: 'E', message: '写盘失败' } }))
      .mockImplementationOnce(async () => savedData('草稿', 't3'))
    mount(<Panel annotations={[]} onLocate={() => undefined} />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    const body = host?.querySelector('textarea[aria-label="笔记正文"]') as HTMLTextAreaElement
    await act(async () => {
      typeInto(body, '草稿')
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600) // error（无 timer、无在途）
    })
    expect(useNotesStore.getState().noteByPaper['p-1']?.saveFailed).toBe(true)
    expect(notesSave).toHaveBeenCalledTimes(1)

    act(() => {
      root?.unmount() // 关面板/组件卸载
    })
    root = null
    await act(async () => {
      await flushMicro()
    })
    // 卸载前立即重试一次（载荷=pending 合并态）
    expect(notesSave).toHaveBeenCalledTimes(2)
    expect(notesSave.mock.calls[1]?.[0]).toMatchObject({ paperId: 'p-1', contentMd: '草稿' })
    expect(useNotesStore.getState().noteByPaper['p-1']?.pending).toBe(false) // 重试成功
  })

  it('序列族·切文献：saving∧pending 在途→paperId 变化触发 flush（在途完成后立即落盘）', async () => {
    const { Panel, useReaderStore, useNotesStore } = await loadPanel()
    useReaderStore.setState({
      tabs: { 'p-1': makeTab('p-1'), 'p-2': makeTab('p-2') },
      order: ['p-1', 'p-2'],
      activeId: 'p-1'
    })
    notesGet.mockResolvedValue({ ok: true, data: null })
    let resolveFirst!: (v: unknown) => void
    notesSave
      .mockImplementationOnce(() => new Promise((r) => { resolveFirst = r }))
      .mockImplementationOnce(async () => savedData('第二次', 't3'))
    mount(<Panel annotations={[]} onLocate={() => undefined} />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    const body = host?.querySelector('textarea[aria-label="笔记正文"]') as HTMLTextAreaElement
    await act(async () => {
      typeInto(body, '第一次')
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600) // p-1 在途
    })
    await act(async () => {
      typeInto(body, '第二次') // saving∧pending（缓冲）
    })

    act(() => {
      useReaderStore.setState({ activeId: 'p-2' }) // 切文献（组件在、paperId 变）
    })
    await act(async () => {
      await flushMicro(3)
    })
    expect(notesSave).toHaveBeenCalledTimes(1) // 在途未完成不抢发

    await act(async () => {
      resolveFirst(savedData('第一次', 't2')) // 在途完成
      await flushMicro()
    })
    // 在途完成后立即（不等新防抖）以 pending 合并态落盘
    expect(notesSave).toHaveBeenCalledTimes(2)
    expect(notesSave.mock.calls[1]?.[0]).toMatchObject({ paperId: 'p-1', contentMd: '第二次' })
    expect(useNotesStore.getState().noteByPaper['p-1']?.pending).toBe(false)
  })
})
