import { beforeEach, expect, it, vi } from 'vitest'
import type { Annotation } from '../../../src/shared/models/annotation'
import { guardedDescribe } from '../../utils/guard'

const ann: Annotation = {
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

async function loadStore(api: unknown) {
  vi.resetModules()
  vi.stubGlobal('window', { api })
  const mod = await import('../../../src/renderer/features/reader/reader.store')
  return mod.useReaderStore
}

guardedDescribe('SR-RDR-09', 'reader.store —— 打开/标注/进度', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('openPaper：写入 fileUrl/fileName/lastReadPage 并加载标注', async () => {
    const open = vi.fn(async () => ({
      ok: true as const,
      data: { fileUrl: 'app-file://p-1', fileName: 'a.pdf', lastReadPage: 4 }
    }))
    const listAnnotations = vi.fn(async () => ({ ok: true as const, data: [ann] }))
    const useStore = await loadStore({ reader: { open, listAnnotations } })
    await useStore.getState().openPaper('p-1')
    const s = useStore.getState()
    expect(s.paperId).toBe('p-1')
    expect(s.fileUrl).toBe('app-file://p-1')
    expect(s.fileName).toBe('a.pdf')
    expect(s.page).toBe(4)
    expect(s.annotations).toEqual([ann])
  })

  it('open 失败：error 不吞（上抛给 UI 层 toast）', async () => {
    const open = vi.fn(async () => ({ ok: false as const, error: { code: 'NOT_FOUND', message: '文献不存在' } }))
    const useStore = await loadStore({ reader: { open } })
    await expect(useStore.getState().openPaper('ghost')).rejects.toThrow('文献不存在')
    expect(useStore.getState().paperId).toBeNull()
  })

  it('setPage 边界夹取（0..totalPages）；addAnnotation 追加；removeAnnotation 删除', async () => {
    const useStore = await loadStore({ reader: {} })
    useStore.setState({ totalPages: 10 })
    useStore.getState().setPage(99)
    expect(useStore.getState().page).toBe(9)
    useStore.getState().setPage(-3)
    expect(useStore.getState().page).toBe(0)
    useStore.getState().addAnnotation(ann)
    expect(useStore.getState().annotations).toHaveLength(1)
    useStore.getState().removeAnnotation('a-1')
    expect(useStore.getState().annotations).toHaveLength(0)
  })

  it('setZoom 夹取 0.5~3；setColor 更新', async () => {
    const useStore = await loadStore({ reader: {} })
    useStore.getState().setZoom(9)
    expect(useStore.getState().zoom).toBe(3)
    useStore.getState().setZoom(0.1)
    expect(useStore.getState().zoom).toBe(0.5)
    useStore.getState().setColor('green')
    expect(useStore.getState().color).toBe('green')
  })
})
