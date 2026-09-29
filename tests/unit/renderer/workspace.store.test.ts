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
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  workspaces: {
    list: vi.fn(),
    create: vi.fn(),
    rename: vi.fn(),
    switch: vi.fn()
  }
})

import {
  useWorkspaceStore,
  selectCurrentName,
  isGuideState,
  selectDisplayWsName,
  WS_GUIDE_LABEL
} from '../../../src/renderer/features/workspaces/workspace.store'
import { useNotesStore } from '../../../src/renderer/features/notes/notes.store'

const WS_A = { id: 'a', name: '课题甲', createdAt: '2026-01-01T00:00:00.000Z', paperCount: 0 }
const WS_B = { id: 'b', name: '课题乙', createdAt: '2026-01-02T00:00:00.000Z', paperCount: 0 }

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

// ── A3 悬置写修票（2026-09-02，always-active——文末追加）──
// switchTo 兼任切课题弃改收口点（INV-35④ 显式防悬置写）：确认通过/clean 直达
// 即 discardAll notes 悬置编辑（reload 前零 timer 零内存草稿）；取消不弃改。
// 经真实 notes.store 状态断言（edit 同步打点，不经 api——本文件 api 桩无 notes 域）。
describe('workspace.store switchTo 弃改收口（A3/INV-35④）', () => {
  beforeEach(() => {
    useNotesStore.setState({ noteByPaper: {} })
  })

  it('确认接受→discardAll 生效（两篇 pending→零条目）；取消不弃改；clean 直达幂等', async () => {
    useWorkspaceStore.setState({ items: [WS_A, WS_B], currentId: 'a' })
    useNotesStore.getState().edit('p-1', { contentMd: '甲草稿' })
    useNotesStore.getState().edit('p-2', { contentMd: '乙草稿' })
    // 取消：零 IPC 零弃改（弃改语义只在确认后）
    vi.spyOn(window, 'confirm').mockImplementation(() => false)
    await useWorkspaceStore.getState().switchTo('b', { dirty: true })
    expect(useNotesStore.getState().noteByPaper['p-1']?.pending).toBe(true)
    expect(stubApi.workspaces.switch).not.toHaveBeenCalled()
    // 确认接受：discardAll 收口（M4 锚：接线缺席即红）——reload 桩维持既有形态
    vi.spyOn(window, 'confirm').mockImplementation(() => true)
    await useWorkspaceStore.getState().switchTo('b', { dirty: true })
    expect(useNotesStore.getState().noteByPaper['p-1']).toBeUndefined()
    expect(useNotesStore.getState().noteByPaper['p-2']).toBeUndefined()
    expect(stubApi.workspaces.switch).toHaveBeenCalledWith({ id: 'b' })
    expect(reloadSpy).toHaveBeenCalledTimes(1)
    // clean 直达：收口调用幂等（无 pending 时 no-op 不抛）
    useWorkspaceStore.setState({ items: [WS_A, WS_B], currentId: 'a' })
    await useWorkspaceStore.getState().switchTo('b', { dirty: false })
    expect(reloadSpy).toHaveBeenCalledTimes(2)
  })
})

// ── [F-WS-02] 默认课题引导态判定与升格（INV-87，always-active——文末追加）──
// 三条件（D2 批后定稿）：id=default ∧ paperCount=0 ∧ name=默认名单源常量
// （DEFAULT_WS_NAME——single source 从 main/fs 提炼 shared/constants）。
// 任一打破即升格实名；跨格序列=改名在途（清单未变禁用保持）/导入路（计数
// 经清单刷新）/切换路（currentId≠default）。
describe('workspace.store 引导态判定 isGuideState 与显示名 selectDisplayWsName（F-WS-02）', () => {
  /** 引导态形状：default+0 篇+默认名 */
  const GUIDE_DEFAULT = {
    id: 'default',
    name: '默认课题',
    createdAt: '2026-01-01T00:00:00.000Z',
    paperCount: 0
  }

  it('三条件全格：default∧0 篇∧默认名=引导态；任一打破（改名/计数>0/非 default/无当前课题）即非引导态', () => {
    const st = (items: typeof WS_A[], currentId: string) => ({ items, currentId })
    expect(isGuideState(st([GUIDE_DEFAULT], 'default')), '三条件全成立=引导态').toBe(true)
    expect(isGuideState(st([{ ...GUIDE_DEFAULT, name: '我的课题' }], 'default')), '改名打破').toBe(false)
    expect(isGuideState(st([{ ...GUIDE_DEFAULT, paperCount: 1 }], 'default')), '导入计数打破').toBe(false)
    expect(isGuideState(st([GUIDE_DEFAULT, WS_B], 'b')), 'currentId≠default 打破').toBe(false)
    expect(isGuideState(st([GUIDE_DEFAULT, WS_B], '')), '无当前课题（兜底态）非引导态').toBe(false)
    expect(isGuideState(st([], 'default')), '空清单非引导态（防御格）').toBe(false)
  })

  it('显示名推导：引导态=待选择（WS_GUIDE_LABEL 单源）；升格后=实名；无当前课题=空串', () => {
    expect(selectDisplayWsName({ items: [GUIDE_DEFAULT], currentId: 'default' }), '引导态显示位=待选择').toBe(
      WS_GUIDE_LABEL
    )
    expect(
      selectDisplayWsName({ items: [{ ...GUIDE_DEFAULT, name: '我的课题' }], currentId: 'default' }),
      '升格后=实名'
    ).toBe('我的课题')
    expect(
      selectDisplayWsName({ items: [{ ...GUIDE_DEFAULT, paperCount: 2 }], currentId: 'default' }),
      '计数升格（名未改）=实名（默认课题）'
    ).toBe('默认课题')
    expect(selectDisplayWsName({ items: [GUIDE_DEFAULT], currentId: '' }), '无当前课题=空串').toBe('')
  })

  it('升格迁移序（跨格）：改名在途（清单未变）引导态保持，落定即升格；导入路/切换路同构收口', async () => {
    // 跨格格 1：改名在途——rename IPC 未决期间 items 仍默认名（禁用态保持）
    let resolveRename: (v: { ok: true }) => void = () => undefined
    stubApi.workspaces.rename.mockImplementation(
      () => new Promise((res) => (resolveRename = res))
    )
    useWorkspaceStore.setState({ items: [GUIDE_DEFAULT, WS_B], currentId: 'default' })
    const pending = useWorkspaceStore.getState().rename('default', '我的课题')
    await Promise.resolve()
    expect(isGuideState(useWorkspaceStore.getState()), '改名在途（清单未变）引导态保持').toBe(true)
    resolveRename({ ok: true })
    await pending
    expect(isGuideState(useWorkspaceStore.getState()), '改名落定即升格').toBe(false)
    expect(useWorkspaceStore.getState().items[0]?.name, '清单即时改名（侧栏同源）').toBe('我的课题')
    // 跨格格 2（导入路）：计数经清单刷新——items 换为 paperCount>0 即升格
    useWorkspaceStore.setState({ items: [{ ...GUIDE_DEFAULT, paperCount: 2 }], currentId: 'default' })
    expect(isGuideState(useWorkspaceStore.getState()), '导入落地（计数>0）升格').toBe(false)
    // 跨格格 3（切换路）：currentId 指向非 default 即升格（reload 后清单同构）
    useWorkspaceStore.setState({ items: [GUIDE_DEFAULT, WS_B], currentId: 'b' })
    expect(isGuideState(useWorkspaceStore.getState()), '切非 default 升格').toBe(false)
  })
})
