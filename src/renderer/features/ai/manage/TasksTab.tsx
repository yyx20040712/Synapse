/**
 * [F-DBCAMP-01 DB-2 UI U5] TasksTab —— 管理面板任务 Tab（全档任务表）。
 *
 * ── 行为层（设计 §1.4）──
 * - 数据=ai-tasks/list 全档（scope 缺省=不过滤——三值语义 W-2a：undefined=
 *   全档）；scope/状态过滤（scope 过滤仅 paper/lineage——DDL 无 global 任务行）；
 *   列=动作/档/目标 targetTitle/状态/时间。
 * - 态空间：entry ∈ {loading, ready(tasks), error}；过滤器 scopeF ∈
 *   {''=全部, paper, lineage}、statusF ∈ {''=全部, 6 态}。迁移：挂载/过滤变化
 *   →loading→list 回包→ready|error；卸载→序号自增（晚到回包失格）。
 * - queued 行带取消钮（取消映射沿 §1.2：CONFLICT→toast「仅排队中的任务可取消」；
 *   NOT_FOUND→刷新列表；INVALID_REQUEST/网络→toast 通用错误——终裁 N-1）。
 *   成功→回包行原位替换（cancelled 即时呈现）；[回炉 R9] 状态过滤在席且回包
 *   新态不符过滤（queued→cancelled）→行本地移除（消瞬态矛盾：过滤视图零
 *   不符行）；无过滤在席→原位替换。
 * - 六态文案沿 §1.2（与 TaskCard 同表——组件私有复刻，Rule of Three 第二现）
 *   ；空态「暂无任务」。
 *
 * ── 接口层 ──
 * - export function TasksTab(): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 组件本地态（管理面无独立 store——设计 §4.2 三 store 职责面外）；数据面只
 *   经 ai_tasks/list+cancel（api/client 单口）；测试=ai-manage-tabs.test.tsx
 *   （组件渲染面）——取消映射轴随 aiTasksStore 同口径（e2e E2 已锁先例）。
 */
import { useEffect, useRef, useState } from 'react'
import { api, unwrap, ApiClientError } from '../../../api/client'
import { showToast } from '../../../shared/ui/toast-store'
import { GENERIC_ERROR } from '../ui-texts'
import type { AiTask, AiTaskStatus } from '@shared/models/ai-domain'

/** 六态文案（设计 §1.2 单源——TaskCard 同表私有复刻） */
const STATUS_LABEL: Record<AiTaskStatus, string> = {
  queued: '排队中',
  running: '执行中',
  succeeded: '已完成',
  failed: '失败',
  timeout: '超时',
  cancelled: '已取消'
}

/** 档文案（paper/lineage——任务行恒锚定档，无 global） */
const SCOPE_LABEL: Record<'paper' | 'lineage', string> = {
  paper: '文献',
  lineage: '脉络'
}

/** 本地时间 MM-DD HH:mm（补零；非法串→''——服务端契约 z.string，防御位） */
function formatTs(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

interface TasksEntry {
  status: 'loading' | 'ready' | 'error'
  tasks: AiTask[]
}

type ScopeFilter = '' | 'paper' | 'lineage'
type StatusFilter = '' | AiTaskStatus

export function TasksTab(): JSX.Element {
  const [entry, setEntry] = useState<TasksEntry>({ status: 'loading', tasks: [] })
  const [scopeF, setScopeF] = useState<ScopeFilter>('')
  const [statusF, setStatusF] = useState<StatusFilter>('')
  // NOT_FOUND 取消映射的重派触发（effect 重走——沿 PinsTab reload 同型）
  const [reload, setReload] = useState(0)
  // 请求序号（stale-guard：过滤变化/卸载自增——晚到回包失格）
  const seqRef = useRef(0)

  useEffect(() => {
    const seq = seqRef.current + 1
    seqRef.current = seq
    setEntry({ status: 'loading', tasks: [] })
    const req: { scope?: 'paper' | 'lineage'; status?: AiTaskStatus } = {}
    if (scopeF !== '') req.scope = scopeF
    if (statusF !== '') req.status = statusF
    unwrap(api.ai_tasks.list(req))
      .then((res) => {
        if (seqRef.current !== seq) return
        setEntry({ status: 'ready', tasks: res.tasks })
      })
      .catch(() => {
        if (seqRef.current !== seq) return
        setEntry({ status: 'error', tasks: [] })
      })
    return () => {
      seqRef.current += 1
    }
  }, [scopeF, statusF, reload])

  function cancelTask(task: AiTask): void {
    const seq = seqRef.current
    unwrap(api.ai_tasks.cancel({ taskId: task.id }))
      .then((res) => {
        if (seqRef.current !== seq) return
        setEntry((cur) => {
          if (cur.status !== 'ready') return cur
          // [回炉 R9] 状态过滤在席且回包新态不符→行本地移除（过滤视图零不符行）
          if (statusF !== '' && res.task.status !== statusF) {
            return { status: 'ready', tasks: cur.tasks.filter((t) => t.id !== task.id) }
          }
          return { status: 'ready', tasks: cur.tasks.map((t) => (t.id === task.id ? res.task : t)) }
        })
      })
      .catch((e: unknown) => {
        if (seqRef.current !== seq) return
        const code = e instanceof ApiClientError ? e.code : ''
        if (code === 'CONFLICT') {
          showToast('仅排队中的任务可取消', 'error')
          return
        }
        if (code === 'NOT_FOUND') {
          // 任务已不存在（他处删除/级联）→重派过滤条件拉新事实（§1.2）
          setReload((r) => r + 1)
          return
        }
        showToast(GENERIC_ERROR, 'error')
      })
  }

  const inputStyle = { borderColor: 'var(--border)', background: 'var(--panel)' }

  return (
    <div data-testid="ai-manage-tasks" className="flex flex-col gap-2 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="任务档位过滤"
          className="syn-input rounded border px-1 py-0.5"
          style={inputStyle}
          value={scopeF}
          onChange={(e) => {
            setScopeF(e.target.value as ScopeFilter)
          }}
        >
          <option value="">全部档</option>
          <option value="paper">文献</option>
          <option value="lineage">脉络</option>
        </select>
        <select
          aria-label="任务状态过滤"
          className="syn-input rounded border px-1 py-0.5"
          style={inputStyle}
          value={statusF}
          onChange={(e) => {
            setStatusF(e.target.value as StatusFilter)
          }}
        >
          <option value="">全部状态</option>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {entry.status === 'loading' ? (
        <div style={{ color: 'var(--text-dim)' }}>正在加载任务…</div>
      ) : entry.status === 'error' ? (
        <div role="alert" style={{ color: 'var(--danger)' }}>
          {GENERIC_ERROR}
        </div>
      ) : entry.tasks.length === 0 ? (
        <div style={{ color: 'var(--text-dim)' }}>暂无任务</div>
      ) : (
        <table className="text-xs" aria-label="AI 任务列表">
          <thead>
            <tr style={{ color: 'var(--text-dim)' }}>
              <th className="py-1 pr-3 text-left font-normal">动作</th>
              <th className="py-1 pr-3 text-left font-normal">档</th>
              <th className="py-1 pr-3 text-left font-normal">目标</th>
              <th className="py-1 pr-3 text-left font-normal">状态</th>
              <th className="py-1 text-left font-normal">时间</th>
            </tr>
          </thead>
          <tbody>
            {entry.tasks.map((t) => (
              <tr key={t.id} data-id={t.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                <td className="py-1 pr-3">{t.action}</td>
                <td className="py-1 pr-3">{SCOPE_LABEL[t.scope]}</td>
                <td className="max-w-40 truncate py-1 pr-3">{t.targetTitle || SCOPE_LABEL[t.scope]}</td>
                <td className="py-1 pr-3">
                  <span data-testid="ai-task-status">{STATUS_LABEL[t.status]}</span>
                  {/* [F-SETSTYLE-01 批 3d] btn-std 标准文字钮（视觉形态迁 CSS——ml-1.5 布局 utility 保留） */}
                  {t.status === 'queued' && (
                    <button
                      type="button"
                      aria-label="取消任务"
                      className="ml-1.5 btn-std"
                      onClick={() => {
                        cancelTask(t)
                      }}
                    >
                      取消
                    </button>
                  )}
                </td>
                <td data-testid="ai-task-time" className="py-1" style={{ color: 'var(--text-dim)' }}>
                  {formatTs(t.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
