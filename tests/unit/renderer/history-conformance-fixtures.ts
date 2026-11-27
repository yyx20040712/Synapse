/**
 * HistoryStack conformance 共享真实载荷夹具；拆出以保持测试件通用行数上限。
 */
import { createHistoryStack } from '../../../src/renderer/shared/history/history-stack'
import type { Annotation } from '../../../src/shared/models/annotation'
import type { LineageEntityDelta } from '../../../src/shared/ipc/lineage-history.schemas'
import type { LineageNode } from '../../../src/shared/models/lineage'
import type { HistoryDomain, HistoryScope, HistoryUnit } from '../../../src/renderer/shared/history/history-types'

export type OpPayload =
  | { kind: 'create' | 'delete'; annotation: Annotation }
  | { kind: 'comment-edit'; before: Annotation; after: Annotation }
export type TextPayload = { target: string; before: string; after: string }
export type LineageNodeDelta = Extract<LineageEntityDelta, { kind: 'node' }>
export type LineagePayload = { changes: LineageNodeDelta[]; anchoredAt: string }

export const annotation = (id: string, comment: string): Annotation => ({
  id,
  paperId: 'paper',
  page: 0,
  kind: 'highlight',
  color: 'yellow',
  quoteText: 'quote',
  prefixText: '',
  suffixText: '',
  startOffset: 0,
  endOffset: 1,
  rects: [{ page: 0, x: 0, y: 0, w: 1, h: 1 }],
  comment,
  createdAt: 't0',
  updatedAt: 't0'
})

export const opScope = (generation: number): HistoryScope => ({
  workspaceId: 'workspace',
  domain: 'reader-op',
  scopeId: ['op', 'paper'],
  sessionGeneration: generation
})

const textScope = (generation: number): HistoryScope => ({
  workspaceId: 'workspace',
  domain: 'reader-text',
  scopeId: ['note', 'paper'],
  sessionGeneration: generation
})

const lineageScope = (generation: number): HistoryScope => ({
  workspaceId: 'workspace',
  domain: 'lineage',
  scopeId: ['folder', 'main'],
  sessionGeneration: generation
})

const lineageNode = (id: string, x: number): LineageNode => ({
  id,
  paperId: `paper-${id}`,
  title: `节点${id}`,
  year: 2026,
  month: 11,
  slot: 0,
  x,
  y: 1,
  folderId: 'main',
  createdAt: 't0',
  updatedAt: 't0'
})

export const opUnit = (id: string, comment: string): HistoryUnit<OpPayload> => ({
  unitId: id,
  scope: opScope(1),
  command: 'comment-edit',
  changes: { kind: 'comment-edit', before: annotation(id, ''), after: annotation(id, comment) }
})

export const textUnit = (id: string, before: string, after: string): HistoryUnit<TextPayload> => ({
  unitId: id,
  scope: textScope(1),
  command: 'text-commit',
  changes: { target: 'note', before, after }
})

export const lineageUnit = (id: string, anchoredAt: string): HistoryUnit<LineagePayload> => ({
  unitId: id,
  scope: lineageScope(1),
  command: 'move-node',
  changes: {
    anchoredAt,
    changes: [{ kind: 'node', id, before: lineageNode(id, 0), after: lineageNode(id, 1) }]
  }
})

export const payloadOf = (unit: HistoryUnit<unknown>): string => JSON.stringify(unit.changes)

export function stackFor<C>(
  domain: HistoryDomain,
  scopeId: HistoryScope['scopeId'],
  redoOrder: 'head' | 'tail'
): ReturnType<typeof createHistoryStack<C>> {
  const scope: HistoryScope = { workspaceId: 'workspace', domain, scopeId, sessionGeneration: 1 }
  return createHistoryStack<C>(scope, { redoOrder })
}
