/**
 * [F-DETOURW-01] 走线容量输入归一化一致性钉（承接 INV-169② 走线域残余根治）：
 * gridChannelsOf 消费快照 contentW（=buildSnapshot 经 readFrameContentWidth 单源
 * 采集的首月框内容盒宽归一化值——与布局 useCapacityLayout/拖拽 card-drag-session
 * 同源），派生行容量档=capacities(contentW) 直算档逐行对账。
 *
 * 分叉窗票面（[200N−46,200N−44.8)，N=4 即 f.w∈[754,755.2)）：帧宽 f.w∈[754,755.2) 时
 * content_used=f.w−26∈[728,729.2)→N=4 而 content_decl=f.w−27.2∈[726.8,728)→N=3
 * ——1.2px 窗内声明/used 口径档位分叉（布局 n4 vs 走线 n3）。**[RR1-1 修缮]
 *  本组四点为 contentW 输入域取值**（快照 contentW=归一化 W——改造后走线消费
 *  contentW，f.w 域分叉经归一化已不存在；727.9=分叉窗 contentW 映射 [728,729.2)
 *  左界下沿、728=N=4 档位下界、754/755.1=N=4 段内代表值）钉一致性。
 *
 * 期望值手算（capacity.ts 公式：N=⌊(W+72)/200⌋、M=⌊(W+72−100)/200⌋）：
 * 727.9→N=3/M=3；728→N=4/M=3；754→N=4/M=3；755.1→N=4/M=3。
 *
 * 夹具几何（gridFrame=lineage-routing.test.ts 同款——fx0=f.x+FRAME_BORDER=100；
 * 行集=框几何派生：innerH=720−3.2−18−12=686.8 → rows=⌊(686.8+1.3−72)/144⌋+1=5，
 * tops=fy0+18+144r=100+144r）。**自相似陷阱与判别仪器设计**（首红实证发现——
 * 仓外批档 20261021-evctx-detourw/u1-first-red.raw.txt）：本夹具旧派生 W=600
 * 下「cap=3+满右缘（宽恰 72）」与 cap=4+零右缘（W∈[728,800)）偶行通道集
 * 数学全等（xLo 集 {240,440,640} 同、640 道宽 72 同、槽位全同——600=3×200 满右缘
 * ≡728=4×200−72 零右缘自相似点），偶行 xLo 存在性不可判档。判别面=逐行仪器：
 * - 偶行=fx0+540 道（xLo=640）首槽签名：列间 k=3（n≥4）/满右缘宽 72 → 658.7；
 *   非满右缘（n=3 且 W−528≠72）→ 首槽=W 函数异值（727.9→680）。自相似注记：
 *   W=600 满右缘与 W=728 列间同签名 658.7——728/754/755.1 例偶行位对「误消费
 *   f.w−27.2=600」恒真，新旧判别由奇行仪器承载；727.9 例偶行位判别成立。
 * - 奇行=fx0+440 道（xLo=540）首槽+fx0+640 道（xLo=740）在场性双锚：m=2 时
 *   540=右缘（宽 W−428：600→172→首槽 575.3）且 740 无道；m=3 时 540=列间 k=2
 *   （宽恒 72→首槽 558.7）且 740=右缘在场——零自相似（172≠72）。
 * 槽位手算（slotPositions：slots[k]=quant(x+10+k(w−20)/(n+1))）：列间宽 72 →
 * 首槽=x+18.7；右缘@600 奇行宽 172 → 首槽 575.3；右缘@727.9 偶行宽 199.9 → 680。
 * 断言形态=字面锚+capacities 对账双 expect 分行（翻转任一字面/档位即红——红证
 * 留档仓外 scripts-audits/20261021-evctx-detourw/）。always-active 裸 describe（K3）。
 */
import { describe, expect, it } from 'vitest'
import { capacities } from '../../../src/renderer/features/lineage/capacity'
import { gridChannelsOf, type GridChannel } from '../../../src/renderer/features/lineage/routing/detour'
import type { LayoutSnapshot } from '../../../src/renderer/features/lineage/routing/chain'

/** 网格框架夹具（border-box——与 lineage-routing.test.ts gridFrame 同款；
 *  Rule of Three 第 2 次保持重复） */
const gridFrame = (): { x: number; y: number; w: number; h: number; year: number } => ({
  x: 98.4,
  y: 80.4,
  w: 627.2,
  h: 720,
  year: 2022
})

const snapWithW = (w: number): LayoutSnapshot => ({
  cards: new Map(),
  labels: [],
  frames: [gridFrame()],
  yearHeads: [],
  contentW: w
})

/** 偶行派生档仪器（xLo=640 道首槽签名——判别结构见头注；窗内档域 {3,4}） */
const evenTierOf = (channels: GridChannel[], top: number): number => {
  const ch = channels.find((c) => c.yLo === top && c.xLo === 640)
  if (ch !== undefined && ch.slots[0] === 658.7) return 4
  return 3
}

/** 奇行派生档仪器（xLo=540 道首槽列间签名+xLo=740 道在场性双锚——零自相似；
 *  窗内档域 {2,3}） */
const oddTierOf = (channels: GridChannel[], top: number): number => {
  const ch540 = channels.find((c) => c.yLo === top && c.xLo === 540)
  const has740 = channels.some((c) => c.yLo === top && c.xLo === 740)
  if (ch540 !== undefined && ch540.slots[0] === 558.7 && has740) return 3
  return 2
}

/** 夹具行带全集（top, φ 奇偶——5 行手推见头注）：偶行读 evenTierOf/奇行 oddTierOf */
const rowTiersOf = (channels: GridChannel[]): number[] => [
  evenTierOf(channels, 100),
  oddTierOf(channels, 244),
  evenTierOf(channels, 388),
  oddTierOf(channels, 532),
  evenTierOf(channels, 676)
]

/** capacities(contentW) 直算档逐行展开（r 偶=N/奇=M——对账参照系） */
const capTiersOf = (w: number): number[] => {
  const c = capacities(w)
  return [c.n, c.m, c.n, c.m, c.n]
}

describe('F-DETOURW-01 走线容量输入=contentW 一致性（布局/走线同档——INV-169② 三域合流）', () => {
  it('contentW=727.9（窗左界下沿）→ 派生行容量档 [3,3,3,3,3]=capacities(727.9) 直算档', () => {
    const derived = rowTiersOf(gridChannelsOf(snapWithW(727.9)))
    expect(derived).toEqual([3, 3, 3, 3, 3])
    expect(derived).toEqual(capTiersOf(727.9))
  })

  it('contentW=728（N=4 档位下界）→ 派生行容量档 [4,3,4,3,4]=capacities(728) 直算档', () => {
    const derived = rowTiersOf(gridChannelsOf(snapWithW(728)))
    expect(derived).toEqual([4, 3, 4, 3, 4])
    expect(derived).toEqual(capTiersOf(728))
  })

  it('contentW=754（N=4 段内代表值——归一化输入域钉；f.w 域分叉经归一化已不存在）→ 派生行容量档 [4,3,4,3,4]', () => {
    const derived = rowTiersOf(gridChannelsOf(snapWithW(754)))
    expect(derived).toEqual([4, 3, 4, 3, 4])
    expect(derived).toEqual(capTiersOf(754))
  })

  it('contentW=755.1（N=4 段内代表值——归一化输入域钉）→ 派生行容量档 [4,3,4,3,4]', () => {
    const derived = rowTiersOf(gridChannelsOf(snapWithW(755.1)))
    expect(derived).toEqual([4, 3, 4, 3, 4])
    expect(derived).toEqual(capTiersOf(755.1))
  })

  it('unmeasured 守卫：contentW=0（jsdom/空图态）→ 零通道早退（capacities(0)=∞ 死循环防点——与 useCapacityLayout unmeasured 降级同族）', () => {
    expect(gridChannelsOf(snapWithW(0))).toEqual([])
  })
})
