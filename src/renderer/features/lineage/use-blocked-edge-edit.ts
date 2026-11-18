/** blocked 自动边的编辑态迁移：撤销交互呈现，保留边数据与 selected 以便恢复。 */
import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'
import type { AutoScrollHandle } from './drag-autoscroll'
import type { EdgeMenuTarget } from './EdgeMenu'
import type { RoutedPath } from './lineage-routing'
import type { EdgeEditState } from './use-edge-edit'

export function useBlockedEdgeEdit(
  pathsRef: MutableRefObject<RoutedPath[]>,
  edgeId: string | null,
  stateRef: MutableRefObject<EdgeEditState>,
  sessionCleanupRef: MutableRefObject<(() => void) | null>,
  autoRef: MutableRefObject<AutoScrollHandle | null>,
  setMenu: Dispatch<SetStateAction<EdgeMenuTarget | null>>,
  setState: Dispatch<SetStateAction<EdgeEditState>>
): void {
  const blocked = edgeId !== null && pathsRef.current.some((p) => p.edgeId === edgeId && p.clearance === 'blocked')
  useEffect(() => {
    if (!blocked || edgeId === null) return
    // idle 不变；selected 只隐藏几何；menu 关闭；活动拖拽拆会话并回 selected。
    setMenu(null)
    if (stateRef.current.phase !== 'dragging' && stateRef.current.phase !== 'reconnect') return
    sessionCleanupRef.current?.()
    sessionCleanupRef.current = null
    autoRef.current?.stop()
    autoRef.current = null
    setState({ phase: 'selected', edgeId })
  }, [blocked, edgeId, pathsRef, sessionCleanupRef, autoRef, setMenu, setState, stateRef])
}
