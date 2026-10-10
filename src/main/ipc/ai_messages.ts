/**
 * ipc/ai_messages —— AI 消息置顶域装配（[F-DBCAMP-01 DB-2 U2]：ai-messages/
 * set-pinned+list-pinned 两通道薄转发；域归属 ai_messages，服务面驻
 * aiSessions（setPinnedMessage/listPinnedMessages——会话域先例=tags 域桶键）。
 * 零守卫零业务——校验归 register 的 zod、语义归服务。
 */
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { IpcDeps } from './ipc-deps'

export function createAiMessagesIpc(deps: IpcDeps): ApiHandlers['ai_messages'] {
  return {
    setPinned: async (req) => ({
      message: await deps.services.aiSessions.setPinnedMessage(req.messageId, req.pinned)
    }),
    listPinned: async (req) => ({
      items: await deps.services.aiSessions.listPinnedMessages(req)
    })
  }
}
