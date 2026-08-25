/**
 * [SR-IPC-09] ipc/system —— 系统域装配（工单：done / weak）
 *
 * ── 行为层 ──
 * - openExternal：({ url }) → security/shell-guard 的 openExternalGuarded(deps.shell, url)
 *   → 未通过校验抛 DomainError(code='INVALID_REQUEST')；通过 → { ok: true }
 * - setQuitDirty（TABS-04 增量）：({ dirty }) → deps.setQuitDirty 注入（bootstrap
 *   接 main-window 模块缓存）→ { ok: true }——renderer 聚合 dirty 变化沿 push 上报
 *
 * ── 接口层 ──
 * - export function createSystemIpc(deps: IpcDeps): ApiHandlers['system']
 *
 * ── 架构层 ──
 * - 唯一经守卫的外链出口（安全 §6.2）；除 shell-guard 外无其他依赖
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 测试：tests/unit/ipc/system.test.ts（openExternal shell 桩+攻击向量）；
 *   setQuitDirty 通道透传断言落 tests/unit/windows/quit-dirty-guard.test.ts
 *   （check-tickets 规则 5：guardedDescribe 文件须 import 工单登记文件）
 */
import type { AppErrorCode } from '../../shared/app-error'
import { openExternalGuarded } from '../security/shell-guard'
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { IpcDeps } from './index'

/** 域错误：外链未过守卫（拒绝即错，不静默） */
class SystemDomainError extends Error {
  readonly code: AppErrorCode

  constructor(code: AppErrorCode, message: string) {
    super(message)
    this.name = 'SystemDomainError'
    this.code = code
  }
}

export function createSystemIpc(deps: IpcDeps): ApiHandlers['system'] {
  return {
    async openExternal(req) {
      const check = await openExternalGuarded(deps.shell, req.url)
      if (!check.safe) {
        throw new SystemDomainError('INVALID_REQUEST', `拒绝打开外链：${check.reason ?? req.url}`)
      }
      return { ok: true as const }
    },
    async setQuitDirty(req) {
      deps.setQuitDirty(req.dirty)
      return { ok: true as const }
    }
  }
}
