// @vitest-environment jsdom
/**
 * [F-TAGS-01→F-UIRES-01 批 A U3] TagColorDialog + TagDropdown 着色面
 * （always-active）。入口迁=下拉行右键→颜色…；着色呈现迁=面板行色点
 * （.lib-dd-dot——chip inline 着色形态随 TagFilter 退役）。
 *
 * 覆盖：对话框控件面（预设 8 swatch+原生 input[type=color]+恢复默认；取消
 * 零写）；确定=setTagColor（store 命令型——链式 refresh）；失败保持开；
 * N1 busy 飞行中禁关；色点着色呈现（INV-86 三面之一——面板形态）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TAG_COLOR_PRESETS } from '../../../src/shared/constants'
import { makeApiStub, toastSpy } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  tags: { list: vi.fn(), rename: vi.fn(), merge: vi.fn(), delete: vi.fn(), setColor: vi.fn() }
})

import { TagDropdown } from '../../../src/renderer/features/tags/TagDropdown'
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
      <TagDropdown selectedTagIds={[]} onFilterChange={() => undefined} onMutated={onMutated} />
    )
  })
}

function buttonByText(text: string, scope?: ParentNode): HTMLButtonElement | undefined {
  const base: ParentNode = scope ?? host ?? document
  return [...base.querySelectorAll('button')].find((b) => (b.textContent ?? '').trim() === text)
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

function row(name: string): HTMLButtonElement | undefined {
  return [...(host?.querySelectorAll<HTMLButtonElement>('[role="menuitemcheckbox"]') ?? [])].find(
    (r) => r.querySelector('.lib-dd-nm')?.textContent === name
  )
}

/** 开面板→行右键→颜色…→对话框在场 */
async function openColorDialog(name: string): Promise<void> {
  const btn = buttonByText('标签')
  await act(async () => {
    btn?.click()
  })
  const r = row(name)
  expect(r, `面板行存在：${name}`).toBeDefined()
  await act(async () => {
    r!.dispatchEvent(
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

describe('F-TAGS-01 TagColorDialog —— 取色器（TagDropdown 入口承接）', () => {
  it('入口与控件面：行右键→颜色…→预设 8 swatch+原生 input[type=color]+「恢复默认」；取消零写', async () => {
    await renderFilter()
    await openColorDialog('甲')
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

  it('点预设 swatch→确定：setColor({tagId,color}) 逐参+onMutated(null)+关闭（链式 refresh）', async () => {
    const onMutated = vi.fn()
    await renderFilter(onMutated)
    await openColorDialog('甲')
    await click(buttonByLabel(`预设颜色 ${TAG_COLOR_PRESETS[0]}`), '第一预设')
    stubApi.tags.setColor.mockResolvedValue({
      ok: true as const,
      data: { id: 't-1', name: '甲', color: TAG_COLOR_PRESETS[0] }
    })
    await click(buttonByText('确定', dialog()!), '对话框·确定')
    expect(stubApi.tags.setColor).toHaveBeenCalledWith({ tagId: 't-1', color: TAG_COLOR_PRESETS[0] })
    expect(onMutated).toHaveBeenCalledTimes(1)
    expect(dialog()).toBeNull()
  })

  it('恢复默认→确定：setColor(tagId, null)=null 路', async () => {
    await renderFilter()
    await openColorDialog('乙')
    await click(buttonByText('恢复默认', dialog()!), '恢复默认')
    stubApi.tags.setColor.mockResolvedValue({ ok: true as const, data: { id: 't-2', name: '乙', color: null } })
    await click(buttonByText('确定', dialog()!), '对话框·确定')
    expect(stubApi.tags.setColor).toHaveBeenCalledWith({ tagId: 't-2', color: null })
    expect(dialog()).toBeNull()
  })

  it('自定义颜色路：input[type=color] change → 确定=自定义 hex', async () => {
    await renderFilter()
    await openColorDialog('甲')
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

  it('S6 失败：toast+对话框保持开（选择态保留）', async () => {
    await renderFilter()
    await openColorDialog('甲')
    await click(buttonByLabel(`预设颜色 ${TAG_COLOR_PRESETS[1]}`), '第二预设')
    stubApi.tags.setColor.mockResolvedValue({
      ok: false as const,
      error: { code: 'NOT_FOUND', message: '标签不存在' }
    })
    await click(buttonByText('确定', dialog()!), '对话框·确定')
    expect(toastSpy).toHaveBeenCalledWith('标签不存在', 'error')
    expect(dialog(), '失败后对话框保持开').not.toBeNull()
    expect(
      buttonByLabel(`预设颜色 ${TAG_COLOR_PRESETS[1]}`).getAttribute('aria-pressed'),
      '失败后选择态保留'
    ).toBe('true')
  })

  it('N1 busy 飞行中取消被阻断（按钮禁用+Esc onClose no-op），resolve 成功后才关', async () => {
    await renderFilter()
    await openColorDialog('甲')
    await click(buttonByLabel(`预设颜色 ${TAG_COLOR_PRESETS[2]}`), '第三预设')
    let resolveSetColor!: (v: unknown) => void
    stubApi.tags.setColor.mockImplementation(() => new Promise((r) => { resolveSetColor = r }))
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

describe('F-TAGS-01 TagDropdown 面板行色点（INV-86 着色面新形态）', () => {
  it('color 非空行=色点着色（.lib-dd-dot inline 背景）；null 行=零 inline', async () => {
    await renderFilter()
    await act(async () => {
      buttonByText('标签')?.click()
    })
    const colored = row('乙')
    const dot = colored?.querySelector<HTMLElement>('.lib-dd-dot')
    expect(dot, '色点在场').not.toBeNull()
    expect(dot?.style.background).toContain('14, 165, 233')
    const plain = row('甲')?.querySelector<HTMLElement>('.lib-dd-dot')
    expect(plain?.style.background).toBe('')
  })
})
