// @vitest-environment jsdom
/**
 * [SR2-AI-08] AiNotesSection —— 笔记面板 AI 面组件测试（锁定合约）。
 *
 * 覆盖：六态渲染（mock observe 四事实驱动）/跨格序列①③⑤/轮询失败 error 态
 * （连续 3 次离线提示行——含 status.json 损坏=上抛计入计数的 mock 驱动路径）/
 * 导入按钮三桶 toast/卸载清 interval/分节分组与七问分色/只读断言（无写交互
 * 元素）/条目单击 locateAnchor（INV-20 消费方级）。
 * always-active（ADR-0017 裁决 3）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { AiNote } from '../../../src/shared/models/ai-note'
import { AI_NOTE_QUESTIONS } from '../../../src/shared/models/ai-note'
import type * as clientModule from '../../../src/renderer/api/client'
import type * as toastModule from '../../../src/renderer/shared/ui/Toast'
import type * as anchorLocateModule from '../../../src/renderer/features/reader/anchor-locate'

const observe = vi.fn()
const listByPaper = vi.fn()
const requestAiRead = vi.fn()
const importAll = vi.fn()

const { stubApi, locateAnchor } = vi.hoisted(() => ({
  stubApi: {
    ai_sensor: {
      observe: vi.fn(),
      listByPaper: vi.fn(),
      requestAiRead: vi.fn(),
      importAll: vi.fn()
    }
  },
  locateAnchor: vi.fn()
}))
stubApi.ai_sensor.observe = observe
stubApi.ai_sensor.listByPaper = listByPaper
stubApi.ai_sensor.requestAiRead = requestAiRead
stubApi.ai_sensor.importAll = importAll

vi.mock('../../../src/renderer/api/client', async (importOriginal) => {
  const real = await importOriginal<typeof clientModule>()
  return { ...real, api: stubApi as unknown as typeof clientModule.api }
})
vi.mock('../../../src/renderer/shared/ui/Toast', async (importOriginal) => {
  const real = await importOriginal<typeof toastModule>()
  return { ...real, showToast: vi.fn() }
})
vi.mock('../../../src/renderer/features/reader/anchor-locate', async (importOriginal) => {
  const real = await importOriginal<typeof anchorLocateModule>()
  return { ...real, locateAnchor }
})

import { showToast } from '../../../src/renderer/shared/ui/Toast'
import { AiNotesSection } from '../../../src/renderer/features/reader/AiNotesSection'
import { useReaderStore, type TabState } from '../../../src/renderer/features/reader/reader.store'
import { useAiNotesStore } from '../../../src/renderer/features/reader/ai-notes.store'
import { QUESTION_COLOR } from '../../../src/renderer/features/reader/ai-note-style'

/** observe 四事实（六态判定输入——ai-sensor/observe Res 形状） */
function facts(patch: {
  status?: { state: string; currentPaper: string | null; running: boolean } | null
  hasPendingJob?: boolean
  productExists?: boolean
  archivedExists?: boolean
}) {
  return {
    status:
      patch.status === null || patch.status === undefined
        ? null
        : {
            state: patch.status.state,
            currentPaper: patch.status.currentPaper,
            role: null,
            updatedAt: '2026-08-27T00:00:00Z',
            heartbeatAt: '2026-08-27T00:00:00Z',
            running: patch.status.running
          },
    hasPendingJob: patch.hasPendingJob ?? false,
    productExists: patch.productExists ?? false,
    archivedExists: patch.archivedExists ?? false
  }
}

function note(id: string, role: AiNote['role'], question: AiNote['question']): AiNote {
  return {
    id,
    paperId: 'p-1',
    annotationId: null,
    role,
    question,
    model: 'test-model',
    quoteText: `quote-${id}`,
    prefixText: '',
    suffixText: '',
    anchorPage: 3,
    contentMd: `内容-${id}`,
    createdAt: 't',
    updatedAt: 't'
  }
}

function makeTab(id: string): TabState {
  return {
    paperId: id,
    fileUrl: `app-file://${id}`,
    fileName: `${id}.pdf`,
    title: '',
    page: 0,
    totalPages: 10,
    zoom: 1,
    color: 'yellow',
    annotations: [],
    status: 'ready',
    dirty: false
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

const flush = async (ms = 0): Promise<void> => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

const text = (): string => host?.querySelector('[data-testid="ai-status-line"]')?.textContent ?? ''
const hasStatus = (): boolean => host?.querySelector('[data-testid="ai-status-line"]') != null
const readBtn = (): HTMLButtonElement => host?.querySelector('button') as HTMLButtonElement

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  observe.mockResolvedValue({ ok: true, data: facts({}) })
  listByPaper.mockResolvedValue({ ok: true, data: [] })
  requestAiRead.mockResolvedValue({ ok: true, data: { jobId: 'j-1' } })
  importAll.mockResolvedValue({ ok: true, data: { imported: [], skipped: [], errors: [] } })
  locateAnchor.mockResolvedValue('paper')
  useReaderStore.setState({ tabs: { 'p-1': makeTab('p-1'), 'p-2': makeTab('p-2') }, order: ['p-1', 'p-2'], activeId: 'p-1' })
  useAiNotesStore.setState({ notesByPaper: {}, observeByPaper: {} })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  vi.useRealTimers()
})

it('hidden：无 job 无产物无 DB 数据——仅按钮行（无状态行无分节）', async () => {
  mount(<AiNotesSection />)
  await flush()
  expect(observe).toHaveBeenCalledWith({ paperId: 'p-1' })
  expect(hasStatus()).toBe(false)
  expect(host?.querySelector('[data-testid="ai-note-groups"]')).toBeNull()
  expect(readBtn().textContent).toBe('AI 读文献')
  expect(readBtn().disabled).toBe(false)
})

it('idle：无 job 无未导入产物但有 DB 数据——按钮行+分节，无状态行', async () => {
  listByPaper.mockResolvedValue({ ok: true, data: [note('a1', 'first-read', 'Q1')] })
  mount(<AiNotesSection />)
  await flush()
  expect(hasStatus()).toBe(false)
  expect(host?.querySelector('[data-testid="ai-note-groups"]')).not.toBeNull()
})

it('pending：job 在且心跳不新鲜——等待拾取文案（含 state 自述）+按钮禁用', async () => {
  observe.mockResolvedValue({
    ok: true,
    data: facts({ hasPendingJob: true, status: { state: '排队空闲', currentPaper: null, running: false } })
  })
  mount(<AiNotesSection />)
  await flush()
  expect(text()).toBe('已请求 AI 阅读，等待 zcode 拾取…（上次状态：排队空闲）')
  expect(readBtn().disabled).toBe(true)
})

it('pending：status.json 不存在（工具从未运行）——文案无自述括号', async () => {
  observe.mockResolvedValue({ ok: true, data: facts({ hasPendingJob: true }) })
  mount(<AiNotesSection />)
  await flush()
  expect(text()).toBe('已请求 AI 阅读，等待 zcode 拾取…')
})

it('queued：job 在+心跳新鲜+currentPaper=他篇——「当前：他篇」', async () => {
  observe.mockResolvedValue({
    ok: true,
    data: facts({ hasPendingJob: true, status: { state: '一读中', currentPaper: 'p-2', running: true } })
  })
  mount(<AiNotesSection />)
  await flush()
  expect(text()).toBe('AI 正在处理队列（当前：他篇）…')
})

it('queued：currentPaper=null——无他篇名', async () => {
  observe.mockResolvedValue({
    ok: true,
    data: facts({ hasPendingJob: true, status: { state: '启动中', currentPaper: null, running: true } })
  })
  mount(<AiNotesSection />)
  await flush()
  expect(text()).toBe('AI 正在处理队列…')
})

it('reading：心跳新鲜+currentPaper=P——「AI 正在读本文（state）」', async () => {
  observe.mockResolvedValue({
    ok: true,
    data: facts({ hasPendingJob: true, status: { state: '一读中', currentPaper: 'p-1', running: true } })
  })
  mount(<AiNotesSection />)
  await flush()
  expect(text()).toBe('AI 正在读本文（一读中）')
})

it('done-unimported：产物在+未归档+job 无——待导入+导入按钮', async () => {
  observe.mockResolvedValue({ ok: true, data: facts({ productExists: true }) })
  mount(<AiNotesSection />)
  await flush()
  expect(text()).toBe('AI 已读完，待导入')
  const importBtn = host?.querySelector('button[data-action="import"]') as HTMLButtonElement
  expect(importBtn).not.toBeNull()
  expect(importBtn.textContent).toBe('导入 AI 笔记')
  expect(readBtn().disabled).toBe(false)
})

it('跨格序列①：hidden→pending→queued（他篇）→reading→done-unimported→idle（导入完成回稳态）', async () => {
  observe
    .mockResolvedValueOnce({ ok: true, data: facts({}) }) // hidden（首拉）
    .mockResolvedValueOnce({ ok: true, data: facts({ hasPendingJob: true }) }) // 按钮后刷新→pending
    .mockResolvedValueOnce({
      ok: true,
      data: facts({ hasPendingJob: true, status: { state: '一读中', currentPaper: 'p-2', running: true } }) // 轮询→queued
    })
    .mockResolvedValueOnce({
      ok: true,
      data: facts({ hasPendingJob: true, status: { state: '二读中', currentPaper: 'p-1', running: true } }) // 轮询→reading
    })
    .mockResolvedValueOnce({ ok: true, data: facts({ productExists: true }) }) // 轮询→done-unimported
    .mockResolvedValueOnce({ ok: true, data: facts({ archivedExists: true }) }) // 导入后刷新→idle 稳态
  listByPaper
    .mockResolvedValueOnce({ ok: true, data: [] }) // 首拉空（hidden）
    .mockResolvedValueOnce({ ok: true, data: [note('a1', 'adjudicate', 'divergence')] }) // 导入后刷新

  mount(<AiNotesSection />)
  await flush()
  expect(hasStatus()).toBe(false) // hidden

  act(() => {
    readBtn().click()
  })
  await flush()
  expect(requestAiRead).toHaveBeenCalledWith({ paperId: 'p-1' })
  expect(text()).toBe('已请求 AI 阅读，等待 zcode 拾取…') // pending

  await flush(5000)
  expect(text()).toBe('AI 正在处理队列（当前：他篇）…') // queued

  await flush(5000)
  expect(text()).toBe('AI 正在读本文（二读中）') // reading

  await flush(5000)
  expect(text()).toBe('AI 已读完，待导入') // done-unimported
  const importBtn = host?.querySelector('button[data-action="import"]') as HTMLButtonElement
  importAll.mockResolvedValue({
    ok: true,
    data: { imported: ['p-1'], skipped: [], errors: [] }
  })
  act(() => {
    importBtn.click()
  })
  await flush()
  expect(importAll).toHaveBeenCalledTimes(1)
  expect(showToast).toHaveBeenCalledWith('AI 笔记导入完成：导入 1 篇，跳过 0 篇', 'success')
  expect(hasStatus()).toBe(false) // idle：稳态回 idle——无状态行
  expect(host?.querySelector('[data-testid="ai-note-groups"]')).not.toBeNull() // 分节数据就绪
})

it('跨格序列③：reading→（心跳过期+job 在）→pending（工具中断统一「等待 zcode」呈现）', async () => {
  observe
    .mockResolvedValueOnce({
      ok: true,
      data: facts({ hasPendingJob: true, status: { state: '一读中', currentPaper: 'p-1', running: true } })
    })
    .mockResolvedValueOnce({
      ok: true,
      data: facts({ hasPendingJob: true, status: { state: '一读中', currentPaper: 'p-1', running: false } })
    })
  mount(<AiNotesSection />)
  await flush()
  expect(text()).toBe('AI 正在读本文（一读中）')
  await flush(5000)
  expect(text()).toBe('已请求 AI 阅读，等待 zcode 拾取…（上次状态：一读中）')
})

it('跨格序列⑤：换 tab（paperId 变）→全态重评估（per-tab 语义）', async () => {
  observe
    .mockResolvedValueOnce({ ok: true, data: facts({ hasPendingJob: true }) }) // p-1 pending
    .mockResolvedValueOnce({
      ok: true,
      data: facts({ hasPendingJob: true, status: { state: '一读中', currentPaper: 'p-2', running: true } }) // p-2 reading
    })
  mount(<AiNotesSection />)
  await flush()
  expect(text()).toBe('已请求 AI 阅读，等待 zcode 拾取…')
  act(() => {
    useReaderStore.setState({ activeId: 'p-2' })
  })
  await flush()
  expect(observe).toHaveBeenLastCalledWith({ paperId: 'p-2' })
  expect(text()).toBe('AI 正在读本文（一读中）')
})

it('轮询失败 error 态：连续失败 3 次显示离线提示行（静默不 toast），成功即复位', async () => {
  observe
    .mockRejectedValueOnce(new Error('x'))
    .mockRejectedValueOnce(new Error('x'))
    .mockRejectedValueOnce(new Error('x'))
  mount(<AiNotesSection />)
  await flush()
  expect(host?.textContent).not.toContain('AI 状态暂不可用')
  await flush(5000)
  expect(host?.textContent).not.toContain('AI 状态暂不可用') // 连续 2 次仍不显示
  await flush(5000)
  expect(host?.textContent).toContain('AI 状态暂不可用') // 第 3 次
  expect(showToast).not.toHaveBeenCalled() // 列表型瞬态：不 toast 轰炸
  observe.mockResolvedValue({ ok: true, data: facts({}) })
  await flush(5000)
  expect(host?.textContent).not.toContain('AI 状态暂不可用') // 成功复位
})

it('status.json 损坏（readStatus 上抛→observe 拒绝）计入连续失败计数（损坏≠missing 三态分离）', async () => {
  const corrupted = new Error('status.json 读取/解析失败：…（Unexpected token）——文件损坏？')
  observe.mockRejectedValue(corrupted).mockRejectedValueOnce(corrupted).mockRejectedValueOnce(corrupted)
  mount(<AiNotesSection />)
  await flush()
  await flush(5000)
  await flush(5000)
  expect(host?.textContent).toContain('AI 状态暂不可用')
})

it('导入按钮三桶 toast：imported/skipped 计数+errors 篇名（error 级）', async () => {
  observe.mockResolvedValue({ ok: true, data: facts({ productExists: true }) })
  importAll.mockResolvedValue({
    ok: true,
    data: {
      imported: ['p-1', 'p-3'],
      skipped: ['p-2'],
      errors: [{ paperId: 'p-9', reason: '行校验失败' }]
    }
  })
  mount(<AiNotesSection />)
  await flush()
  act(() => {
    ;(host?.querySelector('button[data-action="import"]') as HTMLButtonElement).click()
  })
  await flush()
  expect(showToast).toHaveBeenCalledWith('AI 笔记导入完成：导入 2 篇，跳过 1 篇，失败 1 篇（p-9）', 'error')
})

it('导入失败（动作型）toast error', async () => {
  observe.mockResolvedValue({ ok: true, data: facts({ productExists: true }) })
  importAll.mockRejectedValue(new Error('IO 失败'))
  mount(<AiNotesSection />)
  await flush()
  act(() => {
    ;(host?.querySelector('button[data-action="import"]') as HTMLButtonElement).click()
  })
  await flush()
  expect(showToast).toHaveBeenCalledWith('操作失败', 'error')
})

it('「AI 读文献」失败（动作型）toast error；无本地残留态（writeStatusProtocol 幂等自愈——重试可再点）', async () => {
  requestAiRead.mockRejectedValueOnce(new Error('写 job 失败'))
  observe.mockResolvedValue({ ok: true, data: facts({}) })
  mount(<AiNotesSection />)
  await flush()
  act(() => {
    readBtn().click()
  })
  await flush()
  expect(showToast).toHaveBeenCalledWith('操作失败', 'error')
  expect(readBtn().disabled).toBe(false) // 无自建 in-flight 锁：失败后可重试
})

it('分节分组：question 组按 AI_NOTE_QUESTIONS 序呈现（组头中文标签+分色条），组内条目按 role 分段标注', async () => {
  listByPaper.mockResolvedValue({
    ok: true,
    data: [
      note('a2', 'first-read', 'Q2'),
      note('a1', 'first-read', 'Q1'),
      note('b1', 'second-read', 'Q1'),
      note('c1', 'adjudicate', 'divergence')
    ]
  })
  mount(<AiNotesSection />)
  await flush()
  const groups = Array.from(host?.querySelectorAll('[data-testid="ai-note-groups"] > div') ?? [])
  expect(groups.map((g) => g.getAttribute('data-question'))).toEqual(['Q1', 'Q2', 'divergence'])
  expect(groups.map((g) => g.querySelector('h4')?.textContent)).toEqual([
    '第一问：核心 idea 是什么',
    '第二问：对同行的价值（改变了认知方式？开创范式大幅加快计算？解决工程问题？）',
    '分歧报告'
  ])
  // 组头分色条（QUESTION_COLOR 单源——左缘竖条形态）
  const q1Head = groups[0]?.querySelector('h4') as HTMLElement
  expect(q1Head.style.borderLeft).toContain(QUESTION_COLOR.Q1)
  // 组内条目按 ROLE_ORDER 排序（一审在前二审在后）+条目头 role 标签可辨
  const q1Items = Array.from(groups[0]?.querySelectorAll('[data-ai-note-id]') ?? [])
  expect(q1Items.map((el) => el.getAttribute('data-ai-note-id'))).toEqual(['a1', 'b1'])
  expect(q1Items[0]?.textContent).toContain('一审')
  expect(q1Items[1]?.textContent).toContain('二审')
  const dot = groups[0]?.querySelector('[data-ai-note-id="a1"] span[aria-hidden]') as HTMLElement
  expect(dot.style.background).toBe(QUESTION_COLOR.Q1)
  const divItem = groups[2]?.querySelector('[data-ai-note-id="c1"]') as HTMLElement | null
  expect(divItem).not.toBeNull() // divergence 独立成组（question 轴）
  const divDot = divItem?.querySelector('span[aria-hidden]') as HTMLElement
  expect(divDot.style.background).toBe(QUESTION_COLOR.divergence)
})

it('分组序单源：乱序输入仍按 AI_NOTE_QUESTIONS 序（非输入序——呈现轴=shared 单源）', async () => {
  listByPaper.mockResolvedValue({
    ok: true,
    data: [
      note('d1', 'adjudicate', 'divergence'),
      note('e1', 'second-read', 'Q5'),
      note('a1', 'first-read', 'Q1'),
      note('b1', 'first-read', 'Q2')
    ]
  })
  mount(<AiNotesSection />)
  await flush()
  const groups = Array.from(host?.querySelectorAll('[data-testid="ai-note-groups"] > div') ?? [])
  expect(groups.map((g) => g.getAttribute('data-question'))).toEqual(
    AI_NOTE_QUESTIONS.filter((q) => ['Q1', 'Q2', 'Q5', 'divergence'].includes(q))
  )
})

it('空组剔除：无条目的 question 不渲染组（无 Q2 条目则无「第二问」组头）', async () => {
  listByPaper.mockResolvedValue({
    ok: true,
    data: [note('a1', 'first-read', 'Q1'), note('c1', 'adjudicate', 'Q3')]
  })
  mount(<AiNotesSection />)
  await flush()
  const groups = Array.from(host?.querySelectorAll('[data-testid="ai-note-groups"] > div') ?? [])
  expect(groups.map((g) => g.getAttribute('data-question'))).toEqual(['Q1', 'Q3'])
  expect(groups.map((g) => g.querySelector('h4')?.textContent)).toEqual([
    '第一问：核心 idea 是什么',
    '第三问：工程债务：失败数据未记录处、潜在试错点（ARA 叙事税的逆向重建）'
  ])
})

it('组内 role 标签：同 question 组内三 role 条目头呈现一审/二审/裁决（role 可辨+role 序）', async () => {
  listByPaper.mockResolvedValue({
    ok: true,
    data: [
      note('c1', 'adjudicate', 'Q4'),
      note('b1', 'second-read', 'Q4'),
      note('a1', 'first-read', 'Q4')
    ]
  })
  mount(<AiNotesSection />)
  await flush()
  const groups = Array.from(host?.querySelectorAll('[data-testid="ai-note-groups"] > div') ?? [])
  expect(groups).toHaveLength(1) // 同 question 单组
  const items = Array.from(groups[0]?.querySelectorAll('[data-ai-note-id]') ?? [])
  expect(items.map((el) => el.getAttribute('data-ai-note-id'))).toEqual(['a1', 'b1', 'c1'])
  expect(items[0]?.textContent).toContain('一审')
  expect(items[1]?.textContent).toContain('二审')
  expect(items[2]?.textContent).toContain('裁决')
})

it('divergence 组转置：独立「分歧报告」组头（非七问特殊组，不随裁决 role 组）', async () => {
  listByPaper.mockResolvedValue({
    ok: true,
    data: [note('a1', 'first-read', 'Q1'), note('c1', 'adjudicate', 'divergence')]
  })
  mount(<AiNotesSection />)
  await flush()
  const groups = Array.from(host?.querySelectorAll('[data-testid="ai-note-groups"] > div') ?? [])
  expect(groups.map((g) => g.getAttribute('data-question'))).toEqual(['Q1', 'divergence'])
  // 七问组头带原始命题（SR2-AI-12）；divergence 无蓝图原文——短标签不加命题
  expect(groups[0]?.querySelector('h4')?.textContent).toBe('第一问：核心 idea 是什么')
  expect(groups[1]?.querySelector('h4')?.textContent).toBe('分歧报告')
  const divItem = groups[1]?.querySelector('[data-ai-note-id="c1"]') as HTMLElement | null
  expect(divItem?.textContent).toContain('裁决') // 组内条目头 role 标签仍在
})

it('只读断言：分节内无任何写交互元素（无 input/textarea/select——INV-19）', async () => {
  listByPaper.mockResolvedValue({ ok: true, data: [note('a1', 'first-read', 'Q1')] })
  mount(<AiNotesSection />)
  await flush()
  expect(host?.querySelectorAll('input, textarea, select').length).toBe(0)
})

it('条目单击→locateAnchor（INV-20 单入口消费方；anchorPage 1 基→0 基页）', async () => {
  listByPaper.mockResolvedValue({ ok: true, data: [note('a1', 'first-read', 'Q1')] })
  mount(<AiNotesSection />)
  await flush()
  act(() => {
    ;(host?.querySelector('[data-ai-note-id="a1"]') as HTMLElement).click()
  })
  expect(locateAnchor).toHaveBeenCalledWith({
    paperId: 'p-1',
    anchor: { quoteText: 'quote-a1', prefixText: '', suffixText: '', anchorPage: 2 },
    // AI-09 延展：exact 层滚动锚（data-ai-note-id 目标）
    aiNoteId: 'a1'
  })
})

it('卸载清 interval（INV-14 成对同族）：unmount 后不再轮询', async () => {
  mount(<AiNotesSection />)
  await flush()
  const calls = observe.mock.calls.length
  act(() => {
    root?.unmount()
  })
  root = null
  await flush(15000)
  expect(observe.mock.calls.length).toBe(calls)
})
