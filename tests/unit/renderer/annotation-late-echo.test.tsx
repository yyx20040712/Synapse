// @vitest-environment jsdom
/**
 * [B4-A R2 §2.5 #19 → 审查 8 回归] 批注普通写的迟到回显归属：update/remove 写
 * 标注归属的原 tab，不读 activeId（真实 annotation-popups-actions 动作链）。
 *
 * 锁链：
 * - A 批注写在途→切 B→A 成功回执：只更新 A（A.comment=回显值）；B 原样；
 * - A 删除在途→切 B→删除成功回执：只移除 A 的标注；B 原样；
 * - 对照：无切换时回显照常写活动 tab（寻址改变不破坏常规路径）。
 * 模块态隔离：lane/注册表逐用例复位；弹层动作经 Probe 组件取 hook 面。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'
import { makeAnnotation, makeTab } from '../../utils/factories'

const mocks = vi.hoisted(() => ({
  updateAnnotation: vi.fn(),
  deleteAnnotation: vi.fn()
}))
makeApiStub({
  reader: { updateAnnotation: mocks.updateAnnotation, deleteAnnotation: mocks.deleteAnnotation }
})

import { useAnnotationPopupActions, type AnnotationPopupActions } from '../../../src/renderer/features/reader/interact/annotation-popups-actions'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import { clearStack } from '../../../src/renderer/features/reader/state/annotation-undo'
import { resetTabLanes } from '../../../src/renderer/shared/tab-write-lane'
import type { Annotation } from '../../../src/shared/models/annotation'

const A = 'p-late-a'
const B = 'p-late-b'

/** 覆写 id/paperId 的标注（模块态隔离） */
function annoOf(id: string, paperId: string): Annotation {
  return { ...makeAnnotation(), id, paperId }
}

async function turns(n = 30): Promise<void> {
  for (let i = 0; i < n; i++) await Promise.resolve()
}

let root: Root | null = null
let host: HTMLDivElement | null = null

beforeEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
  mocks.updateAnnotation.mockReset()
  mocks.deleteAnnotation.mockReset()
  resetTabLanes()
  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  useReaderStore.setState({ tabs: {}, order: [], activeId: null })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  for (const id of [A, B]) clearStack(id)
  resetTabLanes()
  useReaderStore.setState({ tabs: {}, order: [], activeId: null })
})

/** 两 tab 夹具：A 含待写标注 a，B 含自身标注 bAnno；活动=A */
function seedTwoTabs(a: Annotation, bAnno: Annotation): void {
  useReaderStore.setState({
    tabs: {
      [A]: makeTab(A, { annotations: [a] }),
      [B]: makeTab(B, { annotations: [bAnno] })
    },
    order: [A, B],
    activeId: A
  })
}

/** Probe：取弹层动作 hook 面（真实 annotation-popups-actions） */
function mountActions(): AnnotationPopupActions {
  let actions: AnnotationPopupActions | null = null
  function Probe(): null {
    actions = useAnnotationPopupActions({
      busy: false,
      setBusy: () => undefined,
      closeEditing: () => undefined,
      closeMenu: () => undefined,
      onChanged: () => undefined
    })
    return null
  }
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root!.render(<Probe />)
  })
  return actions!
}

describe('批注普通写迟到回显归属（§2.5 #19）—— 写原 tab 不读 activeId', () => {
  it('A 批注写在途→切 B→A 成功回执：只更新 A，B 原样', async () => {
    const a = annoOf('a-late', A)
    const bAnno = annoOf('b-own', B)
    seedTwoTabs(a, bAnno)
    let release!: (v: unknown) => void
    const flight = new Promise((r) => {
      release = r
    })
    mocks.updateAnnotation.mockImplementation(() => flight)
    const actions = mountActions()
    const writing = actions.autosaveComment(a, '新批注')
    await turns()
    expect(mocks.updateAnnotation).toHaveBeenCalledTimes(1)
    // await 窗内切到 B
    useReaderStore.getState().activateTab(B)
    release({ ok: true, data: { ...a, comment: '新批注' } })
    expect(await writing).toBe(true)
    const tabs = useReaderStore.getState().tabs
    expect(tabs[A]?.annotations[0]?.comment).toBe('新批注')
    expect(tabs[B]?.annotations).toEqual([bAnno])
    expect(useReaderStore.getState().activeId).toBe(B)
  })

  it('A 删除在途→切 B→删除成功回执：只移除 A 的标注，B 原样', async () => {
    const a = annoOf('a-late-del', A)
    const bAnno = annoOf('b-own-del', B)
    seedTwoTabs(a, bAnno)
    let release!: (v: unknown) => void
    const flight = new Promise((r) => {
      release = r
    })
    mocks.deleteAnnotation.mockImplementation(() => flight)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const actions = mountActions()
    void actions.deleteAnnotation(a)
    await turns()
    expect(mocks.deleteAnnotation).toHaveBeenCalledTimes(1)
    useReaderStore.getState().activateTab(B)
    release({ ok: true, data: undefined })
    await turns()
    const tabs = useReaderStore.getState().tabs
    expect(tabs[A]?.annotations).toHaveLength(0)
    expect(tabs[B]?.annotations).toEqual([bAnno])
    expect(useReaderStore.getState().activeId).toBe(B)
  })

  it('对照：无切换时成功回显照常写活动 tab（A）', async () => {
    const a = annoOf('a-same', A)
    const bAnno = annoOf('b-own-same', B)
    seedTwoTabs(a, bAnno)
    mocks.updateAnnotation.mockImplementation((req: { annotation: Annotation }) =>
      Promise.resolve({ ok: true, data: req.annotation })
    )
    const actions = mountActions()
    expect(await actions.autosaveComment(a, '同篇批注')).toBe(true)
    expect(useReaderStore.getState().tabs[A]?.annotations[0]?.comment).toBe('同篇批注')
    expect(useReaderStore.getState().tabs[B]?.annotations).toEqual([bAnno])
  })
})
