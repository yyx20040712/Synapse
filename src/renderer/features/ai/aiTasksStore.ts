/**
 * [F-DBCAMP-01 DB-2 UI U4] aiTasksStore —— 任务区列表+取消+审计抽屉态
 * （设计 §4.2：任务+取消+审计行统一入本 store；组件禁直连 api）。
 *
 * ── 行为层（任务面）──
 * - key=`${scope}:${anchorId ?? 'global'}`（沿 aiSessionKey 口径——同锚跨入口
 *   共享同一条目）；条目={status, tasks}；态=loading|ready|error。
 * - load(scope, anchorId)：面板挂载即调（AiSessionPanel useEffect）；幂等护栏
 *   =loading/ready 在场不再派发；error 允许重派（重挂重试——沿 aiSessionStore
 *   范式）。req 恒 {scope, anchorId}（D7：list 传显式锚——global 档 null 为
 *   服务层恒空合法形，任务行恒锚定 paper/lineage 档）。
 * - cancelTask(taskId, scope, anchorId)：成功→回包行原位替换（cancelled 态
 *   即时呈现）；错误码映射（D5 终裁 N-1 卡面统一 toast）：CONFLICT→toast
 *   「仅排队中的任务可取消」；NOT_FOUND→重派 list 刷新（拉新事实，无 toast）；
 *   INVALID_REQUEST/网络异常→toast「请求无效，请重试」（§1.1 同文案）。
 * - 竞态丢弃：per-key 请求序号 stale-guard（load/unloadTasks 自增使晚到的
 *   list 响应与 cancel 回包全失格——面板卸载后不得复活条目）。
 * - unloadTasks(key)：面板卸载调——删条目+序号自增（幂等）。
 *
 * ── 行为层（审计抽屉面，D6）──
 * - 单抽屉：activeAudit=当前打开的 taskId（null=关闭）；openAudit 切换任务时
 *   清旧任务条目（不累积）。条目={status, rows, exhausted, loadingMore}；
 *   态=closed(无条目)|loading|ready|empty("暂无审计记录")|error。
 * - 首载 limit=100（AUDIT_PAGE_LIMIT 单源）；rows 空→empty；非空→ready+
 *   exhausted=(rows.length<100)。「加载更多」=afterSeq 末行 seq 递增翻页：
 *   append+exhausted 更新；loadingMore 在途防重入；翻页失败仅复位 loadingMore
 *   （已载行不灭——只读面保守呈现）。
 * - closeAudit()：清 activeAudit+删条目+序号自增（在途审计响应失格）。
 *
 * ── 接口层 ──
 * - export const useAiTasksStore / aiTasksKey(scope, anchorId)
 *
 * ── 架构层 ──
 * - 只 import api/client 与 shared 模型；数据面只经 ai_tasks/list+cancel、
 *   ai_audit/list 三通道（renderer 分层单向——window.api 唯一出口）。
 *
 * ── 文化层 ──
 * - 测试：tests/unit/renderer/ai-tasks-store.test.ts（受锁——任务态机/幂等/
 *   竞态/取消映射/审计态机/分页轴）；e2e E2/E6=ai-tasks-card.spec.ts。
 */
import { create } from 'zustand'
import { api, unwrap, ApiClientError } from '../../api/client'
import { showToast } from '../../shared/ui/toast-store'
import type { AiAuditRow, AiScope, AiTask } from '@shared/models/ai-domain'

/** 任务区态枚举（条目缺席=面板未挂载） */
export type AiTasksStatus = 'loading' | 'ready' | 'error'

export interface AiTasksEntry {
  status: AiTasksStatus
  tasks: AiTask[]
}

/** 审计抽屉态枚举（closed=audits 无条目；empty=「暂无审计记录」——D3） */
export type AiAuditStatus = 'loading' | 'ready' | 'empty' | 'error'

export interface AiAuditEntry {
  status: AiAuditStatus
  rows: AiAuditRow[]
  /** 已到末页（回包行数<limit）——「加载更多」隐藏 */
  exhausted: boolean
  /** 「加载更多」在途（防重入） */
  loadingMore: boolean
}

export interface AiTasksStore {
  panels: Record<string, AiTasksEntry>
  audits: Record<number, AiAuditEntry>
  /** 当前打开审计抽屉的任务 id（null=关闭——单抽屉） */
  activeAudit: number | null
  load(scope: AiScope, anchorId: string | null): void
  /** 面板卸载清对应 key（幂等） */
  unloadTasks(key: string): void
  cancelTask(taskId: number, scope: AiScope, anchorId: string | null): void
  openAudit(taskId: number): void
  loadMoreAudit(taskId: number): void
  closeAudit(): void
}

/** 任务区条目定位 key（与 aiSessionKey 同口径） */
export function aiTasksKey(scope: AiScope, anchorId: string | null): string {
  return `${scope}:${anchorId ?? 'global'}`
}

/** 审计抽屉分页页大小（设计 §1.3 首载 limit=100——单源） */
const AUDIT_PAGE_LIMIT = 100

const EMPTY_PANEL: AiTasksEntry = { status: 'loading', tasks: [] }
const EMPTY_AUDIT: AiAuditEntry = { status: 'loading', rows: [], exhausted: false, loadingMore: false }

export const useAiTasksStore = create<AiTasksStore>()((set, get) => {
  // per-key/per-taskId 请求序号（stale-guard——沿 aiSessionStore openSeq 范式）
  const taskSeq = new Map<string, number>()
  const auditSeq = new Map<number, number>()

  const setPanel = (key: string, patch: Partial<AiTasksEntry>): void => {
    set({ panels: { ...get().panels, [key]: { ...EMPTY_PANEL, ...get().panels[key], ...patch } } })
  }

  const dropPanel = (key: string): void => {
    const rest = { ...get().panels }
    delete rest[key]
    set({ panels: rest })
  }

  const setAudit = (taskId: number, patch: Partial<AiAuditEntry>): void => {
    set({ audits: { ...get().audits, [taskId]: { ...EMPTY_AUDIT, ...get().audits[taskId], ...patch } } })
  }

  const dropAudit = (taskId: number): void => {
    const rest = { ...get().audits }
    delete rest[taskId]
    set({ audits: rest })
  }

  const fetchTasks = (key: string, scope: AiScope, anchorId: string | null): void => {
    const seq = (taskSeq.get(key) ?? 0) + 1
    taskSeq.set(key, seq)
    setPanel(key, { status: 'loading', tasks: [] })
    unwrap(api.ai_tasks.list({ scope, anchorId }))
      .then((res) => {
        if (taskSeq.get(key) !== seq) return
        setPanel(key, { status: 'ready', tasks: res.tasks })
      })
      .catch(() => {
        if (taskSeq.get(key) !== seq) return
        setPanel(key, { status: 'error', tasks: [] })
      })
  }

  return {
    panels: {},
    audits: {},
    activeAudit: null,

    load(scope, anchorId) {
      const key = aiTasksKey(scope, anchorId)
      const cur = get().panels[key]
      // 幂等护栏：loading/ready 在场不再派发；error 允许重派（重挂重试）
      if (cur !== undefined && (cur.status === 'loading' || cur.status === 'ready')) return
      fetchTasks(key, scope, anchorId)
    },

    unloadTasks(key) {
      // 卸载清 key+序号自增：在途 list 响应/cancel 回包到达时全 no-op
      taskSeq.set(key, (taskSeq.get(key) ?? 0) + 1)
      dropPanel(key)
    },

    cancelTask(taskId, scope, anchorId) {
      const key = aiTasksKey(scope, anchorId)
      const seq = taskSeq.get(key) ?? 0
      unwrap(api.ai_tasks.cancel({ taskId }))
        .then((res) => {
          // 面板已卸载/已重载：丢弃（不得复活或改写条目）
          if (taskSeq.get(key) !== seq) return
          const entry = get().panels[key]
          if (entry === undefined) return
          setPanel(key, { tasks: entry.tasks.map((t) => (t.id === taskId ? res.task : t)) })
        })
        .catch((e: unknown) => {
          if (taskSeq.get(key) !== seq) return
          const code = e instanceof ApiClientError ? e.code : ''
          if (code === 'NOT_FOUND') {
            // 任务已不存在（他处删除/级联）→刷新列表拉新事实（D5）
            fetchTasks(key, scope, anchorId)
            return
          }
          // CONFLICT→专文案；其余（INVALID_REQUEST/网络异常）→通用错误（终裁 N-1）
          showToast(code === 'CONFLICT' ? '仅排队中的任务可取消' : '请求无效，请重试', 'error')
        })
    },

    openAudit(taskId) {
      // 单抽屉：切换任务先清旧面（序号自增——旧在途响应失格）
      const prev = get().activeAudit
      if (prev !== null && prev !== taskId) {
        auditSeq.set(prev, (auditSeq.get(prev) ?? 0) + 1)
        dropAudit(prev)
      }
      set({ activeAudit: taskId })
      const cur = get().audits[taskId]
      // 幂等护栏：loading/ready/empty 在场不再派发（抽屉已开防连点）；error 可重派
      if (cur !== undefined && cur.status !== 'error') return
      const seq = (auditSeq.get(taskId) ?? 0) + 1
      auditSeq.set(taskId, seq)
      setAudit(taskId, { status: 'loading', rows: [], exhausted: false, loadingMore: false })
      unwrap(api.ai_audit.list({ taskId, limit: AUDIT_PAGE_LIMIT }))
        .then((res) => {
          if (auditSeq.get(taskId) !== seq) return
          if (res.rows.length === 0) {
            setAudit(taskId, { status: 'empty' })
            return
          }
          setAudit(taskId, { status: 'ready', rows: res.rows, exhausted: res.rows.length < AUDIT_PAGE_LIMIT })
        })
        .catch(() => {
          if (auditSeq.get(taskId) !== seq) return
          setAudit(taskId, { status: 'error' })
        })
    },

    loadMoreAudit(taskId) {
      const cur = get().audits[taskId]
      if (cur === undefined || cur.status !== 'ready' || cur.loadingMore || cur.exhausted) return
      const seq = auditSeq.get(taskId) ?? 0
      const afterSeq = cur.rows[cur.rows.length - 1]?.seq ?? 0
      setAudit(taskId, { loadingMore: true })
      unwrap(api.ai_audit.list({ taskId, afterSeq, limit: AUDIT_PAGE_LIMIT }))
        .then((res) => {
          // 抽屉已关/已切换：丢弃
          if (auditSeq.get(taskId) !== seq) return
          const now = get().audits[taskId]
          if (now === undefined) return
          setAudit(taskId, {
            rows: [...now.rows, ...res.rows],
            exhausted: res.rows.length < AUDIT_PAGE_LIMIT,
            loadingMore: false
          })
        })
        .catch(() => {
          if (auditSeq.get(taskId) !== seq) return
          // 翻页失败仅复位在途标志（已载行不灭）
          setAudit(taskId, { loadingMore: false })
        })
    },

    closeAudit() {
      const cur = get().activeAudit
      if (cur === null) return
      auditSeq.set(cur, (auditSeq.get(cur) ?? 0) + 1)
      dropAudit(cur)
      set({ activeAudit: null })
    }
  }
})
