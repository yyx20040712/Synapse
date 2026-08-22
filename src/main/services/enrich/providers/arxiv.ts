/**
 * [SR-NET-03] arxiv provider —— arXiv Atom API 封装（工单：done / weak）
 *
 * ── 行为层 ──
 * - byId(arxivId)：GET export.arxiv.org 的 Atom query 接口（id_list=指定 id，
 *   查询串经 URLSearchParams 参数化构造；id 形如 2401.12345 或 2401.12345v2）
 * - 解析 Atom XML（fetchText 抓取，本文件内静态正则解析：<entry> 块内的
 *   <title>、<name>（多个 <author>）、<published>（取年份）、<summary>）
 * - 无 <entry>（不存在）→ null；HTTP 错原样抛
 *
 * ── 接口层 ──
 * - export interface ArxivWork { title; authors: string[]; year: number|null;
 *     abstract: string; arxivId: string }
 * - export function createArxivProvider(deps: { fetchText }): ArxivProvider
 *
 * ── 架构层 ──
 * - main 进程无 DOMParser，静态正则解析（Atom 结构稳定且只取五个字段）
 * - XML 转义反转义（&amp; &lt; &gt; &quot; &#39;）；summary 空白规整为单空格
 * - host 白名单由 http-client 强制（export.arxiv.org 在 src/shared/constants）
 *
 * ── 生命周期层 ──
 * - 不做：全文下载（负面清单：PDF 下载管线不做）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/services/providers/arxiv.test.ts（已锁定，fetchText 桩返回固定 Atom 文本）
 */

export interface ArxivWork {
  title: string
  authors: string[]
  year: number | null
  abstract: string
  arxivId: string
}

export interface ArxivProvider {
  byId(arxivId: string): Promise<ArxivWork | null>
}

/** XML 实体反转义（Atom 五个预定义实体；&amp; 最后还原避免双重解码） */
function unescapeXml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}

/** 首尾与内部多余空白压为单空格（summary 常带缩进换行） */
function collapseSpace(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

const TITLE_RE = /<title>([\s\S]*?)<\/title>/
const SUMMARY_RE = /<summary>([\s\S]*?)<\/summary>/
const PUBLISHED_RE = /<published>([\s\S]*?)<\/published>/
const AUTHOR_NAME_RE = /<author>\s*<name>([\s\S]*?)<\/name>/g

export function createArxivProvider(deps: {
  fetchText: (url: string) => Promise<string>
}): ArxivProvider {
  return {
    async byId(arxivId) {
      const query = new URLSearchParams({ id_list: arxivId }).toString()
      const xml = await deps.fetchText(`https://export.arxiv.org/api/query?${query}`)
      const entry = /<entry>([\s\S]*?)<\/entry>/.exec(xml)
      if (entry === null || entry[1] === undefined) {
        return null
      }
      const block: string = entry[1]
      const title = TITLE_RE.exec(block)?.[1]
      const summary = SUMMARY_RE.exec(block)?.[1]
      const published = PUBLISHED_RE.exec(block)?.[1]
      const authors = [...block.matchAll(AUTHOR_NAME_RE)].map((m) => {
        const name: string = m[1] ?? ''
        return collapseSpace(unescapeXml(name))
      })
      const yearText = published === undefined ? undefined : /(\d{4})/.exec(published)?.[1]
      return {
        title: title === undefined ? '' : collapseSpace(unescapeXml(title)),
        authors,
        year: yearText === undefined ? null : Number.parseInt(yearText, 10),
        abstract: summary === undefined ? '' : collapseSpace(unescapeXml(summary)),
        arxivId
      }
    }
  }
}
