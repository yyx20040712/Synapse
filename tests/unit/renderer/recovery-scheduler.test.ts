// @vitest-environment jsdom
/**
 * [F-VISFB-65 U5] recoveryScheduler —— 恢复副本调度器行为锁（fake timer）。
 * 覆盖（票面测试清单 scheduler 段）：300ms trailing/单飞行合流、generation
 * 同步先行（clean 后 pending 复活=红）、出队 saveNow、degraded chip、草稿
 * 内容触发；另锁屏障 peek/放弃/稍后处理/恢复接管/死文件夹/退避。always-active。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  recovery: { peek: vi.fn(), save: vi.fn(), read: vi.fn(), release: vi.fn() },
  folders: { list: vi.fn() }
})

import {
  deferRecoverySlot,
  discardRecoverySlot,
  enterWorkspaceRecovery,
  getRecoveryState,
  initRecoveryScheduler,
  markRecoveryClean,
  notifyRecoveryDraftChange,
  notifyRecoveryEditUnit,
  notifyRecoverySaveNow,
  recoveryBlocked,
  resetRecoveryScheduler,
  restoreRecoverySlot,
  strongQuitRecoveryBestEffort,
  awaitRecoveryQuitSettled
} from '../../../src/renderer/features/lineage/recoveryScheduler'
import type { LineageRecoveryPayload } from '@shared/recovery/schemas'

function payload(tag: string): LineageRecoveryPayload {
  return {
    folderId: '__main__',
    graph: {
      nodes: [],
      edges: [],
      lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'],
      floatingNotes: []
    },
    queue: [{ kind: 'remove-edge', id: tag }],
    draft: null
  }
}

const saved = (token: string, epoch = 0) => ({ ok: true as const, data: { status: 'saved' as const, token, epoch } })

/** 可控快照源：current 非空即「脏会话」可保存 */
let current: LineageRecoveryPayload | null = null
let loaded: LineageRecoveryPayload | null = null
let restored: LineageRecoveryPayload | null = null
let openedView = 0

let discardedLoads = 0

function init(): void {
  discardedLoads = 0
  initRecoveryScheduler({
    workspaceId: () => 'ws-1',
    snapshot: () => current,
    loadPayload: (p) => (loaded = p),
    onRestored: (p) => (restored = p),
    openLineageView: () => (openedView += 1),
    discardLoadedSession: () => (discardedLoads += 1)
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  current = null
  loaded = null
  restored = null
  openedView = 0
  discardedLoads = 0
  resetRecoveryScheduler()
  stubApi.recovery.peek.mockResolvedValue({
    ok: true,
    data: { slots: { 'lineage-session': { status: 'empty', epoch: 0 } } }
  })
  stubApi.recovery.save.mockResolvedValue(saved('tok-1'))
  stubApi.recovery.release.mockResolvedValue({ ok: true, data: { status: 'released', epoch: 1 } })
  stubApi.recovery.read.mockResolvedValue({ ok: true, data: { status: 'gone' } })
  stubApi.folders.list.mockResolvedValue({ ok: true, data: [{ id: 'f1', name: '夹', position: 0, createdAt: 't' }] })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('F-VISFB-65 recoveryScheduler —— 节流/代际/降级（INV-161/166）', () => {
  it('300ms trailing：触发后 300ms 内不写，到点单写最新快照（两次触发合流一写）', async () => {
    init()
    current = payload('a')
    notifyRecoveryEditUnit()
    expect(stubApi.recovery.save).not.toHaveBeenCalled()
    current = payload('b')
    notifyRecoveryEditUnit() // 300ms 窗内第二触发——合流
    await vi.advanceTimersByTimeAsync(299)
    expect(stubApi.recovery.save).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(1)
    expect(stubApi.recovery.save.mock.calls[0]![0].payload).toEqual(payload('b')) // 最新快照
  })

  it('单飞行+重臂：在途窗新触发不并发，收束后重臂 300ms 再写', async () => {
    init()
    let resolveSave: (v: unknown) => void = () => undefined
    stubApi.recovery.save.mockReturnValue(
      new Promise((r) => (resolveSave = r)) as never
    )
    current = payload('a')
    notifyRecoveryEditUnit()
    await vi.advanceTimersByTimeAsync(300)
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(1)
    // 在途窗触发 → 不并发
    current = payload('b')
    notifyRecoveryEditUnit()
    await vi.advanceTimersByTimeAsync(600)
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(1)
    resolveSave(saved('tok-x'))
    await vi.advanceTimersByTimeAsync(299)
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(2) // 收束后重臂到点
    expect(stubApi.recovery.save.mock.calls[1]![0].payload).toEqual(payload('b'))
  })

  it('出队 saveNow：不节流即时发（未到 300ms 也立即写）', async () => {
    init()
    current = payload('a')
    notifyRecoveryEditUnit()
    await vi.advanceTimersByTimeAsync(100)
    current = payload('b')
    notifyRecoverySaveNow()
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(1)
    expect(stubApi.recovery.save.mock.calls[0]![0].payload).toEqual(payload('b'))
  })

  it('草稿内容变更=同一触发面（trailing 路径）', async () => {
    init()
    current = payload('draft')
    notifyRecoveryDraftChange()
    await vi.advanceTimersByTimeAsync(299)
    expect(stubApi.recovery.save).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(1)
  })

  it('generation 同步先行：clean 时清 trailing——已 armed 的 pending 不得在 clean 后复活；release 用在途写的 token', async () => {
    init()
    // 先完成一笔写（ownToken=tok-1），再开在途写（tok-x）——release 须取在途最新
    stubApi.recovery.save.mockResolvedValueOnce(saved('tok-1'))
    current = payload('warm')
    notifyRecoverySaveNow()
    await vi.advanceTimersByTimeAsync(0)
    let resolveSave: (v: unknown) => void = () => undefined
    stubApi.recovery.save.mockReturnValue(new Promise((r) => (resolveSave = r)) as never)
    current = payload('a')
    notifyRecoverySaveNow() // 在途
    await vi.advanceTimersByTimeAsync(0)
    current = payload('b')
    notifyRecoveryEditUnit() // 在途窗触发→needsResend 挂起
    markRecoveryClean('clean') // ← 同步 tick：gen++/丢 pending/清 timer
    await vi.advanceTimersByTimeAsync(1000)
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(2) // armed 写未复活（红证锚）
    // drain：在途 save 落定（token=tok-x 簿记保留——ownToken 已陈旧）→ release 用该 token
    resolveSave(saved('tok-x'))
    await awaitRecoveryQuitSettled()
    expect(stubApi.recovery.release).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: 'ws-1', type: 'lineage-session', token: 'tok-x', reason: 'clean' })
    )
    // timer 面红证锚：clean 后再 armed 的 trailing 也必须被同 tick 清除
    stubApi.recovery.save.mockResolvedValue(saved('tok-late'))
    current = payload('c')
    notifyRecoveryEditUnit() // armed 300ms
    markRecoveryClean('clean')
    await vi.advanceTimersByTimeAsync(1000)
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(2) // timer 未复活
  })

  it('save 失败退避 3 次→degraded（chip 态）；后续成功清除 degraded', async () => {
    init()
    stubApi.recovery.save.mockResolvedValue({ ok: false, error: { code: 'IO_ERROR', message: '写失败' } })
    current = payload('a')
    notifyRecoveryEditUnit()
    await vi.advanceTimersByTimeAsync(300)
    expect(getRecoveryState().degraded).toBe(false)
    await vi.advanceTimersByTimeAsync(1000) // 退避 1：失败
    await vi.advanceTimersByTimeAsync(2000) // 退避 2：失败
    await vi.advanceTimersByTimeAsync(4000) // 退避 3：失败
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(4) // 首发+3 退避
    expect(getRecoveryState().degraded).toBe(true)
    // 恢复：新触发+成功写 → degraded 清
    stubApi.recovery.save.mockResolvedValue(saved('tok-ok'))
    current = payload('b')
    notifyRecoveryEditUnit()
    await vi.advanceTimersByTimeAsync(300)
    expect(getRecoveryState().degraded).toBe(false)
  })

  it('stale 采纳重试：save=stale 回当前 epoch→采纳后按节流重发新 epoch', async () => {
    init()
    stubApi.recovery.save.mockResolvedValueOnce({ ok: true, data: { status: 'stale', epoch: 7 } })
    stubApi.recovery.save.mockResolvedValue(saved('tok-2', 7))
    current = payload('a')
    notifyRecoverySaveNow()
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(300) // stale→重臂到点重发
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(2)
    expect(stubApi.recovery.save.mock.calls[1]![0].epoch).toBe(7)
  })

  it('pending 拒写→chip 常驻（稍后处理族——W-07）', async () => {
    init()
    stubApi.recovery.save.mockResolvedValue({
      ok: true,
      data: { status: 'pending', epoch: 0, file: { token: 't', writtenAt: 'w', lastWriterSession: 's', actionCount: 0, draftPresent: false } }
    })
    current = payload('a')
    notifyRecoverySaveNow()
    await vi.advanceTimersByTimeAsync(0)
    expect(getRecoveryState().pendingChip).toBe(true)
  })

  it('强退尽力：saveNow 即时发（不 release）', async () => {
    init()
    current = payload('last')
    strongQuitRecoveryBestEffort()
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(1)
    expect(stubApi.recovery.release).not.toHaveBeenCalled()
  })
})

describe('F-VISFB-65 recoveryScheduler —— ws-entry 屏障与确认条决策（§6）', () => {
  it('peek empty→开门（blocked 假）；available→确认条+frozen', async () => {
    init()
    await enterWorkspaceRecovery()
    expect(recoveryBlocked()).toBe(false)
    expect(getRecoveryState().phase).toBe('open')
    stubApi.recovery.peek.mockResolvedValue({
      ok: true,
      data: {
        slots: {
          'lineage-session': {
            status: 'available',
            epoch: 3,
            file: { token: 'tok-slot', writtenAt: '2026-10-19T05:00:00.000Z', lastWriterSession: 'old', actionCount: 2, draftPresent: true }
          }
        }
      }
    })
    await enterWorkspaceRecovery()
    expect(recoveryBlocked()).toBe(true) // 冻结直到决策
    const st = getRecoveryState()
    expect(st.phase).toBe('await-decision')
    expect(st.slotKind).toBe('available')
    expect(st.file?.actionCount).toBe(2)
    expect(st.file?.draftPresent).toBe(true)
  })

  it('peek 失败=fail-open 开门+degraded（INV-166：恢复故障不阻断编辑）', async () => {
    init()
    stubApi.recovery.peek.mockResolvedValue({ ok: false, error: { code: 'IO_ERROR', message: 'x' } })
    await enterWorkspaceRecovery()
    expect(recoveryBlocked()).toBe(false)
    expect(getRecoveryState().degraded).toBe(true)
  })

  it('放弃=release(token, discard)→开门收条；失败保持条可重试', async () => {
    init()
    stubApi.recovery.peek.mockResolvedValue({
      ok: true,
      data: { slots: { 'lineage-session': { status: 'invalid', epoch: 0, file: { token: 'opaque-1', writtenAt: '', lastWriterSession: '', actionCount: 0, draftPresent: false } } } }
    })
    await enterWorkspaceRecovery()
    await discardRecoverySlot()
    expect(stubApi.recovery.release).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'opaque-1', reason: 'discard' })
    )
    expect(recoveryBlocked()).toBe(false)
    expect(getRecoveryState().phase).toBe('open')
    // 失败路径：重开条→release 失败→条保持+busy 复位
    stubApi.recovery.peek.mockResolvedValue({
      ok: true,
      data: { slots: { 'lineage-session': { status: 'available', epoch: 0, file: { token: 'tok-9', writtenAt: '', lastWriterSession: '', actionCount: 0, draftPresent: false } } } }
    })
    await enterWorkspaceRecovery()
    stubApi.recovery.release.mockResolvedValue({ ok: false, error: { code: 'IO_ERROR', message: 'x' } })
    await discardRecoverySlot()
    expect(getRecoveryState().phase).toBe('await-decision')
    expect(getRecoveryState().busy).toBe(false)
    expect(recoveryBlocked()).toBe(true)
  })

  it('稍后处理：开门可编辑+chip 常驻；重开条→再冻结', async () => {
    init()
    stubApi.recovery.peek.mockResolvedValue({
      ok: true,
      data: { slots: { 'lineage-session': { status: 'available', epoch: 0, file: { token: 'tok-d', writtenAt: '', lastWriterSession: '', actionCount: 1, draftPresent: false } } } }
    })
    await enterWorkspaceRecovery()
    deferRecoverySlot()
    expect(recoveryBlocked()).toBe(false)
    expect(getRecoveryState().pendingChip).toBe(true)
    expect(getRecoveryState().phase).toBe('open')
    getRecoveryState() // canReopen 经 chip 呈现——重开：
    const { reopenRecoveryBar } = await import('../../../src/renderer/features/lineage/recoveryScheduler')
    reopenRecoveryBar()
    expect(getRecoveryState().phase).toBe('await-decision')
    expect(recoveryBlocked()).toBe(true)
  })

  it('恢复：read→folder 校验→载入→takeOver 原样回写→草稿水化计划→路由；busy 全程', async () => {
    init()
    const slotPayload = payload('restored')
    stubApi.recovery.peek.mockResolvedValue({
      ok: true,
      data: { slots: { 'lineage-session': { status: 'available', epoch: 0, file: { token: 'tok-r', writtenAt: '', lastWriterSession: 'old', actionCount: 1, draftPresent: false } } } }
    })
    stubApi.recovery.read.mockResolvedValue({ ok: true, data: { status: 'found', payload: slotPayload } })
    stubApi.recovery.save.mockResolvedValue(saved('tok-new'))
    await enterWorkspaceRecovery()
    const p = restoreRecoverySlot()
    expect(getRecoveryState().busy).toBe(true)
    await p
    // read+takeOver save 各一（save 载荷=原 payload 原样）
    expect(stubApi.recovery.read).toHaveBeenCalledWith(expect.objectContaining({ token: 'tok-r' }))
    expect(stubApi.recovery.save).toHaveBeenCalledWith(
      expect.objectContaining({ takeOverToken: 'tok-r', payload: slotPayload })
    )
    expect(loaded).toEqual(slotPayload)
    expect(restored).toEqual(slotPayload)
    expect(openedView).toBe(1)
    expect(recoveryBlocked()).toBe(false)
    expect(getRecoveryState().phase).toBe('open')
  })

  it('死文件夹：folder 不在（非主图）→恢复禁用（deadFolder 态）+门维持冻结', async () => {
    init()
    stubApi.recovery.peek.mockResolvedValue({
      ok: true,
      data: { slots: { 'lineage-session': { status: 'available', epoch: 0, file: { token: 'tok-df', writtenAt: '', lastWriterSession: '', actionCount: 0, draftPresent: false } } } }
    })
    stubApi.recovery.read.mockResolvedValue({ ok: true, data: { status: 'found', payload: payload('x') } })
    // 载荷 folderId=__main__ 恒活——改用文件夹 id 载荷
    const deadPayload = { ...payload('x'), folderId: 'f-gone' }
    stubApi.recovery.read.mockResolvedValue({ ok: true, data: { status: 'found', payload: deadPayload } })
    stubApi.folders.list.mockResolvedValue({ ok: true, data: [] })
    await enterWorkspaceRecovery()
    await restoreRecoverySlot()
    expect(getRecoveryState().deadFolder).toBe(true)
    expect(getRecoveryState().busy).toBe(false)
    expect(recoveryBlocked()).toBe(true) // 门未开（等待放弃/稍后处理）
    expect(stubApi.recovery.save).not.toHaveBeenCalled() // 未接管
  })
})

describe('F-VISFB-65 回炉 W2/W3/W5/W9/W10 —— 调度器补强', () => {
  it('W9 装配即冻结：init 后 blocked 真；peek 在途恒冻结；peek 空→开门+期间脏态补存', async () => {
    init()
    expect(recoveryBlocked()).toBe(true) // inited 且未开门——清单窗编辑不可达
    let resolvePeek: (v: unknown) => void = () => undefined
    stubApi.recovery.peek.mockReturnValue(new Promise((r) => (resolvePeek = r)) as never)
    const entering = enterWorkspaceRecovery()
    await vi.advanceTimersByTimeAsync(10)
    expect(recoveryBlocked()).toBe(true) // peek 在途恒冻结
    resolvePeek({ ok: true, data: { slots: { 'lineage-session': { status: 'empty', epoch: 0 } } } })
    await entering
    expect(recoveryBlocked()).toBe(false)
  })

  it('W9 开门补存：peek 收束时快照非空→armed（advance 300 即写）', async () => {
    init()
    current = payload('pending-during-barrier')
    await enterWorkspaceRecovery() // peek empty（beforeEach 桩）→开门
    expect(stubApi.recovery.save).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(300)
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(1)
    expect(stubApi.recovery.save.mock.calls[0]![0].payload).toEqual(payload('pending-during-barrier'))
  })

  it('W3 常态 save 无 1500ms 界：慢回包（2s）不作败——零退避零 degraded', async () => {
    init()
    let resolveSave: (v: unknown) => void = () => undefined
    stubApi.recovery.save.mockReturnValue(new Promise((r) => (resolveSave = r)) as never)
    current = payload('slow-disk')
    notifyRecoverySaveNow()
    await vi.advanceTimersByTimeAsync(2000) // 超旧界 500ms——无超时作败
    expect(getRecoveryState().degraded).toBe(false)
    resolveSave(saved('tok-slow'))
    await vi.advanceTimersByTimeAsync(0)
    expect(getRecoveryState().degraded).toBe(false)
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(1) // 无退避重发
  })

  it('W3 确认条动作带界：restore 的 read 挂起 1600ms→busy 复位（条可重试不永挂）', async () => {
    init()
    stubApi.recovery.peek.mockResolvedValue({
      ok: true,
      data: { slots: { 'lineage-session': { status: 'available', epoch: 0, file: { token: 'tok-hang', writtenAt: 'w', lastWriterSession: 's', actionCount: 0, draftPresent: false } } } }
    })
    stubApi.recovery.read.mockReturnValue(new Promise(() => undefined) as never) // 永挂
    await enterWorkspaceRecovery()
    const p = restoreRecoverySlot()
    await vi.advanceTimersByTimeAsync(0)
    expect(getRecoveryState().busy).toBe(true)
    await vi.advanceTimersByTimeAsync(1600)
    expect(getRecoveryState().busy).toBe(false) // 超时 fail-断——不永挂
    await p
  })

  it('W2 恢复成功清 pendingChip（degraded 开门分支同）', async () => {
    init()
    // 先经 defer 置 chip
    stubApi.recovery.peek.mockResolvedValue({
      ok: true,
      data: { slots: { 'lineage-session': { status: 'available', epoch: 0, file: { token: 'tok-c', writtenAt: '', lastWriterSession: '', actionCount: 0, draftPresent: false } } } }
    })
    await enterWorkspaceRecovery()
    deferRecoverySlot()
    expect(getRecoveryState().pendingChip).toBe(true)
    // 重开→恢复成功→chip 清
    const { reopenRecoveryBar } = await import('../../../src/renderer/features/lineage/recoveryScheduler')
    reopenRecoveryBar()
    stubApi.recovery.read.mockResolvedValue({ ok: true, data: { status: 'found', payload: payload('chip-clear') } })
    stubApi.recovery.save.mockResolvedValue(saved('tok-ok'))
    await restoreRecoverySlot()
    expect(getRecoveryState().pendingChip).toBe(false)
    expect(getRecoveryState().phase).toBe('open')
  })

  it('W5 takeOver 未成：条恢复可用态（busy 假+await-decision 保留+门冻结）——重试恢复可用', async () => {
    init()
    stubApi.recovery.peek.mockResolvedValue({
      ok: true,
      data: { slots: { 'lineage-session': { status: 'available', epoch: 0, file: { token: 'tok-w5', writtenAt: '', lastWriterSession: '', actionCount: 0, draftPresent: false } } } }
    })
    await enterWorkspaceRecovery()
    stubApi.recovery.read.mockResolvedValue({ ok: true, data: { status: 'found', payload: payload('w5') } })
    stubApi.recovery.save.mockResolvedValue({
      ok: true,
      data: { status: 'pending', epoch: 0, file: { token: 'tok-other', writtenAt: '', lastWriterSession: '', actionCount: 0, draftPresent: false } }
    })
    await restoreRecoverySlot()
    expect(getRecoveryState().phase).toBe('await-decision') // 条保留（主控批补充）
    expect(getRecoveryState().busy).toBe(false)
    expect(recoveryBlocked()).toBe(true)
    expect(discardedLoads).toBe(0) // 未放弃——不弃载入态
    // 重试恢复可用（read/save 桩复原）
    stubApi.recovery.save.mockResolvedValue(saved('tok-w5-ok'))
    await restoreRecoverySlot()
    expect(getRecoveryState().phase).toBe('open')
    expect(restored).toEqual(payload('w5'))
  })

  it('W5 放弃分支：release 后 discardLoadedSession 清恢复态（仅恢复流程内——defer 后不再清）', async () => {
    init()
    stubApi.recovery.peek.mockResolvedValue({
      ok: true,
      data: { slots: { 'lineage-session': { status: 'available', epoch: 0, file: { token: 'tok-w5b', writtenAt: '', lastWriterSession: '', actionCount: 0, draftPresent: false } } } }
    })
    stubApi.recovery.read.mockResolvedValue({ ok: true, data: { status: 'found', payload: payload('w5b') } })
    stubApi.recovery.save.mockResolvedValue({
      ok: true,
      data: { status: 'pending', epoch: 0, file: { token: 'tok-x', writtenAt: '', lastWriterSession: '', actionCount: 0, draftPresent: false } }
    })
    await enterWorkspaceRecovery()
    await restoreRecoverySlot() // takeOver 未成——条保留+已载入
    expect(discardedLoads).toBe(0)
    stubApi.recovery.save.mockClear()
    stubApi.recovery.release.mockResolvedValue({ ok: true, data: { status: 'released', epoch: 1 } })
    await discardRecoverySlot()
    expect(discardedLoads).toBe(1) // 清 store 恢复态——再保存不复活已弃会话
    expect(getRecoveryState().phase).toBe('open')
    // defer 后放弃：不再清（编辑期开始——用户新写不属于恢复态）
    stubApi.recovery.peek.mockResolvedValue({
      ok: true,
      data: { slots: { 'lineage-session': { status: 'available', epoch: 1, file: { token: 'tok-w5c', writtenAt: '', lastWriterSession: '', actionCount: 0, draftPresent: false } } } }
    })
    await enterWorkspaceRecovery()
    stubApi.recovery.read.mockResolvedValue({ ok: true, data: { status: 'found', payload: payload('w5c') } })
    stubApi.recovery.save.mockResolvedValue(saved('tok-w5c-ok'))
    await restoreRecoverySlot()
    deferRecoverySlot() // 稍后处理——进入编辑期（restoredLoaded 作废）
    const { reopenRecoveryBar: reopen } = await import('../../../src/renderer/features/lineage/recoveryScheduler')
    reopen() // 重开条（非空档恢复——defer 后场景）
    await discardRecoverySlot()
    expect(discardedLoads).toBe(1) // defer 后未再清
  })

  it('W10 ws 切回：副本在场→再 enterWorkspace 仍 await-decision（与 R3 释放序耦合面）', async () => {
    init()
    const avail = {
      ok: true,
      data: { slots: { 'lineage-session': { status: 'available', epoch: 0, file: { token: 'tok-back', writtenAt: '', lastWriterSession: 'old', actionCount: 1, draftPresent: false } } } }
    }
    stubApi.recovery.peek.mockResolvedValue(avail)
    await enterWorkspaceRecovery()
    expect(getRecoveryState().phase).toBe('await-decision')
    // 未决策离开（无 release——切走路径 R3 已释场景之外）再切回：条再现
    await enterWorkspaceRecovery()
    expect(getRecoveryState().phase).toBe('await-decision')
    expect(getRecoveryState().file?.token).toBe('tok-back')
    expect(recoveryBlocked()).toBe(true)
  })
})

describe('F-VISFB-65 回炉轮2 Z6/Z7 —— degraded 清除与查看重 peek', () => {
  it('Z6 peek 失败置 degraded 后成功进入即清除（一次失败不常驻 chip）', async () => {
    init()
    stubApi.recovery.peek.mockResolvedValueOnce({ ok: false, error: { code: 'IO_ERROR', message: 'x' } })
    await enterWorkspaceRecovery()
    expect(getRecoveryState().degraded).toBe(true)
    stubApi.recovery.peek.mockResolvedValue({
      ok: true,
      data: { slots: { 'lineage-session': { status: 'empty', epoch: 0 } } }
    })
    await enterWorkspaceRecovery()
    expect(getRecoveryState().degraded).toBe(false) // 成功 entry 清除
  })

  it('Z7 slotKind=null 的 pendingChip「查看」触发重新 peek：空槽→chip 清；有槽→确认条再现', async () => {
    init()
    // fail-open 开门后 save 撞 pending → chip（slotKind=null 形态）
    stubApi.recovery.peek.mockResolvedValue({ ok: true, data: { slots: { 'lineage-session': { status: 'empty', epoch: 0 } } } })
    await enterWorkspaceRecovery()
    stubApi.recovery.save.mockResolvedValue({
      ok: true,
      data: { status: 'pending', epoch: 0, file: { token: 't', writtenAt: 'w', lastWriterSession: 's', actionCount: 0, draftPresent: false } }
    })
    current = payload('x')
    notifyRecoverySaveNow()
    await vi.advanceTimersByTimeAsync(0)
    expect(getRecoveryState().pendingChip).toBe(true)
    expect(getRecoveryState().slotKind).toBeNull()
    // 查看：空槽 → 重新 peek → chip 清+开门保持
    stubApi.recovery.peek.mockClear()
    const { reopenRecoveryBar } = await import('../../../src/renderer/features/lineage/recoveryScheduler')
    reopenRecoveryBar()
    await vi.advanceTimersByTimeAsync(0)
    expect(stubApi.recovery.peek).toHaveBeenCalledTimes(1) // 重新 peek（死按钮修复）
    expect(getRecoveryState().pendingChip).toBe(false)
    // 有槽 → 确认条再现（frozen）
    stubApi.recovery.save.mockResolvedValue({
      ok: true,
      data: { status: 'pending', epoch: 0, file: { token: 't2', writtenAt: 'w', lastWriterSession: 's', actionCount: 1, draftPresent: false } }
    })
    current = payload('y')
    notifyRecoverySaveNow()
    await vi.advanceTimersByTimeAsync(0)
    expect(getRecoveryState().pendingChip).toBe(true)
    stubApi.recovery.peek.mockResolvedValue({
      ok: true,
      data: { slots: { 'lineage-session': { status: 'available', epoch: 0, file: { token: 't2', writtenAt: 'w', lastWriterSession: 's', actionCount: 1, draftPresent: false } } } }
    })
    reopenRecoveryBar()
    await vi.advanceTimersByTimeAsync(0)
    expect(getRecoveryState().phase).toBe('await-decision') // 确认条再现
    expect(recoveryBlocked()).toBe(true)
  })
})

describe('d1-N2 切换 drain 封顶（主控亲笔）', () => {
  it('在途 save 永不 settle：prepare 1500ms 内 resolve（切换不永久 busy）', async () => {
    init()
    await enterWorkspaceRecovery() // peek 空（beforeEach 桩）→开门
    stubApi.recovery.save.mockReturnValue(new Promise(() => undefined) as never) // 挂起不回
    current = payload('hang')
    notifyRecoveryEditUnit()
    await vi.advanceTimersByTimeAsync(300) // trailing 起飞 → flight 挂起
    const { prepareRecoveryWorkspaceSwitch } = await import(
      '../../../src/renderer/features/lineage/recoveryScheduler'
    )
    const p = prepareRecoveryWorkspaceSwitch()
    let resolved = false
    void p.then(() => {
      resolved = true
    })
    await vi.advanceTimersByTimeAsync(1500)
    await Promise.resolve()
    await Promise.resolve()
    expect(resolved).toBe(true) // 无 race 封顶=永不 resolve（红）
  })
})

// ── F-RECOV-01（锚族总表 S1-S12b——设计 v2 §4/§5+终裁 r3；always-active）──

const hangOnce = (): { p: Promise<unknown>; resolve(v: unknown): void } => {
  let r!: (v: unknown) => void
  const p = new Promise((res) => {
    r = res
  })
  return { p, resolve: r }
}

const errRes = () => ({ ok: false, error: { code: 'IO_ERROR', message: 'x' } })

const availPeek = (token: string) => ({
  ok: true,
  data: {
    slots: {
      'lineage-session': {
        status: 'available',
        epoch: 0,
        file: { token, writtenAt: 'w', lastWriterSession: 'old', actionCount: 1, draftPresent: false }
      }
    }
  }
})

describe('F-RECOV-01 看门狗双阈值与 ghost 对账（S1/S2/S2b/S3/S3b/S7/S8）', () => {
  it('S1 slow→stuck→探针成功清：10s 呈现缓慢、60s 弃置待确认、探针自愈清（红线①永不取消）', async () => {
    init()
    await enterWorkspaceRecovery() // 探针臂条件含 gate=open——先经 peek 空桩开门（装配即冻结）
    const h = hangOnce()
    stubApi.recovery.save.mockReturnValueOnce(h.p as never)
    stubApi.recovery.save.mockResolvedValue(saved('tok-probe'))
    current = payload('s1')
    notifyRecoverySaveNow()
    await vi.advanceTimersByTimeAsync(9999)
    expect(getRecoveryState().kind).toBeNull() // 未到 T_slow 零呈现
    await vi.advanceTimersByTimeAsync(1) // t=10000：T_slow
    expect(getRecoveryState().degraded).toBe(true)
    expect(getRecoveryState().kind).toBe('slow')
    await vi.advanceTimersByTimeAsync(50000) // t=60000：T_stuck 逻辑弃置
    expect(getRecoveryState().kind).toBe('stuck-pending')
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(1) // 弃置≠取消（不重发旧 op）
    await vi.advanceTimersByTimeAsync(5000) // t=65000：探针首间隔 5s
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(2) // 探针实发（无编辑触发）
    expect(getRecoveryState().degraded).toBe(false) // 探针成功→清（五行表②）
    expect(getRecoveryState().kind).toBeNull()
  })

  it('S2 ghost 迟到成功·gen 符·无在途：记账+清+滞留快照补发（release 用 ghost token）', async () => {
    init()
    const h = hangOnce()
    stubApi.recovery.save.mockReturnValueOnce(h.p as never)
    stubApi.recovery.save.mockResolvedValueOnce(errRes()) // 补发=reject（failStreak=1 不升）
    current = payload('s2')
    notifyRecoverySaveNow()
    await vi.advanceTimersByTimeAsync(60000) // stuck
    h.resolve(saved('tok-ghost'))
    await vi.advanceTimersByTimeAsync(0)
    expect(getRecoveryState().degraded).toBe(false) // ghost③：清
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(2) // 滞留快照经 pump 补发
    markRecoveryClean('clean')
    await awaitRecoveryQuitSettled()
    expect(stubApi.recovery.release).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'tok-ghost', reason: 'clean' }) // 物理账本记账面（补发 reject 无 token）
    )
  })

  it('S2b 弃置→新在途→ghost 成功仅记账（不清）→新在途成功→清（B3）', async () => {
    init()
    const ghost = hangOnce()
    const second = hangOnce()
    stubApi.recovery.save.mockReturnValueOnce(ghost.p as never)
    stubApi.recovery.save.mockReturnValueOnce(second.p as never)
    current = payload('s2b-1')
    notifyRecoverySaveNow()
    await vi.advanceTimersByTimeAsync(60000) // stuck（ghost=在途弃置）
    current = payload('s2b-2')
    notifyRecoverySaveNow() // 弃置后新 dispatch 立即可行
    await vi.advanceTimersByTimeAsync(0)
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(2)
    ghost.resolve(saved('tok-g1'))
    await vi.advanceTimersByTimeAsync(0)
    expect(getRecoveryState().degraded).toBe(true) // ④ 有新在途=仅记账（不清）
    expect(getRecoveryState().kind).toBe('stuck-pending')
    second.resolve(saved('tok-g2'))
    await vi.advanceTimersByTimeAsync(0)
    expect(getRecoveryState().degraded).toBe(false) // 新在途成功→清（五行表①）
  })

  it('S3 gen++→ghost 成功仅记账：不复活 chip；token 入物理账本（后续 clean 收口取用）', async () => {
    init()
    const h = hangOnce()
    stubApi.recovery.save.mockReturnValueOnce(h.p as never)
    current = payload('s3')
    notifyRecoverySaveNow()
    await vi.advanceTimersByTimeAsync(60000) // stuck
    markRecoveryClean('clean') // gen++（此刻无已记账 token→零 release）
    await awaitRecoveryQuitSettled()
    expect(stubApi.recovery.release).not.toHaveBeenCalled()
    h.resolve(saved('tok-s3'))
    await vi.advanceTimersByTimeAsync(0)
    expect(getRecoveryState().degraded).toBe(false) // 仅记账——无 chip 复活
    markRecoveryClean('clean')
    await awaitRecoveryQuitSettled()
    expect(stubApi.recovery.release).toHaveBeenCalledWith(expect.objectContaining({ token: 'tok-s3' }))
  })

  it('S3b gen++→release(旧 token)→ghost 迟到成功→槽留驻非空（启动屏障承接：peek=available 呈确认条）', async () => {
    init()
    stubApi.recovery.save.mockResolvedValueOnce(saved('tok-warm'))
    current = payload('s3b-w')
    notifyRecoverySaveNow()
    await vi.advanceTimersByTimeAsync(0) // 热身写落 token=tok-warm
    const h = hangOnce()
    stubApi.recovery.save.mockReturnValueOnce(h.p as never)
    current = payload('s3b-2')
    notifyRecoverySaveNow()
    await vi.advanceTimersByTimeAsync(60000) // stuck→占位解除
    markRecoveryClean('clean') // drain 已空→release 取物理账本现值（旧 token）
    await awaitRecoveryQuitSettled()
    expect(stubApi.recovery.release).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'tok-warm', reason: 'clean' }) // W7：release 取 renderer 发起时账本现值
    )
    h.resolve(saved('tok-late')) // ghost 迟到成功→盘上留驻（INV-167 无害族）
    await vi.advanceTimersByTimeAsync(0)
    stubApi.recovery.peek.mockResolvedValue(availPeek('tok-late'))
    await enterWorkspaceRecovery() // 合成启动屏障
    expect(getRecoveryState().phase).toBe('await-decision') // 槽留驻非空→确认条承接
  })

  it('S7 slow→成功清：在途 settle 即归 ok（chip 随清、零退避零重发）', async () => {
    init()
    const h = hangOnce()
    stubApi.recovery.save.mockReturnValueOnce(h.p as never)
    current = payload('s7')
    notifyRecoverySaveNow()
    await vi.advanceTimersByTimeAsync(10000)
    expect(getRecoveryState().kind).toBe('slow')
    h.resolve(saved('tok-s7'))
    await vi.advanceTimersByTimeAsync(0)
    expect(getRecoveryState().degraded).toBe(false)
    expect(getRecoveryState().kind).toBeNull()
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(1)
  })

  it('S8 成功清+snapshot null：ghost③ 零补发自然空转；探针到点查 null 即刻清（W6① 禁假告警）', async () => {
    init()
    await enterWorkspaceRecovery() // 探针臂条件含 gate=open——先经 peek 空桩开门（装配即冻结）
    const h = hangOnce()
    stubApi.recovery.save.mockReturnValueOnce(h.p as never)
    current = payload('s8a')
    notifyRecoverySaveNow()
    await vi.advanceTimersByTimeAsync(60000) // stuck
    current = null // 会话 clean（快照空）
    h.resolve(saved('tok-s8'))
    await vi.advanceTimersByTimeAsync(0)
    expect(getRecoveryState().degraded).toBe(false)
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(1) // 零补发（空转仅清）
    // W6① 探针到点面
    const h2 = hangOnce()
    stubApi.recovery.save.mockReturnValueOnce(h2.p as never)
    current = payload('s8b')
    notifyRecoverySaveNow()
    await vi.advanceTimersByTimeAsync(60000) // stuck→探针臂起（5s）
    expect(getRecoveryState().degraded).toBe(true)
    current = null
    await vi.advanceTimersByTimeAsync(5000) // 探针到点查 snapshot=null
    expect(getRecoveryState().degraded).toBe(false) // 即刻清（无待保护数据=禁假告警）
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(2) // 探针不实发
  })
})

describe('F-RECOV-01 溢出/退避矩阵与探针间隔（S4/S5/S6）', () => {
  it('S4 溢出→退避→unavailable→探针成功清：queue-overflow 同 reject 退避路径+自愈环', async () => {
    init()
    await enterWorkspaceRecovery() // 探针臂条件含 gate=open——先经 peek 空桩开门（装配即冻结）
    stubApi.recovery.save.mockResolvedValue({ ok: true, data: { status: 'queue-overflow', epoch: 0 } })
    current = payload('s4')
    notifyRecoveryEditUnit()
    await vi.advanceTimersByTimeAsync(300) // 首发=溢出拒
    await vi.advanceTimersByTimeAsync(1000)
    await vi.advanceTimersByTimeAsync(2000)
    await vi.advanceTimersByTimeAsync(4000)
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(4) // 首发+3 退避
    expect(getRecoveryState().degraded).toBe(true)
    expect(getRecoveryState().kind).toBe('unavailable')
    expect(getRecoveryState().restartHint).toBe(false) // 探针账本零污染
    stubApi.recovery.save.mockResolvedValue(saved('tok-s4'))
    await vi.advanceTimersByTimeAsync(5000) // 退避终点臂探针（5s 首间隔）
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(5) // 探针实发
    expect(getRecoveryState().degraded).toBe(false) // 探针成功清
  })

  it('S5 初次+1/2/4s 三次重试共 4 次 reject 后升 unavailable（kind 断言——N1 措辞）', async () => {
    init()
    stubApi.recovery.save.mockResolvedValue(errRes())
    current = payload('s5')
    notifyRecoveryEditUnit()
    await vi.advanceTimersByTimeAsync(300)
    await vi.advanceTimersByTimeAsync(1000)
    await vi.advanceTimersByTimeAsync(2000)
    await vi.advanceTimersByTimeAsync(4000)
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(4)
    expect(getRecoveryState().kind).toBe('unavailable')
    expect(getRecoveryState().restartHint).toBe(false)
  })

  it('S6 探针连败间隔序列 5/15/30s+probeFailStreak≥3 加缀「重启应用可恢复」', async () => {
    init()
    await enterWorkspaceRecovery() // 探针臂条件含 gate=open——先经 peek 空桩开门（装配即冻结）
    const h = hangOnce()
    stubApi.recovery.save.mockReturnValueOnce(h.p as never) // 编辑飞行永挂
    stubApi.recovery.save.mockResolvedValue(errRes()) // 探针全部 reject
    current = payload('s6')
    notifyRecoverySaveNow()
    await vi.advanceTimersByTimeAsync(60000) // stuck→探针臂起（streak=0→5s）
    await vi.advanceTimersByTimeAsync(4999)
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1) // 探针#1（5s）
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(2)
    expect(getRecoveryState().kind).toBe('unavailable') // 探针 reject=失败观测即升档
    expect(getRecoveryState().restartHint).toBe(false)
    await vi.advanceTimersByTimeAsync(14999) // streak=1→15s
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1) // 探针#2
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(3)
    expect(getRecoveryState().restartHint).toBe(false)
    await vi.advanceTimersByTimeAsync(29999) // streak=2→30s
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(3)
    await vi.advanceTimersByTimeAsync(1) // 探针#3→streak=3
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(4)
    expect(getRecoveryState().kind).toBe('unavailable')
    expect(getRecoveryState().restartHint).toBe(true) // W8 终态加缀
  })
})

describe('F-RECOV-01 frozen 停臂/开门重臂与探针互斥（S9/S10/S11a-c/S12）', () => {
  it('S9 frozen 停臂+gen++ 在途探针判废：确认条停留期 chip 保留、零新请求、迟到成功仅记账', async () => {
    init()
    await enterWorkspaceRecovery() // 探针臂条件含 gate=open——先经 peek 空桩开门（装配即冻结）
    const edit = hangOnce()
    const probe = hangOnce()
    stubApi.recovery.save.mockReturnValueOnce(edit.p as never)
    stubApi.recovery.save.mockReturnValueOnce(probe.p as never)
    current = payload('s9')
    notifyRecoverySaveNow()
    await vi.advanceTimersByTimeAsync(60000) // stuck（probeFailStreak=0）
    await vi.advanceTimersByTimeAsync(5000) // 探针实发（在途=isProbe）
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(2)
    stubApi.recovery.peek.mockResolvedValue(availPeek('tok-slot'))
    await enterWorkspaceRecovery() // frozen：bumpGen（保留面）+探针循环杀
    expect(getRecoveryState().phase).toBe('await-decision')
    expect(getRecoveryState().degraded).toBe(true) // W5①：frozen 不清 degraded
    await vi.advanceTimersByTimeAsync(60000) // frozen 期间——停臂零新请求
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(2)
    probe.resolve(saved('tok-s9')) // gen++ 后迟到成功→仅记账
    await vi.advanceTimersByTimeAsync(0)
    expect(getRecoveryState().degraded).toBe(true) // 判废不清
    markRecoveryClean('clean')
    await awaitRecoveryQuitSettled()
    expect(stubApi.recovery.release).toHaveBeenCalledWith(expect.objectContaining({ token: 'tok-s9' }))
  })

  it('S10 open 后条件重臂（W6②）：defer 开门→探针不等编辑即臂；snapshot null→即刻清', async () => {
    init()
    await enterWorkspaceRecovery() // 探针臂条件含 gate=open——先经 peek 空桩开门（装配即冻结）
    const h = hangOnce()
    stubApi.recovery.save.mockReturnValueOnce(h.p as never)
    stubApi.recovery.save.mockResolvedValue(saved('tok-s10'))
    current = payload('s10')
    notifyRecoverySaveNow()
    await vi.advanceTimersByTimeAsync(60000) // stuck
    stubApi.recovery.peek.mockResolvedValue(availPeek('tok-d'))
    await enterWorkspaceRecovery() // 确认条（degraded 保留——W5①）
    deferRecoverySlot() // 决策开门→onGateReopened→立即臂探针
    expect(getRecoveryState().pendingChip).toBe(true)
    await vi.advanceTimersByTimeAsync(4999)
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(1) // 不等编辑
    await vi.advanceTimersByTimeAsync(1)
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(2) // 探针实发（零 notify）
    expect(getRecoveryState().degraded).toBe(false) // 成功自愈
    // snapshot null 变体：开门即 W6① 即刻清
    const h2 = hangOnce()
    stubApi.recovery.save.mockReturnValueOnce(h2.p as never)
    current = payload('s10b')
    notifyRecoverySaveNow()
    await vi.advanceTimersByTimeAsync(60000)
    stubApi.recovery.peek.mockResolvedValue(availPeek('tok-d2'))
    await enterWorkspaceRecovery()
    current = null
    deferRecoverySlot()
    expect(getRecoveryState().degraded).toBe(false) // 快照空→即刻清
    await vi.advanceTimersByTimeAsync(10000)
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(3) // 零探针实发（3=(a)挂起+(a)探针+(b)挂起）
  })

  it('S11a ghost 编辑 reject 零簿记：chip/streak 不动（后续单败仍走 1s 首退避）', async () => {
    init()
    const h = hangOnce()
    stubApi.recovery.save.mockReturnValueOnce(h.p as never)
    current = payload('s11a')
    notifyRecoverySaveNow()
    await vi.advanceTimersByTimeAsync(60000) // stuck
    h.resolve(errRes()) // ghost 编辑 reject——W2 零簿记
    await vi.advanceTimersByTimeAsync(0)
    expect(getRecoveryState().degraded).toBe(true)
    expect(getRecoveryState().kind).toBe('stuck-pending') // 不动
    stubApi.recovery.save.mockResolvedValue(errRes())
    current = payload('s11a-2')
    notifyRecoveryEditUnit()
    await vi.advanceTimersByTimeAsync(300) // 新编辑败——failStreak 应为 1（首退避 1s）
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(999)
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1)
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(3) // 1s 到点重发（若 ghost 误计则 2s——红）
  })

  it('S11b/S11c 探针 hung 弃置与 ghost reject 计 probeFailStreak——W8 主路径 ×3→unavailable+重启缀', async () => {
    init()
    await enterWorkspaceRecovery() // 探针臂条件含 gate=open——先经 peek 空桩开门（装配即冻结）
    const edit = hangOnce()
    const probe1 = hangOnce()
    const probe2 = hangOnce()
    stubApi.recovery.save.mockReturnValueOnce(edit.p as never)
    stubApi.recovery.save.mockReturnValueOnce(probe1.p as never)
    stubApi.recovery.save.mockReturnValueOnce(probe2.p as never)
    current = payload('s11')
    notifyRecoverySaveNow()
    await vi.advanceTimersByTimeAsync(60000) // 编辑 stuck（探针臂 5s）
    await vi.advanceTimersByTimeAsync(5000) // 探针#1 实发（挂起）
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(60000) // t=125000：探针#1 T_stuck 弃置（S11c：hung=失败观测 streak=1）→15s 臂
    expect(getRecoveryState().kind).toBe('stuck-pending') // streak=1<3 维持重试确认档
    probe1.resolve(errRes()) // S11b：探针 ghost reject→streak=2（chip 不动——W4 行2）
    await vi.advanceTimersByTimeAsync(0)
    expect(getRecoveryState().kind).toBe('stuck-pending')
    await vi.advanceTimersByTimeAsync(14999) // t=139999
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1) // t=140000：ghost 出界后到点→探针#2 实发（挂起）
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(3)
    await vi.advanceTimersByTimeAsync(60000) // t=200000：探针#2 T_stuck 弃置→streak=3
    expect(getRecoveryState().kind).toBe('unavailable') // W8：×3 升档
    expect(getRecoveryState().restartHint).toBe(true) // 「重启应用可恢复」加缀
  })

  it('S12a/S12b 在途期探针到点=跳过零请求；编辑 dispatch 记账不混入探针账本（退避重发在）', async () => {
    init()
    await enterWorkspaceRecovery() // 探针臂条件含 gate=open——先经 peek 空桩开门（装配即冻结）
    const first = hangOnce()
    const edit2 = hangOnce()
    stubApi.recovery.save.mockReturnValueOnce(first.p as never)
    stubApi.recovery.save.mockReturnValueOnce(edit2.p as never)
    current = payload('s12')
    notifyRecoverySaveNow()
    await vi.advanceTimersByTimeAsync(60000) // stuck（探针臂 5s）
    current = payload('s12-2')
    notifyRecoveryEditUnit()
    await vi.advanceTimersByTimeAsync(300) // 新编辑在途（t=60300）
    await vi.advanceTimersByTimeAsync(4700) // t=65000：探针到点——在途跳过
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(2) // S12a 零新请求
    await vi.advanceTimersByTimeAsync(5000) // t=70000：下一间隔仍在途——再跳过
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(2)
    edit2.resolve(errRes()) // 编辑败——failStreak=1（S12b：未混入探针账本）
    await vi.advanceTimersByTimeAsync(0)
    expect(getRecoveryState().kind).toBe('stuck-pending') // 若误标探针则 unavailable（红）
    await vi.advanceTimersByTimeAsync(1000) // 编辑首退避 1s 到点重发
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(3) // 若误标探针则无重发（红）
  })
})

describe('F-RECOV-01 回炉轮1 —— gen++ 在途接缝/ghost 续体尾段/探针 ghost 界（R1-R5）', () => {
  it('S13a 在途未弃置（<60s）时 enter：bumpGen 同步弃置→旧 flight 转 ghost（inFlight 清）→新编辑立即可保存', async () => {
    init()
    await enterWorkspaceRecovery()
    const h = hangOnce()
    stubApi.recovery.save.mockReturnValueOnce(h.p as never)
    stubApi.recovery.save.mockResolvedValue(saved('tok-s13a'))
    current = payload('s13a-1')
    notifyRecoverySaveNow()
    await vi.advanceTimersByTimeAsync(1000) // flight1 在途未弃置
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(1)
    await enterWorkspaceRecovery() // bumpGenPreserve→R1 同步弃置 flight1（peek 空→open）
    current = payload('s13a-2')
    notifyRecoverySaveNow() // 单飞不再永占→立即发
    await vi.advanceTimersByTimeAsync(0)
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(2) // 无 R1=旧 flight 永占（红）
    h.resolve(saved('tok-ghost13a')) // ghost 迟到成功→gen 不符仅记账（零副作用）
    await vi.advanceTimersByTimeAsync(0)
    expect(getRecoveryState().degraded).toBe(false)
  })

  it('S13b 同形走 clean 收口：bumpGenFullReset 同步弃置→drain 不再永等（quitSettled 即刻完成+release 取 warm token）', async () => {
    init()
    await enterWorkspaceRecovery()
    stubApi.recovery.save.mockResolvedValueOnce(saved('tok-w'))
    current = payload('s13b-w')
    notifyRecoverySaveNow()
    await vi.advanceTimersByTimeAsync(0) // warm write 落 token
    const h = hangOnce()
    stubApi.recovery.save.mockReturnValueOnce(h.p as never)
    current = payload('s13b-2')
    notifyRecoverySaveNow()
    await vi.advanceTimersByTimeAsync(1000) // flight2 在途未弃置
    markRecoveryClean('clean') // bumpGenFullReset→R1 弃置→drain 有界封顶
    let settled = false
    void awaitRecoveryQuitSettled().then(() => {
      settled = true
    })
    await vi.advanceTimersByTimeAsync(0)
    expect(settled).toBe(false) // 永挂 flight：1500ms 界内未收束（无界=此处已真——界外永挂为红）
    await vi.advanceTimersByTimeAsync(1500)
    expect(settled).toBe(true) // 界到收口（无 R1 bounded=drain await 永挂——红）
    expect(stubApi.recovery.release).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'tok-w', reason: 'clean' })
    )
  })

  it('S9b 探针在途→gen++（clean）→探针 ghost reject→probeFailStreak 保持 0（下一探针间隔仍 5s）', async () => {
    init()
    await enterWorkspaceRecovery()
    const edit = hangOnce()
    const probe = hangOnce()
    const third = hangOnce()
    stubApi.recovery.save.mockReturnValueOnce(edit.p as never)
    stubApi.recovery.save.mockReturnValueOnce(probe.p as never)
    stubApi.recovery.save.mockReturnValueOnce(third.p as never)
    current = payload('s9b')
    notifyRecoverySaveNow()
    await vi.advanceTimersByTimeAsync(60000) // 编辑弃置→探针臂（5s）
    await vi.advanceTimersByTimeAsync(5000) // 探针 flight 在途（挂起）
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(2)
    markRecoveryClean('clean') // bumpGenFullReset：弃置探针（streak 计后随全量复位清零）
    await vi.advanceTimersByTimeAsync(0)
    probe.resolve(errRes()) // ghost reject：gen 不符→R2 守卫零簿记（streak 保持 0）
    await vi.advanceTimersByTimeAsync(0)
    current = payload('s9b-3')
    notifyRecoverySaveNow()
    await vi.advanceTimersByTimeAsync(60000) // 再弃置→探针臂 probeDelayMs(streak)
    await vi.advanceTimersByTimeAsync(4999)
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(3)
    await vi.advanceTimersByTimeAsync(1)
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(4) // 5s 实发=streak 0（R2 缺失则 15s——红）
  })

  it('S2c ghost 续体不吞新在途标记：ghost settle 期间新在途置 immediate→新在途 settle 后按 immediate 补发', async () => {
    init()
    await enterWorkspaceRecovery()
    const g = hangOnce()
    const f2 = hangOnce()
    stubApi.recovery.save.mockReturnValueOnce(g.p as never)
    stubApi.recovery.save.mockReturnValueOnce(f2.p as never)
    stubApi.recovery.save.mockResolvedValue(saved('tok-f3'))
    current = payload('s2c-1')
    notifyRecoverySaveNow()
    await vi.advanceTimersByTimeAsync(60000) // flight1 弃置（ghost 在途）
    current = payload('s2c-2')
    notifyRecoverySaveNow() // flight2 发（挂起）
    await vi.advanceTimersByTimeAsync(0)
    notifyRecoverySaveNow() // flight2 在途→置 needsResend+immediateResend
    g.resolve(saved('tok-ghost2c')) // ghost settle——R4：续体不消费新在途标记
    await vi.advanceTimersByTimeAsync(0)
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(2)
    f2.resolve(saved('tok-f2')) // flight2 settle→尾段按 immediate 补发 flight3
    await vi.advanceTimersByTimeAsync(0)
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(3) // 无 R4=标记被吞无补发（红）
  })

  it('S14 探针 ghost 在界未 settle：到点计数不实发（界=1 不破；settle 出界后到点恢复实发）', async () => {
    init()
    await enterWorkspaceRecovery() // 探针臂条件含 gate=open——先经 peek 空桩开门（装配即冻结）
    const edit = hangOnce()
    const probe1 = hangOnce()
    stubApi.recovery.save.mockReturnValueOnce(edit.p as never)
    stubApi.recovery.save.mockReturnValueOnce(probe1.p as never)
    current = payload('s14')
    notifyRecoverySaveNow()
    await vi.advanceTimersByTimeAsync(60000) // 编辑弃置→探针臂 5s
    await vi.advanceTimersByTimeAsync(5000) // 探针#1 实发挂起
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(60000) // t=125000：探针#1 T_stuck 弃置（streak=1）→15s 臂
    await vi.advanceTimersByTimeAsync(14999) // t=139999
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1) // t=140000 到点——ghost 未 settle→F1 计数（streak=2）→30s 臂（零实发）
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(2) // S14 锚
    probe1.resolve(errRes()) // ghost reject（gen 符）→streak=3（R3 reject 计）
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(29999) // t=169999
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1) // t=170000——ghost 出界后到点实发
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(3)
  })
})

describe('F-RECOV-01 回炉轮2 —— 探针 ghost 安息计数/settle 幻影/负向锚（F1/F2/F8）', () => {
  it('S16a 永挂探针 ghost：弃置+到点计数 0→1→2→3→unavailable+重启缀（W8 主路径闭合——全程零实发新请求）', async () => {
    init()
    await enterWorkspaceRecovery() // 探针臂条件含 gate=open——先经 peek 空桩开门（装配即冻结）
    const edit = hangOnce()
    const probe1 = hangOnce()
    stubApi.recovery.save.mockReturnValueOnce(edit.p as never)
    stubApi.recovery.save.mockReturnValueOnce(probe1.p as never)
    current = payload('s16a')
    notifyRecoverySaveNow()
    await vi.advanceTimersByTimeAsync(60000) // 编辑弃置→探针臂 5s
    await vi.advanceTimersByTimeAsync(5000) // 探针实发（永挂）
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(60000) // t=125000：探针弃置（streak=1）→armIfEligible 覆盖同刻到点（15s 臂）
    expect(getRecoveryState().kind).toBe('stuck-pending') // streak=1<3
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(2) // 零实发（界=1 不破）
    await vi.advanceTimersByTimeAsync(15000) // t=140000：到点核查 ghost 安息→F1 计数（streak=2）→臂 30s
    expect(getRecoveryState().kind).toBe('stuck-pending') // streak=2<3
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(30000) // t=170000：到点 F1 计数（streak=3）
    expect(getRecoveryState().kind).toBe('unavailable') // W8：×3 升档
    expect(getRecoveryState().restartHint).toBe(true) // 「重启应用可恢复」缀可达
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(2) // 全程零实发
  })

  it('S16b 探针 ghost settle 后到点恢复实发（ghost 出界→下一到点走实发路径）', async () => {
    init()
    await enterWorkspaceRecovery() // 探针臂条件含 gate=open——先经 peek 空桩开门（装配即冻结）
    const edit = hangOnce()
    const probe1 = hangOnce()
    stubApi.recovery.save.mockReturnValueOnce(edit.p as never)
    stubApi.recovery.save.mockReturnValueOnce(probe1.p as never)
    stubApi.recovery.save.mockResolvedValue(saved('tok-s16b'))
    current = payload('s16b')
    notifyRecoverySaveNow()
    await vi.advanceTimersByTimeAsync(60000) // 编辑弃置→臂 5s
    await vi.advanceTimersByTimeAsync(5000) // 探针实发（永挂）
    await vi.advanceTimersByTimeAsync(60000) // t=125000：探针弃置 streak=1→15s 臂
    probe1.resolve(errRes()) // ghost settle 出界（reject 计 streak=2）
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(14999) // t=139999
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1) // t=140000：到点——ghost 已出界→恢复实发
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(3)
    expect(getRecoveryState().degraded).toBe(false) // 探针成功自愈
  })

  it('S15 探针成功 settle→enter（preserve）→probeFailStreak 保持 0（幻影弃置不计数——后续探针臂仍 5s）', async () => {
    init()
    await enterWorkspaceRecovery() // 探针臂条件含 gate=open——先经 peek 空桩开门（装配即冻结）
    const edit = hangOnce()
    stubApi.recovery.save.mockReturnValueOnce(edit.p as never)
    stubApi.recovery.save.mockResolvedValue(saved('tok-p1')) // 探针成功
    current = payload('s15')
    notifyRecoverySaveNow()
    await vi.advanceTimersByTimeAsync(60000) // 编辑弃置→臂 5s
    await vi.advanceTimersByTimeAsync(5000) // 探针实发→settle 成功→清 degraded
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(2)
    await enterWorkspaceRecovery() // bumpGenPreserve（peek 空→open）——幻影形（F2 前）会把已 settle 探针判 abandoned→streak=1
    const edit2 = hangOnce()
    stubApi.recovery.save.mockReturnValueOnce(edit2.p as never)
    stubApi.recovery.save.mockResolvedValue(saved('tok-p2'))
    current = payload('s15-2')
    notifyRecoverySaveNow()
    await vi.advanceTimersByTimeAsync(60000) // 弃置→armIfEligible→臂 probeDelayMs(streak)
    await vi.advanceTimersByTimeAsync(4999)
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(3)
    await vi.advanceTimersByTimeAsync(1)
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(4) // 5s 实发=streak 0（幻影则 15s——红）
  })

  it('R1-preserve 跨代形：探针 frozen 弃置计数后 stale settle 不增计（开门臂长辨析——gen++ 清界口径行为锁，非同代负锚）', async () => {
    init()
    await enterWorkspaceRecovery() // 探针臂条件含 gate=open——先经 peek 空桩开门（装配即冻结）
    const edit = hangOnce()
    const probe1 = hangOnce()
    stubApi.recovery.save.mockReturnValueOnce(edit.p as never)
    stubApi.recovery.save.mockReturnValueOnce(probe1.p as never)
    stubApi.recovery.save.mockResolvedValue(saved('tok-f8'))
    current = payload('f8')
    notifyRecoverySaveNow()
    await vi.advanceTimersByTimeAsync(60000) // 编辑弃置→臂 5s
    await vi.advanceTimersByTimeAsync(5000) // 探针实发（挂）
    await vi.advanceTimersByTimeAsync(5000) // t=70000：到点 in-flight 跳过（续臂 5s）
    stubApi.recovery.peek.mockResolvedValue(availPeek('tok-f8bar'))
    await enterWorkspaceRecovery() // 冻结：bumpGenPreserve→R1 同步弃置在途探针（streak 0→1 此处已计；杀臂隔开同刻到点）
    await vi.advanceTimersByTimeAsync(55000) // t=125000：时间推进（弃置已于 enter 完成；frozen 不臂）
    probe1.resolve({ ok: true, data: { status: 'stale', epoch: 0 } }) // ghost stale settle——R2 gen 守卫拦截不计（误计则 streak=2）
    await vi.advanceTimersByTimeAsync(0)
    deferRecoverySlot() // 开门+onGateReopened→armIfEligible→臂 probeDelayMs(streak)
    await vi.advanceTimersByTimeAsync(14999) // 正确 streak=1→15s 未到
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1) // 15s 到点→实发
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(3) // 若误计（streak=2→30s）此处仍 2——红
  })
})

describe('F-RECOV-01 收口微修 —— 判定序/跨代界/同代负锚（C1/C2/C3）', () => {
  it('S16c probe ghost 在界未 settle+snapshot 变空：到点=即刻清 degraded 零计数（C1 判定序——空快照禁假告警升级路径）', async () => {
    init()
    await enterWorkspaceRecovery() // 探针臂条件含 gate=open——先经 peek 空桩开门（装配即冻结）
    const edit = hangOnce()
    const probe1 = hangOnce()
    stubApi.recovery.save.mockReturnValueOnce(edit.p as never)
    stubApi.recovery.save.mockReturnValueOnce(probe1.p as never)
    current = payload('s16c')
    notifyRecoverySaveNow()
    await vi.advanceTimersByTimeAsync(60000) // 编辑弃置→臂 5s
    await vi.advanceTimersByTimeAsync(5000) // 探针实发（永挂）
    await vi.advanceTimersByTimeAsync(60000) // t=125000：探针弃置（streak=1）→15s 臂
    current = null // 快照变空（无待保护数据）
    await vi.advanceTimersByTimeAsync(15000) // t=140000 到点：snapshot 判定先于 ghost 计数→即刻清
    expect(getRecoveryState().degraded).toBe(false) // 若旧序（ghost 先计）则计数升 streak=2 维持 chip——红
    expect(getRecoveryState().kind).toBeNull()
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(2) // 零实发零计数
  })

  it('S17 跨代界：探针 ghost 在界→enter（preserve 清界）→defer 开门臂→下一到点界空→新探针实发（每代至多 1 具/全局 D_max 兜底口径）', async () => {
    init()
    await enterWorkspaceRecovery()
    const edit = hangOnce()
    const probe1 = hangOnce()
    stubApi.recovery.save.mockReturnValueOnce(edit.p as never)
    stubApi.recovery.save.mockReturnValueOnce(probe1.p as never)
    stubApi.recovery.save.mockResolvedValue(saved('tok-s17'))
    current = payload('s17')
    notifyRecoverySaveNow()
    await vi.advanceTimersByTimeAsync(60000) // 编辑弃置→臂 5s
    await vi.advanceTimersByTimeAsync(5000) // 探针实发（永挂）
    await vi.advanceTimersByTimeAsync(5000) // t=70000：到点在途跳过（续臂 5s）
    stubApi.recovery.peek.mockResolvedValue(availPeek('tok-s17bar'))
    await enterWorkspaceRecovery() // frozen：bumpGenPreserve→R1 同步弃置在途探针（streak 0→1 此处已计）+reset 清探针界
    await vi.advanceTimersByTimeAsync(55000) // t=125000：时间推进（弃置已于 enter 完成；frozen 不臂）
    deferRecoverySlot() // 开门+onGateReopened→armIfEligible→臂 probeDelayMs(1)=15s
    await vi.advanceTimersByTimeAsync(14999)
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1) // 15s 到点：跨代界空→新探针实发（跨代可并发——全局由 D_max 兜底）
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(3)
  })

  it('F8 同代负锚：探针 ghost 以 stale settle→streak 不动（W2 reject 例外族字面——实发后续臂间隔辨析）', async () => {
    init()
    await enterWorkspaceRecovery()
    const edit = hangOnce()
    const probe1 = hangOnce()
    stubApi.recovery.save.mockReturnValueOnce(edit.p as never)
    stubApi.recovery.save.mockReturnValueOnce(probe1.p as never)
    stubApi.recovery.save.mockResolvedValue(errRes()) // 到点实发即 reject（计 streak）
    current = payload('f8b')
    notifyRecoverySaveNow()
    await vi.advanceTimersByTimeAsync(60000) // 编辑弃置→臂 5s
    await vi.advanceTimersByTimeAsync(5000) // 探针实发（永挂）
    await vi.advanceTimersByTimeAsync(60000) // t=125000：探针弃置（streak=1）→15s 臂
    probe1.resolve({ ok: true, data: { status: 'stale', epoch: 0 } }) // 同代 stale settle——不计（误计则 streak=2）
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(14999) // t=139999
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1) // t=140000：ghost 出界→到点实发（reject 计数：正确 streak=2→续臂 30s；误计 streak=3→60s）
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(3)
    await vi.advanceTimersByTimeAsync(29999) // t=169999
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(3)
    await vi.advanceTimersByTimeAsync(1) // t=170000：30s 到点再实发=streak 2（若误计 60s 则此处仍 3——红）
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(4)
  })
})

describe('F-RECOV-01 恢复接管面溢出契约（N8 消费点穷举：takeOver 循环）', () => {
  it('takeOver save=queue-overflow：break 降级承接——条保留可重试（busy 复位+门冻结）', async () => {
    init()
    stubApi.recovery.peek.mockResolvedValue(availPeek('tok-to'))
    stubApi.recovery.read.mockResolvedValue({ ok: true, data: { status: 'found', payload: payload('to') } })
    stubApi.recovery.save.mockResolvedValue({ ok: true, data: { status: 'queue-overflow', epoch: 0 } })
    await enterWorkspaceRecovery()
    await restoreRecoverySlot()
    expect(stubApi.recovery.save).toHaveBeenCalledWith(expect.objectContaining({ takeOverToken: 'tok-to' }))
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(1) // break 即停（N8：溢出不重试——条保留可重试）
    expect(getRecoveryState().phase).toBe('await-decision') // 条保留（未成不收）
    expect(getRecoveryState().busy).toBe(false)
    expect(recoveryBlocked()).toBe(true)
  })
})
