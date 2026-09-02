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
import { AI_SENSOR_DIR_NAME } from './services/ai_sensor/ai-sensor.service'
import { resolveTemplateDir } from './services/ai_sensor/zcode-link.service'
import { createDataLayerContainer } from './data-layer.container'
import { migrateLegacyUserData } from './migrate-user-data'
import { ensureWorkspaceLayout, initWorkspaceDb } from './workspace-layout'
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
import { loadBounds, saveBounds, type WindowBounds } from './windows/window-state'
import { fetchJson, fetchText, pingHost } from './http/http-client'
import { EVENT_CHANNELS } from '../shared/ipc/api-surface'

export interface BootstrapContext {
  window: BrowserWindow
  shutdown: () => void
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
  //    busy 不参与（两进程面各自独立）──
  let importInFlightCount = 0
  const importGate = {
    enter: () => {
      importInFlightCount++
    },
    exit: () => {
      importInFlightCount--
    }
  }

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
    importInFlight: () => importInFlightCount > 0,
    initWorkspaceDb,
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
  registerIpc({
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
      controlWindow: (action) => controlWindow(window, action)
    }),
    workspaces: workspaceService
  })
  applyCsp(session.defaultSession)

  // ── 主窗口 ──
  // isDev 以打包状态为准：打包后的应用即使在残留 SYNAPSE_DEV_SERVER 环境变量的
  // 机器上运行，也绝不加载外部 URL / 开 DevTools
  const devServerUrl = app.isPackaged ? undefined : process.env.SYNAPSE_DEV_SERVER
  const isDev = devServerUrl !== undefined
  Menu.setApplicationMenu(null)
  const bounds: WindowBounds = await loadBounds(userDataDir)
  const workArea = screen.getPrimaryDisplay().workArea
  const window = createMainWindow(
    BrowserWindow,
    {
      devServerUrl,
      entryFile: join(__dirname, '../renderer/index.html'),
      preloadScript: join(__dirname, '../preload/index.cjs'),
      isDev
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
      const b = window.getBounds()
      void saveBounds(userDataDir, { x: b.x, y: b.y, width: b.width, height: b.height })
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
            // 默认焦点=取消：防误触回车/空格直接确认退出丢未落库数据（deepseek W2）
            defaultId: 1,
            cancelId: 1,
            noLink: true
          })
          .then((r) => r.response === 0)
    })
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
