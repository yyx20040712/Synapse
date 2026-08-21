/**
 * [SR-NET-02] openalex provider —— OpenAlex REST 封装（工单：open / weak）
 *
 * ── 行为层 ──
 * - byTitle(title)：GET https://api.openalex.org/works?search={title}&per-page=5
 *   取 relevance_score 最高一项，标题相似度比对不通过则 null
 * - 兼容 arXiv：命中结果的 primary_location/arxiv_id（记入返回的 arxivId 字段）
 *
 * ── 接口层 ──
 * - export interface OpenalexWork extends EnrichedWork { arxivId: string | null }
 * - export function createOpenalexProvider(deps: { fetchJson }): {
 *     byTitle(title: string): Promise<OpenalexWork | null>
 *   }
 *
 * ── 架构层 ──
 * - 响应 zod schema 本文件定义：results[].{display_name, publication_year,
 *   authorships[].author.display_name, primary_location.source.display_name,
 *   doi, abstract_inverted_index, ids.openalex}
 * - abstract_inverted_index 是倒排索引：按词位置还原成正文（遍历 map 词→位置数组，按位置重排）
 * - doi 形如 https://doi.org/10.x/yyy → 去前缀只留 10.x/yyy
 * - 空结果 → null；HTTP 错原样抛
 *
 * ── 生命周期层 ──
 * - 不做：作者实体/机构/引用网络（v2 图谱功能的基础，届时再开）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/services/providers/openalex.test.ts（已锁定；倒排索引还原是重点用例）
 */
import type { z } from 'zod'
import { unimplementedObject } from '../../../../shared/app-error'
import type { EnrichedWork } from './crossref'

export interface OpenalexWork extends EnrichedWork {
  arxivId: string | null
}

export interface OpenalexProvider {
  byTitle(title: string): Promise<OpenalexWork | null>
}

export function createOpenalexProvider(_deps: {
  fetchJson: (url: string, schema: z.ZodType) => Promise<unknown>
}): OpenalexProvider {
  return unimplementedObject<OpenalexProvider>('SR-NET-02', 'openalex.provider')
}
