/**
 * [B4-A R2 §10.1/§11.1/§15 → B4 L1 接管] use-save-aggregates —— App 组合根保存聚合
 * hook（IO quitDirty / U 角标 / lineagePending 分列单源）。
 *
 * ── 行为层 ──
 * - quitDirty（INV-22/INV-187）：只消费 IO（annotations 失败残留 ∪ notes
 *   pending ∪ lineage IO ∪ 悬浮笔记草稿）——unfinalized 不参与（灰点不卡
 *   退出；§2.5 #37「U 不进入 stillDirty」）。
 * - lineagePending（INV-91 S1 队列闸）：=全 registry lineage IO（任一会话
 *   Q∨inflight∨error）——U 不参与 folders/papers 结构写互斥。
 * - readerUnfinalized：全部打开 tab 的 U OR（rail 阅读器角标输入）。
 * - lineageUnfinalized：[B4 L2] 全 registry 会话 unfinalized OR（rail 脉络角标）。
 *
 * ── 接口层 ──
 * - export function useSaveAggregates(): SaveAggregates
 *
 * ── 架构层 ──
 * - app 组合根件：可引各域 facade（tab-dirty/lineage.store hooks——App 同层
 *   先例）；hook 无条件调用（Rules of Hooks——app-quit-dirty 回归锁）。
 */
import { useTabAutosaveSignals, useTabUnfinalizedAggregate } from '../features/reader/state/tab-dirty'
import { useLineageDirty, useLineageUnfinalized } from '../features/lineage/lineage.store'
import { useNoteDraftPending } from '../features/lineage/lineage-note-draft'

export interface SaveAggregates {
  /** 退出拦截上报（IO 单源——U 不入） */
  quitDirty: boolean
  /** rail 阅读器角标（全部打开 tab U OR） */
  readerUnfinalized: boolean
  /** rail 脉络角标（当前 lineage 会话 U） */
  lineageUnfinalized: boolean
  /** INV-91 结构写互斥输入（lineage IO 单源） */
  lineagePending: boolean
}

export function useSaveAggregates(): SaveAggregates {
  const { annoDirty, notePending } = useTabAutosaveSignals()
  const lineageDirty = useLineageDirty() // 全 registry IO（registry 订阅单源）
  const lineageUnfinalized = useLineageUnfinalized() // 全 registry U OR
  const noteDraft = useNoteDraftPending()
  const readerUnfinalized = useTabUnfinalizedAggregate()
  return {
    quitDirty: annoDirty || notePending || lineageDirty || noteDraft,
    readerUnfinalized,
    lineageUnfinalized,
    lineagePending: lineageDirty
  }
}
