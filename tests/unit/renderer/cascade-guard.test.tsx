// @vitest-environment jsdom
/**
 * [F-DBCAMP-01 DB-2 UI U6] useCascadeGuard —— 级联两次确认共享 hook
 * （设计 §1.6：step1→previewLoading→step2|skipped|cancelled→confirming→done
 * +静默路径变体；Probe 组件挂 hook——always-active 裸 describe K3）。
 *
 * 覆盖：双路径（gate 弹窗门/runWithCascade 静默直出）×{合计 0/>0}×{确认/取消}
 * +preview 失败两形（弹窗路径=错误窗重试/取消；静默路径=fail-closed toast
 * 零删除）+第二窗四计数文案（双面合计值）+「审计记录将保留」+confirming
 * 失败窗保持+第一窗 onGate 插入面（true 放行/false 窗关零删除）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, toastSpy } from '../../utils/api-client-mock'

const preview = vi.fn()
makeApiStub({ ai_cascade: { preview } })

import { useCascadeGuard } from '../../../src/renderer/features/library/useCascadeGuard'
import { PaperDeleteDialog } from '../../../src/renderer/features/library/PaperDeleteDialog'
import type { AiCascadeCounts } from '../../../src/shared/models/ai-domain'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

function okCounts(c: Partial<AiCascadeCounts> = {}): { ok: true; data: { counts: AiCascadeCounts } } {
  return {
    ok: true as const,
    data: { counts: { sessions: 0, messages: 0, memories: 0, tasks: 0, ...c } }
  }
}

/** 双面合计夹具（folder 流 E5 场景三同值） */
const BOTH_SIDES: AiCascadeCounts = { sessions: 2, messages: 2, memories: 2, tasks: 2 }

let root: Root | null = null
let host: HTMLDivElement | null = null
let guard: ReturnType<typeof useCascadeGuard> | null = null

function mountGuard(): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(
      <Probe />
    )
  })
}

function Probe(): JSX.Element {
  guard = useCascadeGuard()
  return <>{guard.dialog}</>
}

async function settle(ticks = 4): Promise<void> {
  await act(async () => {
    for (let i = 0; i < ticks; i += 1) {
      await Promise.resolve()
    }
  })
}

function btn(name: string): HTMLButtonElement {
  const el = Array.from(host?.querySelectorAll('[role="dialog"] button') ?? []).find(
    (b) => b.textContent === name
  )
  if (!(el instanceof HTMLButtonElement)) throw new Error(`按钮不在场：${name}`)
  return el
}

function dialogText(): string {
  return host?.querySelector('[role="dialog"]')?.textContent ?? ''
}

function dialogCount(): number {
  return host?.querySelectorAll('[role="dialog"]').length ?? 0
}

beforeEach(() => {
  preview.mockReset()
  toastSpy.mockClear()
  guard = null
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  host?.remove()
  root = null
  host = null
  guard = null
})

describe('F-DBCAMP-01 U6 useCascadeGuard —— 级联两次确认双路径', () => {
  it('gate 合计=0：resolve true+零第二窗（skipped——旧单确认流外部行为不变）+preview req 形状', async () => {
    preview.mockResolvedValue(okCounts())
    mountGuard()
    let result: boolean | null = null
    act(() => {
      void guard!.gate({ scope: 'paper', anchorId: 'p-1' }).then((r) => {
        result = r
      })
    })
    await settle()
    expect(result, 'skipped 放行').toBe(true)
    expect(dialogCount(), '零第二窗').toBe(0)
    expect(preview).toHaveBeenCalledWith({ scope: 'paper', anchorId: 'p-1' })
  })

  it('gate 合计>0：第二窗四计数+「审计记录将保留」→确认→resolve true+窗关', async () => {
    preview.mockResolvedValue(okCounts(BOTH_SIDES))
    mountGuard()
    let result: boolean | null = null
    act(() => {
      void guard!.gate({ scope: 'folder', anchorId: 'f-1' }).then((r) => {
        result = r
      })
    })
    await settle()
    expect(dialogCount(), '第二窗在场').toBe(1)
    const text = dialogText()
    expect(text).toContain('会话 2 个')
    expect(text).toContain('消息 2 条')
    expect(text).toContain('记忆 2 条')
    expect(text).toContain('任务 2 个')
    expect(text).toContain('审计记录将保留')
    expect(result).toBe(null)
    act(() => {
      btn('确认删除').click()
    })
    await settle()
    expect(result, '确认放行').toBe(true)
    expect(dialogCount(), '窗关').toBe(0)
  })

  it('gate 第二窗取消：resolve false（整体中止——对象保留窗全关）', async () => {
    preview.mockResolvedValue(okCounts({ sessions: 1 }))
    mountGuard()
    let result: boolean | null = null
    act(() => {
      void guard!.gate({ scope: 'paper', anchorId: 'p-2' }).then((r) => {
        result = r
      })
    })
    await settle()
    act(() => {
      btn('取消').click()
    })
    await settle()
    expect(result, '取消中止').toBe(false)
    expect(dialogCount()).toBe(0)
  })

  it('gate preview 失败：错误窗（禁盲删）→重试成功=0→resolve true', async () => {
    preview
      .mockResolvedValueOnce({ ok: false, error: { code: 'INVALID_REQUEST', message: '预检失败面' } })
      .mockResolvedValueOnce(okCounts())
    mountGuard()
    let result: boolean | null = null
    act(() => {
      void guard!.gate({ scope: 'paper', anchorId: 'p-3' }).then((r) => {
        result = r
      })
    })
    await settle()
    expect(dialogCount(), '错误窗在场').toBe(1)
    expect(dialogText()).toContain('预检失败面')
    expect(dialogText()).toContain('重试')
    act(() => {
      btn('重试').click()
    })
    await settle()
    expect(result, '重试后 skipped 放行').toBe(true)
    expect(dialogCount()).toBe(0)
    expect(preview).toHaveBeenCalledTimes(2)
  })

  it('gate preview 失败→错误窗取消：resolve false（fail-closed 零盲删）', async () => {
    preview.mockResolvedValue({ ok: false, error: { code: 'NOT_FOUND', message: '锚不存在' } })
    mountGuard()
    let result: boolean | null = null
    act(() => {
      void guard!.gate({ scope: 'folder', anchorId: 'f-x' }).then((r) => {
        result = r
      })
    })
    await settle()
    act(() => {
      btn('取消').click()
    })
    await settle()
    expect(result).toBe(false)
    expect(dialogCount()).toBe(0)
  })

  it('runWithCascade 合计=0：直删 onProceed（外部行为零变）+零第二窗', async () => {
    preview.mockResolvedValue(okCounts())
    mountGuard()
    const onProceed = vi.fn(async () => undefined)
    await act(async () => {
      await guard!.runWithCascade({ scope: 'paper', anchorId: 'p-4', onProceed })
    })
    expect(onProceed, '静默直删').toHaveBeenCalledTimes(1)
    expect(dialogCount()).toBe(0)
  })

  it('runWithCascade 合计>0：第二窗直出（无第一窗）→确认→onProceed；失败→toast+窗保持', async () => {
    preview.mockResolvedValue(okCounts({ sessions: 1, messages: 2, memories: 1, tasks: 1 }))
    mountGuard()
    let boom = false
    const onProceed = vi.fn(async () => {
      if (!boom) {
        boom = true
        throw new Error('删除 IPC 失败')
      }
    })
    act(() => {
      void guard!.runWithCascade({ scope: 'paper', anchorId: 'p-5', onProceed })
    })
    await settle()
    expect(dialogCount(), '第二窗直出').toBe(1)
    expect(dialogText()).toContain('会话 1 个')
    act(() => {
      btn('确认删除').click()
    })
    await settle()
    expect(onProceed).toHaveBeenCalledTimes(1)
    expect(dialogCount(), '失败窗保持可重试').toBe(1)
    act(() => {
      btn('确认删除').click()
    })
    await settle()
    expect(onProceed, '重试再执行').toHaveBeenCalledTimes(2)
    expect(dialogCount(), '成功窗关').toBe(0)
  })

  it('runWithCascade 合计>0→取消：零 onProceed（对象保留）', async () => {
    preview.mockResolvedValue(okCounts({ memories: 3 }))
    mountGuard()
    const onProceed = vi.fn(async () => undefined)
    act(() => {
      void guard!.runWithCascade({ scope: 'folder', anchorId: 'f-2', onProceed })
    })
    await settle()
    act(() => {
      btn('取消').click()
    })
    await settle()
    expect(onProceed, '取消零删除').not.toHaveBeenCalled()
    expect(dialogCount()).toBe(0)
  })

  it('runWithCascade preview 失败：fail-closed 零删除+error toast+无窗（沿预检失败先例）', async () => {
    preview.mockResolvedValue({ ok: false, error: { code: 'INVALID_REQUEST', message: '计数失败' } })
    mountGuard()
    const onProceed = vi.fn(async () => undefined)
    await act(async () => {
      await guard!.runWithCascade({ scope: 'paper', anchorId: 'p-6', onProceed })
    })
    expect(onProceed, 'fail-closed 零删除').not.toHaveBeenCalled()
    expect(dialogCount(), '无窗').toBe(0)
    expect(toastSpy).toHaveBeenCalled()
  })

  it('[r1-W1] step2 在场再调 runWithCascade：入口早退——旧窗保持+第二次 no-op（不覆盖 proceedRef）', async () => {
    preview.mockResolvedValueOnce(okCounts({ sessions: 1, memories: 1 }))
    mountGuard()
    const onProceed1 = vi.fn(async () => undefined)
    act(() => {
      void guard!.runWithCascade({ scope: 'paper', anchorId: 'p-1st', onProceed: onProceed1 })
    })
    await settle()
    expect(dialogCount(), '第一窗在场').toBe(1)
    expect(dialogText()).toContain('会话 1 个')

    // 第二次调用（第二 preview 挂起——若未早退，phase 会走 previewLoading 拆旧窗）
    preview.mockReturnValue(new Promise(() => undefined))
    const onProceed2 = vi.fn(async () => undefined)
    act(() => {
      void guard!.runWithCascade({ scope: 'folder', anchorId: 'f-2nd', onProceed: onProceed2 })
    })
    await settle()
    expect(dialogCount(), '旧窗保持（未拆未换）').toBe(1)
    expect(dialogText()).toContain('会话 1 个')

    // 旧窗确认仍走第一份 onProceed（proceedRef 未被第二次调用覆盖）
    act(() => {
      btn('确认删除').click()
    })
    await settle()
    expect(onProceed1, '旧窗确认=第一份删除回调').toHaveBeenCalledTimes(1)
    expect(onProceed2, '第二次调用零删除回调').not.toHaveBeenCalled()
  })

  it('runWithCascade 合计=0 且 onProceed 抛出（删除失败已 toast）：吞掉不上抛+零窗', async () => {
    preview.mockResolvedValue(okCounts())
    mountGuard()
    const onProceed = vi.fn(async () => {
      throw new Error('删除 IPC 失败')
    })
    await act(async () => {
      await guard!.runWithCascade({ scope: 'paper', anchorId: 'p-7', onProceed })
    })
    expect(onProceed).toHaveBeenCalledTimes(1)
    expect(dialogCount()).toBe(0)
  })
})

describe('F-DBCAMP-01 U6 第一窗 onGate 插入面（PaperDeleteDialog）', () => {
  const papersDelete = vi.fn()
  makeApiStub({ papers: { delete: papersDelete } })

  function mountDialog(onGate: (() => Promise<boolean>) | undefined): void {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    act(() => {
      root?.render(
        <PaperDeleteDialog
          paperId="p-g"
          graphName="主图"
          edgeCount={1}
          onGate={onGate}
          onClose={() => undefined}
          onDone={() => undefined}
        />
      )
    })
  }

  function confirmBtn(): HTMLButtonElement {
    const el = Array.from(host?.querySelectorAll('[role="dialog"] button') ?? []).find(
      (b) => b.textContent === '删除文献'
    )
    if (!(el instanceof HTMLButtonElement)) throw new Error('删除文献钮不在场')
    return el
  }

  beforeEach(() => {
    papersDelete.mockReset()
    papersDelete.mockResolvedValue({ ok: true, data: { ok: true } })
  })

  it('gate true：放行既有删除通道（papers.delete 调用）', async () => {
    mountDialog(async () => true)
    act(() => {
      confirmBtn().click()
    })
    await settle()
    expect(papersDelete, 'gate 放行删除').toHaveBeenCalledTimes(1)
  })

  it('gate false：零删除+窗关（整体中止）', async () => {
    let closed = false
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    act(() => {
      root?.render(
        <PaperDeleteDialog
          paperId="p-g2"
          graphName="主图"
          edgeCount={1}
          onGate={async () => false}
          onClose={() => {
            closed = true
          }}
          onDone={() => undefined}
        />
      )
    })
    act(() => {
      confirmBtn().click()
    })
    await settle()
    expect(papersDelete, '取消零删除').not.toHaveBeenCalled()
    expect(closed, '窗全关').toBe(true)
  })
})
