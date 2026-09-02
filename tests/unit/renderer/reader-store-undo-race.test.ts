import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Annotation } from '../../../src/shared/models/annotation'

/**
 * F-ARCH2 回归锁（2026-08-30 架构排查批，always-active）——deepseek 架构审 B2
 * 「undo apply 覆盖并发编辑」经主控复核**指控不成立**（undo() 在 await 后重新
 * get()，apply 基于最新现态增量应用——filter/map/append 只动涉及 id，同步块
 * 内无插入窗口）。本文件锁定该时序不被未来退化破坏：runUndo 挂起窗口内的
 * addAnnotation 在 undo 落地后必须仍在列表。
 * 模块图注意：vi.resetModules 后须**先 import annotation-undo 再 import
 * reader.store**——store 内部依赖的 undo 模块实例才会与测试拿到的是同一个
 * （先进图者定实例）。
 */

const annBase: Annotation = {
  id: 'a-1',
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

async function loadStores(api: unknown) {
  vi.resetModules()
  vi.stubGlobal('window', { api })
  const undoMod = await import('../../../src/renderer/features/reader/annotation-undo')
  const storeMod = await import('../../../src/renderer/features/reader/reader.store')
  return { undoMod, storeMod }
}

describe('F-ARCH2 undo 并发编辑不覆盖（回归锁）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('runUndo 挂起窗口内的 addAnnotation 在 undo 落地后保留（remove 型）', async () => {
    let resolveDelete!: (v: { ok: true; data: undefined }) => void
    const deleteAnnotation = vi.fn(
      () => new Promise<{ ok: true; data: undefined }>((r) => { resolveDelete = r })
    )
    const { undoMod, storeMod } = await loadStores({
      reader: {
        open: vi.fn(async (req: { paperId: string }) => ({
          ok: true as const,
          data: { fileUrl: `app-file://${req.paperId}`, fileName: `${req.paperId}.pdf`, lastReadPage: 0 }
        })),
        listAnnotations: vi.fn(async () => ({ ok: true as const, data: [] as Annotation[] })),
        deleteAnnotation
      }
    })
    const useStore = storeMod.useReaderStore
    await useStore.getState().openPaper('p-1')
    // 造真实撤销对象：a-1 先入列表（门一 W-2——否则移除断言恒真），再压 create 型
    // 撤销条目（撤销动作=删除该标注）
    useStore.getState().addAnnotation('p-1', annBase)
    undoMod.pushUndo('p-1', { kind: 'create', annotation: annBase })
    const pUndo = useStore.getState().undo()
    // undo 挂起中：用户并发保存了一条新标注（SelectionLayer→addAnnotation 路径）
    const concurrent: Annotation = { ...annBase, id: 'a-2', quoteText: 'concurrent' }
    useStore.getState().addAnnotation('p-1', concurrent)
    resolveDelete({ ok: true, data: undefined })
    await pUndo
    const list = useStore.getState().tabs['p-1']?.annotations ?? []
    // 撤销的 a-1 移除 + 并发的 a-2 保留——两者同时成立
    expect(list.some((x) => x.id === 'a-1')).toBe(false)
    expect(list.some((x) => x.id === 'a-2')).toBe(true)
  })
})
