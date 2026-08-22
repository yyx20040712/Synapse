/**
 * [SR-NET-02] openalex provider —— OpenAlex REST 封装（工单：done / weak）
 *
 * ── 行为层 ──
 * - byTitle(title)：GET https://api.openalex.org/works?search={title}&per-page=5
 *   取首个结果（相关性序），标题相似度比对不通过则 null
 * - 兼容 arXiv：命中结果的 primary_location.arxiv_id（记入返回的 arxivId 字段）
 *
 * ── 接口层 ──
 * - export interface OpenalexWork extends EnrichedWork { arxivId: string | null }
 * - export function createOpenalexProvider(deps: { fetchJson }): OpenalexProvider
 *
 * ── 架构层 ──
 * - 响应 zod schema 本文件定义；abstract_inverted_index 倒排索引按词位置还原正文
 * - doi 形如 https://doi.org/10.x/yyy → 去前缀只留 10.x/yyy
 * - 空结果 → null；HTTP 错原样抛（运行时 fetchJson 已含白名单/重试）
 *
 * ── 生命周期层 ──
 * - 不做：作者实体/机构/引用网络（v2 图谱功能的基础，届时再开）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/services/providers/openalex.test.ts（已锁定；倒排索引还原是重点用例）
 */
import { z } from 'zod'
import type { EnrichedWork } from './crossref'

export interface OpenalexWork extends EnrichedWork {
  arxivId: string | null
}

export interface OpenalexProvider {
  byTitle(title: string): Promise<OpenalexWork | null>
}

const resultSchema = z.object({
  display_name: z.string(),
  publication_year: z.number().nullable().optional(),
  authorships: z.array(z.object({ author: z.object({ display_name: z.string() }) })).default([]),
  primary_location: z
    .object({
      source: z.object({ display_name: z.string() }).nullable().optional(),
      arxiv_id: z.string().nullable().optional()
    })
    .nullable()
    .optional(),
  doi: z.string().nullable().optional(),
  abstract_inverted_index: z.record(z.string(), z.array(z.number().int())).nullable().optional()
})

const responseSchema = z.object({ results: z.array(z.unknown()).default([]) })

/** 倒排索引 {词: [位置...]} → 按位置重排还原正文 */
function invertAbstract(index: Record<string, number[]>): string {
  const slots: string[] = []
  for (const [word, positions] of Object.entries(index)) {
    for (const p of positions) {
      slots[p] = word
    }
  }
  return slots.filter((w) => w !== undefined).join(' ')
}

/** https://doi.org/10.x/yyy → 10.x/yyy */
function trimDoiPrefix(doi: string | null | undefined): string | null {
  if (doi === null || doi === undefined) return null
  return doi.replace(/^https:\/\/doi\.org\//, '')
}

function toWork(r: z.infer<typeof resultSchema>): OpenalexWork {
  return {
    title: r.display_name,
    authors: r.authorships.map((a) => a.author.display_name),
    year: r.publication_year ?? null,
    venue: r.primary_location?.source?.display_name ?? '',
    doi: trimDoiPrefix(r.doi),
    abstract:
      r.abstract_inverted_index === undefined || r.abstract_inverted_index === null
        ? ''
        : invertAbstract(r.abstract_inverted_index),
    arxivId: r.primary_location?.arxiv_id ?? null
  }
}

export function createOpenalexProvider(deps: {
  fetchJson: (url: string, schema: z.ZodType) => Promise<unknown>
}): OpenalexProvider {
  return {
    async byTitle(title) {
      const raw = await deps.fetchJson(
        `https://api.openalex.org/works?search=${encodeURIComponent(title)}&per-page=5`,
        responseSchema
      )
      const body = responseSchema.parse(raw)
      const first = body.results[0]
      if (first === undefined) return null
      const r = resultSchema.parse(first)
      const norm = (s: string): string => s.toLowerCase().replace(/\s+/g, '')
      const q = norm(title)
      const c = norm(r.display_name)
      if (q === '' || c === '' || (!c.includes(q) && !q.includes(c))) return null
      return toWork(r)
    }
  }
}
