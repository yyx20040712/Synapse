/**
 * ipc/ai_cascade —— AI 级联预览域装配（[F-DBCAMP-01 DB-2 U2]：单通道
 * ai-cascade/preview——两次确认第一跳计数面；级联删除本体=020 触发器，删除
 * 路径经既有 papers/delete、folders/delete 通道）。零守卫零业务——校验归
 * register 的 zod、锚存在性/计数归 ai-cascade.service。
 */
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { IpcDeps } from './ipc-deps'

export function createAiCascadeIpc(deps: IpcDeps): ApiHandlers['ai_cascade'] {
  return {
    preview: async (req) => ({ counts: await deps.services.aiCascade.previewCounts(req) })
  }
}
