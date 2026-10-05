/**
 * useViewBridges —— 跨页事件桥订阅 hook（[F-SPLIT 型拆件] App.tsx 组件行数
 * 红线（≤250）拆出——订阅体单源；App 组合根唯一消费者）。
 *
 * 三桥：①"打开文献"切阅读器（补读/监听在 ReaderPage——open-paper-bus）；
 * ②[F-UIRES-01 R7/P-8]"在脉络图中打开"切脉络（FolderNav 右键→
 * requestOpenLineage 广播；缺省图=库页 folderScope 接缝）；③[F-UIRES-03
 * C3·v1.7]"去文献库"切文献库（脉络卡面钮→library.store 先置数+
 * requestOpenLibrary 广播——open-lineage-bus 反向同型，零载荷事件）。
 */
import { useEffect } from 'react'
import { OPEN_PAPER_EVENT } from '../shared/open-paper-bus'
import { OPEN_LINEAGE_EVENT } from '../shared/open-lineage-bus'
import { OPEN_LIBRARY_EVENT } from '../shared/open-library-bus'
import type { ViewId } from './Rail'

export function useViewBridges(setView: (v: ViewId) => void): void {
  useEffect(() => {
    const toReader = (): void => setView('reader')
    const toLineage = (): void => setView('lineage')
    const toLibrary = (): void => setView('library')
    window.addEventListener(OPEN_PAPER_EVENT, toReader)
    window.addEventListener(OPEN_LINEAGE_EVENT, toLineage)
    window.addEventListener(OPEN_LIBRARY_EVENT, toLibrary)
    return () => {
      window.removeEventListener(OPEN_PAPER_EVENT, toReader)
      window.removeEventListener(OPEN_LINEAGE_EVENT, toLineage)
      window.removeEventListener(OPEN_LIBRARY_EVENT, toLibrary)
    }
  }, [setView])
}
