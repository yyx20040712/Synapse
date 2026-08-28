/**
 * DiamondRule —— 菱形分隔线（R3 菱形语法：渐隐线+◆+渐隐线）。
 *
 * ── 行为层 ──
 * - 纯装饰分隔：左渐隐线+金◆+右渐隐线；aria-hidden 不参与可达性
 * - 窄窗防碰撞：线段 min-width 24px+flex:1（设计定稿注意事项③）
 *
 * ── 接口层 ──
 * - export function DiamondRule(): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 样式全在 theme.css .lib-rule*（token 单源）；R3-LIB（筛选区|列表）与
 *   R3-U4（设置分节）复用同一语法
 */
export function DiamondRule(): JSX.Element {
  return (
    <div className="lib-rule" aria-hidden="true">
      <span className="lib-rule-line lib-rule-line-l" />
      <span className="lib-rule-gem" />
      <span className="lib-rule-line lib-rule-line-r" />
    </div>
  )
}
