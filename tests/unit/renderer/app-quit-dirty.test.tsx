// @vitest-environment jsdom
/**
 * [P7-C 崩溃回归锁] App 组合根 hook 链稳定性 —— tab dirty 翻转序列。
 *
 * 背景（2026-08-27 e2e reader-text.spec P7-C 稳定崩溃根因）：App.tsx 曾把
 * 退出拦截聚合写成 `useTabDirtyAggregate() || useLineageDirty()`——`||`
 * 短路求值使 useLineageDirty 在 tab dirty=true 的渲染中缺席（Rules of
 * Hooks 违规：同一 fiber 两次渲染 hooks 数量不同）。生产 bundle 无 dev
 * 警告（fewer-hooks 检查 __DEV__ only），commit 阶段 updateEffect 对上
 * 错位的 prev hook 产物（zustand 订阅对象，无 deps 字段）→
 * areHookInputsEqual 崩 "Cannot read properties of undefined (reading
 * 'length')" → App fiber 无边界自捕 → 整树卸载（#root 空）。触发沿=
 * P7-C fill('笔记正文') → notes pending 翻转 → aggregate=true。
 *
 * 组件级 614 用例全绿的原因：无人构造「aggregate false→true」翻转序列
 * （lineage-board.test.tsx 的 INV-22 用例走 lineage-dirty 路径，aggregate
 * 恒 false 不触发短路）。本用例锁该序列：
 * - dev 探针：console.error 无 'Rendered fewer hooks'（错位必出此警告）
 * - 崩溃自证：错位 TypeError 上抛则本用例直接失败（无边界兜底）
 * - 行为面：dirty 仍沿 system/set-quit-dirty 上报（修复不改变语义）
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, stubApiEvents } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  lineage: {
    graph: vi.fn(),
    upsertNode: vi.fn(),
    removeNode: vi.fn(),
    upsertEdge: vi.fn(),
    removeEdge: vi.fn()
  },
  library: { list: vi.fn() },
  system: { setQuitDirty: vi.fn(), windowControl: vi.fn() }
})
stubApiEvents({
  onExportCorpus: vi.fn(() => () => undefined),
  onImportProgress: vi.fn(() => () => undefined)
})

import { App } from '../../../src/renderer/app/App'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import { useNotesStore } from '../../../src/renderer/features/notes/notes.store'
import { setNoteDraftPending } from '../../../src/renderer/features/lineage/lineage-note-draft'
import { useSaveAggregates } from '../../../src/renderer/app/use-save-aggregates'
import { makeTab } from '../../utils/factories'

let root: Root | null = null
let host: HTMLDivElement | null = null

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
  vi.clearAllMocks()
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.library.list.mockReset()
  stubApi.system.setQuitDirty.mockReset()
  stubApi.system.windowControl.mockReset()
  // App.tsx 组合根直用 window.api.system（非 client 门面）——jsdom 下 stub
  // （lineage-board.test.tsx 同型；R2-SH3：+windowControl/onWindowState）
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: {
      system: { setQuitDirty: stubApi.system.setQuitDirty, windowControl: stubApi.system.windowControl }
    }
  })
  Object.defineProperty(window, 'apiEvents', {
    configurable: true,
    value: { onWindowState: vi.fn(() => () => undefined) }
  })
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [], edges: [] } })
  stubApi.library.list.mockResolvedValue({ ok: true, data: { items: [], total: 0 } })
  stubApi.system.setQuitDirty.mockResolvedValue({ ok: true, data: { ok: true } })
  stubApi.system.windowControl.mockResolvedValue({ ok: true, data: { ok: true, maximized: false } })
  // 模块级 store 常驻：跨用例状态复位
  useReaderStore.setState({ tabs: {}, order: [], activeId: null })
  useNotesStore.setState({ noteByPaper: {} })
  // [F-VISFB-63 R5] 注册族模块级单例复位（防 pending 跨用例泄漏）
  setNoteDraftPending(false)
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  setNoteDraftPending(false)
})

describe('App 组合根 —— hook 链稳定性（P7-C 崩溃回归锁）', () => {
  it('tab dirty false→true 翻转（notes pending 沿）无 fewer-hooks 错位且 dirty 仍上报', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      // 初始全 clean：aggregate=false，useLineageDirty 参与本次 hook 链
      mount(<App />)
      // P7-C fill('笔记正文') 的真实驱动链：notes pending 翻转 → aggregate
      // =true →（缺陷形态）短路 useLineageDirty → hooks 数量变少
      act(() => {
        useReaderStore.setState({ order: ['p1'] })
        useNotesStore.setState({
          noteByPaper: {
            p1: { contentMd: 'e2e 总评内容', saving: false, savedAt: null, pending: true, saveFailed: false }
          }
        })
      })
      await flush()
      // 行为面：或聚合语义不因修复漂移——dirty=true 仍上报 main
      const calls = stubApi.system.setQuitDirty.mock.calls
      expect(calls.length).toBeGreaterThanOrEqual(2)
      // [F-FOLDER-01] INV-91：同载荷加报 lineagePending（tab dirty 沿=恒 false）
      expect(calls[calls.length - 1]?.[0]).toEqual({ dirty: true, lineagePending: false })
      // dev 探针：hook 错位必出 dev 警告（生产 build 无警告直接崩——组件级
      // 用例只能经 dev 探针锁住同一缺陷）
      const fewer = errSpy.mock.calls.filter((a) => String(a[0]).includes('Rendered fewer hooks'))
      expect(fewer).toEqual([])
    } finally {
      errSpy.mockRestore()
    }
  })

  it('[F-VISFB-63] noteDraft 并入 quitDirty 聚合：pending 翻真 push dirty=true，收口清 push false', async () => {
    mount(<App />)
    await flush()
    const before = stubApi.system.setQuitDirty.mock.calls.length
    act(() => {
      setNoteDraftPending(true)
    })
    await flush()
    const calls = stubApi.system.setQuitDirty.mock.calls
    expect(calls.length).toBeGreaterThan(before)
    expect(calls[calls.length - 1]?.[0]).toEqual({ dirty: true, lineagePending: false })
    act(() => {
      setNoteDraftPending(false)
    })
    await flush()
    const calls2 = stubApi.system.setQuitDirty.mock.calls
    expect(calls2[calls2.length - 1]?.[0]).toEqual({ dirty: false, lineagePending: false })
  })

  it('[B4-A R2 §2.5 #37/INV-22] U=1 且 Q0：quitDirty=false（灰点不卡退出）；notes Q1 翻真 dirty=true', async () => {
    mount(<App />)
    await flush()
    // U=1/Q0：灰点在、待写零——上报 clean
    act(() => {
      useReaderStore.setState({ tabs: { p1: makeTab('p1') }, order: ['p1'], activeId: 'p1' })
    })
    act(() => {
      useReaderStore.getState().markTabUnfinalized('p1')
    })
    await flush()
    expect(stubApi.system.setQuitDirty.mock.calls.at(-1)?.[0]).toEqual({ dirty: false, lineagePending: false })
    // Q1（notes pending=真实待写）：dirty=true（IO 单源）
    act(() => {
      useNotesStore.setState({
        noteByPaper: {
          p1: { contentMd: 'e2e 总评内容', saving: false, savedAt: null, pending: true, saveFailed: false }
        }
      })
    })
    await flush()
    expect(stubApi.system.setQuitDirty.mock.calls.at(-1)?.[0]).toEqual({ dirty: true, lineagePending: false })
  })
})

// ── [B4-A R2 §15 聚合单源→B4 L1 接管真实 lineage U] useSaveAggregates 分列
// （[B4 L1] R2 占位常量断言随占位常量删除；lineage U 真值接线面=
// rail-unfinalized-badge「聚合输入=真实 lineage U」）──
describe('useSaveAggregates —— IO quitDirty/U 角标/lineagePending 分列（B4-A R2 §10.1）', () => {
  function mountProbe(): () => ReturnType<typeof useSaveAggregates> {
    let value: ReturnType<typeof useSaveAggregates> | null = null
    function Probe(): JSX.Element {
      value = useSaveAggregates()
      return <span />
    }
    mount(<Probe />)
    return () => value!
  }

  it('聚合分列：U=1/Q0 → quitDirty=false+readerUnfinalized=true+lineageUnfinalized=false；IO Q1 → quitDirty=true', () => {
    const read = mountProbe()
    act(() => {
      useReaderStore.setState({ tabs: { p1: makeTab('p1') }, order: ['p1'], activeId: null })
    })
    act(() => {
      useReaderStore.getState().markTabUnfinalized('p1')
    })
    expect(read()).toEqual({ quitDirty: false, readerUnfinalized: true, lineageUnfinalized: false, lineagePending: false })
    act(() => {
      useNotesStore.setState({
        noteByPaper: { p1: { contentMd: 'x', saving: false, savedAt: null, pending: true, saveFailed: false } }
      })
    })
    expect(read().quitDirty).toBe(true)
  })

  it('lineagePending=lineage 实际待写（Q∨F——[B5 设计稿 §7 C2=B 断言翻转] 相位不再是输入）——U/reader 面不参与', async () => {
    const { useLineageStore } = await import('../../../src/renderer/features/lineage/lineage.store')
    const read = mountProbe()
    expect(read().lineagePending).toBe(false)
    // [B5 C2=B 断言翻转] 原「只置 saveStatus=dirty 即 true」→ Q0/F0 只置相位=无实际待写，不上报
    act(() => {
      useLineageStore.setState({ saveStatus: 'dirty' })
    })
    expect(read().lineagePending).toBe(false)
    // 真实 Q1（实际待写）才上报；Q0/F0 error 的两假判别例见 lineage-io-unsettled-two-source.test.tsx
    act(() => {
      useLineageStore.setState({ saveStatus: 'dirty', queue: [{ kind: 'remove-edge', id: 'e-pending' }] })
    })
    expect(read().lineagePending).toBe(true)
    act(() => {
      useLineageStore.setState({ saveStatus: 'clean', queue: [] })
    })
    expect(read().lineagePending).toBe(false)
  })
})

describe('App 装配 —— reader 角标 props 注入（§10.1「App/Rail 通过 props 接收两个 OR 布尔」）', () => {
  it('reader tab U=1 → rail-reader-dot 在场；清账（revision 匹配）后缺席', async () => {
    mount(<App />)
    await flush()
    expect(document.querySelector('[data-testid="rail-reader-dot"]')).toBeNull()
    await act(async () => {
      useReaderStore.setState({
        tabs: { 'p-rail-u': makeTab('p-rail-u') },
        order: ['p-rail-u'],
        activeId: 'p-rail-u'
      })
      useReaderStore.getState().markTabUnfinalized('p-rail-u')
    })
    expect(document.querySelector('[data-testid="rail-reader-dot"]')).not.toBeNull()
    await act(async () => {
      useReaderStore.getState().finalizeTabUnfinalized('p-rail-u', 1)
    })
    expect(document.querySelector('[data-testid="rail-reader-dot"]')).toBeNull()
  })
})

// ── [回炉 W-D1·T-B02] 设计稿 §12.2 行 803 增补：多 folder OR。既有例只经活动会话置相位；
//    本段的 IO 落在挂起会话上（活动会话全程 clean）——聚合必须读全 registry（§2.5 #37「任一会话
//    IO 未落定」、use-save-aggregates 头注「不以活动投影代替全集」）。断言面=App 组合根实际上报载荷。
describe('多 folder OR：挂起会话的 IO 驱动 quitDirty／lineagePending（§2.5 #37、§10.1——[回炉 W-D1]）', () => {
  const lastReport = (): unknown => stubApi.system.setQuitDirty.mock.calls.at(-1)?.[0]
  const CLEAN = { dirty: false, lineagePending: false }
  const PENDING = { dirty: true, lineagePending: true }
  /** 挂起会话 f-b 经 registry 正式入口建立（ready、一节点）；活动会话=主图且 clean。返回 registry 单例（类型由模块导出推断） */
  const seedSuspended = async () => {
    const { lineageRegistry } = await import('../../../src/renderer/features/lineage/lineage-session-registry')
    const { useLineageStore } = await import('../../../src/renderer/features/lineage/lineage.store')
    const { resetLineageSessionsForTests } = await import('./lineage-test-session-reset')
    resetLineageSessionsForTests()
    useLineageStore.setState({ nodes: [], edges: [], status: 'ready', saveStatus: 'clean', queue: [], flushing: false, inflight: null })
    lineageRegistry.ensure('f-b')
    lineageRegistry.update('f-b', {
      nodes: [{ id: 'B1', paperId: 'paper-B1', title: '节点B1', year: 2022, x: 1, y: 1, month: 9, slot: 0, folderId: 'f-b', createdAt: 't', updatedAt: 't' }],
      status: 'ready'
    })
    return lineageRegistry
  }
  /** patch-node 桩挂到 api 桩位（本文件桩形状未含该通道——挂起会话 flush 的写回显面） */
  const patchStub = async (): Promise<ReturnType<typeof vi.fn>> => {
    const fn = vi.fn(async (req: { id?: string; x?: number; y?: number }) => ({
      ok: true as const,
      data: { id: String(req.id), paperId: `paper-${String(req.id)}`, title: '节点', year: 2022, x: req.x, y: req.y, month: 9, slot: 0, folderId: 'f-b', createdAt: 't', updatedAt: 'server' }
    }))
    ;(stubApi.lineage as unknown as { patchNode: ReturnType<typeof vi.fn> }).patchNode = fn
    return fn
  }

  it('活动会话 clean、挂起会话 Q=1：上报两真；挂起写落库后回到两假', async ({ onTestFinished }) => {
    const { resetLineageSessionsForTests } = await import('./lineage-test-session-reset')
    onTestFinished(() => resetLineageSessionsForTests())
    await patchStub()
    mount(<App />)
    await flush()
    expect(lastReport(), '前提：全 registry clean').toEqual(CLEAN)
    const registry = await seedSuspended()
    await flush()
    expect(lastReport()).toEqual(CLEAN) // 仅建立会话不产生 IO
    act(() => {
      registry.lane('f-b').commands.moveNode('B1', 20, 20) // 挂起会话：Q=1（活动会话仍 clean）
    })
    await flush()
    expect(registry.entry('__main__')!.data.saveStatus).toBe('clean')
    expect(lastReport(), '挂起会话的待写计入 OR').toEqual(PENDING)
    await act(async () => {
      await registry.lane('f-b').save()
    })
    await flush()
    expect(lastReport(), '挂起写落库后 OR 归零（U 不入）').toEqual(CLEAN)
  })

  it('挂起会话写 IPC 在途（F≠0）→两真；在途以系统失败收场（error 相位、失败写保留）→仍两真', async ({ onTestFinished }) => {
    const { resetLineageSessionsForTests } = await import('./lineage-test-session-reset')
    let release: ((v: { ok: false; error: { code: string; message: string } }) => void) | null = null
    // 收尾（断言先红时同样执行）：未放行的在途写以系统失败收束、不留悬挂写链，再清出会话
    onTestFinished(() => {
      release?.({ ok: false, error: { code: 'DB_ERROR', message: '挂起写失败' } })
      resetLineageSessionsForTests()
    })
    const patch = await patchStub()
    patch.mockImplementationOnce(() => new Promise((r) => { release = r }))
    mount(<App />)
    await flush()
    const registry = await seedSuspended()
    act(() => {
      registry.lane('f-b').commands.moveNode('B1', 20, 20)
      void registry.lane('f-b').save()
    })
    await flush()
    expect(patch).toHaveBeenCalledTimes(1)
    expect(registry.entry('f-b')!.data.inflight?.kind).toBe('write') // 前提：挂起会话写在途
    expect(lastReport(), '挂起会话的在途写计入 OR').toEqual(PENDING)
    await act(async () => {
      release?.({ ok: false, error: { code: 'DB_ERROR', message: '挂起写失败' } })
      await flush()
    })
    await flush()
    expect(registry.entry('f-b')!.data.saveStatus).toBe('error')
    expect(registry.entry('f-b')!.data.queue).toHaveLength(1)
    expect(lastReport(), '挂起会话的失败写计入 OR').toEqual(PENDING)
  })

  it('对照：挂起会话仅 U=1（有撤销历史、IO clean）→两假（聚合读 IO，不读 U／历史）', async ({ onTestFinished }) => {
    const { resetLineageSessionsForTests } = await import('./lineage-test-session-reset')
    onTestFinished(() => resetLineageSessionsForTests())
    await patchStub()
    mount(<App />)
    await flush()
    const registry = await seedSuspended()
    act(() => {
      registry.lane('f-b').commands.moveNode('B1', 20, 20)
    })
    await act(async () => {
      await registry.lane('f-b').save()
    })
    await flush()
    const b = registry.entry('f-b')!.data
    expect({ undo: b.undoStack.length, unfinalized: b.unfinalized, phase: b.saveStatus, queue: b.queue.length }).toEqual({ undo: 1, unfinalized: true, phase: 'clean', queue: 0 })
    expect(lastReport(), 'U/历史不是 IO：不入聚合').toEqual(CLEAN)
  })
})
