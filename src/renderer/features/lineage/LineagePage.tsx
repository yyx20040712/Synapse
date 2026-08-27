// b3: P7-H
/**
 * [LG-02] LineagePage —— 「脉络」顶层视图宿主（E4）。
 *
 * 行为：挂载经 lineage.store.load() 取数（lineage/graph 单点——接缝
 * 双向锚定：本行+lineage.store 头注；03 编辑层/04 侧板同经 store 消费
 * **禁双取**）；三态呈现（门一 N6）：loading=加载文案/error=错误条+
 * 重试按钮（列表型瞬态，INV-02）/ready=LineageCanvas（空图空态在画布内）。
 * 页面自身无数据逻辑（LibraryPage 同型）；无写交互（编辑归 03）。
 */
import { useEffect } from 'react'
import { useLineageStore } from './lineage.store'
import { LineageCanvas } from './LineageCanvas'

export function LineagePage(): JSX.Element {
  const nodes = useLineageStore((s) => s.nodes)
  const edges = useLineageStore((s) => s.edges)
  const status = useLineageStore((s) => s.status)
  const error = useLineageStore((s) => s.error)
  const load = useLineageStore((s) => s.load)

  useEffect(() => {
    void load()
  }, [load])

  if (status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center p-8 text-sm" style={{ color: 'var(--text-dim)' }}>
        正在加载脉络图…
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div
          className="flex items-center gap-3 rounded border px-4 py-3 text-xs"
          role="alert"
          style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
        >
          <span>脉络图加载失败：{error}</span>
          <button
            type="button"
            className="rounded px-2 py-1"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
            onClick={() => void load()}
          >
            重试
          </button>
        </div>
      </div>
    )
  }
  return (
    <div className="h-full p-1">
      <LineageCanvas nodes={nodes} edges={edges} />
    </div>
  )
}
