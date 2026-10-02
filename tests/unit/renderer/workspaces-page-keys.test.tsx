// @vitest-environment jsdom
/**
 * [F-UIRES-02 批 A R2/R3/R4] WorkspacesPage 输入交互三键化+课题卡双击
 * （workspaces-page.test.tsx 姊妹件——受锁既有件零改动，mock 配方同型）。
 *
 * - R2 重命名行内编辑三键全套：Enter 提交 / 失焦提交 / Esc 取消（先
 *   skipBlur 标记）/ isComposing 守卫；空名=既有 toast；确定/取消钮
 *   mousedown preventDefault（TagEditor 先例——焦点留 input 防双发）。
 * - R3 新建常驻输入：Enter=创建并切换（submitCreate 既有校验链）/
 *   Esc=清空（常驻输入取消语义）/ isComposing 守卫。
 * - R4 课题卡双击=进入重命名（单击切换语义既有不动——workspaces-page.test 已锁）。
 * always-active 裸 describe（K3）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, toastSpy } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  workspaces: { list: vi.fn(), create: vi.fn(), rename: vi.fn(), switch: vi.fn() }
})

import { WorkspacesPage } from '../../../src/renderer/features/workspaces/WorkspacesPage'
import { useWorkspaceStore } from '../../../src/renderer/features/workspaces/workspace.store'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const WS_DEFAULT = {
  id: 'default',
  name: '默认课题',
  createdAt: '2026-01-01T00:00:00.000Z',
  paperCount: 0
}
const WS_B = {
  id: 'ws-b',
  name: '水质模型课题',
  createdAt: '2026-01-02T00:00:00.000Z',
  paperCount: 7
}

let root: Root | null = null
let host: HTMLDivElement | null = null
let reloadSpy: ReturnType<typeof vi.fn>

function mountPage(): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(<WorkspacesPage dirty={false} />)
  })
}

const flush = async (turns = 6): Promise<void> => {
  for (let i = 0; i < turns; i += 1) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

function setInputValue(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  act(() => {
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

/** 行内编辑 input（aria-label=课题名称——既有锚） */
function renameInput(): HTMLInputElement {
  const el = document.querySelector<HTMLInputElement>('input[aria-label="课题名称"]')
  if (el === null) throw new Error('重命名编辑器不在场')
  return el
}

/** 新建常驻 input */
function createInput(): HTMLInputElement {
  const el = document.querySelector<HTMLInputElement>('input[aria-label="新课题名称"]')
  if (el === null) throw new Error('新建输入框不在场')
  return el
}

function keydown(el: Element, key: string, isComposing = false): KeyboardEvent {
  const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, isComposing })
  act(() => {
    el.dispatchEvent(ev)
  })
  return ev
}

function clickEl(el: Element): void {
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  })
}

/** 进入重命名编辑（「重命名」钮既有入口） */
function openRename(): void {
  const btn = document.querySelector<HTMLButtonElement>('.ws-rename')
  if (btn === null) throw new Error('重命名入口不在场')
  clickEl(btn)
}

beforeEach(async () => {
  vi.clearAllMocks()
  stubApi.workspaces.list.mockReset()
  stubApi.workspaces.create.mockReset()
  stubApi.workspaces.rename.mockReset()
  stubApi.workspaces.switch.mockReset()
  reloadSpy = vi.fn()
  Object.defineProperty(window, 'location', { configurable: true, value: { reload: reloadSpy } })
  vi.spyOn(window, 'confirm').mockImplementation(() => false)
  useWorkspaceStore.setState({ items: [], currentId: '', loading: false, error: null })
  stubApi.workspaces.list.mockResolvedValue({
    ok: true,
    data: { items: [WS_DEFAULT, WS_B], currentId: 'ws-b' }
  })
  stubApi.workspaces.create.mockResolvedValue({ ok: true, data: { id: 'ws-c' } })
  stubApi.workspaces.rename.mockResolvedValue({ ok: true, data: { ok: true } })
  stubApi.workspaces.switch.mockResolvedValue({ ok: true, data: { ok: true } })
  await useWorkspaceStore.getState().load()
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  vi.restoreAllMocks()
})

describe('F-UIRES-02 R2 课题重命名三键全套', () => {
  it('Enter=提交：rename IPC+编辑器收起', async () => {
    mountPage()
    await flush()
    openRename()
    setInputValue(renameInput(), '新课题名')
    keydown(renameInput(), 'Enter')
    await flush()
    expect(stubApi.workspaces.rename).toHaveBeenCalledWith({ id: 'default', name: '新课题名' })
    expect(document.querySelector('input[aria-label="课题名称"]'), '提交后编辑器收起').toBeNull()
  })

  it('失焦=提交：blur→rename IPC（资源管理器语义）', async () => {
    mountPage()
    await flush()
    openRename()
    setInputValue(renameInput(), '失焦提交名')
    act(() => {
      renameInput().dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })
    await flush()
    expect(stubApi.workspaces.rename).toHaveBeenCalledWith({ id: 'default', name: '失焦提交名' })
  })

  it('Esc=取消：零 IPC+编辑器收起；skipBlur 标记不吞下一编辑会话首失焦', async () => {
    mountPage()
    await flush()
    openRename()
    setInputValue(renameInput(), '不该提交')
    keydown(renameInput(), 'Escape')
    expect(stubApi.workspaces.rename, '取消=零 IPC').not.toHaveBeenCalled()
    expect(document.querySelector('input[aria-label="课题名称"]'), '编辑器收起').toBeNull()
    // 会话开口自愈：再次进入编辑→直接失焦→正常提交一次（标记未驻留）
    openRename()
    setInputValue(renameInput(), '第二次提交')
    act(() => {
      renameInput().dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })
    await flush()
    expect(stubApi.workspaces.rename).toHaveBeenCalledTimes(1)
    expect(stubApi.workspaces.rename).toHaveBeenCalledWith({ id: 'default', name: '第二次提交' })
  })

  it('IME 组词期 Enter（isComposing）→ no-op 零 IPC 编辑保持', async () => {
    mountPage()
    await flush()
    openRename()
    setInputValue(renameInput(), '组词中')
    keydown(renameInput(), 'Enter', true)
    await flush()
    expect(stubApi.workspaces.rename).not.toHaveBeenCalled()
    expect(renameInput().value, '编辑态保持').toBe('组词中')
  })

  it('空名 Enter=既有 toast+编辑保持（沿用既有链路）', async () => {
    mountPage()
    await flush()
    openRename()
    setInputValue(renameInput(), '   ')
    keydown(renameInput(), 'Enter')
    await flush()
    expect(stubApi.workspaces.rename, '空名零 IPC').not.toHaveBeenCalled()
    expect(toastSpy).toHaveBeenCalledWith('课题名称不能为空', 'info')
    expect(document.querySelector('input[aria-label="课题名称"]'), '编辑态保留').not.toBeNull()
  })

  it('组词中失焦→拒提交；失焦后 compositionend=序 B 补提交（useComposingCommit）', async () => {
    mountPage()
    await flush()
    openRename()
    const input = renameInput()
    act(() => {
      input.focus()
    })
    setInputValue(input, '组词新名')
    act(() => {
      input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    })
    act(() => {
      input.blur()
    })
    // 组词中 blur 被拒（组词中文本非定案）
    expect(stubApi.workspaces.rename).not.toHaveBeenCalled()
    act(() => {
      input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))
    })
    await flush()
    // 序 B：失焦后 compositionend 到达=补提交一次
    expect(stubApi.workspaces.rename).toHaveBeenCalledTimes(1)
    expect(stubApi.workspaces.rename).toHaveBeenCalledWith({ id: 'default', name: '组词新名' })
  })

  it('确定钮 mousedown preventDefault（焦点留 input——click 单路提交）', async () => {
    mountPage()
    await flush()
    openRename()
    setInputValue(renameInput(), '钮路提交')
    const ok = document.querySelector<HTMLButtonElement>('.ws-rename-ok')!
    expect(ok).not.toBeNull()
    const md = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    act(() => {
      ok.dispatchEvent(md)
    })
    expect(md.defaultPrevented, 'mousedown 已 preventDefault').toBe(true)
    clickEl(ok)
    await flush()
    expect(stubApi.workspaces.rename).toHaveBeenCalledWith({ id: 'default', name: '钮路提交' })
  })

  it('组词中点确定钮→零 IPC（RR2-1——INV-85 组词期按钮不提交，EdgeMenu 确定钮同款）', async () => {
    mountPage()
    await flush()
    openRename()
    setInputValue(renameInput(), '组词中')
    act(() => {
      renameInput().dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    })
    const ok = document.querySelector<HTMLButtonElement>('.ws-rename-ok')!
    expect(ok).not.toBeNull()
    const md = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    act(() => {
      ok.dispatchEvent(md)
    })
    // mousedown preventDefault=焦点不转移（组词未被打断——composition 仍在途）
    expect(md.defaultPrevented).toBe(true)
    clickEl(ok)
    await flush()
    expect(stubApi.workspaces.rename, '组词中文本非定案——确定不提交').not.toHaveBeenCalled()
  })

  it('取消钮：mousedown preventDefault+click 收起零 IPC（防 blur 先触发提交）', async () => {
    mountPage()
    await flush()
    openRename()
    setInputValue(renameInput(), '取消不提交')
    const cancel = document.querySelector<HTMLButtonElement>('.ws-rename-cancel')!
    expect(cancel).not.toBeNull()
    const md = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    act(() => {
      cancel.dispatchEvent(md)
    })
    expect(md.defaultPrevented, 'mousedown 已 preventDefault').toBe(true)
    clickEl(cancel)
    await flush()
    expect(stubApi.workspaces.rename, '取消=零 IPC').not.toHaveBeenCalled()
    expect(document.querySelector('input[aria-label="课题名称"]'), '编辑器收起').toBeNull()
  })
})

describe('F-UIRES-02 R3 新建课题输入键面', () => {
  it('Enter=创建并切换（submitCreate 既有链：create→switch→清空）', async () => {
    mountPage()
    await flush()
    setInputValue(createInput(), '新课题甲')
    keydown(createInput(), 'Enter')
    await flush()
    expect(stubApi.workspaces.create).toHaveBeenCalledWith({ name: '新课题甲' })
    expect(stubApi.workspaces.switch, '创建即切').toHaveBeenCalledWith({ id: 'ws-c' })
    expect(createInput().value, '成功后输入清空').toBe('')
  })

  it('Esc=清空输入（常驻输入取消语义=清空非卸载）', async () => {
    mountPage()
    await flush()
    setInputValue(createInput(), '半途输入')
    keydown(createInput(), 'Escape')
    expect(createInput().value).toBe('')
    expect(stubApi.workspaces.create).not.toHaveBeenCalled()
  })

  it('IME 组词期 Enter（isComposing）→ no-op 零 IPC', async () => {
    mountPage()
    await flush()
    setInputValue(createInput(), '组词课题')
    keydown(createInput(), 'Enter', true)
    await flush()
    expect(stubApi.workspaces.create).not.toHaveBeenCalled()
    expect(createInput().value, '输入保留').toBe('组词课题')
  })
})

describe('F-UIRES-02 R4 课题卡双击=进入重命名', () => {
  it('双击课题卡：编辑器展开+草稿预填卡名（「重命名」钮同款 open 逻辑）', async () => {
    mountPage()
    await flush()
    const card = document.querySelector<HTMLButtonElement>('.ws-card')!
    expect(card).not.toBeNull()
    act(() => {
      card.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }))
    })
    expect(document.querySelector('input[aria-label="课题名称"]'), '双击进入行内编辑').not.toBeNull()
    expect(renameInput().value, '草稿预填当前名').toBe('默认课题')
    // 「重命名」钮保留（既有入口不撤）
    clickEl(document.querySelector('.ws-rename-cancel')!)
    expect(document.querySelector('.ws-rename'), '重命名钮保留').not.toBeNull()
  })

  it('双击进入后 Enter 提交走既有 rename 链', async () => {
    mountPage()
    await flush()
    const card = document.querySelector<HTMLButtonElement>('.ws-card')!
    act(() => {
      card.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }))
    })
    setInputValue(renameInput(), '双击改名')
    keydown(renameInput(), 'Enter')
    await flush()
    expect(stubApi.workspaces.rename).toHaveBeenCalledWith({ id: 'default', name: '双击改名' })
  })

  it('序 B 补提交取 DOM 定案值非滞后 state（RR1-2 区分力——d1-W2）', async () => {
    mountPage()
    await flush()
    openRename()
    const input = renameInput()
    act(() => {
      input.focus()
    })
    setInputValue(input, '旧草稿')
    act(() => {
      input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    })
    // DOM 直改定案文本（不发 input 事件——state 滞后，EMsample:135 换值先例）
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    act(() => {
      setter.call(input, '定案新名')
    })
    act(() => {
      input.blur()
    })
    // 组词中 blur 被拒
    expect(stubApi.workspaces.rename).not.toHaveBeenCalled()
    act(() => {
      input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))
    })
    await flush()
    expect(stubApi.workspaces.rename).toHaveBeenCalledTimes(1)
    expect(stubApi.workspaces.rename, '补提交取 DOM 值非滞后 state').toHaveBeenCalledWith({
      id: 'default',
      name: '定案新名'
    })
  })

  it('双击穿插序列（RR1-4·非当前课题卡）：先导 click 走 pick 链→二次 click→dblclick=进编辑', async () => {
    mountPage()
    await flush()
    // cards[0]=default 非当前（currentId=ws-b）：先导 click 触发 pick（switchTo mock 链）
    const card = document.querySelector<HTMLButtonElement>('.ws-card')!
    clickEl(card)
    await flush()
    expect(stubApi.workspaces.switch, '先导 click 已走切换链').toHaveBeenCalledTimes(1)
    // 二次 click（jsdom reload 为 mock no-op——真实浏览器此处已整页重载；
    // 计数控诉不设防，见头注）后 dblclick=进入重命名+草稿预填
    clickEl(card)
    act(() => {
      card.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }))
    })
    expect(document.querySelector('input[aria-label="课题名称"]'), '穿插后编辑器展开').not.toBeNull()
    expect(renameInput().value, '草稿预填卡名').toBe('默认课题')
    await flush()
  })

  it('双击穿插序列（RR1-4·当前课题卡）：先导 click 幂等零 IPC→dblclick 直接进编辑', async () => {
    mountPage()
    await flush()
    const card = document.querySelector<HTMLButtonElement>('.ws-card.on')!
    clickEl(card)
    await flush()
    // 幂等锚：当前课题点选零 IPC（穿插先导 click 不产生副作用）
    expect(stubApi.workspaces.switch).not.toHaveBeenCalled()
    clickEl(card)
    act(() => {
      card.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }))
    })
    expect(document.querySelector('input[aria-label="课题名称"]'), '编辑器展开').not.toBeNull()
    expect(renameInput().value).toBe('水质模型课题')
  })
})
