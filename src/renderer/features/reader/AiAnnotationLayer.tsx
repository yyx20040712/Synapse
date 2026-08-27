// b3: P7-G
/**
 * AiAnnotationLayer —— AI 标注渲染对等（重锚同管线/存储独立/
 * v1 只读，工单：open / strong）
 *
 * ── 行为层 ──
 * - N2 渲染对等（ADR-0015 §3）：AI 锚定段经 verifyQuote 重锚（annotation-
 *   anchor.ts——**唯一 DOM 遍历点纪律**，C-05 头注先例）取得 rects →
 *   findRangeAtOffset 同几何管线渲染高亮块——**几何对等**=与 AnnotationLayer
 *   同一几何函数族（不另写几何）；分色=ai-note-style 单源（AI-08 交付，
 *   question→QUESTION_COLOR；接缝双向锚定声明见 ai-note-style.ts 头注）
 * - 数据源：aiNotes props（宿主 ReaderPage 订阅 ai-notes.store 分发——数据
 *   单源，本层禁自取）→ 有锚三元组行参与重锚；重锚失败（verifyQuote 假）→
 *   **该段不渲染 rects**（段仍在 08 面板；跳转降级归 INV-20 locateAnchor
 *   三防线，渲染面禁各写降级）；篇级/无锚行（quoteText 空）天然无 rects 不入层；
 *   页过滤=anchorPage（1 基）匹配当前页（缺省不过滤，verifyQuote 兜底）
 * - **存储独立**（INV-19 本单锚定）：数据永不写 annotations 表（props 纯消费，
 *   零 DB/零 IPC——annotations 写面零触碰）；**v1 只读**：无编辑/删除/创建
 *   写路径；点击=高亮该段全部 rects+跳笔记面板对应条目（onJumpToNote 上抛
 *   →宿主经 reader.store.notifyAiNoteHighlight 信号→OutlineAside 切笔记 tab
 *   +highlightAiNoteId 分发 08 面板——C-05 notifyNoteHighlight 同型接线）；
 *   点击**不弹标注菜单**——AI 段无批注语义
 * - 渲染节点带 **data-ai-note-id** 属性（anchor-locate exact 层滚动目标——
 *   本单延展，W08-3 处置对侧已兑现）
 * - 渲染时机：与 AnnotationLayer 同渲染周期（文本层就绪后重锚——挂载/翻页/
 *   缩放跟随既有层节奏；MutationObserver+rAF 合并重算；重锚结果组件本地
 *   缓存按 paperId+页键失效——翻页/换篇即重算）
 *
 * ── 接口层 ──
 * - export function AiAnnotationLayer(props: { aiNotes: AiNote[];
 *     page: number; pageRoot: HTMLElement | null;
 *     onJumpToNote(aiNoteId: string): void }): JSX.Element | null
 *   （page/pageRoot 与 AnnotationLayer 同形——宿主并置分发）
 *
 * ── 架构层 ──
 * - renderer/features/reader 域；依赖 annotation-anchor（verifyQuote/
 *   findRangeAtOffset 纯函数族）+ai-note-style（08 交付）+AiNote 类型
 *   （shared 单源）；**零 DB/零 IPC 直调**（数据经 props——数据单源=ai-notes
 *   .store（AI-08 交付），宿主 ReaderPage 订阅分发，本层禁自取，接缝双向
 *   锚定声明两文件头注）
 *
 * ── 生命周期层 ──
 * - 预留：AI 段显隐开关（工具栏消费面）；rects 缓存失效粒度细化
 * - 不做：AI 段编辑/删除/批注化（INV-19 只读锚定）；annotations 表任何
 *   写（含「AI 段转标注」转换面——如需=P8+ 另裁）；md 渲染
 *
 * ── 文化层 ──
 * - 错误：重锚失败=静默跳过该段渲染（数据本就只读——非错误态不 toast；
 *   「锚定失效」提示归 INV-20 跳转面职责，禁双提示）；层级 IO 零（props
 *   纯消费——无错误面新增）
 * - 测试：tests/unit/renderer/ai-annotation-layer.test.tsx [受锁新增]+
 *   e2e ai-notes-section.spec.ts 扩用例（均 always-active）
 */
import { useEffect, useMemo, useState } from 'react'
import type { AiNote } from '@shared/models/ai-note'
import type { AnnotationRect } from '@shared/models/annotation'
import { findRangeAtOffset, verifyQuote } from './annotation-anchor'
import { QUESTION_COLOR } from './ai-note-style'
import { useAiNotesStore } from './ai-notes.store'
import { useReaderStore } from './reader.store'

/** 重锚后的显示矩形（aiNoteId → rects；重锚失败不落项=该段零 rects） */
type ResolvedRects = Record<string, AnnotationRect[]>

/** 本地重锚缓存（paperId+页键——键变即整体作废重算） */
interface AnchorCache {
  key: string
  rects: ResolvedRects
}

/** 参与重锚的行：有锚引文（篇级/无锚行天然不入层）+页匹配（anchorPage 1 基） */
function anchorableNotes(notes: AiNote[], page: number): AiNote[] {
  return notes.filter(
    (n) => n.quoteText.length > 0 && (n.anchorPage === null || n.anchorPage - 1 === page)
  )
}

export function AiAnnotationLayer(props: {
  aiNotes: AiNote[]
  page: number
  pageRoot: HTMLElement | null
  onJumpToNote(aiNoteId: string): void
}): JSX.Element | null {
  const { aiNotes, page, pageRoot, onJumpToNote } = props
  const [cache, setCache] = useState<AnchorCache>({ key: '', rects: {} })
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // 引用稳定（props 过滤结果 memo——effect 依赖防每渲染重锚循环）
  const pageNotes = useMemo(() => anchorableNotes(aiNotes, page), [aiNotes, page])
  // 缓存键：paperId（行内同篇——取首行）+页；换篇/翻页即失效
  const cacheKey = `${pageNotes[0]?.paperId ?? aiNotes[0]?.paperId ?? ''}:${page}`

  // 文本层就绪后重锚：verifyQuote → findRangeAtOffset（与 AnnotationLayer 同
  // 管线同节奏——MutationObserver+rAF 合并重算；AI 行无存量 rects 可回退，
  // 重锚失败=不渲染该段）
  useEffect(() => {
    if (pageRoot === null) {
      return
    }
    const textLayer = pageRoot.querySelector('.textLayer') as HTMLElement | null
    if (textLayer === null) {
      return
    }
    let scheduled = false
    const resolve = (): void => {
      scheduled = false
      const next: ResolvedRects = {}
      for (const n of pageNotes) {
        const at = verifyQuote(textLayer, {
          prefix: n.prefixText,
          quote: n.quoteText,
          suffix: n.suffixText,
          start: 0
        })
        if (at === null) {
          continue
        }
        const range = findRangeAtOffset(textLayer, at, at + n.quoteText.length)
        if (range !== null && range.rects.length > 0) {
          next[n.id] = range.rects
        }
      }
      setCache({ key: cacheKey, rects: next })
    }
    const schedule = (): void => {
      if (!scheduled) {
        scheduled = true
        requestAnimationFrame(resolve)
      }
    }
    resolve()
    const observer = new MutationObserver(schedule)
    observer.observe(textLayer, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [pageNotes, pageRoot, cacheKey])

  // 键变（翻页/换篇）即弃旧缓存（下轮重锚收敛前不渲染错页 rects）
  const resolved = cache.key === cacheKey ? cache.rects : {}

  return (
    <div
      data-testid="ai-annotation-layer"
      className="absolute inset-0"
      style={{ zIndex: 5, pointerEvents: 'none', mixBlendMode: 'multiply' }}
    >
      {pageNotes.map((n) =>
        (resolved[n.id] ?? []).map((r, i) => (
          <div
            key={`${n.id}:${i}`}
            data-testid="ai-note-rect"
            data-ai-note-id={n.id}
            data-highlight={n.id === selectedId}
            role="button"
            aria-label={`AI 笔记：${n.quoteText}`}
            title={n.contentMd}
            className="absolute"
            style={{
              left: `${r.x * 100}%`,
              top: `${r.y * 100}%`,
              width: `${r.w * 100}%`,
              height: `${r.h * 100}%`,
              background: QUESTION_COLOR[n.question],
              // AI 段半透明+选中描边：与用户标注（不透明）视觉区分，选中=高亮该段全部 rects
              opacity: n.id === selectedId ? 0.8 : 0.45,
              outline: n.id === selectedId ? '1px solid var(--accent)' : undefined,
              pointerEvents: 'auto',
              cursor: 'pointer'
            }}
            onClick={() => {
              setSelectedId(n.id)
              onJumpToNote(n.id)
            }}
          />
        ))
      )}
    </div>
  )
}

/** 空数组稳定引用（selector 快照引用稳定——防每渲染新引用触发重渲染循环） */
const EMPTY_AI_NOTES: AiNote[] = []

/**
 * 宿主装配（AI-09）：ai-notes.store 数据单源订阅（渲染层 props 分发——层内
 * 禁自取）+点击上抛经 reader.store 信号（notifyAiNoteHighlight→OutlineAside
 * 切笔记 tab+highlightAiNoteId 消费——C-05 同型接线，接缝声明两文件头注）。
 * pageRoot=null 时层内各 effect 短路（文本层未就绪不重锚）。
 */
export function ReaderAiLayer(props: { page: number; pageRoot: HTMLElement | null }): JSX.Element {
  const { page, pageRoot } = props
  const paperId = useReaderStore((s) => s.activeId)
  const aiNotes = useAiNotesStore((s) =>
    paperId === null ? EMPTY_AI_NOTES : s.notesByPaper[paperId] ?? EMPTY_AI_NOTES
  )
  return (
    <AiAnnotationLayer
      aiNotes={aiNotes}
      page={page}
      pageRoot={pageRoot}
      onJumpToNote={(aiNoteId) => {
        useReaderStore.getState().notifyAiNoteHighlight(aiNoteId)
      }}
    />
  )
}
