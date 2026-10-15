/**
 * [F-UIRES-04 批 3a] PaperImageExtractor —— 文中图片提取机 M2（pdfjs-dist 运行
 * 时 import 白名单第五件〔INV-16〕；pdfjs 类型零消费——句柄面一律本件结构子集；
 * M2 状态机=§4.8+§4.11-M2，态=idle/extracting(pId)/ready/partial(pId,k)/error）。
 * ── 句柄三则（INV-135——PdfDocProvider.tsx 接线处头注互指）──
 * 1. destroy 仅自建句柄；注册表句柄禁销毁（生命周期归 PdfDocProvider）。
 * 2. stale handle 防护：完成后查证注册表仍同 paperId 在册（同句柄）才写缓存，
 *    否则结果弃置（reader 卸载注销竞态，I7）。
 * 3. 单点去重：in-flight 提取请求层共享（并发 miss 一发；注册表层不二次去重）。
 * ── 行为层 ── SELECT 切换分策（I2 同 I7——离场篇自建在飞→task 同步销毁+标 error(stale)，
 * completed 早退）；本篇 extracting=去重 no-op；
 * ready/partial=HIT 幂等；error=维持（I8——M2 独立 RETRY 与 M1 分立）；UNMOUNT=同分策全量。
 * 加载=注册表命中复用→未命中自建 getDocument（app-file:// 同通道 INV-07）毕 destroy；失败终接
 * loadingTask（F-R3）。partial=部分页失败（I3）；全失败=error（I4）。LRU 容量 20 篇仅逐完成态、
 * 选中/extracting 永不逐；完成回调内同步判定键在册——已逐→释放不入 cache（I6）。图片=dataURL
 * （revoke 不适用）。触发=信息区可见（用户动作驱动）。worker=模块级自置（同值幂等，ADR-0002）。
 * ── 架构层 ── 驻 renderer/shared（§4.4 接线方向合法）。── 文化层 ── 测试=
 * tests/unit/renderer/PaperImageExtractor.test.ts（I1-I10 受锁；注册表/句柄
 * mock——真提取面不属本批）。
 */
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { PAPER_INFO_LRU_CAP, evictLruCompleted } from './paperInfoStore'

// worker 本地打包自置（同值幂等——模块级赋值，三消费点同模式）
GlobalWorkerOptions.workerSrc = workerUrl

/** 页/文档句柄结构子集（CorpusExtractor Pdfjs*Like 同型——测试桩同形；PDFDocumentProxy 结构兼容） */
export interface PdfjsPageLike { getViewport(p: { scale: number }): { width: number; height: number }; render(p: { canvasContext: unknown; viewport: unknown }): { promise: Promise<void> } }
export interface PaperDocLike { readonly numPages: number; getPage(n: number): Promise<PdfjsPageLike>; destroy(): Promise<void> }

const PAPER_IMAGE_SCALE = 2.0 // 缩略快照分辨率（PDF 矢量放大不失真）
export interface PaperImageEntry { status: 'extracting' | 'ready' | 'partial' | 'error'; images: string[]; failedPages: number; stale?: boolean }
export interface PaperImageDeps { renderPage?(page: PdfjsPageLike): Promise<string> }
export function paperIdFromFileUrl(fileUrl: string): string {
  if (!fileUrl.startsWith('app-file://')) throw new Error(`非受管协议 URL：${fileUrl.slice(0, 32)}`) // fail-fast 优于静默错键（k1-W4）
  return fileUrl.slice('app-file://'.length) // 协议单源=app-file.protocol.ts（app-file://<paperId>）
}

const registry = new Map<string, PaperDocLike>(); const imageCache = new Map<string, PaperImageEntry>(); let currentPId: string | null = null
interface InFlight { fileUrl: string; borrowed: boolean; aborted: boolean; completed: boolean; doc: PaperDocLike | null; task: { destroy(): Promise<void> } | null; render(page: PdfjsPageLike): Promise<string> }
const inFlight = new Map<string, InFlight>()

/** 注册表句柄注册/注销（PdfDocProvider 接线——生命周期归其所有，INV-135） */
export function registerPaperDoc(pId: string, doc: PaperDocLike): void { registry.set(pId, doc) }
export function unregisterPaperDoc(pId: string, doc: PaperDocLike): void { if (registry.get(pId) === doc) registry.delete(pId) } // 同句柄守卫——再挂载不误删

export function getPaperImages(pId: string): PaperImageEntry | undefined {
  const e = imageCache.get(pId)
  if (e !== undefined && e.status !== 'extracting') { imageCache.delete(pId); imageCache.set(pId, e) } // LRU recency 刷新（完成态读=使用）
  return e
}

function markError(pId: string, stale: boolean): void {
  imageCache.set(pId, { status: 'error', images: [], failedPages: 0, ...(stale ? { stale: true } : {}) }); evictLruCompleted(imageCache, PAPER_INFO_LRU_CAP, currentPId)
}

/** 离场自建在飞销毁（I2/I7 自建策）：task 同步销毁+标 error(stale)（doc 销毁归提取程退出分支单点）；借出早退续跑；completed 早退（提取程已落定终态不覆写——缓存驻留无关〔回炉 A〕）；幂等 */
function abortInFlight(pId: string): void {
  const rec = inFlight.get(pId)
  if (rec === undefined || rec.borrowed || rec.aborted || rec.completed) return
  rec.aborted = true
  if (rec.task !== null) void rec.task.destroy().catch(() => undefined)
  markError(pId, true)
}

async function runExtraction(pId: string, rec: InFlight): Promise<void> {
  const images: string[] = []; let failed = 0
  try {
    let doc = rec.doc
    if (doc === null) {
      // 未命中自建：getDocument（app-file:// 同通道）；失败终接 loadingTask
      const task = getDocument({ url: rec.fileUrl, isEvalSupported: false })
      rec.task = task
      try {
        doc = (await task.promise) as unknown as PaperDocLike
      } catch {
        if (rec.aborted) return // stale 已标+task 已销毁（abortInFlight 同步侧）——禁二次 destroy+禁覆写 stale
        await task.destroy().catch(() => undefined)
        if (rec.aborted) return // 慢 destroy 挂起窗内到达的 abort：stale 已被同步写入——保留（回炉 B）
        if (inFlight.get(pId) === rec) markError(pId, false)
        return
      }
      if (rec.aborted) return // 已标 error(stale)——不入 cache（doc 生命周期随 abortInFlight task.destroy 终结）
      rec.doc = doc
    }
    for (let n = 1; n <= doc.numPages; n += 1) {
      if (rec.aborted) break
      try { images.push(await rec.render(await doc.getPage(n))) } catch { failed += 1 } // 单页失败不扩散（I3）
    }
    if (rec.aborted) return // 同上：task.destroy 已终结生命周期
    // stale 防护（句柄三则②）：借出查证在册才写；已注销=结果弃置+清 extracting 驻留
    if (rec.borrowed && registry.get(pId) !== rec.doc) {
      if (inFlight.get(pId) === rec) imageCache.delete(pId)
      rec.completed = true // 提取程已落定终态（弃置面）——abortInFlight completed 早退锚（回炉 A）
      return
    }
    // 完成回调内同步判定键在册（I6）：已逐→不入 cache；换代（retry 重发）→不覆写
    if (inFlight.get(pId) !== rec || !imageCache.has(pId)) {
      if (!rec.borrowed && doc !== null) await doc.destroy().catch(() => undefined)
      return
    }
    rec.completed = true // 提取程已落定终态——abortInFlight completed 早退锚（回炉 A）
    imageCache.set(pId, { status: images.length === 0 ? 'error' : failed > 0 ? 'partial' : 'ready', images, failedPages: failed }); evictLruCompleted(imageCache, PAPER_INFO_LRU_CAP, currentPId)
    if (!rec.borrowed) await doc.destroy().catch(() => undefined) // 毕 destroy 仅自建（句柄三则①）
  } catch (e) { // 意外 throw 兜底（load/页循环各自失败面已内吞）：extracting 永驻防护（回炉 A3）+征兆可见（回炉 D）
    console.error('[PaperImageExtractor] 提取意外失败：', e)
    if (inFlight.get(pId) === rec && imageCache.get(pId)?.status === 'extracting') markError(pId, false)
  } finally {
    if (inFlight.get(pId) === rec) inFlight.delete(pId)
  }
}

function startExtraction(pId: string, fileUrl: string, deps?: PaperImageDeps): void {
  imageCache.set(pId, { status: 'extracting', images: [], failedPages: 0 }); evictLruCompleted(imageCache, PAPER_INFO_LRU_CAP, currentPId)
  const borrowed = registry.get(pId) ?? null
  const rec: InFlight = { fileUrl, borrowed: borrowed !== null, aborted: false, completed: false, doc: borrowed, task: null, render: deps?.renderPage ?? renderPageDefault }
  inFlight.set(pId, rec)
  void runExtraction(pId, rec)
}

/** 生产页渲染（DOM canvas 快照→dataURL；缩略 strip 数据面） */
async function renderPageDefault(page: PdfjsPageLike): Promise<string> {
  const viewport = page.getViewport({ scale: PAPER_IMAGE_SCALE })
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height)
  const ctx = canvas.getContext('2d')
  if (ctx === null) throw new Error('canvas 2d context 获取失败')
  await page.render({ canvasContext: ctx, viewport }).promise
  return canvas.toDataURL('image/png')
}

export function selectPaperImages(pId: string, fileUrl: string, deps?: PaperImageDeps): void {
  for (const key of inFlight.keys()) if (key !== pId) abortInFlight(key) // 切换分策（I2 同 I7；借出者内层早退续跑）
  currentPId = pId
  if (imageCache.has(pId)) return // extracting=单点去重；ready/partial=HIT 幂等；error=维持（I8）
  startExtraction(pId, fileUrl, deps)
}

export function retryPaperImages(pId: string, fileUrl: string, deps?: PaperImageDeps): void {
  if (imageCache.get(pId)?.status !== 'error' || inFlight.has(pId)) return // M2 独立 RETRY 仅 error
  startExtraction(pId, fileUrl, deps)
}

export function unmountPaperImages(): void {
  for (const key of inFlight.keys()) abortInFlight(key) // 借出者早退续跑（I7 分策）
  currentPId = null
}
