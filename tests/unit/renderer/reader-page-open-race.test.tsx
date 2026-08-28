// @vitest-environment jsdom
/**
 * [sr2-lg-08] ReaderPage 挂载时序竞态回归锁（锁定合约，always-active——
 * 不经 guardedDescribe，ADR-0017 裁决 3）。
 *
 * 竞态链（缺陷 P3「双击笔记总跳最后打开的文章」根因，宪法三盲区之首=时序）：
 * 脉络双击笔记 → requestOpenPaperAnchored(A+anchor) 事件① → App 切视图 →
 * ReaderPage 挂载效应内 takePendingOpenPaper 消费闩锁 → openFromBus →
 * locateAnchor → waitOpen（tab 缺席）→ requestOpenPaper(A) **同步派发事件②**
 * ——旧序中 addEventListener 晚于消费两行，事件②自丢失 → 无角色调
 * store.openPaper → waitOpen 8s 超时 → 停留原 active tab（=最后打开的文章）。
 *
 * - it① 竞态红证：真 open-paper-bus（禁 mock——竞态本体=总线时序）+真
 *   reader.store（openPaper 动作 spy 替换=anchor-locate.test.ts:74 同型先例）
 *   ——闩锁先设+tab 缺席 → render ReaderPage → 断言 openPaper 被调（事件②
 *   被自身 handler 接住的唯一证据）。换序实现前必红（openPaper 0 次）。
 * - it② 无锚请求回归锁：pending 无 anchor → openFromBus 无锚分支直接
 *   openPaper（不依赖监听器注册顺序——既有行为）。
 * - 定时器：fake timers（anchor-locate.test.ts 先例）——waitOpen 8s 轮询在
 *   fake 队列冻结，不滞留测试进程（事件②的 spy 命中是同步链，无需推进）。
 * - mock 面申报（app-quit-dirty.test.tsx 配方同族，最小化）：
 *   ①api/client（`api = window.api` 顶层赋值，jsdom 下必须 stub）；
 *   ②PdfDocProvider/PageColumn（pdfjs-dist 渲染管线重件——防御性隔离，
 *   本测渲染路径=tab 缺席空态，断言不涉其渲染输出；PageColumn 附带
 *   nearestPage 导出=scroll-progress 的 import 面）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as clientModule from '../../../src/renderer/api/client'

const { stubApi } = vi.hoisted(() => ({
  stubApi: { reader: { open: vi.fn(), listAnnotations: vi.fn(), saveProgress: vi.fn() } }
}))

vi.mock('../../../src/renderer/api/client', async (importOriginal) => {
  const real = await importOriginal<typeof clientModule>()
  return { ...real, api: stubApi as unknown as typeof clientModule.api }
})

vi.mock('../../../src/renderer/features/reader/PdfDocProvider', () => ({
  PdfDocProvider: () => null
}))

vi.mock('../../../src/renderer/features/reader/PageColumn', () => ({
  PageColumn: () => null,
  nearestPage: () => 0
}))

import { ReaderPage } from '../../../src/renderer/features/reader/ReaderPage'
import { useReaderStore } from '../../../src/renderer/features/reader/reader.store'
import { requestOpenPaperAnchored, takePendingOpenPaper } from '../../../src/renderer/shared/open-paper-bus'

let root: Root | null = null
let host: HTMLDivElement | null = null
let openPaperSpy: ReturnType<typeof vi.fn>

function mount(element: JSX.Element): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(element)
  })
}

const flush = async (turns = 6): Promise<void> => {
  for (let i = 0; i < turns; i++) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  // 模块级闩锁单例跨用例复位（消费式清空——open-paper-bus 无重置口）
  takePendingOpenPaper()
  useReaderStore.setState({
    tabs: {},
    order: [],
    activeId: null,
    noteHighlight: null,
    aiNoteHighlight: null
  })
  openPaperSpy = vi.fn(async () => undefined)
  useReaderStore.getState().openPaper = openPaperSpy
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

describe('ReaderPage 挂载时序 —— 打开请求消费 vs 监听器注册（sr2-lg-08）', () => {
  it('竞态红证：带锚闩锁+tab 缺席 → 挂载效应内 waitOpen 重发的事件②被自身 handler 接住（openPaper 被调）', async () => {
    // 脉络双击场景：事件①派发时 ReaderPage 未挂载（App 尚未切视图）——闩锁承载
    requestOpenPaperAnchored({
      paperId: 'p1',
      anchor: { quoteText: '竞态锚文', prefixText: '', suffixText: '', anchorPage: 0 },
      aiNoteId: 'n1'
    })
    mount(<ReaderPage />)
    await flush()
    // 旧序：事件②早于 addEventListener 两行 → 自丢失 → openPaper 永不被调（红证点）
    expect(openPaperSpy).toHaveBeenCalledTimes(1)
    expect(openPaperSpy).toHaveBeenCalledWith('p1')
  })

  it('无锚请求回归锁：挂载闩锁补读 → openFromBus 无锚分支直接 openPaper（不依赖监听器顺序）', async () => {
    requestOpenPaperAnchored({ paperId: 'p2' })
    mount(<ReaderPage />)
    await flush()
    expect(openPaperSpy).toHaveBeenCalledTimes(1)
    expect(openPaperSpy).toHaveBeenCalledWith('p2')
  })
})
