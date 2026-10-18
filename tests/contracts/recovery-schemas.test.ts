import { describe, expect, it } from 'vitest'
import {
  RECOVERY_REGISTRY,
  isRegisteredRecoveryType,
  lineageRecoveryPayloadSchema,
  recoveryEnvelopeSchema,
  recoveryPeekReqSchema,
  recoveryPeekResSchema,
  recoveryReadReqSchema,
  recoveryReadResSchema,
  recoveryReleaseReqSchema,
  recoveryReleaseResSchema,
  recoverySaveReqSchema,
  recoverySaveResSchema,
  writeActionSchema,
  type LineageRecoveryPayload
} from '../../src/shared/recovery/schemas'

/**
 * [F-VISFB-65 U1] 恢复副本契约面——shared/recovery/schemas.ts 单源对账
 * （注册表/writeAction 迁移/载荷/外覆层/四通道 Req/Res）。always-active
 * （不经 guardedDescribe——三屋纪律）。
 */

function payload(over: Partial<LineageRecoveryPayload> = {}): LineageRecoveryPayload {
  return {
    folderId: '__main__',
    graph: {
      nodes: [],
      edges: [],
      lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'],
      floatingNotes: []
    },
    queue: [],
    draft: null,
    ...over
  }
}

describe('contracts/recovery-schemas —— 恢复副本单源契约（INV-156/INV-164）', () => {
  it('writeActionSchema：七 kind 判别联合各合法形过检（类型单源迁 shared——WriteAction 迁移锚）', () => {
    const cases = [
      { kind: 'patch-node', id: 'n1', patch: { x: 1, y: 2 } },
      { kind: 'patch-node', id: 'n1', patch: {}, override: { slot: 3 } },
      { kind: 'remove-node', id: 'n1' },
      {
        kind: 'upsert-edge',
        input: { id: 'e1', fromNode: 'a', toNode: 'b', label: '', via: null, fromAnchor: null, toAnchor: null },
        isNew: true,
        silentSave: true
      },
      { kind: 'remove-edge', id: 'e1' },
      { kind: 'upsert-line-type-names', input: ['一', '二', '三', '四', '五', '六'] },
      { kind: 'upsert-floating-note', input: { folderId: '__main__', x: 0, y: 0, content: '文' }, isNew: true },
      { kind: 'remove-floating-note', id: 'f1' }
    ] as const
    for (const c of cases) {
      expect(writeActionSchema.safeParse(c).success, `${c.kind} 应过检`).toBe(true)
    }
  })

  it('writeActionSchema：未知 kind/未知字段/畸形 input 拒绝', () => {
    expect(writeActionSchema.safeParse({ kind: 'explode-graph' }).success).toBe(false)
    expect(writeActionSchema.safeParse({ kind: 'remove-node', id: 'n1', extra: 1 }).success).toBe(false)
    expect(
      writeActionSchema.safeParse({ kind: 'upsert-floating-note', input: { folderId: '', x: 0, y: 0, content: '' } })
        .success
    ).toBe(false)
  })

  it('lineageRecoveryPayloadSchema：folderId+graph（恰 6 行名）+queue+draft 全形过检；draft=null 合法；畸形拒绝', () => {
    const good = payload({
      queue: [{ kind: 'remove-edge', id: 'e1' }],
      draft: { noteId: 'f1', text: '未收口草稿' }
    })
    expect(lineageRecoveryPayloadSchema.safeParse(good).success).toBe(true)
    expect(lineageRecoveryPayloadSchema.safeParse(payload()).success).toBe(true)
    // 行名恰 6 校验（lineTypeNamesSchema 复用）
    expect(
      lineageRecoveryPayloadSchema.safeParse(
        payload({ graph: { nodes: [], edges: [], lineTypeNames: ['一'], floatingNotes: [] } })
      ).success
    ).toBe(false)
    // 未知字段拒绝（strict）
    expect(lineageRecoveryPayloadSchema.safeParse({ ...payload(), undoStack: [] }).success).toBe(false)
    expect(lineageRecoveryPayloadSchema.safeParse({ ...payload(), folderId: '' }).success).toBe(false)
  })

  it('RECOVERY_REGISTRY：lineage-session 条目形状（label/fileName/schemaVersion/payloadSchema）；查键 zod 枚举先行+own-property 防原型链（INV-156）', () => {
    const meta = RECOVERY_REGISTRY['lineage-session']!
    expect(meta).toBeDefined()
    expect(meta.fileName).toBe('lineage-session.json')
    expect(meta.schemaVersion).toBe(1)
    expect(typeof meta.payloadSchema.safeParse).toBe('function')
    expect(meta.label).toBe('脉络图暂存会话')
    // 查键：注册类型真；未注册/原型链键假
    expect(isRegisteredRecoveryType('lineage-session')).toBe(true)
    expect(isRegisteredRecoveryType('reader-draft')).toBe(false)
    expect(isRegisteredRecoveryType('toString')).toBe(false)
    expect(isRegisteredRecoveryType('__proto__')).toBe(false)
  })

  it('recoveryEnvelopeSchema：外覆层形状（type/schemaVersion/token≥1/writtenAt/lastWriterSession/payload）strict', () => {
    const env = {
      type: 'lineage-session',
      schemaVersion: 1,
      token: 'tok-1',
      writtenAt: '2026-10-19T00:00:00.000Z',
      lastWriterSession: 'uuid-1',
      payload: payload()
    }
    expect(recoveryEnvelopeSchema.safeParse(env).success).toBe(true)
    expect(recoveryEnvelopeSchema.safeParse({ ...env, token: '' }).success).toBe(false)
    expect(recoveryEnvelopeSchema.safeParse({ ...env, extra: 1 }).success).toBe(false)
  })

  it('四通道 Req/Res：peek/save/read/release 形状与 strict（通道契约=域/动词）', () => {
    expect(recoveryPeekReqSchema.safeParse({ workspaceId: 'ws1' }).success).toBe(true)
    expect(recoveryPeekReqSchema.safeParse({}).success).toBe(false)

    const saveReq = {
      workspaceId: 'ws1',
      type: 'lineage-session',
      epoch: 0,
      session: 'sess-1',
      payload: payload(),
      takeOverToken: 'tok-0'
    }
    expect(recoverySaveReqSchema.safeParse(saveReq).success).toBe(true)
    expect(recoverySaveReqSchema.safeParse({ ...saveReq, type: 'unknown-type' }).success).toBe(false)
    expect(recoverySaveReqSchema.safeParse({ ...saveReq, epoch: -1 }).success).toBe(false)

    expect(recoverySaveResSchema.safeParse({ status: 'saved', token: 't', epoch: 1 }).success).toBe(true)
    expect(recoverySaveResSchema.safeParse({ status: 'stale', epoch: 2 }).success).toBe(true)
    expect(
      recoverySaveResSchema.safeParse({
        status: 'pending',
        epoch: 2,
        file: { token: 't', writtenAt: 'w', lastWriterSession: 's', actionCount: 3, draftPresent: true }
      }).success
    ).toBe(true)
    expect(recoverySaveResSchema.safeParse({ status: 'saved', epoch: 1 }).success).toBe(false) // 缺 token

    expect(recoveryPeekResSchema.safeParse({
      slots: {
        'lineage-session': { status: 'available', epoch: 0, file: { token: 't', writtenAt: 'w', lastWriterSession: 's', actionCount: 1, draftPresent: false } }
      }
    }).success).toBe(true)
    expect(recoveryPeekResSchema.safeParse({
      slots: { 'lineage-session': { status: 'foreign-version', epoch: 0 } }
    }).success).toBe(true)

    expect(recoveryReadReqSchema.safeParse({ workspaceId: 'ws1', type: 'lineage-session', token: 't' }).success).toBe(true)
    expect(recoveryReadResSchema.safeParse({ status: 'found', payload: payload() }).success).toBe(true)
    expect(recoveryReadResSchema.safeParse({ status: 'gone' }).success).toBe(true)

    expect(
      recoveryReleaseReqSchema.safeParse({ workspaceId: 'ws1', type: 'lineage-session', token: 't', reason: 'clean' })
        .success
    ).toBe(true)
    expect(
      recoveryReleaseReqSchema.safeParse({ workspaceId: 'ws1', type: 'lineage-session', token: 't', reason: 'oops' })
        .success
    ).toBe(false)
    expect(recoveryReleaseResSchema.safeParse({ status: 'released', epoch: 1 }).success).toBe(true)
    expect(recoveryReleaseResSchema.safeParse({ status: 'gone', epoch: 0 }).success).toBe(true)
  })
})
