/**
 * IPC 依赖形状（F-ARCH5 消环，2026-08-30 架构排查批）——IpcDeps 原定义在
 * 装配桶 index.ts，11 个域子模块反向引用装配桶取类型，构成桶文件类型环
 * （运行时无环但依赖图持续报警，且类型环→值环滑坡无防线）。移此单源后
 * 子模块改向本文件，环消除；装配桶显式 re-export 保持既有引用面。
 */
import type { WindowControlAction } from '../../shared/ipc/schemas'
import type { ServiceBundle } from '../services'
import type { Dialogs } from '../dialogs'
import type { ShellLike } from '../security/shell-guard'

export interface IpcDeps {
  services: ServiceBundle
  dialogs: Dialogs
  shell: ShellLike
  /** settings.json 所在目录 */
  userDataDir: string
  /** 网络诊断探活（http-client.pingHost 的包装，探 ALLOWED_REMOTE_HOSTS） */
  ping: (host: string) => Promise<{ ok: boolean; latencyMs: number }>
  /** TABS-04 退出拦截：renderer dirty 上报落点（main-window 模块缓存） */
  setQuitDirty: (dirty: boolean) => void
  /** R2-SH3 frameless 窗控：四 action 落点（bootstrap 闭包包主窗口） */
  controlWindow: (action: WindowControlAction) => { maximized: boolean }
}
