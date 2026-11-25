// b3: B5 wave A 纯拆件（2026-11-25——自 LineagePage.tsx 拆出；代码与锚
// 注释同迁）/ B5 wave C 稳定外壳（单排工具栏＋三态共壳＋侧栏单态）
/**
 * [LG-02 / B5 设计稿 §3/§10.2] LineagePageBody —— 脉络页稳定外壳（自 LineagePage
 * 拆件：单排工具栏＋写失败告警＋三态主体＋选中详情＋folders 图名＋pane 组合）。
 *
 * [B5 设计稿 §3.3 loading/error/ready 共壳——wave C 2026-11-25 断言翻转] Page 始终渲染
 * 工具栏与主体框架（原 loading/error 早退丢工具栏、「正在加载脉络图…」可见文案、
 * 「该文件夹无脉络图」空态提示随 §3.3/§3.5 退役）：
 * - loading：中央保留画布占位宿主（[data-testid="lineage-timeline"]，aria-busy=true）＋sr-only
 *   「正在加载脉络图」；数据控件按 §2.3 禁用（各控件自判图 ready）。
 * - graph load error：同一工具栏仍在；中央 role=alert「脉络图加载失败：真实原因」＋独立
 *   lineage-load-retry（只调 store.load()，不复用保存/history 重试）；不与 write error 告警
 *   （工具栏下的 LineageWriteErrorAlert）合并。graph loading/error 只收 palette=LineagePage 编排层。
 * - ready：Board/Timeline；空图保留 .tl-content 与 FloatingNotes 层（LineageTimeline）。
 * - 不取第二次 graph：本件零 load/setFolder 调用——取数单点=LineagePage 挂载效应（接缝双向
 *   锚定：lineage.store 头注；INV-182）；error 态重试钮只转调 store.load()（用户触发）。
 * - 本件由 LineagePage 无条件渲染=恒挂载——选中节点与 folders 两份本地态的生命周期=页面
 *   生命周期，跨 loading/error 不复位（与拆件前驻 LineagePage 时一致）。
 * - 编排（LG-03 接入）：selectedNodeId 驻本件 state——Board 的 onSelectNode 上抛落此（04 侧板
 *   LineageSidePanel 消费）。
 *
 * ── F-LGRAPH-01①U4 编排重构（顶栏并集切换器退役行 1）──
 * - 顶部=单排工具栏 LineageToolbar（[B5 §3.1] 内含模式栏子件；图名=父栏槽位——folders 单源经
 *   NavGraphPicker 上抛派生，folders 未落定期=主图兜底；真实图名属保留的数据文案）；
 *   左侧=LineageNavPane（Word 导航窗格兼任图/文件夹切换——S2/S3/S4 语义迁驻）。
 * - [B5 §3.4] 左右侧栏控制=页面组合层 use-lineage-pane-controls（本件调用一次，同一对象喂工具栏
 *   开关与 LineageAsideHost）；收起的 pane 不占空 rail，从工具栏恢复时读回原宽。
 *
 * ── 接口层 ── export type LineagePageBodyProps；export function
 *   LineagePageBody(props: LineagePageBodyProps): JSX.Element
 *   （侧板跳转三回调与星标回调=LineagePage 组合根的编排体，经 props 透传——跳转接缝三方
 *   头注锚定〔LineagePage+LineageSidePanel+open-paper-bus〕仍指 LineagePage，不随本件迁移）
 */
import { useState } from 'react'
import { RetryButton } from '../../shared/ui/RetryButton'
import { useLineageStore } from './lineage.store'
import { LineageAsideHost, type LineageAsideHostProps } from './LineageAsideHost'
import { LineageBoard } from './LineageBoard'
import { LineageNavPane } from './LineageNavPane'
import { LineageToolbar } from './LineageToolbar'
import { useLineagePaneControls } from './use-lineage-pane-controls'
import type { NavFolder } from './nav-graph-picker'

/** 侧板编排回调面（=LineageAsideHost 同名 props——类型单源取自该件，不手写第二份） */
export type LineagePageBodyProps = Pick<
  LineageAsideHostProps,
  'onJumpToPaper' | 'onGotoLibrary' | 'onGotoReader' | 'onToggleStar'
>

/** 图名兜底（folders 未落定期/主图——folders 单源缺省值） */
const DEFAULT_GRAPH_NAME = '主图'

export function LineagePageBody(props: LineagePageBodyProps): JSX.Element {
  const status = useLineageStore((s) => s.status)
  const error = useLineageStore((s) => s.error)
  const load = useLineageStore((s) => s.load)
  // [F-LGRAPH-01①U4] folders 图名链（NavGraphPicker 上抛）
  const folderId = useLineageStore((s) => s.folderId)
  const [folders, setFolders] = useState<NavFolder[] | null>(null)
  // 选中节点 id（04 侧板数据源——Board 上抛落此，store 查找分发在下行 selector）
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const selectedNode = useLineageStore((s) => s.nodes.find((n) => n.id === selectedNodeId) ?? null)
  // [T3-P8→②U4] 侧板徽章分发单源：骑缝编号（INV-76 全图一次）+含金量摘要
  // （core 徽章消费面随行 9 退役——isCore 渲染链拆除，数据面留 lineage-classify）
  const paperMetrics = useLineageStore((s) => s.paperMetrics)
  // [F-FOLDER-01] 侧板徽章=该文献 pubNo（库级同源 INV-92——catalogNo 退役）
  const pubNos = useLineageStore((s) => s.pubNos)
  const selMetrics =
    selectedNode !== null && selectedNode.paperId !== null
      ? (paperMetrics[selectedNode.paperId] ?? null)
      : null
  // [B5 §3.4] 左右侧栏控制（页面组合层——无第二 collapsed 态；右栏 useSidebarPane 实例在此持有）
  const panes = useLineagePaneControls()
  const graphName = folders?.find((f) => f.id === folderId)?.name ?? DEFAULT_GRAPH_NAME

  return (
    // min-w-0：外层页面不设最小宽度——工具栏横滚只发生在 .lg-toolbar-scroll（§3.2），不撑宽 body/画布/侧栏
    <div className="flex h-full min-w-0 flex-col">
      {/* [B5 §3.1/§3.2] 单排工具栏=稳定外壳首子（三态常驻；写失败告警=其内横滚容器的兄弟节点） */}
      <LineageToolbar graphName={graphName} panes={panes} />
      <div className="flex min-h-0 min-w-0 flex-1 gap-1 p-1">
        <LineageNavPane onFoldersChange={setFolders} />
        <div className="min-w-0 flex-1">
          {status === 'loading' ? (
            // [B5 §3.3] loading：画布占位宿主（aria-busy＋sr-only），无可见教学式 loading 文案
            <div className="flex h-full items-center justify-center" data-testid="lineage-timeline" aria-busy="true">
              <span className="sr-only">正在加载脉络图</span>
            </div>
          ) : status === 'error' ? (
            // [B5 §3.3] graph load error：同一工具栏仍在；独立重试入口只调 load()
            <div className="flex h-full items-center justify-center p-8">
              <div
                className="flex min-w-0 max-w-full items-center gap-3 rounded border px-4 py-3 text-xs"
                role="alert"
                style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
              >
                <span className="min-w-0 break-words">脉络图加载失败：{error}</span>
                {/* [F-UIRES-02 批 B R2] 共享 RetryButton（textContent=「重试」）；testid 独立于
                    lineage-save-retry——保存/history 重试不复用本入口 */}
                <RetryButton testId="lineage-load-retry" onClick={() => void load()} />
              </div>
            </div>
          ) : (
            // [F-UIRES-03 B5①] 两钮编排改道：现有回调零改动复用——消费面自 Board→Timeline 卡链转 SidePanel 操作行
            <LineageBoard onSelectNode={setSelectedNodeId} selectedNodeId={selectedNodeId} />
          )}
        </div>
        {/* [F-UIRES-03 B4③+F-DBCAMP-01 U3] aside 宿主拆件=LineageAsideHost：宽/调宽机制原语义
            迁驻（拖右缘 4px 手柄 clamp 200–480+localStorage 持久）+页签行「详情｜AI 会话」
            （详情缺省）；[B5 §3.4] 受控 SidebarPane 注入（同一 panes.sidebar）——收起=零 DOM */}
        <LineageAsideHost
          sidebar={panes.sidebar}
          node={selectedNode}
          onJumpToPaper={props.onJumpToPaper}
          pubNo={
            selectedNode !== null && selectedNode.paperId !== null
              ? (pubNos[selectedNode.paperId] ?? null)
              : null
          }
          metrics={selMetrics}
          onGotoLibrary={props.onGotoLibrary}
          onGotoReader={props.onGotoReader}
          onToggleStar={props.onToggleStar}
        />
      </div>
    </div>
  )
}
