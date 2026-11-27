import { describe, expect, it, vi } from 'vitest'
import type { BrowserWindow } from 'electron'
import { createMainWindow, type MainWindowLoad } from '../../../src/main/windows/main-window'

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

describe('windows/main-window —— undo rollout query', () => {
  it('旧调用缺 undoRollout 保持零附参', () => {
    const dev = makeCtor()
    createMainWindow(dev.Ctor, { ...BASE, devServerUrl: 'http://localhost:5173/' }, { width: 1280, height: 800 })
    expect(dev.loadURL).toHaveBeenCalledWith('http://localhost:5173/')
    const prod = makeCtor()
    createMainWindow(prod.Ctor, BASE, { width: 1280, height: 800 })
    expect(prod.loadFile).toHaveBeenCalledWith('out/renderer/index.html', undefined)
  })

  it('显式 off 与 theme 同时传递，loadURL/loadFile 双支保留 query', () => {
    const dev = makeCtor()
    createMainWindow(
      dev.Ctor,
      { ...BASE, devServerUrl: 'http://localhost:5173/', startupTheme: 'sepia', undoRollout: 'off' },
      { width: 1280, height: 800 }
    )
    expect(dev.loadURL).toHaveBeenCalledWith('http://localhost:5173/?theme=sepia&undoRollout=off')
    const prod = makeCtor()
    createMainWindow(prod.Ctor, { ...BASE, startupTheme: 'light', undoRollout: 'off' }, { width: 1280, height: 800 })
    expect(prod.loadFile).toHaveBeenCalledWith('out/renderer/index.html', {
      query: { theme: 'light', undoRollout: 'off' }
    })
  })

  it('无 theme 也传合法 off；bootstrap 类型要求档位显式传入', () => {
    const dev = makeCtor()
    createMainWindow(
      dev.Ctor,
      { ...BASE, devServerUrl: 'http://localhost:5173/', undoRollout: 'off' },
      { width: 1280, height: 800 }
    )
    expect(dev.loadURL).toHaveBeenCalledWith('http://localhost:5173/?undoRollout=off')
    const prod = makeCtor()
    createMainWindow(prod.Ctor, { ...BASE, undoRollout: 'off' }, { width: 1280, height: 800 })
    expect(prod.loadFile).toHaveBeenCalledWith('out/renderer/index.html', { query: { undoRollout: 'off' } })
  })
})
