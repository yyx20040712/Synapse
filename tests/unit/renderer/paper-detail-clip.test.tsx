// @vitest-environment jsdom
/**
 * P7E-04 剪贴板导出 UI 面（always-active——三屋新测试不经 guardedDescribe）。
 * E1/E2：按钮存在+invoke 形状+toast 文案逐字；E4：busy 门短路零重复 invoke
 * （hook 直测——harness 按钮不带 disabled/loading，门本身是被测面，组件面
 * disabled 已由 Button 既有契约覆盖）；E6：动作型失败 toast「复制到剪贴板失败」
 * +busy 复位；拆件回归：report/bibtex/corpus/enrich 既有动作经
 * usePaperDetailActions hook 路径仍工作（拆件零行为漂移判据——受锁
 * paper-detail-export.test.tsx 零改全绿之外的补充面）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { PaperDetail } from '../../../src/shared/models/paper'
import { makeApiStub, toastSpy } from '../../utils/api-client-mock'
import { makeDemoDetail } from '../../utils/factories'

const stubApi = makeApiStub({
  library: { detail: vi.fn() },
  enrich: { fetch: vi.fn() },
  export_: { report: vi.fn(), bibtex: vi.fn(), corpus: vi.fn(), clipboard: vi.fn() },
  system: { openExternal: vi.fn() }
})

import { PaperDetailPanel } from '../../../src/renderer/features/library/PaperDetailPanel'
import { usePaperDetailActions } from '../../../src/renderer/features/library/usePaperDetailActions'

let root: Root | null = null
let host: HTMLDivElement | null = null

async function renderPanel(): Promise<void> {
  stubApi.library.detail.mockResolvedValue({ ok: true, data: makeDemoDetail() })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(<PaperDetailPanel paperId="paper-1" />)
  })
}

/** hook 直测 harness：裸按钮不带 disabled/loading——busy 门本身是被测面 */
function Harness(props: { detail: PaperDetail | null; onRefresh: () => void }): JSX.Element {
  const { runAction } = usePaperDetailActions(props.detail, props.onRefresh)
  return (
    <button type="button" onClick={() => void runAction('bibtex-clip')}>
      bare-clip
    </button>
  )
}

async function renderHarness(): Promise<HTMLButtonElement> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(<Harness detail={makeDemoDetail()} onRefresh={() => {}} />)
  })
  return host.querySelector('button') as HTMLButtonElement
}

function findButton(label: string): HTMLButtonElement | undefined {
  return [...(host?.querySelectorAll('button') ?? [])].find((b) => b.textContent === label)
}

async function click(label: string): Promise<void> {
  const btn = findButton(label)
  expect(btn, `按钮存在：${label}`).toBeDefined()
  await act(async () => {
    btn?.click()
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(async () => {
  await act(async () => {
    root?.unmount()
  })
  host?.remove()
  root = null
  host = null
})

it('E1 复制 BibTeX：clipboard 以 {format:bibtex, paperIds:[id]} 调用，toast 逐字含条数', async () => {
  stubApi.export_.clipboard.mockResolvedValue({ ok: true, data: { count: 1 } })
  await renderPanel()
  await click('复制 BibTeX')
  expect(stubApi.export_.clipboard).toHaveBeenCalledWith({ format: 'bibtex', paperIds: ['paper-1'] })
  expect(toastSpy).toHaveBeenCalledWith('已复制 1 条题录到剪贴板', 'success')
})

it('E2 复制 CSV：clipboard 以 {format:csv} 调用，toast「已复制 1 行列表到剪贴板」', async () => {
  stubApi.export_.clipboard.mockResolvedValue({ ok: true, data: { count: 1 } })
  await renderPanel()
  await click('复制 CSV')
  expect(stubApi.export_.clipboard).toHaveBeenCalledWith({ format: 'csv', paperIds: ['paper-1'] })
  expect(toastSpy).toHaveBeenCalledWith('已复制 1 行列表到剪贴板', 'success')
})

it('E4 busy 门：exporting 进行期再触发短路（零重复 invoke），完成后 toast 正常', async () => {
  let resolveClip: (v: unknown) => void = () => {}
  stubApi.export_.clipboard.mockReturnValue(
    new Promise((res) => {
      resolveClip = res
    })
  )
  const btn = await renderHarness()
  await act(async () => {
    btn.click()
  })
  await act(async () => {
    btn.click()
  })
  expect(stubApi.export_.clipboard).toHaveBeenCalledTimes(1)
  await act(async () => {
    resolveClip({ ok: true, data: { count: 1 } })
  })
  expect(toastSpy).toHaveBeenCalledWith('已复制 1 条题录到剪贴板', 'success')
})

it('E6 写失败：动作型失败 toast「复制到剪贴板失败」+busy 复位（可再次触发）', async () => {
  stubApi.export_.clipboard.mockResolvedValue({
    ok: false,
    error: { code: 'INTERNAL', message: '写剪贴板失败' }
  })
  await renderPanel()
  await click('复制 BibTeX')
  expect(toastSpy).toHaveBeenCalledWith('复制到剪贴板失败', 'error')
  await click('复制 BibTeX')
  expect(stubApi.export_.clipboard).toHaveBeenCalledTimes(2)
})

it('拆件回归：report/bibtex/corpus 文件导出经 hook 路径仍工作（toast 逐字）', async () => {
  stubApi.export_.report.mockResolvedValue({ ok: true, data: { filePath: 'C:\\e\\r.md', count: 1 } })
  stubApi.export_.bibtex.mockResolvedValue({ ok: true, data: { filePath: 'C:\\e\\a.bib', count: 1 } })
  stubApi.export_.corpus.mockResolvedValue({ ok: true, data: { filePath: 'C:\\e\\corpus', count: 1 } })
  await renderPanel()
  await click('导出读书报告')
  await click('导出 BibTeX')
  await click('导出语料 md')
  expect(toastSpy).toHaveBeenCalledWith('已导出 1 条内容：C:\\e\\r.md', 'success')
  expect(toastSpy).toHaveBeenCalledWith('已导出 1 条题录：C:\\e\\a.bib', 'success')
  expect(toastSpy).toHaveBeenCalledWith('已导出语料 md：C:\\e\\corpus', 'success')
})

it('拆件回归：enrich 经 hook 路径仍工作（成功 toast+触发详情重读）', async () => {
  stubApi.enrich.fetch.mockResolvedValue({ ok: true, data: makeDemoDetail() })
  await renderPanel()
  await click('增强元数据')
  expect(stubApi.enrich.fetch).toHaveBeenCalledWith({ paperId: 'paper-1' })
  expect(toastSpy).toHaveBeenCalledWith('元数据增强完成', 'success')
  expect(stubApi.library.detail).toHaveBeenCalledTimes(2)
})
