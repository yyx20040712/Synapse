/**
 * [F-LG15] manual 边不进树占位 —— 布局净化段扩展（新增锁定面）。
 *
 * 覆盖：manual 边与剔除该 manual 的输入布局恒等+零 warn（父子几何语义由
 * tree 边独占——manual 纯叠加连线仅渲染消费，票面 §1 布局条款）；manual
 * 也不进综述右列计算（kind!=='tree' 统一剔除）；层带恒等（manual 两端
 * 节点仍按 year 计层）。
 * always-active（ADR-0017 裁决 3——不经 guardedDescribe）。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LineageEdge, LineageNode } from '../../../src/shared/models/lineage'
import { layoutLineage } from '../../../src/renderer/features/lineage/lineage-layout'

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

function edge(from: string, to: string, kind: LineageEdge['kind'] = 'tree'): LineageEdge {
  return { id: `e-${from}-${to}-${kind}`, fromNode: from, toNode: to, label: '', kind, createdAt: 't', updatedAt: 't' }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('F-LG15 manual 边不进树占位（仅渲染消费——票面 §1 布局条款）', () => {
  it('manual 边不进树计算：含 manual 输入与剔除该 manual 的输入布局恒等+零 warn（manual 在前时会抢占 C 的 tree 父）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const nodes = [
      node('A', { year: 2020, title: '基础研究' }),
      node('C', { year: 2021, title: '后续工作' }),
      // 双覆盖节点作 manual from——若 manual 未剔除，S→C 会作为普通边进树
      // 计算抢占 C 的父位（manual 在前时 tree A→C 反被剔成破坏边→warn）
      node('S', { year: 2022, title: '独立早期工作', x: 500, y: 400 })
    ]
    const treeOnly = layoutLineage(nodes, [edge('A', 'C')])
    const withManual = layoutLineage(nodes, [edge('S', 'C', 'manual'), edge('A', 'C')])
    expect(withManual.positions).toEqual(treeOnly.positions)
    expect(withManual.layers).toEqual(treeOnly.layers)
    // 直接锚：C 仍挂 tree 父 A（单链对齐）；S 保持覆盖值
    expect(withManual.positions.get('C')!.x).toBe(withManual.positions.get('A')!.x)
    expect(withManual.positions.get('S')).toEqual({ x: 500, y: 400 })
    expect(warn).not.toHaveBeenCalled() // manual 分流不计 dropped（有意分流非破坏）
  })

  it('多条 manual 同子零树占位：C 的 tree 父位不被任一 manual 抢占（不限条数=布局面森林结构零变）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const nodes = [
      node('A', { year: 2020, title: '基础研究' }),
      node('M1', { year: 2019, title: '早期平行路线一' }),
      node('M2', { year: 2019, title: '早期平行路线二' }),
      node('C', { year: 2021, title: '后续工作' })
    ]
    const withManuals = layoutLineage(nodes, [
      edge('M1', 'C', 'manual'),
      edge('M2', 'C', 'manual'),
      edge('A', 'C')
    ])
    // C 与 tree 父 A 单链对齐保持；M1/M2 自成根（positions 与 treeOnly+两孤立
    // 根的对照结构逐点恒等）
    expect(withManuals.positions.get('C')!.x).toBe(withManuals.positions.get('A')!.x)
    expect(warn).not.toHaveBeenCalled()
    // 全域恒等锚：manual 剔除面与无 manual 输入对照
    const noManuals = layoutLineage(nodes, [edge('A', 'C')])
    expect(withManuals.positions.get('M1')).toEqual(noManuals.positions.get('M1'))
    expect(withManuals.positions.get('M2')).toEqual(noManuals.positions.get('M2'))
    expect(withManuals.layers).toEqual(noManuals.layers)
  })
})
