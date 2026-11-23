/**
 * [B4-A R2 §10.1/§11.1/§15] use-save-aggregates —— App 组合根保存聚合 hook
 * （IO quitDirty / U 角标 / lineagePending 分列单源）。
 *
 * ── 行为层 ──
 * - quitDirty（INV-22/INV-187）：只消费 IO（annotations 失败残留 ∪ notes
 *   pending ∪ lineage IO ∪ 悬浮笔记草稿）——unfinalized 不参与（灰点不卡
 *   退出；§2.5 #37「U 不进入 stillDirty」）。
 * - lineagePending（INV-91 S1 队列闸）：=lineage IO（saveStatus≠clean）——U
 *   不参与 folders/papers 结构写互斥。
 * - readerUnfinalized：全部打开 tab 的 U OR（rail 阅读器角标输入）。
 * - lineageUnfinalized：R2 阶段恒 false 占位（主控终裁 7——lineage 真实
 *   U/finalize/历史接线整体随 L1，届时接管并移除本占位）；消费方=Rail 脉络
 *   角标与 R2 占位测试（禁无消费预留）。
 *
 * ── 接口层 ──
 * - export const LINEAGE_UNFINALIZED_R2（L1 移除锚）
 * - export function useSaveAggregates(): SaveAggregates
 *
 * ── 架构层 ──
 * - app 组合根件：可引各域 facade（tab-dirty/lineage.store hooks——App 同层
 *   先例）；三 hook 无条件调用（Rules of Hooks——app-quit-dirty 回归锁）。
 */
import { useTabAutosaveSignals, useTabUnfinalizedAggregate } from '../features/reader/state/tab-dirty'
import { useLineageDirty } from '../features/lineage/lineage.store'
import { useNoteDraftPending } from '../features/lineage/lineage-note-draft'

/**
 * [B4-A R2 §15 R2 占位——主控终裁 7] lineage unfinalized 恒 false 占位常量：
 * rail 脉络角标本阶段恒 false（reader 角标正常翻转）；L1 接管真实 U 时删除
 * 本常量与占位断言（禁遗留无消费占位）。
 */
export const LINEAGE_UNFINALIZED_R2 = false as const

export interface SaveAggregates {
  /** 退出拦截上报（IO 单源——U 不入） */
  quitDirty: boolean
  /** rail 阅读器角标（全部打开 tab U OR） */
  readerUnfinalized: boolean
  /** rail 脉络角标（R2 恒 false 占位——L1 换真值） */
  lineageUnfinalized: boolean
  /** INV-91 结构写互斥输入（lineage IO 单源） */
  lineagePending: boolean
}

export function useSaveAggregates(): SaveAggregates {
  const { annoDirty, notePending } = useTabAutosaveSignals()
  const lineageDirty = useLineageDirty()
  const noteDraft = useNoteDraftPending()
  const readerUnfinalized = useTabUnfinalizedAggregate()
  return {
    quitDirty: annoDirty || notePending || lineageDirty || noteDraft,
    readerUnfinalized,
    lineageUnfinalized: LINEAGE_UNFINALIZED_R2,
    lineagePending: lineageDirty
  }
}
