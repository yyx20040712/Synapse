// @vitest-environment jsdom
/**
 * [SR2-ENR-03] PaperDetailPanel —— 被引数透出（缺陷 D：数据链全通唯独 UI 零引用）。
 *
 * 覆盖：citedByCount 有值→「被引」行渲染真实文本；缺省→'—'（Row 空串语义）；
 * 零值→「0」（`=== undefined` 判空边界——0 不是缺省）。always-active 裸
 * describe（K3：不经 guardedDescribe 守卫）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PaperDetail } from '../../../src/shared/models/paper'
import type * as clientModule from '../../../src/renderer/api/client'
import type * as toastModule from '../../../src/renderer/shared/ui/Toast'

const { stubApi, toastSpy } = vi.hoisted(() => ({
  stubApi: {
    library: { detail: vi.fn() },
    enrich: { fetch: vi.fn() },
    export_: { report: vi.fn(), bibtex: vi.fn(), corpus: vi.fn() },
    system: { openExternal: vi.fn() }
  },
  toastSpy: vi.fn()
}))
vi.mock('../../../src/renderer/api/client', async (importOriginal) => {
  const real = await importOriginal<typeof clientModule>()
  return { ...real, api: stubApi as unknown as typeof clientModule.api }
})
vi.mock('../../../src/renderer/shared/ui/Toast', async (importOriginal) => {
  const real = await importOriginal<typeof toastModule>()
  return { ...real, showToast: toastSpy }
})

import { PaperDetailPanel } from '../../../src/renderer/features/library/PaperDetailPanel'

function makeDetail(): PaperDetail {
  return {
    id: 'paper-1',
    title: '样例论文',
    authors: ['张三'],
    year: 2026,
    venue: 'Journal of Testing',
    doi: null,
    tagNames: [],
    collectionNames: [],
    annotationCount: 0,
    noteCount: 1,
    lastReadPage: 0,
    addedAt: 't',
    abstract: '',
    arxivId: null,
    source: 'local',
    enrichStatus: 'pending',
    fileUrl: 'app-file://paper-1',
    fileName: 'a.pdf',
    updatedAt: 't',
    tags: [],
    collections: []
  }
}

let root: Root | null = null
let host: HTMLDivElement | null = null

/** 定位键值行（Row=两 span 的 p）：label span 文本相等时返回值 span 文本；行不存在返回 null */
function rowValue(label: string): string | null {
  for (const p of Array.from(host?.querySelectorAll('p') ?? [])) {
    const spans = p.querySelectorAll('span')
    const labelSpan = spans[0]
    const valueSpan = spans[1]
    if (spans.length === 2 && labelSpan?.textContent === label && valueSpan !== undefined) {
      return valueSpan.textContent ?? null
    }
  }
  return null
}

async function renderPanel(detail: PaperDetail): Promise<void> {
  stubApi.library.detail.mockResolvedValue({ ok: true, data: detail })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(<PaperDetailPanel paperId="paper-1" />)
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

describe('SR2-ENR-03 PaperDetailPanel —— 被引数透出（always-active）', () => {
  it('有值：citedByCount=124 → 「被引」行渲染「124」（真实文本断言）', async () => {
    await renderPanel({ ...makeDetail(), citedByCount: 124 })
    expect(rowValue('被引')).toBe('124')
  })

  it('缺省：无 citedByCount 字段 → 「被引」行渲染占位符（—）', async () => {
    await renderPanel(makeDetail())
    expect(rowValue('被引')).toBe('—')
  })

  it('零值：citedByCount=0 → 渲染「0」而非占位符（=== undefined 判空边界）', async () => {
    await renderPanel({ ...makeDetail(), citedByCount: 0 })
    expect(rowValue('被引')).toBe('0')
  })
})
