/**
 * 主进程入口（infra，无工单）——只做生命周期装配，不含任何业务。
 * app-file:// 协议 scheme 注册必须在 app ready 之前（Electron 限制）。
 */
import { app, dialog, protocol } from 'electron'
import { registerAppFileScheme } from './protocol/app-file.protocol'
import { bootstrap, type BootstrapContext } from './bootstrap'

// 单实例锁：防止两个实例写同一个 SQLite
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  registerAppFileScheme(protocol)

  let ctx: BootstrapContext | null = null

  app.whenReady().then(() => {
    void bootstrap(app)
      .then((context) => {
        ctx = context
      })
      .catch((e: unknown) => {
        // 磁盘满/库损坏/权限等启动失败必须让用户看见，而不是静默无窗退出
        console.error('[bootstrap-failed]', e)
        dialog.showErrorBox(
          'Synapse 启动失败',
          `初始化阶段发生错误，应用即将退出。\n\n${e instanceof Error ? e.message : String(e)}`
        )
        app.exit(1)
      })
  })

  app.on('second-instance', () => {
    for (const win of (ctx ? [ctx.window] : [])) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

  app.on('window-all-closed', () => {
    ctx?.shutdown()
    app.quit()
  })

  app.on('before-quit', () => {
    ctx?.shutdown()
  })
}
