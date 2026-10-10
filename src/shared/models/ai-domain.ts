/**
 * [F-DBCAMP-01 DB-2 U1] AI 域模型（会话/消息/记忆/任务/审计/预算档）——020 表族
 * 的跨进程单源契约（UI 批 U1 交付面；13 通道 Req/Res=ipc/ai-schemas.ts 消费本件）。
 *
 * 接缝锚定（INV-11 体例，先例=ai-note.ts）：
 * - scope/origin 值集与 AI_MEMORY_CATEGORIES 分类体系真相=迁移 020 DDL CHECK
 *   （src/main/db/migrations/020_ai_domain.sql）；本文件 zod 枚举/常量为镜像
 *   消费——两处值集必须一致，扩展需新迁移+[locked-change]（19 类 6+7+6 跨档
 *   零同名冻结，用户定稿案）。
 * - AI_AUDIT_KINDS：DDL 对 kind 无 CHECK——值域=服务层冻结 8 值，本枚举为
 *   IPC 边界校验单源。
 * - AI_BUDGET_DEFAULTS：预算默认值（§9 实现常数——L1/L2 上限与配额逐值吻合）；
 *   appSettingsSchema 经 .default() 消费（默认值自洽=parse 必绿，契约测试锚定）。
 *
 * 行级投影口径（IPC 面 vs DB 行）：
 * - pinned 0|1 → boolean（DB 行形状见 repos；IPC 投影布尔——aiMessage/aiMemory）。
 * - aiMessage 剥 updatedAt（读面无消费——U2 投影主动剥离，DB 行含该列）。
 * - AiTask 无 sessionId（020 无列——UI 按 scope+anchorId 过滤）；scope 恒锚定档
 *   （'paper'|'lineage'，无 global）；anchorId 顶层恒在非空串；targetTitle=U2
 *   LEFT JOIN 投影恒在可空；result=列原文 string|null（摘要派生归 U2/UI）。
 * - AiAuditRow.detail 单字段（string|null）：before/after 已内嵌 detail 文本
 *   各截 200 字符（服务层组装口径）；行键=taskId+seq（无 id——UNIQUE 对即定位）。
 * - aiMemory.label 读模型诚实可空（DDL 列可空）；写侧 create Req 的 label 可选
 *   缺省——default '' 归 U2 服务层。
 * - 时间字段=z.string()（TEXT ISO 先例）；id 数字列=z.number().int().min(1)。
 */
import { z } from 'zod'

// ── 枚举/常量 ────────────────────────────────────────────────────
/** scope 枚举镜像（真相=迁移 020 DDL CHECK——见文件头注接缝锚定） */
export const AI_SCOPES = ['paper', 'lineage', 'global'] as const
export type AiScope = (typeof AI_SCOPES)[number]
export const aiScopeSchema = z.enum(AI_SCOPES)

/** 任务动作白名单（9 值——020 ai_tasks.action CHECK 同源镜像） */
export const AI_TASK_ACTIONS = [
  'memory.create',
  'memory.update',
  'memory.delete',
  'memory.pin',
  'memory.unpin',
  'memory.search',
  'memory.list',
  'message.pin',
  'message.unpin'
] as const
export type AiTaskAction = (typeof AI_TASK_ACTIONS)[number]
export const aiTaskActionSchema = z.enum(AI_TASK_ACTIONS)

/** 任务态（6 值——020 ai_tasks.status CHECK 同源镜像） */
export const AI_TASK_STATUSES = ['queued', 'running', 'succeeded', 'failed', 'timeout', 'cancelled'] as const
export type AiTaskStatus = (typeof AI_TASK_STATUSES)[number]
export const aiTaskStatusSchema = z.enum(AI_TASK_STATUSES)

/** 审计 kind 冻结集（8 值——DDL 无 CHECK，值域单源=服务层写入侧） */
export const AI_AUDIT_KINDS = [
  'submitted',
  'target_resolved',
  'mutated',
  'result_overflow',
  'succeeded',
  'failed',
  'timeout',
  'cancelled'
] as const
export type AiAuditKind = (typeof AI_AUDIT_KINDS)[number]
export const aiAuditKindSchema = z.enum(AI_AUDIT_KINDS)

/** 记忆来源（020 ai_memory.origin CHECK 同源镜像） */
export const AI_MEMORY_ORIGINS = ['manual', 'agent'] as const
export type AiMemoryOrigin = (typeof AI_MEMORY_ORIGINS)[number]
export const aiMemoryOriginSchema = z.enum(AI_MEMORY_ORIGINS)

/**
 * 三档冻结类目（020 ai_memory 条件 CHECK 逐字镜像——19 类 6+7+6 跨档零同名；
 * 档间完全隔离，扩展需新迁移+[locked-change]——见文件头注接缝锚定）
 */
export const AI_MEMORY_CATEGORIES: Record<AiScope, readonly string[]> = {
  paper: [
    'excerpt_quote',
    'method_note',
    'data_evidence',
    'critique_limit',
    'term_glossary',
    'reading_insight'
  ],
  lineage: [
    'node_role',
    'relation_note',
    'branch_summary',
    'timeline_milestone',
    'controversy_debate',
    'gap_opportunity',
    'domain_glossary'
  ],
  global: [
    'user_preference',
    'ui_guidance',
    'capability_note',
    'automation_recipe',
    'task_outcome',
    'constraint_limit'
  ]
}

/** title 长度界（020 DDL CHECK length BETWEEN 1 AND 120 镜像） */
export const AI_MEMORY_TITLE_MAX = 120
/** label 长度界（IPC 写面可选上限——值=设计定稿 §3.2 终裁 W-3（label 可选
 *  string ≤50 default ''）；DDL 列无 CHECK，界单源在此） */
export const AI_MEMORY_LABEL_MAX = 50

// ── 实体 schema ──────────────────────────────────────────────────
export const aiSessionSchema = z
  .object({
    id: z.number().int().min(1),
    scope: aiScopeSchema,
    /** global=NULL / paper→papers.id / lineage→collections.id（多态锚） */
    anchorId: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string()
  })
  .strict()
export type AiSession = z.infer<typeof aiSessionSchema>

export const aiMessageSchema = z
  .object({
    id: z.number().int().min(1),
    sessionId: z.number().int().min(1),
    role: z.enum(['user', 'assistant']),
    content: z.string(),
    /** DB pinned 0|1 → IPC 布尔投影（见文件头注行级投影口径） */
    pinned: z.boolean(),
    createdAt: z.string()
  })
  .strict()
export type AiMessage = z.infer<typeof aiMessageSchema>

/** 置顶消息列表项（ai-messages/list-pinned 投影：+锚目标标题） */
export const pinnedMessageItemSchema = aiMessageSchema.extend({
  anchorTitle: z.string().nullable()
})
export type PinnedMessageItem = z.infer<typeof pinnedMessageItemSchema>

export const aiMemorySchema = z
  .object({
    id: z.number().int().min(1),
    scope: aiScopeSchema,
    anchorId: z.string().nullable(),
    category: z.string(),
    /** 读模型诚实可空（DDL 列可空——S7；写侧 default '' 归 U2 服务层） */
    label: z.string().nullable(),
    title: z.string().min(1).max(AI_MEMORY_TITLE_MAX),
    content: z.string(),
    pinned: z.boolean(),
    origin: aiMemoryOriginSchema,
    createdAt: z.string(),
    updatedAt: z.string()
  })
  .strict()
export type AiMemory = z.infer<typeof aiMemorySchema>

/** 记忆列表项（ai-memory/list-by-scope 投影：+锚目标标题——U2 LEFT JOIN） */
export const aiMemoryListItemSchema = aiMemorySchema.extend({
  anchorTitle: z.string().nullable()
})
export type AiMemoryListItem = z.infer<typeof aiMemoryListItemSchema>

/** 任务行（S2/S3/S4/S5：无 sessionId；行级平铺 scope/anchorId 恒在；status 非 state） */
export const aiTaskSchema = z
  .object({
    id: z.number().int().min(1),
    scope: z.enum(['paper', 'lineage']),
    anchorId: z.string().min(1),
    action: aiTaskActionSchema,
    status: aiTaskStatusSchema,
    result: z.string().nullable(),
    error: z.string().nullable(),
    idempotencyKey: z.string().nullable(),
    targetTitle: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string()
  })
  .strict()
export type AiTask = z.infer<typeof aiTaskSchema>

/** 审计行（G2 append-only 读面；kind 冻结 8 值——S6；detail 单字段） */
export const aiAuditRowSchema = z
  .object({
    taskId: z.number().int().min(1),
    seq: z.number().int().min(0),
    kind: aiAuditKindSchema,
    detail: z.string().nullable(),
    createdAt: z.string()
  })
  .strict()
export type AiAuditRow = z.infer<typeof aiAuditRowSchema>

/** 随锚级联预览计数（ai-cascade/preview 响应载荷） */
export const aiCascadeCountsSchema = z
  .object({
    sessions: z.number().int().min(0),
    messages: z.number().int().min(0),
    memories: z.number().int().min(0),
    tasks: z.number().int().min(0)
  })
  .strict()
export type AiCascadeCounts = z.infer<typeof aiCascadeCountsSchema>

// ── 预算档（§9 实现常数——appSettings.aiBudgets 形状单源）───────────
/** 单档预算：refine 档内合计 l1+l2Cap+tail<=cap（三项皆 prompt 装配份额） */
export const aiBudgetTierSchema = z
  .object({
    cap: z.number().int().min(0),
    l1: z.number().int().min(0),
    l2Slices: z.number().int().min(0),
    l2Cap: z.number().int().min(0),
    tail: z.number().int().min(0)
  })
  .strict()
  .refine((v) => v.l1 + v.l2Cap + v.tail <= v.cap, { message: '预算档内合计超上限' })
export type AiBudgetTier = z.infer<typeof aiBudgetTierSchema>

/** 代理拉取预算：refine perShot<=perRound（单轮含多拍） */
export const aiAgentBudgetSchema = z
  .object({
    perShot: z.number().int().min(0),
    perRound: z.number().int().min(0)
  })
  .strict()
  .refine((v) => v.perShot <= v.perRound, { message: '单次拉取预算不得超过单轮预算' })
export type AiAgentBudget = z.infer<typeof aiAgentBudgetSchema>

export const aiBudgetsSchema = z
  .object({
    paper: aiBudgetTierSchema,
    lineage: aiBudgetTierSchema,
    global: aiBudgetTierSchema,
    agent: aiAgentBudgetSchema
  })
  .strict()
export type AiBudgets = z.infer<typeof aiBudgetsSchema>

/**
 * 默认预算档（§9 表逐值；satisfies 锚定=aiBudgetsSchema 输出形——默认值自洽
 * parse 必绿；R6 as const=编译期只读——app-error.ts as const satisfies 先例；
 * 纯对象无数组，不踩 readonly→mutable 数组坑。
 * 〔门一 k3-W1 r2〕运行时两级冻结：as const 不约束运行时，本常量为模块级
 * 唯一实例且被 zod default getter 与 settings.service DEFAULTS 回退路径共享
 * 引用——冻结后任何消费方原地改写在 strict 模式=TypeError（响亮失败），
 * 常量污染通道全闭（zod 侧另有 structuredClone 每 parse 独立副本，不受冻结影响）
 */
export const AI_BUDGET_DEFAULTS = {
  paper: { cap: 8000, l1: 800, l2Slices: 15, l2Cap: 2200, tail: 1000 },
  lineage: { cap: 6000, l1: 1800, l2Slices: 3, l2Cap: 600, tail: 1200 },
  global: { cap: 4000, l1: 600, l2Slices: 8, l2Cap: 1200, tail: 1000 },
  agent: { perShot: 800, perRound: 2000 }
} as const satisfies AiBudgets

for (const tier of Object.values(AI_BUDGET_DEFAULTS)) Object.freeze(tier)
Object.freeze(AI_BUDGET_DEFAULTS)
