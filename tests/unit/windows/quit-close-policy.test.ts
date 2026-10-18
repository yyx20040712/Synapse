/**
 * [F-VISFB-64] quit-close-policy 状态机测试（新建，always-active）。
 *
 * 锁链（设计稿 docs/design/2026-10-18_f-visfb64-design.md §⑥ main policy 态表
 * 全表——I/WC/WD/C/D × 八类事件跨格序列）：
 * - close 携 dirty-push 维持的首快照分级（clean→WC grace 1000 / dirty→WD 5000）；
 * - receipt 仅在 id 当前+态 WC/WD+now<deadline 时有效；false=唯一 clean 销毁面；
 * - WC 内 dirty push 升级 WD（截止恒 t0+5000、id 不变、换臂携代际）；
 * - timer 携 generation（旧代际回调无效）；999/1000/1001ms 三边界；
 * - send-failed/renderer-gone/timeout→C（超时只确认不静默销毁）；
 * - C 态 push 仅缓存、确认不叠、C 窗毁 closeConfirm；
 * - confirm-reject→I+unfreeze（abort 水线载荷=被废请求 id）；
 * - destroy 恰一次、dispose 幂等、I 一切迟到回执不作用。
 * 纯 TS 零 Electron：now() 注入假钟，effects 全记录（设计 §⑦ 接口）。
 */
import { describe, expect, it } from 'vitest'
import { QUIT_CLEAN_GRACE_MS, QUIT_FLUSH_TIMEOUT_MS } from '../../../src/shared/constants'
import {
  createQuitClosePolicy,
  type QuitClosePolicy,
  type QuitPolicyEffects
} from '../../../src/main/windows/quit-close-policy'

interface Records {
  sent: string[]
  arms: { deadline: number; generation: number }[]
  clears: { deadline: number; generation: number }[]
  retired: string[]
  confirms: number[]
  closeConfirms: number[]
  aborts: string[]
  destroys: number
  disposes: number
}

function makePolicy(
  startNow = 0
): { policy: QuitClosePolicy; r: Records; setNow(t: number): void } {
  let t = startNow
  const r: Records = {
    sent: [],
    arms: [],
    clears: [],
    retired: [],
    confirms: [],
    closeConfirms: [],
    aborts: [],
    destroys: 0,
    disposes: 0
  }
  const effects: QuitPolicyEffects = {
    sendQuitFlush: (id) => void r.sent.push(id),
    armTimer: (deadline, generation) => void r.arms.push({ deadline, generation }),
    clearTimer: (deadline, generation) => void r.clears.push({ deadline, generation }),
    retireRequest: (id) => void r.retired.push(id),
    showConfirm: (token) => void r.confirms.push(token),
    closeConfirm: () => void r.closeConfirms.push(1),
    unfreezeRenderer: (id) => void r.aborts.push(id),
    destroyWindow: () => {
      r.destroys += 1
    },
    disposePolicy: () => {
      r.disposes += 1
    }
  }
  const policy = createQuitClosePolicy(() => t, effects)
  return { policy, r, setNow: (v) => (t = v) }
}

describe('quit-close-policy —— 八类事件状态机（F-VISFB-64）', () => {
  it('close（clean 快照）→WC：send 恰一次+arm {t0+grace, gen1}；无 confirm/destroy', () => {
    const { policy, r } = makePolicy()
    policy.close()
    expect(policy.state()).toBe('WC')
    expect(r.sent).toEqual(['quit-flush-1'])
    expect(r.arms).toEqual([{ deadline: QUIT_CLEAN_GRACE_MS, generation: 1 }])
    expect(r.confirms).toEqual([])
    expect(r.destroys).toBe(0)
  })

  it('close（dirty 快照）→WD：arm deadline=t0+5000（首快照分级）', () => {
    const { policy, r } = makePolicy()
    policy.dirtyPush(true)
    policy.close()
    expect(policy.state()).toBe('WD')
    expect(r.arms).toEqual([{ deadline: QUIT_FLUSH_TIMEOUT_MS, generation: 1 }])
  })

  it('close→dirty-push→receipt 序：WC 内 push(true) 升级 WD（clear 旧臂+arm t0+5000、id 不变）→receipt(true)→C', () => {
    const { policy, r, setNow } = makePolicy()
    policy.close()
    setNow(100)
    policy.dirtyPush(true)
    expect(policy.state()).toBe('WD')
    expect(r.clears).toEqual([{ deadline: QUIT_CLEAN_GRACE_MS, generation: 1 }])
    expect(r.arms).toEqual([
      { deadline: QUIT_CLEAN_GRACE_MS, generation: 1 },
      { deadline: QUIT_FLUSH_TIMEOUT_MS, generation: 2 }
    ])
    expect(r.sent).toEqual(['quit-flush-1'])
    policy.receipt('quit-flush-1', true)
    expect(policy.state()).toBe('C')
    expect(r.confirms).toHaveLength(1)
    expect(r.retired).toEqual(['quit-flush-1'])
  })

  it('close→receipt→dirty-push 序：receipt(true)→C 后 push 仅缓存（不叠 confirm、不跳态）', () => {
    const { policy, r } = makePolicy()
    policy.close()
    policy.receipt('quit-flush-1', true)
    expect(policy.state()).toBe('C')
    policy.dirtyPush(true)
    expect(policy.state()).toBe('C')
    expect(policy.snapshotDirty()).toBe(true)
    expect(r.confirms).toHaveLength(1)
  })

  it('WC 内 push(false)：不迁移不换臂（仅快照更新）', () => {
    const { policy, r } = makePolicy()
    policy.close()
    policy.dirtyPush(false)
    expect(policy.state()).toBe('WC')
    expect(r.arms).toHaveLength(1)
    expect(r.clears).toEqual([])
  })

  it('WD 不降级：dirty close 后 push(false) 仍 WD、无换臂', () => {
    const { policy, r } = makePolicy()
    policy.dirtyPush(true)
    policy.close()
    policy.dirtyPush(false)
    expect(policy.state()).toBe('WD')
    expect(policy.snapshotDirty()).toBe(false)
    expect(r.arms).toHaveLength(1)
    expect(r.clears).toEqual([])
  })

  it('有效 clean 回执：receipt(false)→D+retire+destroy 恰一次（唯一 clean 销毁面）', () => {
    const { policy, r } = makePolicy()
    policy.close()
    policy.receipt('quit-flush-1', false)
    expect(policy.state()).toBe('D')
    expect(r.destroys).toBe(1)
    expect(r.retired).toEqual(['quit-flush-1'])
    expect(r.confirms).toEqual([])
  })

  it('[回炉 W3] receipt clean 分支清臂：clearTimer effect 发出（{deadline,generation}——WC/WD→D 路径不漏臂）', () => {
    const { policy, r } = makePolicy()
    policy.close()
    policy.receipt('quit-flush-1', false)
    expect(r.clears).toEqual([{ deadline: QUIT_CLEAN_GRACE_MS, generation: 1 }])
  })

  it('999ms 边界：WC 内 push(true) 仍升级（now=999<deadline=1000）', () => {
    const { policy, r, setNow } = makePolicy()
    policy.close()
    setNow(999)
    policy.dirtyPush(true)
    expect(policy.state()).toBe('WD')
    expect(r.arms).toHaveLength(2)
  })

  it('1000ms 边界：timer-fired→C 恰一次；重复 timer-fired 不再作用（不叠框）', () => {
    const { policy, r, setNow } = makePolicy()
    policy.close()
    setNow(QUIT_CLEAN_GRACE_MS)
    policy.timerFired(1)
    expect(policy.state()).toBe('C')
    expect(r.confirms).toHaveLength(1)
    policy.timerFired(1)
    expect(r.confirms).toHaveLength(1)
  })

  it('1001ms 边界：过期 clean 回执无效（C 态回执不作用——不 destroy）', () => {
    const { policy, r, setNow } = makePolicy()
    policy.close()
    setNow(QUIT_CLEAN_GRACE_MS)
    policy.timerFired(1)
    setNow(QUIT_CLEAN_GRACE_MS + 1)
    policy.receipt('quit-flush-1', false)
    expect(policy.state()).toBe('C')
    expect(r.destroys).toBe(0)
  })

  it('receipt 时已过期（timer 未回调）→C 而非 clean 销毁（回执过期按超时同构）', () => {
    const { policy, r, setNow } = makePolicy()
    policy.close()
    setNow(QUIT_CLEAN_GRACE_MS + 1)
    policy.receipt('quit-flush-1', false)
    expect(policy.state()).toBe('C')
    expect(r.destroys).toBe(0)
    expect(r.confirms).toHaveLength(1)
  })

  it('旧 id 隔离：cancel 后 reclose 新 id；旧 id 回执丢弃不误伤新握手', () => {
    const { policy, r, setNow } = makePolicy()
    policy.close()
    setNow(QUIT_CLEAN_GRACE_MS)
    policy.timerFired(1)
    policy.confirmResolved(1, false)
    expect(policy.state()).toBe('I')
    expect(r.aborts).toEqual(['quit-flush-1'])
    policy.close()
    expect(r.sent).toEqual(['quit-flush-1', 'quit-flush-2'])
    policy.receipt('quit-flush-1', false)
    expect(policy.state()).toBe('WC')
    expect(r.destroys).toBe(0)
  })

  it('confirm-resolved=confirm→D+destroy 恰一次', () => {
    const { policy, r, setNow } = makePolicy()
    policy.close()
    setNow(QUIT_CLEAN_GRACE_MS)
    policy.timerFired(1)
    policy.confirmResolved(1, true)
    expect(policy.state()).toBe('D')
    expect(r.destroys).toBe(1)
  })

  it('confirm token 失效：错 token 确认不作用；正确 token 后续生效', () => {
    const { policy, setNow } = makePolicy()
    policy.close()
    setNow(QUIT_CLEAN_GRACE_MS)
    policy.timerFired(1)
    policy.confirmResolved(999, true)
    expect(policy.state()).toBe('C')
    policy.confirmResolved(1, false)
    expect(policy.state()).toBe('I')
  })

  it('send-failed：WC→清 timer+除名→C（降级确认，不静默）', () => {
    const { policy, r } = makePolicy()
    policy.close()
    policy.sendFailed()
    expect(policy.state()).toBe('C')
    expect(r.clears).toEqual([{ deadline: QUIT_CLEAN_GRACE_MS, generation: 1 }])
    expect(r.retired).toEqual(['quit-flush-1'])
  })

  it('renderer-gone：WC→C（不按 clean——此后 clean 回执不作用）', () => {
    const { policy, r } = makePolicy()
    policy.close()
    policy.rendererGone()
    expect(policy.state()).toBe('C')
    policy.receipt('quit-flush-1', false)
    expect(r.destroys).toBe(0)
  })

  it('window-destroyed（WC）→D 无 destroy effect+dispose 恰一次', () => {
    const { policy, r } = makePolicy()
    policy.close()
    policy.windowDestroyed()
    expect(policy.state()).toBe('D')
    expect(r.destroys).toBe(0)
    expect(r.disposes).toBe(1)
  })

  it('C 态窗毁：closeConfirm 恰一次+D+dispose', () => {
    const { policy, r, setNow } = makePolicy()
    policy.close()
    setNow(QUIT_CLEAN_GRACE_MS)
    policy.timerFired(1)
    policy.windowDestroyed()
    expect(r.closeConfirms).toHaveLength(1)
    expect(policy.state()).toBe('D')
    expect(r.disposes).toBe(1)
    expect(r.destroys).toBe(0)
  })

  it('D 后事件忽略+dispose 幂等：其余事件全 no-op，二次 dispose 不重复', () => {
    const { policy, r } = makePolicy()
    policy.close()
    policy.receipt('quit-flush-1', false)
    expect(policy.state()).toBe('D')
    policy.dirtyPush(true)
    policy.close()
    policy.timerFired(99)
    policy.windowDestroyed()
    policy.dispose()
    policy.dispose()
    expect(r.sent).toEqual(['quit-flush-1'])
    expect(r.destroys).toBe(1)
    expect(r.disposes).toBe(1)
  })

  it('destroy 恰一次：D 后 windowDestroyed 不再 destroy', () => {
    const { policy, r } = makePolicy()
    policy.close()
    policy.receipt('quit-flush-1', false)
    policy.windowDestroyed()
    expect(r.destroys).toBe(1)
  })

  it('I 态迟到回执不作用：无任何 effect、态保持 I', () => {
    const { policy, r } = makePolicy()
    policy.receipt('quit-flush-1', false)
    policy.receipt('quit-flush-1', true)
    expect(policy.state()).toBe('I')
    expect(r.sent).toEqual([])
    expect(r.destroys).toBe(0)
    expect(r.confirms).toEqual([])
  })

  it('旧 generation timer 无效：WC→WD 换臂后 timerFired(旧 gen) 忽略、新 gen 生效', () => {
    const { policy, r, setNow } = makePolicy()
    policy.close()
    setNow(100)
    policy.dirtyPush(true)
    policy.timerFired(1)
    expect(policy.state()).toBe('WD')
    expect(r.confirms).toEqual([])
    policy.timerFired(2)
    expect(policy.state()).toBe('C')
  })

  it('close 在非 I 态忽略：WC 中再 close 不重发不新建 id', () => {
    const { policy, r } = makePolicy()
    policy.close()
    policy.close()
    expect(r.sent).toEqual(['quit-flush-1'])
    expect(r.arms).toHaveLength(1)
  })

  it('C 态 close 忽略（确认框不叠）', () => {
    const { policy, r } = makePolicy()
    policy.close()
    policy.receipt('quit-flush-1', true)
    policy.close()
    expect(r.confirms).toHaveLength(1)
    expect(r.sent).toEqual(['quit-flush-1'])
  })

  it('abort 载荷=被废请求 id；reclose 后新 id 分级按最新快照（push(false)→WC）', () => {
    const { policy, r, setNow } = makePolicy()
    policy.dirtyPush(true)
    policy.close()
    setNow(QUIT_FLUSH_TIMEOUT_MS)
    policy.timerFired(1)
    policy.dirtyPush(false)
    policy.confirmResolved(1, false)
    expect(r.aborts).toEqual(['quit-flush-1'])
    policy.close()
    expect(policy.state()).toBe('WC')
    expect(r.arms.at(-1)).toEqual({
      deadline: QUIT_FLUSH_TIMEOUT_MS + QUIT_CLEAN_GRACE_MS,
      generation: 2
    })
  })
})
