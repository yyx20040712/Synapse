// @vitest-environment jsdom
/**
 * [B4-A R1 §3/§4.2] 总评（paper-note）文本受控历史 —— ReaderNotesPanel 组件测试
 * （新建，always-active；§12.2 notes.store 行「总评文本历史、保存后 undo、idle
 * 不清 redo」与 ReaderNotesPanel 行「接共享文本控制器」的组件级合约）。
 *
 * 总评只有文本值层（不伪造 annotation 操作项）；与批注 comment 共用同一文本
 * 控制器（单元边界/1.5s/深度 10 同一套），草稿镜像写回 notes.store，落库经
 * notes.store.persistNow（写体入 per-tab lane）。锁：
 * - 输入→空闲提交→undo→redo（textarea 真实值；反向写经 notes.save）；
 * - 显式保存（ctrl+s）后：redo 清、undo 仍有效；
 * - idle-flush/落库回显不清 redo；
 * - 空格边界与批注面同语义；
 * - flush-then-undo：反向写排在在途写之后（per-tab lane——调用序=在途值→反向值）；
 * - 离场（切 tab）先关闭单元并 fire flush（不等空闲计时）；
 * - 控制器值即 notes.store 草稿镜像（pending 镜像随之置位）；
 * - [B4-A 回炉 R5] history 在途窗内的新输入不被反向值覆盖（§2.5 #16b——基线红证=
 *   仓外 b4a-rework2/baseline-probes.log：旧接线先 mirror 反向值进 store，面板同步把
 *   显示值打成反向值）：写序=在途值→反向值→新值，显示值保留，离场后 DB 终值=新值；
 * - [B4-A 回炉 R5] 反向写失败：反向值不本地应用（显示值/草稿不动、redo 不出现——
 *   §3「失败两栈不变」）；无待写草稿时不置 saveFailed（否则定稿/关闭的重试恒
 *   no-op），错误经 toast 可见；有待写草稿（在途窗内新输入）时置 saveFailed；
 * - [B4-A 回炉 R5] 窗内新输入未 blur：反向写后 store 保未保存标记，新值由控制器
 *   空闲计时落库（不被「草稿已在库」零写吞掉）；
 * - [B4-A 回炉 R5] 回执晚于离场（无新输入）：离场后仍采纳已落库的反向值进宿主草稿
 *   （不打未保存标记）——返回该篇时 load 不走合并补存、不把旧草稿回写覆盖反向值。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, toastSpy } from '../../utils/api-client-mock'
import { makeTab } from '../../utils/factories'
import { IDLE_FLUSH_MS } from '../../../src/shared/constants'

const stubApi = makeApiStub({ notes: { get: vi.fn(), save: vi.fn() } })
const notesGet = vi.fn()
stubApi.notes.get = notesGet
const notesSave = vi.fn()
stubApi.notes.save = notesSave

import { ReaderNotesPanel } from '../../../src/renderer/features/reader/panels/ReaderNotesPanel'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import { useNotesStore } from '../../../src/renderer/features/notes/notes.store'
import { clearAllTextHistory } from '../../../src/renderer/features/reader/state/reader-text-history'
import { enqueueTabTask, resetTabLanes } from '../../../src/renderer/shared/tab-write-lane'
import { tabFlushError } from '../../../src/renderer/features/reader/state/reader-close-tab'

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

function body(): HTMLTextAreaElement {
  return host!.querySelector('textarea[aria-label="笔记正文"]') as HTMLTextAreaElement
}

function typeInto(text: string): void {
  const el = body()
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
  act(() => {
    setter?.call(el, text)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function press(init: KeyboardEventInit): KeyboardEvent {
  const ev = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
  act(() => {
    body().dispatchEvent(ev)
  })
  return ev
}

/** 冲微任务到链终态（undo/redo=关闭单元→drain→反向写→成功移栈） */
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

const noteData = (contentMd: string, updatedAt: string) => ({
  ok: true as const,
  data: { id: 'n-1', paperId: 'p-1', contentMd, createdAt: 't', updatedAt }
})

const undo = async (): Promise<void> => {
  press({ key: 'z', ctrlKey: true })
  await settle()
}

const redo = async (): Promise<void> => {
  press({ key: 'y', ctrlKey: true })
  await settle()
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  notesSave.mockResolvedValue(noteData('', 't2'))
  useReaderStore.setState({
    tabs: { 'p-1': makeTab('p-1'), 'p-2': makeTab('p-2') },
    order: ['p-1', 'p-2'],
    activeId: 'p-1'
  })
  useNotesStore.setState({ noteByPaper: {} })
  clearAllTextHistory()
  resetTabLanes()
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
  resetTabLanes()
  clearAllTextHistory()
})

async function mountLoaded(): Promise<void> {
  notesGet.mockResolvedValue({ ok: true, data: null })
  mount(<ReaderNotesPanel annotations={[]} onLocate={() => undefined} />)
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0)
  })
  expect(body().value).toBe('')
}

describe('B4-A R1 总评文本历史 —— ReaderNotesPanel（共享文本控制器）', () => {
  it('输入→空闲提交→undo→redo：textarea 真实值回退/复原，反向写经 notes.save', async () => {
    await mountLoaded()
    typeInto('总评')
    await idle()
    expect(notesSave).toHaveBeenCalledTimes(1)
    expect(notesSave.mock.calls[0]?.[0]).toMatchObject({ paperId: 'p-1', contentMd: '总评' })
    await undo()
    expect(body().value).toBe('')
    await redo()
    expect(body().value).toBe('总评')
    // 反向写与重做各落库一发
    expect(notesSave.mock.calls.map((c) => c[0]?.contentMd)).toEqual(['总评', '', '总评'])
  })

  it('显式保存（ctrl+s）后：redo 清、undo 仍有效（保存后可撤销已落库修改）', async () => {
    await mountLoaded()
    typeInto('甲')
    await idle()
    await undo()
    expect(body().value).toBe('')
    const saved = press({ key: 's', ctrlKey: true })
    expect(saved.defaultPrevented).toBe(true)
    await settle()
    // 定稿清 redo：重做不再可用（值不动）
    await redo()
    expect(body().value).toBe('')
    // 定稿后的新输入：undo 仍有效
    typeInto('乙')
    await idle()
    await undo()
    expect(body().value).toBe('')
  })

  it('idle-flush/落库回显不清 redo：undo 后多轮空闲仍可重做', async () => {
    await mountLoaded()
    typeInto('a')
    await idle()
    await undo()
    expect(body().value).toBe('')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3 * IDLE_FLUSH_MS)
    })
    await redo()
    expect(body().value).toBe('a')
  })

  it('空格边界与批注面同语义：空格并入当前单元后关闭——undo 逐步经「a 」回「」', async () => {
    await mountLoaded()
    typeInto('a')
    typeInto('a ')
    typeInto('a b')
    await idle()
    await undo()
    expect(body().value).toBe('a ')
    await undo()
    expect(body().value).toBe('')
  })

  it('控制器值即 notes.store 草稿镜像：输入即写回（pending 置位），落库后清', async () => {
    await mountLoaded()
    typeInto('镜像')
    expect(useNotesStore.getState().noteByPaper['p-1']?.contentMd).toBe('镜像')
    expect(useNotesStore.getState().noteByPaper['p-1']?.pending).toBe(true)
    await idle()
    expect(useNotesStore.getState().noteByPaper['p-1']?.pending).toBe(false)
  })

  it('flush-then-undo：反向写排在在途写之后（per-tab lane）——调用序=在途值→反向值', async () => {
    notesGet.mockResolvedValue({ ok: true, data: { ...noteData('原文', 't0').data } })
    mount(<ReaderNotesPanel annotations={[]} onLocate={() => undefined} />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(body().value).toBe('原文')
    let release!: (v: unknown) => void
    notesSave.mockImplementationOnce(() => new Promise((r) => { release = r }))
    typeInto('改后')
    await idle()
    expect(notesSave).toHaveBeenCalledTimes(1)
    await undo()
    // 在途写未落定：零反向写、值不动
    expect(notesSave).toHaveBeenCalledTimes(1)
    expect(body().value).toBe('改后')
    await act(async () => {
      release(noteData('改后', 't1'))
      await settle()
    })
    expect(notesSave.mock.calls.map((c) => c[0]?.contentMd)).toEqual(['改后', '原文'])
    expect(body().value).toBe('原文')
  })

  it('离场（切 tab）先关闭单元并 fire flush：窗内值不等空闲计时即落库', async () => {
    await mountLoaded()
    notesGet.mockResolvedValue({ ok: true, data: null })
    typeInto('离开前')
    expect(notesSave).not.toHaveBeenCalled()
    act(() => {
      useReaderStore.setState({ activeId: 'p-2' })
    })
    await settle()
    expect(notesSave).toHaveBeenCalledWith({ paperId: 'p-1', contentMd: '离开前' })
  })

  it('IME 组词整段一步（总评同控制器）：组词期片段不成步，end 后一步回退整段', async () => {
    await mountLoaded()
    act(() => {
      body().dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    })
    typeInto('我是')
    typeInto('我是奶龙')
    // 组词期一步 undo 不打断（片段不成步——值不动）
    await undo()
    expect(body().value).toBe('我是奶龙')
    act(() => {
      body().dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))
    })
    await undo()
    expect(body().value).toBe('')
  })

  it('[B4-A 回炉 R5] history 在途窗内的新输入不被反向值覆盖：写序=在途值→反向值→新值，离场后 DB 终值=新值', async () => {
    let db = '(未写)'
    const order: string[] = []
    let releaseReverse!: (v: unknown) => void
    const reverse = new Promise((r) => {
      releaseReverse = r
    })
    notesSave.mockImplementation((arg: { contentMd: string }) => {
      order.push(arg.contentMd)
      // 反向写（空串）回执挂起到切 tab 离场之后
      if (arg.contentMd === '' && order.length > 1) return reverse
      db = arg.contentMd
      return Promise.resolve(noteData(arg.contentMd, 't'))
    })
    await mountLoaded()
    typeInto('a')
    await idle()
    expect(db).toBe('a')

    // 旧 lane 任务阻塞写链（history 命令起步时已在链）
    let releaseBlocker!: () => void
    void enqueueTabTask('p-1', () => new Promise<void>((r) => { releaseBlocker = r }))
    press({ key: 'z', ctrlKey: true })
    await act(async () => {
      for (let i = 0; i < 5; i++) await Promise.resolve()
    })
    // 在途窗：输入 y 并 blur（新值的普通写入链）
    typeInto('y')
    await act(async () => {
      body().focus()
      body().blur()
      await Promise.resolve()
    })
    releaseBlocker()
    await settle()
    // 反向写已派发未回执：显示值仍是新输入，不被反向值覆盖
    expect(order).toEqual(['a', ''])
    expect(body().value).toBe('y')

    // 切目标：active tab 换篇（总评面板卸载 → closeout+dispose），回执未到
    act(() => {
      useReaderStore.setState({ activeId: 'p-2' })
    })
    releaseReverse(noteData('', 't'))
    await settle()
    await idle()
    await settle()
    expect(order).toEqual(['a', '', 'y'])
    expect(db).toBe('y')
    expect(useNotesStore.getState().noteByPaper['p-1']?.contentMd).toBe('y')
    expect(useNotesStore.getState().noteByPaper['p-1']?.pending).toBe(false)
  })

  it('[B4-A 回炉 R5] 反向写失败（无待写草稿）：反向值不本地应用、不置不可重试的错误态、toast 可见', async () => {
    let db = '(未写)'
    notesSave.mockImplementation((arg: { contentMd: string }) => {
      // 空闲落库成功；反向写（第二发）失败
      if (db !== '(未写)' && db !== '') {
        return Promise.resolve({ ok: false as const, error: { code: 'E', message: '写盘失败' } })
      }
      db = arg.contentMd
      return Promise.resolve(noteData(arg.contentMd, 't'))
    })
    await mountLoaded()
    typeInto('总评')
    await idle()
    expect(db).toBe('总评')
    await undo()
    // 失败两栈不动：值不变、仍可 undo、redo 不出现
    expect(body().value).toBe('总评')
    expect(useNotesStore.getState().noteByPaper['p-1']?.contentMd).toBe('总评')
    // 无待写草稿：不置 saveFailed——查态单源判无 IO 错误（定稿/关闭的重试有物可写才成立）
    expect(useNotesStore.getState().noteByPaper['p-1']?.saveFailed).toBe(false)
    expect(tabFlushError('p-1')).toBeNull()
    expect(toastSpy).toHaveBeenCalledWith('笔记保存失败，撤销/重做未生效', 'error')
    await redo()
    expect(body().value).toBe('总评')
    // 恢复后重试：同一步 undo 成功
    notesSave.mockImplementation((arg: { contentMd: string }) => {
      db = arg.contentMd
      return Promise.resolve(noteData(arg.contentMd, 't'))
    })
    await undo()
    expect(body().value).toBe('')
    expect(notesSave.mock.calls.map((c) => c[0]?.contentMd)).toEqual(['总评', '', ''])
    expect(useNotesStore.getState().noteByPaper['p-1']?.pending).toBe(false)
  })

  it('[B4-A 回炉 R5] 窗内新输入未 blur：反向写后 store 保未保存标记，新值由控制器空闲计时落库', async () => {
    let db = '(未写)'
    const order: string[] = []
    notesSave.mockImplementation((arg: { contentMd: string }) => {
      order.push(arg.contentMd)
      db = arg.contentMd
      return Promise.resolve(noteData(arg.contentMd, 't'))
    })
    await mountLoaded()
    typeInto('a')
    await idle()
    expect(db).toBe('a')
    let releaseBlocker!: () => void
    void enqueueTabTask('p-1', () => new Promise<void>((r) => { releaseBlocker = r }))
    press({ key: 'z', ctrlKey: true })
    await act(async () => {
      for (let i = 0; i < 5; i++) await Promise.resolve()
    })
    typeInto('y') // 未 blur：新值只由空闲计时落库
    releaseBlocker()
    await settle()
    // 反向写已落库；新值未写——store 仍标未保存（承接后续落库）
    expect(order).toEqual(['a', ''])
    expect(db).toBe('')
    expect(body().value).toBe('y')
    expect(useNotesStore.getState().noteByPaper['p-1']?.pending).toBe(true)
    await idle()
    expect(order).toEqual(['a', '', 'y'])
    expect(db).toBe('y')
    expect(useNotesStore.getState().noteByPaper['p-1']?.pending).toBe(false)
  })

  it('[B4-A 回炉 R5] 回执晚于切 tab 离场（无新输入）：离场后仍采纳已落库反向值——返回该篇不回写旧草稿', async () => {
    let db = '(未写)'
    const calls: string[] = []
    notesSave.mockImplementation((arg: { contentMd: string }) => {
      calls.push(arg.contentMd)
      db = arg.contentMd
      return Promise.resolve(noteData(arg.contentMd, 't'))
    })
    await mountLoaded()
    typeInto('a')
    await idle()
    expect(db).toBe('a')
    let releaseBlocker!: () => void
    void enqueueTabTask('p-1', () => new Promise<void>((r) => { releaseBlocker = r }))
    press({ key: 'z', ctrlKey: true })
    await act(async () => {
      for (let i = 0; i < 5; i++) await Promise.resolve()
    })
    // 回执未到即切目标离场
    act(() => {
      useReaderStore.setState({ activeId: 'p-2' })
    })
    releaseBlocker()
    await settle()
    await idle()
    await settle()
    expect(db).toBe('')
    expect(useNotesStore.getState().noteByPaper['p-1']).toMatchObject({ contentMd: '', pending: false })
    // 返回该篇：load 不走合并补存（旧草稿未被标未保存）——不回写覆盖反向值
    act(() => {
      useReaderStore.setState({ activeId: 'p-1' })
    })
    await settle()
    await idle()
    await settle()
    expect(body().value).toBe('')
    expect(calls).toEqual(['a', ''])
    expect(db).toBe('')
  })

  it('[B4-A 回炉 R5] 反向写在途窗内新输入且反向写失败：新输入保未保存标记+错误态（重试有物可写），落库后清除', async () => {
    let db = '(未写)'
    let rejectReverse!: (e: unknown) => void
    notesSave.mockImplementation((arg: { contentMd: string }) => {
      // 反向写（库值仍为 a 时的空串写）挂起后失败；其余即落
      if (arg.contentMd === '' && db === 'a') {
        return new Promise((_resolve, reject) => {
          rejectReverse = reject
        })
      }
      db = arg.contentMd
      return Promise.resolve(noteData(arg.contentMd, 't'))
    })
    await mountLoaded()
    typeInto('a')
    await idle()
    expect(db).toBe('a')
    press({ key: 'z', ctrlKey: true })
    await settle() // 反向写在途
    typeInto('y') // 在途窗内新输入（未 blur）
    rejectReverse(new Error('写盘失败'))
    await settle()
    expect(body().value).toBe('y')
    expect(useNotesStore.getState().noteByPaper['p-1']).toMatchObject({
      contentMd: 'y',
      pending: true,
      saveFailed: true
    })
    expect(tabFlushError('p-1')).toBe('笔记保存失败')
    // 新输入由控制器空闲计时落库；成功写清除错误态
    await idle()
    expect(db).toBe('y')
    expect(useNotesStore.getState().noteByPaper['p-1']).toMatchObject({ pending: false, saveFailed: false })
  })
})
