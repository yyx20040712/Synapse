// b3: P7-C
/**
 * [SR2-C-03] ReaderNotesPanel —— 阅读器笔记面板（α 双层，工单：done / strong；
 * [B4-A R1] 总评文本受控历史）
 *
 * ── 行为层 ──
 * - α 双层落地面（B3 裁决 1：片段层=标注锚定+总评层=论文级综述，迁移阅读器
 *   侧栏修复可发现性）：
 *   · 总评层：[B4-A R1 §3/§4.2] 接共享文本控制器 useAnnotationDraft（target=
 *     paper-note——单元边界/文本值历史/undo-redo 与批注 comment 同一套；总评
 *     只有文本值层，不伪造 annotation 操作项）。控制器值每次采用即镜像写回
 *     notes.store 草稿（五模块编辑元数据结构与 ADR-0008 裁决不动）；store 值被
 *     load/合并改写（≠控制器值）即采用为外部值（零历史项跟随）。落库经 notes.store
 *     persistNow/裸写体（[B4-A 回炉 R5] 反向值不预写进草稿——采纳走 mirror 的 persisted 语义）。
 *   · 草稿态住 notes.store.noteByPaper（按 paperId 键控，切 tab 不失忆）；组件
 *     随 active tab 换 paperId：文本控制器按键更换（离场篇先关闭单元并无在途
 *     写时 fire flush——§3 切 tab 行），挂载/换篇即 load（动作型失败 toast+载入
 *     重试；迟到失败按 paperId 现值丢弃）；面板本地态仅 loadFailed；保存状态
 *     四态消费 deriveSaveUiState（renderer/shared/save-status.ts——单一推导点）
 *   · 片段层：FragmentNotesList（C-01 单源序；单击 onLocate/高亮滚动=C-05 消费面）
 * - notes 面 dirty 投影（TABS-03 既有）零改动——pending 语义自动覆盖本编辑面
 * - [B6 F-ANNOSAVE-01] 面内保存钮退役；总评定稿=工具栏保存/Ctrl+S。
 *   本行只保留 IO 态文字反馈。
 * - [A2 F-CONTRACTA-01 2026-10-04] note.title 停用：标题输入框退役为静态
 *   「全文笔记」节标
 * - [B4-A R1 §10.3] textarea 内 ctrl+z/ctrl+y/ctrl+shift+z=文本值层 undo/redo、
 *   ctrl+s=定稿当前 tab（matchTextLayerKey 单源判定；非 editable 焦点走页面级
 *   keymap 的操作层命令）
 *
 * ── 接口层 ──
 * - export function ReaderNotesPanel(props: { annotations: Annotation[];
 *     onLocate(annotationId: string): void; highlightAnnotationId?: string | null
 *   }): JSX.Element
 * - paperId 经 useActiveTab 自取（挂 active tab 视图内——props 不传 paperId 防双源）
 *
 * ── 架构层 ──
 * - reader feature；import notes/notes.store 经 check-quality.mjs 白名单
 *   （tab-dirty 同型先例——notes.store 留驻 notes 域）
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 不做：Markdown 预览；片段层行内编辑（批注写面唯一=标注菜单）
 * - 组件级测试 tests/unit/renderer/reader-notes-panel*.test.tsx、
 *   reader-notes-history.test.tsx；组件 ≤250 行（两层拆 FragmentNotesList 守恒）
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ApiClientError } from '../../../api/client'
import { showToast } from '../../../shared/ui/Toast'
import { RetryButton } from '../../../shared/ui/RetryButton'
import type { Annotation } from '@shared/models/annotation'
import { useNotesStore } from '../../notes/notes.store'
import { FragmentNotesList } from './FragmentNotesList'
import { useActiveTab } from '../state/useActiveTab'
import { useAnnotationDraft } from '../interact/use-annotation-draft'
import { finalizeActiveTab } from '../state/reader-save-coordinator'
import { matchTextLayerKey } from '../view/AnnotationEditorTextarea'
import type { TextTargetKey } from '../state/reader-text-history'

/** 动作型失败文案：加载兜底 / [B4-A 回炉 R5] 文本 undo/redo 反向写失败（错误态仅在有待写草稿时置位） */
const LOAD_FAILED = '笔记加载失败'
const REVERSE_WRITE_FAILED = '笔记保存失败，撤销/重做未生效'

interface NotesPanelProps {
  annotations: Annotation[]
  onLocate(annotationId: string): void
  highlightAnnotationId?: string | null
}

export function ReaderNotesPanel(props: NotesPanelProps): JSX.Element {
  const { annotations, onLocate, highlightAnnotationId = null } = props
  const tab = useActiveTab()
  const paperId = tab?.paperId ?? null

  const entry = useNotesStore((s) => (paperId === null ? undefined : s.noteByPaper[paperId]))
  const load = useNotesStore((s) => s.load)
  const edit = useNotesStore((s) => s.edit)
  const flush = useNotesStore((s) => s.flush)

  const [loadFailed, setLoadFailed] = useState(false)
  // 最新 paperId（迟到回调比对）：面板随 active tab 换文献时旧请求失败不得作用
  const paperIdRef = useRef(paperId)
  paperIdRef.current = paperId

  /** 控制器值→store 草稿镜像（同值零写；按 key 寻址——离场篇的收口写仍落原篇）。
   *  persisted=false=用户新输入（edit 打未保存点）；true=采纳已落库反向值（adoptPersisted） */
  const mirror = (value: string, key: TextTargetKey, persisted: boolean): void => {
    if (useNotesStore.getState().noteByPaper[key.paperId]?.contentMd === value) return
    if (persisted) useNotesStore.getState().adoptPersisted(key.paperId, value)
    else edit(key.paperId, { contentMd: value })
  }

  // 写通道按 key（本控制器 target）寻址：宿主回调不读渲染帧的 paperId
  const draft = useAnnotationDraft(paperId === null ? null : { paperId, kind: 'paper-note' }, entry?.contentMd ?? '', {
    onAutosave: (_value, key) => useNotesStore.getState().persistNow(key.paperId),
    onAutosaveRaw: (_value, key) => useNotesStore.getState().persistNowRaw(key.paperId),
    onHistoryWriteRaw: (value, key) =>
      useNotesStore.getState().historyWriteNow(key.paperId, value).then((ok) => {
        if (!ok) showToast(REVERSE_WRITE_FAILED, 'error')
        return ok
      }),
    mirror,
    closeoutOnUnmount: true,
    initialPersisted: entry?.pending !== true
  })

  // store→控制器：草稿被 load/合并改写（store 值≠控制器值）即采用为外部值
  // （零历史项跟随；pending=未落库——基线未知）
  const storeValue = paperId === null ? undefined : entry?.contentMd
  const storePending = entry?.pending ?? false
  useLayoutEffect(() => {
    if (storeValue !== undefined && storeValue !== draft.comment) {
      draft.syncExternal(storeValue, !storePending)
    }
  }, [storeValue, storePending])

  /** 载入（失败 toast+重试态）；paperId 变化/载入重试共用 */
  const runLoad = (id: string): void => {
    setLoadFailed(false)
    const requestedId = id
    load(id).catch((e: unknown) => {
      if (requestedId !== paperIdRef.current) return // 迟到失败：已切文献，忽略
      setLoadFailed(true)
      showToast(e instanceof ApiClientError ? e.message : LOAD_FAILED, 'error')
    })
  }

  useEffect(() => {
    if (paperId !== null) runLoad(paperId)
  }, [paperId, load])

  // [B3 卸载面] paperId 变化（切文献）或组件卸载时 store 收口：在途完成后 pending
  // 立即落盘 / error 立即重试一次（控制器侧离场关单元+无在途写时立存由挂载绑定
  // 承接——总评 closeoutOnUnmount）
  useEffect(() => {
    if (paperId === null) return
    return () => {
      void flush(paperId)
    }
  }, [paperId, flush])

  if (paperId === null) {
    return (
      <p className="p-2 text-xs" style={{ color: 'var(--text-dim)' }}>
        从文献库打开一篇文献后可写笔记
      </p>
    )
  }

  const inputStyle = { borderColor: 'var(--border)', background: 'var(--panel)' }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 p-2 text-sm" data-testid="reader-notes-panel">
      <div className="flex items-center gap-2">
        {/* [A2 F-CONTRACTA-01] 标题输入框退役——静态「全文笔记」节标（样式归 B 批） */}
        <span className="min-w-0 flex-1 truncate text-sm font-medium" style={{ color: 'var(--text-dim)' }}>
          全文笔记
        </span>
        {/* [B6] 保留 IO 文字反馈；tab 定稿统一走工具栏保存/Ctrl+S */}
        {entry !== undefined && (
          <span aria-live="polite" className="shrink-0 text-xs" style={{ color: 'var(--text-dim)' }}>
            {entry.saving ? '保存中' : entry.saveFailed ? '保存失败' : entry.pending ? '未保存' : '已保存'}
          </span>
        )}
      </div>
      <div className="relative min-h-0 flex-1 basis-24">
        <textarea
          aria-label="笔记正文"
          className="syn-input h-full w-full resize-none rounded border p-2 font-mono text-sm"
          style={inputStyle}
          value={draft.comment}
          disabled={loadFailed}
          onChange={(e) => draft.applyEdit(e.target.value)}
          onCompositionStart={draft.handleCompositionStart}
          onCompositionEnd={draft.handleCompositionEnd}
          onPaste={() => draft.markPaste()}
          onBlur={() => draft.handleBlur()}
          onKeyDown={(e) => {
            // IME 组词期按键不消费（§3 组词期 Ctrl+Z/Y 不拦截）
            if (e.nativeEvent.isComposing) return
            const cmd = matchTextLayerKey(e.nativeEvent)
            if (cmd === null) return
            e.preventDefault()
            if (cmd === 'undo') void draft.undoEdit()
            else if (cmd === 'redo') void draft.redoEdit()
            else void finalizeActiveTab()
          }}
        />
        {entry === undefined && !loadFailed && (
          <span className="pointer-events-none absolute left-[9px] top-[9px] font-mono text-sm" style={{ color: 'var(--text-dim)' }}>
            笔记加载中…
          </span>
        )}
      </div>
      {loadFailed && (
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-dim)' }}>
          <span>{LOAD_FAILED}</span>
          {/* [F-UIRES-02 批 B R2] 文字重试钮→共享 RetryButton */}
          <RetryButton onClick={() => runLoad(paperId)} />
        </div>
      )}
      <div className="flex min-h-0 flex-1 basis-1/2 flex-col gap-1 overflow-auto">
        {/* 节标（R3-RDR 皮肤票：h4 金左缘条+衬线——.rdr-aside-h4；分节结构
            新增不影响既有 testid/aria 断言面） */}
        <h4 className="rdr-aside-h4">片段笔记</h4>
        <FragmentNotesList annotations={annotations} onLocate={onLocate} highlightAnnotationId={highlightAnnotationId} />
      </div>
    </div>
  )
}
