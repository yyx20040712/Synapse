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

/** 模块级单例栈——沿用 reader.store.test 的 resetModules+stubGlobal 桩法（每用例新模块态） */
async function loadModule(api: unknown) {
  vi.resetModules()
  vi.stubGlobal('window', { api })
  return await import('../../../src/renderer/features/reader/annotation-undo')
}

guardedDescribe('SR2-UNDO-01', 'annotation-undo —— 操作级撤销栈（三逆操作/深度截断/失败不弹栈/空栈/隔离）', () => {
  it('create 逆操作：undo → deleteAnnotation(id) → apply remove + 弹栈', async () => {
    const del = vi.fn(async () => ({ ok: true as const, data: undefined as never }))
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
    const before = ann('a-1', 'p-1', '旧批注')
    const restored = { ...before }
    const update = vi.fn(async () => ({ ok: true as const, data: restored }))
    const m = await loadModule({ reader: { updateAnnotation: update } })
    m.pushUndo('p-1', { kind: 'comment-edit', before })
    const out = await m.undo('p-1')
    expect(update).toHaveBeenCalledWith({ annotation: before })
    expect(out).toEqual({ done: true, apply: { type: 'upsert', annotation: restored } })
  })

  it('LIFO：后入先出（create a1 → create a2，首次 undo 撤 a2）', async () => {
    const del = vi.fn(async () => ({ ok: true as const, data: undefined as never }))
    const m = await loadModule({ reader: { deleteAnnotation: del } })
    m.pushUndo('p-1', { kind: 'create', annotation: ann('a-1') })
    m.pushUndo('p-1', { kind: 'create', annotation: ann('a-2') })
    const out = await m.undo('p-1')
    expect(del).toHaveBeenCalledWith({ annotationId: 'a-2' })
    expect(out).toEqual({ done: true, apply: { type: 'remove', id: 'a-2' } })
    expect(m.stackDepth('p-1')).toBe(1)
  })

  it('深度截断：FIFO 丢最旧（push MAX+1 → 深度=MAX，撤空全程 a-0 永不出现、a-1 在栈底）', async () => {
    const del = vi.fn(async (_req: { annotationId: string }) => ({
      ok: true as const,
      data: undefined as never
    }))
    const m = await loadModule({ reader: { deleteAnnotation: del } })
    for (let i = 0; i < m.UNDO_DEPTH_MAX + 1; i++) {
      m.pushUndo('p-1', { kind: 'create', annotation: ann(`a-${i}`) })
    }
    expect(m.stackDepth('p-1')).toBe(m.UNDO_DEPTH_MAX)
    for (let i = 0; i < m.UNDO_DEPTH_MAX; i++) {
      await m.undo('p-1')
    }
    const ids = del.mock.calls.map((c) => c[0]?.annotationId ?? '')
    expect(ids).not.toContain('a-0')
    expect(ids).toContain('a-1')
    expect(ids).toContain(`a-${m.UNDO_DEPTH_MAX}`)
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
    const del = vi.fn(async () => ({ ok: true as const, data: undefined as never }))
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
    const del = vi.fn(async (_req: { annotationId: string }) => ({ ok: true as const, data: undefined as never }))
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
    const del = vi.fn(async (_req: { annotationId: string }) => ({ ok: true as const, data: undefined as never }))
    const update = vi.fn(async (req: { annotation: { id: string } }) => ({
      ok: true as const,
      data: { ...ann(req.annotation.id), comment: '旧批注' }
    }))
    const m = await loadModule({ reader: { saveAnnotation: save, deleteAnnotation: del, updateAnnotation: update } })
    const created = ann('a-old', 'p-1', '旧批注')
    m.pushUndo('p-1', { kind: 'create', annotation: created })
    m.pushUndo('p-1', { kind: 'comment-edit', before: created })
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

  it('in-flight 互斥：撤销进行中再触发 → busy 拒绝且不双弹（deepseek B2）', async () => {
    let release: (() => void) | undefined
    const del = vi.fn(
      (_req: { annotationId: string }) =>
        new Promise<{ ok: true; data: undefined }>((res) => {
          release = () => res({ ok: true, data: undefined })
        })
    )
    const m = await loadModule({ reader: { deleteAnnotation: del } })
    m.pushUndo('p-1', { kind: 'create', annotation: ann('a-1') })
    m.pushUndo('p-1', { kind: 'create', annotation: ann('a-2') })
    const p1 = m.undo('p-1')
    const p2 = m.undo('p-1')
    expect(await p2).toEqual({ done: false, reason: 'busy' })
    // per-paper 互斥：他篇（p-2 空栈）不被阻塞，正常返回自身结果（deepseek r3 W1）
    expect(await m.undo('p-2')).toEqual({ done: false, reason: 'empty' })
    release!()
    expect(await p1).toEqual({ done: true, apply: { type: 'remove', id: 'a-2' } })
    expect(m.stackDepth('p-1')).toBe(1)
    // 互斥释放后可再撤（下一层 a-1——新调用挂起新 promise，再释放）
    const p3 = m.undo('p-1')
    release!()
    expect(await p3).toEqual({ done: true, apply: { type: 'remove', id: 'a-1' } })
  })

  it('并发篇场景（deepseek r4 B）：A 在撤 ∥ B 在撤，A 再触发仍被拦——Set 互斥不串篇', async () => {
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
    // B 起撤不得破坏 A 的互斥（单槽变量缺陷场景）：A 二次触发仍 busy
    expect(await m.undo('p-1')).toEqual({ done: false, reason: 'busy' })
    releases.get('a-1')!()
    releases.get('a-2')!()
    expect(await pa1).toEqual({ done: true, apply: { type: 'remove', id: 'a-1' } })
    expect(await pb).toEqual({ done: true, apply: { type: 'remove', id: 'a-2' } })
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
    // await 挂起期间新操作入栈（栈顶被顶替）
    m.pushUndo('p-1', { kind: 'create', annotation: ann('a-2') })
    release!()
    expect(await p).toEqual({ done: true, apply: { type: 'remove', id: 'a-1' } })
    // a-1 已被精确移除，a-2 完好留在栈内
    expect(m.stackDepth('p-1')).toBe(1)
    const p2 = m.undo('p-1')
    release!()
    expect(await p2).toEqual({ done: true, apply: { type: 'remove', id: 'a-2' } })
  })

  it('delete 逆 await 期间入栈：remap 按身份跳过被撤条目——成功后被撤条目仍正确移除（deepseek r6 B）', async () => {
    let release: (() => void) | undefined
    const save = vi.fn(
      (_req: { paperId: string; annotation: unknown }) =>
        new Promise<{ ok: true; data: ReturnType<typeof ann> }>((res) => {
          release = () => res({ ok: true, data: ann('a-new') })
        })
    )
    const del = vi.fn(async (_req: { annotationId: string }) => ({ ok: true as const, data: undefined as never }))
    const m = await loadModule({ reader: { saveAnnotation: save, deleteAnnotation: del } })
    const old = ann('a-old')
    m.pushUndo('p-1', { kind: 'create', annotation: old })
    m.pushUndo('p-1', { kind: 'delete', annotation: old })
    const p = m.undo('p-1')
    // delete 逆挂起期间新操作入栈（顶替栈顶下标——skipIdx 若按下标求值会指错）
    m.pushUndo('p-1', { kind: 'create', annotation: ann('a-other') })
    release!()
    expect(await p).toMatchObject({ done: true, apply: { type: 'upsert' } })
    // 被撤的 delete 条目按身份移除；create(a-old→a-new remap) 与 a-other 保留
    expect(m.stackDepth('p-1')).toBe(2)
    const p2 = m.undo('p-1')
    expect(await p2).toMatchObject({ done: true, apply: { type: 'remove', id: 'a-other' } })
    const p3 = m.undo('p-1')
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
    // 挂起期间灌满至截断：a-victim 被从头部挤出（50 上限）
    for (let i = 0; i < m.UNDO_DEPTH_MAX; i++) {
      m.pushUndo('p-1', { kind: 'create', annotation: ann(`a-flood-${i}`) })
    }
    release!()
    expect(await p).toEqual({ done: true, apply: { type: 'remove', id: 'a-victim' } })
    // 被撤条目已被截断挤出：栈深不变（50），下一次撤的是截断后栈顶
    expect(m.stackDepth('p-1')).toBe(m.UNDO_DEPTH_MAX)
    const p2 = m.undo('p-1')
    release!()
    expect(await p2).toEqual({ done: true, apply: { type: 'remove', id: 'a-flood-49' } })
  })
})
