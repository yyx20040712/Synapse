// b3: P7-H
/**
 * [F-VISFB-62] LineageFloatingNotes —— 画布悬浮笔记 UI 消费面（.tl-content
 * 内挂层——LineageTimeline 装配，随 zoom.contentStyle transform 缩放）。
 * store 三动作=lineage-note-ops 域件（①段拆件）；本组件零 store 新面
 * （useLineageStore.getState() 单口）。
 *
 * ── 行为面（交互门=edit 模式+select 工具；几何/门域辅助=lineage-note-geom）──
 * - 创建：右键空白（.tl-content contextmenu——事件目标不在卡〔.tl-card〕/
 *   边命中层〔.tl-edge-hit(s)〕/笔记〔.tl-note〕上）→单项锚定菜单「新建
 *   悬浮笔记」→点击以**右键点** own 坐标调 addFloatingNote(x,y,'')；创建即
 *   进编辑态（textarea 聚焦）；flushing 域拒绝=不进编辑态（不误认他笔记）。
 * - 拖动：笔记上方书签/装订符号专用柄（tips 式——2026-10-17 用户裁决：非
 *   正文区自由拖）——会话机制=use-note-drag.ts（live!==start 才提交，
 *   44 号零位移先例）。
 * - 编辑：textarea 受控（宪法禁富文本）；blur 提交 update(id,{content})；
 *   内容未变不提交（零写单元）；**空内容失焦→removeFloatingNote(id)**（空
 *   笔记回收——undo 可恢复，61 已锁 undo 族）。
 * - 删除：笔记右键→菜单「删除笔记」→removeFloatingNote(id)（无确认框——
 *   undo 承载）。
 * - browse/focus=只读显示（可见不可写：无 grip/textarea+inline
 *   pointer-events none）；tool≠select（画线 armed）同法让位画线。
 * - z 序：点击/指针按下笔记→置顶（order 局部序——DOM 末位=最后交互在上）。
 * - 菜单=LineageNoteMenu（portal 出 .tl-content——EdgeMenuHost 先例）。
 * [回炉轮 1] R2 恰一编辑会话+本笔记态内 pointerdown 不重置 draft+打断（点
 * 他笔记·开菜单·拖柄·创建）先按 editingId 收口旧会话（React 不对已卸载
 * 节点派发 onBlur——主动收口承载）+id 守卫；R3 异步落点写前核在场；R4
 * saving 让位；R5 textarea 右键原生放行；R6 y 下限=柄高（grip inline 直注
 * ——CSS 变量法因 C-4c 悬空锚弃用，geom 常量单源）。
 * [回炉轮 2] S1① 在飞菜单随 saving 关闭（effect 清态）；S4 textarea
 * onPointerDown stopPropagation（React 链隔离）；S7② closeEdit 守卫改
 * editingIdRef 现值；菜单 portal 装配迁 LineageNoteMenuPortal（行数红线）。
 * [回炉 W-B2·D-3] 编辑会话逻辑迁 use-note-edit-session（布线 hook 化）；提交与关闭解耦：
 * idle 到期经 commitDraftKeepOpen 提交正文不关编辑器——该提交随之而来的 saving 窗内已开编辑
 * 会话的 textarea 不让位（keepOpen）；其他写触发的 saving 窗与全部新交互保持 saving 闸不变
 * （R4/INV-149）。
 * [回炉 W-B4·R1] 输入法合成期（用户裁决 2026-11-24）：idle 提交不提交、compositionend 后重新
 * 计时，片段不进快照／恢复副本／编辑单元——状态与守卫驻 use-note-edit-session；本件只接线：
 * textarea 的 compositionstart／compositionend、快照读点改传 settledText、非合成输入自愈、
 * 合成期 saving 窗 textarea 不让位（其余 saving 窗保持 R4 让位）、编辑器节点不在场时复位。 */
import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent, type RefObject } from 'react'
import { useLineageStore } from './lineage.store'
import { lineageIoInFlight } from './lineage-session-model'
import { useLineageViewStore } from './lineage-view.store'
import { NOTE_GRIP_H, NOTE_H, NOTE_W } from './lineage-note-geom'
import { useNoteDrag } from './use-note-drag'
import { useNoteDraftBridge } from './lineage-note-draft'
import { useNoteEditSession } from './use-note-edit-session'
import { useNoteCreateMenu } from './use-note-create-menu'
import { useNoteDraftRestoreCtl } from './use-note-draft-restore-ctl'
import { quitWriteBlocked } from '../../app/quit-closing-gate'
import { recoveryBlocked, subscribeRecoveryState } from './recoveryScheduler'
import { LineageNoteMenuPortal, type NoteMenu } from './LineageNoteMenu'

export function LineageFloatingNotes(props: {
  contentRef: RefObject<HTMLDivElement | null>
}): JSX.Element {
  const { contentRef } = props
  const notes = useLineageStore((s) => s.floatingNotes)
  const mode = useLineageViewStore((s) => s.mode)
  const tool = useLineageViewStore((s) => s.tool)
  // [R4] saving 窗口让位（画线 armed 同法）；[B4 L1 INV-149/W2] 判据=活动会话 IO 在途
  const saving = useLineageStore(lineageIoInFlight)
  // [回炉 R5] recovery 门挂 interactive（ws-entry 屏障/确认条冻结期不开编辑器
  // ——已开会话让位只读、组件态保留：解冻后重现，不静默丢）
  // [回炉 W-B2·D-3] sessionOpen=模式/工具/恢复门（不含 IO 在途）——已开编辑会话的基础在场条件；
  // saving 窗是否让位按 keepOpen 与输入法合成期（[回炉 W-B4·R1]）分流（见下）。interactive 另含 !saving：开编辑/创建/拖柄/菜单等
  // 新交互的 saving 闸不变（INV-149）
  const sessionOpen = mode === 'edit' && tool === 'select' && !recoveryBlocked()
  const interactive = sessionOpen && !saving
  // [S1①] saving 进入=关停在飞菜单（两态清态——防 saving 结束后陈菜单复活）
  useEffect(() => {
    if (saving) setMenu(null)
  }, [saving])
  // [回炉 R5] 门变化沿重渲染：interactive 读调度器模块态（非 React 态）——
  // 无订阅则开闸后闭包滞旧（点击落旧 interactive=false）——沿订阅强制刷新
  const [, setGateTick] = useState(0)
  useEffect(() => subscribeRecoveryState(() => setGateTick((t) => t + 1)), [])
  const [menu, setMenu] = useState<NoteMenu | null>(null)
  const { drag, onGripDown } = useNoteDrag(contentRef)
  // [F-VISFB-62] 编辑会话（恰一会话/打断收口/id 守卫/创建即编辑态——[回炉 W-B2·D-3] 迁
  // use-note-edit-session：布线 hook 化，行为注释随代码）
  const {
    order, raise, editingId, setEditingId, draft, setDraft, layerRef, keepOpen,
    composing, settledText, composeStart, resetCompose,
    createNoteAt, beginEdit, closeEdit, commitActiveEdit, commitRef, idleCommitRef
  } = useNoteEditSession(contentRef)
  // 右键空白→创建菜单（[F-VISFB-65 拆件] use-note-create-menu——纯移动零语义改）
  useNoteCreateMenu(contentRef, commitRef, setMenu)

  // [F-VISFB-65] 恢复再水化控制面（拆件 use-note-draft-restore-ctl——§5/N-06）
  const restoreCtl = useNoteDraftRestoreCtl(contentRef, setEditingId, setDraft, raise)
  // [F-VISFB-63] 编辑草稿注册族桥接（flush 句柄+pending 信号+内容快照+恢复
  // 再水化——体驻 lineage-note-draft.ts：组件行数红线贴线，布线 hook 化）
  // [回炉 W-B4·R1] 快照读提交安全文本 settledText（合成期=组词前值——片段不进快照、不进恢复副本）
  useNoteDraftBridge(commitRef, editingId, settledText, restoreCtl, idleCommitRef)

  // 渲染序=z 序（order 末位=DOM 末位=最上；未交互笔记承 store 数组序在前）
  const display = useMemo(() => {
    const known = new Set(order)
    return [...notes.filter((n) => !known.has(n.id)), ...order.flatMap((id) => notes.filter((n) => n.id === id))]
  }, [notes, order])

  // [回炉 W-B2·D-3] 编辑中的笔记的编辑会话在场且模式/工具/恢复门放行；saving 窗只在「自身 idle
  // 提交随之而来」的那一段不让位（keepOpen）——其余 saving 窗保持 R4 让位（textarea 卸载）
  // [回炉 W-B4·R1] 第二个不让位条件=输入法合成期（卸载会打断合成）；合成结束即恢复 R4 让位。
  // 各笔记的 editOpen 与下面的复位效应共用这一式
  const editorPresent = sessionOpen && (!saving || keepOpen || composing) && notes.some((n) => n.id === editingId)
  // [回炉 W-B4·R1] 编辑器节点不在场（模式/工具/恢复门让位、笔记离图）=浏览器已终止合成，且
  // compositionend 不再到达（React 不对已卸载节点派发事件）→ 复位：此后草稿按 draft 实际值
  // 进快照并照常 idle 提交
  useEffect(() => {
    if (!editorPresent) resetCompose()
  }, [editorPresent, resetCompose])

  return (
    <>
      {/* [R6] 柄高单源=geom NOTE_GRIP_H（grip inline 直注——见头注） */}
      <div className="tl-notes-layer" ref={layerRef}>
        {display.map((n) => {
          const draggingThis = drag !== null && drag.id === n.id
          const pos = draggingThis ? drag!.live : { x: n.x, y: n.y }
          const editOpen = editorPresent && editingId === n.id
          return (
            <div
              key={n.id}
              className="tl-note"
              data-note-id={n.id}
              style={{
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                width: NOTE_W,
                minHeight: NOTE_H,
                pointerEvents: interactive || editOpen ? undefined : 'none'
              }}
              onPointerDown={(e) => {
                raise(n.id)
                if (!interactive || e.button !== 0 || drag !== null) return
                beginEdit(n)
              }}
              onContextMenu={(e: ReactMouseEvent) => {
                if (!interactive) return
                // [R5] 编辑态 textarea 上右键=原生菜单放行（剪切/复制/粘贴）
                if ((e.target as HTMLElement).closest('textarea') !== null) return
                e.preventDefault()
                // [R2③/R3] 开删除菜单前先收口编辑态（空稿收口=remove 在先）
                commitActiveEdit()
                setMenu({ kind: 'delete', id: n.id, anchor: { x: e.clientX, y: e.clientY } })
              }}
            >
              {interactive && (
                <div
                  className="tl-note-grip"
                  title="拖动笔记"
                  style={{ top: -NOTE_GRIP_H, height: NOTE_GRIP_H }}
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    raise(n.id)
                    // [R2③] 拖柄打断编辑会话——先收口（空稿回收后在场核拦会话）
                    commitActiveEdit()
                    onGripDown(n, e)
                  }}
                />
              )}
              {editOpen ? (
                <textarea
                  className="tl-note-input"
                  value={draft}
                  title="输入笔记内容（空内容失焦自动回收）"
                  onPointerDown={(e) => {
                    // [S4] 正文区点击止于 textarea（不达容器画线处理器——caret 定位不触画线链）
                    e.stopPropagation()
                  }}
                  onChange={(e) => {
                    // [回炉 W-B4·R1] 非合成输入（isComposing=false）而合成状态仍在=compositionend 漏发
                    // 的自愈：复位（快照随即跟随草稿）；isComposing 为 undefined（非 InputEvent）时不动
                    if ((e.nativeEvent as InputEvent).isComposing === false) resetCompose()
                    // [F-VISFB-64·回炉 W2] closing gate：草稿内容写入口（本地态先行于 pending 置真；
                    // ②.5 收口同步域不受影响）；[回炉 R5] recovery 门同款
                    if (quitWriteBlocked() || recoveryBlocked()) return
                    setDraft(e.target.value)
                  }}
                  // [回炉 W-B4·R1] 合成开始记组词前值／合成结束复位（状态机与守卫驻 use-note-edit-session）
                  onCompositionStart={composeStart}
                  onCompositionEnd={resetCompose}
                  onBlur={() => closeEdit(n.id, draft)}
                />
              ) : (
                <div className="tl-note-text">{n.content}</div>
              )}
            </div>
          )
        })}
      </div>
      {/* 菜单 portal 装配=LineageNoteMenuPortal（两态分发+S1① saving 关态）；
          [R3] onRemoveNote 异步落点写前核在场（他径已删=静默丢弃不抛） */}
      {menu !== null && (
        <LineageNoteMenuPortal
          menu={menu}
          onCreateAt={createNoteAt}
          onRemoveNote={(id) => {
            const store = useLineageStore.getState()
            if (store.floatingNotes.some((f) => f.id === id)) store.removeFloatingNote(id)
          }}
          onClose={() => setMenu(null)}
        />
      )}
    </>
  )
}
