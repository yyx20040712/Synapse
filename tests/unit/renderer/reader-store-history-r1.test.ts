/**
 * [B4-A R1 §3/§4] reader.store 两层历史生命周期 —— store 级（新建，always-active；
 * §12.2 reader.store / reader-store-undo-race 行的新增面）。
 *
 * 锁设计稿 §3「切 tab/关 tab」两行与 §4.3 #6「history 在途输入是合法状态」：
 * - redo 经 store 同步收口（apply 增量——重建换 id 的 upsert）；
 * - 关 tab 清两层：操作双栈+该篇全部文本 target+写链条目出表；他 tab 不动；
 * - 切 tab（activateTab）不清历史；close()=全关语义全清；
 * - tab 隔离：undo/redo 只作用于发起时的活动篇（await 窗内切 tab 不误落）；
 * - 失败不弹栈；PDF 未 ready 为 no-op（§2.5 #12——零 api）；
 * - history 在途输入两向（§4.3 #6）：成功→后续任务由写链接管（链序=history 写
 *   先于在途窗新任务）、栈照常移动；失败→两栈不动、在途窗新任务照常执行。
 * 模块图：沿用 resetModules+stubGlobal 桩法（每用例新模块态）。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Annotation } from '../../../src/shared/models/annotation'

function ann(id: string, paperId = 'p-1', comment = ''): Annotation {
  return {
    id,
    paperId,
    page: 0,
    kind: 'highlight',
    color: 'yellow',
    quoteText: 'q',
    prefixText: '',
    suffixText: '',
    startOffset: 0,
    endOffset: 1,
    rects: [],
    comment,
    createdAt: 't',
    updatedAt: 't'
  }
}

const OK: { ok: true; data: undefined } = { ok: true, data: undefined }

type World = Awaited<ReturnType<typeof loadWorld>>

async function loadWorld(annotations: Annotation[] = [], paperIds = ['p-1']) {
  vi.resetModules()
  const api = {
    reader: {
      open: vi.fn(async (req: { paperId: string }) => ({
        ok: true as const,
        data: { fileUrl: `app-file://${req.paperId}`, fileName: `${req.paperId}.pdf`, lastReadPage: 0 }
      })),
      listAnnotations: vi.fn(async (req: { paperId: string }) => ({
        ok: true as const,
        data: annotations.filter((a) => a.paperId === req.paperId)
      })),
      deleteAnnotation: vi.fn(async (_req: { annotationId: string }) => OK),
      saveAnnotation: vi.fn(async (_req: { paperId: string; annotation: unknown }) => ({
        ok: true as const,
        data: ann('re-created')
      })),
      updateAnnotation: vi.fn(async (req: { annotation: Annotation }) => ({ ok: true as const, data: req.annotation }))
    }
  }
  vi.stubGlobal('window', { api })
  const [undoMod, textMod, laneMod, storeMod] = await Promise.all([
    import('../../../src/renderer/features/reader/state/annotation-undo'),
    import('../../../src/renderer/features/reader/state/reader-text-history'),
    import('../../../src/renderer/shared/tab-write-lane'),
    import('../../../src/renderer/features/reader/state/reader.store')
  ])
  const useStore = storeMod.useReaderStore
  for (const id of paperIds) await useStore.getState().openPaper(id)
  // openPaper 逐篇置活动位——收尾回到首篇（用例的默认活动 tab）
  useStore.getState().activateTab(paperIds[0]!)
  return { useStore, undoMod, textMod, laneMod, api }
}

async function flush(turns = 14): Promise<void> {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}

function ids(w: World, paperId = 'p-1'): string[] {
  return (w.useStore.getState().tabs[paperId]?.annotations ?? []).map((a) => a.id)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('B4-A R1 reader.store —— 操作层 redo 与两层历史的 tab 生命周期', () => {
  it('redo 经 store 同步收口：undo 删除→redo 重建（新 id upsert 追加）；布尔=完整动作成功', async () => {
    const w = await loadWorld([ann('a-1')])
    w.undoMod.pushUndo('p-1', { kind: 'create', annotation: ann('a-1') })
    await expect(w.useStore.getState().undo()).resolves.toBe(true)
    expect(ids(w)).toEqual([])
    expect(w.undoMod.redoDepth('p-1')).toBe(1)
    await expect(w.useStore.getState().redo()).resolves.toBe(true)
    expect(ids(w)).toEqual(['re-created'])
    expect(w.undoMod.redoDepth('p-1')).toBe(0)
    // redo 栈空：no-op（false，零 api）
    w.api.reader.saveAnnotation.mockClear()
    await expect(w.useStore.getState().redo()).resolves.toBe(false)
    expect(w.api.reader.saveAnnotation).not.toHaveBeenCalled()
  })

  it('关 tab 清两层：操作双栈+该篇全部文本 target（含已删批注残留）+写链条目出表；他 tab 不动', async () => {
    const w = await loadWorld([], ['p-1', 'p-2'])
    const noteKey = { paperId: 'p-1', kind: 'paper-note' } as const
    const annoKey = { paperId: 'p-1', kind: 'annotation-comment', annotationId: 'gone-anno' } as const
    const otherKey = { paperId: 'p-2', kind: 'paper-note' } as const
    w.undoMod.pushUndo('p-1', { kind: 'create', annotation: ann('a-1') })
    w.undoMod.pushUndo('p-2', { kind: 'create', annotation: ann('b-1', 'p-2') })
    w.textMod.pushTextCommit(noteKey, '')
    w.textMod.pushTextCommit(annoKey, '')
    w.textMod.pushTextCommit(otherKey, '')
    await w.laneMod.enqueueTabTask('p-1', async () => 'settled')
    expect(w.textMod.textTargetSize()).toBe(3)
    expect(w.laneMod.laneDepth('p-1')).toBe(0)

    w.useStore.getState().closeTab('p-1')
    expect(w.undoMod.stackDepth('p-1')).toBe(0)
    expect(w.undoMod.redoDepth('p-1')).toBe(0)
    expect(w.textMod.canUndoText(noteKey)).toBe(false)
    expect(w.textMod.canUndoText(annoKey)).toBe(false)
    expect(w.textMod.textTargetSize()).toBe(1)
    // 他 tab 的两层历史原样
    expect(w.undoMod.stackDepth('p-2')).toBe(1)
    expect(w.textMod.canUndoText(otherKey)).toBe(true)
  })

  it('切 tab 不清历史：activateTab 往返后两层历史驻留（返回后从对应 target 的栈继续）', async () => {
    const w = await loadWorld([], ['p-1', 'p-2'])
    const noteKey = { paperId: 'p-1', kind: 'paper-note' } as const
    w.undoMod.pushUndo('p-1', { kind: 'create', annotation: ann('a-1') })
    w.textMod.pushTextCommit(noteKey, '')
    w.useStore.getState().activateTab('p-2')
    w.useStore.getState().activateTab('p-1')
    expect(w.undoMod.stackDepth('p-1')).toBe(1)
    expect(w.textMod.canUndoText(noteKey)).toBe(true)
  })

  it('close()=全关语义：全部 tab 的两层历史全清', async () => {
    const w = await loadWorld([], ['p-1', 'p-2'])
    w.undoMod.pushUndo('p-1', { kind: 'create', annotation: ann('a-1') })
    w.undoMod.pushUndo('p-2', { kind: 'create', annotation: ann('b-1', 'p-2') })
    w.textMod.pushTextCommit({ paperId: 'p-2', kind: 'paper-note' }, '')
    w.useStore.getState().close()
    expect(w.undoMod.stackDepth('p-1')).toBe(0)
    expect(w.undoMod.stackDepth('p-2')).toBe(0)
    expect(w.textMod.textTargetSize()).toBe(0)
  })

  it('tab 隔离：undo/redo 只作用于发起时的活动篇——await 窗内切 tab 不误落他篇', async () => {
    let release: (() => void) | undefined
    const w = await loadWorld([ann('a-1'), ann('b-1', 'p-2')], ['p-1', 'p-2'])
    w.api.reader.deleteAnnotation.mockImplementationOnce(
      () =>
        new Promise<{ ok: true; data: undefined }>((res) => {
          release = () => res({ ok: true, data: undefined })
        })
    )
    w.undoMod.pushUndo('p-1', { kind: 'create', annotation: ann('a-1') })
    w.undoMod.pushUndo('p-2', { kind: 'create', annotation: ann('b-1', 'p-2') })
    const p = w.useStore.getState().undo()
    await flush()
    expect(w.api.reader.deleteAnnotation).toHaveBeenCalledWith({ annotationId: 'a-1' })
    // undo 在途窗内切到 p-2：落账仍写 p-1，不动 p-2
    w.useStore.getState().activateTab('p-2')
    release!()
    await expect(p).resolves.toBe(true)
    expect(ids(w, 'p-1')).toEqual([])
    expect(ids(w, 'p-2')).toEqual(['b-1'])
    expect(w.undoMod.stackDepth('p-2')).toBe(1)
  })

  it('失败不弹栈（store 级）：api !ok→undo 返回 false、栈深不变、store 不动；恢复后可重试', async () => {
    const w = await loadWorld([ann('a-1')])
    w.undoMod.pushUndo('p-1', { kind: 'create', annotation: ann('a-1') })
    w.api.reader.deleteAnnotation.mockResolvedValueOnce({ ok: false as const } as never)
    await expect(w.useStore.getState().undo()).resolves.toBe(false)
    expect(w.undoMod.stackDepth('p-1')).toBe(1)
    expect(ids(w)).toEqual(['a-1'])
    await expect(w.useStore.getState().undo()).resolves.toBe(true)
    expect(ids(w)).toEqual([])
  })

  it('操作层恢复旧文→文本 target 代际失效（§3 操作层行）：comment-edit undo 递增 generation、清旧文本栈、携带恢复值通知', async () => {
    const w = await loadWorld([ann('a-1', 'p-1', '新批注')])
    const annoKey = { paperId: 'p-1', kind: 'annotation-comment', annotationId: 'a-1' } as const
    w.textMod.pushTextCommit(annoKey, '旧批注')
    w.textMod.pushTextCommit(annoKey, '更早')
    expect(w.textMod.canUndoText(annoKey)).toBe(true)
    expect(w.textMod.textGeneration(annoKey)).toBe(0)
    const events: Array<{ generation: number; value?: string }> = []
    w.textMod.subscribeTextTarget(annoKey, (e) => events.push({ generation: e.generation, value: e.value }))
    const before = { ...ann('a-1', 'p-1', '旧批注') }
    w.undoMod.pushUndo('p-1', { kind: 'comment-edit', before, after: ann('a-1', 'p-1', '新批注') })
    await expect(w.useStore.getState().undo()).resolves.toBe(true)
    expect(w.textMod.textGeneration(annoKey)).toBe(1)
    expect(w.textMod.canUndoText(annoKey)).toBe(false)
    expect(w.textMod.canRedoText(annoKey)).toBe(false)
    // 挂载控制器据「恢复值」采用外部值（编辑器同步为操作层恢复后的旧文）
    expect(events.at(-1)).toMatchObject({ generation: 1, value: '旧批注' })
    expect(w.useStore.getState().tabs['p-1']?.annotations[0]?.comment).toBe('旧批注')
  })

  it('标注删除使其文本 target 代际失效（§4.2）：删除成功后该标注旧文本 past/future 不再可撤', async () => {
    const w = await loadWorld([])
    const annoKey = { paperId: 'p-1', kind: 'annotation-comment', annotationId: 'gone' } as const
    w.textMod.pushTextCommit(annoKey, '')
    expect(w.textMod.canUndoText(annoKey)).toBe(true)
    const cmdMod = await import('../../../src/renderer/features/reader/state/reader-history-commands')
    cmdMod.invalidateAnnotationText('p-1', 'gone')
    expect(w.textMod.textGeneration(annoKey)).toBe(1)
    expect(w.textMod.canUndoText(annoKey)).toBe(false)
  })

  it('PDF 未 ready 为 no-op（§2.5 #12）：tab 非 ready 时 undo/redo 拒绝、零 api、栈不变', async () => {
    const w = await loadWorld([ann('a-1')])
    w.undoMod.pushUndo('p-1', { kind: 'create', annotation: ann('a-1') })
    const tab = w.useStore.getState().tabs['p-1']!
    w.useStore.setState({ tabs: { 'p-1': { ...tab, status: 'loading' } } })
    await expect(w.useStore.getState().undo()).resolves.toBe(false)
    expect(w.api.reader.deleteAnnotation).not.toHaveBeenCalled()
    expect(w.undoMod.stackDepth('p-1')).toBe(1)
  })
})

describe('B4-A R1 §4.3 #6 —— history 在途输入两向', () => {
  it('在途输入→history 成功：后续任务由写链接管（链序=history 写先于在途窗新任务），栈照常移动', async () => {
    const order: string[] = []
    let release: (() => void) | undefined
    const w = await loadWorld([ann('a-1')])
    w.api.reader.deleteAnnotation.mockImplementationOnce(
      () =>
        new Promise<{ ok: true; data: undefined }>((res) => {
          order.push('history-write:start')
          release = () => res({ ok: true, data: undefined })
        })
    )
    w.undoMod.pushUndo('p-1', { kind: 'create', annotation: ann('a-1') })
    const p = w.useStore.getState().undo()
    await flush()
    expect(order).toEqual(['history-write:start'])
    // history 在途期间的新输入：新单元写入链（链尾任务）+新操作入栈
    void w.laneMod.enqueueTabTask('p-1', async () => {
      order.push('new-unit-write')
    })
    w.useStore.getState().addAnnotation('p-1', ann('a-2'))
    w.undoMod.pushUndo('p-1', { kind: 'create', annotation: ann('a-2') })
    expect(w.laneMod.laneDepth('p-1')).toBe(2)
    release!()
    await expect(p).resolves.toBe(true)
    // history 写先落定，在途窗的新任务其后执行（写链接管——不丢调度、不并发）
    expect(order).toEqual(['history-write:start', 'new-unit-write'])
    // 栈照常移动：被撤条目入 redo，在途窗新入条目保留在 undo 栈
    expect(w.undoMod.stackDepth('p-1')).toBe(1)
    expect(w.undoMod.redoDepth('p-1')).toBe(1)
    expect(ids(w)).toEqual(['a-2'])
  })

  it('在途输入→history 失败：两栈不动，在途窗新任务照常执行（不归因于 history 失败）', async () => {
    const order: string[] = []
    const w = await loadWorld([ann('a-1')])
    w.api.reader.deleteAnnotation.mockImplementationOnce(async () => {
      order.push('history-write:start')
      throw new Error('history failed')
    })
    w.undoMod.pushUndo('p-1', { kind: 'create', annotation: ann('a-1') })
    const p = w.useStore.getState().undo()
    await flush()
    void w.laneMod.enqueueTabTask('p-1', async () => {
      order.push('new-unit-write')
    })
    await expect(p).resolves.toBe(false)
    expect(w.undoMod.stackDepth('p-1')).toBe(1)
    expect(w.undoMod.redoDepth('p-1')).toBe(0)
    expect(ids(w)).toEqual(['a-1'])
    expect(order).toEqual(['history-write:start', 'new-unit-write'])
  })
})

describe('[B4-A R2 §2.5 #16/#17] 操作层 undo/redo 成功=新编辑事件（U 轴写点）', () => {
  it('undo/redo 成功：U=1、revision 递增；失败不动 U/revision', async () => {
    const w = await loadWorld([ann('a-1')])
    w.undoMod.pushUndo('p-1', { kind: 'create', annotation: ann('a-1') })
    const u = (): { u: boolean; rev: number } => {
      const t = w.useStore.getState().tabs['p-1']
      return { u: t?.unfinalized === true, rev: t?.editRevision ?? 0 }
    }
    expect(u()).toEqual({ u: false, rev: 0 })
    await expect(w.useStore.getState().undo()).resolves.toBe(true)
    expect(u()).toEqual({ u: true, rev: 1 })
    await expect(w.useStore.getState().redo()).resolves.toBe(true)
    expect(u()).toEqual({ u: true, rev: 2 })
    // 失败：两栈不动，U/revision 不动
    w.api.reader.deleteAnnotation.mockResolvedValueOnce({
      ok: false,
      error: { code: 'E', message: 'x' }
    } as never)
    await expect(w.useStore.getState().undo()).resolves.toBe(false)
    expect(u()).toEqual({ u: true, rev: 2 })
  })
})
