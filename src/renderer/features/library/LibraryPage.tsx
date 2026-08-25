/**
 * [SR-LIB-01] LibraryPage —— 文献库页面（工单：done / weak）
 *
 * ── 行为层 ──
 * - 组装文献库主视图：FilterBar + PaperList + PaperDetailPanel + ImportDropZone
 * - 数据经 library.store（列表状态/筛选/选中）；页面自身无数据逻辑
 * - 挂载时拉取列表（useAsync + library.store.load()）
 * - 「导出语料集合」入口（C-02）：全库 corpus md 目录导出——api.export_.corpusSet，
 *   成功 toast 含篇数与目录，取数失败篇以「跳过 M 篇」附注（INV-02）
 *
 * ── 接口层 ──
 * - export function LibraryPage(): JSX.Element
 *
 * ── 架构层 ──
 * - 只 import 本域组件与 store、shared/ui、shared/hooks、api/client；禁止 import 其他 features
 * - FilterBar/PaperDetailPanel 按冻结 props 契约接线，占位件随工单完成替换为
 *   真实现（两者作为组合根跨域引用 notes/tags 子组件，见 check-quality 白名单）
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 布局：左列表右详情；详情在选中行时出现。测试见 tests/e2e/smoke.spec.ts
 */
import { useEffect, useState } from 'react'
import { api, unwrap, ApiClientError } from '../../api/client'
import { useAsync } from '../../shared/hooks/useAsync'
import { showToast } from '../../shared/ui/Toast'
import { FilterBar } from './FilterBar'
import { ImportDropZone } from './ImportDropZone'
import { PaperDetailPanel } from './PaperDetailPanel'
import { PaperList } from './PaperList'
import { useLibraryStore } from './library.store'

export function LibraryPage(): JSX.Element {
  const papers = useLibraryStore((s) => s.papers)
  const query = useLibraryStore((s) => s.query)
  const selectedId = useLibraryStore((s) => s.selectedId)
  const loading = useLibraryStore((s) => s.loading)
  const error = useLibraryStore((s) => s.error)
  const load = useLibraryStore((s) => s.load)
  const setQuery = useLibraryStore((s) => s.setQuery)
  const selectPaper = useLibraryStore((s) => s.selectPaper)
  const openPaper = useLibraryStore((s) => s.openPaper)
  const [exportingSet, setExportingSet] = useState(false)

  // 挂载即拉取（useAsync 是显式 run 语义，故在 effect 中手动触发一次）
  const { run } = useAsync(load, [load])
  useEffect(() => {
    void run()
  }, [run])

  /** 全库语料导出（动作型：失败/取消 toast——CANCELLED 也是用户可见反馈） */
  const exportCorpusSet = (): void => {
    if (exportingSet) return
    setExportingSet(true)
    unwrap(api.export_.corpusSet({}))
      .then((r) => {
        const skippedNote = r.skipped.length > 0 ? `（跳过 ${r.skipped.length} 篇）` : ''
        showToast(`已导出 ${r.count} 篇语料：${r.filePath}${skippedNote}`, 'success')
      })
      .catch((e: unknown) => {
        showToast(e instanceof ApiClientError ? e.message : '导出语料失败', 'error')
      })
      .finally(() => setExportingSet(false))
  }

  return (
    <div className="flex h-full flex-col gap-2 p-3 text-sm">
      <ImportDropZone onImported={() => void load()} />
      <FilterBar query={query} onChange={setQuery} />
      <div className="flex justify-end">
        <button
          type="button"
          className="rounded border px-2 py-0.5 text-xs"
          style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}
          disabled={exportingSet}
          onClick={exportCorpusSet}
        >
          {exportingSet ? '语料导出中…' : '导出语料集合'}
        </button>
      </div>
      {error !== null && (
        <div
          className="flex items-center justify-between rounded border px-3 py-2 text-xs"
          style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
          role="alert"
        >
          <span>{error}</span>
          <button
            type="button"
            className="rounded px-2 py-0.5"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
            onClick={() => void load()}
          >
            重试
          </button>
        </div>
      )}
      <div className="flex min-h-0 flex-1 gap-2">
        <div className="flex min-w-0 flex-1 flex-col">
          {loading && (
            <p className="px-1 py-0.5 text-xs" style={{ color: 'var(--text-dim)' }}>
              正在加载文献列表…
            </p>
          )}
          <PaperList papers={papers} selectedId={selectedId} onSelect={selectPaper} onOpen={openPaper} />
        </div>
        <aside className="w-80 shrink-0 overflow-auto">
          <PaperDetailPanel paperId={selectedId} />
        </aside>
      </div>
    </div>
  )
}
