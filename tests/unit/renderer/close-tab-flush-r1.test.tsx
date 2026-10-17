// @vitest-environment jsdom
/**
 * [F-VISFB-15 回炉轮 1] 关 tab 收口复扫收敛+同步 throw 防护测试（新建，
 * always-active；自 close-tab-flush.test.tsx 拆出——该件 467 行扩格必超
 * max-lines 500，拆件先例=annotation-popups-autosave 自 editor-ux 拆出）。
 *
 * 锁链（门一回炉 R1/R3/R5/R7）：
 * - [R1] 复扫收敛：关 A 在途（X 句柄挂起）→窗内切 Y+输入窗内值→X settle→
 *   复扫轮收 Y→关闭 true 且 Y 值已写（apiUpdate 断言）——一次性快照漏扫
 *   新编辑目标=丢稿窗的回归锁；
 * - [R3] 同步 throw 句柄：归 'failed' 映射→仍脏 confirm 显式放弃（零抛零
 *   静默放行）；
 * - [R5] 面1/面3 真实编辑器集成：真实 AnnotationPopups 挂载+<800ms 窗内值
 *   →switchTabFlushFirst / switchViewWithFlush 消费→值经真实句柄链立存；
 * - [R7] clean 终态负向：句柄返 clean→放行 true 零 markTabDirty 零 confirm。
 * 模块态隔离：注册表模块级——互异 id+try/finally 显式回收（既有先例）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'
import { makeAnnotation, makeTab } from '../../utils/factories'
import { requestCloseTab, switchTabFlushFirst } from '../../../src/renderer/features/reader/state/tab-dirty'
import { AnnotationPopups } from '../../../src/renderer/features/reader/view/AnnotationPopups'
import { switchViewWithFlush } from '../../../src/renderer/app/view-flush'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import { useNotesStore } from '../../../src/renderer/features/notes/notes.store'
import {
  registerDraftFlush,
  unregisterDraftFlush
} from '../../../src/renderer/features/reader/interact/annotation-draft-registry'
import type { Annotation, AnnotationRect } from '../../../src/shared/models/annotation'

const mocks = vi.hoisted(() => ({
  notesGet: vi.fn(),
  notesSave: vi.fn(),
  annoUpdate: vi.fn()
}))
makeApiStub({
  notes: { get: mocks.notesGet, save: mocks.notesSave },
  reader: { updateAnnotation: mocks.annoUpdate }
})

/** 微任务排空（async 链逐跳——复扫轮链深较大） */
async function drain(turns = 60): Promise<void> {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}

const RECT: AnnotationRect = { page: 0, x: 0.1, y: 0.2, w: 0.3, h: 0.05 }

/** 覆写 id/paperId 的标注（模块态隔离） */
function annoOf(id: string, paperId: string, comment = ''): Annotation {
  return { ...makeAnnotation(comment), id, paperId }
}

let root: Root | null = null
let host: HTMLDivElement | null = null

beforeEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
  mocks.notesGet.mockReset()
  mocks.notesSave.mockReset()
  mocks.annoUpdate.mockReset()
  for (const k of Object.keys(useNotesStore.getState().noteByPaper)) {
    useNotesStore.getState().discardPendingEdit(k)
  }
  useNotesStore.setState({ noteByPaper: {} })
  useReaderStore.setState({ tabs: {}, order: [], activeId: null })
  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  host?.remove()
  root = null
  host = null
})

/** 真实弹层挂载（静 props 消费形——写链无需 busy 重渲染；同 root 重渲=切目标替换形） */
function mountPopups(annotation: Annotation): void {
  if (root === null) {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
  }
  act(() => {
    root!.render(
      <AnnotationPopups
        menu={null}
        editing={{ annotation, rect: RECT }}
        busy={false}
        setMenu={vi.fn()}
        setEditing={vi.fn()}
        setBusy={vi.fn()}
        onChanged={vi.fn()}
      />
    )
  })
}

/** <800ms 防抖窗内值输入（不推进 timer——un-attempted 形） */
function typeWindowValue(text: string): void {
  const ta = host!.querySelector('textarea') as HTMLTextAreaElement
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
  act(() => {
    setter?.call(ta, text)
    ta.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('F-VISFB-15 回炉 R1/R3/R5/R7 —— 关 tab 复扫收敛/同步 throw/集成/clean 负向', () => {
  it('[R1·回炉2 重述] 关 A 在途窗内切 Y：close 不越权消费新活动篇句柄——X 立存、Y 编辑器存续（timer 承接窗内值）、A 净放行', async () => {
    const annoX = annoOf('anno-r1x', 'r1-a')
    const annoY = annoOf('anno-r1y', 'r1-y')
    useReaderStore.setState({
      tabs: {
        'r1-a': makeTab('r1-a', { annotations: [annoX] }),
        'r1-y': makeTab('r1-y', { annotations: [annoY] })
      },
      order: ['r1-a', 'r1-y'],
      activeId: 'r1-a'
    })
    let resolveX!: (v: { ok: boolean; data: Annotation }) => void
    mocks.annoUpdate.mockImplementationOnce(
      () => new Promise((r) => { resolveX = r as typeof resolveX })
    )
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    mountPopups(annoX)
    typeWindowValue('X窗内值')
    const closing = requestCloseTab('r1-a')
    // 让轮 0 快照已取且 X 写挂起（句柄在途）
    await drain(20)
    expect(mocks.annoUpdate).toHaveBeenCalledTimes(1)
    // await 窗内真实切换径：面1 挂点在切换刻 fire-first 消费离场篇句柄（X
    // 幂等零二写——hook savingRef 串行）+Y 挂载+输入窗内值
    switchTabFlushFirst('r1-y')
    mountPopups(annoY)
    typeWindowValue('Y窗内值')
    resolveX({ ok: true, data: { ...annoX, comment: 'X窗内值' } })
    await expect(closing).resolves.toBe(true)
    // close 恰消费 X（1 写=X 窗内值落库）；Y 未被 close 越权消费——新活动篇
    // 编辑器存续（窗内值由其自身 800ms timer 承接=非丢值面）
    expect(mocks.annoUpdate).toHaveBeenCalledTimes(1)
    expect(mocks.annoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ annotation: expect.objectContaining({ comment: 'X窗内值' }) })
    )
    const ta = host!.querySelector('textarea') as HTMLTextAreaElement
    expect(ta.value).toBe('Y窗内值')
    expect(confirmSpy).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('[回炉2 W-1] 关 A 在途窗内切 Y：Y 句柄失败不误归 A——零越权消费/零误脏/零 confirm，关闭按 A 自身态放行', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    useReaderStore.setState({
      tabs: { 'r2-a': makeTab('r2-a'), 'r2-y': makeTab('r2-y') },
      order: ['r2-a', 'r2-y'],
      activeId: 'r2-a'
    })
    let resolveX!: (v: string) => void
    const xFlight = new Promise<string>((r) => {
      resolveX = r
    })
    const xFlush = vi.fn(() => xFlight)
    const yFlush = vi.fn(async () => 'failed' as const)
    registerDraftFlush('anno-r2x', xFlush)
    try {
      const closing = requestCloseTab('r2-a')
      await drain(5)
      // 轮 0 已消费 X（快照时 active=A⇒句柄属 A——失败仍归 A 语义不变）
      expect(xFlush).toHaveBeenCalledTimes(1)
      // 窗内切 Y（direct activateTab——隔离 close 路径守卫面）+挂 Y 失败句柄
      useReaderStore.getState().activateTab('r2-y')
      registerDraftFlush('anno-r2y', yFlush)
      resolveX('saved')
      await expect(closing).resolves.toBe(true)
      expect(yFlush).not.toHaveBeenCalled()
      expect(useReaderStore.getState().tabs['r2-a']?.dirty).toBe(false)
      expect(confirmSpy).not.toHaveBeenCalled()
    } finally {
      unregisterDraftFlush('anno-r2x')
      unregisterDraftFlush('anno-r2y')
    }
    confirmSpy.mockRestore()
  })

  it('[回炉2 N-1] 恒 dirty 句柄：3 轮达顶→markTabDirty→confirmCloseDirty 承接（上限语义锁）', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    useReaderStore.setState({
      tabs: { 'r2-cap': makeTab('r2-cap') },
      order: ['r2-cap'],
      activeId: 'r2-cap'
    })
    const flush = vi.fn(async () => 'dirty' as const)
    registerDraftFlush('anno-r2cap', flush)
    try {
      await expect(requestCloseTab('r2-cap')).resolves.toBe(false)
      // 轮上限=3 恰锁（每轮全量 flush——dirty 终态续轮）
      expect(flush).toHaveBeenCalledTimes(3)
      expect(useReaderStore.getState().tabs['r2-cap']?.dirty).toBe(true)
      expect(confirmSpy).toHaveBeenCalledTimes(1)
    } finally {
      unregisterDraftFlush('anno-r2cap')
    }
    confirmSpy.mockRestore()
  })

  it('[轮2补遗 W-1] 末轮 await 窗切换+A saved+Y fresh 交叉：post-loop 不误归因——A 零误脏零 confirm 放行 true', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    useReaderStore.setState({
      tabs: { 'r2b-a': makeTab('r2b-a'), 'r2b-y': makeTab('r2b-y') },
      order: ['r2b-a', 'r2b-y'],
      activeId: 'r2b-a'
    })
    // A 句柄：轮 0/1 恒 dirty 续轮，轮 2（末轮）挂起待解——交叉窗载体
    let resolveThird!: (v: string) => void
    const thirdFlight = new Promise<string>((r) => {
      resolveThird = r
    })
    const aFlush = vi.fn()
      .mockReturnValueOnce(Promise.resolve('dirty' as const))
      .mockReturnValueOnce(Promise.resolve('dirty' as const))
      .mockReturnValueOnce(thirdFlight)
    registerDraftFlush('anno-r2ba', aFlush)
    const yFlush = vi.fn(async () => 'saved' as const)
    try {
      const closing = requestCloseTab('r2b-a')
      await drain(30)
      // 轮 0/1 已续轮、轮 2 顶部守卫已过（active=A）+第三发挂起
      expect(aFlush).toHaveBeenCalledTimes(3)
      // 末轮 await 窗内：切 Y+挂 Y 句柄（fresh 续轮源）——A 终态 saved
      useReaderStore.getState().activateTab('r2b-y')
      registerDraftFlush('anno-r2by', yFlush)
      resolveThird('saved')
      await expect(closing).resolves.toBe(true)
      // post-loop 达顶出口复检活动位：不误归因——Y 零越权消费+A 零误脏零 confirm
      expect(yFlush).not.toHaveBeenCalled()
      expect(useReaderStore.getState().tabs['r2b-a']?.dirty).toBe(false)
      expect(confirmSpy).not.toHaveBeenCalled()
    } finally {
      unregisterDraftFlush('anno-r2ba')
      unregisterDraftFlush('anno-r2by')
    }
    confirmSpy.mockRestore()
  })

  it('[P1-3] 同 ACTIVE tab 在途窗内新增编辑目标：fresh 续轮消费——Y 值已写+关闭 true 零 confirm', async () => {
    const annoY = annoOf('anno-r2cy', 'r2c-a')
    useReaderStore.setState({
      tabs: { 'r2c-a': makeTab('r2c-a', { annotations: [annoY] }) },
      order: ['r2c-a'],
      activeId: 'r2c-a'
    })
    let resolveX!: (v: string) => void
    const xFlight = new Promise<string>((r) => {
      resolveX = r
    })
    const xFlush = vi.fn(() => xFlight)
    const yFlush = vi.fn(async () => {
      await mocks.annoUpdate({ annotation: { ...annoY, comment: 'Y 同篇窗内值' } })
      return 'saved' as const
    })
    mocks.annoUpdate.mockResolvedValue({ ok: true, data: { ...annoY, comment: 'Y 同篇窗内值' } })
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    registerDraftFlush('anno-r2cx', xFlush)
    try {
      const closing = requestCloseTab('r2c-a')
      await drain(5)
      expect(xFlush).toHaveBeenCalledTimes(1)
      // await 窗内**同篇 A** 挂 Y 句柄（同 tab 内切编辑目标——activeId 不变）
      registerDraftFlush('anno-r2cy', yFlush)
      resolveX('saved')
      await expect(closing).resolves.toBe(true)
      // 复扫判 fresh 续轮→次轮真实消费 Y：恰 1 次+值已写
      expect(yFlush).toHaveBeenCalledTimes(1)
      expect(mocks.annoUpdate).toHaveBeenCalledTimes(1)
      expect(mocks.annoUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ annotation: expect.objectContaining({ comment: 'Y 同篇窗内值' }) })
      )
      expect(confirmSpy).not.toHaveBeenCalled()
    } finally {
      unregisterDraftFlush('anno-r2cx')
      unregisterDraftFlush('anno-r2cy')
    }
    confirmSpy.mockRestore()
  })

  it('[R3] 同步 throw 句柄：归 failed 映射→仍脏 confirm 显式放弃（零抛零静默放行）', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    useReaderStore.setState({
      tabs: { 'r1-t': makeTab('r1-t') },
      order: ['r1-t'],
      activeId: 'r1-t'
    })
    registerDraftFlush('anno-r1t', () => {
      throw new Error('sync boom')
    })
    try {
      await expect(requestCloseTab('r1-t')).resolves.toBe(false)
      expect(confirmSpy).toHaveBeenCalledTimes(1)
      expect(useReaderStore.getState().tabs['r1-t']?.dirty).toBe(true)
    } finally {
      unregisterDraftFlush('anno-r1t')
    }
    confirmSpy.mockRestore()
  })

  it('[R5 面1] 真实编辑器 un-attempted 窗内值→switchTabFlushFirst→值经句柄链立存（不阻切换）', async () => {
    const anno = annoOf('anno-r1f1', 'r1-fa')
    useReaderStore.setState({
      tabs: { 'r1-fa': makeTab('r1-fa', { annotations: [anno] }), 'r1-fb': makeTab('r1-fb') },
      order: ['r1-fa', 'r1-fb'],
      activeId: 'r1-fa'
    })
    mocks.annoUpdate.mockResolvedValue({ ok: true, data: { ...anno, comment: '切走窗内值' } })
    mountPopups(anno)
    typeWindowValue('切走窗内值')
    switchTabFlushFirst('r1-fb')
    // fire-first：切换同步完成不被写阻
    expect(useReaderStore.getState().activeId).toBe('r1-fb')
    await drain()
    expect(mocks.annoUpdate).toHaveBeenCalledTimes(1)
    expect(mocks.annoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ annotation: expect.objectContaining({ comment: '切走窗内值' }) })
    )
  })

  it('[R5 面3] 真实编辑器 un-attempted 窗内值→switchViewWithFlush→值经句柄链立存+setView 落位', async () => {
    const anno = annoOf('anno-r1f3', 'r1-f3')
    mocks.annoUpdate.mockResolvedValue({ ok: true, data: { ...anno, comment: '路由窗内值' } })
    mountPopups(anno)
    typeWindowValue('路由窗内值')
    const setView = vi.fn()
    switchViewWithFlush('reader', 'library', setView)
    expect(setView).toHaveBeenCalledWith('library')
    await drain()
    expect(mocks.annoUpdate).toHaveBeenCalledTimes(1)
    expect(mocks.annoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ annotation: expect.objectContaining({ comment: '路由窗内值' }) })
    )
  })

  it('[R7] clean 终态负向：句柄返 clean→放行 true 零 markTabDirty 零 confirm', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    useReaderStore.setState({
      tabs: { 'r1-c': makeTab('r1-c') },
      order: ['r1-c'],
      activeId: 'r1-c'
    })
    registerDraftFlush('anno-r1c', vi.fn(async () => 'clean' as const))
    try {
      await expect(requestCloseTab('r1-c')).resolves.toBe(true)
      expect(useReaderStore.getState().tabs['r1-c']?.dirty).toBe(false)
      expect(confirmSpy).not.toHaveBeenCalled()
    } finally {
      unregisterDraftFlush('anno-r1c')
    }
    confirmSpy.mockRestore()
  })
})
