// @vitest-environment jsdom
/**
 * [批 tagrows→F-UIRES-03 B1 2026-10-05] TagDropdown 行结构+行编辑态
 * （always-active）。B1 批票面：行常态=[勾选框][椭圆 chip（自身色 18% 底+
 * 同色深阶字，null=TAG_COLOR_NONE_DISPLAY 默认灰系）][mono 计数][「编辑」钮]；
 * 编辑态=名称 input（预填全选）+色点阵（TAG_COLOR_PRESETS 8 圆点+「默认」点=
 * null——承接 TagColorPopover「恢复默认」〔F6+N10〕）+「保存」钮（dirty 启用）
 * +Esc 取消还原；无 autosave（失焦=恢复——批 tagrows 票面锚）；Enter=保存；
 * 校验承接 TagRenameDialog 规则（空白/同名拒绝+TAG_NAME_MAX）；busy 飞行守卫
 * （S8 双发/N1 飞行中失焦不恢复）；isComposing 守卫全域（INV-85——inlineKeyDown
 * /inline-keys 单源复用）。写路径全走 tags.store renameTag/setTagColor/deleteTag。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TAG_COLOR_PRESETS, TAG_COLOR_NONE_DISPLAY } from '../../../src/shared/constants'
import { TAG_NAME_MAX } from '../../../src/shared/models/tag'
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

/** 面板行容器（B1 行=勾选框+chip+计数+编辑钮——按 chip 名精确匹配防计数粘名） */
function row(name: string): HTMLElement | undefined {
  return [...(host?.querySelectorAll<HTMLElement>('.lib-dd-row') ?? [])].find(
    (r) => r.querySelector('.lib-dd-chip')?.textContent === name
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

/** 行内编辑 input（编辑态同时刻唯一——chip 已被替换，无法按行名定位） */
function editInput(): HTMLInputElement | null {
  return host?.querySelector('.lib-dd-row input') ?? null
}

/** 点「编辑」钮进入行编辑态 */
async function clickEdit(name: string): Promise<HTMLInputElement> {
  const btn = row(name)?.querySelector<HTMLButtonElement>('.lib-dd-edit-btn')
  expect(btn, `行编辑钮存在：${name}`).toBeDefined()
  await act(async () => {
    btn!.click()
  })
  const input = editInput()
  expect(input, '行编辑态输入在场').not.toBeNull()
  return input as HTMLInputElement
}

function saveButton(): HTMLButtonElement | null {
  return host?.querySelector<HTMLButtonElement>('.lib-dd-save') ?? null
}

/** 色点阵钮（编辑态 .lib-dd-dots 内） */
function dotByLabel(label: string): HTMLButtonElement | undefined {
  return [...(host?.querySelectorAll<HTMLButtonElement>('.lib-dd-dots button') ?? [])].find(
    (b) => b.getAttribute('aria-label') === label
  )
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

beforeEach(() => {
  vi.clearAllMocks()
  toastSpy.mockClear()
  tagsData = [tag('t-1', '甲', 2, '#0ea5e9'), tag('t-2', '乙', 1)]
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

describe('B1 行常态结构（chip 形态）与勾选独占', () => {
  it('行四段：勾选框 role=checkbox aria-checked+chip 名称+mono 计数+编辑钮；勾选只归 checkbox（chip/编辑钮/计数区/行空白四路点击零筛选）', async () => {
    const onFilterChange = vi.fn()
    await renderDropdown(['t-1'], onFilterChange)
    await openPanel()
    expect(checkbox('甲')?.getAttribute('role')).toBe('checkbox')
    expect(checkbox('甲')?.getAttribute('aria-checked')).toBe('true')
    expect(checkbox('乙')?.getAttribute('aria-checked')).toBe('false')
    expect(row('甲')?.querySelector('.lib-dd-chip')?.textContent).toBe('甲')
    expect(row('甲')?.textContent).toContain('2')
    expect(row('甲')?.querySelector('.lib-dd-edit-btn')?.textContent).toContain('编辑')
    // 勾选只归 checkbox：chip（span 非钮）点击零筛选
    await act(async () => {
      row('甲')?.querySelector('.lib-dd-chip')?.dispatchEvent(
        new MouseEvent('click', { bubbles: true })
      )
    })
    expect(onFilterChange, 'chip 点击零筛选').not.toHaveBeenCalled()
    // 计数区（无操作面）
    await act(async () => {
      row('甲')?.querySelector('.lib-dd-ct')?.dispatchEvent(
        new MouseEvent('click', { bubbles: true })
      )
    })
    expect(onFilterChange, '计数区点击零筛选').not.toHaveBeenCalled()
    // 行空白区（容器本体为 target）
    await act(async () => {
      row('甲')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onFilterChange, '行空白区点击零筛选').not.toHaveBeenCalled()
    // 编辑钮点击=进编辑（零筛选）
    await clickEdit('甲')
    expect(onFilterChange, '编辑钮点击零筛选').not.toHaveBeenCalled()
    await pressKey(editInput()!, 'Escape')
  })

  it('checkbox 点击切换载荷（添加向）', async () => {
    const onFilterChange = vi.fn()
    await renderDropdown([], onFilterChange)
    await openPanel()
    await clickCheckbox('甲')
    expect(onFilterChange).toHaveBeenLastCalledWith(['t-1'])
  })

  it('chip 着色公式（INV-86 域内单源）：有色行 inline 背景=自身色 18%（hex2e——jsdom 序列化 rgba）；null 行=TAG_COLOR_NONE_DISPLAY 默认灰系', async () => {
    // jsdom cssstyle 将 8 位 hex（#rrggbbaa）序列化为 rgba(r, g, b, a)——期望值
    // 由色值常量单源推导（hex→rgb 三元组+0.18 alpha）
    const rgba18 = (hex: string): string => {
      const n = hex.replace('#', '')
      const parts = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16))
      return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, 0.18)`
    }
    await renderDropdown([], vi.fn())
    await openPanel()
    const colored = row('甲')?.querySelector<HTMLElement>('.lib-dd-chip')
    expect(colored?.style.background).toBe(rgba18('#0ea5e9'))
    expect(colored?.style.color).toContain('#0ea5e9')
    const plain = row('乙')?.querySelector<HTMLElement>('.lib-dd-chip')
    expect(plain?.style.background).toBe(rgba18(TAG_COLOR_NONE_DISPLAY))
    expect(plain?.style.color).toContain(TAG_COLOR_NONE_DISPLAY)
  })
})

describe('B1 行编辑态（「编辑」钮=唯一编辑入口）', () => {
  it('进编辑：input 预填现名+聚焦全选+maxLength=TAG_NAME_MAX；保存钮禁用（零 dirty）', async () => {
    await renderDropdown([], vi.fn())
    await openPanel()
    const input = await clickEdit('甲')
    expect(input.value).toBe('甲')
    expect(input.selectionStart).toBe(0)
    expect(input.selectionEnd).toBe('甲'.length)
    expect(input.maxLength).toBe(TAG_NAME_MAX)
    expect(saveButton()?.disabled, '零 dirty=保存禁用').toBe(true)
  })

  it('dirty 启用矩阵：改名→启用；改回原名→禁用；仅改色→启用；空白名恒禁用（TagRenameDialog 校验承接）', async () => {
    await renderDropdown([], vi.fn())
    await openPanel()
    let input = await clickEdit('甲')
    await setType(input, '水质监测')
    expect(saveButton()?.disabled, '名称变=dirty 启用').toBe(false)
    await setType(input, '甲')
    expect(saveButton()?.disabled, '改回原名=零 dirty 禁用').toBe(true)
    await setType(input, '   ')
    expect(saveButton()?.disabled, '空白名恒禁用').toBe(true)
    await pressKey(input, 'Enter')
    expect(editInput(), '空白名 Enter=退出编辑零调用').toBeNull()
    // 仅色变路：有色标签改默认点=dirty
    input = await clickEdit('甲')
    expect(saveButton()?.disabled).toBe(true)
    await act(async () => {
      dotByLabel('默认')!.click()
    })
    expect(saveButton()?.disabled, '仅色变=dirty 启用').toBe(false)
    await pressKey(editInput()!, 'Escape')
  })

  it('Enter=保存：rename 通道+onMutated+行名更新（链式 refresh 后 chip 名更新）', async () => {
    const onMutated = vi.fn()
    await renderDropdown([], vi.fn(), onMutated)
    await openPanel()
    const input = await clickEdit('甲')
    await setType(input, '水质监测')
    await pressKey(input, 'Enter')
    await flush()
    expect(stubApi.tags.rename).toHaveBeenCalledWith({ tagId: 't-1', name: '水质监测' })
    expect(stubApi.tags.setColor).not.toHaveBeenCalled()
    expect(onMutated).toHaveBeenCalledTimes(1)
    expect(editInput(), '保存后编辑态退出').toBeNull()
    expect(row('水质监测'), '链式 refresh 后行名更新').toBeDefined()
  })

  it('「保存」钮点击=保存（同 Enter 路）', async () => {
    const onMutated = vi.fn()
    await renderDropdown([], vi.fn(), onMutated)
    await openPanel()
    const input = await clickEdit('甲')
    await setType(input, '乙二')
    await act(async () => {
      saveButton()!.click()
    })
    await flush()
    expect(stubApi.tags.rename).toHaveBeenCalledWith({ tagId: 't-1', name: '乙二' })
    expect(onMutated).toHaveBeenCalledTimes(1)
    expect(editInput()).toBeNull()
  })

  it('仅色变保存：setColor 单通道（rename 零调用）', async () => {
    const onMutated = vi.fn()
    await renderDropdown([], vi.fn(), onMutated)
    await openPanel()
    await clickEdit('甲')
    await act(async () => {
      dotByLabel(`预设颜色 ${TAG_COLOR_PRESETS[1]}`)!.click()
    })
    await act(async () => {
      saveButton()!.click()
    })
    await flush()
    expect(stubApi.tags.setColor).toHaveBeenCalledWith({ tagId: 't-1', color: TAG_COLOR_PRESETS[1] })
    expect(stubApi.tags.rename).not.toHaveBeenCalled()
    expect(onMutated).toHaveBeenCalledTimes(1)
    expect(editInput()).toBeNull()
  })

  it('名+色双变：rename→setColor 双通道', async () => {
    await renderDropdown([], vi.fn())
    await openPanel()
    const input = await clickEdit('甲')
    await setType(input, '新甲')
    await act(async () => {
      dotByLabel(`预设颜色 ${TAG_COLOR_PRESETS[2]}`)!.click()
    })
    await pressKey(input, 'Enter')
    await flush()
    expect(stubApi.tags.rename).toHaveBeenCalledWith({ tagId: 't-1', name: '新甲' })
    expect(stubApi.tags.setColor).toHaveBeenCalledWith({ tagId: 't-1', color: TAG_COLOR_PRESETS[2] })
  })

  it('色点阵：8 预设+「默认」=9 点；aria-pressed 选中态；默认点=null 语义（保存 setColor(tagId,null)）', async () => {
    await renderDropdown([], vi.fn())
    await openPanel()
    await clickEdit('甲')
    const dots = [...(host?.querySelectorAll('.lib-dd-dots button') ?? [])]
    expect(dots, '9 点计数（8 预设+默认）').toHaveLength(9)
    for (const c of TAG_COLOR_PRESETS) {
      expect(dotByLabel(`预设颜色 ${c}`), `预设圆点 ${c} 在场`).toBeDefined()
    }
    const def = dotByLabel('默认')
    expect(def, '「默认」点在场').toBeDefined()
    expect(
      dotByLabel(`预设颜色 #0ea5e9`)?.getAttribute('aria-pressed'),
      '现色预设=选中态'
    ).toBe('true')
    expect(def?.getAttribute('aria-pressed'), 'null 非选中').toBe('false')
    await act(async () => {
      def!.click()
    })
    expect(def?.getAttribute('aria-checked') ?? def?.getAttribute('aria-pressed'), '点默认后=选中').toBe('true')
    await act(async () => {
      saveButton()!.click()
    })
    await flush()
    expect(stubApi.tags.setColor).toHaveBeenCalledWith({ tagId: 't-1', color: null })
  })

  it('Esc=取消还原：改名+改色后 Esc→零通道调用+行回常态+面板保持开', async () => {
    await renderDropdown([], vi.fn())
    await openPanel()
    const input = await clickEdit('甲')
    await setType(input, '乙二')
    await act(async () => {
      dotByLabel(`预设颜色 ${TAG_COLOR_PRESETS[0]}`)!.click()
    })
    await pressKey(input, 'Escape')
    expect(stubApi.tags.rename).not.toHaveBeenCalled()
    expect(stubApi.tags.setColor).not.toHaveBeenCalled()
    expect(editInput(), 'Esc 后编辑态退出').toBeNull()
    expect(row('甲'), '行名=原值恢复（chip 常态）').toBeDefined()
    expect(host?.querySelector('.lib-dd-panel'), '面板保持开').not.toBeNull()
  })

  it('RR1-W1 skipBlur 跨编辑会话清零：编辑→Esc→重进编辑→点行外失焦=还原原值+退出编辑态', async () => {
    await renderDropdown([], vi.fn())
    await openPanel()
    let input = await clickEdit('甲')
    await setType(input, '乙二')
    await pressKey(input, 'Escape') // Esc 退编辑（skipBlur 武装→unmount 不触发 blur=滞留缺陷面）
    expect(editInput(), 'Esc 后编辑态退出').toBeNull()
    // 重进编辑（新会话）→首次行外失焦须照常还原（标志已随会话重置）
    input = await clickEdit('甲')
    await setType(input, '乙二')
    await act(async () => {
      input.blur()
    })
    expect(stubApi.tags.rename, '重进后首次失焦=恢复不保存').not.toHaveBeenCalled()
    expect(editInput(), '重进后首次失焦=退出编辑态（Esc 残留标志已清）').toBeNull()
    expect(row('甲'), '行名=原值恢复').toBeDefined()
    expect(host?.querySelector('.lib-dd-panel'), '面板保持开').not.toBeNull()
  })

  it('同名 Enter=退出编辑零通道调用（批 tagrows 同名预检承接——!dirty 短路〔RR1-W4b〕）', async () => {
    await renderDropdown([], vi.fn())
    await openPanel()
    const input = await clickEdit('甲')
    await setType(input, '乙二')
    await setType(input, '甲') // 改回同名（色未动）=零 dirty
    await pressKey(input, 'Enter')
    expect(stubApi.tags.rename, '同名=rename 零调用').not.toHaveBeenCalled()
    expect(stubApi.tags.setColor, '同色=setColor 零调用').not.toHaveBeenCalled()
    expect(editInput(), '同名=退出编辑').toBeNull()
    expect(row('甲')).toBeDefined()
  })

  it('失焦=恢复原值不保存（无 autosave——批 tagrows「不慎点到失焦即恢复」锚承接）', async () => {
    await renderDropdown([], vi.fn())
    await openPanel()
    const input = await clickEdit('甲')
    await setType(input, '乙二')
    await act(async () => {
      input.blur()
    })
    expect(stubApi.tags.rename).not.toHaveBeenCalled()
    expect(editInput(), '失焦后编辑态退出').toBeNull()
    expect(row('甲'), '行名=原值恢复').toBeDefined()
    expect(host?.querySelector('.lib-dd-panel'), '面板保持开').not.toBeNull()
  })

  it('焦点行内转移不还原：input 失焦 relatedTarget 在行内（点色点）→编辑保持（无 autosave 不吞行内操作）', async () => {
    await renderDropdown([], vi.fn())
    await openPanel()
    const input = await clickEdit('甲')
    await setType(input, '乙二')
    const dot = dotByLabel(`预设颜色 ${TAG_COLOR_PRESETS[0]}`)!
    await act(async () => {
      input.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: dot }))
    })
    expect(editInput(), '行内转移焦点=编辑保持').not.toBeNull()
    expect(stubApi.tags.rename, '行内转移零保存').not.toHaveBeenCalled()
    await pressKey(editInput()!, 'Escape')
  })

  it('IME 组词期 Enter（isComposing=true）→ no-op（INV-85——inlineKeyDown 单源守卫）', async () => {
    await renderDropdown([], vi.fn())
    await openPanel()
    const input = await clickEdit('甲')
    await setType(input, '组词中')
    await pressKey(input, 'Enter', true)
    expect(stubApi.tags.rename).not.toHaveBeenCalled()
    expect(editInput(), '组词期 Enter 不退出编辑').not.toBeNull()
  })

  it('保存失败：toast+编辑态保持开（S6 同型）', async () => {
    stubApi.tags.rename.mockRejectedValueOnce(new Error('boom'))
    await renderDropdown([], vi.fn())
    await openPanel()
    const input = await clickEdit('甲')
    await setType(input, '乙二')
    await pressKey(input, 'Enter')
    await flush()
    expect(toastSpy).toHaveBeenCalledWith('标签操作失败', 'error')
    expect(editInput(), '失败后编辑保持开').not.toBeNull()
  })

  it('S8 busy 守卫：保存双发仅一次 rename；N1 飞行中失焦不恢复；resolve 成功后退出+onMutated', async () => {
    const onMutated = vi.fn()
    let resolveRename!: (v: unknown) => void
    stubApi.tags.rename.mockImplementation(() => new Promise((r) => { resolveRename = r }))
    await renderDropdown([], vi.fn(), onMutated)
    await openPanel()
    const input = await clickEdit('甲')
    await setType(input, '乙二')
    await pressKey(input, 'Enter')
    // S8：飞行中再点保存钮=零重复提交
    await act(async () => {
      saveButton()?.click()
    })
    expect(stubApi.tags.rename).toHaveBeenCalledTimes(1)
    // N1：飞行中失焦不恢复
    await act(async () => {
      input.blur()
    })
    expect(editInput(), 'busy 失焦不恢复编辑态').not.toBeNull()
    // RR1-W4a：busy 飞行中 Esc 禁退（requestClose no-op——「busy 飞行中 Esc 禁关」
    // 声明由本例承载：编辑态保持=input 在场举证）
    await pressKey(editInput()!, 'Escape')
    expect(editInput(), 'busy 中 Esc 不得退编辑').not.toBeNull()
    await act(async () => {
      tagsData = tagsData.map((t) => (t.id === 't-1' ? { ...t, name: '乙二' } : t))
      resolveRename({ ok: true, data: { id: 't-1', name: '乙二' } })
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(editInput(), 'resolve 成功后退出编辑').toBeNull()
    expect(onMutated).toHaveBeenCalledTimes(1)
    expect(row('乙二'), '值随 store 收敛（行名=新名）').toBeDefined()
  })
})
