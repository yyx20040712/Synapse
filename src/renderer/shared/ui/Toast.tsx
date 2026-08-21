/**
 * [SR-UI-03] Toast —— 通知（工单：open / weak）
 *
 * ── 行为层 ──
 * - 轻量命令式 API：export function showToast(message: string, kind?: 'info'|'error'|'success'): void
 * - <ToastHost /> 挂在 App 根部；右上角堆叠，3.5s 自动消失（error 6s），手动 ×
 * - 同文案 1s 内去重（防抖连刷）
 *
 * ── 接口层 ──
 * - export function ToastHost(): JSX.Element
 * - export function showToast(...): void（内部模块级订阅）
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 不依赖任何状态库（自包含订阅）
 */
export function ToastHost(): JSX.Element {
  return <div data-ticket="SR-UI-03" />
}
