/// <reference lib="dom.iterable" />
// @vitest-environment jsdom
/**
 * B2 §8：PDF document lease/LRU/尺寸缓存契约。pdfjs 与 worker 资产在模块级
 * 隔离；尺寸用例经真 PageColumn 首载/重挂验证命中路径零 getPage 增量。
 */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist'

const { getDocumentMock, workerOptions } = vi.hoisted(() => ({
  getDocumentMock: vi.fn(),
  workerOptions: { workerSrc: '' }
}))
vi.mock('pdfjs-dist', () => ({
  getDocument: getDocumentMock,
  GlobalWorkerOptions: workerOptions
}))
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: 'mock-worker-url' }))
vi.mock('../../../src/renderer/features/reader/view/PdfPageCanvas', () => ({
  PdfPageCanvas: () => null
}))

import { pdfDocumentCache, type PdfDocumentLease } from '../../../src/renderer/features/reader/state/pdf-document-cache'
import '../../../src/renderer/features/reader/state/PdfDocProvider'
import { PageColumn } from '../../../src/renderer/features/reader/view/PageColumn'

interface TaskFixture {
  task: PDFDocumentLoadingTask
  doc: PDFDocumentProxy
  getPage: ReturnType<typeof vi.fn>
  destroy: ReturnType<typeof vi.fn>
  resolve(): void
  reject(reason: unknown): void
}

function makeTask(numPages = 2): TaskFixture {
  let resolveTask!: (doc: PDFDocumentProxy) => void
  let rejectTask!: (reason: unknown) => void
  const promise = new Promise<PDFDocumentProxy>((resolve, reject) => {
    resolveTask = resolve
    rejectTask = reject
  })
  const getPage = vi.fn(async (no: number) => ({
    view: [0, 0, no === 1 ? 300 : 500, no === 1 ? 400 : 600],
    rotate: 0
  }))
  const doc = { numPages, getPage } as unknown as PDFDocumentProxy
  const destroy = vi.fn(async () => undefined)
  const task = { promise, destroy } as unknown as PDFDocumentLoadingTask
  return {
    task,
    doc,
    getPage,
    destroy,
    resolve: () => resolveTask(doc),
    reject: (reason) => rejectTask(reason)
  }
}

function queue(fixture: TaskFixture): void {
  getDocumentMock.mockImplementationOnce(() => fixture.task)
}

async function ready(url: string, fixture: TaskFixture): Promise<PdfDocumentLease> {
  queue(fixture)
  const lease = pdfDocumentCache.acquire(url)
  fixture.resolve()
  expect(await lease.promise).toBe(fixture.doc)
  return lease
}

let root: Root | null = null
let host: HTMLDivElement | null = null

async function mountColumn(doc: PDFDocumentProxy, onReady: (width: number) => void): Promise<void> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(createElement(PageColumn, {
      doc,
      totalPages: 2,
      zoom: 1,
      renderPage: (no) => createElement('span', { 'data-rendered-page': no }),
      onPageRender: () => undefined,
      onError: () => undefined,
      onReady
    }))
  })
}

class IntersectionObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

beforeEach(() => {
  getDocumentMock.mockReset()
  getDocumentMock.mockImplementation(() => { throw new Error('未登记 loadingTask 桩') })
  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  vi.stubGlobal('IntersectionObserver', IntersectionObserverStub)
})

afterEach(() => {
  act(() => root?.unmount())
  root = null
  host?.remove()
  host = null
  vi.unstubAllGlobals()
})

describe('B2 PDF document cache（§8 八例 + 回炉两例）', () => {
  it('1 同 key 单飞：并发 lease 共享在途任务与同一 doc', async () => {
    const fixture = makeTask()
    queue(fixture)
    const leases = [
      pdfDocumentCache.acquire('app-file://single-flight'),
      pdfDocumentCache.acquire('app-file://single-flight'),
      pdfDocumentCache.acquire('app-file://single-flight')
    ]
    expect(getDocumentMock).toHaveBeenCalledTimes(1)
    fixture.resolve()
    const docs = await Promise.all(leases.map((lease) => lease.promise))
    expect(docs).toEqual([fixture.doc, fixture.doc, fixture.doc])
    expect(docs[0]).toBe(docs[1])
    leases.forEach((lease) => lease.release())
  })

  it('2 A→B→A 不重取，且 A 命中刷新 lastUsed', async () => {
    const a = makeTask()
    const b = makeTask()
    const c = makeTask()
    ;(await ready('app-file://aba-a', a)).release()
    ;(await ready('app-file://aba-b', b)).release()
    const secondA = pdfDocumentCache.acquire('app-file://aba-a')
    expect(await secondA.promise).toBe(a.doc)
    secondA.release()
    expect(getDocumentMock).toHaveBeenCalledTimes(2)
    ;(await ready('app-file://aba-c', c)).release()
    expect(b.destroy, 'A 最近复用后最旧条目应是 B').toHaveBeenCalledTimes(1)
    expect(a.destroy).not.toHaveBeenCalled()
  })

  it('3 两份 LRU：第三 url 驱逐 refs=0 且 lastUsed 最旧者', async () => {
    const a = makeTask()
    const b = makeTask()
    const c = makeTask()
    ;(await ready('app-file://lru-a', a)).release()
    ;(await ready('app-file://lru-b', b)).release()
    ;(await ready('app-file://lru-c', c)).release()
    expect(a.destroy).toHaveBeenCalledTimes(1)
    expect(b.destroy).not.toHaveBeenCalled()
    expect(c.destroy).not.toHaveBeenCalled()
  })

  it('4 活动 lease 不驱逐：A/B 均活动时 C 可短暂外溢且零 destroy', async () => {
    const a = makeTask()
    const b = makeTask()
    const c = makeTask()
    const leaseA = await ready('app-file://active-a', a)
    const leaseB = await ready('app-file://active-b', b)
    const leaseC = await ready('app-file://active-c', c)
    expect(a.destroy).not.toHaveBeenCalled()
    expect(b.destroy).not.toHaveBeenCalled()
    expect(c.destroy).not.toHaveBeenCalled()
    leaseA.release()
    leaseB.release()
    leaseC.release()
  })

  it('5 加载失败：destroy 恰一次、失败传播全部等待者、下轮新建任务', async () => {
    const failed = makeTask()
    queue(failed)
    const first = pdfDocumentCache.acquire('app-file://failed')
    const second = pdfDocumentCache.acquire('app-file://failed')
    const firstFailure = expect(first.promise).rejects.toThrow('损坏')
    const secondFailure = expect(second.promise).rejects.toThrow('损坏')
    failed.reject(new Error('损坏'))
    await Promise.all([firstFailure, secondFailure])
    expect(failed.destroy).toHaveBeenCalledTimes(1)
    first.release()
    second.release()
    const retry = makeTask()
    const retryLease = await ready('app-file://failed', retry)
    retryLease.release()
    expect(getDocumentMock).toHaveBeenCalledTimes(2)
  })

  it('6 迟到释放：条目驱逐后 release 为 no-op，不二次 destroy 不抛错', async () => {
    const a = makeTask()
    const b = makeTask()
    const c = makeTask()
    const leaseA = await ready('app-file://late-a', a)
    leaseA.release()
    ;(await ready('app-file://late-b', b)).release()
    ;(await ready('app-file://late-c', c)).release()
    expect(a.destroy).toHaveBeenCalledTimes(1)
    expect(() => leaseA.release()).not.toThrow()
    expect(a.destroy).toHaveBeenCalledTimes(1)
  })

  it('7 重复 destroy 防护：loading 中止与迟到 reject 交汇仍只 destroy 一次', async () => {
    const fixture = makeTask()
    fixture.destroy.mockImplementationOnce(async () => fixture.reject(new Error('aborted')))
    queue(fixture)
    const lease = pdfDocumentCache.acquire('app-file://abort-loading')
    const cancelled = expect(lease.promise).rejects.toThrow()
    lease.release()
    lease.release()
    await cancelled
    await Promise.resolve()
    expect(fixture.destroy).toHaveBeenCalledTimes(1)
    expect(() => lease.release()).not.toThrow()
  })

  it('8 尺寸缓存复用：PageColumn 重挂命中零 getPage 增量且尺寸逐位相同', async () => {
    const fixture = makeTask()
    const lease = await ready('app-file://page-sizes', fixture)
    const firstReady = vi.fn()
    await mountColumn(fixture.doc, firstReady)
    const firstSizes = pdfDocumentCache.readPageSizes(fixture.doc)
    expect(firstSizes).toEqual([{ width: 300, height: 400 }, { width: 500, height: 600 }])
    expect(firstReady).toHaveBeenCalledWith(500)
    expect(fixture.getPage).toHaveBeenCalledTimes(2)
    act(() => root?.unmount())
    root = null
    host?.remove()
    host = null

    const secondReady = vi.fn()
    await mountColumn(fixture.doc, secondReady)
    expect(fixture.getPage, '缓存命中不得重跑尺寸管线').toHaveBeenCalledTimes(2)
    expect(pdfDocumentCache.readPageSizes(fixture.doc)).toEqual(firstSizes)
    expect(secondReady).toHaveBeenCalledWith(500)
    const boxes = host!.querySelectorAll<HTMLElement>('[data-page-box]')
    expect(Array.from(boxes).map((box) => [box.style.width, box.style.height])).toEqual([
      ['500px', '400px'],
      ['500px', '600px']
    ])
    lease.release()
  })

  it('9 undefined 加载失败仍拒绝公开 lease promise，且 destroy 恰一次', async () => {
    const fixture = makeTask()
    queue(fixture)
    const lease = pdfDocumentCache.acquire('app-file://undefined-rejection')
    let settlement: 'pending' | 'resolved' | 'rejected' = 'pending'
    let rejection: unknown = 'unset'
    void lease.promise.then(
      () => {
        settlement = 'resolved'
      },
      (reason: unknown) => {
        settlement = 'rejected'
        rejection = reason
      }
    )
    fixture.reject(undefined)
    for (let i = 0; i < 8; i += 1) await Promise.resolve()
    expect(settlement, 'undefined 也是失败因，公开 promise 不得永久 pending').toBe('rejected')
    expect(rejection).toBeUndefined()
    expect(fixture.destroy).toHaveBeenCalledTimes(1)
    lease.release()
  })

  it('10 活动外溢全部释放后 ready 命中也收敛：最旧空闲者驱逐且驻留回到两份', async () => {
    const a = makeTask()
    const b = makeTask()
    const c = makeTask()
    const leaseA = await ready('app-file://overflow-a', a)
    const leaseB = await ready('app-file://overflow-b', b)
    const leaseC = await ready('app-file://overflow-c', c)
    expect(a.destroy).not.toHaveBeenCalled()
    expect(b.destroy).not.toHaveBeenCalled()
    expect(c.destroy).not.toHaveBeenCalled()
    leaseA.release()
    leaseB.release()
    leaseC.release()

    const revisitA = pdfDocumentCache.acquire('app-file://overflow-a')
    expect(await revisitA.promise).toBe(a.doc)
    revisitA.release()
    expect(a.destroy, '被 acquire 的活动条目豁免').not.toHaveBeenCalled()
    expect(b.destroy, 'ready 命中后驱逐 lastUsed 最旧的空闲 B').toHaveBeenCalledTimes(1)
    expect(c.destroy).not.toHaveBeenCalled()

    const d = makeTask()
    ;(await ready('app-file://overflow-d', d)).release()
    expect(c.destroy, '驻留已收敛至 A/C 两份，新建 D 后按 LRU 驱逐 C').toHaveBeenCalledTimes(1)
    expect(a.destroy).not.toHaveBeenCalled()
    expect(d.destroy).not.toHaveBeenCalled()
  })
})
