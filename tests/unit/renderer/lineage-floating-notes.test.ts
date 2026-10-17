// @vitest-environment jsdom
/**
 * [F-VISFB-61] 悬浮笔记 store/会话面锁定测试（B6-61 renderer 面；任务书
 * §5-B6 61 号/§7 防线行「undo/redo/save 往返；reload 后三操作正确」）。
 *
 * 覆盖：创建/编辑/删除三操作暂存（乐观应用+不发 IPC+dirty）/同 id upsert
 * 队列合并（最后写胜出）/undo/redo 快照往返（快照含 floatingNotes——创建后
 * undo 消失/redo 复活；编辑/删除可撤销重做）/save 批量落库载荷（全载荷
 * folderId+x+y+content）/saving 锁定（flushing 期编辑与 undo 拒绝——INV-94）/
 * reload 后三操作正确（graph(folderId) 载荷+服务端行回灌）。
 * always-active（不经 guardedDescribe——K3 威胁在三屋结构性缺位）。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  lineage: {
    graph: vi.fn(),
    patchNode: vi.fn(),
    removeNode: vi.fn(),
    upsertEdge: vi.fn(),
    removeEdge: vi.fn(),
    upsertLineTypes: vi.fn(),
    upsertFloatingNote: vi.fn(),
    removeFloatingNote: vi.fn()
  }
})

import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import type { FloatingNote } from '../../../src/shared/models/lineage'

function note(id: string, patch: Partial<FloatingNote> = {}): FloatingNote {
  return {
    id,
    folderId: '__main__',
    x: 100,
    y: 200,
    content: `内容${id}`,
    createdAt: 't0',
    updatedAt: 't0',
    ...patch
  }
}

const settle = async (turns = 8): Promise<void> => {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}

const state = () => useLineageStore.getState()

beforeEach(() => {
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockResolvedValue({
    ok: true,
    data: { nodes: [], edges: [], floatingNotes: [] }
  })
  stubApi.lineage.upsertFloatingNote.mockImplementation(
    async (req: { id?: string; folderId: string; x: number; y: number; content: string }) =>
      ({ ok: true, data: note(req.id ?? 'fn-new', { ...req, createdAt: 't0', updatedAt: 'server' }) })
  )
  stubApi.lineage.removeFloatingNote.mockResolvedValue({ ok: true, data: { ok: true } })
  useLineageStore.setState({
    nodes: [],
    edges: [],
    floatingNotes: [],
    lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'],
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
})

describe('F-VISFB-61 悬浮笔记 store 会话面 —— 创建/编辑/删除', () => {
  it('创建暂存：乐观入态+dirty+不发 IPC+undo 栈一单元（uuid 本地回写）', () => {
    state().addFloatingNote(120, 240, '新笔记')
    expect(state().saveStatus).toBe('dirty')
    expect(state().floatingNotes).toHaveLength(1)
    expect(state().floatingNotes[0]).toMatchObject({ folderId: '__main__', x: 120, y: 240, content: '新笔记' })
    expect(state().floatingNotes[0]!.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(stubApi.lineage.upsertFloatingNote).not.toHaveBeenCalled()
    expect(state().undoStack).toHaveLength(1)
    expect(state().queue[0]!.kind).toBe('upsert-floating-note')
  })

  it('编辑合并：同 id 二次 upsert 队列合并单条（最后写胜出）+乐观内容即时生效', () => {
    state().addFloatingNote(10, 20, '初稿')
    const id = state().floatingNotes[0]!.id
    state().updateFloatingNote(id, { content: '定稿' })
    expect(state().floatingNotes[0]!.content).toBe('定稿')
    const upserts = state().queue.filter((a) => a.kind === 'upsert-floating-note')
    expect(upserts).toHaveLength(1)
    expect(upserts[0]).toMatchObject({ kind: 'upsert-floating-note', input: { id, content: '定稿' } })
  })

  it('删除暂存：乐观移除+remove 动作入队（与 upsert 异 kind 不合并）；幽灵 id 拒', () => {
    useLineageStore.setState({ floatingNotes: [note('fn-1')] })
    state().removeFloatingNote('fn-1')
    expect(state().floatingNotes).toEqual([])
    expect(state().queue).toHaveLength(1)
    expect(state().queue[0]).toMatchObject({ kind: 'remove-floating-note', id: 'fn-1' })
    expect(() => state().updateFloatingNote('fn-ghost', { content: 'x' })).toThrowError(/悬浮笔记不在图中/)
    // [回炉 R1] 幽灵 remove 同格抛（与 update 对称——接口注释「幽灵 id 抛」契约落地）；
    // 抛后零副作用：队列不加/redoStack 不清（beginUnit 前置检查）
    expect(() => state().removeFloatingNote('fn-ghost')).toThrowError(/悬浮笔记不在图中/)
    expect(state().queue).toHaveLength(1)
    expect(state().saveStatus).toBe('dirty')
  })

  it('[回炉 R4] 空 patch 早退：updateFloatingNote(id, {}) 不产生编辑单元（不入队不 dirty 不清 redoStack 不刷 updated_at）', () => {
    useLineageStore.setState({ floatingNotes: [note('fn-1', { updatedAt: 't0' })], redoStack: [] })
    state().updateFloatingNote('fn-1', {})
    expect(state().queue).toHaveLength(0)
    expect(state().saveStatus).toBe('clean')
    expect(state().undoStack).toHaveLength(0)
    expect(state().floatingNotes[0]!.updatedAt).toBe('t0')
    expect(stubApi.lineage.upsertFloatingNote).not.toHaveBeenCalled()
  })

  it('save 批量落库：upsert 全载荷（folderId/x/y/content/id）+服务器行回填+clean+两栈清', async () => {
    state().addFloatingNote(120, 240, '待存笔记')
    const id = state().floatingNotes[0]!.id
    await state().save()
    await settle()
    expect(stubApi.lineage.upsertFloatingNote).toHaveBeenCalledTimes(1)
    expect(stubApi.lineage.upsertFloatingNote).toHaveBeenCalledWith({
      id,
      folderId: '__main__',
      x: 120,
      y: 240,
      content: '待存笔记'
    })
    expect(state().saveStatus).toBe('clean')
    expect(state().floatingNotes[0]).toMatchObject({ id, updatedAt: 'server' })
    expect(state().undoStack).toEqual([])
    expect(state().redoStack).toEqual([])
  })

  it('undo/redo/save 往返（三操作快照轴）：创建→undo 消失（回 clean 基线）→redo 复活→save 单发；编辑→undo 内容回退；删除→undo 恢复', async () => {
    // 创建轴
    state().addFloatingNote(1, 2, '撤销轴')
    const id = state().floatingNotes[0]!.id
    state().undo()
    expect(state().floatingNotes).toEqual([])
    expect(state().queue).toEqual([])
    expect(state().saveStatus).toBe('clean')
    state().redo()
    expect(state().floatingNotes).toHaveLength(1)
    expect(state().floatingNotes[0]!.content).toBe('撤销轴')
    expect(state().saveStatus).toBe('dirty')
    await state().save()
    await settle()
    expect(stubApi.lineage.upsertFloatingNote).toHaveBeenCalledTimes(1)
    // 编辑轴
    state().updateFloatingNote(id, { content: '编辑后' })
    state().undo()
    expect(state().floatingNotes[0]!.content).toBe('撤销轴')
    state().redo()
    expect(state().floatingNotes[0]!.content).toBe('编辑后')
    await state().save()
    await settle()
    // 删除轴
    state().removeFloatingNote(id)
    expect(state().floatingNotes).toEqual([])
    state().undo()
    expect(state().floatingNotes).toHaveLength(1)
    expect(state().floatingNotes[0]!.content).toBe('编辑后')
    expect(stubApi.lineage.removeFloatingNote).not.toHaveBeenCalled()
    await state().save()
    await settle()
    expect(state().saveStatus).toBe('clean')
  })

  it('saving 锁定：flushing 期创建/编辑拒绝（INV-94 同族）+undo no-op', () => {
    useLineageStore.setState({ floatingNotes: [note('fn-1')], flushing: true, saveStatus: 'saving' })
    state().addFloatingNote(5, 5, '在途写')
    expect(state().queue).toHaveLength(0)
    expect(state().floatingNotes).toHaveLength(1)
    state().removeFloatingNote('fn-1')
    expect(state().floatingNotes).toHaveLength(1)
    state().undo()
    expect(state().undoStack).toHaveLength(0)
  })

  it('reload 后三操作正确：graph(folderId) 载荷+服务端 floatingNotes 回灌——落库态与库态一致', async () => {
    // 三操作各走一轮 save（模拟用户流），服务端行集以 graph 回灌校验
    state().addFloatingNote(11, 21, '甲')
    await state().save()
    await settle()
    const idA = state().floatingNotes[0]!.id
    state().updateFloatingNote(idA, { content: '甲改' })
    await state().save()
    await settle()
    state().removeFloatingNote(idA)
    state().undo() // 撤销删除=保留（最终态=编辑后的甲在场）
    await state().save()
    await settle()
    // reload：graph 返回服务端态（编辑后行）
    stubApi.lineage.graph.mockResolvedValue({
      ok: true,
      data: {
        nodes: [],
        edges: [],
        floatingNotes: [note(idA, { content: '甲改', updatedAt: 'server' })]
      }
    })
    await state().load()
    expect(stubApi.lineage.graph).toHaveBeenLastCalledWith({ folderId: '__main__' })
    expect(state().floatingNotes).toEqual([note(idA, { content: '甲改', updatedAt: 'server' })])
    expect(state().saveStatus).toBe('clean')
    // folder 隔离（renderer 投影面）：切图重取只载该图服务端行
    stubApi.lineage.graph.mockResolvedValue({
      ok: true,
      data: { nodes: [], edges: [], floatingNotes: [note('fn-b', { folderId: 'f-b' })] }
    })
    state().setFolder('f-b')
    await settle(12)
    expect(stubApi.lineage.graph).toHaveBeenLastCalledWith({ folderId: 'f-b' })
    expect(state().floatingNotes.map((n) => n.id)).toEqual(['fn-b'])
  })
})
