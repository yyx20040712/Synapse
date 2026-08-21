/**
 * [SR-SVC-04] pdf-meta.extract —— PDF 元数据抽取（工单：SR-SVC-04）
 *
 * ── 行为层 ──
 * - 输入 PDF 字节，输出候选元数据（纯提取，不查库不出网）
 * - 优先级：PDF Info 字典（Title/Author）→ 首两页文本正则（DOI、arXiv id、年份）
 * - 抽不到的字段给安全默认值（空串/空数组/null），绝不抛"抽取失败"——抽取尽力而为
 *
 * ── 接口层 ──
 * - PdfMetaExtraction { title; authors; year; doi; arxivId }
 * - extractPdfMeta(bytes: Uint8Array): Promise<PdfMetaExtraction>
 *
 * ── 架构层 ──
 * - 不引 pdfjs-dist（项目规约：pdfjs 只允许 renderer 的 PdfCanvas 使用；本文件是
 *   main 进程纯函数），按字节解析路线实现：
 *   ① 头部 1KB 内找 %PDF- 魔数，找不到按坏文件处理；
 *   ② 全文字节扫描 /Title、/Author（优先取 Info 字典特征键旁的出现位置，避免书签
 *      outline 的 /Title 干扰；测试工厂的 trailer 不带 /Info，只能靠扫描）；
 *   ③ 扫描 stream/endstream 取内容流（/FlateDecode 用 node:zlib 解压——Node 内建
 *      模块，非新增依赖；解压失败退回原始字节）；
 *   ④ 从前两个含文本的流的 BT…ET 块抽 Tj/TJ 字面量串拼成页文本（对象顺序近似页序）。
 * - 字符串解码：BOM 走 UTF-16BE；否则 UTF-8 优先（测试工厂直写 UTF-8），非法序列
 *   退 windows-1252（PDFDocEncoding 的常用近似）
 * - DOI 正则：/10\.\d{4,9}\/[^\s"<>]+/i（取首个匹配，去尾部标点）
 * - arXiv 正则：/arXiv:(\d{4}\.\d{4,5})(?:v\d+)?/i；无标注时退回裸 ID 形态
 *   （前后不能紧邻字母/数字/点，避免咬到 DOI 尾段或版本号片段）
 * - 解析异常（坏 PDF）→ 返回已抽到的部分或全默认值并 console.warn，不抛
 *
 * ── 生命周期层 ──
 * - 不做：出版社/openalex 查询（那是 enrich.service）、任何文件 IO 与网络
 *
 * ── 文化层 ──
 * - 测试：tests/unit/services/pdf-meta.extract.test.ts（锁定；夹具由
 *   tests/utils/pdf-factory 生成：未压缩内容流 + Info Title 直写 UTF-8 字面量）
 */
import { inflateSync } from 'node:zlib'

export interface PdfMetaExtraction {
  title: string
  authors: string[]
  year: number | null
  doi: string | null
  arxivId: string | null
}

export async function extractPdfMeta(bytes: Uint8Array): Promise<PdfMetaExtraction> {
  // 尽力而为：任何阶段失败都不抛，保留已抽到的字段
  const result: PdfMetaExtraction = { title: '', authors: [], year: null, doi: null, arxivId: null }
  try {
    if (findPdfMagic(bytes) === -1) {
      console.warn('[SR-SVC-04] 未找到 %PDF- 魔数：按坏文件处理，元数据返回默认值')
      return result
    }
    result.title = readInfoString(bytes, 'Title')
    result.authors = splitAuthors(readInfoString(bytes, 'Author'))
    // 正则扫描文本 = 页文本在前、Info 标题兜底在后（压缩流解不开时标题常仍可读）
    const scanText = `${collectPageText(bytes)} ${result.title}`
    result.doi = matchDoi(scanText)
    result.arxivId = matchArxivId(scanText)
    result.year = matchYear(scanText)
    return result
  } catch (e) {
    console.warn(
      `[SR-SVC-04] PDF 元数据抽取中断，返回已抽到的部分：${
        e instanceof Error ? e.message : String(e)
      }`
    )
    return result
  }
}

// ── Info 字典：/Title、/Author ─────────────────────────────────────────────

/** Info 字典特征键：用来区分 Info 里的 /Title 与书签（outline）里的 /Title */
const INFO_NEIGHBOR_KEYS = [
  'Producer',
  'Creator',
  'Author',
  'Subject',
  'Keywords',
  'CreationDate',
  'ModDate',
  'Trapped'
] as const

/** 找 key 对应的 PDF 字符串值；特征命中者优先（文件序），找不到返回空串 */
function readInfoString(bytes: Uint8Array, key: string): string {
  const token = `/${key}`
  const hits: Array<{ at: number; infoish: boolean }> = []
  let from = 0
  for (;;) {
    const at = findBytes(bytes, token, from, bytes.length)
    if (at === -1) break
    const windowFrom = Math.max(0, at - 400)
    const infoish = INFO_NEIGHBOR_KEYS.some(
      (k) => findBytes(bytes, `/${k}`, windowFrom, at + 400) !== -1
    )
    hits.push({ at, infoish })
    from = at + token.length
  }
  const ordered = [...hits.filter((h) => h.infoish), ...hits.filter((h) => !h.infoish)]
  for (const h of ordered) {
    const value = parseStringAfterKey(bytes, h.at + token.length)
    if (value !== null && value !== '') return value
  }
  return ''
}

/** key 之后应跟 PDF 字符串（(…) 字面量或 <…> 十六进制）；间接引用等形态返回 null */
function parseStringAfterKey(bytes: Uint8Array, p: number): string | null {
  let i = p
  while (i < bytes.length && isPdfWhitespace(bytes[i])) i++
  const open = bytes[i]
  if (open === 0x28) {
    const lit = parseLiteralString(bytes, i)
    return lit === null ? null : normalizeWhitespace(decodePdfStringBytes(unescapePdfBytes(lit.raw)))
  }
  if (open === 0x3c && bytes[i + 1] !== 0x3c) {
    // '<<' 是字典开始而非字符串定界
    const hex = parseHexString(bytes, i)
    return hex === null ? null : normalizeWhitespace(decodePdfStringBytes(hex.raw))
  }
  return null
}

/** 从 '(' 起扫描到未转义的 ')'，返回夹层原始字节（转义序列保留原文，后续统一解） */
function parseLiteralString(bytes: Uint8Array, open: number): { raw: Uint8Array } | null {
  const out: number[] = []
  let i = open + 1
  while (i < bytes.length) {
    const b = bytes[i]
    if (b === 0x5c) {
      const next = bytes[i + 1]
      if (next === undefined) return null
      out.push(b, next)
      i += 2
      continue
    }
    if (b === 0x29) return { raw: Uint8Array.from(out) }
    if (b === 0x28) return null // 未转义的 '('：非法定界，放弃该候选
    if (b !== undefined) out.push(b)
    i++
  }
  return null
}

/** 从 '<' 起扫描到 '>'，十六进制转字节（奇数位高位补零）；空白容忍 */
function parseHexString(bytes: Uint8Array, open: number): { raw: Uint8Array } | null {
  const out: number[] = []
  let hi: number | null = null
  let i = open + 1
  while (i < bytes.length) {
    const b = bytes[i]
    if (b === 0x3e) {
      if (hi !== null) out.push(hi << 4)
      return { raw: Uint8Array.from(out) }
    }
    const v = hexValue(b)
    if (v === -1) {
      if (!isPdfWhitespace(b)) return null
      i++
      continue
    }
    if (hi === null) hi = v
    else {
      out.push((hi << 4) | v)
      hi = null
    }
    i++
  }
  return null
}

function hexValue(b: number | undefined): number {
  if (b === undefined) return -1
  if (b >= 0x30 && b <= 0x39) return b - 0x30
  if (b >= 0x41 && b <= 0x46) return b - 0x37
  if (b >= 0x61 && b <= 0x66) return b - 0x57
  return -1
}

/** 解 PDF 字符串转义：\n \r \t \b \f \( \) \\ \ddd 八进制、反斜杠行接续 */
function unescapePdfBytes(raw: Uint8Array): Uint8Array {
  const out: number[] = []
  let i = 0
  while (i < raw.length) {
    const b = raw[i]
    if (b === undefined) break
    if (b !== 0x5c) {
      out.push(b)
      i++
      continue
    }
    const n = raw[i + 1]
    if (n === undefined) break
    switch (n) {
      case 0x6e: out.push(0x0a); i += 2; break
      case 0x72: out.push(0x0d); i += 2; break
      case 0x74: out.push(0x09); i += 2; break
      case 0x62: out.push(0x08); i += 2; break
      case 0x66: out.push(0x0c); i += 2; break
      case 0x28: case 0x29: case 0x5c: out.push(n); i += 2; break
      case 0x0d: i += raw[i + 2] === 0x0a ? 3 : 2; break // 行接续 \r 或 \r\n
      case 0x0a: i += 2; break // 行接续 \n
      default: {
        if (n >= 0x30 && n <= 0x37) {
          let v = 0
          let k = i + 1
          let digits = 0
          while (k < raw.length && digits < 3) {
            const d = raw[k]
            if (d === undefined || d < 0x30 || d > 0x37) break
            v = v * 8 + (d - 0x30)
            k++
            digits++
          }
          out.push(v & 0xff)
          i = k
        } else {
          out.push(n) // 未知转义按字面
          i += 2
        }
      }
    }
  }
  return Uint8Array.from(out)
}

/** PDF 字符串字节 → JS 字符串：BOM 走 UTF-16BE；否则 UTF-8 优先，非法退 windows-1252 */
function decodePdfStringBytes(raw: Uint8Array): string {
  if (raw.length >= 2 && raw[0] === 0xfe && raw[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(raw.subarray(2))
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(raw)
  } catch {
    return new TextDecoder('windows-1252').decode(raw)
  }
}

/** /Author 拆多人：BibTeX 风格 " and " 分隔 */
function splitAuthors(value: string): string[] {
  if (value === '') return []
  return value
    .split(/\s+and\s+/)
    .map((name) => name.trim())
    .filter((name) => name !== '')
}

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

// ── 内容流：前两个含文本的 stream ───────────────────────────────────────────

/** 逐个产出内容流字节（Flate 解压尽力而为）；对象顺序近似页序 */
function* iterateStreamData(bytes: Uint8Array): Generator<Uint8Array> {
  let pos = 0
  for (;;) {
    const s = findBytes(bytes, 'stream', pos, bytes.length)
    if (s === -1) return
    pos = s + 6
    if (s >= 3 && bytes[s - 3] === 0x65 && bytes[s - 2] === 0x6e && bytes[s - 1] === 0x64) {
      continue // 这是 endstream 里的 "stream"，跳过
    }
    const after = s + 6
    const b0 = bytes[after]
    let dataStart = -1
    if (b0 === 0x0d && bytes[after + 1] === 0x0a) dataStart = after + 2
    else if (b0 === 0x0a || b0 === 0x0d) dataStart = after + 1
    else continue // stream 后必须紧跟 EOL（PDF 规范），否则不是流定界
    const e = findBytes(bytes, 'endstream', dataStart, bytes.length)
    if (e === -1) return
    let dataEnd = e
    if (bytes[e - 1] === 0x0a || bytes[e - 1] === 0x0d) {
      dataEnd = e - 1
      if (bytes[e - 1] === 0x0a && bytes[e - 2] === 0x0d) dataEnd = e - 2
    }
    const raw = bytes.subarray(dataStart, dataEnd)
    const dictWindow = bytes.subarray(Math.max(0, s - 300), s)
    if (findBytes(dictWindow, '/FlateDecode', 0, dictWindow.length) !== -1) {
      try {
        yield inflateSync(raw)
      } catch {
        // 解压失败（流边界猜错或非 zlib）：退回原始字节，抽不到文本就算了
        yield raw
      }
    } else {
      yield raw
    }
    pos = e + 9
  }
}

function collectPageText(bytes: Uint8Array): string {
  const parts: string[] = []
  for (const data of iterateStreamData(bytes)) {
    if (parts.length >= 2) break // 规约：只看前两页（≈前两个含文本的流）
    const t = extractShownText(data)
    if (t.trim() !== '') parts.push(t)
  }
  return parts.join(' ')
}

/** 文本显示算子：TJ 数组、Tj/'/" 单串 */
const SHOW_OP = /\[[^\]\\[]*\]\s*TJ|\((?:\\[\s\S]|[^\\()])*\)\s*(?:Tj|'|")/g
const LITERAL_STR = /\((?:\\[\s\S]|[^\\()])*\)/g

/** 内容流 → 显示文本：BT…ET 块内抽字面量串（解转义后按 UTF-8/1252 解码） */
function extractShownText(data: Uint8Array): string {
  const bin = toBinaryString(data)
  const parts: string[] = []
  for (const block of bin.matchAll(/BT[\s\S]*?ET/g)) {
    for (const seg of block[0].matchAll(SHOW_OP)) {
      const tokenText = seg[0]
      if (tokenText.startsWith('[')) {
        // TJ 数组：段内字符串原样拼接（字距微调常把一个词切成多段）
        const inner: string[] = []
        for (const lit of tokenText.matchAll(LITERAL_STR)) inner.push(decodeLiteral(lit[0]))
        parts.push(inner.join(''))
      } else {
        const from = tokenText.indexOf('(')
        const to = tokenText.lastIndexOf(')')
        if (from !== -1 && to > from) parts.push(decodeLiteral(tokenText.slice(from, to + 1)))
      }
    }
  }
  return parts.join(' ')
}

/** "(…)" 匹配文本 → 解码字符串（经二进制串往返，字节保真） */
function decodeLiteral(lit: string): string {
  const inner = lit.slice(1, -1)
  const raw = new Uint8Array(inner.length)
  for (let i = 0; i < inner.length; i++) raw[i] = inner.charCodeAt(i) & 0xff
  return decodePdfStringBytes(unescapePdfBytes(raw))
}

/** 字节 → latin1 二进制串（每字节一字码位，往返无损）。不用 TextDecoder('latin1')：
 *  它实为 windows-1252，0x80–0x9F 区间（UTF-8 续字节常见）会变形 */
function toBinaryString(data: Uint8Array): string {
  let s = ''
  const CHUNK = 4096
  for (let i = 0; i < data.length; i += CHUNK) {
    s += String.fromCharCode(...data.subarray(i, Math.min(i + CHUNK, data.length)))
  }
  return s
}

// ── 字段正则 ────────────────────────────────────────────────────────────────

function matchDoi(text: string): string | null {
  const m = /10\.\d{4,9}\/[^\s"<>]+/i.exec(text)
  if (m === null) return null
  // 引文里 DOI 常被右括号/句读包住：去尾部标点
  return m[0].replace(/[)\]>.,;:!'"”’]+$/u, '')
}

function matchArxivId(text: string): string | null {
  const labeled = /arXiv:(\d{4}\.\d{4,5})(?:v\d+)?/i.exec(text)
  if (labeled !== null) return labeled[1] ?? null
  // 裸 ID：前邻非字母/数字/点（不吃 DOI 尾段），后邻非数字（不吃更长数字串）
  const bare = /(?:^|[^A-Za-z0-9.])(\d{4}\.\d{4,5})(?:v\d+)?(?!\d)/.exec(text)
  return bare !== null ? bare[1] ?? null : null
}

function matchYear(text: string): number | null {
  const m = /\b(?:19|20)\d{2}\b/.exec(text)
  return m === null ? null : Number.parseInt(m[0], 10)
}

// ── 字节工具 ────────────────────────────────────────────────────────────────

/** 字节序列查找（needle 只允许 ASCII，本文件所有标记均为 ASCII）；找不到返回 -1 */
function findBytes(hay: Uint8Array, needle: string, from: number, to: number): number {
  const n = needle.length
  const end = Math.min(to, hay.length) - n
  for (let i = Math.max(0, from); i <= end; i++) {
    let hit = true
    for (let j = 0; j < n; j++) {
      if (hay[i + j] !== needle.charCodeAt(j)) {
        hit = false
        break
      }
    }
    if (hit) return i
  }
  return -1
}

/** PDF 魔数 %PDF-：规范允许文件头有少量垃圾，取前 1KB 内首次出现 */
function findPdfMagic(bytes: Uint8Array): number {
  return findBytes(bytes, '%PDF-', 0, Math.min(bytes.length, 1024))
}

function isPdfWhitespace(b: number | undefined): boolean {
  return b === 0x20 || b === 0x09 || b === 0x0a || b === 0x0d || b === 0x00 || b === 0x0c
}
