// @vitest-environment jsdom
/**
 * [F-DBCAMP-01 DB-2 UI U5] 管理面板三 Tab —— 组件渲染面（jsdom 习语=
 * outline-aside.test.tsx：createRoot+act+makeApiStub 工厂，always-active
 * 裸 describe——K3）。
 *
 * 覆盖：①三 Tab 切换与三空态（暂无任务/暂无置顶消息/暂无记忆）+记忆过滤行
 * 在场；②TasksTab 列文本（动作/档/目标/状态/时间）+queued 取消钮+终态无钮；
 * ③PinsTab 三档分组标+行文本+锚标题+取消置顶闭环（行消失）；④MemoryTab
 * manual 行三钮/agent 行「代理生成」标无编辑面/编辑表单展开；⑤非 global 档
 * 新建钮置灰+提示文案（新呈裁-1）。
 * [回炉轮 1] ⑥R7 取消链四轴（成功原位替换/CONFLICT toast/NOT_FOUND 重拉/
 * INVALID_REQUEST toast）；⑦R8 PinsTab 三轴（任一失败 error 聚合/unpin
 * NOT_FOUND 行消失+刷新/INVALID_REQUEST 行内错误）；⑧R9 状态过滤在席×取消
 * 成功→过滤不符新态行本地移除；⑨R2 create 在途提交钮置灰。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, toastStoreSpy } from '../../utils/api-client-mock'

// 管理面板三面桩：ai_tasks/ai_audit 沿缺省桩口径；ai_messages/ai_memory 本文件
// 自持（U5 新消费面——逐用例经持有引用覆盖实现，同键后写者胜）
const tasksList = vi.fn()
const tasksCancel = vi.fn()
const pinsList = vi.fn()
const pinsSet = vi.fn()
const memList = vi.fn()
const memCreate = vi.fn()
makeApiStub({
  ai_tasks: { list: tasksList, cancel: tasksCancel },
  ai_messages: { listPinned: pinsList, setPinned: pinsSet },
  ai_memory: {
    listByScope: memList,
    create: memCreate,
    update: vi.fn(),
    delete: vi.fn(),
    setPinned: vi.fn()
  }
})

import { AiManageSection } from '../../../src/renderer/features/ai/manage/AiManageSection'
import { TasksTab } from '../../../src/renderer/features/ai/manage/TasksTab'
import { useAiMemoryStore } from '../../../src/renderer/features/ai/aiMemoryStore'
import type { AiMemoryListItem, AiTask, PinnedMessageItem } from '../../../src/shared/models/ai-domain'

/** 任务夹具（shared 投影字面——over 覆写制造多态行） */
function mtask(over: Partial<AiTask> = {}): AiTask {
  return {
    id: 21,
    scope: 'paper',
    anchorId: 'p-1',
    action: 'memory.create',
    status: 'queued',
    result: null,
    error: null,
    idempotencyKey: null,
    targetTitle: '管理文献甲',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...over
  }
}

/** 置顶消息夹具 */
function pin(over: Partial<PinnedMessageItem> = {}): PinnedMessageItem {
  return {
    id: 51,
    sessionId: 11,
    role: 'assistant',
    content: '置顶消息正文',
    pinned: true,
    createdAt: '2026-01-01T00:00:00Z',
    anchorTitle: '锚文献标题',
    ...over
  }
}

/** 记忆行夹具 */
function mmem(over: Partial<AiMemoryListItem> = {}): AiMemoryListItem {
  return {
    id: 31,
    scope: 'global',
    anchorId: null,
    category: 'user_preference',
    label: '',
    title: '记忆甲',
    content: '内容甲',
    pinned: false,
    origin: 'manual',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    anchorTitle: null,
    ...over
  }
}

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

async function settle(): Promise<void> {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })
}

/** 点 Tab（role=tab 按钮名定位） */
function clickTab(name: string): void {
  const btn = host?.querySelector(`[role="tab"][aria-label="${name}"]`) as HTMLButtonElement | null
  btn?.click()
}

function text(): string {
  return host?.textContent ?? ''
}

beforeEach(() => {
  vi.clearAllMocks()
  tasksList.mockImplementation(async () => ({ ok: true as const, data: { tasks: [] } }))
  pinsList.mockImplementation(async () => ({ ok: true as const, data: { items: [] } }))
  pinsSet.mockImplementation(async () => ({ ok: true as const, data: { message: {} } }))
  memList.mockImplementation(async () => ({ ok: true as const, data: { items: [] } }))
  tasksCancel.mockImplementation(async () => ({ ok: true as const, data: { task: {} } }))
  toastStoreSpy.mockClear()
  // store 单例逐用例重置（zustand setState 浅合并——全字段显式清）
  useAiMemoryStore.setState({
    panels: {},
    filters: { scope: 'global', category: '', pinnedOnly: false, query: '' },
    draft: { category: 'user_preference', title: '', content: '' },
    editing: null,
    formError: null,
    rowErrors: {},
    creating: false,
    updating: false
  })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
})

describe('F-DBCAMP-01 U5 管理面板三 Tab —— 组件渲染面', () => {
  it('①三 Tab 切换与空态：默认任务→暂无任务；置顶消息→暂无置顶消息；记忆→暂无记忆+过滤行在场', async () => {
    mount(<AiManageSection />)
    await settle()
    expect(text()).toContain('暂无任务')

    clickTab('置顶消息')
    await settle()
    expect(text()).toContain('暂无置顶消息')

    clickTab('记忆')
    await settle()
    expect(text()).toContain('暂无记忆')
    // 过滤行：档位/分类/仅看置顶/搜索框四件在场
    expect(host?.querySelector('[aria-label="记忆档位"]')).not.toBeNull()
    expect(host?.querySelector('[aria-label="记忆分类"]')).not.toBeNull()
    expect(host?.querySelector('[aria-label="仅看置顶"]')).not.toBeNull()
    expect(host?.querySelector('[aria-label="记忆搜索"]')).not.toBeNull()
  })

  it('②TasksTab 列文本：动作/档/目标/状态/时间（形如 MM-DD HH:mm）；queued 取消钮在场+终态无钮', async () => {
    tasksList.mockImplementation(async () => ({
      ok: true as const,
      data: {
        tasks: [
          mtask(),
          mtask({ id: 22, scope: 'lineage', anchorId: 'c-1', action: 'message.pin', status: 'succeeded' })
        ]
      }
    }))
    mount(<AiManageSection />)
    await settle()

    const section = host?.querySelector('[data-testid="ai-manage-tasks"]')
    expect(section).not.toBeNull()
    const row = section?.querySelector('[data-id="21"]')
    expect(row?.textContent).toContain('memory.create')
    expect(row?.textContent).toContain('文献')
    expect(row?.textContent).toContain('管理文献甲')
    expect(row?.textContent).toContain('排队中')
    // 时间列形状断言（TZ 无关——本地格式化不锁具体值）
    expect(row?.querySelector('[data-testid="ai-task-time"]')?.textContent).toMatch(/^\d{2}-\d{2} \d{2}:\d{2}$/)
    expect(row?.querySelector('[aria-label="取消任务"]')).not.toBeNull()
    // 终态行（succeeded）：文案+无取消钮；lineage 档文案
    const row2 = section?.querySelector('[data-id="22"]')
    expect(row2?.textContent).toContain('已完成')
    expect(row2?.textContent).toContain('脉络')
    expect(row2?.querySelector('[aria-label="取消任务"]')).toBeNull()
    // 过滤器在场
    expect(host?.querySelector('[aria-label="任务档位过滤"]')).not.toBeNull()
    expect(host?.querySelector('[aria-label="任务状态过滤"]')).not.toBeNull()
  })

  it('③PinsTab 三档分组+行文本+锚标题；取消置顶→行消失（真实 setPinned false 桩链）', async () => {
    pinsList.mockImplementation(async (req: { scope: string }) => ({
      ok: true as const,
      data: {
        items:
          req.scope === 'paper'
            ? [pin()]
            : req.scope === 'lineage'
              ? [pin({ id: 52, content: '脉络置顶行', anchorTitle: '锚文件夹标题' })]
              : [pin({ id: 53, content: '全局置顶行', anchorTitle: null })]
      }
    }))
    pinsSet.mockImplementation(async () => ({
      ok: true as const,
      data: { message: pin({ pinned: false }) }
    }))
    mount(<AiManageSection />)
    await settle()
    clickTab('置顶消息')
    await settle()

    const section = host?.querySelector('[data-testid="ai-manage-pins"]')
    expect(section).not.toBeNull()
    // 三档组标+行文本+锚标题
    expect(section?.textContent).toContain('文献')
    expect(section?.textContent).toContain('脉络')
    expect(section?.textContent).toContain('全局')
    expect(section?.textContent).toContain('置顶消息正文')
    expect(section?.textContent).toContain('锚文献标题')
    expect(section?.textContent).toContain('锚文件夹标题')
    // 三通道各一次（scope 三值）
    const scopes = pinsList.mock.calls.map((c) => (c[0] as { scope: string }).scope).sort()
    expect(scopes).toEqual(['global', 'lineage', 'paper'])

    // 取消置顶闭环：点行 51 的取消置顶→行消失+空态浮现
    const unpin = section?.querySelector('[data-id="51"] [aria-label="取消置顶"]') as HTMLButtonElement | null
    unpin?.click()
    await settle()
    expect(section?.querySelector('[data-id="51"]')).toBeNull()
    expect(pinsSet).toHaveBeenCalledWith({ messageId: 51, pinned: false })
    expect(section?.textContent).not.toContain('置顶消息正文')
  })

  it('④MemoryTab：manual 行三钮；agent 行「代理生成」标+无编辑面；编辑展开表单', async () => {
    memList.mockImplementation(async () => ({
      ok: true as const,
      data: {
        items: [
          mmem(),
          mmem({ id: 32, category: 'capability_note', title: '代理记忆', origin: 'agent', pinned: true })
        ]
      }
    }))
    mount(<AiManageSection />)
    await settle()
    clickTab('记忆')
    await settle()

    const section = host?.querySelector('[data-testid="ai-manage-memory"]')
    const manualRow = section?.querySelector('[data-id="31"]')
    expect(manualRow?.textContent).toContain('记忆甲')
    expect(manualRow?.querySelector('[aria-label="编辑"]')).not.toBeNull()
    expect(manualRow?.querySelector('[aria-label="置顶"]')).not.toBeNull()
    expect(manualRow?.querySelector('[aria-label="删除"]')).not.toBeNull()

    // agent 行：「代理生成」标+置顶标在场，无编辑/置顶/删除钮（只读）
    const agentRow = section?.querySelector('[data-id="32"]')
    expect(agentRow?.textContent).toContain('代理生成')
    expect(agentRow?.textContent).toContain('已置顶')
    expect(agentRow?.querySelector('[aria-label="编辑"]')).toBeNull()
    expect(agentRow?.querySelector('[aria-label="置顶"]')).toBeNull()
    expect(agentRow?.querySelector('[aria-label="删除"]')).toBeNull()

    // 编辑展开：manual 行点编辑→表单三件（标题/内容/分类）+保存/取消
    ;(manualRow?.querySelector('[aria-label="编辑"]') as HTMLButtonElement | null)?.click()
    await settle()
    expect(manualRow?.querySelector('[aria-label="编辑标题"]')).not.toBeNull()
    expect(manualRow?.querySelector('[aria-label="编辑内容"]')).not.toBeNull()
    expect(manualRow?.querySelector('[aria-label="编辑分类"]')).not.toBeNull()
    expect(manualRow?.querySelector('[aria-label="保存"]')).not.toBeNull()
    expect(manualRow?.querySelector('[aria-label="取消编辑"]')).not.toBeNull()
  })

  it('⑤MemoryTab 非 global 档：新建钮置灰+提示「暂不支持在本面板为该档新建」；global 档可用', async () => {
    memList.mockImplementation(async () => ({ ok: true as const, data: { items: [mmem()] } }))
    mount(<AiManageSection />)
    await settle()
    clickTab('记忆')
    await settle()

    // global 档（缺省）：新建钮可用+表单三件在场
    const createBtn = () => host?.querySelector('[aria-label="新建记忆"]') as HTMLButtonElement | null
    expect(createBtn()?.disabled).toBe(false)
    expect(host?.querySelector('[aria-label="新建标题"]')).not.toBeNull()
    expect(host?.querySelector('[aria-label="新建内容"]')).not.toBeNull()
    expect(host?.querySelector('[aria-label="新建分类"]')).not.toBeNull()

    // 切 paper 档：新建钮置灰+提示浮现（jsdom 受控 select=原型 setter 置值
    // +冒泡 change——React 合成事件沿根容器收口）
    const scopeSelect = host?.querySelector('[aria-label="记忆档位"]') as HTMLSelectElement | null
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set
    act(() => {
      setter?.call(scopeSelect, 'paper')
      scopeSelect?.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await settle()
    expect(useAiMemoryStore.getState().filters.scope).toBe('paper')
    expect(createBtn()?.disabled).toBe(true)
    expect(host?.textContent).toContain('暂不支持在本面板为该档新建')
  })

  it('⑥[R7] TasksTab 取消链四轴：成功原位替换/CONFLICT toast/NOT_FOUND 重拉/INVALID_REQUEST toast', async () => {
    // 成功轴：cancelled 行原位替换（无过滤在席）
    tasksList.mockImplementation(async () => ({ ok: true as const, data: { tasks: [mtask()] } }))
    tasksCancel.mockImplementation(async () => ({
      ok: true as const,
      data: { task: mtask({ status: 'cancelled' }) }
    }))
    mount(<TasksTab />)
    await settle()
    const row = () => host?.querySelector('[data-testid="ai-manage-tasks"] [data-id="21"]')
    ;(row()?.querySelector('[aria-label="取消任务"]') as HTMLButtonElement | null)?.click()
    await settle()
    expect(row()?.querySelector('[data-testid="ai-task-status"]')?.textContent, '原位替换→已取消').toBe('已取消')
    expect(toastStoreSpy).not.toHaveBeenCalled()
    act(() => {
      root?.unmount()
    })

    // CONFLICT 轴：toast 专文案+行不动（计数逐轴清——同 it 内多段挂卸累积）
    tasksList.mockClear()
    tasksCancel.mockClear()
    toastStoreSpy.mockClear()
    tasksCancel.mockImplementation(async () => ({
      ok: false as const,
      error: { code: 'CONFLICT', message: '任务不在可取消状态' }
    }))
    mount(<TasksTab />)
    await settle()
    ;(host?.querySelector('[data-id="21"] [aria-label="取消任务"]') as HTMLButtonElement | null)?.click()
    await settle()
    expect(toastStoreSpy).toHaveBeenCalledWith('仅排队中的任务可取消', 'error')
    expect(host?.querySelector('[data-id="21"] [data-testid="ai-task-status"]')?.textContent).toBe('排队中')
    act(() => {
      root?.unmount()
    })

    // NOT_FOUND 轴：重拉刷新（次回包空→行消失+空态）
    tasksList.mockClear()
    tasksCancel.mockClear()
    toastStoreSpy.mockClear()
    let listCall = 0
    tasksList.mockImplementation(async () => {
      listCall += 1
      return listCall === 1 ? { ok: true as const, data: { tasks: [mtask()] } } : { ok: true as const, data: { tasks: [] } }
    })
    tasksCancel.mockImplementation(async () => ({
      ok: false as const,
      error: { code: 'NOT_FOUND', message: '任务不存在' }
    }))
    mount(<TasksTab />)
    await settle()
    ;(host?.querySelector('[data-id="21"] [aria-label="取消任务"]') as HTMLButtonElement | null)?.click()
    await settle()
    expect(tasksList, 'NOT_FOUND 触发重拉').toHaveBeenCalledTimes(2)
    expect(host?.querySelector('[data-id="21"]')).toBeNull()
    expect(host?.textContent).toContain('暂无任务')
    expect(toastStoreSpy).not.toHaveBeenCalled()
    act(() => {
      root?.unmount()
    })

    // INVALID_REQUEST 轴：toast 通用错误
    tasksList.mockClear()
    tasksCancel.mockClear()
    toastStoreSpy.mockClear()
    tasksList.mockImplementation(async () => ({ ok: true as const, data: { tasks: [mtask()] } }))
    tasksCancel.mockImplementation(async () => ({
      ok: false as const,
      error: { code: 'INVALID_REQUEST', message: '矩阵拒' }
    }))
    mount(<TasksTab />)
    await settle()
    ;(host?.querySelector('[data-id="21"] [aria-label="取消任务"]') as HTMLButtonElement | null)?.click()
    await settle()
    expect(toastStoreSpy).toHaveBeenCalledWith('请求无效，请重试', 'error')
    expect(host?.querySelector('[data-id="21"] [data-testid="ai-task-status"]')?.textContent, '行不动').toBe('排队中')
  })

  it('⑦[R8] PinsTab 三轴：任一失败 error 聚合/unpin NOT_FOUND 行消失+刷新/INVALID_REQUEST 行内错误', async () => {
    // 轴一：lineage 通道失败→error 聚合（三达全才 ready）
    pinsList.mockImplementation(async (req: { scope: string }) => ({
      ok: true as const,
      data: { items: req.scope === 'paper' ? [pin()] : [] }
    }))
    mount(<AiManageSection />)
    await settle()
    clickTab('置顶消息')
    await settle()
    expect(host?.querySelector('[data-testid="ai-manage-pins"]')?.textContent).toContain('置顶消息正文')
    act(() => {
      root?.unmount()
    })

    pinsList.mockImplementation(async (req: { scope: string }) => {
      if (req.scope === 'lineage') {
        return { ok: false as const, error: { code: 'INVALID_REQUEST', message: 'x' } }
      }
      return { ok: true as const, data: { items: req.scope === 'paper' ? [pin()] : [] } }
    })
    mount(<AiManageSection />)
    await settle()
    clickTab('置顶消息')
    await settle()
    const pinsErr = host?.querySelector('[data-testid="ai-manage-pins"]')
    expect(pinsErr?.querySelector('[role="alert"]')?.textContent, '任一失败→error 聚合').toBe('请求无效，请重试')
    act(() => {
      root?.unmount()
    })

    // 轴二：unpin NOT_FOUND→行消失+刷新（三通道重拉——有状态桩模拟服务端真值）
    pinsList.mockClear()
    pinsSet.mockClear()
    let gone = false
    pinsList.mockImplementation(async (req: { scope: string }) => ({
      ok: true as const,
      data: { items: !gone && req.scope === 'paper' ? [pin()] : [] }
    }))
    pinsSet.mockImplementation(async () => ({
      ok: false as const,
      error: { code: 'NOT_FOUND', message: '消息不存在' }
    }))
    mount(<AiManageSection />)
    await settle()
    clickTab('置顶消息')
    await settle()
    expect(pinsList).toHaveBeenCalledTimes(3)
    ;(host?.querySelector('[data-id="51"] [aria-label="取消置顶"]') as HTMLButtonElement | null)?.click()
    gone = true
    await settle()
    expect(host?.querySelector('[data-id="51"]'), 'NOT_FOUND→行消失').toBeNull()
    expect(pinsList, 'NOT_FOUND 触发三通道刷新').toHaveBeenCalledTimes(6)
    act(() => {
      root?.unmount()
    })

    // 轴三：unpin INVALID_REQUEST→行内通用错误（行保留）
    pinsList.mockClear()
    pinsSet.mockClear()
    pinsList.mockImplementation(async (req: { scope: string }) => ({
      ok: true as const,
      data: { items: req.scope === 'paper' ? [pin()] : [] }
    }))
    pinsSet.mockImplementation(async () => ({
      ok: false as const,
      error: { code: 'INVALID_REQUEST', message: 'x' }
    }))
    mount(<AiManageSection />)
    await settle()
    clickTab('置顶消息')
    await settle()
    ;(host?.querySelector('[data-id="51"] [aria-label="取消置顶"]') as HTMLButtonElement | null)?.click()
    await settle()
    const rowPin = host?.querySelector('[data-id="51"]')
    expect(rowPin, '行保留').not.toBeNull()
    expect(rowPin?.querySelector('[role="alert"]')?.textContent, '行内通用错误').toBe('请求无效，请重试')
  })

  it('⑧[R9] 状态过滤在席×取消成功：cancelled 不符 queued 过滤→行本地移除（瞬态矛盾消除）', async () => {
    tasksList.mockImplementation(async () => ({ ok: true as const, data: { tasks: [mtask()] } }))
    tasksCancel.mockImplementation(async () => ({
      ok: true as const,
      data: { task: mtask({ status: 'cancelled' }) }
    }))
    mount(<TasksTab />)
    await settle()
    // 状态过滤=排队中（受控 select=原型 setter 置值+冒泡 change）
    const statusSelect = host?.querySelector('[aria-label="任务状态过滤"]') as HTMLSelectElement | null
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set
    act(() => {
      setter?.call(statusSelect, 'queued')
      statusSelect?.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await settle()
    expect(host?.querySelector('[data-id="21"]')).not.toBeNull()
    ;(host?.querySelector('[data-id="21"] [aria-label="取消任务"]') as HTMLButtonElement | null)?.click()
    await settle()
    expect(host?.querySelector('[data-id="21"]'), '过滤不符新态→行本地移除').toBeNull()
    expect(host?.textContent).toContain('暂无任务')
  })

  it('⑨[R2] create 在途：新建钮置灰（双击双发防重复行——store 防重联动画）', async () => {
    memList.mockImplementation(async () => ({ ok: true as const, data: { items: [] } }))
    type CreateResult = { ok: true; data: { item: AiMemoryListItem } }
    let resolveCreate!: (v: CreateResult) => void
    memCreate.mockImplementation(
      () =>
        new Promise<CreateResult>((res) => {
          resolveCreate = res
        })
    )
    mount(<AiManageSection />)
    await settle()
    clickTab('记忆')
    await settle()
    const createBtn = () => host?.querySelector('[aria-label="新建记忆"]') as HTMLButtonElement | null
    createBtn()?.click()
    await settle()
    expect(createBtn()?.disabled, '在途置灰').toBe(true)
    expect(useAiMemoryStore.getState().creating).toBe(true)

    resolveCreate({ ok: true, data: { item: mmem() } })
    await settle()
    expect(createBtn()?.disabled, '回包复位').toBe(false)
    expect(useAiMemoryStore.getState().creating).toBe(false)
  })
})
