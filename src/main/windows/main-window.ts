/**
 * 主窗口（SR-INFRA-09，已完成）。
 *
 * 职责：安全 webPreferences 的唯一出处（配置即测试）+ 窗口级护栏。
 * 安全（§6.1/§6.2）：sandbox/contextIsolation 全开、禁导航、禁弹窗、
 * 权限请求默认拒绝；devTools 仅开发模式。
 * 测试：tests/security/web-preferences.test.ts。
 */
import type { BrowserWindow, HandlerDetails, WebPreferences } from 'electron'

export const WINDOW_SECURITY_FLAGS = {
  sandbox: true,
  contextIsolation: true,
  nodeIntegration: false,
  nodeIntegrationInWorker: false,
  webSecurity: true,
  allowRunningInsecureContent: false,
  experimentalFeatures: false,
  webviewTag: false,
  navigateOnDragDrop: false
} as const satisfies WebPreferences

export interface MainWindowLoad {
  devServerUrl?: string
  entryFile: string
  /** preload 脚本绝对路径（沙箱桥，必须 CJS——沙箱渲染器不支持 ESM preload） */
  preloadScript: string
  isDev: boolean
}

export function windowOpenPolicy(): { action: 'deny' } {
  return { action: 'deny' }
}

/**
 * 权限策略：最小放行清单——仅剪贴板写（'clipboard-sanitized-write'，复制引文/选区
 * 功能所需；内容全部本地自有，CSP 锁死无远程文档，无注入面），其余（通知/定位/
 * 摄像头/剪贴板读…）一律拒绝。剪贴板读保持拒绝：应用无读剪贴板需求。
 */
const ALLOWED_PERMISSIONS: ReadonlySet<string> = new Set(['clipboard-sanitized-write'])

export function permissionPolicy(): (
  _wc: unknown,
  permission: string,
  callback: (granted: boolean) => void
) => void {
  return (_wc, permission, callback) => callback(ALLOWED_PERMISSIONS.has(permission))
}

/** 创建主窗口并挂载护栏（BrowserWindow 类型由调用方传入避免测试依赖 electron） */
export function createMainWindow(
  BrowserWindowCtor: typeof BrowserWindow,
  load: MainWindowLoad,
  bounds: { x?: number; y?: number; width: number; height: number }
): BrowserWindow {
  const win = new BrowserWindowCtor({
    ...bounds,
    show: false,
    autoHideMenuBar: true,
    title: 'Synapse Remake',
    webPreferences: {
      ...WINDOW_SECURITY_FLAGS,
      preload: load.preloadScript,
      devTools: load.isDev
    } as WebPreferences
  })

  win.once('ready-to-show', () => win.show())

  // 护栏：禁止任何导航与弹窗（内容只来自本地构建产物/dev server）
  win.webContents.on('will-navigate', (event) => event.preventDefault())
  win.webContents.setWindowOpenHandler((_details: HandlerDetails) => windowOpenPolicy())
  // 护栏：权限请求按最小放行清单处理（仅剪贴板写，见 permissionPolicy；
  // 未挂载时 Electron 默认全部授予；handler 挂在 session 上）
  win.webContents.session.setPermissionRequestHandler(permissionPolicy())

  if (load.devServerUrl) {
    void win.loadURL(load.devServerUrl)
  } else {
    void win.loadFile(load.entryFile)
  }

  return win
}
