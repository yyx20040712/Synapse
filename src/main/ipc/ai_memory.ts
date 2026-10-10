/**
 * ipc/ai_memory —— AI 记忆手动域装配（[F-DBCAMP-01 DB-2 U2]：五通道薄转发——
 * list-by-scope（W-1 双语义）/create/update/delete/set-pinned。delete 的 Res=
 * trueAck（服务面返回删除前投影行——IPC 层折叠 {ok:true}，行快照供直接消费面）。
 * 零守卫零业务——校验归 register 的 zod、语义归 ai-memory-manual.service。
 */
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { IpcDeps } from './ipc-deps'

export function createAiMemoryIpc(deps: IpcDeps): ApiHandlers['ai_memory'] {
  const m = deps.services.aiMemoryManual
  return {
    listByScope: async (req) => ({ items: await m.listByScope(req) }),
    create: async (req) => ({ item: await m.create(req) }),
    update: async (req) => ({ item: await m.update(req) }),
    delete: async (req) => {
      await m.delete(req.id)
      return { ok: true as const }
    },
    setPinned: async (req) => ({ item: await m.setPinned(req.id, req.pinned) })
  }
}
