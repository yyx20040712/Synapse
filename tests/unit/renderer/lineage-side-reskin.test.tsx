// @vitest-environment jsdom
/**
 * [T3-P8] 检查面板重皮肤测试（锁定合约，always-active）。[F-LGRAPH-01②U4/
 * A5] 迁移：详情域收编（期刊缩写/IF/被引/年月/T 档——三字段可选省略语义）
 * +core 徽章退役（行 9——UI 消费面全退役）+星标态禁用呈现（底部注记双击跳阅读器
 * 为历史面，脚注行已随下条 B5 删除）。覆盖：insp-cap「节点详情」+骑缝编号徽章（pubNo
 * 分发）/insp-title 题名/徽章行/[F-UIRES-03 B2] AI 评估与建议真节（后置占位章退役负锚）/
 * 既有 testid 面全保活（meta/ai-notes/manual-note/fragments）+主题节点空态零变。
 * [B5 设计稿 §3.4/§3.5/§11.4「lineage-side-reskin:186-201 断言翻转」——wave C 2026-11-25]
 * - 「编辑模式：调序 / 画线 / 调线」纯操作教学文案随 §3.5 删除：.insp-foot 零渲染（负锚）。
 * - 侧栏收起开关迁工具栏（Page 组合层＋受控 AsideHost）：SidePanel 不再收 onCollapse、SideCapRow
 *   无收起钮；工具栏右栏开关点击使 aside 实际闭合/展开（svg＋可访问名「收起/展开详情面板」）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, stubApiEvents } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  ai_sensor: { listByPaper: vi.fn() },
  notes: { get: vi.fn() },
  reader: { listAnnotations: vi.fn() },
  lineage: { graph: vi.fn() },
  // [B5 §3.4] Page 级 harness（工具栏开关→受控 AsideHost）：NavGraphPicker 文件夹域面
  folders: { list: vi.fn() },
  // [F-UIRES-04 批 3b 回炉 r1] SidePaperInfo M1 接缝面（主控裁 reject：error 态最小 DOM 增量，M2/pdfjs 链不进单测）
  library: { detail: vi.fn(() => Promise.reject(new Error('library.detail: b3b 接缝面未桩接'))) }
})

// [B5 §3.4] NavGraphPicker 订阅面（mock 代理未覆盖键透传 undefined——直调即抛）
stubApiEvents({ onFoldersChanged: vi.fn(() => () => undefined) })

import type { LineageNode } from '../../../src/shared/models/lineage'
import { LineagePage } from '../../../src/renderer/features/lineage/LineagePage'
import { LineageSidePanel } from '../../../src/renderer/features/lineage/LineageSidePanel'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'

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
  // [B5 §3.4] Page 级 harness 取数面（空图 ready＋文件夹清单）
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [], edges: [] } })
  stubApi.folders.list.mockResolvedValue({ ok: true, data: [{ id: '__main__', name: '主图', position: 0, paperCount: 0 }] })
  localStorage.clear() // 右栏宽/收起持久化（synapse:sidebar:*）——每例从缺省展开态起步
  useLineageStore.setState({ nodes: [], edges: [], status: 'ready', error: null, folderId: '__main__', saveStatus: 'clean', lastWriteError: null, queue: [], flushing: false })
  useLineageViewStore.setState({ mode: 'browse', focusSet: [], navCollapsed: false, navWidth: 208, navScrollTarget: null, activeFrameKey: null })
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
    // [F-DBCAMP-01 DB-4 / F-STAR-01 A4] 星标点亮：未标记=title「星标」
    const star = q('[data-testid="panel-star"]')
    expect(star?.getAttribute('title')).toBe('星标')
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

  it('[A3 F-CONTRACTA-01 2026-10-04] 核心 idea 区随 core_idea 全退役删除（idea-cap/idea 面零渲染负锚）；[F-UIRES-03 B2] AI 评估与建议真节在场+后置占位章退役负锚（postpone 徽标零渲染）；[B5 §3.5] insp-foot 教学文案删除（负锚）', async () => {
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
    // [B5 §3.5 文案删除 3] 侧栏底部「编辑模式：调序 / 画线 / 调线」纯操作教学文案退役——.insp-foot 零渲染、文案零命中
    expect(q('.insp-foot'), '教学脚注行零渲染').toBeNull()
    expect(host?.textContent).not.toContain('编辑模式：调序 / 画线 / 调线')
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

  it('[B5 §3.4/§11.4 断言翻转] 侧栏开关迁工具栏（Page 组合层＋受控 AsideHost）：点击使 aside 实际闭合→展开；原窗格内旧按钮零在场', async () => {
    mount(<LineagePage />)
    await flush(8)
    expect(q('[data-testid="lineage-sidebar"]'), '右栏缺省展开').not.toBeNull()
    const collapseBtn = host?.querySelector<HTMLButtonElement>('[data-testid="lineage-sidebar-collapse"]')
    expect(collapseBtn, '工具栏右栏开关在场（无需先选中节点）').not.toBeNull()
    expect(collapseBtn?.querySelector('svg'), '开关含 svg').not.toBeNull()
    expect(collapseBtn?.getAttribute('aria-label')).toBe('收起详情面板')
    expect(collapseBtn?.getAttribute('title')).toBe('收起详情面板')
    // 原窗格内重复开关零在场（SideCapRow 收起钮、48px 窄条均退役）
    expect(q('.side-collapse-btn'), 'SideCapRow 内旧收起钮零在场').toBeNull()
    expect(q('.lg-side-rail'), '窄条 rail 退役').toBeNull()
    expect(q('[data-testid="lineage-sidebar-rail"]')).toBeNull()
    expect(host?.querySelectorAll('[data-testid="lineage-sidebar-collapse"]'), '同一时刻至多一个同 testid 开关').toHaveLength(1)
    act(() => {
      collapseBtn?.click()
    })
    expect(q('[data-testid="lineage-sidebar"]'), '收起=宿主零 DOM（不占空 rail）').toBeNull()
    expect(q('[data-testid="lineage-side-panel"]')).toBeNull()
    const expandBtn = host?.querySelector<HTMLButtonElement>('[data-testid="lineage-sidebar-expand"]')
    expect(expandBtn, '收起态翻为展开开关').not.toBeNull()
    expect(expandBtn?.getAttribute('aria-label')).toBe('展开详情面板')
    expect(expandBtn?.querySelector('svg')).not.toBeNull()
    expect(q('[data-testid="lineage-sidebar-collapse"]'), '收起态收起钮退场').toBeNull()
    act(() => {
      expandBtn?.click()
    })
    expect(q('[data-testid="lineage-sidebar"]'), '展开=宿主回挂').not.toBeNull()
    expect(q('[data-testid="lineage-side-panel"]')).not.toBeNull()
  })

  it('[B5 §3.4] LineageSidePanel 不再承载收起链：有卡态面板内零收起钮（SidePanel 不收 onCollapse）', async () => {
    mount(<LineageSidePanel node={node('A')} onJumpToPaper={vi.fn()} />)
    await flush()
    expect(q('[data-testid="lineage-side-panel"]')).not.toBeNull()
    expect(q('.insp-cap')?.textContent).toContain('节点详情')
    expect(q('.insp-cap [data-testid="panel-star"]'), '骑缝行星标在场').not.toBeNull()
    expect(q('.insp-cap')?.querySelectorAll('button'), '骑缝行零 button 元素（收起钮退役；星标为 span 承载）').toHaveLength(0)
    expect(q('.insp-cap')?.querySelectorAll('[role="button"]'), '骑缝行恰一个可点面=星标').toHaveLength(1)
    expect(q('[data-testid="lineage-sidebar-collapse"]')).toBeNull()
  })
})
