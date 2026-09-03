// @vitest-environment jsdom
/**
 * [P7E-06] TagFilter 多选过滤（AND 交集 chip toggle）+ FilterBar 装配收敛
 * （always-active 裸 describe——K3 威胁不经 guardedDescribe）。
 *
 * T1/T2/T3 组件级 toggle 序列（受控回流——选中集演化载荷）+ aria-pressed 多选
 * 视觉锚；T5 删除选中集成员=剔除非全清（onFilterChange(remaining) 先于
 * onMutated——INV-53 顺序锚多选形态）；T6 改名 id 稳定筛选零动；T7 合并源∈
 * 选中集=剔除且目标不自动入选；T3 装配级=FilterBar 空数组收敛 undefined
 * （schema 拒收 [] 的 UI 侧防线——M3 变异锚）。
 * P7X-01：T8/T9 选中上界 UI 感知（20 选中点 21 拦截 / 19 选中点 20 放行，
 * 夹具与文案断言用字面量——常量变异必须红）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as clientModule from '../../../src/renderer/api/client'
import type * as toastModule from '../../../src/renderer/shared/ui/Toast'

const { stubApi, toastSpy } = vi.hoisted(() => ({
  stubApi: {
    library: { collections: vi.fn() },
    tags: { list: vi.fn(), rename: vi.fn(), merge: vi.fn(), delete: vi.fn() }
  },
  toastSpy: vi.fn()
}))
vi.mock('../../../src/renderer/api/client', async (importOriginal) => {
  const real = await importOriginal<typeof clientModule>()
  return { ...real, api: stubApi as unknown as typeof clientModule.api }
})
vi.mock('../../../src/renderer/shared/ui/Toast', async (importOriginal) => {
  const real = await importOriginal<typeof toastModule>()
  return { ...real, showToast: toastSpy }
})

import { TagFilter } from '../../../src/renderer/features/tags/TagFilter'
import { FilterBar } from '../../../src/renderer/features/library/FilterBar'
import { useTagsStore } from '../../../src/renderer/features/tags/tags.store'
import type { LibraryQuery } from '../../../src/shared/models/paper'
import type { Tag } from '../../../src/shared/models/tag'

type TagWithCount = Tag & { paperCount: number }

// act() 环境声明（tag-lifecycle-ui 同口径——免 React 警告刷屏）
;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let host: HTMLDivElement | null = null
let currentTags: TagWithCount[] = []

function tag(id: string, name: string, paperCount: number): TagWithCount {
  return { id, name, paperCount }
}

/** 首次挂载建 host/root；后续调用=同 root 受控重渲染（选中集回流） */
async function renderFilter(
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
      <TagFilter selectedTagIds={selectedTagIds} onFilterChange={onFilterChange} onMutated={onMutated} />
    )
  })
}

/** 按精确文本找按钮（chip 与对话框按钮通用；scope 缺省=整树） */
function buttonByText(text: string, scope?: ParentNode): HTMLButtonElement | undefined {
  const base: ParentNode = scope ?? host ?? document
  return [...base.querySelectorAll('button')].find((b) => b.textContent === text)
}

async function clickChip(chipText: string): Promise<void> {
  const btn = buttonByText(chipText)
  expect(btn, `chip 存在：${chipText}`).toBeDefined()
  await act(async () => {
    btn?.click()
  })
}

/** chip 右键开菜单（React onContextMenu——冒泡 contextmenu 事件） */
async function rightClick(chipText: string): Promise<void> {
  const btn = buttonByText(chipText)
  expect(btn, `chip 存在：${chipText}`).toBeDefined()
  await act(async () => {
    btn!.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 8, clientY: 8 })
    )
  })
  expect(host?.querySelector('[data-testid="tag-menu"]'), '右键后菜单在场').not.toBeNull()
}

function dialog(): HTMLElement | null {
  return host?.querySelector('[role="dialog"]') ?? null
}

/** 受控 input 打字（原生 setter+input 事件——React 受控组件 jsdom 标准法） */
async function setType(input: HTMLInputElement, text: string): Promise<void> {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  await act(async () => {
    setter?.call(input, text)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
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

describe('P7E-06 TagFilter 多选过滤（toggle/剔除/顺序锚）', () => {
  it('T1/T2/T3 toggle 序列：进→并集→退出→全清，载荷=选中集演化且 aria-pressed 同步', async () => {
    currentTags = [tag('t-a', '水质', 2), tag('t-b', '机器学习', 1)]
    useTagsStore.setState({ tags: currentTags, loading: false, error: null })
    stubApi.tags.list.mockImplementation(async () => ({ ok: true as const, data: currentTags }))
    const onFilterChange = vi.fn()
    await renderFilter([], onFilterChange)
    // T1 前半：选 A → 选中集 [A]
    await clickChip('水质（2）')
    expect(onFilterChange).toHaveBeenLastCalledWith(['t-a'])
    await renderFilter(['t-a'], onFilterChange)
    // T1 后半：选 B → 选中集 [A,B]（进入序保持）
    await clickChip('机器学习（1）')
    expect(onFilterChange).toHaveBeenLastCalledWith(['t-a', 't-b'])
    await renderFilter(['t-a', 't-b'], onFilterChange)
    // 多选视觉锚：两 chip 均 pressed
    expect(buttonByText('水质（2）')?.getAttribute('aria-pressed')).toBe('true')
    expect(buttonByText('机器学习（1）')?.getAttribute('aria-pressed')).toBe('true')
    // T2：取消 A → 选中集 [B]
    await clickChip('水质（2）')
    expect(onFilterChange).toHaveBeenLastCalledWith(['t-b'])
    await renderFilter(['t-b'], onFilterChange)
    expect(buttonByText('水质（2）')?.getAttribute('aria-pressed')).toBe('false')
    expect(buttonByText('机器学习（1）')?.getAttribute('aria-pressed')).toBe('true')
    // T3 组件级：再取消 B → onFilterChange([])（空数组=清除全部选中）
    await clickChip('机器学习（1）')
    expect(onFilterChange).toHaveBeenLastCalledWith([])
  })

  it('T5 删除选中集成员：onFilterChange(剔除后剩余) 先于 onMutated（顺序锚多选形态）', async () => {
    currentTags = [tag('t-x', '甲', 2), tag('t-y', '乙', 1)]
    useTagsStore.setState({ tags: currentTags, loading: false, error: null })
    stubApi.tags.list.mockImplementation(async () => ({ ok: true as const, data: currentTags }))
    const onFilterChange = vi.fn()
    const onMutated = vi.fn()
    await renderFilter(['t-x', 't-y'], onFilterChange, onMutated)
    stubApi.tags.delete.mockResolvedValue({ ok: true as const, data: { ok: true } })
    stubApi.tags.list.mockResolvedValue({ ok: true as const, data: [tag('t-y', '乙', 1)] })
    await rightClick('甲（2）')
    await act(async () => {
      buttonByText('删除')?.click()
    })
    await act(async () => {
      buttonByText('确认删除', dialog()!)?.click()
    })
    expect(onFilterChange).toHaveBeenCalledTimes(1)
    // 剔除非全清：消失 id 出局、其余选中项保持（票面① INV-53 多选适配）
    expect(onFilterChange).toHaveBeenCalledWith(['t-y'])
    expect(onMutated).toHaveBeenCalledTimes(1)
    const filterOrder = onFilterChange.mock.invocationCallOrder[0]
    const mutatedOrder = onMutated.mock.invocationCallOrder[0]
    expect(filterOrder, 'onFilterChange 已被调用').toBeDefined()
    expect(mutatedOrder, 'onMutated 已被调用').toBeDefined()
    expect(filterOrder!).toBeLessThan(mutatedOrder!)
  })

  it('T6 改名选中集成员（id 稳定）：筛选零动（onFilterChange 不调用），仅 onMutated', async () => {
    currentTags = [tag('t-x', '甲', 2), tag('t-y', '乙', 1)]
    useTagsStore.setState({ tags: currentTags, loading: false, error: null })
    stubApi.tags.list.mockImplementation(async () => ({ ok: true as const, data: currentTags }))
    const onFilterChange = vi.fn()
    const onMutated = vi.fn()
    await renderFilter(['t-x', 't-y'], onFilterChange, onMutated)
    stubApi.tags.rename.mockResolvedValue({ ok: true as const, data: { id: 't-x', name: '新甲' } })
    await rightClick('甲（2）')
    await act(async () => {
      buttonByText('重命名')?.click()
    })
    const input = dialog()?.querySelector('input') ?? null
    expect(input, '重命名输入框在场').not.toBeNull()
    await setType(input!, '新甲')
    await act(async () => {
      buttonByText('保存', dialog()!)?.click()
    })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(onFilterChange).not.toHaveBeenCalled()
    expect(onMutated).toHaveBeenCalledTimes(1)
  })

  it('T7 合并源∈选中集：源剔除且目标不自动入选（载荷恰=剩余集，顺序锚保持）', async () => {
    currentTags = [tag('t-x', '甲', 2), tag('t-y', '乙', 1), tag('t-z', '丙', 3)]
    useTagsStore.setState({ tags: currentTags, loading: false, error: null })
    stubApi.tags.list.mockImplementation(async () => ({ ok: true as const, data: currentTags }))
    const onFilterChange = vi.fn()
    const onMutated = vi.fn()
    await renderFilter(['t-x', 't-y'], onFilterChange, onMutated)
    stubApi.tags.merge.mockResolvedValue({ ok: true as const, data: { ok: true } })
    stubApi.tags.list.mockResolvedValue({ ok: true as const, data: [tag('t-y', '乙', 1), tag('t-z', '丙', 5)] })
    await rightClick('甲（2）')
    await act(async () => {
      buttonByText('合并到…')?.click()
    })
    await act(async () => {
      buttonByText('丙（3）', dialog()!)?.click()
    })
    expect(onFilterChange).toHaveBeenCalledTimes(1)
    // 剔除 t-x、t-y 保持、t-z 不自动入选——载荷恰为剩余集
    expect(onFilterChange).toHaveBeenCalledWith(['t-y'])
    expect(onMutated).toHaveBeenCalledTimes(1)
    const filterOrder = onFilterChange.mock.invocationCallOrder[0]
    const mutatedOrder = onMutated.mock.invocationCallOrder[0]
    expect(filterOrder!).toBeLessThan(mutatedOrder!)
  })
})

describe('P7E-06 FilterBar 装配收敛（tagIds 形态）', () => {
  it('T3 装配级：点选→onChange({tagIds})；全清→onChange({tagIds: undefined})（空数组不进查询）', async () => {
    currentTags = [tag('t-a', '水质', 2), tag('t-b', '机器学习', 1)]
    useTagsStore.setState({ tags: currentTags, loading: false, error: null })
    stubApi.tags.list.mockImplementation(async () => ({ ok: true as const, data: currentTags }))
    stubApi.library.collections.mockResolvedValue({ ok: true as const, data: [] })
    const onChange = vi.fn()
    const base: LibraryQuery = { sort: 'added_desc', offset: 0, limit: 50 }
    await renderBar(base, onChange)
    // 点选 A：收敛为数组形态
    await clickChip('水质（2）')
    expect(onChange).toHaveBeenLastCalledWith({ tagIds: ['t-a'] })
    // 受控回流（父 setQuery 后 query.tagIds=['t-a']）
    await renderBar({ ...base, tagIds: ['t-a'] }, onChange)
    // 再点 A：toggle 出→空数组→收敛 undefined（零过滤，schema 级拒收 [] 的 UI 侧防线）
    await clickChip('水质（2）')
    expect(onChange).toHaveBeenLastCalledWith({ tagIds: undefined })
  })
})

describe('P7X-01 标签选中上限 UI 感知（添加方向守卫，移除方向永不设限）', () => {
  it('T8 上界拦截：20 选中点第 21 chip → toast 恰一次 + onFilterChange 零调用 + chip 保持未选', async () => {
    currentTags = Array.from({ length: 21 }, (_, i) =>
      tag(`t-${String(i + 1).padStart(2, '0')}`, `标签${i + 1}`, 0)
    )
    useTagsStore.setState({ tags: currentTags, loading: false, error: null })
    stubApi.tags.list.mockImplementation(async () => ({ ok: true as const, data: currentTags }))
    const onFilterChange = vi.fn()
    const selected = currentTags.slice(0, 20).map((t) => t.id)
    await renderFilter(selected, onFilterChange)
    await clickChip('标签21（0）')
    // 引导 toast 恰一次、info 级、文案含上界值（字面量锁定——常量变异必红）
    expect(toastSpy).toHaveBeenCalledTimes(1)
    expect(toastSpy).toHaveBeenCalledWith('最多同时筛选 20 个标签', 'info')
    // 选中态零变：onFilterChange 零调用（选中集不进第 21 个）
    expect(onFilterChange).not.toHaveBeenCalled()
    // 被拦 chip 视觉保持未选
    expect(buttonByText('标签21（0）')?.getAttribute('aria-pressed')).toBe('false')
  })

  it('T9 边界放行：19 选中点第 20 chip → onFilterChange 恰一次、载荷 20 项含新 id + 零 toast', async () => {
    currentTags = Array.from({ length: 20 }, (_, i) =>
      tag(`t-${String(i + 1).padStart(2, '0')}`, `标签${i + 1}`, 0)
    )
    useTagsStore.setState({ tags: currentTags, loading: false, error: null })
    stubApi.tags.list.mockImplementation(async () => ({ ok: true as const, data: currentTags }))
    const onFilterChange = vi.fn()
    const selected = currentTags.slice(0, 19).map((t) => t.id)
    await renderFilter(selected, onFilterChange)
    await clickChip('标签20（0）')
    // 第 20 个合法入选（length=19 时添加）
    expect(onFilterChange).toHaveBeenCalledTimes(1)
    const payload: string[] = onFilterChange.mock.calls[0]?.[0] ?? []
    expect(payload).toHaveLength(20)
    expect(payload).toContain('t-20')
    // 边界内不引导
    expect(toastSpy).not.toHaveBeenCalled()
  })

  it('T10 上界移除锚（门二 R1）：20 选中点已选 chip → onFilterChange 恰一次、载荷 19 项不含该 id + 零 toast（守卫删 !active 变异的唯一杀手）', async () => {
    currentTags = Array.from({ length: 21 }, (_, i) =>
      tag(`t-${String(i + 1).padStart(2, '0')}`, `标签${i + 1}`, 0)
    )
    useTagsStore.setState({ tags: currentTags, loading: false, error: null })
    stubApi.tags.list.mockImplementation(async () => ({ ok: true as const, data: currentTags }))
    const onFilterChange = vi.fn()
    const selected = currentTags.slice(0, 20).map((t) => t.id)
    await renderFilter(selected, onFilterChange)
    // 满选集上移除首个选中项——移除方向永不设限（票面 §1）
    await clickChip('标签1（0）')
    expect(onFilterChange).toHaveBeenCalledTimes(1)
    const payload: string[] = onFilterChange.mock.calls[0]?.[0] ?? []
    expect(payload).toHaveLength(19)
    expect(payload).not.toContain('t-01')
    expect(toastSpy).not.toHaveBeenCalled()
  })
})
