// @vitest-environment jsdom
/**
 * [B3] DrCitation —— 引用分节（三格式分段钮+预览文本+复制）组件锁定合约
 * （always-active）。两宿主（PaperDetailPanel/LineageSidePanel）共用件。
 *
 * 覆盖：默认 GB/T 7714 加载真实文本；切格式重载且文本变化；复制点击
 * navigator.clipboard.writeText 参数=当前文本+toast「引用已复制」；失败态
 * （错误文案+重试）；paperId 变化重载；toast 失败文案（剪贴板写失败）；
 * [B3 审查回炉] 格式偏好跨卸载驻留（宿主换篇加载期整体卸载不丢）+两类
 * 迟到回包乱序（切格式/切文献——旧请求后到不覆盖新文本）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, toastSpy } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  export_: {
    citation: vi.fn(async (req: { format: string; paperId: string }) => ({
      ok: true as const,
      data: { text: `cit-${req.format}-${req.paperId}` }
    }))
  }
})

import { DrCitation } from '../../../src/renderer/features/library/DrCitation'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let host: HTMLDivElement | null = null
let writeText: ReturnType<typeof vi.fn>

function mount(node: JSX.Element): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(node)
  })
}

function fmtBtn(label: string): HTMLButtonElement {
  const b = Array.from(host!.querySelectorAll<HTMLButtonElement>('button')).find(
    (x) => x.textContent === label
  )
  expect(b, `格式钮 ${label} 在场`).toBeDefined()
  return b as HTMLButtonElement
}

function copyBtn(): HTMLButtonElement {
  const b = Array.from(host!.querySelectorAll<HTMLButtonElement>('button')).find(
    (x) => x.textContent === '复制引用'
  )
  expect(b, '复制钮在场').toBeDefined()
  return b as HTMLButtonElement
}

function textRegion(): HTMLElement {
  const el = host?.querySelector('[data-testid="citation-text"]') as HTMLElement | null
  expect(el, '预览文本区在场').not.toBeNull()
  return el as HTMLElement
}

async function drain(times = 6): Promise<void> {
  await act(async () => {
    for (let i = 0; i < times; i += 1) await Promise.resolve()
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  writeText = vi.fn(async () => undefined)
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText }
  })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
})

describe('B3 DrCitation —— 引用分节（两面板共用件）', () => {
  // 注意：格式偏好=模块级会话态，跨用例存续——断言默认格式/具体格式的用例
  // 须自行显式点格式钮或保持首例位（下方「失败态」用例即按调用面相对断言）。
  it('默认 GB/T 7714：挂载即加载真实文本（api.export_.citation 单篇调用面；须保持首例）', async () => {
    mount(<DrCitation paperId="p-1" />)
    await drain()
    expect(textRegion().textContent).toBe('cit-gbt7714-p-1')
    expect(stubApi.export_.citation).toHaveBeenCalledWith({ format: 'gbt7714', paperId: 'p-1' })
  })

  it('切格式重载：文本随格式变化（APA/BibTeX）；分段钮三枚 aria-pressed 态', async () => {
    mount(<DrCitation paperId="p-1" />)
    await drain()
    expect(fmtBtn('GB/T 7714').getAttribute('aria-pressed')).toBe('true')
    act(() => {
      fmtBtn('APA').click()
    })
    await drain()
    expect(textRegion().textContent).toBe('cit-apa-p-1')
    expect(fmtBtn('APA').getAttribute('aria-pressed')).toBe('true')
    expect(fmtBtn('GB/T 7714').getAttribute('aria-pressed')).toBe('false')
    act(() => {
      fmtBtn('BibTeX').click()
    })
    await drain()
    expect(textRegion().textContent).toBe('cit-bibtex-p-1')
  })

  it('复制引用：writeText 参数=当前文本+成功 toast「引用已复制」', async () => {
    mount(<DrCitation paperId="p-1" />)
    await drain()
    act(() => {
      fmtBtn('APA').click()
    })
    await drain()
    await act(async () => {
      copyBtn().click()
      await Promise.resolve()
    })
    expect(writeText).toHaveBeenCalledWith('cit-apa-p-1')
    expect(toastSpy).toHaveBeenCalledWith('引用已复制', 'success')
  })

  it('剪贴板写失败：toast「复制到剪贴板失败」（库域动作型文案沿承）', async () => {
    writeText = vi.fn(async () => {
      throw new Error('denied')
    })
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    mount(<DrCitation paperId="p-1" />)
    await drain()
    await act(async () => {
      copyBtn().click()
      await Promise.resolve()
    })
    expect(toastSpy).toHaveBeenCalledWith('复制到剪贴板失败', 'error')
  })

  it('失败态：错误文案在场+重试恢复；paperId 变化重载（格式沿当前偏好——相对断言不依赖默认）', async () => {
    stubApi.export_.citation.mockRejectedValueOnce(
      Object.assign(new Error('文献不存在'), { code: 'NOT_FOUND' })
    )
    mount(<DrCitation paperId="p-1" />)
    await drain()
    expect(host?.textContent).toContain('生成引用失败')
    // 挂载首呼格式（模块偏好可能已被前序用例改写——按调用面锁定，不假设默认）
    const firstCall = stubApi.export_.citation.mock.calls.at(-1) as [{ format: string; paperId: string }]
    const fmt = firstCall[0].format
    const retry = host?.querySelector('[data-testid="citation-retry"]') as HTMLButtonElement | null
    expect(retry, '重试钮在场').not.toBeNull()
    await act(async () => {
      retry!.click()
      await Promise.resolve()
    })
    await drain()
    expect(textRegion().textContent).toBe(`cit-${fmt}-p-1`)
    // paperId 变化重载（同格式沿用）
    act(() => {
      root?.render(<DrCitation paperId="p-2" />)
    })
    await drain()
    expect(textRegion().textContent).toBe(`cit-${fmt}-p-2`)
  })

  // [B3 审查回炉 B-1] 格式偏好跨卸载驻留：PaperDetailPanel 换篇时 stale 守卫
  // detail=null 提前返回=本件整体卸载、新详情返回重挂——偏好若驻组件态即丢
  // （审查真实宿主探针实测重置回 GB/T 7714）。本例按宿主同型「卸载→重挂」
  // 序列锁会话级偏好。注意：模块级偏好跨用例存续——依赖默认格式的用例须排
  // 本例之前（本例置 BibTeX 驻留）。
  it('格式偏好跨卸载驻留：选 BibTeX→卸载→换篇重挂仍为 BibTeX（非默认）', async () => {
    mount(<DrCitation paperId="p-1" />)
    await drain()
    act(() => {
      fmtBtn('BibTeX').click()
    })
    await drain()
    expect(textRegion().textContent).toBe('cit-bibtex-p-1')
    // 宿主换篇同型：整体卸载
    act(() => {
      root?.unmount()
    })
    root = null
    host?.remove()
    host = null
    // 新详情返回后重挂（新文献）
    mount(<DrCitation paperId="p-2" />)
    await drain()
    expect(fmtBtn('BibTeX').getAttribute('aria-pressed')).toBe('true')
    expect(fmtBtn('GB/T 7714').getAttribute('aria-pressed')).toBe('false')
    expect(textRegion().textContent).toBe('cit-bibtex-p-2')
  })

  // [B3 审查回炉 W-1] 迟到回包乱序①：切格式——旧格式请求后到不覆盖新文本
  it('迟到回包乱序（切格式）：gbt7714 请求未回即切 APA，APA 先回 gbt7714 后到被丢弃', async () => {
    const deferred: Array<(v: { ok: true; data: { text: string } }) => void> = []
    stubApi.export_.citation.mockImplementation(
      () =>
        new Promise((resolve) => {
          deferred.push(resolve as typeof deferred[number])
        })
    )
    mount(<DrCitation paperId="p-1" />)
    await drain()
    act(() => {
      fmtBtn('APA').click()
    })
    await drain()
    expect(deferred).toHaveLength(2) // gbt7714(p-1) + apa(p-1)
    // 新请求先回
    await act(async () => {
      deferred.at(1)!({ ok: true, data: { text: 'cit-apa-p-1' } })
      await Promise.resolve()
    })
    expect(textRegion().textContent).toBe('cit-apa-p-1')
    // 旧请求后到——seq 守卫丢弃
    await act(async () => {
      deferred.at(0)!({ ok: true, data: { text: 'cit-gbt7714-p-1-stale' } })
      for (let i = 0; i < 6; i += 1) await Promise.resolve()
    })
    expect(textRegion().textContent).toBe('cit-apa-p-1')
  })

  // [B3 审查回炉 W-1] 迟到回包乱序②：切文献——旧文献请求后到不覆盖新文献文本
  it('迟到回包乱序（切文献）：p-1 请求未回即切 p-2，p-2 先回 p-1 后到被丢弃', async () => {
    const deferred: Array<(v: { ok: true; data: { text: string } }) => void> = []
    stubApi.export_.citation.mockImplementation(
      () =>
        new Promise((resolve) => {
          deferred.push(resolve as typeof deferred[number])
        })
    )
    mount(<DrCitation paperId="p-1" />)
    await drain()
    act(() => {
      root?.render(<DrCitation paperId="p-2" />)
    })
    await drain()
    expect(deferred).toHaveLength(2) // gbt7714(p-1) + gbt7714(p-2)
    await act(async () => {
      deferred.at(1)!({ ok: true, data: { text: 'cit-gbt7714-p-2' } })
      await Promise.resolve()
    })
    expect(textRegion().textContent).toBe('cit-gbt7714-p-2')
    await act(async () => {
      deferred.at(0)!({ ok: true, data: { text: 'cit-gbt7714-p-1-stale' } })
      for (let i = 0; i < 6; i += 1) await Promise.resolve()
    })
    expect(textRegion().textContent).toBe('cit-gbt7714-p-2')
  })
})
