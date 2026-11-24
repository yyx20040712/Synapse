// @vitest-environment jsdom
/**
 * [回炉 W-B2·R-W4 / 设计稿 §8.4 迁移表行 1「首次编辑：owner 在 saved 回执后生效」、行 3
 * 「idle/显式 flush 全成功→folder→null（release 后）」、「owner 迟到 save：不改变新 owner」]
 * release 回执落地前复核「该会话是否仍有未落库写」。
 *
 * 原缺陷：回执在途期（markCleanAwaitable 含在途 flight 有界 drain + release IPC）同会话再来新编辑
 * 不推进决策序号（onEditUnit→tryClaim 在 owner 非空时不改 owner/claim），迟到的回执照常
 * publish(null)——owner 归 null 而该会话 Q>0，窗口内该会话的恢复副本不受保护，单会话被 chip
 * 判为未受保护，直到下一次编辑才重新认领。
 * 判据=「release 回执在途期该会话来过编辑触发」（onEditUnit/onSaveNow——新未落库写一律经
 * notifyRecoveryEditUnit/notifyRecoverySaveNow 触达 owner），不是「回执落定时查需保护清单」：清单里的
 * 该会话可能只是调用方写链的在途标记（recovery-owner.test.ts「清单因调用方写链在途标记仍列出该
 * 会话→release→null」为既有合约）。
 * 纯 fake ports（recovery-owner.test.ts 同型夹具，release 回执由用例放行）。always-active（K3）。
 */
import { describe, expect, it } from 'vitest'
import { createRecoveryOwner, type RecoveryOwnerHostPorts } from '../../../src/renderer/features/lineage/recovery-owner'
import type { LineageRecoveryPayload } from '../../../src/shared/recovery/schemas'

const payload = (folderId: string): LineageRecoveryPayload => ({
  folderId,
  graph: { nodes: [], edges: [], lineTypeNames: ['一', '二', '三', '四', '五', '六'], floatingNotes: [] },
  queue: [],
  draft: null
})

interface Harness {
  protected: string[]
  generations: Record<string, number>
  snapshots: Record<string, LineageRecoveryPayload | null>
  active: string
  chip: boolean
  published: Array<{ folderId: string; generation: number } | null>
  releaseCalls: Array<'clean' | 'discard'>
  releaseResolvers: Array<() => void>
}

const harness = (over: Partial<Harness> = {}): Harness => ({
  protected: ['f-a'],
  generations: { 'f-a': 3 },
  snapshots: { 'f-a': payload('f-a') },
  active: 'f-a',
  chip: false,
  published: [],
  releaseCalls: [],
  releaseResolvers: [],
  ...over
})

function makeOwner(h: Harness) {
  const host: RecoveryOwnerHostPorts = {
    protectedSessions: () => h.protected,
    generationOf: (f) => h.generations[f] ?? null,
    sessionSnapshot: (f) => h.snapshots[f] ?? null,
    activeFolder: () => h.active,
    setUnprotectedChip: (v) => {
      h.chip = v
    },
    publish: (o) => {
      h.published.push(o)
    }
  }
  return createRecoveryOwner({
    ...host,
    slotClaimable: () => true,
    writeSnapshot: async () => 'saved',
    releaseOwn: (reason) => {
      h.releaseCalls.push(reason)
      return new Promise<void>((resolve) => {
        h.releaseResolvers.push(resolve)
      })
    }
  })
}

const flushMicro = async (turns = 8): Promise<void> => {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}

const OWNER_A = { folderId: 'f-a', generation: 3 }

describe('活动会话的 release 回执在途期同会话再来新编辑', () => {
  it('迟到回执不发布 null：owner 留该会话（其快照写由新编辑的触发面派发），chip 不误报', async () => {
    const h = harness()
    const o = makeOwner(h)
    o.onSaved(o.dispatchTarget()!) // 认领生效：owner=f-a
    expect(o.current()).toEqual(OWNER_A)
    h.protected = [] // f-a 落定（flush 全成功）
    o.onClean('f-a', 'clean') // release 发出——回执挂起
    expect(h.releaseCalls).toEqual(['clean'])
    h.protected = ['f-a'] // 回执在途期同会话又有未落库写
    o.onEditUnit('f-a')
    h.releaseResolvers[0]!() // 迟到的 release 回执
    await flushMicro()
    expect(o.current(), '会话仍有未落库写：owner 不得归 null').toEqual(OWNER_A)
    expect(h.published, '仅认领生效那一次发布').toEqual([OWNER_A])
    expect(h.chip, '单会话有未落库写且 owner 即该会话——不得显示「多图未受保护」').toBe(false)
  })

  it('对照：回执在途期无新编辑 → 照旧发布 null', async () => {
    const h = harness()
    const o = makeOwner(h)
    o.onSaved(o.dispatchTarget()!)
    h.protected = []
    o.onClean('f-a', 'clean')
    h.releaseResolvers[0]!()
    await flushMicro()
    expect(o.current()).toBeNull()
    expect(h.published).toEqual([OWNER_A, null])
  })

  it('对照（W-B1 既有合约）：清单因调用方写链在途标记仍列出该会话、但回执在途期无编辑触发 → 照旧发布 null', async () => {
    const h = harness() // protected 恒为 ['f-a']——模拟 markRecoveryClean 在写链任务体内调用时会话仍在清单
    const o = makeOwner(h)
    o.onSaved(o.dispatchTarget()!)
    o.onClean('f-a', 'clean')
    h.releaseResolvers[0]!()
    await flushMicro()
    expect(o.current()).toBeNull() // 清单在场≠有新写：不得据此扣住 owner
    expect(h.published).toEqual([OWNER_A, null])
    expect(h.chip).toBe(false)
  })
})

describe('挂起会话的 release 分支（转移裁决无下一需保护会话）同款复核', () => {
  it('回执在途期该挂起会话又有未落库写：不发布 null、owner 留该会话', async () => {
    const h = harness({ active: 'f-b' })
    const o = makeOwner(h)
    o.onSaved(o.dispatchTarget()!)
    h.protected = []
    o.onClean('f-a', 'clean') // 挂起会话 clean→无下一会话→release（回执挂起）
    expect(h.releaseCalls).toEqual(['clean'])
    h.protected = ['f-a']
    o.onEditUnit('f-a') // 回执在途期该挂起会话又有未落库写（编辑触发）
    h.releaseResolvers[0]!()
    await flushMicro()
    expect(o.current()).toEqual(OWNER_A)
    expect(h.published).toEqual([OWNER_A])
    expect(h.chip).toBe(false)
  })

  it('对照：回执落地时已无未落库写 → 发布 null', async () => {
    const h = harness({ active: 'f-b' })
    const o = makeOwner(h)
    o.onSaved(o.dispatchTarget()!)
    h.protected = []
    o.onClean('f-a', 'clean')
    h.releaseResolvers[0]!()
    await flushMicro()
    expect(o.current()).toBeNull()
  })
})
