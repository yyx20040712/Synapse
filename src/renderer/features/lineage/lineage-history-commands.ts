/**
 * [B4 L1 / 设计稿 §5.1/§5.2/§11.2] lineage-history-commands —— 13 命令的
 * changes 构造与历史栈纯函数（零 store、零 IO）。
 *
 * ── 行为层 ──
 * - WatchSpec：编辑单元内「受影响实体」的登记项（kind+id；line-type-names 无
 *   id）。登记须在乐观应用前（捕获 before）；提交时读现值构造 after。
 * - removeNodeWatches（§5.2 #9 顺序）：先同帧存留卡被清 via 的边（数组序）、
 *   再相关边 E→null（数组序）、最后 N→null。undo 反序写即=节点先恢复→相关边
 *   按原数组序→存留边原 via。
 * - entityDelta/buildChanges：语义 no-op（指纹相等——排除 updatedAt/isStarred）与
 *   退化项（before/after 双缺席）剔除，保持登记序；changes=redo 顺向、undo 逆向
 *   的同一份数据（§5.1——不手写两份）。
 * - pushHistory：深度上限 LINEAGE_HISTORY_DEPTH_MAX（超深丢最旧）。
 * - reanchorHistory：写回显再锚。renderer 对会话内新建的边/笔记持乐观 createdAt
 *   （本地时钟），落库后以服务器值为准——同 id 的全部历史实体 createdAt 同步；
 *   after 与服务器行语义相等的项取服务器 updatedAt（指纹不因时戳刷新而漂移）。
 *   色行名：服务端归一（trim/空名→「待命名」）后的回显按同规则再锚 after。
 *
 * ── 接口层 ──
 * - export function frameViaClearEdges/relatedEdges/removeNodeWatches
 * - export function entityDelta/namesDelta/buildChanges/pushHistory/reanchorHistory
 *
 * ── 架构层 ──
 * - 纯函数件：只依赖 shared（指纹单源=ipc/lineage-history.schemas）与本域模型件。
 */
import {
  lineageEntityFingerprint,
  type LineageEntityDelta,
  type LineageEditCommandKind
} from '@shared/ipc/lineage-history.schemas'
import { LINE_TYPE_DEFAULT_NAME, type FloatingNote, type LineageEdge, type LineageNode } from '@shared/models/lineage'
import { LINEAGE_HISTORY_DEPTH_MAX, makeHistoryEntry, type LineageHistoryEntry } from './lineage-session-model'

export type EntityKind = 'node' | 'edge' | 'floating-note'
export type HistoryEntity = LineageNode | LineageEdge | FloatingNote

export interface EntitySpec {
  kind: EntityKind
  id: string
}
export type WatchSpec = EntitySpec | { kind: 'line-type-names' }

/** 登记项=受影响实体+乐观应用前捕获的 before */
export interface WatchedEntity {
  spec: WatchSpec
  before: HistoryEntity | string[] | null
}

export interface HistoryStacks {
  undoStack: LineageHistoryEntry[]
  redoStack: LineageHistoryEntry[]
}

/** [B3 §6.4] 变化帧 manual 边：端点卡落在该帧（年月组）且携 via 的边（数组序）。
 * [F-LANEGRID-01 B3 §6.2/§6.4] 变化帧 manual 边 via 批清除入队（月域语义：
 * 清除域=端点卡落在变化帧的边——月内边+直连边；穿框边/集外月保留 via。
 * undo/redo 历史恢复不经此面——历史项按 changes 逆写（原 store 快照整体回退） */
export function frameViaClearEdges(edges: readonly LineageEdge[], frameIds: ReadonlySet<string>): LineageEdge[] {
  return edges.filter(
    (e) => e.via !== undefined && e.via.length > 0 && (frameIds.has(e.fromNode) || frameIds.has(e.toNode))
  )
}

/** 节点的全部相关边（任一端点命中——DDL CASCADE 的镜像集，数组序） */
export function relatedEdges(edges: readonly LineageEdge[], nodeId: string): LineageEdge[] {
  return edges.filter((e) => e.fromNode === nodeId || e.toNode === nodeId)
}

/**
 * §5.2 #9 removeNode 登记序：存留边（via 清）→相关边（E→null）→节点。
 * 存留边=端点落在变化帧且携 via、**且不触达被删节点**的边——触达者随节点级联
 * 删除，只按相关边登记一次（同一实体在一次 unit 内至多一项——重复登记会使
 * history-unit 请求被 schema 拒绝）。
 */
export function removeNodeWatches(
  nodes: readonly LineageNode[],
  edges: readonly LineageEdge[],
  id: string
): WatchSpec[] {
  const n = nodes.find((x) => x.id === id)
  const frameIds = new Set(
    n === undefined ? [] : nodes.filter((x) => x.year === n.year && x.month === n.month && x.id !== id).map((x) => x.id)
  )
  const related = relatedEdges(edges, id)
  const relatedIds = new Set(related.map((e) => e.id))
  const surviving = frameIds.size === 0 ? [] : frameViaClearEdges(edges, frameIds).filter((e) => !relatedIds.has(e.id))
  return [
    ...surviving.map((e) => ({ kind: 'edge' as const, id: e.id })),
    ...related.map((e) => ({ kind: 'edge' as const, id: e.id })),
    { kind: 'node' as const, id }
  ]
}

const absent = (v: unknown): boolean => v === null || v === undefined

/** 单实体 delta：退化/语义 no-op → null */
export function entityDelta(spec: EntitySpec, before: HistoryEntity | null | undefined, after: HistoryEntity | null | undefined): LineageEntityDelta | null {
  if (absent(before) && absent(after)) return null
  if (lineageEntityFingerprint(spec.kind, before ?? null) === lineageEntityFingerprint(spec.kind, after ?? null)) return null
  const b = before ?? null
  const a = after ?? null
  if (spec.kind === 'node') return { kind: 'node', id: spec.id, before: b as LineageNode | null, after: a as LineageNode | null }
  if (spec.kind === 'edge') return { kind: 'edge', id: spec.id, before: b as LineageEdge | null, after: a as LineageEdge | null }
  return { kind: 'floating-note', id: spec.id, before: b as FloatingNote | null, after: a as FloatingNote | null }
}

/** 色行名 delta：前后全等=no-op */
export function namesDelta(before: string[], after: string[]): LineageEntityDelta | null {
  return JSON.stringify(before) === JSON.stringify(after) ? null : { kind: 'line-type-names', before, after }
}

/** 由登记项与现值构造 changes（保持登记序；read 返回 undefined=该实体已不在图中） */
export function buildChanges(
  watched: readonly WatchedEntity[],
  read: (spec: WatchSpec) => HistoryEntity | string[] | undefined
): LineageEntityDelta[] {
  const out: LineageEntityDelta[] = []
  for (const w of watched) {
    if (w.spec.kind === 'line-type-names') {
      const after = read(w.spec)
      const d = namesDelta((w.before as string[]) ?? [], Array.isArray(after) ? after : [])
      if (d !== null) out.push(d)
      continue
    }
    const d = entityDelta(w.spec, w.before as HistoryEntity | null, read(w.spec) as HistoryEntity | undefined)
    if (d !== null) out.push(d)
  }
  return out
}

/** 历史入栈（深度上限——超深丢最旧） */
export function pushHistory(
  stack: readonly LineageHistoryEntry[],
  entry: LineageHistoryEntry,
  max: number = LINEAGE_HISTORY_DEPTH_MAX
): LineageHistoryEntry[] {
  const next = [...stack, entry]
  return next.length > max ? next.slice(next.length - max) : next
}

/** 历史项构造（changes 由同一 recorder 派生——§5.1） */
export function historyEntryOf(folderId: string, command: LineageEditCommandKind, changes: LineageEntityDelta[]): LineageHistoryEntry {
  return makeHistoryEntry(folderId, command, changes)
}

/** 写回显：实体行或色行名的服务器版本 */
export type EntityEcho =
  | { kind: EntityKind; id: string; server: HistoryEntity }
  | { kind: 'line-type-names'; names: string[] }

/** 服务端色行名归一（lineage.service 写边界同规则：trim+空名→「待命名」） */
export function normalizeLineTypeNames(names: readonly string[]): string[] {
  return names.map((n) => {
    const t = n.trim()
    return t === '' ? LINE_TYPE_DEFAULT_NAME : t
  })
}

const sameNames = (a: readonly string[], b: readonly string[]): boolean => JSON.stringify(a) === JSON.stringify(b)

/** 回显再锚（见头注；返回新栈对象——入参不变） */
export function reanchorHistory(stacks: HistoryStacks, echo: EntityEcho): HistoryStacks {
  const touchEntry = (entry: LineageHistoryEntry): LineageHistoryEntry => {
    let changed = false
    const changes = entry.changes.map((d): LineageEntityDelta => {
      if (echo.kind === 'line-type-names') {
        if (d.kind !== 'line-type-names' || !sameNames(normalizeLineTypeNames(d.after), echo.names)) return d
        changed = true
        return { ...d, after: [...echo.names] }
      }
      if (d.kind !== echo.kind || d.id !== echo.id) return d
      const server = echo.server as HistoryEntity & { createdAt: string; updatedAt: string }
      let before = d.before
      let after = d.after
      if (before !== null && before.createdAt !== server.createdAt) {
        before = { ...before, createdAt: server.createdAt }
        changed = true
      }
      if (after !== null) {
        let next = after
        if (next.createdAt !== server.createdAt) {
          next = { ...next, createdAt: server.createdAt }
          changed = true
        }
        if (lineageEntityFingerprint(echo.kind, next) === lineageEntityFingerprint(echo.kind, server) && next.updatedAt !== server.updatedAt) {
          next = { ...next, updatedAt: server.updatedAt }
          changed = true
        }
        after = next
      }
      if (!changed) return d
      return { ...d, before, after } as LineageEntityDelta
    })
    return changed ? { ...entry, changes } : entry
  }
  return {
    undoStack: stacks.undoStack.map(touchEntry),
    redoStack: stacks.redoStack.map(touchEntry)
  }
}
