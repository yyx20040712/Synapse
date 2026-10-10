/**
 * [F-DBCAMP-01 DB-2 U1] AI 域 13 通道请求/响应 schema（契约；实体单源=
 * models/ai-domain——字段定义禁二次定义，本件只做通道级组装）。
 * 命名约定沿 schemas.ts：XxxReq / XxxRes；一律 .strict()（含 refine 前）。
 * 通道名斜杠形（S1 主控预裁——设计稿连字符形仅=设计层标识，实施名 1:1 斜杠）。
 * 本批零接线：api-surface 通道表不动（13 通道注册随 U2 与 handler 同批）。
 * ai-memory/delete 的 Res 复用 schemas.ts 的 trueAckSchema（不在此新导出——
 * schemas.ts 夹具闭合表零 churn；U2 接线时直引彼处）。
 */
import { z } from 'zod'
import {
  AI_MEMORY_CATEGORIES,
  AI_MEMORY_LABEL_MAX,
  AI_MEMORY_TITLE_MAX,
  aiScopeSchema,
  aiTaskStatusSchema,
  aiSessionSchema,
  aiMessageSchema,
  pinnedMessageItemSchema,
  aiMemorySchema,
  aiMemoryListItemSchema,
  aiTaskSchema,
  aiAuditRowSchema,
  aiCascadeCountsSchema
} from '../models/ai-domain'
import { MAX_PAGE_SIZE } from '../constants'

/** 19 类并集（ai-memory/update 侧跨档校验面；档级矩阵归 U2 服务层按行 scope） */
const AI_MEMORY_CATEGORY_UNION: readonly string[] = Array.from(
  new Set([...AI_MEMORY_CATEGORIES.paper, ...AI_MEMORY_CATEGORIES.lineage, ...AI_MEMORY_CATEGORIES.global])
)

// ── ai-sessions（会话域）──────────────────────────────────────────
/**
 * ai-sessions/open 请求：锚矩阵 refine——scope==='global' ⇔ anchorId===null
 * （global+非 null 拒；paper/lineage+null 拒；020 ai_sessions 条件 CHECK 同构）
 */
export const aiSessionsOpenReqSchema = z
  .object({
    scope: aiScopeSchema,
    anchorId: z.string().min(1).nullable()
  })
  .strict()
  .refine((v) => (v.scope === 'global') === (v.anchorId === null), {
    message: '锚矩阵：global 档 anchorId 必须 null，paper/lineage 档必须非空串'
  })
export type AiSessionsOpenReq = z.infer<typeof aiSessionsOpenReqSchema>

export const aiSessionsOpenResSchema = z.object({ session: aiSessionSchema }).strict()
export type AiSessionsOpenRes = z.infer<typeof aiSessionsOpenResSchema>

/** ai-sessions/list-messages 请求 */
export const aiSessionsListMessagesReqSchema = z
  .object({ sessionId: z.number().int().min(1) })
  .strict()
export type AiSessionsListMessagesReq = z.infer<typeof aiSessionsListMessagesReqSchema>

export const aiSessionsListMessagesResSchema = z
  .object({ messages: z.array(aiMessageSchema) })
  .strict()
export type AiSessionsListMessagesRes = z.infer<typeof aiSessionsListMessagesResSchema>

// ── ai-messages（消息置顶域）──────────────────────────────────────
export const aiMessagesSetPinnedReqSchema = z
  .object({ messageId: z.number().int().min(1), pinned: z.boolean() })
  .strict()
export type AiMessagesSetPinnedReq = z.infer<typeof aiMessagesSetPinnedReqSchema>

export const aiMessagesSetPinnedResSchema = z.object({ message: aiMessageSchema }).strict()
export type AiMessagesSetPinnedRes = z.infer<typeof aiMessagesSetPinnedResSchema>

/**
 * ai-messages/list-pinned 请求：anchorId 三值语义+交叉矩阵（R1）——
 * undefined=不带该过滤维度（该 scope 全部置顶）/null=仅 global 档/非空串=该锚；
 * 在席即双条件闭合（global⇔null，与写面同构——scope:'paper'+anchorId:null 空洞
 * 组合拒）；空串恒拒（min(1)）
 */
export const aiMessagesListPinnedReqSchema = z
  .object({
    scope: aiScopeSchema,
    anchorId: z.string().min(1).nullable().optional()
  })
  .strict()
  .refine((v) => v.anchorId === undefined || (v.scope === 'global') === (v.anchorId === null), {
    message: '锚矩阵：anchorId 在席时 global 档必须 null，paper/lineage 档必须非空串'
  })
export type AiMessagesListPinnedReq = z.infer<typeof aiMessagesListPinnedReqSchema>

export const aiMessagesListPinnedResSchema = z
  .object({ items: z.array(pinnedMessageItemSchema) })
  .strict()
export type AiMessagesListPinnedRes = z.infer<typeof aiMessagesListPinnedResSchema>

// ── ai-memory（记忆域）────────────────────────────────────────────
/**
 * ai-memory/list-by-scope 请求：query 在席=检索模式（W-1 双语义——恒真组合），
 * 与 category/pinnedOnly 互斥；category/query 携带即须有意义（R2 min(1) 空串拒）；
 * limit 上界=MAX_PAGE_SIZE 单源（constants）
 */
export const aiMemoryListByScopeReqSchema = z
  .object({
    scope: aiScopeSchema,
    category: z.string().min(1).optional(),
    pinnedOnly: z.boolean().optional(),
    query: z.string().min(1).optional(),
    limit: z.number().int().min(1).max(MAX_PAGE_SIZE).optional()
  })
  .strict()
  .refine((v) => v.query === undefined || (v.category === undefined && v.pinnedOnly === undefined), {
    message: 'query 检索模式不得与 category/pinnedOnly 过滤同席'
  })
export type AiMemoryListByScopeReq = z.infer<typeof aiMemoryListByScopeReqSchema>

export const aiMemoryListByScopeResSchema = z
  .object({ items: z.array(aiMemoryListItemSchema) })
  .strict()
export type AiMemoryListByScopeRes = z.infer<typeof aiMemoryListByScopeResSchema>

/**
 * ai-memory/create 请求：锚矩阵（同 open）+档级类目 refine（N-3——category 必须
 * ∈AI_MEMORY_CATEGORIES[scope]，跨档类目拒）；label 可选（缺省归 U2 服务层
 * default ''）；title 界=AI_MEMORY_TITLE_MAX 单源
 */
export const aiMemoryCreateReqSchema = z
  .object({
    scope: aiScopeSchema,
    anchorId: z.string().min(1).nullable(),
    category: z.string().min(1),
    label: z.string().max(AI_MEMORY_LABEL_MAX).optional(),
    title: z.string().min(1).max(AI_MEMORY_TITLE_MAX),
    content: z.string(),
    pinned: z.boolean().optional()
  })
  .strict()
  .refine((v) => (v.scope === 'global') === (v.anchorId === null), {
    message: '锚矩阵：global 档 anchorId 必须 null，paper/lineage 档必须非空串'
  })
  .refine((v) => AI_MEMORY_CATEGORIES[v.scope].includes(v.category), {
    message: 'category 不属于该 scope 档的冻结类目集（19 类 6+7+6 跨档隔离）'
  })
export type AiMemoryCreateReq = z.infer<typeof aiMemoryCreateReqSchema>

export const aiMemoryCreateResSchema = z.object({ item: aiMemorySchema }).strict()
export type AiMemoryCreateRes = z.infer<typeof aiMemoryCreateResSchema>

/**
 * ai-memory/update 请求：patch 合并语义（未携带字段保留）。category 的档级校验
 * 需行 scope（DB 态）——zod 层只验 ∈19 值并集（flat refine），档级矩阵归 U2
 * 服务层（接缝声明，tests/contracts/ai-schemas.test.ts 头注同款）。空 patch={}
 * =合法无操作（服务层语义 U2 定案：仅刷新 updated_at 或原样返回——k3-N3）
 */
export const aiMemoryUpdateReqSchema = z
  .object({
    id: z.number().int().min(1),
    patch: z
      .object({
        label: z.string().max(AI_MEMORY_LABEL_MAX).optional(),
        title: z.string().min(1).max(AI_MEMORY_TITLE_MAX).optional(),
        content: z.string().optional(),
        category: z.string().min(1).optional()
      })
      .strict()
  })
  .strict()
  .refine((v) => v.patch.category === undefined || AI_MEMORY_CATEGORY_UNION.includes(v.patch.category), {
    message: 'category 不在冻结类目并集（19 类；档级归属校验在服务层）'
  })
export type AiMemoryUpdateReq = z.infer<typeof aiMemoryUpdateReqSchema>

export const aiMemoryUpdateResSchema = z.object({ item: aiMemorySchema }).strict()
export type AiMemoryUpdateRes = z.infer<typeof aiMemoryUpdateResSchema>

/** ai-memory/delete 请求（Res=trueAckSchema——见文件头注，不在此导出） */
export const aiMemoryDeleteReqSchema = z.object({ id: z.number().int().min(1) }).strict()
export type AiMemoryDeleteReq = z.infer<typeof aiMemoryDeleteReqSchema>

export const aiMemorySetPinnedReqSchema = z
  .object({ id: z.number().int().min(1), pinned: z.boolean() })
  .strict()
export type AiMemorySetPinnedReq = z.infer<typeof aiMemorySetPinnedReqSchema>

export const aiMemorySetPinnedResSchema = z.object({ item: aiMemorySchema }).strict()
export type AiMemorySetPinnedRes = z.infer<typeof aiMemorySetPinnedResSchema>

// ── ai-tasks（任务域）─────────────────────────────────────────────
/**
 * ai-tasks/list 请求：anchorId 三值语义+交叉矩阵（R1）——scope/anchorId 任一
 * 缺省=不带该过滤维度（scope 缺省=跨档全列；无 scope 的 anchorId:null=global-only
 * 跨档过滤，有意义合法形）；双在席即双条件闭合（global⇔null，与写面同构——
 * scope:'paper'+anchorId:null 空洞组合拒）；空串恒拒（min(1)）
 */
export const aiTasksListReqSchema = z
  .object({
    scope: aiScopeSchema.optional(),
    anchorId: z.string().min(1).nullable().optional(),
    status: aiTaskStatusSchema.optional(),
    limit: z.number().int().min(1).max(MAX_PAGE_SIZE).optional()
  })
  .strict()
  .refine((v) => v.scope === undefined || v.anchorId === undefined || (v.scope === 'global') === (v.anchorId === null), {
    message: '锚矩阵：anchorId 与 scope 双在席时 global 档必须 null，paper/lineage 档必须非空串'
  })
export type AiTasksListReq = z.infer<typeof aiTasksListReqSchema>

export const aiTasksListResSchema = z.object({ tasks: z.array(aiTaskSchema) }).strict()
export type AiTasksListRes = z.infer<typeof aiTasksListResSchema>

export const aiTasksCancelReqSchema = z.object({ taskId: z.number().int().min(1) }).strict()
export type AiTasksCancelReq = z.infer<typeof aiTasksCancelReqSchema>

export const aiTasksCancelResSchema = z.object({ task: aiTaskSchema }).strict()
export type AiTasksCancelRes = z.infer<typeof aiTasksCancelResSchema>

/**
 * ai-tasks/list-audit 请求：limit 缺省 100 归服务层（本层只锁上界）；
 * afterSeq=游标翻页（0 起——seq min0）
 */
export const aiAuditListReqSchema = z
  .object({
    taskId: z.number().int().min(1),
    afterSeq: z.number().int().min(0).optional(),
    limit: z.number().int().min(1).max(MAX_PAGE_SIZE).optional()
  })
  .strict()
export type AiAuditListReq = z.infer<typeof aiAuditListReqSchema>

export const aiAuditListResSchema = z.object({ rows: z.array(aiAuditRowSchema) }).strict()
export type AiAuditListRes = z.infer<typeof aiAuditListResSchema>

// ── ai-cascade（随锚级联预览——两次确认第一跳）──────────────────────
/**
 * 独立枚举独立矩阵（W-2b）：paper→papers.id / folder→collections.id（folder=
 * lineage 档的 UI 语——AI 域内 lineage 称 folder）；anchorId 恒必填非空串，
 * 无 null 态（级联预览必锚定具体目标）
 */
export const aiCascadePreviewReqSchema = z
  .object({
    scope: z.enum(['paper', 'folder']),
    anchorId: z.string().min(1)
  })
  .strict()
export type AiCascadePreviewReq = z.infer<typeof aiCascadePreviewReqSchema>

export const aiCascadePreviewResSchema = z.object({ counts: aiCascadeCountsSchema }).strict()
export type AiCascadePreviewRes = z.infer<typeof aiCascadePreviewResSchema>
