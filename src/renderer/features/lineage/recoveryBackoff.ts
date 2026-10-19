/**
 * [F-RECOV-01] recoveryBackoff —— 恢复副本写失败退避/探针间隔纯决策件
 * （设计书 v2 §4.1/§4.3+终裁 N1/N7：纯件=双表+纯函数导出，零状态零依赖；
 * streak 状态驻 recoveryScheduler——本件只做表驱动决策，便于无遥测下调参）。
 *
 * ── 行为面（表驱动，无状态机）──
 * - BACKOFF 1s/2s/4s：首败 failStreak=1→delays[0]；第 4 败（>3）不再排程
 *   （升 degraded 呈现——N1 终裁语义沿现行 scheduleBackoff）。
 * - PROBE 5s/15s/30s/60s 后 60s 恒循环：probeFailStreak 索引（0→5s … ≥3→60s）。
 * - probeRestartHint：probeFailStreak≥3 →「重启应用可恢复」加缀（W8 终态承载
 *   ——盘上副本有效、重启清内存链；peek 不走 serialize 链故决策面不堵）。
 */
export const BACKOFF_DELAYS_MS: readonly number[] = [1000, 2000, 4000]
export const PROBE_DELAYS_MS: readonly number[] = [5000, 15000, 30000, 60000]
/** failStreak 超过退避表长（第 4 败）→ 不再排程重试（degraded 承接） */
export const BACKOFF_TABLE_MAX = BACKOFF_DELAYS_MS.length
/** probeFailStreak 达 3 → unavailable 加缀「重启应用可恢复」 */
export const PROBE_RESTART_HINT_AT = 3

/** 编辑路径退避间隔（首败=delays[0]；越界帽顶末值；防御下界首值） */
export function backoffDelayMs(failStreak: number): number {
  const i = Math.min(Math.max(failStreak - 1, 0), BACKOFF_DELAYS_MS.length - 1)
  return BACKOFF_DELAYS_MS[i]!
}

/** 退避耗尽判定（>3=第 4 败——升 degraded/unavailable） */
export function backoffExhausted(failStreak: number): boolean {
  return failStreak > BACKOFF_TABLE_MAX
}

/** 探针间隔（probeFailStreak 索引；≥3 封顶 60s 恒循环） */
export function probeDelayMs(probeFailStreak: number): number {
  return PROBE_DELAYS_MS[Math.min(probeFailStreak, PROBE_DELAYS_MS.length - 1)]!
}

/** 重启缀判定（probeFailStreak≥3） */
export function probeRestartHint(probeFailStreak: number): boolean {
  return probeFailStreak >= PROBE_RESTART_HINT_AT
}
