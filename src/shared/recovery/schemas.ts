/**
 * [F-VISFB-65 U1] 恢复副本契约单源（设计书 v3 §1-§3）——WPS 式丢稿防御的
 * 类型/schema/注册表/RPC 形状全驻本文件（单一真相源；renderer 经
 * lineage-write-queue re-export 兼容消费）。
 *
 * ── 关键语义（INV-156/INV-164 锚）──
 * - writeAction：编辑会话暂存动作判别联合（自 lineage-write-queue.ts 类型
 *   迁来——类型单源迁 shared；write-queue 改 import+re-export 兼容）。
 * - 载荷（§3 最小面）：folderId+graph{nodes,edges,lineTypeNames,floatingNotes}
 *   +queue+draft{noteId,text}|null；不存 undo/redo（恢复后两栈清空）。
 * - 外覆层：type/schemaVersion/token(≥1)/writtenAt(ISO)/lastWriterSession(uuid)
 *   /payload；槽文件 0600+同目录 tmp→rename 原子替换（files 层承载）。
 * - 注册表：类型/文件名/schema 版本/载荷 schema/摘要器单源，为 reader 草稿族
 *   预留；查键=zod 枚举先行+Object.prototype.hasOwnProperty（防原型链）。
 */
import { z } from 'zod'
import {
  floatingNoteSchema,
  floatingNoteUpsertSchema,
  lineageEdgeSchema,
  lineageEdgeUpsertSchema,
  lineageNodeSchema,
  lineTypeNamesSchema
} from '../models/lineage'

// ── writeAction（类型迁 shared——lineage-write-queue 原联合的 zod 化）────

/** 节点 patch 懒载荷（[T3-P8 R3]——x/y 坐标轴；null=清手工位） */
const lazyNodePatchBodySchema = z
  .object({
    x: z.number().nullable().optional(),
    y: z.number().nullable().optional()
  })
  .strict()

/**
 * 编辑动作（排队单元）判别联合——七 kind 与 renderer 暂存队列逐形对齐
 * （payload 校验面：恢复副本 save/read 的 queue 元素）。
 */
export const writeActionSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('patch-node'),
      id: z.string().min(1),
      patch: lazyNodePatchBodySchema,
      /** 语义轴整替（后到胜出）：{slot}=月内序透写 */
      override: z.object({ slot: z.number().int().min(0) }).strict().optional()
    })
    .strict(),
  z.object({ kind: z.literal('remove-node'), id: z.string().min(1) }).strict(),
  z
    .object({
      kind: z.literal('upsert-edge'),
      input: lineageEdgeUpsertSchema,
      isNew: z.boolean().optional(),
      silentSave: z.boolean().optional()
    })
    .strict(),
  z.object({ kind: z.literal('remove-edge'), id: z.string().min(1) }).strict(),
  z.object({ kind: z.literal('upsert-line-type-names'), input: z.array(z.string()) }).strict(),
  z
    .object({
      kind: z.literal('upsert-floating-note'),
      input: floatingNoteUpsertSchema,
      isNew: z.boolean().optional()
    })
    .strict(),
  z.object({ kind: z.literal('remove-floating-note'), id: z.string().min(1) }).strict()
])
export type WriteAction = z.infer<typeof writeActionSchema>

// ── 载荷（§3 最小面）──────────────────────────────────────────────

/** 乐观终态图快照（复用 shared 既有模型 schema——graph 单读同源形） */
export const lineageGraphSnapshotSchema = z
  .object({
    nodes: z.array(lineageNodeSchema),
    edges: z.array(lineageEdgeSchema),
    lineTypeNames: lineTypeNamesSchema,
    floatingNotes: z.array(floatingNoteSchema)
  })
  .strict()
export type LineageGraphSnapshot = z.infer<typeof lineageGraphSnapshotSchema>

/** 未收口草稿快照（B-01/B-02：正文驻组件态的崩溃窗承载） */
export const noteDraftSnapshotSchema = z
  .object({ noteId: z.string().min(1), text: z.string() })
  .strict()
export type NoteDraftSnapshot = z.infer<typeof noteDraftSnapshotSchema>

export const lineageRecoveryPayloadSchema = z
  .object({
    folderId: z.string().min(1),
    graph: lineageGraphSnapshotSchema,
    queue: z.array(writeActionSchema),
    draft: noteDraftSnapshotSchema.nullable()
  })
  .strict()
export type LineageRecoveryPayload = z.infer<typeof lineageRecoveryPayloadSchema>

// ── 外覆层 + 注册表（§1）──────────────────────────────────────────

export const recoveryEnvelopeSchema = z
  .object({
    type: z.string().min(1),
    schemaVersion: z.number().int().min(1),
    /** 写入方凭据（saved 必回新 token——renderer 记 ownToken） */
    token: z.string().min(1),
    /** [回炉 N1/d1-N03] ISO 时间戳收紧（tmp 提升的 Date.parse 比较前提——
     *  残缺串在 envelope 面即拒=invalid） */
    writtenAt: z.string().datetime(),
    lastWriterSession: z.string().min(1),
    payload: z.unknown()
  })
  .strict()
export type RecoveryEnvelope = z.infer<typeof recoveryEnvelopeSchema>

/** 摘要器（peek 的 file 行派生——actionCount/draftPresent 按类型语义） */
export type RecoveryPayloadSummary = { actionCount: number; draftPresent: boolean }

export interface RecoveryTypeMeta {
  /** 确认条显示名（用户可读中文） */
  label: string
  /** 槽文件名（单槽覆写制——每 (工作区,类型) 至多一份） */
  fileName: string
  schemaVersion: number
  payloadSchema: z.ZodTypeAny
  /** peek 摘要派生（缺省零值——未知载荷面保守呈现） */
  summarize?(payload: unknown): RecoveryPayloadSummary
}

function summarizeLineageSession(payload: unknown): RecoveryPayloadSummary {
  const p = lineageRecoveryPayloadSchema.safeParse(payload)
  if (!p.success) return { actionCount: 0, draftPresent: false }
  return { actionCount: p.data.queue.length, draftPresent: p.data.draft !== null }
}

/** 类型注册表（生命周期单源——reader 草稿族预留扩展位） */
export const RECOVERY_REGISTRY: Readonly<Record<string, RecoveryTypeMeta>> = {
  'lineage-session': {
    label: '脉络图暂存会话',
    fileName: 'lineage-session.json',
    schemaVersion: 1,
    payloadSchema: lineageRecoveryPayloadSchema,
    summarize: summarizeLineageSession
  }
}

export const RECOVERY_TYPES = ['lineage-session'] as const
export type RecoveryType = (typeof RECOVERY_TYPES)[number]

/** 查键：zod 枚举先行+own-property（防原型链——INV-156） */
export function isRegisteredRecoveryType(type: string): type is RecoveryType {
  if (!(RECOVERY_TYPES as readonly string[]).includes(type)) return false
  return Object.prototype.hasOwnProperty.call(RECOVERY_REGISTRY, type)
}

export const recoveryTypeSchema = z.enum(RECOVERY_TYPES)

// ── RPC 形状（§2——通道=recovery/{peek,save,read,release}）──────────

/** peek 槽行附带的文件摘要（available/invalid/foreign-version 携带；empty 缺席） */
export const recoverySlotFileSchema = z
  .object({
    token: z.string().min(1),
    writtenAt: z.string(),
    lastWriterSession: z.string(),
    actionCount: z.number().int().min(0),
    draftPresent: z.boolean()
  })
  .strict()
export type RecoverySlotFile = z.infer<typeof recoverySlotFileSchema>

export const recoveryPeekReqSchema = z.object({ workspaceId: z.string().min(1) }).strict()
export type RecoveryPeekReq = z.infer<typeof recoveryPeekReqSchema>

export const recoverySlotStatusSchema = z
  .object({
    status: z.enum(['empty', 'available', 'invalid', 'foreign-version']),
    epoch: z.number().int().min(0),
    file: recoverySlotFileSchema.optional()
  })
  .strict()
export type RecoverySlotStatus = z.infer<typeof recoverySlotStatusSchema>

export const recoveryPeekResSchema = z
  .object({ slots: z.record(z.string(), recoverySlotStatusSchema) })
  .strict()
export type RecoveryPeekRes = z.infer<typeof recoveryPeekResSchema>

export const recoverySaveReqSchema = z
  .object({
    workspaceId: z.string().min(1),
    type: recoveryTypeSchema,
    /** per-(ws,type) 代际（不符=stale——release 后旧 save 不复活） */
    epoch: z.number().int().min(0),
    /** renderer 启动 uuid（槽归属 ownToken 判据） */
    session: z.string().min(1),
    payload: z.unknown(),
    /** 恢复接管双校验之一（与 epoch 成对——W-02） */
    takeOverToken: z.string().min(1).optional()
  })
  .strict()
export type RecoverySaveReq = z.infer<typeof recoverySaveReqSchema>

export const recoverySaveResSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('saved'), token: z.string().min(1), epoch: z.number().int().min(0) }).strict(),
  z.object({ status: z.literal('stale'), epoch: z.number().int().min(0) }).strict(),
  z
    .object({
      status: z.literal('pending'),
      epoch: z.number().int().min(0),
      file: recoverySlotFileSchema
    })
    .strict()
])
export type RecoverySaveRes = z.infer<typeof recoverySaveResSchema>

export const recoveryReadReqSchema = z
  .object({
    workspaceId: z.string().min(1),
    type: recoveryTypeSchema,
    token: z.string().min(1)
  })
  .strict()
export type RecoveryReadReq = z.infer<typeof recoveryReadReqSchema>

export const recoveryReadResSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('found'), payload: z.unknown() }).strict(),
  z.object({ status: z.literal('gone') }).strict()
])
export type RecoveryReadRes = z.infer<typeof recoveryReadResSchema>

export const recoveryReleaseReqSchema = z
  .object({
    workspaceId: z.string().min(1),
    type: recoveryTypeSchema,
    token: z.string().min(1),
    reason: z.enum(['clean', 'discard'])
  })
  .strict()
export type RecoveryReleaseReq = z.infer<typeof recoveryReleaseReqSchema>

export const recoveryReleaseResSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('released'), epoch: z.number().int().min(0) }).strict(),
  z.object({ status: z.literal('gone'), epoch: z.number().int().min(0) }).strict()
])
export type RecoveryReleaseRes = z.infer<typeof recoveryReleaseResSchema>
