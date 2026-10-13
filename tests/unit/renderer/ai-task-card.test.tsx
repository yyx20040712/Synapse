// @vitest-environment jsdom
/**
 * [F-DBCAMP-01 DB-2 UI U4·R1 回炉] TaskCard/AuditDrawer/任务区 —— 组件渲染面
 * （门一 k3-W3+d1-W5 双席；jsdom 习语=outline-aside.test.tsx：createRoot+act
 * +makeApiStub 工厂，always-active 裸 describe——K3）。
 *
 * 覆盖：①终态四态（succeeded/failed/timeout/cancelled）无「取消任务」钮+六态
 * 文案（running 缺位已有 e2e E2 锚）；②targetTitle null 与 '' 双档回退 scope
 * 文案；③任务区三态（正在加载任务…/暂无任务/role=alert 错误行——限定
 * ai-tasks-section 容器防与会话 error 行互染）；④AuditDrawer「加载更多」正向
 * （!exhausted 在场/loadingMore 联动 disabled+「加载中…」文案）；
 * ⑤[R1-B1] 面板卸载关抽屉（单抽屉全局语义——cleanup 调 closeAudit：unmount 后
 * activeAudit=null+audits 条目不残留+晚到审计回包不复活）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

// ai 域三面桩：缺省桩（api-client-mock U4 段）恒 ok 空回包；逐用例经持有引用
// 覆盖 list 实现（同键后写者胜——loading/error/晚到场景受控）
const tasksList = vi.fn()
const auditList = vi.fn()
makeApiStub({
  ai_tasks: { list: tasksList, cancel: vi.fn() },
  ai_audit: { list: auditList }
})

import { AiSessionPanel } from '../../../src/renderer/features/ai/AiSessionPanel'
import { AuditDrawer } from '../../../src/renderer/features/ai/AuditDrawer'
import { TaskCard } from '../../../src/renderer/features/ai/TaskCard'
import { useAiTasksStore } from '../../../src/renderer/features/ai/aiTasksStore'
import type { AiAuditRow, AiTask, AiTaskStatus } from '../../../src/shared/models/ai-domain'

/** 任务夹具（shared 投影字面——over 覆写制造多态行） */
function tcard(over: Partial<AiTask> = {}): AiTask {
  return {
    id: 21,
    scope: 'paper',
    anchorId: 'p-1',
    action: 'memory.create',
    status: 'queued',
    result: null,
    error: null,
    idempotencyKey: null,
    targetTitle: '文献甲',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...over
  }
}

function arow(seq: number): AiAuditRow {
  return { taskId: 21, seq, kind: 'submitted', detail: `第${seq}段`, createdAt: '2026-01-01T00:00:00Z' }
}

/** 终态四态（queued 对照钮在场——running 缺位=e2e E2 面） */
const FINAL_STATUSES: Array<{ status: AiTaskStatus; label: string }> = [
  { status: 'succeeded', label: '已完成' },
  { status: 'failed', label: '失败' },
  { status: 'timeout', label: '超时' },
  { status: 'cancelled', label: '已取消' }
]

let root: Root | null = null
let host: HTMLDivElement | null = null

function mount(node: JSX.Element): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(node)
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  // store 单例逐用例重置（zustand setState 浅合并——三字段显式清）
  useAiTasksStore.setState({ panels: {}, audits: {}, activeAudit: null })
  // 缺省回填（clearAllMocks 不清实现，但显式重设保用例独立）
  tasksList.mockImplementation(async () => ({ ok: true as const, data: { tasks: [] } }))
  auditList.mockImplementation(async () => ({ ok: true as const, data: { rows: [] } }))
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
})

describe('F-DBCAMP-01 U4 R1 TaskCard/AuditDrawer/任务区 —— 组件渲染面', () => {
  it('W3① 终态四态无「取消任务」钮+文案；queued 对照钮在场（running 缺位=e2e 面）', () => {
    for (const { status, label } of FINAL_STATUSES) {
      mount(<TaskCard task={tcard({ status })} />)
      expect(host?.querySelector('[data-testid="ai-task-status"]')?.textContent, `${status} 文案`).toBe(label)
      expect(host?.querySelector('[aria-label="取消任务"]'), `${status} 无取消钮`).toBeNull()
    }
    // queued 对照：取消钮在场（e2e 已锁——组件层正向再锚）
    mount(<TaskCard task={tcard({ status: 'queued' })} />)
    expect(host?.querySelector('[aria-label="取消任务"]')).not.toBeNull()
    // succeeded/failed 副行（result/error 非空时）
    mount(<TaskCard task={tcard({ status: 'succeeded', result: '已归档 2 条记忆' })} />)
    expect(host?.querySelector('[data-testid="ai-task-result"]')?.textContent).toBe('已归档 2 条记忆')
    mount(<TaskCard task={tcard({ status: 'failed', error: '记忆服务暂不可用' })} />)
    expect(host?.querySelector('[data-testid="ai-task-error"]')?.textContent).toBe('记忆服务暂不可用')
  })

  it('W3② targetTitle null 与空串双档回退 scope 文案（paper→文献/lineage→脉络）', () => {
    mount(<TaskCard task={tcard({ targetTitle: null })} />)
    expect(host?.querySelector('[data-testid="ai-task-target"]')?.textContent).toBe('文献')
    mount(<TaskCard task={tcard({ targetTitle: '' })} />)
    expect(host?.querySelector('[data-testid="ai-task-target"]')?.textContent).toBe('文献')
    mount(<TaskCard task={tcard({ scope: 'lineage', anchorId: 'c-1', targetTitle: null })} />)
    expect(host?.querySelector('[data-testid="ai-task-target"]')?.textContent).toBe('脉络')
    // 非空 targetTitle 原文直呈
    mount(<TaskCard task={tcard({ targetTitle: '文献甲' })} />)
    expect(host?.querySelector('[data-testid="ai-task-target"]')?.textContent).toBe('文献甲')
  })

  it('W3③ 任务区三态：正在加载任务…/暂无任务/role=alert 错误行（限定容器）', async () => {
    // 每场景独立挂卸+store 重置（store 单例跨 mount 共享——幂等护栏下不重置
    // 会直读上一场景 ready 条目）
    const panelText = async (): Promise<string> => {
      await act(async () => {
        await Promise.resolve()
        await Promise.resolve()
      })
      return host?.querySelector('[data-testid="ai-tasks-section"]')?.textContent ?? ''
    }
    const unmountPanel = (): void => {
      act(() => {
        root?.unmount()
      })
    }

    // 暂无任务（缺省桩恒 ok 空——会话 ready 后任务区空态）
    mount(<AiSessionPanel scope="global" anchorId={null} />)
    expect(await panelText()).toContain('暂无任务')
    unmountPanel()

    // loading：list 在途（deferred 不 resolve）
    let resolveList: (() => void) | undefined
    tasksList.mockImplementation(
      () =>
        new Promise((res) => {
          resolveList = () => res({ ok: true as const, data: { tasks: [] } })
        })
    )
    useAiTasksStore.setState({ panels: {}, audits: {}, activeAudit: null })
    mount(<AiSessionPanel scope="global" anchorId={null} />)
    expect(await panelText()).toContain('正在加载任务…')
    resolveList?.()
    unmountPanel()

    // error：list 失败（INVALID_REQUEST→error 行 role=alert，限定容器防与会话错行互染）
    tasksList.mockImplementation(async () => ({
      ok: false as const,
      error: { code: 'INVALID_REQUEST', message: '矩阵拒' }
    }))
    useAiTasksStore.setState({ panels: {}, audits: {}, activeAudit: null })
    mount(<AiSessionPanel scope="global" anchorId={null} />)
    await panelText()
    const errRow = host?.querySelector('[data-testid="ai-tasks-section"] [role="alert"]')
    expect(errRow?.getAttribute('role')).toBe('alert')
    expect(errRow?.textContent).toBe('请求无效，请重试')
  })

  it('W3④ AuditDrawer「加载更多」正向：!exhausted 在场+loadingMore 联动 disabled+「加载中…」', () => {
    // store 直驱（AuditDrawer 纯消费 store——态机轴已在 ai-tasks-store.test 锁）
    act(() => {
      useAiTasksStore.setState({
        activeAudit: 21,
        audits: { 21: { status: 'ready', rows: [arow(1), arow(2)], exhausted: false, loadingMore: false } }
      })
    })
    mount(<AuditDrawer />)
    const more = host?.querySelector('[data-testid="ai-audit-drawer"] [aria-label="加载更多"]') as HTMLButtonElement | null
    expect(more, '!exhausted→翻页钮在场').not.toBeNull()
    expect(more?.textContent).toBe('加载更多')
    expect(more?.disabled).toBe(false)
    // exhausted→隐藏
    act(() => {
      useAiTasksStore.setState({ audits: { 21: { status: 'ready', rows: [arow(1)], exhausted: true, loadingMore: false } } })
    })
    expect(host?.querySelector('[data-testid="ai-audit-drawer"] [aria-label="加载更多"]')).toBeNull()
    // loadingMore 在途：disabled+「加载中…」文案
    act(() => {
      useAiTasksStore.setState({ audits: { 21: { status: 'ready', rows: [arow(1)], exhausted: false, loadingMore: true } } })
    })
    const busy = host?.querySelector('[data-testid="ai-audit-drawer"] [aria-label="加载更多"]') as HTMLButtonElement | null
    expect(busy?.disabled).toBe(true)
    expect(busy?.textContent).toBe('加载中…')
  })

  it('R1-B1 面板卸载关抽屉：unmount→activeAudit null+条目不残留+晚到回包不复活', async () => {
    // 抽屉首载在途（deferred）——unmount 后守卫必须失格
    let resolveAudit: ((v: { ok: true; data: { rows: AiAuditRow[] } }) => void) | undefined
    auditList.mockImplementation(
      () =>
        new Promise((res) => {
          resolveAudit = res
        })
    )
    mount(<AiSessionPanel scope="global" anchorId={null} />)
    await act(async () => {
      await Promise.resolve()
    })
    // 面板 ready 后开抽屉（首载在途→抽屉 loading 在场）
    await act(async () => {
      useAiTasksStore.getState().openAudit(21)
    })
    expect(useAiTasksStore.getState().activeAudit).toBe(21)
    expect(host?.querySelector('[data-testid="ai-audit-drawer"]')).not.toBeNull()

    // 卸载面板：单抽屉全局语义——cleanup 必关（activeAudit null+条目不残留）
    act(() => {
      root?.unmount()
    })
    expect(useAiTasksStore.getState().activeAudit, 'B1：卸载即关抽屉').toBeNull()
    expect(useAiTasksStore.getState().audits[21], 'B1：条目不残留').toBeUndefined()

    // 晚到审计回包：不复活
    resolveAudit?.({ ok: true, data: { rows: [arow(1)] } })
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(useAiTasksStore.getState().audits[21], 'B1：晚到不复活').toBeUndefined()
    expect(useAiTasksStore.getState().activeAudit).toBeNull()
  })
})
