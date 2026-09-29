// [T3-P5]
/**
 * lineage.assemble —— lineage.json 装配纯函数（corpus 导出第六件套，INV-77）。
 *
 * ⚠ 装配单源条款（corpus.assemble.ts R12 同精神，红线）：本文件是 lineage.json
 * 装配的**唯一纯函数源**（assembleLineageJson）。corpus.export.service 只做
 * 编排（finalizing 阶段收 deps.lineage 读通道数据→本函数→io 件落盘），禁止
 * 在 service 或任何别处另写一套 lineage.json 装配——两套装配=INV-11 违例。
 *
 * 确定性规范（design-final §5，INV-77）：
 * - 对象键序=**递归 alphabetical**（唯一规则不做语义分块——消费方 diff 稳定）
 * - nodes=lineageOrder 序（§4 排序契约唯一纯函数单源消费）/edges=(created_at,id)
 *   行序/line_types=base 枚举序（tree,inferred,ref,manual）后 subs 按 id 升序
 * - snake_case 键+2 空格缩进+UTF-8 无 BOM+末尾换行；schema_version=2 起版
 *   （[F-FOLDER-01] 序列化变更递增：catalog_no→pub_no——图内节点号与库号
 *   同源 INV-92 单一真相源；序列化变更必须递增版本并更新快照测试）
 * - 字段：nodes{core_idea,month,node_id,paper_id,pub_no,tags,title,year}
 *   ——**不含 x/y UI 态与 slot**（slot=内部承载列，消费方不需要）；edges
 *   {created_at,edge_id,from,label,line_type{base,sub},to}；line_types{base,
 *   subs[{color,dash,id,name,w}]}；paper_id=null 纯主题节点照实导出 null；
 *   paperMetrics 不入（corpus 域 join 数据避双真相）
 * - pub_no=库级派生编号（INV-92——入参 pubNos 单源 map，与 LIST_SQL 同窗口
 *   同值；纯主题节点无文献键=null）
 * - 幂等：同输入逐字节稳定（无时间戳/无随机/序全由单源比较器与入参决定）
 *
 * 架构：main services/export_ 纯函数——零 IO、零 Electron、零出网；import
 * 仅 shared/models/lineage（排序契约单源）。
 */
import { LINE_TYPE_BASE_ORDER, lineageOrder, type LineTypeGroup, type LineageEdge, type LineageNode } from '../../../shared/models/lineage'

export interface LineageAssembleInput {
  nodes: readonly LineageNode[]
  edges: readonly LineageEdge[]
  lineTypes: readonly LineTypeGroup[]
  /** [F-FOLDER-01] pubNo map（键=paperId——corpus.export.service 经
   *  repos.papers.pubNoByIds 装配；缺省=空 map→全 null（装配缺失面如实导出） */
  pubNos?: ReadonlyMap<string, number>
}

/** 递归 alphabetical 键序（唯一键序规则——数组序保持，对象键重排） */
function sortKeysDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => sortKeysDeep(v)) as unknown as T
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(value as Record<string, unknown>).sort()) {
      out[k] = sortKeysDeep((value as Record<string, unknown>)[k])
    }
    return out as unknown as T
  }
  return value
}

/** 边导出行序：(created_at,id)——同键稳定排序保持输入序兜底 */
function orderedEdges(edges: readonly LineageEdge[]): LineageEdge[] {
  return [...edges].sort((a, b) => {
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1
    if (a.id !== b.id) return a.id < b.id ? -1 : 1
    return 0
  })
}

/** line_types 导出形：base 枚举序（缺组跳过——输入恒四组由 repo 读面保证）+subs id 升序 */
function orderedLineTypes(groups: readonly LineTypeGroup[]): Array<{ base: string; subs: unknown[] }> {
  return LINE_TYPE_BASE_ORDER.flatMap((base) => {
    const hit = groups.find((g) => g.base === base)
    if (hit === undefined) return []
    return [
      {
        base,
        subs: [...hit.subs].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      }
    ]
  })
}

export function assembleLineageJson(input: LineageAssembleInput): string {
  const ordered = lineageOrder(input.nodes)
  const pubNos = input.pubNos ?? new Map<string, number>()
  const payload = sortKeysDeep({
    schema_version: 2,
    nodes: ordered.map((n) => ({
      node_id: n.id,
      paper_id: n.paperId,
      title: n.title,
      core_idea: n.coreIdea,
      year: n.year,
      month: n.month,
      tags: n.tags ?? null,
      pub_no: n.paperId !== null ? (pubNos.get(n.paperId) ?? null) : null
    })),
    edges: orderedEdges(input.edges).map((e) => ({
      edge_id: e.id,
      from: e.fromNode,
      to: e.toNode,
      label: e.label,
      line_type: { base: e.kind, sub: e.sub },
      created_at: e.createdAt
    })),
    line_types: orderedLineTypes(input.lineTypes)
  })
  return `${JSON.stringify(payload, null, 2)}\n`
}
