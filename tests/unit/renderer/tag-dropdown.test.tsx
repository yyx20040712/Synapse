// @vitest-environment jsdom
/**
 * [F-UIRES-01 批 A U3] TagDropdown —— 标签筛选下拉（TagFilter chip 形态全件
 * 退役的承接件，设计稿 §3.3/R6；mockup .tagbtn/.tagmenu 逐值）。覆盖：钮态
 * （idle 灰/有选集 accent「×N」）/面板结构（头「标签筛选+已选 N」/一行一勾选
 * role=menuitemcheckbox aria-checked+色点+计数/脚「共 N 标签+清空已选」）/
 * toggle 即时生效/三关闭触发（Esc 层级=行菜单先关/外点/钮二次点）/TAG_FILTER_MAX
 * 添加向守卫（T8/T9/T10）/死 id 顺序契约（INV-53）/空标签库引导文案/色映射
 * 上抛通道/FilterBar 装配收敛（tagIds 空集收敛 undefined）。
 * always-active 裸 describe（K3 威胁不经 guardedDescribe）。
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
import { FilterBar } from '../../../src/renderer/features/library/FilterBar'
import { useTagsStore } from '../../../src/renderer/features/tags/tags.store'
import type { LibraryQuery } from '../../../src/shared/models/paper'
import type { Tag } from '../../../src/shared/models/tag'

type TagWithCount = Tag & { paperCount: number }

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let host: HTMLDivElement | null = null
let currentTags: TagWithCount[] = []

function tag(id: string, name: string, paperCount: number, color: string | null = null): TagWithCount {
  return { id, name, paperCount, color }
}

/** 首次挂载建 host/root；后续调用=同 root 受控重渲染（选中集回流） */
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

/** 下拉钮（「标签 ▾」/有选集「标签 ▾ ×N」） */
function tagButton(): HTMLButtonElement | undefined {
  return [...(host?.querySelectorAll('button') ?? [])].find((b) =>
    (b.textContent ?? '').replace(/\s+/g, ' ').startsWith('标签')
  )
}

async function openPanel(): Promise<void> {
  // 幂等开面板：受控回流重渲染时开态保留（open 为组件局部态）——已开不点
  if (host?.querySelector('.lib-dd-panel')) return
  const btn = tagButton()
  expect(btn, '下拉钮在场').toBeDefined()
  await act(async () => {
    btn!.click()
  })
}

/** 面板行（menuitemcheckbox——按名格 .lib-dd-nm 精确匹配，防计数粘名误配） */
function row(name: string): HTMLButtonElement | undefined {
  return [...(host?.querySelectorAll<HTMLButtonElement>('[role="menuitemcheckbox"]') ?? [])].find(
    (r) => r.querySelector('.lib-dd-nm')?.textContent === name
  )
}

async function clickRow(name: string): Promise<void> {
  const r = row(name)
  expect(r, `面板行存在：${name}`).toBeDefined()
  await act(async () => {
    r!.click()
  })
}

function buttonByText(text: string, scope?: ParentNode): HTMLButtonElement | undefined {
  const base: ParentNode = scope ?? host ?? document
  return [...base.querySelectorAll('button')].find((b) => (b.textContent ?? '').trim() === text)
}

async function renderBar(query: LibraryQuery, onChange: (patch: Partial<LibraryQuery>) => void): Promise<void> {
  if (root === null) {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
  }
  await act(async () => {
    root?.render(<FilterBar query={query} onChange={onChange} />)
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

describe('F-UIRES-01 U3 TagDropdown 钮与面板结构（§3.3）', () => {
  it('钮 idle 灰（无选集零计数）；面板 240px 头「标签筛选/已选 N」+行勾选 aria-checked+色点+计数+脚计数与清空', async () => {
    currentTags = [tag('t-a', '水质', 2, '#3a5bd9'), tag('t-b', '机器学习', 1)]
    useTagsStore.setState({ tags: currentTags, loading: false, error: null })
    stubApi.tags.list.mockImplementation(async () => ({ ok: true as const, data: currentTags }))
    await renderDropdown(['t-a'], vi.fn())
    const btn = tagButton()
    expect(btn?.textContent).toContain('×1')
    expect(btn?.classList.contains('lib-dd-btn-on'), '有选集=accent 态').toBe(true)
    await openPanel()
    const panel = host?.querySelector('.lib-dd-panel')
    expect(panel).not.toBeNull()
    expect(panel?.textContent).toContain('标签筛选')
    expect(panel?.textContent).toContain('已选 1')
    const r = row('水质')
    expect(r?.getAttribute('role')).toBe('menuitemcheckbox')
    expect(r?.getAttribute('aria-checked')).toBe('true')
    expect(row('机器学习')?.getAttribute('aria-checked')).toBe('false')
    expect(r?.querySelector('.lib-dd-dot'), '色点在场').not.toBeNull()
    expect(r?.textContent).toContain('2')
    expect(panel?.textContent).toContain('共 2 标签')
    expect(buttonByText('清空已选')).toBeDefined()
  })

  it('idle 钮（零选集）无 ×N 计数、非 accent 态', async () => {
    currentTags = [tag('t-a', '水质', 2)]
    useTagsStore.setState({ tags: currentTags, loading: false, error: null })
    await renderDropdown([], vi.fn())
    const btn = tagButton()
    expect(btn?.textContent).not.toContain('×')
    expect(btn?.classList.contains('lib-dd-btn-on')).toBe(false)
  })

  it('空标签库：面板开=引导文案（先在详情侧栏打标签——语义承接）', async () => {
    useTagsStore.setState({ tags: [], loading: false, error: null })
    await renderDropdown([], vi.fn())
    await openPanel()
    const panel = host?.querySelector('.lib-dd-panel')
    expect(panel).not.toBeNull()
    expect(panel?.textContent).toContain('暂无标签可筛选（在详情侧栏为文献打标签）')
  })
})

describe('F-UIRES-01 U3 toggle 即时生效（现行 P7E-06 语义零变）', () => {
  it('勾选序列：进→并集→退出→全清，载荷=选中集演化且 aria-checked 同步（面板保持开）', async () => {
    currentTags = [tag('t-a', '水质', 2), tag('t-b', '机器学习', 1)]
    useTagsStore.setState({ tags: currentTags, loading: false, error: null })
    stubApi.tags.list.mockImplementation(async () => ({ ok: true as const, data: currentTags }))
    const onFilterChange = vi.fn()
    await renderDropdown([], onFilterChange)
    await openPanel()
    await clickRow('水质')
    expect(onFilterChange).toHaveBeenLastCalledWith(['t-a'])
    await renderDropdown(['t-a'], onFilterChange)
    await openPanel()
    expect(row('水质')?.getAttribute('aria-checked')).toBe('true')
    await clickRow('机器学习')
    expect(onFilterChange).toHaveBeenLastCalledWith(['t-a', 't-b'])
    await renderDropdown(['t-a', 't-b'], onFilterChange)
    await openPanel()
    await clickRow('水质')
    expect(onFilterChange).toHaveBeenLastCalledWith(['t-b'])
    await renderDropdown(['t-b'], onFilterChange)
    await openPanel()
    await clickRow('机器学习')
    expect(onFilterChange).toHaveBeenLastCalledWith([])
  })

  it('清空已选：onFilterChange([]) 一次清空', async () => {
    currentTags = [tag('t-a', '水质', 2)]
    useTagsStore.setState({ tags: currentTags, loading: false, error: null })
    const onFilterChange = vi.fn()
    await renderDropdown(['t-a'], onFilterChange)
    await openPanel()
    await act(async () => {
      buttonByText('清空已选')!.click()
    })
    expect(onFilterChange).toHaveBeenLastCalledWith([])
  })

  it('三关闭触发：钮二次点关/外点关/Esc 关（面板离场）', async () => {
    currentTags = [tag('t-a', '水质', 2)]
    useTagsStore.setState({ tags: currentTags, loading: false, error: null })
    await renderDropdown([], vi.fn())
    await openPanel()
    expect(host?.querySelector('.lib-dd-panel')).not.toBeNull()
    // 钮二次点关
    await act(async () => {
      tagButton()!.click()
    })
    expect(host?.querySelector('.lib-dd-panel')).toBeNull()
    // 外点关
    await openPanel()
    await act(async () => {
      host?.querySelector('.lib-dd-veil')?.dispatchEvent(
        new MouseEvent('click', { bubbles: true })
      )
    })
    expect(host?.querySelector('.lib-dd-panel')).toBeNull()
    // Esc 关
    await openPanel()
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(host?.querySelector('.lib-dd-panel')).toBeNull()
  })
})

describe('P7X-01 选中上限 UI 感知（添加方向守卫，移除方向永不设限——承接）', () => {
  it('T8 上界拦截：20 选中点第 21 行 → toast 恰一次 + onFilterChange 零调用 + aria-checked 保持 false', async () => {
    currentTags = Array.from({ length: 21 }, (_, i) =>
      tag(`t-${String(i + 1).padStart(2, '0')}`, `标签${i + 1}`, 0)
    )
    useTagsStore.setState({ tags: currentTags, loading: false, error: null })
    const onFilterChange = vi.fn()
    const selected = currentTags.slice(0, 20).map((t) => t.id)
    await renderDropdown(selected, onFilterChange)
    await openPanel()
    await clickRow('标签21')
    expect(toastSpy).toHaveBeenCalledTimes(1)
    expect(toastSpy).toHaveBeenCalledWith('最多同时筛选 20 个标签', 'info')
    expect(onFilterChange).not.toHaveBeenCalled()
    expect(row('标签21')?.getAttribute('aria-checked')).toBe('false')
  })

  it('T9 边界放行：19 选中点第 20 行 → 载荷 20 项含新 id + 零 toast', async () => {
    currentTags = Array.from({ length: 20 }, (_, i) =>
      tag(`t-${String(i + 1).padStart(2, '0')}`, `标签${i + 1}`, 0)
    )
    useTagsStore.setState({ tags: currentTags, loading: false, error: null })
    const onFilterChange = vi.fn()
    const selected = currentTags.slice(0, 19).map((t) => t.id)
    await renderDropdown(selected, onFilterChange)
    await openPanel()
    await clickRow('标签20')
    expect(onFilterChange).toHaveBeenCalledTimes(1)
    const payload: string[] = onFilterChange.mock.calls[0]?.[0] ?? []
    expect(payload).toHaveLength(20)
    expect(payload).toContain('t-20')
    expect(toastSpy).not.toHaveBeenCalled()
  })

  it('T10 上界移除锚：20 选中点已选行 → 载荷 19 项不含该 id + 零 toast', async () => {
    currentTags = Array.from({ length: 21 }, (_, i) =>
      tag(`t-${String(i + 1).padStart(2, '0')}`, `标签${i + 1}`, 0)
    )
    useTagsStore.setState({ tags: currentTags, loading: false, error: null })
    const onFilterChange = vi.fn()
    const selected = currentTags.slice(0, 20).map((t) => t.id)
    await renderDropdown(selected, onFilterChange)
    await openPanel()
    await clickRow('标签1')
    expect(onFilterChange).toHaveBeenCalledTimes(1)
    const payload: string[] = onFilterChange.mock.calls[0]?.[0] ?? []
    expect(payload).toHaveLength(19)
    expect(payload).not.toContain('t-01')
    expect(toastSpy).not.toHaveBeenCalled()
  })
})

describe('INV-53 死 id 顺序契约（生命周期上抛承接）', () => {
  it('改名（id 稳定）：筛选零动（onFilterChange 不调用），仅 onMutated', async () => {
    currentTags = [tag('t-x', '甲', 2), tag('t-y', '乙', 1)]
    useTagsStore.setState({ tags: currentTags, loading: false, error: null })
    stubApi.tags.list.mockImplementation(async () => ({ ok: true as const, data: currentTags }))
    const onFilterChange = vi.fn()
    const onMutated = vi.fn()
    await renderDropdown(['t-x', 't-y'], onFilterChange, onMutated)
    await openPanel()
    await act(async () => {
      row('甲')!.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 8, clientY: 8 })
      )
    })
    await act(async () => {
      buttonByText('重命名')!.click()
    })
    const dialog = host?.querySelector('[role="dialog"]')
    const input = dialog?.querySelector('input') as HTMLInputElement
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    await act(async () => {
      setter?.call(input, '新甲')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    stubApi.tags.rename.mockResolvedValue({ ok: true as const, data: { id: 't-x', name: '新甲' } })
    await act(async () => {
      buttonByText('保存', dialog!)!.click()
    })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(onFilterChange).not.toHaveBeenCalled()
    expect(onMutated).toHaveBeenCalledTimes(1)
  })
})

describe('色映射通道（onColorMapChange——INV-86 承接）', () => {
  it('tags 变化即重建 name→color Map 上抛', async () => {
    currentTags = [tag('t-1', '甲', 2, null), tag('t-2', '乙', 1, '#0ea5e9')]
    const onMap = vi.fn()
    useTagsStore.setState({ tags: currentTags, loading: false, error: null })
    stubApi.tags.list.mockImplementation(async () => ({ ok: true as const, data: currentTags }))
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () => {
      root?.render(
        <TagDropdown selectedTagIds={[]} onFilterChange={() => undefined} onColorMapChange={onMap} />
      )
    })
    expect(onMap).toHaveBeenCalled()
    const map = onMap.mock.calls[0]?.[0] as Map<string, string | null>
    expect(map.get('甲')).toBeNull()
    expect(map.get('乙')).toBe('#0ea5e9')
  })
})

describe('FilterBar 装配收敛（列序=搜索→年份→排序→弹性空档→标签行尾）', () => {
  it('点选→onChange({tagIds})；全清→onChange({tagIds: undefined})（空数组不进查询）', async () => {
    currentTags = [tag('t-a', '水质', 2), tag('t-b', '机器学习', 1)]
    useTagsStore.setState({ tags: currentTags, loading: false, error: null })
    stubApi.tags.list.mockImplementation(async () => ({ ok: true as const, data: currentTags }))
    const onChange = vi.fn()
    const base: LibraryQuery = { sort: 'added_desc', offset: 0, limit: 50 }
    await renderBar(base, onChange)
    await openPanel()
    await clickRow('水质')
    expect(onChange).toHaveBeenLastCalledWith({ tagIds: ['t-a'] })
    await renderBar({ ...base, tagIds: ['t-a'] }, onChange)
    await openPanel()
    await clickRow('水质')
    expect(onChange).toHaveBeenLastCalledWith({ tagIds: undefined })
  })

  it('列序锚：搜索框→年份下拉→排序下拉→弹性空档→标签钮行尾（.lib-filter-spacer 在场）', async () => {
    currentTags = [tag('t-a', '水质', 2)]
    useTagsStore.setState({ tags: currentTags, loading: false, error: null })
    await renderBar({ sort: 'added_desc', offset: 0, limit: 50 }, vi.fn())
    const bar = host?.querySelector('.lib-filter-row')
    expect(bar).not.toBeNull()
    const order = [
      ...(bar?.querySelectorAll('.lib-search, select, .lib-filter-spacer, .lib-dd-btn') ?? [])
    ].map((el) => (el.classList.contains('lib-search') ? 'search' : el.tagName === 'SELECT' ? 'select' : el.className))
    expect(order).toEqual(['search', 'select', 'select', 'lib-filter-spacer', 'lib-dd-btn'])
    expect(
      host?.querySelector('select[aria-label="排序方式"]')?.classList.contains('lib-sort-end'),
      '排序下拉行尾类退役（标签钮=行尾）'
    ).toBe(false)
  })
})
