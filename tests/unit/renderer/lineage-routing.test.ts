/**
 * [F-LINEAGE-02 ①a] lineage-routing 甲链例集（六态各层+曲化复检收缩+车道+
 * manual-override+确定性）——旧五级链 22 例随方案切换退役（测试数据可清
 * 授权 v95 §2-1；豁免登记=scripts/test-surface.exemptions.json）。
 * 真相源=docs/design/2026-10-01_f-lineage02-routing-design-final.md §1+
 * options §1/§2-A。**d 值独立推导**（d1-N5 兑现）：全部期望值自夹具几何
 * 手推（锚点 ¼/½/¾×128×72、桩 10、PAD 4、r=6/段长钳制），禁抄实现输出。
 * 基准卡=128×72（P-15）。always-active 裸 describe（K3）。
 */
import { describe, expect, it, vi } from 'vitest'
import { AnchorUse } from '../../../src/renderer/features/lineage/routing/anchors'
import { bandSkeleton } from '../../../src/renderer/features/lineage/routing/bands'
import type { EdgeGeomInput, LayoutSnapshot, Rect } from '../../../src/renderer/features/lineage/routing/chain'
import { defaultCorridor, laneIndex, routeAll, routeEdge } from '../../../src/renderer/features/lineage/routing/chain'

// ── 夹具工具（纯数据——contentW=800 ⇒ laneX(i)=800−58+10+9i=752+9i，D-5 沿承）──

function rect(x: number, y: number, w: number, h: number): Rect {
  return { x, y, w, h }
}

function makeSnap(partial: Partial<LayoutSnapshot> = {}): LayoutSnapshot {
  const contentW = partial.contentW ?? 800
  return {
    cards: partial.cards ?? new Map<string, Rect>(),
    labels: partial.labels ?? [],
    frames: partial.frames ?? [],
    yearHeads: partial.yearHeads ?? [],
    contentW,
    corridor: partial.corridor ?? defaultCorridor(contentW)
  }
}

const CARD_W = 128
const CARD_H = 72

function geom(id: string, from: string, to: string, via?: Array<{ x: number; y: number }>): EdgeGeomInput {
  return { edgeId: id, sourceId: from, targetId: to, via }
}

describe('F-LINEAGE-02 甲链六态（direct→h-slip→band→corridor→fallback 单向不回溯）', () => {
  it('① direct：同列上下卡（主向竖+锚 x 相等）→ 单竖直段；d=底锚(164,172)→顶锚(164,300) 手推', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(100, 100, CARD_W, CARD_H)],
        ['B', rect(100, 300, CARD_W, CARD_H)]
      ])
    })
    const r = routeEdge(geom('e1', 'A', 'B'), snap)
    expect(r.route).toBe('direct')
    expect(r.lane).toBe(-1)
    // 源底锚=投影 tc.x=164→½ 序 (164,172)；目标顶锚同序 (164,300)；
    // 中段 [182,290] 距两卡膨胀带（≤176/≥296）恒净空 → 直连
    expect(r.d).toBe('M 164 172 L 164 300')
  })

  it('① direct 阻挡降级：中列障碍卡拦竖段 → ③ band 行隙带承接（同框跨行瀑布错位吸收）', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(100, 100, CARD_W, CARD_H)],
        ['C', rect(240, 100, CARD_W, CARD_H)],
        ['B', rect(182, 192, CARD_W, CARD_H)]
      ]),
      frames: [{ ...rect(90, 60, 600, 300), year: 2022 }]
    })
    const r = routeEdge(geom('e1', 'A', 'B'), snap)
    expect(r.route).toBe('band')
    // 手推：tc=(246,228)→A 底锚 ¾ 序 (196,172)；sc=(164,136)→B 顶锚 ¼ 序
    // (214,192)；行隙带 [172,192]（卡 y 区间夹缝，宽 20>s 下限）中心 y=182；
    // 锚 x≠目标 x（瀑布错位）→带内横移；桩 10px→拐角 r=min(6,5,9)=5
    expect(r.d).toBe('M 196 172 L 196 177 Q 196 182 201 182 L 209 182 Q 214 182 214 187 L 214 192')
    expect(r.lane).toBe(-1)
  })

  it('① direct 中段穿障碍（D-L2-4 中段含全卡）→ ③ band zigzag：下降 x 候选=目标 x→列缝→框外空白（67=框左 90−23）', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(100, 100, CARD_W, CARD_H)],
        ['D', rect(100, 192, CARD_W, CARD_H)],
        ['B', rect(100, 284, CARD_W, CARD_H)]
      ]),
      frames: [{ ...rect(90, 60, 600, 400), year: 2022 }]
    })
    const r = routeEdge(geom('e1', 'A', 'B'), snap)
    expect(r.route).toBe('band')
    // 手推：A/B 锚 x=164（½ 序）竖段穿 D（膨胀 y[188,268]）→direct 废；
    // 行隙带 [172,192]/[264,284] 两道；带0 终落 x=164 穿 D→候选 [164(废),
    // 无列缝（D 单列）,框外空白 67]→67 降带；带1 终落 164 净空；r=6 全拐
    expect(r.d).toBe('M 164 172 L 164 177 Q 164 182 159 182 L 73 182 Q 67 182 67 188 L 67 268 Q 67 274 73 274 L 159 274 Q 164 274 164 279 L 164 284')
  })

  it('② h-slip：x 带分离（右向）→ 近侧锚单段直线；d=源右 ¾ (228,154)→目标左 ½ (400,176) 手推', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(100, 100, CARD_W, CARD_H)],
        ['B', rect(400, 140, CARD_W, CARD_H)]
      ])
    })
    const r = routeEdge(geom('e1', 'A', 'B'), snap)
    expect(r.route).toBe('h-slip')
    // 源右锚=投影 tc.y=176→¾ 序 (228,154)；目标左锚=投影 sc.y=136 于
    // B(y∈[140,212])→¼ 序 (400,158)；x 带分离 100+128+8=236<400 ✓；
    // 两端 10px 桩区外中段净空（初稿手算 176 误按 B 顶=100——勘正）
    expect(r.d).toBe('M 228 154 L 400 158')
    expect(r.lane).toBe(-1)
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
    // tc=(164,336)→A 左锚 ¾ 序 (400,154)；sc=(464,136) 于 B(y∈[300,372])
    // →¼ 序 (228,318)（初稿手算 176 误按 B 顶=100——勘正）
    expect(r.d).toBe('M 400 154 L 228 318')
  })

  it('④ corridor：带封闭（行距 ≤2·PAD）+直连阻挡 → 右缘面带 4 道 lane0；d 手推（r=6 全拐）', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(100, 100, CARD_W, CARD_H)],
        ['X', rect(90, 176, 600, 120)],
        ['B', rect(100, 300, CARD_W, CARD_H)]
      ])
    })
    const r = routeEdge(geom('e1', 'A', 'B'), snap)
    expect(r.route).toBe('corridor')
    expect(r.lane).toBe(0)
    // X 并合卡 y 区间→行隙 [172,176]/[296,300] 宽 4≤2·PAD=8→带全封闭；
    // 源右锚 ¾ (228,154)/目标右锚 ¼ (228,318)；lane0 x=752；拐角 r=6
    expect(r.d).toBe('M 228 154 L 746 154 Q 752 154 752 160 L 752 312 Q 752 318 746 318 L 228 318')
  })

  it('④ corridor 车道升级：V0 只挡 lane0 竖段扫掠（膨胀 [745,760]×[176,204]）→ lane1；r=6 圆角终态', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(200, 100, CARD_W, CARD_H)],
        ['M', rect(96, 180, 600, 8)],
        ['B', rect(100, 196, CARD_W, CARD_H)],
        ['V0', rect(749, 180, 7, 20)]
      ])
    })
    const r = routeEdge(geom('e1', 'A', 'B'), snap)
    expect(r.route).toBe('corridor')
    expect(r.lane).toBe(1)
    // lane1 x=761（V0 膨胀 x≤760 之外）；两臂 y=154/214 距 V0 膨胀 y 带
    // [176,204] 净空 ≥10；拐角 (761,154)/(761,214) r=6 弧最小 y=208>204 过检
    expect(r.d).toBe('M 328 154 L 755 154 Q 761 154 761 160 L 761 208 Q 761 214 755 214 L 228 214')
  })

  it('⑤ fallback：带封闭+全道阻挡（CW 横跨 4 道）→ 贴边 contentW−6+onWarn（lane=−1 划界）', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(100, 100, CARD_W, CARD_H)],
        ['B', rect(182, 196, CARD_W, CARD_H)],
        ['CW', rect(740, 120, 80, 200)]
      ])
    })
    const onWarn = vi.fn()
    const r = routeEdge(geom('e1', 'A', 'B'), snap, onWarn)
    expect(r.route).toBe('fallback')
    expect(r.lane).toBe(-1)
    expect(onWarn).toHaveBeenCalledTimes(1)
    // CW 并合全部行→零带；瀑布错位（A 锚 ¾ x=196≠B 锚 ½ x=246）→direct 废；
    // 4 道全穿 CW 膨胀 [736,824]→fallback 贴边 x=794；圆角复检恒红→尖角
    expect(r.d).toBe('M 228 154 L 794 154 L 794 214 L 310 214')
  })

  it('端点卡缺失：d 空+route fallback+onWarn（防御面沿承）', () => {
    const snap = makeSnap({ cards: new Map<string, Rect>([['A', rect(100, 100, CARD_W, CARD_H)]]) })
    const onWarn = vi.fn()
    const r = routeEdge(geom('e1', 'A', 'GHOST'), snap, onWarn)
    expect(r.d).toBe('')
    expect(r.route).toBe('fallback')
    expect(onWarn).toHaveBeenCalledTimes(1)
  })
})

describe('F-LINEAGE-02 曲化复检收缩链（骨架过检后曲化再检——D-L2-5 半径逐半减）', () => {
  it('内对角障碍（label）距骨架 >PAD 但距 r=5 弧 <PAD → 收缩 r=2.5 复检过（d 半径降级手推）', () => {
    // 基面=band 场景（A/C/B 瀑布）：label(201,173,4,4) 膨胀=[197,209]×
    // [169,181]（含自身高 4——初稿漏算膨胀底缘）；骨架净空：竖桩 x=196<197、
    // 横段 y=182>181 各 1px 整数余量；r=6 钳 5 弧 x=196+5t² 于 x≥197 段
    // （t≥0.447）y≤180.5 落膨胀带→复检红；收缩链 r=6→3（ROUND_R 减半）：
    // r=3 弧同段（t≥0.577）y≥181.47>181 过检
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(100, 100, CARD_W, CARD_H)],
        ['C', rect(240, 100, CARD_W, CARD_H)],
        ['B', rect(182, 192, CARD_W, CARD_H)]
      ]),
      labels: [rect(201, 173, 4, 4)],
      frames: [{ ...rect(90, 60, 600, 300), year: 2022 }]
    })
    const r = routeEdge(geom('e1', 'A', 'B'), snap)
    expect(r.route).toBe('band')
    // label 不入带推导（带=卡 y 区间派生）→骨架/锚不变；两拐 r=3（收缩链
    // 第二档——桩 10 钳制值 5 之上）
    expect(r.d).toBe('M 196 172 L 196 179 Q 196 182 199 182 L 211 182 Q 214 182 214 185 L 214 192')
  })
})

describe('F-LINEAGE-02 车道（走廊=字典序基道环形探测）', () => {
  it('laneIndex：乱序输入 → 字典序位次（确定性沿承）', () => {
    const all = ['e2', 'e0', 'e3', 'e1']
    expect(all.map((id) => laneIndex(id, all))).toEqual([2, 0, 3, 1])
  })

  it('routeAll 3 边同端点（带封闭几何）→ 基道=rank%4 各占道 0/1/2（同锚散开：同侧 3 序内吸收）', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(200, 100, CARD_W, CARD_H)],
        ['M', rect(96, 180, 600, 8)],
        ['B', rect(100, 196, CARD_W, CARD_H)]
      ])
    })
    const paths = routeAll(['e0', 'e1', 'e2'].map((id) => geom(id, 'A', 'B')), snap)
    expect(paths.map((p) => p.route)).toEqual(['corridor', 'corridor', 'corridor'])
    expect(paths.map((p) => p.lane)).toEqual([0, 1, 2])
    // e0 锚=源右 ¾ (328,154)/目标右 ¼ (228,214)——首边原锚（散开注册基线）
    expect(paths[0]!.d.startsWith('M 328 154 L 746 154')).toBe(true)
  })

  it('[回炉 R2] 3 平行边锚位互异（锁死 commit 原锚 aliasing：生效锚漏记→后边重取同槽相撞）', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(200, 100, CARD_W, CARD_H)],
        ['M', rect(96, 180, 600, 8)],
        ['B', rect(100, 196, CARD_W, CARD_H)]
      ])
    })
    const paths = routeAll(['e0', 'e1', 'e2'].map((id) => geom(id, 'A', 'B')), snap)
    expect(paths.map((p) => p.route)).toEqual(['corridor', 'corridor', 'corridor'])
    // 源端锚（d 首点）两两互异：e0=右¾ (328,154)/e1=右¼ (328,118)/e2=右½ (328,136)
    // ——aliasing 形态=e1 与 e2 同落 (328,118)（e2 pick 见 r0 未记→重取）
    const firstPts = paths.map((p) => {
      const m = /M (\S+) (\S+)/.exec(p.d)
      return m === null ? '' : `${m[1]} ${m[2]}`
    })
    expect(new Set(firstPts).size).toBe(3)
    expect(firstPts[0]).toBe('328 154')
    expect(firstPts[1]).toBe('328 118')
    expect(firstPts[2]).toBe('328 136')
  })

  it('[回炉 R9-W2] fallback 锚 commit 回归锁：容量外边落 fallback 后生效锚仍落记（后边不重取同锚相撞）', () => {
    // 紧行几何（行隙 4≤2·PAD→带封闭）+O 压底锚出桩横道（y=182 穿 O 膨胀
    // [246,314]×[172,192]）→e3/e4 落 fallback；e3 生效锚=底 ½ (264,172)
    // commit 落记 → e4 取底 ¼ (232,172) 不重取（撤 commit 则 e4 同落 264 红）
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(200, 100, CARD_W, CARD_H)],
        ['B', rect(100, 180, CARD_W, CARD_H)],
        ['O', rect(250, 176, 60, 8)]
      ])
    })
    const onWarn = vi.fn()
    const paths = routeAll(['e0', 'e1', 'e2', 'e3', 'e4'].map((id) => geom(id, 'A', 'B')), snap, onWarn)
    expect(paths.map((p) => p.route)).toEqual(['corridor', 'corridor', 'corridor', 'fallback', 'fallback'])
    expect(paths.map((p) => p.lane)).toEqual([0, 1, 2, -1, -1])
    expect(onWarn).toHaveBeenCalledTimes(2)
    const firstPts = paths.map((p) => {
      const m = /M (\S+) (\S+)/.exec(p.d)
      return m === null ? '' : `${m[1]} ${m[2]}`
    })
    expect(firstPts[3]).toBe('264 172')
    expect(firstPts[4]).toBe('232 172')
    expect(new Set(firstPts).size).toBe(5)
  })

  it('[回炉 R3] 4 平行边：第 4 边散开至底锚→出桩沿生效边外法线（竖桩）——不横穿源卡落 corridor', () => {
    // 紧行几何（行隙 8px≤2·PAD→带封闭）：A(200,100)/B(100,180)——B 底带
    // 净空（y≥256）供底锚出桩横道
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(200, 100, CARD_W, CARD_H)],
        ['B', rect(100, 180, CARD_W, CARD_H)]
      ])
    })
    const paths = routeAll(['e0', 'e1', 'e2', 'e3'].map((id) => geom(id, 'A', 'B')), snap)
    expect(paths.map((p) => p.route)).toEqual(['corridor', 'corridor', 'corridor', 'corridor'])
    expect(paths.map((p) => p.lane)).toEqual([0, 1, 2, 3])
    // 前 3 边源锚=右侧三序 (328,154/118/136)；第 4 边=底 ½ (264,172)——
    // 出桩=外法线竖下 10px（(264,182) 后右转）非横向穿 A
    const firstPts = paths.map((p) => {
      const m = /M (\S+) (\S+)/.exec(p.d)
      return m === null ? '' : `${m[1]} ${m[2]}`
    })
    expect(new Set(firstPts).size).toBe(4)
    expect(firstPts[3]).toBe('264 172')
    // 第 4 边桩端拐=(264,182)（圆角化后=Q 控制点——骨架竖桩端）——外法线
    // 方向锁（横向出桩形态=拐在 (3xx,172) 即红）
    expect(paths[3]!.d).toContain('Q 264 182')
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
  it('via 折线构造：锚=端点卡主向定边（右 ½ 序）；route=manual-override+lane=−1；r=6 圆角 pass', () => {
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
    expect(r.lane).toBe(-1)
    // via[0]=(300,136)：dx=136>dy=0→横→右½ (228,136)；via 末同式 (228,336)；
    // 拐角 (300,136)/(300,336) r=6（段长 72/200 不钳）——不参与避让（穿卡
    // 警示归编辑器批渲染面）
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
  it('同输入 routeEdge 100 次输出全等+routeAll 单边一致', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(100, 100, CARD_W, CARD_H)],
        ['C', rect(240, 100, CARD_W, CARD_H)],
        ['B', rect(182, 192, CARD_W, CARD_H)]
      ]),
      labels: [rect(202, 173, 4, 4)],
      frames: [{ ...rect(90, 60, 600, 300), year: 2022 }]
    })
    const e = geom('e1', 'A', 'B')
    const first = routeEdge(e, snap)
    for (let i = 0; i < 100; i++) {
      expect(routeEdge(e, snap)).toEqual(first)
    }
    expect(routeAll([e], snap)).toEqual([first])
  })
})

describe('F-LINEAGE-02 [批3] band 终落锚散开（月标封堵首选 slot——INV-79 绕开非豁免）', () => {
  // 夹具手推：src A(100,100,128,72) 下行 tgt B(160,192,128,72)；行隙带
  // [172,192]（frame y=180 入带→s=9），带中心 y=182；A 底锚=投影 tc.x=224
  // →¾ 序 (196,172)；B 顶首选锚=投影 sc.x=164→¼ 序 (192,192)；月标形
  // label(113,181,77,8)（框左+12 宽 77——膨胀 [109,194]×[177,193]）封堵
  // 首选直落点 (192,182)；散开序 [0,1,2]→slot1 (224,192) 净空承接
  const spreadSnap = (): LayoutSnapshot =>
    makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(100, 100, CARD_W, CARD_H)],
        ['B', rect(160, 192, CARD_W, CARD_H)]
      ]),
      labels: [rect(113, 181, 77, 8)],
      frames: [{ ...rect(101, 180, 200, 300), year: 2022 }]
    })

  it('月标挡首选 slot→散开第二槽终落 band（骨架末段=slot1 锚+d 手推）', () => {
    const snap = spreadSnap()
    const obstacles = [...snap.cards.values(), ...snap.labels]
    const cards = [...snap.cards.values()]
    const band = bandSkeleton(snap.cards.get('A')!, snap.cards.get('B')!, true, snap, obstacles, cards, undefined, 'A', 'B')
    expect(band).not.toBeNull()
    // 终落锚=散开第二候选 slot1：手算 x=160+128×½=224（首选 x=192 被月标
    // 膨胀带 [109,194] 封堵）——骨架末点即生效锚点
    expect(band!.skel[band!.skel.length - 1]).toEqual({ x: 224, y: 192 })
    const r = routeEdge(geom('e1', 'A', 'B'), snap)
    expect(r.route).toBe('band')
    // d 手推：骨架 [(196,172),(196,182),(224,182),(224,192)]（零长顶点剔除）
    // ——两拐 r=min(6,10/2,28/2)=5：tIn/tOut=(196,177)/(201,182) 与
    // (219,182)/(224,187)
    expect(r.d).toBe('M 196 172 L 196 177 Q 196 182 201 182 L 219 182 Q 224 182 224 187 L 224 192')
  })

  it('全槽被挡（同边三顶槽全被月标形封堵）→bandSkeleton null+routeEdge 降级 corridor', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(100, 100, CARD_W, CARD_H)],
        ['B', rect(160, 192, CARD_W, CARD_H)]
      ]),
      // 构造面=同边三挡（B1 收窄后候选域=同边三槽）：宽 140 月标横贯 B 三
      // 顶槽 x（192/224/256）——膨胀 [146,294]×[177,193] 封死全部散开候选
      labels: [rect(150, 181, 140, 8)],
      frames: [{ ...rect(101, 180, 200, 300), year: 2022 }]
    })
    const obstacles = [...snap.cards.values(), ...snap.labels]
    const cards = [...snap.cards.values()]
    expect(bandSkeleton(snap.cards.get('A')!, snap.cards.get('B')!, true, snap, obstacles, cards, undefined, 'A', 'B')).toBeNull()
    // 全候选失败→降级 corridor（lane0=752——右缘走廊承接；邻边逃逸挂账后续票）
    const r = routeEdge(geom('e1', 'A', 'B'), snap)
    expect(r.route).toBe('corridor')
    expect(r.lane).toBe(0)
  })

  it('散开锚 picks 落记=生效锚（tgt 项=散开 side/slot 非首选——R2 仅胜出态）', () => {
    const snap = spreadSnap()
    const obstacles = [...snap.cards.values(), ...snap.labels]
    const cards = [...snap.cards.values()]
    const band = bandSkeleton(snap.cards.get('A')!, snap.cards.get('B')!, true, snap, obstacles, cards, new AnchorUse(), 'A', 'B')
    expect(band).not.toBeNull()
    // picks tgt 项=生效散开锚 ('top',1)——非首选 ('top',0)（失败尝试不落记）；
    // src 项=常规生效锚（散开只施于终落端）
    expect(band!.picks).toEqual([
      ['A', 'bottom', 2],
      ['B', 'top', 1]
    ])
  })

  it('[回炉 B2] 散开候选避开已 commit 槽（占用预检）：slot1 被占+slot0 月标挡→散至 slot2', () => {
    const snap = spreadSnap()
    const obstacles = [...snap.cards.values(), ...snap.labels]
    const cards = [...snap.cards.values()]
    // use 预 commit (tgt,'top',1)——slot1 几何净空但占用域被占（模拟多边
    // 同目标先到边）；候选序 [0(几何挡),1(占用),2(净空)]→终落 slot2
    const use = new AnchorUse()
    use.commit('B', 'top', 1)
    const band = bandSkeleton(snap.cards.get('A')!, snap.cards.get('B')!, true, snap, obstacles, cards, use, 'A', 'B')
    expect(band).not.toBeNull()
    // 终落锚=slot2：手算 x=160+128×¾=256（无占用预检时落 slot1 x=224 即红）
    expect(band!.skel[band!.skel.length - 1]).toEqual({ x: 256, y: 192 })
    expect(band!.picks).toEqual([
      ['A', 'bottom', 2],
      ['B', 'top', 2]
    ])
  })
})

describe('F-ROUTE-02 [U3] chain 接入对照（旧/新六组+挂账②）', () => {
  // 接入事实（手推前提）：routeOne 循环→slotAssign（含残余子 pass）→回写
  // skel→finish。结构性边界（gap-cells/zInterior N-3 亲核）：band 边竖直段
  // （出桩/跨带下降/终落）对行隙单元恒部分覆盖（bandY=单元中点>j1）→豁免
  // 原位零宽消费；band 跑段 y=bandY 不落任何卡行内（bandsOf 并吞）→残余域
  // 等价旧行为。可行消费面=direct 全跨度竖段×行隙单元+h-slip 等高段×列缝
  // 单元（端卡自构成单元——第三方入条带即毁单元，故消费边数≤同边三锚）。

  it('① 带内双下降共道→槽位化：同列上下两 direct 边穿同一行隙单元→竖直段 x 电平互异且∈分点集+d 手推', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(100, 100, CARD_W, CARD_H)],
        ['B', rect(100, 300, CARD_W, CARD_H)]
      ])
    })
    const paths = routeAll([geom('e1', 'A', 'B'), geom('e2', 'A', 'B')], snap)
    expect(paths.map((p) => p.route)).toEqual(['direct', 'direct'])
    // 行隙单元 [100,228]×[172,300]（A/B 对，W=128→L=120→n=5 分点
    // 104+20k=124/144/164/184/204，j1=177/j2=295）：
    // e1（首边）：锚散开前 ½/½ 锚 x=164——ideal=164 恰中槽 idx2（Δ=0<1）
    // →retain 豁免保留占用（几何不动，d=旧形态）
    expect(paths[0]!.d).toBe('M 164 172 L 164 300')
    // e2：散开 ¾/¾ 锚 x=196——ideal=196 距槽序 |204−196|=8(idx4)<|184−196|=12
    // (idx3)→落 idx4=204：Z 链 (196,177)(204,177)(204,295)(196,295)（jog
    // 距 A 膨胀底 176/顶 B 膨胀 296 各 1px 净空）；拐角 r=min(6,5/2,8/2)=2.5/
    // min(6,4,118/2)=4/4/2.5——d 手推
    expect(paths[1]!.pts).toEqual([
      { x: 196, y: 172 },
      { x: 196, y: 177 },
      { x: 204, y: 177 },
      { x: 204, y: 295 },
      { x: 196, y: 295 },
      { x: 196, y: 300 }
    ])
    expect(paths[1]!.d).toBe(
      'M 196 172 L 196 174.5 Q 196 177 198.5 177 L 200 177 Q 204 177 204 181 L 204 291 Q 204 295 200 295 L 198.5 295 Q 196 295 196 297.5 L 196 300'
    )
    // INV-1XX 单元内断言：两竖直段 x 电平互异且均∈分点集 {124,144,164,184,204}
    const lv1 = paths[0]!.pts[0]!.x
    const lv2 = paths[1]!.pts[2]!.x
    expect([124, 144, 164, 184, 204]).toContain(lv1)
    expect([124, 144, 164, 184, 204]).toContain(lv2)
    expect(lv1).not.toBe(lv2)
  })

  it('② 开阔域共行→残余=旧行为等价：两 band 边同 bandY 跑段无单元消费→偏移 ∓s/2（s=6→∓3）', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(100, 100, CARD_W, CARD_H)],
        ['C', rect(240, 100, CARD_W, CARD_H)],
        ['B', rect(182, 192, CARD_W, CARD_H)]
      ]),
      frames: [{ ...rect(90, 60, 600, 300), year: 2022 }]
    })
    const paths = routeAll([geom('e1', 'A', 'B'), geom('e2', 'A', 'B')], snap)
    expect(paths.map((p) => p.route)).toEqual(['band', 'band'])
    // 两边骨架：e1=[(196,172),(196,182),(196,182),(214,182),(214,192)]（锚 ¾
    // ¾——A 底 ¾=196、B 顶 ¼=214）；e2 锚散开后=[(132,172),…,(246,182),
    // (246,192)]（A 底 ¼=132、B 顶 ½=246）。行隙单元 (A,B)/(C,B) 竖直段均
    // 部分覆盖（豁免零宽）→跑段全量入残余域：同 bandY=182 簇 k=2→旧式
    // (i−0.5)·6=∓3→179/185（与旧 applyBandLanes 输出全等——等价对照本体）
    // e1 拐角 r=min(6,7/2,18/2)=3.5 与 min(6,9,13/2)=6；e2 r=6 与
    // min(6,57,7/2)=3.5——d 手推
    expect(paths[0]!.d).toBe('M 196 172 L 196 175.5 Q 196 179 199.5 179 L 208 179 Q 214 179 214 185 L 214 192')
    expect(paths[1]!.d).toBe('M 132 172 L 132 179 Q 132 185 138 185 L 242.5 185 Q 246 185 246 188.5 L 246 192')
  })

  it('③a 残余域容量钳：窄框间带 cap=1→maxOff=0→两成员电平重合于 bandY（旧语义）', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(100, 100, CARD_W, CARD_H)],
        ['B', rect(160, 192, CARD_W, CARD_H)]
      ]),
      // frame y=180 落带 [172,192] 内→s=9；h=20→cap=⌊12/9⌋=1
      frames: [{ ...rect(101, 180, 200, 300), year: 2022 }]
    })
    const paths = routeAll([geom('e1', 'A', 'B'), geom('e2', 'A', 'B')], snap)
    expect(paths.map((p) => p.route)).toEqual(['band', 'band'])
    // e1 骨架 [(196,172),(196,182),(196,182),(192,182),(192,192)]、e2
    // [(132,172),(132,182),(132,182),(224,182),(224,192)]（锚散开 ¼/½ 同
    // e2=②）：残余簇 k=2 但 maxOff=((1−1)/2)·9=0→off 钳 0 跳过→两边水平
    // 跑段同留 y=182（重合=旧 applyBandLanes cap 钳语义）。e1 拐角
    // r=min(6,5,4/2)=2 与 2（末拐 tIn=(194,182)=前拐 tOut→零长 L 略）；
    // e2 r=min(6,10/2,46)=5 与 min(6,46,10/2)=5——d 手推
    expect(paths[0]!.d).toBe('M 196 172 L 196 180 Q 196 182 194 182 Q 192 182 192 184 L 192 192')
    expect(paths[1]!.d).toBe('M 132 172 L 132 177 Q 132 182 137 182 L 219 182 Q 224 182 224 187 L 224 192')
    // 重合断言：两边跑段电平全等（钳位证据——④ 的 ±4.5 反锚）
    const lv = (p: { pts: Array<{ x: number; y: number }> }): number => p.pts[2]!.y
    expect(lv(paths[0]!)).toBe(182)
    expect(lv(paths[1]!)).toBe(182)
  })

  it('③b 槽域穷尽豁免：两槽列缝单元×三消费边→第 3 边 L3 豁免落 ideal 未偏移', () => {
    // 矮卡对（h=26）：列缝单元 [228,400]×[100,126]（W=172/H=26→L=18→n=2
    // 分点 110/116，jog 区 x[233,395]）；卡等高→h-slip 锚 y=106.5/113/119.5
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(100, 100, CARD_W, 26)],
        ['B', rect(400, 100, CARD_W, 26)]
      ])
    })
    const paths = routeAll([geom('e1', 'A', 'B'), geom('e2', 'A', 'B'), geom('e3', 'A', 'B')], snap)
    expect(paths.map((p) => p.route)).toEqual(['h-slip', 'h-slip', 'h-slip'])
    // e1（½/½ 锚 y=113）：|113−110|=3=|113−116| tie→小索引 idx0=110 落位
    // （Δ=3≥1→Z）；e2（¾/¾ 锚 y=119.5）：|119.5−116|=3.5<9.5→idx1=116 落位；
    // e3（¼/¼ 锚 y=106.5）：两槽全占→L2 同带无邻单元→L3 豁免→几何不动
    // （ideal 未偏移）。拐角 r=min(6,5/2,3/2)=1.5<2→全尖角——d 手推
    expect(paths[0]!.d).toBe('M 228 113 L 233 113 L 233 110 L 395 110 L 395 113 L 400 113')
    expect(paths[1]!.d).toBe('M 228 119.5 L 233 119.5 L 233 116 L 395 116 L 395 119.5 L 400 119.5')
    expect(paths[2]!.d).toBe('M 228 106.5 L 400 106.5')
    expect(paths[2]!.pts).toEqual([
      { x: 228, y: 106.5 },
      { x: 400, y: 106.5 }
    ])
  })

  it('④ 框间带 s=9 残余沿旧：带内含 frame 边界→k=2 偏移 ±4.5（cap=2 不钳）', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(100, 100, CARD_W, CARD_H)],
        ['B', rect(160, 198, CARD_W, CARD_H)]
      ]),
      // frame y=180 落带 [172,198] 内→s=9；h=26→cap=⌊18/9⌋=2→maxOff=4.5
      frames: [{ ...rect(101, 180, 200, 300), year: 2022 }]
    })
    const paths = routeAll([geom('e1', 'A', 'B'), geom('e2', 'A', 'B')], snap)
    expect(paths.map((p) => p.route)).toEqual(['band', 'band'])
    // e1 骨架 [(196,172),(196,182),(196,185),(192,185),(192,192)]（带中心
    // 185）、e2 [(132,172),(132,182),(132,185),(224,185),(224,192)]：残余簇
    // k=2→(i−0.5)·9=∓4.5（<maxOff=4.5 恰不钳）→180.5/189.5（旧式全等）。
    // e1 折返微段 1.5px（182→180.5 上行）r=0.75<2 尖角、末拐 r=2；e2 共线
    // 剔除后 r=6 与 min(6,46,8.5/2)=4.25——d 手推（fmt 0.1 步进：219.75→
    // 219.8、193.75→193.8）
    expect(paths[0]!.d).toBe('M 196 172 L 196 182 L 196 180.5 L 194 180.5 Q 192 180.5 192 182.5 L 192 198')
    expect(paths[1]!.d).toBe('M 132 172 L 132 183.5 Q 132 189.5 138 189.5 L 219.8 189.5 Q 224 189.5 224 193.8 L 224 198')
  })

  it('⑤ corridor 共道不迁移（负锚）：两 corridor 边同 lane→d 与接入前形态全等（无 Z/无槽迁移）', () => {
    // V 堵 lane1-3 竖段扫掠（膨胀 [757,785]×[176,204] 盖 x=761/770/779 三道、
    // lane0 扫掠 [748,756] 净空）→laneIndex 种子 0/1 的两边均探测收敛 lane0
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(100, 100, CARD_W, CARD_H)],
        ['X', rect(90, 176, 600, 120)],
        ['B', rect(100, 300, CARD_W, CARD_H)],
        ['V', rect(761, 180, 20, 20)]
      ])
    })
    const paths = routeAll([geom('e1', 'A', 'B'), geom('e2', 'A', 'B')], snap)
    expect(paths.map((p) => p.route)).toEqual(['corridor', 'corridor'])
    expect(paths.map((p) => p.lane)).toEqual([0, 0])
    // e1 锚=源右¾ (228,154)/目标右¼ (228,318)；e2 散开=源右¼ (228,118)/
    // 目标右½ (228,336)——corridor 态不入槽（ROUTE_ELIGIBLE 域外）→水平臂
    // y 电平=锚 y 原位（无 Z 形中段/无槽位电平迁移）；拐角 r=6——d 手推
    expect(paths[0]!.d).toBe('M 228 154 L 746 154 Q 752 154 752 160 L 752 312 Q 752 318 746 318 L 228 318')
    expect(paths[1]!.d).toBe('M 228 118 L 746 118 Q 752 118 752 124 L 752 330 Q 752 336 746 336 L 228 336')
    // pts=骨架原样（6 顶点、无槽位插入顶点）
    expect(paths[0]!.pts).toHaveLength(6)
    expect(paths[1]!.pts).toHaveLength(6)
  })

  it('⑥ 混合组：同域槽电平（direct Z 落槽）+残余电平（band 簇偏移）并存（一 routeAll 内双机制）', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(100, 100, CARD_W, CARD_H)],
        ['C', rect(240, 100, CARD_W, CARD_H)],
        ['B', rect(182, 192, CARD_W, CARD_H)],
        ['D1', rect(600, 100, CARD_W, CARD_H)],
        ['D2', rect(600, 300, CARD_W, CARD_H)]
      ]),
      frames: [{ ...rect(90, 60, 600, 300), year: 2022 }]
    })
    const paths = routeAll(
      [geom('e1', 'A', 'B'), geom('e2', 'A', 'B'), geom('e3', 'D1', 'D2'), geom('e4', 'D1', 'D2')],
      snap
    )
    expect(paths.map((p) => p.route)).toEqual(['band', 'band', 'direct', 'direct'])
    // e1/e2=② 同款（残余 ∓3→179/185；D1/D2 卡 y 区间并入 A/C 与 B 同带表
    // 不改 A→B 带域）；e3=direct x=664 恰中行隙单元 (D1,D2) [600,728]×
    // [172,300] 分点 idx2（604+20k=624/644/664/684/704）→retain；e4 散开
    // ¾/¾ x=696→|704−696|=8<|684−696|=12→落 704（=① e2 同形平移 +500）——
    // 槽电平 704 与残余电平 179/185 并存（双机制一快照内互不侵扰）
    expect(paths[0]!.d).toBe('M 196 172 L 196 175.5 Q 196 179 199.5 179 L 208 179 Q 214 179 214 185 L 214 192')
    expect(paths[1]!.d).toBe('M 132 172 L 132 179 Q 132 185 138 185 L 242.5 185 Q 246 185 246 188.5 L 246 192')
    expect(paths[2]!.d).toBe('M 664 172 L 664 300')
    expect(paths[3]!.d).toBe(
      'M 696 172 L 696 174.5 Q 696 177 698.5 177 L 700 177 Q 704 177 704 181 L 704 291 Q 704 295 700 295 L 698.5 295 Q 696 295 696 297.5 L 696 300'
    )
  })

  it('⑦ 挂账② h-slip 等高直连段正向入槽：穿列缝单元→Z 形入槽（d 含槽电平+两 jog）', () => {
    // A/B 同行等高（h=72）→h-slip 锚 y=118/136/154；列缝单元 [228,400]×
    // [100,172]（W=172/H=72→L=64→n=5 分点 104+64/6·k=114.7/125.3/136/
    // 146.7/157.3，jog 区 x[233,395]；A 膨胀 x≤232/B 膨胀 x≥396→jog 各
    // 1px 净空）
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(100, 100, CARD_W, CARD_H)],
        ['B', rect(400, 100, CARD_W, CARD_H)]
      ])
    })
    const paths = routeAll([geom('e1', 'A', 'B'), geom('e2', 'A', 'B')], snap)
    expect(paths.map((p) => p.route)).toEqual(['h-slip', 'h-slip'])
    // e1（½/½ 锚 y=136）：ideal=136 恰中槽 idx2（Δ=0<1）→retain 豁免
    expect(paths[0]!.d).toBe('M 228 136 L 400 136')
    // e2（散开 ¾/¾ 锚 y=154）：|157.3−154|=3.3<|146.7−154|=7.3→落 157.3：
    // Z 链 (233,154)(233,157.3)(395,157.3)(395,154)——d 含 y=157.3 槽电平
    // 长 162px+两 jog（x=233/395 各 3.3px）；拐角 r=min(6,5/2,3.3/2)=1.65<2
    // →全尖角——d 手推
    expect(paths[1]!.d).toBe('M 228 154 L 233 154 L 233 157.3 L 395 157.3 L 395 154 L 400 154')
  })
})

