import { expect, it } from 'vitest'
import {
  createCorpusExtractor,
  cropBoxPixels,
  EXPORT_SNAPSHOT_SCALE,
  type PdfjsDocumentLike,
  type PdfjsPageLike,
  type RenderCanvas
} from '../../../src/renderer/features/reader/CorpusExtractor'
import {
  extractRequestEventSchema,
  type CorpusItemReq,
  type ExtractRequestEvent
} from '../../../src/shared/ipc/schemas'
import type { AnnotationRect } from '../../../src/shared/models/annotation'
import type { Result } from '../../../src/shared/app-error'
import { guardedDescribe } from '../../utils/guard'

guardedDescribe('SR2-AI-02', 'CorpusExtractor —— 全文/图提取器（四态迁移+背压+裁剪数学）', () => {
  // ── 桩基建 ──────────────────────────────────────────────
  interface Ctx {
    sent: CorpusItemReq[]
    inflight: number
    maxInflight: number
    ackFailAt: number | null
    extractor: ReturnType<typeof createCorpusExtractor>
  }

  function pageStub(text: string): PdfjsPageLike {
    return {
      getTextContent: () => Promise.resolve({ items: [{ str: text }] }),
      getViewport: ({ scale }: { scale: number }) => ({
        width: 612 * scale,
        height: 792 * scale
      }),
      render: ({ canvasContext }: { canvasContext: unknown }) => {
        const c = canvasContext as { markRendered?: () => void }
        c.markRendered?.()
        return { promise: Promise.resolve() }
      }
    }
  }

  function docStub(pages: string[], failDestroy = false): PdfjsDocumentLike {
    return {
      numPages: pages.length,
      getPage: (n: number) => Promise.resolve(pageStub(pages[n - 1] ?? '')),
      destroy: () => {
        if (failDestroy) return Promise.reject(new Error('destroy 失败（尽力而为面）'))
        return Promise.resolve()
      }
    }
  }

  function canvasStub(w: number, h: number): RenderCanvas {
    return {
      width: w,
      height: h,
      source: null,
      ctx: { markRendered: (): void => undefined },
      drawFrom: () => undefined,
      toPngBase64: () => `PNG(${w}x${h})`
    }
  }

  function makeCtx(doc: PdfjsDocumentLike): Ctx {
    const ctx: Ctx = {
      sent: [],
      inflight: 0,
      maxInflight: 0,
      ackFailAt: null,
      extractor: null as unknown as Ctx['extractor']
    }
    const sendItem = (item: CorpusItemReq): Promise<Result<void>> => {
      ctx.inflight += 1
      ctx.maxInflight = Math.max(ctx.maxInflight, ctx.inflight)
      return new Promise((resolve) => {
        setTimeout(() => {
          ctx.sent.push(item)
          ctx.inflight -= 1
          const ackFail = ctx.ackFailAt !== null && ctx.ackFailAt === ctx.sent.length
          resolve(
            ackFail
              ? { ok: false, error: { code: 'INTERNAL', message: 'ack 拒绝（会话侧）' } }
              : { ok: true, data: undefined }
          )
        }, 0)
      })
    }
    const loadDocument = () => {
      const d = doc
      return Promise.resolve(d)
    }
    ctx.extractor = createCorpusExtractor({ loadDocument, sendItem, createCanvas: canvasStub })
    return ctx
  }

  const req = (over: Partial<ExtractRequestEvent> = {}): ExtractRequestEvent =>
    extractRequestEventSchema.parse({
      type: 'extract-request',
      sessionId: 's-1',
      paperId: 'p-1',
      url: 'app-file://x.pdf',
      annotations: [],
      ...over
    })

  const flushAll = async (pages: number): Promise<void> => {
    // sendItem 的 ack 走 setTimeout（宏任务）：每项回传间有一轮宏任务切换，
    // 串行链需要逐轮推进（每轮 settle=一个宏任务+其微任务链）
    const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 0))
    for (let i = 0; i < pages * 8 + 16; i += 1) await settle()
  }

  it('全链：逐页 fulltext+页图回传（页序与文本序）→complete 终局', async () => {
    const ctx = makeCtx(docStub(['P1 TEXT', 'P2 TEXT', 'P3 TEXT']))
    ctx.extractor.handleEvent(req())
    await flushAll(3)
    const fulltexts = ctx.sent.filter((i) => i.kind === 'fulltext')
    expect(fulltexts.map((i) => (i as { page: number }).page)).toEqual([1, 2, 3])
    expect(fulltexts.map((i) => (i as { payload: string }).payload)).toEqual([
      'P1 TEXT',
      'P2 TEXT',
      'P3 TEXT'
    ])
    const pageFigs = ctx.sent.filter((i) => i.kind === 'figure' && (i as { figure: string }).figure === 'page')
    expect(pageFigs).toHaveLength(3)
    // 回传序：页 N 的 fulltext 先于页 N 的页图，页 N 全部完成才进页 N+1
    const order = ctx.sent.map((i) =>
      i.kind === 'fulltext' ? `ft${(i as { page: number }).page}` : i.kind === 'figure' ? `fig${(i as { page: number }).page}` : i.kind
    )
    expect(order[0]).toBe('ft1')
    expect(order[1]).toBe('fig1')
    expect(order[2]).toBe('ft2')
    expect(ctx.sent.at(-1)?.kind).toBe('complete')
  })

  it('背压：任一时刻在途 invoke ≤1（await ack 后才发下一项）', async () => {
    const ctx = makeCtx(docStub(['a', 'b']))
    ctx.extractor.handleEvent(req())
    await flushAll(2)
    expect(ctx.maxInflight).toBe(1)
  })

  it('anno 裁剪：标注随所在页回传（存储 0 基页→提取 1 基页）+annotationId 载荷', async () => {
    const rects: AnnotationRect[] = [{ page: 1, x: 0.25, y: 0.5, w: 0.5, h: 0.25 }]
    const ctx = makeCtx(docStub(['a', 'b']))
    ctx.extractor.handleEvent(req({ annotations: [{ id: 'anno-9', rects }] }))
    await flushAll(2)
    const annos = ctx.sent.filter(
      (i) => i.kind === 'figure' && (i as { figure: string }).figure === 'anno'
    )
    expect(annos).toHaveLength(1)
    expect(annos[0]).toMatchObject({ page: 2, annotationId: 'anno-9' })
  })

  it('invoke 折叠错误：failed 路径——error 上报+destroy 释放+后续请求可接续', async () => {
    const ctx = makeCtx(docStub(['a', 'b']))
    ctx.ackFailAt = 1
    ctx.extractor.handleEvent(req())
    await flushAll(2)
    const kinds = ctx.sent.map((i) => i.kind)
    expect(kinds).toContain('error')
    expect(kinds[kinds.length - 1]).toBe('error')
    // failed→idle 后新请求正常接续（跨格：failed→idle→extracting）
    ctx.ackFailAt = null
    ctx.extractor.handleEvent(req({ sessionId: 's-2' }))
    await flushAll(2)
    expect(ctx.sent.at(-1)?.kind).toBe('complete')
  })

  it('文档加载失败：error 上报（无页数据）', async () => {
    const ctx = makeCtx(Promise.reject(new Error('bad url')) as unknown as PdfjsDocumentLike)
    ctx.extractor.handleEvent(req())
    await flushAll(1)
    expect(ctx.sent).toHaveLength(1)
    expect(ctx.sent[0]).toMatchObject({ kind: 'error', reason: expect.stringContaining('bad url') })
  })

  it('destroy 失败不阻断：complete 已上报（尽力而为面）', async () => {
    const ctx = makeCtx(docStub(['a'], true))
    ctx.extractor.handleEvent(req())
    await flushAll(1)
    expect(ctx.sent.at(-1)?.kind).toBe('complete')
  })

  it('在途收第二请求：忽略（防御分支——main 编排保证串行）', async () => {
    const ctx = makeCtx(docStub(['a']))
    ctx.extractor.handleEvent(req({ sessionId: 's-1' }))
    ctx.extractor.handleEvent(req({ sessionId: 's-2' }))
    await flushAll(1)
    // 只有一次 complete（s-2 被忽略，无并发提取）
    const completes = ctx.sent.filter((i) => i.kind === 'complete')
    expect(completes).toHaveLength(1)
  })

  it('cropBoxPixels：多 rect 包围盒×viewport 像素（y 向下同 AnnotationLayer 口径）', () => {
    const rects: AnnotationRect[] = [
      { page: 0, x: 0.25, y: 0.5, w: 0.5, h: 0.2 },
      { page: 0, x: 0.1, y: 0.4, w: 0.2, h: 0.3 }
    ]
    const W = 612 * EXPORT_SNAPSHOT_SCALE
    const H = 792 * EXPORT_SNAPSHOT_SCALE
    const box = cropBoxPixels(rects, W, H)
    expect(box.sx).toBeCloseTo(0.1 * W)
    expect(box.sy).toBeCloseTo(0.4 * H)
    expect(box.sw).toBeCloseTo(0.65 * W)
    expect(box.sh).toBeCloseTo(0.3 * H)
  })

  it('事件契约三面：合法载荷通过；缺 url 拒；annotations 非 strict 形态拒', () => {
    expect(extractRequestEventSchema.safeParse({
      type: 'extract-request', sessionId: 's', paperId: 'p', url: 'u', annotations: []
    }).success).toBe(true)
    expect(extractRequestEventSchema.safeParse({
      type: 'extract-request', sessionId: 's', paperId: 'p', annotations: []
    }).success).toBe(false)
    expect(extractRequestEventSchema.safeParse({
      type: 'extract-request', sessionId: 's', paperId: 'p', url: 'u',
      annotations: [{ id: 'a', rects: [], extra: 1 }]
    }).success).toBe(false)
  })

  it('真 pdfjs 集成：多页工厂 PDF 的文本提取全链（getTextContent 真解析；render 面 e2e）', async () => {
    const { createMultiPagePdf } = await import('../../utils/pdf-factory')
    const { getDocument } = await import('pdfjs-dist')
    const pdf = await getDocument({ data: createMultiPagePdf(2, 'INTEGRATION') }).promise
    // 真文本链路+假渲染：getTextContent/getViewport 委托真页，render no-op
    // （node 无 2d canvas——快照渲染面归 AI-04 e2e 真环境）
    const realDoc: PdfjsDocumentLike = {
      numPages: pdf.numPages,
      getPage: async (n) => {
        const real = await pdf.getPage(n)
        // 真文本链路（getTextContent/getViewport 委托）+假渲染（node 无 2d
        // canvas——快照面归 AI-04 e2e）；结构兼容但嵌套变体需显式收窄
        return {
          getTextContent: () => real.getTextContent(),
          getViewport: (params: { scale: number }) => real.getViewport(params),
          render: () => ({ promise: Promise.resolve() })
        } as PdfjsPageLike
      },
      destroy: () => pdf.destroy()
    }
    const ctx = makeCtx(realDoc)
    ctx.extractor.handleEvent(req())
    await flushAll(2)
    const fulltexts = ctx.sent.filter((i) => i.kind === 'fulltext')
    expect(fulltexts).toHaveLength(2)
    expect((fulltexts[0] as { payload: string }).payload).toContain('P1')
    expect((fulltexts[0] as { payload: string }).payload).toContain('INTEGRATION')
    expect((fulltexts[1] as { payload: string }).payload).toContain('P2')
    expect(ctx.sent.at(-1)?.kind).toBe('complete')
  })
})
