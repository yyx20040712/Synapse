/**
 * [B4-A R1 §2.5 #20-#23、§3 显式保存行、§4.2] reader-save-coordinator —— tab 级
 * finalize 与操作层命令入口（新建，always-active；§12.2 annotation-undo 行「保存
 * 只清 redo」与 reader-shortcuts 行「ctrl+s」的协调层合约）。
 *
 * 锁设计稿：
 * - 显式保存成功：提交该 tab 挂载控制器（注册表句柄——闭合单元+派发写+等待
 *   终态）→ drain 写链 → 清该 tab 全部文本 redo 与操作 redo；undo 均保留；
 *   显式保存结束批注编辑合并会话（定稿后的新输入开启新操作项）；
 * - 显式保存失败（任一句柄终态 failed，#23）：不清账可重试——redo/undo 全保留；
 * - 保存期间有新编辑（句柄 dirty/saving，#22）：仍定稿——redo 仍清；
 * - 重复命令拒绝（#20）：同对象 finalize 在途或 history 在途；
 * - closing gate：冻结期拒绝，零句柄消费、不清账；
 * - 非活动篇不消费挂载句柄（挂载控制器恒属活动篇）；
 * - undoActiveTab/redoActiveTab：布尔=完整动作成功（非 promise 兑现）。
 * 模块图：沿用 resetModules+stubGlobal 桩法（每用例新模块态）。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Annotation } from '../../../src/shared/models/annotation'

function ann(id: string): Annotation {
  return {
    id,
    paperId: 'p-1',
    page: 0,
    kind: 'highlight',
    color: 'yellow',
    quoteText: 'q',
    prefixText: '',
    suffixText: '',
    startOffset: 0,
    endOffset: 1,
    rects: [],
    comment: '',
    createdAt: 't',
    updatedAt: 't'
  }
}

const NOTE_KEY = { paperId: 'p-1', kind: 'paper-note' } as const
const OK = { ok: true as const, data: undefined as never }

type World = Awaited<ReturnType<typeof loadWorld>>

async function loadWorld() {
  vi.resetModules()
  const api = {
    reader: {
      open: vi.fn(async (req: { paperId: string }) => ({
        ok: true as const,
        data: { fileUrl: `app-file://${req.paperId}`, fileName: `${req.paperId}.pdf`, lastReadPage: 0 }
      })),
      listAnnotations: vi.fn(async () => ({ ok: true as const, data: [] as Annotation[] })),
      deleteAnnotation: vi.fn(async (_req: { annotationId: string }) => OK),
      saveAnnotation: vi.fn(async () => ({ ok: true as const, data: ann('re-created') })),
      updateAnnotation: vi.fn(async (req: { annotation: Annotation }) => ({ ok: true as const, data: req.annotation }))
    }
  }
  vi.stubGlobal('window', { api })
  const [coordMod, undoMod, textMod, registryMod, storeMod, gateMod] = await Promise.all([
    import('../../../src/renderer/features/reader/state/reader-save-coordinator'),
    import('../../../src/renderer/features/reader/state/annotation-undo'),
    import('../../../src/renderer/features/reader/state/reader-text-history'),
    import('../../../src/renderer/features/reader/interact/annotation-draft-registry'),
    import('../../../src/renderer/features/reader/state/reader.store'),
    import('../../../src/renderer/app/quit-closing-gate')
  ])
  await storeMod.useReaderStore.getState().openPaper('p-1')
  return { api, coord: coordMod, undoMod, textMod, registry: registryMod, useStore: storeMod.useReaderStore, gate: gateMod }
}

async function flush(turns = 14): Promise<void> {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}

/** 预置可撤/可重做面：操作层两条 create 撤一条（redo=1）；文本层两条撤一条（redo=1） */
async function seedRedo(w: World): Promise<void> {
  w.undoMod.pushUndo('p-1', { kind: 'create', annotation: ann('a-1') })
  w.undoMod.pushUndo('p-1', { kind: 'create', annotation: ann('a-2') })
  await w.coord.undoActiveTab()
  w.textMod.pushTextCommit(NOTE_KEY, 'v0')
  w.textMod.pushTextCommit(NOTE_KEY, 'v1')
  // 结算按条目身份（peek 所得项随命令持有）——seed 同口径：撤 v1、current=v2
  const top = w.textMod.peekTextUndo(NOTE_KEY)
  if (top === null) throw new Error('seed 前置：past 顶在场')
  w.textMod.settleTextUndo(NOTE_KEY, top, 'v2', [])
  expect(w.undoMod.redoDepth('p-1')).toBe(1)
  expect(w.textMod.canRedoText(NOTE_KEY)).toBe(true)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('B4-A R1 reader-save-coordinator —— tab 级 finalize', () => {
  it('成功：提交挂载句柄→清该 tab 文本 redo+操作 redo；undo 均保留；返回 true', async () => {
    const w = await loadWorld()
    await seedRedo(w)
    const handle = vi.fn(async () => 'saved')
    w.registry.registerDraftFlush('note:p-1', handle)
    expect(await w.coord.finalizeTab('p-1')).toBe(true)
    expect(handle).toHaveBeenCalledTimes(1)
    expect(w.undoMod.redoDepth('p-1')).toBe(0)
    expect(w.undoMod.stackDepth('p-1')).toBe(1)
    expect(w.textMod.canRedoText(NOTE_KEY)).toBe(false)
    expect(w.textMod.canUndoText(NOTE_KEY)).toBe(true)
    // 保存后 undo 仍有效（已落库修改可撤销）
    expect(await w.coord.undoActiveTab()).toBe(true)
    expect(w.useStore.getState().tabs['p-1']?.annotations ?? []).toEqual([])
  })

  it('失败（#23）：任一句柄终态 failed→返回 false、不清账（redo/undo 全保留）可重试', async () => {
    const w = await loadWorld()
    await seedRedo(w)
    w.registry.registerDraftFlush('note:p-1', async () => 'failed')
    w.registry.registerDraftFlush('anno-ok', async () => 'clean')
    expect(await w.coord.finalizeTab('p-1')).toBe(false)
    expect(w.undoMod.redoDepth('p-1')).toBe(1)
    expect(w.undoMod.stackDepth('p-1')).toBe(1)
    expect(w.textMod.canRedoText(NOTE_KEY)).toBe(true)
    expect(w.textMod.canUndoText(NOTE_KEY)).toBe(true)
  })

  it('句柄同步 throw/异步 rejection 归 failed（不清账）', async () => {
    const w = await loadWorld()
    await seedRedo(w)
    w.registry.registerDraftFlush('note:p-1', () => {
      throw new Error('sync boom')
    })
    w.registry.registerDraftFlush('anno-rej', async () => {
      throw new Error('async boom')
    })
    expect(await w.coord.finalizeTab('p-1')).toBe(false)
    expect(w.undoMod.redoDepth('p-1')).toBe(1)
  })

  it('保存期间有新编辑（#22）：句柄 dirty/saving 终态仍定稿——redo 仍清', async () => {
    const w = await loadWorld()
    await seedRedo(w)
    w.registry.registerDraftFlush('note:p-1', async () => 'dirty')
    w.registry.registerDraftFlush('anno-saving', async () => 'saving')
    expect(await w.coord.finalizeTab('p-1')).toBe(true)
    expect(w.undoMod.redoDepth('p-1')).toBe(0)
    expect(w.textMod.canRedoText(NOTE_KEY)).toBe(false)
  })

  it('重复命令拒绝（#20）：finalize 在途时第二次立即 false——句柄只消费一次', async () => {
    const w = await loadWorld()
    await seedRedo(w)
    let release!: (v: string) => void
    const handle = vi.fn(() => new Promise<string>((res) => { release = res }))
    w.registry.registerDraftFlush('note:p-1', handle)
    const first = w.coord.finalizeTab('p-1')
    await flush()
    expect(await w.coord.finalizeTab('p-1')).toBe(false)
    expect(handle).toHaveBeenCalledTimes(1)
    expect(w.undoMod.redoDepth('p-1')).toBe(1)
    release('saved')
    expect(await first).toBe(true)
    expect(w.undoMod.redoDepth('p-1')).toBe(0)
  })

  it('重复命令拒绝（#20）：history 在途时 finalize 拒绝、不清账', async () => {
    const w = await loadWorld()
    await seedRedo(w)
    w.api.reader.deleteAnnotation.mockClear() // seed 的一次 undo 不计入
    let release!: () => void
    w.api.reader.deleteAnnotation.mockImplementationOnce(
      () =>
        new Promise<typeof OK>((res) => {
          release = () => res(OK)
        })
    )
    const undoing = w.coord.undoActiveTab()
    await flush()
    expect(w.api.reader.deleteAnnotation).toHaveBeenCalledTimes(1)
    expect(await w.coord.finalizeTab('p-1')).toBe(false)
    expect(w.undoMod.redoDepth('p-1')).toBe(1)
    release()
    expect(await undoing).toBe(true)
  })

  it('closing gate：冻结期 finalize 拒绝——零句柄消费、不清账', async () => {
    const w = await loadWorld()
    await seedRedo(w)
    const handle = vi.fn(async () => 'saved')
    w.registry.registerDraftFlush('note:p-1', handle)
    w.gate.setQuitClosing(true)
    try {
      expect(await w.coord.finalizeTab('p-1')).toBe(false)
      expect(handle).not.toHaveBeenCalled()
      expect(w.undoMod.redoDepth('p-1')).toBe(1)
      expect(w.textMod.canRedoText(NOTE_KEY)).toBe(true)
    } finally {
      w.gate.setQuitClosing(false)
    }
  })

  it('显式保存结束批注编辑合并会话（§4.2）：定稿后的新输入开启新操作项', async () => {
    const w = await loadWorld()
    const first = w.undoMod.recordCommentEdit('p-1', ann('a-1'), { ...ann('a-1'), comment: '一' })
    // 同会话续写：只推进 after，不新建条目
    w.undoMod.recordCommentEdit('p-1', ann('a-1'), { ...ann('a-1'), comment: '一二' })
    expect(w.undoMod.stackDepth('p-1')).toBe(1)
    expect(first).toMatchObject({ kind: 'comment-edit', after: { comment: '一二' } })
    expect(await w.coord.finalizeTab('p-1')).toBe(true)
    // 定稿后的新输入：新操作项
    const second = w.undoMod.recordCommentEdit('p-1', { ...ann('a-1'), comment: '一二' }, { ...ann('a-1'), comment: '三' })
    expect(w.undoMod.stackDepth('p-1')).toBe(2)
    expect(second).not.toBe(first)
  })

  it('非活动篇：不消费挂载句柄（恒属活动篇），只 drain 其写链并清其 redo', async () => {
    const w = await loadWorld()
    await w.useStore.getState().openPaper('p-2')
    w.undoMod.pushUndo('p-2', { kind: 'create', annotation: { ...ann('b-1'), paperId: 'p-2' } })
    w.undoMod.pushUndo('p-2', { kind: 'create', annotation: { ...ann('b-2'), paperId: 'p-2' } })
    w.api.reader.deleteAnnotation.mockResolvedValueOnce(OK)
    await w.useStore.getState().activateTab('p-2')
    await w.coord.undoActiveTab()
    expect(w.undoMod.redoDepth('p-2')).toBe(1)
    // 回到 p-1（活动篇）：此刻起挂载的句柄恒属 p-1——p-2 的定稿不得消费它
    w.useStore.getState().activateTab('p-1')
    const handle = vi.fn(async () => 'saved')
    w.registry.registerDraftFlush('note:p-1', handle)
    expect(await w.coord.finalizeTab('p-2')).toBe(true)
    expect(handle).not.toHaveBeenCalled()
    expect(w.undoMod.redoDepth('p-2')).toBe(0)
    expect(w.undoMod.stackDepth('p-2')).toBe(1)
  })
})

describe('B4-A R1 reader-save-coordinator —— 操作层命令入口', () => {
  it('undoActiveTab/redoActiveTab：布尔=完整动作成功（空栈 false；done true）', async () => {
    const w = await loadWorld()
    expect(await w.coord.undoActiveTab()).toBe(false)
    expect(await w.coord.redoActiveTab()).toBe(false)
    w.undoMod.pushUndo('p-1', { kind: 'create', annotation: ann('a-1') })
    expect(await w.coord.undoActiveTab()).toBe(true)
    expect(await w.coord.redoActiveTab()).toBe(true)
    expect(w.useStore.getState().tabs['p-1']?.annotations.map((a) => a.id)).toEqual(['re-created'])
  })

  it('finalizeActiveTab：无活动 tab → false（空态规约）', async () => {
    const w = await loadWorld()
    w.useStore.setState({ activeId: null })
    expect(await w.coord.finalizeActiveTab()).toBe(false)
    expect(await w.coord.undoActiveTab()).toBe(false)
  })
})
