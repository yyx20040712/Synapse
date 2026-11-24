// @vitest-environment jsdom
/**
 * [F-LGRAPH-01② RR 补批·RR14 → B4 L2 断言翻转] saving×切图互锁退役（设计稿
 * docs/design/2026-11-22_b4-save-undo-core-design.md §2.5 #32/§8.1、§12.2）：
 * per-folder 会话写链独立——A 的在飞写只回写 A，saving 不再阻切图；dirty 切图=
 * flush-first 挂起（不弹弃改框）。跨格：①saving 中入口可选+点击可达+即切
 * ②A 的迟到收尾只写挂起会话 ③flush 收尾后正常挂起切换 ④dirty 切图=落库原会话。
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
  lineage: { graph: vi.fn(), removeEdge: vi.fn() }
})

stubApiEvents({
  onFoldersChanged: () => () => undefined
})

import { NavGraphPicker } from '../../../src/renderer/features/lineage/nav-graph-picker'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { lineageRegistry } from '../../../src/renderer/features/lineage/lineage-session-registry'

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
  stubApi.lineage.removeEdge.mockReset()
  stubApi.folders.list.mockResolvedValue({
    ok: true,
    data: [folder('__main__', '主图'), folder('f-1', '调研计划')]
  })
  stubApi.lineage.graph.mockResolvedValue({
    ok: true,
    data: { nodes: [], edges: [], lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'] }
  })
  stubApi.lineage.removeEdge.mockResolvedValue({ ok: true, data: { ok: true } })
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

describe('[B4 L2] saving×切图：RR14 窗口禁切退役——切换不等 flush（§2.5 #32/§8.1）', () => {
  it('①saving 中入口可选+点击可达：activeFolder 即切 B；新会话 IO 不受 A 在飞写污染', async () => {
    await renderPicker()
    act(() => {
      useLineageStore.setState({ saveStatus: 'saving', flushing: true, inflight: { kind: 'write' } }) // A 在飞写（夹具面）
    })
    await settle()
    const btn = req('[data-testid="lineage-nav-graph"]') as HTMLButtonElement
    expect(btn.disabled).toBe(false) // [断言翻转] 禁切退役（import busy 仍是唯一禁用源）
    act(() => {
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(q('[data-testid="lineage-nav-graph-menu"]')).not.toBeNull() // 菜单可开（确认框不可达半程随之消亡）
    pickFolder('f-1')
    expect(useLineageStore.getState().folderId).toBe('f-1') // 即切（不等 A 的 flush 回执）
    await settle()
    expect(useLineageStore.getState().saveStatus).toBe('clean') // B 自身 IO 基线（A 的在飞写不外溢）
  })

  it('①b A 的在飞写收尾只回写挂起会话：迟到的 clean 化不改 B 投影', async () => {
    await renderPicker()
    act(() => {
      useLineageStore.setState({ saveStatus: 'saving', flushing: true, inflight: { kind: 'write' } })
    })
    await settle()
    openMenu()
    pickFolder('f-1')
    expect(useLineageStore.getState().folderId).toBe('f-1')
    act(() => {
      lineageRegistry.update('__main__', { saveStatus: 'clean', flushing: false, inflight: null }) // A 的 flush 收尾（挂起会话）
    })
    await settle()
    expect(useLineageStore.getState().folderId).toBe('f-1')
    expect(useLineageStore.getState().saveStatus).toBe('clean') // B 投影未被 A 的收尾改写
  })

  it('②flush 收尾后切图=正常挂起切换（互锁窗口退役的对称面）', async () => {
    await renderPicker()
    act(() => {
      useLineageStore.setState({ saveStatus: 'clean', flushing: false, inflight: null }) // flush 成功收尾
    })
    await settle()
    expect((req('[data-testid="lineage-nav-graph"]') as HTMLButtonElement).disabled).toBe(false)
    openMenu()
    pickFolder('f-1')
    await settle()
    expect(useLineageStore.getState().folderId).toBe('f-1')
    expect(stubApi.lineage.graph).toHaveBeenLastCalledWith({ folderId: 'f-1' })
  })

  it('③[断言翻转] dirty 切图=flush-first（原确认两分支退役）：不弹框+原会话暂存落库+切换即达', async () => {
    await renderPicker()
    act(() => {
      useLineageStore.setState({ saveStatus: 'dirty', queue: [{ kind: 'remove-edge', id: 'e-x' }] }) // A 待写（夹具面）
    })
    openMenu()
    expect(q('[data-testid="lineage-nav-graph-menu"]')).not.toBeNull() // dirty=入口可选
    pickFolder('f-1')
    expect(q('[role="dialog"]')).toBeNull() // 「未保存的修改」确认框退役（§6.1 删除面）
    expect(useLineageStore.getState().folderId).toBe('f-1')
    await settle()
    expect(stubApi.lineage.removeEdge).toHaveBeenCalledTimes(1) // flush-first：A 的暂存落库（非弃置）
  })
})
