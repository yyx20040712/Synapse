/**
 * AnnotationEditor —— 标注批注编辑弹层（AnnotationLayer 的交互子件，纯展示）。
 *
 * 数据与副作用全在 AnnotationLayer/AnnotationPopups：本件只收 textarea 文本并
 * 上交（onSave(comment) / onDelete / onCancel），busy 期间按钮禁点防重复提交。
 * 弹层挂载在页根内、文本层之上（z 高于划选工具条），按命中矩形的左下沿定位；
 * key 由父级按 annotation.id 传（换条编辑必经卸载重挂，comment 状态不串）。
 *
 * [F-A11] 笔记编辑 UX 双缺补齐：
 * ① 自动保存反馈——输入停顿 800ms 且值≠上次已存值时调 onAutosave(comment)
 *   （Promise<boolean>），true→「已保存」/false→「保存失败」小字标记
 *   （annotation-saved-flag）；手动「保存」按钮走原 onSave 语义不进本状态机。
 * ② 撤销/重做值栈（textarea 受控组件原生 undo 栈不可靠——值栈单源）：
 *   past/future 双栈上限 100 步，按钮对+Ctrl+Z/Ctrl+Y/Ctrl+Shift+Z 键盘拦截。
 *
 * 自动保存状态机（宪法前置，跨格序列见 tests/unit/renderer/annotation-editor-ux.test.tsx）：
 * | 态 | 进入 | 行为 |
 * | clean | 挂载（comment=初始） | 无标记无 timer |
 * | dirty | 输入/撤销/重做后值≠lastSaved | 起 800ms 防抖 timer |
 * | saving | timer 到期且值≠lastSaved | 调 onAutosave；标记不在场 |
 * | saved | onAutosave resolve true 且期间无新输入 | 「已保存」；lastSaved=值 |
 * | failed | resolve false 且期间无新输入 | 「保存失败」；再输入回 dirty 可重试 |
 * | dirty←saved/failed/saving | 保存期间续输 | 在途结果不作废当前 dirty（跨格：结果按「值已变」判废） |
 * 值回退到 lastSaved（含初始值）→ clean 并撤 timer（无谓写零发出）。
 * 保存串行化：在途中 timer 再到期→重挂 800ms（不并发写）。
 */
import { useEffect, useRef, useState } from 'react'
import type { Annotation, AnnotationRect } from '@shared/models/annotation'

const btn = 'rounded border px-2 py-0.5 text-xs disabled:opacity-50'

/** 自动保存防抖窗口（ms） */
const AUTOSAVE_DEBOUNCE_MS = 800
/** 撤销/重做值栈深度上限（步） */
const HISTORY_MAX = 100

type SaveState = 'clean' | 'dirty' | 'saving' | 'saved' | 'failed'

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
  const [comment, setComment] = useState(annotation.comment)
  const [saveState, setSaveState] = useState<SaveState>('clean')
  const [past, setPast] = useState<string[]>([])
  const [future, setFuture] = useState<string[]>([])
  // commentRef：fireAutosave 异步链里读最新值（闭包不捕旧 state）
  const commentRef = useRef(annotation.comment)
  // lastSaved：上次落盘值（初值=初始 comment）——回退到它即 clean，触发判据用它而非初始值
  const lastSavedRef = useRef(annotation.comment)
  const timerRef = useRef<number | null>(null)
  const savingRef = useRef(false)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // 打开即聚焦批注输入；Escape 收起（键盘可退出）
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  // 卸载清防抖（防泄漏与卸载后触发保存）
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  function cancelTimer(): void {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  function scheduleAutosave(): void {
    cancelTimer()
    timerRef.current = window.setTimeout(() => {
      void fireAutosave()
    }, AUTOSAVE_DEBOUNCE_MS)
  }

  async function fireAutosave(): Promise<void> {
    timerRef.current = null
    const value = commentRef.current
    if (value === lastSavedRef.current) {
      return
    }
    // 串行化：在途保存未完→重挂防抖（不并发写后端）
    if (savingRef.current) {
      scheduleAutosave()
      return
    }
    savingRef.current = true
    setSaveState('saving')
    const ok = await onAutosave(value)
    savingRef.current = false
    if (ok) {
      lastSavedRef.current = value
    }
    // 跨格守卫：保存期间又有输入→在途结果不作废 dirty（当前值≠本轮存值）
    if (commentRef.current === value) {
      setSaveState(ok ? 'saved' : 'failed')
    } else if (commentRef.current === lastSavedRef.current) {
      // N-A（门二）：仅失败轮可达（成功轮 lastSaved=本轮值，已被上分支排除）——
      // 在途期间值已回退到已存值：无待存，落 clean 不重挂
      setSaveState('clean')
    } else {
      setSaveState('dirty')
      // W-1（门一回炉）：在途保存期间值已变、且防抖可能已被「回退 lastSaved」的
      // clean 分支 cancelTimer 撤除——不重挂则当前值永不落盘（跨格静默丢写）。
      // 条件=timer 已撤才挂：dirty 路径的既有防抖不重置计时。
      if (timerRef.current === null) scheduleAutosave()
    }
  }

  /** 值落地共尾：改 comment 值并按「是否等于 lastSaved」迁移保存态 */
  function commitValue(next: string): void {
    commentRef.current = next
    setComment(next)
    if (next === lastSavedRef.current) {
      setSaveState('clean')
      cancelTimer()
    } else {
      setSaveState('dirty')
      scheduleAutosave()
    }
  }

  // IME 组词态（N-6）：composition 期间 onChange 每片段一次，值栈不收集——
  // start 快照组词前值，end 以「快照→终值」整段一步入栈（undo 粒度=整段）
  const composingRef = useRef(false)
  const preComposeRef = useRef<string | null>(null)

  /** 用户输入：推 past、清 future（redo 分支失效）；组词期不入栈（end 统一入） */
  function applyEdit(next: string): void {
    if (next === commentRef.current) {
      return
    }
    if (!composingRef.current) {
      // 旧值须同步捕获：setPast 函数式更新子在 flush 期才执行，届时读 ref 已是新值
      const prev = commentRef.current
      setPast((p) => [...p, prev].slice(-HISTORY_MAX))
      setFuture([])
    }
    commitValue(next)
  }

  function handleCompositionStart(): void {
    composingRef.current = true
    preComposeRef.current = commentRef.current
  }

  function handleCompositionEnd(): void {
    composingRef.current = false
    const pre = preComposeRef.current
    preComposeRef.current = null
    if (pre !== null && pre !== commentRef.current) {
      setPast((p) => [...p, pre].slice(-HISTORY_MAX))
      setFuture([])
    }
  }

  function undoEdit(): void {
    if (past.length === 0) {
      return
    }
    const cur = commentRef.current
    setPast(past.slice(0, -1))
    setFuture([cur, ...future])
    commitValue(past[past.length - 1]!)
  }

  function redoEdit(): void {
    if (future.length === 0) {
      return
    }
    const cur = commentRef.current
    setPast([...past, cur])
    setFuture(future.slice(1))
    commitValue(future[0]!)
  }

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
        onChange={(e) => applyEdit(e.target.value)}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
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
              redoEdit()
            } else {
              undoEdit()
            }
            return
          }
          if (mod && (e.key === 'y' || e.key === 'Y')) {
            e.preventDefault()
            redoEdit()
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
          disabled={past.length === 0}
          onClick={undoEdit}
        >
          撤销
        </button>
        <button
          type="button"
          className={btn}
          style={{ borderColor: 'var(--border)' }}
          data-testid="annotation-editor-redo"
          disabled={future.length === 0}
          onClick={redoEdit}
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
