/**
 * [F-RECOV-04 回炉 W1] recovery-restore-preflight 七 kind 判据矩阵（纯数据件
 * 直接测试——审查 M3「七 kind 判据零直接测试」的对治：每 kind 至少一正一负，
 * 判据基准=库态读面（PreflightView），冲突分档 lost（意图无法达成）/gone
 * （目标已亡按既有丢弃语义收口）。always-active（node 纯件零 IPC 零 store）。
 */
import { describe, expect, it } from 'vitest'
import {
  buildPreflightView,
  preflightRestorePayload,
  type PreflightView
} from '../../../src/renderer/features/lineage/recovery-restore-preflight'
import { MAIN_GRAPH_ID } from '@shared/models/lineage'
import type { LineageRecoveryPayload, WriteAction } from '@shared/recovery/schemas'

const LINE_TYPES = ['一', '二', '三', '四', '五', '六']

function payloadOf(queue: WriteAction[], folderId: string = MAIN_GRAPH_ID): LineageRecoveryPayload {
  return {
    folderId,
    graph: { nodes: [], edges: [], lineTypeNames: LINE_TYPES, floatingNotes: [] },
    queue,
    draft: null
  }
}

/** 活库态读面：节点 n1/n2、边 e1、笔记 f1、文件夹 fold-1 */
const LIVE: PreflightView = buildPreflightView(
  { nodes: [{ id: 'n1' }, { id: 'n2' }], edges: [{ id: 'e1' }], floatingNotes: [{ id: 'f1' }] },
  ['fold-1']
)

const EDGE_INPUT = { fromNode: 'n1', toNode: 'n2', label: '', dashed: false, color: '#1e3a5f' }
const NOTE_INPUT = { id: 'f9', folderId: 'fold-1', x: 0, y: 0, content: '笔记正文' }

describe('F-RECOV-04 预检判据矩阵（七 kind 一正一负——W1）', () => {
  it('patch-node：目标节点不在读面=lost 冲突；在场=无冲突', () => {
    expect(preflightRestorePayload(payloadOf([{ kind: 'patch-node', id: 'n-gone', patch: { x: 1 } }]), LIVE)).toEqual([
      expect.objectContaining({ index: 0, kind: 'patch-node', level: 'lost' })
    ])
    expect(preflightRestorePayload(payloadOf([{ kind: 'patch-node', id: 'n1', patch: { x: 1 } }]), LIVE)).toEqual([])
  })

  it('remove-node：待删节点已亡=gone 列示级；在场=无冲突', () => {
    expect(preflightRestorePayload(payloadOf([{ kind: 'remove-node', id: 'n-gone' }]), LIVE)).toEqual([
      expect.objectContaining({ index: 0, kind: 'remove-node', level: 'gone' })
    ])
    expect(preflightRestorePayload(payloadOf([{ kind: 'remove-node', id: 'n2' }]), LIVE)).toEqual([])
  })

  it('upsert-edge：单端缺失/双端缺失=lost；双端在场=无冲突', () => {
    expect(
      preflightRestorePayload(payloadOf([{ kind: 'upsert-edge', input: { ...EDGE_INPUT, toNode: 'n-gone' } }]), LIVE)
    ).toEqual([expect.objectContaining({ index: 0, kind: 'upsert-edge', level: 'lost' })])
    expect(
      preflightRestorePayload(
        payloadOf([{ kind: 'upsert-edge', input: { ...EDGE_INPUT, fromNode: 'n-gone-a', toNode: 'n-gone-b' } }]),
        LIVE
      )
    ).toEqual([expect.objectContaining({ kind: 'upsert-edge', level: 'lost' })])
    expect(preflightRestorePayload(payloadOf([{ kind: 'upsert-edge', input: { ...EDGE_INPUT } }]), LIVE)).toEqual([])
  })

  it('remove-edge：待删边已亡=gone；在场=无冲突', () => {
    expect(preflightRestorePayload(payloadOf([{ kind: 'remove-edge', id: 'e-gone' }]), LIVE)).toEqual([
      expect.objectContaining({ index: 0, kind: 'remove-edge', level: 'gone' })
    ])
    expect(preflightRestorePayload(payloadOf([{ kind: 'remove-edge', id: 'e1' }]), LIVE)).toEqual([])
  })

  it('upsert-line-type-names：恒无冲突（空读面/活读面皆然）', () => {
    expect(
      preflightRestorePayload(payloadOf([{ kind: 'upsert-line-type-names', input: LINE_TYPES }]), LIVE)
    ).toEqual([])
    expect(
      preflightRestorePayload(
        payloadOf([{ kind: 'upsert-line-type-names', input: LINE_TYPES }]),
        buildPreflightView({ nodes: [], edges: [], floatingNotes: [] }, [])
      )
    ).toEqual([])
  })

  it('upsert-floating-note：ghost folder=lost；活文件夹=无冲突；MAIN_GRAPH_ID 豁免', () => {
    expect(
      preflightRestorePayload(
        payloadOf([{ kind: 'upsert-floating-note', input: { ...NOTE_INPUT, folderId: 'fold-gone' } }]),
        LIVE
      )
    ).toEqual([expect.objectContaining({ index: 0, kind: 'upsert-floating-note', level: 'lost' })])
    expect(preflightRestorePayload(payloadOf([{ kind: 'upsert-floating-note', input: { ...NOTE_INPUT } }]), LIVE)).toEqual([])
    expect(
      preflightRestorePayload(
        payloadOf([{ kind: 'upsert-floating-note', input: { ...NOTE_INPUT, folderId: MAIN_GRAPH_ID } }]),
        buildPreflightView({ nodes: [], edges: [], floatingNotes: [] }, [])
      )
    ).toEqual([])
  })

  it('remove-floating-note：待删笔记已亡=gone；在场=无冲突', () => {
    expect(preflightRestorePayload(payloadOf([{ kind: 'remove-floating-note', id: 'f-gone' }]), LIVE)).toEqual([
      expect.objectContaining({ index: 0, kind: 'remove-floating-note', level: 'gone' })
    ])
    expect(preflightRestorePayload(payloadOf([{ kind: 'remove-floating-note', id: 'f1' }]), LIVE)).toEqual([])
  })

  it('多动作混合：序号逐项对应（index=载荷 queue 序）', () => {
    const conflicts = preflightRestorePayload(
      payloadOf([
        { kind: 'upsert-line-type-names', input: LINE_TYPES },
        { kind: 'patch-node', id: 'n1', patch: { x: 1 } },
        { kind: 'remove-edge', id: 'e-gone' }
      ]),
      LIVE
    )
    expect(conflicts).toEqual([expect.objectContaining({ index: 2, kind: 'remove-edge', level: 'gone' })])
  })
})
