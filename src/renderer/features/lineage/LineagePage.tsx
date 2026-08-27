// b3: P7-H
/**
 * [LG-02] LineagePage —— 「脉络」顶层视图宿主（E4）。
 *
 * 行为：挂载经 lineage.store.load() 取数（lineage/graph 单点——接缝
 * 双向锚定：本行+lineage.store 头注；03 编辑层/04 侧板同经 store 消费
 * **禁双取**）；三态呈现（门一 N6）：loading=加载文案/error=错误条+
 * 重试按钮（列表型瞬态，INV-02）/ready=LineageBoard（03 编辑层包裹
 * 02 画布——空图空态在画布内）。
 * 编排（LG-03 接入）：selectedNodeId 驻本页 state——Board 的 onSelectNode
 * 上抛落此（04 侧板 LineageSidePanel 消费面预留——本单空消费，props
 * 形态照票面）；无侧板布局（04 编排扩）。
 *
 * ── LG-04 编排扩（侧板+跳转链）──
 * - 侧板布局：Board（flex-1）+右侧 LineageSidePanel 固定宽 aside；节点
 *   数据源=本页经 lineage.store 查找分发（selectedNodeId→nodes.find——
 *   store 数据消费合法非双取，03 预留出口兑现）。
 * - 跳转编排：SidePanel.onJumpToPaper 上抛→**总线发送单点在本页**
 *   （板不直发 bus——可测性+分层）：requestOpenPaperAnchored（open-paper-
 *   bus 载荷扩，主控裁决路径 A）；anchor null→undefined 归一（票面
 *   payload 面 number|null vs 总线 optional）。阅读器消费侧=open-paper-
 *   anchor.ts（接缝三方头注锚定：本页+SidePanel+open-paper-bus）。
 */
import { useEffect, useState } from 'react'
import { requestOpenPaperAnchored } from '../../shared/open-paper-bus'
import { useLineageStore } from './lineage.store'
import { LineageBoard } from './LineageBoard'
import { LineageSidePanel } from './LineageSidePanel'

export function LineagePage(): JSX.Element {
  const status = useLineageStore((s) => s.status)
  const error = useLineageStore((s) => s.error)
  const load = useLineageStore((s) => s.load)
  // 选中节点 id（04 侧板数据源——Board 上抛落此，store 查找分发在下行 selector）
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const selectedNode = useLineageStore((s) => s.nodes.find((n) => n.id === selectedNodeId) ?? null)

  useEffect(() => {
    void load()
  }, [load])

  /** 侧板跳转上抛→总线发送（payload 构造在 SidePanel，本页只转发归一） */
  const handleJumpToPaper = (payload: {
    paperId: string
    anchor?: { quoteText: string; prefixText: string; suffixText: string; anchorPage: number | null }
    aiNoteId?: string
  }): void => {
    requestOpenPaperAnchored({
      paperId: payload.paperId,
      anchor:
        payload.anchor === undefined
          ? undefined
          : { ...payload.anchor, anchorPage: payload.anchor.anchorPage ?? undefined },
      aiNoteId: payload.aiNoteId
    })
  }

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
    <div className="flex h-full gap-1 p-1">
      <div className="min-w-0 flex-1">
        <LineageBoard onSelectNode={setSelectedNodeId} selectedNodeId={selectedNodeId} />
      </div>
      <aside className="w-72 shrink-0 overflow-hidden rounded border" style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}>
        <LineageSidePanel node={selectedNode} onJumpToPaper={handleJumpToPaper} />
      </aside>
    </div>
  )
}
