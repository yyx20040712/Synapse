/**
 * ipc/folders —— 文件夹域装配（[F-FOLDER-01]：四通道薄分发）。
 *
 * 薄委托（SR-IPC-* 同型）：业务在 services/folders.service（校验序/S1 闸/
 * 事件广播全在 service）；IPC 层零守卫零业务。域错误（INVALID_REQUEST/
 * NOT_FOUND/CONFLICT）原样上抛，由 register 折叠为 Result。
 */
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { IpcDeps } from './ipc-deps'

export function createFoldersIpc(deps: IpcDeps): ApiHandlers['folders'] {
  return {
    list: (req) => deps.services.folders.list(req),
    create: (req) => deps.services.folders.create(req),
    rename: (req) => deps.services.folders.rename(req),
    delete: (req) => deps.services.folders.delete(req)
  }
}
