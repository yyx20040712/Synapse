import { describe, expect, it, vi } from 'vitest'
/** 动态导入件的类型面（lint 禁 import() 类型注解——type-only import 消解：
 *  编译期擦除零运行时模块缓存，运行时模块恒经 loadStore 动态取） */
import type { AiMemoryStore } from '../../../src/renderer/features/ai/aiMemoryStore'
import type { AiMemoryListItem } from '../../../src/shared/models/ai-domain'

/**
 * [F-DBCAMP-01 DB-2 UI U5] aiMemoryStore —— scope 级列表+CRUD+搜索态机
 * （always-active 裸 describe，K3——不经 guardedDescribe）。
 *
 * 覆盖（票面第 5 件行为面；态空间表单源=aiMemoryStore.ts 文件头注）：
 * 列表态机（loading→ready|error）/双语义路由（query 在席=检索 {scope,query}，
 * 缺席=列表 {scope,category?,pinnedOnly?}——互斥由路由保证）/trim 空白回落/
 * 幂等护栏（同签名 loading/ready 不重派；error 重派）/过滤签名变化重派/
 * setScope 切档（旧条目删+晚到失格+分类随档重置）/unload 清面+晚到失格/
 * CRUD 成功（create→刷新+draft 清空；update→刷新+editing 清空；remove→本地
 * 行移除零重派）/错误映射（NOT_FOUND→行消失+刷新；INVALID_REQUEST→行内
 * 通用错误；无 CONFLICT 分支）/非 global 档 create 拦截（新呈裁-1 置灰的服务
 * 端外守卫）/CRUD 回包晚到失格（unload 后/过滤重派后）。
 * 配方沿 ai-tasks-store.test：vi.resetModules+stubGlobal(window.api)。
 */

/** 记忆行夹具（shared 投影字面——over 覆写制造多态行） */
function mem(over: Partial<AiMemoryListItem> = {}): AiMemoryListItem {
  return {
    id: 31,
    scope: 'global',
    anchorId: null,
    category: 'user_preference',
    label: '',
    title: '记忆甲',
    content: '内容甲',
    pinned: false,
    origin: 'manual',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    anchorTitle: null,
    ...over
  }
}

interface Deferred<T> {
  promise: Promise<T>
  resolve(v: T): void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

/** 微任务排空（unwrap 链 then——8 tick 富余） */
async function flush(ticks = 8): Promise<void> {
  for (let i = 0; i < ticks; i += 1) {
    await Promise.resolve()
  }
}

interface StoreMod {
  useAiMemoryStore: { getState(): AiMemoryStore }
}

/** ai_memory 域通道桩（缺省恒 ok 空——over 逐通道覆写） */
function memApi(over: Record<string, unknown>): { ai_memory: Record<string, unknown> } {
  return {
    ai_memory: {
      listByScope: vi.fn(async () => ({ ok: true as const, data: { items: [] } })),
      create: vi.fn(async () => ({ ok: true as const, data: { item: mem() } })),
      update: vi.fn(async () => ({ ok: true as const, data: { item: mem() } })),
      delete: vi.fn(async () => ({ ok: true as const, data: { ok: true } })),
      setPinned: vi.fn(async () => ({ ok: true as const, data: { item: mem() } })),
      ...over
    }
  }
}

/** api 门面桩（ai_memory 域缺省+顶层覆写位） */
function apiStub(over: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...memApi({}), ...over }
}

async function loadStore(api: unknown): Promise<StoreMod> {
  vi.resetModules()
  vi.stubGlobal('window', { api })
  const mod = (await import('../../../src/renderer/features/ai/aiMemoryStore')) as unknown as StoreMod
  return mod
}

/** ok 回包形状（Result 直写——unwrap 真实现消费） */
function okItems(rows: AiMemoryListItem[]) {
  return { ok: true as const, data: { items: rows } }
}

describe('F-DBCAMP-01 U5 aiMemoryStore —— scope 列表/CRUD/搜索双语义', () => {
  it('态机：load 置 loading→list 成功→ready 落 items；无过滤列表模式 req={scope}（category/pinnedOnly 键省略）', async () => {
    const list = vi.fn(async () => okItems([mem()]))
    const mod = await loadStore(apiStub(memApi({ listByScope: list })))

    mod.useAiMemoryStore.getState().load()
    expect(mod.useAiMemoryStore.getState().panels.global?.status, '派发即 loading').toBe('loading')
    await flush()

    const entry = mod.useAiMemoryStore.getState().panels.global
    expect(entry?.status, '成功→ready').toBe('ready')
    expect(entry?.items).toEqual([mem()])
    expect(list).toHaveBeenCalledWith({ scope: 'global' })
  })

  it('列表模式带过滤：category+pinnedOnly 同席→req={scope,category,pinnedOnly:true}', async () => {
    const list = vi.fn(async () => okItems([]))
    const mod = await loadStore(apiStub(memApi({ listByScope: list })))

    mod.useAiMemoryStore.getState().setCategory('user_preference')
    await flush()
    expect(list).toHaveBeenLastCalledWith({ scope: 'global', category: 'user_preference' })

    mod.useAiMemoryStore.getState().setPinnedOnly(true)
    await flush()
    expect(list).toHaveBeenLastCalledWith({ scope: 'global', category: 'user_preference', pinnedOnly: true })
    expect(list).toHaveBeenCalledTimes(2)
  })

  it('检索模式路由：query 在席→req={scope,query}（trim 后；category/pinnedOnly 不共发——W-1 互斥）', async () => {
    const list = vi.fn(async () => okItems([]))
    const mod = await loadStore(apiStub(memApi({ listByScope: list })))

    mod.useAiMemoryStore.getState().setCategory('user_preference')
    await flush()
    mod.useAiMemoryStore.getState().setQuery('  关键词  ')
    await flush()
    expect(list).toHaveBeenLastCalledWith({ scope: 'global', query: '关键词' })
    expect(list).toHaveBeenCalledTimes(2)
  })

  it('query 清空回落列表模式：空串提交→req 无 query 键（过滤面恢复生效）', async () => {
    const list = vi.fn(async () => okItems([]))
    const mod = await loadStore(apiStub(memApi({ listByScope: list })))

    mod.useAiMemoryStore.getState().setQuery('关键词')
    await flush()
    mod.useAiMemoryStore.getState().setQuery('')
    await flush()
    expect(list).toHaveBeenLastCalledWith({ scope: 'global' })
    expect(list).toHaveBeenCalledTimes(2)
  })

  it('幂等护栏：同签名 ready 再 load 不派发；error 态允许重派（重挂重试）', async () => {
    let call = 0
    const list = vi.fn(async () => {
      call += 1
      return call === 1 ? { ok: false as const, error: { code: 'INVALID_REQUEST', message: 'x' } } : okItems([])
    })
    const mod = await loadStore(apiStub(memApi({ listByScope: list })))

    mod.useAiMemoryStore.getState().load()
    await flush()
    expect(mod.useAiMemoryStore.getState().panels.global?.status, '错误→error').toBe('error')
    mod.useAiMemoryStore.getState().load()
    await flush()
    expect(list, 'error 态重派').toHaveBeenCalledTimes(2)
    mod.useAiMemoryStore.getState().load()
    expect(list, 'ready 幂等').toHaveBeenCalledTimes(2)
  })

  it('过滤签名变化重派：setCategory 触发新 list（同 scope 条目重走 loading）', async () => {
    const list = vi.fn(async () => okItems([mem()]))
    const mod = await loadStore(apiStub(memApi({ listByScope: list })))

    mod.useAiMemoryStore.getState().load()
    await flush()
    mod.useAiMemoryStore.getState().setCategory('task_outcome')
    expect(mod.useAiMemoryStore.getState().panels.global?.status, '签名变化→loading').toBe('loading')
    await flush()
    expect(list).toHaveBeenCalledTimes(2)
    expect(list).toHaveBeenLastCalledWith({ scope: 'global', category: 'task_outcome' })
  })

  it('setScope 切档：旧条目删+晚到旧回包不复活；分类随档重置（req 无 category 键）', async () => {
    type ListResult = ReturnType<typeof okItems>
    const d = deferred<ListResult>()
    const list = vi.fn(() => d.promise)
    const mod = await loadStore(apiStub(memApi({ listByScope: list })))

    mod.useAiMemoryStore.getState().setCategory('user_preference')
    mod.useAiMemoryStore.getState().setScope('paper')
    expect(mod.useAiMemoryStore.getState().panels.global, '切档即清旧条目').toBeUndefined()
    expect(mod.useAiMemoryStore.getState().filters.scope).toBe('paper')
    expect(mod.useAiMemoryStore.getState().filters.category, '分类随档重置').toBe('')

    d.resolve(okItems([mem({ scope: 'paper', anchorId: 'p-1' })]))
    await flush()
    // 旧 global 回包落不进已删条目；paper 链另派（setCategory 与 setScope 各一次
    // ——paper 请求=第 2 次调用；[回炉 R6] 原注「第三次」失实按实照修正）
    expect(mod.useAiMemoryStore.getState().panels.global, '晚到不复活').toBeUndefined()
    expect(list).toHaveBeenLastCalledWith({ scope: 'paper' })
  })

  it('unload：清全部条目+在途回包晚到不复活（卸载失格）', async () => {
    type ListResult = ReturnType<typeof okItems>
    const d = deferred<ListResult>()
    const list = vi.fn(() => d.promise)
    const mod = await loadStore(apiStub(memApi({ listByScope: list })))

    mod.useAiMemoryStore.getState().load()
    mod.useAiMemoryStore.getState().unload()
    expect(mod.useAiMemoryStore.getState().panels.global, 'unload 即清').toBeUndefined()

    d.resolve(okItems([mem()]))
    await flush()
    expect(mod.useAiMemoryStore.getState().panels.global, '晚到不复活').toBeUndefined()
  })

  it('create 成功（global 档）：req={scope:global,anchorId:null,category,title,content}→刷新列表+draft 清空', async () => {
    const list = vi.fn(async () => okItems([]))
    const create = vi.fn(async () => ({ ok: true as const, data: { item: mem({ id: 99, title: '新记忆' }) } }))
    const mod = await loadStore(apiStub(memApi({ listByScope: list, create })))

    mod.useAiMemoryStore.getState().load()
    await flush()
    mod.useAiMemoryStore.getState().setDraft({ title: '新记忆', content: '新内容' })
    mod.useAiMemoryStore.getState().create()
    await flush()

    expect(create).toHaveBeenCalledWith({
      scope: 'global',
      anchorId: null,
      category: 'user_preference',
      title: '新记忆',
      content: '新内容'
    })
    expect(list, 'create 成功→刷新').toHaveBeenCalledTimes(2)
    const draft = mod.useAiMemoryStore.getState().draft
    expect(draft.title, 'draft 清空').toBe('')
    expect(mod.useAiMemoryStore.getState().formError).toBeNull()
  })

  it('create 非 global 档：formError「暂不支持在本面板为该档新建」+零 IPC（新呈裁-1）', async () => {
    const list = vi.fn(async () => okItems([]))
    const create = vi.fn()
    const mod = await loadStore(apiStub(memApi({ listByScope: list, create })))

    mod.useAiMemoryStore.getState().setScope('paper')
    await flush()
    mod.useAiMemoryStore.getState().create()
    await flush()

    expect(mod.useAiMemoryStore.getState().formError).toBe('暂不支持在本面板为该档新建')
    expect(create).not.toHaveBeenCalled()
  })

  it('create INVALID_REQUEST→formError「请求无效，请重试」+draft 保留（行内通用错误）', async () => {
    const list = vi.fn(async () => okItems([]))
    const create = vi.fn(async () => ({ ok: false as const, error: { code: 'INVALID_REQUEST', message: '值域拒' } }))
    const mod = await loadStore(apiStub(memApi({ listByScope: list, create })))

    // [回炉 R1 对齐] 真实挂载必先 load 建条目（失败收尾存活探针=条目在场）
    mod.useAiMemoryStore.getState().load()
    await flush()
    mod.useAiMemoryStore.getState().setDraft({ title: '保留草稿' })
    mod.useAiMemoryStore.getState().create()
    await flush()

    expect(mod.useAiMemoryStore.getState().formError).toBe('请求无效，请重试')
    expect(mod.useAiMemoryStore.getState().draft.title, 'draft 保留').toBe('保留草稿')
    expect(list, '失败零追加刷新（1=挂载 load）').toHaveBeenCalledTimes(1)
  })

  it('update 成功：editing 清空+刷新列表（新行落地）', async () => {
    const updated = mem({ title: '改后标题' })
    let call = 0
    const list = vi.fn(async () => {
      call += 1
      return call === 1 ? okItems([mem()]) : okItems([updated])
    })
    const update = vi.fn(async () => ({ ok: true as const, data: { item: updated } }))
    const mod = await loadStore(apiStub(memApi({ listByScope: list, update })))

    mod.useAiMemoryStore.getState().load()
    await flush()
    mod.useAiMemoryStore.getState().startEdit(mem())
    mod.useAiMemoryStore.getState().setEditDraft({ title: '改后标题' })
    mod.useAiMemoryStore.getState().update()
    await flush()

    expect(update).toHaveBeenCalledWith({ id: 31, patch: { title: '改后标题', content: '内容甲', category: 'user_preference' } })
    expect(mod.useAiMemoryStore.getState().editing, 'editing 清空').toBeNull()
    expect(mod.useAiMemoryStore.getState().panels.global?.items[0]?.title, '刷新落新行').toBe('改后标题')
  })

  it('update INVALID_REQUEST→rowErrors[id] 行内错误+列表不动+editing 保留', async () => {
    const list = vi.fn(async () => okItems([mem()]))
    const update = vi.fn(async () => ({ ok: false as const, error: { code: 'INVALID_REQUEST', message: '类目拒' } }))
    const mod = await loadStore(apiStub(memApi({ listByScope: list, update })))

    mod.useAiMemoryStore.getState().load()
    await flush()
    mod.useAiMemoryStore.getState().startEdit(mem())
    mod.useAiMemoryStore.getState().update()
    await flush()

    expect(mod.useAiMemoryStore.getState().rowErrors[31]).toBe('请求无效，请重试')
    expect(mod.useAiMemoryStore.getState().panels.global?.items).toEqual([mem()])
    expect(mod.useAiMemoryStore.getState().editing, 'editing 保留（供改后重提）').not.toBeNull()
    expect(list, '失败不刷新').toHaveBeenCalledTimes(1)
  })

  it('update NOT_FOUND→行消失+刷新（重派拉新事实）', async () => {
    let call = 0
    const list = vi.fn(async () => {
      call += 1
      return call === 1 ? okItems([mem(), mem({ id: 32, title: '记忆乙' })]) : okItems([mem({ id: 32, title: '记忆乙' })])
    })
    const update = vi.fn(async () => ({ ok: false as const, error: { code: 'NOT_FOUND', message: '行不存在' } }))
    const mod = await loadStore(apiStub(memApi({ listByScope: list, update })))

    mod.useAiMemoryStore.getState().load()
    await flush()
    mod.useAiMemoryStore.getState().startEdit(mem())
    mod.useAiMemoryStore.getState().update()
    await flush()

    expect(mod.useAiMemoryStore.getState().panels.global?.items.map((m) => m.id), '行消失+新事实').toEqual([32])
    expect(list, 'NOT_FOUND 触发刷新').toHaveBeenCalledTimes(2)
  })

  it('setPinned 成功→刷新列表；NOT_FOUND→行消失+刷新', async () => {
    // 成功轴
    const listA = vi.fn(async () => okItems([mem()]))
    const pin = vi.fn(async () => ({ ok: true as const, data: { item: mem({ pinned: true }) } }))
    const modA = await loadStore(apiStub(memApi({ listByScope: listA, setPinned: pin })))
    modA.useAiMemoryStore.getState().load()
    await flush()
    modA.useAiMemoryStore.getState().setPinned(31, true)
    await flush()
    expect(pin).toHaveBeenCalledWith({ id: 31, pinned: true })
    expect(listA, '置顶成功→刷新').toHaveBeenCalledTimes(2)

    // NOT_FOUND 轴
    let call = 0
    const listB = vi.fn(async () => {
      call += 1
      return call === 1 ? okItems([mem()]) : okItems([])
    })
    const pinErr = vi.fn(async () => ({ ok: false as const, error: { code: 'NOT_FOUND', message: '行不存在' } }))
    const modB = await loadStore(apiStub(memApi({ listByScope: listB, setPinned: pinErr })))
    modB.useAiMemoryStore.getState().load()
    await flush()
    modB.useAiMemoryStore.getState().setPinned(31, true)
    await flush()
    expect(modB.useAiMemoryStore.getState().panels.global?.items, 'NOT_FOUND→行消失+刷新').toEqual([])
  })

  it('remove 成功→行本地移除+零重派（删除即终态无需拉新）', async () => {
    const list = vi.fn(async () => okItems([mem(), mem({ id: 32, title: '记忆乙' })]))
    const del = vi.fn(async () => ({ ok: true as const, data: { ok: true } }))
    const mod = await loadStore(apiStub(memApi({ listByScope: list, delete: del })))

    mod.useAiMemoryStore.getState().load()
    await flush()
    mod.useAiMemoryStore.getState().remove(31)
    await flush()

    expect(del).toHaveBeenCalledWith({ id: 31 })
    expect(mod.useAiMemoryStore.getState().panels.global?.items.map((m) => m.id)).toEqual([32])
    expect(list, '成功零重派').toHaveBeenCalledTimes(1)
  })

  it('remove NOT_FOUND→行消失+刷新；INVALID_REQUEST→rowErrors[id] 行内错误', async () => {
    // NOT_FOUND 轴
    let call = 0
    const listN = vi.fn(async () => {
      call += 1
      return call === 1 ? okItems([mem()]) : okItems([])
    })
    const delN = vi.fn(async () => ({ ok: false as const, error: { code: 'NOT_FOUND', message: '行不存在' } }))
    const modN = await loadStore(apiStub(memApi({ listByScope: listN, delete: delN })))
    modN.useAiMemoryStore.getState().load()
    await flush()
    modN.useAiMemoryStore.getState().remove(31)
    await flush()
    expect(modN.useAiMemoryStore.getState().panels.global?.items).toEqual([])
    expect(listN, 'NOT_FOUND 触发刷新').toHaveBeenCalledTimes(2)

    // INVALID_REQUEST 轴
    const listI = vi.fn(async () => okItems([mem()]))
    const delI = vi.fn(async () => ({ ok: false as const, error: { code: 'INVALID_REQUEST', message: '拒' } }))
    const modI = await loadStore(apiStub(memApi({ listByScope: listI, delete: delI })))
    modI.useAiMemoryStore.getState().load()
    await flush()
    modI.useAiMemoryStore.getState().remove(31)
    await flush()
    expect(modI.useAiMemoryStore.getState().rowErrors[31]).toBe('请求无效，请重试')
    expect(modI.useAiMemoryStore.getState().panels.global?.items, '行保留').toEqual([mem()])
  })

  it('CRUD 回包晚到（unload 后）：不复活/零刷新/零行内错误（seq 守卫）', async () => {
    const list = vi.fn(async () => okItems([mem()]))
    type PinResult = { ok: true; data: { item: AiMemoryListItem } }
    const d = deferred<PinResult>()
    const pin = vi.fn(() => d.promise)
    const mod = await loadStore(apiStub(memApi({ listByScope: list, setPinned: pin })))

    mod.useAiMemoryStore.getState().load()
    await flush()
    mod.useAiMemoryStore.getState().setPinned(31, true)
    mod.useAiMemoryStore.getState().unload()
    d.resolve({ ok: true, data: { item: mem({ pinned: true }) } })
    await flush()

    expect(mod.useAiMemoryStore.getState().panels.global, '晚到不复活').toBeUndefined()
    expect(list, '晚到零刷新').toHaveBeenCalledTimes(1)
    expect(mod.useAiMemoryStore.getState().rowErrors[31]).toBeUndefined()
  })

  it('过滤重派后 CRUD 回包失格：不触发刷新（旧回包不改写新链——沿 W1c 先例）', async () => {
    const list = vi.fn(async () => okItems([mem()]))
    type DelResult = { ok: true; data: { ok: true } }
    const d = deferred<DelResult>()
    const del = vi.fn(() => d.promise)
    const mod = await loadStore(apiStub(memApi({ listByScope: list, delete: del })))

    mod.useAiMemoryStore.getState().load()
    await flush()
    mod.useAiMemoryStore.getState().remove(31)
    // 过滤变化触发重派（seq 递增——remove 回包失格）
    mod.useAiMemoryStore.getState().setCategory('task_outcome')
    await flush()
    expect(list).toHaveBeenCalledTimes(2)
    expect(mod.useAiMemoryStore.getState().panels.global?.items, '新链 ready').toEqual([mem()])

    d.resolve({ ok: true, data: { ok: true } })
    await flush()
    expect(mod.useAiMemoryStore.getState().panels.global?.items, '旧删除回包不落新链（行保留）').toEqual([mem()])
    expect(list, '晚到零刷新').toHaveBeenCalledTimes(2)
  })

  // ── [回炉轮 1] R1 收尾解耦四轴（d1-W1+k3-W3：收尾无条件、refresh 面守卫、
  //    卸载后失败收尾丢弃）+R2 在途防重+R4 startEdit 清 formError+R5 unload 清
  //    检索过滤态──────────────────────────────────────────────────────

  it('[R1a] 过滤变更×create 成功：draft 无条件复位（防残留重提重复行）+列表不刷新（可旧）', async () => {
    const list = vi.fn(async () => okItems([]))
    type CreateResult = { ok: true; data: { item: AiMemoryListItem } }
    const d = deferred<CreateResult>()
    const create = vi.fn(() => d.promise)
    const mod = await loadStore(apiStub(memApi({ listByScope: list, create })))

    mod.useAiMemoryStore.getState().load()
    await flush()
    mod.useAiMemoryStore.getState().setDraft({ title: '在途草稿' })
    mod.useAiMemoryStore.getState().create()
    // 过滤变更重派（seq 递增——create 回包对 refresh 面失格）
    mod.useAiMemoryStore.getState().setCategory('task_outcome')
    await flush()
    expect(list).toHaveBeenCalledTimes(2)

    d.resolve({ ok: true, data: { item: mem({ id: 99 }) } })
    await flush()
    expect(mod.useAiMemoryStore.getState().draft.title, '成功收尾无条件：draft 复位').toBe('')
    expect(mod.useAiMemoryStore.getState().creating, '在途标志复位').toBe(false)
    expect(list, 'refresh 面仍受 seq 守卫：零追加刷新').toHaveBeenCalledTimes(2)
    expect(mod.useAiMemoryStore.getState().panels.global?.status, '列表驻新链（可旧）').toBe('ready')
  })

  it('[R1b] 过滤变更×create 失败：formError 无条件落定+draft 保留（防静默不落）', async () => {
    const list = vi.fn(async () => okItems([]))
    type CreateErr = { ok: false; error: { code: string; message: string } }
    const d = deferred<CreateErr>()
    const create = vi.fn(() => d.promise)
    const mod = await loadStore(apiStub(memApi({ listByScope: list, create })))

    mod.useAiMemoryStore.getState().load()
    await flush()
    mod.useAiMemoryStore.getState().setDraft({ title: '失败保留草稿' })
    mod.useAiMemoryStore.getState().create()
    mod.useAiMemoryStore.getState().setCategory('task_outcome')
    await flush()

    d.resolve({ ok: false, error: { code: 'INVALID_REQUEST', message: '值域拒' } })
    await flush()
    expect(mod.useAiMemoryStore.getState().formError, '失败收尾不受 seq 守卫吞').toBe('请求无效，请重试')
    expect(mod.useAiMemoryStore.getState().draft.title, 'draft 保留').toBe('失败保留草稿')
    expect(mod.useAiMemoryStore.getState().creating).toBe(false)
    expect(list, '失败零刷新').toHaveBeenCalledTimes(2)
  })

  it('[R1c] 切档×update 成功：editing 无条件清（行已不在新档面——悬孤自愈）+旧档不复活', async () => {
    const list = vi.fn(async () => okItems([mem()]))
    type UpdateResult = { ok: true; data: { item: AiMemoryListItem } }
    const d = deferred<UpdateResult>()
    const update = vi.fn(() => d.promise)
    const mod = await loadStore(apiStub(memApi({ listByScope: list, update })))

    mod.useAiMemoryStore.getState().load()
    await flush()
    mod.useAiMemoryStore.getState().startEdit(mem())
    mod.useAiMemoryStore.getState().update()
    // 切档：旧 scope 条目删+seq 自增（update 回包对 refresh 面失格）
    mod.useAiMemoryStore.getState().setScope('paper')
    await flush()

    d.resolve({ ok: true, data: { item: mem({ title: '改后' }) } })
    await flush()
    expect(mod.useAiMemoryStore.getState().editing, '成功收尾无条件：editing 清').toBeNull()
    expect(mod.useAiMemoryStore.getState().updating).toBe(false)
    expect(mod.useAiMemoryStore.getState().panels.global, '旧档不复活').toBeUndefined()
    expect(list).toHaveBeenLastCalledWith({ scope: 'paper' })
  })

  it('[R1d] 卸载×create 失败：失败收尾丢弃（无呈现面——自裁申报）+在途标志复位', async () => {
    const list = vi.fn(async () => okItems([]))
    type CreateErr = { ok: false; error: { code: string; message: string } }
    const d = deferred<CreateErr>()
    const create = vi.fn(() => d.promise)
    const mod = await loadStore(apiStub(memApi({ listByScope: list, create })))

    mod.useAiMemoryStore.getState().load()
    await flush()
    mod.useAiMemoryStore.getState().create()
    mod.useAiMemoryStore.getState().unload()
    d.resolve({ ok: false, error: { code: 'INVALID_REQUEST', message: 'x' } })
    await flush()

    expect(mod.useAiMemoryStore.getState().formError, '卸载后无呈现面：失败收尾丢弃').toBeNull()
    expect(mod.useAiMemoryStore.getState().creating).toBe(false)
    expect(mod.useAiMemoryStore.getState().panels.global).toBeUndefined()
  })

  it('[R2a] create 在途防重：双击单发（creating 在场再派发即 no-op）', async () => {
    const list = vi.fn(async () => okItems([]))
    type CreateResult = { ok: true; data: { item: AiMemoryListItem } }
    const d = deferred<CreateResult>()
    const create = vi.fn(() => d.promise)
    const mod = await loadStore(apiStub(memApi({ listByScope: list, create })))

    mod.useAiMemoryStore.getState().load()
    await flush()
    mod.useAiMemoryStore.getState().setDraft({ title: '防重' })
    mod.useAiMemoryStore.getState().create()
    mod.useAiMemoryStore.getState().create()
    expect(create, '在途双击单发').toHaveBeenCalledTimes(1)
    expect(mod.useAiMemoryStore.getState().creating).toBe(true)

    d.resolve({ ok: true, data: { item: mem() } })
    await flush()
    expect(mod.useAiMemoryStore.getState().creating, '回包复位').toBe(false)
    mod.useAiMemoryStore.getState().create()
    expect(create, '复位后可再发').toHaveBeenCalledTimes(2)
  })

  it('[R2b] update 在途防重：双击单发（updating 在场再派发即 no-op）', async () => {
    const list = vi.fn(async () => okItems([mem()]))
    type UpdateResult = { ok: true; data: { item: AiMemoryListItem } }
    const d = deferred<UpdateResult>()
    const update = vi.fn(() => d.promise)
    const mod = await loadStore(apiStub(memApi({ listByScope: list, update })))

    mod.useAiMemoryStore.getState().load()
    await flush()
    mod.useAiMemoryStore.getState().startEdit(mem())
    mod.useAiMemoryStore.getState().update()
    mod.useAiMemoryStore.getState().update()
    expect(update, '在途双击单发').toHaveBeenCalledTimes(1)

    d.resolve({ ok: true, data: { item: mem() } })
    await flush()
    expect(mod.useAiMemoryStore.getState().updating).toBe(false)
  })

  it('[R4] startEdit 清 formError（新建面错误不残留到编辑面）', async () => {
    const list = vi.fn(async () => okItems([mem()]))
    const create = vi.fn(async () => ({ ok: false as const, error: { code: 'INVALID_REQUEST', message: 'x' } }))
    const mod = await loadStore(apiStub(memApi({ listByScope: list, create })))

    mod.useAiMemoryStore.getState().load()
    await flush()
    mod.useAiMemoryStore.getState().create()
    await flush()
    expect(mod.useAiMemoryStore.getState().formError).toBe('请求无效，请重试')

    mod.useAiMemoryStore.getState().startEdit(mem())
    expect(mod.useAiMemoryStore.getState().formError, 'startEdit 清 formError').toBeNull()
  })

  it('[R5] unload 清检索过滤态：query 复位空（防与组件 searchDraft 脱节）；重挂回落列表模式', async () => {
    const list = vi.fn(async () => okItems([]))
    const mod = await loadStore(apiStub(memApi({ listByScope: list })))

    mod.useAiMemoryStore.getState().setQuery('关键词')
    await flush()
    expect(list).toHaveBeenLastCalledWith({ scope: 'global', query: '关键词' })

    mod.useAiMemoryStore.getState().unload()
    expect(mod.useAiMemoryStore.getState().filters.query, 'unload 清检索态').toBe('')
    mod.useAiMemoryStore.getState().load()
    await flush()
    expect(list).toHaveBeenLastCalledWith({ scope: 'global' })
  })
})
