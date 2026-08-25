// b3: P7-B
/**
 * [SR2-TABS-04] 主窗口 —— 退出拦截（工单：done / strong）
 * （承接 SR-INFRA-09 安全 webPreferences 职责——历史规约见 git；本头注为
 * P7-B 增量工单规约，安全件现状=配置即测试全部保留）
 *
 * ── 行为层 ──
 * - 退出拦截状态机：
 *   | 态 | 含义 | 事件→迁移 |
 *   | clean | renderer 上报 dirty=false（或启动初值） | close 请求 → 直接放行（默认行为） |
 *   | dirty | 任一 tab 有未落库/保存失败（TABS-03 聚合上报） | close 请求 → preventDefault +
 *     main 侧 showMessageBox 二次确认（「有未保存修改，确认退出？」确认/取消） |
 *   | dirty + 确认 | 用户确认退出 | win.destroy() 强制关闭（绕过 close 再拦截） |
 *   | dirty + 取消 | 用户取消 | 回 dirty 态（窗口保持） |
 * - dirty 上报通道（新 IPC，api-surface 受锁 [locked-change]）：
 *   system/set-quit-dirty { dirty: boolean } → void——renderer 在聚合 dirty
 *   变化沿（false→true / true→false）上报；main 侧模块级缓存最近值（push 模式，
 *   避免 close 时反向询问 renderer 的时序复杂度）
 * - 防重入：确认对话框弹出期间再点 close → 忽略（对话框模态天然挡住，记录依据）
 *
 * ── 接口层 ──
 * - export function createMainWindow(...) 不变（装配内加 close 监听）
 * - export function quitDirtyGuard deps 注入（dialogs.showMessageBox）——纯逻辑
 *   可测（决定 preventDefault 与否的判定函数导出）
 *
 * ── 架构层 ──
 * - main/windows 层；新通道走 shared/ipc/api-surface.ts 接线表（zod strict，
 *   preload 自动生成桥——架构 §3 契约机制）；不引入 renderer 反向 invoke
 * - 接缝（本工单改动面，file:line）：shared/ipc/api-surface.ts（set-quit-dirty
 *   通道记录，受锁 [locked-change]）/ ipc/system.ts:1-（通道 handler 注册）/
 *   renderer 上报点=App.tsx 或 reader 组合根 effect watch useTabDirtyAggregate
 *   （TABS-03 产出）→ api.system.setQuitDirty
 *
 * ── 生命周期层 ──
 * - 预留：before-quit 级联（多窗口未来不适用——单窗口负面清单）；不做：
 *   保存并退出一键动作（autosave-first 下确认即放弃未落库增量）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/windows/quit-dirty-guard.test.ts（新建，受锁）：clean
 *   放行/dirty 拦截+确认 destroy/dirty 拦截+取消保持 + tests/unit/ipc/system.test.ts
 *   扩展（新通道注册断言）+ tests/contracts/preload-surface.test.ts 自动对账
 *   （新通道桥暴露）——IPC 闭环三面锚，plan 门 NIT2 处置；
 *   web-preferences.test.ts 安全面全量保留不回归
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

// ── 退出拦截（TABS-04 行为层）──────────────────────────────────────

/** renderer push 上报的 dirty 缓存（push 模式：close 时无需反向询问 renderer，
 *  规避 close 事件内再等 renderer 应答的时序复杂度——头注行为层裁决） */
let quitDirtyCached = false

/** IPC 上报落点（bootstrap 注入 IpcDeps.setQuitDirty → 此处） */
export function setQuitDirty(dirty: boolean): void {
  quitDirtyCached = dirty
}

export function getQuitDirty(): boolean {
  return quitDirtyCached
}

/** 判定函数（头注接口层要求导出）：dirty → 拦截；clean → 放行默认关闭 */
export function quitDirtyGuard(dirty: boolean): boolean {
  return dirty
}

/** 确认框文案单源（测试锚定同一常量——INV-11 精神） */
export const QUIT_CONFIRM_MESSAGE =
  '有未保存的修改（灰点标记的标签页），退出后将丢失未落库部分。确认退出？'

export interface QuitGuardDeps {
  /** 确认框（模态）：resolve true=确认退出，false=取消 */
  confirmQuit: (message: string) => Promise<boolean>
}

/**
 * close 事件守卫流（导出供测试与 bootstrap 装配复用）：
 * clean 放行；dirty → preventDefault → 确认框 → 确认=destroy 强制关闭（destroy
 * 不再触发 close，无重入）/取消=窗口保持（dirty 缓存不迁）。确认框模态天然挡住
 * 弹出期间的重复 close（头注防重入依据）。对话框异常按取消处理：窗口保持可
 * 重试，避免 preventDefault 后关闭路径死锁（deepseek W1 处置）。
 */
export async function handleCloseWithQuitGuard(
  dirty: boolean,
  event: { preventDefault(): void },
  win: { destroy(): void },
  deps: QuitGuardDeps
): Promise<void> {
  if (!quitDirtyGuard(dirty)) return
  event.preventDefault()
  let confirmed = false
  try {
    confirmed = await deps.confirmQuit(QUIT_CONFIRM_MESSAGE)
  } catch {
    confirmed = false
  }
  if (confirmed) win.destroy()
}
