// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SplitPane } from '../../../src/renderer/shared/ui/SplitPane'
import { guardedDescribe } from '../../utils/guard'

const KEY = 'synapse:splitpane:t1'

function renderPane(
  props: Partial<Parameters<typeof SplitPane>[0]> = {}
): { host: HTMLDivElement; unmount(): void } {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  act(() => {
    root.render(
      <SplitPane
        paneId="t1"
        side="left"
        defaultWidth={220}
        min={120}
        max={400}
        children={{ pane: <div data-testid="pane-body">侧栏内容</div>, main: <div data-testid="main-body">主区</div> }}
        {...props}
      />
    )
  })
  return {
    host,
    unmount: () => {
      act(() => {
        root.unmount()
      })
      host.remove()
    }
  }
}

/** jsdom 无 PointerEvent 构造器——MouseEvent 同名派发（React 按类型名委托）；
 *  必须包 act：dispatch 触发的 setState 需冲刷后断言才可见 */
function ptrAct(target: EventTarget, type: string, x: number): void {
  act(() => {
    target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x }))
  })
}

function paneWidth(host: HTMLElement): string {
  const pane = host.querySelector('[data-testid="split-pane-pane"]') as HTMLElement
  return pane.style.width
}

function handle(host: HTMLElement): HTMLElement {
  const h = host.querySelector('[role="separator"]')
  expect(h).not.toBeNull()
  return h as HTMLElement
}

beforeEach(() => {
  window.localStorage.clear()
})

guardedDescribe('SR2-UIK-01', 'SplitPane —— 可拖拽分隔条容器', () => {
  it('渲染 pane/main 与 separator 手柄；默认宽生效', () => {
    const { host } = renderPane()
    expect(host.querySelector('[data-testid="pane-body"]')?.textContent).toBe('侧栏内容')
    expect(host.querySelector('[data-testid="main-body"]')?.textContent).toBe('主区')
    expect(handle(host)).toBeTruthy()
    expect(paneWidth(host)).toBe('220px')
  })

  it('持久化载入：合法值生效，越界值回退默认宽', () => {
    window.localStorage.setItem(KEY, '240')
    const a = renderPane()
    expect(paneWidth(a.host)).toBe('240px')
    a.unmount()
    window.localStorage.setItem(KEY, '99999')
    const b = renderPane()
    expect(paneWidth(b.host)).toBe('220px')
    b.unmount()
  })

  it('拖拽会话：pointerdown→move 更新宽度（左随右移变宽）→up 还原 body 副作用并持久化', () => {
    const { host, unmount } = renderPane()
    const h = handle(host)
    ptrAct(h, 'pointerdown', 300)
    expect(document.body.style.userSelect).toBe('none')
    expect(document.body.style.cursor).toBe('col-resize')
    ptrAct(document, 'pointermove', 350)
    expect(paneWidth(host)).toBe('270px')
    ptrAct(document, 'pointerup', 350)
    expect(document.body.style.userSelect).toBe('')
    expect(document.body.style.cursor).toBe('')
    expect(window.localStorage.getItem(KEY)).toBe('270')
    unmount()
  })

  it('拖拽夹取：越界移动钳制在 max', () => {
    const { host, unmount } = renderPane()
    ptrAct(handle(host), 'pointerdown', 300)
    ptrAct(document, 'pointermove', 900)
    expect(paneWidth(host)).toBe('400px')
    ptrAct(document, 'pointerup', 900)
    unmount()
  })

  it('拖拽中途卸载：body 副作用必须还原（INV-14 同族）', () => {
    const { host, unmount } = renderPane()
    ptrAct(handle(host), 'pointerdown', 300)
    expect(document.body.style.userSelect).toBe('none')
    unmount()
    expect(document.body.style.userSelect).toBe('')
    expect(document.body.style.cursor).toBe('')
  })

  it('键盘调宽：左栏 ArrowRight +8 / ArrowLeft -8，越界夹取并持久化', () => {
    const { host, unmount } = renderPane()
    const h = handle(host)
    act(() => {
      h.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })
      )
    })
    expect(paneWidth(host)).toBe('228px')
    expect(window.localStorage.getItem(KEY)).toBe('228')
    act(() => {
      for (let i = 0; i < 50; i++) {
        h.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true })
        )
      }
    })
    expect(paneWidth(host)).toBe('120px')
    expect(window.localStorage.getItem(KEY)).toBe('120')
    unmount()
  })

  it('collapsible：双击手柄折叠 pane（隐藏，宽度记忆），再双击恢复', () => {
    const { host, unmount } = renderPane({ collapsible: true })
    const h = handle(host)
    act(() => {
      h.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }))
    })
    const pane = host.querySelector('[data-testid="split-pane-pane"]') as HTMLElement
    expect(pane.style.display).toBe('none')
    // 折叠态：aria-valuenow 归零、拖拽/键盘不启动（隐藏栏无谓调宽）
    expect(h.getAttribute('aria-valuenow')).toBe('0')
    ptrAct(h, 'pointerdown', 300)
    expect(document.body.style.userSelect).toBe('')
    act(() => {
      h.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })
      )
    })
    expect(paneWidth(host)).toBe('220px')
    act(() => {
      h.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }))
    })
    expect(pane.style.display).not.toBe('none')
    unmount()
  })

  it('pointercancel 与 pointerup 同路径收尾：副作用还原+宽度持久化', () => {
    const { host, unmount } = renderPane()
    ptrAct(handle(host), 'pointerdown', 300)
    ptrAct(document, 'pointermove', 360)
    ptrAct(document, 'pointercancel', 360)
    expect(document.body.style.userSelect).toBe('')
    expect(window.localStorage.getItem(KEY)).toBe('280')
    unmount()
  })

  it('右栏方向语义：随左移变宽（px-clientX），渲染序 main→手柄→pane', () => {
    const { host, unmount } = renderPane({ side: 'right' })
    const rootNode = host.querySelector('[data-testid="split-pane-root"]') as HTMLElement
    expect(rootNode.children[0]?.querySelector('[data-testid="main-body"]')).not.toBeNull()
    expect(rootNode.children[1]?.getAttribute('role')).toBe('separator')
    expect(rootNode.children[2]?.querySelector('[data-testid="pane-body"]')).not.toBeNull()
    ptrAct(handle(host), 'pointerdown', 300)
    ptrAct(document, 'pointermove', 250)
    expect(paneWidth(host)).toBe('270px')
    ptrAct(document, 'pointerup', 250)
    unmount()
  })

  it('main 槽可空：仅渲染 pane+手柄，无主区占位（消费方外置主内容的稳定子位模式）', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    act(() => {
      root.render(
        <SplitPane
          paneId="t1"
          side="left"
          defaultWidth={220}
          min={120}
          max={400}
          children={{ pane: <div data-testid="pane-body">侧栏</div>, main: null }}
        />
      )
    })
    expect(host.querySelector('[data-testid="pane-body"]')).not.toBeNull()
    expect(handle(host)).toBeTruthy()
    expect(host.querySelector('[data-testid="main-body"]')).toBeNull()
    // main=null 时根容器只有 pane+手柄两个子元素（不渲染空主区占位 div）
    const rootNode = host.querySelector('[data-testid="split-pane-root"]') as HTMLElement
    expect(rootNode.children).toHaveLength(2)
    act(() => {
      root.unmount()
    })
    host.remove()
  })

  it('ARIA 可访问性：separator 暴露宽度值域与名称；非主键不启动拖拽', () => {
    const { host, unmount } = renderPane()
    const h = handle(host)
    expect(h.getAttribute('aria-valuenow')).toBe('220')
    expect(h.getAttribute('aria-valuemin')).toBe('120')
    expect(h.getAttribute('aria-valuemax')).toBe('400')
    expect(h.getAttribute('aria-label')).not.toBeNull()
    // 中键（button=1）不启动会话：body 副作用不出现
    act(() => {
      h.dispatchEvent(
        new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 300, button: 1 })
      )
    })
    expect(document.body.style.userSelect).toBe('')
    unmount()
  })
})

// F-UI-03 新增面 always-active：三屋 strong 工单新测试不经 guardedDescribe
// （AGENTS.md 工单工作流 K3 条款——open 状态下 guardedDescribe 整组 skip，
// TDD 红/绿与「每个测试必须能失败一次」均不可达；自裁申报在档）
describe('F-UI-03 SplitPane 折叠扩展——窄条折叠+受控折叠面', () => {
  it('collapsedWidth：双击折叠到 64px 窄条（display 保留可见），aria-valuenow=64；再双击恢复原宽（宽度记忆）', () => {
    const { host, unmount } = renderPane({ collapsible: true, collapsedWidth: 64 })
    const h = handle(host)
    expect(paneWidth(host)).toBe('220px')
    act(() => {
      h.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }))
    })
    const pane = host.querySelector('[data-testid="split-pane-pane"]') as HTMLElement
    expect(paneWidth(host)).toBe('64px')
    expect(pane.style.display).not.toBe('none')
    expect(h.getAttribute('aria-valuenow')).toBe('64')
    // 窄条折叠态拖拽/键盘仍不启动（现行为保留——折叠栏上调宽无意义）
    ptrAct(h, 'pointerdown', 300)
    expect(document.body.style.userSelect).toBe('')
    act(() => {
      h.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })
      )
    })
    expect(paneWidth(host)).toBe('64px')
    act(() => {
      h.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }))
    })
    expect(paneWidth(host)).toBe('220px')
    expect(pane.style.display).not.toBe('none')
    unmount()
  })

  it('受控折叠：collapsed prop 驱动宽 64/原宽切换；双击手柄上报 onCollapsedChange(true) 且内部不自改', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    const onCollapsedChange = vi.fn()
    const render = (collapsed: boolean): void => {
      act(() => {
        root.render(
          <SplitPane
            paneId="t1"
            side="left"
            defaultWidth={220}
            min={120}
            max={400}
            collapsible
            collapsedWidth={64}
            collapsed={collapsed}
            onCollapsedChange={onCollapsedChange}
            children={{ pane: <div data-testid="pane-body">侧栏</div>, main: null }}
          />
        )
      })
    }
    render(false)
    expect(paneWidth(host)).toBe('220px')
    // 双击=上报请求（受控模式内部不自行切换——外部未变 state，宽保持 220px）
    act(() => {
      handle(host).dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }))
    })
    expect(onCollapsedChange).toHaveBeenCalledTimes(1)
    expect(onCollapsedChange).toHaveBeenLastCalledWith(true)
    expect(paneWidth(host)).toBe('220px')
    // 外部 state 驱动切换（受控真值面）
    render(true)
    expect(paneWidth(host)).toBe('64px')
    expect(
      (host.querySelector('[data-testid="split-pane-pane"]') as HTMLElement).style.display
    ).not.toBe('none')
    render(false)
    expect(paneWidth(host)).toBe('220px')
    act(() => {
      root.unmount()
    })
    host.remove()
  })
})
