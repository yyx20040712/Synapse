/**
 * [回炉 W-B2b·第 4 项 / 设计稿 §8.1 步骤 1「提交 A 的悬浮笔记草稿」、§2.5 #37/#38、§6.3、§12.2
 * quit-gate 行「内部 flush 放行」；io-phase-inventory §11.3] lineage-note-draft-settle ——
 * 未收口草稿残留的出口：正文经内部 settle 写路径（lane.settleEdit——[回炉 W-B2·R-B2]）串行入其
 * 所属会话的写链并落库。
 *
 * ── 行为层 ──
 * - 适用：快照非空 ∧ 未处于恢复冻结 ∧ 某个在册且未删的会话仍含该笔记 ∧ 正文与笔记现值有差。
 *   其余情况零动作（快照原样保留——留给回页再水化，或由退出握手 ④ 查态如实呈现）：
 *   · 恢复冻结期不落库（R5：冻结期提交拒绝——副本承载恢复）；
 *   · 笔记已不在任何会话：正文无从落回原笔记，留给再水化（「原笔记已不存在，将作为新笔记」
 *     ——确认建立才消费）。
 * - 所属会话：先查活动会话，再查其余在册会话（切 folder 后的残留可能属非活动会话）。
 * - 写法：lane.settleEdit(() => noteOps.updateFloatingNote(noteId, { content: text }))——与编辑器
 *   的 closeEdit 提交走同一 recorder（历史项+队列写），只是不经用户编辑闸（同会话 saving 锁、
 *   quit/recovery/conflict 冻结——它是收口写，不是新用户输入）；串行于该会话写链。入链后
 *   await lane.save() 落库——调用方的查态（quit ④ / allIoClean / anyUnsettled）读到的是结果。
 * - 快照的交接：入链前同步清快照（再水化与各读面不再看到它——否则回页再水化会把残留当成
 *   「笔记已不在图」而在目标图错位新建）；未能成单元时把快照放回（仍按未落库呈现，不丢）。
 *   落库失败=error+写保留在会话队列里，由调用方查态承接（不谎报 clean）。
 *
 * ── 接口层 ── export async function settleNoteDraftResidual(): Promise<boolean>
 *   （true=正文已成编辑单元并落库，或正文本就等于笔记现值；false=未执行）
 *
 * ── 架构层 ── 纯编排件：registry 与注册族读取；被 lineage.store（切 folder）、quit-flush、
 * workspace-switch、recovery-host-ports 调用，不被它们的上游 import（零环）。
 */
import { lineageRegistry as registry } from './lineage-session-registry'
import { noteDraftSnapshot, setNoteDraftSnapshot } from './lineage-note-draft'
import { recoveryBlocked } from './recoveryScheduler'

export async function settleNoteDraftResidual(): Promise<boolean> {
  const snap = noteDraftSnapshot()
  if (snap === null || recoveryBlocked()) return false
  const active = registry.entry(registry.activeFolder())
  const owner =
    active !== undefined && active.data.floatingNotes.some((n) => n.id === snap.noteId)
      ? active
      : registry.sessions().find((e) => e.data.floatingNotes.some((n) => n.id === snap.noteId))
  if (owner === undefined || !registry.isAlive(owner)) return false
  const note = owner.data.floatingNotes.find((n) => n.id === snap.noteId)
  if (note === undefined) return false
  const { noteId, text } = snap
  setNoteDraftSnapshot(null) // 交接：快照同步清，正文由下面的写链接管
  if (note.content === text) return true
  const lane = owner.lane
  const applied = await lane.settleEdit(() => lane.noteOps.updateFloatingNote(noteId, { content: text }))
  if (!applied) {
    // 未能成单元（图在交接与入链之间变了）：快照放回，仍按未落库呈现（其间若已有新草稿则不覆盖）
    if (noteDraftSnapshot() === null) setNoteDraftSnapshot(snap)
    return false
  }
  await lane.save()
  return true
}
