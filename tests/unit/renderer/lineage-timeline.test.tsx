// @vitest-environment jsdom
/**
 * [T3-P6] 脉络时间线 —— 分组纯函数 + Timeline/Card 结构 + CSS 逐值文本锁。
 * 值源=docs/design/mockups/2026-09-26_v2_theme-light.html L203-262（时间线段逐值
 * 誊录——字号经 --fs-tl-* token 承载）；设计真相源=
 * docs/design/2026-09-26_theme-trio-final-design.md §2 脉络段 1-3+§6 票 6。
 *
 * 分组契约 INV-75：graph.nodes=lineageOrder 全序，消费方不得重排——组内序=
 * 传入序（分组器仅排分组键 year/month）。骑缝编号 INV-76 第四消费面：
 * lineageCatalogNos 单源（Timeline useMemo 全图一次计算传卡，编号随全序
 * 漂移=特性）。[F-SLOTGRID-01 U1] 瀑布族（rowsFromOffsetTops/
 * waterfallOffsets/不动点迭代三例）随瀑布布局退役删除——分行=capacity.ts
 * partitionRows 行容器网格（INV-SLOTGRID-01；遗留 rowshift 注记同步勘正）。
 * always-active 裸 describe（K3）。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LineageEdge, LineageNode } from '../../../src/shared/models/lineage'
import { groupTimeline } from '../../../src/renderer/features/lineage/lineage-timeline'
import { FRAME_PAD_LEFT, FRAME_PAD_TOP, GAP, OFFSET_O, partitionRows } from '../../../src/renderer/features/lineage/capacity'
import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'
import { TimelineYears } from '../../../src/renderer/features/lineage/TimelineYears'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'

// act() 环境声明（library-cards.test 同口径——免 React 警告刷屏）
;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

// jsdom 环境 import.meta.url 是 http: 协议——CSS 文本读取走 cwd 相对路径
// （library-cards.test 先例）
const css = readFileSync(join(process.cwd(), 'src/renderer/shared/theme-lineage.css'), 'utf8')

function node(id: string, patch: Partial<LineageNode> = {}): LineageNode {
  return {
    id,
    paperId: `paper-${id}`,
    title: `节点${id}`,
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

function edge(from: string, to: string): LineageEdge {
  return {
    id: `e-${from}-${to}`,
    fromNode: from,
    toNode: to,
    label: '',
    dashed: false,
    color: '#1e3a8a',
    createdAt: 't',
    updatedAt: 't'
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
})

/** 指定节点小卡根元素（.tl-card[data-node-id]） */
function cardOf(id: string): HTMLElement {
  const el = host?.querySelector(`.tl-card[data-node-id="${id}"]`)
  if (!(el instanceof HTMLElement)) throw new Error(`小卡未渲染：${id}`)
  return el
}

describe('T3-P6 groupTimeline 纯函数（年月分组——INV-75 组内序=传入序）', () => {
  it('乱序入参归位：year asc（null 末）→month asc（null 末=未定月收纳框同年末位）', () => {
    const groups = groupTimeline([
      node('C', { year: 2023, month: 1 }),
      node('U', { year: 2022, month: null }),
      node('B', { year: 2022, month: 9 }),
      node('A', { year: 2022, month: 3 }),
      node('N', { year: null, month: null })
    ])
    expect(groups.map((g) => g.year)).toEqual([2022, 2023, null])
    expect(groups[0]!.months.map((m) => m.month)).toEqual([3, 9, null])
    expect(groups[2]!.months.map((m) => m.month)).toEqual([null])
  })

  it('组内序保持：组内输出序=传入序（不按 slot/标题重排——分组器仅排分组键）', () => {
    const groups = groupTimeline([
      node('LATE', { year: 2022, month: 5, slot: 9 }),
      node('EARLY', { year: 2022, month: 5, slot: 1 })
    ])
    expect(groups[0]!.months[0]!.nodes.map((n) => n.id)).toEqual(['LATE', 'EARLY'])
  })

  it('空输入→空分组', () => {
    expect(groupTimeline([])).toEqual([])
  })
})

describe('T3-P6 LineageTimeline 结构渲染（真实文本）', () => {
  it('年份头纯数字（无「年」字——mockup 形态）+「N 篇」计数自分组结果派生', () => {
    mount(
      <LineageTimeline
        nodes={[
          node('A', { year: 2022, month: 9 }),
          node('B', { year: 2022, month: 9 }),
          node('C', { year: 2023, month: 1 })
        ]}
        edges={[]}
      />
    )
    expect([...(host?.querySelectorAll('.tl-year-num') ?? [])].map((e) => e.textContent)).toEqual([
      '2022',
      '2023'
    ])
    expect([...(host?.querySelectorAll('.tl-year-meta') ?? [])].map((e) => e.textContent)).toEqual([
      '2 篇',
      '1 篇'
    ])
  })

  it('null 年=「未知年份」三字文案（现有 e2e 锚保活——主控预裁）', () => {
    mount(<LineageTimeline nodes={[node('N', { year: null, month: null })]} edges={[]} />)
    expect(host?.querySelector('.tl-year-num')?.textContent).toBe('未知年份')
  })

  it('月标签「M 月 · N 篇」真文本；未定月「未定月 · N 篇」同年末位且仅月标签级变体', () => {
    mount(
      <LineageTimeline
        nodes={[
          node('A', { year: 2022, month: 9 }),
          node('B', { year: 2022, month: 9 }),
          node('U', { year: 2022, month: null })
        ]}
        edges={[]}
      />
    )
    expect([...(host?.querySelectorAll('.month-tag') ?? [])].map((e) => e.textContent)).toEqual([
      '9 月 · 2 篇',
      '未定月 · 1 篇'
    ])
    // unknown 挂月容器（.tl-month.unknown）——框本体（.month-frame）不变体
    const unknownMonth = host?.querySelector('.tl-month.unknown')
    expect(unknownMonth).not.toBeNull()
    expect(unknownMonth!.querySelector('.month-frame')!.classList.contains('unknown')).toBe(false)
    // [F-LINEAGE-02 裁决 7] 月标注入框内首位（D-L2-2：框外悬浮堵死框间通道
    // ——移入后框内顶 padding 18 承载，absolute 定位不占 flex 槽；标签整体
    // 在框内=overflow:hidden 无裁切面，d1-B1 悬出段顾虑随布局改版消灭）
    for (const tag of host?.querySelectorAll('.month-tag') ?? []) {
      expect(tag.parentElement!.classList.contains('month-frame')).toBe(true)
      expect(tag.parentElement!.firstElementChild === tag).toBe(true)
    }
  })

  it('空图空态文案保活：暂无脉络图（[②U2/A11] 工具组仅 edit 可见；[F-ALIGN-01] 文案沿承 D6 不引导+添加节点钮零残留负锚）', () => {
    useLineageViewStore.setState({ mode: 'edit' })
    mount(<LineageTimeline nodes={[]} edges={[]} />)
    expect(host?.textContent).toContain('暂无脉络图')
    // 工具条在空图在场；[F-ALIGN-01] 添加节点钮随手动添加路径退役——零残留
    // 负锚（在场即红）；[F-BAKRET-01] 导入按钮随草稿导入链退役——零残留负锚
    expect(host?.querySelector('.timeline .lg-toolbar')).not.toBeNull()
    expect(host?.querySelector('[data-testid="lineage-add-node"]')).toBeNull()
    expect(host?.querySelector('[data-testid="lineage-import"]')).toBeNull()
    expect(host?.querySelector('[data-testid="edge-pop"]')).toBeNull()
  })

  it('骑缝编号 #NNN 三位零填充（[F-FOLDER-01] pubNos 单源：库级编号经 props 传入，与组内传入序无关）', () => {
    // [F-FOLDER-01] catalogNo（图序编号）退役——节点号=该文献 pubNo（INV-92 库级
    // 派生，Board 自 store pubNos 分发）；样例值随意但彼此相异以锁呈现序
    mount(
      <LineageTimeline
        nodes={[
          node('LATE', { year: 2022, month: 5, slot: 9 }),
          node('EARLY', { year: 2022, month: 5, slot: 1 })
        ]}
        edges={[]}
        pubNos={{ 'paper-LATE': 12, 'paper-EARLY': 7 }}
      />
    )
    // 编号=pubNo 值直取（非组内序）；主题节点无键=0 不呈现编号语义
    expect(cardOf('LATE').querySelector('.c-no')?.textContent).toBe('·012')
    expect(cardOf('EARLY').querySelector('.c-no')?.textContent).toBe('·007')
  })

  it('[②U4 迁移] 卡三层真文本：L2 题名+L3 期刊/IF/被引（可选省略）；旧 c-idea/c-meta 族退役零残留', () => {
    mount(
      <LineageTimeline
        nodes={[
          node('A', { year: 2022, month: 9, title: '扩散模型起点' }),
          node('B', { year: 2022, month: null, title: '无月文献' }),
          node('T', { paperId: null, year: 2022, month: 9, title: '主题分组' }),
          node('X', { year: null, month: null, title: '未知年文献' })
        ]}
        edges={[]}
        paperMetrics={{
          'paper-A': { citedByCount: 17, venueTier: 'T2', venue: 'Water Res.', impactFactor: 9.7 },
          'paper-B': { citedByCount: null, venueTier: null }
        }}
      />
    )
    const a = cardOf('A')
    expect(a.querySelector('.c-title')?.textContent).toBe('扩散模型起点')
    expect(a.querySelector('.c-venue')?.textContent).toBe('Water Res.')
    expect(a.querySelector('.c-if')?.textContent).toBe('IF 9.7')
    expect(a.querySelector('.c-cited')?.textContent).toBe('被引 17')
    // L3 可选省略：缺席整字段省略（B/T/X 零「—」占位——年月归月框分组承载）
    for (const id of ['B', 'T', 'X']) {
      expect(cardOf(id).querySelector('.c-venue')).toBeNull()
      expect(cardOf(id).querySelector('.c-if')).toBeNull()
      expect(cardOf(id).querySelector('.c-cited')).toBeNull()
    }
    // 旧族退役（退役行 8——方案切换=删旧；core_idea 呈现面随 [A3 F-CONTRACTA-01
    // 2026-10-04] 全退役同灭——详情面板承载面已删，全文笔记承接语义）
    expect(a.querySelector('.c-idea')).toBeNull()
    expect(a.querySelector('.c-meta')).toBeNull()
    expect(a.querySelector('.c-head')).toBeNull()
  })

  it('[②U4/退役行 9] 核 chip 退役：isCore 出度≥2 卡面零 .mb 徽章（core UI 消费面全退役——数据面留 lineage-classify）', () => {
    mount(
      <LineageTimeline
        nodes={[
          node('R', { year: 2022, month: 1, title: '开宗文献' }),
          node('A', { year: 2022, month: 2, title: '继承甲' }),
          node('B', { year: 2022, month: 3, title: '继承乙' }),
          node('S', { year: 2022, month: 4, title: '领域综述：方法演进' }),
          node('T', { paperId: null, year: 2022, month: 5, title: '综述主题分组' })
        ]}
        edges={[edge('R', 'A'), edge('R', 'B')]}
      />
    )
    // 出度≥2 的 R（isCore=true 数据面在）卡面也零徽章——UI 消费面全退役
    expect(cardOf('R').querySelector('.mb')).toBeNull()
    expect(cardOf('A').querySelector('.mb')).toBeNull()
    expect(cardOf('S').querySelector('.mb.survey')).toBeNull() // U8：综述徽章退役（沿承）
    expect(cardOf('T').querySelector('.mb')).toBeNull()
  })

  it('data-kind 两值沿承（NodeCard DOM 契约——theme/paper；[U8] survey 值退役；e2e 断言面）', () => {
    mount(
      <LineageTimeline
        nodes={[
          node('A', { year: 2022, month: 1, title: '普通文献' }),
          node('T', { paperId: null, year: 2022, month: 2, title: '主题分组' }),
          node('S', { year: 2022, month: 3, title: '领域综述：方法演进' })
        ]}
        edges={[]}
      />
    )
    expect(cardOf('A').getAttribute('data-kind')).toBe('paper')
    expect(cardOf('T').getAttribute('data-kind')).toBe('theme')
    expect(cardOf('S').getAttribute('data-kind')).toBe('paper') // U8：综述题名不再分型
  })

  it('sel 类挂选中卡（inset accent 环——CSS 面）', () => {
    mount(
      <LineageTimeline
        nodes={[node('A', { year: 2022, month: 9 }), node('B', { year: 2022, month: 9 })]}
        edges={[]}
        selectedNodeId="B"
      />
    )
    expect(cardOf('B').classList.contains('sel')).toBe(true)
    expect(cardOf('A').classList.contains('sel')).toBe(false)
  })

  it('交互接缝：卡 click→onNodeClick(id, ev)；contextmenu→onNodeContextMenu(id, 锚点)', () => {
    const onClick = vi.fn()
    const onMenu = vi.fn()
    mount(<LineageTimeline nodes={[node('A', { year: 2022, month: 9 })]} edges={[]} onNodeClick={onClick} onNodeContextMenu={onMenu} />)
    act(() => {
      cardOf('A').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    // [T3-P7B] 事件透传（拾取定位面）——id+事件最小面
    expect(onClick).toHaveBeenCalledWith('A', expect.objectContaining({ clientX: expect.any(Number) }))
    act(() => {
      cardOf('A').dispatchEvent(
        new MouseEvent('contextmenu', { clientX: 200, clientY: 150, bubbles: true, cancelable: true })
      )
    })
    expect(onMenu).toHaveBeenCalledWith('A', { x: 200, y: 150 })
  })

  it('[F-SLOTGRID-01 U1] measured 行容器网格：TimelineYears frameW=570.4 五卡→两行 [3,2]（.month-frame>.tl-row>.tl-card）+奇行 .odd+卡序=数组序+零 inline margin-left（瀑布退役负锚）', () => {
    mount(
      <TimelineYears
        groups={groupTimeline([
          node('A', { year: 2022, month: 5 }),
          node('B', { year: 2022, month: 5 }),
          node('C', { year: 2022, month: 5 }),
          node('D', { year: 2022, month: 5 }),
          node('E', { year: 2022, month: 5 })
        ])}
        pubNos={new Map()}
        paperMetrics={{}}
        selectedNodeId={null}
        frameW={570.4}
        onCardClick={() => undefined}
      />
    )
    const frame = host?.querySelector('.month-frame')
    expect(frame).not.toBeNull()
    const rows = Array.from(frame?.children ?? []).filter((el) => el.classList.contains('tl-row'))
    // 分行=partitionRows 同源期望（capacity 单源——非手抄数组）
    expect(partitionRows(5, 570.4).map((r) => r.length)).toEqual([3, 2])
    expect(rows.map((r) => r.classList.contains('odd'))).toEqual([false, true])
    expect(
      rows.map((r) => Array.from(r.querySelectorAll('.tl-card')).map((c) => c.getAttribute('data-node-id')))
    ).toEqual([
      ['A', 'B', 'C'],
      ['D', 'E']
    ])
    // 卡零 inline margin-left（瀑布 inline 错位退役——在场即红）
    expect(
      Array.from(frame?.querySelectorAll('.tl-card') ?? []).map((c) => (c as HTMLElement).style.marginLeft)
    ).toEqual(['', '', '', '', ''])
  })

  it('[F-SLOTGRID-01 U1] 拖拽占位参与分行：dragSlot active→「置 入」占位与拖卡按 kids 原位入行（.dragging 尾挂）', () => {
    mount(
      <TimelineYears
        groups={groupTimeline([node('A', { year: 2022, month: 5 }), node('B', { year: 2022, month: 5 })])}
        pubNos={new Map()}
        paperMetrics={{}}
        selectedNodeId={null}
        frameW={570.4}
        dragSlot={{ srcKey: '2022|5', nodeId: 'B', insertIdx: 0, active: true, overFrame: true }}
        onCardClick={() => undefined}
      />
    )
    // kids=[占位,A,拖卡 B(.dragging)]→partition(3,570.4) 单行三槽（数组序）
    const rows = Array.from(host?.querySelectorAll('.month-frame > .tl-row') ?? [])
    expect(rows.length).toBe(1)
    expect(
      Array.from(rows[0]!.children).map((el) => [el.className.split(' ')[0], el.getAttribute('data-node-id') ?? ''])
    ).toEqual([
      ['drag-slot', ''],
      ['tl-card', 'A'],
      ['tl-card', 'B']
    ])
    expect(cardOf('B').classList.contains('dragging')).toBe(true)
  })

  it('[F-SLOTGRID-01 U3 RR1-1] 拖起幻影空行不生：满末行拖起（active 尾挂）→行数=在流数分区（kids−1）恒稳+拖卡驻末行', () => {
    // 3 卡组 W=570.4：稳定 partition(3)=[3] 单行满员；拖起（insertIdx=0）在流
    // =占位+B+C=3 → 行数恒 1。旧法 kids=4（含尾挂拖卡）→partition(4)=[3,1]
    // 溢出仅含 absolute 拖卡的空 .tl-row=.month-frame flex gap 72px 撑高框
    // 72px（拖起瞬间跳动、settle 收回）——门一 k1-W3 实锤，红证 54 号日志
    mount(
      <TimelineYears
        groups={groupTimeline([
          node('A', { year: 2022, month: 5 }),
          node('B', { year: 2022, month: 5 }),
          node('C', { year: 2022, month: 5 })
        ])}
        pubNos={new Map()}
        paperMetrics={{}}
        selectedNodeId={null}
        frameW={570.4}
        dragSlot={{ srcKey: '2022|5', nodeId: 'A', insertIdx: 0, active: true, overFrame: true }}
        onCardClick={() => undefined}
      />
    )
    const frame = host?.querySelector('.month-frame')
    expect(frame).not.toBeNull()
    const rows = Array.from(frame?.querySelectorAll(':scope > .tl-row') ?? [])
    // 行数=在流数分区（拖起前后恒 1——旧法 2=幻影空行红点）
    expect(rows.length, '满末行拖起行数恒稳（kids−1 分区——空 .tl-row 在场即红）').toBe(1)
    // 拖卡仍在树：驻末行（.dragging absolute 定位与所在行无关——.tl-row static）
    const dragging = cardOf('A')
    expect(dragging.classList.contains('dragging')).toBe(true)
    expect(rows[rows.length - 1]!.contains(dragging)).toBe(true)
    // 末行 children 序=在流序（占位+B+C）+尾挂拖卡
    expect(
      Array.from(rows[0]!.children).map((el) => [el.className.split(' ')[0], (el as HTMLElement).dataset.nodeId ?? ''])
    ).toEqual([
      ['drag-slot', ''],
      ['tl-card', 'B'],
      ['tl-card', 'C'],
      ['tl-card', 'A']
    ])
  })

  it('[F-SLOTGRID-01 U1] unmeasured 降级（jsdom 无 RO→frameW=0）：全部卡入首行单行+DOM 序不变+不崩（W=0 防御死循环锁）', () => {
    mount(
      <LineageTimeline
        nodes={[
          node('A', { year: 2022, month: 5 }),
          node('B', { year: 2022, month: 5 }),
          node('C', { year: 2022, month: 5 })
        ]}
        edges={[]}
      />
    )
    // jsdom 无 ResizeObserver=宿主 W 量测降级（use-capacity-layout 头注态机）
    const frame = host?.querySelector('.month-frame')
    expect(frame).not.toBeNull()
    const rows = Array.from(frame?.children ?? []).filter((el) => el.classList.contains('tl-row'))
    expect(rows.length).toBe(1)
    expect(
      Array.from(rows[0]!.querySelectorAll('.tl-card')).map((c) => c.getAttribute('data-node-id'))
    ).toEqual(['A', 'B', 'C'])
  })
})

describe('T3-P6 CSS 逐值文本锁（theme-lineage.css——mockup L203-262 誊录）', () => {
  // [F-VISFB-67] 断言体翻面：overflow-x hidden→auto（终裁 v3 三改之一——窄视口
  // 横滚承载）；用例标题「hidden」字样=历史措辞保留（test-surface 基线签名键
  // 冻结——标题变更走 [locked-change][test-refactor] 基线重生成，主控收口）
  it('容器：.timeline overflow-y auto/overflow-x hidden；.tl-content padding 18px 28px 46px 20px', () => {
    expect(css).toMatch(/\.timeline\s*\{[^}]*overflow-y:\s*auto;[^}]*overflow-x:\s*auto/)
    expect(css).toMatch(/\.tl-content\s*\{[^}]*padding:\s*18px 28px 46px 20px/)
  })

  it('年份头：.tl-year margin-bottom 38px；数字 serif+--fs-tl-year+--ink+letter-spacing 1px；meta mono faint；::after flex1 1px --line', () => {
    expect(css).toMatch(/\.tl-year\s*\{[^}]*margin-bottom:\s*38px/)
    expect(css).toMatch(
      /\.tl-year-num\s*\{[^}]*font-family:\s*var\(--serif\);[^}]*font-size:\s*var\(--fs-tl-year\);[^}]*color:\s*var\(--ink\);[^}]*letter-spacing:\s*1px/
    )
    expect(css).toMatch(
      /\.tl-year-meta\s*\{[^}]*font-family:\s*var\(--mono\);[^}]*font-size:\s*var\(--fs-micro\);[^}]*color:\s*var\(--faint\)/
    )
    expect(css).toMatch(
      /\.tl-year-head::after\s*\{[^}]*flex:\s*1;[^}]*height:\s*1px;[^}]*background:\s*var\(--line\)/
    )
  })

  it('月框：.tl-month margin 0 46px 26px 46px（[F-SLOTGRID-01 呈裁点 4] 右 58→46=corridor 走廊遗产回收）+position relative；.month-frame 1.6px dashed --month-dash 圆角 12 padding 18px 12px 12px 列容器（flex-direction column+gap 72px）min-height 58px；.tl-row 行容器 gap 72px+奇行 padding-left 100px（o=100 呈裁点 1）', () => {
    expect(css).toMatch(/\.tl-month\s*\{[^}]*margin:\s*0 46px 26px 46px;[^}]*position:\s*relative/)
    expect(css).toMatch(
      /\.month-frame\s*\{[^}]*border:\s*1\.6px dashed var\(--month-dash\);[^}]*border-radius:\s*12px;[^}]*padding:\s*18px 12px 12px/
    )
    expect(css).toMatch(
      /\.month-frame\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;[^}]*gap:\s*72px;[^}]*min-height:\s*58px/
    )
    expect(css).toMatch(/\.tl-row\s*\{[^}]*display:\s*flex;[^}]*gap:\s*72px/)
    expect(css).toMatch(/\.tl-row\.odd\s*\{[^}]*padding-left:\s*100px/)
    // [回炉 r1 d1-N5] 交叉锁：capacity 常量拼字面断言 CSS 含对应值——双源
    // （capacity.ts ↔ theme-lineage.css）漂移机检化（任一侧改值即红）
    expect(css).toContain(`gap: ${GAP}px`)
    expect(css).toContain(`padding-left: ${OFFSET_O}px`)
    expect(css).toContain(`padding: ${FRAME_PAD_TOP}px ${FRAME_PAD_LEFT}px`)
    // [回炉 r1 k1-N5] column 无 wrap 下 align-content=惰性死代码——负锚
    expect(css).not.toMatch(/align-content:\s*flex-start/)
    // [F-SLOTGRID-01 U1] .tl-row 不得挂 position（拖拽 .dragging absolute
    // 离流的包含块链=.month-frame 不能变——在场即红；规则形锚防注释误命中）
    expect(css).not.toMatch(/\.tl-row\s*\{[^}]*position:/)
    expect(css).not.toMatch(/\.tl-row\.odd\s*\{[^}]*position:/)
  })

  it('月标签（[F-LINEAGE-02 裁决 7] 注入框内首位）：.month-tag absolute top 0.5px left 12px 胶囊（框内顶 padding 18 承载——框间 26px 带全宽净空 D-L2-2）；未定月=月标签级变体（faint 字+--line 实线边）', () => {
    expect(css).toMatch(
      /\.month-tag\s*\{[^}]*top:\s*0\.5px;[^}]*left:\s*12px;[^}]*border-radius:\s*99px;[^}]*background:\s*var\(--panel\);[^}]*color:\s*var\(--accent\);[^}]*border:\s*1\.6px dashed var\(--month-dash\);[^}]*font-variant-numeric:\s*tabular-nums/
    )
    expect(css).toMatch(
      /\.tl-month\.unknown \.month-tag\s*\{[^}]*color:\s*var\(--faint\);[^}]*border-color:\s*var\(--line\);[^}]*border-style:\s*solid/
    )
  })

  it('预留样式类在场（A4 空月框+P8 拖入提示——票面备案无 DOM 消费）', () => {
    expect(css).toMatch(/\.month-frame\.empty-frame\s*\{[^}]*border-color:\s*var\(--line\)/)
    expect(css).toMatch(/\.frame-hint\s*\{[^}]*place-items:\s*center;[^}]*color:\s*var\(--faint\)/)
  })

  it('小卡：128×72（P-15 ①a 基准卡——卡内部三层结构归 F-LGRAPH-01 ②，本批仅几何） --mini-card 底 1px --mini-card-line 边 圆角 8 padding 5px 6px 4px shadow-card；hover=accent 边；sel=inset 1.6px accent+外辉 token', () => {
    expect(css).toMatch(
      /\.tl-card\s*\{[^}]*width:\s*128px;[^}]*min-height:\s*72px;[^}]*background:\s*var\(--mini-card\);[^}]*border:\s*1px solid var\(--mini-card-line\);[^}]*border-radius:\s*8px;[^}]*padding:\s*5px 6px 4px;[^}]*box-shadow:\s*var\(--shadow-card\)/
    )
    expect(css).toMatch(/\.tl-card:hover\s*\{[^}]*border-color:\s*var\(--accent\)/)
    expect(css).toMatch(
      /\.tl-card\.sel\s*\{[^}]*box-shadow:\s*inset 0 0 0 1\.6px var\(--accent\), var\(--shadow-tl-sel\)/
    )
  })

  it('行容器网格（[F-SLOTGRID-01 U1] 瀑布错位退役）：inline margin-left 机制/margin-left 过渡死项/测量冻结规则（tl-measure 族）全删零残留负锚+rowshift 62px 历史负锚沿承', () => {
    expect(css).not.toMatch(/\.tl-card\.rowshift/)
    expect(css).not.toMatch(/margin-left:\s*62px/)
    // [F-SLOTGRID-01 U1] 瀑布族三重退役负锚：冻结类/inline 过渡/类选择器
    expect(css).not.toMatch(/\.tl-measure/)
    expect(css).not.toMatch(/transition:\s*margin-left/)
    expect(css).not.toMatch(/margin-left:\s*82px/)
  })

  it('[②U4] c-* 微族迁移：c-no mono faint；c-title --fs-tl-title 两行 clamp；c-l1 高 18/c-l3 高 12；c-if mono accent/c-cited mono dim/c-venue faint；旧 .mb.core/.c-idea/.c-meta 零残留', () => {
    const cardCss = readFileSync(join(process.cwd(), 'src/renderer/shared/theme-lineage-card.css'), 'utf8') // [②U4] 卡三层族拆件
    expect(cardCss).toMatch(
      /\.c-no\s*\{[^}]*font-family:\s*var\(--mono\);[^}]*font-size:\s*var\(--fs-tl-meta\);[^}]*color:\s*var\(--faint\)/
    )
    expect(cardCss).toMatch(
      /\.c-title\s*\{[^}]*font-size:\s*var\(--fs-tl-title\);[^}]*font-weight:\s*600;[^}]*-webkit-line-clamp:\s*2;[^}]*overflow:\s*hidden/
    )
    expect(cardCss).toMatch(/\.c-l1\s*\{[^}]*height:\s*18px/)
    expect(cardCss).toMatch(/\.c-l3\s*\{[^}]*height:\s*12px/)
    expect(cardCss).toMatch(
      /\.c-if\s*\{[^}]*font-family:\s*var\(--mono\);[^}]*font-size:\s*var\(--fs-tl-meta\);[^}]*color:\s*var\(--accent\)/
    )
    expect(cardCss).toMatch(
      /\.c-cited\s*\{[^}]*font-family:\s*var\(--mono\);[^}]*font-size:\s*var\(--fs-tl-meta\);[^}]*color:\s*var\(--dim\)/
    )
    expect(cardCss).toMatch(/\.c-venue\s*\{[^}]*font-size:\s*var\(--fs-tl-idea\);[^}]*color:\s*var\(--faint\)/
    )
    // 旧族退役负锚（退役行 8/9——方案切换=删旧）
    expect(css).not.toMatch(/\.mb\.core/)
    expect(cardCss).not.toMatch(/\.c-idea\s*\{/) 
    expect(cardCss).not.toMatch(/\.c-meta\s*\{/) 
    expect(cardCss).not.toMatch(/\.c-head\s*\{/) 
  })
})

