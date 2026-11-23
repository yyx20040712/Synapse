// @vitest-environment jsdom
/**
 * [B4-A 回炉三 A → 回归] 操作层 history 命令的预 flush × 总评宿主（ReaderNotesPanel）
 * ——批注+总评两宿主覆盖（同一注册点 useTextDraftRegistryBinding；总评的裸写体=
 * notes.store.persistNowRaw）。
 *
 * 覆盖用例，非红绿判别：旧实现经「普通写入链+等 laneDrain」在本序列得到相同写序，
 * 对改动前树与 cut1-no-guard 均绿（仓外 b4a-rework3/22-final-red-vs-prechange.log、
 * 23-final-red-vs-cut1-no-guard.log）。锁定行为：
 * - 起步时待写的总评经裸写体在操作层反向写之前落库（不在反向写之后重写）。
 * DB 以闭包模拟；lane=真实 per-tab 链。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IDLE_FLUSH_MS } from '../../../src/shared/constants'
import { makeApiStub } from '../../utils/api-client-mock'
import { makeAnnotation, makeTab } from '../../utils/factories'
import type { Annotation } from '../../../src/shared/models/annotation'

const mocks = vi.hoisted(() => ({ updateAnnotation: vi.fn(), notesGet: vi.fn(), notesSave: vi.fn() }))
makeApiStub({
  reader: { updateAnnotation: mocks.updateAnnotation },
  notes: { get: mocks.notesGet, save: mocks.notesSave }
})

import { ReaderNotesPanel } from '../../../src/renderer/features/reader/panels/ReaderNotesPanel'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import { useNotesStore } from '../../../src/renderer/features/notes/notes.store'
import { clearStack, pushUndo } from '../../../src/renderer/features/reader/state/annotation-undo'
import { clearAllTextHistory } from '../../../src/renderer/features/reader/state/reader-text-history'
import { enqueueTabTask, resetTabLanes } from '../../../src/renderer/shared/tab-write-lane'

const P = 'p-op-notes-host'
const A: Annotation = { ...makeAnnotation('a'), id: 'a-op-notes', paperId: P }

let root: Root | null = null
let host: HTMLDivElement | null = null

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  mocks.updateAnnotation.mockReset()
  mocks.notesGet.mockReset()
  mocks.notesSave.mockReset()
  resetTabLanes()
  clearAllTextHistory()
  clearStack(P)
  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  useReaderStore.setState({
    tabs: { [P]: makeTab(P, { annotations: [A] }) },
    order: [P],
    activeId: P
  })
  useNotesStore.setState({ noteByPaper: {} })
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
  vi.clearAllTimers()
  vi.useRealTimers()
  resetTabLanes()
  clearAllTextHistory()
  clearStack(P)
  useReaderStore.setState({ tabs: {}, order: [], activeId: null })
  useNotesStore.setState({ noteByPaper: {} })
})

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

/** 在 act 内等待命令兑现并冲完其后的微任务续体（store apply 等状态更新不落到 act 外） */
async function awaitAct<T>(p: Promise<T>): Promise<T> {
  let out!: T
  await act(async () => {
    out = await p
    for (let i = 0; i < 30; i++) await Promise.resolve()
  })
  return out
}

/** 总评面板世界：库值闭包（note/anno）；栈顶 E1=comment-edit{before:'old', after:'a'} */
async function mountWorld(): Promise<{ order: string[]; note: () => string; anno: () => string }> {
  const order: string[] = []
  let note = ''
  let anno = 'a'
  mocks.notesGet.mockResolvedValue({ ok: true, data: null })
  mocks.notesSave.mockImplementation((arg: { paperId: string; contentMd: string }) => {
    order.push(`note:${arg.contentMd}`)
    note = arg.contentMd
    return Promise.resolve({
      ok: true as const,
      data: { id: 'n-1', paperId: arg.paperId, contentMd: arg.contentMd, createdAt: 't', updatedAt: 't' }
    })
  })
  mocks.updateAnnotation.mockImplementation((arg: { annotation: Annotation }) => {
    order.push(`anno:${arg.annotation.comment}`)
    anno = arg.annotation.comment
    return Promise.resolve({ ok: true, data: arg.annotation })
  })
  act(() => {
    root!.render(<ReaderNotesPanel annotations={[A]} onLocate={() => undefined} />)
  })
  await settle()
  expect(body().value).toBe('')
  pushUndo(P, { kind: 'comment-edit', before: { ...A, comment: 'old' }, after: A })
  return { order, note: () => note, anno: () => anno }
}

function blockLane(): () => void {
  let releaseBlocker!: () => void
  void enqueueTabTask(
    P,
    () =>
      new Promise<void>((r) => {
        releaseBlocker = r
      })
  )
  return () => releaseBlocker()
}

describe('操作层 history 命令的预 flush × 总评宿主（批注+总评两宿主覆盖）', () => {
  it('起步时待写的总评经裸写体先于操作层反向写落库；总评未保存标记随之清除', async () => {
    const w = await mountWorld()
    typeInto('总评-1') // 起步时的待写值（未落库）
    const release = blockLane()
    const undoing = useReaderStore.getState().undo()
    await settle()
    expect(w.order).toEqual([]) // 预 flush 在复合任务体内——尚未轮到
    release()
    expect(await awaitAct(undoing)).toBe(true)
    await settle()
    // 写序=总评裸预 flush → 操作层反向写（总评不在反向写之后重写）
    expect(w.order).toEqual(['note:总评-1', 'anno:old'])
    expect({ note: w.note(), anno: w.anno() }).toEqual({ note: '总评-1', anno: 'old' })
    expect(useNotesStore.getState().noteByPaper[P]).toMatchObject({ contentMd: '总评-1', pending: false })
    await idle()
    expect(w.order).toEqual(['note:总评-1', 'anno:old']) // 空闲信号到达时总评已在库——零补写
  })
})
