/**
 * 主进程入口（infra，无工单）——只做生命周期装配，不含任何业务。
 * app-file:// 协议 scheme 注册必须在 app ready 之前（Electron 限制）。
 */
import { app, protocol } from 'electron'
import { registerAppFileScheme } from './protocol/app-file.protocol'
import { bootstrap, type BootstrapContext } from './bootstrap'

// 单实例锁：防止两个实例写同一个 SQLite
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  registerAppFileScheme(protocol)

  let ctx: BootstrapContext | null = null

  app.whenReady().then(() => {
    void bootstrap(app).then((context) => {
      ctx = context
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
