// b3: P7-H
/**
 * lineage.store —— 脉络图数据+读面/会话写面状态单源（store；[B4 L2] 活动投影薄壳：
 * 数据面单源=lineage-session-registry（Map<folderId, 会话>），每会话写链=
 * lineage-session-lane；本件=活动会话的投影字段+公开动作转发——动作恒作用于调用
 * 时刻的活动会话，拖拽落位写除外〔携拖拽激活时捕获的身份，§9.3〕）。
 * 拆件来历（本件缩为投影薄壳前的组成；三个拆件仍在本件链路上）：暂存机制拆件=
 * lineage-write-queue.ts，编辑会话撤销/重做域件拆件=lineage-session-ops.ts
 * 〔F-VISFB-61——beginUnit/restore 纯移动迁出〕，悬浮笔记动作域件拆件=
 * lineage-note-ops.ts〔F-VISFB-62——三操作纯移动迁出〕。
 *
 * ── 数据单源接缝声明（双向锚定：本行+LineagePage 头注）──
 * lineage/graph 取数=registry loader 单点；LineagePage/LineageTimeline/LineageBoard/
 * LineageSidePanel 一律经本 store 分发消费——**03/04 禁双取**（不得另行直连 window.api.lineage.graph 建第二取数点）。
 * 数据缓存：nodes/edges 驻 store（视图切换卸载不丢，03/04 消费面免二次取数）。
 * （[B4 L2] 数据面驻 registry 会话、本件为活动投影——缓存驻留语义不变）
 * 缺省图（[F-LGRAPH-01①U4] 编排重构）
 *  =库页文件夹上下文同步（接缝双向锚定：本头注+library.store 头注
 *  ——LineagePage 挂载时读 library.store query.folderScope：kind='folder'
 * 用其 folderId，否则主图）。
 *
 * ── 读面状态（门一 N6）──
 * loading/ready/error 三态每会话独立；keyed 读身份（folderId+sessionGeneration+
 * loadSeq+读捕获 invalidationEpoch）全匹配才写原会话（§2.6 #43），不符即
 * 丢弃；**写面互锁（LG-03/[②U1] 会话扩面）**：暂存队列未清空（dirty）或
 * flushing 中 graph 落地同样丢弃（编辑会话暂存为准——跨页返回保留）。
 * 权威落地不清内存历史与 U（§2.5 #35）；needsReload 清位=权威应用分支+discardSession。
 *
 * ── [B4 L2] 写路径与切换（设计稿 docs/design/2026-11-22_b4-save-undo-core-design.md）──
 * - 一切会话写经 registry 单一 apply：本件 setState 被路由到 registry.patchActive
 *   （宿主/夹具植入不得绕过 registry 直写投影）；后台响应只写发起时所属的会话。
 * - setFolder（§2.5 #32/§8.1）：switchSeq++→提交 A 草稿+取消 A idle timer→
 *   hasUnsettledWrites(A) 真=请求写 A 最新 RecoveryPayload+A flush-first（不等回执、
 *   不弹弃改框）→B 有会话直接投影（needsReload 单飞和解/error 重载）、无会话才发
 *   graph IPC→activeFolder 同步变 B；同值重选=既有会话不双取（§8.3）；saving 不阻切。
 * - 聚合：useLineageDirty=全 registry IO（Q∨inflight∨error——草稿由聚合 hook 并入）；
 *   useLineageUnfinalized=全 registry U OR。rail/quit 不以活动投影代替全集。
 * - IO 轴与 U 轴独立（§2.1）：undo/redo=flush-then-unit（async，失败不弹栈）；
 *   显式保存=saveActiveFolder（清 redo+U，undo 保留）；save()=IO 收口不定稿；
 *   1.5s idle-flush 只清 IO。
 * 错误契约：load 失败不上抛——失败态驻 store.error（列表型瞬态，消费方
 * 呈现+重试，INV-02 两型分清；动作型 toast 面=write-queue flush 内）。
 * （[B4 L2] error 为每会话独立字段；store.error=活动会话 error 的投影）
 * - 过期历史出口（[回炉 W-B3·R-D1]）：discardStaleHistory=用户在保存错误行点击并确认后，移除
 *   被 history-unit 以 CONFLICT 拒绝的栈顶历史项（纯内存，不写数据库）——原缺陷：栈顶项过期后
 *   其下更旧的历史都撤不到，唯一出口是重启应用。
 * [A1b] 标签编辑单元随脉络私有标签域退役删除（标签整组写 action 消亡）。
 */
import { create } from 'zustand'
import { useSyncExternalStore } from 'react'
import { api, unwrap, ApiClientError } from '../../api/client'
import { showToast } from '../../shared/ui/toast-store'
import type { LineagePaperMetrics } from '@shared/ipc/schemas'
import { markRecoveryClean, notifyRecoveryDepart, notifyRecoverySaveNow } from './recoveryScheduler'
import { bindLineageStoreApi, fireLineageNoteCommit, noteDraftPending, setNoteDraftChangeSink } from './lineage-note-draft'
import { settleNoteDraftResidual } from './lineage-note-draft-settle'
import { useLineageViewStore } from './lineage-view.store'
import { lineageRegistry as registry, type SessionEntry, type StorePatch } from './lineage-session-registry'
import type { SessionLane } from './lineage-session-lane'
import { admitWriteback, captureStamp, targetOf } from './lineage-writeback-admission'
import { hasUnsettledWrites } from './recovery-clean-lifecycle'
import { dropStaleHistory } from './lineage-history-stale'
import { settledIoPhase } from './lineage-io-phase'
import type { LineageDragTarget, LineageStore } from './lineage-session-model'

export type { LineageHistoryEntry, LineageInflight, LineageSaveStatus, LineageStatus, LineageStore } from './lineage-session-model'
export type { DrawEdgeResult, ReconnectResult } from './lineage-edit-commands'
export type { LazyNodePatch, LineageNodePatchBody } from './lineage-write-actions'
export type { WriteAction } from '@shared/recovery/schemas'

/** IO 退出拦截聚合输入（INV-22/INV-91——全 registry：任一会话 Q∨inflight∨error；U 不入） */
export function useLineageDirty(): boolean {
  return useSyncExternalStore(registry.subscribe, registry.ioDirty)
}

/** rail 脉络角标（§10.1——全 registry 会话 unfinalized OR） */
export function useLineageUnfinalized(): boolean {
  return useSyncExternalStore(registry.subscribe, registry.unfinalizedAny)
}

const activeEntry = (): SessionEntry => registry.ensure(registry.activeFolder())
/** 草稿属活动图（悬浮笔记编辑器只随活动图挂载） */
const draftOf = (entry: SessionEntry): boolean => entry === activeEntry() && noteDraftPending()
const unsettled = (entry: SessionEntry): boolean => hasUnsettledWrites(entry.data, draftOf(entry))

/** 动作转发：恒作用于调用时刻的活动会话 */
const forward =
  <A extends unknown[], R>(pick: (lane: SessionLane) => (...args: A) => R) =>
  (...args: A): R =>
    pick(activeEntry().lane)(...args)

export const useLineageStore = create<LineageStore>()((set, get) => {
  registry.attachProjector({ set: (patch) => set(patch), get })
  return {
    ...registry.projected(),

    moveNode: forward((l) => l.commands.moveNode),
    applyObstacleReroute: forward((l) => l.commands.applyObstacleReroute),
    drawEdge: forward((l) => l.commands.drawEdge),
    editManualEdgeLabel: forward((l) => l.commands.editManualEdgeLabel),
    applyEdgeLineStyle: forward((l) => l.commands.applyEdgeLineStyle),
    setEdgeVia: forward((l) => l.commands.setEdgeVia),
    reconnectEdge: forward((l) => l.commands.reconnectEdge),
    saveLineTypeNames: forward((l) => l.commands.saveLineTypeNames),
    removeNode: forward((l) => l.commands.removeNode),
    removeEdge: forward((l) => l.commands.removeEdge),
    addFloatingNote: forward((l) => l.noteOps.addFloatingNote),
    updateFloatingNote: forward((l) => l.noteOps.updateFloatingNote),
    removeFloatingNote: forward((l) => l.noteOps.removeFloatingNote),

    /** 权威取数（挂载/重试/显式刷新；已有会话刷新不清历史与 U）——只写原会话 */
    async load() {
      await registry.loader.load(activeEntry())
    },

    setFolder(folderId) {
      const from = registry.activeFolder()
      const leaving = registry.entry(from) // 离场会话只查不建（后台删夹清出后无会话）
      fireLineageNoteCommit() // ① 提交 A 的悬浮笔记草稿（同步）
      // [回炉 W-B2b] 提交未能执行而草稿仍在（落库在途被跳过／编辑器已卸载无句柄）：正文经内部 settle 写路径
      // 串行入离场会话写链并落库——不随切图丢、不在目标图错位再水化（io-phase-inventory §11.3 R6）
      if (noteDraftPending()) void settleNoteDraftResidual()
      if (leaving !== undefined) {
        leaving.lane.cancelIdle() // ① 取消 A idle timer
        const wasUnsettled = unsettled(leaving)
        if (wasUnsettled) {
          notifyRecoverySaveNow(from) // ② 立即以 A 最新 RecoveryPayload 请求写
          leaving.lane.flushFirst() // ② 对 A 发 flush-first（不等回执、不弹弃改框）
        }
        // [§9.3] A 拖拽两态有界收口：落位数据写落原会话，随后补一次 flush-first
        void registry.awaitDragSettle(from).then(() => {
          if (registry.isAlive(leaving) && unsettled(leaving)) leaving.lane.flushFirst()
        })
        notifyRecoveryDepart(from, wasUnsettled) // ownership：A 离场（转移挂起）
      }
      const entry = registry.activate(folderId) // ③④ B 有会话直接投影；activeFolder 同步变 B
      useLineageViewStore.getState().resetTool() // 画线工具中止（视图域隔离——view.store 零反向依赖）
      const decision = registry.loader.activate(entry)
      if (decision === 'reload') void registry.loader.load(entry)
      else if (decision === 'reconcile' && !noteDraftPending()) void entry.lane.reconcileNow() // #34：needsReload∧IO clean 单飞和解
    },

    save: () => activeEntry().lane.save(),
    saveActiveFolder: () => activeEntry().lane.finalize(),
    undo: () => activeEntry().lane.historyCommand('undo'),
    redo: () => activeEntry().lane.historyCommand('redo'),

    discardSession(folderId = registry.activeFolder()) {
      const old = registry.ensure(folderId)
      // 弃会话=同图新代际（迟到写不落新会话）：图态保留，queue/IO/历史/U/needsReload 清
      const entry = registry.replace(folderId, {
        nodes: old.data.nodes,
        edges: old.data.edges,
        lineTypeNames: old.data.lineTypeNames,
        floatingNotes: old.data.floatingNotes,
        paperMetrics: old.data.paperMetrics,
        pubNos: old.data.pubNos,
        tagNames: old.data.tagNames,
        status: old.data.status,
        error: old.data.error,
        focusSet: old.data.focusSet
      })
      if (entry.data.status === 'loading') void registry.loader.load(entry)
      markRecoveryClean('discard', folderId)
    },

    retrySave() {
      void activeEntry().lane.finalize()
    },

    /** [回炉 W-B3·R-D1] 丢弃过期历史（保存错误行出口——用户点击并确认后调用，不静默自动跳过；不写数据库）：
     *  只移除该方向栈顶的过期项并清该次失败的错误态；needsReload 保留（下次命令入链先和解）。不动另一
     *  方向栈、图四面、U 与 editRevision。项已不在栈顶（标记失效）或写链在途＝动作不适用、零副作用——
     *  写链在途时不与 history-unit 的移栈并发改栈（applyResponse 按位置弹栈顶） */
    discardStaleHistory() {
      const entry = activeEntry()
      const next = dropStaleHistory(entry.data)
      if (next === null || entry.data.inflight !== null) return
      registry.writeEntry(entry, {
        ...next,
        lastWriteError: null,
        // 该次失败的 error 已清——相位按 Q（settledIoPhase 见 error 即保留，故以 clean 为输入取「清后按 Q」）
        saveStatus: settledIoPhase({ queue: entry.data.queue, inflight: entry.data.inflight, saveStatus: 'clean' })
      })
    },

    /** 恢复载入（§2.5 #39：目标会话 Q=payload.queue、U=1、H/R 清；其他 folder 不动）。
     *  [回炉 W-B2c] 同时置恢复待令标记（定义见 lineage-session-registry 头注）：恢复图留待首次命令入链时和解 */
    applyRecoverySession(payload) {
      const folderId = payload.folderId
      registry.replace(folderId, {
        status: 'ready',
        error: null,
        nodes: payload.graph.nodes,
        edges: payload.graph.edges,
        lineTypeNames: payload.graph.lineTypeNames,
        floatingNotes: payload.graph.floatingNotes,
        queue: payload.queue,
        saveStatus: 'dirty',
        lastWriteError: null,
        unfinalized: true, // 崩溃后内存史本就不存在
        // [INV-175] 恢复会话权威存疑：载入即置位（语义=「图态与库态偏离待和解」
        // ——恢复恒存疑，无残值亦置位；与图应用同一 set 补丁=原子无半载态）
        needsReload: true, // 新代际——旧读属孤儿会话不可应用
        restoredAwaitingCommand: true, // [回炉 W-B2c] 恢复待令：脉络页挂载/返回不自动和解（W-B2·R-W2 回归的修复点）
        invalidationEpoch: 0
      })
      if (registry.activeFolder() !== folderId) registry.activate(folderId) // 路由到恢复的目标会话
      useLineageViewStore.getState().clearFocus()
      useLineageViewStore.getState().resetTool()
    },

    applyDerivedFields(derived: { paperMetrics: Record<string, LineagePaperMetrics>; pubNos: Record<string, number>; tagNames: Record<string, string[]> }) {
      registry.update(registry.activeFolder(), derived)
    },

    // 星标=非撤销维度：不 editUnit/不入队（乐观翻转→api 直写；失败回滚+toast）
    async toggleNodeStar(target) {
      // [回炉 W-B2·R-W5] 闭包寻址发起时所属的会话＋捕获身份戳：失败回滚经脉络域唯一准入函数
      // admitWriteback（§2.6 #43）——回执到达时会话已被替换/换代则丢弃回滚，不写该键下的新会话
      const entry = registry.ensure(registry.activeFolder())
      const stamp = captureStamp(entry.data)
      const next = target.isStarred !== true
      const prev = target.isStarred
      const flip = (starred: boolean | undefined): void =>
        registry.writeEntry(entry, { nodes: entry.data.nodes.map((n) => (n.id === target.id ? { ...n, isStarred: starred } : n)) })
      flip(next)
      try {
        await unwrap(api.papers.setStarred({ paperId: target.paperId, starred: next }))
      } catch (e) {
        if (admitWriteback(targetOf(entry.data, registry.isAlive(entry)), stamp)) flip(prev)
        showToast(e instanceof ApiClientError ? e.message : '星标操作失败', 'error')
      }
    },

    /** [§9.3] 拖放落位写：只到拖拽激活时捕获的会话；会话已失效=丢弃并提示。
     *  [回炉 W-B2·R-B2] 走内部 settle 写路径（lane.settleEdit）：串行于原会话写链、不经用户编辑闸
     *  （quit/recovery/conflict 冻结、同会话 saving 锁——原缺陷：quit closing 时落位被冻结门静默
     *  吞掉，退出握手仍按 clean 回执）。落位写留在暂存，落库由出口紧随其后的 flush 或 idle timer
     *  承担；写失败=error+队首保留，由 IO 查态承接。
     *  身份准入=folderId+generation+drag id（registry.admitDragLanding：就地换代的存活会话按 dragId
     *  重锚——[回炉 W-B2·实验①]）。返回 true=落位已被会话写链接纳；false=会话已失效（丢弃并提示） */
    reorderMonthSlots(target: LineageDragTarget, nodeIds) {
      if (!registry.admitDragLanding(target)) {
        showToast('拖拽调整的目标图已不在当前会话，本次落位未写入', 'error')
        return false
      }
      registry.dragEnd(target.folderId, target.generation, target.dragId) // 数据写前清两态（等待者唤醒）
      const entry = registry.entry(target.folderId)
      if (entry === undefined) return false
      void entry.lane.settleEdit(() => entry.lane.commands.applyObstacleReroute(nodeIds))
      return true
    }
  }
})

// [B4 L2] 活动投影写闸：外部 setState（宿主/夹具植入）同样经 registry 单一写路径
useLineageStore.setState = ((patch: StorePatch) => registry.patchActive(patch)) as typeof useLineageStore.setState
// [B4 L2 环拆] note-draft 访问面绑定（本件求值期末——见 lineage-note-draft 头注）
bindLineageStoreApi(useLineageStore)
// [回炉 W-B2·D-3] 草稿变更沿→活动会话 idle timer 重排（草稿属活动图；绑定位同上——注册族不静态
// import store/registry/lane）
setNoteDraftChangeSink(() => activeEntry().lane.draftChanged())
