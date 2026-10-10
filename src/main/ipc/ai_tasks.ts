/**
 * ipc/ai_tasks —— AI 任务域装配（[F-DBCAMP-01 DB-2 U2]：ai-tasks/list+cancel
 * 两通道薄转发——list=死过滤形短路+剥 payload 投影；cancel=NOT_FOUND/CONFLICT
 * 既有映射+targetTitle 回查。零守卫零业务——校验归 register 的 zod、语义归
 * ai-tasks.service。
 */
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { IpcDeps } from './ipc-deps'

export function createAiTasksIpc(deps: IpcDeps): ApiHandlers['ai_tasks'] {
  return {
    list: async (req) => ({ tasks: await deps.services.aiTasks.listTasksForUi(req) }),
    cancel: async (req) => ({ task: await deps.services.aiTasks.cancelTaskForUi(req.taskId) })
  }
}
