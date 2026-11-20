/**
 * SettingsSection —— 设置页分节组壳（[前端四期 B2] v2 setting-group 形态）。
 *
 * ── 行为层 ──
 * - 纯展示壳：section+h3 组标+children；无状态无回调
 *
 * ── 接口层 ──
 * - export function SettingsSection(props: { title: string; children: ReactNode }): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 皮肤单源=settings.css .setting-group（v2：组间 border-bottom 分隔——
 *   旧分节卡+金节标皮肤随 B2 五类归并方案切换删除，不留双方案）
 * - 自持节（AiAssistantSection 注入壳/注入的 AiManageSection/BudgetSection）
 *   经本壳或同形根（setting-group 类）吃同皮肤
 */
import type { ReactNode } from 'react'

export function SettingsSection(props: { title: string; children: ReactNode }): JSX.Element {
  return (
    <section className="setting-group">
      <h3>{props.title}</h3>
      {props.children}
    </section>
  )
}
