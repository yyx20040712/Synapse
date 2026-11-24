// @vitest-environment jsdom
/**
 * [回炉 W-B1·R-remap/R-B1b / 设计稿 §8.4「后台删夹」行与末段、§2.5 #10] ghost remap 落库后的
 * 恢复 owner 处置（⑤）与「多图未受保护」chip、显式保存的 #10 记失败（会话终态 ①–④ 见
 * lineage-session-remap.test.ts）。生产装配=recovery-host-ports.buildRecoverySchedulerInit
 * （owner keyed），呈现走 RecoveryBar 真渲染。回执时点由用例经两道闸显式指定。
 * 夹具=lineage-remap-test-fixture（先工厂后被测模块）。always-active 裸 describe（K3）。
 */
import {
  CONFLICT_MESSAGE, DOOM, MAIN, cleanupRemapFixture, conflict, enterWorkspaceRecovery, ghostStubs, mainSessions, node, noteIds, registry,
  resetRemapFixture, settle, state, stubApi
} from './lineage-remap-test-fixture'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useSyncExternalStore } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getConflictState, resolveGhostFolderDecision } from '../../../src/renderer/features/lineage/conflictResolution'
import { getRecoveryState, initRecoveryScheduler, resetRecoveryScheduler, subscribeRecoveryState } from '../../../src/renderer/features/lineage/recoveryScheduler'
import { buildRecoverySchedulerInit } from '../../../src/renderer/features/lineage/recovery-host-ports'
import { RecoveryBar } from '../../../src/renderer/features/recovery/RecoveryBar'
import { RECOVERY_UNPROTECTED_CHIP_TEXT } from '../../../src/renderer/shared/ui-constants'
import { defaultLineTypeNames, type FloatingNote } from '@shared/models/lineage'
import type { LineageGraphRes } from '../../../src/shared/ipc/schemas'

beforeEach(async () => {
  await resetRemapFixture()
})

afterEach(() => {
  cleanupRemapFixture()
})

describe('⑤⑥ owner 离场路径与 chip；显式保存的 #10 记失败', () => {
  function BarHost(): JSX.Element | null {
    const recovery = useSyncExternalStore(subscribeRecoveryState, getRecoveryState)
    return <RecoveryBar state={recovery} onRestore={() => undefined} onDiscard={() => undefined} onDefer={() => undefined} onReopen={() => undefined} />
  }

  /** 生产装配（owner keyed）＋回执时点由用例指定的两道闸：主图 keyed 读、release IPC。
   *  调用前须 vi.useFakeTimers（认领 trailing 300ms 需推进）。返回放行句柄。 */
  async function assembleGated(): Promise<{
    mainReads: Array<(v: { ok: true; data: LineageGraphRes }) => void>
    releases: Array<() => void>
    savedNote: () => FloatingNote | null
  }> {
    let saved: FloatingNote | null = null
    const mainReads: Array<(v: { ok: true; data: LineageGraphRes }) => void> = []
    const releases: Array<() => void> = []
    stubApi.recovery.release.mockImplementation(
      () => new Promise((resolve) => {
        releases.push(() => resolve({ ok: true as const, data: { status: 'released' as const, epoch: 1 } }))
      })
    )
    stubApi.lineage.upsertFloatingNote.mockImplementation(async (req: { folderId: string; id?: string }) => {
      if (req.folderId === DOOM) return conflict()
      saved = { id: req.id ?? 'n1', folderId: MAIN, x: 0, y: 0, content: '甲', createdAt: 't', updatedAt: 't' }
      return { ok: true as const, data: saved }
    })
    stubApi.lineage.graph.mockImplementation((req: { folderId: string }) =>
      req.folderId === MAIN
        ? new Promise((r) => mainReads.push(r))
        : Promise.resolve({ ok: true as const, data: { nodes: [node('A', req.folderId)], edges: [], lineTypeNames: defaultLineTypeNames(), floatingNotes: [] } })
    )
    resetRecoveryScheduler()
    initRecoveryScheduler(buildRecoverySchedulerInit(async () => false, { workspaceId: () => 'ws-1' })) // 生产装配（owner keyed）
    await enterWorkspaceRecovery()
    state().setFolder(DOOM)
    await settle()
    state().addFloatingNote(0, 0, '甲')
    await vi.advanceTimersByTimeAsync(300) // 认领→saved 回执→owner=死夹会话
    return { mainReads, releases, savedNote: () => saved }
  }
  /** 触发 remap 并等到终态迁移完成（被矫正会话离场）；flush=X 的 save（挂起到存活会话和解落定） */
  async function remapNow(): Promise<{ flush: Promise<void> }> {
    const flush = state().save()
    await settle()
    expect(getConflictState().pending).toEqual({ folderId: DOOM })
    resolveGhostFolderDecision('remap-main-graph')
    await settle(30)
    expect(registry.entry(DOOM)).toBeUndefined() // 终态迁移已完成
    return { flush }
  }
  const mainGraph = (saved: FloatingNote | null): { ok: true; data: LineageGraphRes } =>
    ({ ok: true, data: { nodes: [node('A')], edges: [], lineTypeNames: defaultLineTypeNames(), paperMetrics: {}, pubNos: {}, tagNames: {}, floatingNotes: saved ? [saved] : [] } })
  async function mountBar(): Promise<Root> {
    const hostEl = document.createElement('div')
    document.body.appendChild(hostEl)
    const root = createRoot(hostEl)
    await act(async () => {
      root.render(<BarHost />)
      await settle()
    })
    return root
  }

  it('终态迁移后存活会话仅有和解读在途时，owner 的 release 回执到达→chip 假、恢复条不渲染（竞态固化）', async () => {
    vi.useFakeTimers()
    const { mainReads, releases, savedNote } = await assembleGated()
    expect(registry.recoveryOwner()?.folderId).toBe(DOOM) // 前提：owner 是被矫正会话
    const { flush } = await remapNow()
    const main = registry.entry(MAIN)!
    expect(state().folderId).toBe(MAIN)
    expect(main.data.inflight?.kind).toBe('reconcile') // 前置：存活会话仅有和解读在途
    expect(main.data.queue).toHaveLength(0)
    expect(releases.length).toBeGreaterThan(0) // 前置：release 已发出、回执未到
    expect(registry.recoveryOwner()?.folderId).toBe(DOOM)
    for (const release of releases) release() // release 回执到达——和解读仍在途
    await settle(30)
    expect(registry.recoveryOwner()).toBeNull() // ⑤ 回执生效：owner 归 null
    expect(main.data.inflight?.kind).toBe('reconcile') // 判别时点：存活会话仍仅有和解读在途
    expect(getRecoveryState().unprotectedChip).toBe(false) // 仅和解读在途的会话不算「有未落库写」
    const root = await mountBar()
    expect(document.querySelector('[data-testid="recovery-unprotected-chip"]')).toBeNull() // 恢复条不出现
    expect(document.querySelector('[data-testid="recovery-chips"]')).toBeNull()
    for (const read of mainReads) read(mainGraph(savedNote()))
    await flush
    expect(state().needsReload).toBe(false)
    expect(noteIds()).toEqual([savedNote()!.id])
    expect(getRecoveryState().unprotectedChip).toBe(false)
    await act(async () => {
      root.unmount()
    })
  })

  it('对照：同一时点另一会话确有未落库写→chip 仍为真且渲染真实文案；该会话接管 owner 后撤走', async () => {
    vi.useFakeTimers()
    const { mainReads, savedNote } = await assembleGated()
    registry.ensure('f-b') // 另一文件夹 f-b：有未落库写（Q=1）
    registry.update('f-b', { nodes: [node('B1', 'f-b')], status: 'ready' })
    registry.lane('f-b').commands.moveNode('B1', 20, 20)
    const transferSaves: Array<() => void> = []
    stubApi.recovery.save.mockImplementation(
      () => new Promise((resolve) => {
        transferSaves.push(() => resolve({ ok: true as const, data: { status: 'saved' as const, token: 'tok-b', epoch: 0 } }))
      })
    )
    const { flush } = await remapNow()
    await settle(20)
    expect(registry.entry(MAIN)!.data.inflight?.kind).toBe('reconcile')
    expect(transferSaves.length).toBeGreaterThan(0) // ⑤ owner 离场裁决=向 f-b 转移写（回执未到）
    expect(registry.recoveryOwner()?.folderId).toBe(DOOM) // 转移回执未到：owner 仍是被矫正会话
    expect(getRecoveryState().unprotectedChip).toBe(true) // f-b 有未落库写且非 owner——诚实 chip
    const root = await mountBar()
    expect(document.querySelector('[data-testid="recovery-unprotected-chip"]')?.textContent).toBe(RECOVERY_UNPROTECTED_CHIP_TEXT)
    expect(document.querySelector('[data-testid="recovery-chips"]')).not.toBeNull()
    for (const save of transferSaves) save() // 转移写回执：owner→f-b
    await settle(30)
    expect(registry.recoveryOwner()?.folderId).toBe('f-b')
    expect(getRecoveryState().unprotectedChip).toBe(false) // f-b 已受副本保护
    for (const read of mainReads) read(mainGraph(savedNote()))
    await flush
    await act(async () => {
      root.unmount()
    })
  })

  it('显式保存路径：#10 本次 finalize 记失败于存活会话（failed 可重试、U 保留），二次显式保存才定稿', async () => {
    const { savedNote } = ghostStubs()
    state().setFolder(DOOM)
    await settle()
    state().addFloatingNote(0, 0, '甲')
    const first = state().saveActiveFolder()
    await settle()
    expect(getConflictState().pending).toEqual({ folderId: DOOM })
    resolveGhostFolderDecision('remap-main-graph')
    expect(await first).toBe(false) // 本次不定稿
    expect(state().folderId).toBe(MAIN)
    expect(mainSessions()).toHaveLength(1)
    expect(state().saveStatus).toBe('error') // 保存钮 failed 可点
    expect(state().lastWriteError).toBe(CONFLICT_MESSAGE)
    expect(state().inflight).toBeNull()
    expect(state().unfinalized).toBe(true) // U/历史不因本次显式保存清
    expect(state().needsReload).toBe(false) // 和解已完成
    expect(await state().saveActiveFolder()).toBe(true) // 和解完成后二次显式保存才定稿
    expect(state().saveStatus).toBe('clean')
    expect(state().lastWriteError).toBeNull()
    expect(state().unfinalized).toBe(false)
    expect(noteIds()).toEqual([savedNote()!.id])
  })
})
