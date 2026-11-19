// @vitest-environment jsdom
/**
 * [F-ANCHFIX-01 批 1c] armed 态 12 锚全显+占用槽高亮单测（设计书 v1.2 终裁
 * 记录·呈裁 C；INV-120：armed 态锚显示域=可吸附判定域〔CardAnchorDots
 * 12 dot≡anchors.ts Side×SLOT_FRACTIONS〕，占用标记单源=routeAll
 * anchorMarks/data-anchors 透出）：
 * - chain 层：routeAll direct/manual-override 两态 anchorMarks=期望锚——
 *   期望值从夹具几何手推字面值（禁 import anchors.ts 内部逻辑入断言值
 *   ——设计 §3.3 金标口径同源）；
 * - anchor-occupancy：publish/getOcc 聚合（token 解析→Map<nodeId,Set>）+
 *   引用稳定性（未变卡沿用旧 Set 引用、缺席卡恒 undefined、内容全等重复
 *   publish 不通知——React 18 useSyncExternalStore getSnapshot 缓存纪律，
 *   违反即无限循环红）；
 * - CardAnchorDots：12 dot 渲染（side×slot 笛卡尔积）+publish 后占用 dot 挂
 *   data-occupied="1"、无锚不挂（订阅驱动重渲）。
 * always-active 裸 describe（K3）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { publish, getOcc, subscribe } from '../../../src/renderer/features/lineage/anchor-occupancy'
import { CardAnchorDots } from '../../../src/renderer/features/lineage/CardAnchorDots'
import { routeAll } from '../../../src/renderer/features/lineage/routing/chain'
import type { LayoutSnapshot, MonthFrame, Rect } from '../../../src/renderer/features/lineage/routing/chain'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

function rect(x: number, y: number, w: number, h: number): Rect {
  return { x, y, w, h }
}

/** [B2b] 快照必填面补齐：无帧例 contentH=0（横道族退化——manual 例不消费）；
 *  自动边例显式给帧+contentH（帧 border {66,·,600/800,·}——x 域 [67.6,·]） */
function makeSnap(cards: Map<string, Rect>, frames: MonthFrame[] = [], contentH = 0): LayoutSnapshot {
  const contentW = 800
  return { cards, labels: [], frames, yearHeads: [], contentW, contentH, cardFrame: new Map() }
}

describe('F-ANCHFIX-01 批 1c chain 层 anchorMarks（routeAll 观测透出——纯观测零行为变）', () => {
  it('直连态：两卡竖叠 A(100,100)/B(100,300) 128×72 → route=grid+anchorMarks=A:b1,B:t1+laneMarks=v164', () => {
    const snap = makeSnap(
      new Map<string, Rect>([
        ['A', rect(100, 100, 128, 72)],
        ['B', rect(100, 300, 128, 72)]
      ]),
      [{ ...rect(66, 60, 600, 400), year: 2022, frameKey: 'k' }],
      500
    )
    const paths = routeAll([{ edgeId: 'e1', sourceId: 'A', targetId: 'B' }], snap)
    expect(paths).toHaveLength(1)
    expect(paths[0]!.route).toBe('grid')
    // 手算（selectAnchor 规则，期望值禁 import 实现）：sa=selectAnchor(A, B 中心
    // (164,336))：dx=0/dy=+200→竖向 dy≥0→bottom；投影 x=164 距 ½(64) 最近→slot1
    // =A:b1；sb=selectAnchor(B, A 中心 (164,136))：dy<0→top；投影 x=164→slot1
    // =B:t1。同道 v164 相向直连（中段 [182,290] 存活：A/B 死区 [94,178]/[294,378]）
    expect(paths[0]!.anchorMarks).toBe('A:b1,B:t1')
    expect(paths[0]!.laneMarks).toBe('v164:172-300')
  })

  it('manual-override 态：via 在场不 commit（散开语义零变）——anchorMarks 从 selectAnchor 派生计入=A:l1,B:r1（显示真值）', () => {
    const snap = makeSnap(
      new Map<string, Rect>([
        ['A', rect(100, 100, 128, 72)],
        ['B', rect(100, 300, 128, 72)]
      ])
    )
    const paths = routeAll([
      { edgeId: 'e2', sourceId: 'A', targetId: 'B', via: [{ x: 60, y: 136 }, { x: 228, y: 336 }] }
    ], snap)
    expect(paths).toHaveLength(1)
    expect(paths[0]!.route).toBe('manual-override')
    // 手算：a=selectAnchor(A, via[0]=(60,136))：dx=-104/dy=0→|dx|≥|dy| 横向
    // dx<0→left；投影 y=36 距 ½(36) 最近→slot1=A:l1；b=selectAnchor(B,
    // via[1]=(228,336))：dx=+64/dy=0→横向 dx≥0→right；投影 y=36→slot1=B:r1
    expect(paths[0]!.anchorMarks).toBe('A:l1,B:r1')
  })

  // [回炉 R-3] h-slip/band/overlap 三态补面（[F-SLOTGRID-01 U2] corridor 态
  // 随走廊退役→兜底态=overlap 最短路线；夹具=带封闭几何〔X 并合卡行距
  // ≤2·PAD→无带可横移+通道候选全灭〕——U2 重基线）
  it('陡斜跨域（|dy|>|dx| 竖向主向）：A(100,100)/B(700,710) → route=grid+anchorMarks=A:b2,B:t0（阶梯绕行非 blocked）', () => {
    const snap = makeSnap(
      new Map<string, Rect>([
        ['A', rect(100, 100, 128, 72)],
        ['B', rect(700, 710, 128, 72)]
      ]),
      [{ ...rect(66, 60, 800, 760), year: 2022, frameKey: 'k' }],
      820
    )
    const paths = routeAll([{ edgeId: 'e1', sourceId: 'A', targetId: 'B' }], snap)
    expect(paths[0]!.route).toBe('grid')
    // 手推（selectAnchor 主向定边）：sa=A 向 B 中心 (764,746)：|dy|=610>|
    // dx|=600→竖向 bottom；投影 x=764 越右界取最近 ¾ 序 b2=(196,172)；sb=B
    // 向 A 中心 (164,136)：|dy|=610>600→top；投影 x=164 越左界取最近 ¼ 序
    // t0=(732,710)。竖程跨多行——阶梯绕行（锚道+行隙横移族供给）
    expect(paths[0]!.anchorMarks).toBe('A:b2,B:t0')
    expect(paths[0]!.clearance).toBeUndefined()
  })

  it('扁平跨行（横向主向——斜连废除裁决①⑤）：A(100,100)/B(700,200) → route=grid+anchorMarks=A:r2,B:l0（异横道 L 形绕行）', () => {
    const snap = makeSnap(
      new Map<string, Rect>([
        ['A', rect(100, 100, 128, 72)],
        ['B', rect(700, 200, 128, 72)]
      ]),
      [{ ...rect(66, 60, 800, 260), year: 2022, frameKey: 'k' }],
      320
    )
    const paths = routeAll([{ edgeId: 'e1', sourceId: 'A', targetId: 'B' }], snap)
    expect(paths[0]!.route).toBe('grid')
    // 手推：sa=A 向 B 中心 (764,236)：dx=600>dy=100→right；投影 y=236 越下
    // 界取 ¾ 序 r2=(228,154)；sb=B 向 A 中心 (164,136)：横向 left；投影
    // y=136 越上界取 ¼ 序 l0=(700,218)。异横道（154/218）→桩+外区带/行隙
    // 绕行（旧 h-slip 斜直线随裁决①废除）
    expect(paths[0]!.anchorMarks).toBe('A:r2,B:l0')
    expect(paths[0]!.clearance).toBeUndefined()
  })

  it('L 形态：跨行行隙+错列（[B2b] grid 重推导）→ 全点列手推：A:b2 桩 182→B:t0 横移入末桩', () => {
    const snap = makeSnap(
      new Map<string, Rect>([
        ['A', rect(112, 100, 128, 72)],
        ['B', rect(212, 244, 128, 72)]
      ]),
      [{ ...rect(98.4, 80.4, 627.2, 400), year: 2022, frameKey: 'k' }],
      460
    )
    const paths = routeAll([{ edgeId: 'e1', sourceId: 'A', targetId: 'B' }], snap)
    expect(paths[0]!.route).toBe('grid')
    // 手推：sa=A 向 B 中心 (276,280)：|dy|=144>|dx|=100→竖向 bottom；投影
    // x=276 越右界取 ¾ 序 b2=(208,172)；sb=B 向 A 中心 (176,136)：竖向 top；
    // 投影 x=176 越左界取 ¼ 序 t0=(244,244)。桩 (208,172)↓(208,182)（行隙
    // 首道——走廊 i=0）；h-182 [208,244] 存活（A/B 死区 y 带 [94,178]/
    // [238,322] 皆不含）→ 1 拐 L 直入末桩 [182,244]
    expect(paths[0]!.anchorMarks).toBe('A:b2,B:t0')
    expect(paths[0]!.pts).toEqual([
      { x: 208, y: 172 }, { x: 208, y: 182 }, { x: 244, y: 182 }, { x: 244, y: 244 }
    ])
    expect(paths[0]!.d).toBe('M 208 172 L 208 177 Q 208 182 213 182 L 238 182 Q 244 182 244 188 L 244 244')
    expect(paths[0]!.laneMarks).toBe('v208:172-182,h182:208-244,v244:182-244')
    expect(paths[0]!.clearance).toBeUndefined()
  })

  it('blocked 态：X 纵贯全域高墙（A/B 卡身皆落墙内——供给三路全灭）→ route=grid/blocked+anchorMarks=A:b1,B:t1（数据保留）', () => {
    // X [90,690]×[60,380]（膨胀 [84,696]×[54,386]——±6）：A(100,100)/B(100,300)
    // 卡身与全部行隙皆落墙死区内——v/h 道中段全灭（含边侧道：帧 x 域内全部
    // v 道 x∈[84,696]）。[B2b] 旧 overlap 兜底随六态退役——INV-79 blocked 承接
    const snap = makeSnap(
      new Map<string, Rect>([
        ['A', rect(100, 100, 128, 72)],
        ['X', rect(90, 60, 600, 320)],
        ['B', rect(100, 300, 128, 72)]
      ]),
      [{ ...rect(66, 40, 700, 400), year: 2022, frameKey: 'k' }],
      440
    )
    const paths = routeAll([{ edgeId: 'e1', sourceId: 'A', targetId: 'B' }], snap)
    // 手算：sa=A 底 ½ (164,172)=A:b1；sb=B 顶 ½ (164,300)=B:t1（selectAnchor
    // 同函数同参——锚观测沿承）；无路=blocked 空 d
    expect(paths[0]).toMatchObject({ route: 'grid', clearance: 'blocked', d: '', anchorMarks: 'A:b1,B:t1' })
  })
})

describe('F-ANCHFIX-01 批 1c anchor-occupancy（publish/getOcc 聚合+引用稳定性）', () => {
  it('聚合：anchorMarks token 解析→per-node 占用集；缺席卡 undefined', () => {
    publish([])
    publish([{ anchorMarks: 'A:t0,B:r1' }, { anchorMarks: 'A:b2' }])
    expect(getOcc('A')).toEqual(new Set(['t0', 'b2']))
    expect(getOcc('B')).toEqual(new Set(['r1']))
    expect(getOcc('C')).toBeUndefined()
    publish([])
  })

  it('引用稳定性：未变卡沿用旧 Set 引用；缺席卡恒 undefined；内容全等重复 publish 不通知', () => {
    publish([])
    let notified = 0
    const off = subscribe(() => {
      notified += 1
    })
    publish([{ anchorMarks: 'A:t0,A:b2,B:r1' }])
    expect(notified).toBe(1)
    const a1 = getOcc('A')
    const b1 = getOcc('B')
    expect(a1).toEqual(new Set(['t0', 'b2']))
    // 未变卡重发布（token 序不同、内容同）：引用不变+零通知
    publish([{ anchorMarks: 'B:r1,A:t0,A:b2' }])
    expect(getOcc('A')).toBe(a1)
    expect(getOcc('B')).toBe(b1)
    expect(notified).toBe(1)
    // 变化卡新引用；消失卡回 undefined
    publish([{ anchorMarks: 'A:t1' }])
    expect(getOcc('A')).not.toBe(a1)
    expect(getOcc('B')).toBeUndefined()
    expect(notified).toBe(2)
    off()
    publish([])
  })

  it('防御：非法 token 跳过（域外键/空键/无冒号/空 cardId）——不进集+全非法零通知', () => {
    publish([])
    let notified = 0
    const off = subscribe(() => {
      notified += 1
    })
    publish([{ anchorMarks: 'A:zz,A:,noColon,:t1' }])
    // 全非法=∅→∅ 零变化零通知（'A:zz' 域外键/'A:' 空键/'noColon' 无冒号/
    // ':t1' 空 cardId——四形皆不进集）
    expect(notified).toBe(0)
    expect(getOcc('A')).toBeUndefined()
    // 混合串：仅合法项进集（非法项静默跳过不污染）
    publish([{ anchorMarks: 'A:zz,B:t1' }])
    expect(notified).toBe(1)
    expect(getOcc('A')).toBeUndefined()
    expect(getOcc('B')).toEqual(new Set(['t1']))
    off()
    publish([])
  })

  it('防御：等长异集（{t0,b2}→{t0,r2}）触发通知+新引用（size 同+every 逐键比对分支）', () => {
    publish([])
    let notified = 0
    const off = subscribe(() => {
      notified += 1
    })
    publish([{ anchorMarks: 'A:t0,A:b2' }])
    expect(notified).toBe(1)
    const a1 = getOcc('A')
    // 同基数异键：size 相等但 every 逐键比对 false→新集引用+通知（漏判即
    // 陈旧占用集驻留——React getSnapshot 恒旧值）
    publish([{ anchorMarks: 'A:t0,A:r2' }])
    expect(notified).toBe(2)
    expect(getOcc('A')).not.toBe(a1)
    expect(getOcc('A')).toEqual(new Set(['t0', 'r2']))
    off()
    publish([])
  })
})

describe('F-ANCHFIX-01 批 1c CardAnchorDots（12 dot 渲染+占用标记）', () => {
  let root: Root | null = null
  let host: HTMLDivElement | null = null

  beforeEach(() => {
    publish([])
  })

  afterEach(() => {
    act(() => {
      root?.unmount()
    })
    root = null
    host?.remove()
    host = null
  })

  it('渲染 4 side×3 slot=12 dot（笛卡尔积齐值）；publish 后占用 dot 挂 data-occupied="1"、无锚不挂', () => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    act(() => {
      root?.render(<CardAnchorDots nodeId="A" />)
    })
    const dots = Array.from(host.querySelectorAll('.card-anchor-dot'))
    expect(dots).toHaveLength(12)
    const pairs = dots
      .map((d) => `${d.getAttribute('data-anchor-side')}:${d.getAttribute('data-anchor-slot')}`)
      .sort()
    expect(pairs).toEqual([
      'bottom:0', 'bottom:1', 'bottom:2',
      'left:0', 'left:1', 'left:2',
      'right:0', 'right:1', 'right:2',
      'top:0', 'top:1', 'top:2'
    ])
    // 初始零占用（∅ 初态）
    expect(host.querySelectorAll('.card-anchor-dot[data-occupied="1"]')).toHaveLength(0)
    // publish 后（占用 A:t1+A:r2；C 非本卡）：订阅驱动重渲
    act(() => {
      publish([{ anchorMarks: 'A:t1,C:b0,A:r2' }])
    })
    const occ = Array.from(host.querySelectorAll('.card-anchor-dot[data-occupied="1"]'))
    expect(occ).toHaveLength(2)
    const occPairs = occ
      .map((d) => `${d.getAttribute('data-anchor-side')}:${d.getAttribute('data-anchor-slot')}`)
      .sort()
    expect(occPairs).toEqual(['right:2', 'top:1'])
    // 无锚 dot 不挂（负锚——属性缺席）
    const idle = host.querySelector('.card-anchor-dot[data-anchor-side="bottom"][data-anchor-slot="0"]')
    expect(idle?.hasAttribute('data-occupied')).toBe(false)
  })
})
