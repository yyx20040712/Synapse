// @vitest-environment jsdom
/**
 * [F-DBCAMP-01 DB-2 UI U6] BudgetSection —— 预算节 17 输入+校验三则+态机
 * （jsdom 习语=ai-manage-tabs.test.tsx：createRoot+act；always-active 裸
 * describe——K3）。
 *
 * 覆盖（设计 §1.5+E4 断言面）：水合（store.settings→表单）+「于下次对话生效」
 * 固定文案；态机 clean（无变更保存禁用）→dirty；校验三则（负数/清空/非整数
 * →行内错误+保存禁用；档内合计超限；agent 单发超轮合计）；保存=完整
 * AppSettings 四键全量携带（与 uiScale 同款断言先例——INV-39 接缝实修面）；
 * saved→2s 回 clean；恢复默认=AI_BUDGET_DEFAULTS 填回+dirty；settings
 * 未载入保存禁用。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, toastSpy } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  settings: { get: vi.fn(), set: vi.fn() }
})

import { BudgetSection } from '../../../src/renderer/features/ai/BudgetSection'
import { useSettingsStore } from '../../../src/renderer/features/settings/settings.store'
import { AI_BUDGET_DEFAULTS, type AiBudgets } from '../../../src/shared/models/ai-domain'
import type { AppSettings } from '../../../src/shared/ipc/schemas'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

/** 定制预算夹具（非默认值——水合/回读断言不与默认巧合） */
const CUSTOM_BUDGETS: AiBudgets = {
  paper: { cap: 9000, l1: 800, l2Slices: 15, l2Cap: 2200, tail: 1000 },
  lineage: { cap: 6000, l1: 1800, l2Slices: 3, l2Cap: 600, tail: 1200 },
  global: { cap: 4000, l1: 600, l2Slices: 8, l2Cap: 1200, tail: 1000 },
  agent: { perShot: 800, perRound: 2000 }
}

function settingsFixture(budgets: AiBudgets = CUSTOM_BUDGETS): AppSettings {
  return { contactEmail: 'set@x.y', theme: 'dark', uiScale: 'medium', aiBudgets: budgets }
}

let root: Root | null = null
let host: HTMLDivElement | null = null
/** 受控 props 面（宿主注入通道=真 store.save——走 mock api.settings.set） */
let propsSettings: AppSettings | null = null

function mountSection(): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(
      <BudgetSection
        settings={propsSettings}
        saving={false}
        onSave={(payload) => useSettingsStore.getState().save(payload)}
      />
    )
  })
}

function settle(ticks = 4): Promise<void> {
  return act(async () => {
    for (let i = 0; i < ticks; i += 1) {
      await Promise.resolve()
    }
  })
}

function input(label: string): HTMLInputElement {
  const el = host?.querySelector(`input[aria-label="${label}"]`)
  if (!(el instanceof HTMLInputElement)) throw new Error(`输入框不在场：${label}`)
  return el
}

function saveButton(): HTMLButtonElement {
  const el = Array.from(host?.querySelectorAll('button') ?? []).find(
    (b) => b.textContent === '保存预算'
  )
  if (!(el instanceof HTMLButtonElement)) throw new Error('保存预算钮不在场')
  return el
}

function resetButton(): HTMLButtonElement {
  const el = Array.from(host?.querySelectorAll('button') ?? []).find(
    (b) => b.textContent === '恢复默认'
  )
  if (!(el instanceof HTMLButtonElement)) throw new Error('恢复默认钮不在场')
  return el
}

function setInput(label: string, value: string): void {
  const el = input(label)
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  act(() => {
    setter.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function presetSettings(s: AppSettings | null): void {
  propsSettings = s
}

beforeEach(() => {
  propsSettings = null
  stubApi.settings.set.mockReset()
  stubApi.settings.set.mockResolvedValue({ ok: true, data: { ok: true } })
  toastSpy.mockClear()
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  host?.remove()
  root = null
  host = null
  propsSettings = null
  vi.useRealTimers()
})

describe('F-DBCAMP-01 U6 BudgetSection —— 17 输入+校验三则+态机+全量携带', () => {
  it('水合：store.settings 定制预算进表单+「于下次对话生效」文案在场+无变更保存禁用（clean）', async () => {
    presetSettings(settingsFixture())
    mountSection()
    await settle()
    expect(input('文献档 上限').value, '定制值水合').toBe('9000')
    expect(input('全局档 尾段').value).toBe('1000')
    expect(input('代理 单发预算').value).toBe('800')
    expect(host?.textContent ?? '', '固定文案').toContain('于下次对话生效')
    expect(saveButton().disabled, 'clean 保存禁用').toBe(true)
  })

  it('合法改动→dirty→保存可用', async () => {
    presetSettings(settingsFixture())
    mountSection()
    await settle()
    setInput('文献档 上限', '9500')
    expect(input('文献档 上限').value).toBe('9500')
    expect(saveButton().disabled, 'dirty 保存可用').toBe(false)
  })

  it('负数→行内错误+保存禁用', async () => {
    presetSettings(settingsFixture())
    mountSection()
    await settle()
    setInput('文献档 上限', '-1')
    expect(host?.textContent ?? '', '行内红字').toContain('需为非负整数')
    expect(saveButton().disabled).toBe(true)
  })

  it('清空→行内错误+保存禁用', async () => {
    presetSettings(settingsFixture())
    mountSection()
    await settle()
    setInput('脉络档 L1 上限', '')
    expect(host?.textContent ?? '').toContain('需为非负整数')
    expect(saveButton().disabled).toBe(true)
  })

  it('非整数→行内错误+保存禁用', async () => {
    presetSettings(settingsFixture())
    mountSection()
    await settle()
    setInput('全局档 L2 片数', '1.5')
    expect(host?.textContent ?? '').toContain('需为非负整数')
    expect(saveButton().disabled).toBe(true)
  })

  it('档内合计超限（l1=9000→13000>9000）→行内错误+保存禁用（§9 默认合计=4000≤8000 对照合法）', async () => {
    presetSettings(settingsFixture())
    mountSection()
    await settle()
    setInput('文献档 L1 上限', '9000')
    expect(host?.textContent ?? '', '合计超限文案（与 shared refine 同字面）').toContain(
      '预算档内合计超上限'
    )
    expect(saveButton().disabled).toBe(true)
    expect(stubApi.settings.set).not.toHaveBeenCalled()
  })

  it('agent 单发超轮合计→行内错误+保存禁用', async () => {
    presetSettings(settingsFixture())
    mountSection()
    await settle()
    setInput('代理 单发预算', '2001')
    expect(host?.textContent ?? '', 'agent 校验文案（与 shared refine 同字面）').toContain(
      '单次拉取预算不得超过单轮预算'
    )
    expect(saveButton().disabled).toBe(true)
  })

  it('保存→set 收到完整 AppSettings 四键（含 aiBudgets——INV-39 全量携带）+saved→2s 回 clean', async () => {
    vi.useFakeTimers()
    presetSettings(settingsFixture())
    mountSection()
    await settle()
    setInput('文献档 上限', '9999')
    stubApi.settings.set.mockResolvedValue({
      ok: true,
      data: settingsFixture({ ...CUSTOM_BUDGETS, paper: { ...CUSTOM_BUDGETS.paper, cap: 9999 } })
    })
    act(() => {
      saveButton().click()
    })
    await settle()
    expect(stubApi.settings.set).toHaveBeenCalledTimes(1)
    const req = stubApi.settings.set.mock.calls[0]![0] as Record<string, unknown>
    expect(req.contactEmail, '全量携带：contactEmail').toBe('set@x.y')
    expect(req.theme, '全量携带：theme').toBe('dark')
    expect(req.uiScale, '全量携带：uiScale').toBe('medium')
    expect((req.aiBudgets as AiBudgets).paper.cap, '全量携带：aiBudgets').toBe(9999)
    expect(host?.textContent ?? '', 'saved 文案').toContain('已保存')
    expect(saveButton().disabled, 'saved 保存禁用').toBe(true)
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(host?.textContent ?? '', '2s 回 clean：saved 文案退场').not.toContain('已保存')
    expect(saveButton().disabled, 'clean 保存禁用').toBe(true)
  })

  it('恢复默认→表单回 §9 默认值+dirty（可保存落盘）', async () => {
    presetSettings(settingsFixture())
    mountSection()
    await settle()
    expect(input('文献档 上限').value).toBe('9000')
    act(() => {
      resetButton().click()
    })
    expect(input('文献档 上限').value, '回默认 8000').toBe('8000')
    expect(input('脉络档 L2 片数').value, '回默认 3').toBe('3')
    expect(saveButton().disabled, 'dirty 保存可用').toBe(false)
  })

  it('恢复默认后再保存→aiBudgets=AI_BUDGET_DEFAULTS 逐档相等（shared 单源断言）', async () => {
    presetSettings(settingsFixture())
    mountSection()
    await settle()
    act(() => {
      resetButton().click()
    })
    stubApi.settings.set.mockResolvedValue({
      ok: true,
      data: settingsFixture(structuredClone(AI_BUDGET_DEFAULTS))
    })
    act(() => {
      saveButton().click()
    })
    await settle()
    const req = stubApi.settings.set.mock.calls[0]![0] as { aiBudgets: AiBudgets }
    expect(req.aiBudgets).toEqual(AI_BUDGET_DEFAULTS)
  })

  it('settings 未载入（null）→表呈默认投影+保存禁用（全量载荷无源不保存）', async () => {
    presetSettings(null)
    mountSection()
    await settle()
    expect(input('文献档 上限').value, '默认投影').toBe('8000')
    expect(saveButton().disabled).toBe(true)
  })

  it('保存失败→toast+回 dirty（表单保留可重试）', async () => {
    presetSettings(settingsFixture())
    mountSection()
    await settle()
    setInput('文献档 上限', '9600')
    stubApi.settings.set.mockResolvedValue({
      ok: false,
      error: { code: 'INVALID_REQUEST', message: '拒' }
    })
    act(() => {
      saveButton().click()
    })
    await settle()
    expect(toastSpy).toHaveBeenCalled()
    expect(input('文献档 上限').value, '表单保留').toBe('9600')
    expect(saveButton().disabled, 'dirty 可重试').toBe(false)
  })
})
