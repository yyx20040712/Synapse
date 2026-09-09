/**
 * [F-SPLIT-01] AnnotationPopups —— 标注弹层动作件（自 AnnotationLayer 拆出
 * 2026-09-05；迁移 AnnotationLayer 头注弹层职责段——四选项菜单+批注编辑器
 * JSX 与动作函数，语句零改纯搬运）。
 *
 * ── 行为层（原 AnnotationLayer 弹层块）──
 * - 点击标注：弹四选项菜单（AnnotationMenu：复制引文→剪贴板+失败 toast；删除→
 *   confirm→api.reader.deleteAnnotation；添加笔记→开批注编辑 AnnotationEditor
 *   （comment textarea，保存 api.reader.updateAnnotation）；取消收起）——点击他条
 *   标注=切目标，不残留双弹层；成功后经 reader.store.updateAnnotation/
 *   removeAnnotation 同步本地数组并回调 onChanged
 * - 弹层可无本地状态（拆件裁量：禁改状态归属）——menu/editing/busy 由宿主
 *   AnnotationLayer 持有，本件经 props 收值+set 函数回写；saveComment/
 *   copyQuote/deleteAnnotation 动作函数随弹层 JSX 迁入，busy 守卫/失败 toast
 *   （含 tab 灰点两写面 markTabDirty/clearTabDirty）/pushUndo 语句零改。
 * - [F-A11] 批注编辑器自动保存接线：autosaveComment=saveComment 静默变体
 *   （api 链+store 同步+pushUndo 会话单 entry；不收层不 onChanged；busy 毫秒级
 *   串行互斥 [W-A 门二]；失败 markTabDirty+toast 返 false）——编辑器内 800ms
 *   停顿触发，反馈标记「已保存/保存失败」在编辑器本件。
 *
 * ── 接口层 ──
 * - export function AnnotationPopups(props: { menu: PopupTarget | null;
 *   editing: PopupTarget | null; busy: boolean; setMenu; setEditing; setBusy;
 *   onChanged }): JSX.Element（PopupTarget 接口随迁本件——宿主 state 类型
 *   消费经 import 单源）
 *
 * ── 架构层 ──
 * - api 调用+store 三方法同步随弹层动作归本件（原 AnnotationLayer 头注「在
 *   本层」随迁——色块命中上抛与重锚编排留宿主）；AnnotationEditor 纯展示不变。
 */
import { useEffect, useRef } from 'react'
import { api, unwrap, ApiClientError } from '../../api/client'
import { showToast } from '../../shared/ui/Toast'
import { pushUndo } from './annotation-undo'
import { AnnotationEditor } from './AnnotationEditor'
import { AnnotationMenu } from './AnnotationMenu'
import { useReaderStore } from './reader.store'
import type { Annotation, AnnotationRect } from '@shared/models/annotation'
/** 意外异常（非 ApiClientError）时的兜底中文消息 */
const UPDATE_FAILED = '标注保存失败'
const DELETE_FAILED = '标注删除失败'
const DELETE_CONFIRM = '删除这条标注？'

/** 弹层目标（连同命中矩形供定位）——菜单与编辑器互斥使用同形 */
export interface PopupTarget {
  annotation: Annotation
  rect: AnnotationRect
}

/** 复制失败的动作型提示（双路径共用；菜单已乐观收起，重试=重新点击标注） */
const COPY_FAILED = '复制到剪贴板失败，可点击标注重试'

export function AnnotationPopups(props: {
  menu: PopupTarget | null
  editing: PopupTarget | null
  busy: boolean
  setMenu: (v: PopupTarget | null) => void
  setEditing: (v: PopupTarget | null) => void
  setBusy: (v: boolean) => void
  onChanged: () => void
}): JSX.Element {
  const { menu, editing, busy, setMenu, setEditing, setBusy, onChanged } = props

  // [F-A11] 自动保存 pushUndo 会话守卫：编辑会话（editing 目标切换）重置——
  // 同一会话内多次自动保存只推一条 comment-edit（before=预编辑快照），避免
  // 每次输入停顿灌满 UNDO_DEPTH_MAX=50 的全局撤销栈挤出他操作条目
  const pushedSessionRef = useRef<string | null>(null)
  useEffect(() => {
    if (editing !== null) {
      pushedSessionRef.current = null
    }
  }, [editing])

  // [W-A 门二] busy 实时镜像：编辑器防抖 timer 闭包捕获的是旧渲染 props，
  // autosaveComment 里直读 busy prop 会漏挡（反向竞态）——ref 在调用时读现值
  const busyRef = useRef(busy)
  busyRef.current = busy

  /** 批注保存：api 成功 → store 同步 → 收起弹层 → onChanged 通知 */
  async function saveComment(a: Annotation, comment: string): Promise<void> {
    if (busy) {
      return
    }
    setBusy(true)
    try {
      const next: Annotation = { ...a, comment, updatedAt: new Date().toISOString() }
      const saved = await unwrap(api.reader.updateAnnotation({ annotation: next }))
      useReaderStore.getState().updateAnnotation(saved)
      pushUndo(a.paperId, { kind: 'comment-edit', before: a })
      useReaderStore.getState().clearTabDirty(a.paperId)
      setEditing(null)
      onChanged()
    } catch (e) {
      // 保存失败：tab 灰点置位（TABS-03 两写面之一）
      useReaderStore.getState().markTabDirty(a.paperId)
      showToast(e instanceof ApiClientError ? e.message : UPDATE_FAILED, 'error')
    } finally {
      setBusy(false)
    }
  }

  /**
   * [F-A11] 自动保存（saveComment 的静默变体）：复用 api 链+store 同步+pushUndo
   * （会话单 entry），但不 setEditing(null) 收层、不调 onChanged（唯一消费点
   * PagesOverlay 传 noop，store 订阅已驱动 UI 刷新——主控裁量申报点）。
   * [W-A 门二] busy 毫秒级串行：autosave 在途置 busy（「保存/删除/取消」按钮
   * disabled 即互斥，用户无感）；手动链在途时反向被 busyRef 挡。原「后台静默
   * 不动 busy」语义经门二裁决调整为 busy 串行（防 autosave 后到覆盖手动写/
   * 复活已删标注）。失败 markTabDirty+toast（TABS-03 两写面）并返回 false；
   * 成功 clearTabDirty 返回 true。
   */
  async function autosaveComment(a: Annotation, comment: string): Promise<boolean> {
    if (busyRef.current) {
      // busy 只来自手动保存（将存同值）或删除（编辑器将收层）——乐观 true 无观测面
      return true
    }
    setBusy(true)
    try {
      const next: Annotation = { ...a, comment, updatedAt: new Date().toISOString() }
      const saved = await unwrap(api.reader.updateAnnotation({ annotation: next }))
      useReaderStore.getState().updateAnnotation(saved)
      if (pushedSessionRef.current !== a.id) {
        pushUndo(a.paperId, { kind: 'comment-edit', before: a })
        pushedSessionRef.current = a.id
      }
      useReaderStore.getState().clearTabDirty(a.paperId)
      return true
    } catch (e) {
      useReaderStore.getState().markTabDirty(a.paperId)
      showToast(e instanceof ApiClientError ? e.message : UPDATE_FAILED, 'error')
      return false
    } finally {
      setBusy(false)
    }
  }

  /** 复制引文：双路径失败 toast（同步异常/写入拒绝，INV-02 动作型）→ 收起菜单 */
  function copyQuote(a: Annotation): void {
    setMenu(null)
    try {
      void navigator.clipboard.writeText(a.quoteText).catch(() => {
        showToast(COPY_FAILED, 'error')
      })
    } catch {
      showToast(COPY_FAILED, 'error')
    }
  }

  /** 删除：confirm 确认 → api → store 同步 → 收起（菜单/编辑器一并）→ onChanged 通知 */
  async function deleteAnnotation(a: Annotation): Promise<void> {
    if (busy || !window.confirm(DELETE_CONFIRM)) {
      return
    }
    setBusy(true)
    try {
      await unwrap(api.reader.deleteAnnotation({ annotationId: a.id }))
      useReaderStore.getState().removeAnnotation(a.id)
      pushUndo(a.paperId, { kind: 'delete', annotation: a })
      useReaderStore.getState().clearTabDirty(a.paperId)
      setEditing(null)
      setMenu(null)
      onChanged()
    } catch (e) {
      // 删除失败：tab 灰点置位（TABS-03 两写面之一）
      useReaderStore.getState().markTabDirty(a.paperId)
      showToast(e instanceof ApiClientError ? e.message : DELETE_FAILED, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {menu !== null && (
        <AnnotationMenu
          annotation={menu.annotation}
          rect={menu.rect}
          busy={busy}
          onCopy={() => copyQuote(menu.annotation)}
          onDelete={() => void deleteAnnotation(menu.annotation)}
          onAddNote={() => {
            setEditing(menu)
            setMenu(null)
          }}
          onCancel={() => setMenu(null)}
        />
      )}
      {editing !== null && (
        <AnnotationEditor
          key={editing.annotation.id}
          annotation={editing.annotation}
          rect={editing.rect}
          busy={busy}
          onCancel={() => setEditing(null)}
          onSave={(comment) => void saveComment(editing.annotation, comment)}
          onDelete={() => void deleteAnnotation(editing.annotation)}
          onAutosave={(comment) => autosaveComment(editing.annotation, comment)}
        />
      )}
    </>
  )
}
