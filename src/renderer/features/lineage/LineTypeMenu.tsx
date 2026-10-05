// b3: P7-H
/**
 * [F-LGRAPH-01②U2] LineTypeMenu —— 线型列表（挂 [实线/虚线] 展开钮锚槽内，
 * mockup §3.3 二轮批复：CAD 式扁平列表——一色一行=色线样+名称；6 色固定
 * 上限不可增行；行内点击名称=改名（**一改名=一编辑单元**入撤销栈——
 * saveLineTypeNames 暂存）；点行=选为该 kind 当前线色（收起+图标变色+✓——
 * [F-UIRES-03 C1] per-kind 写）。纯受控子件（工具态/名经 props；写路径上抛）。
 * 不可增行（无「＋新建」）。
 * [F-UIRES-03 C1] 同件增出 ExpandButton（色板族拆件——展开 chevron 钮与
 * 列表同域；LineageToolbar 250 行红线收纳）。
 */
import { useEffect, useRef, useState } from 'react'
import { LINE_TYPE_COLORS } from '@shared/models/lineage'
import type { LineTypeKind } from './lineage-view.store'
import { ICON_CHEVRON_DOWN } from '../../shared/icons'
import { useComposingCommit } from '../../shared/inline-keys'

/** [F-UIRES-03 C1] 展开 chevron 钮（色板挂载 toggle——aria-expanded 随
 *  paletteFor；aria-label「展开色板」；saving 锁定同组禁用；[RR1-W1]
 *  .syn-icon-btn=svg 规格类唯一供应者（icons.tsx D7——stroke currentColor/
 *  fill none/线宽 1.6 走 theme-buttons.css；同排 hand/undo/redo 先例对齐） */
export function ExpandButton(props: {
  kind: LineTypeKind
  open: boolean
  lock: boolean
  onToggle(kind: LineTypeKind): void
}): JSX.Element {
  return (
    <button
      type="button"
      className={
        props.open ? 'lg-btn ghost lg-expand syn-icon-btn on' : 'lg-btn ghost lg-expand syn-icon-btn'
      }
      data-testid={`lineage-tool-${props.kind}-expand`}
      disabled={props.lock}
      aria-expanded={props.open}
      aria-label="展开色板"
      title="展开色板"
      onClick={() => props.onToggle(props.kind)}
    >
      {ICON_CHEVRON_DOWN}
    </button>
  )
}

export function LineTypeMenu(props: {
  /** 6 色行名（lineage.store lineTypeNames——恰 6 与色板 zip） */
  names: string[]
  /** 当前线型色（✓ 指示行） */
  currentColor: string
  /** 列表挂载面（展开钮锚槽——solid/dashed 由容器传） */
  anchorKind: 'solid' | 'dashed'
  /** 选行（收起+该 kind 当前色变——容器承接 per-kind 写） */
  onPick(color: string): void
  /** 行内改名提交（一改名=一编辑单元——容器承接 saveLineTypeNames） */
  onRename(index: number, name: string): void
  /** 点外部收起（[F-UIRES-03 C1] 该次点击不吞——事件正常路由；收起语义由容器承接） */
  onOutside(): void
}): JSX.Element {
  const { names, currentColor } = props
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)
  // [回炉 R12] IME 守卫+序 B 补提交（INV-85 全域必备——TagEditor 范式）
  // ——F-UIRES-02 迁 shared/inline-keys 单源（compositionend 补提交取 DOM 值）
  const composing = useComposingCommit(inputRef, () => commitRename(inputRef.current?.value))

  // 点外部收起（[F-UIRES-03 C1] delta-W3b——该次点击**不吞**：本监听只收板，
  // 事件正常路由（点卡=锚选/点空白=平移，关板为伴随效果）；排除域=色板 DOM
  // 与展开 chevron 钮外全域（原 A12 排除 tool 图标本体钮随「点图标=armed+
  // 列表展开」语义退役改为排除 chevron——图标钮点击属点外部（toggleLineTool
  // 切模式本就收板，双径同果不冲突））
  useEffect(() => {
    const onDoc = (e: MouseEvent): void => {
      const t = e.target
      if (
        t instanceof Element &&
        (rootRef.current?.contains(t) === true ||
          t.closest('[data-testid="lineage-tool-solid-expand"]') !== null ||
          t.closest('[data-testid="lineage-tool-dashed-expand"]') !== null)
      ) {
        return
      }
      props.onOutside()
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [props])

  /** 提交改名（nameOverride=序 B 补提交的 DOM 定案文本——state 可能滞后） */
  const commitRename = (nameOverride?: string): void => {
    if (editingIndex === null) return
    const idx = editingIndex
    const name = (nameOverride ?? draft).trim()
    setEditingIndex(null)
    if (name === '' || name === names[idx]) return // 空名/未变=零写
    props.onRename(idx, name)
  }

  return (
    <div className="linetype-list" data-testid="lineage-linetype-list" ref={rootRef}>
      {LINE_TYPE_COLORS.map((color, i) => {
        const on = color === currentColor
        return (
          <div
            className={on ? 'linetype-row on' : 'linetype-row'}
            data-testid="lineage-linetype-row"
            data-color={color}
            key={color}
            onClick={() => {
              if (editingIndex !== null) {
                commitRename()
                return
              }
              props.onPick(color)
            }}
          >
            <i className="linetype-sample" style={{ borderTop: `2px solid ${color}`, borderBottomStyle: props.anchorKind === 'dashed' ? 'dashed' : undefined }} />
            {editingIndex === i ? (
              <input
                className="linetype-name-input"
                data-testid="lineage-linetype-name-input"
                value={draft}
                autoFocus
                ref={inputRef}
                onChange={(e) => setDraft(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onCompositionStart={composing.onCompositionStart}
                onCompositionEnd={composing.onCompositionEnd}
                onKeyDown={(e) => {
                  // IME 组词确认回车不提交（nativeEvent.isComposing——AnnotationEditor 范式）
                  if (e.nativeEvent.isComposing) return
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    commitRename()
                  }
                  if (e.key === 'Escape') setEditingIndex(null)
                }}
                onBlur={() => {
                  // 组词中失焦不提交（compositionend 补提交承载）；复位 ref 防
                  // 悬空哑化（compositionend 漏发——k1'-N2 同型）
                  if (composing.composingRef.current) {
                    composing.composingRef.current = false
                    return
                  }
                  commitRename()
                }}
              />
            ) : (
              <span
                className="linetype-name"
                data-testid="lineage-linetype-name"
                title="点击重命名"
                onClick={(e) => {
                  e.stopPropagation()
                  setEditingIndex(i)
                  setDraft(names[i] ?? '')
                }}
              >
                {names[i] ?? ''}
              </span>
            )}
            {on && <span className="linetype-check">✓</span>}
          </div>
        )
      })}
    </div>
  )
}
