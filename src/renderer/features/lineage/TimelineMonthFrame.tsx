// b3: B3 commit A 纯拆件（2026-11-22——自 TimelineYears.tsx 拆出；代码与锚
// 注释同迁，行为零变）
// b3: B3 commit B 子波 2（§8）：memo+isSrc 判定——slot 瞬态变化只重渲染源月框
// 子树（宿主 TimelineYears 仅向源框传 slot[其余=null]+renderCard useCallback
// 稳定——shallow 比较即等价 isSrc 判定；props 类型导出供 render-count 探针）。
/**
 * [B3 §4] TimelineMonthFrame —— 单月框件：月标（骑框线）+extend 类
 * （.month-frame.stretch——--lg-pull 消费）+foster row 编排（拖卡驻保育行）+
 * DragCandidates 接线（候选槽族挂源框）。kids 构造（拖拽槽位渲染——其余卡+
 * 拖卡@insertIdx）随迁；分行数学=capacity.ts partitionRows 单源（W=frameW）。
 * [T3-P8] 槽位拖拽渲染：active=拖起（.drag-slot「置 入」占位+拖卡驻原行
 * （keyed 同父保育——F-DRAGREMOUNT-01）.dragging **absolute 离流**（定位驻卡
 * 链 offsetParent——坐标域见 card-drag-session）+占位槽类面=overFrame 真实
 * .target 唯一加深/假 .faded 淡化——B3 §6.3）；
 * !active=settle 落位（卡回流@insertIdx，FLIP 飞行由 useCardDrag 命令式接管）。
 * **占位与拖卡仍在 kids 数组原位参与分行**（占位=行内槽位；拖卡 .dragging
 * absolute 离流不占位）。
 * [lnfix2] 月组框 ref 注册链退役（跨月联动死码）；data-frame-key 属性保留
 * （e2e 断言锚沿承）。
 * [B3 §3.4] pullStyle（React inline --lg-pull）退役——pullPx 跟随量改拖拽会话帧批
 * 直写 frame.style（card-drag-session 段 0/段 1，extend=true 条件写/真变假
 * removeProperty）；本件只承载 .stretch 类挂载/摘除（slot.extend 真变化=提交面 4）。
 */
import { memo } from 'react'
import type { LineageNode } from '@shared/models/lineage'
import { frameKeyOf } from './lineage-timeline'
import { partitionRows, positionOf } from './capacity'
import { DragCandidates } from './drag-slot-candidates'
import { TimelineCardRow } from './TimelineCardRow'
import type { DragSlotPreview } from './useCardDrag'

export interface TimelineMonthFrameProps {
  year: number | null
  month: number | null
  /** 月组卡序（组内序=nodes 序单源 INV-75） */
  nodes: LineageNode[]
  /** [T3-P8] 拖拽槽位预览（active/settle 两相位；[B3 §8] 宿主只传源框——非源框恒 null=memo 判定面） */
  slot: DragSlotPreview | null
  /** [F-SLOTGRID-01 U1] 月框内容宽（use-capacity-layout 量测；0=unmeasured
   *  降级=全部卡入首行单行——jsdom/空图同态） */
  frameW: number
  /** 卡面构造（父件闭包——pubNos/选中/拾取源高亮全经其注入；[B3 §8] useCallback 稳定引用） */
  renderCard: (n: LineageNode, dragging: boolean) => JSX.Element
}

export const TimelineMonthFrame = memo(function TimelineMonthFrame(props: TimelineMonthFrameProps): JSX.Element {
  const key = frameKeyOf(props.year, props.month)
  const slot = props.slot
  const isSrc = slot !== null && slot.srcKey === key
  let kids: JSX.Element[] = []
  if (isSrc && slot !== null) {
    const others = props.nodes.filter((n) => n.id !== slot.nodeId)
    const dragged = props.nodes.find((n) => n.id === slot.nodeId)
    const i = Math.min(slot.insertIdx, others.length)
    kids = others.slice(0, i).map((n) => props.renderCard(n, false))
    if (slot.active) {
      // [B3 §6.3] 唯一加深槽=当前插入占位（仅拖起相位 slot.active=true）：
      // overFrame=true→.drag-slot.target（全 DOM 恰 1 个）；false→.drag-slot
      // .faded（target 恒 0——G9/M2 口径）。候选槽族零 target（cand 面）；
      // settle（active=false）不渲染占位槽=残留 overFrame 也恒 0。
      kids.push(
        <div className={slot.overFrame ? 'drag-slot target' : 'drag-slot faded'} key="__drag_ph">
          置 入
        </div>
      )
    } else if (dragged !== undefined) {
      kids.push(props.renderCard(dragged, false))
    }
    kids.push(...others.slice(i).map((n) => props.renderCard(n, false)))
    if (slot.active && dragged !== undefined) {
      kids.push(props.renderCard(dragged, true)) // 拖起=离流拖卡（.dragging absolute——驻行=foster row 同父保育）
    }
  } else {
    kids = props.nodes.map((n) => props.renderCard(n, false))
  }
  // [②U6] 框底缘下拉态（拖过底缘=stretch 框高动画腾新行——.38s 曲线 CSS 承载）；
  // 候选槽族（faded 多预览）挂源框内。
  // [F-VISFB-22 C6/B3 §3.4] 框底连续跟随量=会话帧批直写 frame inline --lg-pull
  //（未拉伸底缘起越过量，PULL_BAND_PX 封顶——card-drag-session 段 0/段 1 条件写），
  // theme-lineage-drag.css stretch 规则 calc(38px+var) 消费（基准随
  // FRAME_PAD_BOTTOM 38 同步——F-LANEGRID-01 B4）；缺省回落=旧全量 82px。
  //（--lg-pull=运行时注入动态量——check-quality C-4c DYNAMIC_TOKENS 白名单在册，
  // 双向互指=直写点 card-drag-session.ts）
  const stretching = isSrc && slot !== null && slot.active && slot.extend === true
  const frameCls = ['month-frame', stretching ? 'stretch' : ''].filter((c) => c !== '').join(' ')
  return (
    <div className={props.month === null ? 'tl-month unknown' : 'tl-month'}>
      {/* [F-LANEGRID-01 B4] 月标骑框线（2026-11-20 用户裁决：中轴
          =框上边界）——注入位置从框内首位提至 .tl-month 直接首位
          （.month-frame overflow:hidden 会裁出框上半；.tl-month
          position:relative 无裁切=包含块基准，与框 border-box 顶
          同位）。原框内顶形态（[F-LINEAGE-02 裁决 7/D-L2-2]）的
          tag 底(框内 20.5px)压卡顶(18px) 2.5px——top ¼/½ 锚桩
          全埋障碍死区（普通跨年图整图 blocked 实证）；骑线后框内
          只占下半 10px，配合 FRAME_PAD_TOP=38 帧顶带两道
          （卡顶−10/−18 均在 tag 死区下缘 16px 之下）top 锚解封。
          框间通道：tag x 域内框间道损失 1 条（死区上缘=框顶−16），
          由帧顶带 +2 道覆盖（净增益） */}
      <span className="month-tag">
        {props.month === null
          ? `未定月 · ${props.nodes.length} 篇`
          : `${props.month} 月 · ${props.nodes.length} 篇`}
      </span>
      <div className={frameCls} data-frame-key={key}>
        {/* [F-SLOTGRID-01 U1] 行容器逐行渲染（数组序贪心分行——
            占位/拖卡按 kids 原位入行；.tl-row 保持 static
            position——拖拽 .dragging absolute 包含块链不变）。
            [U3 RR1-1] 拖起（active）尾挂时分区计数=在流数
            （kids.length−1——拖卡恒数组末位不占行槽）：满末行拖起
            不再溢出仅含 absolute 拖卡的空 .tl-row（.month-frame
            flex gap 72 撑高框 72px=拖起瞬间跳动）。
            [F-DRAGREMOUNT-01] 拖卡驻**保育行=拖前原行**（拖卡
            原位索引经 positionOf 落行——拖起分区计数 N（其余
            N−1+占位 1）与拖前分区同计数=行数同构，原行恒在；
            Math.min 钳现行数学下恒不绑定〔同 W 同计数 N 下
            positionOf(srcIdx).row ≤ rows.length−1 恒成立〕，真实
            防御面=占位计数偏斜/capacity 分区数学未来分叉时钳住
            越界 fosterRow——否则 dragTail 零渲染出树=红证可见
            形）：跨父调和必 remount（React 逐父 children 对账
            不跨父保育——驻末行时跨行源卡必换节点=激活帧 ghost
            inline 四键随旧节点消亡，本票病灶）；驻原行=同父
            keyed 调和节点保育移动——absolute 定位与所在行无关
            （.tl-row static，包含块恒=.month-frame），驻原行零
            视觉差。!active（settle 回流）路径零改（拖卡在流
            占位=kids 原位）。[INV-140] 保育⇒激活帧 ghost
            inline 四键存续（会话侧写键段互指）。 */}
        {(() => {
          const dragTail = isSrc && slot !== null && slot.active ? kids[kids.length - 1] ?? null : null
          const rows = partitionRows(dragTail !== null ? kids.length - 1 : kids.length, props.frameW)
          const fosterRow =
            dragTail !== null && slot !== null
              ? Math.min(
                  positionOf(props.nodes.findIndex((n) => n.id === slot.nodeId), props.frameW).row,
                  rows.length - 1
                )
              : -1
          return rows.map((row, r) => (
            <TimelineCardRow
              key={r}
              index={r}
              row={row.map((i) => kids[i]!)}
              dragTail={dragTail !== null && r === fosterRow ? dragTail : null}
            />
          ))
        })()}
        {isSrc && slot !== null && slot.active && (
          <DragCandidates insertIdx={slot.insertIdx} active={slot.active} frameW={props.frameW} total={props.nodes.length} />
        )}
      </div>
    </div>
  )
})
