import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { guardedDescribe } from '../../utils/guard'

async function loadStore(api: unknown) {
  vi.resetModules()
  vi.stubGlobal('window', { api })
  const mod = await import('../../../src/renderer/features/notes/notes.store')
  return mod.useNotesStore
}

guardedDescribe('SR-NOTE-02', 'notes.store —— 防抖自动保存', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('load 写入；edit 标 dirty；1.5s 内防抖后保存一次', async () => {
    const save = vi.fn(
      async (_req: { paperId: string; title: string; contentMd: string }) => ({
        ok: true as const,
        data: { id: 'n-1', paperId: 'p-1', title: 't', contentMd: 'c', createdAt: 't', updatedAt: 't' }
      })
    )
    const get = vi.fn(async () => ({
      ok: true as const,
      data: { id: 'n-1', paperId: 'p-1', title: '标题', contentMd: '旧', createdAt: 't', updatedAt: 't' }
    }))
    const useStore = await loadStore({ notes: { get, save } })

    await useStore.getState().load('p-1')
    expect(useStore.getState().noteByPaper['p-1']?.contentMd).toBe('旧')

    useStore.getState().edit('p-1', { contentMd: '新1' })
    useStore.getState().saveSoon('p-1')
    useStore.getState().edit('p-1', { contentMd: '新2' })
    useStore.getState().saveSoon('p-1')
    expect(save).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1600)
    expect(save).toHaveBeenCalledTimes(1)
    expect(save.mock.calls[0]?.[0]).toMatchObject({ paperId: 'p-1', contentMd: '新2' })
  })

  it('保存后 savedAt 更新；saving 态翻转', async () => {
    const save = vi.fn(
      async (_req: { paperId: string; title: string; contentMd: string }) => ({
        ok: true as const,
        data: { id: 'n-1', paperId: 'p-1', title: '', contentMd: '', createdAt: 't', updatedAt: 't2' }
      })
    )
    const useStore = await loadStore({ notes: { get: vi.fn(), save } })
    useStore.setState({ noteByPaper: { 'p-1': { title: '', contentMd: '', saving: false, savedAt: null } } })
    useStore.getState().saveSoon('p-1')
    await vi.advanceTimersByTimeAsync(1600)
    expect(useStore.getState().noteByPaper['p-1']?.savedAt).toBe('t2')
  })

  it('load 期间草稿被编辑：字段级合并，用户碰过的字段赢（同毫秒 edit 同样受保护）', async () => {
    const get = vi.fn(async () => ({
      ok: true as const,
      data: { id: 'n-1', paperId: 'p-1', title: '服务器标题', contentMd: '服务器旧内容', createdAt: 't', updatedAt: 't-saved' }
    }))

    // 场景 1：fake timers 冻结时间轴——load 发起与 edit 同处一个毫秒（>= 语义：
    // 同毫秒的 edit 必然晚于 load 调用，同样受保护）。用户只改 contentMd →
    // contentMd 保用户输入，title 取服务器，savedAt 取服务器
    const useStore = await loadStore({ notes: { get, save: vi.fn() } })
    const loading = useStore.getState().load('p-1')
    useStore.getState().edit('p-1', { contentMd: '用户输入' })
    await loading
    const merged = useStore.getState().noteByPaper['p-1']
    expect(merged?.contentMd).toBe('用户输入')
    expect(merged?.title).toBe('服务器标题')
    expect(merged?.savedAt).toBe('t-saved')

    // 场景 2：只改 title → contentMd 取服务器
    const useStore2 = await loadStore({ notes: { get, save: vi.fn() } })
    const loading2 = useStore2.getState().load('p-1')
    useStore2.getState().edit('p-1', { title: '用户标题' })
    await loading2
    const merged2 = useStore2.getState().noteByPaper['p-1']
    expect(merged2?.title).toBe('用户标题')
    expect(merged2?.contentMd).toBe('服务器旧内容')

    // 场景 3（新不变量的另一侧）：编辑已落库（save 成功清"未保存编辑"标记）→
    // 再次 load 整版落地取服务器
    const save3 = vi.fn(
      async (_req: { paperId: string; title: string; contentMd: string }) => ({
        ok: true as const,
        data: { id: 'n-1', paperId: 'p-1', title: '', contentMd: '', createdAt: 't', updatedAt: 't3' }
      })
    )
    const useStore3 = await loadStore({ notes: { get, save: save3 } })
    await useStore3.getState().load('p-1') // 首载落地（打首载标记，防抖门控放行）
    useStore3.getState().edit('p-1', { contentMd: '已保存编辑' })
    useStore3.getState().saveSoon('p-1')
    await vi.advanceTimersByTimeAsync(1600) // 防抖到期：保存成功，未保存标记清
    await useStore3.getState().load('p-1') // 无未保存编辑 → 整版落地
    const landed = useStore3.getState().noteByPaper['p-1']
    expect(landed?.contentMd).toBe('服务器旧内容')
    expect(landed?.title).toBe('服务器标题')
  })

  it('迟到的旧 load 响应被丢弃', async () => {
    let resolveFirst!: (v: unknown) => void
    const get = vi.fn()
      .mockImplementationOnce(() => new Promise((r) => { resolveFirst = r }))
      .mockImplementationOnce(async () => ({ ok: true as const, data: null }))
    const useStore = await loadStore({ notes: { get, save: vi.fn() } })

    const first = useStore.getState().load('p-1') // 旧请求：挂起
    const second = useStore.getState().load('p-1') // 新请求：立即完成
    await second
    expect(useStore.getState().noteByPaper['p-1']?.contentMd).toBe('')

    resolveFirst({
      ok: true,
      data: { id: 'n-1', paperId: 'p-1', title: '旧标题', contentMd: '迟到内容', createdAt: 't', updatedAt: 't' }
    })
    await first
    expect(useStore.getState().noteByPaper['p-1']?.contentMd).toBe('')
  })

  it('迟到的旧 load 失败被丢弃：仅最新请求的失败上抛', async () => {
    let rejectFirst!: (r: { ok: false; error: { code: string; message: string } }) => void
    const get = vi.fn()
      .mockImplementationOnce(() => new Promise((_, rej) => { rejectFirst = rej }))
      .mockImplementationOnce(async () => ({ ok: true as const, data: null }))
    const useStore = await loadStore({ notes: { get, save: vi.fn() } })

    const first = useStore.getState().load('p-1') // 旧请求：挂起且注定失败
    const second = useStore.getState().load('p-1') // 新请求：立即成功
    await second
    rejectFirst({ ok: false, error: { code: 'E_NOTES', message: '旧失败' } })
    await first // 旧失败按迟到丢弃：不得 reject（reject 会让本用例直接红）
    expect(useStore.getState().noteByPaper['p-1']?.savedAt).toBeNull()
  })

  it('首次 load 落地前编辑不触发保存，落地后自动补存', async () => {
    let resolveGet!: (v: unknown) => void
    const get = vi.fn().mockImplementationOnce(() => new Promise((r) => { resolveGet = r }))
    const save = vi.fn(
      async (_req: { paperId: string; title: string; contentMd: string }) => ({
        ok: true as const,
        data: { id: 'n-1', paperId: 'p-1', title: '', contentMd: '', createdAt: 't', updatedAt: 't2' }
      })
    )
    const useStore = await loadStore({ notes: { get, save } })

    // 首载挂起期间用户编辑（模拟面板 onEdit：edit + saveSoon）
    const loading = useStore.getState().load('p-1')
    useStore.getState().edit('p-1', { contentMd: '用户输入' })
    useStore.getState().saveSoon('p-1')
    await vi.advanceTimersByTimeAsync(1600) // 防抖窗口跨过：首载未落地不得保存半成品
    expect(save).not.toHaveBeenCalled()

    resolveGet({
      ok: true,
      data: { id: 'n-1', paperId: 'p-1', title: '服务器标题', contentMd: '服务器旧内容', createdAt: 't', updatedAt: 't' }
    })
    await loading // 保护合并落地 → 自动补存排程
    await vi.advanceTimersByTimeAsync(1600)
    expect(save).toHaveBeenCalledTimes(1)
    expect(save.mock.calls[0]?.[0]).toMatchObject({
      paperId: 'p-1',
      title: '服务器标题', // 未触碰字段取服务器基线
      contentMd: '用户输入' // 用户编辑被补存
    })
  })

  it('load 失败→用户编辑→重试成功：编辑不被覆盖且被补存', async () => {
    const get = vi.fn()
      .mockImplementationOnce(async () => ({ ok: false as const, error: { code: 'E_NOTES', message: '失败' } }))
      .mockImplementationOnce(async () => ({
        ok: true as const,
        data: { id: 'n-1', paperId: 'p-1', title: '服务器标题', contentMd: '服务器旧内容', createdAt: 't', updatedAt: 't' }
      }))
    const save = vi.fn(
      async (_req: { paperId: string; title: string; contentMd: string }) => ({
        ok: true as const,
        data: { id: 'n-1', paperId: 'p-1', title: '', contentMd: '', createdAt: 't', updatedAt: 't2' }
      })
    )
    const useStore = await loadStore({ notes: { get, save } })

    // 首载失败（不打卡首载标记）
    await expect(useStore.getState().load('p-1')).rejects.toBeInstanceOf(Error)
    // 失败后的编辑（store 契约层面：编辑时刻早于重试 load 的发起时刻）
    useStore.getState().edit('p-1', { contentMd: '用户输入' })
    useStore.getState().saveSoon('p-1')
    vi.advanceTimersByTime(2000) // 用户稍后才点重试：编辑时刻严格早于重试发起时刻
    // 重试成功：编辑早于本次 load——仍须合并而非整版覆盖
    await useStore.getState().load('p-1')
    const merged = useStore.getState().noteByPaper['p-1']
    expect(merged?.contentMd).toBe('用户输入')
    expect(merged?.title).toBe('服务器标题')
    await vi.advanceTimersByTimeAsync(1600)
    expect(save).toHaveBeenCalledTimes(1) // 恰一次：合并路径的补存
    expect(save.mock.calls[0]?.[0]).toMatchObject({ paperId: 'p-1', title: '服务器标题', contentMd: '用户输入' })
  })

  it('防抖窗口内切走切回：未保存编辑不被覆盖', async () => {
    const get = vi.fn(async () => ({
      ok: true as const,
      data: { id: 'n-1', paperId: 'p-1', title: '服务器标题', contentMd: '服务器旧内容', createdAt: 't', updatedAt: 't' }
    }))
    const save = vi.fn(
      async (_req: { paperId: string; title: string; contentMd: string }) => ({
        ok: true as const,
        data: { id: 'n-1', paperId: 'p-1', title: '', contentMd: '', createdAt: 't', updatedAt: 't2' }
      })
    )
    const useStore = await loadStore({ notes: { get, save } })

    await useStore.getState().load('p-1') // 首载落地
    useStore.getState().edit('p-1', { contentMd: '窗口内编辑' })
    useStore.getState().saveSoon('p-1') // 防抖排程，不推进到到期 = 窗口内切走
    vi.advanceTimersByTime(1000) // 窗口内流逝（<1.5s），编辑时刻早于切回的 load
    await useStore.getState().load('p-1') // 切回触发：须合并非覆盖
    const merged = useStore.getState().noteByPaper['p-1']
    expect(merged?.contentMd).toBe('窗口内编辑')
    expect(merged?.title).toBe('服务器标题')
    expect(save).not.toHaveBeenCalled() // 窗口未到 + 补存重排：尚无保存
  })

  it('保存进行中再编辑：旧保存成功不误清新编辑的未保存标记', async () => {
    const get = vi.fn(async () => ({
      ok: true as const,
      data: { id: 'n-1', paperId: 'p-1', title: '服务器标题', contentMd: '服务器旧内容', createdAt: 't', updatedAt: 't0' }
    }))
    let resolveSave!: (v: unknown) => void
    const save = vi.fn().mockImplementation(() => new Promise((r) => { resolveSave = r }))
    const useStore = await loadStore({ notes: { get, save } })

    await useStore.getState().load('p-1') // 首载落地
    useStore.getState().edit('p-1', { contentMd: '第一次编辑' })
    useStore.getState().saveSoon('p-1')
    await vi.advanceTimersByTimeAsync(1600) // 防抖到期：save 派发但挂起（in-flight）
    expect(save).toHaveBeenCalledTimes(1)

    useStore.getState().edit('p-1', { contentMd: '新编辑' }) // 保存进行中再编辑（面板会重排防抖）
    useStore.getState().saveSoon('p-1')

    resolveSave({
      ok: true,
      data: { id: 'n-1', paperId: 'p-1', title: '', contentMd: '', createdAt: 't', updatedAt: 't1' }
    })
    await vi.advanceTimersByTimeAsync(0) // 冲微任务：旧保存的成功回调落地

    await useStore.getState().load('p-1') // 旧保存成功后立即 load
    const merged = useStore.getState().noteByPaper['p-1']
    expect(merged?.contentMd).toBe('新编辑') // 新编辑标记未被误清 → 合并非整版覆盖
    expect(merged?.title).toBe('服务器标题')
  })

  it('补存失败后再 load：触碰记录仍在，用户编辑不被服务器值覆盖', async () => {
    const get = vi.fn(async () => ({
      ok: true as const,
      data: { id: 'n-1', paperId: 'p-1', title: '服务器标题', contentMd: '服务器旧内容', createdAt: 't', updatedAt: 't' }
    }))
    const save = vi.fn(async () => ({ ok: false as const, error: { code: 'E_NOTES', message: '保存失败' } }))
    const useStore = await loadStore({ notes: { get, save } })

    const loading = useStore.getState().load('p-1') // 首载挂起
    useStore.getState().edit('p-1', { contentMd: '用户输入' }) // 挂起期编辑（首载门控吞防抖）
    await loading // 合并落地：contentMd 保用户输入；排补存
    await vi.advanceTimersByTimeAsync(1600) // 补存到期：保存失败——触碰记录必须仍在
    expect(save).toHaveBeenCalledTimes(1)
    expect(useStore.getState().noteByPaper['p-1']?.saving).toBe(false)

    await useStore.getState().load('p-1') // 切回再 load：仍须合并保用户输入
    const merged = useStore.getState().noteByPaper['p-1']
    expect(merged?.contentMd).toBe('用户输入') // 保存失败不得使下次合并退化为整版取服务器
    expect(merged?.title).toBe('服务器标题')
  })
})
