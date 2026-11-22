// b3: 回炉批（2026-11-22 B3 独立审查处置——自 card-drag-session.ts 迁驻：会话域
// 模型单源=相位类型+槽位预览+会话记录形状，零逻辑零 DOM；代码与锚注释同迁，
// 行为零变。迁出缘由=card-drag-session 350 行顶格，回炉修复（R1/R2/W2）需行数
// 余量——迁出申报见设计稿 §4 文件表补行）。
/**
 * drag-session-model —— 拖拽会话域模型单源。
 * 消费方：card-drag-session（本体）/useCardDrag（re-export 链保持——
 * TimelineYears/TimelineMonthFrame 经 useCardDrag 导入零改动）。
 */

export type DragPhase = 'idle' | 'pending' | 'dragging' | 'settle'

/** 槽位预览（TimelineYears 渲染源：active=拖起[占位槽在场+拖卡离流]；active=false=settle 落位[卡回文档流@insertIdx+FLIP 飞行]） */
export interface DragSlotPreview {
  nodeId: string
  srcKey: string
  insertIdx: number
  active: boolean
  /** 指针在源月框内（框外槽淡化 .55——[回炉观测] 旧文 .35 为 mask 方案前值，随本批校正） */
  overFrame: boolean
  /** [②U6] 框底缘下拉态（PULL_BAND_PX 详注=drag-session-geometry）；[B3 §3.4] 类面=提交面 4——跟随量 pullPx 不经 React（帧批直写 --lg-pull） */
  extend?: boolean
}

export interface DragSession {
  nodeId: string
  srcKey: string
  frameEl: HTMLDivElement | null
  srcIds: string[]
  sx: number
  sy: number
  /** [②U7→F-VISFB-31] 抓取偏移=own 域（÷s_eff——激活帧批覆写） */
  ox: number
  oy: number
  /** [B3 迁移 3/4] exceeded latch（事件时点纯算术置位；激活判定在帧批 4b） */
  exceeded: boolean
  /** [B3 迁移 4b] 激活帧批已执行（会话域 phase=dragging 镜像——终局批/泵/段 0 闸分流源） */
  activated: boolean
  /** [B3 §3.2] 待处理指针（事件记录→帧批消费；终局批据此判「未 flush」） */
  pointerDirty: boolean
  /** [②U7→F-VISFB-31] 拖影位置=own 域（flight job 同域传递） */
  ghost: { x: number; y: number }
  /** [B3 §5 Option A] 激活锚基准（grab 帧 own 域卡位——translate=ghost−ghost0；left/top=激活锚恒 gFrame）。pointerdown 时点占位=卡 rect client 域原值（激活帧批覆写为 act.ghost own 域——审查 R1 激活帧 ghost 冻结基准读此占位） */
  ghost0: { x: number; y: number }
  /** [C3 甲案] 包含块原点补偿（own 域——详注=drag-session-geometry ActivationFrameRead.frameOrigin；INV-96 族） */
  frameOrigin: { x: number; y: number }
  insertIdx: number
  /** [②U6] 原始槽位（回弹基准——源框外松手飞行落点） */
  srcIdx: number
  overFrame: boolean
  /** [②U6] 框底缘下拉态（冻结基准下拉带内——见 frameBottom0） */
  extend: boolean
  /** [lnfix2] 冻结基准（grab 帧取值+激活帧批校准读——extend 判定源；实时 rect 被占位槽腾行/stretch padding 推高不可读——详注=FrozenFrameBaseline） */
  frameBottom0: number
  frameLeft0: number
  frameRight0: number
  /** [回炉 R1] 拖前 React inline marginLeft——拖起期压 0 防双计，清场恢复（详注=ActivationFrameRead.marginLeft0） */
  marginLeft0: string
  /** [F-VISFB-66 裁定 4] 光标缓存（自动滚动重算输入；B3 起兼帧批唯一判定输入） */
  lastClient: { x: number; y: number }
}
