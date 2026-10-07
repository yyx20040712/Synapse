/**
 * [F-SLOTGRID-01 U2] 走线候选位分配·detour 场景套件（原 corridor/fallback
 * 门例 7 例随走廊退役删并重写——豁免登记=scripts/test-surface.exemptions.json，
 * 授权=设计 §6 2026-10-07 用户裁决③；runId=20261008-slotgrid-u2）。覆盖：
 * 件① rebuildPts 反向段（t2<t1）方向无关化——上行竖段 Z 落位（U2 槽位
 * 新公式重基线）；件② 回折分支（同带重叠单元病理态 jog 区互叠）segApps
 * 施加+起点端 appAt 电平；件③ route 门（五态制：detour 段=槽位域路线入
 * 槽消费；overlap〔忽略占用终态〕/manual-override〔用户排位主权〕不消费）
 * ——负锚+传递证；件④ 斜段排除锁定（segConsumesCell 早退——k1-W2 沿承）。
 * 期望值全部从夹具几何手推（禁抄实现输出）。always-active 裸 describe（K3）。
 */
import { describe, expect, it } from 'vitest'
import { slotAssign, type AssignEdge } from '../../../src/renderer/features/lineage/routing/slots'
import { type LayoutSnapshot, type MonthFrame } from '../../../src/renderer/features/lineage/routing/chain'
import type { Pt, Rect } from '../../../src/renderer/features/lineage/routing/anchors'

const rect = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h })
const pt = (x: number, y: number): Pt => ({ x, y })

function snapOf(
  cards: Array<[string, Rect]>,
  labels: Rect[] = [],
  yearHeads: Rect[] = [],
  frames: MonthFrame[] = []
): LayoutSnapshot {
  return { cards: new Map(cards), labels, frames, yearHeads, contentW: 1000 }
}

const ed = (edgeId: string, pts: Pt[], route: AssignEdge['route'] = 'direct'): AssignEdge => ({ edgeId, route, pts })
const band = (edgeId: string, pts: Pt[], bandY: number, bandS: number, bandCap: number): AssignEdge => ({
  edgeId,
  route: 'band',
  pts,
  bandY,
  bandS,
  bandCap
})

/** 基准行隙单元夹具：单元 [100,220]×[170,200]，槽位 126.7/143.3/160/176.7/193.3（域=宽−20），j1=175/j2=195 */
const baseCards: Array<[string, Rect]> = [['a', rect(100, 100, 120, 70)], ['b', rect(100, 200, 120, 70)]]

describe('F-SLOTGRID-01 U2 件① rebuildPts 反向段（t2<t1）方向无关化', () => {
  it('上行竖段带 Z 落位：pts=[(152,210),(152,160)]→Z 序 (210→195 入槽 160→175→160) 逐点正确', () => {
    const out = slotAssign([ed('e1', [pt(152, 210), pt(152, 160)])], snapOf(baseCards))
    expect(out[0]!.recs[0]).toMatchObject({ cellId: 0, axis: 'x', ideal: 152, slotIdx: 2, overlapExempt: false })
    // 行进序（自起点 210 向终点 160）：先触 j2=195——jog 对按实际方向排列；
    // ideal=152→|160−152|=8<|143.3−152|=8.7 → 落 idx2=160
    expect(out[0]!.pts).toEqual([
      pt(152, 210),
      pt(152, 195),
      pt(160, 195),
      pt(160, 175),
      pt(152, 175),
      pt(152, 160)
    ])
  })

  it('左行水平跑段带残余 app+端点迁移：pts=[(350,185),(150,185)]→两端点随区间迁移至偏移电平（无残留原顶点）', () => {
    const e1 = band('e1', [pt(350, 185), pt(150, 185)], 185, 6, 3)
    const e2 = band('e2', [pt(350, 185), pt(150, 185)], 185, 6, 3)
    const out = slotAssign([e1, e2], snapOf([])) // 无卡开阔域：全残余（k=2 → off=∓3）
    expect(out[0]!.pts).toEqual([pt(350, 182), pt(150, 182)])
    expect(out[1]!.pts).toEqual([pt(350, 188), pt(150, 188)])
  })
})

describe('F-SLOTGRID-01 U2 件②：回折分支 segApps 施加+起点端 appAt 电平（连接卫生）', () => {
  // L1/L2 同列错落（x 同 [100,160]、y 错叠）×R → 两互叠 y 单元（同带同 x 跨度）：
  // cell1=[160,300]×[100,190]（H=90→域 70→n=5 槽 121.7/133.3/145/156.7/168.3）
  // cell2=[160,300]×[150,190]（H=40→域 20→n=1 槽 170）
  // band 跑段 y=169 垂直穿越两单元+残余区间 [80,160]/[300,340]
  const cards: Array<[string, Rect]> = [
    ['L1', rect(100, 100, 60, 90)],
    ['L2', rect(100, 150, 60, 40)],
    ['R', rect(300, 100, 60, 90)]
  ]
  const e = (): Array<[string, AssignEdge]> => [
    ['e1', band('e1', [pt(80, 169), pt(340, 169)], 169, 6, 3)],
    ['e2', band('e2', [pt(80, 169), pt(340, 169)], 169, 6, 3)]
  ]

  it('e1=cell1 retain（ideal=169 距 168.3=0.7<1）+cell2 land 170：正常分支电平链+全链正交（无斜线）', () => {
    const out = slotAssign(e().map(([, v]) => v), snapOf(cards))
    // 槽 pass：e1→cell1 retain idx4（168.3）+cell2 land idx0（170）
    expect(out[0]!.recs.filter((r) => !r.residual).map((r) => `${r.cellId}:${r.slotIdx}:${r.overlapExempt}`)).toEqual([
      '0:4:true',
      '1:0:false'
    ])
    // 残余 pass：两簇 [80,160]/[300,340] 各 off=(i−0.5)·6=∓3
    expect(out[0]!.recs.filter((r) => r.residual).length).toBe(2)
    expect(out[0]!.pts).toEqual([
      pt(80, 166), pt(160, 166), pt(160, 169), pt(165, 169), pt(165, 170), pt(295, 170),
      pt(295, 169), pt(300, 169), pt(300, 166), pt(340, 166)
    ])
    for (let i = 1; i < out[0]!.pts.length; i++) {
      const a = out[0]!.pts[i - 1]!
      const b = out[0]!.pts[i]!
      expect(a.x === b.x || a.y === b.y, '相邻点恒共轴（无斜线）').toBe(true)
    }
  })

  it('e2=同段双 land 同单元（cell2 消费 L2 溢出落 cell1 次近 145）→回折分支：双槽电平 156.7/145 互叠 jog 区回折链', () => {
    const out = slotAssign(e().map(([, v]) => v), snapOf(cards))
    // 槽 pass：e2 cell1 消费→idx3（156.7，|156.7−169|=12.3 次近——idx4 被 e1
    // retain 占）；cell2 消费→唯一槽被 e1 占→L2 同带域（axis y band0）溢出
    // →cell1 次空槽 idx2（145）落位（同单元双 land=jog 区互叠=回折分支入口）
    expect(out[1]!.recs.filter((r) => !r.residual)).toEqual([
      { edgeId: 'e2', segIdx: 0, cellId: 0, axis: 'y', ideal: 169, slotIdx: 3, overlapExempt: false, residual: false },
      { edgeId: 'e2', segIdx: 0, cellId: 0, axis: 'y', ideal: 169, slotIdx: 2, overlapExempt: false, residual: false }
    ])
    expect(out[1]!.recs.filter((r) => r.residual).length).toBe(2)
    // 回折结构锁：链含两槽电平 156.7/145 的行进段+x 回折（295→165 折返——
    // 重叠 jog 区病理态按行进序施加；起点端随残余 app 迁移至 172 无残留原顶点）
    const xs = out[1]!.pts.map((p) => p.x)
    const ys = out[1]!.pts.map((p) => p.y)
    expect(ys).toContain(156.7)
    expect(ys).toContain(145)
    expect(out[1]!.pts[0]).toEqual(pt(80, 172))
    expect(out[1]!.pts[out[1]!.pts.length - 1]).toEqual(pt(340, 172))
    expect(xs.some((x, i) => i > 0 && x < xs[i - 1]!), 'x 回折在场（重叠 jog 区折返）').toBe(true)
    for (let i = 1; i < out[1]!.pts.length; i++) {
      const a = out[1]!.pts[i - 1]!
      const b = out[1]!.pts[i]!
      expect(a.x === b.x || a.y === b.y, '相邻点恒共轴（无斜线）').toBe(true)
    }
  })
})

describe('F-SLOTGRID-01 U2 件③：route 门（五态制——detour 入槽/overlap・manual-override 不消费）', () => {
  const runGate = (route: AssignEdge['route']): void => {
    const out = slotAssign(
      [ed('x1', [pt(150, 160), pt(150, 210)], route), ed('z1', [pt(150, 160), pt(150, 210)])],
      snapOf(baseCards)
    )
    expect(out[0]!.recs).toEqual([])
    expect(out[0]!.pts).toEqual([pt(150, 160), pt(150, 210)])
    // 传递证：x1 未占任何槽——z1 仍落最近槽 idx1(143.3)
    expect(out[1]!.recs[0]).toMatchObject({ slotIdx: 1, overlapExempt: false })
    expect(out[1]!.pts[2]).toEqual(pt(143.3, 175))
  }

  it('overlap 态穿越单元轴对齐段→recs 空+pts 原样+槽位零占用（忽略占用终态不入槽）', () => {
    runGate('overlap')
  })

  it('manual-override 态穿越单元轴对齐段→recs 空+pts 原样+槽位零占用（用户排位主权）', () => {
    runGate('manual-override')
  })

  it('detour 态对照（槽位域路线）：轴对齐段照常入槽消费——L1 落最近槽（ROUTE_ELIGIBLE 正锚）', () => {
    const out = slotAssign(
      [ed('d1', [pt(150, 160), pt(150, 210)], 'detour'), ed('d2', [pt(150, 160), pt(150, 210)], 'detour')],
      snapOf(baseCards)
    )
    // d1 ideal=150→|143.3−150|=6.7<|160−150|=10 → 落 idx1；d2 同 ideal→idx2=160
    expect(out[0]!.recs[0]).toMatchObject({ slotIdx: 1, overlapExempt: false })
    expect(out[1]!.recs[0]).toMatchObject({ slotIdx: 2, overlapExempt: false })
    expect(out[1]!.pts[2]).toEqual(pt(160, 175))
  })
})

describe('F-SLOTGRID-01 U2 件④：斜段排除锁定（segConsumesCell 早退——k1-W2 沿承）', () => {
  it('斜段（|dx|=10>ε ∧ |dy|=30>ε）穿开放单元中央→不消费（recs 空+pts 原样）', () => {
    const out = slotAssign([ed('s1', [pt(150, 160), pt(160, 190)])], snapOf(baseCards))
    expect(out[0]!.recs).toEqual([])
    expect(out[0]!.pts).toEqual([pt(150, 160), pt(160, 190)])
  })
})
