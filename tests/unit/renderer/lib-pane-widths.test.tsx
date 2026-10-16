// @vitest-environment jsdom
/**
 * [F-VISFB-41] 库页双侧栏拖宽 —— hook 行为面+页面接线面（always-active 裸
 * describe——K3）。useLibPaneWidths 逻辑面直测（use-sidebar-pane/split-pane
 * 先例同型的指针会话模拟：jsdom 无 PointerEvent 构造器→MouseEvent 同名派发；
 * jsdom 无布局→gBCR 恒 0=动态中列保底钳跳过〔静态界生效〕，纯函数
 * budgetCap 单独钉动态钳四格）。
 *
 * 覆盖：缺省宽 224/316+mount 即持久化 / 持久化载入与越界·非数回退 /
 * 拖拽方向（fnav 右移变宽·drawer 左移变宽）/ 拖拽期禁 setState-per-move
 * （rendered 宽不动+CSS 变量直写页根+localStorage 期间不写）/ up·cancel
 * 单次提交+落定持久化 / clamp 静态两界（fnav 160–340·drawer 240–460）/
 * uiScale 折算（--ui-scale=2→+100 屏幕像素=+50 CSS 像素）/ 键盘 ±16+
 * 方向镜像+preventDefault+其余键零操作 / 双击复位默认宽 / pointer
 * capture+非主键不启动 / body 副作用起止+拖拽中卸载还原（INV-14 同族）/
 * budgetCap 动态中列保底四格 / LibraryPage 接线（双 .lib-sep 在位+直子
 * 锚不破+aria 三件+CSS 宽变量逐值锁）。
 * [回炉轮1 门一 k1] 追加：B1 双击复位经中列保底钳（页根 gBCR stub——
 * 复位值=min(默认,页容器−462−对侧实际宽−14)，极窄止于 min）/ W1 多指
 * 并发守卫（会话在场第二 pointerdown 被拒+首会话正常收尾）/ W2 挂载
 * 再钳两段顺序算术（双超宽→fnav 先让/抽屉后保+SEP 14 参与+宽窗零钳
 * 不动+极窄止于各 min 尽力语义）。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { makeApiStub, stubApiEvents } from '../../utils/api-client-mock'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent } from 'react'
import {
  budgetCap,
  useLibPaneWidths
} from '../../../src/renderer/features/library/use-lib-pane-widths'

const stubApi = makeApiStub({
  library: { list: vi.fn(), collections: vi.fn() },
  tags: { list: vi.fn() },
  folders: { list: vi.fn() },
  lineage: { graph: vi.fn() }
})
stubApiEvents({
  onImportProgress: vi.fn(() => () => undefined),
  onFoldersChanged: vi.fn(() => () => undefined)
})

import { LibraryPage } from '../../../src/renderer/features/library/LibraryPage'

// act() 环境声明（library-cards 同口径）
;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const F_KEY = 'synapse:libpane:fnav'
const D_KEY = 'synapse:libpane:drawer'

/** 探针：按 LibraryPage 同型接线挂 hook（页根 ref+style+双侧手柄+中列目标） */
function Probe(): JSX.Element {
  const p = useLibPaneWidths()
  return (
    <div className="lib-page" ref={p.pageRef} style={p.pageStyle}>
      <div className="lib-fnav" />
      <div
        data-testid="sep-fnav"
        tabIndex={0}
        onPointerDown={(ev: ReactPointerEvent<HTMLDivElement>) => p.onResizeStart('fnav', ev)}
        onKeyDown={(ev: ReactKeyboardEvent<HTMLDivElement>) => p.onResizeKey('fnav', ev)}
        onDoubleClick={() => p.onReset('fnav')}
      />
      <div className="lib-main">
        <div className="lib-body">
          <div className="lib-main-col" />
          <div
            data-testid="sep-drawer"
            tabIndex={0}
            onPointerDown={(ev: ReactPointerEvent<HTMLDivElement>) => p.onResizeStart('drawer', ev)}
            onKeyDown={(ev: ReactKeyboardEvent<HTMLDivElement>) => p.onResizeKey('drawer', ev)}
            onDoubleClick={() => p.onReset('drawer')}
          />
          <aside className="lib-drawer" />
        </div>
      </div>
      <span data-testid="w-fnav">{p.fnavWidth}</span>
      <span data-testid="w-drawer">{p.drawerWidth}</span>
    </div>
  )
}

let root: Root | null = null
let host: HTMLDivElement | null = null

function mount(): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(<Probe />)
  })
}

async function mountPage(): Promise<void> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(<LibraryPage />)
  })
}

const text = (tid: string): string => host?.querySelector(`[data-testid="${tid}"]`)?.textContent ?? ''
const el = (tid: string): HTMLElement => host?.querySelector(`[data-testid="${tid}"]`) as HTMLElement
const page = (): HTMLElement => host?.querySelector('.lib-page') as HTMLElement

/** jsdom 无 PointerEvent 构造器——MouseEvent 同名派发（split-pane 先例同型） */
function ptrAct(target: EventTarget, type: string, x: number, button = 0): void {
  act(() => {
    target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, button }))
  })
}

/** [回炉2] 带指针身份的同型派发（defineProperty 挂 pointerId——use-sidebar-pane
 * capture 断言同手法；既有 ptrAct 裸 MouseEvent 的 pointerId=undefined，会话
 * undefined===undefined 通过=存量用例零改） */
function ptrIdAct(target: EventTarget, type: string, x: number, pointerId: number): void {
  act(() => {
    const ev = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, button: 0 })
    Object.defineProperty(ev, 'pointerId', { value: pointerId })
    target.dispatchEvent(ev)
  })
}

/** [回炉 W2 手法] 页根 gBCR stub：挂载再钳/复位钳的容器宽注入（jsdom 无布局——
 * 仅 .lib-page 命中注入宽，其余元素走真 gBCR〔恒 0〕；返回还原句柄；
 * afterEach 另有原型兜底还原——用例中途抛出不跨用例污染） */
const origGBCR = HTMLElement.prototype.getBoundingClientRect
function stubPageWidth(px: number): () => void {
  HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement): DOMRect {
    if (this.classList.contains('lib-page')) {
      return { x: 0, y: 0, width: px, height: 800, top: 0, left: 0, right: px, bottom: 800 } as DOMRect
    }
    return origGBCR.call(this)
  }
  return () => {
    HTMLElement.prototype.getBoundingClientRect = origGBCR
  }
}

beforeEach(() => {
  window.localStorage.clear()
  document.documentElement.style.removeProperty('--ui-scale')
  // jsdom 未实现 scrollIntoView（LibraryPage 渲染面宿主 API 缺位——library-cards 同口径）
  Element.prototype.scrollIntoView = () => undefined
  stubApi.library.list.mockResolvedValue({ ok: true, data: { items: [], total: 0 } })
  stubApi.library.collections.mockResolvedValue({ ok: true, data: [] })
  stubApi.tags.list.mockResolvedValue({ ok: true, data: [] })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  document.documentElement.style.removeProperty('--ui-scale')
  // [回炉 W2 手法] gBCR stub 兜底还原（用例中途断言抛出时句柄未走——防跨用例污染）
  HTMLElement.prototype.getBoundingClientRect = origGBCR
})

describe('F-VISFB-41 useLibPaneWidths——库页双侧栏拖宽', () => {
  it('缺省态：fnav 224/drawer 316；mount 即落持久化默认值', () => {
    mount()
    expect(text('w-fnav')).toBe('224')
    expect(text('w-drawer')).toBe('316')
    expect(window.localStorage.getItem(F_KEY)).toBe('224')
    expect(window.localStorage.getItem(D_KEY)).toBe('316')
    expect(page().style.getPropertyValue('--lib-fnav-w')).toBe('224px')
    expect(page().style.getPropertyValue('--lib-drawer-w')).toBe('316px')
  })

  it('持久化载入：合法值生效（fnav 300/drawer 400）', () => {
    window.localStorage.setItem(F_KEY, '300')
    window.localStorage.setItem(D_KEY, '400')
    mount()
    expect(text('w-fnav')).toBe('300')
    expect(text('w-drawer')).toBe('400')
  })

  it('越界与非数存值回退默认：9999/100→224；abc/240→316 起各自缺省', () => {
    window.localStorage.setItem(F_KEY, '9999')
    window.localStorage.setItem(D_KEY, 'abc')
    mount()
    expect(text('w-fnav')).toBe('224')
    expect(text('w-drawer')).toBe('316')
    act(() => {
      root?.unmount()
    })
    window.localStorage.setItem(F_KEY, '100')
    window.localStorage.setItem(D_KEY, '240')
    mount()
    expect(text('w-fnav')).toBe('224')
    expect(text('w-drawer')).toBe('240')
  })

  it('fnav 拖拽：右移 +100 屏幕像素——拖拽期 rendered 宽不动+CSS 变量直写页根+期间不持久化；up 单次提交 324', () => {
    mount()
    ptrAct(el('sep-fnav'), 'pointerdown', 700)
    expect(document.body.style.userSelect).toBe('none')
    expect(document.body.style.cursor).toBe('col-resize')
    ptrAct(document, 'pointermove', 800)
    expect(text('w-fnav')).toBe('224')
    expect(page().style.getPropertyValue('--lib-fnav-w')).toBe('324px')
    expect(window.localStorage.getItem(F_KEY)).toBe('224')
    ptrAct(document, 'pointerup', 800)
    expect(text('w-fnav')).toBe('324')
    expect(window.localStorage.getItem(F_KEY)).toBe('324')
    expect(document.body.style.userSelect).toBe('')
    expect(document.body.style.cursor).toBe('')
  })

  it('drawer 拖拽方向镜像：左移 100 屏幕像素→变宽 416；左栏变量不受扰', () => {
    mount()
    ptrAct(el('sep-drawer'), 'pointerdown', 700)
    ptrAct(document, 'pointermove', 600)
    expect(page().style.getPropertyValue('--lib-drawer-w')).toBe('416px')
    expect(page().style.getPropertyValue('--lib-fnav-w')).toBe('224px')
    ptrAct(document, 'pointerup', 600)
    expect(text('w-drawer')).toBe('416')
    expect(window.localStorage.getItem(D_KEY)).toBe('416')
  })

  it('clamp 静态两界：fnav 上界 340/下界 160（jsdom 无布局→动态钳跳过）', () => {
    mount()
    ptrAct(el('sep-fnav'), 'pointerdown', 700)
    ptrAct(document, 'pointermove', 5000)
    expect(page().style.getPropertyValue('--lib-fnav-w')).toBe('340px')
    ptrAct(document, 'pointermove', 0)
    expect(page().style.getPropertyValue('--lib-fnav-w')).toBe('160px')
    ptrAct(document, 'pointerup', 0)
    expect(text('w-fnav')).toBe('160')
  })

  it('delta 折算 uiScale：--ui-scale=2 时 +100 屏幕像素=+50 CSS 像素→274', () => {
    document.documentElement.style.setProperty('--ui-scale', '2')
    mount()
    ptrAct(el('sep-fnav'), 'pointerdown', 700)
    ptrAct(document, 'pointermove', 800)
    expect(page().style.getPropertyValue('--lib-fnav-w')).toBe('274px')
    ptrAct(document, 'pointerup', 800)
    expect(text('w-fnav')).toBe('274')
  })

  it('键盘调宽（APG separator）：fnav ArrowRight +16/ArrowLeft −16 连按钳 160；drawer ArrowLeft 变宽 332；承载键吞默认·其余键零操作不吞', () => {
    mount()
    const sf = el('sep-fnav')
    const key = (t: EventTarget, k: string): KeyboardEvent => {
      const ev = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })
      act(() => {
        t.dispatchEvent(ev)
      })
      return ev
    }
    expect(key(sf, 'ArrowRight').defaultPrevented).toBe(true)
    expect(text('w-fnav')).toBe('240')
    key(sf, 'ArrowLeft')
    expect(text('w-fnav')).toBe('224')
    key(sf, 'ArrowLeft')
    key(sf, 'ArrowLeft')
    key(sf, 'ArrowLeft')
    key(sf, 'ArrowLeft')
    expect(text('w-fnav')).toBe('160')
    key(el('sep-drawer'), 'ArrowLeft')
    expect(text('w-drawer')).toBe('332')
    const other = key(sf, 'a')
    expect(other.defaultPrevented).toBe(false)
    expect(text('w-fnav')).toBe('160')
    expect(window.localStorage.getItem(F_KEY)).toBe('160')
  })

  it('双击复位默认宽：拖至 340 后双击手柄→224+持久化回写', () => {
    mount()
    ptrAct(el('sep-fnav'), 'pointerdown', 700)
    ptrAct(document, 'pointermove', 5000)
    ptrAct(document, 'pointerup', 5000)
    expect(text('w-fnav')).toBe('340')
    act(() => {
      el('sep-fnav').dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }))
    })
    expect(text('w-fnav')).toBe('224')
    expect(window.localStorage.getItem(F_KEY)).toBe('224')
  })

  it('[回炉 B1] 双击复位经中列保底钳：复位值=min(默认,页容器−462−对侧实际宽−14)——980 口径 drawer→280/fnav→188；极窄 700 止于 min 160（gBCR stub）', () => {
    mount()
    let restore = stubPageWidth(980)
    act(() => {
      el('sep-drawer').dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }))
    })
    expect(text('w-drawer')).toBe('280')
    restore()
    act(() => {
      root?.unmount()
    })
    window.localStorage.clear()
    mount()
    restore = stubPageWidth(980)
    act(() => {
      el('sep-fnav').dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }))
    })
    expect(text('w-fnav')).toBe('188')
    restore()
    act(() => {
      root?.unmount()
    })
    window.localStorage.clear()
    mount()
    restore = stubPageWidth(700)
    act(() => {
      el('sep-fnav').dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }))
    })
    expect(text('w-fnav')).toBe('160')
    expect(window.localStorage.getItem(F_KEY)).toBe('160')
    restore()
  })

  it('pointer capture：主键启动会话即 setPointerCapture(pointerId)；非主键不启动不捕获', () => {
    mount()
    const h = el('sep-fnav')
    const cap = vi.fn()
    h.setPointerCapture = cap
    act(() => {
      const ev = new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 700, button: 0 })
      Object.defineProperty(ev, 'pointerId', { value: 7 })
      h.dispatchEvent(ev)
    })
    expect(cap).toHaveBeenCalledWith(7)
    // [回炉2] up 与 down 同指针身份（会话按 pointerId 过滤——同指 up 才结会话）
    ptrIdAct(document, 'pointerup', 700, 7)
    cap.mockClear()
    ptrAct(h, 'pointerdown', 700, 2)
    expect(cap).not.toHaveBeenCalled()
    expect(document.body.style.userSelect).toBe('')
  })

  it('[回炉 W1] 多指并发守卫：会话在场时第二 pointerdown 被拒——首会话续驱 fnav 且正常收尾（无守卫=会话槽被覆写+垃圾宽落盘）', () => {
    mount()
    ptrAct(el('sep-fnav'), 'pointerdown', 700)
    ptrAct(el('sep-drawer'), 'pointerdown', 400)
    ptrAct(document, 'pointermove', 800)
    expect(page().style.getPropertyValue('--lib-fnav-w')).toBe('324px')
    expect(page().style.getPropertyValue('--lib-drawer-w')).toBe('316px')
    ptrAct(document, 'pointerup', 800)
    expect(text('w-fnav')).toBe('324')
    expect(text('w-drawer')).toBe('316')
    expect(window.localStorage.getItem(F_KEY)).toBe('324')
    expect(window.localStorage.getItem(D_KEY)).toBe('316')
  })

  it('[回炉2] 跨指身份过滤：指 1 拖 fnav 期间指 2 move 零改宽+指 2 up 不结会话+指 1 续 move 有效→指 1 up 提交（载荷=指 1 坐标）', () => {
    mount()
    ptrIdAct(el('sep-fnav'), 'pointerdown', 700, 1)
    ptrIdAct(document, 'pointermove', 900, 2)
    expect(page().style.getPropertyValue('--lib-fnav-w')).toBe('224px')
    ptrIdAct(document, 'pointerup', 900, 2)
    expect(document.body.style.userSelect).toBe('none')
    ptrIdAct(document, 'pointermove', 800, 1)
    expect(page().style.getPropertyValue('--lib-fnav-w')).toBe('324px')
    ptrIdAct(document, 'pointerup', 800, 1)
    expect(text('w-fnav')).toBe('324')
    expect(window.localStorage.getItem(F_KEY)).toBe('324')
    expect(document.body.style.userSelect).toBe('')
  })

  it('pointercancel 同为落定提交：move 至 324 后 cancel→state 324+持久化+副作用还原', () => {
    mount()
    ptrAct(el('sep-fnav'), 'pointerdown', 700)
    ptrAct(document, 'pointermove', 800)
    ptrAct(document, 'pointercancel', 800)
    expect(text('w-fnav')).toBe('324')
    expect(window.localStorage.getItem(F_KEY)).toBe('324')
    expect(document.body.style.userSelect).toBe('')
  })

  it('拖拽中途卸载：body 副作用必须还原（INV-14 同族——监听与样式同源清理）', () => {
    mount()
    ptrAct(el('sep-fnav'), 'pointerdown', 700)
    expect(document.body.style.userSelect).toBe('none')
    act(() => {
      root?.unmount()
    })
    expect(document.body.style.userSelect).toBe('')
    expect(document.body.style.cursor).toBe('')
  })

  it('budgetCap 动态中列保底四格：余量足→静态界；余量 38→262；中列已欠→封在起点；未测得布局 0→跳过动态钳', () => {
    expect(budgetCap(224, 700, 340)).toBe(340)
    expect(budgetCap(224, 500, 340)).toBe(262)
    expect(budgetCap(224, 400, 340)).toBe(224)
    expect(budgetCap(224, 0, 340)).toBe(340)
  })

  it('[回炉 W2] 挂载再钳顺序算术：持久 340/460+页容器 1024→fnav 先让 160/抽屉后保 388（SEP 14 参与）；页容器 1300→零钳不动', () => {
    window.localStorage.setItem(F_KEY, '340')
    window.localStorage.setItem(D_KEY, '460')
    const restore = stubPageWidth(1024)
    mount()
    expect(text('w-fnav')).toBe('160')
    expect(text('w-drawer')).toBe('388')
    expect(window.localStorage.getItem(F_KEY)).toBe('160')
    expect(window.localStorage.getItem(D_KEY)).toBe('388')
    restore()
    act(() => {
      root?.unmount()
    })
    window.localStorage.setItem(F_KEY, '340')
    window.localStorage.setItem(D_KEY, '460')
    const restore2 = stubPageWidth(1300)
    mount()
    expect(text('w-fnav')).toBe('340')
    expect(text('w-drawer')).toBe('460')
    restore2()
  })

  it('[回炉 W2] 极窄窗尽力语义：页容器 700+持久 340/460→止于各 min（160/240），保底 462 不强求', () => {
    window.localStorage.setItem(F_KEY, '340')
    window.localStorage.setItem(D_KEY, '460')
    const restore = stubPageWidth(700)
    mount()
    expect(text('w-fnav')).toBe('160')
    expect(text('w-drawer')).toBe('240')
    expect(window.localStorage.getItem(F_KEY)).toBe('160')
    expect(window.localStorage.getItem(D_KEY)).toBe('240')
    restore()
  })

  it('[裁决 P1-1] 启动跨格再钳：small 档挂载零钳→设置异步回 large（--ui-scale=1.25+含 rail 页容器视觉宽 1190）不重挂→RO 触发再钳 fnav 160/抽屉 316（中列=952−160−316−14=462≥保底）', () => {
    const instances: Array<{ cb: () => void }> = []
    class ROStub {
      cb: () => void
      constructor(cb: () => void) {
        this.cb = cb
        instances.push(this)
      }
      observe(): void {}
      disconnect(): void {}
    }
    ;(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ROStub
    try {
      const restore = stubPageWidth(1208)
      mount()
      expect(text('w-fnav')).toBe('224')
      restore()
      document.documentElement.style.setProperty('--ui-scale', '1.25')
      const restore2 = stubPageWidth(1190)
      act(() => {
        instances[0]?.cb()
      })
      expect(text('w-fnav')).toBe('160')
      expect(text('w-drawer')).toBe('316')
      expect(window.localStorage.getItem(F_KEY)).toBe('160')
      restore2()
    } finally {
      delete (globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver
    }
  })
})

describe('F-VISFB-41 LibraryPage 接线面——双侧分隔条挂载与 CSS 载体', () => {
  const cssLib = readFileSync(join(process.cwd(), 'src/renderer/features/library/library.css'), 'utf8')
  const cssExp = readFileSync(
    join(process.cwd(), 'src/renderer/features/library/library-explorer.css'),
    'utf8'
  )

  it('双 .lib-sep 在位：左条=.lib-fnav 之后·右条=.lib-drawer 之前；.lib-page>.lib-fnav 直子锚不破', async () => {
    await mountPage()
    const pg = host?.querySelector('.lib-page')
    expect(pg?.querySelector('.lib-fnav + .lib-sep')).not.toBeNull()
    expect(pg?.querySelector('.lib-main-col + .lib-sep')).not.toBeNull()
    expect(pg?.querySelector('.lib-sep + .lib-drawer')).not.toBeNull()
    expect(host?.querySelector('.lib-page > .lib-fnav')).not.toBeNull()
  })

  it('aria 面：双 separator role+aria-label+aria-valuenow/min/max（APG separator）', async () => {
    await mountPage()
    const seps = host?.querySelectorAll('.lib-sep')
    expect(seps?.length).toBe(2)
    const sf = seps?.[0]
    const sd = seps?.[1]
    if (!(sf instanceof HTMLElement) || !(sd instanceof HTMLElement)) {
      throw new Error('未找到双侧分隔条')
    }
    expect(sf.getAttribute('role')).toBe('separator')
    expect(sf.getAttribute('aria-label')).toBe('左栏宽度')
    expect(sf.getAttribute('aria-valuenow')).toBe('224')
    expect(sf.getAttribute('aria-valuemin')).toBe('160')
    expect(sf.getAttribute('aria-valuemax')).toBe('340')
    expect(sd.getAttribute('role')).toBe('separator')
    expect(sd.getAttribute('aria-label')).toBe('右栏宽度')
    expect(sd.getAttribute('aria-valuenow')).toBe('316')
    expect(sd.getAttribute('aria-valuemin')).toBe('240')
    expect(sd.getAttribute('aria-valuemax')).toBe('460')
  })

  it('CSS 载体逐值锁：.lib-fnav/.lib-drawer 宽=页根变量（缺省 224/316 零变）+.lib-sep 热区 7px', async () => {
    await mountPage()
    expect(cssExp).toMatch(/\.lib-fnav\s*\{[^}]*width:\s*var\(--lib-fnav-w,\s*224px\);/)
    expect(cssLib).toMatch(/\.lib-drawer\s*\{[^}]*width:\s*var\(--lib-drawer-w,\s*316px\);/)
    expect(cssLib).toMatch(/\.lib-sep\s*\{[^}]*width:\s*7px;/)
  })
})
