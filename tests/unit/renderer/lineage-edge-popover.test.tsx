// @vitest-environment jsdom
/**
 * [T3-P7B] EdgeTypePopover 组件测试——票面③④（手风琴单开恒四组/基础型 chip
 * D-P7B-3/计数派生单源/sub 选中 kind+sub 成对置/新建线型内联表单 D-10 轮转+
 * 确定性 id D-P7B-4/acts 行/位置钳制 mockup L1031-1034 语义）。
 * always-active 裸 describe（K3）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toastStoreSpy } from '../../utils/api-client-mock'
import type { LineageEdge, LineTypeGroup, LineTypeSub } from '../../../src/shared/models/lineage'
import {
  BASE_NAMES,
  EdgeTypePopover,
  clampPopoverPos,
  nextSubId
} from '../../../src/renderer/features/lineage/EdgeTypePopover'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

function sub(id: string, name: string): LineTypeSub {
  return { id, name, color: '#123456', dash: '5 4', w: 2.5 }
}

const LINE_TYPES: LineTypeGroup[] = [
  { base: 'tree', subs: [sub('t1', '数据驱动')] },
  { base: 'inferred', subs: [] },
  { base: 'ref', subs: [] },
  { base: 'manual', subs: [] }
]

function edge(id: string, from: string, to: string, kind: LineageEdge['kind'], subId: string | null): LineageEdge {
  return { id, fromNode: from, toNode: to, label: '', kind, sub: subId, createdAt: 't', updatedAt: 't' }
}

let root: Root | null = null
let host: HTMLDivElement | null = null

const fns = () => ({
  onApplyLine: vi.fn(),
  onCreateLine: vi.fn(),
  onRemoveLine: vi.fn(),
  onSaveLineTypes: vi.fn(),
  onClose: vi.fn()
})

/** edit 态挂载（点边 popover）；mode/create 可换 */
function mountPop(
  mode: 'edit' | 'create',
  opts: {
    lineTypes?: LineTypeGroup[]
    edges?: LineageEdge[]
    edgeId?: string
    from?: string
    to?: string
    cx?: number
    cy?: number
    cb?: ReturnType<typeof fns>
  } = {}
): ReturnType<typeof fns> {
  const cb = opts.cb ?? fns()
  const edges = opts.edges ?? [edge('e1', 'A', 'B', 'tree', null)]
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(
      <EdgeTypePopover
        mode={mode}
        edgeId={opts.edgeId ?? 'e1'}
        from={opts.from ?? 'A'}
        to={opts.to ?? 'B'}
        cx={opts.cx ?? 400}
        cy={opts.cy ?? 300}
        lineTypes={opts.lineTypes ?? LINE_TYPES}
        edges={edges}
        onApplyLine={cb.onApplyLine}
        onCreateLine={cb.onCreateLine}
        onRemoveLine={cb.onRemoveLine}
        onSaveLineTypes={cb.onSaveLineTypes}
        onClose={cb.onClose}
      />
    )
  })
  return cb
}

function clickEl(el: Element | null): void {
  if (el === null) throw new Error('点击目标未渲染')
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  })
}

const q = (sel: string): Element | null => host?.querySelector(sel) ?? null

beforeEach(() => {
  toastStoreSpy.mockClear()
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
})

describe('T3-P7B EdgeTypePopover —— 手风琴/计数/chip', () => {
  it('恒四组（lineTypes 失配组=空 subs 兜底）+单开手风琴（点组头展开唯一）+▸/▾', () => {
    mountPop('edit', { lineTypes: [{ base: 'tree', subs: [sub('t1', '数据驱动')] }] })
    const heads = [...(host?.querySelectorAll('.acc-head') ?? [])]
    expect(heads.map((h) => h.getAttribute('data-base'))).toEqual(['tree', 'inferred', 'ref', 'manual'])
    // 初始展开=当前边 kind（tree）
    expect(q('.acc-head[data-base="tree"]')?.querySelector('.tri')?.textContent).toBe('▾')
    expect(q('.acc-body')).not.toBeNull()
    // 点 inferred 组头：单开（tree 收起）
    clickEl(q('.acc-head[data-base="inferred"]'))
    expect(q('.acc-head[data-base="inferred"]')?.querySelector('.tri')?.textContent).toBe('▾')
    expect(q('.acc-head[data-base="tree"]')?.querySelector('.tri')?.textContent).toBe('▸')
    expect(host?.querySelectorAll('.acc-body').length).toBe(1)
    expect(q('.acc-body')?.parentElement?.querySelector('.acc-head')?.getAttribute('data-base')).toBe('inferred')
  })

  it('组内首 chip=基础型（sub=null——空组必需+可回退）：空组 body 恰基础型 chip+新建钮', () => {
    mountPop('edit')
    clickEl(q('.acc-head[data-base="inferred"]'))
    const body = q('.acc-body')
    const chips = [...(body?.querySelectorAll('.schip') ?? [])]
    expect(chips.length).toBe(1)
    const base = chips[0]!
    expect(base.getAttribute('data-sub')).toBe('base')
    expect(base.querySelector('.nm')?.textContent).toBe('基础型')
    // 新建线型钮在场
    expect(body?.querySelector('[data-testid="edge-pop-newsub"]')?.textContent).toContain('新建线型')
  })

  it('计数派生 useMemo 单源：组头「N 条 · M 型」=edges/lineTypes 派生；chip ct=该 sub 边数（基础型=kind 匹配 sub null）', () => {
    mountPop('edit', {
      edges: [
        edge('e1', 'A', 'B', 'tree', 't1'),
        edge('e2', 'C', 'D', 'tree', null),
        edge('e3', 'E', 'F', 'inferred', null)
      ]
    })
    expect(q('.acc-head[data-base="tree"] .cnt')?.textContent).toBe('2 条 · 1 型')
    expect(q('.acc-head[data-base="inferred"] .cnt')?.textContent).toBe('1 条 · 0 型')
    expect(q('.schip[data-sub="base"] .ct')?.textContent).toBe('1')
    expect(q('.schip[data-sub="t1"] .ct')?.textContent).toBe('1')
  })

  it('h4 标题：edit=「线 型」/create=「线 型 · 新建连线」；foot-note 文案', () => {
    mountPop('edit')
    expect(q('h4')?.textContent).toBe('线 型')
    expect(q('.foot-note')?.textContent).toBe('B2 点击分组展开 → 选子线型')
    act(() => {
      root?.unmount()
    })
    mountPop('create')
    expect(q('h4')?.textContent).toBe('线 型 · 新建连线')
  })
})

describe('T3-P7B EdgeTypePopover —— sub 选中与 acts', () => {
  it('edit 态 chip 点击=kind+sub 成对置即时应用（跨组换 kind）+toast+popover 保持开；基础型=sub null 回退', () => {
    const lt: LineTypeGroup[] = [
      { base: 'tree', subs: [sub('t1', '数据驱动')] },
      { base: 'inferred', subs: [sub('i1', '同源推断')] },
      { base: 'ref', subs: [] },
      { base: 'manual', subs: [] }
    ]
    const cb = mountPop('edit', { lineTypes: lt })
    // 跨组选 chip：inferred 组的 i1 → (edgeId,'inferred','i1')
    clickEl(q('.acc-head[data-base="inferred"]'))
    clickEl(q('.schip[data-sub="i1"]'))
    expect(cb.onApplyLine).toHaveBeenCalledWith('e1', 'inferred', 'i1')
    expect(toastStoreSpy).toHaveBeenCalledWith(`线型已切换：${BASE_NAMES.inferred} · 同源推断`, 'success')
    // popover 保持开+选中态迁移（.on 挂新 chip）
    expect(q('[data-testid="edge-pop"]')).not.toBeNull()
    expect(q('.schip[data-sub="i1"]')?.classList.contains('on')).toBe(true)
    // 基础型 chip：sub null 回退
    toastStoreSpy.mockClear()
    clickEl(q('.schip[data-sub="base"]'))
    expect(cb.onApplyLine).toHaveBeenLastCalledWith('e1', 'inferred', null)
    expect(toastStoreSpy).toHaveBeenCalledWith(`线型已切换：${BASE_NAMES.inferred} · 基础型`, 'success')
  })

  it('create 态 chip=纯选择（不落写）；「创建连线」=onCreateLine(from,to,kind,sub)+onClose', () => {
    const cb = mountPop('create')
    clickEl(q('.schip[data-sub="t1"]'))
    expect(cb.onApplyLine).not.toHaveBeenCalled()
    expect(cb.onCreateLine).not.toHaveBeenCalled()
    clickEl(q('[data-testid="edge-pop-act-create"]'))
    expect(cb.onCreateLine).toHaveBeenCalledWith('A', 'B', 'tree', 't1')
    expect(cb.onClose).toHaveBeenCalledTimes(1)
  })

  it('edit 态「移除连线」=onRemoveLine(edgeId)+onClose；create 态无 del 钮（acts 互斥）', () => {
    const cb = mountPop('edit')
    expect(q('[data-testid="edge-pop-act-del"]')).not.toBeNull()
    expect(q('[data-testid="edge-pop-act-create"]')).toBeNull()
    clickEl(q('[data-testid="edge-pop-act-del"]'))
    expect(cb.onRemoveLine).toHaveBeenCalledWith('e1')
    expect(cb.onClose).toHaveBeenCalledTimes(1)
    act(() => {
      root?.unmount()
    })
    const cb2 = mountPop('create')
    expect(q('[data-testid="edge-pop-act-del"]')).toBeNull()
    expect(q('[data-testid="edge-pop-act-create"]')).not.toBeNull()
    expect(cb2.onRemoveLine).not.toHaveBeenCalled()
  })
})

describe('T3-P7B EdgeTypePopover —— 新建线型内联表单（D-P7B-4/D-10）', () => {
  it('nextSubId 确定性：无同前缀→-s1；最大 N+1（跳跃序号不复用最小空位）；非前缀 id 不计', () => {
    expect(nextSubId('tree', [])).toBe('tree-s1')
    expect(nextSubId('tree', [sub('tree-s1', 'a'), sub('tree-s3', 'b')])).toBe('tree-s4')
    expect(nextSubId('tree', [sub('other', 'x'), sub('tree-s2', 'b')])).toBe('tree-s3')
  })

  it('表单流：默认名「线型 N」+预览 PALETTE/DASH_ROT[subs.length] 轮转+确定=整批 saveLineTypes+edit 态自动选中即时应用+toast', () => {
    const cb = mountPop('edit')
    clickEl(q('[data-testid="edge-pop-newsub"]'))
    const nameInput = q('[data-testid="edge-pop-newsub-name"]') as HTMLInputElement | null
    expect(nameInput?.value).toBe('线型 2') // N=subs.length+1（tree 组现 1 sub t1）
    const preview = q('[data-testid="edge-pop-newsub-form"] i') as HTMLElement | null
    expect(preview).not.toBeNull()
    // D-10：索引=组内 subs.length（tree 组现 1 个 sub t1 → i=1 → PALETTE[1] #0f8a6d + DASH_ROT[1] 6 3 dashed）
    // （jsdom style 序列化=rgb 归一——经 style 属性断言）
    expect(preview?.style.borderTopColor).toBe('rgb(15, 138, 109)')
    expect(preview?.style.borderTopStyle).toBe('dashed')
    expect(preview?.style.borderTopWidth).toBe('1.7px')
    // 取消零写
    clickEl(q('[data-testid="edge-pop-newsub-cancel"]'))
    expect(cb.onSaveLineTypes).not.toHaveBeenCalled()
    expect(cb.onApplyLine).not.toHaveBeenCalled()
    // 重开→确定：整批含新 sub（id=tree-s1——组内无同前缀 t-s 序号，无则 1）
    clickEl(q('[data-testid="edge-pop-newsub"]'))
    clickEl(q('[data-testid="edge-pop-newsub-confirm"]'))
    expect(cb.onSaveLineTypes).toHaveBeenCalledTimes(1)
    const groups = cb.onSaveLineTypes.mock.calls[0]![0] as LineTypeGroup[]
    const tree = groups.find((g) => g.base === 'tree')!
    expect(tree.subs.map((s) => s.id)).toEqual(['t1', 'tree-s1'])
    const created = tree.subs[1]!
    expect(created.name).toBe('线型 2')
    expect(created.color).toBe('#0f8a6d') // PALETTE[1]
    expect(created.dash).toBe('6 3') // DASH_ROT[1]
    expect(created.w).toBe(1.7)
    // 恒四组保持
    expect(groups.map((g) => g.base)).toEqual(['tree', 'inferred', 'ref', 'manual'])
    // edit 态自动选中即时应用（队列序：saveLineTypes 先于 edge——Timeline 接线面）
    expect(cb.onApplyLine).toHaveBeenCalledWith('e1', 'tree', 'tree-s1')
    expect(toastStoreSpy).toHaveBeenCalledWith(`已新建子线型：${BASE_NAMES.tree} · 线型 2`, 'success')
    // 名称可编辑
    expect(nameInput).not.toBeNull()
  })

  it('空名确定=回退默认名（不拒不空写）', () => {
    const cb = mountPop('edit')
    clickEl(q('[data-testid="edge-pop-newsub"]'))
    const input = q('[data-testid="edge-pop-newsub-name"]') as HTMLInputElement
    act(() => {
      const proto = HTMLInputElement.prototype
      Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(input, '')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    clickEl(q('[data-testid="edge-pop-newsub-confirm"]'))
    const groups = cb.onSaveLineTypes.mock.calls[0]![0] as LineTypeGroup[]
    const tree = groups.find((g) => g.base === 'tree')!
    expect(tree.subs[1]!.name).toBe('线型 2')
  })
})

describe('T3-P7B EdgeTypePopover —— 位置钳制（mockup L1031-1034 语义）', () => {
  it('clampPopoverPos：left=clamp(6,cx−125,vw−258)/top=clamp(6,cy+14,vh−h−10)', () => {
    expect(clampPopoverPos(400, 300, 1024, 768, 200)).toEqual({ left: 275, top: 314 })
    // 左钳
    expect(clampPopoverPos(0, 300, 1024, 768, 200)).toEqual({ left: 6, top: 314 })
    // 右钳（vw−258）
    expect(clampPopoverPos(2000, 300, 1024, 768, 200).left).toBe(1024 - 258)
    // 底钳（vh−h−10）与顶钳
    expect(clampPopoverPos(400, 7000, 1024, 768, 200).top).toBe(768 - 200 - 10)
    expect(clampPopoverPos(400, -50, 1024, 768, 200).top).toBe(6)
  })

  it('DOM 定位：根挂 position:fixed+style.left/top=钳制值；根 click stopPropagation（外点关闭排除面）', () => {
    mountPop('edit', { cx: 400, cy: 300 })
    const pop = q('[data-testid="edge-pop"]') as HTMLElement
    expect(pop.style.left).toBe('275px') // jsdom innerWidth=1024 → clamp(6,275,766)
    expect(pop.style.top).toBe('314px') // h=0（jsdom 零布局）→ clamp(6,314,758)
    let reached = false
    document.addEventListener('click', () => {
      reached = true
    })
    pop.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    expect(reached).toBe(false) // stopPropagation——外点关闭 listener 不见弹层内事件
  })
})

describe('T3-P7B 回炉 1 —— EdgeTypePopover R2/R3/R5', () => {
  /** 裸挂载（saveStatus 注入面——mountPop 无该参） */
  function mount(element: JSX.Element): void {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    act(() => {
      root?.render(element)
    })
  }

  /** 同参重渲染（props 变化流——saveStatus/edges 注入面） */
  function reRender(cb: ReturnType<typeof fns>, patch: { edges?: LineageEdge[]; saveStatus?: 'saved' | 'saving' | 'error' }): void {
    act(() => {
      root?.render(
        <EdgeTypePopover
          mode="edit"
          edgeId="e1"
          from="A"
          to="B"
          cx={400}
          cy={700}
          lineTypes={LINE_TYPES}
          edges={patch.edges ?? [edge('e1', 'A', 'B', 'tree', null)]}
          saveStatus={patch.saveStatus ?? 'saved'}
          onApplyLine={cb.onApplyLine}
          onCreateLine={cb.onCreateLine}
          onRemoveLine={cb.onRemoveLine}
          onSaveLineTypes={cb.onSaveLineTypes}
          onClose={cb.onClose}
        />
      )
    })
  }

  it('[R2] 陈旧 edgeId 前置守卫：edges 查无该边→chip 点击不调 store+popover 自闭+toast（右键删边后弹层陈旧接缝）', () => {
    const cb = mountPop('edit')
    // 边被右键菜单路径移除（contextmenu 不经外点 listener——popover 持陈旧 edgeId）
    act(() => {
      root?.render(
        <EdgeTypePopover
          mode="edit"
          edgeId="e1"
          from="A"
          to="B"
          cx={400}
          cy={300}
          lineTypes={LINE_TYPES}
          edges={[]}
          onApplyLine={cb.onApplyLine}
          onCreateLine={cb.onCreateLine}
          onRemoveLine={cb.onRemoveLine}
          onSaveLineTypes={cb.onSaveLineTypes}
          onClose={cb.onClose}
        />
      )
    })
    clickEl(q('.schip[data-sub="base"]'))
    expect(cb.onApplyLine).not.toHaveBeenCalled() // store throw 路径不被触达
    expect(cb.onClose).toHaveBeenCalledTimes(1) // popover 自闭
    expect(toastStoreSpy).toHaveBeenCalledWith('连线已移除', 'info')
    // create 态 acts 同守卫面（from/to 恒在场——非目标；edit 态为唯一可达面）
  })

  it('[R3] 钳制 effect deps 含 formOpen：表单展开增高后重钳（溢视口防）', () => {
    mountPop('edit', { cx: 400, cy: 700 })
    const pop = q('[data-testid="edge-pop"]') as HTMLElement
    // 高度桩：表单在场=500 / 不在=100（jsdom 零布局——defineProperty 注入）
    Object.defineProperty(pop, 'offsetHeight', {
      get: () => (q('[data-testid="edge-pop-newsub-form"]') !== null ? 500 : 100),
      configurable: true
    })
    // 基线相位（无表单 h=100）：expanded 变化触发 effect → top=min(714,768−100−10)=658
    clickEl(q('.acc-head[data-base="inferred"]'))
    expect(pop.style.top).toBe('658px')
    // 表单展开（h=500）→effect 须重钳 top=min(714,768−500−10)=258
    clickEl(q('[data-testid="edge-pop-newsub"]'))
    expect(pop.style.top).toBe('258px')
  })

  it('[R8] 表单开着边被删→确定：onApplyLine 零调用+onClose+toast（confirmNewSub 陈旧守卫）；saveLineTypes 写保留（合法入队不动）', () => {
    const cb = mountPop('edit')
    // 开表单（saved 态）
    clickEl(q('[data-testid="edge-pop-newsub"]'))
    expect(q('[data-testid="edge-pop-newsub-form"]')).not.toBeNull()
    // 边被右键菜单路径移除（contextmenu 不经外点 listener——弹层+表单持陈旧 id）
    act(() => {
      root?.render(
        <EdgeTypePopover
          mode="edit"
          edgeId="e1"
          from="A"
          to="B"
          cx={400}
          cy={300}
          lineTypes={LINE_TYPES}
          edges={[]}
          onApplyLine={cb.onApplyLine}
          onCreateLine={cb.onCreateLine}
          onRemoveLine={cb.onRemoveLine}
          onSaveLineTypes={cb.onSaveLineTypes}
          onClose={cb.onClose}
        />
      )
    })
    clickEl(q('[data-testid="edge-pop-newsub-confirm"]'))
    expect(cb.onApplyLine).not.toHaveBeenCalled() // 陈旧边不落 apply（throw 路径不触达）
    expect(cb.onSaveLineTypes).toHaveBeenCalledTimes(1) // 线型写保留=合法入队
    expect(cb.onClose).toHaveBeenCalledTimes(1) // 弹层自闭
    expect(toastStoreSpy).toHaveBeenCalledWith('连线已移除', 'info')
  })

  it('[R5] 新建线型窗口禁建：saving/error 态「＋新建线型/确定」disabled+title；saved 可建', () => {
    const cb = fns()
    mount(
      <EdgeTypePopover
        mode="edit"
        edgeId="e1"
        from="A"
        to="B"
        cx={400}
        cy={300}
        lineTypes={LINE_TYPES}
        edges={[edge('e1', 'A', 'B', 'tree', null)]}
        saveStatus="saving"
        onApplyLine={cb.onApplyLine}
        onCreateLine={cb.onCreateLine}
        onRemoveLine={cb.onRemoveLine}
        onSaveLineTypes={cb.onSaveLineTypes}
        onClose={cb.onClose}
      />
    )
    const newsubBtn = q('[data-testid="edge-pop-newsub"]') as HTMLButtonElement
    expect(newsubBtn.disabled).toBe(true)
    expect(newsubBtn.title).toBe('等待上次保存完成')
    // error 态同禁（失败重试窗=过期 props 风险窗）
    reRender(cb, { saveStatus: 'error' })
    expect((q('[data-testid="edge-pop-newsub"]') as HTMLButtonElement).disabled).toBe(true)
    // saved：开表单+确定可点
    reRender(cb, { saveStatus: 'saved' })
    const btn2 = q('[data-testid="edge-pop-newsub"]') as HTMLButtonElement
    expect(btn2.disabled).toBe(false)
    clickEl(btn2)
    expect((q('[data-testid="edge-pop-newsub-confirm"]') as HTMLButtonElement).disabled).toBe(false)
    // 表单开着翻 saving：确定即时禁（飞行窗禁建全相位）
    reRender(cb, { saveStatus: 'saving' })
    expect((q('[data-testid="edge-pop-newsub-confirm"]') as HTMLButtonElement).disabled).toBe(true)
    expect((q('[data-testid="edge-pop-newsub-confirm"]') as HTMLButtonElement).title).toBe('等待上次保存完成')
  })
})
