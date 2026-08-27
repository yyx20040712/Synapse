// b3: P7-G
/**
 * AiNotesSection —— 笔记面板 AI 面（分节+状态行+按钮，
 * 工单：open / strong）
 *
 * ── 行为层 ──
 * - 并入 ReaderNotesPanel 下部分节（C-03 预留位）；面板 props 不动——本组件
 *   经 useActiveTab 自取 paperId（同 C-03 防双源）
 * - 分节显示（ADR-0015 §3 N2 渲染面）：role 分组（一读/二读/裁决——
 *   AiNoteGroupList+ai-note-style 单源）×组内 question 条目；条目=锚定段
 *   引用块+content_md 纯文本（textarea 级呈现——负面清单红线，md 不渲染只
 *   展示）；**只读**——零写路径（INV-19，v1 无编辑/删除）
 * - 「AI 正在读」状态行+「AI 读文献」按钮（用户点击=手动激活——D2b）：
 *   按钮经 ai-sensor/request-read 写 job（AI-06 通道）；状态行按需轮询
 *   **ai-sensor/observe**（主控裁决方向 B，2026-08-27：status+per-paper
 *   hasPendingJob/productExists/archivedExists 四事实单次聚合——六态判定
 *   事实单源；STATUS_POLL_MS=5s 仅组件挂载期间=笔记面板打开，ADR §1 门控；
 *   卸载清 interval，INV-14 成对同族）
 * - **状态行状态机**（宪法状态机前置；观测=observe 四事实 per 当前篇 P；
 *   「AI 读文献」按钮行常驻本节头部（首次使用入口不悬空）；imported 非稳态
 *   移出（瞬时事件：导入完成→toast+list 刷新→稳态回 idle）：
 *
 *   | 态 | 触发事实（observe 输出） | 呈现 |
 *   | --- | --- | --- |
 *   | hidden | 无 job(P)+无未导入产物+无 DB 数据 | 仅按钮行（无状态行无分节） |
 *   | idle | 同 hidden 触发面但有 DB 数据（含已导入稳态） | 按钮行+分节（无状态行） |
 *   | pending | hasPendingJob(P) 且心跳不新鲜 | 「已请求 AI 阅读，等待 zcode 拾取…（上次状态：<state 自述>，可缺省）」 |
 *   | queued | hasPendingJob(P) 且心跳新鲜且 currentPaper≠P 或 =null | 「AI 正在处理队列（当前：他篇）…」；currentPaper=null 时无他篇名 |
 *   | reading | 心跳新鲜且 currentPaper=P | 「AI 正在读本文（state 自述文本）」 |
 *   | done-unimported | productExists(P) 且 !archivedExists(P) 且 job(P) 无 | 「AI 已读完，待导入」+「导入 AI 笔记」按钮 |
 *
 *   按钮禁用枚举：disabled=pending/queued/reading 三态（06 服务幂等为兜底，
 *   UI 禁用防误解双保险）；enabled=hidden/idle/done-unimported。
 *   跨格序列①~⑤见头注工单面（单测①③⑤已用例化；queued 经①的他篇路径）。
 * - 「导入 AI 笔记」按钮（done-unimported 态）：调 ai-notes/import（07 目录
 *   级全量——幂等使无害）→三桶 toast（imported/skipped 计数+errors 篇名）
 *   →list/observe 刷新（E1 手动激活形态——D2b 手动语义保持）
 * - 条目单击→locateAnchor（INV-20 单入口消费方）。**exact 层接缝声明
 *   （门一 W08-3 处置）**：exact 层滚动+闪烁现绑 [data-annotation-id]（AI
 *   条目无 annotationId）——exact 完整化=AI-09 交付 data-ai-note-id 渲染
 *   节点+anchor-locate 延展；09 落地前单击 exact 目标缺失→anchor-locate
 *   既有行为页级停驻（分步兑现，不另写降级）
 * - 轮询常量 STATUS_POLL_MS=5s 为本组件域私有（Rule of Three 第 2 次保持
 *   重复；第 3 处出现时抽 shared）
 *
 * ── 接口层 ──
 * - export function AiNotesSection(props: { highlightAiNoteId?: string | null }): JSX.Element
 * - 交付面：ai-note-style.ts+ai-notes.store.ts（AI 笔记数据+观测事实单源，
 *   **writeStatusProtocol 失败面幂等自愈声明见该 store 头注**）+本组件
 *   +AiNoteGroupList+ReaderNotesPanel 挂载一行
 * - 数据单源接缝声明：ai-notes/list 取数+导入后刷新=store 单点；AI-09 渲染
 *   层经宿主订阅同 store 消费——禁 09 双取（双向锚定：store 头注+本行）
 *
 * ── 架构层 ──
 * - renderer/features/reader 域；依赖 window.api（observe/request-read/
 *   import/list）+locateAnchor（C-05）+toast 惯例（INV-02 动作型）；
 *   notes.store 零触碰（AI 数据面全归 ai-notes.store）
 *
 * ── 生命周期层 ──
 * - 预留：分节折叠记忆（v1 不做）；divergence 独立组（v1 随裁决组呈现）
 * - 不做：AI 笔记编辑/删除（INV-19 只读）；md 渲染；自动导入（手动按钮保持
 *   D2b 手动激活语义）
 *
 * ── 文化层 ──
 * - 错误：observe 轮询失败=静默重试下一周期（列表型瞬态——不 toast 轰炸；
 *   连续失败 3 次显示离线提示行；status.json 损坏上抛=同计数路径——损坏≠
 *   missing 三态分离在 06 服务）；按钮动作型失败 toast（INV-02 两型分清）
 * - 测试：tests/unit/renderer/ai-notes-section.test.tsx + ai-note-style.test.ts
 *   +e2e ai-notes-section.spec.ts（均受锁，always-active）
 */
import { useEffect, useRef, useState } from 'react'
import { ApiClientError } from '../../api/client'
import { showToast } from '../../shared/ui/Toast'
import { locateAnchor } from './anchor-locate'
import { AiNoteGroupList } from './AiNoteGroupList'
import { useAiNotesStore } from './ai-notes.store'
import { useActiveTab } from './useActiveTab'
import type { ObserveRes } from '@shared/ipc/schemas'
import type { AiNote } from '@shared/models/ai-note'

/** 轮询周期（组件域私有——头注行为层声明） */
const STATUS_POLL_MS = 5000
/** 连续轮询失败阈值（≥ 此值显示离线提示行） */
const POLL_FAIL_THRESHOLD = 3
/** 意外异常（非 ApiClientError）时的兜底中文消息 */
const ACTION_FAILED = '操作失败'

type Phase = 'hidden' | 'idle' | 'pending' | 'queued' | 'reading' | 'done-unimported'
/** 空数组稳定引用（selector 快照引用稳定——防 useSyncExternalStore 无限重渲染） */
const EMPTY_NOTES: AiNote[] = []
/** 六态推导（判定事实=observe 四事实单源；跨格序列①~⑤由轮询/动作驱动态迁移） */
function derivePhase(facts: ObserveRes | null | undefined, hasNotes: boolean, paperId: string): Phase {
  if (facts === null || facts === undefined) return hasNotes ? 'idle' : 'hidden'
  const st = facts.status
  if (st !== null && st.running && st.currentPaper === paperId) return 'reading'
  if (facts.hasPendingJob) return st !== null && st.running ? 'queued' : 'pending'
  if (facts.productExists && !facts.archivedExists) return 'done-unimported'
  return hasNotes ? 'idle' : 'hidden'
}

export function AiNotesSection(props: { highlightAiNoteId?: string | null }): JSX.Element {
  const { highlightAiNoteId = null } = props
  const tab = useActiveTab()
  const paperId = tab?.paperId ?? null

  const notes = useAiNotesStore((s) => (paperId === null ? EMPTY_NOTES : s.notesByPaper[paperId] ?? EMPTY_NOTES))
  const facts = useAiNotesStore((s) => (paperId === null ? undefined : s.observeByPaper[paperId]))
  const loadNotes = useAiNotesStore((s) => s.loadNotes)
  const loadObserve = useAiNotesStore((s) => s.loadObserve)
  const requestRead = useAiNotesStore((s) => s.requestRead)
  const importAll = useAiNotesStore((s) => s.importAll)

  /** 连续轮询失败计数（ref——不触发重渲染；阈值达标记离线行） */
  const failCount = useRef(0)
  const [offline, setOffline] = useState(false)

  // 门控轮询：挂载/paperId 变化即拉一次+5s interval；卸载/换篇清（INV-14 成对）
  useEffect(() => {
    if (paperId === null) return
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

  // 分节数据（列表型失败静默——离线行不覆盖 DB 取数面）
  useEffect(() => {
    if (paperId !== null) void loadNotes(paperId).catch(() => undefined)
  }, [paperId, loadNotes])

  if (paperId === null) return <></>

  const phase = derivePhase(facts, notes.length > 0, paperId)
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
        showToast(e instanceof ApiClientError ? e.message : ACTION_FAILED, 'error')
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
        showToast(e instanceof ApiClientError ? e.message : ACTION_FAILED, 'error')
      })
  }

  /** 条目单击→locateAnchor（INV-20 单入口；anchorPage 1 基→0 基页） */
  const onLocateNote = (n: AiNote): void => {
    void locateAnchor({
      paperId: n.paperId,
      anchor: {
        quoteText: n.quoteText,
        prefixText: n.prefixText,
        suffixText: n.suffixText,
        anchorPage: n.anchorPage === null ? undefined : n.anchorPage - 1
      }
    })
  }

  return (
    <section
      data-testid="ai-notes-section"
      className="mt-1 flex flex-col gap-1 border-t pt-1"
      style={{ borderColor: 'var(--border)' }}
    >
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
      {notes.length > 0 && phase !== 'hidden' && (
        <AiNoteGroupList notes={notes} onLocate={onLocateNote} highlightAiNoteId={highlightAiNoteId} />
      )}
    </section>
  )
}
