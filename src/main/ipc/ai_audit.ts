/**
 * ipc/ai_audit —— AI 审计域装配（[F-DBCAMP-01 DB-2 U2]：单通道 ai-tasks/list-audit
 * ——通道前缀 ai-tasks（append-only 取证面语义归属任务族），域归属 ai_audit
 * （域 key 与通道前缀解耦先例=ai_sensor 域含 zcode-link/*）。服务面驻
 * aiTasks.listAudit（游标翻页剥 id 投影）。零守卫零业务。
 */
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { IpcDeps } from './ipc-deps'

export function createAiAuditIpc(deps: IpcDeps): ApiHandlers['ai_audit'] {
  return {
    list: async (req) => ({ rows: await deps.services.aiTasks.listAudit(req) })
  }
}
