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
 *
 * [F-VISFB-12] 草稿/flush 注册表扩展（态×事件全表=批次报告+annotation-draft-
 * flush.test.tsx 头注；注册表单件=annotation-draft-registry.ts）：
 * - 挂载恢复（H1）：卸载草稿命中（同目标 id）且≠服务器值→恢复「最新值+
 *   failed 可重试态」（failed 显失败标记/否则 dirty+timer 自动重试）；==服务器值
 *   →clean 自愈（后台写已落库）。取用=一次性消费（take）。
 * - flush()（H5）：撤防抖→等在途完成→值≠lastSaved 立即派发写（立存，不等
 *   800ms）→返回终态。INV-141 对齐：fulfilled≠已落库——消费方须查态（failed
 *   呈现）；取消/Escape 经消费方包装 await flush 后再收层。
 * - 卸载注册（R1）：comment≠lastSaved 且（failed∨saving∨本挂载为恢复携带）时
 *   草稿入注册表（重挂载可重试面）；未尝试 dirty 不入（锁定锚「卸载清防抖」
 *   语义保持——交互路径由取消/切目标先 flush 承接）。
 * - 卸载后守卫（aliveRef）：在途写结果晚于卸载到达→零状态迁移零重挂 timer
 *   （防幽灵写——落库同步由写路径消费方承接）。
 */
import { useLayoutEffect, useRef, useState } from 'react'
import { quitWriteBlocked } from '../../../app/quit-closing-gate'
import {
  registerDraftFlush,
  saveAnnotationDraft,
  takeAnnotationDraft,
  unregisterDraftFlush
} from './annotation-draft-registry'

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
  /** [F-VISFB-12] 收口面可等待立存：撤防抖→等在途→≠lastSaved 立即派发写；返回终态（fulfilled≠已落库，消费方查态） */
  flush(): Promise<SaveState>
}

export function useAnnotationDraft(
  annotationId: string,
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
  // [F-VISFB-12] saveState 镜像：flush 异步链返回终态用（闭包不捕旧 state）
  const saveStateRef = useRef<SaveState>('clean')
  // [F-VISFB-12] 在途保存句柄：flush 等在途完成用（fireAutosave 包装层登记）
  const inflightRef = useRef<Promise<SaveState> | null>(null)
  // [F-VISFB-12] 挂载存活位：卸载后在途写结果零状态迁移零重挂 timer（防幽灵写）
  const aliveRef = useRef(true)
  // [F-VISFB-12] 本挂载是否为注册表恢复携带（卸载注册条件之一——恢复草稿经无编辑收开循环不丢失）
  const restoredRef = useRef(false)
  // [F-VISFB-12] id/初值/flush/防抖的稳定句柄（挂载期 effect [] 经 ref 取用，lint exhaustive-deps 兼容）
  const idRef = useRef(annotationId)
  const initialRef = useRef(initial)
  const flushRef = useRef<() => Promise<SaveState>>()
  const scheduleRef = useRef<() => void>()
  // IME 组词态：composition 期间 onChange 每片段一次，值栈不收集——
  // start 快照组词前值，end 以「快照→终值」整段一步入栈（undo 粒度=整段）
  const composingRef = useRef(false)
  const preComposeRef = useRef<string | null>(null)

  function setSaveStateBoth(next: SaveState): void {
    saveStateRef.current = next
    setSaveState(next)
  }

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

  flushRef.current = flush
  scheduleRef.current = scheduleAutosave

  // [F-VISFB-12] 挂载期注册表交互（useLayoutEffect=恢复先于绘制无闪烁；StrictMode
  // 双挂载自洽：恢复携带的卸载注册使第二次挂载取回同一草稿+存活位重置）：
  // ①恢复（H1）——卸载草稿命中且≠服务器值→恢复最新值+态（failed/dirty+timer）；
  // ②flush 句柄注册（切目标立存消费面）；③卸载清理=注销句柄+撤防抖+按 R1 入表
  useLayoutEffect(() => {
    // 存活位重置：StrictMode 模拟卸载（cleanup 已置 false）后的重挂载回真；
    // 真卸载无重跑，false 持续到实例销毁
    aliveRef.current = true
    const id = idRef.current
    const entry = takeAnnotationDraft(id)
    if (entry !== null && entry.comment !== initialRef.current) {
      restoredRef.current = true
      commentRef.current = entry.comment
      setComment(entry.comment)
      if (entry.failed) {
        saveStateRef.current = 'failed'
        setSaveState('failed')
      } else {
        saveStateRef.current = 'dirty'
        setSaveState('dirty')
        scheduleRef.current?.()
      }
    }
    registerDraftFlush(id, () => flushRef.current?.() ?? Promise.resolve('clean'))
    return () => {
      aliveRef.current = false
      unregisterDraftFlush(id)
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      // 卸载注册（R1）：已尝试未落盘（failed/saving）或恢复携带的草稿入表
      const unpersisted = commentRef.current !== lastSavedRef.current
      const attempted = saveStateRef.current === 'failed' || saveStateRef.current === 'saving'
      if (unpersisted && (attempted || restoredRef.current)) {
        saveAnnotationDraft(id, commentRef.current, saveStateRef.current === 'failed')
      }
    }
  }, [])

  async function doFireAutosave(): Promise<SaveState> {
    timerRef.current = null
    const value = commentRef.current
    if (value === lastSavedRef.current) {
      return saveStateRef.current
    }
    // 串行化：在途保存未完→重挂防抖（不并发写后端）
    if (savingRef.current) {
      scheduleAutosave()
      return saveStateRef.current
    }
    savingRef.current = true
    setSaveStateBoth('saving')
    const ok = await onAutosave(value)
    savingRef.current = false
    if (ok) {
      lastSavedRef.current = value
    }
    // [F-VISFB-12] 卸载后到达的写结果：零状态迁移零重挂 timer（防幽灵写）——
    // 落库同步/注册表清理由写路径消费方（AnnotationPopups）承接
    if (!aliveRef.current) {
      return saveStateRef.current
    }
    // 跨格守卫：保存期间又有输入→在途结果不作废 dirty（当前值≠本轮存值）
    if (commentRef.current === value) {
      setSaveStateBoth(ok ? 'saved' : 'failed')
    } else if (commentRef.current === lastSavedRef.current) {
      // 仅失败轮可达（成功轮 lastSaved=本轮值，已被上分支排除）——
      // 在途期间值已回退到已存值：无待存，落 clean 不重挂
      setSaveStateBoth('clean')
    } else {
      setSaveStateBoth('dirty')
      // 在途保存期间值已变、且防抖可能已被「回退 lastSaved」的 clean 分支
      // cancelTimer 撤除——不重挂则当前值永不落盘（跨格静默丢写）。
      // 条件=timer 已撤才挂：dirty 路径的既有防抖不重置计时。
      if (timerRef.current === null) scheduleAutosave()
    }
    return saveStateRef.current
  }

  /** fireAutosave=登记在途句柄的包装层（flush 等待在途完成用；finally 只清自己） */
  function fireAutosave(): Promise<SaveState> {
    const flight: Promise<SaveState> = doFireAutosave().finally(() => {
      if (inflightRef.current === flight) {
        inflightRef.current = null
      }
    })
    inflightRef.current = flight
    return flight
  }

  /** [F-VISFB-12] flush（H5）：撤防抖→等在途完成→值≠lastSaved 立即派发写→终态 */
  async function flush(): Promise<SaveState> {
    cancelTimer()
    const flight = inflightRef.current
    if (flight !== null) {
      await flight
      cancelTimer()
    }
    if (commentRef.current !== lastSavedRef.current) {
      return fireAutosave()
    }
    return saveStateRef.current
  }

  /** 值落地共尾：改 comment 值并按「是否等于 lastSaved」迁移保存态 */
  function commitValue(next: string): void {
    commentRef.current = next
    setComment(next)
    if (next === lastSavedRef.current) {
      setSaveStateBoth('clean')
      cancelTimer()
    } else {
      setSaveStateBoth('dirty')
      scheduleAutosave()
    }
  }

  function applyEdit(next: string): void {
    if (next === commentRef.current) {
      return
    }
    // [F-VISFB-64·门二 P0-1 主控终裁承接] closing 冻结期用户输入拒绝（值入口——
    // 句柄内容/tab dirty 变更前；LineageFloatingNotes onChange 对称面）：防
    // ②已过后的 un-attempted 值落组件本地不入④表面（INV-22 写源治理面）
    if (quitWriteBlocked()) {
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
    // [F-VISFB-64·门二 P0-1] closing 冻结期拒绝（编辑器撤销钮直调本入口——
    // 不经 popups 动作闸；栈与值同步不变）
    if (quitWriteBlocked() || past.length === 0) {
      return
    }
    const cur = commentRef.current
    setPast(past.slice(0, -1))
    setFuture([cur, ...future])
    commitValue(past[past.length - 1]!)
  }

  function redoEdit(): void {
    // [F-VISFB-64·门二 P0-1] closing 冻结期拒绝（同 undo——栈与值同步不变）
    if (quitWriteBlocked() || future.length === 0) {
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
    handleCompositionEnd,
    flush
  }
}
