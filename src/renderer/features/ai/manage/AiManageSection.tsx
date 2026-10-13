/**
 * [F-DBCAMP-01 DB-2 UI U5] AiManageSection —— 设置页「AI 管理」节内容壳
 * （设计 §1.4/§4.1：三 Tab=任务/置顶消息/记忆；节序与节标=E1 已锁零改动）。
 *
 * ── 行为层 ──
 * - 三 Tab 切换（默认=任务）；切 Tab 即挂/卸对应 Tab 组件（卸载清各自数据面
 *   ——store/组件 cleanup 承载，重挂重新拉取）。
 * - 态空间：tab ∈ {tasks, pins, memory}；无其他本地态。
 *
 * ── 接口层 ──
 * - export function AiManageSection(): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 纯壳：数据面全在三个 Tab 组件（任务/置顶=组件本地态，记忆=aiMemoryStore
 *   ——设计 §4.2 三 store 职责面）；测试=tests/unit/renderer/ai-manage-tabs.test.tsx
 *   +e2e E3/E7（ai-manage-tabs.spec.ts）。
 */
import { useState } from 'react'
import { MemoryTab } from './MemoryTab'
import { PinsTab } from './PinsTab'
import { TasksTab } from './TasksTab'

const TABS = [
  { key: 'tasks', label: '任务' },
  { key: 'pins', label: '置顶消息' },
  { key: 'memory', label: '记忆' }
] as const

type ManageTab = (typeof TABS)[number]['key']

export function AiManageSection(): JSX.Element {
  const [tab, setTab] = useState<ManageTab>('tasks')
  return (
    <div data-testid="ai-manage-section" className="flex flex-col gap-2">
      <div role="tablist" aria-label="AI 管理面板" className="flex gap-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-label={t.label}
            aria-selected={tab === t.key}
            className="rounded border px-2 py-0.5 text-xs"
            style={{
              borderColor: 'var(--border)',
              background: tab === t.key ? 'var(--panel)' : 'transparent',
              color: tab === t.key ? 'var(--text)' : 'var(--text-dim)',
              fontWeight: tab === t.key ? 500 : 400
            }}
            onClick={() => {
              setTab(t.key)
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'tasks' && <TasksTab />}
      {tab === 'pins' && <PinsTab />}
      {tab === 'memory' && <MemoryTab />}
    </div>
  )
}
