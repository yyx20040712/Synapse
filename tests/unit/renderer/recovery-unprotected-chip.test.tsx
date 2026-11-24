// @vitest-environment jsdom
/**
 * [回炉 W-B1·R-B1 / 设计稿 §8.4 迁移表行 1、行 3 与末段] 「多图未受保护」chip 的生产装配
 * 断言——registry 快照/owner 装配走 recovery-host-ports.buildRecoverySchedulerInit（与
 * RecoveryBarHost 同一装配函数），呈现走 RecoveryBar 真渲染：断言落在渲染出的 DOM
 * （chip 元素与恢复条容器是否在场）而非状态位。
 *
 * 行 1（首次编辑：owner 在 saved 回执后生效）与行 3（flush 全成功：owner→null）期间
 * 只有一个会话有未落库写，chip 不得为真；末段（多个 folder 同时有未落库写）chip 为真
 * 且文案=RECOVERY_UNPROTECTED_CHIP_TEXT 单源。
 * always-active 裸 describe（K3）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useSyncExternalStore } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IDLE_FLUSH_MS } from '@shared/constants'
import { makeApiStub } from '../../utils/api-client-mock'
import { echoHistoryUnit } from '../../utils/lineage-history-stub'

const stubApi = makeApiStub({
  recovery: { peek: vi.fn(), save: vi.fn(), read: vi.fn(), release: vi.fn() },
  lineage: {
    graph: vi.fn(),
    patchNode: vi.fn(),
    removeNode: vi.fn(),
    upsertEdge: vi.fn(),
    removeEdge: vi.fn(),
    upsertLineTypes: vi.fn(),
    upsertFloatingNote: vi.fn(),
    removeFloatingNote: vi.fn(),
    historyUnit: vi.fn()
  }
})

import { RecoveryBar } from '../../../src/renderer/features/recovery/RecoveryBar'
import { RECOVERY_UNPROTECTED_CHIP_TEXT } from '../../../src/renderer/shared/ui-constants'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import {
  enterWorkspaceRecovery,
  getRecoveryState,
  initRecoveryScheduler,
  resetRecoveryScheduler,
  subscribeRecoveryState
} from '../../../src/renderer/features/lineage/recoveryScheduler'
import { buildRecoverySchedulerInit } from '../../../src/renderer/features/lineage/recovery-host-ports'
import { defaultLineTypeNames, type LineageNode } from '../../../src/shared/models/lineage'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

function node(id: string): LineageNode {
  return {
    id,
    paperId: `paper-${id}`,
    title: `节点${id}`,
    year: 2022,
    x: 1,
    y: 1,
    month: 9,
    slot: 0,
    folderId: '__main__',
    createdAt: 't',
    updatedAt: 't'
  }
}

/** 恢复条宿主（RecoveryBarHost 同形：订阅调度器状态→RecoveryBar 纯展示件） */
function BarHost(): JSX.Element | null {
  const state = useSyncExternalStore(subscribeRecoveryState, getRecoveryState)
  return <RecoveryBar state={state} onRestore={() => undefined} onDiscard={() => undefined} onDefer={() => undefined} onReopen={() => undefined} />
}

let root: Root | null = null
let hostEl: HTMLDivElement | null = null

const settle = async (turns = 12): Promise<void> => {
  for (let i = 0; i < turns; i += 1) await Promise.resolve()
}
const state = () => useLineageStore.getState()
const chipEl = (): Element | null => document.querySelector('[data-testid="recovery-unprotected-chip"]')
const barEl = (): Element | null => document.querySelector('[data-testid="recovery-chips"],[data-testid="recovery-bar"]')

/** 渲染落定后的恢复条呈现（chip 元素文本＋容器是否在场） */
async function rendered(): Promise<{ chip: string | null; bar: boolean }> {
  await act(async () => {
    await settle()
  })
  const chip = chipEl()
  return { chip: chip?.textContent ?? null, bar: barEl() !== null }
}

beforeEach(async () => {
  vi.useFakeTimers()
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockImplementation(async (req: { folderId: string }) =>
    ({ ok: true, data: { nodes: [node(req.folderId === 'f-b' ? 'B' : 'A')], edges: [], lineTypeNames: defaultLineTypeNames(), floatingNotes: [] } })
  )
  stubApi.lineage.patchNode.mockImplementation(async (req: Partial<LineageNode>) => ({ ok: true, data: { ...node(String(req.id)), ...req, updatedAt: 'server' } }))
  stubApi.lineage.historyUnit.mockImplementation(echoHistoryUnit)
  stubApi.recovery.save.mockResolvedValue({ ok: true, data: { status: 'saved', token: 'tok', epoch: 0 } })
  stubApi.recovery.release.mockResolvedValue({ ok: true, data: { status: 'released', epoch: 1 } })
  stubApi.recovery.peek.mockResolvedValue({ ok: true, data: { slots: { 'lineage-session': { status: 'empty', epoch: 0 } } } })
  useLineageStore.setState({
    nodes: [node('A')], edges: [], floatingNotes: [], paperMetrics: {}, pubNos: {}, tagNames: {}, lineTypeNames: defaultLineTypeNames(),
    status: 'ready', error: null, saveStatus: 'clean', lastWriteError: null, queue: [], flushing: false, inflight: null,
    needsReload: false, undoStack: [], redoStack: [], unfinalized: false, editRevision: 0, folderId: '__main__'
  })
  useLineageViewStore.setState({ mode: 'edit', focusSet: [], tool: 'select', paletteFor: null })
  resetRecoveryScheduler()
  initRecoveryScheduler(buildRecoverySchedulerInit(async () => false, { workspaceId: () => 'ws-1' }))
  await enterWorkspaceRecovery() // [回炉 W9] init 即冻结——显式开闸
  hostEl = document.createElement('div')
  document.body.appendChild(hostEl)
  root = createRoot(hostEl)
  await act(async () => {
    root?.render(<BarHost />)
  })
})

afterEach(async () => {
  await act(async () => {
    root?.unmount()
  })
  root = null
  hostEl?.remove()
  hostEl = null
  resetRecoveryScheduler()
  vi.useRealTimers()
})

describe('单会话：编辑、撤销、显式保存期间恢复条不出现', () => {
  it('首次编辑的认领窗（owner 在 saved 回执后生效）→chip 假、恢复条容器不渲染；saved 后仍假', async () => {
    expect(await rendered()).toEqual({ chip: null, bar: false })
    await act(async () => {
      state().moveNode('A', 10, 10) // 编辑单元提交：认领在途（owner 尚未生效）
    })
    expect(getRecoveryState().unprotectedChip, '认领窗内只有一个会话有未落库写').toBe(false)
    expect(await rendered(), '认领窗不得渲染「多图有未落库修改」chip').toEqual({ chip: null, bar: false })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300) // trailing→recovery.save→saved 回执→owner 生效
    })
    expect(stubApi.recovery.save).toHaveBeenCalled()
    expect(await rendered()).toEqual({ chip: null, bar: false })
  })

  it('owner 释放后（idle-flush 落库即 release）的 undo / redo / 显式保存→chip 假、恢复条容器不渲染', async () => {
    await act(async () => {
      state().moveNode('A', 10, 10)
      await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS + 300) // 认领生效→idle-flush 落库→release（owner=null）
    })
    expect(stubApi.recovery.release).toHaveBeenCalled() // 前提：owner 已释放
    expect(await rendered()).toEqual({ chip: null, bar: false })
    await act(async () => {
      expect(await state().undo()).toBe(true)
    })
    expect(getRecoveryState().unprotectedChip, 'undo 落库：被清洁会话自身不计入需保护').toBe(false)
    expect(await rendered(), 'undo 后恢复条不得出现、更不得驻留').toEqual({ chip: null, bar: false })
    await act(async () => {
      expect(await state().redo()).toBe(true)
    })
    expect(await rendered()).toEqual({ chip: null, bar: false })
    await act(async () => {
      expect(await state().saveActiveFolder()).toBe(true) // 显式保存（定稿）
    })
    expect(getRecoveryState().unprotectedChip).toBe(false)
    expect(await rendered(), '显式保存后恢复条不得出现、更不得驻留').toEqual({ chip: null, bar: false })
    expect(state().unfinalized).toBe(false) // 命令本身确已执行（非早退）
  })

  it('落库后的下一次编辑（owner 已为 null→重新认领）→chip 仍假', async () => {
    await act(async () => {
      state().moveNode('A', 10, 10)
      await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS + 300)
    })
    expect(stubApi.recovery.release).toHaveBeenCalled()
    await act(async () => {
      state().moveNode('A', 20, 20)
    })
    expect(await rendered()).toEqual({ chip: null, bar: false })
  })
})

describe('末段：多个 folder 同时有未落库写——chip 真且文案为单源', () => {
  it('owner=A 时 B 也有未落库写→chip 渲染且文本===RECOVERY_UNPROTECTED_CHIP_TEXT；B 落定后撤走', async () => {
    let releaseMain!: (v: { ok: true; data: LineageNode }) => void
    stubApi.lineage.patchNode.mockImplementation((req: Partial<LineageNode>) =>
      req.id === 'A' ? new Promise((r) => (releaseMain = r)) : Promise.resolve({ ok: true as const, data: { ...node(String(req.id)), ...req, updatedAt: 'server' } })
    )
    await act(async () => {
      state().moveNode('A', 10, 10) // A：Q=1
      await vi.advanceTimersByTimeAsync(300) // 认领生效：owner=A
    })
    await act(async () => {
      state().setFolder('f-b') // A flush-first：patchNode 挂起（A 仍有在途写）
      await settle()
    })
    expect(state().folderId).toBe('f-b')
    await act(async () => {
      state().moveNode('B', 5, 5) // B：Q=1——两图同时有未落库写
    })
    const shown = await rendered()
    expect(shown.bar, '恢复条在场').toBe(true)
    expect(shown.chip, 'chip 文案=ui-constants 单源').toBe(RECOVERY_UNPROTECTED_CHIP_TEXT)
    releaseMain({ ok: true, data: node('A') })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS + 300) // B 落库→仅剩 B 且成为 owner→撤走
    })
    expect(await rendered()).toEqual({ chip: null, bar: false })
  })
})
