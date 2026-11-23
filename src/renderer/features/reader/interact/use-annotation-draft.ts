/**
 * [F-A11] useAnnotationDraft（[B4-A R1] 共享化） —— 共享文本草稿控制器 hook（批注 comment
 * 与总评 contentMd 共用；设计稿 §3/§4.1 文本值层的 React 薄适配）。
 *
 * 状态机与写编排全在 reader-text-controller（纯内核）：单元边界驻
 * reader-text-unit（IME/1.5s/空白/粘贴）、值栈驻 reader-text-history（target 级
 * 注册表——跨视图驻留）、写串行驻 per-tab lane。本件只做：控制器按 target 键
 * 创建/销毁、视图镜像（comment/saveState/canUndo/canRedo）、粘贴打标、
 * 注册表挂载绑定（句柄键=草稿注册表键）。
 *
 * ── 宿主适配契约 ──
 * - onAutosave(value, key)：普通写通道（单元/blur/flush），返回 true=该值已在库。
 *   写体自身经 per-tab lane 入链（单层入链契约——tab-write-lane 头注）。
 * - onAutosaveRaw(value, key)/onHistoryWriteRaw(value, key)：裸写体（[B4-A 回炉 R5]
 *   history 命令的预 flush/反向写）——控制器在自己的链任务体内直调，不自行入链。
 *   必选：缺省回落到自入链的 onAutosave 会在链任务体内再次入链（循环等待）。
 * - mirror：宿主另持草稿态时的写回通道（总评——notes.store 草稿镜像）；
 *   persisted 标志语义同 TextControllerPorts.mirror。
 * - syncExternal：宿主草稿被 load/合并改写时采用外部值（零历史项跟随）。
 */
import { useLayoutEffect, useRef, useState } from 'react'
import { useTextDraftRegistryBinding } from './annotation-draft-registry'
import {
  TextController,
  type TextSaveState,
  type TextView
} from '../state/reader-text-controller'
import { textTargetId, type TextTargetKey } from '../state/reader-text-history'
import { useReaderStore } from '../state/reader.store'

export type SaveState = TextSaveState

export interface AnnotationDraft {
  comment: string
  saveState: SaveState
  canUndo: boolean
  canRedo: boolean
  applyEdit(next: string): void
  /** 粘贴判据打标（paste 事件同源——下一个 onChange 按粘贴独立单元处理） */
  markPaste(): void
  /** 文本 undo/redo（异步：关闭单元→链任务〔预 flush→反向写〕→成功移栈）；true=完整动作成功 */
  undoEdit(): Promise<boolean>
  redoEdit(): Promise<boolean>
  handleCompositionStart(): void
  handleCompositionEnd(): void
  /** blur：同步关闭当前单元+立即落库（§3 blur 行） */
  handleBlur(): void
  /** 外部值同步（宿主草稿被 load/合并改写——不开历史单元不清 redo）；
   *  persisted=false=该值尚未落库（合并产物） */
  syncExternal(value: string, persisted?: boolean): void
  /** 收口面可等待立存：闭合单元→等在途→立即派发写；返回终态（兑现≠已落库） */
  flush(): Promise<SaveState>
}

export interface TextDraftOptions {
  /** 单元提交/空闲/blur 的写通道（返回 true=落库成功）；key=写目标（换篇安全） */
  onAutosave(comment: string, key: TextTargetKey): Promise<boolean>
  /** [B4-A 回炉 R5] 落库裸写体（控制器 history 命令的预 flush——链任务体内直调，
   *  不自行入链）；必选（回落到自入链的 onAutosave=链任务体内再入链，循环等待） */
  onAutosaveRaw(comment: string, key: TextTargetKey): Promise<boolean>
  /** [B4-A 回炉 R5] 文本 undo/redo 反向写裸体（控制器链任务体内直调，不自行入链；
   *  缺省=onAutosaveRaw——批注经 popups 注入免会话污染的裸通道） */
  onHistoryWriteRaw?(comment: string, key: TextTargetKey): Promise<boolean>
  /** 显示值采用镜像（宿主另持草稿态时同步写回——总评 notes.store）；写通道
   *  一律按 key（本控制器 target）寻址——宿主不读渲染帧闭包的篇 id：换 target
   *  后离场篇的收口写仍落原篇。persisted=false=用户新输入（未落库草稿）；
   *  persisted=true=控制器采纳已落库的反向值（宿主按已落库值采纳） */
  mirror?(value: string, key: TextTargetKey, persisted: boolean): void
  /** 编辑会话终止通知（blur 与卸载——批注：结束操作层编辑合并会话，§4.2） */
  onSessionEnd?(key: TextTargetKey): void
  /** 卸载即收口（总评 true——离场关闭单元并无在途写时 fire flush；批注缺省 false） */
  closeoutOnUnmount?: boolean
  /** 初值是否已落库（false=宿主草稿含未落库编辑——基线未知，待写；缺省 true） */
  initialPersisted?: boolean
}

/** 草稿注册表键（句柄/草稿表同键）：批注=annotation.id（切目标/删除链按 id 寻址）；总评=note:<paperId> */
function textDraftRegistryKey(target: TextTargetKey): string {
  return target.kind === 'annotation-comment' ? target.annotationId : `note:${target.paperId}`
}

function sameView(a: TextView, b: TextView): boolean {
  return (
    a.comment === b.comment &&
    a.saveState === b.saveState &&
    a.canUndo === b.canUndo &&
    a.canRedo === b.canRedo
  )
}

const EMPTY_VIEW: TextView = { comment: '', saveState: 'clean', canUndo: false, canRedo: false }

/**
 * 共享文本草稿控制器 hook。target=null=无编辑目标（空态规约：不建控制器、不注册
 * 句柄，返回空视图）；换 target 键=换控制器（旧控制器随注册表绑定 effect 清理）。
 */
export function useAnnotationDraft(target: TextTargetKey | null, initial: string, opts: TextDraftOptions): AnnotationDraft {
  const key = target === null ? '' : textTargetId(target)
  const optsRef = useRef(opts)
  optsRef.current = opts
  const pasteRef = useRef(false)
  const holderRef = useRef<{ key: string; ctl: TextController } | null>(null)
  const [view, setView] = useState<{ key: string; value: TextView } | null>(null)

  // 空 target：释放控制器引用（旧控制器随注册表绑定 effect 清理销毁）
  if (target === null) holderRef.current = null
  // 控制器按 target 键创建（同键复用——实例驻 ref；换键随注册表绑定 effect 清理旧控制器）
  if (target !== null && (holderRef.current === null || holderRef.current.key !== key)) {
    const ctl: TextController = new TextController(target, initial, {
      persist: (v) => optsRef.current.onAutosave(v, ctl.target),
      persistRaw: (v) => optsRef.current.onAutosaveRaw(v, ctl.target),
      historyWriteRaw: (v) => {
        const o = optsRef.current
        return (o.onHistoryWriteRaw ?? o.onAutosaveRaw)(v, ctl.target)
      },
      mirror: (v, key, persisted) => optsRef.current.mirror?.(v, key, persisted),
      onSessionEnd: () => optsRef.current.onSessionEnd?.(ctl.target),
      // [B4-A R2 §2.5 #1/#16-#17] 文本输入/undo-redo 成功→该 tab U 置位
      // （批注 comment 与总评 contentMd 两 target 同一写点——宿主零接线差异）
      onUserEdit: () => useReaderStore.getState().markTabUnfinalized(ctl.target.paperId),
      onChange: () => setView((prev) => {
        const next = ctl.view()
        return prev !== null && prev.key === key && sameView(prev.value, next) ? prev : { key, value: next }
      })
    })
    if (opts.initialPersisted === false) ctl.syncExternal(initial, false)
    holderRef.current = { key, ctl }
  }
  // 空 target 不取控制器
  const ctl = holderRef.current !== null && target !== null ? holderRef.current.ctl : null
  const registryKey = target !== null && ctl !== null ? textDraftRegistryKey(target) : null

  // [F-VISFB-12] 挂载期注册表交互（恢复 H1/句柄 H5/卸载注册 R1——绑定居注册表件）
  useTextDraftRegistryBinding({
    id: registryKey,
    initial,
    attach: () => ctl?.attach(),
    getComment: () => ctl?.view().comment ?? '',
    getLastSaved: () => ctl?.persistedValue() ?? null,
    getState: () => ctl?.view().saveState ?? 'clean',
    applyRestore: (value, failed) => ctl?.restore(value, failed),
    wasRestored: () => ctl?.wasRestored() ?? false,
    flush: () => ctl?.flush() ?? Promise.resolve('clean'),
    dispose: () => ctl?.dispose(),
    closeout: () => ctl?.closeout(),
    closeoutOnUnmount: opts.closeoutOnUnmount === true,
    // [B4-A 回炉三 A] 操作层 history 命令的预 flush 准备（批注/总评两宿主同一注册点）；
    // registryKey≠null ⇔ ctl 在场（绑定 effect 内 id≠null 才注册）
    rawPreflush: () => ({ paperId: ctl!.target.paperId, prepare: () => ctl!.flushPendingRaw() })
  })
  // 换 target 键后视图态随新键落位（控制器首帧视图入 state）
  useLayoutEffect(() => {
    setView({ key, value: ctl?.view() ?? EMPTY_VIEW })
  }, [key, ctl])

  const current = view !== null && view.key === key ? view.value : (ctl?.view() ?? EMPTY_VIEW)

  return {
    comment: current.comment,
    saveState: current.saveState,
    canUndo: current.canUndo,
    canRedo: current.canRedo,
    applyEdit: (next) => {
      const paste = pasteRef.current
      pasteRef.current = false
      ctl?.edit(next, { paste })
    },
    markPaste: () => {
      pasteRef.current = true
      // 粘贴事件与其 input 同任务派发；宏任务后复位——空粘贴不误判下一次真实输入
      window.setTimeout(() => {
        pasteRef.current = false
      }, 0)
    },
    undoEdit: () => ctl?.undo() ?? Promise.resolve(false),
    redoEdit: () => ctl?.redo() ?? Promise.resolve(false),
    handleCompositionStart: () => ctl?.compositionStart(),
    handleCompositionEnd: () => ctl?.compositionEnd(),
    handleBlur: () => ctl?.blur(),
    syncExternal: (value, persisted) => ctl?.syncExternal(value, persisted),
    flush: () => ctl?.flush() ?? Promise.resolve('clean')
  }
}
