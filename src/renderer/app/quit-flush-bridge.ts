/**
 * [F-VISFB-64] quit-flush-bridge —— 退出握手 main→renderer 事件桥（busy/
 * orphan epoch 语义+abort 订阅+5000ms 有界复位兜底；非 React 面：渲染进程入口
 * install 一次——main.tsx 装配，进程级不退订）。
 *
 * renderer 子态表（设计稿 §⑥）：
 * - 新帧，无 busy/orphan：同步 closing=true（α 冻结门置位）→runQuitFlush 四步
 *   →④=false=回执 false 并**保持冻结**至 destroy/abort/安全复位／④=true 或
 *   异常=回执 true+解冻（按脏处理，无 clean 自动销毁面）；
 * - busy∨orphan-pending 期间新帧：立即回执 stillDirty=true（不并发四步）；
 * - abort（epoch 水线=requestId 数值）：废止不超过该 id 的活动 epoch 并解冻；
 *   未 settle 旧 epoch 转 orphan-pending（其 settle 零回执——旧 epoch 禁止回
 *   false）；迟到/重复 abort（epoch≤水线）不误伤新 epoch；orphan 全部 settle
 *   后新帧才恢复四步；
 * - abort 丢失/发送失败：最晚 QUIT_FLUSH_TIMEOUT_MS（shared 单源）解除
 *   closing（B 兜底）；busy 中挂起 epoch 一并转 orphan。
 * 回执 invoke 失败=main 侧超时降级承接（握手合同沿承）。
 */
import { QUIT_FLUSH_TIMEOUT_MS } from '@shared/constants'
import { api, apiEvents, unwrap } from '../api/client'
import { runQuitFlush } from './quit-flush'
import { setQuitClosing } from './quit-closing-gate'

/** requestId（`quit-flush-N`）→单调序数值（epoch 水线数值比较） */
function epochOf(requestId: string): number {
  const n = Number(requestId.split('-').at(-1))
  return Number.isFinite(n) ? n : 0
}

function report(requestId: string, stillDirty: boolean): void {
  unwrap(api.system.reportQuitFlush({ requestId, stillDirty })).catch(() => undefined)
}

export function installQuitFlushBridge(): () => void {
  let busyId: string | null = null
  let abortWaterline = 0
  // [轮2 B-r1-02] latest-epoch 水位：每个经水线新帧（含立即 true 帧）更新——
  // 旧 abort（帧已前进）整体忽略的对称防线（FIFO 下不可达——防御面，N1 同族）
  let lastFrameEpoch = 0
  const orphans = new Set<string>()
  let fallback: ReturnType<typeof setTimeout> | null = null

  /** B 兜底（逐帧重挂）：最晚 QUIT_FLUSH_TIMEOUT_MS 解除 closing——abort
   *  丢失/发送失败时不永冻；busy 挂起 epoch 转 orphan（保守按脏） */
  const armFallback = (): void => {
    if (fallback !== null) clearTimeout(fallback)
    fallback = setTimeout(() => {
      fallback = null
      if (busyId !== null) {
        orphans.add(busyId)
        busyId = null
      }
      setQuitClosing(false)
    }, QUIT_FLUSH_TIMEOUT_MS)
  }

  const offFlush = apiEvents.onQuitFlush(({ requestId }) => {
    const epoch = epochOf(requestId)
    if (epoch <= abortWaterline) {
      // 已被 abort 水线废止的迟到帧：保守按脏回执（正常序不达——防御面）
      report(requestId, true)
      return
    }
    lastFrameEpoch = Math.max(lastFrameEpoch, epoch)
    if (busyId !== null || orphans.size > 0) {
      report(requestId, true)
      return
    }
    busyId = requestId
    setQuitClosing(true)
    armFallback()
    void (async () => {
      let stillDirty = true
      try {
        stillDirty = await runQuitFlush()
      } catch {
        stillDirty = true
      }
      const orphaned = orphans.has(requestId)
      orphans.delete(requestId)
      if (busyId === requestId) busyId = null
      if (orphaned) {
        // 旧 epoch 已废（main 已除名）：零回执（禁 false）；abort 已解冻/兜底将解冻
        setQuitClosing(false)
        return
      }
      if (stillDirty) {
        setQuitClosing(false)
        report(requestId, true)
        return
      }
      // clean 回执：保持冻结至 destroy/abort/有界复位（不在此解冻）
      report(requestId, false)
    })()
  })

  const offAbort = apiEvents.onQuitFlushAbort(({ requestId }) => {
    const epoch = epochOf(requestId)
    // [轮2 B-r1-02] 帧已前进的旧 abort（含 clean settle 冻结期）：整体忽略——
    // 不解冻不推水线（对称防线；FIFO 不可达——防御面）
    if (epoch < lastFrameEpoch) return
    // [回炉 N1] 新 flush 在途的旧 abort（跨通道乱序）：整体忽略——不解冻、
    // 不 orphan、不推水线（新 epoch 的冻结与 clean 回执链不受旧取消干扰）
    if (busyId !== null && epochOf(busyId) > epoch) return
    if (epoch <= abortWaterline) return
    abortWaterline = epoch
    setQuitClosing(false)
    if (busyId !== null && epochOf(busyId) <= epoch) {
      orphans.add(busyId)
      busyId = null
    }
  })

  return () => {
    offFlush()
    offAbort()
    if (fallback !== null) clearTimeout(fallback)
  }
}
