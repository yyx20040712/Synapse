/**
 * ipc/papers —— 文献域装配（[F-FOLDER-01]：papers/move-folder 单通道薄分发）。
 *
 * 移动/移出事务序（§3.4+W2）全在 services/library.service createPapersService；
 * IPC 层零守卫。域错误原样上抛由 register 折叠。
 */
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { IpcDeps } from './ipc-deps'

export function createPapersIpc(deps: IpcDeps): ApiHandlers['papers'] {
  return {
    moveFolder: (req) => deps.services.papers.moveFolder(req)
  }
}
