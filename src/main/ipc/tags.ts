/**
 * [SR-IPC-04] ipc/tags —— 标签域装配（工单：done / weak + P7E-01）
 *
 * ── 行为层 ──
 * - 纯委托：list→services.tags.list；upsert→….upsert；attach→…；detach→…；
 *   rename/merge/delete→…（P7E-01 生命周期三通道）
 * - 本文件没有任何业务逻辑，每方法一行转调
 *
 * ── 接口层 ──
 * - export function createTagsIpc(deps: IpcDeps): ApiHandlers['tags']
 *
 * ── 架构层 ──
 * - 只 import：IpcDeps 类型、ApiHandlers 契约类型（services 形状）
 * - 禁 import repos/db（分层单向：ipc → services）；zod 校验由 register 统一做
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 同 ipc/library
 * - 测试：tests/unit/ipc/tags.test.ts（已锁定，services 桩）
 */
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { IpcDeps } from './ipc-deps'

export function createTagsIpc(deps: IpcDeps): ApiHandlers['tags'] {
  return {
    list: (req) => deps.services.tags.list(req),
    upsert: (req) => deps.services.tags.upsert(req),
    attach: (req) => deps.services.tags.attach(req),
    detach: (req) => deps.services.tags.detach(req),
    rename: (req) => deps.services.tags.rename(req),
    merge: (req) => deps.services.tags.merge(req),
    delete: (req) => deps.services.tags.delete(req),
    // [F-TAGS-01] 标签颜色（纯委托同型——一行转调）
    setColor: (req) => deps.services.tags.setColor(req)
  }
}
