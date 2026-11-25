/**
 * [B4 L2 / 设计稿 §2.3 会话身份、§2.5 #34/#35、§2.6 34a/#41/#43、§8.1、§8.4「后台删夹」行、
 * INV-175、INV-188、§11.2] lineage-session-remap —— ghost 降级 remap 落库后的会话终态迁移
 * （[回炉 W-B1·R-remap/R-B1b] 处置单五点终态规则的机器形态；自 registry 外移成件）。
 *
 * 触发点：被矫正会话 X 的写链 drain 成功收尾——队列空、全部写 IPC 已 await 落地（链的
 * inflight 标记在任务体 finally 才清）。在此之前 remap 只改写队列里的动作目标与乐观笔记行，
 * 不改写会话 data.folderId——注册表里不出现「键≠数据键」的中间态。
 *
 * ── 行为层（处置单五点）──
 * ① 注册表里目标图恰一个会话：键与 data.folderId 都是目标键，并取新的 sessionGeneration
 *    （会话身份已变）；在途 keyed 读句柄弃置——其迟到响应按身份键丢弃后由 loader 续拉。
 * ② 该会话的数据=原目标键缓存会话的数据（若有：保留其队列、在途写、草稿、focusSet、
 *    历史），否则新建。缓存会话就地换代而不换 entry：换 entry 会断它正在跑的写链、丢它
 *    未派发的队列。新会话以 status=ready 的空图起步，和解落地即显示落库后的图。
 * ③ 两种情况都置 needsReload=1、invalidationEpoch+1；存活会话是活动会话且 IO clean→
 *    立即按 #34 单飞和解（恰一次 keyed 读）；否则位保留、其链尾续拉（#10a）。
 * ④ 被矫正的原文件夹会话移除：两栈清空（历史项携带的实体归属图已变，保留只会
 *    HISTORY_STALE），unfinalized 并入存活会话（灰点留到下次显式保存）；草稿先提交
 *    （草稿属活动图：存活会话成为活动会话后经既有 commit 入口入其队列）。
 * ⑤ 恢复 owner 按既有离场路径处置：通知 owner 该会话已移除（§8.4「后台删夹」行——
 *    转移或置 null）。先于和解起步：存活会话的 reconcile 在途不得被算作「下一需保护会话」。
 *
 * ── 存活会话的图态即时面 ──
 * X 图内已改投目标图的笔记行并入存活会话 floatingNotes（id 不在场者）：③「图态显示落库后
 * 的主图（含被矫正的笔记）」的即时面，也是④「草稿先提交」的前提——正在编辑的笔记行若在
 * 切换投影的瞬间消失，草稿桥接效应会把在途草稿判为「他径删除」而静默清稿
 * （lineage-note-draft useNoteDraftBridge 信号效应）。和解落地后以权威图为准。
 *
 * ── 申报（对①的窄化）──
 * 存活会话有 history-unit 在途时不换代（仍做 epoch+1 与读句柄弃置）：换代会把在途 undo/redo 的
 * 回显判为迟到——反向写已在 main 落库而回显被丢弃，栈不弹、图态不应用，这次撤销/重做在会话上
 * 等于没发生。保留代际让在途命令照常完成；remap 前发起的 keyed 读由 epoch 推进拒绝，不写图态。
 *
 * ── 接口层 ── export function createRemapFinalizer(core): (from, to) => RemapSurvivor | null
 *
 * ── 架构层 ── 纯编排件：经 RegistryCore 读写注册表内部面；owner 钩与草稿入口=调度器/
 * note-draft 既有导出（不 import registry 运行时）。
 */
import type { LineageSession, SessionEntry } from './lineage-session-registry'
import type { RegistryCore } from './lineage-session-core'
import type { ReconcileOutcome } from './lineage-write-conflicts'
import { fireLineageNoteCommit, noteDraftPending } from './lineage-note-draft'
import { notifyRecoveryFolderRemoved } from './recoveryScheduler'

/** remap 落库后交还给 X 写链的存活会话句柄 */
export interface RemapSurvivor {
  /** ③ 存活会话的和解落定（未立即和解=已落定的 'dropped'——位保留待其链尾续拉） */
  settled: Promise<ReconcileOutcome>
  /** X 写链任务体内其后的命令结果写存活会话（finalize 的 #10 记失败）；存活会话已离场则丢弃。
   *  [B5 设计稿 §6.1] 记失败=saveStatus·message·source（'save'）同批落存活会话——错误归属随存活会话，
   *  不落到别的 folder；[B5 §5.2] 终态经 core.activate 进入目标会话（已含统一投影口），不复制 rekey 的剪枝时序 */
  write(patch: Partial<LineageSession>): void
}

export function createRemapFinalizer(core: RegistryCore): (from: SessionEntry, to: string) => RemapSurvivor | null {
  const registered = (entry: SessionEntry): boolean => core.sessions.get(entry.key) === entry && !entry.data.deleted
  return (from, to) => {
    if (!registered(from) || from.key === to) return null // 调用契约：X 仍注册；自身即目标键会话=无迁移
    const wasActive = core.activeFolder() === from.key
    const cached = core.sessions.get(to)
    const survives = cached !== undefined && !cached.data.deleted
    const survivor = survives ? cached : core.makeEntry(to)
    const patch: Partial<LineageSession> = {
      needsReload: true, // ③
      invalidationEpoch: survivor.data.invalidationEpoch + 1,
      unfinalized: survivor.data.unfinalized || from.data.unfinalized, // ④ 并入
      floatingNotes: [
        ...survivor.data.floatingNotes,
        ...from.data.floatingNotes.filter((n) => n.folderId === to && !survivor.data.floatingNotes.some((m) => m.id === n.id))
      ],
      ...(survives ? {} : { status: 'ready' }) // ② 新建会话：空图起步，和解落地即显示落库后的图
    }
    if (!(survives && survivor.data.inflight?.kind === 'history')) {
      patch.sessionGeneration = core.nextGeneration() // ① 换代（申报：history-unit 在途时不换代）
      patch.loadSeq = survivor.data.loadSeq + 1
      survivor.inflightGraph = null // 弃置在途 keyed 读句柄——迟到响应按身份键丢弃
    }
    core.sessions.set(to, survivor)
    core.apply(survivor, patch)
    // ④ 被矫正的原文件夹会话移除（队列空、写 IPC 已落地——调用方保证）：两栈清空
    from.data.undoStack = []
    from.data.redoStack = []
    from.data.deleted = true
    from.lane.dispose()
    if (core.sessions.get(from.key) === from) core.sessions.delete(from.key)
    if (wasActive) {
      core.activate(to)
      fireLineageNoteCommit() // ④ 草稿先提交（活动会话已是存活会话且不在 flushing——经既有 commit 入口入其队列）
    }
    notifyRecoveryFolderRemoved(from.key) // ⑤ owner 离场裁决
    core.notify()
    const active = core.activeFolder() === survivor.key
    const ioClean = survivor.data.queue.length === 0 && survivor.data.inflight === null && !(active && noteDraftPending())
    return {
      settled: active && ioClean ? survivor.lane.reconcileNow() : Promise.resolve<ReconcileOutcome>('dropped'), // ③
      write: (next) => {
        if (registered(survivor)) core.apply(survivor, next)
      }
    }
  }
}
