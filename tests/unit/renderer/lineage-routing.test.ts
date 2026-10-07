/**
 * [F-SLOTGRID-01 U2] lineage-routing 甲链例集 v2（五态：direct→h-slip→
 * detour→band→overlap+manual-override——设计 v1.4 §5.3 链序；corridor/
 * fallback 29+11 命中随走廊退役删（豁免登记=scripts/test-surface.exemptions.
 * json，授权=设计 §6 2026-10-07 用户裁决③）；旧 legacy 20px 行隙夹具随 U2
 * 槽位封闭判据（带高<36⇔n=0 不可横移）重基线为 72px 行隙网格几何）。
 * 真相源=docs/design/2026-10-07_f-slotgrid01-design.md §2/§5.3。**d/pts 值
 * 独立推导**：全部期望值自夹具几何手推（锚 ¼/½/¾×128×72、桩 10、PAD 4、
 * 槽位域=宽−20/n=clamp(⌊(域−8)/8⌋,0,5)/k/(n+1) 分点、r=6 圆角），禁抄实现
 * 输出。基准卡=128×72（P-15）。always-active 裸 describe（K3）。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { AnchorUse, type PickedAnchor } from '../../../src/renderer/features/lineage/routing/anchors'
import { ChannelUse, byTotalOrder, detourSkeleton, gridChannelsOf } from '../../../src/renderer/features/lineage/routing/detour'
import { bandSkeleton } from '../../../src/renderer/features/lineage/routing/bands'
import type { EdgeGeomInput, LayoutSnapshot, Rect } from '../../../src/renderer/features/lineage/routing/chain'
import { routeAll, routeEdge } from '../../../src/renderer/features/lineage/routing/chain'

// ── 夹具工具（纯数据；无 corridor 字段——走廊族退役）──

function rect(x: number, y: number, w: number, h: number): Rect {
  return { x, y, w, h }
}

function makeSnap(partial: Partial<LayoutSnapshot> = {}): LayoutSnapshot {
  return {
    cards: partial.cards ?? new Map<string, Rect>(),
    labels: partial.labels ?? [],
    frames: partial.frames ?? [],
    yearHeads: partial.yearHeads ?? [],
    contentW: partial.contentW ?? 800
  }
}

const CARD_W = 128
const CARD_H = 72

/** 网格框架夹具（border-box：fx0+12+φ+200k=卡左——98.4+13.6=112 基准；
 *  W=fw−27.2——fw=627.2 ⇒ W=600 ⇒ N=3/M=2） */
function gridFrame(): { x: number; y: number; w: number; h: number; year: number } {
  return { x: 98.4, y: 80.4, w: 627.2, h: 720, year: 2022 }
}

function geom(id: string, from: string, to: string, via?: Array<{ x: number; y: number }>): EdgeGeomInput {
  return { edgeId: id, sourceId: from, targetId: to, via }
}

describe('F-SLOTGRID-01 U2 甲链五态（direct→h-slip→detour→band→overlap 单向不回溯）', () => {
  it('① direct：同列上下卡（主向竖+锚 x 相等）→ 单竖直段；d=底锚(164,172)→顶锚(164,300) 手推（retain 恰中槽 idx2=164——槽位 110+108k/6）', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(100, 100, CARD_W, CARD_H)],
        ['B', rect(100, 300, CARD_W, CARD_H)]
      ])
    })
    const r = routeEdge(geom('e1', 'A', 'B'), snap)
    expect(r.route).toBe('direct')
    // 行隙单元 [100,228]×[172,300]（W=128→域 108→n=5 槽 128/146/164/182/200）
    // ——ideal=164 恰中槽 idx2 → retain 豁免几何不动
    expect(r.d).toBe('M 164 172 L 164 300')
    expect(r.slotMarks).toBe('0:2')
  })

  it('① direct 阻挡降级：中列障碍卡拦竖段+同柱（x_s=x_t）→ ③ detour 段式近绕承接（72px 网格夹具——通道槽位 x∈INV-SLOTGRID-02 坐标集）', () => {
    // A(112,100)=row0 col0；W(100,244)=row1 错位障碍（覆 x₀=176）；B(112,388)=row2 col0
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(112, 100, CARD_W, CARD_H)],
        ['W', rect(100, 244, CARD_W, CARD_H)],
        ['B', rect(112, 388, CARD_W, CARD_H)]
      ]),
      frames: [gridFrame()]
    })
    const r = routeEdge(geom('e1', 'A', 'B'), snap)
    expect(r.route).toBe('detour')
    // 手推：x₀=½=176（两侧投影同列）；阻挡带=W 膨胀 [240,320]（A/B 带裁剪出界）；
    // row1 通道（φ=100）：左缘 [100,212) 槽 125.3..186.7 全落 W 膨胀 x[96,232] 弃；
    // col0|1 [340,412) 首槽 358.7（Δx=182.7）胜出。上夹缝 [182,240] h=58→n=3
    // 中位槽 211；下夹缝 [320,378] 中位槽 349
    expect(r.pts).toEqual([
      { x: 176, y: 172 }, { x: 176, y: 182 }, { x: 176, y: 211 }, { x: 358.7, y: 211 },
      { x: 358.7, y: 349 }, { x: 176, y: 349 }, { x: 176, y: 378 }, { x: 176, y: 388 }
    ])
    expect(r.detourMarks).toBe('358.7:182.7')
  })

  it('① direct 中段穿障碍（legacy 紧距竖叠）→ ③ detour 桩端水平线分支（首/末夹缝<36 → 横移=桩端线 y）', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(100, 100, CARD_W, CARD_H)],
        ['D', rect(100, 192, CARD_W, CARD_H)],
        ['B', rect(100, 284, CARD_W, CARD_H)]
      ]),
      frames: [{ ...rect(90, 60, 600, 400), year: 2022 }]
    })
    const r = routeEdge(geom('e1', 'A', 'B'), snap)
    expect(r.route).toBe('detour')
    // 手推：x₀=164 穿 D →阻挡带 [188,268]；上夹缝 [182,188] h=6<36→桩端线 y=182、
    // 下夹缝 [268,274]→桩端线 y=274；D 归 row1（中心聚整）：左缘槽全落 D 膨胀
    // x[96,232] 弃 → col0|1 [331.6,403.6) 首槽 350.3（Δ=186.3）
    expect(r.pts).toEqual([
      { x: 164, y: 172 }, { x: 164, y: 182 }, { x: 350.3, y: 182 },
      { x: 350.3, y: 274 }, { x: 164, y: 274 }, { x: 164, y: 284 }
    ])
    expect(r.detourMarks).toBe('350.3:186.3')
  })

  it('② h-slip：x 带分离（右向）→ 近侧锚单段直线；d=源右 ¾ (228,154)→目标左 ¼ (400,158) 手推', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(100, 100, CARD_W, CARD_H)],
        ['B', rect(400, 140, CARD_W, CARD_H)]
      ])
    })
    const r = routeEdge(geom('e1', 'A', 'B'), snap)
    expect(r.route).toBe('h-slip')
    // 源右锚=投影 tc.y=176→¾ 序 (228,154)；目标左锚=投影 sc.y=136 于
    // B(y∈[140,212])→¼ 序 (400,158)；斜段不入槽（segConsumesCell 非轴对齐早退）
    expect(r.d).toBe('M 228 154 L 400 158')
  })

  it('② h-slip 左向（anchor 左分支行为锁）：目标在源左侧 → 源左锚→目标右锚', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(400, 100, CARD_W, CARD_H)],
        ['B', rect(100, 300, CARD_W, CARD_H)]
      ])
    })
    const r = routeEdge(geom('e1', 'A', 'B'), snap)
    expect(r.route).toBe('h-slip')
    expect(r.d).toBe('M 400 154 L 228 318')
  })

  it('④ band：同行带近侧不可直连+错列（x_s≠x_t）→ 行隙带 zigzag（72px 网格夹具——横移 y=带槽位中位 208）', () => {
    // A(112,100)=row0 col0、B(212,244)=row1 col0（网格位）；主向横→direct 前置废
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(112, 100, CARD_W, CARD_H)],
        ['B', rect(212, 244, CARD_W, CARD_H)]
      ]),
      frames: [gridFrame()]
    })
    const r = routeEdge(geom('e1', 'A', 'B'), snap)
    expect(r.route).toBe('band')
    // 手推：A 底锚=投影 tc.x=276→¾ (208,172)；B 顶首选=投影 sc.x=176→¼ (244,244)；
    // 行隙带 [172,244] h=72 → 槽位域 [182,234) n=5 中位槽=208（=带中心）；
    // 终落 ¼ 净空；两拐 r=min(6,36,36)=6
    expect(r.pts).toEqual([
      { x: 208, y: 172 }, { x: 208, y: 182 }, { x: 208, y: 208 }, { x: 244, y: 208 }, { x: 244, y: 244 }
    ])
    expect(r.d).toBe('M 208 172 L 208 202 Q 208 208 214 208 L 238 208 Q 244 208 244 214 L 244 244')
  })

  it('⑤ overlap：通道全集封死（巨墙覆全部网格通道）→ 最短路线重叠兜底+overlapExempt 透出（x_s=x_t → 单竖段）', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(112, 100, CARD_W, CARD_H)],
        ['WALL', rect(100, 244, 600, CARD_H)],
        ['B', rect(112, 388, CARD_W, CARD_H)]
      ]),
      frames: [gridFrame()]
    })
    const r = routeEdge(geom('e1', 'A', 'B'), snap)
    expect(r.route).toBe('overlap')
    // 手推：x₀=176；WALL 膨胀 [96,704] 覆 row1 全部通道候选（左缘/col0|1/右缘
    // 槽 575.3..651.3 全灭、676.7<704 亦灭）→detour 枚举尽→band 下降候选同灭
    // →overlap 最短路线（x 相等=单竖段穿墙——忽略避让沿承 finish r=0 尖角）
    expect(r.pts).toEqual([{ x: 176, y: 172 }, { x: 176, y: 388 }])
    expect(r.d).toBe('M 176 172 L 176 388')
    expect(r.overlapExempt).toBe(true)
  })

  it('⑤ overlap L 形先横后竖（H<V 字典序 tie-break）：x_s≠x_t 且带封闭 → 骨架 [a,(b.x,a.y),b]', () => {
    // 矮墙横贯+上下卡错列：行隙带 24px<36 封闭→band 无带；x_s=228≠x_t=400
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(100, 100, CARD_W, CARD_H)],
        ['X', rect(90, 110, 600, 60)],
        ['B', rect(400, 196, CARD_W, CARD_H)]
      ])
    })
    const r = routeEdge(geom('e1', 'A', 'B'), snap)
    expect(r.route).toBe('overlap')
    // 手推：direct 锚=selectAnchor：sa=A 右 ¾ (228,154)（tc=(464,232)→dx=300>
    // dy=96→横；proj y=232−100=132→¾ 序 54 最近）；sb=B 左 ¼ (400,214)（sc=
    // (164,136)：proj y=−60→¼ 序最近）。L 形先横后竖：(228,154)→(400,154)→
    // (400,214)（穿 X——忽略避让；r=6/3 采样红→r=0 尖角）
    expect(r.pts).toEqual([{ x: 228, y: 154 }, { x: 400, y: 154 }, { x: 400, y: 214 }])
    expect(r.d).toBe('M 228 154 L 400 154 L 400 214')
    expect(r.overlapExempt).toBe(true)
  })

  it('端点卡缺失：d 空+route overlap+onWarn（防御面沿承——走廊族退役后占位态=overlap）', () => {
    const snap = makeSnap({ cards: new Map<string, Rect>([['A', rect(100, 100, CARD_W, CARD_H)]]) })
    const onWarn = vi.fn()
    const r = routeEdge(geom('e1', 'A', 'GHOST'), snap, onWarn)
    expect(r.d).toBe('')
    expect(r.route).toBe('overlap')
    expect(r.overlapExempt).toBe(true)
    expect(onWarn).toHaveBeenCalledTimes(1)
  })
})

describe('F-SLOTGRID-01 U2 detour 段式（占用/方向/降级）', () => {
  /** detour 旗舰夹具（同 describe 共用）：A row0 col0 / W row1 错位障碍 / B row2 col0 */
  const detourSnap = (): LayoutSnapshot =>
    makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(112, 100, CARD_W, CARD_H)],
        ['W', rect(100, 244, CARD_W, CARD_H)],
        ['B', rect(112, 388, CARD_W, CARD_H)]
      ]),
      frames: [gridFrame()]
    })

  it('通道槽占用（N17）：两同柱边先后路由 → 次边取顺位次槽 367.3（首边占 358.7）', () => {
    const snap = detourSnap()
    const paths = routeAll([geom('e1', 'A', 'B'), geom('e2', 'A', 'B')], snap)
    expect(paths.map((p) => p.route)).toEqual(['detour', 'detour'])
    // e1 ½/½ x₀=176→358.7（① 例同款）；e2 散开 ¾/¾ x₀=208→首槽 358.7 被占→
    // 次槽 367.3（|367.3−208|=159.3；左缘槽全落 W 膨胀弃）
    expect(paths[0]!.detourMarks).toBe('358.7:182.7')
    expect(paths[1]!.detourMarks).toBe('367.3:159.3')
    // 两被阻段竖直段 x 电平互异（通道槽位级空槽分配——多线碰撞声明）
    const xs = paths.map((p) => p.pts.filter((q) => q.x !== 176 && q.x !== 208).map((q) => q.x))
    expect(xs[0]!.every((x) => x === 358.7)).toBe(true)
    expect(xs[1]!.every((x) => x === 367.3)).toBe(true)
  })

  it('上行方向（目标在上）：镜像构造 → detour 成立（skel 首末锚=源顶/目标底）', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['B', rect(112, 100, CARD_W, CARD_H)],
        ['W', rect(100, 244, CARD_W, CARD_H)],
        ['A', rect(112, 388, CARD_W, CARD_H)]
      ]),
      frames: [gridFrame()]
    })
    const r = routeEdge(geom('e1', 'A', 'B'), snap)
    expect(r.route).toBe('detour')
    // 手推：源=A 底下目标 B 在上→源顶锚 (176,388)/目标底锚 (176,172)；阻挡带
    // [240,320] 同款；槽位/夹缝对称（近源先=row1 下缘序）；skel 首点=源顶锚
    expect(r.pts[0]).toEqual({ x: 176, y: 388 })
    expect(r.pts[r.pts.length - 1]).toEqual({ x: 176, y: 172 })
    expect(r.detourMarks).toBe('358.7:182.7')
  })

  it('候选枚举尽→降级链：左缘+列间通道全灭 → band/overlap 承接（③ 例负锚——无死循环/无静默空产出）', () => {
    // W 覆左缘+col0|1 但留右缘通道：575.3..676.7 候选在（wall 右缘 704 内全灭）
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(112, 100, CARD_W, CARD_H)],
        ['W', rect(100, 244, 560, CARD_H)],
        ['B', rect(112, 388, CARD_W, CARD_H)]
      ]),
      frames: [gridFrame()]
    })
    const r = routeEdge(geom('e1', 'A', 'B'), snap)
    // 右缘末槽 676.7>704−560=…：wall 膨胀 [96,664]→676.7 净空 → detour 承接
    expect(r.route).toBe('detour')
    expect(r.detourMarks).toBe('676.7:500.7')
  })
})


describe('F-SLOTGRID-01 U2 RR1 回炉轮 1（B1/B2/B3/W1/W3——门一双席返工处置）', () => {
  /** 双带夹具（W1/B1 共用几何）：row1 障碍（覆左缘+col0|1 走 col0|1 槽族）+
   *  row3 宽障碍（右缘仅留 676.7）；row0/row4=同列源/目标（x₀=½=176） */
  const twoBandCards = (up: boolean): Map<string, Rect> =>
    new Map<string, Rect>(
      up
        ? [
            ['A', rect(112, 676, CARD_W, CARD_H)],
            ['W1', rect(100, 244, CARD_W, CARD_H)],
            ['W2', rect(96, 532, 556, CARD_H)],
            ['B', rect(112, 100, CARD_W, CARD_H)]
          ]
        : [
            ['A', rect(112, 100, CARD_W, CARD_H)],
            ['W1', rect(100, 244, CARD_W, CARD_H)],
            ['W2', rect(96, 532, 556, CARD_H)],
            ['B', rect(112, 676, CARD_W, CARD_H)]
          ]
    )

  it('[B1] 上行×双被阻段：源在下（row4 col0）→目标在上（row0 col0），贯通解门形（行进序 strips=源侧先）', () => {
    const snap = makeSnap({ cards: twoBandCards(true), frames: [gridFrame()] })
    const r = routeEdge(geom('e1', 'A', 'B'), snap)
    expect(r.route).toBe('detour')
    // 手推：x₀=176；阻挡带（行进序近源先）=[528,608]（W2 膨胀）→[240,320]（W1）；
    // W2 x 膨胀 [92,656] 灭 row3 左缘/col0|1/右缘≤651.3 → row3 唯一候选 676.7；
    // row1 候选 col0|1 族+右缘族——贯通解=全程 676.7（见 W1 例）。源侧夹缝
    // [608,666] h=58→n=3 中位槽 637；目标侧夹缝 [182,240]→211
    expect(r.pts).toEqual([
      { x: 176, y: 676 }, { x: 176, y: 666 }, { x: 176, y: 637 }, { x: 676.7, y: 637 },
      { x: 676.7, y: 211 }, { x: 176, y: 211 }, { x: 176, y: 182 }, { x: 176, y: 172 }
    ])
    expect(r.detourMarks).toBe('676.7:500.7,676.7:500.7')
  })

  it('[W1] 贯通省拐（拐弯数主键全局承载）：带1 就近候选 358.7×带2 唯一候选 676.7 → 贯通解 676.7 优先于就近-远组合', () => {
    const snap = makeSnap({ cards: twoBandCards(false), frames: [gridFrame()] })
    const r = routeEdge(geom('e1', 'A', 'B'), snap)
    expect(r.route).toBe('detour')
    // 手推：band1（row1）候选={358.7..393.3}∪{575.3..676.7}（就近 358.7）；
    // band2（row3）候选={676.7} 唯一——贯通解=两带同槽 676.7（横移 2 次；
    // 就近组合=358.7+676.7 中段夹缝再移=横移 3 次）。拐弯数主键（用户裁决
    // 「少拐优先」）→贯通解胜出：
    expect(r.detourMarks).toBe('676.7:500.7,676.7:500.7')
    // 全程单一外槽电平（无 358.7 就近电平——反锚）
    expect(r.pts.some((q) => q.x === 358.7)).toBe(false)
  })

  it('[B2] 空行通道（网格容量派生）：行1 无实卡+label 障碍横贯 x₀ → 空行通道候选承接（实卡反推=假阴性降级）', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(112, 100, CARD_W, CARD_H)],
        ['B', rect(112, 388, CARD_W, CARD_H)]
      ]),
      // label 落 row1 空行带 [244,316]：膨胀 [146,234]×[246,294] 覆 x₀=176
      labels: [rect(150, 250, 80, 40)],
      frames: [gridFrame()]
    })
    const r = routeEdge(geom('e1', 'A', 'B'), snap)
    expect(r.route).toBe('detour')
    // 手推：阻挡带=[246,294]（label）；行1 无实卡（实卡反推=无通道→假阴性
    // 降级 overlap）——容量派生行集：row1（φ=100）左缘通道 [100,212) 槽
    // {125.3..186.7}，label 膨胀 [146,234] 灭 {156,171.3,186.7}——就近存
    // 140.7（Δ=35.3；125.3 次近——col0|1 [340,412) 族 Δ≥182 较远）；上夹缝
    // [182,246] h=64→n=4 中位 209.6；下夹缝 [294,378] h=84→n=5 中位 336
    expect(r.detourMarks).toBe('140.7:35.3')
    expect(r.pts).toEqual([
      { x: 176, y: 172 }, { x: 176, y: 182 }, { x: 176, y: 209.6 }, { x: 140.7, y: 209.6 },
      { x: 140.7, y: 336 }, { x: 176, y: 336 }, { x: 176, y: 378 }, { x: 176, y: 388 }
    ])
  })

  it('[B2 防御] 行集上界=框高派生：1 行框（h=135.2）+越界卡（中心在框内底缘）→ 零幻影 row1 通道', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(112, 100, CARD_W, CARD_H)],
        ['STRAY', rect(112, 174, CARD_W, CARD_H)]
      ]),
      // 框内容高=102=顶 pad 18+卡 72+底 pad 12 → 恰 1 行；STRAY 中心 y=210
      // 落框内（框底 215.6）但越出 1 行容量——实卡反推=幻影 row1 通道（yLo=244）
      frames: [{ x: 98.4, y: 80.4, w: 627.2, h: 135.2, year: 2022 }]
    })
    const channels = gridChannelsOf(snap)
    expect(channels.length).toBeGreaterThan(0)
    expect(channels.every((c) => c.yLo === 100), '全部通道驻 row0 带（越界卡零幻影行）').toBe(true)
  })

  it('[B3] 中段夹缝封闭（h∈[28,36) 无槽）→ 该组合不可行：detourSkeleton 返 null（禁中点发明——坐标集闭包）', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(112, 100, CARD_W, CARD_H)],
        ['W1', rect(100, 244, CARD_W, CARD_H)],
        ['W1b', rect(536, 244, 140, CARD_H)],
        ['W2', rect(96, 354, 590, CARD_H)],
        ['B', rect(112, 532, CARD_W, CARD_H)]
      ]),
      frames: [gridFrame()]
    })
    // 手推：x₀=176 阻挡带=[240,320]（W1）与 [350,430]（W2 x[92,690]∋176）——
    // 中夹缝 [320,350] h=30∈[28,36) 不合并不开槽；band1 候选={358.7..393.3}
    //（W1b [532,680] 灭右缘族）；band2 候选={693.3}（W2 灭其余右缘槽）——
    // 全组合异槽必经中夹缝横移而夹缝封闭 → 组合不可行 → null（降 band）
    const pa: PickedAnchor = { pt: { x: 176, y: 172 }, side: 'bottom', slot: 1 }
    const pb: PickedAnchor = { pt: { x: 176, y: 532 }, side: 'top', slot: 1 }
    const src = snap.cards.get('A')!
    const tgt = snap.cards.get('B')!
    const r = detourSkeleton('A', 'B', pa, pb, snap, [...snap.cards.values()], [src, tgt], new ChannelUse(), 'e1')
    expect(r).toBeNull()
  })

  it('[W3] band 态通道槽位占用（下一段顺位首空槽）：两 band 边同 row1 右缘通道 → 次边取次槽 600.7（首边占 575.3）', () => {
    // A row0 col0→B row2 col1（x_s=208≠x_t=344→band）；row1 宽墙 [92,460]
    // 灭终落三槽+左缘/col0|1 → 下降候选=右缘族；e2 散开锚 tgtX=376
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(112, 100, CARD_W, CARD_H)],
        ['WALL', rect(96, 244, 360, CARD_H)],
        ['B', rect(312, 388, CARD_W, CARD_H)]
      ]),
      frames: [gridFrame()]
    })
    const paths = routeAll([geom('e1', 'A', 'B'), geom('e2', 'A', 'B')], snap)
    expect(paths.map((p) => p.route)).toEqual(['band', 'band'])
    // e1（¾→¼ 锚，tgtX=344）：|575.3−344|=231.3 最近 → 占 row1 右缘 idx0；
    // e2（散开 ¼→½，tgtX=376）：|575.3−376|=199.3 最近但被占 → 次槽 600.7
    expect(paths[0]!.pts.some((q) => q.x === 575.3)).toBe(true)
    expect(paths[1]!.pts.some((q) => q.x === 575.3), '次边不重取同槽（通道槽占用）').toBe(false)
    expect(paths[1]!.pts.some((q) => q.x === 600.7)).toBe(true)
  })
})

describe('F-SLOTGRID-01 U2 候选全序（设计 §2 v1.4 字典序——拐弯数主键/距离次键）', () => {
  it('byTotalOrder：拐弯数主键（x===curX=0 拐先于一切）→|x−refX| 次键→x 末键（等距对判别——拐弯键唯一判别面）', () => {
    // 等距对 {200,100}（|Δ|=50 全等）：拐弯键定序——curX=200 零拐居首（无拐弯
    // 键时距离并列退化为 x 升序=100 居首即红）
    const cands = [{ x: 100 }, { x: 200 }, { x: 300 }]
    expect([...cands].sort(byTotalOrder(150, 200)).map((c) => c.x)).toEqual([200, 100, 300])
    // 距离次键生效（拐弯数同=2）：|100−150|=|200−150|=50 并列→x 末键升序；
    // 300（Δ=150）居末——手推字面值
    expect([...cands].sort(byTotalOrder(150, 0)).map((c) => c.x)).toEqual([100, 200, 300])
  })
})

describe('F-SLOTGRID-01 U2 corridor/fallback 退役负锚（方案切换=删旧——防回潮）', () => {
  it('源面负锚：routing/chain.ts 零 corridor/fallback/CORRIDOR_/defaultCorridor/laneIndex 字面（走廊族彻底退役）', () => {
    const src = readFileSync(join(process.cwd(), 'src/renderer/features/lineage/routing/chain.ts'), 'utf8')
    expect(src).not.toMatch(/corridorSkeleton|defaultCorridor|CORRIDOR_|laneIndex/)
    // RouteTag 域：五态+manual-override（corridor/fallback 字面在类型与运行时
    // 态双灭——注释域外史述不计，故负锚锁符号族非词根）
    expect(src).not.toMatch(/'corridor'|'fallback'/)
  })

  it('routeAll 态域：混合夹具全产出 route∈五态+manual（类型面+运行时双锁）', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(100, 100, CARD_W, CARD_H)],
        ['B', rect(100, 300, CARD_W, CARD_H)],
        ['C', rect(400, 100, CARD_W, CARD_H)],
        ['D', rect(400, 300, CARD_W, CARD_H)]
      ])
    })
    const paths = routeAll(
      [
        geom('e1', 'A', 'B'),
        geom('e2', 'A', 'C'),
        geom('e3', 'A', 'D'),
        geom('e4', 'A', 'B', [{ x: 500, y: 136 }])
      ],
      snap
    )
    const allowed = new Set(['direct', 'h-slip', 'detour', 'band', 'overlap', 'manual-override'])
    for (const p of paths) {
      expect(allowed.has(p.route), `route=${p.route} ∈ 五态域`).toBe(true)
      expect(p.d.length, `${p.edgeId} d 非空`).toBeGreaterThan(0)
    }
  })
})

describe('F-UIRES-03 C2·P7 穿年份头避让（障碍集扩=卡∪月标注∪.tl-year-head——PAD 同源）', () => {
  /** 同列上下卡基面（① direct 同款）：无 yearHead=direct 单竖段 */
  const columnSnap = (yearHeads: Rect[]): LayoutSnapshot =>
    makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(100, 100, CARD_W, CARD_H)],
        ['B', rect(100, 300, CARD_W, CARD_H)]
      ]),
      yearHeads,
      frames: [{ ...rect(90, 60, 600, 400), year: 2022 }]
    })

  it('对照基线：无 yearHead→direct（拦路实验的前提锁定）', () => {
    const r = routeEdge(geom('e1', 'A', 'B'), columnSnap([]))
    expect(r.route).toBe('direct')
  })

  it('year-head 拦 direct 中段→降级链触发（route≠direct+有产出）', () => {
    // yearHead(144,224,40,10) 膨胀 [140,192]×[220,234]——竖段 x=164 穿 y 段
    // →direct 废；年份头入障碍集（不并入=仍 direct 穿头即缺陷本体）
    const r = routeEdge(geom('e1', 'A', 'B'), columnSnap([rect(144, 224, 40, 10)]))
    expect(r.route).not.toBe('direct')
    expect(r.d).not.toBe('')
  })

  it('障碍集组装：yearHeads 与卡/月标注同源并入（allObstacles 三源并集）', async () => {
    const { allObstacles } = await import('../../../src/renderer/features/lineage/routing/chain')
    const snap = makeSnap({
      cards: new Map<string, Rect>([['A', rect(0, 0, 10, 10)]]),
      labels: [rect(20, 20, 5, 5)],
      yearHeads: [rect(40, 40, 6, 6)]
    })
    expect(allObstacles(snap)).toHaveLength(3)
  })

  it('manual-override 不参与避让（via 在场穿 yearHead 照走——现状语义沿承）', () => {
    const r = routeEdge(
      geom('e1', 'A', 'B', [
        { x: 300, y: 136 },
        { x: 300, y: 336 }
      ]),
      columnSnap([rect(144, 224, 40, 10)])
    )
    expect(r.route).toBe('manual-override')
  })
})

describe('F-LINEAGE-02 manual-override（via 在场——design-final §2.2）', () => {
  it('via 折线构造：锚=端点卡主向定边（右 ½ 序）；route=manual-override；r=6 圆角 pass', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(100, 100, CARD_W, CARD_H)],
        ['B', rect(100, 300, CARD_W, CARD_H)]
      ])
    })
    const via = [
      { x: 300, y: 136 },
      { x: 300, y: 336 }
    ]
    const r = routeEdge(geom('e1', 'A', 'B', via), snap)
    expect(r.route).toBe('manual-override')
    expect(r.d).toBe('M 228 136 L 294 136 Q 300 136 300 142 L 300 330 Q 300 336 294 336 L 228 336')
  })

  it('via 优先于甲链（在场即 manual——不落 direct/h-slip）+缺省 via 不触发', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(100, 100, CARD_W, CARD_H)],
        ['B', rect(100, 300, CARD_W, CARD_H)]
      ])
    })
    const withVia = routeEdge(geom('e1', 'A', 'B', [{ x: 250, y: 136 }]), snap)
    expect(withVia.route).toBe('manual-override')
    const noVia = routeEdge(geom('e2', 'A', 'B'), snap)
    expect(noVia.route).toBe('direct')
  })
})

describe('F-LINEAGE-02 确定性（§1.5 无随机/无 Date/无三角函数）', () => {
  it('同输入 routeEdge 100 次输出全等+routeAll 单边一致（detour 夹具——网格通道派生确定性）', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(112, 100, CARD_W, CARD_H)],
        ['W', rect(100, 244, CARD_W, CARD_H)],
        ['B', rect(112, 388, CARD_W, CARD_H)]
      ]),
      frames: [gridFrame()]
    })
    const e = geom('e1', 'A', 'B')
    const first = routeEdge(e, snap)
    for (let i = 0; i < 100; i++) {
      expect(routeEdge(e, snap)).toEqual(first)
    }
    expect(routeAll([e], snap)).toEqual([first])
  })
})

describe('F-SLOTGRID-01 U2 band 终落锚散开（月标封堵首选 slot——INV-79 绕开非豁免；72px 重基线）', () => {
  // 夹具手推：A(112,100,128,72) 下行 B(160,244,128,72)；行隙带 [172,244] h=72
  // →横移 y=槽位中位 208；A 底锚=投影 tc.x=224→proj 112→¾ 序 (208,172)；B 顶
  // 首选锚=投影 sc.x=176→proj 16→¼ (192,244)；月标形 label(113,236,77,8)
  // （膨胀 [109,194]×[232,248]）封堵首选直落竖段；散开序 [0,1,2]→slot1
  // (224,244) 净空承接
  const spreadSnap = (label: Rect): LayoutSnapshot =>
    makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(112, 100, CARD_W, CARD_H)],
        ['B', rect(160, 244, CARD_W, CARD_H)]
      ]),
      labels: [label],
      frames: [{ ...rect(98.4, 80.4, 400, 300), year: 2022 }]
    })

  it('月标挡首选 slot→散开第二槽终落 band（骨架末段=slot1 锚+d 手推）', () => {
    const snap = spreadSnap(rect(113, 236, 77, 8))
    const obstacles = [...snap.cards.values(), ...snap.labels]
    const cards = [...snap.cards.values()]
    const band = bandSkeleton(snap.cards.get('A')!, snap.cards.get('B')!, true, snap, obstacles, cards, undefined, new ChannelUse(), 'A', 'B', 'e1')
    expect(band).not.toBeNull()
    // 终落锚=散开第二候选 slot1：手算 x=160+128×½=224（首选 x=192 被月标
    // 膨胀带 [109,194] 封堵）——骨架末点即生效锚点
    expect(band!.skel[band!.skel.length - 1]).toEqual({ x: 224, y: 244 })
    const r = routeEdge(geom('e1', 'A', 'B'), snap)
    expect(r.route).toBe('band')
    // d 手推：骨架 [(208,172),(208,182),(208,208),(224,208),(224,244)]——
    // 共线剔除后两拐 r=min(6,36/2,48/2)=6
    expect(r.d).toBe('M 208 172 L 208 202 Q 208 208 214 208 L 218 208 Q 224 208 224 214 L 224 244')
  })

  it('全槽被挡（同边三顶槽全被月标形封堵）→bandSkeleton null+routeEdge 降级 overlap（走廊退役后兜底）', () => {
    const snap = spreadSnap(rect(146, 236, 140, 8))
    const obstacles = [...snap.cards.values(), ...snap.labels]
    const cards = [...snap.cards.values()]
    expect(bandSkeleton(snap.cards.get('A')!, snap.cards.get('B')!, true, snap, obstacles, cards, undefined, new ChannelUse(), 'A', 'B', 'e1')).toBeNull()
    // 全候选失败→降级 overlap（x_s=176≠x_t=192→L 形；兜底=最短路线重叠）
    const r = routeEdge(geom('e1', 'A', 'B'), snap)
    expect(r.route).toBe('overlap')
    expect(r.overlapExempt).toBe(true)
  })

  it('散开锚 picks 落记=生效锚（tgt 项=散开 side/slot 非首选——仅胜出态）', () => {
    const snap = spreadSnap(rect(113, 236, 77, 8))
    const obstacles = [...snap.cards.values(), ...snap.labels]
    const cards = [...snap.cards.values()]
    const band = bandSkeleton(snap.cards.get('A')!, snap.cards.get('B')!, true, snap, obstacles, cards, new AnchorUse(), new ChannelUse(), 'A', 'B', 'e1')
    expect(band).not.toBeNull()
    expect(band!.picks).toEqual([
      ['A', 'bottom', 2],
      ['B', 'top', 1]
    ])
  })

  it('[回炉 B2] 散开候选避开已 commit 槽（占用预检）：slot1 被占+slot0 月标挡→散至 slot2', () => {
    const snap = spreadSnap(rect(113, 236, 77, 8))
    const obstacles = [...snap.cards.values(), ...snap.labels]
    const cards = [...snap.cards.values()]
    const use = new AnchorUse()
    use.commit('B', 'top', 1)
    const band = bandSkeleton(snap.cards.get('A')!, snap.cards.get('B')!, true, snap, obstacles, cards, use, new ChannelUse(), 'A', 'B', 'e1')
    expect(band).not.toBeNull()
    expect(band!.skel[band!.skel.length - 1]).toEqual({ x: 256, y: 244 })
    expect(band!.picks).toEqual([
      ['A', 'bottom', 2],
      ['B', 'top', 2]
    ])
  })
})

describe('F-ROUTE-02 [U3] 槽位分配对照（槽位新公式重基线——域=宽−20/n=clamp(⌊(域−8)/8⌋,0,5)）', () => {
  it('① 带内双下降共道→槽位化：同列两 direct 边穿同一行隙单元→x 电平互异且∈分点集+d 手推', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(100, 100, CARD_W, CARD_H)],
        ['B', rect(100, 300, CARD_W, CARD_H)]
      ])
    })
    const paths = routeAll([geom('e1', 'A', 'B'), geom('e2', 'A', 'B')], snap)
    expect(paths.map((p) => p.route)).toEqual(['direct', 'direct'])
    // 行隙单元 [100,228]×[172,300]（W=128→域 108→n=5 分点 110+108k/6=
    // 128/146/164/182/200，j1=177/j2=295）：e1（½/½）ideal=164 恰中槽 idx2
    // （Δ=0<1）→retain 豁免；e2（散开 ¾/¾）ideal=196→|200−196|=4<|182−196|=14
    // →落 idx4=200：Z 链 (196,177)(200,177)(200,295)(196,295)
    expect(paths[0]!.d).toBe('M 164 172 L 164 300')
    expect(paths[1]!.pts).toEqual([
      { x: 196, y: 172 },
      { x: 196, y: 177 },
      { x: 200, y: 177 },
      { x: 200, y: 295 },
      { x: 196, y: 295 },
      { x: 196, y: 300 }
    ])
    // INV-1XX 单元内断言：两竖直段 x 电平互异且均∈分点集 {128,146,164,182,200}
    const lv1 = paths[0]!.pts[0]!.x
    const lv2 = paths[1]!.pts[2]!.x
    expect([128, 146, 164, 182, 200]).toContain(lv1)
    expect([128, 146, 164, 182, 200]).toContain(lv2)
    expect(lv1).not.toBe(lv2)
  })

  it('③b 槽域穷尽豁免（n=1 单槽夹具）：两消费边→第 2 边 L3 豁免落 ideal 未偏移', () => {
    // 矮卡对（h=40）：列缝单元 [228,400]×[100,140]（H=40→域 20→n=1 槽 120）
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(100, 100, CARD_W, 40)],
        ['B', rect(400, 100, CARD_W, 40)]
      ])
    })
    const paths = routeAll([geom('e1', 'A', 'B'), geom('e2', 'A', 'B')], snap)
    expect(paths.map((p) => p.route)).toEqual(['h-slip', 'h-slip'])
    // e1（½/½ 锚 y=120）：ideal=120 恰中槽 idx0（Δ=0<1）→retain 占用；e2
    // （¾/¾ 锚 y=130）：唯一槽被占→L2 无邻单元→L3 豁免→几何不动
    expect(paths[0]!.slotMarks).toBe('0:0')
    expect(paths[0]!.overlapExempt).toBe(true)
    expect(paths[0]!.slotFallback).toBeUndefined()
    expect(paths[1]!.slotMarks).toBeUndefined()
    expect(paths[1]!.overlapExempt).toBe(true)
    expect(paths[1]!.slotFallback).toBe(true)
    expect(paths[1]!.pts).toEqual([{ x: 228, y: 130 }, { x: 400, y: 130 }])
  })

  it('⑧ [U4] 观测钩子投影：retain 例 overlapExempt 挂而 slotFallback 不挂；land 例两标志均不挂', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(100, 100, CARD_W, CARD_H)],
        ['B', rect(100, 300, CARD_W, CARD_H)]
      ])
    })
    const paths = routeAll([geom('e1', 'A', 'B'), geom('e2', 'A', 'B')], snap)
    expect(paths[0]!.slotMarks).toBe('0:2')
    expect(paths[1]!.slotMarks).toBe('0:4')
    expect(paths[0]!.overlapExempt).toBe(true)
    expect(paths[0]!.slotFallback).toBeUndefined()
    expect(paths[1]!.overlapExempt).toBeUndefined()
    expect(paths[1]!.slotFallback).toBeUndefined()
  })

  it('⑩ [U4-RR1 k1-W1] 三线同端点对三落位：½→¾→¼ 三锚 ideal 164/196/132→槽 164 retain/200 land/128 land，三电平两两互异∈分点集', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(100, 100, CARD_W, CARD_H)],
        ['B', rect(100, 300, CARD_W, CARD_H)]
      ])
    })
    const paths = routeAll([geom('e1', 'A', 'B'), geom('e2', 'A', 'B'), geom('e3', 'A', 'B')], snap)
    expect(paths.map((p) => p.route)).toEqual(['direct', 'direct', 'direct'])
    // 散开序 bottom ½=slot1→[1,2,0]=½→¾→¼；e1 retain idx2（164）；e2→200
    // （|200−196|=4<|182−196|=14）；e3→128（|128−132|=4<|146−132|=12）
    expect(paths[0]!.d).toBe('M 164 172 L 164 300')
    expect(paths[1]!.pts).toEqual([
      { x: 196, y: 172 }, { x: 196, y: 177 }, { x: 200, y: 177 },
      { x: 200, y: 295 }, { x: 196, y: 295 }, { x: 196, y: 300 }
    ])
    expect(paths[2]!.pts).toEqual([
      { x: 132, y: 172 }, { x: 132, y: 177 }, { x: 128, y: 177 },
      { x: 128, y: 295 }, { x: 132, y: 295 }, { x: 132, y: 300 }
    ])
    const lv = [paths[0]!.pts[0]!.x, paths[1]!.pts[2]!.x, paths[2]!.pts[2]!.x]
    expect(new Set(lv).size).toBe(3)
    for (const x of lv) expect([128, 146, 164, 182, 200]).toContain(x)
    expect(paths.map((p) => p.slotMarks)).toEqual(['0:2', '0:4', '0:0'])
  })
})

describe('F-SLOTGRID-01 U2 RR2 回炉轮 2（k1-W2′ Phase B 混合解直测/k1-W3′ N12 横边防御）', () => {
  it("[k1-W2′] Phase B 混合解：双带候选族互斥（带1=col0|1 族/带2=右缘族）无贯通类 → 异槽混合组合承接+detourMarks 双异值", () => {
    // W1a 灭带1 左缘、W1b 灭带1 右缘 → C1={358.7..393.3}；W2 灭带2 左缘+
    // col0|1 → C2={575.3..676.7}——C1∩C2=∅（贯通类不存在，Phase A 穷尽）
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(112, 100, CARD_W, CARD_H)],
        ['W1a', rect(100, 244, CARD_W, CARD_H)],
        ['W1b', rect(536, 244, 140, CARD_H)],
        ['W2', rect(96, 532, 460, CARD_H)],
        ['B', rect(112, 676, CARD_W, CARD_H)]
      ]),
      frames: [gridFrame()]
    })
    const r = routeEdge(geom('e1', 'A', 'B'), snap)
    expect(r.route).toBe('detour')
    // 手推：Phase B 首组合=（带1 就近 358.7，带2 就近 575.3）——中夹缝
    // [320,528] h=208→n=5 中位槽 424 回 x₀ 再移出；源侧夹缝 211/目标侧 637
    expect(r.detourMarks).toBe('358.7:182.7,575.3:399.3')
    expect(r.pts).toEqual([
      { x: 176, y: 172 }, { x: 176, y: 182 }, { x: 176, y: 211 }, { x: 358.7, y: 211 },
      { x: 358.7, y: 424 }, { x: 176, y: 424 }, { x: 575.3, y: 424 },
      { x: 575.3, y: 637 }, { x: 176, y: 637 }, { x: 176, y: 666 }, { x: 176, y: 676 }
    ])
    // 混合形态锚：双外槽电平互异（358.7/575.3 各承一带）+中段 x₀ 触点在场
    expect(r.pts.filter((q) => q.x === 358.7).length).toBeGreaterThanOrEqual(2)
    expect(r.pts.filter((q) => q.x === 575.3).length).toBeGreaterThanOrEqual(2)
  })

  it("[k1-W3′·N12] 横边锚同柱防御：4 边同端点（底/顶三槽满员）→第 4 边散开至右锚（x 全等 240）→ detour 不入场（route=overlap 兜底）", () => {
    // W 覆 x₀ 全族（[96,304] ∋ 144/176/208/240）：e1-e3 竖边锚各承 detour；
    // e4 生效锚散开至 right ½（aPt=bPt=(240,·) x 全等）——sa/sb 竖侧+x 等
    // 但 pa/pb 横边：无防御则横边桩 aS.x=250≠x₀ 生对角线；入口约束=生效锚
    // 恒竖侧→跳过 detour→band 终落槽满员 null→overlap
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(112, 100, CARD_W, CARD_H)],
        ['W', rect(100, 244, 200, CARD_H)],
        ['B', rect(112, 388, CARD_W, CARD_H)]
      ]),
      frames: [gridFrame()]
    })
    const paths = routeAll(['e1', 'e2', 'e3', 'e4'].map((id) => geom(id, 'A', 'B')), snap)
    expect(paths.slice(0, 3).map((p) => p.route)).toEqual(['detour', 'detour', 'detour'])
    expect(paths[3]!.route).toBe('overlap')
    // 兜底形态锚：x 全等单竖段（横边锚 L 形域外——直连形态=最短路线）
    expect(paths[3]!.pts).toEqual([{ x: 240, y: 136 }, { x: 240, y: 424 }])
  })
})

