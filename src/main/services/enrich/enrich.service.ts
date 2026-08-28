/**
 * [SR-SVC-05] enrich.service —— 元数据增强编排（工单：done / weak）
 *
 * ── 行为层 ──
 * - enrichPaper(paperId)：只对该篇文献执行——
 *   1) 有 doi → crossref.byDoi；命中即回写（source='crossref'）
 *   2) 未命中 → openalex.byTitle(title)；命中回写（source='openalex'）
 *   3) 无 doi 且标题也查空但有 arxivId → arxiv.byId（source='arxiv'）；
 *      命中项带 arxivId 时也用 arxiv 补充空字段
 *   4) 全部未命中 → enrich_status='failed'（source 保持原值，不覆盖已有字段）
 *   5) 成功 → enrich_status='done'；返回最新 PaperDetail
 * - [ENR-01] 瀑布之后经 citedByPatch（刷新决策单源=cited-by.service）
 *   求被引数缓存写值，经 applyEnrichment 第三参独立落库——与元数据结果解耦：
 *   work=null→failed 缓存保留；命中但 citedByCount=null（arxiv/字段缺省）
 *   →done 不写缓存；非 null（含 0）→强制刷新
 * - 回写只填"当前为空的字段"（用户手填的值优先，source 除外）
 *
 * ── 接口层 ──
 * - export interface EnrichProviders { crossref: CrossrefProvider; openalex: OpenalexProvider;
 *     arxiv: ArxivProvider }（类型从各 provider 文件 import）
 * - export function createEnrichService(deps: {
 *     repos: Repos; providers: EnrichProviders; contactEmail: () => string;
 *     now?: () => string（ENR-01 时间源注入——citedBy fetchedAt）
 *   }): { enrichPaper(paperId: string): Promise<PaperDetail> }
 *
 * ── 架构层 ──
 * - 上游异常（HttpFetchError 等）捕获后按 failed 回写，不向上抛——增强失败是
 *   可预期结果不是异常；礼貌池 contactEmail 由 http 层注入（本层不重复传递）
 *
 * ── 生命周期层 ──
 * - 不做：批量增强/自动后台任务（安全负面清单：出网仅手动触发）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/services/enrich.service.test.ts（已锁定，providers 用桩）
 */
import type { PaperSource } from '../../../shared/models/paper'
import type { PaperDetail, PaperMetaPatch } from '../../../shared/models/paper'
import type { AppErrorCode } from '../../../shared/app-error'
import type { Repos } from '../../db/repos'
import type { CrossrefProvider, EnrichedWork } from './providers/crossref'
import type { OpenalexProvider } from './providers/openalex'
import type { ArxivProvider } from './providers/arxiv'
import { citedByPatch } from './cited-by.service'

export interface EnrichProviders {
  crossref: CrossrefProvider
  openalex: OpenalexProvider
  arxiv: ArxivProvider
}

/** 域错误：目标文献不存在（与 library/reader 的 DomainError 同构） */
class EnrichDomainError extends Error {
  readonly code: AppErrorCode

  constructor(code: AppErrorCode, message: string) {
    super(message)
    this.name = 'EnrichDomainError'
    this.code = code
  }
}

/** 增强命中候选（三源统一为 EnrichedWork；openalex/arxiv 附带 arxivId） */
type Candidate = EnrichedWork & { arxivId?: string | null }

/** 只填当前为空的字段（用户手填值优先；title 例外——文件名标题常不可靠，同样只补空） */
function fillEmptyPatch(row: { authors_json: string; year: number | null; venue: string; doi: string | null; abstract: string; title: string }, work: Candidate): PaperMetaPatch {
  const patch: PaperMetaPatch = {}
  if (row.title === '' && work.title !== '') patch.title = work.title
  if (JSON.parse(row.authors_json).length === 0 && work.authors.length > 0) patch.authors = work.authors
  if (row.year === null && work.year !== null) patch.year = work.year
  if (row.venue === '' && work.venue !== '') patch.venue = work.venue
  if (row.doi === null && work.doi !== null) patch.doi = work.doi
  if (row.abstract === '' && work.abstract !== '') patch.abstract = work.abstract
  return patch
}

export function createEnrichService(deps: {
  repos: Repos
  providers: EnrichProviders
  contactEmail: () => string
  /** 时间源（ENR-01——citedBy fetchedAt；corpus.export deps.now 同型先例） */
  now?: () => string
}): { enrichPaper(paperId: string): Promise<PaperDetail> } {
  const { repos, providers } = deps
  const now = deps.now ?? (() => new Date().toISOString())

  return {
    async enrichPaper(paperId) {
      const row = repos.papers.findById(paperId)
      if (row === null) {
        throw new EnrichDomainError('NOT_FOUND', `文献不存在：${paperId}`)
      }

      let work: Candidate | null = null
      let source: PaperSource = row.source
      try {
        if (row.doi !== null) {
          work = await providers.crossref.byDoi(row.doi)
          if (work !== null) source = 'crossref'
        }
        if (work === null && row.title !== '') {
          work = await providers.openalex.byTitle(row.title)
          if (work !== null) source = 'openalex'
        }
        if (work === null && row.arxiv_id !== null) {
          const ax = await providers.arxiv.byId(row.arxiv_id)
          if (ax !== null) {
            // arXiv 命中无 venue/doi，统一到 Candidate 形状（venue 留空待补）；
            // arXiv 响应无被引数（ENR-01——citedByCount 恒 null，不写缓存）
            work = { ...ax, venue: '', doi: null, citedByCount: null }
          }
          if (work !== null) source = 'arxiv'
        }
        // arXiv 补充：命中项带 arxivId 且正文/作者仍空时补齐（失败不影响主结果）
        if (work !== null && work.arxivId !== null && work.arxivId !== undefined) {
          try {
            const extra = await providers.arxiv.byId(work.arxivId)
            if (extra !== null) {
              work = {
                ...work,
                abstract: work.abstract === '' ? extra.abstract : work.abstract,
                authors: work.authors.length === 0 ? extra.authors : work.authors
              }
            }
          } catch {
            // 补充源失败：按已命中的主结果继续
          }
        }
      } catch {
        // 上游异常（网络/HTTP）→ 按未命中处理，走 failed 回写
        work = null
      }

      // ENR-01：瀑布响应自身携带被引数（零新增请求）；刷新决策单源在
      // citedByPatch——null=不写（work=null→failed 保留 / 字段缺省→done 保留）
      const citedBy = citedByPatch(
        work === null ? null : { citedByCount: work.citedByCount },
        source,
        { cited_by_count: row.cited_by_count },
        now
      )
      repos.papers.applyEnrichment(
        paperId,
        {
          source,
          enrichStatus: work !== null ? 'done' : 'failed',
          patch: work === null ? {} : fillEmptyPatch(row, work)
        },
        citedBy ?? undefined
      )
      const detail = repos.papers.detailById(paperId)
      if (detail === null) {
        throw new EnrichDomainError('NOT_FOUND', `文献不存在：${paperId}`)
      }
      return detail
    }
  }
}
