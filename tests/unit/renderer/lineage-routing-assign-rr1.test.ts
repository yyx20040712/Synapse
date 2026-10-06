/**
 * [F-ROUTE-02 U2 回炉轮 1] 走线候选位分配·门一双审（k1+d1 双 FAIL）修复面
 * 直测（runId=20261006-froute02-u2；主控终裁 4 修复+2 驳回备案）。覆盖：
 * 件① B1 rebuildPts 主分支反向段（t2<t1）方向无关化——上行竖段 Z 落位+
 * 左行残余跑段端点迁移；件② 回折分支 segApps 施加+起点端 appAt 电平
 * （recs/pts 一致+正交性——axis='y' 互叠列缝单元+跨段残余组合）；件③
 * route 门（a3 六态：corridor/fallback/manual-override 不消费——负锚三例
 * +槽位零占用传递证）；件④ 斜段排除锁定（segConsumesCell 早退——k1-W2）。
 * 期望值全部手推。always-active 裸 describe（K3）。
 */
import { describe, expect, it } from 'vitest'
import { slotAssign, type AssignEdge } from '../../../src/renderer/features/lineage/routing/slots'
import { defaultCorridor, type LayoutSnapshot, type MonthFrame } from '../../../src/renderer/features/lineage/routing/chain'
import type { Pt, Rect } from '../../../src/renderer/features/lineage/routing/anchors'

const rect = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h })
const pt = (x: number, y: number): Pt => ({ x, y })

function snapOf(
  cards: Array<[string, Rect]>,
  labels: Rect[] = [],
  yearHeads: Rect[] = [],
  frames: MonthFrame[] = []
): LayoutSnapshot {
  return { cards: new Map(cards), labels, frames, yearHeads, contentW: 1000, corridor: defaultCorridor(1000) }
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

/** 基准行隙单元夹具：单元 [100,220]×[170,200]，槽位 122.7/141.3/160/178.7/197.3，j1=175/j2=195 */
const baseCards: Array<[string, Rect]> = [['a', rect(100, 100, 120, 70)], ['b', rect(100, 200, 120, 70)]]

describe('F-ROUTE-02 U2 RR1 件① B1：rebuildPts 主分支反向段（t2<t1）方向无关化', () => {
  it('上行竖段带 Z 落位：pts=[(152,210),(152,160)]→Z 序 (210→195 入槽 160→175→160) 逐点正确', () => {
    const out = slotAssign([ed('e1', [pt(152, 210), pt(152, 160)])], snapOf(baseCards))
    expect(out[0]!.recs[0]).toMatchObject({ cellId: 0, axis: 'x', ideal: 152, slotIdx: 2, overlapExempt: false })
    // 行进序（自起点 210 向终点 160）：先触 j2=195——jog 对按实际方向排列
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

describe('F-ROUTE-02 U2 RR1 件②：回折分支 segApps 施加+起点端 appAt 电平（连接卫生）', () => {
  // L1/L2 同列错落（x 同 [100,160]、y 错叠）×R → 两互叠 y 单元（同带同 x 跨度）：
  // cell1=[160,300]×[100,190]（W=90→槽 117.7/131.3/145/158.7/172.3）
  // cell2=[160,300]×[150,190]（W=40→槽 160.4/166.8/173.2/179.6）
  // band 跑段 y=169 垂直穿越两单元（jog 区同 [165,295]=回折态）+残余区间 [80,160]/[300,340]
  const cards: Array<[string, Rect]> = [
    ['L1', rect(100, 100, 60, 90)],
    ['L2', rect(100, 150, 60, 40)],
    ['R', rect(300, 100, 60, 90)]
  ]
  const e = (): Array<[string, AssignEdge]> => [
    ['e1', band('e1', [pt(80, 169), pt(340, 169)], 169, 6, 3)],
    ['e2', band('e2', [pt(80, 169), pt(340, 169)], 169, 6, 3)]
  ]

  it('同段重叠 z 落位+残余 app 组合：recs（2 槽+2 残余）与 pts 一致+全链正交（无斜线）', () => {
    const out = slotAssign(e().map(([, v]) => v), snapOf(cards))
    // 槽 pass：e1→cell1 idx4(172.3)/cell2 idx1(166.8)；e2→cell1 idx3(158.7)/cell2 idx2(173.2)
    expect(out[0]!.recs.filter((r) => !r.residual).map((r) => r.slotIdx)).toEqual([4, 1])
    expect(out[1]!.recs.filter((r) => !r.residual).map((r) => r.slotIdx)).toEqual([3, 2])
    // 残余 pass：两簇各 off=∓3（recs/pts 一致性）
    expect(out[0]!.recs.filter((r) => r.residual).length).toBe(2)
    expect(out[0]!.pts).toEqual([
      pt(80, 166), pt(160, 166), pt(160, 169), pt(165, 169), pt(165, 172.3), pt(295, 172.3),
      pt(295, 169), pt(165, 169), pt(165, 166.8), pt(295, 166.8), pt(295, 169),
      pt(300, 169), pt(300, 166), pt(340, 166)
    ])
    expect(out[1]!.pts).toEqual([
      pt(80, 172), pt(160, 172), pt(160, 169), pt(165, 169), pt(165, 158.7), pt(295, 158.7),
      pt(295, 169), pt(165, 169), pt(165, 173.2), pt(295, 173.2), pt(295, 169),
      pt(300, 169), pt(300, 172), pt(340, 172)
    ])
    // 正交性：相邻点恒共轴（无斜线连接）
    for (const o of out) {
      for (let i = 1; i < o.pts.length; i++) {
        const a = o.pts[i - 1]!
        const b = o.pts[i]!
        expect(a.x === b.x || a.y === b.y).toBe(true)
      }
    }
  })
})

describe('F-ROUTE-02 U2 RR1 件③：route 门（a3 六态——corridor/fallback/manual-override 不消费）', () => {
  const runGate = (route: AssignEdge['route']): void => {
    const out = slotAssign(
      [ed('x1', [pt(150, 160), pt(150, 210)], route), ed('z1', [pt(150, 160), pt(150, 210)])],
      snapOf(baseCards)
    )
    expect(out[0]!.recs).toEqual([])
    expect(out[0]!.pts).toEqual([pt(150, 160), pt(150, 210)])
    // 传递证：x1 未占任何槽——z1 仍落最近槽 idx1(141.3)
    expect(out[1]!.recs[0]).toMatchObject({ slotIdx: 1, overlapExempt: false })
    expect(out[1]!.pts[2]).toEqual(pt(141.3, 175))
  }

  it('corridor 态穿越单元轴对齐段→recs 空+pts 原样+槽位零占用（后续 direct 边仍取最近槽 idx1）', () => {
    runGate('corridor')
  })

  it('fallback 态穿越单元轴对齐段→recs 空+pts 原样+槽位零占用（放弃避让终态不入槽）', () => {
    runGate('fallback')
  })

  it('manual-override 态穿越单元轴对齐段→recs 空+pts 原样+槽位零占用（用户排位主权）', () => {
    runGate('manual-override')
  })
})

describe('F-ROUTE-02 U2 RR1 件④：斜段排除锁定（segConsumesCell 早退——k1-W2）', () => {
  it('斜段（|dx|=10>ε ∧ |dy|=30>ε）穿开放单元中央→不消费（recs 空+pts 原样）', () => {
    const out = slotAssign([ed('s1', [pt(150, 160), pt(160, 190)])], snapOf(baseCards))
    expect(out[0]!.recs).toEqual([])
    expect(out[0]!.pts).toEqual([pt(150, 160), pt(160, 190)])
  })
})
