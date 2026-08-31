// @vitest-environment jsdom
/**
 * [F-LG14] LineageNodeCard 底行信息区（data-card-footer 填充）——含金量+年份+
 * 标签组 DOM 合约（新增锁定面；F-LG13 底行 24px 锚在本组件根保持）。
 *
 * 口径字面（主控裁决 6，用户裁决在档）：含金量=「引 {citedByCount} · {venueTier}档」
 * 并列原始值不合成单一分数；citedByCount null/undefined=「引 —」；venueTier 未映射
 * =「未定」；0=值非缺（判别 === null）。主题节点（paperId null）底行=仅年份+标签
 * （无含金量）。标签组=外框容器（data-card-tags）+内联小块（data-card-tag），
 * 无标签不渲染容器。
 * always-active（ADR-0017 裁决 3——不经 guardedDescribe）。
 */
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it } from 'vitest'
import type { LineageNode } from '../../../src/shared/models/lineage'
import type { LineagePaperMetrics } from '../../../src/shared/ipc/schemas'
import { LineageNodeCard } from '../../../src/renderer/features/lineage/LineageNodeCard'

function node(patch: Partial<LineageNode> = {}): LineageNode {
  return {
    id: 'L',
    paperId: 'paper-L',
    title: '节点L',
    coreIdea: '',
    year: 2018,
    x: null,
    y: null,
    createdAt: 't',
    updatedAt: 't',
    ...patch
  }
}

let roots: Array<() => void> = []

afterEach(() => {
  for (const dispose of roots) dispose()
  roots = []
  document.body.innerHTML = ''
})

function mountWithCleanup(n: LineageNode, metrics: LineagePaperMetrics | null): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  roots.push(() => {
    act(() => {
      root.unmount()
    })
  })
  act(() => {
    root.render(
      <LineageNodeCard
        node={n}
        pos={{ x: 0, y: 0 }}
        offset={null}
        selected={false}
        core={false}
        metrics={metrics}
        onPointerDown={() => undefined}
        onContextMenu={() => undefined}
      />
    )
  })
  return host
}

// ── 含金量文本（口径字面锚） ───────────────────────────────────

it('文献节点底行：引 42 · T1档（并列原始值）+年份+标签组三段齐备', () => {
  const host = mountWithCleanup(node({ tags: ['综述', '早期'] }), { citedByCount: 42, venueTier: 'T1' })
  const footer = host.querySelector('[data-node-id="L"] [data-card-footer]')
  expect(footer).not.toBeNull()
  expect(footer!.querySelector('[data-card-metrics]')?.textContent).toBe('引 42 · T1档')
  expect(footer!.querySelectorAll('[data-card-tag]').length).toBe(2)
  expect(footer!.querySelector('[data-card-tags]')).not.toBeNull()
  expect(footer!.querySelector('[data-card-year]')?.textContent).toBe('2018')
})

it('citedByCount null=「引 —」（venueTier 有值仍并列）；venueTier null=「未定」', () => {
  const a = mountWithCleanup(node(), { citedByCount: null, venueTier: 'T2' })
  expect(a.querySelector('[data-card-metrics]')?.textContent).toBe('引 — · T2档')
  const b = mountWithCleanup(node(), { citedByCount: 5, venueTier: null })
  expect(b.querySelector('[data-card-metrics]')?.textContent).toBe('引 5 · 未定')
})

it('双缺占位：引 — · 未定（无数据显示——不合成单一分数）', () => {
  const host = mountWithCleanup(node(), null)
  expect(host.querySelector('[data-card-metrics]')?.textContent).toBe('引 — · 未定')
})

it('citedByCount 0=值非缺：引 0（判别 === null——与「从未抓到」语义分立）', () => {
  const host = mountWithCleanup(node(), { citedByCount: 0, venueTier: 'T3' })
  expect(host.querySelector('[data-card-metrics]')?.textContent).toBe('引 0 · T3档')
})

// ── 主题节点（paperId null）：底行=仅年份+标签 ─────────────────

it('主题节点无含金量段（metrics 传入也不渲染）；年份+标签仍承载', () => {
  const host = mountWithCleanup(
    node({ paperId: null, tags: ['阶段一'] }),
    { citedByCount: 42, venueTier: 'T1' }
  )
  const footer = host.querySelector('[data-node-id="L"] [data-card-footer]')!
  expect(footer.querySelector('[data-card-metrics]')).toBeNull()
  expect(footer.querySelector('[data-card-year]')?.textContent).toBe('2018')
  expect(footer.querySelectorAll('[data-card-tag]').length).toBe(1)
})

// ── 标签组容器 ────────────────────────────────────────────────

it('无标签（null/[]）不渲染标签容器；year null=未知年份', () => {
  const a = mountWithCleanup(node({ tags: null }), null)
  expect(a.querySelector('[data-card-tags]')).toBeNull()
  const b = mountWithCleanup(node({ tags: [], year: null }), null)
  expect(b.querySelector('[data-card-tags]')).toBeNull()
  expect(b.querySelector('[data-card-year]')?.textContent).toBe('未知年份')
})

it('底行恒 24px（F-LG13 锚保持——填充不改卡结构常量）', () => {
  const host = mountWithCleanup(node({ tags: ['a'] }), { citedByCount: 1, venueTier: 'T1' })
  const footer = host.querySelector('[data-node-id="L"] [data-card-footer]') as HTMLDivElement
  expect(footer.getAttribute('style')).toContain('height: 24px')
})
