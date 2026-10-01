// @vitest-environment jsdom
/**
 * [F-LGRAPH-01②U7] 聚焦 dim + 画布缩放 —— 首红测试组（TDD）。
 *
 * 设计真相源=mockup §3.7/§3.1+P-4/P-12/P-18/T9：
 * - dim：focus 模式集非空——非聚焦卡+全部线（含聚焦卡邻接线）opacity 0.3
 *   （P-18 全 dim）；dim 卡 hover=临时回升 0.6；聚焦卡=accent 边框（①批 P-8
 *   已落）；集空=无 dim。
 * - 缩放：ctrl+滚轮 50%–200% 步进 10%（三模式均生效）；transform scale 作
 *   用于画布内容层内容坐标不变；缩放角标（右下）「100% ▾」+点角标=复位 100%
 *   （T9 单动作）；滚轮非 ctrl=纵向滚动沿承（不缩放）。
 * always-active 裸 describe。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import type { LineageNode } from '../../../src/shared/models/lineage'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

function node(id: string, patch: Partial<LineageNode> = {}): LineageNode {
  return {
    id,
    paperId: `paper-${id}`,
    title: `节点${id}`,
    coreIdea: '',
    year: 2022,
    x: null,
    y: null,
    month: null,
    slot: null,
    folderId: '__main__',
    createdAt: 't',
    updatedAt: 't',
    ...patch
  }
}

let root: Root | null = null
let host: HTMLDivElement | null = null

function mount(element: JSX.Element): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(element)
  })
}

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  useLineageViewStore.setState({ mode: 'browse', focusSet: [], tool: 'select', zoom: 1 })
})

function cardOf(id: string): HTMLElement {
  const el = host?.querySelector(`.tl-card[data-node-id="${id}"]`)
  if (!(el instanceof HTMLElement)) throw new Error(`小卡未渲染：${id}`)
  return el
}

describe('U7 聚焦 dim（P-12/P-18）', () => {
  it('集非空：非聚焦卡挂 .dim；聚焦卡不挂（accent 边框沿承①批）；连线层挂 .dimmed-focus（全部线 dim——P-18）', () => {
    useLineageViewStore.setState({ mode: 'focus', focusSet: ['A'] })
    mount(
      <LineageTimeline
        nodes={[node('A', { year: 2022, month: 9 }), node('B', { year: 2022, month: 9 })]}
        edges={[]}
      />
    )
    expect(cardOf('B').classList.contains('dim')).toBe(true)
    expect(cardOf('A').classList.contains('dim')).toBe(false)
    expect(cardOf('A').classList.contains('focused')).toBe(true) // ①批 P-8 沿承
    expect(host?.querySelector('.tl-edges')?.classList.contains('dimmed-focus')).toBe(true)
  })

  it('集空=无 dim（focus 模式空集合法——零 dim 类）；browse 模式集残留清空后亦无 dim', () => {
    useLineageViewStore.setState({ mode: 'focus', focusSet: [] })
    mount(
      <LineageTimeline nodes={[node('A', { year: 2022, month: 9 })]} edges={[]} />
    )
    expect(cardOf('A').classList.contains('dim')).toBe(false)
    expect(host?.querySelector('.tl-edges')?.classList.contains('dimmed-focus')).toBe(false)
  })

  it('CSS：dim 0.3+hover 回升 0.6（卡与线两域——[RR5] 线 dim 移驻逐径类，root opacity 乘法族阻断单线回升）', () => {
    const css = readFileSync(join(process.cwd(), 'src/renderer/shared/theme-lineage.css'), 'utf8')
    expect(css).toMatch(/\.tl-card\.dim\s*\{[^}]*opacity:\s*\.3/)
    expect(css).toMatch(/\.tl-card\.dim:hover\s*\{[^}]*opacity:\s*\.6/)
    expect(css).toMatch(/\.tl-edge\.dim\s*\{[^}]*opacity:\s*\.3/)
    expect(css).toMatch(/\.tl-edge\.dim\.hovered\s*\{[^}]*opacity:\s*\.6/)
    // [RR5] root 乘法 dim 退役（父 0.3×子 0.6=0.18 反更暗——回升不可达）
    expect(css).not.toMatch(/\.tl-edges\.dimmed-focus\s*\{[^}]*opacity/)
  })
})

describe('A1 挂载 reset（P-1「进页缺省」直读——与数据暂存 P-2 正交）', () => {
  it('resetForMount：mode→browse+focusSet 清空+工具态归位；navWidth 记忆不重置（P-17）', () => {
    useLineageViewStore.setState({ mode: 'focus', focusSet: ['A', 'B'], tool: 'draw-solid', linetypeListOpenFor: 'solid', navWidth: 260 })
    useLineageViewStore.getState().resetForMount()
    const v = useLineageViewStore.getState()
    expect(v.mode).toBe('browse')
    expect(v.focusSet).toEqual([])
    expect(v.tool).toBe('select')
    expect(v.linetypeListOpenFor).toBeNull()
    expect(v.navWidth).toBe(260) // P-17 记忆不随挂载重置
  })
})

describe('U7 画布缩放（P-4/T9）', () => {
  it('zoom 态：步进 10%+钳 50%–200%；resetZoom 复位 1', () => {
    const v = useLineageViewStore.getState()
    v.zoomStep(1) // 1.0→1.1
    expect(useLineageViewStore.getState().zoom).toBeCloseTo(1.1)
    for (let i = 0; i < 20; i++) v.zoomStep(1)
    expect(useLineageViewStore.getState().zoom).toBe(2) // 钳上限 200%
    for (let i = 0; i < 60; i++) v.zoomStep(-1)
    expect(useLineageViewStore.getState().zoom).toBe(0.5) // 钳下限 50%
    useLineageViewStore.getState().resetZoom()
    expect(useLineageViewStore.getState().zoom).toBe(1)
  })

  it('ctrl+滚轮=缩放（三模式均生效）；非 ctrl 滚轮不缩放', () => {
    useLineageViewStore.setState({ mode: 'browse' })
    mount(
      <LineageTimeline nodes={[node('A', { year: 2022, month: 9 })]} edges={[]} />
    )
    const tl = host?.querySelector('.timeline') as HTMLElement
    act(() => {
      tl.dispatchEvent(new WheelEvent('wheel', { ctrlKey: true, deltaY: -100, bubbles: true, cancelable: true }))
    })
    expect(useLineageViewStore.getState().zoom).toBeCloseTo(1.1)
    act(() => {
      tl.dispatchEvent(new WheelEvent('wheel', { ctrlKey: false, deltaY: -100, bubbles: true, cancelable: true }))
    })
    expect(useLineageViewStore.getState().zoom).toBeCloseTo(1.1) // 非 ctrl 不缩放
  })

  it('内容层 transform scale 随 zoom；缩放角标「110% ▾」真文本+点击复位 100%', () => {
    mount(
      <LineageTimeline nodes={[node('A', { year: 2022, month: 9 })]} edges={[]} />
    )
    const content = host?.querySelector('.tl-content') as HTMLElement
    expect(content.style.transform).toBe('') // 100%=无变换（内容坐标域基线）
    act(() => {
      useLineageViewStore.setState({ zoom: 1.1 })
    })
    expect((host?.querySelector('.tl-content') as HTMLElement).style.transform).toBe('scale(1.1)')
    const badge = host?.querySelector('[data-testid="zoom-badge"]') as HTMLElement
    expect(badge?.textContent).toContain('110%')
    act(() => {
      badge.click()
    })
    expect(useLineageViewStore.getState().zoom).toBe(1)
    expect((host?.querySelector('[data-testid="zoom-badge"]') as HTMLElement).textContent).toContain('100%')
  })
})
