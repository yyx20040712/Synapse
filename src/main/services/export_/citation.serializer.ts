/**
 * [B3] citation.serializer —— GB/T 7714 与 APA 引用格式纯序列化（纯函数）
 *
 * ── 行为层 ──
 * - 入口类型 CitationEntryData={title,authors,year,venue,doi}（自 BibtexEntryData
 *   去掉 key/type 的同构面——PaperDetail 元数据无卷期页与文献类型字段，
 *   两格式均不输出卷期页段）
 * - GB/T 7714 顺序编码制单条（**不带 [1] 编号**——单条复制场景编号无意义，
 *   与批量参考文献列表的偏差）：`作者1, 作者2, 作者3, 等. 题名[J]. 期刊名,
 *   年份. DOI: 10.x/y.`
 *   · 作者 ≤3 全列（', ' 连接）；>3 前三+`, 等`
 *   · venue 空→省略 [J] 与期刊段（年份独立成段）；year null→省略年份；
 *     doi 空→省略 DOI 段；作者空→省略作者段；段间 '. ' 连接、句点结尾
 * - APA 第 7 版：`Family, I. I., & Family, I. (年). 题名. 期刊名.
 *   https://doi.org/10.x/y`
 *   · 作者名含空格→西文「名…姓」启发式（姓=末 token，前序 token 逐个
 *     首字母+'.' 缩写）；无空格（CJK 单串）→原样。**启发式局限**：authors
 *     为自由字符串无姓名结构（PaperDetail 契约），「姓, 名缩写.」可能错位
 *     （如复姓/双字名切分）——v1 备案不引入姓名解析依赖
 *   · 作者连接：1 人原样；≥2 人末位 `, & `（两人 `A, & B`、≥3 `A, B, & C`
 *     ——APA 7 参考文献正形，& 前逗号属连接符）；year null→`(n.d.)`；venue/doi 空各段
 *     省略；DOI 段=https://doi.org/ 前缀且**段尾不加句点**（APA 惯例——URL
 *     后句点干扰链接识别），无 DOI 段时终态以句点结尾
 *
 * ── 接口层 ──
 * - export interface CitationEntryData { title; authors: string[]; year: number|null;
 *     venue; doi: string|null }
 * - export function serializeGbt7714(e: CitationEntryData): string
 * - export function serializeApa(e: CitationEntryData): string
 *
 * ── 架构层 ──
 * - 纯函数：无 IO、无依赖（bibtex.serializer 同形态）；bibtex 格式分派不在
 *   本件（export.service buildCitation 统一分派——单条复用 serializeBibtex）
 *
 * ── 生命周期层 ──
 * - 不做：卷期页/文献类型标识（[J] 之外的 [M]/[C] 等——元数据源无此字段）；
 *   作者姓名结构化解析（见行为层启发式局限备案）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/services/citation.serializer.test.ts（golden 逐字锁定）
 */
export interface CitationEntryData {
  title: string
  authors: string[]
  year: number | null
  venue: string
  doi: string | null
}

/** GB/T 7714 作者列：≤3 全列；>3 前三+「, 等」 */
function gbtAuthorList(authors: string[]): string {
  return authors.length > 3 ? `${authors.slice(0, 3).join(', ')}, 等` : authors.join(', ')
}

export function serializeGbt7714(e: CitationEntryData): string {
  const segs: string[] = []
  if (e.authors.length > 0) {
    segs.push(gbtAuthorList(e.authors))
  }
  // venue 在场→[J] 文献类型标识随题名；缺席→纯题名（无 [J]——省略规则）
  segs.push(e.venue !== '' ? `${e.title}[J]` : e.title)
  if (e.venue !== '') {
    segs.push(e.year !== null ? `${e.venue}, ${e.year}` : e.venue)
  } else if (e.year !== null) {
    segs.push(String(e.year))
  }
  if (e.doi !== null && e.doi !== '') {
    segs.push(`DOI: ${e.doi}`)
  }
  return `${segs.join('. ')}.`
}

/** APA 单作者：「名…姓」启发式（含空格→姓=末 token+前序 token 首字母缩写；
 *  无空格=CJK 单串原样——局限见头注） */
function apaAuthorName(name: string): string {
  if (!name.includes(' ')) {
    return name
  }
  const tokens = name.split(/\s+/)
  const family = tokens[tokens.length - 1] ?? name
  const initials = tokens.slice(0, -1).map((t) => `${t.charAt(0)}.`).join(' ')
  return `${family}, ${initials}`
}

/** APA 作者列：1 人原样；≥2 人末位连接 `, & `（APA 7 参考文献正形——
 *  两人亦带 & 前逗号：`A, & B`／`A, B, & C`） */
function apaAuthorList(authors: string[]): string {
  const list = authors.map(apaAuthorName)
  if (list.length <= 1) {
    return list[0] ?? ''
  }
  return `${list.slice(0, -1).join(', ')}, & ${list[list.length - 1]}`
}

export function serializeApa(e: CitationEntryData): string {
  const year = e.year === null ? '(n.d.)' : `(${e.year})`
  const head = e.authors.length > 0 ? `${apaAuthorList(e.authors)} ${year}` : year
  const segs = [head, e.title]
  if (e.venue !== '') {
    segs.push(e.venue)
  }
  const hasDoi = e.doi !== null && e.doi !== ''
  if (hasDoi) {
    segs.push(`https://doi.org/${e.doi}`)
  }
  const joined = segs.join('. ')
  // DOI/URL 段尾不加句点（APA 惯例）；无 DOI 段=终态句点结尾
  return hasDoi ? joined : `${joined}.`
}
