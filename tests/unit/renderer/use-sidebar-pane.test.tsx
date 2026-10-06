// @vitest-environment jsdom
/**
 * [F-UIRES-03 B4③] 脉络右侧详情栏调宽/收起 hook 单测（always-active 裸
 * describe——K3）。useSidebarPane 逻辑面直测（SplitPane 先例同型的指针会话
 * 模拟：jsdom 无 PointerEvent 构造器→MouseEvent 同名派发）。
 *
 * 覆盖：缺省宽 252+mount 即持久化 / 持久化载入（合法值生效） / 越界存值
 * 回退默认（SplitPane loadWidth 先例语义）/ 拖拽 clamp 两界（200/480——
 * 手柄在右缘：右移变宽）/ 拖拽落定持久化+body 副作用起止 / 收起↔展开切换
 * 与持久化（synapse:sidebar:collapsed '1'/'0'）/ 收起态拖拽不启动 / 拖拽
 * 中途卸载 body 副作用还原（INV-14 同族）/ RR1 d1-W1：启动即
 * setPointerCapture(pointerId)（出窗 up 收尾防御）+收起态不 capture /
 * [F-UIRES-03 B5②] 键盘调宽（APG separator）：左右键 ±16 步进（clamp 同源
 * 钳）+Home/End 直达边界+其余键零操作+收起态零操作。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSidebarPane } from '../../../src/renderer/features/lineage/use-sidebar-pane'

const W_KEY = 'synapse:sidebar:width'
const C_KEY = 'synapse:sidebar:collapsed'

/** [F-ESC-01 R3] 活引用捕获（同帧直调判别面——不经 dispatch 边界） */
let liveSb: ReturnType<typeof useSidebarPane> | null = null

/** 探针：挂 hook 暴露宽/收起态+两动作钮+手柄（断言读真 DOM；[B5②] 手柄补
 *  onKeyDown 接线=Page 手柄同型） */
function Probe(): JSX.Element {
  const sb = useSidebarPane()
  liveSb = sb
  return (
    <div>
      <span data-testid="sb-w">{sb.width}</span>
      <span data-testid="sb-c">{String(sb.collapsed)}</span>
      <div data-testid="sb-handle" onPointerDown={sb.onResizeStart} onKeyDown={sb.onResizeKey} tabIndex={0} />
      <button type="button" data-testid="sb-collapse" onClick={sb.collapse}>
        收起
      </button>
      <button type="button" data-testid="sb-expand" onClick={sb.expand}>
        展开
      </button>
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

const text = (tid: string): string => (host?.querySelector(`[data-testid="${tid}"]`)?.textContent ?? '')
const handle = (): HTMLElement => host?.querySelector('[data-testid="sb-handle"]') as HTMLElement

/** jsdom 无 PointerEvent 构造器——MouseEvent 同名派发（split-pane 先例同型） */
function ptrAct(target: EventTarget, type: string, x: number): void {
  act(() => {
    target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x }))
  })
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
})

describe('F-UIRES-03 B4③ useSidebarPane——右侧详情栏调宽/收起', () => {
  it('缺省态：宽 252/未收起；mount 即落持久化默认值（width=252, collapsed=0）', () => {
    mount()
    expect(text('sb-w')).toBe('252')
    expect(text('sb-c')).toBe('false')
    expect(window.localStorage.getItem(W_KEY)).toBe('252')
    expect(window.localStorage.getItem(C_KEY)).toBe('0')
  })

  it('持久化载入：合法值生效（width 320/collapsed 1）', () => {
    window.localStorage.setItem(W_KEY, '320')
    window.localStorage.setItem(C_KEY, '1')
    mount()
    expect(text('sb-w')).toBe('320')
    expect(text('sb-c')).toBe('true')
  })

  it('越界存值回退默认宽：超上限 9999→252；低于下限 100→252（SplitPane loadWidth 先例语义）', () => {
    window.localStorage.setItem(W_KEY, '9999')
    mount()
    expect(text('sb-w')).toBe('252')
    act(() => {
      root?.unmount()
    })
    window.localStorage.setItem(W_KEY, '100')
    mount()
    expect(text('sb-w')).toBe('252')
  })

  it('拖拽 clamp 两界（手柄在右缘=右移变宽）：越上限→480 钳；越下限→200 钳；body 副作用起止', () => {
    mount()
    ptrAct(handle(), 'pointerdown', 800)
    expect(document.body.style.userSelect).toBe('none')
    expect(document.body.style.cursor).toBe('col-resize')
    ptrAct(document, 'pointermove', 2000)
    expect(text('sb-w')).toBe('480')
    ptrAct(document, 'pointerup', 2000)
    expect(document.body.style.userSelect).toBe('')
    expect(document.body.style.cursor).toBe('')
    // 第二段：自 480 向左拖过下限
    ptrAct(handle(), 'pointerdown', 800)
    ptrAct(document, 'pointermove', 10)
    expect(text('sb-w')).toBe('200')
    ptrAct(document, 'pointercancel', 10)
    expect(document.body.style.userSelect).toBe('')
  })

  it('RR1 d1-W1 pointer capture：主键启动会话即 setPointerCapture(pointerId)；收起态不 capture', () => {
    mount()
    const h = handle()
    const cap = vi.fn()
    // jsdom 元素无 setPointerCapture——桩上后断言实现确实调用（出窗 up 经捕获递送收尾）
    h.setPointerCapture = cap
    act(() => {
      const ev = new MouseEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        clientX: 800,
        button: 0
      })
      Object.defineProperty(ev, 'pointerId', { value: 7 })
      h.dispatchEvent(ev)
    })
    expect(cap, '拖拽会话启动即捕获指针').toHaveBeenCalledWith(7)
    expect(document.body.style.userSelect).toBe('none')
    ptrAct(document, 'pointerup', 800)
    expect(document.body.style.userSelect).toBe('')
    // 收起态：会话不启动，capture 亦不得调用
    act(() => {
      ;(host?.querySelector('[data-testid="sb-collapse"]') as HTMLElement).click()
    })
    cap.mockClear()
    ptrAct(handle(), 'pointerdown', 800)
    expect(cap).not.toHaveBeenCalled()
  })

  it('拖拽落定持久化：252 起右移 52→304 写 localStorage', () => {
    mount()
    ptrAct(handle(), 'pointerdown', 700)
    ptrAct(document, 'pointermove', 752)
    ptrAct(document, 'pointerup', 752)
    expect(text('sb-w')).toBe('304')
    expect(window.localStorage.getItem(W_KEY)).toBe('304')
  })

  it('收起↔展开切换与持久化：collapse→true+\'1\'；expand→false+\'0\'；收起态拖拽不启动', () => {
    mount()
    act(() => {
      ;(host?.querySelector('[data-testid="sb-collapse"]') as HTMLElement).click()
    })
    expect(text('sb-c')).toBe('true')
    expect(window.localStorage.getItem(C_KEY)).toBe('1')
    // 收起态：手柄 down 不开拖拽会话（body 副作用零变化）
    ptrAct(handle(), 'pointerdown', 800)
    expect(document.body.style.userSelect).toBe('')
    act(() => {
      ;(host?.querySelector('[data-testid="sb-expand"]') as HTMLElement).click()
    })
    expect(text('sb-c')).toBe('false')
    expect(window.localStorage.getItem(C_KEY)).toBe('0')
  })

  it('拖拽中途卸载：body 副作用必须还原（INV-14 同族——监听与样式同源清理）', () => {
    mount()
    ptrAct(handle(), 'pointerdown', 800)
    expect(document.body.style.userSelect).toBe('none')
    act(() => {
      root?.unmount()
    })
    expect(document.body.style.userSelect).toBe('')
    expect(document.body.style.cursor).toBe('')
  })

  it('[B5②] 键盘调宽（APG separator）：ArrowRight +16/ArrowLeft −16（clamp 同源钳 200–480）+Home/End 直达边界+其余键零操作+四键吞默认', () => {
    mount()
    const h = handle()
    const key = (k: string): void => {
      act(() => {
        h.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }))
      })
    }
    // 缺省 252：右步进 +16 → 268；左步进 −16 → 252
    key('ArrowRight')
    expect(text('sb-w')).toBe('268')
    key('ArrowLeft')
    expect(text('sb-w')).toBe('252')
    // 连按钳制：自 252 左步进 4 次 → 188 钳 200 后恒 200（clampSidebarWidth 单源）
    key('ArrowLeft')
    key('ArrowLeft')
    key('ArrowLeft')
    key('ArrowLeft')
    expect(text('sb-w')).toBe('200')
    // Home/End 直达边界（SIDEBAR_MIN/MAX_WIDTH 常量单源——200/480）
    key('End')
    expect(text('sb-w')).toBe('480')
    key('Home')
    expect(text('sb-w')).toBe('200')
    // 其余键零操作（字母/Enter/上下箭头——仅左右/Home/End 四键承载）
    key('a')
    key('Enter')
    key('ArrowUp')
    expect(text('sb-w')).toBe('200')
    // preventDefault：承载键吞默认（防 Home/End/箭头滚动页面），其余键不吞
    const evEnd = new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true })
    act(() => {
      h.dispatchEvent(evEnd)
    })
    expect(evEnd.defaultPrevented).toBe(true)
    const evOther = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true })
    act(() => {
      h.dispatchEvent(evOther)
    })
    expect(evOther.defaultPrevented).toBe(false)
    // 步进随持久化单点写
    expect(window.localStorage.getItem(W_KEY)).toBe('480')
  })

  it('[F-ESC-01 R3] 同帧连击判别：同一 act 内两次直调 onResizeKey ArrowRight→284（函数式=绿；闭包读值=两次同读 252 必红）', () => {
    mount()
    type FakeKeyEvent = { key: string; preventDefault: () => void }
    const keyEvt = (k: string): FakeKeyEvent => ({ key: k, preventDefault: vi.fn() })
    act(() => {
      ;(liveSb as unknown as { onResizeKey: (ev: FakeKeyEvent) => void }).onResizeKey(keyEvt('ArrowRight'))
      ;(liveSb as unknown as { onResizeKey: (ev: FakeKeyEvent) => void }).onResizeKey(keyEvt('ArrowRight'))
    })
    expect(text('sb-w')).toBe('284')
    // [RR2 W3] 回退段判别镜像：284−32=252（闭包形态=两读 284 得 268 必红）
    act(() => {
      ;(liveSb as unknown as { onResizeKey: (ev: FakeKeyEvent) => void }).onResizeKey(keyEvt('ArrowLeft'))
      ;(liveSb as unknown as { onResizeKey: (ev: FakeKeyEvent) => void }).onResizeKey(keyEvt('ArrowLeft'))
    })
    expect(text('sb-w')).toBe('252')
  })

  it('[B5②] 收起态键盘零操作（沿拖拽先例语义——窄条上调宽无意义）', () => {
    mount()
    act(() => {
      ;(host?.querySelector('[data-testid="sb-collapse"]') as HTMLElement).click()
    })
    act(() => {
      handle().dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }))
    })
    expect(text('sb-w')).toBe('252') // 收起态宽不被键盘改写
  })
})
