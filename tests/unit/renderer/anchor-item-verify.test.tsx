// @vitest-environment jsdom
/**
 * [F-A8 门0] anchor-item-verify —— verifyQuoteItem（items 域引文对账）+
 * resolveAnnotationRectsItem（重锚纯域版）单测（always-active，诞生即锁）。
 *
 * 覆盖（票面 scripts/audits/f-a8-gate0-impl-brief.md 裁决 5）：
 * - oracle 三态：jsdom DOM root（挂段落文本）与 items（同文本构造
 *   PdfTextItem 数组）双跑 verifyQuote vs verifyQuoteItem——原位命中/前部
 *   增删漂移重定位（prefix 锚校正）/失败 null 逐位一致；另覆盖空串引文、
 *   空串项穿插（buildItemOffsets 剔空串口径）、双出现打分竞争（prefix+suffix
 *   双锚优先、prefix 权重 2>suffix 1）。
 * - [回炉 W1] tie-break 分支：同分双出现（双锚全空 score 同 3）取距原偏移
 *   最近者（正反两向）+打分序锁定（2 分远位胜 1 分近位——score 优先于距离）。
 * - [回炉 W2] 机械对账：verifyQuoteItem 偏移口径 vs buildItemOffsets.spans
 *   全表机器锁定（每非空项 quote=str/start=spans[i].start 原位命中 ⇔ 偏移表
 *   ↔拼接文本一致；spans 首尾衔接+total 锚）。
 * - resolveAnnotationRectsItem：entry null→{}（S0 缺席格）；正常→rects/bands
 *   与 itemSelectionGeometry 同参直调逐位一致（同族对照断言）；漂移条目→
 *   校正 start 产出；verifyQuoteItem 失败/他页/空串引文条目→缺席（S3b 语义
 *   =接线层回退存量，纯函数只缺席）。
 *
 * 夹具=合成 items/entry 纯数据+jsdom 段落树；期望值手算（拼接全文偏移），
 * 非实现回填。变异红证 ≥2（打分权重翻转/拼接序破坏/tie-break 翻转——cp
 * 备份法）。
 */
import { afterEach, describe, expect, it } from 'vitest'
import type { Annotation } from '../../../src/shared/models/annotation'
import { verifyQuote, verifyQuoteItem } from '../../../src/renderer/features/reader/anchors/anchor-serialize'
import { resolveAnnotationRectsItem } from '../../../src/renderer/features/reader/anchors/annotation-resolve'
import type { PixelBox } from '../../../src/renderer/features/reader/anchors/annotation-anchor'
import { buildItemOffsets, itemSelectionGeometry, type ItemViewport } from '../../../src/renderer/features/reader/anchors/pdf-item-geometry'
import type { PageItemEntry } from '../../../src/renderer/features/reader/anchors/page-items.store'
import type { PdfTextItem, PdfTextStyle } from '../../../src/renderer/features/reader/PdfPageCanvas'

/** 横排样式（pdf-item-geometry.test 同款：ascent 0.8/descent −0.2） */
const STYLE_H: PdfTextStyle = { fontFamily: 'serif', ascent: 0.8, descent: -0.2, vertical: false }
const STYLES = { g1: STYLE_H }

/** 段落文本 → jsdom 页根（<p> 每段——fullTextOf 文档序拼接） */
function domRootOf(paras: string[]): HTMLElement {
  const root = document.createElement('div')
  for (const p of paras) {
    const el = document.createElement('p')
    el.textContent = p
    root.append(el)
  }
  document.body.append(root)
  return root
}

/** 段落文本 → PdfTextItem 数组（同文本同序——buildItemOffsets 拼接口径与
 *  DOM fullTextOf 产出同一字符串；几何=合成三行基线） */
function itemsOf(paras: string[]): PdfTextItem[] {
  const ys = [700, 672, 644, 616, 588, 560]
  return paras.map((str, i) => mkItem(str, 72, ys[i] ?? 560))
}

/** 造项：transform=[fs,0,0,fs,x,y]（PDF 用户空间基线点 (x,y)，字号 fs=10） */
function mkItem(str: string, x: number, y: number, opts: Partial<PdfTextItem> = {}): PdfTextItem {
  return {
    str,
    dir: 'ltr',
    width: 100,
    height: 10,
    transform: [10, 0, 0, 10, x, y],
    fontName: 'g1',
    hasEOL: false,
    ...opts
  }
}

afterEach(() => {
  document.body.replaceChildren()
})

// ── oracle：verifyQuote vs verifyQuoteItem 双跑逐位一致（终裁 5/裁决 5）──

describe('F-A8 门0 oracle —— verifyQuote vs verifyQuoteItem（DOM 域与 items 域同文本双跑）', () => {
  it('三态其一：原位命中（prefix/quote/suffix 全吻合）→ 同返原偏移', () => {
    const paras = ['前文第一段', '中段正文内容', '后文第三段']
    const root = domRootOf(paras)
    const items = itemsOf(paras)
    const sel = { prefix: '中段', quote: '正文', suffix: '内容', start: 7 }
    const domAt = verifyQuote(root, sel)
    const itemAt = verifyQuoteItem(items, sel)
    expect(domAt).toBe(7)
    expect(itemAt).toBe(domAt)
  })

  it('三态其二：前部增删漂移（DOM prepend 两字/items 前插两字项）→ 同返校正偏移（prefix 锚自愈）', () => {
    const paras = ['插字', '前文第一段', '中段正文内容', '后文第三段']
    const root = domRootOf(paras)
    const items = itemsOf(paras)
    const sel = { prefix: '中段', quote: '正文', suffix: '内容', start: 7 }
    const domAt = verifyQuote(root, sel)
    const itemAt = verifyQuoteItem(items, sel)
    expect(domAt).toBe(9)
    expect(itemAt).toBe(domAt)
  })

  it('三态其三：引文不存在 → 同 null（失败态）', () => {
    const paras = ['前文第一段', '中段正文内容', '后文第三段']
    const root = domRootOf(paras)
    const items = itemsOf(paras)
    const sel = { prefix: '中段', quote: '不存在的引文', suffix: '内容', start: 7 }
    const domAt = verifyQuote(root, sel)
    const itemAt = verifyQuoteItem(items, sel)
    expect(domAt).toBeNull()
    expect(itemAt).toBe(domAt)
  })

  it('空串引文 → 同 null（零宽选择语义——重定位扫描不启动）', () => {
    const paras = ['前文第一段', '中段正文内容', '后文第三段']
    const root = domRootOf(paras)
    const items = itemsOf(paras)
    const sel = { prefix: '', quote: '', suffix: '', start: 0 }
    expect(verifyQuote(root, sel)).toBeNull()
    expect(verifyQuoteItem(items, sel)).toBeNull()
  })

  it('空串项穿插（items 含 str 空项、DOM 无对应节点）→ 同偏移（buildItemOffsets 剔空串口径）', () => {
    const paras = ['前文第一段', '中段正文内容', '后文第三段']
    const root = domRootOf(paras)
    const items = [
      itemsOf([paras[0]!])[0]!,
      mkItem('', 72, 690),
      ...itemsOf(paras.slice(1))
    ]
    const sel = { prefix: '中段', quote: '正文', suffix: '内容', start: 7 }
    const domAt = verifyQuote(root, sel)
    const itemAt = verifyQuoteItem(items, sel)
    expect(domAt).toBe(7)
    expect(itemAt).toBe(domAt)
  })

  it('引文双出现：一处 prefix+suffix 双锚/一处无锚 → 同选双锚位（原位失效重定位）', () => {
    const paras = ['甲正文乙', '丙正文丁']
    const root = domRootOf(paras)
    const items = itemsOf(paras)
    const sel = { prefix: '甲', quote: '正文', suffix: '乙', start: 7 }
    const domAt = verifyQuote(root, sel)
    const itemAt = verifyQuoteItem(items, sel)
    expect(domAt).toBe(1)
    expect(itemAt).toBe(domAt)
  })

  it('引文双出现：一处仅 suffix 锚（score 1）/一处仅 prefix 锚（score 2）→ 同选 prefix 锚位（权重 2>1）', () => {
    const paras = ['甲乙正文丙丁', 'X乙正文YZ']
    const root = domRootOf(paras)
    const items = itemsOf(paras)
    const sel = { prefix: 'X乙', quote: '正文', suffix: '丙丁', start: 4 }
    const domAt = verifyQuote(root, sel)
    const itemAt = verifyQuoteItem(items, sel)
    expect(domAt).toBe(8)
    expect(itemAt).toBe(domAt)
  })

  it('同分 tie-break（回炉 W1）：双锚全空（score 同 3）、距原偏移一近一远 → 同取近者（正向：近=第一处出现）', () => {
    const paras = ['甲正文乙', '丙正文丁']
    const root = domRootOf(paras)
    const items = itemsOf(paras)
    const sel = { prefix: '', quote: '正文', suffix: '', start: 2 }
    const domAt = verifyQuote(root, sel)
    const itemAt = verifyQuoteItem(items, sel)
    expect(domAt).toBe(1)
    expect(itemAt).toBe(domAt)
  })

  it('同分 tie-break（回炉 W1）：双锚全空（score 同 3）、距原偏移一近一远 → 同取近者（反向：近=第二处出现）', () => {
    const paras = ['甲正文乙', '丙正文丁']
    const root = domRootOf(paras)
    const items = itemsOf(paras)
    const sel = { prefix: '', quote: '正文', suffix: '', start: 4 }
    const domAt = verifyQuote(root, sel)
    const itemAt = verifyQuoteItem(items, sel)
    expect(domAt).toBe(5)
    expect(itemAt).toBe(domAt)
  })

  it('打分序锁定（回炉 W1）：2 分远位（仅 prefix 锚，dist 10）胜 1 分近位（仅 suffix 锚，dist 0）→ 同选 2 分远位（score 优先于距离）', () => {
    const paras = ['X正文甲乙丙丁', '戊己庚辛正文Y']
    const root = domRootOf(paras)
    const items = itemsOf(paras)
    const sel = { prefix: 'X', quote: '正文', suffix: 'Y', start: 11 }
    const domAt = verifyQuote(root, sel)
    const itemAt = verifyQuoteItem(items, sel)
    expect(domAt).toBe(1)
    expect(itemAt).toBe(domAt)
  })
})

describe('F-A8 门0 回炉 W2 —— verifyQuoteItem 偏移口径与 buildItemOffsets.spans 机械对账', () => {
  it('全表对账：对每个非空项 i，verifyQuoteItem(quote=该项 str, start=spans[i].start) 原位命中 spans[i].start（偏移表↔拼接文本全表一致，含空串穿插）', () => {
    const items = [
      mkItem('前文第一段', 72, 700),
      mkItem('', 72, 690),
      mkItem('中段正文内容', 72, 672),
      mkItem('', 72, 662),
      mkItem('后文第三段', 72, 644)
    ]
    const { spans, total } = buildItemOffsets(items)
    expect(spans.length).toBe(3)
    expect(spans[0]!.start).toBe(0)
    for (let i = 1; i < spans.length; i += 1) {
      expect(spans[i]!.start).toBe(spans[i - 1]!.end)
    }
    expect(total).toBe(spans[spans.length - 1]!.end)
    for (const span of spans) {
      const str = items[span.index]!.str
      const at = verifyQuoteItem(items, { prefix: '', quote: str, suffix: '', start: span.start })
      expect(at).toBe(span.start)
    }
  })
})

// ── 行为：resolveAnnotationRectsItem（纯域版——S0 缺席/S2 重锚/S3b 条目缺席）──

/** 对照直调用 viewport/base（与 mkEntry 的 box/geometry 自洽：scale=612/612=1，
 *  盒本地帧 base 原点不参与） */
const VP1: ItemViewport = { scale: 1, rotate: 0, view: [0, 0, 612, 792] }
const BASE1: PixelBox = { x: 0, y: 0, w: 612, h: 792 }

/** 造页项条目（box=canvas CSS 盒合成回报——PagesOverlay 写者契约同式） */
function mkEntry(items: PdfTextItem[], over: Partial<PageItemEntry> = {}): PageItemEntry {
  return {
    page: 1,
    text: { items, styles: STYLES, lang: null },
    geometry: { rotate: 0, view: [0, 0, 612, 792] },
    box: { w: 612, h: 792 },
    ...over
  }
}

/** 造标注（zod strict 全字段——rects 存量值随意，纯域版不消费；默认引文
 *  '段中段正文' 跨 item1/item2 边界[4..9]——两基线行两块的对账形态） */
function mkAnnotation(over: Partial<Annotation> = {}): Annotation {
  return {
    id: 'a1',
    paperId: 'p1',
    page: 1,
    kind: 'highlight',
    color: 'yellow',
    quoteText: '段中段正文',
    prefixText: '第',
    suffixText: '内容',
    startOffset: 4,
    endOffset: 9,
    rects: [],
    comment: '',
    createdAt: '2026-09-04T00:00:00.000Z',
    updatedAt: '2026-09-04T00:00:00.000Z',
    ...over
  }
}

describe('F-A8 门0 resolveAnnotationRectsItem —— 重锚纯域版（S0/S2/S3b）', () => {
  it('entry null → {}（S0 缺席格——接线层走 DOM 回退链）', () => {
    expect(resolveAnnotationRectsItem(null, [mkAnnotation()], 1)).toEqual({})
  })

  it('正常条目 → rects/bands 与 itemSelectionGeometry 同参直调逐位一致（同族对照——跨 item 引文两行两块）', () => {
    const paras = ['前文第一段', '中段正文内容', '后文第三段']
    const items = itemsOf(paras)
    const a = mkAnnotation()
    const out = resolveAnnotationRectsItem(mkEntry(items), [a], 1)
    expect(Object.keys(out)).toEqual(['a1'])
    const geo = itemSelectionGeometry({
      items,
      styles: STYLES,
      viewport: VP1,
      start: 4,
      end: 9,
      base: BASE1
    })
    expect(geo).not.toBeNull()
    expect(out.a1!.rects).toEqual(geo!.rects)
    expect(out.a1!.bands).toEqual(geo!.bands)
    // 跨 item 引文命中两个基线行 → 同族对照下两块（块数与 selection 链同族一致）
    expect(out.a1!.rects.length).toBe(2)
  })

  it('漂移条目（entry items 前部多两字、startOffset 仍为旧值）→ 校正 start 产出=直调校正偏移形态', () => {
    const paras = ['插字', '前文第一段', '中段正文内容', '后文第三段']
    const items = itemsOf(paras)
    const a = mkAnnotation()
    const out = resolveAnnotationRectsItem(mkEntry(items), [a], 1)
    expect(Object.keys(out)).toEqual(['a1'])
    const geo = itemSelectionGeometry({
      items,
      styles: STYLES,
      viewport: VP1,
      start: 6,
      end: 11,
      base: BASE1
    })
    expect(geo).not.toBeNull()
    expect(out.a1!.rects).toEqual(geo!.rects)
    expect(out.a1!.bands).toEqual(geo!.bands)
  })

  it('verifyQuoteItem 失败（引文不存在）→ 该条缺席（S3b——纯函数只缺席，接线层回退存量）', () => {
    const items = itemsOf(['前文第一段', '中段正文内容', '后文第三段'])
    const a = mkAnnotation({ quoteText: '不存在的引文' })
    const out = resolveAnnotationRectsItem(mkEntry(items), [a], 1)
    expect(out).toEqual({})
  })

  it('他页条目与空串引文条目 → 均缺席（对账域与 DOM 版 resolveAnnotationRects 同判据）', () => {
    const items = itemsOf(['前文第一段', '中段正文内容', '后文第三段'])
    const other = mkAnnotation({ id: 'other', page: 2 })
    const emptyQuote = mkAnnotation({ id: 'empty', quoteText: '' })
    const out = resolveAnnotationRectsItem(mkEntry(items), [other, emptyQuote], 1)
    expect(out).toEqual({})
  })
})
