/**
 * [SR-SVC-09] tags.service —— 标签用例（工单：done / weak + P7E-01 + F-TAGS-02）
 *
 * ── 行为层 ──
 * - list({folderId})：repos.tags.listWithCounts(folderId)（域内列表——019 起标签
 *   按文件夹完全隔离）
 * - upsert({folderId, name})：去空格；trim 空 INVALID_REQUEST（B7）；幂等命中
 *   既有行直返（限「建」不限「查」）；域内已达 TAG_LIBRARY_MAX（20）→CONFLICT
 *   「域内标签已达上限（20），请先清理再新建」（2026-10-08 晨裁决：满禁建+
 *   提示清理）；否则 upsertByName（TOCTOU 无虞——单连接同步）
 * - attach({paperId, tagId})：findById 缺席→NOT_FOUND「标签不存在」（预检先行，
 *   域违约与缺席分流清晰）→已挂检查=isAttached (paperId,tagId) id 键〔回炉轮 1
 *   R1——名键跨域同名 tagId 误判已挂=伪成功逃逸触发器错误面〕→已挂 ok 幂等直返
 *   →已达 TAG_PER_PAPER_MAX（6，namesByPaper 计数）→CONFLICT
 *   「每篇文献最多 6 个标签」（晨裁决：硬禁，幂等重挂不触）→否则 attach
 *   （域不一致由 019 触发器 ABORT 自然抛——service 不重复预检，双源必漂移）
 * - detach：转调 repo 后返回 { ok: true }
 * - 生命周期三操作（P7E-01，错误语义归 service、数据事实归 repo）：
 *   rename：trim 空→INVALID_REQUEST；findById 取域→缺席 NOT_FOUND；域内
 *   findByName 冲突→CONFLICT（不自动合并——数据语义变更必须显式走 merge）；
 *   与自身现名相同→幂等成功（repo 的 changes 在该情形可能为 0，不作
 *   NOT_FOUND 信号）
 *   merge：自身→INVALID_REQUEST；源/目标任一缺席→NOT_FOUND（先源后目标，
 *   消息带标签 id）；[F-TAGS-02] 域不同→INVALID_REQUEST「跨域标签不可合并」
 *   （完全隔离——2026-10-08 晨裁决）；成功转调 repo 三步事务
 *   delete：缺席→NOT_FOUND；成功转调 repo 两步事务
 * - setColor（F-TAGS-01）：小写正规化→格式校验 INVALID_REQUEST→存在性
 *   NOT_FOUND（findById——rename/delete 同序）→repo setColor；null=恢复默认
 *   直通；返回更新后 Tag（color 必携）
 *
 * ── 接口层 ──
 * - export function createTagsService(deps: { repos: Repos }): ApiHandlers['tags']
 *
 * ── 架构层 ──
 * - [F-TAGS-02/DB-1 U4] 存在性/域来源预检经 repo findById（id→行+域读取单源
 *   ——原「listWithCounts 全量 id」注记随域化作废：域化后无全量面）；限额常量
 *   单源=shared/models/tag（TAG_LIBRARY_MAX/TAG_PER_PAPER_MAX——错误文案同源）；
 *   挂接域一致性=表级不变量 INV-126（019 触发器+moveFolder 摘挂接步承载，
 *   service 不重复域预检）
 * - better-sqlite3 同步单连接，预检与写入之间无交错
 * - TagsDomainError：services/shared/domain-error 基类一行继承（F-DEDUP-01
 *   单源），register 经 toAppError 折叠为 AppError 透传 renderer
 *
 * ── 生命周期层 ──
 * - 改名/合并/删除已实现（P7E-01）；域化限额与跨域拒（F-TAGS-02/DB-1 U4）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/services/tags.service.test.ts（已锁定，repos 桩）
 *   + tests/unit/services/tags-lifecycle.service.test.ts（P7E-01，always-active）
 *   + tests/unit/services/tags-domain-limits.service.test.ts（U4 限额/域守卫）
 */
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { Repos } from '../db/repos'
import { TAG_LIBRARY_MAX, TAG_PER_PAPER_MAX } from '../../shared/models/tag'
import { DomainError } from './shared/domain-error'

/** 域错误载体（rename/merge/delete 的校验序拒绝；基类一行继承） */
class TagsDomainError extends DomainError {}

export function createTagsService(deps: { repos: Repos }): ApiHandlers['tags'] {
  const { tags } = deps.repos

  return {
    async list(req) {
      return tags.listWithCounts(req.folderId)
    },

    // 同名幂等由 repo 的 upsertByName 保证；service 只做输入清理（去首尾空格；
    // trim 后空串拒绝——B7/AUDIT-B W1）+域内上限（晨裁决：限「建」不限「查」
    // ——幂等命中既有行直返不触限额）
    async upsert(req) {
      const name = req.name.trim()
      if (name === '') {
        throw new TagsDomainError('INVALID_REQUEST', '标签名不能为空')
      }
      const existing = tags.findByName(req.folderId, name)
      if (existing !== undefined) {
        return existing
      }
      if (tags.listWithCounts(req.folderId).length >= TAG_LIBRARY_MAX) {
        throw new TagsDomainError(
          'CONFLICT',
          `域内标签已达上限（${TAG_LIBRARY_MAX}），请先清理再新建`
        )
      }
      return tags.upsertByName(req.folderId, name)
    },

    // 已挂幂等=isAttached (paperId, tagId) id 键（回炉轮 1 R1——名键在跨域同名
    // tagId 下误判已挂=伪成功逃逸触发器错误面）；每篇计数限额沿 namesByPaper；
    // 域不一致由 019 触发器 ABORT 兜底（service 不重复预检，双源必漂移）。
    // [F-DBCAMP-01 DB-4 / R3] 预检次序=NOT_FOUND→限额→attach→触发器域违约
    // 最后兜底（既有次序天然，无重排）；触发器 RAISE 文本在此折叠为结构化
    // CONFLICT（词表零新增——APP_ERROR_CODES 封闭枚举不动）
    async attach(req) {
      const tag = tags.findById(req.tagId)
      if (tag === undefined) {
        throw new TagsDomainError('NOT_FOUND', '标签不存在')
      }
      if (tags.isAttached(req.paperId, req.tagId)) {
        return { ok: true as const }
      }
      const attached = tags.namesByPaper(req.paperId)
      if (attached.length >= TAG_PER_PAPER_MAX) {
        throw new TagsDomainError('CONFLICT', `每篇文献最多 ${TAG_PER_PAPER_MAX} 个标签`)
      }
      try {
        tags.attach(req.paperId, req.tagId)
      } catch (e) {
        // [R3] 019 paper_tags_domain_guard 触发器 ABORT（better-sqlite3
        // SqliteError.message 携 RAISE 文本）→结构化域错误；其余错误原样
        // 上抛（非域违约面不折叠不吞）
        if (e instanceof Error && e.message.includes('paper_tags 挂接域违约')) {
          throw new TagsDomainError('CONFLICT', '标签与文献不在同一文件夹域——无法挂接')
        }
        throw e
      }
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
      // [F-TAGS-02/DB-1 U4] findById 取行+域（原 listWithCounts 全量 find 随域化
      // 换源）；rename 不改 color，回传携带预检行的现色
      const existing = tags.findById(req.tagId)
      if (existing === undefined) {
        throw new TagsDomainError('NOT_FOUND', '标签不存在')
      }
      const clash = tags.findByName(existing.folderId, name)
      if (clash !== undefined && clash.id !== req.tagId) {
        // 不自动合并：同名占用必须显式走 merge 通道（数据语义变更）
        throw new TagsDomainError('CONFLICT', '标签名已被占用')
      }
      tags.renameTag(req.tagId, name)
      // 冲突已排除：同名行只能是自身——直接构造更新后 Tag（幂等路径亦成立）
      return { id: req.tagId, name, color: existing.color }
    },

    async merge(req) {
      if (req.sourceId === req.targetId) {
        throw new TagsDomainError('INVALID_REQUEST', '不能合并到自身')
      }
      const source = tags.findById(req.sourceId)
      if (source === undefined) {
        throw new TagsDomainError('NOT_FOUND', `合并源标签不存在：${req.sourceId}`)
      }
      const target = tags.findById(req.targetId)
      if (target === undefined) {
        throw new TagsDomainError('NOT_FOUND', `合并目标标签不存在：${req.targetId}`)
      }
      // [F-TAGS-02] 完全隔离：跨域不可合并（019 触发器对迁挂接兜底 ABORT）
      if (source.folderId !== target.folderId) {
        throw new TagsDomainError('INVALID_REQUEST', '跨域标签不可合并')
      }
      tags.mergeTags(req.sourceId, req.targetId)
      return { ok: true as const }
    },

    async delete(req) {
      if (tags.findById(req.tagId) === undefined) {
        throw new TagsDomainError('NOT_FOUND', '标签不存在')
      }
      tags.deleteTag(req.tagId)
      return { ok: true as const }
    },

    // [F-TAGS-01] 颜色身份：正规化（小写化——IPC 面 zod 已限小写 pattern，
    // 直调防御同口径）→ 格式校验 → 存在性预检（findById——rename/delete 同序）
    // → 落库；null=恢复默认直通。返回更新后 Tag（wire 真相=color 必携）
    async setColor(req) {
      const color = req.color === null ? null : req.color.toLowerCase()
      if (color !== null && !/^#[0-9a-f]{6}$/.test(color)) {
        throw new TagsDomainError('INVALID_REQUEST', '标签颜色格式不正确')
      }
      const existing = tags.findById(req.tagId)
      if (existing === undefined) {
        throw new TagsDomainError('NOT_FOUND', '标签不存在')
      }
      tags.setColor(req.tagId, color)
      return { id: existing.id, name: existing.name, color }
    }
  }
}
