/**
 * [SR-SVC-01] library.service —— 文献库用例（工单：done）
 *
 * ── 行为层 ──
 * - 列表：透传 LibraryQuery 到 papers.searchSummaries；[T3-P5] C5-a join
 *   （listGraph 单次禁 N+1→lineageCatalogNos→当页入脉络行挂
 *   lineage {year, month, catalogNo}，未入脉络整键省略）
 * - 详情：papers.detailById；不存在 → 抛 DomainError（code=NOT_FOUND，
 *   register 经 toAppError 识别 code 字段折叠为 AppError）；
 *   [T3-P3] lineage 关联装配（service 层组合——repo 单一职责不跨表）：
 *   lineage.repo 按 paper_id 查命中节点，命中则挂 lineage
 *   {year, month, edgeCount, catalogNo}（[T3-P5] month 真值透传+catalogNo
 *   短号同源 INV-76——P3 时代「month 恒 null」已摘；edgeCount=双端计数），
 *   未命中整键省略
 * - 元数据编辑：papers.updateMeta（patch 空对象不落库、直接返回现状，
 *   避免无意义地刷新 updated_at）；repo 返回 null = 文献不存在 → NOT_FOUND
 * - 集合列表：collections.list()
 *
 * ── 接口层 ──
 * - export function createLibraryService(deps: { repos: Repos }): ApiHandlers['library']
 *
 * ── 架构层 ──
 * - 只依赖 repos 桶；禁止 import db/connection（ESLint 强制）
 * - 本服务不做 IO（文件/网络都归别的 service）
 *
 * ── 生命周期层 ──
 * - P7E-07 已兑现：智能排序（引用数排序）——librarySortSchema 加 cited_desc
 *   枚举值，sort 经 LibraryQuery 直传 repo 的 ORDER_BY 映射（COALESCE 空值
 *   归零+rowid 决胜）。勘误：原预留注记写「经新 repo 方法」，实际落位=
 *   ORDER_BY 映射扩展（加值向后兼容，无新方法无新迁移）
 * - 不做：删除文献（v1 明确不做，防误删；如需清理走 DB 维护工具）
 *
 * ── 文化层 ──
 * - NOT_FOUND 场景抛 DomainError（F-DEDUP-01 起定义上提 services/shared/
 *   domain-error 单源；本文件 re-export 保既有导出 API 稳定——历史零值导入者，
 *   主控 grep 实证）——register 会经 toAppError 折叠
 * - updateMeta 落库后重读 detailById 返回聚合详情（契约要求 PaperDetail，
 *   而 repo 的 updateMeta 只回原始表行）
 * - 测试：tests/unit/services/library.service.test.ts（已锁定，repo 用内存桩）
 */
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import { lineageCatalogNos } from '../../shared/models/lineage'
import type { Repos } from '../db/repos'
import { DomainError } from './shared/domain-error'

/**
 * 域错误：service 层业务语义（如"资源不存在"）的载体。
 * toAppError 对带合法 code 字段的 Error 会保留 code 与 message 折叠成 AppError，
 * 前端据此按码分支。（定义已上提 shared/domain-error 单源——F-DEDUP-01；
 * 此处 re-export 维持本文件历史导出面。）
 */
export { DomainError }

/** 统一的"文献不存在"错误（detail / updateMeta 共用同一语义与文案） */
function paperNotFound(paperId: string): DomainError {
  return new DomainError('NOT_FOUND', `文献不存在：${paperId}`)
}

export function createLibraryService(deps: { repos: Repos }): ApiHandlers['library'] {
  const { papers, collections, lineage } = deps.repos

  /** [T3-P5] C5 脉络编号 map（lineageCatalogNos 单源——INV-76 呈现时确定性
   *  1..N；与导出 lineage.json 同一计算禁双实现）。调用方自取 listGraph 单次 */
  const catalogNosOf = (nodes: ReturnType<typeof lineage.listGraph>['nodes']): Map<string, number> =>
    lineageCatalogNos(nodes)

  return {
    // 查询已在上游（ipc register）过 zod 校验并补全默认值，此处原样透传；
    // [T3-P5] C5-a join：全图单读一次（禁 N+1）→catalogNo map→当页入脉络
    // 行挂 lineage{year,month,catalogNo}，未入脉络整键省略（页外节点编号
    // 仍占全序位——呈现序语义）
    async list(req) {
      const page = papers.searchSummaries(req)
      const g = lineage.listGraph()
      const nos = catalogNosOf(g.nodes)
      return {
        ...page,
        items: page.items.map((p) => {
          const node = g.nodes.find((n) => n.paperId === p.id)
          const catalogNo = node === undefined ? undefined : nos.get(node.id)
          return node === undefined || catalogNo === undefined
            ? p
            : { ...p, lineage: { year: node.year, month: node.month, catalogNo } }
        })
      }
    },

    async detail(req) {
      const d = papers.detailById(req.paperId)
      if (d === null) throw paperNotFound(req.paperId)
      // [T3-P3] 跨域关联行装配：命中脉络节点才挂 lineage；[T3-P5] month
      // 真值透传（P3 时代恒 null 固定缺省已摘）+catalogNo 短号同源（D-I-3）
      const node = lineage.nodeByPaperId(req.paperId)
      if (node === null) return d
      return {
        ...d,
        lineage: {
          year: node.year,
          month: node.month,
          edgeCount: lineage.edgeCountByNode(node.id),
          // 不可达断言：node 来自 nodeByPaperId，与 listGraph 同库同读，全图
          // 编号必含——无 ?? 0 静默兜底（域外 #000 会把图不一致伪装成合法值）
          catalogNo: catalogNosOf(lineage.listGraph().nodes).get(node.id)!
        }
      }
    },

    async updateMeta(req) {
      // 空 patch：不写库（避免空更新刷动 updated_at），校验存在性后直接返回现状
      if (Object.keys(req.patch).length === 0) {
        const current = papers.detailById(req.paperId)
        if (current === null) throw paperNotFound(req.paperId)
        return current
      }
      // 非空 patch：先落库（null = 目标行不存在），再重读聚合详情满足响应契约
      const row = papers.updateMeta(req.paperId, req.patch)
      if (row === null) throw paperNotFound(req.paperId)
      const updated = papers.detailById(req.paperId)
      if (updated === null) throw paperNotFound(req.paperId)
      return updated
    },

    // 请求体为空对象（voidReqSchema），无参数可用
    async collections() {
      return collections.list()
    }
  }
}
