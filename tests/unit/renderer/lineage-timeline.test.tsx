// @vitest-environment jsdom
/**
 * [T3-P6] 脉络时间线 —— 分组/分行纯函数 + Timeline/Card 结构 + CSS 逐值文本锁。
 * 值源=docs/design/mockups/2026-09-26_v2_theme-light.html L203-262（时间线段逐值
 * 誊录——字号经 --fs-tl-* token 承载）；设计真相源=
 * docs/design/2026-09-26_theme-trio-final-design.md §2 脉络段 1-3+§6 票 6。
 *
 * 分组契约 INV-75：graph.nodes=lineageOrder 全序，消费方不得重排——组内序=
 * 传入序（分组器仅排分组键 year/month）。骑缝编号 INV-76 第四消费面：
 * lineageCatalogNos 单源（Timeline useMemo 全图一次计算传卡，编号随全序
 * 漂移=特性）。rowshift 砖砌行错位=0 起奇数索引行（简报 §一.7 预裁——
 * mockup 注「行2 右移」1 起口径）。always-active 裸 describe（K3）。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LineageEdge, LineageNode } from '../../../src/shared/models/lineage'
import { groupTimeline, rowsFromOffsetTops, waterfallOffsets } from '../../../src/renderer/features/lineage/lineage-timeline'
import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'
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

function edge(from: string, to: string): LineageEdge {
  return {
    id: `e-${from}-${to}`,
    fromNode: from,
    toNode: to,
    label: '',
    dashed: false,
    color: '#3a5bd9',
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

describe('T3-P6 rowsFromOffsetTops 纯函数（瀑布分行基元——同行=offsetTop 相等；[F-LINEAGE-02] 消费方=waterfallOffsets）', () => {
  it('相等值归同行：[0,0,72,0,72]→[0,0,1,0,1]（行距 92=卡高 72+隙 20——夹具随批迁移）', () => {
    expect(rowsFromOffsetTops([0, 0, 72, 0, 72])).toEqual([0, 0, 1, 0, 1])
  })

  it('单行全偶不 shift：单一 offsetTop→全 0（行 0=首行）', () => {
    expect(rowsFromOffsetTops([0, 0, 0])).toEqual([0, 0, 0])
  })

  it('三行递进：[0,72,144]→[0,1,2]', () => {
    expect(rowsFromOffsetTops([0, 72, 144])).toEqual([0, 1, 2])
  })
})


describe('F-LINEAGE-02 waterfallOffsets 纯函数（P-15：步 82=卡高 72+半隙 10；节距 148=卡宽 128+隙 20；年内跨月框接续、新年复位）', () => {
  it('同年两框接续计数：框0 两行+框1 一行 → R=0/1/2 → 偏移 0/82/16（mod 148 不对齐缝隙）', () => {
    const off = waterfallOffsets([
      { year: 2022, rows: [['A', 0], ['B', 1]] },
      { year: 2022, rows: [['C', 0]] }
    ])
    expect(off.get('A')).toBeUndefined()
    expect(off.get('B')).toBe(82)
    expect(off.get('C')).toBe(16)
  })

  it('新年复位：异年框 R 从 0 起（offset 0 不入表——错位量>0 才挂）', () => {
    const off = waterfallOffsets([
      { year: 2022, rows: [['A', 0], ['B', 1]] },
      { year: 2023, rows: [['C', 0], ['D', 1]] }
    ])
    expect(off.get('C')).toBeUndefined()
    expect(off.get('D')).toBe(82)
  })

  it('深行错位序列：R=1..4 → 82/16/98/32（82·R mod 148 手推）', () => {
    const off = waterfallOffsets([{ year: 2022, rows: [['a', 0], ['b', 1], ['c', 2], ['d', 3], ['e', 4]] }])
    expect(off.get('a')).toBeUndefined()
    expect(off.get('b')).toBe(82)
    expect(off.get('c')).toBe(16)
    expect(off.get('d')).toBe(98)
    expect(off.get('e')).toBe(32)
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
    expect(cardOf('LATE').querySelector('.c-no')?.textContent).toBe('#012')
    expect(cardOf('EARLY').querySelector('.c-no')?.textContent).toBe('#007')
  })

  it('[②U4 迁移] 卡三层真文本：L2 题名+L3 期刊/IF/被引（可选省略）；旧 c-idea/c-meta 族退役零残留', () => {
    mount(
      <LineageTimeline
        nodes={[
          node('A', { year: 2022, month: 9, title: '扩散模型起点', coreIdea: '去噪范式奠基' }),
          node('B', { year: 2022, month: null, title: '无月文献', coreIdea: '' }),
          node('T', { paperId: null, year: 2022, month: 9, title: '主题分组', coreIdea: '' }),
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
    // 旧族退役（退役行 8——方案切换=删旧；core_idea 呈现面归详情面板）
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

  it('瀑布错位挂接：注入 offsetTop 分行→次行卡 inline margin-left=82px（R=1；错位量>0 才挂——依赖=分组结果重算）', async () => {
    const nodes = [
      node('A', { year: 2022, month: 5 }),
      node('B', { year: 2022, month: 5 }),
      node('C', { year: 2022, month: 5 })
    ]
    mount(<LineageTimeline nodes={nodes} edges={[]} />)
    // jsdom 无布局（offsetTop 恒 0）——defineProperty 定行（前三卡两行 0/0/72）
    const tops: Array<[string, number]> = [['A', 0], ['B', 0], ['C', 72]]
    for (const [id, top] of tops) {
      Object.defineProperty(cardOf(id), 'offsetTop', { get: () => top, configurable: true })
    }
    // 分组结果引用变化（同数据新引用——导入替换/写回填同型）→useLayoutEffect 重算
    await act(async () => {
      root?.render(<LineageTimeline nodes={nodes.map((n) => ({ ...n }))} edges={[]} />)
    })
    expect(cardOf('C').style.marginLeft).toBe('82px')
    expect(cardOf('A').style.marginLeft).toBe('')
    expect(cardOf('B').style.marginLeft).toBe('')
    expect(cardOf('C').classList.contains('rowshift')).toBe(false)
  })

  it('不动点迭代（d1-W1 回炉）：shift 改变 offsetTop 后复测至收敛——两轮量测后稳定', async () => {
    const nodes = [
      node('A', { year: 2022, month: 5 }),
      node('B', { year: 2022, month: 5 })
    ]
    mount(<LineageTimeline nodes={nodes} edges={[]} />)
    // 错位敏感布局模拟：B 无错位时量得第二行（72）→挂错位 82px；挂后
    // 仍 72（错位保持行位——真实布局单调性同型）→集合稳定收敛
    let bCalls = 0
    Object.defineProperty(cardOf('A'), 'offsetTop', { get: () => 0, configurable: true })
    Object.defineProperty(cardOf('B'), 'offsetTop', {
      get() {
        bCalls++
        return 72
      },
      configurable: true
    })
    await act(async () => {
      root?.render(<LineageTimeline nodes={nodes.map((n) => ({ ...n }))} edges={[]} />)
    })
    expect(cardOf('B').style.marginLeft).toBe('82px')
    // 迭代真实发生：首轮量测（判定 shift）+次轮复测（确认稳定）≥2 次
    expect(bCalls).toBeGreaterThanOrEqual(2)
    // [三过加固] 测量冻结类收敛后移除（防泄漏=后续 shift 挂摘动画不被永冻）
    const content = host?.querySelector('.tl-content')
    expect(content?.classList.contains('tl-measure')).toBe(false)
    // [裁决部 P1-3 source-text 锁] 冻结机制生效面：TSX 必须真挂/摘 .tl-measure
    // （断言收敛后不残留锁不住 add/remove 本身——源码文本锁补位，删实现两行即红）
    const waterfallSrc = readFileSync(
      join(process.cwd(), 'src/renderer/features/lineage/timeline-waterfall.ts'),
      'utf8'
    )
    expect(waterfallSrc).toContain("content.classList.add('tl-measure')")
    expect(waterfallSrc).toContain("content.classList.remove('tl-measure')")
  })

  it('不动点振荡守卫（k1-W2 回炉）：offsetTop 随 shift 翻转的对抗布局→8 轮上限强制停不崩', async () => {
    const nodes = [
      node('A', { year: 2022, month: 5 }),
      node('B', { year: 2022, month: 5 })
    ]
    mount(<LineageTimeline nodes={nodes} edges={[]} />)
    // 对抗布局（真实 CSS 不会出现——错位增宽行数只增）：B 的行位随自身
    // 错位翻转→每轮集合都变→无守卫则 React max-update 崩溃；守卫 8 轮停
    Object.defineProperty(cardOf('A'), 'offsetTop', { get: () => 0, configurable: true })
    Object.defineProperty(cardOf('B'), 'offsetTop', {
      get() {
        const el = cardOf('B')
        return el.style.marginLeft === '' ? 72 : 0
      },
      configurable: true
    })
    // 到此未抛 Maximum update depth = 守卫生效（摘除守卫→此处红）
    await act(async () => {
      root?.render(<LineageTimeline nodes={nodes.map((n) => ({ ...n }))} edges={[]} />)
    })
    expect(cardOf('A')).not.toBeNull()
  })
})

describe('T3-P6 CSS 逐值文本锁（theme-lineage.css——mockup L203-262 誊录）', () => {
  it('容器：.timeline overflow-y auto/overflow-x hidden；.tl-content padding 18px 28px 46px 20px', () => {
    expect(css).toMatch(/\.timeline\s*\{[^}]*overflow-y:\s*auto;[^}]*overflow-x:\s*hidden/)
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

  it('月框：.tl-month margin 0 58px 26px 46px（58px=P7 绕行走廊）+position relative；.month-frame 1.6px dashed --month-dash 圆角 12 padding 18px 12px 12px（[F-LINEAGE-02 D-L2-2] 顶 15→18 承载框内月标） gap 20px 20px min-height 58px', () => {
    expect(css).toMatch(/\.tl-month\s*\{[^}]*margin:\s*0 58px 26px 46px;[^}]*position:\s*relative/)
    expect(css).toMatch(
      /\.month-frame\s*\{[^}]*border:\s*1\.6px dashed var\(--month-dash\);[^}]*border-radius:\s*12px;[^}]*padding:\s*18px 12px 12px/
    )
    expect(css).toMatch(
      /\.month-frame\s*\{[^}]*gap:\s*20px 20px;[^}]*align-content:\s*flex-start;[^}]*min-height:\s*58px/
    )
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

  it('瀑布错位（P-15：.rowshift 类与 62px 整体退役——错位=inline margin-left 按卡传）：margin-left .25s cubic-bezier(.22,.9,.26,1) 过渡保留+测量冻结规则（三过加固）+零 rowshift 残留负锚', () => {
    expect(css).not.toMatch(/\.tl-card\.rowshift/)
    expect(css).not.toMatch(/margin-left:\s*62px/)
    expect(css).toMatch(/\.tl-card\s*\{[^}]*transition:\s*margin-left \.25s cubic-bezier\(\.22,\.9,\.26,1\)/)
    // 测量冻结：迭代期间 .tl-measure 冻结过渡（量测恒为终态布局——d1-W1 三过）
    expect(css).toMatch(/\.tl-content\.tl-measure \.tl-card\s*\{[^}]*transition:\s*none/)
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

