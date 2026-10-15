/**
 * [F-UIRES-04 批 3a] PaperImageExtractor —— M2 图片提取机单测（always-active
 * 裸 describe，K3——不经 guardedDescribe）。
 *
 * 覆盖=设计书 §4.11-M2 I1-I8 逐格：注册表命中复用/自建毕 destroy（I1）、
 * 切换分策零泄漏（I2）、partial（I3）、全失败 error（I4）、LRU 淘汰仅完成态
 * （I5）、in-flight×LRU 已逐不入 cache（I6）、UNMOUNT 两策+stale 查证（I7）、
 * error 维持+独立重试/ready 幂等（I8）。
 *
 * 通道=注册表/句柄 mock（vi.doMock pdfjs-dist——getDocument/GlobalWorkerOptions
 * 桩；jsdom 无真 pdfjs 渲染——renderPage 经 deps 注入桩，真 PDF 提取面不属
 * 本批）。每用例 vi.resetModules+doMock 重载=模块级注册表/缓存隔离。
 */
import { describe, expect, it, vi } from 'vitest'

interface Deferred<T> {
  promise: Promise<T>
  resolve(v: T): void
  reject(e: unknown): void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

/** 微任务排空（加载→逐页 getPage/render→落缓存多跳——24 tick 富余） */
async function flush(ticks = 24): Promise<void> {
  for (let i = 0; i < ticks; i += 1) {
    await Promise.resolve()
  }
}

/** 页桩（携带页序——renderPage 桩产出可断言帧名） */
function makePage(n: number): { idx: number; getViewport(): { width: number; height: number }; render(): { promise: Promise<void> } } {
  return { idx: n, getViewport: () => ({ width: 100, height: 200 }), render: () => ({ promise: Promise.resolve() }) }
}

interface DocStub {
  numPages: number
  getPage(n: number): Promise<ReturnType<typeof makePage>>
  destroy(): Promise<void>
}

/** 文档桩：defs[i]=true 成功页/false 失败页；destroy spy 可断言 */
function makeDoc(defs: boolean[], gate?: Deferred<void>): { doc: DocStub; getPage: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> } {
  const destroy = vi.fn(async () => undefined)
  const getPage = vi.fn(async (n: number): Promise<ReturnType<typeof makePage>> => {
    if (gate !== undefined) await gate.promise
    if (!defs[n - 1]) throw new Error(`page ${n} 提取失败`)
    return makePage(n)
  })
  return { doc: { numPages: defs.length, getPage, destroy }, getPage, destroy }
}

interface TaskStub {
  promise: Promise<DocStub>
  destroy(): Promise<void>
}

interface Mod {
  registerPaperDoc(pId: string, doc: DocStub): void
  unregisterPaperDoc(pId: string, doc: DocStub): void
  paperIdFromFileUrl(url: string): string
  getPaperImages(pId: string): { status: string; images: string[]; failedPages: number; stale?: boolean } | undefined
  selectPaperImages(pId: string, fileUrl: string, deps?: { renderPage(p: { idx: number }): Promise<string> }): void
  retryPaperImages(pId: string, fileUrl: string, deps?: { renderPage(p: { idx: number }): Promise<string> }): void
  unmountPaperImages(): void
}

/** 每用例重载模块图+pdfjs-dist 桩（getDocument/GlobalWorkerOptions 可控） */
async function load(): Promise<{ mod: Mod; getDocument: ReturnType<typeof vi.fn>; gwo: { workerSrc?: string } }> {
  vi.resetModules()
  const getDocument = vi.fn()
  const gwo: { workerSrc?: string } = {}
  // window 桩：经 paperInfoStore 传递引入的 api/client 模块加载期读 window.api
  vi.stubGlobal('window', { api: {} })
  vi.doMock('pdfjs-dist', () => ({ getDocument, GlobalWorkerOptions: gwo }))
  vi.doMock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: 'worker-stub-url' }))
  const mod = (await import('../../../src/renderer/shared/PaperImageExtractor')) as unknown as Mod
  return { mod, getDocument, gwo }
}

/** renderPage 桩：产出 p<页序> 帧名 */
const renderStub = async (p: { idx: number }): Promise<string> => `f${p.idx}`

function loadedTask(doc: DocStub): { task: TaskStub; destroy: ReturnType<typeof vi.fn> } {
  const destroy = vi.fn(async () => undefined)
  return { task: { promise: Promise.resolve(doc), destroy }, destroy }
}

describe('F-UIRES-04 批 3a PaperImageExtractor —— M2 状态机 I1-I8', () => {
  it('I1 注册表命中复用零双载/miss 自建毕 destroy（仅自建——零悬挂）；worker 模块级自置', async () => {
    const { mod, getDocument, gwo } = await load()
    expect(gwo.workerSrc).toBe('worker-stub-url')
    expect(mod.paperIdFromFileUrl('app-file://xyz')).toBe('xyz')
    // [回炉 D·k1-W4] 非受管协议 URL fail-fast（前缀守卫 throw——禁静默错键）
    expect(() => mod.paperIdFromFileUrl('https://evil.example/x')).toThrow('非受管协议 URL')
    const d = deferred<DocStub>()
    const taskDestroy = vi.fn(async () => undefined)
    getDocument.mockReturnValueOnce({ promise: d.promise, destroy: taskDestroy })
    mod.selectPaperImages('A', 'app-file://A', { renderPage: renderStub })
    expect(getDocument).toHaveBeenCalledTimes(1)
    expect(mod.getPaperImages('A')?.status).toBe('extracting')
    const self = makeDoc([true, true])
    d.resolve(self.doc)
    await flush()
    expect(mod.getPaperImages('A')).toMatchObject({ status: 'ready', images: ['f1', 'f2'] })
    expect(self.destroy).toHaveBeenCalledTimes(1)
    const reg = makeDoc([true])
    mod.registerPaperDoc('B', reg.doc)
    mod.selectPaperImages('B', 'app-file://B', { renderPage: renderStub })
    await flush()
    expect(mod.getPaperImages('B')?.status).toBe('ready')
    expect(getDocument).toHaveBeenCalledTimes(1)
    expect(reg.destroy).not.toHaveBeenCalled()
  })

  it('I2 切换零泄漏：extracting(A 自建)→SELECT(B)=A 销毁标 error(stale)、B 独立完成', async () => {
    const { mod, getDocument } = await load()
    const dA = deferred<DocStub>()
    const taskDestroy = vi.fn(async () => undefined)
    getDocument.mockReturnValueOnce({ promise: dA.promise, destroy: taskDestroy })
    mod.selectPaperImages('A', 'app-file://A', { renderPage: renderStub })
    const reg = makeDoc([true])
    mod.registerPaperDoc('B', reg.doc)
    mod.selectPaperImages('B', 'app-file://B', { renderPage: renderStub })
    expect(mod.getPaperImages('A')).toMatchObject({ status: 'error', stale: true })
    dA.resolve(makeDoc([true]).doc)
    await flush()
    expect(taskDestroy).toHaveBeenCalledTimes(1)
    expect(mod.getPaperImages('A')?.status).toBe('error')
    expect(mod.getPaperImages('B')?.status).toBe('ready')
  })

  it('I3 partial：部分页失败=成功帧+failedPages 徽注（失败不扩散）', async () => {
    const { mod, getDocument } = await load()
    const { task } = loadedTask(makeDoc([true, false, true]).doc)
    getDocument.mockReturnValueOnce(task)
    mod.selectPaperImages('A', 'app-file://A', { renderPage: renderStub })
    await flush()
    expect(mod.getPaperImages('A')).toMatchObject({ status: 'partial', images: ['f1', 'f3'], failedPages: 1 })
  })

  it('I4 全失败=error（strip 省略承载面——降级不挡主件）', async () => {
    const { mod, getDocument } = await load()
    const { task } = loadedTask(makeDoc([false, false]).doc)
    getDocument.mockReturnValueOnce(task)
    mod.selectPaperImages('A', 'app-file://A', { renderPage: renderStub })
    await flush()
    expect(mod.getPaperImages('A')).toMatchObject({ status: 'error', images: [] })
  })

  it('I5 LRU 超容：淘汰最旧完成态；extracting/当前选中永不作淘汰受害方', async () => {
    const { mod } = await load()
    for (let i = 1; i <= 20; i += 1) {
      mod.registerPaperDoc(`p${i}`, makeDoc([true]).doc)
      mod.selectPaperImages(`p${i}`, `app-file://p${i}`, { renderPage: renderStub })
      await flush()
      expect(mod.getPaperImages(`p${i}`)?.status).toBe('ready')
    }
    const gate = deferred<void>()
    mod.registerPaperDoc('p21', makeDoc([true], gate).doc)
    mod.selectPaperImages('p21', 'app-file://p21', { renderPage: renderStub })
    expect(mod.getPaperImages('p21')?.status).toBe('extracting')
    expect(mod.getPaperImages('p1')).toBeUndefined() // 超容即逐最旧完成态（受害方恒完成态）
    expect(mod.getPaperImages('p21')?.status).toBe('extracting') // extracting 不逐
    gate.resolve()
    await flush()
    expect(mod.getPaperImages('p21')).toMatchObject({ status: 'ready', images: ['f1'] })
    expect(mod.getPaperImages('p2')?.status).toBe('ready')
  })

  it('I6 in-flight×LRU：完成回调判定键在册——已逐→直接释放不入 cache（零泄漏）', async () => {
    const { mod, getDocument } = await load()
    const dA = deferred<DocStub>()
    const taskDestroy = vi.fn(async () => undefined)
    getDocument.mockReturnValueOnce({ promise: dA.promise, destroy: taskDestroy })
    mod.selectPaperImages('A', 'app-file://A', { renderPage: renderStub })
    mod.registerPaperDoc('B', makeDoc([true]).doc)
    mod.selectPaperImages('B', 'app-file://B', { renderPage: renderStub })
    await flush()
    for (let i = 1; i <= 19; i += 1) {
      mod.registerPaperDoc(`p${i}`, makeDoc([true]).doc)
      mod.selectPaperImages(`p${i}`, `app-file://p${i}`, { renderPage: renderStub })
      await flush()
    }
    expect(mod.getPaperImages('A')).toBeUndefined() // error(stale) 已被 LRU 逐出
    dA.resolve(makeDoc([true]).doc)
    await flush()
    expect(mod.getPaperImages('A')).toBeUndefined() // 已逐→不入 cache
    expect(taskDestroy).toHaveBeenCalledTimes(1) // 零泄漏（销毁终接）
  })

  it('I7 UNMOUNT 两策：自建→destroy+error(stale)；注册表借出→续跑+stale 查证后写缓存', async () => {
    const { mod, getDocument } = await load()
    // ①自建句柄
    const dA = deferred<DocStub>()
    const taskDestroy = vi.fn(async () => undefined)
    getDocument.mockReturnValueOnce({ promise: dA.promise, destroy: taskDestroy })
    mod.selectPaperImages('A', 'app-file://A', { renderPage: renderStub })
    mod.unmountPaperImages()
    expect(mod.getPaperImages('A')).toMatchObject({ status: 'error', stale: true })
    dA.resolve(makeDoc([true]).doc)
    await flush()
    expect(taskDestroy).toHaveBeenCalledTimes(1)
    expect(mod.getPaperImages('A')?.status).toBe('error')
    // ②注册表句柄：续跑完成；完成后查证注册表仍同 paperId 在册才写缓存
    const gate = deferred<void>()
    const reg = makeDoc([true], gate)
    mod.registerPaperDoc('B', reg.doc)
    mod.selectPaperImages('B', 'app-file://B', { renderPage: renderStub })
    mod.unmountPaperImages()
    expect(mod.getPaperImages('B')?.status).toBe('extracting')
    mod.unregisterPaperDoc('B', reg.doc)
    gate.resolve()
    await flush()
    expect(mod.getPaperImages('B')).toBeUndefined() // 注销竞态→结果弃置（stale 查证）
    expect(reg.destroy).not.toHaveBeenCalled() // 借出句柄禁销毁（INV-135）
  })

  it('I8 error→SELECT 维持（独立重试微钮）/ready→SELECT 幂等：均零迁移', async () => {
    const { mod, getDocument } = await load()
    getDocument.mockReturnValueOnce(loadedTask(makeDoc([false]).doc).task)
    mod.selectPaperImages('A', 'app-file://A', { renderPage: renderStub })
    await flush()
    expect(mod.getPaperImages('A')?.status).toBe('error')
    mod.selectPaperImages('A', 'app-file://A', { renderPage: renderStub })
    expect(mod.getPaperImages('A')?.status).toBe('error')
    expect(getDocument).toHaveBeenCalledTimes(1)
    getDocument.mockReturnValueOnce(loadedTask(makeDoc([true]).doc).task)
    mod.retryPaperImages('A', 'app-file://A', { renderPage: renderStub })
    await flush()
    expect(mod.getPaperImages('A')?.status).toBe('ready')
    expect(getDocument).toHaveBeenCalledTimes(2)
    mod.selectPaperImages('A', 'app-file://A', { renderPage: renderStub })
    expect(mod.getPaperImages('A')?.status).toBe('ready')
    expect(getDocument).toHaveBeenCalledTimes(2)
  })

  it('I9 [回炉 A1·k1-B1] task-pending 中切换→destroy 致 promise reject：stale 条目保持+task.destroy 恰 1 次', async () => {
    const { mod, getDocument } = await load()
    const dA = deferred<DocStub>()
    // task 桩：destroy 时 reject 加载 promise（模拟真实 loadingTask.destroy 中止在飞加载）
    const taskDestroy = vi.fn((): Promise<void> => {
      dA.reject(new Error('加载中止'))
      return Promise.resolve()
    })
    getDocument.mockReturnValueOnce({ promise: dA.promise, destroy: taskDestroy })
    mod.selectPaperImages('A', 'app-file://A', { renderPage: renderStub })
    const reg = makeDoc([true])
    mod.registerPaperDoc('B', reg.doc)
    mod.selectPaperImages('B', 'app-file://B', { renderPage: renderStub })
    expect(mod.getPaperImages('A')).toMatchObject({ status: 'error', stale: true })
    await flush()
    // reject 到达 catch：aborted 判据早退——不二次 destroy+不覆写无 stale 的 error
    expect(mod.getPaperImages('A')).toMatchObject({ status: 'error', stale: true })
    expect(taskDestroy).toHaveBeenCalledTimes(1)
  })

  it('I10 [回炉 A2·d1-W1] ready 落定后 finally 清理窗内切换：完成态不覆写 error(stale)', async () => {
    const { mod, getDocument } = await load()
    // 自建提取：doc.destroy 返回 pending gate——卡在 ready 已写、finally 未到的异步窗
    const gate = deferred<void>()
    const docA: DocStub = { numPages: 1, getPage: async () => makePage(1), destroy: () => gate.promise.then(() => undefined) }
    getDocument.mockReturnValueOnce({ promise: Promise.resolve(docA), destroy: vi.fn(async () => undefined) })
    mod.selectPaperImages('A', 'app-file://A', { renderPage: renderStub })
    await flush(12)
    expect(mod.getPaperImages('A')?.status).toBe('ready') // ready 已落（destroy 窗内）
    mod.registerPaperDoc('B', makeDoc([true]).doc)
    mod.selectPaperImages('B', 'app-file://B', { renderPage: renderStub })
    expect(mod.getPaperImages('A')?.status).toBe('ready') // 完成态守卫：不覆写 error(stale)
    gate.resolve()
    await flush()
    expect(mod.getPaperImages('A')?.status).toBe('ready') // 终态保持
  })

  it('I11 [回炉 B·d1-W2] 真失败入 catch→慢 destroy 挂起窗内切换：stale 保持（不抹为无 stale）', async () => {
    const { mod, getDocument } = await load()
    // task 桩：加载真失败（promise reject）+destroy 慢（pending gate——catch 的 await task.destroy() 挂起窗）
    const dA = deferred<DocStub>()
    dA.reject(new Error('加载失败'))
    const slowGate = deferred<void>()
    const taskDestroy = vi.fn((): Promise<void> => slowGate.promise.then(() => undefined))
    getDocument.mockReturnValueOnce({ promise: dA.promise, destroy: taskDestroy })
    mod.selectPaperImages('A', 'app-file://A', { renderPage: renderStub })
    await flush(8) // 进入 catch、挂起于 await task.destroy()
    mod.registerPaperDoc('B', makeDoc([true]).doc)
    mod.selectPaperImages('B', 'app-file://B', { renderPage: renderStub })
    expect(mod.getPaperImages('A')).toMatchObject({ status: 'error', stale: true }) // abortInFlight 同步写 stale
    slowGate.resolve()
    await flush()
    // destroy 复位后 markError 前 aborted 判据早退——stale 保持（无判据=被 markError(false) 抹掉）
    expect(mod.getPaperImages('A')).toMatchObject({ status: 'error', stale: true })
    expect(mod.getPaperImages('B')?.status).toBe('ready')
  })

  it('I12 [回炉 A·d1-W1] 完成后 LRU 逐出+UNMOUNT：completed 早退不复活 error(stale)（缓存驻留无关）', async () => {
    const { mod, getDocument } = await load()
    // A 自建提取：doc.destroy pending gate——卡在 ready 已写、finally 未到（I10 同型卡窗）
    const gate = deferred<void>()
    const docA: DocStub = { numPages: 1, getPage: async () => makePage(1), destroy: () => gate.promise.then(() => undefined) }
    getDocument.mockReturnValueOnce({ promise: Promise.resolve(docA), destroy: vi.fn(async () => undefined) })
    mod.selectPaperImages('A', 'app-file://A', { renderPage: renderStub })
    await flush(12)
    expect(mod.getPaperImages('A')?.status).toBe('ready')
    // 灌 21 篇完成（借出）——LRU 超容逐出 A（最旧完成态）
    for (let i = 1; i <= 21; i += 1) {
      mod.registerPaperDoc(`p${i}`, makeDoc([true]).doc)
      mod.selectPaperImages(`p${i}`, `app-file://p${i}`, { renderPage: renderStub })
      await flush()
    }
    expect(mod.getPaperImages('A')).toBeUndefined() // A 已被 LRU 逐出
    mod.unmountPaperImages()
    expect(mod.getPaperImages('A')).toBeUndefined() // completed 早退：不复活 error(stale)
    gate.resolve()
    await flush()
    expect(mod.getPaperImages('A')).toBeUndefined() // 终态保持（finally 收尾不回写）
  })
})
