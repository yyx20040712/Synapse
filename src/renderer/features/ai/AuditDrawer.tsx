/**
 * [F-DBCAMP-01 DB-2 UI U4] AuditDrawer —— 任务级审计抽屉（只读覆盖层）。
 *
 * ── 行为层（设计 §1.3/D6）──
 * - 入口=任务卡「审计」钮（store.openAudit）；本组件读 store.activeAudit——
 *   null=关闭不渲染；非 null=面板内右侧覆盖层抽屉。
 * - 态机（驻 store）：loading=「正在加载审计…」；empty=「暂无审计记录」；
 *   error=「请求无效，请重试」（role=alert）；ready=行列表。
 * - 行=seq+类型标+摘要（detail 单字段——服务层已内嵌 before/after 各截 200
 *   字符，全文本呈现即覆盖展开语义）；只读零编辑控件。
 * - 类型标展示映射（kind 冻结 8 值→二分，§3.3-补 5「展示映射无数据面」）：
 *   mutated/result_overflow=「变更」（数据/结果变化面）；其余 6 值=「权限决策」
 *   （生命周期决策面）——自裁映射申报在案。
 * - 分页（终裁 N-2）：首载 limit=100+「加载更多」（afterSeq 递增——驻 store）；
 *   exhausted（首载/次页回包<100）时翻页钮隐藏。
 *
 * ── 接口层 ──
 * - export function AuditDrawer(): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 纯消费 store（数据面禁直连 api）；测试=e2e E6（真实文本+seq 升序断言）。
 */
import { useAiTasksStore } from './aiTasksStore'
import type { AiAuditKind } from '@shared/models/ai-domain'

/** kind 二分展示映射（「变更」面——数据/结果变化记录） */
const MUTATION_KINDS: ReadonlySet<AiAuditKind> = new Set(['mutated', 'result_overflow'])

function kindLabel(kind: AiAuditKind): string {
  return MUTATION_KINDS.has(kind) ? '变更' : '权限决策'
}

export function AuditDrawer(): JSX.Element | null {
  const taskId = useAiTasksStore((s) => s.activeAudit)
  const entry = useAiTasksStore((s) => (s.activeAudit === null ? undefined : s.audits[s.activeAudit]))
  const closeAudit = useAiTasksStore((s) => s.closeAudit)
  const loadMoreAudit = useAiTasksStore((s) => s.loadMoreAudit)

  if (taskId === null) return null

  return (
    <div
      data-testid="ai-audit-drawer"
      data-task-id={taskId}
      className="absolute inset-y-0 right-0 z-(--z-pop) flex w-[85%] max-w-sm flex-col border-l shadow-2xl"
      style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}
    >
      <div className="flex shrink-0 items-center justify-between border-b px-3 py-2" style={{ borderColor: 'var(--border)' }}>
        <span className="text-xs font-medium">审计记录</span>
        <button
          type="button"
          aria-label="关闭审计"
          className="syn-icon-btn rounded px-1 text-xs leading-none"
          style={{ color: 'var(--text-dim)' }}
          onClick={() => {
            closeAudit()
          }}
        >
          ×
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-2 text-xs">
        {entry === undefined || entry.status === 'loading' ? (
          <div className="flex flex-1 items-center justify-center p-2" style={{ color: 'var(--text-dim)' }}>
            正在加载审计…
          </div>
        ) : entry.status === 'empty' ? (
          <div className="flex flex-1 items-center justify-center p-2" style={{ color: 'var(--text-dim)' }}>
            暂无审计记录
          </div>
        ) : entry.status === 'error' ? (
          <div role="alert" className="flex flex-1 items-center justify-center p-2" style={{ color: 'var(--danger)' }}>
            请求无效，请重试
          </div>
        ) : (
          <>
            {entry.rows.map((row) => (
              <div
                key={row.seq}
                data-testid="ai-audit-row"
                data-seq={row.seq}
                data-kind={row.kind}
                className="flex flex-col gap-0.5 rounded border px-2 py-1.5"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="shrink-0 text-[10px]" style={{ color: 'var(--text-dim)' }}>
                    #{row.seq}
                  </span>
                  <span
                    className="shrink-0 rounded px-1 text-[10px] leading-4"
                    style={{ background: 'var(--bg)', color: 'var(--accent)' }}
                  >
                    {kindLabel(row.kind)}
                  </span>
                </div>
                {/* 摘要全文（detail 含服务层组装的 before/after——截 200 字符内） */}
                {row.detail !== null && (
                  <p className="m-0 whitespace-pre-wrap break-words" style={{ color: 'var(--text)' }}>
                    {row.detail}
                  </p>
                )}
              </div>
            ))}
            {!entry.exhausted && (
              <button
                type="button"
                aria-label="加载更多"
                className="mt-1 shrink-0 rounded border px-2 py-1 text-xs"
                style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}
                disabled={entry.loadingMore}
                onClick={() => {
                  loadMoreAudit(taskId)
                }}
              >
                {entry.loadingMore ? '加载中…' : '加载更多'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
