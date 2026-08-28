// @vitest-environment jsdom
/**
 * [R1-WS2] workspace.store 锁定测试（always-active，不经 guardedDescribe）。
 *
 * 锁行为面（票面 P1）：load 驻留 / switchTo 的 dirty 拦截（confirm 文案）
 * +无 dirty 直切 + location.reload 调用（ADR-0018 渲染层切换裁决：全新
 * stores 零 stale 态）/ create 透传+列表刷新 / rename 即时生效 / load
 * 列表型失败不抛（错误契约：写 error 内联展示——App 级受锁测试
 * app-quit-dirty.test.tsx 的 stubApi 无 workspaces 域，靠本契约兜住不抛）。
 * jsdom 环境：confirm/reload 均为 not implemented——统一 stub。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
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

import { useWorkspaceStore, selectCurrentName } from '../../../src/renderer/features/workspaces/workspace.store'

const WS_A = { id: 'a', name: '课题甲', createdAt: '2026-01-01T00:00:00.000Z' }
const WS_B = { id: 'b', name: '课题乙', createdAt: '2026-01-02T00:00:00.000Z' }

let reloadSpy: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  // jsdom location.reload 是 not implemented：整体替换 location 对象（jsdom
  // 的 window.location 为 configurable own property，可重定义）
  reloadSpy = vi.fn()
  Object.defineProperty(window, 'location', { configurable: true, value: { reload: reloadSpy } })
  vi.spyOn(window, 'confirm').mockImplementation(() => false)
  // 模块级 store 常驻：跨用例复位
  useWorkspaceStore.setState({ items: [], currentId: '', loading: false, error: null })
  stubApi.workspaces.list.mockResolvedValue({ ok: true, data: { items: [WS_A, WS_B], currentId: 'a' } })
  stubApi.workspaces.create.mockResolvedValue({ ok: true, data: { id: 'c' } })
  stubApi.workspaces.rename.mockResolvedValue({ ok: true, data: { ok: true } })
  stubApi.workspaces.switch.mockResolvedValue({ ok: true, data: { ok: true } })
})

describe('workspace.store', () => {
  it('load()：list 成功后 items 与 currentId 驻留，selectCurrentName 推导当前名', async () => {
    await useWorkspaceStore.getState().load()
    const s = useWorkspaceStore.getState()
    expect(s.items).toEqual([WS_A, WS_B])
    expect(s.currentId).toBe('a')
    expect(selectCurrentName(s)).toBe('课题甲')
    expect(s.error).toBeNull()
  })

  it('load() 失败不抛：error 写中文（列表型错误契约——stubApi 缺域的 App 级测试同沿）', async () => {
    stubApi.workspaces.list.mockResolvedValue({
      ok: false,
      error: { code: 'IO', message: '读取课题清单失败' }
    })
    await expect(useWorkspaceStore.getState().load()).resolves.toBeUndefined()
    const s = useWorkspaceStore.getState()
    expect(s.error).toBe('读取课题清单失败')
    expect(s.items).toEqual([])
  })

  it('switchTo 无 dirty：直调 IPC（含 id）且触发 location.reload', async () => {
    useWorkspaceStore.setState({ items: [WS_A, WS_B], currentId: 'a' })
    await useWorkspaceStore.getState().switchTo('b', { dirty: false })
    expect(stubApi.workspaces.switch).toHaveBeenCalledWith({ id: 'b' })
    expect(reloadSpy).toHaveBeenCalledTimes(1)
  })

  it('switchTo dirty 且用户取消：confirm 弹「切换课题将丢弃未保存」文案，IPC 与 reload 均不被调', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => false)
    useWorkspaceStore.setState({ items: [WS_A, WS_B], currentId: 'a' })
    await useWorkspaceStore.getState().switchTo('b', { dirty: true })
    expect(confirmSpy).toHaveBeenCalledTimes(1)
    expect(String(confirmSpy.mock.calls[0]?.[0])).toContain('切换课题将丢弃未保存')
    expect(stubApi.workspaces.switch).not.toHaveBeenCalled()
    expect(reloadSpy).not.toHaveBeenCalled()
  })

  it('switchTo dirty 且用户确认：照常走 IPC+reload', async () => {
    vi.spyOn(window, 'confirm').mockImplementation(() => true)
    useWorkspaceStore.setState({ items: [WS_A, WS_B], currentId: 'a' })
    await useWorkspaceStore.getState().switchTo('b', { dirty: true })
    expect(stubApi.workspaces.switch).toHaveBeenCalledWith({ id: 'b' })
    expect(reloadSpy).toHaveBeenCalledTimes(1)
  })

  it('switchTo 当前课题：幂等直返，不弹确认不调 IPC 不 reload', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm')
    useWorkspaceStore.setState({ items: [WS_A, WS_B], currentId: 'a' })
    await useWorkspaceStore.getState().switchTo('a', { dirty: true })
    expect(confirmSpy).not.toHaveBeenCalled()
    expect(stubApi.workspaces.switch).not.toHaveBeenCalled()
    expect(reloadSpy).not.toHaveBeenCalled()
  })

  it('create(name)：透传 IPC 并刷新列表（dirty 取消切换后清单仍可见新课题），返回新 id', async () => {
    useWorkspaceStore.setState({ items: [WS_A], currentId: 'a' })
    stubApi.workspaces.list.mockResolvedValue({
      ok: true,
      data: { items: [WS_A, { ...WS_A, id: 'c', name: '课题丙' }], currentId: 'a' }
    })
    const id = await useWorkspaceStore.getState().create('课题丙')
    expect(id).toBe('c')
    expect(stubApi.workspaces.create).toHaveBeenCalledWith({ name: '课题丙' })
    expect(useWorkspaceStore.getState().items).toHaveLength(2)
  })

  it('rename(id, name)：成功后 items 内该行即时改名（侧栏与设置面同源生效）', async () => {
    useWorkspaceStore.setState({ items: [WS_A, WS_B], currentId: 'a' })
    await useWorkspaceStore.getState().rename('b', '课题乙新名')
    expect(stubApi.workspaces.rename).toHaveBeenCalledWith({ id: 'b', name: '课题乙新名' })
    expect(useWorkspaceStore.getState().items[1]?.name).toBe('课题乙新名')
  })
})
