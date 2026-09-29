// @vitest-environment jsdom
/**
 * [F-TAGS-01] TagEditor 三路提交矩阵（always-active——K3 威胁不经 guardedDescribe）。
 *
 * R4 状态/迁移表全格落测（宪法「状态机前置」）：
 * - 输入态 input ∈ {'', text}（text 含空白非空串）× busy ∈ {true,false} ×
 *   composing ∈ {true,false}；三提交路=Enter/blur/「添加」按钮
 * - Enter：空白→no-op；busy→no-op；nativeEvent.isComposing→no-op（R0 根因②
 *   的合成事件复现锚——真 IME 无从在 jsdom 合成，composition 事件对承担
 *   复现/证伪）；否则 createAndAttach
 * - blur：busy→no-op；composing（onCompositionStart/End 维护 ref）→no-op；
 *   空白→no-op；否则 createAndAttach
 * - 「添加」按钮（aria-label="添加标签"，busy 禁用）与建议按钮：
 *   onMouseDown preventDefault（阻焦点转移=不触发 blur——双提交确定性解）
 * - 跨格序列：Enter 成功→input=''→后继 blur no-op；Enter 失败→input 保留→
 *   按钮=显式重试路径；busy 期间三路全 no-op；composing 期 Enter/blur 均 no-op
 * - 三路共用 createAndAttach（已挂接同名=info toast 路，零 IPC）
 * - chip 着色：store color 查表（非空→背景 hex22/边框 1px solid hex66；
 *   null→现状 accent-soft 零变——INV-86 三面同源消费）
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, toastSpy } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  tags: { list: vi.fn(), upsert: vi.fn(), attach: vi.fn(), detach: vi.fn() }
})

import { TagEditor } from '../../../src/renderer/features/tags/TagEditor'
import { useTagsStore } from '../../../src/renderer/features/tags/tags.store'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let host: HTMLDivElement | null = null

async function renderEditor(
  attached: Array<{ id: string; name: string }>,
  storeTags: Array<{ id: string; name: string; paperCount: number; color?: string | null }> = []
): Promise<void> {
  useTagsStore.setState({
    tags: storeTags.map((t) => ({ id: t.id, name: t.name, paperCount: t.paperCount, color: t.color ?? null })),
    loading: false,
    error: null
  })
  stubApi.tags.list.mockImplementation(async () => ({ ok: true as const, data: useTagsStore.getState().tags }))
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(<TagEditor paperId="p-1" tags={attached} onChanged={() => undefined} />)
  })
}

function inputEl(): HTMLInputElement {
  const el = host?.querySelector('input[aria-label="新增标签"]')
  if (!(el instanceof HTMLInputElement)) throw new Error('新增标签输入框不在场')
  return el
}

function addBtn(): HTMLButtonElement {
  const b = [...host!.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === '添加标签')
  if (!(b instanceof HTMLButtonElement)) throw new Error('「添加标签」按钮不在场')
  return b
}

/** 受控 input 打字（原生 setter+input 事件——React 受控组件 jsdom 标准法） */
async function setType(text: string): Promise<void> {
  const input = inputEl()
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  await act(async () => {
    setter?.call(input, text)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

/** Enter 键（isComposing 可注入——jsdom KeyboardEventInit 支持，探针在档） */
async function pressEnter(isComposing = false): Promise<void> {
  await act(async () => {
    inputEl().dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, isComposing })
    )
  })
}

/** 失焦路（React onBlur=focusout 委托——jsdom 冒泡派发） */
async function blurInput(): Promise<void> {
  await act(async () => {
    inputEl().dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
  })
}

async function composeStart(): Promise<void> {
  await act(async () => {
    inputEl().dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
  })
}

async function composeEnd(): Promise<void> {
  await act(async () => {
    inputEl().dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))
  })
}

/** mousedown+click 全序列（真浏览器按钮语义——preventDefault 断焦点不转移） */
async function mouseClick(btn: HTMLButtonElement): Promise<void> {
  await act(async () => {
    const md = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    btn.dispatchEvent(md)
    expect(md.defaultPrevented, 'mousedown 已 preventDefault（阻焦点转移=不触发 blur）').toBe(true)
    btn.click()
  })
}

/** upsert+attach 成功对（默认即时；可控挂起见 controlledUpsert） */
function okUpsert(): void {
  stubApi.tags.upsert.mockImplementation(async () => ({ ok: true as const, data: { id: 't-new', name: 'x' } }))
  stubApi.tags.attach.mockImplementation(async () => ({ ok: true as const, data: { ok: true } }))
}

/** 可控挂起 upsert（busy 期矩阵用——resolve 前 busy=true） */
function controlledUpsert(): (v: { ok: true; data: { id: string; name: string } }) => void {
  let resolve!: (v: { ok: true; data: { id: string; name: string } }) => void
  stubApi.tags.upsert.mockImplementation(
    () => new Promise((r) => { resolve = r })
  )
  stubApi.tags.attach.mockImplementation(async () => ({ ok: true as const, data: { ok: true } }))
  return (v) => resolve(v)
}

/** 已挂接 chip span（aria-label=移除标签 <名> 的按钮之父） */
function chipSpan(name: string): HTMLSpanElement {
  const btn = [...host!.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === `移除标签 ${name}`)
  const span = btn?.parentElement
  if (!(span instanceof HTMLSpanElement)) throw new Error(`chip「${name}」不在场`)
  return span
}

beforeEach(() => {
  vi.clearAllMocks()
  okUpsert()
})

afterEach(async () => {
  await act(async () => {
    root?.unmount()
  })
  host?.remove()
  root = null
  host = null
})

describe('F-TAGS-01 TagEditor —— 三路提交矩阵', () => {
  describe('Enter 路', () => {
    it('输入+Enter（非 composing）：createAndAttach 一次，成功后 input 清空', async () => {
      await renderEditor([])
      await setType('水质')
      await pressEnter()
      expect(stubApi.tags.upsert).toHaveBeenCalledTimes(1)
      expect(stubApi.tags.upsert).toHaveBeenCalledWith({ name: '水质' })
      expect(stubApi.tags.attach).toHaveBeenCalledWith({ paperId: 'p-1', tagId: 't-new' })
      expect(inputEl().value).toBe('')
    })

    it('空白 input（含纯空格）+Enter → no-op（去空格格）', async () => {
      await renderEditor([])
      await setType('   ')
      await pressEnter()
      expect(stubApi.tags.upsert).not.toHaveBeenCalled()
    })

    it('IME 组词期 Enter（isComposing=true）→ no-op（R0 根因②合成复现锚）', async () => {
      await renderEditor([])
      await setType('水质')
      await pressEnter(true)
      expect(stubApi.tags.upsert).not.toHaveBeenCalled()
    })

    it('busy 飞行中再 Enter → no-op（busy 互斥格）', async () => {
      await renderEditor([])
      const resolve = controlledUpsert()
      await setType('水质')
      await pressEnter()
      await setType('水质') // busy 期输入态重置后的再次尝试（input 未清）
      await pressEnter()
      expect(stubApi.tags.upsert).toHaveBeenCalledTimes(1)
      await act(async () => {
        resolve({ ok: true, data: { id: 't-new', name: '水质' } })
        await new Promise((r) => setTimeout(r, 0))
      })
    })
  })

  describe('blur 路', () => {
    it('输入+失焦 → createAndAttach 一次（F-TAGS-01 主修复面）', async () => {
      await renderEditor([])
      await setType('水文')
      await blurInput()
      expect(stubApi.tags.upsert).toHaveBeenCalledTimes(1)
      expect(stubApi.tags.upsert).toHaveBeenCalledWith({ name: '水文' })
    })

    it('IME 组词期 blur（compositionstart 已发、end 未发）→ no-op', async () => {
      await renderEditor([])
      await setType('组词中')
      await composeStart()
      await blurInput()
      expect(stubApi.tags.upsert).not.toHaveBeenCalled()
    })

    it('compositionend 后 blur → 提交（组词完成=最终文本可提交）', async () => {
      await renderEditor([])
      await setType('组词毕')
      await act(async () => {
        inputEl().focus() // jsdom 焦点态建模（真浏览器输入必先聚焦——序 A：组词期保持焦点）
      })
      await composeStart()
      await composeEnd()
      expect(stubApi.tags.upsert, '聚焦态组词完成不自动提交（Enter/blur 路自负）').not.toHaveBeenCalled()
      await blurInput()
      expect(stubApi.tags.upsert).toHaveBeenCalledTimes(1)
    })

    it('组词完成（未失焦）compositionend → 不自动提交（Enter/blur 路自负——序 B 补提交的区分锚）', async () => {
      await renderEditor([])
      await setType('组词中')
      await act(async () => {
        inputEl().focus() // jsdom 焦点态建模：activeElement=input（未失焦）
      })
      await composeStart()
      await composeEnd()
      expect(stubApi.tags.upsert).not.toHaveBeenCalled()
    })

    it('组词被失焦打断（序 B：blur 先被拒→compositionend 后到补提交定案文本——回炉 R1 硬化）', async () => {
      await renderEditor([])
      await setType('水锤效应')
      await act(async () => {
        inputEl().focus() // 焦点态建模：组词发生在聚焦输入中
      })
      await composeStart()
      await act(async () => {
        inputEl().blur() // 真失焦（activeElement 离开 input——序 B：blur 先行）
      })
      expect(stubApi.tags.upsert, '组词中 blur 被守卫拒绝').not.toHaveBeenCalled()
      await composeEnd()
      expect(stubApi.tags.upsert, '失焦后 compositionend 到达=定案文本补提交').toHaveBeenCalledTimes(1)
      expect(stubApi.tags.upsert).toHaveBeenCalledWith({ name: '水锤效应' })
    })

    it('序 B 补提交名取 DOM 当前值（state 滞后于定案文本——R2 d1-W1：引擎事件到达序不定，DOM 恒最新）', async () => {
      await renderEditor([])
      await setType('旧值')
      await act(async () => {
        inputEl().focus()
      })
      await composeStart()
      // DOM 直改不发 input 事件：React state 仍持「旧值」，DOM 已是定案文本
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      await act(async () => {
        setter?.call(inputEl(), '定案新文本')
      })
      await act(async () => {
        inputEl().blur()
      })
      expect(stubApi.tags.upsert).not.toHaveBeenCalled()
      await composeEnd()
      expect(stubApi.tags.upsert, '补提交取 DOM 值非滞后 state').toHaveBeenCalledWith({ name: '定案新文本' })
    })

    it('compositionend 漏发自愈：组词 blur 被拒（ref 复位）后再输入→blur 正常提交（R2 k1-N2）', async () => {
      await renderEditor([])
      await setType('组词中')
      await composeStart()
      await blurInput() // 被拒——拒绝分支同步复位 composingRef
      expect(stubApi.tags.upsert).not.toHaveBeenCalled()
      await act(async () => {
        inputEl().focus()
      })
      await setType('新文本') // 无 composition 事件的后续输入（漏发场景续态）
      await blurInput()
      expect(stubApi.tags.upsert, 'ref 未悬空——blur 路恢复可用').toHaveBeenCalledWith({ name: '新文本' })
    })

    it('空白 input 失焦 → no-op', async () => {
      await renderEditor([])
      await setType('  ')
      await blurInput()
      expect(stubApi.tags.upsert).not.toHaveBeenCalled()
    })

    it('busy 飞行中失焦 → no-op', async () => {
      await renderEditor([])
      const resolve = controlledUpsert()
      await setType('水质')
      await pressEnter()
      await blurInput() // 真浏览器：busy 置位后 input disabled 强制失焦——此处显式派发
      expect(stubApi.tags.upsert).toHaveBeenCalledTimes(1)
      await act(async () => {
        resolve({ ok: true, data: { id: 't-new', name: '水质' } })
        await new Promise((r) => setTimeout(r, 0))
      })
    })
  })

  describe('「添加」按钮路', () => {
    it('输入+点「添加」→ 提交一次；mousedown 已 preventDefault（无 blur 双提交）', async () => {
      await renderEditor([])
      await setType('水泵')
      await mouseClick(addBtn())
      expect(stubApi.tags.upsert).toHaveBeenCalledTimes(1)
      expect(stubApi.tags.upsert).toHaveBeenCalledWith({ name: '水泵' })
    })

    it('busy 飞行中「添加」按钮禁用（busy 互斥格）', async () => {
      await renderEditor([])
      const resolve = controlledUpsert()
      await setType('水质')
      await pressEnter()
      expect(addBtn().disabled, 'busy 期添加按钮禁用').toBe(true)
      await act(async () => {
        resolve({ ok: true, data: { id: 't-new', name: '水质' } })
        await new Promise((r) => setTimeout(r, 0))
      })
    })

    it('建议按钮：mousedown preventDefault+click 单路=attachExisting（零 upsert、无 blur 双提交）', async () => {
      await renderEditor(
        [],
        [{ id: 't-s1', name: '水锤', paperCount: 3, color: null }]
      )
      await setType('水') // 前缀命中建议
      const sug = [...host!.querySelectorAll('button')].find((b) => b.textContent === '水锤')
      expect(sug, '建议按钮在场').toBeDefined()
      await mouseClick(sug as HTMLButtonElement)
      expect(stubApi.tags.upsert).not.toHaveBeenCalled()
      expect(stubApi.tags.attach).toHaveBeenCalledTimes(1)
      expect(stubApi.tags.attach).toHaveBeenCalledWith({ paperId: 'p-1', tagId: 't-s1' })
    })

    it('建议挂接成功 → input 清空（k1-B1 修复锚）+后继 blur 不再把残留前缀误建为独立标签', async () => {
      await renderEditor(
        [],
        [{ id: 't-s1', name: '水锤', paperCount: 3, color: null }]
      )
      await setType('水')
      const sug = [...host!.querySelectorAll('button')].find((b) => b.textContent === '水锤')
      await mouseClick(sug as HTMLButtonElement)
      expect(stubApi.tags.attach).toHaveBeenCalledTimes(1)
      expect(inputEl().value, '建议挂接后 input 清空').toBe('')
      await blurInput()
      expect(stubApi.tags.upsert, '残留前缀误建路已封').not.toHaveBeenCalled()
      expect(stubApi.tags.attach).toHaveBeenCalledTimes(1)
    })

    it('空白 input 点「添加」→ no-op（空白×按钮格——回炉 R1 补）', async () => {
      await renderEditor([])
      await setType('   ')
      await mouseClick(addBtn())
      expect(stubApi.tags.upsert).not.toHaveBeenCalled()
    })

    it('组词期点「添加」→ 不提交（组词中文本非最终文本——三路一致守卫，回炉 R1 补）', async () => {
      await renderEditor([])
      await setType('组词中')
      await composeStart()
      await mouseClick(addBtn())
      expect(stubApi.tags.upsert).not.toHaveBeenCalled()
    })

    it('建议挂接失败 → input 亦清空（检索前缀非载荷——R2 d1-W2 裁决 a）+后继 blur no-op', async () => {
      await renderEditor(
        [],
        [{ id: 't-s1', name: '水锤', paperCount: 3, color: null }]
      )
      stubApi.tags.attach.mockImplementationOnce(async () => ({
        ok: false as const,
        error: { code: 'DB_ERROR', message: '库忙' }
      }))
      await setType('水')
      const sug = [...host!.querySelectorAll('button')].find((b) => b.textContent === '水锤')
      await mouseClick(sug as HTMLButtonElement)
      expect(stubApi.tags.attach).toHaveBeenCalledTimes(1)
      expect(toastSpy).toHaveBeenCalled()
      expect(inputEl().value, '失败后检索前缀亦清空').toBe('')
      await blurInput()
      expect(stubApi.tags.upsert, '残留前缀误建路失败面亦封').not.toHaveBeenCalled()
    })

    it('残留文本点 ×：mousedown preventDefault+detach 进行+零 upsert（同手势竞逐解——R2 d1-W3）', async () => {
      await renderEditor([{ id: 't-1', name: '旧标' }])
      stubApi.tags.detach.mockImplementation(async () => ({ ok: true as const, data: { ok: true } }))
      await setType('残留')
      const xBtn = [...host!.querySelectorAll('button')].find(
        (b) => b.getAttribute('aria-label') === '移除标签 旧标'
      )
      expect(xBtn, '× 按钮在场').toBeDefined()
      await act(async () => {
        const md = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
        xBtn!.dispatchEvent(md)
        expect(md.defaultPrevented, '× mousedown 已 preventDefault（input 不失焦→无 blur 提交）').toBe(true)
        xBtn!.click()
      })
      expect(stubApi.tags.detach).toHaveBeenCalledTimes(1)
      expect(stubApi.tags.upsert, '残留文本未被 blur 路提交').not.toHaveBeenCalled()
    })
  })

  describe('R4 跨格序列（状态迁移表全格）', () => {
    it("Enter 成功→input 清空→后继 blur no-op（无双提交）", async () => {
      await renderEditor([])
      await setType('水质')
      await pressEnter()
      expect(inputEl().value).toBe('')
      await blurInput()
      expect(stubApi.tags.upsert).toHaveBeenCalledTimes(1)
    })

    it('Enter 失败→input 保留→「添加」按钮=显式重试路径（第二次成功）', async () => {
      await renderEditor([])
      // 第一击失败（Once 队列优先于 beforeEach 的默认 ok 实现）；重试走默认成功
      stubApi.tags.upsert.mockImplementationOnce(async () => ({
        ok: false as const,
        error: { code: 'DB_ERROR', message: '库忙' }
      }))
      await setType('水质')
      await pressEnter()
      expect(inputEl().value, '失败后 input 保留（重试语义）').toBe('水质')
      expect(toastSpy).toHaveBeenCalled()
      await mouseClick(addBtn())
      expect(stubApi.tags.upsert).toHaveBeenCalledTimes(2)
      expect(inputEl().value).toBe('')
    })

    it('Enter 失败→input 保留→blur=显式重试路径（失败重试格之二——回炉 R1 补）', async () => {
      await renderEditor([])
      stubApi.tags.upsert.mockImplementationOnce(async () => ({
        ok: false as const,
        error: { code: 'DB_ERROR', message: '库忙' }
      }))
      await setType('水质')
      await pressEnter()
      expect(inputEl().value).toBe('水质')
      await blurInput()
      expect(stubApi.tags.upsert, 'blur 重试第二击').toHaveBeenCalledTimes(2)
    })

    it('Enter 失败→input 保留→再 Enter=显式重试路径（失败重试格之三——回炉 R1 补）', async () => {
      await renderEditor([])
      stubApi.tags.upsert.mockImplementationOnce(async () => ({
        ok: false as const,
        error: { code: 'DB_ERROR', message: '库忙' }
      }))
      await setType('水质')
      await pressEnter()
      await pressEnter()
      expect(stubApi.tags.upsert, '再 Enter 重试第二击').toHaveBeenCalledTimes(2)
      expect(inputEl().value).toBe('')
    })

    it('busy ref 同批互斥：Enter 后同 tick 派发 blur → 仅一次 upsert（d1-W2 区分锚——state 守卫无此区分力）', async () => {
      await renderEditor([])
      controlledUpsert()
      await setType('水质')
      await act(async () => {
        inputEl().dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
        )
        inputEl().dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
      })
      expect(stubApi.tags.upsert, '同批事件窗内三路只放行一次（busy ref 镜像）').toHaveBeenCalledTimes(1)
    })

    it('已挂接同名：info toast+input 清空+零 IPC（三路共用 createAndAttach 的幂等格）', async () => {
      await renderEditor([{ id: 't-1', name: '已有' }])
      await setType('已有')
      await pressEnter()
      expect(stubApi.tags.upsert).not.toHaveBeenCalled()
      expect(toastSpy).toHaveBeenCalledWith('标签「已有」已挂接', 'info')
      expect(inputEl().value).toBe('')
    })
  })

  describe('F-TAGS-01 chip 着色（INV-86 三面之二——store 同源查表）', () => {
    it('store 命中 color → chip 背景/边框着色（jsdom 将 hex+alpha 归一 rgba——三元组锚）', async () => {
      await renderEditor(
        [{ id: 't-1', name: '彩标' }],
        [{ id: 't-1', name: '彩标', paperCount: 1, color: '#e11d48' }]
      )
      const chip = chipSpan('彩标')
      // #e11d4822 → rgba(225, 29, 72, 0.133)（cssstyle 归一——alpha 序列化宽容）
      expect(chip.style.background).toContain('225, 29, 72')
      expect(chip.style.border).toContain('225, 29, 72')
      // alpha/边框形态锁（d1-W4——INV-86 契约面：bg=hex+22≈0.13/border=1px solid hex+66=0.4）
      expect(chip.style.background).toMatch(/rgba\(225, 29, 72, 0\.13/)
      expect(chip.style.border).toMatch(/rgba\(225, 29, 72, 0\.4\)/)
      expect(chip.style.border).toContain('1px solid')
    })

    it('store color=null → 现状 accent-soft 零变（无着色覆盖）', async () => {
      await renderEditor(
        [{ id: 't-2', name: '默认标' }],
        [{ id: 't-2', name: '默认标', paperCount: 1, color: null }]
      )
      const chip = chipSpan('默认标')
      expect(chip.style.background).toBe('var(--accent-soft)')
    })

    it('store 未含该 id（store 陈旧）→ null 兜底=现状', async () => {
      await renderEditor([{ id: 't-x', name: '孤悬标' }], [])
      const chip = chipSpan('孤悬标')
      expect(chip.style.background).toBe('var(--accent-soft)')
    })
  })
})
