/**
 * [F-DBCAMP-01 DB-2 UI U3] MessageList —— 会话消息列表+空态（只读历史面）。
 *
 * ── 行为层 ──
 * - messages 空=「暂无会话消息」空态；非空=MessageList 渲染（id 升序由服务端
 *   listMessages 口径保证——本组件零排序）。
 *
 * ── 接口层 ──
 * - export function MessageList(props: { messages: AiMessage[] }): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 纯展示；测试随 AiSessionPanel 面（e2e E1 空态文案锚）。
 */
import type { AiMessage } from '@shared/models/ai-domain'
import { MessageItem } from './MessageItem'

export function MessageList(props: { messages: AiMessage[] }): JSX.Element {
  if (props.messages.length === 0) {
    return (
      <div
        data-testid="ai-message-list-empty"
        className="flex flex-1 items-center justify-center p-4 text-center text-xs"
        style={{ color: 'var(--text-dim)' }}
      >
        暂无会话消息
      </div>
    )
  }
  return (
    <div data-testid="ai-message-list" className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
      {props.messages.map((m) => (
        <MessageItem key={m.id} message={m} />
      ))}
    </div>
  )
}
