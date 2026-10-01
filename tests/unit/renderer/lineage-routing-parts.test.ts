/**
 * [F-LINEAGE-02 ①a] 甲走线器部件件直测——anchors/avoid/rounding 纯函数
 * （方案甲公共几何底座=options §1；design-final §1 零修改转入）。
 * 期望值全部从夹具几何手推（d1-N5 兑现——禁抄实现输出）。
 * always-active 裸 describe（K3）。
 */
import { describe, expect, it } from 'vitest'
import {
  STUB_S0,
  anchorId,
  anchorPoint,
  outwardNormal,
  selectAnchor,
  stubEnd,
  type Pt,
  type Rect
} from '../../../src/renderer/features/lineage/routing/anchors'
import { PAD, polylineClearStubs, segHitsAny } from '../../../src/renderer/features/lineage/routing/avoid'
import { buildRoundedPath, stripCollinear } from '../../../src/renderer/features/lineage/routing/rounding'

const CARD: Rect = { x: 100, y: 200, w: 128, h: 72 }

function rect(x: number, y: number, w: number, h: number): Rect {
  return { x, y, w, h }
}

describe('F-LINEAGE-02 anchors：12 锚点（每边 ¼/½/¾）+主向定边+投影定序', () => {
  it('anchorPoint：top/bottom 三序 x=132/164/196（¼/½/¾×128）；left/right 三序 y=218/236/254', () => {
    expect(anchorPoint(CARD, 'top', 0)).toEqual({ x: 132, y: 200 })
    expect(anchorPoint(CARD, 'top', 1)).toEqual({ x: 164, y: 200 })
    expect(anchorPoint(CARD, 'top', 2)).toEqual({ x: 196, y: 200 })
    expect(anchorPoint(CARD, 'bottom', 2)).toEqual({ x: 196, y: 272 })
    expect(anchorPoint(CARD, 'left', 0)).toEqual({ x: 100, y: 218 })
    expect(anchorPoint(CARD, 'left', 2)).toEqual({ x: 100, y: 254 })
    expect(anchorPoint(CARD, 'right', 1)).toEqual({ x: 228, y: 236 })
  })

  it('anchorId：`cardId:side+序` 形（t/b/l/r×3）', () => {
    expect(anchorId('c1', 'top', 0)).toBe('c1:t0')
    expect(anchorId('c1', 'bottom', 2)).toBe('c1:b2')
    expect(anchorId('n-x', 'left', 1)).toBe('n-x:l1')
    expect(anchorId('n-x', 'right', 0)).toBe('n-x:r0')
  })

  it('selectAnchor 主向定边：|dx|≥|dy| 取横（并列取横）；侧内投影最近定序（并列取小序）', () => {
    // 右方偏下：dx=+66 > dy=+24 → 横 → right；投影 y=260 距 254(6) 最近 → ¾ 序 2
    expect(selectAnchor(CARD, { x: 230, y: 260 })).toEqual({ side: 'right', slot: 2, pt: { x: 228, y: 254 } })
    // 正下方：dx=0 < dy → 竖 → bottom；投影 x=164 → ½ 序 1
    expect(selectAnchor(CARD, { x: 164, y: 400 })).toEqual({ side: 'bottom', slot: 1, pt: { x: 164, y: 272 } })
    // 并列 |dx|=|dy| → 横（left——dx<0）；投影 y 恰在 218/236 中间 227 → 距两序相等 → 取小序 0
    expect(selectAnchor(CARD, { x: 60, y: 227 })).toEqual({ side: 'left', slot: 0, pt: { x: 100, y: 218 } })
    // 上方：top 投影 x=150 → 距 132(18)/164(14)/196(46) → ½ 序 1
    expect(selectAnchor(CARD, { x: 150, y: 100 })).toEqual({ side: 'top', slot: 1, pt: { x: 164, y: 200 } })
  })

  it('outwardNormal 四向外法线+stubEnd 短桩 s0=10（外法线）', () => {
    expect(STUB_S0).toBe(10)
    expect(outwardNormal('top')).toEqual({ x: 0, y: -1 })
    expect(outwardNormal('bottom')).toEqual({ x: 0, y: 1 })
    expect(outwardNormal('left')).toEqual({ x: -1, y: 0 })
    expect(outwardNormal('right')).toEqual({ x: 1, y: 0 })
    expect(stubEnd({ x: 164, y: 272 }, 'bottom')).toEqual({ x: 164, y: 282 })
    expect(stubEnd({ x: 228, y: 236 }, 'right')).toEqual({ x: 238, y: 236 })
  })
})

describe('F-LINEAGE-02 avoid：PAD=4 命中语义+短桩/中段分治（D-L2-4）', () => {
  it('segHitsAny：距障碍恰 4=命中（含边界）、4.1=出界、3.9=命中（D-6 沿承）', () => {
    const seg: [Pt, Pt] = [{ x: 0, y: 100 }, { x: 100, y: 100 }]
    expect(segHitsAny(seg[0], seg[1], [rect(104, 92, 50, 16)])).toBe(true)
    expect(segHitsAny(seg[0], seg[1], [rect(104.1, 92, 50, 16)])).toBe(false)
    expect(segHitsAny(seg[0], seg[1], [rect(103.9, 92, 50, 16)])).toBe(true)
    expect(PAD).toBe(4)
  })

  it('polylineClearStubs：首末 s0 段排除源/目标卡；中段含全卡（穿第三方卡=红）', () => {
    // 源卡 (100,200,128,72)：底锚 (164,272) 竖下 40px 出框——源卡膨胀带覆盖
    // [96,336]×[104,276]（PAD=4），首 10px 桩恒命中源卡本体=排除面证据
    const src = rect(100, 200, 128, 72)
    const pts: Pt[] = [
      { x: 164, y: 272 },
      { x: 164, y: 312 }
    ]
    expect(polylineClearStubs(pts, [src], [])).toBe(true)
    // 第三方卡横亘 y=300（中段——距桩端 28px > s0）：膨胀带 [y=296,304] 竖段命中 → false
    const third = rect(140, 300, 20, 4)
    expect(polylineClearStubs(pts, [src], [third])).toBe(false)
    // 第三方卡挤进桩区（y∈[272,282] 内的 276..280）：仍在排除集外=中段外但非源/目标 → false
    const nearStub = rect(150, 276, 20, 4)
    expect(polylineClearStubs(pts, [src], [nearStub])).toBe(false)
  })

  it('polylineClearStubs 多段折线：中段横穿标注（labels 属全障碍）→ false', () => {
    const pts: Pt[] = [
      { x: 164, y: 272 },
      { x: 164, y: 300 },
      { x: 300, y: 300 },
      { x: 300, y: 340 }
    ]
    const label = rect(200, 296, 30, 8)
    expect(polylineClearStubs(pts, [], [label])).toBe(false)
    expect(polylineClearStubs(pts, [label], [])).toBe(true)
  })
})

describe('F-LINEAGE-02 rounding：共线剔除+圆角化+边界表（D-L2-14/W-5）', () => {
  it('stripCollinear：中段共线顶点剔除（禁 0°/180° 顶点入圆角化）', () => {
    expect(stripCollinear([{ x: 0, y: 0 }, { x: 0, y: 10 }, { x: 0, y: 20 }, { x: 30, y: 20 }])).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 20 },
      { x: 30, y: 20 }
    ])
    // 180° 折返点保留（非共线——尖角入圆角化按 W-5 钳 0）
    expect(stripCollinear([{ x: 0, y: 0 }, { x: 0, y: 10 }, { x: 0, y: 4 }])).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 10 },
      { x: 0, y: 4 }
    ])
    // 两点/单点原样
    expect(stripCollinear([{ x: 1, y: 1 }, { x: 2, y: 2 }])).toEqual([{ x: 1, y: 1 }, { x: 2, y: 2 }])
    // [回炉 R3] 零长顶点剔除（竖桩端与带中心重合形态——入弧 r=0 恒尖角防线）
    expect(stripCollinear([{ x: 0, y: 0 }, { x: 0, y: 10 }, { x: 0, y: 10 }, { x: 30, y: 10 }])).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 10 },
      { x: 30, y: 10 }
    ])
  })

  it('buildRoundedPath r=6 直角拐：Q 圆角切点=拐点两侧 6px（独立推导 d）', () => {
    const p = buildRoundedPath(
      [
        { x: 164, y: 282 },
        { x: 164, y: 300 },
        { x: 200, y: 300 }
      ],
      6
    )
    // 拐点 (164,300)：入段竖直（自上来）切点 (164,294)；出段水平切点 (170,300)；
    // Q 控制点=拐点本身（二次贝塞尔直角圆角标准形）
    expect(p.d).toBe('M 164 282 L 164 294 Q 164 300 170 300 L 200 300')
    // 采样链端点守恒（首尾=骨架端点——复检输入完整性）
    expect(p.samples[0]).toEqual({ x: 164, y: 282 })
    expect(p.samples[p.samples.length - 1]).toEqual({ x: 200, y: 300 })
  })

  it('buildRoundedPath 边界表：短段钳制 r=min(r,段长/2)；180° 折返=尖角；r<2=尖角', () => {
    // 段长 6（<2r=12）→ r_i=min(6, 3, 3)=3：切点距拐 3px
    const a = buildRoundedPath(
      [
        { x: 0, y: 0 },
        { x: 0, y: 6 },
        { x: 10, y: 6 }
      ],
      6
    )
    expect(a.d).toBe('M 0 0 L 0 3 Q 0 6 3 6 L 10 6')
    // 180° 折返（上→下折返）：尖角无 Q
    const b = buildRoundedPath(
      [
        { x: 0, y: 0 },
        { x: 0, y: 20 },
        { x: 0, y: 8 }
      ],
      6
    )
    expect(b.d).toBe('M 0 0 L 0 20 L 0 8')
    // r<2 入参 → 全尖角直角折线
    const c = buildRoundedPath(
      [
        { x: 0, y: 0 },
        { x: 0, y: 20 },
        { x: 9, y: 20 }
      ],
      1.5
    )
    expect(c.d).toBe('M 0 0 L 0 20 L 9 20')
  })

  it('buildRoundedPath 连续短段逐顶点独立钳制（W-5）+两顶点距<2r 共用段预算不越界', () => {
    // 三拐连续短段：段 (0,20)→(10,20) 长 10——两拐各钳 min(6, 20/2?..) 段长 10 ≥2r? 10<12 → 钳 5
    const p = buildRoundedPath(
      [
        { x: 0, y: 0 },
        { x: 0, y: 20 },
        { x: 10, y: 20 },
        { x: 10, y: 40 }
      ],
      6
    )
    // 拐1 (0,20)：入段 20（r=6）、出段 10（<2r→min(6,5)=5）→ r1=5：切点 (0,15)/(5,20)
    // 拐2 (10,20)：入段 10（5）、出段 20（6）→ r2=5：切点 (5,20)/(10,25)
    // 中段 5→5 直段长 0（两切点重合 (5,20)——L 直接跳过零长段）
    expect(p.d).toBe('M 0 0 L 0 15 Q 0 20 5 20 Q 10 20 10 25 L 10 40')
  })

  it('buildRoundedPath 圆弧采样逼近界：弧中点距拐点 = r−r/√2≈r·0.293（采样链含弧中点级采样密度）', () => {
    const p = buildRoundedPath(
      [
        { x: 0, y: 0 },
        { x: 0, y: 40 },
        { x: 40, y: 40 }
      ],
      6
    )
    // 弦 (0,34)-(6,40) 的二次贝塞尔中点=(P0+2P1+P2)/4=(0+0+12, 34+80+40 ... 手推：
    // B(0.5)=(P0+2·C+P2)/4=((0+0+6)/4? no: x=(0+2·0+6)/4=1.5, y=(34+2·40+40)/4=38.5
    // 采样数组应包含接近 (1.5,38.5) 的点（拐点内侧逼近=r−r·cos45°≈4.24 距拐）
    const near = p.samples.some((s) => Math.abs(s.x - 1.5) < 0.6 && Math.abs(s.y - 38.5) < 0.6)
    expect(near).toBe(true)
  })
})
