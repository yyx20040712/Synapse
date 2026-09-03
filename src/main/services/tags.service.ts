/**
 * [SR-SVC-09] tags.service —— 标签用例（工单：done / weak + P7E-01）
 *
 * ── 行为层 ──
 * - list：repos.tags.listWithCounts()
 * - upsert：repos.tags.upsertByName（去空格）
 * - attach/detach：转调 repo 后返回 { ok: true }
 * - 生命周期三操作（P7E-01，错误语义归 service、数据事实归 repo）：
 *   rename：trim 空→INVALID_REQUEST；tagId 不存在→NOT_FOUND；与其他标签
 *   同名→CONFLICT（不自动合并——数据语义变更必须显式走 merge）；与自身
 *   现名相同→幂等成功（repo 的 changes 在该情形可能为 0，不作 NOT_FOUND 信号）
 *   merge：自身→INVALID_REQUEST；源/目标任一不存在→NOT_FOUND（先源后目标，
 *   消息带标签 id）；成功转调 repo 三步事务
 *   delete：不存在→NOT_FOUND；成功转调 repo 两步事务
 *
 * ── 接口层 ──
 * - export function createTagsService(deps: { repos: Repos }): ApiHandlers['tags']
 *
 * ── 架构层 ──
 * - 存在性预检经 listWithCounts（携带全量 id；本地单用户小表——repo 面保持
 *   票面四方法不增 findById）；better-sqlite3 同步单连接，预检与写入之间无交错
 * - TagsDomainError：Error+readonly code: AppErrorCode（NotesDomainError 同型），
 *   register 经 toAppError 折叠为 AppError 透传 renderer
 *
 * ── 生命周期层 ──
 * - 改名/合并/删除已实现（P7E-01——原「v2 预留」注记兑现）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/services/tags.service.test.ts（已锁定，repos 桩）
 *   + tests/unit/services/tags-lifecycle.service.test.ts（P7E-01，always-active）
 */
import type { AppErrorCode } from '../../shared/app-error'
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { Repos } from '../db/repos'

/** 域错误载体（rename/merge/delete 的校验序拒绝；与 notes 域 DomainError 同构） */
class TagsDomainError extends Error {
  readonly code: AppErrorCode

  constructor(code: AppErrorCode, message: string) {
    super(message)
    this.name = 'TagsDomainError'
    this.code = code
  }
}

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
    },

    async rename(req) {
      const name = req.name.trim()
      if (name === '') {
        // zod min(1) 拦不住纯空格——service 防御（票面校验序第 1 步）
        throw new TagsDomainError('INVALID_REQUEST', '标签名不能为空')
      }
      if (!tags.listWithCounts().some((t) => t.id === req.tagId)) {
        throw new TagsDomainError('NOT_FOUND', '标签不存在')
      }
      const clash = tags.findByName(name)
      if (clash !== undefined && clash.id !== req.tagId) {
        // 不自动合并：同名占用必须显式走 merge 通道（数据语义变更）
        throw new TagsDomainError('CONFLICT', '标签名已被占用')
      }
      tags.renameTag(req.tagId, name)
      // 冲突已排除：同名行只能是自身——直接构造更新后 Tag（幂等路径亦成立）
      return { id: req.tagId, name }
    },

    async merge(req) {
      if (req.sourceId === req.targetId) {
        throw new TagsDomainError('INVALID_REQUEST', '不能合并到自身')
      }
      const ids = new Set(tags.listWithCounts().map((t) => t.id))
      if (!ids.has(req.sourceId)) {
        throw new TagsDomainError('NOT_FOUND', `合并源标签不存在：${req.sourceId}`)
      }
      if (!ids.has(req.targetId)) {
        throw new TagsDomainError('NOT_FOUND', `合并目标标签不存在：${req.targetId}`)
      }
      tags.mergeTags(req.sourceId, req.targetId)
      return { ok: true as const }
    },

    async delete(req) {
      if (!tags.listWithCounts().some((t) => t.id === req.tagId)) {
        throw new TagsDomainError('NOT_FOUND', '标签不存在')
      }
      tags.deleteTag(req.tagId)
      return { ok: true as const }
    }
  }
}
