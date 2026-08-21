/**
 * [SR-SVC-05] enrich.service —— 元数据增强编排（工单：open / weak）
 *
 * ── 行为层 ──
 * - enrichPaper(paperId)：只对该篇文献执行——
 *   1) 有 doi → crossref.byDoi；命中即回写（source='crossref'）
 *   2) 未命中 → openalex.byTitle(title)；命中回写（source='openalex'）
 *   3) 有 arxivId 或 openalex 命中 arXiv 灌木 → arxiv.byId 补充
 *   4) 全部未命中 → enrich_status='failed'（不覆盖已有字段）
 *   5) 成功 → enrich_status='done'；返回最新 PaperDetail
 * - 回写只填"当前为空的字段"（用户手填的值优先，source 除外）
 *
 * ── 接口层 ──
 * - export interface EnrichProviders { crossref: CrossrefProvider; openalex: OpenalexProvider;
 *     arxiv: ArxivProvider }（类型从各 provider 文件 import）
 * - export function createEnrichService(deps: {
 *     repos: Repos; providers: EnrichProviders; contactEmail: () => string
 *   }): { enrichPaper(paperId: string): Promise<PaperDetail> }
 *
 * ── 架构层 ──
 * - 上游异常（HttpFetchError）捕获后 enrich_status='failed' 并回写，不向上抛——
 *   增强失败是可预期结果不是异常
 *
 * ── 生命周期层 ──
 * - 不做：批量增强/自动后台任务（安全负面清单：出网仅手动触发）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/services/enrich.service.test.ts（已锁定，providers 用桩）
 */
import { unimplementedObject } from '../../../shared/app-error'
import type { PaperDetail } from '../../../shared/models/paper'
import type { Repos } from '../../db/repos'

export function createEnrichService(_deps: {
  repos: Repos
  providers: unknown
  contactEmail: () => string
}): { enrichPaper(paperId: string): Promise<PaperDetail> } {
  return unimplementedObject<{ enrichPaper(paperId: string): Promise<PaperDetail> }>(
    'SR-SVC-05',
    'enrich.service'
  )
}
