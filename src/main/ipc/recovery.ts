/**
 * ipc/recovery —— 恢复副本域装配（[F-VISFB-65 U4] 设计书 §2）。
 *
 * 薄分发（SR-IPC-* 同型）：编排/epoch/槽归属全部在 services/recovery/
 * recovery.service；本层零守卫透传（workspaceId 校验在 service——显式携带
 * ≠当前工作区=INVALID_REQUEST 折叠透传中文 reason）。
 * 服务实例=bootstrap 应用级单例（工作区隔离目录编排不入课题容器——切换随
 * currentWorkspaceId 原子更新）；装配缺失=响亮抛错（接线缺陷不静默丢副本，
 * clipboard 同型先例）。
 */
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { IpcDeps } from './ipc-deps'
import type { RecoveryService } from '../services/recovery/recovery.service'

export function createRecoveryIpc(deps: IpcDeps): ApiHandlers['recovery'] {
  const svc = (): RecoveryService => {
    if (deps.recovery === undefined) {
      throw new Error('recovery 服务未装配（bootstrap 装配缺失——恢复副本通道接线缺陷）')
    }
    return deps.recovery
  }
  return {
    peek: (req) => svc().peek(req),
    save: (req) => svc().save(req),
    read: (req) => svc().read(req),
    release: (req) => svc().release(req)
  }
}
