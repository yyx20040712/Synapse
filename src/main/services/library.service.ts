/**
 * [SR-SVC-01] library.service —— 文献库用例（工单：done）
 *
 * ── 行为层 ──
 * - 列表：透传 LibraryQuery 到 papers.searchSummaries（[F-FOLDER-01] folderScope
 *   判别联合三态过滤在 buildFilters——窗口之外，B3：不改 pubNo 编号）；
 *   lineage 关联行（year/month）已由 LIST_SQL LEFT JOIN 单源直选（service 层
 *   join 装配退役——catalogNo 随 pubNo 单源化删除）
 * - 详情：papers.detailById；不存在 → 抛 DomainError（code=NOT_FOUND）；
 *   lineage 关联装配（节点命中挂 {year, month, edgeCount}）
 * - 元数据编辑：papers.updateMeta（patch 空对象不落库、直接返回现状）；
 *   [F-FOLDER-01] patch.year/month → 同事务同步节点排序键（§3.4：在图文献
 *   跨组迁移 slot=目标组 max+1——normalizeMonthSlot 单源；未入脉络照实无节点
 *   面，patch.month 无落点忽略）；patch.impactFactor → papers.impact_factor
 *   （PATCH_COLS）；S1 队列闸（INV-91）——lineagePending 拒绝
 * - 集合列表：collections.list()（导入面历史只读形状）
 * - [F-FOLDER-01] papers 域：moveFolder（§3.4+W2 终裁事务序——见下方注释）；
 *   [F-UIRES-01 批 B] +delete（§2.4 统一级联契约+事务内重验=零比对直删）
 *
 * ── 接口层 ──
 * - export function createLibraryService(deps): ApiHandlers['library']
 * - export function createPapersService(deps): ApiHandlers['papers']
 *
 * ── 架构层 ──
 * - 只依赖 repos 桶；禁止 import db/connection（ESLint 强制）
 * - 本服务不做 IO（文件/网络都归别的 service）
 *
 * ── 生命周期层 ──
 * - P7E-07 已兑现：智能排序（引用数排序）——ORDER_BY 映射扩展（加值向后兼容）
 * - [F-UIRES-01 批 B] 已兑现：删除文献（papers/delete 通道+级联=DDL 承担；
 *   弹窗分流在 renderer usePaperDelete/PaperDeleteDialog；文件清理=设计稿外
 *   挂账——PDF 驻留 userData，非本批范围）
 *
 * ── 文化层 ──
 * - NOT_FOUND 场景抛 DomainError（F-DEDUP-01 单源 re-export 保持既有导出面）
 * - updateMeta 落库后重读 detailById 返回聚合详情（契约要求 PaperDetail）
 * - 测试：tests/unit/services/library.service.test.ts（已锁定）
 *   + folders-move-paper.test.ts [F-FOLDER-01 受锁新增]（移动事务序矩阵）
 */
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { Repos } from '../db/repos'
import { DomainError } from './shared/domain-error'
import { normalizeMonthSlot, nextSlotInGroup } from './lineage/lineage.write-guards'

/**
 * 域错误：service 层业务语义（如"资源不存在"）的载体。
 * toAppError 对带合法 code 字段的 Error 会保留 code 与 message 折叠成 AppError，
 * 前端据此按码分支。（定义已上提 shared/domain-error 单源——F-DEDUP-01；
 * 此处 re-export 维持本文件历史导出面。）
 */
export { DomainError }

/** 统一的"文献不存在"错误（detail / updateMeta / moveFolder 共用同一语义与文案） */
function paperNotFound(paperId: string): DomainError {
  return new DomainError('NOT_FOUND', `文献不存在：${paperId}`)
}

/** S1 队列闸拒绝（INV-91——移动/删除该图文献会使 renderer 排队中的旧 upsert
 *  复活孤儿节点；拒绝型=用户先保存再重试） */
function lineageSavePending(): DomainError {
  return new DomainError('CONFLICT', '脉络图编辑保存中，请先完成保存再操作文献归属')
}

/** [F-FOLDER-01] library/papers 两 service 共用依赖形状（三项注入可选缺省=
 * 闸常开/事件静默——既有单测装配兼容（paperMetrics 先例）；生产装配恒真值） */
export interface LibraryServiceDeps {
  repos: Repos
  /** INV-91 S1 队列闸判定源（bootstrap 注入——写操作入口拒绝） */
  lineagePending?: () => boolean
  /** folders.changed 事件出口（moveFolder 后侧栏计数失效） */
  sendFoldersChanged?: () => void
  /** lineage.changed 事件出口（moveFolder 后图结构失效） */
  sendLineageChanged?: () => void
}

export function createLibraryService(deps: LibraryServiceDeps): ApiHandlers['library'] {
  const { papers, collections, lineage } = deps.repos
  const pending = deps.lineagePending ?? (() => false)

  return {
    // 查询已在上游（ipc register）过 zod 校验并补全默认值，此处原样透传；
    // [F-FOLDER-01] folderScope 两态（all/folder——[F-ALIGN-01 D5] null 归属
    // 过滤变体随 D5 退役）在 buildFilters 收口
    async list(req) {
      return papers.searchSummaries(req)
    },

    async detail(req) {
      const d = papers.detailById(req.paperId)
      if (d === null) throw paperNotFound(req.paperId)
      // [T3-P3] 跨域关联行装配：命中脉络节点才挂 lineage（year/month=edgeCount
      // 经 repo 只读对；[F-FOLDER-01] catalogNo 已随 pubNo 退役——编号=pubNo）
      const node = lineage.nodeByPaperId(req.paperId)
      if (node === null) return d
      return {
        ...d,
        lineage: {
          year: node.year,
          month: node.month,
          edgeCount: lineage.edgeCountByNode(node.id)
        }
      }
    },

    async updateMeta(req) {
      // [F-FOLDER-01] S1 队列闸（INV-91）：year/month 同步节点=图排序键写，
      // 队列 pending 期拒绝（拒时零库副作用）。闸序（回炉 N8 主控裁有意）：
      // 闸先于空 patch 早退——pending 期 updateMeta 全拒（含纯 papers 写），
      // 单一入口零例外
      if (pending()) throw lineageSavePending()
      // 空 patch：不写库（避免空更新刷动 updated_at），校验存在性后直接返回现状
      if (Object.keys(req.patch).length === 0) {
        const current = papers.detailById(req.paperId)
        if (current === null) throw paperNotFound(req.paperId)
        return current
      }
      const { month, ...rest } = req.patch // rest 含 year（papers 列）+impactFactor 等
      const year = req.patch.year
      const nodeSync = month !== undefined || year !== undefined
      // 非空 patch：先落库（null = 目标行不存在），再重读聚合详情满足响应契约；
      // [F-FOLDER-01] 节点排序键同步与 papers 写同事务（§3.4——半写残留零面）
      const updated = deps.repos.withTransaction(() => {
        // [回炉码 14/d1-W12] 空 rest（patch 仅 month——papers 表无此列）：不落库
        // （避免无意义 updated_at 刷新——「空 patch 不落库」语义随 folder 列族
        // 扩展到列面空集）；存在性经 findById 校验
        const row =
          Object.keys(rest).length > 0
            ? papers.updateMeta(req.paperId, rest)
            : papers.findById(req.paperId)
        if (row === null) throw paperNotFound(req.paperId)
        if (nodeSync) {
          const node = lineage.nodeByPaperId(req.paperId)
          if (node !== null) {
            const newYear = year !== undefined ? year : node.year
            const newMonth = month !== undefined ? month : node.month
            // 全行 upsert（整行语义——LG-03 惯例）+组变归一（slot 缺省走
            // normalizeMonthSlot：组变=目标图组 max+1 落组末/组不变=保留）
            const { month: nm, slot } = normalizeMonthSlot(
              { ...node, id: node.id, year: newYear, month: newMonth, slot: undefined },
              lineage.listGraph().nodes
            )
            lineage.upsertNode({ ...node, year: newYear, month: nm, slot })
          }
        }
        return papers.detailById(req.paperId)
      })
      if (updated === null) throw paperNotFound(req.paperId)
      return updated
    },

    // 请求体为空对象（voidReqSchema），无参数可用
    async collections() {
      return collections.list()
    }
  }
}

/**
 * [F-FOLDER-01] papers 域 service（papers/move-folder 单通道；[F-UIRES-01 批 B]
 * +papers/delete）。移动事务序（design-final §3.4，withTransaction 原子）：
 * 1. papers.folder_id F1→F2（[F-ALIGN-01 D5 2026-10-04] toFolderId 收紧 string——
 *    「移出」路径全域退役：null 载荷 schema 拒（INV-NEW-2 所有文献必在
 *    文件夹），移出分支随之消亡）
 * 2. 移入分支：节点存在→UPDATE folder_id=F2 且 slot=目标图组 max+1 归一
 *    （[回炉码 6/R2 勘正]不透写原 slot——跨图移入同组同 slot 值→归一保 INV-75
 *    唯一；旧注「不重排」句废止）；节点不存在→INSERT（year/month 取节点缺省
 *    null，slot=目标图组 max+1——normalizeMonthSlot 落组末）
 * 2b. 同值移动（folderId===toFolderId）幂等早退（R2——k1'-W2/d1'-W2：
 *    无早退则 slot 自计重排组末+updated_at 刷新=非幂等副作用，早退零库写零广播）
 * 3. 跨图边清理：节点换图后其与旧图邻居的边=跨图（INV-90 违例）——同事务删除
 *    （边属图派生，连线不迁移——survey 矩阵「移动 F1→F2」行用户明示）
 * 4. 广播 folders.changed + lineage.changed（侧栏计数+图结构双失效）
 *
 * [F-UIRES-01 批 B] delete 事务序（设计稿 §2.4 统一级联契约）：
 * 1. pending() → CONFLICT 拒（INV-91 S1 队列闸——图结构级联变，与 moveFolder/
 *    updateMeta 同闸先例；拒时零库副作用）
 * 2. papers.findById===null → NOT_FOUND（paperNotFound 单源）
 * 3. withTransaction 零比对直删——「事务内重验」=DDL 按事务内实际状态级联，
 *    service 不取数不回滚不比对预检值（弹窗计数=提示值——落定瞬态规避）
 * 4. 成功→sendFoldersChanged+sendLineageChanged 双播（夹计数减+图结构级联变
 *    ——folders.service delete 双播先例）；级联清单=paper_tags/annotations/
 *    notes/ai_notes/lineage_nodes CASCADE→边二跳+papers_fts 触发器自清（DDL）
 */
export function createPapersService(deps: LibraryServiceDeps): ApiHandlers['papers'] {
  const { papers, folders, lineage } = deps.repos
  const pending = deps.lineagePending ?? (() => false)
  const sendFoldersChanged = deps.sendFoldersChanged ?? (() => undefined)
  const sendLineageChanged = deps.sendLineageChanged ?? (() => undefined)

  return {
    async moveFolder(req) {
      if (pending()) throw lineageSavePending()
      const paper = papers.findById(req.paperId)
      if (paper === null) throw paperNotFound(req.paperId)
      // [F-ALIGN-01 D5] toFolderId 恒 string（null 移出路径退役——schema 层拒收；
      // 此处存在性判定随之收窄为无条件检查，类型外 null 载荷防御面=NOT_FOUND）
      if (folders.findById(req.toFolderId) === null) {
        throw new DomainError('NOT_FOUND', `目标文件夹不存在：${req.toFolderId}`)
      }
      // 同值移动幂等早退（R2）：移到当前所在文件夹=零变更——不落库不重排不广播
      // （归属读取走 folderIdOf 单源——findById 列单不保证携带 folder_id；
      // [F-ALIGN-01 D5] 两侧恒 string=同型比较）
      if (papers.folderIdOf(req.paperId) === req.toFolderId) {
        return { ok: true as const }
      }
      deps.repos.withTransaction(() => {
        papers.setFolderId(req.paperId, req.toFolderId)
        const node = lineage.nodeByPaperId(req.paperId)
        if (node === null) {
          // 移入且无节点：自动入图（「挂入=自动入同名图」——survey §2.3）；
          // 排序键=文献元数据缺省（year 取 papers.year，month 无源=null 未定
          // 月框——W6 漏格「month=NULL 缺省归组」）；slot=目标图组 max+1
          // （W3——normalizeMonthSlot 落组末，repo 级直写须先归一）
          const graphNodes = lineage.listGraph().nodes
          const seed = {
            paperId: req.paperId,
            title: paper.title.trim() === '' ? '（无标题）' : paper.title,
            coreIdea: '',
            year: paper.year,
            x: null,
            y: null,
            tags: null,
            month: null,
            folderId: req.toFolderId
          }
          const { month, slot } = normalizeMonthSlot(seed, graphNodes)
          lineage.upsertNode({ ...seed, month, slot })
          return
        }
        // 节点在场：整行 upsert 改图归属；slot=目标图组 (folderId,year,month)
        // 现行 max+1（[回炉码 6/d1-W3] 不透写原 slot——跨图移入同组已有同 slot
        // 值→归一不重复，保 INV-75 同图内唯一；目标组空=落组末 1）
        const preNodes = lineage.listGraph().nodes
        const slot = nextSlotInGroup(preNodes, req.toFolderId, node.year, node.month)
        lineage.upsertNode({ ...node, slot, folderId: req.toFolderId })
        // 跨图边清理：该文献节点换图后，对端不同图的直接连线同删（§3.4 步 2）
        const graph = lineage.listGraph()
        const myFolder = req.toFolderId
        for (const e of graph.edges) {
          if (e.fromNode !== node.id && e.toNode !== node.id) continue
          const otherId = e.fromNode === node.id ? e.toNode : e.fromNode
          const other = graph.nodes.find((n) => n.id === otherId)
          if (other !== undefined && other.folderId !== myFolder) {
            lineage.removeEdge(e.id)
          }
        }
      })
      sendFoldersChanged()
      sendLineageChanged()
      return { ok: true as const }
    },

    // [F-UIRES-01 批 B] §2.4 删除（静默/保护两分支同一数据效果——差异仅弹窗
    // 与否，弹窗面在 renderer；事务内重验=零比对直删见上注释）
    async delete(req) {
      if (pending()) throw lineageSavePending()
      if (papers.findById(req.paperId) === null) throw paperNotFound(req.paperId)
      // [RR1-3/d1-N1] removed===false=并发窗口已被删——如实 NOT_FOUND 非假成功
      //（findById 前置后单进程同步序不可达，防御面）
      const removed = deps.repos.withTransaction(() => papers.remove(req.paperId))
      if (!removed) throw paperNotFound(req.paperId)
      sendFoldersChanged()
      sendLineageChanged()
      return { ok: true as const }
    }
  }
}
