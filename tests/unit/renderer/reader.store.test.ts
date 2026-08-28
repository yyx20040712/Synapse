import { afterEach, beforeEach, expect, it, vi } from 'vitest'
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

/** 立即成功的 open 桩（per-tab 版：按 paperId 生成数据） */
const openOk = vi.fn(async (req: { paperId: string }) => ({
  ok: true as const,
  data: { fileUrl: `app-file://${req.paperId}`, fileName: `${req.paperId}.pdf`, lastReadPage: 0 }
}))
const listAnnotationsOk = vi.fn(async () => ({ ok: true as const, data: [] as Annotation[] }))
const saveProgress = vi.fn(async () => ({ ok: true as const, data: undefined }))

/** 打开一篇并等待 ready（多数用例的前置） */
async function openReady(useStore: ReturnType<typeof loadStore> extends Promise<infer T> ? T : never, id: string): Promise<void> {
  await useStore.getState().openPaper(id)
}

guardedDescribe('SR2-TABS-01', 'reader.store —— per-tab 多文献状态（tab 生命周期+竞态守卫）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ── 旧 7 用例语义迁移（单 tab 场景断言路径下钻 per-tab，语义不变或升级） ──

  it('openPaper：新建 loading tab→ready，写入 fileUrl/fileName/lastReadPage 并加载标注', async () => {
    const open = vi.fn(async () => ({
      ok: true as const,
      data: { fileUrl: 'app-file://p-1', fileName: 'a.pdf', lastReadPage: 4 }
    }))
    const listAnnotations = vi.fn(async () => ({ ok: true as const, data: [ann] }))
    const useStore = await loadStore({ reader: { open, listAnnotations } })
    await useStore.getState().openPaper('p-1')
    const s = useStore.getState()
    expect(s.activeId).toBe('p-1')
    expect(s.order).toEqual(['p-1'])
    const tab = s.tabs['p-1']
    expect(tab?.status).toBe('ready')
    expect(tab?.fileUrl).toBe('app-file://p-1')
    expect(tab?.fileName).toBe('a.pdf')
    expect(tab?.page).toBe(4)
    expect(tab?.annotations).toEqual([ann])
  })

  it('open 失败：error 不吞（上抛给 UI 层 toast）且 tab 置 error 态（占位可重试）', async () => {
    const open = vi.fn(async () => ({ ok: false as const, error: { code: 'NOT_FOUND', message: '文献不存在' } }))
    const useStore = await loadStore({ reader: { open } })
    await expect(useStore.getState().openPaper('ghost')).rejects.toThrow('文献不存在')
    const s = useStore.getState()
    expect(s.tabs['ghost']?.status).toBe('error')
    expect(s.activeId).toBe('ghost')
  })

  it('setPage 边界夹取（0..totalPages，作用于 active tab）；addAnnotation 追加；removeAnnotation 删除', async () => {
    const useStore = await loadStore({ reader: { open: openOk, listAnnotations: listAnnotationsOk } })
    await openReady(useStore, 'p-1')
    useStore.getState().setTotalPages(10)
    useStore.getState().setPage(99)
    expect(useStore.getState().tabs['p-1']?.page).toBe(9)
    useStore.getState().setPage(-3)
    expect(useStore.getState().tabs['p-1']?.page).toBe(0)
    useStore.getState().addAnnotation(ann)
    expect(useStore.getState().tabs['p-1']?.annotations).toHaveLength(1)
    useStore.getState().removeAnnotation('a-1')
    expect(useStore.getState().tabs['p-1']?.annotations).toHaveLength(0)
  })

  it('setZoom 夹取 0.5~3；setColor 更新（作用于 active tab）', async () => {
    const useStore = await loadStore({ reader: { open: openOk, listAnnotations: listAnnotationsOk } })
    await openReady(useStore, 'p-1')
    useStore.getState().setZoom(9)
    expect(useStore.getState().tabs['p-1']?.zoom).toBe(3)
    useStore.getState().setZoom(0.1)
    expect(useStore.getState().tabs['p-1']?.zoom).toBe(0.5)
    useStore.getState().setColor('green')
    expect(useStore.getState().tabs['p-1']?.color).toBe('green')
  })

  it('activeId=null（无 tab）：setter 全 no-op 不炸', async () => {
    const useStore = await loadStore({ reader: {} })
    useStore.getState().setPage(5)
    useStore.getState().setZoom(2)
    useStore.getState().setTotalPages(9)
    useStore.getState().setColor('green')
    useStore.getState().addAnnotation(ann)
    expect(useStore.getState().tabs).toEqual({})
    expect(useStore.getState().activeId).toBeNull()
  })

  // ── 竞态守卫 per-tab 化（INV-03 变体）：迟到响应三规则 ──

  it('规则③（open 面）：open(A) 悬挂→open(B) 就绪→A 响应迟到→写入 A 自己的 tab，B 展示不受干扰', async () => {
    type OpenOk = { ok: true; data: { fileUrl: string; fileName: string; lastReadPage: number } }
    let resolveA!: (v: OpenOk) => void
    const open = vi
      .fn()
      .mockImplementationOnce(() => new Promise<OpenOk>((r) => { resolveA = r }))
      .mockImplementationOnce(async () => ({
        ok: true as const,
        data: { fileUrl: 'app-file://p-2', fileName: 'b.pdf', lastReadPage: 0 }
      }))
    const listAnnotations = vi.fn(async () => ({ ok: true as const, data: [] as Annotation[] }))
    const useStore = await loadStore({ reader: { open, listAnnotations } })
    const pA = useStore.getState().openPaper('p-1')
    await useStore.getState().openPaper('p-2')
    expect(useStore.getState().activeId).toBe('p-2')
    // A 响应此刻才到：写入 A 的 tab（loading→ready），不得覆盖 B 的展示
    resolveA({ ok: true, data: { fileUrl: 'app-file://p-1', fileName: 'a.pdf', lastReadPage: 3 } })
    await pA
    const s = useStore.getState()
    expect(s.activeId).toBe('p-2')
    expect(s.tabs['p-2']?.fileName).toBe('b.pdf')
    expect(s.tabs['p-1']?.status).toBe('ready')
    expect(s.tabs['p-1']?.fileName).toBe('a.pdf')
    expect(s.tabs['p-1']?.page).toBe(3)
  })

  it('规则③（标注面）：旧 tab 的标注响应迟到写入旧 tab，不污染当前展示', async () => {
    const open = vi.fn(async (req: { paperId: string }) => ({
      ok: true as const,
      data: { fileUrl: `app-file://${req.paperId}`, fileName: `${req.paperId}.pdf`, lastReadPage: 0 }
    }))
    let resolveAnnA!: (v: { ok: true; data: Annotation[] }) => void
    const listAnnotations = vi
      .fn()
      .mockImplementationOnce(() => new Promise<{ ok: true; data: Annotation[] }>((r) => { resolveAnnA = r }))
      .mockImplementationOnce(async () => ({ ok: true as const, data: [] as Annotation[] }))
    const useStore = await loadStore({ reader: { open, listAnnotations } })
    const pA = useStore.getState().openPaper('p-1')
    // 让 p-1 走过 open 检点、停在悬挂的标注请求上（once mock 按调用序消费）
    await vi.waitFor(() => { expect(listAnnotations).toHaveBeenCalledTimes(1) })
    await useStore.getState().openPaper('p-2')
    expect(useStore.getState().tabs['p-2']?.annotations).toEqual([])
    // 旧标注响应此刻才到：写入 p-1 的 tab，p-2 展示不受污染
    resolveAnnA({ ok: true, data: [ann] })
    await pA
    const s = useStore.getState()
    expect(s.tabs['p-2']?.annotations).toEqual([])
    expect(s.tabs['p-1']?.annotations).toEqual([ann])
  })

  it('规则①：loading 中 closeTab → tab absent，迟到响应丢弃（不复活已关 tab）', async () => {
    type OpenOk = { ok: true; data: { fileUrl: string; fileName: string; lastReadPage: number } }
    let resolveA!: (v: OpenOk) => void
    const open = vi.fn().mockImplementationOnce(() => new Promise<OpenOk>((r) => { resolveA = r }))
    const listAnnotations = vi.fn(async () => ({ ok: true as const, data: [] as Annotation[] }))
    const useStore = await loadStore({ reader: { open, listAnnotations } })
    const pA = useStore.getState().openPaper('p-1')
    useStore.getState().closeTab('p-1')
    resolveA({ ok: true, data: { fileUrl: 'app-file://p-1', fileName: 'a.pdf', lastReadPage: 2 } })
    await pA
    const s = useStore.getState()
    expect(s.tabs['p-1']).toBeUndefined()
    expect(s.order).toEqual([])
    expect(s.activeId).toBeNull()
  })

  it('close()（App 切视图语义）：关闭全部 tab 并复位，在途加载作废', async () => {
    const useStore = await loadStore({ reader: { open: openOk, listAnnotations: listAnnotationsOk } })
    await openReady(useStore, 'p-1')
    await openReady(useStore, 'p-2')
    useStore.getState().close()
    const s = useStore.getState()
    expect(s.tabs).toEqual({})
    expect(s.order).toEqual([])
    expect(s.activeId).toBeNull()
  })

  it('close() 全关时在途加载作废：悬挂响应到达后不复活任何 tab', async () => {
    type OpenOk = { ok: true; data: { fileUrl: string; fileName: string; lastReadPage: number } }
    let resolveA!: (v: OpenOk) => void
    const open = vi.fn().mockImplementationOnce(() => new Promise<OpenOk>((r) => { resolveA = r }))
    const listAnnotations = vi.fn(async () => ({ ok: true as const, data: [] as Annotation[] }))
    const useStore = await loadStore({ reader: { open, listAnnotations } })
    const pA = useStore.getState().openPaper('p-1')
    useStore.getState().close()
    resolveA({ ok: true, data: { fileUrl: 'app-file://p-1', fileName: 'a.pdf', lastReadPage: 1 } })
    await pA
    const s = useStore.getState()
    expect(s.tabs).toEqual({})
    expect(s.activeId).toBeNull()
  })

  it('loading 重入 openPaper：尾随在途加载（不提前 resolve、不重复发起、失败不双报）', async () => {
    type OpenOk = { ok: true; data: { fileUrl: string; fileName: string; lastReadPage: number } }
    let resolveA!: (v: OpenOk) => void
    const open = vi.fn().mockImplementationOnce(() => new Promise<OpenOk>((r) => { resolveA = r }))
    const listAnnotations = vi.fn(async () => ({ ok: true as const, data: [] as Annotation[] }))
    const useStore = await loadStore({ reader: { open, listAnnotations } })
    const pFirst = useStore.getState().openPaper('p-1')
    const pReentry = useStore.getState().openPaper('p-1')
    resolveA({ ok: true, data: { fileUrl: 'app-file://p-1', fileName: 'a.pdf', lastReadPage: 1 } })
    // 重入 promise 与首调同一刻完成（尾随而非立即 resolve——期间 open 只发起一次）
    await Promise.all([pFirst, pReentry])
    expect(open).toHaveBeenCalledTimes(1)
    expect(useStore.getState().tabs['p-1']?.status).toBe('ready')
  })

  it('closeTab 后重开同 id：旧加载 finally 不误删新 inflight 记录（重入尾随仍有效）', async () => {
    type OpenOk = { ok: true; data: { fileUrl: string; fileName: string; lastReadPage: number } }
    let resolveA!: (v: OpenOk) => void
    let resolveB!: (v: OpenOk) => void
    const open = vi
      .fn()
      .mockImplementationOnce(() => new Promise<OpenOk>((r) => { resolveA = r }))
      .mockImplementationOnce(() => new Promise<OpenOk>((r) => { resolveB = r }))
    const listAnnotations = vi.fn(async () => ({ ok: true as const, data: [] as Annotation[] }))
    const useStore = await loadStore({ reader: { open, listAnnotations } })
    const pFirst = useStore.getState().openPaper('p-1')
    useStore.getState().closeTab('p-1')
    const pSecond = useStore.getState().openPaper('p-1')
    // 旧加载 settle：其 finally 不得误删 Map 中新加载的记录
    resolveA({ ok: true, data: { fileUrl: 'app-file://p-1', fileName: 'old.pdf', lastReadPage: 0 } })
    await pFirst
    // 新加载仍在途时重入：必须尾随（不得因 inflight 被误删而提前 resolve）
    let reentrySettled = false
    const pReentry = useStore.getState().openPaper('p-1').then(() => {
      reentrySettled = true
    })
    await Promise.resolve()
    await Promise.resolve()
    expect(reentrySettled).toBe(false)
    resolveB({ ok: true, data: { fileUrl: 'app-file://p-1', fileName: 'new.pdf', lastReadPage: 2 } })
    await Promise.all([pSecond, pReentry])
    expect(open).toHaveBeenCalledTimes(2)
    expect(useStore.getState().tabs['p-1']?.fileName).toBe('new.pdf')
  })

  // ── per-tab 新用例组：幂等激活 / S1 换 tab / S2 关 tab 收缩 ──

  it('幂等激活：ready 态 tab 重入 openPaper 不重复加载、不重置状态', async () => {
    const useStore = await loadStore({ reader: { open: openOk, listAnnotations: listAnnotationsOk } })
    await openReady(useStore, 'p-1')
    useStore.getState().setTotalPages(10)
    useStore.getState().setPage(3)
    useStore.getState().setZoom(2)
    await useStore.getState().openPaper('p-1')
    const open = useStore.getState()
    expect(openOk).toHaveBeenCalledTimes(1)
    expect(open.tabs['p-1']?.page).toBe(3)
    expect(open.tabs['p-1']?.zoom).toBe(2)
    expect(open.activeId).toBe('p-1')
  })

  it('error 态重入 openPaper = 重试（error → loading → ready）', async () => {
    const open = vi
      .fn()
      .mockImplementationOnce(async () => ({ ok: false as const, error: { code: 'NOT_FOUND', message: '文献不存在' } }))
      .mockImplementationOnce(async () => ({ ok: true as const, data: { fileUrl: 'app-file://p-1', fileName: 'a.pdf', lastReadPage: 0 } }))
    const useStore = await loadStore({ reader: { open, listAnnotations: listAnnotationsOk } })
    await expect(useStore.getState().openPaper('p-1')).rejects.toThrow('文献不存在')
    expect(useStore.getState().tabs['p-1']?.status).toBe('error')
    await useStore.getState().openPaper('p-1')
    expect(open).toHaveBeenCalledTimes(2)
    expect(useStore.getState().tabs['p-1']?.status).toBe('ready')
  })

  it('S1 换 tab 不失忆：A 的页码/缩放保留在 tab，activateTab(A) 恢复展示', async () => {
    const useStore = await loadStore({ reader: { open: openOk, listAnnotations: listAnnotationsOk } })
    await openReady(useStore, 'p-1')
    useStore.getState().setTotalPages(10)
    useStore.getState().setPage(3)
    useStore.getState().setZoom(1.5)
    await openReady(useStore, 'p-2')
    expect(useStore.getState().activeId).toBe('p-2')
    useStore.getState().activateTab('p-1')
    const s = useStore.getState()
    expect(s.activeId).toBe('p-1')
    expect(s.tabs['p-1']?.page).toBe(3)
    expect(s.tabs['p-1']?.zoom).toBe(1.5)
    expect(s.tabs['p-2']?.page).toBe(0)
  })

  it('S2 关 tab 收缩序：关 active 取右邻→无右邻取左邻→全关 null；关非 active 不动 activeId', async () => {
    const useStore = await loadStore({ reader: { open: openOk, listAnnotations: listAnnotationsOk } })
    await openReady(useStore, 'p-1')
    await openReady(useStore, 'p-2')
    await openReady(useStore, 'p-3')
    expect(useStore.getState().order).toEqual(['p-1', 'p-2', 'p-3'])
    // 关非 active：activeId 不变
    useStore.getState().closeTab('p-1')
    expect(useStore.getState().activeId).toBe('p-3')
    expect(useStore.getState().order).toEqual(['p-2', 'p-3'])
    // 关 active(p-3)：右邻无 → 取左邻 p-2
    useStore.getState().closeTab('p-3')
    expect(useStore.getState().activeId).toBe('p-2')
    // 关最后一个：activeId=null
    useStore.getState().closeTab('p-2')
    expect(useStore.getState().activeId).toBeNull()
    expect(useStore.getState().order).toEqual([])
  })

  // ── 进度防抖 per-tab 化：pending 集合 + closeTab flush ──

  it('进度 pending 集合：两 tab 各自翻页，防抖到点各自落库（换 tab 不误写不丢写）', async () => {
    vi.useFakeTimers()
    const useStore = await loadStore({ reader: { open: openOk, listAnnotations: listAnnotationsOk, saveProgress } })
    await openReady(useStore, 'p-1')
    await openReady(useStore, 'p-2')
    // 回到 p-1 翻页，再切 p-2 翻页：两笔 pending（totalPages 先设，防 0 夹取锁页）
    useStore.getState().activateTab('p-1')
    useStore.getState().setTotalPages(10)
    useStore.getState().setPage(2)
    useStore.getState().activateTab('p-2')
    useStore.getState().setTotalPages(10)
    useStore.getState().setPage(5)
    vi.advanceTimersByTime(2000)
    expect(saveProgress).toHaveBeenCalledWith({ paperId: 'p-1', page: 2 })
    expect(saveProgress).toHaveBeenCalledWith({ paperId: 'p-2', page: 5 })
  })

  it('closeTab flush：被关 tab 的 pending 进度立即落库（不等防抖窗口）', async () => {
    vi.useFakeTimers()
    const useStore = await loadStore({ reader: { open: openOk, listAnnotations: listAnnotationsOk, saveProgress } })
    await openReady(useStore, 'p-1')
    await openReady(useStore, 'p-2')
    useStore.getState().activateTab('p-1')
    useStore.getState().setTotalPages(10)
    useStore.getState().setPage(2)
    useStore.getState().closeTab('p-1')
    expect(saveProgress).toHaveBeenCalledWith({ paperId: 'p-1', page: 2 })
    expect(useStore.getState().tabs['p-1']).toBeUndefined()
  })

  // ── F-01 双源机制：setPage 第三参 scroll opts（INV-29 回归锚——'none' 不触发程序滚动）──

  it("F-01：setPage 默认 scroll:'to'——写页+bump scrollRequest 程序滚动信号（paperId+夹取页+递增 seq）", async () => {
    const useStore = await loadStore({ reader: { open: openOk, listAnnotations: listAnnotationsOk } })
    await openReady(useStore, 'p-1')
    useStore.getState().setTotalPages(10)
    useStore.getState().setPage(4)
    let s = useStore.getState()
    expect(s.tabs['p-1']?.page).toBe(4)
    expect(s.scrollRequest).toEqual({ paperId: 'p-1', page: 4, seq: 1 })
    // 越界夹取先于信号：信号携带的页=夹取后页
    useStore.getState().setPage(99)
    s = useStore.getState()
    expect(s.tabs['p-1']?.page).toBe(9)
    expect(s.scrollRequest).toEqual({ paperId: 'p-1', page: 9, seq: 2 })
  })

  it("F-01：setPage {scroll:'none'}——写页但 scrollRequest 原样不动（滚动回写防回弹，B1）", async () => {
    const useStore = await loadStore({ reader: { open: openOk, listAnnotations: listAnnotationsOk } })
    await openReady(useStore, 'p-1')
    useStore.getState().setTotalPages(10)
    useStore.getState().setPage(4)
    const before = useStore.getState().scrollRequest
    useStore.getState().setPage(6, { scroll: 'none' })
    const s = useStore.getState()
    expect(s.tabs['p-1']?.page).toBe(6)
    // 'none' 不 bump 信号：引用与内容均不变（无程序滚动）
    expect(s.scrollRequest).toBe(before)
    // 'none' 的页码夹取照常（夹取与滚动意图正交）
    useStore.getState().setPage(99, { scroll: 'none' })
    expect(useStore.getState().tabs['p-1']?.page).toBe(9)
    expect(useStore.getState().scrollRequest).toBe(before)
    // 后续默认调用恢复 bump（seq 续增不重置）
    useStore.getState().setPage(2)
    expect(useStore.getState().scrollRequest).toEqual({ paperId: 'p-1', page: 2, seq: 2 })
  })
})

// ── 缺陷②回归（2026-08-27 用户视检，always-active——不经 guardedDescribe）──
// hydration 必须把 open 响应的 title（PaperDetail.title——文献名单源）落账到
// TabState.title：标签页标题显示文献名而非 file_ref 内容寻址哈希基名
it('缺陷②：open 成功后 tab.title 落账文献名（fileName 语义不变——托管文件基名）', async () => {
  const open = vi.fn(async () => ({
    ok: true as const,
    data: {
      fileUrl: 'app-file://p-1',
      fileName: 'a3f9c2e1b0d4f5.pdf',
      title: '深度学习综述',
      lastReadPage: 0
    }
  }))
  const useStore = await loadStore({ reader: { open, listAnnotations: listAnnotationsOk } })
  await useStore.getState().openPaper('p-1')
  const tab = useStore.getState().tabs['p-1']
  expect(tab?.status).toBe('ready')
  expect(tab?.title).toBe('深度学习综述')
  expect(tab?.fileName).toBe('a3f9c2e1b0d4f5.pdf')
})
