/**
 * [F-DBCAMP-01 DB-2 UI U6] useCascadeGuard —— 级联删除两次确认共享接线
 * （设计 §1.6：papers/folders 双删除流同型禁双源——级联流单源收敛本件；
 * 宿主=LibraryPage（paper 流）/FolderNav（folder 流））。
 *
 * ── 态空间表（状态机前置——先于实现定型；§1.6 机+静默路径变体）──
 * phase = idle | previewLoading | step2(counts) | confirming(counts) | previewError(message)
 *   弹窗路径 gate()（第一窗 confirm 内调用——第一窗保持开+按钮 busy 承载
 *   previewLoading 态；返回 true=放行既有删除通道）：
 *     idle --gate--> previewLoading --回包合计=0--> idle（resolve true，零新窗）
 *     previewLoading --回包合计>0--> step2 --确认删除--> idle（resolve true+窗关）
 *     step2 --取消/遮罩/ESC--> idle（resolve false——整体中止对象保留）
 *     previewLoading --preview 失败--> previewError（窗内错误行+重试/取消，禁盲删）
 *     previewError --重试--> previewLoading（再预览） --取消--> idle（resolve false）
 *   静默路径 runWithCascade()（usePaperDelete/useFolderDelete 静默分支直删前；
 *   >0 时 CascadeConfirmDialog 直出无第一窗——图资产为零第一窗文案语义不成立）：
 *     idle --run--> previewLoading --合计=0--> onProceed（静默直删外部行为零变）
 *       --onProceed 抛出（调用方已 toast）--> idle（吞掉不上抛）
 *     previewLoading --合计>0--> step2 --确认--> confirming
 *       --onProceed 成功--> idle（窗关） --抛出（已 toast）--> step2（窗保持可重试）
 *     step2 --取消--> idle（零 onProceed）
 *     previewLoading --preview 失败--> idle（fail-closed 零删除+error toast——
 *       沿预检失败先例，无错误窗）
 * 不变量：
 *   - 合计=四计数之和（sessions+messages+memories+tasks）；=0 跳过第二窗。
 *   - 第二窗=纯展示件 features/ai/CascadeConfirmDialog（禁双源）；错误窗/
 *     在途窗态=本件内联承载。
 *   - [r1 改口径] 窗开期（step2/previewError/confirming）串行=Dialog 模态
 *     遮罩拦列表交互承载（usePaperDelete RR1-1 主控裁定「confirming 期不设
 *     流级 ref」同裁——deletingIdRef 在 runWithCascade 返回即释放，不覆盖
 *     窗开期）；防御带=gate/runWithCascade 入口 phase 非 idle 早退（重入零
 *     副作用：旧窗静默保持，不替换 resolver/proceedRef——第二流 no-op）。
 *   - 窗开期间 ESC/遮罩=取消。
 *
 * ── 接口层 ──
 * - export function useCascadeGuard(): {
 *     gate(req: { scope; anchorId }): Promise<boolean>
 *     runWithCascade(req: { scope; anchorId; onProceed(): Promise<void> }): Promise<void>
 *     dialog: JSX.Element | null
 *   }
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - library 域（删除流宿主域）消费 ai/CascadeConfirmDialog（组合根白名单
 *   单点接线件）；preview 经 api.ai_cascade.preview（设计 §3.2 通道）。
 * - 测试：tests/unit/renderer/cascade-guard.test.tsx；e2e E5。
 */
import { useRef, useState } from 'react'
import type { AiCascadeCounts } from '@shared/models/ai-domain'
import { api, unwrap, ApiClientError } from '../../api/client'
import { CascadeConfirmDialog } from '../ai/CascadeConfirmDialog'
import { Button } from '../../shared/ui/Button'
import { Dialog } from '../../shared/ui/Dialog'
import { showToast } from '../../shared/ui/Toast'

/** 静默路径 preview 失败兜底（fail-closed——沿预检失败先例文案形） */
const CASCADE_PREVIEW_FAILED = '无法确认将删除的 AI 会话资源，已取消删除'

type CascadePhase =
  | { kind: 'idle' }
  | { kind: 'previewLoading' }
  | { kind: 'step2'; counts: AiCascadeCounts }
  | { kind: 'confirming'; counts: AiCascadeCounts }
  | { kind: 'previewError'; message: string }

type CascadeScope = 'paper' | 'folder'

interface CascadeReq {
  scope: CascadeScope
  anchorId: string
}

export function useCascadeGuard(): {
  gate(req: CascadeReq): Promise<boolean>
  runWithCascade(req: CascadeReq & { onProceed(): Promise<void> }): Promise<void>
  dialog: JSX.Element | null
} {
  const [phase, setPhase] = useState<CascadePhase>({ kind: 'idle' })
  /** phase 同步镜像（入口早退判据——state 异步落帧，ref 即时一致） */
  const phaseRef = useRef<CascadePhase>({ kind: 'idle' })
  /** gate 挂起 resolver（在场=gate 模式——确认=resolve true 不执行删除） */
  const resolverRef = useRef<((v: boolean) => void) | null>(null)
  /** 静默路径确认后执行的删除回调（调用方自包 toast+收尾链） */
  const proceedRef = useRef<(() => Promise<void>) | null>(null)
  /** 错误窗重试所需的预览请求快照 */
  const retryReqRef = useRef<CascadeReq | null>(null)

  function goPhase(p: CascadePhase): void {
    phaseRef.current = p
    setPhase(p)
  }

  function finish(ok: boolean): void {
    const r = resolverRef.current
    resolverRef.current = null
    proceedRef.current = null
    retryReqRef.current = null
    goPhase({ kind: 'idle' })
    r?.(ok)
  }

  async function runPreview(req: CascadeReq): Promise<void> {
    goPhase({ kind: 'previewLoading' })
    try {
      const res = await unwrap(api.ai_cascade.preview({ scope: req.scope, anchorId: req.anchorId }))
      const total =
        res.counts.sessions + res.counts.messages + res.counts.memories + res.counts.tasks
      if (total === 0) {
        finish(true)
        return
      }
      goPhase({ kind: 'step2', counts: res.counts })
    } catch (e: unknown) {
      // 弹窗路径（gate）：错误窗重试/取消（§1.6 逐字——禁盲删）
      goPhase({
        kind: 'previewError',
        message: e instanceof ApiClientError ? e.message : CASCADE_PREVIEW_FAILED
      })
    }
  }

  function gate(req: CascadeReq): Promise<boolean> {
    // [r1-W1] 入口早退（非 idle 重入零副作用）：旧窗静默保持，不替换 resolver/
    // retryReq——早退值=false（保守：不放行删除）；窗开期串行承载=Dialog 模态
    // 遮罩拦列表交互（usePaperDelete RR1-1 主控裁定同裁），此为防御带
    if (phaseRef.current.kind !== 'idle') return Promise.resolve(false)
    return new Promise((resolve) => {
      resolverRef.current = resolve
      retryReqRef.current = req
      void runPreview(req)
    })
  }

  async function confirmStep2(counts: AiCascadeCounts): Promise<void> {
    if (resolverRef.current !== null) {
      // gate 模式：确认=放行既有删除通道（第一窗继续）
      finish(true)
      return
    }
    // 静默路径：执行删除——失败窗保持可重试（toast 已由 onProceed 调用方出）
    goPhase({ kind: 'confirming', counts })
    try {
      await proceedRef.current?.()
    } catch {
      goPhase({ kind: 'step2', counts })
      return
    }
    finish(true)
  }

  async function runWithCascade(req: CascadeReq & { onProceed(): Promise<void> }): Promise<void> {
    // [r1-W1] 入口早退（非 idle 重入零副作用）：旧窗静默保持，不覆盖 proceedRef
    // ——第二流 no-op（不删不弹）；窗开期串行承载=Dialog 模态遮罩（头注不变量）
    if (phaseRef.current.kind !== 'idle') return
    goPhase({ kind: 'previewLoading' })
    try {
      const res = await unwrap(api.ai_cascade.preview({ scope: req.scope, anchorId: req.anchorId }))
      const total =
        res.counts.sessions + res.counts.messages + res.counts.memories + res.counts.tasks
      if (total === 0) {
        // 静默直删（外部行为零变）；onProceed 抛出=调用方已 toast，吞掉防误报
        goPhase({ kind: 'idle' })
        try {
          await req.onProceed()
        } catch {
          return
        }
        return
      }
      proceedRef.current = req.onProceed
      goPhase({ kind: 'step2', counts: res.counts })
    } catch (e: unknown) {
      // 静默路径 preview 失败=fail-closed（不删+error toast，无错误窗）
      goPhase({ kind: 'idle' })
      showToast(e instanceof ApiClientError ? e.message : CASCADE_PREVIEW_FAILED, 'error')
    }
  }

  let dialog: JSX.Element | null = null
  if (phase.kind === 'step2' || phase.kind === 'confirming') {
    const counts = phase.counts
    dialog = (
      <CascadeConfirmDialog
        counts={counts}
        confirming={phase.kind === 'confirming'}
        onConfirm={() => {
          void confirmStep2(counts)
        }}
        onCancel={() => {
          finish(false)
        }}
      />
    )
  } else if (phase.kind === 'previewError') {
    dialog = (
      <Dialog
        open
        title="无法确认级联范围"
        onClose={() => {
          finish(false)
        }}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => finish(false)}>
              取消
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                const req = retryReqRef.current
                if (req !== null) void runPreview(req)
              }}
            >
              重试
            </Button>
          </>
        }
      >
        <p className="text-xs leading-6" style={{ color: 'var(--danger)' }}>
          {`${phase.message}。不会在未确认的情况下删除 AI 会话资源。`}
        </p>
      </Dialog>
    )
  }

  return { gate, runWithCascade, dialog }
}
