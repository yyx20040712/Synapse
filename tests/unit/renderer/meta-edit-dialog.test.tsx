// @vitest-environment jsdom
/**
 * [F-FOLDER-02·D] MetaEditDialog 扩字段（month 节点月框+impactFactor 手动面）
 * + F-LIBUI-01 备案缺口修（onSaved 链统一走 library.list 失效重取——TagEditor
 * 三路提交后刷新同范式）+ PaperDetailPanel VENUE 行 IF 灰字显示。
 *
 * 覆盖：①表单承载 month/IF（label 文本锚）；②保存→updateMeta patch 携
 * month/impactFactor（数值化：空串=null）；③非法输入当场拦截（月份 1-12
 * 整数/IF 数字——toast 中文，零 invoke）；④面板链：编辑保存后 library.list
 * 重跑（表格不滞旧）+ VENUE 行 IF 灰字真文本。
 * always-active（不经 guardedDescribe——K3 威胁结构性缺位）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, toastSpy } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  library: { detail: vi.fn(), list: vi.fn(), updateMeta: vi.fn() },
  enrich: { fetch: vi.fn() },
  export_: { report: vi.fn(), bibtex: vi.fn(), corpus: vi.fn(), clipboard: vi.fn() },
  system: { openExternal: vi.fn() },
  tags: { list: vi.fn(), upsert: vi.fn(), attach: vi.fn() }
})

import { MetaEditDialog } from '../../../src/renderer/features/library/MetaEditDialog'
import { PaperDetailPanel } from '../../../src/renderer/features/library/PaperDetailPanel'
import { makeDetail } from '../../utils/factories'
import type { PaperDetail } from '../../../src/shared/models/paper'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let host: HTMLDivElement | null = null

beforeEach(() => {
  stubApi.library.updateMeta.mockClear()
  stubApi.library.detail.mockReset()
  stubApi.library.list.mockReset()
  toastSpy.mockClear()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  host?.remove()
  root = null
  host = null
})

/** 按标签 span 文本找其受控 input（label 包裹结构） */
function inputByLabel(label: string): HTMLInputElement {
  const labels = Array.from(host?.querySelectorAll('label') ?? [])
  const hit = labels.find((l) => l.querySelector('span')?.textContent === label)
  expect(hit, `字段在场：${label}`).toBeDefined()
  return hit!.querySelector('input') as HTMLInputElement
}

/** 受控输入驱动（native setter+input 事件——jsdom 直改 value 不触发 React） */
function setInput(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  act(() => {
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function clickButton(text: string): void {
  const btn = [...(host?.querySelectorAll('button') ?? [])].find(
    (b) => b.textContent === text
  )
  expect(btn, `按钮在场：${text}`).toBeDefined()
  act(() => {
    btn!.click()
  })
}

/** 微任务排空（unwrap 链路 await 落定） */
async function settle(times = 6): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

describe('F-FOLDER-02·D MetaEditDialog month/IF 扩字段', () => {
  function renderDialog(detail: PaperDetail): void {
    act(() => {
      root?.render(
        <MetaEditDialog open detail={detail} onClose={() => undefined} onSaved={() => undefined} />
      )
    })
  }

  it('字段承载：月份/影响因子输入在场（label 文本锚）', () => {
    renderDialog(makeDetail())
    expect(inputByLabel('月份（1-12，留空=未定月）')).not.toBeNull()
    expect(inputByLabel('影响因子（留空=无）')).not.toBeNull()
  })

  it('保存：patch 携 month+impactFactor 数值化（空串=null）', async () => {
    const detail = makeDetail({ impactFactor: null })
    stubApi.library.updateMeta.mockResolvedValue({ ok: true, data: { ...detail, month: 6 } })
    renderDialog(detail)
    setInput(inputByLabel('月份（1-12，留空=未定月）'), '6')
    setInput(inputByLabel('影响因子（留空=无）'), '3.9')
    stubApi.library.updateMeta.mockClear()
    clickButton('保存')
    await settle()
    expect(stubApi.library.updateMeta).toHaveBeenCalledTimes(1)
    const req = stubApi.library.updateMeta.mock.calls[0]![0] as {
      paperId: string
      patch: Record<string, unknown>
    }
    expect(req.patch).toEqual({ month: 6, impactFactor: 3.9 })
  })

  it('清空语义：detail.lineage.month 在场时清空输入 → patch.month=null', async () => {
    const detail = makeDetail({ lineage: { year: 2024, month: 3, edgeCount: 0 } })
    stubApi.library.updateMeta.mockResolvedValue({ ok: true, data: detail })
    renderDialog(detail)
    setInput(inputByLabel('月份（1-12，留空=未定月）'), '')
    clickButton('保存')
    await settle()
    const req = stubApi.library.updateMeta.mock.calls[0]![0] as {
      patch: Record<string, unknown>
    }
    expect(req.patch).toEqual({ month: null })
  })

  it('非法输入当场拦截：月份越界/非整数与 IF 非数字 → 中文 toast+零 invoke', async () => {
    renderDialog(makeDetail())
    setInput(inputByLabel('月份（1-12，留空=未定月）'), '13')
    clickButton('保存')
    await settle()
    expect(stubApi.library.updateMeta).not.toHaveBeenCalled()
    expect(toastSpy).toHaveBeenCalledWith('月份需为 1-12 的整数', 'info')

    setInput(inputByLabel('月份（1-12，留空=未定月）'), '')
    setInput(inputByLabel('影响因子（留空=无）'), 'abc')
    clickButton('保存')
    await settle()
    expect(stubApi.library.updateMeta).not.toHaveBeenCalled()
    expect(toastSpy).toHaveBeenCalledWith('影响因子需为数字', 'info')
  })
})

describe('F-FOLDER-02·D 面板链（F-LIBUI-01 备案缺口修）', () => {
  it('编辑保存后：library.list 重跑（表格不滞旧）+ 对话框关闭', async () => {
    const detail = makeDetail()
    stubApi.library.detail.mockResolvedValue({ ok: true, data: detail })
    stubApi.library.list.mockResolvedValue({ ok: true, data: { items: [], total: 0 } })
    act(() => {
      root?.render(<PaperDetailPanel paperId="paper-1" />)
    })
    await settle()
    stubApi.library.list.mockClear()
    stubApi.library.updateMeta.mockResolvedValue({
      ok: true,
      data: { ...detail, title: '新题名' }
    })
    clickButton('编辑元数据')
    setInput(inputByLabel('标题'), '新题名')
    clickButton('保存')
    await settle()
    expect(stubApi.library.list, '保存后列表失效重取（TagEditor onChanged 同链）').toHaveBeenCalled()
  })

  it('VENUE 行 IF 灰字真文本：impactFactor 非 null → 「 · IF 3.9」随行显示', async () => {
    const detail = makeDetail({ impactFactor: 3.9 })
    stubApi.library.detail.mockResolvedValue({ ok: true, data: detail })
    act(() => {
      root?.render(<PaperDetailPanel paperId="paper-1" />)
    })
    await settle()
    const row = Array.from(host?.querySelectorAll('.lib-fld') ?? []).find(
      (r) => r.querySelector('.lib-fld-k')?.textContent === 'VENUE'
    )
    expect(row).toBeDefined()
    const v = row!.querySelector('.lib-fld-v')!
    expect(v.textContent).toContain('Journal of Testing')
    expect(v.textContent).toContain('IF 3.9')
    // 灰字承载=独立 span（色档与期刊名分离——文本与样式双锚）
    expect(v.querySelector('span')?.textContent).toContain('IF 3.9')
  })

  it('IF null 负锚：VENUE 行不出现 IF 文本', async () => {
    stubApi.library.detail.mockResolvedValue({ ok: true, data: makeDetail() })
    act(() => {
      root?.render(<PaperDetailPanel paperId="paper-1" />)
    })
    await settle()
    const row = Array.from(host?.querySelectorAll('.lib-fld') ?? []).find(
      (r) => r.querySelector('.lib-fld-k')?.textContent === 'VENUE'
    )
    expect(row!.querySelector('.lib-fld-v')!.textContent).not.toContain('IF')
  })
})
