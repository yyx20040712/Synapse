/**
 * [F-L1-C] edge-label-layout —— 边标签防重叠放置器纯函数测试（锁定合约）。
 *
 * 覆盖（票面文化层 ①-⑥+fitViewport labelBoxes 数值锁——M5 变异面）：
 * 估算宽度口径/同锚两标签竖向错开/标签 vs 节点盒偏移/同输入序确定性/
 * 全占位回 anchor（best effort）/短标签碰撞盒收窄/fit 第 5 参入包围盒。
 * 纯函数直测（零 DOM）；always-active（ADR-0017 裁决 3——不经 guardedDescribe）。
 */
import { describe, expect, it } from 'vitest'
import {
  EDGE_LABEL_H,
  EDGE_LABEL_MAX_W,
  estimateLabelWidth,
  placeEdgeLabels
} from '../../../src/renderer/features/lineage/edge-label-layout'
import { fitViewport } from '../../../src/renderer/features/lineage/lineage-viewport'
import type { LayoutResult } from '../../../src/renderer/features/lineage/lineage-layout'
import type { LineageNode } from '../../../src/shared/models/lineage'

/** 放置器档距（票面：lh=12.35=37.05/3 行行高） */
const LH = 12.35
/** 碰撞盒间隙（票面：gap 4——盒宽=est+4/盒高=37.05+4） */
const GAP = 4

/** 标签碰撞盒（中心+半宽高——与实现同口径，供相交断言） */
function labelBox(slot: { x: number; y: number }, label: string): { x: number; y: number; hw: number; hh: number } {
  return { x: slot.x, y: slot.y, hw: (estimateLabelWidth(label) + GAP) / 2, hh: (EDGE_LABEL_H + GAP) / 2 }
}

/** AABB 分离判定（与实现同口径：恰好接触=分离——实现用严格 < 判相交） */
function disjoint(
  a: { x: number; y: number; hw: number; hh: number },
  b: { x: number; y: number; hw: number; hh: number }
): boolean {
  return Math.abs(a.x - b.x) >= a.hw + b.hw || Math.abs(a.y - b.y) >= a.hh + b.hh
}

describe('F-L1-C edge-label-layout —— 防重叠放置器', () => {
  it('①估算宽度：CJK 9.5/字、其余 4.75/字、+左右 padding 4、钳 130、空串 0', () => {
    // 码点 >0x2E80 计全宽（CJK 统表/扩展/全角标点——主控口径，头注声明）
    expect(estimateLabelWidth('中中')).toBe(23) // 4 + 2×9.5
    expect(estimateLabelWidth('中a')).toBe(18.25) // 4 + 9.5 + 4.75
    // 60 拉丁=4+285=289 → 钳 130
    expect(estimateLabelWidth('a'.repeat(60))).toBe(EDGE_LABEL_MAX_W)
    // 空 label 不渲染（既有语义）——碰撞盒零宽
    expect(estimateLabelWidth('')).toBe(0)
  })

  it('②同锚两标签：竖向错开——两碰撞盒不相交且均在 ±10lh 内（回炉 1 R1 包络）', () => {
    const items = [
      { id: 'e1', label: '一'.repeat(40), anchor: { x: 0, y: 0 } },
      { id: 'e2', label: '二'.repeat(40), anchor: { x: 0, y: 0 } }
    ]
    const m = placeEdgeLabels(items, [])
    // 两盒（w=130+4 钳制满宽）不相交：竖移 ≥(41.05+41.05)/2 → 首自由位 +4lh
    expect(disjoint(labelBox(m.get('e1')!, items[0]!.label), labelBox(m.get('e2')!, items[1]!.label))).toBe(true)
    for (const it of items) {
      // 偏移序封顶 ±10lh（回炉 1 R1：±5lh 实测不足——真库锚在节点中心需 |dy|≥~85）
      expect(Math.abs(m.get(it.id)!.y - it.anchor.y)).toBeLessThanOrEqual(10 * LH + 1e-9)
    }
  })

  it('②b同锚两标签锚在 100 高节点盒中心：双双移出（dy 跨盒/dx 第二档分离——回炉 1 R1 真库场景）', () => {
    const items = [
      { id: 'e1', label: '一'.repeat(40), anchor: { x: 0, y: 0 } },
      { id: 'e2', label: '二'.repeat(40), anchor: { x: 0, y: 0 } }
    ]
    // nodeHeight 100 档节点盒（半高 50）：外扩 6 后 96×56——|dy|≥76.525 才分离
    const nodeBoxes = [{ x: 0, y: 0, hw: 90, hh: 50 }]
    const m = placeEdgeLabels(items, nodeBoxes)
    const box = { x: 0, y: 0, hw: 96, hh: 56 }
    // 两标签互不交+均移出节点盒（用户保证①——真库 f-l1c-verify.json FAIL 场景）
    expect(disjoint(labelBox(m.get('e1')!, items[0]!.label), labelBox(m.get('e2')!, items[1]!.label))).toBe(true)
    for (const it of items) {
      const b = labelBox(m.get(it.id)!, it.label)
      expect(disjoint(b, box)).toBe(true)
      expect(Math.abs(m.get(it.id)!.y)).toBeLessThanOrEqual(10 * LH + 1e-9)
    }
  })

  it('③标签与节点盒相交：按确定性偏移序搜到自由位——结果与节点盒（外扩 6）不相交且离开锚点', () => {
    const items = [{ id: 'e1', label: '说明文字', anchor: { x: 0, y: 0 } }]
    // 节点盒中心在锚上方 40（hw 50/hh 20）：anchor 档 y 相交（触发偏移搜索）
    const nodeBoxes = [{ x: 0, y: -40, hw: 50, hh: 20 }]
    const m = placeEdgeLabels(items, nodeBoxes)
    const slot = m.get('e1')!
    expect(slot.y).not.toBe(0) // 偏移已发生（非原位硬放）
    // 外扩 6 后的节点盒与结果碰撞盒分离（用户保证①核心断言）
    expect(disjoint(labelBox(slot, items[0]!.label), { x: 0, y: -40, hw: 56, hh: 26 })).toBe(true)
  })

  it('③b单标签锚在 100 高节点盒中心：移出（dy=0 档 dx 第二档 ±166 分离或 dy 跨盒——回炉 1 R1）', () => {
    const items = [{ id: 'e1', label: '长'.repeat(40), anchor: { x: 0, y: 0 } }]
    // 外扩后 96×56：dx 需 |·|≥96+67=163（第一档 ±83 仍撞，第二档 ±166 分离）
    const nodeBoxes = [{ x: 0, y: 0, hw: 90, hh: 50 }]
    const slot = placeEdgeLabels(items, nodeBoxes).get('e1')!
    expect(slot.x !== 0 || slot.y !== 0).toBe(true) // 偏移已发生（非原位硬放）
    expect(disjoint(labelBox(slot, items[0]!.label), { x: 0, y: 0, hw: 96, hh: 56 })).toBe(true)
    expect(Math.abs(slot.y)).toBeLessThanOrEqual(10 * LH + 1e-9)
  })

  it('④确定性：同输入序多次调用输出一致（贪心依赖输入序——乱序等价不测，序稳定性即契约）', () => {
    const items = [
      { id: 'e1', label: '谱系说明甲', anchor: { x: 0, y: 0 } },
      { id: 'e2', label: '谱系说明乙', anchor: { x: 0, y: 0 } },
      { id: 'e3', label: '推断注解', anchor: { x: 60, y: 0 } }
    ]
    const nodeBoxes = [{ x: 0, y: -40, hw: 50, hh: 20 }]
    expect(placeEdgeLabels(items, nodeBoxes)).toEqual(placeEdgeLabels(items, nodeBoxes))
  })

  it('⑤全候选位被占：回 anchor（best effort——节点盒铺满 ±10lh×dx 两档包络，回炉 1 重设计）', () => {
    const items = [{ id: 'e1', label: '长'.repeat(40), anchor: { x: 0, y: 0 } }]
    // 满宽标签（w=134/dx 档 ±83/±166）包络：x 域 ±(166+67)=±233、y 域
    // ±(10lh+20.525)=±144 ——环绕大盒 hw 250/hh 155（外扩 256×161）全覆盖
    const nodeBoxes = [{ x: 0, y: 0, hw: 250, hh: 155 }]
    expect(placeEdgeLabels(items, nodeBoxes).get('e1')).toEqual({ x: 0, y: 0 })
  })

  it('⑥短标签碰撞盒宽 <130：estimate 生效（窄标签放置更自然，渲染 FO 恒 130）', () => {
    expect(estimateLabelWidth('说明')).toBeLessThan(EDGE_LABEL_MAX_W)
  })

  it('fitViewport 第 5 参 labelBoxes：参与包围盒——被推出的标签不可消失在 fit 视野外', () => {
    const nodes: LineageNode[] = [
      { id: 'A', paperId: 'p', title: '测名', coreIdea: '', year: 2020, x: null, y: null, createdAt: 't', updatedAt: 't' }
    ]
    const layout: LayoutResult = { positions: new Map([['A', { x: 0, y: 0 }]]), layers: [] }
    // 手算（F-LG13 统一卡 NODE_W=240 半宽 120/高 110 半高 55/BAND_LEFT=-200；
    // vw 800/vh 600、边距 X 120/Y 80）：不含盒 W=320/H=110 → k=min(560/320,
    // 440/110=4)=560/320；含盒（标签 y∈[181.5,218.5]）H=273.5 →
    // k=min(560/320, 440/273.5)=440/273.5
    const plain = fitViewport(nodes, layout, 800, 600)
    const withBox = fitViewport(nodes, layout, 800, 600, [{ x: 0, y: 200, hw: 65, hh: 18.5 }])
    expect(plain.k).toBeCloseTo(560 / 320, 6)
    expect(withBox.k).toBeCloseTo(440 / 273.5, 6)
    // 标签盒入围后容纳比取小——视口拉远（含被推出标签）
    expect(withBox.k).toBeLessThan(plain.k)
  })
})
