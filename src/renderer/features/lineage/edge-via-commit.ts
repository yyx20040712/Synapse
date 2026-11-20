/**
 * [R2-C3] edge-via-commit —— 手动调线统一提交门（via 写入单点收敛）。
 *
 * 四个手动提交口（拖顶点松手 / 拖段松手含自动线物化 / 双击加点 / 菜单
 * 删点与重置走线）全部经 commitEdgeVia 写库，不再直调 store.setEdgeVia：
 * - 非法 via 松手即回弹——不写库、零撤销单元、零 dirty，toast 反馈；拦截面
 *   两道（[F-LANEGRID-01 B3b §11-1 甲] 裁决「人工调整必须受网格约束」）：
 *   ①格点/正交校验（validateViaOnGrid——逐 via 点在车道交点上+全点链〔含
 *   端锚，锚=路由同源派生〕全部段正交，车道表=buildLaneTable 同源直算；过
 *   门后 via 钳制到精确格点落库——GRID_TOL 仅判定容差不入库；拒绝文案与
 *   blocked 分立）；
 *   ②穿障校验沿承（穿文献卡/月标注/年份头——圆角采样谓词与 routeAll 终门
 *   同源：经 routeEdge 单边复算承载，不另写谓词）；
 * - via=null/空数组=清除回自动路由（空数组归一 null——N-1 空与缺省同义），
 *   免门直写：自动链 routeAll 自带终门；
 * - host 缺席（会话已死）=防御拒写。
 * DB 既有旧 via（自由坐标）不经本门改写——显示与终门沿承（遗产面=B4 关账
 * 表登记，随障碍变重排/用户编辑逐步消亡）。
 * return true=已提交；false=非法回弹/防御拒写。
 */
import type { LineageEdge, LineageViaPoint } from '@shared/models/lineage'
import { buildSnapshot, pinOf } from './edge-overlay-geom'
import { routeEdge } from './lineage-routing'
import { useLineageStore } from './lineage.store'
import { showToast } from '../../shared/ui/toast-store'
import { validateViaOnGrid, nearestLaneIntersection } from './edge-edit'
import { laneLinesOf } from './edge-edit-geom'
import { anchorPoint, selectAnchor } from './routing/anchors'

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
  // [F-LANEGRID-01 B3b+B3 回炉①/⑥] 门一：格点/正交校验+落库规范化。
  // 正交检面=全点链 [anchorA,...via,anchorB] 全部段（锚=路由同源派生：钉定
  // 直取/主向定边——对齐 routeOne manual 分支；单 via 斜端段不漏检）；过门
  // 后 via 点钳制到精确车道格点（GRID_TOL 仅判定容差不入库——近轴段〔dx≤0.6
  // 的「竖直」段〕写库后为精确轴对齐，chain 登记口径 CELL_EPS 全段生效）。
  // 端点卡缺席=锚不可派生，交 routeEdge 端点缺失防御早退
  const src = snap.cards.get(edge.fromNode)
  const tgt = snap.cards.get(edge.toNode)
  let toWrite = normalized
  if (src !== undefined && tgt !== undefined) {
    const lines = laneLinesOf(snap)
    const a = fa !== undefined ? anchorPoint(src, fa.side, fa.slot) : selectAnchor(src, normalized[0]!).pt
    const b = ta !== undefined ? anchorPoint(tgt, ta.side, ta.slot) : selectAnchor(tgt, normalized[normalized.length - 1]!).pt
    if (validateViaOnGrid(normalized, lines, [a, b]) !== true) {
      showToast('落点未在车道格点上，已回弹', 'error')
      return false
    }
    toWrite = normalized.map((p) => nearestLaneIntersection(p, lines))
  }
  // 门二：穿障校验沿承（谓词=终门同源；manual 分支不消费 AnchorUse/车道
  // 占用分配面，单边与全图逐字节同构——校验/落库载荷=规范化值 toWrite）
  const verdict = routeEdge(
    {
      edgeId: edge.id,
      sourceId: edge.fromNode,
      targetId: edge.toNode,
      via: toWrite,
      ...(fa !== undefined ? { fromAnchor: fa } : {}),
      ...(ta !== undefined ? { toAnchor: ta } : {})
    },
    snap
  )
  if (verdict.clearance === 'blocked') {
    showToast('落点无可行走线，已回弹', 'error')
    return false
  }
  useLineageStore.getState().setEdgeVia(edge.id, toWrite)
  return true
}
