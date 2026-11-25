// b3: B5 wave A 纯拆件（2026-11-25——自 LineagePage.tsx 拆出；代码与锚
// 注释同迁，行为零变）
/**
 * [LG-02 / B5 设计稿 §3.3/§10.2] LineagePageBody —— 脉络页主体（自 LineagePage
 * 拆件：三态呈现+选中详情+folders 图名+pane 组合）。
 *
 * 本波（A 波）只搬不改：loading/error 早退、顶栏=LineageModeBar、「该文件夹无
 * 脉络图」与加载文案等现状全保持；「loading/error/ready 共壳（工具栏常驻）」与
 * 教学文案删除属后续波（§3.3/§3.5/§15.1 步骤 4–5），本波不做。
 *
 * - 三态呈现（门一 N6）：loading/error/ready（空图空态在画布内）。本件由
 *   LineagePage 无条件渲染=恒挂载——选中节点与 folders 两份本地态的生命周期=
 *   页面生命周期，跨 loading/error 不复位（与拆件前驻 LineagePage 时一致）。
 * - 不取第二次 graph：本件零 load/setFolder 调用——取数单点=LineagePage 挂载
 *   效应（接缝双向锚定：lineage.store 头注；INV-182）；error 态重试钮只转调
 *   store.load()（用户触发）。
 * - 编排（LG-03 接入）：selectedNodeId 驻本件 state——Board 的 onSelectNode
 *   上抛落此（04 侧板 LineageSidePanel 消费）。
 *
 * ── F-LGRAPH-01①U4 编排重构（顶栏并集切换器退役行 1）──
 * - 顶栏=LineageModeBar（三模式分段+图名 mono 小字——图名=folders 单源经
 *   NavGraphPicker 上抛 folders 派生）；左侧=LineageNavPane（Word 导航窗格
 *   兼任图/文件夹切换——S2/S3/S4 语义迁驻）。
 * - 「该文件夹无脉络图」空态提示保留（顶栏紧邻模式栏——executor 定位申报）。
 *
 * ── 接口层 ── export type LineagePageBodyProps；export function
 *   LineagePageBody(props: LineagePageBodyProps): JSX.Element
 *   （侧板跳转三回调与星标回调=LineagePage 组合根的编排体，经 props 透传——
 *   跳转接缝三方头注锚定〔LineagePage+LineageSidePanel+open-paper-bus〕仍指
 *   LineagePage，不随本件迁移）
 */
import { useState } from 'react'
import { MAIN_GRAPH_ID } from '@shared/models/lineage'
import { RetryButton } from '../../shared/ui/RetryButton'
import { useLineageStore } from './lineage.store'
import { LineageAsideHost, type LineageAsideHostProps } from './LineageAsideHost'
import { LineageBoard } from './LineageBoard'
import { LineageModeBar } from './LineageModeBar'
import { LineageNavPane } from './LineageNavPane'
import type { NavFolder } from './nav-graph-picker'

/** 侧板编排回调面（=LineageAsideHost 同名 props——类型单源取自该件，不手写第二份） */
export type LineagePageBodyProps = Pick<
  LineageAsideHostProps,
  'onJumpToPaper' | 'onGotoLibrary' | 'onGotoReader' | 'onToggleStar'
>

export function LineagePageBody(props: LineagePageBodyProps): JSX.Element {
  const status = useLineageStore((s) => s.status)
  const error = useLineageStore((s) => s.error)
  const load = useLineageStore((s) => s.load)
  // [F-LGRAPH-01①U4] 图作用域+节点计数（空态提示消费面）+folders 图名链
  const folderId = useLineageStore((s) => s.folderId)
  const nodeCount = useLineageStore((s) => s.nodes.length)
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
          {/* [F-UIRES-02 批 B R2] 文字重试钮→共享 RetryButton（textContent 恰=
              「重试」——受锁 lineage-timeline-page:256 精确匹配兼容面） */}
          <RetryButton onClick={() => void load()} />
        </div>
      </div>
    )
  }
  const graphName = folders?.find((f) => f.id === folderId)?.name ?? '主图'
  return (
    <div className="flex h-full flex-col">
      {/* [F-LGRAPH-01①U4] 顶栏=模式栏（图名随 folders 单源）+空图提示：folder
          选中且子图空=「该文件夹无脉络图」（区别于时间线通用空态——含
          「未选中文件夹」语境；主图空图不提示——D6 裁决=不引导〔新建文件夹/
          导入 PDF 入口在库页在场〕；文献入库经导入链自动入图，无手动建点路径
          ——F-ALIGN-01 建点入口退役） */}
      <div className="flex items-center gap-3 px-2 pt-2">
        <LineageModeBar graphName={graphName} />
        {folderId !== MAIN_GRAPH_ID && nodeCount === 0 && (
          <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
            该文件夹无脉络图
          </span>
        )}
      </div>
      <div className="flex min-h-0 flex-1 gap-1 p-1">
        <LineageNavPane onFoldersChange={setFolders} />
        <div className="min-w-0 flex-1">
          {/* [F-UIRES-03 B5①] 两钮编排改道：现有回调零改动复用——消费面自 Board→Timeline 卡链转 SidePanel 操作行 */}
          <LineageBoard onSelectNode={setSelectedNodeId} selectedNodeId={selectedNodeId} />
        </div>
        {/* [F-UIRES-03 B4③+F-DBCAMP-01 U3] aside 宿主拆件=LineageAsideHost：
            宽/收起机制原语义原样迁驻（拖右缘 4px 手柄 clamp 200–480+localStorage
            持久；收起=48px 窄条）+页签行「详情｜AI 会话」（详情缺省）——testid
            锚全保持；编排态经 props 透传（Page 行数预算） */}
        <LineageAsideHost
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
