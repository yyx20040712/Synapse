/**
 * [SR-IPC-09] ipc/system —— 系统域装配（工单：open / weak）
 *
 * ── 行为层 ──
 * - openExternal：({ url }) → security/shell-guard 的 openExternalGuarded(deps.shell, url)
 *   → 未通过校验抛 DomainError(code='INVALID_REQUEST')；通过 → { ok: true }
 *
 * ── 接口层 ──
 * - export function createSystemIpc(deps: IpcDeps): ApiHandlers['system']
 *
 * ── 架构层 ──
 * - 唯一经守卫的外链出口（安全 §6.2）；除 shell-guard 外无其他依赖
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 测试：tests/unit/ipc/system.test.ts（已锁定，shell 桩 + 攻击向量）
 */
import { unimplementedObject } from '../../shared/app-error'
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { IpcDeps } from './index'

export function createSystemIpc(_deps: IpcDeps): ApiHandlers['system'] {
  return unimplementedObject<ApiHandlers['system']>('SR-IPC-09', 'ipc.system')
}
