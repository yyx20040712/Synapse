// b3: P7-G
/**
 * [F-SPLIT-01] AiNotesStatus —— AI 状态行+动作按钮件（自 AiNotesSection 拆出
 * 2026-09-05；迁移 AiNotesSection 头注状态行/按钮职责段，语句零改纯搬运——
 * 六态表/derivePhase 单源驻 ai-notes-phase.ts，分节列表呈现与 locateAnchor
 * 留宿主）。
 *
 * ── 行为层（原 AiNotesSection 状态面）──
 * - 「AI 正在读」状态行+「AI 读文献」按钮（用户点击=手动激活——D2b）：
 *   按钮经 ai-sensor/request-read 写 job（AI-06 通道）；状态行按需轮询
 *   **ai-sensor/observe**（主控裁决方向 B，2026-08-27：status+per-paper
 *   hasPendingJob/productExists/archivedExists 四事实单次聚合——六态判定
 *   事实单源；STATUS_POLL_MS=5s 仅组件挂载期间=笔记面板打开，ADR §1 门控；
 *   卸载清 interval，INV-14 成对同族；轮询常量 [F-LINT-03] 已抽
 *   shared/ui-constants 与 ZcodeLinkSection 同源）
 * - 「导入 AI 笔记」按钮（done-unimported 态——六态表见 ai-notes-phase.ts）：
 *   调 ai-notes/import（07 目录级全量——幂等使无害）→三桶 toast（imported/
 *   skipped 计数+errors 篇名）→list/observe 刷新（E1 手动激活形态——D2b
 *   手动语义保持）
 * ── 接口层 ──
 * - export function AiNotesStatus(props: { paperId: string; hasNotes: boolean
 *   }): JSX.Element——observe 事实/动作函数经 ai-notes.store 自订阅（F-A3
 *   per-tab 订阅先例同源；宿主已守 paperId 非 null）
 * ── 文化层 ──
 * - 错误：observe 轮询失败=静默重试下一周期（列表型瞬态——不 toast 轰炸；
 *   连续失败 3 次显示离线提示行；status.json 损坏上抛=同计数路径——损坏≠
 *   missing 三态分离在 06 服务）；按钮动作型失败 toast（INV-02 两型分清）
 */
import { useEffect, useRef, useState } from 'react'
import { ApiClientError } from '../../api/client'
import { showToast } from '../../shared/ui/Toast'
import { OP_FAILED, STATUS_POLL_MS } from '../../shared/ui-constants'
import { useAiNotesStore } from './ai-notes.store'
import { derivePhase } from './ai-notes-phase'

/** 连续轮询失败阈值（≥ 此值显示离线提示行） */
const POLL_FAIL_THRESHOLD = 3

export function AiNotesStatus(props: { paperId: string; hasNotes: boolean }): JSX.Element {
  const { paperId, hasNotes } = props
  const facts = useAiNotesStore((s) => s.observeByPaper[paperId])
  const loadObserve = useAiNotesStore((s) => s.loadObserve)
  const requestRead = useAiNotesStore((s) => s.requestRead)
  const importAll = useAiNotesStore((s) => s.importAll)
  const loadNotes = useAiNotesStore((s) => s.loadNotes)

  /** 连续轮询失败计数（ref——不触发重渲染；阈值达标记离线行） */
  const failCount = useRef(0)
  const [offline, setOffline] = useState(false)

  // 门控轮询：挂载/paperId 变化即拉一次+5s interval；卸载/换篇清（INV-14 成对；
  // 原件 paperId null 守卫随 props 契约消解——宿主渲染本件前已守非空，零差）
  useEffect(() => {
    let cancelled = false
    failCount.current = 0
    setOffline(false)
    const run = (): void => {
      loadObserve(paperId)
        .then(() => {
          if (cancelled) return
          failCount.current = 0
          setOffline(false)
        })
        .catch(() => {
          if (cancelled) return
          failCount.current += 1
          if (failCount.current >= POLL_FAIL_THRESHOLD) setOffline(true)
        })
    }
    run()
    const timer = setInterval(run, STATUS_POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [paperId, loadObserve])

  const phase = derivePhase(facts, hasNotes, paperId)
  const busy = phase === 'pending' || phase === 'queued' || phase === 'reading'
  const st = facts?.status ?? null

  let statusText: string | null = null
  if (phase === 'pending') {
    statusText = `已请求 AI 阅读，等待 zcode 拾取…${st !== null ? `（上次状态：${st.state}）` : ''}`
  } else if (phase === 'queued') {
    statusText = st?.currentPaper != null ? 'AI 正在处理队列（当前：他篇）…' : 'AI 正在处理队列…'
  } else if (phase === 'reading') {
    statusText = `AI 正在读本文（${st?.state ?? ''}）`
  } else if (phase === 'done-unimported') {
    statusText = 'AI 已读完，待导入'
  }

  /** 写 job（动作型失败 toast；失败无本地残留态——幂等自愈声明见 store 头注） */
  const onRead = (): void => {
    requestRead(paperId)
      .then(() => loadObserve(paperId).catch(() => undefined))
      .catch((e: unknown) => {
        showToast(e instanceof ApiClientError ? e.message : OP_FAILED, 'error')
      })
  }

  /** 导入（07 目录级全量幂等）→三桶 toast+刷新（imported 瞬时事件→稳态回 idle） */
  const onImport = (): void => {
    importAll()
      .then((res) => {
        const parts = [`导入 ${res.imported.length} 篇`, `跳过 ${res.skipped.length} 篇`]
        if (res.errors.length > 0) {
          parts.push(`失败 ${res.errors.length} 篇（${res.errors.map((e) => e.paperId).join('、')}）`)
        }
        showToast(`AI 笔记导入完成：${parts.join('，')}`, res.errors.length > 0 ? 'error' : 'success')
        void loadNotes(paperId).catch(() => undefined)
        void loadObserve(paperId).catch(() => undefined)
      })
      .catch((e: unknown) => {
        showToast(e instanceof ApiClientError ? e.message : OP_FAILED, 'error')
      })
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={busy}
          className="shrink-0 rounded border px-2 py-0.5 text-xs"
          style={{ borderColor: 'var(--border)', color: busy ? 'var(--text-dim)' : 'var(--accent)' }}
          onClick={onRead}
        >
          AI 读文献
        </button>
        {offline && (
          <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
            AI 状态暂不可用，将继续重试
          </span>
        )}
      </div>
      {statusText !== null && (
        <p className="m-0 text-xs" data-testid="ai-status-line" role="status" style={{ color: 'var(--text-dim)' }}>
          {statusText}
        </p>
      )}
      {phase === 'done-unimported' && (
        <button
          type="button"
          data-action="import"
          className="self-start rounded border px-2 py-0.5 text-xs"
          style={{ borderColor: 'var(--ok)', color: 'var(--ok)' }}
          onClick={onImport}
        >
          导入 AI 笔记
        </button>
      )}
    </>
  )
}
