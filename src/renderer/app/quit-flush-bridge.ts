/**
 * [F-VISFB-14] quit-flush-bridge —— 退出握手 main→renderer 事件桥（非 React
 * 面：渲染进程入口 install 一次，main.tsx 装配——不挂 App 组合根，避免
 * App 挂载链测试逐件补事件桩）。
 *
 * 职责：订阅 apiEvents.onQuitFlush（requestId 帧）→ runQuitFlush 收口 →
 * system/reportQuitFlush 回执 stillDirty。main 侧 flushing 重入锁保证握手
 * 单发；本桥防御性 busy 位兜并发帧（在途时新帧立即回执 stillDirty=true——
 * 不并发收口，未知按脏）。回执 invoke 失败=main 侧有限超时降级承接。
 */
import { api, apiEvents, unwrap } from '../api/client'
import { runQuitFlush } from './quit-flush'

/** 安装退出握手桥（渲染进程入口调用一次；返回退订——入口进程级不退订） */
export function installQuitFlushBridge(): () => void {
  let busy = false
  return apiEvents.onQuitFlush(({ requestId }) => {
    if (busy) {
      void unwrap(api.system.reportQuitFlush({ requestId, stillDirty: true })).catch(
        () => undefined
      )
      return
    }
    busy = true
    void (async () => {
      let stillDirty = true
      try {
        stillDirty = await runQuitFlush()
      } catch {
        stillDirty = true
      } finally {
        busy = false
      }
      try {
        await unwrap(api.system.reportQuitFlush({ requestId, stillDirty }))
      } catch {
        // 回执失败：main 侧有限超时降级承接（握手合同）
      }
    })()
  })
}
