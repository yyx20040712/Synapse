import { expect, it, vi } from 'vitest'
import type { Annotation } from '../../../src/shared/models/annotation'
import { guardedDescribe } from '../../utils/guard'

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

/** 操作栈（annotation-undo）与执行器（reader-history-commands）同一模块图取用——
 *  沿用 reader.store.test 的 resetModules+stubGlobal 桩法（每用例新模块态）。
 *  [B4-A R1 迁移] undo/redo 执行自 annotation-undo 外迁驻 reader-history-commands */
async function loadModule(api: unknown) {
  vi.resetModules()
  vi.stubGlobal('window', { api })
  const undoMod = await import('../../../src/renderer/features/reader/state/annotation-undo')
  const cmdMod = await import('../../../src/renderer/features/reader/state/reader-history-commands')
  return { ...undoMod, undo: cmdMod.undoTabOperations, redo: cmdMod.redoTabOperations }
}

/** 冲微任务到链起步（命令=排队链+per-tab lane：API 派发在微任务） */
async function flush(): Promise<void> {
  for (let i = 0; i < 12; i++) await Promise.resolve()
}

const OK_REMOVE = { ok: true as const, data: undefined as never }

guardedDescribe('SR2-UNDO-01', 'annotation-undo —— 操作级撤销栈（三逆操作/深度截断/失败不弹栈/空栈/隔离）', () => {
  it('create 逆操作：undo → deleteAnnotation(id) → apply remove + 弹栈', async () => {
    const del = vi.fn(async () => OK_REMOVE)
    const m = await loadModule({ reader: { deleteAnnotation: del } })
    m.pushUndo('p-1', { kind: 'create', annotation: ann('a-1') })
    const out = await m.undo('p-1')
    expect(del).toHaveBeenCalledWith({ annotationId: 'a-1' })
    expect(out).toEqual({ done: true, apply: { type: 'remove', id: 'a-1' } })
    expect(m.stackDepth('p-1')).toBe(0)
  })

  it('delete 逆操作：undo → saveAnnotation（input 去 id/paperId/时间戳——repo 不收显式 id，re-create 用新 id）→ apply upsert', async () => {
    const saved = ann('a-new')
    const save = vi.fn(async (_req: { paperId: string; annotation: Record<string, unknown> }) => ({
      ok: true as const,
      data: saved
    }))
    const m = await loadModule({ reader: { saveAnnotation: save } })
    m.pushUndo('p-1', { kind: 'delete', annotation: ann('a-1') })
    const out = await m.undo('p-1')
    expect(save).toHaveBeenCalledTimes(1)
    const req = save.mock.calls[0]?.[0]
    expect(req).toBeDefined()
    expect(req!.paperId).toBe('p-1')
    expect(req!.annotation).not.toHaveProperty('id')
    expect(req!.annotation).not.toHaveProperty('paperId')
    expect(req!.annotation).not.toHaveProperty('createdAt')
    expect(req!.annotation).not.toHaveProperty('updatedAt')
    expect(req!.annotation).toMatchObject({ quoteText: 'q', kind: 'highlight' })
    expect(out).toEqual({ done: true, apply: { type: 'upsert', annotation: saved } })
  })

  it('comment-edit 逆操作：undo → updateAnnotation(before 全量回旧值) → apply upsert', async () => {
    // [B4-A R1 迁移] comment-edit 改走 before/after 完整项
    const before = ann('a-1', 'p-1', '旧批注')
    const after = { ...before, comment: '新批注' }
    const restored = { ...before }
    const update = vi.fn(async () => ({ ok: true as const, data: restored }))
    const m = await loadModule({ reader: { updateAnnotation: update } })
    m.pushUndo('p-1', { kind: 'comment-edit', before, after })
    const out = await m.undo('p-1')
    expect(update).toHaveBeenCalledWith({ annotation: before })
    expect(out).toEqual({ done: true, apply: { type: 'upsert', annotation: restored } })
  })

  it('LIFO：后入先出（create a1 → create a2，首次 undo 撤 a2）', async () => {
    const del = vi.fn(async () => OK_REMOVE)
    const m = await loadModule({ reader: { deleteAnnotation: del } })
    m.pushUndo('p-1', { kind: 'create', annotation: ann('a-1') })
    m.pushUndo('p-1', { kind: 'create', annotation: ann('a-2') })
    const out = await m.undo('p-1')
    expect(del).toHaveBeenCalledWith({ annotationId: 'a-2' })
    expect(out).toEqual({ done: true, apply: { type: 'remove', id: 'a-2' } })
    expect(m.stackDepth('p-1')).toBe(1)
  })

  it('深度截断：FIFO 丢最旧（push MAX+1 → 深度=MAX，撤空全程 a-0 永不出现、a-1 在栈底）', async () => {
    const del = vi.fn(async (_req: { annotationId: string }) => OK_REMOVE)
    const m = await loadModule({ reader: { deleteAnnotation: del } })
    for (let i = 0; i < m.OP_DEPTH_MAX + 1; i++) {
      m.pushUndo('p-1', { kind: 'create', annotation: ann(`a-${i}`) })
    }
    // [B4-A R1 迁移·断言翻转] 深度上限 50→10（HISTORY_DEPTH_MAX 共享单源）
    expect(m.OP_DEPTH_MAX).toBe(10)
    expect(m.stackDepth('p-1')).toBe(m.OP_DEPTH_MAX)
    for (let i = 0; i < m.OP_DEPTH_MAX; i++) {
      expect(await m.undo('p-1')).toMatchObject({ done: true })
    }
    const ids = del.mock.calls.map((c) => c[0]?.annotationId ?? '')
    expect(ids).not.toContain('a-0')
    expect(ids).toContain('a-1')
    expect(ids).toContain(`a-${m.OP_DEPTH_MAX}`)
    expect(m.stackDepth('p-1')).toBe(0)
  })

  it('api 失败：不弹栈（深度不变）+ done:false；恢复后重试成功', async () => {
    let fail = true
    const del = vi.fn(async () =>
      fail ? { ok: false as const } : { ok: true as const, data: undefined as never }
    )
    const m = await loadModule({ reader: { deleteAnnotation: del } })
    m.pushUndo('p-1', { kind: 'create', annotation: ann('a-1') })
    const out = await m.undo('p-1')
    expect(out).toEqual({ done: false, reason: 'api-failed' })
    expect(m.stackDepth('p-1')).toBe(1)
    fail = false
    const out2 = await m.undo('p-1')
    expect(out2).toEqual({ done: true, apply: { type: 'remove', id: 'a-1' } })
    expect(m.stackDepth('p-1')).toBe(0)
  })

  it('空栈 no-op：不触 api，返回 reason empty', async () => {
    const del = vi.fn()
    const m = await loadModule({ reader: { deleteAnnotation: del } })
    const out = await m.undo('p-1')
    expect(out).toEqual({ done: false, reason: 'empty' })
    expect(del).not.toHaveBeenCalled()
  })

  it('per-tab 隔离 + clearStack（closeTab 清理接缝语义）', async () => {
    const del = vi.fn(async () => OK_REMOVE)
    const m = await loadModule({ reader: { deleteAnnotation: del } })
    m.pushUndo('p-1', { kind: 'create', annotation: ann('a-1', 'p-1') })
    m.pushUndo('p-2', { kind: 'create', annotation: ann('a-2', 'p-2') })
    m.clearStack('p-1')
    expect(m.stackDepth('p-1')).toBe(0)
    expect(m.stackDepth('p-2')).toBe(1)
    expect(await m.undo('p-1')).toEqual({ done: false, reason: 'empty' })
    expect(await m.undo('p-2')).toEqual({ done: true, apply: { type: 'remove', id: 'a-2' } })
  })

  it('跨格序列 id remap：create→delete 连撤两次——重建新 id 后全栈改指，第二次撤命中新 id（deepseek B1）', async () => {
    let seq = 0
    const save = vi.fn(async (_req: { paperId: string; annotation: unknown }) => {
      seq += 1
      return { ok: true as const, data: ann(`a-new-${seq}`) }
    })
    const del = vi.fn(async (_req: { annotationId: string }) => OK_REMOVE)
    const m = await loadModule({ reader: { saveAnnotation: save, deleteAnnotation: del } })
    const created = ann('a-old')
    m.pushUndo('p-1', { kind: 'create', annotation: created })
    m.pushUndo('p-1', { kind: 'delete', annotation: created })
    const out1 = await m.undo('p-1')
    expect(out1).toEqual({
      done: true,
      apply: { type: 'upsert', annotation: expect.objectContaining({ id: 'a-new-1' }) }
    })
    const out2 = await m.undo('p-1')
    expect(del).toHaveBeenLastCalledWith({ annotationId: 'a-new-1' })
    expect(out2).toEqual({ done: true, apply: { type: 'remove', id: 'a-new-1' } })
    expect(m.stackDepth('p-1')).toBe(0)
  })

  it('跨格序列：create→comment-edit→delete 三连撤——comment-edit 重建后落在新 id 上（deepseek B1）', async () => {
    const save = vi.fn(async (_req: { paperId: string; annotation: unknown }) => ({
      ok: true as const,
      data: ann('a-new')
    }))
    const del = vi.fn(async (_req: { annotationId: string }) => OK_REMOVE)
    const update = vi.fn(async (req: { annotation: { id: string } }) => ({
      ok: true as const,
      data: { ...ann(req.annotation.id), comment: '旧批注' }
    }))
    const m = await loadModule({ reader: { saveAnnotation: save, deleteAnnotation: del, updateAnnotation: update } })
    const created = ann('a-old', 'p-1', '旧批注')
    m.pushUndo('p-1', { kind: 'create', annotation: created })
    m.pushUndo('p-1', { kind: 'comment-edit', before: created, after: { ...created, comment: '新批注' } })
    m.pushUndo('p-1', { kind: 'delete', annotation: created })
    // 撤 delete：重建 a-new
    expect(await m.undo('p-1')).toMatchObject({ done: true })
    // 撤 comment-edit：update 必须落在新 id（remap 后 before.id=a-new）
    expect(await m.undo('p-1')).toMatchObject({ done: true })
    expect(update.mock.calls[0]?.[0].annotation.id).toBe('a-new')
    // 撤 create：delete 新 id
    expect(await m.undo('p-1')).toMatchObject({ done: true })
    expect(del).toHaveBeenLastCalledWith({ annotationId: 'a-new' })
    expect(m.stackDepth('p-1')).toBe(0)
  })

  it('[B4-A R1 迁移·断言翻转] history 在途再触发：排队不并发（§2.5 #13d）——首发落定后排队项起步，两步都执行', async () => {
    const releases: (() => void)[] = []
    const del = vi.fn(
      (_req: { annotationId: string }) =>
        new Promise<{ ok: true; data: undefined }>((res) => {
          releases.push(() => res({ ok: true, data: undefined }))
        })
    )
    const m = await loadModule({ reader: { deleteAnnotation: del } })
    m.pushUndo('p-1', { kind: 'create', annotation: ann('a-1') })
    m.pushUndo('p-1', { kind: 'create', annotation: ann('a-2') })
    const p1 = m.undo('p-1')
    const p2 = m.undo('p-1')
    await flush()
    // 在途期间再触发：不并发（第二发未派发）、不丢（排队）
    expect(del).toHaveBeenCalledTimes(1)
    // per-tab 排队链：他篇（p-2 空栈）不被阻塞，正常返回自身结果（deepseek r3 W1）
    expect(await m.undo('p-2')).toEqual({ done: false, reason: 'empty' })
    releases.shift()!()
    await flush()
    expect(del).toHaveBeenCalledTimes(2)
    expect(del.mock.calls[1]?.[0].annotationId).toBe('a-1')
    releases.shift()!()
    expect(await p1).toEqual({ done: true, apply: { type: 'remove', id: 'a-2' } })
    expect(await p2).toEqual({ done: true, apply: { type: 'remove', id: 'a-1' } })
    expect(m.stackDepth('p-1')).toBe(0)
  })

  it('[B4-A R1 迁移·断言翻转] 并发篇场景（deepseek r4 B）：A 在撤 ∥ B 在撤，A 再触发排队——两篇互不阻塞', async () => {
    const releases = new Map<string, () => void>()
    const del = vi.fn(
      (req: { annotationId: string }) =>
        new Promise<{ ok: true; data: undefined }>((res) => {
          releases.set(req.annotationId, () => res({ ok: true, data: undefined }))
        })
    )
    const m = await loadModule({ reader: { deleteAnnotation: del } })
    m.pushUndo('p-1', { kind: 'create', annotation: ann('a-1', 'p-1') })
    m.pushUndo('p-2', { kind: 'create', annotation: ann('a-2', 'p-2') })
    const pa1 = m.undo('p-1')
    const pb = m.undo('p-2')
    const pa2 = m.undo('p-1')
    await flush()
    // B 起撤不破坏 A 的串行（单槽变量缺陷场景）：A 二次触发排队未派发
    expect(del).toHaveBeenCalledTimes(2)
    expect(del.mock.calls.map((c) => c[0].annotationId).sort()).toEqual(['a-1', 'a-2'])
    releases.get('a-1')!()
    releases.get('a-2')!()
    expect(await pa1).toEqual({ done: true, apply: { type: 'remove', id: 'a-1' } })
    expect(await pb).toEqual({ done: true, apply: { type: 'remove', id: 'a-2' } })
    // A 的排队项起步：栈已空→empty（零 api）
    expect(await pa2).toEqual({ done: false, reason: 'empty' })
    expect(m.stackDepth('p-1')).toBe(0)
    expect(m.stackDepth('p-2')).toBe(0)
  })

  it('撤销 await 期间新操作入栈：精确移除被撤条目（身份匹配），不错弹新条目（deepseek r3 W1）', async () => {
    let release: (() => void) | undefined
    const del = vi.fn(
      (_req: { annotationId: string }) =>
        new Promise<{ ok: true; data: undefined }>((res) => {
          release = () => res({ ok: true, data: undefined })
        })
    )
    const m = await loadModule({ reader: { deleteAnnotation: del } })
    m.pushUndo('p-1', { kind: 'create', annotation: ann('a-1') })
    const p = m.undo('p-1')
    await flush()
    // await 挂起期间新操作入栈（栈顶被顶替）
    m.pushUndo('p-1', { kind: 'create', annotation: ann('a-2') })
    release!()
    expect(await p).toEqual({ done: true, apply: { type: 'remove', id: 'a-1' } })
    // a-1 已被精确移除，a-2 完好留在栈内
    expect(m.stackDepth('p-1')).toBe(1)
    const p2 = m.undo('p-1')
    await flush()
    release!()
    expect(await p2).toEqual({ done: true, apply: { type: 'remove', id: 'a-2' } })
  })

  it('delete 逆 await 期间入栈：remap 原地改写保身份——成功后被撤条目仍正确移除（deepseek r6 B）', async () => {
    let release: (() => void) | undefined
    const save = vi.fn(
      (_req: { paperId: string; annotation: unknown }) =>
        new Promise<{ ok: true; data: ReturnType<typeof ann> }>((res) => {
          release = () => res({ ok: true, data: ann('a-new') })
        })
    )
    const del = vi.fn(async (_req: { annotationId: string }) => OK_REMOVE)
    const m = await loadModule({ reader: { saveAnnotation: save, deleteAnnotation: del } })
    const old = ann('a-old')
    m.pushUndo('p-1', { kind: 'create', annotation: old })
    m.pushUndo('p-1', { kind: 'delete', annotation: old })
    const p = m.undo('p-1')
    await flush()
    // delete 逆挂起期间新操作入栈（顶替栈顶下标——skipIdx 若按下标求值会指错）
    m.pushUndo('p-1', { kind: 'create', annotation: ann('a-other') })
    release!()
    expect(await p).toMatchObject({ done: true, apply: { type: 'upsert' } })
    // 被撤的 delete 条目按身份移除；create(a-old→a-new remap) 与 a-other 保留
    expect(m.stackDepth('p-1')).toBe(2)
    const p2 = m.undo('p-1')
    await flush()
    expect(await p2).toMatchObject({ done: true, apply: { type: 'remove', id: 'a-other' } })
    const p3 = m.undo('p-1')
    await flush()
    expect(await p3).toMatchObject({ done: true, apply: { type: 'remove', id: 'a-new' } })
    expect(m.stackDepth('p-1')).toBe(0)
  })

  it('撤销 await 期间入栈致 FIFO 截断挤出被撤条目：身份不在栈内则跳过移除（deepseek r5b）', async () => {
    let release: (() => void) | undefined
    const del = vi.fn(
      (_req: { annotationId: string }) =>
        new Promise<{ ok: true; data: undefined }>((res) => {
          release = () => res({ ok: true, data: undefined })
        })
    )
    const m = await loadModule({ reader: { deleteAnnotation: del } })
    m.pushUndo('p-1', { kind: 'create', annotation: ann('a-victim') })
    const p = m.undo('p-1')
    await flush()
    // 挂起期间灌满至截断：a-victim 被从头部挤出（10 上限）
    for (let i = 0; i < m.OP_DEPTH_MAX; i++) {
      m.pushUndo('p-1', { kind: 'create', annotation: ann(`a-flood-${i}`) })
    }
    release!()
    expect(await p).toEqual({ done: true, apply: { type: 'remove', id: 'a-victim' } })
    // 被撤条目已被截断挤出：栈深不变，下一次撤的是截断后栈顶
    expect(m.stackDepth('p-1')).toBe(m.OP_DEPTH_MAX)
    const p2 = m.undo('p-1')
    await flush()
    release!()
    expect(await p2).toEqual({
      done: true,
      apply: { type: 'remove', id: `a-flood-${m.OP_DEPTH_MAX - 1}` }
    })
  })
})

guardedDescribe('SR2-UNDO-01', 'annotation-undo —— B4-A R1 redo 三类型/保存只清 redo/深度 10/往返 remap', () => {
  it('redo 三类型：create 重做=saveAnnotation 重建；delete 重做=delete 当前映射 id；comment-edit 重做=update after', async () => {
    let seq = 0
    const save = vi.fn(async () => ({ ok: true as const, data: ann(`re-${++seq}`) }))
    const del = vi.fn(async (_req: { annotationId: string }) => OK_REMOVE)
    const update = vi.fn(async (req: { annotation: { id: string; comment: string } }) => ({
      ok: true as const,
      data: ann(req.annotation.id, 'p-1', req.annotation.comment)
    }))
    const m = await loadModule({ reader: { saveAnnotation: save, deleteAnnotation: del, updateAnnotation: update } })

    // ① create：undo=删除，redo=重建（新 id 回显 upsert）
    m.pushUndo('p-1', { kind: 'create', annotation: ann('c-1') })
    expect(await m.undo('p-1')).toEqual({ done: true, apply: { type: 'remove', id: 'c-1' } })
    expect(m.redoDepth('p-1')).toBe(1)
    expect(await m.redo('p-1')).toEqual({ done: true, apply: { type: 'upsert', annotation: expect.objectContaining({ id: 're-1' }) } })
    expect(await m.redo('p-1')).toEqual({ done: false, reason: 'empty' }) // redo 栈空 no-op
    expect(m.stackDepth('p-1')).toBe(1)

    // ② comment-edit：undo=update before，redo=update after
    const before = ann('c-1', 'p-1', '旧')
    const after = { ...before, comment: '新' }
    m.pushUndo('p-1', { kind: 'comment-edit', before, after })
    expect(await m.undo('p-1')).toMatchObject({ done: true })
    expect(update.mock.calls[0]?.[0].annotation.comment).toBe('旧')
    expect(await m.redo('p-1')).toMatchObject({ done: true })
    expect(update.mock.calls[1]?.[0].annotation.comment).toBe('新')

    // ③ delete：undo=重建，redo=删除重建所得新 id
    m.pushUndo('p-1', { kind: 'delete', annotation: ann('d-1') })
    expect(await m.undo('p-1')).toMatchObject({ done: true, apply: { type: 'upsert' } })
    expect(await m.redo('p-1')).toEqual({ done: true, apply: { type: 'remove', id: 're-2' } })
    expect(del).toHaveBeenLastCalledWith({ annotationId: 're-2' })
  })

  it('redo→undo 往返不落空：create 经 redo 重建换 id 后条目自身改指新 id，再撤命中新 id', async () => {
    let seq = 0
    const save = vi.fn(async () => ({ ok: true as const, data: ann(`re-${++seq}`) }))
    const del = vi.fn(async (_req: { annotationId: string }) => OK_REMOVE)
    const m = await loadModule({ reader: { saveAnnotation: save, deleteAnnotation: del } })
    m.pushUndo('p-1', { kind: 'create', annotation: ann('old') })
    await m.undo('p-1')
    await m.redo('p-1')
    // 往返后栈内条目=「重建所得新 id 的 create」——第二次撤删除新 id（不是已失效的旧 id）
    expect(await m.undo('p-1')).toEqual({ done: true, apply: { type: 'remove', id: 're-1' } })
    expect(del).toHaveBeenLastCalledWith({ annotationId: 're-1' })
    expect(m.stackDepth('p-1')).toBe(0)
  })

  it('redo 失败不弹 redo 栈（可重试）；恢复后重做成功', async () => {
    let fail = true
    const del = vi.fn(async () => OK_REMOVE)
    const save = vi.fn(async () => (fail ? { ok: false as const } : { ok: true as const, data: ann('re-1') }))
    const m = await loadModule({ reader: { saveAnnotation: save, deleteAnnotation: del } })
    m.pushUndo('p-1', { kind: 'create', annotation: ann('a-1') })
    expect(await m.undo('p-1')).toMatchObject({ done: true })
    expect(await m.redo('p-1')).toEqual({ done: false, reason: 'api-failed' })
    expect(m.redoDepth('p-1')).toBe(1)
    fail = false
    expect(await m.redo('p-1')).toMatchObject({ done: true, apply: { type: 'upsert' } })
    expect(m.redoDepth('p-1')).toBe(0)
  })

  it('保存只清 redo（clearRedo）：undo 栈保留——保存→undo→redo 链', async () => {
    const del = vi.fn(async () => OK_REMOVE)
    const save = vi.fn(async () => ({ ok: true as const, data: ann('re-1') }))
    const m = await loadModule({ reader: { saveAnnotation: save, deleteAnnotation: del } })
    m.pushUndo('p-1', { kind: 'create', annotation: ann('a-1') })
    m.pushUndo('p-1', { kind: 'create', annotation: ann('a-2') })
    await m.undo('p-1')
    expect(m.redoDepth('p-1')).toBe(1)
    // 显式保存：redo 清空、undo 保留（§3 显式保存行）
    m.clearRedo('p-1')
    expect(m.redoDepth('p-1')).toBe(0)
    expect(m.stackDepth('p-1')).toBe(1)
    expect(await m.redo('p-1')).toEqual({ done: false, reason: 'empty' })
    // 保存后 undo 仍有效（已落库修改可撤销），其 redo 入栈可重做
    expect(await m.undo('p-1')).toEqual({ done: true, apply: { type: 'remove', id: 'a-1' } })
    expect(await m.redo('p-1')).toMatchObject({ done: true, apply: { type: 'upsert' } })
  })

  it('新操作提交清 redo（§2.5 #2——redo 的真正销毁时点=新操作提交）；undo 栈保留', async () => {
    const del = vi.fn(async () => OK_REMOVE)
    const m = await loadModule({ reader: { deleteAnnotation: del } })
    m.pushUndo('p-1', { kind: 'create', annotation: ann('a-1') })
    m.pushUndo('p-1', { kind: 'create', annotation: ann('a-2') })
    await m.undo('p-1')
    expect(m.redoDepth('p-1')).toBe(1)
    // 新操作入栈：旧分支 redo 清空，undo 栈=剩余旧项+新项
    m.pushUndo('p-1', { kind: 'create', annotation: ann('a-3') })
    expect(m.redoDepth('p-1')).toBe(0)
    expect(m.stackDepth('p-1')).toBe(2)
    expect(await m.redo('p-1')).toEqual({ done: false, reason: 'empty' })
  })

  it('深度 10 双向：撤满 10 步 redo 栈深 10；重做满 10 步 undo 栈回 10', async () => {
    const del = vi.fn(async () => OK_REMOVE)
    let seq = 0
    const save = vi.fn(async () => ({ ok: true as const, data: ann(`re-${++seq}`) }))
    const m = await loadModule({ reader: { saveAnnotation: save, deleteAnnotation: del } })
    for (let i = 0; i < m.OP_DEPTH_MAX + 3; i++) {
      m.pushUndo('p-1', { kind: 'create', annotation: ann(`a-${i}`) })
    }
    expect(m.stackDepth('p-1')).toBe(10)
    for (let i = 0; i < m.OP_DEPTH_MAX; i++) {
      expect(await m.undo('p-1')).toMatchObject({ done: true })
    }
    expect(m.redoDepth('p-1')).toBe(10)
    expect(m.stackDepth('p-1')).toBe(0)
    for (let i = 0; i < m.OP_DEPTH_MAX; i++) {
      expect(await m.redo('p-1')).toMatchObject({ done: true })
    }
    expect(m.stackDepth('p-1')).toBe(10)
    expect(m.redoDepth('p-1')).toBe(0)
  })
})
