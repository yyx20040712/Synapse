/**
 * [F-DBCAMP-01 DB-2 UI U3] AiSessionPanel —— 共享会话壳（三档统一入口）。
 *
 * ── 行为层 ──
 * - props {scope, anchorId}；挂载 useEffect 即 store.open（三档统一——挂载即
 *   open）；卸载 effect 调 unload（面板卸载清对应 key——重挂重新 open）。
 * - 状态枚举 loading|ready|notFound|error（驻 store，本组件纯消费）：
 *   loading（含条目未建）=「正在加载会话…」；notFound=幽灵锚「锚对象不
 *   存在或已删除」；error=「请求无效，请重试」（不透传服务层 message、
 *   不加重试钮——错误码映射驻 store）；ready=MessageList+任务区（U4）
 *   +ComposerDisabled。
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
 * - [U4] 任务区插在 MessageList 与 ComposerDisabled 之间（D2 扩展点落位）：
 *   挂载即 aiTasksStore.load（与 open 并行——任务面无会话依赖，AiTask 无
 *   sessionId）；卸载 unloadTasks 清 key；卸载/换锚经 cleanup 关审计抽屉
 *   （R1-B1 单抽屉全局语义——'ai' 页签 CSS 隐藏不卸载，页签切换不触发）。
 *   审计抽屉=面板内右侧覆盖层（根 relative 承载）。无管理 Tab（U5）、无预算（U6）。
 *
 * ── 文化层 ──
 * - 测试：e2e E1（三入口空会话+置灰发送框）/E2/E6=ai-tasks-card.spec；单测=
 *   ai-session-store.test（态机轴）+ai-tasks-store.test（任务/审计轴）
 *   +outline-aside.test（reader 集成面）。
 */
import { useEffect } from 'react'
import type { AiScope } from '@shared/models/ai-domain'
import { aiSessionKey, useAiSessionStore } from './aiSessionStore'
import { aiTasksKey, useAiTasksStore } from './aiTasksStore'
import { AuditDrawer } from './AuditDrawer'
import { ComposerDisabled } from './ComposerDisabled'
import { MessageList } from './MessageList'
import { TaskCard } from './TaskCard'

export function AiSessionPanel(props: { scope: AiScope; anchorId: string | null }): JSX.Element {
  const { scope, anchorId } = props
  const key = aiSessionKey(scope, anchorId)
  const tasksKey = aiTasksKey(scope, anchorId)
  const entry = useAiSessionStore((s) => s.panels[key])
  const open = useAiSessionStore((s) => s.open)
  const unload = useAiSessionStore((s) => s.unload)
  // [R1-N] 任务面 selector 显式用 aiTasksKey（与 cleanup 对称——两 key 口径
  // 同形但归属各异，禁隐式共享会话 key 变量）
  const tasksEntry = useAiTasksStore((s) => s.panels[tasksKey])
  const loadTasks = useAiTasksStore((s) => s.load)
  const unloadTasks = useAiTasksStore((s) => s.unloadTasks)
  const closeAudit = useAiTasksStore((s) => s.closeAudit)

  // 挂载即 open（三档统一）；卸载清 key（在途响应经 store 序号守卫失格）
  useEffect(() => {
    open(scope, anchorId)
    return () => {
      unload(aiSessionKey(scope, anchorId))
    }
  }, [scope, anchorId, open, unload])

  // 任务面并行生命周期（与 open 各自独立——数据面互不依赖）；[R1-B1] 卸载/
  // 换锚时抽屉归属面消失必关（单抽屉全局语义——'ai' 页签 CSS 隐藏不卸载，页签
  // 切换不触发本 cleanup；换文献/换锚重挂时关，晚到审计回包经 store 序号失格）
  useEffect(() => {
    loadTasks(scope, anchorId)
    return () => {
      unloadTasks(aiTasksKey(scope, anchorId))
      closeAudit()
    }
  }, [scope, anchorId, loadTasks, unloadTasks, closeAudit])

  return (
    <div
      data-testid="ai-session-panel"
      data-scope={scope}
      // [r1′ R1a 主控授权] 锚透出（e2e「选图生效」真锚——E1② 断言 lineage 档
      // data-anchor=所选 folderId 而非 __main__ 兜底；global 档 null 时 React
      // 省略属性）；relative=审计抽屉覆盖层定位面（U4）
      data-anchor={anchorId}
      className="relative flex h-full min-h-0 flex-col"
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
          {/* [U4] 任务区（设计 §1.2——消息列表下方；数据=ai-tasks-list 按
              scope+anchorId 过滤；空态「暂无任务」） */}
          <section
            data-testid="ai-tasks-section"
            className="flex max-h-40 shrink-0 flex-col gap-1.5 overflow-y-auto border-t p-2"
            style={{ borderColor: 'var(--border)' }}
          >
            <h3 className="m-0 text-[11px] font-medium" style={{ color: 'var(--text-dim)' }}>
              任务
            </h3>
            {tasksEntry === undefined || tasksEntry.status === 'loading' ? (
              <div className="text-xs" style={{ color: 'var(--text-dim)' }}>
                正在加载任务…
              </div>
            ) : tasksEntry.status === 'error' ? (
              <div role="alert" className="text-xs" style={{ color: 'var(--danger)' }}>
                请求无效，请重试
              </div>
            ) : tasksEntry.tasks.length === 0 ? (
              <div className="text-xs" style={{ color: 'var(--text-dim)' }}>
                暂无任务
              </div>
            ) : (
              tasksEntry.tasks.map((t) => <TaskCard key={t.id} task={t} />)
            )}
          </section>
          {/* 面板底部只有置灰发送框（只读历史——发送能力不在本批，设计 §6） */}
          <ComposerDisabled />
        </>
      )}
      {/* 任务级审计抽屉（面板内右侧覆盖层——单抽屉，态驻 aiTasksStore） */}
      <AuditDrawer />
    </div>
  )
}
