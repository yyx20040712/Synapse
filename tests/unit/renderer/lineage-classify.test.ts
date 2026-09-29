/**
 * [R2-LG11] lineage-classify —— 综述/核心档判定纯函数测试（锁定合约，
 * always-active——不经 guardedDescribe）。
 *
 * 决2 D1'：核心=研究性论文（排除综述/主题）且入度（被引边）≥2——出度
 * 不计入（被引为主口径）；决3 v1：综述=isSurvey(title) 关键词启发
 * （综述|survey|review|概述|评述 子串，大小写不敏感——误判人工修正
 * 通道归后续 D2 式字段增强票，不在本单）。
 */
import { describe, expect, it } from 'vitest'
import type { LineageEdge, LineageNode } from '../../../src/shared/models/lineage'
import { isCore, isSurvey } from '../../../src/renderer/features/lineage/lineage-classify'

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

/** 边工厂（from=父→to=子——入度计数面=toNode） */
function edge(from: string, to: string): LineageEdge {
  return { id: `e-${from}-${to}`, fromNode: from, toNode: to, label: '', kind: 'tree', sub: null, createdAt: 't', updatedAt: 't' }
}

describe('isSurvey —— 综述题名关键词启发（决3 v1）', () => {
  it('五关键词子串命中：综述/survey/review/概述/评述', () => {
    expect(isSurvey('扩散模型综述')).toBe(true)
    expect(isSurvey('A Survey of Diffusion Models')).toBe(true)
    expect(isSurvey('Deep Learning: A Review')).toBe(true)
    expect(isSurvey('领域概述')).toBe(true)
    expect(isSurvey('方法论评述')).toBe(true)
  })

  it('大小写不敏感：SURVEY/Review/单词级均命中', () => {
    expect(isSurvey('DIFFUSION SURVEY')).toBe(true)
    expect(isSurvey('review of methods')).toBe(true)
    expect(isSurvey('Survey')).toBe(true)
  })

  it('非综述阴性：普通研究论文题名与空串不命中', () => {
    expect(isSurvey('Denoising Diffusion Probabilistic Models')).toBe(false)
    expect(isSurvey('扩散模型的概率视角')).toBe(false)
    expect(isSurvey('')).toBe(false)
  })
})

describe('isCore —— 核心档判定（决2 D1\'：研究性论文出度 ≥2）', () => {
  /**
   * 出度口径裁决（2026-08-29 真机复评修正）：初版「入度≥2」在 INV-27 树
   * 单父约束下数学恒假——合法图内每节点入度≤1，isCore 永不触发（取证器
   * fixture 造双入边即被 service 多父守卫拒——r2-lg11-forensics 实录）。
   * 「被引用数≥2 的开宗立派论文」=≥2 个继承者=**出度**≥2。
   */
  it('出度边界：2 条被继承边=核心，1 条=非核心', () => {
    const n = node('X', { title: '开宗立派方法论' })
    expect(isCore(n, [edge('X', 'A'), edge('X', 'B')])).toBe(true)
    expect(isCore(n, [edge('X', 'A')])).toBe(false)
    expect(isCore(n, [])).toBe(false)
  })

  it('综述排除：出度 ≥2 的综述不入核心档', () => {
    const n = node('S', { title: '领域综述' })
    expect(isCore(n, [edge('S', 'A'), edge('S', 'B'), edge('S', 'C')])).toBe(false)
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
