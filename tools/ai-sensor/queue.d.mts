/**
 * queue.mjs 的 TS 消费面声明（AI-05——.mjs 本体零依赖纯 JS，类型契约在此；
 * 与应用侧 src/shared 无 import 关系，字段形状=manifest.json 产物契约的镜像
 * 消费，真相源=ADR-0011 v1.1 五件套契约）。
 * companion.mjs（SR2-AI-06 会话壳）的类型面=邻接 companion.d.mts（TS 邻接
 * 声明按模块名解析，本文件仅服务 queue.mjs 导入——票面「queue.d.mts 增
 * companion 类型面」的技术修正，自裁申报记录）。
 */

export const PROGRESS_SCHEMA_VERSION: number

/** manifest.papers[] 条目（导出产物契约镜像） */
export interface ManifestPaper {
  paperId: string
  file: string
  title: string
  contentSha: string
  fulltextSha: string
  figures: string[]
  exportedAt: string
}

export interface CorpusManifest {
  schemaVersion: number
  /** 导出时刻（ISO）——工具侧不消费，契约镜像完整性（门一 N1） */
  exportedAt: string
  papers: ManifestPaper[]
  errors?: Array<{ paperId: string; reason: string }>
}

export type ItemStatus = 'pending' | 'done'

export interface ProgressItem {
  paperId: string
  status: ItemStatus
  outputs: string[]
}

export interface ProgressState {
  schemaVersion: number
  items: ProgressItem[]
}

/** 队列条目=一篇的消费指针（corpus md+fulltext+figures） */
export interface QueueEntry {
  paperId: string
  file: string
  title: string
  fulltext: string
  figures: string[]
}

export interface QueuePlan {
  pending: QueueEntry[]
  doneCount: number
  totalCount: number
  staleIds: string[]
}

export function freshProgress(manifest: CorpusManifest): ProgressState
export function applyDone(
  progress: ProgressState,
  paperId: string,
  outputs: string[]
): ProgressState
export function diffQueue(manifest: CorpusManifest, progress: ProgressState): QueuePlan
export function planSession(
  dir: string
): Promise<
  | { active: false; reason: string }
  | { active: true; manifest: CorpusManifest; progress: ProgressState; plan: QueuePlan }
>
export function markDone(dir: string, paperId: string, outputs: string[]): Promise<ProgressState>
