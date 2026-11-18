// b3: T3-P7A
/**
 * [F-LINEAGE-02 ①a] lineage-routing —— 甲走线器桶文件（消费面平滑 re-export）。
 * 实现拆件（各 ≤300 行）：
 * - routing/anchors.ts —— 12 锚点（每边 ¼/½/¾）+主向定边+投影定序+短桩 s0
 * - routing/avoid.ts —— PAD=4 命中原语+桩/中段分治避让（D-L2-4）
 * - routing/rounding.ts —— 共线剔除（D-L2-14）+r=6 圆角化+边界表（W-5）
 * - routing/chain.ts —— 六态编排（direct→h-slip→detour→band→outer-ring
 *   →overlap +manual-override——[F-SLOTGRID-01 U2] corridor/fallback/车道族
 *   随走廊彻底退役删除；[R2-C2] outer-ring=图域最外圈车道末级候选）+同锚散开
 * - routing/detour.ts —— [F-SLOTGRID-01 U2] 段式近绕专态+网格通道模型
 * - routing/slots.ts+gap-cells.ts+zapply.ts+residual.ts —— 走线候选位分配族
 * - routing/finalize.ts —— 槽位后圆角采样终门（r=6→3→0）+blocked 显式态
 * 旧五级链与 corridor/fallback/defaultCorridor/CORRIDOR_* 常量族已随方案切换
 * 整体退役删除（宪法 E5/B3；测试数据可清授权 v95 §2-1）。
 * 快照采集 buildSnapshot 驻 EdgeOverlay hook 层=唯一不纯点（本桶零 DOM）。
 */
export { routeAll, routeEdge } from './routing/chain'
export { finalizePath } from './routing/finalize'
export type { FinalizedPath, RouteClearance } from './routing/finalize'
export type {
  EdgeGeomInput,
  LayoutSnapshot,
  MonthFrame,
  RoutedPath,
  RouteTag
} from './routing/chain'
export type { Pt, Rect } from './routing/anchors'
