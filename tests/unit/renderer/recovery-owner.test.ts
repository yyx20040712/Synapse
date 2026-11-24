// @vitest-environment jsdom
/**
 * [B4 L2 / 设计稿 §8.4 迁移表 11 行+§8.2 全 14 行、§11.2] recovery-owner —— 唯一槽
 * 所有权状态机单测（纯 fake ports——认领/回执/转移/迟到/删夹/课题 reset/chip）。
 * always-active 裸 describe（K3）。
 */
import { describe, expect, it, vi } from 'vitest'
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
  writeOutcome: 'saved' | 'failed'
  writeCalls: string[]
  releaseCalls: Array<'clean' | 'discard'>
  claimable: boolean
}

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
    slotClaimable: () => h.claimable,
    writeSnapshot: async (f) => {
      h.writeCalls.push(f)
      return h.writeOutcome
    },
    releaseOwn: async (reason) => {
      h.releaseCalls.push(reason)
    }
  })
}

const harness = (over: Partial<Harness> = {}): Harness => ({
  protected: ['f-a'],
  generations: { 'f-a': 3 },
  snapshots: { 'f-a': payload('f-a') },
  active: 'f-a',
  chip: false,
  published: [],
  writeOutcome: 'saved',
  writeCalls: [],
  releaseCalls: [],
  claimable: true,
  ...over
})

const flushMicro = async (turns = 8): Promise<void> => {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}

describe('§8.4 行 1/2：首次编辑认领', () => {
  it('空槽 owner null：认领（claim）→saved 回执后生效=publish owner；此后 dispatchTarget=owner', () => {
    const h = harness()
    const o = makeOwner(h)
    expect(o.current()).toBeNull()
    const t1 = o.dispatchTarget()
    expect(t1).toEqual({ folderId: 'f-a', generation: 3 })
    expect(o.current()).toBeNull() // 未生效（saved 回执前）
    o.onSaved(t1!)
    expect(o.current()).toEqual({ folderId: 'f-a', generation: 3 })
    expect(h.published).toEqual([{ folderId: 'f-a', generation: 3 }])
    expect(o.dispatchTarget()).toEqual({ folderId: 'f-a', generation: 3 })
  })

  it('外槽未决（不可认领）：dispatchTarget=null（不覆槽）；chip 呈现未受保护', () => {
    const h = harness({ claimable: false })
    const o = makeOwner(h)
    o.onEditUnit('f-a') // 触发面（认领判定+chip 刷新）
    expect(o.dispatchTarget()).toBeNull()
    expect(h.chip).toBe(true)
    expect(o.current()).toBeNull()
  })

  it('会话无可保护数据→不认领（tryClaim 快照守卫——不空转 claim/skip 环）；onSkipped 撤既有认领', () => {
    const h = harness({ snapshots: { 'f-a': null } })
    const o = makeOwner(h)
    expect(o.dispatchTarget()).toBeNull() // 快照空=不认领
    // 既有认领遇 onSkipped（dispatch 快照转空）→撤
    const h2 = harness()
    const o2 = makeOwner(h2)
    const t = o2.dispatchTarget()!
    h2.snapshots['f-a'] = null
    o2.onSkipped(t)
    expect(o2.dispatchTarget()).toBeNull()
  })
})

describe('§8.4 行 3/9：clean 族（活动会话）', () => {
  it('owner=活动会话 clean 且无其他需保护→release→owner=null', async () => {
    const h = harness()
    const o = makeOwner(h)
    o.onSaved(o.dispatchTarget()!)
    h.protected = []
    o.onClean('f-a', 'clean')
    await flushMicro()
    expect(h.releaseCalls).toEqual(['clean'])
    expect(o.current()).toBeNull()
    expect(h.published.at(-1)).toBeNull()
  })

  it('owner=活动会话 clean 但其他会话需保护→owner 留（行 9「可留 A」不转移不释放）+chip', async () => {
    const h = harness({ protected: ['f-a', 'f-b'], generations: { 'f-a': 1, 'f-b': 2 }, snapshots: { 'f-a': payload('f-a'), 'f-b': payload('f-b') } })
    const o = makeOwner(h)
    o.onSaved(o.dispatchTarget()!)
    h.protected = ['f-b'] // f-a 已 clean，f-b 仍需保护
    o.onClean('f-a', 'clean')
    await flushMicro()
    expect(h.releaseCalls).toEqual([])
    expect(h.writeCalls).toEqual([])
    expect(o.current()).toEqual({ folderId: 'f-a', generation: 1 }) // 留 A（活动）
    expect(h.chip).toBe(true) // f-b 未受保护——诚实 chip
  })
})

describe('§8.4 行 4/5：离场转移（挂起会话 clean）', () => {
  it('owner=A 离场（depart 置 pending）→A 的 flush 落定→写 B 快照（同槽覆写）→saved 后 owner=B', async () => {
    const h = harness({ protected: ['f-a', 'f-b'], generations: { 'f-a': 1, 'f-b': 5 }, snapshots: { 'f-a': payload('f-a'), 'f-b': payload('f-b') } })
    const o = makeOwner(h)
    o.onSaved(o.dispatchTarget()!)
    h.active = 'f-b' // 切到 B（A 挂起）
    o.onDepart('f-a', true)
    expect(o.transferPending()).toBe(true)
    h.protected = ['f-b'] // A 的 flush 落定后仅 B 需保护
    o.onClean('f-a', 'clean')
    await flushMicro()
    expect(h.writeCalls).toEqual(['f-b']) // 转移写（复用本会话合法覆写——无先删后写空窗）
    expect(h.releaseCalls).toEqual([]) // 不 release（无空窗）
    expect(o.current()).toEqual({ folderId: 'f-b', generation: 5 })
    expect(o.transferPending()).toBe(false)
  })

  it('转移写失败→owner 留 A+chip（不覆盖旧槽）；下次触发重试', async () => {
    const h = harness({ protected: ['f-a', 'f-b'], generations: { 'f-a': 1, 'f-b': 5 }, snapshots: { 'f-a': payload('f-a'), 'f-b': payload('f-b') }, writeOutcome: 'failed' })
    const o = makeOwner(h)
    o.onSaved(o.dispatchTarget()!)
    h.active = 'f-b'
    o.onDepart('f-a', true)
    h.protected = ['f-b']
    o.onClean('f-a', 'clean')
    await flushMicro()
    expect(h.writeCalls).toEqual(['f-b'])
    expect(o.current()).toEqual({ folderId: 'f-a', generation: 1 }) // 留 A
    expect(h.chip).toBe(true)
    expect(o.transferPending()).toBe(true) // pending 保留——下次触发重试
  })

  it('离场会话 clean 且无他需保护→release→owner=null', async () => {
    const h = harness()
    const o = makeOwner(h)
    o.onSaved(o.dispatchTarget()!)
    h.active = 'f-b' // A 离场（B 无未落定写）
    h.protected = []
    o.onClean('f-a', 'clean')
    await flushMicro()
    expect(h.releaseCalls).toEqual(['clean'])
    expect(o.current()).toBeNull()
  })
})

describe('§8.4 行 6/8：迟到回执与恢复接管', () => {
  it('迟到 save（owner 已转移）不改新 owner', async () => {
    const h = harness({ generations: { 'f-a': 1, 'f-b': 2 }, snapshots: { 'f-a': payload('f-a'), 'f-b': payload('f-b') }, protected: ['f-a', 'f-b'] })
    const o = makeOwner(h)
    const claimA = o.dispatchTarget()!
    o.onSaved(claimA)
    // 转移到 B（writeSnapshot 异步落定）
    h.active = 'f-b'
    h.protected = ['f-b']
    void o.onClean('f-a', 'clean')
    await flushMicro()
    const late = o.current()
    o.onSaved({ folderId: 'f-a', generation: 99 }) // 迟到回执（异代际）
    expect(o.current()).toEqual(late) // 不改新 owner
  })

  it('恢复 takeOver 成功→adopt（owner=F 新代际）；pending 回执作废认领（pendingChip→槽不可认领）', () => {
    const h = harness()
    const o = makeOwner(h)
    const t = o.dispatchTarget()!
    h.claimable = false // pending 回执→调度器置 pendingChip（外槽未决——槽不可认领）
    o.onPending(t) // 槽被换（外槽）：认领作废
    expect(o.dispatchTarget()).toBeNull()
    o.adopt('f-r', 7)
    expect(o.current()).toEqual({ folderId: 'f-r', generation: 7 })
    expect(h.published.at(-1)).toEqual({ folderId: 'f-r', generation: 7 })
  })
})

describe('§8.4 行 9/10/11：外槽放弃/课题切换/后台删夹', () => {
  it('外槽放弃→可认领（下一次 dispatch 认领）', () => {
    const h = harness({ claimable: false })
    const o = makeOwner(h)
    expect(o.dispatchTarget()).toBeNull()
    h.claimable = true
    o.onForeignSlotReleased()
    expect(o.dispatchTarget()).toEqual({ folderId: 'f-a', generation: 3 })
  })

  it('课题切换 resetOwner→null（发布面清零）', () => {
    const h = harness()
    const o = makeOwner(h)
    o.onSaved(o.dispatchTarget()!)
    o.resetOwner()
    expect(o.current()).toBeNull()
    expect(h.published.at(-1)).toBeNull()
    expect(o.transferPending()).toBe(false)
  })

  it('后台删夹（owner 该夹且 IO clean）：无他需保护→release+null；有→转移写', async () => {
    const h = harness()
    const o = makeOwner(h)
    o.onSaved(o.dispatchTarget()!)
    o.onFolderRemoved('f-a')
    await flushMicro()
    expect(h.releaseCalls).toEqual(['discard'])
    expect(o.current()).toBeNull()

    const h2 = harness({ protected: ['f-a', 'f-c'], generations: { 'f-a': 1, 'f-c': 9 }, snapshots: { 'f-a': payload('f-a'), 'f-c': payload('f-c') } })
    const o2 = makeOwner(h2)
    o2.onSaved(o2.dispatchTarget()!)
    o2.onFolderRemoved('f-a')
    await flushMicro()
    expect(h2.writeCalls).toEqual(['f-c'])
    expect(o2.current()).toEqual({ folderId: 'f-c', generation: 9 })
  })

  it('非 owner 会话的 clean/删夹：不动槽（无 release 无转移写）', async () => {
    const h = harness({ protected: ['f-a', 'f-b'], generations: { 'f-a': 1, 'f-b': 2 }, snapshots: { 'f-a': payload('f-a'), 'f-b': payload('f-b') } })
    const o = makeOwner(h)
    o.onSaved(o.dispatchTarget()!)
    o.onClean('f-b', 'clean') // B 非 owner
    await flushMicro()
    expect(h.releaseCalls).toEqual([])
    expect(h.writeCalls).toEqual([])
    expect(o.current()?.folderId).toBe('f-a')
  })
})

describe('§8.4 末行：诚实 chip', () => {
  it('多 folder 需保护而 owner 单值→chip 真；仅 owner→chip 假', () => {
    const h = harness({ protected: ['f-a', 'f-b'], generations: { 'f-a': 1, 'f-b': 2 }, snapshots: { 'f-a': payload('f-a'), 'f-b': payload('f-b') } })
    const o = makeOwner(h)
    o.onSaved(o.dispatchTarget()!)
    expect(h.chip).toBe(true) // f-b 未受保护
    h.protected = ['f-a']
    o.refreshChip()
    expect(h.chip).toBe(false)
  })
})

describe('§8.2 行 2（B fetching）：挂起会话编辑不写槽', () => {
  it('onSaveNow(B) 当 owner=A：不派发（dispatchTarget 仍 A）+chip', () => {
    const h = harness({ protected: ['f-a', 'f-b'], generations: { 'f-a': 1, 'f-b': 2 }, snapshots: { 'f-a': payload('f-a'), 'f-b': payload('f-b') } })
    const o = makeOwner(h)
    o.onSaved(o.dispatchTarget()!) // owner=A
    o.onSaveNow('f-b') // B 有未落定写（切换离场请求）
    expect(o.dispatchTarget()?.folderId).toBe('f-a') // 不改目标（不覆槽）
    expect(h.chip).toBe(true)
  })
})

/** 探针形夹具（[回炉 W-B1·R-B1]）：清单内会话=代际 3、快照非空（认领快照守卫可过） */
const listed = (list: string[], over: Partial<Harness> = {}): Harness =>
  harness({
    protected: list,
    generations: Object.fromEntries(list.map((f) => [f, 3])),
    snapshots: Object.fromEntries(list.map((f) => [f, payload(f)])),
    ...over
  })

describe('§8.4 行 1/行 3：chip 只在确有非 owner 会话需保护时为真（认领窗与被清洁会话）', () => {
  it('单会话首次编辑的认领窗（owner=null、claim=该会话）chip 假；saved 后仍假', () => {
    const h = listed(['f-a'])
    const o = makeOwner(h)
    o.onEditUnit('f-a') // 触发面（认领判定+chip 刷新）
    expect(o.dispatchTarget()).toEqual({ folderId: 'f-a', generation: 3 }) // 已认领（claim）
    expect(o.current()).toBeNull() // owner 仍未生效（saved 回执前）
    expect(h.chip, '认领在途的会话视同已覆盖——不得呈现「多图有未落库修改」').toBe(false)
    o.onSaved({ folderId: 'f-a', generation: 3 })
    expect(o.current()).toEqual({ folderId: 'f-a', generation: 3 })
    expect(h.chip).toBe(false)
  })

  it('对照：两个需保护会话、仅认领其一→chip 真（诚实语义保持）', () => {
    const h = listed(['f-a', 'f-b'])
    const o = makeOwner(h)
    o.onEditUnit('f-a')
    expect(o.dispatchTarget()?.folderId).toBe('f-a')
    expect(h.chip, 'f-b 未受保护——chip 真').toBe(true)
  })

  it('对照：外槽未决不可认领（单会话）→dispatchTarget=null 且 chip 真', () => {
    const h = listed(['f-a'], { claimable: false })
    const o = makeOwner(h)
    o.onEditUnit('f-a')
    expect(o.dispatchTarget()).toBeNull()
    expect(h.chip, '不可认领=该会话确未受保护——chip 真').toBe(true)
  })

  it('owner 已释放后 onClean(该会话)——清单因调用方写链在途标记仍列出该会话→chip 假、不释放', () => {
    const h = listed(['f-a'])
    const o = makeOwner(h)
    expect(o.current()).toBeNull() // idle flush 已 release（owner=null）
    o.onClean('f-a', 'clean') // undo/redo/显式保存落定：markRecoveryClean 在写链任务体内调用
    expect(h.chip, '被清洁会话自身不得计入「需保护」（调用契约=该会话已 IO clean）').toBe(false)
    expect(h.releaseCalls).toEqual([]) // owner 非该会话：不释放
  })

  it('owner=活动会话 onClean→release→publish(null) 后 chip 假', async () => {
    const h = listed(['f-a'])
    const o = makeOwner(h)
    o.onSaved(o.dispatchTarget()!)
    expect(o.current()?.folderId).toBe('f-a')
    o.onClean('f-a', 'clean')
    await flushMicro()
    expect(h.releaseCalls).toEqual(['clean'])
    expect(o.current()).toBeNull()
    expect(h.chip, 'release 回执后被清洁会话不得计入「需保护」').toBe(false)
  })

  it('挂起会话（owner=A、活动=B）onClean→无下一会话→release→publish(null) 后 chip 假', async () => {
    const h = listed(['f-a'], { active: 'f-b' })
    const o = makeOwner(h)
    o.onEditUnit('f-a')
    o.onSaved({ folderId: 'f-a', generation: 3 })
    o.onClean('f-a', 'clean')
    await flushMicro()
    expect(h.releaseCalls).toEqual(['clean'])
    expect(o.current()).toBeNull()
    expect(h.chip, '转移裁决 release 回执后被清洁会话不得计入「需保护」').toBe(false)
  })

  it('对照：owner=A（活动）且另有 f-b 需保护→onClean(A) 不释放、chip 真（行 9「可留 A」）', async () => {
    const h = listed(['f-a', 'f-b'])
    const o = makeOwner(h)
    o.onEditUnit('f-a')
    o.onSaved({ folderId: 'f-a', generation: 3 })
    o.onClean('f-a', 'clean')
    await flushMicro()
    expect(h.releaseCalls).toEqual([]) // 仍有他会话需保护：owner 留 A
    expect(o.current()?.folderId).toBe('f-a')
    expect(h.chip, 'f-b 未受保护——chip 真').toBe(true)
  })
})

describe('§8.4 末段：chip 的判据面=有未落库写的会话（仅和解读在途不算）', () => {
  it('非 owner 会话只有和解读在途（Q0、无在途写）→chip 假；认领/转移面仍按恢复价值谓词读 protectedSessions', () => {
    const h = listed(['f-a', 'f-b'], { active: 'f-b' })
    const ports: RecoveryOwnerHostPorts & { unlandedSessions(): string[] } = {
      protectedSessions: () => h.protected,
      // f-b 只有 reconcile 在途：没有未落库写
      unlandedSessions: () => h.protected.filter((f) => f !== 'f-b'),
      generationOf: (f) => (h.generations[f] ?? null),
      sessionSnapshot: (f) => h.snapshots[f] ?? null,
      activeFolder: () => h.active,
      setUnprotectedChip: (v) => {
        h.chip = v
      },
      publish: () => undefined
    }
    const o = createRecoveryOwner({
      ...ports,
      slotClaimable: () => true,
      writeSnapshot: async () => 'saved',
      releaseOwn: async () => undefined
    })
    o.onEditUnit('f-a')
    o.onSaved(o.dispatchTarget()!) // owner=A
    o.refreshChip()
    expect(h.chip, '「多图有未落库修改」不得因他会话仅在和解读而呈现').toBe(false)
    expect(o.current()?.folderId).toBe('f-a') // 对照：认领面不受影响（f-a 仍是认领/owner 对象）
  })

  it('对照：非 owner 会话有在途写（Q>0 或写回执未到）→chip 真', () => {
    const h = listed(['f-a', 'f-b'], { active: 'f-a' })
    const ports: RecoveryOwnerHostPorts & { unlandedSessions(): string[] } = {
      protectedSessions: () => h.protected,
      unlandedSessions: () => [...h.protected],
      generationOf: (f) => h.generations[f] ?? null,
      sessionSnapshot: (f) => h.snapshots[f] ?? null,
      activeFolder: () => h.active,
      setUnprotectedChip: (v) => {
        h.chip = v
      },
      publish: () => undefined
    }
    const o = createRecoveryOwner({
      ...ports,
      slotClaimable: () => true,
      writeSnapshot: async () => 'saved',
      releaseOwn: async () => undefined
    })
    o.onSaved(o.dispatchTarget()!)
    expect(h.chip, 'f-b 有未落库写——chip 真').toBe(true)
  })
})

describe('§8.4「owner 迟到 save：不改变新 owner，不清 chip」——转移/释放回执复核（决策序号·来源 owner·目标 generation）', () => {
  /** 迟到回执夹具：转移写/释放的回执由用例择时落定；chip 写入计数供「不清 chip」断言 */
  function lateOwner(args: { protected: () => string[]; gate: 'write' | 'release' }) {
    const h = { chip: false, chipWrites: 0, published: Array<{ folderId: string; generation: number } | null>(0), writeCalls: [] as string[], releaseCalls: 0 }
    let settleGate!: (v: 'saved' | 'failed') => void
    const gate = new Promise<'saved' | 'failed'>((resolve) => {
      settleGate = resolve
    })
    const generations: Record<string, number> = { 'f-a': 1, 'f-b': 2, 'f-r': 7 }
    const owner = createRecoveryOwner({
      protectedSessions: args.protected,
      generationOf: (f) => generations[f] ?? null,
      sessionSnapshot: (f) => payload(f),
      activeFolder: () => 'f-b',
      setUnprotectedChip: (v) => {
        h.chip = v
        h.chipWrites += 1
      },
      publish: (o) => {
        h.published.push(o)
      },
      slotClaimable: () => true,
      writeSnapshot: async (f) => {
        h.writeCalls.push(f)
        return args.gate === 'write' ? gate : 'saved'
      },
      releaseOwn: async () => {
        h.releaseCalls += 1
        if (args.gate === 'release') await gate
      }
    })
    return { owner, h, generations, settle: (v: 'saved' | 'failed') => settleGate(v) }
  }
  /** owner=A 的建立：先认领（dispatchTarget）再 saved 回执——返回 owner 引用供前置断言 */
  const claimA = (o: ReturnType<typeof createRecoveryOwner>): void => {
    const target = o.dispatchTarget()
    expect(target).toEqual({ folderId: 'f-a', generation: 1 }) // 前置：认领成立（否则后续断言恒真）
    o.onSaved(target!)
    expect(o.current()).toEqual({ folderId: 'f-a', generation: 1 }) // 前置：owner=A 已生效
  }

  it('恢复接管后迟到的 A→B 转移写回执：不改新 owner、发布面不出现 B', async () => {
    let protectedFolders = ['f-a', 'f-b']
    const { owner: o, h, settle } = lateOwner({ protected: () => protectedFolders, gate: 'write' })
    claimA(o)
    o.onDepart('f-a', true)
    protectedFolders = ['f-b'] // A 的 flush 落定后仅 B 需保护
    o.onClean('f-a', 'clean') // 转移裁决：写 B 快照（回执在途）
    await flushMicro()
    expect(h.writeCalls).toEqual(['f-b'])
    o.adopt('f-r', 7) // 恢复 takeOver 成功：owner=F
    const publishedAfterAdopt = h.published.length
    settle('saved') // 迟到的转移写回执
    await flushMicro()
    expect(o.current()).toEqual({ folderId: 'f-r', generation: 7 })
    expect(h.published).toHaveLength(publishedAfterAdopt) // 零新发布
    expect(h.published.at(-1)).toEqual({ folderId: 'f-r', generation: 7 })
    expect(h.published.some((p) => p?.folderId === 'f-b')).toBe(false)
  })

  it('课题切换 resetOwner 后迟到的转移写回执：owner 保持 null、发布面不出现 B', async () => {
    let protectedFolders = ['f-a', 'f-b']
    const { owner: o, h, settle } = lateOwner({ protected: () => protectedFolders, gate: 'write' })
    claimA(o)
    o.onDepart('f-a', true)
    protectedFolders = ['f-b']
    o.onClean('f-a', 'clean')
    await flushMicro()
    expect(h.writeCalls).toEqual(['f-b']) // 前置：转移写已发出、回执在途
    o.resetOwner() // 课题切换
    expect(o.current()).toBeNull() // 前置：owner 已归 null
    settle('saved')
    await flushMicro()
    expect(o.current()).toBeNull()
    expect(o.transferPending()).toBe(false)
    expect(h.published.some((p) => p?.folderId === 'f-b')).toBe(false)
  })

  it('恢复接管后迟到的 release 回执：不把新 owner 清成 null', async () => {
    let protectedFolders = ['f-a']
    const { owner: o, h, settle } = lateOwner({ protected: () => protectedFolders, gate: 'release' })
    claimA(o)
    protectedFolders = [] // A 的 flush 已落定且无他需保护
    o.onClean('f-a', 'clean') // 挂起会话 clean 且无他需保护→release（回执在途）
    await flushMicro()
    expect(h.releaseCalls).toBe(1) // 前置：release 已发出、回执在途
    expect(o.current()).toEqual({ folderId: 'f-a', generation: 1 }) // 前置：回执未到，owner 仍 A
    o.adopt('f-r', 7) // 恢复 takeOver 成功：owner=F
    expect(o.current()).toEqual({ folderId: 'f-r', generation: 7 }) // 前置：新 owner 已生效
    settle('saved')
    await flushMicro()
    expect(o.current()).toEqual({ folderId: 'f-r', generation: 7 })
    expect(h.published.at(-1)).toEqual({ folderId: 'f-r', generation: 7 })
  })

  it('转移写在途期间目标会话被替换（generation 已变）：回执不发布到已被替换的目标', async () => {
    let protectedFolders = ['f-a', 'f-b']
    const { owner: o, h, generations, settle } = lateOwner({ protected: () => protectedFolders, gate: 'write' })
    claimA(o)
    o.onDepart('f-a', true)
    protectedFolders = ['f-b']
    o.onClean('f-a', 'clean')
    await flushMicro()
    expect(h.writeCalls).toEqual(['f-b']) // 前置：转移写已发出、回执在途
    generations['f-b'] = 8 // 目标会话恢复替换/删除重建：换代
    settle('saved')
    await flushMicro()
    expect(o.current()).toEqual({ folderId: 'f-a', generation: 1 }) // 来源 owner 不动
    expect(h.published.some((p) => p?.folderId === 'f-b')).toBe(false)
  })

  it('恢复接管后迟到的转移写成功回执：零新发布、不触碰 chip', async () => {
    let protectedFolders = ['f-a', 'f-b']
    const { owner: o, h, settle } = lateOwner({ protected: () => protectedFolders, gate: 'write' })
    claimA(o)
    o.onDepart('f-a', true)
    protectedFolders = ['f-b']
    o.onClean('f-a', 'clean')
    await flushMicro()
    expect(h.writeCalls).toEqual(['f-b']) // 前置：转移写已发出、回执在途
    o.adopt('f-r', 7)
    expect(o.current()).toEqual({ folderId: 'f-r', generation: 7 }) // 前置：新 owner 已生效
    const publishedAfterAdopt = h.published.length
    const chipWrites = h.chipWrites
    settle('saved')
    await flushMicro()
    expect(h.chipWrites).toBe(chipWrites) // 迟到回执不刷新 chip
    expect(h.published).toHaveLength(publishedAfterAdopt)
  })

  it('恢复接管后迟到的转移写失败回执：不复位 transferPending（新 owner 不在转移中）、不触碰 chip', async () => {
    let protectedFolders = ['f-a', 'f-b']
    const { owner: o, h, settle } = lateOwner({ protected: () => protectedFolders, gate: 'write' })
    claimA(o)
    o.onDepart('f-a', true)
    protectedFolders = ['f-b']
    o.onClean('f-a', 'clean')
    await flushMicro()
    expect(h.writeCalls).toEqual(['f-b']) // 前置：转移写已发出、回执在途
    o.adopt('f-r', 7)
    expect(o.current()).toEqual({ folderId: 'f-r', generation: 7 }) // 前置：新 owner 已生效
    const chipWrites = h.chipWrites
    settle('failed') // 迟到失败回执
    await flushMicro()
    expect(o.transferPending()).toBe(false)
    expect(h.chipWrites).toBe(chipWrites)
    expect(o.current()).toEqual({ folderId: 'f-r', generation: 7 })
  })
})

// vi 引用保持（后续扩展用——避免未用 import 告警）
void vi
