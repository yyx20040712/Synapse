// @vitest-environment jsdom
/**
 * [F-WS-02] WorkspacesPage（课题管理独立页）锁定测试（always-active，不经
 * guardedDescribe）。
 *
 * 锁行为面（票面三件之一——弹层 WsRailPopover 退役后新页承接全部课题管理面）：
 * ①卡片列表：色标片（WS_DOT_PALETTE 索引轮转——迁自 rail-shared 单源）+
 * 实名 + 文献计数（N 篇）+当前项 .on；②新建=「创建并切换」（create→
 * switchTo 链，空名 no-op 提示零 IPC）；③行内改名（rename IPC+清单即时
 * 改名——侧栏/状态条同源生效；取消还原）；④点选=switchTo 既有链路零动
 * （幂等零 IPC / dirty 确认取消零副作用 / 成功 reload——ADR-0018）；
 * ⑤失败面=store error 错误行+重试（弹层退役后本页=error 契约唯一壳层
 * 兑现点）；⑥引导态窗口提示行（管理面卡片显实名——D2「待选择」显示仅
 * rail 标签/状态条，本页=实体管理位）。
 * mock 配方沿 app-shell.test.tsx（makeApiStub+mount/flush）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, toastSpy } from '../../utils/api-client-mock'
import { ApiClientError } from '../../../src/renderer/api/client'

const stubApi = makeApiStub({
  workspaces: { list: vi.fn(), create: vi.fn(), rename: vi.fn(), switch: vi.fn() }
})

import {
  WorkspacesPage,
  WS_DOT_PALETTE
} from '../../../src/renderer/features/workspaces/WorkspacesPage'
import { useWorkspaceStore } from '../../../src/renderer/features/workspaces/workspace.store'

/** 引导态形状的 default 课题（三条件全成立——id=default∧0 篇∧默认名） */
const WS_DEFAULT_FRESH = {
  id: 'default',
  name: '默认课题',
  createdAt: '2026-01-01T00:00:00.000Z',
  paperCount: 0
}
const WS_B = {
  id: 'ws-b',
  name: '智慧水务水质模型课题',
  createdAt: '2026-01-02T00:00:00.000Z',
  paperCount: 7
}

let root: Root | null = null
let host: HTMLDivElement | null = null
let reloadSpy: ReturnType<typeof vi.fn>

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

/** 受控输入经 native setter 驱动（jsdom 直接改 value 不触发 React onChange） */
function setInputValue(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  act(() => {
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

beforeEach(async () => {
  vi.clearAllMocks()
  stubApi.workspaces.list.mockReset()
  stubApi.workspaces.create.mockReset()
  stubApi.workspaces.rename.mockReset()
  stubApi.workspaces.switch.mockReset()
  // jsdom location.reload not implemented：整体替换（workspace.store.test 同型）
  reloadSpy = vi.fn()
  Object.defineProperty(window, 'location', { configurable: true, value: { reload: reloadSpy } })
  vi.spyOn(window, 'confirm').mockImplementation(() => false)
  // 模块级 store 跨 mount 存留：显式复位防跨测污染
  useWorkspaceStore.setState({ items: [], currentId: '', loading: false, error: null })
  stubApi.workspaces.list.mockResolvedValue({
    ok: true,
    data: { items: [WS_DEFAULT_FRESH, WS_B], currentId: 'ws-b' }
  })
  stubApi.workspaces.create.mockResolvedValue({ ok: true, data: { id: 'ws-c' } })
  stubApi.workspaces.rename.mockResolvedValue({ ok: true, data: { ok: true } })
  stubApi.workspaces.switch.mockResolvedValue({ ok: true, data: { ok: true } })
  // 页测试直挂页组件（store 装载在 App 组合根——真实链由 app-shell.test 锁）：
  // 本文件先跑一次 load 填充清单（stale-guard 序号随复位后首发）
  await useWorkspaceStore.getState().load()
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
})

describe('F-WS-02 课题管理页——卡片列表与引导提示', () => {
  it('每课题一张卡：色标片（调色板索引轮转）+实名+N 篇；当前项挂 .on', async () => {
    mount(<WorkspacesPage dirty={false} />)
    await flush()
    const page = document.querySelector('.ws-page')
    expect(page, '课题管理页容器 .ws-page 在场').not.toBeNull()
    const cards = Array.from(page!.querySelectorAll('.ws-card'))
    expect(cards, '两课题两张卡').toHaveLength(2)
    expect(cards[0]!.querySelector('.nm')!.textContent, '卡片实名（全名非短名）').toBe('默认课题')
    expect(cards[0]!.querySelector('.ct')!.textContent, '文献计数=main 侧 COUNT').toContain('0 篇')
    expect(cards[1]!.querySelector('.ct')!.textContent).toContain('7 篇')
    expect(
      cards[0]!.querySelector<HTMLSpanElement>('.chip')!.style.background,
      '色标片=调色板索引 0 轮转（WS_DOT_PALETTE 迁入本页单源）'
    ).toBe(WS_DOT_PALETTE[0])
    expect(cards[1]!.querySelector<HTMLSpanElement>('.chip')!.style.background).toBe(
      WS_DOT_PALETTE[1 % WS_DOT_PALETTE.length]
    )
    expect(cards[1]!.classList.contains('on'), '当前课题卡挂 .on').toBe(true)
    expect(cards[0]!.classList.contains('on')).toBe(false)
  })

  it('引导态窗口（当前=default 三条件成立）：页首引导提示行在场；卡片仍显实名（管理面不受「待选择」显示影响）', async () => {
    useWorkspaceStore.setState({ items: [WS_DEFAULT_FRESH], currentId: 'default' })
    mount(<WorkspacesPage dirty={false} />)
    await flush()
    const page = document.querySelector('.ws-page')
    expect(page, '课题管理页在场').not.toBeNull()
    expect(page!.querySelector('.ws-guide'), '引导态提示行在场（D2：课题图标进管理页引导新建）').not.toBeNull()
    expect(page!.querySelector('.ws-card .nm')!.textContent, '管理面卡片=实体实名（默认课题）').toBe('默认课题')
  })

  it('非引导态：引导提示行不渲染（升格后不再打扰）', async () => {
    mount(<WorkspacesPage dirty={false} />)
    await flush()
    expect(document.querySelector('.ws-page .ws-guide'), '升格态无引导行').toBeNull()
  })
})

describe('F-WS-02 课题管理页——点选切换（switchTo 既有链路零动）', () => {
  it('点选其他课题卡：switchTo 走 IPC（含 id）并触发 reload（ADR-0018 维持）', async () => {
    mount(<WorkspacesPage dirty={false} />)
    await flush()
    const cards = document.querySelectorAll('.ws-card')
    await act(async () => {
      cards[0]!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flush()
    expect(stubApi.workspaces.switch).toHaveBeenCalledWith({ id: 'default' })
    expect(reloadSpy, '切换成功即 reload（全新 stores 零 stale 态）').toHaveBeenCalledTimes(1)
  })

  it('点选当前课题卡：幂等零 IPC 零 reload（确认语义不空切）', async () => {
    mount(<WorkspacesPage dirty={false} />)
    await flush()
    const current = document.querySelector('.ws-card.on')!
    await act(async () => {
      current.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flush()
    expect(stubApi.workspaces.switch, '幂等点选=零 IPC').not.toHaveBeenCalled()
    expect(reloadSpy).not.toHaveBeenCalled()
  })

  it('dirty=true 且确认取消：confirm 弹切换文案，IPC 与 reload 均不被调', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => false)
    mount(<WorkspacesPage dirty={true} />)
    await flush()
    const cards = document.querySelectorAll('.ws-card')
    await act(async () => {
      cards[0]!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flush()
    expect(confirmSpy).toHaveBeenCalledTimes(1)
    expect(String(confirmSpy.mock.calls[0]?.[0])).toContain('切换课题将丢弃未保存')
    expect(stubApi.workspaces.switch, '用户取消=零 IPC 零 reload').not.toHaveBeenCalled()
    expect(reloadSpy).not.toHaveBeenCalled()
  })

  it('动作失败 toast：switchTo 抛 ApiClientError→toast 中文 error；页面仍在场可重试', async () => {
    stubApi.workspaces.switch.mockRejectedValue(new ApiClientError('CONFLICT', '课题切换进行中，请稍后再试'))
    mount(<WorkspacesPage dirty={false} />)
    await flush()
    const cards = document.querySelectorAll('.ws-card')
    await act(async () => {
      cards[0]!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flush()
    expect(reloadSpy, '失败不 reload').not.toHaveBeenCalled()
    expect(toastSpy).toHaveBeenCalledWith('课题切换进行中，请稍后再试', 'error')
    expect(document.querySelector('.ws-page'), '失败后页面仍在场（可重试）').not.toBeNull()
  })
})

describe('F-WS-02 课题管理页——新建与改名', () => {
  it('新建：输入名→「创建并切换」（create→switchTo 链）；空名/纯空白=no-op 提示零 IPC', async () => {
    stubApi.workspaces.list.mockResolvedValue({
      ok: true,
      data: { items: [WS_DEFAULT_FRESH, { ...WS_B, id: 'ws-c', name: '课题丙' }], currentId: 'default' }
    })
    mount(<WorkspacesPage dirty={false} />)
    await flush()
    const input = document.querySelector<HTMLInputElement>('input[aria-label="新课题名称"]')!
    expect(input, '新建名称输入框在场').not.toBeNull()
    setInputValue(input, '课题丙')
    await act(async () => {
      document
        .querySelector('button.ws-create')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flush()
    expect(stubApi.workspaces.create).toHaveBeenCalledWith({ name: '课题丙' })
    expect(stubApi.workspaces.switch, '创建即切（创建后由 renderer 显式 switch）').toHaveBeenCalledWith({
      id: 'ws-c'
    })
    expect(reloadSpy).toHaveBeenCalledTimes(1)
    // 空名守卫：纯空白 no-op（提示 toast+零 IPC）
    toastSpy.mockClear()
    stubApi.workspaces.create.mockClear()
    const input2 = document.querySelector<HTMLInputElement>('input[aria-label="新课题名称"]')!
    setInputValue(input2, '   ')
    await act(async () => {
      document
        .querySelector('button.ws-create')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flush()
    expect(stubApi.workspaces.create, '纯空白名=no-op 零 IPC').not.toHaveBeenCalled()
    expect(toastSpy).toHaveBeenCalledWith('请输入课题名称', 'info')
  })

  it('改名：行内编辑确定→rename IPC+清单即时改名（侧栏同源生效）；取消还原不 IPC', async () => {
    mount(<WorkspacesPage dirty={false} />)
    await flush()
    const renameBtn = document.querySelector<HTMLButtonElement>('.ws-rename')!
    expect(renameBtn, '重命名入口在场').not.toBeNull()
    act(() => {
      renameBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    const edit = document.querySelector<HTMLInputElement>('input[aria-label="课题名称"]')!
    expect(edit, '行内改名编辑器展开').not.toBeNull()
    expect(edit.value, '草稿预填当前名').toBe('默认课题')
    setInputValue(edit, '课题甲改名')
    await act(async () => {
      document
        .querySelector('button.ws-rename-ok')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flush()
    expect(stubApi.workspaces.rename).toHaveBeenCalledWith({ id: 'default', name: '课题甲改名' })
    expect(
      useWorkspaceStore.getState().items.find((w) => w.id === 'default')?.name,
      'store items 即时改名（侧栏/状态条同源）'
    ).toBe('课题甲改名')
    expect(reloadSpy, '改名不 reload（就地生效）').not.toHaveBeenCalled()
    // 取消路径：展开→取消→还原展示态，零 IPC
    stubApi.workspaces.rename.mockClear()
    act(() => {
      document
        .querySelector<HTMLButtonElement>('.ws-rename')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    act(() => {
      document
        .querySelector('button.ws-rename-cancel')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(stubApi.workspaces.rename, '取消=零 IPC').not.toHaveBeenCalled()
    expect(document.querySelector('input[aria-label="课题名称"]'), '编辑器收起').toBeNull()
  })
})

describe('F-WS-02 课题管理页——失败面（store error 契约壳层兑现点）', () => {
  it('store error 非空：错误行+重试按钮，重试走 list load（弹层退役后唯一兑现点）', async () => {
    mount(<WorkspacesPage dirty={false} />)
    await flush()
    act(() => {
      useWorkspaceStore.setState({ error: '网络不可达' })
    })
    const errRow = document.querySelector('.ws-error')
    expect(errRow, '错误行在场').not.toBeNull()
    expect(errRow!.textContent).toContain('课题列表加载失败：网络不可达')
    const retry = errRow!.querySelector<HTMLButtonElement>('button.ws-retry')!
    expect(retry, '重试按钮在场').not.toBeNull()
    stubApi.workspaces.list.mockClear()
    await act(async () => {
      retry.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flush()
    expect(stubApi.workspaces.list, '重试=重跑 list load').toHaveBeenCalled()
  })
})
