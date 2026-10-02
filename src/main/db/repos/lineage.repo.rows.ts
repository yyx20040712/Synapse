/**
 * [T3-P5] lineage.repo 行映射件 —— row 形状+toNode/toEdge+lineTypeNames 解析
 * （自 lineage.repo 拆出：repo 文件 300 行上限拆件，check-quality 关卡强制；
 * repo 主件保留语句族与接口，本件=纯映射/解析零 SQL）。
 * [F-LGRAPH-01②U8] kind/sub 读面退役：DB 列保留（kind 恒 'manual' 写入、
 * sub 死置）但 DTO 不映射——旧 kind 值（tree/ref/inferred）读入即丢弃（存量
 * 免迁移授权+读面归一口径）；视觉列 dashed/color=迁移 014。
 */
import {
  LINE_TYPE_COLORS,
  LINE_TYPE_ROWS,
  MAIN_GRAPH_ID,
  defaultLineTypeNames,
  type LineTypeNames,
  type LineageEdge,
  type LineageNode,
  type LineageViaPoint
} from '../../../shared/models/lineage'

/** lineage_nodes 表行形状（列名原样，蛇形；tags=007 迁移列 JSON 数组 TEXT，
 *  NULL=无标签（存量行零迁移兼容）；month/slot=010 迁移列——month NULL=未定
 *  月框（CHECK 1..12 在 DDL）、slot NULL=防御面兜底（迁移回填/service 新写恒
 *  有序）；folder_id=012 迁移列——DDL 可空（design-final 修订二：SQLite ADD
 *  COLUMN 静态禁 REFERENCES+非空 DEFAULT——NOT NULL DEFAULT 安全网移 repo 读
 *  写边界），toNode 归一非空见映射注 */
export interface LineageNodeRow {
  id: string
  paper_id: string | null
  title: string
  core_idea: string
  year: number | null
  x: number | null
  y: number | null
  tags: string | null
  month: number | null
  slot: number | null
  folder_id: string | null
  created_at: string
  updated_at: string
}

/** lineage_edges 表行形状（列名原样，蛇形；kind=006 迁移列——U8 起应用面恒
 *  'manual' 写入、读面不映射；sub=010 迁移列——U8 起死置（读面不映射）；
 *  via=013 迁移列——NULL=自动路由（F-LINEAGE-02：JSON 数组 TEXT，读面容错
 *  见 toEdge）；dashed/color=014 迁移列——NOT NULL DEFAULT 存量归一） */
export interface LineageEdgeRow {
  id: string
  from_node: string
  to_node: string
  label: string
  kind: string
  sub: string | null
  via: string | null
  dashed: 0 | 1
  color: string
  created_at: string
  updated_at: string
}

/** [F-LINEAGE-02] via 列读面容错解析（design-final §2.1）：NULL/非法 JSON/
 *  非法形状（非数组/元素非 {x,y} 数值）→ undefined（自动路由语义，不炸
 *  graph 读——tags 列「禁静默吞错」口径的例外面：via 属渲染派生数据非
 *  用户内容，损坏降级优于整图读失败） */
function parseViaTolerant(raw: string | null): LineageViaPoint[] | undefined {
  if (raw === null) return undefined
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return undefined
    const pts: LineageViaPoint[] = []
    for (const p of parsed) {
      if (typeof p !== 'object' || p === null) return undefined
      const { x, y } = p as { x?: unknown; y?: unknown }
      if (typeof x !== 'number' || typeof y !== 'number') return undefined
      pts.push({ x, y })
    }
    return pts
  } catch {
    return undefined
  }
}

export function toNode(row: LineageNodeRow): LineageNode {
  return {
    id: row.id,
    paperId: row.paper_id,
    title: row.title,
    coreIdea: row.core_idea,
    year: row.year,
    x: row.x,
    y: row.y,
    // 007 列：NULL=无标签；JSON 数组直解（写入面单源 JSON.stringify——库内
    // 非法 JSON 只能来自库外手改，读面原样上抛（禁静默吞错——graph error 态可见）
    tags: row.tags === null ? null : (JSON.parse(row.tags) as string[]),
    month: row.month,
    slot: row.slot,
    // 012 列读边界归一：DDL 可空（修订二）+迁移回填+写边界兜底三重封闭后
    // NULL 只能来自库外手改——归一主图（节点 DTO 契约恒非空，与写边界
    // upsertNode 兜底同源安全网）
    folderId: row.folder_id ?? MAIN_GRAPH_ID,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function toEdge(row: LineageEdgeRow): LineageEdge {
  return {
    id: row.id,
    fromNode: row.from_node,
    toNode: row.to_node,
    label: row.label,
    // [F-LGRAPH-01②U8] kind/sub 读面退役：旧 kind 值（tree/ref/inferred）
    // 丢弃不映射——manual 单基型（存量免迁移授权，A3 读面归一口径）
    dashed: row.dashed === 1,
    color: row.color === '' ? LINE_TYPE_COLORS[0] : row.color,
    via: parseViaTolerant(row.via),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

/**
 * [F-LGRAPH-01②U8] meta 'lineTypeNames' 原文 → 恰 6 色行名。读面容错
 * （损坏 JSON/非法形状/长度≠6→缺省 6×「待命名」）：色行名属图级样式配置
 * 非用户内容，损坏降级优于整图读失败（via 列容错同精神——与 tags 列
 * 「禁静默吞错」的区分申报）。旧 'lineTypes' 四组键残留不读本键（键分离）。
 */
export function parseLineTypeNames(rawText: string | null): LineTypeNames {
  if (rawText === null) return defaultLineTypeNames()
  try {
    const parsed: unknown = JSON.parse(rawText)
    if (!Array.isArray(parsed) || parsed.length !== LINE_TYPE_ROWS) return defaultLineTypeNames()
    const names: string[] = []
    for (const v of parsed) {
      if (typeof v !== 'string') return defaultLineTypeNames()
      names.push(v)
    }
    return names
  } catch {
    return defaultLineTypeNames()
  }
}
