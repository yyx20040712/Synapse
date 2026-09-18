/**
 * [P7E-03] reader-search —— 页内高亮搜索纯函数域（文本域索引+DOM 域几何映射）。
 *
 * ── 行为层 ──
 * - Design 裁决（票面 §①）：搜索索引=逐页 getTextContent 文本项拼接（全文档
 *   覆盖——未渲染页也可计数与跳转）；匹配矩形=渲染窗口内页的 TextLayer DOM
 *   span 上建 Range 取 clientRects（pdfjs 自己排版精确，item→span 索引 1:1
 *   按 DOM 序——pdfjs 4.10 每文本项恰一 span，TextLayer#appendText 实证）。
 * - buildPageText：拼接 items.str；hasEOL 项后插 '\n'（防跨行假匹配——
 *   findInText 拒含 '\n' 的段）；map=逐字符 → {itemIndex, offsetInItem}，
 *   换行位为哨兵 {itemIndex:-1, offsetInItem:-1}（map 与 text 同长，text
 *   下标可直接查 map；哨兵永不入 itemRanges——含 '\n' 的段已被拒）。
 *   [门一 N2/R2-N2] 索引文本=逐项安全降小写（保长者才用降值）；非保长项
 *   （İ→i̇ 双码元类）在查询侧恒降小写下永不命中——非保长语料不可搜，已知
 *   边界（不加回退匹配逻辑——成本不值）。
 * - findInText：大小写不敏感（[门一 N2] 只降 query——索引侧已安全降值）；
 *   多命中不重叠推进（Chrome 同款）；空串/纯空白查询=空结果（调用方拒的
 *   双保险）。
 * - asSearchDoc：unknown→结构收窄（ReaderPage 持 pdfDoc 为 unknown）。
 * - toPageRelative：视口盒−根盒=页内相对像素（高亮块绝对定位输入）。
 * - spansForItems：.textLayer span 按序映射；数量不符→null（防御：该页
 *   不高亮只计数——pdfjs 4.10 契约破坏时的降级路径）。
 *
 * ── 接口层 ──
 * - PdfTextItem 类型消费循「类型再导出单源」惯例（import type 自
 *   PdfPageCanvas——INV-16 白名单外禁 pdfjs-dist 直 import）。
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 零 DOM 副作用纯函数（spansForItems 只读查询）；已知边界（票面 §④）：
 *   跨行匹配=行盒原样、RTL/竖排按 ltr、whitespace 不归一。
 */
import type { PdfTextItem } from './view/PdfPageCanvas'

/** 字符映射项：text 下标 → 所属文本项与项内偏移；-1/-1=换行哨兵 */
export interface CharMapEntry {
  itemIndex: number
  offsetInItem: number
}

/** 页文本模型：拼接文本+逐字符映射（map 与 text 同长） */
export interface PageText {
  text: string
  map: CharMapEntry[]
}

/** 单命中：文本域区间+按 item 归组的区间集（DOM Range 构建输入） */
export interface SearchItemRange {
  itemIndex: number
  s0: number
  s1: number
}

export interface SearchHit {
  start: number
  end: number
  itemRanges: SearchItemRange[]
}

/** 结构收窄后的搜索文档（numPages 正整数+getPage 函数） */
export interface SearchDoc {
  numPages: number
  getPage(n: number): Promise<{ getTextContent(): Promise<{ items: unknown }> }>
}

/** 拼接页文本：hasEOL 项后插 '\n'，map 逐字符登记（换行位哨兵 -1/-1）。
 *  [门一 N2] 索引文本=逐项安全降小写（toLowerCase 保长者才用降值——保长则
 *  map 偏移对原文 DOM span 同样有效）；非保长项（İ→i̇ 双码元类）用原 str，
 *  该类项在查询侧恒降小写下永不命中——非保长语料不可搜，已知边界
 *  （findInText 只降 query；如此防降小写非保长展开造成的 map/DOM 偏移
 *  错位，不加回退匹配逻辑——成本不值）。 */
export function buildPageText(items: readonly PdfTextItem[]): PageText {
  let text = ''
  const map: CharMapEntry[] = []
  for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
    const it = items[itemIndex]
    if (it === undefined) continue
    const lowered = it.str.toLowerCase()
    const indexed = lowered.length === it.str.length ? lowered : it.str
    for (let k = 0; k < indexed.length; k += 1) {
      map.push({ itemIndex, offsetInItem: k })
    }
    text += indexed
    if (it.hasEOL) {
      text += '\n'
      map.push({ itemIndex: -1, offsetInItem: -1 })
    }
  }
  return { text, map }
}

/** text 区间 [s,e) → 按 item 归组的区间集（哨兵跳过；连续同项字符合并） */
function rangesFromMap(map: readonly CharMapEntry[], s: number, e: number): SearchItemRange[] {
  const out: SearchItemRange[] = []
  for (let i = s; i < e; i += 1) {
    const entry = map[i]
    if (entry === undefined) continue
    const { itemIndex, offsetInItem } = entry
    if (itemIndex < 0) continue
    const last = out[out.length - 1]
    if (last !== undefined && last.itemIndex === itemIndex && last.s1 === offsetInItem) {
      last.s1 = offsetInItem + 1
    } else {
      out.push({ itemIndex, s0: offsetInItem, s1: offsetInItem + 1 })
    }
  }
  return out
}

/** 页内查找：大小写不敏感（[门一 N2] 只降 query——索引侧已安全降值）；
 *  多命中不重叠推进；跨 '\n' 不命中；空/纯空白=空结果 */
export function findInText(page: PageText, query: string): SearchHit[] {
  const q = query.toLowerCase()
  if (q.trim() === '') return []
  const hay = page.text
  const hits: SearchHit[] = []
  let from = 0
  for (;;) {
    const idx = hay.indexOf(q, from)
    if (idx < 0) break
    from = idx + q.length
    if (page.text.slice(idx, idx + q.length).includes('\n')) continue
    hits.push({ start: idx, end: idx + q.length, itemRanges: rangesFromMap(page.map, idx, idx + q.length) })
  }
  return hits
}

/** unknown→SearchDoc 结构收窄（ReaderPage 持 pdfDoc 为 unknown；不符=null） */
export function asSearchDoc(v: unknown): SearchDoc | null {
  if (typeof v !== 'object' || v === null) return null
  const w = v as { numPages?: unknown; getPage?: unknown }
  if (typeof w.numPages !== 'number' || !Number.isInteger(w.numPages) || w.numPages <= 0) return null
  if (typeof w.getPage !== 'function') return null
  return v as SearchDoc
}

/** raw items → PdfTextItem[]：过滤无 str 的结构项（PdfPageCanvas 同款防御——
 *  includeMarkedContent 默认关闭，此处兜底防结构项混入破坏 item→span 映射） */
export function toTextItems(raw: unknown): PdfTextItem[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((it): it is PdfTextItem => typeof (it as { str?: unknown })?.str === 'string')
}

/** 视口盒→根盒相对像素（高亮块绝对定位输入；w/h 原样透传） */
export function toPageRelative(clientRect: DOMRect, rootRect: DOMRect): { x: number; y: number; w: number; h: number } {
  return {
    x: clientRect.x - rootRect.x,
    y: clientRect.y - rootRect.y,
    w: clientRect.width,
    h: clientRect.height
  }
}

/** .textLayer span 按序映射：数量与 itemCount 一致→span 数组；不符→null
 *  （防御：该页不高亮只计数——items 与 TextLayer span 严格同序同数是 pdfjs
 *  4.10 契约，破坏即降级） */
export function spansForItems(pageRoot: HTMLElement, itemCount: number): (HTMLSpanElement | null)[] | null {
  const textLayer = pageRoot.querySelector('.textLayer')
  if (textLayer === null) return null
  const spans = Array.from(textLayer.querySelectorAll('span'))
  if (spans.length !== itemCount) return null
  return spans as HTMLSpanElement[]
}
