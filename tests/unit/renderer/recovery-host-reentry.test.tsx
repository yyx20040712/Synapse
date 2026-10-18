// @vitest-environment jsdom
/**
 * [F-VISFB-65 回炉轮2 Z5] wsError 迁移不重入屏障——屏障触发只认 wsCurrentId
 * 变化；wsError 仅在 currentId 尚空（首次未读到）时参与放行。always-active。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  workspaces: { list: vi.fn(), create: vi.fn(), rename: vi.fn(), switch: vi.fn() },
  recovery: { peek: vi.fn(), save: vi.fn(), read: vi.fn(), release: vi.fn() },
  lineage: {
    graph: vi.fn(), patchNode: vi.fn(), removeNode: vi.fn(), upsertEdge: vi.fn(),
    removeEdge: vi.fn(), upsertLineTypes: vi.fn(), upsertFloatingNote: vi.fn(), removeFloatingNote: vi.fn()
  }
})

import { useWorkspaceStore } from '../../../src/renderer/features/workspaces/workspace.store'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { RecoveryBarHost } from '../../../src/renderer/app/RecoveryBarHost'
import { recoveryBlocked } from '../../../src/renderer/features/lineage/recoveryScheduler'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let host: HTMLDivElement | null = null

beforeEach(() => {
  vi.clearAllMocks()
  stubApi.workspaces.list.mockResolvedValue({
    ok: true,
    data: { items: [{ id: 'ws-1', name: '一', createdAt: 't', paperCount: 0 }], currentId: 'ws-1' }
  })
  stubApi.recovery.peek.mockResolvedValue({
    ok: true,
    data: { slots: { 'lineage-session': { status: 'empty', epoch: 0 } } }
  })
  useLineageStore.setState({
    nodes: [], edges: [], status: 'ready', error: null, saveStatus: 'clean', lastWriteError: null,
    queue: [], flushing: false, needsReload: false, undoStack: [], redoStack: [], folderId: '__main__', floatingNotes: []
  })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  host?.remove()
  root = null
  host = null
  useWorkspaceStore.setState({ items: [], currentId: '', loading: false, error: null })
})

async function mountHost(): Promise<void> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(<RecoveryBarHost />)
  })
  await act(async () => {
    await useWorkspaceStore.getState().load()
    for (let i = 0; i < 6; i++) await Promise.resolve()
  })
}

describe('Z5 wsError 迁移不重入屏障', () => {
  it('boot 进入后编辑中：wsError null↔串翻转 peek 不再调用（不冻结）；wsCurrentId 变化才重入', async () => {
    await mountHost()
    const peeksAfterBoot = stubApi.recovery.peek.mock.calls.length
    expect(peeksAfterBoot).toBeGreaterThanOrEqual(1)
    // 编辑中（开门态）wsError 翻转：不重入屏障（gen 不动/不冻结/零新 peek）
    act(() => {
      useWorkspaceStore.setState({ error: '清单失败' })
    })
    await act(async () => {
      for (let i = 0; i < 6; i++) await Promise.resolve()
    })
    expect(stubApi.recovery.peek.mock.calls.length).toBe(peeksAfterBoot)
    expect(recoveryBlocked()).toBe(false)
    act(() => {
      useWorkspaceStore.setState({ error: null })
    })
    await act(async () => {
      for (let i = 0; i < 6; i++) await Promise.resolve()
    })
    expect(stubApi.recovery.peek.mock.calls.length).toBe(peeksAfterBoot)
    // wsCurrentId 变化（切回场景）才重入
    act(() => {
      useWorkspaceStore.setState({ currentId: 'ws-2', items: [
        { id: 'ws-1', name: '一', createdAt: 't', paperCount: 0 },
        { id: 'ws-2', name: '二', createdAt: 't', paperCount: 0 }
      ] })
    })
    await act(async () => {
      for (let i = 0; i < 6; i++) await Promise.resolve()
    })
    expect(stubApi.recovery.peek.mock.calls.length).toBeGreaterThan(peeksAfterBoot)
  })
})
