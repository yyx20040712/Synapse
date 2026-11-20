/**
 * [前端四期 B2] ReadingCategory —— 设置页「阅读与标注」分类内容（空态）。
 *
 * ── 行为层 ──
 * - 用户 2026-11-20 裁决：保留五类导航+空态说明，不新增任何设置字段
 * - 如实文案：阅读进度与标注自动随文献保存，当前无可配置项
 *
 * ── 接口层 ──
 * - export function ReadingCategory(): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 纯展示空态件；皮肤=settings.css setting-group/setting-empty
 * - 测试：tests/unit/renderer/settings-categories.test.tsx（空态文案+零输入
 *   控件负锚）+tests/e2e/settings-categories.spec.ts（真实文本）
 */
export function ReadingCategory(): JSX.Element {
  return (
    <section className="setting-group">
      <h3>阅读偏好</h3>
      <p className="setting-empty">
        阅读进度与标注自动随文献保存，当前无可配置项。阅读器内的主题、缩放与标注
        工具不依赖此页设置。
      </p>
    </section>
  )
}
