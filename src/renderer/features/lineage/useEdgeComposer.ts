// b3: T3-P7B
/**
 * [T3-P7B] useEdgeComposer —— 连线编辑交互状态机 hook（design-final §4；
 * 票面②迁移表全量承载；纯逻辑外置可 jsdom 直测——LineageTimeline 唯一挂载点
 * =mode 态「view|edit」单源驻 Timeline[P8 共用面]，不上提 Board/store）。
 *
 * ── 态空间（宪法状态纪律：三轴枚举）──
 * mode ∈ {view,edit} × picker ∈ {idle,source,target} ×
 * popover ∈ {closed, edit(edgeId), create(from,to)}
 * 合法组合：view 恒 [idle,closed]；edit[idle|source|target, closed]；
 * edit[idle, edit|create]（**popover 开必 picker=idle——与拾取互斥**）。
 *
 * ── 迁移表（票面②逐条）──
 * - toggle view→edit：归位零残留 / toggle edit→view：**强制归位**
 *   （picker→idle 摘 .link-src+popover 关——mockup L1011）
 * - 「新建连线」click：idle→source+toast「新建连线：点击源卡片」（edit 态才
 *   生效——D-21 与 linkbtn 显隐同闸；popover 开时显式关——互斥结构性不变式
 *   [R4 回炉 1]）
 * - 点卡 source→target：源卡 id 记录+toast「再点击目标卡片」
 * - 点卡 target 同卡=自环 / 同端点对**无向**已有边=重复 → toast 提示
 *   **停在 target 态不回 idle**（D-P7B-6 UI 预检——权威守卫仍=service IPC
 *   拒绝路径；预检读面=渲染 edges 快照，写回填引用变化自然生效）
 * - 点卡 target 合法→popover=create（picker 回 idle+源高亮摘除）
 * - 点 .tl-edge-hit（仅 edit 态[handler 闸——与 CSS pointer-events 双闸]且
 *   picker=idle 且 popover=closed）→popover=edit
 * - popover→closed=外点（document listener 排除弹层+命中层——mockup L769）
 *   +Esc+移除连线+创建连线
 * - Esc 优先序=popover 先关＞picker 摘回 idle（mode 不动——mockup L1096-1098）
 * - popover 开时点卡/点边=no-op（点卡仍消费=不转发选中；关闭由外点承载）
 */
import { useEffect, useState } from 'react'
import type { LineageEdge } from '@shared/models/lineage'
import { showToast } from '../../shared/ui/toast-store'

export type LineageEditMode = 'view' | 'edit'
export type LinkPickPhase = 'idle' | 'source' | 'target'

export type EdgePopoverState =
  | { kind: 'closed' }
  | { kind: 'edit'; edgeId: string; cx: number; cy: number }
  | { kind: 'create'; from: string; to: string; cx: number; cy: number }

/** 卡/命中层点击事件最小面（React 合成 MouseEvent 结构兼容） */
export interface ClickEventLike {
  clientX: number
  clientY: number
  stopPropagation(): void
}

export interface EdgeComposerApi {
  mode: LineageEditMode
  picker: LinkPickPhase
  /** 拾取源卡 id（target 相位消费；idle/closed=null=高亮摘除） */
  sourceId: string | null
  popover: EdgePopoverState
  /** .timeline 挂 .editing（mode）——CSS 面（命中层双闸之一） */
  isEditing: boolean
  /** .timeline 挂 .link-pick（picker≠idle——cursor:crosshair） */
  isPicking: boolean
  toggleEdit(): void
  /** 「新建连线」钮（edit 态才生效；重复点击=重启拾取） */
  startLinkPick(): void
  /** 卡点击路由：true=已消费（Timeline 不转发 onNodeClick 选中） */
  handleCardClick(nodeId: string, ev: ClickEventLike): boolean
  /** 命中层点击（edit 态 handler 闸——双闸第二闸） */
  handleEdgeHitClick(edgeId: string, ev: ClickEventLike): void
  closePopover(): void
  /** Esc 全序：popover＞picker（mode 不动） */
  handleEscape(): void
}

/** 同端点对无向查重（任一方向已有边即重复——service UNIQUE(from,to) 的 UI 预检面） */
function hasPair(edges: readonly LineageEdge[], a: string, b: string): boolean {
  return edges.some(
    (e) => (e.fromNode === a && e.toNode === b) || (e.fromNode === b && e.toNode === a)
  )
}

export function useEdgeComposer(edges: readonly LineageEdge[]): EdgeComposerApi {
  const [mode, setMode] = useState<LineageEditMode>('view')
  const [picker, setPicker] = useState<LinkPickPhase>('idle')
  const [sourceId, setSourceId] = useState<string | null>(null)
  const [popover, setPopover] = useState<EdgePopoverState>({ kind: 'closed' })

  const resetTransient = (): void => {
    setPicker('idle')
    setSourceId(null)
    setPopover({ kind: 'closed' })
  }

  const toggleEdit = (): void => {
    // 双向均归位：view→edit 零残留；edit→view 强制归位（票面②迁移表）
    resetTransient()
    setMode((m) => (m === 'view' ? 'edit' : 'view'))
  }

  const startLinkPick = (): void => {
    if (mode !== 'edit') return
    // [R4 回炉 1] 显式关 popover：「popover 开必 picker=idle」互斥=状态机
    // 结构性不变式（此前靠 React root 先于 document listener 的事件序兜底
    // ——P8 共用面直呼可构造非法格）
    setPopover({ kind: 'closed' })
    setPicker('source')
    setSourceId(null)
    showToast('新建连线：点击源卡片', 'info')
  }

  const handleCardClick = (nodeId: string, ev: ClickEventLike): boolean => {
    if (mode === 'view') return false
    // popover 开：点卡=no-op（不进拾取不开 create）；仍消费=不转发选中；
    // 关闭由 document 外点 listener 承载（弹层外任意点击）
    if (popover.kind !== 'closed') return true
    if (picker === 'source') {
      setPicker('target')
      setSourceId(nodeId)
      ev.stopPropagation()
      showToast('再点击目标卡片', 'info')
      return true
    }
    if (picker === 'target' && sourceId !== null) {
      ev.stopPropagation()
      if (nodeId === sourceId) {
        showToast('不能与自身连线（自环）', 'error')
        return true // 停在 target 态不回 idle（D-P7B-6）
      }
      if (hasPair(edges, sourceId, nodeId)) {
        showToast('两节点间已存在连线', 'error')
        return true // 同上——预检拒不停手回 idle
      }
      setPopover({ kind: 'create', from: sourceId, to: nodeId, cx: ev.clientX, cy: ev.clientY })
      setPicker('idle')
      setSourceId(null)
      return true
    }
    return false // edit 态普通点卡=选中照常转发
  }

  const handleEdgeHitClick = (edgeId: string, ev: ClickEventLike): void => {
    // handler 闸：仅 edit 态+拾取/弹层全闲（CSS pointer-events 为第一闸）
    if (mode !== 'edit' || picker !== 'idle' || popover.kind !== 'closed') return
    ev.stopPropagation()
    setPopover({ kind: 'edit', edgeId, cx: ev.clientX, cy: ev.clientY })
  }

  const closePopover = (): void => {
    setPopover({ kind: 'closed' })
  }

  const handleEscape = (): void => {
    // 优先序：popover 先关＞picker 摘回 idle（mode 不动）
    if (popover.kind !== 'closed') {
      setPopover({ kind: 'closed' })
      return
    }
    if (picker !== 'idle') {
      setPicker('idle')
      setSourceId(null)
    }
  }

  // 外点关闭（mockup L769）：弹层开时挂 document click——排除弹层自身+命中层
  // （开层点击已 stopPropagation，本 listener 不见开层事件；排除面=防御层）
  useEffect(() => {
    if (popover.kind === 'closed') return
    const onDocClick = (e: MouseEvent): void => {
      const t = e.target
      if (
        t instanceof Element &&
        (t.closest('[data-testid="edge-pop"]') !== null || t.closest('svg.tl-edges') !== null)
      ) {
        return
      }
      setPopover({ kind: 'closed' })
    }
    document.addEventListener('click', onDocClick)
    return () => {
      document.removeEventListener('click', onDocClick)
    }
  }, [popover.kind])

  // Esc 全序：document keydown（mockup L1095-1098 同挂法）
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') handleEscape()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
    }
  })

  return {
    mode,
    picker,
    sourceId,
    popover,
    isEditing: mode === 'edit',
    isPicking: picker !== 'idle',
    toggleEdit,
    startLinkPick,
    handleCardClick,
    handleEdgeHitClick,
    closePopover,
    handleEscape
  }
}
