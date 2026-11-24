/**
 * [回炉 W-B2·R-B3 / 设计稿 §2.4 IO×queue/inflight 合法态表、§2.5 #37/#38] lineage-io-phase ——
 * 会话 IO「未落定」判据与在途收尾相位的纯函数（registry.ioDirty、退出握手与课题切换的等待
 * 名单、lane 与 history-unit 的相位收口共用单源）。
 *
 * ── 行为层 ──
 * - ioUnsettled：Q>0 ∨ F≠0（inflight≠null）∨ 相位非 clean——三项并集，Q 与 F 都直判、不经相位
 *   推断。Q/F 直判的原因（R-B3 原缺陷）：相位写点漏同步时「在途而相位停在 clean」
 *   （history-unit 与和解读在途期间 inflight≠null 而 saveStatus=clean）——只看相位会漏报，
 *   退出提前返回、课题切换提前清史；[回炉 W-B2b] 同理队列非空也不靠相位推断（处置单 R-B3
 *   「直接按 Q / F / error 计算」）。相位项保留：既有合约 app-quit-dirty.test.tsx「lineagePending=
 *   lineage IO（saveStatus≠clean）」与 workspace-switch.test「成功格」以只置相位的夹具为判据
 *   （相位非 clean 一律按未落定——失败向安全）。§2.4 合法态下三项并集即 Q∨F∨error
 *   （error/Q0 的既有退出行为不变）。
 * - settledIoPhase：在途收尾后的 F=0 相位——error 保留（失败可见、可重试），否则按 Q 得
 *   dirty|clean（§2.4 的 idle/Q0、idle/Q1、error/Q0|1 四行）。
 * - 调用约束：settledIoPhase 只在在途任务自身的收尾处调用；结果只读 Q 与 error，不依赖 F。
 *
 * ── 接口层 ── export function ioUnsettled/settledIoPhase；类型 IoPhaseView
 *
 * ── 架构层 ── 纯函数件：只依赖类型（registry/lane/history-unit/app 组合根均可依赖，不成环）。
 */
import type { LineageSaveStatus } from './lineage-session-model'

/** 会话 IO 视图（注册表会话或测试夹具的结构子集） */
export interface IoPhaseView {
  queue: readonly unknown[]
  /** 当前在途写（null=无——F=0） */
  inflight: unknown
  saveStatus: LineageSaveStatus
}

/** IO 未落定：队列非空 ∨ 在途 F≠null ∨ 相位非 clean（ioDirty、退出握手 stillDirty 与课题切换等待名单的单源判据） */
export function ioUnsettled(s: IoPhaseView): boolean {
  return s.queue.length > 0 || s.inflight !== null || s.saveStatus !== 'clean'
}

/** 在途收尾后的 F=0 相位（§2.4：无在途不得停留在 saving） */
export function settledIoPhase(s: IoPhaseView): LineageSaveStatus {
  if (s.saveStatus === 'error') return 'error'
  return s.queue.length > 0 ? 'dirty' : 'clean'
}
