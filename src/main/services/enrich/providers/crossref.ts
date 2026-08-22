/**
 * [SR-NET-01] crossref provider —— CrossRef REST 封装（工单：done / weak）
 *
 * ── 行为层 ──
 * - byDoi(doi)：GET https://api.crossref.org/works/{doi}（URL 编码 doi）
 * - byTitle(title)：GET https://api.crossref.org/works?query.bibliographic={title}&rows=5
 *   取 score 最高（响应序即相关性序）且标题相似度（小写去空格包含比对）通过的一项
 *
 * ── 接口层 ──
 * - export interface EnrichedWork { title; authors: string[]; year: number|null;
 *     venue: string; doi: string|null; abstract: string }
 * - export function createCrossrefProvider(deps: { fetchJson }): CrossrefProvider
 *
 * ── 架构层 ──
 * - 响应 zod schema 在本文件定义（message.message 形状，宽松 optional 字段）
 * - fetchJson 双形状适配：锁定测试桩返回 Response（自行 ok 检查 + json + 校验），
 *   运行时注入 http-client fetchJson（白名单/重试/UA 已处理，返回已校验数据）
 * - 404（DOI 不存在）→ null 而不是抛错；其余 HTTP 错原样抛
 *
 * ── 生命周期层 ──
 * - 不做：分页/游标/引用关系（v2）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/services/providers/crossref.test.ts（已锁定，fetchJson 桩）
 */
import { z } from 'zod'
import { HttpFetchError } from '../../../http/http-client'

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

const workSchema = z.object({
  status: z.string().optional(),
  message: z
    .object({
      title: z.array(z.string()).default([]),
      author: z
        .array(z.object({ family: z.string().optional(), given: z.string().optional() }))
        .default([]),
      issued: z.object({ 'date-parts': z.array(z.array(z.number())).default([]) }).optional(),
      'container-title': z.array(z.string()).default([]),
      type: z.string().optional(),
      DOI: z.string().optional(),
      abstract: z.string().optional()
    })
    .default({})
})

const listSchema = z.object({ message: z.object({ items: z.array(z.unknown()).default([]) }).default({}) })

/** 双形状读取：桩返回 Response，运行时返回已校验数据（见架构层） */
async function readBody(raw: unknown): Promise<unknown> {
  if (raw instanceof Response) {
    if (!raw.ok) {
      throw new HttpFetchError('UPSTREAM_ERROR', `上游返回 HTTP ${raw.status}`, raw.status)
    }
    return raw.json()
  }
  return raw
}

/** 剥掉 CrossRef abstract 里的 JATS 标签（<jats:p> 等），压空白 */
function stripJats(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

/** 小写去空格的包含比对（任一方向命中即算相似） */
function titleSimilar(query: string, candidate: string): boolean {
  const q = query.toLowerCase().replace(/\s+/g, '')
  const c = candidate.toLowerCase().replace(/\s+/g, '')
  return q !== '' && c !== '' && (c.includes(q) || q.includes(c))
}

function toWork(message: z.infer<typeof workSchema>['message']): EnrichedWork {
  return {
    title: message.title[0] ?? '',
    authors: message.author.map((a) =>
      a.family !== undefined && a.given !== undefined ? `${a.family}, ${a.given}` : (a.family ?? a.given ?? '')
    ),
    year: message.issued?.['date-parts'][0]?.[0] ?? null,
    venue: message['container-title'][0] ?? (message.type ?? ''),
    doi: message.DOI ?? null,
    abstract: message.abstract === undefined ? '' : stripJats(message.abstract)
  }
}

export function createCrossrefProvider(deps: {
  fetchJson: (url: string, schema: z.ZodType) => Promise<unknown>
}): CrossrefProvider {
  const fetchJson = deps.fetchJson
  return {
    async byDoi(doi) {
      try {
        const raw = await fetchJson(
          `https://api.crossref.org/works/${encodeURIComponent(doi)}`,
          workSchema
        )
        const parsed = workSchema.parse(await readBody(raw))
        return toWork(parsed.message)
      } catch (e) {
        if (e instanceof HttpFetchError && e.status === 404) return null
        throw e
      }
    },

    async byTitle(title) {
      const raw = await fetchJson(
        `https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(title)}&rows=5`,
        listSchema
      )
      const list = listSchema.parse(await readBody(raw))
      const first = list.message.items[0]
      if (first === undefined) return null
      const work = workSchema.parse({ message: first }).message
      const candidate = work.title[0]
      if (candidate === undefined || !titleSimilar(title, candidate)) return null
      return toWork(work)
    }
  }
}
