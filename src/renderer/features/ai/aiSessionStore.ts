/**
 * [F-DBCAMP-01 DB-2 UI U3] aiSessionStore —— 会话面板态（只读历史面）。
 *
 * ── 行为层（态机：无条目→loading→ready｜notFound｜error）──
 * - key=`${scope}:${anchorId ?? 'global'}`（三档会话入口的单例定位——同锚
 *   跨入口共享同一条目）；条目={status, sessionId, messages}。
 * - open(scope, anchorId)：挂载即调（三档统一——AiSessionPanel useEffect）；
 *   幂等护栏=loading/ready 在场不再派发（重挂防重入）；notFound/error 在场
 *   允许重派（重挂即重试——无重试钮设计的补偿路径）。
 * - open 成功→链式 listMessages（sessionId 落地后取消息）；两跳共用一套
 *   错误映射：NOT_FOUND→notFound（幽灵锚「锚对象不存在或已删除」）/其余
 *   （INVALID_REQUEST/网络/异常）→error（「请求无效，请重试」——不透传服务
 *   层 message，票面 §1.1）。
 * - 竞态丢弃：per-key 请求序号 stale-guard（notes.store loadSeq 先例——晚到
 *   旧响应〔含旧失败〕直接丢弃）；unload 自增序号=在途响应不得复活已删条目
 *   （面板卸载清 key 的完整语义：条目删除+在途失格）。
 * - unload(key)：面板卸载调（AiSessionPanel unmount effect）——删条目；条目
 *   不存在亦无害（幂等）。
 *
 * ── 接口层 ──
 * - export const useAiSessionStore / aiSessionKey(scope, anchorId)
 *
 * ── 架构层 ──
 * - 只 import api/client 与 shared 模型；数据面只经 ai_sessions/open+
 *   listMessages 两通道（unwrap 解包——本批会话零写面：只读历史，发送能力
 *   不在本批=设计 §6）。
 *
 * ── 生命周期层 ──
 * - U4 承接：任务区（TaskCard）不在本 store（aiTasksStore 另立）；审计行态
 *   入 aiTasksStore（设计 §4.2）。
 *
 * ── 文化层 ──
 * - 测试：tests/unit/renderer/ai-session-store.test.ts（受锁——态机/幂等/
 *   竞态/卸载/错误映射五轴）。
 */
import { create } from 'zustand'
import { api, unwrap, ApiClientError } from '../../api/client'
import type { AiMessage, AiScope } from '@shared/models/ai-domain'

/** 面板态枚举（列表子态在组件层：messages 空=「暂无会话消息」） */
export type AiSessionPanelStatus = 'loading' | 'ready' | 'notFound' | 'error'

export interface AiSessionEntry {
  status: AiSessionPanelStatus
  /** open 落地的会话 id（listMessages 载荷单源；loading/notFound/error=null） */
  sessionId: number | null
  messages: AiMessage[]
}

export interface AiSessionStore {
  panels: Record<string, AiSessionEntry>
  open(scope: AiScope, anchorId: string | null): void
  /** 面板卸载清对应 key（幂等——条目不存在亦无害） */
  unload(key: string): void
}

/** 三档会话入口的条目定位 key（global 档 anchorId=null→字面 'global'） */
export function aiSessionKey(scope: AiScope, anchorId: string | null): string {
  return `${scope}:${anchorId ?? 'global'}`
}

const EMPTY_ENTRY: AiSessionEntry = { status: 'loading', sessionId: null, messages: [] }

export const useAiSessionStore = create<AiSessionStore>()((set, get) => {
  // per-key 请求序号（stale-guard）：每键独立——三档面板并存时互不误伤
  const openSeq = new Map<string, number>()

  const setEntry = (key: string, patch: Partial<AiSessionEntry>): void => {
    set({ panels: { ...get().panels, [key]: { ...EMPTY_ENTRY, ...get().panels[key], ...patch } } })
  }

  const dropEntry = (key: string): void => {
    const rest = { ...get().panels }
    delete rest[key]
    set({ panels: rest })
  }

  return {
    panels: {},

    open(scope, anchorId) {
      const key = aiSessionKey(scope, anchorId)
      const cur = get().panels[key]
      // 幂等护栏：loading/ready 在场不再派发；notFound/error 允许重派（重挂重试）
      if (cur !== undefined && (cur.status === 'loading' || cur.status === 'ready')) return
      const seq = (openSeq.get(key) ?? 0) + 1
      openSeq.set(key, seq)
      setEntry(key, { status: 'loading', sessionId: null, messages: [] })
      unwrap(api.ai_sessions.open({ scope, anchorId }))
        .then((res) => {
          // 旧响应晚到（本键已再派发/已卸载）：丢弃
          if (openSeq.get(key) !== seq) return
          const sessionId = res.session.id
          return unwrap(api.ai_sessions.listMessages({ sessionId })).then((r) => {
            if (openSeq.get(key) !== seq) return
            setEntry(key, { status: 'ready', sessionId, messages: r.messages })
          })
        })
        .catch((e: unknown) => {
          // 旧失败同样按迟到丢弃；错误码映射：NOT_FOUND→notFound，其余→error
          if (openSeq.get(key) !== seq) return
          const code = e instanceof ApiClientError ? e.code : ''
          setEntry(key, { status: code === 'NOT_FOUND' ? 'notFound' : 'error', sessionId: null, messages: [] })
        })
    },

    unload(key) {
      // 卸载清 key+序号自增：在途 open/listMessages 响应到达时按守卫全 no-op
      // （不得复活条目——重挂后的新链归新序号）
      openSeq.set(key, (openSeq.get(key) ?? 0) + 1)
      dropEntry(key)
    }
  }
})
