// b3: P7-H
/**
 * [F-LGRAPH-01②U2] LineTypeMenu —— 线型列表（挂 [实线/虚线] 图标正下方，
 * mockup §3.3 二轮批复：CAD 式扁平列表——一色一行=色线样+名称；6 色固定
 * 上限不可增行；行内点击名称=改名（**一改名=一编辑单元**入撤销栈——
 * saveLineTypeNames 暂存）；点行=选为当前线型色（收起+图标变色+✓——A12）。
 * 纯受控子件（工具态/名经 props；写路径上抛）。不可增行（无「＋新建」）。
 */
import { useEffect, useRef, useState } from 'react'
import { LINE_TYPE_COLORS } from '@shared/models/lineage'
import { useComposingCommit } from '../../shared/inline-keys'

export function LineTypeMenu(props: {
  /** 6 色行名（lineage.store lineTypeNames——恰 6 与色板 zip） */
  names: string[]
  /** 当前线型色（✓ 指示行） */
  currentColor: string
  /** 列表挂载面（图标锚——solid/dashed 由容器传） */
  anchorKind: 'solid' | 'dashed'
  /** 选行（收起+当前色变——容器承接） */
  onPick(color: string): void
  /** 行内改名提交（一改名=一编辑单元——容器承接 saveLineTypeNames） */
  onRename(index: number, name: string): void
  /** 点外部收起（A12——armed 保持；收起语义由容器承接） */
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

  // 点外部收起（A12——列表开时挂 document click；排除列表自身与图标按钮）
  useEffect(() => {
    const onDoc = (e: MouseEvent): void => {
      const t = e.target
      if (
        t instanceof Element &&
        (rootRef.current?.contains(t) === true ||
          t.closest('[data-testid="lineage-tool-solid"]') !== null ||
          t.closest('[data-testid="lineage-tool-dashed"]') !== null)
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
