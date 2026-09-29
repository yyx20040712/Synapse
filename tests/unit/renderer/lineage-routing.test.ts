/**
 * [T3-P7A] lineage-routing 纯函数 12 例——D 表 §5.3 全量
 * （docs/design/2026-09-27_t3p7-line-connection-design-final.md §5：
 * 用例 2 断言 route='detour'（D-3）为主控终裁修订点；PAD 语义= d≤4 含边界
 * （D-6）；车道容量 4 道+第 5 条 fallback（D-5）；确定性 100 次全等
 * （§5.2 无随机/Date/三角函数））。
 * [T3-P7B/D-P7B-7] resolveLabelEntry 直测 it 7 随函数裁撤删除（P7A 备案
 * 「P7b 定去留」主控终裁：D-4 让行机制裁撤后遗迹零生产调用，死代码即删）。
 * [F-ROUTE-01]（2026-09-29 用户裁决：线从文献块之间的空隙穿过，不从大
 * 右侧绕）新增 gap 空隙通道 describe 5 it+既有行为变更断言 7 处（route
 * 值 arc/detour/detour-bottom/fallback→gap——新链序下几何可穿的边获 gap，
 * 逐用例注释标注）——计数=主 describe 15+gap 5+palette 1=文件 21。
 * 另附 lineage-palette 数据常量冒烟（D-17 hex=用户数据面——P7b 消费本票
 * 入库，值形状先锁防漂移）。always-active 裸 describe（K3）。
 */
import { describe, expect, it, vi } from 'vitest'
import type { EdgeGeomInput, LayoutSnapshot, Rect } from '../../../src/renderer/features/lineage/lineage-routing'
import {
  anchor,
  arcPath,
  checkArcEntry,
  checkSweepBand,
  checkVerticalBand,
  defaultCorridor,
  detourBottomPath,
  detourPath,
  laneIndex,
  routeAll,
  routeEdge,
  segHitsAny,
  verticalPath
} from '../../../src/renderer/features/lineage/lineage-routing'
import { DASH_ROT, PALETTE } from '../../../src/renderer/features/lineage/lineage-palette'

// ── 夹具工具（纯数据——contentW=800 ⇒ laneX(i)=800−58+10+9i=752+9i，D-5）──

function rect(x: number, y: number, w: number, h: number): Rect {
  return { x, y, w, h }
}

function makeSnap(partial: Partial<LayoutSnapshot> = {}): LayoutSnapshot {
  const contentW = partial.contentW ?? 800
  return {
    cards: partial.cards ?? new Map<string, Rect>(),
    labels: partial.labels ?? [],
    frames: partial.frames ?? [],
    contentW,
    corridor: partial.corridor ?? defaultCorridor(contentW)
  }
}

const CARD_W = 104
const CARD_H = 52

function geom(id: string, from: string, to: string, kind: EdgeGeomInput['kind']): EdgeGeomInput {
  return { edgeId: id, sourceId: from, targetId: to, kind }
}

/** 同年双卡快照：A=源（100,100），B=目标（100,300），各驻同年 2022 月框 */
function sameYearSnap(extra: { obstacles?: Array<[string, Rect]>; labels?: Rect[] } = {}): LayoutSnapshot {
  return makeSnap({
    cards: new Map<string, Rect>([
      ['A', rect(100, 100, CARD_W, CARD_H)],
      ['B', rect(100, 300, CARD_W, CARD_H)],
      ...(extra.obstacles ?? [])
    ]),
    labels: extra.labels ?? [],
    frames: [
      { ...rect(90, 60, 600, 150), year: 2022 },
      { ...rect(90, 260, 600, 150), year: 2022 }
    ]
  })
}

describe('T3-P7A/P7B lineage-routing 15 例（D 表 §5.3 全量+回炉 1/2 补——k1 计数口径：12 表+anchor/arc 2+回炉新增 15/16+改写 7/9=16 it；[D-P7B-7] resolveLabelEntry it 7 随函数裁撤=15，palette 冒烟另 describe 1 例=文件 16）', () => {
  it('1 verticalPath：dy=78 控制柄 k=39；贝塞尔中点落入空隙带（dy/2 对称中点）', () => {
    const s = { x: 100, y: 100 }
    const t = { x: 140, y: 178 }
    // k=clamp(78/2,12,80)=39——控制点 (100,139)(140,139) 逐字锁
    expect(verticalPath(s, t)).toBe('M 100 100 C 100 139 140 139 140 178')
    // 三次贝塞尔 B(0.5)=(P0+3P1+3P2+P3)/8——y=(100+3·139+3·139+178)/8=139，
    // 落入框间空隙带 [126,152]（dy 中点±13）
    const midY = (100 + 3 * 139 + 3 * 139 + 178) / 8
    expect(midY).toBeGreaterThanOrEqual(126)
    expect(midY).toBeLessThanOrEqual(152)
    // clamp 边界：dy=400→k=80（上钳）；dy=10→k=12（下钳）
    expect(verticalPath({ x: 0, y: 0 }, { x: 0, y: 400 })).toBe('M 0 0 C 0 80 0 320 0 400')
    expect(verticalPath({ x: 0, y: 0 }, { x: 0, y: 10 })).toBe('M 0 0 C 0 12 0 -2 0 10')
  })

  it('2 dy≤0 向上边（同年）→ route=gap 竖穿空隙（[F-ROUTE-01 行为变更]原 detour 走右走廊——D-3 直进语义由 gap 竖穿承接）', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(100, 200, CARD_W, CARD_H)],
        ['B', rect(100, 20, CARD_W, CARD_H)]
      ]),
      frames: [
        { ...rect(90, 180, 600, 120), year: 2022 },
        { ...rect(90, 0, 600, 120), year: 2022 }
      ]
    })
    const r = routeEdge(geom('e1', 'A', 'B', 'tree'), snap)
    expect(r.route).toBe('gap')
    // [F-ROUTE-01 回炉 R1 k1-B1 修正]之间带=[B 底 72, A 顶 200]：候选 313
    //（框1 底 300+13）带外废；候选 150=框0 底 120 与框1 顶 180 中线在带内
    //→源**顶**锚 (152,200) 竖上至 150→横穿（同 x 零长）→竖上进目标底
    //(152,72)——同列向上边=直竖线（v1 源底锚下绕 313 再穿源上行的缺陷形态
    //被之间带规则消灭）
    expect(r.d).toBe('M 152 200 L 152 150 L 152 150 L 152 72')
  })

  it('3 checkVerticalBand：带内障碍 true／移出 false／PAD=4 边界（4 含边界命中、4.1 出界、3.9 命中——D-6）', () => {
    const s = { x: 100, y: 100 }
    const t = { x: 100, y: 200 }
    // 带内且距曲线 0（相交）→ true
    expect(checkVerticalBand(s, t, [rect(98, 140, 4, 20)])).toBe(true)
    // 移出带（水平距 10）→ false
    expect(checkVerticalBand(s, t, [rect(110, 140, 4, 20)])).toBe(false)
    // 距线 x=100 恰 4（贴边）→ 膨胀后触界=命中（含边界）
    expect(checkVerticalBand(s, t, [rect(104, 140, 4, 20)])).toBe(true)
    // 距 4.1 → 出界
    expect(checkVerticalBand(s, t, [rect(104.1, 140, 4, 20)])).toBe(false)
    // 距 3.9 → 命中
    expect(checkVerticalBand(s, t, [rect(103.9, 140, 4, 20)])).toBe(true)
  })

  it('4 checkArcEntry：源右侧同行紧邻卡挡侧出口 → true 且 routeEdge 降 detour-bottom', () => {
    const s = { x: 204, y: 126 }
    // 同行右邻：y 覆盖 126、x 段 [204,752] 内 → 入口横道被挡
    expect(checkArcEntry(s, 752, [rect(240, 100, CARD_W, CARD_H)])).toBe(true)
    const snap = sameYearSnap({ obstacles: [['C', rect(240, 100, CARD_W, CARD_H)]] })
    // [F-ROUTE-01 行为变更]原 detour-bottom（gapY 235 绕车道 752 进目标右
    // 锚）→gap 层同 gapY 竖落：C 挡的是源右 arc 入口（前半直测面不变），
    // gap 三段全在 x=152 竖线对 C（x≥236）完全免疫
    const r = routeEdge(geom('e1', 'A', 'B', 'ref'), snap)
    expect(r.route).toBe('gap')
    // 空隙穿：s0=(152,152)→候选 235（源框底 210 与下框顶 260 中线）→横穿
    //（同 x 零长）→竖下进目标顶 (152,300) 直角折线逐字锁
    expect(r.d).toBe('M 152 152 L 152 235 L 152 235 L 152 300')
  })

  it('5 detourBottomPath：源月框为年内末框（无同年下框）gapY=框底+13（D-9），横道 y 精确等于 gapY', () => {
    const src = rect(100, 100, CARD_W, CARD_H)
    const t = { x: 204, y: 326 }
    const d = detourBottomPath(src, t, 752, 183)
    expect(d).toBe('M 152 152 L 152 183 L 752 183 L 752 326 L 204 326')
    // routeEdge 场景：A/B 同驻年内唯一框（=A 驻年内末框，无同年下框）→
    // gapY=框底 60+320=380 再 +13=393（D-9 末框分支）；C 挡入口触发底部出
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', src],
        ['B', rect(100, 300, CARD_W, CARD_H)],
        ['C', rect(240, 100, CARD_W, CARD_H)]
      ]),
      frames: [{ ...rect(90, 60, 600, 320), year: 2022 }]
    })
    // [F-ROUTE-01 回炉 R1 勘正]v2 下本场景回归 detour-bottom：A/B 同列（x 带
    // 重叠）gap-h 禁走；唯一候选 393 在之间带 [152,300] 外（两卡之下）——
    // gap-v 正确拒绝（v1 的「源底出直落 393 再上行进目标底」形态穿源废案）
    const r = routeEdge(geom('e1', 'A', 'B', 'ref'), snap)
    expect(r.route).toBe('detour-bottom')
    expect(r.d).toBe('M 152 152 L 152 393 L 752 393 L 752 326 L 204 326')
  })

  it('6 checkSweepBand：走廊竖段途标注 → true；车道 i+1 后 false（routeEdge lane=1 route=arc）', () => {
    const s = { x: 204, y: 126 }
    const t = { x: 204, y: 326 }
    // 标注横跨 lane0 x=752（膨胀带 [740,758]）
    const label = rect(744, 200, 10, 8)
    expect(checkSweepBand(s, t, 752, [label])).toBe(true)
    expect(checkSweepBand(s, t, 761, [label])).toBe(false)
    const snap = sameYearSnap({ labels: [label] })
    // [F-ROUTE-01 行为变更]原 arc lane=1（标注压 lane0 扫掠升级车道）→
    // gap 层 x=152 空隙竖穿对右走廊标注免疫——车道升级行为由 F-ROUTE-01
    // describe T5（gap 候选耗尽+走廊）承载
    const r = routeEdge(geom('e1', 'A', 'B', 'ref'), snap)
    expect(r.route).toBe('gap')
    expect(r.lane).toBe(-1)
  })

  it('15 回程恒检（回炉 1 d1-B1）双相位（回炉 2 ⑤ d1-N3 补正面）：部分挡→车道 1 探测成功 arc；全挡→fallback', () => {
    // 正相位（回卷/升级正面证据）：走廊竖条只挡道 0 扫掠（x 膨胀带
    // [745,760] 含 lane0=752 不含 lane1=761；y 带 [176,224] 不触入口 y=126
    // 与回程 y=326——纯 C3 面）→道 0 升级道 1 成功
    const snapPos = sameYearSnap({ obstacles: [['V0', rect(749, 180, 7, 40)]] })
    const pos = routeEdge(geom('e1', 'A', 'B', 'ref'), snapPos)
    // [F-ROUTE-01 行为变更]原 arc lane=1（V0 只挡 lane0 扫掠）→gap 层 x=152
    // 空隙竖穿对走廊竖条免疫（V0 x∈[745,760]）
    expect(pos.route).toBe('gap')
    expect(pos.lane).toBe(-1)
    // 负相位（[F-ROUTE-01 行为变更]原 fallback——X 横跨卡全道挡死回程）：
    // gap 层 x=152 空隙竖穿不经右走廊回程——X 只挡走廊不挡空隙通道；
    // fallback+onWarn 触发面由 it 16（出段穿 D+C2.5 车道检）承载
    const snapNeg = sameYearSnap({ obstacles: [['X', rect(240, 300, 500, 52)]] })
    const onWarn = vi.fn()
    const neg = routeEdge(geom('e1', 'A', 'B', 'ref'), snapNeg, onWarn)
    expect(neg.route).toBe('gap')
    expect(onWarn).not.toHaveBeenCalled()
  })

  it('16 C2.5 底部出双段检测（回炉 1 B-2）：源卡非末行竖段穿同列下方卡→bottomOut 不可行→fallback', () => {
    // [F-ROUTE-01 回炉 R1]B 同列化（原 x=400 错列会被 gap-h 直线合法直穿）：
    // 单月框两行 A 上排（C 挡其右侧入口）+D 同列下排——竖段 (152,152)→gapY 穿 D；
    // A/B 同列 gap-h 禁走+候选 573（框底 560+13）在之间带 [552?]=带外——
    // gap 层全废落走廊流，C2.5 拦底部出→fallback
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(100, 100, CARD_W, CARD_H)],
        ['B', rect(100, 500, CARD_W, CARD_H)],
        ['C', rect(240, 100, CARD_W, CARD_H)],
        ['D', rect(100, 200, CARD_W, CARD_H)]
      ]),
      frames: [{ ...rect(90, 60, 600, 500), year: 2022 }]
    })
    const onWarn = vi.fn()
    const r = routeEdge(geom('e1', 'A', 'B', 'ref'), snap, onWarn)
    expect(r.route).toBe('fallback')
    expect(onWarn).toHaveBeenCalledTimes(1)
  })

  it('8 laneIndex：乱序输入 → 输出与字典序排序位次一致（确定性）', () => {
    const all = ['e2', 'e0', 'e3', 'e1']
    expect(all.map((id) => laneIndex(id, all))).toEqual([2, 0, 3, 1])
    expect(laneIndex('a', ['a', 'b'])).toBe(0)
    expect(laneIndex('b', ['a', 'b'])).toBe(1)
  })

  it('9 routeAll 车道循环占道（回炉 1 W3）：baseLane=rank%4——5 条干净边第 5 条循环回道 0；四道全被检测占用才 fallback+onWarn', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(100, 100, CARD_W, CARD_H)],
        ['B', rect(100, 300, CARD_W, CARD_H)],
        ['C', rect(100, 600, CARD_W, CARD_H)],
        ['D', rect(100, 800, CARD_W, CARD_H)],
        ['X', rect(240, 800, 500, 52)]
      ]),
      frames: [{ ...rect(90, 60, 600, 900), year: 2022 }]
    })
    // 相位一（循环占道锁）：5 条干净 A→B 边——e4 baseLane=4%4=0 回道 0
    //（旧 rank≥4 直落 fallback 语义已废——>4 边不堆 fallback）
    const clean = ['e0', 'e1', 'e2', 'e3', 'e4'].map((id) => geom(id, 'A', 'B', 'ref'))
    const p1 = routeAll(clean, snap)
    expect(p1.map((p) => p.route)).toEqual(['arc', 'arc', 'arc', 'arc', 'arc'])
    expect(p1.map((p) => p.lane)).toEqual([0, 1, 2, 3, 0])
    // 相位二（检测占用面）：e0..e3=A→B 干净占道；e4=C→D 回程横道被横跨卡 X 全道挡死
    const edges = ['e0', 'e1', 'e2', 'e3', 'e4'].map((id) =>
      geom(id, id === 'e4' ? 'C' : 'A', id === 'e4' ? 'D' : 'B', 'ref')
    )
    const onWarn = vi.fn()
    const paths = routeAll(edges, snap, onWarn)
    const by = (id: string) => paths.find((p) => p.edgeId === id)!
    expect([by('e0'), by('e1'), by('e2'), by('e3')].map((p) => p.lane)).toEqual([0, 1, 2, 3])
    // [F-ROUTE-01 回炉 R1 勘正]e4=C→D：C/D 同列 gap-h 禁走；唯一候选 973
    //（单框底 960+13）在之间带 [652,800] 外——gap 层正确拒绝（v1 直落 973
    // 再上行进 D 底形态穿源废案）→回程被 X 全道挡死落 fallback+onWarn——
    // 「四道全被检测占用才 fallback」语义（W3 回炉）由本相位继续承载
    expect(by('e4').route).toBe('fallback')
    expect(onWarn).toHaveBeenCalledTimes(1)
    // 相位三（回炉 2 ①车道回卷）：baseLane≥1 的边在低序道空闲时占低序道——
    // 6 边中 rank 5（baseLane=1）+走廊竖条障碍只挡道 1/2/3（x 膨胀带
    // [753,787] 不含 lane0=752）→探测序 1→2→3 挡尽→回卷道 0 成功
    const snap3 = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(100, 100, CARD_W, CARD_H)],
        ['B', rect(100, 300, CARD_W, CARD_H)],
        ['V', rect(757, 180, 26, 140)]
      ]),
      frames: [{ ...rect(90, 60, 600, 150), year: 2022 }, { ...rect(90, 260, 600, 150), year: 2022 }]
    })
    const six = ['e0', 'e1', 'e2', 'e3', 'e4', 'e5'].map((id) => geom(id, 'A', 'B', 'ref'))
    const p3 = routeAll(six, snap3)
    const fifth = p3.find((p) => p.edgeId === 'e5')!
    // [F-ROUTE-01 行为变更]原车道回卷 arc lane=0（V 只挡 lane1/2/3）→gap
    // 层先命中 x=152 空隙竖穿（候选 235 两框间隙）——车道回卷/升级行为
    // 由 F-ROUTE-01 describe T5 承载
    expect(fifth.route).toBe('gap')
    expect(fifth.lane).toBe(-1)
  })

  it('10 确定性：同输入 routeEdge 100 次输出全等（无随机/Date/三角函数）', () => {
    const snap = sameYearSnap({ obstacles: [['C', rect(240, 100, CARD_W, CARD_H)]], labels: [rect(744, 200, 10, 8)] })
    const e = geom('e1', 'A', 'B', 'ref')
    const first = routeEdge(e, snap)
    for (let i = 0; i < 100; i++) {
      expect(routeEdge(e, snap)).toEqual(first)
    }
    expect(routeAll([e], snap)).toEqual([first])
  })

  it('11 跨年边空隙直落（[F-ROUTE-01 行为变更]原 §2.3 直进绕行 detour）：跨年 ref 边 route=gap（年间隙候选）', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(100, 100, CARD_W, CARD_H)],
        ['B', rect(100, 400, CARD_W, CARD_H)]
      ]),
      frames: [
        { ...rect(90, 60, 600, 150), year: 2022 },
        { ...rect(90, 360, 600, 150), year: 2023 }
      ]
    })
    const r = routeEdge(geom('e1', 'A', 'B', 'ref'), snap)
    // [F-ROUTE-01 行为变更]原跨年直进 detour（右走廊绕）→gap 层年间隙候选
    //（2022 年内末框底 210+13=223，2023 框非同年不算相邻）命中——竖穿空隙
    // 不经车道；d 逐字锁（进段锚目标顶，同 x 零长横穿）
    expect(r.route).toBe('gap')
    expect(r.d).toBe('M 152 152 L 152 223 L 152 223 L 152 400')
  })

  it('12 segHitsAny PAD 语义钉死（D-6）：距障碍恰 4=命中（含边界）、4.1=出界、3.9=命中', () => {
    const seg = [{ x: 0, y: 100 }, { x: 100, y: 100 }]
    expect(segHitsAny(seg[0]!, seg[1]!, [rect(104, 92, 50, 16)])).toBe(true) // 水平距恰 4
    expect(segHitsAny(seg[0]!, seg[1]!, [rect(104.1, 92, 50, 16)])).toBe(false)
    expect(segHitsAny(seg[0]!, seg[1]!, [rect(103.9, 92, 50, 16)])).toBe(true)
    // 垂直距对称面：竖段 x=100 距障碍左缘恰 4
    const vseg = [{ x: 100, y: 100 }, { x: 100, y: 200 }]
    expect(segHitsAny(vseg[0]!, vseg[1]!, [rect(104, 140, 4, 20)])).toBe(true)
    expect(segHitsAny(vseg[0]!, vseg[1]!, [rect(104.1, 140, 4, 20)])).toBe(false)
  })

  it('13 anchor 三式（卡盒中点族——§2.1）', () => {
    const r = rect(100, 200, 104, 52)
    expect(anchor(r, 'top')).toEqual({ x: 152, y: 200 })
    expect(anchor(r, 'bottom')).toEqual({ x: 152, y: 252 })
    expect(anchor(r, 'right')).toEqual({ x: 204, y: 226 })
  })

  it('14 arcPath s.y==t.y 直线分支（D-14）+圆角主分支', () => {
    // 同行：M s → L laneX,s.y → L t（无圆角）
    expect(arcPath({ x: 204, y: 126 }, { x: 204, y: 126 }, 752)).toBe('M 204 126 L 752 126 L 204 126')
    // 上行（t.y<s.y）：出弧/回程圆角 r=10 逐字锁
    expect(arcPath({ x: 204, y: 326 }, { x: 204, y: 126 }, 752)).toBe(
      'M 204 326 L 742 326 Q 752 326 752 316 L 752 136 Q 752 126 742 126 L 204 126'
    )
    // detourPath 直角折线（区别弧的圆角）
    expect(detourPath({ x: 204, y: 126 }, { x: 204, y: 326 }, 752)).toBe('M 204 126 L 752 126 L 752 326 L 204 326')
  })
})

// ── [F-ROUTE-01] gap 空隙通道（2026-09-29 用户裁决：线从文献块之间的空隙
//    穿过，不从大右侧绕）——降级链第二位（vertical 之后、走廊流之前），
//    kind 无限制；候选=月框相邻间隙中线（同年相邻框中线/年内末框+13，
//    离源底最近优先）；四点三段直角折线（出段/横穿段/进段）全检避让 ──
describe('F-ROUTE-01 gap 空隙通道 5 例（候选序/三段检/降级走廊）', () => {
  it('T1 ref 边源与目标之间有空隙可穿 → route=gap（不再 arc）；源目标 x 错开横穿段非零长', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(100, 100, CARD_W, CARD_H)],
        ['B', rect(400, 300, CARD_W, CARD_H)]
      ]),
      frames: [
        { ...rect(90, 60, 600, 150), year: 2022 },
        { ...rect(90, 260, 600, 150), year: 2022 }
      ]
    })
    const r = routeEdge(geom('e1', 'A', 'B', 'ref'), snap)
    expect(r.route).toBe('gap')
    expect(r.lane).toBe(-1)
    // [F-ROUTE-01 回炉 R1]gap-h 水平直连（源右锚 (204,126)→目标左锚
    //(400,326)——错列卡单段直线穿块间空隙；x 带分离判定通过+直线不挡卡）
    expect(r.d).toBe('M 204 126 L 400 326')
  })

  it('T2 向上边 dy≤0 → route=gap（不再 detour）；候选离源底最近优先+进段锚目标底', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(100, 200, CARD_W, CARD_H)],
        ['B', rect(100, 20, CARD_W, CARD_H)]
      ]),
      frames: [
        { ...rect(90, 180, 600, 120), year: 2022 },
        { ...rect(90, 0, 600, 120), year: 2022 }
      ]
    })
    const r = routeEdge(geom('e1', 'A', 'B', 'tree'), snap)
    expect(r.route).toBe('gap')
    // [F-ROUTE-01 回炉 R1 k1-B1 修正]之间带 [B 底 72, A 顶 200]：候选 313
    //（框1 底 300+13）带外废；150=框0/框1 中线在带内→源顶锚 (152,200) 竖上
    //至 150→横穿同列零长→竖上进目标底 (152,72)——同列向上=直竖线
    expect(r.d).toBe('M 152 200 L 152 150 L 152 150 L 152 72')
  })

  it('T3 跨年边 → route=gap（错列卡 gap-h 直线承接——跨年无限制）', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(100, 100, CARD_W, CARD_H)],
        ['B', rect(400, 400, CARD_W, CARD_H)]
      ]),
      frames: [
        { ...rect(90, 60, 600, 150), year: 2022 },
        { ...rect(90, 360, 600, 150), year: 2023 }
      ]
    })
    const r = routeEdge(geom('e1', 'A', 'B', 'ref'), snap)
    expect(r.route).toBe('gap')
    // [F-ROUTE-01 回炉 R1]跨年错列卡：gap-h 直线（源右 (204,126)→目标左
    //(400,426)）穿块间空隙——跨年无 dy/gap 限制（v1 经年间隙 223 折线的
    //形态由直线优先取代——同为空隙穿行且更短）
    expect(r.d).toBe('M 204 126 L 400 426')
  })

  it('T6 左向 gap-h（k1-W1 补）：目标在源左侧 → 源左锚→目标右锚直线（anchor left 分支行为锁）', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(400, 100, CARD_W, CARD_H)],
        ['B', rect(100, 300, CARD_W, CARD_H)]
      ]),
      frames: [
        { ...rect(90, 60, 600, 150), year: 2022 },
        { ...rect(90, 260, 600, 150), year: 2022 }
      ]
    })
    const r = routeEdge(geom('e1', 'A', 'B', 'ref'), snap)
    expect(r.route).toBe('gap')
    // x 带分离（100+104+8<400 ✓）且 tgtCx<srcCx → sh=anchor(A,'left')=
    //(400,126)、th=anchor(B,'right')=(204,326)——左向直线（出发段背离源卡
    //左缘不穿源；若 anchor left 误落 right 分支则 sh==th 同 x 恒跳过→本用例
    //route 必变 detour/arc 而红）
    expect(r.d).toBe('M 400 126 L 204 326')
  })

  it('T4 gap 两层被挡（直线挡→v 层承接；两层全挡→走廊 arc）→ 走廊兜底保持（[F-ROUTE-01 回炉 R1]重写：v1 出/横/进三分法并 v2 直线/v 两层）', () => {
    // 相位 A（直线挡→gap-v 承接）：O 压 gap-h 直线（(204,126)→(400,326) 中
    // 段）不压 v 段（x 带 292-306 触不到 v 的 x=152 竖段/235 横带下缘）→
    // 候选 235（框间中线）三段全通 → route=gap（v 通道折线）
    const snapA = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(100, 100, CARD_W, CARD_H)],
        ['B', rect(400, 300, CARD_W, CARD_H)],
        ['O', rect(298, 222, 8, 8)]
      ]),
      frames: [
        { ...rect(90, 60, 600, 150), year: 2022 },
        { ...rect(90, 260, 600, 150), year: 2022 }
      ]
    })
    const ra = routeEdge(geom('e1', 'A', 'B', 'ref'), snapA)
    expect(ra.route).toBe('gap')
    expect(ra.d).toBe('M 152 152 L 152 235 L 452 235 L 452 300')
    // 相位 B（两层全挡→走廊）：O1 压直线+O2 压 v 出段竖段（x=152）→
    // gap 耗尽落走廊 arc（无 V 挡 → lane 0）
    const snapB = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(100, 100, CARD_W, CARD_H)],
        ['B', rect(400, 300, CARD_W, CARD_H)],
        ['O1', rect(298, 222, 8, 8)],
        ['O2', rect(148, 200, 8, 8)]
      ]),
      frames: [
        { ...rect(90, 60, 600, 150), year: 2022 },
        { ...rect(90, 260, 600, 150), year: 2022 }
      ]
    })
    expect(routeEdge(geom('e1', 'A', 'B', 'ref'), snapB).route).toBe('arc')
    // 相位 C（进段挡）：O1 压直线+O3 压 v 进段竖线（x=452 的 y∈[235,300]）
    // → 候选 235 废 → 走廊 arc
    const snapC = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(100, 100, CARD_W, CARD_H)],
        ['B', rect(400, 300, CARD_W, CARD_H)],
        ['O1', rect(298, 222, 8, 8)],
        ['O3', rect(448, 260, 8, 8)]
      ]),
      frames: [
        { ...rect(90, 60, 600, 150), year: 2022 },
        { ...rect(90, 260, 600, 150), year: 2022 }
      ]
    })
    expect(routeEdge(geom('e1', 'A', 'B', 'ref'), snapC).route).toBe('arc')
  })

  it('T5 gap 候选耗尽+走廊可用 → 走廊（全降级链序验证：出段全废+V0 挡 lane0 → arc lane=1 车道升级面保留）', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(100, 100, CARD_W, CARD_H)],
        ['B', rect(100, 300, CARD_W, CARD_H)],
        ['O', rect(148, 200, 8, 8)], // 出段挡=两候选（235/423）全废
        ['V0', rect(749, 180, 7, 40)] // 走廊 lane0 扫掠挡 → 升级 lane1
      ]),
      frames: [
        { ...rect(90, 60, 600, 150), year: 2022 },
        { ...rect(90, 260, 600, 150), year: 2022 }
      ]
    })
    const r = routeEdge(geom('e1', 'A', 'B', 'ref'), snap)
    expect(r.route).toBe('arc')
    expect(r.lane).toBe(1)
  })
})

describe('T3-P7A lineage-palette 数据常量冒烟（D-17 hex=用户数据面）', () => {
  it('PALETTE 8 色 hex 形状+DASH_ROT 三线型轮转（P7b 新建线型消费）', () => {
    expect(PALETTE.length).toBe(8)
    for (const c of PALETTE) expect(c).toMatch(/^#[0-9a-f]{6}$/)
    expect(DASH_ROT).toEqual(['', '6 3', '2 3'])
  })
})
