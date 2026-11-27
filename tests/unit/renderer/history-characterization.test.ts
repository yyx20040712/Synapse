// @vitest-environment jsdom
/**
 * [F-UNDOHIST-02 Batch A Task 1] 三域撤销历史行为基线。
 * 锁定操作层预写后选顶、文本预写值重基、future FIFO、失败后新输入、
 * 显式保存只清 redo、恢复替换只清目标 folder，以及目标替换不清其他历史。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

const mocks = vi.hoisted(() => ({
  updateAnnotation: vi.fn(),
  lineageGraph: vi.fn(),
  patchNode: vi.fn(),
  historyUnit: vi.fn()
}))
makeApiStub({
  reader: {
    open: vi.fn(async (req: { paperId: string }) => ({
      ok: true as const,
      data: { fileUrl: `app-file://${req.paperId}`, fileName: `${req.paperId}.pdf`, lastReadPage: 0 }
    })),
    listAnnotations: vi.fn(async () => ({ ok: true as const, data: [] as Annotation[] })),
    updateAnnotation: mocks.updateAnnotation
  },
  lineage: { graph: mocks.lineageGraph, patchNode: mocks.patchNode, historyUnit: mocks.historyUnit }
})

import { registerDraftFlush, unregisterDraftFlush } from '../../../src/renderer/features/reader/interact/annotation-draft-registry'
import { seedPaper as seedPaperRow, setUpdatedAt } from '../../utils/lineage-history-db'
import {
  exportVol as exportSnapshotVolume,
  importVol as importSnapshotVolume,
  makeSnapshotSide,
  pair as pairSnapshotSides,
  type SnapshotSide
} from '../../utils/snapshot-lineage-sides'
import {
  clearStack,
  peekRedo,
  peekUndo,
  pushUndo,
  redoDepth,
  settleUndo,
  stackDepth
} from '../../../src/renderer/features/reader/state/annotation-undo'
import { undoTabOperations } from '../../../src/renderer/features/reader/state/reader-history-commands'
import { finalizeTab } from '../../../src/renderer/features/reader/state/reader-save-coordinator'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import {
  clearAllTextHistory,
  peekTextUndo,
  peekTextRedo,
  pushTextCommit,
  settleTextRedo,
  settleTextUndo,
  type TextTargetKey
} from '../../../src/renderer/features/reader/state/reader-text-history'
import { resetTabLanes } from '../../../src/renderer/shared/tab-write-lane'
import { makeAnnotation } from '../../utils/factories'
import type { Annotation } from '../../../src/shared/models/annotation'
import type { LineageNode } from '../../../src/shared/models/lineage'
import { defaultLineTypeNames } from '../../../src/shared/models/lineage'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { lineageRegistry } from '../../../src/renderer/features/lineage/lineage-session-registry'
import { lineageFolderReconcile } from '../../../src/renderer/features/lineage/lineage-folder-reconcile'
import { createLineageService } from '../../../src/main/services/lineage/lineage.service'
import { resetLineageSessionsForTests } from './lineage-test-session-reset'

const P = 'p-characterization'
const TARGET: TextTargetKey = { paperId: P, kind: 'paper-note' }

function annotation(id: string, comment: string): Annotation {
  return { ...makeAnnotation(comment), id, paperId: P }
}

function requiredHistoryUnit<T>(unit: T | null): T {
  if (unit === null) throw new Error('保存测试前提失败：undo 单元不得为空')
  return unit
}

async function turns(count = 20): Promise<void> {
  for (let i = 0; i < count; i++) await Promise.resolve()
}

function lineageNode(id: string, folderId: string, patch: Partial<LineageNode> = {}): LineageNode {
  return {
    id,
    paperId: `paper-${id}`,
    title: `节点${id}`,
    year: 2026,
    month: 11,
    slot: 0,
    x: 1,
    y: 1,
    folderId,
    createdAt: 't0',
    updatedAt: 't0',
    ...patch
  }
}

const MAIN = '__main__'
const OTHER = 'folder-other'

beforeEach(() => {
  vi.clearAllMocks()
  resetTabLanes()
  clearAllTextHistory()
  clearStack(P)
  resetLineageSessionsForTests()
  mocks.updateAnnotation.mockResolvedValue({ ok: true, data: annotation('a', 'before') })
  useLineageStore.setState({
    nodes: [lineageNode('main-node', MAIN)],
    edges: [],
    floatingNotes: [],
    lineTypeNames: defaultLineTypeNames(),
    status: 'ready',
    error: null,
    saveStatus: 'clean',
    lastWriteError: null,
    queue: [],
    flushing: false,
    inflight: null,
    needsReload: false,
    invalidationEpoch: 0,
    undoStack: [],
    redoStack: [],
    unfinalized: false,
    editRevision: 0,
    folderId: MAIN
  })
  useLineageViewStore.setState({ mode: 'browse', focusSet: [], tool: 'select', paletteFor: null })
})

afterEach(() => {
  unregisterDraftFlush('characterization-note')
  resetLineageSessionsForTests()
  clearAllTextHistory()
  clearStack(P)
  resetTabLanes()
})

describe('reader 操作层与文本层现状基线', () => {
  it('操作层先执行预写，预写形成的历史项才成为选中顶', async () => {
    const order: string[] = []
    let selectedAtWrite: unknown = null
    registerDraftFlush('characterization-note', async () => 'saved', {
      paperId: P,
      prepare() {
        return {
          async run() {
            order.push('preflush')
            const pushed = pushUndo(P, { kind: 'comment-edit', before: annotation('a', ''), after: annotation('a', 'draft') })
            selectedAtWrite = { id: pushed.id }
            return true
          },
          release() {
            order.push('release')
          }
        }
      }
    })
    mocks.updateAnnotation.mockImplementation(async () => {
      order.push('write')
      expect(peekUndo(P)?.id).toBe((selectedAtWrite as { id: string }).id)
      return { ok: true as const, data: annotation('a', '') }
    })

    const command = undoTabOperations(P)
    await turns()
    expect(order.slice(0, 2)).toEqual(['preflush', 'write'])
    mocks.updateAnnotation.mockResolvedValue({ ok: true, data: annotation('a', '') })
    await expect(command).resolves.toEqual({ done: true, apply: { type: 'upsert', annotation: annotation('a', '') } })
    expect(order[order.length - 1]).toBe('release')
    expect(stackDepth(P)).toBe(0)
    expect(redoDepth(P)).toBe(1)
  })

  it('操作层回执按原身份结算，等待窗内的新输入不抢占该次撤销', async () => {
    pushUndo(P, { kind: 'comment-edit', before: annotation('a', ''), after: annotation('a', 'one') })
    pushUndo(P, { kind: 'comment-edit', before: annotation('a', 'one'), after: annotation('a', 'two') })
    const original = peekUndo(P)!
    let releaseUndo!: () => void
    mocks.updateAnnotation.mockImplementationOnce(() => new Promise((resolve) => { releaseUndo = () => resolve({ ok: true, data: annotation('a', 'two') }) }))
    const command = undoTabOperations(P)
    await turns()
    pushUndo(P, { kind: 'comment-edit', before: annotation('a', 'two'), after: annotation('a', 'three') })
    releaseUndo()
    await command

    expect(peekUndo(P)?.id).not.toBe(original.id)
    expect(redoDepth(P)).toBe(1)
    expect(peekRedo(P)?.id).toBe(original.id)
    expect(stackDepth(P)).toBe(2)
  })

  it('文本命令按捕获值结算，随后闭合的新单元以落库值为基线', () => {
    pushTextCommit(TARGET, '')
    pushTextCommit(TARGET, 'draft')
    const selected = peekTextUndo(TARGET)!
    const captured = 'draft'
    pushTextCommit(TARGET, 'in-flight')
    settleTextUndo(TARGET, selected, captured, ['in-flight'])

    expect(peekTextUndo(TARGET)?.before).toBe(captured)
    const pastValues = peekTextUndo(TARGET) ? [peekTextUndo(TARGET)!.before] : []
    expect(pastValues).toEqual(['draft'])
  })

  it('future 保持 FIFO，两步 undo 后连续 redo 回到原顺序', () => {
    pushTextCommit(TARGET, '')
    pushTextCommit(TARGET, 'one')
    const first = peekTextUndo(TARGET)!
    settleTextUndo(TARGET, first, 'one', [])
    const second = peekTextUndo(TARGET)!
    settleTextUndo(TARGET, second, '', [])

    expect(peekTextRedo(TARGET)?.after).toBe('')
    const firstRedo = peekTextRedo(TARGET)!
    settleTextRedo(TARGET, firstRedo, '', [])
    expect(peekTextRedo(TARGET)?.after).toBe('one')
    const secondRedo = peekTextRedo(TARGET)!
    settleTextRedo(TARGET, secondRedo, 'one', [])
    expect(peekTextUndo(TARGET)?.before).toBe('one')
  })

  it('历史写失败不结算；失败后新输入清 redo 并成为可撤销顶', async () => {
    pushUndo(P, { kind: 'comment-edit', before: annotation('a', ''), after: annotation('a', 'saved') })
    pushUndo(P, { kind: 'comment-edit', before: annotation('a', 'saved'), after: annotation('a', 'two') })
    await undoTabOperations(P)
    expect(redoDepth(P)).toBe(1)
    mocks.updateAnnotation.mockResolvedValueOnce({ ok: false, error: { code: 'DB_ERROR', message: '写失败' } })
    await expect(undoTabOperations(P)).resolves.toEqual({ done: false, reason: 'api-failed' })
    expect(stackDepth(P)).toBe(1)
    expect(redoDepth(P)).toBe(1)

    pushUndo(P, { kind: 'comment-edit', before: annotation('a', 'two'), after: annotation('a', 'three') })
    expect(stackDepth(P)).toBe(2)
    expect(redoDepth(P)).toBe(0)
    const newTop = peekUndo(P)
    expect(newTop?.kind).toBe('comment-edit')
    if (newTop?.kind === 'comment-edit') expect(newTop.after.comment).toBe('three')
  })

  it('显式保存只清操作层与文本 redo，undo 保留', async () => {
    pushUndo(P, { kind: 'comment-edit', before: annotation('a', ''), after: annotation('a', 'one') })
    pushUndo(P, { kind: 'comment-edit', before: annotation('a', 'one'), after: annotation('a', 'two') })
    const undoEntry = requiredHistoryUnit(peekUndo(P))
    settleUndo(P, undoEntry)
    const retainedUndo = requiredHistoryUnit(peekUndo(P))
    const retainedUndoDepth = stackDepth(P)
    expect(redoDepth(P)).toBe(1)
    pushTextCommit(TARGET, '')
    pushTextCommit(TARGET, 'saved')
    settleTextUndo(TARGET, requiredHistoryUnit(peekTextUndo(TARGET)), 'saved', [])
    const retainedTextUndo = requiredHistoryUnit(peekTextUndo(TARGET))
    expect(peekTextRedo(TARGET)).not.toBeNull()

    await useReaderStore.getState().openPaper(P)
    registerDraftFlush('characterization-note', async () => 'saved', {
      paperId: P,
      prepare() {
        return {
          async run() { return true },
          release() { return undefined }
        }
      }
    })
    expect(await finalizeTab(P)).toBe(true)
    useReaderStore.setState({ tabs: {}, order: [], activeId: null })
    expect(requiredHistoryUnit(peekUndo(P))).toBe(retainedUndo)
    expect(stackDepth(P)).toBe(retainedUndoDepth)
    expect(redoDepth(P)).toBe(0)
    expect(requiredHistoryUnit(peekTextUndo(TARGET))).toBe(retainedTextUndo)
    expect(peekTextRedo(TARGET)).toBeNull()
  })

  it('恢复替换只清目标 folder，另一 folder 的历史仍可撤销', async () => {
    mocks.patchNode.mockImplementation(async (req: Partial<LineageNode>) => ({ ok: true as const, data: { ...lineageNode(String(req.id), MAIN), ...req, updatedAt: 'server' } }))
    mocks.lineageGraph.mockResolvedValue({ ok: true, data: { nodes: [lineageNode('other-node', OTHER)], edges: [], lineTypeNames: defaultLineTypeNames(), floatingNotes: [] } })
    mocks.historyUnit.mockImplementation(async (req) => ({
      ok: true as const,
      data: {
        folderId: req.folderId,
        unitId: req.unitId,
        nodes: [lineageNode('other-node', OTHER, { x: req.direction === 'undo' ? 1 : 5 })],
        edges: [],
        floatingNotes: [],
        lineTypeNames: defaultLineTypeNames()
      }
    }))
    lineageRegistry.ensure(OTHER)
    lineageRegistry.update(OTHER, { nodes: [lineageNode('other-node', OTHER)], status: 'ready' })

    useLineageStore.getState().moveNode('main-node', 10, 10)
    await useLineageStore.getState().save()
    await useLineageStore.getState().setFolder(OTHER)
    await turns(30)
    lineageRegistry.lane(OTHER).commands.moveNode('other-node', 5, 5)
    await lineageRegistry.lane(OTHER).save()
    const otherBefore = lineageRegistry.entry(OTHER)!.data
    expect(otherBefore.undoStack).toHaveLength(1)

    const targetGeneration = lineageRegistry.entry(MAIN)!.data.sessionGeneration
    useLineageStore.getState().applyRecoverySession({
      folderId: MAIN,
      graph: { nodes: [lineageNode('restored', MAIN)], edges: [], lineTypeNames: defaultLineTypeNames(), floatingNotes: [] },
      queue: [],
      draft: null
    })
    const target = lineageRegistry.entry(MAIN)!.data
    expect(target.sessionGeneration).toBeGreaterThan(targetGeneration)
    expect(target.undoStack).toEqual([])
    expect(target.redoStack).toEqual([])
    expect(lineageRegistry.entry(OTHER)!.data.undoStack).toHaveLength(1)
    expect(lineageRegistry.entry(OTHER)!.data.redoStack).toHaveLength(0)

    useLineageStore.getState().setFolder(OTHER)
    await turns(30)
    await expect(useLineageStore.getState().undo()).resolves.toBe(true)
    expect(useLineageStore.getState().nodes.find((n) => n.id === 'other-node')?.x).toBe(1)
  })
})

describe('实际导入快照后的三域历史保留', () => {
  it('签名双库导入 applied 且非 noop：renderer 未触及项可撤，触及项 CONFLICT 且栈不动', async () => {
    const sourceOwner = '7a8f9e04-5c6d-4e1f-9a2b-7c8d9e0f1a2b'
    const targetOwner = '8b9a0f15-6e7f-4a2b-8c3d-0f1a2b3c4d5e'
    const source = makeSnapshotSide(sourceOwner)
    const target = makeSnapshotSide(targetOwner)
    pairSnapshotSides(target, source)

    const seedNode = (side: SnapshotSide, id: string, title: string, x: number, updatedAt: string): LineageNode => {
      seedPaperRow(side.db, `paper-${id}`)
      const node = side.repos.lineage.upsertNode({
        id,
        paperId: `paper-${id}`,
        title,
        year: 2026,
        month: 11,
        slot: 0,
        x,
        y: 1
      })
      setUpdatedAt(side.db, 'lineage_nodes', id, updatedAt)
      return { ...node, updatedAt }
    }

    const untouchedInitial = seedNode(target, 'node-untouched', '未触及节点', 1, '2026-11-01T00:00:00.000Z')
    const touchedInitial = seedNode(target, 'node-touched', '旧标题', 99, '2026-11-01T00:00:00.000Z')
    const lineageService = createLineageService({ repo: target.repos.lineage })
    mocks.patchNode.mockImplementation(async (req: { id: string } & Partial<LineageNode>) => ({
      ok: true as const,
      data: lineageService.patchNode(req.id, req)
    }))
    mocks.lineageGraph.mockImplementation(async (req: { folderId?: string }) => ({
      ok: true as const,
      data: lineageService.graph(req?.folderId ?? MAIN)
    }))
    mocks.historyUnit.mockImplementation(async (req) => {
      try {
        return { ok: true as const, data: await target.history.unit(req) }
      } catch (error) {
        const failure = error as { code?: string; reason?: string; message?: string }
        return {
          ok: false as const,
          error: {
            code: failure.code ?? 'DB_ERROR',
            reason: failure.reason,
            message: failure.message ?? String(failure)
          }
        }
      }
    })
    const importedNodes = target.repos.lineage.listGraph().nodes
    lineageRegistry.ensure(MAIN)
    lineageRegistry.update(MAIN, { nodes: importedNodes, status: 'ready' })
    useLineageStore.setState({
      nodes: importedNodes,
      edges: [],
      floatingNotes: [],
      lineTypeNames: defaultLineTypeNames(),
      status: 'ready',
      error: null,
      saveStatus: 'clean',
      lastWriteError: null,
      lastWriteErrorSource: null,
      queue: [],
      flushing: false,
      inflight: null,
      needsReload: false,
      invalidationEpoch: 0,
      undoStack: [],
      redoStack: [],
      staleHistory: null,
      unfinalized: false,
      editRevision: 0,
      folderId: MAIN,
      sessionGeneration: 0
    })

    useLineageStore.getState().moveNode(touchedInitial.id, 20, 20)
    await useLineageStore.getState().save()
    useLineageStore.getState().moveNode(untouchedInitial.id, 10, 10)
    await useLineageStore.getState().save()
    expect(lineageRegistry.entry(MAIN)!.data.undoStack).toHaveLength(2)

    const targetRow = (id: string): { title: string; x: number; updated_at: string } =>
      target.db.prepare('SELECT title, x, updated_at FROM lineage_nodes WHERE id = ?').get(id) as never
    const untouchedNow = targetRow(untouchedInitial.id)
    seedNode(source, untouchedInitial.id, untouchedNow.title, untouchedNow.x, untouchedNow.updated_at)
    const touchedNow = targetRow(touchedInitial.id)
    seedNode(source, touchedInitial.id, touchedNow.title, touchedNow.x, touchedNow.updated_at)
    const sourceChangedAt = new Date(Date.parse(touchedNow.updated_at) + 1_000).toISOString()
    source.db.prepare('UPDATE lineage_nodes SET title = ?, updated_at = ? WHERE id = ?')
      .run('新标题', sourceChangedAt, touchedInitial.id)

    const result = importSnapshotVolume(target, exportSnapshotVolume(source))
    expect(result.outcome).toBe('applied')
    expect(result.noop).not.toBe(true)
    expect(result.stats?.updated).toBeGreaterThan(0)

    // 生产导入完成面会广播结构事件；失效链不得清会话历史。
    lineageFolderReconcile.onStructureChanged()
    await turns(30)
    expect(lineageRegistry.entry(MAIN)!.data.undoStack).toHaveLength(2)

    await expect(useLineageStore.getState().undo()).resolves.toBe(true)
    expect(lineageRegistry.entry(MAIN)!.data.undoStack).toHaveLength(1)
    expect(lineageRegistry.entry(MAIN)!.data.redoStack).toHaveLength(1)

    await expect(useLineageStore.getState().undo()).resolves.toBe(false)
    expect(lineageRegistry.entry(MAIN)!.data.undoStack).toHaveLength(1)
    expect(lineageRegistry.entry(MAIN)!.data.redoStack).toHaveLength(1)
    expect(lineageRegistry.entry(MAIN)!.data.staleHistory?.reason).toBe('HISTORY_STALE')
    const touchedRow = target.db.prepare('SELECT title, updated_at FROM lineage_nodes WHERE id = ?')
      .get(touchedInitial.id) as { title: string; updated_at: string }
    expect(touchedRow.title).toBe('新标题')
    expect(touchedRow.updated_at).toBe(sourceChangedAt)

    source.db.close()
    target.db.close()
  })
})
