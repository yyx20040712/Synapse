/**
 * [F-RECOV-01] recoveryBackoff —— 退避/探针间隔纯决策件表测（设计书 v2 §4.1/
 * §4.3+终裁 N1/N7：纯件零状态，双表+纯函数；streak 状态驻 scheduler）。
 * always-active（不经 guardedDescribe）。
 */
import { describe, expect, it } from 'vitest'
import {
  BACKOFF_DELAYS_MS,
  PROBE_DELAYS_MS,
  backoffDelayMs,
  backoffExhausted,
  probeDelayMs,
  probeRestartHint
} from '../../../src/renderer/features/lineage/recoveryBackoff'

describe('F-RECOV-01 recoveryBackoff —— 双表纯决策（§4.1/N1）', () => {
  it('BACKOFF 表 1s/2s/4s：首败取 delays[0]，越界帽顶取末值，防御下界取首值', () => {
    expect([...BACKOFF_DELAYS_MS]).toEqual([1000, 2000, 4000])
    expect(backoffDelayMs(1)).toBe(1000) // 首败（N1：首 reject→failStreak=1→delays[0]）
    expect(backoffDelayMs(2)).toBe(2000)
    expect(backoffDelayMs(3)).toBe(4000)
    expect(backoffDelayMs(99)).toBe(4000) // 帽顶
    expect(backoffDelayMs(0)).toBe(1000) // 防御下界
  })

  it('退避耗尽判定：>3（第 4 败）方真——3 内仍在表重试', () => {
    expect(backoffExhausted(0)).toBe(false)
    expect(backoffExhausted(3)).toBe(false)
    expect(backoffExhausted(4)).toBe(true)
  })

  it('PROBE 表 5/15/30/60s（probeFailStreak 索引）后 60s 恒循环', () => {
    expect([...PROBE_DELAYS_MS]).toEqual([5000, 15000, 30000, 60000])
    expect(probeDelayMs(0)).toBe(5000)
    expect(probeDelayMs(1)).toBe(15000)
    expect(probeDelayMs(2)).toBe(30000)
    expect(probeDelayMs(3)).toBe(60000)
    expect(probeDelayMs(7)).toBe(60000) // 封顶恒循环
  })

  it('重启缀阈值：probeFailStreak≥3（W8 终态承载——升格 unavailable 加缀）', () => {
    expect(probeRestartHint(0)).toBe(false)
    expect(probeRestartHint(2)).toBe(false)
    expect(probeRestartHint(3)).toBe(true)
    expect(probeRestartHint(9)).toBe(true)
  })
})
