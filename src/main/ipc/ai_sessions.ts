/**
 * ipc/ai_sessions —— AI 会话域装配（[F-DBCAMP-01 DB-2 U2]：ai-sessions/open+
 * list-messages 两通道薄转发）。open=openOrGetSession（每锚单活动会话入口）直包
 * Res={session}；listMessages=投影形（AiMessage[]）。零守卫零业务——校验归
 * register 的 zod、语义归 services/ai/ai-sessions.service。
 */
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { IpcDeps } from './ipc-deps'

export function createAiSessionsIpc(deps: IpcDeps): ApiHandlers['ai_sessions'] {
  return {
    open: async (req) => ({ session: await deps.services.aiSessions.openOrGetSession(req) }),
    listMessages: async (req) => ({
      messages: await deps.services.aiSessions.listMessages(req.sessionId)
    })
  }
}
