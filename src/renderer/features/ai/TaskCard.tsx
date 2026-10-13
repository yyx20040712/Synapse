/**
 * [F-DBCAMP-01 DB-2 UI U4] TaskCard —— 会话内任务卡（六态+取消+审计入口）。
 *
 * ── 行为层（设计 §1.2）──
 * - 六态渲染：queued=「排队中」+取消钮；running=spinner+「执行中」**无取消钮**；
 *   succeeded=「已完成」+结果摘要（result 非空时）；failed=「失败」+错误文案
 *   （error 非空时）；timeout=「超时」；cancelled=「已取消」。
 * - 目标描述符行：渲染 targetTitle（服务端 LEFT JOIN 解析）；null/空串回退
 *   scope 文案（paper→「文献」/lineage→「脉络」——D4；'' 同呈回退系 DDL
 *   DEFAULT '' 合法态，见自裁申报）。
 * - 取消：经 aiTasksStore.cancelTask（CONFLICT/NOT_FOUND/INVALID_REQUEST 映射
 *   驻 store——本组件零错误处理）；审计入口=store.openAudit。
 * - data-action=卡片定位键（action 9 白名单互异——e2e 断言锚）。
 *
 * ── 接口层 ──
 * - export function TaskCard(props: { task: AiTask }): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 纯展示+store 派发；测试=e2e E2（六态真实文本断言）+store 单测（取消映射轴）。
 */
import type { AiScope, AiTask, AiTaskStatus } from '@shared/models/ai-domain'
import { useAiTasksStore } from './aiTasksStore'

/** 六态文案（设计 §1.2 单源——e2e E2 断言锚） */
const STATUS_LABEL: Record<AiTaskStatus, string> = {
  queued: '排队中',
  running: '执行中',
  succeeded: '已完成',
  failed: '失败',
  timeout: '超时',
  cancelled: '已取消'
}

/** targetTitle 空（null|''）时回退的档文案（D4——scope 仅 paper|lineage） */
const SCOPE_LABEL: Record<Exclude<AiScope, 'global'>, string> = {
  paper: '文献',
  lineage: '脉络'
}

export function TaskCard(props: { task: AiTask }): JSX.Element {
  const { task } = props
  const cancelTask = useAiTasksStore((s) => s.cancelTask)
  const openAudit = useAiTasksStore((s) => s.openAudit)
  const target = task.targetTitle || SCOPE_LABEL[task.scope]

  return (
    <div
      data-testid="ai-task-card"
      data-action={task.action}
      data-status={task.status}
      className="flex flex-col gap-1 rounded-md border px-2 py-1.5 text-xs"
      style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}
    >
      {/* 目标描述符行（锚标题；空回退档文案） */}
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span data-testid="ai-task-target" className="min-w-0 truncate" style={{ color: 'var(--text-dim)' }}>
          {target}
        </span>
        <button
          type="button"
          aria-label="审计"
          className="shrink-0 rounded border px-1.5 py-0.5 text-[10px] leading-none"
          style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}
          onClick={() => {
            openAudit(task.id)
          }}
        >
          审计
        </button>
      </div>
      <div className="flex min-w-0 items-center gap-1.5">
        {task.status === 'running' && (
          // spinner（Button.tsx animate-spin 同款——禁新依赖）
          <span aria-hidden className="inline-block animate-spin text-[10px]" style={{ color: 'var(--accent)' }}>
            ⟳
          </span>
        )}
        <span
          data-testid="ai-task-status"
          className="shrink-0 font-medium"
          style={{
            color:
              task.status === 'failed' || task.status === 'timeout'
                ? 'var(--danger)'
                : task.status === 'succeeded'
                  ? 'var(--ok)'
                  : 'var(--text)'
          }}
        >
          {STATUS_LABEL[task.status]}
        </span>
        {/* succeeded=结果摘要；failed=错误文案（截断保护由 CSS ellipsis） */}
        {task.status === 'succeeded' && task.result !== null && (
          <span data-testid="ai-task-result" className="min-w-0 flex-1 truncate" style={{ color: 'var(--text-dim)' }}>
            {task.result}
          </span>
        )}
        {task.status === 'failed' && task.error !== null && (
          <span data-testid="ai-task-error" className="min-w-0 flex-1 truncate" style={{ color: 'var(--danger)' }}>
            {task.error}
          </span>
        )}
        {/* 仅 queued 可取消（running/终态无钮——设计 §1.2 明文） */}
        {task.status === 'queued' && (
          <button
            type="button"
            aria-label="取消任务"
            className="shrink-0 rounded border px-1.5 py-0.5 text-[10px] leading-none"
            style={{ borderColor: 'var(--border)', color: 'var(--danger)' }}
            onClick={() => {
              cancelTask(task.id, task.scope, task.anchorId)
            }}
          >
            取消
          </button>
        )}
      </div>
    </div>
  )
}
