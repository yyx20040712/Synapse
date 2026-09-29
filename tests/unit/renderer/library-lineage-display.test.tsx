// @vitest-environment jsdom
/**
 * [T3-P5] C5 双升级 renderer 展示（PaperRow 序号/年月列+PaperDetailPanel 短号）
 * 锁定测试。
 *
 * 覆盖：PaperRow 序号列=入脉络（paper.lineage 存在）→三位零填充 catalogNo
 * （D-I-3：P5 不加额外前缀，与位置序同形态；F-LIBUI-01 ⑧ 起 # 前缀删）；
 * 未入脉络→ordinal 位置序现状零动；年月列级联（D-I-2）：lineage 命中且
 * year/month 齐→YYYY-MM 补零/任一 null→paper.year 单值（null→「—」现状
 * 零动）；PaperDetailPanel .lib-dr-id 短号同源：入脉络→#三位零填充
 * catalogNo（票面 ⑧ 范围=PaperRow，面板短号 # 前缀保留）/未入脉络→id 前
 * 8 位现状零动；抽屉文案（YEAR-MO）T3-P3 预渲染零动——脉络行已随「关 联」
 * 节退役（F-LIBUI-01 ⑤）。
 * 真相源=docs/design/2026-09-27_t3p5-lineage-data-layer-design-final.md §6/§7。
 * always-active（不经 guardedDescribe）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PaperSummary } from '../../../src/shared/models/paper'
import { PaperRow } from '../../../src/renderer/features/library/PaperRow'
import { makeApiStub } from '../../utils/api-client-mock'
import { makeDetail } from '../../utils/factories'

import { PaperDetailPanel } from '../../../src/renderer/features/library/PaperDetailPanel'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

function makeSummary(patch: Partial<PaperSummary> = {}): PaperSummary {
  return {
    id: 'p-1',
    title: '论文甲',
    authors: [],
    year: 2024,
    venue: 'Journal of Testing',
    doi: null,
    tagNames: [],
    collectionNames: [],
    annotationCount: 0,
    noteCount: 0,
    lastReadPage: 0,
    addedAt: 't',
    ...patch
  }
}

/** 渲染单行并取根元素 */
let rowHost: HTMLDivElement | null = null
let rowRoot: Root | null = null
async function renderRow(paper: PaperSummary, ordinal: number): Promise<HTMLElement> {
  rowHost = document.createElement('div')
  document.body.appendChild(rowHost)
  rowRoot = createRoot(rowHost)
  await act(async () => {
    rowRoot?.render(
      <PaperRow paper={paper} ordinal={ordinal} selected={false} onClick={() => undefined} onOpen={() => undefined} />
    )
  })
  const row = rowHost.querySelector('.lib-row')
  if (!(row instanceof HTMLElement)) throw new Error('未渲染 .lib-row')
  return row
}

afterEach(async () => {
  await act(async () => {
    rowRoot?.unmount()
    detailRoot?.unmount()
  })
  rowRoot = null
  detailRoot = null
  rowHost?.remove()
  detailHost?.remove()
  rowHost = null
  detailHost = null
})

describe('T3-P5 PaperRow 序号列（入脉络=catalogNo+cat 类 accent 区分；未入脉络=位置序现状零动）', () => {
  it('入脉络：三位零填充 catalogNo（ordinal 被忽略；# 前缀已删 F-LIBUI-01 ⑧）+lib-r-id.cat 类挂载；未入脉络：ordinal 位置序现状零动且无 cat 类', async () => {
    const inLineage = makeSummary({
      lineage: { year: 2021, month: 3, catalogNo: 7 }
    })
    const row = await renderRow(inLineage, 42)
    expect(row.querySelector('.lib-r-id')?.textContent).toBe('007')
    expect(row.querySelector('.lib-r-id')?.classList.contains('cat')).toBe(true)
    const plain = makeSummary()
    const row2 = await renderRow(plain, 42)
    expect(row2.querySelector('.lib-r-id')?.textContent).toBe('042')
    expect(row2.querySelector('.lib-r-id')?.classList.contains('cat')).toBe(false)
  })
})

describe('T3-P5 PaperRow 年月列级联（D-I-2 三态）', () => {
  it('lineage 命中且 year/month 齐→YYYY-MM 补零（lineage.year 为准）', async () => {
    const row = await renderRow(makeSummary({ lineage: { year: 2021, month: 3, catalogNo: 1 } }), 1)
    expect(row.querySelector('.lib-r-year')?.textContent).toBe('2021-03')
  })

  it('lineage 命中但 month=null→paper.year 单值；lineage.year=null 同（任一 null 单值）', async () => {
    const r1 = await renderRow(makeSummary({ lineage: { year: 2021, month: null, catalogNo: 1 } }), 1)
    expect(r1.querySelector('.lib-r-year')?.textContent).toBe('2024') // paper.year
    const r2 = await renderRow(
      makeSummary({ year: 1999, lineage: { year: null, month: 5, catalogNo: 2 } }),
      1
    )
    expect(r2.querySelector('.lib-r-year')?.textContent).toBe('1999')
  })

  it('未入脉络：paper.year 单值（null→「—」现状零动）', async () => {
    const r1 = await renderRow(makeSummary(), 1)
    expect(r1.querySelector('.lib-r-year')?.textContent).toBe('2024')
    const r2 = await renderRow(makeSummary({ year: null }), 1)
    expect(r2.querySelector('.lib-r-year')?.textContent).toBe('—')
  })
})

// ── PaperDetailPanel 短号同源（D-I-3） ─────────────────────────

const stubApi = makeApiStub({
  library: { detail: vi.fn() },
  enrich: { fetch: vi.fn() },
  export_: { report: vi.fn(), bibtex: vi.fn(), corpus: vi.fn(), clipboard: vi.fn() },
  system: { openExternal: vi.fn() }
})

let detailHost: HTMLDivElement | null = null
let detailRoot: Root | null = null
async function renderPanel(detail: ReturnType<typeof makeDetail>, paperId = detail.id): Promise<void> {
  stubApi.library.detail.mockResolvedValue({ ok: true, data: detail })
  detailHost = document.createElement('div')
  document.body.appendChild(detailHost)
  detailRoot = createRoot(detailHost)
  await act(async () => {
    detailRoot?.render(<PaperDetailPanel paperId={paperId} />)
  })
}

function drIdText(): string {
  const el = detailHost?.querySelector('.lib-dr-id')
  return el?.textContent ?? ''
}

describe('T3-P5 PaperDetailPanel 短号同源（D-I-3）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('入脉络：短号=#三位零填充 catalogNo（id 短号被替换）', async () => {
    await renderPanel(
      makeDetail({ id: 'paper-1234567890', lineage: { year: 2021, month: 3, edgeCount: 2, catalogNo: 12 } })
    )
    expect(drIdText()).toContain('#012')
    expect(drIdText()).not.toContain('paper-12')
  })

  it('未入脉络：id 前 8 位+…现状零动', async () => {
    await renderPanel(makeDetail({ id: 'paper-1234567890' }))
    expect(drIdText()).toContain('paper-12…')
  })

  it('抽屉文案 T3-P3 预渲染零动：lineage 命中 month 真值到达即正确（年月行；脉络行已随关联节退役 F-LIBUI-01 ⑤）', async () => {
    await renderPanel(
      makeDetail({ year: 2023, lineage: { year: 2023, month: 6, edgeCount: 3, catalogNo: 1 } })
    )
    const flds = Array.from(detailHost?.querySelectorAll('.lib-fld') ?? []).map((row) => ({
      k: row.querySelector('.lib-fld-k')?.textContent ?? '',
      v: row.querySelector('.lib-fld-v')?.textContent ?? ''
    }))
    expect(flds.find((f) => f.k === 'YEAR-MO')?.v).toBe('2023（脉络框：2023 年 · 6 月）')
    expect(flds.find((f) => f.k === '脉络'), '脉络行已退役').toBeUndefined()
  })
})
