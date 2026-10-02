/**
 * [R2-LG11] lineage-classify —— 核心档判定纯函数测试（锁定合约，
 * always-active——不经 guardedDescribe）。
 *
 * 决2 D1'：核心=文献节点（paperId≠null）且出度（被继承边）≥2。
 * [F-LGRAPH-01②U8] isSurvey/isSurveyTitle 随 ref 综述边体系退役删除
 * （mockup §3.8 行 6）——isCore 综述排除分支同撤（core 判定简化；core 的
 * UI 消费面归轮 2 详情面板退役，数据面留 AI 重做域评估）。
 */
import { describe, expect, it } from 'vitest'
import type { LineageEdge, LineageNode } from '../../../src/shared/models/lineage'
import { isCore } from '../../../src/renderer/features/lineage/lineage-classify'

/** 节点工厂（默认文献节点） */
function node(
  id: string,
  patch: Partial<Pick<LineageNode, 'paperId' | 'title'>> = {}
): LineageNode {
  return {
    id,
    paperId: patch.paperId !== undefined ? patch.paperId : `paper-${id}`,
    title: patch.title ?? `节点${id}`,
    coreIdea: '',
    year: null,
    x: null,
    y: null,
    month: null,
    slot: null,
    folderId: '__main__',
    createdAt: 't',
    updatedAt: 't'
  }
}

/** 边工厂（from=父→to=子——出度计数面=fromNode） */
function edge(from: string, to: string): LineageEdge {
  return { id: `e-${from}-${to}`, fromNode: from, toNode: to, label: '', dashed: false, color: '#3a5bd9', createdAt: 't', updatedAt: 't' }
}

describe('isCore —— 核心档判定（决2 D1\'：文献节点出度 ≥2）', () => {
  /**
   * 出度口径裁决（2026-08-29 真机复评修正）：初版「入度≥2」在树单父约束下
   * 数学恒假——「被引用数≥2 的开宗立派论文」=≥2 个继承者=**出度**≥2。
   */
  it('出度边界：2 条被继承边=核心，1 条=非核心', () => {
    const n = node('X', { title: '开宗立派方法论' })
    expect(isCore(n, [edge('X', 'A'), edge('X', 'B')])).toBe(true)
    expect(isCore(n, [edge('X', 'A')])).toBe(false)
    expect(isCore(n, [])).toBe(false)
  })

  it('主题排除：paperId null（主题节点）即使出度 ≥2 非核心', () => {
    const n = node('T', { paperId: null, title: '主题分组' })
    expect(isCore(n, [edge('T', 'A'), edge('T', 'B')])).toBe(false)
  })

  it('入度不计：入度 5（多父非法图直喂——树内不可达形态）出度 1 仍非核心', () => {
    const n = node('P', { title: '开宗' })
    const edges = [
      edge('A', 'P'),
      edge('B', 'P'),
      edge('C', 'P'),
      edge('D', 'P'),
      edge('E', 'P'),
      edge('P', 'C1')
    ]
    expect(isCore(n, edges)).toBe(false)
  })

  it('出度以 fromNode 精确匹配：目标仅出现在 toNode 侧不计入', () => {
    const n = node('X', { title: '研究' })
    expect(isCore(n, [edge('Y', 'X'), edge('Z', 'X')])).toBe(false)
  })
})
