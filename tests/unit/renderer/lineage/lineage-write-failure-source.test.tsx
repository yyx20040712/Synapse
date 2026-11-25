// @vitest-environment jsdom
/**
 * [B5 设计稿 §6.1 错误来源单源与写点映射、§2.4 失败源与告警合法态、§6.4 判别覆盖；§15.1 步骤 2 状态红测先行]
 * 逐行断言「saveStatus、message、source 在同一 registry patch 写入或清除」与「retrySave 的 source guard」
 * 的目标语义（现状实现未满足=红；实现波落地后转绿）。
 *
 * 归属与边界：
 * - 告警组件面取自稳定 Page 外壳的工具栏（[B5 wave C] LineageWriteErrorAlert=横滚容器的兄弟节点，三模式
 *   可达；原「现宿主=edit 态 LineageToolbar 的保存错误行」已迁移——挂载点改、断言不变）；单告警迁稳定 Page 外壳
 *   （LineageWriteErrorAlert，§6.2/§6.3）属后续波——届时本段改挂载点、断言不变。
 * - rekey 行：设计稿只明示「message 与 source 一起随原会话归属迁移，不落到别的 folder」与
 *   「IO 轴不迁」（lineage-session-rekey 头注）——本件只断言成对性与不跨 folder，不断言消息是否迁入新身份。
 * - CONFLICT 丢弃出口的呈现条件（staleHistoryAtTop）既有锁=lineage-history-stale-* 族，本件不重复。
 *
 * 未落地字段 lastWriteErrorSource 以本件「目标类型说明」一层访问（断言失败=红）。夹具首 import=
 * lineage-remap-test-fixture（remap 携带面段复用；顺序契约随其成立）。always-active 裸 describe（K3）。
 */
import {
  DOOM, MAIN, cleanupRemapFixture, ghostStubs, node, registry, resetRemapFixture, settle, state, stubApi, useLineageStore
} from '../lineage-remap-test-fixture'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LineageToolbar } from '../../../../src/renderer/features/lineage/LineageToolbar'
import { useLineageViewStore } from '../../../../src/renderer/features/lineage/lineage-view.store'
import type { LineagePaneControls } from '../../../../src/renderer/features/lineage/use-lineage-pane-controls'
import { resetInflightRead } from '../../../../src/renderer/features/lineage/lineage-write-conflicts'
import { resolveGhostFolderDecision } from '../../../../src/renderer/features/lineage/conflictResolution'
import { resetLineageSessionsForTests } from '../lineage-test-session-reset'
import { echoHistoryUnit } from '../../../utils/lineage-history-stub'
import type { LineageEdge, LineageNode } from '../../../../src/shared/models/lineage'
import type { LineageGraphRes } from '../../../../src/shared/ipc/schemas'
import type { LineageStore } from '../../../../src/renderer/features/lineage/lineage-session-model'
import type { LineageSession, SessionEntry } from '../../../../src/renderer/features/lineage/lineage-session-registry'

/** B5 §6.1 错误来源判别枚举——目标类型说明（未落地；实现波以真实类型替换） */
type LineageWriteErrorSource = 'save' | 'history-undo' | 'history-redo' | null
type StoreWithSource = LineageStore & { lastWriteErrorSource: LineageWriteErrorSource }
type SessionWithSource = LineageSession & { lastWriteErrorSource: LineageWriteErrorSource }
const sourceOf = (): LineageWriteErrorSource | undefined => (useLineageStore.getState() as StoreWithSource).lastWriteErrorSource
const sourceIn = (entry: SessionEntry): LineageWriteErrorSource | undefined =>
  (entry.data as SessionWithSource).lastWriteErrorSource

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const graphOf = (nodes: LineageNode[]): LineageGraphRes =>
  ({ nodes, edges: [], paperMetrics: {}, pubNos: {}, tagNames: {}, lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'], floatingNotes: [] })
const graphReadFailed = { ok: false as const, error: { code: 'DB_ERROR', message: '图读失败' } }
const edge = (req: { id?: string; fromNode: string; toNode: string }): LineageEdge =>
  ({ id: req.id ?? `e-${req.fromNode}-${req.toNode}`, fromNode: req.fromNode, toNode: req.toNode, label: '', dashed: false, color: '#1e3a8a', createdAt: 't0', updatedAt: 't0' })

let root: Root | null = null
let host: HTMLDivElement | null = null
/** [B5 §3.1] 工具栏注入面=页面组合层的左右栏控制（本件不测开关行为） */
const PANES: LineagePaneControls = {
  navCollapsed: false,
  toggleNav: () => undefined,
  sidebar: {
    width: 252,
    collapsed: false,
    onResizeStart: () => undefined,
    onResizeKey: () => undefined,
    collapse: () => undefined,
    expand: () => undefined
  }
}
function mountToolbar(): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root!.render(<LineageToolbar graphName="主图" panes={PANES} />)
  })
}
const q = (sel: string): Element | null => host?.querySelector(sel) ?? null
/** 植入错误态（含目标字段 source——经 registry 写闸落到活动会话） */
const implantError = (message: string, source: LineageWriteErrorSource): void => {
  const patch: Partial<StoreWithSource> = { saveStatus: 'error', lastWriteError: message, lastWriteErrorSource: source, queue: [] }
  act(() => {
    useLineageStore.setState(patch)
  })
}

beforeEach(() => {
  resetInflightRead()
  vi.clearAllMocks()
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: graphOf([node('A')]) })
  stubApi.lineage.patchNode.mockImplementation(async (req: Partial<LineageNode>) =>
    ({ ok: true, data: { ...node(String(req.id ?? 'X')), ...req, updatedAt: 'server' } as LineageNode }))
  stubApi.lineage.upsertEdge.mockImplementation(async (req: { id?: string; fromNode: string; toNode: string }) =>
    ({ ok: true, data: { ...edge(req), createdAt: 'server-created', updatedAt: 'server' } }))
  stubApi.lineage.removeEdge.mockResolvedValue({ ok: true, data: { ok: true } })
  stubApi.lineage.removeNode.mockResolvedValue({ ok: true, data: { ok: true } })
  stubApi.lineage.upsertLineTypes.mockImplementation(async (req: { names: string[] }) => ({ ok: true, data: [...req.names] }))
  stubApi.lineage.historyUnit.mockImplementation(echoHistoryUnit)
  resetLineageSessionsForTests()
  useLineageStore.setState({
    nodes: [], edges: [], floatingNotes: [], lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'],
    status: 'ready', error: null, folderId: MAIN, saveStatus: 'clean', lastWriteError: null, queue: [], flushing: false,
    inflight: null, needsReload: false, invalidationEpoch: 0, undoStack: [], redoStack: [], unfinalized: false, editRevision: 0
  })
  useLineageViewStore.setState({ mode: 'edit', focusSet: [], tool: 'select', paletteFor: null })
})

afterEach(async () => {
  await act(async () => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  resetLineageSessionsForTests()
})

describe('§6.1 写点映射：save / history-undo / history-redo 与消息同批写入', () => {
  it('普通 write queue 失败：source=save＋原始 message；失败队首保留', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    stubApi.lineage.patchNode.mockResolvedValue({ ok: false, error: { code: 'DB_ERROR', message: '写入失败' } })
    state().moveNode('A', 10, 10)
    await state().save()
    expect([state().saveStatus, state().lastWriteError, state().queue.length], '前提').toEqual(['error', '写入失败', 1])
    expect(sourceOf(), '普通写失败=save').toBe('save')
  })

  it('普通 flush 链尾和解失败：source=save＋graph message', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    state().moveNode('A', 10, 10)
    useLineageStore.setState({ needsReload: true })
    stubApi.lineage.graph.mockResolvedValue(graphReadFailed)
    await state().save()
    expect([state().saveStatus, state().lastWriteError], '前提').toEqual(['error', '图读失败'])
    expect(sourceOf(), 'flush 入口没有 undo/redo 方向=save').toBe('save')
  })

  it('显式 reconcileNow 和解失败：source=save', async () => {
    useLineageStore.setState({ needsReload: true })
    stubApi.lineage.graph.mockResolvedValue(graphReadFailed)
    await expect(registry.lane(MAIN).reconcileNow()).resolves.toBe('failed')
    expect(state().saveStatus, '前提').toBe('error')
    expect(sourceOf(), '显式和解入口=save').toBe('save')
  })

  it('save/finalize 链内的前置 reconcile 失败：source=save；redo/U 保留', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    state().moveNode('A', 10, 10)
    await state().undo() // redo 栈 1、U 真——finalize 失败不得清
    useLineageStore.setState({ needsReload: true })
    stubApi.lineage.graph.mockResolvedValue(graphReadFailed)
    expect(await state().saveActiveFolder()).toBe(false)
    expect([state().lastWriteError, state().redoStack.length, state().unfinalized], '前提').toEqual(['图读失败', 1, true])
    expect(sourceOf(), '保存链内的和解=save').toBe('save')
  })

  it('history undo 在 needsReload 下的前置 reconcile graph 失败：source=history-undo；history-unit 未执行；两栈不动', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    state().moveNode('A', 10, 10)
    await state().save()
    useLineageStore.setState({ needsReload: true })
    const undoBefore = state().undoStack
    const redoBefore = state().redoStack
    stubApi.lineage.graph.mockResolvedValue(graphReadFailed)
    stubApi.lineage.historyUnit.mockClear()
    expect(await state().undo()).toBe(false)
    expect(stubApi.lineage.historyUnit, 'history-unit 尚未执行').not.toHaveBeenCalled()
    expect([state().undoStack, state().redoStack], '两栈不动（peek 不 pop）').toEqual([undoBefore, redoBefore])
    expect([state().saveStatus, state().lastWriteError], '前提').toEqual(['error', '图读失败'])
    expect(sourceOf(), '前置和解失败归发起命令的方向').toBe('history-undo')
  })

  it('history redo 在 needsReload 下的前置 reconcile graph 失败：source=history-redo；两栈不动', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    state().moveNode('A', 10, 10)
    await state().undo() // redo 栈 1
    useLineageStore.setState({ needsReload: true })
    const undoBefore = state().undoStack
    const redoBefore = state().redoStack
    stubApi.lineage.graph.mockResolvedValue(graphReadFailed)
    stubApi.lineage.historyUnit.mockClear()
    expect(await state().redo()).toBe(false)
    expect(stubApi.lineage.historyUnit).not.toHaveBeenCalled()
    expect([state().undoStack, state().redoStack]).toEqual([undoBefore, redoBefore])
    expect(state().saveStatus, '前提').toBe('error')
    expect(sourceOf(), '前置和解失败归发起命令的方向').toBe('history-redo')
  })

  /** 和解被丢（读在途期间 gate 旁路注入待写→应用判据不成立）后，链尾续拉的读失败——同一来源沿调用链传递 */
  const tailReconcileFailure = async (
    command: () => Promise<unknown>
  ): Promise<{ undo: ReturnType<typeof state>['undoStack']; redo: ReturnType<typeof state>['redoStack'] }> => {
    useLineageStore.setState({ nodes: [node('A')] })
    state().moveNode('A', 10, 10)
    await state().save()
    useLineageStore.setState({ needsReload: true })
    let release!: (v: { ok: true; data: LineageGraphRes }) => void
    let reads = 0
    stubApi.lineage.graph.mockImplementation(() => {
      reads += 1
      return reads === 1 ? new Promise((r) => (release = r)) : Promise.resolve(graphReadFailed)
    })
    const stacks = { undo: state().undoStack, redo: state().redoStack } // 命令发起前的两栈
    const running = command()
    await settle()
    expect(reads, '前提：前置和解读在途').toBe(1)
    useLineageStore.setState({ queue: [{ kind: 'remove-edge', id: 'e-x' }], saveStatus: 'dirty' }) // 该读到达时应用判据不成立=dropped
    release({ ok: true, data: graphOf([node('A')]) })
    await running
    await settle()
    expect(reads, '前提：已按当前 epoch 有界续拉一次').toBe(2)
    expect([state().saveStatus, state().lastWriteError]).toEqual(['error', '图读失败'])
    return stacks
  }

  it('续拉 reconcile 失败（finalize 链内）：source=save', async () => {
    await tailReconcileFailure(() => state().saveActiveFolder())
    expect(sourceOf(), '续拉和解沿 save/finalize 链=save').toBe('save')
  })

  it('续拉 reconcile 失败（history undo 链内）：source=history-undo；两栈不动', async () => {
    const before = await tailReconcileFailure(() => state().undo())
    expect([state().undoStack, state().redoStack], '续拉失败不 pop').toEqual([before.undo, before.redo])
    expect(sourceOf(), '续拉和解沿 history 链=发起方向').toBe('history-undo')
  })

    it('history-unit 自身系统失败：undo→history-undo、redo→history-redo（＋原始 message；两栈不动）', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    state().moveNode('A', 10, 10)
    await state().save() // 预写先落库（写回显给历史项重锚时戳=既有行为）——栈快照取于其后
    const undoBefore = state().undoStack
    stubApi.lineage.historyUnit.mockResolvedValueOnce({ ok: false, error: { code: 'DB_ERROR', message: '撤销事务失败' } })
    expect(await state().undo()).toBe(false)
    expect(state().undoStack, '前提：失败不 pop（同引用）').toBe(undoBefore)
    expect(state().lastWriteError, '前提').toBe('撤销事务失败')
    expect(sourceOf(), 'undo 自身失败=history-undo').toBe('history-undo')
    expect(await state().undo(), '原历史可重试').toBe(true)
    const redoBefore = state().redoStack
    stubApi.lineage.historyUnit.mockResolvedValueOnce({ ok: false, error: { code: 'DB_ERROR', message: '重做事务失败' } })
    expect(await state().redo()).toBe(false)
    expect(state().redoStack, '前提：失败不 pop（同引用）').toBe(redoBefore)
    expect(state().lastWriteError, '前提').toBe('重做事务失败')
    expect(sourceOf(), 'redo 自身失败=history-redo').toBe('history-redo')
  })

  it('history-unit CONFLICT（四种拒因）：undo→history-undo、redo→history-redo（系统失败与 CONFLICT 都不 pop）', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    state().moveNode('A', 10, 10)
    const conflict = { ok: false as const, error: { code: 'CONFLICT', message: '节点已被其他操作改变', reason: 'HISTORY_STALE' } }
    stubApi.lineage.historyUnit.mockResolvedValueOnce(conflict)
    expect(await state().undo()).toBe(false)
    expect(state().undoStack, 'CONFLICT 不 pop').toHaveLength(1)
    expect(sourceOf()).toBe('history-undo')
    expect(await state().undo(), '和解后重按原方向可重试').toBe(true)
    stubApi.lineage.historyUnit.mockResolvedValueOnce(conflict)
    expect(await state().redo()).toBe(false)
    expect(state().redoStack, 'CONFLICT 不 pop').toHaveLength(1)
    expect(sourceOf()).toBe('history-redo')
  })
})

describe('§6.1 写点映射：finalize 尾、成功同清、丢弃/替换/复位、rekey/remap 携带', () => {
  it('finalize CONFLICT 尾：source=save＋原始 message（不是 history 拒绝）；redo/U 保留', async () => {
    useLineageStore.setState({ nodes: [node('A'), node('B')] })
    state().moveNode('A', 10, 10)
    await state().save()
    await state().undo() // redo=1、U 真
    useLineageStore.setState({
      saveStatus: 'dirty',
      queue: [{ kind: 'upsert-edge', input: { id: 'e-x', fromNode: 'A', toNode: 'B', label: '', via: null }, isNew: true }]
    })
    stubApi.lineage.upsertEdge.mockResolvedValue({ ok: false, error: { code: 'CONFLICT', message: '该逻辑线已存在（A→B），重复边被拒绝' } })
    expect(await state().saveActiveFolder()).toBe(false)
    expect([state().lastWriteError, state().redoStack.length, state().unfinalized], '前提').toEqual(['该逻辑线已存在（A→B），重复边被拒绝', 1, true])
    expect(sourceOf(), 'finalize CONFLICT 尾=save').toBe('save')
  })

  it('普通写成功：message 与 source 同清（失败→重试成功）', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    stubApi.lineage.patchNode.mockResolvedValueOnce({ ok: false, error: { code: 'DB_ERROR', message: '写入失败' } })
    state().moveNode('A', 10, 10)
    await state().save()
    expect(state().saveStatus, '前提：失败在场').toBe('error')
    await state().save()
    expect([state().saveStatus, state().lastWriteError], '前提').toEqual(['clean', null])
    expect(sourceOf(), '成功同清').toBeNull()
  })

  it('history 成功：message 与 source 同清（失败→重按原方向成功）', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    state().moveNode('A', 10, 10)
    stubApi.lineage.historyUnit.mockResolvedValueOnce({ ok: false, error: { code: 'DB_ERROR', message: '撤销事务失败' } })
    expect(await state().undo()).toBe(false)
    expect(state().saveStatus, '前提：失败在场').toBe('error')
    expect(await state().undo()).toBe(true)
    expect(state().lastWriteError, '前提').toBeNull()
    expect(sourceOf(), '成功同清').toBeNull()
  })

  it('丢弃 stale 成功：该次失败的 error 与 source 同清', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    state().moveNode('A', 10, 10)
    stubApi.lineage.historyUnit.mockResolvedValueOnce({
      ok: false, error: { code: 'CONFLICT', message: '节点已被其他操作改变', reason: 'HISTORY_STALE' }
    })
    expect(await state().undo()).toBe(false)
    expect(state().saveStatus, '前提').toBe('error')
    state().discardStaleHistory()
    expect([state().saveStatus, state().lastWriteError], '前提').toEqual(['clean', null])
    expect(sourceOf(), '丢弃出口清该次失败=同清').toBeNull()
  })

  it('恢复替换 / discard：新会话与清账后 source=fresh null', async () => {
    implantError('落库失败', 'save')
    state().discardSession()
    expect(state().lastWriteError, '前提').toBeNull()
    expect(sourceOf(), 'discard 清账').toBeNull()
    implantError('落库失败', 'save')
    state().applyRecoverySession({ folderId: MAIN, graph: graphOf([node('R')]), queue: [], draft: null })
    expect(state().lastWriteError, '前提').toBeNull()
    expect(sourceOf(), '恢复替换=fresh null').toBeNull()
    expect(sourceIn(registry.entry(MAIN)!), '新会话初值 null').toBeNull()
  })

  it('rekey：message 与 source 成对、不落到别的 folder（新身份不带孤立来源；原会话保留其一对）', () => {
    implantError('落库失败', 'save')
    const origin = registry.entry(MAIN)!
    expect([origin.data.lastWriteError, sourceIn(origin)], '前提：原会话持 message+source').toEqual(['落库失败', 'save'])
    useLineageStore.setState({ folderId: 'f-rk' })
    expect(state().folderId).toBe('f-rk')
    expect(state().lastWriteError, 'IO 轴不迁（既有 rekey 语义）').toBeNull()
    expect(sourceOf(), '新身份无消息=无孤立来源').toBeNull()
    expect([origin.data.lastWriteError, sourceIn(origin)], '原会话归属的一对不丢、不串到新 folder').toEqual(['落库失败', 'save'])
  })
})

describe('retrySave 的 source guard（§6.1：只有 save 才 finalize，其他来源 no-op）', () => {
  const settleAfterRetry = async (): Promise<void> => {
    state().retrySave()
    await settle(20)
  }

  it('redo 系统失败后 retrySave=no-op：不定稿、不清 redo/U、告警保留、不发 history-unit', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    state().moveNode('A', 10, 10)
    await state().undo()
    stubApi.lineage.historyUnit.mockResolvedValueOnce({ ok: false, error: { code: 'DB_ERROR', message: '重做事务失败' } })
    expect(await state().redo()).toBe(false)
    expect([state().redoStack.length, state().unfinalized], '前提：失败后 redo/U 在场').toEqual([1, true])
    stubApi.lineage.historyUnit.mockClear()
    await settleAfterRetry()
    expect(state().redoStack, '保存重试不得显式定稿清 redo').toHaveLength(1)
    expect(state().unfinalized, '不得改为已定稿').toBe(true)
    expect([state().saveStatus, state().lastWriteError], '告警保留（重按重做即可重试）').toEqual(['error', '重做事务失败'])
    expect(stubApi.lineage.historyUnit).not.toHaveBeenCalled()
  })

  it('undo 系统失败后 retrySave=no-op：undo 栈不动（同引用）、告警保留、不发 history-unit', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    state().moveNode('A', 10, 10)
    await state().save() // 预写先落库——栈快照取于其后
    const undoBefore = state().undoStack
    stubApi.lineage.historyUnit.mockResolvedValueOnce({ ok: false, error: { code: 'DB_ERROR', message: '撤销事务失败' } })
    expect(await state().undo()).toBe(false)
    stubApi.lineage.historyUnit.mockClear()
    await settleAfterRetry()
    expect(state().undoStack, '保存重试不动 undo 栈').toBe(undoBefore)
    expect([state().saveStatus, state().lastWriteError], '告警保留（重按撤销即可重试）').toEqual(['error', '撤销事务失败'])
    expect(stubApi.lineage.historyUnit).not.toHaveBeenCalled()
  })

  it('history 前置和解失败后 retrySave=no-op：不得经 finalize 绕过原命令（不发和解读、两栈/U 不动、告警保留）', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    state().moveNode('A', 10, 10)
    await state().save()
    await state().undo() // redo=1、U 真
    useLineageStore.setState({ needsReload: true })
    const undoBefore = state().undoStack
    const redoBefore = state().redoStack
    stubApi.lineage.graph.mockResolvedValue(graphReadFailed)
    expect(await state().redo()).toBe(false) // 前置和解失败
    expect(state().lastWriteError, '前提').toBe('图读失败')
    stubApi.lineage.graph.mockResolvedValue({ ok: true, data: graphOf([node('A')]) }) // 此后和解可成功——finalize 若被调用即越过原命令定稿
    stubApi.lineage.graph.mockClear()
    await settleAfterRetry()
    expect(stubApi.lineage.graph, 'source guard：保存重试不代 history 命令重跑和解').not.toHaveBeenCalled()
    expect([state().undoStack, state().redoStack]).toEqual([undoBefore, redoBefore])
    expect(state().unfinalized, '不得改为已定稿').toBe(true)
    expect([state().saveStatus, state().lastWriteError], '告警保留').toEqual(['error', '图读失败'])
    expect(state().needsReload, '位保留：重试入口=重按原方向命令').toBe(true)
  })

  it('缺源非法态（error＋message＋source=null）：retrySave fail closed=no-op', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    state().moveNode('A', 10, 10)
    await state().undo()
    implantError('来源缺失的失败', null)
    await settleAfterRetry()
    expect(state().redoStack, '缺源不得定稿').toHaveLength(1)
    expect(state().saveStatus, '缺源不清告警').toBe('error')
  })

  it('save 来源（普通写失败、队首保留）：retrySave=finalize——重试成功即定稿（既有行为守卫）', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    stubApi.lineage.patchNode.mockResolvedValueOnce({ ok: false, error: { code: 'DB_ERROR', message: '写入失败' } })
    state().moveNode('A', 10, 10)
    await state().save()
    expect([state().saveStatus, state().queue.length], '前提').toEqual(['error', 1])
    await settleAfterRetry()
    expect([state().saveStatus, state().queue.length, state().unfinalized]).toEqual(['clean', 0, false])
  })
})

describe('告警按源分流（§2.4；宿主=稳定 Page 外壳工具栏内 LineageWriteErrorAlert——[B5 wave C] 三模式同一 DOM）', () => {
  it('save：告警「保存失败：{message}」＋保存重试在场', () => {
    mountToolbar()
    implantError('写入失败', 'save')
    const alert = q('[data-testid="lineage-save-error"]')
    expect(alert?.textContent).toContain('保存失败：写入失败')
    expect(q('[data-testid="lineage-save-retry"]'), 'save 来源保留保存重试').not.toBeNull()
  })

  it.each([
    ['history-undo', '撤销事务失败', '撤销失败：撤销事务失败', '重按撤销即可重试'],
    ['history-redo', '重做事务失败', '重做失败：重做事务失败', '重按重做即可重试']
  ] as const)('%s：方向文案＋「历史栈未变化」指引；无保存重试', (source, message, title, hint) => {
    mountToolbar()
    implantError(message, source)
    const alert = q('[data-testid="lineage-save-error"]')
    expect(alert, '告警在场（单告警 testid 沿用）').not.toBeNull()
    expect(alert!.textContent).toContain(title)
    expect(alert!.textContent).toContain(hint)
    expect(alert!.textContent, '不冒充保存失败').not.toContain('保存失败')
    expect(q('[data-testid="lineage-save-retry"]'), 'history 来源不渲染保存重试').toBeNull()
  })

  it('缺源非法态：显示通用真实错误、不显示任何重试钮（UI fail closed）', () => {
    mountToolbar()
    implantError('来源缺失的失败', null)
    const alert = q('[data-testid="lineage-save-error"]')
    expect(alert?.textContent).toContain('来源缺失的失败')
    expect(q('[data-testid="lineage-save-retry"]')).toBeNull()
  })
})

describe('remap 携带面：finalize 的 #10 记失败于存活会话时 source 一并落存活会话', () => {
  beforeEach(async () => {
    await resetRemapFixture()
  })

  afterEach(() => {
    cleanupRemapFixture()
  })

  it('remap 后本次 finalize 记失败：存活会话持 message＋source=save；二次显式保存成功同清', async () => {
    ghostStubs()
    state().setFolder(DOOM)
    await settle()
    state().addFloatingNote(0, 0, '甲')
    const first = state().saveActiveFolder()
    await settle()
    resolveGhostFolderDecision('remap-main-graph')
    expect(await first).toBe(false)
    expect(state().folderId, 'remap 后活动=主图').toBe(MAIN)
    expect([state().saveStatus, state().lastWriteError], '前提：#10 失败记于存活会话').toEqual(['error', '原文件夹已删除'])
    expect(sourceOf(), '记失败于存活会话的来源=save').toBe('save')
    expect(sourceIn(registry.entry(MAIN)!)).toBe('save')
    expect(await state().saveActiveFolder()).toBe(true)
    expect(state().lastWriteError).toBeNull()
    expect(sourceOf(), '成功同清').toBeNull()
  })
})
