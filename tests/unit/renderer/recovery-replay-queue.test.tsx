// @vitest-environment jsdom
/**
 * [回炉 W-D1·T-B02 / 设计稿 §12.2 recovery-integration 行「恢复 queue 不重复、其他 folder 不动」；
 *  §6.3「恢复旧副本只把 payload.queue 放回目标 folder 的实际待写 queue，并按既有 generation、出队即存、
 *  冲突与幂等规则重放」「history-unit 已提交的事务不因旧副本而再次执行」；§2.5 #39]
 * 恢复重放的完整链：生产 RecoveryBarHost（buildRecoverySchedulerInit 真装配）+真 store+真写链
 * （内存真库＋真 lineage.service／lineage-history-unit.service 接到 api 桩位——桩只承载传输）。
 * - 恢复只重放 payload.queue：载入零写、Q=payload.queue（不重复）；重放时每个动作恰一次写 IPC、
 *   DB 回读=副本乐观终态；history-unit 事务零执行；
 * - 其他 folder 不动：恢复目标=主图；挂起会话 f-b 的历史/U/代际/聚焦集原样、图=自身落库值
 *   （它的待写由落定步照常落库，会话不被副本替换）。
 * 计数口径：节点行预置远未来 updated_at——写点单调守卫使每次写恒为「旧行＋1ms」，行被写几次由
 * 回读直接判定（不依赖 IPC 计数）。always-active 裸 describe（K3）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  recovery: { peek: vi.fn(), save: vi.fn(), read: vi.fn(), release: vi.fn() },
  folders: { list: vi.fn() },
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

import { DomainError } from '../../../src/main/services/shared/domain-error'
import { createLineageService } from '../../../src/main/services/lineage/lineage.service'
import { createLineageHistoryUnitService } from '../../../src/main/services/lineage/lineage-history-unit.service'
import { toAppError, type AppError } from '../../../src/shared/app-error'
import { addMs, makeLineageDb, seedFolder, type Db } from '../../utils/lineage-history-db'
import { RecoveryBarHost } from '../../../src/renderer/app/RecoveryBarHost'
import { useWorkspaceStore } from '../../../src/renderer/features/workspaces/workspace.store'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { lineageRegistry } from '../../../src/renderer/features/lineage/lineage-session-registry'
import { getRecoveryState, resetRecoveryScheduler } from '../../../src/renderer/features/lineage/recoveryScheduler'
import { resetLineageSessionsForTests } from './lineage-test-session-reset'
import { defaultLineTypeNames, type LineageNode } from '../../../src/shared/models/lineage'
import type { LineageRecoveryPayload } from '@shared/recovery/schemas'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const MAIN = '__main__'
const OTHER = 'f-b'
/** 远未来时间戳：写点单调守卫下每次写恒=旧行＋1ms（同库写点守卫序列同一技术） */
const BASE = '2100-01-01T00:00:00.000Z'

function node(id: string, folderId: string, x: number, y: number): LineageNode {
  return { id, paperId: null, title: `节点${id}`, year: 2022, x, y, month: 9, slot: 0, folderId, createdAt: 't', updatedAt: 't' }
}
/** 副本：图=乐观终态（A、A2 已移到新位），queue=崩溃时仍未落库的两条普通写 */
const PAYLOAD: LineageRecoveryPayload = {
  folderId: MAIN,
  graph: { nodes: [node('A', MAIN, 3, 4), node('A2', MAIN, 5, 6)], edges: [], lineTypeNames: defaultLineTypeNames(), floatingNotes: [] },
  queue: [
    { kind: 'patch-node', id: 'A', patch: { x: 3, y: 4 } },
    { kind: 'patch-node', id: 'A2', patch: { x: 5, y: 6 } }
  ],
  draft: null
}

interface Rig {
  db: Db
  repos: ReturnType<typeof makeLineageDb>['repos']
  write: ReturnType<typeof createLineageService>
}
let rig: Rig
let root: Root | null = null
let host: HTMLDivElement | null = null

/** 真库（A、A2 主图原位；B 在夹 f-b 原位——均预置远未来 updated_at）＋真 service 链接到 api 桩位 */
function seedRig(): void {
  const made = makeLineageDb()
  const db = made.db
  seedFolder(db, OTHER, '夹乙')
  const insert = db.prepare(
    `INSERT INTO lineage_nodes (id, paper_id, title, core_idea, year, x, y, month, slot, created_at, updated_at, folder_id)
     VALUES (?, NULL, ?, '', 2022, 0, 0, 9, 0, 't', ?, ?)`
  )
  insert.run('A', '节点A', BASE, MAIN)
  insert.run('A2', '节点A2', BASE, MAIN)
  insert.run('B', '节点B', BASE, OTHER)
  rig = { db, repos: made.repos, write: createLineageService({ repo: made.repos.lineage }) }
  // 与生产装配同一依赖面（lineage-history-unit.service.test 的 makeRig 同形）
  const unit = createLineageHistoryUnitService({
    historyRepo: made.repos.lineageHistory,
    meta: made.repos.lineage,
    listGraph: () => made.repos.lineage.listGraph(),
    folderExists: (id) => made.repos.folders.findById(id) !== null,
    paperExists: (id) => made.repos.papers.findById(id) !== null,
    paperFolderIdOf: (id) => made.repos.papers.folderIdOf(id),
    withTransaction: made.repos.withTransaction
  })
  /** service 同步调用→Result 信封（错误经 toAppError 折叠——与 main ipc/register 出口同一函数） */
  const fold = <T,>(fn: () => T): Promise<{ ok: true; data: T } | { ok: false; error: AppError }> => {
    try {
      return Promise.resolve({ ok: true as const, data: fn() })
    } catch (e) {
      if (e instanceof DomainError) return Promise.resolve({ ok: false as const, error: toAppError(e) })
      return Promise.reject(e) // 系统型失败原样上抛（真库失联同形）
    }
  }
  stubApi.lineage.patchNode.mockImplementation(async (req: { id: string } & Record<string, unknown>) => {
    const { id, ...patch } = req
    return fold(() => rig.write.patchNode(id, patch as Parameters<Rig['write']['patchNode']>[1]))
  })
  stubApi.lineage.historyUnit.mockImplementation(async (req) => fold(() => unit.unit(req)))
  stubApi.lineage.graph.mockImplementation(async (req: { folderId?: string }) => fold(() => rig.write.graph(req.folderId)))
}

function mountHost(): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(<RecoveryBarHost />)
  })
}

const flush = async (turns = 8): Promise<void> => {
  for (let i = 0; i < turns; i++) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}
const btn = (id: string): HTMLButtonElement => {
  const b = document.querySelector<HTMLButtonElement>(`[data-testid="${id}"]`)
  if (b === null) throw new Error(`确认条应含 [data-testid="${id}"] 按钮`)
  return b
}
const dialog = (): HTMLElement | null => document.querySelector('[role="dialog"]')
async function clickBar(id: string): Promise<void> {
  await act(async () => {
    btn(id).click()
  })
  await flush()
}
async function clickDialogButton(label: string): Promise<void> {
  const d = dialog()
  if (d === null) throw new Error('确认框应在场')
  const b = Array.from(d.querySelectorAll('button')).find((x) => x.textContent === label)
  if (b === undefined) throw new Error(`确认框应含「${label}」按钮`)
  await act(async () => {
    b.click()
  })
  await flush()
}

const state = () => useLineageStore.getState()
const dbNode = (id: string): { x: number | null; y: number | null; updatedAt: string } => {
  const row = rig.db.prepare('SELECT x, y, updated_at FROM lineage_nodes WHERE id = ?').get(id) as { x: number | null; y: number | null; updated_at: string }
  return { x: row.x, y: row.y, updatedAt: row.updated_at }
}
const patchCalls = (): Array<{ id: string; title: string; year: number; month: number; slot: number; x: number; y: number }> =>
  stubApi.lineage.patchNode.mock.calls.map((c) => c[0] as { id: string; title: string; year: number; month: number; slot: number; x: number; y: number })
/** 会话中不随恢复替换改变的面（「其他 folder 不动」的对照） */
const identityOf = (folderId: string): unknown => {
  const d = lineageRegistry.entry(folderId)!.data
  return { generation: d.sessionGeneration, undo: d.undoStack.map((e) => e.id), redo: d.redoStack.map((e) => e.id), unfinalized: d.unfinalized, focusSet: [...d.focusSet] }
}

beforeEach(() => {
  vi.clearAllMocks()
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  resetRecoveryScheduler()
  resetLineageSessionsForTests()
  seedRig()
  stubApi.recovery.peek.mockResolvedValue({
    ok: true,
    data: {
      slots: {
        'lineage-session': { status: 'available', epoch: 0, file: { token: 'tok-slot', writtenAt: 'w', lastWriterSession: 'old', actionCount: 2, draftPresent: false } }
      }
    }
  })
  stubApi.recovery.read.mockResolvedValue({ ok: true, data: { status: 'found', payload: PAYLOAD } })
  stubApi.recovery.save.mockResolvedValue({ ok: true, data: { status: 'saved', token: 'tok-new', epoch: 0 } })
  stubApi.recovery.release.mockResolvedValue({ ok: true, data: { status: 'released', epoch: 1 } })
  stubApi.folders.list.mockResolvedValue({ ok: true, data: [{ id: OTHER, name: '夹乙', position: 0, createdAt: 't' }] })
  useWorkspaceStore.setState({ items: [{ id: 'w1', name: '默认课题', createdAt: '2026-08-28T00:00:00Z', paperCount: 3 }], currentId: 'w1', loading: false, error: null })
  useLineageStore.setState({
    nodes: [node('A', MAIN, 0, 0), node('A2', MAIN, 0, 0)], edges: [], floatingNotes: [], status: 'ready', error: null, saveStatus: 'clean',
    lastWriteError: null, queue: [], flushing: false, inflight: null, needsReload: false, undoStack: [], redoStack: [], unfinalized: false, folderId: MAIN
  })
  useLineageViewStore.setState({ mode: 'browse', focusSet: [], tool: 'select', paletteFor: null })
})

afterEach(async () => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  resetRecoveryScheduler()
  lineageRegistry.cancelAllIdle()
  // 清出会话（未落定写先 flush）并等其写链落定——再关库（孤儿 entry 的迟到回执不撞已关的库）
  await act(async () => {
    resetLineageSessionsForTests()
    await flush(12)
  })
  rig.db.close()
})

describe('恢复重放完整链（[回炉 W-D1] §6.3、§2.5 #39——生产 RecoveryBarHost 装配＋真库写链）', () => {
  it('恢复只重放 payload.queue：载入零写、Q=payload.queue（不重复）；重放每个动作恰一次写 IPC、DB 回读=副本乐观终态且每行恰一次写；history-unit 事务零执行', async () => {
    mountHost()
    await flush()
    expect(getRecoveryState().phase).toBe('await-decision')
    await clickBar('recovery-restore') // 启动屏障直达（无未落定写、无 U/H/R——零确认）
    await vi.waitFor(() => expect(getRecoveryState().phase).toBe('open'))
    // 载入：不写库、不执行历史事务；只把 payload.queue 放回目标会话的待写队列（恰一份）
    expect(stubApi.recovery.read).toHaveBeenCalledTimes(1)
    expect(stubApi.recovery.read).toHaveBeenCalledWith({ workspaceId: 'w1', type: 'lineage-session', token: 'tok-slot' })
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(1) // 仅 takeOver 原样回写
    expect(stubApi.lineage.patchNode).not.toHaveBeenCalled()
    expect(stubApi.lineage.historyUnit).not.toHaveBeenCalled()
    expect(state().queue, 'Q=payload.queue（恰一份——不重复放回）').toEqual(PAYLOAD.queue)
    expect(state().nodes.map((n) => `${n.id}@${n.x},${n.y}`), '图=副本乐观终态').toEqual(['A@3,4', 'A2@5,6'])
    expect({ undo: state().undoStack.length, redo: state().redoStack.length, unfinalized: state().unfinalized }).toEqual({ undo: 0, redo: 0, unfinalized: true })
    expect([dbNode('A'), dbNode('A2')], '载入零写（库仍在原位）').toEqual([
      { x: 0, y: 0, updatedAt: BASE },
      { x: 0, y: 0, updatedAt: BASE }
    ])
    // 重放：每个队列动作恰一次写 IPC（载荷=动作意图），零 history-unit
    await act(async () => {
      await state().save()
    })
    await flush()
    expect(patchCalls()).toEqual([
      { id: 'A', title: '节点A', year: 2022, month: 9, slot: 0, x: 3, y: 4 },
      { id: 'A2', title: '节点A2', year: 2022, month: 9, slot: 0, x: 5, y: 6 }
    ])
    expect([dbNode('A'), dbNode('A2')], 'DB 回读=副本乐观终态；updated_at=旧行＋1ms=每行恰一次写').toEqual([
      { x: 3, y: 4, updatedAt: addMs(BASE, 1) },
      { x: 5, y: 6, updatedAt: addMs(BASE, 1) }
    ])
    expect(stubApi.lineage.historyUnit, '已落库历史不因旧副本再执行').not.toHaveBeenCalled()
    expect(state().queue).toEqual([])
    expect(state().saveStatus).toBe('clean')
    expect(state().unfinalized, 'IO 收口不定稿：U 保持').toBe(true)
    // 再收口：零重发（队列不重复、库行不再被写）
    stubApi.lineage.patchNode.mockClear()
    await act(async () => {
      await state().save()
    })
    await flush()
    expect(stubApi.lineage.patchNode).not.toHaveBeenCalled()
    expect(dbNode('A').updatedAt).toBe(addMs(BASE, 1))
  })

  it('其他 folder 不动：恢复目标=主图（落定步先落定两会话的待写）→主图被副本替换；挂起会话 f-b 的历史/U/代际/聚焦集原样、图=自身落库值', async () => {
    mountHost()
    await flush()
    await clickBar('recovery-defer') // 开门进编辑期
    expect(getRecoveryState().pendingChip).toBe(true)
    // 挂起会话 f-b：聚焦集（经切图取得——切图发生在写之前，离场 flush-first 不触及后续待写）
    lineageRegistry.ensure(OTHER)
    lineageRegistry.update(OTHER, { nodes: [node('B', OTHER, 0, 0)], status: 'ready' })
    useLineageViewStore.setState({ mode: 'focus' })
    act(() => {
      state().setFolder(OTHER)
    })
    useLineageViewStore.getState().toggleFocus('B')
    act(() => {
      state().setFolder(MAIN)
    })
    await flush()
    // 一条已落库历史＋一条待写（会话此后一直挂起）。编辑经 recovery 触发面驱动确认条宿主重渲——包在 act 内
    act(() => {
      lineageRegistry.lane(OTHER).commands.moveNode('B', 2, 3)
    })
    await act(async () => {
      await lineageRegistry.lane(OTHER).save()
    })
    act(() => {
      lineageRegistry.lane(OTHER).commands.moveNode('B', 4, 4) // f-b：undo 2、Q=1
      state().moveNode('A', 7, 8) // 活动会话（主图）：Q=1、undo 1
    })
    const otherUndoIds = lineageRegistry.entry(OTHER)!.data.undoStack.map((e) => e.id)
    const otherBefore = identityOf(OTHER)
    expect(otherUndoIds, '前提：f-b 有两条已落库历史').toHaveLength(2)
    expect(otherBefore).toEqual({ generation: lineageRegistry.entry(OTHER)!.data.sessionGeneration, undo: otherUndoIds, redo: [], unfinalized: true, focusSet: ['B'] })
    expect({ main: state().queue.length, other: lineageRegistry.entry(OTHER)!.data.queue.length }, '前提：两会话各一条待写').toEqual({ main: 1, other: 1 })
    expect(dbNode('B'), '前提：f-b 的行已被写一次（已落库历史那条）').toEqual({ x: 2, y: 3, updatedAt: addMs(BASE, 1) })
    stubApi.lineage.patchNode.mockClear() // 其后的写 IPC 计数只含恢复流程
    const mainGeneration = lineageRegistry.entry(MAIN)!.data.sessionGeneration

    await clickBar('recovery-reopen')
    expect(getRecoveryState().phase).toBe('await-decision')
    await clickBar('recovery-restore')
    await vi.waitFor(() => expect(dialog()).not.toBeNull()) // 先落定后单次替换确认
    expect(dialog()!.textContent).toContain('已保存当前 2 项修改') // 两会话的待写都被落定步落库
    expect(patchCalls().map((c) => c.id).sort(), '落定步：两图的待写都落库').toEqual(['A', 'B'])
    expect(stubApi.recovery.read).not.toHaveBeenCalled() // 落定先于 read
    await clickDialogButton('继续恢复')
    await vi.waitFor(() => expect(getRecoveryState().phase).toBe('open'))
    // 目标会话（主图）被副本替换
    const main = lineageRegistry.entry(MAIN)!.data
    expect(lineageRegistry.activeFolder()).toBe(MAIN)
    expect(main.sessionGeneration, '目标会话恢复替换=新代际').toBeGreaterThan(mainGeneration)
    expect({ undo: main.undoStack, redo: main.redoStack, unfinalized: main.unfinalized, queue: main.queue }, '主图被副本替换：H/R 清、U=1、Q=payload.queue').toEqual({ undo: [], redo: [], unfinalized: true, queue: PAYLOAD.queue })
    expect(main.nodes.map((n) => n.id), '主图=副本图').toEqual(['A', 'A2'])
    // 其他 folder 不动：身份与内容原样；它的待写已由落定步按自身值落库（未被副本改写）
    expect(identityOf(OTHER), '挂起会话不被恢复替换波及').toEqual(otherBefore)
    const other = lineageRegistry.entry(OTHER)!.data
    expect({ queue: other.queue.length, phase: other.saveStatus, nodes: other.nodes.map((n) => `${n.id}@${n.x},${n.y}`) }, '挂起会话：待写已落定、图=自身落库值').toEqual({ queue: 0, phase: 'clean', nodes: ['B@4,4'] })
    expect(dbNode('B'), 'f-b 的行=自身落库值；落定步恰一次写（累计第二次）').toEqual({ x: 4, y: 4, updatedAt: addMs(BASE, 2) })
    expect(patchCalls().map((c) => c.id)).toEqual(['A', 'B']) // 载入后尚无重放——副本 queue 只属主图
    expect(stubApi.lineage.historyUnit).not.toHaveBeenCalled()
  })
})
