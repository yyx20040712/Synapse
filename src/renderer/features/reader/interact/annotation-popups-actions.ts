/**
 * [F-VISFB-15] annotation-popups-actions —— 弹层 busy 族动作域 hook（自
 * AnnotationPopups 拆出 2026-10-17——组件 250 行关口，先例=use-annotation-draft
 * 自 AnnotationEditor 拆出；组件留 JSX 接线。copyQuote〔菜单 UI 动作，零 busy
 * 面〕留驻组件）。
 *
 * ── 行为层（AnnotationPopups 原 busy 族动作——语义随迁单源驻本件）──
 * - saveComment：api 成功 → store 同步 → pushUndo → 收层 → onChanged 通知
 *   （[F-VISFB-12] W1 零写/W2 迟到判废/W3 等值清+TABS-03 两写面语句零变）。
 * - [F-VISFB-15 ②] autosaveComment busy 返回态收口（票面 busy 清单 1-4 全量）：
 *   旧病=busy 期乐观返回 true——「手动保存在途×失败」「删除在途×失败」两窄窗
 *   草稿 believing-saved（值从未落库+flush 判据 commentRef===lastSavedRef→
 *   no-op 不再重写——丢值窗=直到用户再编辑该草稿）；「quit flush 撞 busy」
 *   句柄终态 'saved' 失真→stillDirty 误判 false→无确认 destroy（丢稿级，
 *   INV-141⑥ 已知残余）；「切目标 fire-first flush 撞 busy」同族。
 *   新语义=busy 在途 **等待 settle 后复判**：
 *   ① settle 信号=busyFlightRef（save/autosave/delete 三链统一登记的共享
 *   在途 promise；finally 只清自己——接力在途不误清）；
 *   ② settle 后复判存活：现取 annotationWriteGen/isAnnotationWriteLive
 *   （删除已成功→墓碑/代际变→零写返回 false，复活防线沿承）；
 *   ③ settle 后复判值（[回炉 R2] 双条件）：lastPersistedRef（本组件最近一次
 *   成功落盘的 {id, comment}）命中同目标同值 **AND** store 现值等值
 *   （storeAnnotationComment——undo 第二写源共证，查无不命中）→真实结果=
 *   已落库，返回 true 零冗余重写（W-A 反向竞态格）；
 *   ④ 未命中→真实写链（busy 置位+登记新在途）返回**真实结果**。
 *   [回炉2 裁决·已知边界申报残余不修] R2 双条件的 µs 级跨链交错窗：undo 的
 *   DB 写与 reader.store apply 之间的微任务间隙（reader.store.ts undo=先
 *   await runUndo 再同步 apply）内恰有等待者 settle 时，store 现值尚未投影
 *   ——共证暂不可见；与 R1 末轮窗同量级以下，申报残余。
 *   约束：等待零新弹窗/toast/用户可见等待（busy=毫秒级串行窗——busy 期按钮
 *   禁用+hook savingRef 串行使等待者至多一，续轮等待有界收敛）；quit 侧在
 *   QUIT_FLUSH_TIMEOUT_MS=5s 预算内。
 * - [F-VISFB-15 ③] 删除失败补偿（W-1 正身）：deleteAnnotation 的
 *   discardAnnotationDraft 出表前快照（take=出表+取值）；api 失败分支回填
 *   （saveAnnotationDraft 恢复——仅墓碑未打路径；成功路径现状零回填）。
 *   编辑器挂载期删除=挂载恢复已消费条目→快照 null 零回填面（草稿在 hook
 *   自持，删除失败编辑器不收层零丢失）；busy-Escape 在途注册面（12 号
 *   回炉轮 1 B-2）与本补偿正交共存。
 * - [F-A11] 自动保存 pushUndo 会话守卫：编辑会话（editing 目标切换）重置——
 *   同一会话内多次自动保存只推一条 comment-edit（before=预编辑快照），避免
 *   灌满 UNDO_DEPTH_MAX=50 全局撤销栈。
 *
 * ── 接口层 ──
 * - export function useAnnotationPopupActions(args): AnnotationPopupActions
 *   （纯函数动作族——无 JSX；closeEditing/closeMenu 结构收层器由组件接线）
 */
import { useEffect, useRef } from 'react'
import { api, unwrap, ApiClientError } from '../../../api/client'
import { showToast } from '../../../shared/ui/Toast'
import { pushUndo } from '../state/annotation-undo'
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
import type { Annotation } from '@shared/models/annotation'

/** 意外异常（非 ApiClientError）时的兜底中文消息 */
const UPDATE_FAILED = '标注保存失败'
const DELETE_FAILED = '标注删除失败'
const DELETE_CONFIRM = '删除这条标注？'

/** busy 族动作（AnnotationPopups JSX 接线消费） */
export interface AnnotationPopupActions {
  saveComment(a: Annotation, comment: string): Promise<void>
  autosaveComment(a: Annotation, comment: string): Promise<boolean>
  deleteAnnotation(a: Annotation): Promise<void>
}

export function useAnnotationPopupActions(args: {
  busy: boolean
  setBusy: (v: boolean) => void
  closeEditing: () => void
  closeMenu: () => void
  onChanged: () => void
  editingId: string | null
}): AnnotationPopupActions {
  const { busy, setBusy, closeEditing, closeMenu, onChanged, editingId } = args

  // [F-A11] pushUndo 会话守卫：编辑目标切换（含 null→目标）重置——同会话单 entry
  const pushedSessionRef = useRef<string | null>(null)
  useEffect(() => {
    if (editingId !== null) {
      pushedSessionRef.current = null
    }
  }, [editingId])

  // [F-VISFB-15 ②] 共享在途动作 promise（settle 信号源）：busy 期 autosave 的
  // 等待对象；runBusyAction 统一登记（finally 只清自己——接力在途不误清）
  const busyFlightRef = useRef<Promise<unknown> | null>(null)
  // [F-VISFB-15 ②] 最近一次成功落盘面（复判值用）：{id, comment}——[回炉 R2]
  // 单条**不足以**证 DB 现值（undo 链=弹层族外第二写源），值复判须 store
  // 现值共证（storeAnnotationComment——查无不命中走真实写链）
  const lastPersistedRef = useRef<{ id: string; comment: string } | null>(null)

  /** busy 动作统一包装：登记在途 promise（settle 后清零） */
  async function runBusyAction<T>(body: () => Promise<T>): Promise<T> {
    const flight = body()
    busyFlightRef.current = flight
    try {
      return await flight
    } finally {
      if (busyFlightRef.current === flight) {
        busyFlightRef.current = null
      }
    }
  }

  /**
   * [回炉 R2] store 现值（tabs→篇→annotations 按 id 匹配项 comment；查无=
   * null）：undo 链（annotation-undo comment-edit 逆操作经 api.reader.
   * updateAnnotation(top.before) 真实落库+store upsert）构成弹层族之外的
   * 第二写源——lastPersistedRef 单条不足以证 DB 现值，值复判须 store 现值
   * 共证（查无=不命中走真实写链，liveness 兜底）。
   */
  function storeAnnotationComment(a: Annotation): string | null {
    const annotations = useReaderStore.getState().tabs[a.paperId]?.annotations
    const hit = annotations?.find((x) => x.id === a.id)
    return hit?.comment ?? null
  }

  /** 批注保存：api 成功 → store 同步 → 收起弹层 → onChanged 通知 */
  async function saveComment(a: Annotation, comment: string): Promise<void> {
    if (busy) {
      return
    }
    // [F-VISFB-12] W1：目标已删零写（删除跳过 flush 面）
    const gen = annotationWriteGen(a.id)
    if (!isAnnotationWriteLive(a.id, gen)) {
      return
    }
    return runBusyAction(async () => {
      setBusy(true)
      try {
        const next: Annotation = { ...a, comment, updatedAt: new Date().toISOString() }
        const saved = await unwrap(api.reader.updateAnnotation({ annotation: next }))
        // [F-VISFB-12] W2：迟到写判废——删除发起后代际已变，零 store 同步（防复活）
        if (!isAnnotationWriteLive(a.id, gen)) {
          return
        }
        useReaderStore.getState().updateAnnotation(saved)
        pushUndo(a.paperId, { kind: 'comment-edit', before: a })
        annotationDraftSaved(a.id, comment)
        useReaderStore.getState().clearTabDirty(a.paperId)
        // [F-VISFB-15 ②] 成功落盘面回填（autosave 等待者复判值用）
        lastPersistedRef.current = { id: a.id, comment }
        closeEditing()
        onChanged()
      } catch (e) {
        // 保存失败：tab 灰点置位（TABS-03 两写面之一）
        useReaderStore.getState().markTabDirty(a.paperId)
        showToast(e instanceof ApiClientError ? e.message : UPDATE_FAILED, 'error')
      } finally {
        setBusy(false)
      }
    })
  }

  /**
   * [F-A11] 自动保存（saveComment 的静默变体）：复用 api 链+store 同步+pushUndo
   * （会话单 entry），不收层不 onChanged。[W-A 门二] busy 毫秒级串行互斥沿承
   * （autosave 在途置 busy→按钮禁用）；[F-VISFB-15 ②] busy 返回态收口：撞
   * busy 不再乐观 true——等待 settle 后复判（存活/值）再走真实写链返回真实
   * 结果（头注行为层②节态表）。
   */
  async function autosaveComment(a: Annotation, comment: string): Promise<boolean> {
    // [F-VISFB-15 ②] busy 在途：等待 settle 后复判（乐观 true 收口——窄窗
    // believing-saved 丢值：手动保存在途×失败/删除在途×失败/quit·切目标
    // flush 撞 busy 全族由此承接收口）
    while (busyFlightRef.current !== null) {
      const inflight = busyFlightRef.current
      await inflight.then(() => undefined, () => undefined)
      // settle 后复判存活（现取代际）：删除已成功（墓碑/代际变）→零写 false
      if (!isAnnotationWriteLive(a.id, annotationWriteGen(a.id))) {
        return false
      }
      // settle 后复判值（[回炉 R2] 双条件）：lastPersisted 命中 **AND** store
      // 现值等值（undo 第二写源否决单条命中——查无=不命中）→真实结果=已落库，
      // true 零冗余重写
      const persisted = lastPersistedRef.current
      if (
        persisted !== null &&
        persisted.id === a.id &&
        persisted.comment === comment &&
        storeAnnotationComment(a) === comment
      ) {
        return true
      }
    }
    // [F-VISFB-12] W1：目标已删零写（复判后现取——等待窗内目标可能已死）
    const gen = annotationWriteGen(a.id)
    if (!isAnnotationWriteLive(a.id, gen)) {
      return false
    }
    return runBusyAction(async () => {
      setBusy(true)
      try {
        const next: Annotation = { ...a, comment, updatedAt: new Date().toISOString() }
        const saved = await unwrap(api.reader.updateAnnotation({ annotation: next }))
        // [F-VISFB-12] W2：迟到写判废——删除发起后代际已变，零 store 同步零 pushUndo（防复活）
        if (!isAnnotationWriteLive(a.id, gen)) {
          return false
        }
        useReaderStore.getState().updateAnnotation(saved)
        if (pushedSessionRef.current !== a.id) {
          pushUndo(a.paperId, { kind: 'comment-edit', before: a })
          pushedSessionRef.current = a.id
        }
        // [F-VISFB-12] W3：成功等值清注册表条目（后台立存落库后不留过期恢复面）
        annotationDraftSaved(a.id, comment)
        useReaderStore.getState().clearTabDirty(a.paperId)
        // [F-VISFB-15 ②] 成功落盘面回填（后续等待者复判值用）
        lastPersistedRef.current = { id: a.id, comment }
        return true
      } catch (e) {
        useReaderStore.getState().markTabDirty(a.paperId)
        showToast(e instanceof ApiClientError ? e.message : UPDATE_FAILED, 'error')
        return false
      } finally {
        setBusy(false)
      }
    })
  }

  /** 删除：confirm 确认 → api → store 同步 → 收起（菜单/编辑器一并）→ onChanged */
  async function deleteAnnotation(a: Annotation): Promise<void> {
    if (busy || !window.confirm(DELETE_CONFIRM)) {
      return
    }
    // [F-VISFB-15 ③] 出表前快照：api 失败分支回填恢复面（take=出表+取值——
    // 编辑器挂载期草稿在 hook 自持→快照 null 零回填面）
    const snapshot = takeAnnotationDraft(a.id)
    // [F-VISFB-12] 删除发起即收口：草稿出注册表+写代际自增（此后到达的在途写
    // 按 isWriteLive 判废；编辑器卸载清理的入表被墓碑拒——删除跳过 flush）
    discardAnnotationDraft(a.id)
    return runBusyAction(async () => {
      setBusy(true)
      try {
        await unwrap(api.reader.deleteAnnotation({ annotationId: a.id }))
        // [F-VISFB-12] R7：删除成功打墓碑——save 拒入/take 恒 null/写全判废
        markAnnotationDeleted(a.id)
        useReaderStore.getState().removeAnnotation(a.id)
        pushUndo(a.paperId, { kind: 'delete', annotation: a })
        useReaderStore.getState().clearTabDirty(a.paperId)
        closeEditing()
        closeMenu()
        onChanged()
      } catch (e) {
        // [F-VISFB-15 ③] 删除失败补偿：快照回填（仅墓碑未打路径——恢复面不丢；
        // 成功路径现状零回填）
        if (snapshot !== null) {
          saveAnnotationDraft(a.id, snapshot.comment, snapshot.failed)
        }
        // 删除失败：tab 灰点置位（TABS-03 两写面之一）
        useReaderStore.getState().markTabDirty(a.paperId)
        showToast(e instanceof ApiClientError ? e.message : DELETE_FAILED, 'error')
      } finally {
        setBusy(false)
      }
    })
  }

  return { saveComment, autosaveComment, deleteAnnotation }
}
