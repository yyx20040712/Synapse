/**
 * [F-UIRES-02 批 A R1] inline-keys —— 行内输入键面+组词提交共通件
 * （src/renderer/shared 非受锁面；受锁=src/shared 跨进程契约）。
 *
 * - inlineKeyDown：自 FolderNavRows 模块私有提升（签名零变）——Enter 提交/
 *   Esc 取消（收起前 skipBlur 标记——防紧随失焦提交）+双键 preventDefault；
 *   isComposing 守卫即面即守（IME 组词确认回车不提交——e.key 组词期不可靠，
 *   以 nativeEvent.isComposing 判定）。
 * - useComposingCommit：composingRef+compositionStart/End+序 B 补提交
 *   （activeElement 判定）合一——原 TagEditor/EdgeMenu/LineTypeMenu 三份手写
 *   拷贝（INV-85⑥ 等价迁移；受锁 tag-editor 三路矩阵=行为保活验收线）。
 *   blur 路的组词拒绝+复位仍在消费面（各面 blur 提交链路差异不自持）。
 */
import { useRef } from 'react'
import type { KeyboardEvent, MutableRefObject, RefObject } from 'react'

/** 行内输入三键范式共通 keydown（isComposing 守卫——F-UIRES-02 范式即面即守） */
export function inlineKeyDown(
  e: KeyboardEvent<HTMLInputElement>,
  onEnter: () => void,
  onEsc: () => void,
  skipBlur: () => void
): void {
  if (e.nativeEvent.isComposing) return
  if (e.key === 'Enter') {
    e.preventDefault()
    onEnter()
  }
  if (e.key === 'Escape') {
    e.preventDefault()
    // Esc 收起前标记跳过失焦提交（unmount 不触发 blur，防御窗口在）
    skipBlur()
    onEsc()
  }
}

/** useComposingCommit 返回面（composingRef 供消费面 blur/按钮路同守卫） */
export interface ComposingCommit {
  composingRef: MutableRefObject<boolean>
  onCompositionStart(): void
  onCompositionEnd(): void
}

/**
 * 组词守卫+序 B 补提交 hook：compositionstart/end 维护 composingRef；
 * compositionend 时 activeElement 判定——聚焦态常规组词确认不提交（Enter/
 * blur 路自负），失焦后到达（序 B：blur 先被拒→compositionend 后到）补提交。
 * commit 闭包每渲染镜像到 ref（取当次渲染语义——等价原内联拷贝非首渲染冻结）。
 */
export function useComposingCommit(
  inputRef: RefObject<HTMLInputElement | null>,
  commit: () => void
): ComposingCommit {
  const composingRef = useRef(false)
  const commitRef = useRef(commit)
  commitRef.current = commit
  return {
    composingRef,
    onCompositionStart: () => {
      composingRef.current = true
    },
    onCompositionEnd: () => {
      composingRef.current = false
      // 序 B 补提交：定案文本由 commit 闭包自取 DOM 当前值（state 可能滞后）
      if (document.activeElement !== inputRef.current) {
        commitRef.current()
      }
    }
  }
}
