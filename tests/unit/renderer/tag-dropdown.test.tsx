// @vitest-environment jsdom
/**
 * [F-UIRES-01 批 A U3→批 tagrows→F-UIRES-03 B1 2026-10-05] TagDropdown ——
 * 标签筛选下拉（B1 批改版：头=全选框（三态）+删除 danger 钮；脚=仅「清空已选」
 * ——「已选 N」与「共 N 标签」说明行随批退役）。覆盖：钮态（idle 灰/有选集
 * accent「×N」）/面板结构（行=勾选框+chip+计数+编辑钮——chip 形态细节在
 * tag-dropdown-row.test.tsx）/toggle 即时生效/三关闭触发（Esc 层级=行编辑态
 * 先关）/TAG_FILTER_MAX 添加向守卫（T8/T9/T10）/全选三态与 toggle（含上限
 * 钳制与钳制态清空路——RR1-W2）/色映射上抛通道/FilterBar 装配收敛（tagIds
 * 空集收敛 undefined）。删除链+INV-53 契约=tag-dropdown-delete.test.tsx
 * （[RR1 拆件] max-lines 500——tests tsx 面不在豁免内）。always-active
 * 裸 describe（K3 威胁不经 guardedDescribe）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
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

/** 面板行容器（B1 行=勾选框+chip+计数+编辑钮——按 chip 名精确匹配防计数粘名误配） */
function row(name: string): HTMLElement | undefined {
  return [...(host?.querySelectorAll<HTMLElement>('.lib-dd-row') ?? [])].find(
    (r) => r.querySelector('.lib-dd-chip')?.textContent === name
  )
}

/** 勾选只归 checkbox（B1：点击行其余区域零勾选） */
async function clickRow(name: string): Promise<void> {
  const cb = row(name)?.querySelector<HTMLButtonElement>('[role="checkbox"]')
  expect(cb, `面板行勾选框存在：${name}`).toBeDefined()
  await act(async () => {
    cb!.click()
  })
}

/** 头部全选框（aria-label=全选——与行勾选框区分） */
function selectAllBox(): HTMLButtonElement | undefined {
  return host?.querySelector<HTMLButtonElement>('.lib-dd-head [aria-label="全选"]') ?? undefined
}

/** 头部删除钮（面板作用域——与确认窗内删除钮区分） */
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

describe('F-UIRES-03 B1 TagDropdown 钮与面板结构', () => {
  it('面板头=全选框（零选中 false）+「全选」+删除钮（零勾选禁用）；「已选 N」退役负锚；行=勾选框+chip+计数+编辑钮；脚=仅清空已选（说明行退役负锚）', async () => {
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
    expect(panel?.getAttribute('role'), '面板容器=group').toBe('group')
    // 头：全选框三态锚（部分选中=mixed——t-a 勾/t-b 未勾）
    expect(selectAllBox()?.getAttribute('aria-checked'), '部分选中=半选态').toBe('mixed')
    expect(panel?.textContent).toContain('全选')
    expect(deleteButton()?.disabled, '删除钮在场（勾选非零可点）').toBe(false)
    expect(panel?.textContent, '「已选 N」计数随 B1 批退役').not.toMatch(/已选 \d/)
    // 行：勾选框+chip 名+mono 计数+编辑钮
    const r = row('水质')
    expect(r?.querySelector('[role="checkbox"]')?.getAttribute('aria-checked')).toBe('true')
    expect(row('机器学习')?.querySelector('[role="checkbox"]')?.getAttribute('aria-checked')).toBe('false')
    expect(r?.querySelector('.lib-dd-chip')?.textContent).toBe('水质')
    expect(r?.textContent).toContain('2')
    expect(r?.querySelector('.lib-dd-edit-btn'), '编辑钮在场').not.toBeNull()
    // 脚：清空已选保留；共 N 标签说明行退役
    expect(buttonByText('清空已选')).toBeDefined()
    expect(panel?.textContent, '「共 N 标签」说明行随 B1 批退役').not.toContain('共 2 标签')
    // RR1-N4：列表滚动上限 CSS 锚（票面③ max-height:320px——library-cards CSS
    // 逐值锁同型，源锚防回漂）
    const cssDd = readFileSync(
      join(process.cwd(), 'src/renderer/features/tags/tag-dropdown.css'),
      'utf8'
    )
    expect(cssDd, '列表 max-height=320px（B1 票面③）').toMatch(
      /\.lib-dd-list\s*\{[^}]*max-height:\s*320px/
    )
    expect(cssDd, '列表 overflow-y=auto（滚动形态）').toMatch(
      /\.lib-dd-list\s*\{[^}]*overflow-y:\s*auto/
    )
  })

  it('idle 钮（零选集）无 ×N 计数、非 accent 态；头部删除钮零勾选禁用+全选框 false', async () => {
    currentTags = [tag('t-a', '水质', 2)]
    useTagsStore.setState({ tags: currentTags, loading: false, error: null })
    await renderDropdown([], vi.fn())
    const btn = tagButton()
    expect(btn?.textContent).not.toContain('×')
    expect(btn?.classList.contains('lib-dd-btn-on')).toBe(false)
    await openPanel()
    expect(selectAllBox()?.getAttribute('aria-checked'), '零选中=false').toBe('false')
    expect(deleteButton()?.disabled, '零勾选=删除禁用').toBe(true)
  })

  it('空标签库：面板开=引导文案+全选框禁用（先在详情侧栏打标签——语义承接）', async () => {
    useTagsStore.setState({ tags: [], loading: false, error: null })
    await renderDropdown([], vi.fn())
    await openPanel()
    const panel = host?.querySelector('.lib-dd-panel')
    expect(panel).not.toBeNull()
    expect(panel?.textContent).toContain('暂无标签可筛选（在详情侧栏为文献打标签）')
    expect(selectAllBox()?.disabled, '零标签=全选禁用').toBe(true)
  })
})

describe('F-UIRES-03 B1 toggle 即时生效（现行 P7E-06 语义零变）', () => {
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
    expect(row('水质')?.querySelector('[role="checkbox"]')?.getAttribute('aria-checked')).toBe('true')
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

  it('三关闭触发：钮二次点关/外点关/Esc 关（面板离场；无行编辑态时面板即 Esc 目标）', async () => {
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

  it('B1 Esc 分层：行编辑态开→Esc 先退编辑（面板保持）；再 Esc 关面板', async () => {
    currentTags = [tag('t-a', '水质', 2)]
    useTagsStore.setState({ tags: currentTags, loading: false, error: null })
    await renderDropdown([], vi.fn())
    await openPanel()
    await act(async () => {
      row('水质')?.querySelector<HTMLButtonElement>('.lib-dd-edit-btn')?.click()
    })
    expect(host?.querySelector('.lib-dd-row input'), '行编辑态在场').not.toBeNull()
    // 焦点在色点上时 Esc（非 input 自有键面——document 层分流）
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(host?.querySelector('.lib-dd-row input'), 'Esc 先退行编辑态').toBeNull()
    expect(host?.querySelector('.lib-dd-panel'), '面板保持开（最上层先关）').not.toBeNull()
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(host?.querySelector('.lib-dd-panel'), '再 Esc 关面板').toBeNull()
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
    expect(row('标签21')?.querySelector('[role="checkbox"]')?.getAttribute('aria-checked')).toBe('false')
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

describe('F-UIRES-03 B1 全选框三态与 toggle', () => {
  it('三态演化：0 选中=false → 勾 1=mixed → 勾 2=true', async () => {
    currentTags = [tag('t-a', '水质', 2), tag('t-b', '机器学习', 1)]
    useTagsStore.setState({ tags: currentTags, loading: false, error: null })
    await renderDropdown([], vi.fn())
    await openPanel()
    expect(selectAllBox()?.getAttribute('aria-checked')).toBe('false')
    await renderDropdown(['t-a'], vi.fn())
    await openPanel()
    expect(selectAllBox()?.getAttribute('aria-checked'), '1/2 勾选=半选态').toBe('mixed')
    await renderDropdown(['t-a', 't-b'], vi.fn())
    await openPanel()
    expect(selectAllBox()?.getAttribute('aria-checked'), '全勾选=true').toBe('true')
  })

  it('toggle：零选中点全选=全部 id 载荷；全选中点全选=清空', async () => {
    currentTags = [tag('t-a', '水质', 2), tag('t-b', '机器学习', 1)]
    useTagsStore.setState({ tags: currentTags, loading: false, error: null })
    const onFilterChange = vi.fn()
    await renderDropdown([], onFilterChange)
    await openPanel()
    await act(async () => {
      selectAllBox()!.click()
    })
    expect(onFilterChange).toHaveBeenLastCalledWith(['t-a', 't-b'])
    await renderDropdown(['t-a', 't-b'], onFilterChange)
    await openPanel()
    await act(async () => {
      selectAllBox()!.click()
    })
    expect(onFilterChange).toHaveBeenLastCalledWith([])
  })

  it('上限钳制：21 标签点全选=前 20 id 载荷+info toast（TAG_FILTER_MAX 语义沿全选路径保持）', async () => {
    currentTags = Array.from({ length: 21 }, (_, i) =>
      tag(`t-${String(i + 1).padStart(2, '0')}`, `标签${i + 1}`, 0)
    )
    useTagsStore.setState({ tags: currentTags, loading: false, error: null })
    const onFilterChange = vi.fn()
    await renderDropdown([], onFilterChange)
    await openPanel()
    await act(async () => {
      selectAllBox()!.click()
    })
    expect(toastSpy).toHaveBeenCalledWith('最多同时筛选 20 个标签', 'info')
    expect(onFilterChange).toHaveBeenCalledTimes(1)
    const payload: string[] = onFilterChange.mock.calls[0]?.[0] ?? []
    expect(payload).toHaveLength(20)
    expect(payload).not.toContain('t-21')
  })

  it('RR1-W2 钳制态无死局：21 标签钳 20（mixed）后再点全选=清空载荷 []+零新增 toast（前进路径恒可达）', async () => {
    currentTags = Array.from({ length: 21 }, (_, i) =>
      tag(`t-${String(i + 1).padStart(2, '0')}`, `标签${i + 1}`, 0)
    )
    useTagsStore.setState({ tags: currentTags, loading: false, error: null })
    const onFilterChange = vi.fn()
    const selected = currentTags.slice(0, 20).map((t) => t.id)
    await renderDropdown(selected, onFilterChange)
    await openPanel()
    expect(selectAllBox()?.getAttribute('aria-checked'), '钳制态=20/21 半选').toBe('mixed')
    toastSpy.mockClear()
    await act(async () => {
      selectAllBox()!.click()
    })
    expect(onFilterChange).toHaveBeenLastCalledWith([])
    expect(onFilterChange).toHaveBeenCalledTimes(1)
    expect(toastSpy, '清空路零 toast（上界守卫只属添加向）').not.toHaveBeenCalled()
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

describe('FilterBar 装配收敛（列序=搜索→年份→排序→标签→弹性空档——批 α 移位）', () => {
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

  it('列序锚（批 α 移位）：搜索框→年份下拉→排序下拉→标签钮（排序钮右邻）→弹性空档', async () => {
    currentTags = [tag('t-a', '水质', 2)]
    useTagsStore.setState({ tags: currentTags, loading: false, error: null })
    await renderBar({ sort: 'added_desc', offset: 0, limit: 50 }, vi.fn())
    const bar = host?.querySelector('.lib-filter-row')
    expect(bar).not.toBeNull()
    const order = [
      ...(bar?.querySelectorAll('.lib-search, select, .lib-filter-spacer, .lib-dd-btn') ?? [])
    ].map((el) => (el.classList.contains('lib-search') ? 'search' : el.tagName === 'SELECT' ? 'select' : el.className))
    expect(order).toEqual(['search', 'select', 'select', 'lib-dd-btn', 'lib-filter-spacer'])
    expect(
      host?.querySelector('select[aria-label="排序方式"]')?.classList.contains('lib-sort-end'),
      '排序下拉行尾类退役（标签钮=排序钮右邻——批 α 移位后行尾留白归 spacer）'
    ).toBe(false)
  })
})
