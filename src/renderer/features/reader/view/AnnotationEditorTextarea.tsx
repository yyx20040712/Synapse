/**
 * [B4-A R1] AnnotationEditorTextarea —— 批注编辑器输入域纯接线件（自
 * AnnotationEditor 拆出 2026-11-23——§11.1 拆件：父件 ≤140/本件 ≤170，输入
 * 事件和按钮纯接线，状态机驻 use-annotation-draft）。
 *
 * ── 行为层 ──
 * - 受控 textarea：值/onChange/composition 双事件经 props 上交（draft 域件
 *   单源——本件零状态机）
 * - keydown 守卫族（语义随迁单源驻本件，F-RDR-02 原位）：
 *   · IME 组词期（nativeEvent.isComposing）按键不消费——Escape 不关弹层、
 *     ctrl+z 不打断组词（annotation-editor-ux IME 用例在档；§3 组词期
 *     Ctrl+Z/Y 不拦截）
 *   · Escape → onCancel（收层判定在宿主 requestCancel——flush 先行语义不变）
 *   · ctrl+z / ctrl+shift+z / ctrl+y：接管文本值层 undo/redo（受控组件原生
 *     undo 栈不可靠——F-A11；metaKey=macOS Cmd 对位）；重做优先 shift
 *   · [B4-A R1 §10.3] ctrl+s：接管并定稿当前 tab（tab 级 finalize 单源=
 *     reader-save-coordinator.finalizeActiveTab；keymap editable 避让使全局
 *     绑定不触发，本处即局部接管点）
 * - paste 事件打标（§3 粘贴判据——paste 事件同源）：onPaste→markPaste，下一个
 *   onChange 按粘贴独立单元处理
 * - blur→onBlur（同步关闭当前单元+立即落库——§3 blur 行）
 * - focus 自动置位（挂载即聚焦）随 textarea 迁驻本件（原 useEffect 语句零改）
 * - matchTextLayerKey：文本层快捷键判定单源（批注与总评 textarea 共用——
 *   ReaderNotesPanel 同判据）
 */
import { useEffect, useRef } from 'react'
import { finalizeActiveTab } from '../state/reader-save-coordinator'

type TextLayerCommand = 'undo' | 'redo' | 'save'

/** 文本层快捷键判定：ctrl+z=undo、ctrl+shift+z/ctrl+y=redo、ctrl+s=save（metaKey=macOS Cmd 对位） */
export function matchTextLayerKey(e: KeyboardEvent): TextLayerCommand | null {
  if (!e.ctrlKey && !e.metaKey) return null
  if (e.key === 'z' || e.key === 'Z') return e.shiftKey ? 'redo' : 'undo'
  if (e.key === 'y' || e.key === 'Y') return 'redo'
  if (e.key === 's' || e.key === 'S') return 'save'
  return null
}

export function AnnotationEditorTextarea(props: {
  value: string
  onValueChange(next: string): void
  onCompositionStart(): void
  onCompositionEnd(): void
  onCancel(): void
  onUndo(): void
  onRedo(): void
  onPasteMark(): void
  onBlur(): void
}): JSX.Element {
  const { value, onValueChange, onCompositionStart, onCompositionEnd, onCancel, onUndo, onRedo, onPasteMark, onBlur } = props
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // 打开即聚焦批注输入（Escape 收起=键盘可退出）——自宿主迁驻（语句零改）
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  return (
    <textarea
      ref={textareaRef}
      rows={3}
      aria-label="批注内容"
      className="w-full resize-none rounded border p-1 text-xs"
      // [T3-P4] 弹层随族归一：底 var(--panel-2)（mockup .anno-pop textarea）
      style={{ borderColor: 'var(--border)', background: 'var(--panel-2)' }}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      onPaste={() => onPasteMark()}
      onBlur={() => onBlur()}
      onCompositionStart={onCompositionStart}
      onCompositionEnd={onCompositionEnd}
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
        // 受控组件原生 undo 栈不可靠（F-A11）——拦截接值栈
        const cmd = matchTextLayerKey(e.nativeEvent)
        if (cmd === null) return
        e.preventDefault()
        if (cmd === 'undo') onUndo()
        else if (cmd === 'redo') onRedo()
        // [B4-A R1 §10.3] ctrl+s 定稿当前 tab（浏览器默认「保存页面」阻断）
        else void finalizeActiveTab()
      }}
    />
  )
}
