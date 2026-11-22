/**
 * [B3 设计先行] G/G2 CSS 文本锁红测试（设计稿
 * docs/design/2026-11-22_b3-drag-frame-g-g2-design.md §6/§7——lineage-slot-
 * visibility.test.ts 同范式：jsdom 无涂布模型，锁 theme-lineage.css 值面）。
 * 全部用例对当前 src 为红。M3/M4 在实现批 commit C「G/G2 视觉」转绿；
 * G2-1 随布局屏障依赖前置到 commit B「rAF+translate」转绿。
 *
 * 契约（设计稿定案值）：
 * - M3：.drag-slot.faded opacity ≥ 0.5（F-DRAGVIS-01 自身验收线——现行 .35 未达，
 *   summary-draft §4.1-6 在案）；设计稿定值 .55。
 * - M4：.drag-slot.faded 对比面=实线边（border-style: solid——虚线=加深目标
 *   专属、实线=空位候选的边界型对比）。
 * - G2-1：.month-frame transition 覆盖 padding-bottom（G2 病灶①——现行仅
 *   height 可过渡而真正变化的 padding-bottom 硬跳，theme-lineage.css:89/193；
 *   summary-draft §8.A 三病灶在案）。
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const lineageCss = readFileSync(
  fileURLToPath(new URL('../../../src/renderer/shared/theme-lineage.css', import.meta.url)),
  'utf8'
)
/** [B3] 拖拽分域拆件（2026-11-22 commit A）：.drag-slot.faded 族已拆出
 *  theme-lineage-drag.css——读面改双文件拼读（断言本体零改，机械迁移随批
 *  申报；.month-frame 基块=留守件，并入拼读属机械防御）。 */
const lineageDragCss = readFileSync(
  fileURLToPath(new URL('../../../src/renderer/shared/theme-lineage-drag.css', import.meta.url)),
  'utf8'
)
const lineageCssAll = lineageCss + lineageDragCss

describe('[B3 红测试] G/G2 CSS 契约（对当前 src 全红）', () => {
  it('M3 faded 槽对比度验收线：.drag-slot.faded opacity ≥ 0.5（红因=现行 .35——F-DRAGVIS-01 自身验收未达）', () => {
    const faded = lineageCssAll.match(/\.drag-slot\.faded \{([^}]*)\}/)?.[1] ?? ''
    expect(faded).not.toBe('')
    const op = /opacity:\s*([\d.]+)/.exec(faded)?.[1]
    expect(op !== undefined && Number(op) >= 0.5).toBe(true)
  })

  it('M4 faded 槽边界型对比：.drag-slot.faded 实线边（红因=现行仅 opacity 淡化、无边型对比）', () => {
    const faded = lineageCssAll.match(/\.drag-slot\.faded \{([^}]*)\}/)?.[1] ?? ''
    expect(faded).toMatch(/border-style:\s*solid/)
  })

  it('G2-1 月框回落过渡承载：.month-frame transition 覆盖 padding-bottom（红因=现行仅 height——松手 padding 瞬跳=G2 病灶①）', () => {
    const frameRule = lineageCssAll.match(/\.month-frame \{([^}]*)\}/)?.[1] ?? ''
    expect(frameRule).toMatch(/transition:[^;]*padding-bottom/)
  })

  // [B3 §7/§13 commit B 门] 拖中过渡抑制（实现批新增断言——先红后绿随批申报）：
  // 活动 stretch 期逐帧 --lg-pull 写入须即时生效=跟手（裁决 8）；若拖中保留 .38s
  // 过渡=每帧目标变更重定向过渡≈指数追赶（跟手退化为滞后追手）。已知边界=§12.10
  // （stretch 期 height/border-color/background 过渡同被压制——拖中无这些状态变化）。
  it('G2-2 拖中过渡抑制：.month-frame.stretch 规则含 transition:none（活动 stretch 期 --lg-pull 直写即时生效=跟手）', () => {
    const stretchRule = lineageCssAll.match(/\.month-frame\.stretch \{([^}]*)\}/)?.[1] ?? ''
    expect(stretchRule).not.toBe('')
    expect(stretchRule).toMatch(/transition:\s*none/)
  })
})
