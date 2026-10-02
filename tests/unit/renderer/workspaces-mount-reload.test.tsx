// @vitest-environment jsdom
/**
 * [W2 小挂账] 课题管理页挂载重拉计数锁定测试（always-active）——
 * workspaces-page.test.tsx 姊妹件（受锁既有件零改动先例族；mock 配方同型）。
 *
 * 锁行为面（v87 P2-W2，晨间复审 L38）：非引导态导入后卡片/状态条计数会话内
 * 陈旧——专职管理页（WorkspacesPage）挂载时 load() 重拉一次（成本一次 IPC），
 * 陈旧性从「主数据面可见」收敛为挂载沿自愈；窗口外 reload 按钮/计数刷新语义
 * 仍归 F-UIRES-01 票面（本面=挂载重拉 only）。
 *
 * 注：简报③单元 D 落点文作「SettingsPage」——W2 挂账源（v87 §2+晨间复审
 * 报告 L38）真锚=WorkspacesPage（设置页课题管理节已随 F-WS-02 退役、设置页
 * 无计数显示面）；按挂账源落 WorkspacesPage，自裁申报在报告。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  workspaces: { list: vi.fn(), create: vi.fn(), rename: vi.fn(), switch: vi.fn() }
})

import { WorkspacesPage } from '../../../src/renderer/features/workspaces/WorkspacesPage'
import { useWorkspaceStore } from '../../../src/renderer/features/workspaces/workspace.store'

let root: Root | null = null
let host: HTMLDivElement | null = null

function mount(element: JSX.Element): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(element)
  })
}

const flush = async (turns = 6): Promise<void> => {
  for (let i = 0; i < turns; i++) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

/** 陈旧清单形状（store 内残留的导入前旧计数） */
const STALE_ITEMS = [
  { id: 'w1', name: '默认课题', createdAt: '2026-01-01T00:00:00Z', paperCount: 0 }
]
/** 主侧最新清单（导入后 paperCount 3——挂载重拉应取到此值） */
const FRESH_ITEMS = [
  { id: 'w1', name: '默认课题', createdAt: '2026-01-01T00:00:00Z', paperCount: 3 }
]

beforeEach(() => {
  vi.clearAllMocks()
  stubApi.workspaces.list.mockReset()
  stubApi.workspaces.create.mockReset()
  stubApi.workspaces.rename.mockReset()
  stubApi.workspaces.switch.mockReset()
  Object.defineProperty(window, 'location', { configurable: true, value: { reload: vi.fn() } })
  vi.spyOn(window, 'confirm').mockImplementation(() => false)
  // 陈旧态注入（store 模块级跨 mount 存留——挂载前残留导入前旧计数）
  useWorkspaceStore.setState({ items: STALE_ITEMS, currentId: 'w1', loading: false, error: null })
  stubApi.workspaces.list.mockResolvedValue({ ok: true, data: { items: FRESH_ITEMS, currentId: 'w1' } })
  stubApi.workspaces.create.mockResolvedValue({ ok: true, data: { id: 'w2' } })
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

describe('W2 课题管理页挂载重拉（计数陈旧自愈——挂载沿 only）', () => {
  it('挂载即 load()：workspaces.list 被调+卡片计数取主侧新值（0 篇陈旧→3 篇）', async () => {
    stubApi.workspaces.list.mockClear()
    mount(<WorkspacesPage dirty={false} />)
    await flush()
    expect(stubApi.workspaces.list, '挂载沿重拉课题清单（W2 修复面）').toHaveBeenCalled()
    expect(stubApi.workspaces.list, '挂载重拉恰一次（ref 闸锁"一次 only"票面词）').toHaveBeenCalledTimes(1)
    const card = document.querySelector('.ws-card .ct')
    expect(card?.textContent, '计数已刷新为主侧新值（3 篇）').toContain('3 篇')
  })

  it('重拉失败走既有错误契约：错误行+重试在场（列表型失败不抛不崩）', async () => {
    stubApi.workspaces.list.mockRejectedValue(new Error('net-down'))
    mount(<WorkspacesPage dirty={false} />)
    await flush()
    const alert = document.querySelector('.ws-error')
    expect(alert, 'store error 契约壳层兑现（错误行在场）').not.toBeNull()
    expect(alert?.textContent).toContain('课题列表加载失败')
    expect(document.querySelector('.ws-page'), '页面不崩').not.toBeNull()
  })
})
