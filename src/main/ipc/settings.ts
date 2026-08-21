/**
 * [SR-IPC-08] ipc/settings —— 设置域（工单：open / weak）
 *
 * ── 行为层 ──
 * - 自包含域（无独立 service）：settings.json 读写 + 网络诊断
 * - get：读 {userDataDir}/settings.json；不存在/损坏 → 返回默认
 *   { contactEmail: DEFAULT_CONTACT_EMAIL, theme: 'system' }（写回文件）
 * - set：校验后原子写（先写 .tmp 再 rename）
 * - diagNetwork：对 shared/constants 的 ALLOWED_REMOTE_HOSTS 逐个 deps.ping(host)，
 *   返回 [{host, ok, latencyMs}]（并发 Promise.all）
 *
 * ── 接口层 ──
 * - export function createSettingsIpc(deps: IpcDeps): ApiHandlers['settings']
 *
 * ── 架构层 ──
 * - 可 import：node:fs/promises、node:path、shared/constants、zod（appSettingsSchema）
 * - 读写一律 UTF-8（教训 C4：中文乱码防线）
 *
 * ── 生命周期层 ──
 * - 不做：主题热切换（renderer 读 theme 自行处理）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/ipc/settings.test.ts（已锁定，deps.userDataDir 用临时目录）
 */
import { unimplementedObject } from '../../shared/app-error'
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { IpcDeps } from './index'

export function createSettingsIpc(_deps: IpcDeps): ApiHandlers['settings'] {
  return unimplementedObject<ApiHandlers['settings']>('SR-IPC-08', 'ipc.settings')
}
