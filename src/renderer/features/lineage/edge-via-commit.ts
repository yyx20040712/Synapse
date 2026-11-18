/**
 * [R2-C3] edge-via-commit —— 手动调线统一提交门（via 写入单点收敛）。
 *
 * 四个手动提交口（拖顶点松手 / 拖段松手含自动线物化 / 双击加点 / 菜单
 * 删点与重置走线）全部经 commitEdgeVia 写库，不再直调 store.setEdgeVia：
 * - 非法 via（穿文献卡/月标注/年份头——圆角采样谓词与 routeAll 终门同源：
 *   经 routeEdge 单边复算承载〔manual 分支不消费 AnchorUse/ChannelUse/槽
 *   位，单边与全图逐字节同构〕，不另写谓词）松手即回弹——不写库、零撤销
 *   单元、零 dirty，toast 反馈；
 * - via=null/空数组=清除回自动路由（空数组归一 null——N-1 空与缺省同义），
 *   免门直写：自动链 routeAll 自带终门；
 * - host 缺席（会话已死）=防御拒写。
 * return true=已提交；false=非法回弹/防御拒写。
 */
import type { LineageEdge, LineageViaPoint } from '@shared/models/lineage'
import { buildSnapshot, pinOf } from './edge-overlay-geom'
import { routeEdge } from './lineage-routing'
import { useLineageStore } from './lineage.store'
import { showToast } from '../../shared/ui/toast-store'

export function commitEdgeVia(args: {
  /** EdgeOverlay svg；content=host?.parentElement（.tl-content） */
  host: SVGSVGElement | null
  edge: Pick<LineageEdge, 'id' | 'fromNode' | 'toNode' | 'fromAnchor' | 'toAnchor'>
  via: LineageViaPoint[] | null
}): boolean {
  const { host, edge, via } = args
  // 清除回自动路由：免门直写（空数组归一 null；null 分支先于宿主检查——
  // 会话已死时清除动作仍成立）
  const normalized = via !== null && via.length > 0 ? via : null
  if (normalized === null) {
    useLineageStore.getState().setEdgeVia(edge.id, null)
    return true
  }
  const content = host?.parentElement
  if (!(content instanceof HTMLElement)) return false
  const snap = buildSnapshot(content)
  // 锚装配同 EdgeOverlay（pinOf 自检失败按未钉定——读侧降级单源）
  const fa = pinOf(edge.fromAnchor)
  const ta = pinOf(edge.toAnchor)
  const verdict = routeEdge(
    {
      edgeId: edge.id,
      sourceId: edge.fromNode,
      targetId: edge.toNode,
      via: normalized,
      ...(fa !== undefined ? { fromAnchor: fa } : {}),
      ...(ta !== undefined ? { toAnchor: ta } : {})
    },
    snap
  )
  if (verdict.clearance === 'blocked') {
    showToast('落点无可行走线，已回弹', 'error')
    return false
  }
  useLineageStore.getState().setEdgeVia(edge.id, normalized)
  return true
}
