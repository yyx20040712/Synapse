// b3: B3 commit A 纯拆件（2026-11-22——自 card-drag-session.ts 迁驻；代码与
// 锚注释同迁，行为零变）
/**
 * drag-session-geometry —— 拖拽会话纯读取+换算域（B3 设计稿 §4：toOwn/
 * framePointer/overSourceFrame/激活帧读取集/冻结基准校准读取——PULL_BAND_PX
 * 随迁；终局落位/帧命中/下拉带/ghost 采样=其消费面换算同驻）。零 React 零
 * 会话状态：DOM 读取集中在 read、sample 系函数内，写入与 React 提交面留守
 * card-drag-session（调用点=原语句位——读序逐句保形）。帧批重排（读全部
 * 先于写）属 commit B。
 * [F-VISFB-31] 会话坐标族整体 own 域（00A 三域律 client=origin+C×s_eff）：
 * 抓取偏移/拖影/包含块补偿/framePointer/pullPx/下拉带全部 ÷s_eff 或 ×s_eff
 * 换算（旧 ÷z B 域×offsetLeft/px 常量 C 域混算=u≠1 档错位——接缝①+同族
 * 自查面：下拉带/跟随量）。
 */
import { insertIndexFromGrid } from './card-drag-grid'
import { readFrameContentWidth } from './use-capacity-layout'
import { clientToOwnPt, effectiveScale } from './timeline-zoom'

/** [②U6] 源框底缘下拉带高（px——mockup §3.5）：overSourceFrame 实时判定与
 *  [lnfix2] 冻结基准判定两处共用单源。
 *  [F-VISFB-22 C6] 双角色：①触发带语义沿承（INV-98 实时域——overSourceFrame
 *  带上限不动）；②连续跟随封顶（pullPx 钳制上限+CSS 增量单源——消费写入
 *  --lg-pull，theme-lineage-drag.css 只知基准+变量（基准 38px=FRAME_PAD_BOTTOM
 *  同步——F-LANEGRID-01 B4；INV-100 的 94=12+82 值耦合由此解除） */
export const PULL_BAND_PX = 82

/** [②U6] 源框物理域命中=框内 ∪ 底缘 82px 下拉带（x 带内——腾新行面）。
 *  实时 rect 单源供两处：onMove 槽相位（淡化/插位）与 onUp 落位判定
 *  （松手时框已撑高，指针在撑高框内=落位组末，语义自洽）；extend 判定
 *  本身改读冻结基准（samplePullBand——见 card-drag-session frameBottom0 注）。
 *  [F-VISFB-31] 带高换算：PULL_BAND_PX=own px 常量，client 判定域须 ×s_eff
 *  （旧直加 client 坐标=带在 u≠1 档缩窄 1/u 倍——B/C 混算同族自查面） */
export const overSourceFrame = (frameEl: HTMLDivElement | null, x: number, y: number): boolean => {
  if (frameEl === null) return false
  const fr = frameEl.getBoundingClientRect()
  if (x >= fr.left && x <= fr.right && y >= fr.top && y <= fr.bottom) return true
  return x >= fr.left && x <= fr.right && y > fr.bottom && y <= fr.bottom + PULL_BAND_PX * effectiveScale()
}

/** [②U7→F-VISFB-31] 视口点→own 域（÷s_eff；base=内容层 rect——判定时点取值；
 *  会话坐标族全部 own 域——与 offsetLeft/px 常量/CSS 写入同域，混算接缝①修复） */
export const toOwn = (content: HTMLElement, clientX: number, clientY: number): { x: number; y: number } =>
  clientToOwnPt(content.getBoundingClientRect(), clientX, clientY)

/**
 * [F-SLOTGRID-01 U3] 指针→月框 padding-box 坐标（INV-111 命中系——预裁决 D2）：
 * frame gBCR 相对差÷s_eff（[F-VISFB-31] own 域——capacity 常量族/CARD_W 同系）
 * 后减 computed border 布局宽（border 内缘起算=padding-box 原点；computed
 * border=own px 与÷s_eff 结果同域直减）。
 * 框原点拖拽全程不动（框只向下生长）——逐 move 实读无缓存需求；jsdom
 * computed border 缺省空串→parseFloat NaN→0（零边框约定与单测桩同系）。
 */
export const framePointer = (frameEl: HTMLDivElement, clientX: number, clientY: number): { x: number; y: number } => {
  const fr = frameEl.getBoundingClientRect()
  const sEff = effectiveScale()
  const cs = getComputedStyle(frameEl)
  const bl = Number.parseFloat(cs.borderLeftWidth) || 0
  const bt = Number.parseFloat(cs.borderTopWidth) || 0
  return { x: (clientX - fr.left) / sEff - bl, y: (clientY - fr.top) / sEff - bt }
}

/** [②U6/lnfix2] 冻结基准三元组（client 域实时 rect 读数）——extend 判定源：
 *  实时 rect 会被占位槽腾行（+92）与 stretch padding（+94）推高（k1 断点
 *  A/B——下拉带几何不可达+挂置即振荡），读实时则 stretch 永不稳态；grab 时
 *  布局=拖前稳态（占位槽 128×72 与卡同构换位，高卡离流缩框的边界形由 rAF
 *  校准兜住）。 */
export interface FrozenFrameBaseline {
  bottom: number
  left: number
  right: number
}

/** [lnfix2] 冻结基准校准读取（单次 frame gBCR 读→三元组）——grab 帧取值
 *  （card-drag-session handleCardPointerDown）与激活后 rAF 校准（帧循环
 *  顶部）两处共用单源 */
export function readFrozenFrameBaseline(frameEl: HTMLDivElement): FrozenFrameBaseline {
  const fr = frameEl.getBoundingClientRect()
  return { bottom: fr.bottom, left: fr.left, right: fr.right }
}

/** 激活帧读取集（B3 设计稿 §4——card rect/offsetLeft/offsetTop/内容层 rect/
 *  marginLeft0 一次读齐；换算=抓取偏移/ghost/frameOrigin own 域同系）。
 *  [回炉 R1] marginLeft0=拖前 React inline marginLeft（瀑布错位）——拖起期
 *  压 0 防双计，清场恢复（React style diff 不重写未变值——须自恢复非赖
 *  重渲染）；写路径键序留守 card-drag-session（INV-140 四键+left/top）。 */
export interface ActivationFrameRead {
  /** [②U7→F-VISFB-31] 抓取偏移=own 域（÷s_eff；锚=pointerdown 坐标——激活
   *  帧 e=首个 move 事件非按点位）；拖影位置 own 域（flight job 同域传递） */
  ox: number
  oy: number
  ghost: { x: number; y: number }
  /** [C3 甲案] 卡流内位（offsetLeft/Top——相对 frame padding box，inline
   *  left:0 同基准）：激活帧卡 inline=gFrame → 渲染位=原位零跳 */
  gFrame: { x: number; y: number }
  /** [C3 甲案] 包含块原点补偿：卡 offsetParent=.month-frame（frame padding
   *  box 原点）的 own 域坐标——inline left/top 写入=ghost−frameOrigin（激活
   *  帧由「own 域 ghost − 流内 offsetLeft/Top」两已知量导出，不读 frame
   *  过渡期 rect——根除 frame 原点双计，INV-96 族；旧实现 ghost=÷z（B 域）×
   *  offsetLeft（C 域）混算=u≠1 档抓取错位（00A 接缝①），两侧统一 own 域修复） */
  frameOrigin: { x: number; y: number }
  marginLeft0: string
  /** 卡 rect width 原始读数（inline width=÷s_eff own px——换算随写序留守
   *  card-drag-session，effectiveScale 调用点不变） */
  rawWidth: number
}

/** 激活帧读取集（读序=card rect→偏移换算→内容层 rect→offsetLeft/Top→
 *  marginLeft——与迁移前 onMove 激活分支逐句同序） */
export function readActivationFrame(
  card: HTMLElement,
  content: HTMLElement,
  sx: number,
  sy: number
): ActivationFrameRead {
  const r = card.getBoundingClientRect()
  const ox = (sx - r.left) / effectiveScale()
  const oy = (sy - r.top) / effectiveScale()
  const ghost = toOwn(content, r.left, r.top)
  const gFrame = { x: card.offsetLeft, y: card.offsetTop }
  const frameOrigin = { x: ghost.x - gFrame.x, y: ghost.y - gFrame.y }
  const marginLeft0 = card.style.marginLeft
  return { ox, oy, ghost, gFrame, frameOrigin, marginLeft0, rawWidth: r.width }
}

/** [②U7→F-VISFB-31/C3 甲案] 指针→own 域 ghost（own 域抓取偏移——s_eff 判定
 *  时点取值缩放正交；content 缺席=client 域兜底原式沿承）。onMove/onScrollFrame
 *  两处共用单源。 */
export function ghostOwnAt(
  content: HTMLElement | null,
  clientX: number,
  clientY: number,
  ox: number,
  oy: number
): { x: number; y: number } {
  const p = content !== null ? toOwn(content, clientX, clientY) : { x: clientX, y: clientY }
  return { x: p.x - ox, y: p.y - oy }
}

/** [lnfix2/F-VISFB-22 C6] 下拉带采样（纯换算——零 DOM 读）：extend=越缘即真
 *  （去旧 +82 上限——超上限再拖 stretch 保持+框底单调，视检 C6「框底跟随一
 *  小段」）；pullPx=x 带内指针越未拉伸底缘（frameBottom0）量、PULL_BAND_PX
 *  封顶（框底逐 move 跟随一小段后恒驻 82）。[F-VISFB-31] 越缘量÷s_eff=own px
 *  （--lg-pull 消费域=内容 own 域 CSS——旧 client 量直写=u≠1 档视觉跟随量
 *  失真 u 倍+封顶提前）；over（槽淡化/插位）沿实时单源不在此判定。 */
export function samplePullBand(
  clientX: number,
  clientY: number,
  baseline: FrozenFrameBaseline
): { inPullBand: boolean; pullPx: number } {
  const inPullBand =
    clientX >= baseline.left && clientX <= baseline.right && clientY > baseline.bottom
  const pullPx = inPullBand
    ? Math.min((clientY - baseline.bottom) / effectiveScale(), PULL_BAND_PX)
    : 0
  return { inPullBand, pullPx }
}

/**
 * 帧命中采样（over 实时域+插位换算——onMove/onScrollFrame 共用单源；读序=
 * overSourceFrame frame gBCR→（over∨extend 门内）framePointer frame gBCR+
 * computed border→readFrameContentWidth computed 五值——与迁移前逐句同序）：
 * - [F-VISFB-22 C6] extend 分派门=over||extend：越缘跨入 move 单帧内实时
 *   rect 尚未撑高（over 陈旧）不该压回插位——组末语义随触发即立（冻结基准
 *   权威）；overSourceFrame 本体（INV-98 回弹/落位/淡化域）零改，overFrame
 *   仍沿实时（次帧自校正）
 * - [F-SLOTGRID-01 U3] 落点=含源网格算术（INV-111 消费面——设计 §5.5/预裁决
 *   D1/D3）：rowCounts 含源卡（srcIds 全长），判定面不随占位槽腾位漂移（推挤
 *   滞回结构性消除——旧 rect 逐帧实测法随本批退役）；W=frame 内容盒宽归一化
 *   实时读（[轮 3 B1] readFrameContentWidth 单源——use-capacity-layout 同式，
 *   读取失败〔NaN/unmeasured〕经 capacities 状态机降级单行语义）
 */
export function sampleFrameHit(
  s: { frameEl: HTMLDivElement | null; insertIdx: number; srcIds: string[]; srcIdx: number },
  clientX: number,
  clientY: number,
  /** 冻结基准下拉态（samplePullBand 结论或会话驻留值——onScrollFrame 传 sc.extend） */
  extend: boolean
): { over: boolean; nextIdx: number } {
  const over = overSourceFrame(s.frameEl, clientX, clientY)
  let nextIdx = s.insertIdx
  if ((over || extend) && s.frameEl !== null) {
    if (extend) nextIdx = s.srcIds.length - 1 // 新行空位=组末
    else {
      const fp = framePointer(s.frameEl, clientX, clientY)
      const w = readFrameContentWidth(s.frameEl)
      nextIdx = insertIndexFromGrid(fp.x, fp.y, w, s.srcIds.length, s.srcIdx)
    }
  }
  return { over, nextIdx }
}

/**
 * 终局落位换算（onUp/pointercancel 共用判定面——§2 迁移 9/10/11 的
 * settleIdx=insertIdx/finalIds/changed 计算）：
 * [F-LGRAPH-01②U6/退役行 7] 限本月=物理域：源月框外松手=回弹原位（飞行落点=
 * 原始槽位 idx）——不写不弹 toast（INV-83 跨月拒绝子句退役，代码面零残留）；
 * 框内∪下拉带松手沿承候选槽落位（overSourceFrame 单源——INV-98 实时域）。
 */
export function planSettle(
  s: { frameEl: HTMLDivElement | null; nodeId: string; insertIdx: number; srcIdx: number; srcIds: string[] },
  clientX: number,
  clientY: number
): { settleIdx: number; finalIds: string[]; changed: boolean } {
  const inSrcFrame = overSourceFrame(s.frameEl, clientX, clientY)
  const settleIdx = inSrcFrame ? s.insertIdx : s.srcIdx
  const others = s.srcIds.filter((id) => id !== s.nodeId)
  const finalIds = [...others.slice(0, settleIdx), s.nodeId, ...others.slice(settleIdx)]
  const changed = finalIds.join(' ') !== s.srcIds.join(' ')
  return { settleIdx, finalIds, changed }
}
