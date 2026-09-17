// @vitest-environment jsdom
/**
 * [P7E-01] TagFilter 管理面（always-active）：chip 右键菜单+三对话框接线。
 *
 * S2/S3：删除/合并源=选中标签时，onFilterChange(剔除后空集) 必须先于 onMutated()
 * （invocationCallOrder 锚——顺序反了=死标签 id 查询空列表窗）；S4：合并目标=
 * 选中时筛选不动；S8：对话框提交双击 busy 守卫防重复提交；S9：tags.length===1
 * 时「合并到…」菜单项禁用。
 * [门一回炉补锚] W3：菜单 Esc 关闭（keydown 契约）；N1：delete 提交飞行中
 * 取消被阻断（按钮禁用+Dialog onClose 包装 no-op），resolve 成功后才关。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Tag } from '../../../src/shared/models/tag'
import { makeApiStub, } from '../../utils/api-client-mock'

const stubApi = makeApiStub({ tags: { list: vi.fn(), rename: vi.fn(), merge: vi.fn(), delete: vi.fn() } })

import { TagFilter } from '../../../src/renderer/features/tags/TagFilter'
import { useTagsStore } from '../../../src/renderer/features/tags/tags.store'

type TagWithCount = Tag & { paperCount: number }

// act() 环境声明（import-dropzone 同口径——免 React 警告刷屏）
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
      <TagFilter selectedTagIds={selectedTagIds} onFilterChange={onFilterChange} onMutated={onMutated} />
    )
  })
}

/** 按精确文本找按钮（scope 缺省=整树；对话框内交互务必传 dialog scope 防同名碰撞） */
function buttonByText(text: string, scope?: ParentNode): HTMLButtonElement | undefined {
  const base: ParentNode = scope ?? host ?? document
  return [...base.querySelectorAll('button')].find((b) => b.textContent === text)
}

async function click(btn: HTMLButtonElement | undefined, label: string): Promise<void> {
  expect(btn, `按钮存在：${label}`).toBeDefined()
  await act(async () => {
    btn?.click()
  })
}

/** 当前对话框（同时刻至多一个） */
function dialog(): HTMLElement | null {
  return host?.querySelector('[role="dialog"]') ?? null
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

describe('P7E-01 TagFilter —— 标签生命周期管理面', () => {
  it('S2 删除选中标签：先 onFilterChange(null) 清死 id 筛选，后 onMutated（invocationCallOrder 锚）', async () => {
    currentTags = [
      { id: 't-1', name: '甲', paperCount: 2 },
      { id: 't-2', name: '乙', paperCount: 1 }
    ]
    const onFilterChange = vi.fn()
    const onMutated = vi.fn()
    await render(['t-1'], onFilterChange, onMutated)
    stubApi.tags.delete.mockResolvedValue({ ok: true as const, data: { ok: true } })
    stubApi.tags.list.mockResolvedValue({ ok: true as const, data: [] })
    await rightClick('甲（2）')
    await click(buttonByText('删除'), '菜单·删除')
    await click(buttonByText('确认删除', dialog()!), '对话框·确认删除')
    expect(onFilterChange).toHaveBeenCalledTimes(1)
    // 单选锚语义等价迁移（P7E-06）：选中集恰 [t-1]→剔除后空集=清除全部（v1 为 null）
    expect(onFilterChange).toHaveBeenCalledWith([])
    expect(onMutated).toHaveBeenCalledTimes(1)
    // 顺序锚（S2）：先清筛选（setQuery 清 tagIds→library 自动重载）后通知 library 刷新
    const filterOrder = onFilterChange.mock.invocationCallOrder[0]
    const mutatedOrder = onMutated.mock.invocationCallOrder[0]
    expect(filterOrder, 'onFilterChange 已被调用').toBeDefined()
    expect(mutatedOrder, 'onMutated 已被调用').toBeDefined()
    expect(filterOrder!).toBeLessThan(mutatedOrder!)
  })

  it('删除非选中标签：筛选不动（onFilterChange 零调用），仅 onMutated', async () => {
    currentTags = [
      { id: 't-1', name: '甲', paperCount: 2 },
      { id: 't-2', name: '乙', paperCount: 1 }
    ]
    const onFilterChange = vi.fn()
    const onMutated = vi.fn()
    await render(['t-2'], onFilterChange, onMutated)
    stubApi.tags.delete.mockResolvedValue({ ok: true as const, data: { ok: true } })
    stubApi.tags.list.mockResolvedValue({ ok: true as const, data: [] })
    await rightClick('甲（2）')
    await click(buttonByText('删除'), '菜单·删除')
    await click(buttonByText('确认删除', dialog()!), '对话框·确认删除')
    expect(onFilterChange).not.toHaveBeenCalled()
    expect(onMutated).toHaveBeenCalledTimes(1)
  })

  it('S3 合且源=选中：同 S2 顺序（源 id 已消失）；目标 chip 点选即确认', async () => {
    currentTags = [
      { id: 't-1', name: '甲', paperCount: 2 },
      { id: 't-2', name: '乙', paperCount: 1 }
    ]
    const onFilterChange = vi.fn()
    const onMutated = vi.fn()
    await render(['t-1'], onFilterChange, onMutated)
    stubApi.tags.merge.mockResolvedValue({ ok: true as const, data: { ok: true } })
    stubApi.tags.list.mockResolvedValue({ ok: true as const, data: [] })
    await rightClick('甲（2）')
    await click(buttonByText('合并到…'), '菜单·合并到…')
    expect(dialog(), '合并对话框在场').not.toBeNull()
    await click(buttonByText('乙（1）', dialog()!), '对话框·目标 chip 乙（1）')
    expect(stubApi.tags.merge).toHaveBeenCalledWith({ sourceId: 't-1', targetId: 't-2' })
    expect(onFilterChange).toHaveBeenCalledWith([])
    const filterOrder = onFilterChange.mock.invocationCallOrder[0]
    const mutatedOrder = onMutated.mock.invocationCallOrder[0]
    expect(filterOrder, 'onFilterChange 已被调用').toBeDefined()
    expect(mutatedOrder, 'onMutated 已被调用').toBeDefined()
    expect(filterOrder!).toBeLessThan(mutatedOrder!)
    expect(dialog(), '成功后对话框关闭').toBeNull()
  })

  it('S4 合且目标=选中：筛选不动（target id 稳定，仅计数增）', async () => {
    currentTags = [
      { id: 't-1', name: '甲', paperCount: 2 },
      { id: 't-2', name: '乙', paperCount: 1 }
    ]
    const onFilterChange = vi.fn()
    const onMutated = vi.fn()
    await render(['t-2'], onFilterChange, onMutated)
    stubApi.tags.merge.mockResolvedValue({ ok: true as const, data: { ok: true } })
    stubApi.tags.list.mockResolvedValue({ ok: true as const, data: [] })
    await rightClick('甲（2）')
    await click(buttonByText('合并到…'), '菜单·合并到…')
    await click(buttonByText('乙（1）', dialog()!), '对话框·目标 chip 乙（1）')
    expect(onFilterChange).not.toHaveBeenCalled()
    expect(onMutated).toHaveBeenCalledTimes(1)
  })

  it('S8 重命名对话框：预填现名；提交双击 busy 守卫防重复提交（rename 仅一次）', async () => {
    currentTags = [{ id: 't-1', name: '甲', paperCount: 1 }]
    const onFilterChange = vi.fn()
    const onMutated = vi.fn()
    await render([], onFilterChange, onMutated)
    let resolveRename!: (v: unknown) => void
    stubApi.tags.rename.mockImplementation(
      () => new Promise((r) => { resolveRename = r })
    )
    await rightClick('甲（1）')
    await click(buttonByText('重命名'), '菜单·重命名')
    const input = dialog()?.querySelector('input') ?? null
    expect(input, '重命名输入框在场').not.toBeNull()
    expect(input?.value, '预填现名').toBe('甲')
    await setType(input!, '乙')
    const save = buttonByText('保存', dialog()!)
    // 同一 act 内连点两次（React 批处理窗——ref 守卫必须同步生效）
    await act(async () => {
      save!.click()
      save!.click()
    })
    expect(stubApi.tags.rename).toHaveBeenCalledTimes(1)
    expect(stubApi.tags.rename).toHaveBeenCalledWith({ tagId: 't-1', name: '乙' })
    await act(async () => {
      resolveRename({ ok: true, data: { id: 't-1', name: '乙' } })
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(onMutated).toHaveBeenCalledTimes(1)
    expect(dialog(), '成功后对话框关闭').toBeNull()
  })

  it('S9 tags.length===1 时菜单「合并到…」禁用（无其他目标）', async () => {
    currentTags = [{ id: 't-1', name: '甲', paperCount: 0 }]
    await render([], vi.fn(), vi.fn())
    await rightClick('甲（0）')
    const mergeBtn = buttonByText('合并到…')
    expect(mergeBtn, '菜单项在场').toBeDefined()
    expect(mergeBtn?.disabled, '单标签无合并目标——禁用').toBe(true)
  })

  it('W3：菜单开→按 Escape→菜单关闭（keydown 关闭契约，unmount 清理）', async () => {
    currentTags = [{ id: 't-1', name: '甲', paperCount: 0 }]
    await render([], vi.fn(), vi.fn())
    await rightClick('甲（0）')
    expect(host?.querySelector('[data-testid="tag-menu"]'), '菜单在场').not.toBeNull()
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(host?.querySelector('[data-testid="tag-menu"]'), 'Escape 后菜单关闭').toBeNull()
  })

  it('N1：delete 提交飞行中取消被阻断（按钮禁用+Esc/遮罩 onClose no-op），resolve 成功后才关', async () => {
    currentTags = [{ id: 't-1', name: '甲', paperCount: 2 }]
    await render([], vi.fn(), vi.fn())
    let resolveDelete!: (v: unknown) => void
    stubApi.tags.delete.mockImplementation(
      () => new Promise((r) => { resolveDelete = r })
    )
    await rightClick('甲（2）')
    await click(buttonByText('删除'), '菜单·删除')
    await click(buttonByText('确认删除', dialog()!), '对话框·确认删除')
    // busy 飞行中：取消按钮禁用（与保存/确认 disabled 态对齐——N1）
    expect(buttonByText('取消', dialog()!)?.disabled, 'busy 期取消禁用').toBe(true)
    // Dialog 自身 Esc 关闭路径经包装 onClose → no-op：对话框不得关
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(dialog(), 'busy 中 Esc 不得关闭（对话框已关、变更随后生效=语义错位）').not.toBeNull()
    // mutation 成功落定 → 关闭走成功路径
    await act(async () => {
      resolveDelete({ ok: true, data: { ok: true } })
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(dialog(), 'resolve 成功后对话框关闭').toBeNull()
  })
})
