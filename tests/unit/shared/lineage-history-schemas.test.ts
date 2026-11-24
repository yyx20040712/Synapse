/**
 * [B4 L1 §7.2] lineage-history.schemas —— history-unit 跨进程契约测试：
 * 请求 strict 校验（delta id 一致/不同时 null/同实体至多一项/line-type-names
 * 至多一项/folder 归属一致）+响应形状+语义指纹（排除 updatedAt 与派生
 * isStarred；via/锚 undefined≡null；createdAt 入指纹）+13 命令枚举闭合。
 * always-active（裸 describe）。
 */
import { describe, expect, it } from 'vitest'
import {
  LINEAGE_EDIT_COMMAND_KINDS,
  lineageEntityFingerprint,
  lineageHistoryUnitReqSchema,
  lineageHistoryUnitResSchema
} from '../../../src/shared/ipc/lineage-history.schemas'

const node = (patch: Record<string, unknown> = {}) => ({
  id: 'n-1',
  paperId: 'p-1',
  title: '甲',
  year: 2020,
  x: 1,
  y: 2,
  month: 3,
  slot: 0,
  folderId: '__main__',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...patch
})
const edge = (patch: Record<string, unknown> = {}) => ({
  id: 'e-1',
  fromNode: 'n-1',
  toNode: 'n-2',
  label: '',
  dashed: false,
  color: '#1e3a8a',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...patch
})
const note = (patch: Record<string, unknown> = {}) => ({
  id: 'fn-1',
  folderId: '__main__',
  x: 1,
  y: 2,
  content: 'c',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...patch
})

describe('lineage/history-unit 请求 schema（strict）', () => {
  it('合法请求过检（四 kind 全携）；direction ∈ undo|redo', () => {
    const ok = lineageHistoryUnitReqSchema.safeParse({
      folderId: '__main__',
      unitId: 'u-1',
      direction: 'undo',
      changes: [
        { kind: 'node', id: 'n-1', before: node(), after: null },
        { kind: 'edge', id: 'e-1', before: null, after: edge() },
        { kind: 'floating-note', id: 'fn-1', before: note(), after: note({ content: '改' }) },
        { kind: 'line-type-names', before: ['a', 'b', 'c', 'd', 'e', 'f'], after: ['g', 'h', 'i', 'j', 'k', 'l'] }
      ]
    })
    expect(ok.success).toBe(true)
    expect(lineageHistoryUnitReqSchema.safeParse({ folderId: '__main__', unitId: 'u', direction: 'redo', changes: [{ kind: 'node', id: 'n-1', before: node(), after: null }] }).success).toBe(true)
  })

  it('strict：未知键/direction 域外/空 changes/非 6 行名一律拒', () => {
    const base = { folderId: '__main__', unitId: 'u', direction: 'undo', changes: [{ kind: 'node', id: 'n-1', before: node(), after: null }] }
    expect(lineageHistoryUnitReqSchema.safeParse({ ...base, extra: 1 }).success).toBe(false)
    expect(lineageHistoryUnitReqSchema.safeParse({ ...base, direction: 'both' }).success).toBe(false)
    expect(lineageHistoryUnitReqSchema.safeParse({ ...base, changes: [] }).success).toBe(false)
    expect(
      lineageHistoryUnitReqSchema.safeParse({ ...base, changes: [{ kind: 'line-type-names', before: ['a'], after: ['b'] }] }).success
    ).toBe(false)
  })

  it('delta 不变量：id 须与 before/after 一致；不同时 null；同实体至多一项；line-type-names 至多一项', () => {
    const base = { folderId: '__main__', unitId: 'u', direction: 'undo' }
    expect(lineageHistoryUnitReqSchema.safeParse({ ...base, changes: [{ kind: 'node', id: 'n-x', before: node(), after: null }] }).success).toBe(false)
    expect(lineageHistoryUnitReqSchema.safeParse({ ...base, changes: [{ kind: 'node', id: 'n-1', before: null, after: null }] }).success).toBe(false)
    expect(
      lineageHistoryUnitReqSchema.safeParse({
        ...base,
        changes: [
          { kind: 'node', id: 'n-1', before: node(), after: null },
          { kind: 'node', id: 'n-1', before: null, after: node() }
        ]
      }).success
    ).toBe(false)
    const names = { kind: 'line-type-names', before: ['a', 'b', 'c', 'd', 'e', 'f'], after: ['g', 'h', 'i', 'j', 'k', 'l'] }
    expect(lineageHistoryUnitReqSchema.safeParse({ ...base, changes: [names, names] }).success).toBe(false)
  })

  it('folder 归属：node/floating-note 的 before/after.folderId 必须与请求 folderId 一致（边无 folderId——由端点派生）', () => {
    const base = { folderId: '__main__', unitId: 'u', direction: 'undo' }
    expect(lineageHistoryUnitReqSchema.safeParse({ ...base, changes: [{ kind: 'node', id: 'n-1', before: node({ folderId: 'f-other' }), after: null }] }).success).toBe(false)
    expect(lineageHistoryUnitReqSchema.safeParse({ ...base, changes: [{ kind: 'floating-note', id: 'fn-1', before: null, after: note({ folderId: 'f-other' }) }] }).success).toBe(false)
    expect(lineageHistoryUnitReqSchema.safeParse({ ...base, changes: [{ kind: 'edge', id: 'e-1', before: null, after: edge() }] }).success).toBe(true)
  })

  it('响应 schema：五键 strict（空数组合法——不表示整图清空）', () => {
    const empty = { folderId: '__main__', unitId: 'u', nodes: [], edges: [], floatingNotes: [], lineTypeNames: ['a', 'b', 'c', 'd', 'e', 'f'] }
    expect(lineageHistoryUnitResSchema.safeParse(empty).success).toBe(true)
    expect(lineageHistoryUnitResSchema.safeParse({ ...empty, graph: {} }).success).toBe(false)
    expect(lineageHistoryUnitResSchema.safeParse({ ...empty, nodes: [node({ isStarred: true })] }).success).toBe(true)
  })
})

describe('语义指纹（§5.1：排除 updatedAt 与派生 isStarred；含 createdAt 与边端点/via/锚）', () => {
  it('updatedAt/isStarred 不入指纹；用户字段与 createdAt 入指纹', () => {
    expect(lineageEntityFingerprint('node', node({ updatedAt: '2999-01-01T00:00:00.000Z', isStarred: true }))).toBe(lineageEntityFingerprint('node', node()))
    expect(lineageEntityFingerprint('node', node({ title: '乙' }))).not.toBe(lineageEntityFingerprint('node', node()))
    expect(lineageEntityFingerprint('node', node({ createdAt: '2025-01-01T00:00:00.000Z' }))).not.toBe(lineageEntityFingerprint('node', node()))
    expect(lineageEntityFingerprint('node', node({ x: 2 }))).not.toBe(lineageEntityFingerprint('node', node()))
  })

  it('边：via/锚 undefined≡null；端点/label/视觉入指纹', () => {
    expect(lineageEntityFingerprint('edge', edge({ via: undefined, fromAnchor: undefined }))).toBe(lineageEntityFingerprint('edge', edge()))
    expect(lineageEntityFingerprint('edge', edge({ toAnchor: null as unknown as undefined }))).toBe(lineageEntityFingerprint('edge', edge()))
    expect(lineageEntityFingerprint('edge', edge({ via: [{ x: 1, y: 2 }] }))).not.toBe(lineageEntityFingerprint('edge', edge()))
    expect(lineageEntityFingerprint('edge', edge({ toNode: 'n-3' }))).not.toBe(lineageEntityFingerprint('edge', edge()))
    expect(lineageEntityFingerprint('edge', edge({ fromAnchor: { side: 'top', slot: 1 } }))).not.toBe(lineageEntityFingerprint('edge', edge()))
  })

  it('悬浮笔记与 null：kind 前缀隔离——同形字段跨 kind 指纹不等；null 恒等', () => {
    expect(lineageEntityFingerprint('floating-note', note({ content: 'x' }))).not.toBe(lineageEntityFingerprint('floating-note', note()))
    expect(lineageEntityFingerprint('node', null)).toBe('null')
    expect(lineageEntityFingerprint('edge', null)).toBe('null')
    expect(lineageEntityFingerprint('edge', undefined)).toBe('null')
  })
})

describe('13 编辑入口枚举', () => {
  it('恰 13 项且与 §5.2 矩阵一致（toggleNodeStar 不入）', () => {
    expect([...LINEAGE_EDIT_COMMAND_KINDS]).toEqual([
      'moveNode', 'applyObstacleReroute', 'drawEdge', 'editManualEdgeLabel', 'applyEdgeLineStyle', 'setEdgeVia',
      'reconnectEdge', 'saveLineTypeNames', 'removeNode', 'removeEdge', 'addFloatingNote', 'updateFloatingNote', 'removeFloatingNote'
    ])
    expect(LINEAGE_EDIT_COMMAND_KINDS).not.toContain('toggleNodeStar')
  })
})
