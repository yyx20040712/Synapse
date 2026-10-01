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
 * - 磁吸±6：先横通道后竖通道并列取近。
 * - 穿卡检测：PAD=4 口径（dragging+selected 态渲染零持久化——检测函数面）。
 * always-active 裸 describe。
 */
import { describe, expect, it } from 'vitest'
import {
  addPointOnSegment,
  channelSnap,
  crossCardSegments,
  deleteVertex,
  dragSegment,
  dragVertex,
  reconnectEnd,
  segmentDrag,
  segmentViaIdx,
  type Channels,
  type EditPolyline
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
  const noCh: Channels = { horizontal: [], vertical: [] }

  it('斜移→仅法向分量：水平段只取 dy（dx 丢弃）；竖直段只取 dx（dy 丢弃）', () => {
    // 指针斜移 (30,10) 拖水平段 0 → 仅 dy=10（法向）
    const h = segmentDrag(hline, 0, 30, 10, noCh)
    expect(h.via[0]).toEqual(pt(50, 110))
    expect(h.via[1]).toEqual(pt(200, 110))
    expect(h.via[2]).toEqual(pt(200, 300)) // 竖直邻段伸缩端不动
    // 指针斜移 (30,10) 拖竖直段 1 → 仅 dx=30
    const v = segmentDrag(hline, 1, 30, 10, noCh)
    expect(v.via[1]).toEqual(pt(230, 100))
    expect(v.via[2]).toEqual(pt(230, 300))
    expect(v.via[0]).toEqual(pt(50, 100))
  })

  it('横磁吸：输入点=被拖段中点（投影后）+吸附位移=snap 点对段原位差', () => {
    // 段 0 原中点=(125,100)；dy=+3 投影后中点=(125,103)；横道 100 距 3≤6 →
    // 吸附回 100（位移=100−100=0——段回原位）；横道 106 → 位移=106−100=+6
    const back = segmentDrag(hline, 0, 20, 3, { horizontal: [100], vertical: [] })
    expect(back.snap).toEqual({ axis: 'h', line: 100 })
    expect(back.via[0]).toEqual(pt(50, 100))
    expect(back.via[1]).toEqual(pt(200, 100))
    const fwd = segmentDrag(hline, 0, 20, 3, { horizontal: [106], vertical: [] })
    expect(fwd.snap).toEqual({ axis: 'h', line: 106 })
    expect(fwd.via[0]).toEqual(pt(50, 106))
    expect(fwd.via[1]).toEqual(pt(200, 106))
  })

  it('竖磁吸：竖直段中点吸附竖道（位移=dx 面）', () => {
    // 段 1 原中点=(200,200)；dx=+2 → 中点 (202,200)；竖道 200 距 2≤6 → 回原位
    const s = segmentDrag(hline, 1, 2, 15, { horizontal: [], vertical: [200] })
    expect(s.snap).toEqual({ axis: 'v', line: 200 })
    expect(s.via[1]).toEqual(pt(200, 100))
    expect(s.via[2]).toEqual(pt(200, 300))
  })

  it('[RR3] 跨轴磁吸过滤：水平段近竖道不吸附（切向位移禁注入——x 原位仅法向 dy）', () => {
    // 段 0（水平 y=100）投影后中点=(125,110)；竖道 x=130 距 5≤6=旧码吸附
    // →注入 dx=+5（水平段横移=相邻竖段拉斜）——跨轴候选过滤后不吸附
    const out = segmentDrag(hline, 0, 20, 10, { horizontal: [], vertical: [130] })
    expect(out.snap).toBeNull() // 跨轴候选出局
    expect(out.via[0]).toEqual(pt(50, 110)) // 仅法向 dy（x 不动）
    expect(out.via[1]).toEqual(pt(200, 110))
    expect(out.via[2]).toEqual(pt(200, 300))
  })

  it('[RR3] 跨轴镜像：竖直段近横道不吸附（dy 切向注入禁）', () => {
    // 段 1（竖直 x=200）投影后中点=(230,200)；横道 y=204 距 4≤6=旧码吸附
    // →注入 dy=+4（竖直段纵向平移拉斜相邻横段）——过滤后不吸附
    const out = segmentDrag(hline, 1, 30, 0, { horizontal: [204], vertical: [] })
    expect(out.snap).toBeNull()
    expect(out.via[1]).toEqual(pt(230, 100)) // 仅法向 dx（y 不动）
    expect(out.via[2]).toEqual(pt(230, 300))
  })

  it('斜段禁拖（拖开中途的非正交态）与带外不吸附=原样 via+snap null', () => {
    const diag = line(pt(0, 0), [pt(50, 50), pt(150, 150)], pt(200, 150))
    const out = segmentDrag(diag, 0, 30, 10, noCh)
    expect(out.via).toEqual([pt(50, 50), pt(150, 150)]) // 斜段零位移
    expect(out.snap).toBeNull()
    const miss = segmentDrag(hline, 0, 0, 30, { horizontal: [100], vertical: [] }) // 距 30>6
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

describe('U5 编辑代数：端点重连（§2.3-6 L 重正交）', () => {
  it('换锚（新锚右侧边）：首拐插入 (V.x, A.y)——入轴=锚法线向+via 全保留', () => {
    // 新锚 A2=(400,80)（右锚法线 +x）；首 via V=(360,200)
    const p = line(pt(300, 200), [pt(360, 200), pt(360, 320)], pt(400, 360))
    const out = reconnectEnd(p, 'from', pt(400, 80), 'right')
    // 新首点=(V.x, A2.y)=(360,80)：A2→新点水平（含短桩）、新点→V 竖直
    expect(out.via[0]).toEqual(pt(360, 80))
    expect(out.via[1]).toEqual(pt(360, 200)) // via 全保留
    expect(out.via[2]).toEqual(pt(360, 320))
  })

  it('同轴直达：新锚与首 via 同列（竖直锚位）=零插入', () => {
    const p = line(pt(0, 0), [pt(300, 50)], pt(300, 400))
    const out = reconnectEnd(p, 'from', pt(300, 10), 'bottom')
    // A=(300,10) bottom 锚：法线竖直；A→V=(300,50) 已竖直直达
    expect(out.via).toEqual([pt(300, 50)])
  })
})

describe('U5 编辑代数：磁吸±6（§2.3-7 先横后竖取近）', () => {
  const channels = { horizontal: [200, 400], vertical: [150, 350] }
  it('横通道 ±6 内吸附（并列取近）', () => {
    expect(channelSnap(pt(100, 205), channels)).toEqual({ p: pt(100, 200), axis: 'h', snapped: true })
    expect(channelSnap(pt(100, 397), channels)).toEqual({ p: pt(100, 400), axis: 'h', snapped: true })
  })
  it('横竖并列取近（|dy|<|dx| 胜）', () => {
    // 距横道 200 差 4、距竖道 150 差 2 → 竖近胜
    expect(channelSnap(pt(152, 204), channels)).toEqual({ p: pt(150, 204), axis: 'v', snapped: true })
  })
  it('[回炉 R16] 横竖并列同差取横（<= 变异应红——竖环改 <= 则竖胜）', () => {
    // 距横道 200 差 4=距竖道 150 差 4 → 并列同差取横
    expect(channelSnap(pt(154, 204), channels)).toEqual({ p: pt(154, 200), axis: 'h', snapped: true })
  })
  it('带外不吸附', () => {
    expect(channelSnap(pt(100, 210), channels)).toEqual({ p: pt(100, 210), axis: null, snapped: false })
  })

  it('[RR6] 恰 SNAP_R=6 边界两轴对称：横环/竖环（无对侧候选时）均可吸附', () => {
    // 横环恰 6（y 距横道 206−200=6——既有行为）+竖环恰 6（x 距竖道 206−200=6
    // ——原竖环严格小于才胜=恰 6 不吸附的不对称缺陷）
    expect(channelSnap(pt(100, 206), { horizontal: [200], vertical: [] })).toEqual({ p: pt(100, 200), axis: 'h', snapped: true })
    expect(channelSnap(pt(206, 100), { horizontal: [], vertical: [200] })).toEqual({ p: pt(200, 100), axis: 'v', snapped: true })
    // 两轴同恰 6 并列=横先语义保持（R16 沿承）
    expect(channelSnap(pt(206, 206), { horizontal: [200], vertical: [200] })).toEqual({ p: pt(206, 200), axis: 'h', snapped: true })
  })
})

describe('U5 编辑代数：穿卡检测（口径 PAD=4）', () => {
  const cards = [{ x: 200, y: 100, w: 128, h: 72 }]
  it('穿卡段命中（膨胀 4——边界 132 内即中）', () => {
    const p = line(pt(0, 136), [pt(300, 136)], pt(400, 136))
    const hits = crossCardSegments(p, cards, [])
    expect(hits.length).toBeGreaterThan(0)
  })
  it('源/目标卡排除（stubExcluded 语义）', () => {
    const src = { x: 0, y: 100, w: 128, h: 72 }
    const p = line(pt(64, 136), [pt(300, 136)], pt(400, 136))
    // 两段（A→v/v→B）均穿中卡=2 命中；源卡（stubExcluded）零命中
    expect(crossCardSegments(p, [src, ...cards], [src])).toHaveLength(2)
  })
})
