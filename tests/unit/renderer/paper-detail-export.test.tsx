// @vitest-environment jsdom
/**
 * PaperDetailPanel 导出入口契约（2026-08-24 链条核查修复单元）。
 * 背景：BibTeX 导出后端链（ipc/export_.ts:70-72 → export.service.ts:82-93 →
 * bibtex.serializer.ts）完整但 renderer 无触发点（docs/reports/2026-08-24_chain-audit.md
 * §3.1）——本文件锁 UI 接线：入口存在、调用形状（paperIds 数组）、动作型失败可见
 * （INV-02：用户取消 CANCELLED 也是必须可见的反馈，静默=违规）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { PaperDetail } from '../../../src/shared/models/paper'
import type * as clientModule from '../../../src/renderer/api/client'
import type * as toastModule from '../../../src/renderer/shared/ui/Toast'

const { stubApi, toastSpy } = vi.hoisted(() => ({
  stubApi: {
    library: { detail: vi.fn() },
    enrich: { fetch: vi.fn() },
    export_: { report: vi.fn(), bibtex: vi.fn() },
    system: { openExternal: vi.fn() }
  },
  toastSpy: vi.fn()
}))

// client 只 stub api 门面；unwrap/ApiClientError 保留真实现（Result 解包契约同型）
vi.mock('../../../src/renderer/api/client', async (importOriginal) => {
  const real = await importOriginal<typeof clientModule>()
  return { ...real, api: stubApi }
})
vi.mock('../../../src/renderer/shared/ui/Toast', async (importOriginal) => {
  const real = await importOriginal<typeof toastModule>()
  return { ...real, showToast: toastSpy }
})

import { PaperDetailPanel } from '../../../src/renderer/features/library/PaperDetailPanel'
import { guardedDescribe } from '../../utils/guard'

function makeDetail(): PaperDetail {
  return {
    id: 'paper-1',
    title: '样例论文',
    authors: ['张三', '李四'],
    year: 2026,
    venue: 'Journal of Testing',
    doi: '10.0000/demo',
    tagNames: [],
    collectionNames: [],
    annotationCount: 2,
    noteCount: 1,
    lastReadPage: 0,
    addedAt: '2026-08-24T00:00:00Z',
    abstract: '摘要内容',
    arxivId: null,
    source: 'local',
    enrichStatus: 'pending',
    fileUrl: 'app-file://paper-1',
    fileName: 'demo.pdf',
    updatedAt: '2026-08-24T00:00:00Z',
    tags: [],
    collections: []
  }
}

let root: Root | null = null
let host: HTMLDivElement | null = null

async function renderPanel(): Promise<void> {
  stubApi.library.detail.mockResolvedValue({ ok: true, data: makeDetail() })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(<PaperDetailPanel paperId="paper-1" />)
  })
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

guardedDescribe('SR-LIB-04', 'PaperDetailPanel —— BibTeX 导出入口（主链接线修复）', () => {
  it('入口存在：详情加载后渲染「导出 BibTeX」按钮', async () => {
    await renderPanel()
    expect(findButton('导出 BibTeX')).toBeDefined()
  })

  it('点击导出：经 api.export_.bibtex 以当前文献 id 调用，成功 toast 含条数与路径', async () => {
    stubApi.export_.bibtex.mockResolvedValue({
      ok: true,
      data: { filePath: 'C:\\export\\synapse-export.bib', count: 1 }
    })
    await renderPanel()
    await click('导出 BibTeX')
    expect(stubApi.export_.bibtex).toHaveBeenCalledWith({ paperIds: ['paper-1'] })
    expect(toastSpy).toHaveBeenCalledWith(
      expect.stringContaining('已导出 1 条题录'),
      'success'
    )
    expect(toastSpy).toHaveBeenLastCalledWith(
      expect.stringContaining('synapse-export.bib'),
      'success'
    )
  })

  it('取消导出（CANCELLED）：动作型失败 toast 可见，不静默（INV-02）', async () => {
    stubApi.export_.bibtex.mockResolvedValue({
      ok: false,
      error: { code: 'CANCELLED', message: '已取消保存' }
    })
    await renderPanel()
    await click('导出 BibTeX')
    expect(toastSpy).toHaveBeenCalledWith('已取消保存', 'error')
  })
})
