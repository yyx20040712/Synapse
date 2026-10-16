/**
 * [F-VISFB-22 C5] 候选槽涂层契约（视检反馈「候选槽不显示」断言锚）。
 *
 * 真实浏览器探针实证（evidence/22-c5-probe.json，2026-10-16）：拖拽中
 * .drag-slot.cand 全员 DOM 在场/几何正确/opacity .35，但中心点
 * elementFromPoint 5/5 命中 .tl-card——faded 候选族 z=auto 被 z-index:2
 * 流内卡整面覆盖（含源保守语义下候选 cell 与其余卡 cell 1:1 重合）→
 * 恒不可见。修法=候选槽提层至卡之上（z 3——month-tag 同层；连线命中层
 * z4/拖卡 z99 之下）。本件锁 CSS 涂层契约（theme.test readFileSync 同型
 * ——jsdom 无布局/涂布模型，类名面已由 lineage-drag-month 锁，本件锁
 * 值面）。always-active 裸 describe。
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const lineageCss = readFileSync(
  fileURLToPath(new URL('../../../src/renderer/shared/theme-lineage.css', import.meta.url)),
  'utf8'
)

describe('[F-VISFB-22 C5] 候选槽涂层契约（cand 提层至卡上——探针实证修复锚）', () => {
  it('基准层序在档：.tl-card z-index:2（候选提层判定的相对基准）', () => {
    expect(lineageCss).toMatch(/\.tl-card \{[^}]*z-index: 2;/s)
  })

  it('候选槽提层：.drag-slot.cand z-index:3（>卡 2——被覆盖缺陷修面）', () => {
    expect(lineageCss).toMatch(/\.drag-slot\.cand \{[^}]*z-index: 3;/s)
  })

  it('实态槽保持流内零提层：.drag-slot 基类无 z-index 声明（占空位不被覆盖——提层仅 cand 域）', () => {
    const base = lineageCss.match(/\.drag-slot \{[^}]*\}/s)?.[0] ?? ''
    expect(base, '.drag-slot 基类规则应在场').not.toBe('')
    expect(base).not.toMatch(/z-index/)
  })
})
