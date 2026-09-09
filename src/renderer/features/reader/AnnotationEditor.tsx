/**
 * AnnotationEditor —— 标注批注编辑弹层（AnnotationLayer 的交互子件，纯展示）。
 *
 * 数据与副作用全在 AnnotationLayer/AnnotationPopups：本件只收 textarea 文本并
 * 上交（onSave(comment) / onDelete / onCancel），busy 期间按钮禁点防重复提交。
 * 弹层挂载在页根内、文本层之上（z 高于划选工具条），按命中矩形的左下沿定位；
 * key 由父级按 annotation.id 传（换条编辑必经卸载重挂，comment 状态不串）。
 *
 * [F-A11] 笔记编辑 UX 双缺：①自动保存反馈+②撤销/重做——草稿逻辑（值栈/
 * 防抖/保存状态机）驻 use-annotation-draft.ts 域 hook（250 行关卡拆件——
 * 状态机表与跨格注记随逻辑迁驻该件头注；本件留 JSX 接线）。
 */
import { useEffect, useRef } from 'react'
import type { Annotation, AnnotationRect } from '@shared/models/annotation'
import { useAnnotationDraft } from './use-annotation-draft'

const btn = 'rounded border px-2 py-0.5 text-xs disabled:opacity-50'

export function AnnotationEditor(props: {
  annotation: Annotation
  rect: AnnotationRect
  busy: boolean
  onCancel(): void
  onSave(comment: string): void
  onDelete(): void
  onAutosave(comment: string): Promise<boolean>
}): JSX.Element {
  const { annotation, rect, busy, onCancel, onSave, onDelete, onAutosave } = props
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const draft = useAnnotationDraft(annotation.comment, onAutosave)
  const { comment, saveState } = draft

  // 打开即聚焦批注输入（Escape 收起=键盘可退出，见 textarea onKeyDown）
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  return (
    <div
      data-testid="annotation-editor"
      className="absolute z-(--z-anchor-pop) flex w-72 flex-col gap-2 rounded border p-2 text-xs"
      style={{
        // 左沿贴命中矩形并夹取，避免右侧溢出页根
        left: `${Math.min(rect.x * 100, 55)}%`,
        top: `calc(${(rect.y + rect.h) * 100}% + 6px)`,
        background: 'var(--panel)',
        borderColor: 'var(--border)',
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.18)'
      }}
    >
      <p className="line-clamp-2" style={{ color: 'var(--text-dim)' }}>
        {annotation.quoteText}
      </p>
      <textarea
        ref={textareaRef}
        rows={3}
        aria-label="批注内容"
        className="w-full resize-none rounded border p-1 text-xs"
        style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
        value={comment}
        onChange={(e) => draft.applyEdit(e.target.value)}
        onCompositionStart={draft.handleCompositionStart}
        onCompositionEnd={draft.handleCompositionEnd}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            onCancel()
            return
          }
          // 受控组件原生 undo 栈不可靠（F-A11）——拦截接值栈；metaKey=macOS Cmd 对位
          const mod = e.ctrlKey || e.metaKey
          if (mod && (e.key === 'z' || e.key === 'Z')) {
            e.preventDefault()
            if (e.shiftKey) {
              draft.redoEdit()
            } else {
              draft.undoEdit()
            }
            return
          }
          if (mod && (e.key === 'y' || e.key === 'Y')) {
            e.preventDefault()
            draft.redoEdit()
          }
        }}
      />
      {/* 工具行：撤销/重做按钮对 + 右角保存状态标记（栈空 disabled） */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={btn}
          style={{ borderColor: 'var(--border)' }}
          data-testid="annotation-editor-undo"
          disabled={!draft.canUndo}
          onClick={draft.undoEdit}
        >
          撤销
        </button>
        <button
          type="button"
          className={btn}
          style={{ borderColor: 'var(--border)' }}
          data-testid="annotation-editor-redo"
          disabled={!draft.canRedo}
          onClick={draft.redoEdit}
        >
          重做
        </button>
        {(saveState === 'saved' || saveState === 'failed') && (
          <span
            data-testid="annotation-saved-flag"
            className="ml-auto"
            style={{ color: saveState === 'failed' ? 'var(--danger)' : 'var(--text-dim)' }}
          >
            {saveState === 'failed' ? '保存失败' : '已保存'}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={btn}
          style={{ background: 'var(--accent)', color: '#ffffff', borderColor: 'var(--accent)' }}
          disabled={busy}
          onClick={() => onSave(comment)}
        >
          保存
        </button>
        <button
          type="button"
          className={btn}
          style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
          disabled={busy}
          onClick={onDelete}
        >
          删除
        </button>
        <button
          type="button"
          className={`${btn} ml-auto`}
          style={{ borderColor: 'var(--border)' }}
          disabled={busy}
          onClick={onCancel}
        >
          取消
        </button>
      </div>
    </div>
  )
}
