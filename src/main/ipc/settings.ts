/**
 * [SR-IPC-08][F-LAYER-01] ipc/settings —— 设置域薄分发
 *（业务已下沉 services/settings.service.ts，2026-09-19 零行为迁移）
 *
 * ── 行为层 ──
 * - 零业务：get/set/diagNetwork 三 handler 纯委托 service（行为全貌=
 *   service 头注；受锁测试经本层穿透锁业务，任一行为漂移=测试红）
 *
 * ── 接口层 ──
 * - export function createSettingsIpc(deps: IpcDeps): ApiHandlers['settings']
 * - 内部构造 createSettingsService({ userDataDir, ping }) 后透传
 *
 * ── 架构层 ──
 * - 只 import：IpcDeps/ApiHandlers（type）+ services/settings.service
 *   （ipc→services 方向不破）；本层不再触碰 node:fs 等实现件
 *
 * ── 生命周期层 ──
 * - 构造点=本工厂（方案 B——不挂 ServiceBundle，bootstrap/装配面零触碰）
 *
 * ── 文化层 ──
 * - 裁决书：docs/design/2026-09-18_complexity-governance-ruling.md
 *   裁决 6/§3 梯队四/§4 L1
 * - 测试：tests/unit/ipc/settings.test.ts（受锁零改，deps.userDataDir 用临时目录）
 */
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { IpcDeps } from './ipc-deps'
import { createSettingsService } from '../services/settings.service'

export function createSettingsIpc(deps: IpcDeps): ApiHandlers['settings'] {
  const service = createSettingsService({ userDataDir: deps.userDataDir, ping: deps.ping })
  return {
    get: (req) => service.get(req),
    set: (req) => service.set(req),
    diagNetwork: (req) => service.diagNetwork(req)
  }
}
