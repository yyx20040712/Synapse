/**
 * [批 tagrows→F-UIRES-03 B1 2026-10-05] TagDropdownRow —— 标签下拉行
 * （TagDropdown 拆件；B1 批改版：行常态=左椭圆 chip+右「编辑」文字钮；
 * 名称/颜色分离入口与右键菜单随批退役——「编辑」钮=唯一编辑入口）。
 *
 * ── 行为层 ──
 * - 行常态：[勾选框 role=checkbox aria-checked][椭圆 chip][mono 计数]
 *   [「编辑」钮]。勾选只归 checkbox——chip/计数/行空白点击零筛选。
 *   chip 着色=tagChipStyle 域内单源（色底=自身色 18%（hex2e）+同色深阶文字
 *   （color-mix 向 --ink——亮主题=深阶/暗主题自适应）；null=
 *   TAG_COLOR_NONE_DISPLAY 默认灰系——设计稿 §2 B1/F6，INV-86 着色单源精神）。
 * - 行编辑态（点「编辑」进）：名称 input（预填现名+聚焦全选，maxLength=
 *   TAG_NAME_MAX——TagRenameDialog 校验规则承接）+色点阵（TAG_COLOR_PRESETS
 *   8 圆点+「默认」点=null——原 TagColorPopover「恢复默认」行为承接〔F6+N10〕）
 *   +「保存」钮（dirty=名称或色任一变化才启用；空白名恒禁用）。
 * - Enter=保存（tags.store renameTag/setTagColor 通道——名变走 rename、色变走
 *   setColor、双变两通道顺序执行）；Esc=取消还原；**失焦=恢复原值不保存**
 *   （无 autosave——批 tagrows「不慎点到时失焦即可恢复」票面锚）；焦点行内
 *   转移（点色点/保存钮）不还原——relatedTarget 在行内即守。
 * - 空白/同名同色→零通道调用；失败 toast+编辑保持开（S6 同型）；busy 飞行中
 *   失焦不恢复（N1 同型——isPending 门）+保存双发仅一次（S8 busy 守卫）。
 * - isComposing 守卫全域（INV-85 同类面）：inlineKeyDown 键面单源；组词期
 *   Enter no-op。成功经 props.onMutated 上抛（INV-53 顺序归 TagDropdown——
 *   disappearedId 恒 null：id 稳定）。
 *
 * ── 接口层 ──
 * - export function TagDropdownRow(props: { tag: TagWithCount; checked: boolean;
 *     editing: boolean; onToggle(): void; onStartEdit(): void; onEndEdit(): void;
 *     onMutated(): void }): JSX.Element
 */
import { useEffect, useRef, useState } from 'react'
import { TAG_COLOR_PRESETS, TAG_COLOR_NONE_DISPLAY } from '@shared/constants'
import { TAG_NAME_MAX } from '@shared/models/tag'
import { inlineKeyDown, useComposingCommit } from '../../shared/inline-keys'
import { showToast } from '../../shared/ui/Toast'
import { useTagsStore, type TagWithCount } from './tags.store'
import { useBusyGuard } from './TagLifecycle'

/**
 * [F-UIRES-03 B1] chip 着色公式（tags 域内单源）：色底=自身色 18%（hex2e
 * 后缀）+同色深阶文字（color-mix 向 --ink——亮主题=同色深阶、暗主题自适应
 * 浅阶）；null=TAG_COLOR_NONE_DISPLAY 默认灰系。INV-86「着色单源禁各面自写
 * hex 拼接」精神承接（chip 面公式与 tagColorStyle（徽标/chip 旧面）分立——
 * 两面视觉形态不同源各自单源）。
 */
function tagChipStyle(color: string | null): { background: string; color: string } {
  const base = color ?? TAG_COLOR_NONE_DISPLAY
  return { background: `${base}2e`, color: `color-mix(in srgb, ${base} 60%, var(--ink))` }
}

export function TagDropdownRow(props: {
  tag: TagWithCount
  checked: boolean
  editing: boolean
  onToggle(): void
  /** 点「编辑」钮=请求进入编辑态（宿主记账 editingId——行间互斥） */
  onStartEdit(): void
  /** 退出编辑态（还原/保存成功/取消——宿主清 editingId） */
  onEndEdit(): void
  /** 写路径成功上抛（宿主链 handleMutated(null)——id 稳定） */
  onMutated(): void
}): JSX.Element {
  const { tag, checked, editing } = props
  const [value, setValue] = useState(tag.name)
  const [color, setColor] = useState<string | null>(tag.color)
  const guard = useBusyGuard()
  const renameTag = useTagsStore((s) => s.renameTag)
  const setTagColor = useTagsStore((s) => s.setTagColor)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const rowRef = useRef<HTMLDivElement | null>(null)
  // Esc 收起标记（跳过紧随失焦——unmount 不触发 blur，防御窗口在）
  const skipBlurRef = useRef(false)
  // 序 B 补提交恒 no-op（本面 blur=恢复——见头注；单源复用取其 composingRef 守卫）
  const composing = useComposingCommit(inputRef, () => undefined)
  // 编辑态进入沿（false→true 转变时重置草稿——store 刷新不动在编辑草稿）
  const prevEditing = useRef(false)

  const trimmed = value.trim()
  const dirty = trimmed !== tag.name || color !== tag.color

  useEffect(() => {
    if (editing && !prevEditing.current) {
      setValue(tag.name)
      setColor(tag.color)
      // [RR1-W1] skipBlur 跨编辑会话清零：上一会话 Esc 路径武装的标志若滞留，
      // 会吞掉本会话首次行外失焦（不还原不收编辑态）——进编辑沿重置
      skipBlurRef.current = false
      inputRef.current?.select()
    }
    prevEditing.current = editing
  }, [editing, tag])

  /** 退出编辑态（还原原值——草稿丢弃） */
  function finish(): void {
    props.onEndEdit()
  }

  async function save(): Promise<void> {
    if (trimmed === '' || !dirty) {
      finish()
      return
    }
    if (!guard.begin()) return
    if (trimmed !== tag.name) {
      const r = await renameTag(tag.id, trimmed)
      if (!r.ok) {
        // S6 同型：toast+编辑保持开（输入保留），发起方 toast 契约
        showToast(r.error.message, 'error')
        guard.end()
        return
      }
    }
    if (color !== tag.color) {
      const r = await setTagColor(tag.id, color)
      if (!r.ok) {
        showToast(r.error.message, 'error')
        guard.end()
        return
      }
    }
    guard.end()
    finish()
    props.onMutated()
  }

  if (!editing) {
    return (
      <div className="lib-dd-row">
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          aria-label={`筛选：${tag.name}`}
          className="lib-dd-cb"
          onClick={props.onToggle}
        />
        <span className="lib-dd-chip" style={tagChipStyle(tag.color)}>
          {tag.name}
        </span>
        <span className="lib-dd-ct">{tag.paperCount}</span>
        <button
          type="button"
          className="lib-dd-edit-btn"
          aria-label={`编辑标签：${tag.name}`}
          onClick={props.onStartEdit}
        >
          编辑
        </button>
      </div>
    )
  }

  return (
    <div
      className="lib-dd-row lib-dd-row-edit"
      ref={rowRef}
      onBlur={(e) => {
        if (skipBlurRef.current) {
          skipBlurRef.current = false
          return
        }
        // busy 飞行中失焦不恢复（N1 同型）
        if (guard.isPending()) return
        // 焦点行内转移（点色点/保存钮）不还原——relatedTarget 在行内即守
        const to = e.relatedTarget
        if (to instanceof Node && rowRef.current?.contains(to)) return
        composing.composingRef.current = false
        // 失焦=恢复原值不保存（无 autosave——批 tagrows 票面锚）
        finish()
      }}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={`筛选：${tag.name}`}
        className="lib-dd-cb"
        onClick={props.onToggle}
      />
      <div className="lib-dd-edit-box">
        <div className="lib-dd-edit-line">
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
          />
          <button
            type="button"
            className="lib-dd-save"
            disabled={guard.busy || !dirty || trimmed === ''}
            onClick={() => {
              // 组词期不保存（INV-85——组词中文本非定案）
              if (composing.composingRef.current) return
              void save()
            }}
          >
            保存
          </button>
        </div>
        <div className="lib-dd-dots" role="group" aria-label={`标签颜色：${tag.name}`}>
          {TAG_COLOR_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`预设颜色 ${c}`}
              aria-pressed={color === c}
              className="lib-dd-sw"
              style={{ background: c }}
              disabled={guard.busy}
              onClick={() => setColor(c)}
            />
          ))}
          <button
            type="button"
            aria-label="默认"
            aria-pressed={color === null}
            className="lib-dd-sw lib-dd-sw-def"
            disabled={guard.busy}
            onClick={() => setColor(null)}
          />
        </div>
      </div>
    </div>
  )
}
