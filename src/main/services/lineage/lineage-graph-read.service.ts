/**
 * [B4 L1 / 设计稿 §5.4/§11.2] lineage-graph-read.service —— lineage/graph 读面装配
 * （自 lineage.service.ts 拆出：文件行数预算——写面守卫与读面装配分件）。
 *
 * ── 行为层 ──
 * - 子图过滤（[F-FOLDER-01] W4）：folderId 提供=节点按图归属过滤+边=双端点均
 *   入图才保留（跨图边本不该存在——INV-90 服务层护栏；过滤语义=该图子图）；
 *   缺省=全图并集（IPC 历史兼容形态——生产消费面恒显式 folderId）。
 * - 派生面四 join（批量单语句禁 N+1）：F-LG14 含金量摘要（venueTier 映射单源
 *   =shared/venue-tier）/pubNos（INV-92 库级派生编号）/tagNames（[A1a] 文献库
 *   标签伴生 map）/isStarred（[F-DBCAMP-01 DB-4]——派生键，不入 DB 列）。
 * - nodes=lineageOrder 序（INV-75 读面唯一保证——消费方不得重排）。
 * - 色行名（[B4 L1 D2]）：按 folder 键 `lineTypeNames:<folderId>` 读（主图同型
 *   同法）；并集读缺省取主图键（全图语义的直接后继——与 corpus export 取值
 *   同一口径，§17 裁决行）。
 * - floatingNotes（[F-VISFB-61]）：悬浮笔记图域行集（folderId 域隔离）。
 *
 * ── 接口层 ──
 * - export function readLineageGraph(deps, folderId?): LineageGraphPayload
 * - export interface LineageGraphReadDeps / LineageGraphPayload
 *
 * ── 架构层 ──
 * - 纯装配：只依赖注入的 repo 读面与批量查证函数（可选缺省=空面——既有单测
 *   装配兼容，生产装配恒传真实现）。
 */
import {
  lineageOrder,
  MAIN_GRAPH_ID,
  type FloatingNote,
  type LineageEdge,
  type LineageNode,
  type LineTypeNames
} from '../../../shared/models/lineage'
import { venueToTier, type VenueTier } from '../../../shared/venue-tier'
import type { LineageRepo } from '../../db/repos/lineage.repo'

/** F-LG14 含金量摘要（graph 通道逐文献节点载荷；citedByCount null=从未抓到） */
export interface LineagePaperMetrics {
  citedByCount: number | null
  venueTier: VenueTier | null
  venue?: string | null
  impactFactor?: number | null
}

export interface LineageGraphPayload {
  nodes: LineageNode[]
  edges: LineageEdge[]
  paperMetrics: Record<string, LineagePaperMetrics>
  lineTypeNames: LineTypeNames
  pubNos: Record<string, number>
  tagNames: Record<string, string[]>
  floatingNotes: FloatingNote[]
}

export interface LineageGraphReadDeps {
  repo: Pick<LineageRepo, 'listGraph' | 'getLineTypeNames'>
  /** papers 含金量摘要批量查证（可选缺省=空面——生产接 repos.papers.listMetricsByIds） */
  paperMetrics?: (paperIds: string[]) => Array<{
    paperId: string
    venue: string
    citedByCount: number | null
    impactFactor?: number | null
  }>
  /** pubNo 批查（INV-92——生产接 repos.papers.pubNoByIds） */
  pubNos?: (paperIds: string[]) => Array<{ paperId: string; pubNo: number }>
  /** 文献库标签批量名查（生产接 repos.tags.tagNamesByIds） */
  tagNames?: (paperIds: string[]) => Array<{ paperId: string; name: string }>
  /** 星标批查（生产接 repos.papers.starredByIds） */
  starred?: (paperIds: string[]) => Array<{ paperId: string; isStarred: boolean }>
  /** 悬浮笔记图域读面（生产接 floating-notes.service.notesForGraph） */
  floatingNotes?: (folderId?: string) => FloatingNote[]
}

export function readLineageGraph(deps: LineageGraphReadDeps, folderId?: string): LineageGraphPayload {
  const g = deps.repo.listGraph()
  const scopedNodes = folderId === undefined ? g.nodes : g.nodes.filter((n) => n.folderId === folderId)
  const scopedNodeIds = new Set(scopedNodes.map((n) => n.id))
  const scopedEdges =
    folderId === undefined
      ? g.edges
      : g.edges.filter((e) => scopedNodeIds.has(e.fromNode) && scopedNodeIds.has(e.toNode))
  // paperId null 过滤=DDL 窗口期防御（主题节点应用层已无产生路径）
  const paperIds = scopedNodes.flatMap((n) => (n.paperId !== null ? [n.paperId] : []))
  const paperMetrics: Record<string, LineagePaperMetrics> = {}
  for (const r of deps.paperMetrics?.(paperIds) ?? []) {
    paperMetrics[r.paperId] = {
      citedByCount: r.citedByCount,
      venueTier: venueToTier(r.venue),
      // 期刊/IF 透传（venue 空串=缺席省略语义同 null）
      venue: r.venue === '' ? null : r.venue,
      impactFactor: r.impactFactor ?? null
    }
  }
  const pubNos: Record<string, number> = {}
  for (const r of deps.pubNos?.(paperIds) ?? []) pubNos[r.paperId] = r.pubNo
  // repo 行序 ORDER BY paper_id, t.name ASC——按 paperId 分组即名序
  const tagNames: Record<string, string[]> = {}
  for (const r of deps.tagNames?.(paperIds) ?? []) {
    const list = tagNames[r.paperId]
    if (list === undefined) tagNames[r.paperId] = [r.name]
    else list.push(r.name)
  }
  const starredBy = new Map((deps.starred?.(paperIds) ?? []).map((r) => [r.paperId, r.isStarred]))
  const nodes = lineageOrder(scopedNodes).map((n) =>
    n.paperId !== null && starredBy.has(n.paperId) ? { ...n, isStarred: starredBy.get(n.paperId)! } : n
  )
  return {
    nodes,
    edges: scopedEdges,
    paperMetrics,
    lineTypeNames: deps.repo.getLineTypeNames(folderId ?? MAIN_GRAPH_ID),
    pubNos,
    tagNames,
    floatingNotes: deps.floatingNotes?.(folderId) ?? []
  }
}
