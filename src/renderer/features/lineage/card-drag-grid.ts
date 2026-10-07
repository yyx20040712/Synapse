/**
 * [F-SLOTGRID-01 U3] card-drag-grid —— 拖拽插入点/候选槽阵列算术域（设计书
 * docs/design/2026-10-07_f-slotgrid01-design.md v1.4 §5.5/§8-U3；INV-111
 * 消费面实现——简报预裁决 D1：capacity.ts 禁改，插入语义归本件）。
 *
 * 消费方=card-drag-session.ts（松手/拖中插入位）+drag-slot-candidates.tsx
 * （候选槽阵列）——同源两函数保证「阵列显示=松手落点」（D8）。零 DOM 零
 * React（纯函数，jsdom 直测面=tests/unit/renderer/lineage-drag-grid.test.ts）。
 *
 * 语义（D3 保守含源语义）：拖拽中源卡占位保留——插入位算术按**含源布局**
 * （total=srcIds.length，rowCounts 含源卡）计算，判定面不随占位槽腾位漂移
 * （推挤滞回结构性消除：含源网格拖拽全程恒稳）；松手 settle 后按终布局
 * 重算（routeEpoch 三源 bump 既有链）。坐标 px/py=月框 padding-box 坐标
 * （border 内缘起算——D2；DOM 换算在 card-drag-session 会话侧）。
 */
import {
  CARD_W,
  FRAME_PAD_LEFT,
  FRAME_PAD_TOP,
  PITCH_X,
  PITCH_Y,
  hitTest,
  partitionRows,
  phaseOfRow,
  positionOf
} from './capacity'

/**
 * 网格命中→others 序插入位（INV-111 算式消费面）：
 * 1. hitTest（capacity 同源）按含源 rowCounts 命中卡位 {row,col,index}——
 *    残行钳/行钳/防御守卫全部沿承 capacity 数学（U1 已 21 例锁）；
 * 2. 命中卡中心 x 前侧=插其前（p=index）/后侧=插其后（p=index+1）——p 为
 *    含源坐标插入位 [0,total]；
 * 3. 源卡剔除映射：p>srcIdx 时 others 序=p−1（源及其后卡整体左移一格），
 *    否则 p——p∈{srcIdx,srcIdx+1} 同归 srcIdx（源自身槽前后双侧恒稳=无
 *    双稳带，滞回治理数学锚）。
 * 防御：total≤0/srcIdx 出界→钳回 [0,total-1]；px/py 非有限经 hitTest 守卫
 * 归 {0,0,0}。返回值恒落 [0,total-1]（sweep 单测锁）。
 */
export function insertIndexFromGrid(
  px: number,
  py: number,
  w: number,
  total: number,
  srcIdx: number
): number {
  if (!(total > 0)) return 0
  const rowCounts = partitionRows(total, w).map((r) => r.length)
  const hit = hitTest(px, py, w, rowCounts)
  const centerX = FRAME_PAD_LEFT + phaseOfRow(hit.row) + PITCH_X * hit.col + CARD_W / 2
  const p = px < centerX ? hit.index : hit.index + 1
  const src = Math.max(0, Math.min(Math.round(srcIdx), total - 1))
  const idx = p > src ? p - 1 : p
  return Math.max(0, Math.min(idx, total - 1))
}

/**
 * 候选槽 cell k 坐标（F-DRAGVIS-01：候选槽位阵列=算术网格，含 φ_r 奇偶
 * 相位，随容量公式实时重排——D8）。k∈[0,total-1] 即含源网格全体 cell（每格
 * 一候选=插入位 0..others.length 与 cell 集 1:1）；与松手落点同源=松手落
 * cell insertIdx（settle 往返恒等——cellByWalk 独立 oracle 对账单测锁）。
 * 坐标=月框 padding-box px（drag-slot-candidates absolute 定位域同基准）。
 */
export function candidateSlotAt(k: number, w: number): { x: number; y: number } {
  const { row, col } = positionOf(k, w)
  return {
    x: FRAME_PAD_LEFT + phaseOfRow(row) + PITCH_X * col,
    y: FRAME_PAD_TOP + PITCH_Y * row
  }
}
