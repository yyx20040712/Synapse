/**
 * [F-VISFB-43] FigureExtractor —— XObject-only 图表提取编排件（00B 蓝本落法）。
 * pdfjs-dist 运行时 import 白名单第五件〔INV-16——2026-10-17 F-VISFB-43 随
 * PaperImageExtractor 退役换名承接；动态 import=CorpusExtractor 同型（调用时
 * 才加载，测试注入桩不触发）〕。
 *
 * ── 行为层（蓝本=00B 接手单 20261016-visfbb0/02）──
 * - 枚举：getOperatorList 扫 paintImageXObject（op 码注入透传——CTM 栈跟踪/
 *   阈值过滤在 figure-ctm 纯核）；inline/mask 不枚举（语料 0 例排除实证）。
 * - 解码：objs/commonObjs 双注册表异步轮询（resolve 后未必就绪——超时守卫
 *   必留）；kind 1·2 展开在 figure-decode 纯核。
 * - 去重：解码位图摘要单键（禁 ref 做键——00B num/gen=undefined 事故）；
 *   同资产多 draw 计数，首 draw 页即归属页。
 * - 过滤：三阈值复合（figure-ctm 单源消费 FIGURE_* 常量）；上限 24 截断记
 *   excess（禁静默）；PNG 编码逐资产分笔发送（IPC 单笔 ≤FIGURE_IPC_MAX_BYTES
 *   守卫——超限降采样重试记档非丢弃，终超限记 per-asset 失败）。
 * - failed≠empty：单图失败（op 流页失败/轮询超时/解码面外/编码终超限/回存
 *   拒收）记 failed 计数不空整批，全败判定归 main 会话 complete。
 * - 禁 page.render（静态负锚——矢量快照路线否决，§0-7）。
 * - PNG-only（编码出口唯一）：canvas toBlob('image/png')；JPEG 有损变体若未来
 *   立项=023 加 format 列+file_ref/MIME/白名单三处随改（[locked-change]——
 *   备案锚=figure-store.service PNG 魔数守卫头注〔42 回炉①B-1〕）。
 *
 * ── 文化层 ── 测试：tests/unit/renderer/FigureExtractor.test.ts（结构桩注入）
 * +Node 真语料 probe（evidence/43-probe-*.mjs）。
 */
import { FIGURE_IPC_MAX_BYTES, FIGURE_MAX_PER_PAPER } from '@shared/constants'
import { appFileUrl } from '@shared/app-file-url'
import { collectImageDraws, isQualifyingFigure, type CtmOpCodes } from './figure-ctm'
import { decodeToRgba, rawDataView, type DecodedImageObj } from './figure-decode'

// ── 结构子集（pdfjs-free——测试桩/Node probe 同形）──────────────────────

export interface ObjsRegistry {
  has(id: string): boolean
  get(id: string): unknown
}

export interface FigurePageLike {
  getOperatorList(): Promise<{ fnArray: number[]; argsArray: unknown[][] }>
  objs: ObjsRegistry
  commonObjs?: ObjsRegistry
}

export interface FigureDocLike {
  readonly numPages: number
  getPage(n: number): Promise<FigurePageLike>
  destroy(): Promise<void>
}

/** 逐资产分笔 IPC 载荷（digest=sha256(PNG 字节) hex64——42 storeFigure 守卫对齐） */
export interface FigureAssetPayload {
  digest: string
  bytes: Uint8Array
  page: number
  width: number
  height: number
  ctmX: number
  ctmY: number
  ctmW: number
  ctmH: number
}

export interface ExtractDeps {
  ops: CtmOpCodes
  /** 字节摘要 hex（raw 去重与 PNG 资产双消费——生产=subtle sha256） */
  digest(bytes: Uint8Array): Promise<string>
  /** PNG 编码（scale≤1=降采样重试面；生产=canvas toBlob） */
  encodePng(width: number, height: number, rgba: Uint8ClampedArray, scale: number): Promise<Uint8Array>
  /** 单资产回存（true=stored；false=per-asset 拒收→failed 聚合；硬错误上抛=会话死） */
  sendAsset(asset: FigureAssetPayload): Promise<boolean>
  sleep(ms: number): Promise<void>
  now(): number
  log?(message: string): void
  pollIntervalMs?: number
  pollTimeoutMs?: number
  downsampleFactor?: number
  maxEncodeTries?: number
}

export interface ExtractSummary {
  stored: number
  excess: number
  failed: number
}

const DEFAULT_POLL_INTERVAL_MS = 100
const DEFAULT_POLL_TIMEOUT_MS = 10_000
const DEFAULT_DOWNSAMPLE_FACTOR = 0.6
const DEFAULT_MAX_ENCODE_TRIES = 4

function getObj(page: FigurePageLike, id: string): DecodedImageObj | null {
  if (page.objs.has(id)) return page.objs.get(id) as DecodedImageObj | null
  if (page.commonObjs?.has(id) === true) return page.commonObjs.get(id) as DecodedImageObj | null
  return null
}

/** 双注册表异步落位轮询（超时守卫必留——00B §六）；返回未解析残集 */
async function resolveObjs(
  page: FigurePageLike,
  ids: readonly string[],
  deps: ExtractDeps
): Promise<Set<string>> {
  const pending = new Set(ids)
  const interval = deps.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS
  const timeout = deps.pollTimeoutMs ?? DEFAULT_POLL_TIMEOUT_MS
  const t0 = deps.now()
  while (pending.size > 0) {
    for (const id of [...pending]) {
      if (page.objs.has(id) || page.commonObjs?.has(id) === true) pending.delete(id)
    }
    if (pending.size === 0) break
    if (deps.now() - t0 >= timeout) break
    await deps.sleep(interval)
  }
  return pending
}

/** 单文档提取主程（页序=文档序；发送序=op 流序） */
export async function extractDocFigures(doc: FigureDocLike, deps: ExtractDeps): Promise<ExtractSummary> {
  const summary: ExtractSummary = { stored: 0, excess: 0, failed: 0 }
  const sentRawDigests = new Set<string>()
  const failedObjIds = new Set<string>()
  const factor = deps.downsampleFactor ?? DEFAULT_DOWNSAMPLE_FACTOR
  const maxTries = deps.maxEncodeTries ?? DEFAULT_MAX_ENCODE_TRIES
  for (let n = 1; n <= doc.numPages; n += 1) {
    let page: FigurePageLike
    try {
      page = await doc.getPage(n)
    } catch {
      summary.failed += 1
      continue
    }
    let ops: { fnArray: number[]; argsArray: unknown[][] }
    try {
      ops = await page.getOperatorList()
    } catch {
      summary.failed += 1
      continue
    }
    const draws = collectImageDraws(ops.fnArray, ops.argsArray, n, deps.ops)
    if (draws.length === 0) continue
    const unresolved = await resolveObjs(page, [...new Set(draws.map((d) => d.objId))], deps)
    for (const draw of draws) {
      if (unresolved.has(draw.objId)) {
        if (!failedObjIds.has(draw.objId)) {
          failedObjIds.add(draw.objId)
          summary.failed += 1
        }
        continue
      }
      const obj = getObj(page, draw.objId)
      if (obj === null || typeof obj.width !== 'number' || typeof obj.height !== 'number') {
        if (!failedObjIds.has(draw.objId)) {
          failedObjIds.add(draw.objId)
          summary.failed += 1
        }
        continue
      }
      if (!isQualifyingFigure({ ctmW: draw.ctmW, ctmH: draw.ctmH, width: obj.width, height: obj.height })) {
        continue
      }
      let rawDigest: string
      try {
        rawDigest = await deps.digest(rawDataView(obj))
      } catch {
        if (!failedObjIds.has(draw.objId)) {
          failedObjIds.add(draw.objId)
          summary.failed += 1
        }
        continue
      }
      if (sentRawDigests.has(rawDigest)) continue
      sentRawDigests.add(rawDigest)
      if (summary.stored >= FIGURE_MAX_PER_PAPER) {
        summary.excess += 1
        continue
      }
      await storeOne(draw, obj, deps, summary, factor, maxTries)
    }
  }
  return summary
}

/** 单资产编码守卫+回存（4MB 降采样重试；终超限/拒收→failed 聚合）。
 * 〔回炉轮1 N-1〕encodePng/digest(bytes) 与解码同路包裹 per-asset try/catch
 * →failed++（canvas/subtle 异常记项不中止整篇——failed≠empty 基调）；
 * sendAsset 硬错误（会话死）除外——原样上抛归桥件补账径 */
async function storeOne(
  draw: { page: number; ctmX: number; ctmY: number; ctmW: number; ctmH: number },
  obj: DecodedImageObj,
  deps: ExtractDeps,
  summary: ExtractSummary,
  factor: number,
  maxTries: number
): Promise<void> {
  let rgba: Uint8ClampedArray
  try {
    rgba = decodeToRgba(obj).rgba
  } catch {
    summary.failed += 1
    return
  }
  let digest: string
  let bytes: Uint8Array
  try {
    let scale = 1
    bytes = await deps.encodePng(obj.width, obj.height, rgba, scale)
    let tries = 1
    while (bytes.byteLength > FIGURE_IPC_MAX_BYTES && tries < maxTries) {
      scale *= factor
      bytes = await deps.encodePng(obj.width, obj.height, rgba, scale)
      tries += 1
    }
    if (bytes.byteLength > FIGURE_IPC_MAX_BYTES) {
      deps.log?.(`图表资产超 ${String(FIGURE_IPC_MAX_BYTES)} 字节且降采样穷尽，记失败（页 ${String(draw.page)}）`)
      summary.failed += 1
      return
    }
    digest = await deps.digest(bytes)
  } catch (e) {
    deps.log?.(`图表资产编码/摘要失败（页 ${String(draw.page)}）：${e instanceof Error ? e.message : String(e)}`)
    summary.failed += 1
    return
  }
  // sendAsset 硬错误（会话死——代际守卫族）原样上抛中止整篇（桥件补账径）；
  // 返回 false=per-asset 拒收→failed 聚合（00B failed≠empty）
  const stored = await deps.sendAsset({
    digest,
    bytes,
    page: draw.page,
    width: obj.width,
    height: obj.height,
    ctmX: draw.ctmX,
    ctmY: draw.ctmY,
    ctmW: draw.ctmW,
    ctmH: draw.ctmH
  })
  if (stored) summary.stored += 1
  else summary.failed += 1
}

// ── 生产接线（pdfjs/canvas/subtle——document 桩单测覆盖面外）──────────────

let workerConfigured = false

/** pdfjs 懒加载文档句柄（app-file:// 同通道 INV-07；worker 本地打包 ADR-0002）。
 * 〔回炉轮1 W-2〕失败终接 loadingTask（F-R3 纪律沿承——旧 PaperImageExtractor
 * 同型）：promise reject 时 destroy（对「加载中」是中止），防 worker 侧资源泄漏 */
export async function loadFigureDocument(paperId: string): Promise<FigureDocLike> {
  const [pdfjs, workerModule] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  ])
  if (!workerConfigured) {
    pdfjs.GlobalWorkerOptions.workerSrc = (workerModule as { default: string }).default
    workerConfigured = true
  }
  const task = pdfjs.getDocument({ url: appFileUrl(paperId), isEvalSupported: false })
  try {
    const doc = await task.promise
    return doc as unknown as FigureDocLike
  } catch (e) {
    await task.destroy().catch(() => undefined)
    throw e
  }
}

/** 生产 op 码集（pdfjs OPS 注入——编排件零 pdfjs 静态依赖） */
export async function loadFigureOpCodes(): Promise<CtmOpCodes> {
  const { OPS } = await import('pdfjs-dist')
  return {
    save: OPS.save,
    restore: OPS.restore,
    transform: OPS.transform,
    formBegin: OPS.paintFormXObjectBegin,
    formEnd: OPS.paintFormXObjectEnd,
    paintImageXObject: OPS.paintImageXObject
  }
}

/** sha256 hex（web subtle——renderer 禁 node:crypto） */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', bytes as BufferSource)
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** canvas PNG 编码（scale<1=drawImage 降采样重试面） */
export async function encodePngViaCanvas(
  width: number,
  height: number,
  rgba: Uint8ClampedArray,
  scale: number
): Promise<Uint8Array> {
  const src = document.createElement('canvas')
  src.width = width
  src.height = height
  const sctx = src.getContext('2d')
  if (sctx === null) throw new Error('canvas 2d context 获取失败')
  sctx.putImageData(new ImageData(rgba, width, height), 0, 0)
  let out = src
  if (scale < 1) {
    const dst = document.createElement('canvas')
    dst.width = Math.max(1, Math.round(width * scale))
    dst.height = Math.max(1, Math.round(height * scale))
    const dctx = dst.getContext('2d')
    if (dctx === null) throw new Error('canvas 2d context 获取失败')
    dctx.drawImage(src, 0, 0, dst.width, dst.height)
    out = dst
  }
  const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, 'image/png'))
  if (blob === null) throw new Error('PNG 编码失败（toBlob 空）')
  return new Uint8Array(await blob.arrayBuffer())
}

/** 生产 deps 组装（桥件消费——sendAsset 由调用方经 IPC 注入） */
export function makeProductionDeps(over: {
  ops: CtmOpCodes
  sendAsset(asset: FigureAssetPayload): Promise<boolean>
  log?(message: string): void
}): ExtractDeps {
  return {
    ops: over.ops,
    digest: sha256Hex,
    encodePng: encodePngViaCanvas,
    sendAsset: over.sendAsset,
    sleep: (ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
    now: () => Date.now(),
    log: over.log
  }
}
