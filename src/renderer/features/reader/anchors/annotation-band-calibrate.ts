/**
 * [F-A9] annotation-band-calibrate —— 标注带垂直几何 DOM span 校准域（方案 A
 * 「渲染时 DOM 校准」，主控预裁 scripts/audits/f-a9-brief.md §1；诊断数据
 * f-a9-real6/f-a9-diag.raw.txt）。
 *
 * ── 行为层 ──
 * - 根因背景：项盒（itemBoxOf）盒顶=基线−**styles 声明 ascent**×fontH、盒高=
 *   item.height×scale（PDF 声明）；而 pdf.js textLayer span 定位=基线−
 *   **#getAscent 量测 ratio**（pdf.mjs:11079 measureText 像素量测回退字体——
 *   与声明值不同源）×fontH、盒高=fontH（line-height:1）。小字号（7~8px）下
 *   两系统差=带整体偏移 ~2.5~3px（img1 灰带/img3 underline 低位切字——字号
 *   比例函数）。本域按预裁用量测侧单点校准：span 位置由 pdf.js 按 transform
 *   定位，与 canvas 字形对齐度高于声明几何推导。
 * - 校准窗口径（错绑防护）：span **中心** ∈ band 派生垂直域 [top,bottom]×base.h
 *   且 span 与 band 水平区间（x0/x1）重叠>0 才计入；命中集的盒并集
 *   [min top, max bottom] 即 calTop/calBottom（带 y=行盒顶/高=行盒高——票面
 *   验收口径）。中心域外/水平域外/零量测 → cal 域缺席（消费方回退派生值
 *   ——**回退语义零变**；受锁 selection-item-chain 夹具「span 与项链刻意
 *   错开 116px」形态按窗天然不命中=项链产物零变）。
 * - 校准只动显示带：rects 派生域零变（落库/保存链不受影响——INV-58 前半）；
 *   matchBand 匹配键仍派生 center（消费方 annotation-resolve——错绑零风险）。
 *
 * ── 接口层 ──
 * - export function spanBoxesOf（textLayer → 一次量测产物——多条 band 组共享
 *   量测：layered 编排每页一次）/ calibrateBands（量测产物+派生 bands+归一基准
 *   → 校准 bands 纯匹配核）/ calibrateBandsWithSpans（组合便捷形——selection
 *   链 evaluate 每帧一次量测+匹配）
 * - base=消费方传（selection 链 pixelBoxOf(textLayer)/layered 链 entry.box——
 *   INV-37 同盒：textLayer 盒与 canvas CSS 盒 inset:0 同尺寸）；域一致防御：
 *   量测盒与 base 宽高差 >1px → 不校准（域错配=回退非错校）
 *
 * ── 架构层 ──
 * - 依赖单向：本件→annotation-anchor（pixelBoxOf）/annotation-resolve（RowBand
 *   类型）；DOM 只读 gBCR（bandsNearRects 同先例）；零环
 * - 量测成本：textLayer 全量 span gBCR（布局稳定时缓读——拖选 rAF 帧率下页
 *   级行簇量级，bandsNearRects 先例同域）；**零缓存**（zoom 变更→canvas 重渲
 *   →span 盒变——现量即真值，缩放不变性随消费方每次调用成立）
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - tests/unit/renderer/band-calibration.test.tsx（本票新件 always-active：
 *   纯几何窗+matchBand 替换+两链挂载级）
 */
import { pixelBoxOf, type PixelBox } from './annotation-anchor'
import type { RowBand } from './annotation-resolve'

/** 量测产物：textLayer 全量有效 span 盒（gBCR 视口域）+textLayer 视口盒 */
export interface SpanBoxes {
  base: PixelBox
  boxes: Array<{ top: number; bottom: number; left: number; right: number }>
}

/** textLayer → span 盒一次量测（零宽/零高 span 跳过——jsdom 无布局/空层形态；
 *  textLayer 盒退化（h/w≤1）或零有效 span → null=无校准材料） */
export function spanBoxesOf(textLayer: HTMLElement): SpanBoxes | null {
  const base = pixelBoxOf(textLayer)
  if (base.w <= 1 || base.h <= 1) {
    return null
  }
  const boxes: SpanBoxes['boxes'] = []
  for (const span of Array.from(textLayer.querySelectorAll('span'))) {
    // gBCR 轴对齐盒：x/y≡left/top（span 的 scaleX/rotate transform 不改 bbox 观测）
    const g = span.getBoundingClientRect()
    if (g.width <= 1 || g.height <= 1) {
      continue
    }
    boxes.push({ top: g.y, bottom: g.y + g.height, left: g.x, right: g.x + g.width })
  }
  return boxes.length > 0 ? { base, boxes } : null
}

/** 域一致防御容差（px）：量测盒与归一基准盒宽高差超此值=域错配（非同盒） */
const BASE_MISMATCH_PX = 1

/** 量测产物+派生 bands+归一基准 → 校准 bands（纯匹配核——不改输入对象；
 *  命中窗：span 中心∈band 垂直域 且 水平区间重叠>0（x0/x1 缺席=无水平域
 *  材料→不校准，防邻列误收）；零命中 → 原 band 引用透传） */
export function calibrateBands(spans: SpanBoxes, bands: RowBand[], base: PixelBox): RowBand[] {
  if (bands.length === 0 || base.w <= 0 || base.h <= 0) {
    return bands
  }
  if (Math.abs(spans.base.w - base.w) > BASE_MISMATCH_PX || Math.abs(spans.base.h - base.h) > BASE_MISMATCH_PX) {
    return bands
  }
  return bands.map((b) => {
    if (b.x0 === undefined || b.x1 === undefined || b.x1 <= b.x0) {
      return b
    }
    const topPx = b.top * base.h + spans.base.y
    const bottomPx = b.bottom * base.h + spans.base.y
    const x0Px = b.x0 * base.w + spans.base.x
    const x1Px = b.x1 * base.w + spans.base.x
    let calTop = Number.POSITIVE_INFINITY
    let calBottom = Number.NEGATIVE_INFINITY
    let hit = false
    for (const g of spans.boxes) {
      const cy = (g.top + g.bottom) / 2
      if (cy < topPx || cy > bottomPx) {
        continue
      }
      if (!(g.right > x0Px && g.left < x1Px)) {
        continue
      }
      hit = true
      calTop = Math.min(calTop, g.top)
      calBottom = Math.max(calBottom, g.bottom)
    }
    if (!hit) {
      return b
    }
    return { ...b, calTop: (calTop - spans.base.y) / base.h, calBottom: (calBottom - spans.base.y) / base.h }
  })
}

/** 组合便捷形（selection 链 evaluate 消费——每帧一次量测+匹配；
 *  量测退化 → bands 原样） */
export function calibrateBandsWithSpans(textLayer: HTMLElement, bands: RowBand[], base: PixelBox): RowBand[] {
  const spans = spanBoxesOf(textLayer)
  return spans === null ? bands : calibrateBands(spans, bands, base)
}
