// @vitest-environment jsdom
/**
 * [T3-P8] 检查面板重皮肤测试（锁定合约，always-active）。覆盖：insp-cap
 * 「节点检查」+骑缝编号徽章（catalogNo 分发）/insp-title 题名/徽章行（核心
 * [core]/年月/引[citedByCount]/T 档[venueTier——mockup Q2 档字样按数据模型
 * T1/T2/T3 呈现]）/idea-cap「核 心 想 法」/AI 评估后置章占位（postpone 标记
 * +说明文案，不渲染假数据）/insp-foot 提示行/既有 testid 面全保活（meta/
 * idea/ai-notes/manual-note）+主题节点空态零变。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  ai_sensor: { listByPaper: vi.fn() },
  notes: { get: vi.fn() },
  lineage: { graph: vi.fn() }
})

import type { LineageNode } from '../../../src/shared/models/lineage'
import { LineageSidePanel } from '../../../src/renderer/features/lineage/LineageSidePanel'

function node(id: string, patch: Partial<LineageNode> = {}): LineageNode {
  return {
    id,
    paperId: `paper-${id}`,
    title: `节点${id}`,
    coreIdea: '',
    year: 2023,
    x: null,
    y: null,
    month: 6,
    slot: null,
    folderId: '__main__',
    createdAt: 't',
    updatedAt: 't',
    ...patch
  }
}

let root: Root | null = null
let host: HTMLDivElement | null = null
const q = (sel: string): Element | null => host?.querySelector(sel) ?? null

function mount(el: JSX.Element): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(el)
  })
}

const flush = async (turns = 4): Promise<void> => {
  for (let i = 0; i < turns; i++) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  stubApi.ai_sensor.listByPaper.mockResolvedValue({ ok: true, data: [] })
  stubApi.notes.get.mockResolvedValue({ ok: true, data: null })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
})

describe('[T3-P8] 检查面板重皮肤（mockup .lg-inspector 族 L675-694）', () => {
  it('insp-cap「节点检查」+骑缝编号 #NNN（[F-FOLDER-01] pubNo 分发——catalogNo 退役）；缺省不呈现编号', async () => {
    mount(
      <LineageSidePanel
        node={node('A')}
        pubNo={4}
        core={false}
        metrics={null}
        onJumpToPaper={vi.fn()}
      />
    )
    await flush()
    const cap = q('.insp-cap')
    expect(cap?.textContent).toContain('节点检查')
    expect(cap?.textContent).toContain('#004')
    expect(q('.insp-title')?.textContent).toBe('节点A')
  })

  it('徽章行：核心（core=true）/年月 YYYY-MM 补零/引 N/T 档；null 退化「引 —」「未定」', async () => {
    mount(
      <LineageSidePanel
        node={node('A', { month: 6 })}
        pubNo={1}
        core={true}
        metrics={{ citedByCount: 17, venueTier: 'T2' }}
        onJumpToPaper={vi.fn()}
      />
    )
    await flush()
    const badges = [...(q('.badges')?.querySelectorAll('.badge') ?? [])].map((b) => b.textContent)
    expect(badges).toEqual(['核心', '2023-06', '引 17', 'T2'])
    expect(q('.badge.core')?.classList.contains('core')).toBe(true)
  })

  it('年月退化：month null→年单值；metrics null→引 —/未定；theme 节点无 T 档徽章', async () => {
    mount(
      <LineageSidePanel
        node={node('A', { month: null })}
        pubNo={1}
        core={false}
        metrics={null}
        onJumpToPaper={vi.fn()}
      />
    )
    await flush()
    const badges = [...(q('.badges')?.querySelectorAll('.badge') ?? [])].map((b) => b.textContent)
    expect(badges).toEqual(['2023', '引 —', '未定'])
    mount(
      <LineageSidePanel
        node={node('T', { paperId: null })}
        pubNo={2}
        core={false}
        metrics={null}
        onJumpToPaper={vi.fn()}
      />
    )
    await flush()
    const themeBadges = [...(q('.badges')?.querySelectorAll('.badge') ?? [])].map((b) => b.textContent)
    expect(themeBadges).toEqual(['2023-06', '引 —'])
  })

  it('idea-cap「核 心 想 法」+idea 内容；AI 评估后置章（postpone 徽标+说明行，零假数据）；insp-foot 提示行', async () => {
    mount(
      <LineageSidePanel
        node={node('A', { coreIdea: '把管网拓扑显式建模为图' })}
        pubNo={1}
        core={false}
        metrics={null}
        onJumpToPaper={vi.fn()}
      />
    )
    await flush()
    expect(q('[data-testid="lineage-side-idea"] .idea-cap')?.textContent).toBe('核 心 想 法')
    expect(q('.idea')?.textContent).toBe('把管网拓扑显式建模为图')
    const postpone = q('[data-testid="lineage-side-postpone"]')
    expect(postpone?.textContent).toContain('AI 评 估 笔 记')
    expect(postpone?.querySelector('.postpone')?.textContent).toBe('后置')
    // 占位说明在场且不渲染任何评估条目（B4 后置——无 note-card 假数据）
    expect(host?.textContent).toContain('评估功能后置——当前版本不生成 AI 评估内容')
    expect(host?.querySelectorAll('.note-card').length).toBe(0)
    expect(q('.insp-foot')?.textContent).toBe(
      '单击选中 · 拖动＝月内调序 · 编辑模式：改月 / 展开选线型 / 新建连线'
    )
  })

  it('既有 testid 面全保活：meta/idea/ai-notes/manual-note；主题节点空态零变+无后置章', async () => {
    mount(<LineageSidePanel node={node('A')} onJumpToPaper={vi.fn()} />)
    await flush()
    for (const tid of ['lineage-side-panel', 'lineage-side-meta', 'lineage-side-idea', 'lineage-side-ai-notes', 'lineage-side-manual-note']) {
      expect(q(`[data-testid="${tid}"]`)).not.toBeNull()
    }
    expect(q('[data-testid="lineage-side-meta"]')?.getAttribute('data-binding')).toBe('paper')
    mount(<LineageSidePanel node={node('T', { paperId: null })} onJumpToPaper={vi.fn()} />)
    await flush()
    expect(host?.textContent).toContain('主题节点无笔记')
    expect(q('[data-testid="lineage-side-postpone"]')).toBeNull()
    expect(q('[data-testid="lineage-side-meta"]')?.getAttribute('data-binding')).toBe('theme')
  })
})
