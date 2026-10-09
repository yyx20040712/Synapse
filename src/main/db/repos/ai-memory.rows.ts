/**
 * [F-DBCAMP-01 DB-2 U2a/U2b-1] ai-memory.rows —— ai_memory 行形状+列常量+行映射
 * （自 ai-memory.repo 拆出：repo 文件 300 行上限拆件，check-quality 关卡强制——
 * 本批 quality 门超限拆分〔收口 DoD r3〕；沿 lineage.repo.rows.ts 先例，本件=纯
 * 映射/形状零 SQL，语句族与谓词单源仍在 ai-memory.repo 主件）。
 * 行为语义注记见 ai-memory.repo 头注（U2a 隔离面+U2b-1 写原语/并集面——本件零承载）。
 */
import type { AiScope } from './ai-sessions.repo'

export interface AiMemoryRow {
  id: number
  scope: AiScope
  anchorId: string | null
  category: string
  label: string | null
  title: string
  content: string
  pinned: 0 | 1
  origin: 'manual' | 'agent'
  sourceTaskId: number | null
  createdAt: string
  updatedAt: string
}

export interface RawMemoryRow {
  id: number
  scope: AiScope
  anchor_id: string | null
  category: string
  label: string | null
  title: string
  content: string
  pinned: 0 | 1
  origin: 'manual' | 'agent'
  source_task_id: number | null
  created_at: string
  updated_at: string
}

export const MEMORY_COLS = `id, scope, anchor_id, category, label, title, content, pinned, origin, source_task_id, created_at, updated_at`

/** 蛇形→驼峰行映射（单源——检索/写原语/并集三路共用） */
export function toMemoryRow(r: RawMemoryRow): AiMemoryRow {
  return {
    id: r.id,
    scope: r.scope,
    anchorId: r.anchor_id,
    category: r.category,
    label: r.label,
    title: r.title,
    content: r.content,
    pinned: r.pinned,
    origin: r.origin,
    sourceTaskId: r.source_task_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }
}
