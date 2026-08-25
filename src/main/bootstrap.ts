/**
 * 组装根（SR-INFRA-11，已完成）——应用启动顺序的唯一编排处。
 *
 * 顺序（不可调换）：userData 定位 → 目录初始化 → DB 打开+迁移 → fileStore →
 * repos → services → 协议注册 → CSP → IPC 注册 → 主窗口。
 *
 * 环境钩子：
 * - SYNAPSE_USER_DATA：e2e 用，覆盖 userData 到临时目录（隔离测试状态）
 * - SYNAPSE_DEV_SERVER：electron-vite dev 的 HMR 地址（存在即视为开发模式）
 */
import { mkdir, readFile } from 'node:fs/promises'
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
import { createIpcHandlers } from './ipc'
import { registerIpc } from './ipc/register'
import { registerAppFileProtocol } from './protocol/app-file.protocol'
import { applyCsp } from './security/csp'
import { createElectronDialogs } from './dialogs'
import { createMainWindow, handleCloseWithQuitGuard, getQuitDirty, setQuitDirty } from './windows/main-window'
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
  const userDataDir = app.getPath('userData')
  const filesDir = join(userDataDir, MANAGED_FILES_DIR)
  await mkdir(filesDir, { recursive: true })

  // ── 数据层 ──
  const db = openDatabase(join(userDataDir, DB_FILE_NAME))
  migrate(db)
  const repos = createRepos(db)
  const fileStore = createFileStore(filesDir)

  // ── 出网（Electron net.fetch 跟随系统代理；安全：host 白名单在 http-client 内强制）──
  const fetchLike = net.fetch as unknown as typeof globalThis.fetch
  const contactEmail = await readContactEmail(userDataDir)

  const services = createServices({
    repos,
    fileStore,
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
    http: {
      fetchJson: (url, schema) => fetchJson(url, { schema, fetchImpl: fetchLike, contactEmail }),
      fetchText: (url) => fetchText(url, { fetchImpl: fetchLike })
    }
  })

  // ── 协议 / CSP / IPC ──
  registerAppFileProtocol(
    protocol,
    async (paperId) => repos.papers.fileRefById(paperId),
    fileStore
  )
  registerIpc(
    createIpcHandlers({
      services,
      // 对话框绑主窗口（模态）：装配在窗口创建之前，惰性 getter 在实际弹出时取
      // 窗口（取首个存活窗口；销毁/未就绪时对话框无父退化，可用性优先）
      dialogs: createElectronDialogs(
        () => BrowserWindow.getAllWindows().find((w) => !w.isDestroyed()) ?? null
      ),
      shell,
      userDataDir,
      ping: (host) => pingHost(`https://${host}/`, { fetchImpl: fetchLike }),
      setQuitDirty
    })
  )
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

  // 幂等 shutdown：window-all-closed 与 before-quit 都会触发，二次 close 未定义
  let dbClosed = false
  return {
    window,
    shutdown: () => {
      if (dbClosed) return
      dbClosed = true
      db.close()
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
