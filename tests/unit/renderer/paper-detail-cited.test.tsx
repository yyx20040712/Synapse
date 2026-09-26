// @vitest-environment jsdom
/**
 * [SR2-ENR-03] PaperDetailPanel —— 被引数透出（缺陷 D：数据链全通唯独 UI 零引用）。
 * [T3-P3] 断言面随规格表抽屉改版迁移：旧「被引」键值行（p>span×2）→
 * 四格指标首格「引用」（.lib-dr-m 格 .v 值真文本）——三态强度不降。
 *
 * 覆盖：citedByCount 有值→「引用」格渲染真实文本；缺省→'—'；零值→「0」
 * （`=== undefined` 判空边界——0 不是缺省）。always-active 裸 describe
 * （K3：不经 guardedDescribe 守卫）。
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
  export_: { report: vi.fn(), bibtex: vi.fn(), corpus: vi.fn() },
  system: { openExternal: vi.fn() }
})

import { PaperDetailPanel } from '../../../src/renderer/features/library/PaperDetailPanel'

let root: Root | null = null
let host: HTMLDivElement | null = null

/** 四格指标取值（T3-P3 断言载体）：标签文本='引用' 的格返回值格文本；格不存在返回 null */
function metricValue(label: string): string | null {
  for (const cell of Array.from(host?.querySelectorAll('.lib-dr-m') ?? [])) {
    if (cell.querySelector('.lib-dr-ml')?.textContent === label) {
      return cell.querySelector('.lib-dr-v')?.textContent ?? null
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
  root = null
  host?.remove()
  host = null
})

describe('SR2-ENR-03 PaperDetailPanel —— 被引数透出（always-active）', () => {
  it('有值：citedByCount=124 → 「引用」格渲染「124」（真实文本断言）', async () => {
    await renderPanel({ ...makeDetail(), citedByCount: 124 })
    expect(metricValue('引用')).toBe('124')
  })

  it('缺省：无 citedByCount 字段 → 「引用」格渲染占位符（—）', async () => {
    await renderPanel(makeDetail())
    expect(metricValue('引用')).toBe('—')
  })

  it('零值：citedByCount=0 → 渲染「0」而非占位符（=== undefined 判空边界）', async () => {
    await renderPanel({ ...makeDetail(), citedByCount: 0 })
    expect(metricValue('引用')).toBe('0')
  })
})
