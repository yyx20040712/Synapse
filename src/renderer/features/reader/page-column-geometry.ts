// b3: P7-F
/**
 * [F-04] page-column-geometry —— 页列几何纯函数件（PageColumn 拆分，250 行
 * 预裁拆分预案落地；F-01 纯函数原样搬移=方案切换红线：PageColumn.tsx 内旧
 * 定义已删除，本文件为唯一实现，PageColumn 仅再导出 nearestPage 供
 * scroll-progress 既有 import 路径不变）。
 *
 * - 盒几何：columnWidth（最宽页×zoom）/pageBoxHeight（页高×zoom）。
 * - 缩放中心锚（F-04 新增，INV-33）：anchoredScrollTop——总高变化前后保持
 *   (scrollTop+vh/2)/总高 比值，配 columnTotalHeight（盒高合计+盒间距）。
 * - 窗口/回收/中心页/夹取：F-01 语义原样（INV-30/31 消费面）。
 * - 双页布局（F-R1）：PageLayout 类型+layoutRows 行派生/rowWidth 行宽/
 *   columnWidthFor/columnTotalHeightFor 布局口径列宽总高（既有导出语义零变
 *   ——INV/受锁测试消费面；PageLayout 类型单源驻本件）。
 */

/** 页原始尺寸（pdf 用户空间，scale=1 基准——zoom 乘法在盒几何层；F-A7 起=
 *  viewport 旋转口径：/Rotate 归一化后 %180===90 页已交换宽高，与 canvas
 *  渲染盒同口径——构造侧 PageColumn 段①单源归一，本件纯函数透明消费） */
export interface PageBoxSize {
  width: number
  height: number
}

/** 段①越界夹取：1 基页码夹 [1, totalPages]（scrollToPage 前哨，W-A） */
export function clampPageToColumn(pageNo: number, totalPages: number): number {
  return Math.min(Math.max(1, Math.floor(pageNo)), Math.max(1, totalPages))
}

/** 段②列宽：最宽页×zoom（floor——与 canvas CSS 尺寸同口径） */
export function columnWidth(sizes: readonly PageBoxSize[], zoom: number): number {
  return Math.floor(sizes.reduce((m, s) => Math.max(m, s.width), 0) * zoom)
}

/** 段②盒高：页原始高×zoom（floor） */
export function pageBoxHeight(size: PageBoxSize, zoom: number): number {
  return Math.floor(size.height * zoom)
}

/** 页列盒间距（Tailwind gap-3=12px——总高纯函数单源常量，勿在组件复写） */
export const PAGE_GAP_PX = 12

/** 段⑥总高：盒高合计+盒间距×(页数−1)（zoom 乘法——缩放中心锚的比值分母） */
export function columnTotalHeight(sizes: readonly PageBoxSize[], zoom: number): number {
  if (sizes.length === 0) return 0
  const boxes = sizes.reduce((sum, s) => sum + pageBoxHeight(s, zoom), 0)
  return boxes + PAGE_GAP_PX * (sizes.length - 1)
}

/**
 * 段⑥缩放中心锚：总高变化前后保持 (scrollTop+viewportH/2)/总高 比值——
 * zoom 变化后视口中心内容不动。顶部/底部夹取 [0, nextTotalH−viewportH]
 * （放大时下方内容不足则贴底；总高非正=退化防御原样返回）。
 */
export function anchoredScrollTop(scrollTop: number, viewportH: number, prevTotalH: number, nextTotalH: number): number {
  if (prevTotalH <= 0 || nextTotalH <= 0) return scrollTop
  const centerRatio = (scrollTop + viewportH / 2) / prevTotalH
  const raw = centerRatio * nextTotalH - viewportH / 2
  return Math.min(Math.max(raw, 0), Math.max(0, nextTotalH - viewportH))
}

/** 段③渲染窗口：可见页±renderWindow（夹 [1,totalPages]）；空可见=顶部引导窗口（首屏） */
export function windowPages(visible: ReadonlySet<number>, totalPages: number, renderWindow: number): number[] {
  const want = new Set<number>()
  for (const v of visible) {
    for (let d = -renderWindow; d <= renderWindow; d += 1) {
      const no = v + d
      if (no >= 1 && no <= totalPages) want.add(no)
    }
  }
  if (want.size === 0 && totalPages > 0) {
    for (let no = 1; no <= Math.min(renderWindow + 1, totalPages); no += 1) want.add(no)
  }
  return [...want].sort((a, b) => a - b)
}

/** 段③回收调度：已渲染页距任一可见页≤recycleWindow 才保留（离屏必回收——
 *  INV-30 canvas 生命周期=渲染窗口绑定） */
export function recycledPages(rendered: ReadonlySet<number>, visible: ReadonlySet<number>, recycleWindow: number): Set<number> {
  const keep = new Set<number>()
  for (const p of rendered) {
    for (const v of visible) {
      if (Math.abs(p - v) <= recycleWindow) {
        keep.add(p)
        break
      }
    }
  }
  return keep
}

/** 视口中心最近页（1 基；F-03 滚动→页回写的几何前置——本单纯函数交付） */
export function nearestPage(centerY: number, boxes: ReadonlyArray<{ top: number; height: number }>): number {
  let best = 1
  let bestDist = Infinity
  boxes.forEach((b, i) => {
    const inside = centerY >= b.top && centerY <= b.top + b.height
    const d = inside ? -1 : Math.abs(centerY - (b.top + b.height / 2))
    if (d < bestDist) {
      bestDist = d
      best = i + 1
    }
  })
  return best
}

// ── F-R1 双页阅读模式（页布局几何——类型与行派生单源驻本件，纯 renderer 域）──

/** 页布局（F-R1）：single=既有单列；double=两页一行 (1,2)(3,4)…（per-tab
 *  视图态，与 zoom/color/selectionMode 同型；类型不跨进程不入 src/shared） */
export type PageLayout = 'single' | 'double'

/** 双页行（F-R1）：左页盒必有；right/rightNo 末行奇数页时缺席 */
export interface PageRow {
  left: PageBoxSize
  leftNo: number
  right?: PageBoxSize
  rightNo?: number
}

/** F-R1 行派生：页尺寸数组→行数组 (1,2)(3,4)…；末行奇数页 right 缺席 */
export function layoutRows(sizes: readonly PageBoxSize[]): ReadonlyArray<PageRow> {
  const rows: PageRow[] = []
  for (let i = 0; i < sizes.length; i += 2) {
    rows.push(
      i + 1 < sizes.length
        ? { left: sizes[i]!, leftNo: i + 1, right: sizes[i + 1]!, rightNo: i + 2 }
        : { left: sizes[i]!, leftNo: i + 1 }
    )
  }
  return rows
}

/** F-R1 盒宽：页原始宽×zoom（floor——与 canvas CSS 尺寸同口径；双页行内
 *  盒宽=各自页宽（左顶对齐），单页列盒宽=列宽（最宽页）） */
export function pageBoxWidth(size: PageBoxSize, zoom: number): number {
  return Math.floor(size.width * zoom)
}

/** F-R1 行宽：左盒宽+右盒宽+行内 gap（PAGE_GAP_PX 单源常量，与行间 gap
 *  同值同语义——不随 zoom 缩放，columnTotalHeight 盒间距口径一致）；
 *  右缺席（末行单页）=左盒宽（无尾随 gap） */
export function rowWidth(row: PageRow, zoom: number): number {
  if (row.right === undefined) return pageBoxWidth(row.left, zoom)
  return pageBoxWidth(row.left, zoom) + pageBoxWidth(row.right, zoom) + PAGE_GAP_PX
}

/** F-R1 布局口径列宽：single=columnWidth 语义零变（单实现复用）；double=
 *  最宽完整行宽（末行单页行不计——列宽不被孤页抬宽）；全列无完整行
 *  （单页文档开双页）退化最宽页宽 */
export function columnWidthFor(sizes: readonly PageBoxSize[], zoom: number, layout: PageLayout): number {
  if (layout !== 'double') return columnWidth(sizes, zoom)
  let max = 0
  for (const row of layoutRows(sizes)) {
    if (row.right === undefined) continue
    max = Math.max(max, rowWidth(row, zoom))
  }
  return max > 0 ? max : columnWidth(sizes, zoom)
}

/** F-R1 布局口径总高（INV-33 分母）：single=columnTotalHeight 语义零变；
 *  double=行高和（行高=max(左右页高)）+行 gap×(行数−1)（gap 不随 zoom——
 *  单页口径盒间距同语义） */
export function columnTotalHeightFor(sizes: readonly PageBoxSize[], zoom: number, layout: PageLayout): number {
  if (layout !== 'double') return columnTotalHeight(sizes, zoom)
  const rows = layoutRows(sizes)
  if (rows.length === 0) return 0
  let sum = 0
  for (const row of rows) {
    const right = row.right !== undefined ? pageBoxHeight(row.right, zoom) : 0
    sum += Math.max(pageBoxHeight(row.left, zoom), right)
  }
  return sum + PAGE_GAP_PX * (rows.length - 1)
}
