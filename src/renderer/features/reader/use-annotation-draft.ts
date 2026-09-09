/**
 * [F-A11] useAnnotationDraft —— 批注草稿域 hook（自 AnnotationEditor 拆出
 * 2026-09-10——组件 250 行关卡：逻辑面抽域件，组件留 JSX 接线；行为零变，
 * annotation-editor-ux/annotation-popups-autosave 两测试件零改即绿=重构
 * 保真锚）。
 *
 * ① 自动保存反馈——输入停顿 800ms 且值≠上次已存值时调 onAutosave(comment)
 *   （Promise<boolean>），true→saved/false→failed（消费方渲染标记）。
 * ② 撤销/重做值栈：past/future 双栈上限 100 步。
 *
 * 自动保存状态机（宪法前置，跨格序列见 tests/unit/renderer/annotation-editor-ux.test.tsx）：
 * | 态 | 进入 | 行为 |
 * | clean | 挂载（comment=初始） | 无标记无 timer |
 * | dirty | 输入/撤销/重做后值≠lastSaved | 起 800ms 防抖 timer |
 * | saving | timer 到期且值≠lastSaved | 调 onAutosave；标记不在场 |
 * | saved | onAutosave resolve true 且期间无新输入 | 消费方显「已保存」；lastSaved=值 |
 * | failed | resolve false 且期间无新输入 | 消费方显「保存失败」；再输入回 dirty 可重试 |
 * | dirty←saved/failed/saving | 保存期间续输 | 在途结果不作废当前 dirty（跨格：结果按「值已变」判废） |
 * 值回退到 lastSaved（含初始值）→ clean 并撤 timer（无谓写零发出）。
 * 保存串行化：在途中 timer 再到期→重挂 800ms（不并发写）。
 */
import { useEffect, useRef, useState } from 'react'

/** 自动保存防抖窗口（ms） */
const AUTOSAVE_DEBOUNCE_MS = 800
/** 撤销/重做值栈深度上限（步） */
const HISTORY_MAX = 100

export type SaveState = 'clean' | 'dirty' | 'saving' | 'saved' | 'failed'

export interface AnnotationDraft {
  comment: string
  saveState: SaveState
  canUndo: boolean
  canRedo: boolean
  /** 用户输入：推 past、清 future；组词期不入栈（end 统一入） */
  applyEdit(next: string): void
  undoEdit(): void
  redoEdit(): void
  handleCompositionStart(): void
  handleCompositionEnd(): void
}

export function useAnnotationDraft(
  initial: string,
  onAutosave: (comment: string) => Promise<boolean>
): AnnotationDraft {
  const [comment, setComment] = useState(initial)
  const [saveState, setSaveState] = useState<SaveState>('clean')
  const [past, setPast] = useState<string[]>([])
  const [future, setFuture] = useState<string[]>([])
  // commentRef：fireAutosave 异步链里读最新值（闭包不捕旧 state）
  const commentRef = useRef(initial)
  // lastSaved：上次落盘值（初值=初始 comment）——回退到它即 clean，触发判据用它而非初始值
  const lastSavedRef = useRef(initial)
  const timerRef = useRef<number | null>(null)
  const savingRef = useRef(false)
  // IME 组词态：composition 期间 onChange 每片段一次，值栈不收集——
  // start 快照组词前值，end 以「快照→终值」整段一步入栈（undo 粒度=整段）
  const composingRef = useRef(false)
  const preComposeRef = useRef<string | null>(null)

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
      // 仅失败轮可达（成功轮 lastSaved=本轮值，已被上分支排除）——
      // 在途期间值已回退到已存值：无待存，落 clean 不重挂
      setSaveState('clean')
    } else {
      setSaveState('dirty')
      // 在途保存期间值已变、且防抖可能已被「回退 lastSaved」的 clean 分支
      // cancelTimer 撤除——不重挂则当前值永不落盘（跨格静默丢写）。
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

  return {
    comment,
    saveState,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    applyEdit,
    undoEdit,
    redoEdit,
    handleCompositionStart,
    handleCompositionEnd
  }
}
