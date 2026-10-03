// @vitest-environment jsdom
/**
 * [P7E-01→F-UIRES-01 批 A U3] TagDropdown 管理面（always-active）：下拉行右键
 * 菜单=改名+颜色两件（P-11 用户终裁——merge/delete UI 入口随批退役，IPC 通道
 * 与 main 面零触碰）+两对话框接线（TagRenameDialog/TagColorDialog 保留件）。
 *
 * S8：重命名对话框提交双击 busy 守卫防重复提交；W3：Esc 层级=最上层弹层先关
 * （行菜单先于面板）；R6：重命名输入 IME 组词期 Enter 不提交；负锚：菜单无
 * 「合并到…」「删除」项（死交互零渲染——P-10 同族口径）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Tag } from '../../../src/shared/models/tag'
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({ tags: { list: vi.fn(), rename: vi.fn(), merge: vi.fn(), delete: vi.fn(), setColor: vi.fn() } })

import { TagDropdown } from '../../../src/renderer/features/tags/TagDropdown'
import { useTagsStore } from '../../../src/renderer/features/tags/tags.store'

type TagWithCount = Tag & { paperCount: number }

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let host: HTMLDivElement | null = null
let currentTags: TagWithCount[] = []

async function render(
  selectedTagIds: string[],
  onFilterChange: (ids: string[]) => void,
  onMutated?: () => void
): Promise<void> {
  useTagsStore.setState({ tags: currentTags, loading: false, error: null })
  stubApi.tags.list.mockImplementation(async () => ({ ok: true as const, data: currentTags }))
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(
      <TagDropdown selectedTagIds={selectedTagIds} onFilterChange={onFilterChange} onMutated={onMutated} />
    )
  })
}

function buttonByText(text: string, scope?: ParentNode): HTMLButtonElement | undefined {
  const base: ParentNode = scope ?? host ?? document
  return [...base.querySelectorAll('button')].find((b) => (b.textContent ?? '').trim() === text)
}

async function click(btn: HTMLButtonElement | undefined, label: string): Promise<void> {
  expect(btn, `按钮存在：${label}`).toBeDefined()
  await act(async () => {
    btn?.click()
  })
}

function dialog(): HTMLElement | null {
  return host?.querySelector('[role="dialog"]') ?? null
}

function row(name: string): HTMLElement | undefined {
  return [...(host?.querySelectorAll<HTMLElement>('.lib-dd-row') ?? [])].find(
    (r) => r.querySelector('.lib-dd-nm')?.textContent === name
  )
}

/** 开面板→行右键→行菜单在场 */
async function rightClickRow(name: string): Promise<void> {
  const btn = buttonByText('标签')
  expect(btn, '下拉钮在场').toBeDefined()
  await act(async () => {
    btn!.click()
  })
  const r = row(name)
  expect(r, `面板行存在：${name}`).toBeDefined()
  await act(async () => {
    r!.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 8, clientY: 8 })
    )
  })
  expect(host?.querySelector('[data-testid="tag-menu"]'), '右键后行菜单在场').not.toBeNull()
}

/** 受控 input 打字（原生 setter+input 事件——React 受控组件 jsdom 标准法） */
async function setType(input: HTMLInputElement, text: string): Promise<void> {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  await act(async () => {
    setter?.call(input, text)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  currentTags = []
})

afterEach(async () => {
  await act(async () => {
    root?.unmount()
  })
  host?.remove()
  root = null
  host = null
})

describe('F-UIRES-01 U3 TagDropdown —— 管理面两件版（P-11）', () => {
  it('下拉行右键菜单=改名+颜色两件；「合并到…」「删除」零渲染（UI 入口退役负锚）', async () => {
    currentTags = [
      { id: 't-1', name: '甲', paperCount: 2, color: null },
      { id: 't-2', name: '乙', paperCount: 1, color: null }
    ]
    await render([], vi.fn(), vi.fn())
    await rightClickRow('甲')
    const menu = host?.querySelector('[data-testid="tag-menu"]')
    expect(menu?.textContent).toContain('重命名')
    expect(menu?.textContent).toContain('颜色…')
    expect(menu?.textContent).not.toContain('合并到…')
    expect(menu?.textContent).not.toContain('删除')
  })

  it('S8 重命名对话框：预填现名；提交双击 busy 守卫防重复提交（rename 仅一次）', async () => {
    currentTags = [{ id: 't-1', name: '甲', paperCount: 1, color: null }]
    await render([], vi.fn(), vi.fn())
    await rightClickRow('甲')
    await click(buttonByText('重命名'), '菜单·重命名')
    const input = dialog()?.querySelector('input') ?? null
    expect(input, '重命名输入框在场').not.toBeNull()
    expect(input?.value, '预填现名').toBe('甲')
    await setType(input!, '乙')
    let resolveRename!: (v: unknown) => void
    stubApi.tags.rename.mockImplementation(() => new Promise((r) => { resolveRename = r }))
    const save = buttonByText('保存', dialog()!)
    await act(async () => {
      save!.click()
      save!.click()
    })
    expect(stubApi.tags.rename).toHaveBeenCalledTimes(1)
    expect(stubApi.tags.rename).toHaveBeenCalledWith({ tagId: 't-1', name: '乙' })
    await act(async () => {
      resolveRename({ ok: true, data: { id: 't-1', name: '乙', color: null } })
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(dialog(), '成功后对话框关闭').toBeNull()
  })

  it('W3 Esc 层级：行菜单开→Esc 先关行菜单（面板保持）；再 Esc 关面板', async () => {
    currentTags = [{ id: 't-1', name: '甲', paperCount: 0, color: null }]
    await render([], vi.fn(), vi.fn())
    await rightClickRow('甲')
    expect(host?.querySelector('.lib-dd-panel'), '面板在场').not.toBeNull()
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(host?.querySelector('[data-testid="tag-menu"]'), 'Esc 先关行菜单').toBeNull()
    expect(host?.querySelector('.lib-dd-panel'), '面板保持开（最上层先关）').not.toBeNull()
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(host?.querySelector('.lib-dd-panel'), '再 Esc 关面板').toBeNull()
  })

  it('F-TAGS-01 R6：重命名输入 IME 组词期 Enter（isComposing=true）不提交', async () => {
    currentTags = [{ id: 't-1', name: '甲', paperCount: 1, color: null }]
    await render([], vi.fn(), vi.fn())
    await rightClickRow('甲')
    await click(buttonByText('重命名'), '菜单·重命名')
    const input = dialog()?.querySelector('input') ?? null
    expect(input, '重命名输入框在场').not.toBeNull()
    await setType(input!, '组词中')
    await act(async () => {
      input!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, isComposing: true })
      )
    })
    expect(stubApi.tags.rename).not.toHaveBeenCalled()
    expect(dialog(), '组词期 Enter 不关对话框').not.toBeNull()
  })

  it('颜色入口：行右键→颜色…→TagColorDialog 在场（改名对话框的姊妹通道）', async () => {
    currentTags = [{ id: 't-1', name: '甲', paperCount: 1, color: null }]
    await render([], vi.fn(), vi.fn())
    await rightClickRow('甲')
    await click(buttonByText('颜色…'), '菜单·颜色…')
    expect(dialog(), '颜色对话框在场').not.toBeNull()
    expect(dialog()?.textContent).toContain('标签颜色：甲')
  })
})
