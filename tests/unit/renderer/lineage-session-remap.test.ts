// @vitest-environment jsdom
/**
 * [回炉 W-B1·R-remap/R-B1b / 设计稿 §2.3 会话身份、§8.1、§2.6 #34、INV-175、INV-188]
 * ghost remap 落库后的会话终态（处置单 R-remap 五点终态规则的 ①–④；⑤ owner 与 chip 见
 * lineage-session-remap-owner.test.tsx）：
 * ① 注册表主图恰一个会话，键与 data.folderId 都是 __main__，并换代；被矫正会话离场；
 * ② 存活会话数据=原主图缓存会话（保留其队列/在途写/历史），否则新建；
 * ③ needsReload=1、invalidationEpoch+1；活动且 IO clean→立即按 #34 单飞和解（恰一次 keyed 读）；
 * ④ 被矫正会话移除：两栈清空、unfinalized 并入存活会话、草稿先提交。
 * 夹具=lineage-remap-test-fixture（先工厂后被测模块）。always-active 裸 describe（K3）。
 */
import {
  DOOM, MAIN, cleanupRemapFixture, conflict, enterGhostConflict, ghostStubs, mainReads, mainSessions, node,
  noteIds, registry, resetRemapFixture, settle, state, stubApi, useLineageStore
} from './lineage-remap-test-fixture'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getConflictState, resolveGhostFolderDecision } from '../../../src/renderer/features/lineage/conflictResolution'
import { noteDraftPending, noteDraftSnapshot, registerNoteDraftFlush, setNoteDraftPending, setNoteDraftSnapshot, unregisterNoteDraftFlush } from '../../../src/renderer/features/lineage/lineage-note-draft'
import { defaultLineTypeNames, type FloatingNote, type LineageNode } from '@shared/models/lineage'
import { echoHistoryUnit } from '../../utils/lineage-history-stub'
import type { LineageGraphRes } from '../../../src/shared/ipc/schemas'
import type { LineageHistoryUnitReq, LineageHistoryUnitRes } from '../../../src/shared/ipc/lineage-history.schemas'

beforeEach(async () => {
  await resetRemapFixture()
})

afterEach(() => {
  cleanupRemapFixture()
})

describe('① 主图恰一个会话：键=folderId=__main__ 且换代；被矫正会话离场', () => {
  it('原主图缓存会话在场：remap 落库后恰一个主图会话（就地换代）、死夹会话不在注册表、活动=主图', async () => {
    ghostStubs()
    expect(registry.entry(MAIN)?.data.status).toBe('ready') // 前提：主图会话已驻留
    const generationBefore = registry.entry(MAIN)!.data.sessionGeneration
    const { flush: p } = await enterGhostConflict()
    resolveGhostFolderDecision('remap-main-graph')
    await p
    expect(mainSessions()).toHaveLength(1)
    const [main] = mainSessions()
    expect(main!.key).toBe(MAIN)
    expect(main!.data.folderId).toBe(MAIN)
    expect(main!.data.sessionGeneration).toBeGreaterThan(generationBefore) // 会话身份已变
    expect(registry.entry(DOOM)).toBeUndefined() // 被矫正的原文件夹会话移除
    expect(state().folderId).toBe(MAIN)
  })

  it('无主图缓存会话（活动会话改键为死夹）：落库后新建主图会话，两栈清空、unfinalized 并入', async () => {
    const { savedNote } = ghostStubs()
    useLineageStore.setState({ folderId: DOOM }) // 主图键下不再有会话
    expect(registry.entry(MAIN)).toBeUndefined()
    state().addFloatingNote(0, 0, '甲')
    expect(registry.entry(DOOM)!.data.undoStack).toHaveLength(1) // 前置：死夹会话有一条历史
    const p = state().save()
    await settle()
    resolveGhostFolderDecision('remap-main-graph')
    await p
    expect(mainSessions()).toHaveLength(1)
    const [main] = mainSessions()
    expect(main!.key).toBe(MAIN)
    expect(main!.data.folderId).toBe(MAIN)
    expect(main!.data.undoStack).toEqual([]) // ④ 被矫正会话的两栈清空（不迁入）
    expect(main!.data.unfinalized).toBe(true) // ④ unfinalized 并入（灰点留到下次显式保存）
    expect(registry.entry(DOOM)).toBeUndefined()
    expect(noteIds()).toEqual([savedNote()!.id])
  })
})

describe('决策后、落库前：不保留「键与 data.folderId 偏离」的中间态', () => {
  it('remap 决策后到落库前，被矫正会话键与 data.folderId 不偏离；乐观笔记行已改投主图', async () => {
    let releaseUpsert!: (v: { ok: true; data: FloatingNote }) => void
    let saved: FloatingNote | null = null
    stubApi.lineage.upsertFloatingNote.mockImplementation((req: { folderId: string; id?: string }) =>
      req.folderId === DOOM
        ? Promise.resolve(conflict())
        : new Promise((r) => {
            releaseUpsert = r
            saved = { id: req.id ?? 'n1', folderId: MAIN, x: 0, y: 0, content: '甲', createdAt: 't', updatedAt: 't' }
          })
    )
    const { flush: p } = await enterGhostConflict()
    resolveGhostFolderDecision('remap-main-graph')
    await settle()
    expect(releaseUpsert).toBeDefined() // 前置：remapped 动作已派发、尚未落库
    expect(getConflictState().pending).toBeNull()
    const corrected = registry.entry(DOOM)!
    expect(corrected.key).toBe(DOOM)
    expect(corrected.data.folderId).toBe(DOOM) // 键与数据键一致——改键发生在落库后（换新身份）
    expect(corrected.data.floatingNotes.every((n) => n.folderId === MAIN)).toBe(true) // 乐观图态同行 remap
    releaseUpsert({ ok: true, data: saved! })
    await p
    expect(registry.entry(DOOM)).toBeUndefined()
  })
})

describe('③ 图态显示落库后的主图：立即单飞和解、切回主图不再取数', () => {
  it('落库后恰一次主图 keyed 读→笔记可见；切回主图零 graph IPC', async () => {
    const { savedNote } = ghostStubs()
    expect(mainReads()).toBe(0)
    const { flush: p } = await enterGhostConflict()
    resolveGhostFolderDecision('remap-main-graph')
    await p
    expect(mainReads()).toBe(1) // 恰一次 #34 单飞和解（被矫正会话的链尾不重复发读）
    expect(noteIds()).toEqual([savedNote()!.id]) // 含被矫正的笔记
    expect(state().needsReload).toBe(false)
    expect(state().status).toBe('ready')
    const calls = stubApi.lineage.graph.mock.calls.length
    state().setFolder(MAIN) // 显式切主图
    await settle()
    expect(stubApi.lineage.graph.mock.calls.length).toBe(calls) // 不再取数
    expect(noteIds()).toEqual([savedNote()!.id])
  })

  it('主图为活动会话、死夹会话挂起：remap 落库不夺活动会话；主图就地换代并立即和解（不切即见）', async () => {
    const { savedNote } = ghostStubs()
    state().setFolder(DOOM)
    await settle()
    state().addFloatingNote(0, 0, '甲')
    state().setFolder(MAIN) // 死夹 flush-first→CONFLICT→询问挂起
    await settle()
    expect(getConflictState().pending).toEqual({ folderId: DOOM })
    expect(state().folderId).toBe(MAIN)
    const generationBefore = registry.entry(MAIN)!.data.sessionGeneration
    resolveGhostFolderDecision('remap-main-graph')
    await settle(40)
    expect(state().folderId).toBe(MAIN) // 不夺活动会话
    expect(registry.entry(DOOM)).toBeUndefined()
    expect(registry.entry(MAIN)!.data.sessionGeneration).toBeGreaterThan(generationBefore)
    expect(noteIds()).toEqual([savedNote()!.id]) // 不切即见
    expect(mainReads()).toBe(1)
    expect(state().needsReload).toBe(false)
  })

  it('存活会话有 history-unit 在途时 remap：不换代（已申报的窄化）但 needsReload=1、epoch+1 照置——remap 前发起的旧 graph 读被 epoch 拒绝、不写图态', async () => {
    type Read = { ok: true; data: LineageGraphRes }
    const mainReads: Array<(v: Read) => void> = []
    const graphOfLocal = (nodes: LineageNode[], saved: FloatingNote | null): Read =>
      ({ ok: true, data: { nodes, edges: [], lineTypeNames: defaultLineTypeNames(), paperMetrics: {}, pubNos: {}, tagNames: {}, floatingNotes: saved ? [saved] : [] } })
    let saved: FloatingNote | null = null
    stubApi.lineage.upsertFloatingNote.mockImplementation(async (req: { folderId: string; id?: string }) => {
      if (req.folderId === DOOM) return conflict()
      saved = { id: req.id ?? 'n1', folderId: MAIN, x: 0, y: 0, content: '甲', createdAt: 't', updatedAt: 't' }
      return { ok: true as const, data: saved }
    })
    stubApi.lineage.graph.mockImplementation((req: { folderId: string }) =>
      req.folderId === MAIN ? new Promise<Read>((r) => mainReads.push(r)) : Promise.resolve(graphOfLocal([node('A', req.folderId)], null))
    )
    let releaseUnit!: (v: { ok: true; data: LineageHistoryUnitRes }) => void
    stubApi.lineage.historyUnit.mockImplementationOnce((req: LineageHistoryUnitReq) => new Promise((r) => {
      releaseUnit = async () => r(await echoHistoryUnit(req)) // history-unit 回执由用例放行
    }))
    const main = registry.entry(MAIN)!
    const generationBefore = main.data.sessionGeneration
    const epochBefore = main.data.invalidationEpoch
    const oldRead = registry.loader.reconcile(main) // remap 前发起的 keyed 读（捕获 epochBefore）
    await settle()
    expect(mainReads).toHaveLength(1)
    expect(main.inflightGraph?.identity.epoch).toBe(epochBefore)
    state().moveNode('A', 3, 4) // 主图：一条可撤销历史
    const undoing = state().undo() // 预 drain 落库→history-unit 在途（挂起待决的 conflict 门会拒命令——须先于询问发起）
    await settle(40)
    expect(main.data.inflight?.kind).toBe('history') // 前置：存活会话有 history-unit 在途
    state().setFolder(DOOM)
    await settle()
    state().addFloatingNote(0, 0, '甲')
    state().setFolder(MAIN) // 死夹 flush-first→CONFLICT→询问挂起；主图=既有会话（history 仍在途）
    await settle()
    expect(getConflictState().pending).toEqual({ folderId: DOOM })
    expect(main.data.inflight?.kind).toBe('history')
    resolveGhostFolderDecision('remap-main-graph')
    await settle(40)
    expect(registry.entry(DOOM)).toBeUndefined() // remap 落库、被矫正会话离场
    expect(main.data.sessionGeneration).toBe(generationBefore) // 窄化：history 在途不换代（在途 undo 的回显不被判迟到）
    expect(main.data.invalidationEpoch).toBe(epochBefore + 1) // 失效照置
    expect(main.data.needsReload).toBe(true)
    mainReads[0]!(graphOfLocal([node('STALE')], null)) // remap 前发起的旧读到达
    await settle()
    expect(main.data.nodes.map((n) => n.id)).toEqual(['A']) // 被 epoch 拒绝——不写图态
    expect(mainReads).toHaveLength(2) // loader 按新 epoch 重新单飞
    expect(main.inflightGraph?.identity.epoch).toBe(epochBefore + 1)
    expect(main.data.needsReload).toBe(true)
    releaseUnit!({ ok: true, data: (await echoHistoryUnit({ folderId: MAIN, unitId: 'u', direction: 'undo', changes: [] })).data })
    expect(await undoing).toBe(true) // 在途 undo 照常完成（会话未换代）
    mainReads[1]!(graphOfLocal([node('A')], saved)) // 新 epoch 的读：权威应用
    await oldRead
    expect(main.data.needsReload).toBe(false)
    expect(noteIds()).toEqual([saved!.id])
  })

  it('remap 后队列中的色行名动作按主图派发（请求 folderId=remap 目标）', async () => {
    const names = ['一', '二', '三', '四', '五', '六']
    ghostStubs()
    state().setFolder(DOOM)
    await settle()
    state().addFloatingNote(0, 0, '甲')
    state().saveLineTypeNames(names)
    const p = state().save()
    await settle()
    resolveGhostFolderDecision('remap-main-graph')
    await p
    expect(stubApi.lineage.upsertLineTypes).toHaveBeenCalledTimes(1)
    expect(stubApi.lineage.upsertLineTypes).toHaveBeenCalledWith({ folderId: MAIN, names })
  })
})

describe('② 存活会话数据=原主图缓存会话；他会话不受影响', () => {
  it('原主图缓存会话的待写队列与历史保留：在途写续落本会话，链尾按新 epoch 续拉', async () => {
    const { savedNote } = ghostStubs()
    let releaseA!: (v: { ok: true; data: LineageNode }) => void
    stubApi.lineage.patchNode.mockImplementation((req: Partial<LineageNode>) =>
      req.id === 'A'
        ? new Promise((r) => (releaseA = r))
        : Promise.resolve({ ok: true as const, data: { ...node(String(req.id)), ...req } as LineageNode })
    )
    state().moveNode('A', 3, 4) // 主图：Q=1、undo 1
    const generationBefore = registry.entry(MAIN)!.data.sessionGeneration
    state().setFolder(DOOM) // 主图 flush-first：patchNode(A) 在途
    await settle()
    expect(registry.entry(MAIN)!.data.inflight).not.toBeNull() // 前置：主图缓存会话有在途写
    state().addFloatingNote(0, 0, '甲')
    const p = state().save()
    await settle()
    resolveGhostFolderDecision('remap-main-graph')
    await p
    const main = registry.entry(MAIN)!
    expect(mainSessions()).toHaveLength(1)
    expect(main.data.sessionGeneration).toBeGreaterThan(generationBefore) // 换代
    expect(main.data.queue).toHaveLength(1) // ② 待写队列保留
    expect(main.data.undoStack).toHaveLength(1) // ② 历史保留
    expect(main.data.needsReload).toBe(true) // ③ 有在途写：位保留、不立即和解
    expect(mainReads()).toBe(0)
    releaseA({ ok: true, data: { ...node('A'), x: 3, y: 4 } })
    await settle(40)
    expect(main.data.queue).toHaveLength(0)
    expect(main.data.saveStatus).toBe('clean')
    expect(mainReads()).toBe(1) // 链尾续拉恰一次
    expect(main.data.needsReload).toBe(false)
    expect(noteIds()).toEqual([savedNote()!.id])
  })

  it('另一文件夹持待写队列：remap 落库后该队列原样保留并照常落库', async () => {
    const { savedNote } = ghostStubs()
    registry.ensure('f-b') // 挂起会话 f-b（update 只写既有会话——先建）
    registry.update('f-b', { nodes: [node('B1', 'f-b')], status: 'ready' })
    registry.lane('f-b').commands.moveNode('B1', 20, 20) // f-b：Q=1
    const queued = registry.entry('f-b')!.data.queue
    expect(queued).toHaveLength(1)
    const { flush: p } = await enterGhostConflict()
    resolveGhostFolderDecision('remap-main-graph')
    await p
    expect(mainSessions()).toHaveLength(1) // 终态成立（前置）
    expect(stubApi.lineage.patchNode).not.toHaveBeenCalled()
    expect(registry.entry('f-b')?.data.queue).toBe(queued) // 另一文件夹的队列原样
    await registry.lane('f-b').save()
    expect(stubApi.lineage.patchNode).toHaveBeenCalledTimes(1)
    expect(stubApi.lineage.patchNode.mock.calls[0]![0]).toMatchObject({ id: 'B1', x: 20, y: 20 })
    expect(registry.entry('f-b')?.data.saveStatus).toBe('clean')
    expect(state().folderId).toBe(MAIN)
    expect(noteIds()).toEqual([savedNote()!.id]) // f-b 的回显不写活动会话
  })
})

describe('④ 草稿先提交：被矫正会话移除时在途草稿不丢', () => {
  it('落库时有打开的悬浮笔记草稿：终态迁移把草稿提交进存活会话队列（草稿信号清除、随后照常落库）', async () => {
    let saved: FloatingNote | null = null
    stubApi.lineage.upsertFloatingNote.mockImplementation(async (req: { folderId: string; id?: string; content: string }) => {
      if (req.folderId === DOOM) return conflict()
      saved = { id: req.id ?? 'n1', folderId: MAIN, x: 0, y: 0, content: req.content, createdAt: 't', updatedAt: 't' }
      return { ok: true as const, data: saved }
    })
    stubApi.lineage.graph.mockImplementation(async (req: { folderId: string }) =>
      ({ ok: true, data: { nodes: [node('A', req.folderId)], edges: [], lineTypeNames: defaultLineTypeNames(), floatingNotes: req.folderId === MAIN && saved ? [saved] : [] } })
    )
    state().setFolder(DOOM)
    await settle()
    state().addFloatingNote(0, 0, '甲')
    const noteId = state().floatingNotes[0]!.id
    // 编辑器仍在场、正文未收口：注册收口句柄（既有 commit 入口——closeEdit→updateFloatingNote）并置草稿信号
    const draftText = '甲（未收口草稿）'
    registerNoteDraftFlush(() => {
      useLineageStore.getState().updateFloatingNote(noteId, { content: draftText })
    })
    setNoteDraftPending(true)
    setNoteDraftSnapshot({ noteId, text: draftText })
    const { flush } = await enterGhostConflict()
    resolveGhostFolderDecision('remap-main-graph')
    await flush
    await settle(20)
    expect(registry.entry(DOOM)).toBeUndefined() // 被矫正会话已移除
    expect(state().folderId).toBe(MAIN)
    expect(noteDraftPending(), '草稿已随迁移提交——不挂在已离场的会话上').toBe(false)
    expect(noteDraftSnapshot()).toBeNull()
    expect(registry.entry(MAIN)!.data.queue).toHaveLength(1) // 提交进存活会话队列
    expect(registry.entry(MAIN)!.data.inflight).toBeNull()
    stubApi.lineage.upsertFloatingNote.mockClear()
    await registry.lane(MAIN).save() // 照常落库（链尾续拉和解）
    expect(stubApi.lineage.upsertFloatingNote).toHaveBeenCalledWith(expect.objectContaining({ id: noteId, folderId: MAIN, content: draftText }))
    expect(registry.entry(MAIN)!.data.saveStatus).toBe('clean')
    expect(registry.entry(MAIN)!.data.needsReload).toBe(false)
    unregisterNoteDraftFlush()
  })
})

