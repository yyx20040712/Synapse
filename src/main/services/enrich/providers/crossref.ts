/**
 * [SR-NET-01] crossref provider —— CrossRef REST 封装（工单：open / weak）
 *
 * ── 行为层 ──
 * - byDoi(doi)：GET https://api.crossref.org/works/{doi}（URL 编码 doi）
 * - byTitle(title)：GET https://api.crossref.org/works?query.bibliographic={title}&rows=5
 *   取 score 最高且标题相似度（小写去空格包含比对）≥阈值的一项，否则 null
 *
 * ── 接口层 ──
 * - export interface EnrichedWork { title; authors: string[]; year: number|null;
 *     venue: string; doi: string|null; abstract: string }
 * - export function createCrossrefProvider(deps: { fetchJson: typeof fetchJson<T> 简化为
 *     (url: string, schema: z.ZodType) => Promise<unknown> }): {
 *     byDoi(doi: string): Promise<EnrichedWork | null>;
 *     byTitle(title: string): Promise<EnrichedWork | null>
 *   }
 *
 * ── 架构层 ──
 * - 响应 zod schema 在本文件定义（message.message.work 形状，宽松 optional 字段）
 * - abstract 里 CrossRef 的 JATS 标签要剥掉（<jats:p> 等 replace 正则）
 * - authors：message.author[].family+given 拼接（缺谁用谁）
 * - venue 优先 container-title[0]，回落 type
 * - 404（DOI 不存在）→ 返回 null 而不是抛错；其余 HTTP 错原样抛。
 *   实现：catch (e) { if (e instanceof HttpFetchError && e.status === 404) return null; throw e }
 *   （HttpFetchError 从 http/http-client import，带 status 字段）
 *
 * ── 生命周期层 ──
 * - 不做：分页/游标/引用关系（v2）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/services/providers/crossref.test.ts（已锁定，fetchJson 桩）
 */
import type { z } from 'zod'
import { unimplementedObject } from '../../../../shared/app-error'

export interface EnrichedWork {
  title: string
  authors: string[]
  year: number | null
  venue: string
  doi: string | null
  abstract: string
}

export interface CrossrefProvider {
  byDoi(doi: string): Promise<EnrichedWork | null>
  byTitle(title: string): Promise<EnrichedWork | null>
}

export function createCrossrefProvider(_deps: {
  fetchJson: (url: string, schema: z.ZodType) => Promise<unknown>
}): CrossrefProvider {
  return unimplementedObject<CrossrefProvider>('SR-NET-01', 'crossref.provider')
}
