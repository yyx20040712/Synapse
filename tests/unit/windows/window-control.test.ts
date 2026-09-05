/**
 * [R2-SH3] frameless 窗控——controlWindow / bindWindowStateEvents / titleBarStyle
 * （LOOP 会话票，不在 registry；新测试 always-active 直接 describe——主控预裁）
 *
 * ── 断言面 ──
 * - controlWindow 四 action 语义（票面行为层表）：minimize 调 minimize；
 *   maximize-toggle 双向（常态 maximize / 最大化态 unmaximize）；close 调
 *   close **绝不 destroy**（保 TABS-04 dirty 拦截链）；get-state 只读零副作用
 * - bindWindowStateEvents：maximize→send(true) / unmaximize→send(false)
 * - createMainWindow 传 titleBarStyle:'hidden'（BrowserWindowCtor 桩 capture
 *   options；autoHideMenuBar 保留同锚）
 * - 皮肤锁（theme.test.ts 同型 CSS 文本断言——变异④ no-drag 摘除的 vitest
 *   防线，主控预裁「computed 断言红即可，不跑 e2e」的轻量替代形态）：
 *   .app-header=drag / .app-header-switcher+.titlebar-controls=no-drag
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import type { BrowserWindow } from 'electron'
import {
  bindWindowStateEvents,
  controlWindow,
  createMainWindow,
  type MainWindowLoad
} from '../../../src/main/windows/main-window'

/** 可变最大化态的最小窗口桩（结构化类型——文件内既有风格，测试免依赖 electron 真体） */
function makeWin(maximized = false) {
  let max = maximized
  return {
    // 最小化不改变最大化态（Windows 行为：最大化窗口最小化后恢复仍最大化）
    minimize: vi.fn(),
    maximize: vi.fn(() => {
      max = true
    }),
    unmaximize: vi.fn(() => {
      max = false
    }),
    close: vi.fn(),
    destroy: vi.fn(),
    isMaximized: () => max
  }
}

/** BrowserWindow 构造桩：capture options、返回挂护栏所需最小 webContents 形状 */
function makeBrowserWindowCtor() {
  const optionsList: Array<Record<string, unknown>> = []
  const fakeWin = {
    once: vi.fn(),
    on: vi.fn(),
    loadURL: vi.fn(),
    loadFile: vi.fn(),
    webContents: {
      on: vi.fn(),
      setWindowOpenHandler: vi.fn(),
      getURL: () => 'file:///renderer/index.html',
      session: { setPermissionRequestHandler: vi.fn() }
    }
  }
  // 构造函数返回对象字面量时 new 结果即该对象（JS 语义），options 全量捕获
  const Ctor = function ctor(this: unknown, options: Record<string, unknown>) {
    optionsList.push(options)
    return fakeWin
  } as unknown as typeof BrowserWindow
  return { Ctor, optionsList }
}

const LOAD: MainWindowLoad = {
  entryFile: 'out/renderer/index.html',
  preloadScript: 'out/preload/index.cjs',
  isDev: false
}

describe('windows/window-control —— controlWindow 四 action 语义', () => {
  it('minimize：调 win.minimize 并回读 maximized', () => {
    const win = makeWin(false)
    const res = controlWindow(win, 'minimize')
    expect(win.minimize).toHaveBeenCalledTimes(1)
    expect(win.close).not.toHaveBeenCalled()
    expect(res).toEqual({ maximized: false })
  })

  it('maximize-toggle 常态：调 maximize 不调 unmaximize，回读 true', () => {
    const win = makeWin(false)
    const res = controlWindow(win, 'maximize-toggle')
    expect(win.maximize).toHaveBeenCalledTimes(1)
    expect(win.unmaximize).not.toHaveBeenCalled()
    expect(res).toEqual({ maximized: true })
  })

  it('maximize-toggle 最大化态：调 unmaximize 不调 maximize，回读 false', () => {
    const win = makeWin(true)
    const res = controlWindow(win, 'maximize-toggle')
    expect(win.unmaximize).toHaveBeenCalledTimes(1)
    expect(win.maximize).not.toHaveBeenCalled()
    expect(res).toEqual({ maximized: false })
  })

  it('close：调 win.close 绝不 destroy（保 TABS-04 dirty 拦截链）', () => {
    const win = makeWin(false)
    const res = controlWindow(win, 'close')
    expect(win.close).toHaveBeenCalledTimes(1)
    expect(win.destroy).not.toHaveBeenCalled()
    expect(win.minimize).not.toHaveBeenCalled()
    expect(res).toEqual({ maximized: false })
  })

  it('get-state：只读零副作用（四个 mutator 均不调），返回当前态', () => {
    const win = makeWin(true)
    const res = controlWindow(win, 'get-state')
    expect(win.minimize).not.toHaveBeenCalled()
    expect(win.maximize).not.toHaveBeenCalled()
    expect(win.unmaximize).not.toHaveBeenCalled()
    expect(win.close).not.toHaveBeenCalled()
    expect(win.destroy).not.toHaveBeenCalled()
    expect(res).toEqual({ maximized: true })
  })
})

describe('windows/window-control —— maximize 状态推送绑定', () => {
  it('bindWindowStateEvents：maximize 沿 send(true)，unmaximize 沿 send(false)', () => {
    const listeners = new Map<string, () => void>()
    const win = {
      on: (event: string, listener: () => void) => {
        listeners.set(event, listener)
      },
      isMaximized: () => false
    }
    const sent: Array<{ maximized: boolean }> = []
    bindWindowStateEvents(win, (payload) => {
      sent.push(payload)
    })
    listeners.get('maximize')?.()
    listeners.get('unmaximize')?.()
    expect(sent).toEqual([{ maximized: true }, { maximized: false }])
  })

  it('F-G9 bindWindowStateEvents：fullscreen 沿补反映——enter 发 true；leave 回读 isMaximized（离开后回最大化态图标不撒谎）', () => {
    const listeners = new Map<string, () => void>()
    let maximized = false
    const win = {
      on: (event: string, listener: () => void) => {
        listeners.set(event, listener)
      },
      isMaximized: () => maximized
    }
    const sent: Array<{ maximized: boolean }> = []
    bindWindowStateEvents(win, (payload) => {
      sent.push(payload)
    })
    // F11 等 fullscreen 走 enter-full-screen 而非 maximize 沿（v8 SH3 门一 C12）
    listeners.get('enter-full-screen')?.()
    expect(sent).toEqual([{ maximized: true }])
    // 离开 fullscreen 回到最大化态：回读真值 true 而非恒 false
    maximized = true
    listeners.get('leave-full-screen')?.()
    expect(sent).toEqual([{ maximized: true }, { maximized: true }])
    // 离开 fullscreen 回到常态：false
    maximized = false
    sent.length = 0
    listeners.get('leave-full-screen')?.()
    expect(sent).toEqual([{ maximized: false }])
  })
})

describe('windows/window-control —— frameless 窗口形状', () => {
  it('createMainWindow 传 titleBarStyle hidden 且 autoHideMenuBar 保留', () => {
    const { Ctor, optionsList } = makeBrowserWindowCtor()
    createMainWindow(Ctor, LOAD, { width: 1280, height: 800 })
    expect(optionsList).toHaveLength(1)
    expect(optionsList[0]).toMatchObject({
      titleBarStyle: 'hidden',
      autoHideMenuBar: true
    })
  })
})

describe('windows/window-control —— drag/no-drag 皮肤锁（CSS 文本断言，theme.test.ts 同型）', () => {
  // [F-CSS-01] 拆件再锚：drag/no-drag 声明随 App 壳皮肤段迁 theme-shell.css
  const css = readFileSync(
    fileURLToPath(new URL('../../../src/renderer/shared/theme-shell.css', import.meta.url)),
    'utf8'
  )

  it('.app-header 整条为拖拽区——恰一处 drag 声明（F-G8 计数锁：与下方 no-drag 计数断言对偶，他处新增第二处 drag 即红）', () => {
    const dragCount = css.split('-webkit-app-region: drag').length - 1
    expect(dragCount).toBe(1)
  })

  it('切换器容器与三键容器为 no-drag（两处，点击不被 drag 吞）', () => {
    const noDragCount = css.split('-webkit-app-region: no-drag').length - 1
    expect(noDragCount).toBe(2)
  })
})
