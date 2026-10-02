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
 *   行序/line_types=色板固定序 6 行（[F-LGRAPH-01②U8] 色行名新形状）
 * - snake_case 键+2 空格缩进+UTF-8 无 BOM+末尾换行；schema_version=3 起版
 *   （[F-FOLDER-01] v2：catalog_no→pub_no；[F-LGRAPH-01②U8] v3：edges 扩
 *   via+dashed/color 内联视觉字段[替代 line_type{base,sub} 引用]+line_types
 *   四组→色行名 6 行重整——A9' 仲裁：导出面与数据面形状不一致=导出即坏，
 *   随 U8 破坏性重整同步兑现免中间态；序列化变更必须递增版本并更新快照测试）
 * - 字段：nodes{core_idea,month,node_id,paper_id,pub_no,tags,title,year}
 *   ——**不含 x/y UI 态与 slot**（slot=内部承载列，消费方不需要）；edges
 *   {color,created_at,dashed,edge_id,from,label,to,via?}（via 缺省省略不产
 *   []——N-1 口径）；line_types=[{color,name}×6]（LINE_TYPE_COLORS×色行名
 *   zip——色板固定应用常量随行导出）；paper_id=null 纯主题节点照实导出 null；
 *   paperMetrics 不入（corpus 域 join 数据避双真相）
 * - pub_no=库级派生编号（INV-92——入参 pubNos 单源 map，与 LIST_SQL 同窗口
 *   同值；纯主题节点无文献键=null）
 * - 幂等：同输入逐字节稳定（无时间戳/无随机/序全由单源比较器与入参决定）
 *
 * 架构：main services/export_ 纯函数——零 IO、零 Electron、零出网；import
 * 仅 shared/models/lineage（排序契约+色板单源）。
 */
import { LINE_TYPE_COLORS, LINE_TYPE_DEFAULT_NAME, lineageOrder, type LineageEdge, type LineageNode } from '../../../shared/models/lineage'

export interface LineageAssembleInput {
  nodes: readonly LineageNode[]
  edges: readonly LineageEdge[]
  /** [F-LGRAPH-01②U8] 图级色行名（恰 6——与 LINE_TYPE_COLORS zip 导出） */
  lineTypeNames: readonly string[]
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

export function assembleLineageJson(input: LineageAssembleInput): string {
  const ordered = lineageOrder(input.nodes)
  const pubNos = input.pubNos ?? new Map<string, number>()
  // [F-FOLDER-02·C2 主控终裁 2026-09-30] 导出面跨图边过滤兜底：端点 folderId
  // 不同的边不携出（存量幽灵边——导入面跳过已根治增量，此处兜住迁移前存量；
  // INV-90=边两端同图，携出即再把幽灵边灌回图）。装配单源条款下过滤落本
  // 函数（服务/别处不得另写第二套过滤）。
  const folderOf = new Map(input.nodes.map((n) => [n.id, n.folderId]))
  const sameGraphEdges = input.edges.filter(
    (e) => folderOf.get(e.fromNode) === folderOf.get(e.toNode)
  )
  const payload = sortKeysDeep({
    schema_version: 3,
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
    edges: orderedEdges(sameGraphEdges).map((e) => ({
      edge_id: e.id,
      from: e.fromNode,
      to: e.toNode,
      label: e.label,
      dashed: e.dashed,
      color: e.color,
      // via 缺省省略（N-1：undefined 键经 JSON.stringify 丢弃——不产出 []）
      ...(e.via !== undefined ? { via: e.via } : {}),
      created_at: e.createdAt
    })),
    // [F-LGRAPH-01②U8] 色行名 6 行新形状（色板固定序 zip——name 缺项=缺省名
    // 常量 LINE_TYPE_DEFAULT_NAME [回炉 R21 常量单源]）
    line_types: LINE_TYPE_COLORS.map((color, i) => ({
      color,
      name: input.lineTypeNames[i] ?? LINE_TYPE_DEFAULT_NAME
    }))
  })
  return `${JSON.stringify(payload, null, 2)}\n`
}
