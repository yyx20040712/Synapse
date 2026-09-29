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
  /** [F-FOLDER-01] INV-91 S1 队列闸：renderer 脉络写队列 pending 上报落点。
   *  [回炉码 7/k1-W9] 必填化——原「可选+受锁桩工厂零改」理由已被同 diff
   *  桩工厂随迁证伪（makeIpcDeps 已提供该键）；装配缺失=typecheck 红（bootstrap
   *  装配契约锚）+system.test 调用面锚 */
  setLineagePending: (pending: boolean) => void
  /** R2-SH3 frameless 窗控：四 action 落点（bootstrap 闭包包主窗口） */
  controlWindow: (action: WindowControlAction) => { maximized: boolean }
  /** P7E-04 剪贴板写口（bootstrap 装配 electron.clipboard；测试桩零 electron）。
   *  可选=受锁 makeIpcDeps 桩工厂（tests/utils/ipc-deps.ts）零改——设必填即其
   *  返回字面量类型红；装配缺失时 export_ handler 响亮抛错（接线缺陷不静默丢写）。
   *  F-ELE-03：Electron 44 起 main 侧 clipboard.writeText Promise 化（W3C 对齐），
   *  返回类型同步（注入面 electron.clipboard 结构仍兼容） */
  clipboard?: { writeText(text: string): Promise<void> }
}
