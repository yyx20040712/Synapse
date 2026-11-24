/**
 * lineage-history.schemas —— lineage/history-unit 跨进程单源（B4 L1；设计稿
 * docs/design/2026-11-22_b4-save-undo-core-design.md §5.1/§7.2/§7.4/§7.5）。
 *
 * ── 行为层 ──
 * - LineageEntityDelta 四 kind：node/edge/floating-note 各携 before/after 全实体
 *   （null=该实体不存在——删除态/新建前）；line-type-names 携当前 folder 的
 *   六行名前后值（存储键 `lineTypeNames:<folderId>`——§5.4）。redo 顺向核对
 *   before、写 after；undo 逆序核对 after、写 before（§5.1）。
 * - 请求 strict 校验；node/floating-note 的 folder 归属必须与 req.folderId 一致
 *   （边的图归属由端点派生，main 事务内守卫校验）；同一 (kind,id) 在一次
 *   unit 内至多一项；line-type-names 至多一项。
 * - 响应只含本次 touched 实体的服务器版本与当前 folder 色行名；空数组不表示
 *   整图清空。unitId 用于回显去重，不作为跨重启幂等存储。
 * - 语义指纹（lineageEntityFingerprint）：before/after 比较排除 updatedAt 与
 *   派生 isStarred，包含 id、paperId/folderId、全部用户字段、createdAt 与边
 *   端点/via/锚（§5.1）。renderer（no-op 判定/回显再锚）与 main（history-unit
 *   写前核对）同读本件——两进程一份实现。
 *
 * ── 接口层 ──
 * - export const lineageHistoryUnitReqSchema / lineageHistoryUnitResSchema
 * - export const LINEAGE_EDIT_COMMAND_KINDS（13 编辑入口枚举）
 * - export const HISTORY_UNIT_CONFLICT_REASONS（CONFLICT 四拒因——AppError.reason 值域单源）
 * - export function lineageEntityFingerprint(kind, entity): string
 *
 * ── 架构层 ──
 * - shared 契约层：零进程实现依赖（仅 zod+models/lineage）。
 */
import { z } from 'zod'
import { floatingNoteSchema, lineageEdgeSchema, lineageNodeSchema, lineTypeNamesSchema } from '../models/lineage'

/** §5.2 十三个编辑入口（历史项 command 字段值域；toggleNodeStar 不入历史） */
export const LINEAGE_EDIT_COMMAND_KINDS = [
  'moveNode',
  'applyObstacleReroute',
  'drawEdge',
  'editManualEdgeLabel',
  'applyEdgeLineStyle',
  'setEdgeVia',
  'reconnectEdge',
  'saveLineTypeNames',
  'removeNode',
  'removeEdge',
  'addFloatingNote',
  'updateFloatingNote',
  'removeFloatingNote'
] as const
export type LineageEditCommandKind = (typeof LINEAGE_EDIT_COMMAND_KINDS)[number]

/** [用户裁决 R12 / 回炉 W-D2c] history-unit 以 CONFLICT 拒绝的四种拒因（AppError.reason 受控串
 *  的单源）：发射点=main lineage-history-unit.service（REASON 表按本集合类型约束）；renderer 的
 *  过期历史出口适用面=lineage-history-stale（再导出本集合）。四种拒因都使栈顶历史项永久不可达 */
export const HISTORY_UNIT_CONFLICT_REASONS = [
  'HISTORY_STALE',
  'HISTORY_PAPER_MISSING',
  'HISTORY_FOLDER_MISSING',
  'HISTORY_GRAPH_INVALID'
] as const
export type LineageHistoryConflictReason = (typeof HISTORY_UNIT_CONFLICT_REASONS)[number]

const idSchema = z.string().min(1)

const nodeDeltaSchema = z
  .object({ kind: z.literal('node'), id: idSchema, before: lineageNodeSchema.nullable(), after: lineageNodeSchema.nullable() })
  .strict()
const edgeDeltaSchema = z
  .object({ kind: z.literal('edge'), id: idSchema, before: lineageEdgeSchema.nullable(), after: lineageEdgeSchema.nullable() })
  .strict()
const noteDeltaSchema = z
  .object({
    kind: z.literal('floating-note'),
    id: idSchema,
    before: floatingNoteSchema.nullable(),
    after: floatingNoteSchema.nullable()
  })
  .strict()
const namesDeltaSchema = z
  .object({ kind: z.literal('line-type-names'), before: lineTypeNamesSchema, after: lineTypeNamesSchema })
  .strict()

export const lineageEntityDeltaSchema = z.discriminatedUnion('kind', [
  nodeDeltaSchema,
  edgeDeltaSchema,
  noteDeltaSchema,
  namesDeltaSchema
])
export type LineageEntityDelta = z.infer<typeof lineageEntityDeltaSchema>

export const lineageHistoryDirectionSchema = z.enum(['undo', 'redo'])
export type LineageHistoryDirection = z.infer<typeof lineageHistoryDirectionSchema>

const hasId = (ent: { id?: string } | null, id: string): boolean => ent === null || ent.id === id

export const lineageHistoryUnitReqSchema = z
  .object({
    folderId: idSchema,
    unitId: idSchema,
    direction: lineageHistoryDirectionSchema,
    changes: z.array(lineageEntityDeltaSchema).min(1)
  })
  .strict()
  .superRefine((req, ctx) => {
    const seen = new Set<string>()
    for (const [index, d] of req.changes.entries()) {
      if (d.kind === 'line-type-names') {
        if (seen.has(d.kind)) ctx.addIssue({ code: 'custom', path: ['changes', index], message: 'line-type-names delta 至多一项' })
        seen.add(d.kind)
        continue
      }
      const key = `${d.kind}:${d.id}`
      if (seen.has(key)) ctx.addIssue({ code: 'custom', path: ['changes', index], message: `同一实体在一次 unit 内至多一项：${key}` })
      seen.add(key)
      if (!hasId(d.before, d.id) || !hasId(d.after, d.id)) {
        ctx.addIssue({ code: 'custom', path: ['changes', index], message: 'delta 的 before/after id 须与 delta id 一致' })
      }
      if (d.before === null && d.after === null) {
        ctx.addIssue({ code: 'custom', path: ['changes', index], message: 'delta 的 before/after 不得同为 null' })
      }
      for (const side of ['before', 'after'] as const) {
        const ent = d[side]
        if (ent !== null && 'folderId' in ent && ent.folderId !== req.folderId) {
          ctx.addIssue({
            code: 'custom',
            path: ['changes', index, side],
            message: `${d.kind} 的 folderId 与请求 folderId 不一致`
          })
        }
      }
    }
  })
export type LineageHistoryUnitReq = z.infer<typeof lineageHistoryUnitReqSchema>

export const lineageHistoryUnitResSchema = z
  .object({
    folderId: idSchema,
    unitId: idSchema,
    nodes: z.array(lineageNodeSchema),
    edges: z.array(lineageEdgeSchema),
    floatingNotes: z.array(floatingNoteSchema),
    lineTypeNames: lineTypeNamesSchema
  })
  .strict()
export type LineageHistoryUnitRes = z.infer<typeof lineageHistoryUnitResSchema>

/** 语义指纹的实体 kind（line-type-names 无实体——比较名数组本身） */
export type LineageFingerprintKind = 'node' | 'edge' | 'floating-note'

/**
 * 语义指纹（§5.1）：排除 updatedAt 与派生 isStarred。定长字段序 JSON——两实体
 * 指纹相等 ⇔ 用户可见字段全等。via/锚的 undefined 与 null 同义（读模型
 * undefined ≡ DB NULL），归一为 null 后入指纹。
 */
export function lineageEntityFingerprint(kind: LineageFingerprintKind, entity: unknown): string {
  if (entity === null || entity === undefined) return 'null'
  const e = entity as Record<string, unknown>
  switch (kind) {
    case 'node':
      return JSON.stringify([
        'node', e.id, e.paperId, e.title, e.year, e.x, e.y, e.month, e.slot, e.folderId, e.createdAt
      ])
    case 'edge':
      return JSON.stringify([
        'edge', e.id, e.fromNode, e.toNode, e.label, e.dashed, e.color,
        e.via ?? null, e.fromAnchor ?? null, e.toAnchor ?? null, e.createdAt
      ])
    default:
      return JSON.stringify(['floating-note', e.id, e.folderId, e.x, e.y, e.content, e.createdAt])
  }
}
