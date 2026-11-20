// @vitest-environment jsdom
/**
 * [F-LGRAPH-01②U5] 手动调线编辑代数 —— 首红测试组（TDD）。
 *
 * 单源=F-LINEAGE-02 design-final §2.3（编辑代数——本测试锁其实现）：
 * - 拖顶点逐段独立判定轴跟随（入段竖直⇒前邻.x←P.x 等；首末拐点联动止于
 *   短桩：锚点端被动、短桩沿法线伸缩）。
 * - 拖段中=整段平移两端拐点绝对位移同量；源/目标短桩段不参与。
 * - 加点=段中点插入共线点。
 * - 删点分治：共线中点直删/真拐点 L 形重连（入横⇒(后邻.x,前邻.y)）+重连后
 *   共线邻点顺带消除+删空回自动（undefined）。
 * - 端点重连：via 全保留+首/末段 L 重正交（新锚→第一 via 入轴=锚法线向）。
 * - [F-LANEGRID-01 B3b §11-1 甲] 磁吸=车道格（顶点拖=最近车道交点/段拖=
 *   法向单轴线，容差 8px；旧通道中线磁吸 ±6 退役——通道集 channelsFrom 同批
 *   删除；完整吸附/门校验契约例=lineage-manual-grid.test 承载）。
 * - 穿卡检测：PAD=6 口径（dragging+selected 态渲染零持久化——检测函数面）。
 * always-active 裸 describe。
 */
import { describe, expect, it } from 'vitest'
import {
  addPointOnSegment,
  crossCardSegments,
  deleteVertex,
  dragSegment,
  dragVertex,
  laneSnapAxis,
  segmentDrag,
  segmentViaIdx,
  type EditPolyline,
  type LaneLines
} from '../../../src/renderer/features/lineage/edge-edit'
import type { Pt } from '../../../src/renderer/features/lineage/routing/anchors'

const pt = (x: number, y: number): Pt => ({ x, y })

/** 全点链构造：锚 A + via + 锚 B */
const line = (a: Pt, via: Pt[], b: Pt): EditPolyline => ({ anchorA: a, anchorB: b, via: via.map((p) => ({ ...p })) })

describe('U5 编辑代数：拖顶点（§2.3-1 逐段独立判定）', () => {
  it('内部顶点：入段竖直⇒前邻.x←P.x；出段水平⇒后邻.y←P.y（各段独立）', () => {
    // via=[(100,50),(100,200),(300,200)]：段 A→v1 竖直、v1→v2 竖直、v2→B 水平
    const p = line(pt(100, 10), [pt(100, 50), pt(100, 200), pt(300, 200)], pt(340, 200))
    // 拖 v1 到 (160,80)：入段(A→v1) 竖直 ⇒ 锚被动+短桩沿法线伸缩（v1.x 钳回
    // 锚轴 100）；出段(v1→v2) 竖直 ⇒ v2.x←P.x=160
    const out = dragVertex(p, 0, pt(160, 80))
    expect(out.via[0]).toEqual(pt(100, 80)) // 锚端被动：x 钳锚轴；y 跟随（短桩伸缩）
    expect(out.via[1]).toEqual(pt(100, 200)) // 出段竖直⇒后邻.x←**钳位后**点 x（联动止于短桩——正交保持）
  })

  it('内部顶点一般式：入段水平⇒前邻.y←P.y；出段竖直⇒后邻.x←P.x', () => {
    // via=[(50,100),(200,100),(200,300)]：A→v1 水平、v1→v2 竖直、v2→B 竖直
    const p = line(pt(10, 100), [pt(50, 100), pt(200, 100), pt(200, 300)], pt(200, 340))
    const out = dragVertex(p, 1, pt(220, 160))
    // 入段水平 ⇒ 前邻.y←P.y=160（v1 x 不动）；出段竖直 ⇒ 后邻.x←P.x=220（锚 B 端）
    expect(out.via[0]).toEqual(pt(50, 160))
    expect(out.via[1]).toEqual(pt(220, 160)) // 被拖点本身=P
    expect(out.via[2]).toEqual(pt(220, 300))
  })

  it('末拐点联动止于短桩：锚 B 被动——出段为锚段时后邻不动、v_n 钳锚轴沿法线伸缩', () => {
    // via=[(100,100),(300,100)]，B=(300,340)：v2→B 竖直（锚段）
    const p = line(pt(100, 100), [pt(100, 240), pt(300, 240)], pt(300, 340))
    const out = dragVertex(p, 1, pt(360, 260))
    // 入段(v1→v2) 水平 ⇒ 前邻.y←P.y=260；出段(v2→B) 竖直=锚段 ⇒ B 被动+v2.x 钳 B 轴 300
    expect(out.via[0]).toEqual(pt(100, 260))
    expect(out.via[1]).toEqual(pt(300, 260))
  })
})

describe('U5 编辑代数：拖段中（§2.3-2 整段平移）', () => {
  it('两端拐点绝对位移同量（段 v1→v2 平移 (30,10)）；相邻段伸缩；锚端短桩段不参与', () => {
    const p = line(pt(100, 10), [pt(100, 50), pt(100, 200), pt(300, 200)], pt(340, 200))
    // 拖段 0（v0→v1 via 内点对）平移 dx=40：两端拐点绝对位移同量
    const out = dragSegment(p, 0, 40, 0)
    expect(out.via[0]).toEqual(pt(140, 50))
    expect(out.via[1]).toEqual(pt(140, 200))
    expect(out.via[2]).toEqual(pt(300, 200)) // 相邻段伸缩端不动（锚端短桩不参与）
  })

  it('段索引域=via 内点对（0..via.length-2）——越界防御=原样返回', () => {
    const p = line(pt(0, 0), [pt(10, 10), pt(10, 50)], pt(50, 50))
    expect(dragSegment(p, 5, 10, 10)).toEqual(p)
    expect(dragSegment(p, -1, 10, 10)).toEqual(p)
  })
})

describe('U5 编辑代数：拖段投影+磁吸（回炉 R3——法向分量/被拖段几何输入）', () => {
  // via 3 点：v0→v1 水平段（y=100）、v1→v2 竖直段（x=200）
  const hline = line(pt(0, 100), [pt(50, 100), pt(200, 100), pt(200, 300)], pt(200, 340))
  const noLines: LaneLines = { v: [], h: [] }

  it('斜移→仅法向分量：水平段只取 dy（dx 丢弃）；竖直段只取 dx（dy 丢弃）', () => {
    // 指针斜移 (30,10) 拖水平段 0 → 仅 dy=10（法向）
    const h = segmentDrag(hline, 0, 30, 10, noLines)
    expect(h.via[0]).toEqual(pt(50, 110))
    expect(h.via[1]).toEqual(pt(200, 110))
    expect(h.via[2]).toEqual(pt(200, 300)) // 竖直邻段伸缩端不动
    // 指针斜移 (30,10) 拖竖直段 1 → 仅 dx=30
    const v = segmentDrag(hline, 1, 30, 10, noLines)
    expect(v.via[1]).toEqual(pt(230, 100))
    expect(v.via[2]).toEqual(pt(230, 300))
    expect(v.via[0]).toEqual(pt(50, 100))
  })

  it('横磁吸：输入点=被拖段中点（投影后）+吸附位移=snap 点对段原位差', () => {
    // 段 0 原中点=(125,100)；dy=+3 投影后中点=(125,103)；h 道 100 距 3≤8 →
    // 吸附回 100（位移=100−100=0——段回原位）；h 道 106 → 位移=106−100=+6
    const back = segmentDrag(hline, 0, 20, 3, { v: [], h: [100] })
    expect(back.snap).toEqual({ axis: 'h', line: 100 })
    expect(back.via[0]).toEqual(pt(50, 100))
    expect(back.via[1]).toEqual(pt(200, 100))
    const fwd = segmentDrag(hline, 0, 20, 3, { v: [], h: [106] })
    expect(fwd.snap).toEqual({ axis: 'h', line: 106 })
    expect(fwd.via[0]).toEqual(pt(50, 106))
    expect(fwd.via[1]).toEqual(pt(200, 106))
  })

  it('竖磁吸：竖直段中点吸附竖道（位移=dx 面）', () => {
    // 段 1 原中点=(200,200)；dx=+2 → 中点 (202,200)；v 道 200 距 2≤8 → 回原位
    const s = segmentDrag(hline, 1, 2, 15, { v: [200], h: [] })
    expect(s.snap).toEqual({ axis: 'v', line: 200 })
    expect(s.via[1]).toEqual(pt(200, 100))
    expect(s.via[2]).toEqual(pt(200, 300))
  })

  it('[RR3] 跨轴磁吸过滤：水平段近竖道不吸附（切向位移禁注入——x 原位仅法向 dy）', () => {
    // 段 0（水平 y=100）投影后中点=(125,110)；v 道 x=130 距 5≤8=候选在但
    // 跨轴——法向单轴过滤后不吸附（注入 dx=+5 会水平横移=相邻竖段拉斜）
    const out = segmentDrag(hline, 0, 20, 10, { v: [130], h: [] })
    expect(out.snap).toBeNull() // 跨轴候选出局
    expect(out.via[0]).toEqual(pt(50, 110)) // 仅法向 dy（x 不动）
    expect(out.via[1]).toEqual(pt(200, 110))
    expect(out.via[2]).toEqual(pt(200, 300))
  })

  it('[RR3] 跨轴镜像：竖直段近横道不吸附（dy 切向注入禁）', () => {
    // 段 1（竖直 x=200）投影后中点=(230,200)；h 道 y=204 距 4≤8=候选在但
    // 跨轴——过滤后不吸附（注入 dy=+4 会竖直段纵向平移拉斜相邻横段）
    const out = segmentDrag(hline, 1, 30, 0, { v: [], h: [204] })
    expect(out.snap).toBeNull()
    expect(out.via[1]).toEqual(pt(230, 100)) // 仅法向 dx（y 不动）
    expect(out.via[2]).toEqual(pt(230, 300))
  })

  it('斜段禁拖（拖开中途的非正交态）与带外不吸附=原样 via+snap null', () => {
    const diag = line(pt(0, 0), [pt(50, 50), pt(150, 150)], pt(200, 150))
    const out = segmentDrag(diag, 0, 30, 10, noLines)
    expect(out.via).toEqual([pt(50, 50), pt(150, 150)]) // 斜段零位移
    expect(out.snap).toBeNull()
    const miss = segmentDrag(hline, 0, 0, 30, { v: [], h: [100] }) // 距 30>8
    expect(miss.snap).toBeNull()
    expect(miss.via[0]).toEqual(pt(50, 130)) // 自由投影位移仍生效
  })
})

describe('U5 编辑代数：拖段段序边界（回炉 R4——锚端短桩不参与）', () => {
  it('全链段序→via 内点对序：0=锚 A 短桩/via.length=锚 B 短桩均 null（不参与）；中段 i→i-1', () => {
    const p = line(pt(0, 0), [pt(50, 0), pt(50, 100), pt(150, 100)], pt(150, 140))
    expect(segmentViaIdx(p, 0)).toBeNull() // 锚 A 侧短桩段
    expect(segmentViaIdx(p, 3)).toBeNull() // 锚 B 侧短桩段（via.length=3）
    expect(segmentViaIdx(p, 1)).toBe(0)
    expect(segmentViaIdx(p, 2)).toBe(1)
    expect(segmentViaIdx(p, -1)).toBeNull()
    expect(segmentViaIdx(p, 9)).toBeNull()
  })
})

describe('U5 编辑代数：加点（§2.3-3 段中点共线）', () => {
  it('段中点插入：via 首段/中段/末段三位置', () => {
    const p = line(pt(0, 0), [pt(100, 0), pt(100, 100)], pt(200, 100))
    expect(addPointOnSegment(p, 0).via[0]).toEqual(pt(50, 0)) // 锚 A 邻段=首插
    expect(addPointOnSegment(p, 2).via[2]).toEqual(pt(150, 100)) // 末段（v1→B）=尾插
  })
  it('越界防御=原样', () => {
    const p = line(pt(0, 0), [pt(100, 0)], pt(100, 100))
    expect(addPointOnSegment(p, 9)).toEqual(p)
  })
})

describe('U5 编辑代数：删点分治（§2.3-4）', () => {
  it('共线中点直删（无几何变化）', () => {
    // v2 与 v1、v3 共线水平
    const p = line(pt(0, 0), [pt(50, 0), pt(100, 0), pt(150, 0)], pt(200, 0))
    const out = deleteVertex(p, 1)
    expect(out.via).toEqual([pt(50, 0), pt(150, 0)])
  })

  it('真拐点 L 形重连（入段轴保持）：正交链拐点删除=L 重建——正交性保持+入横式 (后邻.x, 前邻.y)', () => {
    // 删 v2（入段 v1→v2 水平、出段 v2→v3 竖直）：新拐=(v3.x, v1.y) 替换被删点
    // ——正交不变量下 L 角=原拐位（D-L2/B-1：正交下不可直线合并，轴保持式）
    const p = line(pt(0, 100), [pt(50, 100), pt(150, 100), pt(150, 300)], pt(140, 300))
    const out = deleteVertex(p, 1)
    expect(out.via).toEqual([pt(50, 100), pt(150, 100), pt(150, 300)])
    // 入竖式镜像：删入段竖直拐点 → 新拐=(前邻.x, 后邻.y)
    const q = line(pt(100, 0), [pt(100, 50), pt(100, 150), pt(250, 150)], pt(250, 200))
    expect(deleteVertex(q, 1).via).toEqual([pt(100, 50), pt(100, 150), pt(250, 150)])
  })

  it('[回炉 R22] 判别力用例（斜段拖后输入）：删点拐=重算值≠原位（恒等断言无判别力——对角输入下 L 角真实重算）', () => {
    // 拖段中途的非正交态（入段斜）：删 v2 → 入段按水平式 → 新拐=(后邻.x, 前邻.y)
    // =(180,100)≠原位 (180,220)——输出≠输入（判别力在）
    const p = line(pt(0, 100), [pt(50, 100), pt(180, 220), pt(180, 300)], pt(220, 300))
    const out = deleteVertex(p, 1)
    expect(out.via).toEqual([pt(50, 100), pt(180, 100), pt(180, 300)])
    // 重连后链恢复正交（前邻→新拐水平/新拐→后邻竖直）
    const pts = [pt(0, 100), ...out.via, pt(220, 300)]
    expect(pts[1]!.y).toBe(pts[2]!.y) // 水平
    expect(pts[2]!.x).toBe(pts[3]!.x) // 竖直
  })

  it('删空回自动：共线单点 via 删后=undefined（回自动路由）', () => {
    const p = line(pt(0, 0), [pt(50, 0)], pt(100, 0))
    expect(deleteVertex(p, 0).via).toBeUndefined()
  })
})

describe('U5 编辑代数：车道格磁吸（[F-LANEGRID-01 B3b] 法向单轴线——完整吸附契约例驻 lineage-manual-grid.test）', () => {
  const lines: LaneLines = { v: [150, 350], h: [200, 400] }
  it('单轴线 8px 内吸附（h 轴取 y/v 轴取 x）；恰 8 边界含、带外 null', () => {
    expect(laneSnapAxis(pt(100, 205), 'h', lines)).toBe(200)
    expect(laneSnapAxis(pt(100, 397), 'h', lines)).toBe(400)
    expect(laneSnapAxis(pt(356, 100), 'v', lines)).toBe(350)
    expect(laneSnapAxis(pt(100, 208), 'h', lines)).toBe(200) // 恰 8 含
    expect(laneSnapAxis(pt(100, 209), 'h', lines)).toBeNull() // 9 出界
    expect(laneSnapAxis(pt(100, 100), 'v', lines)).toBeNull() // 单轴候选缺席侧=150/350 均 >8 出界
  })
})

describe('U5 编辑代数：穿卡检测（口径 PAD=6）', () => {
  const cards = [{ x: 200, y: 100, w: 128, h: 72 }]
  it('穿卡段命中（膨胀 6——段 y=136 穿卡本体膨胀带）', () => {
    const p = line(pt(0, 136), [pt(300, 136)], pt(400, 136))
    const hits = crossCardSegments(p, cards, [])
    expect(hits.length).toBeGreaterThan(0)
  })

  it('[R2-C4 low-1] PAD=6 边界对：y=178 恰触卡膨胀下缘命中（PAD=4 时不命中）／y=178.1 出界零命中', () => {
    // 卡 (200,100,128,72) PAD=6 膨胀 y∈[94,178]（100−6/172+6）——含边界命中
    //（D-6）；y=178.1>178 出界。变异验证（R2-C4 报告载退出码证据）：PAD 临时
    // 回 4（膨胀 y∈[96,176]）时 y=178 例转红（length=0）=4/6 判别力实证
    expect(crossCardSegments(line(pt(0, 178), [pt(300, 178)], pt(400, 178)), cards, []).length).toBeGreaterThan(0)
    expect(crossCardSegments(line(pt(0, 178.1), [pt(300, 178.1)], pt(400, 178.1)), cards, [])).toEqual([])
  })
  it('源/目标卡排除（stubExcluded 语义）', () => {
    const src = { x: 0, y: 100, w: 128, h: 72 }
    const p = line(pt(64, 136), [pt(300, 136)], pt(400, 136))
    // 两段（A→v/v→B）均穿中卡=2 命中；源卡（stubExcluded）零命中
    expect(crossCardSegments(p, [src, ...cards], [src])).toHaveLength(2)
  })
})
