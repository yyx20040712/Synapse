import { describe, expect, it, vi } from 'vitest'
/** 动态导入件的类型面（lint 禁 import() 类型注解——type-only import 消解：
 *  编译期擦除零运行时模块缓存，运行时模块恒经 loadStore 动态取） */
import type { AiTasksStore } from '../../../src/renderer/features/ai/aiTasksStore'
import type { AiTask, AiAuditRow } from '../../../src/shared/models/ai-domain'

/** toast 面模块级 mock（store 静态依赖——D5 卡面取消失败反馈通道；resetModules
 *  后每用例模块图内工厂重跑，断言前经 loadStore 重取当次实例） */
vi.mock('../../../src/renderer/shared/ui/toast-store', () => ({ showToast: vi.fn() }))

/**
 * [F-DBCAMP-01 DB-2 UI U4] aiTasksStore —— 任务区+取消+审计抽屉态机
 * （always-active 裸 describe，K3——不经 guardedDescribe）。
 *
 * 覆盖（票面 D3/D5/D6 轴）：任务列表态机（loading→ready）/幂等护栏/竞态丢弃
 * （unload 后旧响应不复活+cancel 晚到不复活）/卸载清 key/取消错误码映射
 * （CONFLICT→toast；NOT_FOUND→刷新列表；INVALID_REQUEST/网络异常→通用 toast）/
 * 取消成功行替换/审计抽屉态机（loading→ready|empty|error）/afterSeq 分页
 * （append+exhausted+loadingMore 防重入）/closeAudit 清面+晚到失格。
 * 配方沿 ai-session-store.test：vi.resetModules+stubGlobal(window.api)。
 */

/** 任务种子形状（shared 投影字面——测试夹具；over 覆写制造多态行） */
function task(over: Partial<AiTask> = {}): AiTask {
  return {
    id: 21,
    scope: 'paper',
    anchorId: 'p-1',
    action: 'memory.create',
    status: 'queued',
    result: null,
    error: null,
    idempotencyKey: null,
    targetTitle: '文献甲',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...over
  }
}

/** 审计行种子形状（同上） */
function auditRow(seq: number, over: Partial<AiAuditRow> = {}): AiAuditRow {
  return {
    taskId: 21,
    seq,
    kind: 'mutated',
    detail: `第${seq}段`,
    createdAt: '2026-01-01T00:00:00Z',
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
  useAiTasksStore: { getState(): AiTasksStore }
  aiTasksKey(scope: 'paper' | 'lineage' | 'global', anchorId: string | null): string
  showToast: ReturnType<typeof vi.fn>
}

async function loadStore(api: unknown): Promise<StoreMod> {
  vi.resetModules()
  vi.stubGlobal('window', { api })
  const toast = await import('../../../src/renderer/shared/ui/toast-store')
  // vi.resetModules 不清 mock registry——工厂实例跨用例共享，逐用例清调用史
  // （断言只看本用例的 toast 调用）
  vi.mocked(toast.showToast).mockClear()
  const mod = (await import('../../../src/renderer/features/ai/aiTasksStore')) as unknown as {
    useAiTasksStore: { getState(): AiTasksStore }
    aiTasksKey: StoreMod['aiTasksKey']
  }
  return { ...mod, showToast: vi.mocked(toast.showToast) }
}

/** ok 回包形状（Result 直写——unwrap 真实现消费） */
function okTasks(rows: AiTask[]) {
  return { ok: true as const, data: { tasks: rows } }
}

function okTask(row: AiTask) {
  return { ok: true as const, data: { task: row } }
}

function okAudit(rows: AiAuditRow[]) {
  return { ok: true as const, data: { rows } }
}

describe('F-DBCAMP-01 U4 aiTasksStore —— 任务区/取消/审计抽屉', () => {
  it('态机：load 置 loading→list 成功→ready 落 tasks；req 形状=scope+anchorId（D7 显式锚）', async () => {
    const list = vi.fn(async () => okTasks([task()]))
    const mod = await loadStore({ ai_tasks: { list, cancel: vi.fn() }, ai_audit: { list: vi.fn() } })
    const key = mod.aiTasksKey('paper', 'p-1')
    expect(key).toBe('paper:p-1')

    mod.useAiTasksStore.getState().load('paper', 'p-1')
    expect(mod.useAiTasksStore.getState().panels[key]?.status, '派发即 loading').toBe('loading')
    await flush()

    const entry = mod.useAiTasksStore.getState().panels[key]
    expect(entry?.status, '成功→ready').toBe('ready')
    expect(entry?.tasks).toEqual([task()])
    expect(list).toHaveBeenCalledWith({ scope: 'paper', anchorId: 'p-1' })
  })

  it('global 档口径：key=global:global；list 传 {scope:global, anchorId:null}（服务层恒空合法形）', async () => {
    const list = vi.fn(async () => okTasks([]))
    const mod = await loadStore({ ai_tasks: { list, cancel: vi.fn() }, ai_audit: { list: vi.fn() } })
    expect(mod.aiTasksKey('global', null)).toBe('global:global')
    mod.useAiTasksStore.getState().load('global', null)
    await flush()
    expect(list).toHaveBeenCalledWith({ scope: 'global', anchorId: null })
    expect(mod.useAiTasksStore.getState().panels['global:global']?.status).toBe('ready')
  })

  it('幂等护栏：ready 在场再 load 不派发；error 态允许重派（重挂重试）', async () => {
    let call = 0
    const list = vi.fn(async () => {
      call += 1
      return call === 1 ? { ok: false as const, error: { code: 'INVALID_REQUEST', message: 'x' } } : okTasks([])
    })
    const mod = await loadStore({ ai_tasks: { list, cancel: vi.fn() }, ai_audit: { list: vi.fn() } })

    mod.useAiTasksStore.getState().load('paper', 'p-1')
    await flush()
    expect(mod.useAiTasksStore.getState().panels['paper:p-1']?.status, '错误→error').toBe('error')
    mod.useAiTasksStore.getState().load('paper', 'p-1')
    expect(list, 'error 态重派').toHaveBeenCalledTimes(2)
    await flush()
    mod.useAiTasksStore.getState().load('paper', 'p-1')
    expect(list, 'ready 幂等').toHaveBeenCalledTimes(2)
  })

  it('卸载清 key：unloadTasks 删条目；在途旧响应晚到不复活（seq 守卫）', async () => {
    type ListResult = ReturnType<typeof okTasks>
    const d = deferred<ListResult>()
    const list = vi.fn(() => d.promise)
    const mod = await loadStore({ ai_tasks: { list, cancel: vi.fn() }, ai_audit: { list: vi.fn() } })
    const key = mod.aiTasksKey('paper', 'p-1')

    mod.useAiTasksStore.getState().load('paper', 'p-1')
    mod.useAiTasksStore.getState().unloadTasks(key)
    expect(mod.useAiTasksStore.getState().panels[key], 'unload 即清').toBeUndefined()

    d.resolve(okTasks([task()]))
    await flush()
    expect(mod.useAiTasksStore.getState().panels[key], '晚到响应不复活已删条目').toBeUndefined()
  })

  it('取消成功：回包行原位替换（status→cancelled），其余行不动', async () => {
    const rows = [task({ id: 21, status: 'queued' }), task({ id: 22, action: 'memory.update', status: 'running' })]
    const list = vi.fn(async () => okTasks(rows))
    const cancelled = task({ id: 21, status: 'cancelled' })
    const cancel = vi.fn(async () => okTask(cancelled))
    const mod = await loadStore({ ai_tasks: { list, cancel }, ai_audit: { list: vi.fn() } })
    const key = mod.aiTasksKey('paper', 'p-1')

    mod.useAiTasksStore.getState().load('paper', 'p-1')
    await flush()
    mod.useAiTasksStore.getState().cancelTask(21, 'paper', 'p-1')
    await flush()

    const entry = mod.useAiTasksStore.getState().panels[key]
    expect(entry?.tasks[0], '取消行原位替换').toEqual(cancelled)
    expect(entry?.tasks[1]?.status, '其余行不动').toBe('running')
    expect(mod.showToast).not.toHaveBeenCalled()
  })

  it('取消 CONFLICT→toast「仅排队中的任务可取消」；列表不动（D5）', async () => {
    const list = vi.fn(async () => okTasks([task()]))
    const cancel = vi.fn(async () => ({ ok: false as const, error: { code: 'CONFLICT', message: '任务不在可取消状态' } }))
    const mod = await loadStore({ ai_tasks: { list, cancel }, ai_audit: { list: vi.fn() } })
    const key = mod.aiTasksKey('paper', 'p-1')

    mod.useAiTasksStore.getState().load('paper', 'p-1')
    await flush()
    mod.useAiTasksStore.getState().cancelTask(21, 'paper', 'p-1')
    await flush()

    expect(mod.showToast).toHaveBeenCalledWith('仅排队中的任务可取消', 'error')
    expect(mod.useAiTasksStore.getState().panels[key]?.tasks[0]?.status, '列表不动').toBe('queued')
  })

  it('取消 NOT_FOUND→刷新列表（重派 list 拉新事实——D5）', async () => {
    let listCall = 0
    const list = vi.fn(async () => {
      listCall += 1
      return listCall === 1 ? okTasks([task()]) : okTasks([])
    })
    const cancel = vi.fn(async () => ({ ok: false as const, error: { code: 'NOT_FOUND', message: '任务不存在' } }))
    const mod = await loadStore({ ai_tasks: { list, cancel }, ai_audit: { list: vi.fn() } })
    const key = mod.aiTasksKey('paper', 'p-1')

    mod.useAiTasksStore.getState().load('paper', 'p-1')
    await flush()
    expect(list).toHaveBeenCalledTimes(1)
    mod.useAiTasksStore.getState().cancelTask(21, 'paper', 'p-1')
    await flush()

    expect(list, 'NOT_FOUND 触发重派').toHaveBeenCalledTimes(2)
    expect(mod.useAiTasksStore.getState().panels[key]?.tasks, '新事实落地').toEqual([])
    expect(mod.showToast).not.toHaveBeenCalled()
  })

  it('取消 INVALID_REQUEST/网络异常→toast 通用错误「请求无效，请重试」（D5/N-1）', async () => {
    // 工厂惰性创建 rejected promise（数组直写会在消费前触发 unhandled rejection）
    const cases = [
      () => ({ ok: false as const, error: { code: 'INVALID_REQUEST', message: '矩阵拒' } }),
      () => Promise.reject(new Error('net down'))
    ]
    for (const makeResp of cases) {
      const list = vi.fn(async () => okTasks([task()]))
      const cancel = vi.fn(() => Promise.resolve(makeResp()))
      const mod = await loadStore({ ai_tasks: { list, cancel }, ai_audit: { list: vi.fn() } })
      mod.useAiTasksStore.getState().load('paper', 'p-1')
      await flush()
      mod.useAiTasksStore.getState().cancelTask(21, 'paper', 'p-1')
      await flush()
      expect(mod.showToast).toHaveBeenCalledWith('请求无效，请重试', 'error')
      mod.showToast.mockClear()
    }
  })

  it('取消回包晚到（unload 后）不复活已删条目', async () => {
    type CancelResult = ReturnType<typeof okTask>
    const list = vi.fn(async () => okTasks([task()]))
    const d = deferred<CancelResult>()
    const cancel = vi.fn(() => d.promise)
    const mod = await loadStore({ ai_tasks: { list, cancel }, ai_audit: { list: vi.fn() } })
    const key = mod.aiTasksKey('paper', 'p-1')

    mod.useAiTasksStore.getState().load('paper', 'p-1')
    await flush()
    mod.useAiTasksStore.getState().cancelTask(21, 'paper', 'p-1')
    mod.useAiTasksStore.getState().unloadTasks(key)
    d.resolve(okTask(task({ status: 'cancelled' })))
    await flush()
    expect(mod.useAiTasksStore.getState().panels[key], 'cancel 晚到不复活').toBeUndefined()
  })

  it('取消回包晚到（unload 后重挂新链）不得改写新条目任务行（seq 守卫独立红路径）', async () => {
    type CancelResult = ReturnType<typeof okTask>
    const list = vi.fn(async () => {
      // 重挂后新链回包同 id 行（queued 态）——与旧 cancel 回包的 cancelled 态可分辨
      return okTasks([task({ id: 21, status: 'queued' })])
    })
    const d = deferred<CancelResult>()
    const cancel = vi.fn(() => d.promise)
    const mod = await loadStore({ ai_tasks: { list, cancel }, ai_audit: { list: vi.fn() } })
    const key = mod.aiTasksKey('paper', 'p-1')

    mod.useAiTasksStore.getState().load('paper', 'p-1')
    await flush()
    // 首链在途取消→卸载→重挂（新链落地）→旧回包晚到
    mod.useAiTasksStore.getState().cancelTask(21, 'paper', 'p-1')
    mod.useAiTasksStore.getState().unloadTasks(key)
    mod.useAiTasksStore.getState().load('paper', 'p-1')
    await flush()
    expect(mod.useAiTasksStore.getState().panels[key]?.status, '重挂新链=ready').toBe('ready')

    d.resolve(okTask(task({ id: 21, status: 'cancelled' })))
    await flush()
    expect(mod.useAiTasksStore.getState().panels[key]?.tasks[0]?.status, '旧回包不改写新链行').toBe('queued')
  })

  it('审计态机：openAudit 置 activeAudit+loading→ready 落 rows；req={taskId,limit:100}（D6 首载）', async () => {
    const aList = vi.fn(async () => okAudit([auditRow(0), auditRow(1)]))
    const mod = await loadStore({ ai_tasks: { list: vi.fn(), cancel: vi.fn() }, ai_audit: { list: aList } })

    mod.useAiTasksStore.getState().openAudit(21)
    expect(mod.useAiTasksStore.getState().activeAudit).toBe(21)
    expect(mod.useAiTasksStore.getState().audits[21]?.status, '派发即 loading').toBe('loading')
    await flush()

    const entry = mod.useAiTasksStore.getState().audits[21]
    expect(entry?.status).toBe('ready')
    expect(entry?.rows).toHaveLength(2)
    expect(entry?.exhausted, '回包<100→已到末页（「加载更多」隐藏）').toBe(true)
    expect(aList).toHaveBeenCalledWith({ taskId: 21, limit: 100 })
  })

  it('审计空态：rows 空→empty（「暂无审计记录」态）', async () => {
    const aList = vi.fn(async () => okAudit([]))
    const mod = await loadStore({ ai_tasks: { list: vi.fn(), cancel: vi.fn() }, ai_audit: { list: aList } })

    mod.useAiTasksStore.getState().openAudit(21)
    await flush()
    expect(mod.useAiTasksStore.getState().audits[21]?.status).toBe('empty')
  })

  it('审计错误映射：任意错→error 态且可重派', async () => {
    let call = 0
    const aList = vi.fn(async () => {
      call += 1
      return call === 1 ? { ok: false as const, error: { code: 'INVALID_REQUEST', message: 'x' } } : okAudit([auditRow(0)])
    })
    const mod = await loadStore({ ai_tasks: { list: vi.fn(), cancel: vi.fn() }, ai_audit: { list: aList } })

    mod.useAiTasksStore.getState().openAudit(21)
    await flush()
    expect(mod.useAiTasksStore.getState().audits[21]?.status).toBe('error')
    mod.useAiTasksStore.getState().openAudit(21)
    await flush()
    expect(mod.useAiTasksStore.getState().audits[21]?.status, 'error 态重开可重试').toBe('ready')
    expect(aList).toHaveBeenCalledTimes(2)
  })

  it('审计分页：loadMore 以 afterSeq=末行 seq 追加；次页<100→exhausted；在途防重入', async () => {
    let call = 0
    const aList = vi.fn(async () => {
      call += 1
      // 首载满页 100 行（exhausted=false——翻页口在场）；次页 1 行（<100→尽）
      return call === 1 ? okAudit(Array.from({ length: 100 }, (_, i) => auditRow(i))) : okAudit([auditRow(100)])
    })
    const mod = await loadStore({ ai_tasks: { list: vi.fn(), cancel: vi.fn() }, ai_audit: { list: aList } })

    mod.useAiTasksStore.getState().openAudit(21)
    await flush()
    expect(mod.useAiTasksStore.getState().audits[21]?.exhausted, '首载满页=未尽').toBe(false)
    mod.useAiTasksStore.getState().loadMoreAudit(21)
    mod.useAiTasksStore.getState().loadMoreAudit(21)
    await flush()

    expect(aList).toHaveBeenNthCalledWith(2, { taskId: 21, afterSeq: 99, limit: 100 })
    expect(aList, 'loadingMore 在途防重入').toHaveBeenCalledTimes(2)
    const entry = mod.useAiTasksStore.getState().audits[21]
    expect(entry?.rows, '追加后 101 行').toHaveLength(101)
    expect(entry?.rows[100]?.seq).toBe(100)
    expect(entry?.exhausted, '次页<100→尽').toBe(true)
  })

  it('closeAudit：清 activeAudit+条目；在途审计响应晚到不复活（切换任务同清旧面）', async () => {
    type AuditResult = ReturnType<typeof okAudit>
    const d1 = deferred<AuditResult>()
    let call = 0
    const aList = vi.fn((): Promise<AuditResult> => {
      call += 1
      return call === 1 ? d1.promise : Promise.resolve(okAudit([auditRow(9)]))
    })
    const mod = await loadStore({ ai_tasks: { list: vi.fn(), cancel: vi.fn() }, ai_audit: { list: aList } })

    mod.useAiTasksStore.getState().openAudit(21)
    mod.useAiTasksStore.getState().closeAudit()
    expect(mod.useAiTasksStore.getState().activeAudit).toBeNull()
    expect(mod.useAiTasksStore.getState().audits[21], 'close 即清').toBeUndefined()

    d1.resolve(okAudit([auditRow(0)]))
    await flush()
    expect(mod.useAiTasksStore.getState().audits[21], '晚到不复活').toBeUndefined()

    // 切换任务：开 22 再开 23——22 的条目随切换清理（单抽屉不累积）
    mod.useAiTasksStore.getState().openAudit(22)
    await flush()
    expect(mod.useAiTasksStore.getState().audits[22]?.status).toBe('ready')
    mod.useAiTasksStore.getState().openAudit(23)
    await flush()
    expect(mod.useAiTasksStore.getState().audits[22], '切换即清旧任务面').toBeUndefined()
    expect(mod.useAiTasksStore.getState().audits[23]?.status).toBe('ready')
    expect(mod.useAiTasksStore.getState().activeAudit).toBe(23)
  })

  // ── [R1 回炉 W1] 补红证五条（错误晚到/翻页失败/翻页晚到失格/切换清旧在途/
  //    loading 双抑制——门一 k3-W3+d1-W4 双席）─────────────────────────────

  it('[W1a] cancel 错误回包晚到（unload 后）：无 toast/无重派 list/条目不复活（CONFLICT/NOT_FOUND 双码）', async () => {
    // [R2-k3-N1] 双码参数化：NOT_FOUND 是唯一能经 fetchTasks 复活面板的错误码
    // （CONFLICT 走 toast——重派/复活两断言在其路径恒真；NOT_FOUND 侧才是
    // 「无重派+不复活」的实锁面）
    for (const code of ['CONFLICT', 'NOT_FOUND'] as const) {
      let listCall = 0
      const list = vi.fn(async () => {
        listCall += 1
        return okTasks([task()])
      })
      type CancelErr = { ok: false; error: { code: string; message: string } }
      const d = deferred<CancelErr>()
      const cancel = vi.fn(() => d.promise)
      const mod = await loadStore({ ai_tasks: { list, cancel }, ai_audit: { list: vi.fn() } })
      const key = mod.aiTasksKey('paper', 'p-1')

      mod.useAiTasksStore.getState().load('paper', 'p-1')
      await flush()
      const listCallsBefore = listCall
      mod.useAiTasksStore.getState().cancelTask(21, 'paper', 'p-1')
      mod.useAiTasksStore.getState().unloadTasks(key)
      // 晚到错误回包（双码）：seq 已失格——不得 toast、不得重派 list、不复活
      d.resolve({ ok: false, error: { code, message: '晚到' } })
      await flush()
      expect(mod.showToast, `${code} 无 toast`).not.toHaveBeenCalled()
      expect(list, `${code} 无重派`).toHaveBeenCalledTimes(listCallsBefore)
      expect(mod.useAiTasksStore.getState().panels[key], `${code} 不复活`).toBeUndefined()
    }
  })

  it('[W1b] loadMore 失败（reject）：loadingMore 复位+已载 rows 不变+可再翻页', async () => {
    let call = 0
    let failNext = false
    const aList = vi.fn((): Promise<unknown> => {
      call += 1
      if (call === 1) return Promise.resolve(okAudit(Array.from({ length: 100 }, (_, i) => auditRow(i))))
      if (failNext) return Promise.reject(new Error('net down'))
      return Promise.resolve(okAudit([auditRow(100)]))
    })
    const mod = await loadStore({ ai_tasks: { list: vi.fn(), cancel: vi.fn() }, ai_audit: { list: aList } })

    mod.useAiTasksStore.getState().openAudit(21)
    await flush()
    failNext = true
    mod.useAiTasksStore.getState().loadMoreAudit(21)
    await flush()
    const entry = mod.useAiTasksStore.getState().audits[21]
    expect(entry?.loadingMore, '失败复位在途标志').toBe(false)
    expect(entry?.rows, '已载行不灭').toHaveLength(100)
    expect(entry?.exhausted, '失败不置尽').toBe(false)

    // 复位后可再翻页（不因失败卡死）
    failNext = false
    mod.useAiTasksStore.getState().loadMoreAudit(21)
    await flush()
    expect(mod.useAiTasksStore.getState().audits[21]?.rows).toHaveLength(101)
  })

  it('[W1c] loadMore 在途→closeAudit→晚到响应失格（不复活条目）', async () => {
    type AuditResult = ReturnType<typeof okAudit>
    const first = okAudit(Array.from({ length: 100 }, (_, i) => auditRow(i)))
    let call = 0
    const d2 = deferred<AuditResult>()
    const aList = vi.fn((): Promise<AuditResult> => {
      call += 1
      return call === 1 ? Promise.resolve(first) : d2.promise
    })
    const mod = await loadStore({ ai_tasks: { list: vi.fn(), cancel: vi.fn() }, ai_audit: { list: aList } })

    mod.useAiTasksStore.getState().openAudit(21)
    await flush()
    mod.useAiTasksStore.getState().loadMoreAudit(21)
    mod.useAiTasksStore.getState().closeAudit()
    expect(mod.useAiTasksStore.getState().audits[21], 'close 即清').toBeUndefined()

    d2.resolve(okAudit([auditRow(100)]))
    await flush()
    expect(mod.useAiTasksStore.getState().audits[21], '翻页晚到不复活').toBeUndefined()
    expect(mod.useAiTasksStore.getState().activeAudit).toBeNull()

    // 重开同任务（新首载满页落地）→旧翻页回包已丢——不得 append 污染新条目
    // （seq 守卫独立红路径：now===undefined 兜底盖不住的重开场景）
    type AuditResult2 = ReturnType<typeof okAudit>
    const dOld = deferred<AuditResult2>()
    let c2 = 0
    const aList2 = vi.fn((): Promise<AuditResult2> => {
      c2 += 1
      if (c2 === 2) return dOld.promise
      const base = c2 === 1 ? 0 : 1000
      return Promise.resolve(okAudit(Array.from({ length: 100 }, (_, i) => auditRow(base + i))))
    })
    const mod2 = await loadStore({ ai_tasks: { list: vi.fn(), cancel: vi.fn() }, ai_audit: { list: aList2 } })
    mod2.useAiTasksStore.getState().openAudit(21)
    await flush()
    mod2.useAiTasksStore.getState().loadMoreAudit(21)
    mod2.useAiTasksStore.getState().closeAudit()
    mod2.useAiTasksStore.getState().openAudit(21)
    await flush()
    expect(mod2.useAiTasksStore.getState().audits[21]?.rows).toHaveLength(100)
    expect(mod2.useAiTasksStore.getState().audits[21]?.rows[0]?.seq, '重开新首载').toBe(1000)
    dOld.resolve(okAudit([auditRow(999)]))
    await flush()
    expect(mod2.useAiTasksStore.getState().audits[21]?.rows, '旧翻页回包不 append 新条目').toHaveLength(100)
    expect(mod2.useAiTasksStore.getState().audits[21]?.rows[99]?.seq, '末行仍=新首载面').toBe(1099)
  })

  it('[W1d] openAudit 切换任务时旧任务首载在途→晚到不复活旧条目', async () => {
    type AuditResult = ReturnType<typeof okAudit>
    const dA = deferred<AuditResult>()
    let call = 0
    const aList = vi.fn((): Promise<AuditResult> => {
      call += 1
      return call === 1 ? dA.promise : Promise.resolve(okAudit([auditRow(5)]))
    })
    const mod = await loadStore({ ai_tasks: { list: vi.fn(), cancel: vi.fn() }, ai_audit: { list: aList } })

    mod.useAiTasksStore.getState().openAudit(21)
    mod.useAiTasksStore.getState().openAudit(22)
    expect(mod.useAiTasksStore.getState().audits[21], '切换即清旧任务面（首载在途）').toBeUndefined()
    expect(mod.useAiTasksStore.getState().activeAudit).toBe(22)

    dA.resolve(okAudit([auditRow(0)]))
    await flush()
    expect(mod.useAiTasksStore.getState().audits[21], '旧首载晚到不复活').toBeUndefined()
    expect(mod.useAiTasksStore.getState().audits[22]?.status, '新任务面不受污染').toBe('ready')
  })

  it('[W1e] loading 在途双抑制：list 再 load 不重派；openAudit 重开不重派', async () => {
    type ListResult = ReturnType<typeof okTasks>
    type AuditResult = ReturnType<typeof okAudit>
    const dl = deferred<ListResult>()
    const list = vi.fn(() => dl.promise)
    const da = deferred<AuditResult>()
    const aList = vi.fn(() => da.promise)
    const mod = await loadStore({ ai_tasks: { list, cancel: vi.fn() }, ai_audit: { list: aList } })

    mod.useAiTasksStore.getState().load('paper', 'p-1')
    mod.useAiTasksStore.getState().load('paper', 'p-1')
    expect(list, 'list 在途再 load 抑制').toHaveBeenCalledTimes(1)
    expect(mod.useAiTasksStore.getState().panels['paper:p-1']?.status).toBe('loading')

    mod.useAiTasksStore.getState().openAudit(21)
    mod.useAiTasksStore.getState().openAudit(21)
    expect(aList, 'openAudit 在途重开抑制').toHaveBeenCalledTimes(1)
    expect(mod.useAiTasksStore.getState().audits[21]?.status).toBe('loading')
    expect(mod.useAiTasksStore.getState().activeAudit).toBe(21)
  })
})
