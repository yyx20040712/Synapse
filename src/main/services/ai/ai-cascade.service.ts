/**
 * [F-DBCAMP-01 DB-2 U2] ai-cascade.service —— 随锚级联预览计数（删除两次确认
 * 第一跳）。
 *
 * ── 行为层 ──
 * - previewCounts({scope:'paper'|'folder', anchorId})：锚存在性前置（paper→
 *   papers.id / folder→collections.id——anchorExists 多态锚单源承载，folder=
 *   AI 域内 lineage 档的 UI 语）→ repo 计数直投。会话计数=全部会话行**含空会话**
 *   （N-4 诚实计数）；folder 分支=双面合计（夹内 papers 的 paper 档四计数+该夹
 *   id 的 lineage 档四计数——repo 单聚合语句承载）。
 * - **P2 预裁：本服务不写删除方法**——级联删除本体=020 迁移 papers/
 *   collections_ai_anchor_cascade 触发器（设计稿 §1.6 字面的级联行为=触发器
 *   承载），删除路径经既有 papers/delete、folders/delete 通道（U6 接 UI 第二窗）；
 *   本面只做删前计数诚实呈现。
 *
 * ── 架构层 ──
 * - SQL 全在 repo（ai-cascade.repo）；锚存在性经 aiSessions.anchorExists 复用
 *   （零新查询面）；错误语义 AiDomainError 复用既有三码。
 *
 * ── 文化层 ──
 * - 测试：tests/unit/services/ai-cascade.service.test.ts（always-active 真库——
 *   W-5 folder 双面级联行为用例锁触发器契约）。
 */
import type { Repos } from '../../db/repos'
import type { AiCascadeCounts } from '../../../shared/models/ai-domain'
import { AiDomainError } from './ai-sessions.service'

export interface AiCascadeService {
  previewCounts(req: { scope: 'paper' | 'folder'; anchorId: string }): Promise<AiCascadeCounts>
}

export function createAiCascadeService(deps: { repos: Repos }): AiCascadeService {
  const { aiCascade, aiSessions } = deps.repos
  return {
    async previewCounts(req) {
      // 锚存在性前置（folder→collections.id：anchorExists 的 lineage 档映射）
      const anchorScope = req.scope === 'paper' ? 'paper' : 'lineage'
      if (!aiSessions.anchorExists(anchorScope, req.anchorId)) {
        throw new AiDomainError(
          'NOT_FOUND',
          req.scope === 'paper' ? '锚定文献不存在' : '锚定文件夹不存在'
        )
      }
      return req.scope === 'paper'
        ? aiCascade.countPaperAnchor(req.anchorId)
        : aiCascade.countFolder(req.anchorId)
    }
  }
}
