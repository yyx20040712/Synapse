/**
 * [F-VISFB-65 U7 拆件] useWsGuideImportBridge —— 默认课题引导态导入升格桥
 * （自 App.tsx 纯移动——行数红线布线 hook 化；语义零变：F-WS-02 D2 导入落地
 * →重拉课题清单→paperCount>0 打破引导态第三条件→rail 解禁；仅引导态窗口内
 * 重拉；失败=禁用保持（k1-N2 在档））。app 组合层（可跨 feature——App 同层）。
 */
import { useEffect } from 'react'
import { unwrap, api } from '../api/client'
import { useWorkspaceStore } from '../features/workspaces/workspace.store'
import { useLibraryStore } from '../features/library/library.store'

export function useWsGuideImportBridge(wsGuide: boolean): void {
  const wsLoad = useWorkspaceStore((s) => s.load)
  const libTotal = useLibraryStore((s) => s.total)
  const libLoading = useLibraryStore((s) => s.loading)
  useEffect(() => {
    if (!wsGuide || libLoading) return
    if (libTotal > 0) {
      void wsLoad()
      return
    }
    let cancelled = false
    try {
      void unwrap(api.library.list({})).then((r) => {
        if (!cancelled && r.total > 0) void wsLoad()
      }).catch(() => undefined)
    } catch {
      // 探针发起失败=本轮放弃（引导态不破——自愈路径在档）
    }
    return () => {
      cancelled = true
    }
  }, [wsGuide, libTotal, libLoading, wsLoad])
}
