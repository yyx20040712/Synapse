// b3: P7-G
/**
 * [SR2-AI-02] CorpusExtractor —— 全文/图提取器（工单：open / strong）
 *
 * ── 行为层 ──
 * - App 层监听 exportCorpus 事件（useExportCorpusEvents 挂载，AI-04 交付），
 *   收 {type:'extract-request', sessionId, paperId, url, annotations} → 自持
 *   pdfjs 文档生命周期：getDocument(url)→逐页提取→destroy（R2 裁决：不复用
 *   ReaderPage 句柄——句柄在组件 state 模块外不可达；getDocument 无跨调用
 *   缓存；与阅读器挂载态零耦合）
 * - fulltext：全页 getTextContent items 拼接，逐页 invoke export/corpus-item
 *   {kind:'fulltext', page, payload} 回传（页界 \f 拼接归 main 侧落盘——AI-03）
 * - figures：page-N.png（离屏 canvas 全页快照，R7）+anno-<id>.png（归一化
 *   rects 包围盒从页图裁——y 向下同 AnnotationLayer 口径）——anno 图随标注
 *   所在页同批回传；快照分辨率=EXPORT_SNAPSHOT_SCALE 常量单源（v1=2.0——
 *   PDF 矢量放大不失真，多模态 OCR 友好）
 * - annotations 裁剪数据源=事件载荷随请求下发（main 从 repo 取——renderer
 *   无 DB 访问；存储 0 基页码→提取循环 1 基页换算 a.page === n-1）
 * - 背压：每项一 invoke，await ack 后发下一项（禁大 payload 整块）；篇毕
 *   {kind:'complete'}｜失败 {kind:'error', reason}
 * - 事件桥**单向**（R3）：本模块只消费 main→renderer 事件（progress 载荷
 *   忽略——UI 面）；renderer→main 一律常规 invoke（sendItem 注入）
 * - 状态机（renderer 侧提取器；会话全表母本=ai-plan-review §6，main 侧会话
 *   态归 AI-03——两层互指单源，禁两处复写全表）态空间×事件迁移全表：
 *   | 当前态 | 事件 | 迁移 | 动作/守卫 |
 *   | --- | --- | --- | --- |
 *   | idle | extract-request | →extracting | getDocument(url) 起拉；sessionId 记录 |
 *   | extracting | fulltext 页数据就绪 | extracting | sendItem fulltext，await ack 后再取下页（背压） |
 *   | extracting | figure 就绪（页快照/anno 裁剪） | extracting | sendItem figure 同上背压 |
 *   | extracting | 篇毕（末页 ack 完成） | →done | sendItem complete；destroy；→idle |
 *   | extracting | 文档加载失败/invoke 折叠错误/提取异常 | →failed | sendItem error+reason；destroy（失败也释放）；→idle |
 *   | extracting | 第二 extract-request 到达 | extracting（忽略） | 防御分支——main 编排保证串行（上一篇 complete/error 后才发下一篇），该分支仅防事件重发；sessionId 不同=日志+忽略 |
 *   | done/failed | （瞬时态） | →idle | 上报后立即回 idle（无驻留终态——终态语义在 main 侧会话） |
 *   跨格序列（审计面）：①篇失败→error 上报→idle→main 下一篇请求正常接续
 *   ②destroy 失败不阻断（尽力而为+console 日志，无 UI 面——文档对象已 detach
 *   即可）③全链多篇=extracting↔idle 交替，无跨篇状态残留
 *
 * ── 接口层 ──
 * - export function createCorpusExtractor(deps): CorpusExtractor（deps 注入
 *   loadDocument/sendItem/createCanvas——测试桩面，模块零 window/pdfjs 静态
 *   依赖；生产组装=useExportCorpusEvents（AI-04），pdfjs 经 lazy dynamic
 *   import）；export const EXPORT_SNAPSHOT_SCALE；export function
 *   cropBoxPixels(rects, width, height)（裁剪包围盒纯数学——单测锚）
 * - corpusItemReq 载荷契约=schemas.ts corpusItemReqSchema（四 kind 判别联合，
 *   单源——本模块不重复声明形状）
 * - pdfjs-dist 运行时 import 白名单第三成员（INV-16——白名单=PdfCanvas/
 *   TextLayer/CorpusExtractor 三文件清单；本单落地 ESLint 规则即 INV-16
 *   由未锚定翻已锚定）；类型消费循 PdfCanvas 再导出模式（白名单内惯例）
 *
 * ── 架构层 ──
 * - renderer/features/reader 域（pdfjs 消费惯例域）；零 React 组件面（纯
 *   TS 模块——监听归 App 层 hook）
 * - IPC 契约 [受锁]（本单已落）：api-surface export_ 域 corpusItem 通道+
 *   EVENT_CHANNELS.exportCorpus+schemas corpusItemReqSchema/事件两载荷；
 *   preload onExportCorpus 桥；main 侧 handler=stub（NOT_IMPLEMENTED 随
 *   SR2-AI-03 落地——真回传消费/落盘在 AI-03）
 *
 * ── 生命周期层 ──
 * - 不做：取消 UI（v1 极简——会话单飞拒绝归 AI-03）；阅读器句柄复用（R2
 *   废除假设）；对象级图像 XObject 提取（ADR-0011 边界）
 *
 * ── 文化层 ──
 * - 错误反馈两型：提取失败=error 载荷上抛 main 会话（会话 toast 归 AI-04）；
 *   本模块无独立 UI 面
 * - 测试：tests/unit/renderer/corpus-extractor.test.ts：多页页序/背压 max
 *   in-flight/anno 分页匹配与裁剪数学/failed 跨格接续/加载失败/destroy 尽力
 *   而为/防御分支/事件契约三面
 * - 完成后：删除 STUB → npm run verify 绿 → 人工审查 git diff → 翻 registry
 */
import type { Result } from '../../../shared/app-error'
import type { CorpusItemReq, ExportCorpusEvent, ExtractRequestEvent } from '../../../shared/ipc/schemas'
import type { AnnotationRect } from '../../../shared/models/annotation'

/** 全页快照分辨率（v1=2.0——PDF 矢量可放大；变更=INTERFACE 版本号联动） */
export const EXPORT_SNAPSHOT_SCALE = 2.0

// ── pdfjs 形状契约（结构类型——仅提取面所需子集；测试桩同形）──────────
export interface PdfjsTextItem {
  str?: string
}
export interface PdfjsPageLike {
  getTextContent(): Promise<{ items: PdfjsTextItem[] }>
  getViewport(params: { scale: number }): { width: number; height: number }
  render(params: { canvasContext: unknown; viewport: unknown }): { promise: Promise<void> }
}
export interface PdfjsDocumentLike {
  readonly numPages: number
  getPage(pageNumber: number): Promise<PdfjsPageLike>
  destroy(): Promise<void>
}
export type LoadDocument = (url: string) => Promise<PdfjsDocumentLike>

/** 回传端点（生产=window.api.export_.corpusItem；Result 折叠错误=failed 路径） */
export type SendItem = (item: CorpusItemReq) => Promise<Result<void>>

/** 渲染画布抽象（生产=HTMLCanvasElement 封装；测试桩记录尺寸） */
export interface RenderCanvas {
  readonly width: number
  readonly height: number
  readonly ctx: CanvasRenderingContext2DLike
  /** 底层绘制源（生产=canvas 元素；drawFrom 的 drawImage 源参——桩为占位值） */
  readonly source: CanvasImageSourceLike
  /** 从源画布裁剪绘制（anno 包围盒） */
  drawFrom(src: RenderCanvas, box: { sx: number; sy: number; sw: number; sh: number }): void
  toPngBase64(): string
}
/** CanvasImageSource 结构别名（node 测试环境无 DOM lib 类型——生产=canvas 元素） */
export type CanvasImageSourceLike = unknown
export interface CanvasRenderingContext2DLike {
  // pdfjs render 只需要可调用的 2D 上下文（形状不校验方法集——render 桩/真实现同构）
  [key: string]: unknown
}
export type CreateCanvas = (width: number, height: number) => RenderCanvas

export interface CorpusExtractor {
  /** 事件入口（extract-request 触发提取；progress 载荷忽略——UI 面非本模块职责） */
  handleEvent(e: ExportCorpusEvent): void
}

/** 归一化 rects → 像素包围盒（y 向下——AnnotationLayer rectStyle 同口径） */
export function cropBoxPixels(
  rects: readonly AnnotationRect[],
  width: number,
  height: number
): { sx: number; sy: number; sw: number; sh: number } {
  let x0 = Number.POSITIVE_INFINITY
  let y0 = Number.POSITIVE_INFINITY
  let x1 = Number.NEGATIVE_INFINITY
  let y1 = Number.NEGATIVE_INFINITY
  for (const r of rects) {
    x0 = Math.min(x0, r.x)
    y0 = Math.min(y0, r.y)
    x1 = Math.max(x1, r.x + r.w)
    y1 = Math.max(y1, r.y + r.h)
  }
  return { sx: x0 * width, sy: y0 * height, sw: (x1 - x0) * width, sh: (y1 - y0) * height }
}

/** 生产画布（DOM HTMLCanvasElement——renderer 沙箱内合法 API） */
function createDomCanvas(width: number, height: number): RenderCanvas {
  const el = document.createElement('canvas')
  el.width = width
  el.height = height
  const ctx = el.getContext('2d')
  if (ctx === null) throw new Error('canvas 2d context 获取失败')
  return {
    width,
    height,
    ctx: ctx as unknown as CanvasRenderingContext2DLike,
    source: el,
    drawFrom(src, box) {
      ctx.drawImage(
        src.source as CanvasImageSource,
        box.sx,
        box.sy,
        box.sw,
        box.sh,
        0,
        0,
        box.sw,
        box.sh
      )
    },
    toPngBase64(): string {
      const dataUrl = el.toDataURL('image/png')
      return dataUrl.slice('data:image/png;base64,'.length)
    }
  }
}

/** worker 只配一次（与 PdfCanvas 模块级设置同值幂等——两消费点独立初始化均安全） */
let workerConfigured = false

/**
 * 生产文档加载器（pdfjs lazy 动态 import——调用时才加载，测试注入桩不触发；
 * pdfjs-dist 白名单第三成员的运行时消费点 INV-16）。worker 必须先配置：
 * 未打开过 PDF 时 PdfCanvas 未加载，pdfjs 会回退默认 worker 路径（出网
 * 风险——CSP 拦截后提取失败）；worker 本地打包与 PdfCanvas 同源（ADR-0002）。
 */
export async function loadPdfDocument(url: string): Promise<PdfjsDocumentLike> {
  const [{ getDocument, GlobalWorkerOptions }, workerModule] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  ])
  if (!workerConfigured) {
    GlobalWorkerOptions.workerSrc = (workerModule as { default: string }).default
    workerConfigured = true
  }
  return getDocument(url).promise as unknown as PdfjsDocumentLike
}

export function createCorpusExtractor(deps: {
  loadDocument: LoadDocument
  sendItem: SendItem
  createCanvas?: CreateCanvas
}): CorpusExtractor {
  const createCanvas = deps.createCanvas ?? createDomCanvas
  let extracting = false

  async function runExtraction(req: ExtractRequestEvent): Promise<void> {
    const base = { sessionId: req.sessionId, paperId: req.paperId }
    /** 回传+ack 校验单点（折叠错误→throw→failed 路径——多调用面共用） */
    const sendChecked = async (item: CorpusItemReq): Promise<void> => {
      const ack = await deps.sendItem(item)
      if (!ack.ok) throw new Error('回传被拒绝（会话侧错误）')
    }
    let doc: PdfjsDocumentLike | null = null
    try {
      doc = await deps.loadDocument(req.url)
      for (let n = 1; n <= doc.numPages; n += 1) {
        const page = await doc.getPage(n)
        const text = (await page.getTextContent()).items
          .map((i) => i.str ?? '')
          .join('')
        await sendChecked({ ...base, kind: 'fulltext', page: n, payload: text })

        const viewport = page.getViewport({ scale: EXPORT_SNAPSHOT_SCALE })
        const pageCanvas = createCanvas(viewport.width, viewport.height)
        await page.render({ canvasContext: pageCanvas.ctx, viewport }).promise
        await sendChecked({
          ...base,
          kind: 'figure',
          figure: 'page',
          page: n,
          payload: pageCanvas.toPngBase64()
        })

        // rect.page 0 基存储 → 提取 1 基换算；跨页标注只裁当页 rects（bbox 单源=rect）
        for (const anno of req.annotations) {
          const pageRects = anno.rects.filter((r) => r.page === n - 1)
          if (pageRects.length === 0) continue
          const box = cropBoxPixels(pageRects, viewport.width, viewport.height)
          const annoCanvas = createCanvas(box.sw, box.sh)
          annoCanvas.drawFrom(pageCanvas, box)
          await sendChecked({
            ...base,
            kind: 'figure',
            figure: 'anno',
            page: n,
            annotationId: anno.id,
            payload: annoCanvas.toPngBase64()
          })
        }
      }
      // 终局同走 ack 校验（INV-13 消费方分支）：complete 被拒=会话侧已不认
      // 本笔提取 → throw → catch 发 error 上报（会话 failed），不静默吞掉
      await sendChecked({ ...base, kind: 'complete' })
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e)
      // failed→idle 前置上报（sendItem 自身失败不再追报——避免错误循环）
      try {
        await deps.sendItem({ ...base, kind: 'error', reason })
      } catch (sendErr) {
        console.error('CorpusExtractor error 上报失败', sendErr)
      }
    } finally {
      if (doc !== null) {
        try {
          await doc.destroy()
        } catch (destroyErr) {
          // 尽力而为面：文档对象已 detach 即可，失败仅日志不阻断
          console.warn('CorpusExtractor destroy 失败（已忽略）', destroyErr)
        }
      }
      extracting = false
    }
  }

  return {
    handleEvent(e: ExportCorpusEvent): void {
      if (e.type !== 'extract-request') return
      if (extracting) {
        // 防御分支：main 编排保证串行；在途忽略新请求（含 sessionId 不同——日志可辨）
        console.warn('CorpusExtractor 忽略在途期间的 extract-request', e.sessionId)
        return
      }
      extracting = true
      void runExtraction(e)
    }
  }
}
