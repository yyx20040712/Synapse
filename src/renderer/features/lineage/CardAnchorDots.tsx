/**
 * [F-UIRES-03 C2·P1 / F-ANCHFIX-01 批 1c] CardAnchorDots —— 画线锚点静态
 * 渲染层：每卡 4 side×3 slot=12 dot 全 DOM 常驻（¼/½/¾ 槽位——anchors.ts
 * 判定面同构，INV-120：armed 态锚显示域=可吸附判定域，吸 ¼/¾ 不再落无
 * 可见锚处）；直径=2×var(--anchor-dot-r) CSS 单源（基值 8 画布 px 沿承；armed 通道
 * 5px 小型化——随 .tl-content transform scale 随 zoom 缩放）；fill=恒白
 * （--accent-ink token）+stroke 1.5 画布 px 主色；占用 dot（anchor-occupancy
 * getOcc 订阅）挂 data-occupied="1"（background accent——占用槽高亮单源=
 * routeAll anchorMarks/data-anchors）。
 *
 * ── 显隐通道（CSS 单源——DOM 常驻零 JS 条件渲染）──
 * - armed（.tl-content.drawing）→ 全部卡全 12 dot 显示；
 * - edit-hover（.timeline.editing .tl-card:hover）→ 仅 slot=1（½ 位）显示
 *   （[B5①搭车] 收窄语义沿承——hover 通道=½ 子集）。
 *
 * 边界沿承：①pointer-events:none（容器单源——不拦卡点击/画线 pointer 流）；
 * ②判定面不动=anchors.ts 12 锚（本层显示域与可吸附域自洽——裁决 C）；
 * ③测量冻结期（.tl-measure）条款随 [F-SLOTGRID-01 U1] 瀑布退役删除——
 * 锚层无过渡动画的历史冻结注记同步勘正。
 */
import { useSyncExternalStore } from 'react'
import { getOcc, subscribe, type AnchorSlotKey } from './anchor-occupancy'
import type { Side } from './routing/anchors'

/** 四向 side 集（与 routing/anchors Side 同源语义——全 12 锚静态层） */
const SIDES: ReadonlyArray<Side> = ['top', 'bottom', 'left', 'right']
/** 槽位序（¼/½/¾——anchors.ts SLOT_FRACTIONS 同构） */
const SLOTS: ReadonlyArray<0 | 1 | 2> = [0, 1, 2]
/** side→占用键字母（镜像 routing/anchors anchorId t/b/l/r 字母表——单源锚定） */
const SIDE_LETTER: Record<Side, 't' | 'b' | 'l' | 'r'> = { top: 't', bottom: 'b', left: 'l', right: 'r' }

const anchorKey = (side: Side, slot: 0 | 1 | 2): AnchorSlotKey => `${SIDE_LETTER[side]}${slot}` as AnchorSlotKey

export function CardAnchorDots(props: { nodeId: string }): JSX.Element {
  const occ = useSyncExternalStore(subscribe, () => getOcc(props.nodeId))
  return (
    <span className="card-anchors" aria-hidden="true">
      {SIDES.flatMap((side) =>
        SLOTS.map((slot) => (
          <span
            className="card-anchor-dot"
            data-anchor-side={side}
            data-anchor-slot={slot}
            data-occupied={occ?.has(anchorKey(side, slot)) === true ? '1' : undefined}
            key={`${side}:${slot}`}
          />
        ))
      )}
    </span>
  )
}
