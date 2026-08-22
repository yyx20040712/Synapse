/**
 * [SR-SVC-09] tags.service —— 标签用例（工单：done / weak）
 *
 * ── 行为层 ──
 * - list：repos.tags.listWithCounts()
 * - upsert：repos.tags.upsertByName（去空格）
 * - attach/detach：转调 repo 后返回 { ok: true }
 *
 * ── 接口层 ──
 * - export function createTagsService(deps: { repos: Repos }): ApiHandlers['tags']
 *
 * ── 架构层 ──
 * - 纯透传薄层（存在的原因：ipc 禁止直连 repos 的分层规则）
 *
 * ── 生命周期层 ──
 * - 不做：改名/合并/删除标签（v2）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/services/tags.service.test.ts（已锁定，repos 桩）
 */
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { Repos } from '../db/repos'

export function createTagsService(deps: { repos: Repos }): ApiHandlers['tags'] {
  const { tags } = deps.repos

  return {
    async list(_req) {
      return tags.listWithCounts()
    },

    // 同名幂等由 repo 的 upsertByName 保证；service 只做输入清理（去首尾空格）
    async upsert(req) {
      return tags.upsertByName(req.name.trim())
    },

    // INSERT OR IGNORE：重复挂接幂等，无需存在性分支
    async attach(req) {
      tags.attach(req.paperId, req.tagId)
      return { ok: true as const }
    },

    async detach(req) {
      tags.detach(req.paperId, req.tagId)
      return { ok: true as const }
    }
  }
}
