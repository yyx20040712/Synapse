// b3: P7-F
/**
 * [SR2-F-04] reader-scroll —— 缩放重定义与收官 e2e（工单：open / strong）
 *
 * ── 行为层 ──
 * - 缩放锚点：zoom 变化保持视口中心内容不动（(scrollTop+vh/2)/总高 纯
 *   函数保持；PageColumn 内实现）。
 * - fit-width：公式分母改列宽基准（最宽页）；一次性 zoom 语义保持。
 * - 收官 e2e 全链（渲染真实文本断言）：离屏回收（canvas 计数上限断言）/
 *   进度恢复/标注原位兼容抽验/键位滚动步/缩放中心锚/INV-01 三层/
 *   ctrl+wheel 段迁移（reader-text.spec :399-432）。
 * - 战役收官报告：成本账本+四票链完整性（docs/reports/）。
 *
 * ── 接口层 ──
 * - PageColumn 锚点纯函数；ReaderToolbar 零 props 改（zoom 数值语义不变）；
 *   ZOOM_STEP/round2/夹取 [0.5,3]（reader.store.ts:334）沿用。
 *
 * ── 架构层 ──
 * - 不变量：缩放中心保持（纯函数+单测）；INV-01 终审。
 *
 * ── 生命周期层 ──
 * - 不做：持续 fit 模式/手势 pinch。
 *
 * ── 文化层 ──
 * - 测试：锚点纯函数单测（PageColumn 同宿主）；本 spec（新入锁）+
 *   reader-text.spec 批 4（ctrl+wheel 段迁移）。
 * - 文件清单：PageColumn.tsx（改·锚点）/本文件（新入锁）/reader-text.spec
 *   （受锁批 4）/docs/reports/2026-08-28_p7f-campaign.md（收官报告）。
 * - 验收：verify 全绿+e2e 全量；用户走查（滚动阅读体验视检）。
 * - 完成后：骨架展开为真实用例 → npm run verify 绿 → 人工审查 → 翻 registry
 */
import { test, expect } from '@playwright/test'
import { isTicketDone } from '../../tickets/registry'

/** 双条件守卫（依赖∪自身——LG-05/corpus-export 先例）：全链用例随
 * F-01~03 就绪与 F-04 实现展开；展开时替换本骨架用例 */
const DEPS = ['SR2-F-01', 'SR2-F-02', 'SR2-F-03', 'SR2-F-04']
const pending = DEPS.filter((d) => !isTicketDone(d))

test.describe('reader-scroll —— F-04 收官', () => {
  test.skip(pending.length > 0, `延期：依赖或自身工单未完成 [${pending.join(', ')}]`)
  test('骨架占位（实现时替换为收官全链用例——离屏回收/进度恢复/标注原位/键位/缩放锚）', () => {
    expect(pending).toEqual([])
  })
})
