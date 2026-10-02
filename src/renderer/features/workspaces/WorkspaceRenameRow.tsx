/**
 * [F-UIRES-02 R2] WorkspaceRenameRow —— 课题卡行内重命名编辑行
 * （WorkspacesPage 组件 250 行红线拆件——行为层规约随迁）。
 *
 * - 三键全套（shared/inline-keys 键面单源）：Enter 提交 / Esc 取消（先
 *   skipBlur 标记——防紧随失焦提交）/ isComposing 守卫。
 * - 失焦提交（过标记门）；组词中失焦拒绝+复位（序 B 补提交经
 *   useComposingCommit）。三路提交统一取 DOM 当前值显式传入父级
 *   （[RR1-2] 序 B 下 state 滞后——EdgeMenu/LineTypeMenu 同型防时序窗口）。
 * - 确定/取消钮 mousedown preventDefault（TagEditor:213 先例——焦点留
 *   input 防点击夺焦双发）；取消=直设收起（编辑丢弃）。
 * - skipBlur/组词 ref 住本件：挂载即新编辑会话（标记不跨会话驻留——
 *   useFolderNavEdit 会话开口清零语义由挂载边界承载）。
 */
import { useRef } from 'react'
import { WORKSPACE_NAME_MAX } from '@shared/ipc/schemas'
import { inlineKeyDown, useComposingCommit } from '../../shared/inline-keys'

export function WorkspaceRenameRow(props: {
  draft: string
  onDraftChange(v: string): void
  /** 提交（value=DOM 定案值——序 B 下 state 滞后，恒取 inputRef 当前值） */
  onSubmit(value: string): void
  onCancel(): void
}): JSX.Element {
  const { draft, onDraftChange, onSubmit, onCancel } = props
  const inputRef = useRef<HTMLInputElement | null>(null)
  // 提交取 DOM 当前值（Enter/blur/序 B 三路统一——EdgeMenu diff 形态同型；
  // Enter 路 DOM=state 恒等零变）
  const currentValue = (): string => inputRef.current?.value ?? draft
  const composing = useComposingCommit(inputRef, () => onSubmit(currentValue()))
  // Esc 收起标记（跳过紧随失焦提交——unmount 不触发 blur，防御窗口在）
  const skipBlurRef = useRef(false)
  return (
    <div className="ws-edit">
      <input
        aria-label="课题名称"
        maxLength={WORKSPACE_NAME_MAX}
        value={draft}
        autoFocus
        ref={inputRef}
        onChange={(e) => onDraftChange(e.target.value)}
        onCompositionStart={composing.onCompositionStart}
        onCompositionEnd={composing.onCompositionEnd}
        onKeyDown={(e) =>
          inlineKeyDown(
            e,
            () => onSubmit(currentValue()),
            onCancel,
            () => {
              skipBlurRef.current = true
            }
          )
        }
        onBlur={() => {
          // Esc 收起过标记门；组词中失焦拒绝+复位（序 B 补提交承载）
          if (skipBlurRef.current) {
            skipBlurRef.current = false
            return
          }
          if (composing.composingRef.current) {
            composing.composingRef.current = false
            return
          }
          onSubmit(currentValue())
        }}
      />
      <button
        type="button"
        className="ws-rename-ok"
        // mousedown 阻焦点转移：焦点留 input——click 单路提交（防双发）
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          // [RR2-1] 组词期不提交（INV-85——EdgeMenu 确定钮同款；组词中文本
          // 非定案，序 B 补提交承载）
          if (composing.composingRef.current) return
          onSubmit(currentValue())
        }}
      >
        确定
      </button>
      <button
        type="button"
        className="ws-rename-cancel"
        // 同上：preventDefault 防点击夺焦触发 blur 先提交；取消=直设收起
        onMouseDown={(e) => e.preventDefault()}
        onClick={onCancel}
      >
        取消
      </button>
    </div>
  )
}
