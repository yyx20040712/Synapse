/**
 * SettingsSection —— 设置页分节卡壳（R3-U4 视觉票）。
 *
 * ── 行为层 ──
 * - 纯展示壳：section+h2 节标+children；无状态无回调
 *
 * ── 接口层 ──
 * - export function SettingsSection(props: { title: string; children: ReactNode }): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 皮肤单源=theme.css .syn-settings 作用域（> section 分节卡 / h2 金节标衬线）
 *   ——自持节（CorpusExportSection/ZcodeLinkSection/注入的课题节）渲染 section
 *   根，经同一作用域吃同皮肤：票面外文件零触碰的同视觉收敛
 * - 结构与原 section+h2 完全同形（拆分动机=SettingsPage 180 行消化上限）
 */
import type { ReactNode } from 'react'

export function SettingsSection(props: { title: string; children: ReactNode }): JSX.Element {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium">{props.title}</h2>
      {props.children}
    </section>
  )
}
