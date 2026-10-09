/**
 * [F-DBCAMP-01 DB-2 U2b-1] ai-tasks.actions —— 9 动作常量+19 类分档常量+payload
 * 白名单 schema（§3.b 闸①②/§3.e/§3.f——与 handler 相邻定义，dispatch 表在
 * ai-tasks.service）。
 *
 * ── 行为层 ──
 * - AI_TASK_ACTIONS：9 值白名单（DDL CHECK 同集——三方对齐断言面之一）。
 * - AI_MEMORY_CATEGORIES：19 类分档（6 paper+7 lineage+6 global——020 DDL CHECK
 *   同集复述单源；闸②校验=19 值全集，目标档匹配=handler 执行期判）。
 * - validatePayload：白名单=对象且未知字段拒（INVALID_REQUEST「载荷字段非法」）；
 *   类型逐字段校验；category∈19 值值域；title 1-120（码点）；content trim 非空；
 *   数字字段 Number.isInteger；非法一律 INVALID_REQUEST（闸②，先于存在性——裁③）。
 * - 摘要工具件（r1 W-d1-1 口径）：memoryDigest=**每侧整体 ≤200 码点**（简报冻结
 *   「before/after 摘要各截断 200 字符」——title+content 合并后按码点截 200）；
 *   truncateDetail=200 码点通用截断（result_overflow/failed detail 面）。
 *
 * ── 文化层 ──
 * - 纯校验件（零 SQL 零 repo 依赖）；AiDomainError 复用 ai-sessions.service 载体。
 * - 测试：tests/unit/services/ai-tasks-submit.service.test.ts（三闸矩阵）。
 */
import { AiDomainError } from './ai-sessions.service'
import type { AiTaskAction } from '../../db/repos/ai-tasks.repo'

/** 9 动作白名单（DDL ai_tasks.action CHECK 同集——三方对齐断言面） */
export const AI_TASK_ACTIONS: readonly AiTaskAction[] = [
  'memory.create',
  'memory.update',
  'memory.delete',
  'memory.pin',
  'memory.unpin',
  'memory.search',
  'memory.list',
  'message.pin',
  'message.unpin'
]

/** 19 类分档（020 ai_memory.category CHECK 同集复述——服务层单源） */
export const AI_MEMORY_CATEGORIES: Record<'paper' | 'lineage' | 'global', readonly string[]> = {
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

const ALL_CATEGORIES: readonly string[] = [
  ...AI_MEMORY_CATEGORIES.paper,
  ...AI_MEMORY_CATEGORIES.lineage,
  ...AI_MEMORY_CATEGORIES.global
]

/** memory.list limit 档（§3.e：默认 20 上限 50） */
export const MEMORY_LIST_DEFAULT_LIMIT = 20
export const MEMORY_LIST_MAX_LIMIT = 50

/** 摘要截断（码点——审计 mutated/result_overflow detail 截断 200 字符） */
const DETAIL_TRUNCATE = 200

/** 审计/错误摘要截断（码点计数——服务层与 handler 共用工具件） */
export function truncateDetail(text: string): string {
  const codePoints = [...text]
  return codePoints.length <= DETAIL_TRUNCATE ? text : codePoints.slice(0, DETAIL_TRUNCATE).join('')
}

export function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/**
 * 记忆行摘要（审计 mutated before/after 面）——**每侧整体 ≤200 码点**（r1 W-d1-1：
 * 简报冻结「before/after 摘要各截断 200 字符」=每侧截 200；r0 版仅截 content、title
 * 原样致单侧可超 200——回炉修正）。形态=`#<id> <title> · <content>` 拼合后按码点
 * 截 200（id 前缀占预算——置于截断内的简实现）。
 */
export function memoryDigest(row: { id: number; title: string; content: string }): string {
  const merged = `#${row.id} ${row.title} · ${row.content}`
  return [...merged].slice(0, DETAIL_TRUNCATE).join('')
}

function invalid(msg: string): never {
  throw new AiDomainError('INVALID_REQUEST', msg)
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function assertWhitelist(o: Record<string, unknown>, allowed: readonly string[]): void {
  for (const key of Object.keys(o)) {
    if (!allowed.includes(key)) {
      invalid(`载荷字段非法（未知字段 ${key}）`)
    }
  }
}

function requireString(o: Record<string, unknown>, key: string): string {
  if (typeof o[key] !== 'string') invalid(`载荷字段非法（${key} 须为字符串）`)
  return o[key] as string
}

function optionalString(o: Record<string, unknown>, key: string): string | undefined {
  if (o[key] === undefined) return undefined
  if (typeof o[key] !== 'string') invalid(`载荷字段非法（${key} 须为字符串）`)
  return o[key] as string
}

function requireInt(o: Record<string, unknown>, key: string): number {
  const v = o[key]
  if (typeof v !== 'number' || !Number.isInteger(v)) invalid(`载荷字段非法（${key} 须为整数）`)
  return v
}

function assertTitle(title: string): void {
  const codePoints = [...title].length
  if (codePoints < 1 || codePoints > 120) invalid('载荷字段非法（title 长度须 1-120）')
}

function assertContent(content: string): void {
  if (content.trim() === '') invalid('载荷字段非法（content 不能为空白）')
}

function assertCategory(category: string): void {
  if (!ALL_CATEGORIES.includes(category)) invalid(`分类非法（${category} 不在 19 类清单）`)
}

/** 闸② payload 白名单 schema（返回通过校验的载荷——定型为已知字段对象） */
export function validatePayload(
  action: AiTaskAction,
  payload: unknown
): Record<string, unknown> {
  if (!isPlainObject(payload)) invalid('载荷必须为对象')
  const o = payload
  switch (action) {
    case 'memory.create': {
      assertWhitelist(o, ['category', 'title', 'content', 'label'])
      const category = requireString(o, 'category')
      assertCategory(category)
      const title = requireString(o, 'title')
      assertTitle(title)
      const content = requireString(o, 'content')
      assertContent(content)
      optionalString(o, 'label')
      return { ...o }
    }
    case 'memory.update': {
      assertWhitelist(o, ['memoryId', 'title', 'content', 'label'])
      requireInt(o, 'memoryId')
      const hasField =
        o.title !== undefined || o.content !== undefined || o.label !== undefined
      if (!hasField) invalid('载荷字段非法（至少一个更新字段）')
      if (o.title !== undefined) assertTitle(requireString(o, 'title'))
      if (o.content !== undefined) assertContent(requireString(o, 'content'))
      if (o.label !== undefined && typeof o.label !== 'string') {
        invalid('载荷字段非法（label 须为字符串）')
      }
      return { ...o }
    }
    case 'memory.delete':
    case 'memory.pin':
    case 'memory.unpin': {
      assertWhitelist(o, ['memoryId'])
      requireInt(o, 'memoryId')
      return { ...o }
    }
    case 'memory.search': {
      assertWhitelist(o, ['query'])
      if (typeof o.query !== 'string') invalid('载荷字段非法（query 须为字符串）')
      return { ...o }
    }
    case 'memory.list': {
      assertWhitelist(o, ['category', 'limit'])
      if (o.category !== undefined) assertCategory(requireString(o, 'category'))
      if (o.limit !== undefined) {
        const limit = o.limit
        if (
          typeof limit !== 'number' ||
          !Number.isInteger(limit) ||
          limit < 1 ||
          limit > MEMORY_LIST_MAX_LIMIT
        ) {
          invalid(`载荷字段非法（limit 须 1-${MEMORY_LIST_MAX_LIMIT} 整数）`)
        }
      }
      return { ...o }
    }
    case 'message.pin':
    case 'message.unpin': {
      assertWhitelist(o, ['messageId'])
      requireInt(o, 'messageId')
      return { ...o }
    }
  }
}
