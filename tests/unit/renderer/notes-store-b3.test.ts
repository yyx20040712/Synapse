/**
 * [F-UIRES-03 B3] notes.store 状态机补格 —— 四态钮后端契约（always-active，
 * 不经 guardedDescribe——B3 状态机单测全格是 INV-106 的强制面）。
 *
 * 态空间（设计稿 v1.7 §2 B3——F1 终裁方案；store 可观测态 =
 * NoteDraft{ saving, pending, saveFailed }）：
 * | 格 | 触发 | 迁移 |
 * | 1 | clean+输入 | dirty（启防抖 T） |
 * | 2 | dirty+T 到 | saving（载荷=触发时快照） |
 * | 3 | dirty+点击 | saving（点击先清 T——saveNow） |
 * | 4 | saving+输入 | saving∧pending（新输入暂存草稿，不覆盖在途载荷） |
 * | 5 | saving+成功∧pending | pending 合并态转 dirty+启新防抖 T（消费时点一） |
 * | 6 | saving+成功∧¬pending | clean |
 * | 7 | saving+失败 | error∧pending 保持（INV-04：savedAt 不推进） |
 * | 8 | error+输入 | dirty∧缓冲消解（saveFailed 清除；未落库镜像 pending 保持） |
 * | 9 | error+点击 | saving（载荷=pending 合并态——消费时点二） |
 * | U1 | 卸载∧pending∧saving 在途 | 等待在途完成后以 pending 合并态立即落盘 |
 * | U2 | 卸载∧pending∧error | 卸载前以 pending 合并态立即重试落盘一次 |
 *
 * 注：镜像 pending=「草稿含未落库编辑」（dirty/saving∧pending/error 三态皆真，
 * 与抽象机的「saving 期编辑缓冲」不同维——缓冲消解指载荷已并入在途/草稿，
 * 镜像仅在落库成功时清）。卸载三族序列（切走切回/关面板/退出）见本文件
 * 切走切回/退出两族 + reader-notes-panel-b3.test.tsx 关面板族（组件级）。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

async function loadStore(api: unknown) {
  vi.resetModules()
  vi.stubGlobal('window', { api })
  const mod = await import('../../../src/renderer/features/notes/notes.store')
  return mod.useNotesStore
}

/** 退出拦截族消费的 dirty 信号源（tab-dirty 读 noteByPaper.pending——INV-22） */
async function loadTabDirty() {
  const mod = await import('../../../src/renderer/features/reader/state/tab-dirty')
  return mod.tabDirtySignals
}

function saved(contentMd: string, updatedAt: string) {
  return { ok: true as const, data: { id: 'n-1', paperId: 'p-1', contentMd, createdAt: 't', updatedAt } }
}

describe('F-UIRES-03 B3 notes.store 状态机全格（四态钮后端契约）', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  /** 载入成功基线（空笔记，过首载门控）——各格共用起点 */
  async function freshStore(save: ReturnType<typeof vi.fn>) {
    const get = vi.fn(async () => saved('', 't0'))
    const useStore = await loadStore({ notes: { get, save } })
    await useStore.getState().load('p-1')
    return useStore
  }

  it('格1：clean+输入→dirty（pending 置位+防抖 T 排程）', async () => {
    const save = vi.fn(async () => saved('x', 't1'))
    const useStore = await freshStore(save)
    expect(useStore.getState().noteByPaper['p-1']?.pending).toBe(false) // clean 起点

    useStore.getState().edit('p-1', { contentMd: '输入' })
    useStore.getState().saveSoon('p-1') // 面板 onEdit 契约：edit+saveSoon 成对
    const d = useStore.getState().noteByPaper['p-1']
    expect(d?.pending).toBe(true) // dirty
    expect(d?.saving).toBe(false)
    expect(d?.saveFailed).toBe(false)
    expect(vi.getTimerCount()).toBe(1) // 防抖 T 已排程
  })

  it('格2：dirty+防抖 T 到→saving（saving 置位+载荷=触发时草稿）', async () => {
    let resolveSave!: (v: unknown) => void
    const save = vi.fn().mockImplementation(() => new Promise((r) => { resolveSave = r }))
    const useStore = await freshStore(save)
    useStore.getState().edit('p-1', { contentMd: '新' })
    useStore.getState().saveSoon('p-1')
    await vi.advanceTimersByTimeAsync(1499)
    expect(save).not.toHaveBeenCalled() // T 未到不派发
    await vi.advanceTimersByTimeAsync(1)
    expect(save).toHaveBeenCalledTimes(1)
    expect(save.mock.calls[0]?.[0]).toMatchObject({ paperId: 'p-1', contentMd: '新' })
    const inflightDraft = useStore.getState().noteByPaper['p-1']
    expect(inflightDraft?.saving).toBe(true) // saving（在途）
    expect(inflightDraft?.saveFailed).toBe(false) // 派发即清 error 面（error+点击→saving 的共用口）
    resolveSave(saved('新', 't1'))
    await vi.advanceTimersByTimeAsync(0)
  })

  it('格3：dirty+点击→saving（点击先清防抖 T+立即落盘——saveNow）', async () => {
    let resolveSave!: (v: unknown) => void
    const save = vi.fn().mockImplementation(() => new Promise((r) => { resolveSave = r }))
    const useStore = await freshStore(save)
    useStore.getState().edit('p-1', { contentMd: '草稿' })
    useStore.getState().saveSoon('p-1')
    expect(vi.getTimerCount()).toBe(1)

    useStore.getState().saveNow('p-1')
    expect(vi.getTimerCount()).toBe(0) // 点击先清 T
    expect(save).toHaveBeenCalledTimes(1) // 未到 1.5s 即落盘
    expect(save.mock.calls[0]?.[0]).toMatchObject({ paperId: 'p-1', contentMd: '草稿' })
    expect(useStore.getState().noteByPaper['p-1']?.saving).toBe(true)
    resolveSave(saved('草稿', 't1'))
    await vi.advanceTimersByTimeAsync(0)
  })

  it('格3 边界（RR1 k1-W1）：首载窗口内点击 saveNow→零派发（半成品保护门控——load 合并+补存承接）', async () => {
    let resolveGet!: (v: unknown) => void
    const get = vi.fn().mockImplementationOnce(() => new Promise((r) => { resolveGet = r }))
    const save = vi.fn(async (_req: { paperId: string; contentMd: string }) => saved('首载窗口输入', 't2'))
    const useStore = await loadStore({ notes: { get, save } })
    const loading = useStore.getState().load('p-1') // 首载挂起：loadedOnce 未打卡

    // 首载窗口内输入+点击（面板契约：edit+saveSoon 成对，钮点击=saveNow）——
    // !loadedOnce ∧ lastEditedAt 有值：saveNow/saveSoon 同门控吞（服务器基线
    // 未知不抢存半成品）
    useStore.getState().edit('p-1', { contentMd: '首载窗口输入' })
    useStore.getState().saveSoon('p-1')
    useStore.getState().saveNow('p-1')
    await vi.advanceTimersByTimeAsync(2000)
    expect(save).not.toHaveBeenCalled() // 零 timer 零在途——点击零派发

    resolveGet(saved('服务器内容', 't1'))
    await loading // 合并落地（保用户字段）+自动补存排程
    await vi.advanceTimersByTimeAsync(1600)
    expect(save).toHaveBeenCalledTimes(1) // 承接方=合并+补存
    expect(save.mock.calls[0]?.[0]).toMatchObject({ paperId: 'p-1', contentMd: '首载窗口输入' })
  })

  it('格4：saving+输入→saving∧pending（新输入暂存草稿，不覆盖在途载荷）', async () => {
    let resolveSave!: (v: unknown) => void
    const save = vi.fn().mockImplementation(() => new Promise((r) => { resolveSave = r }))
    const useStore = await freshStore(save)
    useStore.getState().edit('p-1', { contentMd: '第一次' })
    useStore.getState().saveSoon('p-1')
    await vi.advanceTimersByTimeAsync(1500) // 在途（载荷=「第一次」闭包快照）
    expect(useStore.getState().noteByPaper['p-1']?.saving).toBe(true)

    useStore.getState().edit('p-1', { contentMd: '第二次' }) // saving 中新输入
    const mid = useStore.getState().noteByPaper['p-1']
    expect(mid?.saving).toBe(true) // saving∧
    expect(mid?.pending).toBe(true) // pending（缓冲在草稿）
    expect(mid?.saveFailed).toBe(false)
    expect(mid?.contentMd).toBe('第二次')

    resolveSave(saved('第一次', 't1')) // 在途以旧载荷落库——不被新输入覆盖
    await vi.advanceTimersByTimeAsync(0)
    const d = useStore.getState().noteByPaper['p-1']
    expect(d?.contentMd).toBe('第二次') // 新输入不丢
    expect(d?.pending).toBe(true)
  })

  it('格5：saving+成功∧pending→pending 合并态转 dirty+启新防抖 T（消费时点一）', async () => {
    let resolveSave!: (v: unknown) => void
    const save = vi.fn()
      .mockImplementationOnce(() => new Promise((r) => { resolveSave = r }))
      .mockImplementationOnce(async () => saved('第二次', 't3'))
    const useStore = await freshStore(save)
    useStore.getState().edit('p-1', { contentMd: '第一次' })
    useStore.getState().saveSoon('p-1')
    await vi.advanceTimersByTimeAsync(1500) // 在途
    useStore.getState().edit('p-1', { contentMd: '第二次' }) // 派发后新编辑（缓冲）

    resolveSave(saved('第一次', 't2'))
    await vi.advanceTimersByTimeAsync(0) // 成功回调落地
    const d = useStore.getState().noteByPaper['p-1']
    expect(d?.saving).toBe(false)
    expect(d?.contentMd).toBe('第二次') // 编辑态=pending 合并态
    expect(d?.pending).toBe(true) // 转 dirty（未落库）
    expect(vi.getTimerCount()).toBe(1) // 启新防抖 T（消费时点一）

    await vi.advanceTimersByTimeAsync(1500) // 新 T 到：合并态落库
    expect(save).toHaveBeenCalledTimes(2)
    expect(save.mock.calls[1]?.[0]).toMatchObject({ paperId: 'p-1', contentMd: '第二次' })
    expect(useStore.getState().noteByPaper['p-1']?.pending).toBe(false) // clean
  })

  it('格6：saving+成功∧无 pending→clean（savedAt 推进+不启新防抖）', async () => {
    const save = vi.fn(async () => saved('唯一', 't2'))
    const useStore = await freshStore(save)
    useStore.getState().edit('p-1', { contentMd: '唯一' })
    useStore.getState().saveSoon('p-1')
    await vi.advanceTimersByTimeAsync(1500)
    const d = useStore.getState().noteByPaper['p-1']
    expect(d?.saving).toBe(false)
    expect(d?.pending).toBe(false)
    expect(d?.saveFailed).toBe(false)
    expect(d?.savedAt).toBe('t2')
    expect(vi.getTimerCount()).toBe(0) // clean 不启新 T
  })

  it('格7：saving+失败→error（saveFailed 置位）∧pending 保持（INV-04：savedAt 不推进）', async () => {
    const save = vi.fn(async () => ({ ok: false as const, error: { code: 'E', message: '写盘失败' } }))
    const useStore = await freshStore(save)
    useStore.getState().edit('p-1', { contentMd: '草稿' })
    useStore.getState().saveSoon('p-1')
    await vi.advanceTimersByTimeAsync(1500)
    const d = useStore.getState().noteByPaper['p-1']
    expect(d?.saving).toBe(false)
    expect(d?.saveFailed).toBe(true) // error
    expect(d?.pending).toBe(true) // pending 保持
    expect(d?.savedAt).toBe('t0') // 失败不推进 savedAt
  })

  it('格8：error+输入→dirty∧缓冲消解（saveFailed 清除；未落库镜像 pending 保持）', async () => {
    const save = vi.fn(async () => ({ ok: false as const, error: { code: 'E', message: '写盘失败' } }))
    const useStore = await freshStore(save)
    useStore.getState().edit('p-1', { contentMd: '草稿' })
    useStore.getState().saveSoon('p-1')
    await vi.advanceTimersByTimeAsync(1500) // error
    expect(useStore.getState().noteByPaper['p-1']?.saveFailed).toBe(true)

    useStore.getState().edit('p-1', { contentMd: '再输入' })
    const d = useStore.getState().noteByPaper['p-1']
    expect(d?.saveFailed).toBe(false) // 清 error（缓冲并入 dirty 编辑态）
    expect(d?.saving).toBe(false)
    expect(d?.pending).toBe(true) // 镜像语义=未落库（非 saving 期缓冲位）
  })

  it('格9：error+点击→saving（载荷=pending 合并态且缓冲消解——消费时点二）', async () => {
    const save = vi.fn()
      .mockImplementationOnce(async () => ({ ok: false as const, error: { code: 'E', message: '写盘失败' } }))
      .mockImplementationOnce(async () => saved('合并态', 't3'))
    const useStore = await freshStore(save)
    useStore.getState().edit('p-1', { contentMd: '合并态' })
    useStore.getState().saveSoon('p-1')
    await vi.advanceTimersByTimeAsync(1500) // error（pending 保持）
    expect(useStore.getState().noteByPaper['p-1']?.saveFailed).toBe(true)

    useStore.getState().saveNow('p-1') // 点击重试
    expect(save).toHaveBeenCalledTimes(2)
    expect(save.mock.calls[1]?.[0]).toMatchObject({ paperId: 'p-1', contentMd: '合并态' }) // 载荷=pending 合并态
    const mid = useStore.getState().noteByPaper['p-1']
    expect(mid?.saving).toBe(true)
    expect(mid?.saveFailed).toBe(false) // error 清除→saving
    await vi.advanceTimersByTimeAsync(0)
    expect(useStore.getState().noteByPaper['p-1']?.pending).toBe(false) // 重试成功→clean
  })

  // ── 卸载面（U1/U2 + 三族序列）──

  it('U1：pending∧saving 在途→flush 等待在途完成后以 pending 合并态立即落盘', async () => {
    let resolveFirst!: (v: unknown) => void
    const save = vi.fn()
      .mockImplementationOnce(() => new Promise((r) => { resolveFirst = r }))
      .mockImplementationOnce(async () => saved('第二次', 't3'))
    const useStore = await freshStore(save)
    useStore.getState().edit('p-1', { contentMd: '第一次' })
    useStore.getState().saveSoon('p-1')
    await vi.advanceTimersByTimeAsync(1500) // 在途
    useStore.getState().edit('p-1', { contentMd: '第二次' }) // pending 缓冲

    const flushing = useStore.getState().flush('p-1') // 卸载时调（不 await 在途前的派发）
    resolveFirst(saved('第一次', 't2')) // 在途稍后完成
    await flushing
    // 在途完成后立即（不等新防抖 1.5s）以合并态落盘
    expect(save).toHaveBeenCalledTimes(2)
    expect(save.mock.calls[1]?.[0]).toMatchObject({ paperId: 'p-1', contentMd: '第二次' })
    const d = useStore.getState().noteByPaper['p-1']
    expect(d?.pending).toBe(false) // 落库完成
    expect(d?.savedAt).toBe('t3')
  })

  it('U2：pending∧error→flush 卸载前以 pending 合并态立即重试落盘一次', async () => {
    const save = vi.fn()
      .mockImplementationOnce(async () => ({ ok: false as const, error: { code: 'E', message: '写盘失败' } }))
      .mockImplementationOnce(async () => saved('草稿', 't3'))
    const useStore = await freshStore(save)
    useStore.getState().edit('p-1', { contentMd: '草稿' })
    useStore.getState().saveSoon('p-1')
    await vi.advanceTimersByTimeAsync(1500) // error（无 timer、无在途）
    expect(vi.getTimerCount()).toBe(0)

    await useStore.getState().flush('p-1') // 卸载：立即重试一次
    expect(save).toHaveBeenCalledTimes(2)
    expect(save.mock.calls[1]?.[0]).toMatchObject({ paperId: 'p-1', contentMd: '草稿' })
    expect(useStore.getState().noteByPaper['p-1']?.pending).toBe(false) // 重试成功→clean
  })

  it('U 边界：clean/dirty（无在途无 error）flush=no-op（防抖 timer 通道承接，不强制立即）', async () => {
    const save = vi.fn(async () => saved('x', 't1'))
    const useStore = await freshStore(save)
    await useStore.getState().flush('p-1') // clean
    useStore.getState().edit('p-1', { contentMd: '窗口内' })
    useStore.getState().saveSoon('p-1') // dirty（timer 在排）
    await useStore.getState().flush('p-1')
    expect(save).not.toHaveBeenCalled() // 不抢跑：普通 dirty 由既有防抖通道落盘
    expect(vi.getTimerCount()).toBe(1)
    await vi.advanceTimersByTimeAsync(1500)
    expect(save).toHaveBeenCalledTimes(1) // 既有通道兑现
  })

  it('序列族·切走切回：saving∧pending 在途切走（flush）→合并态落库→切回 load 整版取已落库值', async () => {
    // 单写者服务器模型：save 成功推进服务器状态；切走=组件调 flush（组件级钩子
    // 另测）；切回=load（pendingEdit 已清→整版——flush 落库后无合并回填）
    let serverContent = ''
    let serverSavedAt = 't0'
    let resolveFirst!: (v: unknown) => void
    const save = vi.fn()
      .mockImplementationOnce(() => new Promise((r) => { resolveFirst = r }))
      .mockImplementationOnce(async (req: { contentMd: string }) => {
        serverContent = req.contentMd
        serverSavedAt = 't3'
        return saved(serverContent, serverSavedAt)
      })
    const get = vi.fn(async () => saved(serverContent, serverSavedAt))
    const useStore = await loadStore({ notes: { get, save } })
    await useStore.getState().load('p-1')

    useStore.getState().edit('p-1', { contentMd: '切走前输入' })
    useStore.getState().saveSoon('p-1')
    await vi.advanceTimersByTimeAsync(1500) // 在途（挂起）
    useStore.getState().edit('p-1', { contentMd: '切走瞬间输入' }) // pending 维

    const flushing = useStore.getState().flush('p-1') // 切走
    resolveFirst(saved('切走前输入', 't2')) // 在途完成
    await flushing // 合并态立即落库
    expect(serverContent).toBe('切走瞬间输入')

    await useStore.getState().load('p-1') // 切回
    const d = useStore.getState().noteByPaper['p-1']
    expect(d?.contentMd).toBe('切走瞬间输入') // 整版取已落库值（无未保存编辑）
    expect(d?.pending).toBe(false)
    expect(d?.savedAt).toBe('t3')
  })

  it('序列族·退出：saving∧pending/error 全程保持退出拦截信号（tabDirty 输入恒真——INV-22 通道）', async () => {
    let resolveSave!: (v: unknown) => void
    const save = vi.fn()
      .mockImplementationOnce(() => new Promise((r) => { resolveSave = r }))
      .mockImplementationOnce(async () => ({ ok: false as const, error: { code: 'E', message: '写盘失败' } }))
      .mockImplementationOnce(async () => saved('落库', 't4'))
    const useStore = await freshStore(save)
    // 顺序契约：resetModules 之后装载（否则 tab-dirty 持有另一 store 实例）
    const signals = await loadTabDirty()

    useStore.getState().edit('p-1', { contentMd: '退出窗口' })
    useStore.getState().saveSoon('p-1')
    await vi.advanceTimersByTimeAsync(1500) // 在途
    useStore.getState().edit('p-1', { contentMd: '退出窗口二' }) // saving∧pending
    expect(signals('p-1').notesPending).toBe(true) // 退出拦截信号在途保持

    resolveSave(saved('退出窗口', 't2'))
    await vi.advanceTimersByTimeAsync(0) // 成功但 pending 存在（消费时点一→dirty）
    expect(signals('p-1').notesPending).toBe(true) // 新防抖未落库——仍拦截

    await vi.advanceTimersByTimeAsync(1500) // 新 T 到：失败→error
    expect(useStore.getState().noteByPaper['p-1']?.saveFailed).toBe(true)
    expect(signals('p-1').notesPending).toBe(true) // error 态仍拦截（卸载重试=面板路径）

    await useStore.getState().flush('p-1') // 卸载重试成功
    expect(signals('p-1').notesPending).toBe(false) // 拦截解除（clean）
  })
})
