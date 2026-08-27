// @vitest-environment jsdom
/**
 * [SR2-AI-10] ZcodeLinkSection —— 设置页 zcode 联动节组件测试（锁定合约）。
 *
 * 覆盖：五态渲染（mock zcodeDetect）/迁移序列①②/确认对话框两型（首装/覆盖
 * 重申）/装技能 invoke 调用与 busy 态/装失败动作型 toast/error 态（detect 拒绝
 * 与 state='error' 两路径）+重试按钮/卸载清 interval/轮询 5s 周期。
 * always-active（ADR-0017 裁决 3）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type * as clientModule from '../../../src/renderer/api/client'
import type * as toastModule from '../../../src/renderer/shared/ui/Toast'

const { stubApi, zcodeDetect, zcodeInstall } = vi.hoisted(() => {
  const zcodeDetect = vi.fn()
  const zcodeInstall = vi.fn()
  return { stubApi: { ai_sensor: { zcodeDetect, zcodeInstall } }, zcodeDetect, zcodeInstall }
})

vi.mock('../../../src/renderer/api/client', async (importOriginal) => {
  const real = await importOriginal<typeof clientModule>()
  return { ...real, api: stubApi as unknown as typeof clientModule.api }
})
vi.mock('../../../src/renderer/shared/ui/Toast', async (importOriginal) => {
  const real = await importOriginal<typeof toastModule>()
  return { ...real, showToast: vi.fn() }
})

import { showToast } from '../../../src/renderer/shared/ui/Toast'
import { ZcodeLinkSection } from '../../../src/renderer/features/settings/ZcodeLinkSection'

type DetectState = 'zcode-not-found' | 'found-skill-missing' | 'installed-idle' | 'running' | 'error'

function detectRes(patch: {
  state: DetectState
  status?: { state: string; currentPaper: string | null; running: boolean } | null
  overwrite?: boolean
  reason?: string
}) {
  return {
    state: patch.state,
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
    overwrite: patch.overwrite ?? false,
    ...(patch.reason !== undefined ? { reason: patch.reason } : {})
  }
}

let root: Root | null = null
let host: HTMLDivElement | null = null

function mount(): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(<ZcodeLinkSection />)
  })
}

const flush = async (ms = 0): Promise<void> => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

const text = (): string => host?.querySelector('[data-testid="zcode-link-status"]')?.textContent ?? ''
const installBtn = (): HTMLButtonElement | null =>
  host?.querySelector('button[data-action="install"]') as HTMLButtonElement | null
const retryBtn = (): HTMLButtonElement | null =>
  host?.querySelector('button[data-action="retry"]') as HTMLButtonElement | null

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
  zcodeDetect.mockResolvedValue({ ok: true, data: detectRes({ state: 'zcode-not-found' }) })
  zcodeInstall.mockResolvedValue({ ok: true, data: { fileCount: 12 } })
  void confirmSpy
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  vi.useRealTimers()
  vi.restoreAllMocks()
})

it('zcode-not-found：「未发现 zcode」+安装指引文案，无装技能按钮', async () => {
  mount()
  await flush()
  expect(text()).toBe('未发现 zcode')
  expect(host?.textContent).toContain('安装 zcode')
  expect(installBtn()).toBeNull()
})

it('found-skill-missing：「已发现 zcode，技能未装」+「一键装技能」按钮', async () => {
  zcodeDetect.mockResolvedValue({ ok: true, data: detectRes({ state: 'found-skill-missing' }) })
  mount()
  await flush()
  expect(text()).toBe('已发现 zcode，技能未装')
  expect(installBtn()).not.toBeNull()
  expect(installBtn()?.textContent).toBe('一键装技能')
  expect(installBtn()?.disabled).toBe(false)
})

it('installed-idle：「已装技能，未运行」', async () => {
  zcodeDetect.mockResolvedValue({ ok: true, data: detectRes({ state: 'installed-idle' }) })
  mount()
  await flush()
  expect(text()).toBe('已装技能，未运行')
  expect(installBtn()).toBeNull()
})

it('running：「运行中」+state 自述+currentPaper', async () => {
  zcodeDetect.mockResolvedValue({
    ok: true,
    data: detectRes({ state: 'running', status: { state: '一读中', currentPaper: 'p-1', running: true } })
  })
  mount()
  await flush()
  expect(text()).toBe('运行中（一读中，当前：p-1）')
})

it('running：currentPaper=null——无当前篇后缀', async () => {
  zcodeDetect.mockResolvedValue({
    ok: true,
    data: detectRes({ state: 'running', status: { state: '排队空闲', currentPaper: null, running: true } })
  })
  mount()
  await flush()
  expect(text()).toBe('运行中（排队空闲）')
})

it('error 态（detect Res state=error——status.json 损坏）：「状态读取失败」+reason+重试按钮', async () => {
  zcodeDetect.mockResolvedValue({
    ok: true,
    data: detectRes({ state: 'error', reason: 'status.json 读取/解析失败：……——文件损坏？' })
  })
  mount()
  await flush()
  expect(text()).toBe('状态读取失败')
  expect(host?.textContent).toContain('status.json')
  expect(retryBtn()).not.toBeNull()
})

it('error 态重试：点击重试→再调 detect', async () => {
  zcodeDetect.mockResolvedValue({ ok: true, data: detectRes({ state: 'error', reason: 'x' }) })
  mount()
  await flush()
  const calls = zcodeDetect.mock.calls.length
  act(() => {
    retryBtn()?.click()
  })
  await flush()
  expect(zcodeDetect.mock.calls.length).toBe(calls + 1)
})

it('detect 通道拒绝（IPC 层失败）→error 呈现+重试（不 toast 轰炸）', async () => {
  zcodeDetect.mockRejectedValueOnce(new Error('IPC 失败')).mockResolvedValue({
    ok: true,
    data: detectRes({ state: 'zcode-not-found' })
  })
  mount()
  await flush()
  expect(text()).toBe('状态读取失败')
  expect(showToast).not.toHaveBeenCalled()
  act(() => {
    retryBtn()?.click()
  })
  await flush()
  expect(text()).toBe('未发现 zcode')
})

it('确认对话框首装型：普通文案+确认后调 zcodeInstall+成功 toast+re-detect→idle', async () => {
  const confirmSpy = vi.spyOn(window, 'confirm')
  zcodeDetect
    .mockResolvedValueOnce({ ok: true, data: detectRes({ state: 'found-skill-missing' }) })
    .mockResolvedValueOnce({ ok: true, data: detectRes({ state: 'installed-idle' }) })
  mount()
  await flush()
  act(() => {
    installBtn()?.click()
  })
  await flush()
  expect(confirmSpy).toHaveBeenCalledTimes(1)
  expect(confirmSpy.mock.calls[0]?.[0]).not.toContain('覆盖')
  expect(zcodeInstall).toHaveBeenCalledTimes(1)
  expect(showToast).toHaveBeenCalledWith('技能安装完成（12 个文件）', 'success')
  expect(text()).toBe('已装技能，未运行')
})

it('确认对话框覆盖型（overwrite=true）：重申覆盖文案', async () => {
  const confirmSpy = vi.spyOn(window, 'confirm')
  zcodeDetect.mockResolvedValue({ ok: true, data: detectRes({ state: 'found-skill-missing', overwrite: true }) })
  mount()
  await flush()
  act(() => {
    installBtn()?.click()
  })
  await flush()
  expect(confirmSpy.mock.calls[0]?.[0]).toContain('覆盖')
  expect(zcodeInstall).toHaveBeenCalledTimes(1)
})

it('确认取消：不调 install，态保持 found-skill-missing（按钮仍可用）', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(false)
  zcodeDetect.mockResolvedValue({ ok: true, data: detectRes({ state: 'found-skill-missing' }) })
  mount()
  await flush()
  expect(text()).toBe('已发现 zcode，技能未装') // 前置事实：真实呈现（占位恒绿防线）
  act(() => {
    installBtn()?.click()
  })
  await flush()
  expect(zcodeInstall).not.toHaveBeenCalled()
  expect(text()).toBe('已发现 zcode，技能未装') // 取消后无态迁移
  expect(installBtn()?.disabled).toBe(false)
})

it('busy 态：install 在途→按钮禁用+无重复调用', async () => {
  let resolveInstall: (v: { ok: true; data: { fileCount: number } }) => void = () => undefined
  zcodeInstall.mockReturnValue(
    new Promise((r) => {
      resolveInstall = r
    })
  )
  zcodeDetect.mockResolvedValue({ ok: true, data: detectRes({ state: 'found-skill-missing' }) })
  mount()
  await flush()
  act(() => {
    installBtn()?.click()
  })
  await flush()
  expect(installBtn()?.disabled).toBe(true)
  act(() => {
    installBtn()?.click()
  })
  await flush()
  expect(zcodeInstall).toHaveBeenCalledTimes(1)
  await act(async () => {
    resolveInstall({ ok: true, data: { fileCount: 12 } })
  })
  await flush()
  expect(installBtn()?.disabled).toBe(false)
})

it('装技能失败（动作型）toast error，按钮复位可重试', async () => {
  zcodeInstall.mockRejectedValueOnce(new Error('复制失败'))
  zcodeDetect.mockResolvedValue({ ok: true, data: detectRes({ state: 'found-skill-missing' }) })
  mount()
  await flush()
  act(() => {
    installBtn()?.click()
  })
  await flush()
  expect(showToast).toHaveBeenCalledWith('操作失败', 'error')
  expect(installBtn()?.disabled).toBe(false)
})

it('跨格序列①：not-found→（用户装 zcode）→skill-missing→装→idle', async () => {
  zcodeDetect
    .mockResolvedValueOnce({ ok: true, data: detectRes({ state: 'zcode-not-found' }) })
    .mockResolvedValueOnce({ ok: true, data: detectRes({ state: 'found-skill-missing' }) })
    .mockResolvedValueOnce({ ok: true, data: detectRes({ state: 'installed-idle' }) })
  mount()
  await flush()
  expect(text()).toBe('未发现 zcode')
  await flush(5000) // 轮询驱动：用户装 zcode 后下次 detect 命中 skill-missing
  expect(text()).toBe('已发现 zcode，技能未装')
  act(() => {
    installBtn()?.click()
  })
  await flush()
  expect(text()).toBe('已装技能，未运行')
})

it('跨格序列②：idle→running→idle（轮询驱动会话起止，无残留态）', async () => {
  zcodeDetect
    .mockResolvedValueOnce({ ok: true, data: detectRes({ state: 'installed-idle' }) })
    .mockResolvedValueOnce({
      ok: true,
      data: detectRes({ state: 'running', status: { state: '一读中', currentPaper: 'p-1', running: true } })
    })
    .mockResolvedValueOnce({ ok: true, data: detectRes({ state: 'installed-idle' }) })
  mount()
  await flush()
  expect(text()).toBe('已装技能，未运行')
  await flush(5000)
  expect(text()).toBe('运行中（一读中，当前：p-1）')
  await flush(5000)
  expect(text()).toBe('已装技能，未运行')
})

it('卸载清 interval（INV-14）：unmount 后 advance 超周期不再轮询（前置=已轮询）', async () => {
  mount()
  await flush()
  const calls = zcodeDetect.mock.calls.length
  expect(calls).toBeGreaterThanOrEqual(1) // 前置事实：挂载期确有轮询（占位恒绿防线）
  act(() => {
    root?.unmount()
  })
  root = null
  await flush(15000)
  expect(zcodeDetect.mock.calls.length).toBe(calls)
})
