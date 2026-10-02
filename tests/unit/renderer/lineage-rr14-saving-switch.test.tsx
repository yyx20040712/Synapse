// @vitest-environment jsdom
/**
 * [F-LGRAPH-01② RR 补批·RR14] saving×切图互锁（裁决部 RR14/v107 §4——
 * 本批首项）：flushing/saving 态禁切图（NavGraphPicker 入口禁用+禁用态样式
 * 沿承 .nav-graph-btn:disabled+确认框不可达）——「禁」径消解在飞写 IPC 竞态
 * 半程；flush 收尾无条件 set clean 与确认框「不落库」承诺冲突半程同径消解。
 * 跨格：①saving 禁②flush 收尾恢复③dirty（非 saving）确认分支不受影响。
 * always-active 裸 describe（K3）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, stubApiEvents } from '../../utils/api-client-mock'

type Folder = { id: string; name: string; position: number; paperCount: number }
const folder = (id: string, name: string): Folder => ({ id, name, position: 0, paperCount: 0 })

const stubApi = makeApiStub({
  folders: { list: vi.fn() },
  lineage: { graph: vi.fn() }
})

/** folders.changed 订阅捕获（S3/S4 驱动面——NavGraphPicker 挂载即订阅） */
stubApiEvents({
  onFoldersChanged: () => () => undefined
})

import { NavGraphPicker } from '../../../src/renderer/features/lineage/nav-graph-picker'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let host: HTMLDivElement | null = null

const settle = async (turns = 6): Promise<void> => {
  for (let i = 0; i < turns; i += 1) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

async function renderPicker(): Promise<void> {
  await act(async () => {
    root?.render(<NavGraphPicker />)
  })
  await settle()
}

const q = (sel: string): Element | null => host?.querySelector(sel) ?? null
const req = (sel: string): Element => {
  const el = q(sel)
  if (el === null) throw new Error(`元素未渲染：${sel}`)
  return el
}

const openMenu = (): void => {
  act(() => {
    req('[data-testid="lineage-nav-graph"]').dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    )
  })
}

const pickFolder = (id: string): void => {
  act(() => {
    req(`[data-testid="lineage-nav-graph-menu"] [data-folder-id="${id}"]`).dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    )
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  stubApi.folders.list.mockReset()
  stubApi.lineage.graph.mockReset()
  stubApi.folders.list.mockResolvedValue({
    ok: true,
    data: [folder('__main__', '主图'), folder('f-1', '调研计划')]
  })
  stubApi.lineage.graph.mockResolvedValue({
    ok: true,
    data: { nodes: [], edges: [], lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'] }
  })
  useLineageStore.setState({
    nodes: [],
    edges: [],
    status: 'ready',
    error: null,
    saveStatus: 'clean',
    lastWriteError: null,
    queue: [],
    flushing: false,
    undoStack: [],
    redoStack: [],
    folderId: '__main__'
  })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  host?.remove()
  root = null
  host = null
})

describe('RR14 saving×切图互锁（flushing 态禁切图——跨格①②③）', () => {
  it('①saving 中切图入口 disabled+点击不可达：菜单不展开（确认框不可达半程同消）', async () => {
    await renderPicker()
    act(() => {
      useLineageStore.setState({ saveStatus: 'saving' })
    })
    await settle()
    const btn = req('[data-testid="lineage-nav-graph"]') as HTMLButtonElement
    expect(btn.disabled).toBe(true) // 入口禁用（disabled 态样式=CSS :disabled 沿承）
    // 点击不可达：dispatchEvent 不拦 disabled（jsdom）——处理器层同闸后菜单不开
    act(() => {
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(q('[data-testid="lineage-nav-graph-menu"]')).toBeNull() // 菜单不可达
    expect(q('[role="dialog"]')).toBeNull() // 确认框不可达（在飞写×「不落库」承诺冲突半程消解）
    expect(useLineageStore.getState().folderId).toBe('__main__') // 未切图
  })

  it('①b saving 上升沿收起已开浮层：dirty 挂起确认框 →saving 起态=菜单+确认框均收', async () => {
    await renderPicker()
    act(() => {
      useLineageStore.setState({ saveStatus: 'dirty' })
    })
    openMenu()
    expect(q('[data-testid="lineage-nav-graph-menu"]')).not.toBeNull()
    pickFolder('f-1') // dirty=挂起确认
    expect(q('[role="dialog"]')).not.toBeNull()
    act(() => {
      useLineageStore.setState({ saveStatus: 'saving' }) // flush 起态（跨格过渡）
    })
    await settle()
    expect(q('[data-testid="lineage-nav-graph-menu"]')).toBeNull() // 浮层收
    expect(q('[role="dialog"]')).toBeNull() // 挂起确认框收（不可达绝对化）
    expect(useLineageStore.getState().folderId).toBe('__main__')
  })

  it('②flush 收尾后恢复可选：saving→clean=按钮复可点+切图直达（互锁为窗口期闸）', async () => {
    await renderPicker()
    act(() => {
      useLineageStore.setState({ saveStatus: 'saving' })
    })
    await settle()
    expect((req('[data-testid="lineage-nav-graph"]') as HTMLButtonElement).disabled).toBe(true)
    act(() => {
      useLineageStore.setState({ saveStatus: 'clean', flushing: false }) // flush 成功收尾
    })
    await settle()
    const btn = req('[data-testid="lineage-nav-graph"]') as HTMLButtonElement
    expect(btn.disabled).toBe(false) // 恢复可选
    openMenu()
    pickFolder('f-1')
    await settle()
    expect(useLineageStore.getState().folderId).toBe('f-1') // 正常切图恢复
    expect(stubApi.lineage.graph).toHaveBeenLastCalledWith({ folderId: 'f-1' })
  })

  it('③dirty（非 saving）切图确认分支不受影响（既有行为回归锚）：挂起确认+取消留守', async () => {
    await renderPicker()
    act(() => {
      useLineageStore.setState({ saveStatus: 'dirty' })
    })
    openMenu()
    expect(q('[data-testid="lineage-nav-graph-menu"]')).not.toBeNull() // dirty=入口可选
    pickFolder('f-1')
    const dialog = q('[role="dialog"]')
    expect(dialog).not.toBeNull() // 确认分支在场（互锁不外溢）
    expect(dialog?.textContent).toContain('未保存')
    const cancel = [...(dialog?.querySelectorAll('button') ?? [])].find((b) => b.textContent === '取消')
    expect(cancel).toBeDefined()
    act(() => {
      cancel!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await settle()
    expect(useLineageStore.getState().folderId).toBe('__main__') // 取消=留守
    expect(q('[role="dialog"]')).toBeNull()
  })
})
