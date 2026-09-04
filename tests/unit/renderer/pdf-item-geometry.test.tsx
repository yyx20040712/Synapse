// @vitest-environment jsdom
/**
 * [F-A6-b2] pdf-item-geometry —— 项声明几何域纯函数测试（always-active，诞生即锁）。
 *
 * 覆盖（票面 §1-B 六组）：项矩形（LTR/旋转 90/竖排轴互换）/grapheme 细分
 * （CJK+emoji 代理对按感知字符恰分+RTL 方向翻转——**取证 §9-4 数据缺口
 * [RTL/竖排/项内部分选中运行时触发面全零]的单测补，票面验收条件**）/偏移表
 * （空串项·EOL 项跳过+对账）/基线分组（多行一行一块+x 大 gap 断段+旋转页
 * v 轴投影——mLR y 盲区判别）/bands 同源（scale 1 vs 1.5 归一化不变——缩放
 * 不变断言）/G2（健康偏离率 0+病理 >5% 触发+右溢占位支隔离）。
 *
 * 夹具=合成 items/styles/viewport 纯数据（零 DOM 依赖——被测件纯函数）；期望
 * 值手算自 pdf.mjs PageViewport/Util.transform 数学（viewportTransformFor 头注
 * 行号锚），非实现回填。变异红证 ≥3（细分方向翻转删除断言/基线分组阈值破坏/
 * G2 阈值改 0.5——文件备份法，红证档随完成报告）。
 */
import { describe, expect, it } from 'vitest'
import type { PdfTextItem, PdfTextStyle } from '../../../src/renderer/features/reader/PdfPageCanvas'
import {
  SELECTION_DEV_RATIO_THRESHOLD,
  baselineGroupBlocks,
  buildItemOffsets,
  itemSelectionGeometry,
  reconcileItemsWithDom,
  rectsForOffsetRange,
  selectionHealth,
  viewportTransformFor,
  type ItemBox,
  type ItemViewport
} from '../../../src/renderer/features/reader/pdf-item-geometry'

/** 横排样式（ascent 0.8/descent −0.2——盒=基线±(8,2)px@fontH10） */
const STYLE_H: PdfTextStyle = { fontFamily: 'serif', ascent: 0.8, descent: -0.2, vertical: false }
const STYLES = { g1: STYLE_H }

const VP0: ItemViewport = { scale: 1, rotate: 0, view: [0, 0, 612, 792] }
const VP90: ItemViewport = { scale: 1, rotate: 90, view: [0, 0, 612, 792] }

/** 造项：transform=[fs,0,0,fs,x,y]（PDF 用户空间基线点 (x,y)，字号 fs） */
function mkItem(str: string, x: number, y: number, opts: Partial<PdfTextItem> = {}): PdfTextItem {
  return {
    str,
    dir: 'ltr',
    width: 100,
    height: 10,
    transform: [10, 0, 0, 10, x, y],
    fontName: 'g1',
    hasEOL: false,
    ...opts
  }
}

/** 三行夹具（基线 PDF y=700/672/644——viewport 域 92/120/148，行距 28>容差 5） */
function threeRows(): PdfTextItem[] {
  return [mkItem('ROW1', 72, 700), mkItem('ROW2', 72, 672), mkItem('ROW3', 72, 644)]
}

describe('pdf-item-geometry 项矩形（viewport transform 合成——pdf.mjs 数学内联）', () => {
  it('viewportTransformFor：rotate 0/90/180 的六元变换与 pdf.mjs PageViewport 构造器逐位一致', () => {
    expect(viewportTransformFor(VP0)).toEqual([1, 0, 0, -1, 0, 792])
    expect(viewportTransformFor(VP90)).toEqual([0, 1, 1, 0, 0, 0])
    expect(viewportTransformFor({ scale: 1, rotate: 180, view: [0, 0, 612, 792] })).toEqual([-1, 0, 0, 1, 612, 0])
  })

  it('LTR 横排已知 transform：像素矩形=基线点−ascent×fontH 起、宽=width×scale（手算：基线 (72,92)、盒 {72,84,100,10}）', () => {
    const { boxes } = rectsForOffsetRange([mkItem('ABC', 72, 700)], STYLES, VP0, 0, 3)
    expect(boxes.length).toBe(1)
    expect(boxes[0]!.rect.x).toBeCloseTo(72, 6)
    expect(boxes[0]!.rect.y).toBeCloseTo(84, 6)
    expect(boxes[0]!.rect.w).toBeCloseTo(100, 6)
    expect(boxes[0]!.rect.h).toBeCloseTo(10, 6)
    expect(boxes[0]!.vProj).toBeCloseTo(92, 6)
    expect(boxes[0]!.fontH).toBeCloseTo(10, 6)
  })

  it('ascent≤0 兜底 0.8（F-A8 门 1b——pdf.mjs #getAscent DEFAULT_FONT_ASCENT=0.8 先例：0=字体未声明非合法度量）：ascent:0 样式 → 盒顶=基线−0.8×fontH=84（修前直消费 0：盒顶贴基线 92=行膨胀缺失必红）', () => {
    const styles = { g1: { ...STYLE_H, ascent: 0, descent: 0 } }
    const { boxes } = rectsForOffsetRange([mkItem('ASC', 72, 700)], styles, VP0, 0, 3)
    expect(boxes[0]!.rect.y).toBeCloseTo(84, 6)
    expect(boxes[0]!.rect.h).toBeCloseTo(10, 6)
    // 负 ascent（有限但非法度量）同兜底 0.8
    const neg = rectsForOffsetRange([mkItem('NEG', 72, 700)], { g1: { ...STYLE_H, ascent: -0.05, descent: -0.2 } }, VP0, 0, 3)
    expect(neg.boxes[0]!.rect.y).toBeCloseTo(84, 6)
  })

  it('ascent 正常度量逐位不变回归（门 1b）：0.7 直消费 → 盒顶=85；样式缺席（fontName 无 styles 条目）→ 0.8 兜底口径不变（=84）', () => {
    const ok = rectsForOffsetRange([mkItem('N7', 72, 700)], { g1: { ...STYLE_H, ascent: 0.7, descent: -0.3 } }, VP0, 0, 2)
    expect(ok.boxes[0]!.rect.y).toBeCloseTo(85, 6)
    expect(ok.boxes[0]!.rect.h).toBeCloseTo(10, 6)
    const absent = rectsForOffsetRange([mkItem('N0', 72, 700, { fontName: 'g9' })], STYLES, VP0, 0, 2)
    expect(absent.boxes[0]!.rect.y).toBeCloseTo(84, 6)
  })

  it('旋转 90 页：viewportTransformFor=[0,1,1,0,0,0]，项盒轴随行进角 π/2 旋转（手算 {698,72,10,100}）+vProj=−tx4（行分隔随旋转轴换）', () => {
    const { boxes } = rectsForOffsetRange([mkItem('ROT', 72, 700)], STYLES, VP90, 0, 3)
    expect(boxes[0]!.rect.x).toBeCloseTo(698, 6)
    expect(boxes[0]!.rect.y).toBeCloseTo(72, 6)
    expect(boxes[0]!.rect.w).toBeCloseTo(10, 6)
    expect(boxes[0]!.rect.h).toBeCloseTo(100, 6)
    expect(boxes[0]!.vProj).toBeCloseTo(-700, 6)
  })

  it('竖排 vertical=true：轴互换（宽=item.height 沿行进向、高=item.width）+ascent 沿旋转后法向（手算 {78,92,2,50}）', () => {
    const styles = { g1: { ...STYLE_H, vertical: true } }
    const { boxes } = rectsForOffsetRange(
      [mkItem('縦書', 72, 700, { width: 2, height: 50 })],
      styles,
      VP0,
      0,
      2
    )
    expect(boxes[0]!.rect.x).toBeCloseTo(78, 6)
    expect(boxes[0]!.rect.y).toBeCloseTo(92, 6)
    expect(boxes[0]!.rect.w).toBeCloseTo(2, 6)
    expect(boxes[0]!.rect.h).toBeCloseTo(50, 6)
  })
})

describe('pdf-item-geometry grapheme 细分（C2——UTF-16 码元计数禁用）', () => {
  it('CJK+emoji 混排项内选中起于中间：代理对按 grapheme 恰分（"a👍汉b" 选 [1,4)=👍汉 → f=1/4..3/4，x=97/w=50；UTF-16 计数给 x=92/w=60 必红）', () => {
    const { boxes } = rectsForOffsetRange([mkItem('a👍汉b', 72, 700)], STYLES, VP0, 1, 4)
    expect(boxes[0]!.rect.x).toBeCloseTo(97, 6)
    expect(boxes[0]!.rect.w).toBeCloseTo(50, 6)
    expect(boxes[0]!.rect.y).toBeCloseTo(84, 6)
  })

  it('RTL 项（dir=rtl）细分方向翻转："אבג" 选前两字 → 盒取右段 [1/3,1]（x≈105.33/w≈66.67；LTR 直除给 x=72 必红）', () => {
    const { boxes } = rectsForOffsetRange([mkItem('אבג', 72, 700, { dir: 'rtl' })], STYLES, VP0, 0, 2)
    expect(boxes[0]!.rect.x).toBeCloseTo(72 + 100 / 3, 6)
    expect(boxes[0]!.rect.w).toBeCloseTo((100 * 2) / 3, 6)
  })

  it('全项覆盖（区间含整项）不细分：整盒原样（x=72/w=100）', () => {
    const { boxes } = rectsForOffsetRange([mkItem('abc', 72, 700)], STYLES, VP0, 0, 3)
    expect(boxes[0]!.rect.x).toBeCloseTo(72, 6)
    expect(boxes[0]!.rect.w).toBeCloseTo(100, 6)
  })
})

describe('pdf-item-geometry 偏移表（DOM 全文偏移 ↔ 项 str 偏移）', () => {
  it('buildItemOffsets：空串项（含 EOL 标记项）零宽跳过、非空项（含 hasEOL）累计；对账函数全等/失配判别', () => {
    const items = [
      mkItem('AB', 72, 700, { hasEOL: true }),
      mkItem('', 72, 672, { hasEOL: true }),
      mkItem('CD', 72, 644)
    ]
    const { spans, total } = buildItemOffsets(items)
    expect(spans).toEqual([
      { index: 0, start: 0, end: 2 },
      { index: 2, start: 2, end: 4 }
    ])
    expect(total).toBe(4)
    expect(reconcileItemsWithDom(items, 'ABCD')).toBe(true)
    expect(reconcileItemsWithDom(items, 'ABCX')).toBe(false)
    expect(reconcileItemsWithDom(items, 'AB CD')).toBe(false)
  })

  it('跨项区间 [1,3)：两项各按项内比例细分（AB 取后半 x=122/w=50；CD 项前半 x=150/w=50）——空串项不产生盒', () => {
    const items = [mkItem('AB', 72, 700), mkItem('', 72, 672), mkItem('CD', 150, 700)]
    const { boxes } = rectsForOffsetRange(items, STYLES, VP0, 1, 3)
    expect(boxes.length).toBe(2)
    expect(boxes[0]!.rect.x).toBeCloseTo(122, 6)
    expect(boxes[0]!.rect.w).toBeCloseTo(50, 6)
    expect(boxes[1]!.rect.x).toBeCloseTo(150, 6)
    expect(boxes[1]!.rect.w).toBeCloseTo(50, 6)
  })
})

describe('pdf-item-geometry 基线分组并块（取证口径 2）', () => {
  it('多行项集：每行恰一块（3 基线 → 3 块，y=盒顶 84/112/140 升序）', () => {
    const { boxes, tolPx } = rectsForOffsetRange(threeRows(), STYLES, VP0, 0, 12)
    expect(tolPx).toBeCloseTo(5, 6) // max(2, 0.5×fontH10)
    const blocks = baselineGroupBlocks(boxes, tolPx, 612)
    expect(blocks.length).toBe(3)
    ;[84, 112, 140].forEach((y, i) => expect(blocks[i]!.y).toBeCloseTo(y, 6))
    for (const b of blocks) {
      expect(b.x).toBeCloseTo(72, 6)
      expect(b.w).toBeCloseTo(100, 6)
      expect(b.h).toBeCloseTo(10, 6)
    }
  })

  it('同行大 x 间隙断段（gap 180 > max(1.5×行高, 2% 页宽)=15）→两块；小 gap 8 ≤15 不断（对照）', () => {
    const wide = (x: number): PdfTextItem[] => [mkItem('L', 72, 700, { width: 20 }), mkItem('R', x, 700, { width: 20 })]
    const split = baselineGroupBlocks(rectsForOffsetRange(wide(272), STYLES, VP0, 0, 2).boxes, 5, 612)
    expect(split.length).toBe(2)
    expect(split[0]!.x).toBeCloseTo(72, 6)
    expect(split[1]!.x).toBeCloseTo(272, 6)
    const joined = baselineGroupBlocks(rectsForOffsetRange(wide(100), STYLES, VP0, 0, 2).boxes, 5, 612)
    expect(joined.length).toBe(1)
    expect(joined[0]!.w).toBeCloseTo(48, 6)
  })

  it('旋转页 v 轴投影：三行同 x_pdf、基线 y 692/664/636 → 盒 y 区间全部相同 [72,112]（y 聚类必并 1 块=mLR 盲区形态）而 v 投影分 3 行', () => {
    const items = [692, 664, 636].map((y) => mkItem('R', 72, y, { width: 40 }))
    const { boxes, tolPx } = rectsForOffsetRange(items, STYLES, VP90, 0, 3)
    const blocks = baselineGroupBlocks(boxes, tolPx, 792)
    expect(blocks.length).toBe(3)
    // 各块=竖排文字段 {x:y_pdf−2, y:72, w:10, h:40}（手算：q0=(y+8,72)，宽向 +y 40px）
    ;[634, 662, 690].forEach((x, i) => expect(blocks[i]!.x).toBeCloseTo(x, 6))
    for (const b of blocks) {
      expect(b.y).toBeCloseTo(72, 6)
      expect(b.w).toBeCloseTo(10, 6)
      expect(b.h).toBeCloseTo(40, 6)
    }
  })
})

describe('pdf-item-geometry bands 同源与缩放不变（C5）', () => {
  it('itemSelectionGeometry：scale 1 与 1.5 的归一化 rects/bands 相等（项几何缩放不变——零重算根基）', () => {
    const items = threeRows()
    const at1 = itemSelectionGeometry({ items, styles: STYLES, viewport: VP0, start: 0, end: 12, base: { x: 0, y: 0, w: 612, h: 792 } })
    const at15 = itemSelectionGeometry({
      items,
      styles: STYLES,
      viewport: { scale: 1.5, rotate: 0, view: [0, 0, 612, 792] },
      start: 0,
      end: 12,
      base: { x: 0, y: 0, w: 918, h: 1188 }
    })
    expect(at1).not.toBeNull()
    expect(at15).not.toBeNull()
    expect(at1!.rects.length).toBe(3)
    expect(at15!.rects.length).toBe(3)
    at1!.rects.forEach((r, i) => {
      const q = at15!.rects[i]!
      expect(r.x).toBeCloseTo(q.x, 9)
      expect(r.y).toBeCloseTo(q.y, 9)
      expect(r.w).toBeCloseTo(q.w, 9)
      expect(r.h).toBeCloseTo(q.h, 9)
    })
    at1!.bands.forEach((b, i) => {
      const q = at15!.bands[i]!
      expect(b.top).toBeCloseTo(q.top, 9)
      expect(b.bottom).toBeCloseTo(q.bottom, 9)
      expect(b.center).toBeCloseTo(q.center, 9)
    })
  })

  it('bands 与 rects 同基准：单项行的 band 纵向界=该行块归一化界（top=rect.y、bottom=rect.y+rect.h；x0/x1=行内项盒端点）', () => {
    const items = [mkItem('SOLO', 72, 700)]
    const out = itemSelectionGeometry({ items, styles: STYLES, viewport: VP0, start: 0, end: 4, base: { x: 0, y: 0, w: 612, h: 792 } })!
    expect(out.rects.length).toBe(1)
    expect(out.bands.length).toBe(1)
    expect(out.bands[0]!.top).toBeCloseTo(out.rects[0]!.y, 9)
    expect(out.bands[0]!.bottom).toBeCloseTo(out.rects[0]!.y + out.rects[0]!.h, 9)
    expect(out.bands[0]!.x0).toBeCloseTo(72 / 612, 9)
    expect(out.bands[0]!.x1).toBeCloseTo(172 / 612, 9)
  })

  it('非法输入回退判据：end≤start / 零基准盒 / 区间无覆盖项 → null', () => {
    const items = threeRows()
    const base = { x: 0, y: 0, w: 612, h: 792 }
    expect(itemSelectionGeometry({ items, styles: STYLES, viewport: VP0, start: 5, end: 5, base })).toBeNull()
    expect(itemSelectionGeometry({ items, styles: STYLES, viewport: VP0, start: 0, end: 4, base: { x: 0, y: 0, w: 0, h: 0 } })).toBeNull()
    expect(itemSelectionGeometry({ items, styles: STYLES, viewport: VP0, start: 100, end: 200, base })).toBeNull()
  })

  it('N1 越界夹取自洽（端点式，门一回炉）：项矩形左越界/右越界 → 落库矩形 x+w≤1 且 w=clamp 后端点差（独立夹取 w 不联动给 x+w>1/右缘漂移必红）', () => {
    const base = { x: 0, y: 0, w: 612, h: 792 }
    // 左越界：项盒 x=−20..80（transform tx4=−20）→ x 夹 0、w=80/612（旧独立夹取 w=100/612）
    const left = itemSelectionGeometry({ items: [mkItem('L', -20, 700)], styles: STYLES, viewport: VP0, start: 0, end: 1, base })!
    expect(left.rects.length).toBe(1)
    expect(left.rects[0]!.x).toBe(0)
    expect(left.rects[0]!.w).toBeCloseTo(80 / 612, 6)
    expect(left.rects[0]!.x + left.rects[0]!.w).toBeLessThanOrEqual(1)
    // 右越界：项盒 x=600..700 → x=600/612、w=(612−600)/612（旧 w=100/612 → x+w≈1.144>1）
    const right = itemSelectionGeometry({ items: [mkItem('R', 600, 700)], styles: STYLES, viewport: VP0, start: 0, end: 1, base })!
    expect(right.rects.length).toBe(1)
    expect(right.rects[0]!.x).toBeCloseTo(600 / 612, 6)
    expect(right.rects[0]!.w).toBeCloseTo(12 / 612, 6)
    expect(right.rects[0]!.x + right.rects[0]!.w).toBeLessThanOrEqual(1 + 1e-9)
    // 顶越界（ascent 越界族同构）：基线 PDF y=790 → viewport 基线 y=2、盒 y=−6..4 跨顶缘 → y 夹 0、h=4/792（y 同款端点式）
    const topCross = itemSelectionGeometry({ items: [mkItem('T', 72, 790)], styles: STYLES, viewport: VP0, start: 0, end: 1, base })!
    expect(topCross.rects.length).toBe(1)
    expect(topCross.rects[0]!.y).toBe(0)
    expect(topCross.rects[0]!.h).toBeCloseTo(4 / 792, 6)
  })

  it('旋转页终裁角度门（r3b 回归锚）：/Rotate 90 三行（视觉行=竖排段，共享 y 中心）→ 恰 3 块不桥接——无门实现经 mergeRects 中心 y 聚类并 1 块必红', () => {
    const items = [692, 664, 636].map((y) => mkItem('R', 72, y, { width: 40 }))
    const out = itemSelectionGeometry({ items, styles: STYLES, viewport: VP90, start: 0, end: 3, base: { x: 0, y: 0, w: 792, h: 612 } })
    expect(out).not.toBeNull()
    expect(out!.rects.length).toBe(3)
    ;[634, 662, 690].forEach((x, i) => expect(out!.rects[i]!.x).toBeCloseTo(x / 792, 4))
    for (const r of out!.rects) {
      expect(r.y).toBeCloseTo(72 / 612, 4)
      expect(r.w).toBeCloseTo(10 / 792, 4)
      expect(r.h).toBeCloseTo(40 / 612, 4)
    }
  })

  it('盒本地帧（域锁）：基准盒平移到视口绝对位 (500,300) 归一化产物逐值不变——gBCR 原点不参与（r3a 域差缺陷的回归锚：减原点实现会给负值钳 0+G2 全判盒外）', () => {
    const items = threeRows()
    const local = itemSelectionGeometry({ items, styles: STYLES, viewport: VP0, start: 0, end: 12, base: { x: 0, y: 0, w: 612, h: 792 } })!
    const shifted = itemSelectionGeometry({ items, styles: STYLES, viewport: VP0, start: 0, end: 12, base: { x: 500, y: 300, w: 612, h: 792 } })!
    expect(shifted.rects.length).toBe(3)
    shifted.rects.forEach((r, i) => {
      expect(r.x).toBeCloseTo(local.rects[i]!.x, 9)
      expect(r.y).toBeCloseTo(local.rects[i]!.y, 9)
      expect(r.w).toBeCloseTo(local.rects[i]!.w, 9)
      expect(r.h).toBeCloseTo(local.rects[i]!.h, 9)
    })
    expect(shifted.bands.length).toBe(local.bands.length)
    shifted.bands.forEach((b, i) => {
      expect(b.top).toBeCloseTo(local.bands[i]!.top, 9)
      // x0/x1 在 bandsFromItems 恒被赋值（可选性=RowBand 兼容面——非空断言锚）
      expect(b.x0).toBeCloseTo(local.bands[i]!.x0!, 9)
    })
    // G2 同帧：平移后健康判定不变（健康夹具仍 0 偏离）
    expect(shifted.health.unhealthy).toBe(false)
    expect(shifted.health.outsideRatio).toBe(0)
  })
})

describe('pdf-item-geometry G2 检测器（selectionHealth）', () => {
  const BASE = { x: 0, y: 0, w: 612, h: 792 }

  it('健康夹具（全部项盒在 textLayer 盒内）：偏离率 0 不触发', () => {
    const { boxes, tolPx } = rectsForOffsetRange(threeRows(), STYLES, VP0, 0, 12)
    const health = selectionHealth(boxes, baselineGroupBlocks(boxes, tolPx, 612), BASE)
    expect(health.outsideRatio).toBe(0)
    expect(health.rightOverflowPx).toBe(0)
    expect(health.unhealthy).toBe(false)
  })

  it('病理夹具（8 项中 2 项整体平移出盒）：偏离率 0.25 ≥5% 触发（阈值改 0.5 时本例不触发=变异红证锚）', () => {
    const items = [
      ...[0, 1, 2, 3, 4, 5].map((i) => mkItem(`H${i}`, 72 + i * 5, 700, { width: 4 })),
      mkItem('X1', 700, 700, { width: 50 }),
      mkItem('X2', 700, 672, { width: 50 })
    ]
    const { boxes, tolPx } = rectsForOffsetRange(items, STYLES, VP0, 0, 16)
    expect(boxes.length).toBe(8)
    const health = selectionHealth(boxes, baselineGroupBlocks(boxes, tolPx, 612), BASE)
    expect(health.outsideRatio).toBeCloseTo(0.25, 6)
    expect(health.unhealthy).toBe(true)
    expect(SELECTION_DEV_RATIO_THRESHOLD).toBe(0.05)
  })

  it('右溢占位支隔离：21 项仅 1 项越右缘（偏离率 1/21≈4.8%<5%）但并块右溢 28px>2px → 仅右溢支触发', () => {
    const items = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19].map((i) =>
      mkItem(`n${i}`, 72 + i * 26, 700, { width: 20 })
    )
    items.push(mkItem('edge', 600, 700, { width: 40 }))
    const total = buildItemOffsets(items).total
    const { boxes, tolPx } = rectsForOffsetRange(items, STYLES, VP0, 0, total)
    expect(boxes.length).toBe(21)
    const health = selectionHealth(boxes, baselineGroupBlocks(boxes, tolPx, 612), BASE)
    expect(health.outsideRatio).toBeLessThan(SELECTION_DEV_RATIO_THRESHOLD)
    expect(health.rightOverflowPx).toBeCloseTo(28, 6)
    expect(health.unhealthy).toBe(true)
  })

  it('空集：比率 0 不触发（除零防御）', () => {
    const health = selectionHealth([] as ItemBox[], [], BASE)
    expect(health.unhealthy).toBe(false)
    expect(health.outsideRatio).toBe(0)
  })
})
