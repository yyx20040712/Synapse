/**
 * AnnotationEditor —— 标注批注编辑弹层（AnnotationLayer 的交互子件，纯展示）。
 *
 * 数据与副作用全在 AnnotationLayer/AnnotationPopups：本件上交删除/取消；
 * busy 期间动作禁点防重复提交。
 * 弹层挂载在页根内、文本层之上（z 高于划选工具条），按命中矩形的左下沿定位；
 * key 由父级按 annotation.id 传（换条编辑必经卸载重挂，comment 状态不串）。
 *
 * [F-A11] 草稿逻辑（[B4-A R1]）（单元边界/值栈/写链）驻 use-annotation-draft 域
 *   hook（React 薄适配）→reader-text-controller 内核；本件只做接线。
 * [B4-A R1 §11.1 拆件] 父件 ≤140：输入域拆 AnnotationEditorTextarea.tsx
 *   （keydown 守卫族+ctrl+s 接管）、动作行拆 AnnotationEditorActions.tsx（工具行
 *   纯接线）；本件留容器/定位/取消收层判定（requestCancel）与草稿 hook 接线。
 * [F-VISFB-12] 取消/Escape 先 flush（H2/H3/H4）：clean/saved 无待存与 busy
 *   在途手动写承接两路同步收层（零跳变）；dirty/failed/saving 路径 await
 *   draft.flush 立存后按终态收层判定（写挂起期间不收层；终态 failed=不收层
 *   ——停留编辑器呈现保存失败态，重试=保存钮/二次 Escape 再 flush，逃生径=
 *   删除钮/切目标 fire-first 注册表承接；卸载注册承接面=组件真卸载〔切目标/
 *   路由〕时的 failed 条目兜底——删除链先清册〔discard 出表+墓碑拒注册〕，
 *   不经此兜底）。UI 反馈不阻塞面=写经 onAutosave
 *   （AnnotationPopups）置 busy 全钮禁用。
 */
import { useRef } from 'react'
import type { Annotation, AnnotationRect } from '@shared/models/annotation'
import { useAnnotationDraft } from '../interact/use-annotation-draft'
import { saveAnnotationDraft } from '../interact/annotation-draft-registry'
import { AnnotationEditorTextarea } from './AnnotationEditorTextarea'
import { AnnotationEditorActions } from './AnnotationEditorActions'

export function AnnotationEditor(props: {
  annotation: Annotation
  rect: AnnotationRect
  busy: boolean
  onCancel(): void
  onDelete(): void
  /** 落库写通道（单元/blur/flush 的普通写——写体自入链） */
  onAutosave(comment: string): Promise<boolean>
  /** [B4-A 回炉 R5] 落库裸写体（history 命令预 flush）；契约=TextDraftOptions.onAutosaveRaw */
  onAutosaveRaw(comment: string): Promise<boolean>
  /** [B4-A 回炉 R5] 文本 undo/redo 反向写裸体（缺省=onAutosaveRaw）；契约见 TextDraftOptions */
  onHistoryWriteRaw?(comment: string): Promise<boolean>
  /** 编辑会话终止通知（blur 与卸载——popups 据此结束操作层编辑合并会话） */
  onSessionEnd?(): void
}): JSX.Element {
  const { annotation, rect, busy, onCancel, onDelete, onAutosave, onAutosaveRaw } = props
  const historyWrite = props.onHistoryWriteRaw
  const hostRef = useRef<HTMLDivElement | null>(null)
  const draft = useAnnotationDraft(
    { paperId: annotation.paperId, kind: 'annotation-comment', annotationId: annotation.id },
    annotation.comment,
    {
      onAutosave: (comment) => onAutosave(comment),
      onAutosaveRaw: (comment) => onAutosaveRaw(comment),
      onHistoryWriteRaw: historyWrite ? (comment) => historyWrite(comment) : undefined,
      onSessionEnd: props.onSessionEnd
    }
  )
  const { comment, saveState } = draft

  /**
   * [F-VISFB-12] 取消先 flush（H2/H3/H4）：无待存（clean/saved——含值已回退
   * lastSaved）或 busy（在途手动保存/删除承接，卸载注册面兜底）→同步收层
   * （零跳变，锁定 Escape 同步锚）；有待存→await flush 立存后再收层。
   * [回炉轮 1 B-2] busy 分支显式入注册表（failed=false）；failed 终态不收层
   * （INV-141 实质查态——flush fulfilled≠已落库）。
   */
  function requestCancel(): void {
    if (busy || saveState === 'clean' || saveState === 'saved') {
      if (busy && comment !== annotation.comment) {
        saveAnnotationDraft(annotation.id, comment, false)
      }
      onCancel()
      return
    }
    void draft.flush().then((finalState) => {
      if (finalState === 'failed') {
        // failed=不收层：停留编辑器呈现保存失败态；二次 Escape=再 flush 重试
        return
      }
      onCancel()
    })
  }

  return (
    <div
      data-testid="annotation-editor"
      ref={hostRef}
      onPointerDown={(e) => {
        // F-RDR-02 D6：点击弹层空白处重聚焦输入框（preventDefault 抑制默认聚焦；
        // 仅主键；目标非 textarea 自身/非按钮才抢焦点——原文随迁）
        if (e.button !== 0) {
          return
        }
        const t = e.target as HTMLElement
        const ta = hostRef.current?.querySelector('textarea') ?? null
        if (t !== ta && t.closest('button') === null) {
          e.preventDefault()
          ta?.focus()
        }
      }}
      className="absolute z-(--z-anchor-pop) flex w-72 flex-col gap-2 rounded border p-2 text-xs"
      style={{
        // 左沿贴命中矩形并夹取，避免右侧溢出页根
        left: `${Math.min(rect.x * 100, 55)}%`,
        top: `calc(${(rect.y + rect.h) * 100}% + 6px)`,
        background: 'var(--panel)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-pop-md)'
      }}
    >
      <p className="line-clamp-2" style={{ color: 'var(--text-dim)' }}>
        {annotation.quoteText}
      </p>
      <AnnotationEditorTextarea
        value={comment}
        onValueChange={draft.applyEdit}
        onCompositionStart={draft.handleCompositionStart}
        onCompositionEnd={draft.handleCompositionEnd}
        onCancel={requestCancel}
        onUndo={() => void draft.undoEdit()}
        onRedo={() => void draft.redoEdit()}
        onPasteMark={draft.markPaste}
        onBlur={draft.handleBlur}
      />
      <AnnotationEditorActions
        saveState={saveState}
        busy={busy}
        canUndo={draft.canUndo}
        canRedo={draft.canRedo}
        onUndo={() => void draft.undoEdit()}
        onRedo={() => void draft.redoEdit()}
        onDelete={onDelete}
        onCancel={requestCancel}
      />
    </div>
  )
}
