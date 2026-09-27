/**
 * [T3-P5] lineage.repo 行映射件 —— row 形状+toNode/toEdge+lineTypes 解析
 * （自 lineage.repo 拆出：repo 文件 300 行上限拆件，check-quality 关卡强制；
 * repo 主件保留语句族与接口，本件=纯映射/解析零 SQL）。
 */
import { z } from 'zod'
import {
  LINE_TYPE_BASE_ORDER,
  lineTypeGroupSchema,
  type LineTypeGroup,
  type LineageEdge,
  type LineageNode
} from '../../../shared/models/lineage'

/** lineage_nodes 表行形状（列名原样，蛇形；tags=007 迁移列 JSON 数组 TEXT，
 *  NULL=无标签（存量行零迁移兼容）；month/slot=010 迁移列——month NULL=未定
 *  月框（CHECK 1..12 在 DDL）、slot NULL=防御面兜底（迁移回填/service 新写恒有序）） */
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
  created_at: string
  updated_at: string
}

/** lineage_edges 表行形状（列名原样，蛇形；kind=006 迁移列，旧行回填 'tree'；
 *  sub=010 迁移列——NULL=基础型默认样式） */
export interface LineageEdgeRow {
  id: string
  from_node: string
  to_node: string
  label: string
  kind: string
  sub: string | null
  created_at: string
  updated_at: string
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
    // F-LG15 三 kind 归一（enum 外库值归 tree——DB 无 CHECK，防线=zod 单源
    // 写入口；此处仅读面归一）：ref/manual/inferred 原样，其余（含 006 迁移前
    // 语义）归 tree
    kind:
      row.kind === 'ref'
        ? 'ref'
        : row.kind === 'manual'
          ? 'manual'
          : row.kind === 'inferred'
            ? 'inferred'
            : 'tree',
    sub: row.sub,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

/** meta 'lineTypes' 原文 → 恒四组（zod 校验+base 枚举序补齐；空配置=四空组）。
 *  库内非法 JSON/形状只能来自库外手改——读面原样上抛（禁静默吞错，tags 列
 *  同精神；zod 单源=models/lineage lineTypeGroupSchema） */
export function parseLineTypes(rawText: string): LineTypeGroup[] {
  let raw: unknown
  try {
    raw = JSON.parse(rawText)
  } catch (e) {
    throw new Error(`lineTypes 配置损坏（非 JSON）：${e instanceof Error ? e.message : String(e)}`)
  }
  const parsed = z.array(lineTypeGroupSchema).safeParse(raw)
  if (!parsed.success) {
    throw new Error(`lineTypes 配置形状非法：${parsed.error.issues[0]?.message ?? 'zod 拒收'}`)
  }
  return LINE_TYPE_BASE_ORDER.map(
    (base) => parsed.data.find((g) => g.base === base) ?? { base, subs: [] as LineTypeGroup['subs'] }
  )
}
