// b3: T3-P7A
/**
 * [F-LINEAGE-01 B2a] lineage-routing —— 走线器桶文件（消费面平滑 re-export）。
 * 实现拆件（各 ≤500 行）：
 * - routing/anchors.ts —— 12 锚点（每边 ¼/½/¾）+主向定边+投影定序+短桩
 *   +AnchorUse 散开（F-LANEGRID-01 §4 端点接驳沿承不动）
 * - routing/avoid.ts —— PAD=6 命中原语+桩/中段分治避让（死区/终门谓词单源）
 * - routing/grid.ts —— [F-LANEGRID-01] 车道表（五族生成+死区补集+全序）
 * - routing/occupancy.ts —— [F-LANEGRID-01] 段级车道占用表
 * - routing/allocate.ts —— [F-LANEGRID-01] 单边最小拐弯确定性搜索分配器
 *   （0 拐直连/同锚错峰/段级溢出/blocked）
 * - routing/chain.ts —— [F-LANEGRID-01] 编排薄层（锚重建+车道登记+逐边
 *   分配+finalize 终门；carried 载入占用入参）
 * - routing/finalize.ts —— r=6→3→0 圆角采样终门+blocked 显式态（INV-79
 *   防御层沿承）
 * 六态链（detour/bands/outer-ring/slots/gap-cells/zapply/residual）随
 * [F-LANEGRID-01 B2b] 随测试重推导整批删除（方案切换=删旧）。
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
