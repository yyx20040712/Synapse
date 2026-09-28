/**
 * [T3-U1] FOUC 启动附参——createMainWindow 双分支 theme query 锁。
 *
 * loadURL 分支=URL searchParams 拼 theme 参；loadFile 分支={ query } 选项
 * 承载（Electron loadFile options.query——44 实测口径）；startupTheme 缺省=
 * 零附参（旧调用面兼容：受锁 window-control.test 的 LOAD 无该字段）。
 * BrowserWindow 构造桩沿 window-control.test 同型（返回挂护栏最小形状）。
 */
import { describe, expect, it, vi } from 'vitest'
import type { BrowserWindow } from 'electron'
import { createMainWindow, type MainWindowLoad } from '../../../src/main/windows/main-window'

/** 构造桩：capture 不需要——只断言 loadURL/loadFile 附参面 */
function makeCtor() {
  const loadURL = vi.fn()
  const loadFile = vi.fn()
  const fakeWin = {
    once: vi.fn(),
    on: vi.fn(),
    loadURL,
    loadFile,
    webContents: {
      on: vi.fn(),
      setWindowOpenHandler: vi.fn(),
      getURL: () => 'file:///renderer/index.html',
      session: { setPermissionRequestHandler: vi.fn() }
    }
  }
  const Ctor = function ctor(this: unknown, _options: Record<string, unknown>) {
    return fakeWin
  } as unknown as typeof BrowserWindow
  return { Ctor, loadURL, loadFile }
}

const BASE: MainWindowLoad = {
  entryFile: 'out/renderer/index.html',
  preloadScript: 'out/preload/index.cjs',
  isDev: false
}

describe('windows/main-window —— T3-U1 FOUC 启动 theme query 双分支', () => {
  it('dev 分支：loadURL 的 URL 附 theme=dark（searchParams 拼参）', () => {
    const { Ctor, loadURL } = makeCtor()
    createMainWindow(
      Ctor,
      { ...BASE, devServerUrl: 'http://localhost:5173/', startupTheme: 'dark' },
      { width: 1280, height: 800 }
    )
    const url = String(loadURL.mock.calls[0]?.[0])
    expect(url, 'loadURL 收到附参 URL').toContain('theme=dark')
    expect(new URL(url).searchParams.get('theme'), 'theme 参可被 ?theme= 解析（脚本消费口径）').toBe('dark')
  })

  it('生产分支：loadFile 以 { query } 选项承载 theme=sepia（Electron 44 loadFile options）', () => {
    const { Ctor, loadFile } = makeCtor()
    createMainWindow(Ctor, { ...BASE, startupTheme: 'sepia' }, { width: 1280, height: 800 })
    expect(loadFile).toHaveBeenCalledWith('out/renderer/index.html', { query: { theme: 'sepia' } })
  })

  it('startupTheme 缺省=零附参（loadURL 原样 / loadFile 无 query 选项——旧调用面兼容）', () => {
    const dev = makeCtor()
    createMainWindow(dev.Ctor, { ...BASE, devServerUrl: 'http://localhost:5173/' }, { width: 1280, height: 800 })
    expect(String(dev.loadURL.mock.calls[0]?.[0]), '无 theme=回显原 URL').toBe('http://localhost:5173/')
    const prod = makeCtor()
    createMainWindow(prod.Ctor, BASE, { width: 1280, height: 800 })
    expect(prod.loadFile).toHaveBeenCalledWith('out/renderer/index.html', undefined)
  })
})
