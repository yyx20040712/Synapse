// @vitest-environment jsdom
/**
 * [F-LGRAPH-01②U4/A5] 详情面板改造 —— 首红测试组（TDD）。
 *
 * 设计真相源=mockup §3.4+A5/P-16/P-13/P-20：右侧常驻栏位宽 252；详情域收编
 * （完整题名/期刊缩写/IF/被引/年月/标签列/星标态禁用呈现+底部注记「双击卡片
 * 跳转阅读器」）；空选中态=「点击卡片查看详情」占位；core 徽章退役（行 9）
 * ；AI 笔记/人工笔记/标签编辑域保留（非退役面）。always-active 裸 describe。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
// 顺序契约：工厂 import 必须先于被测模块（api-client-mock 头注——写反拿真 api）
import { makeApiStub } from '../../utils/api-client-mock'
import type { LineageNode } from '../../../src/shared/models/lineage'
import { LineageSidePanel } from '../../../src/renderer/features/lineage/LineageSidePanel'

// 面板内 AI 笔记/人工笔记分节直连 window.api（side-panel.test 同型 stub）
const stubApi = makeApiStub({
  ai_sensor: { listByPaper: vi.fn() },
  notes: { get: vi.fn() },
  lineage: { graph: vi.fn() }
})
void stubApi

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const css = readFileSync(join(process.cwd(), 'src/renderer/shared/theme-lineage-card.css'), 'utf8') // [②U4] 详情面板族拆件

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

const JUMP = (): void => undefined

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
})

describe('U4 详情面板（A5/P-16/P-20）', () => {
  it('空选中态=「点击卡片查看详情」占位（P-16 常驻栏位形态）', () => {
    mount(<LineageSidePanel node={null} onJumpToPaper={JUMP} />)
    expect(host?.textContent).toContain('点击卡片查看详情')
  })

  it('详情域收编：完整题名/期刊缩写/IF/被引/年月真文本；星标态禁用呈现', () => {
    mount(
      <LineageSidePanel
        node={node('A', { title: '流域韧性评估综述', year: 2022, month: 9 })}
        onJumpToPaper={JUMP}
        metrics={{ citedByCount: 17, venueTier: 'T2', venue: 'Water Res.', impactFactor: 11.2 }}
      />
    )
    const text = host?.textContent ?? ''
    expect(text).toContain('流域韧性评估综述')
    expect(text).toContain('Water Res.')
    expect(text).toContain('IF 11.2')
    expect(text).toContain('被引 17')
    expect(text).toContain('2022-09')
    // 星标态禁用呈现（P-11——静态禁用+即将开放提示）
    const star = host?.querySelector('[data-testid="panel-star"]')
    expect(star).not.toBeNull()
    expect(star?.getAttribute('title')).toBe('星标功能即将开放')
  })

  it('可选省略：期刊/IF/被引缺席=整行省略（无「引 —」占位）；core 徽章退役零渲染', () => {
    mount(
      <LineageSidePanel
        node={node('B', { title: '乙文献', year: 2023 })}
        onJumpToPaper={JUMP}
        metrics={{ citedByCount: null, venueTier: null }}
      />
    )
    const text = host?.textContent ?? ''
    expect(text).not.toContain('引 —')
    expect(text).not.toContain('被引')
    expect(host?.querySelector('.badge.core')).toBeNull() // 行 9：core 徽章退役
    expect(css).not.toMatch(/\.badge\.core\s*\{/) // [回炉 R10] 死样式负锚（CSS 件覆盖——core 徽章声明删除）
    expect(text).not.toContain('核心') // core UI 消费面全退役（徽章行零「核心」字样）
  })

  it('底部注记=「双击卡片跳转阅读器」（A6 消费面提示；[A1b] 标签编辑域随私有域退役删）', () => {
    mount(
      <LineageSidePanel
        node={node('A')}
        onJumpToPaper={JUMP}
      />
    )
    expect(host?.textContent).toContain('双击卡片跳转阅读器')
    expect(host?.querySelector('[data-testid="lineage-side-tags"]')).toBeNull() // [A1b] 标签编辑分节退役零渲染
  })

  it('主题节点空态沿承（无笔记面文案保活）', () => {
    mount(
      <LineageSidePanel
        node={node('T', { paperId: null, title: '主题分组' })}
        onJumpToPaper={JUMP}
      />
    )
    expect(host?.textContent).toContain('主题节点无笔记')
  })

  it('CSS：详情面板常驻栏位宽 252（.lg-inspector 面板容器族）', () => {
    expect(css).toMatch(/\.lg-inspector\s*\{[^}]*width:\s*252px/)
  })
})
