/**
 * [F-VISFB-22 C5] 候选槽涂层契约（视检反馈「候选槽不显示」断言锚）。
 *
 * [B3 §6/§9 清单④] z3 层级契约保留，旧覆盖病灶随 occupancy mask 退役：
 * 探针实证的历史病灶（evidence/22-c5-probe.json，2026-10-16——拖拽中
 * .drag-slot.cand 全员在场/几何正确但中心点 elementFromPoint 5/5 命中
 * .tl-card：含源保守语义下候选 cell 与其余卡 cell 1:1 重合被整面覆盖）
 * 的成立前提随候选面改末行未占 cell（B3 commit C——候选不再与卡同 cell，
 * 覆盖场景不存在）消失；.drag-slot.cand z-index:3 提层声明保留（层级契约
 * 不撤）。本件锁 CSS 涂层契约（theme.test readFileSync 同型——jsdom 无
 * 布局/涂布模型，类名面已由 lineage-drag-month 锁，本件锁值面）。
 * always-active 裸 describe。
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const lineageCss = readFileSync(
  fileURLToPath(new URL('../../../src/renderer/shared/theme-lineage.css', import.meta.url)),
  'utf8'
)
/** [B3] 拖拽分域拆件（2026-11-22 commit A）：.drag-slot/.drag-slot.cand 族
 *  已拆出 theme-lineage-drag.css——读面改双文件拼读（断言本体零改，机械
 *  迁移随批申报；拆出规则与主文件零重叠）。 */
const lineageDragCss = readFileSync(
  fileURLToPath(new URL('../../../src/renderer/shared/theme-lineage-drag.css', import.meta.url)),
  'utf8'
)
const lineageCssAll = lineageCss + lineageDragCss

describe('[F-VISFB-22 C5] 候选槽涂层契约（cand 提层至卡上——探针实证修复锚）', () => {
  it('基准层序在档：.tl-card z-index:2（候选提层判定的相对基准）', () => {
    expect(lineageCssAll).toMatch(/\.tl-card \{[^}]*z-index: 2;/s)
  })

  it('候选槽提层：.drag-slot.cand z-index:3（>卡 2——被覆盖缺陷修面）', () => {
    expect(lineageCssAll).toMatch(/\.drag-slot\.cand \{[^}]*z-index: 3;/s)
  })

  it('实态槽保持流内零提层：.drag-slot 基类无 z-index 声明（占空位不被覆盖——提层仅 cand 域）', () => {
    const base = lineageCssAll.match(/\.drag-slot \{[^}]*\}/s)?.[0] ?? ''
    expect(base, '.drag-slot 基类规则应在场').not.toBe('')
    expect(base).not.toMatch(/z-index/)
  })
})
