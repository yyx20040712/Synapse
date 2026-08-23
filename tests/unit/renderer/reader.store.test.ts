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

  // ── stale-guard 锁定用例（INV-03）：openSeq 双检点 + close 抬序号 ──
  // 红证方式：变异（移除 seq 检查/close 抬序号）→ 本组用例精确红（战役 U2/U3 先例）

  it('stale-guard：并发 open 时晚到的旧 open 响应丢弃（第一检点）', async () => {
    type OpenOk = { ok: true; data: { fileUrl: string; fileName: string; lastReadPage: number } }
    let resolveA!: (v: OpenOk) => void
    const open = vi
      .fn()
      // p-1 的 open 悬挂（模拟慢响应）
      .mockImplementationOnce(() => new Promise<OpenOk>((r) => { resolveA = r }))
      // p-2 的 open 立即成功
      .mockImplementationOnce(async () => ({
        ok: true as const,
        data: { fileUrl: 'app-file://p-2', fileName: 'b.pdf', lastReadPage: 0 }
      }))
    const listAnnotations = vi.fn(async () => ({ ok: true as const, data: [] as Annotation[] }))
    const useStore = await loadStore({ reader: { open, listAnnotations } })
    const pA = useStore.getState().openPaper('p-1')
    await useStore.getState().openPaper('p-2')
    expect(useStore.getState().paperId).toBe('p-2')
    // 旧响应此刻才到：必须被丢弃，不得覆盖 p-2
    resolveA({ ok: true, data: { fileUrl: 'app-file://p-1', fileName: 'a.pdf', lastReadPage: 3 } })
    await pA
    expect(useStore.getState().paperId).toBe('p-2')
    expect(useStore.getState().fileName).toBe('b.pdf')
    // 旧请求在第一检点即被拦，不应再发标注请求
    expect(listAnnotations).toHaveBeenCalledTimes(1)
  })

  it('stale-guard：旧请求越过第一检点后，晚到的标注响应丢弃（第二检点）', async () => {
    const open = vi.fn(async (req: { paperId: string }) => ({
      ok: true as const,
      data: { fileUrl: `app-file://${req.paperId}`, fileName: `${req.paperId}.pdf`, lastReadPage: 0 }
    }))
    let resolveAnnA!: (v: { ok: true; data: Annotation[] }) => void
    const listAnnotations = vi
      .fn()
      // p-1 的标注请求悬挂（open 已过、标注未回）
      .mockImplementationOnce(() => new Promise<{ ok: true; data: Annotation[] }>((r) => { resolveAnnA = r }))
      .mockImplementationOnce(async () => ({ ok: true as const, data: [] as Annotation[] }))
    const useStore = await loadStore({ reader: { open, listAnnotations } })
    const pA = useStore.getState().openPaper('p-1')
    // 让 p-1 先走过第一检点、停在悬挂的标注请求上（once mock 按调用序消费，
    // 不等这一步会让 p-2 抢到悬挂的那一份）
    await vi.waitFor(() => { expect(listAnnotations).toHaveBeenCalledTimes(1) })
    await useStore.getState().openPaper('p-2')
    expect(useStore.getState().paperId).toBe('p-2')
    expect(useStore.getState().annotations).toEqual([])
    // 旧标注响应此刻才到：不得把 p-1 的标注写进当前状态
    resolveAnnA({ ok: true, data: [ann] })
    await pA
    expect(useStore.getState().paperId).toBe('p-2')
    expect(useStore.getState().annotations).toEqual([])
  })

  it('stale-guard：close 抬序号作废在途 open（响应到达不落地）', async () => {
    type OpenOk = { ok: true; data: { fileUrl: string; fileName: string; lastReadPage: number } }
    let resolveA!: (v: OpenOk) => void
    const open = vi.fn().mockImplementationOnce(() => new Promise<OpenOk>((r) => { resolveA = r }))
    const listAnnotations = vi.fn(async () => ({ ok: true as const, data: [] as Annotation[] }))
    const useStore = await loadStore({ reader: { open, listAnnotations } })
    const pA = useStore.getState().openPaper('p-1')
    useStore.getState().close()
    resolveA({ ok: true, data: { fileUrl: 'app-file://p-1', fileName: 'a.pdf', lastReadPage: 2 } })
    await pA
    // close 之后到达的响应一律作废：状态保持复位后的初始态
    expect(useStore.getState().paperId).toBeNull()
    expect(useStore.getState().fileUrl).toBeNull()
    expect(useStore.getState().annotations).toEqual([])
  })
})
