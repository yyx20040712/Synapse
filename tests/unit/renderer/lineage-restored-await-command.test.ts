// @vitest-environment jsdom
/**
 * [回炉 W-B2c / 设计稿 §2.5 #10a/#39、§2.6 #41、§8.4「课题切换」行；io-phase-inventory §12]
 * 恢复待令标记（restoredAwaitingCommand——恢复载入后、本会话写链尚无任务起步）的置位点、
 * 清除点与读点的 store/lane 级契约。和解时点=首次命令入链（T1 语义不变——lineage-recovery-authority
 * T 系列锁定的行为不在本文件重述，本文件只锁「标记随命令入链而清」与「会话面清除」）。
 * - 置位 S1：applyRecoverySession；常规会话、普通编辑不置位。
 * - 清除 C1-C7：本会话写链的任一任务起步（settleEdit／historyCommand／finalize／save／flushFirst／
 *   reconcileNow／idle 到期 flush）；闸拒的命令不达入链口，标记保持。
 * - 清除 C8-C10：会话被替换（discardSession）／移除／课题切换 reset。
 * - #41 结构事件（[回炉 W-B2d] 主控裁定）：恢复待令会话不适用「活动会话 IO clean→立即和解」——这是
 *   自动和解的另一条路径，同样挡住。Q=0 与 Q>0 两格都位保留（needsReload、标记、恢复图四面），首次命令
 *   入链时按当前 epoch 和解。边界：#42 后台删夹路径不变——它的判据 ioClean 不看标记。
 * 调度器不装配（未装配一切入口 no-op+门恒开）。always-active。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IDLE_FLUSH_MS } from '@shared/constants'
import { MAIN_GRAPH_ID } from '@shared/models/lineage'
import type { FloatingNote, LineageNode } from '../../../src/shared/models/lineage'
import type { LineageRecoveryPayload } from '../../../src/shared/recovery/schemas'
import { makeApiStub } from '../../utils/api-client-mock'
import { echoHistoryUnit } from '../../utils/lineage-history-stub'
import { resetLineageSessionsForTests } from './lineage-test-session-reset'

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

import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { lineageRegistry } from '../../../src/renderer/features/lineage/lineage-session-registry'
import { lineageFolderReconcile } from '../../../src/renderer/features/lineage/lineage-folder-reconcile'

const NAMES = ['一', '二', '三', '四', '五', '六']
const DB_TEXT = '库态正文'
const COPY_TEXT = '旧副本正文'

function node(id: string, over: { x?: number | null; y?: number | null } = {}): LineageNode {
  return {
    id,
    paperId: `paper-${id}`,
    title: `节点${id}`,
    year: 2021,
    x: over.x ?? null,
    y: over.y ?? null,
    month: 9,
    slot: 0,
    folderId: '__main__',
    createdAt: 't0',
    updatedAt: 't0'
  }
}
const note = (id: string, content: string): FloatingNote => ({ id, folderId: '__main__', x: 100, y: 100, content, createdAt: 't0', updatedAt: 't0' })

/** 库态回包（graph 单读形——四面+派生三面空集） */
const dbGraph = (): { ok: true; data: Record<string, unknown> } => ({
  ok: true,
  data: { nodes: [node('A')], edges: [], paperMetrics: {}, pubNos: {}, tagNames: {}, lineTypeNames: NAMES, floatingNotes: [note('fn', DB_TEXT)] }
})

/** 恢复副本载荷：图四面与库态处处不同（位置、笔记正文） */
function restore(queue: LineageRecoveryPayload['queue'] = []): void {
  useLineageStore.getState().applyRecoverySession({
    folderId: '__main__',
    graph: { nodes: [node('A', { x: 100, y: 100 })], edges: [], lineTypeNames: NAMES, floatingNotes: [note('fn', COPY_TEXT)] },
    queue,
    draft: null
  })
}

const state = () => useLineageStore.getState()
/** 活动会话的恢复待令标记——读会话面（registry entry.data=单源）。活动投影的读点（LineagePage 挂载
 *  效应）由 lineage-restored-await-mount.test.tsx 覆盖；夹具的「移除会话+部分植入」不重投影未携字段；
 *  生产面会话成为活动会话必经 activate/replace/resetWorkspace 的整幅投影 */
const awaiting = (): boolean => lineageRegistry.entry(lineageRegistry.activeFolder())?.data.restoredAwaitingCommand === true
const loadSpy = stubApi.lineage.graph
const settle = async (turns = 12): Promise<void> => {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}
/** 图四面（与库态回包逐一比较——derived 三面不在比较器） */
const faces = () => ({ nodes: state().nodes, edges: state().edges, lineTypeNames: state().lineTypeNames, floatingNotes: state().floatingNotes })
const dbFaces = () => ({ nodes: [node('A')], edges: [], lineTypeNames: NAMES, floatingNotes: [note('fn', DB_TEXT)] })
/** 恢复副本载荷的图四面（restore() 载入的现值） */
const copyFaces = () => ({ nodes: [node('A', { x: 100, y: 100 })], edges: [], lineTypeNames: NAMES, floatingNotes: [note('fn', COPY_TEXT)] })

beforeEach(() => {
  vi.clearAllMocks()
  loadSpy.mockReset()
  loadSpy.mockResolvedValue(dbGraph())
  stubApi.lineage.patchNode.mockImplementation(
    async (req: Partial<LineageNode> & { id: string }) => ({ ok: true, data: { ...node(req.id), ...req } })
  )
  stubApi.lineage.historyUnit.mockImplementation(echoHistoryUnit)
  resetLineageSessionsForTests() // 跨用例不复用旧会话
  useLineageStore.setState({
    nodes: [node('A')],
    edges: [],
    floatingNotes: [],
    status: 'ready',
    error: null,
    inflight: null,
    folderId: '__main__',
    saveStatus: 'clean',
    lastWriteError: null,
    queue: [],
    flushing: false,
    needsReload: false,
    undoStack: [],
    redoStack: []
  })
})

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
  resetLineageSessionsForTests()
})

describe('置位 S1：applyRecoverySession', () => {
  it('恢复载入后标记为真，且与 needsReload 同点置位', () => {
    expect(awaiting()).toBe(false) // 前提：常规会话不置位
    restore()
    expect(awaiting()).toBe(true)
    expect(state().needsReload).toBe(true)
    expect(loadSpy).not.toHaveBeenCalled()
  })

  it('常规会话不置位：后台失效置位（needsReload=1）与普通编辑都不置位', () => {
    useLineageStore.setState({ needsReload: true })
    expect(awaiting()).toBe(false)
    useLineageStore.setState({ needsReload: false })
    state().moveNode('A', 1, 1)
    expect(state().saveStatus).toBe('dirty')
    expect(awaiting()).toBe(false)
  })
})

describe('(ii) 首次显式保存：和解恰一次→位清、四面=库态（T1/T2 语义不变）', () => {
  it('save()·T1 形（Q=1）：drain→和解恰一次→位清、四面=库态；标记在任务起步时同步清', async () => {
    restore([{ kind: 'patch-node', id: 'A', patch: { x: 9, y: 9 } }])
    loadSpy.mockClear()
    const saving = state().save()
    expect(awaiting(), '写链任务起步=首次命令入链——入链调用点同步可见').toBe(false)
    await saving
    await settle()
    expect(stubApi.lineage.patchNode).toHaveBeenCalledTimes(1)
    expect(loadSpy).toHaveBeenCalledTimes(1)
    expect(state().needsReload).toBe(false)
    expect(faces()).toEqual(dbFaces())
    expect(state().saveStatus).toBe('clean')
    expect(awaiting()).toBe(false)
  })

  it('save()·T2 形（Q=0）：和解恰一次→位清、四面=库态、标记清', async () => {
    restore()
    loadSpy.mockClear()
    await state().save()
    await settle()
    expect(loadSpy).toHaveBeenCalledTimes(1)
    expect(state().needsReload).toBe(false)
    expect(faces()).toEqual(dbFaces())
    expect(awaiting()).toBe(false)
  })

  it('saveActiveFolder()（定稿）：和解恰一次→定稿（U 清），标记清', async () => {
    restore()
    loadSpy.mockClear()
    await expect(state().saveActiveFolder()).resolves.toBe(true)
    await settle()
    expect(loadSpy).toHaveBeenCalledTimes(1)
    expect(state().needsReload).toBe(false)
    expect(state().unfinalized).toBe(false)
    expect(awaiting()).toBe(false)
  })
})

describe('(iv) 标记随会话替换／移除／课题重置清除', () => {
  it('discardSession（放弃恢复副本）：标记假、needsReload 假、零 keyed 读（T3 语义不变）', () => {
    restore()
    loadSpy.mockClear()
    state().discardSession()
    expect(awaiting()).toBe(false)
    expect(state().needsReload).toBe(false)
    expect(loadSpy).not.toHaveBeenCalled()
  })

  it('连续两次恢复（T7）：换代、标记再为真→首次 save 和解恰一次', async () => {
    restore()
    const first = state().sessionGeneration
    restore()
    expect(state().sessionGeneration).toBeGreaterThan(first)
    expect(awaiting()).toBe(true)
    loadSpy.mockClear()
    await state().save()
    await settle()
    expect(loadSpy).toHaveBeenCalledTimes(1)
    expect(state().needsReload).toBe(false)
    expect(awaiting()).toBe(false)
  })

  it('会话移除后同键再建：标记假、needsReload 假', () => {
    restore()
    lineageRegistry.remove('__main__')
    state().setFolder('__main__') // 活动会话被清后的回退径（lineage-folder-reconcile S4）：新会话整幅投影
    expect(lineageRegistry.entry('__main__')?.data.restoredAwaitingCommand).toBe(false)
    expect(state().restoredAwaitingCommand).toBe(false)
    expect(state().needsReload).toBe(false)
  })

  it('课题切换 reset：全部会话新建，标记假', () => {
    restore()
    lineageRegistry.resetWorkspace('ws-2')
    expect(lineageRegistry.sessions().length).toBeGreaterThan(0)
    for (const entry of lineageRegistry.sessions()) expect(entry.data.restoredAwaitingCommand).toBe(false)
    expect(awaiting()).toBe(false)
    expect(state().needsReload).toBe(false)
  })
})

describe('清除点 C1-C7：本会话写链的任一任务起步即清标记', () => {
  it('C5 flushFirst()：入链同步清标记；和解恰一次', async () => {
    restore()
    loadSpy.mockClear()
    lineageRegistry.entry('__main__')!.lane.flushFirst()
    expect(awaiting()).toBe(false)
    await settle()
    expect(loadSpy).toHaveBeenCalledTimes(1)
    expect(state().needsReload).toBe(false)
  })

  it('C6 reconcileNow()：和解照常执行，标记清', async () => {
    restore()
    loadSpy.mockClear()
    await expect(lineageRegistry.entry('__main__')!.lane.reconcileNow()).resolves.toBe('applied')
    await settle()
    expect(loadSpy).toHaveBeenCalledTimes(1)
    expect(state().needsReload).toBe(false)
    expect(awaiting()).toBe(false)
  })

  it('C2 historyCommand（undo）：标记清；和解恰一次后 history-unit 执行', async () => {
    vi.useFakeTimers()
    restore()
    state().moveNode('A', 1, 1) // 恢复会话上的新编辑（不是链任务——标记仍真）
    expect(awaiting()).toBe(true)
    loadSpy.mockClear()
    await expect(state().undo()).resolves.toBe(true)
    await settle()
    expect(loadSpy).toHaveBeenCalledTimes(1)
    expect(state().needsReload).toBe(false)
    expect(awaiting()).toBe(false)
    expect(state().nodes[0]?.x).toBe(100) // 撤销新编辑=回到恢复基线
  })

  it('C3 finalize：标记清（定稿前和解一次）', async () => {
    vi.useFakeTimers()
    restore()
    state().moveNode('A', 1, 1)
    expect(awaiting()).toBe(true)
    await expect(state().saveActiveFolder()).resolves.toBe(true)
    await settle()
    expect(awaiting()).toBe(false)
    expect(state().needsReload).toBe(false)
  })

  it('C1 settleEdit：标记清；落位写留暂存、不自带和解', async () => {
    vi.useFakeTimers()
    restore()
    loadSpy.mockClear()
    const entry = lineageRegistry.entry('__main__')!
    await expect(entry.lane.settleEdit(() => entry.lane.commands.moveNode('A', 3, 3))).resolves.toBe(true)
    expect(awaiting()).toBe(false)
    expect(entry.data.queue).toHaveLength(1) // 落位写留暂存
    expect(loadSpy).not.toHaveBeenCalled() // settle 任务不自带 drain/和解
    await entry.lane.save() // 用例自清
    await settle()
    expect(loadSpy).toHaveBeenCalledTimes(1)
  })

  it('C7 idle 到期的 flush：标记清（恢复会话上先编辑、1.5s 到期）', async () => {
    vi.useFakeTimers()
    restore()
    state().moveNode('A', 1, 1)
    expect(awaiting()).toBe(true)
    expect(vi.getTimerCount()).toBe(1)
    loadSpy.mockClear()
    await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS)
    await settle()
    expect(vi.getTimerCount()).toBe(0)
    expect(stubApi.lineage.patchNode).toHaveBeenCalledTimes(1)
    expect(loadSpy).toHaveBeenCalledTimes(1)
    expect(state().needsReload).toBe(false)
    expect(awaiting(), 'idle flush 也是本会话写链的任务起步——不清则标记滞留为真').toBe(false)
  })

  it('A8 闸拒的命令不达入链口：空栈 undo 返回 false，标记保持、零 keyed 读', async () => {
    restore()
    loadSpy.mockClear()
    await expect(state().undo()).resolves.toBe(false)
    expect(awaiting()).toBe(true)
    expect(loadSpy).not.toHaveBeenCalled()
    expect(state().needsReload).toBe(true)
  })
})

describe('(v) #41 结构事件：恢复待令会话位保留（自动和解的另一条路径同样挡住）', () => {
  it('Q=0：不触发立即和解——keyed 读零次、needsReload 与标记保持、恢复图四面保留；首次显式保存→和解恰一次→位清', async () => {
    restore()
    expect(faces()).toEqual(copyFaces()) // 前提自证：恢复图=副本四面
    loadSpy.mockClear()
    lineageFolderReconcile.onStructureChanged()
    await settle()
    expect(loadSpy, '#41 的「活动会话 IO clean→立即和解」对恢复待令会话不适用').not.toHaveBeenCalled()
    expect(state().inflight).toBe(null) // 未入链——和解留给首次命令
    expect(state().needsReload).toBe(true)
    expect(state().invalidationEpoch).toBe(1) // 位已在 #41 循环里置上（epoch 推进）
    expect(awaiting()).toBe(true)
    expect(faces(), '恢复图四面保留').toEqual(copyFaces())
    await state().save() // 首次命令入链
    await settle()
    expect(loadSpy).toHaveBeenCalledTimes(1)
    expect(loadSpy.mock.calls[0]).toEqual([{ folderId: '__main__' }])
    expect(state().needsReload).toBe(false)
    expect(awaiting()).toBe(false)
    expect(faces()).toEqual(dbFaces())
  })

  it('恢复会话含待写（Q=1）：不触发立即和解，位与标记保持、零 keyed 读', async () => {
    restore([{ kind: 'patch-node', id: 'A', patch: { x: 9, y: 9 } }])
    loadSpy.mockClear()
    lineageFolderReconcile.onStructureChanged()
    await settle()
    expect(loadSpy).not.toHaveBeenCalled()
    expect(state().needsReload).toBe(true)
    expect(state().invalidationEpoch).toBe(1)
    expect(awaiting()).toBe(true)
    expect(state().floatingNotes.map((n) => n.content)).toEqual([COPY_TEXT])
    expect(faces(), '恢复图四面保留').toEqual(copyFaces()) // [回炉 W-B2d] 新增：四面逐一比较
  })
})

describe('边界：#42 后台删夹路径不变（ioClean 不看标记——W-B2d 只改 #41 的那一个条件）', () => {
  it('Q=0 的恢复待令会话其文件夹被后台删除：仍按 IO clean 清会话并回退主图', () => {
    useLineageStore.getState().applyRecoverySession({
      folderId: 'f-x',
      graph: { nodes: [], edges: [], lineTypeNames: NAMES, floatingNotes: [{ ...note('fn-x', COPY_TEXT), folderId: 'f-x' }] },
      queue: [],
      draft: null
    })
    expect(state().folderId).toBe('f-x') // 前提：恢复的目标会话是活动会话
    expect(awaiting()).toBe(true)
    expect(lineageFolderReconcile.onFoldersRefreshed([MAIN_GRAPH_ID]), '已删文件夹的会话照常清出（#42「IO clean 的挂起会话可清」）').toBe('fallback')
    expect(lineageRegistry.entry('f-x')).toBeUndefined()
    expect(state().folderId).toBe('__main__')
  })
})
