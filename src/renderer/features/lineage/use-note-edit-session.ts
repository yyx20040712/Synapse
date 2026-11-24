// b3: P7-H
/**
 * [F-VISFB-62] useNoteEditSession —— 悬浮笔记编辑会话 hook（[回炉 W-B2·D-3] 自
 * LineageFloatingNotes 迁出：组件 250 行红线——「提交与关闭解耦」使编辑会话逻辑增行，按本
 * 组件布线 hook 化先例〔useNoteCreateMenu/useNoteDraftRestoreCtl〕拆件；迁入段的注释随代码）。
 *
 * ── 行为面 ──
 * - 恰一编辑会话：editingId/draft 会话态；editingIdRef 现值 ref（S7②：closeEdit 守卫读 ref——
 *   迟到旧闭包 blur 不清新会话）；draftRef 现值 ref（idle 提交句柄经注册族取用）；order=z 序
 *   （末位=DOM 末位=最后交互在上）；layerRef=笔记层（创建即编辑态的 textarea 聚焦查询面）。
 * - 创建即编辑态（textarea 聚焦——effect 时点挂载已落位）。
 * - submitDraft＝正文提交（不含会话关闭）：他径已删→静默不写；空→回收（removeFloatingNote
 *   ——undo 可恢复，61 已锁 undo 族）；未变→零写单元；否则 updateFloatingNote。返回 true=
 *   确实产生了编辑单元（比对 editRevision——editUnit 被闸拒时静默返回，不抛）。
 * - closeEdit＝会话收口单点（R2④ id 守卫读 editingIdRef 现值〔S7②〕）：守卫→清会话态→
 *   submitDraft。守卫＝[F-VISFB-64·轮2] closing gate（冻结期提交会话整体拒绝——保会话+pending；
 *   ②.5 收口经同步豁免域放行）+[回炉 R5] recovery 门（冻结期 blur 提交拒绝——编辑态保留）。
 * - commitActiveEdit＝打断收口共用（R2③：React 不对已卸载节点派发 onBlur——切走丢稿靠本主动
 *   收口而非 blur 兜底〔d1 定谳〕）；commitRef 现值包装（native 监听闭包跨渲染取最新）。
 * - commitDraftKeepOpen（[回炉 W-B2·D-3] §2.5 #5「提交单元」，用户裁决＝甲）：idle 到期的提交
 *   入口——守卫同 closeEdit；空稿不提交（空笔记回收仍由 blur 承接）；提交后不清 editingId/
 *   draft（不关编辑器、不夺焦点——提交与关闭解耦）。idleCommitRef 现值包装供注册族
 *   （useNoteDraftBridge 第 5 注入）取用。
 * - keepOpen（[回炉 W-B2·D-3] 任务书 (b)「提交后随之而来的 saving 窗不得卸载已打开的
 *   textarea」）：idle 提交产生编辑单元时置位，saving 窗结束复位——这一段 saving 窗内已开
 *   编辑会话的 textarea 不让位（组件按 keepOpen 判在场）。由其他写触发的 saving 窗保持 R4
 *   「saving 让位」（textarea 卸载、草稿驻组件态、saving 结束回挂——既有合约 T4/T5）——
 *   输入法合成期除外（[回炉 W-B4·R1]，见下条）。
 *   keepOpen 窗内 textarea 在场＝可失焦：closeEdit 在本会话 IO 在途（flushing）时不收口——
 *   此刻提交会被同会话 saving 锁静默拒，先清会话态会丢掉窗内续写的正文；保会话+pending，由
 *   idle 到期（重排）或链落定后的下一次 blur/打断收口承接。
 * - 输入法合成（[回炉 W-B4·R1] 用户裁决 2026-11-24：悬浮笔记 idle 提交对齐阅读器文本单元
 *   〔reader-text-unit「组词期不收口」〕——合成期不提交、compositionend 后重新计时 1.5s，
 *   片段不进编辑单元、不写库、不进恢复副本）：
 *   · 状态＝composeBase（compositionstart 时刻的草稿＝组词前值；null＝非合成期）驻本会话；
 *     composing＝composeBase!==null；settledText（提交安全文本）＝合成期取组词前值、否则取
 *     draft——草稿快照的唯一读点（组件把它传给 useNoteDraftBridge：片段不改快照，恢复副本
 *     与 idle 重排都不由片段触发）。
 *   · commitDraftKeepOpen 在合成期返回 false（不读草稿、不提交）——lane 的 idle 到期按既有
 *     「提交被拒＝重排」承接；合成结束后由草稿变更沿重新计时。
 *   · 复位点四条：compositionend；非合成输入（onChange 且 nativeEvent.isComposing===false
 *     ——compositionend 漏发的自愈，isComposing 为 undefined 时不动）；closeEdit 入口（blur
 *     与全部打断收口——id 守卫之后、flushing 早退之前）；编辑器节点不在场（组件判定——
 *     textarea 卸载后浏览器已终止合成，React 不对已卸载节点派发事件）。
 *   · 合成期 saving 窗 textarea 不让位（组件判据 ∨ composing——卸载会打断合成）；合成结束
 *     即恢复 R4 让位。合成期的 blur／打断收口／离开页面仍提交 draft 实际值（既有语义）。
 *   · 合成期收口（blur 与打断收口，都经 closeEdit）：提交的是 draft 实际值，快照却还按组词
 *     前值驻留——清会话态之前先把快照对齐到提交值。useNoteDraftBridge 的残留再水化效应以
 *     「正文＝快照 text」甄别「本帧刚收口」，不对齐会把它当成未收口残留、以组词前值复活编辑器。
 *   · 与阅读器的差异：不在 compositionend 切历史项——仍到下一次提交（idle 到期或收口）才成
 *     一个编辑单元，一次停顿内的多次组词合并为一步撤销。
 *
 * ── 接口层 ── export function useNoteEditSession(contentRef): NoteEditSession
 *
 * ── 架构层 ── 零 store 新面（useLineageStore.getState() 单口）；本件只管编辑会话态与提交，
 * 交互门（模式/工具/IO 在途/恢复门）由组件判定。对草稿注册族（lineage-note-draft）只有一处写入
 * ——合成期收口帧的快照对齐（setNoteDraftSnapshot）；该件不静态 import 本件，无环。
 */
import { useCallback, useEffect, useRef, useState, type MutableRefObject, type RefObject } from 'react'
import type { FloatingNote } from '@shared/models/lineage'
import { useLineageStore } from './lineage.store'
import { lineageIoInFlight } from './lineage-session-model'
import { quitWriteBlocked } from '../../app/quit-closing-gate'
import { recoveryBlocked } from './recoveryScheduler'
import { setNoteDraftSnapshot } from './lineage-note-draft'
import { clampToContent, NOTE_H, NOTE_W } from './lineage-note-geom'

export interface NoteEditSession {
  /** 渲染序=z 序 */
  order: string[]
  raise(id: string): void
  editingId: string | null
  setEditingId(id: string | null): void
  draft: string
  setDraft(text: string): void
  layerRef: MutableRefObject<HTMLDivElement | null>
  /** 创建（打断收口在先〔R2③〕；右键点 own 坐标+钳制；拒绝域=不进编辑态） */
  createNoteAt(ownPt: { x: number; y: number }): void
  /** 开新会话（R2② 本笔记编辑态内 pointerdown 不重置 draft；R2③ 先收口旧会话） */
  beginEdit(n: FloatingNote): void
  /** 会话收口单点（提交并关闭） */
  closeEdit(id: string, value: string): void
  /** 打断收口共用 */
  commitActiveEdit(): void
  /** 收口句柄现值包装（native 监听/注册族取用） */
  commitRef: RefObject<() => void>
  /** [回炉 W-B2·D-3] idle 提交句柄现值包装（注册族取用） */
  idleCommitRef: RefObject<() => boolean>
  /** [回炉 W-B2·D-3] 自身 idle 提交随之而来的 saving 窗在场标记（见头注 keepOpen） */
  keepOpen: boolean
  /** [回炉 W-B4·R1] 输入法合成期标记（compositionstart 起到复位点止——见头注「输入法合成」） */
  composing: boolean
  /** [回炉 W-B4·R1] 提交安全文本——草稿快照的唯一读点：合成期＝组词前值，其余＝draft */
  settledText: string
  /** [回炉 W-B4·R1] 合成开始（textarea compositionstart）：记组词前值 */
  composeStart(): void
  /** [回炉 W-B4·R1] 合成状态复位（compositionend／非合成输入自愈／closeEdit 入口／编辑器不在场共用） */
  resetCompose(): void
}

/** 提交守卫（closeEdit 与 idle 提交共用，会话 id 现值由调用方比对）：closing gate + recovery 门 */
const submitAllowed = (): boolean => !quitWriteBlocked() && !recoveryBlocked()

export function useNoteEditSession(contentRef: RefObject<HTMLDivElement | null>): NoteEditSession {
  const [order, setOrder] = useState<string[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const layerRef = useRef<HTMLDivElement | null>(null)
  // [S7②] 编辑会话 id 现值 ref（closeEdit 守卫读 ref——迟到旧闭包 blur 不清新会话）
  const editingIdRef = useRef<string | null>(null)
  editingIdRef.current = editingId
  // [回炉 W-B2·D-3] 草稿现值 ref（idle 提交由注册族句柄触发——取最新会话的草稿）
  const draftRef = useRef('')
  draftRef.current = draft

  // 创建即编辑态（textarea 聚焦——effect 时点挂载已落位）
  useEffect(() => {
    if (editingId === null) return
    const ta = layerRef.current?.querySelector<HTMLTextAreaElement>(
      `.tl-note[data-note-id="${editingId}"] textarea`
    )
    ta?.focus()
  }, [editingId])

  const raise = (id: string): void => {
    setOrder((prev) => (prev[prev.length - 1] === id ? prev : [...prev.filter((x) => x !== id), id]))
  }

  /** 创建（打断收口在先〔R2③〕；右键点 own 坐标+钳制；拒绝域=不进编辑态） */
  const createNoteAt = (ownPt: { x: number; y: number }): void => {
    commitActiveEdit()
    const before = useLineageStore.getState().floatingNotes.length
    const p = clampToContent(contentRef, ownPt, NOTE_W, NOTE_H)
    useLineageStore.getState().addFloatingNote(p.x, p.y, '')
    const after = useLineageStore.getState().floatingNotes
    if (after.length === before) return
    const created = after[after.length - 1]!
    raise(created.id)
    setEditingId(created.id)
    setDraft('')
  }

  /** 开新会话（R2② 本笔记编辑态内 pointerdown 不重置 draft；R2③ 先收口旧会话） */
  const beginEdit = (n: FloatingNote): void => {
    if (editingId === n.id) return
    commitActiveEdit()
    setEditingId(n.id)
    setDraft(n.content)
  }

  // [回炉 W-B2·D-3] 自身 idle 提交后的 saving 窗：已开编辑会话不让位（任务书 (b)）；窗结束即复位
  const [keepOpen, setKeepOpen] = useState(false)
  const saving = useLineageStore(lineageIoInFlight)
  useEffect(() => {
    if (!saving) setKeepOpen(false)
  }, [saving])

  // [回炉 W-B4·R1] 输入法合成状态（驻编辑会话）：composeBase=compositionstart 时刻的草稿（组词前值）；
  // null=非合成期。只由 composeStart／resetCompose 两个写点迁移。composingRef 现值 ref 供 idle 提交
  // 守卫（计时器到期在 React 渲染之外触发——与 draftRef 同一渲染赋值，守卫读到的标记与草稿恒属同一次渲染）
  const [composeBase, setComposeBase] = useState<string | null>(null)
  const composing = composeBase !== null
  const composingRef = useRef(false)
  composingRef.current = composing
  /** [回炉 W-B4·R1] 合成开始：记组词前值。取 draftRef 现值——合成事件的状态更新可能晚于紧随其后的
   *  首个 input 落地（React 对 composition 事件按连续事件优先级调度），组词前值须在处理器内取定，
   *  不能到渲染期再读（那时草稿可能已是片段） */
  const composeStart = useCallback((): void => {
    setComposeBase(draftRef.current)
  }, [])
  /** [回炉 W-B4·R1] 合成状态复位（四个复位点共用——见头注「输入法合成」） */
  const resetCompose = useCallback((): void => {
    setComposeBase(null)
  }, [])
  /** [回炉 W-B4·R1] 提交安全文本（草稿快照的唯一读点）：合成期（composeBase 非空）=组词前值——片段不进
   *  快照、恢复副本与编辑单元；其余=草稿现值 */
  const settledText = composeBase ?? draft

  /** 正文提交（不含会话关闭）：他径已删→静默不写；空→回收；未变→零写；否则 updateFloatingNote。
   *  返回 true=确实产生了编辑单元（editUnit 被闸拒时静默返回——以 editRevision 前进为准） */
  const submitDraft = (id: string, value: string): boolean => {
    const store = useLineageStore.getState()
    const n = store.floatingNotes.find((f) => f.id === id)
    if (n === undefined) return false
    const revision = store.editRevision
    if (value === '') {
      store.removeFloatingNote(id)
    } else if (value !== n.content) {
      store.updateFloatingNote(id, { content: value })
    } else {
      return false // 内容未变不提交（零写单元）
    }
    return useLineageStore.getState().editRevision !== revision
  }

  /** 会话收口单点（R2④ id 守卫读 editingIdRef 现值〔S7②〕：迟到旧闭包 blur
   *  不清新会话；空→回收；未变→零写；他径已删→静默出编辑态）。
   *  [F-VISFB-64·轮2] closing gate：冻结期提交会话整体拒绝（保会话+pending）；②.5 收口经同步豁免域放行。
   *  [回炉 R5] recovery 门同款（冻结期 blur 提交拒绝——编辑态保留） */
  const closeEdit = (id: string, value: string): void => {
    if (editingIdRef.current !== id) return
    // [回炉 W-B4·R1 / 复审 review4 阻断修复] blur 时合成必已结束或即将结束：先复位合成状态，且早于全部
    // 早退（closing/recovery 门拒与 flushing 早退）——被拒而不收口的 blur 同样终止合成，复位放任一早退
    // 之后都会让标记滞留（门冻结期 idle 提交一直被拒，解冻后真稿永不提交）。位于 id 守卫之后：迟到旧闭包
    // blur 不得复位新会话进行中的合成。合成标记先取到局部量——resetCompose 的更新到下一次渲染才落到现值 ref
    const composingAtClose = composingRef.current
    resetCompose()
    // [F-VISFB-64·轮2] closing gate 与 [回炉 R5] recovery 门：冻结期提交会话整体拒绝（保会话+pending）
    if (!submitAllowed()) return
    // [回炉 W-B2·D-3] 本会话 IO 在途（flushing）：blur 不收口——提交会被同会话 saving 锁静默拒，
    // 先清会话态会丢窗内续写的正文（见头注 keepOpen）；保会话+pending 待链落定后收口
    if (useLineageStore.getState().flushing) return
    // [回炉 W-B4·R1] 合成期收口：快照此前按组词前值驻留（片段不进快照），而这里提交的是 draft 实际值
    // ——清会话态之前先把快照对齐到提交值。本帧的残留再水化效应（useNoteDraftBridge）以「正文＝快照
    // text」甄别「本帧刚收口」与「未收口残留」；不对齐则已提交的收口被误判为残留，以组词前值复活编辑器
    if (composingAtClose) setNoteDraftSnapshot({ noteId: id, text: value })
    setEditingId(null)
    setDraft('')
    submitDraft(id, value)
  }

  /** 打断收口共用（React 不对已卸载节点派发 onBlur——切走丢稿靠本主动收口
   *  而非 blur 兜底〔d1 定谳〕） */
  const commitActiveEdit = (): void => {
    if (editingId === null) return
    closeEdit(editingId, draft)
  }
  // [R2③] 打断收口 ref（native 监听闭包跨渲染取最新会话收口函数）
  const commitRef = useRef<() => void>(() => undefined)
  commitRef.current = commitActiveEdit

  /** [回炉 W-B2·D-3] idle 提交：提交正文但不关编辑器（不夺焦点）。空稿不提交——空笔记回收
   *  仍由 blur 承接；守卫同 closeEdit（closing/recovery 冻结期不提交——调用方重排待解冻）；
   *  [回炉 W-B4·R1] 输入法合成期不提交（见头注「输入法合成」） */
  const commitDraftKeepOpen = (): boolean => {
    const id = editingIdRef.current
    if (id === null || !submitAllowed()) return false
    // [回炉 W-B4·R1] 输入法合成期不提交：片段不是定案文本，不落库——返回 false，lane 的 idle 到期按既有
    // 「提交被拒＝重排」承接；compositionend 后草稿变更沿重新计时，到期提交终值
    if (composingRef.current) return false
    const value = draftRef.current
    if (value === '') return false
    const applied = submitDraft(id, value)
    if (applied) setKeepOpen(true) // 随之而来的 saving 窗不卸载 textarea
    return applied
  }
  const idleCommitRef = useRef<() => boolean>(() => false)
  idleCommitRef.current = commitDraftKeepOpen

  return {
    order, raise, editingId, setEditingId, draft, setDraft, layerRef, createNoteAt, beginEdit, closeEdit, commitActiveEdit,
    commitRef, idleCommitRef, keepOpen, composing, settledText, composeStart, resetCompose
  }
}
