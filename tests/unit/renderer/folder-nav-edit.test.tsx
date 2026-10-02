// @vitest-environment jsdom
/**
 * [F-UIRES-01 批 A RR1] FolderNav 行内编辑流（folder-nav.test.tsx 拆件——
 * ESLint max-lines 500 红线）：重命名三键范式/F2 键等价/CONFLICT 输入保留/
 * RR1-4 skipBlur 跨格序列（Esc 取消后 Enter 提交不被驻留标记吞）/RR1-7
 * create·rename 在途守卫（在途窗 Enter/失焦零双发）/§2.2 W-2 行内编辑×
 * folders.changed 外部刷新输入保留。always-active（不经 guardedDescribe）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, stubApiEvents, toastSpy } from '../../utils/api-client-mock'

type Folder = { id: string; name: string; position: number; paperCount: number }
const folder = (id: string, name: string, paperCount = 0): Folder => ({
  id,
  name,
  position: 0,
  paperCount
})

let foldersNow: Folder[] = [folder('__main__', '主图', 2), folder('f-1', '调研计划', 1)]
const stubApi = makeApiStub({
  library: { list: vi.fn() },
  folders: { list: vi.fn(), create: vi.fn(), rename: vi.fn(), delete: vi.fn() },
  lineage: { graph: vi.fn() }
})

let fireFoldersChanged: () => void = () => undefined
stubApiEvents({
  onFoldersChanged: (cb: () => void) => {
    fireFoldersChanged = () => cb()
    return () => undefined
  }
})

import { FolderNav } from '../../../src/renderer/features/library/FolderNav'
import { useImportBusyStore } from '../../../src/renderer/shared/import-busy.store'
import type { LibraryQuery } from '../../../src/shared/models/paper'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let host: HTMLDivElement | null = null

const BASE_QUERY: LibraryQuery = { sort: 'added_desc', offset: 0, limit: 50 }

async function render(query: LibraryQuery = BASE_QUERY): Promise<void> {
  await act(async () => {
    root?.render(
      <FolderNav
        query={query}
        onChange={() => undefined}
        onMutated={() => undefined}
      />
    )
  })
  await settle()
}

async function settle(turns = 6): Promise<void> {
  for (let i = 0; i < turns; i += 1) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

function navRow(label: string): HTMLButtonElement | undefined {
  return [...(host?.querySelectorAll<HTMLButtonElement>('.lib-fn-row') ?? [])].find((b) =>
    (b.textContent ?? '').startsWith(label)
  )
}

function menuButton(label: string): HTMLButtonElement | undefined {
  return [...(host?.querySelectorAll<HTMLButtonElement>('[data-testid="folder-menu"] button') ?? [])].find(
    (b) => (b.textContent ?? '').startsWith(label)
  )
}

async function click(el: HTMLElement | undefined): Promise<void> {
  expect(el).toBeDefined()
  await act(async () => {
    el!.click()
  })
}

function rightClick(el: HTMLElement | undefined): void {
  expect(el).toBeDefined()
  act(() => {
    el!.dispatchEvent(
      new MouseEvent('contextmenu', { clientX: 210, clientY: 160, bubbles: true, cancelable: true })
    )
  })
}

function enterValue(input: HTMLInputElement, value: string, isComposing = false): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  act(() => {
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  const ev = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
  Object.defineProperty(ev, 'isComposing', { value: isComposing })
  act(() => {
    input.dispatchEvent(ev)
  })
}

function renameInput(): HTMLInputElement | null {
  return host?.querySelector<HTMLInputElement>('input[aria-label="重命名文件夹名"]') ?? null
}

beforeEach(() => {
  vi.clearAllMocks()
  stubApi.library.list.mockReset()
  stubApi.library.list.mockResolvedValue({ ok: true, data: { items: [], total: 1 } })
  stubApi.folders.list.mockReset()
  stubApi.folders.create.mockReset()
  stubApi.folders.rename.mockReset()
  stubApi.folders.delete.mockReset()
  stubApi.lineage.graph.mockReset()
  foldersNow = [folder('__main__', '主图', 2), folder('f-1', '调研计划', 1)]
  stubApi.folders.list.mockImplementation(async () => ({ ok: true, data: foldersNow }))
  stubApi.lineage.graph.mockResolvedValue({
    ok: true,
    data: { nodes: [], edges: [], paperMetrics: {}, lineTypes: [], pubNos: {} }
  })
  toastSpy.mockClear()
  useImportBusyStore.getState().setBusy(false)
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  host?.remove()
  root = null
  host = null
})

describe('F-UIRES-01 U1 重命名行内编辑（单源——FolderRenameDialog 退役）', () => {
  async function openRename(): Promise<HTMLInputElement> {
    await render(BASE_QUERY)
    rightClick(navRow('调研计划'))
    await click(menuButton('重命名'))
    await settle()
    const input = renameInput()
    expect(input, '行内重命名输入在场').not.toBeNull()
    return input as HTMLInputElement
  }

  it('菜单重命名→行内输入（预填现名）Enter 提交 rename({id,name})→列表刷新', async () => {
    const input = await openRename()
    expect(input.value).toBe('调研计划')
    stubApi.folders.rename.mockResolvedValue({ ok: true, data: { ok: true } })
    stubApi.folders.list.mockImplementation(async () => ({
      ok: true,
      data: [folder('__main__', '主图', 2), folder('f-1', '改名后的图', 1)]
    }))
    enterValue(input, '改名后的图')
    await settle()
    expect(stubApi.folders.rename).toHaveBeenCalledWith({ id: 'f-1', name: '改名后的图' })
    await settle()
    expect(navRow('改名后的图')).toBeDefined()
    expect(renameInput()).toBeNull()
  })

  it('Esc 取消行内编辑（零 IPC）', async () => {
    const input = await openRename()
    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    await settle()
    expect(stubApi.folders.rename).not.toHaveBeenCalled()
    expect(renameInput()).toBeNull()
  })

  it('组词中 Enter 不提交（isComposing 守卫——F-UIRES-02 范式）', async () => {
    const input = await openRename()
    stubApi.folders.rename.mockResolvedValue({ ok: true, data: { ok: true } })
    enterValue(input, '组词中的名', true)
    await settle()
    expect(stubApi.folders.rename).not.toHaveBeenCalled()
    expect(renameInput()).not.toBeNull()
  })

  it('CONFLICT 拒→toast 中文原文+输入保留（本行提交权威）', async () => {
    const input = await openRename()
    stubApi.folders.rename.mockResolvedValue({
      ok: false,
      error: { code: 'CONFLICT', message: '文件夹名已被占用' }
    })
    enterValue(input, '主图')
    await settle()
    expect(toastSpy).toHaveBeenCalledWith('文件夹名已被占用', 'error')
    const kept = renameInput()
    expect(kept, '失败后输入保留').not.toBeNull()
    expect(kept?.value).toBe('主图')
  })

  it('F2 键等价：文件夹行 keydown F2 直入行内编辑（菜单 sub 提示的兑现面）', async () => {
    await render(BASE_QUERY)
    act(() => {
      navRow('调研计划')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2', bubbles: true }))
    })
    await settle()
    expect(renameInput()).not.toBeNull()
  })

  it('RR1-4 跨格序列：Esc 取消（skipBlur 标记）后紧接重命名 Enter 提交生效（标记不得驻留吞提交）', async () => {
    await render(BASE_QUERY)
    // 第一格：开重命名→Esc 取消（置 skipBlur 标记，输入卸载无 blur 消费）
    rightClick(navRow('调研计划'))
    await click(menuButton('重命名'))
    await settle()
    act(() => {
      renameInput()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    await settle()
    expect(renameInput()).toBeNull()
    // 第二格：紧接右键重命名→fill→Enter——rename 必须发出（旧实现被驻留标记静默吞）
    stubApi.folders.rename.mockResolvedValue({ ok: true, data: { ok: true } })
    stubApi.folders.list.mockImplementation(async () => ({
      ok: true,
      data: [folder('__main__', '主图', 2), folder('f-1', '改名后的图', 1)]
    }))
    rightClick(navRow('调研计划'))
    await click(menuButton('重命名'))
    await settle()
    enterValue(renameInput() as HTMLInputElement, '改名后的图')
    await settle()
    expect(stubApi.folders.rename).toHaveBeenCalledWith({ id: 'f-1', name: '改名后的图' })
  })

  it('RR1-7 在途守卫：rename 提交在途窗内 Enter 连按/失焦零双发（单次 IPC）', async () => {
    await render(BASE_QUERY)
    rightClick(navRow('调研计划'))
    await click(menuButton('重命名'))
    await settle()
    let resolveRename!: (v: unknown) => void
    stubApi.folders.rename.mockImplementation(() => new Promise((r) => { resolveRename = r }))
    const input = renameInput() as HTMLInputElement
    enterValue(input, '改名后的图')
    await settle()
    // 在途窗内：Enter 再按+失焦——零二次 IPC
    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    act(() => {
      input.dispatchEvent(new Event('blur', { bubbles: false }))
    })
    await settle()
    expect(stubApi.folders.rename).toHaveBeenCalledTimes(1)
    await act(async () => {
      resolveRename({ ok: true, data: { ok: true } })
    })
    await settle()
  })

  it('RR1-7 在途守卫：create 提交在途窗内 Enter 连按零双发（单次 IPC）', async () => {
    await render(BASE_QUERY)
    const newBtn = [...(host?.querySelectorAll<HTMLButtonElement>('button') ?? [])].find(
      (b) => (b.textContent ?? '') === '+ 新建文件夹'
    )
    await click(newBtn)
    const input = host?.querySelector<HTMLInputElement>('input[aria-label="新文件夹名"]')
    let resolveCreate!: (v: unknown) => void
    stubApi.folders.create.mockImplementation(() => new Promise((r) => { resolveCreate = r }))
    enterValue(input as HTMLInputElement, '新领域')
    await settle()
    act(() => {
      input!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    await settle()
    expect(stubApi.folders.create).toHaveBeenCalledTimes(1)
    await act(async () => {
      resolveCreate({ ok: true, data: folder('f-2', '新领域', 0) })
    })
    await settle()
  })

  it('RR2-1 空名提交：Enter→toast「文件夹名不能为空」在场+零 IPC（旧 FolderFilter 反馈回归）', async () => {
    const input = await openRename()
    // 置空（原生 setter 清值）→Enter
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    act(() => {
      setter.call(input, '')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    await settle()
    expect(toastSpy).toHaveBeenCalledWith('文件夹名不能为空', 'info')
    expect(stubApi.folders.rename).not.toHaveBeenCalled()
  })

  it('RR2-1 在途窗再 Enter：pending 静默——零 toast 零双发（拒因是在途非空名，文案不得反发）', async () => {
    await render(BASE_QUERY)
    rightClick(navRow('调研计划'))
    await click(menuButton('重命名'))
    await settle()
    let resolveRename!: (v: unknown) => void
    stubApi.folders.rename.mockImplementation(() => new Promise((r) => { resolveRename = r }))
    const input = renameInput() as HTMLInputElement
    enterValue(input, '改名后的图')
    await settle()
    // 在途窗内再 Enter：pending 静默（不得弹「文件夹名不能为空」——名非空拒因是在途）
    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    await settle()
    expect(toastSpy).not.toHaveBeenCalled()
    expect(stubApi.folders.rename).toHaveBeenCalledTimes(1)
    await act(async () => {
      resolveRename({ ok: true, data: { ok: true } })
    })
    await settle()
  })

  it('RR2-4 跨会话残余清零：Esc 取消→重开重命名→失焦提交生效（标记生命周期绑定会话开口）', async () => {
    await render(BASE_QUERY)
    // 第一会话：Esc 取消（标记驻留——卸载无 blur 消费者）
    rightClick(navRow('调研计划'))
    await click(menuButton('重命名'))
    await settle()
    act(() => {
      renameInput()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    await settle()
    // 第二会话：重开（会话开口清零标记）→改值→失焦——提交必须生效
    stubApi.folders.rename.mockResolvedValue({ ok: true, data: { ok: true } })
    rightClick(navRow('调研计划'))
    await click(menuButton('重命名'))
    await settle()
    const input = renameInput() as HTMLInputElement
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    act(() => {
      setter.call(input, '失焦提交名')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    act(() => {
      input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })
    await settle()
    expect(stubApi.folders.rename).toHaveBeenCalledWith({ id: 'f-1', name: '失焦提交名' })
  })

  it('行内编辑×外部刷新（§2.2 W-2）：编辑在途 folders.changed 重拉→输入保留不卸载', async () => {
    const input = await openRename()
    enterValue(input, '并发改名中', true)
    await settle()
    act(() => {
      fireFoldersChanged()
    })
    await settle()
    const kept = renameInput()
    expect(kept, '外部刷新后编辑行仍在场').not.toBeNull()
    expect(kept?.value).toBe('并发改名中')
  })
})
