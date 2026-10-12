/**
 * [F-DBCAMP-01 DB-2 UI U3] MessageItem —— 会话消息行（只读历史面）。
 *
 * ── 行为层 ──
 * - user 右列/assistant 左列（flex row-reverse/row——设计 §1.1）；pinned 行
 *   顶部钉标「已置顶」；无任务结果联动高亮（R18 砍除——设计 §1.1）。
 * - createdAt 展示=本地时间 HH:mm（轻量 Date 格式化——禁新依赖；非法时间
 *   串退化空串不崩）。
 *
 * ── 接口层 ──
 * - export function MessageItem(props: { message: AiMessage }): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 纯展示；AiMessage=shared 投影单源（@shared/models/ai-domain——禁手写
 *  等价类型）；测试随 AiSessionPanel 面（e2e E1/E2 族）。
 */
import type { AiMessage } from '@shared/models/ai-domain'

/** 本地时间 HH:mm（补零；非法串→''——服务端契约 z.string，防御位） */
function formatHm(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function MessageItem(props: { message: AiMessage }): JSX.Element {
  const m = props.message
  const isUser = m.role === 'user'
  return (
    <div className={`flex min-w-0 flex-col gap-0.5 ${isUser ? 'items-end' : 'items-start'}`}>
      {m.pinned && (
        <span className="text-[10px]" style={{ color: 'var(--accent)' }}>
          已置顶
        </span>
      )}
      {/* user=右列（row-reverse）/assistant=左列（row）；气泡底=panel+border，
          同 max-w 限宽防长文撑破侧栏 */}
      <div
        className={`flex w-full items-end gap-1.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
        data-role={m.role}
        data-pinned={m.pinned ? 'true' : 'false'}
      >
        <p
          className="m-0 max-w-[85%] whitespace-pre-wrap break-words rounded-md border px-2 py-1 text-xs leading-5"
          style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}
        >
          {m.content}
        </p>
        <span className="shrink-0 text-[10px]" style={{ color: 'var(--text-dim)' }}>
          {formatHm(m.createdAt)}
        </span>
      </div>
    </div>
  )
}
