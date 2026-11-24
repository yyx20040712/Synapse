/**
 * [B4 L2 / 设计稿 §2.3 sessionGeneration·loadSeq·invalidationEpoch 行、§2.5 #19/#35/#36、
 * §2.6 #43、§8.3「旧图响应只回写原会话」] lineage-writeback-admission —— 脉络域异步回写的
 * **唯一准入函数**（[回炉 W-B1·R-B4]：回写点逐点各写一份身份判据是 P3 的病根——
 * loader 比代际/loadSeq/epoch 却漏了 folderId；本件把身份键判据收成一处，各回写点
 * 只负责组装「发起时捕获的身份戳」与「回写时刻的目标身份现值」）。
 *
 * ── 行为层 ──
 * - 会话身份戳（SessionStamp）：回写发起时捕获——folderId＋sessionGeneration 是一切
 *   迟到响应的身份键（§2.3）；keyed 读（graph 首载/和解单飞）另携推进后的 loadSeq 与
 *   读捕获的 invalidationEpoch。
 * - admitWriteback 判据（§2.6 #43 机器形态），全真才写原会话，任一不成立=丢弃（不写
 *   任何会话、不清位、不动活动投影）：
 *   ① 目标会话仍注册且未删；② folderId 相等；③ sessionGeneration 相等；
 *   ④ 戳携 loadSeq 时目标 loadSeq 相等（读是最新一次）；⑤ 戳携 epoch 时读捕获 epoch ≥
 *   会话当前 epoch。
 * - 合法态判据（Q0、在途任务归属）不是身份，不属本件——留驻各回写点原位。
 * - 闭包寻址的写链回显（lane.write→registry.apply）不经本件：设计 §2.5 #19 规定迟到
 *   写落原会话（孤儿 entry）的物理账本；其身份不变量由 registry.apply 的
 *   foreignIdentityWrite 守卫保证。
 * - foreignIdentityWrite：单一写路径守卫——注册表键与 data.folderId 恒等（每个文件夹
 *   恰一个会话，改键=换新身份=新 entry）；携异键 folderId 的 patch 是身份写越界。
 * - generationCurrent：无会话现态的调用面（owner 状态机只读得到某 folder 的代际）的
 *   代际复核——转移写的回执不得把 owner 发布到已被替换的目标会话。
 *
 * ── 接口层 ── export function captureStamp/targetOf/admitWriteback/
 * foreignIdentityWrite/generationCurrent；类型 SessionStamp·WritebackTarget
 *
 * ── 架构层 ── 纯函数件：零 import（loader/lane/history-unit/host-ports/registry 与
 * recovery-owner 均可依赖，不成环）。
 */

/** 会话身份戳：回写发起时捕获 */
export interface SessionStamp {
  folderId: string
  generation: number
  /** keyed 读发起时推进后的 loadSeq（缺省=非 keyed 读，不校验） */
  loadSeq?: number
  /** keyed 读发起时捕获的 invalidationEpoch（缺省=不校验） */
  epoch?: number
}

/** 回写时刻的目标会话身份现值（调用方从会话现态组装；alive=registry.isAlive） */
export interface WritebackTarget {
  /** 会话仍注册且未删（孤儿 entry=false） */
  alive: boolean
  folderId: string
  sessionGeneration: number
  loadSeq: number
  invalidationEpoch: number
}

/** 发起时捕获身份戳 */
export function captureStamp(s: { folderId: string; sessionGeneration: number }): SessionStamp {
  return { folderId: s.folderId, generation: s.sessionGeneration }
}

/** 由会话现态组装目标身份现值 */
export function targetOf(s: Omit<WritebackTarget, 'alive'>, alive: boolean): WritebackTarget {
  return { alive, folderId: s.folderId, sessionGeneration: s.sessionGeneration, loadSeq: s.loadSeq, invalidationEpoch: s.invalidationEpoch }
}

/** 唯一准入判据（§2.6 #43）：全真才写原会话；任一不成立=丢弃 */
export function admitWriteback(target: WritebackTarget, stamp: SessionStamp): boolean {
  if (!target.alive) return false
  if (target.folderId !== stamp.folderId || target.sessionGeneration !== stamp.generation) return false
  if (stamp.loadSeq !== undefined && target.loadSeq !== stamp.loadSeq) return false
  if (stamp.epoch !== undefined && stamp.epoch < target.invalidationEpoch) return false
  return true
}

/** 单一写路径守卫：patch 携带与会话键不同的 folderId=身份写越界（改键只经 rekey 新建 entry） */
export function foreignIdentityWrite(key: string, patch: { folderId?: string }): boolean {
  return patch.folderId !== undefined && patch.folderId !== key
}

/** 代际复核（owner 状态机调用面）：目标会话仍在（代际可读）且代际未变 */
export function generationCurrent(current: number | null, stamp: SessionStamp): boolean {
  if (current === null) return false // 目标会话不在
  return admitWriteback({ alive: true, folderId: stamp.folderId, sessionGeneration: current, loadSeq: 0, invalidationEpoch: 0 }, stamp)
}
