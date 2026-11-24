// @vitest-environment jsdom
/**
 * [回炉 W-B3·R-B5 / 设计稿 §6.3、§2.5 #39、§8.1；处置单 R-B5；design-inventory 表 1]
 * 恢复替换谓词 hasReplaceableSession 接入生产的契约（原缺陷：谓词定义于
 * recovery-clean-lifecycle 而生产无消费者——IO clean 但有 U/H/R 时恢复直接替换当前图）。
 *
 * 覆盖：
 * - 流程级（createRestoreFlow）：判别探针 P4 原文（host 的 replaceable=true 须触发
 *   {kind:'replace'} 确认）；仅 U/H/R＝只弹替换确认、不调落定步；有未落定写＝仍先落定、
 *   只问 settle-replace 不二问；拒绝＝不载入、条回可重试；冲突清单携 replaceWarning
 *   不二问；宿主未提供谓词＝旧语义逐行不变（对照）。
 * - 文案：两处替换确认写明「撤销/重做历史与未保存标记将被清除」。
 * - 生产装配（buildRecoverySchedulerInit）：谓词按「目标会话」求值（用户裁决 R2——
 *   仅 U／仅 H／仅 R／目标≠活动／干净／草稿在场）。
 * - RecoveryBarHost 真装配：仅 U/H/R（IO clean）→确认框→取消不载入→确认载入。
 * 调度器不装配的流程级用例经假宿主驱动（零 store 依赖）。always-active。
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

import { createRestoreFlow } from '../../../src/renderer/features/lineage/recovery-restore-flow'
import { restoreDecisionView } from '../../../src/renderer/features/lineage/recovery-decision-view'
import { buildRecoverySchedulerInit } from '../../../src/renderer/features/lineage/recovery-host-ports'
import { getRecoveryState, resetRecoveryScheduler } from '../../../src/renderer/features/lineage/recoveryScheduler'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { lineageRegistry } from '../../../src/renderer/features/lineage/lineage-session-registry'
import { setNoteDraftSnapshot } from '../../../src/renderer/features/lineage/lineage-note-draft'
import { RecoveryBarHost } from '../../../src/renderer/app/RecoveryBarHost'
import { useWorkspaceStore } from '../../../src/renderer/features/workspaces/workspace.store'
import { resetLineageSessionsForTests } from './lineage-test-session-reset'
import { makeHistoryEntry } from '../../utils/factories'
import { defaultLineTypeNames, MAIN_GRAPH_ID, type LineageNode } from '@shared/models/lineage'
import type { LineageRecoveryPayload } from '@shared/recovery/schemas'

function node(id: string): LineageNode {
  return {
    id,
    paperId: `paper-${id}`,
    title: `节点${id}`,
    year: 2022,
    x: null,
    y: null,
    month: 9,
    slot: 0,
    folderId: '__main__',
    createdAt: 't',
    updatedAt: 't'
  }
}

const COPY_PAYLOAD: LineageRecoveryPayload = {
  folderId: MAIN_GRAPH_ID,
  graph: { nodes: [node('COPY')], edges: [], lineTypeNames: defaultLineTypeNames(), floatingNotes: [] },
  queue: [],
  draft: null
}

/** 后果说明行（两处替换确认共用——§2.5 #39：载入清目标会话 H/R） */
const CONSEQUENCE_LINE = '当前图的撤销/重做历史与未保存标记将被清除，这次替换无法撤销。'

type Mock = ReturnType<typeof vi.fn>

interface Harness {
  flow: ReturnType<typeof createRestoreFlow>
  ask: Mock
  loadPayload: Mock
  emit: Mock
  setGateOpen: Mock
  read: Mock
}

/** 流程级夹具：假宿主+可观测端口（emit/setGateOpen/read 计数）。answer=确认框回答 */
function harness(host: Record<string, unknown>, opts: { pendingChip?: boolean; answer?: boolean } = {}): Harness {
  const ask = vi.fn(async (_decision: unknown) => opts.answer ?? true)
  const loadPayload = vi.fn()
  const emit = vi.fn()
  const setGateOpen = vi.fn()
  const read = vi.fn(async () => ({ status: 'found', payload: COPY_PAYLOAD }))
  const flow = createRestoreFlow({
    ports: {
      getState: () => ({ phase: 'await-decision', file: { token: 'tok' }, busy: false, pendingChip: opts.pendingChip === true }),
      getGen: () => 0,
      read,
      save: async () => ({ status: 'saved', token: 'new', epoch: 0 }),
      adoptEpoch: () => undefined,
      emit,
      setGateOpen
    } as never,
    getHost: () =>
      ({
        askRestoreDecision: ask,
        loadPayload,
        onRestored: () => undefined,
        openLineageView: () => undefined,
        discardLoadedSession: () => undefined,
        ...host
      }) as never,
    onLoaded: () => undefined,
    emit,
    setGateOpen,
    onGateReopened: () => undefined,
    onTakeOver: () => undefined
  })
  return { flow, ask, loadPayload, emit, setGateOpen, read }
}
const run = (h: Harness): Promise<void> => h.flow.run('tok', () => true)
const kinds = (h: Harness): string[] => h.ask.mock.calls.map((c) => (c[0] as { kind: string }).kind)
const ranNoConflict = async (): Promise<{ kind: 'ran'; conflicts: never[] }> => ({ kind: 'ran', conflicts: [] })

describe('P4 判别探针（原文并入——r-renderer/b4b-renderer-probes.test.tsx）', () => {
  it('P4 恢复替换：host 的 replaceable=true/U/H/R 面必须触发 replace 确认', async () => {
    const payload: LineageRecoveryPayload = {
      folderId: MAIN_GRAPH_ID,
      graph: { nodes: [], edges: [], lineTypeNames: defaultLineTypeNames(), floatingNotes: [] },
      queue: [],
      draft: null
    }
    const ask = vi.fn(async () => true)
    const loadPayload = vi.fn()
    const host = {
      hasUnsettledWrites: () => false,
      hasReplaceableSession: () => true,
      askRestoreDecision: ask,
      loadPayload,
      onRestored: () => undefined,
      openLineageView: () => undefined,
      discardLoadedSession: () => undefined
    }
    const flow = createRestoreFlow({
      ports: {
        getState: () => ({ phase: 'await-decision', file: { token: 'tok' }, busy: false, pendingChip: false }),
        getGen: () => 0,
        read: async () => ({ status: 'found', payload }),
        save: async () => ({ status: 'saved', token: 'new', epoch: 0 }),
        adoptEpoch: () => undefined
      } as never,
      getHost: () => host as never,
      onLoaded: () => undefined,
      emit: () => undefined,
      setGateOpen: () => undefined,
      onGateReopened: () => undefined,
      onTakeOver: () => undefined
    })
    await flow.run('tok', () => true)
    expect(loadPayload).toHaveBeenCalledTimes(1)
    expect(ask).toHaveBeenCalledWith({ kind: 'replace' })
  })
})

describe('R-B5 流程级：替换确认判定（design-inventory 表 1）', () => {
  it('仅 U/H/R（IO clean）：只弹 {kind:"replace"}，不调落定步（零 flush、无开门落定）；确认先于载入', async () => {
    const settle = vi.fn(async () => ({ ok: true, savedActions: 0, savedDraft: false }))
    const h = harness({ hasUnsettledWrites: () => false, hasReplaceableSession: () => true, settleUnsettledWrites: settle })
    await run(h)
    expect(h.ask).toHaveBeenCalledTimes(1)
    expect(h.ask.mock.calls[0]![0]).toEqual({ kind: 'replace' }) // 精确匹配：replace 决策不携带其他字段
    expect(settle).not.toHaveBeenCalled() // 不预先 flush
    expect(h.setGateOpen).not.toHaveBeenCalledWith(false) // 落定步才「开门→收口回冻结」——零落定步＝无回冻结
    expect(h.ask.mock.invocationCallOrder[0]!).toBeLessThan(h.setGateOpen.mock.invocationCallOrder[0]!) // 成功开门在确认之后
    expect(h.loadPayload).toHaveBeenCalledTimes(1)
    expect(h.ask.mock.invocationCallOrder[0]!).toBeLessThan(h.loadPayload.mock.invocationCallOrder[0]!) // 确认在载入前
  })

  it('有未落定写：仍先落定（落定先于 read），只问 settle-replace——不二问 replace', async () => {
    const settle = vi.fn(async () => ({ ok: true, savedActions: 2, savedDraft: false }))
    const h = harness({
      hasUnsettledWrites: () => true,
      hasReplaceableSession: () => true,
      settleUnsettledWrites: settle,
      runRestorePreflight: ranNoConflict
    })
    await run(h)
    expect(settle).toHaveBeenCalledTimes(1)
    expect(settle.mock.invocationCallOrder[0]!).toBeLessThan(h.read.mock.invocationCallOrder[0]!) // 先落定后 read
    expect(kinds(h)).toEqual(['settle-replace'])
    expect(h.loadPayload).toHaveBeenCalledTimes(1)
  })

  it('用户拒绝替换确认：不载入、busy 复位（条回可重试）、门不开', async () => {
    const h = harness(
      { hasUnsettledWrites: () => false, hasReplaceableSession: () => true, runRestorePreflight: ranNoConflict },
      { answer: false }
    )
    await run(h)
    expect(kinds(h)).toEqual(['replace'])
    expect(h.loadPayload).not.toHaveBeenCalled()
    expect(h.emit).toHaveBeenLastCalledWith({ busy: false })
    expect(h.setGateOpen).not.toHaveBeenCalledWith(true)
  })

  it('宿主未提供 hasReplaceableSession＝旧语义：非 defer 零确认直达；defer 过且接了预检＝replace 一次（C5）；未接预检的旧夹具 defer 后仍零确认', async () => {
    const direct = harness({ hasUnsettledWrites: () => false, runRestorePreflight: ranNoConflict })
    await run(direct)
    expect(direct.ask).not.toHaveBeenCalled()
    expect(direct.loadPayload).toHaveBeenCalledTimes(1)
    const deferred = harness({ hasUnsettledWrites: () => false, runRestorePreflight: ranNoConflict }, { pendingChip: true })
    await run(deferred)
    expect(kinds(deferred)).toEqual(['replace'])
    expect(deferred.loadPayload).toHaveBeenCalledTimes(1)
    const legacy = harness({ hasUnsettledWrites: () => false }, { pendingChip: true })
    await run(legacy)
    expect(legacy.ask).not.toHaveBeenCalled()
    expect(legacy.loadPayload).toHaveBeenCalledTimes(1)
  })

  it('可替换且预检有冲突：冲突清单确认携 replaceWarning=true，一次确认不二问', async () => {
    const conflict = { index: 0, kind: 'patch-node' as const, level: 'lost' as const, reason: '第 1 项：节点调整的目标节点已不存在，无法原样恢复' }
    const h = harness({ hasUnsettledWrites: () => false, hasReplaceableSession: () => true, runRestorePreflight: async () => ({ kind: 'ran', conflicts: [conflict] }) })
    await run(h)
    expect(h.ask).toHaveBeenCalledTimes(1)
    expect(h.ask.mock.calls[0]![0]).toEqual({ kind: 'conflicts', conflicts: [conflict], replaceWarning: true })
    expect(h.loadPayload).toHaveBeenCalledTimes(1)
  })

  it('宿主未提供谓词且预检有冲突：replaceWarning 仍只随 pendingChip（旧语义）', async () => {
    const conflict = { index: 0, kind: 'patch-node' as const, level: 'lost' as const, reason: '第 1 项：节点调整的目标节点已不存在，无法原样恢复' }
    const preflight = async (): Promise<{ kind: 'ran'; conflicts: [typeof conflict] }> => ({ kind: 'ran', conflicts: [conflict] })
    const clean = harness({ hasUnsettledWrites: () => false, runRestorePreflight: preflight })
    await run(clean)
    expect(clean.ask.mock.calls[0]![0]).toEqual({ kind: 'conflicts', conflicts: [conflict], replaceWarning: false })
    const deferred = harness({ hasUnsettledWrites: () => false, runRestorePreflight: preflight }, { pendingChip: true })
    await run(deferred)
    expect(deferred.ask.mock.calls[0]![0]).toEqual({ kind: 'conflicts', conflicts: [conflict], replaceWarning: true })
    expect(kinds(deferred)).toEqual(['conflicts']) // 冲突清单确认后不再问 replace
  })
})

describe('R-B5 文案：替换确认写明实际后果', () => {
  it('replace：标题/既有行/确认钮不变，补后果说明行', () => {
    const view = restoreDecisionView({ kind: 'replace' })
    expect(view.title).toBe('用副本替换当前图？')
    expect(view.confirmLabel).toBe('替换并恢复')
    expect(view.lines).toContain(CONSEQUENCE_LINE)
    expect(view.lines).toContain('恢复将用副本替换当前图；未包含在副本内的修改将被副本内容取代（已落库修改保留在数据库）。')
  })

  it('settle-replace：既有「已保存当前 N 项修改」行不变，补后果说明行', () => {
    const view = restoreDecisionView({ kind: 'settle-replace', savedActions: 3, savedDraft: true })
    expect(view.confirmLabel).toBe('继续恢复')
    expect(view.lines).toContain('已保存当前 3 项修改及一份未收口草稿。')
    expect(view.lines).toContain(CONSEQUENCE_LINE)
  })
})

describe('R-B5 生产装配 buildRecoverySchedulerInit：hasReplaceableSession 按「目标会话」求值（用户裁决 R2：只看目标会话）', () => {
  const build = (): ReturnType<typeof buildRecoverySchedulerInit> => buildRecoverySchedulerInit(async () => true, { workspaceId: () => 'w1' })
  /** 改动前钩子缺席＝false（?? false 使缺席与「假」同为红——断言「真」的用例即红） */
  const replaceable = (folderId: string): boolean => build().hasReplaceableSession?.(folderId) ?? false

  beforeEach(() => {
    resetLineageSessionsForTests()
    stubApi.lineage.patchNode.mockImplementation(async (req: Partial<LineageNode>) => ({ ok: true, data: { ...node(String(req.id)), ...req } }))
    useLineageStore.setState({
      nodes: [node('A')],
      edges: [],
      floatingNotes: [],
      status: 'ready',
      error: null,
      saveStatus: 'clean',
      lastWriteError: null,
      queue: [],
      flushing: false,
      inflight: null,
      needsReload: false,
      undoStack: [],
      redoStack: [],
      unfinalized: false,
      folderId: MAIN_GRAPH_ID
    })
  })
  afterEach(() => {
    useLineageStore.setState({ queue: [], saveStatus: 'clean' }) // 用例自清（防跨用例 flush 残留队列）
    resetLineageSessionsForTests()
  })

  it('生产 init 携带该钩子；干净会话（Q0/F0/无草稿、U=0、两栈空）→假', () => {
    const init = build()
    expect(typeof init.hasReplaceableSession).toBe('function')
    expect(replaceable(MAIN_GRAPH_ID)).toBe(false)
  })

  it('仅 unfinalized（IO clean 灰点）→真；仅 undo 栈→真；仅 redo 栈→真', () => {
    useLineageStore.setState({ unfinalized: true })
    expect(replaceable(MAIN_GRAPH_ID)).toBe(true)
    useLineageStore.setState({ unfinalized: false, undoStack: [makeHistoryEntry()] })
    expect(replaceable(MAIN_GRAPH_ID)).toBe(true)
    useLineageStore.setState({ undoStack: [], redoStack: [makeHistoryEntry({ id: 'unit-redo' })] })
    expect(replaceable(MAIN_GRAPH_ID)).toBe(true)
  })

  it('未落定写在场（Q=1）→真，且与 hasUnsettledWrites 同真（落定步先行）', () => {
    useLineageStore.setState({ queue: [{ kind: 'patch-node', id: 'A', patch: { x: 1 } }], saveStatus: 'dirty' })
    const init = build()
    expect(init.hasReplaceableSession?.(MAIN_GRAPH_ID)).toBe(true)
    expect(init.hasUnsettledWrites?.()).toBe(true)
  })

  it('目标会话≠活动会话：仅目标会话（挂起缓存）有撤销历史→真；无会话的 folder→假', () => {
    lineageRegistry.ensure('f-target')
    lineageRegistry.update('f-target', { status: 'ready', undoStack: [makeHistoryEntry({ id: 'unit-target', folderId: 'f-target' })] })
    expect(replaceable('f-target')).toBe(true)
    expect(replaceable('f-no-session')).toBe(false)
  })

  it('目标会话干净→假（用户裁决 R2：只看目标会话——仅活动会话有历史不再触发替换确认）', () => {
    useLineageStore.setState({ undoStack: [makeHistoryEntry()] })
    lineageRegistry.ensure('f-target')
    lineageRegistry.update('f-target', { status: 'ready' })
    expect(replaceable('f-target')).toBe(false)
  })

  it('目标≠活动且目标会话有未保存标记（unfinalized）→真（R2：目标会话面）', () => {
    lineageRegistry.ensure('f-target')
    lineageRegistry.update('f-target', { status: 'ready', unfinalized: true })
    expect(replaceable('f-target')).toBe(true)
  })

  it('草稿在场→真（草稿属活动图、在场恒真——R2 收窄后不变；目标无会话亦真）', () => {
    lineageRegistry.ensure('f-target')
    lineageRegistry.update('f-target', { status: 'ready' })
    setNoteDraftSnapshot({ noteId: 'n1', text: 'x' })
    try {
      expect(replaceable('f-target')).toBe(true)
      expect(replaceable('f-no-session-draft')).toBe(true)
    } finally {
      setNoteDraftSnapshot(null)
    }
  })

  // 对应项（用户裁决 R2 的追加清单，既有例已覆盖、不重复）：目标会话＝活动会话且有撤销
  // 历史→真＝「仅 undo 栈→真」例（上）；目标无会话→假＝「无会话的 folder→假」例（上）。
})

describe('R-B5 RecoveryBarHost 真装配：仅 U/H/R（IO clean）的恢复先弹替换确认', () => {
  let root: Root | null = null
  let host: HTMLDivElement | null = null

  const flush = async (turns = 8): Promise<void> => {
    for (let i = 0; i < turns; i++) {
      await act(async () => {
        await Promise.resolve()
      })
    }
  }
  const btn = (id: string): HTMLButtonElement | null => document.querySelector(`[data-testid="${id}"]`) as HTMLButtonElement | null
  const dialog = (): HTMLElement | null => document.querySelector('[role="dialog"]')
  const nodeIds = (): string[] => useLineageStore.getState().nodes.map((n) => n.id)

  async function clickBar(id: string): Promise<void> {
    const b = btn(id)
    expect(b, `确认条应含 [data-testid="${id}"] 按钮`).not.toBeNull()
    await act(async () => {
      b!.click()
    })
    await flush()
  }
  async function clickDialogButton(label: string): Promise<void> {
    const d = dialog()
    expect(d, '确认框应在场').not.toBeNull()
    const b = Array.from(d!.querySelectorAll('button')).find((x) => x.textContent === label)
    expect(b, `确认框应含「${label}」按钮`).not.toBeNull()
    await act(async () => {
      b!.click()
    })
    await flush()
  }

  beforeEach(async () => {
    resetRecoveryScheduler()
    resetLineageSessionsForTests()
    stubApi.recovery.peek.mockResolvedValue({
      ok: true,
      data: {
        slots: {
          'lineage-session': {
            status: 'available',
            epoch: 0,
            file: { token: 'tok-guard', writtenAt: 'w', lastWriterSession: 'old', actionCount: 0, draftPresent: false }
          }
        }
      }
    })
    stubApi.recovery.save.mockResolvedValue({ ok: true, data: { status: 'saved', token: 'tok-new', epoch: 0 } })
    stubApi.recovery.release.mockResolvedValue({ ok: true, data: { status: 'released', epoch: 1 } })
    stubApi.recovery.read.mockResolvedValue({ ok: true, data: { status: 'found', payload: COPY_PAYLOAD } })
    stubApi.folders.list.mockResolvedValue({ ok: true, data: [{ id: 'fold-1', name: '夹', position: 0, createdAt: 't' }] })
    stubApi.lineage.graph.mockResolvedValue({
      ok: true,
      data: { nodes: [node('A')], edges: [], paperMetrics: {}, lineTypeNames: defaultLineTypeNames(), pubNos: {}, tagNames: {}, floatingNotes: [] }
    })
    useWorkspaceStore.setState({ items: [{ id: 'w1', name: '默认课题', createdAt: '2026-08-28T00:00:00Z', paperCount: 3 }], currentId: 'w1', loading: false, error: null })
    useLineageStore.setState({
      nodes: [node('A')],
      edges: [],
      floatingNotes: [],
      status: 'ready',
      error: null,
      saveStatus: 'clean',
      lastWriteError: null,
      queue: [],
      flushing: false,
      inflight: null,
      needsReload: false,
      undoStack: [],
      redoStack: [],
      unfinalized: false,
      folderId: MAIN_GRAPH_ID
    })
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () => {
      root?.render(<RecoveryBarHost />)
    })
    await flush() // ws-entry 屏障：enter→peek(available)→确认条
    expect(getRecoveryState().phase).toBe('await-decision')
  })

  afterEach(() => {
    act(() => {
      root?.unmount()
    })
    root = null
    host?.remove()
    host = null
    resetRecoveryScheduler()
    resetLineageSessionsForTests()
  })

  it('仅 U/H/R：点恢复→替换确认框（含后果说明行、无落定计数行）→取消＝不载入、条可重试→再恢复→确认＝载入副本', async () => {
    act(() => {
      useLineageStore.setState({ unfinalized: true, undoStack: [makeHistoryEntry()] }) // IO clean：Q0/F0，仅灰点与撤销历史
    })
    expect(useLineageStore.getState().saveStatus).toBe('clean')
    stubApi.recovery.read.mockClear()
    await clickBar('recovery-restore')
    const d = dialog()
    expect(d, '仅 U/H/R 的恢复须先弹替换确认').not.toBeNull()
    expect(d!.textContent).toContain('用副本替换当前图')
    expect(d!.textContent).toContain(CONSEQUENCE_LINE)
    expect(d!.textContent).not.toContain('已保存当前') // 未走落定步（无写可落定）
    expect(nodeIds()).toEqual(['A']) // 确认前不载入
    await clickDialogButton('取消')
    expect(dialog()).toBeNull()
    expect(nodeIds()).toEqual(['A'])
    expect(getRecoveryState().busy).toBe(false) // 条回可重试
    expect(getRecoveryState().phase).toBe('await-decision')
    stubApi.recovery.read.mockClear()
    await clickBar('recovery-restore')
    expect(dialog(), '重试：再次弹替换确认').not.toBeNull()
    await clickDialogButton('替换并恢复')
    expect(stubApi.recovery.read).toHaveBeenCalledTimes(1)
    expect(nodeIds()).toEqual(['COPY']) // 确认后才载入
    expect(useLineageStore.getState().undoStack).toEqual([]) // 目标会话历史随替换清除（§2.5 #39）
    expect(getRecoveryState().phase).toBe('open')
  })

  it('干净会话（非 defer）：零确认直达载入（启动屏障语义——e2e R1–R5 保持）', async () => {
    await clickBar('recovery-restore')
    expect(dialog()).toBeNull()
    expect(nodeIds()).toEqual(['COPY'])
    expect(getRecoveryState().phase).toBe('open')
  })
})
