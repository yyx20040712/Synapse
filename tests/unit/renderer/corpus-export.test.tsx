// @vitest-environment jsdom
/**
 * [SR2-AI-04] AI 语料导出 renderer 面合约（锁定）——三面一文件：
 * ①corpus-export.store（进度态+start 终局重置+迟到守卫）
 * ②useExportCorpusEvents（App 层事件桥：订阅成对清理 INV-14/事件双型分发/
 *   生产组装/终局 toast INV-02）
 * ③CorpusExportSection（节渲染/按钮 disabled/进度行）+SettingsPage 挂载（R14）
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { ExtractRequestEvent } from '../../../src/shared/ipc/schemas'
import type * as clientModule from '../../../src/renderer/api/client'
import type * as toastModule from '../../../src/renderer/shared/ui/Toast'

/** 桩装配共享位（hoisted——vi.mock 工厂与用例两侧同引用） */
const { stubApi, onExportCorpusSpy, offSpy, extractorHandle, loadDocSentinel, toastSpy, holder } =
  vi.hoisted(() => ({
    stubApi: {
      settings: { get: vi.fn() },
      export_: { corpusSession: vi.fn(), corpusItem: vi.fn() }
    },
    onExportCorpusSpy: vi.fn(),
    offSpy: vi.fn(),
    extractorHandle: vi.fn(),
    loadDocSentinel: ((): Promise<never> => Promise.reject(new Error('sentinel'))),
    toastSpy: vi.fn(),
    holder: { cb: null as ((e: unknown) => void) | null, deps: null as unknown }
  }))

vi.mock('../../../src/renderer/api/client', async (importOriginal) => {
  const real = await importOriginal<typeof clientModule>()
  return {
    ...real,
    api: stubApi,
    apiEvents: {
      onExportCorpus: onExportCorpusSpy
    }
  }
})
// CorpusExtractor 模块桩：捕获生产组装 deps；handleEvent 转 Spy（提取器本体行为
// 已由 corpus-extractor.test 锁定——本文件只锁「桥把它接进来」的接线面）
vi.mock('../../../src/renderer/features/reader/CorpusExtractor', () => ({
  loadPdfDocument: loadDocSentinel,
  createCorpusExtractor: (deps: unknown) => {
    holder.deps = deps
    return { handleEvent: extractorHandle }
  }
}))
vi.mock('../../../src/renderer/shared/ui/Toast', async (importOriginal) => {
  const real = await importOriginal<typeof toastModule>()
  return { ...real, showToast: toastSpy }
})

import { CorpusExportSection } from '../../../src/renderer/features/settings/CorpusExportSection'
import { SettingsPage } from '../../../src/renderer/features/settings/SettingsPage'
import { useCorpusExportStore } from '../../../src/renderer/features/settings/corpus-export.store'
import { useExportCorpusEvents } from '../../../src/renderer/features/settings/useExportCorpusEvents'
import { guardedDescribe } from '../../utils/guard'

/** 会话终局成功形状（stub 用） */
type SessionOk = { ok: true; data: { dir: string; fileCount: number; errorCount: number } }

function okSession(fileCount: number, errorCount: number): SessionOk {
  return { ok: true, data: { dir: 'C:\\out', fileCount, errorCount } }
}

function extractRequest(): ExtractRequestEvent {
  return {
    type: 'extract-request',
    sessionId: 'cs-1',
    paperId: 'paper-1',
    url: 'app-file://paper-1',
    annotations: []
  }
}

let root: Root | null = null
let host: HTMLDivElement | null = null

async function render(node: JSX.Element): Promise<void> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(node)
  })
}

function findButton(label: string): HTMLButtonElement | undefined {
  // loading 态按钮带 spinner 前缀（⟳ aria-hidden）——剥除后按文案匹配
  return [...(host?.querySelectorAll('button') ?? [])].find(
    (b) => (b.textContent ?? '').replace('⟳', '') === label
  )
}

async function click(label: string): Promise<void> {
  const btn = findButton(label)
  expect(btn, `按钮存在：${label}`).toBeDefined()
  await act(async () => {
    btn?.click()
  })
}

function progressText(): string | null {
  return host?.querySelector('[data-testid="corpus-export-progress"]')?.textContent ?? null
}

/** 模块加载即捕获的真实初始态（门一 W1：resetStore 字面量 ≡ 初始默认值的锚——
 *  store 默认值漂移在此即红，不再依赖 e2e 慢防线） */
const INITIAL_SNAPSHOT = { ...useCorpusExportStore.getState() }

function resetStore(): void {
  useCorpusExportStore.setState({
    busy: false,
    sessionId: null,
    phase: null,
    done: 0,
    total: 0,
    errorCount: 0,
    fileCount: null,
    error: null
  })
}

function Probe(): JSX.Element {
  useExportCorpusEvents()
  return <></>
}

/** 挂载订阅桥（事件桥/终局 toast 用例共用；卸载归 afterEach 统一收） */
async function mountHook(): Promise<void> {
  await render(<Probe />)
}

function emit(e: unknown): Promise<void> {
  expect(holder.cb, '事件回调已注册').not.toBeNull()
  return act(async () => {
    holder.cb!(e)
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  onExportCorpusSpy.mockImplementation((cb: (e: unknown) => void) => {
    holder.cb = cb
    return offSpy
  })
  resetStore()
})

afterEach(async () => {
  await act(async () => {
    root?.unmount()
  })
  host?.remove()
  root = null
  host = null
})

guardedDescribe('SR2-AI-04', 'corpus-export.store —— 导出会话进度态', () => {
  it('初始态：空闲、无进度、无错误（resetStore 字面量≡真实初始默认值——W1 锚）', () => {
    resetStore()
    expect(useCorpusExportStore.getState()).toEqual(INITIAL_SNAPSHOT)
    const s = useCorpusExportStore.getState()
    expect(s.busy).toBe(false)
    expect(s.phase).toBeNull()
    expect(s.done).toBe(0)
    expect(s.total).toBe(0)
    expect(s.errorCount).toBe(0)
    expect(s.fileCount).toBeNull()
    expect(s.error).toBeNull()
  })

  it('start：经 api.export_.corpusSession({}) 发起全库会话；终局 phase=done+fileCount/errorCount 落账+busy 复位', async () => {
    stubApi.export_.corpusSession.mockResolvedValue(okSession(3, 1))
    await act(async () => {
      await useCorpusExportStore.getState().start()
    })
    expect(stubApi.export_.corpusSession).toHaveBeenCalledWith({})
    const s = useCorpusExportStore.getState()
    expect(s.busy).toBe(false)
    expect(s.phase).toBe('done')
    expect(s.fileCount).toBe(3)
    expect(s.errorCount).toBe(1)
    expect(s.error).toBeNull()
  })

  it('start：发起即 busy=true；重入守卫——busy 期间第二次 start 不再 invoke（通道层 EXPORT_BUSY 折叠的 UI 预防面）', async () => {
    let resolveSession!: (v: SessionOk) => void
    stubApi.export_.corpusSession.mockImplementation(
      () => new Promise<SessionOk>((r) => { resolveSession = r })
    )
    const p = useCorpusExportStore.getState().start()
    expect(useCorpusExportStore.getState().busy).toBe(true)
    await useCorpusExportStore.getState().start()
    expect(stubApi.export_.corpusSession).toHaveBeenCalledTimes(1)
    resolveSession(okSession(1, 0))
    await act(async () => {
      await p
    })
  })

  it('start：折叠错误终局（Result not ok——EXPORT_BUSY/CANCELLED/IO_ERROR 同型）→ busy 复位+error=中文 message+进度重置', async () => {
    stubApi.export_.corpusSession.mockResolvedValue({
      ok: false,
      error: { code: 'EXPORT_BUSY', message: '导出会话进行中，请等待完成后再发起' }
    })
    await act(async () => {
      await useCorpusExportStore.getState().start()
    })
    const s = useCorpusExportStore.getState()
    expect(s.busy).toBe(false)
    expect(s.phase).toBeNull()
    expect(s.done).toBe(0)
    expect(s.total).toBe(0)
    expect(s.fileCount).toBeNull()
    expect(s.error).toBe('导出会话进行中，请等待完成后再发起')
  })

  it('applyProgress：会话在途（busy）回写 phase/done/total', async () => {
    let resolveSession!: (v: SessionOk) => void
    stubApi.export_.corpusSession.mockImplementation(
      () => new Promise<SessionOk>((r) => { resolveSession = r })
    )
    const p = useCorpusExportStore.getState().start()
    useCorpusExportStore.getState().applyProgress({
      type: 'progress',
      sessionId: 'cs-1',
      done: 2,
      total: 5,
      phase: 'streaming'
    })
    const s = useCorpusExportStore.getState()
    expect(s.phase).toBe('streaming')
    expect(s.done).toBe(2)
    expect(s.total).toBe(5)
    resolveSession(okSession(5, 0))
    await act(async () => {
      await p
    })
  })

  it('applyProgress 迟到守卫（INV-03 同族）：终局后跨通道迟到的 progress 不得把 done 态改回在途相', async () => {
    stubApi.export_.corpusSession.mockResolvedValue(okSession(2, 0))
    await act(async () => {
      await useCorpusExportStore.getState().start()
    })
    useCorpusExportStore.getState().applyProgress({
      type: 'progress',
      sessionId: 'cs-1',
      done: 1,
      total: 2,
      phase: 'finalizing'
    })
    expect(useCorpusExportStore.getState().phase).toBe('done')
  })

  it('applyProgress 跨会话过滤（门一 N1）：会话 A 在途期间会话 B 的迟到 progress 不回写', async () => {
    let resolveSession!: (v: SessionOk) => void
    stubApi.export_.corpusSession.mockImplementation(
      () => new Promise<SessionOk>((r) => { resolveSession = r })
    )
    const p = useCorpusExportStore.getState().start()
    useCorpusExportStore.getState().applyProgress({
      type: 'progress',
      sessionId: 'cs-a',
      done: 1,
      total: 3,
      phase: 'streaming'
    })
    useCorpusExportStore.getState().applyProgress({
      type: 'progress',
      sessionId: 'cs-b',
      done: 9,
      total: 9,
      phase: 'finalizing'
    })
    const s = useCorpusExportStore.getState()
    expect(s.sessionId).toBe('cs-a')
    expect(s.phase).toBe('streaming')
    expect(s.done).toBe(1)
    resolveSession(okSession(3, 0))
    await act(async () => {
      await p
    })
  })
})

guardedDescribe('SR2-AI-04', 'useExportCorpusEvents —— App 层事件桥', () => {
  it('挂载即订阅 exportCorpus 事件；卸载成对注销（INV-14 消费方级）', async () => {
    await mountHook()
    expect(onExportCorpusSpy).toHaveBeenCalledTimes(1)
    await act(async () => {
      root?.unmount()
    })
    expect(offSpy).toHaveBeenCalledTimes(1)
  })

  it('生产组装：createCorpusExtractor 收 loadDocument=loadPdfDocument 单点+sendItem 接 window.api.export_.corpusItem', async () => {
    await mountHook()
    const deps = holder.deps as { loadDocument: unknown; sendItem: (item: unknown) => Promise<unknown> }
    expect(deps.loadDocument).toBe(loadDocSentinel)
    stubApi.export_.corpusItem.mockResolvedValue({ ok: true, data: { ok: true } })
    const item = { kind: 'fulltext', sessionId: 'cs-1', paperId: 'p1', page: 1, payload: 'x' }
    await deps.sendItem(item)
    expect(stubApi.export_.corpusItem).toHaveBeenCalledWith(item)
    // 门一 W2：not-ok 透传锚——映射退化为无条件 ok 会吞折叠拒绝（提取器误判
    // ack→会话悬挂死锁的镜像面），该合约必须锁定
    const deny = { ok: false as const, error: { code: 'INVALID_REQUEST', message: '回传载荷与会话在途篇不匹配' } }
    stubApi.export_.corpusItem.mockResolvedValue(deny)
    await expect(deps.sendItem(item)).resolves.toEqual(deny)
  })

  it('事件双型分发：extract-request→提取器；progress→store 进度回写（在途）', async () => {
    await mountHook()
    let resolveSession!: (v: SessionOk) => void
    stubApi.export_.corpusSession.mockImplementation(
      () => new Promise<SessionOk>((r) => { resolveSession = r })
    )
    await act(async () => {
      void useCorpusExportStore.getState().start()
    })
    const req = extractRequest()
    await emit(req)
    expect(extractorHandle).toHaveBeenCalledWith(req)
    await emit({ type: 'progress', sessionId: 'cs-1', done: 1, total: 2, phase: 'streaming' })
    const s = useCorpusExportStore.getState()
    expect(s.phase).toBe('streaming')
    expect(s.done).toBe(1)
    expect(s.total).toBe(2)
    resolveSession(okSession(2, 0))
    await act(async () => {
      await Promise.resolve()
    })
  })

  it('终局 toast 成功面：fileCount 入文案；errorCount>0 部分=info 档，全成=success 档（INV-02）', async () => {
    await mountHook()
    stubApi.export_.corpusSession.mockResolvedValue(okSession(2, 1))
    await act(async () => {
      await useCorpusExportStore.getState().start()
    })
    expect(toastSpy).toHaveBeenCalledWith('语料导出完成：2 篇（1 篇失败）', 'info')

    resetStore()
    stubApi.export_.corpusSession.mockResolvedValue(okSession(5, 0))
    await act(async () => {
      await useCorpusExportStore.getState().start()
    })
    expect(toastSpy).toHaveBeenCalledWith('语料导出完成：5 篇', 'success')
  })

  it('终局 toast 失败面：折叠错误 message 直达 toast（EXPORT_BUSY/CANCELLED 同型，INV-02/INV-13）', async () => {
    await mountHook()
    stubApi.export_.corpusSession.mockResolvedValue({
      ok: false,
      error: { code: 'EXPORT_BUSY', message: '导出会话进行中，请等待完成后再发起' }
    })
    await act(async () => {
      await useCorpusExportStore.getState().start()
    })
    expect(toastSpy).toHaveBeenCalledWith('导出会话进行中，请等待完成后再发起', 'error')
  })
})

guardedDescribe('SR2-AI-04', 'CorpusExportSection —— 设置页 AI 语料导出节', () => {
  it('初始渲染：「导出语料」按钮可点；进度行不渲染（无会话）', async () => {
    await render(<CorpusExportSection />)
    const btn = findButton('导出语料')
    expect(btn).toBeDefined()
    expect(btn?.disabled).toBe(false)
    expect(progressText()).toBeNull()
  })

  it('点击导出：经 store.start 真链路以 {} invoke corpusSession（全库口径——目录选择在通道内，INV-07）', async () => {
    stubApi.export_.corpusSession.mockResolvedValue(okSession(4, 0))
    await render(<CorpusExportSection />)
    await click('导出语料')
    expect(stubApi.export_.corpusSession).toHaveBeenCalledWith({})
    const s = useCorpusExportStore.getState()
    expect(s.busy).toBe(false)
    expect(s.fileCount).toBe(4)
  })

  it('busy 期间按钮 disabled（会话单飞的 UI 预防面）', async () => {
    stubApi.export_.corpusSession.mockImplementation(
      () => new Promise(() => undefined) // 会话悬挂（对话框打开/提取在途）
    )
    await render(<CorpusExportSection />)
    await click('导出语料')
    expect(findButton('导出语料')?.disabled).toBe(true)
  })

  it('进度行：streaming 呈现「提取全文 done/total」；终局 done+errorCount 部分成功可见', async () => {
    await render(<CorpusExportSection />)
    await act(async () => {
      useCorpusExportStore.setState({ busy: true })
      useCorpusExportStore.getState().applyProgress({
        type: 'progress',
        sessionId: 'cs-1',
        done: 2,
        total: 5,
        phase: 'streaming'
      })
    })
    expect(progressText()).toBe('提取全文 2/5')
    await act(async () => {
      useCorpusExportStore.setState({ busy: false, phase: 'done', done: 5, total: 5, errorCount: 1 })
    })
    expect(progressText()).toBe('完成 5/5，1 篇失败')
  })

  it('SettingsPage 挂载：设置页渲染后「导出语料」按钮可见（R14 防线）', async () => {
    stubApi.settings.get.mockResolvedValue({
      ok: true,
      data: { contactEmail: 'a@b.c', theme: 'system' }
    })
    await render(<SettingsPage />)
    expect(findButton('导出语料')).toBeDefined()
  })
})
