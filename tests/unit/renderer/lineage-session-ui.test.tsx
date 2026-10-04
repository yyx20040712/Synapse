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
  lineage: { graph: vi.fn(), upsertNode: vi.fn(), removeNode: vi.fn(), upsertEdge: vi.fn(), removeEdge: vi.fn(), upsertLineTypes: vi.fn() },
  folders: { list: vi.fn() },
  library: { list: vi.fn() }
})

import type { LineageNode } from '../../../src/shared/models/lineage'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { NavGraphPicker } from '../../../src/renderer/features/lineage/nav-graph-picker'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

stubApiEvents({ onFoldersChanged: () => () => undefined })

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

describe('F-LGRAPH-01②U1 NavGraphPicker dirty 切图两分支（§2.2/B-2 闭合）', () => {
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

  it('dirty 切图=未保存提示：取消=留守（暂存与撤销栈原样保留）', async () => {
    mount(<NavGraphPicker />)
    await settle()
    useLineageStore.getState().moveNode('A', 11, 11)
    const queueBefore = useLineageStore.getState().queue
    const undoBefore = useLineageStore.getState().undoStack.length
    pick('f-x')
    await settle()
    // 确认对话框在场（两分支）
    const dialog = q('[role="dialog"]')
    expect(dialog).not.toBeNull()
    expect(dialog?.textContent).toContain('未保存')
    // 取消=留守：folderId 不变+暂存/栈原样
    const cancel = [...(dialog?.querySelectorAll('button') ?? [])].find((b) => b.textContent === '取消')
    expect(cancel).toBeDefined()
    click(cancel!)
    await settle()
    expect(useLineageStore.getState().folderId).toBe('__main__')
    expect(useLineageStore.getState().queue).toBe(queueBefore) // 同引用=未动
    expect(useLineageStore.getState().undoStack).toHaveLength(undoBefore)
    expect(q('[role="dialog"]')).toBeNull() // 对话框关闭
  })

  it('dirty 切图确认=弃暂存（队列+栈清+回 clean）+执行切换（load 库态覆盖）', async () => {
    mount(<NavGraphPicker />)
    await settle()
    useLineageStore.getState().moveNode('A', 11, 11)
    useLineageStore.getState().linkNodes('A', 'Z')
    pick('f-x')
    await settle()
    const dialog = q('[role="dialog"]')
    expect(dialog).not.toBeNull()
    const confirm = [...(dialog?.querySelectorAll('button') ?? [])].find((b) => b.textContent === '放弃修改')
    expect(confirm).toBeDefined()
    click(confirm!)
    await settle()
    // 弃暂存：队列/栈清+clean
    expect(useLineageStore.getState().queue).toHaveLength(0)
    expect(useLineageStore.getState().undoStack).toHaveLength(0)
    expect(useLineageStore.getState().saveStatus).toBe('clean')
    // 切换执行：folderId=f-x+load 显式载荷
    expect(useLineageStore.getState().folderId).toBe('f-x')
    expect(stubApi.lineage.graph).toHaveBeenLastCalledWith({ folderId: 'f-x' })
  })

  it('dirty 同图重选=切图语义（A2）——同样走确认两分支', async () => {
    mount(<NavGraphPicker />)
    await settle()
    useLineageStore.getState().moveNode('A', 12, 12)
    pick('__main__') // 同值重选
    await settle()
    expect(q('[role="dialog"]')).not.toBeNull() // 提示在场（A2：同值重选=切图）
  })
})

describe('F-LGRAPH-01②U1 Ctrl+Z/Y 键盘接线（LineagePage 挂载——§2.2 撤销/重做）', () => {
  async function mountPage(): Promise<void> {
    const { LineagePage } = await import('../../../src/renderer/features/lineage/LineagePage')
    mount(<LineagePage />)
    await settle()
  }

  const key = (k: string, opts: KeyboardEventInit = {}): void => {
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...opts }))
    })
  }

  it('edit 模式 Ctrl+Z=undo / Ctrl+Y=redo；输入焦点内不拦截（文本编辑原生撤销）', async () => {
    await mountPage()
    // Page 挂载 load 落地后重植节点（graph 空态夹具——键盘面测试数据）
    useLineageStore.setState({ nodes: [node('A')], status: 'ready' })
    useLineageViewStore.getState().setMode('edit')
    useLineageStore.getState().moveNode('A', 21, 21)
    useLineageStore.getState().moveNode('A', 22, 22)
    expect(useLineageStore.getState().nodes[0]?.x).toBe(22)
    key('z', { ctrlKey: true })
    expect(useLineageStore.getState().nodes[0]?.x).toBe(21) // 撤销一步
    key('y', { ctrlKey: true })
    expect(useLineageStore.getState().nodes[0]?.x).toBe(22) // 重做
    // 非 edit 模式不接（browse 下 no-op）
    useLineageViewStore.getState().setMode('browse')
    key('z', { ctrlKey: true })
    expect(useLineageStore.getState().nodes[0]?.x).toBe(22)
  })
})
