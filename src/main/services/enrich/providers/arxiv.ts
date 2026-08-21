/**
 * [SR-NET-03] arxiv provider —— arXiv Atom API 封装（工单：open / weak）
 *
 * ── 行为层 ──
 * - byId(arxivId)：GET http→https://export.arxiv.org/api/query?id_list={id}
 *   （id 形如 2401.12345 或 2401.12345v2；正斜杠与点保留原样，URL 编码）
 * - 解析 Atom XML（fetchText 抓取，本文件内用正则解析：<entry> 块内的
 *   <title>、<name>（多个 <author>）、<published>（取年份）、<summary>）
 * - 无 <entry>（不存在）→ null；HTTP 错原样抛
 *
 * ── 接口层 ──
 * - export interface ArxivWork { title: string; authors: string[]; year: number|null;
 *     abstract: string; arxivId: string }
 * - export function createArxivProvider(deps: { fetchText: (url: string) => Promise<string> }): {
 *     byId(arxivId: string): Promise<ArxivWork | null>
 *   }
 *
 * ── 架构层 ──
 * - XML 转义反转义（&amp; &lt; &gt; &quot; &#39;）
 * - summary 首尾空白与多余换行规整为单空格
 *
 * ── 生命周期层 ──
 * - 不做：全文下载（负面清单：PDF 下载管线不做）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/services/providers/arxiv.test.ts（已锁定，fetchText 桩返回固定 Atom 文本）
 */
import { unimplementedObject } from '../../../../shared/app-error'

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

export function createArxivProvider(_deps: {
  fetchText: (url: string) => Promise<string>
}): ArxivProvider {
  return unimplementedObject<ArxivProvider>('SR-NET-03', 'arxiv.provider')
}
