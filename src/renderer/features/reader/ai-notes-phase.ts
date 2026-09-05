// b3: P7-G
/**
 * [F-SPLIT-01] ai-notes-phase —— AI 笔记六态判定纯函数件（自 AiNotesSection
 * 拆出 2026-09-05，经 AiNotesStatus 中转沉淀为纯域件——derivePhase 与六态表
 * 单源驻此，AiNotesStatus（呈现）/AiNotesSection（分节可见性）双消费）。
 *
 * ── 行为层（状态机表——观测=observe 四事实 per 当前篇 P；「AI 读文献」按钮行
 *   常驻头部（首次使用入口不悬空）；imported 非稳态移出（瞬时事件：导入完成
 *   →toast+list 刷新→稳态回 idle）──
 *
 *   | 态 | 触发事实（observe 输出） | 呈现 |
 *   | --- | --- | --- |
 *   | hidden | 无 job(P)+无未导入产物+无 DB 数据 | 仅按钮行（无状态行无分节） |
 *   | idle | 同 hidden 触发面但有 DB 数据（含已导入稳态） | 按钮行+分节（无状态行） |
 *   | pending | hasPendingJob(P) 且心跳不新鲜 | 「已请求 AI 阅读，等待 zcode 拾取…（上次状态：<state 自述>，可缺省）」 |
 *   | queued | hasPendingJob(P) 且心跳新鲜且 currentPaper≠P 或 =null | 「AI 正在处理队列（当前：他篇）…」；currentPaper=null 时无他篇名 |
 *   | reading | 心跳新鲜且 currentPaper=P | 「AI 正在读本文（state 自述文本）」 |
 *   | done-unimported | productExists(P) 且 !archivedExists(P) 且 job(P) 无 | 「AI 已读完，待导入」+「导入 AI 笔记」按钮 |
 *
 *   按钮禁用枚举：disabled=pending/queued/reading 三态（06 服务幂等为兜底，
 *   UI 禁用防误解双保险）；enabled=hidden/idle/done-unimported。
 *   跨格序列①~⑤见头注工单面（单测①③⑤已用例化；queued 经①的他篇路径）。
 */
import type { ObserveRes } from '@shared/ipc/schemas'

/** 六态（原 AiNotesSection Phase——判定域单源） */
export type Phase = 'hidden' | 'idle' | 'pending' | 'queued' | 'reading' | 'done-unimported'

/** 六态推导（判定事实=observe 四事实单源；跨格序列①~⑤由轮询/动作驱动态迁移） */
export function derivePhase(facts: ObserveRes | null | undefined, hasNotes: boolean, paperId: string): Phase {
  if (facts === null || facts === undefined) return hasNotes ? 'idle' : 'hidden'
  const st = facts.status
  if (st !== null && st.running && st.currentPaper === paperId) return 'reading'
  if (facts.hasPendingJob) return st !== null && st.running ? 'queued' : 'pending'
  if (facts.productExists && !facts.archivedExists) return 'done-unimported'
  return hasNotes ? 'idle' : 'hidden'
}
