// b3: P7-H
/**
 * [F-LGRAPH-01①U4] LineageNavPane —— 左侧可收起导航窗格（Word 导航窗格式，
 * mockup §3.2；自顶栏并集切换器退役行 1 承接图/文件夹切换）。
 *
 * - 宽 208 缺省/右缘手柄拖动调宽 160–320（hover accent+ew-resize）/
 *   收起钮在窗格头/收起态 40px 窄条仅展开图标（T4 再点展开记忆宽）。
 * - P-17 宽度+收起随图记忆=nav-pane-prefs（localStorage 单键 JSON map）。
 * - 内容自上而下：①NavGraphPicker 图/文件夹下拉 ②NavTimelineIndex
 *   时间线索引。
 */
import { useEffect, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useLineageStore } from './lineage.store'
import { useLineageViewStore } from './lineage-view.store'
import { readNavPrefs, writeNavPrefs } from './nav-pane-prefs'
import { NavGraphPicker, type NavFolder } from './nav-graph-picker'
import { NavTimelineIndex } from './nav-timeline-index'

export function LineageNavPane(props: {
  onFoldersChange?(folders: NavFolder[] | null): void
}): JSX.Element {
  const folderId = useLineageStore((s) => s.folderId)
  const nodes = useLineageStore((s) => s.nodes)
  const collapsed = useLineageViewStore((s) => s.navCollapsed)
  const width = useLineageViewStore((s) => s.navWidth)
  const setCollapsed = useLineageViewStore((s) => s.setNavCollapsed)
  const setWidth = useLineageViewStore((s) => s.setNavWidth)

  // P-17 切图→读该图记忆（无则缺省 208 展开）；写点=拖宽/收起两动作
  useEffect(() => {
    const prefs = readNavPrefs(folderId)
    setWidth(prefs.width)
    setCollapsed(prefs.collapsed)
  }, [folderId]) // 注：记忆读取仅随图（setter 恒稳）

  const toggleCollapsed = (next: boolean): void => {
    setCollapsed(next)
    writeNavPrefs(folderId, { width, collapsed: next })
  }

  // 右缘手柄拖动（pointer 会话：document 级 move/up；落定写记忆）
  const resizeBaseRef = useRef<{ startX: number; startW: number } | null>(null)
  const onResizeDown = (ev: ReactPointerEvent<HTMLDivElement>): void => {
    resizeBaseRef.current = { startX: ev.clientX, startW: width }
  }
  useEffect(() => {
    const onMove = (e: PointerEvent): void => {
      const base = resizeBaseRef.current
      if (base === null) return
      // [回炉 R4/RR3-a] buttons 守卫：本件无 pointer capture（手柄未捕获——
      // 与 card-drag-session 的 setPointerCapture 先例不同路径），主键释放
      // （拖拽中松键无 up 的异常路径）无 capture 兜底故补 buttons 校验即止
      if (e.buttons !== 1) {
        // [RR3-c] 废弃径取舍（申报）：只清 ref 不写 prefs——异常中断不固化
        // 中间值，宽度已随 move 实时入 store；下次开面板读上次合法记忆
        // （up/cancel 径=正常收口写 prefs，本径=废弃不落盘——有意不对称）
        resizeBaseRef.current = null
        return
      }
      setWidth(base.startW + (e.clientX - base.startX))
    }
    const onUp = (e: PointerEvent): void => {
      const base = resizeBaseRef.current
      if (base === null) return
      resizeBaseRef.current = null
      // 写时钳（prefs 层同钳——双保险单值一致）
      const finalW = Math.min(320, Math.max(160, base.startW + (e.clientX - base.startX)))
      setWidth(finalW)
      writeNavPrefs(folderId, { width: finalW, collapsed })
    }
    // [回炉 R4/RR3-b] pointercancel 同径收口——不读事件坐标（系统取消事件
    // clientX 缺省 0 会误写边界值），落 store 当前宽（move 流实时入 store）
    const onCancel = (): void => {
      if (resizeBaseRef.current === null) return
      resizeBaseRef.current = null
      const finalW = useLineageViewStore.getState().navWidth
      writeNavPrefs(folderId, { width: finalW, collapsed })
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onCancel)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onCancel)
    }
  }, [folderId, collapsed]) // 注：setWidth 恒稳；落定写面随图/收起态重建闭包

  if (collapsed) {
    return (
      <aside className="lineage-nav collapsed" data-testid="lineage-nav-pane" style={{ width: '40px' }}>
        <button
          type="button"
          className="nav-expand-btn"
          data-testid="lineage-nav-expand"
          title="展开导航窗格"
          aria-label="展开导航窗格"
          onClick={() => toggleCollapsed(false)}
        >
          »
        </button>
      </aside>
    )
  }
  return (
    <aside className="lineage-nav" data-testid="lineage-nav-pane" style={{ width: `${width}px` }}>
      <div className="nav-head">
        <span className="nav-title">导航</span>
        <button
          type="button"
          className="nav-collapse-btn"
          data-testid="lineage-nav-collapse"
          title="收起导航窗格"
          aria-label="收起导航窗格"
          onClick={() => toggleCollapsed(true)}
        >
          «
        </button>
      </div>
      <NavGraphPicker onFoldersChange={props.onFoldersChange} />
      <NavTimelineIndex nodes={nodes} />
      <div
        className="nav-resize-handle"
        data-testid="lineage-nav-resize"
        role="separator"
        aria-orientation="vertical"
        onPointerDown={onResizeDown}
      />
    </aside>
  )
}
