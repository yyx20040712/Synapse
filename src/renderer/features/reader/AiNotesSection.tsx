// b3: P7-G
/**
 * AiNotesSection —— 笔记面板 AI 面（分节+状态行+按钮，
 * 工单：open / strong）
 *
 * ── 行为层 ──
 * - 并入 ReaderNotesPanel 下部分节（C-03 预留位）；面板 props 不动——本组件
 *   经 useActiveTab 自取 paperId（同 C-03 防双源）
 * - 分节显示（ADR-0015 §3 N2 渲染面）：question 分组（七问+分歧报告独立
 *   组——呈现轴转置 2026-08-28 缺陷 F，AiNoteGroupList+ai-note-style 单源）
 *   ×组内条目按 role 分段标注（一审/二审/裁决）；条目=锚定段引用块+content_md
 *   纯文本（textarea 级呈现，md 不渲染——负面清单红线）；**只读**零写路径（INV-19）
 * - 状态行+「AI 读文献」按钮块职责归 AiNotesStatus.tsx（STATUS_POLL_MS=5s
 *   挂载期门控轮询+observe 四事实六态判定呈现+「导入 AI 笔记」按钮三桶
 *   toast；derivePhase 纯函数+六态表单源驻 ai-notes-phase.ts——本件分节
 *   可见性条件 phase!=='hidden' 经 import 消费；[F-SPLIT-01] 自本件拆出
 *   2026-09-05，语句零改：六态表/按钮禁用枚举/跨格序列①~⑤详述归该件头注）
 * - 条目单击→locateAnchor（INV-20 单入口消费方）。**exact 层接缝声明
 *   （门一 W08-3 处置——AI-09 已兑现）**：本节随锚传 aiNoteId→exact 层滚动
 *   闪烁 [data-ai-note-id] 渲染节点（AiAnnotationLayer 交付）——anchor-locate
 *   延展仅扩 exact 层目标识别面，三防线结构不动
 *
 * ── 接口层 ──
 * - export function AiNotesSection(props: { highlightAiNoteId?: string | null }): JSX.Element
 * - 交付面：ai-note-style.ts+ai-notes.store.ts（AI 笔记数据+观测事实单源，
 *   **writeStatusProtocol 失败面幂等自愈声明见该 store 头注**）+本组件
 *   +AiNoteGroupList+AiNotesStatus+ReaderNotesPanel 挂载一行
 * - 数据单源接缝声明：ai-notes/list 取数+导入后刷新=store 单点；AI-09 渲染
 *   层经宿主订阅同 store 消费——禁 09 双取（双向锚定：store 头注+本行）
 *
 * ── 架构层 ──
 * - renderer/features/reader 域；依赖 window.api（observe/request-read/
 *   import/list）+locateAnchor（C-05）+toast 惯例（INV-02 动作型）；
 *   notes.store 零触碰（AI 数据面全归 ai-notes.store）
 *
 * ── 生命周期层 ──
 * - 预留：分节折叠记忆（v1 不做）；divergence 独立组已随呈现轴转置兑现
 * - 不做：AI 笔记编辑/删除（INV-19 只读）；md 渲染；自动导入（手动按钮保持
 *   D2b 手动激活语义）
 *
 * ── 文化层 ──
 * - 错误：observe 轮询失败=静默重试下一周期（列表型瞬态——不 toast 轰炸；
 *   连续失败 3 次显示离线提示行——随 AiNotesStatus；status.json 损坏上抛=
 *   同计数路径——损坏≠missing 三态分离在 06 服务）；按钮动作型失败 toast
 *   （INV-02 两型分清）
 * - 测试：tests/unit/renderer/ai-notes-section.test.tsx + ai-note-style.test.ts
 *   +e2e ai-notes-section.spec.ts（均受锁，always-active）
 */
import { useEffect } from 'react'
import { locateAnchor } from './anchor-locate'
import { AiNoteGroupList } from './AiNoteGroupList'
import { AiNotesStatus } from './AiNotesStatus'
import { derivePhase } from './state/ai-notes-phase'
import { useAiNotesStore } from './state/ai-notes.store'
import { useActiveTab } from './state/useActiveTab'
import type { AiNote } from '@shared/models/ai-note'

/** 空数组稳定引用（selector 快照引用稳定——防 useSyncExternalStore 无限重渲染） */
const EMPTY_NOTES: AiNote[] = []

export function AiNotesSection(props: { highlightAiNoteId?: string | null }): JSX.Element {
  const { highlightAiNoteId = null } = props
  const tab = useActiveTab()
  const paperId = tab?.paperId ?? null

  const notes = useAiNotesStore((s) => (paperId === null ? EMPTY_NOTES : s.notesByPaper[paperId] ?? EMPTY_NOTES))
  const facts = useAiNotesStore((s) => (paperId === null ? undefined : s.observeByPaper[paperId]))
  const loadNotes = useAiNotesStore((s) => s.loadNotes)

  // 分节数据（列表型失败静默——离线行不覆盖 DB 取数面）
  useEffect(() => {
    if (paperId !== null) void loadNotes(paperId).catch(() => undefined)
  }, [paperId, loadNotes])

  if (paperId === null) return <></>

  // 分节可见性口径（六态单源在 ai-notes-phase.ts（derivePhase）——hasNotes 事实同帧）
  const phase = derivePhase(facts, notes.length > 0, paperId)

  /** 条目单击→locateAnchor（INV-20 单入口；anchorPage 1 基→0 基页；
   *  aiNoteId=exact 层滚动锚（AI-09 交付 data-ai-note-id 渲染节点+延展兑现） */
  const onLocateNote = (n: AiNote): void => {
    void locateAnchor({
      paperId: n.paperId,
      anchor: {
        quoteText: n.quoteText,
        prefixText: n.prefixText,
        suffixText: n.suffixText,
        anchorPage: n.anchorPage === null ? undefined : n.anchorPage - 1
      },
      aiNoteId: n.id
    })
  }

  return (
    <section
      data-testid="ai-notes-section"
      className="mt-1 flex flex-col gap-1 border-t pt-1"
      style={{ borderColor: 'var(--border)' }}
    >
      <AiNotesStatus paperId={paperId} hasNotes={notes.length > 0} />
      {notes.length > 0 && phase !== 'hidden' && (
        <AiNoteGroupList notes={notes} onLocate={onLocateNote} highlightAiNoteId={highlightAiNoteId} />
      )}
    </section>
  )
}
