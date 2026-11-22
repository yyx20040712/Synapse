/**
 * [B2 §3.1/§3.2] AppStatusBarHost —— 26px 状态条数据宿主（自 App 组合根拆件）。
 *
 * ── 持有 ──
 * - footer.app-statusbar + StatusBar 全部数据订阅：课题名/篇数（workspace
 *   store）、脉络节点/连线计数（lineage store **两个独立计数选择器**——
 *   zustand 逐订阅 Object.is，计数不变零重渲）、已选 0/1（library store）、
 *   自动保存槽 worst-of 聚合（tab 双源投影 ∪ lineage saveStatus）。
 * ── 不持有 ──
 * - quitDirty 上报链（App 根保留——TABS-04/P7-C 受锁面）；theme 数据通道
 *   （themeLabel 经 props 注入——App 是 dataset.theme 单点接线处，宿主不重复
 *   订阅 settings store）。
 * ── 订阅降维 ──
 * - nodes/edges 只取 length（不订阅数组本体）；notes 面经 useTabAutosaveSignals
 *   （useShallow pending 投影）——写源变化只使本宿主重渲，不连坐视图子树。
 *   AppStatusBarHost 探针锁=tests/unit/renderer/app-b2-host-isolation.test.tsx。
 */
import { StatusBar, type AutosaveStatus } from './StatusBar'
import { useLineageStore } from '../features/lineage/lineage.store'
import { useLibraryStore } from '../features/library/library.store'
import { useTabAutosaveSignals, useTabOpenCount } from '../features/reader/state/tab-dirty'
import { selectDisplayWsName, useWorkspaceStore } from '../features/workspaces/workspace.store'

/**
 * [T3-U1] 状态条自动保存槽 worst-of 聚合（纯函数——tab 双源分档 ∪ lineage
 * saveStatus →三态真文本；null=槽省略）。序=failed > saving > saved；
 * [回炉 R2/W3 终裁分档] annoDirty=真失败→failed；notePending=在途+失败混合
 * →saving；lineage dirty=[②U1] 会话暂存未落库如实呈现；干净+有 tab=saved；
 * 无 tab 空闲=null（禁假「已保存」造作信号）。
 * [F-VISFB-14] 返回型=SaveUiState|null（StatusBar 槽位单源——INV-141⑤；
 * lineage error 在此归一为 failed〔钮面族四态枚举，文本同为「保存失败」〕）。
 */
function autosaveWorstOf(
  annoDirty: boolean,
  notePending: boolean,
  lineage: 'clean' | 'dirty' | 'saving' | 'error',
  openTabs: number
): AutosaveStatus {
  if (annoDirty || lineage === 'error') return 'failed'
  if (notePending || lineage === 'saving') return 'saving'
  // [F-LGRAPH-01②U1] lineage dirty=编辑会话暂存未落库（保存语义反转：
  // autosave-first→会话暂存+点保存——「待保存」档如实呈现非假「保存中」）
  if (lineage === 'dirty') return 'dirty'
  return openTabs > 0 ? 'saved' : null
}

export function AppStatusBarHost(props: { themeLabel: string }): JSX.Element {
  // [F-WS-02] 显示位=selectDisplayWsName（引导态=待选择——INV-87）
  const wsItems = useWorkspaceStore((s) => s.items)
  const wsCurrentId = useWorkspaceStore((s) => s.currentId)
  const wsCurrent = wsItems.find((w) => w.id === wsCurrentId)
  const wsDisplayName = selectDisplayWsName({ items: wsItems, currentId: wsCurrentId })
  // [B2 §3.2] 写源计数选择器：独立订阅 length——数组本体变化但计数不变=零重渲
  const nodeCount = useLineageStore((s) => s.nodes.length)
  const edgeCount = useLineageStore((s) => s.edges.length)
  const selectedId = useLibraryStore((s) => s.selectedId)
  const tabOpenCount = useTabOpenCount()
  const { annoDirty, notePending } = useTabAutosaveSignals()
  const lineageSave = useLineageStore((s) => s.saveStatus)
  const autosave = autosaveWorstOf(annoDirty, notePending, lineageSave, tabOpenCount)
  return (
    <footer className="app-statusbar">
      <StatusBar
        wsName={wsDisplayName}
        paperCount={wsCurrent?.paperCount ?? 0}
        nodeCount={nodeCount}
        edgeCount={edgeCount}
        selectedCount={selectedId !== null ? 1 : 0}
        themeLabel={props.themeLabel}
        autosave={autosave}
      />
    </footer>
  )
}
