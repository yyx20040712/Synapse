/**
 * 组装根（SR-INFRA-11，已完成；R1-WS1 课题化重构——ADR-0018）——应用启动顺序的唯一编排处。
 *
 * 顺序（不可调换）：userData 定位（R2-SH1 改名迁移：旧派生目录→新目录
 * 「Synapse」——override 时跳过）→ 课题布局（遗留迁移/指针解析——最早段）→
 * 数据层容器装配（课题目录内 db 迁移+fileStore+repos+services）→ 协议注册 →
 * CSP → IPC 注册（workspaces 域在此组合注入）→ 主窗口。
 *
 * 课题化（R1-WS1）：数据层=db+repos+fileStore+services 整体可重建，经稳定
 * facade 容器供 IPC/协议层引用（ipc/index.ts+register.ts 零改动）；switch=
 * workspace.service 编排「关旧库→指针→装配→换引用」，busy 串行守卫。
 * 全新安装首启=legacy-fresh（库在 userData 根，不建 workspaces/——受锁 e2e
 * 种子配方兼容，见 workspace.service 头注序列②）；二次启动迁移入 default。
 *
 * 环境钩子：
 * - SYNAPSE_USER_DATA：e2e 用，覆盖 userData 到临时目录（隔离测试状态）
 * - SYNAPSE_ZCODE_HOME：e2e 用，覆盖 zcode 基目录（隔离 ~/.zcode 检测/装技能面
 *   ——AI-10；注入点=服务构造参数 zcodeBaseDir，本层只做 env→参数映射）
 * - SYNAPSE_DEV_SERVER：electron-vite dev 的 HMR 地址（存在即视为开发模式）
 */
import { mkdir, readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import {
  BrowserWindow,
  Menu,
  clipboard,
  dialog,
  net,
  protocol,
  screen,
  session,
  shell,
  type App
} from 'electron'
import {
  DEFAULT_CONTACT_EMAIL,
  MANAGED_FILES_DIR,
  DB_FILE_NAME,
  SETTINGS_FILE_NAME
} from '../shared/constants'
import { openDatabase } from './db/connection'
import { migrate } from './db/migrate'
import { createRepos } from './db/repos'
import { createFileStore } from './services/import_/file-store'
import { createServices } from './services'
import { readThemeSync } from './services/settings.service'
import { AI_SENSOR_DIR_NAME } from './services/ai_sensor/ai-sensor.service'
import { resolveTemplateDir } from './services/ai_sensor/zcode-link.service'
import { createDataLayerContainer } from './data-layer.container'
import { createImportGate } from './import-gate'
import { migrateLegacyUserData } from './migrate-user-data'
import { countPapersInDir, ensureWorkspaceLayout, initWorkspaceDb } from './workspace-layout'
import { createWorkspaceService } from './services/workspaces/workspace.service'
import { createIpcHandlers } from './ipc'
import { registerIpc } from './ipc/register'
import { registerAppFileProtocol } from './protocol/app-file.protocol'
import { applyCsp } from './security/csp'
import { createElectronDialogs } from './dialogs'
import {
  bindWindowStateEvents,
  controlWindow,
  createMainWindow,
  handleCloseWithQuitGuard,
  getQuitDirty,
  setQuitDirty
} from './windows/main-window'
import { loadBounds, saveBounds, boundsToPersist, type WindowBounds } from './windows/window-state'
import { fetchJson, fetchText, pingHost } from './http/http-client'
import { EVENT_CHANNELS } from '../shared/ipc/api-surface'

export interface BootstrapContext {
  window: BrowserWindow
  shutdown: () => void
}

/**
 * IPC 装配完整性探针：bootstrap 组合注入 workspaces 域后的完整
 * 装配体类型——全推断零宽型标注（ReturnType 链，禁手工成员声明）。双层闭合
 * R1-WS1 代价申报（ApiHandlers 对 ComposedHandlerDomains 可选 = 漏组合不再
 * 编译期拦截）：①registerIpc 调用点以本类型标注装配对象——漏组合 workspaces
 * = 调用点编译红；②tests/types/api-assembly.type-test.ts 以本类型对账
 * Required<ApiHandlers>——缺域/域形状漂移 = 测试编译红。零运行时探针对象
 * （纯 type 导出）。
 */
export type IpcAssemblyProbe = ReturnType<typeof createIpcHandlers> & {
  workspaces: ReturnType<typeof createWorkspaceService>
}

export async function bootstrap(app: App): Promise<BootstrapContext> {
  const override = process.env.SYNAPSE_USER_DATA
  if (override) app.setPath('userData', override)
  // R2-SH1：改名迁移（旧派生目录 → 新目录 Synapse；override 时跳过——e2e/取证
  // 零影响），必须在课题布局消费 userData 根之前
  else migrateLegacyUserData(app)
  const userDataDir = app.getPath('userData')

  // ── 课题布局（最早段：遗留迁移→指针解析→当前课题数据目录——R1-WS1）──
  const layout = await ensureWorkspaceLayout(userDataDir)

  // ── 出网（Electron net.fetch 跟随系统代理；安全：host 白名单在 http-client 内强制）──
  const fetchLike = net.fetch as unknown as typeof globalThis.fetch
  const contactEmail = await readContactEmail(userDataDir)

  // ── import 会话 gate（F-D4 A 面，INV-52）：顶层一次创建——在容器 assemble 闭包
  //    之外（每层 service 重建但 gate 同一对象）；计数>0=import in-flight，
  //    workspace 变更三入口互斥判定源。in-flight 判定=main 侧计数单源，renderer
  //    busy 不参与（两进程面各自独立）。C-3 N1 转正：闭包计数拆 createImportGate
  //    模块（并发中间态 2→1→0 语义入测试锚），行为逐位一致 ──
  const importGate = createImportGate()

  // ── 数据层容器（课题级可重建；与库无关项=闭包外参——票面 P1）──
  const container = createDataLayerContainer({
    assemble: async (dataDir) => {
      const filesDir = join(dataDir, MANAGED_FILES_DIR)
      await mkdir(filesDir, { recursive: true })
      const db = openDatabase(join(dataDir, DB_FILE_NAME))
      migrate(db)
      const repos = createRepos(db)
      const fileStore = createFileStore(filesDir)
      const services = createServices({
        repos,
        fileStore,
        importGate,
        contactEmail: () => contactEmail,
        sendProgress: (e) => {
          for (const win of BrowserWindow.getAllWindows()) {
            win.webContents.send(EVENT_CHANNELS.importProgress, e)
          }
        },
        sendExportEvent: (e) => {
          for (const win of BrowserWindow.getAllWindows()) {
            win.webContents.send(EVENT_CHANNELS.exportCorpus, e)
          }
        },
        // AI-06：伴随进程协议根（userData/ai-sensor——应用管目录，companion 消费；
        // ADR-0018：协议根保持全局，corpus 导出自当前库天然按课题）
        aiSensorRootDir: join(userDataDir, AI_SENSOR_DIR_NAME),
        // AI-10：zcode 基目录+技能模板源（prod=resourcesPath/ai-sensor，dev=仓库 tools/ai-sensor）
        zcodeBaseDir: process.env.SYNAPSE_ZCODE_HOME ?? homedir(),
        templateDir: resolveTemplateDir(__dirname, process.resourcesPath, app.isPackaged),
        http: {
          fetchJson: (url, schema) => fetchJson(url, { schema, fetchImpl: fetchLike, contactEmail }),
          fetchText: (url) => fetchText(url, { fetchImpl: fetchLike })
        }
      })
      return { db, repos, fileStore, services }
    }
  })
  await container.assembleInto(layout.dataDir)

  // 课题域服务（workspace 管理面在容器外——管理的是容器本身；空库迁移经
  // initWorkspaceDb 注入——services 层禁直连 db，装配面在 main 根）。
  // importInFlight=上方 gate 计数（F-D4：import in-flight 时 create/rename/
  // switch 抛 CONFLICT 中文，拒时零库副作用）
  const workspaceService = createWorkspaceService({
    userDataDir,
    importInFlight: importGate.inFlight,
    initWorkspaceDb,
    // [T3-P2] 课题文献计数（main 根装配面——services 禁直连 db 的依赖倒置）
    countPapers: countPapersInDir,
    closeCurrent: () => container.closeCurrent(),
    assembleInto: (dataDir) => container.assembleInto(dataDir)
  })

  // ── 协议 / CSP / IPC ──
  registerAppFileProtocol(
    protocol,
    // 经容器间接取（switch 后活指向当前课题库——bootstrap 内一处接线）
    (paperId) => container.papersFileRef(paperId),
    container.fileStore // 稳定 facade：switch 热换后协议读当前课题 files/
  )
  // 装配对象具名化并标注 IpcAssemblyProbe（全推断类型）——漏组合
  // workspaces 在此编译期拦截（probe 头注双层闭合第①层；对象具名非新建，
  // 装配对象本身即原内联字面量）
  const ipcHandlers: IpcAssemblyProbe = {
    // workspaces 域由 bootstrap 组合注入（ComposedHandlerDomains——
    // ipc/index.ts+register.ts 零改动主控裁决；registerIpc 仍按接线表全量注册）
    ...createIpcHandlers({
      services: container.services, // 稳定 facade：deps.services 消费形态零改动
      // 对话框绑主窗口（模态）：装配在窗口创建之前，惰性 getter 在实际弹出时取
      // 窗口（取首个存活窗口；销毁/未就绪时对话框无父退化，可用性优先）
      dialogs: createElectronDialogs(
        () => BrowserWindow.getAllWindows().find((w) => !w.isDestroyed()) ?? null
      ),
      shell,
      userDataDir,
      ping: (host) => pingHost(`https://${host}/`, { fetchImpl: fetchLike }),
      setQuitDirty,
      // R2-SH3：闭包直引下方 const window（TDZ 不可能触发——IPC 调用来自
      // renderer，必然晚于窗口创建；dialogs 惰性 getter 同段先例）
      controlWindow: (action) => controlWindow(window, action),
      // P7E-04：剪贴板写口（electron.clipboard 结构兼容 deps.clipboard 注入面）
      clipboard
    }),
    workspaces: workspaceService
  }
  registerIpc(ipcHandlers)
  applyCsp(session.defaultSession)

  // ── 主窗口 ──
  // isDev 以打包状态为准：打包后的应用即使在残留 SYNAPSE_DEV_SERVER 环境变量的
  // 机器上运行，也绝不加载外部 URL / 开 DevTools
  const devServerUrl = app.isPackaged ? undefined : process.env.SYNAPSE_DEV_SERVER
  const isDev = devServerUrl !== undefined
  Menu.setApplicationMenu(null)
  const bounds: WindowBounds = await loadBounds(userDataDir)
  const workArea = screen.getPrimaryDisplay().workArea
  // [T3-U1] FOUC 首帧兜底：启动同步读主题档（settings.service 读侧迁移
  // 单源——system→light）附 loadURL/loadFile theme query；renderer 首帧
  // 脚本（public/theme-boot.js）写 documentElement.dataset.theme（首帧前
  // 生效）。运行时单点真源仍=App effect（两者值一致——INV-71）
  const startupTheme = readThemeSync(userDataDir)
  const window = createMainWindow(
    BrowserWindow,
    {
      devServerUrl,
      entryFile: join(__dirname, '../renderer/index.html'),
      preloadScript: join(__dirname, '../preload/index.cjs'),
      isDev,
      startupTheme
    },
    {
      x: bounds.x,
      y: bounds.y,
      width: Math.min(bounds.width, workArea.width),
      height: Math.min(bounds.height, workArea.height)
    }
  )
  window.on('close', () => {
    if (!window.isDestroyed() && window.isVisible()) {
      // F-G3：取 normal 态 bounds——maximized 态关窗不落最大化尺寸
      void saveBounds(userDataDir, boundsToPersist(window))
    }
  })

  // TABS-04 退出拦截：dirty 态 close → preventDefault+模态二次确认（确认=destroy
  // 强制关闭——destroy 不再触发 close 无重入）。注册在 saveBounds 监听之后：
  // 确认退出路径下窗口几何已由前一个监听保存。
  window.on('close', (event) => {
    void handleCloseWithQuitGuard(getQuitDirty(), event, window, {
      confirmQuit: (message) =>
        dialog
          .showMessageBox(window, {
            type: 'warning',
            message,
            buttons: ['确认退出', '取消'],
            // 默认焦点=取消：防误触回车/空格直接确认退出丢未落库数据）
            defaultId: 1,
            cancelId: 1,
            noLink: true
          })
          .then((r) => r.response === 0)
    })
  })

  // F-SESS-01：renderer 重载/崩溃（main 存活）→中止在途语料导出会话——否则
  // corpusItem 永不回传，streaming 永挂，EXPORT_BUSY 单飞锁永不释放。SPA 应用
  // 内路由不触发主帧导航——不误杀应用内跳转（service 头注跨格序列「导出中
  // 用户导航离开设置页」行为不变）；首次加载也触发 did-start-navigation：idle
  // 时 abort 返回 false 空转，无害
  window.webContents.on('did-start-navigation', (details) => {
    if (!details.isMainFrame) return
    void container.services.corpus_export.abortActiveSession('渲染进程导航/重载，导出会话中止')
  })
  window.webContents.on('render-process-gone', (_event, details) => {
    void container.services.corpus_export.abortActiveSession(
      `渲染进程崩溃（${details.reason}），导出会话中止`
    )
  })

  // R2-SH3：maximize 状态推送（含双击 drag 区最大化等系统行为沿）→ renderer
  // 图标态；初值由 renderer 挂载时 get-state 拉取（主控预裁②：时序自包含）
  bindWindowStateEvents(window, (p) => window.webContents.send(EVENT_CHANNELS.windowState, p))

  // 幂等 shutdown：window-all-closed 与 before-quit 都会触发，二次 close 未定义
  let dbClosed = false
  return {
    window,
    shutdown: () => {
      if (dbClosed) return
      dbClosed = true
      container.closeCurrent()
    }
  }
}

async function readContactEmail(userDataDir: string): Promise<string> {
  try {
    const raw = await readFile(join(userDataDir, SETTINGS_FILE_NAME), 'utf-8')
    const parsed = JSON.parse(raw) as { contactEmail?: unknown }
    if (typeof parsed.contactEmail === 'string' && parsed.contactEmail.includes('@')) {
      return parsed.contactEmail
    }
  } catch {
    // 无设置文件：用默认值
  }
  return DEFAULT_CONTACT_EMAIL
}
