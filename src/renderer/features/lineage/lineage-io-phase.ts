/**
 * [回炉 W-B2·R-B3 / 设计稿 §2.4 IO×queue/inflight 合法态表、§2.5 #37/#38；B5 设计稿 §7 C2=B
 * （用户裁决 B5-D01）、§2.5 Q×F×phase 全表] lineage-io-phase —— 会话 IO「未落定」判据与在途收尾
 * 相位的纯函数（registry.ioDirty、退出握手与课题切换的等待名单、lane 与 history-unit 的相位收口
 * 共用单源）。
 *
 * ── 行为层 ──
 * - ioUnsettled：Q>0 ∨ F≠0（inflight≠null）——两源语义：队列与在途写都直判、不经相位推断。
 *   Q/F 直判的原因（R-B3 原缺陷）：相位写点漏同步时「在途而相位停在 clean」（history-unit 与
 *   和解读在途期间 inflight≠null 而 saveStatus=clean）——只看相位会漏报，退出提前返回、课题
 *   切换提前清史；[回炉 W-B2b] 同理队列非空也不靠相位推断（处置单 R-B3「直接按 Q / F /
 *   error 计算」）。
 *   [B5 C2=B] 原第三输入「相位非 clean」退役：saveStatus 只用于呈现，错误可见性与「是否有实际
 *   待写」正式分离——Q0/F0 的 error（history-unit 零写失败、和解读失败、finalize 的 CONFLICT 尾）
 *   只保留可见告警与重试，不单独构成退出 dirty／lineagePending／等待名单成员；普通写失败因
 *   队首保留（Q≥1）仍计入，退出与结构写互斥不变。
 * - settledIoPhase 不变：在途收尾后的 F=0 相位——error 保留（失败可见、可重试），否则按 Q 得
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

/** IO 未落定：队列非空 ∨ 在途 F≠null（ioDirty、退出握手 stillDirty 与课题切换等待名单的单源判据——[B5 C2=B] 相位不入） */
export function ioUnsettled(s: IoPhaseView): boolean {
  return s.queue.length > 0 || s.inflight !== null
}

/** 在途收尾后的 F=0 相位（§2.4：无在途不得停留在 saving） */
export function settledIoPhase(s: IoPhaseView): LineageSaveStatus {
  if (s.saveStatus === 'error') return 'error'
  return s.queue.length > 0 ? 'dirty' : 'clean'
}
