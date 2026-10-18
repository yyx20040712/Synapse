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
