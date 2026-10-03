// @vitest-environment jsdom
/**
 * [批 tagrows 2026-10-03] TagDropdown 行三段结构+行内编辑（always-active）。
 * 票面（用户原话）：「标签展开列表的每一行建议显示为待勾选框、名称框、颜色框，
 * 名称和颜色均可直接编辑，编辑后点保存即可，不慎点到时失焦即可恢复，勾选逻辑
 * 只由待勾选框负责。」
 *
 * 覆盖：勾选独占（checkbox role=checkbox aria-checked——名称/颜色区点击零勾选
 * 负锚）；名称行内编辑（预填全选/Enter=保存/✓ 钮=保存/Esc=取消/失焦=恢复原值
 * 【与批 A 三键范式失焦=提交相反——票面明文，锚注差异防范式误统一】/组词 Enter
 * no-op（INV-85）/空白与同名 no-op/失败 toast 保持开/busy 飞行中失焦不恢复）；
 * 颜色行内色板（预设+恢复默认/点色=保存/Esc 关不改/点外关不改/busy 中 Esc 禁关）。
 * 写路径全走 tags.store renameTag/setTagColor（链式 refresh 单一数据源自愈）。
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

type TagRow = { id: string; name: string; paperCount: number; color: string | null }

let root: Root | null = null
let host: HTMLDivElement | null = null
let tagsData: TagRow[] = []

function tag(id: string, name: string, paperCount: number, color: string | null = null): TagRow {
  return { id, name, paperCount, color }
}

async function renderDropdown(
  selectedTagIds: string[],
  onFilterChange: (ids: string[]) => void,
  onMutated?: () => void
): Promise<void> {
  useTagsStore.setState({ tags: tagsData, loading: false, error: null })
  stubApi.tags.list.mockImplementation(async () => ({ ok: true as const, data: tagsData }))
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

function ddButton(): HTMLButtonElement | undefined {
  return [...(host?.querySelectorAll('button') ?? [])].find((b) =>
    (b.textContent ?? '').replace(/\s+/g, ' ').startsWith('标签')
  )
}

async function openPanel(): Promise<void> {
  if (host?.querySelector('.lib-dd-panel')) return
  const btn = ddButton()
  expect(btn, '下拉钮在场').toBeDefined()
  await act(async () => {
    btn!.click()
  })
}

/** 面板行容器（.lib-dd-row——按名格 .lib-dd-nm 精确匹配防计数粘名） */
function row(name: string): HTMLElement | undefined {
  return [...(host?.querySelectorAll<HTMLElement>('.lib-dd-row') ?? [])].find(
    (r) => r.querySelector('.lib-dd-nm')?.textContent === name
  )
}

function checkbox(name: string): HTMLButtonElement | undefined {
  return row(name)?.querySelector<HTMLButtonElement>('[role="checkbox"]') ?? undefined
}

async function clickCheckbox(name: string): Promise<void> {
  const cb = checkbox(name)
  expect(cb, `行勾选框存在：${name}`).toBeDefined()
  await act(async () => {
    cb!.click()
  })
}

/** 行内编辑 input（编辑态同时刻唯一——.lib-dd-nm 已被替换，无法按行名定位） */
function editInput(): HTMLInputElement | null {
  return host?.querySelector('.lib-dd-row input') ?? null
}

async function clickName(name: string): Promise<HTMLInputElement> {
  const btn = row(name)?.querySelector<HTMLButtonElement>('.lib-dd-nm-btn')
  expect(btn, `行名称区存在：${name}`).toBeDefined()
  await act(async () => {
    btn!.click()
  })
  // 编辑态行内 .lib-dd-nm 已被 input 替换——行内编辑同时刻唯一，全局定位
  const input = editInput()
  expect(input, '行内编辑输入在场').not.toBeNull()
  return input as HTMLInputElement
}

async function clickDot(name: string): Promise<void> {
  const dot = row(name)?.querySelector<HTMLButtonElement>('.lib-dd-dot')
  expect(dot, `行颜色框存在：${name}`).toBeDefined()
  await act(async () => {
    dot!.click()
  })
}

/** 受控 input 打字（原生 setter+input 事件——jsdom 标准法） */
async function setType(input: HTMLInputElement, text: string): Promise<void> {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  await act(async () => {
    setter?.call(input, text)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function pressKey(input: HTMLInputElement, key: string, isComposing = false): Promise<void> {
  await act(async () => {
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, isComposing })
    )
  })
}

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
}

function buttonByLabel(label: string, scope?: ParentNode): HTMLButtonElement | undefined {
  const base: ParentNode = scope ?? host ?? document
  return [...base.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === label)
}

beforeEach(() => {
  vi.clearAllMocks()
  toastSpy.mockClear()
  tagsData = [tag('t-1', '甲', 2), tag('t-2', '乙', 1, '#0ea5e9')]
  stubApi.tags.rename.mockImplementation(async ({ name }: { name: string }) => {
    tagsData = tagsData.map((t) => (t.id === 't-1' ? { ...t, name } : t))
    return { ok: true as const, data: { id: 't-1', name } }
  })
  stubApi.tags.setColor.mockImplementation(async ({ color }: { color: string | null }) => {
    tagsData = tagsData.map((t) => (t.id === 't-1' ? { ...t, color } : t))
    return { ok: true as const, data: { id: 't-1', name: '甲', color } }
  })
})

afterEach(async () => {
  await act(async () => {
    root?.unmount()
  })
  host?.remove()
  root = null
  host = null
})

describe('批 tagrows 行三段结构与勾选独占', () => {
  it('勾选框=role=checkbox aria-checked：点击切换筛选；点击名称区/颜色框零勾选（负锚）', async () => {
    const onFilterChange = vi.fn()
    await renderDropdown(['t-1'], onFilterChange)
    await openPanel()
    expect(checkbox('甲')?.getAttribute('role')).toBe('checkbox')
    expect(checkbox('甲')?.getAttribute('aria-checked')).toBe('true')
    expect(checkbox('乙')?.getAttribute('aria-checked')).toBe('false')
    // 勾选只归 checkbox：名称区点击=进编辑（零筛选）
    await clickName('甲')
    expect(onFilterChange).not.toHaveBeenCalled()
    await pressKey(editInput()!, 'Escape')
    // 颜色框点击=开色板（零筛选）
    await clickDot('甲')
    expect(onFilterChange).not.toHaveBeenCalled()
    expect(host?.querySelector('.lib-dd-pop'), '行内色板在场').not.toBeNull()
  })

  it('checkbox 点击切换载荷（添加向）', async () => {
    const onFilterChange = vi.fn()
    await renderDropdown([], onFilterChange)
    await openPanel()
    await clickCheckbox('甲')
    expect(onFilterChange).toHaveBeenLastCalledWith(['t-1'])
  })

  it('勾选独占负锚补全：计数区/行空白区（容器本体）/颜色框三路点击零筛选（RR1-W1/W6）', async () => {
    const onFilterChange = vi.fn()
    await renderDropdown([], onFilterChange)
    await openPanel()
    // ① 计数区（.lib-dd-ct——无操作面）
    const ct = row('甲')?.querySelector('.lib-dd-ct')
    expect(ct, '计数区在场').not.toBeNull()
    await act(async () => {
      ct!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onFilterChange, '计数区点击零筛选').not.toHaveBeenCalled()
    // ② 行空白区（容器本体为 target——三段钮之外的留白区）
    await act(async () => {
      row('甲')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onFilterChange, '行空白区点击零筛选').not.toHaveBeenCalled()
    // ③ 颜色框（开色板路径——与首用例 clickDot 负锚双证）
    await clickDot('甲')
    expect(onFilterChange, '颜色框点击零筛选').not.toHaveBeenCalled()
    await act(async () => {
      host?.querySelector('.lib-dd-pop-veil')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onFilterChange, '色板关闭零筛选').not.toHaveBeenCalled()
  })
})

describe('批 tagrows 名称行内编辑', () => {
  it('点击名称区→行内 input 预填现名+聚焦全选；Enter=保存（rename 通道+onMutated+行名更新）', async () => {
    const onMutated = vi.fn()
    await renderDropdown([], vi.fn(), onMutated)
    await openPanel()
    const input = await clickName('甲')
    expect(input.value).toBe('甲')
    expect(input.selectionStart).toBe(0)
    expect(input.selectionEnd).toBe('甲'.length)
    await setType(input, '水质监测')
    await pressKey(input, 'Enter')
    await flush()
    expect(stubApi.tags.rename).toHaveBeenCalledWith({ tagId: 't-1', name: '水质监测' })
    expect(onMutated).toHaveBeenCalledTimes(1)
    expect(editInput(), '保存后编辑态退出').toBeNull()
    expect(row('水质监测'), '链式 refresh 后行名更新').toBeDefined()
  })

  it('编辑态行内确认钮（✓ 图标批 B 范式，title=保存）：点击=保存', async () => {
    const onMutated = vi.fn()
    await renderDropdown([], vi.fn(), onMutated)
    await openPanel()
    const input = await clickName('甲')
    await setType(input, '乙二')
    const ok = host?.querySelector<HTMLButtonElement>('.lib-dd-ok')
    expect(ok, '确认钮在场').not.toBeNull()
    expect(ok?.getAttribute('title')).toBe('保存')
    expect(ok?.textContent).toContain('保存')
    await act(async () => {
      ok!.click()
    })
    await flush()
    expect(stubApi.tags.rename).toHaveBeenCalledWith({ tagId: 't-1', name: '乙二' })
    expect(onMutated).toHaveBeenCalledTimes(1)
    expect(editInput()).toBeNull()
  })

  it('Esc=取消恢复：改名后 Esc→rename 零调用+行名=原值+面板保持开', async () => {
    await renderDropdown([], vi.fn())
    await openPanel()
    const input = await clickName('甲')
    await setType(input, '乙二')
    await pressKey(input, 'Escape')
    expect(stubApi.tags.rename).not.toHaveBeenCalled()
    expect(editInput(), 'Esc 后编辑态退出').toBeNull()
    expect(row('甲'), '行名=原值恢复').toBeDefined()
    expect(host?.querySelector('.lib-dd-panel'), '面板保持开').not.toBeNull()
  })

  it('失焦=恢复原值不保存（票面「不慎点到时失焦即可恢复」——与批 A 失焦=提交相反锚）', async () => {
    await renderDropdown([], vi.fn())
    await openPanel()
    const input = await clickName('甲')
    await setType(input, '乙二')
    await act(async () => {
      input.blur()
    })
    expect(stubApi.tags.rename).not.toHaveBeenCalled()
    expect(editInput(), '失焦后编辑态退出').toBeNull()
    expect(row('甲'), '行名=原值恢复').toBeDefined()
    expect(host?.querySelector('.lib-dd-panel'), '面板保持开').not.toBeNull()
  })

  it('IME 组词期 Enter（isComposing=true）→ no-op（INV-85 同类面守卫）', async () => {
    await renderDropdown([], vi.fn())
    await openPanel()
    const input = await clickName('甲')
    await setType(input, '组词中')
    await pressKey(input, 'Enter', true)
    expect(stubApi.tags.rename).not.toHaveBeenCalled()
    expect(editInput(), '组词期 Enter 不退出编辑').not.toBeNull()
  })

  it('空白名/同名→退出编辑零通道调用', async () => {
    await renderDropdown([], vi.fn())
    await openPanel()
    let input = await clickName('甲')
    await setType(input, '   ')
    await pressKey(input, 'Enter')
    expect(stubApi.tags.rename).not.toHaveBeenCalled()
    expect(editInput()).toBeNull()
    input = await clickName('甲')
    await setType(input, '甲')
    await pressKey(input, 'Enter')
    expect(stubApi.tags.rename).not.toHaveBeenCalled()
    expect(editInput()).toBeNull()
  })

  it('保存失败：toast+编辑态保持开（S6 同型）', async () => {
    stubApi.tags.rename.mockRejectedValueOnce(new Error('boom'))
    await renderDropdown([], vi.fn())
    await openPanel()
    const input = await clickName('甲')
    await setType(input, '乙二')
    await pressKey(input, 'Enter')
    await flush()
    expect(toastSpy).toHaveBeenCalledWith('标签操作失败', 'error')
    expect(editInput(), '失败后编辑保持开').not.toBeNull()
  })

  it('busy 飞行中失焦不恢复（N1 同型）：resolve 成功后才退出编辑+onMutated', async () => {
    const onMutated = vi.fn()
    let resolveRename!: (v: unknown) => void
    stubApi.tags.rename.mockImplementation(() => new Promise((r) => { resolveRename = r }))
    await renderDropdown([], vi.fn(), onMutated)
    await openPanel()
    const input = await clickName('甲')
    await setType(input, '乙二')
    await pressKey(input, 'Enter')
    await act(async () => {
      input.blur()
    })
    expect(editInput(), 'busy 失焦不恢复编辑态').not.toBeNull()
    await act(async () => {
      // 模拟后端落库（deferred mock 不走 beforeEach 改写链）——refresh 取到新名
      tagsData = tagsData.map((t) => (t.id === 't-1' ? { ...t, name: '乙二' } : t))
      resolveRename({ ok: true, data: { id: 't-1', name: '乙二' } })
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(editInput(), 'resolve 成功后退出编辑').toBeNull()
    expect(onMutated).toHaveBeenCalledTimes(1)
    // RR1-W3 收敛出口断言：busy 成功落定=编辑态退出+值随 store 收敛（链式
    // refresh 后行名=新名——挂起态不悬空）
    expect(row('乙二'), '值随 store 收敛（行名=新名）').toBeDefined()
  })
})

describe('批 tagrows 颜色行内色板', () => {
  it('点击颜色框→色板在场（8 预设+恢复默认）；Esc 关不改+面板保持开', async () => {
    await renderDropdown([], vi.fn())
    await openPanel()
    await clickDot('甲')
    const pop = host?.querySelector('.lib-dd-pop')
    expect(pop, '行内色板在场').not.toBeNull()
    for (const c of TAG_COLOR_PRESETS) {
      expect(buttonByLabel(`预设颜色 ${c}`), `预设 swatch ${c} 在场`).toBeDefined()
    }
    expect(buttonByLabel('恢复默认')).toBeDefined()
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(host?.querySelector('.lib-dd-pop'), 'Esc 关色板').toBeNull()
    expect(host?.querySelector('.lib-dd-panel'), '面板保持开（Esc 分层级）').not.toBeNull()
    expect(stubApi.tags.setColor).not.toHaveBeenCalled()
  })

  it('点色=保存：setColor 逐参+onMutated+色板关+色框着色（链式 refresh）', async () => {
    const onMutated = vi.fn()
    await renderDropdown([], vi.fn(), onMutated)
    await openPanel()
    await clickDot('甲')
    await act(async () => {
      buttonByLabel(`预设颜色 ${TAG_COLOR_PRESETS[0]}`)!.click()
    })
    await flush()
    expect(stubApi.tags.setColor).toHaveBeenCalledWith({ tagId: 't-1', color: TAG_COLOR_PRESETS[0] })
    expect(onMutated).toHaveBeenCalledTimes(1)
    expect(host?.querySelector('.lib-dd-pop'), '保存后色板关').toBeNull()
    expect(row('甲')?.querySelector<HTMLElement>('.lib-dd-dot')?.style.background).not.toBe('')
  })

  it('恢复默认路：setColor(tagId, null)', async () => {
    await renderDropdown([], vi.fn())
    await openPanel()
    await clickDot('甲')
    await act(async () => {
      buttonByLabel('恢复默认')!.click()
    })
    await flush()
    expect(stubApi.tags.setColor).toHaveBeenCalledWith({ tagId: 't-1', color: null })
  })

  it('点外（色板遮罩）关不改：零 setColor+面板保持开', async () => {
    await renderDropdown([], vi.fn())
    await openPanel()
    await clickDot('甲')
    await act(async () => {
      host?.querySelector('.lib-dd-pop-veil')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(host?.querySelector('.lib-dd-pop')).toBeNull()
    expect(host?.querySelector('.lib-dd-panel'), '面板保持开').not.toBeNull()
    expect(stubApi.tags.setColor).not.toHaveBeenCalled()
  })

  it('保存失败面（RR1-W2）：toast 错误可见+busy 解除可关闭（色板保持开 S6 同型）', async () => {
    stubApi.tags.setColor.mockRejectedValueOnce(new Error('boom'))
    await renderDropdown([], vi.fn())
    await openPanel()
    await clickDot('甲')
    await act(async () => {
      buttonByLabel(`预设颜色 ${TAG_COLOR_PRESETS[1]}`)!.click()
    })
    await flush()
    expect(toastSpy).toHaveBeenCalledWith('标签操作失败', 'error')
    expect(host?.querySelector('.lib-dd-pop'), '失败后色板保持开').not.toBeNull()
    // busy 解除举证=遮罩可关（若 pending 未解除，requestClose 拦遮罩点击关不掉）
    await act(async () => {
      host?.querySelector('.lib-dd-pop-veil')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(host?.querySelector('.lib-dd-pop'), 'busy 解除后可关闭').toBeNull()
  })

  it('busy 飞行中 Esc 禁关（N1 同型）：resolve 成功后才关', async () => {
    let resolveSetColor!: (v: unknown) => void
    stubApi.tags.setColor.mockImplementation(() => new Promise((r) => { resolveSetColor = r }))
    await renderDropdown([], vi.fn())
    await openPanel()
    await clickDot('甲')
    await act(async () => {
      buttonByLabel(`预设颜色 ${TAG_COLOR_PRESETS[2]}`)!.click()
    })
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(host?.querySelector('.lib-dd-pop'), 'busy 中 Esc 不得关').not.toBeNull()
    await act(async () => {
      resolveSetColor({ ok: true, data: { id: 't-1', name: '甲', color: null } })
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(host?.querySelector('.lib-dd-pop'), 'resolve 后色板关').toBeNull()
  })
})
