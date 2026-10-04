// @vitest-environment jsdom
/**
 * [F-LGRAPH-01②U4] 卡片三层 128×72 + 详情面板联动 —— 首红测试组（TDD）。
 *
 * 设计真相源=mockup §3.4（二轮批复定案）+design-final §1 P-7/P-6/P-11/P-13/
 * P-16/P-20/A4/A5/A6：
 * - L1（高 18）=星标占位（书页图标线框——P-11 静态禁用）→标签紧随（最多 2+
 *   溢出「+N」）；核 chip 删（退役行 9——core UI 消费面全退役）；#NNN 骑缝号
 *   保留（INV-92）。
 *   [A1a] 标签行数据源=tagNames 伴生 map（文献库标签域——Timeline props
 *   透传，键=paperId；主题节点/无键=零标签行；node.tags 私有域不再上卡）。
 * - L2=文献名 2 行 9.3px 截断。
 * - L3（高 12）=期刊缩写（faint）+IF（mono accent）+被引（mono dim「被引 N」）
 *   ——三字段全部可选省略语义（数据缺席整字段省略渲染，无「—」占位）。
 * - 星标交互（A4/T2×T3）：browse/focus 点击=no-op+title 提示；edit 点星标区=
 *   选中卡；focus 点星标区=仅星标域 no-op 不触发聚焦 toggle（两域互不串扰）。
 * - 双击卡=跳阅读器（A6——paperId 上抛；主题节点无 paperId=no-op）。
 * always-active 裸 describe（K3 威胁——三屋结构性缺位）。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LineageNode } from '../../../src/shared/models/lineage'
import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'

// act() 环境声明（lineage-timeline.test 同口径）
;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const css = readFileSync(join(process.cwd(), 'src/renderer/shared/theme-lineage-card.css'), 'utf8') // [②U4] 卡三层族拆件

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
  useLineageViewStore.setState({ mode: 'browse', focusSet: [], tool: 'select' })
})

function cardOf(id: string): HTMLElement {
  const el = host?.querySelector(`.tl-card[data-node-id="${id}"]`)
  if (!(el instanceof HTMLElement)) throw new Error(`小卡未渲染：${id}`)
  return el
}

describe('U4 卡片三层（L1 星标+标签/L2 题名/L3 期刊+IF+被引）', () => {
  it('L1 结构：星标占位（title 提示）+标签≤2+溢出「+N」+骑缝号保留；核 chip 退役（零 .mb）', () => {
    mount(
      <LineageTimeline
        nodes={[
          // [A1a 换源] 卡标签源=tagNames（[A1b] node.tags 私有域已退役——
          // LineageNode 契约无 tags 字段，断言面唯一源=文献库标签 map）
          node('A', { year: 2022, month: 9, title: '甲文献' }),
          node('B', { year: 2022, month: 9, title: '乙文献' }),
          node('T', { paperId: null, year: 2022, month: 9, title: '主题节点' })
        ]}
        edges={[]}
        pubNos={{ 'paper-A': 12, 'paper-B': 7 }}
        tagNames={{
          'paper-A': ['方法', '流域', '调度', '余量'],
          'paper-B': ['单标签']
        }}
      />
    )
    const a = cardOf('A')
    // 星标占位：静态线框+title 提示（P-11）
    const star = a.querySelector('[data-testid="card-star"]')
    expect(star).not.toBeNull()
    expect(star?.getAttribute('title')).toBe('星标功能即将开放')
    // 标签最多 2+溢出 +N（4 标签→2 渲染+「+2」）——源=文献库标签 map（A1a）
    expect([...a.querySelectorAll('.c-tag')].map((e) => e.textContent)).toEqual(['方法', '流域'])
    expect(a.querySelector('.c-tag-more')?.textContent).toBe('+2')
    // 骑缝号保留（INV-92——L1 右缘）
    expect(a.querySelector('.c-no')?.textContent).toBe('#012')
    // 单标签无溢出
    expect([...cardOf('B').querySelectorAll('.c-tag')].map((e) => e.textContent)).toEqual(['单标签'])
    expect(cardOf('B').querySelector('.c-tag-more')).toBeNull()
    // 核 chip 退役（退役行 9——core UI 消费面全退役；isCore 预计算传卡链拆除）
    expect(a.querySelector('.mb')).toBeNull()
    expect(cardOf('T').querySelector('.mb')).toBeNull()
    // 无标签卡：零 .c-tag 零 .c-tag-more
    expect(cardOf('T').querySelectorAll('.c-tag')).toHaveLength(0)
    expect(cardOf('T').querySelector('.c-tag-more')).toBeNull()
  })

  it('[A1a] 标签行换源：无 tagNames 键（含缺省 props）→零标签行（[A1b] 私有域已随契约退役）', () => {
    // 根因回归锚=用户视检「卡上标签完全不显示」：文献库 map 无键
    // →零渲染（tagNames 伴生 map=唯一卡标签源；原「node.tags 私有域不再上卡」
    // 对照面随 [A1b] LineageNode 契约收窄消亡——语义由「无键=零行」承载）
    mount(
      <LineageTimeline
        nodes={[node('A', { year: 2022, month: 9, title: '甲文献' })]}
        edges={[]}
      />
    )
    expect(cardOf('A').querySelectorAll('.c-tag')).toHaveLength(0)
    expect(cardOf('A').querySelector('.c-tag-more')).toBeNull()
  })

  it('L3 三字段真文本：期刊缩写/IF/被引 N（mono 真文本断言）', () => {
    mount(
      <LineageTimeline
        nodes={[node('A', { year: 2022, month: 9, title: '甲文献' })]}
        edges={[]}
        paperMetrics={{ 'paper-A': { citedByCount: 17, venueTier: 'T2', venue: 'Water Res.', impactFactor: 11.2 } }}
      />
    )
    const a = cardOf('A')
    expect(a.querySelector('.c-venue')?.textContent).toBe('Water Res.')
    expect(a.querySelector('.c-if')?.textContent).toBe('IF 11.2')
    expect(a.querySelector('.c-cited')?.textContent).toBe('被引 17')
  })

  it('L3 可选省略：字段缺席整字段省略渲染（无「—」占位；主题节点 L3 全省略）', () => {
    mount(
      <LineageTimeline
        nodes={[
          node('A', { year: 2022, month: 9, title: '甲文献' }), // metrics 全缺席
          node('B', { year: 2022, month: 9, title: '乙文献' }), // 仅被引
          node('C', { year: 2022, month: 9, title: '丙文献' }), // 仅期刊
          node('T', { paperId: null, year: 2022, month: 9, title: '主题节点' })
        ]}
        edges={[]}
        paperMetrics={{
          'paper-B': { citedByCount: 3, venueTier: null },
          'paper-C': { citedByCount: null, venueTier: null, venue: 'Nat. Water', impactFactor: null }
        }}
      />
    )
    // A：三字段全缺席→L3 三 span 零渲染
    expect(cardOf('A').querySelector('.c-venue')).toBeNull()
    expect(cardOf('A').querySelector('.c-if')).toBeNull()
    expect(cardOf('A').querySelector('.c-cited')).toBeNull()
    // B：仅被引（缺席字段省略——非「—」占位）
    expect(cardOf('B').querySelector('.c-venue')).toBeNull()
    expect(cardOf('B').querySelector('.c-if')).toBeNull()
    expect(cardOf('B').querySelector('.c-cited')?.textContent).toBe('被引 3')
    // C：仅期刊缩写（IF null 省略——0 值 IF 呈「IF 0」非省略）
    expect(cardOf('C').querySelector('.c-venue')?.textContent).toBe('Nat. Water')
    expect(cardOf('C').querySelector('.c-if')).toBeNull()
    expect(cardOf('C').querySelector('.c-cited')).toBeNull()
    // 主题节点：L3 全省略
    const t = cardOf('T')
    expect(t.querySelector('.c-venue')).toBeNull()
    expect(t.querySelector('.c-if')).toBeNull()
    expect(t.querySelector('.c-cited')).toBeNull()
  })

  it('星标交互（A4）：browse 点击=no-op 不触发卡选中；edit 点星标区=选中卡', () => {
    const onNodeClick = vi.fn()
    useLineageViewStore.setState({ mode: 'browse' })
    mount(<LineageTimeline nodes={[node('A', { year: 2022, month: 9 })]} edges={[]} onNodeClick={onNodeClick} />)
    const star = cardOf('A').querySelector('[data-testid="card-star"]') as HTMLElement
    act(() => {
      star.click()
    })
    expect(onNodeClick).not.toHaveBeenCalled() // browse=no-op（含卡选中面——星标域优先）
    act(() => {
      root?.render(
        <LineageTimeline
          nodes={[node('A', { year: 2022, month: 9 })]}
          edges={[]}
          onNodeClick={onNodeClick}
        />
      )
    })
    // edit：点星标区=选中卡
    useLineageViewStore.setState({ mode: 'edit' })
    act(() => {
      root?.render(
        <LineageTimeline
          nodes={[node('A', { year: 2022, month: 9 })]}
          edges={[]}
          onNodeClick={onNodeClick}
        />
      )
    })
    const starEdit = cardOf('A').querySelector('[data-testid="card-star"]') as HTMLElement
    act(() => {
      starEdit.click()
    })
    expect(onNodeClick).toHaveBeenCalledWith('A', expect.objectContaining({ stopPropagation: expect.any(Function) }))
  })

  it('T2×T3 仲裁：focus 点星标区=仅星标域 no-op（聚焦不 toggle）；点卡身=toggle', () => {
    useLineageViewStore.setState({ mode: 'focus' })
    mount(<LineageTimeline nodes={[node('A', { year: 2022, month: 9 })]} edges={[]} />)
    const card = cardOf('A')
    const star = card.querySelector('[data-testid="card-star"]') as HTMLElement
    act(() => {
      star.click()
    })
    expect(useLineageViewStore.getState().focusSet).toEqual([]) // 星标域 no-op——不触发聚焦
    act(() => {
      card.querySelector('.c-title')?.dispatchEvent(
        new MouseEvent('click', { bubbles: true })
      )
    })
    expect(useLineageViewStore.getState().focusSet).toEqual(['A']) // 卡身=聚焦 toggle
  })

  it('双击卡=跳阅读器（A6——paperId 上抛）；主题节点双击 no-op', () => {
    const onDbl = vi.fn()
    mount(
      <LineageTimeline
        nodes={[
          node('A', { year: 2022, month: 9, title: '甲文献' }),
          node('T', { paperId: null, year: 2022, month: 9, title: '主题节点' })
        ]}
        edges={[]}
        onNodeDblClick={onDbl}
      />
    )
    act(() => {
      cardOf('A').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    })
    expect(onDbl).toHaveBeenCalledWith('A')
    act(() => {
      cardOf('T').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    })
    expect(onDbl).toHaveBeenCalledTimes(1) // 主题节点（无 paperId）=no-op
  })

  it('CSS：L1 高 18/L3 高 12/题名两行截断（line-clamp 2）/星标命中区 14×14', () => {
    expect(css).toMatch(/\.c-l1\s*\{[^}]*height:\s*18px/)
    expect(css).toMatch(/\.c-l3\s*\{[^}]*height:\s*12px/)
    expect(css).toMatch(/\.c-title\s*\{[^}]*-webkit-line-clamp:\s*2/)
    expect(css).toMatch(/\.c-star\s*\{[^}]*width:\s*14px;[^}]*height:\s*14px/)
  })
})
