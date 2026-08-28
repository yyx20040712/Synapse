/**
 * [LG-02] lineage-layout —— 布局纯函数测试（锁定合约）。
 *
 * 覆盖：单链 x 对齐/兄弟轮廓间距（不同深度子树不重叠）/年份分层 y 单调+未知层
 * 末位/森林多根并排不重叠（含孤立节点）/覆盖优先（x/y 非 null 不移动+层带仍含
 * 覆盖节点）/空图空结果/纯函数性质（两次调用深相等）/树序稳定性（边输入序非
 * id 字典序）/INV-27 破坏输入防御性剔除非崩溃（多父/环/自环/悬空边+console.warn）。
 * always-active（ADR-0017 裁决 3——不经 guardedDescribe）。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LineageEdge, LineageNode } from '../../../src/shared/models/lineage'
import {
  LAYER_GAP,
  NODE_W,
  SIBLING_GAP,
  TREE_GAP,
  layoutLineage
} from '../../../src/renderer/features/lineage/lineage-layout'

/** 节点工厂（默认文献节点、自动布局 x/y=null） */
function node(
  id: string,
  patch: Partial<Pick<LineageNode, 'year' | 'x' | 'y' | 'paperId' | 'title'>> = {}
): LineageNode {
  return {
    id,
    paperId: patch.paperId ?? `paper-${id}`,
    title: patch.title ?? `节点${id}`,
    coreIdea: '',
    year: patch.year ?? null,
    x: patch.x ?? null,
    y: patch.y ?? null,
    createdAt: 't',
    updatedAt: 't'
  }
}

/** 边工厂（from=父（继承来源）→to=子（继承者）——service 契约同向） */
function edge(from: string, to: string): LineageEdge {
  return { id: `e-${from}-${to}`, fromNode: from, toNode: to, label: '', createdAt: 't', updatedAt: 't' }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('layoutLineage —— RT tidy tree x 布局', () => {
  it('单链：全链 x 相同（居中对齐），y 按年份层', () => {
    const nodes = [node('A', { year: 2020 }), node('B', { year: 2021 }), node('C', { year: 2022 })]
    const { positions } = layoutLineage(nodes, [edge('A', 'B'), edge('B', 'C')])
    expect(positions.size).toBe(3)
    expect(positions.get('A')!.x).toBe(positions.get('B')!.x)
    expect(positions.get('B')!.x).toBe(positions.get('C')!.x)
    expect(positions.get('A')!.y).toBeLessThan(positions.get('B')!.y)
    expect(positions.get('B')!.y).toBeLessThan(positions.get('C')!.y)
  })

  it('兄弟不重叠：同层兄弟中心距 ≥ 节点宽+兄弟间距', () => {
    const nodes = [
      node('P', { year: 2020 }),
      node('C1', { year: 2021 }),
      node('C2', { year: 2021 }),
      node('C3', { year: 2021 })
    ]
    const { positions } = layoutLineage(nodes, [edge('P', 'C1'), edge('P', 'C2'), edge('P', 'C3')])
    const xs = ['C1', 'C2', 'C3'].map((id) => positions.get(id)!.x)
    expect(xs[1]! - xs[0]!).toBeGreaterThanOrEqual(NODE_W + SIBLING_GAP)
    expect(xs[2]! - xs[1]!).toBeGreaterThanOrEqual(NODE_W + SIBLING_GAP)
    // 父节点居中于子块中点（RT 经典：父 x=子块中点）
    const mid = (xs[0]! + xs[2]!) / 2
    expect(Math.abs(positions.get('P')!.x - mid)).toBeLessThan(0.5)
  })

  it('轮廓合并：兄弟放置受彼此孙层轮廓约束（跨子树同深度间距仍 ≥ 间隙）', () => {
    // A 有宽孙层（A1/A2 深度 2 占 400），B 有单子 B1（深度 2）——B 子树放置被
    // A 的深层轮廓推右：B1 左缘 ≥ A 孙层右缘+间隙（仅看根行的退化实现在此红）
    const nodes = [
      node('P', { year: 2019 }),
      node('A', { year: 2020 }),
      node('B', { year: 2020 }),
      node('A1', { year: 2021 }),
      node('A2', { year: 2021 }),
      node('B1', { year: 2021 })
    ]
    const edges = [edge('P', 'A'), edge('P', 'B'), edge('A', 'A1'), edge('A', 'A2'), edge('B', 'B1')]
    const { positions } = layoutLineage(nodes, edges)
    const grandRight =
      Math.max(positions.get('A1')!.x, positions.get('A2')!.x) + NODE_W / 2
    expect(positions.get('B1')!.x - NODE_W / 2).toBeGreaterThanOrEqual(grandRight + SIBLING_GAP)
    // 同深度兄弟根行（A 与 B）同层横向不打架
    const aRight = positions.get('A')!.x + NODE_W / 2
    expect(positions.get('B')!.x - NODE_W / 2).toBeGreaterThanOrEqual(aRight + SIBLING_GAP)
  })

  it('树序稳定性：兄弟 x 序=边输入序（非 id 字典序）', () => {
    const nodes = [node('P', { year: 2020 }), node('Z', { year: 2021 }), node('A', { year: 2021 })]
    // 输入序先 Z 后 A → Z 在左（x 更小）
    const { positions } = layoutLineage(nodes, [edge('P', 'Z'), edge('P', 'A')])
    expect(positions.get('Z')!.x).toBeLessThan(positions.get('A')!.x)
  })

  it('W1 回归：叔侄同年不重叠（门一复现参数——年份严格单调仍触发；轮廓按年份层索引非树深度）', () => {
    // 复现参数：P(2020)→A(2021)→{A1(2022),A2(2023)}，P(2020)→B(2023)——
    // A2（深度 2）与 B（深度 1）同年 2023：深度索引轮廓下 B 只受深度 1 约束，
    // 落入 A 孙层占位（门一实测重叠 70px）。断言同年层内 x 区间分离。
    const nodes = [
      node('P', { year: 2020 }),
      node('A', { year: 2021 }),
      node('A1', { year: 2022 }),
      node('A2', { year: 2023 }),
      node('B', { year: 2023 })
    ]
    const edges = [edge('P', 'A'), edge('A', 'A1'), edge('A', 'A2'), edge('P', 'B')]
    const { positions } = layoutLineage(nodes, edges)
    const a2 = positions.get('A2')!.x
    const b = positions.get('B')!.x
    expect(Math.abs(b - a2)).toBeGreaterThanOrEqual(NODE_W + SIBLING_GAP)
  })

  it('W1 延伸：父子同年（非单调数据）同层分离（父占位同层防护右推）', () => {
    // P(2020)→C(2020)：父子同年层带——父居中点与子卡重叠时须右推不叠卡
    const nodes = [node('P', { year: 2020 }), node('C', { year: 2020 })]
    const { positions } = layoutLineage(nodes, [edge('P', 'C')])
    expect(Math.abs(positions.get('P')!.x - positions.get('C')!.x)).toBeGreaterThanOrEqual(
      NODE_W + SIBLING_GAP
    )
  })

  it('SR2-LG-07 缺陷 E1：非单调年份树兄弟全不共享层不退化单列（M1 同构：根 2002→子 1883→孙 1936+2007）', () => {
    // 图五缺陷同构：Brown(2002)→Reynolds(1883)→Cross(1936)+SH(2007)——
    // 四层互不共享，旧实现兄弟约束仅共享层触发 → offset 恒 0 → 全树
    // x 相同退化单列（分支不可见）。
    // 修后推演值（手算复算，与主控简报一致）：层序 1883/1936/2002/2007
    // =0/1/2/3；Cross=90、SH=310（错开恰 220=NODE_W+SIBLING_GAP）、
    // Reynolds=Brown=200（单子链同 x，Reynolds 居中于两孙中点 (90+310)/2=200）。
    const nodes = [
      node('Brown', { year: 2002 }),
      node('Reynolds', { year: 1883 }),
      node('Cross', { year: 1936 }),
      node('SH', { year: 2007 })
    ]
    const edges = [edge('Brown', 'Reynolds'), edge('Reynolds', 'Cross'), edge('Reynolds', 'SH')]
    const { positions } = layoutLineage(nodes, edges)
    // 两孙 x 错开 ≥ NODE_W+SIBLING_GAP（非单调兄弟全不共享层也必错开）
    expect(Math.abs(positions.get('SH')!.x - positions.get('Cross')!.x)).toBeGreaterThanOrEqual(
      NODE_W + SIBLING_GAP
    )
    // 根链 x 保持：Brown 单子链与 Reynolds 同 x（单链对齐语义不回退）
    expect(positions.get('Brown')!.x).toBe(positions.get('Reynolds')!.x)
    // Reynolds 居中于两孙块（RT 经典视觉保持）
    const mid = (positions.get('Cross')!.x + positions.get('SH')!.x) / 2
    expect(Math.abs(positions.get('Reynolds')!.x - mid)).toBeLessThan(0.5)
  })

  it('SR2-LG-07 紧凑性保持：深层不共享层兄弟子树仍可交错（根占位下限不过度推开）', () => {
    // A 子树占 2021/2022 层且深层 2022 层宽达 [0,620]；B 子树全在 2023/2024
    // 层（与 A 子树零共享层）。修后推演值：A=310、B=530——中心差恰 220=
    // NODE_W+SIBLING_GAP（只有根占位参与下限，A 的深层宽轮廓不推 B）；
    // B1(2024 层)=530 与 A3(2022 层)=530 同 x（异层交错仍可发生）。
    const nodes = [
      node('P', { year: 2020 }),
      node('A', { year: 2021 }),
      node('A1', { year: 2022 }),
      node('A2', { year: 2022 }),
      node('A3', { year: 2022 }),
      node('B', { year: 2023 }),
      node('B1', { year: 2024 })
    ]
    const edges = [
      edge('P', 'A'),
      edge('A', 'A1'),
      edge('A', 'A2'),
      edge('A', 'A3'),
      edge('P', 'B'),
      edge('B', 'B1')
    ]
    const { positions } = layoutLineage(nodes, edges)
    // 兄弟根横向错开恰为下限值（防过度推开：若把根占位约束错扩成全轮廓
    // 右缘，B 被 A 的 2022 层宽轮廓 [0,620] 推到 750——中心差 440，此断言红）
    expect(positions.get('B')!.x - positions.get('A')!.x).toBe(NODE_W + SIBLING_GAP)
    // 深层交错未死：B1（2024 层）与 A3（2022 层）x 区间可重叠（不共享层
    // 子树可交错——紧凑性保持）
    expect(Math.abs(positions.get('B1')!.x - positions.get('A3')!.x)).toBeLessThan(
      NODE_W + SIBLING_GAP
    )
  })
})

describe('layoutLineage —— 年份层带（y）', () => {
  it('层带按 year 升序、null 末位；y 随层序递增（层距=常量）', () => {
    const nodes = [
      node('a', { year: 2021 }),
      node('b', { year: null }),
      node('c', { year: 2019 }),
      node('d', { year: 2020 })
    ]
    const { layers, positions } = layoutLineage(nodes, [])
    expect(layers.map((l) => l.year)).toEqual([2019, 2020, 2021, null])
    expect(layers[1]!.y - layers[0]!.y).toBe(LAYER_GAP)
    expect(layers[3]!.y - layers[2]!.y).toBe(LAYER_GAP)
    // null 年份节点归末层
    expect(positions.get('b')!.y).toBe(layers[3]!.y)
    expect(positions.get('c')!.y).toBe(layers[0]!.y)
  })

  it('同年份节点共享同一层 y；空图=空层带空位置', () => {
    const { layers, positions } = layoutLineage([], [])
    expect(layers).toEqual([])
    expect(positions.size).toBe(0)
    const r2 = layoutLineage([node('x', { year: 2024 }), node('y2', { year: 2024 })], [])
    expect(r2.layers.length).toBe(1)
    expect(r2.positions.get('x')!.y).toBe(r2.positions.get('y2')!.y)
  })
})

describe('layoutLineage —— 森林与覆盖', () => {
  it('森林多根并排不重叠：两根树+孤立节点按输入序排开（树间隙常量）', () => {
    const nodes = [
      node('R1', { year: 2020 }),
      node('R1c', { year: 2021 }),
      node('I', { year: 2020 }),
      node('R2', { year: 2021 }),
      node('R2c', { year: 2022 })
    ]
    const edges = [edge('R1', 'R1c'), edge('R2', 'R2c')]
    const { positions } = layoutLineage(nodes, edges)
    // 输入序：R1 树、孤立 I、R2 树——x 区间两两不重叠
    const box = (id: string): [number, number] => {
      const x = positions.get(id)!.x
      return [x - NODE_W / 2, x + NODE_W / 2]
    }
    const r1 = box('R1c') // R1 树最右成员（子更靠外）——树1 右缘取 max(R1, R1c)
    const t1Right = Math.max(box('R1')[1], r1[1])
    const iBox = box('I')
    const t2Left = Math.min(box('R2')[0], box('R2c')[0])
    expect(iBox[0]).toBeGreaterThanOrEqual(t1Right + TREE_GAP)
    expect(t2Left).toBeGreaterThanOrEqual(iBox[1] + TREE_GAP)
  })

  it('覆盖优先：x/y 均 null 的节点不移动，精确用覆盖值', () => {
    const nodes = [
      node('A', { year: 2020 }),
      node('O', { year: 2021, x: 777, y: 999 })
    ]
    const { positions } = layoutLineage(nodes, [])
    expect(positions.get('O')).toEqual({ x: 777, y: 999 })
  })

  it('覆盖节点仍计入层带（层带归属按 year 不变）', () => {
    // 唯一 2020 节点是 y 覆盖节点——2020 层仍出现
    const nodes = [node('O', { year: 2020, x: 5, y: 5 }), node('B', { year: 2021 })]
    const { layers, positions } = layoutLineage(nodes, [])
    expect(layers.map((l) => l.year)).toEqual([2020, 2021])
    expect(positions.get('O')!.y).toBe(5) // 覆盖值生效，层带 y 不强制
  })

  it('半覆盖：x 覆盖 y 自动（x 不进树布局，y 取层带）', () => {
    const nodes = [node('O', { year: 2020, x: 123, y: null }), node('C', { year: 2021 })]
    const edges = [edge('O', 'C')]
    const { layers, positions } = layoutLineage(nodes, edges)
    expect(positions.get('O')!.x).toBe(123)
    expect(positions.get('O')!.y).toBe(layers[0]!.y) // 自动面取层带
    // 覆盖根的子树自成根照常布局（断开不丢节点）
    expect(positions.get('C')!.x).toBeGreaterThanOrEqual(NODE_W / 2)
  })
})

describe('layoutLineage —— 纯函数性质与防御', () => {
  it('同输入两次调用深相等（含 Map 与层带）', () => {
    const nodes = [
      node('A', { year: 2020 }),
      node('B', { year: 2021 }),
      node('C', { year: null }),
      node('O', { year: 2020, x: 9, y: 9 })
    ]
    const edges = [edge('A', 'B')]
    const r1 = layoutLineage(nodes, edges)
    const r2 = layoutLineage(nodes, edges)
    expect(r1.positions).toEqual(r2.positions)
    expect(r1.layers).toEqual(r2.layers)
  })

  it('INV-27 破坏防御：多父保首条边（子归首父），剔除计数 warn 不崩溃', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const nodes = [node('A', { year: 2020 }), node('X', { year: 2020 }), node('B', { year: 2021 })]
    const edges = [edge('A', 'B'), edge('X', 'B')]
    const { positions } = layoutLineage(nodes, edges)
    expect(positions.size).toBe(3) // 不丢节点
    // B 归首父 A（X→B 剔除）：B 的 x 居于 A 下（单链对齐）
    expect(positions.get('B')!.x).toBe(positions.get('A')!.x)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]![0])).toContain('1')
  })

  it('INV-27 破坏防御：成环断边（全部节点仍有位置）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const nodes = [node('A', { year: 2020 }), node('B', { year: 2021 }), node('C', { year: 2022 })]
    const edges = [edge('A', 'B'), edge('B', 'C'), edge('C', 'A')]
    const { positions } = layoutLineage(nodes, edges)
    expect(positions.size).toBe(3)
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('INV-27 破坏防御：自环与悬空边剔除，其余布局不受影响', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const nodes = [node('A', { year: 2020 }), node('B', { year: 2021 })]
    const edges = [edge('A', 'A'), edge('GHOST', 'B'), edge('A', 'B'), edge('B', 'GHOST2')]
    const { positions } = layoutLineage(nodes, edges)
    expect(positions.get('B')!.x).toBe(positions.get('A')!.x) // A→B 保留：单链对齐
    expect(String(warn.mock.calls[0]![0])).toContain('3') // 三条剔除一次汇总
  })

  it('合法输入零 warn（防御不误伤）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const nodes = [node('A', { year: 2020 }), node('B', { year: 2021 })]
    layoutLineage(nodes, [edge('A', 'B')])
    expect(warn).not.toHaveBeenCalled()
  })
})
