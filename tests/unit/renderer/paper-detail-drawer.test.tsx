// @vitest-environment jsdom
/**
 * [T3-P3] 规格表抽屉渲染锁（PaperDetailPanel 渲染壳重写——数据面/动作面
 * 语义全保；视觉基准=mockups/2026-09-26_v2_theme-light.html L98-139 逐值）。
 *
 * 覆盖：四格指标真文本（引用/通读/标注/笔记——lastReadPage+1 读数）+
 * fld 键值行（YEAR-MO 脉络框联动/VENUE/DOI link 色）+关联行两态（lineage
 * 命中=年月框+连线数 link 色；未命中=「未加入脉络」）+AI 评估后置章虚线
 * 徽章（禁假数据）+状态点 enrich 态映射色+动作面九钮在场（受锁
 * export/clip/notes-off 文本面同源）。always-active 裸 describe（K3）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PaperDetail } from '../../../src/shared/models/paper'
import { makeApiStub } from '../../utils/api-client-mock'
import { makeDetail } from '../../utils/factories'

const stubApi = makeApiStub({
  library: { detail: vi.fn() },
  enrich: { fetch: vi.fn() },
  export_: { report: vi.fn(), bibtex: vi.fn(), corpus: vi.fn(), clipboard: vi.fn() },
  system: { openExternal: vi.fn() }
})

import { PaperDetailPanel } from '../../../src/renderer/features/library/PaperDetailPanel'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let host: HTMLDivElement | null = null

async function renderPanel(detail: PaperDetail, paperId = 'paper-1'): Promise<void> {
  stubApi.library.detail.mockResolvedValue({ ok: true, data: detail })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(<PaperDetailPanel paperId={paperId} />)
  })
}

/** 四格指标取值：.lib-dr-m 格内标签文本相等时返回值格文本 */
function metricValue(label: string): string | null {
  for (const cell of Array.from(host?.querySelectorAll('.lib-dr-m') ?? [])) {
    if (cell.querySelector('.lib-dr-ml')?.textContent === label) {
      return cell.querySelector('.lib-dr-v')?.textContent ?? null
    }
  }
  return null
}

/** fld 键值行取值：k 文本相等时返回 v 文本 */
function fldValue(k: string): string | null {
  for (const row of Array.from(host?.querySelectorAll('.lib-fld') ?? [])) {
    if (row.querySelector('.lib-fld-k')?.textContent === k) {
      return row.querySelector('.lib-fld-v')?.textContent ?? null
    }
  }
  return null
}

function fldRow(k: string): HTMLElement | null {
  for (const row of Array.from(host?.querySelectorAll<HTMLElement>('.lib-fld') ?? [])) {
    if (row.querySelector('.lib-fld-k')?.textContent === k) return row
  }
  return null
}

function buttonByText(text: string): HTMLButtonElement | undefined {
  return [...(host?.querySelectorAll('button') ?? [])].find((b) => b.textContent === text)
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(async () => {
  await act(async () => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
})

describe('T3-P3 规格表抽屉——四格指标真文本', () => {
  it('引用/通读/标注/笔记四格在场：引用=acc 色引用数；通读=lastReadPage+1+「页」小字', async () => {
    await renderPanel(
      makeDetail({ citedByCount: 17, lastReadPage: 5, annotationCount: 14, noteCount: 9 })
    )
    const metrics = host?.querySelector('.lib-dr-metrics')
    expect(metrics).not.toBeNull()
    expect(metricValue('引用')).toBe('17')
    expect(metricValue('通读')).toBe('6页')
    expect(metricValue('标注')).toBe('14')
    expect(metricValue('笔记')).toBe('9')
    // 引用格 acc 色（accent 值格类在场）
    const accCell = metrics?.querySelector('.lib-dr-v.acc')
    expect(accCell?.textContent).toBe('17')
  })

  it('引用缺省→「—」（undefined 判空——0 应渲染「0」）', async () => {
    await renderPanel(makeDetail({ citedByCount: 0 }))
    expect(metricValue('引用')).toBe('0')
    await act(async () => {
      root?.unmount()
    })
    await renderPanel(makeDetail())
    expect(metricValue('引用')).toBe('—')
  })
})

describe('T3-P3 规格表抽屉——键值行与关联行', () => {
  it('YEAR-MO/VENUE/DOI 三键值行：DOI link 色；无脉络时 YEAR-MO 只显示年份', async () => {
    await renderPanel(makeDetail({ doi: '10.1000/demo' }))
    expect(fldValue('YEAR-MO')).toBe('2026')
    expect(fldValue('VENUE')).toBe('Journal of Testing')
    expect(fldValue('DOI')).toBe('10.1000/demo')
    expect(fldRow('DOI')?.querySelector('.lib-fld-v.link')).not.toBeNull()
  })

  it('脉络命中：YEAR-MO 带脉络框括注+脉络行「年 · 月框 · N 条连线」link 色', async () => {
    await renderPanel(
      makeDetail({ year: 2023, lineage: { year: 2023, month: 6, edgeCount: 3, catalogNo: 1 } })
    )
    expect(fldValue('YEAR-MO')).toBe('2023（脉络框：2023 年 · 6 月）')
    expect(fldValue('脉络')).toBe('2023 年 · 6 月框 · 3 条连线')
    expect(fldRow('脉络')?.querySelector('.lib-fld-v.link')).not.toBeNull()
  })

  it('脉络命中 month=null：「未定月框」措辞（未定月=合法态）', async () => {
    await renderPanel(makeDetail({ lineage: { year: 2023, month: null, edgeCount: 1, catalogNo: 1 } }))
    expect(fldValue('YEAR-MO')).toBe('2026（脉络框：2023 年 · 未定月）')
    expect(fldValue('脉络')).toBe('2023 年 · 未定月框 · 1 条连线')
  })

  it('组合格（门一 k1-N6 回炉补例）：detail.year=null 且脉络命中→YEAR-MO 值位「—」+脉络框括注', async () => {
    await renderPanel(makeDetail({ year: null, lineage: { year: 2023, month: null, edgeCount: 2, catalogNo: 1 } }))
    expect(fldValue('YEAR-MO')).toBe('—（脉络框：2023 年 · 未定月）')
    expect(fldValue('脉络')).toBe('2023 年 · 未定月框 · 2 条连线')
  })

  it('脉络未命中：YEAR-MO 只年份+脉络行「未加入脉络」非 link 色', async () => {
    await renderPanel(makeDetail())
    expect(fldValue('YEAR-MO')).toBe('2026')
    expect(fldValue('脉络')).toBe('未加入脉络')
    expect(fldRow('脉络')?.querySelector('.lib-fld-v.link')).toBeNull()
  })

  it('AI 评估行=「后置」虚线小徽章（禁假数据——固定占位文案）', async () => {
    await renderPanel(makeDetail())
    expect(fldValue('AI 评估')).toBe('后置')
    expect(fldRow('AI 评估')?.querySelector('.lib-postpone')).not.toBeNull()
  })

  it('分节条在场：「标 签」「关 联」+TagEditor 驻留（新增标签输入框）', async () => {
    await renderPanel(makeDetail())
    const secs = Array.from(host?.querySelectorAll('.lib-dr-sec') ?? []).map((s) => s.textContent)
    expect(secs).toEqual(['标 签', '关 联'])
    expect(host?.querySelector('input[aria-label="新增标签"]')).not.toBeNull()
  })
})

describe('T3-P3 规格表抽屉——头区状态点与动作面', () => {
  it('dr-head：短号（id 前 8 位+…；≤8 位整串）+状态点 done=「已入库」ok 色', async () => {
    await renderPanel({ ...makeDetail(), id: 'paper-1234567890', enrichStatus: 'done' }, 'paper-1234567890')
    const idRow = host?.querySelector('.lib-dr-id')
    expect(idRow).not.toBeNull()
    expect(idRow?.textContent).toContain('paper-12…')
    const status = idRow?.querySelector('.lib-dr-status-ok')
    expect(status?.textContent).toContain('已入库')
  })

  it('状态点态映射：pending=「待增强」faint；failed=「增强失败」signal', async () => {
    await renderPanel(makeDetail({ enrichStatus: 'failed' }))
    expect(host?.querySelector('.lib-dr-id')?.textContent).toContain('增强失败')
    expect(host?.querySelector('.lib-dr-status-signal')).not.toBeNull()
    await act(async () => {
      root?.unmount()
    })
    await renderPanel(makeDetail({ enrichStatus: 'pending' }))
    expect(host?.querySelector('.lib-dr-id')?.textContent).toContain('待增强')
    expect(host?.querySelector('.lib-dr-status-faint')).not.toBeNull()
  })

  it('动作面九钮在场（文本逐字——受锁 export/clip/notes-off 断言面同源）+主钮 primary 类', async () => {
    await renderPanel(makeDetail({ doi: '10.1000/demo' }))
    for (const label of [
      '去阅读器写笔记',
      '编辑元数据',
      '增强元数据',
      '导出读书报告',
      '导出 BibTeX',
      '复制 BibTeX',
      '复制 CSV',
      '导出语料 md',
      '打开 DOI 页'
    ]) {
      expect(buttonByText(label), `动作钮在场：${label}`).toBeDefined()
    }
    expect(buttonByText('去阅读器写笔记')?.classList.contains('lib-dr-btn-primary')).toBe(true)
    expect(buttonByText('编辑元数据')?.classList.contains('lib-dr-btn-ghost')).toBe(true)
  })
})

describe('T3-P3 规格表抽屉——空态语义保活（R4 文案迁移）', () => {
  it('paperId=null：简文案居中（DiamondRule 库域退役）——文案逐字保留', async () => {
    stubApi.library.detail.mockResolvedValue({ ok: true, data: makeDetail() })
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () => {
      root?.render(<PaperDetailPanel paperId={null} />)
    })
    const empty = host?.querySelector('.lib-dr-empty')
    expect(empty).not.toBeNull()
    expect(host?.textContent).toContain('选中列表中的文献后显示详情')
  })
})
