// b3: T3-P7B
// b3: T3-P8
/**
 * [T3-P7B] TimelineYears —— 年/月/卡渲染体（LineageTimeline 拆件——组件
 * 250 行红线；纯展示：分组遍历+编号/选中/拾取源高亮全经 props，交互回调沿
 * TimelineCallbacks 透传）。
 * [F-SLOTGRID-01 U1] 月框行容器化：.month-frame 内由平铺卡改为
 * .month-frame > .tl-row > .tl-card 网格分行（数组序贪心分行=capacity.ts
 * partitionRows 单源；W=宿主 frameW prop——unmeasured〔0〕降级全部卡入
 * 首行单行，DOM 序不变）；瀑布错位 offsets prop 链随瀑布退役删除。
 * [T3-P8] 槽位拖拽渲染：dragSlot 在场时源月组按「其余卡+拖卡@insertIdx」
 * 渲染——active=拖起（.drag-slot「置 入」占位+拖卡驻原行（keyed 同父
 * 保育——F-DRAGREMOUNT-01）.dragging **absolute 离流**（定位驻卡链
 * offsetParent——坐标域见 card-drag-session）+框外 .faded 淡化）；
 * !active=settle 落位（卡回流@insertIdx，FLIP 飞行由 useCardDrag
 * 命令式接管）。**占位与拖卡仍在 kids 数组原位参与分行**（占位=行内
 * 槽位；拖卡 .dragging absolute 离流不占位）。
 * [F-UIRES-03 C3] 改月飞行 flash 高亮+月标点击回调随改月链退役删除
 * （INV-107）；[F 项搭车] 头注「fixed 离流」陈旧句按真实机制改写
 * （absolute 非 fixed——含块=.month-frame，见 card-drag-session 头注）。
 * [lnfix2] 月组框 ref 注册链退役（跨月联动死码）；data-frame-key 属性保留
 * （e2e 断言锚——[F-SLOTGRID-01 U3] DragCandidates 的框查询消费随候选阵列
 * 算术化退役，属性承载断言定位面沿承）。
 */
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import type { LineageNode } from '@shared/models/lineage'
import type { LineagePaperMetrics } from '@shared/ipc/schemas'
import type { TimelineYearGroup } from './lineage-timeline'
import { frameKeyOf } from './lineage-timeline'
import { partitionRows, positionOf } from './capacity'
import { LineageTimelineCard } from './LineageTimelineCard'
import { DragCandidates } from './drag-slot-candidates'
import { PULL_BAND_PX } from './card-drag-session'
import type { DragSlotPreview } from './useCardDrag'
import type { TimelineCallbacks } from './timeline-interactions'

export function TimelineYears(props: {
  groups: TimelineYearGroup[]
  /** [F-FOLDER-01] 节点号单源（Timeline useMemo 一次——值=该文献 pubNo，
  *  INV-92 库级同源；主题节点=0） */
  pubNos: Map<string, number>
  paperMetrics: Record<string, LineagePaperMetrics>
  /** [A1a] 文献库标签名组表（键=paperId——卡标签行数据源[换源]；缺省=空表） */
  tagNames?: Record<string, string[]>
  selectedNodeId: string | null
  /** [②U5] 右键反馈：节点菜单目标卡 accent 描边（.ctx-hlt——菜单关即撤） */
  ctxNodeId?: string | null
  /** [F-SLOTGRID-01 U1] 月框内容宽（use-capacity-layout 量测；0=unmeasured
   *  降级=全部卡入首行单行——jsdom/空图同态） */
  frameW: number
  /** [T3-P8] 拖拽槽位预览（active/settle 两相位——见头注） */
  dragSlot?: DragSlotPreview | null
  /** [F-LGRAPH-01①U5] P-8 聚焦集（仅被点卡 accent 边框——本集沿承不扩邻接） */
  focusIds?: ReadonlySet<string>
  /** [F-VISFB-21 C4] bright 集（focus∪双向一度邻接——dim 判定源；缺省视全
   *  非 bright——宿主 dimUnfocused 激活时恒随附） */
  brightIds?: ReadonlySet<string>
  /** [②U7/P-18] 聚焦 dim 激活（集非空）——非 bright 卡挂 .dim（0.3/hover 0.6） */
  dimUnfocused?: boolean
  onCardClick: NonNullable<TimelineCallbacks['onNodeClick']>
  /** [F-STAR-01 A3 点亮] 星标区点击（三模式均 toggle——宿主 toggleNodeStar） */
  onCardStarClick?: (nodeId: string) => void
  onCardPointerDown?: (nodeId: string, ev: ReactPointerEvent<HTMLElement>) => void
  /** [F-UIRES-03 B5①] 卡面两钮传 props 随迁移退役删除（消费面=SidePanel 操作行） */
} & Pick<TimelineCallbacks, 'onNodeContextMenu'>): JSX.Element {
  const { groups, pubNos, paperMetrics } = props
  const tagNames = props.tagNames ?? {}
  const slot = props.dragSlot ?? null
  const renderCard = (n: LineageNode, dragging: boolean): JSX.Element => (
    <LineageTimelineCard
      key={n.id}
      node={n}
      no={pubNos.get(n.id) ?? 0}
      metrics={n.paperId !== null ? (paperMetrics[n.paperId] ?? null) : null}
      tagNames={tagNames}
      selected={props.selectedNodeId === n.id}
      ctx={props.ctxNodeId === n.id}
      focused={props.focusIds?.has(n.id) === true}
      dim={props.dimUnfocused === true && props.brightIds?.has(n.id) !== true}
      dragging={dragging}
      onNodeClick={props.onCardClick}
      onNodeContextMenu={props.onNodeContextMenu}
      onStarClick={props.onCardStarClick}
      onCardPointerDown={props.onCardPointerDown}
    />
  )
  return (
    <>
      {groups.map((g) => {
        const yearCount = g.months.reduce((sum, m) => sum + m.nodes.length, 0)
        return (
          <section
            className="tl-year"
            key={g.year === null ? 'null' : String(g.year)}
            data-year={g.year === null ? 'null' : g.year}
          >
            <div className="tl-year-head">
              {/* 年份头数字无「年」字（mockup 纯数字）；null 年=「未知年份」 */}
              <span className="tl-year-num">{g.year === null ? '未知年份' : g.year}</span>
              <span className="tl-year-meta">{yearCount} 篇</span>
            </div>
            {g.months.map((m) => {
              const key = frameKeyOf(g.year, m.month)
              const isSrc = slot !== null && slot.srcKey === key
              let kids: JSX.Element[] = []
              if (isSrc && slot !== null) {
                const others = m.nodes.filter((n) => n.id !== slot.nodeId)
                const dragged = m.nodes.find((n) => n.id === slot.nodeId)
                const i = Math.min(slot.insertIdx, others.length)
                kids = others.slice(0, i).map((n) => renderCard(n, false))
                if (slot.active) {
                  kids.push(
                    <div
                      className={slot.overFrame ? 'drag-slot' : 'drag-slot faded'}
                      key="__drag_ph"
                    >
                      置 入
                    </div>
                  )
                } else if (dragged !== undefined) {
                  kids.push(renderCard(dragged, false))
                }
                kids.push(...others.slice(i).map((n) => renderCard(n, false)))
                if (slot.active && dragged !== undefined) {
                  kids.push(renderCard(dragged, true)) // 拖起=离流拖卡（.dragging absolute——驻行=foster row 同父保育）
                }
              } else {
                kids = m.nodes.map((n) => renderCard(n, false))
              }
              // [②U6] 框底缘下拉态（拖过底缘=stretch 框高动画腾新行——.38s 曲线
              // CSS 承载）；候选槽族（faded 多预览）挂源框内。
              // [F-VISFB-22 C6] 框底连续跟随：inline --lg-pull=会话 pullPx
              //（未拉伸底缘起越过量，PULL_BAND_PX 封顶）→ theme-lineage.css
              // stretch 规则 calc(12px+var) 消费（94=12+82 值耦合解除——CSS
              // 变量化落法，INV-100 在档可选项）；缺省回落=旧全量 82px。
              //（--lg-pull=运行时注入动态量——check-quality C-4c DYNAMIC_TOKENS
              // 白名单在册，双向互指）
              const stretching = isSrc && slot !== null && slot.active && slot.extend === true
              const frameCls = ['month-frame', stretching ? 'stretch' : '']
                .filter((c) => c !== '')
                .join(' ')
              const pullStyle = stretching
                ? ({ '--lg-pull': `${slot?.pullPx ?? PULL_BAND_PX}px` } as CSSProperties)
                : undefined
              return (
                <div
                  className={m.month === null ? 'tl-month unknown' : 'tl-month'}
                  key={m.month === null ? 'null' : String(m.month)}
                >
                  {/* [F-LINEAGE-02 裁决 7/D-L2-2] 月标注入框内首位（框外悬浮
                      堵死框间通道——absolute 不占 flex 槽，顶 padding 18 承载；
                      标签整体在框内=overflow:hidden 无裁切面） */}
                  <div
                    className={frameCls}
                    data-frame-key={key}
                    style={pullStyle}
                  >
                    <span className="month-tag">
                      {m.month === null
                        ? `未定月 · ${m.nodes.length} 篇`
                        : `${m.month} 月 · ${m.nodes.length} 篇`}
                    </span>
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
                      const dragTail =
                        isSrc && slot !== null && slot.active ? kids[kids.length - 1] ?? null : null
                      const rows = partitionRows(dragTail !== null ? kids.length - 1 : kids.length, props.frameW)
                      const fosterRow =
                        dragTail !== null && slot !== null
                          ? Math.min(
                              positionOf(m.nodes.findIndex((n) => n.id === slot.nodeId), props.frameW).row,
                              rows.length - 1
                            )
                          : -1
                      return rows.map((row, r) => {
                        const children = row.map((i) => kids[i]!)
                        if (dragTail !== null && r === fosterRow) children.push(dragTail)
                        return (
                          <div className={r % 2 === 1 ? 'tl-row odd' : 'tl-row'} key={r}>
                            {children}
                          </div>
                        )
                      })
                    })()}
                    {isSrc && slot !== null && slot.active && (
                      <DragCandidates
                        insertIdx={slot.insertIdx}
                        active={slot.active}
                        frameW={props.frameW}
                        total={m.nodes.length}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </section>
        )
      })}
    </>
  )
}
