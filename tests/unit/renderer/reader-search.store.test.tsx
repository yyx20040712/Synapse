/**
 * [P7E-03] 页内高亮搜索 —— 搜索 store 面（reader-search.store.ts；锁定合约，
 * always-active）。态空间跨格序列 S1~S12 的 store 侧锚（doc 桩注入逐页文本+
 * 失败注入+外部门闸；代际守卫=旧代页回传后断言 matches 为新代口径）。
 * 形态 crib reader.store.test.ts / selection-mode.test.tsx（store setState
 * 直植复位；toast 模块 mock 观测 S10）。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toastStoreSpy as toastMock } from '../../utils/api-client-mock'
import {
  createReaderSearchInitialState,
  useReaderSearchStore
} from '../../../src/renderer/features/reader/view/reader-search.store'

/** 单页文本项数组（每段一个 item——组装夹具用） */
function pageOf(...strs: string[]): { items: unknown[] } {
  return {
    items: strs.map((s) => ({ str: s, hasEOL: false, dir: 'ltr', width: 10, height: 10, transform: [], fontName: 'F1' }))
  }
}

/** 文档桩：pages[n-1]=该页 item 串数组；gate=每页 getTextContent 前置门闸
 *  （S7 旧代迟回注入）；failAt=该页 getTextContent 拒绝（S10 失败注入） */
function makeDoc(
  pages: string[][],
  opts?: { failAt?: number; gate?: Promise<void> }
): unknown {
  return {
    numPages: pages.length,
    getPage: (n: number) =>
      Promise.resolve({
        getTextContent: async (): Promise<{ items: unknown[] }> => {
          if (opts?.gate !== undefined) await opts.gate
          if (opts?.failAt === n) throw new Error('extract-failed')
          return pageOf(...(pages[n - 1] ?? []))
        }
      })
  }
}

beforeEach(() => {
  useReaderSearchStore.setState(createReaderSearchInitialState())
  toastMock.mockReset()
})

afterEach(() => {
  useReaderSearchStore.setState(createReaderSearchInitialState())
  useReaderSearchStore.getState().registerPageTurner(null)
})

describe('P7E-03 搜索 store —— 面板生命周期', () => {
  it('S1 open：idle→open+focusSeq++（零匹配零高亮输入）', () => {
    useReaderSearchStore.getState().open()
    const s = useReaderSearchStore.getState()
    expect(s.state).toBe('open')
    expect(s.focusSeq).toBe(1)
    expect(s.matches).toEqual([])
  })

  it('S6 close：done→idle 全清（高亮清+query 清）且在途代际失效', async () => {
    useReaderSearchStore.getState().open()
    useReaderSearchStore.getState().setQuery('smart')
    await useReaderSearchStore.getState().submit(makeDoc([['SMART']]), 'smart')
    expect(useReaderSearchStore.getState().state).toBe('done')
    useReaderSearchStore.getState().close()
    const s = useReaderSearchStore.getState()
    expect(s.state).toBe('idle')
    expect(s.query).toBe('')
    expect(s.lastSubmitted).toBe('')
    expect(s.matches).toEqual([])
    expect(s.pageItems).toEqual({})
    expect(s.activeIndex).toBe(0)
  })

  it('S8 reset：done→idle 全清（换文档/换 tab 调用面）', async () => {
    await useReaderSearchStore.getState().submit(makeDoc([['SMART']]), 'smart')
    useReaderSearchStore.getState().reset()
    const s = useReaderSearchStore.getState()
    expect(s.state).toBe('idle')
    expect(s.matches).toEqual([])
  })

  it('S12 done 再 open：focusSeq++，不重搜（matches 引用不变、state 保持 done）', async () => {
    useReaderSearchStore.getState().open()
    await useReaderSearchStore.getState().submit(makeDoc([['SMART'], ['SMART two']]), 'smart')
    const before = useReaderSearchStore.getState()
    const seq0 = before.focusSeq
    const matchesRef = before.matches
    useReaderSearchStore.getState().open()
    const after = useReaderSearchStore.getState()
    expect(after.state).toBe('done')
    expect(after.focusSeq).toBe(seq0 + 1)
    expect(after.matches).toBe(matchesRef)
  })

  it('setQuery：输入框实时值写 store', () => {
    useReaderSearchStore.getState().setQuery('关键词')
    expect(useReaderSearchStore.getState().query).toBe('关键词')
  })
})

describe('P7E-03 搜索 store —— submit 序列', () => {
  it('S2 空/纯空白提交=no-op（零搜索：getPage 不取、态停在 open、lastSubmitted 不变）', async () => {
    const getPage = vi.fn(async () => ({ getTextContent: async () => pageOf('SMART') }))
    const doc = { numPages: 1, getPage }
    useReaderSearchStore.getState().open()
    await useReaderSearchStore.getState().submit(doc, '   ')
    const s = useReaderSearchStore.getState()
    expect(s.state).toBe('open')
    expect(s.lastSubmitted).toBe('')
    expect(s.matches).toEqual([])
    // 门一 N3：零搜索=页面零取数（getPage spy 直锚）
    expect(getPage).not.toHaveBeenCalled()
  })

  it('submit doc 不可收窄（null）=no-op', async () => {
    useReaderSearchStore.getState().open()
    await useReaderSearchStore.getState().submit(null, 'smart')
    expect(useReaderSearchStore.getState().state).toBe('open')
  })

  it('S3 提交有效查询：同步置态 searching（零 await 前置）→done；首匹配 active；pageItems 仅命中页', async () => {
    const doc = makeDoc([['alpha SMART'], ['beta none'], ['gamma SMART alpha']])
    useReaderSearchStore.getState().open()
    const p = useReaderSearchStore.getState().submit(doc, 'smart')
    // submit 调用返回前已置 searching（⑤b 同步置态——无 await 前置）
    expect(useReaderSearchStore.getState().state).toBe('searching')
    await p
    const s = useReaderSearchStore.getState()
    expect(s.state).toBe('done')
    expect(s.lastSubmitted).toBe('smart')
    expect(s.matches).toHaveLength(2)
    expect(s.matches[0]).toMatchObject({ page: 0 })
    expect(s.matches[1]).toMatchObject({ page: 2 })
    expect(s.activeIndex).toBe(0)
    expect(Object.keys(s.pageItems).sort()).toEqual(['0', '2'])
    // 命中页 items 为高亮映射输入（span 数校验基准）
    expect(s.pageItems[0]).toHaveLength(1)
  })

  it('S9 无命中：done(0)——matches 空、pageItems 空', async () => {
    useReaderSearchStore.getState().open()
    await useReaderSearchStore.getState().submit(makeDoc([['SMART']]), 'zzz')
    const s = useReaderSearchStore.getState()
    expect(s.state).toBe('done')
    expect(s.matches).toEqual([])
    expect(s.pageItems).toEqual({})
  })

  it('S10 逐页提取失败：error toast+回 open（query 保留）+matches 清+零崩溃', async () => {
    useReaderSearchStore.getState().open()
    useReaderSearchStore.getState().setQuery('smart')
    await useReaderSearchStore.getState().submit(makeDoc([['SMART'], ['x']], { failAt: 2 }), 'smart')
    const s = useReaderSearchStore.getState()
    expect(s.state).toBe('open')
    expect(s.query).toBe('smart')
    expect(s.matches).toEqual([])
    expect(toastMock).toHaveBeenCalledTimes(1)
    expect(toastMock.mock.calls[0]![1]).toBe('error')
  })

  it('S7 searching 中再提交新查询：代际守卫——旧代页回传作废，新代独占', async () => {
    let releaseOld: (() => void) | undefined
    const gate = new Promise<void>((resolve) => {
      releaseOld = resolve
    })
    const oldDoc = makeDoc([['alpha SMART'], ['alpha SMART two']], { gate })
    const newDoc = makeDoc([['beta SMART'], ['beta SMART x'], ['beta SMART y']])
    useReaderSearchStore.getState().open()
    const oldRun = useReaderSearchStore.getState().submit(oldDoc, 'alpha')
    expect(useReaderSearchStore.getState().state).toBe('searching')
    const newRun = useReaderSearchStore.getState().submit(newDoc, 'beta')
    await newRun
    expect(useReaderSearchStore.getState().matches).toHaveLength(3)
    // 旧代页此刻回传（门闸放行）——必须作废：不写 matches/不改 lastSubmitted
    releaseOld!()
    await oldRun
    const s = useReaderSearchStore.getState()
    expect(s.state).toBe('done')
    expect(s.lastSubmitted).toBe('beta')
    expect(s.matches).toHaveLength(3)
    expect(s.matches[0]).toMatchObject({ page: 0 })
  })
})

describe('P7E-03 搜索 store —— bindDoc 会话身份记账（门一 W1：INV-55 入 store）', () => {
  it('W1 bindDoc(变化 fileUrl)：代际失效+全清+记录新值', () => {
    useReaderSearchStore.setState({
      sessionFileUrl: 'app-file://a',
      state: 'done',
      query: '旧查询',
      lastSubmitted: '旧查询',
      matches: [{ page: 0, itemRanges: [{ itemIndex: 0, s0: 0, s1: 4 }] }],
      activeIndex: 0,
      pageItems: { 0: [] },
      focusSeq: 3
    })
    useReaderSearchStore.getState().bindDoc('app-file://b')
    const s = useReaderSearchStore.getState()
    expect(s.state).toBe('idle')
    expect(s.query).toBe('')
    expect(s.lastSubmitted).toBe('')
    expect(s.matches).toEqual([])
    expect(s.pageItems).toEqual({})
    expect(s.sessionFileUrl).toBe('app-file://b')
  })

  it('W1 bindDoc(同 fileUrl)=no-op：done 会话原样保留（引用不变）', () => {
    useReaderSearchStore.setState({
      sessionFileUrl: 'app-file://a',
      state: 'done',
      matches: [{ page: 0, itemRanges: [] }]
    })
    const before = useReaderSearchStore.getState().matches
    useReaderSearchStore.getState().bindDoc('app-file://a')
    const s = useReaderSearchStore.getState()
    expect(s.state).toBe('done')
    expect(s.matches).toBe(before)
  })
})

describe('P7E-03 搜索 store —— next/prev 翻页联动', () => {
  it('S4 next：active+1；末位回卷首位；经注入回调上抛目标页（0 基）', async () => {
    const doc = makeDoc([['SMART one'], ['SMART two'], ['SMART three']])
    const turn = vi.fn()
    useReaderSearchStore.getState().registerPageTurner(turn)
    await useReaderSearchStore.getState().submit(doc, 'smart')
    useReaderSearchStore.getState().next()
    expect(useReaderSearchStore.getState().activeIndex).toBe(1)
    expect(turn).toHaveBeenLastCalledWith(1)
    useReaderSearchStore.getState().next()
    expect(useReaderSearchStore.getState().activeIndex).toBe(2)
    expect(turn).toHaveBeenLastCalledWith(2)
    // 末位回卷首位
    useReaderSearchStore.getState().next()
    expect(useReaderSearchStore.getState().activeIndex).toBe(0)
    expect(turn).toHaveBeenLastCalledWith(0)
  })

  it('S5 prev：active−1；首位回卷末位', async () => {
    const doc = makeDoc([['SMART one'], ['SMART two'], ['SMART three']])
    const turn = vi.fn()
    useReaderSearchStore.getState().registerPageTurner(turn)
    await useReaderSearchStore.getState().submit(doc, 'smart')
    useReaderSearchStore.getState().prev()
    expect(useReaderSearchStore.getState().activeIndex).toBe(2)
    expect(turn).toHaveBeenLastCalledWith(2)
    useReaderSearchStore.getState().prev()
    expect(useReaderSearchStore.getState().activeIndex).toBe(1)
  })

  it('next/prev 无结果集=no-op（零回调）', () => {
    const turn = vi.fn()
    useReaderSearchStore.getState().registerPageTurner(turn)
    useReaderSearchStore.getState().next()
    useReaderSearchStore.getState().prev()
    expect(useReaderSearchStore.getState().activeIndex).toBe(0)
    expect(turn).not.toHaveBeenCalled()
  })

  it('registerPageTurner(null) 注销后 next 零翻页（成对契约）', async () => {
    const turn = vi.fn()
    useReaderSearchStore.getState().registerPageTurner(turn)
    await useReaderSearchStore.getState().submit(makeDoc([['SMART'], ['SMART b']]), 'smart')
    useReaderSearchStore.getState().registerPageTurner(null)
    useReaderSearchStore.getState().next()
    expect(useReaderSearchStore.getState().activeIndex).toBe(1)
    expect(turn).not.toHaveBeenCalled()
  })
})
