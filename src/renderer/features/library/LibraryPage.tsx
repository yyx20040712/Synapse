/**
 * [SR-LIB-01] LibraryPage —— 文献库页面（T3-P3 密度列表布局重排）
 *
 * ── 行为层 ──
 * - 组装文献库主视图（.lib-page 容器）：ImportDropZone → 筛选行（FilterBar）
 *   → error 行 → .lib-body（左=表头+密度列表 flex-1，右=316px 规格表抽屉）
 * - 数据经 library.store（列表状态/筛选/选中）；页面自身无数据逻辑
 * - 挂载时拉取列表（useAsync + library.store.load()）；列表序号续页传
 *   query.offset（PaperRow ordinal 消费）
 * - [T3-P3] DiamondRule 库域退役（旧菱形分隔两消费点摘除——settings 域
 *   消费保留，组件本体留存）
 * - [F-LIBUI-01 ⑨] corpusSet「导出语料集合」入口整体退役（用户 D4 裁决
 *   2026-09-29：IPC 通道三方收窄；设置页 corpusSession 五件套零触碰）
 *
 * ── 接口层 ──
 * - export function LibraryPage(): JSX.Element
 *
 * ── 架构层 ──
 * - 只 import 本域组件与 store、shared/ui、shared/hooks、api/client；禁止 import 其他 features
 * - FilterBar/PaperDetailPanel 按冻结 props 契约接线（两者作为组合根跨域
 *   引用 notes/tags 子组件，见 check-quality 白名单）
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 布局：左列表右详情；测试见 tests/e2e/library-density.spec.ts
 */
import { useEffect } from 'react'
import { useAsync } from '../../shared/hooks/useAsync'
import { FilterBar } from './FilterBar'
import { ImportDropZone } from './ImportDropZone'
import { PaperDetailPanel } from './PaperDetailPanel'
import { PaperList } from './PaperList'
import { useLibraryStore } from './library.store'
// R3-U2 文献库皮肤（lib-* 类唯一挂载点——feature 树全件共享；T3-P3 全量重写）
import './library.css'

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

  // 挂载即拉取（useAsync 是显式 run 语义，故在 effect 中手动触发一次）
  const { run } = useAsync(load, [load])
  useEffect(() => {
    void run()
  }, [run])

  return (
    <div className="lib-page">
      <ImportDropZone onImported={() => void load()} />
      <FilterBar query={query} onChange={setQuery} />
      {error !== null && (
        <div
          className="mx-[18px] mb-2 flex items-center justify-between rounded border px-3 py-2 text-xs"
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
      <div className="lib-body">
        <div className="lib-main-col">
          {loading && (
            <p className="px-1 py-0.5 text-xs" style={{ color: 'var(--text-dim)' }}>
              正在加载文献列表…
            </p>
          )}
          <PaperList
            papers={papers}
            offset={query.offset}
            selectedId={selectedId}
            onSelect={selectPaper}
            onOpen={openPaper}
          />
        </div>
        <aside className="lib-drawer">
          <PaperDetailPanel paperId={selectedId} />
        </aside>
      </div>
    </div>
  )
}
