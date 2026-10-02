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
import { ICON_REDO, ICON_SAVE, ICON_TRASH, ICON_UNDO, ICON_X } from '../../../shared/icons'
import { ANNOTATION_BTN_CLASS as btn } from '../anchors/annotation-style'
import { useAnnotationDraft } from '../interact/use-annotation-draft'

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
      onPointerDown={(e) => {
        // F-RDR-02 D6（回炉 1·门一 B1）：点击弹层空白处重聚焦输入框（失焦后点击
        // 恢复光标——无害缓解）。preventDefault 必须：抑制随后 mousedown 的默认
        // 聚焦（默认动作会把焦点抢到不可聚焦目标的祖先/body——jsdom 不实现该
        // 动作族故单测面须真机探针双证 z-f-rdr02-repro-probe）；仅主键（右/中键
        // 无重聚焦语义）；目标非 textarea 自身/非按钮（closest 深判——按钮含
        // 图标子节点时 target 非 BUTTON）才抢焦点
        if (e.button !== 0) {
          return
        }
        const t = e.target as HTMLElement
        if (t !== textareaRef.current && t.closest('button') === null) {
          e.preventDefault()
          textareaRef.current?.focus()
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
      <textarea
        ref={textareaRef}
        rows={3}
        aria-label="批注内容"
        className="w-full resize-none rounded border p-1 text-xs"
        // [T3-P4] 弹层随族归一：底 var(--bg)（app 全域底）→--panel-2（mockup
        // .anno-pop textarea=panel 底系——悬浮面板底而非页面底）
        style={{ borderColor: 'var(--border)', background: 'var(--panel-2)' }}
        value={comment}
        onChange={(e) => draft.applyEdit(e.target.value)}
        onCompositionStart={draft.handleCompositionStart}
        onCompositionEnd={draft.handleCompositionEnd}
        onKeyDown={(e) => {
          // F-RDR-02：IME 组词期按键（229/keyCode）不消费——Escape 不关弹层、ctrl+z
          // 不打断组词（候选根因②；React onKeyDown 的 e.key 在组词期=Process/原键，
          // 需以 nativeEvent.isComposing 判定——annotation-editor-ux IME 用例在档）
          if (e.nativeEvent.isComposing) {
            return
          }
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
      {/* 工具行：撤销/重做按钮对 + 右角保存状态标记（栈空 disabled）。
          [F-UIRES-02 批 B R5] 撤销/重做文字钮→图标+title 同源（data-testid
          受锁锚零变）；sr-only span 保 textContent/accessible name */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={`${btn} syn-icon-btn`}
          style={{ borderColor: 'var(--border)' }}
          data-testid="annotation-editor-undo"
          title="撤销"
          aria-label="撤销"
          disabled={!draft.canUndo}
          onClick={draft.undoEdit}
        >
          {ICON_UNDO}
          <span className="sr-only">撤销</span>
        </button>
        <button
          type="button"
          className={`${btn} syn-icon-btn`}
          style={{ borderColor: 'var(--border)' }}
          data-testid="annotation-editor-redo"
          title="重做"
          aria-label="重做"
          disabled={!draft.canRedo}
          onClick={draft.redoEdit}
        >
          {ICON_REDO}
          <span className="sr-only">重做</span>
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
      {/* [F-UIRES-02 批 B R10] 保存/删除/取消三钮图标化（紧凑弹层底部行——
          主控已裁）；sr-only 保 textContent（受锁 annotation-menu clickButton/
          annotation-popups-autosave find '保存' 精确匹配面） */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={`${btn} syn-icon-btn`}
          style={{ background: 'var(--accent)', color: 'var(--panel)', borderColor: 'var(--accent)' }}
          disabled={busy}
          title="保存"
          aria-label="保存"
          onClick={() => onSave(comment)}
        >
          {ICON_SAVE}
          <span className="sr-only">保存</span>
        </button>
        <button
          type="button"
          className={`${btn} syn-icon-btn`}
          style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
          disabled={busy}
          title="删除"
          aria-label="删除"
          onClick={onDelete}
        >
          {ICON_TRASH}
          <span className="sr-only">删除</span>
        </button>
        <button
          type="button"
          className={`${btn} syn-icon-btn ml-auto`}
          style={{ borderColor: 'var(--border)' }}
          disabled={busy}
          title="取消"
          aria-label="取消"
          onClick={onCancel}
        >
          {ICON_X}
          <span className="sr-only">取消</span>
        </button>
      </div>
    </div>
  )
}
