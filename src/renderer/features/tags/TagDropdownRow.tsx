/**
 * [批 tagrows 2026-10-03] TagDropdownRow —— 标签下拉行（TagDropdown 拆件）。
 * 票面（用户原话）：「每一行显示为待勾选框、名称框、颜色框，名称和颜色均可
 * 直接编辑，编辑后点保存即可，不慎点到时失焦即可恢复，勾选逻辑只由待勾选框
 * 负责。」
 *
 * ── 行为层 ──
 * - 三段行：[勾选框 role=checkbox aria-checked][名称区][颜色框]+mono 计数。
 *   勾选只归 checkbox——名称区/颜色框点击零筛选（点击=进各自编辑面）。
 * - 名称编辑：点击名称区→行内 input（预填现名+聚焦全选）；Enter=保存（tags.store
 *   renameTag 通道）+编辑态行内确认钮（✓ 勾图标批 B 范式，title=保存，mousedown
 *   preventDefault 防夺焦双发+组词守卫）；Esc=取消恢复；**失焦=恢复原值不保存**
 *   （票面「不慎点到时失焦即可恢复」——与批 A 三键范式「失焦=提交」相反，
 *   票面明文差异锚，勿范式误统一）；空白/同名→退出编辑零通道调用；失败 toast+
 *   编辑保持开（S6 同型）；busy 飞行中失焦不恢复（N1 同型——isPending 门）。
 * - 颜色编辑：点击颜色框→行内小色板（宿主 TagDropdown 承载弹出层）。
 * - rename 成功经 props.onRenamed 上抛（INV-53 顺序归 TagDropdown——disappearedId
 *   恒 null：id 稳定）。
 * - isComposing 守卫全域（INV-85 同类面）：inlineKeyDown 键面单源；组词期 ✓ 钮
 *   点击 no-op（composingRef）。序 B 补提交在本面恒 no-op——blur=恢复面（非
 *   提交面）：失焦已恢复原值，组词定案文本随编辑态收起丢弃。
 * - 右键行=改名+颜色两入口（P-11 承接）——onContextMenu 上抛宿主 TagRowMenu。
 *
 * ── 接口层 ──
 * - export function TagDropdownRow(props: { tag: TagWithCount; checked: boolean;
 *     onToggle(): void; onContextMenu(e: MouseEvent): void;
 *     onOpenColor(tag: TagWithCount, anchor: { x: number; y: number }): void;
 *     onRenamed(): void }): JSX.Element
 */
import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { TAG_NAME_MAX } from '@shared/models/tag'
import { ICON_CHECK } from '../../shared/icons'
import { inlineKeyDown, useComposingCommit } from '../../shared/inline-keys'
import { showToast } from '../../shared/ui/Toast'
import { useTagsStore, type TagWithCount } from './tags.store'
import { useBusyGuard } from './TagLifecycle'

export function TagDropdownRow(props: {
  tag: TagWithCount
  checked: boolean
  onToggle(): void
  onContextMenu(e: MouseEvent): void
  onOpenColor(tag: TagWithCount, anchor: { x: number; y: number }): void
  /** rename 成功上抛（宿主链 handleMutated(null)——id 稳定） */
  onRenamed(): void
}): JSX.Element {
  const { tag, checked } = props
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(tag.name)
  const guard = useBusyGuard()
  const renameTag = useTagsStore((s) => s.renameTag)
  const inputRef = useRef<HTMLInputElement | null>(null)
  // Esc 收起标记（跳过紧随失焦——unmount 不触发 blur，防御窗口在）
  const skipBlurRef = useRef(false)
  // 序 B 补提交恒 no-op（本面 blur=恢复——见头注；单源复用取其 composingRef 守卫）
  const composing = useComposingCommit(inputRef, () => undefined)

  // 进编辑即聚焦全选（票面：预填现名，聚焦全选）
  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  function finish(): void {
    setEditing(false)
  }

  async function save(): Promise<void> {
    const trimmed = value.trim()
    if (trimmed === '' || trimmed === tag.name) {
      finish()
      return
    }
    if (!guard.begin()) return
    const r = await renameTag(tag.id, trimmed)
    if (r.ok) {
      guard.end()
      finish()
      props.onRenamed()
    } else {
      // S6 同型：toast+编辑保持开（输入保留），发起方 toast 契约
      showToast(r.error.message, 'error')
      guard.end()
    }
  }

  return (
    <div
      className={`lib-dd-row${checked ? ' on' : ''}`}
      onContextMenu={(e) => props.onContextMenu(e)}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={`筛选：${tag.name}`}
        className="lib-dd-cb"
        onClick={props.onToggle}
      />
      {editing ? (
        <>
          <input
            aria-label={`重命名标签：${tag.name}`}
            maxLength={TAG_NAME_MAX}
            className="lib-dd-edit"
            autoFocus
            ref={inputRef}
            value={value}
            disabled={guard.busy}
            onChange={(e) => setValue(e.target.value)}
            onCompositionStart={composing.onCompositionStart}
            onCompositionEnd={composing.onCompositionEnd}
            onKeyDown={(e) => {
              inlineKeyDown(
                e,
                () => void save(),
                () => guard.requestClose(finish),
                () => {
                  skipBlurRef.current = true
                }
              )
              // Enter/Esc 不外溢（含组词期）：面板级 Esc 分层不吃本面按键
              if (e.key === 'Enter' || e.key === 'Escape') e.stopPropagation()
            }}
            onBlur={() => {
              if (skipBlurRef.current) {
                skipBlurRef.current = false
                return
              }
              // busy 飞行中失焦不恢复（N1 同型）
              if (guard.isPending()) return
              composing.composingRef.current = false
              // 失焦=恢复原值不保存（票面明文——与批 A 失焦=提交相反）
              finish()
            }}
          />
          <button
            type="button"
            className="lib-dd-ok syn-icon-btn"
            title="保存"
            // mousedown 阻焦点转移：焦点留 input——click 单路保存（防失焦双发）
            onMouseDown={(e) => e.preventDefault()}
            disabled={guard.busy || value.trim() === ''}
            onClick={() => {
              // 组词期不保存（INV-85——组词中文本非定案）
              if (composing.composingRef.current) return
              void save()
            }}
          >
            {ICON_CHECK}
            <span className="sr-only">保存</span>
          </button>
        </>
      ) : (
        <button type="button" className="lib-dd-nm-btn" onClick={() => {
          setValue(tag.name)
          setEditing(true)
        }}>
          <span className="lib-dd-nm">{tag.name}</span>
        </button>
      )}
      <span className="lib-dd-ct">{tag.paperCount}</span>
      <button
        type="button"
        aria-label={`编辑颜色：${tag.name}`}
        className="lib-dd-dot"
        style={tag.color !== null ? { background: tag.color } : undefined}
        onClick={(e) => props.onOpenColor(tag, { x: e.clientX, y: e.clientY })}
      />
    </div>
  )
}
