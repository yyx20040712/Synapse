// @vitest-environment jsdom
/**
 * [F-UIRES-03 B1 2026-10-05] TagDropdown 删除链+INV-53 契约（always-active；
 * 自 tag-dropdown.test.tsx 拆件[max-lines 500——tests tsx 面不在豁免内]）。
 * 覆盖：确认窗列名+取消零调用 / 确认→逐个 delete（勾选序）→INV-53 顺序
 * （onFilterChange 剔除先于 onMutated）→全删收口关窗 / 删除失败=toast+窗保持开
 * +已删部分照常剔除（死 id 零滞留）+清单自愈 / 改名 id 稳定筛选零动。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, stubApiEvents, toastSpy } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  library: { collections: vi.fn() },
  tags: { list: vi.fn(), rename: vi.fn(), merge: vi.fn(), delete: vi.fn(), setColor: vi.fn() },
  folders: { list: vi.fn() },
  lineage: { graph: vi.fn() }
})
stubApiEvents({
  onImportProgress: vi.fn(() => () => undefined),
  onFoldersChanged: vi.fn(() => () => undefined)
})

import { TagDropdown } from '../../../src/renderer/features/tags/TagDropdown'
import { useTagsStore } from '../../../src/renderer/features/tags/tags.store'
import type { Tag } from '../../../src/shared/models/tag'

type TagWithCount = Tag & { paperCount: number }

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let host: HTMLDivElement | null = null
let currentTags: TagWithCount[] = []

function tag(id: string, name: string, paperCount: number, color: string | null = null): TagWithCount {
  return { id, name, paperCount, color }
}

async function renderDropdown(
  selectedTagIds: string[],
  onFilterChange: (ids: string[]) => void,
  onMutated?: () => void
): Promise<void> {
  if (root === null) {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
  }
  await act(async () => {
    root?.render(
      <TagDropdown selectedTagIds={selectedTagIds} onFilterChange={onFilterChange} onMutated={onMutated} />
    )
  })
}

function tagButton(): HTMLButtonElement | undefined {
  return [...(host?.querySelectorAll('button') ?? [])].find((b) =>
    (b.textContent ?? '').replace(/\s+/g, ' ').startsWith('标签')
  )
}

async function openPanel(): Promise<void> {
  if (host?.querySelector('.lib-dd-panel')) return
  const btn = tagButton()
  expect(btn, '下拉钮在场').toBeDefined()
  await act(async () => {
    btn!.click()
  })
}

function row(name: string): HTMLElement | undefined {
  return [...(host?.querySelectorAll<HTMLElement>('.lib-dd-row') ?? [])].find(
    (r) => r.querySelector('.lib-dd-chip')?.textContent === name
  )
}

function deleteButton(): HTMLButtonElement | undefined {
  const panel = host?.querySelector('.lib-dd-panel')
  return [...(panel?.querySelectorAll('button') ?? [])].find(
    (b) => (b.textContent ?? '').trim() === '删除'
  )
}

function buttonByText(text: string, scope?: ParentNode): HTMLButtonElement | undefined {
  const base: ParentNode = scope ?? host ?? document
  return [...base.querySelectorAll('button')].find((b) => (b.textContent ?? '').trim() === text)
}

function dialog(): HTMLElement | null {
  return host?.querySelector('[role="dialog"]') ?? null
}

beforeEach(() => {
  vi.clearAllMocks()
  toastSpy.mockClear()
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

describe('F-UIRES-03 B1 删除链（勾选集批量删除）', () => {
  it('确认窗：勾 2 标签点删除→窗列两名清单；取消零 delete 调用+窗关', async () => {
    currentTags = [tag('t-a', '水质', 2), tag('t-b', '机器学习', 1)]
    useTagsStore.setState({ tags: currentTags, loading: false, error: null })
    stubApi.tags.list.mockImplementation(async () => ({ ok: true as const, data: currentTags }))
    await renderDropdown(['t-a', 't-b'], vi.fn())
    await openPanel()
    await act(async () => {
      deleteButton()!.click()
    })
    const dlg = dialog()
    expect(dlg, '删除确认窗在场').not.toBeNull()
    expect(dlg?.textContent).toContain('删除标签')
    expect(dlg?.textContent).toContain('水质')
    expect(dlg?.textContent).toContain('机器学习')
    await act(async () => {
      buttonByText('取消', dlg!)!.click()
    })
    expect(dialog(), '取消后确认窗关').toBeNull()
    expect(stubApi.tags.delete).not.toHaveBeenCalled()
    expect(host?.querySelector('.lib-dd-panel'), '面板保持开').not.toBeNull()
  })

  it('确认→逐个 delete（勾选序）→INV-53：onFilterChange(剔除被删)先于 onMutated→确认窗关', async () => {
    currentTags = [tag('t-a', '水质', 2), tag('t-b', '机器学习', 1)]
    stubApi.tags.list.mockImplementation(async () => ({ ok: true as const, data: currentTags }))
    stubApi.tags.delete.mockImplementation(async ({ tagId }: { tagId: string }) => {
      currentTags = currentTags.filter((t) => t.id !== tagId)
      return { ok: true as const, data: { ok: true } }
    })
    const onFilterChange = vi.fn()
    const onMutated = vi.fn()
    useTagsStore.setState({ tags: currentTags, loading: false, error: null })
    await renderDropdown(['t-a', 't-b'], onFilterChange, onMutated)
    await openPanel()
    await act(async () => {
      deleteButton()!.click()
    })
    await act(async () => {
      buttonByText('删除', dialog()!)!.click()
    })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(stubApi.tags.delete).toHaveBeenCalledWith({ tagId: 't-a' })
    expect(stubApi.tags.delete).toHaveBeenCalledWith({ tagId: 't-b' })
    expect(onFilterChange).toHaveBeenLastCalledWith([])
    expect(onMutated).toHaveBeenCalledTimes(1)
    expect(
      (onFilterChange.mock.invocationCallOrder?.[0] ?? Infinity) <
        (onMutated.mock.invocationCallOrder?.[0] ?? -1),
      'INV-53 顺序：死 id 筛选剔除先于 onMutated'
    ).toBe(true)
    expect(dialog(), '全删成功后确认窗关').toBeNull()
  })

  it('删除失败：toast+确认窗保持开（S6 同型）；已删部分照常 INV-53 剔除（死 id 零滞留）', async () => {
    currentTags = [tag('t-a', '水质', 2), tag('t-b', '机器学习', 1)]
    stubApi.tags.list.mockImplementation(async () => ({ ok: true as const, data: currentTags }))
    stubApi.tags.delete.mockImplementationOnce(async () => {
      currentTags = currentTags.filter((t) => t.id !== 't-a')
      return { ok: true as const, data: { ok: true } }
    })
    stubApi.tags.delete.mockRejectedValueOnce(new Error('boom'))
    useTagsStore.setState({ tags: currentTags, loading: false, error: null })
    const onFilterChange = vi.fn()
    const onMutated = vi.fn()
    await renderDropdown(['t-a', 't-b'], onFilterChange, onMutated)
    await openPanel()
    await act(async () => {
      deleteButton()!.click()
    })
    await act(async () => {
      buttonByText('删除', dialog()!)!.click()
    })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(toastSpy).toHaveBeenCalledWith('标签操作失败', 'error')
    expect(dialog(), '失败后确认窗保持开').not.toBeNull()
    // 部分失败：已删的 t-a 照常先剔筛选后 onMutated（INV-53——死 id 零滞留窗）
    expect(onFilterChange).toHaveBeenLastCalledWith(['t-b'])
    expect(onMutated).toHaveBeenCalledTimes(1)
    // 确认窗清单自愈：store 链式 refresh 后仅列剩余 t-b
    expect(dialog()?.textContent).toContain('机器学习')
    expect(dialog()?.textContent).not.toContain('水质')
  })
})

describe('INV-53 死 id 顺序契约（生命周期上抛承接——B1 行编辑态新链）', () => {
  it('改名（id 稳定）：筛选零动（onFilterChange 不调用），仅 onMutated', async () => {
    currentTags = [tag('t-x', '甲', 2), tag('t-y', '乙', 1)]
    useTagsStore.setState({ tags: currentTags, loading: false, error: null })
    stubApi.tags.list.mockImplementation(async () => ({ ok: true as const, data: currentTags }))
    stubApi.tags.rename.mockImplementation(async ({ name }: { name: string }) => {
      currentTags = currentTags.map((t) => (t.id === 't-x' ? { ...t, name } : t))
      return { ok: true as const, data: { id: 't-x', name } }
    })
    const onFilterChange = vi.fn()
    const onMutated = vi.fn()
    await renderDropdown(['t-x', 't-y'], onFilterChange, onMutated)
    await openPanel()
    await act(async () => {
      row('甲')!.querySelector<HTMLButtonElement>('.lib-dd-edit-btn')!.click()
    })
    const input = host?.querySelector('.lib-dd-row input') as HTMLInputElement
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    await act(async () => {
      setter?.call(input, '新甲')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(onFilterChange).not.toHaveBeenCalled()
    expect(onMutated).toHaveBeenCalledTimes(1)
  })
})
