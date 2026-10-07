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
import { defaultCorridor, routeAll } from '../../../src/renderer/features/lineage/routing/chain'
import type { LayoutSnapshot, MonthFrame, Rect } from '../../../src/renderer/features/lineage/routing/chain'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

function rect(x: number, y: number, w: number, h: number): Rect {
  return { x, y, w, h }
}

function makeSnap(cards: Map<string, Rect>, frames: MonthFrame[] = []): LayoutSnapshot {
  const contentW = 800
  return { cards, labels: [], frames, yearHeads: [], contentW, corridor: defaultCorridor(contentW) }
}

describe('F-ANCHFIX-01 批 1c chain 层 anchorMarks（routeAll 观测透出——纯观测零行为变）', () => {
  it('direct 态：两卡竖叠 A(100,100)/B(100,300) 128×72 → anchorMarks=A:b1,B:t1', () => {
    const snap = makeSnap(
      new Map<string, Rect>([
        ['A', rect(100, 100, 128, 72)],
        ['B', rect(100, 300, 128, 72)]
      ])
    )
    const paths = routeAll([{ edgeId: 'e1', sourceId: 'A', targetId: 'B' }], snap)
    expect(paths).toHaveLength(1)
    expect(paths[0]!.route).toBe('direct')
    // 手算（selectAnchor 规则，期望值禁 import 实现）：sa=selectAnchor(A, B 中心
    // (164,336))：dx=0/dy=+200→竖向 dy≥0→bottom；投影 x=164 距 ½(64) 最近→slot1
    // =A:b1；sb=selectAnchor(B, A 中心 (164,136))：dy<0→top；投影 x=164→slot1
    // =B:t1；direct commit [A,b1],[B,t1] → 串序=源,目标
    expect(paths[0]!.anchorMarks).toBe('A:b1,B:t1')
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

  // [回炉 R-3] h-slip/band/corridor 三态补面（fallback 态=全部探测失败态，
  // 夹具不可稳定构造——沿承 1b 在案申报豁免：lineage-anchor-consistency.spec
  // 头注「fallback=全部探测失败态夹具不可稳定构造，申报在案」同源依据）
  it('h-slip 态：x 带分离+竖偏斜段 A(100,100)/B(700,710) → anchorMarks=A:r2,B:l0（近侧 sideAnchor 锚——与 selectAnchor 直连锚判别位）', () => {
    const snap = makeSnap(
      new Map<string, Rect>([
        ['A', rect(100, 100, 128, 72)],
        ['B', rect(700, 710, 128, 72)]
      ])
    )
    const paths = routeAll([{ edgeId: 'e1', sourceId: 'A', targetId: 'B' }], snap)
    expect(paths[0]!.route).toBe('h-slip')
    // 手算：x 带分离 100+128+8=236<700 ✓；ha=sideAnchor(A,'right',tc=
    // (764,746))：投影 y=646 越上界取最近 ¾ 序 r2（228,154）；hb=
    // sideAnchor(B,'left',sc=(164,136))：投影 y=−574 越上界取最近 ¼ 序 l0
    // （700,728）。桩/中段分治（中段复检含全卡、桩长=曼哈顿累计）：段
    // Δx=472/Δy=574、全长 1046，出源卡膨胀框（x>232）耗 4.51px<桩区 10、
    // 中段止点 x=695.5<B 膨胀框 696——h-slip 成立。对照直连判别锚（本态
    // 不用）：sa=selectAnchor(A,tc)：dy=610>|dx|=600→竖向 b2≠r2
    expect(paths[0]!.anchorMarks).toBe('A:r2,B:l0')
  })

  it('band 态：跨行行隙+错列障碍（A 上/C 障/B 下错列）→ anchorMarks=A:b2,B:t0（band 骨架生效锚——lineage-routing.test ① 夹具同几何）', () => {
    const snap = makeSnap(
      new Map<string, Rect>([
        ['A', rect(100, 100, 128, 72)],
        ['C', rect(240, 100, 128, 72)],
        ['B', rect(182, 192, 128, 72)]
      ]),
      [{ ...rect(90, 60, 600, 300), year: 2022 }]
    )
    const paths = routeAll([{ edgeId: 'e1', sourceId: 'A', targetId: 'B' }], snap)
    expect(paths[0]!.route).toBe('band')
    // 手算：A 底锚=sideAnchor(A,'bottom',tc=(246,228))：投影 x=146→¾ 序
    // b2（196,172）；B 顶锚=sideAnchor(B,'top',sc=(164,136))：投影 x=−18
    // 越左界取最近 ¼ 序 t0（214,192）；行隙带 [172,192] 供 zigzag
    expect(paths[0]!.anchorMarks).toBe('A:b2,B:t0')
  })

  it('corridor 态：带封闭+直连阻挡（X 并合卡行距 ≤2·PAD）→ anchorMarks=A:r2,B:r0（右缘 sideAnchor 锚）', () => {
    const snap = makeSnap(
      new Map<string, Rect>([
        ['A', rect(100, 100, 128, 72)],
        ['X', rect(90, 176, 600, 120)],
        ['B', rect(100, 300, 128, 72)]
      ])
    )
    const paths = routeAll([{ edgeId: 'e1', sourceId: 'A', targetId: 'B' }], snap)
    expect(paths[0]!.route).toBe('corridor')
    // 手算：源右锚=sideAnchor(A,'right',tc=(164,336))：投影 y=236→¾ 序 r2
    // （228,154）；目标右锚=sideAnchor(B,'right',sc=(164,136))：投影 y=−164
    // 越上界取最近 ¼ 序 r0（228,318）；lane0 x=752（contentW=800）
    expect(paths[0]!.anchorMarks).toBe('A:r2,B:r0')
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
