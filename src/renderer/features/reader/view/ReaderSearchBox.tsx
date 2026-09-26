/**
 * [P7E-03] ReaderSearchBox —— 页内搜索框（纯受控组件；props 全量注入，
 * store 订阅在装配面 useReaderSearch）。
 *
 * ── 行为层 ──
 * - 键位（票面 §①）：Enter → query.trim()!==lastSubmitted 或 state!=='done' ?
 *   onSubmit(query) : onNext()（Chrome 式：首次回车=搜索，再回车=下一处；
 *   [门一 R2-W1] 比较用 trim 后口径——store 侧 lastSubmitted 已 trim，未 trim
 *   的 query 含首尾空白时会恒走 onSubmit 死循环重提交）；Shift+Enter=上一处
 *   （同规则）；Esc=onClose；[门一 R2-W2] IME 组合态守卫（首行
 *   isComposing——中文拼音 Enter 确认候选词/Esc 取消候选词不进搜索语义，
 *   Enter/Esc 全守）。输入框内 Ctrl+F=本地重聚焦+全选（keymap 层 editable
 *   避让使 document 级 Ctrl+F 不达——S12 的「面板已开再按」在焦点已驻
 *   输入框时的等价路径，preventDefault 阻原生 find）。
 * - 展示：计数 `${activeIndex+1}/${matchCount}`（0 命中=「0/0」+「无匹配」）；
 *   searching 态=计数位「搜索中…」；‹ › × 三按钮（aria-label 上一个/下一个/
 *   关闭搜索）。focusSeq 变化 → input.focus()+select()（Ctrl+F 重开聚焦全选）。
 * - idle 态自隐（受控组件返回 null——装配面恒挂，面板开合由 state 驱动）。
 *
 * ── 接口层 ──
 * - export function ReaderSearchBox(props: { state: ReaderSearchStateName;
 *   query; lastSubmitted; matchCount; activeIndex; focusSeq;
 *   onQueryChange(q); onSubmit(q); onPrev(); onNext(); onClose }):
 *   JSX.Element | null
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 纯受控零 store 依赖（可测性）；tests/unit/renderer/reader-search-ui.test.tsx
 */
import { useEffect, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import type { ReaderSearchStateName } from './reader-search.store'

export function ReaderSearchBox(props: {
  state: ReaderSearchStateName
  query: string
  lastSubmitted: string
  matchCount: number
  activeIndex: number
  focusSeq: number
  onQueryChange(q: string): void
  onSubmit(q: string): void
  onPrev(): void
  onNext(): void
  onClose(): void
}): JSX.Element | null {
  const { state, query, lastSubmitted, matchCount, activeIndex, focusSeq, onQueryChange, onSubmit, onPrev, onNext, onClose } = props
  const inputRef = useRef<HTMLInputElement>(null)

  // focusSeq 变化（open()/Ctrl+F 再按）→ 聚焦+全选（S1/S12）
  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [focusSeq])

  if (state === 'idle') return null

  const onKeydown = (e: KeyboardEvent<HTMLInputElement>): void => {
    // [门一 R2-W2] IME 组合态守卫：拼音 Enter 确认候选/Esc 取消候选——不进搜索语义
    if (e.nativeEvent.isComposing) return
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      return
    }
    // 面板内 Ctrl+F：keymap 层 editable 避让不达——本地等价（重聚焦+全选）
    if (e.key.toLowerCase() === 'f' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      inputRef.current?.select()
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      // [门一 R2-W1] trim 口径一致：store 侧 lastSubmitted 已 trim（未 trim 比较
      // 会让含首尾空白的查询在 done 后每次 Enter 恒重提交）
      if (query.trim() !== lastSubmitted || state !== 'done') {
        onSubmit(query)
        return
      }
      if (e.shiftKey) {
        onPrev()
        return
      }
      onNext()
    }
  }

  const countText = state === 'searching' ? '搜索中…' : matchCount === 0 ? '0/0' : `${activeIndex + 1}/${matchCount}`
  const btn = 'syn-btn-ghost rounded px-1.5 py-0.5 text-xs'

  return (
    // [T3-P4] 搜索槽语汇=.rdr-search-slot（mockup .search-slot：ml-auto+panel
    // 底+line 描边+7px 圆角+min-width 190px——theme-reader.css 单源）；计数=
    // .rdr-search-count（accent+mono）；data-testid/输入/计数/三钮行为面零变
    <div data-testid="reader-search-box" className="rdr-search-slot">
      <input
        ref={inputRef}
        data-testid="reader-search-input"
        className="w-32 rounded px-1 text-xs outline-none"
        style={{ background: 'transparent', color: 'var(--text)' }}
        aria-label="页内搜索"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={onKeydown}
      />
      <span data-testid="reader-search-count" className="rdr-search-count">
        {countText}
      </span>
      {state === 'done' && matchCount === 0 ? (
        <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
          无匹配
        </span>
      ) : null}
      <button type="button" className={btn} aria-label="上一个" onClick={onPrev}>
        ‹
      </button>
      <button type="button" className={btn} aria-label="下一个" onClick={onNext}>
        ›
      </button>
      <button type="button" className={btn} aria-label="关闭搜索" onClick={onClose}>
        ×
      </button>
    </div>
  )
}
