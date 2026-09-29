// @vitest-environment jsdom
/**
 * [F-TAGS-01] TagColorDialog + TagFilter 着色面（always-active）。
 *
 * 覆盖：菜单「颜色…」入口→对话框（TagLifecycle 同构：useBusyGuard/N1 busy
 * 禁关/S6 失败保持开）；预设 8 swatch+原生 input[type=color]+「恢复默认」
 * null 路；确定=setTagColor(store 命令型动作——链式 refresh 后 chip 着色
 * 生效，INV-86 三面之一）；null chip=现状类皮肤零变。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TAG_COLOR_PRESETS } from '../../../src/shared/constants'
import { makeApiStub, toastSpy } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  tags: { list: vi.fn(), rename: vi.fn(), merge: vi.fn(), delete: vi.fn(), setColor: vi.fn() }
})

import { TagFilter } from '../../../src/renderer/features/tags/TagFilter'
import { useTagsStore } from '../../../src/renderer/features/tags/tags.store'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let host: HTMLDivElement | null = null
let currentTags: Array<{ id: string; name: string; paperCount: number; color: string | null }> = []

async function renderFilter(onMutated?: () => void): Promise<void> {
  useTagsStore.setState({ tags: currentTags, loading: false, error: null })
  stubApi.tags.list.mockImplementation(async () => ({ ok: true as const, data: currentTags }))
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(
      <TagFilter selectedTagIds={[]} onFilterChange={() => undefined} onMutated={onMutated} />
    )
  })
}

function buttonByText(text: string, scope?: ParentNode): HTMLButtonElement | undefined {
  const base: ParentNode = scope ?? host ?? document
  return [...base.querySelectorAll('button')].find((b) => b.textContent === text)
}

function buttonByLabel(label: string): HTMLButtonElement {
  const b = [...host!.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === label)
  if (!(b instanceof HTMLButtonElement)) throw new Error(`按钮（aria-label=${label}）不在场`)
  return b
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

/** chip 右键开菜单→点「颜色…」→对话框在场 */
async function openColorDialog(chipText: string): Promise<void> {
  const btn = buttonByText(chipText)
  expect(btn, `chip 存在：${chipText}`).toBeDefined()
  await act(async () => {
    btn!.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 8, clientY: 8 })
    )
  })
  await click(buttonByText('颜色…'), '菜单·颜色…')
  expect(dialog(), '颜色对话框在场').not.toBeNull()
}

beforeEach(() => {
  vi.clearAllMocks()
  currentTags = [
    { id: 't-1', name: '甲', paperCount: 2, color: null },
    { id: 't-2', name: '乙', paperCount: 1, color: '#0ea5e9' }
  ]
})

afterEach(async () => {
  await act(async () => {
    root?.unmount()
  })
  host?.remove()
  root = null
  host = null
})

describe('F-TAGS-01 TagColorDialog —— 取色器（TagLifecycle 同构）', () => {
  it('入口与控件面：右键→颜色…→预设 8 swatch+原生 input[type=color]+「恢复默认」；取消零写', async () => {
    await renderFilter()
    await openColorDialog('甲 ×2')
    const dlg = dialog()!
    expect(TAG_COLOR_PRESETS).toHaveLength(8)
    for (const c of TAG_COLOR_PRESETS) {
      expect(buttonByLabel(`预设颜色 ${c}`), `预设 swatch ${c} 在场`).toBeDefined()
    }
    expect(dlg.querySelector('input[type="color"]'), '原生取色输入在场').not.toBeNull()
    expect(buttonByText('恢复默认', dlg), '恢复默认按钮在场').toBeDefined()
    await click(buttonByText('取消', dlg), '对话框·取消')
    expect(dialog()).toBeNull()
    expect(stubApi.tags.setColor).not.toHaveBeenCalled()
  })

  it('点预设 swatch→确定：setColor({tagId,color}) 逐参+onMutated(null)+关闭+chip 着色生效（链式 refresh）', async () => {
    const onMutated = vi.fn()
    await renderFilter(onMutated)
    await openColorDialog('甲 ×2')
    await click(buttonByLabel(`预设颜色 ${TAG_COLOR_PRESETS[0]}`), '第一预设')
    stubApi.tags.setColor.mockResolvedValue({
      ok: true as const,
      data: { id: 't-1', name: '甲', color: TAG_COLOR_PRESETS[0] }
    })
    currentTags = [
      { id: 't-1', name: '甲', paperCount: 2, color: TAG_COLOR_PRESETS[0] },
      { id: 't-2', name: '乙', paperCount: 1, color: '#0ea5e9' }
    ]
    await click(buttonByText('确定', dialog()!), '对话框·确定')
    expect(stubApi.tags.setColor).toHaveBeenCalledWith({ tagId: 't-1', color: TAG_COLOR_PRESETS[0] })
    // TagFilter 外抛 onMutated 契约=无参（disappearedId 在 handleMutated 内部
    // 消化——id 稳定非选中态，筛选零动）
    expect(onMutated).toHaveBeenCalledTimes(1)
    expect(dialog()).toBeNull()
    // store 链式 refresh 后 chip 着色（list 桩返回新态；jsdom 将 hex+alpha 归
    // 一 rgba——三元组锚，e11d48 → 225, 29, 72）
    const chip = buttonByText('甲 ×2')
    expect(chip?.style.background).toContain('225, 29, 72')
    expect(chip?.style.border).toContain('225, 29, 72')
    // alpha/边框形态锁（d1-W4——INV-86 契约：bg=hex+22≈0.13/border=1px solid hex+66=0.4）
    expect(chip?.style.background).toMatch(/rgba\(225, 29, 72, 0\.13/)
    expect(chip?.style.border).toMatch(/rgba\(225, 29, 72, 0\.4\)/)
    expect(chip?.style.border).toContain('1px solid')
  })

  it('恢复默认→确定：setColor(tagId, null)=null 路', async () => {
    await renderFilter()
    await openColorDialog('乙 ×1')
    await click(buttonByText('恢复默认', dialog()!), '恢复默认')
    stubApi.tags.setColor.mockResolvedValue({ ok: true as const, data: { id: 't-2', name: '乙', color: null } })
    currentTags = [
      { id: 't-1', name: '甲', paperCount: 2, color: null },
      { id: 't-2', name: '乙', paperCount: 1, color: null }
    ]
    await click(buttonByText('确定', dialog()!), '对话框·确定')
    expect(stubApi.tags.setColor).toHaveBeenCalledWith({ tagId: 't-2', color: null })
    expect(dialog()).toBeNull()
  })

  it('自定义颜色路：input[type=color] change → 确定=自定义 hex', async () => {
    await renderFilter()
    await openColorDialog('甲 ×2')
    const picker = dialog()!.querySelector('input[type="color"]') as HTMLInputElement
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    await act(async () => {
      setter?.call(picker, '#123456')
      picker.dispatchEvent(new Event('input', { bubbles: true }))
    })
    stubApi.tags.setColor.mockResolvedValue({ ok: true as const, data: { id: 't-1', name: '甲', color: '#123456' } })
    await click(buttonByText('确定', dialog()!), '对话框·确定')
    expect(stubApi.tags.setColor).toHaveBeenCalledWith({ tagId: 't-1', color: '#123456' })
  })

  it('S6 失败：toast+对话框保持开（输入态保留）', async () => {
    await renderFilter()
    await openColorDialog('甲 ×2')
    await click(buttonByLabel(`预设颜色 ${TAG_COLOR_PRESETS[1]}`), '第二预设')
    stubApi.tags.setColor.mockResolvedValue({
      ok: false as const,
      error: { code: 'NOT_FOUND', message: '标签不存在' }
    })
    await click(buttonByText('确定', dialog()!), '对话框·确定')
    expect(toastSpy).toHaveBeenCalledWith('标签不存在', 'error')
    expect(dialog(), '失败后对话框保持开').not.toBeNull()
    // k1-N2a 半锚补全：「输入态保留」兑现——picked swatch 选择态仍在场
    expect(
      buttonByLabel(`预设颜色 ${TAG_COLOR_PRESETS[1]}`).getAttribute('aria-pressed'),
      '失败后选择态保留'
    ).toBe('true')
  })

  it('N1 busy 飞行中取消被阻断（按钮禁用+Esc onClose no-op），resolve 成功后才关', async () => {
    await renderFilter()
    await openColorDialog('甲 ×2')
    await click(buttonByLabel(`预设颜色 ${TAG_COLOR_PRESETS[2]}`), '第三预设')
    let resolveSetColor!: (v: unknown) => void
    stubApi.tags.setColor.mockImplementation(
      () => new Promise((r) => { resolveSetColor = r })
    )
    await click(buttonByText('确定', dialog()!), '对话框·确定')
    expect(buttonByText('取消', dialog()!)?.disabled, 'busy 期取消禁用').toBe(true)
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(dialog(), 'busy 中 Esc 不得关闭').not.toBeNull()
    await act(async () => {
      resolveSetColor({ ok: true, data: { id: 't-1', name: '甲', color: null } })
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(dialog(), 'resolve 成功后关闭').toBeNull()
  })
})

describe('F-TAGS-01 TagFilter chip 着色（INV-86 三面之一）', () => {
  it('color 非空 chip=背景/边框着色（rgba 归一三元组锚）；null chip=现状类皮肤（无着色 inline）', async () => {
    await renderFilter()
    const colored = buttonByText('乙 ×1')
    // #0ea5e922 → rgba(14, 165, 233, α)——cssstyle 归一宽容匹配三元组
    expect(colored?.style.background).toContain('14, 165, 233')
    expect(colored?.style.border).toContain('14, 165, 233')
    // alpha/边框形态锁（d1-W4——hex+22≈0.13/hex+66=0.4+1px solid）
    expect(colored?.style.background).toMatch(/rgba\(14, 165, 233, 0\.13/)
    expect(colored?.style.border).toMatch(/rgba\(14, 165, 233, 0\.4\)/)
    expect(colored?.style.border).toContain('1px solid')
    const plain = buttonByText('甲 ×2')
    expect(plain?.style.background).toBe('')
    expect(plain?.style.border).toBe('')
  })

  it('onColorMapChange 上抛：name→color 映射（PaperRow 徽标着色数据通道）', async () => {
    const onMap = vi.fn()
    useTagsStore.setState({ tags: currentTags, loading: false, error: null })
    stubApi.tags.list.mockImplementation(async () => ({ ok: true as const, data: currentTags }))
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () => {
      root?.render(
        <TagFilter selectedTagIds={[]} onFilterChange={() => undefined} onColorMapChange={onMap} />
      )
    })
    expect(onMap).toHaveBeenCalled()
    const map = onMap.mock.calls[0]?.[0] as Map<string, string | null>
    expect(map.get('甲')).toBeNull()
    expect(map.get('乙')).toBe('#0ea5e9')
  })
})
