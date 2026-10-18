// b3: P7-B
/**
 * [SR2-TABS-04] 主窗口 —— 退出拦截（工单：done / strong）
 * （承接 SR-INFRA-09 安全 webPreferences 职责——历史规约见 git；本头注为
 * P7-B 增量工单规约，安全件现状=配置即测试全部保留）
 * [R2-SH3 增量] frameless 标题栏合并（bilibili 式）：options 加
 * titleBarStyle:'hidden'（自绘 caption 三键入 renderer 顶栏右区——皮肤在
 * theme.css；安全 flags 原样零触碰，titleBarStyle 非 webPreferences）+
 * controlWindow 四 action 纯逻辑 + bindWindowStateEvents 事件绑定（最小
 * 接口结构化类型，测试免依赖 electron 真体——文件内既有风格）。
 *
 * ── 行为层 ──
 * - 关闭入口无条件握手（[F-VISFB-64]——push 竞态根治，设计单源=docs/design/
 *   2026-10-18_f-visfb64-design.md）：close 一律 preventDefault+发起 quit-flush
 *   握手（缓存只决定等待分级，非放行依据）；状态机拆件=quit-close-policy.ts
 *   （I/WC/WD/C/D × 八类事件，纯 TS 零 Electron import），本件只留端口与订阅：
 *   | 态 | 含义 |
 *   | I | 空闲（取消后回此态；下次 close 新 id） |
 *   | WC/WD | 握手等待（首快照 clean=grace 1000ms／dirty=5000ms；WC 内
 *     dirty push 升级 WD，截止恒 t0+5000，WD 不降级） |
 *   | C | 确认等待（超时/仍脏/send 异常/renderer 崩溃降级——超时只确认不静默
 *     销毁；window-modal 模态挡重复 close） |
 *   | D | 终态（唯一 clean 销毁面=有效回执 false；确认退出同入；destroy 恰
 *     一次；dispose 幂等） |
 *   取消（C→I）发 quit-flush-abort 帧（requestId=epoch 水线，renderer 解冻
 *   closing gate+旧 epoch 转 orphan-pending）；QUIT_CONFIRM_MESSAGE 文案不变。
 * - dirty 上报通道：system/set-quit-dirty → setQuitDirty 喂 policy dirty-push
 *   （自持快照单一状态源）；lineagePending 缓存保留（INV-91 S1 队列闸）。
 * - 窗控四 action（R2-SH3）：minimize/maximize-toggle/close/get-state——close 走
 *   win.close() **绝不 destroy**（保上方拦截链）；get-state 只读零副作用
 *
 * ── 接口层 ──
 * - export function createMainWindow(...) 不变
 * - export function installQuitCloseInterception(win, deps)：装配 close/
 *   closed/render-process-gone 订阅+policy effects 适配（timer generation/
 *   confirm token/abort 帧发送失败承接）；返回 dispose（幂等）
 * - export function controlWindow(win, action)/bindWindowStateEvents(win, send)
 *
 * ── 架构层 ──
 * - main/windows 层；事件通道走 shared/ipc/api-surface.ts（quitFlush+
 *   quitFlushAbort，受锁 [locked-change]）；不引入 renderer 反向 invoke
 * - 接缝：ipc/system.ts+ipc-deps.ts（setQuitDirty/reportQuitFlush 落点）、
 *   bootstrap.ts（install 装配——now=performance.now/发帧/确认框）
 *
 * ── 生命周期层 ──
 * - 不做：保存并退出一键动作（autosave-first 下确认即放弃未落库增量）
 * - window-state.ts bounds 记忆不受影响（仅记忆 x/y/w/h，已存行为）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/windows/quit-close-policy.test.ts（状态机全表）+
 *   quit-handshake.test.ts（装配面）/quit-dirty-guard.test.ts（dirty 链+IPC
 *   透传）/window-control.test.ts（R2-SH3）；web-preferences.test.ts 安全面
 *   全量保留不回归；contracts 自动对账（preload-surface/api-surface-closure）
 */
import type { BrowserWindow, HandlerDetails, WebPreferences } from 'electron'
import type { AppSettings, WindowControlAction } from '../../shared/ipc/schemas'
import { createQuitClosePolicy, type QuitClosePolicy } from './quit-close-policy'

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
  /** [T3-U1] FOUC 首帧兜底：启动主题档（bootstrap 经 settings.service
   *  readThemeSync 同步读）——loadURL 拼 query / loadFile {query} 选项承载，
   *  renderer 首帧脚本（public/theme-boot.js）消费；缺省=零附参（旧调用面兼容） */
  startupTheme?: AppSettings['theme']
}

export function windowOpenPolicy(): { action: 'deny' } {
  return { action: 'deny' }
}

/**
 * 导航护栏判定（纯函数，安全件——allow+deny 双面单测锚定）：
 * true=阻止（preventDefault）；false=放行（仅当前 URL 完全相同的重载——
 * R1-WS2 课题切换的 location.reload 路径，ADR-0018「全新 stores 零 stale
 * 态」；外站/异文件/data: 变体一律 deny——内容只来自本地构建产物/dev
 * server，护栏意图不变）。严格字符串相等：任何变体 URL（query/hash/data:）
 * 均不落入放行面。
 */
export function shouldBlockNavigation(currentUrl: string, targetUrl: string): boolean {
  return targetUrl !== currentUrl
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
    // R2-SH3：frameless（bilibili 式）——隐藏系统标题栏，caption 三键由 renderer
    // 顶栏自绘（TitleBarControls）；非 webPreferences，安全 flags 面零触碰
    titleBarStyle: 'hidden',
    title: 'Synapse',
    webPreferences: {
      ...WINDOW_SECURITY_FLAGS,
      preload: load.preloadScript,
      devTools: load.isDev
    } as WebPreferences
  })

  win.once('ready-to-show', () => win.show())

  // 护栏：禁止任何导航与弹窗（内容只来自本地构建产物/dev server）。
  // 唯一例外：同 URL 重载（renderer 的 location.reload——R1-WS2 课题切换
  // 机制，ADR-0018 裁决「全新 stores 零 stale 态」依赖本路径）；reload 也走
  // will-navigate，无条件 preventDefault 会吞掉它。其余导航（外站/别的文件/
  // data: 变体）仍禁——判定抽纯函数 shouldBlockNavigation（安全件 allow+
  // deny 双面单测锚定，门一回炉 W4）
  win.webContents.on('will-navigate', (event, url) => {
    if (shouldBlockNavigation(win.webContents.getURL(), url)) event.preventDefault()
  })
  win.webContents.setWindowOpenHandler((_details: HandlerDetails) => windowOpenPolicy())
  // 护栏：权限请求按最小放行清单处理（仅剪贴板写，见 permissionPolicy；
  // 未挂载时 Electron 默认全部授予；handler 挂在 session 上）
  win.webContents.session.setPermissionRequestHandler(permissionPolicy())

  // [T3-U1] FOUC 首帧兜底：theme 参随初始加载附上（双分支双形态——loadURL
  // 拼 searchParams / loadFile 走 {query} 选项[Electron 44 实测口径]）；
  // renderer 首帧脚本读参写 documentElement.dataset.theme（首帧前生效）
  if (load.devServerUrl) {
    const url = new URL(load.devServerUrl)
    if (load.startupTheme !== undefined) url.searchParams.set('theme', load.startupTheme)
    void win.loadURL(url.toString())
  } else {
    void win.loadFile(
      load.entryFile,
      load.startupTheme === undefined ? undefined : { query: { theme: load.startupTheme } }
    )
  }

  return win
}

// ── [F-VISFB-64] 关闭入口无条件握手（policy 端口与订阅）──────────────

/** policy 进程单例（IPC 落点经模块函数转发；装配先于 renderer 加载完成——
 *  无 push 丢失窗） */
let quitPolicy: QuitClosePolicy | null = null

/** IPC 上报落点（bootstrap 注入 IpcDeps.setQuitDirty → 此处）：喂 policy
 *  dirty-push——自持快照单一状态源（close 首快照的分级判定源，非放行依据） */
export function setQuitDirty(dirty: boolean): void {
  quitPolicy?.dirtyPush(dirty)
}

/** IPC 回执落点（system/report-quit-flush → policy receipt）：迟到/已除名/
 *  过期 id 在 policy 内丢弃（超时降级后不误伤后续握手） */
export function reportQuitFlushResult(requestId: string, stillDirty: boolean): void {
  quitPolicy?.receipt(requestId, stillDirty)
}

/** [F-FOLDER-01] INV-91 S1 队列闸判定缓存：renderer 脉络写队列 pending 信号
 *  （沿 setQuitDirty push 模式同型——folders/papers.move/updateMeta 写入口
 *  经 services deps.lineagePending 消费本缓存读；getLineagePending 判定源） */
let lineagePendingCached = false

/** IPC 上报落点（system.setQuitDirty 载荷 lineagePending 字段 → 此处） */
export function setLineagePending(pending: boolean): void {
  lineagePendingCached = pending
}

export function getLineagePending(): boolean {
  return lineagePendingCached
}

/**
 * 确认框文案单源（测试锚定同一常量——INV-11 精神）。
 * [F-VISFB-14 d1 W4④] 同族改值：退出握手 flush-first 落地后本框只在
 * 「自动保存失败或超时」分支出现（旧「有未保存的修改（灰点标记的标签页）」
 * 全量弹窗路径退役——flush 成功即静默关闭零确认）。[F-VISFB-64] 沿承不变。
 */
export const QUIT_CONFIRM_MESSAGE =
  '有修改未能自动保存（保存失败或超时），退出后将丢失这部分修改。确认退出？'

/** 订阅面最小形状（结构化类型：测试免依赖 electron 真体——文件内既有风格） */
export interface QuitEventSink {
  on(event: string, listener: (...args: never[]) => void): void
  removeListener(event: string, listener: (...args: never[]) => void): void
}

/** 装配窗口最小形状：close/closed 订阅+destroy+webContents 崩溃订阅+
 * isDestroyed 销毁态回读（真 BrowserWindow 本有此法——结构类型补形，
 * [64-e2e-hang]：teardown 须凭它跳过已亡窗的订阅摘除） */
export interface QuitInterceptionWindow extends QuitEventSink {
  destroy(): void
  webContents: QuitEventSink
  isDestroyed(): boolean
}

export interface QuitInterceptionDeps {
  /** 单调钟（Electron main performance.now——设计 §⑦ now() 注入口径） */
  now(): number
  /** quit-flush 发帧（同步抛错=send-failed 回灌 policy） */
  sendQuitFlushFrame(payload: { requestId: string }): void
  /** quit-flush-abort 发帧（C→I 解冻；抛错由 B 层兜底承接，policy 保持 I） */
  sendAbortFrame(payload: { requestId: string }): void
  /** 确认框（window-modal）：resolve true=确认退出，false=取消 */
  confirmQuit(message: string): Promise<boolean>
}

/**
 * 装配（bootstrap 主窗口段调用）：win close/closed + webContents
 * render-process-gone 订阅→policy 八类事件适配；effects 侧=timer generation
 * 适配/confirm token 适配/abort 帧发送失败承接。close 一律 preventDefault
 * （无条件握手——policy.close 仅 I 态起握，busy/C 态重复 close 忽略）。
 * 返回 dispose（幂等：清 timer+摘订阅+policy 死面）。
 */
export function installQuitCloseInterception(
  win: QuitInterceptionWindow,
  deps: QuitInterceptionDeps
): { dispose(): void } {
  const timer: { handle: ReturnType<typeof setTimeout> | null; generation: number } = {
    handle: null,
    generation: 0
  }
  let disposed = false
  let onClose: (event: { preventDefault(): void }) => void = () => undefined
  let onClosed: () => void = () => undefined
  let onGone: () => void = () => undefined
  const teardown = (): void => {
    if (disposed) return
    disposed = true
    if (timer.handle !== null) clearTimeout(timer.handle)
    timer.handle = null
    if (quitPolicy === policy) quitPolicy = null
    // closed 回调内 teardown 的现场：窗已销毁，订阅随对象消亡，触摸即抛
    // Object has been destroyed（64 e2e 挂起根因）
    if (win.isDestroyed()) return
    win.removeListener('close', onClose)
    win.removeListener('closed', onClosed)
    win.webContents.removeListener('render-process-gone', onGone)
  }
  const policy = createQuitClosePolicy(deps.now, {
    sendQuitFlush(requestId) {
      try {
        deps.sendQuitFlushFrame({ requestId })
      } catch {
        // 发送面异常（webContents 已亡等）：回灌 send-failed→清臂+除名→C
        policy.sendFailed()
      }
    },
    armTimer(deadline, generation) {
      if (timer.handle !== null) clearTimeout(timer.handle)
      timer.generation = generation
      timer.handle = setTimeout(() => {
        timer.handle = null
        policy.timerFired(generation)
      }, Math.max(0, deadline - deps.now()))
    },
    clearTimer(_deadline, generation) {
      if (generation === timer.generation && timer.handle !== null) {
        clearTimeout(timer.handle)
        timer.handle = null
      }
    },
    retireRequest(_requestId) {
      // 观测钩：除名自持于 policy（设计 §⑦ effects 所有权面——无外部待答表）
    },
    showConfirm(token) {
      // [回炉 W4] 同步抛错按取消同语义（对话框异常=取消沿承——C→I+abort）；
      // 异步 rejection 经第二回调同承接
      try {
        deps
          .confirmQuit(QUIT_CONFIRM_MESSAGE)
          .then(
            (confirmed) => policy.confirmResolved(token, confirmed),
            () => policy.confirmResolved(token, false)
          )
      } catch {
        policy.confirmResolved(token, false)
      }
    },
    closeConfirm() {
      // Electron showMessageBox 无编程关闭口：迟到确认经 token 失效承接
      // （C 态窗毁清理表——设计 §⑥）；token 已随 dispose 失效。
    },
    unfreezeRenderer(requestId) {
      try {
        deps.sendAbortFrame({ requestId })
      } catch {
        // I 保持（设计 §⑥「I|abort send-failed」）：abort 丢失由 bridge
        // 5000ms 有界复位兜底（B 层），不重试成循环
      }
    },
    destroyWindow() {
      win.destroy()
    },
    disposePolicy() {
      teardown()
    }
  })
  onClose = (event) => {
    // 无条件握手：close 一律拦截（缓存仅分级——preventDefault 不以快照为闸）
    event.preventDefault()
    policy.close()
  }
  onClosed = () => {
    policy.windowDestroyed()
  }
  onGone = () => {
    policy.rendererGone()
  }
  win.on('close', onClose)
  win.on('closed', onClosed)
  win.webContents.on('render-process-gone', onGone)
  quitPolicy = policy
  return {
    dispose: () => {
      policy.dispose()
      teardown()
    }
  }
}

// ── 窗控（R2-SH3 frameless caption 三键——main 侧单一真源）──────────

/** 可窗控窗口最小形状（结构化类型：测试免依赖 electron 真体） */
export interface WindowLike {
  minimize(): void
  maximize(): void
  unmaximize(): void
  /** 走 close 事件链（触发 TABS-04 拦截判定），destroy 由守卫流独占 */
  close(): void
  destroy(): void
  isMaximized(): boolean
}

/** maximize 事件源最小形状（win.on('maximize'/'unmaximize'/'enter-full-screen'/
 *  'leave-full-screen') + leave 后状态回读；结构化类型：测试免依赖 electron 真体） */
export interface MaximizeEventsLike {
  on(event: 'maximize', listener: () => void): void
  on(event: 'unmaximize', listener: () => void): void
  on(event: 'enter-full-screen', listener: () => void): void
  on(event: 'leave-full-screen', listener: () => void): void
  /** F-G9：leave-full-screen 后窗口可能回最大化态——回读真值而非恒 false */
  isMaximized(): boolean
}

/**
 * 四 action 窗控（票面行为层表）：close 调 win.close() **绝不 destroy**——
 * 保 TABS-04 拦截链（确认退出的 destroy 只属于退出握手装配）。
 * 统一返回执行后 isMaximized() 回读（get-state 只读零副作用）。
 */
export function controlWindow(win: WindowLike, action: WindowControlAction): { maximized: boolean } {
  switch (action) {
    case 'minimize':
      win.minimize()
      break
    case 'maximize-toggle':
      if (win.isMaximized()) {
        win.unmaximize()
      } else {
        win.maximize()
      }
      break
    case 'close':
      win.close()
      break
    case 'get-state':
      break
  }
  return { maximized: win.isMaximized() }
}

/**
 * maximize 状态推送绑定：事件沿（含双击 drag 区最大化等 Windows 系统行为触
 * 发的沿）→ send 回传 renderer 图标态；初值不在本函数——renderer 挂载时
 * get-state 拉取（主控预裁②：时序自包含，不依赖 effect 与 load 事件先后）。
 * F-G9：fullscreen 沿（F11 等走 enter/leave-full-screen 而非 maximize 沿，
 * v8 SH3 门一 C12）补入反映面——enter 视占满屏发 true；leave 回读
 * isMaximized()（离开后回最大化态图标不撒谎）。fullscreen 中点三键的
 * toggle 行为不在本票面（图标反映 Only），备案。
 */
export function bindWindowStateEvents(
  win: MaximizeEventsLike,
  send: (payload: { maximized: boolean }) => void
): void {
  win.on('maximize', () => send({ maximized: true }))
  win.on('unmaximize', () => send({ maximized: false }))
  win.on('enter-full-screen', () => send({ maximized: true }))
  win.on('leave-full-screen', () => send({ maximized: win.isMaximized() }))
}
