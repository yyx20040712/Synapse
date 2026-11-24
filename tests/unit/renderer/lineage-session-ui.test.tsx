// @vitest-environment jsdom
/**
 * [F-LGRAPH-01②U1] 编辑会话 UI 接线锁定合约面——dirty 切图两分支（NavGraphPicker
 * 确认对话框）/LineagePage 挂载 scope 同步跳过（dirty 保留暂存图）/Ctrl+Z/Y
 * 键盘撤销重做（mockup §2.2/§2.6+A7）。
 * always-active 裸 describe（K3）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, stubApiEvents } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  lineage: { graph: vi.fn(), upsertNode: vi.fn(), removeNode: vi.fn(), upsertEdge: vi.fn(), removeEdge: vi.fn(), upsertLineTypes: vi.fn(), patchNode: vi.fn(), historyUnit: vi.fn() },
  folders: { list: vi.fn() },
  library: { list: vi.fn() }
})

import type { LineageEdge, LineageNode } from '../../../src/shared/models/lineage'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { NavGraphPicker } from '../../../src/renderer/features/lineage/nav-graph-picker'
import { echoHistoryUnit } from '../../utils/lineage-history-stub'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

stubApiEvents({ onFoldersChanged: () => () => undefined })

function edge(id: string, from: string, to: string): LineageEdge {
  return { id, fromNode: from, toNode: to, label: '', dashed: false, color: '#1e3a8a', createdAt: 't', updatedAt: 't' }
}

function node(id: string): LineageNode {
  return {
    id, paperId: `paper-${id}`, title: `节点${id}`, year: 2022,
    x: null, y: null, month: 9, slot: null, folderId: '__main__', createdAt: 't', updatedAt: 't'
  }
}

const settle = async (turns = 6): Promise<void> => {
  for (let i = 0; i < turns; i++) {
    await act(async () => { await Promise.resolve() })
  }
}

let root: Root | null = null
let host: HTMLDivElement | null = null

function mount(element: JSX.Element): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => { root?.render(element) })
}

const q = (sel: string): Element | null => host?.querySelector(sel) ?? null
const req = (sel: string): Element => {
  const el = q(sel)
  if (el === null) throw new Error(`元素未渲染：${sel}`)
  return el
}
const click = (el: Element): void => {
  act(() => { ;(el as HTMLElement).click() })
}

beforeEach(() => {
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.folders.list.mockReset()
  stubApi.library.list.mockReset()
  stubApi.lineage.graph.mockResolvedValue({
    ok: true,
    data: { nodes: [], edges: [], lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'] }
  })
  stubApi.lineage.upsertEdge.mockImplementation(async (req: { id?: string; from: string; to: string }) => ({ ok: true, data: edge(req.id ?? `e-${req.from}-${req.to}`, req.from, req.to) }))
  stubApi.folders.list.mockResolvedValue({
    ok: true,
    data: [{ id: '__main__', name: '主图' }, { id: 'f-x', name: '图乙' }]
  })
  useLineageStore.setState({
    nodes: [node('A')], edges: [], lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'],
    status: 'ready', error: null, saveStatus: 'clean', lastWriteError: null,
    queue: [], flushing: false, undoStack: [], redoStack: [], folderId: '__main__'
  })
  useLineageViewStore.setState({ mode: 'browse', focusSet: [], navCollapsed: false, navWidth: 208 })
})

afterEach(() => {
  act(() => { root?.unmount() })
  root = null
  host?.remove()
  host = null
})

describe('F-LGRAPH-01②U1 NavGraphPicker 切图（[B4 L2] dirty 弃改确认框退役——§2.5 #32 flush-first 挂起）', () => {
  const pick = (folderId: string): void => {
    click(req('[data-testid="lineage-nav-graph"]')) // 开下拉
    click(req(`[data-folder-id="${folderId}"]`)) // 选行
  }

  it('clean 切图=直切（无确认弹层）', async () => {
    mount(<NavGraphPicker />)
    await settle()
    pick('f-x')
    await settle()
    expect(useLineageStore.getState().folderId).toBe('f-x')
    expect(q('[role="dialog"]')).toBeNull()
  })

  it('[B4 L2 断言翻转] dirty 切图=flush-first：不弹弃改框——activeFolder 即切+原会话暂存落库；每图历史/U 驻留（返回恢复）', async () => {
    stubApi.lineage.patchNode.mockImplementation(async (req: Partial<LineageNode>) => ({ ok: true, data: { ...node(String(req.id)), ...req, updatedAt: 'server' } }))
    mount(<NavGraphPicker />)
    await settle()
    useLineageStore.getState().moveNode('A', 11, 11)
    useLineageStore.getState().drawEdge('A', 'Z', { dashed: false, color: '#1e3a8a', label: '', fromAnchor: { side: 'bottom', slot: 1 }, toAnchor: { side: 'top', slot: 1 } })
    expect(useLineageStore.getState().queue).toHaveLength(2)
    pick('f-x')
    // 同步段：不弹框+activeFolder 即切（不等回执）
    expect(q('[role="dialog"]')).toBeNull() // 「放弃修改」确认框退役（§6.1 删除面）
    expect(useLineageStore.getState().folderId).toBe('f-x')
    await settle()
    // flush-first：原会话（__main__）暂存全部落库（含画线）
    expect(stubApi.lineage.patchNode).toHaveBeenCalledTimes(1)
    expect(stubApi.lineage.upsertEdge).toHaveBeenCalledTimes(1)
    expect(useLineageStore.getState().folderId).toBe('f-x')
    expect(stubApi.lineage.graph).toHaveBeenLastCalledWith({ folderId: 'f-x' })
    expect(useLineageStore.getState().queue).toHaveLength(0) // 新会话自身队列空
    expect(useLineageStore.getState().saveStatus).toBe('clean')
    // 返回 __main__：历史/U 驻留恢复（未被弃置）
    useLineageStore.getState().setFolder('__main__')
    await settle()
    expect(useLineageStore.getState().undoStack).toHaveLength(2)
    expect(useLineageStore.getState().unfinalized).toBe(true)
    expect(useLineageStore.getState().nodes[0]).toMatchObject({ id: 'A', x: 11, y: 11 })
  })

  it('[B4 L2] dirty 同图重选=既有会话不双取（A2「同值重选=切图」原语义退役——§8.3）', async () => {
    stubApi.lineage.patchNode.mockImplementation(async (req: Partial<LineageNode>) => ({ ok: true, data: { ...node(String(req.id)), ...req, updatedAt: 'server' } }))
    mount(<NavGraphPicker />)
    await settle()
    useLineageStore.getState().moveNode('A', 12, 12)
    const undoBefore = useLineageStore.getState().undoStack.length
    const calls = stubApi.lineage.graph.mock.calls.length
    pick('__main__') // 同值重选
    await settle()
    expect(q('[role="dialog"]')).toBeNull()
    expect(useLineageStore.getState().folderId).toBe('__main__')
    expect(stubApi.lineage.graph.mock.calls.length).toBe(calls) // 零 graph IPC
    expect(useLineageStore.getState().undoStack).toHaveLength(undoBefore) // 暂存驻留
    expect(stubApi.lineage.patchNode).toHaveBeenCalledTimes(1) // flush-first 落库
  })
})

describe('F-LGRAPH-01②U1 Ctrl+Z/Y 键盘接线（LineagePage 挂载——§2.2 撤销/重做）', () => {
  // [B4 L1 §10.3 迁移——主控终裁 5] edit/browse/focus 三模式统一生效（原「仅 edit」
  // mode 门退役）；undo/redo=async history-unit（await 真实链结果）。
  // 切图两分支（flush-first 挂起）属 L2 registry 面——本件不迁。
  async function mountPage(): Promise<void> {
    const { LineagePage } = await import('../../../src/renderer/features/lineage/LineagePage')
    mount(<LineagePage />)
    await settle()
  }

  const key = async (k: string, opts: KeyboardEventInit = {}): Promise<void> => {
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...opts }))
    })
    await settle()
  }
  /** 键盘面数据：节点 A+两次移动（甲 21、乙 22）+history-unit/patch-node 回显桩 */
  const seedKeys = (): void => {
    stubApi.lineage.patchNode.mockImplementation(async (req: Partial<LineageNode>) =>
      ({ ok: true, data: { ...node(String(req.id)), ...req, updatedAt: 'server' } })
    )
    stubApi.lineage.historyUnit.mockImplementation(echoHistoryUnit)
    useLineageStore.setState({ nodes: [node('A')], status: 'ready', saveStatus: 'clean', queue: [], flushing: false, inflight: null, undoStack: [], redoStack: [] })
    useLineageStore.getState().moveNode('A', 21, 21)
    useLineageStore.getState().moveNode('A', 22, 22)
    expect(useLineageStore.getState().nodes[0]?.x).toBe(22)
  }

  it('edit 模式 Ctrl+Z=undo / Ctrl+Y=redo；输入焦点内不拦截（文本编辑原生撤销）', async () => {
    await mountPage()
    useLineageViewStore.getState().setMode('edit')
    seedKeys()
    await key('z', { ctrlKey: true })
    expect(useLineageStore.getState().nodes[0]?.x).toBe(21) // 撤销一步
    await key('y', { ctrlKey: true })
    expect(useLineageStore.getState().nodes[0]?.x).toBe(22) // 重做
    // 输入焦点内=原生文本撤销（textarea 内 Ctrl+Z 不接管图历史）
    useLineageViewStore.getState().setMode('browse')
    const ta = document.createElement('textarea')
    document.body.appendChild(ta)
    try {
      ta.focus()
      await act(async () => {
        ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true }))
      })
      await settle()
      expect(useLineageStore.getState().nodes[0]?.x).toBe(22) // 图历史未动
    } finally {
      ta.remove()
    }
  })

  it('[B4 L1 翻转] browse/focus 模式 Ctrl+Z/Y 同样生效（三模式统一——原「非 edit 不接」退役）', async () => {
    await mountPage()
    seedKeys()
    useLineageViewStore.getState().setMode('browse')
    await key('z', { ctrlKey: true })
    expect(useLineageStore.getState().nodes[0]?.x).toBe(21) // browse 下撤销一步（原断言=保持 22）
    useLineageViewStore.getState().setMode('focus')
    await key('z', { ctrlKey: true })
    expect(useLineageStore.getState().nodes[0]?.x).toBe(null) // focus 下再撤销一步（回夹具初值）
    await key('y', { ctrlKey: true })
    expect(useLineageStore.getState().nodes[0]?.x).toBe(21) // focus 下重做
  })

  it('edit 模式 Ctrl+Shift+Z=redo（ln-W3b-2——与阅读器 AnnotationEditor 同语义约定）', async () => {
    await mountPage()
    useLineageViewStore.getState().setMode('edit')
    seedKeys()
    await key('z', { ctrlKey: true })
    expect(useLineageStore.getState().nodes[0]?.x).toBe(21) // 撤销一步
    await key('Z', { ctrlKey: true, shiftKey: true }) // Ctrl+Shift+Z
    expect(useLineageStore.getState().nodes[0]?.x).toBe(22) // =重做（HEAD 误落 undo 即红）
  })

  it('[B4 L1] Ctrl+S=显式保存（finalize）：落库+清 redo+U 清、undo 保留；悬浮笔记编辑焦点内同样接管', async () => {
    await mountPage()
    seedKeys()
    useLineageViewStore.getState().setMode('browse')
    await key('z', { ctrlKey: true }) // 产生 redo 分支
    expect(useLineageStore.getState().redoStack).toHaveLength(1)
    expect(useLineageStore.getState().unfinalized).toBe(true)
    await key('s', { ctrlKey: true })
    expect(stubApi.lineage.patchNode).toHaveBeenCalledTimes(1) // drain 落库
    expect(useLineageStore.getState().saveStatus).toBe('clean')
    expect(useLineageStore.getState().unfinalized).toBe(false) // 定稿清 U
    expect(useLineageStore.getState().redoStack).toHaveLength(0) // 清 redo
    expect(useLineageStore.getState().undoStack).toHaveLength(1) // undo 保留（甲单元；乙已 undo 入 redo 后被清）
    await key('z', { ctrlKey: true }) // 定稿后仍可继续 undo（对 DB 的新反向写）
    expect(useLineageStore.getState().nodes[0]?.x).toBe(null)
    expect(useLineageStore.getState().unfinalized).toBe(true) // undo 重新置 U
  })
})
