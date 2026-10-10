import { describe, expect, it } from 'vitest'
import * as M from '../../src/shared/models/ai-domain'
import * as A from '../../src/shared/ipc/ai-schemas'
import { appSettingsSchema } from '../../src/shared/ipc/schemas'
import { MAX_PAGE_SIZE } from '../../src/shared/constants'

/**
 * [F-DBCAMP-01 DB-2 U1] AI 域契约测试——ipc/ai-schemas.ts（13 通道 Req/Res）
 * +models/ai-domain.ts（实体/枚举/预算常量）。
 *
 * 接缝声明：aiMemoryUpdateReq 的档级 category 校验
 * （category∈AI_MEMORY_CATEGORIES[行 scope]）需 DB 行 scope——归 U2 服务层；
 * 本文件 zod 面只锁「category∈19 值并集」（flat refine）。
 * 通道名一律斜杠形（S1 主控预裁）：ai-sessions/open、ai-memory/create 等。
 * 新测试 always-active（不经 guardedDescribe——K3 威胁在三屋结构性缺位）。
 */

const ISO = '2026-01-01T00:00:00.000Z'

// ── 实体夹具（最小合法形）────────────────────────────────────────
const memoryItem = {
  id: 1,
  scope: 'paper' as const,
  anchorId: 'p1',
  category: 'excerpt_quote',
  label: null,
  title: 't',
  content: 'c',
  pinned: false,
  origin: 'manual' as const,
  createdAt: ISO,
  updatedAt: ISO
}
const taskItem = {
  id: 1,
  scope: 'paper' as const,
  anchorId: 'p1',
  action: 'memory.create' as const,
  status: 'queued' as const,
  result: null,
  error: null,
  idempotencyKey: null,
  targetTitle: null,
  createdAt: ISO,
  updatedAt: ISO
}
/** 预算档超限形（§三-戊 组 6 构造式：合法和值 4001+cap 收紧到 4000=和-1） */
const tierOver = { cap: 4000, l1: 800, l2Slices: 15, l2Cap: 2200, tail: 1001 }

describe('contracts/ai-schemas —— AI 域 13 通道+实体/常量契约矩阵（[F-DBCAMP-01 DB-2 U1]）', () => {
  it('组1 锚矩阵（ai-sessions/open+ai-memory/create）：合法 3 形过、非法 3 形拒（global⇔null 双向）', () => {
    // open：合法 3 形
    expect(A.aiSessionsOpenReqSchema.safeParse({ scope: 'global', anchorId: null }).success).toBe(true)
    expect(A.aiSessionsOpenReqSchema.safeParse({ scope: 'paper', anchorId: 'p1' }).success).toBe(true)
    expect(A.aiSessionsOpenReqSchema.safeParse({ scope: 'lineage', anchorId: 'c1' }).success).toBe(true)
    // open：非法 3 形
    expect(A.aiSessionsOpenReqSchema.safeParse({ scope: 'global', anchorId: 'p1' }).success).toBe(false)
    expect(A.aiSessionsOpenReqSchema.safeParse({ scope: 'paper', anchorId: null }).success).toBe(false)
    expect(A.aiSessionsOpenReqSchema.safeParse({ scope: 'lineage', anchorId: null }).success).toBe(false)
    // R8 写面空串锚：anchorId 空串拒（min(1)——非 null 语义冒充）
    expect(A.aiSessionsOpenReqSchema.safeParse({ scope: 'paper', anchorId: '' }).success).toBe(false)
    // create：合法 3 形（category 取各自档内合法值）
    expect(
      A.aiMemoryCreateReqSchema.safeParse({ scope: 'global', anchorId: null, category: 'user_preference', title: 't', content: 'c' }).success
    ).toBe(true)
    expect(
      A.aiMemoryCreateReqSchema.safeParse({ scope: 'paper', anchorId: 'p1', category: 'excerpt_quote', title: 't', content: 'c' }).success
    ).toBe(true)
    expect(
      A.aiMemoryCreateReqSchema.safeParse({ scope: 'lineage', anchorId: 'c1', category: 'node_role', title: 't', content: 'c' }).success
    ).toBe(true)
    // create：非法 3 形（仅锚矩阵违规——category 全取档内合法值排除串扰）
    expect(
      A.aiMemoryCreateReqSchema.safeParse({ scope: 'global', anchorId: 'p1', category: 'user_preference', title: 't', content: 'c' }).success
    ).toBe(false)
    expect(
      A.aiMemoryCreateReqSchema.safeParse({ scope: 'paper', anchorId: null, category: 'excerpt_quote', title: 't', content: 'c' }).success
    ).toBe(false)
    expect(
      A.aiMemoryCreateReqSchema.safeParse({ scope: 'lineage', anchorId: null, category: 'node_role', title: 't', content: 'c' }).success
    ).toBe(false)
    // R8 写面空串锚（create 同形）
    expect(
      A.aiMemoryCreateReqSchema.safeParse({ scope: 'paper', anchorId: '', category: 'excerpt_quote', title: 't', content: 'c' }).success
    ).toBe(false)
  })

  it('组2 读通道交叉矩阵（list-pinned/tasks-list，R1）：anchorId 缺省=过滤维度逃逸、在席即锚矩阵闭合（与写面同构）；空串/空洞组合拒；scope 缺省过；status 外值拒', () => {
    // list-pinned：anchorId 缺省=不带该过滤维度；在席=global⇔null 双条件闭合；空串恒拒
    expect(A.aiMessagesListPinnedReqSchema.safeParse({ scope: 'global' }).success).toBe(true)
    expect(A.aiMessagesListPinnedReqSchema.safeParse({ scope: 'global', anchorId: null }).success).toBe(true)
    expect(A.aiMessagesListPinnedReqSchema.safeParse({ scope: 'paper', anchorId: 'p1' }).success).toBe(true)
    expect(A.aiMessagesListPinnedReqSchema.safeParse({ scope: 'paper', anchorId: '' }).success).toBe(false)
    expect(A.aiMessagesListPinnedReqSchema.safeParse({ scope: 'global', anchorId: 'p1' }).success).toBe(false)
    expect(A.aiMessagesListPinnedReqSchema.safeParse({ scope: 'paper', anchorId: null }).success).toBe(false)
    // tasks-list：scope/anchorId 任一缺省=逃逸（无 scope 的 anchorId:null=global-only
    // 跨档过滤，有意义合法形）；双在席=锚矩阵闭合（scope:'paper'+anchorId:null
    // =空洞组合拒——R1 翻转锚）
    expect(A.aiTasksListReqSchema.safeParse({}).success).toBe(true)
    expect(A.aiTasksListReqSchema.safeParse({ scope: 'paper', anchorId: 'p1' }).success).toBe(true)
    expect(A.aiTasksListReqSchema.safeParse({ anchorId: null }).success).toBe(true)
    expect(A.aiTasksListReqSchema.safeParse({ scope: 'global', anchorId: null }).success).toBe(true)
    expect(A.aiTasksListReqSchema.safeParse({ scope: 'paper', anchorId: null }).success).toBe(false)
    expect(A.aiTasksListReqSchema.safeParse({ scope: 'paper', anchorId: '' }).success).toBe(false)
    expect(A.aiTasksListReqSchema.safeParse({ scope: 'global', anchorId: 'p1' }).success).toBe(false)
    expect(A.aiTasksListReqSchema.safeParse({ scope: 'paper', status: 'queued' }).success).toBe(true)
    expect(A.aiTasksListReqSchema.safeParse({ scope: 'paper', status: 'paused' }).success).toBe(false)
  })

  it('组3 cascade 独立矩阵（ai-cascade/preview）：scope 仅 paper/folder；lineage/global 拒；anchorId 恒必填非空（缺省/null/空串拒）', () => {
    expect(A.aiCascadePreviewReqSchema.safeParse({ scope: 'paper', anchorId: 'p1' }).success).toBe(true)
    expect(A.aiCascadePreviewReqSchema.safeParse({ scope: 'folder', anchorId: 'c1' }).success).toBe(true)
    expect(A.aiCascadePreviewReqSchema.safeParse({ scope: 'lineage', anchorId: 'c1' }).success).toBe(false)
    expect(A.aiCascadePreviewReqSchema.safeParse({ scope: 'global', anchorId: 'p1' }).success).toBe(false)
    expect(A.aiCascadePreviewReqSchema.safeParse({ scope: 'paper' }).success).toBe(false)
    expect(A.aiCascadePreviewReqSchema.safeParse({ scope: 'paper', anchorId: null }).success).toBe(false)
    expect(A.aiCascadePreviewReqSchema.safeParse({ scope: 'paper', anchorId: '' }).success).toBe(false)
  })

  it('组4 ai-memory/list-by-scope 互斥（W-1）：query 与 category/pinnedOnly 互斥；limit 0 拒/MAX_PAGE_SIZE 过/超 1 拒', () => {
    const base = { scope: 'paper' as const }
    expect(A.aiMemoryListByScopeReqSchema.safeParse({ ...base, query: '关键词' }).success).toBe(true) // query 独过
    expect(A.aiMemoryListByScopeReqSchema.safeParse({ ...base, query: 'q', category: 'excerpt_quote' }).success).toBe(false)
    expect(A.aiMemoryListByScopeReqSchema.safeParse({ ...base, query: 'q', pinnedOnly: true }).success).toBe(false)
    expect(A.aiMemoryListByScopeReqSchema.safeParse({ ...base, category: 'excerpt_quote', pinnedOnly: true }).success).toBe(true)
    expect(A.aiMemoryListByScopeReqSchema.safeParse({ ...base, limit: 0 }).success).toBe(false)
    expect(A.aiMemoryListByScopeReqSchema.safeParse({ ...base, limit: MAX_PAGE_SIZE }).success).toBe(true)
    expect(A.aiMemoryListByScopeReqSchema.safeParse({ ...base, limit: MAX_PAGE_SIZE + 1 }).success).toBe(false)
    // R2 空串锚：category/query 空串拒（min(1)——携带即须有意义）
    expect(A.aiMemoryListByScopeReqSchema.safeParse({ ...base, category: '' }).success).toBe(false)
    expect(A.aiMemoryListByScopeReqSchema.safeParse({ ...base, query: '' }).success).toBe(false)
  })

  it('组4b [r1 R3] query⊥limit 互斥扩：query+limit 同席拒；limit 缺席（检索模式无 limit）过', () => {
    const base = { scope: 'paper' as const }
    expect(A.aiMemoryListByScopeReqSchema.safeParse({ ...base, query: '关键词', limit: 50 }).success).toBe(false)
    expect(A.aiMemoryListByScopeReqSchema.safeParse({ ...base, query: '关键词' }).success).toBe(true)
  })

  it('组5 category 值域（N-3 档级）：create 跨档拒/档内过/未知串拒；update 并集过+外值拒；title 长度界 120/121（变异红证锚）', () => {
    // create：档级值域
    expect(
      A.aiMemoryCreateReqSchema.safeParse({ scope: 'paper', anchorId: 'p1', category: 'node_role', title: 't', content: 'c' }).success
    ).toBe(false) // 跨档（node_role 属 lineage）
    expect(
      A.aiMemoryCreateReqSchema.safeParse({ scope: 'paper', anchorId: 'p1', category: 'excerpt_quote', title: 't', content: 'c' }).success
    ).toBe(true)
    expect(
      A.aiMemoryCreateReqSchema.safeParse({ scope: 'lineage', anchorId: 'c1', category: 'node_role', title: 't', content: 'c' }).success
    ).toBe(true)
    expect(
      A.aiMemoryCreateReqSchema.safeParse({ scope: 'global', anchorId: null, category: 'user_preference', title: 't', content: 'c' }).success
    ).toBe(true)
    expect(
      A.aiMemoryCreateReqSchema.safeParse({ scope: 'paper', anchorId: 'p1', category: 'bogus', title: 't', content: 'c' }).success
    ).toBe(false)
    // update：zod 层只锁 19 值并集（档级矩阵归 U2 服务层按行 scope——见文件头注）
    expect(A.aiMemoryUpdateReqSchema.safeParse({ id: 1, patch: { category: 'node_role' } }).success).toBe(true)
    expect(A.aiMemoryUpdateReqSchema.safeParse({ id: 1, patch: { category: 'excerpt_quote' } }).success).toBe(true)
    expect(A.aiMemoryUpdateReqSchema.safeParse({ id: 1, patch: { category: 'bogus' } }).success).toBe(false)
    // create title 长度界（DDL CHECK length 1..120 镜像）
    expect(
      A.aiMemoryCreateReqSchema.safeParse({ scope: 'paper', anchorId: 'p1', category: 'excerpt_quote', title: '题'.repeat(120), content: 'c' }).success
    ).toBe(true)
    expect(
      A.aiMemoryCreateReqSchema.safeParse({ scope: 'paper', anchorId: 'p1', category: 'excerpt_quote', title: '题'.repeat(121), content: 'c' }).success
    ).toBe(false)
    // R3 label 界锚：50 过/51 拒（AI_MEMORY_LABEL_MAX——设计定稿 §3.2 终裁 W-3）
    expect(
      A.aiMemoryCreateReqSchema.safeParse({ scope: 'paper', anchorId: 'p1', category: 'excerpt_quote', title: 't', content: 'c', label: '标'.repeat(50) }).success
    ).toBe(true)
    expect(
      A.aiMemoryCreateReqSchema.safeParse({ scope: 'paper', anchorId: 'p1', category: 'excerpt_quote', title: 't', content: 'c', label: '标'.repeat(51) }).success
    ).toBe(false)
  })

  it('组6 预算 refine：默认档 parse 绿；l1+l2Cap+tail=cap+1 拒（和 4001>cap 4000）；负数/非整数拒；perShot=perRound 过/+1 拒', () => {
    expect(M.aiBudgetsSchema.safeParse(M.AI_BUDGET_DEFAULTS).success).toBe(true)
    // 超限形：800+2200+1001=4001（和值合法）+cap 收紧 4000=和-1 → 4001>4000 拒
    expect(M.aiBudgetTierSchema.safeParse(tierOver).success).toBe(false)
    // 边界对偶：cap=和值 4001（恰等于）过——refine 为 <= 非严格小于
    expect(M.aiBudgetTierSchema.safeParse({ ...tierOver, cap: 4001 }).success).toBe(true)
    // 负数拒（int min0）
    expect(M.aiBudgetTierSchema.safeParse({ cap: -1, l1: 0, l2Slices: 0, l2Cap: 0, tail: 0 }).success).toBe(false)
    // 非整数拒（int）
    expect(M.aiBudgetTierSchema.safeParse({ cap: 0.5, l1: 0, l2Slices: 0, l2Cap: 0, tail: 0 }).success).toBe(false)
    // agent：perShot<=perRound
    expect(M.aiAgentBudgetSchema.safeParse({ perShot: 800, perRound: 800 }).success).toBe(true)
    expect(M.aiAgentBudgetSchema.safeParse({ perShot: 801, perRound: 800 }).success).toBe(false)
  })

  it('组7 appSettings 集成：旧形 parse 补默认预算档（toEqual 深比）；全形往返；未知字段拒；默认档引用隔离（R6）', () => {
    const parsed = appSettingsSchema.parse({ contactEmail: 'u@e.com' })
    expect(parsed.theme).toBe('light')
    expect(parsed.uiScale).toBe('small')
    expect(parsed.aiBudgets).toEqual(M.AI_BUDGET_DEFAULTS)
    // R6 引用隔离：default getter 每次独立深副本——两次 parse 的 aiBudgets 不共享
    // 模块常量引用（消费方原地污染不得穿透到后续 parse 输出）
    const second = appSettingsSchema.parse({ contactEmail: 'u@e.com' })
    expect(parsed.aiBudgets).not.toBe(second.aiBudgets)
    expect(parsed.aiBudgets.paper).not.toBe(second.aiBudgets.paper)
    const full = {
      contactEmail: 'u@e.com',
      theme: 'dark' as const,
      uiScale: 'large' as const,
      aiBudgets: M.AI_BUDGET_DEFAULTS
    }
    expect(appSettingsSchema.parse(full)).toEqual(full)
    expect(appSettingsSchema.safeParse({ contactEmail: 'u@e.com', bogus: 1 }).success).toBe(false)
  })

  it('组8 实体负锚：aiTask 未知字段/scope:global 拒（S3）；aiAuditRow kind 冻结 8 值外拒×2+detail:null 过（S6）；aiMemory label:null 过（S7）', () => {
    expect(M.aiTaskSchema.safeParse(taskItem).success).toBe(true)
    expect(M.aiTaskSchema.safeParse({ ...taskItem, __probe: 1 }).success).toBe(false) // strict 未知字段拒
    expect(M.aiTaskSchema.safeParse({ ...taskItem, scope: 'global' }).success).toBe(false) // S3：task 恒锚定档
    const auditRow = { taskId: 1, seq: 0, kind: 'submitted' as const, detail: null, createdAt: ISO }
    expect(M.aiAuditRowSchema.safeParse(auditRow).success).toBe(true)
    expect(M.aiAuditRowSchema.safeParse({ ...auditRow, kind: 'permission' }).success).toBe(false)
    expect(M.aiAuditRowSchema.safeParse({ ...auditRow, kind: 'mutation' }).success).toBe(false)
    // R7 detail 正形（服务层组装口径：before/after 内嵌文本各截 200 字符）
    expect(M.aiAuditRowSchema.safeParse({ ...auditRow, detail: 'before=(null) after=title:t1→t2' }).success).toBe(true)
    expect(M.aiMemorySchema.safeParse(memoryItem).success).toBe(true) // label:null 过（S7 读模型诚实可空）
    expect(M.aiMemorySchema.safeParse({ ...memoryItem, label: '标签' }).success).toBe(true)
  })

  it('组9 常量闭合 pin：三档类目计数 6/7/6+19 值并集跨档零同名；动作 9/态 6/审计 kind 8；AI_BUDGET_DEFAULTS 17 值字面 pin；R4 四枚举全量字面 pin', () => {
    expect(M.AI_MEMORY_CATEGORIES.paper).toHaveLength(6)
    expect(M.AI_MEMORY_CATEGORIES.lineage).toHaveLength(7)
    expect(M.AI_MEMORY_CATEGORIES.global).toHaveLength(6)
    expect(
      new Set([...M.AI_MEMORY_CATEGORIES.paper, ...M.AI_MEMORY_CATEGORIES.lineage, ...M.AI_MEMORY_CATEGORIES.global]).size
    ).toBe(19) // 跨档零同名机检（并集大小=总和 19）
    expect(M.AI_TASK_ACTIONS).toHaveLength(9)
    expect(M.AI_TASK_STATUSES).toHaveLength(6)
    expect(M.AI_AUDIT_KINDS).toHaveLength(8)
    expect(M.AI_BUDGET_DEFAULTS).toEqual({
      paper: { cap: 8000, l1: 800, l2Slices: 15, l2Cap: 2200, tail: 1000 },
      lineage: { cap: 6000, l1: 1800, l2Slices: 3, l2Cap: 600, tail: 1200 },
      global: { cap: 4000, l1: 600, l2Slices: 8, l2Cap: 1200, tail: 1000 },
      agent: { perShot: 800, perRound: 2000 }
    })
    // R4 枚举字面 pin（新增/删改枚举值须意识化同步本字面——计数 pin 盖不住错值）
    expect(M.AI_TASK_ACTIONS).toEqual([
      'memory.create',
      'memory.update',
      'memory.delete',
      'memory.pin',
      'memory.unpin',
      'memory.search',
      'memory.list',
      'message.pin',
      'message.unpin'
    ])
    expect(M.AI_TASK_STATUSES).toEqual(['queued', 'running', 'succeeded', 'failed', 'timeout', 'cancelled'])
    expect(M.AI_AUDIT_KINDS).toEqual([
      'submitted',
      'target_resolved',
      'mutated',
      'result_overflow',
      'succeeded',
      'failed',
      'timeout',
      'cancelled'
    ])
    expect(M.AI_MEMORY_CATEGORIES).toEqual({
      paper: ['excerpt_quote', 'method_note', 'data_evidence', 'critique_limit', 'term_glossary', 'reading_insight'],
      lineage: [
        'node_role',
        'relation_note',
        'branch_summary',
        'timeline_milestone',
        'controversy_debate',
        'gap_opportunity',
        'domain_glossary'
      ],
      global: ['user_preference', 'ui_guidance', 'capability_note', 'automation_recipe', 'task_outcome', 'constraint_limit']
    })
    // [k3-W1 r2] 运行时两级冻结锚（主控亲笔）：as const 仅编译期——常量被 zod
    // default getter 与 settings.service DEFAULTS 共享引用，冻结=原地改写通道全闭
    expect(Object.isFrozen(M.AI_BUDGET_DEFAULTS)).toBe(true)
    expect(Object.isFrozen(M.AI_BUDGET_DEFAULTS.paper)).toBe(true)
    expect(Object.isFrozen(M.AI_BUDGET_DEFAULTS.agent)).toBe(true)
  })

  it('组10 Res smoke（R5）：12 件 Res schema 合法形逐件过+错键名拒锚（sessions/memory/count）', () => {
    const session = { id: 1, scope: 'paper' as const, anchorId: 'p1', createdAt: ISO, updatedAt: ISO }
    const message = { id: 1, sessionId: 1, role: 'user' as const, content: 'c', pinned: false, createdAt: ISO }
    const counts = { sessions: 1, messages: 2, memories: 3, tasks: 4 }
    const audit = { taskId: 1, seq: 0, kind: 'submitted' as const, detail: null, createdAt: ISO }
    const pinnedItem = { ...message, anchorTitle: '论文' }
    const memoryListEntry = { ...memoryItem, anchorTitle: '论文' }
    expect(A.aiSessionsOpenResSchema.safeParse({ session }).success).toBe(true)
    expect(A.aiSessionsListMessagesResSchema.safeParse({ messages: [message] }).success).toBe(true)
    expect(A.aiMessagesSetPinnedResSchema.safeParse({ message }).success).toBe(true)
    expect(A.aiMessagesListPinnedResSchema.safeParse({ items: [pinnedItem] }).success).toBe(true)
    expect(A.aiMemoryListByScopeResSchema.safeParse({ items: [memoryListEntry] }).success).toBe(true)
    expect(A.aiMemoryCreateResSchema.safeParse({ item: memoryItem }).success).toBe(true)
    expect(A.aiMemoryUpdateResSchema.safeParse({ item: memoryItem }).success).toBe(true)
    expect(A.aiMemorySetPinnedResSchema.safeParse({ item: memoryItem }).success).toBe(true)
    expect(A.aiTasksListResSchema.safeParse({ tasks: [taskItem] }).success).toBe(true)
    expect(A.aiTasksCancelResSchema.safeParse({ task: taskItem }).success).toBe(true)
    expect(A.aiAuditListResSchema.safeParse({ rows: [audit] }).success).toBe(true)
    expect(A.aiCascadePreviewResSchema.safeParse({ counts }).success).toBe(true)
    // 错键名拒（strict 首层键名契约——单复数/近形键名打错即拒）
    expect(A.aiSessionsOpenResSchema.safeParse({ sessions: session }).success).toBe(false)
    expect(A.aiMemoryCreateResSchema.safeParse({ memory: memoryItem }).success).toBe(false)
    expect(A.aiCascadePreviewResSchema.safeParse({ count: counts }).success).toBe(false)
  })

  it('组11 投影项 anchorTitle（R5）：pinnedMessageItem/aiMemoryListItem 正形过+缺席拒（extend 投影锚）', () => {
    const message = { id: 1, sessionId: 1, role: 'assistant' as const, content: 'c', pinned: true, createdAt: ISO }
    expect(M.pinnedMessageItemSchema.safeParse({ ...message, anchorTitle: '论文' }).success).toBe(true)
    expect(M.pinnedMessageItemSchema.safeParse(message).success).toBe(false) // anchorTitle 必填投影——缺席拒
    expect(M.aiMemoryListItemSchema.safeParse({ ...memoryItem, anchorTitle: null }).success).toBe(true)
    expect(M.aiMemoryListItemSchema.safeParse(memoryItem).success).toBe(false)
  })
})
