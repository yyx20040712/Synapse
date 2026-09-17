// @vitest-environment jsdom
/**
 * [P7E-03 门一 W3] useReaderSearch 装配接线面（锁定合约，always-active）。
 *
 * 覆盖三面：①fileUrl 键效应——变化（含卸载重挂）→bindDoc/reset 生效、同
 * fileUrl 重挂不重置（INV-55 会话身份记账入 store）；②keymap 'reader-search'
 * 注册（document ctrl+f 派发→open()）+卸载成对注销（注销后派发零效果——
 * INV-14）；③pageTurner 翻页联动注入——store.next() 目标页≠tab.page→
 * reader.store.setPage({scroll:'to'})（INV-29 信号 bump）、相等→不调。
 * reader.store 经 setState 直植先例（selection-mode.test 同法）；api/toast
 * 模块 mock 同 reader-double-page 先例（本文件不触 openPaper 链）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'
import { makeTab } from '../../utils/factories'
import { useReaderSearch } from '../../../src/renderer/features/reader/useReaderSearch'
import {
  createReaderSearchInitialState,
  useReaderSearchStore,
  type SearchMatch
} from '../../../src/renderer/features/reader/reader-search.store'
import {
  createReaderStoreInitialState,
  useReaderStore
} from '../../../src/renderer/features/reader/reader.store'


makeApiStub({ reader: {} })

/** 宿主：只消费 hook（返回节点弃置——接线面不评 UI） */
function Host(props: { pdfDoc: unknown; fileUrl: string }): null {
  useReaderSearch(props.pdfDoc, props.fileUrl)
  return null
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

/** 卸载→清宿主→重挂（重挂场景的统一路径） */
function remount(node: JSX.Element): void {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  mount(node)
}

/** ready 态完整 tab（selection-mode.test 同配方） */
/** 植入 done 会话（pageTurner/fileUrl 用例的公共夹具；act 包裹——宿主在挂
 *  中，store 写入驱动其重渲染须走 act 防警告） */
function plantSearchDone(matchPages: number[]): SearchMatch[] {
  const matches = matchPages.map((p) => ({ page: p, itemRanges: [{ itemIndex: 0, s0: 0, s1: 5 }] }))
  act(() => {
    useReaderSearchStore.setState({
      state: 'done',
      query: 'smart',
      lastSubmitted: 'smart',
      matches,
      activeIndex: 0,
      pageItems: {},
      focusSeq: 1
    })
  })
  return matches
}

beforeEach(() => {
  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  useReaderSearchStore.setState(createReaderSearchInitialState())
  useReaderStore.setState(createReaderStoreInitialState())
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  useReaderSearchStore.setState(createReaderSearchInitialState())
  useReaderStore.setState(createReaderStoreInitialState())
})

describe('P7E-03 useReaderSearch 接线 —— fileUrl 键效应（INV-55）', () => {
  it('① 变化（含重挂）→reset 生效；同 fileUrl 重挂不重置', () => {
    mount(<Host pdfDoc={null} fileUrl="app-file://a" />)
    plantSearchDone([0])
    expect(useReaderSearchStore.getState().state).toBe('done')
    // 同 fileUrl 重挂：身份未变——bindDoc no-op，done 会话保留
    remount(<Host pdfDoc={null} fileUrl="app-file://a" />)
    expect(useReaderSearchStore.getState().state).toBe('done')
    expect(useReaderSearchStore.getState().matches).toHaveLength(1)
    // 换 fileUrl 重挂：上一篇 done 会话不得复活到新文档（W1 漏洞面）
    remount(<Host pdfDoc={null} fileUrl="app-file://b" />)
    const s = useReaderSearchStore.getState()
    expect(s.state).toBe('idle')
    expect(s.matches).toEqual([])
    expect(s.sessionFileUrl).toBe('app-file://b')
  })
})

describe('P7E-03 useReaderSearch 接线 —— keymap 注册/注销成对（INV-14）', () => {
  const pressCtrlF = (): void => {
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, bubbles: true, cancelable: true }))
    })
  }

  it('② 挂载中 ctrl+f→open()；卸载后派发零效果（listener 随注销移除）', () => {
    mount(<Host pdfDoc={null} fileUrl="app-file://a" />)
    expect(useReaderSearchStore.getState().state).toBe('idle')
    pressCtrlF()
    expect(useReaderSearchStore.getState().state).toBe('open')
    expect(useReaderSearchStore.getState().focusSeq).toBe(1)
    act(() => {
      root?.unmount()
    })
    root = null
    const seqAfterUnmount = useReaderSearchStore.getState().focusSeq
    pressCtrlF()
    expect(useReaderSearchStore.getState().focusSeq).toBe(seqAfterUnmount)
    expect(useReaderSearchStore.getState().state).toBe('open')
  })
})

describe('P7E-03 useReaderSearch 接线 —— pageTurner 翻页联动（INV-29）', () => {
  it("③ 目标页≠tab.page→setPage({scroll:'to'})；相等→不调（scrollRequest 不 bump）", () => {
    useReaderStore.setState({ tabs: { 'p-1': makeTab('p-1') }, order: ['p-1'], activeId: 'p-1' })
    mount(<Host pdfDoc={null} fileUrl="app-file://a" />)
    plantSearchDone([0, 1])
    act(() => {
      useReaderSearchStore.getState().next()
    })
    expect(useReaderStore.getState().tabs['p-1']?.page).toBe(1)
    expect(useReaderStore.getState().scrollRequest).toEqual({ paperId: 'p-1', page: 1, seq: 1 })

    // 相等面：tab 已在目标页——setPage 不调（程序滚动零触发）
    useReaderStore.setState((s) => ({
      tabs: { ...s.tabs, 'p-1': { ...s.tabs['p-1']!, page: 1 } },
      scrollRequest: null
    }))
    plantSearchDone([0, 1])
    act(() => {
      useReaderSearchStore.getState().next()
    })
    expect(useReaderStore.getState().tabs['p-1']?.page).toBe(1)
    expect(useReaderStore.getState().scrollRequest).toBeNull()
  })
})
