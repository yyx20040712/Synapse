// b1: 前端改造第三期 B1 批
/**
 * [B1] ReaderToolbarNav —— 阅读器工具栏翻页组（上一页/页码显示/页码跳转/
 * 下一页；自 ReaderToolbar 拆出——双侧栏开合两钮入栏后超 250 组件红线，
 * 拆最大自持组，行为零变）。
 *
 * ── 行为层 ──
 * - 页码显示 1 基（store 内部 0 基，边界夹取由 store.setPage 兜底）；
 *   上/下页步进=props.pageStep（双页装配面传 2=翻面语义）
 * - 页码跳转提交：失焦或回车；非法输入回显当前页
 * - [F-TAGS-01 回炉 R1/R2] 组词态镜像：blur 与 Enter 同守卫（d1-N3——
 *   isComposing/compositionRef 双面）。数字面只守卫不补提交（页码非用户
 *   署名数据、无污染面；组词被失焦打断=静默丢弃，回显由外部翻页
 *   useEffect 自愈）
 * - 外部翻页（键盘/目录跳转/越界自愈）同步回输入框
 *
 * ── 接口层 ──
 * - export function ReaderToolbarNav(props: { page: number; totalPages: number;
 *     pageStep: number; onNavigate(page: number): void }): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 纯受控组件（沿 ReaderToolbar 语汇：.rdr-tool-btn/.rdr-num）；IME 守卫
 *   受锁断言随 reader-toolbar-icons.test R6 组零迁移（查询面
 *   input[aria-label="跳转到页"] 不变）
 */
import { useEffect, useRef, useState } from 'react'
import { ICON_NEXT, ICON_PREV } from './toolbar-icons'

export function ReaderToolbarNav(props: {
  page: number
  totalPages: number
  pageStep: number
  onNavigate: (page: number) => void
}): JSX.Element {
  const { page, totalPages, pageStep, onNavigate } = props
  const [pageInput, setPageInput] = useState(String(page + 1))
  const pageComposingRef = useRef(false)

  // 外部翻页（键盘/目录跳转/越界自愈）同步回输入框
  useEffect(() => {
    setPageInput(String(page + 1))
  }, [page])

  /** 页码跳转提交：失焦或回车；非法输入回显当前页（夹取由 store 兜底） */
  const commitPage = (): void => {
    const v = Number.parseInt(pageInput, 10)
    if (Number.isNaN(v)) {
      setPageInput(String(page + 1))
      return
    }
    onNavigate(v - 1)
    setPageInput(String(page + 1))
  }

  const btn = 'rdr-tool-btn shrink-0 disabled:opacity-50'

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        className={btn}
        title="上一页"
        disabled={page <= 0}
        onClick={() => onNavigate(page - pageStep)}
      >
        {ICON_PREV}
        <span className="sr-only">上一页</span>
      </button>
      <input
        className="rdr-num w-12 rounded border px-1 py-0.5 text-center text-xs"
        style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}
        value={pageInput}
        aria-label="跳转到页"
        onChange={(e) => setPageInput(e.target.value)}
        onCompositionStart={() => { pageComposingRef.current = true }}
        onCompositionEnd={() => { pageComposingRef.current = false }}
        onBlur={() => {
          if (pageComposingRef.current) return
          commitPage()
        }}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing) return
          if (e.key === 'Enter') commitPage()
        }}
      />
      <span className="rdr-num" style={{ color: 'var(--text-dim)' }}>
        / {totalPages > 0 ? totalPages : '…'}
      </span>
      <button
        type="button"
        className={btn}
        title="下一页"
        disabled={totalPages > 0 && page >= totalPages - 1}
        onClick={() => onNavigate(page + pageStep)}
      >
        {ICON_NEXT}
        <span className="sr-only">下一页</span>
      </button>
    </div>
  )
}
