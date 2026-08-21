/**
 * [SR-SET-01] SettingsPage —— 设置页（工单：open / weak）
 *
 * ── 行为层 ──
 * - 表单：contactEmail（校验 email；说明"仅用于 CrossRef/OpenAlex 礼貌池标识"）
 * - 主题三选（light/dark/system；v1 仅存储，主题切换 v2 接线 theme.css 变量集）
 * - 「网络诊断」按钮：api.settings.diagNetwork → 每行 host ✓ 延迟ms / ✗（安全 §6.4 披露）
 * - 「网络行为披露」静态说明区：列出 3 个白名单 host 与触发时机（仅手动增强/诊断）
 * - 数据目录展示（只读，来自 app.getPath('userData')——经 settings 域扩展？v1 不展示，
 *   避免暴露路径给 renderer；此处仅展示"数据保存在本机"文案）
 *
 * ── 接口层 ──
 * - export function SettingsPage(): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 保存走 settings.store.save；成功 toast
 */
export function SettingsPage(): JSX.Element {
  return (
    <div data-ticket="SR-SET-01" className="p-6 text-sm" style={{ color: 'var(--text-dim)' }}>
      工单未完成：SR-SET-01（设置页）
    </div>
  )
}
