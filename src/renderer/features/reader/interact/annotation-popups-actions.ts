/**
 * [F-VISFB-15] annotation-popups-actions（[B4-A R1] lane 化） —— 弹层 busy 族动作域 hook。
 *
 * ── 行为层（B4-A R1：写经 per-tab lane 串行链——§4.3「busy 等待、值复判与删除
 *   补偿迁移到链任务结果，不另建第二条直接 API 写路」）──
 * - autosaveComment（文本单元写）/deleteAnnotation：liveness
 *   预判→**单次入链**→链任务内运行时复判（排队期间目标已删→判废零写；值已由
 *   前序写落库→lastPersisted+store 现值双证短路返回 true）。busy=链任务体置位/
 *   复位（旧 busyFlightRef 等待窗由 lane 排队替代——W-A 正/反向与 busy-1/2/A6/R2
 *   观测终态不变）。单层入链契约：autosaveComment 由文本控制器在链外调用
 *   （timer/blur/flush 普通写），自身入链一次。
 * - [B4-A 回炉 R5] 裸写体 autosaveCommentRaw/writeCommentRaw（文本 undo/redo 的
 *   预 flush/反向写）：**不自行入链**——控制器把 history 命令做成复合链任务（起步
 *   即入链占位），任务体内直调本件裸写体；任务体内再入链=循环等待。反向写沿
 *   touch（免会话：不新建操作项——既有语义不变）；操作层 history 命令的预 flush 同体
 *   直调 autosaveCommentRaw（[回炉三 A]）。[回炉三 B] 反向写失败不置 tab IO 错误旗标
 *   （反向值不本地应用=无未落库修改；置位即定稿恒失败、关闭重试恒 no-op），专用文案 toast 可见。
 * - 操作层记账（§4.2 合并会话）：文本单元写与手动保存成功→recordCommentEdit
 *   （同标注会话已开只推进 after，否则建 comment-edit：before=本次写前 store
 *   现值）；文本反向写→touchCommentEditAfter（不新建操作项）。会话随 blur/
 *   编辑目标切换终止（endEditSession——其后新输入开新操作项）。
 * - editRevision 语义（§2.2「每次用户新编辑/undo/redo 同步递增」）：只认用户编辑
 *   动作——文本输入由控制器 onUserEdit 在输入刻置 U（#1）、删除成功=操作单元提交
 *   （#2）。文本写的落库回显是既有编辑的入库，不递增 revision：否则「批注输入后
 *   不等空闲直接显式保存」必被自身写回推进 revision，finalize 永远清不了灰点。
 * - 迟到回显寻址（§2.5 #19）：update/remove 写标注归属的原 tab（store 按
 *   paperId/标注 id 寻址），不读 activeId——await 窗内切 tab 时回执仍归原篇。
 * - 冻结门（deleteAnnotation 用户命令入口）：全局 quit 门 + 目标 tab
 *   关闭在途门（tab-closing-gate，§2.5 #2「命令通过 gate」）；autosave/raw 不闸
 *   （单元/收口驱动，非用户命令入口）。
 * - 删除：成功即该标注文本 target 代际失效（§4.2）+push delete 项。删除失败
 *   补偿（③）与墓碑/代际守卫原样保留。
 * - [F-VISFB-12] W1 零写/W2 迟到判废/W3 等值清/TABS-03 两写面语句零变。
 *
 * ── 接口层 ──
 * - export function useAnnotationPopupActions(args): AnnotationPopupActions
 *   （autosaveComment/autosaveCommentRaw/writeCommentRaw/
 *   deleteAnnotation/endEditSession）
 */
import { useRef } from 'react'
import { api, unwrap, ApiClientError } from '../../../api/client'
import { showToast } from '../../../shared/ui/Toast'
import { enqueueTabTask } from '../../../shared/tab-write-lane'
import {
  endCommentEditSession,
  pushUndo,
  recordCommentEdit,
  touchCommentEditAfter
} from '../state/annotation-undo'
import { invalidateAnnotationText } from '../state/reader-history-commands'
import { useReaderStore } from '../state/reader.store'
import {
  annotationDraftSaved,
  annotationWriteGen,
  discardAnnotationDraft,
  isAnnotationWriteLive,
  markAnnotationDeleted,
  saveAnnotationDraft,
  takeAnnotationDraft
} from './annotation-draft-registry'
import { quitWriteBlocked } from '../../../app/quit-closing-gate'
import { tabWriteBlocked } from '../state/tab-closing-gate'
import type { Annotation } from '@shared/models/annotation'

const UPDATE_FAILED = '标注保存失败'
/** [B4-A 回炉三 B] 文本 undo/redo 反向写失败（总评宿主 ReaderNotesPanel 同形文案） */
const REVERSE_WRITE_FAILED = '标注保存失败，撤销/重做未生效'
const DELETE_FAILED = '标注删除失败'
const DELETE_CONFIRM = '删除这条标注？'

/** busy 族动作（AnnotationPopups JSX 接线消费） */
export interface AnnotationPopupActions {
  /** 文本单元写（控制器 persist 端口——timer/blur/flush 在链外调用，本件入链一次） */
  autosaveComment(a: Annotation, comment: string): Promise<boolean>
  /** [B4-A 回炉 R5] 文本单元写裸体（控制器 persistRaw 端口——history 命令的预
   *  flush）：仅供控制器链任务体内直调，不自行入链（单层入链契约） */
  autosaveCommentRaw(a: Annotation, comment: string): Promise<boolean>
  /** [B4-A 回炉 R5] 文本 undo/redo 反向写裸体（控制器 historyWriteRaw 端口）：仅供
   *  控制器链任务体内直调，不自行入链；免会话——不新建操作项 */
  writeCommentRaw(a: Annotation, comment: string): Promise<boolean>
  deleteAnnotation(a: Annotation): void
  /** 终止批注编辑合并会话（编辑器 blur——其后新输入开新操作项） */
  endEditSession(paperId: string): void
}

/** 文本写记账方式：session=建/推进合并会话条目；touch=仅推进最近一条的 after */
type WriteTrack = 'session' | 'touch'

export function useAnnotationPopupActions(args: {
  busy: boolean
  setBusy: (v: boolean) => void
  closeEditing: () => void
  closeMenu: () => void
  onChanged: () => void
}): AnnotationPopupActions {
  const { busy, setBusy, closeEditing, closeMenu, onChanged } = args

  // 最近一次成功落盘面（链任务运行时值复判第一证——undo 第二写源在场）
  const lastPersistedRef = useRef<{ id: string; comment: string } | null>(null)

  /** store 现值（undo 链=弹层族外第二写源——查无=不命中走真实写链） */
  function storeAnnotationComment(a: Annotation): string | null {
    const annotations = useReaderStore.getState().tabs?.[a.paperId]?.annotations
    return annotations?.find((x) => x.id === a.id)?.comment ?? null
  }

  /** 本次写前的标注现值（comment-edit 的 before——同标注多会话各取各的基线） */
  function beforeSnapshot(a: Annotation): Annotation {
    return { ...a, comment: storeAnnotationComment(a) ?? a.comment }
  }

  /** 链任务写体（save/autosave/raw 共用）：运行时复判存活+值，真实结果返回 */
  async function writeTask(a: Annotation, comment: string, gen: number, track: WriteTrack): Promise<boolean> {
    setBusy(true)
    try {
      // 运行时复判存活：排队期间目标已删（墓碑/代际变）→判废零写
      if (!isAnnotationWriteLive(a.id, gen)) return false
      // 值复判（链任务运行时——排队期间前序写可能已落同值）：lastPersisted 命中
      // **AND** store 现值等值（双证）→真实结果=已落库，true 零冗余重写
      const persisted = lastPersistedRef.current
      if (persisted !== null && persisted.id === a.id && persisted.comment === comment && storeAnnotationComment(a) === comment) {
        return true
      }
      const next: Annotation = { ...a, comment, updatedAt: new Date().toISOString() }
      // 写前快照须先于 store 回写取（comment-edit 的 before=本次写前的标注现值）
      const before = beforeSnapshot(a)
      const saved = await unwrap(api.reader.updateAnnotation({ annotation: next }))
      // W2：迟到写判废——删除发起后代际已变，零 store 同步零记账（防复活）
      if (!isAnnotationWriteLive(a.id, gen)) return false
      // 回显写标注归属的原 tab（不读 activeId——§2.5 #19；store 按 paperId 寻址）
      useReaderStore.getState().updateAnnotation(saved)
      if (track === 'session') {
        // comment-edit 条目随落库建立/推进；U/revision 已在输入刻置位（控制器
        // onUserEdit），写回不递增 revision
        recordCommentEdit(a.paperId, before, saved)
      } else touchCommentEditAfter(a.paperId, a.id, saved)
      // W3：成功等值清注册表条目（后台立存落库后不留过期恢复面）
      annotationDraftSaved(a.id, comment)
      useReaderStore.getState().clearTabDirty(a.paperId)
      lastPersistedRef.current = { id: a.id, comment }
      return true
    } catch (e) {
      // 保存失败：tab IO 错误旗标置位（TABS-03 两写面之一）。反向写（touch）失败不置位：
      // 反向值不本地应用、无未落库修改可重试（notes.store.historyWriteNow「有待写才置」同义）
      if (track !== 'touch') useReaderStore.getState().markTabDirty(a.paperId)
      showToast(track === 'touch' ? REVERSE_WRITE_FAILED : e instanceof ApiClientError ? e.message : UPDATE_FAILED, 'error')
      return false
    } finally {
      setBusy(false)
    }
  }

  /** 文本单元写：链任务+运行时复判，不收层不 onChanged */
  function autosaveComment(a: Annotation, comment: string): Promise<boolean> {
    const gen = annotationWriteGen(a.id)
    if (!isAnnotationWriteLive(a.id, gen)) return Promise.resolve(false)
    return enqueueTabTask(a.paperId, () => writeTask(a, comment, gen, 'session'))
  }

  /** 文本单元写裸体（控制器 history 复合任务体内直调——[回炉 R5]）：运行时复判同上 */
  function autosaveCommentRaw(a: Annotation, comment: string): Promise<boolean> {
    const gen = annotationWriteGen(a.id)
    if (!isAnnotationWriteLive(a.id, gen)) return Promise.resolve(false)
    return writeTask(a, comment, gen, 'session')
  }

  /** 文本反向写裸体（undo/redo 通道——控制器 history 复合任务体内直调，[回炉 R5]）：
   *  落库；该标注最近一条 comment-edit 仅推进 after */
  function writeCommentRaw(a: Annotation, comment: string): Promise<boolean> {
    const gen = annotationWriteGen(a.id)
    if (!isAnnotationWriteLive(a.id, gen)) return Promise.resolve(false)
    return writeTask(a, comment, gen, 'touch')
  }

  /** 删除：confirm 确认 → 链任务 → store 同步 → 收起（菜单/编辑器一并）。 */
  async function deleteAnnotation(a: Annotation): Promise<void> {
    if (quitWriteBlocked() || tabWriteBlocked(a.paperId)) return
    if (busy || !window.confirm(DELETE_CONFIRM)) return
    // ③出表前快照：api 失败分支回填恢复面（编辑器挂载期草稿在控制器自持→null 零回填面）
    const snapshot = takeAnnotationDraft(a.id)
    // delete 项载荷=删除前的标注现值（含本编辑会话已落库的批注——undo 重建不丢）；
    // 须先于 store 移除取（移除后 store 现值查无，会回退到挂载时的陈旧对象）
    const deleted = beforeSnapshot(a)
    // 删除发起即收口：草稿出注册表+写代际自增（此后到达的在途写判废）
    discardAnnotationDraft(a.id)
    await enqueueTabTask(a.paperId, async () => {
      setBusy(true)
      try {
        await unwrap(api.reader.deleteAnnotation({ annotationId: a.id }))
        // R7：删除成功打墓碑——save 拒入/take 恒 null/写全判废
        markAnnotationDeleted(a.id)
        // 删除回显写标注归属的原 tab（不读 activeId——§2.5 #19；store 按 id 定位）
        useReaderStore.getState().removeAnnotation(a.id)
        pushUndo(a.paperId, { kind: 'delete', annotation: deleted })
        // [B4-A R2 §2.5 #2] 操作单元成功提交（delete）=新编辑事件：U=1
        useReaderStore.getState().markTabUnfinalized(a.paperId)
        // 删除使该标注文本 target 代际失效（§4.2——旧文本 past/future 不再可撤）
        invalidateAnnotationText(a.paperId, a.id)
        useReaderStore.getState().clearTabDirty(a.paperId)
        closeEditing()
        closeMenu()
        onChanged()
      } catch (e) {
        // ③删除失败补偿：快照回填（仅墓碑未打路径——恢复面不丢）
        if (snapshot !== null) {
          saveAnnotationDraft(a.id, snapshot.comment, snapshot.failed)
        }
        useReaderStore.getState().markTabDirty(a.paperId)
        showToast(e instanceof ApiClientError ? e.message : DELETE_FAILED, 'error')
      } finally {
        setBusy(false)
      }
    })
  }

  return {
    autosaveComment,
    autosaveCommentRaw,
    writeCommentRaw,
    deleteAnnotation,
    endEditSession: endCommentEditSession
  }
}
