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
 * - 退出拦截状态机（[F-VISFB-14] 退出握手 flush-first 升级——C-A3 翻案面）：
 *   | 态 | 含义 | 事件→迁移 |
 *   | clean | renderer 上报 dirty=false（或启动初值） | close 请求 → 直接放行（默认行为） |
 *   | dirty | 任一写面未落库/失败（TABS-03∪lineage 聚合上报） | close → preventDefault +
 *     renderer flush（quitFlush 事件→reportQuitFlush 回执；有限超时
 *     QUIT_FLUSH_TIMEOUT_MS；flushing 重入锁=二次 close 单发） |
 *   | dirty + flush 净 | 收口后最新判定 stillDirty=false | win.destroy() 零确认（数据已存） |
 *   | dirty + 仍脏/超时/发送异常 | flush 失败或超时降级 | main 侧 showMessageBox 二次确认
 *     （QUIT_CONFIRM_MESSAGE 同族——「未能自动保存…确认退出？」） |
 *   | dirty + 确认 | 用户确认退出 | win.destroy() 强制关闭（绕过 close 再拦截） |
 *   | dirty + 取消 | 用户取消 | 回 dirty 态（窗口保持） |
 * - dirty 上报通道（新 IPC，api-surface 受锁 [locked-change]）：
 *   system/set-quit-dirty { dirty: boolean } → void——renderer 在聚合 dirty
 *   变化沿（false→true / true→false）上报；main 侧模块级缓存最近值（push 模式，
 *   避免 close 时反向询问 renderer 的时序复杂度）
 * - 防重入：确认对话框弹出期间再点 close → 忽略（对话框模态天然挡住，记录依据）
 * - 窗控四 action（R2-SH3）：minimize/maximize-toggle/close/get-state——close 走
 *   win.close() **绝不 destroy**（保上方 TABS-04 拦截链）；get-state 只读零副作用
 *
 * ── 接口层 ──
 * - export function createMainWindow(...) 不变（装配内加 close 监听）
 * - export function quitDirtyGuard deps 注入（dialogs.showMessageBox）——纯逻辑
 *   可测（决定 preventDefault 与否的判定函数导出）
 * - export function controlWindow(win: WindowLike, action: WindowControlAction)：
 *   执行后 isMaximized() 回读返回
 * - export function bindWindowStateEvents(win: MaximizeEventsLike, send)：maximize
 *   沿 → send({maximized:true}) / unmaximize 沿 → send({maximized:false})；
 *   F-G9 fullscreen 沿同入反映面（enter→true / leave→回读 isMaximized()）
 *
 * ── 架构层 ──
 * - main/windows 层；新通道走 shared/ipc/api-surface.ts 接线表（zod strict，
 *   preload 自动生成桥——架构 §3 契约机制）；不引入 renderer 反向 invoke
 * - 接缝（本工单改动面，file:line）：shared/ipc/api-surface.ts（set-quit-dirty +
 *   window-control 通道与 windowState 事件记录，受锁 [locked-change]）/
 *   ipc/system.ts:1-（通道 handler 注册）/ renderer 上报点=App.tsx 或 reader
 *   组合根 effect watch useTabDirtyAggregate（TABS-03 产出）→ api.system.setQuitDirty
 *
 * ── 生命周期层 ──
 * - 预留：before-quit 级联（多窗口未来不适用——单窗口负面清单）；不做：
 *   保存并退出一键动作（autosave-first 下确认即放弃未落库增量）
 * - window-state.ts bounds 记忆不受影响（仅记忆 x/y/w/h，已存行为）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/windows/quit-dirty-guard.test.ts（clean 放行/dirty 拦截+
 *   确认 destroy/dirty 拦截+取消保持）+ tests/unit/ipc/system.test.ts 扩展
 *   （新通道注册断言）+ tests/contracts/preload-surface.test.ts 自动对账
 *   （新通道桥暴露）——IPC 闭环三面锚，plan 门 NIT2 处置；
 *   web-preferences.test.ts 安全面全量保留不回归；
 *   tests/unit/windows/window-control.test.ts（R2-SH3：四 action/事件绑定/
 *   titleBarStyle/drag-no-drag 皮肤锁）
 */
import type { BrowserWindow, HandlerDetails, WebPreferences } from 'electron'
import type { AppSettings, WindowControlAction } from '../../shared/ipc/schemas'

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

// ── 退出拦截（TABS-04 行为层）──────────────────────────────────────

/** renderer push 上报的 dirty 缓存（push 模式：close 时无需反向询问 renderer，
 *  规避 close 事件内再等 renderer 应答的时序复杂度——头注行为层裁决） */
let quitDirtyCached = false

/** IPC 上报落点（bootstrap 注入 IpcDeps.setQuitDirty → 此处） */
export function setQuitDirty(dirty: boolean): void {
  quitDirtyCached = dirty
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

export function getQuitDirty(): boolean {
  return quitDirtyCached
}

/** 判定函数（头注接口层要求导出）：dirty → 拦截；clean → 放行默认关闭 */
export function quitDirtyGuard(dirty: boolean): boolean {
  return dirty
}

/**
 * 确认框文案单源（测试锚定同一常量——INV-11 精神）。
 * [F-VISFB-14 d1 W4④] 同族改值：退出握手 flush-first 落地后本框只在
 * 「自动保存失败或超时」分支出现（旧「有未保存的修改（灰点标记的标签页）」
 * 全量弹窗路径退役——flush 成功即静默关闭零确认）。
 */
export const QUIT_CONFIRM_MESSAGE =
  '有修改未能自动保存（保存失败或超时），退出后将丢失这部分修改。确认退出？'

export interface QuitGuardDeps {
  /** 确认框（模态）：resolve true=确认退出，false=取消 */
  confirmQuit: (message: string) => Promise<boolean>
}

/**
 * 确认→关闭共尾（守卫流与握手降级段共用）：QUIT_CONFIRM_MESSAGE 模态确认
 * →确认=destroy/取消=保持；对话框异常按取消处理（窗口保持可重试，避免
 * preventDefault 后关闭路径死锁）。
 */
async function confirmAndMaybeDestroy(
  win: { destroy(): void },
  deps: QuitGuardDeps
): Promise<void> {
  let confirmed = false
  try {
    confirmed = await deps.confirmQuit(QUIT_CONFIRM_MESSAGE)
  } catch {
    confirmed = false
  }
  if (confirmed) win.destroy()
}

/**
 * close 事件守卫流（[F-VISFB-14] 起 bootstrap 不再直接挂本函数——装配升级为
 * handleCloseWithQuitHandshake；保留导出=受锁 quit-dirty-guard.test 的降级
 * 路径同族锚+纯 confirm 面单测锚）：
 * clean 放行；dirty → preventDefault → 确认框 → 确认=destroy 强制关闭（destroy
 * 不再触发 close，无重入）/取消=窗口保持（dirty 缓存不迁）。确认框模态天然挡住
 * 弹出期间的重复 close（头注防重入依据）。
 */
export async function handleCloseWithQuitGuard(
  dirty: boolean,
  event: { preventDefault(): void },
  win: { destroy(): void },
  deps: QuitGuardDeps
): Promise<void> {
  if (!quitDirtyGuard(dirty)) return
  event.preventDefault()
  await confirmAndMaybeDestroy(win, deps)
}

// ── [F-VISFB-14] 退出握手（flush-first 三件套）────────────────────────
// 状态机（宪法前置，跨格序列=tests/unit/windows/quit-handshake.test.ts）：
// clean close=放行；dirty close=preventDefault→renderer flush（有限超时）→
// stillDirty=false=destroy 零确认／仍脏或超时或发送异常=confirm 降级（同上
// confirmAndMaybeDestroy）→确认=destroy/取消=保持；flushing 重入锁=二次
// close 单发（INV-141④）；迟到回执按 requestId 关联丢弃（超时后待答表除名）。

/** flush 请求待答表（requestId → resolver；超时除名→迟到回执零误伤） */
const quitFlushPending = new Map<string, (stillDirty: boolean) => void>()

/** requestId 单调序（模块级——进程内唯一） */
let quitFlushSeq = 0

/** flushing 重入锁：握手中（flush 等待段）的再次 close 忽略（单发） */
let quitFlushBusy = false

/** 单次 flush 请求（requestId 与回执 promise 成对——超时除名按 id） */
export interface QuitFlushCall {
  requestId: string
  result: Promise<boolean>
}

/**
 * flush 请求工厂（bootstrap 注入 webContents.send；测试注入桩 send）：
 * 每次调用自增 requestId 并登记待答表——回执经 reportQuitFlushResult 按 id
 * 关联 resolve。send 同步抛错=executor 内拒绝（调用侧 catch 按未知脏降级）。
 */
export function createQuitFlushRequest(
  send: (payload: { requestId: string }) => void
): () => QuitFlushCall {
  return () => {
    quitFlushSeq += 1
    const requestId = `quit-flush-${quitFlushSeq}`
    const result = new Promise<boolean>((resolve) => {
      quitFlushPending.set(requestId, resolve)
      send({ requestId })
    })
    return { requestId, result }
  }
}

/** renderer 回执落点（IPC system/report-quit-flush → ipc-deps 注入此函数）：
 *  待答表按 id 命中即 resolve+除名；未命中（超时已除名/未知 id）=迟到回执丢弃 */
export function reportQuitFlushResult(requestId: string, stillDirty: boolean): void {
  const resolve = quitFlushPending.get(requestId)
  if (resolve === undefined) return
  quitFlushPending.delete(requestId)
  resolve(stillDirty)
}

/**
 * 退出握手 flush 超时预算（提案值——主控集成窗核定）：
 * 单用户本地 SQLite，收口序列=串行 IPC 往返+本地写（毫秒级）；5s=三个数量级
 * 余量覆盖病态盘/AV 扫描，且不超用户感知挂起阈值（超时后 confirm 即出）。
 */
export const QUIT_FLUSH_TIMEOUT_MS = 5000

/** 有限超时等待：超时=按仍脏降级（true）并除名（迟到回执丢弃） */
function awaitQuitFlush(call: QuitFlushCall, timeoutMs: number): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => {
      quitFlushPending.delete(call.requestId)
      resolve(true)
    }, timeoutMs)
    call.result.then(
      (stillDirty) => {
        clearTimeout(timer)
        resolve(stillDirty)
      },
      () => {
        clearTimeout(timer)
        resolve(true)
      }
    )
  })
}

export interface QuitHandshakeDeps extends QuitGuardDeps {
  /** flush 请求（createQuitFlushRequest 产出） */
  requestQuitFlush: () => QuitFlushCall
  /** 超时预算（测试注入；缺省 QUIT_FLUSH_TIMEOUT_MS） */
  timeoutMs?: number
}

/**
 * [F-VISFB-14] close 事件握手流（bootstrap 装配面）：clean 放行；dirty →
 * preventDefault+flush（单发）→净=destroy 零确认／仍脏/超时/异常=confirm
 * 降级（confirmAndMaybeDestroy）→确认 destroy/取消保持。flush 等待段持
 * flushing 锁（二次 close=再 preventDefault 后忽略——不放行默认关闭）；
 * confirm 段已释放锁（模态挡沿承）。
 */
export async function handleCloseWithQuitHandshake(
  dirty: boolean,
  event: { preventDefault(): void },
  win: { destroy(): void },
  deps: QuitHandshakeDeps
): Promise<void> {
  if (!quitDirtyGuard(dirty)) return
  event.preventDefault()
  if (quitFlushBusy) return
  quitFlushBusy = true
  let stillDirty = true
  try {
    stillDirty = await awaitQuitFlush(deps.requestQuitFlush(), deps.timeoutMs ?? QUIT_FLUSH_TIMEOUT_MS)
  } catch {
    stillDirty = true
  } finally {
    quitFlushBusy = false
  }
  if (!stillDirty) {
    win.destroy()
    return
  }
  await confirmAndMaybeDestroy(win, deps)
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
 * 保 TABS-04 dirty 拦截链（确认退出的 destroy 只属于 handleCloseWithQuitGuard）。
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
