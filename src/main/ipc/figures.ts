/**
 * ipc/figures —— 图表提取管线域装配（[F-VISFB-43]：list/pending/begin/store/
 * complete 五通道薄分发）。会话编排在 services/figure-tasks.service（串行化
 * 前提+代际守卫头注单源）；IPC 层零守卫，域错误原样上抛由 register 折叠。
 */
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { IpcDeps } from './ipc-deps'

export function createFiguresIpc(deps: IpcDeps): ApiHandlers['figures'] {
  const svc = deps.services.figures
  return {
    list: async (req) => svc.listForPaper(req.paperId),
    pending: async () => ({ jobs: svc.listPending() }),
    begin: async (req) => svc.beginSession(req.paperId),
    store: (req) => svc.storeAsset(req),
    complete: async (req) => svc.completeSession(req)
  }
}
