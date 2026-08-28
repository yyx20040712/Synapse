// @vitest-environment jsdom
/**
 * [R1-WS2] WorkspaceSwitcher 组件锁定测试（always-active）。
 *
 * 配方=app-quit-dirty.test.tsx（stubApi+真 store+createRoot/act）；交互驱动
 * =tab-bar.test.tsx 先例（HTMLElement.click+原生 setter input 事件）。
 * 锁票面 P2 面：当前课题名展示 / 下拉（列表+新建+管理）/ 切换走 store
 * （dirty 由 App 经 props 注入——本文件直测注入形态）/ 新建链 create→switch。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as clientModule from '../../../src/renderer/api/client'

const { stubApi } = vi.hoisted(() => ({
  stubApi: {
    workspaces: {
      list: vi.fn(),
      create: vi.fn(),
      rename: vi.fn(),
      switch: vi.fn()
    }
  }
}))

vi.mock('../../../src/renderer/api/client', async (importOriginal) => {
  const real = await importOriginal<typeof clientModule>()
  return { ...real, api: stubApi as unknown as typeof clientModule.api }
})

import { WorkspaceSwitcher } from '../../../src/renderer/features/workspaces/WorkspaceSwitcher'
import { useWorkspaceStore } from '../../../src/renderer/features/workspaces/workspace.store'

const WS_A = { id: 'a', name: '课题甲', createdAt: '2026-01-01T00:00:00.000Z' }
const WS_B = { id: 'b', name: '课题乙', createdAt: '2026-01-02T00:00:00.000Z' }

let root: Root | null = null
let host: HTMLDivElement | null = null
let reloadSpy: ReturnType<typeof vi.fn>
const onManage = vi.fn()

function mountSwitcher(dirty: boolean): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(<WorkspaceSwitcher dirty={dirty} onManage={onManage} />)
  })
}

/** 按按钮文本找元素（可见文本子串匹配——jsdom 无 getByRole） */
function buttonByText(text: string): HTMLButtonElement | undefined {
  return [...document.querySelectorAll('button')].find((b) => b.textContent?.includes(text))
}

/** 排干 microtask 链（create→load→switch 多级 await——app-quit-dirty flush 同型） */
async function flush(turns = 8): Promise<void> {
  for (let i = 0; i < turns; i++) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

/** React 受控输入驱动（原生 setter+input 事件——直接赋 value 不生效） */
function typeInto(el: HTMLInputElement, text: string): void {
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
    setter?.call(el, text)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  reloadSpy = vi.fn()
  Object.defineProperty(window, 'location', { configurable: true, value: { reload: reloadSpy } })
  vi.spyOn(window, 'confirm').mockImplementation(() => false)
  onManage.mockReset()
  useWorkspaceStore.setState({ items: [WS_A, WS_B], currentId: 'a', loading: false, error: null })
  stubApi.workspaces.list.mockResolvedValue({ ok: true, data: { items: [WS_A, WS_B], currentId: 'a' } })
  stubApi.workspaces.create.mockResolvedValue({ ok: true, data: { id: 'c' } })
  stubApi.workspaces.rename.mockResolvedValue({ ok: true, data: { ok: true } })
  stubApi.workspaces.switch.mockResolvedValue({ ok: true, data: { ok: true } })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
})

describe('WorkspaceSwitcher', () => {
  it('展示当前课题名（store currentId 推导），未展开时下拉内容不渲染', () => {
    mountSwitcher(false)
    const toggle = buttonByText('课题甲')
    expect(toggle).toBeDefined()
    expect(buttonByText('课题乙')).toBeUndefined()
    expect(buttonByText('新建课题')).toBeUndefined()
  })

  it('展开下拉：课题列表（当前项带标记）+ 新建课题… + 管理课题', () => {
    mountSwitcher(false)
    act(() => {
      buttonByText('课题甲')?.click()
    })
    expect(buttonByText('课题乙')).toBeDefined()
    // 面板内当前项带「（当前）」标记（主按钮「课题甲 ▾」不含——需精确文本区分）
    const currentItem = [...document.querySelectorAll('button')].find(
      (b) => b.textContent === '课题甲（当前）'
    )
    expect(currentItem).toBeDefined()
    expect(buttonByText('新建课题')).toBeDefined()
    expect(buttonByText('管理课题')).toBeDefined()
  })

  it('点其他课题：switch IPC 收 {id}（dirty=false 注入——无确认直切）', async () => {
    mountSwitcher(false)
    act(() => {
      buttonByText('课题甲')?.click()
    })
    act(() => {
      buttonByText('课题乙')?.click()
    })
    await flush()
    expect(stubApi.workspaces.switch).toHaveBeenCalledWith({ id: 'b' })
    expect(reloadSpy).toHaveBeenCalledTimes(1)
  })

  it('dirty=true 且用户取消确认：不调 switch IPC', async () => {
    vi.spyOn(window, 'confirm').mockImplementation(() => false)
    mountSwitcher(true)
    act(() => {
      buttonByText('课题甲')?.click()
    })
    act(() => {
      buttonByText('课题乙')?.click()
    })
    await flush()
    expect(stubApi.workspaces.switch).not.toHaveBeenCalled()
    expect(reloadSpy).not.toHaveBeenCalled()
  })

  it('「管理课题」点击回调 onManage（App 跳设置页接线位）', () => {
    mountSwitcher(false)
    act(() => {
      buttonByText('课题甲')?.click()
    })
    act(() => {
      buttonByText('管理课题')?.click()
    })
    expect(onManage).toHaveBeenCalledTimes(1)
  })

  it('新建链：输入名称提交 → create 收 {name} 且 switch 收新 id', async () => {
    mountSwitcher(false)
    act(() => {
      buttonByText('课题甲')?.click()
    })
    act(() => {
      buttonByText('新建课题')?.click()
    })
    const input = document.querySelector('input[aria-label="新课题名称"]') as HTMLInputElement | null
    expect(input).not.toBeNull()
    typeInto(input as HTMLInputElement, '课题丙')
    act(() => {
      buttonByText('创建')?.click()
    })
    await flush()
    expect(stubApi.workspaces.create).toHaveBeenCalledWith({ name: '课题丙' })
    expect(stubApi.workspaces.switch).toHaveBeenCalledWith({ id: 'c' })
    expect(reloadSpy).toHaveBeenCalledTimes(1)
  })

  it('列表失败 error 内联呈现（非 toast）+「重试」复跑 load（回炉 W1——头注内联契约兑现）', async () => {
    useWorkspaceStore.setState({
      items: [WS_A, WS_B],
      currentId: 'a',
      error: '课题列表加载失败'
    })
    mountSwitcher(false)
    // 内联错误行可见（常驻——不依赖展开态；错误契约：列表型持续展示）
    const errLine = [...document.querySelectorAll('span')].find((el) =>
      el.textContent === '课题列表加载失败'
    )
    expect(errLine, 'error 应内联渲染').toBeDefined()
    // 重试语义复用 load：点「重试」→ list IPC 被再次调用
    stubApi.workspaces.list.mockClear()
    const retry = buttonByText('重试')
    expect(retry).toBeDefined()
    act(() => {
      retry?.click()
    })
    await flush()
    expect(stubApi.workspaces.list).toHaveBeenCalledTimes(1)
  })
})
