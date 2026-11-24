// @vitest-environment jsdom
/**
 * [回炉 W-B2b·第 4 项 / 设计稿 §8.1 步骤 1、§12.2 quit-gate 行「内部 flush 放行」；io-phase-inventory §11.4]
 * lineage-note-draft-settle —— 未收口草稿残留出口的直接单测（契约面；各收口路径的接线面见
 * lineage-note-draft-leave-residue.test.tsx）。
 *
 * 契约：resolve=true 时正文已成编辑单元**并已落库**（不依赖调用方其后的 flush——退出握手 ④、
 * 课题切换 allIoClean、恢复落定步 anyUnsettled 读到的是结果）；写链在途时排在其后；正文已等于
 * 笔记现值时只清快照零写；落库失败时 error+写保留（返回 true 仅表示已成单元，是否落库由调用方查态）。
 * 本模块为 W-B2b 新建——开工态不存在，本件在开工副本上的红因是导入错误（如实单列，不作缺实现红证）；
 * 判别力由仓外变异承担（logs/w-b2b-mut-*.log）。always-active 裸 describe（K3）。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'
import type { FloatingNote } from '../../../src/shared/models/lineage'

const stubApi = makeApiStub({
  lineage: { graph: vi.fn(), patchNode: vi.fn(), upsertFloatingNote: vi.fn(), removeFloatingNote: vi.fn() },
  notes: { get: vi.fn(), save: vi.fn() }
})

import { settleNoteDraftResidual } from '../../../src/renderer/features/lineage/lineage-note-draft-settle'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { lineageRegistry } from '../../../src/renderer/features/lineage/lineage-session-registry'
import { noteDraftSnapshot, setNoteDraftSnapshot, unregisterNoteDraftFlush } from '../../../src/renderer/features/lineage/lineage-note-draft'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { defaultLineTypeNames, type LineageNode } from '../../../src/shared/models/lineage'

const MAIN = '__main__'

function node(id: string): LineageNode {
  return { id, paperId: `paper-${id}`, title: `节点${id}`, year: 2022, x: 1, y: 1, month: 9, slot: 0, folderId: MAIN, createdAt: 't', updatedAt: 't' }
}
const note = (content: string): FloatingNote => ({ id: 'fn-e', folderId: MAIN, x: 100, y: 100, content, createdAt: 't0', updatedAt: 't0' })
const noteIpc = (): Array<[string | undefined, string | undefined, string]> =>
  stubApi.lineage.upsertFloatingNote.mock.calls.map((c) => {
    const input = c[0] as { id?: string; folderId?: string; content: string }
    return [input.id, input.folderId, input.content]
  })
const settle = async (turns = 40): Promise<void> => {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}

beforeEach(() => {
  vi.clearAllMocks()
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [node('A')], edges: [], lineTypeNames: defaultLineTypeNames(), floatingNotes: [note('旧稿')] } })
  stubApi.lineage.patchNode.mockImplementation(async (req: Partial<LineageNode>) => ({ ok: true, data: { ...node(String(req.id)), ...req, updatedAt: 'server' } }))
  stubApi.lineage.upsertFloatingNote.mockImplementation(async (req: { id?: string; folderId?: string; x?: number; y?: number; content: string }) => ({
    ok: true,
    data: { id: req.id ?? 'n1', folderId: req.folderId ?? MAIN, x: req.x ?? 0, y: req.y ?? 0, content: req.content, createdAt: 't', updatedAt: 'server' }
  }))
  unregisterNoteDraftFlush()
  setNoteDraftSnapshot(null)
  useLineageStore.setState({
    nodes: [node('A')], edges: [], floatingNotes: [note('旧稿')], paperMetrics: {}, pubNos: {}, tagNames: {}, lineTypeNames: defaultLineTypeNames(),
    status: 'ready', error: null, saveStatus: 'clean', lastWriteError: null, queue: [], flushing: false, inflight: null,
    needsReload: false, undoStack: [], redoStack: [], unfinalized: false, editRevision: 0, folderId: MAIN
  })
  useLineageViewStore.setState({ mode: 'edit', tool: 'select' })
})

afterEach(() => {
  setNoteDraftSnapshot(null)
})

describe('settleNoteDraftResidual 契约', () => {
  it('C1 resolve=true 时写已落库：队列空、相位 clean、笔记现值=正文（不依赖调用方其后的 flush）', async () => {
    setNoteDraftSnapshot({ noteId: 'fn-e', text: '残留正文' })
    await expect(settleNoteDraftResidual()).resolves.toBe(true)
    expect(noteIpc()).toEqual([['fn-e', MAIN, '残留正文']])
    expect(noteDraftSnapshot()).toBeNull()
    expect(lineageRegistry.entry(MAIN)!.data.queue).toEqual([])
    expect(lineageRegistry.entry(MAIN)!.data.saveStatus).toBe('clean')
    expect(lineageRegistry.entry(MAIN)!.data.floatingNotes[0]!.content).toBe('残留正文')
    expect(lineageRegistry.entry(MAIN)!.data.undoStack).toHaveLength(1) // 与编辑器提交同走 recorder
    await settle()
    expect(noteIpc()).toHaveLength(1) // 不重复发写
  })

  it('C2 正文已等于笔记现值：只清快照，零写', async () => {
    useLineageStore.setState({ floatingNotes: [note('已是正文')] })
    setNoteDraftSnapshot({ noteId: 'fn-e', text: '已是正文' })
    await expect(settleNoteDraftResidual()).resolves.toBe(true)
    expect(noteDraftSnapshot()).toBeNull()
    expect(noteIpc()).toEqual([])
  })

  it('C3 写链在途：settle 排在在途写之后，resolve 时两者都已落库', async () => {
    let release: ((v: { ok: true; data: LineageNode }) => void) | null = null
    stubApi.lineage.patchNode.mockImplementationOnce(() => new Promise((r) => { release = r }))
    useLineageStore.getState().moveNode('A', 3, 4)
    void useLineageStore.getState().save() // 在途写（挂起）
    setNoteDraftSnapshot({ noteId: 'fn-e', text: '残留正文' })
    let resolved = false
    const exiting = settleNoteDraftResidual().then((v) => {
      resolved = true
      return v
    })
    await settle()
    expect(resolved, '在途写未落定：出口不 resolve').toBe(false)
    expect(noteIpc()).toEqual([])
    expect(noteDraftSnapshot()).toBeNull() // 快照已交接（不再对再水化可见）
    release!({ ok: true, data: { ...node('A'), x: 3, y: 4, updatedAt: 'server' } })
    await expect(exiting).resolves.toBe(true)
    expect(stubApi.lineage.patchNode.mock.invocationCallOrder[0]!).toBeLessThan(stubApi.lineage.upsertFloatingNote.mock.invocationCallOrder[0]!)
    expect(noteIpc()).toEqual([['fn-e', MAIN, '残留正文']])
    expect(lineageRegistry.entry(MAIN)!.data.saveStatus).toBe('clean')
  })

  it('C4 落库失败：error+写保留在会话队列（调用方查态承接，不谎报 clean）', async () => {
    stubApi.lineage.upsertFloatingNote.mockResolvedValue({ ok: false, error: { code: 'DB_ERROR', message: '写失败' } })
    setNoteDraftSnapshot({ noteId: 'fn-e', text: '残留正文' })
    await expect(settleNoteDraftResidual()).resolves.toBe(true) // 已成单元
    expect(lineageRegistry.entry(MAIN)!.data.saveStatus).toBe('error')
    expect(lineageRegistry.entry(MAIN)!.data.queue).toHaveLength(1)
    expect(lineageRegistry.ioDirty()).toBe(true)
  })
})
