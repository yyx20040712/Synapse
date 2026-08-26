/**
 * companion.mjs 的 TS 消费面声明（SR2-AI-06——.mjs 本体零依赖纯 JS，类型契约
 * 在此；与应用侧 src/shared 无 import 关系，枚举字段=迁移 003 DDL/AI-01 zod
 * 边界的镜像消费，真相源=ADR-0015 §1 行形状字面）。
 * 注：票面原文「queue.d.mts 增 companion 类型面」——TS 邻接声明解析只认
 * companion.d.mts（queue.d.mts 仅服务 queue.mjs 导入），故独立成文件（自裁
 * 申报记录，queue.d.mts 头部有指针）。
 */

export type SegmentRole = 'first-read' | 'second-read' | 'adjudicate'
export type SegmentQuestion = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'Q5' | 'Q6' | 'Q7' | 'divergence'

/** 行式锚定段（与 ai_notes 列同形 N2 粒度；anchor_page=null=篇级回答） */
export interface SegmentRow {
  role: SegmentRole
  question: SegmentQuestion
  model: string
  quote_text: string
  prefix_text: string
  suffix_text: string
  anchor_page: number | null
  content_md: string
}

export interface PendingJob {
  jobId: string
  paperId: string
  kind: string
  requestedAt: string
  /** job 文件绝对路径（移除用） */
  file: string
}

export interface ProtocolStatus {
  state: string
  currentPaper: string | null
  role: string | null
  updatedAt: string
  heartbeatAt: string
}

export type PickResult =
  | { kind: 'empty'; corrupt: Array<{ file: string; message: string }> }
  | {
      kind: 'blocked'
      reason: string
      jobs: PendingJob[]
      corrupt: Array<{ file: string; message: string }>
    }
  | {
      kind: 'unactionable'
      jobs: PendingJob[]
      corrupt: Array<{ file: string; message: string }>
    }
  | {
      kind: 'job'
      job: PendingJob
      paper: { paperId: string; title: string; file: string; fulltext: string; figures: string[] }
      unactionable: string[]
      corrupt: Array<{ file: string; message: string }>
    }

export function normalizeSegments(rows: unknown): SegmentRow[]
export function writeStatusProtocol(
  protocolDir: string,
  patch?: { state?: string; currentPaper?: string | null; role?: string | null }
): Promise<ProtocolStatus>
export function listPendingJobs(
  protocolDir: string
): Promise<{ jobs: PendingJob[]; corrupt: Array<{ file: string; message: string }> }>
export function pickNext(corpusDir: string, protocolDir: string): Promise<PickResult>
export function deliver(
  corpusDir: string,
  protocolDir: string,
  paperId: string,
  draftPaths: string[]
): Promise<{ productPath: string; removedJobs: string[]; queueMarked: boolean }>
