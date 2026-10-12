/**
 * [F-DBCAMP-01 DB-2 UI U3] AiSessionPanel —— 共享会话壳（三档统一入口）。
 *
 * ── 行为层 ──
 * - props {scope, anchorId}；挂载 useEffect 即 store.open（三档统一——挂载即
 *   open）；卸载 effect 调 unload（面板卸载清对应 key——重挂重新 open）。
 * - 状态枚举 loading|ready|notFound|error（驻 store，本组件纯消费）：
 *   loading（含条目未建）=「正在加载会话…」；notFound=幽灵锚「锚对象不
 *   存在或已删除」；error=「请求无效，请重试」（不透传服务层 message、
 *   不加重试钮——错误码映射驻 store）；ready=MessageList+ComposerDisabled。
 * - 列表子态（MessageList 承载）：messages 空=「暂无会话消息」。
 *
 * ── 接口层 ──
 * - export function AiSessionPanel(props: { scope: AiScope; anchorId: string | null }): JSX.Element
 *
 * ── 架构层 ──
 * - 三档薄包装的宿主：PaperAiPanel（reader 侧栏）/LineageAiPanel（脉络侧栏）
 *   /SettingsPage AI 助手节（global 档 anchorId=null 直挂）；数据面只经
 *   aiSessionStore（open/listMessages 两通道——禁组件直连 api）。
 *
 * ── 生命周期层 ──
 * - 无任务区（TaskCard=U4）、无审计（U4）、无管理 Tab（U5）、无预算（U6）
 *   ——面板底部只有 ComposerDisabled；U4-U6 在 MessageList 与 Composer 之间
 *   扩任务区（本壳为扩展点）。
 *
 * ── 文化层 ──
 * - 测试：e2e E1（三入口空会话+置灰发送框）；单测=ai-session-store.test
 *   （态机轴）+outline-aside.test（reader 集成面）。
 */
import { useEffect } from 'react'
import type { AiScope } from '@shared/models/ai-domain'
import { aiSessionKey, useAiSessionStore } from './aiSessionStore'
import { ComposerDisabled } from './ComposerDisabled'
import { MessageList } from './MessageList'

export function AiSessionPanel(props: { scope: AiScope; anchorId: string | null }): JSX.Element {
  const { scope, anchorId } = props
  const key = aiSessionKey(scope, anchorId)
  const entry = useAiSessionStore((s) => s.panels[key])
  const open = useAiSessionStore((s) => s.open)
  const unload = useAiSessionStore((s) => s.unload)

  // 挂载即 open（三档统一）；卸载清 key（在途响应经 store 序号守卫失格）
  useEffect(() => {
    open(scope, anchorId)
    return () => {
      unload(aiSessionKey(scope, anchorId))
    }
  }, [scope, anchorId, open, unload])

  return (
    <div
      data-testid="ai-session-panel"
      data-scope={scope}
      // [r1′ R1a 主控授权] 锚透出（e2e「选图生效」真锚——E1② 断言 lineage 档
      // data-anchor=所选 folderId 而非 __main__ 兜底；global 档 null 时 React
      // 省略属性）
      data-anchor={anchorId}
      className="flex h-full min-h-0 flex-col"
    >
      {entry === undefined || entry.status === 'loading' ? (
        <div
          className="flex flex-1 items-center justify-center p-4 text-xs"
          style={{ color: 'var(--text-dim)' }}
        >
          正在加载会话…
        </div>
      ) : entry.status === 'notFound' ? (
        <div
          className="flex flex-1 items-center justify-center p-4 text-center text-xs"
          style={{ color: 'var(--text-dim)' }}
        >
          锚对象不存在或已删除
        </div>
      ) : entry.status === 'error' ? (
        <div
          role="alert"
          className="flex flex-1 items-center justify-center p-4 text-center text-xs"
          style={{ color: 'var(--danger)' }}
        >
          请求无效，请重试
        </div>
      ) : (
        <>
          <MessageList messages={entry.messages} />
          {/* 面板底部只有置灰发送框（只读历史——发送能力不在本批，设计 §6） */}
          <ComposerDisabled />
        </>
      )}
    </div>
  )
}
