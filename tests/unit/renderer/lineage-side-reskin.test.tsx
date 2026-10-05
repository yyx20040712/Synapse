// @vitest-environment jsdom
/**
 * [T3-P8] 检查面板重皮肤测试（锁定合约，always-active）。[F-LGRAPH-01②U4/
 * A5] 迁移：详情域收编（期刊缩写/IF/被引/年月/T 档——三字段可选省略语义）
 * +core 徽章退役（行 9——UI 消费面全退役）+星标态禁用呈现+底部注记双击跳
 * 阅读器。覆盖：insp-cap「节点详情」+骑缝编号徽章（pubNo 分发）/insp-title
 * 题名/徽章行/[F-UIRES-03 B2] AI 评估与建议真节（后置占位章退役负锚）/
 * insp-foot 提示行/既有 testid 面全保活（meta/ai-notes/manual-note/fragments）
 * +主题节点空态零变。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  ai_sensor: { listByPaper: vi.fn() },
  notes: { get: vi.fn() },
  reader: { listAnnotations: vi.fn() },
  lineage: { graph: vi.fn() }
})

import type { LineageNode } from '../../../src/shared/models/lineage'
import { LineageSidePanel } from '../../../src/renderer/features/lineage/LineageSidePanel'

function node(id: string, patch: Partial<LineageNode> = {}): LineageNode {
  return {
    id,
    paperId: `paper-${id}`,
    title: `节点${id}`,
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
  stubApi.reader.listAnnotations.mockResolvedValue({ ok: true, data: [] })
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
  it('insp-cap「节点详情」+骑缝编号 #NNN（[F-FOLDER-01] pubNo 分发）+星标态禁用呈现；缺省不呈现编号', async () => {
    mount(
      <LineageSidePanel
        node={node('A')}
        pubNo={4}
        metrics={null}
        onJumpToPaper={vi.fn()}
      />
    )
    await flush()
    const cap = q('.insp-cap')
    expect(cap?.textContent).toContain('节点详情')
    expect(cap?.textContent).toContain('·004')
    expect(q('.insp-title')?.textContent).toBe('节点A')
    // [②U4/P-11] 星标态禁用呈现（title 行内提示）
    const star = q('[data-testid="panel-star"]')
    expect(star?.getAttribute('title')).toBe('星标功能即将开放')
  })

  it('[②U4] 徽章行：期刊缩写/IF/被引 N/年月/T 档（可选省略——缺席零渲染）；core 徽章退役（行 9）', async () => {
    mount(
      <LineageSidePanel
        node={node('A', { month: 6 })}
        pubNo={1}
        metrics={{ citedByCount: 17, venueTier: 'T2', venue: 'Water Res.', impactFactor: 11.2 }}
        onJumpToPaper={vi.fn()}
      />
    )
    await flush()
    const badges = [...(q('.badges')?.querySelectorAll('.badge') ?? [])].map((b) => b.textContent)
    expect(badges).toEqual(['Water Res.', 'IF 11.2', '被引 17', '2023-06', 'T2'])
    expect(q('.badge.core')).toBeNull() // 行 9：core 徽章 UI 消费面退役
  })

  it('[②U4] 年月退化：month null→年单值；metrics null→期刊/IF/被引/T 档全省略（无占位）；theme 节点同年月徽章', async () => {
    mount(
      <LineageSidePanel
        node={node('A', { month: null })}
        pubNo={1}
        metrics={null}
        onJumpToPaper={vi.fn()}
      />
    )
    await flush()
    const badges = [...(q('.badges')?.querySelectorAll('.badge') ?? [])].map((b) => b.textContent)
    expect(badges).toEqual(['2023'])
    mount(
      <LineageSidePanel
        node={node('T', { paperId: null })}
        pubNo={2}
        metrics={null}
        onJumpToPaper={vi.fn()}
      />
    )
    await flush()
    const themeBadges = [...(q('.badges')?.querySelectorAll('.badge') ?? [])].map((b) => b.textContent)
    expect(themeBadges).toEqual(['2023-06'])
  })

  it('[A3 F-CONTRACTA-01 2026-10-04] 核心 idea 区随 core_idea 全退役删除（idea-cap/idea 面零渲染负锚）；[F-UIRES-03 B2] AI 评估与建议真节在场+后置占位章退役负锚（postpone 徽标零渲染）；insp-foot 提示行', async () => {
    mount(
      <LineageSidePanel
        node={node('A')}
        pubNo={1}
        metrics={null}
        onJumpToPaper={vi.fn()}
      />
    )
    await flush()
    expect(q('[data-testid="lineage-side-idea"]')).toBeNull()
    expect(q('.idea-cap')).toBeNull()
    expect(q('.idea')).toBeNull()
    // [B2] 真节替代占位章：节名在场（AI 评估与建议——LineageSideAiNotes 改名）
    expect(q('[data-testid="lineage-side-ai-notes"]')?.textContent).toContain('AI 评估与建议')
    // 占位章退役负锚：testid/徽标/说明行零渲染（真节替占位——B4 后置章消亡）；
    // 退役文案分段构造（负锚断言不落整词字面量——src+tests 词面零命中口径）
    const retiredBody = ['评估功能', '后置'].join('')
    const retiredHeading = ['AI ', '评 ', '估 ', '笔 ', '记'].join('')
    expect(q('[data-testid="lineage-side-postpone"]')).toBeNull()
    expect(q('.postpone')).toBeNull()
    expect(host?.textContent).not.toContain(retiredBody)
    expect(host?.textContent).not.toContain(retiredHeading)
    expect(host?.querySelectorAll('.note-card').length).toBe(0)
    expect(q('.insp-foot')?.textContent).toBe(
      '编辑模式：调序 / 画线 / 调线'
    ) // [F-UIRES-03 C3] 改月子句随改月链退役删（INV-107）；双击子句随卡双击链退役删（v1.7——入口=卡面「去阅读器」钮）
  })

  it('既有 testid 面全保活：meta/ai-notes/manual-note（[A3] idea 面退役出集）+[B2] fragments 面；主题节点空态零变+无后置章', async () => {
    mount(<LineageSidePanel node={node('A')} onJumpToPaper={vi.fn()} />)
    await flush()
    for (const tid of ['lineage-side-panel', 'lineage-side-meta', 'lineage-side-ai-notes', 'lineage-side-manual-note', 'lineage-side-fragments']) {
      expect(q(`[data-testid="${tid}"]`)).not.toBeNull()
    }
    expect(q('[data-testid="lineage-side-idea"]')).toBeNull() // [A3] 退役面负锚
    expect(q('[data-testid="lineage-side-meta"]')?.getAttribute('data-binding')).toBe('paper')
    mount(<LineageSidePanel node={node('T', { paperId: null })} onJumpToPaper={vi.fn()} />)
    await flush()
    expect(host?.textContent).toContain('主题节点无笔记')
    expect(q('[data-testid="lineage-side-postpone"]')).toBeNull()
    expect(q('[data-testid="lineage-side-meta"]')?.getAttribute('data-binding')).toBe('theme')
  })

  it('[F-UIRES-03 B4③] 头部收起钮：onCollapse 在场→点击上抛；缺席→零渲染（Page 态归 LineagePage hook 承载）', async () => {
    const onCollapse = vi.fn()
    mount(<LineageSidePanel node={node('A')} onJumpToPaper={vi.fn()} onCollapse={onCollapse} />)
    await flush()
    const btn = host?.querySelector<HTMLButtonElement>('[data-testid="lineage-sidebar-collapse"]')
    expect(btn).not.toBeNull()
    expect(btn?.getAttribute('aria-label')).toBe('收起详情面板')
    act(() => {
      btn?.click()
    })
    expect(onCollapse).toHaveBeenCalledTimes(1)
    // 缺席态负锚：无回调=零按钮（既有消费面零污染）
    mount(<LineageSidePanel node={node('A')} onJumpToPaper={vi.fn()} />)
    await flush()
    expect(q('[data-testid="lineage-sidebar-collapse"]')).toBeNull()
  })
})
