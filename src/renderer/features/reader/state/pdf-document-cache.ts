/**
 * B2 §2：reader 域 PDF 文档缓存。模块级单例，不是 React 状态。
 *
 * - fileUrl 单飞：同 key 的 acquire 共享 loadingTask/promise；ready 命中复用。
 * - lease：活动引用不可驱逐；release 幂等，迟到释放不触碰已驱逐条目。
 * - 状态机：loading→ready→evicting→destroying→移除；loading 归零或失败直达
 *   destroying。destroy 只在状态单迁移处调用，失败不缓存。
 * - LRU 2：每次 acquire 登记后，驻留超过两份时逐出最旧的 refs=0 ready 条目；
 *   被 acquire 条目豁免。全活动时允许 N+1。工作区切换由 renderer reload 终结
 *   资源，不注册页面销毁钩子。
 * - pageSizes 随条目存活；缓存不调用 getPage，读写均由 PageColumn 管线触发。
 * - pdfjs 工厂由 INV-16 白名单 PdfDocProvider 注入，避免新增物理 import 面。
 */
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from './PdfDocProvider'
import type { PageBoxSize } from '../view/page-column-geometry'

export interface PdfDocumentLease {
  promise: Promise<PDFDocumentProxy>
  release(): void
}

type EntryState = 'loading' | 'ready' | 'evicting' | 'destroying'
type TaskFactory = (fileUrl: string) => PDFDocumentLoadingTask

interface Entry {
  fileUrl: string
  state: EntryState
  task: PDFDocumentLoadingTask
  doc: PDFDocumentProxy | null
  refs: number
  pageSizes: PageBoxSize[] | null
  lastUsed: number
  promise: Promise<PDFDocumentProxy>
  resolve(doc: PDFDocumentProxy): void
  reject(reason: unknown): void
}

const entries = new Map<string, Entry>()
let taskFactory: TaskFactory | null = null
let useClock = 0

function configure(factory: TaskFactory): void {
  taskFactory = factory
}

function destroy(entry: Entry, reason?: unknown): void {
  if (entry.state === 'destroying') return
  if (entry.state === 'ready') entry.state = 'evicting'
  entry.state = 'destroying'
  if (entries.get(entry.fileUrl) === entry) entries.delete(entry.fileUrl)
  entry.reject(reason)
  void entry.task.destroy().catch(() => undefined)
}

function evictForCapacity(acquired: Entry): void {
  // 活动外溢后的空闲条目在任一 acquire 登记后收敛；命中条目本身豁免。
  while (entries.size > 2) {
    let oldest: Entry | null = null
    for (const entry of entries.values()) {
      if (entry === acquired || entry.state !== 'ready' || entry.refs !== 0) continue
      if (oldest === null || entry.lastUsed < oldest.lastUsed) oldest = entry
    }
    if (oldest === null) return
    destroy(oldest)
  }
}

function makeLease(entry: Entry): PdfDocumentLease {
  let released = false
  return {
    promise: entry.promise,
    release: () => {
      if (released) return
      released = true
      if (entries.get(entry.fileUrl) !== entry) return
      if (entry.state !== 'loading' && entry.state !== 'ready') return
      if (entry.refs === 0) return
      entry.refs -= 1
      entry.lastUsed = ++useClock
      if (entry.refs === 0 && entry.state === 'loading') {
        destroy(entry, new Error(`PDF 加载已取消：${entry.fileUrl}`))
      }
    }
  }
}

function acquire(fileUrl: string): PdfDocumentLease {
  const existing = entries.get(fileUrl)
  if (existing !== undefined && (existing.state === 'loading' || existing.state === 'ready')) {
    existing.refs += 1
    existing.lastUsed = ++useClock
    evictForCapacity(existing)
    return makeLease(existing)
  }

  if (taskFactory === null) throw new Error('PDF 文档加载器尚未装配')
  const task = taskFactory(fileUrl)
  let resolve!: (doc: PDFDocumentProxy) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<PDFDocumentProxy>((res, rej) => {
    resolve = res
    reject = rej
  })
  const entry: Entry = {
    fileUrl,
    state: 'loading',
    task,
    doc: null,
    refs: 1,
    pageSizes: null,
    lastUsed: ++useClock,
    promise,
    resolve,
    reject
  }
  entries.set(fileUrl, entry)
  evictForCapacity(entry)
  void task.promise.then(
    (loaded) => {
      if (entry.state !== 'loading') return
      entry.state = 'ready'
      entry.doc = loaded
      entry.resolve(loaded)
    },
    (reason: unknown) => {
      if (entry.state !== 'loading') return
      destroy(entry, reason)
    }
  )
  return makeLease(entry)
}

function readyEntryFor(doc: PDFDocumentProxy): Entry | null {
  for (const entry of entries.values()) {
    if (entry.state === 'ready' && entry.doc === doc) return entry
  }
  return null
}

function readPageSizes(doc: PDFDocumentProxy): PageBoxSize[] | null {
  return readyEntryFor(doc)?.pageSizes ?? null
}

function writePageSizes(doc: PDFDocumentProxy, sizes: PageBoxSize[]): void {
  const entry = readyEntryFor(doc)
  if (entry !== null) entry.pageSizes = sizes
}

export const pdfDocumentCache = {
  configure,
  acquire,
  readPageSizes,
  writePageSizes
}
