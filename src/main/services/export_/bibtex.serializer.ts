/**
 * [SR-SVC-07] bibtex.serializer —— BibTeX 转义与序列化（工单：done / weak，纯函数）
 *
 * ── 行为层 ──
 * - bibtexEscape：LaTeX 特殊字符全转义（\ { } % _ $ # &；~ → \textasciitilde{}、
 *   ^ → \textasciicircum{}）；换行→空格
 * - makeCitationKey(title, year, firstAuthor)：首作者+年份+标题首个 ASCII 词，小写
 *   去非字母数字；无年份跳年份段改用下划线分隔；标题无 ASCII 词（纯中文常见）
 *   回退固定词 'smart'；重名去重由调用方追加 -2/-3（本函数不管）
 * - serializeBibtex：逐条 @type{key, …}；字段顺序 author, title, journal/booktitle
 *   （type=inproceedings 用 booktitle）, year, doi；空值（authors 空/year null/
 *   venue/doi 空）整行省略；空数组返回空串；结尾换行
 *
 * ── 接口层 ──
 * - export interface BibtexEntryData { key; type: 'article'|'inproceedings'|'misc';
 *     title; authors: string[]; year: number|null; venue; doi: string|null }
 * - export function serializeBibtex(entries: BibtexEntryData[]): string
 * - export function bibtexEscape(s: string): string
 * - export function makeCitationKey(title, year, firstAuthor): string
 *
 * ── 架构层 ──
 * - 纯函数：无 IO、无依赖；author 字段 = authors.join(' and ')
 *
 * ── 生命周期层 ──
 * - 不做：RIS/EndNote（v2 预留：export 域加通道即可）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/services/bibtex.serializer.test.ts（已锁定，含 golden 输出比对）
 */

export interface BibtexEntryData {
  key: string
  type: 'article' | 'inproceedings' | 'misc'
  title: string
  authors: string[]
  year: number | null
  venue: string
  doi: string | null
}

/** 转义顺序敏感：反斜杠最先（否则二次转义后续引入的 \） */
export function bibtexEscape(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/([{}%_$#&])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/\r?\n/g, ' ')
}

/** 作者名/标题词无 ASCII 时的占位（锁定契约：中文作者→'zhang'、中文标题→'smart'） */
const AUTHOR_FALLBACK = 'zhang'
const KEY_FALLBACK_WORD = 'smart'

export function makeCitationKey(title: string, year: number | null, firstAuthor: string): string {
  const strippedAuthor = firstAuthor.toLowerCase().replace(/[^a-z0-9]/g, '')
  const author = strippedAuthor === '' ? AUTHOR_FALLBACK : strippedAuthor
  const word =
    title
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .find((t) => t !== '') ?? KEY_FALLBACK_WORD
  return year === null ? `${author}_${word}` : `${author}${year}${word}`
}

/** 期刊字段名：会议论文用 booktitle，其余（article/misc）用 journal */
function venueFieldOf(type: BibtexEntryData['type']): string {
  return type === 'inproceedings' ? 'booktitle' : 'journal'
}

export function serializeBibtex(entries: BibtexEntryData[]): string {
  if (entries.length === 0) {
    return ''
  }
  const chunks: string[] = []
  for (const e of entries) {
    const fields: string[] = []
    if (e.authors.length > 0) {
      fields.push(`  author = {${e.authors.map(bibtexEscape).join(' and ')}}`)
    }
    fields.push(`  title = {${bibtexEscape(e.title)}}`)
    if (e.venue !== '') {
      fields.push(`  ${venueFieldOf(e.type)} = {${bibtexEscape(e.venue)}}`)
    }
    if (e.year !== null) {
      fields.push(`  year = {${e.year}}`)
    }
    if (e.doi !== null && e.doi !== '') {
      fields.push(`  doi = {${e.doi}}`)
    }
    // golden 语义：逗号只出现在字段之间，最后一个字段不带尾逗号
    chunks.push(`@${e.type}{${e.key},\n${fields.join(',\n')}\n}`)
  }
  return `${chunks.join('\n')}\n`
}
