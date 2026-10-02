// b3: T3-P7A
/**
 * [F-LINEAGE-02 ①a] lineage-routing —— 甲走线器桶文件（消费面平滑 re-export）。
 * 实现拆四件（各 ≤300 行，design-final §3）：
 * - routing/anchors.ts —— 12 锚点（每边 ¼/½/¾）+主向定边+投影定序+短桩 s0
 * - routing/avoid.ts —— PAD=4 命中原语+桩/中段分治避让（D-L2-4）
 * - routing/rounding.ts —— 共线剔除（D-L2-14）+r=6 圆角化+边界表（W-5）
 * - routing/chain.ts —— 六态编排（direct→h-slip→band→corridor→fallback
 *   +manual-override）+车道+同锚散开
 * 旧五级链（vertical 贝塞尔/arc/detour/detour-bottom/gap-h/gap-v 及其
 * check 族/gapCandidates/gapBelow）已随方案切换整体退役删除（宪法 E5/B3；
 * F-ROUTE-01 2026-09-29 先例——测试数据可清授权 v95 §2-1）。
 * 快照采集 buildSnapshot 驻 EdgeOverlay hook 层=唯一不纯点（本桶零 DOM）。
 */
export { defaultCorridor, laneIndex, routeAll, routeEdge } from './routing/chain'
export type {
  Corridor,
  EdgeGeomInput,
  LayoutSnapshot,
  MonthFrame,
  RoutedPath,
  RouteTag
} from './routing/chain'
export type { Pt, Rect } from './routing/anchors'
