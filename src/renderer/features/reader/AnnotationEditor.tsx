/**
 * AnnotationEditor —— 标注批注编辑弹层（AnnotationLayer 的交互子件，纯展示）。
 *
 * 数据与副作用全在 AnnotationLayer：本件只收 textarea 文本并上交
 * （onSave(comment) / onDelete / onCancel），busy 期间按钮禁点防重复提交。
 * 弹层挂载在页根内、文本层之上（z 高于划选工具条），按命中矩形的左下沿定位；
 * key 由父级按 annotation.id 传（换条编辑必经卸载重挂，comment 状态不串）。
 */
import { useEffect, useRef, useState } from 'react'
import type { Annotation, AnnotationRect } from '@shared/models/annotation'

const btn = 'rounded border px-2 py-0.5 text-xs disabled:opacity-50'

export function AnnotationEditor(props: {
  annotation: Annotation
  rect: AnnotationRect
  busy: boolean
  onCancel(): void
  onSave(comment: string): void
  onDelete(): void
}): JSX.Element {
  const { annotation, rect, busy, onCancel, onSave, onDelete } = props
  const [comment, setComment] = useState(annotation.comment)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // 打开即聚焦批注输入；Escape 收起（键盘可退出）
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  return (
    <div
      data-testid="annotation-editor"
      className="absolute z-20 flex w-72 flex-col gap-2 rounded border p-2 text-xs"
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
        onChange={(e) => setComment(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel()
        }}
      />
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
