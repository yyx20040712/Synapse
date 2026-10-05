// b3: P7-C
/**
 * [SR2-C-03] ReaderNotesPanel —— 阅读器笔记面板（α 双层，工单：done / strong）
 *
 * ── 行为层 ──
 * - α 双层落地面（B3 裁决 1：片段层=标注锚定+总评层=论文级综述，迁移阅读器
 *   侧栏修复可发现性）：
 *   · 总评层：textarea（notes.store.load/edit/saveSoon 消费——**五模块
 *     编辑元数据结构与 ADR-0008 裁决不动，不坍缩不新增维度**）；本组件与库侧
 *     NotesPanel 同语义：挂载/paperId 变化即 load（动作型失败 toast+载入重试）；
 *     迟到失败比对 paperIdRef 丢弃；保存状态四态消费 deriveSaveStatus
 *     （renderer/shared/save-status.ts——单一推导点；〔B3〕detectSaveFailed
 *     周期判定随组件层判定退役，纯函数留驻由锁定测试锚定）
 *   · 片段层：FragmentNotesList（sortByDocumentOrder=C-01 单源序；单击→
 *     onLocate 上抛——定位语义归 C-05；highlightAnnotationId 高亮滚动=C-05
 *     标注单击反向同步消费面）
 * - per-tab 语义（U2 教训——不新增状态机）：草稿态住 notes.store.noteByPaper
 *   （按 paperId 键控，切 tab 不失忆）；组件随 active tab 换 paperId 触发 load
 *   （五模块合并保护既有：pendingEdit 路径保用户字段——U2/A4 锁定用例覆盖）；
 *   面板本地态仅 loadFailed 一布尔；**error 态判定入 store（[F-UIRES-03 B3]
 *   NoteDraft.saveFailed——四态钮/重试单源；组件层周期判定 detectSaveFailed
 *   退役——双源风险消除，纯函数本身留驻 save-status.ts 由锁定测试锚定）**
 * - notes 面 dirty 投影（TABS-03 既有）零改动——pending 语义自动覆盖本编辑面
 * - [F-UIRES-03 B3] 四态保存主动作钮（INV-106；钮与状态文字合一——四态唯一
 *   指示面，避免「已保存」双元素 e2e strict 冲突）：dirty=primary「保存」可点
 *   /saving=禁用 spinner「保存中」/clean=灰暗禁用「已保存」/error=danger 红描边
 *   「重试」可点；点击=saveNow（清防抖+立即落盘）；状态推导仍走 deriveSaveStatus
 *   单一推导点（钮文案=推导结果的本地映射）。[RR1 k1-W3] 状态播报通道=钮
 *   aria-live=polite（原 role=status span 随合一退役——四态迁移与钮文案一一
 *   对应，文本变化即 AT 播报；spinner 符号 aria-hidden 不入播报文本）；
 *   [RR1 k1-N2] error 态无障碍名 RETRY_A11Y=可见文字「重试」开头形
 *   （WCAG 2.5.3 label-in-name，失败原因随播报）
 * - [F-UIRES-03 B3] 卸载面：paperId 变化（切文献）或组件卸载（切 aside 栏/切
 *   视图）→ flush(paperId)（在途完成后 pending 立即落盘/error 立即重试一次/
 *   普遍 dirty 由模块级 timer 通道承接）；应用退出无 renderer 预卸载事件——
 *   quit-dirty 拦截族（INV-22）为退出通道
 * - [A2 F-CONTRACTA-01 2026-10-04] note.title 停用：标题输入框退役为静态
 *   「全文笔记」节标（样式落位归 B 批；noteSave 载荷/编辑域随之单字段化）
 * - [F-UIRES-03 B2] AI 面分节（P7-G 预留位曾兑现的分节挂载）随阅读器
 *   左栏 AI 区整删退役——显示面唯一=脉络详情面板「AI 评估与建议」节（INV-105）
 * - 设计事实两条（r2 审计 W1/W2 裁决存档）：①加载中不禁用输入（NotesPanel 同
 *   语义既有裁决——store 编辑期保护兜底：发起后的 edit 不被响应覆盖）；②本
 *   面板仅挂载于 active tab 视图（P7-B 单视图渲染模型——无隐藏 tab 挂载，
 *   annotations props 与 useActiveTab 同源无错位）
 *
 * ── 接口层 ──
 * - export function ReaderNotesPanel(props: { annotations: Annotation[];
 *     onLocate(annotationId: string): void; highlightAnnotationId?: string | null
 *   }): JSX.Element
 * - paperId 经 useActiveTab 自取（挂 active tab 视图内——props 不传 paperId 防双源）
 *
 * ── 架构层 ──
 * - reader feature；import notes/notes.store 经 check-quality.mjs 白名单
 *   （tab-dirty.ts 同型先例——notes.store 不迁不动，归属 notes 域维持）
 *
 * ── 生命周期层 ──
 * - 不做：Markdown 预览（负面清单）；片段层行内编辑（批注写面唯一=标注菜单）
 *
 * ── 文化层 ──
 * - 组件级测试 tests/unit/renderer/reader-notes-panel.test.tsx：总评层载入/失败
 *   重试/编辑 pending 镜像/防抖保存四态/换 tab 不失忆；片段层序消费/单击/空态/
 *   高亮滚动；[B2] AI 节退役负锚。textarea 焦点原生 undo=既有 keymap editable
 *   避让（P7-A 已锚）
 * - 组件 ≤250 行（两层拆 FragmentNotesList 守恒）
 */
import { useEffect, useRef, useState } from 'react'
import { ApiClientError } from '../../../api/client'
import { showToast } from '../../../shared/ui/Toast'
import { RetryButton } from '../../../shared/ui/RetryButton'
import { Button } from '../../../shared/ui/Button'
import { deriveSaveStatus } from '../../../shared/save-status'
import type { Annotation } from '@shared/models/annotation'
import { useNotesStore } from '../../notes/notes.store'
import { FragmentNotesList } from './FragmentNotesList'
import { useActiveTab } from '../state/useActiveTab'

/** 意外异常（非 ApiClientError）时的兜底中文消息 */
const LOAD_FAILED = '笔记加载失败'

/** [RR1 k1-N2] error 态无障碍名单源（title/aria-label 同源喂——可见文字
 * 「重试」开头形：WCAG 2.5.3 label-in-name；兼保存失败原因随 aria-label 播报） */
const RETRY_A11Y = '重试——上次保存失败'

export function ReaderNotesPanel(props: {
  annotations: Annotation[]
  onLocate(annotationId: string): void
  highlightAnnotationId?: string | null
}): JSX.Element {
  const { annotations, onLocate, highlightAnnotationId = null } = props
  const tab = useActiveTab()
  const paperId = tab?.paperId ?? null

  const entry = useNotesStore((s) => (paperId === null ? undefined : s.noteByPaper[paperId]))
  const load = useNotesStore((s) => s.load)
  const edit = useNotesStore((s) => s.edit)
  const saveSoon = useNotesStore((s) => s.saveSoon)
  const saveNow = useNotesStore((s) => s.saveNow)
  const flush = useNotesStore((s) => s.flush)

  const [loadFailed, setLoadFailed] = useState(false)
  const saving = entry?.saving ?? false
  const pending = entry?.pending ?? false
  // [B3] error 态单源=store 镜像（组件层周期判定退役——双源风险消除）
  const saveFailed = entry?.saveFailed ?? false
  // 最新 paperId（迟到回调比对）：面板随 active tab 换文献时旧请求失败不得作用
  const paperIdRef = useRef(paperId)
  paperIdRef.current = paperId

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

  // [B3 卸载面] paperId 变化（切文献）或组件卸载（切 aside 栏/切视图）时收口：
  // 在途完成后 pending 立即落盘 / error 立即重试一次（fire-and-forget——模块级
  // timer 与在途闭包不随组件消亡，落盘通道恒在）
  useEffect(() => {
    if (paperId === null) return
    return () => {
      void flush(paperId)
    }
  }, [paperId, flush])

  /** 编辑入口：写 store 草稿（pending 镜像随 edit 置 true；error 随 edit 清）+重排防抖自动保存 */
  const onEdit = (patch: { contentMd?: string }): void => {
    if (paperId === null) return
    edit(paperId, patch)
    saveSoon(paperId)
  }

  if (paperId === null) {
    return (
      <p className="p-2 text-xs" style={{ color: 'var(--text-dim)' }}>
        从文献库打开一篇文献后可写笔记
      </p>
    )
  }

  const status = deriveSaveStatus(saving, saveFailed, pending)
  const inputStyle = { borderColor: 'var(--border)', background: 'var(--panel)' }
  // [B3] 四态钮（INV-106）：dirty=primary「保存」可点/saving=禁用 spinner「保存中」
  // /clean=灰暗禁用「已保存」/error=danger 红描边「重试」可点——钮面文字即四态
  // 唯一指示（与状态文字合一；e2e getByText('已保存') 锚由钮面承载）
  const saveLabel = saving ? '保存中' : status === '未保存' ? '保存' : status === '保存失败' ? '重试' : '已保存'

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 p-2 text-sm" data-testid="reader-notes-panel">
      <div className="flex items-center gap-2">
        {/* [A2 F-CONTRACTA-01] 标题输入框退役——静态「全文笔记」节标（样式归 B 批） */}
        <span className="min-w-0 flex-1 truncate text-sm font-medium" style={{ color: 'var(--text-dim)' }}>
          全文笔记
        </span>
        {entry !== undefined && (
          <Button
            variant={status === '未保存' ? 'primary' : status === '保存失败' ? 'danger' : 'secondary'}
            size="sm"
            className="shrink-0"
            loading={saving}
            disabled={status === '已保存'}
            title={status === '保存失败' ? RETRY_A11Y : saving ? '保存中' : status === '未保存' ? '立即保存' : '已保存'}
            ariaLabel={status === '保存失败' ? RETRY_A11Y : undefined}
            ariaLive="polite"
            onClick={() => {
              if (paperId !== null) saveNow(paperId)
            }}
          >
            {saveLabel}
          </Button>
        )}
      </div>
      <div className="relative min-h-0 flex-1 basis-24">
        <textarea
          aria-label="笔记正文"
          className="syn-input h-full w-full resize-none rounded border p-2 font-mono text-sm"
          style={inputStyle}
          value={entry?.contentMd ?? ''}
          disabled={loadFailed}
          onChange={(e) => onEdit({ contentMd: e.target.value })}
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
      {/* [F-UIRES-03 B2] AI 面分节随阅读器左栏 AI 区整删退役（INV-105——
          AI 评估语料渲染显示面唯一=脉络详情面板「AI 评估与建议」节） */}
    </div>
  )
}
