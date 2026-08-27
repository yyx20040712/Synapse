// b3: P7-H
/**
 * [LG-03] LineageAddNodeDialog —— 添加节点对话框两型（Board 子组件）。
 *
 * 行为：①文献型=搜索选取 paper（library.list 既有通道直连——window.api 是
 * renderer 合法取数路径，文献库域取数不经 lineage.store 单源约，LG-04 头注
 * 同论证）→paperId 绑定+title/year 取元数据默认；②主题型=title 输入
 * （「阶段分组」语义，paperId null）。已在图中的 paper 过滤（同 paperId
 * 重复节点防呆——数据模型不禁止，消费方守卫）。搜索失败=列表型瞬态
 * （错误条+重试，INV-02）；空结果=空态文案非错误。确认后动作上抛——写路径
 * 收口 Board→store。
 */
import { useEffect, useState } from 'react'
import { api, unwrap, ApiClientError } from '../../api/client'
import { Dialog } from '../../shared/ui/Dialog'
import type { PaperSummary } from '@shared/models/paper'

export interface LineageAddNodeDialogProps {
  open: boolean
  /** 已在图中的 paperId 集（重复添加防呆过滤） */
  existingPaperIds: string[]
  onClose(): void
  onAddPaper(paper: { id: string; title: string; year: number | null }): void
  onAddTheme(title: string): void
}

type Mode = 'paper' | 'theme'

export function LineageAddNodeDialog(props: LineageAddNodeDialogProps): JSX.Element | null {
  const [mode, setMode] = useState<Mode>('paper')
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<PaperSummary[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [selected, setSelected] = useState<PaperSummary | null>(null)
  const [themeTitle, setThemeTitle] = useState('')
  const [retryToken, setRetryToken] = useState(0)

  // 搜索（文献型挂载即拉首批 20 条——空搜索=发现面；输入变化/重试重查）
  useEffect(() => {
    if (!props.open || mode !== 'paper') return
    let live = true
    setSearching(true)
    setSearchError(null)
    unwrap(api.library.list({ search: search === '' ? undefined : search, limit: 20 }))
      .then((r) => {
        if (!live) return
        setResults(r.items.filter((p) => !props.existingPaperIds.includes(p.id)))
        setSearching(false)
      })
      .catch((e: unknown) => {
        if (!live) return
        setSearchError(e instanceof ApiClientError ? e.message : '文献搜索失败')
        setSearching(false)
      })
    return () => {
      live = false
    }
  }, [props.open, mode, search, retryToken, props.existingPaperIds])

  const confirm = (): void => {
    if (mode === 'paper') {
      if (selected === null) return
      props.onAddPaper({ id: selected.id, title: selected.title, year: selected.year })
    } else {
      if (themeTitle.trim() === '') return
      props.onAddTheme(themeTitle.trim())
    }
    props.onClose()
  }

  const canConfirm = mode === 'paper' ? selected !== null : themeTitle.trim() !== ''

  return (
    <Dialog open={props.open} title="添加节点" onClose={props.onClose}>
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded border px-2 py-1 text-xs"
            style={mode === 'paper' ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : { borderColor: 'var(--border)', color: 'var(--text-dim)' }}
            onClick={() => { setMode('paper'); setSelected(null) }}
          >
            从文献库添加
          </button>
          <button
            type="button"
            data-testid="add-node-mode-theme"
            className="rounded border px-2 py-1 text-xs"
            style={mode === 'theme' ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : { borderColor: 'var(--border)', color: 'var(--text-dim)' }}
            onClick={() => setMode('theme')}
          >
            添加主题节点
          </button>
        </div>

        {mode === 'paper' ? (
          <div className="flex flex-col gap-2">
            <input
              data-testid="add-node-search"
              aria-label="搜索文献（标题/作者/摘要）"
              className="rounded border px-2 py-1 text-xs"
              style={{ borderColor: 'var(--border)' }}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelected(null) }}
            />
            {searchError !== null ? (
              <div role="alert" className="text-xs" style={{ color: 'var(--danger)' }}>
                {searchError}
                <button type="button" className="ml-2 underline" style={{ color: 'var(--accent)' }} onClick={() => setRetryToken((t) => t + 1)}>
                  重试
                </button>
              </div>
            ) : searching ? (
              <p className="text-xs" style={{ color: 'var(--text-dim)' }}>搜索中…</p>
            ) : results.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-dim)' }}>无匹配文献（或已在脉络图中）</p>
            ) : (
              <ul className="flex max-h-56 flex-col gap-1 overflow-auto">
                {results.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="w-full rounded border px-2 py-1 text-left text-xs"
                      style={selected?.id === p.id ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)' } : { borderColor: 'var(--border)' }}
                      onClick={() => setSelected(p)}
                    >
                      {p.title}（{p.year === null ? '未知年份' : p.year}）
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <input
            data-testid="add-node-title"
            aria-label="主题名称（阶段分组）"
            className="rounded border px-2 py-1 text-xs"
            style={{ borderColor: 'var(--border)' }}
            value={themeTitle}
            onChange={(e) => setThemeTitle(e.target.value)}
          />
        )}
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" className="rounded border px-3 py-1 text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }} onClick={props.onClose}>
          取消
        </button>
        <button
          type="button"
          disabled={!canConfirm}
          className="rounded px-3 py-1 text-xs text-white"
          style={{ background: canConfirm ? 'var(--accent)' : 'var(--border)' }}
          onClick={confirm}
        >
          添加
        </button>
      </div>
    </Dialog>
  )
}
