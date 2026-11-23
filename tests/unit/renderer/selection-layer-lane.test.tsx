// @vitest-environment jsdom
/**
 * [B4-A R1 §4.3/§11.1] SelectionLayer 创建标注写经 per-tab lane（新建，always-active；
 * §11.1 SelectionLayer 行「创建标注写与 undo 记录改经 tab lane」的合约）。
 *
 * 真实划选驱动（夹具同 quit-gate-realchain「SelectionLayer 保存（create 链）」）：
 * - 同 tab 在途写未落定前创建零派发（与批注文本写/操作层 undo-redo 反向写
 *   互斥不并发——同一标注的增删与历史命令不同时在途）；落定后派发、store 落账、
 *   create 项入操作栈；
 * - 创建失败：tab 灰点置位+toast、不入栈、选区工具条保持（既有失败面沿承）；
 * - [B4-A R2 审查 3] 目标 tab 关闭在途：创建命令被冻结门拒绝（§2.5 #2「命令
 *   通过 gate」——零 api、不入栈、工具条保持）；「否」留下后恢复；
 * - [B4-A R2 §2.5 #2] 创建成功=操作单元提交（新编辑事件）：U=1、revision 递增。
 */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, toastSpy } from '../../utils/api-client-mock'
import { makeAnnotation, makeTab, mkItem, mkText, seedRegistry } from '../../utils/factories'
import { stubElementRects, stubRangeGBCR, type StubBox } from '../../utils/geometry'

const mocks = vi.hoisted(() => ({ annoCreate: vi.fn() }))
makeApiStub({ reader: { saveAnnotation: mocks.annoCreate } })

import { SelectionLayer } from '../../../src/renderer/features/reader/interact/SelectionLayer'
import { chooseCloseTabDecision, requestCloseTab } from '../../../src/renderer/features/reader/state/reader-close-tab'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import { clearStack, stackDepth } from '../../../src/renderer/features/reader/state/annotation-undo'
import { enqueueTabTask, laneDepth, resetTabLanes } from '../../../src/renderer/shared/tab-write-lane'

let root: Root | null = null
let host: HTMLDivElement | null = null
let rangeStub: { restore(): void } | null = null

/** 划选并点击工具条「高亮」（返回点击函数） */
async function mountSelection(): Promise<() => Promise<void>> {
  const page1 = document.createElement('div')
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
  await act(async () => {
    root!.render(createElement(SelectionLayer, { pageRoot: page1, paperId: 'p-1', page: 0, onSaved: (a) => {
      useReaderStore.getState().addAnnotation('p-1', a)
    } }))
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
  return async () => {
    const button = Array.from(bar.querySelectorAll<HTMLButtonElement>('button')).find((x) => x.textContent === '高亮')
    if (button === undefined) throw new Error('高亮钮未找到')
    await act(async () => {
      button.click()
      await vi.advanceTimersByTimeAsync(0)
    })
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  resetTabLanes()
  clearStack('p-1')
  useReaderStore.setState({ tabs: { 'p-1': makeTab('p-1') }, order: ['p-1'], activeId: 'p-1' })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  document.body.innerHTML = ''
  window.getSelection()?.removeAllRanges()
  rangeStub?.restore()
  rangeStub = null
  vi.useRealTimers()
  resetTabLanes()
})

describe('B4-A R1 SelectionLayer 创建标注写经 per-tab lane', () => {
  it('[B4-A R2 §2.5 #2] 创建成功=操作单元提交：U=1、editRevision 递增', async () => {
    mocks.annoCreate.mockResolvedValueOnce({
      ok: true as const,
      data: { ...makeAnnotation(''), id: 'anno-u', page: 0 }
    })
    expect(useReaderStore.getState().tabs['p-1']?.unfinalized ?? false).toBe(false)
    const highlight = await mountSelection()
    await highlight()
    expect(mocks.annoCreate).toHaveBeenCalledTimes(1)
    expect(useReaderStore.getState().tabs['p-1']?.unfinalized).toBe(true)
    expect(useReaderStore.getState().tabs['p-1']?.editRevision).toBe(1)
  })

  it('同 tab 在途写未落定前创建零派发；落定后派发+store 落账+create 项入操作栈', async () => {
    mocks.annoCreate.mockResolvedValueOnce({
      ok: true as const,
      data: { ...makeAnnotation(''), id: 'anno-lane', page: 0 }
    })
    let release!: () => void
    void enqueueTabTask('p-1', () => new Promise<void>((res) => { release = res }))
    const highlight = await mountSelection()
    await highlight()
    // 排在在途写之后（不并发）：API 零派发、链深=在途+排队
    expect(mocks.annoCreate).not.toHaveBeenCalled()
    expect(laneDepth('p-1')).toBe(2)
    expect(stackDepth('p-1')).toBe(0)
    release()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(mocks.annoCreate).toHaveBeenCalledTimes(1)
    expect(useReaderStore.getState().tabs['p-1']?.annotations.map((a) => a.id)).toEqual(['anno-lane'])
    expect(stackDepth('p-1')).toBe(1)
    expect(host!.querySelector('[data-testid="selection-toolbar"]')).toBeNull()
  })

  it('创建失败：tab 灰点置位+toast、不入栈（失败面沿承——lane 不改结果归因）', async () => {
    mocks.annoCreate.mockRejectedValueOnce(new Error('create failed'))
    const highlight = await mountSelection()
    await highlight()
    expect(mocks.annoCreate).toHaveBeenCalledTimes(1)
    expect(useReaderStore.getState().tabs['p-1']?.dirty).toBe(true)
    expect(toastSpy).toHaveBeenCalledTimes(1)
    expect(stackDepth('p-1')).toBe(0)
    expect(laneDepth('p-1')).toBe(0)
  })
  it('[B4-A R2 §2.5 #2] 目标 tab 关闭在途：创建命令被拒（零 api、不入栈、工具条保持）；「否」留下后恢复', async () => {
    mocks.annoCreate.mockResolvedValueOnce({
      ok: true as const,
      data: { ...makeAnnotation(''), id: 'anno-close-freeze', page: 0 }
    })
    // U=1：关闭预 flush 成功后进 confirm 相（冻结持续到用户决策）
    useReaderStore.getState().markTabUnfinalized('p-1')
    const highlight = await mountSelection()
    let closing: Promise<boolean> | null = null
    await act(async () => {
      closing = requestCloseTab('p-1')
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(useReaderStore.getState().tabs['p-1']?.closing?.phase).toBe('confirm')
    await highlight()
    expect(mocks.annoCreate).not.toHaveBeenCalled()
    expect(stackDepth('p-1')).toBe(0)
    expect(host!.querySelector('[data-testid="selection-toolbar"]')).not.toBeNull()
    await act(async () => {
      chooseCloseTabDecision('p-1', false)
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(await closing).toBe(false)
    await highlight()
    expect(mocks.annoCreate).toHaveBeenCalledTimes(1)
    expect(stackDepth('p-1')).toBe(1)
  })
})
