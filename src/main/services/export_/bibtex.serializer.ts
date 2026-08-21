/**
 * [SR-SVC-07] bibtex.serializer —— BibTeX 序列化纯函数（工单：open / weak）
 *
 * ── 行为层 ──
 * - serializeBibtex(entries)：逐条生成 @article{...}（无 venue 且 type 为
 *   inproceedings 时用 @inproceedings；否则 @article/兜底 @misc）
 * - 字段顺序固定：author, title, journal/booktitle, year, doi, abstract（截断到 500 字符）
 * - bibtexEscape：转义 LaTeX 特殊字符 { } \ % $ # _ & ~ ^（~ → \textasciitilde{},
 *   ^ → \textasciicircum{}）；换行→空格
 * - makeCitationKey(title, year, firstAuthor)：Firstauthor + Year + 标题首个英文词，
 *   全小写去非字母数字；重名去重由调用方追加 -2/-3（本函数不管）
 *
 * ── 接口层 ──
 * - export interface BibtexEntryData { key: string; type: 'article'|'inproceedings'|'misc';
 *     title: string; authors: string[]; year: number|null; venue: string; doi: string|null }
 * - export function serializeBibtex(entries: BibtexEntryData[]): string
 * - export function bibtexEscape(s: string): string
 * - export function makeCitationKey(title: string, year: number|null, firstAuthor: string): string
 *
 * ── 架构层 ──
 * - 纯函数：无 IO、无依赖（除类型）；author 字段 = authors.join(' and ')
 * - 空数组 → 空串；字段缺失（year null 等）省略该行
 *
 * ── 生命周期层 ──
 * - 不做：RIS/EndNote（v2 预留：export 域加通道即可）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/services/bibtex.serializer.test.ts（已锁定，含 golden 输出比对）
 */
import { NotImplementedError } from '../../../shared/app-error'

export interface BibtexEntryData {
  key: string
  type: 'article' | 'inproceedings' | 'misc'
  title: string
  authors: string[]
  year: number | null
  venue: string
  doi: string | null
}

export function serializeBibtex(_entries: BibtexEntryData[]): string {
  throw new NotImplementedError('SR-SVC-07', 'bibtex 序列化')
}

export function bibtexEscape(_s: string): string {
  throw new NotImplementedError('SR-SVC-07', 'bibtex 转义')
}

export function makeCitationKey(_title: string, _year: number | null, _firstAuthor: string): string {
  throw new NotImplementedError('SR-SVC-07', 'citation key 生成')
}
